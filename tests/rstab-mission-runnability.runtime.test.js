const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class CustomEvent { constructor(type, init={}) { this.type=type; this.detail=init.detail; } }
const window = {
  BlueFox3D: { Missions: {}, maps: {} },
  addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; },
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},
  CustomEvent
};
const M = window.BlueFox3D.Missions;
M.ActionType = {
  COLLECT:'collect', EXTRACT:'extract', CRAFT:'craft', TRAVEL:'travel', REST:'rest', EAT:'eat',
  ANALYZE:'analyze', OBSERVE:'observe', INSPECT:'inspect', RESEARCH:'research', BUILD:'build', EXPLORE_ZONE:'explore-zone'
};
M.MissionStatus = { AVAILABLE:'available', ACTIVE:'active', COMPLETED:'completed', FAILED:'failed' };
M.normalizeActionType = x => String(x||'').toLowerCase();
M.definitions = {};
M.getDefinition = id => M.definitions[id] || null;
M.cloneDefinition = x => structuredClone(x);
M.MissionTree = class {};
M.MissionMemory = class {};
M.ActionBridge = class {};
M.MissionCatalogController = null;

const context = vm.createContext({window, CustomEvent, console, performance, structuredClone, Date, Set, Map});
vm.runInContext(fs.readFileSync('engine/mission-planner.js','utf8'), context, {filename:'mission-planner.js'});
vm.runInContext(fs.readFileSync('engine/mission-manager.js','utf8'), context, {filename:'mission-manager.js'});
const Planner = M.MissionPlanner;
const Manager = M.MissionManager;

function node(id,type,params={},progress=0,target=1){
  return { id, type, params, progress, target, title:id, createdAt:0, status:'available', get isComplete(){return this.progress>=this.target;} };
}
function tree(id,nodes, complete=false){
  const byId=new Map(nodes.map(n=>[n.id,n]));
  return {
    id, title:id, description:id,
    root:{isComplete:complete,walk(cb){nodes.forEach(cb)}},
    find(k){return byId.get(k)||null},
    availableLeaves(){return nodes.filter(n=>!n.isComplete)},
    toJSON(){return {id,root:{children:[]}}}
  };
}
function makeMemory(facts={}){
  const store={...facts};
  return {
    state:{missionLifecycle:{},pendingActivations:{},missions:{}},
    getFact(k,d=null){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:d},
    setFact(k,v){store[k]=v}, save(){}, saveTree(){}, remember(){},
    _facts:store
  };
}
function makeManager({defs,trees,primary='PRIMARY',facts={},route=true,bacLocal=true}){
  Object.assign(M.definitions,defs);
  const memory=makeMemory(facts);
  const engine={
    currentMapId:'map-A', currentMap:{interactables:[]}, discoveredMaps:new Set(['map-A','map-B']),
    pendingInteraction:null,currentRoutine:null,pendingGate:null,pendingZoneExploration:null,transitioning:false,
    character:{root:{position:{distanceTo(){return 0}}},target:{}}, callbacks:{onAction(){},onStatus(){}},
    findKnownRoute(from,to){ return route ? [from,to] : null; },
    handleNavigationSuggestion(detail){ this.lastNavigation=detail; },
    returnToBase(){ this.returned=true; }
  };
  const planner=new Planner(memory);
  const m=Object.create(Manager.prototype);
  Object.assign(m,{
    engine,memory,planner,primaryMissionId:primary,activeMissionId:primary,tree:trees.get(primary)||null,trees,
    activeMissionIds:[...trees.keys()],selectionReason:'test',pendingPrimaryMissionId:null,pendingPrimaryMissionReason:null,
    pendingPauseMissionId:null,lastPriorityReviewAt:0,currentAction:null,lastPlanAt:0,retryAfter:0,idleRetryUntil:0,enabled:true,
    bridge:{context:()=>({mapId:engine.currentMapId,resources:{wood:1},unexploredZones:0,explorationPercent:100,hasIncompleteDiscoveredMaps:false,canRoutine:true,needs:{},energy:80}),isEngineBusy:()=>false},
    catalogController:null
  });
  for(const id of m.activeMissionIds) memory.state.missionLifecycle[id]={status:'active',autoPrimaryEligible:true,narrativePriority:0,urgency:0};
  window.BlueFox3D.BAC={weightedPick(options){
    if(bacLocal){ const local=options.find(o=>o.missionId); if(local) return local; }
    return options.find(o=>o.transition)||options[0]||null;
  }};
  window.BlueFox3D.getAutonomyMode=()=> 'full';
  return m;
}

