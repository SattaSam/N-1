const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const BRIDGE = path.join(ROOT, 'engine/object-m0-bridge.js');
const bridgeSource = fs.readFileSync(BRIDGE, 'utf8');

const TYPES = {
  OBJECT_SEEN:'OBJECT_SEEN',
  OBJECT_INSPECTED:'OBJECT_INSPECTED',
  OBJECT_ANALYZED:'OBJECT_ANALYZED',
  PHENOMENON_OBSERVED:'PHENOMENON_OBSERVED',
  RESOURCE_COLLECTED:'RESOURCE_COLLECTED',
  RESOURCE_EXTRACTED:'RESOURCE_EXTRACTED',
  NPC_REACTION:'NPC_REACTION'
};

function makeNode(id, type='observe', params={}) {
  return {
    id, type, params, isComplete:false, progress:0, target:1, historyValues:[],
    increment(n=1){ this.progress += n; this.isComplete = this.progress >= this.target; return true; },
    incrementDistinct(value,n=1){ this._seen ||= new Set(); if (!value || this._seen.has(value)) return false; this._seen.add(value); return this.increment(n); },
    pushHistoryValue(value){ this.historyValues.push(value); return true; },
    hasDistinctValue(value){ return Boolean(this._seen?.has(value)); }
  };
}

function baseWindow({withWorld=false}={}) {
  let now = 0;
  const subscribers = new Set();
  const events = [];
  class MissionManager { static create(){ return new MissionManager(); } dispose(){} }
  class ActionBridge { constructor(engine){ this.engine=engine; } execute(){ return false; } isEngineBusy(){ return false; } }
  const BF = {
    Missions:{
      MissionManager, ActionBridge,
      ActionType:{OBSERVE:'observe',INSPECT:'inspect',ANALYZE:'analyze',COLLECT:'collect',EXTRACT:'extract'},
      normalizeActionType:v=>String(v||'').toLowerCase()
    },
    ObjectEvents:{
      types:TYPES,
      subscribe(fn){ subscribers.add(fn); return ()=>subscribers.delete(fn); },
      emit(type, object, detail={}){
        const event={
          id:`evt-${Math.random()}`,
          type,
          objectId:object?.userData?.functional?.id || null,
          instanceId:object?.userData?.instanceId || object?.userData?.worldAnchor?.userData?.instanceId || null,
          mapId:'map-a', zoneId:0,
          family:object?.userData?.functional?.resource?.family || object?.userData?.functional?.knowledge?.family,
          knowledgeFamily:object?.userData?.functional?.knowledge?.family,
          category:object?.userData?.functional?.category,
          detail:{...detail}
        };
        events.push(event);
        subscribers.forEach(fn=>fn(event));
        return event;
      },
      siteContext(){ return null; }
    },
    ObjectLibrary:null
  };
  const window={BlueFox3D:BF}; window.window=window;
  window.performance={now:()=>now};
  window.setTimeout=(fn)=>{ /* no async respawn in tests */ return 1; };
  window.clearTimeout=()=>{};
  window.CustomEvent=class{constructor(type,o={}){this.type=type;this.detail=o.detail;}};
  let engine = null;
  if (withWorld) {
    BF.mount = async ()=>engine;
  }
  const context = vm.createContext({
    window, console, performance:window.performance,
    CustomEvent:window.CustomEvent,
    setTimeout:window.setTimeout, clearTimeout:window.clearTimeout,
    Date, Math, Set, Map
  });
  vm.runInContext(bridgeSource, context, {filename:'object-m0-bridge.js'});
  return {
    BF, window, events,
    setNow(v){ now=v; },
    setEngine(v){ engine=v; },
    async patchEngine(){ return BF.mount(); }
  };
}

function managerHarness(BF, trees, currentAction=null) {
  const manager = new BF.Missions.MissionManager();
  manager.trees = new Map(trees.map(tree=>[tree.id,tree]));
  manager.tree = trees[0] || null;
  manager.activeMissionIds = trees.map(tree=>tree.id);
  manager.primaryMissionId = trees[0]?.id || '';
  manager.currentAction = currentAction;
  manager.ensureLifecycle = ()=>({status:'active'});
  const processed = new Set();
  manager.memory={
    hasProcessedObjectEvent:id=>processed.has(id), markProcessedObjectEvent:id=>processed.add(id),
    getFact(){return null;}, setFact(){}, saveTree(){}, remember(){}, save(){}
  };
  manager.syncLifecycleFromTrees=()=>{};
  manager.reevaluatePendingActivations=()=>{};
  manager.catalogController={schedule(){}};
  manager.publish=()=>{};
  return manager;
}

