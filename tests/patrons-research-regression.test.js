
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");

function createWindow({ legacyRecipeUnlocked = false } = {}) {
  const storage = new Map();
  storage.set(
    "bluefox_personal_consumables_v1",
    JSON.stringify({
      version: 1,
      rations: 2,
      recipeUnlocked: legacyRecipeUnlocked,
      craftedTotal: 0,
      consumedTotal: 0
    })
  );

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
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent(event) {
      for (const fn of [...(listeners.get(event.type) || [])]) fn(event);
      return true;
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  };

  const inventory = {
    fiber: 4,
    adaptive_biomass: 2
  };
  let rations = 0;
  const definitions = {};

  const memory = {
    state: {
      missionLifecycle: {},
      siteProgression: {},
      researchUnlocks: {}
    },
    save() { return true; },
    hasEffectReceipt() { return false; },
    recordEffectReceipt() { return true; }
  };

  function MissionManager() {}
  MissionManager.prototype = {};

  window.BlueFox3D = {
    BiblePatterns: {
      COLLECT_THEN_REWARD: {
        autonomyAxis: "survival",
        steps: [{ slot: "collect", action: "collect" }]
      },
      SEQUENCE_ACTIONS: {
        autonomyAxis: "research",
        dynamicSequence: true,
        minSteps: 2
      }
    },
    BibleContractV01: {
      validateCatalog() {
        return { ok: true, errors: [], warnings: [] };
      }
    },
    Missions: {
      MissionManager,
      ActionType: {
        COLLECT: "collect",
        OBSERVE: "observe",
        INSPECT: "inspect",
        ANALYZE: "analyze",
        TRAVEL: "travel"
      },
      normalizeActionType(value) {
        return String(value || "").trim().toLowerCase();
      },
      getDefinition(id) {
        return definitions[id] || null;
      }
    },
    registerMissionDefinitions(list) {
      list.forEach((entry) => {
        definitions[entry.id] = entry;
      });
      return list.length;
    },
    ObjectEvents: {
      subscribe() {
        return () => {};
      }
    },
    currentEngine: {
      currentMapId: "crystal",
      currentZoneIndex: 0,
      missionManager: {
        memory,
        trees: new Map()
      },
      character: {
        root: {
          position: { x: 0, z: 0 }
        }
      }
    },
    progression: {
      availableInventory(keys) {
        return keys.reduce((sum, key) => sum + (inventory[key] || 0), 0);
      },
      addInventory(key, amount) {
        inventory[key] = (inventory[key] || 0) + amount;
      },
      save() { return true; },
      publishChange() {}
    },
    consumeInventoryPool(keys, amount) {
      const key = keys[0];
      if ((inventory[key] || 0) < amount) return 0;
      inventory[key] -= amount;
      return amount;
    },
    canAccessCampInventory() {
      return true;
    },
    Rations: {
      add(amount) {
        rations += amount;
        return amount;
      }
    },
    getMissionState() {
      return { missions: [] };
    },
    addJournalEntry() {}
  };

  return {
    window,
    memory,
    inventory,
    getRations: () => rations
  };
}

function loadRuntime(options = {}) {
  const fixture = createWindow(options);
  const { window } = fixture;
  const context = vm.createContext({
    window,
    console,
    performance,
    CustomEvent: window.CustomEvent,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  });

  vm.runInContext(
    fs.readFileSync("data/bible-catalog.js", "utf8"),
    context
  );
  vm.runInContext(
    fs.readFileSync("engine/bible-runtime-v0-1-unified.js", "utf8"),
    context
  );

  return fixture;
}


function loadContract() {
  const fixture = createWindow();
  const { window } = fixture;
  const context = vm.createContext({
    window,
    console,
    performance,
    CustomEvent: window.CustomEvent,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  });
  vm.runInContext(
    fs.readFileSync("engine/bible-contract-v0-1.js", "utf8"),
    context
  );
  return fixture;
}

test("index charge explicitement les quatre bridges de patrons", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const objectM0 = html.indexOf("object-m0-bridge.js");
  const names = [
    "explore-scope-bridge.js",
    "sequence-actions-bridge.js",
    "context-msc-bridge.js",
    "travel-cycle-bridge.js"
  ];
  for (const name of names) {
    const at = html.indexOf(name);
    assert.ok(at > objectM0, `${name} doit être chargé après object-m0`);
    assert.equal(html.indexOf(name, at + 1), -1, `${name} ne doit être chargé qu'une fois`);
  }
});



test("le catalogue Bible complet passe directement le contrat canonique strict", () => {
  const window = { BlueFox3D: {} };
  const context = vm.createContext({
    window,
    console,
    performance,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  });

  for (const file of [
    "engine/mission-types.js",
    "engine/bible-contract-v0-1.js",
    "data/bible-patterns.js",
    "data/bible-catalog.js"
  ]) {
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  }

  const BF = window.BlueFox3D;
  const report = BF.BibleContractV01.validateCatalog(
    BF.BibleCatalog,
    BF.BiblePatterns,
    { compatibility: "strict" }
  );

  assert.equal(report.ok, true, report.errors.join("\n"));
});

