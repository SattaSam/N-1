const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ROOT = process.env.BLUEFOX_ROOT || path.resolve(__dirname, '..');
process.env.BLUEFOX_ROOT = ROOT;
// Reuse the repository's exact runtime fixture, without executing its tests.
const fixtureSource = fs.readFileSync(path.join(ROOT, 'tests/mission-repair.runtime.test.js'), 'utf8');
const fixture = new Function('require', '__dirname',
  fixtureSource.slice(0, fixtureSource.indexOf("\ntest('")) + '\nreturn fixture;')(require, path.join(ROOT, 'tests'));

function known(f, type, mapId, instanceId, scene, persistent) {
  f.engine.discoveredMaps.add(mapId);
  f.BF.maps[mapId] ||= { id: mapId, exits: {} };
  const object = f.object(type);
  Object.assign(object.userData, { instanceId, ...(scene ? {
    microSceneId: scene, persistentMicroSceneId: persistent, microSceneObjectIndex: 0
  } : {}) });
  return f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED, object,
    { mapId, interactionSource: 'manual' });
}

async function runtimeFixture() {
  const f = fixture(), engine = f.engine, point = { x: 0, y: 0, z: 0, distanceTo: () => 0 };
  const listeners = new Map();
  f.window.addEventListener = (type, fn) => {
    const set = listeners.get(type) || new Set(); set.add(fn); listeners.set(type, set);
  };
  f.window.removeEventListener = (type, fn) => listeners.get(type)?.delete(fn);
  f.window.dispatchEvent = event => {
    f.events.push(event); for (const fn of [...(listeners.get(event.type) || [])]) fn(event); return true;
  };
  // The reused fixture initialized BibleRuntime before replacing its test bus.
  for (const [event, method] of [['bluefox:mission-state', 'boundMissionState'],
    ['bluefox:progression-changed', 'boundProgressionChanged'],
    ['bluefox:civilization-trade-completed', 'boundCivilizationTradeCompleted']]) {
    f.window.addEventListener(event, f.runtime[method]);
  }
  Object.assign(engine, {
    character: { root: { position: point }, target: point, stop() {}, setTarget() { return true; },
      facePoint() {}, cancelInteraction() {}, findAvailableClip() { return ''; }, actions: new Map(),
      play() {}, playInteraction() { return 0; } },
    resourceCooldowns: new WeakMap(), disposed: false, discoveredZones: new Set(),
    interactionValidationDistance: () => 2,
    interactionApproachPoint: object => ({ point: object.position || point, approachDistance: 1 }),
    showWorldMarker() {},
    targetInteraction(object) { this.pendingInteraction = object; this.interactionStartedAt = 0; this.interactionApproachStartedAt = 100; return true; },
    updateInteraction() {}, postActionRecoveryUntil: 0, lastAutonomyAt: 0, lastActivityAt: 0,
    autonomyActionStreak: 0, autonomyBreakTarget: 3, completedInteractions: 0,
    callbacks: { onAction() {}, onStatus() {}, onCollect() {}, onSpeak() {} }
  });
  // Stub geometry/movement only; execute native manager, ObjectM0 and events.
  f.BF.mount = async ({ engine }) => engine;
  f.BF.installObjectM0Bridge(); await f.BF.mount({ engine });
  f.load('engine/mission-catalog.js');
  f.manager = f.M.MissionManager.create({ engine, memory: f.memory, planner: f.planner });
  engine.missionManager = f.manager;
  f.BF.getSurvivalState = () => ({ energy: 100, food: 100, needs: {} });
  f.BF.getMapExplorationState = () => ({ surfacePercent: 0 });
  f.BF.getExplorationSummary = () => ({ maps: {} });
  f.memory.state.missionLifecycle.T13 = { status: 'completed' };
  f.runtime.start();
  return f;
}

test('runnability: another available leaf wins when the planner winner has no physical target', () => {
  const f = fixture(), tree = f.activate('T06');
  f.engine.currentMap.interactables = [f.object('magnetic_ore')];
  assert.equal(f.manager.missionRunnableAction(tree.id, tree, f.manager.bridge.context())?.nodeId, 'T06:mineral');
});

