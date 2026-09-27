const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function fixture(options = {}) {
  const root = path.join(__dirname, "..");
  const listeners = new Map();
  const storage = new Map();
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const window = {
    CustomEvent, console, setTimeout, clearTimeout, BlueFox3D: {},
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
    }
  };
  const context = vm.createContext({ window, console, CustomEvent, performance, setTimeout, clearTimeout });
  const load = (file) => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  load("engine/object-library.js");
  const runtimeFiles = [
    "engine/mission-types.js", "engine/mission-tree.js", "engine/mission-memory.js",
    "engine/mission-planner.js", "engine/action-bridge.js", "engine/mission-manager.js",
    "engine/mission-empty-core.js", "engine/mission-catalog.js", "engine/object-event-registry.js",
    "engine/bible-contract-v0-1.js", "data/bible-patterns.js", "data/bible-catalog.js",
    "engine/bible-runtime-v0-1-unified.js"
  ];
  if (options.bible === false) runtimeFiles.pop();
  runtimeFiles.forEach(load);
  window.BlueFox3D.mount = async (options) => options.engine;
  load("engine/object-m0-bridge.js");
  return { window, storage };
}

function game(window) {
  const BF = window.BlueFox3D;
  const position = { x: 0, y: 0, z: 0, distanceTo: () => 0 };
  const character = {
    root: { position }, target: position, stop() {}, setTarget() {}, facePoint() {},
    cancelInteraction() {}, findAvailableClip() { return ""; }, actions: new Map(),
    play() {}, playInteraction() { return 0; }, currentAnimation: ""
  };
  const engine = {
    callbacks: { onAction() {}, onStatus() {}, onCollect() {} },
    currentMapId: "crystal", currentZoneIndex: 0, character,
    currentMap: { interactables: [] }, pendingInteraction: null,
    currentRoutine: null, pendingGate: null, pendingZoneExploration: null,
    transitioning: false, resourceCooldowns: new WeakMap(), disposed: false,
    interactionWorldPosition(object) { return object.position; },
    interactionValidationDistance() { return 2; },
    interactionApproachPoint(object) { return { point: object.position, approachDistance: 1 }; },
    showWorldMarker() {},
    targetInteraction(object) {
      this.pendingInteraction = object;
      this.interactionStartedAt = 0;
      this.interactionApproachStartedAt = performance.now();
      return true;
    }
  };
  const manager = BF.Missions.MissionManager.create({ engine });
  engine.missionManager = manager;
  BF.currentEngine = engine;
  BF.getMissionState = () => engine.missionManager.getState();
  BF.startMission = (id, options) => engine.missionManager.startMission(id, options);
  return { BF, engine, manager, position };
}

test("une flore déjà connue peut être ré-observée pour un objectif analyze actuel", async () => {
  const { window } = fixture();
  const { BF, engine, manager, position } = game(window);
  const definition = BF.ObjectLibrary.get("luminescent_tree");
  const object = { position, userData: { active: true, functional: definition, instanceId: "tree-a" } };
  object.userData.worldAnchor = object;
  object.userData.interactionState = {
    inspected: true, observed: true, analyzed: true, identified: true,
    inspectionCount: 4, observationCount: 3, analysisCount: 2, collectionCount: 0
  };
  engine.currentMap.interactables = [object];
  await BF.mount({ engine });

  assert.equal(manager.startMission("SUR-03", { primary: false, autoPrimaryEligible: false }), true);
  engine.targetInteraction(object);
  assert.equal(object.userData.requestedInteraction, "observe");
  assert.equal(object.userData.missionNarrativeVerb, "analyze");

  const now = performance.now();
  engine.updateInteraction(now);
  engine.updateInteraction(now + 2100);

  const study = manager.trees.get("SUR-03").find("SUR-03:studyPlants");
  assert.equal(study.progress, 1);
  const event = BF.ObjectEvents.history().at(-1);
  assert.equal(event.type, BF.ObjectEvents.types.PHENOMENON_OBSERVED);
  assert.equal(event.detail.interactionMode, "observe");
  assert.equal(event.detail.missionNarrativeVerb, "analyze");
  assert.equal(object.userData.active, true, "une étude pure ne collecte pas la plante");
});

