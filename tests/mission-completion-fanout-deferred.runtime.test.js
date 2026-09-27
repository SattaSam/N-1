const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const runtimeFile = process.env.BLUEFOX_RUNTIME_FILE || path.join(ROOT, 'engine/bible-runtime-v0-1-unified.js');

function boot(catalog, options = {}) {
  const listeners = new Map();
  const facts = new Map(Object.entries(options.facts || {}));
  const lifecycle = Object.create(null);
  const trees = new Map();
  const definitions = new Set(catalog.map((m) => m.id));
  const starts = [];
  const selectionSnapshots = [];
  let primaryMissionId = options.primaryMissionId || null;
  const local = new Map();

  lifecycle.T08 = { status: 'completed' };
  for (const id of options.completed || []) lifecycle[id] = { status: 'completed' };
  for (const id of options.active || []) lifecycle[id] = { status: 'active' };

  const memory = {
    state: { missionLifecycle: lifecycle, researchUnlocks: { ...(options.researchUnlocks || {}) }, siteProgression: {}, missions: {} },
    getFact(key, fallback = null) { return facts.has(key) ? facts.get(key) : fallback; },
    setFact(key, value) { if (value == null) facts.delete(key); else facts.set(key, value); return value; },
    save() {}, saveTree() {}, hasEffectReceipt() { return false; }, recordEffectReceipt() {}
  };
  let publishMissionState = null;
  const manager = {
    memory,
    trees,
    activeMissionIds: Object.keys(lifecycle).filter((id) => lifecycle[id].status === 'active'),
    get primaryMissionId() { return primaryMissionId; },
    set primaryMissionId(v) { primaryMissionId = v; },
    retryAfter: 0,
    catalogController: { getRelation() { return { rank: 'honored', score: 10 }; }, schedule() {} },
    startMission(id, startOptions = {}) {
      starts.push({ id, ...startOptions });
      if (options.failActivation?.has(id)) return false;
      if (lifecycle[id]?.status === 'active' || lifecycle[id]?.status === 'completed') return false;
      lifecycle[id] = { status: 'active' };
      if (!this.activeMissionIds.includes(id)) this.activeMissionIds.push(id);
      trees.set(id, { root: { isComplete: false, walk() {} }, find() { return null; }, availableLeaves() { return []; }, refresh() {} });
      if (startOptions.primary === true) primaryMissionId = id;
      if (options.publishOnStart === true) publishMissionState?.();
      return true;
    },
    selectBestPrimary() {
      selectionSnapshots.push([...this.activeMissionIds]);
      // Preserve existing primary in this focused runtime harness.
      return primaryMissionId;
    },
    publish() {}, syncLifecycleFromTrees() {}, reevaluatePendingActivations() {},
  };

  const BF = {
    BibleCatalog: catalog,
    BiblePatterns: {},
    BibleContractV01: { validateCatalog() { return { ok: true, errors: [], warnings: [] }; } },
    Missions: {
      getDefinition(id) { return definitions.has(id) ? { id } : null; },
      normalizeActionType(v) { return v; },
      MissionStatus: { COMPLETED: 'completed', ACTIVE: 'active', AVAILABLE: 'available', LOCKED: 'locked' },
      MISSION_STORAGE_KEY: 'test'
    },
    registerMissionDefinitions(defs) { for (const d of defs || []) if (d?.id) definitions.add(d.id); return defs?.length || 0; },
    ObjectEvents: { subscribe() { return () => {}; }, types: {} },
    currentEngine: { currentMapId: 'crystal', currentZoneIndex: 0, missionManager: manager, callbacks: {} },
    getMissionState() { return { missions: Object.entries(lifecycle).map(([missionId, x]) => ({ missionId, lifecycleStatus: x.status })) }; },
    getExplorationSummary() { return { maps: {} }; },
    getMapExplorationState() { return { surfacePercent: 0 }; },
    getProgressionState() { return { counters: { global: {} }, inventory: {} }; },
    progression: { snapshot() { return { discoveries: { instances: {} }, counters: { global: {} } }; }, state: { discoveries: { instances: {} } } },
    ObjectLibrary: { list() { return []; }, get() { return null; }, getById() { return null; } },
    PersistentMicroScenes: {}, MicroScenes: { get() { return null; } },
    maps: {},
  };

  const sandbox = {
    BlueFox3D: BF,
    window: null,
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Set,
    Map,
    Promise,
    performance: { now: () => 1000 },
    CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    localStorage: { getItem(k) { return local.get(k) ?? null; }, setItem(k,v) { local.set(k,String(v)); }, removeItem(k) { local.delete(k); } },
    addEventListener(type, fn) { const xs = listeners.get(type) || []; xs.push(fn); listeners.set(type, xs); },
    removeEventListener(type, fn) { const xs = listeners.get(type) || []; listeners.set(type, xs.filter((x) => x !== fn)); },
    dispatchEvent(event) { for (const fn of listeners.get(event.type) || []) fn(event); return true; },
    setTimeout() { return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {}, queueMicrotask(fn) { fn(); }
  };
  sandbox.window = sandbox;
  publishMissionState = () => sandbox.dispatchEvent(new sandbox.CustomEvent('bluefox:mission-state', { detail: BF.getMissionState() }));
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(runtimeFile, 'utf8'), sandbox, { filename: runtimeFile });
  return { runtime: sandbox.BlueFox3D.bibleRuntime, BF: sandbox.BlueFox3D, manager, memory, facts, lifecycle, starts, selectionSnapshots, listeners, sandbox };
}

