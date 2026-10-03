const fs=require('fs'), vm=require('vm'), path=require('path'), assert=require('assert');
const root=process.argv[2] || process.cwd();
const w={console,performance:{now:()=>1000},addEventListener:()=>{},removeEventListener:()=>{}}; w.window=w; w.globalThis=w;
w.BlueFox3D={Missions:{ActionType:{TRAVEL:'travel'},normalizeActionType:(x)=>String(x||'').toLowerCase()}};
const ctx=vm.createContext(w);
vm.runInContext(fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8'), ctx, {filename:'bible-catalog.js'});
vm.runInContext(fs.readFileSync(path.join(root,'engine/mission-manager.js'),'utf8'), ctx, {filename:'mission-manager.js'});
const proto=w.BlueFox3D.Missions.MissionManager.prototype;
const byId=(id)=>w.BlueFox3D.BibleCatalog.find((m)=>m.id===id);
function run(def, missionId, currentMapId, fact){
  const tree={root:{isComplete:false},availableLeaves:()=>[]};
  const fake={
    engine:{currentMapId}, bridge:{context:()=>({mapId:currentMapId})},
    definition:(id)=>id===missionId?def:null, trees:new Map([[missionId,tree]]),
    memory:{state:{missionLifecycle:{[missionId]:{status:'active'}}},getFact:(key)=>key===`tutorialExcursion:${missionId}`?fact:null},
    planner:{requiredMapState:()=>null},
    eventDrivenTravelForMission:()=>null,
    missionRunnableAction:()=>null,
    missionKnownDestinationTransition:()=>null,
    missionHasKnownLocalDestination:()=>false,
    missionHasHistoricalCollectionObjective:()=>false
  };
  return proto.missionTransitionFor.call(fake,missionId,{mapId:currentMapId});
}
const arch08=byId('ARCH-08');
assert(arch08 && arch08.pattern==='CONTEXT_MSC');
const t=run(arch08,'ARCH-08','map-old',{generatedTargetMapId:'generated-0026'});
assert(t,'ARCH-08 must regain a travel transition to its generated map');
assert.strictEqual(t.source,'generated-target');
assert.strictEqual(t.node.params.toMapId,'generated-0026');
assert.strictEqual(t.node.params.transitionSource,'generated-target');

// Consumer propagation: the generated-target transition must become the persisted travel intent.
const intentFacts = {};
const intentManager = {
  primaryMissionId:'ARCH-08', activeMissionIds:['ARCH-08'], engine:{currentMapId:'map-old'},
  bridge:{context:()=>({mapId:'map-old'})}, definition:(id)=>id==='ARCH-08'?arch08:null,
  memory:{
    getFact:(key)=>intentFacts[key] || null,
    setFact:(key,value)=>{ intentFacts[key]=value; }, save:()=>{}
  },
  missionAllowsAutomaticExecution:()=>true,
  missionReturnIntentKey:(id)=>`missionReturnIntent:${id}`,
  travelMissionDefinition:()=>arch08,
  travelTargetMapFromFact:()=>'', knownDestinationCriteria:()=>null,
  validatePersistedKnownDestination:()=>null, resolveKnownDestination:()=>null,
  isAutonomousUnknownTravel:()=>false,
  missionHasHistoricalCollectionObjective:()=>false,
  transitionLocalCandidates:()=>[], chooseTransitionDeferralMission:()=>null
};
const intent = proto.ensureMissionTransitionIntent.call(intentManager,{mapId:'map-old'},t);
assert(intent && intent.active===true,'generated target must create an active mission travel intent');
assert.strictEqual(intent.targetMapId,'generated-0026');
assert.strictEqual(intent.transitionSource,'generated-target');

// Non-regression: a multi-step mapGeneration mission must NOT revive a stale generated target.
const fau06=byId('FAU-06');
assert(fau06 && fau06.pattern==='SEQUENCE_ACTIONS' && fau06.mapGeneration);
const stale=run(fau06,'FAU-06','later-map',{generatedTargetMapId:'old-generated-map'});
assert.strictEqual(stale,null,'FAU-06 must not regain authority from a stale generatedTargetMapId');

// Historical ARCH-01..06 behavior stays legacy.
const arch01=byId('ARCH-01');
assert(arch01);
const legacy=run(arch01,'ARCH-01','map-old',{generatedTargetMapId:'legacy-target'});
assert(legacy && legacy.source==='legacy-generated-target','ARCH-01 must preserve legacy generated-target routing');
console.log('PASS generated-target runtime + FAU-06 non-regression');
