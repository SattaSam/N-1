const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ROOT = process.env.BLUEFOX_ROOT || path.resolve(__dirname, '..');
process.env.SAVE_FILE = path.join(ROOT, 'engine/save-ui-bridge.js');
const source = fs.readFileSync(path.join(ROOT, 'tests/rsave-r2-snapshot-integrity.runtime.test.js'), 'utf8');
const helpers = new Function('require', source.slice(0, source.indexOf("\ntest('"))
  .replace('return { BF, storage, fileSlots, dispatch,', 'return { context, BF, storage, fileSlots, dispatch,')
  + '\nreturn {fixture,validMission,snapshot};')(require);
const tick = () => new Promise(resolve => setImmediate(resolve));
const loadRegistry = f => vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine/progression-registry.js'), 'utf8'), f.context);
async function fixture() {
  const f = helpers.fixture({ initialStorage: { bluefox_mission_memory_m0_v1: helpers.validMission('OLD') } });
  await tick(); loadRegistry(f); f.BF.grantCampStorage('wood', 12); return f;
}
const registryKey = 'bluefox_progression_registry_v1';

test('shared camp inventory survives file export and a fresh runtime exactly', async () => {
  const f = await fixture(); f.BF.grantCampStorage('fiber', 17);
  assert.equal(await f.BF.createManualSave(1), true);
  const file = f.fileSlots.get('1');
  const fresh = helpers.fixture({ withEngine: false, initialFiles: { auto: file } }); await tick(); loadRegistry(fresh);
  assert.equal(JSON.stringify(fresh.BF.getProgressionState().campStorage), JSON.stringify(f.BF.getProgressionState().campStorage));
});

test('the same shared stock is readable on every map while the native UI access guard stays physical', async () => {
  const f = await fixture(), engine = f.BF.currentEngine;
  engine.character = { root: { position: { x: 0, z: 0 } } };
  engine.missionManager.memory.state = { siteProgression: {
    A: { id: 'camp-A', kind: 'camp', stage: 1, mapId: 'A', anchor: { x: 0, z: 0 } },
    B: { id: 'camp-B', kind: 'camp', stage: 1, mapId: 'B', anchor: { x: 0, z: 0 } }
  } };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine/inventory-ui-clean-v0-2.js'), 'utf8'), f.context);
  for (const mapId of ['A', 'B']) {
    engine.currentMapId = mapId;
    engine.currentMap = { group: { traverse(callback) { callback({ name: `BlueFoxSite:camp-${mapId}`, userData: {} }); } } };
    engine.character.root.position.x = 0;
    assert.equal(f.BF.canAccessCampInventory(), true);
    assert.equal(f.BF.getProgressionState().campStorage.wood, 12);
    engine.character.root.position.x = 100;
    assert.equal(f.BF.canAccessCampInventory(), false);
    assert.equal(f.BF.getProgressionState().campStorage.wood, 12, 'visibility is independent of interaction range');
  }
  engine.currentMap = { group: { traverse() {} } }; engine.character.root.position.x = 0;
  assert.equal(f.BF.canAccessCampInventory(), false, 'a saved site without a physical camp is insufficient');
});

test('a mission-only file cannot erase an existing shared inventory registry', async () => {
  const f = await fixture(), original = f.storage.getItem(registryKey);
  f.fileSlots.set('1', helpers.snapshot(Date.now(), { bluefox_mission_memory_m0_v1: helpers.validMission('INCOMING') }));
  assert.equal(await f.BF.loadGame(1), false);
  assert.equal(f.storage.getItem(registryKey), original); assert.equal(f.reloads, 0);
});

test('a timestamp without a valid active game cannot suppress the copied file', async () => {
  const f = await fixture(); await f.BF.createManualSave(1); const file = f.fileSlots.get('1');
  const fresh = helpers.fixture({ withEngine: false, initialFiles: { auto: file },
    initialStorage: { bluefox_active_state_restored_at_v1: String(file.savedAt + 1000) } });
  await tick(); loadRegistry(fresh);
  assert.equal(fresh.reloads, 1); assert.equal(fresh.BF.getProgressionState().campStorage.wood, 12);
});

test('a silently failed critical owner flush refuses manual and recovery snapshots', async () => {
  const f = await fixture(); f.BF.progression.state.campStorage.wood = 30;
  const write = f.storage.setItem.bind(f.storage);
  f.storage.setItem = (key, value) => { if (key === registryKey) throw new Error('controlled quota'); write(key, value); };
  assert.equal(await f.BF.createManualSave(1), false);
  assert.equal(f.fileSlots.has('1'), false); assert.equal(f.BF.getSaveDiagnostics().verified, false);
  const incoming = JSON.parse(f.storage.getItem(registryKey)); incoming.campStorage.wood = 77;
  f.fileSlots.set('1', helpers.snapshot(Date.now(), { bluefox_mission_memory_m0_v1: helpers.validMission('INCOMING'), [registryKey]: JSON.stringify(incoming) }));
  assert.equal(await f.BF.loadGame(1), false);
  assert.equal(f.fileSlots.has('recovery'), false, 'no stale recovery advertised as usable');
  assert.equal(f.BF.progression.state.campStorage.wood, 30);
});

test('a failed restore rolls back and releases only the failed-load autosave barrier', async () => {
  const f = await fixture();
  const oldRegistry = f.storage.getItem(registryKey), oldMission = f.storage.getItem('bluefox_mission_memory_m0_v1');
  const incoming = JSON.parse(oldRegistry); incoming.campStorage.wood = 77;
  f.fileSlots.set('1', helpers.snapshot(Date.now(), { bluefox_mission_memory_m0_v1: helpers.validMission('INCOMING'), [registryKey]: JSON.stringify(incoming) }));
  const write = f.storage.setItem.bind(f.storage);
  f.storage.setItem = (key, value) => {
    if (key === registryKey && JSON.parse(value).campStorage.wood === 77) throw new Error('controlled incoming write');
    write(key, value);
  };
  assert.equal(await f.BF.loadGame(1), false);
  assert.deepEqual(JSON.parse(f.storage.getItem(registryKey)).campStorage, JSON.parse(oldRegistry).campStorage);
  assert.equal(f.storage.getItem('bluefox_mission_memory_m0_v1'), oldMission);
  assert.equal(f.reloads, 0);
  const posts = f.posts; await f.dispatch('pagehide'); assert(f.posts > posts, 'autosave resumes after a successful rollback');
});

test('a successful restore retains the existing unload barrier and incoming stock', async () => {
  const f = await fixture(), incoming = JSON.parse(f.storage.getItem(registryKey)); incoming.campStorage.wood = 77;
  f.fileSlots.set('1', helpers.snapshot(Date.now(), { bluefox_mission_memory_m0_v1: helpers.validMission('INCOMING'), [registryKey]: JSON.stringify(incoming) }));
  assert.equal(await f.BF.loadGame(1), true); const posts = f.posts;
  await f.dispatch('pagehide'); await f.dispatch('beforeunload');
  assert.equal(f.posts, posts); assert.equal(JSON.parse(f.storage.getItem(registryKey)).campStorage.wood, 77);
});
