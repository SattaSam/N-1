const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

class CE { constructor(type, init={}) { this.type = type; this.detail = init.detail; } }

function boot() {
  const listeners = new Map();
  const window = {
    BlueFox3D: {}, console, performance, Date, Math, JSON, Set, Map, WeakMap, Promise,
    CustomEvent: CE,
    localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} },
    addEventListener(type, fn){ if(!listeners.has(type)) listeners.set(type,new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn){ listeners.get(type)?.delete(fn); },
    dispatchEvent(event){ for (const fn of [...(listeners.get(event.type)||[])]) fn(event); return true; },
    setTimeout(){ return 1; }, clearTimeout(){}, setInterval(){ return 1; }, clearInterval(){},
    queueMicrotask(fn){ fn(); }
  };
  window.window = window;
  const ctx = vm.createContext({window, console, performance, Date, Math, JSON, Set, Map, WeakMap, Promise, CustomEvent:CE, queueMicrotask:window.queueMicrotask, setTimeout:window.setTimeout, clearTimeout:window.clearTimeout, setInterval:window.setInterval, clearInterval:window.clearInterval});
  vm.runInContext(read('data/bible-catalog.js'), ctx, {filename:'data/bible-catalog.js'});
  const BF = window.BlueFox3D;
  const tutorialIds = new Set(['T01','T02','T03','T04','T05','T06','T07','T08','T09','T10','T11','T12','T13','GAME-shelter']);
  const catalog = BF.BibleCatalog.filter((m) => tutorialIds.has(m.id));
  const defs = Object.fromEntries(catalog.map((m) => [m.id, {id:m.id, title:m.title, priority:Number(m.priority)||0}]));
  BF.Missions = {
    definitions: defs,
    getDefinition(id){ return defs[id] || null; }
  };
  const state = {missionLifecycle:{}, pendingActivations:{}, facts:{}};
  const manager = {
    memory: {
      state,
      getFact(k,d=null){ return Object.prototype.hasOwnProperty.call(state.facts,k) ? state.facts[k] : d; },
      setFact(k,v){ if(v == null) delete state.facts[k]; else state.facts[k]=v; },
      save(){ return true; }
    },
    trees: new Map(), activeMissionIds: [], primaryMissionId: '', activeMissionId: '', retryAfter: 0,
    ensureLifecycle(id, initial='available') { return state.missionLifecycle[id] ||= {status:initial}; },
    startMission(id, options={}) {
      const lc = this.ensureLifecycle(id, 'available');
      if (lc.status === 'completed' || lc.status === 'active') return false;
      const missing = (options.prerequisites || []).filter((p) => state.missionLifecycle[p]?.status !== 'completed');
      if (missing.length) {
        lc.status = 'hidden';
        state.pendingActivations[id] = {missionId:id, prerequisites:[...(options.prerequisites||[])], options:{...options}};
        return false;
      }
      lc.status = 'active';
      lc.autoPrimaryEligible = options.autoPrimaryEligible !== false;
      if (!this.activeMissionIds.includes(id)) this.activeMissionIds.push(id);
      this.trees.set(id, {id});
      delete state.pendingActivations[id];
      if (options.primary === true) this.setPrimaryMission(id, false, options.reason || 'activation');
      return true;
    },
    setPrimaryMission(id) {
      if (state.missionLifecycle[id]?.status !== 'active') return false;
      this.primaryMissionId = id;
      this.activeMissionId = id;
      return true;
    },
    selectBestPrimary() {
      const candidates = this.activeMissionIds
        .filter((id) => state.missionLifecycle[id]?.status === 'active')
        .filter((id) => state.missionLifecycle[id]?.autoPrimaryEligible !== false)
        .sort((a,b) => (defs[b]?.priority||0) - (defs[a]?.priority||0));
      if (!candidates.length) return false;
      return this.setPrimaryMission(candidates[0]);
    },
    publish(){}, syncLifecycleFromTrees(){}, catalogController:{schedule(){}},
  };
  BF.currentEngine = {currentMapId:'crystal', missionManager:manager, callbacks:{onStatus(){}}};
  BF.getMissionState = () => ({missions:Object.entries(state.missionLifecycle).map(([missionId,lc])=>({missionId,lifecycleStatus:lc.status}))});
  BF.registerMissionDefinitions = () => true;

  let src = read('engine/bible-runtime-v0-1-unified.js');
  src = src.replace(/\n\s*const runtime = new BibleRuntimeV01\(\);[\s\S]*?runtime\.start\(\);\s*\n\}\)\(window\);\s*$/, '\n  BF.BibleRuntimeV01 = BibleRuntimeV01;\n})(window);');
  vm.runInContext(src, ctx, {filename:'engine/bible-runtime-v0-1-unified.js'});
  const runtime = Object.create(BF.BibleRuntimeV01.prototype);
  runtime.catalog = catalog;
  runtime.byId = new Map(catalog.map((m)=>[m.id,m]));
  runtime.dynamicMissions = new Map();
  runtime.state = {triggerCounts:{},uniqueTriggerValues:{},progressNarrative:{},effectsApplied:{},gatesSatisfied:{},activationInventoryCredits:{},constructionInstances:{},localMissionInstances:{},faunaMissionInstances:{}};
  runtime.saveState = () => true;
  runtime.manager = () => manager;
  runtime.emitRevealedOnce = () => true;
  runtime.initializeRuntimeCounters = () => false;
  runtime.reconcileRuntimeCounters = () => 0;
  runtime.reconcileHistoricalCollections = () => false;
  runtime.refreshProximityContextMonitor = () => false;
  runtime.isResearchRewardUnlocked = () => false;
  BF.bibleRuntime = runtime;
  return {BF, manager, runtime, state, catalog};
}

