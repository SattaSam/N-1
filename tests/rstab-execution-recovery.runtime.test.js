const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = process.env.BLUEFOX_ROOT || path.resolve(__dirname, '..');
const managerSource = fs.readFileSync(path.join(root, 'engine/mission-manager.js'), 'utf8');

class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
const window = {
  BlueFox3D: { Missions: {} },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  CustomEvent
};
const M = window.BlueFox3D.Missions;
M.ActionType = {
  COLLECT:'collect', EXTRACT:'extract', CRAFT:'craft', TRAVEL:'travel', REST:'rest', EAT:'eat',
  ANALYZE:'analyze', OBSERVE:'observe', INSPECT:'inspect', RESEARCH:'research', BUILD:'build', EXPLORE_ZONE:'explore-zone'
};
M.MissionStatus = { AVAILABLE:'available', ACTIVE:'active', COMPLETED:'completed', FAILED:'failed' };
M.normalizeActionType = value => String(value || '').toLowerCase();
M.definitions = {};
M.getDefinition = id => M.definitions[id] || null;
M.MissionCatalogController = null;
const context = vm.createContext({ window, CustomEvent, console, performance, Date, Set, Map });
vm.runInContext(managerSource, context, { filename:'mission-manager.js' });
const Manager = M.MissionManager;

function node(id, type = 'observe', progress = 0, target = 1, params = {}) {
  return { id, type, progress, target, params, title:id, createdAt:0, status:'available', get isComplete(){ return this.progress >= this.target; } };
}
function tree(id, nodes) {
  const byId = new Map(nodes.map(entry => [entry.id, entry]));
  return {
    id, title:id, description:id,
    root:{ isComplete:false, walk(cb){ nodes.forEach(cb); } },
    availableLeaves(){ return nodes.filter(entry => !entry.isComplete); },
    find(key){ return byId.get(key) || null; },
    toJSON(){ return { id, root:{ children:[] } }; }
  };
}
function planner() {
  return {
    nextAction(t) {
      const n = t.availableLeaves()[0];
      return n ? { id:`${n.id}:${n.progress + 1}`, nodeId:n.id, type:n.type, title:n.title, params:{...n.params}, issuedAt:Date.now() } : null;
    },
    requiredMapState(n, ctx) {
      const key = n?.params?.requiredMapFact;
      if (!key) return { constrained:false, runnable:true, targetMapId:'' };
      const fact = this.memory?.getFact?.(key, null);
      const targetMapId = String(fact?.mapId || '');
      const currentMapId = String(ctx?.mapId || '');
      return { constrained:true, runnable:Boolean(targetMapId && targetMapId === currentMapId), targetMapId, currentMapId };
    }
  };
}
function makeManager({nodes=[node('P:a')], secondaryNodes=[], bridgeExecute=()=>false, player=false, facts={}} = {}) {
  const pTree = tree('P', nodes);
  const trees = new Map([['P', pTree]]);
  if (secondaryNodes.length) trees.set('S', tree('S', secondaryNodes));
  const state = { missionLifecycle:{ P:{status:'active',autoPrimaryEligible:true,narrativePriority:0,urgency:0,selectionReason:player?'Priorité suggérée par le joueur.':'test'} }, missions:{}, pendingActivations:{} };
  if (secondaryNodes.length) state.missionLifecycle.S = {status:'active',autoPrimaryEligible:true,narrativePriority:0,urgency:0};
  const factStore = {...facts};
  const memory = {
    state,
    getFact(key, d=null){ return Object.prototype.hasOwnProperty.call(factStore,key) ? factStore[key] : d; },
    setFact(key,val){ factStore[key]=val; },
    remember(){}, save(){}, saveTree(){}
  };
  const p = planner(); p.memory = memory;
  const engine = {
    currentMapId:'map-A', currentMap:{interactables:[]},
    pendingInteraction:null,currentRoutine:null,pendingGate:null,pendingZoneExploration:null,transitioning:false,
    character:{root:{position:{distanceTo(){return 0}}},target:{}},
    callbacks:{onAction(){},onStatus(){}},
    cancelMissionInteraction(){}, findKnownRoute(){return null;}, findOptimalRoute(){return null;}
  };
  const manager = Object.create(Manager.prototype);
  Object.assign(manager, {
    engine, memory, planner:p, trees, tree:pTree,
    primaryMissionId:'P', activeMissionId:'P', activeMissionIds:[...trees.keys()],
    selectionReason:player?'Priorité suggérée par le joueur.':'test',
    currentAction:null, pendingPrimaryMissionId:null,pendingPrimaryMissionReason:null,pendingPauseMissionId:null,
    lastPriorityReviewAt:1e12,lastPlanAt:0,retryAfter:0,idleRetryUntil:0,enabled:true,persistenceHydrationBlocked:false,
    executionRecovery:new Map(), catalogController:null,
    bridge:{
      context:()=>({mapId:engine.currentMapId,resources:{},unexploredZones:0,explorationPercent:100,hasIncompleteDiscoveredMaps:false,canRoutine:true,needs:{},energy:80}),
      isEngineBusy:()=>false,
      execute:bridgeExecute
    }
  });
  M.definitions.P = { priority:500 };
  if (secondaryNodes.length) M.definitions.S = { priority:250 };
  window.BlueFox3D.BAC = { weightedPick(options){ return options.find(option => option.candidate)?.candidate ? options.find(option => option.candidate) : options[0]; } };
  window.BlueFox3D.getAutonomyMode = () => 'full';
  return manager;
}