test("BibleContract distingue les patrons à slots des séquences dynamiques", () => {
  const { window } = loadContract();
  const BF = window.BlueFox3D;

  const sequenceMission = {
    id: "SEQ-CONTRACT",
    title: "Séquence",
    pattern: "SEQUENCE_ACTIONS",
    trigger: { type: "manual" },
    sequence: [
      { slot: "a", action: "observe", target: 1 },
      { slot: "b", action: "analyze", target: 1, requires: ["a"] }
    ]
  };
  const sequenceReport = BF.BibleContractV01.validateMission(
    sequenceMission,
    BF.BiblePatterns
  );
  assert.equal(sequenceReport.ok, true, sequenceReport.errors.join("\n"));

  const staticReport = BF.BibleContractV01.validateMission({
    id: "STATIC-CONTRACT",
    title: "Statique",
    pattern: "COLLECT_THEN_REWARD",
    trigger: { type: "manual" }
  }, BF.BiblePatterns);
  assert.equal(staticReport.ok, false);
  assert.ok(staticReport.errors.some((message) =>
    message.includes("slots : objet requis")
  ));

  const constructionReport = BF.BibleContractV01.validateMission({
    id: "CAMP@TEST",
    title: "Camp test",
    pattern: "SEQUENCE_ACTIONS",
    constructionMission: true,
    trigger: { type: "manual" },
    sequence: [
      { slot: "collectWood", action: "collect", target: 10 }
    ]
  }, BF.BiblePatterns);
  assert.equal(
    constructionReport.ok,
    true,
    constructionReport.errors.join("\n")
  );
});

test("BibleContract rejette les séquences dynamiques structurellement invalides", () => {
  const { window } = loadContract();
  const BF = window.BlueFox3D;
  const validate = (sequence) => BF.BibleContractV01.validateMission({
    id: "SEQ-BAD",
    title: "Séquence invalide",
    pattern: "SEQUENCE_ACTIONS",
    trigger: { type: "manual" },
    sequence
  }, BF.BiblePatterns);

  assert.equal(validate([{ slot: "a", action: "observe" }]).ok, false);
  assert.equal(validate([
    { slot: "a", action: "observe" },
    { slot: "a", action: "analyze" }
  ]).ok, false);
  assert.equal(validate([
    { slot: "a", action: "observe" },
    { slot: "b", action: "inconnue" }
  ]).ok, false);
  assert.equal(validate([
    { slot: "a", action: "observe" },
    { slot: "b", action: "analyze", target: 0 }
  ]).ok, false);
  assert.equal(validate([
    { slot: "a", action: "observe" },
    { slot: "b", action: "analyze", requires: ["missing"] }
  ]).ok, false);
});

test("le runtime ne masque plus les erreurs slots de SEQUENCE_ACTIONS", () => {
  const source = fs.readFileSync(
    "engine/bible-runtime-v0-1-unified.js",
    "utf8"
  );
  const start = source.indexOf("    validate() {");
  const end = source.indexOf("    compileMission(mission) {", start);
  const validateSource = source.slice(start, end);

  assert.equal(validateSource.includes("message.startsWith"), false);
  assert.equal(validateSource.includes("sequenceMissions"), false);
  assert.match(validateSource, /BibleContractV01\.validateCatalog/);
});

test("sequence-actions-bridge conserve sameTarget sans réécrire contrat ni compilateur", () => {
  const source = fs.readFileSync("engine/sequence-actions-bridge.js", "utf8");

  assert.match(source, /sequenceTarget:/);
  assert.match(source, /installEventBinding/);
  assert.match(source, /installActionTargeting/);
  assert.equal(source.includes("installContractExtension"), false);
  assert.equal(source.includes("validateSequenceMission"), false);
  assert.match(source, /BF\.compileSequenceMission\s*=\s*\(mission\)/);
  assert.equal(source.includes("Runtime.prototype.compileMission"), false);
});

test("T11 compile les deux ingrédients actuels de la ration dans SEQUENCE_ACTIONS", () => {
  const { window } = loadRuntime();
  const mission = window.BlueFox3D.BibleCatalog.find((entry) => entry.id === "T11");
  const compiled = window.BlueFox3D.bibleRuntime.compileMission(mission);

  assert.ok(compiled);
  assert.equal(compiled.root.children.length, 4);
  const fibers = compiled.root.children.find((node) => node.id === "T11:fibers");
  const adaptive = compiled.root.children.find((node) => node.id === "T11:adaptiveBiomass");
  const returnHome = compiled.root.children.find((node) => node.id === "T11:returnHome");
  assert.equal(fibers.target, 2);
  assert.equal(fibers.params.kind, "fiber");
  assert.equal(adaptive.target, 1);
  assert.equal(adaptive.params.kind, "adaptive_biomass");
  assert.deepEqual(JSON.parse(JSON.stringify(returnHome.requires)).sort(), ["T11:adaptiveBiomass", "T11:fibers"].sort());
});


