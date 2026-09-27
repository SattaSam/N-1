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
const byId = id => context.BlueFox3D.BibleCatalog.find(m => m.id === id);

test('ARCH-R3: six missions présentes et chaîne 13→18', () => {
  const ids=['ARCH-13','ARCH-14','ARCH-15','ARCH-16','ARCH-17','ARCH-18'];
  ids.forEach(id=>assert.ok(byId(id),`${id} absent`));
  assert.deepEqual(Array.from(byId('ARCH-13').prerequisites),['ARCH-12']);
  assert.deepEqual(Array.from(byId('ARCH-14').prerequisites),['ARCH-13']);
  assert.deepEqual(Array.from(byId('ARCH-15').prerequisites),['ARCH-14']);
  assert.deepEqual(Array.from(byId('ARCH-16').prerequisites),['ARCH-15']);
  assert.deepEqual(Array.from(byId('ARCH-17').prerequisites),['ARCH-16']);
  assert.deepEqual(Array.from(byId('ARCH-18').prerequisites),['ARCH-17']);
});

test('ARCH-13: place commune = contexte Sanctuaire + 3 arches distinctes', () => {
  const m=byId('ARCH-13'); const [contextStep,accesses]=m.sequence;
  assert.equal(contextStep.params.microSceneId,'MSC-CUSTOM-SANCTUAIRE-RING');
  assert.equal(accesses.target,3); assert.equal(accesses.params.cuoType,'arch');
  assert.equal(accesses.params.distinctBy,'instanceId');
  assert.equal(accesses.params.requiredMapFact,'bibleActivation:ARCH-08');
});

test('ARCH-14: atelier garanti sur nouvelle map + 3 preuves techniques réelles', () => {
  const m=byId('ARCH-14');
  assert.equal(m.navigation.autonomousUnknownTravel,true);
  assert.equal(m.mapGeneration.requiredMicroScenes[0].id,'MSC-CUSTOM-ETABLI');
  assert.equal(m.sequence[0].action,'travel'); assert.equal(m.sequence[0].params.newOnly,true);
  const types=m.sequence.slice(2).map(x=>x.params.cuoType);
  assert.deepEqual(Array.from(types),['relay_block','pulse_core','ancient_machine_wreck']);
  m.sequence.slice(2).forEach(x=>assert.equal(x.params.microSceneId,'MSC-CUSTOM-ETABLI'));
});

test('ARCH-15: nouvelle map Est + Astrology + deux repères physiques', () => {
  const m=byId('ARCH-15');
  assert.equal(m.trigger.type,'exploration.map_discovered'); assert.equal(m.trigger.direction,'east');
  assert.equal(m.bindActivationMap,true);
  assert.equal(m.mapGeneration.requiredMicroScenes[0].id,'MSC-CUSTOM-ASTROLOGY');
  assert.equal(m.sequence[1].params.cuoType,'arch');
  assert.equal(m.sequence[2].params.cuoType,'tech_relic');
});

test('ARCH-16: 3 catégories couvertes + 18 observations post-activation parmi elles', () => {
  const m=byId('ARCH-16');
  assert.equal(m.pattern,'SEQUENCE_ACTIONS'); assert.equal(m.sequence.length,4);
  const [arches,steles,relics,total]=m.sequence;
  assert.deepEqual(Array.from([arches.params.cuoType,steles.params.cuoType,relics.params.cuoType]),['arch','stele','tech_relic']);
  for (const step of [arches,steles,relics,total]) assert.deepEqual(Array.from(step.requires),[]);
  assert.equal(total.target,18); assert.equal(total.action,'observe');
  assert.deepEqual(Array.from(total.params.cuoTypes),['arch','stele','tech_relic']);
  assert.equal(total.params.tagsAny,undefined);
  assert.equal(total.params.distinctBy,'instanceId');
});

test('ARCH-17: relique active garantie puis observation/analyse, surcharge narrative seulement', () => {
  const m=byId('ARCH-17');
  assert.equal(m.mapGeneration.requiredMicroScenes[0].id,'MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP');
  assert.equal(m.navigation.autonomousUnknownTravel,true);
  const observe=m.sequence.find(x=>x.slot==='relicObserve');
  const analyze=m.sequence.find(x=>x.slot==='relicAnalyze');
  assert.equal(observe.params.cuoType,'tech_relic'); assert.equal(analyze.params.cuoType,'tech_relic');
  assert.equal(observe.params.microSceneId,'MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP');
  assert.equal(analyze.params.relation,undefined);
});

test('ARCH-18: même contexte cérémoniel + relique + 2 stèles distinctes', () => {
  const m=byId('ARCH-18'); const [relic,steles]=m.sequence;
  assert.equal(m.bindActivationMap,true);
  assert.equal(relic.params.cuoType,'tech_relic');
  assert.equal(steles.target,2); assert.equal(steles.params.cuoType,'stele');
  assert.equal(steles.params.distinctBy,'instanceId');
  assert.equal(relic.params.microSceneId,'MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP');
  assert.equal(steles.params.requiredMapFact,'bibleActivation:ARCH-18');
});
