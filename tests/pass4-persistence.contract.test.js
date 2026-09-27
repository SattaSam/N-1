const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SAVE_FILE = path.join(ROOT, 'engine', 'save-ui-bridge.js');

class Storage {
  constructor(initial = {}) { this.map = new Map(Object.entries(initial).map(([k,v]) => [k, String(v)])); }
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

class Element {
  constructor(tag = 'div') {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.dataset = {};
    this.className = '';
    this.classList = { add() {}, remove() {}, toggle() {} };
    this.style = {};
    this.isConnected = true;
    this.parentElement = null;
    this.textContent = '';
  }
  append(...nodes) { nodes.forEach((node) => { if (node) { node.parentElement = this; this.children.push(node); } }); }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  remove() { this.isConnected = false; }
  setAttribute() {}
  addEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  matches() { return false; }
}

function fixture() {
  const storage = new Storage({ bluefox_new_game_start_v1: String(Date.now() - 10000) });
  const fileSlots = new Map();
  let reloads = 0;
  const flushCalls = [];

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

  const document = {
    hidden: false,
    documentElement: new Element('html'),
    body: new Element('body'),
    createElement: (tag) => new Element(tag),
    querySelector(selector) {
      if (selector === 'meta[name="description"]') return { content: 'BlueFox Odyssey test' };
      if (selector === '.settings-content') return null;
      return null;
    },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    addEventListener() {}
  };

  const BF = {
    currentEngine: {
      savePosition() { storage.setItem('bluefox_world_position_v2', JSON.stringify({ map: 'future-map', x: 4, z: 8 })); },
      saveDiscovery() {},
      saveZoneDiscovery() {},
      missionManager: {
        memory: {
          flush(force) {
            flushCalls.push(['mission', force]);
            storage.setItem('bluefox_mission_memory_m0_v1', JSON.stringify({
              version: 3,
              primaryMissionId: 'FUTURE-ENE-99',
              activeMissionIds: ['FUTURE-ENE-99'],
              missionLifecycle: { 'FUTURE-ENE-99': { status: 'active' } },
              pendingActivations: { 'FUTURE-SUR-42': { reason: 'generic-prerequisite' } },
              researchUnlocks: { 'future-recipe-v1': { missionId: 'FUTURE-ENE-99' } },
              siteProgression: { 'future-map:site': { mapId: 'future-map', microSceneId: 'MSC-FUTURE', persistent: true } },
              facts: { 'persistentMissionIntent:FUTURE-ENE-99:return': { type: 'navigate-known', target: { mapId: 'crystal' } } }
            }));
            return true;
          }
        }
      }
    },
    multiProgression: { save() { storage.setItem('bluefox_progression_multisystem_v1', JSON.stringify({ version: 1, marker: 'latest' })); return true; } },
    mapExploration: {
      flush(force) {
        flushCalls.push(['exploration', force]);
        storage.setItem('bluefox_map_exploration_v1', JSON.stringify({ version: 1, maps: { 'future-map': { surfacePercent: 67 } } }));
        return true;
      }
    },
    survival: { save() { storage.setItem('bluefox_survival_v1', JSON.stringify({ version: 2, energy: 73 })); return true; } }
  };

  storage.setItem('bluefox_personal_consumables_v1', JSON.stringify({ version: 1, rations: 4, craftedTotal: 12 }));
  storage.setItem('bluefox_bible_runtime_v0_1_unified', JSON.stringify({ version: 1, effectsApplied: { 'FUTURE-ENE-98': 1 } }));

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
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    requestAnimationFrame(callback) { callback(); return 1; },
    setTimeout() { return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {}
  };

  const context = vm.createContext({ window, console, Intl, Date, JSON, CustomEvent: window.CustomEvent, MutationObserver: window.MutationObserver });
  vm.runInContext(fs.readFileSync(SAVE_FILE, 'utf8'), context, { filename: SAVE_FILE });
  return { BF, storage, fileSlots, flushCalls, get reloads() { return reloads; } };
}

test('snapshot force les propriétaires bufferisés avant capture', async () => {
  const f = fixture();
  const ok = await f.BF.createManualSave(1);
  assert.equal(ok, true);
  assert.deepEqual(f.flushCalls, [['mission', true], ['exploration', true]]);
  const snap = f.fileSlots.get('1');
  assert.ok(snap);
  const mission = JSON.parse(snap.state.bluefox_mission_memory_m0_v1);
  const exploration = JSON.parse(snap.state.bluefox_map_exploration_v1);
  assert.equal(mission.primaryMissionId, 'FUTURE-ENE-99');
  assert.equal(mission.facts['persistentMissionIntent:FUTURE-ENE-99:return'].type, 'navigate-known');
  assert.equal(mission.researchUnlocks['future-recipe-v1'].missionId, 'FUTURE-ENE-99');
  assert.equal(mission.siteProgression['future-map:site'].microSceneId, 'MSC-FUTURE');
  assert.equal(exploration.maps['future-map'].surfacePercent, 67);
  assert.equal(JSON.parse(snap.state.bluefox_personal_consumables_v1).craftedTotal, 12);
});

test('snapshot reste générique pour les futures missions et consommateurs bluefox_*', async () => {
  const f = fixture();
  f.storage.setItem('bluefox_future_system_v9', JSON.stringify({ missionId: 'MISSION-220', arbitrary: true }));
  await f.BF.createManualSave(2);
  const snap = f.fileSlots.get('2');
  assert.equal(JSON.parse(snap.state.bluefox_future_system_v9).missionId, 'MISSION-220');
  assert.ok(!Object.keys(snap.state).some((key) => key.startsWith('bluefox_save_slot_')));
});

test('restore remet exactement les états mission/MSC/exploration/research/ration avant reload', async () => {
  const f = fixture();
  const savedAt = Date.now() - 5000;
  f.fileSlots.set('1', {
    format: 'bluefox-save-file', schemaVersion: 1, gameVersion: 'test', slot: '1', savedAt,
    originAtSave: 'http://test',
    state: {
      bluefox_mission_memory_m0_v1: JSON.stringify({ version: 3, primaryMissionId: 'FUTURE-MISSION', researchUnlocks: { r: 1 }, siteProgression: { s: { microSceneId: 'MSC-X' } } }),
      bluefox_map_exploration_v1: JSON.stringify({ version: 1, maps: { x: { surfacePercent: 88 } } }),
      bluefox_personal_consumables_v1: JSON.stringify({ version: 1, rations: 3, craftedTotal: 14 }),
      bluefox_bible_runtime_v0_1_unified: JSON.stringify({ version: 1, effectsApplied: { FUTURE: 1 } })
    }
  });
  f.storage.setItem('bluefox_obsolete_runtime_key', 'must-disappear');
  const ok = await f.BF.loadGame(1);
  assert.equal(ok, true);
  assert.equal(f.storage.getItem('bluefox_obsolete_runtime_key'), null);
  assert.equal(JSON.parse(f.storage.getItem('bluefox_mission_memory_m0_v1')).primaryMissionId, 'FUTURE-MISSION');
  assert.equal(JSON.parse(f.storage.getItem('bluefox_map_exploration_v1')).maps.x.surfacePercent, 88);
  assert.equal(JSON.parse(f.storage.getItem('bluefox_personal_consumables_v1')).craftedTotal, 14);
  assert.equal(JSON.parse(f.storage.getItem('bluefox_bible_runtime_v0_1_unified')).effectsApplied.FUTURE, 1);
  assert.equal(f.reloads, 1);
});

test('le correctif ne réintroduit aucun propriétaire missionnel ou règle par ID', () => {
  const source = fs.readFileSync(SAVE_FILE, 'utf8');
  assert.match(source, /memory\.flush\(true\)/);
  assert.match(source, /mapExploration\.flush\(true\)/);
  assert.doesNotMatch(source, /T0?\d|T1[0-9]|ENE-|FLO-|LOC-/);
  assert.doesNotMatch(source, /missionReturnIntent|shouldDeferMissionReturn|maxDeferMs/);
});
