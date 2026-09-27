const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const IDS = [
  'MSC-CUSTOM-AFTER-TEMPEST',
  'MSC-CUSTOM-AFTER-STORM',
  'MSC-CUSTOM-BLUE-ROOTS',
  'MSC-CUSTOM-MANGROVE-COMP',
  'MSC-CUSTOM-CASCADE',
  'MSC-CUSTOM-NATURAL-ARCH',
  'MSC-CUSTOM-MAGNET-ROCK-TREE',
  'MSC-CUSTOM-ARCH-BLUE'
];

test('R1 données: les 8 nouvelles MSC sont des CUSTOM décoratives valides', () => {
  for (const id of IDS) {
    const data = JSON.parse(read(`assets/MSC_saves/${id}.json`));
    assert.equal(data.id, id);
    assert.equal(data.rarity, 'custom');
    assert.deepEqual(data.biomes, ['all']);
    assert.ok(Array.isArray(data.objects) && data.objects.length > 0, id);
    assert.notEqual(data.missionOnly, true, `${id} ne doit pas être missionOnly`);
  }
});

test('R1 registre: extension idempotente et chargée avant MicroScenes', () => {
  const context = { window: null, console, Math, Object, Array, Set, Map, String, Number };
  context.window = context;
  vm.createContext(context);
  const extension = read('data/custom-micro-scenes-remarkable-r1.js');
  vm.runInContext(extension, context, { filename: 'custom-micro-scenes-remarkable-r1.js' });
  vm.runInContext(extension, context, { filename: 'custom-micro-scenes-remarkable-r1.js#2' });
  assert.equal(context.BlueFoxCustomMicroScenes.length, IDS.length);
  assert.equal(new Set(context.BlueFoxCustomMicroScenes.map(scene => scene.id)).size, IDS.length);

  const html = read('index.html');
  const extIndex = html.indexOf('./data/custom-micro-scenes-remarkable-r1.js');
  const microIndex = html.indexOf('./engine/micro-scenes.js');
  assert.ok(extIndex >= 0 && microIndex > extIndex, 'extension CUSTOM avant MicroScenes');
});

test('R1 runtime MicroScenes: les 8 scènes deviennent remarquables libres', () => {
  const context = { window: null, console, Math, Object, Array, Set, Map, String, Number };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('data/custom-micro-scenes-remarkable-r1.js'), context, { filename: 'custom-micro-scenes-remarkable-r1.js' });
  vm.runInContext(read('engine/micro-scenes.js'), context, { filename: 'micro-scenes.js' });
  for (const id of IDS) {
    const scene = context.BlueFox3D.MicroScenes.get(id);
    assert.ok(scene, `${id} absent du runtime`);
    assert.equal(scene.custom, true, `${id} custom`);
    assert.equal(scene.rarity, 'custom', `${id} rarity`);
    assert.equal(scene.missionOnly, false, `${id} libre`);
    assert.ok(scene.objects.length > 0, `${id} objets`);
    assert.equal(context.BlueFox3D.MicroScenes.plan(id).length, scene.objects.length, `${id} plan runtime`);
  }
});

test('R1 cadence: remarquable toutes les 4 à 5 nouvelles maps', () => {
  const context = { window: null, console, Math, Object, Array, Set, Map, String, Number };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('engine/map-generation-rules.js'), context, { filename: 'map-generation-rules.js' });
  const rules = context.BlueFox3D.MapGenerationRules;
  assert.equal(rules.discoveryCadence.remarkableSceneInterval.min, 4);
  assert.equal(rules.discoveryCadence.remarkableSceneInterval.max, 5);
  assert.deepEqual(Array.from(rules.plateauWeights, e => [e.value, e.weight]), [[1,20],[2,20],[3,20],[4,20],[5,0],[6,20]]);
  assert.equal(rules.validate().valid, true);
});

