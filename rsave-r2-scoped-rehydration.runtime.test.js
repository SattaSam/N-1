const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const BIBLE_FILE = process.env.BIBLE_RUNTIME_FILE;
if (!BIBLE_FILE) throw new Error('BIBLE_RUNTIME_FILE required');

function storage(initial = {}) {
  const map = new Map(Object.entries(initial).map(([k,v]) => [k, String(v)]));
  return {
    get length(){ return map.size; },
    key(i){ return [...map.keys()][i] ?? null; },
    getItem(k){ return map.has(k) ? map.get(k) : null; },
    setItem(k,v){ map.set(k, String(v)); },
    removeItem(k){ map.delete(k); },
    dump(){ return Object.fromEntries(map); }
  };
}

function mission(id, flags = {}) {
  return {
    id,
    title: id,
    pattern: 'SEQUENCE_ACTIONS',
    instanceScope: 'map',
    trigger: { type: 'manual' },
    sequence: [
      { slot: 'a', action: 'observe', target: 1, params: { catalogManaged: true } },
      { slot: 'b', action: 'collect', target: 1, params: { catalogManaged: true } }
    ],
    ...flags
  };
}

function fixture(options = {}) {
  const ids = {
    local: 'LOC-TEST@map-A',
    exploration: 'EXP-LOCAL@map-A',
    env: 'ENV-MAP-ROCK-50@map-A',
    unknown: 'UNKNOWN@map-A',
    localPaused: 'LOC-TEST@map-B',
    envCompleted: 'ENV-MAP-ROCK-50@map-B'
  };
  const memory = {
    version: 3,
    primaryMissionId: ids.local,
    activeMissionId: ids.local,
    activeMissionIds: [ids.local, ids.exploration, ids.env],
    missionLifecycle: {
      [ids.local]: { status: 'active' },
      [ids.exploration]: { status: 'active' },
      [ids.env]: { status: 'active' },
      [ids.localPaused]: { status: 'paused' },
      [ids.envCompleted]: { status: 'completed' },
      [ids.unknown]: { status: 'paused' }
    },
    missions: {
      [ids.local]: { id: ids.local },
      [ids.exploration]: { id: ids.exploration },
      [ids.env]: { id: ids.env },
      [ids.localPaused]: { id: ids.localPaused },
      [ids.envCompleted]: { id: ids.envCompleted }
    },
    facts: {}
  };
  const runtimeState = {
    version: '0.2-map-scoped-construction',
    triggerCounts: {}, uniqueTriggerValues: {}, progressNarrative: {}, effectsApplied: {}, gatesSatisfied: {},
    activationInventoryCredits: {}, constructionInstances: {},
    localMissionInstances: { [ids.local]: { mapId: 'map-A', family: 'fiber' } },
    faunaMissionInstances: { ...(options.faunaMissionInstances || {}) }
  };
  const localStorage = storage({
    bluefox_mission_memory_m0_v1: JSON.stringify(memory),
    bluefox_bible_runtime_v0_1_unified: JSON.stringify(runtimeState)
  });
  const definitions = {};
  class CustomEvent { constructor(type, init={}) { this.type = type; this.detail = init.detail; } }
  const window = {
    window: null,
    BlueFox3D: {},
    localStorage,
    console,
    performance: { now: () => 1000 },
    CustomEvent,
    Promise,
    setTimeout(){ return 1; }, clearTimeout(){}, setInterval(){ return 1; }, clearInterval(){},
    queueMicrotask(fn){ fn(); },
    addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; }
  };
  window.window = window;
  const BF = window.BlueFox3D;
  BF.Missions = {
    definitions,
    MISSION_STORAGE_KEY: 'bluefox_mission_memory_m0_v1',
    normalizeActionType: (value) => String(value || '').toLowerCase(),
    getDefinition(id){ return definitions[id] || null; }
  };
  BF.BiblePatterns = { SEQUENCE_ACTIONS: { minSteps: 2 } };
  BF.BibleCatalog = [
    mission('LOC-TEST', { localMission: { newMapOnly: false } }),
    mission('EXP-LOCAL', { localExploration: { activationThreshold: 15, completionThreshold: 50 }, localVisibility: 'current-map' }),
    mission('ENV-MAP-ROCK-50', { envLocal: { family: 'ROCK', targetPercent: 50 }, localVisibility: 'current-map' }),
    mission('FAU-01A', { faunaSpeciesTemplate: true })
  ];
  BF.BibleContractV01 = { validateCatalog(){ return { ok: true, errors: [], warnings: [] }; } };
  BF.registerMissionDefinitions = (entries=[]) => {
    for (const entry of entries) definitions[entry.id] = entry;
    return entries.length;
  };
  BF.ObjectEvents = { subscribe(){ return () => {}; }, types: {} };
  BF.ObjectLibrary = { get(type){ return type === 'foxling' ? { type:'foxling', label:'Foxling', category:'fauna' } : null; } };
  BF.MicroScenes = { get(){ return null; } };
  BF.maps = { 'map-A': { id: 'map-A', generated: true } };

  const context = vm.createContext(window);
  vm.runInContext(fs.readFileSync(BIBLE_FILE, 'utf8'), context, { filename: BIBLE_FILE });
  return { BF, definitions, ids, memory };
}

