const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
function load(pathname, ctx, stripStart = false) {
  let src = fs.readFileSync(pathname, 'utf8');
  if (stripStart) src = src.replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/, '\n})(window);');
  vm.runInContext(src, ctx, { filename: pathname });
}

class CE { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }

function boot(choice = 'ENE-14', persisted = null) {
  const storage = new Map();
  const window = {
    console, Date, Math, JSON, Set, Map, WeakMap, Promise,
    performance: { now: () => 1000 },
    queueMicrotask: (fn) => fn(),
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    CustomEvent: CE,
    localStorage: {
      getItem(k) { return storage.has(k) ? storage.get(k) : null; },
      setItem(k, v) { storage.set(k, String(v)); },
      removeItem(k) { storage.delete(k); }
    },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    BlueFox3D: { Missions: {}, BiblePatterns: {} }
  };
  window.window = window;
  const ctx = vm.createContext(window);
  load(path.join(ROOT, 'data/bible-catalog.js'), ctx);
  const BF = window.BlueFox3D;
  const catalog = BF.BibleCatalog;
  const byId = new Map(catalog.map(m => [m.id, m]));
  const ene14 = byId.get('ENE-14');
  const bal01 = byId.get('BAL-01');
  assert(ene14 && bal01, 'missions ENE-14/BAL-01 absentes');

  BF.Missions.getDefinition = (id) => byId.get(id) || null;
  BF.Missions.definitions = Object.fromEntries(catalog.map(m => [m.id, m]));
  BF.Missions.normalizeActionType = (v) => v;
  BF.registerMissionDefinitions = () => true;

  const baseState = persisted || {
    missionLifecycle: {
      'ENE-13': { status: 'completed', completedAt: 1 }
    },
    activeMissionIds: [],
    primaryMissionId: '',
    activeMissionId: '',
    pendingActivations: {},
    facts: {}
  };
  const state = JSON.parse(JSON.stringify(baseState));
  const trees = new Map();
  for (const id of state.activeMissionIds || []) trees.set(id, { id });
  let primaryChoice = choice;
  const memory = {
    state,
    getFact(k, d = null) { return Object.prototype.hasOwnProperty.call(state.facts || {}, k) ? state.facts[k] : d; },
    setFact(k, v) { state.facts ||= {}; state.facts[k] = v; },
    save() { return true; }, saveTree() { return true; }
  };
  const manager = {
    memory, trees,
    activeMissionIds: [...(state.activeMissionIds || [])],
    primaryMissionId: state.primaryMissionId || '',
    ensureLifecycle(id, initial = 'available') {
      state.missionLifecycle ||= {};
      state.missionLifecycle[id] ||= { status: initial };
      return state.missionLifecycle[id];
    },
    startMission(id, options = {}) {
      if (this.ensureLifecycle(id).status === 'completed') return false;
      this.ensureLifecycle(id).status = 'active';
      if (!this.activeMissionIds.includes(id)) this.activeMissionIds.push(id);
      this.trees.set(id, { id });
      if (options.primary === true) this.setPrimaryMission(id);
      this.sync();
      return true;
    },
    setPrimaryMission(id) {
      assert(this.activeMissionIds.includes(id), `${id} doit rester active/sélectionnable`);
      this.primaryMissionId = id;
      this.sync();
      return true;
    },
    selectBestPrimary() {
      const id = primaryChoice;
      return id && this.activeMissionIds.includes(id) ? this.setPrimaryMission(id) : false;
    },
    choose(id) { primaryChoice = id; return this.setPrimaryMission(id); },
    sync() {
      state.activeMissionIds = [...this.activeMissionIds];
      state.primaryMissionId = this.primaryMissionId;
      state.activeMissionId = this.primaryMissionId;
    },
    publish() {}, syncLifecycleFromTrees() {}, reevaluatePendingActivations() {},
    catalogController: { schedule() {} }
  };
  BF.currentEngine = { currentMapId: 'map-test', missionManager: manager, callbacks: { onStatus() {} } };

  load(path.join(ROOT, 'engine/bible-runtime-v0-1-unified.js'), ctx, true);
  const runtime = Object.create(BF.BibleRuntimeV01.prototype);
  runtime.catalog = [ene14, bal01];
  runtime.byId = new Map(runtime.catalog.map(m => [m.id, m]));
  runtime.state = {
    triggerCounts: {}, uniqueTriggerValues: {}, progressNarrative: {}, effectsApplied: {},
    gatesSatisfied: {}, activationInventoryCredits: {}, constructionInstances: {}, localMissionInstances: {}
  };
  runtime.saveState = () => true;
  runtime.manager = () => manager;
  runtime.emitRevealedOnce = () => true;
  runtime.initializeRuntimeCounters = () => false;
  runtime.reconcileRuntimeCounters = () => 0;
  runtime.reconcileHistoricalCollections = () => false;
  runtime.refreshProximityContextMonitor = () => false;
  runtime.lastActivationAttempt = null;

  return { BF, runtime, manager, state, ene14, bal01 };
}

