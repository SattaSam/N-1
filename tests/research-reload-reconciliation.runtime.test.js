const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const timers = [];
const listeners = new Map();
const dispatched = [];

class CustomEventStub {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

const windowStub = {
  BlueFox3D: {},
  CustomEvent: CustomEventStub,
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  },
  addEventListener(type, listener) {
    const bucket = listeners.get(type) || [];
    bucket.push(listener);
    listeners.set(type, bucket);
  },
  removeEventListener(type, listener) {
    listeners.set(type, (listeners.get(type) || []).filter((entry) => entry !== listener));
  },
  dispatchEvent(event) {
    dispatched.push(event);
    for (const listener of [...(listeners.get(event.type) || [])]) listener(event);
    return true;
  },
  setTimeout(callback, delay = 0) {
    timers.push({ callback, delay });
    return timers.length;
  },
  clearTimeout() {},
  setInterval() { return 1; },
  clearInterval() {},
  queueMicrotask(callback) { callback(); },
  performance: { now: () => 0 },
  console
};
windowStub.window = windowStub;
windowStub.globalThis = windowStub;
const context = vm.createContext(windowStub);

vm.runInContext(
  fs.readFileSync(path.join(repoRoot, "data/bible-catalog.js"), "utf8"),
  context,
  { filename: "data/bible-catalog.js" }
);

windowStub.BlueFox3D.BibleContractV01 = {
  validateCatalog() { return { ok: true, errors: [], warnings: [] }; }
};
windowStub.BlueFox3D.BiblePatterns = new Proxy({}, { get() { return {}; } });
windowStub.BlueFox3D.registerMissionDefinitions = () => 1;

// Important: BibleRuntime starts immediately at script load while no WorldEngine /
// MissionManager is available yet. This reproduces the real boot ordering.
windowStub.BlueFox3D.currentEngine = null;
vm.runInContext(
  fs.readFileSync(path.join(repoRoot, "engine/bible-runtime-v0-1-unified.js"), "utf8"),
  context,
  { filename: "engine/bible-runtime-v0-1-unified.js" }
);

const BF = windowStub.BlueFox3D;
const memory = {
  state: {
    missionLifecycle: {
      T03: { status: "completed" },
      T11: { status: "completed" }
    },
    researchUnlocks: {}
  },
  saveCalls: 0,
  save() { this.saveCalls += 1; },
  getFact() { return null; },
  setFact() {},
  recordEffectReceipt() {}
};

// WorldEngine/MissionManager become available only after BibleRuntime has started.
BF.currentEngine = {
  currentMapId: "crystal",
  missionManager: { memory }
};

// Strong guard: historical reward reconciliation must never enter completion
// effects/narrative/psychology paths.
BF.completeMissionPsychology = () => { throw new Error("psychology replay forbidden"); };
BF.bibleRuntime.applyEffects = () => { throw new Error("mission effects replay forbidden"); };
BF.bibleRuntime.emitCompletedOnce = () => { throw new Error("completion narrative replay forbidden"); };

// Execute the bounded boot timers registered by the runtime. BASE only has site
// restoration timers; CANDIDATE also has research-reconciliation timers.
for (const { callback } of timers.splice(0)) callback();

const visible = Array.from(BF.Research.list({ unlockedOnly: true }))
  .map((entry) => entry.id)
  .filter((id) => ["camp-establish-v1", "ration-basic-v2"].includes(id))
  .sort();

assert.deepEqual(
  visible,
  ["camp-establish-v1", "ration-basic-v2"].sort(),
  "reload must restore missing research rewards for already-completed T03/T11"
);
assert.ok(memory.state.researchUnlocks["camp-establish-v1"]);
assert.ok(memory.state.researchUnlocks["ration-basic-v2"]);

// Reconciliation must not masquerade as a new mission completion.
const completionReplays = dispatched.filter((event) =>
  event.type === "bluefox:mission-completed" ||
  event.type === "bluefox:mission-state" ||
  event.type === "progression.mission_completed"
);
assert.equal(completionReplays.length, 0, "reload reconciliation must not replay mission completion events");

// Existing unlocks must be idempotent across the remaining bounded timers.
const saveCalls = memory.saveCalls;
const researchEventsBefore = dispatched.filter((event) => event.type === "bluefox:research-unlocked").length;
for (const { callback } of timers.splice(0)) callback();
assert.equal(memory.saveCalls, saveCalls, "already-restored unlocks must not save again");
assert.equal(
  dispatched.filter((event) => event.type === "bluefox:research-unlocked").length,
  researchEventsBefore,
  "already-restored unlocks must not emit duplicate research-unlocked events"
);

console.log("PASS research reload reconciliation");
