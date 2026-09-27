const fs=require('fs');
const vm=require('vm');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const prescriptionPath=process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root,'engine/bible-map-prescription-v19.js');

const ids=['PHEN-01','PHEN-02','PHEN-03','PHEN-05','PHEN-06'];

async function runMission(missionId){
  const listeners=new Map();
  const facts=new Map();
  let generated=0;
  let generatedDirection=null;
  const window={
    BlueFox3D:{},
    performance:{now:()=>0},
    addEventListener(type,fn){listeners.set(type,fn);},
    removeEventListener(){},
    dispatchEvent(){},
    setTimeout,
    clearTimeout
  };
  window.window=window;
  const BF=window.BlueFox3D;
  BF.BiblePatterns={SEQUENCE_ACTIONS:{autonomyAxis:'research'},TRAVEL_CYCLE:{autonomyAxis:'exploration'},EXPLORE_SCOPE:{autonomyAxis:'exploration'},OBSERVE_TARGET:{autonomyAxis:'research'},COLLECT_THEN_REWARD:{autonomyAxis:'collection'}};
  BF.Missions={ActionType:{TRAVEL:'travel'},normalizeActionType:v=>String(v||'').toLowerCase()};
  BF.getAutonomyMode=()=> 'full';
  BF.maps={origin:{id:'origin',exits:{}}};
  BF.ObjectLibrary={};
  BF.mount=async({engine})=>engine;

  const context=vm.createContext({window,console,performance:window.performance,Date,JSON,Math,setTimeout,clearTimeout});
  vm.runInContext(fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8'),context,{filename:'bible-catalog.js'});
  const mission=BF.BibleCatalog.find(entry=>entry.id===missionId);
  assert(mission,`${missionId} absent`);
  const travel=mission.sequence.find(step=>step.action==='travel' && step.params?.eventDriven===true);
  assert(travel,`${missionId} travel event-driven absent`);

  const travelNode={
    id:`${missionId}:${travel.slot}`,
    type:'travel',
    params:{...travel.params},
    progress:0,
    isComplete:false
  };
  const lifecycle={ [missionId]:{status:'active'} };
  const memory={
    state:{missionLifecycle:lifecycle},
    getFact(key,fallback=null){return facts.has(key)?facts.get(key):fallback;},
    setFact(key,value){facts.set(key,value);},
    save(){}
  };
  const manager={
    primaryMissionId:missionId,
    activeMissionId:missionId,
    currentAction:null,
    trees:new Map([[missionId,{availableLeaves:()=>[travelNode],find:()=>null}]]),
    memory
  };
  const engine={
    currentMapId:'origin',
    missionManager:manager,
    worldTopology:{targetFrom:()=>null},
    transitioning:false,pendingGate:false,pendingInteraction:false,currentRoutine:null,
    async generateUnknownPassage(direction){generated+=1;generatedDirection=direction;return true;},
    clearPersistentNavigationIntent(){},
    callbacks:{onStatus(){}},
    navigationRoute:[]
  };
  BF.currentEngine=engine;

  vm.runInContext(fs.readFileSync(prescriptionPath,'utf8'),context,{filename:'bible-map-prescription-v19.js'});
  await BF.mount({engine});
  const handler=listeners.get('bluefox:mission-state');
  assert(handler,'écouteur mission-state absent');
  handler({detail:{missions:[{missionId,lifecycleStatus:'active'}]}});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(generated,1,`${missionId} doit demander exactement un passage inconnu`);
  assert(['north','south','east','west'].includes(generatedDirection),`${missionId} direction inconnue invalide`);
  const request=facts.get(`tutorialExcursion:${missionId}`);
  assert.equal(request?.travelNodeId,travelNode.id,`${missionId} doit lier la demande au vrai noeud travel`);
}

(async()=>{
  for(const id of ids) await runMission(id);
  console.log('PASS R-PHEN-2A autonomous navigation runtime for PHEN-01/02/03/05/06');
})().catch(error=>{console.error(error);process.exit(1);});
