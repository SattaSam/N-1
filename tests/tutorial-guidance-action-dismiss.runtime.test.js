const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");

class Emitter {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener, options) {
    const bucket = this.listeners.get(type) || [];
    bucket.push({ listener, once: Boolean(options?.once) });
    this.listeners.set(type, bucket);
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((entry) => entry.listener !== listener));
  }
  dispatchEvent(event) {
    event.target ||= this;
    for (const entry of [...(this.listeners.get(event.type) || [])]) {
      entry.listener(event);
      if (entry.once) this.removeEventListener(event.type, entry.listener);
    }
    return true;
  }
}

class ClassList {
  constructor() { this.values = new Set(); }
  add(...values) { values.forEach((value) => this.values.add(value)); }
  remove(...values) { values.forEach((value) => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
}

class ElementStub extends Emitter {
  constructor(tag = "div") {
    super();
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.classList = new ClassList();
    this.style = {};
    this.attributes = {};
    this.hidden = false;
    this.isConnected = true;
    this.textContent = "";
    this._className = "";
  }
  set className(value) {
    this._className = value;
    String(value).split(/\s+/).filter(Boolean).forEach((entry) => this.classList.add(entry));
  }
  get className() { return this._className; }
  append(...children) { children.filter(Boolean).forEach((child) => { this.children.push(child); child.parentNode = this; }); }
  appendChild(child) { this.append(child); return child; }
  remove() {
    this.isConnected = false;
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
  }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  removeAttribute(key) { delete this.attributes[key]; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  cloneNode() { return new ElementStub(this.tagName); }
}

function createHarness() {
  const body = new ElementStub("body");
  const html = new ElementStub("html");
  const camera = new ElementStub("button");
  const planet = new ElementStub("button");
  camera.className = "bluefox-camera-button";

  const document = new Emitter();
  document.body = body;
  document.documentElement = html;
  document.createElement = (tag) => new ElementStub(tag);
  document.querySelector = (selector) => {
    if (selector === ".bluefox-camera-button") return camera;
    if (selector.includes('aria-label="Planète"')) return planet;
    if (selector === ".bluefox-tutorial-message") {
      return body.children.find((entry) => entry.classList.contains("bluefox-tutorial-message") && entry.isConnected) || null;
    }
    return null;
  };
  document.querySelectorAll = () => [];

  let now = 1000;
  let timerId = 0;
  const timeouts = new Map();
  const windowStub = new Emitter();
  windowStub.window = windowStub;
  windowStub.document = document;
  windowStub.Element = ElementStub;
  windowStub.CustomEvent = class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
  windowStub.MutationObserver = class { observe() {} };
  windowStub.Date = { now: () => now };
  windowStub.setTimeout = (callback, delay) => { const id = ++timerId; timeouts.set(id, { callback, delay }); return id; };
  windowStub.clearTimeout = (id) => timeouts.delete(id);
  windowStub.setInterval = () => 1;
  windowStub.clearInterval = () => {};
  windowStub.console = console;
  windowStub.BlueFox3D = { startupPresentationActive: false, startupGuidanceReleaseAt: 0 };

  const context = vm.createContext(windowStub);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, "data/bible-catalog.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, "engine/mission-ui-bridge.js"), "utf8"), context);

  return {
    windowStub,
    document,
    camera,
    planet,
    timeouts,
    setNow(value) { now = value; },
    missionState(id) {
      return {
        activeMissionIds: [id],
        missions: [{ missionId: id, lifecycleStatus: "active", progress: 0, priorityRank: 1, title: id }],
        catalog: [],
        currentAction: null
      };
    }
  };
}

// Data contract: T03 is persistent until real camera dblclick; all T07 contextual
// guidance cards are persistent until a completed map transition.
{
  const h = createHarness();
  const t03 = h.windowStub.BlueFox3D.BibleCatalog.find((mission) => mission.id === "T03");
  const cameraHelp = t03.uiGuidance.find((guidance) => guidance.id === "camera-help");
  assert.equal(cameraHelp.duration, 0);
  assert.equal(cameraHelp.dismissOnTargetEvent, "dblclick");

  const t07 = h.windowStub.BlueFox3D.BibleCatalog.find((mission) => mission.id === "T07");
  const ids = ["choose-direction-help", "direction-cards-help", "unknown-send-help"];
  for (const id of ids) {
    const guidance = t07.uiGuidance.find((entry) => entry.id === id);
    assert.ok(guidance, `missing T07 guidance ${id}`);
    assert.equal(guidance.duration, 0, `${id} must not auto-timeout`);
    assert.equal(guidance.dismissOnEvent, "bluefox:map-transition-completed");
  }
}

// T03: no timeout; simple click must not dismiss; real dblclick must dismiss.
{
  const h = createHarness();
  h.windowStub.dispatchEvent({ type: "bluefox:mission-state", detail: h.missionState("T03") });
  h.setNow(92000);
  h.windowStub.dispatchEvent({ type: "bluefox:mission-state", detail: h.missionState("T03") });
  assert.ok(h.document.querySelector(".bluefox-tutorial-message"), "T03 camera guidance must be visible");
  assert.equal([...h.timeouts.values()].some((timer) => timer.delay === 14000), false, "T03 guidance must not auto-timeout");
  h.camera.dispatchEvent({ type: "click" });
  assert.ok(h.document.querySelector(".bluefox-tutorial-message"), "simple camera click must not dismiss T03 guidance");
  h.camera.dispatchEvent({ type: "dblclick" });
  assert.equal(h.document.querySelector(".bluefox-tutorial-message"), null, "camera dblclick must dismiss T03 guidance");
}

// Manual close must also dismiss and unregister the action listener.
{
  const h = createHarness();
  h.windowStub.dispatchEvent({ type: "bluefox:mission-state", detail: h.missionState("T03") });
  h.setNow(92000);
  h.windowStub.dispatchEvent({ type: "bluefox:mission-state", detail: h.missionState("T03") });
  const panel = h.document.querySelector(".bluefox-tutorial-message");
  assert.ok(panel);
  const closeButton = panel.children[1];
  closeButton.dispatchEvent({ type: "click" });
  assert.equal(h.document.querySelector(".bluefox-tutorial-message"), null, "manual × must dismiss T03 guidance");
  assert.equal((h.camera.listeners.get("dblclick") || []).length, 0, "manual × must remove dblclick listener");
}

// T07: opening Planet is not completion; actual map transition is.
{
  const h = createHarness();
  h.windowStub.dispatchEvent({ type: "bluefox:mission-state", detail: h.missionState("T07") });
  h.setNow(6000);
  h.windowStub.dispatchEvent({ type: "bluefox:mission-state", detail: h.missionState("T07") });
  assert.ok(h.document.querySelector(".bluefox-tutorial-message"), "T07 direction guidance must be visible");
  assert.equal([...h.timeouts.values()].some((timer) => timer.delay === 14000), false, "T07 guidance must not auto-timeout");
  h.planet.dispatchEvent({ type: "click" });
  assert.ok(h.document.querySelector(".bluefox-tutorial-message"), "opening Planet must not dismiss T07 guidance");
  h.windowStub.dispatchEvent({ type: "bluefox:map-transition-completed", detail: { fromMapId: "crystal", toMapId: "unknown" } });
  assert.equal(h.document.querySelector(".bluefox-tutorial-message"), null, "completed map transition must dismiss T07 guidance");
}

console.log("PASS tutorial guidance action dismiss");
