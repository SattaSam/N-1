const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'data/bible-catalog.js');
const runtimePath = path.join(root, 'engine/bible-runtime-v0-1-unified.js');
const source = fs.readFileSync(file, 'utf8');

const window = { BlueFox3D: {}, localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}, addEventListener:()=>{}, removeEventListener:()=>{}, dispatchEvent:()=>{}, setTimeout:()=>0, clearTimeout:()=>{}, performance:{now:()=>0}, document:null, CustomEvent:function(type,init){this.type=type;this.detail=init?.detail;} };
window.window = window;
window.BlueFox3D.BiblePatterns = {
  SEQUENCE_ACTIONS:{autonomyAxis:'research'},
  TRAVEL_CYCLE:{autonomyAxis:'exploration'},
  EXPLORE_SCOPE:{autonomyAxis:'exploration'},
  OBSERVE_TARGET:{autonomyAxis:'research'},
  COLLECT_THEN_REWARD:{autonomyAxis:'collection'}
};
const context = vm.createContext({window, console, Object, Array, Map, Set, Math, JSON, performance:window.performance, CustomEvent:window.CustomEvent, setTimeout:window.setTimeout, clearTimeout:window.clearTimeout});
vm.runInContext(source, context, {filename:'bible-catalog.js'});

const catalog = window.BlueFox3D.BibleCatalog;
const byId = new Map(catalog.map(m => [m.id, m]));
const ids = ['ECO-01','ECO-02','ECO-04','SIS-01','SIS-02','SIS-03'];
ids.forEach(id => assert(byId.has(id), `${id} absent`));
assert.strictEqual(byId.has('ECO-03'), false, 'ECO-03 ne doit pas être réintroduite');
assert.ok(catalog.length >= 273, 'les 267 missions HEAD EXP + 6 ECO-SIS doivent rester présentes sans bloquer les lots ultérieurs');

// Chaîne canonique du lot.
assert.deepStrictEqual(Array.from(byId.get('ECO-01').prerequisites), ['GAME-exploration_complete']);
assert.deepStrictEqual(Array.from(byId.get('ECO-02').prerequisites), ['ECO-01']);
assert.deepStrictEqual(Array.from(byId.get('ECO-04').prerequisites), ['ECO-02']);
assert.deepStrictEqual(Array.from(byId.get('SIS-01').prerequisites), ['ECO-04']);
assert.deepStrictEqual(Array.from(byId.get('SIS-02').prerequisites), ['SIS-01']);
assert.deepStrictEqual(Array.from(byId.get('SIS-03').prerequisites), ['SIS-02','GAME-engineering_6']);

const eco1 = byId.get('ECO-01');
assert.strictEqual(eco1.bindActivationMap, true);
assert.strictEqual(eco1.mapGeneration.requiredMicroScenes[0].id, 'MSC-ECO-STAR-001');
assert.strictEqual(eco1.sequence.find(s=>s.slot==='explore').target, 35);
assert.strictEqual(eco1.sequence.find(s=>s.slot==='terrain').target, 2);

const eco2 = byId.get('ECO-02');
const eco2Scenes = Array.from(eco2.mapGeneration.requiredMicroScenes).map(x=>x.id);
assert.deepStrictEqual(eco2Scenes, ['MSC-FERN-CLEARING-001','MSC-ECO-THERM-001']);
assert.strictEqual(eco2.sequence.find(s=>s.slot==='thermal').params.cuoType, 'thermosap_moss');
assert.strictEqual(eco2.sequence.find(s=>s.slot==='ordinary').params.subject, 'flora');
assert.strictEqual(eco2.sequence.find(s=>s.slot==='ordinaryStudy').params.subject, 'flora');
assert.strictEqual(eco2.sequence.find(s=>s.slot==='thermalStudy').params.cuoType, 'thermosap_moss');
assert(!JSON.stringify(eco2).includes('comestible'), 'ECO-02 ne doit plus être une mission alimentaire');
assert(!JSON.stringify(eco2).includes('toxique'), 'ECO-02 ne doit plus être une mission toxicité');

const eco4 = byId.get('ECO-04');
assert.strictEqual(eco4.mapGeneration.requiredMicroScenes[0].id, 'MSC-CUSTOM-BASALT-RIFT');
assert.strictEqual(eco4.sequence.find(s=>s.slot==='indices').params.distinctBy, 'cuoType');
assert.strictEqual(eco4.sequence.find(s=>s.slot==='indices').target, 2);

const sis1 = byId.get('SIS-01');
assert.strictEqual(sis1.targetMapFact, 'eco04:map');
assert.strictEqual(sis1.sequence.find(s=>s.slot==='repeat').target, 2);
assert(!JSON.stringify(sis1).match(/40\s*minutes|timer|sismograph/i), 'SIS-01 ne doit pas créer de faux timer/sismographe');

