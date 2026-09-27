const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');
const w={BlueFox3D:{}};w.window=w;vm.runInNewContext(fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8'),w);
const cat=w.BlueFox3D.BibleCatalog,by=new Map(cat.map(m=>[m.id,m]));
assert.equal(cat.length,322,'EXP-LONG préservé + END/FIN : catalogue attendu à 322 missions');
const ids=['EXP-LONG-01','EXP-LONG-02','EXP-LONG-03','EXP-LONG-04','EXP-LONG-05'];ids.forEach(id=>assert(by.has(id),`${id} absente`));
const [e1,e2,e3,e4,e5]=ids.map(id=>by.get(id));
assert.equal(e1.trigger.missionId,'TP-AFTER-04');assert.deepEqual(Array.from(e1.prerequisites),['TP-AFTER-04']);
assert.equal(e1.sequence[0].params.newOnly,true);assert.equal(e1.sequence[0].target,10);assert.equal(e1.runtimeValidation.type,'long-expedition');
assert.equal(e1.sequence[2].params.targetMapFact,'expLong01:hubTarget');assert.equal(e1.navigation.autonomousKnownReturn,true);
assert.equal(e2.sequence[0].target,12);assert.equal(e2.runtimeValidation.remarkableFact,'expLong02:remarkable');assert.equal(e2.mapGeneration,undefined,'EXP-LONG-02 ne doit pas forcer de rareté');
assert.equal(e3.sequence[0].params.transitionSource,'teleporter');assert.equal(e3.sequence[0].params.direction,'teleport-outbound');assert.equal(e3.sequence[0].params.targetMapFact,'expLong03:targetBeacon');assert.equal(e3.sequence[1].target,10);
assert.equal(e4.sequence[0].target,12);assert.equal(e4.runtimeValidation.studySlot,'study');assert.equal(e4.mapGeneration,undefined,'EXP-LONG-04 ne doit pas synthétiser de rencontre');
assert.equal(e5.sequence[0].target,10);assert.equal(e5.sequence[2].params.direction,'teleport-return');assert.equal(e5.sequence[2].params.targetMapFact,'expLong05:hubTarget');assert.equal(e5.sequence[3].action,'travel');assert.equal(e5.sequence[3].params.targetMapFact,'expLong05:otherBeaconTarget');assert.equal(e5.sequence[3].params.direction,'teleport-outbound');
for(let i=1;i<ids.length;i++){assert.equal(by.get(ids[i]).trigger.missionId,ids[i-1]);assert.deepEqual(Array.from(by.get(ids[i]).prerequisites),[ids[i-1]]);}
console.log('PASS EXP-LONG catalogue: explicit known TP targets + 5 mission chain');
