const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT,'engine','mission-manager.js'),'utf8');

function boot() {
  const defs = {};
  const window = { console, localStorage:{getItem(){return null},setItem(){},removeItem(){}}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){}, BlueFox3D:{} };
  const CE = class { constructor(type,init={}){this.type=type;this.detail=init.detail;} };
  const context = vm.createContext({window, console, performance, CustomEvent:CE, setTimeout, clearTimeout});
  const BF=window.BlueFox3D;
  BF.getAutonomyMode=()=> 'full';
  BF.getProgressionState=()=>({inventory:{}});
  BF.Missions={
    ActionType:{OBSERVE:'observe',COLLECT:'collect',EXTRACT:'extract',INSPECT:'inspect',ANALYZE:'analyze',EXPLORE_ZONE:'explore-zone',TRAVEL:'travel',REST:'rest',EAT:'eat',RESEARCH:'research',CRAFT:'craft',BUILD:'build'},
    MissionStatus:{AVAILABLE:'available',ACTIVE:'active',COMPLETED:'completed',FAILED:'failed',PAUSED:'paused'},
    normalizeActionType:v=>String(v||'observe'), definitions:defs, getDefinition:id=>defs[id]||null
  };
  class Node { constructor(raw){Object.assign(this,raw);this.params=raw.params||{};} get isComplete(){return false;} }
  class Tree { constructor(def){this.id=def.id;this.title=def.id;this.nodes=def.nodes.map(x=>new Node(x));this.root={isComplete:false,walk(fn){ for (const node of this._nodes) fn(node); },_nodes:this.nodes};} availableLeaves(){return this.nodes;} find(id){return this.nodes.find(n=>n.id===id)||null;} refresh(){} toJSON(){return {id:this.id,root:{}};} }
  class Memory { constructor(){this.state={activeMissionId:'',primaryMissionId:'',activeMissionIds:[],missionLifecycle:{},pendingActivations:{},missions:{},facts:{},history:[],rewardedMissions:{}};} save(){return true;} saveTree(){return true;} remember(){} setFact(k,v){this.state.facts[k]=v;} getFact(k,d=null){return Object.hasOwn(this.state.facts,k)?this.state.facts[k]:d;} }
  class Planner { constructor(){} restoreOrCreate(id){return new Tree(defs[id]);} nextAction(){return null;} }
  class Bridge { constructor(engine){this.engine=engine;} isEngineBusy(){return false;} context(){return {needs:{},energy:100};} execute(){return false;} }
  Object.assign(BF.Missions,{MissionMemory:Memory,MissionPlanner:Planner,ActionBridge:Bridge});
  vm.runInContext(source,context,{filename:'mission-manager.js'});
  return {BF,defs};
}

test('generic known-return intent survives as mission fact and executes only when not deferred/busy',()=>{
  const {BF,defs}=boot();
  defs['FUTURE-RETURN']={id:'FUTURE-RETURN',title:'future',priority:500,navigation:{autonomousKnownReturn:true},returnPolicy:{mode:'bac-discretion',deferForCurrentMapExclusiveMissions:true,maxDeferMs:45000},root:{},nodes:[{id:'return',type:'travel',params:{eventDriven:true,toMapId:'HOME'}}]};
  const pos={distanceTo:()=>0};
  let returns=0;
  const engine={currentMapId:'REMOTE',character:{root:{position:pos},target:pos},currentMap:{interactables:[]},callbacks:{onAction(){},onStatus(){}},transitioning:false,pendingGate:null,pendingInteraction:null,pendingZoneExploration:null,currentRoutine:null,findKnownRoute(from,to){return [from,to];},returnToBase(){returns++;}};
  const m=BF.Missions.MissionManager.create({engine}); engine.missionManager=m;
  m.startMission('FUTURE-RETURN',{primary:true});
  const intent=m.ensureMissionReturnIntent();
  assert.equal(intent.active,true);
  assert.equal(intent.missionId,'FUTURE-RETURN');
  assert.equal(intent.mapId,'HOME');
  assert.equal(m.memory.getFact('missionReturnIntent:FUTURE-RETURN').mapId,'HOME');
  m.shouldDeferMissionReturn=()=>false;
  assert.equal(m.resumeMissionReturnIntent(),true);
  assert.equal(returns,1);
  m.currentAction={type:'collect'};
  assert.equal(m.resumeMissionReturnIntent(),false);
  assert.equal(returns,1);
});