function complete(h, id) {
  h.manager.ensureLifecycle(id).status = 'completed';
  h.manager.activeMissionIds = h.manager.activeMissionIds.filter((x)=>x!==id);
  if (h.manager.primaryMissionId === id) { h.manager.primaryMissionId=''; h.manager.activeMissionId=''; }
  return h.runtime.consumeTriggerEvent({type:'progression.mission_completed', missionId:id, mapId:'crystal'});
}

test('post-R3 tutorial continuity: T01 starts Top1, T02-T06 stay Top1, T03 fans out Shelter secondary', () => {
  const h = boot();
  h.runtime.activateInitialMissions();
  assert.equal(h.state.missionLifecycle.T01?.status, 'active');
  assert.equal(h.manager.primaryMissionId, 'T01');
  for (const id of ['T01','T02']) {
    complete(h,id);
    const next = id === 'T01' ? 'T02' : 'T03';
    assert.equal(h.state.missionLifecycle[next]?.status,'active');
    assert.equal(h.manager.primaryMissionId,next);
  }
  complete(h,'T03');
  assert.equal(h.state.missionLifecycle.T04?.status,'active');
  assert.equal(h.state.missionLifecycle['GAME-shelter']?.status,'active');
  assert.equal(h.manager.primaryMissionId,'T04');
  for (const id of ['T04','T05']) {
    complete(h,id);
    const next = id === 'T04' ? 'T05' : 'T06';
    assert.equal(h.manager.primaryMissionId,next);
    assert.equal(h.state.missionLifecycle['GAME-shelter']?.status,'active');
  }
});

test('T07 remains the only delayed-primary tutorial exception; arrival may promote it without dropping Shelter', () => {
  const h = boot(); h.runtime.activateInitialMissions();
  for (const id of ['T01','T02','T03','T04','T05']) complete(h,id);
  complete(h,'T06');
  assert.equal(h.state.missionLifecycle.T07?.status,'active');
  assert.equal(h.manager.primaryMissionId,'');
  assert.equal(h.state.missionLifecycle.T07.autoPrimaryEligible,false);
  assert.equal(h.state.missionLifecycle['GAME-shelter']?.status,'active');
  h.state.missionLifecycle.T07.autoPrimaryEligible=true;
  assert.equal(h.manager.setPrimaryMission('T07'),true);
  assert.equal(h.manager.primaryMissionId,'T07');
  assert.equal(h.state.missionLifecycle['GAME-shelter']?.status,'active');
});

test('T08-T13 resume tutorial Top1; T09 is Top1 before FULL acknowledgement but autonomy remains a separate concern', () => {
  const h = boot(); h.runtime.activateInitialMissions();
  for (const id of ['T01','T02','T03','T04','T05','T06']) complete(h,id);
  h.state.missionLifecycle.T07.autoPrimaryEligible=true; h.manager.setPrimaryMission('T07');
  complete(h,'T07');
  assert.equal(h.manager.primaryMissionId,'T08');
  complete(h,'T08');
  assert.equal(h.manager.primaryMissionId,'T09');
  for (const [id,next] of [['T09','T10'],['T10','T11'],['T11','T12'],['T12','T13']]) {
    complete(h,id);
    assert.equal(h.state.missionLifecycle[next]?.status,'active', next);
    assert.equal(h.manager.primaryMissionId,next, next+' must be tutorial Top1');
    assert.equal(h.state.missionLifecycle['GAME-shelter']?.status,'active');
  }
});

test('SEMI owner guard: map prescription must not rewrite active mission lists', () => {
  const src = read('engine/bible-map-prescription-v19.js');
  assert.doesNotMatch(src, /tutorialSemiScope|applyTutorialSemiScope|restoreTutorialSemiScope/);
  assert.doesNotMatch(src, /activeMissionIds\s*=\s*\[mission\.id\]/);
  assert.match(src, /setAutonomyMode\?\.\(normalized, \{ source: "tutorial" \}\)/);
});
