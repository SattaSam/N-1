const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const root = path.resolve(__dirname, '..');
const window = {
  BlueFox3D: {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  document: null,
  performance: { now: () => 0 },
  CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init?.detail; }
};
window.window = window;
window.BlueFox3D.BiblePatterns = { SEQUENCE_ACTIONS: { autonomyAxis: 'research' } };
const context = vm.createContext({ window, console, performance: window.performance, CustomEvent: window.CustomEvent, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout });

vm.runInContext(fs.readFileSync(path.join(root, 'data/bible-catalog.js'), 'utf8'), context, { filename: 'bible-catalog.js' });
const catalog = window.BlueFox3D.BibleCatalog;
const byId = new Map(catalog.map(m => [m.id, m]));
const ids = ['ANN-04','ANN-06','ANN-03','ANN-02','ANN-05','ANN-01','ANN-07'];
for (const id of ids) assert(byId.has(id), `${id} absent du catalogue`);

assert.deepStrictEqual(Array.from(byId.get('ANN-04').prerequisites), ['T13']);
assert.strictEqual(byId.get('ANN-06').siteDistanceGate.minimumExclusive, 10);
assert.strictEqual(byId.get('ANN-06').targetMapFact, 'bibleActivation:ANN-06');
assert.strictEqual(byId.get('ANN-06').targetMapField, 'mapId');
assert.deepStrictEqual(Array.from(byId.get('ANN-06').sequence.find(s => s.slot === 'fiber').requires), []);
assert.strictEqual(byId.get('ANN-06').effects.find(e => e.type === 'site.establish').microSceneId, 'MSC-CUSTOM-SMART-CAMP');
assert.strictEqual(byId.get('ANN-06').effects.find(e => e.type === 'site.establish').kind, 'camp');
assert.strictEqual(byId.get('ANN-06').activationSource, 'player');
assert.strictEqual(byId.get('ANN-02').sequence.find(s => s.slot === 'collect').target, 25);
assert.strictEqual(byId.get('ANN-02').sequence.find(s => s.slot === 'experiment').action, 'research');
assert.deepStrictEqual(Array.from(byId.get('ANN-02').sequence.find(s => s.slot === 'experiment').requires), ['collect']);
assert.deepStrictEqual(Array.from(byId.get('ANN-05').sequence.filter(s => ['basalt','magnetic','crystal'].includes(s.slot)).map(s => s.target)), [4,4,4]);
for (const slot of ['basalt','magnetic','crystal']) assert.deepStrictEqual(Array.from(byId.get('ANN-05').sequence.find(s => s.slot === slot).requires), ['analyze']);
assert.deepStrictEqual(Array.from(byId.get('ANN-05').sequence.find(s => s.slot === 'experiment').requires), ['basalt','magnetic','crystal']);

const ann02Consumes = byId.get('ANN-02').effects.filter(e => e.type === 'inventory.consume');
assert.strictEqual(ann02Consumes[0].inventoryKey, 'biocapital');
assert.deepStrictEqual(Array.from(ann02Consumes[1].inventoryKeys), ['magnetic_ore','azure_ferrite','resonant_basalt','stellar_iridium']);
assert.strictEqual(ann02Consumes[1].quantity, 2);
const ann05Consumes = byId.get('ANN-05').effects.filter(e => e.type === 'inventory.consume');
assert.deepStrictEqual(Array.from(ann05Consumes.map(e => [e.inventoryKey,e.quantity])), [['resonant_basalt',4],['magnetic_ore',4],['crystal',4]]);
assert.deepStrictEqual(Array.from(byId.get('ANN-01').sequence.slice(0,3).map(s => s.target)), [10,25,60]);
assert(!JSON.stringify(byId.get('ANN-01')).includes('44'), 'ANN-01 conserve une valeur 44 interdite');
assert.strictEqual(byId.get('ANN-07').runtimeCounters[0].baselineOnActivation, false);
assert.strictEqual(byId.get('ANN-07').runtimeCounters[0].source, 'observations.historical');
assert.strictEqual(byId.get('ANN-07').runtimeCounters[0].cuoType, 'nocturnal_animal');
assert.strictEqual(byId.get('ANN-07').sequence.find(s => s.slot === 'fallbackTravel').params.mapGenerationOnCount[3].requiredMicroScenes[0].id, 'MSC-NOCTURNAL-DEN-001');
assert.strictEqual(byId.get('ANN-07').narrative.completed[1].route, 'journal');

