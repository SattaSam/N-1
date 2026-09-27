const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const TOPOLOGY_FILE = path.join(ROOT, 'engine', 'world-topology-v3.js');
const source = fs.readFileSync(TOPOLOGY_FILE, 'utf8');

class Storage {
  constructor(initial = {}) {
    this.map = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
    this.writes = [];
  }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) {
    this.map.set(key, String(value));
    this.writes.push([key, String(value)]);
  }
  removeItem(key) { this.map.delete(key); }
  resetWrites() { this.writes.length = 0; }
  writesFor(key) { return this.writes.filter(([candidate]) => candidate === key).length; }
}

const canonicalExit = (direction, targetMap) => {
  const opposite = { north: 'south', south: 'north', east: 'west', west: 'east' }[direction];
  const placement = {
    north: { x: 0, z: -26 }, south: { x: 0, z: 26 },
    east: { x: 26, z: 0 }, west: { x: -26, z: 0 }
  }[direction];
  return {
    ...placement,
    targetMap,
    targetEntry: opposite,
    generated: true,
    topologyVersion: 3,
    direction
  };
};

function fixture() {
  const coordinates = { crystal: { x: 0, y: 0 }, east: { x: 1, y: 0 } };
  const legacy = [
    { from: 'crystal', direction: 'east', to: 'east' },
    { from: 'east', direction: 'west', to: 'crystal' }
  ];
  const storage = new Storage({
    bluefox_world_topology_v2: JSON.stringify({
      version: 3, origin: 'crystal', coordinates, savedAt: 100
    }),
    bluefox_generated_topology_v1: JSON.stringify(legacy)
  });
  const events = [];
  const counts = { addGate: 0, disposeGate: 0, removeGate: 0 };
  const maps = {
    crystal: { id: 'crystal', exits: { east: canonicalExit('east', 'east') } },
    east: { id: 'east', exits: { west: canonicalExit('west', 'crystal') } }
  };
  const makeGate = (direction, targetMap) => ({
    userData: { exit: canonicalExit(direction, targetMap), runtimeGenerated: true },
    removeFromParent() { counts.removeGate += 1; }
  });
  const engine = {
    generatedTopology: JSON.parse(JSON.stringify(legacy)),
    currentMapId: 'crystal',
    currentMap: { group: {}, gates: [makeGate('east', 'east')] },
    addRuntimeGate(direction, exit) {
      counts.addGate += 1;
      const gate = makeGate(direction, exit.targetMap);
      gate.userData.exit = { ...exit, direction };
      this.currentMap.gates.push(gate);
      return gate;
    },
    async loadMap() { return true; },
    async generateUnknownPassage() {},
    getDiagnostics() { return {}; },
    callbacks: { onStatus() {}, onAction() {} },
    discoveredMaps: new Set(['crystal', 'east'])
  };
  const BF = {
    maps,
    disposeObject() { counts.disposeGate += 1; },
    async mount() { return engine; }
  };
  const window = {
    BlueFox3D: BF,
    localStorage: storage,
    console,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    dispatchEvent(event) { events.push(event); return true; }
  };
  const context = vm.createContext({
    window,
    localStorage: storage,
    console,
    CustomEvent: window.CustomEvent
  });
  vm.runInContext(source, context, { filename: TOPOLOGY_FILE });
  return BF.mount({}).then(() => {
    storage.resetWrites();
    events.length = 0;
    counts.addGate = 0;
    counts.disposeGate = 0;
    counts.removeGate = 0;
    return { BF, maps, engine, storage, events, counts, makeGate };
  });
}

test('reconcile sain est un no-op: aucune persistence, aucun event, aucun rebuild de gate', async () => {
  const f = await fixture();
  f.BF.WorldTopology.reconcile();
  assert.equal(f.storage.writesFor('bluefox_generated_topology_v1'), 0);
  assert.equal(f.storage.writesFor('bluefox_world_topology_v2'), 0);
  assert.equal(f.events.filter((event) => event.type === 'bluefox:topology-coordinates-changed').length, 0);
  assert.deepEqual(f.counts, { addGate: 0, disposeGate: 0, removeGate: 0 });
});

