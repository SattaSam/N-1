const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const ROOT=process.env.BLUEFOX_ROOT||path.join(__dirname,'..');
const w={BlueFox3D:{}};w.window=w;
vm.runInNewContext(fs.readFileSync(path.join(ROOT,'data/bible-catalog.js'),'utf8'),{window:w,console});
const cat=w.BlueFox3D.BibleCatalog,by=new Map(cat.map(m=>[m.id,m]));
const ids=['TP-AFTER-01','TP-AFTER-02','TP-AFTER-03','TP-AFTER-04'];
for(const id of ids) assert(by.has(id),`${id} absente du catalogue`);
assert.equal(cat.length,322,'TP-AFTER préservé dans le catalogue END/FIN à 322 missions');
const a1=by.get('TP-AFTER-01'),a2=by.get('TP-AFTER-02'),a3=by.get('TP-AFTER-03'),a4=by.get('TP-AFTER-04');
assert.equal(a1.trigger.type,'progression.mission_completed');assert.equal(a1.trigger.missionId,'TP-11');
assert.deepEqual(Array.from(a1.prerequisites),['TP-11']);
for(const [m,prev] of [[a2,'TP-AFTER-01'],[a3,'TP-AFTER-02'],[a4,'TP-AFTER-03']]){
  assert.equal(m.trigger.type,'progression.mission_completed');assert.equal(m.trigger.missionId,prev);assert.deepEqual(Array.from(m.prerequisites),[prev]);
}
for(const m of [a1,a2]){
  const travel=m.slots.travel;assert(travel,'slot travel absent');assert.equal(travel.params.eventDriven,true);assert.equal(travel.params.transitionSource,'teleporter');assert.equal(travel.params.transitionMode,'teleport');assert.equal(travel.params.distinctBy,'transition');
}
const travel3=a3.sequence.find(s=>s.slot==='teleportToOpenMission'),resume3=a3.sequence.find(s=>s.slot==='resumeMission');
assert(travel3&&resume3,'séquence TP-AFTER-03 incomplète');assert.equal(travel3.params.transitionSource,'teleporter');assert.equal(travel3.params.transitionMode,'teleport');assert.equal(travel3.params.eventDriven,true);
assert.equal(resume3.params.catalogManaged,true);assert.equal(resume3.params.eventDriven,true);assert.deepEqual(Array.from(resume3.requires),['teleportToOpenMission']);
assert.equal(a3.runtimeValidation.type,'mission-progress-after-slot');assert.equal(a3.runtimeValidation.slot,'resumeMission');assert.equal(a3.runtimeValidation.afterSlot,'teleportToOpenMission');
assert.equal(a4.pattern,'NARRATIVE_ONLY');assert.equal(a4.narrativeOnly,true);assert.equal(a4.obsessionEligible,false);
assert(a1.obsessionIntensity>a2.obsessionIntensity && a2.obsessionIntensity>a3.obsessionIntensity,'la focalisation TP-AFTER doit décroître avant la clôture');
for(const oldId of ['TP-10','TP-11','TERR-CARN-01','TERR-STORM-01']) assert(by.has(oldId),`${oldId} régressée`);
console.log('PASS TP-AFTER catalog: chain + real TP filters + transversal proof + de-escalation');
