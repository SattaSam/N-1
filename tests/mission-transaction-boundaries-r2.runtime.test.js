const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');process.env.BLUEFOX_ROOT=ROOT;
// Shared test helpers only: do not execute or modify the R1 scenarios.
const r1=fs.readFileSync(path.join(__dirname,'mission-research-beacon-durability.runtime.test.js'),'utf8');
const header=r1.slice(0,r1.indexOf('\nfor(const [current,count]'));
const geometry=r1.slice(r1.indexOf('const popSource='),r1.indexOf("\nfor(const cut of ['none'"));
const {H,research,recipe,supply,reload,plain,stock,failWrite,beacon}=new Function('require','__dirname',header+'\n'+geometry+'\nreturn {H,research,recipe,supply,reload,plain,stock,failWrite,beacon};')(require,path.join(ROOT,'tests'));
function payment(f,owner){return Object.values(f.BF.progression.state.transactions).filter(r=>r.metadata?.owner===owner)}
function arrive(f,to,isNew=true){const from=f.engine.currentMapId;f.BF.maps[to]||={id:to,exits:{}};f.engine.currentMapId=to;f.engine.discoveredMaps.add(to);f.window.dispatchEvent(new f.window.CustomEvent('bluefox:map-transition-completed',{detail:{fromMapId:from,toMapId:to,mapId:to,isNew,direction:'north',source:'manual',mode:'gate'}}))}
for(const op of ['ration','inventory','experiment'])test(`${op}: the same payment and result can be replayed five times`,async()=>{
 const f=await research();let id,spec;
 const commit=f.BF.progression.commitInventoryTransaction.bind(f.BF.progression);f.BF.progression.commitInventoryTransaction=(tx,s)=>{id=tx;spec=plain(s);return commit(tx,s)};
 if(op==='experiment'){const theme=f.runtime.experimentDefinitions()[0];supply(f,theme.stages[0].requirements);assert(f.runtime.runExperiment(theme.id))}else{const r=recipe(f,op==='ration'?'ration-basic-v2':'accumulator-basic-v1');assert.equal(f.runtime.craftResearchReward(r.id),1)}
 const before=plain(f.BF.getProgressionState()),rations=plain(f.BF.Rations.snapshot()),experiments=plain(f.runtime.experimentMemory());
 assert(id);for(let i=0;i<5;i++){assert(commit(id,spec));f.runtime.reconcileResearchTransactions(id)}
 assert.deepEqual(plain(f.BF.getProgressionState()),before);assert.deepEqual(plain(f.BF.Rations.snapshot()),rations);assert.deepEqual(plain(f.runtime.experimentMemory()),experiments);
 const x=await reload(f);x.load('engine/survival-rations-v0-3.js');assert(x.BF.progression.commitInventoryTransaction(id,spec));x.runtime.reconcileResearchTransactions(id);assert.deepEqual(stock(x),stock(f));assert.equal(x.BF.Rations.snapshot().craftedTotal,rations.craftedTotal);
});
for(const op of ['recipe','experiment'])test(`${op}: reentrant and pending attempts cannot start a second payment`,async()=>{
 const f=await research(),id=op==='recipe'?'ration-basic-v2':f.runtime.experimentDefinitions()[0].id;
 if(op==='recipe')recipe(f,id,3);else supply(f,f.runtime.experimentDefinition(id).stages[0].requirements,3);
 const invoke=()=>op==='recipe'?f.runtime.craftResearchReward(id):f.runtime.runExperiment(id),attempts=[];
 f.window.addEventListener('bluefox:progression-changed',e=>{if(e.detail.reason==='inventory-pool-consumed')attempts.push(invoke())});
 f.BF.progression.markInventoryTransactionApplied=()=>false;invoke();const paid=stock(f);invoke();invoke();
 assert.deepEqual(stock(f),paid);assert.equal(payment(f,'research').length,1);assert.equal(attempts.length,1);assert.equal(attempts[0],op==='recipe'?0:false);
 if(op==='recipe')assert.equal(f.BF.Rations.snapshot().craftedTotal,1);else assert.equal(f.runtime.experimentMemory()[id].count,1);
});
test('ration credit: refused write then replay, consume, capacity and quantity mismatch',async()=>{const f=await research(),restore=failWrite(f,'bluefox_personal_consumables_v1');assert.equal(f.BF.Rations.add(3,'r2',{transactionId:'r2-credit'}),0);assert.equal(f.BF.Rations.snapshot().craftedTotal,0);restore();assert.equal(f.BF.Rations.add(3,'r2',{transactionId:'r2-credit'}),3);f.BF.getSurvivalState=()=>({energy:40});assert.equal(f.BF.Rations.consume(2),2);assert.equal(f.BF.Rations.add(4,'r2',{transactionId:'r2-credit'}),0);assert.equal(f.BF.Rations.add(3,'r2',{transactionId:'r2-credit'}),3);assert.equal(f.BF.Rations.snapshot().rations,1);f.BF.Rations.add(49);assert.equal(f.BF.Rations.add(1,'r2',{transactionId:'r2-overflow'}),0);assert.equal(f.BF.Rations.snapshot().craftedTotal,52)});
test('beacon: nested installation and five retries create only one MSC and one debit',async()=>{const f=await beacon();f.BF.grantInventory('deployed_beacon',2);const nested=[];f.window.addEventListener('bluefox:site-established',()=>nested.push(f.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'})));f.BF.progression.markInventoryTransactionApplied=()=>false;f.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'});for(let i=0;i<5;i++)f.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'});assert(nested.length);assert(nested.every(x=>x===false));assert.equal(payment(f,'special-beacon').length,1);assert.equal(f.BF.availableInventory('deployed_beacon'),1);const scenes=f.engine.currentMap.group.userData.microScenes.filter(s=>s.instanceId==='remote:deployed-beacon:primary');assert.equal(scenes.length,1)});
test('beacon pending on A cannot materialize on B; returning to A preserves the original anchor',async()=>{const f=await beacon();f.BF.grantInventory('deployed_beacon',1);const commit=f.BF.progression.commitInventoryTransaction.bind(f.BF.progression);f.BF.progression.commitInventoryTransaction=(...a)=>{commit(...a);throw Error('cut')};assert.throws(()=>f.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'}),/cut/);const x=await beacon(Object.fromEntries(f.store));x.BF.maps.other={id:'other',exits:{}};x.engine.currentMapId='other';for(let i=0;i<3;i++)x.BF.SpecialObjectRuntime.update(x.engine.currentMap.group,i);assert.equal(Object.values(x.memory.state.siteProgression||{}).filter(s=>s.kind==='deployed_beacon').length,0);assert.equal(x.engine.currentMap.group.userData.microScenes.filter(s=>s.instanceId==='remote:deployed-beacon:primary').length,0);x.engine.currentMapId='remote';x.BF.SpecialObjectRuntime.update(x.engine.currentMap.group,4);const scene=x.engine.currentMap.group.userData.microScenes.find(s=>s.instanceId==='remote:deployed-beacon:primary');assert(scene);assert.deepEqual(plain(scene.instanceRoot.position),{x:18,y:0,z:18})});
test('beacon event replay cannot credit a leaf that was locked at the physical installation',async()=>{
 const f=await beacon(),t=H.start(f,'EXP-LONG-02');f.BF.maps.remote.generator={cadence:{rareBiomeForced:true}};f.engine.currentMapId='crystal';arrive(f,'remote');
 assert.equal(f.memory.getFact('expLong02:remarkable')?.mapId,'remote');f.BF.grantInventory('deployed_beacon',1);f.BF.progression.markInventoryTransactionApplied=()=>false;f.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'});assert.equal(t.find('EXP-LONG-02:deployBeacon').progress,0);
 for(let i=0;i<11;i++)arrive(f,`new-${i}`);arrive(f,'remote',false);const plant=f.object('fern');plant.userData.worldAnchor=plant;f.engine.currentMap.interactables=[plant];
 plant.userData.requestedInteraction='observe';plant.userData.requestedInteractionSource='manual';assert(f.engine.targetInteraction(plant));for(let i=0;i<6&&f.engine.pendingInteraction;i++)f.engine.updateInteraction(10000+i*25000);
 assert.equal(t.find('EXP-LONG-02:study').progress,1);assert.equal(t.find('EXP-LONG-02:deployBeacon').progress,0);
 f.BF.SpecialObjectRuntime.update(f.engine.currentMap.group,10);assert.equal(t.find('EXP-LONG-02:deployBeacon').progress,0,'old installation must not turn into a later eligible mission event');
 f.memory.flush(true);const x=await reload(f);const receipt=payment(f,'special-beacon')[0];x.runtime.onSiteEstablished({kind:'deployed_beacon',mapId:'remote',instanceId:receipt.metadata.record.instanceId,transactionId:receipt.id});assert.equal(x.manager.trees.get('EXP-LONG-02').find('EXP-LONG-02:deployBeacon').progress,0,'recipient snapshot must survive a full runtime reload');
});
test('beacon fan-out credits both initially eligible missions and leaves the later mission untouched',async()=>{
 const f=await beacon();for(const id of ['EXP-LONG-02','EXP-LONG-04']){const m=H.catalog.find(m=>m.id===id),t=H.start(f,id);H.stage(f,m,t,'deployBeacon');f.memory.setFact(m.runtimeValidation.beaconMapFact,{mapId:'remote'})}
 f.BF.grantInventory('deployed_beacon',1);f.BF.progression.markInventoryTransactionApplied=()=>false;f.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'});
 for(const id of ['EXP-LONG-02','EXP-LONG-04'])assert.equal(f.manager.trees.get(id).find(`${id}:deployBeacon`).progress,1);
 const later=H.catalog.find(m=>m.id==='EXP-LONG-05');let t=f.manager.trees.get(later.id);if(!t)t=H.start(f,later.id);H.stage(f,later,t,'deployBeacon');f.memory.setFact(later.runtimeValidation.beaconMapFact,{mapId:'remote'});
 f.BF.SpecialObjectRuntime.update(f.engine.currentMap.group,2);assert.equal(t.find(`${later.id}:deployBeacon`).progress,0);
});
test('research replay preserves locked-leaf baselines and the explicit global-cumulative exception',async()=>{
 const f=await research(),t=H.start(f,'SUR-05');recipe(f,'ration-basic-v2',3);f.BF.progression.markInventoryTransactionApplied=()=>false;
 f.runtime.craftResearchReward('ration-basic-v2',3);assert.equal(t.find('SUR-05:craftPreservedRations').progress,0);
 // Eligibility boundary only: the predecessor is staged; the tested ration
 // production, replay and counter reconciliation all use their native owners.
 f.completeNode(t.find('SUR-05:researchPreservation'));t.refresh();f.runtime.reconcileRuntimeCounters('SUR-05');
 f.runtime.reconcileResearchTransactions();assert.equal(t.find('SUR-05:craftPreservedRations').progress,0);
 const cumulative=H.start(f,'SUR-06');f.runtime.reconcileRuntimeCounters('SUR-06');assert.equal(cumulative.find('SUR-06:craftTenRations').progress,3);
});
for(const op of ['ration','inventory','experiment'])test(`${op}: abrupt reload after durable result but before its notification`,async()=>{
 const f=await research();let invoke;
 if(op==='experiment'){const theme=f.runtime.experimentDefinitions()[0];supply(f,theme.stages[0].requirements);invoke=()=>f.runtime.runExperiment(theme.id);const flush=f.memory.flush.bind(f.memory);f.memory.flush=(...a)=>{const ok=flush(...a);if(f.runtime.experimentMemory()[theme.id]?.count===1)throw Error('cut between result and notification');return ok}}
 else{const r=recipe(f,op==='ration'?'ration-basic-v2':'accumulator-basic-v1');invoke=()=>f.runtime.craftResearchReward(r.id);if(op==='ration'){const add=f.BF.Rations.add;f.BF.Rations={...f.BF.Rations,add(...a){const n=add(...a);assert.equal(n,1);throw Error('cut between result and notification')}}}else{f.BF.progression.publishChange=(...a)=>{const receipt=payment(f,'research')[0];assert(receipt);assert.equal(f.BF.availableInventory('accumulator'),1);throw Error('cut between result and notification')}}}
 assert.throws(invoke,/cut between result and notification/);const x=await reload(f);x.load('engine/survival-rations-v0-3.js');for(let i=0;i<3;i++)x.runtime.reviewProximityContexts();
 assert.equal(payment(x,'research').length,1);assert.equal(payment(x,'research')[0].applied,true);
 if(op==='ration')assert.equal(x.BF.Rations.snapshot().craftedTotal,1);else if(op==='inventory')assert.equal(x.BF.availableInventory('accumulator'),1);else assert.equal(x.runtime.experimentMemory()[f.runtime.experimentDefinitions()[0].id].count,1);
});
test('beacon: repeated hydration after a physical-placement interruption creates exactly one MSC root and hitbox set',async()=>{const f=await beacon();f.BF.grantInventory('deployed_beacon',1);const spawn=f.BF.PersistentMicroScenes.spawnRecord;f.BF.PersistentMicroScenes={...f.BF.PersistentMicroScenes,spawnRecord(...a){assert(spawn(...a));throw Error('cut after physical placement')}};assert.throws(()=>f.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'}),/cut/);const x=await beacon(Object.fromEntries(f.store));for(let i=0;i<4;i++){x.BF.PersistentMicroScenes.spawnForBuiltMap(x.engine.THREE,x.engine.currentMap,x.BF.maps.remote);x.BF.SpecialObjectRuntime.update(x.engine.currentMap.group,i)}const name='PersistentMicroScene:remote:deployed-beacon:primary';assert.equal(x.engine.currentMap.group.children.filter(c=>c.name===name).length,1);assert.equal(x.engine.currentMap.group.userData.microScenes.filter(s=>s.instanceId==='remote:deployed-beacon:primary').length,1);assert.equal(new Set(x.engine.currentMap.interactables).size,x.engine.currentMap.interactables.length);assert.equal(x.BF.availableInventory('deployed_beacon'),0)});
test('beacon publication waits until the original recipient snapshot is durable',async()=>{
 const f=await beacon();f.BF.grantInventory('deployed_beacon',1);const events=[];f.window.addEventListener('bluefox:site-established',e=>events.push(e.detail));const flush=f.memory.flush.bind(f.memory);
 f.memory.flush=(...a)=>Object.keys(f.memory.state.effectReceipts||{}).some(k=>k.startsWith('site-established:'))?false:flush(...a);
 f.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'});assert.equal(events.length,0,'no canonical publication before durable recipient snapshot');
 f.memory.flush=flush;f.BF.SpecialObjectRuntime.update(f.engine.currentMap.group,1);assert.equal(events.length,1);assert.equal(f.BF.availableInventory('deployed_beacon'),0);
});
