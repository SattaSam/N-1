const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');

function boot() {
  const definitions = {};
  const listeners = new Map();
  const window = {
    console, setTimeout, clearTimeout,
    localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} },
    addEventListener(t,fn){ if(!listeners.has(t)) listeners.set(t,new Set()); listeners.get(t).add(fn); },
    removeEventListener(t,fn){ listeners.get(t)?.delete(fn); },
    dispatchEvent(e){ for(const fn of listeners.get(e.type)||[]) fn(e); return true; },
    BlueFox3D: {}
  };
  class CE { constructor(type,opts={}){this.type=type;this.detail=opts.detail;} }
  window.CustomEvent = CE;
  const context = vm.createContext({window, console, performance, CustomEvent:CE, setTimeout, clearTimeout});
  const BF = window.BlueFox3D;
  BF.getAutonomyMode = ()=>'full';
  BF.getProgressionState = ()=>({inventory:{}});
  BF.BAC = { weightedPick(options){ return options.sort((a,b)=>(b.baseWeight||0)-(a.baseWeight||0))[0] || null; } };
  BF.Missions = {
    ActionType:{OBSERVE:'observe',COLLECT:'collect',EXTRACT:'extract',INSPECT:'inspect',ANALYZE:'analyze',EXPLORE_ZONE:'explore-zone',TRAVEL:'travel',REST:'rest',EAT:'eat',RESEARCH:'research',CRAFT:'craft',BUILD:'build'},
    MissionStatus:{AVAILABLE:'available',ACTIVE:'active',COMPLETED:'completed',FAILED:'failed',PAUSED:'paused'},
    normalizeActionType:v=>String(v||'observe'), definitions,
    getDefinition:id=>definitions[id]||null
  };
  class Node {
    constructor(raw){Object.assign(this,JSON.parse(JSON.stringify(raw)));this.progress=this.progress||0;this.status=this.status||'available';this.children=(this.children||[]).map(x=>new Node(x));}
    get isComplete(){return this.progress>=Number(this.target||1)||this.status==='completed';}
    get isLeaf(){return !this.children.length;}
    walk(fn){fn(this);this.children.forEach(c=>c.walk(fn));}
    increment(n=1){if(this.isComplete)return false;this.progress=Math.min(Number(this.target||1),this.progress+n);if(this.isComplete)this.status='completed';return true;}
  }
  class Tree {
    constructor(def){this.id=def.id;this.title=def.title;this.description='';this.root=new Node(def.root);}
    find(id){let out=null;this.root.walk(n=>{if(n.id===id)out=n;});return out;}
    availableLeaves(){const out=[];this.root.walk(n=>{if(n.isLeaf&&!n.isComplete)out.push(n);});return out;}
    refresh(){if(this.root.children.every(n=>n.isComplete)){this.root.progress=1;this.root.status='completed';this.root.completedAt=Date.now();}}
    toJSON(){return {id:this.id,title:this.title,root:JSON.parse(JSON.stringify(this.root))};}
  }
  class Memory {
    constructor(){this.state={activeMissionId:'',primaryMissionId:'',activeMissionIds:[],missionLifecycle:{},pendingActivations:{},missions:{},facts:{},history:[],rewardedMissions:{}};}
    save(){return true;} saveTree(t){this.state.missions[t.id]=t.toJSON();return true;} remember(){return true;}
    setFact(k,v){this.state.facts[k]=v;} getFact(k,d=null){return Object.prototype.hasOwnProperty.call(this.state.facts,k)?this.state.facts[k]:d;}
  }
  class Planner {
    constructor(memory){this.memory=memory;} restoreOrCreate(id){return new Tree(definitions[id]);}
    nextAction(tree){const n=tree.availableLeaves().find(n=>n.params?.eventDriven!==true);return n?{nodeId:n.id,type:n.type,title:n.title,params:{...(n.params||{})},issuedAt:Date.now()}:null;}
    applyCompletion(tree,action){const n=tree.find(action.nodeId);if(!n)return false;const c=n.increment(1);tree.refresh();return c;}
  }
  class Bridge { constructor(engine){this.engine=engine;} isEngineBusy(){return false;} context(){return {needs:{},energy:100};} execute(){return true;} }
  BF.Missions.MissionMemory=Memory; BF.Missions.MissionPlanner=Planner; BF.Missions.ActionBridge=Bridge;
  vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/mission-manager.js'),'utf8'),context,{filename:'mission-manager.js'});
  return {BF,definitions};
}
function def(id, priority=100){return {id,title:id,priority,root:{id:`${id}:root`,title:id,type:'mission',target:1,children:[{id:`${id}:step`,title:'step',type:'observe',target:1,status:'available',params:{}}]}};}
function engine(){const p={distanceTo:()=>0};return {currentMapId:'map',character:{root:{position:p},target:p},currentMap:{interactables:[]},callbacks:{onAction(){},onStatus(){}},pendingGate:null,pendingInteraction:null,pendingZoneExploration:null,currentRoutine:null,transitioning:false};}

