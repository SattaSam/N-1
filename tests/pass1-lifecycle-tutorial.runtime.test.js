const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const managerSource = read('engine/mission-manager.js');
const runtimeSource = read('engine/bible-runtime-v0-1-unified.js');
const catalogSource = read('data/bible-catalog.js');
const bacSource = read('engine/behavior-arbitration-integration.js');

function bootManager() {
  const definitions = {};
  const window = { BlueFox3D: {}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; } };
  window.window = window;
  class CE { constructor(type, opts={}) { this.type=type; this.detail=opts.detail; } }
  const BF = window.BlueFox3D;
  BF.getAutonomyMode = () => 'full';
  BF.getProgressionState = () => ({ inventory: {} });
  BF.Missions = {
    definitions,
    getDefinition: id => definitions[id] || null,
    ActionType: { REST:'rest', EAT:'eat', TRAVEL:'travel', COLLECT:'collect', EXTRACT:'extract' },
    MissionStatus: { AVAILABLE:'available', ACTIVE:'active', COMPLETED:'completed', PAUSED:'paused', FAILED:'failed' },
    normalizeActionType: v => String(v || '')
  };
  const context = vm.createContext({ window, CustomEvent: CE, console, performance, Date, Set, Map });
  vm.runInContext(managerSource, context, { filename: 'mission-manager.js' });
  return { BF, Manager: BF.Missions.MissionManager, definitions };
}

function bootBible() {
  const listeners = new Map();
  const window = {
    BlueFox3D: {}, console, Date, Math, JSON, Set, Map, WeakMap,
    performance, setTimeout, clearTimeout, setInterval(){ return 1; }, clearInterval(){},
    localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} },
    addEventListener(type, fn){ if(!listeners.has(type)) listeners.set(type,new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn){ listeners.get(type)?.delete(fn); },
    dispatchEvent(event){ for (const fn of listeners.get(event.type)||[]) fn(event); return true; }
  };
  window.window = window;
  class CE { constructor(type, opts={}) { this.type=type; this.detail=opts.detail; } }
  window.CustomEvent = CE;
  const BF = window.BlueFox3D;
  BF.Missions = {};
  // Load catalog first so T03 reward is the real candidate data.
  vm.runInNewContext(catalogSource, { window, console, Object, Array, Map, Set, Math, JSON }, { filename:'bible-catalog.js' });
  // Avoid constructing/starting the singleton while still executing the actual class definition.
  let src = runtimeSource.replace(
    'const runtime = new BibleRuntimeV01();',
    'const runtime = Object.create(BibleRuntimeV01.prototype); runtime.catalog=[]; runtime.byId=new Map(); runtime.dynamicMissions=new Map(); runtime.state={};'
  ).replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/m, '\n})(window);\n');
  const context = vm.createContext({ window, CustomEvent: CE, console, performance, Date, Math, JSON, Set, Map, WeakMap, setTimeout, clearTimeout });
  vm.runInContext(src, context, { filename:'bible-runtime-v0-1-unified.js' });
  return { BF, Runtime: BF.BibleRuntimeV01, window };
}

test('P1 scope is clean: only T03 data fields, no R5 DATA contamination', () => {
  assert.match(catalogSource, /id:\s*"T03"[\s\S]*?targetMapId:\s*"crystal"[\s\S]*?localVisibility:\s*"current-map"/);
  assert.match(catalogSource, /id:"OPP-CIV-01"[\s\S]{0,700}?ponderation:1\.5/);
  assert.match(catalogSource, /placement:\s*Object\.freeze\(\{ mode: "player" \}\)/);
  assert.doesNotMatch(catalogSource, /id:"OPP-CIV-01"[\s\S]{0,700}?ponderation:1,/);
});

test('P1 preserves 329d persistent Top1 guard', () => {
  assert.match(managerSource, /if \(!force && replacingActivePrimary\)[\s\S]{0,500}?return false;/);
});