// A required-map primary is active but NOT locally runnable.
{
  const p=node('PRIMARY:study','observe',{requiredMapFact:'target',requiredMapField:'mapId'});
  const s=node('SIDE:study','analyze',{});
  const trees=new Map([['PRIMARY',tree('PRIMARY',[p])],['SIDE',tree('SIDE',[s])]]);
  const m=makeManager({defs:{PRIMARY:{priority:500},SIDE:{priority:250,instanceScope:'map',scopeId:'map-A'}},trees,facts:{target:{mapId:'map-B'}}});
  assert.equal(m.planner.nextAction(m.tree,m.bridge.context()),null,'remote leaf must not be locally runnable');
  const remote=m.primaryMissionTransition(m.bridge.context());
  assert.equal(remote?.source,'required-map');
  assert.equal(remote?.node?.params?.toMapId,'map-B');
  const intent=m.ensureMissionTransitionIntent(m.bridge.context());
  assert.equal(intent?.targetMapId,'map-B');
  assert.equal(intent?.deferMissionId,'SIDE','current-map secondary may defer departure');
  assert.equal(m.chooseRunnableMissionAction(m.bridge.context())?.missionId,'SIDE','secondary must remain executable while departure is deferred');

  s.progress=1; trees.get('SIDE').root.isComplete=true;
  assert.equal(m.shouldDeferMissionTransition('PRIMARY',m.bridge.context()),false,'completed local opportunity releases departure');
  assert.equal(m.resumeMissionTransitionIntent(m.bridge.context()),true,'primary travel resumes after local opportunity');
  assert.equal(m.engine.lastNavigation?.mapId,'map-B');

  m.engine.currentMapId='map-B';
  assert.equal(m.planner.nextAction(m.tree,m.bridge.context())?.nodeId,'PRIMARY:study','same leaf becomes runnable on target map');
  assert.equal(m.ensureMissionTransitionIntent(m.bridge.context()),null);
  assert.equal(m.memory.getFact('missionReturnIntent:PRIMARY')?.active,false,'generic intent clears on arrival');
  assert.equal(m.hasPrimaryMissionAuthority(),true,'runnable primary regains execution authority');
}

// A non-runnable primary with no resolvable destination must not monopolize execution authority.
{
  const p=node('PRIMARY:study','observe',{requiredMapFact:'missingTarget'});
  const s=node('SIDE:study','analyze',{});
  const trees=new Map([['PRIMARY',tree('PRIMARY',[p])],['SIDE',tree('SIDE',[s])]]);
  const m=makeManager({defs:{PRIMARY:{priority:500},SIDE:{priority:250}},trees});
  assert.equal(m.primaryMissionTransition(m.bridge.context()),null);
  assert.equal(m.hasPrimaryMissionAuthority(),false,'sterile primary must release BAC execution authority');
  assert.equal(m.chooseRunnableMissionAction(m.bridge.context())?.missionId,'SIDE');
}

// A known target without a known route also releases execution authority instead of freezing BlueFox.
{
  const p=node('PRIMARY:study','observe',{requiredMapFact:'target'});
  const trees=new Map([['PRIMARY',tree('PRIMARY',[p])]]);
  const m=makeManager({defs:{PRIMARY:{priority:500}},trees,facts:{target:{mapId:'map-B'}},route:false});
  const transition=m.primaryMissionTransition(m.bridge.context());
  assert.ok(transition);
  assert.equal(m.missionTransitionExecutable(transition),false);
  assert.equal(m.hasPrimaryMissionAuthority(),false);
}

// A completed tree waiting for a remote Bible completion gate becomes a transition, not an idle active lifecycle.
{
  const trees=new Map([['PRIMARY',tree('PRIMARY',[],true)]]);
  const m=makeManager({defs:{PRIMARY:{priority:500}},trees});
  window.BlueFox3D.bibleRuntime={completionGateState(){return {managed:true,canFinalize:false,targetMapId:'map-B'}}};
  const transition=m.primaryMissionTransition(m.bridge.context());
  assert.equal(transition?.source,'completion-gate');
  assert.equal(transition?.node?.params?.toMapId,'map-B');
  window.BlueFox3D.bibleRuntime=null;
}

// Only the idle/no-action backoff may be causally woken.
{
  const trees=new Map([['PRIMARY',tree('PRIMARY',[node('PRIMARY:x','analyze',{})])]]);
  const m=makeManager({defs:{PRIMARY:{}},trees});
  m.retryAfter=5000; m.idleRetryUntil=5000;
  assert.equal(m.wakeIdleRetry(100),true);
  assert.equal(m.retryAfter,100);
  m.retryAfter=4000; m.idleRetryUntil=0;
  assert.equal(m.wakeIdleRetry(100),false,'execution/post-action backoff must not be shortened');
  assert.equal(m.retryAfter,4000);
}


// Explicit event-driven TRAVEL keeps the historical transition path intact.
{
  window.BlueFox3D.maps['map-A']={exits:{}};
  const travel=node('PRIMARY:travel','travel',{eventDriven:true,newOnly:true,direction:'north'});
  const trees=new Map([['PRIMARY',tree('PRIMARY',[travel])]]);
  const m=makeManager({defs:{PRIMARY:{priority:500,navigation:{autonomousUnknownTravel:true}}},trees});
  const transition=m.primaryMissionTransition(m.bridge.context());
  assert.equal(transition?.node?.id,'PRIMARY:travel');
  assert.equal(m.missionTransitionExecutable(transition),true,'existing unknown-travel path stays executable');
  assert.equal(m.hasPrimaryMissionAuthority(),true,'real mission travel retains execution authority');
}

// Delegated runtime work (T13-style craft) still owns the mission cycle without a planner action.
{
  const craft=node('T13:craftRations','craft',{eventDriven:true},2,10);
  const side=node('SIDE:study','analyze',{});
  const trees=new Map([['T13',tree('T13',[craft])],['SIDE',tree('SIDE',[side])]]);
  const defs={T13:{priority:405,allowsAutonomousRationCraft:true,runtimeCounters:[{slot:'craftRations',source:'rations.craftedTotal'}],sequence:[{slot:'craftRations',action:'craft',params:{eventDriven:true}}]},SIDE:{priority:250}};
  const m=makeManager({defs,trees,primary:'T13'});
  assert.equal(m.delegatedRuntimeAction('T13')?.type,'craft');
  assert.equal(m.hasPrimaryMissionAuthority(),true,'delegated runtime primary keeps authority');
  assert.equal(m.chooseRunnableMissionAction(m.bridge.context()),null,'delegated runtime reserves MissionManager action cycle');
}

console.log('PASS R-STAB runnability/transition/deferral/authority');
