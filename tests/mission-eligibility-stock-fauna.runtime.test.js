const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = process.env.BLUEFOX_ROOT || path.resolve(__dirname, '..');
process.env.BLUEFOX_ROOT = ROOT;
const vm = require('node:vm');
// Fixture de partie neuve : BLUEFOX_SAVE appartient aux tests de sauvegarde,
// jamais aux préconditions de ces scénarios d'éligibilité.
const repair = fs.readFileSync(path.join(ROOT, 'tests/mission-repair.runtime.test.js'), 'utf8');
const repairPrelude = repair.slice(0, repair.indexOf("\ntest('"));
const seedDeclaration = "const seed = process.env.BLUEFOX_SAVE ? JSON.parse(fs.readFileSync(process.env.BLUEFOX_SAVE, 'utf8')).state : {};";
assert(repairPrelude.includes(seedDeclaration), 'Cold fixture seed declaration changed');
const coldFixture = new Function('require', '__dirname',
  repairPrelude.replace(seedDeclaration, 'const seed = {};') + '\nreturn fixture;')(require, path.join(ROOT, 'tests'));
const chain = fs.readFileSync(path.join(ROOT, 'tests/mission-chain-integrity.runtime.test.js'), 'utf8');
const runtimeFixture = new Function('fixture',
  chain.slice(chain.indexOf('async function runtimeFixture()'), chain.indexOf("\ntest('")) +
  '\nreturn runtimeFixture;')(coldFixture);
const physical = fs.readFileSync(path.join(ROOT, 'tests/mission-physical-contracts.runtime.test.js'), 'utf8');
const physicalFixture = new Function('coreFixture',
  physical.slice(physical.indexOf('async function fixture()'), physical.indexOf('function physicalObject')) +
  '\nreturn fixture;')(runtimeFixture);
const catalogWindow = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data/bible-catalog.js'), 'utf8'), { window: catalogWindow });
const nativeRoutines = new Function('vm', 'fs', 'path', 'ROOT',
  physical.slice(physical.indexOf('function nativeRoutines(f)'), physical.indexOf('function addResearch')) +
  '\nreturn nativeRoutines;')(vm, fs, path, ROOT);
const H = {
  catalog: catalogWindow.BlueFox3D.BibleCatalog,
  nativeRoutines,
  async live() { const f = await physicalFixture(); f.runtime.connect(); return f; },
  start(f, id) {
    const m = H.catalog.find(m => m.id === id); assert(m, `Catalog mission missing: ${id}`);
    for (const p of m.prerequisites || []) f.memory.state.missionLifecycle[p] = { status: 'completed' };
    assert(f.M.getDefinition(id), `Mission definition not mounted: ${id}`);
    f.manager.startMission(id, { primary: true });
    const t = f.manager.trees.get(id);
    assert(t, `Mission tree not started: ${id}; lifecycle=${JSON.stringify(f.memory.state.missionLifecycle[id])}`);
    assert.equal(t.root.isComplete, false, `Unexpected completed tree: ${id}`);
    return t;
  },
  stage(f, m, t, slot) {
    for (const step of m.sequence) { if (step.slot === slot) break; f.completeNode(t.find(`${m.id}:${step.slot}`)); }
    t.refresh();
  }
};
const fauna = fs.readFileSync(path.join(ROOT, 'tests/fauna-r2-behaviors.runtime.test.js'), 'utf8');
const F = new Function('require', '__dirname', fauna.slice(0, fauna.indexOf("\ntest('")).replace('Math,Set', 'Math:Object.assign(Object.create(Math),{random:()=>0.5}),Set') +
  '\nreturn {runtime,makeRoot};')(require, path.join(ROOT, 'tests'));

