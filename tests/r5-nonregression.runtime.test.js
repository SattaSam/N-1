const assert=require('node:assert/strict');
const fs=require('node:fs'); const path=require('node:path'); const vm=require('node:vm'); const test=require('node:test');
const ROOT=process.env.TARGET_ROOT||path.join(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'engine/mission-manager.js'),'utf8');
function proto(){
 const BF={Missions:{definitions:{},ActionType:{TRAVEL:'travel',RESEARCH:'research',OBSERVE:'observe',COLLECT:'collect',EXTRACT:'extract',INSPECT:'inspect',ANALYZE:'analyze',CRAFT:'craft',BUILD:'build',EXPLORE_ZONE:'explore_zone',REST:'rest',EAT:'eat'},MissionStatus:{AVAILABLE:'available',ACTIVE:'active'},normalizeActionType:x=>x,getDefinition:id=>BF.Missions.definitions[id]||null}};
 const w={BlueFox3D:BF,window:null,addEventListener(){},removeEventListener(){},dispatchEvent(){},localStorage:{getItem(){return null}}}; w.window=w;
 vm.runInContext(source,vm.createContext({window:w,CustomEvent:class{},console,performance,Date,Math,JSON,Set,Map}));
 return {BF,M:BF.Missions.MissionManager};
}
test('R5 catalogManaged guard remains',()=>{const {BF,M}=proto(); const m=Object.create(M.prototype); m.planner={nextAction:()=>({nodeId:'X',type:'research'})}; m.isExecutionNodeSuppressed=()=>false; const node={id:'X',params:{catalogManaged:true}}; const tree={root:{isComplete:false},availableLeaves:()=>[node],find:id=>id==='X'?node:null}; assert.equal(m.missionRunnableAction('MIS',tree,{}),null);});
test('R5 currentAction blocks transition intent at update entry',()=>{const {M}=proto(); const m=Object.create(M.prototype); m.enabled=true;m.persistenceHydrationBlocked=false;m.currentAction={issuedAt:Date.now()};m.applyPendingTransitions=()=>false;let calls=0;m.ensureMissionTransitionIntent=()=>{calls++};m.bridge={isEngineBusy:()=>true};m.engine={pendingGate:null,pendingInteraction:null,currentRoutine:null,pendingZoneExploration:null,transitioning:false,character:{root:{position:{distanceTo:()=>1}},target:{}}};m.lastPriorityReviewAt=0;m.selectBestPrimary=()=>false;m.hasActivePrimaryMission=()=>true; assert.equal(m.update(performance.now()),true); assert.equal(calls,0);});
test('R5 symbols retained',()=>{for(const token of ['causalArrivalWork(context','validatePersistedKnownDestination(travel','__missionEvidenceCompletion','arrivalWorkMissionId']) assert.ok(source.includes(token),token);});
