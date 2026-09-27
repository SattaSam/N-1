
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const context = { console: { info(){}, warn(){}, error(){} } };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'data','bible-catalog.js'),'utf8'), context);
const byId = (id) => context.BlueFox3D.BibleCatalog.find((m) => m.id === id);

test('ARCH-R2: six missions presentes et chaine ARCH-07→12 conservee', () => {
  const ids = ['ARCH-07','ARCH-08','ARCH-09','ARCH-10','ARCH-11','ARCH-12'];
  for (const id of ids) assert.ok(byId(id), `${id} absent`);
  assert.deepEqual(Array.from(byId('ARCH-07').prerequisites), ['ARCH-06']);
  assert.deepEqual(Array.from(byId('ARCH-08').prerequisites), ['ARCH-07']);
  assert.deepEqual(Array.from(byId('ARCH-09').prerequisites), ['ARCH-08']);
  assert.deepEqual(Array.from(byId('ARCH-10').prerequisites), ['ARCH-09']);
  assert.deepEqual(Array.from(byId('ARCH-11').prerequisites), ['ARCH-10']);
  assert.deepEqual(Array.from(byId('ARCH-12').prerequisites), ['ARCH-11']);
});

test('ARCH-07: cinq elements distincts de la MSC puis 60% de la map liee', () => {
  const m = byId('ARCH-07');
  assert.equal(m.bindActivationMap, true);
  assert.equal(m.mapGeneration.requiredMicroScenes[0].id, 'MSC-CUSTOM-RUINE-MODULAIRE1');
  const [elements, coverage] = m.sequence;
  assert.equal(elements.action, 'observe');
  assert.equal(elements.target, 5);
  assert.equal(elements.params.microSceneId, 'MSC-CUSTOM-RUINE-MODULAIRE1');
  assert.equal(elements.params.distinctBy, 'instanceId');
  assert.equal(elements.params.requiredMapFact, 'bibleActivation:ARCH-07');
  assert.equal(coverage.action, 'explore-zone');
  assert.equal(coverage.target, 60);
  assert.equal(coverage.params.metric, 'surfacePercent');
  assert.equal(coverage.params.threshold, 60);
  assert.equal(coverage.params.requiredMapFact, 'bibleActivation:ARCH-07');
});

test('ARCH-08: trois sites distincts prescrits a Est, relation finale narrative', () => {
  const m = byId('ARCH-08');
  assert.equal(m.trigger.direction, 'east');
  assert.equal(m.pattern, 'CONTEXT_MSC');
  assert.equal(m.slots.context.target, 3);
  assert.equal(m.slots.context.params.anyMicroScene, true);
  assert.equal(m.slots.context.params.contextRole, 'archRegionalSite');
  assert.equal(m.slots.context.params.distinctBy, 'microSceneId');
  assert.deepEqual(
    Array.from(m.mapGeneration.requiredMicroScenes, x => x.id),
    ['MSC-CUSTOM-RUINE-MODULAIRE1','MSC-CUSTOM-RUINE-MODULAIRE2','MSC-CUSTOM-SANCTUAIRE-RING']
  );
});

test('ARCH-09: 3 arches distinctes + 3 steles distinctes, sans SAME-INSTANCE inter-categories', () => {
  const m = byId('ARCH-09');
  const [arches, steles] = m.sequence;
  assert.equal(arches.params.cuoType, 'arch');
  assert.equal(arches.target, 3);
  assert.equal(arches.params.distinctBy, 'instanceId');
  assert.equal(steles.params.cuoType, 'stele');
  assert.equal(steles.target, 3);
  assert.equal(steles.params.distinctBy, 'instanceId');
  assert.equal(arches.params.microSceneId, 'MSC-CUSTOM-SANCTUAIRE-RING');
  assert.equal(steles.params.microSceneId, 'MSC-CUSTOM-SANCTUAIRE-RING');
  assert.equal(steles.params.relation, undefined);
});

test('ARCH-10: une observation reelle dans RUINE-MODULAIRE2, chronologie narrative', () => {
  const m = byId('ARCH-10');
  assert.equal(m.pattern, 'OBSERVE_TARGET');
  assert.equal(m.slots.study.target, 1);
  assert.equal(m.slots.study.params.cuoType, 'debris');
  assert.equal(m.slots.study.params.microSceneId, 'MSC-CUSTOM-RUINE-MODULAIRE2');
  assert.equal(m.slots.study.params.requiredMapFact, 'bibleActivation:ARCH-08');
});

test('ARCH-11: nouvelle map + carriere + minerai garanti puis collecte, sans SAME-INSTANCE impose', () => {
  const m = byId('ARCH-11');
  assert.equal(m.trigger.type, 'progression.mission_completed');
  assert.equal(m.trigger.missionId, 'ARCH-10');
  assert.equal(m.navigation.autonomousUnknownTravel, true);
  assert.equal(m.mapGeneration.requiredMicroScenes[0].id, 'MSC-CUSTOM-CARRIERE');
  const ore = m.mapGeneration.requiredObjects.find(x => x.type === 'magnetic_ore');
  assert.ok(ore);
  assert.ok(ore.count >= 1);
  const [travel, quarry, sample] = m.sequence;
  assert.equal(travel.action, 'travel');
  assert.equal(travel.params.newOnly, true);
  assert.equal(quarry.action, 'observe');
  assert.equal(quarry.params.cuoType, 'strong_rock');
  assert.equal(quarry.params.microSceneId, 'MSC-CUSTOM-CARRIERE');
  assert.equal(sample.action, 'collect');
  assert.equal(sample.params.cuoType, 'magnetic_ore');
  assert.equal(sample.params.relation, undefined);
});

test('ARCH-12: habitat prescrit, observer un element puis collecter un composant present', () => {
  const m = byId('ARCH-12');
  assert.equal(m.mapGeneration.requiredMicroScenes[0].id, 'MSC-CUSTOM-HABITAT-RUINE');
  const [observe, collect] = m.sequence;
  assert.equal(observe.action, 'observe');
  assert.equal(observe.params.cuoType, 'stele');
  assert.equal(observe.params.microSceneId, 'MSC-CUSTOM-HABITAT-RUINE');
  assert.equal(collect.action, 'collect');
  assert.equal(collect.params.cuoType, 'relay_block');
  assert.equal(collect.params.microSceneId, 'MSC-CUSTOM-HABITAT-RUINE');
  assert.equal(collect.params.relation, undefined);
});