function prepare(f,id) {
  const m=H.catalog.find(m=>m.id===id);
  for(const k of m.experimentalPrerequisites||[]) f.memory.state.researchUnlocks[k]={id:k,unlockedAt:1};
  for(const k of m.requiredFacts||[]) if(typeof k==='string') f.memory.setFact(k,true);
  return {m,t:H.start(f,id)};
}
function contextSite(f,c) {
  const root=f.object('tech_relic');
  Object.assign(root.userData,{microSceneId:c.microSceneId,persistentMicroSceneId:'context-site'});
  f.engine.currentMap.group={userData:{microScenes:[{id:c.microSceneId,instanceRoot:root}]}};
}
for(const id of ['SIS-03','TP-03','TP-05']) test(`${id}: locked experiment cannot spend materials`,async()=>{
  const f=await H.live(),{m,t}=prepare(f,id),c=m.proximityContexts.find(c=>c.inventoryConsume);
  contextSite(f,c); const req=c.inventoryConsume,keys=req.inventoryKeys||[req.inventoryKey];
  f.BF.grantInventory(keys[0],req.quantity); f.runtime.reviewProximityContexts();
  assert.equal(f.BF.availableInventory(keys),req.quantity);
  assert.equal(t.find(`${id}:${c.slot}`).progress,0);
  H.stage(f,m,t,c.slot);f.runtime.reviewProximityContexts();
  assert.equal(t.find(`${id}:${c.slot}`).progress,1);
  assert.equal(f.BF.availableInventory(keys),0);
  f.runtime.reviewProximityContexts();assert.equal(f.BF.availableInventory(keys),0);
});
for(const id of ['ENE-12','TP-04']) test(`${id}: visible remote camp stock cannot pay a local context`,async()=>{
  const f=await H.live(),{m,t}=prepare(f,id),c=m.proximityContexts.find(c=>c.inventoryConsume);
  contextSite(f,c);f.BF.canAccessCampInventory=()=>false;
  const req=c.inventoryConsume,keys=req.inventoryKeys||[req.inventoryKey];f.BF.grantCampStorage(keys[0],req.quantity);
  f.runtime.reviewProximityContexts();assert.equal(f.BF.availableInventory(keys),req.quantity);
  assert.equal(t.find(`${id}:${c.slot}`).progress,0);
  f.BF.grantInventory(keys[0],req.quantity);f.runtime.reviewProximityContexts();
  assert.equal(t.find(`${id}:${c.slot}`).progress,1);
  assert.equal(f.BF.getProgressionState().campStorage[keys[0]],req.quantity);
});
test('pool spending is atomic, camp-access aware and paid receipts survive departure',async()=>{
 const f=await H.live();f.BF.canAccessCampInventory=()=>false;
 f.BF.grantInventory('crystal',2);f.BF.grantCampStorage('crystal',3);
 assert.equal(f.BF.availableInventory('crystal'),5);
 assert.equal(f.BF.consumeInventoryPoolOnce('trial','crystal',4),0);
 assert.equal(f.BF.availableInventory('crystal'),5);
 f.BF.canAccessCampInventory=()=>true;
 assert.equal(f.BF.consumeInventoryPoolOnce('trial','crystal',4),4);
 f.BF.canAccessCampInventory=()=>false;
 assert.equal(f.BF.consumeInventoryPoolOnce('trial','crystal',4),4);
 assert.equal(f.BF.availableInventory('crystal'),1);
});
test('PHEN10: generic research cannot bypass workbench experiment and cost',async()=>{
 const f=await H.live(),{m,t}=prepare(f,'PHEN-10');H.stage(f,m,t,'experiment');H.nativeRoutines(f);
 f.engine.currentMap.group={userData:{microScenes:[]}};f.BF.getMapExplorationState=()=>null;
 const action=f.manager.missionRunnableAction(t.id,t,f.manager.bridge.context());
 if(action){f.manager.executeSelectedMissionAction({missionId:t.id,action,primary:true},10000);f.engine.updateRoutine(18000);}
 assert.equal(t.find('PHEN-10:experiment').progress,0);
 const c=m.proximityContexts.find(c=>c.inventoryConsume);contextSite(f,c);
 f.runtime.reviewProximityContexts();assert.equal(t.find('PHEN-10:experiment').progress,0);
 f.BF.grantInventory('crystal',6);f.runtime.reviewProximityContexts();
 assert.equal(t.find('PHEN-10:experiment').progress,1);assert.equal(f.BF.availableInventory('crystal'),0);
});
test('FAU03: native approach plus ObjectM0 rearms a real encounter after period change',async()=>{
 const f=await H.live(),h=F.runtime({period:'night'}),a=F.makeRoot('brouteur');
 h.BF.FaunaRuntime.register(a,'brouteur');f.BF.FaunaRuntime=h.BF.FaunaRuntime;
 const o=f.object('brouteur');o.userData.instanceId=a.userData.instanceId;o.userData.worldAnchor=a;
 f.engine.currentMap.interactables=[o];let cursor=0;
 const forward=()=>{for(const e of h.events.slice(cursor))f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED,o,{...e.detail,mapId:'crystal'});cursor=h.events.length;};
 const t=H.start(f,'FAU-03');for(let sec=.2;sec<=3;sec+=.2)h.step(sec,4.8,0);
 for(let sec=3.2;sec<=9;sec+=.2)h.step(sec,3,0);forward();assert.equal(t.find('FAU-03:firstPeriod').progress,1);
 h.setPeriod('day');
 // Actual native target/cautious methods, reinstalled under ObjectM0.
 vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/world-engine.js'),'utf8').replace('  BF.mount = async function mount(options) {','  BF.__TestWorld = WorldEngine;\n  BF.mount = async function mount(options) {'),f.context);
 const proto=f.BF.__TestWorld.prototype;
 for(const name of ['targetInteraction','missionFaunaResultTags','faunaInteractionState','isFau01CautiousInteraction','updateCautiousInteraction','interactionProfile']) if(proto[name])f.engine[name]=proto[name];
 f.engine.__objectM0BridgePatched=false;f.BF.mount=async({engine})=>engine;f.load('engine/object-m0-bridge.js');await f.BF.mount({engine:f.engine});
 f.engine.noteLocalAutonomousDecision=()=>{};f.engine.showWorldMarker=()=>{};
 // Géométrie minimale ; le PathPlanner et le parcours faune restent natifs.
 const THREE={Vector3:a.position.constructor};
 f.load('engine/bluefox3d-core.js');f.load('engine/path-planner.js');f.engine.THREE=THREE;
 f.engine.character.root.position=new THREE.Vector3(3,0,0);
 f.engine.character.target=f.engine.character.root.position.clone();
 f.engine.character.radius=.64;f.engine.character.stopRadius=.12;
 f.engine.character.pathPlanner=new f.BF.PathPlanner(THREE);
 f.engine.currentMap.bounds=27;f.engine.currentMap.colliders=[];
 f.engine.interactionApproachPoint=proto.interactionApproachPoint;
 f.engine.interactionApproachNavigationActive=()=>false;
 let target=3;f.engine.character.setTarget=point=>{target=point.x;f.engine.character.target=point.clone();return true;};
 const n=t.find('FAU-03:oppositePeriod'),action={missionId:t.id,nodeId:n.id,type:n.type,params:n.params};
 f.manager.currentAction=action;assert.equal(f.manager.bridge.execute(action,10000),true);
 assert(target>5.8,'new study must physically withdraw beyond encounter reset');
 assert.equal(n.progress,0);
 // Follow the targets produced by the real approach FSM; producer observes
 // actual distances and time, without injecting any behavior tag.
 for(let sec=10;sec<30 && !n.isComplete;sec+=.2){
   f.engine.character.root.position.x=target;f.engine.character.root.position.z=0;
   h.step(sec,target,0);forward();f.engine.updateInteraction(sec*1000);
 }
 assert.equal(n.progress,1);assert.equal(t.root.isComplete,true);
 assert.deepEqual(h.events.filter(e=>e.detail.tags.includes('calm_nearby')).map(e=>e.detail.period),['night','day']);
 assert.equal(Object.values(h.facts).find(v=>typeof v==='number'&&v===2),2);
});