const follower = (id, source, priority, extra = {}) => ({
  id, pattern: 'NONE', priority,
  trigger: { type: 'progression.mission_completed', missionId: source, count: 1 },
  prerequisites: [source], ...extra
});

function completion(source) { return { type: 'progression.mission_completed', missionId: source, amount: 1, mapId: 'crystal' }; }

test('completion fans out all immediately eligible followers; only original selected mission can keep its historical primaryOnActivation', () => {
  const catalog = [
    follower('A','SRC',100,{primaryOnActivation:true}),
    follower('B','SRC',90),
    follower('C','SRC',80,{primaryOnActivation:true})
  ];
  const { runtime, starts, lifecycle, manager } = boot(catalog, { completed:['SRC'] });
  const out = runtime.consumeTriggerEvent(completion('SRC'));
  assert.deepEqual(Array.from(out.activatedMissionIds), ['A','B','C']);
  assert.equal(lifecycle.A.status, 'active'); assert.equal(lifecycle.B.status, 'active'); assert.equal(lifecycle.C.status, 'active');
  assert.equal(starts.find(x=>x.id==='A').primary, true);
  assert.equal(starts.find(x=>x.id==='B').primary, false);
  assert.equal(starts.find(x=>x.id==='C').primary, false, 'fan-out follower must not steal Top1 via its own primaryOnActivation');
  assert.equal(manager.primaryMissionId, 'A');
});

test('map_discovered retains single-winner behavior', () => {
  const catalog = [
    {id:'MAP-A',pattern:'NONE',priority:100,trigger:{type:'exploration.map_discovered',count:1},prerequisites:[]},
    {id:'MAP-B',pattern:'NONE',priority:90,trigger:{type:'exploration.map_discovered',count:1},prerequisites:[]}
  ];
  const { runtime, lifecycle } = boot(catalog);
  const out = runtime.consumeTriggerEvent({type:'exploration.map_discovered',mapId:'m1',amount:1});
  assert.deepEqual(Array.from(out.activatedMissionIds), ['MAP-A']);
  assert.equal(lifecycle['MAP-A'].status,'active'); assert.equal(lifecycle['MAP-B'],undefined);
});

test('existing concurrent group still activates together, plus completion followers outside the group', () => {
  const catalog = [
    follower('G1','SRC',100,{concurrentAvailabilityGroup:'branch'}),
    follower('G2','SRC',95,{concurrentAvailabilityGroup:'branch'}),
    follower('OTHER','SRC',90)
  ];
  const { runtime, lifecycle, selectionSnapshots } = boot(catalog,{completed:['SRC']});
  const out=runtime.consumeTriggerEvent(completion('SRC'));
  assert.deepEqual(new Set(Array.from(out.activatedMissionIds)), new Set(['G1','G2','OTHER']));
  assert.deepEqual(new Set(selectionSnapshots.at(-1)), new Set(['G1','G2','OTHER']), 'priority arbitration must see every follower first');
  assert.equal(lifecycle.G1.status,'active'); assert.equal(lifecycle.G2.status,'active'); assert.equal(lifecycle.OTHER.status,'active');
});

test('allowActivation:false neither activates nor arms a deferred completion receipt', () => {
  const catalog=[follower('LATER','SRC',10,{requiredFacts:['fact:x']})];
  const { runtime, memory, lifecycle }=boot(catalog,{completed:['SRC']});
  const out=runtime.consumeTriggerEvent(completion('SRC'),{allowActivation:false});
  assert.equal(out.activatedMissionId,null); assert.equal(lifecycle.LATER,undefined);
  assert.equal(memory.getFact('bibleDeferredTrigger:LATER',null),null);
});

