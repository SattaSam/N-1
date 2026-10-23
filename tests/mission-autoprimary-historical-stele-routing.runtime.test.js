'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/stele-autoprimary-pingpong-20261023.json'), 'utf8'));
const source = fs.readFileSync(path.join(__dirname, '../engine/mission-manager.js'), 'utf8');
const knownMaps = new Set(fixture.discoveredMaps);
const maps = Object.fromEntries(fixture.discoveredMaps.map(id => [id, { exits: {} }]));
for (const link of fixture.topology) {
  if (!maps[link.from]) maps[link.from] = { exits: {} };
  maps[link.from].exits[link.direction] = { targetMap: link.to };
}

const routeFor = (from, to) => {
  const queue = [[from]];
  const seen = new Set([from]);
  while (queue.length) {
    const route = queue.shift();
    const current = route.at(-1);
    if (current === to) return route;
    for (const exit of Object.values(maps[current]?.exits || {})) {
      const next = String(exit?.targetMap || '');
      if (!knownMaps.has(next) || seen.has(next)) continue;
      seen.add(next);
      queue.push([...route, next]);
    }
  }
  return null;
};

const BF = {
  Missions: {
    ActionType: { TRAVEL: 'travel', OBSERVE: 'observe', INSPECT: 'inspect', ANALYZE: 'analyze', COLLECT: 'collect', EXTRACT: 'extract' },
    normalizeActionType: type => String(type || '').toLowerCase()
  },
  maps,
  discoveredMaps: knownMaps,
  ObjectLibrary: { getById: id => id === 'RUI-STEL-L-001' ? { id, type: 'stele', category: 'relic' } : null },
  getKnownSites: () => Object.values(fixture.sites),
  getMapProgressionIndicators: id => fixture.indicators[id] || {},
  getMultiProgressionState: () => ({ mapIndicators: fixture.indicators }),
  getMapExplorationState: () => ({ surfacePercent: 0 }),
  matchesKnownMissionObject: (_tree, _node, { objectId }) => objectId === 'RUI-STEL-L-001',
  BAC: { weightedPick: options => options[0] || null }
};

const sandbox = { window: { BlueFox3D: BF }, console, Set, Map, performance: { now: () => 1 } };
vm.runInNewContext(source, sandbox, { filename: 'engine/mission-manager.js' });

const node = { ...fixture.node, isComplete: false };
const tree = {
  root: { isComplete: false },
  availableLeaves: () => [node],
  find: id => id === node.id ? node : null
};
const definition = {
  id: fixture.top1,
  allowsAutonomousHistoricalObservation: true,
  navigation: { autonomousUnknownTravel: true },
  mapGeneration: { size: 'random', biome: 'random', requiredObjects: [{ type: 'stele', count: 1 }] },
  runtimeCounters: [{ slot: 'steles', source: 'observations.historical', cuoType: 'stele' }]
};
const engine = {
  currentMapId: fixture.currentMapId,
  discoveredMaps: knownMaps,
  currentMap: { interactables: [] },
  findKnownRoute: routeFor,
  findOptimalRoute: routeFor,
  worldTopology: { coordinateOf: id => fixture.coordinates[id] }
};
const facts = new Map([
  [`missionReturnIntent:${fixture.top1}`, fixture.returnIntent]
]);
const manager = Object.create(BF.Missions.MissionManager.prototype);
Object.assign(manager, {
  primaryMissionId: fixture.top1,
  trees: new Map([[fixture.top1, tree]]),
  engine,
  memory: {
    state: { primaryMissionId: fixture.top1, missionLifecycle: fixture.lifecycle },
    getFact: (key, fallback = null) => facts.has(key) ? facts.get(key) : fallback,
    setFact: (key, value) => facts.set(key, value),
    save: () => {}
  },
  planner: { requiredMapState: () => ({ constrained: false }) },
  bridge: { context: () => ({ mapId: engine.currentMapId }) },
  definition: id => id === fixture.top1 ? definition : null,
  eventDrivenTravelForMission: () => null,
  missionRunnableAction: () => null,
  stepShelterRequirementFor: () => null
});
BF.currentEngine = engine;
engine.missionManager = manager;

assert.equal(manager.isPlayerSelectedPrimary(), false, 'the saved Top1 was selected automatically');
assert.equal(node.progress, fixture.expectedHistoricalCount);

const available = [{ node, state: { constrained: false } }];
assert.equal(manager.missionKnownDestinationTransition(fixture.top1, definition, available, engine.currentMapId), null,
  'the 7 already-observed physical steles must not resolve back to Crystal');

const transition = manager.missionTransitionFor(fixture.top1, { mapId: engine.currentMapId });
assert.equal(transition?.source, 'mission-map-generation',
  'the automatic Top1 must continue the explicitly permitted physical search');
assert.equal(transition?.node?.params?.missionDirectedUnknownTravel, true);
const plan = manager.missionUnknownTravelPlan(transition);
assert.ok(plan?.frontierMapId, 'an executable frontier must exist');
assert.notEqual(plan.frontierMapId, 'crystal', 'the mission must not route back to Crystal');

engine.currentMapId = 'crystal';
assert.equal(manager.missionHasKnownLocalDestination(fixture.top1, definition, available, 'crystal'), false,
  'Crystal has no unobserved known stele in the save');
assert.equal(manager.missionKnownDestinationTransition(fixture.top1, definition, available, 'crystal'), null,
  'arrival at Crystal must not restart a stale known-destination trip');

const searchMapId = 'generated-autoprimary-stele-search';
const instanceId = `${searchMapId}:population:stele:1`;
engine.currentMapId = searchMapId;
engine.currentMap = {
  interactables: [{
    position: { x: 1, z: 1 },
    userData: { active: true, instanceId, catalogId: 'RUI-STEL-L-001' }
  }]
};
engine.character = { root: { position: { x: 0, z: 0 } } };
engine.canInteractWith = () => true;
engine.interactionWorldPosition = object => object.position;
const physicalAction = manager.historicalObservationPhysicalAction(
  fixture.top1, tree, node, 1
);
assert.equal(physicalAction?.targetInstanceId, instanceId,
  'a BAC-selected Top1 must execute the physical observation on the newly generated map');

console.log(`PASS: autosave Top1 ${fixture.top1} at ${fixture.expectedHistoricalCount}/10 avoids Crystal ping-pong and observes a new physical stele autonomously`);
