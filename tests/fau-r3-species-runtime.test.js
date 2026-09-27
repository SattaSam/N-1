const fs=require('fs'), vm=require('vm'), assert=require('assert'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const storage=new Map();
const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
const defs={};
const BF={
  Missions:{normalizeActionType:x=>String(x||'').toLowerCase(),getDefinition:id=>defs[id],definitions:defs},
  BiblePatterns:{OBSERVE_TARGET:{id:'OBSERVE_TARGET',autonomyAxis:'research',steps:[{slot:'study',action:'observe'}]}},
  ObjectLibrary:{
    get(type){const map={brouteur:{type:'brouteur',category:'fauna',label:'Brouteur paisible'},sauteur:{type:'sauteur',category:'fauna',label:'Sauteur placide'},nocturnal_animal:{type:'nocturnal_animal',category:'fauna',label:'Animal nocturne'},rock:{type:'rock',category:'mineral'}};return map[type]||null;}
  },
  ObjectEvents:{types:{PHENOMENON_OBSERVED:'PHENOMENON_OBSERVED'}},
  registerMissionDefinitions(arr){for(const d of arr) defs[d.id]=d; return arr.length;},
  FaunaRuntime:null
};
const context={window:null,BlueFox3D:BF,console:{info(){},warn(){},error(){}},localStorage,performance:{now:()=>0},Date,Math,JSON,Set,Map,WeakMap,Object,Array,Number,String,Boolean,Promise,CustomEvent:function(t,o){this.type=t;this.detail=o?.detail},queueMicrotask:fn=>fn(),setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,addEventListener(){},removeEventListener(){},dispatchEvent(){},document:{querySelector:()=>null,querySelectorAll:()=>[]}};context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT,'data/bible-catalog.js'),'utf8'),context,{filename:'bible-catalog.js'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/bible-runtime-v0-1-unified.js'),'utf8'),context,{filename:'bible-runtime.js'});

class Node {
  constructor(d){this.id=d.id;this.target=d.target||1;this.progress=0;this.status='available';this.params=d.params||{};this.requires=d.requires||[];this.distinctValues=[];this.historyValues=[];}
  get isComplete(){return this.progress>=this.target||this.status==='completed'}
  increment(n=1){if(this.isComplete)return false;this.progress=Math.min(this.target,this.progress+n);this.status=this.isComplete?'completed':'active';return true;}
  incrementDistinct(v){v=String(v);if(this.distinctValues.includes(v))return false;this.distinctValues.push(v);return this.increment(1)}
}
class Tree {
  constructor(d){this.id=d.id;this.nodes=new Map((d.root?.children||[]).map(x=>[x.id,new Node(x)]));this.root={status:'active',walk:(fn)=>{for(const n of this.nodes.values())fn(n);}};}
  find(id){return this.nodes.get(id)||null}
  availableLeaves(){return [...this.nodes.values()].filter(n=>!n.isComplete&&n.requires.every(id=>this.nodes.get(id)?.isComplete));}
  refresh(){if([...this.nodes.values()].every(n=>n.isComplete)){this.root.status='completed';}return this.root.status;}
}
const facts={};
const memory={state:{missionLifecycle:{'FAU-11':{status:'completed'}},missions:{}},getFact:(k,d)=>Object.prototype.hasOwnProperty.call(facts,k)?facts[k]:d,setFact:(k,v)=>{facts[k]=v;return true},save(){},saveTree(){}};
const manager={memory,trees:new Map(),activeMissionIds:[],definition:id=>defs[id]||null,
 startMission(id,opts={}){const d=defs[id];if(!d)return false;const missing=(opts.prerequisites||[]).filter(p=>memory.state.missionLifecycle[p]?.status!=='completed');if(missing.length)return false;if(!this.trees.has(id))this.trees.set(id,new Tree(d));let lc=memory.state.missionLifecycle[id]||={};lc.status='active';if(!this.activeMissionIds.includes(id))this.activeMissionIds.push(id);return true;},
 rearmRepeatableMission(id){if(!defs[id]?.repeatable||memory.state.missionLifecycle[id]?.status!=='completed')return false;this.trees.set(id,new Tree(defs[id]));memory.state.missionLifecycle[id].status='available';this.activeMissionIds=this.activeMissionIds.filter(x=>x!==id);return true;},
 failMission(id){const lc=memory.state.missionLifecycle[id];if(!lc)return false;lc.status='failed';this.activeMissionIds=this.activeMissionIds.filter(x=>x!==id);const t=this.trees.get(id);if(t)t.root.status='failed';return true;},
 syncLifecycleFromTrees(){for(const [id,t] of this.trees){if(t.root.status==='completed'){memory.state.missionLifecycle[id]||={};memory.state.missionLifecycle[id].status='completed';this.activeMissionIds=this.activeMissionIds.filter(x=>x!==id);}}},reevaluatePendingActivations(){},publish(){},catalogController:{schedule(){}}
};
BF.currentEngine={missionManager:manager,currentMapId:'map-a'};BF.getMissionState=()=>({missions:Object.entries(memory.state.missionLifecycle).map(([id,v])=>({missionId:id,lifecycleStatus:v.status}))});
const reps={};BF.FaunaRuntime={getReputation:t=>reps[t]||'neutral',setReputation:(t,v)=>{reps[t]=v;return true}};
const rt=new BF.BibleRuntimeV01();
function event(type,tags,cuo='brouteur',instance='x',distance=4.2){return {type:'PHENOMENON_OBSERVED',instanceId:instance,state:type,detail:{cuoType:cuo,state:type,distance,tags},tags};}
function complete(id){const t=manager.trees.get(id);assert(t,'tree '+id);for(const n of t.nodes.values()){n.progress=n.target;n.status='completed';}t.refresh();manager.syncLifecycleFromTrees();}
function evidence(id,ids){const t=manager.trees.get(id);assert(t);const n=[...t.nodes.values()][0];for(const x of ids)n.incrementDistinct(x);t.refresh();manager.syncLifecycleFromTrees();}

manager.trees.set('FAU-11',{root:{walk(fn){for(const id of ['old1','old2','old3'])fn({distinctValues:[id],historyValues:[]})}}});
assert.strictEqual(rt.reconcileFaunaSpeciesMissions(),true);
assert.strictEqual(memory.state.missionLifecycle['FAU-11A@brouteur'].status,'active');
assert.strictEqual(facts['fauna:relationshipLoopUnlocked'],undefined);
assert.strictEqual(rt.handleFaunaSpeciesObjectEvent(event('cautious_approach',['fauna_behavior','cautious_approach','no_flee'],'sauteur','s1',4.3)),false);
assert.strictEqual(memory.state.missionLifecycle['FAU-01A@sauteur'],undefined);
assert.strictEqual(rt.handleFaunaSpeciesObjectEvent(event('calm_nearby',['fauna_behavior','calm_nearby'],'brouteur','old2',3)),false);
assert.strictEqual(rt.handleFaunaSpeciesObjectEvent(event('calm_nearby',['fauna_behavior','calm_nearby'],'brouteur','new4',3)),true);
manager.syncLifecycleFromTrees(); rt.reconcileFaunaSpeciesMissions();
assert.strictEqual(reps.brouteur,'friendly');
assert.strictEqual(facts['fauna:relationshipLoopUnlocked'],true);
assert.strictEqual(rt.handleFaunaSpeciesObjectEvent(event('cautious_approach',['fauna_behavior','cautious_approach','no_flee'],'brouteur','new5',4)),false);

assert.strictEqual(rt.handleFaunaSpeciesObjectEvent(event('cautious_approach',['fauna_behavior','cautious_approach','no_flee'],'sauteur','s1',5.01)),false);
assert.strictEqual(rt.handleFaunaSpeciesObjectEvent(event('cautious_approach',['fauna_behavior','cautious_approach','no_flee'],'sauteur','s1',4.6)),true);
assert.strictEqual(memory.state.missionLifecycle['FAU-01A@sauteur'].status,'completed');
rt.reconcileFaunaSpeciesMissions();
assert.strictEqual(memory.state.missionLifecycle['FAU-03A@sauteur'].status,'active');
complete('FAU-03A@sauteur'); rt.reconcileFaunaSpeciesMissions();
assert.strictEqual(memory.state.missionLifecycle['FAU-05A@sauteur'].status,'active');
evidence('FAU-05A@sauteur',['s2','s3','s4']); rt.reconcileFaunaSpeciesMissions();
assert.strictEqual(memory.state.missionLifecycle['FAU-11A@sauteur'].status,'active');
assert.strictEqual(rt.handleFaunaSpeciesObjectEvent(event('calm_nearby',['fauna_behavior','calm_nearby'],'sauteur','s3',3)),false);
assert.strictEqual(rt.handleFaunaSpeciesObjectEvent(event('flee',['fauna_behavior','flee','intrusive_approach'],'sauteur','s5',2.5)),true);
assert.strictEqual(reps.sauteur,'hostile');
assert.strictEqual(memory.state.missionLifecycle['FAU-11A@sauteur'].status,'failed');
assert.strictEqual(rt.handleFaunaSpeciesObjectEvent(event('cautious_approach',['fauna_behavior','cautious_approach','no_flee'],'sauteur','s6',4.4)),true);
assert.strictEqual(memory.state.missionLifecycle['FAU-01A@sauteur'].status,'completed');
assert.strictEqual(memory.state.missionLifecycle['FAU-11A@sauteur'].status,'failed');
rt.reconcileFaunaSpeciesMissions();
assert.strictEqual(memory.state.missionLifecycle['FAU-03A@sauteur'].status,'active');
complete('FAU-03A@sauteur'); rt.reconcileFaunaSpeciesMissions();
assert.strictEqual(memory.state.missionLifecycle['FAU-05A@sauteur'].status,'active');
evidence('FAU-05A@sauteur',['s7','s8','s9']); rt.reconcileFaunaSpeciesMissions();
assert.strictEqual(memory.state.missionLifecycle['FAU-11A@sauteur'].status,'active');
assert.strictEqual(rt.handleFaunaSpeciesObjectEvent(event('calm_nearby',['fauna_behavior','calm_nearby'],'sauteur','s10',3)),true);
manager.syncLifecycleFromTrees();rt.reconcileFaunaSpeciesMissions();
assert.strictEqual(reps.sauteur,'friendly');

for(const id of ['FAU-01A@sauteur','FAU-03A@sauteur','FAU-05A@sauteur','FAU-11A@sauteur']) assert.strictEqual(defs[id].repeatable,true,id);
console.log('PASS fau-r3-species-runtime 22 assertions');