test('known routing: a generic subject retains the canonical object contract', () => {
  const f = fixture(); known(f, 'fern', 'known-flora', 'known-fern');
  const tree = f.activate('SUR-03'); f.manager.tree = tree; f.manager.primaryMissionId = tree.id;
  assert.equal(f.manager.missionTransitionFor(tree.id, f.manager.bridge.context())?.node.params.toMapId, 'known-flora');
});

test('known routing: credited local instances cannot mask an uncredited remote instance', () => {
  const f = fixture(); known(f, 'stele', 'next-site', 'stele-remote');
  const tree = f.activate('ARCH-03'), local = f.object('stele'); local.userData.instanceId = 'stele-local';
  f.engine.currentMap.interactables = [local];
  f.manager.consumeObjectEvent(known(f, 'stele', 'crystal', 'stele-local'));
  const transition = f.manager.missionTransitionFor(tree.id, f.manager.bridge.context());
  assert.equal(transition?.source, 'mission-known-destination');
  assert.equal(transition?.node.params.toMapId, 'next-site');
});

test('known routing: a return keeps its required original persistent site after interruption', () => {
  const f = fixture();
  for (const file of ['data/custom-micro-scenes.js', 'data/custom-micro-scenes-remarkable-r2.js', 'engine/micro-scenes.js']) f.load(file);
  const scene = 'MSC-CUSTOM-WALL-RUIN-COLLAPSED';
  for (const [mapId, persistent] of [['reference', 'original'], ['wrong', 'other']]) {
    f.BF.maps[mapId] = { id: mapId, persistentMicroScenes: [{ microSceneId: scene, instanceId: persistent }] };
    known(f, 'wall', mapId, persistent + ':0', scene, persistent);
  }
  f.memory.setFact('annArchW02:site', { siteId: 'persistent:original', persistentMicroSceneId: 'original', microSceneId: scene, mapId: 'reference' });
  const tree = f.activate('ANN-ARCH-W04'); f.completeNode(tree.find('ANN-ARCH-W04:return')); tree.refresh();
  f.engine.currentMapId = 'wrong';
  assert.equal(f.manager.missionTransitionFor(tree.id, f.manager.bridge.context())?.node.params.toMapId, 'reference');
});

test('novelty remains map/instance history, separate from study-cycle distinct credits', () => {
  const f = fixture(), tree = f.activate('ARCH-03'), object = f.object('stele'), progress = [], novelty = [];
  for (const studyGeneration of [0, 0, 1]) {
    const event = f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED, object,
      { mapId: 'crystal', interactionSource: 'manual', studyGeneration });
    f.manager.consumeObjectEvent(event); progress.push(tree.find('ARCH-03:study').progress); novelty.push(event.firstLocalInteraction);
  }
  assert.deepEqual(progress, [1, 1, 2]); assert.deepEqual(novelty, [true, false, false]);
  const other = f.object('stele'); other.userData.instanceId = 'another-stele';
  assert.equal(f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.OBJECT_INSPECTED, other, { mapId: 'crystal' }).firstLocalInteraction, true);
});