function simpleTree(id, nodes) {
  return {
    id,
    root:{walk(cb){nodes.forEach(cb);}},
    availableLeaves(){ return nodes.filter(n=>!n.isComplete); },
    find(nodeId){ return nodes.find(n=>n.id===nodeId) || null; },
    refresh(){}
  };
}

function studyEvent(id, ownerMissionId, ownerNodeId) {
  return {
    id,
    type:TYPES.PHENOMENON_OBSERVED,
    objectId:'obj-def', instanceId:'same-instance', mapId:'map-a', family:'flora', knowledgeFamily:'flora', category:'plant', tags:[],
    detail:{interactionSource:'mission',cuoType:'plant',kind:'plant',subject:'flora',missionId:ownerMissionId,missionNodeId:ownerNodeId}
  };
}

function makeDefinition(overrides={}) {
  return {
    id:'obj-def', type:'plant', category:'plant', label:'Plant', size:'S',
    gameplay:{collectable:true,inspectable:true,analyzable:true},
    knowledge:{family:'flora'},
    resource:{family:'fiber',inventoryKey:'fiber',quantity:1},
    interaction:{actions:['observe','inspect','analyze','collect'],defaultManualAction:'collect',removeFromWorld:false},
    ...overrides
  };
}

function distanceObject(valueRef){ return {distanceTo(){return valueRef.value;}}; }

async function worldHarness({distance=1, definition=makeDefinition()}={}) {
  const h=baseWindow({withWorld:true});
  const d={value:distance};
  const object={userData:{active:true,functional:definition,instanceId:'same-instance',resourceQuantity:1}};
  const state={observed:true,inspected:false,analyzed:false,identified:true,collected:false,inspectionCount:0,observationCount:1,analysisCount:0,collectionCount:0,studyGeneration:0};
  object.userData.interactionState=state;
  const character={
    root:{position:distanceObject(d)}, target:{},
    interactionSequence:null, currentAnimation:'', __bluefoxStudyPose:null,
    stop(){}, facePoint(){}, cancelInteraction(){this.interactionSequence=null;this.currentAnimation='';},
    playInteraction(){return 1;}
  };
  const collects=[]; const actions=[]; const statuses=[];
  const manager={activeMissionIds:[],trees:new Map(),primaryMissionId:'',ensureLifecycle(){return {status:'active'};},memory:{getFact(){return null;}}};
  const engine={
    character, missionManager:manager,
    currentMapId:'map-a',currentZoneIndex:0,currentMap:{interactables:[object]},
    pendingInteraction:null,interactionStartedAt:0,interactionApproachStartedAt:0,interactionApproachAttempts:0,
    postActionRecoveryUntil:0,lastActivityAt:0,lastAutonomyAt:0,completedInteractions:0,autonomyActionStreak:0,disposed:false,
    resourceCooldowns:new Map(),
    callbacks:{onCollect:k=>collects.push(k),onAction:a=>actions.push(a),onStatus:s=>statuses.push(s)},
    targetInteraction(obj){this.pendingInteraction=obj;this.interactionApproachStartedAt=h.window.performance.now();return true;},
    interactionWorldPosition(){return {};}, interactionValidationDistance(){return 2;}
  };
  h.setEngine(engine);
  await h.patchEngine();
  return {h,engine,object,state,d,collects,actions,statuses,manager,character};
}

test('foreign fan-out may progress current node but must not release currentAction',()=>{
  const h=baseWindow();
  const a=makeNode('A:n','observe',{subject:'flora'});
  const b=makeNode('B:n','observe',{subject:'flora'});
  const ta=simpleTree('A',[a]), tb=simpleTree('B',[b]);
  const manager=managerHarness(h.BF,[ta,tb],{missionId:'A',nodeId:'A:n',type:'observe'});
  manager.consumeObjectEvent(studyEvent('foreign','B','B:n'));
  assert.equal(a.progress,1,'fan-out vers A doit rester autorisé');
  assert.equal(b.progress,1,'mission propriétaire B doit progresser');
  assert.ok(manager.currentAction,'un événement B ne doit pas libérer action A');
});

