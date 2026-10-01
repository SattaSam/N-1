const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const test=require('node:test');
const ROOT=process.env.TARGET_ROOT||path.join(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'engine/mission-manager.js'),'utf8');
function make(){
 const defs={P:{id:'P'},S:{id:'S'},X:{id:'X'}};const BF={Missions:{definitions:defs,getDefinition:id=>defs[id]||null,ActionType:{TRAVEL:'travel',COLLECT:'collect',EXTRACT:'extract',REST:'rest',EAT:'eat'},MissionStatus:{AVAILABLE:'available',ACTIVE:'active'},normalizeActionType:v=>v}};
 const w={BlueFox3D:BF,addEventListener(){},removeEventListener(){},dispatchEvent(){},localStorage:{getItem(){return null}}};w.window=w;
 vm.runInContext(src,vm.createContext({window:w,CustomEvent:class{},console,performance,Date,Math,JSON,Set,Map}));
 const m=Object.create(BF.Missions.MissionManager.prototype);const tree={root:{isComplete:false}};
 m.engine={currentMapId:'map'};m.memory={state:{missionLifecycle:{P:{status:'active'},S:{status:'active'},X:{status:'active'}}}};m.activeMissionIds=['P','S','X'];m.primaryMissionId='P';m.trees=new Map([['P',tree],['S',tree],['X',tree]]);m.tree=tree;m.bridge={context:()=>({needs:{}})};m.isMissionGuidanceEnabled=()=>true;m.isMissionVisibleOnCurrentMap=()=>true;m.hasPrimaryMissionAuthority=()=>false;m.getPrioritizedMissionIds=()=>['P','S'];m.delegatedRuntimeAction=()=>null;m.prioritizedMissionTransition=()=>null;m.missionHasHistoricalCollectionObjective=()=>false;m.ensureLifecycle=id=>m.memory.state.missionLifecycle[id]; return m;
}
test('secondary runnable still grants authority without requiring a transition probe',()=>{const m=make();let transitions=0,outside=0;m.assessMission=id=>({missionId:id,action:id==='S'?{type:'collect'}:null,score:0});m.prioritizedMissionTransition=()=>{transitions++;return null};m.outsideShortlistMissionWork=()=>{outside++;return null};assert.equal(m.hasMissionExecutionAuthority(),true);assert.equal(transitions,0);assert.equal(outside,0)});
test('delegated Top4 work still grants authority',()=>{const m=make();m.delegatedRuntimeAction=id=>id==='S'?{type:'craft'}:null;m.assessMission=()=>({action:null});let outside=0;m.outsideShortlistMissionWork=()=>{outside++;return null};assert.equal(m.hasMissionExecutionAuthority(),true);assert.equal(outside,0)});
test('sterile Top4 checks its transition before outside fallback',()=>{const m=make();m.assessMission=()=>({action:null});let outside=0;m.prioritizedMissionTransition=()=>({missionId:'S',node:{type:'travel',params:{toMapId:'other'}}});m.outsideShortlistMissionWork=()=>{outside++;return null};assert.equal(m.hasMissionExecutionAuthority(),true);assert.equal(outside,0)});
