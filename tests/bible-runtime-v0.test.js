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
  const schedule = () => 0;
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
    setTimeout: schedule,
    clearTimeout() {}
  };
  const context = vm.createContext({ window, console, CustomEvent, performance, setTimeout: schedule, clearTimeout() {} });
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
  const fiber = runtime.byId.get("COL-FIBER-20");
  assert.ok(fiber);
  assert.equal(runtime.eventMatchesTrigger(fiber.trigger, { type: "interaction.analyze", kind: "fiber" }), false);
  assert.equal(runtime.eventMatchesTrigger(fiber.trigger, { type: "interaction.collect", kind: "wood" }), false);
  assert.equal(runtime.eventMatchesTrigger(fiber.trigger, { type: "interaction.collect", kind: "fiber" }), true);
});

test("les fiches cumulatives se compilent dans le runtime unifié", () => {
  const window = runtimeFixture();
  const BF = window.BlueFox3D;
  const diagnostics = BF.getBibleRuntimeDiagnostics();

  assert.equal(diagnostics.catalogCount, BF.BibleCatalog.length);
  assert.equal(diagnostics.registeredDefinitions, BF.BibleCatalog.length);
  assert.equal(diagnostics.strictContract, true);
  assert.ok(BF.Missions.getDefinition("GEO-01"));
  assert.ok(BF.Missions.getDefinition("GEO-02"));
  assert.ok(BF.Missions.getDefinition("GEO-03"));
  assert.ok(BF.Missions.getDefinition("GEO-04"));
  assert.ok(BF.Missions.getDefinition("GEO-05"));
  assert.ok(BF.Missions.getDefinition("GEO-06"));
  assert.ok(BF.Missions.getDefinition("GEO-07"));
  assert.ok(BF.Missions.getDefinition("SUR-03"));
  assert.ok(BF.Missions.getDefinition("COL-PLANT-20"));
  assert.ok(BF.Missions.getDefinition("COL-FIBER-20"));
});

test("collecte -> activation -> progression -> état public -> narration", () => {
  const window = runtimeFixture();
  const { BF, manager } = attachManager(window);
  const journal = [];
  BF.addJournalEntry = (entry) => { journal.push(entry); return true; };

  BF.bibleRuntime.activateInitialMissions();
  assert.ok(manager.trees.has("T01"));
  assert.equal(BF.getMissionState().missions.find((entry) => entry.missionId === "T01").title, "Reconnaître le Site du crash");
  assert.equal(manager.notifyActionCompleted("observe", { objectId: "LANDMARK-CRASH-CAPSULE-001", amount: 1 }), true);
  assert.equal(manager.memory.state.missionLifecycle.T01.status, "completed");
  BF.bibleRuntime.onMissionState(manager.getState());
  assert.ok(BF.bibleRuntime.state.progressNarrative["T01:revealed"]);
  assert.ok(BF.bibleRuntime.state.progressNarrative["T01:progress:0"]);
  assert.ok(BF.bibleRuntime.state.progressNarrative["T01:completed"]);
});