test("l'autonomie exécute une vraie analyse SUR-03 sur une flore CUO", async () => {
  const { window } = fixture();
  const { BF, engine, manager, position } = game(window);
  const definition = BF.ObjectLibrary.get("tree_fallen");
  const object = { position, userData: { active: true, functional: definition, instanceId: "fallen-a" } };
  object.userData.worldAnchor = object;
  engine.currentMap.interactables = [object];
  await BF.mount({ engine });

  assert.equal(manager.startMission("SUR-03", { primary: false, autoPrimaryEligible: false }), true);
  manager.lastPlanAt = 0;
  manager.retryAfter = 0;
  assert.equal(manager.update(10000), true);
  assert.equal(engine.pendingInteraction, object);
  assert.equal(object.userData.requestedInteraction, "observe");
  assert.equal(object.userData.requestedInteractionSource, "mission");
  assert.equal(object.userData.missionNarrativeVerb, "analyze");

  const now = performance.now();
  engine.updateInteraction(now);
  engine.updateInteraction(now + 2100);
  assert.equal(manager.trees.get("SUR-03").find("SUR-03:studyPlants").progress, 1);
  assert.equal(BF.ObjectEvents.history().at(-1).type, BF.ObjectEvents.types.PHENOMENON_OBSERVED);
});

test("une collecte de flore ne crée plus une mission impossible sur un objet retiré", () => {
  const { window } = fixture();
  const { BF, manager } = game(window);
  const definition = BF.ObjectLibrary.get("tree_fallen");
  const object = { userData: { active: false, functional: definition } };
  object.userData.worldAnchor = object;
  BF.ObjectEvents.emit(BF.ObjectEvents.types.RESOURCE_COLLECTED, object, {
    kind: "wood", subject: "flora", interactionMode: "collect"
  });
  assert.equal(manager.trees.has("BIBLE-V01-DISCOVERY"), false);
});

test("une plante fibreuse jamais étudiée révèle SUR-03 sans binding implicite", async () => {
  const { window } = fixture();
  const { BF, engine, manager, position } = game(window);
  manager.memory.setFact("worldContext:bosquet-bio", true);
  const definition = BF.ObjectLibrary.get("fiber");
  const object = { position, userData: { active: true, functional: definition, instanceId: "fiber-a" } };
  object.userData.worldAnchor = object;
  engine.currentMap.interactables = [object];
  await BF.mount({ engine });

  engine.targetInteraction(object);
  assert.equal(object.userData.requestedInteraction, "observe");
  const now = performance.now();
  engine.updateInteraction(now);
  engine.updateInteraction(now + 2100);

  const tree = manager.trees.get("SUR-03");
  assert.ok(tree, "l'observation révèle SUR-03");
  assert.equal(manager.memory.getFact("bibleTarget:SUR-03", "missing"), null);
  assert.equal(BF.ObjectEvents.history().at(-1).type, BF.ObjectEvents.types.PHENOMENON_OBSERVED);
});

test("l'objectif narratif SUR-03 analyser force OBSERVE au lieu de COLLECT", async () => {
  const { window } = fixture();
  const { BF, engine, manager, position } = game(window);
  const definition = BF.ObjectLibrary.get("bush");
  const object = { position, userData: { active: true, functional: definition, instanceId: "bush-a" } };
  object.userData.worldAnchor = object;
  engine.currentMap.interactables = [object];
  await BF.mount({ engine });
  assert.equal(manager.startMission("SUR-03", { primary: false, autoPrimaryEligible: false }), true);

  engine.targetInteraction(object);
  assert.equal(object.userData.requestedInteraction, "observe");
  assert.equal(object.userData.missionNarrativeVerb, "analyze");
  const now = performance.now();
  engine.updateInteraction(now);
  engine.updateInteraction(now + 2100);

  assert.equal(manager.trees.get("SUR-03").find("SUR-03:studyPlants").progress, 1);
  assert.equal(object.userData.active, true);
  assert.equal(BF.ObjectEvents.history().at(-1).type, BF.ObjectEvents.types.PHENOMENON_OBSERVED);
});