test('future missions: primary handoff uses canonical priority, not insertion order',()=>{
  const {BF,definitions}=boot();
  definitions.DONE=def('DONE',100); definitions.LOW=def('LOW',10); definitions.HIGH=def('HIGH',500);
  const e=engine(); const m=BF.Missions.MissionManager.create({engine:e}); e.missionManager=m;
  m.startMission('DONE',{primary:true}); m.startMission('LOW',{primary:false}); m.startMission('HIGH',{primary:false});
  const t=m.trees.get('DONE'); t.find('DONE:step').increment(1); t.refresh();
  m.syncLifecycleFromTrees();
  assert.equal(m.primaryMissionId,'HIGH');
});

test('future missions: only one pending mission is revealed per reevaluation and strongest declarative priority wins',()=>{
  const {BF,definitions}=boot();
  definitions.PRE=def('PRE',100); definitions.LOW=def('LOW',10); definitions.HIGH=def('HIGH',300);
  const e=engine(); const m=BF.Missions.MissionManager.create({engine:e}); e.missionManager=m;
  m.ensureLifecycle('PRE').status='completed';
  m.startMission('LOW',{primary:false,prerequisites:['PRE'],narrativePriority:1});
  m.startMission('HIGH',{primary:false,prerequisites:['PRE'],narrativePriority:5});
  // startMission saw PRE completed and activated immediately; recreate true pending requests to test causal fan-out.
  m.activeMissionIds=[]; m.trees.clear();
  m.memory.state.missionLifecycle.LOW={status:'hidden'}; m.memory.state.missionLifecycle.HIGH={status:'hidden'};
  m.memory.state.pendingActivations={
    LOW:{missionId:'LOW',prerequisites:['PRE'],options:{primary:false,narrativePriority:1},requestedAt:10},
    HIGH:{missionId:'HIGH',prerequisites:['PRE'],options:{primary:false,narrativePriority:5},requestedAt:20}
  };
  assert.equal(m.reevaluatePendingActivations(),true);
  assert.equal(m.memory.state.missionLifecycle.HIGH.status,'active');
  assert.equal(m.memory.state.missionLifecycle.LOW.status,'hidden');
  assert.ok(m.memory.state.pendingActivations.LOW);
  assert.equal(m.memory.state.pendingActivations.HIGH,undefined);
});

test('BibleRuntime consumes MissionManager lifecycle status, never tree completion alone',()=>{
  const src=fs.readFileSync(path.join(ROOT,'engine/bible-runtime-v0-1-unified.js'),'utf8');
  const lifecycleBlock=src.slice(src.indexOf('missionLifecycle(missionId)'), src.indexOf('normalizeObjectEvent(event)'));
  assert.match(lifecycleBlock,/completed:\s*status === "completed"/s);
  assert.doesNotMatch(lifecycleBlock,/publicEntry\?\.tree\?\.root\?\.status === "completed"/);
});

test('BibleRuntime no longer mutates completed construction lifecycle back to active',()=>{
  const src=fs.readFileSync(path.join(ROOT,'engine/bible-runtime-v0-1-unified.js'),'utf8');
  assert.doesNotMatch(src,/lifecycle\.status = "active";[\s\S]{0,220}waitingForBibleGate = true/);
  assert.match(src,/MissionManager est l'unique propriétaire de l'état lifecycle/);
});
