const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ROOT=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const mmSource=read('engine/mission-manager.js');
const bacSource=read('engine/behavior-arbitration-integration.js');

function bootManager(){
  const definitions={};
  const window={BlueFox3D:{},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;}}; window.window=window;
  class CE{constructor(type,o={}){this.type=type;this.detail=o.detail;}}
  const BF=window.BlueFox3D;
  BF.getAutonomyMode=()=> 'full'; BF.getProgressionState=()=>({inventory:{}});
  BF.Missions={definitions,getDefinition:id=>definitions[id]||null,ActionType:{REST:'rest',EAT:'eat',TRAVEL:'travel',COLLECT:'collect',EXTRACT:'extract'},MissionStatus:{AVAILABLE:'available',ACTIVE:'active',COMPLETED:'completed',PAUSED:'paused',FAILED:'failed'},normalizeActionType:v=>String(v||'')};
  vm.runInContext(mmSource,vm.createContext({window,CustomEvent:CE,console,performance,Date,Set,Map}),{filename:'mission-manager.js'});
  return {BF,Manager:BF.Missions.MissionManager,definitions};
}

function bootOverlay(){
  class Manager{
    constructor(){this.memory={state:{prioritizedMissionIds:[],missionGuidanceResumeAt:0},save(){}};this.activeMissionIds=[];this.primaryMissionId='';this.prioritizedMissionIds=[];this.trees=new Map();this.scores={};this.bridge={context:()=>({})};}
    ensureLifecycle(id){return {status:this.activeMissionIds.includes(id)?'active':'hidden'};}
    isMissionVisibleOnCurrentMap(){return true;}
    assessMission(id){return {missionId:id,score:this.scores[id]||0,action:{type:'collect'}};}
    setPrimaryMission(id){this.primaryMissionId=id;return true;}
    suggestPrimaryMission(id){this.primaryMissionId=id;return true;}
    selectBestPrimary(){return true;}
    hasRunnablePrimaryMission(){return false;}
    publish(){}
  }
  const BF={Missions:{MissionManager:Manager},BAC:{weightedPick:opts=>opts[0]||null,traitBalance:()=>0,getDiagnostics:()=>({})}};
  const window={BlueFox3D:BF,performance,Date,Math,Set,Map,WeakMap,addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},setTimeout(){return 1;},clearTimeout(){},setInterval(){return 1;},clearInterval(){}}; window.window=window;
  vm.runInContext(bacSource,vm.createContext({window,console,performance,Date,Math,Set,Map,WeakMap,CustomEvent:class{}}),{filename:'behavior-arbitration-integration.js'});
  return {Manager,BF};
}

function makeAuthorityManager(){
  const {Manager,definitions}=bootManager();
  const m=Object.create(Manager.prototype);
  Object.assign(definitions,{P:{id:'P'},S:{id:'S'},X:{id:'X'}});
  const tree={root:{isComplete:false}};
  m.engine={currentMapId:'map'}; m.memory={state:{missionLifecycle:{P:{status:'active'},S:{status:'active'},X:{status:'active'}}}};
  m.activeMissionIds=['P','S','X'];m.primaryMissionId='P';m.trees=new Map([['P',tree],['S',tree],['X',tree]]);m.tree=tree;
  m.bridge={context:()=>({needs:{}})};m.isMissionGuidanceEnabled=()=>true;m.isMissionVisibleOnCurrentMap=()=>true;
  m.hasPrimaryMissionAuthority=()=>false;m.assessMission=id=>({missionId:id,action:id==='S'?{type:'collect'}:null,score:id==='S'?50:0});
  return m;
}

test('P2 preserves persistent Top1 guard and existing shortlist-first R-STAB implementation',()=>{
  assert.match(mmSource,/if \(!force && replacingActivePrimary\)[\s\S]{0,500}?return false;/);
  assert.match(mmSource,/shortlist persistante[\s\S]{0,900}?if \(!assessments\.length\)[\s\S]{0,500}?activeMissionIds\.filter/);
});

