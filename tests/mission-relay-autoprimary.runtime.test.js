const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT,p),'utf8');

function boot() {
  const listeners = new Map();
  class CE { constructor(type,opts={}){this.type=type;this.detail=opts.detail;} }
  const window={BlueFox3D:{},CustomEvent:CE,console,performance,Date,Math,JSON,Set,Map,WeakMap,
    localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
    removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
    dispatchEvent(e){for(const fn of [...(listeners.get(e.type)||[])])fn(e);return true;},
    setTimeout(){return 1;},clearTimeout(){},setInterval(){return 1;},clearInterval(){},queueMicrotask(fn){fn();}};
  window.window=window;
  const BF=window.BlueFox3D;
  const definitions={};
  class Node { constructor(id){this.id=id;this.type='observe';this.title=id;this.params={};this.target=1;this.progress=0;this.status='available';this.isComplete=false;} increment(n=1){this.progress+=n;this.isComplete=this.progress>=this.target;this.status=this.isComplete?'completed':'active';return true;} }
  class Tree { constructor(id){this.id=id;this.title=id;this.description=id;this.node=new Node(`${id}:step`);this.root={status:'active',isComplete:false,completedAt:0,walk:cb=>cb(this.node)};} availableLeaves(){return this.node.isComplete?[]:[this.node];} find(id){return id===this.node.id?this.node:null;} refresh(){this.root.isComplete=this.node.isComplete;this.root.status=this.node.isComplete?'completed':'active';if(this.root.isComplete&&!this.root.completedAt)this.root.completedAt=Date.now();} toJSON(){return{id:this.id,title:this.title,root:{status:this.root.status,children:[]}};} }
  class Memory { constructor(){this.state={missionLifecycle:{},missions:{},pendingActivations:{},activeMissionIds:[],primaryMissionId:'',activeMissionId:'',researchUnlocks:{}};} save(){} saveTree(t){this.state.missions[t.id]=t.toJSON();} remember(){} getFact(){return null;} setFact(){} }
  class Planner { constructor(memory){this.memory=memory;} restoreOrCreate(id){return new Tree(id);} nextAction(t){const n=t.availableLeaves()[0];return n?{nodeId:n.id,type:n.type,title:n.title,params:{},issuedAt:Date.now()}:null;} applyCompletion(t,a){const n=t.find(a.nodeId);if(!n)return false;n.increment(1);t.refresh();return true;} }
  class Bridge { constructor(engine){this.engine=engine;} isEngineBusy(){return false;} context(){return{needs:{},energy:100};} execute(){return true;} }
  BF.Missions={definitions,getDefinition:id=>definitions[id]||null,MissionMemory:Memory,MissionPlanner:Planner,ActionBridge:Bridge,
    MissionStatus:{AVAILABLE:'available',ACTIVE:'active',COMPLETED:'completed',PAUSED:'paused',FAILED:'failed'},
    ActionType:{OBSERVE:'observe',COLLECT:'collect',EXTRACT:'extract',REST:'rest',EAT:'eat',TRAVEL:'travel'},normalizeActionType:v=>String(v||'')};
  BF.getAutonomyMode=()=> 'full'; BF.getProgressionState=()=>({inventory:{}}); BF.registerMissionDefinitions=list=>{for(const d of list)definitions[d.id]=d;return list.length;};
  const context=vm.createContext({window,CustomEvent:CE,console,performance,Date,Math,JSON,Set,Map,WeakMap,setTimeout:window.setTimeout,clearTimeout:window.clearTimeout,queueMicrotask:window.queueMicrotask});
  vm.runInContext(read('engine/mission-manager.js'),context,{filename:'mission-manager.js'});
  vm.runInNewContext(read('data/bible-catalog.js'),{window,console,Object,Array,Map,Set,Math,JSON},{filename:'bible-catalog.js'});
  for(const m of BF.BibleCatalog) definitions[m.id]={id:m.id,title:m.title,priority:Number(m.priority)||0,root:{}};
  BF.BibleContractV01={validateCatalog(){return{ok:true,errors:[],warnings:[]};}}; BF.BiblePatterns=new Proxy({}, {get(){return{steps:[]};}});
  let src=read('engine/bible-runtime-v0-1-unified.js').replace('const runtime = new BibleRuntimeV01();','const runtime = Object.create(BibleRuntimeV01.prototype); runtime.catalog=[]; runtime.byId=new Map(); runtime.dynamicMissions=new Map(); runtime.state={};').replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/m,'\n})(window);\n');
  vm.runInContext(src,context,{filename:'bible-runtime-v0-1-unified.js'});
  const engine={currentMapId:'crystal',callbacks:{onAction(){},onStatus(){}},pendingInteraction:null,currentRoutine:null,pendingGate:null,pendingZoneExploration:null,transitioning:false,character:{root:{position:{distanceTo(){return 0;}}},target:{}}};
  const manager=BF.Missions.MissionManager.create({engine}); engine.missionManager=manager; BF.currentEngine=engine; BF.getMissionState=()=>manager.getState();
  const Runtime=BF.BibleRuntimeV01; const runtime=Object.create(Runtime.prototype); runtime.catalog=BF.BibleCatalog;runtime.byId=new Map(runtime.catalog.map(m=>[m.id,m]));runtime.dynamicMissions=new Map();runtime.state={triggerCounts:{},uniqueTriggerValues:{},progressNarrative:{},effectsApplied:{},gatesSatisfied:{},activationInventoryCredits:{},constructionInstances:{},localMissionInstances:{},faunaMissionInstances:{}};runtime.missionLifecycleStatuses=new Map();runtime.isResearchRewardUnlocked=id=>Boolean(manager.memory.state.researchUnlocks?.[id]);runtime.completionGateState=()=>({managed:false,canFinalize:true});BF.bibleRuntime=runtime;
  return {BF,manager,runtime};
}

