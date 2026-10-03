const fs=require('fs'), vm=require('vm'), assert=require('assert');
const file=process.argv[2];
if(!file) throw new Error('usage: node test.js mission-manager.js');
const w={console,performance:{now:()=>1000},addEventListener:()=>{},removeEventListener:()=>{},setTimeout,clearTimeout}; w.window=w; w.globalThis=w;
w.BlueFox3D={
  maps:{},
  getAutonomyMode:()=> 'full',
  Missions:{
    ActionType:{TRAVEL:'travel',OBSERVE:'observe',ANALYZE:'analyze'},
    normalizeActionType:(x)=>String(x||'').toLowerCase()
  }
};
const ctx=vm.createContext(w);
vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:'mission-manager.js'});
const proto=w.BlueFox3D.Missions.MissionManager.prototype;

function makeManager({mission,current='generated-7df4b30d-0025',fact,maps,leaves=[]}){
  w.BlueFox3D.maps=maps;
  const facts={[`tutorialExcursion:${mission.id}`]: JSON.parse(JSON.stringify(fact||null))};
  const nav=[];
  const tree={root:{isComplete:false},availableLeaves:()=>leaves};
  const m=Object.create(proto);
  Object.assign(m,{
    primaryMissionId:mission.id,
    activeMissionIds:[mission.id],
    engine:{
      currentMapId:current,
      discoveredMaps:new Set([current]),
      worldTopology:{coordinateOf:(id)=> id ? {x:0,z:0}:null},
      findKnownRoute:()=>null,
      findOptimalRoute:()=>null,
      handleNavigationSuggestion:(detail)=>nav.push(detail),
      transitioning:false,pendingGate:null,pendingInteraction:null,persistentNavigationIntent:null,currentRoutine:null
    },
    bridge:{context:()=>({mapId:current}),isEngineBusy:()=>false},
    definition:(id)=>id===mission.id?mission:null,
    trees:new Map([[mission.id,tree]]),
    planner:{requiredMapState:(node)=>node?.requiredState||null},
    memory:{
      state:{missionLifecycle:{[mission.id]:{status:'active'}}},
      getFact:(key,def=null)=>Object.prototype.hasOwnProperty.call(facts,key)?facts[key]:def,
      setFact:(key,value)=>{facts[key]=value;},save:()=>{},
    },
    eventDrivenTravelForMission:()=>null,
    missionRunnableAction:()=>null,
    missionKnownDestinationTransition:()=>null,
    missionHasKnownLocalDestination:()=>false,
    missionHasHistoricalCollectionObjective:()=>false,
    missionAllowsAutomaticExecution:()=>true,
    transitionLocalCandidates:()=>[],
    chooseTransitionDeferralMission:()=>null,
    shouldDeferMissionTransition:()=>false,
    causalArrivalWork:()=>null,
    currentAction:null
  });
  return {m,facts,nav,tree};
}

// SAVE-derived topology/provenance: 0025 is SUR-02, 0026 is ARCH-08 and adjacent east,
// but only 0025 is discovered.
const maps={
 'generated-7df4b30d-0025':{exits:{east:{targetMap:'generated-7df4b30d-0026'},south:{targetMap:'generated-7df4b30d-0016'}},generator:{bibleMissionId:'SUR-02',biblePrescriptionApplied:true}},
 'generated-7df4b30d-0026':{exits:{},generator:{bibleMissionId:'ARCH-08',biblePrescriptionApplied:true}},
 'generated-own':{exits:{},generator:{bibleMissionId:'FAU-06',biblePrescriptionApplied:true}},
 'legacy-unknown-provenance':{exits:{},generator:{}}
};

// 1) ARCH-08: a materialized-but-undiscovered mission target is not a known route,
// but it is executable through the existing frontier edge and must be resumed as discovery.
{
 const mission={id:'ARCH-08',mapGeneration:{requiredMicroScenes:[{id:'MSC-A'}]},bible:{pattern:'CONTEXT_MSC'},navigation:{autonomousUnknownTravel:true}};
 const {m,nav}=makeManager({mission,fact:{fromMapId:'generated-7df4b30d-0025',direction:'east',generatedTargetMapId:'generated-7df4b30d-0026'},maps});
 const t=m.missionTransitionFor('ARCH-08',{mapId:m.engine.currentMapId});
 assert(t,'ARCH-08 must expose continuity travel');
 assert.strictEqual(t.source,'generated-target');
 assert.strictEqual(t.node.params.toMapId,'generated-7df4b30d-0026');
 assert.strictEqual(m.missionTransitionExecutable(t),true,'materialized adjacent undiscovered target must be executable');
 const intent=m.ensureMissionTransitionIntent({mapId:m.engine.currentMapId},t);
 assert(intent && intent.active===true);
 assert.strictEqual(intent.targetMapId,'generated-7df4b30d-0026');
 assert.strictEqual(m.resumeMissionTransitionIntent({mapId:m.engine.currentMapId},t),true);
 assert.strictEqual(nav.length,1);
 assert.deepStrictEqual(JSON.parse(JSON.stringify(nav[0])),{
   discoverUnknown:true,direction:'east',source:'mission',missionId:'ARCH-08'
 });
}