test('TP-like one-shot completion is preserved while requiredFact is absent and activates after exact fact event', () => {
  const mission=follower('TP-01','POSTDIP-01',201,{prerequisites:['POSTDIP-01','ENE-15-C'],requiredFacts:['civilization:research:teleport-hypothesis-v1']});
  const { runtime, memory, lifecycle, sandbox, starts }=boot([mission],{completed:['POSTDIP-01','ENE-15-C']});
  runtime.consumeTriggerEvent(completion('POSTDIP-01'));
  assert.equal(lifecycle['TP-01'],undefined);
  const receipt=memory.getFact('bibleDeferredTrigger:TP-01',null);
  assert.equal(receipt?.type,'progression.mission_completed'); assert.equal(receipt?.missionId,'POSTDIP-01');
  assert.equal(runtime.state.triggerCounts['TP-01:progression.mission_completed'],1);
  memory.setFact('civilization:research:teleport-hypothesis-v1',{at:1});
  sandbox.dispatchEvent(new sandbox.CustomEvent('bluefox:teleportation-hypothesis',{detail:{}}));
  assert.equal(lifecycle['TP-01'].status,'active');
  assert.equal(starts.find(x=>x.id==='TP-01').primary,false,'deferred follower is availability only');
  assert.equal(memory.getFact('bibleDeferredTrigger:TP-01',null),null);
  assert.equal(runtime.state.triggerCounts['TP-01:progression.mission_completed'],1,'causal event must not be counted twice');
});

test('TP-like receipt survives while another mission prerequisite is also missing', () => {
  const mission=follower('TP-01','POSTDIP-01',201,{prerequisites:['POSTDIP-01','ENE-15-C'],requiredFacts:['civilization:research:teleport-hypothesis-v1']});
  const { runtime, memory, lifecycle, sandbox }=boot([mission],{completed:['POSTDIP-01']});
  runtime.consumeTriggerEvent(completion('POSTDIP-01'));
  assert.ok(memory.getFact('bibleDeferredTrigger:TP-01',null));
  lifecycle['ENE-15-C']={status:'completed'};
  runtime.reconcileDeferredCompletionTriggers(); assert.equal(lifecycle['TP-01'],undefined);
  memory.setFact('civilization:research:teleport-hypothesis-v1',{at:2});
  sandbox.dispatchEvent(new sandbox.CustomEvent('bluefox:teleportation-hypothesis',{detail:{}}));
  assert.equal(lifecycle['TP-01'].status,'active');
});

test('requiredFactValues one-shot completion is also safely deferred then replayed', () => {
  const mission=follower('FIN-01','END-CHOICE',170,{requiredFactValues:[{fact:'endChoice:decision',field:'choiceId',equals:'return'}]});
  const { runtime, memory, lifecycle }=boot([mission],{completed:['END-CHOICE']});
  runtime.consumeTriggerEvent(completion('END-CHOICE'));
  assert.ok(memory.getFact('bibleDeferredTrigger:FIN-01',null));
  memory.setFact('endChoice:decision',{choiceId:'return'});
  runtime.reconcileDeferredCompletionTriggers();
  assert.equal(lifecycle['FIN-01'].status,'active');
});

test('count > 1 completion trigger is not converted into one-shot deferred semantics', () => {
  const mission={...follower('MULTI','SRC',10,{requiredFacts:['x']}),trigger:{type:'progression.mission_completed',missionId:'SRC',count:2}};
  const { runtime, memory, lifecycle }=boot([mission],{completed:['SRC']});
  runtime.consumeTriggerEvent(completion('SRC'));
  assert.equal(memory.getFact('bibleDeferredTrigger:MULTI',null),null); assert.equal(lifecycle.MULTI,undefined);
});

test('when selected activation fails, a lower completion follower can still activate and is reported', () => {
  const catalog=[follower('FAIL','SRC',100),follower('OK','SRC',90)];
  const {runtime,lifecycle}=boot(catalog,{completed:['SRC'],failActivation:new Set(['FAIL'])});
  const out=runtime.consumeTriggerEvent(completion('SRC'));
  assert.deepEqual(Array.from(out.activatedMissionIds),['OK']); assert.equal(out.activatedMissionId,'OK'); assert.equal(lifecycle.OK.status,'active');
});


function loadCatalogFile() {
  const catalogFile = process.env.BLUEFOX_CATALOG_FILE || path.join(ROOT, 'data/bible-catalog.js');
  if (!fs.existsSync(catalogFile)) return null;
  const holder = { BlueFox3D: {} }; holder.window = holder;
  const ctx = vm.createContext({ window: holder, console, Object, Array, Map, Set, Math, JSON });
  vm.runInContext(fs.readFileSync(catalogFile, 'utf8'), ctx, { filename: catalogFile });
  return holder.BlueFox3D.BibleCatalog;
}

