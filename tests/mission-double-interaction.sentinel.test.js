const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const PROJECT_ROOT = process.env.BLUEFOX_SENTINEL_ROOT || path.join(__dirname, "..");

function loadRuntime({ objectM0 = true } = {}) {
  const listeners = new Map();
  const storage = new Map();
  const runtimeSetTimeout = (callback, delay, ...args) => {
    const handle = setTimeout(callback, delay, ...args);
    handle.unref?.();
    return handle;
  };
  const runtimeSetInterval = (callback, delay, ...args) => {
    const handle = setInterval(callback, delay, ...args);
    handle.unref?.();
    return handle;
  };
  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  const window = {
    CustomEvent,
    console,
    setTimeout: runtimeSetTimeout,
    clearTimeout,
    setInterval: runtimeSetInterval,
    clearInterval,
    queueMicrotask,
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
      for (const listener of [...(listeners.get(event.type) || [])]) listener(event);
      return true;
    }
  };
  const context = vm.createContext({
    window,
    console,
    CustomEvent,
    performance,
    setTimeout: runtimeSetTimeout,
    clearTimeout,
    setInterval: runtimeSetInterval,
    clearInterval,
    queueMicrotask
  });
  const load = (file) => vm.runInContext(
    fs.readFileSync(path.join(PROJECT_ROOT, file), "utf8"),
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
    "engine/bible-validation-v0-1.js",
    "engine/bible-runtime-v0-1-unified.js"
  ].forEach(load);

  window.BlueFox3D.mount = async (options) => options.engine;

  if (objectM0) {
    [
      "engine/object-m0-bridge.js",
      "engine/explore-scope-bridge.js",
      "engine/sequence-actions-bridge.js",
      "engine/context-msc-bridge.js",
      "engine/travel-cycle-bridge.js",
      "engine/bible-exploration-world-v19.js",
      "engine/mission-aware-analysis.js"
    ].forEach(load);
  }
  load("engine/mission-runtime-integration-v19-7.js");
  if (objectM0) load("engine/mission-target-arbitration-v19-12.js");

  return { window, load };
}

function createGame(window, memory = null, setupEngine = null) {
  const BF = window.BlueFox3D;
  const position = { x: 0, y: 0, z: 0, distanceTo: () => 0 };
  const character = {
    root: { position },
    target: position,
    stop() {},
    setTarget() {},
    facePoint() {},
    cancelInteraction() {},
    playInteraction() { return 0; },
    currentAnimation: "",
    actions: new Map()
  };
  const engine = {
    callbacks: { onAction() {}, onStatus() {}, onCollect() {} },
    currentMapId: "crystal",
    currentZoneIndex: 0,
    currentMap: { interactables: [], colliders: [], group: null, gates: [] },
    character,
    pendingInteraction: null,
    currentRoutine: null,
    pendingGate: null,
    pendingZoneExploration: null,
    transitioning: false,
    resourceCooldowns: new WeakMap(),
    disposed: false,
    interactionApproachAttempts: 0,
    completedInteractions: 0,
    discoveredZones: new Set(),
    loadMap: async () => true,
    interactionWorldPosition: (object) => object.position,
    interactionValidationDistance: () => 2,
    interactionApproachPoint: (object) => ({
      point: object.position,
      approachDistance: 1
    }),
    showWorldMarker() {},
    targetInteraction(object) {
      this.pendingInteraction = object;
      this.interactionStartedAt = 0;
      this.interactionApproachStartedAt = performance.now();
      return true;
    },
    updateInteraction() {}
  };
  setupEngine?.(engine, position);

  const manager = BF.Missions.MissionManager.create({
    engine,
    ...(memory ? { memory } : {})
  });
  engine.missionManager = manager;
  BF.currentEngine = engine;
  BF.getMissionState = () => engine.missionManager.getState();
  BF.startMission = (id, options) => engine.missionManager.startMission(id, options);
  return { BF, engine, manager, position };
}

function completeTree(tree, MissionStatus) {
  tree.root.walk((node) => {
    if (!node.isLeaf) return;
    node.progress = node.target;
    node.status = MissionStatus.COMPLETED;
  });
  tree.refresh();
}