test('R-SAVE R2: all persisted scoped template instances are definitions before MissionManager hydration', () => {
  const { definitions, ids } = fixture();
  assert.ok(definitions[ids.local], 'localMission instance definition missing');
  assert.ok(definitions[ids.exploration], 'localExploration instance definition missing');
  assert.ok(definitions[ids.env], 'envLocal instance definition missing');
  assert.ok(definitions[ids.localPaused], 'paused localMission definition missing');
  assert.ok(definitions[ids.envCompleted], 'completed envLocal definition missing');
  assert.equal(definitions[ids.unknown], undefined, 'unknown scoped id must not be fabricated');
});

test('R-SAVE R2: a persisted scoped primary no longer leaves a global hydration blocker', () => {
  const { definitions, ids, memory } = fixture();
  const persistedActiveIds = [...new Set([
    memory.primaryMissionId,
    memory.activeMissionId,
    ...memory.activeMissionIds,
    ...Object.keys(memory.missionLifecycle).filter(id => memory.missionLifecycle[id]?.status === 'active')
  ].filter(Boolean))];
  const missing = persistedActiveIds.filter(id => !definitions[id]);
  assert.deepEqual(missing, []);
  assert.ok(definitions[ids.local]);
});

test('R-SAVE R2: restored scoped definitions preserve their canonical scope metadata', () => {
  const { definitions, ids } = fixture();
  assert.equal(definitions[ids.local].instanceScope, 'map');
  assert.equal(definitions[ids.local].targetMapId, 'map-A');
  assert.equal(definitions[ids.exploration].instanceScope, 'map');
  assert.equal(definitions[ids.env].targetMapId, 'map-A');
});


test('R-SAVE R2 non-regression: persisted fauna dynamic definitions are still restored', () => {
  const id = 'FAU-01A@foxling';
  const { definitions } = fixture({ faunaMissionInstances: {
    [id]: { missionId:id, baseMissionId:'FAU-01A', cuoType:'foxling', bootstrap:false }
  }});
  assert.ok(definitions[id], 'fauna dynamic definition must remain restored');
});

test('R-SAVE R2: restoring scoped definitions never mutates paused/completed lifecycle state', () => {
  const { definitions, ids, memory } = fixture();
  assert.ok(definitions[ids.localPaused]);
  assert.ok(definitions[ids.envCompleted]);
  assert.equal(memory.missionLifecycle[ids.localPaused].status, 'paused');
  assert.equal(memory.missionLifecycle[ids.envCompleted].status, 'completed');
});

test('R-SAVE R2: a scoped definition appearing after BibleRuntime start is registered immediately for hydration recovery', () => {
  const { BF, definitions } = fixture();
  const id = 'LOC-TEST@map-C';
  const memoryState = {
    version: 3,
    primaryMissionId: id,
    activeMissionId: id,
    activeMissionIds: [id],
    missionLifecycle: { [id]: { status: 'active' } },
    missions: { [id]: { id } },
    facts: {}
  };
  BF.currentEngine = {
    currentMapId: 'map-C',
    missionManager: { memory: { state: memoryState } }
  };
  delete definitions[id];
  assert.equal(definitions[id], undefined);
  const restored = BF.bibleRuntime.restoreLocalMissionDefinitions();
  assert.equal(restored, 1);
  assert.ok(definitions[id], 'late scoped definition must be registered immediately');
  assert.equal(definitions[id].targetMapId, 'map-C');
});
