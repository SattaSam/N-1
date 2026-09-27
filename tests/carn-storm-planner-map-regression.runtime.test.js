const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');const window={BlueFox3D:{},performance:{now:()=>0}};window.window=window;const BF=window.BlueFox3D;
BF.Missions={ActionType:{COLLECT:'collect',EXTRACT:'extract',EXPLORE_ZONE:'explore-zone',RESEARCH:'research',OBSERVE:'observe',REST:'rest',EAT:'eat'},normalizeActionType:v=>String(v||'').toLowerCase(),definitions:{},getDefinition(){return null;},cloneDefinition:v=>v};
vm.runInNewContext(fs.readFileSync(path.join(root,'engine/mission-planner.js'),'utf8'),{window,console,performance:window.performance});
const memory={getFact:k=>k==='fact'?{mapId:'A'}:null};const planner=new BF.Missions.MissionPlanner(memory);
function tree(){const node={id:'M:s',type:'research',params:{requiredMapFact:'fact',requiredMapField:'mapId'},target:1,progress:0,isComplete:false,increment(){this.progress++;this.isComplete=true;return true;}};return{node,t:{find:()=>node,refresh(){}}};}
let x=tree();BF.currentEngine={currentMapId:'A'};assert.equal(planner.applyCompletion(x.t,{nodeId:'M:s',type:'research'},{mapId:'B',amount:1}),false,'mapId explicite faux doit rester prioritaire sur fallback routine');
x=tree();assert.equal(planner.applyCompletion(x.t,{nodeId:'M:s',type:'research'},{mapId:'A',amount:1}),true,'mapId explicite correct doit rester accepté');
x=tree();BF.currentEngine.currentMapId='A';assert.equal(planner.applyCompletion(x.t,{nodeId:'M:s',type:'research'},{routine:'research',amount:1}),true,'routine locale sans mapId doit utiliser la map courante');
x=tree();BF.currentEngine.currentMapId='B';assert.equal(planner.applyCompletion(x.t,{nodeId:'M:s',type:'research'},{routine:'research',amount:1}),false,'routine locale mauvaise map doit rester refusée');
x=tree();BF.currentEngine.currentMapId='A';assert.equal(planner.applyCompletion(x.t,{nodeId:'M:s',type:'research'},{amount:1}),false,'événement sans mapId et sans routine ne doit jamais être inféré');
console.log('PASS MissionPlanner map fallback scoped to local routines only');