for (const mode of ['same-instance', 'same-type', 'physical-confirmation', 'collected', 'incomplete-proof', 'wrong-type', 'wrong-map']) {
  test(`local resource confirmation: ${mode}`, async () => {
    const f = await runtimeFixture(); f.memory.setFact('localExplorationUnlocked:v1', true);
    const original = f.object('magnetic_ore'); original.userData.worldAnchor = original;
    f.engine.currentMap.interactables = [original];
    f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.OBJECT_INSPECTED, original, { mapId: 'crystal', interactionSource: 'manual' });
    const id = 'LOC-11@crystal', tree = f.manager.trees.get(id); assert(tree);
    if (mode === 'physical-confirmation') {
      const action = f.manager.missionRunnableAction(id, tree, f.manager.bridge.context()); assert(action);
      assert.equal(f.manager.bridge.execute(action, 10000), true);
      assert.equal(f.engine.pendingInteraction, original);
      assert.equal(action.__missionEvidenceCompletion, undefined, 'present resource gets a second physical observation');
      return;
    }
    if (mode === 'collected') {
      f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.RESOURCE_COLLECTED, original, { mapId: 'crystal', interactionSource: 'manual' });
      f.engine.currentMap.interactables = [];
      const action = f.manager.missionRunnableAction(id, tree, f.manager.bridge.context()); assert(action);
      const before = f.BF.ObjectEvents.history().length;
      assert.equal(f.manager.bridge.execute(action, 10000), true);
      assert.equal(action.__missionEvidenceCompletion.narrativeEvidence, true);
      assert.equal(f.BF.ObjectEvents.history().length, before, 'no fabricated physical observation');
      return;
    }
    if (mode === 'incomplete-proof') {
      const node = tree.findSequenceSlot('observe');
      node.historyValues = node.historyValues.map(value => { const proof = JSON.parse(value); delete proof.evidence.objectId; return JSON.stringify(proof); });
      const action = f.manager.missionRunnableAction(id, tree, f.manager.bridge.context()); assert(action);
      assert.equal(f.manager.bridge.execute(action, 10000), true);
      assert.equal(f.engine.pendingInteraction, original, 'missing inferred evidence retains physical fallback');
      return;
    }
    const second = mode === 'same-instance' ? original : f.object(mode === 'wrong-type' ? 'fern' : 'magnetic_ore');
    if (second !== original) second.userData.instanceId = 'second-instance';
    f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.OBJECT_INSPECTED, second,
      { mapId: mode === 'wrong-map' ? 'other-map' : 'crystal', interactionSource: 'manual' });
    assert.equal(tree.root.isComplete, !['wrong-map', 'wrong-type'].includes(mode));
  });
}

test('NPC reactions cannot credit flora/mineral studies or finish a newly offered observation service', async () => {
  const f = await runtimeFixture(); f.manager.startMission('T06', { primary: true });
  const controller = f.manager.catalogController; controller.setRelation('translucent', 'friendly', { acceptedMissions: 2 });
  const npc = f.object('npc_translucent'), mineral = f.object('magnetic_ore');
  for (let i = 0; i < 4; i++) f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.OBJECT_INSPECTED, mineral, { mapId: 'crystal' });
  controller.offerService({ instanceId: npc.userData.instanceId, detail: { cuoType: 'npc_translucent' } }, 'translucent');
  const service = f.manager.trees.get('NPC-SERVICE-OBSERVE@translucent'); assert(service);
  assert.equal(service.root.isComplete, false, 'historical studies are not a service backfill');
  for (const reaction of ['calm', 'flee']) f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.NPC_REACTION, npc,
    { mapId: 'crystal', civilizationId: 'translucent', reaction });
  assert.equal(service.root.isComplete, false);
  assert.equal(f.manager.trees.get('T06').find('T06:flora').progress, 0);
  f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.OBJECT_INSPECTED, f.object('magnetic_ore'), { mapId: 'crystal', subject: 'mineral' });
  assert.equal(service.root.isComplete, true, 'new real mineral study remains admissible');
});

test('generic analyses reject NPC reactions while explicit reaction contracts retain their credit', () => {
  const f = fixture(), ids = ['GAME-research_initial', 'GAME-research_hypothesis', 'GAME-special_investigator', 'GAME-engineering_4'];
  for (const id of ids) f.activate(id);
  const reactionTree = f.activate('ARCH-36'), npc = f.object('npc_rocky');
  const event = f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.NPC_REACTION, npc,
    { mapId: 'crystal', civilizationId: 'rocky', reaction: 'calm' });
  f.manager.consumeObjectEvent(event);
  for (const id of ids) assert.equal(f.manager.trees.get(id).availableLeaves()[0].progress, 0, id);
  assert.equal(reactionTree.find('ARCH-36:reaction').progress, 1);
  const physical = f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.OBJECT_ANALYZED, f.object('magnetic_ore'), { mapId: 'crystal' });
  f.manager.consumeObjectEvent(physical);
  assert.equal(f.manager.trees.get('GAME-research_initial').findSequenceSlot('analysisStart').progress, 1);
});

