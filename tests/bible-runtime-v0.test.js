const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const files = [
  "engine/mission-types.js",
  "engine/mission-tree.js",
  "engine/mission-memory.js",
  "engine/mission-planner.js",
  "engine/action-bridge.js",
  "engine/mission-manager.js",
  "engine/mission-catalog.js",
  "engine/bible-contract-v0-1.js",
  "data/bible-patterns.js",
  "data/bible-catalog.js",
  "engine/object-event-registry.js",
  "engine/bible-runtime-v0-1-unified.js"
];

function runtimeFixture() {
  const listeners = new Map();
  const storage = new Map();
  class CustomEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
  }
  const window = {
    CustomEvent,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    dispatchEvent(event) {
      for (const listener of [...(listeners.get(event.type) || [])]) listener(event);
      return true;
    },
    setTimeout,
    clearTimeout
  };
  const context = vm.createContext({ window, console, CustomEvent, performance, setTimeout, clearTimeout });
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context, { filename: file });
  }
  return window;
}

function attachManager(window) {
  const BF = window.BlueFox3D;
  const engine = {
    callbacks: { onAction() {}, onStatus() {} },
    currentMapId: "crystal",
    character: { root: { position: { distanceTo: () => 0 } }, target: {} },
    pendingInteraction: null,
    currentRoutine: null,
    pendingGate: null,
    pendingZoneExploration: null,
    transitioning: false
  };
  const manager = BF.Missions.MissionManager.create({ engine });
  engine.missionManager = manager;
  BF.currentEngine = engine;
  BF.getMissionState = () => manager.getState();
  BF.startMission = (id, options) => manager.startMission(id, options);
  return { BF, engine, manager };
}

test("le runtime unifié filtre type et kind sans faux positif", () => {
  const window = runtimeFixture();
  const runtime = window.BlueFox3D.bibleRuntime;
  const camp = runtime.byId.get("BIBLE-V01-CAMP");
  assert.equal(runtime.eventMatchesTrigger(camp.trigger, { type: "interaction.analyze", kind: "wood" }), false);
  assert.equal(runtime.eventMatchesTrigger(camp.trigger, { type: "interaction.collect", kind: "fiber" }), false);
  assert.equal(runtime.eventMatchesTrigger(camp.trigger, { type: "interaction.collect", kind: "wood" }), true);
});

test("les trois fiches cumulatives se compilent dans le runtime unifié", () => {
  const window = runtimeFixture();
  const BF = window.BlueFox3D;
  assert.equal(BF.getBibleRuntimeDiagnostics().catalogCount, 3);
  assert.equal(BF.getBibleRuntimeDiagnostics().registeredDefinitions, 3);
  assert.equal(BF.getBibleRuntimeDiagnostics().strictContract, true);
  assert.ok(BF.Missions.getDefinition("BIBLE-V01-DISCOVERY"));
});

test("collecte -> activation -> progression -> état public -> narration", () => {
  const window = runtimeFixture();
  const { BF, manager } = attachManager(window);
  const journal = [];
  BF.addJournalEntry = (entry) => { journal.push(entry); return true; };

  BF.ObjectEvents.emit(BF.ObjectEvents.types.RESOURCE_COLLECTED, {
    userData: { functional: { resource: { inventoryKey: "wood", family: "wood" } } }
  }, { inventoryKey: "wood", kind: "wood", quantity: 1 });

  assert.ok(manager.trees.has("BIBLE-V01-CAMP"));
  assert.equal(BF.getMissionState().missions[0].title, "Établir un camp");
  assert.equal(manager.notifyActionCompleted("collect", { kind: "wood", amount: 10 }), true);
  assert.equal(manager.memory.state.missionLifecycle["BIBLE-V01-CAMP"].status, "completed");
  assert.ok(journal.some((entry) => entry.text.includes("sécuriser un point de chute")));
  assert.ok(journal.some((entry) => entry.text.includes("matériel est prêt")));
});