test('G06: prerequisite inspection does not materialize phantom available lifecycle and reveals at most one ready mission', () => {
  const { Manager } = bootManager();
  const m = Object.create(Manager.prototype);
  const state = {
    missionLifecycle: { PRE:{status:'completed'}, LOW:{status:'hidden'}, HIGH:{status:'hidden'} },
    pendingActivations: {
      GHOST:{missionId:'GHOST',prerequisites:['MISSING'],options:{primary:false,narrativePriority:9},requestedAt:1},
      LOW:{missionId:'LOW',prerequisites:['PRE'],options:{primary:false,narrativePriority:1},requestedAt:2},
      HIGH:{missionId:'HIGH',prerequisites:['PRE'],options:{primary:false,narrativePriority:5},requestedAt:3}
    }
  };
  m.memory = { state };
  m.wakeIdleRetry = () => {};
  m.definition = id => ({ id, priority: id === 'HIGH' ? 300 : 10 });
  const activated=[];
  m.activateMission = (id) => { activated.push(id); state.missionLifecycle[id].status='active'; delete state.pendingActivations[id]; return true; };
  assert.equal(m.reevaluatePendingActivations(), true);
  assert.deepEqual(activated, ['HIGH']);
  assert.equal(state.missionLifecycle.MISSING, undefined, 'simple prerequisite read must not create lifecycle');
  assert.equal(state.missionLifecycle.LOW.status, 'hidden');
  assert.ok(state.pendingActivations.LOW);
  assert.ok(state.pendingActivations.GHOST);
});

test('G09: current-map visibility is generic and reversible', () => {
  const { Manager } = bootManager();
  const m = Object.create(Manager.prototype);
  const defs = {
    T03:{id:'T03',localVisibility:'current-map',targetMapId:'crystal'},
    GLOBAL:{id:'GLOBAL'},
    LOCAL:{id:'LOCAL',localVisibility:'current-map',scopeId:'remote'}
  };
  m.definition = id => defs[id] || {};
  m.engine = { currentMapId:'crystal' };
  assert.equal(m.isMissionVisibleOnCurrentMap('T03'), true);
  assert.equal(m.isMissionVisibleOnCurrentMap('GLOBAL'), true);
  assert.equal(m.isMissionVisibleOnCurrentMap('LOCAL'), false);
  m.engine.currentMapId='remote';
  assert.equal(m.isMissionVisibleOnCurrentMap('T03'), false);
  assert.equal(m.isMissionVisibleOnCurrentMap('LOCAL'), true);
});

test('G09 propagation: off-map T03 leaves priority mission state but remains in global mission journal; phantom available stays hidden', () => {
  const { BF, Manager, definitions } = bootManager();
  Object.assign(definitions, {
    T03:{id:'T03',title:'Camp',localVisibility:'current-map',targetMapId:'crystal'},
    GHOST:{id:'GHOST',title:'Ghost'},
    LEGIT:{id:'LEGIT',title:'Legit'}
  });
  const tree={id:'T03',title:'Camp',description:'',root:{status:'active'},availableLeaves(){return[];},toJSON(){return {id:'T03',title:'Camp',root:{status:'active',children:[]}};}};
  const m=Object.create(Manager.prototype);
  m.engine={currentMapId:'remote'};
  m.memory={state:{missionLifecycle:{
    T03:{status:'active',activatedAt:1,source:'tutorial'},
    GHOST:{status:'available',activatedAt:0,source:'system',discoveryReason:''},
    LEGIT:{status:'available',activatedAt:0,source:'system',discoveryReason:'Découverte réelle'}
  }}};
  m.trees=new Map([['T03',tree]]); m.tree=tree; m.activeMissionIds=['T03']; m.primaryMissionId='T03';
  m.selectionReason=''; m.pendingPrimaryMissionId='T03'; m.currentAction=null;
  m.pendingExperimentCatalogEntries=()=>[]; m.pendingExperimentationIntent=()=>null;
  m.treeProgress=()=>0; m.displayTreeSnapshot=()=>({});
  const state=m.getState();
  assert.equal(state.missions.some(x=>x.missionId==='T03'), false, 'off-map local mission must not be priority/action state');
  assert.equal(state.catalog.some(x=>x.missionId==='T03'), true, 'known local mission must remain in global journal');
  assert.equal(state.catalog.some(x=>x.missionId==='GHOST'), false, 'default phantom available must stay private');
  assert.equal(state.catalog.some(x=>x.missionId==='LEGIT'), true, 'legitimate available mission must stay public');
  m.engine.currentMapId='crystal';
  assert.equal(m.getState().missions.some(x=>x.missionId==='T03'), true, 'returning to target map restores eligibility');
  void BF;
});