test("SEQUENCE_ACTIONS est compilé par le runtime canonique avant le bridge", () => {
  const { window } = loadRuntime();
  const BF = window.BlueFox3D;
  BF.BiblePatterns.SEQUENCE_ACTIONS = {
    autonomyAxis: "research",
    dynamicSequence: true
  };

  const mission = {
    id: "SEQ-TEST",
    title: "Séquence test",
    pattern: "SEQUENCE_ACTIONS",
    sequence: [
      { slot: "observe", action: "observe" },
      { slot: "analyze", action: "analyze" }
    ]
  };

  const compiled = BF.bibleRuntime.compileMission(mission);
  assert.ok(compiled);
  assert.equal(compiled.root.children.length, 2);
  assert.deepEqual(
    JSON.parse(JSON.stringify(compiled.root.children[1].requires)),
    ["SEQ-TEST:observe"]
  );
  assert.equal(
    BF.BibleRuntimeV01.prototype.__sequenceActionsCompilerV1,
    true
  );
});

test("la recette récente n'existe que dans la Bible parmi les modules modifiés", () => {
  const bible = fs.readFileSync("data/bible-catalog.js", "utf8");
  assert.match(bible, /inventoryKey:\s*"fiber"/);
  assert.match(bible, /inventoryKey:\s*"adaptive_biomass"/);

  for (const path of [
    "engine/survival-rations-v0-3.js",
    "engine/survival-ai-bridge.js",
    "engine/survival-rations-ai-v0-3.js"
  ]) {
    const source = fs.readFileSync(path, "utf8");
    assert.equal(source.includes("adaptive_biomass"), false, path);
    assert.equal(source.includes("fiber: 2"), false, path);
    assert.equal(source.includes("totalPlants"), false, path);
    assert.equal(source.includes("minimumDistinctPlantTypes"), false, path);
  }
});

test("une mission terminée débloque la recette puis Research la fabrique", () => {
  const fixture = loadRuntime();
  const BF = fixture.window.BlueFox3D;
  const mission = BF.BibleCatalog.find((entry) => entry.id === "T11");

  assert.ok(mission);
  assert.equal(BF.Research.isUnlocked("ration-basic-v2"), false);

  fixture.memory.state.missionLifecycle[mission.id] = {
    status: "completed"
  };
  BF.bibleRuntime.onMissionState({ missions: [] });

  assert.equal(BF.Research.isUnlocked("ration-basic-v2"), true);
  assert.equal(BF.Research.canCraft("ration-basic-v2", 1), true);

  const crafted = BF.Research.craft("ration-basic-v2", 1);
  assert.equal(crafted, 1);
  assert.equal(fixture.inventory.fiber, 2);
  assert.equal(fixture.inventory.adaptive_biomass, 1);
  assert.equal(fixture.getRations(), 1);
});

test("la migration legacy ne débloque que si l'ancienne recette était réellement apprise", () => {
  const locked = loadRuntime({ legacyRecipeUnlocked: false });
  locked.window.BlueFox3D.bibleRuntime.onMissionState({ missions: [] });
  assert.equal(
    locked.window.BlueFox3D.Research.isUnlocked("ration-basic-v2"),
    false
  );

  const unlocked = loadRuntime({ legacyRecipeUnlocked: true });
  unlocked.window.BlueFox3D.bibleRuntime.onMissionState({ missions: [] });
  assert.equal(
    unlocked.window.BlueFox3D.Research.isUnlocked("ration-basic-v2"),
    true
  );
});

test("les règles projet imposent le SHA du dernier commit comme base", () => {
  const rules = fs.readFileSync("00_AI_PROJECT_RULES.md", "utf8");
  assert.match(rules, /SHA du dernier commit fourni par l'utilisateur est la source de vérité/);
  assert.match(rules, /Git blob SHA est vérifié identique/);
  assert.match(rules, /ne doit jamais réinjecter une version antérieure/);
});


test("les surcouches V19 prouvees obsoletes ne sont plus chargees", () => {
  const index = fs.readFileSync("index.html", "utf8");
  for (const legacy of [
    "bible-exploration-patterns-v19.js",
    "bible-exploration-missions-v19.js",
    "bible-catalog-cleanfix-v19-3.js",
    "bible-runtime-trigger-fix-v19.js",
    "bible-exploration-runtime-v19.js"
  ]) assert.equal(index.includes(legacy), false, legacy);

  // Les couches encore utiles restent volontairement en place.
  for (const retained of [
    "mission-manager-bible-fix-v19.js",
    "mission-runtime-integration-v19-7.js",
    "mission-target-arbitration-v19-12.js",
    "bible-exploration-world-v19.js",
    "bible-map-prescription-v19.js"
  ]) assert.equal(index.includes(retained), true, retained);
});

test("triggerOnly est absorbe dans le runtime canonique", () => {
  const source = fs.readFileSync("engine/bible-runtime-v0-1-unified.js", "utf8");
  assert.match(source, /mission\.triggerOnly === true/);
  assert.match(source, /setFact\?\.\(`bibleTarget:\$\{mission\.id\}`, null\)/);
});
