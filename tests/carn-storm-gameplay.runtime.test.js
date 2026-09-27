const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const window={BlueFox3D:{},performance:{now:()=>0}};window.window=window;const BF=window.BlueFox3D;
BF.Missions={
  ActionType:{COLLECT:'collect',EXTRACT:'extract',EXPLORE_ZONE:'explore-zone',RESEARCH:'research',OBSERVE:'observe',REST:'rest',EAT:'eat'},
  normalizeActionType:v=>String(v||'').toLowerCase(),definitions:{},getDefinition(){return null;},cloneDefinition:v=>JSON.parse(JSON.stringify(v))
};
const context=vm.createContext({window,console,performance:window.performance});
vm.runInContext(fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'engine/mission-planner.js'),'utf8'),context);
const catalog=BF.BibleCatalog;
function makeTree(mission){
  const nodes=new Map();
  for(const step of mission.sequence){nodes.set(`${mission.id}:${step.slot}`,{id:`${mission.id}:${step.slot}`,type:step.action,params:{...(step.params||{})},target:Number(step.target)||1,progress:0,isComplete:false,createdAt:nodes.size,increment(n=1){this.progress+=n;this.isComplete=this.progress>=this.target;return true;}});}
  const tree={id:mission.id,find:id=>nodes.get(id)||null,refresh(){},availableLeaves(){return [...nodes.values()].filter(node=>{if(node.isComplete)return false;const step=mission.sequence.find(s=>`${mission.id}:${s.slot}`===node.id);return (step.requires||[]).every(slot=>nodes.get(`${mission.id}:${slot}`)?.isComplete);});}};
  return {tree,nodes};
}
function runMission(id){
  const mission=catalog.find(m=>m.id===id);assert(mission,id+' absent');
  const facts={['bibleActivation:'+id]:{mapId:'danger-map'}};const memory={getFact:(k,d=null)=>facts[k]??d};
  BF.currentEngine={currentMapId:'danger-map'};const planner=new BF.Missions.MissionPlanner(memory);const {tree,nodes}=makeTree(mission);
  const ctx={mapId:'danger-map',resources:{},unexploredZones:1,explorationPercent:20,hasIncompleteDiscoveredMaps:true,canRoutine:true,needs:{rest:true,food:true}};
  let action=planner.nextAction(tree,ctx);assert.equal(action.type,'observe');assert.equal(action.params.proximityOnly,true);assert(planner.applyCompletion(tree,action,{mapId:'danger-map',amount:1}));
  const exposure=nodes.get(`${id}:exposure`);
  if(exposure){
    action=planner.nextAction(tree,ctx);assert.equal(action.type,'research');assert.equal(action.params.duration,exposure.params.duration);assert.equal(exposure.target,1);
    BF.currentEngine.currentMapId='wrong-map';assert.equal(planner.applyCompletion(tree,action,{routine:'research',amount:1}),false,'routine hors map ne doit pas créditer');
    BF.currentEngine.currentMapId='danger-map';assert.equal(planner.applyCompletion(tree,action,{routine:'research',amount:1}),true,'une routine locale sur la map liée doit créditer');
    assert.equal(exposure.progress,1);assert.equal(exposure.isComplete,true);
  }
  action=planner.nextAction(tree,ctx);assert.equal(action.type,'explore-zone');assert(planner.applyCompletion(tree,action,{mapId:'danger-map',amount:1}));
  if(id.endsWith('-01')||id.endsWith('-02')){action=planner.nextAction(tree,ctx);assert.equal(action.type,'rest');assert(planner.applyCompletion(tree,action,{routine:'rest',amount:1}));action=planner.nextAction(tree,ctx);assert.equal(action.type,'eat');assert(planner.applyCompletion(tree,action,{routine:'food',amount:1}));}
  assert.equal(tree.availableLeaves().length,0);
}
for(const id of ['TERR-CARN-01','TERR-CARN-02','TERR-CARN-03','TERR-CARN-04','TERR-STORM-01','TERR-STORM-02','TERR-STORM-03','TERR-STORM-04']) runMission(id);
const c=[1,2,3].map(n=>catalog.find(m=>m.id===`TERR-CARN-0${n}`).sequence.find(s=>s.slot==='exposure').params.duration);
const s=[1,2,3].map(n=>catalog.find(m=>m.id===`TERR-STORM-0${n}`).sequence.find(s=>s.slot==='exposure').params.duration);
assert(c[0]>c[1]&&c[1]>c[2]);assert(s[0]>s[1]&&s[1]>s[2]);
console.log('PASS runtime gameplay approach -> one timed exposure -> retreat -> rest/eat with map constraint');
