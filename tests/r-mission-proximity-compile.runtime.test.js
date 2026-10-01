const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = process.env.TARGET_ROOT || path.join(__dirname, '..');
const runtimeSource = fs.readFileSync(path.join(ROOT, 'engine/bible-runtime-v0-1-unified.js'), 'utf8');
const managerSource = fs.readFileSync(path.join(ROOT, 'engine/mission-manager.js'), 'utf8');

function boot() {
  const definitions = {};
  const BF = {};
  const window = {
    BlueFox3D: BF,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {},
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
  };
  window.window = window;
  BF.BiblePatterns = { SEQUENCE_ACTIONS: { autonomyAxis: 'research', steps: [] }, SIMPLE: { autonomyAxis: 'research', steps: [] } };
  BF.BibleCatalog = [];
  BF.getAutonomyMode = () => 'full';
  BF.getProgressionState = () => ({ inventory: {} });
  BF.getMapExplorationState = () => ({ surfacePercent: 50 });
  BF.getKnownSites = (criteria = {}) => [{
    siteId: 'crystal-workbench', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-ETABLI-VIDE', knownInstanceCount: 1
  }].filter((site) => !criteria.microSceneId || site.microSceneId === criteria.microSceneId);
  BF.BAC = { weightedPick(options) { return options[0] || null; } };
  BF.Missions = {
    definitions,
    getDefinition: (id) => definitions[id] || null,
    normalizeActionType: (v) => String(v || ''),
    ActionType: { TRAVEL:'travel', COLLECT:'collect', EXTRACT:'extract', OBSERVE:'observe', INSPECT:'inspect', ANALYZE:'analyze', RESEARCH:'research', CRAFT:'craft', BUILD:'build', EXPLORE_ZONE:'explore_zone', REST:'rest', EAT:'eat' },
    MissionStatus: { AVAILABLE:'available', ACTIVE:'active', COMPLETED:'completed', FAILED:'failed' }
  };
  BF.registerMissionDefinitions = (items) => { for (const item of items) definitions[item.id] = item; };
  const context = vm.createContext({ window, CustomEvent: class {}, console, performance, Date, Math, JSON, Set, Map });
  vm.runInContext(runtimeSource, context, { filename:'bible-runtime-v0-1-unified.js' });
  vm.runInContext(managerSource, context, { filename:'mission-manager.js' });
  return { BF };
}

const ene11 = {
  id: 'ENE-11', title: 'Prototype énergétique', description: "Revenir à l’établi de Crystal, assembler le prototype.",
  pattern: 'SEQUENCE_ACTIONS', priority: 220,
  sequence: [
    { slot:'prototype', title:'Assembler le prototype', action:'research', target:1, params:{ eventDriven:true, catalogManaged:true } },
    { slot:'charge', title:'Charger le prototype', action:'research', target:1, requires:['prototype'], params:{ eventDriven:true, catalogManaged:true } }
  ],
  proximityContexts: [{ slot:'prototype', microSceneId:'MSC-CUSTOM-ETABLI-VIDE', radius:8 }]
};

test('BibleRuntime compileMission propagates ENE-11 proximityContexts into registered definition', () => {
  const { BF } = boot();
  const Runtime = BF.BibleRuntimeV01;
  const runtime = Object.create(Runtime.prototype);
  runtime.patterns = BF.BiblePatterns;
  const compiled = runtime.compileMission(ene11);
  assert.ok(compiled);
  assert.deepEqual(JSON.parse(JSON.stringify(compiled.proximityContexts)), ene11.proximityContexts);
  BF.registerMissionDefinitions([compiled]);
  assert.equal(BF.Missions.getDefinition('ENE-11').proximityContexts[0].slot, 'prototype');
  assert.equal(BF.Missions.getDefinition('ENE-11').proximityContexts[0].microSceneId, 'MSC-CUSTOM-ETABLI-VIDE');
});

test('compiled ENE-11 definition reaches MissionManager known-destination routing', () => {
  const { BF } = boot();
  const Runtime = BF.BibleRuntimeV01;
  const runtime = Object.create(Runtime.prototype);
  runtime.patterns = BF.BiblePatterns;
  const compiled = runtime.compileMission(ene11);
  BF.registerMissionDefinitions([compiled]);

  const Manager = BF.Missions.MissionManager;
  const m = Object.create(Manager.prototype);
  const lifecycle = { 'ENE-11': { status:'active', urgency:0, narrativePriority:0, autoPrimaryEligible:true } };
  const node = { id:'ENE-11:prototype', type:'research', params:{ eventDriven:true, catalogManaged:true, sequenceSlot:'prototype' }, isComplete:false, target:1, progress:0, distinctValues:[] };
  m.engine = {
    currentMapId:'field', currentMap:{ interactables:[], group:{userData:{microScenes:[]}} }, discoveredMaps:new Set(['field','crystal']),
    findOptimalRoute(from,to){ return from==='field'&&to==='crystal' ? ['field','crystal'] : null; },
    findKnownRoute(){ return null; }
  };
  m.memory = { state:{ missionLifecycle:lifecycle }, getFact(_k,d=null){return d;}, setFact(){}, save(){}, remember(){} };
  m.bridge = { context:()=>({mapId:'field',energy:80,needs:{}}), isEngineBusy:()=>false };
  m.planner = { nextAction:()=>null, requiredMapState:()=>({constrained:false}) };
  m.trees = new Map([['ENE-11',{ id:'ENE-11', root:{isComplete:false,walk(){}}, availableLeaves:()=>[node], find:(id)=>id===node.id?node:null }]]);
  m.activeMissionIds=['ENE-11']; m.primaryMissionId='ENE-11'; m.currentAction=null; m.executionRecovery=new Map(); m.targetProbeDiagnostics=new Map();
  m.ensureLifecycle=(id)=>lifecycle[id]; m.missionHasHistoricalCollectionObjective=()=>false;
  const travel = m.missionTransitionFor('ENE-11', m.bridge.context());
  assert.equal(travel?.source, 'mission-known-destination');
  assert.equal(travel?.node?.params?.toMapId, 'crystal');
  assert.equal(travel?.node?.params?.knownDestination?.microSceneId, 'MSC-CUSTOM-ETABLI-VIDE');
});

test('generic compile path also propagates proximityContexts', () => {
  const { BF } = boot();
  const Runtime = BF.BibleRuntimeV01;
  const runtime = Object.create(Runtime.prototype); runtime.patterns = { SIMPLE:{ autonomyAxis:'research', steps:[{slot:'work',action:'research',requires:[]}] } };
  const mission = { id:'GEN-CTX', title:'Generic', pattern:'SIMPLE', proximityContexts:[{slot:'work',microSceneId:'MSC-X'}], slots:{work:{params:{catalogManaged:true}}} };
  const compiled = runtime.compileMission(mission);
  assert.equal(compiled.proximityContexts[0].microSceneId, 'MSC-X');
});