function catalogPick(ids) {
  const cat = loadCatalogFile();
  if (!cat) return null;
  return ids.map((id) => {
    const m = cat.find((x) => x.id === id);
    assert.ok(m, `${id} missing from catalog`);
    return m;
  });
}

test('real catalog: T13 completion exposes FLO-02 and all four ENV followers together', { skip: !fs.existsSync(process.env.BLUEFOX_CATALOG_FILE || path.join(ROOT, 'data/bible-catalog.js')) }, () => {
  const ids=['FLO-02','ENV-RELIC-20','ENV-ROCK-20','ENV-PLANT-20','ENV-WORLD-10'];
  const {runtime,lifecycle,manager}=boot(catalogPick(ids),{completed:['T13']});
  const out=runtime.consumeTriggerEvent(completion('T13'));
  assert.deepEqual(new Set(Array.from(out.activatedMissionIds)), new Set(ids));
  for(const id of ids) assert.equal(lifecycle[id].status,'active',`${id} active`);
  assert.equal(manager.primaryMissionId,'FLO-02','historical selected mission keeps existing Top1 request');
});

test('real catalog: FAU-03 completion exposes FAU-04 and FAU-12', { skip: !fs.existsSync(process.env.BLUEFOX_CATALOG_FILE || path.join(ROOT, 'data/bible-catalog.js')) }, () => {
  const ids=['FAU-04','FAU-12']; const {runtime,lifecycle}=boot(catalogPick(ids),{completed:['FAU-03']});
  const out=runtime.consumeTriggerEvent(completion('FAU-03'));
  assert.deepEqual(new Set(Array.from(out.activatedMissionIds)),new Set(ids)); for(const id of ids) assert.equal(lifecycle[id].status,'active');
});

test('real catalog: GAME exploration completion exposes EXP-01 and GAME-travel_biomes', { skip: !fs.existsSync(process.env.BLUEFOX_CATALOG_FILE || path.join(ROOT, 'data/bible-catalog.js')) }, () => {
  const ids=['EXP-01','GAME-travel_biomes']; const {runtime,lifecycle}=boot(catalogPick(ids),{completed:['GAME-exploration_complete']});
  const out=runtime.consumeTriggerEvent(completion('GAME-exploration_complete'));
  assert.deepEqual(new Set(Array.from(out.activatedMissionIds)),new Set(ids)); for(const id of ids) assert.equal(lifecycle[id].status,'active');
});

test('real catalog: PHEN-01 group and CART-02 all survive the same completion event', { skip: !fs.existsSync(process.env.BLUEFOX_CATALOG_FILE || path.join(ROOT, 'data/bible-catalog.js')) }, () => {
  const ids=['PHEN-02','PHEN-03','PHEN-04','PHEN-05','PHEN-06','PHEN-07','CART-02'];
  const {runtime,lifecycle}=boot(catalogPick(ids),{completed:['PHEN-01','BAL-03']});
  const out=runtime.consumeTriggerEvent(completion('PHEN-01'));
  assert.deepEqual(new Set(Array.from(out.activatedMissionIds)),new Set(ids)); for(const id of ids) assert.equal(lifecycle[id].status,'active');
});

test('real catalog: BAL-03 exposes DRN-01 and PHEN-01 when research prerequisite is already ready', { skip: !fs.existsSync(process.env.BLUEFOX_CATALOG_FILE || path.join(ROOT, 'data/bible-catalog.js')) }, () => {
  const ids=['DRN-01','PHEN-01']; const {runtime,lifecycle}=boot(catalogPick(ids),{completed:['BAL-03','ENE-13'],researchUnlocks:{reverse_engineering:{unlockedAt:1}}});
  const out=runtime.consumeTriggerEvent(completion('BAL-03'));
  assert.deepEqual(new Set(Array.from(out.activatedMissionIds)),new Set(ids)); for(const id of ids) assert.equal(lifecycle[id].status,'active');
});