test('owned object event releases the matching currentAction',()=>{
  const h=baseWindow();
  const a=makeNode('A:n','observe',{subject:'flora'});
  const manager=managerHarness(h.BF,[simpleTree('A',[a])],{missionId:'A',nodeId:'A:n',type:'observe'});
  manager.consumeObjectEvent(studyEvent('owned','A','A:n'));
  assert.equal(a.progress,1);
  assert.equal(manager.currentAction,null);
});

test('ownerless compatible study may fan out but cannot release currentAction',()=>{
  const h=baseWindow();
  const a=makeNode('A:n','observe',{subject:'flora'});
  const manager=managerHarness(h.BF,[simpleTree('A',[a])],{missionId:'A',nodeId:'A:n',type:'observe',instanceId:'same-instance'});
  const event=studyEvent('ownerless',null,null);
  delete event.detail.missionId; delete event.detail.missionNodeId;
  manager.consumeObjectEvent(event);
  assert.equal(a.progress,1,'fan-out ownerless compatible reste autorisé');
  assert.ok(manager.currentAction,'absence d’owner ne prouve jamais la completion de l’action physique');
});

test('same mission/node on a different instance cannot release currentAction',()=>{
  const h=baseWindow();
  const a=makeNode('A:n','observe',{subject:'flora'});
  const manager=managerHarness(h.BF,[simpleTree('A',[a])],{missionId:'A',nodeId:'A:n',type:'observe',instanceId:'TARGET'});
  const event=studyEvent('stale-instance','A','A:n');
  event.instanceId='STALE';
  manager.consumeObjectEvent(event);
  assert.equal(a.progress,1,'la progression passive compatible peut rester valide');
  assert.ok(manager.currentAction,'une autre instance ne doit pas terminer l’action verrouillée sur TARGET');
});

test('ownerless study may complete the leaf, then the later exact owner still acquits currentAction',()=>{
  const h=baseWindow();
  const a=makeNode('A:n','observe',{subject:'flora'});
  const manager=managerHarness(h.BF,[simpleTree('A',[a])],{missionId:'A',nodeId:'A:n',type:'observe',instanceId:'same-instance'});

  const ownerless=studyEvent('ownerless-first',null,null);
  delete ownerless.detail.missionId; delete ownerless.detail.missionNodeId;
  manager.consumeObjectEvent(ownerless);
  assert.equal(a.isComplete,true,'le fan-out ownerless peut légitimement compléter la feuille');
  assert.ok(manager.currentAction,'mais il ne doit pas acquitter le geste physique');

  // Reproduit le cas réel où le fan-out a déjà synchronisé le lifecycle :
  // l'acquittement propriétaire doit rester possible malgré lifecycle completed.
  manager.ensureLifecycle=()=>({status:'completed'});
  let publishes=0; manager.publish=()=>{publishes+=1;};
  manager.consumeObjectEvent(studyEvent('owned-after-complete','A','A:n'));
  assert.equal(a.progress,1,'l’événement propriétaire tardif ne doit pas recréditer la feuille');
  assert.equal(manager.currentAction,null,'l’événement propriétaire exact doit encore acquitter currentAction');
  assert.equal(publishes,1,'la libération tardive de currentAction doit être publiée');
});

