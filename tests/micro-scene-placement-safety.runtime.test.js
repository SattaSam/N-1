const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = process.env.BLUEFOX_TEST_ROOT
  ? path.resolve(process.env.BLUEFOX_TEST_ROOT)
  : path.resolve(__dirname, '..');

function runtimeHarness({bounds = 40, colliders = []} = {}) {
  const BF = {
    Missions: {ActionType: {}, MissionStatus: {}},
    BiblePatterns: {}, BibleCatalog: [], BibleExperiments: [],
    BibleContractV01: {validateCatalog(){ return {ok: true, errors: [], warnings: []}; }},
    registerMissionDefinitions(){ return 0; },
    MicroScenes: {get(id){ return id === 'MSC-TEST' ? {id, radius: 2} : null; }},
    currentEngine: {
      currentMapId: 'test-map', currentMap: {bounds, colliders},
      character: {root: {position: {x: 0, y: 0, z: 0}}}
    }
  };
  const window = {
    BlueFox3D: BF,
    localStorage: {getItem(){ return null; }, setItem(){}, removeItem(){}},
    addEventListener(){}, removeEventListener(){}, dispatchEvent(){},
    setTimeout(){ return 1; }, clearTimeout(){}, queueMicrotask(){}
  };
  const context = vm.createContext({window, console: {info(){}, warn(){}, error(){}},
    performance: {now: () => 0}, Date, Set, Map, WeakMap,
    CustomEvent: function(type, init){ this.type = type; this.detail = init?.detail; },
    Math, Object, Array, JSON, Promise});
  let source = fs.readFileSync(path.join(ROOT, 'engine/bible-runtime-v0-1-unified.js'), 'utf8');
  source = source.replace(/\n\s*runtime\.start\(\);\n\}\)\(window\);\s*$/, '\n})(window);');
  vm.runInContext(source, context);
  return {runtime: new BF.BibleRuntimeV01(), engine: BF.currentEngine};
}

function normalCandidates(key = 'MSC-TEST') {
  const baseAngle = ((key.length * 47) % 360) * Math.PI / 180;
  const result = [];
  for (const radius of [7, 10, 13]) {
    for (let index = 0; index < 8; index += 1) {
      const angle = baseAngle + index * Math.PI / 4;
      result.push({anchor: {x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius},
        rotation: [0, angle + Math.PI, 0]});
    }
  }
  return result;
}

test('placement libre: le premier candidat historique reste inchangé', () => {
  const h = runtimeHarness();
  const expected = normalCandidates()[0];
  const actual = h.runtime.autonomousMicroScenePlacement({microSceneId: 'MSC-TEST'}, h.engine);
  assert.equal(actual.anchor.x, expected.anchor.x);
  assert.equal(actual.anchor.z, expected.anchor.z);
  assert.deepEqual(Array.from(actual.rotation), expected.rotation);
  assert.equal(h.runtime.microScenePlacementValid('MSC-TEST', actual, h.engine), true);
});

test('24 positions bloquées: le fallback étendu ne retourne qu une position valide', () => {
  const colliders = normalCandidates().map((candidate) => ({position: {...candidate.anchor}, radius: 0}));
  const h = runtimeHarness({colliders});
  const actual = h.runtime.autonomousMicroScenePlacement({microSceneId: 'MSC-TEST'}, h.engine);
  assert.ok(actual);
  assert.equal(h.runtime.microScenePlacementValid('MSC-TEST', actual, h.engine), true);
  assert.ok(!normalCandidates().some((candidate) =>
    Math.abs(candidate.anchor.x - actual.anchor.x) < 1e-9 &&
    Math.abs(candidate.anchor.z - actual.anchor.z) < 1e-9));
});

test('saturation réelle: aucun placement invalide n est inventé', () => {
  const h = runtimeHarness({colliders: [{position: {x: 0, y: 0, z: 0}, radius: 1000}]});
  assert.equal(h.runtime.autonomousMicroScenePlacement({microSceneId: 'MSC-TEST'}, h.engine), null);
});

test('tout résultat non nul respecte les limites et le validateur canonique', () => {
  const bounds = 12;
  const colliders = normalCandidates()
    .filter(({anchor}) => Math.abs(anchor.x) <= 10 && Math.abs(anchor.z) <= 10)
    .map((candidate) => ({position: {...candidate.anchor}, radius: 0}));
  const h = runtimeHarness({bounds, colliders});
  const actual = h.runtime.autonomousMicroScenePlacement({microSceneId: 'MSC-TEST'}, h.engine);
  if (actual) {
    assert.ok(Math.abs(actual.anchor.x) <= 10);
    assert.ok(Math.abs(actual.anchor.z) <= 10);
    assert.equal(h.runtime.microScenePlacementValid('MSC-TEST', actual, h.engine), true);
  }
});

test('la balise autonome ne consomme rien lorsque le placement sûr renvoie null', () => {
  let consumed = 0;
  const BF = {
    currentEngine: {currentMapId: 'test-map', currentMap: {}, callbacks: {onStatus(){}}},
    maps: {'test-map': {}}, availableInventory(){ return 1; },
    consumeInventoryPool(){ consumed += 1; return 1; },
    MicroScenePlacement: {suggest(){ return null; }}
  };
  const window = {BlueFox3D: BF,
    localStorage: {getItem(){ return null; }, setItem(){}},
    addEventListener(){}, dispatchEvent(){}, setInterval(){ return 1; }};
  const context = vm.createContext({window, Date, Set, Map, WeakMap, Math, JSON,
    CustomEvent: function(type, init){ this.type = type; this.detail = init?.detail; }, console});
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine/special-object-runtime.js'), 'utf8'), context);
  assert.equal(BF.SpecialObjectRuntime.deployBeacon({source: 'autonomy'}), false);
  assert.equal(consumed, 0);
});