test('real catalog: COL historical follower remains active and MAT-01 is not lost', { skip: !fs.existsSync(process.env.BLUEFOX_CATALOG_FILE || path.join(ROOT, 'data/bible-catalog.js')) }, () => {
  const ids=['COL-MINERAL-250','MAT-01']; const {runtime,lifecycle}=boot(catalogPick(ids),{completed:['COL-MINERAL-100','COL-WOOD-100','COL-FIBER-100']});
  const out=runtime.consumeTriggerEvent(completion('COL-MINERAL-100'));
  // COL-MINERAL-250 may already have been restored by the dedicated historical
  // collection reconciler during runtime start; the gameplay invariant is that
  // both followers are active and MAT-01 is not lost.
  assert.ok(out.activatedMissionIds.includes('MAT-01'));
  for(const id of ids) assert.equal(lifecycle[id].status,'active');
});


test('actual runtime: persisted deferred completion receipt is sufficient after runtime trigger counter loss', () => {
  const mission=follower('TP-01','POSTDIP-01',201,{prerequisites:['POSTDIP-01','ENE-15-C'],requiredFacts:['civilization:research:teleport-hypothesis-v1']});
  const { runtime, memory, lifecycle }=boot([mission],{completed:['POSTDIP-01','ENE-15-C'],facts:{
    'bibleDeferredTrigger:TP-01':{type:'progression.mission_completed',missionId:'POSTDIP-01',mapId:'crystal',amount:1,factRequirementsDeferred:true},
    'civilization:research:teleport-hypothesis-v1':{at:3}
  }});
  delete runtime.state.triggerCounts['TP-01:progression.mission_completed'];
  assert.equal(runtime.reconcileDeferredCompletionTriggers(),true);
  assert.equal(lifecycle['TP-01'].status,'active');
  assert.equal(memory.getFact('bibleDeferredTrigger:TP-01',null),null);
});



test('unmarked historical deferred receipt stays owned by MissionManager and is ignored by fact replay', () => {
  const mission=follower('DRN-01','BAL-03',292,{prerequisites:['BAL-03','ENE-13'],experimentalPrerequisites:['reverse_engineering']});
  const {runtime,memory,lifecycle}=boot([mission],{completed:['BAL-03','ENE-13'],facts:{
    'bibleDeferredTrigger:DRN-01':{type:'progression.mission_completed',missionId:'BAL-03',mapId:'crystal',amount:1}
  },research:['reverse_engineering']});
  assert.equal(runtime.reconcileDeferredCompletionTriggers(),false);
  assert.notEqual(lifecycle['DRN-01']?.status,'active');
  assert.ok(memory.getFact('bibleDeferredTrigger:DRN-01',null));
});

test('real lifecycle translator: completed source fans out through reconcileMissionCompletionTriggers, not only direct consume', () => {
  const source={id:'SRC',pattern:'NONE',priority:1,trigger:{type:'manual'},prerequisites:[]};
  const catalog=[source,follower('A','SRC',100),follower('B','SRC',90)];
  const {runtime,lifecycle}=boot(catalog,{active:['SRC']});
  runtime.missionLifecycleStatuses.set('SRC','active');
  lifecycle.SRC={status:'completed'};
  assert.equal(runtime.reconcileMissionCompletionTriggers(),true);
  assert.equal(lifecycle.A.status,'active');
  assert.equal(lifecycle.B.status,'active');
});

test('synchronous mission-state publication during deferred activation does not double-start the mission', () => {
  const mission=follower('TP-01','POSTDIP-01',201,{prerequisites:['POSTDIP-01','ENE-15-C'],requiredFacts:['civilization:research:teleport-hypothesis-v1']});
  const {runtime,memory,lifecycle,sandbox,starts}=boot([mission],{completed:['POSTDIP-01','ENE-15-C'],publishOnStart:true});
  runtime.consumeTriggerEvent(completion('POSTDIP-01'));
  memory.setFact('civilization:research:teleport-hypothesis-v1',{at:4});
  sandbox.dispatchEvent(new sandbox.CustomEvent('bluefox:teleportation-hypothesis',{detail:{}}));
  assert.equal(lifecycle['TP-01'].status,'active');
  assert.equal(starts.filter(x=>x.id==='TP-01').length,1,'deferred activation must be attempted exactly once');
});

test('non-completion fact-gated trigger retains historical non-replay behavior', () => {
  const mission={id:'MAP-FACT',pattern:'NONE',priority:10,trigger:{type:'exploration.map_discovered',count:1},prerequisites:[],requiredFacts:['fact:later']};
  const {runtime,memory,lifecycle}=boot([mission]);
  runtime.consumeTriggerEvent({type:'exploration.map_discovered',mapId:'m1',amount:1});
  assert.equal(memory.getFact('bibleDeferredTrigger:MAP-FACT',null),null);
  memory.setFact('fact:later',true);
  runtime.reconcileDeferredCompletionTriggers();
  assert.equal(lifecycle['MAP-FACT'],undefined);
});