test('primary known-return keeps mission authority while travel node is unfinished',()=>{
  const {BF,defs}=boot();
  defs['FUTURE-RETURN']={id:'FUTURE-RETURN',title:'future',priority:500,navigation:{autonomousKnownReturn:true},root:{},nodes:[{id:'return',type:'travel',params:{eventDriven:true,toMapId:'HOME'}}]};
  const pos={distanceTo:()=>0};
  const engine={currentMapId:'REMOTE',character:{root:{position:pos},target:pos},currentMap:{interactables:[]},callbacks:{onAction(){},onStatus(){}},transitioning:false,pendingGate:null,pendingInteraction:null,pendingZoneExploration:null,currentRoutine:null};
  const m=BF.Missions.MissionManager.create({engine}); engine.missionManager=m;
  m.startMission('FUTURE-RETURN',{primary:true});
  assert.equal(m.hasPrimaryMissionAuthority(),true);
  assert.ok(m.primaryEventDrivenTravel());
});


test('T11-style return excludes global Shelter and has no 45s forced-delay timer',()=>{
  const {BF,defs}=boot();
  defs['RETURN']={id:'RETURN',title:'return',priority:390,navigation:{autonomousKnownReturn:true},returnPolicy:{mode:'bac-discretion',deferForCurrentMapExclusiveMissions:true,maxDeferMs:45000},nodes:[{id:'return',type:'travel',params:{eventDriven:true,toMapId:'HOME'}}]};
  defs['GAME-shelter']={id:'GAME-shelter',title:'shelter',priority:999,passivePriorityAxis:'survival',nodes:[{id:'wood',type:'collect',params:{kind:'wood'}}]};
  const pos={distanceTo:()=>0};
  let returns=0;
  const engine={currentMapId:'REMOTE',character:{root:{position:pos},target:pos},currentMap:{interactables:[]},callbacks:{onAction(){},onStatus(){}},transitioning:false,pendingGate:null,pendingInteraction:null,pendingZoneExploration:null,currentRoutine:null,findKnownRoute(from,to){return [from,to];},returnToBase(){returns++;}};
  const m=BF.Missions.MissionManager.create({engine}); engine.missionManager=m;
  m.startMission('GAME-shelter',{primary:false});
  m.startMission('RETURN',{primary:true});
  m.planner.nextAction=(tree)=>{
    const node=tree.availableLeaves().find(n=>n.params?.eventDriven!==true);
    return node ? {nodeId:node.id,type:node.type,title:node.id,params:node.params} : null;
  };
  BF.BAC={weightedPick:opts=>opts[0]};
  const intent=m.ensureMissionTransitionIntent();
  assert.deepEqual(Array.from(intent.eligibleLocalMissionIds),[]);
  assert.equal(intent.deferMissionId,null);
  assert.equal(m.shouldDeferMissionReturn('RETURN',m.bridge.context(),Date.now()+999999),false);
  assert.equal(m.resumeMissionReturnIntent(),true);
  assert.equal(returns,1);
});

test('current-map-only mission may defer return by BAC choice, and deferral persists without a timer',()=>{
  const {BF,defs}=boot();
  defs['RETURN']={id:'RETURN',title:'return',priority:390,navigation:{autonomousKnownReturn:true},returnPolicy:{mode:'bac-discretion',deferForCurrentMapExclusiveMissions:true,maxDeferMs:1},nodes:[{id:'return',type:'travel',params:{eventDriven:true,toMapId:'HOME'}}]};
  defs['LOCAL@REMOTE']={id:'LOCAL@REMOTE',title:'local',priority:600,instanceScope:'map',scopeId:'REMOTE',nodes:[{id:'local-work',type:'collect',params:{kind:'fiber'}}]};
  const pos={distanceTo:()=>0};
  let returns=0;
  const engine={currentMapId:'REMOTE',character:{root:{position:pos},target:pos},currentMap:{interactables:[]},callbacks:{onAction(){},onStatus(){}},transitioning:false,pendingGate:null,pendingInteraction:null,pendingZoneExploration:null,currentRoutine:null,findKnownRoute(from,to){return [from,to];},returnToBase(){returns++;}};
  const m=BF.Missions.MissionManager.create({engine}); engine.missionManager=m;
  m.startMission('LOCAL@REMOTE',{primary:false});
  m.startMission('RETURN',{primary:true});
  m.planner.nextAction=(tree)=>{
    const node=tree.availableLeaves().find(n=>n.params?.eventDriven!==true);
    return node ? {nodeId:node.id,type:node.type,title:node.id,params:node.params} : null;
  };
  BF.BAC={weightedPick:opts=>opts.find(o=>o.missionId==='LOCAL@REMOTE') || opts[0]};
  const intent=m.ensureMissionTransitionIntent();
  assert.deepEqual(Array.from(intent.eligibleLocalMissionIds),['LOCAL@REMOTE']);
  assert.equal(intent.deferMissionId,'LOCAL@REMOTE');
  assert.equal(m.shouldDeferMissionReturn('RETURN',m.bridge.context(),Date.now()+999999),true);
  assert.equal(m.resumeMissionReturnIntent(),false);
  assert.equal(returns,0);
  m.ensureLifecycle('LOCAL@REMOTE').status='completed';
  assert.equal(m.shouldDeferMissionReturn('RETURN'),false);
  assert.equal(m.resumeMissionReturnIntent(),true);
  assert.equal(returns,1);
});