function stalePrimaryWithActiveShelter(window) {
  const first = createGame(window);
  first.manager.activateMission("GAME-shelter", {
    primary: true,
    source: "sentinel"
  });

  const memory = first.manager.memory;
  const completedPrimary = first.manager.planner.createTree("T03");
  completeTree(completedPrimary, first.BF.Missions.MissionStatus);
  memory.saveTree(completedPrimary);
  first.manager.dispose();
  memory.state.primaryMissionId = "T03";
  memory.state.activeMissionId = "T03";
  memory.state.activeMissionIds = ["GAME-shelter"];
  memory.state.missionLifecycle.T03 = {
    ...(memory.state.missionLifecycle.T03 || {}),
    status: "completed"
  };
  memory.state.missionLifecycle["GAME-shelter"] = {
    ...(memory.state.missionLifecycle["GAME-shelter"] || {}),
    status: "active"
  };
  return memory;
}

function fiberObject(BF, position, instanceId) {
  const object = {
    position,
    visible: true,
    userData: {
      active: true,
      functional: BF.ObjectLibrary.get("fiber"),
      instanceId,
      interactionState: {
        inspected: false,
        observed: true,
        analyzed: false,
        identified: true,
        collected: false,
        inspectionCount: 0,
        observationCount: 1,
        analysisCount: 0,
        collectionCount: 0,
        acquisitionObservationSatisfied: true
      }
    }
  };
  object.userData.worldAnchor = object;
  return object;
}

function completeInteraction(engine, now) {
  engine.updateInteraction(now);
  engine.updateInteraction(now + 3000);
}

test("le chargement réel conserve ObjectM0 comme unique propriétaire missionnel", () => {
  const { window } = loadRuntime();
  const integration = window.BlueFox3D.MissionRuntimeIntegrationV19_7;
  assert.equal(integration?.active, false);
  assert.equal(integration?.mode, "compatibility-fallback");
  assert.equal(integration?.owner, "object-m0-bridge");
});

test("collecter une fibre déjà connue exécute toutes les études dues puis collecte la même instance", async () => {
  const { window } = loadRuntime();
  const { BF, engine, manager, position } = createGame(window);
  const fiber = fiberObject(BF, position, "fiber-sentinel-a");
  engine.currentMap.interactables = [fiber];

  manager.activateMission("GAME-shelter", { primary: true, source: "sentinel" });
  manager.activateMission("T06", { primary: false, source: "sentinel" });
  manager.setPrimaryMission("GAME-shelter", false, "sentinel");
  await BF.mount({ engine });

  fiber.userData.requestedInteraction = "collect";
  fiber.userData.requestedInteractionSource = "mission";
  fiber.userData.missionNarrativeVerb = "collect";
  fiber.userData.missionNodeId = "GAME-shelter:fibers";
  fiber.userData.missionId = "GAME-shelter";

  assert.equal(engine.targetInteraction(fiber), true);
  assert.equal(fiber.userData.requestedInteraction, "observe");
  assert.equal(fiber.userData.missionId, "GAME-shelter");
  assert.equal(fiber.userData.missionNodeId, "GAME-shelter:plantStudy");

  completeInteraction(engine, 10000);
  assert.equal(engine.pendingInteraction, fiber);
  assert.equal(fiber.userData.requestedInteraction, "collect");

  completeInteraction(engine, 14000);

  const events = BF.ObjectEvents.history().slice(-2);
  assert.equal(
    Array.from(events, (event) => event.type).join(","),
    [
      BF.ObjectEvents.types.PHENOMENON_OBSERVED,
      BF.ObjectEvents.types.RESOURCE_COLLECTED
    ].join(",")
  );
  assert.equal(
    Array.from(events, (event) => event.instanceId).join(","),
    "fiber-sentinel-a,fiber-sentinel-a"
  );
  assert.equal(fiber.userData.interactionState.observationCount, 2);
  assert.equal(manager.trees.get("GAME-shelter").find("GAME-shelter:plantStudy").progress, 1);
  assert.equal(manager.trees.get("GAME-shelter").find("GAME-shelter:fibers").progress, 1);
  assert.equal(manager.trees.get("T06").find("T06:flora").progress, 1);
});

test("le fallback V19 reste actif sans ObjectM0 pour les anciennes distributions", async () => {
  const { window } = loadRuntime({ objectM0: false });
  const { engine } = createGame(window);
  await window.BlueFox3D.mount({ engine });
  assert.equal(engine.__missionRuntimeIntegrationV19_7, true);
});