test('Top4 saturated queue is reranked by current score, not stale queue order',()=>{
  const {Manager}=bootOverlay(); const m=new Manager();
  m.activeMissionIds=['P','T09','A','B','C'];m.primaryMissionId='P';m.memory.state.prioritizedMissionIds=['P','A','B','C'];m.trees=new Map(m.activeMissionIds.map(id=>[id,{}]));m.scores={T09:500,A:100,B:90,C:80,P:1};
  m.selectBestPrimary(1,false);
  assert.deepEqual(Array.from(m.prioritizedMissionIds),['P','T09','A','B']);
});

test('Equal secondary scores preserve prior queue order',()=>{
  const {Manager}=bootOverlay(); const m=new Manager();
  m.activeMissionIds=['P','A','B','C'];m.primaryMissionId='P';m.memory.state.prioritizedMissionIds=['P','B','A','C'];m.trees=new Map(m.activeMissionIds.map(id=>[id,{}]));m.scores={A:10,B:10,C:5,P:1};
  m.selectBestPrimary(1,false);
  assert.deepEqual(Array.from(m.prioritizedMissionIds),['P','B','A','C']);
});

test('Explicit player primary stays Top1 while secondaries rerank',()=>{
  const {Manager}=bootOverlay(); const m=new Manager();
  m.activeMissionIds=['P','A','B','C'];m.memory.state.prioritizedMissionIds=['A','B','C'];m.trees=new Map(m.activeMissionIds.map(id=>[id,{}]));m.scores={P:1,A:100,B:90,C:80};
  m.setPrimaryMission('P'); assert.equal(m.primaryMissionId,'P'); assert.deepEqual(Array.from(m.prioritizedMissionIds),['P','A','B','C']);
});

test('Secondary runnable grants global mission execution authority while primary authority stays false',()=>{
  const m=makeAuthorityManager(); assert.equal(m.hasPrimaryMissionAuthority(),false); assert.equal(m.hasMissionExecutionAuthority(),true);
});



test('Delegated runtime work in Top2-Top4 grants execution authority without a physical action',()=>{
  const m=makeAuthorityManager();
  m.prioritizedMissionIds=['P','S','X'];
  m.getPrioritizedMissionIds=()=>[...m.prioritizedMissionIds];
  m.delegatedRuntimeAction=id=>id==='S'?{type:'craft',source:'rations.craftedTotal'}:null;
  m.assessMission=id=>({missionId:id,action:null,score:0});
  assert.equal(m.hasPrimaryMissionAuthority(),false);
  assert.equal(m.hasMissionExecutionAuthority(),true);
});

test('Execution authority stops inside Top4 when a shortlisted secondary is runnable',()=>{
  const m=makeAuthorityManager();
  const extras=Array.from({length:80},(_,i)=>`E${i}`);
  extras.forEach(id=>{m.memory.state.missionLifecycle[id]={status:'active'};m.trees.set(id,{root:{isComplete:false}});});
  m.activeMissionIds=['P','S','X',...extras];
  m.prioritizedMissionIds=['P','S','X','E0'];
  m.getPrioritizedMissionIds=()=>[...m.prioritizedMissionIds];
  m.delegatedRuntimeAction=()=>null;
  let assessments=0;
  m.assessMission=id=>{assessments++;return {missionId:id,action:id==='S'?{type:'collect'}:null,score:id==='S'?50:0};};
  assert.equal(m.hasMissionExecutionAuthority(),true);
  assert.ok(assessments<=4,`assessments=${assessments}`);
});

