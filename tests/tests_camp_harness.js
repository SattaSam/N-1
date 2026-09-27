const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createHarness(root, spec = {}) {
  const timers = [];
  const microtasks = [];
  const listeners = new Map();
  const dispatched = [];
  const runtimeState = {
    version: '0.2-map-scoped-construction',
    triggerCounts: {}, uniqueTriggerValues: {}, progressNarrative: {}, effectsApplied: {}, gatesSatisfied: {},
    activationInventoryCredits: {}, constructionInstances: {}, localMissionInstances: {}, faunaMissionInstances: {},
    ...(spec.runtimeState || {})
  };
  const localStore = new Map([
    ['bluefox_bible_runtime_v0_1_unified', JSON.stringify(runtimeState)]
  ]);
  class CustomEventStub {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  }
  const w = {
    BlueFox3D: {}, CustomEvent: CustomEventStub, Promise,
    localStorage: {
      getItem(key) { return localStore.has(key) ? localStore.get(key) : null; },
      setItem(key, value) { localStore.set(key, String(value)); },
      removeItem(key) { localStore.delete(key); }
    },
    addEventListener(type, fn) {
      const bucket = listeners.get(type) || [];
      bucket.push(fn); listeners.set(type, bucket);
    },
    removeEventListener(type, fn) {
      listeners.set(type, (listeners.get(type) || []).filter((entry) => entry !== fn));
    },
    dispatchEvent(event) {
      dispatched.push(event);
      for (const fn of [...(listeners.get(event.type) || [])]) fn(event);
      return true;
    },
    setTimeout(fn, delay = 0) { timers.push({ fn, delay }); return timers.length; },
    clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    queueMicrotask(fn) { microtasks.push(fn); },
    performance: { now: () => 1000 }, console
  };
  w.window = w; w.globalThis = w;
  const BF = w.BlueFox3D;
  const definitions = {};
  BF.Missions = {
    definitions,
    getDefinition(id) { return definitions[id] || null; },
    normalizeActionType(value) { return String(value || '').toLowerCase(); }
  };
  BF.BiblePatterns = { SEQUENCE_ACTIONS: {} };
  const template = (kind) => ({
    title: kind === 'workbench' ? 'Établir un établi' : kind === 'refuge' ? 'Établir un refuge' : 'Établir un camp',
    pattern: 'SEQUENCE_ACTIONS',
    sequence: [{ slot: 'construct', action: 'collect', target: 1 }],
    effects: [{ type: 'site.establish', kind, microSceneId: `MSC-${kind}` }]
  });
  BF.BibleConstructionTemplates = {
    camp: template('camp'), refuge: template('refuge'), workbench: template('workbench')
  };
  BF.BibleCatalog = spec.catalog || [];
  BF.BibleContractV01 = { validateCatalog() { return { ok: true, errors: [], warnings: [] }; } };
  BF.registerMissionDefinitions = (entries) => {
    for (const entry of entries || []) definitions[entry.id] = entry;
    return (entries || []).length;
  };
  BF.ObjectEvents = { subscribe() { return () => {}; }, types: {} };
  BF.MicroScenes = { get() { return {}; } };
  BF.getMissionState = () => ({ missions: [] });

  const context = vm.createContext(w);
  const source = fs.readFileSync(path.join(root, 'engine/bible-runtime-v0-1-unified.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'engine/bible-runtime-v0-1-unified.js' });

  function makeManager({ lifecycles = {}, sites = {}, activeIds = [], primary = '' } = {}) {
    const memory = {
      state: {
        missionLifecycle: structuredClone(lifecycles),
        siteProgression: structuredClone(sites),
        activeMissionIds: [...activeIds],
        primaryMissionId: primary,
        activeMissionId: primary,
        missions: {}, facts: {}, researchUnlocks: {}, effectReceipts: {}
      },
      saveCalls: 0, saveTreeCalls: 0,
      save() { this.saveCalls += 1; return true; },
      saveTree() { this.saveTreeCalls += 1; return true; },
      getFact(key, fallback = null) { return Object.prototype.hasOwnProperty.call(this.state.facts, key) ? this.state.facts[key] : fallback; },
      setFact(key, value) { this.state.facts[key] = value; return true; },
      hasEffectReceipt(id) { return Boolean(this.state.effectReceipts[id]); },
      recordEffectReceipt(id, detail = {}) { this.state.effectReceipts[id] = { id, ...detail }; return true; }
    };
    const manager = {
      memory,
      activeMissionIds: [...activeIds],
      primaryMissionId: primary,
      trees: new Map(activeIds.map((id) => [id, { id, root: { status: 'active' } }])),
      failCalls: [], publishCalls: 0, syncCalls: 0,
      failMission(id, reason) {
        const tree = this.trees.get(id); if (!tree) return false;
        this.activeMissionIds = this.activeMissionIds.filter((x) => x !== id);
        const lifecycle = this.memory.state.missionLifecycle[id];
        if (!lifecycle) return false;
        lifecycle.status = 'failed'; lifecycle.failedAt = Date.now(); lifecycle.failureReason = reason;
        this.failCalls.push({ id, reason });
        if (this.primaryMissionId === id) this.primaryMissionId = '';
        this.publish();
        return true;
      },
      syncMissionSelection() {
        this.syncCalls += 1;
        this.memory.state.activeMissionIds = [...this.activeMissionIds];
        this.memory.state.primaryMissionId = this.primaryMissionId || '';
        this.memory.state.activeMissionId = this.primaryMissionId || '';
        return true;
      },
      publish() {
        this.publishCalls += 1;
        w.dispatchEvent(new CustomEventStub('bluefox:mission-state', { detail: { missions: [] } }));
      },
      reevaluatePendingActivations() {}, catalogController: { schedule() {} }
    };
    return manager;
  }

  function attachManager(manager, mapId = 'crystal') {
    BF.currentEngine = { currentMapId: mapId, missionManager: manager, callbacks: {} };
    return manager;
  }
  function runTimers() { while (timers.length) timers.shift().fn(); }
  function runMicrotasks() { while (microtasks.length) microtasks.shift()(); }
  return { w, BF, runtime: BF.bibleRuntime, timers, microtasks, dispatched, localStore, makeManager, attachManager, runTimers, runMicrotasks };
}

module.exports = { createHarness };
