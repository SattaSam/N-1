const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert/strict');
const ROOT = path.join(__dirname, '..');

let now = 100_000_000;
class FakeDate extends Date { static now() { return now; } }
class CE { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }

const listeners = new Map();
const storage = new Map();
const oreDef = {
  id: 'ORE-REMOTE',
  type: 'magnetic_ore',
  gameplay: { collectable: true },
  resource: { inventoryKey: 'magnetic_ore', family: 'mineral' },
  interaction: { actions: ['collect'], respawnSeconds: 300 },
  spawn: { tags: ['mineral', 'rare'] },
  knowledge: { discoverable: true }
};

storage.set('bluefox_special_objects_v1', JSON.stringify({
  version: 1,
  drones: {},
  resources: {},
  lastRuntimeAt: now - (90000 * 2 * 301) - 1,
  harvestFleet: [{
    id: 'harvest-1',
    crafted: true,
    active: true,
    inKit: false,
    deployedMapId: 'remote',
    deployedZoneId: 0,
    deployedZoneLabel: 'Plateau riche',
    priority: 'collect_all',
    cargo: {},
    cargoTotal: 0,
    lastActionAt: 0,
    remoteManifest: [{ objectId: 'ORE-REMOTE', instanceId: 'ore-remote-1', zoneId: 0 }]
  }]
}));

const empty = { children: [], traverse() {} };
const window = {
  console,
  Date: FakeDate,
  Math, JSON, Set, Map, WeakMap, Promise,
  CustomEvent: CE,
  setTimeout: () => 1,
  clearTimeout() {},
  setInterval: () => 1,
  clearInterval() {},
  document: { querySelector() { return null; } },
  localStorage: {
    getItem: (k) => storage.get(k) || null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k)
  },
  addEventListener(t, fn) {
    if (!listeners.has(t)) listeners.set(t, new Set());
    listeners.get(t).add(fn);
  },
  removeEventListener(t, fn) { listeners.get(t)?.delete(fn); },
  dispatchEvent(e) {
    for (const fn of listeners.get(e.type) || []) fn(e);
    return true;
  },
  BlueFox3D: {
    maps: {
      remote: {
        id: 'remote',
        persistentMicroScenes: [{
          kind: 'deployed_beacon',
          contextRole: 'deployed_beacon',
          persistent: true
        }]
      },
      home: { id: 'home' }
    },
    ObjectLibrary: {
      getById: (id) => id === oreDef.id ? oreDef : null,
      get: (id) => id === oreDef.type ? oreDef : null,
      list: () => [oreDef]
    },
    PersistentMicroScenes: {
      list: (definition) => definition?.persistentMicroScenes || []
    },
    RuntimeBudget: { shouldUpdate: () => true },
    Research: { isUnlocked: () => true, canAccessWorkbench: () => true },
    canAccessCampInventory: () => true,
    currentEngine: {
      currentMapId: 'home',
      currentMap: { group: empty, interactables: [], zoneRegions: [] },
      character: { root: { position: { x: 0, y: 0, z: 0 } } },
      callbacks: { onStatus() {} },
      missionManager: {
        memory: {
          state: {
            siteProgression: {
              home: { sites: { base: { kind: 'base' } } }
            }
          }
        }
      }
    }
  }
};
window.window = window;
const ctx = vm.createContext(window);
function run(rel) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });
}

run('engine/object-event-registry.js');
run('engine/progression-registry.js');
const BF = window.BlueFox3D;
let resourceEvents = 0;
let depositEvents = 0;
BF.ObjectEvents.subscribe((event) => {
  if (event.type === BF.ObjectEvents.types.RESOURCE_COLLECTED) resourceEvents += 1;
  if (event.type === BF.ObjectEvents.types.DRONE_CARGO_DEPOSITED) depositEvents += 1;
});

run('engine/special-object-runtime.js');
BF.SpecialObjectRuntime.update(empty, 0);

const state = BF.SpecialObjectRuntime.consoleState().harvestFleet[0];
const progression = BF.getProgressionState();
assert.equal(progression.campStorage.magnetic_ore, 150,
  'offline catch-up must respect the 300 s respawn: one complete 150-unit load is possible');
assert.equal(state.cargoTotal, 1,
  'offline remainder stays in current cargo');
assert.equal(BF.getHistoricalCollectionTotal({ kind: 'magnetic_ore' }), 151,
  'offline harvest count must respect instance respawn and count exactly once');
assert.equal(progression.inventory.magnetic_ore || 0, 0,
  'offline harvest never credits BlueFox bag');
assert.ok(resourceEvents <= 3,
  `offline catch-up must stay aggregate, got ${resourceEvents} collection events`);
assert.ok(depositEvents <= 2,
  `offline catch-up must stay aggregate, got ${depositEvents} deposit events`);

BF.SpecialObjectRuntime.update(empty, 0);
assert.equal(BF.getHistoricalCollectionTotal({ kind: 'magnetic_ore' }), 151,
  'offline catch-up must not replay in same session');

console.log('PASS R3 offline aggregate: respawn-aware, 1x150 deposit + 1 cargo remainder, bounded events');