test('Bible tutorial gate: Txx and GAME-shelter allowed before T08, general missions blocked; post-T08 opens normally', () => {
  const { Runtime } = bootBible();
  const r=Object.create(Runtime.prototype);
  let t08Completed=false;
  r.missionLifecycle=id=>({completed:id==='T08' && t08Completed,status:t08Completed?'completed':'active'});
  assert.equal(r.foundationTutorialAllows({id:'T03'}), true);
  assert.equal(r.foundationTutorialAllows({id:'T13'}), true);
  assert.equal(r.foundationTutorialAllows({id:'GAME-shelter'}), true);
  assert.equal(r.foundationTutorialAllows({id:'FAU-01A@sauteur'}), false);
  assert.equal(r.foundationTutorialAllows({id:'OPP-GEO-01'}), false);
  t08Completed=true;
  assert.equal(r.foundationTutorialAllows({id:'FAU-01A@sauteur'}), true);
  assert.equal(r.foundationTutorialAllows({id:'OPP-GEO-01'}), true);
});

test('FAU pre-gate occurs before dynamic mission materialization', () => {
  const { Runtime } = bootBible();
  const r=Object.create(Runtime.prototype);
  r.faunaSpeciesMissionId=(base,cuo)=>`${base}@${cuo}`;
  let completed=false, materialized=0, starts=0;
  r.missionLifecycle=id=>({completed:id==='T08' && completed,active:false,status:'available'});
  r.ensureFaunaSpeciesMission=()=>{materialized++; return {id:'FAU-01A@sauteur',faunaSpeciesCuoType:'sauteur',prerequisites:[]};};
  r.manager=()=>({});
  r.startMissionThroughBible=()=>{starts++; return true;};
  assert.equal(r.startFaunaSpeciesMission('FAU-01A','sauteur'), false);
  assert.equal(materialized,0);
  assert.equal(starts,0);
  completed=true;
  assert.equal(r.startFaunaSpeciesMission('FAU-01A','sauteur'), true);
  assert.equal(materialized,1);
  assert.equal(starts,1);
});

test('generic repeatable review only handles missions with an explicit repeatableCondition', () => {
  const { Runtime } = bootBible();
  const r=Object.create(Runtime.prototype);
  r.catalog=[
    {id:'FAU-MANUAL',repeatable:true,prerequisites:[]},
    {id:'GAME-fire',repeatable:true,repeatableCondition:{minimum:1},prerequisites:[]}
  ];
  const lifecycle={};
  r.manager=()=>({memory:{state:{missionLifecycle:lifecycle},getFact(){return 0;}}});
  r.missionLifecycle=()=>({completed:true});
  r.nearShelterForRepeatable=()=>true;
  r.repeatableStockSnapshot=()=>[{amount:2,minimum:1,rearmIncrease:0}];
  r.repeatableWoodBaselineKey=id=>id;
  const activated=[];
  r.activateMission=(m)=>{activated.push(m.id); lifecycle[m.id]={status:'active'}; return true;};
  assert.equal(r.reviewRepeatableOpportunities(), true);
  assert.deepEqual(activated,['GAME-fire']);
});

test('T03 blueprint reward remains idempotent through completed-reward reconciliation', () => {
  const { BF, Runtime } = bootBible();
  const t03=BF.BibleCatalog.find(m=>m.id==='T03');
  assert.ok(t03);
  assert.ok((t03.rewards||[]).some(r=>r.type==='research.blueprint' && r.id==='camp-establish-v1'));
  const memory={state:{missionLifecycle:{T03:{status:'completed'}},researchUnlocks:{}},saveCalls:0,save(){this.saveCalls++;}};
  const r=Object.create(Runtime.prototype);
  r.manager=()=>({memory});
  r.allMissions=()=>[t03];
  assert.equal(r.reconcileCompletedResearchRewards(),1);
  assert.equal(r.reconcileCompletedResearchRewards(),0);
  assert.equal(memory.state.researchUnlocks['camp-establish-v1'].missionId,'T03');
  assert.equal(memory.saveCalls,1);
});


