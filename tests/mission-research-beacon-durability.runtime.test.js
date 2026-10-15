const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');process.env.BLUEFOX_ROOT=ROOT;
const source=fs.readFileSync(path.join(ROOT,'tests/mission-eligibility-stock-fauna.runtime.test.js'),'utf8');
const {H}=new Function('require','__dirname',source.slice(0,source.indexOf('\nfor(const id'))+'\nreturn {H};')(require,path.join(ROOT,'tests'));
const transfer=fs.readFileSync(path.join(ROOT,'tests/mission-transfer-resumption.runtime.test.js'),'utf8');
// Abrupt reload: only bytes actually committed to storage survive.
const {reload}=new Function('require','__dirname',transfer.slice(0,transfer.indexOf('\nfunction capacity')).replace('  f.memory.flush(true);','')+'\nreturn {reload};')(require,path.join(ROOT,'tests'));
const plain=x=>JSON.parse(JSON.stringify(x));
const stock=f=>plain(f.BF.getProgressionState().inventory);
async function research(){const f=await H.live();f.load('engine/survival-rations-v0-3.js');f.BF.canAccessCampInventory=()=>true;f.runtime.canAccessWorkbench=()=>true;return f;}
function supply(f,req,count=1,camp=false){for(const r of req)(camp?f.BF.grantCampStorage:f.BF.grantInventory)(f.runtime.inventoryKeysForRequirement(r)[0],r.quantity*count)}
function recipe(f,id='ration-basic-v2',count=1,camp=false){const r=f.runtime.researchRewardById(id);f.memory.state.researchUnlocks[id]={id};supply(f,r.requirements,count,camp);return r;}
function failWrite(f,key,n=1){const write=f.window.localStorage.setItem.bind(f.window.localStorage);let seen=0;f.window.localStorage.setItem=(k,v)=>{if(k===key&&++seen>=n)throw Error('diagnostic write refused');return write(k,v)};return()=>f.window.localStorage.setItem=write;}
for(const [current,count]of [[50,1],[49,3]])test(`ration capacity ${current}+${count}: no partial production or payment`,async()=>{const f=await research();recipe(f,'ration-basic-v2',count);f.BF.Rations.add(current);const before=stock(f);assert.equal(f.runtime.canCraftResearchReward('ration-basic-v2',count),false);assert.equal(f.runtime.craftResearchReward('ration-basic-v2',count),0);assert.deepEqual(stock(f),before);assert.equal(f.BF.Rations.snapshot().rations,current)});
for(const r of H.catalog.flatMap(m=>m.rewards||[]).filter(r=>r.type==='research.recipe'))test(`recipe ${r.id}: complete native payment and output`,async()=>{const f=await research();recipe(f,r.id);assert.equal(f.runtime.craftResearchReward(r.id),r.output.quantity||1);for(const q of r.requirements)assert.equal(f.BF.accessibleInventory(f.runtime.inventoryKeysForRequirement(q)),0);const id=r.output.objectId||r.output.inventoryKey;assert.equal(id==='ration'?f.BF.Rations.snapshot().rations:f.BF.availableInventory(id),r.output.quantity||1)});
for(const theme of new Function('require','__dirname',source.slice(0,source.indexOf('\nfor(const id'))+'\nreturn catalogWindow.BlueFox3D.BibleExperiments;')(require,path.join(ROOT,'tests')))test(`experiment ${theme.id}: all five stages and knowledge`,async()=>{const f=await research();for(const st of theme.stages){supply(f,st.requirements);assert.equal(f.runtime.runExperiment(theme.id),true);assert.equal(f.runtime.experimentMemory()[theme.id].count,st.stage);if(st.knowledge)assert(f.runtime.isResearchRewardUnlocked(st.knowledge.id))}});
for(const operation of ['recipe','experiment'])for(const cut of ['registry-refused','after-payment','result-refused','after-result','before-ack'])test(`${operation}: ${cut} survives abrupt reload without lost ingredients or duplicated result`,async()=>{
 const f=await research(),r=operation==='recipe'?recipe(f):f.runtime.experimentDefinitions()[0],stage=operation==='experiment'?r.stages[0]:null;
 if(stage)supply(f,stage.requirements);f.memory.flush(true);const before=stock(f);
 const invoke=()=>operation==='recipe'?f.runtime.craftResearchReward(r.id):f.runtime.runExperiment(r.id);
 let restore=()=>{};
 if(cut==='registry-refused')restore=failWrite(f,'bluefox_progression_registry_v1');
 if(cut==='result-refused')restore=failWrite(f,operation==='recipe'?'bluefox_personal_consumables_v1':'bluefox_mission_memory_m0_v1');
 if(cut==='after-payment'){
  const owner=f.BF.progression,commit=owner.commitInventoryTransaction.bind(owner),legacy=f.BF.consumeInventoryPool;
  // BASE has no operation receipt; cut at its first actual durable input debit.
  if(typeof f.runtime.pendingResearchTransactions==='function')owner.commitInventoryTransaction=(...a)=>{const v=commit(...a);assert(v);throw Error('cut after payment')};
  else f.BF.consumeInventoryPool=(...a)=>{const v=legacy(...a);assert(v);throw Error('cut after payment')};
 }
 if(cut==='after-result'||cut==='before-ack'){
  f.BF.progression.markInventoryTransactionApplied=(...a)=>{if(cut==='after-result')throw Error('cut after result');return false};
  if(typeof f.runtime.pendingResearchTransactions!=='function'){
   if(operation==='recipe'){const add=f.BF.Rations.add;f.BF.Rations={...f.BF.Rations,add(...a){const n=add(...a);throw Error('cut after result')}}}
   else {const save=f.memory.save.bind(f.memory);f.memory.save=()=>{save();throw Error('cut after result')}}
  }
 }
 let result;try{result=invoke()}catch(e){assert.match(e.message,/cut/)}
 if(cut==='registry-refused'){assert.equal(result,operation==='recipe'?0:false);assert.deepEqual(stock(f),before);restore();assert(invoke());return}
 // Verify actual storage key for mission-memory failure injection.
 if(cut==='result-refused'&&operation==='experiment')assert.equal(result,false,'a rejected result must remain pending');
 restore();const x=await reload(f);x.load('engine/survival-rations-v0-3.js');x.BF.canAccessCampInventory=()=>true;x.runtime.canAccessWorkbench=()=>true;
 for(let i=0;i<3;i++)x.runtime.reviewProximityContexts();
 if(operation==='recipe'){assert.equal(x.BF.Rations.snapshot().rations,1);assert.equal(x.BF.Rations.snapshot().craftedTotal,1)}else assert.equal(x.runtime.experimentMemory()[r.id]?.count,1);
 for(const q of stage?stage.requirements:r.requirements)assert.equal(x.BF.accessibleInventory(x.runtime.inventoryKeysForRequirement(q)),0);
 const final=stock(x),again=await reload(x);again.load('engine/survival-rations-v0-3.js');again.runtime.reviewProximityContexts();assert.deepEqual(stock(again),final);
 if(operation==='recipe')assert.equal(again.BF.Rations.snapshot().craftedTotal,1);else assert.equal(again.runtime.experimentMemory()[r.id].count,1);
});
test('ration transaction credit remains idempotent after consumption and reload',async()=>{const f=await research();assert.equal(f.BF.Rations.add(2,'test',{transactionId:'ration-proof'}),2);f.BF.getSurvivalState=()=>({energy:50});assert.equal(f.BF.Rations.consume(1),1);const x=await reload(f);x.load('engine/survival-rations-v0-3.js');assert.equal(x.BF.Rations.add(2,'test',{transactionId:'ration-proof'}),2);assert.equal(x.BF.Rations.snapshot().rations,1);assert.equal(x.BF.Rations.snapshot().craftedTotal,2)});
for(const accessible of [false,true])test(`recipe: shared camp stock is ${accessible?'accessible':'remote'}`,async()=>{const f=await research();recipe(f,'ration-basic-v2',1,true);f.BF.canAccessCampInventory=()=>accessible;assert.equal(f.runtime.craftResearchReward('ration-basic-v2'),accessible?1:0);assert.equal(f.BF.availableInventory('fiber'),accessible?0:2)});
// Geometry is a test double. Stock, receipt, map/site persistence and runtime owners are real.
const popSource=fs.readFileSync(path.join(ROOT,'tests/population-persistence.runtime.test.js'),'utf8');
const P=new Function('require','__dirname',popSource.slice(0,popSource.indexOf('\nfor(const [name'))+'\nreturn {environment,V,Group,Box};')(require,path.join(ROOT,'tests'));
async function beacon(seed,early=false){const f=await research();if(seed){for(const[k,v]of Object.entries(seed))f.store.set(k,v);f.load('engine/progression-registry.js');f.memory=new f.M.MissionMemory();f.manager.memory=f.memory;}
 const e=P.environment();
 f.BF.ObjectSpawner=e.BF.ObjectSpawner;f.BF.MicroScenes=e.BF.MicroScenes;f.BF.maps.remote={...plain(e.BF.maps.crystal),id:'remote',crashSite:null,constructionExclusionZones:[]};
 const built=e.populate(f.BF.maps.remote);built.options.group.userData.microScenes=built.s.microSceneInstances;
 f.engine.THREE={Group:P.Group,Vector3:P.V,Box3:P.Box};f.engine.currentMapId='remote';f.engine.currentMap=built.options;
 f.load('engine/persistent-micro-scenes-v20.js');f.BF.PersistentMicroScenes.spawnForBuiltMap(f.engine.THREE,f.engine.currentMap,f.BF.maps.remote);const registry=f.BF.progression;if(early)f.BF.progression=null;f.load('engine/special-object-runtime.js');f.BF.progression=registry;
 f.BF.MicroScenePlacement={suggest:()=>({anchor:{x:18,y:0,z:18}})};return f;}
