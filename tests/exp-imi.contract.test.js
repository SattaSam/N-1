const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const candidateRoot = path.resolve(__dirname, '..');
const runtimePath = path.join(candidateRoot, 'engine/bible-runtime-v0-1-unified.js');
const prescriptionPath = path.join(candidateRoot, 'engine/bible-map-prescription-v19.js');

function loadCatalog(file) {
  const window = { BlueFox3D: {}, localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}, addEventListener:()=>{}, removeEventListener:()=>{}, dispatchEvent:()=>{}, setTimeout:()=>0, clearTimeout:()=>{}, performance:{now:()=>0}, document:null, CustomEvent:function(type,init){this.type=type;this.detail=init?.detail;} };
  window.window = window;
  window.BlueFox3D.BiblePatterns = { SEQUENCE_ACTIONS:{autonomyAxis:'research'}, TRAVEL_CYCLE:{autonomyAxis:'exploration'}, EXPLORE_SCOPE:{autonomyAxis:'exploration'}, OBSERVE_TARGET:{autonomyAxis:'research'}, COLLECT_THEN_REWARD:{autonomyAxis:'collection'} };
  const context = vm.createContext({window,console,performance:window.performance,CustomEvent:window.CustomEvent,setTimeout:window.setTimeout,clearTimeout:window.clearTimeout});
  vm.runInContext(fs.readFileSync(file,'utf8'), context, {filename:path.basename(file)});
  return { window, context, catalog: window.BlueFox3D.BibleCatalog };
}

const loaded = loadCatalog(path.join(candidateRoot,'data/bible-catalog.js'));
const catalog = loaded.catalog;
const byId = new Map(catalog.map(m=>[m.id,m]));
const ids = Array.from({length:12},(_,i)=>`EXP-${String(i+1).padStart(2,'0')}`);
ids.forEach(id=>assert(byId.has(id), `${id} absent`));
assert(catalog.length >= 267, 'le catalogue doit conserver les 255 historiques + 12 EXP, sans interdire les lots missionnels ulterieurs');

for (let i=1;i<12;i++) {
  assert.deepStrictEqual(Array.from(byId.get(ids[i]).prerequisites), [ids[i-1]], `${ids[i]} prerequis incorrect`);
}
assert.deepStrictEqual(Array.from(byId.get('EXP-01').prerequisites), ['GAME-exploration_complete']);

const e1=byId.get('EXP-01');
assert.strictEqual(e1.bindActivationMap,true);
assert.deepStrictEqual(Array.from(e1.sequence.filter(s=>['north','east','west'].includes(s.slot)).map(s=>s.params.direction)),['north','east','west']);
assert.strictEqual(e1.sequence.filter(s=>s.slot.startsWith('return')).length,3);
e1.sequence.filter(s=>s.slot.startsWith('return')).forEach(s=>assert.strictEqual(s.params.targetMapFact,'bibleActivation:EXP-01'));

const e2=byId.get('EXP-02');
assert.strictEqual(e2.sequence.find(s=>s.slot==='explore').target,60);
assert.strictEqual(e2.mapGeneration.requiredMicroScenes[0].id,'MSC-FERN-CLEARING-001');
assert(!JSON.stringify(e2).includes('RUISSEAU-MARE'),'EXP-02 ne doit pas porter la contrainte eau');

const e3=byId.get('EXP-03');
assert.strictEqual(e3.mapGeneration.requiredMicroScenes[0].id,'MSC-CUSTOM-ETABLI');

const e4=byId.get('EXP-04');
assert.strictEqual(e4.siteDistanceGate.minimumExclusive,10);
assert.strictEqual(e4.mapGeneration.requiredMicroScenes[0].id,'MSC-CUSTOM-RUISSEAU-MARE');
assert.deepStrictEqual(Array.from(e4.mapGeneration.compatibleBiomes),['forest','jungle','swamp']);