test('hub projects paused scoped missions and saved weighted progress without loading their trees', () => {
  const f = fixture();
  for (const id of ['LOC-17@crystal', 'GEO-02']) {
    const tree = f.activate(id); tree.availableLeaves()[0].incrementDistinct('first-credit', 1); tree.refresh();
    const expected = f.manager.treeProgress(tree); f.memory.saveTree(tree);
    f.memory.state.missionLifecycle[id].status = 'paused'; f.manager.trees.delete(id);
    const entry = f.manager.getState().catalog.find(candidate => candidate.missionId === id);
    assert(entry); assert.equal(entry.status, 'paused'); assert.equal(entry.progress, expected);
    assert.equal(f.manager.trees.has(id), false);
  }
});

test('narrative window exists during reentrant activation and keeps the first new contact', async () => {
  const f = await runtimeFixture(); f.runtime.worldEventReconciling = true;
  f.manager.startMission('GAME-contact_first', { primary: true });
  const baseline = f.memory.getFact('worldEventBaseline:GAME-contact_first', null);
  f.runtime.worldEventReconciling = false;
  assert(baseline, 'activation must not wait for the next world event');
  const npc = f.object('npc_rocky');
  f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.NPC_CONTACTED, npc,
    { mapId: 'crystal', civilizationId: 'rocky', interactionSource: 'manual' });
  assert.equal(f.manager.trees.get('GAME-contact_first').find('GAME-contact_first:rockyContact').progress, 1);
  assert.equal(f.memory.getFact('worldEventBaseline:GAME-contact_first').sequence, baseline.sequence);
});

test('service speech cannot close CONTACT narrative phases; mission speech can', async () => {
  for (const [id, slot] of [['CONTACT-06', 'contact'], ['CONTACT-07', 'indication'], ['CONTACT-12', 'study']]) {
    const f = await runtimeFixture(), mission = f.runtime.byId.get(id);
    f.memory.setFact(mission.npcEncounters[0].selectionFact, { civilizationId: 'rocky' });
    f.manager.startMission(id, { primary: true });
    const node = f.manager.trees.get(id).find(`${id}:${slot}`), npc = f.object('npc_rocky');
    f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.NPC_DIALOGUE, npc, { mapId: 'crystal', civilizationId: 'rocky', text: 'service fibres 5' });
    assert.equal(node.progress, 0);
    f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.NPC_DIALOGUE, npc, { mapId: 'crystal', civilizationId: 'rocky', missionId: id });
    assert.equal(node.progress, 1);
  }
});

test('native NPC speech carries per-call mission context without contaminating later generic speech', async () => {
  const f = await runtimeFixture(); f.window.requestAnimationFrame = () => 1;
  f.load('engine/npc-runtime.js');
  class Vector { constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
    clone() { return new Vector(this.x, this.y, this.z); } copy(value) { Object.assign(this, value); return this; }
    set(x, y, z) { Object.assign(this, { x, y, z }); return this; } }
  const root = f.object('npc_translucent');
  Object.assign(root, { position: new Vector(), rotation: new Vector(), scale: new Vector(1, 1, 1), parent: {}, visible: true, traverse() {}, dispatchEvent() {} });
  f.BF.NpcRuntime.register(root, 'npc_translucent');
  assert.equal(f.BF.NpcRuntime.speak(root, 'besoin eau', { missionId: 'DIP-01' }), true);
  assert.equal(f.BF.NpcRuntime.speak(root, 'service fibres'), true);
  const dialogues = f.BF.ObjectEvents.history().filter(event => event.type === 'NPC_DIALOGUE');
  assert.equal(dialogues.at(-2).detail.missionId, 'DIP-01'); assert.equal(dialogues.at(-1).detail.missionId || null, null);
});

