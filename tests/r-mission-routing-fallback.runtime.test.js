const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = process.env.TARGET_ROOT || path.join(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'engine/mission-manager.js'), 'utf8');

function boot({ currentMapId = 'field', sites = [], routes = {} } = {}) {
  const definitions = {};
  const facts = new Map();
  const BF = {};
  const window = {
    BlueFox3D: BF,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    localStorage: { getItem() { return null; }, setItem() {} }
  };
  window.window = window;
  BF.getAutonomyMode = () => 'full';
  BF.getProgressionState = () => ({ inventory: {} });
  BF.getMapExplorationState = () => ({ surfacePercent: 50 });
  BF.getKnownSites = (criteria = {}) => sites.filter((site) => {
    if (criteria.siteId && site.siteId !== criteria.siteId) return false;
    if (criteria.microSceneId && site.microSceneId !== criteria.microSceneId) return false;
    if (criteria.mapId && site.mapId !== criteria.mapId) return false;
    return true;
  });
  BF.BAC = { weightedPick(options) { return options[0] || null; } };
  BF.Missions = {
    definitions,
    getDefinition: (id) => definitions[id] || null,
    ActionType: {
      TRAVEL: 'travel', COLLECT: 'collect', EXTRACT: 'extract', OBSERVE: 'observe',
      INSPECT: 'inspect', ANALYZE: 'analyze', RESEARCH: 'research', CRAFT: 'craft',
      BUILD: 'build', EXPLORE_ZONE: 'explore_zone', REST: 'rest', EAT: 'eat'
    },
    MissionStatus: { AVAILABLE: 'available', ACTIVE: 'active', COMPLETED: 'completed', FAILED: 'failed' },
    normalizeActionType: (value) => String(value || '')
  };
  const context = vm.createContext({ window, CustomEvent: class {}, console, performance, Date, Math, JSON, Set, Map });
  vm.runInContext(source, context, { filename: 'mission-manager.js' });
  const Manager = BF.Missions.MissionManager;
  const manager = Object.create(Manager.prototype);
  const lifecycle = {};
  manager.engine = {
    currentMapId,
    currentMap: { interactables: [], group: { userData: { microScenes: [] } } },
    discoveredMaps: new Set([currentMapId, ...sites.map((site) => site.mapId)]),
    findOptimalRoute(from, to) { return routes[`${from}->${to}`] || null; },
    findKnownRoute(from, to) { return routes[`${from}->${to}`] || null; },
    handleNavigationSuggestion(req) { manager.lastNavigation = req; return true; },
    callbacks: { onAction() {}, onStatus() {} },
    character: { root: { position: { distanceTo() { return 0; } } }, target: {} },
    transitioning: false, pendingGate: null, pendingInteraction: null,
    pendingZoneExploration: null, persistentNavigationIntent: null, currentRoutine: null
  };
  manager.memory = {
    state: { missionLifecycle: lifecycle, pendingActivations: {}, prioritizedMissionIds: [] },
    getFact(key, fallback = null) { return facts.has(key) ? facts.get(key) : fallback; },
    setFact(key, value) { facts.set(key, value); return value; },
    save() {}, saveTree() {}, remember() {}
  };
  manager.bridge = { context: () => ({ mapId: manager.engine.currentMapId, energy: 80, needs: {} }), isEngineBusy: () => false };
  manager.planner = { nextAction: () => null, requiredMapState: () => ({ constrained: false }) };
  manager.trees = new Map();
  manager.activeMissionIds = [];
  manager.primaryMissionId = '';
  manager.tree = null;
  manager.currentAction = null;
  manager.prioritizedMissionIds = [];
  manager.enabled = true;
  manager.persistenceHydrationBlocked = false;
  manager.lastPriorityReviewAt = 0;
  manager.lastPlanAt = 0;
  manager.retryAfter = 0;
  manager.idleRetryUntil = 0;
  manager.pendingPrimaryMissionId = null;
  manager.pendingPrimaryMissionReason = null;
  manager.pendingPauseMissionId = null;
  manager.executionRecovery = new Map();
  manager.targetProbeDiagnostics = new Map();
  manager.isMissionGuidanceEnabled = () => true;
  manager.publish = () => {};
  manager.syncMissionSelection = () => true;
  manager.selectBestPrimary = () => false;
  manager.applyPendingTransitions = () => false;
  manager.getPrioritizedMissionIds = () => [...manager.prioritizedMissionIds];
  manager.ensureLifecycle = (id, status = 'available') => {
    lifecycle[id] ||= { status, urgency: 0, narrativePriority: 0, autoPrimaryEligible: true };
    return lifecycle[id];
  };
  manager.hasActivePrimaryMission = () => Boolean(manager.primaryMissionId && lifecycle[manager.primaryMissionId]?.status === 'active');
  manager.missionHasHistoricalCollectionObjective = () => false;
  manager.historicalCollectionTransitionOpportunity = () => false;
  manager.delegatedRuntimeAction = () => null;

  function addMission(id, definition, node) {
    definitions[id] = { id, priority: 100, ...definition };
    lifecycle[id] = { status: 'active', urgency: 0, narrativePriority: 0, autoPrimaryEligible: true };
    const tree = {
      id,
      root: { isComplete: false, walk() {} },
      availableLeaves: () => node ? [node] : [],
      find: (nodeId) => node && nodeId === node.id ? node : null
    };
    manager.trees.set(id, tree);
    manager.activeMissionIds.push(id);
    return tree;
  }

  return { BF, manager, definitions, facts, lifecycle, addMission };
}