test('Fresh game bootstrap registers future initial missions as canonical hidden pending without premature activation', () => {
  const { BF, Runtime } = bootBible();
  const r=Object.create(Runtime.prototype);
  r.catalog=BF.BibleCatalog;
  r.byId=new Map(r.catalog.map(m=>[m.id,m]));
  r.dynamicMissions=new Map();
  const lifecycle={};
  const pending={};
  const manager={
    startMission(id,options={}) {
      const prerequisites=[...(options.prerequisites||[])];
      const experimental=[...(options.experimentalPrerequisites||[])];
      if (prerequisites.length || experimental.length) {
        lifecycle[id]={status:'hidden'};
        pending[id]={missionId:id,prerequisites,experimentalPrerequisites:experimental,options};
      } else {
        lifecycle[id]={status:'active'};
      }
      return true;
    }
  };
  r.manager=()=>manager;
  r.missionLifecycle=id=>({
    status:lifecycle[id]?.status || null,
    active:lifecycle[id]?.status === 'active',
    completed:lifecycle[id]?.status === 'completed'
  });

  assert.equal(r.activateInitialMissions(), false, 'pending bootstrap is intentionally unsettled');
  const initial=r.catalog.filter(m=>m.initialState==='active');
  assert.equal(initial.length,20,'catalog baseline changed: review pending bootstrap contract');
  assert.equal(lifecycle.T01?.status,'active');
  assert.equal(Object.values(lifecycle).filter(x=>x.status==='active').length,1,'only T01 may be active on fresh game');
  for (const mission of initial.filter(m=>m.id!=='T01')) {
    assert.equal(lifecycle[mission.id]?.status,'hidden',`${mission.id} must stay hidden/pending`);
    assert.ok(pending[mission.id],`${mission.id} canonical pending request missing`);
  }
  assert.equal(pending.T02.prerequisites.includes('T08'),false,'tutorial relay must keep its original prerequisite only');
  assert.equal(pending['GAME-shelter'].prerequisites.includes('T08'),false,'shelter remains the deliberate pre-T08 exception');
  for (const id of ['GAME-base','GAME-civilization_1','GAME-engineering_1','GAME-engineering_3','ENE-11','FLO-01']) {
    assert.equal(pending[id].prerequisites.includes('T08'),true,`${id} must remain foundation-gated while pending`);
  }
});

test('G09 published state fully hides an off-map local primary from active/top-level consumers while keeping journal history', () => {
  const { Manager, definitions } = bootManager();
  definitions.T03={id:'T03',title:'Camp',localVisibility:'current-map',targetMapId:'crystal'};
  const tree={id:'T03',title:'Camp',description:'Camp',root:{status:'active'},availableLeaves(){return[];},toJSON(){return {id:'T03',title:'Camp',root:{status:'active',children:[]}};}};
  const m=Object.create(Manager.prototype);
  m.engine={currentMapId:'remote'};
  m.memory={state:{missionLifecycle:{T03:{status:'active',activatedAt:1,source:'tutorial'}}}};
  m.trees=new Map([['T03',tree]]); m.tree=tree; m.activeMissionIds=['T03']; m.primaryMissionId='T03';
  m.selectionReason=''; m.pendingPrimaryMissionId='T03'; m.currentAction=null;
  m.pendingExperimentCatalogEntries=()=>[]; m.pendingExperimentationIntent=()=>null;
  m.treeProgress=()=>0; m.displayTreeSnapshot=tree=>tree?{id:tree.id}:null;
  const state=m.getState();
  assert.equal(state.activeMissionIds.length,0);
  assert.equal(state.primaryMissionId,'');
  assert.equal(state.pendingPrimaryMissionId,null);
  assert.equal(state.pendingPrimaryMissionTitle,'');
  assert.equal(state.missionId,'');
  assert.equal(state.title,'');
  assert.equal(state.tree,null);
  assert.equal(state.missions.some(x=>x.missionId==='T03'),false);
  assert.equal(state.catalog.some(x=>x.missionId==='T03'),true,'global journal must retain known mission');
  const catalogT03=state.catalog.find(x=>x.missionId==='T03');
  assert.equal(catalogT03.lifecycleStatus,'active','internal lifecycle remains active for journal/history');
  assert.equal(catalogT03.status,'active','journal must preserve the real lifecycle status');
  assert.equal(catalogT03.contextVisible,false);

  // Exact mission-ui-bridge consumer semantics from HEAD 329d3ccb:
  // activeMissionIds(state) merges activeMissionIds + missions(active) + catalog(active).
  const uiActiveIds=new Set(Array.isArray(state.activeMissionIds)?state.activeMissionIds:[]);
  (state.missions||[]).filter(m=>m.lifecycleStatus==='active').forEach(m=>uiActiveIds.add(m.missionId));
  (state.catalog||[]).filter(m=>m.status==='active' && m.contextVisible!==false).forEach(m=>uiActiveIds.add(m.missionId));
  assert.equal(uiActiveIds.has('T03'),false,'mission-ui-bridge must not reconstruct off-map T03 from catalog');

  m.engine.currentMapId='crystal';
  const back=m.getState();
  const backT03=back.catalog.find(x=>x.missionId==='T03');
  assert.equal(backT03.status,'active','return to Crystal keeps the real active status');
  assert.equal(backT03.contextVisible,true);
});

