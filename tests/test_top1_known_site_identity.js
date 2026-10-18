/*
 * Bounded runtime regression for MissionManager's historical known-site identities.
 * Fixture: selected topology, stele observations and site slots extracted from
 * autosave(20261018-141044).json. No fabricated credits or mission completion.
 * Run: node tests/test_top1_known_site_identity.js
 */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/top1_historical_stele_subset.json'), 'utf8'));
const source = fs.readFileSync(path.join(__dirname, '../engine/mission-manager.js'), 'utf8');
const indicators = structuredClone(fixture.indicators);
const maps = Object.fromEntries(fixture.discoveredMaps.map(id => [id, { exits: {} }]));
for (const link of fixture.topology) {
  if (!maps[link.from]) maps[link.from] = { exits: {} };
  maps[link.from].exits[link.direction] = { targetMap: link.to };
}
const BF = {
  Missions: {
    ActionType: { TRAVEL: 'travel', OBSERVE: 'observe', INSPECT: 'inspect', ANALYZE: 'analyze', COLLECT: 'collect', EXTRACT: 'extract' },
    normalizeActionType: type => String(type).toLowerCase()
  },
  maps,
  ObjectLibrary: { getById: id => id === 'RUI-STEL-L-001' ? { id, type: 'stele', category: 'relic' } : null },
  getMapProgressionIndicators: id => indicators[id] || {},
  getMultiProgressionState: () => ({ mapIndicators: indicators }),
  getKnownSites: () => Object.values(fixture.sites),
  getMapExplorationState: () => ({ surfacePercent: 0 })
};
// Narrow substitute for ObjectM0's criterion checks. The actual object type,
// observation evidence and identity come from the saved canonical data.
BF.matchesKnownMissionObject = (_tree, _node, { mapId, instanceId, objectId }) =>
  objectId === 'RUI-STEL-L-001' && Boolean(instanceId) &&
  !indicators[mapId]?.phenomenaObserved?.[instanceId];
const sandbox = { window: { BlueFox3D: BF }, console, Set, performance: { now: () => 1 } };
vm.runInNewContext(source, sandbox, { filename: 'engine/mission-manager.js' });
const manager = Object.create(BF.Missions.MissionManager.prototype);
const node = { ...fixture.node, isComplete: false };
const tree = { root: { isComplete: false }, availableLeaves: () => [node], find: id => id === node.id ? node : null };
const definition = {
  id: 'GAME-civilization_1', pattern: 'SEQUENCE_ACTIONS',
  allowsAutonomousHistoricalObservation: true,
  navigation: { autonomousUnknownTravel: true },
  mapGeneration: { size: 'random', biome: 'random', requiredObjects: [{ type: 'stele', count: 1 }] },
  runtimeCounters: [{ slot: 'steles', source: 'observations.historical', cuoType: 'stele' }]
};
const known = new Set(fixture.discoveredMaps);
const routeFor = (from, to) => {
  const seen = new Set([from]);
  const queue = [[from]];
  while (queue.length) {
    const route = queue.shift();
    const current = route.at(-1);
    if (current === to) return route;
    for (const exit of Object.values(maps[current]?.exits || {})) {
      if (!known.has(exit.targetMap) || seen.has(exit.targetMap)) continue;
      seen.add(exit.targetMap);
      queue.push([...route, exit.targetMap]);
    }
  }
  return null;
};
const engine = {
  currentMapId: fixture.currentMapId, discoveredMaps: known,
  worldTopology: { coordinateOf: id => fixture.coordinates[id] },
  currentMap: { interactables: [] },
  findKnownRoute: routeFor, findOptimalRoute: routeFor
};
const facts = new Map();
Object.assign(manager, {
  primaryMissionId: 'GAME-civilization_1', tree,
  trees: new Map([['GAME-civilization_1', tree]]), engine,
  memory: {
    state: { primaryMissionId: fixture.top1, missionLifecycle: fixture.lifecycle },
    getFact: (key, otherwise = null) => facts.has(key) ? facts.get(key) : otherwise,
    setFact: (key, value) => facts.set(key, value), save: () => {}
  },
  planner: { requiredMapState: () => ({ constrained: false }) },
  bridge: { context: () => ({ mapId: fixture.currentMapId }) },
  definition: id => id === 'GAME-civilization_1' ? definition : null
});
BF.currentEngine = engine;
engine.missionManager = manager;
manager.eventDrivenTravelForMission = () => null;
// Verified local fact: no unobserved stele is exposed on crystal in this save.
manager.missionRunnableAction = () => null;
manager.stepShelterRequirementFor = () => null;
const mapState = [{ node, state: { constrained: false } }];
const knownDestination = () => manager.missionKnownDestinationTransition(
  'GAME-civilization_1', definition, mapState, fixture.currentMapId
);
const transition = () => manager.missionTransitionFor('GAME-civilization_1', { mapId: fixture.currentMapId });
assert.equal(manager.isPlayerSelectedPrimary(), true);
assert.equal(manager.missionHasKnownLocalDestination('GAME-civilization_1', definition, mapState, fixture.currentMapId), false);
assert.equal(knownDestination(), null, 'all previously observed MSC slots must be excluded');
let travel = transition();
assert.equal(travel?.source, 'mission-map-generation');
assert.equal(manager.missionTransitionExecutable(travel), true);
assert.equal(manager.missionUnknownTravelPlan(travel)?.frontierMapId, 'generated-5269cd00-0004');
// The already-validated global authority is retained; the patch changes only
// whether travel chooses a stale site or a real unknown frontier.
manager.localOpportunityWork = () => null;
manager.localProximityWork = () => null;
manager.localCompletionGateFor = () => null;
manager.causalArrivalWork = () => null;
assert.equal(manager.hasPrimaryMissionAuthority(), true);
// Persisted known destinations from stale aliases may never be restored.
const stale = {
  active: true, kind: 'known-destination', missionId: 'GAME-civilization_1',
  nodeId: `${node.id}:known-destination`,
  knownDestinationSignature: JSON.stringify({ sourceNodeId: node.id }),
  targetMapId: 'generated-5269cd00-0001'
};
assert.equal(manager.validatePersistedKnownDestination({ missionId: 'GAME-civilization_1', node: { id: stale.nodeId } },
  { sourceNodeId: node.id }, stale), null);
// Existing physical instance, not yet observed, must remain a valid target.
const site = Object.values(fixture.sites).find(site => site.mapId === 'generated-5269cd00-0001');
const unobservedId = `${site.persistentMicroSceneId}:3`;
assert.ok(indicators[site.mapId].phenomenaObserved[unobservedId]);
delete indicators[site.mapId].phenomenaObserved[unobservedId];
travel = knownDestination();
assert.equal(travel?.node?.params?.toMapId, site.mapId);
indicators[site.mapId].phenomenaObserved[unobservedId] = { at: 1 };
// Unresolved legacy slot identity is not accepted as a new observed instance.
const saved = indicators[site.mapId].uniqueInstances[unobservedId];
delete indicators[site.mapId].uniqueInstances[unobservedId];
assert.equal(knownDestination(), null);
indicators[site.mapId].uniqueInstances[unobservedId] = saved;
// Existing non-historical mission matching has not been tightened.
definition.allowsAutonomousHistoricalObservation = false;
assert.ok(knownDestination(), 'legacy non-historical site travel preserved');
definition.allowsAutonomousHistoricalObservation = true;
console.log('PASS: saved stele slots rejected, frontier executable, stale destination invalid, unseen stele accepted, non-historical behavior preserved');