test("OBSERVER incline puis fige la tête 2 s, enchaîne la respiration Idle et adapte le vocabulaire", async () => {
  const { window } = fixture();
  const { BF, engine, position } = game(window);
  const definition = BF.ObjectLibrary.get("bush");
  const object = { position, userData: { active: true, functional: definition, instanceId: "pose-tree" } };
  object.userData.worldAnchor = object;
  object.userData.requestedInteraction = "observe";
  object.userData.requestedInteractionSource = "mission";
  object.userData.missionNarrativeVerb = "inspect";
  const earAction = { paused: false, time: 0, getClip: () => ({ duration: 1.2 }) };
  const idleAction = { paused: false, time: 0, getClip: () => ({ duration: 1.2 }) };
  const played = [];
  const actions = [];
  const statuses = [];
  const head = { name: "Head", rotation: { x: 0, y: 0, z: 0 } };
  const visual = {
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    traverse(visitor) { visitor(head); }
  };
  engine.character.visual = visual;
  engine.character.actions = new Map([["Ear_Right", earAction], ["Idle_V2", idleAction]]);
  engine.character.findAvailableClip = (names) => names.find((name) => engine.character.actions.has(name)) || "";
  engine.character.play = (name) => played.push(name);
  engine.callbacks.onAction = (text) => actions.push(text);
  engine.callbacks.onStatus = (text) => statuses.push(text);
  engine.currentMap.interactables = [object];
  await BF.mount({ engine });

  engine.targetInteraction(object);
  const now = performance.now();
  engine.updateInteraction(now);
  assert.ok(head.rotation.z >= 0.23);
  engine.updateInteraction(now + 600);
  assert.equal(earAction.paused, true);
  assert.ok(earAction.time > 0 && earAction.time < earAction.getClip().duration);
  head.rotation.z = 0; // simule la réécriture de l'os par AnimationMixer
  engine.updateInteraction(now + 700);
  assert.ok(head.rotation.z >= 0.29);
  engine.updateInteraction(now + 2100);
  assert.deepEqual(played.slice(0, 2), ["Ear_Right", "Idle_V2"]);
  engine.updateInteraction(now + 2600);
  assert.ok(visual.scale.y > 1.005 && visual.scale.y < 1.02);
  assert.ok(statuses.some((text) => text.includes("l’inspecter")));
  assert.ok(actions.some((text) => text.includes("inspecte")));
  engine.updateInteraction(now + 3400);
  assert.equal(BF.ObjectEvents.history().at(-1).type, BF.ObjectEvents.types.PHENOMENON_OBSERVED);
});

test("une plante adaptative étudiée est collectée ensuite hors priorité de mission", async () => {
  const { window } = fixture({ bible: false });
  const { BF, engine, position } = game(window);
  const definition = BF.ObjectLibrary.get("adaptive_plant");
  const object = { position, userData: { active: true, functional: definition } };
  object.userData.worldAnchor = object;
  engine.currentMap.interactables = [object];
  await BF.mount({ engine });

  engine.targetInteraction(object);
  assert.equal(object.userData.requestedInteraction, "observe");
  const now = performance.now();
  engine.updateInteraction(now);
  engine.updateInteraction(now + 2100);
  await new Promise((resolve) => setTimeout(resolve, 780));

  assert.equal(engine.pendingInteraction, object);
  assert.equal(object.userData.requestedInteraction, "collect");
  assert.equal(object.userData.requestedInteractionSource, "manual");
});

test("une relique non collectable utilise Ear à gauche, pause 2 s, Idle, Blink rapide, Idle", async () => {
  const { window } = fixture({ bible: false });
  const { BF, engine, position } = game(window);
  const definition = BF.ObjectLibrary.get("tech_relic");
  const object = { position, userData: { active: true, functional: definition } };
  object.userData.worldAnchor = object;
  const earAction = { paused: false, time: 0, getClip: () => ({ duration: 1.2 }) };
  const idleAction = { paused: false, time: 0, getClip: () => ({ duration: 1.1 }) };
  const blinkAction = {
    paused: false, time: 0, speed: 1,
    getClip: () => ({ duration: 0.45 }),
    setEffectiveTimeScale(value) { this.speed = value; }
  };
  const head = { name: "Head", rotation: { x: 0, y: 0, z: 0 } };
  const visual = {
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    getObjectByName(name) { return name === "Head" ? head : null; },
    traverse(visitor) { visitor(head); }
  };
  const played = [];
  engine.character.visual = visual;
  engine.character.actions = new Map([
    ["Ear_Right", earAction], ["Idle", idleAction], ["Idle_V2", idleAction], ["Blink", blinkAction]
  ]);
  engine.character.findAvailableClip = (names) => names.find((name) => engine.character.actions.has(name)) || "";
  engine.character.play = (name) => {
    played.push(name);
    engine.character.currentAction = engine.character.actions.get(name);
  };
  engine.currentMap.interactables = [object];
  await BF.mount({ engine });

  engine.targetInteraction(object);
  const now = performance.now();
  engine.updateInteraction(now);
  assert.ok(head.rotation.z <= -0.29);
  engine.updateInteraction(now + 400);
  assert.equal(earAction.paused, true);
  engine.updateInteraction(now + 2200);
  assert.ok(head.rotation.z <= -0.29, "la pose reste figée pendant deux secondes après le penché");
  engine.updateInteraction(now + 2400);
  engine.updateInteraction(now + 3250);
  assert.equal(blinkAction.speed, 2.4);
  engine.updateInteraction(now + 3500);
  assert.deepEqual(played.slice(0, 4), ["Ear_Right", "Idle", "Blink", "Idle"]);
});