for(const cut of ['none','after-payment','site-refused','after-site','before-ack','refund-refused'])test(`beacon: ${cut} retains payment, original site and restart`,async()=>{
 const f=await beacon();f.BF.grantInventory('deployed_beacon',1);assert.equal(f.BF.getExpeditionQuantity('deployed_beacon'),1);f.memory.flush(true);let restore=()=>{},refunded=false;
 if(cut==='after-payment'){const commit=f.BF.progression.commitInventoryTransaction.bind(f.BF.progression),consume=f.BF.consumeInventory;f.BF.consumeInventory=(...a)=>{consume(...a);throw Error('cut after payment')};f.BF.progression.commitInventoryTransaction=(...a)=>{const r=commit(...a);assert(r);throw Error('cut after payment')}}
 if(cut==='site-refused'){f.memory.flush=()=>false}
 if(cut==='after-site'){const spawn=f.BF.PersistentMicroScenes.spawnRecord;f.BF.PersistentMicroScenes={...f.BF.PersistentMicroScenes,spawnRecord(...a){const r=spawn(...a);assert(r);throw Error('cut after site')}}}
 if(cut==='before-ack')f.BF.progression.markInventoryTransactionApplied=()=>false;
 if(cut==='refund-refused'){f.BF.PersistentMicroScenes={...f.BF.PersistentMicroScenes,spawnRecord:()=>false};restore=failWrite(f,'bluefox_progression_registry_v1',2);refunded=true}
 try{f.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'})}catch(e){assert.match(e.message,/cut/)}restore();
 const x=await beacon(Object.fromEntries(f.store));if(refunded)x.BF.PersistentMicroScenes={...x.BF.PersistentMicroScenes,spawnRecord:()=>false};
 x.BF.SpecialObjectRuntime.update(x.engine.currentMap.group,0);
 assert.equal(x.BF.availableInventory('deployed_beacon'),refunded?1:0);
 const sites=Object.values(x.memory.state.siteProgression||{}).filter(s=>s.kind==='deployed_beacon');assert.equal(sites.length,refunded?0:1);if(!refunded){assert.equal(sites[0].mapId,'remote');assert.deepEqual(plain(sites[0].anchor),{x:18,y:0,z:18});const scene=x.engine.currentMap.group.userData.microScenes.find(r=>r.instanceId===sites[0].instanceId);assert(scene,'native persistent site must be instantiated after reload');assert.deepEqual(plain(scene.instanceRoot.position),sites[0].anchor)}
 const y=await beacon(Object.fromEntries(x.store));if(refunded)y.BF.PersistentMicroScenes={...y.BF.PersistentMicroScenes,spawnRecord:()=>false};y.BF.SpecialObjectRuntime.update(y.engine.currentMap.group,0);assert.equal(y.BF.availableInventory('deployed_beacon'),refunded?1:0);assert.equal(Object.values(y.memory.state.siteProgression||{}).filter(s=>s.kind==='deployed_beacon').length,refunded?0:1);
});
test('ration consumption: refused persistence does not consume or emit success',async()=>{const f=await research();f.BF.Rations.add(2);f.BF.getSurvivalState=()=>({energy:50});const events=[];f.window.addEventListener('bluefox:ration-consumed',e=>events.push(e));const before=plain(f.BF.Rations.snapshot()),restore=failWrite(f,'bluefox_personal_consumables_v1');assert.equal(f.BF.Rations.consume(1),0);assert.deepEqual(plain(f.BF.Rations.snapshot()),before);assert.equal(events.length,0);restore();assert.equal(f.BF.Rations.consume(1),1)});
for(const id of ['accumulator-basic-v1','deployed-beacon-v1'])test(`${id}: interrupted output and debit are atomic on reload`,async()=>{const f=await research(),r=recipe(f,id);f.memory.flush(true);const commit=f.BF.progression.commitInventoryTransaction.bind(f.BF.progression);f.BF.progression.commitInventoryTransaction=(...a)=>{const p=commit(...a);assert(p);throw Error('cut after atomic output')};if(typeof f.runtime.pendingResearchTransactions!=='function'){const old=f.BF.consumeInventoryPool;f.BF.consumeInventoryPool=(...a)=>{old(...a);throw Error('cut after first input')}}assert.throws(()=>f.runtime.craftResearchReward(id),/cut/);const x=await reload(f);x.runtime.reviewProximityContexts();const output=r.output.objectId||r.output.inventoryKey;assert.equal(x.BF.availableInventory(output),r.output.quantity||1);for(const q of r.requirements)assert.equal(x.BF.availableInventory(x.runtime.inventoryKeysForRequirement(q)),0)});
test('T13: resumed production counts ten new rations once, excluding historical rations',async()=>{
 const chain=fs.readFileSync(path.join(ROOT,'tests/mission-chain-integrity.runtime.test.js'),'utf8'),physical=fs.readFileSync(path.join(ROOT,'tests/mission-physical-contracts.runtime.test.js'),'utf8');
 const repair=fs.readFileSync(path.join(ROOT,'tests/mission-repair.runtime.test.js'),'utf8');
 const repairCode=repair.slice(0,repair.indexOf("\ntest('")).replace("const seed = process.env.BLUEFOX_SAVE ? JSON.parse(fs.readFileSync(process.env.BLUEFOX_SAVE, 'utf8')).state : {};",'const seed = seedState;');
 async function make(seed={}) {
  const cold=()=>new Function('require','__dirname','seedState',repairCode+'\nreturn fixture();')(require,path.join(ROOT,'tests'),seed);
  const core=new Function('fixture',chain.slice(chain.indexOf('async function runtimeFixture()'),chain.indexOf("\ntest('")).replace("  f.memory.state.missionLifecycle.T13 = { status: 'completed' };",'')+'\nreturn runtimeFixture;')(cold);
  const run=new Function('coreFixture',physical.slice(physical.indexOf('async function fixture()'),physical.indexOf('function physicalObject'))+'\nreturn fixture;')(core);
  const f=await run();f.runtime.connect();f.load('engine/survival-rations-v0-3.js');f.BF.canAccessCampInventory=()=>true;return f;
 }
 const f=await make();f.BF.Rations.add(4);const t=H.start(f,'T13'),node=t.find('T13:craftRations');assert.equal(node.progress,0);recipe(f,'ration-basic-v2',10);f.memory.flush(true);
 f.BF.progression.markInventoryTransactionApplied=()=>false;
 if(typeof f.runtime.pendingResearchTransactions==='function')assert.equal(f.runtime.craftResearchReward('ration-basic-v2',10),0);else{const add=f.BF.Rations.add;f.BF.Rations={...f.BF.Rations,add(...a){add(...a);throw Error('cut after ration output')}};assert.throws(()=>f.runtime.craftResearchReward('ration-basic-v2',10),/cut/)}assert.equal(node.progress,10);
 const r=await make(Object.fromEntries(f.store));r.runtime.reviewProximityContexts();const restored=r.manager.trees.get('T13');assert(restored);assert.equal(restored.find('T13:craftRations').progress,10);assert.equal(r.BF.Rations.snapshot().rations,14);assert.equal(restored.root.isComplete,false);
 const before=stock(r);r.runtime.reviewProximityContexts();assert.deepEqual(stock(r),before);assert.equal(restored.find('T13:craftRations').progress,10);
});
test('beacon pending on another map never installs there or blocks an independent placement',async()=>{
 const f=await beacon();f.BF.grantInventory('deployed_beacon',2);const commit=f.BF.progression.commitInventoryTransaction.bind(f.BF.progression);
 f.BF.progression.commitInventoryTransaction=(...a)=>{const r=commit(...a);assert(r);throw Error('cut after payment')};assert.throws(()=>f.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'}),/cut/);
 const x=await beacon(Object.fromEntries(f.store));x.BF.maps.other={...plain(x.BF.maps.remote),id:'other',persistentMicroScenes:[]};x.engine.currentMapId='other';x.BF.SpecialObjectRuntime.update(x.engine.currentMap.group,0);
 assert.equal(Object.values(x.memory.state.siteProgression||{}).filter(s=>s.kind==='deployed_beacon').length,0);assert.equal(x.BF.availableInventory('deployed_beacon'),1);
 assert.equal(x.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'}),true);assert.equal(x.BF.availableInventory('deployed_beacon'),0);
 x.engine.currentMapId='remote';x.BF.SpecialObjectRuntime.update(x.engine.currentMap.group,1);
 const sites=Object.values(x.memory.state.siteProgression||{}).filter(s=>s.kind==='deployed_beacon');assert.equal(sites.length,2);assert.deepEqual(sites.map(s=>s.mapId).sort(),['other','remote']);assert.equal(x.BF.availableInventory('deployed_beacon'),0);
});
test('beacon refund resumes after credit is durable but payment acknowledgment is interrupted',async()=>{const f=await beacon();f.BF.grantInventory('deployed_beacon',1);f.BF.PersistentMicroScenes={...f.BF.PersistentMicroScenes,spawnRecord:()=>false};const commit=f.BF.progression.commitInventoryTransaction.bind(f.BF.progression),save=f.BF.progression.save.bind(f.BF.progression);f.BF.progression.save=(...a)=>{const ok=save(...a);if(!Object.values(f.BF.progression.state.transactions).some(r=>r.metadata?.owner==='special-beacon')&&f.BF.availableInventory('deployed_beacon')===1&&f.BF.getProgressionState().consumed.deployed_beacon===1)throw Error('cut after refund');return ok};f.BF.progression.commitInventoryTransaction=(id,...a)=>{const receipt=commit(id,...a);if(id.endsWith(':refund'))throw Error('cut after refund');return receipt};assert.throws(()=>f.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'}),/cut/);const x=await beacon(Object.fromEntries(f.store));x.BF.SpecialObjectRuntime.update(x.engine.currentMap.group,0);assert.equal(x.BF.availableInventory('deployed_beacon'),1);assert.equal(Object.values(x.memory.state.siteProgression||{}).filter(s=>s.kind==='deployed_beacon').length,0);x.BF.SpecialObjectRuntime.update(x.engine.currentMap.group,1);assert.equal(x.BF.availableInventory('deployed_beacon'),1)});

test('beacon recovery waits for ProgressionRegistry in the actual script load order',async()=>{const f=await beacon();f.BF.grantInventory('deployed_beacon',1);const commit=f.BF.progression.commitInventoryTransaction.bind(f.BF.progression),consume=f.BF.consumeInventory;f.BF.consumeInventory=(...a)=>{consume(...a);throw Error('cut after payment')};f.BF.progression.commitInventoryTransaction=(...a)=>{commit(...a);throw Error('cut after payment')};assert.throws(()=>f.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'}),/cut/);const x=await beacon(Object.fromEntries(f.store),true);x.BF.SpecialObjectRuntime.update(x.engine.currentMap.group,0);assert.equal(x.BF.availableInventory('deployed_beacon'),0);assert.equal(Object.values(x.memory.state.siteProgression||{}).filter(s=>s.kind==='deployed_beacon').length,1)});
test('BAL-03: three canonical arrivals then native beacon installation completes the mission',async()=>{
 const f=await beacon(),t=H.start(f,'BAL-03');f.BF.grantInventory('deployed_beacon',1);f.engine.currentMapId='crystal';
 for(const to of ['hop-a','hop-b','remote']){
  const from=f.engine.currentMapId;f.BF.maps[to]||={id:to,exits:{}};f.engine.currentMapId=to;f.engine.discoveredMaps.add(to);
  if(to==='remote')f.memory.setFact('tutorialExcursion:BAL-03',{generatedTargetMapId:to,travelNodeId:'BAL-03:reachRemoteMap'});
  f.window.dispatchEvent(new f.window.CustomEvent('bluefox:map-transition-completed',{detail:{fromMapId:from,toMapId:to,mapId:to,isNew:true,direction:'north',source:'manual',mode:'gate'}}));
 }
 assert.equal(t.find('BAL-03:reachRemoteMap').progress,3);assert.equal(t.find('BAL-03:deployBeacon').progress,0);
 assert.equal(f.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy',missionId:'BAL-03'}),true);
 assert.equal(t.find('BAL-03:deployBeacon').progress,1);assert.equal(f.manager.ensureLifecycle('BAL-03').status,'completed');
});
