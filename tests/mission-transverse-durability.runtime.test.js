const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');process.env.BLUEFOX_ROOT=ROOT;
const source=fs.readFileSync(path.join(ROOT,'tests/mission-eligibility-stock-fauna.runtime.test.js'),'utf8');
const {H}=new Function('require','__dirname',source.slice(0,source.indexOf('\nfor(const id'))+'\nreturn {H};')(require,path.join(ROOT,'tests'));
const transfers=fs.readFileSync(path.join(ROOT,'tests/mission-transfer-resumption.runtime.test.js'),'utf8');
const {reload}=new Function('require','__dirname',transfers.slice(0,transfers.indexOf('\nfunction capacity'))+'\nreturn {reload};')(require,path.join(ROOT,'tests'));
const plain=x=>JSON.parse(JSON.stringify(x));
const stock=f=>{const s=f.BF.getProgressionState();return plain({inventory:s.inventory,camp:s.campStorage,consumed:s.consumed,allocation:s.expeditionAllocation,transactions:s.transactions})};
function refuseRegistry(f){const storage=f.window.localStorage,write=storage.setItem.bind(storage);storage.setItem=(key,value)=>{if(key==='bluefox_progression_registry_v1')throw Error('test: storage refused');return write(key,value)};return()=>storage.setItem=write;}
for(const [name,operation]of [
 ['grant',f=>f.BF.grantInventory('wood',2)],['camp grant',f=>f.BF.grantCampStorage('wood',2)],
 ['single debit',f=>f.BF.consumeInventory('wood',2)],['pool debit',f=>f.BF.consumeInventoryPool(['wood'],2)],
 ['once debit',f=>f.BF.consumeInventoryPoolOnce('durable-test',['wood'],2)],
 ['deposit',f=>f.BF.depositInventory('wood',2)],['withdraw',f=>f.BF.withdrawInventory('wood',2)],
 ['deposit all',f=>f.BF.progression.depositAllInventory()]
])test(`${name}: rejected registry write neither changes stock nor publishes success`,async()=>{
 const f=await H.live();f.BF.grantInventory('wood',7);f.BF.grantCampStorage('wood',5);const before=stock(f),events=[];
 f.window.addEventListener('bluefox:progression-changed',e=>events.push(e.detail));const resume=refuseRegistry(f);
 assert.equal(operation(f),0);assert.deepEqual(stock(f),before);assert.equal(events.length,0);resume();
 assert(operation(f)>0);const r=await reload(f);assert.deepEqual(stock(r),stock(f));
});
for(const id of ['GAME-engineering_1','GAME-engineering_3','ENE-09','TP-10'])test(`${id}: no completion receipt without durable payment; retry pays exactly once`,async()=>{
 const f=await H.live(),m=H.catalog.find(m=>m.id===id);
 for(const e of m.effects.filter(e=>e.type==='inventory.consume'))f.BF.grantInventory(f.runtime.inventoryKeysForRequirement(e)[0],e.quantity);
 const before=stock(f),resume=refuseRegistry(f);assert.equal(f.runtime.applyEffects(m),false);assert.deepEqual(stock(f),before);
 const receipt=`${f.runtime.repeatableEffectKey(m)}:completion:v${m.version||1}`;assert.equal(f.memory.hasEffectReceipt(receipt),false);
 resume();assert.equal(f.runtime.applyEffects(m),true);const paid=stock(f);assert.equal(f.runtime.applyEffects(m),true);assert.deepEqual(stock(f),paid);
 const r=await reload(f);assert.deepEqual(stock(r),paid);
});
for(const pool of [false,true])test(`ordinary ${pool?'pool':'single'} debit: provenance reconciles once after interruption before notification`,async()=>{
 const f=await H.live();f.BF.grantInventory('biocapital',25);f.manager.catalogController.setMemoryFact('civilization:trade:prismatic-orchid-balance',25);
 f.memory.flush(true);const publish=f.BF.progression.publishChange.bind(f.BF.progression);f.BF.progression.publishChange=()=>{throw Error('cut after durable debit')};
 assert.throws(()=>pool?f.BF.consumeInventoryPool(['biocapital'],20):f.BF.consumeInventory('biocapital',20),/cut/);
 f.BF.progression.publishChange=publish;const r=await reload(f);r.manager.catalogController.reconcileOrchidDebits();
 assert.equal(r.BF.getProgressionState().inventory.biocapital,5);assert.equal(r.manager.catalogController.orchidBalance(),5);
 r.manager.catalogController.reconcileOrchidDebits();assert.equal(r.manager.catalogController.orchidBalance(),5);
});
test('durable pool receipt cannot be reused for different resources or amount',async()=>{
 const f=await H.live();f.BF.grantInventory('wood',5);f.BF.grantInventory('fiber',5);
 assert.equal(f.BF.consumeInventoryPoolOnce('same',['wood'],2),2);
 assert.equal(f.BF.consumeInventoryPoolOnce('same',['wood'],3),0);assert.equal(f.BF.consumeInventoryPoolOnce('same',['fiber'],2),0);
 assert.equal(f.BF.consumeInventoryPoolOnce('same',['wood'],2),2);assert.equal(f.BF.getProgressionState().inventory.wood,3);
});
// Native drone fixture, including real registry and event bus; only meshes are stubs.
const field=fs.readFileSync(path.join(ROOT,'tests/r4b-field-repair.runtime.test.js'),'utf8');
const fieldPrefix=field.slice(0,field.indexOf("\nBF.grantCampStorage"));
function droneFixture(seed,lateRegistry=false){
 const pre=fieldPrefix.replace("run('engine/object-event-registry.js');","if(seed){store.clear();for(const [k,v]of Object.entries(seed))store.set(k,v);}run('engine/object-event-registry.js');");
 const ordered=pre.replace("run('engine/progression-registry.js');","if(!lateRegistry)run('engine/progression-registry.js');");
 return new Function('require','__dirname','seed','lateRegistry',ordered+"\nif(lateRegistry)run('engine/progression-registry.js');return {BF,R,store,window,run};")(require,path.join(ROOT,'tests'),seed,lateRegistry);
}
function craftContext(f){const map=f.BF.currentEngine.currentMapId;f.BF.currentEngine.missionManager={memory:{state:{siteProgression:{[map]:{stage:3}}}}};
 f.BF.Research.canAccessWorkbench=()=>true;f.BF.Research.isUnlocked=()=>true;f.BF.canAccessCampInventory=()=>true;
 for(const [key,q]of Object.entries(f.R.recipes.scout_drone))f.BF.grantInventory(key,q);
}
for(const operation of ['repair','craft'])test(`${operation}: a failed payment cannot create a partially paid result`,()=>{
 const f=droneFixture();if(operation==='repair'){f.BF.grantInventory('parts',4);f.BF.grantInventory('magnetic_ore',6)}else craftContext(f);
 f.R.failures();const before=plain(f.BF.getProgressionState()),special=f.R.snapshot();const resume=refuseRegistry(f);
 assert.equal(operation==='repair'?f.R.repairDrone('harvest-1'):f.R.craftDrone('scout_drone'),false);
 assert.deepEqual(f.R.snapshot(),special);assert.deepEqual(f.BF.getProgressionState().inventory,before.inventory);resume();
 assert.equal(operation==='repair'?f.R.repairDrone('harvest-1'):f.R.craftDrone('scout_drone'),true);
});
for(const operation of ['repair','craft'])for(const cut of ['after-debit','special-write','after-result'])test(`${operation}: ${cut} resumes native result and events without paying twice`,()=>{
 const f=droneFixture();if(operation==='repair'){f.BF.grantInventory('parts',4);f.BF.grantInventory('magnetic_ore',6)}else craftContext(f);
 const execute=()=>operation==='repair'?f.R.repairDrone('harvest-1'):f.R.craftDrone('scout_drone');
 if(cut==='after-debit'){
  const commit=f.BF.progression.commitInventoryTransaction.bind(f.BF.progression);f.BF.progression.commitInventoryTransaction=(...args)=>{const r=commit(...args);assert(r);throw Error('cut after debit')};
  assert.throws(execute,/cut/);
 }else if(cut==='special-write'){
  const write=f.window.localStorage.setItem.bind(f.window.localStorage);f.window.localStorage.setItem=(key,value)=>{if(key==='bluefox_special_objects_v1')throw Error('test: special save refused');write(key,value)};
  assert.equal(execute(),false);
 }else{
  f.BF.progression.markInventoryTransactionApplied=()=>{throw Error('cut after result')};assert.throws(execute,/cut/);
 }
 const paid=plain(f.BF.getProgressionState().inventory),r=droneFixture(Object.fromEntries(f.store));r.R.update({children:[],traverse(){}},0);
 assert.deepEqual(r.BF.getProgressionState().inventory,paid);
 if(operation==='repair'){assert.equal(r.R.snapshot().harvestFleet[0].failure,null);assert.equal(r.R.snapshot().harvestFleet[0].cargoTotal,17)}
 else assert.equal(r.R.snapshot().drones.scout_drone.crafted,true);
 const type=operation==='repair'?'OBJECT_REPAIRED':'OBJECT_CRAFTED';assert.equal(r.BF.getProgressionState().history.filter(e=>e.type===type).length,1);
 r.R.update({children:[],traverse(){}},0);assert.deepEqual(r.BF.getProgressionState().inventory,paid);
 assert.equal(r.BF.getProgressionState().history.filter(e=>e.type===type).length,1);
});
test('drone craft atomically uses carried plus shared camp stock only while camp is accessible',()=>{
 const f=droneFixture();craftContext(f);
 for(const [key,q]of Object.entries(f.R.recipes.scout_drone)){
  f.BF.consumeInventory(key,q);f.BF.grantInventory(key,Math.floor(q/2));f.BF.grantCampStorage(key,q-Math.floor(q/2));
 }
 const before=plain(f.BF.getProgressionState());f.BF.canAccessCampInventory=()=>false;
 assert.equal(f.R.craftDrone('scout_drone'),false);assert.deepEqual(f.BF.getProgressionState().campStorage,before.campStorage);
 f.BF.canAccessCampInventory=()=>true;assert.equal(f.R.craftDrone('scout_drone'),true);
 for(const key of Object.keys(f.R.recipes.scout_drone)){assert.equal(f.BF.getProgressionState().inventory[key]||0,0);assert.equal(f.BF.getProgressionState().campStorage[key]||0,0)}
});
test('an unpaid/unpublished drone result cannot suspend independent world hazards',()=>{
 const f=droneFixture();f.BF.grantInventory('parts',4);f.BF.grantInventory('magnetic_ore',6);
 const write=f.window.localStorage.setItem.bind(f.window.localStorage);f.window.localStorage.setItem=(key,value)=>{if(key==='bluefox_special_objects_v1')throw Error('special save refused');write(key,value)};
 try{f.R.repairDrone('harvest-1')}catch(error){assert.match(error.message,/special save refused/)}
 let hazards=0;f.BF.survival={applyHazard(){hazards++}};
 const root={userData:{libraryType:'carnivorous_plant',specialRuntimeRoot:true},position:{x:3,y:0,z:4},children:[]};
 f.R.update({children:[root],traverse(fn){fn(root)}},1);assert.equal(hazards,1);
});

for(const operation of ['repair','craft'])test(`${operation}: recovery also follows actual index.html load order`,()=>{
 const f=droneFixture();if(operation==='repair'){f.BF.grantInventory('parts',4);f.BF.grantInventory('magnetic_ore',6)}else craftContext(f);
 const commit=f.BF.progression.commitInventoryTransaction.bind(f.BF.progression);f.BF.progression.commitInventoryTransaction=(...args)=>{const receipt=commit(...args);assert(receipt);throw Error('cut after debit')};
 assert.throws(()=>operation==='repair'?f.R.repairDrone('harvest-1'):f.R.craftDrone('scout_drone'),/cut/);
 const paid=plain(f.BF.getProgressionState().inventory),r=droneFixture(Object.fromEntries(f.store),true);
 r.R.update({children:[],traverse(){}},0);assert.deepEqual(r.BF.getProgressionState().inventory,paid);
 if(operation==='repair')assert.equal(r.R.snapshot().harvestFleet[0].failure,null);else assert.equal(r.R.snapshot().drones.scout_drone.crafted,true);
});
