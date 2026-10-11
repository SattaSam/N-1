const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = process.env.BLUEFOX_ROOT || path.resolve(__dirname, '..');
process.env.BLUEFOX_ROOT = ROOT;
const continuity = fs.readFileSync(path.join(ROOT, 'tests/mission-contract-continuity.runtime.test.js'), 'utf8');
const physical = fs.readFileSync(path.join(ROOT, 'tests/mission-physical-contracts.runtime.test.js'), 'utf8');
const H = new Function('require', '__dirname',
  continuity.slice(0, continuity.indexOf('\nfor (const m of catalog)')) +
  physical.slice(physical.indexOf('function nativeRoutines(f)'), physical.indexOf('function addResearch')) +
  '\nreturn {live,start,stage,catalog,nativeRoutines,physicalObject};')(require, path.join(ROOT, 'tests'));
const catalog = H.catalog;
function prepare(f, id, slot) {
  const m = catalog.find(m => m.id === id);
  for (const k of m.experimentalPrerequisites || []) f.memory.state.researchUnlocks[k] = { id: k, unlockedAt: 1 };
  for (const k of m.requiredFacts || []) if (typeof k === 'string') f.memory.setFact(k, true);
  const t = H.start(f, id); assert(t, id);
  if (slot) H.stage(f, m, t, slot);
  return t;
}
function selected(f, tree, now = 10000) {
  const action = f.manager.missionRunnableAction(tree.id, tree, f.manager.bridge.context());
  assert(action, `runnable ${tree.id}`);
  return f.manager.executeSelectedMissionAction({missionId: tree.id, action, primary: true}, now);
}
for (const family of ['CARN', 'STORM']) for (let i = 1; i <= 4; i++) {
  const id = `TERR-${family}-0${i}`;
  test(`${id}: publishing 100% cannot stand in for physical retreat`, async () => {
    const f = await H.live(); f.BF.getMapExplorationState = () => null;
    const t = prepare(f, id, 'retreat');
    f.memory.setFact(`bibleActivation:${id}`, {mapId: 'crystal'});
    f.BF.getMapExplorationState = () => ({surfacePercent: 100});
    f.manager.publish();
    assert.equal(t.find(`${id}:retreat`).progress, 0);
  });
}
for (const m of catalog) for (const s of m.sequence || []) {
  if (s.action !== 'research' || s.params?.catalogManaged || s.params?.eventDriven) continue;
  const next = m.sequence.filter(n => n.action === s.action && n.requires?.includes(s.slot) &&
    !n.params?.catalogManaged && !n.params?.eventDriven);
  if (!next.length) continue;
  test(`${m.id}:${s.slot}: routine cannot credit its locked successors`, async () => {
    const f = await H.live(); H.nativeRoutines(f); f.BF.getMapExplorationState = () => null;
    const t = prepare(f, m.id, s.slot), n = t.find(`${m.id}:${s.slot}`);
    for (const step of [s, ...next]) if (step.params?.requiredMapFact) {
      f.memory.setFact(step.params.requiredMapFact, {[step.params.requiredMapField || 'mapId']: 'crystal'});
    }
    assert(selected(f, t)); f.engine.updateRoutine(10000 + (Number(s.params?.duration) || 6500));
    assert.equal(n.progress, 1);
    for (const step of next) assert.equal(t.find(`${m.id}:${step.slot}`).progress, 0, step.slot);
  });
}
test('ordinary compatible research already opened still shares a real completion', async () => {
  const f = await H.live(); H.nativeRoutines(f); f.BF.getMapExplorationState = () => null;
  const a = prepare(f, 'ENE-02', 'isolatedStudy'), b = prepare(f, 'ENE-05', 'hypothesis');
  assert(selected(f, a)); f.engine.updateRoutine(16500);
  assert.equal(a.find('ENE-02:isolatedStudy').progress, 1);
  assert.equal(b.find('ENE-05:hypothesis').progress, 1);
});
for (const id of ['TERR-CARN-04', 'TERR-STORM-04']) {
  test(`${id}: native manager retains no ghost after synchronous proximity`, async () => {
    const f = await H.live(); f.BF.getMapExplorationState = () => null;
    const t = prepare(f, id), n = t.find(`${id}:approach`);
    f.memory.setFact(`bibleActivation:${id}`, {mapId: 'crystal'});
    f.engine.currentMap.interactables = [H.physicalObject(f, n.params.cuoType, 'hazard', n.params.microSceneId)];
    assert(selected(f, t)); assert.equal(n.progress, 1);
    assert.equal(f.manager.currentAction, null); assert.equal(t.find(`${id}:retreat`).progress, 0);
  });
}
for (const requiredMap of ['crystal', 'elsewhere']) {
  test(`native plateau arrival cannot add 1 to a percentage bound to ${requiredMap}`, async () => {
    const f = await H.live(); H.nativeRoutines(f); f.BF.getMapExplorationState = () => null;
    const t = prepare(f, 'CART-01', 'explore'); f.memory.setFact('cart01:map', {mapId: requiredMap});
    f.engine.updateCurrentZone = f.BF.__TestWorldEngine.prototype.updateCurrentZone;
    f.engine.saveZoneDiscovery = () => {}; f.engine.discoveryNumber = () => 1;
    f.engine.callbacks.onZoneChange = () => {};
    const zone = {index: 0, center: f.engine.character.root.position, name: 'zone'};
    f.engine.currentMap.zoneRegions = [zone]; f.engine.currentMap.definition = {name: 'Crystal'};
    f.engine.pendingZoneExploration = zone; f.manager.currentAction = null;
    f.engine.updateCurrentZone(10000, true); assert.equal(t.find('CART-01:explore').progress, 0);
  });
}
test('current percentage work is acknowledged without a fake percentage or double count', async () => {
  const f = await H.live(); H.nativeRoutines(f); f.BF.getMapExplorationState = () => null;
  const t = prepare(f, 'CART-01', 'explore'); f.memory.setFact('cart01:map', {mapId: 'crystal'});
  const n = t.find('CART-01:explore'); f.manager.currentAction = {missionId:t.id,nodeId:n.id,type:n.type,params:n.params};
  assert(f.manager.notifyActionCompleted(n.type, {mapId:'crystal',amount:1}));
  assert.equal(n.progress, 0); assert.equal(f.manager.currentAction, null);
  f.BF.getMapExplorationState = () => ({surfacePercent: 40}); f.manager.publish();
  assert.equal(n.progress, 40); assert(n.isComplete);
});
async function spatial(family, i, slot) {
  const f = await H.live(); H.nativeRoutines(f); f.BF.getMapExplorationState = () => null;
  f.engine.currentRoutine = null;
  f.engine.THREE = {Vector3: class {
    constructor(x=0,y=0,z=0) {this.x=x;this.y=y;this.z=z;}
    clone() {return new this.constructor(this.x,this.y,this.z);}
  }};
  f.load('engine/special-object-runtime.js');
  for (const name of ['missionSpatialDistance', 'updateMissionSpatial', 'updateCurrentZone']) {
    f.engine[name] = f.BF.__TestWorldEngine.prototype[name];
  }
  const id = `TERR-${family}-0${i}`, t = prepare(f, id), n = t.find(`${id}:approach`);
  f.memory.setFact(`bibleActivation:${id}`, {mapId:'crystal'});
  const object = H.physicalObject(f,n.params.cuoType,`${id}:hazard`,n.params.microSceneId);
  f.engine.currentMap.interactables = [object]; assert(selected(f,t));
  assert.equal(n.progress, 1); assert.equal(f.manager.currentAction, null);
  if (slot === 'retreat' && i !== 4) { f.completeNode(t.find(`${id}:exposure`)); t.refresh(); }
  return {f,t,object,id};
}
for (const family of ['CARN','STORM']) for (let i=1;i<=3;i++) {
  test(`TERR-${family}-0${i}: exposure requires physical approach then an uninterrupted native routine`, async () => {
    const {f,t,id} = await spatial(family,i,'exposure');
    f.engine.character.root.position.x = 20;
    assert(selected(f,t)); assert.equal(f.engine.currentRoutine,null);
    f.engine.updateCurrentZone(20000,true); assert.equal(t.find(`${id}:exposure`).progress,0);
    assert(f.engine.pendingZoneExploration);
    const destination = f.engine.pendingZoneExploration.destination;
    Object.assign(f.engine.character.root.position,{x:destination.x,z:destination.z});
    f.engine.updateCurrentZone(20000,true); assert(f.engine.currentRoutine);
    f.engine.updateRoutine(27000); assert.equal(t.find(`${id}:exposure`).progress,1);
    assert.equal(t.find(`${id}:retreat`).progress,0); assert.equal(f.manager.currentAction,null);
  });
}
test('leaving the danger or losing its source interrupts exposure without success', async () => {
  for (const removal of [false,true]) {
    const {f,t,id} = await spatial('CARN',1,'exposure'); assert(selected(f,t));
    assert(f.engine.currentRoutine);
    if(removal) f.engine.currentMap.interactables=[]; else f.engine.character.root.position.x=20;
    f.engine.updateRoutine(11000); assert.equal(f.engine.currentRoutine,null);
    assert.equal(t.find(`${id}:exposure`).progress,0); assert.equal(f.manager.currentAction,null);
  }
});
for (const family of ['CARN','STORM']) {
  test(`${family}: retreat works on fully explored map, only after real clearance`, async () => {
    const {f,t,id}=await spatial(family,4,'retreat');
    f.BF.getMapExplorationState=()=>({surfacePercent:100});
    f.engine.currentMap.zoneRegions=[]; f.BF.getExplorationSummary=()=>({maps:{}});
    assert(selected(f,t)); assert(f.engine.pendingZoneExploration);
    f.engine.updateCurrentZone(11000,true); assert.equal(t.find(`${id}:retreat`).progress,0);
    const d=f.engine.pendingZoneExploration.destination;
    Object.assign(f.engine.character.root.position,{x:d.x,z:d.z});
    f.engine.updateCurrentZone(12000,true); assert.equal(t.find(`${id}:retreat`).progress,1);
    assert.equal(f.manager.currentAction,null); assert.equal(f.engine.pendingZoneExploration,null);
  });
}
test('refused paths and a foreign hazard cannot validate spatial work', async () => {
  const {f,t,id,object}=await spatial('CARN',4,'retreat');
  f.engine.character.setTarget=()=>false; assert.equal(selected(f,t),false);
  assert.equal(t.find(`${id}:retreat`).progress,0); assert.equal(f.manager.currentAction,null);
  const foreign=H.physicalObject(f,'carnivorous_plant','foreign',object.userData.microSceneId);
  f.engine.currentMap.interactables=[foreign]; f.engine.character.setTarget=()=>true;
  assert.equal(f.manager.bridge.execute({missionId:id,nodeId:`${id}:retreat`,type:'explore-zone',params:t.find(`${id}:retreat`).params},10000),false);
});
test('cancelling a spatial approach clears physical work without completing the node', async () => {
  const {f,t,id}=await spatial('CARN',4,'retreat'); assert(selected(f,t));
  assert(f.engine.pendingZoneExploration); f.manager.cancelCurrentAction('player-priority');
  assert.equal(f.engine.pendingZoneExploration,null); assert.equal(f.manager.currentAction,null);
  assert.equal(t.find(`${id}:retreat`).progress,0);
});
test('native controller and path planner can reach exposure outside the plant collider', async () => {
  const {f,t,id}=await spatial('CARN',1,'exposure');
  class V {
    constructor(x=0,y=0,z=0){this.set(x,y,z);}
    set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
    copy(p){return this.set(p.x,p.y,p.z);}
    clone(){return new V(this.x,this.y,this.z);}
    distanceToSquared(p){return (this.x-p.x)**2+(this.y-p.y)**2+(this.z-p.z)**2;}
    distanceTo(p){return Math.sqrt(this.distanceToSquared(p));}
  }
  f.engine.THREE={Vector3:V};f.BF.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  f.load('engine/path-planner.js');f.load('engine/character-controller.js');
  const c=f.engine.character;c.root.position=new V(20,0,0);c.target=new V(20,0,0);
  Object.assign(c,{THREE:f.engine.THREE,finalTarget:new V(20,0,0),velocity:new V(),radius:0.64,
    colliders:[{position:new V(),radius:0.72}],walkableRegions:[],waypoints:[],autonomousRunThreshold:8,
    pathPlanner:new f.BF.PathPlanner(f.engine.THREE)});
  for(const name of ['setTarget','rebuildPath','constrainToWalkable','positionOverlapsCollider','stop'])c[name]=f.BF.CharacterController.prototype[name];
  assert(selected(f,t));const distance=Math.hypot(c.finalTarget.x,c.finalTarget.z);
  assert(distance>=0.72+c.radius);assert(distance<f.BF.SpecialObjectRuntime.hazardRadius('carnivorous_plant'));
  c.root.position.copy(c.finalTarget);f.engine.updateCurrentZone(11000,true);assert(f.engine.currentRoutine);
  f.engine.updateRoutine(18000);assert.equal(t.find(`${id}:exposure`).progress,1);
});
test('canonical navigation failure cancels spatial work immediately and records recovery',async()=>{
  const {f,t,id}=await spatial('CARN',4,'retreat');assert(selected(f,t));
  const world=fs.readFileSync(path.join(ROOT,'engine/world-engine.js'),'utf8');
  const body=world.slice(world.indexOf('      this.onNavigationFailed = () => {')+'      this.onNavigationFailed = () => {'.length,world.indexOf('      this.onVisibilityChange = () => {'));
  vm.runInContext('window.BlueFox3D.__navigationFailure = function () {'+body.replace(/};\s*$/,'')+'};',f.context);
  f.engine.navigationFailures=0;f.window.addEventListener('bluefox:navigation-failed',f.BF.__navigationFailure.bind(f.engine));
  f.window.dispatchEvent(new f.window.CustomEvent('bluefox:navigation-failed',{detail:{reason:'recovery-exhausted'}}));
  assert.equal(f.manager.currentAction,null);assert.equal(f.engine.pendingZoneExploration,null);
  assert.equal(t.find(`${id}:retreat`).progress,0);assert.equal(f.engine.navigationFailures,1);
  assert(f.manager.executionRecoveryStore().size>0);
});
test('reload retains the exact approach source and rejects a same-type substitute', async () => {
  const {f,t,id,object}=await spatial('STORM',4,'retreat');
  f.memory.saveTree(t); f.memory.flush(true);
  f.manager.memory=f.memory=new f.M.MissionMemory();
  f.manager.planner=f.planner=new f.M.MissionPlanner(f.memory);
  const restored=f.planner.restoreOrCreate(id);f.manager.trees.set(id,restored);f.manager.tree=restored;
  const foreign=H.physicalObject(f,'electrostatic_storm','substitute',object.userData.microSceneId);
  f.engine.currentMap.interactables=[foreign];assert.equal(selected(f,restored),false);
  f.engine.currentMap.interactables=[object];assert(selected(f,restored));
  const d=f.engine.pendingZoneExploration.destination;Object.assign(f.engine.character.root.position,{x:d.x,z:d.z});
  f.engine.updateCurrentZone(20000,true);assert.equal(restored.find(`${id}:retreat`).progress,1);
});
for(const family of ['CARN','STORM'])for(let i=1;i<=4;i++){
  test(`TERR-${family}-0${i}: native approach, exposure, withdrawal and recovery chain completes`,async()=>{
    const {f,t,id}=await spatial(family,i,i===4?'retreat':'exposure');
    f.engine.callbacks.onRest=()=>{};
    let now=10000;
    if(i!==4){assert(selected(f,t,now));f.engine.updateRoutine(now+7000);now+=8000;}
    assert(selected(f,t,now));const d=f.engine.pendingZoneExploration.destination;
    Object.assign(f.engine.character.root.position,{x:d.x,z:d.z});f.engine.updateCurrentZone(now+1000,true);
    assert.equal(t.find(`${id}:retreat`).progress,1);assert.equal(f.manager.currentAction,null);
    for(const slot of ['recover','restore'])if(t.find(`${id}:${slot}`)){
      now+=10000;assert(selected(f,t,now));f.engine.updateRoutine(now+8000);
      assert.equal(t.find(`${id}:${slot}`).progress,1);assert.equal(f.manager.currentAction,null);
    }
    assert(t.root.isComplete);
  });
}
function beaconFixture(bucket, options={}) {
  const store=new Map(), listeners=new Map();let installed=0, spec;
  const group={children:[],traverse(){}};
  const BF={maps:{remote:{id:'remote'},other:{id:'other'}},currentEngine:{THREE:{},currentMapId:'remote',currentMap:{group},character:{root:{position:{x:0,z:0}}},callbacks:{},missionManager:{memory:{state:{missionLifecycle:{}}}}},canAccessCampInventory:()=>false,PersistentMicroScenes:{list:()=>[],ensure(){},spawnRecord(){installed++;return options.renderFail?null:{}}},MicroScenePlacement:{suggest:()=>({anchor:{x:0,y:0,z:0}}),start(s){spec=s;return true;}}};
  const w={BlueFox3D:BF,console,Date,Math,JSON,Set,Map,WeakMap,Promise,CustomEvent:class{constructor(type,o={}){this.type=type;this.detail=o.detail}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},addEventListener(t,f){(listeners.get(t)||listeners.set(t,[]).get(t)).push(f)},dispatchEvent(e){for(const f of listeners.get(e.type)||[])f(e)},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){}};w.window=w;
  for(const file of ['engine/progression-registry.js','engine/special-object-runtime.js']) vm.runInNewContext(fs.readFileSync(path.join(ROOT,file),'utf8'),w);
  if(bucket==='camp')BF.grantCampStorage('deployed_beacon',1);else BF.grantInventory('deployed_beacon',1);
  return {BF,get installed(){return installed},get spec(){return spec}};
}
test('autonomous and manual beacon deployment refuse remote camp-only stock',()=>{
  for(const source of ['autonomy','player']) {
    const h=beaconFixture('camp'); assert.equal(h.BF.SpecialObjectRuntime.deployBeacon({source}),false);
    assert.equal(h.installed,0); assert.equal(h.BF.getProgressionState().campStorage.deployed_beacon,1);
    assert.equal(h.BF.availableInventory('deployed_beacon'),1);
  }
});
test('carried beacon is consumed once; render failure refunds it to the carried inventory',()=>{
  for(const renderFail of [false,true]) {
    const h=beaconFixture('bag',{renderFail});const ok=h.BF.SpecialObjectRuntime.deployBeacon({source:'autonomy'});
    assert.equal(ok,!renderFail); assert.equal(h.BF.getProgressionState().inventory.deployed_beacon,renderFail?1:0);
  }
});
test('manual beacon installation revalidates carried stock and current map',()=>{
  for(const changeMap of [false,true]) {
    const h=beaconFixture('bag'); assert(h.BF.SpecialObjectRuntime.deployBeacon({source:'player'}));
    if(changeMap)h.BF.currentEngine.currentMapId='other';else h.BF.consumeInventory('deployed_beacon',1);
    assert.equal(h.spec.onInstall({anchor:{x:0,y:0,z:0}}),false);assert.equal(h.installed,0);
  }
});
