const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function loadManager(definitions) {
  const window = {
    BlueFox3D: { Missions: {} },
    localStorage: { getItem() { return null; } },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}
  };
  window.window = window;
  const context = vm.createContext({
    window, performance: { now: () => 1000 }, Date, Map, Set, Object, Array,
    console, CustomEvent: class {}
  });
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'engine/mission-manager.js'), 'utf8'),
    context,
    { filename: 'engine/mission-manager.js' }
  );
  const M = window.BlueFox3D.Missions;
  M.definitions = { ...definitions };
  M.getDefinition = (id) => M.definitions[id] || null;
  return { M, window };
}

function tree(id, complete = false) {
  const leaf = {
    id: `${id}:leaf`,
    isLeaf: true,
    isComplete: complete,
    target: 1,
    progress: complete ? 1 : 0,
    status: complete ? 'completed' : 'active',
    params: {}
  };
  const root = {
    id,
    isLeaf: false,
    isComplete: complete,
    target: 1,
    progress: complete ? 1 : 0,
    status: complete ? 'completed' : 'active',
    params: {},
    walk(fn) { fn(this); fn(leaf); }
  };
  return {
    id, title: id, description: id, root,
    availableLeaves() { return complete ? [] : [leaf]; },
    toJSON() {
      return {
        id, title: id, description: id,
        root: {
          id: root.id, isComplete: root.isComplete, status: root.status,
          target: root.target, progress: root.progress, params: {},
          children: [{
            id: leaf.id, isComplete: leaf.isComplete, status: leaf.status,
            target: leaf.target, progress: leaf.progress, params: {}, children: []
          }]
        }
      };
    }
  };
}

function memory(state) {
  return {
    state: JSON.parse(JSON.stringify(state)),
    saveCalls: 0,
    save() { this.saveCalls += 1; },
    saveTree() {},
    remember() {},
    getFact(_key, fallback) { return fallback; },
    setFact() {}
  };
}

const bridge = {
  context() { return {}; },
  isEngineBusy() { return false; }
};

function planner() {
  return {
    restoreOrCreate(id) {
      return tree(id, false);
    },
    nextAction() { return null; }
  };
}

test('rehydrates active IDs from lifecycle', () => {
  const { M } = loadManager({ M1: { id: 'M1', priority: 10 } });
  M.MissionManager.prototype.selectBestPrimary = function () { return false; };

  const mem = memory({
    primaryMissionId: '',
    activeMissionId: '',
    activeMissionIds: [],
    missionLifecycle: { M1: { status: 'active' } },
    missions: { M1: { id: 'M1' } }
  });

  const manager = new M.MissionManager({
    engine: { currentMapId: 'map-a' },
    memory: mem,
    planner: planner(),
    bridge
  });

  assert.deepEqual(Array.from(manager.activeMissionIds), ['M1']);
  assert.deepEqual(Array.from(mem.state.activeMissionIds), ['M1']);
  assert.equal(manager.persistenceHydrationBlocked, false);
});

test('missing definition blocks destructive sync', () => {
  const { M } = loadManager({});
  M.MissionManager.prototype.selectBestPrimary = function () {
    throw new Error('must not arbitrate while hydration is blocked');
  };

  const mem = memory({
    primaryMissionId: 'MISSING',
    activeMissionId: 'MISSING',
    activeMissionIds: ['MISSING'],
    missionLifecycle: { MISSING: { status: 'active' } },
    missions: { MISSING: { id: 'MISSING' } }
  });

  const manager = new M.MissionManager({
    engine: { currentMapId: 'map-a' },
    memory: mem,
    planner: planner(),
    bridge
  });

  assert.equal(manager.persistenceHydrationBlocked, true);
  assert.equal(mem.state.primaryMissionId, 'MISSING');
  assert.equal(mem.state.activeMissionId, 'MISSING');
  assert.deepEqual(Array.from(mem.state.activeMissionIds), ['MISSING']);
  assert.ok(mem.state.missions.MISSING);
});

test('late definition releases hydration lock and restores mission without data loss', () => {
  const { M } = loadManager({});

  const mem = memory({
    primaryMissionId: 'LATE',
    activeMissionId: 'LATE',
    activeMissionIds: ['LATE'],
    missionLifecycle: { LATE: { status: 'active', selectionReason: 'restored' } },
    missions: { LATE: { id: 'LATE' } }
  });

  const manager = new M.MissionManager({
    engine: { currentMapId: 'map-a' },
    memory: mem,
    planner: planner(),
    bridge
  });

  assert.equal(manager.persistenceHydrationBlocked, true);
  assert.deepEqual(Array.from(manager.activeMissionIds), []);
  assert.equal(mem.state.primaryMissionId, 'LATE');

  M.definitions.LATE = { id: 'LATE', priority: 10 };

  const recovered = manager.recoverPersistenceHydration(1500);
  assert.equal(recovered, true);
  assert.equal(manager.persistenceHydrationBlocked, false);
  assert.deepEqual(Array.from(manager.activeMissionIds), ['LATE']);
  assert.equal(manager.primaryMissionId, 'LATE');
  assert.equal(mem.state.primaryMissionId, 'LATE');
  assert.deepEqual(Array.from(mem.state.activeMissionIds), ['LATE']);
  assert.ok(mem.state.missions.LATE);
  assert.ok(manager.trees.has('LATE'));
});
