const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");

function fixture() {
  const listeners = new Map();
  const storage = new Map();
  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  const schedule = () => 0;
  const window = {
    CustomEvent,
    console,
    setTimeout: schedule,
    clearTimeout() {},
    BlueFox3D: {},
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event) {
      for (const listener of [...(listeners.get(event.type) || [])]) {
        listener(event);
      }
      return true;
    }
  };
  const context = vm.createContext({
    window,
    console,
    CustomEvent,
    performance,
    setTimeout: schedule,
    clearTimeout() {}
  });
  const load = (file) => vm.runInContext(
    fs.readFileSync(path.join(ROOT, file), "utf8"),
    context,
    { filename: file }
  );

  [
    "engine/object-library.js",
    "engine/mission-types.js",
    "engine/mission-tree.js",
    "engine/mission-memory.js",
    "engine/mission-planner.js",
    "engine/action-bridge.js",
    "engine/mission-manager.js",
    "engine/mission-empty-core.js",
    "engine/mission-catalog.js",
    "engine/object-event-registry.js",
    "engine/bible-contract-v0-1.js",
    "data/bible-patterns.js",
    "data/bible-catalog.js",
    "engine/bible-runtime-v0-1-unified.js",
    "engine/explore-scope-bridge.js"
  ].forEach(load);
  window.BlueFox3D.mount = async (options) => options.engine;
  load("engine/object-m0-bridge.js");

  const BF = window.BlueFox3D;
  const maps = {};
  const position = { x: 0, y: 0, z: 0, distanceTo: () => 0 };
  const engine = {
    callbacks: { onAction() {}, onStatus() {}, onCollect() {} },
    currentMapId: "target",
    currentZoneIndex: 0,
    character: { root: { position }, target: position },
    currentMap: { interactables: [] },
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
  BF.getExplorationSummary = () => ({ maps });
  BF.getMapExplorationState = (mapId) => maps[mapId] || null;
  return { window, BF, engine, manager, maps };
}

function activateT10(BF, manager) {
  assert.equal(manager.startMission("T10", {
    primary: false,
    autoPrimaryEligible: false
  }), true);
  const tree = manager.trees.get("T10");
  manager.memory.setFact("tutorialExcursion:T09", {
    generatedTargetMapId: "target"
  });
  manager.memory.save?.();
  return tree;
}

function object(BF, type, instanceId) {
  const source = {
    userData: {
      active: true,
      functional: BF.ObjectLibrary.get(type),
      instanceId
    }
  };
  source.userData.worldAnchor = source;
  return source;
}

test("T10 et les patrons LOC respectent le contrat moteur courant", () => {
  const { BF, manager } = fixture();
  const report = BF.bibleRuntime.validate();
  assert.equal(report.ok, true, report.errors.join("\n"));
  assert.equal(BF.BibleContractV01.limits.maxProgressNarratives, 4);
  assert.equal(BF.BibleCatalog.find((mission) => mission.id === "T10").priority, 400);
  assert.equal(BF.BibleCatalog.find((mission) => mission.id === "T10").primaryOnActivation, true);
  assert.equal(BF.Missions.getDefinition("LOC-05@map-a").scopeId, "map-a");
  assert.equal(BF.Missions.getDefinition("LOC-05@map-a").title, "Cartographier 60 % du territoire actuel");
  assert.equal(BF.Missions.getDefinition("LOC-06@map-a").title, "Cartographier 100 % du territoire actuel");
  assert.equal(BF.bibleRuntime.localExplorationMission("LOC-05@map-a").title, "Cartographier 60 % du territoire actuel");
  assert.equal(BF.bibleRuntime.localExplorationMission("LOC-06@map-a").title, "Cartographier 100 % du territoire actuel");

  const persistedLoc = manager.planner.createTree("LOC-05@map-a");
  persistedLoc.title = "Cartographier réellement le territoire actuel — map-a";
  manager.memory.saveTree(persistedLoc);
  assert.equal(
    manager.planner.restoreOrCreate("LOC-05@map-a").title,
    "Cartographier 60 % du territoire actuel"
  );

  BF.bibleRuntime.activateInitialMissions();
  assert.equal(manager.memory.state.missionLifecycle.T10.status, "hidden");
  manager.ensureLifecycle("T09").status = "completed";
  manager.reevaluatePendingActivations();
  assert.equal(manager.memory.state.missionLifecycle.T10.status, "active");
  assert.equal(manager.primaryMissionId, "T10");
  assert.equal(
    manager.memory.state.missionLifecycle.T10.autoPrimaryEligible,
    true
  );
});

