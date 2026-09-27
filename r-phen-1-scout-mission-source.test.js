const assert = require('assert');
const path = require('path');

const bridgePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '../engine/object-m0-bridge.js');

global.window = global;
global.performance = global.performance || { now: () => Date.now() };

const BF = global.BlueFox3D = {
  Missions: {},
  ObjectLibrary: null,
  ObjectEvents: {
    types: {
      OBJECT_SEEN: 'OBJECT_SEEN',
      OBJECT_INSPECTED: 'OBJECT_INSPECTED',
      OBJECT_ANALYZED: 'OBJECT_ANALYZED',
      PHENOMENON_OBSERVED: 'PHENOMENON_OBSERVED',
      RESOURCE_COLLECTED: 'RESOURCE_COLLECTED',
      RESOURCE_EXTRACTED: 'RESOURCE_EXTRACTED',
      NPC_REACTION: 'NPC_REACTION'
    },
    subscribe() { return () => {}; }
  }
};

const Missions = BF.Missions;
Missions.ActionType = {
  OBSERVE: 'observe',
  INSPECT: 'inspect',
  ANALYZE: 'analyze',
  COLLECT: 'collect',
  EXTRACT: 'extract'
};
Missions.normalizeActionType = (value) => String(value || '').toLowerCase();

class MissionManager {
  static create() { return new MissionManager(); }
}
Missions.MissionManager = MissionManager;

require(bridgePath);

let eventSeq = 0;
const node = (id, params = {}) => ({
  id,
  type: 'observe',
  params,
  isComplete: false,
  progress: 0,
  target: 99,
  historyValues: [],
  increment(amount = 1) {
    this.progress += amount;
    return true;
  },
  incrementDistinct(value, amount = 1) {
    this.__distinct ||= new Set();
    if (!value || this.__distinct.has(value)) return false;
    this.__distinct.add(value);
    this.progress += amount;
    return true;
  },
  pushHistoryValue(value) {
    this.historyValues.push(value);
    return true;
  }
});

const tree = (id, nodes) => ({
  id,
  root: {
    walk(callback) { nodes.forEach(callback); }
  },
  availableLeaves() { return nodes; },
  find(nodeId) { return nodes.find((entry) => entry.id === nodeId) || null; },
  refresh() {}
});

const managerWith = (entries) => {
  const manager = new Missions.MissionManager();
  manager.trees = new Map(entries);
  manager.currentAction = null;
  manager.ensureLifecycle = () => ({ status: 'active' });
  const processed = new Set();
  manager.memory = {
    hasProcessedObjectEvent(id) { return processed.has(id); },
    markProcessedObjectEvent(id) { processed.add(id); },
    getFact() { return null; },
    saveTree() {},
    remember() {},
    save() {}
  };
  manager.syncLifecycleFromTrees = () => {};
  manager.reevaluatePendingActivations = () => {};
  manager.catalogController = { schedule() {} };
  manager.publish = () => {};
  return manager;
};

const scoutEvent = ({ remote = false, droneType = 'scout_drone', tags = ['drone-scouted'] } = {}) => ({
  id: `evt-${++eventSeq}`,
  type: 'OBJECT_SEEN',
  objectId: 'OBJ-PHEN',
  instanceId: `inst-${eventSeq}`,
  mapId: remote ? 'map-remote' : 'map-local',
  zoneId: remote ? 4 : 1,
  tags,
  detail: {
    interactionSource: 'drone',
    droneType,
    remote,
    subject: 'geology',
    kind: 'geology',
    tags
  }
});

const bluefoxStudyEvent = () => ({
  id: `evt-${++eventSeq}`,
  type: 'OBJECT_INSPECTED',
  objectId: 'OBJ-PHEN',
  instanceId: `inst-${eventSeq}`,
  mapId: 'map-local',
  tags: [],
  detail: {
    interactionSource: 'manual',
    subject: 'geology',
    kind: 'geology'
  }
});

