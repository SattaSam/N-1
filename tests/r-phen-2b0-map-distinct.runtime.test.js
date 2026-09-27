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

let seq = 0;
const makeNode = (id, params = {}) => ({
  id,
  type: 'observe',
  params,
  isComplete: false,
  progress: 0,
  target: 99,
  historyValues: [],
  increment(amount = 1) { this.progress += amount; return true; },
  incrementDistinct(value, amount = 1) {
    this.__distinct ||= new Set();
    if (!value || this.__distinct.has(value)) return false;
    this.__distinct.add(value);
    this.progress += amount;
    return true;
  },
  hasDistinctValue(value) { return Boolean(value && this.__distinct?.has(value)); },
  pushHistoryValue(value) { this.historyValues.push(value); return true; }
});
const makeTree = (id, nodes) => ({
  id,
  root: { walk(callback) { nodes.forEach(callback); } },
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
    saveTree() {}, remember() {}, save() {}
  };
  manager.syncLifecycleFromTrees = () => {};
  manager.reevaluatePendingActivations = () => {};
  manager.catalogController = { schedule() {} };
  manager.publish = () => {};
  return manager;
};
const bluefox = ({mapId='map-A', objectId='OBJ-X', instanceId=`inst-${++seq}`} = {}) => ({
  id:`evt-${++seq}`, type:'OBJECT_INSPECTED', objectId, instanceId, mapId,
  detail:{ interactionSource:'manual', subject:'geology', kind:'geology' }
});
const scout = ({mapId='map-A', remote=false, instanceId=`scout-${++seq}`} = {}) => ({
  id:`evt-${++seq}`, type:'OBJECT_SEEN', objectId:'OBJ-X', instanceId, mapId,
  tags:['drone-scouted'],
  detail:{
    interactionSource:'drone', droneType:'scout_drone', remote,
    subject:'geology', kind:'geology', tags:['drone-scouted']
  }
});

// mapId: different instances on one map count once; another map counts again.
{
  const n = makeNode('PHEN:maps', { distinctBy:'mapId', actorsAny:['bluefox','scout'] });
  const m = managerWith([['PHEN', makeTree('PHEN',[n])]]);
  m.consumeObjectEvent(bluefox({mapId:'map-A',instanceId:'A-1'}));
  m.consumeObjectEvent(bluefox({mapId:'map-A',instanceId:'A-2'}));
  assert.equal(n.progress, 1, 'two objects on the same map must count once');
  m.consumeObjectEvent(bluefox({mapId:'map-B',instanceId:'B-1'}));
  assert.equal(n.progress, 2, 'a second real map must count');
  m.consumeObjectEvent(scout({mapId:'map-B',remote:false,instanceId:'B-S'}));
  assert.equal(n.progress, 2, 'Scout local on an already-counted map must not recount');
  m.consumeObjectEvent(scout({mapId:'map-C',remote:true,instanceId:'C-S'}));
  assert.equal(n.progress, 3, 'Scout remote on a third map must count');
}

// Missing mapId must never fall back to ordinary increment or create "undefined".
{
  const n = makeNode('PHEN:no-map', { distinctBy:'mapId' });
  const m = managerWith([['PHEN', makeTree('PHEN',[n])]]);
  const e = bluefox({mapId:''});
  delete e.mapId;
  m.consumeObjectEvent(e);
  assert.equal(n.progress, 0, 'missing mapId must not create mission progress');
}

// actor/remote filters remain authoritative.
{
  const n = makeNode('PHEN:remote', { actor:'scout', remote:true, distinctBy:'mapId' });
  const m = managerWith([['PHEN', makeTree('PHEN',[n])]]);
  m.consumeObjectEvent(bluefox({mapId:'map-A'}));
  m.consumeObjectEvent(scout({mapId:'map-A',remote:false}));
  assert.equal(n.progress, 0);
  m.consumeObjectEvent(scout({mapId:'map-A',remote:true}));
  assert.equal(n.progress, 1);
}

// Fan-out remains one event -> every compatible mission.
{
  const p = makeNode('PHEN:maps',{actor:'scout',remote:true,distinctBy:'mapId'});
  const g = makeNode('GEO:maps',{actor:'scout',remote:true,distinctBy:'mapId'});
  const m = managerWith([
    ['PHEN',makeTree('PHEN',[p])],
    ['GEO',makeTree('GEO',[g])]
  ]);
  const e = scout({mapId:'map-Z',remote:true});
  m.consumeObjectEvent(e);
  assert.equal(p.progress,1);
  assert.equal(g.progress,1);
}

// Existing modes are unchanged: instanceId, objectId and family.
{
  const inst = makeNode('LEGACY:instance',{distinctBy:'instanceId'});
  const obj = makeNode('LEGACY:object',{distinctBy:'objectId'});
  const fam = makeNode('LEGACY:family',{distinctBy:'family'});
  const m = managerWith([['LEGACY',makeTree('LEGACY',[inst,obj,fam])]]);
  const e1 = bluefox({mapId:'map-A',objectId:'OBJ-X',instanceId:'I-1'});
  e1.family='mineral';
  const e2 = bluefox({mapId:'map-B',objectId:'OBJ-X',instanceId:'I-2'});
  e2.family='mineral';
  m.consumeObjectEvent(e1);
  m.consumeObjectEvent(e2);
  assert.equal(inst.progress,2,'instanceId behavior changed');
  assert.equal(obj.progress,1,'objectId behavior changed');
  assert.equal(fam.progress,1,'family behavior changed');
}

console.log('PASS R-PHEN-2B0 Object-M0 distinctBy mapId / local-remote / regression contract');
