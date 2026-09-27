const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class CustomEvent { constructor(type, init={}) { this.type=type; this.detail=init.detail; } }
const window = {
  BlueFox3D: { Missions: {} },
  addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; },
  localStorage: { getItem(){return null}, setItem(){}, removeItem(){} },
  CustomEvent
};
const M = window.BlueFox3D.Missions;
M.ActionType = { COLLECT:'collect', EXTRACT:'extract', CRAFT:'craft', TRAVEL:'travel', REST:'rest', EAT:'eat', ANALYZE:'analyze', OBSERVE:'observe', INSPECT:'inspect', RESEARCH:'research', BUILD:'build', EXPLORE_ZONE:'explore-zone' };
M.MissionStatus = { AVAILABLE:'available', ACTIVE:'active', COMPLETED:'completed' };
M.normalizeActionType = x => String(x||'').toLowerCase();
M.definitions = {};
M.getDefinition = id => M.definitions[id] || null;
M.MissionMemory = class {};
M.MissionPlanner = class {};
M.ActionBridge = class {};
const context = vm.createContext({ window, CustomEvent, console, performance, setTimeout, clearTimeout, queueMicrotask });
vm.runInContext(fs.readFileSync('engine/mission-manager.js','utf8'), context, {filename:'mission-manager.js'});
const Manager = window.BlueFox3D.Missions.MissionManager;

function node(id,type,params={},progress=0,target=1){
  return { id, type, params, progress, target, isComplete: progress>=target };
}
function tree(id,nodes){
  const map=new Map(nodes.map(n=>[n.id,n]));
  return {
    id,
    root:{isComplete:false,walk(cb){nodes.forEach(cb)}},
    find(k){return map.get(k)||null},
    availableLeaves(){return nodes.filter(n=>!n.isComplete)}
  };
}
function manager(defs, trees, primary='T13'){
  const m=Object.create(Manager.prototype);
  m.engine={ currentMapId:'map-A', currentMap:{interactables:[]}, character:{root:{position:{distanceTo(){return 0}}},target:{}}, callbacks:{onAction(){},onStatus(){}} };
  m.primaryMissionId=primary; m.tree=trees.get(primary)||null; m.trees=trees; m.activeMissionIds=[...trees.keys()];
  m.memory={state:{missionLifecycle:{}},getFact(){return null},setFact(){},save(){}};
  for(const id of m.activeMissionIds) m.memory.state.missionLifecycle[id]={status:'active',autoPrimaryEligible:true,narrativePriority:0,urgency:0};
  m.definition=id=>defs[id]||{};
  m.ensureLifecycle=id=>m.memory.state.missionLifecycle[id]||(m.memory.state.missionLifecycle[id]={status:'active',autoPrimaryEligible:true,narrativePriority:0,urgency:0});
  m.treeProgress=()=>0;
  m.playerPriority=()=>50;
  m.bridge={context:()=>({resources:{wood:1},needs:{},energy:80}),isEngineBusy:()=>false};
  m.planner={nextAction(t){ const n=t.availableLeaves()[0]; if(!n||n.params?.eventDriven) return null; return {nodeId:n.id,type:n.type,title:n.id,params:{...n.params}}; }};
  return m;
}

// T13: runtime counter + explicit delegated capability => real delegated work.
{
  const defs={T13:{priority:405,allowsAutonomousRationCraft:true,runtimeCounters:[{slot:'craftRations',source:'rations.craftedTotal'}],sequence:[{slot:'craftRations',action:'craft',params:{eventDriven:true,recipeId:'ration-basic-v2'}}]}, SIDE:{priority:300}};
  const trees=new Map([
    ['T13',tree('T13',[node('T13:craftRations','craft',{eventDriven:true},2,10)])],
    ['SIDE',tree('SIDE',[node('SIDE:study','analyze',{},0,1)])]
  ]);
  const m=manager(defs,trees);
  const delegated=m.delegatedRuntimeAction('T13');
  assert.equal(delegated?.type,'craft');
  const assessment=m.assessMission('T13',m.bridge.context());
  assert.equal(Boolean(assessment.delegatedRuntimeAction),true);
  assert.match(assessment.reasons.join(' '),/runtime déléguée/);
  assert.equal(m.chooseRunnableMissionAction(m.bridge.context()),null,'T13 must reserve the MissionManager cycle for BAC/runtime craft');
}

// SUR-03: same runtime counter but NO delegated autonomous capability => must not lock arbitration.
{
  const defs={'SUR-03':{priority:190,runtimeCounters:[{slot:'craftStableRation',source:'rations.craftedTotal'}],sequence:[{slot:'craftStableRation',action:'craft',params:{eventDriven:true,recipeId:'ration-basic-v2'}}]}, SIDE:{priority:300}};
  const trees=new Map([
    ['SUR-03',tree('SUR-03',[node('SUR-03:craftStableRation','craft',{eventDriven:true},0,1)])],
    ['SIDE',tree('SIDE',[node('SIDE:study','analyze',{},0,1)])]
  ]);
  const m=manager(defs,trees,'SUR-03');
  assert.equal(m.delegatedRuntimeAction('SUR-03'),null);
  const selected=m.chooseRunnableMissionAction(m.bridge.context());
  assert.equal(selected?.missionId,'SIDE','SUR-03 manual craft must leave ordinary arbitration alive');
}

// Counter alone is never enough, even if eventDriven craft.
{
  const defs={X:{priority:500,runtimeCounters:[{slot:'craft',source:'anything'}],sequence:[{slot:'craft',action:'craft',params:{eventDriven:true}}]}};
  const trees=new Map([['X',tree('X',[node('X:craft','craft',{eventDriven:true},0,1)])]]);
  const m=manager(defs,trees,'X');
  assert.equal(m.delegatedRuntimeAction('X'),null);
}

// LOC current-map remains a departure opportunity through the existing canonical map scope.
{
  const defs={LOC:{instanceScope:'map',scopeId:'map-A'}};
  const trees=new Map([['LOC',tree('LOC',[node('LOC:study','analyze',{},0,1)])]]);
  const m=manager(defs,trees,'LOC');
  assert.equal(m.isMissionTransitionOpportunity('LOC',m.bridge.context()),true);
}

// Historical COL can defer departure only when a matching active object exists on this map.
{
  const defs={COL:{}};
  const n=node('COL:collect','collect',{historicalCollection:true,subject:'mineral',excludeKinds:['crystal']},19,20);
  const trees=new Map([['COL',tree('COL',[n])]]);
  const m=manager(defs,trees,'COL');
  m.planner.nextAction=()=>({nodeId:n.id,type:'collect',params:{...n.params}});
  const progression={
    historicalCollectionMetadata(def){return def.meta},
    historicalCollectionMatches(criteria,meta){return meta.subject===criteria.subject && !criteria.excludeKinds.includes(meta.kind)}
  };
  window.BlueFox3D.progression=progression;
  m.engine.currentMap.interactables=[{userData:{active:true,functional:{meta:{subject:'mineral',kind:'ore'}}}}];
  assert.equal(m.historicalCollectionTransitionOpportunity('COL',m.bridge.context()),true);
  m.engine.currentMap.interactables=[{userData:{active:true,functional:{meta:{subject:'mineral',kind:'crystal'}}}}];
  assert.equal(m.historicalCollectionTransitionOpportunity('COL',m.bridge.context()),false);
}

console.log('PASS 2A targeted runtime: T13 delegated craft / SUR-03 guard / LOC / COL');