test('transition eligibility is calculated once per map context, not on every update',()=>{
  const {BF,defs}=boot();
  defs['TRAVEL']={id:'TRAVEL',title:'travel',priority:300,nodes:[{id:'travel',type:'travel',params:{eventDriven:true,toMapId:'TARGET'}}]};
  defs['LOCAL@START']={id:'LOCAL@START',title:'local',priority:100,instanceScope:'map',scopeId:'START',nodes:[{id:'work',type:'collect',params:{}}]};
  const pos={distanceTo:()=>0};
  const engine={currentMapId:'START',character:{root:{position:pos},target:pos},currentMap:{interactables:[]},callbacks:{onAction(){},onStatus(){}},transitioning:false,pendingGate:null,pendingInteraction:null,pendingZoneExploration:null,currentRoutine:null,findKnownRoute(){return ['START','TARGET'];},handleNavigationSuggestion(){}};
  const m=BF.Missions.MissionManager.create({engine}); engine.missionManager=m;
  m.startMission('LOCAL@START',{primary:false});
  m.startMission('TRAVEL',{primary:true});
  m.planner.nextAction=(tree)=>{
    const node=tree.availableLeaves().find(n=>n.params?.eventDriven!==true);
    return node ? {nodeId:node.id,type:node.type,title:node.id,params:node.params} : null;
  };
  BF.BAC={weightedPick:opts=>opts[0]};
  let calculations=0;
  const original=m.transitionLocalCandidates.bind(m);
  m.transitionLocalCandidates=(...args)=>{calculations++; return original(...args);};
  m.ensureMissionTransitionIntent();
  m.ensureMissionTransitionIntent();
  m.ensureMissionTransitionIntent();
  assert.equal(calculations,1);
  engine.currentMapId='MID';
  m.ensureMissionTransitionIntent();
  assert.equal(calculations,2);
});

test('generic mission travel advances one map at a time and reevaluates local-only work on arrival',()=>{
  const {BF,defs}=boot();
  defs['TRAVEL']={id:'TRAVEL',title:'travel',priority:300,nodes:[{id:'travel',type:'travel',params:{eventDriven:true,toMapId:'TARGET'}}]};
  defs['LOCAL@MID']={id:'LOCAL@MID',title:'local-mid',priority:600,instanceScope:'map',scopeId:'MID',nodes:[{id:'work',type:'collect',params:{kind:'fiber'}}]};
  const pos={distanceTo:()=>0};
  const moves=[];
  const engine={currentMapId:'START',character:{root:{position:pos},target:pos},currentMap:{interactables:[]},callbacks:{onAction(){},onStatus(){}},transitioning:false,pendingGate:null,pendingInteraction:null,pendingZoneExploration:null,currentRoutine:null,
    findKnownRoute(from,to){
      if(from==='START'&&to==='TARGET') return ['START','MID','TARGET'];
      if(from==='MID'&&to==='TARGET') return ['MID','TARGET'];
      return null;
    },
    handleNavigationSuggestion(detail){moves.push(detail.mapId);}
  };
  const m=BF.Missions.MissionManager.create({engine}); engine.missionManager=m;
  m.startMission('LOCAL@MID',{primary:false});
  m.startMission('TRAVEL',{primary:true});
  m.planner.nextAction=(tree)=>{
    const node=tree.availableLeaves().find(n=>n.params?.eventDriven!==true);
    return node ? {nodeId:node.id,type:node.type,title:node.id,params:node.params} : null;
  };
  BF.BAC={weightedPick:opts=>opts.find(o=>o.missionId==='LOCAL@MID') || opts[0]};
  assert.equal(m.resumeMissionTransitionIntent(),true);
  assert.deepEqual(moves,['MID']);
  engine.currentMapId='MID';
  const midIntent=m.ensureMissionTransitionIntent();
  assert.equal(midIntent.deferMissionId,'LOCAL@MID');
  assert.equal(m.resumeMissionTransitionIntent(),false);
  assert.deepEqual(moves,['MID']);
  m.ensureLifecycle('LOCAL@MID').status='completed';
  assert.equal(m.resumeMissionTransitionIntent(),true);
  assert.deepEqual(moves,['MID','TARGET']);
});