function leaf(id, type = 'research', params = {}) {
  return { id, type, params, isComplete: false, target: 1, progress: 0, distinctValues: [] };
}

test('active-slot proximityContext resolves a known workbench destination', () => {
  const h = boot({
    sites: [{ siteId: 'workbench', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-ETABLI-VIDE', knownInstanceCount: 1 }],
    routes: { 'field->crystal': ['field', 'crystal'] }
  });
  h.addMission('ENE-11', {
    proximityContexts: [{ slot: 'prototype', microSceneId: 'MSC-CUSTOM-ETABLI-VIDE' }]
  }, leaf('ENE-11:prototype', 'research', { catalogManaged: true }));
  const travel = h.manager.missionTransitionFor('ENE-11', h.manager.bridge.context());
  assert.equal(travel?.source, 'mission-known-destination');
  assert.equal(travel?.node?.params?.toMapId, 'crystal');
  assert.equal(travel?.node?.params?.knownDestination?.microSceneId, 'MSC-CUSTOM-ETABLI-VIDE');
});

test('proximityContext destination is not invented when the active slot is ambiguous', () => {
  const h = boot({
    sites: [
      { siteId: 'camp', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-CAMP', knownInstanceCount: 1 },
      { siteId: 'base', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-CAMP-BASE', knownInstanceCount: 1 }
    ],
    routes: { 'field->crystal': ['field', 'crystal'] }
  });
  h.addMission('AMB-01', {
    proximityContexts: [
      { slot: 'decision', microSceneId: 'MSC-CUSTOM-CAMP' },
      { slot: 'decision', microSceneId: 'MSC-CUSTOM-CAMP-BASE' }
    ]
  }, leaf('AMB-01:decision', 'research', { catalogManaged: true }));
  assert.equal(h.manager.missionTransitionFor('AMB-01', h.manager.bridge.context()), null);
});

test('OPP can return to its already-known MSC but does not invent an unknown destination', () => {
  const known = boot({
    sites: [{ siteId: 'opp-site', mapId: 'old-map', microSceneId: 'MSC-OPP-TEST', knownInstanceCount: 1 }],
    routes: { 'field->old-map': ['field', 'old-map'] }
  });
  known.addMission('OPP-TEST-01', {
    proximityContexts: [{ slot: 'approach', microSceneId: 'MSC-OPP-TEST' }]
  }, leaf('OPP-TEST-01:approach', 'research', { catalogManaged: true }));
  assert.equal(known.manager.missionTransitionFor('OPP-TEST-01', known.manager.bridge.context())?.node?.params?.toMapId, 'old-map');

  const unknown = boot();
  unknown.addMission('OPP-TEST-01', {
    proximityContexts: [{ slot: 'approach', microSceneId: 'MSC-OPP-TEST' }]
  }, leaf('OPP-TEST-01:approach', 'research', { catalogManaged: true }));
  assert.equal(unknown.manager.missionTransitionFor('OPP-TEST-01', unknown.manager.bridge.context()), null);
});

test('ANN without known fog yields to another runnable Top4 mission', () => {
  const h = boot();
  const ann = leaf('ANN-04:fog', 'observe', { requiredMapFact: 'ann04:fogTarget', cuoType: 'fog_bank' });
  const game = leaf('GAME-base:minerals', 'extract', { subject: 'mineral' });
  h.addMission('ANN-04', { targetMapFact: 'ann04:fogTarget' }, ann);
  h.addMission('GAME-base', {}, game);
  h.manager.primaryMissionId = 'ANN-04';
  h.manager.tree = h.manager.trees.get('ANN-04');
  h.manager.prioritizedMissionIds = ['ANN-04', 'GAME-base'];
  h.manager.missionRunnableAction = (id) => id === 'GAME-base'
    ? { missionId: id, nodeId: 'GAME-base:minerals', type: 'extract', title: 'minerals', params: {} }
    : null;
  const work = h.manager.prioritizedMissionWork(h.manager.bridge.context());
  assert.equal(work?.kind, 'action');
  assert.equal(work?.missionId, 'GAME-base');
});

test('R-STAB outside Top4 recognizes a #5 executable travel and preserves authority', () => {
  const h = boot({ routes: { 'field->remote': ['field', 'remote'] } });
  ['P','A','B','C','X'].forEach((id) => h.addMission(id, {}, leaf(`${id}:step`, 'research', {})));
  h.manager.primaryMissionId = 'P';
  h.manager.tree = h.manager.trees.get('P');
  h.manager.prioritizedMissionIds = ['P','A','B','C'];
  h.manager.hasPrimaryMissionAuthority = () => false;
  h.manager.missionRunnableAction = () => null;
  h.manager.assessMission = (id) => ({ missionId: id, score: id === 'X' ? 250 : 0, action: null, delegatedRuntimeAction: null, reasons: ['aucune action réalisable'] });
  h.manager.assessMissionPriority = (id) => ({ missionId: id, score: id === 'X' ? 250 : 0, action: null, reasons: [] });
  h.manager.missionTransitionFor = (id) => id === 'X'
    ? { missionId: 'X', mission: h.definitions.X, source: 'required-map', node: { id: 'X:travel', type: 'travel', params: { toMapId: 'remote' } } }
    : null;
  const work = h.manager.outsideShortlistMissionTravel(h.manager.bridge.context());
  assert.equal(work?.kind, 'travel');
  assert.equal(work?.missionId, 'X');
  assert.equal(h.manager.hasMissionExecutionAuthority(), true);
});

test('R-STAB keeps existing outside-Top4 action fallback ahead of travel', () => {
  const h = boot({ routes: { 'field->remote': ['field', 'remote'] } });
  ['P','A','B','C','X','Y'].forEach((id) => h.addMission(id, {}, leaf(`${id}:step`, 'research', {})));
  h.manager.primaryMissionId = 'P';
  h.manager.tree = h.manager.trees.get('P');
  h.manager.prioritizedMissionIds = ['P','A','B','C'];
  h.manager.assessMission = (id) => ({
    missionId: id,
    score: id === 'Y' ? 100 : 0,
    action: id === 'Y' ? { missionId: id, nodeId: 'Y:step', type: 'observe', title: 'Y', params: {} } : null,
    delegatedRuntimeAction: null,
    reasons: id === 'Y' ? ['action réalisable'] : ['aucune action réalisable']
  });
  h.manager.missionTransitionFor = (id) => id === 'X'
    ? { missionId: 'X', mission: h.definitions.X, source: 'required-map', node: { id: 'X:travel', type: 'travel', params: { toMapId: 'remote' } } }
    : null;
  const action = h.manager.chooseRunnableMissionAction(h.manager.bridge.context());
  assert.equal(action?.missionId, 'Y');
  const travel = h.manager.outsideShortlistMissionTravel(h.manager.bridge.context());
  assert.equal(travel?.kind, 'travel');
  assert.equal(travel?.missionId, 'X');
});

test('update launches the outside-Top4 travel instead of falling to free autonomy', () => {
  const h = boot();
  h.manager.primaryMissionId = 'P';
  h.manager.enabled = true;
  h.manager.lastPlanAt = 0;
  h.manager.retryAfter = 0;
  h.manager.lastPriorityReviewAt = 10000;
  h.manager.hasActivePrimaryMission = () => true;
  h.manager.ensureMissionTransitionIntent = (ctx, travel) => travel ? ({ active: true }) : null;
  h.manager.resumeMissionTransitionIntent = (ctx, travel) => Boolean(travel);
  h.manager.prioritizedMissionWork = () => null;
  h.manager.chooseRunnableMissionAction = () => null;
  h.manager.outsideShortlistMissionTravel = () => ({ kind: 'travel', missionId: 'X', travel: { missionId: 'X', node: { type: 'travel', params: { toMapId: 'remote' } } } });
  assert.equal(h.manager.update(20000), true);
});

test('legacy ARCH intent is cleared only after arrival on its target map', () => {
  const h = boot({ currentMapId: 'target' });
  h.addMission('ARCH-04', {}, leaf('ARCH-04:observe', 'observe', {}));
  h.manager.primaryMissionId = 'ARCH-04';
  h.manager.tree = h.manager.trees.get('ARCH-04');
  h.facts.set('missionReturnIntent:ARCH-04', {
    active: true,
    missionId: 'ARCH-04',
    targetMapId: 'target',
    mapId: 'target',
    transitionSource: 'legacy-generated-target'
  });
  h.manager.primaryMissionTransition = () => null;
  h.manager.ensureMissionTransitionIntent(h.manager.bridge.context());
  assert.equal(h.facts.get('missionReturnIntent:ARCH-04').active, false);

  h.manager.engine.currentMapId = 'elsewhere';
  h.facts.set('missionReturnIntent:ARCH-04', {
    active: true,
    missionId: 'ARCH-04',
    targetMapId: 'target',
    mapId: 'target',
    transitionSource: 'legacy-generated-target'
  });
  h.manager.ensureMissionTransitionIntent(h.manager.bridge.context());
  assert.equal(h.facts.get('missionReturnIntent:ARCH-04').active, true);
});

test('proximityContext of a future slot is ignored for current mission work', () => {
  const h = boot({
    sites: [{ siteId: 'future-site', mapId: 'remote', microSceneId: 'MSC-FUTURE', knownInstanceCount: 1 }],
    routes: { 'field->remote': ['field', 'remote'] }
  });
  h.addMission('SEQ-01', {
    proximityContexts: [{ slot: 'future', microSceneId: 'MSC-FUTURE' }]
  }, leaf('SEQ-01:current', 'research', { catalogManaged: true }));
  assert.equal(h.manager.missionTransitionFor('SEQ-01', h.manager.bridge.context()), null);
});

test('known OPP target on current map never causes a pointless departure', () => {
  const h = boot({
    currentMapId: 'field',
    sites: [
      { siteId: 'local', mapId: 'field', microSceneId: 'MSC-OPP-TEST', knownInstanceCount: 1 },
      { siteId: 'remote', mapId: 'old-map', microSceneId: 'MSC-OPP-TEST', knownInstanceCount: 3 }
    ],
    routes: { 'field->old-map': ['field', 'old-map'] }
  });
  h.addMission('OPP-TEST-02', {
    proximityContexts: [{ slot: 'approach', microSceneId: 'MSC-OPP-TEST' }]
  }, leaf('OPP-TEST-02:approach', 'research', { catalogManaged: true }));
  assert.equal(h.manager.missionTransitionFor('OPP-TEST-02', h.manager.bridge.context()), null);
});

test('implicit unknown generation remains blocked for OPP after known-return repair', () => {
  const h = boot();
  h.addMission('OPP-TEST-03', {
    trigger: { type: 'other.event' },
    mapGeneration: { requiredMicroScenes: [{ id: 'MSC-OPP-UNKNOWN' }] },
    proximityContexts: [{ slot: 'approach', microSceneId: 'MSC-OPP-UNKNOWN' }]
  }, leaf('OPP-TEST-03:approach', 'research', { catalogManaged: true }));
  assert.equal(h.manager.missionTransitionFor('OPP-TEST-03', h.manager.bridge.context()), null);
});

test('explicit OPP travel remains owned by its mission contract', () => {
  const h = boot({ routes: { 'field->old-map': ['field', 'old-map'] } });
  h.addMission('OPP-TEST-04', {}, leaf('OPP-TEST-04:return', 'travel', { eventDriven: true, toMapId: 'old-map' }));
  const travel = h.manager.missionTransitionFor('OPP-TEST-04', h.manager.bridge.context());
  assert.equal(travel?.node?.id, 'OPP-TEST-04:return');
  assert.equal(travel?.node?.params?.toMapId, 'old-map');
});

test('runnable Top4 work prevents any outside-shortlist fallback scan', () => {
  const h = boot();
  ['P','S','X'].forEach((id) => h.addMission(id, {}, leaf(`${id}:step`, 'research', {})));
  h.manager.primaryMissionId = 'P';
  h.manager.tree = h.manager.trees.get('P');
  h.manager.prioritizedMissionIds = ['P','S'];
  h.manager.hasPrimaryMissionAuthority = () => false;
  let outsideCalls = 0;
  h.manager.outsideShortlistMissionTravel = () => { outsideCalls++; return null; };
  h.manager.assessMission = (id) => ({
    missionId: id,
    score: id === 'S' ? 100 : 0,
    action: id === 'S' ? { missionId: id, nodeId: 'S:step', type: 'observe', title: 'S', params: {} } : null,
    delegatedRuntimeAction: null,
    reasons: []
  });
  h.manager.missionTransitionFor = () => null;
  assert.equal(h.manager.hasMissionExecutionAuthority(), true);
  assert.equal(outsideCalls, 0);
});