test('DIP narrative accepts only its own dialogue after a new voluntary contact', async () => {
  const f = await runtimeFixture(); f.manager.startMission('DIP-01', { primary: true });
  const tree = f.manager.trees.get('DIP-01'), npc = f.object('npc_translucent');
  const emit = (type, detail = {}) => f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types[type], npc,
    { mapId: 'crystal', civilizationId: 'translucent', interactionSource: 'manual', ...detail });
  emit('NPC_DIALOGUE', { missionId: 'DIP-01' }); assert.equal(tree.find('DIP-01:translucentDialogue').progress, 0);
  emit('NPC_CONTACTED'); assert.equal(tree.find('DIP-01:translucentContact').progress, 1);
  emit('NPC_DIALOGUE'); assert.equal(tree.find('DIP-01:translucentDialogue').progress, 0);
  emit('NPC_DIALOGUE', { missionId: 'DIP-01' }); assert.equal(tree.find('DIP-01:translucentDialogue').progress, 1);
});

test('native manager/planner/ObjectM0/bridge interaction completes and acknowledges its owner', async () => {
  const f = await runtimeFixture(), id = 'TEST-OWNER-INTEGRITY';
  f.BF.registerMissionDefinitions([{ id, title: 'Physical owner control', priority: 1000,
    root: { id: `${id}:root`, type: 'group', children: [
      { id: `${id}:study`, title: 'Study flora', type: 'observe', target: 1, params: { subject: 'flora', cuoType: 'fern' } }
    ] } }]);
  f.manager.startMission(id, { primary: true, source: 'player' });
  f.manager.setPrimaryMission(id, true, 'player control'); f.manager.activeMissionIds = [id];
  const object = f.object('fern'); object.userData.worldAnchor = object;
  f.engine.currentMap.interactables = [object];
  assert.equal(f.manager.update(10000), true);
  assert.equal(f.engine.pendingInteraction, object); assert.equal(f.manager.currentAction?.missionId, id);
  f.engine.updateInteraction(10000); f.engine.updateInteraction(35000);
  assert.equal(f.manager.trees.get(id).root.isComplete, true);
  assert.equal(f.memory.state.missionLifecycle[id].status, 'completed');
  assert.equal(f.manager.currentAction, null);
});

test('an old speechShown receipt cannot permanently hide an uncredited narrative dialogue', async () => {
  const f = await runtimeFixture(); f.manager.startMission('DIP-01', { primary: true });
  const contact = f.object('npc_translucent');
  f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.NPC_CONTACTED, contact,
    { mapId: 'crystal', civilizationId: 'translucent', interactionSource: 'manual' });
  f.window.requestAnimationFrame = () => 1; f.load('engine/npc-runtime.js');
  class Vector { constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
    clone() { return new Vector(this.x, this.y, this.z); } copy(value) { Object.assign(this, value); return this; }
    set(x, y, z) { Object.assign(this, { x, y, z }); return this; } }
  const root = f.object('npc_translucent');
  Object.assign(root, { position: new Vector(), rotation: new Vector(), scale: new Vector(1, 1, 1), parent: {}, visible: true, traverse() {}, dispatchEvent() {} });
  f.BF.NpcRuntime.register(root, 'npc_translucent');
  const mission = f.runtime.byId.get('DIP-01'), entry = mission.npcEncounters.find(item => item.cuoType === 'npc_translucent');
  f.memory.setFact(f.runtime.npcEncounterFactKey(mission.id, entry), { speechShown: true });
  const node = f.manager.trees.get(mission.id).find('DIP-01:translucentDialogue'); assert.equal(node.progress, 0);
  f.runtime.reviewNpcEncounters(); assert.equal(node.progress, 1);
  const count = f.BF.ObjectEvents.history().filter(event => event.type === 'NPC_DIALOGUE').length;
  f.runtime.reviewNpcEncounters();
  assert.equal(f.BF.ObjectEvents.history().filter(event => event.type === 'NPC_DIALOGUE').length, count);
});

