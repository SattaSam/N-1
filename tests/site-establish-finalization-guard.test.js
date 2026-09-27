const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const runtimeFile = process.env.BLUEFOX_RUNTIME_FILE || path.join(__dirname, "..", "engine", "bible-runtime-v0-1-unified.js");

function loadRuntime() {
  const storage = new Map();
  const quietConsole = { log() {}, info() {}, warn() {}, error() {} };
  const window = {
    BlueFox3D: { BibleCatalog: [], BiblePatterns: {}, Missions: {} },
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    setTimeout() { return 0; },
    clearTimeout() {},
    setInterval() { return 0; },
    clearInterval() {},
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    performance: { now: () => 1000 },
    console: quietConsole
  };
  window.window = window;
  vm.createContext(window);
  vm.runInContext(fs.readFileSync(runtimeFile, "utf8"), window, { filename: runtimeFile });
  return window;
}

function makeRuntime(window, mission) {
  const BF = window.BlueFox3D;
  const runtime = new BF.BibleRuntimeV01();
  runtime.catalog = [mission];
  runtime.byId = new Map([[mission.id, mission]]);
  runtime.dynamicMissions = new Map();
  runtime.pendingConstructionResourceMissions = new Set();
  runtime.constructionResourceSignatures = new Map();
  runtime.state.gatesSatisfied = {};
  runtime.state.effectsApplied = {};
  return runtime;
}

function constructionMission(id = "T03", withGate = false) {
  return {
    id,
    title: id,
    effects: [
      { type: "inventory.consume", inventoryKey: "wood", quantity: 10 },
      { type: "site.establish", kind: "camp", microSceneId: "MSC-CUSTOM-CAMP", stage: 1 }
    ],
    ...(withGate ? { completionGate: { type: "proximity.shelter", mapId: "crystal", shelterKinds: ["camp"] } } : {})
  };
}