test("T10 crédite le pourcentage réel uniquement sur la map atteinte pendant T09", () => {
  const { BF, manager } = fixture();
  const tree = activateT10(BF, manager);
  const node = tree.find("T10:surface");

  BF.progressExploreScopeMissions({ mapId: "other", surfacePercent: 80 });
  assert.equal(node.progress, 0);
  BF.progressExploreScopeMissions({ mapId: "target", surfacePercent: 14.99 });
  assert.equal(node.progress, 14.99);
  assert.equal(node.isComplete, false);
  const visualAt1499 = manager.getState().missions
    .find((mission) => mission.missionId === "T10")
    .tree.root.children
    .find((candidate) => candidate.id === "T10:surface");
  assert.equal(visualAt1499.progress, 14);
  BF.progressExploreScopeMissions({ mapId: "target", surfacePercent: 15.01 });
  assert.equal(node.progress, 15);
  assert.equal(node.isComplete, true);
  const visualAt1501 = manager.getState().missions
    .find((mission) => mission.missionId === "T10")
    .tree.root.children
    .find((candidate) => candidate.id === "T10:surface");
  assert.equal(visualAt1501.progress, 15);
});

test("T10 accepte Fiber et Bush, exclut le bois tombé et distingue les familles", () => {
  const { BF, manager, maps } = fixture();
  const tree = activateT10(BF, manager);
  const node = tree.find("T10:resourceFamilies");
  const observed = BF.ObjectEvents.types.PHENOMENON_OBSERVED;
  const emit = (type, instanceId, mapId = "target") =>
    BF.ObjectEvents.emit(observed, object(BF, type, instanceId), { mapId });

  maps.target = { mapId: "target", surfacePercent: 15 };
  BF.progressExploreScopeMissions({ mapId: "target", surfacePercent: 15 });

  emit("fiber", "fiber-wrong-map", "other");
  emit("tree_fallen", "fallen-a");
  assert.equal(node.progress, 0);
  emit("fiber", "fiber-a");
  emit("fiber", "fiber-b");
  assert.equal(node.progress, 1);
  emit("bush", "bush-a");
  assert.equal(node.progress, 2);
  emit("crystal", "crystal-a");
  assert.equal(node.progress, 3);
  assert.equal(node.isComplete, true);
  assert.equal(manager.memory.state.missionLifecycle.T10.status, "completed");
  assert.equal(manager.memory.state.missionLifecycle["LOC-05@target"].status, "active");
});

test("le déblocage LOC rejoue les seuils par map et n’affiche que la map active", () => {
  const { BF, engine, manager, maps } = fixture();
  Object.assign(maps, {
    target: { mapId: "target", surfacePercent: 15 },
    old60: { mapId: "old60", surfacePercent: 75 },
    old100: { mapId: "old100", surfacePercent: 100 },
    low: { mapId: "low", surfacePercent: 14 }
  });
  manager.ensureLifecycle("T10").status = "completed";

  BF.bibleRuntime.onMissionState(manager.getState());

  assert.equal(manager.memory.state.missionLifecycle["LOC-05@target"].status, "active");
  assert.equal(manager.trees.get("LOC-05@target").find("LOC-05:explore@target").progress, 15);
  assert.equal(manager.memory.state.missionLifecycle["LOC-05@old60"].status, "completed");
  assert.equal(manager.memory.state.missionLifecycle["LOC-06@old60"].status, "paused");
  assert.equal(manager.trees.get("LOC-06@old60").find("LOC-06:explore@old60").progress, 75);
  assert.equal(manager.memory.state.missionLifecycle["LOC-05@old100"].status, "completed");
  assert.equal(manager.memory.state.missionLifecycle["LOC-06@old100"].status, "completed");
  assert.equal(manager.memory.state.missionLifecycle["LOC-05@low"], undefined);

  const visible = manager.getState().missions.map((mission) => mission.missionId);
  assert.ok(visible.includes("LOC-05@target"));
  assert.ok(!visible.some((id) => id.includes("@old60") || id.includes("@old100")));

  maps.target.surfacePercent = 60;
  BF.bibleRuntime.onExplorationChanged({ mapId: "target", surfacePercent: 60 });
  assert.equal(manager.memory.state.missionLifecycle["LOC-05@target"].status, "completed");
  assert.equal(manager.memory.state.missionLifecycle["LOC-06@target"].status, "active");

  maps.future = { mapId: "future", surfacePercent: 20 };
  engine.currentMapId = "future";
  BF.bibleRuntime.onMapTransition({ fromMapId: "target", toMapId: "future" });
  assert.equal(manager.memory.state.missionLifecycle["LOC-06@target"].status, "paused");
  assert.equal(manager.memory.state.missionLifecycle["LOC-05@future"].status, "active");
  assert.equal(
    manager.getState().missions
      .filter((mission) => mission.missionId.startsWith("LOC-"))
      .map((mission) => mission.missionId)
      .join(","),
    "LOC-05@future"
  );
});