test('G09 mission-ui consumer: contextHidden active mission stays in journal without active reconstruction or false lifecycle controls', () => {
  const uiSource=fs.readFileSync(path.join(ROOT,'engine/mission-ui-bridge.js'),'utf8');
  assert.match(uiSource,/\.filter\(\(mission\) => mission\.status === "active"\)\s*\.filter\(\(mission\) => mission\.contextVisible !== false\)/s,
    'catalog active reconstruction must respect contextVisible');
  assert.match(uiSource,/const contextVisible = mission\.contextVisible !== false;/,
    'journal actions must explicitly consume contextVisible');
  assert.match(uiSource,/if \(contextVisible && mission\.status === "active" && !mission\.isPrimary\)/,
    'off-map active mission must not expose Prioritize');
  assert.match(uiSource,/if \(contextVisible && mission\.status === "active"\)/,
    'off-map active mission must not expose Pause');
  assert.match(uiSource,/else if \(contextVisible && mission\.status === "paused"\)/,
    'off-map mission must not expose Resume merely because it is context-hidden');

  const mission={missionId:'T03',status:'active',lifecycleStatus:'active',contextVisible:false,isPrimary:false};
  const state={activeMissionIds:[],missions:[],catalog:[mission]};
  const ids=new Set(state.activeMissionIds);
  state.missions.filter(m=>m.lifecycleStatus==='active' && m.contextVisible!==false).forEach(m=>ids.add(m.missionId));
  state.catalog.filter(m=>m.status==='active' && m.contextVisible!==false).forEach(m=>ids.add(m.missionId));
  assert.equal(ids.has('T03'),false);
  assert.equal(state.catalog.some(m=>m.missionId==='T03' && m.status==='active'),true,'journal retains real active lifecycle');
  const canPrioritize=mission.contextVisible!==false && mission.status==='active' && !mission.isPrimary;
  const canPause=mission.contextVisible!==false && mission.status==='active';
  const canResume=mission.contextVisible!==false && mission.status==='paused';
  assert.equal(canPrioritize,false);
  assert.equal(canPause,false);
  assert.equal(canResume,false);
});