test('ownerless RESOURCE_COLLECTED may complete the leaf before BlueFox owner event without leaving stale currentAction',()=>{
  const h=baseWindow();
  const a=makeNode('A:collect','collect',{});
  const manager=managerHarness(h.BF,[simpleTree('A',[a])],{missionId:'A',nodeId:'A:collect',type:'collect',instanceId:'TARGET'});
  const ownerless={
    id:'drone-first',type:TYPES.RESOURCE_COLLECTED,objectId:'obj-def',instanceId:'DRONE-OBJ',mapId:'map-a',
    family:'fiber',knowledgeFamily:'flora',category:'plant',inventoryKey:'fiber',quantity:1,tags:['drone-harvested'],
    detail:{interactionSource:'drone',droneType:'harvest_drone',inventoryCredit:false,remote:false,cuoType:'plant',kind:'fiber',subject:'flora'}
  };
  manager.consumeObjectEvent(ownerless);
  assert.equal(a.isComplete,true);
  assert.ok(manager.currentAction,'la collecte drone fan-out ne possède pas le geste BlueFox');

  manager.ensureLifecycle=()=>({status:'completed'});
  let publishes=0; manager.publish=()=>{publishes+=1;};
  const owned={
    ...ownerless,id:'bluefox-owned',instanceId:'TARGET',tags:[],
    detail:{interactionSource:'mission',cuoType:'plant',kind:'fiber',subject:'flora',missionId:'A',missionNodeId:'A:collect'}
  };
  manager.consumeObjectEvent(owned);
  assert.equal(a.progress,1,'pas de double crédit après completion fan-out');
  assert.equal(manager.currentAction,null,'la collecte propriétaire TARGET doit solder la transaction physique');
  assert.equal(publishes,1,'la fin physique tardive doit être propagée aux consommateurs');
});

test('ownerless acquisition may progress mission but cannot release currentAction',()=>{
  const h=baseWindow();
  const a=makeNode('A:collect','collect',{});
  const manager=managerHarness(h.BF,[simpleTree('A',[a])],{missionId:'A',nodeId:'A:collect',type:'collect',instanceId:'TARGET'});
  const event={
    id:'ownerless-collect',type:TYPES.RESOURCE_COLLECTED,objectId:'obj-def',instanceId:'OTHER',mapId:'map-a',
    family:'fiber',knowledgeFamily:'flora',category:'plant',inventoryKey:'fiber',quantity:1,tags:[],
    detail:{interactionSource:'autonomy',cuoType:'plant',kind:'fiber',subject:'flora'}
  };
  manager.consumeObjectEvent(event);
  assert.equal(a.progress,1,'la collecte compatible peut progresser la mission');
  assert.ok(manager.currentAction,'collecte ownerless concurrente ne libère pas l’action missionnelle en cours');
});

test('one owned study event still fans out to three compatible missions without sibling overcredit',()=>{
  const h=baseWindow();
  const a=makeNode('A:n','observe',{subject:'flora'});
  const sibling=makeNode('A:sibling','observe',{subject:'flora'});
  const b=makeNode('B:n','inspect',{subject:'flora'});
  const c=makeNode('C:n','analyze',{subject:'flora'});
  const treeA={...simpleTree('A',[a,sibling]),availableLeaves(){return [a,sibling];}};
  const manager=managerHarness(h.BF,[treeA,simpleTree('B',[b]),simpleTree('C',[c])],{missionId:'A',nodeId:'A:n',type:'observe'});
  manager.consumeObjectEvent(studyEvent('fanout','A','A:n'));
  assert.equal(a.progress,1); assert.equal(sibling.progress,0,'missionNodeId doit protéger la feuille sœur');
  assert.equal(b.progress,1); assert.equal(c.progress,1);
  assert.equal(manager.currentAction,null);
});

test('eventDriven and catalogManaged study leaves never hijack an acquisition transaction', async()=>{
  for (const flag of ['eventDriven','catalogManaged']) {
    const w=await worldHarness();
    const node=makeNode(`M:${flag}`,'observe',{subject:'flora',[flag]:true});
    w.manager.activeMissionIds=['M'];w.manager.primaryMissionId='M';w.manager.trees=new Map([['M',simpleTree('M',[node])]]);
    w.object.userData.requestedInteraction='collect';w.object.userData.requestedInteractionSource='mission';w.object.userData.missionId='M';w.object.userData.missionNodeId='M:collect';
    const ok=w.engine.targetInteraction(w.object);
    assert.equal(ok,true);
    assert.equal(w.object.userData.requestedInteraction,'collect',`${flag} ne doit pas imposer observe`);
    assert.equal(w.object.userData.acquisitionPhase,'acquire');
  }
});

