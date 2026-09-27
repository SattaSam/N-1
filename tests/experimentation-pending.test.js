const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');

function harness(){
  let unlocked=false;
  const definition={
    id:'DRN-01',
    title:'Comprendre le Scout',
    priority:292,
    experimentalPrerequisites:['reverse_engineering'],
    root:{id:'DRN-01:root',title:'Comprendre le Scout',type:'group',target:1,children:[]}
  };
  const lifecycle={};
  const memory={
    state:{missionLifecycle:lifecycle,pendingActivations:{},missions:{},activeMissionIds:[]},
    save(){},saveTree(){},getFact(){return null},remember(){}
  };
  const tree={
    id:'DRN-01',
    title:'Comprendre le Scout',
    description:'',
    root:{status:'available',isComplete:false,walk(fn){fn(this)}},
    availableLeaves(){return[]},
    toJSON(){return{root:{children:[]}}}
  };
  const planner={restoreOrCreate(){return tree}};
  const bridge={isEngineBusy(){return false},context(){return{}},execute(){return false}};
  const BF={
    Missions:{
      definitions:{'DRN-01':definition},
      getDefinition:id=>id==='DRN-01'?definition:null,
      MissionStatus:{AVAILABLE:'available',ACTIVE:'active',COMPLETED:'completed'},
      ActionType:{}
    },
    bibleRuntime:{isResearchRewardUnlocked(){return unlocked}},
    Research:{
      experimentationForKnowledge(id){
        return {
          theme:{id:'engineering',label:'Ingénierie'},
          stage:{stage:3},
          knowledge:{id,label:'Rétro-ingénierie comprise'}
        };
      }
    },
    BAC:{weightedPick(options){return options[0]}},
    getProgressionState(){return{inventory:{}}}
  };
  const window={BlueFox3D:BF,addEventListener(){},removeEventListener(){},dispatchEvent(){}};
  const context=vm.createContext({
    window,
    performance:{now:()=>0},
    Date,Set,Map,
    CustomEvent:function(){},
    console
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/mission-manager.js'),'utf8'),context);
  const engine={
    currentMapId:'crystal',
    callbacks:{onAction(){},onStatus(){}},
    character:{root:{position:{distanceTo(){return 0}}},target:{}},
    pendingInteraction:null,
    currentRoutine:null,
    pendingGate:null,
    pendingZoneExploration:null
  };
  const manager=BF.Missions.MissionManager.create({engine,memory,planner,bridge});
  engine.missionManager=manager;
  return{
    BF,manager,memory,
    setUnlocked:v=>{unlocked=v},
    completePrerequisite:id=>{
      memory.state.missionLifecycle[id]={status:'completed'};
    }
  };
}

test('une mission réellement disponible expose son verrou expérimental sans activer la mission',()=>{
  const h=harness();
  assert.equal(h.manager.startMission('DRN-01',{primary:false}),true);
  assert.equal(h.memory.state.missionLifecycle['DRN-01'].status,'hidden');
  assert.deepEqual(
    h.memory.state.pendingActivations['DRN-01'].experimentalPrerequisites,
    ['reverse_engineering']
  );
  assert.deepEqual(
    Array.from(h.memory.state.missionLifecycle['DRN-01'].waitingFor),
    ['research:reverse_engineering']
  );

  const state=h.manager.getState();
  const projected=state.catalog.find(m=>m.missionId==='DRN-01');
  assert.equal(projected.status,'available');
  assert.equal(projected.pendingExperimental,true);
  assert.match(projected.journalIntro,/Rétro-ingénierie comprise/);
  assert.equal(state.pendingExperimentationIntent.axis,'research');
  assert.equal(state.pendingExperimentationIntent.baseWeight,292);
  assert.equal(state.pendingExperimentationIntent.target,'camp');
});

test('un prérequis missionnel manquant garde la mission invisible et ne crée aucune intention expérimentale',()=>{
  const h=harness();
  assert.equal(
    h.manager.startMission('DRN-01',{
      primary:false,
      prerequisites:['SOURCE-01']
    }),
    true
  );
  assert.equal(h.memory.state.missionLifecycle['DRN-01'].status,'hidden');
  assert.deepEqual(
    Array.from(h.memory.state.missionLifecycle['DRN-01'].waitingFor),
    ['SOURCE-01','research:reverse_engineering']
  );

  let state=h.manager.getState();
  assert.equal(
    state.catalog.some(m=>m.missionId==='DRN-01'),
    false,
    'la mission ne doit pas apparaître tant que sa mission-source manque'
  );
  assert.equal(
    state.pendingExperimentationIntent,
    null,
    'le BAC ne doit pas poursuivre une expérience pour une mission pas encore disponible'
  );

  h.completePrerequisite('SOURCE-01');
  state=h.manager.getState();
  const projected=state.catalog.find(m=>m.missionId==='DRN-01');
  assert.equal(projected.status,'available');
  assert.equal(projected.pendingExperimental,true);
  assert.equal(state.pendingExperimentationIntent.missionId,'DRN-01');
});

test('la connaissance débloquée réactive causalement la mission pending',()=>{
  const h=harness();
  h.manager.startMission('DRN-01',{primary:false,prerequisites:['SOURCE-01']});
  h.completePrerequisite('SOURCE-01');
  h.setUnlocked(true);
  assert.equal(h.manager.reevaluatePendingActivations(),true);
  assert.equal(h.memory.state.missionLifecycle['DRN-01'].status,'active');
  assert.equal(h.memory.state.pendingActivations['DRN-01'],undefined);
});
