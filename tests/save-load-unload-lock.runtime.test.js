const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const SAVE_FILE = process.env.SAVE_FILE || path.join(__dirname, '..', 'engine', 'save-ui-bridge.js');

class Storage {
  constructor(initial = {}) { this.map = new Map(Object.entries(initial).map(([k, v]) => [k, String(v)])); }
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

class Element {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.classList = { add() {}, remove() {}, toggle() {} };
    this.style = {};
    this.isConnected = true;
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  remove() { this.isConnected = false; }
  setAttribute() {}
  addEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  matches() { return false; }
}

function fixture() {
  const storage = new Storage({
    bluefox_new_game_start_v1: String(Date.now() - 60000)
  });
  const fileSlots = new Map();
  const listeners = new Map();
  let reloads = 0;
  let missionFlushes = 0;
  let explorationFlushes = 0;
  let survivalSaves = 0;
  let progressionSaves = 0;

  const response = (status, value = null) => ({
    ok: status >= 200 && status < 300,
    status,
    async json() { return value; },
    async text() { return value == null ? '' : JSON.stringify(value); }
  });

  const fetch = async (url, options = {}) => {
    const method = String(options.method || 'GET').toUpperCase();
    const slot = decodeURIComponent(String(url).split('/').pop());
    if (method === 'GET') return fileSlots.has(slot) ? response(200, fileSlots.get(slot)) : response(404, null);
    if (method === 'POST') {
      const payload = JSON.parse(options.body || 'null');
      fileSlots.set(slot, payload);
      return response(200, payload);
    }
    if (method === 'DELETE') { fileSlots.delete(slot); return response(204, null); }
    return response(405, null);
  };

  const addListener = (type, fn) => {
    const set = listeners.get(type) || new Set();
    set.add(fn);
    listeners.set(type, set);
  };
  const dispatch = async (type) => {
    for (const fn of listeners.get(type) || []) await fn({ type });
  };

  const document = {
    hidden: false,
    documentElement: new Element(),
    body: new Element(),
    createElement: () => new Element(),
    querySelector(selector) {
      if (selector === 'meta[name="description"]') return { content: 'BlueFox Odyssey test' };
      return null;
    },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    addEventListener(type, fn) { addListener(`document:${type}`, fn); }
  };

  const writeRuntimeA = () => {
    storage.setItem('bluefox_mission_memory_m0_v1', JSON.stringify({
      version: 3,
      primaryMissionId: 'MISSION-A',
      activeMissionId: 'MISSION-A',
      activeMissionIds: ['MISSION-A'],
      missionLifecycle: { 'MISSION-A': { status: 'active' } },
      missions: { 'MISSION-A': { id: 'MISSION-A', root: { progress: 7, target: 10 } } },
      facts: { source: 'runtime-A' },
      siteProgression: { a: { microSceneId: 'MSC-A' } }
    }));
  };

  const BF = {
    currentEngine: {
      savePosition() { storage.setItem('bluefox_world_position_v2', JSON.stringify({ map: 'map-A', x: 1, z: 2 })); },
      saveDiscovery() {},
      saveZoneDiscovery() {},
      missionManager: {
        memory: {
          flush(force) {
            assert.equal(force, true);
            missionFlushes += 1;
            writeRuntimeA();
            return true;
          }
        }
      }
    },
    multiProgression: {
      save() {
        progressionSaves += 1;
        storage.setItem('bluefox_progression_multisystem_v1', JSON.stringify({ marker: 'A' }));
        return true;
      }
    },
    mapExploration: {
      flush(force) {
        assert.equal(force, true);
        explorationFlushes += 1;
        storage.setItem('bluefox_map_exploration_v1', JSON.stringify({ maps: { 'map-A': { surfacePercent: 12 } } }));
        return true;
      }
    },
    survival: {
      save() {
        survivalSaves += 1;
        storage.setItem('bluefox_survival_v1', JSON.stringify({ energy: 21 }));
        return true;
      }
    }
  };

  const window = {
    BlueFox3D: BF,
    localStorage: storage,
    location: { origin: 'http://test', reload() { reloads += 1; } },
    document,
    fetch,
    console,
    Intl,
    Date,
    JSON,
    CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    MutationObserver: class MutationObserver { observe() {} disconnect() {} },
    addEventListener(type, fn) { addListener(type, fn); },
    removeEventListener() {},
    dispatchEvent() { return true; },
    requestAnimationFrame(callback) { callback(); return 1; },
    setTimeout() { return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {}
  };

  const context = vm.createContext({
    window, console, Intl, Date, JSON,
    CustomEvent: window.CustomEvent,
    MutationObserver: window.MutationObserver
  });
  vm.runInContext(fs.readFileSync(SAVE_FILE, 'utf8'), context, { filename: SAVE_FILE });

  return {
    BF, storage, fileSlots, dispatch,
    get reloads() { return reloads; },
    get counts() { return { missionFlushes, explorationFlushes, survivalSaves, progressionSaves }; }
  };
}

const snapshotB = (savedAt) => ({
  format: 'bluefox-save-file',
  schemaVersion: 1,
  gameVersion: 'test',
  slot: '1',
  savedAt,
  originAtSave: 'http://test',
  state: {
    bluefox_mission_memory_m0_v1: JSON.stringify({
      version: 3,
      primaryMissionId: 'MISSION-B',
      activeMissionId: 'MISSION-B',
      activeMissionIds: ['MISSION-B', 'LOC-OBS@map-B'],
      missionLifecycle: {
        'MISSION-B': { status: 'active' },
        'LOC-OBS@map-B': { status: 'active' }
      },
      pendingActivations: { 'MISSION-C': { reason: 'prerequisite' } },
      missions: {
        'MISSION-B': { id: 'MISSION-B', root: { progress: 4, target: 10 } },
        'LOC-OBS@map-B': { id: 'LOC-OBS@map-B', root: { progress: 6, target: 10 } }
      },
      facts: { source: 'snapshot-B' },
      siteProgression: { b: { microSceneId: 'MSC-B' } }
    }),
    bluefox_world_position_v2: JSON.stringify({ map: 'map-B', x: 30, z: 40 }),
    bluefox_map_exploration_v1: JSON.stringify({ maps: { 'map-B': { surfacePercent: 78 } } }),
    bluefox_progression_multisystem_v1: JSON.stringify({ marker: 'B' }),
    bluefox_survival_v1: JSON.stringify({ energy: 84 })
  }
});

test('un chargement engagé interdit à l’ancien runtime de réécrire le snapshot pendant unload', async () => {
  const f = fixture();
  await new Promise((resolve) => setImmediate(resolve));

  // L'ancien runtime A existe réellement en mémoire avant le chargement.
  f.storage.setItem('bluefox_mission_memory_m0_v1', JSON.stringify({ version: 3, primaryMissionId: 'MISSION-A' }));
  f.storage.setItem('bluefox_map_exploration_v1', JSON.stringify({ maps: { 'map-A': { surfacePercent: 12 } } }));
  f.storage.setItem('bluefox_progression_multisystem_v1', JSON.stringify({ marker: 'A' }));
  f.storage.setItem('bluefox_survival_v1', JSON.stringify({ energy: 21 }));

  const savedAt = Date.now() - 5000;
  f.fileSlots.set('1', snapshotB(savedAt));

  const ok = await f.BF.loadGame(1);
  assert.equal(ok, true);
  assert.equal(f.reloads, 1);

  // Simule les événements navigateur réellement produits par le reload.
  await f.dispatch('pagehide');
  await f.dispatch('beforeunload');

  const mission = JSON.parse(f.storage.getItem('bluefox_mission_memory_m0_v1'));
  const exploration = JSON.parse(f.storage.getItem('bluefox_map_exploration_v1'));
  const progression = JSON.parse(f.storage.getItem('bluefox_progression_multisystem_v1'));
  const survival = JSON.parse(f.storage.getItem('bluefox_survival_v1'));

  assert.equal(mission.primaryMissionId, 'MISSION-B');
  assert.deepEqual(mission.activeMissionIds, ['MISSION-B', 'LOC-OBS@map-B']);
  assert.equal(mission.missions['LOC-OBS@map-B'].root.progress, 6);
  assert.equal(mission.facts.source, 'snapshot-B');
  assert.equal(mission.siteProgression.b.microSceneId, 'MSC-B');
  assert.equal(exploration.maps['map-B'].surfacePercent, 78);
  assert.equal(progression.marker, 'B');
  assert.equal(survival.energy, 84);

  // Recovery est construit AVANT le verrou et doit donc contenir l'état A.
  const recovery = f.fileSlots.get('recovery');
  assert.ok(recovery);
  assert.equal(JSON.parse(recovery.state.bluefox_mission_memory_m0_v1).primaryMissionId, 'MISSION-A');

  // Aucun propriétaire de A ne doit être rappelé après l'engagement du load.
  assert.deepEqual(f.counts, {
    missionFlushes: 1,
    explorationFlushes: 1,
    survivalSaves: 1,
    progressionSaves: 1
  });
});
