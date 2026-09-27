const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'engine', 'topology-persistence-bridge.js');

class Storage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

function fixture({ positionKey, position, coordinates }) {
  const storage = new Storage({
    [positionKey]: JSON.stringify(position),
    bluefox_world_topology_v2: JSON.stringify({ coordinates })
  });
  const BF = {
    maps: {
      crystal: { id: 'crystal' },
      'map-A': { id: 'map-A' }
    },
    WorldTopology: {
      snapshot: () => ({ coordinates }),
      reconcile() {},
      coordinateOf(mapId) { return coordinates[mapId] || null; }
    }
  };
  const document = {
    readyState: 'complete',
    hidden: false,
    addEventListener() {}
  };
  const window = {
    BlueFox3D: BF,
    localStorage: storage,
    document,
    console: { info() {}, warn() {}, error() {} },
    addEventListener() {},
    setInterval() { return 1; }
  };
  window.window = window;
  const context = vm.createContext({
    window,
    console: window.console,
    Map,
    Object,
    Array,
    Number,
    Math,
    JSON,
    Date
  });
  vm.runInContext(fs.readFileSync(TARGET, 'utf8'), context, { filename: TARGET });
  return BF.TopologyPersistence.validate();
}

test('position v2 canonique valide si la map de reprise a une coordonnée', () => {
  const result = fixture({
    positionKey: 'bluefox_world_position_v2',
    position: { map: 'map-A', x: 1, z: 2 },
    coordinates: { crystal: { x: 0, y: 0 }, 'map-A': { x: 1, y: 0 } }
  });
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('position v2 canonique signale une map de reprise sans coordonnée', () => {
  const result = fixture({
    positionKey: 'bluefox_world_position_v2',
    position: { map: 'map-A', x: 1, z: 2 },
    coordinates: { crystal: { x: 0, y: 0 } }
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Map de reprise sans coordonnée : map-A.'));
});

test('fallback position v1 conserve le même contrat map', () => {
  const result = fixture({
    positionKey: 'bluefox_world_position_v1',
    position: { map: 'map-A', x: 3, z: 4 },
    coordinates: { crystal: { x: 0, y: 0 } }
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Map de reprise sans coordonnée : map-A.'));
});

test('le garde Save existant reste enveloppé sans modifier le résultat du propriétaire', async () => {
  const storage = new Storage({
    bluefox_world_topology_v2: JSON.stringify({ coordinates: { crystal: { x: 0, y: 0 } } })
  });
  let reconciles = 0;
  let saves = 0;
  const BF = {
    maps: { crystal: { id: 'crystal' } },
    WorldTopology: {
      snapshot: () => ({ coordinates: { crystal: { x: 0, y: 0 } } }),
      reconcile() { reconciles += 1; },
      coordinateOf() { return { x: 0, y: 0 }; }
    },
    async createManualSave(slot) { saves += 1; return `slot-${slot}`; }
  };
  const document = { readyState: 'complete', hidden: false, addEventListener() {} };
  const window = {
    BlueFox3D: BF,
    localStorage: storage,
    document,
    console: { info() {}, warn() {}, error() {} },
    addEventListener() {},
    setInterval() { return 1; }
  };
  window.window = window;
  const context = vm.createContext({ window, console: window.console, Map, Object, Array, Number, Math, JSON, Date });
  vm.runInContext(fs.readFileSync(TARGET, 'utf8'), context, { filename: TARGET });
  const result = await BF.createManualSave(7);
  assert.equal(result, 'slot-7');
  assert.equal(saves, 1);
  assert.equal(reconciles, 1);
});