const e5=byId.get('EXP-05');
assert.strictEqual(e5.mapGeneration.requiredMicroScenes[0].id,'MSC-CUSTOM-CARRIEREDECRISTAUX1');
assert.strictEqual(e5.sequence.find(s=>s.slot==='observe').params.distinctBy,'cuoType','EXP-05 doit observer trois types minéraux distincts');
const a2=e5.sequence.find(s=>s.slot==='mineralA2').params.relation;
const b1=e5.sequence.find(s=>s.slot==='mineralB1').params.relation;
const b2=e5.sequence.find(s=>s.slot==='mineralB2').params.relation;
assert.deepStrictEqual(Array.from(a2.sameBy),['cuoType']);
assert.deepStrictEqual(Array.from(b1.differentBy),['cuoType']);
assert.deepStrictEqual(Array.from(b2.sameBy),['cuoType']);
const relationAllows=(source,candidate,relation)=>{
  const sameBy=Array.from(relation.sameBy||[]);
  const differentBy=Array.from(relation.differentBy||[]);
  return sameBy.every(field=>String(source[field]||'') && String(source[field])===String(candidate[field]||'')) &&
    differentBy.every(field=>String(source[field]||'') && String(candidate[field]||'') && String(source[field])!==String(candidate[field]));
};
assert.strictEqual(relationAllows({cuoType:'magnetic_ore',instanceId:'ore-a'},{cuoType:'magnetic_ore',instanceId:'ore-b'},a2),true,'EXP-05 doit accepter une seconde instance du meme premier minerai');
assert.strictEqual(relationAllows({cuoType:'magnetic_ore',instanceId:'ore-a'},{cuoType:'magnetic_ore',instanceId:'ore-b'},b1),false,'EXP-05 ne doit pas accepter le meme type comme second minerai');
assert.strictEqual(relationAllows({cuoType:'magnetic_ore',instanceId:'ore-a'},{cuoType:'resonant_basalt',instanceId:'ore-c'},b1),true,'EXP-05 doit accepter un second type de minerai');
assert.strictEqual(relationAllows({cuoType:'resonant_basalt',instanceId:'ore-c'},{cuoType:'resonant_basalt',instanceId:'ore-d'},b2),true,'EXP-05 doit accepter une seconde instance du second minerai');
assert.strictEqual(e5.sequence.find(s=>s.slot==='return').params.targetMapFact,'bibleActivation:EXP-04');


const e6=byId.get('EXP-06');
assert.strictEqual(e6.sequence.find(s=>s.slot==='returnSource').params.targetMapFact,'bibleActivation:EXP-04');
const exp04Biomes=new Set(Array.from(e4.mapGeneration.compatibleBiomes));
for (const b of Array.from(e6.mapGeneration.compatibleBiomes)) assert(!exp04Biomes.has(b), `biome EXP-06 non distinct de EXP-04: ${b}`);

const e7=byId.get('EXP-07');
const req7=Array.from(e7.mapGeneration.requiredObjects);
assert.strictEqual(req7.find(x=>x.type==='electrostatic_storm').count,1);
assert.strictEqual(req7.find(x=>x.type==='stele').count,3);
assert.strictEqual(req7.find(x=>x.type==='nocturnal_animal').count,1,'EXP-07 doit garantir la faune requise ensuite par EXP-08');
assert.strictEqual(req7.find(x=>x.type==='lunar_vine').count,1,'EXP-07 doit garantir la flore requise ensuite par EXP-08');
assert(!e7.mapGeneration.requiredMicroScenes,'EXP-07 ne doit pas créer de MSC dédiée');

const e8=byId.get('EXP-08');
assert.strictEqual(e8.mapGeneration,undefined,'EXP-08 ne doit pas porter une prescription inutilisable apres generation de la map');
assert.strictEqual(e8.targetMapFact,'exp07:map');
e8.sequence.forEach(step=>assert.strictEqual(step.params.requiredMapFact,'exp07:map','EXP-08 doit observer les contenus garantis sur la map EXP-07'));
assert(JSON.stringify(e8).includes('nocturnal_animal'));
assert(JSON.stringify(e8).includes('lunar_vine'));
assert(!JSON.stringify(e8).includes('surfacePercent'),'EXP-08 ne doit pas créer un faux compteur nocturne');