test('une sortie générée corrompue est réparée et les gates runtime sont reconstruites', async () => {
  const f = await fixture();
  f.maps.crystal.exits.east = {
    ...f.maps.crystal.exits.east,
    targetMap: 'crystal',
    targetEntry: 'east',
    x: 5,
    topologyVersion: 1
  };
  f.BF.WorldTopology.reconcile();
  const repaired = f.maps.crystal.exits.east;
  assert.equal(repaired.targetMap, 'east');
  assert.equal(repaired.targetEntry, 'west');
  assert.equal(repaired.x, 26);
  assert.equal(repaired.z, 0);
  assert.equal(repaired.topologyVersion, 3);
  assert.ok(f.counts.disposeGate >= 1);
  assert.ok(f.counts.addGate >= 1);
});

test('une gate runtime manquante est reconstruite même si les définitions sont déjà canoniques', async () => {
  const f = await fixture();
  f.engine.currentMap.gates = [];
  f.BF.WorldTopology.reconcile();
  assert.equal(f.counts.addGate, 1);
  assert.equal(f.engine.currentMap.gates.length, 1);
  assert.equal(f.engine.currentMap.gates[0].userData.exit.targetMap, 'east');
  assert.equal(f.storage.writesFor('bluefox_world_topology_v2'), 0);
});

test('un stockage canonique manquant est réécrit sans rebuild 3D inutile', async () => {
  const f = await fixture();
  f.storage.removeItem('bluefox_world_topology_v2');
  f.BF.WorldTopology.reconcile();
  assert.equal(f.storage.writesFor('bluefox_world_topology_v2'), 1);
  assert.equal(f.events.filter((event) => event.type === 'bluefox:topology-coordinates-changed').length, 1);
  assert.deepEqual(f.counts, { addGate: 0, disposeGate: 0, removeGate: 0 });
});

test('après une réparation réelle, le reconcile suivant redevient sans effet', async () => {
  const f = await fixture();
  f.maps.crystal.exits.east = { ...f.maps.crystal.exits.east, topologyVersion: 1 };
  f.BF.WorldTopology.reconcile();
  f.storage.resetWrites();
  f.events.length = 0;
  f.counts.addGate = 0;
  f.counts.disposeGate = 0;
  f.counts.removeGate = 0;
  f.BF.WorldTopology.reconcile();
  assert.equal(f.storage.writes.length, 0);
  assert.equal(f.events.length, 0);
  assert.deepEqual(f.counts, { addGate: 0, disposeGate: 0, removeGate: 0 });
});

test('un miroir legacy corrompu est réparé sans rebuild 3D si le runtime est sain', async () => {
  const f = await fixture();
  f.storage.setItem('bluefox_generated_topology_v1', '[]');
  f.storage.resetWrites();
  f.BF.WorldTopology.reconcile();
  assert.equal(f.storage.writesFor('bluefox_generated_topology_v1'), 1);
  assert.deepEqual(f.counts, { addGate: 0, disposeGate: 0, removeGate: 0 });
});

test('le garde-fou authored reste présent dans le propriétaire topologie', () => {
  assert.match(source, /existing\?\.targetMap &&[\s\S]{0,180}existing\.generated !== true/);
  assert.match(source, /type: "authored-exit-protected"/);
});

test('les chemins explicites de load/génération gardent persist et rebuild existants', () => {
  for (const token of [
    'topology.reconcileGeneratedExits();\n      topology.persist();\n      const result = await originalLoadMap',
    'topology.persist();\n        rebuildRuntimeGeneratedGates(this);',
    'topology.persist();\n      rebuildRuntimeGeneratedGates(this);'
  ]) assert.ok(source.includes(token), `missing explicit topology path: ${token}`);
});