test("les grands objectifs Shelter restent planifiables jusqu'à leur cible", () => {
  const { window } = loadRuntime();
  const { BF, manager } = createGame(window);
  manager.activateMission("GAME-shelter", { primary: true, source: "sentinel" });

  const tree = manager.trees.get("GAME-shelter");
  const fibers = tree.find("GAME-shelter:fibers");
  const plantStudy = tree.find("GAME-shelter:plantStudy");
  const wood = tree.find("GAME-shelter:wood");
  const context = {
    resources: { fiber: 1, wood: 1 },
    unexploredZones: 0,
    explorationPercent: 100,
    hasIncompleteDiscoveredMaps: false,
    canRoutine: true,
    needs: {},
    energy: 100
  };

  fibers.progress = fibers.target;
  fibers.status = BF.Missions.MissionStatus.COMPLETED;
  wood.progress = wood.target;
  wood.status = BF.Missions.MissionStatus.COMPLETED;
  plantStudy.progress = 51;
  plantStudy.status = BF.Missions.MissionStatus.ACTIVE;
  tree.refresh();
  assert.equal(manager.planner.nextAction(tree, context)?.nodeId, "GAME-shelter:plantStudy");

  plantStudy.progress = plantStudy.target;
  plantStudy.status = BF.Missions.MissionStatus.COMPLETED;
  wood.progress = 81;
  wood.status = BF.Missions.MissionStatus.ACTIVE;
  tree.refresh();
  assert.equal(manager.planner.nextAction(tree, context)?.nodeId, "GAME-shelter:wood");

  wood.progress = 99;
  tree.refresh();
  assert.equal(manager.planner.nextAction(tree, context)?.nodeId, "GAME-shelter:wood");

  const scoreAtHalf = (progress, target) => manager.planner.score({
    type: BF.Missions.ActionType.ANALYZE,
    progress,
    target,
    params: {}
  }, context);
  assert.equal(scoreAtHalf(5, 10), scoreAtHalf(50, 100));
  assert.ok(manager.planner.score(wood, context) >= 0);
  assert.ok(manager.planner.score(wood, { ...context, resources: {} }) < 0);
  assert.equal(manager.planner.score({
    type: BF.Missions.ActionType.TRAVEL,
    progress: 0,
    target: 1,
    params: { eventDriven: true }
  }, context), -100);
});

test("une réévaluation bloquée par une action atomique reprend dès que le moteur est libre", () => {
  const { window } = loadRuntime();
  const { engine, manager } = createGame(window);
  manager.activateMission("GAME-shelter", { primary: true, source: "sentinel" });
  manager.lastPriorityReviewAt = 0;

  engine.character.root.position.distanceTo = () => 1;
  manager.update(6001);
  assert.equal(manager.lastPriorityReviewAt, 0);

  engine.character.root.position.distanceTo = () => 0;
  manager.update(6002);
  assert.equal(manager.lastPriorityReviewAt, 6002);
  assert.equal(manager.primaryMissionId, "GAME-shelter");
});

test("à 51 sur 100, Shelter exécute encore une étude réelle via ObjectM0", async () => {
  const { window, load } = loadRuntime();
  const { BF, engine, manager, position } = createGame(window);
  const fiber = fiberObject(BF, position, "fiber-sentinel-progress-51");
  engine.currentMap.interactables = [fiber];
  manager.activateMission("GAME-shelter", {
    primary: true,
    source: "sentinel"
  });
  await BF.mount({ engine });

  const tree = manager.trees.get("GAME-shelter");
  for (const id of ["GAME-shelter:fibers", "GAME-shelter:wood"]) {
    const node = tree.find(id);
    node.progress = node.target;
    node.status = BF.Missions.MissionStatus.COMPLETED;
  }
  const plantStudy = tree.find("GAME-shelter:plantStudy");
  plantStudy.progress = 51;
  plantStudy.status = BF.Missions.MissionStatus.ACTIVE;
  tree.refresh();
  manager.retryAfter = 0;
  manager.lastPlanAt = 0;

  let underlyingAutonomyCalls = 0;
  let underlyingWatchdogCalls = 0;
  Object.assign(engine, {
    updateAutonomy() { underlyingAutonomyCalls += 1; },
    ensureActivity() { underlyingWatchdogCalls += 1; },
    handleNavigationSuggestion() { return false; },
    postActionRecoveryUntil: 0,
    lastAutonomyAt: 0,
    lastActivityAt: 0,
    autonomyActionStreak: 0,
    autonomyBreakTarget: 3,
    persistentNavigationIntent: null
  });
  BF.getSurvivalState = () => ({
    energy: 100,
    food: 100,
    fatigue: { level: "normal", movement: 1, actionDuration: 1 },
    needs: {}
  });
  BF.currentEngine = engine;
  load("engine/behavior-arbitration-core.js");
  load("engine/behavior-arbitration-integration.js");
  BF.reconnectBAC();

  engine.updateAutonomy(6000);
  engine.ensureActivity(13000);
  assert.equal(underlyingAutonomyCalls, 0);
  assert.equal(underlyingWatchdogCalls, 0);

  assert.equal(manager.update(10000), true);
  assert.equal(manager.currentAction?.nodeId, "GAME-shelter:plantStudy");
  assert.equal(engine.pendingInteraction, fiber);
  assert.equal(fiber.userData.requestedInteractionSource, "mission");

  completeInteraction(engine, 10000);
  assert.equal(plantStudy.progress, 52);
  assert.equal(manager.currentAction, null);

  engine.currentMap.interactables = [
    fiberObject(BF, position, "fiber-sentinel-progress-52")
  ];
  engine.updateAutonomy(16000);
  engine.ensureActivity(16000);
  assert.equal(underlyingAutonomyCalls, 0);
  assert.equal(underlyingWatchdogCalls, 0);

  assert.equal(manager.update(18000), true);
  completeInteraction(engine, 18000);
  assert.equal(plantStudy.progress, 53);
  assert.equal(manager.currentAction, null);
});