// 2) GEO-07: a persisted generatedTargetMapId explicitly owned by SUR-02 is invalid.
// It must be invalidated and the mission must re-emit its own canonical map generation.
{
 const mission={id:'GEO-07',mapGeneration:{requiredMicroScenes:[{id:'MSC-CHARGED-CRYSTALS-001'}]},bible:{pattern:'SEQUENCE_ACTIONS'},navigation:{autonomousUnknownTravel:true}};
 const leaf={id:'GEO-07:measureEnergyMap1',isComplete:false,requiredState:{constrained:true,targetMapId:'generated-7df4b30d-0025'}};
 const {m,facts,nav}=makeManager({mission,fact:{generatedTargetMapId:'generated-7df4b30d-0025',mapId:'generated-7df4b30d-0025',toMapId:'generated-7df4b30d-0025',arrived:true},maps,leaves:[leaf]});
 const t=m.missionTransitionFor('GEO-07',{mapId:m.engine.currentMapId});
 assert(t,'foreign binding must not leave GEO-07 sterile');
 assert.strictEqual(t.source,'mission-map-generation');
 assert.strictEqual(t.node.params.missionDirectedUnknownTravel,true);
 const cleaned=facts['tutorialExcursion:GEO-07'];
 assert.strictEqual(cleaned.generatedTargetMapId,null);
 assert.strictEqual(cleaned.arrived,false);
 assert.strictEqual(cleaned.invalidatedTargetMapId,'generated-7df4b30d-0025');
 assert.strictEqual(cleaned.invalidatedOwnerMissionId,'SUR-02');
 // Existing bible-map-prescription duplicate guard is now unblocked: no generated target and not arrived.
 assert.strictEqual(Boolean(cleaned.generatedTargetMapId || cleaned.arrived===true),false);
 assert.strictEqual(m.missionTransitionExecutable(t),true);
 assert.strictEqual(m.resumeMissionTransitionIntent({mapId:m.engine.currentMapId},t),true);
 assert.strictEqual(nav.length,1);
 assert.strictEqual(nav[0].discoverUnknown,true);
 assert.strictEqual(nav[0].missionId,'GEO-07');
}

// 3) Valid own provenance must never be invalidated.
{
 const mission={id:'FAU-06',mapGeneration:{requiredObjects:[{type:'fauna'}]},bible:{pattern:'SEQUENCE_ACTIONS'},navigation:{autonomousUnknownTravel:true}};
 const {m,facts}=makeManager({mission,current:'generated-7df4b30d-0025',fact:{generatedTargetMapId:'generated-own',arrived:true},maps});
 const t=m.missionTransitionFor('FAU-06',{mapId:m.engine.currentMapId});
 assert(t,'existing FAU map-generation cycle must remain available');
 assert.strictEqual(facts['tutorialExcursion:FAU-06'].generatedTargetMapId,'generated-own');
 assert.notStrictEqual(facts['tutorialExcursion:FAU-06'].invalidatedTargetMapId,'generated-own');
}

// 4) Missing provenance is not proof of corruption: preserve backward compatibility.
{
 const mission={id:'FAU-06',mapGeneration:{},bible:{pattern:'SEQUENCE_ACTIONS'},navigation:{autonomousUnknownTravel:true}};
 const {m,facts}=makeManager({mission,fact:{generatedTargetMapId:'legacy-unknown-provenance',arrived:true},maps});
 m.missionTransitionFor('FAU-06',{mapId:m.engine.currentMapId});
 assert.strictEqual(facts['tutorialExcursion:FAU-06'].generatedTargetMapId,'legacy-unknown-provenance');
 assert.strictEqual(facts['tutorialExcursion:FAU-06'].invalidatedTargetMapId,undefined);
}

console.log('PASS generalized generated-mission continuity: undiscovered materialized frontier + foreign binding recovery + compatibility');
