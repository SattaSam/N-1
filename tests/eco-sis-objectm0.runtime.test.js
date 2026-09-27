const assert = require('assert');
const path = require('path');

const bridgePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '../engine/object-m0-bridge.js');

global.window = global;
global.performance = global.performance || { now: () => Date.now() };

const fernDefinition = {
  id: 'fern',
  type: 'fern',
  category: 'flora',
  knowledge: { family: 'flora' },
  spawn: { tags: ['plant'] },
  interaction: { actions: ['observe', 'inspect', 'analyze'] },
  gameplay: { inspectable: true, analyzable: true }
};

const BF = global.BlueFox3D = {
  Missions: {},
  ObjectLibrary: {
    get(type) { return type === 'fern' ? fernDefinition : null; },
    getById(id) { return id === 'fern' ? fernDefinition : null; }
  },
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
  OBSERVE: 'observe', INSPECT: 'inspect', ANALYZE: 'analyze', COLLECT: 'collect', EXTRACT: 'extract'
};
Missions.normalizeActionType = (value) => String(value || '').toLowerCase();
class MissionManager { static create() { return new MissionManager(); } }
Missions.MissionManager = MissionManager;

require(bridgePath);

let eventSeq = 0;
const node = (id, type, params = {}) => ({
  id, type, params, isComplete: false, progress: 0, target: 1, historyValues: [],
  increment(amount = 1) {
    this.progress = Math.min(this.target, this.progress + amount);
    this.isComplete = this.progress >= this.target;
    return true;
  },
  incrementDistinct(value, amount = 1) {
    this.__distinct ||= new Set();
    if (!value || this.__distinct.has(value)) return false;
    this.__distinct.add(value);
    return this.increment(amount);
  },
  pushHistoryValue(value) { this.historyValues.push(value); return true; }
});

const sequentialTree = (id, first, second) => ({
  id,
  root: { walk(callback) { [first, second].forEach(callback); } },
  availableLeaves() { return first.isComplete ? (second.isComplete ? [] : [second]) : [first]; },
  find(nodeId) { return [first, second].find((entry) => entry.id === nodeId) || null; },
  refresh() {}
});

const managerWith = (tree) => {
  const manager = new Missions.MissionManager();
  manager.trees = new Map([[tree.id, tree]]);
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

const fernEvent = (type = 'PHENOMENON_OBSERVED') => ({
  id: `eco02-fern-${++eventSeq}`,
  type,
  objectId: 'fern',
  instanceId: 'fern-instance-1',
  mapId: 'eco02-map',
  family: 'flora',
  knowledgeFamily: 'flora',
  tags: ['plant'],
  microSceneId: 'MSC-FERN-CLEARING-001',
  detail: {
    interactionSource: 'manual',
    cuoType: 'fern',
    kind: 'fern',
    family: 'flora',
    subject: 'flora',
    microSceneId: 'MSC-FERN-CLEARING-001',
    tags: ['plant']
  }
});

// Réfutation du défaut R1 : le vocabulaire non canonique "plant" ne matche pas fern/flora.
{
  const wrong = node('ECO02-WRONG:ordinary', 'observe', {
    subject: 'plant', microSceneId: 'MSC-FERN-CLEARING-001'
  });
  const dummy = node('ECO02-WRONG:dummy', 'analyze', {});
  const manager = managerWith(sequentialTree('ECO02-WRONG', wrong, dummy));
  manager.consumeObjectEvent(fernEvent());
  assert.equal(wrong.progress, 0, 'subject=plant ne doit pas être accepté comme alias moteur de flora');
}

// Contrat corrigé : un vrai CUO fern/famille flora crédite successivement ordinary puis ordinaryStudy.
{
  const ordinary = node('ECO02-FLORA:ordinary', 'observe', {
    subject: 'flora', microSceneId: 'MSC-FERN-CLEARING-001'
  });
  const ordinaryStudy = node('ECO02-FLORA:ordinaryStudy', 'analyze', {
    subject: 'flora', microSceneId: 'MSC-FERN-CLEARING-001'
  });
  const manager = managerWith(sequentialTree('ECO02-FLORA', ordinary, ordinaryStudy));

  manager.consumeObjectEvent(fernEvent('PHENOMENON_OBSERVED'));
  assert.equal(ordinary.progress, 1, 'ordinary doit accepter fern via la famille canonique flora');

  manager.consumeObjectEvent(fernEvent('OBJECT_ANALYZED'));
  assert.equal(ordinaryStudy.progress, 1, 'ordinaryStudy doit accepter fern via la famille canonique flora');
}

console.log('PASS ECO-SIS ObjectM0 flora/fern refutation');