const sis2 = byId.get('SIS-02');
const sis2Scenes = Array.from(sis2.mapGeneration.requiredMicroScenes).map(x=>x.id);
assert.deepStrictEqual(sis2Scenes, ['MSC-CUSTOM-BASALT-RIFT','MSC-ECO-THERM-001']);
assert.strictEqual(sis2.sequence.find(s=>s.slot==='explore').target, 60);
assert.strictEqual(sis2.mapGeneration.requiredObjects.find(x=>x.type==='resonant_basalt').count, 3);
assert.strictEqual(sis2.sequence.find(s=>s.slot==='reach').params.newOnly, true);

const sis3 = byId.get('SIS-03');
assert.strictEqual(sis3.sequence.find(s=>s.slot==='collect').params.cuoType, 'resonant_basalt');
assert.strictEqual(sis3.sequence.find(s=>s.slot==='collect').target, 3);
assert.strictEqual(sis3.sequence.find(s=>s.slot==='experiment').action, 'research');
assert.deepStrictEqual(Array.from(sis3.experimentalPrerequisites), ['materials_science']);
assert.strictEqual(sis3.proximityContexts[0].microSceneId, 'MSC-CUSTOM-ETABLI-VIDE');
assert.strictEqual(sis3.proximityContexts[0].slot, 'experiment');
const returnField=sis3.sequence.find(s=>s.slot==='returnField');
assert(returnField, 'SIS-03 doit imposer le retour terrain après expérimentation');
assert.strictEqual(returnField.action, 'travel');
assert.strictEqual(returnField.params.targetMapFact, 'sis02:map');
assert.deepStrictEqual(Array.from(sis3.sequence.find(s=>s.slot==='validation').requires), ['returnField']);
assert.strictEqual(sis3.sequence.find(s=>s.slot==='validation').params.requiredMapFact, 'sis02:map');
assert.strictEqual(sis3.effects, undefined, 'SIS-03 ne doit pas repousser la consommation à la complétion de mission');
const consume = sis3.proximityContexts[0].inventoryConsume;
assert(consume, 'SIS-03 doit consommer réellement au moment de l essai à l établi');
assert.strictEqual(consume.inventoryKey, 'resonant_basalt');
assert.strictEqual(consume.quantity, 3);

// Réfutation des anciens pseudo-CUO documentaires : aucun ne doit entrer dans le moteur.
for (const forbidden of ['seismic_pressure_point','resonant_component','seismic_stabilizer','stabilized_route']) {
  assert(!source.includes(forbidden), `ancien pseudo-CUO interdit encore présent: ${forbidden}`);
}

// Pas de moteur parallèle / nouveau pattern pour ce lot.
ids.forEach(id => assert.strictEqual(byId.get(id).pattern, 'SEQUENCE_ACTIONS'));

// Préservation minimale du lot EXP déjà commité au HEAD précédent.
for (let i=1;i<=12;i++) assert(byId.has(`EXP-${String(i).padStart(2,'0')}`), `régression EXP-${String(i).padStart(2,'0')}`);
const exp5=byId.get('EXP-05');
assert.deepStrictEqual(Array.from(exp5.sequence.find(s=>s.slot==='mineralB1').params.relation.differentBy), ['cuoType']);
const exp7=byId.get('EXP-07');
assert.strictEqual(exp7.mapGeneration.requiredObjects.find(x=>x.type==='nocturnal_animal').count,1);
assert.strictEqual(exp7.mapGeneration.requiredObjects.find(x=>x.type==='lunar_vine').count,1);


// Runtime minimal : les six missions doivent compiler dans le propriétaire BibleRuntime existant.
let runtimeSource=fs.readFileSync(runtimePath,'utf8');
runtimeSource=runtimeSource.replace(/\n\s*runtime\.start\(\);\n\}\)\(window\);\s*$/, '\n})(window);');
window.BlueFox3D.currentEngine={worldTopology:{coordinateOf:()=>null},missionManager:{memory:{state:{siteProgression:{}}}}};
window.BlueFox3D.ObjectLibrary={list:()=>[]};
window.BlueFox3D.ObjectEvents={types:{}};
window.BlueFox3D.getProgressionState=()=>({counters:{global:{}}});
vm.runInContext(runtimeSource,context,{filename:'bible-runtime-v0-1-unified.js'});
const runtime=window.BlueFox3D.bibleRuntime;
ids.forEach(id=>assert(runtime.compileMission(byId.get(id)),`${id} ne compile pas dans BibleRuntime`));

console.log('ECO-SIS IMI contract: PASS');