function complete(manager,id){
  const tree=manager.trees.get(id); assert.ok(tree,`${id} tree missing`);
  tree.node.increment(1); tree.refresh(); manager.memory.saveTree(tree);
  manager.syncLifecycleFromTrees();
  return manager.reevaluatePendingActivations();
}


test('catalog relay graph has no broken prerequisite or mission_completed references',()=>{
  const {BF}=boot();
  const ids=new Set(BF.BibleCatalog.map(m=>m.id));
  const missing=[];
  for(const mission of BF.BibleCatalog) {
    for(const prerequisite of mission.prerequisites||[]) if(!ids.has(prerequisite)) missing.push([mission.id,prerequisite]);
  }
  assert.deepEqual(missing,[],'all declared mission prerequisites must resolve');
  const relays=BF.BibleCatalog.filter(m=>m.trigger?.type==='progression.mission_completed');
  assert.equal(relays.length,240,'relay baseline changed: review catalog graph');
  const invalid=relays.filter(m=>!ids.has(m.trigger.missionId)||!(m.prerequisites||[]).includes(m.trigger.missionId));
  assert.equal(Array.from(invalid).length,0,'mission_completed source must exist and be an explicit prerequisite');
});

test('bootstrap registers every initialState mission with MissionManager; future missions stay hidden/pending',()=>{
  const {BF,manager,runtime}=boot();
  const initial=BF.BibleCatalog.filter(m=>m.initialState==='active');
  runtime.activateInitialMissions();
  assert.equal(initial.length,20,'catalog baseline changed: review bootstrap contract');
  assert.equal(manager.memory.state.missionLifecycle.T01?.status,'active');
  for(const m of initial.filter(m=>m.id!=='T01')){
    assert.equal(manager.memory.state.missionLifecycle[m.id]?.status,'hidden',`${m.id} must be hidden pending`);
    const p=manager.memory.state.pendingActivations[m.id]; assert.ok(p,`${m.id} must have canonical pending request`);
  }
});

test('foundation gate is represented as T08 pending prerequisite for post-foundation initial missions, without early activation',()=>{
  const {manager,runtime}=boot(); runtime.activateInitialMissions();
  for(const id of ['GAME-base','GAME-civilization_1','GAME-engineering_1','GAME-engineering_3','ENE-11','FLO-01']){
    const p=manager.memory.state.pendingActivations[id]; assert.ok(p,`${id} pending missing`);
    assert.equal(p.prerequisites.includes('T08'),true,`${id} must remain gated by T08 in canonical pending`);
    assert.equal(manager.memory.state.missionLifecycle[id]?.status,'hidden');
  }
  assert.equal(manager.memory.state.pendingActivations.T02.prerequisites.includes('T08'),false,'tutorial T02 must not gain artificial T08 prerequisite');
  assert.equal(manager.memory.state.pendingActivations['GAME-shelter'].prerequisites.includes('T08'),false,'shelter is deliberate tutorial exception');
});

test('canonical pending relay handles the unambiguous tutorial links T01→T02→T03',()=>{
  const {manager,runtime}=boot(); runtime.activateInitialMissions();
  complete(manager,'T01');
  assert.equal(manager.memory.state.missionLifecycle.T02?.status,'active','T02 must leave pending after T01');
  assert.equal(manager.memory.state.pendingActivations.T02,undefined);
  complete(manager,'T02');
  assert.equal(manager.memory.state.missionLifecycle.T03?.status,'active','T03 must leave pending after T02');
  assert.equal(manager.memory.state.pendingActivations.T03,undefined);
});