const completionEvent = {
  type: 'progression.mission_completed',
  missionId: 'ENE-13',
  amount: 1,
  mapId: 'map-test'
};

// Réfutation documentaire : pas d'activation initiale et axe ENE-14 historique restauré.
{
  const { ene14, bal01 } = boot();
  assert.equal(ene14.passivePriorityAxis, 'research');
  assert.equal(bal01.initialState, undefined);
  assert.equal(ene14.concurrentAvailabilityGroup, 'ENE-13-BRANCH');
  assert.equal(bal01.concurrentAvailabilityGroup, 'ENE-13-BRANCH');
}

// Cas A : ENE-14 choisie d'abord ; BAL-01 reste active et sélectionnable ensuite.
{
  const { runtime, manager, state } = boot('ENE-14');
  const result = runtime.consumeTriggerEvent(completionEvent);
  assert.deepStrictEqual(Array.from(result.activatedMissionIds).sort(), ['BAL-01', 'ENE-14']);
  assert.equal(state.missionLifecycle['ENE-14'].status, 'active');
  assert.equal(state.missionLifecycle['BAL-01'].status, 'active');
  assert.equal(manager.primaryMissionId, 'ENE-14');
  manager.choose('BAL-01');
  assert.equal(manager.primaryMissionId, 'BAL-01');
  assert.equal(state.missionLifecycle['ENE-14'].status, 'active');
}

// Cas B : BAL-01 choisie d'abord ; ENE-14 reste active et sélectionnable ensuite.
{
  const { runtime, manager, state } = boot('BAL-01');
  runtime.consumeTriggerEvent(completionEvent);
  assert.equal(manager.primaryMissionId, 'BAL-01');
  assert.equal(state.missionLifecycle['ENE-14'].status, 'active');
  manager.choose('ENE-14');
  assert.equal(manager.primaryMissionId, 'ENE-14');
  assert.equal(state.missionLifecycle['BAL-01'].status, 'active');
}

// Cas C : reload ; les deux lifecycles sont conservés sans rejeu de l'événement causal.
{
  const first = boot('ENE-14');
  first.runtime.consumeTriggerEvent(completionEvent);
  const persisted = JSON.parse(JSON.stringify(first.state));
  const reloaded = boot('ENE-14', persisted);
  assert.equal(reloaded.state.missionLifecycle['ENE-14'].status, 'active');
  assert.equal(reloaded.state.missionLifecycle['BAL-01'].status, 'active');
  assert(reloaded.manager.activeMissionIds.includes('ENE-14'));
  assert(reloaded.manager.activeMissionIds.includes('BAL-01'));
  reloaded.manager.choose('BAL-01');
  assert.equal(reloaded.manager.primaryMissionId, 'BAL-01');
  assert.equal(reloaded.state.missionLifecycle['ENE-14'].status, 'active');
  const replay = reloaded.runtime.consumeTriggerEvent(completionEvent);
  assert.equal(replay.matched, 0, 'un reload ne doit pas nécessiter ni provoquer une double activation');
}

console.log('PASS R2 concurrent lifecycle ENE-14 / BAL-01 A+B+C');