test('range is enforced before engagement', async()=>{
  const w=await worldHarness({distance:10});
  w.object.userData.requestedInteraction='collect';w.object.userData.requestedInteractionSource='manual';
  w.engine.pendingInteraction=w.object;w.engine.interactionStartedAt=0;w.engine.interactionApproachStartedAt=0;
  w.h.setNow(1000); w.engine.updateInteraction(1000);
  assert.equal(w.collects.length,0);
  assert.equal(w.engine.interactionStartedAt,0);
  assert.equal(w.engine.pendingInteraction,w.object);
});

test('range drift after engagement cannot freeze the atomic interaction', async()=>{
  const w=await worldHarness({distance:10});
  w.object.userData.requestedInteraction='collect';w.object.userData.requestedInteractionSource='manual';
  w.engine.pendingInteraction=w.object;w.engine.interactionStartedAt=100;w.engine.interactionDuration=50;
  w.h.setNow(1000); w.engine.updateInteraction(1000);
  assert.equal(w.collects.length,1,'interaction déjà engagée doit committer malgré une dérive de portée');
  assert.equal(w.engine.pendingInteraction,null);
});

test('acquisition commit waits for CharacterController interactionSequence', async()=>{
  const w=await worldHarness({distance:1});
  w.object.userData.requestedInteraction='collect';w.object.userData.requestedInteractionSource='manual';
  w.engine.pendingInteraction=w.object;w.engine.interactionStartedAt=100;w.engine.interactionDuration=50;
  w.character.interactionSequence={endsAt:2000};
  w.h.setNow(1000); w.engine.updateInteraction(1000);
  assert.equal(w.collects.length,0,'aucun commit tant que la vraie séquence physique existe');
  assert.equal(w.engine.pendingInteraction,w.object);
  w.character.interactionSequence=null;
  w.h.setNow(2100); w.engine.updateInteraction(2100);
  assert.equal(w.collects.length,1);
  assert.equal(w.engine.pendingInteraction,null);
});


test('historical Observe→multi-study→Collect stays atomic on the exact same instance', async()=>{
  const w=await worldHarness({distance:1});
  const study1=makeNode('M:study-1','observe',{subject:'flora'});
  const study2=makeNode('M:study-2','analyze',{subject:'flora'});
  const collect=makeNode('M:collect','collect',{subject:'flora'});
  const nodes=[study1,study2,collect];
  const tree={
    id:'M',root:{walk(cb){nodes.forEach(cb);}},
    availableLeaves(){
      if (!study1.isComplete) return [study1];
      if (!study2.isComplete) return [study2];
      if (!collect.isComplete) return [collect];
      return [];
    },
    find(id){return nodes.find(n=>n.id===id)||null;},refresh(){}
  };
  const manager=managerHarness(w.h.BF,[tree],{missionId:'M',nodeId:'M:collect',type:'collect'});
  w.engine.missionManager=manager;
  w.manager.activeMissionIds=['M'];
  w.manager.primaryMissionId='M';
  w.manager.trees=new Map([['M',tree]]);
  // Le vrai bus ObjectEvents fait progresser les feuilles pendant la transaction.
  w.h.BF.ObjectEvents.subscribe(event=>manager.consumeObjectEvent(event));

  w.object.userData.requestedInteraction='collect';
  w.object.userData.requestedInteractionSource='mission';
  w.object.userData.missionId='M';
  w.object.userData.missionNodeId='M:collect';
  w.object.userData.missionNarrativeVerb='collect';

  assert.equal(w.engine.targetInteraction(w.object),true);
  assert.equal(w.object.userData.requestedInteraction,'observe');
  assert.equal(w.object.userData.missionNodeId,'M:study-1');
  assert.equal(w.object.userData.acquisitionInstanceId,'same-instance');

  w.h.setNow(1000); w.engine.updateInteraction(1000);
  w.h.setNow(4000); w.engine.updateInteraction(4000);
  assert.equal(study1.progress,1);
  assert.equal(w.engine.pendingInteraction,w.object,'la chaîne doit reprendre sur le même objet après étude 1');
  assert.equal(w.object.userData.requestedInteraction,'observe');
  assert.equal(w.object.userData.missionNodeId,'M:study-2');
  assert.equal(w.object.userData.acquisitionPhase,'study');

  w.h.setNow(5000); w.engine.updateInteraction(5000);
  w.h.setNow(8000); w.engine.updateInteraction(8000);
  assert.equal(study2.progress,1);
  assert.equal(w.engine.pendingInteraction,w.object,'la chaîne doit reprendre sur le même objet après étude 2');
  assert.equal(w.object.userData.requestedInteraction,'collect');
  assert.equal(w.object.userData.acquisitionPhase,'acquire');

  w.h.setNow(9000); w.engine.updateInteraction(9000);
  w.h.setNow(12000); w.engine.updateInteraction(12000);
  assert.equal(w.collects.length,1);
  assert.equal(collect.progress,1);
  assert.equal(w.engine.pendingInteraction,null);
  const transactionEvents=w.h.events.filter(e=>[
    TYPES.PHENOMENON_OBSERVED,TYPES.RESOURCE_COLLECTED
  ].includes(e.type));
  assert.deepEqual(transactionEvents.map(e=>e.type),[
    TYPES.PHENOMENON_OBSERVED,TYPES.PHENOMENON_OBSERVED,TYPES.RESOURCE_COLLECTED
  ]);
  assert.ok(transactionEvents.every(e=>e.instanceId==='same-instance'));
});

