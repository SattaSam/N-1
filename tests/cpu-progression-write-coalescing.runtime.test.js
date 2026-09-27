const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = process.env.TARGET_ROOT || path.join(__dirname, '..');
const REGISTRY = path.join(ROOT, 'engine', 'progression-registry.js');

class Storage {
  constructor() {
    this.map = new Map();
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

function fixture() {
  const storage = new Storage();
  const events = [];
  class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  }
  const BF = {
    ObjectEvents: {
      types: {
        RESOURCE_COLLECTED: 'RESOURCE_COLLECTED',
        RESOURCE_EXTRACTED: 'RESOURCE_EXTRACTED',
        OBJECT_SEEN: 'OBJECT_SEEN',
        OBJECT_INSPECTED: 'OBJECT_INSPECTED',
        OBJECT_ANALYZED: 'OBJECT_ANALYZED',
        PHENOMENON_OBSERVED: 'PHENOMENON_OBSERVED',
        KNOWLEDGE_ACQUIRED: 'KNOWLEDGE_ACQUIRED'
      },
      subscribe() { return () => {}; }
    }
  };
  const window = {
    BlueFox3D: BF,
    localStorage: storage,
    CustomEvent,
    console,
    dispatchEvent(event) { events.push(event); return true; }
  };
  vm.runInContext(fs.readFileSync(REGISTRY, 'utf8'), vm.createContext({
    window, CustomEvent, console
  }), { filename: REGISTRY });
  storage.resetWrites();
  events.length = 0;
  return { BF, storage, events, window };
}

const progressionEvents = (events, reason) => events
  .filter((event) => event.type === 'bluefox:progression-changed' && event.detail?.reason === reason);

test('consumeInventoryPoolOnce persiste retrait + transaction en une seule écriture', () => {
  const f = fixture();
  f.BF.progression.state.inventory.wood = 7;
  f.BF.progression.state.campStorage.wood = 5;
  f.storage.resetWrites();

  assert.equal(f.BF.consumeInventoryPoolOnce('tx:wood', ['wood'], 10), 10);
  assert.equal(f.storage.writesFor('bluefox_progression_registry_v1'), 1);
  assert.equal(f.BF.progression.state.inventory.wood, 0);
  assert.equal(f.BF.progression.state.campStorage.wood, 2);
  assert.equal(f.BF.progression.state.consumed.wood, 10);
  assert.equal(f.BF.progression.state.transactions['tx:wood'].quantity, 10);
  assert.equal(progressionEvents(f.events, 'inventory-pool-consumed').length, 1);
});

test('transaction exactly-once est déjà durable au reload immédiat', () => {
  const f = fixture();
  f.BF.progression.state.inventory.fiber = 12;
  assert.equal(f.BF.consumeInventoryPoolOnce('tx:fiber', ['fiber'], 8), 8);

  const reloaded = new f.BF.ProgressionRegistry(f.storage);
  assert.equal(reloaded.state.inventory.fiber, 4);
  assert.equal(reloaded.state.consumed.fiber, 8);
  assert.equal(reloaded.state.transactions['tx:fiber'].quantity, 8);

  f.storage.resetWrites();
  assert.equal(reloaded.consumeInventoryPoolOnce('tx:fiber', ['fiber'], 8), 8);
  assert.equal(reloaded.state.inventory.fiber, 4);
  assert.equal(f.storage.writesFor('bluefox_progression_registry_v1'), 0);
});

test('consumeInventoryPool ordinaire conserve une écriture immédiate et son événement', () => {
  const f = fixture();
  f.BF.progression.state.inventory.crystal = 9;
  f.storage.resetWrites();
  assert.equal(f.BF.consumeInventoryPool(['crystal'], 4), 4);
  assert.equal(f.storage.writesFor('bluefox_progression_registry_v1'), 1);
  assert.equal(f.BF.progression.state.inventory.crystal, 5);
  assert.equal(f.BF.progression.state.consumed.crystal, 4);
  assert.equal(progressionEvents(f.events, 'inventory-pool-consumed').length, 1);
});


test('consumeInventoryPoolOnce insuffisant ne crée ni transaction ni écriture', () => {
  const f = fixture();
  f.BF.progression.state.inventory.wood = 2;
  f.storage.resetWrites();
  assert.equal(f.BF.consumeInventoryPoolOnce('tx:missing', ['wood'], 5), 0);
  assert.equal(f.BF.progression.state.inventory.wood, 2);
  assert.equal(f.BF.progression.state.transactions['tx:missing'], undefined);
  assert.equal(f.storage.writesFor('bluefox_progression_registry_v1'), 0);
  assert.equal(progressionEvents(f.events, 'inventory-pool-consumed').length, 0);
});

test('depositInventory unitaire conserve son écriture immédiate', () => {
  const f = fixture();
  f.BF.progression.state.inventory.wood = 3;
  f.storage.resetWrites();
  assert.equal(f.BF.depositInventory('wood', 2), 2);
  assert.equal(f.storage.writesFor('bluefox_progression_registry_v1'), 1);
  assert.equal(f.BF.progression.state.inventory.wood, 1);
  assert.equal(f.BF.progression.state.campStorage.wood, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(
    progressionEvents(f.events, 'inventory-deposited').map((event) => event.detail.event)
  )), [{ inventoryKey: 'wood', quantity: 2 }]);
});

test('depositAllInventory conserve état/protections/événements avec une seule écriture', () => {
  const f = fixture();
  Object.assign(f.BF.progression.state.inventory, {
    wood: 5,
    fiber: 4,
    accumulator: 3,
    deployed_beacon: 2
  });
  f.BF.progression.state.expeditionAllocation.accumulator = 3;
  f.storage.resetWrites();

  assert.equal(f.BF.depositAllInventory(), 9);
  assert.equal(f.storage.writesFor('bluefox_progression_registry_v1'), 1);
  assert.deepEqual(JSON.parse(JSON.stringify(f.BF.progression.state.inventory)), {
    wood: 0,
    fiber: 0,
    accumulator: 3,
    deployed_beacon: 2
  });
  assert.equal(f.BF.progression.state.campStorage.wood, 5);
  assert.equal(f.BF.progression.state.campStorage.fiber, 4);
  assert.equal(f.BF.progression.state.campStorage.accumulator || 0, 0);
  assert.equal(f.BF.progression.state.campStorage.deployed_beacon || 0, 0);
  assert.equal(f.BF.progression.state.deposited.wood, 5);
  assert.equal(f.BF.progression.state.deposited.fiber, 4);

  const deposited = progressionEvents(f.events, 'inventory-deposited').map((event) => event.detail.event);
  assert.deepEqual(JSON.parse(JSON.stringify(deposited)), [
    { inventoryKey: 'wood', quantity: 5 },
    { inventoryKey: 'fiber', quantity: 4 },
    { inventoryKey: 'accumulator', quantity: 0 },
    { inventoryKey: 'deployed_beacon', quantity: 0 }
  ]);
});

test('depositAllInventory vide ne force aucune écriture', () => {
  const f = fixture();
  assert.equal(f.BF.depositAllInventory(), 0);
  assert.equal(f.storage.writesFor('bluefox_progression_registry_v1'), 0);
  assert.equal(progressionEvents(f.events, 'inventory-deposited').length, 0);
});