assert.equal(typeof Manager.prototype.recordExecutionFailure, 'function', 'R-STAB recovery owner missing');
assert.equal(typeof Manager.prototype.missionRunnableAction, 'function', 'recovery-aware mission selection missing');

// 1-2 failures preserve historical retries; the third suppresses only this node.
{
  const a=node('P:a'), b=node('P:b','analyze');
  const m=makeManager({nodes:[a,b]});
  const action={missionId:'P',nodeId:'P:a',type:'observe'};
  assert.equal(m.recordExecutionFailure(action,'execute-false',100).count,1);
  assert.equal(m.isExecutionNodeSuppressed('P','P:a',{mapId:'map-A'},101),false);
  assert.equal(m.recordExecutionFailure(action,'execute-false',200).count,2);
  assert.equal(m.isExecutionNodeSuppressed('P','P:a',{mapId:'map-A'},201),false);
  const third=m.recordExecutionFailure(action,'execute-false',300);
  assert.equal(third.count,3);
  assert.equal(third.suppressedUntil,20300);
  assert.equal(m.isExecutionNodeSuppressed('P','P:a',{mapId:'map-A'},301),true);
  assert.equal(m.missionRunnableAction('P',m.tree,m.bridge.context(),301).nodeId,'P:b','sibling leaf must stay runnable');
  assert.equal(m.ensureLifecycle('P').status,'active','recovery must not fail/pause lifecycle');
}

// Suppression is map-scoped and expires cleanly.
{
  const m=makeManager();
  const action={missionId:'P',nodeId:'P:a',type:'observe'};
  m.recordExecutionFailure(action,'execute-false',100);
  m.recordExecutionFailure(action,'execute-false',200);
  m.recordExecutionFailure(action,'execute-false',300);
  assert.equal(m.isExecutionNodeSuppressed('P','P:a',{mapId:'map-B'},301),false,'another map must not inherit suppression');
  assert.equal(m.isExecutionNodeSuppressed('P','P:a',{mapId:'map-A'},20301),false,'suppression must expire');
}

// Real node progress clears pressure even before timeout.
{
  const a=node('P:a', 'observe', 0, 2);
  const m=makeManager({nodes:[a]});
  const action={missionId:'P',nodeId:'P:a',type:'observe'};
  m.recordExecutionFailure(action,'execute-false',100);
  m.recordExecutionFailure(action,'execute-false',200);
  m.recordExecutionFailure(action,'execute-false',300);
  a.progress=1;
  assert.equal(m.isExecutionNodeSuppressed('P','P:a',{mapId:'map-A'},400),false,'real progress resets recovery');
  assert.equal(m.executionRecovery.size,0);
}

// Player Top1 remains primary but releases physical authority while its only leaf is suppressed.
{
  const m=makeManager({player:true});
  const action={missionId:'P',nodeId:'P:a',type:'observe'};
  m.recordExecutionFailure(action,'execute-false',100);
  m.recordExecutionFailure(action,'execute-false',200);
  m.recordExecutionFailure(action,'execute-false',300);
  assert.equal(m.primaryMissionId,'P');
  assert.equal(m.isPlayerSelectedPrimary(),true);
  assert.equal(m.hasPrimaryMissionAuthority(),false,'suppressed Top1 must not freeze BAC');
  assert.equal(m.primaryMissionId,'P','player choice must remain primary');
}