test('P3 does not rewrite the historical multi-study same-instance transaction',()=>{
  assert.match(bridgeSource,/continueStudyDirective[\s\S]{0,900}?acquisitionPhase\s*=\s*[\s\S]{0,200}?continueStudyDirective\s*\?\s*"study"\s*:\s*"acquire"/);
  assert.match(bridgeSource,/this\.targetInteraction\(object, true\)/);
  assert.match(bridgeSource,/acquisitionInstanceId/);
  assert.doesNotMatch(bridgeSource,/clearAcquisitionTransaction\(this, object\);[\s\S]{0,250}?continueStudyDirective/);
});

test('P3 scope stays ObjectM0-only at runtime-owner level',()=>{
  assert.ok(fs.existsSync(path.join(ROOT,'engine/object-m0-bridge.js')));
  assert.equal(fs.existsSync(path.join(ROOT,'engine/character-controller.js')),false,'CharacterController ne doit pas être embarqué dans le ZIP P3');
  assert.equal(fs.existsSync(path.join(ROOT,'engine/mission-manager.js')),false,'MissionManager ne doit pas être embarqué dans le ZIP P3');
});

test('known respawn collects directly when no new study is due, but observeBeforeAcquire can require a new study', async()=>{
  const definition=makeDefinition({
    interaction:{actions:['observe','collect'],defaultManualAction:'collect',observeBeforeAcquire:true,removeFromWorld:false}
  });
  const w=await worldHarness({distance:1,definition});
  w.state.acquisitionObservationSatisfied=true;
  w.object.userData.requestedInteraction='collect';w.object.userData.requestedInteractionSource='mission';
  w.engine.targetInteraction(w.object);
  assert.equal(w.object.userData.requestedInteraction,'collect');
  w.state.studyGeneration=1;
  w.state.acquisitionObservationSatisfied=false;
  w.object.userData.requestedInteraction='collect';w.object.userData.requestedInteractionSource='mission';
  w.engine.targetInteraction(w.object);
  assert.equal(w.object.userData.requestedInteraction,'observe');
});

test('object becoming inactive cancels the interaction without a late gameplay commit', async()=>{
  const w=await worldHarness({distance:1});
  let cancelled=0;
  w.manager.cancelCurrentAction=()=>{cancelled+=1;};
  w.engine.pendingInteraction=w.object;
  w.object.userData.requestedInteraction='collect';w.object.userData.requestedInteractionSource='mission';
  w.object.userData.active=false;
  w.h.setNow(2000);w.engine.updateInteraction(2000);
  assert.equal(w.collects.length,0);
  assert.equal(w.engine.pendingInteraction,null);
  assert.equal(cancelled,1);
});