test('R-STAB authority scans outside Top4 only after the shortlist is sterile',()=>{
  const m=makeAuthorityManager();
  m.prioritizedMissionIds=['P','S'];
  m.getPrioritizedMissionIds=()=>[...m.prioritizedMissionIds];
  m.delegatedRuntimeAction=()=>null;
  const order=[];
  m.assessMission=id=>{order.push(id);return {missionId:id,action:id==='X'?{type:'collect'}:null,score:id==='X'?50:0};};
  assert.equal(m.hasMissionExecutionAuthority(),true);
  assert.deepEqual(order.slice(0,2),['P','S']);
  assert.equal(order.includes('X'),true);
});
test('No runnable mission means no global execution authority; guidance OFF disables it',()=>{
  const m=makeAuthorityManager();m.assessMission=id=>({missionId:id,action:null,score:0});assert.equal(m.hasMissionExecutionAuthority(),false);m.isMissionGuidanceEnabled=()=>false;m.assessMission=id=>({missionId:id,action:{type:'collect'},score:1});assert.equal(m.hasMissionExecutionAuthority(),false);
});

test('Off-map missions do not grant execution authority',()=>{
  const m=makeAuthorityManager();m.isMissionVisibleOnCurrentMap=id=>id!=='S';assert.equal(m.hasMissionExecutionAuthority(),false);
});