const customSource = fs.readFileSync(path.join(root, 'data/custom-micro-scenes.js'), 'utf8');
const customContext = vm.createContext({ window: {} });
vm.runInContext(customSource, customContext, { filename: 'custom-micro-scenes.js' });
const smart = customContext.window.BlueFoxCustomMicroScenes.filter(s => s.id === 'MSC-CUSTOM-SMART-CAMP');
assert.strictEqual(smart.length, 1, 'SMART-CAMP doit être enregistré exactement une fois');
assert(smart[0].objects.some(o => o.type === 'base_fire'));
assert(smart[0].objects.some(o => o.type === 'toile'));

const smartAsset = JSON.parse(fs.readFileSync(path.join(root, 'assets/MSC_saves/MSC-CUSTOM-SMART-CAMP.json'), 'utf8'));
assert.deepStrictEqual(JSON.parse(JSON.stringify(smart[0])), smartAsset, 'Le registre SMART-CAMP doit reproduire exactement l’asset fourni');

let runtimeSource = fs.readFileSync(path.join(root, 'engine/bible-runtime-v0-1-unified.js'), 'utf8');
runtimeSource = runtimeSource.replace(/\n\s*runtime\.start\(\);\n\}\)\(window\);\s*$/, '\n})(window);');
const topology = { coordinateOf(id) { return ({ crystal:{x:0,y:0}, outpost:{x:20,y:0}, near:{x:10,y:0}, far:{x:11,y:0}, multiNear:{x:30,y:0}, multiFar:{x:32,y:0} })[id] || null; } };
window.BlueFox3D.currentEngine = {
  worldTopology: topology,
  missionManager: {
    memory: {
      state: {
        siteProgression: {
          crystal: { sites: { camp: { kind: 'camp' } } }
        }
      }
    }
  }
};
window.BlueFox3D.ObjectLibrary = { list: () => [
  { id:'FAU-NOCT-S-001', type:'nocturnal_animal', category:'fauna' },
  { id:'FAU-DIUR-S-001', type:'diurnal_animal', category:'fauna' }
] };
window.BlueFox3D.ObjectEvents = { types: { OBJECT_SEEN:'OBJECT_SEEN' } };
window.BlueFox3D.getProgressionState = () => ({ counters:{ global:{ 'OBJECT_SEEN:object:FAU-NOCT-S-001':1, 'OBJECT_SEEN:object:FAU-DIUR-S-001':8 } } });
vm.runInContext(runtimeSource, context, { filename: 'bible-runtime-v0-1-unified.js' });
const runtime = window.BlueFox3D.bibleRuntime;
assert.strictEqual(runtime.siteDistanceGateSatisfied(byId.get('ANN-06'), 'near'), false, '10 maps ne suffit pas : la règle est >10');
assert.strictEqual(runtime.siteDistanceGateSatisfied(byId.get('ANN-06'), 'far'), true, '11 maps doit satisfaire la règle >10');
window.BlueFox3D.currentEngine.missionManager.memory.state.siteProgression.outpost = { sites: { refuge: { kind:'refuge' } } };
assert.strictEqual(runtime.siteDistanceGateSatisfied(byId.get('ANN-06'), 'multiNear'), false, 'la distance doit être mesurée par rapport à l’infrastructure la plus proche');
assert.strictEqual(runtime.siteDistanceGateSatisfied(byId.get('ANN-06'), 'multiFar'), true, 'une position >10 de toutes les infrastructures doit être acceptée');
assert.strictEqual(runtime.runtimeCounterValue('observations.historical', {cuoType:'nocturnal_animal'}), 1, 'ANN-07 doit lire l’historique canonique de nocturnal_animal');
for (const id of ids) assert(runtime.compileMission(byId.get(id)), `${id} ne compile pas`);

console.log('ANN IMI contract: PASS');