test('multi-map return uses map-by-map travel, then canonical returnToBase for the final hop',()=>{
  const {BF,defs}=boot();
  defs['RETURN']={id:'RETURN',title:'return',priority:390,navigation:{autonomousKnownReturn:true},returnPolicy:{mode:'bac-discretion',deferForCurrentMapExclusiveMissions:true},nodes:[{id:'return',type:'travel',params:{eventDriven:true,toMapId:'HOME'}}]};
  const pos={distanceTo:()=>0};
  const moves=[];
  let returns=0;
  const engine={currentMapId:'REMOTE',character:{root:{position:pos},target:pos},currentMap:{interactables:[]},callbacks:{onAction(){},onStatus(){}},transitioning:false,pendingGate:null,pendingInteraction:null,pendingZoneExploration:null,currentRoutine:null,
    findKnownRoute(from,to){
      if(from==='REMOTE'&&to==='HOME') return ['REMOTE','MID','HOME'];
      if(from==='MID'&&to==='HOME') return ['MID','HOME'];
      return [from,to];
    },
    handleNavigationSuggestion(detail){moves.push(detail.mapId);},
    returnToBase(){returns++;}
  };
  const m=BF.Missions.MissionManager.create({engine}); engine.missionManager=m;
  m.startMission('RETURN',{primary:true});
  BF.BAC={weightedPick:opts=>opts[0]};
  assert.equal(m.resumeMissionReturnIntent(),true);
  assert.deepEqual(moves,['MID']);
  assert.equal(returns,0);
  engine.currentMapId='MID';
  assert.equal(m.resumeMissionReturnIntent(),true);
  assert.equal(returns,1);
});

test('final mission action materializes transition intent before the next update tick',()=>{
  const {BF,defs}=boot();
  defs['CHAIN']={id:'CHAIN',title:'chain',priority:300,nodes:[
    {id:'collect',type:'collect',params:{}},
    {id:'travel',type:'travel',params:{eventDriven:true,toMapId:'TARGET'}}
  ]};
  const pos={distanceTo:()=>0};
  const engine={currentMapId:'START',character:{root:{position:pos},target:pos},currentMap:{interactables:[]},callbacks:{onAction(){},onStatus(){}},transitioning:false,pendingGate:null,pendingInteraction:null,pendingZoneExploration:null,currentRoutine:null,findKnownRoute(){return ['START','TARGET'];},handleNavigationSuggestion(){}};
  const m=BF.Missions.MissionManager.create({engine}); engine.missionManager=m;
  m.startMission('CHAIN',{primary:true});
  const tree=m.trees.get('CHAIN');
  const collect=tree.nodes[0], travel=tree.nodes[1];
  let phase='collect';
  tree.availableLeaves=()=>phase==='collect'?[collect]:[travel];
  m.planner.applyCompletion=()=>{phase='travel'; return true;};
  m.planner.nextAction=()=>null;
  m.currentAction={missionId:'CHAIN',nodeId:'collect',type:'collect',title:'collect',params:{}};
  assert.equal(m.memory.getFact('missionReturnIntent:CHAIN',null),null);
  assert.equal(m.notifyActionCompleted('collect',{}),true);
  const intent=m.memory.getFact('missionReturnIntent:CHAIN',null);
  assert.equal(intent?.active,true);
  assert.equal(intent?.targetMapId,'TARGET');
});