test('runtime multi-study chain remains Observe→Analyze→Collect on the exact same instance', async()=>{
  const h=baseWindow({withWorld:true});
  const observe=makeNode('M:observe','observe',{subject:'flora'});
  const analyze=makeNode('M:analyze','analyze',{subject:'flora'});
  const tree={
    id:'M',root:{walk(cb){[observe,analyze].forEach(cb);}},
    availableLeaves(){return observe.isComplete ? (analyze.isComplete?[]:[analyze]) : [observe];},
    find(id){return [observe,analyze].find(n=>n.id===id)||null;},refresh(){}
  };
  const manager=h.BF.Missions.MissionManager.create();
  manager.trees=new Map([['M',tree]]);manager.tree=tree;manager.activeMissionIds=['M'];manager.primaryMissionId='M';
  manager.currentAction={missionId:'M',nodeId:'M:collect',type:'collect'};
  manager.ensureLifecycle=()=>({status:'active'});
  const processed=new Set();
  manager.memory={
    hasProcessedObjectEvent:id=>processed.has(id),markProcessedObjectEvent:id=>processed.add(id),
    getFact(){return null;},setFact(){},saveTree(){},remember(){},save(){}
  };
  manager.syncLifecycleFromTrees=()=>{};manager.reevaluatePendingActivations=()=>{};manager.catalogController={schedule(){}};manager.publish=()=>{};

  const definition=makeDefinition({interaction:{actions:['observe','inspect','analyze','collect'],defaultManualAction:'collect',removeFromWorld:false}});
  const object={userData:{active:true,functional:definition,instanceId:'same-instance',resourceQuantity:1}};
  object.userData.interactionState={observed:false,inspected:false,analyzed:false,identified:false,collected:false,inspectionCount:0,observationCount:0,analysisCount:0,collectionCount:0,studyGeneration:0};
  const d={value:1};
  const character={
    root:{position:distanceObject(d)},target:{},interactionSequence:null,currentAnimation:'',__bluefoxStudyPose:null,
    stop(){},facePoint(){},cancelInteraction(){this.interactionSequence=null;this.currentAnimation='';},playInteraction(){return 1;}
  };
  const collects=[];
  const engine={
    character,missionManager:manager,currentMapId:'map-a',currentZoneIndex:0,currentMap:{interactables:[object]},
    pendingInteraction:null,interactionStartedAt:0,interactionApproachStartedAt:0,interactionApproachAttempts:0,
    postActionRecoveryUntil:0,lastActivityAt:0,lastAutonomyAt:0,completedInteractions:0,autonomyActionStreak:0,disposed:false,resourceCooldowns:new Map(),
    callbacks:{onCollect:k=>collects.push(k),onAction(){},onStatus(){}},
    targetInteraction(obj){this.pendingInteraction=obj;this.interactionApproachStartedAt=h.window.performance.now();return true;},
    interactionWorldPosition(){return {};},interactionValidationDistance(){return 2;}
  };
  h.setEngine(engine);await h.patchEngine();

  object.userData.acquisitionIntent='collect';object.userData.acquisitionIntentSource='mission';object.userData.acquisitionPhase='study';
  object.userData.acquisitionMissionId='M';object.userData.acquisitionMissionNodeId='M:collect';object.userData.acquisitionInstanceId='same-instance';
  object.userData.requestedInteraction='observe';object.userData.requestedInteractionSource='mission';
  object.userData.missionId='M';object.userData.missionNodeId='M:observe';object.userData.missionSubject='flora';object.userData.missionNarrativeVerb='observe';

  engine.pendingInteraction=object;engine.interactionStartedAt=100;engine.interactionDuration=50;h.setNow(1000);engine.updateInteraction(1000);
  assert.equal(observe.isComplete,true);assert.equal(analyze.isComplete,false);assert.equal(collects.length,0);
  assert.equal(object.userData.instanceId,'same-instance');assert.equal(engine.pendingInteraction,object);
  assert.equal(object.userData.requestedInteraction,'observe');assert.equal(object.userData.missionNodeId,'M:analyze');

  engine.interactionStartedAt=1100;engine.interactionDuration=50;h.setNow(2000);engine.updateInteraction(2000);
  assert.equal(analyze.isComplete,true);assert.equal(collects.length,0);assert.equal(engine.pendingInteraction,object);
  assert.equal(object.userData.requestedInteraction,'collect');assert.equal(object.userData.instanceId,'same-instance');

  engine.interactionStartedAt=2100;engine.interactionDuration=50;h.setNow(3000);engine.updateInteraction(3000);
  assert.equal(collects.length,1);assert.equal(engine.pendingInteraction,null);
});
