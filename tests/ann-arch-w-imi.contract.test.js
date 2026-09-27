const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert/strict');
const ROOT = process.env.TARGET_ROOT || path.join(__dirname, '..');
const window = { BlueFox3D:{}, console, localStorage:{getItem:()=>null,setItem(){},removeItem(){}}, addEventListener(){},removeEventListener(){},dispatchEvent(){return true;}, setTimeout,clearTimeout,performance:{now:()=>0},CustomEvent:function(t,i={}){this.type=t;this.detail=i.detail;} };
window.window=window;
const ctx=vm.createContext({window,console,CustomEvent:window.CustomEvent,performance:window.performance,setTimeout,clearTimeout});
for(const f of ['data/bible-patterns.js','data/bible-catalog.js','engine/bible-contract-v0-1.js']) vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
const BF=window.BlueFox3D, by=new Map(BF.BibleCatalog.map(m=>[m.id,m]));
const ids=['ANN-ARCH-W01','ANN-ARCH-W02','ANN-ARCH-W03','ANN-ARCH-W04'];
ids.forEach(id=>assert(by.has(id),id+' absent'));
assert.deepEqual(Array.from(by.get('ANN-ARCH-W01').prerequisites),['ARCH-02']);
for(const [id,scene] of [['ANN-ARCH-W01','MSC-CUSTOM-WALL-RUIN-STRAIGHT'],['ANN-ARCH-W02','MSC-CUSTOM-WALL-RUIN-COLLAPSED']]){
 const m=by.get(id); assert.equal(m.trigger.type,'exploration.map_discovered');assert.equal(m.trigger.uniqueOnly,true);assert.deepEqual(Array.from(m.trigger.featuredMicroSceneIdsAny),[scene]);
 assert.equal(m.triggerOnly,true);assert.equal(m.bindActivationMap,true);assert.equal(m.mapGeneration,undefined,'W ne doit jamais générer sa MSC');
 const wall=m.sequence.find(s=>s.slot==='wall');const debris=m.sequence.find(s=>s.slot==='debris');
 assert.equal(wall.params.microSceneId,scene);assert.equal(debris.params.microSceneId,scene);assert.equal(debris.params.cuoType,'debris');assert.equal(debris.target,2);assert.equal(debris.params.allowPassiveMSCObject,true);assert.equal(debris.params.requiredSiteFact,id==='ANN-ARCH-W01'?'annArchW01:site':'annArchW02:site');
 assert.equal(wall.params.completionSiteFact,id==='ANN-ARCH-W01'?'annArchW01:site':'annArchW02:site');
}
const w3=by.get('ANN-ARCH-W03');assert.deepEqual(Array.from(w3.prerequisites),['ANN-ARCH-W02']);assert.equal(w3.mapGeneration,undefined);assert.equal(w3.navigation.autonomousKnownDestination,true);assert.equal(w3.sequence[0].params.knownDestination.family,'geology');assert.equal(w3.sequence[0].params.completionArrivalFact,'annArchW03:geologyMap');
const w4=by.get('ANN-ARCH-W04');assert.deepEqual(Array.from(w4.prerequisites),['ANN-ARCH-W03']);assert.equal(w4.navigation.autonomousKnownDestination,true);assert.equal(w4.sequence[0].params.knownDestinationFact,'annArchW02:site');assert.equal(w4.sequence[1].params.requiredSiteFact,'annArchW02:site');assert.equal(w4.sequence[1].params.microSceneId,'MSC-CUSTOM-WALL-RUIN-COLLAPSED');
for(const id of ids){const r=BF.BibleContractV01.validateMission(by.get(id),BF.BiblePatterns,{compatibility:'strict'});assert.equal(r.ok,true,`${id}: ${(r.errors||[]).join(' | ')}`);}
const straight=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/MSC_saves/MSC-CUSTOM-WALL-RUIN-STRAIGHT.json'),'utf8'));
const collapsed=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/MSC_saves/MSC-CUSTOM-WALL-RUIN-COLLAPSED.json'),'utf8'));
for(const scene of [straight,collapsed]){assert(scene.objects.some(o=>o.type==='wall'));assert(scene.objects.filter(o=>o.type==='debris').length>=2);}
console.log('PASS ANN-ARCH-W IMI contract/data-only MSC usage');