// A secondary can take over mission work while primary node is suppressed.
{
  const m=makeManager({secondaryNodes:[node('S:a','analyze')]});
  const action={missionId:'P',nodeId:'P:a',type:'observe'};
  m.recordExecutionFailure(action,'execute-false',100);
  m.recordExecutionFailure(action,'execute-false',200);
  m.recordExecutionFailure(action,'execute-false',300);
  assert.equal(m.chooseRunnableMissionAction(m.bridge.context()).missionId,'S');
}

// Three real execute=false updates feed recovery; no synthetic mission failure is created.
{
  const m=makeManager({bridgeExecute:()=>false});
  for(const now of [2000,7000,12000]) { m.retryAfter=0; m.lastPlanAt=0; m.update(now); }
  const entry=m.executionRecoveryEntry('P','P:a','map-A',12001);
  assert.equal(entry.count,3);
  assert.ok(entry.suppressedUntil>12000);
  assert.equal(m.ensureLifecycle('P').status,'active');
  assert.equal(m.hasPrimaryMissionAuthority(),false);
}

// Repeated runtime cancellations feed recovery, but manual free mode never does.
{
  const m=makeManager();
  for(const [i,reason] of ['interaction-inaccessible','object-inactive','object-definition-missing'].entries()) {
    m.currentAction={missionId:'P',nodeId:'P:a',type:'observe',title:'A'};
    m.cancelCurrentAction(reason);
  }
  assert.equal(m.executionRecoveryEntry('P','P:a','map-A',performance.now()).count,3);
  const before=m.executionRecovery.size;
  m.currentAction={missionId:'P',nodeId:'P:a',type:'observe',title:'A'};
  m.cancelCurrentAction('manual-free-mode');
  assert.equal(m.executionRecovery.size,before,'manual player suspension must not count as failure');
}

// Orphan watchdog feeds the same recovery channel.
{
  const m=makeManager();
  m.currentAction={missionId:'P',nodeId:'P:a',type:'observe',title:'A',issuedAt:Date.now()-6000};
  m.update(50000);
  const entry=m.executionRecoveryEntry('P','P:a','map-A',50001);
  assert.equal(entry.count,1);
  assert.equal(entry.lastReason,'engine-idle-with-current-action');
}

// Suppression of a local leaf must NOT manufacture a remote transition.
{
  const local=node('P:local','observe');
  const remote=node('P:remote','observe',0,1,{requiredMapFact:'target'});
  const m=makeManager({nodes:[local,remote],facts:{target:{mapId:'map-B'}}});
  m.planner.requiredMapState=(n,ctx)=>{
    if(!n.params.requiredMapFact) return {constrained:false,runnable:true,targetMapId:''};
    return {constrained:true,runnable:false,targetMapId:'map-B',currentMapId:ctx.mapId};
  };
  const action={missionId:'P',nodeId:'P:local',type:'observe'};
  m.recordExecutionFailure(action,'execute-false',100);
  m.recordExecutionFailure(action,'execute-false',200);
  m.recordExecutionFailure(action,'execute-false',300);
  // primaryMissionTransition intentionally consults raw Planner truth: the local leaf still exists,
  // so recovery suppression alone cannot fabricate a travel intent.
  assert.equal(m.primaryMissionTransition(m.bridge.context()),null);
}

// Historical delegated runtime ownership stays outside generic recovery filtering.
{
  const craft=node('T13:craft','craft',0,10,{eventDriven:true});
  const m=makeManager();
  m.primaryMissionId='T13';m.activeMissionId='T13';m.activeMissionIds=['T13'];
  m.trees=new Map([['T13',tree('T13',[craft])]]);m.tree=m.trees.get('T13');
  m.memory.state.missionLifecycle.T13={status:'active',autoPrimaryEligible:true};
  M.definitions.T13={allowsAutonomousRationCraft:true,runtimeCounters:[{slot:'craft',source:'rations.craftedTotal'}],sequence:[{slot:'craft',action:'craft',params:{eventDriven:true}}]};
  assert.equal(m.delegatedRuntimeAction('T13')?.type,'craft');
  assert.equal(m.hasPrimaryMissionAuthority(),true);
}

console.log('PASS R-STAB execution recovery: repeated failures release authority without losing mission/player priority');