(function run() {
  const window = loadRuntime();
  const BF = window.BlueFox3D;

  // 1. Invariant de classification : site.establish est toujours une finalisation gérée.
  {
    const mission = constructionMission();
    const runtime = makeRuntime(window, mission);
    BF.currentEngine = { currentMapId: "crystal" };
    assert.strictEqual(runtime.missionTargetMapId(mission), "", "T03-like sans cible explicite doit réellement retourner une cible vide");
    runtime.siteBucket = (mapId) => {
      assert.strictEqual(mapId, "crystal", "la finalisation sans cible explicite doit utiliser la map courante");
      return { camp: null };
    };
    runtime.inventoryEffectsReady = () => false;
    runtime.constructionResourceStatus = () => ({ ready: false, missing: [{ inventoryKeys: ["wood"], missing: 10 }] });
    runtime.publishConstructionResourceStatus = () => false;
    const state = runtime.completionGateState(mission.id);
    assert.strictEqual(state.managed, true, "site.establish sans completionGate doit être géré");
    assert.strictEqual(state.canFinalize, false, "site.establish sans site réel ne doit pas finaliser");
    assert(runtime.pendingConstructionResourceMissions.has(mission.id), "la mission doit attendre ses ressources");
  }

  // 2. Une construction avec completionGate garde son parcours historique : pas d'application automatique.
  {
    const mission = constructionMission("GATED-CONSTRUCTION", true);
    const runtime = makeRuntime(window, mission);
    runtime.missionTargetMapId = () => "crystal";
    runtime.siteBucket = () => ({ camp: null });
    let applyCalls = 0;
    runtime.applyEffects = () => { applyCalls += 1; return true; };
    assert.strictEqual(runtime.canFinalizeMission(mission.id), false);
    assert.strictEqual(applyCalls, 0, "un completionGate explicite doit conserver handleConstructionReady comme parcours");
  }

  // 3. Un completionGate sans construction reste géré indépendamment de site.establish.
  {
    const mission = { id: "GATE-ONLY", completionGate: { type: "proximity.shelter" }, effects: [] };
    const runtime = makeRuntime(window, mission);
    runtime.gateSatisfied = () => false;
    assert.strictEqual(runtime.completionGateState(mission.id).managed, true);
    assert.strictEqual(runtime.canFinalizeMission(mission.id), false);
  }

  // 4. Une mission ordinaire reste hors de cette mécanique.
  {
    const mission = { id: "ORDINARY", effects: [] };
    const runtime = makeRuntime(window, mission);
    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(runtime.completionGateState(mission.id))),
      { managed: false, canFinalize: true, message: "" }
    );
  }

  // 5. Échec de rendu : applyEffects doit échouer avant toute consommation ou receipt.
  {
    const mission = constructionMission("SPAWN-FAIL");
    const runtime = makeRuntime(window, mission);
    const memory = {
      state: { siteProgression: {} },
      hasEffectReceipt: () => false,
      recordEffectReceipt() { this.receipts = (this.receipts || 0) + 1; },
      save() {}
    };
    runtime.manager = () => ({ memory });
    BF.currentEngine = { currentMapId: "crystal" };
    assert.strictEqual(runtime.missionTargetMapId(mission), "", "SPAWN-FAIL ne doit pas inventer targetMapId");
    runtime.inventoryEffectsReady = () => true;
    runtime.inventoryConsumptionPlan = () => ({ ready: true, balances: {} });
    runtime.resolveSitePlacement = () => ({ anchor: { x: 1, y: 0, z: 1 }, rotation: [0, 0, 0] });
    runtime.renderSite = () => false;
    runtime.publishConstructionResourceStatus = () => false;
    BF.MicroScenes = { get: () => ({ id: "MSC-CUSTOM-CAMP" }) };
    let consumed = 0;
    BF.consumeInventoryPoolOnce = () => { consumed += 1; return 10; };
    assert.strictEqual(runtime.canFinalizeMission(mission.id), false, "un spawn refusé ne finalise pas");
    assert.strictEqual(consumed, 0, "les ressources ne doivent pas être consommées avant un spawn réussi");
    assert.strictEqual(memory.receipts || 0, 0, "aucun receipt ne doit être créé sur échec de spawn");
  }

  // 6. Vrai cas T03 sans targetMapId : site sur la map courante, finalisation puis aucun rejeu.
  {
    const mission = constructionMission("ATOMIC-SUCCESS");
    const runtime = makeRuntime(window, mission);
    BF.currentEngine = { currentMapId: "crystal" };
    assert.strictEqual(runtime.missionTargetMapId(mission), "", "le vrai cas T03 n'a aucune cible de map explicite");
    let site = null;
    runtime.siteBucket = (mapId) => {
      assert.strictEqual(mapId, "crystal", "le site T03 doit être recherché sur la map courante après applyEffects");
      return { camp: site };
    };
    runtime.inventoryEffectsReady = () => true;
    runtime.publishConstructionResourceStatus = () => false;
    let applyCalls = 0;
    runtime.applyEffects = (_mission, options) => {
      applyCalls += 1;
      assert.strictEqual(options.source, "mission-completion");
      site = { mapId: "crystal", missionId: mission.id, kind: "camp" };
      return true;
    };
    assert.strictEqual(runtime.canFinalizeMission(mission.id), true, "le site réel autorise ensuite la finalisation");
    assert.strictEqual(applyCalls, 1);
    assert.strictEqual(runtime.canFinalizeMission(mission.id), true);
    assert.strictEqual(applyCalls, 1, "un site déjà établi ne doit pas rejouer l'effet");
  }

  // 7. Le polling de finalisation doit désormais revoir un site.establish sans completionGate.
  {
    const mission = constructionMission("POLLING-GUARD");
    const runtime = makeRuntime(window, mission);
    let syncCalls = 0;
    const manager = {
      memory: { state: { missionLifecycle: { [mission.id]: { status: "active" } } } },
      trees: new Map([[mission.id, { root: { isComplete: true } }]]),
      syncLifecycleFromTrees() { syncCalls += 1; },
      reevaluatePendingActivations() {},
      catalogController: { schedule() {} },
      publish() {}
    };
    runtime.manager = () => manager;
    runtime.lastGateReviewAt = 0;
    runtime.updateCompletionGates(1000);
    assert.strictEqual(syncCalls, 1, "site.establish sans gate doit rester dans la boucle de finalisation");
  }

  console.log("PASS site-establish finalization guard (7 scenarios, including real T03 without targetMapId)");
})();