test('T09→T10 historical contract is preserved: T10 leaves pending and keeps explicit Top1 metadata',()=>{
  const {manager,runtime}=boot(); runtime.activateInitialMissions();
  // Isolate the historical T10 request while preserving the real stored options.
  for(const key of Object.keys(manager.memory.state.pendingActivations)) if(key!=='T10') delete manager.memory.state.pendingActivations[key];
  manager.ensureLifecycle('T09').status='completed';
  manager.reevaluatePendingActivations();
  assert.equal(manager.memory.state.missionLifecycle.T10?.status,'active');
  assert.equal(manager.primaryMissionId,'T10');
  assert.equal(manager.memory.state.missionLifecycle.T10.autoPrimaryEligible,true);
});

test('experimental pending remains blocked until both mission and research prerequisites are satisfied',()=>{
  const {manager,runtime}=boot(); runtime.activateInitialMissions();
  const id='GAME-engineering_3'; const p=manager.memory.state.pendingActivations[id]; assert.ok(p); assert.deepEqual(Array.from(p.experimentalPrerequisites),['materials_science']);
  manager.ensureLifecycle('T08').status='completed'; manager.ensureLifecycle('GAME-engineering_2').status='completed';
  manager.reevaluatePendingActivations();
  assert.equal(manager.memory.state.missionLifecycle[id].status,'hidden','research lock must keep mission pending');
  manager.memory.state.researchUnlocks.materials_science={unlockedAt:Date.now()};
  // Other ready pending requests may win first; isolate the canonical request to test its predicate.
  for(const key of Object.keys(manager.memory.state.pendingActivations)) if(key!==id) delete manager.memory.state.pendingActivations[key];
  manager.reevaluatePendingActivations();
  assert.equal(manager.memory.state.missionLifecycle[id].status,'active');
});

test('catalog omission preserves MissionManager default eligibility without restoring R1 forced auto-promotion',()=>{
  const {manager,runtime}=boot(); runtime.activateInitialMissions();
  assert.equal(manager.memory.state.missionLifecycle.T01.autoPrimaryEligible,true,'catalog omission must preserve MissionManager default eligibility');
  assert.equal(manager.memory.state.pendingActivations.T02.options.autoPrimaryEligible,undefined,'pending omission must remain tri-state, not false');
  assert.equal(manager.memory.state.pendingActivations.T10.options.autoPrimaryEligible,true,'explicit true must remain true');
  assert.equal(manager.primaryMissionId,'','activation itself must not restore R1 forced auto-promotion');
  assert.equal(manager.selectBestPrimary(performance.now(),true),true,'canonical MissionManager arbitration must be able to promote T01');
  assert.equal(manager.primaryMissionId,'T01');
  complete(manager,'T01');
  assert.equal(manager.memory.state.missionLifecycle.T02.status,'active');
  assert.equal(manager.memory.state.missionLifecycle.T02.autoPrimaryEligible,true,'T02 omission must preserve default eligibility after pending relay');
  assert.equal(manager.primaryMissionId,'','pending activation itself must stay secondary before canonical arbitration');
  assert.equal(manager.selectBestPrimary(performance.now(),true),true,'canonical arbitration must be able to promote relayed T02');
  assert.equal(manager.primaryMissionId,'T02');
});

test('Bible activation preserves explicit false while absent stays undefined on all activation paths',()=>{
  const {BF,manager,runtime}=boot(); runtime.activateInitialMissions();

  const falseMission=BF.BibleCatalog.find(m=>m.id==='GAME-fire');
  assert.ok(falseMission);
  manager.ensureLifecycle('T08').status='completed';
  manager.ensureLifecycle('GAME-engineering_3').status='completed';
  assert.equal(runtime.activateMission(falseMission,{type:'manual'}),true);
  assert.equal(manager.memory.state.missionLifecycle['GAME-fire'].autoPrimaryEligible,false,'explicit false must remain false on direct Bible activation');

  const deferred={id:'TRI-DEFER',title:'Tri defer',pattern:'OBSERVE_TARGET',trigger:{type:'progression.mission_completed',missionId:'TRI-PRE',count:1},prerequisites:['TRI-PRE'],priority:1};
  runtime.catalog=[...runtime.catalog,deferred]; runtime.byId.set(deferred.id,deferred);
  BF.Missions.definitions['TRI-PRE']={id:'TRI-PRE',title:'pre',priority:1,root:{}};
  BF.Missions.definitions['TRI-DEFER']={id:'TRI-DEFER',title:'defer',priority:1,root:{}};
  runtime.consumeTriggerEvent({type:'progression.mission_completed',missionId:'TRI-PRE'},{allowActivation:true});
  assert.ok(manager.memory.state.pendingActivations['TRI-DEFER']);
  assert.equal(manager.memory.state.pendingActivations['TRI-DEFER'].options.autoPrimaryEligible,undefined,'deferred trigger omission must stay undefined');
});