const e9=byId.get('EXP-09');
assert.strictEqual(e9.sequence.find(s=>s.slot==='return').params.targetMapFact,'exp07:map');
assert.strictEqual(e9.sequence.find(s=>s.slot==='steles').target,3);

const e10=byId.get('EXP-10');
assert.strictEqual(e10.mapGeneration.requiredObjects[0].type,'tech_relic');
assert.strictEqual(e10.souvenir,true);
assert.strictEqual(e10.obsessionIntensity,5);

const e11=byId.get('EXP-11');
assert.strictEqual(e11.pattern,'TRAVEL_CYCLE');
assert.strictEqual(e11.slots.travel.params.targetMapFact,'bibleActivation:EXP-04');

const e12=byId.get('EXP-12');
assert.strictEqual(e12.sequence.find(s=>s.slot==='map1').params.mapGenerationOnCount[1].requiredMicroScenes.length,1);
assert.strictEqual(e12.sequence.find(s=>s.slot==='map2').params.mapGenerationOnCount[1].requiredMicroScenes.length,2);
assert.strictEqual(e12.sequence.find(s=>s.slot==='explore100').target,100);

// Runtime minimal : réutilise exactement le runtime HEAD ANN, sans le modifier.
let runtimeSource=fs.readFileSync(runtimePath,'utf8');
runtimeSource=runtimeSource.replace(/\n\s*runtime\.start\(\);\n\}\)\(window\);\s*$/, '\n})(window);');
const {window,context}=loaded;
window.BlueFox3D.currentEngine={worldTopology:{coordinateOf(id){return ({camp:{x:0,y:0},near:{x:10,y:0},far:{x:11,y:0}})[id]||null;}},missionManager:{memory:{state:{siteProgression:{camp:{sites:{camp:{kind:'camp'}}}}}}}};
window.BlueFox3D.ObjectLibrary={list:()=>[]};
window.BlueFox3D.ObjectEvents={types:{}};
window.BlueFox3D.getProgressionState=()=>({counters:{global:{}}});
vm.runInContext(runtimeSource,context,{filename:'bible-runtime-v0-1-unified.js'});
const runtime=window.BlueFox3D.bibleRuntime;
assert.strictEqual(runtime.siteDistanceGateSatisfied(e4,'near'),false);
assert.strictEqual(runtime.siteDistanceGateSatisfied(e4,'far'),true);
ids.forEach(id=>assert(runtime.compileMission(byId.get(id)),`${id} ne compile pas`));

// Scénario propriétaire map : quand EXP-07 est primaire et active, sa prescription
// doit réellement fournir les deux contenus que réclamera EXP-08 sur cette même map.
let prescriptionSource=fs.readFileSync(prescriptionPath,'utf8');
window.BlueFox3D.Missions=window.BlueFox3D.Missions||{};
window.BlueFox3D.Missions.ActionType=window.BlueFox3D.Missions.ActionType||{TRAVEL:'travel'};
window.BlueFox3D.Missions.normalizeActionType=window.BlueFox3D.Missions.normalizeActionType||((value)=>String(value||''));
window.BlueFox3D.currentEngine={missionManager:{primaryMissionId:'EXP-07',activeMissionId:'EXP-07',trees:new Map(),memory:{state:{missionLifecycle:{'EXP-07':{status:'active'}}}}}};
vm.runInContext(prescriptionSource,context,{filename:'bible-map-prescription-v19.js'});
const resolvedExp07=window.BlueFox3D.resolveBibleMapGenerationPrescription();
assert(resolvedExp07,'EXP-07 doit exposer une prescription de generation active');
const resolvedTypes=Array.from(resolvedExp07.requiredObjects||[]).flatMap(entry=>Array(Number(entry.count)||1).fill(entry.type));
assert(resolvedTypes.includes('nocturnal_animal'),'la generation EXP-07 doit garantir nocturnal_animal avant activation EXP-08');
assert(resolvedTypes.includes('lunar_vine'),'la generation EXP-07 doit garantir lunar_vine avant activation EXP-08');
assert.strictEqual(resolvedTypes.filter(type=>type==='stele').length,3,'la prescription EXP-07 doit conserver trois steles');

console.log('EXP IMI contract: PASS');