test("une reprise avec Shelter seule rétablit sa primaire avant le BAC", () => {
  const { window, load } = loadRuntime();
  const memory = stalePrimaryWithActiveShelter(window);
  const resumed = createGame(window, memory);
  assert.equal(resumed.manager.primaryMissionId, "GAME-shelter");
  assert.equal(resumed.manager.hasPrimaryMissionAuthority(), true);
  assert.equal(memory.state.primaryMissionId, "GAME-shelter");
  assert.equal(resumed.manager.getState().primaryMissionId, "GAME-shelter");
  assert.equal(
    resumed.manager.getState().missions
      .find((mission) => mission.missionId === "GAME-shelter")
      ?.isPrimary,
    true
  );

  let underlyingAutonomyCalls = 0;
  let underlyingWatchdogCalls = 0;
  Object.assign(resumed.engine, {
    updateAutonomy() { underlyingAutonomyCalls += 1; },
    ensureActivity() { underlyingWatchdogCalls += 1; },
    handleNavigationSuggestion() { return false; },
    postActionRecoveryUntil: 0,
    lastAutonomyAt: 0,
    lastActivityAt: 0,
    autonomyActionStreak: 0,
    autonomyBreakTarget: 3,
    persistentNavigationIntent: null
  });
  resumed.BF.getSurvivalState = () => ({
    energy: 100,
    food: 100,
    fatigue: { level: "normal", movement: 1, actionDuration: 1 },
    needs: {}
  });
  resumed.BF.currentEngine = resumed.engine;
  load("engine/behavior-arbitration-core.js");
  load("engine/behavior-arbitration-integration.js");
  resumed.BF.reconnectBAC();

  const plantStudy = resumed.manager.trees
    .get("GAME-shelter")
    .find("GAME-shelter:plantStudy");
  plantStudy.progress = 51;
  plantStudy.status = resumed.BF.Missions.MissionStatus.ACTIVE;
  assert.ok(resumed.manager.planner.score(
    plantStudy,
    resumed.manager.bridge.context()
  ) >= 0);

  resumed.engine.updateAutonomy(6000);
  resumed.engine.ensureActivity(13000);
  assert.equal(underlyingAutonomyCalls, 0);
  assert.equal(underlyingWatchdogCalls, 0);
});

