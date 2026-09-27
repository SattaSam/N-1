const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const context = { console: { info() {}, warn() {}, error() {} } };
context.window = context;
vm.createContext(context);
const load = (file) => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
load(path.join(root, 'data', 'bible-patterns.js'));
load(path.join(root, 'engine', 'bible-contract-v0-1.js'));
load(path.join(root, 'data', 'bible-catalog.js'));

const BF = context.BlueFox3D;
const byId = (id) => BF.BibleCatalog.find((mission) => mission.id === id);
const ids = ['ARCH-01','ARCH-02','ARCH-03','ARCH-04','ARCH-05','ARCH-06'];

test('ARCH-R1: six missions valides dans le contrat Bible strict', () => {
  for (const id of ids) {
    const mission = byId(id);
    assert.ok(mission, `${id} absent`);
    const report = BF.BibleContractV01.validateMission(mission, BF.BiblePatterns);
    assert.equal(report.ok, true, `${id}: ${(report.errors || []).join(' | ')}`);
  }
});

test('ARCH-R1: chaîne et directions documentaires conservées', () => {
  assert.deepEqual(Array.from(byId('ARCH-01').prerequisites), []);
  assert.equal(byId('ARCH-01').trigger.direction, 'north');
  assert.deepEqual(Array.from(byId('ARCH-02').prerequisites), ['ARCH-01']);
  assert.equal(byId('ARCH-02').trigger.direction, 'north');
  assert.deepEqual(Array.from(byId('ARCH-03').prerequisites), ['ARCH-02']);
  assert.deepEqual(Array.from(byId('ARCH-04').prerequisites), ['ARCH-03']);
  assert.deepEqual(Array.from(byId('ARCH-05').prerequisites), ['ARCH-04']);
  assert.deepEqual(Array.from(byId('ARCH-06').prerequisites), ['ARCH-05']);
  assert.equal(byId('ARCH-06').trigger.direction, 'west');
});

test('ARCH-03: deux stèles physiques distinctes sont garanties et requises', () => {
  const mission = byId('ARCH-03');
  assert.equal(mission.pattern, 'OBSERVE_TARGET');
  assert.equal(mission.slots.study.target, 2);
  assert.equal(mission.slots.study.params.cuoType, 'stele');
  assert.equal(mission.slots.study.params.distinctBy, 'instanceId');
  const guarantee = mission.mapGeneration.requiredObjects.find((entry) => entry.type === 'stele');
  assert.ok(guarantee, 'garantie stele absente');
  assert.ok(guarantee.count >= 2, 'moins de deux stèles garanties');
  assert.equal(mission.mapGeneration.requiredMicroScenes[0].id, 'MSC-CUSTOM-WORKED-STONE-BLOCK');
});

test('ARCH-04: observation puis collecte obligatoire de la même instance relay_block', () => {
  const mission = byId('ARCH-04');
  assert.equal(mission.pattern, 'SEQUENCE_ACTIONS');
  assert.equal(mission.mapGeneration.requiredMicroScenes[0].id, 'MSC-CUSTOM-COMPOSANT-RUIN');
  assert.equal(mission.sequence.length, 2);
  const [observe, collect] = mission.sequence;
  assert.equal(observe.slot, 'observeComponent');
  assert.equal(observe.action, 'observe');
  assert.equal(observe.params.cuoType, 'relay_block');
  assert.equal(collect.slot, 'collectComponent');
  assert.equal(collect.action, 'collect');
  assert.deepEqual(Array.from(collect.requires), ['observeComponent']);
  assert.equal(collect.params.cuoType, 'relay_block');
  assert.equal(collect.params.relation.fromSlot, 'observeComponent');
  assert.deepEqual(Array.from(collect.params.relation.sameBy), ['instanceId']);
});