test('friendly villages use native free topology, preserve occupied exits and remain idempotent', async () => {
  const f = await runtimeFixture();
  f.load('data/custom-maps.js'); f.load('data/civilization-cities.js');
  f.BF.buildMap = () => ({ group: {}, interactables: [], colliders: [] }); f.load('engine/custom-map-registry.js');
  f.BF.maps.crystal ||= { id: 'crystal', exits: {} };
  // Expose the existing class in the VM only, without replacing its algorithms.
  const topologySource = fs.readFileSync(path.join(ROOT, 'engine/world-topology-v3.js'), 'utf8')
    .replace('  const originalMount = BF.mount.bind(BF);', '  BF.__testTopology = CoordinateTopology;\n  const originalMount = BF.mount.bind(BF);');
  vm.runInContext(topologySource, f.context);
  f.engine.worldTopology = new f.BF.__testTopology(f.engine);
  f.load('engine/persistent-micro-scenes-v20.js');
  const topology = f.engine.worldTopology;
  for (const [direction, x, y] of [['north', 0, -1], ['east', 1, 0], ['south', 0, 1], ['west', -1, 0]]) {
    const id = `occupied-${direction}`; f.BF.maps[id] = { id, exits: {} };
    assert.equal(topology.place(id, x, y, 'test'), true);
    assert.equal(topology.setCanonicalLink('crystal', direction, id), true);
    f.engine.discoveredMaps.add(id);
  }
  const exits = JSON.stringify(f.BF.maps.crystal.exits), before = JSON.stringify(topology.coordinates || {});
  f.manager.startMission('CONTACT-09', { primary: true });
  assert.equal(f.runtime.reconcileWorldTopologyLinks(), false, 'no village before friendship');
  f.manager.catalogController.setRelation('rocky', 'friendly');
  f.runtime.reconcileWorldTopologyLinks();
  const rocky = f.memory.getFact('civilization:rocky-village', null); assert(rocky);
  assert.equal(f.memory.getFact('civilization:translucent-village', null), null);
  f.manager.catalogController.setRelation('translucent', 'friendly');
  f.runtime.reconcileWorldTopologyLinks();
  assert(f.memory.getFact('civilization:translucent-village', null));
  assert.equal(JSON.stringify(f.BF.maps.crystal.exits), exits, 'saturated origin never overwritten');
  assert.equal(f.engine.discoveredMaps.has(rocky.mapId), false, 'linking does not fabricate a visit');
  let routeReads = 0;
  const originalRoute = f.engine.findKnownRoute;
  f.engine.findKnownRoute = function (...args) { routeReads += 1; return originalRoute.apply(this, args); };
  assert.equal(f.runtime.reconcileWorldTopologyLinks(), false, 'no repeated topology write');
  assert.equal(routeReads, 0, 'a valid link receipt avoids rescanning world routes');
  f.manager.startMission('DIP-01', { primary: true });
  assert(f.runtime.missionPlayerActionDestinations('DIP-01').some(entry => entry.mapId === rocky.mapId),
    'the indicated unvisited village is offered for a player contact');
  f.engine.findKnownRoute = function (from, to) {
    return this.discoveredMaps.has(to) ? originalRoute.call(this, from, to) : null;
  };
  const suggestions = [];
  f.engine.handleNavigationSuggestion = detail => suggestions.push(detail);
  f.manager.shouldDeferPlayerActionReturn = () => false;
  assert.equal(f.manager.requestMissionPlayerActionReturn('DIP-01', rocky.mapId), true);
  const frontier = f.manager.missionUndiscoveredAdjacentTarget(rocky.mapId);
  assert.equal(suggestions.at(-1).mapId, frontier.frontierMapId);
  assert.equal(f.manager.pendingPlayerActionReturn().targetMapId, rocky.mapId);
  f.engine.currentMapId = frontier.frontierMapId;
  f.engine.persistentNavigationIntent = null;
  assert.equal(f.manager.playerActionReturnWork(), true);
  assert.equal(suggestions.at(-1).discoverUnknown, true);
  assert.equal(suggestions.at(-1).direction, frontier.direction);
  assert.equal(f.engine.discoveredMaps.has(rocky.mapId), false, 'guidance never fabricates arrival');
  assert(before);
});