test("une reprise occupée restaure l'autorité sans interrompre l'activité moteur", () => {
  const occupiedStates = [
    {
      name: "déplacement",
      occupy(engine, position) {
        const target = engine.character.target;
        position.distanceTo = () => 1;
        return () => {
          assert.equal(engine.character.target, target);
          position.distanceTo = () => 0;
        };
      }
    },
    {
      name: "transition",
      occupy(engine) {
        engine.transitioning = true;
        return () => {
          assert.equal(engine.transitioning, true);
          engine.transitioning = false;
        };
      }
    },
    {
      name: "interaction",
      occupy(engine) {
        const token = { id: "interaction-restaurée" };
        engine.pendingInteraction = token;
        return () => {
          assert.equal(engine.pendingInteraction, token);
          engine.pendingInteraction = null;
        };
      }
    },
    {
      name: "routine",
      occupy(engine) {
        const token = { type: "routine-restaurée" };
        engine.currentRoutine = token;
        return () => {
          assert.equal(engine.currentRoutine, token);
          engine.currentRoutine = null;
        };
      }
    },
    {
      name: "exploration de zone",
      occupy(engine) {
        const token = { index: 1 };
        engine.pendingZoneExploration = token;
        return () => {
          assert.equal(engine.pendingZoneExploration, token);
          engine.pendingZoneExploration = null;
        };
      }
    },
    {
      name: "portail",
      occupy(engine) {
        const token = { id: "portail-restauré" };
        engine.pendingGate = token;
        return () => {
          assert.equal(engine.pendingGate, token);
          engine.pendingGate = null;
        };
      }
    }
  ];

  for (const occupied of occupiedStates) {
    const { window, load } = loadRuntime();
    const memory = stalePrimaryWithActiveShelter(window);
    let releaseEngine;
    const resumed = createGame(window, memory, (engine, position) => {
      releaseEngine = occupied.occupy(engine, position);
    });

    assert.equal(
      resumed.manager.primaryMissionId,
      "GAME-shelter",
      occupied.name
    );
    assert.equal(
      resumed.manager.hasPrimaryMissionAuthority(),
      true,
      occupied.name
    );
    assert.equal(memory.state.primaryMissionId, "GAME-shelter", occupied.name);
    assert.equal(
      resumed.manager.getState().primaryMissionId,
      "GAME-shelter",
      occupied.name
    );

    let underlyingAutonomyCalls = 0;
    let underlyingWatchdogCalls = 0;
    Object.assign(resumed.engine, {
      updateAutonomy() { underlyingAutonomyCalls += 1; },
      ensureActivity() { underlyingWatchdogCalls += 1; },
      handleNavigationSuggestion() { return false; },
      postActionRecoveryUntil: 0,
      lastAutonomyAt: 0,
      lastActivityAt: 0,
      autonomyActionStreak: 0,
      autonomyBreakTarget: 3,
      persistentNavigationIntent: null
    });
    resumed.BF.getSurvivalState = () => ({
      energy: 100,
      food: 100,
      fatigue: { level: "normal", movement: 1, actionDuration: 1 },
      needs: {}
    });
    resumed.BF.currentEngine = resumed.engine;
    load("engine/behavior-arbitration-core.js");
    load("engine/behavior-arbitration-integration.js");
    resumed.BF.reconnectBAC();

    releaseEngine();
    resumed.engine.updateAutonomy(6000);
    resumed.engine.ensureActivity(13000);
    assert.equal(underlyingAutonomyCalls, 0, occupied.name);
    assert.equal(underlyingWatchdogCalls, 0, occupied.name);
    resumed.manager.dispose();
  }
});

test("une primaire valide reste différée pendant une activité moteur", () => {
  const { window } = loadRuntime();
  const { engine, manager } = createGame(window);
  manager.activateMission("GAME-shelter", {
    primary: true,
    source: "sentinel"
  });
  manager.activateMission("T06", {
    primary: false,
    source: "sentinel"
  });

  const routine = { type: "routine-atomique" };
  engine.currentRoutine = routine;
  assert.equal(manager.setPrimaryMission("T06", false, "sentinel"), true);
  assert.equal(manager.primaryMissionId, "GAME-shelter");
  assert.equal(manager.pendingPrimaryMissionId, "T06");
  assert.equal(engine.currentRoutine, routine);

  engine.currentRoutine = null;
  assert.equal(manager.applyPendingTransitions(), true);
  assert.equal(manager.primaryMissionId, "T06");
  assert.equal(manager.pendingPrimaryMissionId, null);
});

test("une reprise conserve la priorité missionnelle choisie par le joueur", () => {
  const { window } = loadRuntime();
  const first = createGame(window);
  first.manager.activateMission("GAME-shelter", {
    primary: true,
    source: "sentinel"
  });
  first.manager.activateMission("T06", {
    primary: false,
    source: "sentinel"
  });
  first.manager.suggestPrimaryMission("T06");

  const memory = first.manager.memory;
  first.manager.dispose();
  const resumed = createGame(window, memory);
  assert.equal(resumed.manager.primaryMissionId, "T06");
  assert.equal(resumed.manager.selectionReason, "Priorité suggérée par le joueur.");
  assert.equal(resumed.manager.hasPrimaryMissionAuthority(), true);
});
