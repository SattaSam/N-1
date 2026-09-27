const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = process.env.TARGET_ROOT || path.join(__dirname, "..");

function source(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function gitBlob(text) {
  const crypto = require("node:crypto");
  const data = Buffer.from(text, "utf8");
  return crypto.createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${data.length}\0`), data]))
    .digest("hex");
}

function makeWindow() {
  const storage = new Map();
  const listeners = new Map();
  class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
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
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event) {
      for (const listener of [...(listeners.get(event.type) || [])]) listener(event);
      return true;
    },
    setTimeout() { return 0; },
    clearTimeout() {},
    queueMicrotask(callback) { callback(); }
  };
  return { window, storage, CustomEvent };
}

function installProgression() {
  const { window, storage, CustomEvent } = makeWindow();
  const definitions = new Map([
    ["DOC-RES-WOOD-M-001", {
      id: "DOC-RES-WOOD-M-001", type: "tree_fallen", category: "resources",
      knowledge: { family: "flora" },
      resource: { family: "wood", inventoryKey: "wood" },
      situation: { tags: ["resource", "wood"] }
    }],
    ["DOC-RES-FIBER-S-001", {
      id: "DOC-RES-FIBER-S-001", type: "fiber", category: "resources",
      knowledge: { family: "flora" },
      resource: { family: "fiber", inventoryKey: "fiber" },
      spawn: { tags: ["plant", "fiber"] }
    }],
    ["DOC-RES-ORE-M-001", {
      id: "DOC-RES-ORE-M-001", type: "magnetic_ore", category: "resources",
      knowledge: { family: "mineral" },
      resource: { family: "ore", inventoryKey: "magnetic_ore" },
      situation: { tags: ["mineral", "magnetic"] }
    }],
    ["DOC-RES-CRYSTAL-M-001", {
      id: "DOC-RES-CRYSTAL-M-001", type: "crystal_cluster", category: "resources",
      knowledge: { family: "mineral" },
      resource: { family: "crystal", inventoryKey: "crystal" },
      spawn: { tags: ["mineral", "crystal"] }
    }],
    ["DOC-BIO-ADAPT-S-001", {
      id: "DOC-BIO-ADAPT-S-001", type: "adaptive_plant", category: "flora",
      knowledge: { family: "flora" },
      resource: { family: "biomass", inventoryKey: "adaptive_biomass" },
      situation: { tags: ["plant", "adaptive"] }
    }]
  ]);

  const subscribers = new Set();
  window.BlueFox3D = {
    ObjectLibrary: {
      getById: (id) => definitions.get(id) || null,
      get: (id) => [...definitions.values()].find((d) => d.type === id) || null,
      list: () => [...definitions.values()]
    },
    ObjectEvents: {
      types: {
        RESOURCE_COLLECTED: "RESOURCE_COLLECTED",
        RESOURCE_EXTRACTED: "RESOURCE_EXTRACTED",
        OBJECT_SEEN: "OBJECT_SEEN",
        OBJECT_INSPECTED: "OBJECT_INSPECTED",
        OBJECT_ANALYZED: "OBJECT_ANALYZED",
        PHENOMENON_OBSERVED: "PHENOMENON_OBSERVED",
        KNOWLEDGE_ACQUIRED: "KNOWLEDGE_ACQUIRED"
      },
      subscribe(fn) {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      }
    }
  };
  const context = vm.createContext({
    window, CustomEvent, console, performance
  });
  vm.runInContext(source("engine/progression-registry.js"), context, {
    filename: "engine/progression-registry.js"
  });
  return { window, storage, definitions };
}

function collect(BF, id, objectId, inventoryKey, quantity) {
  return BF.progression.consume({
    id,
    type: "RESOURCE_COLLECTED",
    objectId,
    inventoryKey,
    quantity
  });
}

test("ProgressionRegistry porte un cumul historique générique des 5 familles", () => {
  const { window } = installProgression();
  const BF = window.BlueFox3D;

  collect(BF, "w1", "DOC-RES-WOOD-M-001", "wood", 5);
  collect(BF, "f1", "DOC-RES-FIBER-S-001", "fiber", 7);
  collect(BF, "m1", "DOC-RES-ORE-M-001", "magnetic_ore", 11);
  collect(BF, "c1", "DOC-RES-CRYSTAL-M-001", "crystal", 13);
  collect(BF, "p1", "DOC-BIO-ADAPT-S-001", "adaptive_biomass", 17);

  assert.equal(BF.getHistoricalCollectionTotal({ kind: "wood" }), 5);
  assert.equal(BF.getHistoricalCollectionTotal({ kind: "fiber" }), 7);
  assert.equal(
    BF.getHistoricalCollectionTotal({
      subject: "mineral",
      excludeKinds: ["crystal"]
    }),
    11
  );
  assert.equal(BF.getHistoricalCollectionTotal({ kind: "crystal" }), 13);
  assert.equal(
    BF.getHistoricalCollectionTotal({
      subject: "flora",
      excludeKinds: ["wood"]
    }),
    24
  );
});

test("le cumul historique ne baisse ni au dépôt ni à la consommation et persiste", () => {
  const { window, storage } = installProgression();
  const BF = window.BlueFox3D;
  collect(BF, "w1", "DOC-RES-WOOD-M-001", "wood", 20);
  assert.equal(BF.getHistoricalCollectionTotal({ kind: "wood" }), 20);

  BF.depositInventory("wood", 12);
  BF.consumeInventoryPool(["wood"], 8);
  assert.equal(BF.getHistoricalCollectionTotal({ kind: "wood" }), 20);

  const reloaded = new BF.ProgressionRegistry(window.localStorage);
  assert.equal(reloaded.historicalCollectionTotal({ kind: "wood" }), 20);
  reloaded.disconnect();
  assert.ok(storage.get("bluefox_progression_registry_v1"));
});

test("un même événement ne peut pas doubler le crédit historique", () => {
  const { window } = installProgression();
  const BF = window.BlueFox3D;
  assert.equal(collect(BF, "same", "DOC-RES-WOOD-M-001", "wood", 9), true);
  assert.equal(collect(BF, "same", "DOC-RES-WOOD-M-001", "wood", 9), false);
  assert.equal(BF.getHistoricalCollectionTotal({ kind: "wood" }), 9);
});

test("BibleRuntime réconcilie une feuille COL avec min(total historique, target)", () => {
  const { window, CustomEvent } = makeWindow();
  window.BlueFox3D = {
    BiblePatterns: {},
    BibleCatalog: [],
    BibleContractV01: { validateCatalog: () => ({ ok: true, errors: [], warnings: [] }) },
    Missions: { getDefinition: () => null },
    registerMissionDefinitions: () => 0,
    ObjectEvents: { subscribe: () => () => {}, types: { RESOURCE_COLLECTED: "RESOURCE_COLLECTED" } }
  };
  const runtimeSource = source("engine/bible-runtime-v0-1-unified.js")
    .replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/, "\n})(window);");
  vm.runInContext(runtimeSource, vm.createContext({
    window, CustomEvent, console, performance, Promise
  }), { filename: "engine/bible-runtime-v0-1-unified.js" });

  const BF = window.BlueFox3D;
  const runtime = BF.bibleRuntime;
  const node = {
    target: 500,
    progress: 0,
    params: { historicalCollection: true, kind: "wood" }
  };
  const tree = {
    root: { walk(callback) { callback(node); } },
    refresh() {}
  };
  const manager = {
    trees: new Map([["COL-WOOD-500", tree]]),
    memory: {
      state: { missionLifecycle: { "COL-WOOD-500": { status: "active" } } },
      saveTree() {}
    },
    syncLifecycleFromTrees() {},
    reevaluatePendingActivations() {},
    catalogController: { schedule() {} },
    publish() {}
  };
  BF.currentEngine = { missionManager: manager };
  BF.progression = { historicalCollectionTotal: () => 287 };
  runtime.catalog = [{ id: "COL-WOOD-500" }];
  runtime.byId = new Map(runtime.catalog.map((m) => [m.id, m]));
  runtime.missionLifecycle = () => ({ active: true, completed: false });

  assert.equal(runtime.reconcileHistoricalCollections("COL-WOOD-500"), true);
  assert.equal(node.progress, 287);

  BF.progression.historicalCollectionTotal = () => 999;
  assert.equal(runtime.reconcileHistoricalCollections("COL-WOOD-500"), true);
  assert.equal(node.progress, 500);
});


test("rattrapage 287 => 20/50/100/250 terminés et 500 à 287/500", () => {
  const { window, CustomEvent } = makeWindow();
  window.BlueFox3D = {
    BiblePatterns: {},
    BibleCatalog: [],
    BibleContractV01: { validateCatalog: () => ({ ok: true, errors: [], warnings: [] }) },
    Missions: { getDefinition: () => null },
    registerMissionDefinitions: () => 0,
    ObjectEvents: { subscribe: () => () => {}, types: { RESOURCE_COLLECTED: "RESOURCE_COLLECTED" } }
  };
  const runtimeSource = source("engine/bible-runtime-v0-1-unified.js")
    .replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/, "\n})(window);");
  vm.runInContext(runtimeSource, vm.createContext({
    window, CustomEvent, console, performance, Promise
  }), { filename: "engine/bible-runtime-v0-1-unified.js" });

  const catalogWindow = makeWindow().window;
  catalogWindow.BlueFox3D = {};
  vm.runInContext(source("data/bible-catalog.js"), vm.createContext({
    window: catalogWindow, console
  }), { filename: "data/bible-catalog.js" });

  const BF = window.BlueFox3D;
  const runtime = BF.bibleRuntime;
  const missions = catalogWindow.BlueFox3D.BibleCatalog
    .filter((m) => /^COL-WOOD-(20|50|100|250|500|1000)$/.test(m.id));
  runtime.catalog = missions;
  runtime.byId = new Map(missions.map((m) => [m.id, m]));

  const lifecycle = Object.fromEntries(
    missions.map((m) => [m.id, { status: "hidden" }])
  );
  const trees = new Map();
  const manager = {
    trees,
    memory: {
      state: { missionLifecycle: lifecycle },
      getFact: () => false,
      saveTree() {},
      save() {}
    },
    syncLifecycleFromTrees() {
      for (const [id, tree] of trees) {
        if (tree.node.progress >= tree.node.target) lifecycle[id].status = "completed";
      }
    },
    reevaluatePendingActivations() {},
    catalogController: { schedule() {} },
    publish() {}
  };
  BF.currentEngine = { missionManager: manager };
  BF.progression = { historicalCollectionTotal: () => 287 };

  runtime.missionLifecycle = (id) => ({
    active: lifecycle[id]?.status === "active",
    completed: lifecycle[id]?.status === "completed",
    lifecycle: lifecycle[id]
  });
  runtime.activateMission = (mission) => {
    if (!mission || lifecycle[mission.id].status === "completed") return false;
    lifecycle[mission.id].status = "active";
    const requirement = mission.slots.collect.requirements[0];
    const node = {
      target: requirement.target,
      progress: 0,
      params: requirement.params
    };
    const tree = {
      node,
      root: { walk(callback) { callback(node); } },
      refresh() {}
    };
    trees.set(mission.id, tree);
    return true;
  };

  const first = missions.find((m) => m.id === "COL-WOOD-20");
  assert.equal(runtime.activateMission(first), true);
  assert.equal(runtime.reconcileHistoricalCollectionChains(), true);

  for (const threshold of [20, 50, 100, 250]) {
    assert.equal(lifecycle[`COL-WOOD-${threshold}`].status, "completed");
  }
  assert.equal(lifecycle["COL-WOOD-500"].status, "active");
  assert.equal(trees.get("COL-WOOD-500").node.progress, 287);
  assert.equal(lifecycle["COL-WOOD-1000"].status, "hidden");
});

test("le compilateur réserve catalogManaged aux collectes historiques", () => {
  const runtime = source("engine/bible-runtime-v0-1-unified.js");
  assert.match(runtime, /historicalCollection === true/);
  assert.match(runtime, /catalogManaged:/);
  assert.doesNotMatch(runtime, /ObjectEvents\.history\s*\(/);
});

test("catalogue COL = 5 familles x 6 paliers avec transfert 50→100 et 100→500", () => {
  const { window } = makeWindow();
  window.BlueFox3D = {};
  vm.runInContext(source("data/bible-catalog.js"), vm.createContext({ window, console }), {
    filename: "data/bible-catalog.js"
  });
  const catalog = window.BlueFox3D.BibleCatalog;
  const col = catalog.filter((m) => /^COL-(WOOD|FIBER|MINERAL|CRYSTAL|PLANT)-/.test(m.id));
  assert.equal(col.length, 30);

  for (const family of ["WOOD", "FIBER", "MINERAL", "CRYSTAL", "PLANT"]) {
    for (const threshold of [20, 50, 100, 250, 500, 1000]) {
      assert.ok(col.find((m) => m.id === `COL-${family}-${threshold}`));
    }
    assert.equal(col.find((m) => m.id === `COL-${family}-100`).trigger.missionId, `COL-${family}-50`);
    assert.equal(col.find((m) => m.id === `COL-${family}-250`).trigger.missionId, `COL-${family}-100`);
    assert.equal(col.find((m) => m.id === `COL-${family}-500`).trigger.missionId, `COL-${family}-250`);
    assert.equal(col.find((m) => m.id === `COL-${family}-1000`).trigger.missionId, `COL-${family}-500`);

    const m250 = col.find((m) => m.id === `COL-${family}-250`);
    assert.equal(m250.souvenir, undefined);
    assert.equal(m250.obsessionEligible, undefined);

    const m500 = col.find((m) => m.id === `COL-${family}-500`);
    assert.equal(m500.souvenir, true);
    assert.equal(m500.memoryValence, "positive");
    assert.equal(m500.scoreTrauma, 16);

    const m1000 = col.find((m) => m.id === `COL-${family}-1000`);
    assert.equal(m1000.obsessionEligible, true);
    assert.equal(m1000.obsessionIntensity, 3);
    assert.equal(m1000.souvenir, true);
    assert.equal(m1000.memoryValence, "negative");
    assert.equal(m1000.scoreTrauma, 38);
  }
});

test("MINERAL et CRYSTAL restent séparés malgré knowledge.family=mineral", () => {
  const { window } = makeWindow();
  window.BlueFox3D = {};
  vm.runInContext(source("data/bible-catalog.js"), vm.createContext({ window, console }), {
    filename: "data/bible-catalog.js"
  });
  const catalog = window.BlueFox3D.BibleCatalog;
  const mineral = catalog.find((m) => m.id === "COL-MINERAL-20");
  const crystal = catalog.find((m) => m.id === "COL-CRYSTAL-20");
  assert.equal(mineral.trigger.subject, "mineral");
  assert.deepEqual(Array.from(mineral.trigger.excludeKinds), ["crystal"]);
  assert.equal(crystal.trigger.kind, "crystal");
});


test("les rewards psychologiques transférés restent idempotents dans leur propriétaire canonique", () => {
  const { window, CustomEvent } = makeWindow();
  window.BlueFox3D = {
    ObjectEvents: { types: {}, subscribe: () => null, history: () => [] },
    Missions: {}
  };
  const context = vm.createContext({
    window,
    CustomEvent,
    console,
    performance: { now: () => 1000 },
    Date,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Set,
    Map,
    WeakMap,
    setTimeout: (fn) => { fn(); return 0; },
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {}
  });
  vm.runInContext(source("engine/progression-multisystem.js"), context, {
    filename: "engine/progression-multisystem.js"
  });
  const BF = window.BlueFox3D;
  const reward500 = {
    id: "COL-WOOD-500",
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 16
  };
  assert.equal(BF.completeMissionPsychology(reward500), true);
  assert.equal(BF.completeMissionPsychology(reward500), false);
  const state = BF.getMultiProgressionState();
  assert.equal(state.psychology.missionMemories["COL-WOOD-500"].scoreTrauma, 16);
  assert.equal(state.psychology.missionMemories["COL-WOOD-500"].valence, "positive");
});

test("Top 4 interne, HUD limité aux Top 1/Top 2", () => {
  const behavior = source("engine/behavior-arbitration-integration.js");
  const ui = source("engine/mission-ui-bridge.js");
  assert.equal((behavior.match(/\.slice\(0, 4\)/g) || []).length, 3);
  assert.doesNotMatch(behavior, /\.slice\(0, 3\)/);
  assert.match(ui, /missionMeters\.length < 2/);
  assert.match(ui, /missionMeters\.slice\(0, 2\)/);
  assert.match(ui, /\.startsWith\("COL-"\)[\s\S]*priorityRank/);
});