// 1. Historical behavior: Scout OBJECT_SEEN must NOT credit an ordinary study node.
{
  const ordinary = node('LEGACY:study');
  const manager = managerWith([['LEGACY', tree('LEGACY', [ordinary])]]);
  manager.consumeObjectEvent(scoutEvent());
  assert.equal(ordinary.progress, 0, 'Scout must remain historical-only for missions without opt-in');
}

// 2. Explicit Scout opt-in accepts a real local Scout observation.
{
  const scoutRequired = node('PHEN:scout', { actor: 'scout' });
  const manager = managerWith([['PHEN', tree('PHEN', [scoutRequired])]]);
  manager.consumeObjectEvent(scoutEvent());
  assert.equal(scoutRequired.progress, 1, 'actor=scout must accept canonical Scout OBJECT_SEEN');
}

// 3. BlueFox cannot substitute for a Scout-required node.
{
  const scoutRequired = node('PHEN:scout', { actor: 'scout' });
  const manager = managerWith([['PHEN', tree('PHEN', [scoutRequired])]]);
  manager.consumeObjectEvent(bluefoxStudyEvent());
  assert.equal(scoutRequired.progress, 0, 'BlueFox study must not satisfy actor=scout');
}

// 4. Remote requirement rejects local Scout, accepts remote Scout.
{
  const remoteRequired = node('PHEN:remote', { actor: 'scout', remote: true });
  const manager = managerWith([['PHEN', tree('PHEN', [remoteRequired])]]);
  manager.consumeObjectEvent(scoutEvent({ remote: false }));
  assert.equal(remoteRequired.progress, 0, 'remote=true must reject local Scout work');
  manager.consumeObjectEvent(scoutEvent({ remote: true }));
  assert.equal(remoteRequired.progress, 1, 'remote=true must accept distant Scout work');
}

// 5. Wrong drone class cannot masquerade as Scout.
{
  const scoutRequired = node('PHEN:scout', { actor: 'scout' });
  const manager = managerWith([['PHEN', tree('PHEN', [scoutRequired])]]);
  manager.consumeObjectEvent(scoutEvent({ droneType: 'harvest_drone' }));
  assert.equal(scoutRequired.progress, 0, 'Harvest drone must not satisfy Scout mission work');
}

// 6. Missing canonical Scout tag is rejected.
{
  const scoutRequired = node('PHEN:scout', { actor: 'scout' });
  const manager = managerWith([['PHEN', tree('PHEN', [scoutRequired])]]);
  manager.consumeObjectEvent(scoutEvent({ tags: [] }));
  assert.equal(scoutRequired.progress, 0, 'Unmarked drone OBJECT_SEEN must not become mission evidence');
}

// 7. actor alternatives allow either BlueFox or Scout without changing historical defaults.
{
  const shared = node('PHEN:shared', { actorsAny: ['bluefox', 'scout'] });
  const manager = managerWith([['PHEN', tree('PHEN', [shared])]]);
  manager.consumeObjectEvent(bluefoxStudyEvent());
  manager.consumeObjectEvent(scoutEvent());
  assert.equal(shared.progress, 2, 'actorsAny must accept both BlueFox study and Scout observation');
}

// 8. Fan-out: one real Scout event can progress every compatible active mission.
{
  const phen = node('PHEN:scan', { actor: 'scout' });
  const geo = node('GEO:scan', { actor: 'scout' });
  const manager = managerWith([
    ['PHEN', tree('PHEN', [phen])],
    ['GEO', tree('GEO', [geo])]
  ]);
  manager.consumeObjectEvent(scoutEvent({ remote: true }));
  assert.equal(phen.progress, 1, 'PHEN compatible consumer must progress');
  assert.equal(geo.progress, 1, 'Second compatible consumer must progress from same event');
}

console.log('PASS R-PHEN-1 Scout mission provenance/local-remote/fan-out contract');