test('BAC propagation is visibility-only and preserves unrelated HEAD logic', () => {
  assert.equal((bacSource.match(/isMissionVisibleOnCurrentMap\?\.\(id\) !== false/g)||[]).length,4);
  assert.match(bacSource,/const sites = raw\?\.sites && typeof raw\.sites === "object" \? raw\.sites : \{ \[raw\?\.kind\]: raw \};/,
    'P1 must not import the unrelated R8.3 siteProgression change');
  assert.doesNotMatch(bacSource,/hasMissionExecutionAuthority\(/,
    'authority belongs to Passe 2');
});

test('G09 runtime consumer: chooseRunnableMissionAction cannot execute off-map T03 and relays a visible mission', () => {
  const { Manager } = bootManager();
  const m=Object.create(Manager.prototype);
  m.engine={currentMapId:'remote'};
  m.definition=id => id==='T03'
    ? {id:'T03',localVisibility:'current-map',targetMapId:'crystal'}
    : {id,title:id};
  m.activeMissionIds=['T03','VISIBLE'];
  m.primaryMissionId='T03';
  m.trees=new Map([['T03',{}],['VISIBLE',{}]]);
  m.memory={state:{missionLifecycle:{T03:{status:'active'},VISIBLE:{status:'active'}}}};
  m.ensureLifecycle=id=>m.memory.state.missionLifecycle[id];
  m.hasActivePrimaryMission=()=>false;
  m.getPrioritizedMissionIds=()=>['T03','VISIBLE'];
  m.assessMission=id=>({missionId:id,score:id==='T03'?999:10,action:{type:'observe',nodeId:`${id}:step`}});
  const chosen=m.chooseRunnableMissionAction({needs:{}});
  assert.equal(chosen.missionId,'VISIBLE');
  assert.equal(chosen.primary,false);
});

test('329d runtime non-regression: ordinary priority review does not replace an active Top1', () => {
  const { Manager } = bootManager();
  const m=Object.create(Manager.prototype);
  const primaryTree={root:{isComplete:false}};
  m.primaryMissionId='PRIMARY';
  m.activeMissionIds=['PRIMARY','CHALLENGER'];
  m.tree=primaryTree;
  m.trees=new Map([['PRIMARY',primaryTree],['CHALLENGER',{root:{isComplete:false}}]]);
  m.memory={state:{missionLifecycle:{PRIMARY:{status:'active',autoPrimaryEligible:true},CHALLENGER:{status:'active',autoPrimaryEligible:true}}}};
  m.currentAction=null;
  m.bridge={isEngineBusy:()=>false,context:()=>({needs:{}})};
  m.isPlayerSelectedPrimary=()=>false;
  m.hasPendingMissionReturn=()=>false;
  m.isMissionVisibleOnCurrentMap=()=>true;
  let assessments=0;
  m.assessMission=id=>{ assessments++; return {missionId:id,score:id==='CHALLENGER'?1000:1,action:{type:'observe'},reasons:[]}; };
  m.setPrimaryMission=()=>{ throw new Error('ordinary review must not replace an active Top1'); };
  assert.equal(m.selectBestPrimary(1234,false),false);
  assert.equal(m.primaryMissionId,'PRIMARY');
  assert.equal(assessments,0,'persistent Top1 guard should return before rescoring');
});

test('G09 runtime activation path: non-primary off-map T03 remains in global journal through getState early-return', () => {
  const { Manager, definitions } = bootManager();
  definitions.T03={id:'T03',title:'Camp',localVisibility:'current-map',targetMapId:'crystal'};
  const tree={
    id:'T03',title:'Camp',description:'Camp',
    root:{status:'active',isComplete:false},
    availableLeaves(){return[];},
    toJSON(){return {id:'T03',title:'Camp',root:{status:'active',children:[]}};}
  };
  const lifecycle={};
  const m=Object.create(Manager.prototype);
  m.engine={currentMapId:'remote'};
  m.planner={restoreOrCreate:id=>{ assert.equal(id,'T03'); return tree; }};
  m.memory={
    state:{missionLifecycle:lifecycle,pendingActivations:{},missions:{}},
    saveTree(){return true;}, save(){return true;}, remember(){}
  };
  m.trees=new Map(); m.tree=null; m.activeMissionIds=[]; m.primaryMissionId=''; m.activeMissionId='';
  m.selectionReason=''; m.pendingPrimaryMissionId=null; m.currentAction=null; m.retryAfter=0; m.idleRetryUntil=0;
  m.syncMissionSelection=()=>{}; m.wakeIdleRetry=()=>{}; m.publish=()=>{};
  m.pendingExperimentCatalogEntries=()=>[]; m.pendingExperimentationIntent=()=>null;
  m.treeProgress=()=>0; m.displayTreeSnapshot=t=>t?{id:t.id}:null;

  assert.equal(m.activateMission('T03',{primary:false,source:'bible',reason:'T02 completed'}),true);
  assert.equal(m.primaryMissionId,'');
  assert.equal(m.tree,null);
  assert.deepEqual(m.activeMissionIds,['T03']);
  assert.equal(lifecycle.T03.status,'active');

  const state=m.getState();
  assert.equal(state.activeMissionIds.length,0,'off-map T03 must stay out of local active projection');
  assert.equal(state.primaryMissionId,'');
  assert.equal(state.missions.length,0);
  const journalT03=state.catalog.find(entry=>entry.missionId==='T03');
  assert.ok(journalT03,'known active T03 must survive the no-visible-mission early return');
  assert.equal(journalT03.status,'active');
  assert.equal(journalT03.lifecycleStatus,'active');
  assert.equal(journalT03.contextVisible,false);
});