function watchdogFunction(source){
  const marker='engine.ensureActivity = function ensureActivityAsWatchdog(now) {'; const start=source.indexOf(marker); assert.ok(start>=0); let i=start+source.slice(start).indexOf('{')+1, depth=1;
  for(;i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'){depth--;if(depth===0)break;}}
  const expr=source.slice(start+'engine.ensureActivity = '.length,i+1); return vm.runInNewContext('('+expr+')');
}

test('Watchdog performs zero authority scans before 12s and while moving',()=>{
  const fn=watchdogFunction(bacSource);let calls=0,updates=0;const e={missionManager:{hasMissionExecutionAuthority(){calls++;return false;}},lastActivityAt:1000,lastAutonomyAt:0,transitioning:false,pendingInteraction:null,currentRoutine:null,pendingGate:null,character:{root:{position:{distanceTo(){return 0;}}},target:{},speed:0},updateAutonomy(){updates++;}};
  fn.call(e,10000);assert.equal(calls,0);e.lastActivityAt=1;e.character.root.position.distanceTo=()=>2;fn.call(e,20000);assert.equal(calls,0);assert.equal(updates,0);
});

test('Watchdog prolonged idle authority scan is cadence-bounded',()=>{
  const fn=watchdogFunction(bacSource);let calls=0,updates=0;const e={missionManager:{hasMissionExecutionAuthority(){calls++;return true;}},lastActivityAt:1,lastAutonomyAt:0,transitioning:false,pendingInteraction:null,currentRoutine:null,pendingGate:null,character:{root:{position:{distanceTo(){return 0;}}},target:{},speed:0},updateAutonomy(){updates++;}};
  for(let t=13000;t<25000;t+=16) fn.call(e,t); assert.ok(calls<=3,`authority calls=${calls}`);assert.equal(updates,0);
});

test('Watchdog prolonged idle without authority falls back only on bounded cadence',()=>{
  const fn=watchdogFunction(bacSource);let calls=0,updates=0;const e={missionManager:{hasMissionExecutionAuthority(){calls++;return false;}},lastActivityAt:1,lastAutonomyAt:0,transitioning:false,pendingInteraction:null,currentRoutine:null,pendingGate:null,character:{root:{position:{distanceTo(){return 0;}}},target:{},speed:0},updateAutonomy(now){updates++;this.lastAutonomyAt=now;}};
  for(let t=13000;t<25000;t+=16) fn.call(e,t); assert.ok(calls<=3,`authority calls=${calls}`);assert.ok(updates<=3,`updates=${updates}`);
});

test('P2 scope excludes ObjectM0/Bible/UI changes',()=>{
  const files=fs.readdirSync(path.join(ROOT,'engine')).sort();
  assert.deepEqual(files,['behavior-arbitration-integration.js','mission-manager.js']);
  assert.equal(fs.existsSync(path.join(ROOT,'data')),false);
  assert.doesNotMatch(bacSource,/continueStudyDirective|foundationTutorialAllows|contextVisible/);
  assert.doesNotMatch(mmSource,/continueStudyDirective|foundationTutorialAllows/);
});

function bootWorldOverlay(authority=true){
  let authorityCalls=0;
  class Manager{
    constructor(){this.memory={state:{prioritizedMissionIds:[],missionGuidanceResumeAt:0},save(){}};this.activeMissionIds=[];this.primaryMissionId='';this.prioritizedMissionIds=[];this.trees=new Map();}
    ensureLifecycle(){return {status:'active'};} isMissionVisibleOnCurrentMap(){return true;} assessMission(){return null;}
    setPrimaryMission(){return true;} suggestPrimaryMission(){return true;} selectBestPrimary(){return true;} hasRunnablePrimaryMission(){return false;}
    hasPrimaryMissionAuthority(){return false;} hasMissionExecutionAuthority(){authorityCalls++;return authority;} publish(){}
  }
  let originalAutonomyCalls=0, interactions=0;
  const pos={distanceTo(){return 0;},clone(){return this;},sub(){return this;},setY(){return this;},lengthSq(){return 1;},normalize(){return this;},addScaledVector(){return this;}};
  const manager=new Manager();
  const engine={missionManager:manager,targetInteraction(){interactions++;return true;},updateAutonomy(){originalAutonomyCalls++;return 'original';},ensureActivity(){},character:{root:{position:pos},target:{},fatigueSpeedMultiplier:1,stop(){},setTarget(){return true;}},transitioning:false,pendingInteraction:null,pendingGate:null,pendingZoneExploration:null,persistentNavigationIntent:null,currentRoutine:null,postActionRecoveryUntil:0,lastAutonomyAt:0,lastActivityAt:0,autonomyActionStreak:0,autonomyBreakTarget:3,currentMap:{interactables:[],gates:[]},discoveredMaps:new Set(),callbacks:{onSpeak(){},onStatus(){}},speechVisible:false,canInteractWith(){return false;},noteLocalAutonomousDecision(){},autonomyAllowed(){return true;}};
  const BF={Missions:{MissionManager:Manager},currentEngine:engine,BAC:{weightedPick:()=>null,traitBalance:()=>0,getDiagnostics:()=>({}),evaluateSurvivalDecision:()=>null},getSurvivalState:()=>({fatigue:{movement:1}}),getPlayerTraitProfile:()=>({}),getMapProgressionIndicators:()=>({}),RationPolicy:{autonomyCandidate:()=>null},getConstructionCollectionCandidate:()=>null};
  const window={BlueFox3D:BF,performance,Date,Math,Set,Map,WeakMap,addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},setTimeout(fn){return 1;},clearTimeout(){},setInterval(){return 1;},clearInterval(){}};window.window=window;
  vm.runInContext(bacSource,vm.createContext({window,console,performance,Date,Math,Set,Map,WeakMap,CustomEvent:class{}}),{filename:'behavior-arbitration-integration.js'});
  return {engine,get originalAutonomyCalls(){return originalAutonomyCalls;},get interactions(){return interactions;},get authorityCalls(){return authorityCalls;}};
}

test('updateAutonomy consumer honors global mission execution authority',()=>{
  const h=bootWorldOverlay(true);h.engine.updateAutonomy(10000);assert.equal(h.originalAutonomyCalls,0);assert.equal(h.interactions,0);
});


test('Real watchdog to updateAutonomy path reuses the negative authority result exactly once',()=>{
  const h=bootWorldOverlay(false);
  h.engine.lastActivityAt=1;
  h.engine.lastAutonomyAt=0;
  h.engine.ensureActivity(13000);
  assert.equal(h.authorityCalls,1,`authorityCalls=${h.authorityCalls}`);
  assert.equal(h.originalAutonomyCalls,1);
});
