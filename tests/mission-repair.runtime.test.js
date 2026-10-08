const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ROOT = process.env.BLUEFOX_ROOT || path.resolve(__dirname, '..');

function fixture() {
  const seed = process.env.BLUEFOX_SAVE ? JSON.parse(fs.readFileSync(process.env.BLUEFOX_SAVE, 'utf8')).state : {};
  const store = new Map(Object.entries(seed)), events = [], timers = [];
  class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
  const window = { BlueFox3D: { maps: {} }, CustomEvent, performance, Date, JSON, Math, Set, Map, WeakMap,
    structuredClone, console: { log() {}, info() {}, warn() {}, error: console.error },
    addEventListener() {}, removeEventListener() {}, dispatchEvent(event) { events.push(event); },
    setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {}, setInterval() { return 1; },
    clearInterval() {}, queueMicrotask() {}, localStorage: {
      getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, String(value)),
      removeItem: key => store.delete(key)
    } };
  window.window = window;
  const context = vm.createContext(window);
  const load = file => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  for (const file of ['engine/mission-types.js', 'engine/mission-tree.js', 'engine/mission-memory.js',
    'engine/mission-planner.js', 'engine/mission-manager.js', 'engine/object-event-registry.js',
    'engine/object-library.js', 'engine/progression-registry.js', 'engine/progression-multisystem.js',
    'data/bible-patterns.js', 'data/bible-catalog.js', 'engine/bible-contract-v0-1.js',
    'engine/bible-runtime-v0-1-unified.js']) load(file);
  const BF = window.BlueFox3D, M = BF.Missions, runtime = BF.bibleRuntime;
  const manager = Object.create(M.MissionManager.prototype);
  const memory = new M.MissionMemory(), planner = new M.MissionPlanner(memory);
  Object.assign(manager, { memory, planner, trees: new Map(), activeMissionIds: [...memory.state.activeMissionIds],
    primaryMissionId: memory.state.primaryMissionId, activeMissionId: memory.state.activeMissionId,
    enabled: true, executionRecovery: new Map(), targetProbeDiagnostics: new Map(), currentAction: null,
    selectionReason: 'test', pendingPrimaryMissionId: null, pendingPauseMissionId: null, retryAfter: 0,
    lastPriorityReviewAt: 0, catalogController: null,
    bridge: { context: () => ({ mapId: BF.currentEngine.currentMapId, resources: {}, canRoutine: true, needs: {}, energy: 80 }) }
  });
  for (const id of Object.keys(memory.state.missions)) if (M.getDefinition(id)) manager.trees.set(id, planner.restoreOrCreate(id));
  manager.tree = manager.trees.get(manager.primaryMissionId);
  const point = { x: 0, y: 0, z: 0, distanceTo: () => 0 };
  const engine = { missionManager: manager, currentMapId: 'crystal', currentMap: { interactables: [], group: { userData: { microScenes: [] } } },
    character: { root: { position: point } }, interactionWorldPosition: object => object.position || point,
    findKnownRoute: (a, b) => [a, b], callbacks: { onAction() {}, onStatus() {} },
    discoveredMaps: new Set(['crystal']), pendingInteraction: null };
  manager.engine = engine; BF.currentEngine = engine; BF.getAutonomyMode = () => 'full';
  load('engine/action-bridge.js');
  load('engine/object-m0-bridge.js');
  const activate = id => {
    const tree = planner.restoreOrCreate(id);
    assert(tree, id); manager.trees.set(id, tree);
    memory.state.missionLifecycle[id] = { status: 'active', activatedAt: 1 };
    if (!manager.activeMissionIds.includes(id)) manager.activeMissionIds.push(id);
    return tree;
  };
  const object = type => {
    const definition = BF.ObjectLibrary.list({ status: 'active' }).find(entry => entry.type === type);
    assert(definition, type);
    return { userData: { active: true, functional: definition, instanceId: `test:${type}` }, position: point };
  };
  const completeNode = node => { node.progress = node.target; node.status = M.MissionStatus.COMPLETED; node.completedAt = 10; };
  return { BF, M, runtime, manager, memory, planner, engine, load, events, activate, object, completeNode, window, context, store };
}

function established(f, id, kind, stage) {
  const site = { id: `crystal:${kind}:primary`, kind, stage, mapId: 'crystal', missionId: id,
    anchor: { x: 1, y: 0, z: 2 }, establishedAt: 100, microSceneId: 'test' };
  f.memory.state.siteProgression.crystal = { mapId: 'crystal', sites: { [kind]: site } };
  f.memory.state.effectReceipts[`${id}:completion:v1`] = { id: `${id}:completion:v1`, missionId: id,
    siteId: site.id, at: 100, inventoryBypassed: false, source: 'autonomy' };
  return site;
}

function knownObject(f, mapId, type) {
  const definition = f.object(type).userData.functional;
  f.engine.discoveredMaps.add(mapId); f.BF.maps[mapId] = { id: mapId, name: `Nom ${mapId}` };
  const previous = f.BF.getMapProgressionIndicators;
  f.BF.getMapProgressionIndicators = id => id === mapId
    ? { uniqueObjects: { [definition.id]: { family: definition.knowledge?.family } } }
    : previous?.(id);
}

test('catalogue strict valide après correction', () => { const f = fixture(); assert.equal(f.runtime.validate().ok, true); });
test('LOC-17 restaure la même identité et ne remet aucune progression à zéro', () => {
  const f = fixture(), tree = f.activate('LOC-17@crystal'), node = tree.availableLeaves()[0];
  assert.equal(tree.id, 'LOC-17@crystal'); assert.equal(node.id, 'LOC-17:study@crystal');
  assert.equal(node.params.category, 'phenomena'); assert.equal(node.params.mapId, undefined);
  assert.equal(node.progress, 0);
});
test('LOCAL précède le voyage, les trois phénomènes canoniques sont runnable', () => {
  for (const type of ['fog_bank', 'electrostatic_storm', 'mobile_islet']) {
    const f = fixture(), tree = f.activate('LOC-17@crystal'); f.engine.currentMap.interactables = [f.object(type)];
    assert(f.manager.missionRunnableAction(tree.id, tree, f.manager.bridge.context()));
    assert.equal(f.manager.missionTransitionFor(tree.id, f.manager.bridge.context()), null);
  }
});
test('KNOWN précède UNKNOWN pour LOC-17, avec un vrai contrat ObjectM0', () => {
  const f = fixture(), tree = f.activate('LOC-17@crystal'); knownObject(f, 'phenomenon-map', 'fog_bank');
  const transition = f.manager.missionTransitionFor(tree.id, f.manager.bridge.context());
  assert.equal(transition.source, 'mission-known-destination'); assert.equal(transition.node.params.toMapId, 'phenomenon-map');
});
test('sans cible connue LOC-17 prescrit un phénomène existant sans perdre le scope', () => {
  const f = fixture(), tree = f.activate('LOC-17@crystal');
  f.manager.primaryMissionId = tree.id; f.manager.activeMissionId = tree.id; f.manager.tree = tree;
  assert.equal(f.manager.missionTransitionFor(tree.id, f.manager.bridge.context()).source, 'mission-map-generation');
  f.load('engine/bible-map-prescription-v19.js');
  const prescription = f.BF.resolveBibleMapGenerationPrescription();
  assert.equal(prescription.missionId, tree.id); assert.equal(prescription.requiredObjects[0].type, 'fog_bank');
});
test('LOC-17 reste active et progresse sur la destination distante, sans créer une autre instance', () => {
  const f = fixture(), tree = f.activate('LOC-17@crystal'); f.engine.currentMapId = 'phenomenon-map';
  assert.equal(f.manager.isMissionVisibleOnCurrentMap(tree.id), true);
  f.runtime.pauseOffMapLocalExploration('phenomenon-map');
  assert.equal(f.memory.state.missionLifecycle[tree.id].status, 'active');
  const obj = f.object('fog_bank'), def = obj.userData.functional;
  f.manager.consumeObjectEvent({ id: 'test-phen', type: f.BF.ObjectEvents.types.PHENOMENON_OBSERVED,
    objectId: def.id, instanceId: obj.userData.instanceId, mapId: 'phenomenon-map', category: def.category,
    family: def.knowledge?.family, tags: def.spawn?.tags || [], detail: { interactionSource: 'mission' } });
  assert.equal(tree.root.isComplete, true); assert.equal(f.memory.state.missionLifecycle[tree.id].status, 'completed');
});
test('les autres missions locales restent contraintes à leur map', () => {
  const f = fixture(); const definition = f.M.getDefinition('LOC-16@crystal');
  assert.equal(definition.root.children[0].params.mapId, 'crystal');
  f.engine.currentMapId = 'ailleurs'; assert.equal(f.manager.isMissionVisibleOnCurrentMap(definition.id), false);
});
test('la correction catégorie/tags est générique pour GAME-flora', () => {
  const f = fixture(), tree = f.activate('GAME-flora'); knownObject(f, 'flora-map', 'fluorescent_vegetation');
  const node = tree.availableLeaves().find(node => node.type === 'observe');
  const criteria = f.manager.missionNodeKnownDestinationCriteria(node, tree);
  assert.equal(criteria.sourceNodeId, node.id);
  assert(f.manager.knownDestinationCandidates({ missionId: tree.id }, criteria).some(entry => entry.mapId === 'flora-map'));
});
test('Camp/Refuge/Base déjà terminés restent terminés malgré un gate absent', () => {
  const f = fixture(); for (const id of ['T03', 'GAME-shelter', 'GAME-base']) {
    const tree = f.activate(id); tree.root.walk(node => { if (node.isLeaf) f.completeNode(node); }); tree.refresh();
    f.memory.state.missionLifecycle[id] = { status: 'completed', completedAt: 123 };
  }
  f.BF.bibleRuntime.completionGateState = () => ({ managed: true, canFinalize: false });
  f.manager.syncLifecycleFromTrees();
  for (const id of ['T03', 'GAME-shelter', 'GAME-base']) {
    assert.equal(f.memory.state.missionLifecycle[id].status, 'completed');
    assert.equal(f.memory.state.missionLifecycle[id].completedAt, 123);
    assert.equal(f.manager.activeMissionIds.includes(id), false);
  }
});
test('Refuge remplacé par Base : reçu historique valide, aucune progression rejouée', () => {
  const f = fixture(), tree = f.activate('GAME-shelter'); tree.root.walk(node => { if (node.isLeaf) f.completeNode(node); }); tree.refresh();
  established(f, 'GAME-base', 'base', 3);
  f.memory.state.effectReceipts['GAME-shelter:completion:v1'] = { missionId: 'GAME-shelter', siteId: 'crystal:refuge:primary', at: 50 };
  const before = JSON.stringify(tree.toJSON());
  assert.equal(f.runtime.canFinalizeMission(tree.id), true); f.manager.syncLifecycleFromTrees();
  assert.equal(f.memory.state.missionLifecycle[tree.id].status, 'completed'); assert.equal(JSON.stringify(tree.toJSON()), before);
});
test('Base : ressources réellement consommées restent engagées après reload', () => {
  const f = fixture(), tree = f.activate('GAME-base'); established(f, tree.id, 'base', 3);
  const rock = tree.find('GAME-base:rockStudy'); assert(rock); f.completeNode(rock); tree.refresh();
  f.BF.progression.availableInventory = () => 0;
  assert.equal(f.runtime.reconcileStockBackedMission(f.runtime.byId.get(tree.id)), true);
  assert.equal(tree.find('GAME-base:fibers').progress, 500); assert.equal(tree.find('GAME-base:minerals').progress, 500);
  assert.equal(f.memory.state.missionLifecycle[tree.id].status, 'completed');
});
test('un reçu sans site ou un contournement inventaire ne fabrique pas de stock engagé', () => {
  for (const bypass of [false, true]) {
    const f = fixture(), tree = f.activate('GAME-base'); established(f, tree.id, 'base', 3);
    f.memory.state.effectReceipts['GAME-base:completion:v1'].inventoryBypassed = bypass;
    if (!bypass) f.memory.state.siteProgression = {};
    f.BF.progression.availableInventory = () => 0; f.runtime.reconcileStockBackedMission(f.runtime.byId.get(tree.id));
    assert.equal(tree.find('GAME-base:fibers').progress, 0);
  }
});
test('relecture stock interdite pendant la transaction de consommation', () => {
  const f = fixture(), tree = f.activate('GAME-base'); const node = tree.find('GAME-base:fibers'); f.completeNode(node);
  f.runtime.applyingEffectIds = new Set([tree.id]); f.BF.progression.availableInventory = () => 0;
  assert.equal(f.runtime.reconcileStockBackedMission(f.runtime.byId.get(tree.id)), false); assert.equal(node.progress, 500);
});
test('Research Blueprint ouvre le placement sans créer définition, arbre ou lifecycle', () => {
  for (const kind of ['camp', 'refuge', 'base', 'workbench']) {
    const f = fixture(); f.memory.state.siteProgression = {}; f.BF.progression.availableInventory = () => 10000;
    if (kind === 'refuge') established(f, 'T03', 'camp', 1);
    if (kind === 'base') established(f, 'GAME-shelter', 'refuge', 2);
    if (kind === 'workbench') established(f, 'GAME-base', 'base', 3);
    f.memory.state.researchUnlocks[({ camp: 'camp-establish-v1', refuge: 'refuge-build-v1', base: 'base-build-v1', workbench: 'workbench-build-v1' })[kind]] = { unlockedAt: 1 };
    const definitions = Object.keys(f.M.definitions).length, trees = f.manager.trees.size;
    const lifecycle = JSON.stringify(f.memory.state.missionLifecycle), instances = JSON.stringify(f.runtime.state.constructionInstances);
    let placement; f.runtime.beginMicroScenePlacement = spec => { placement = spec; return true; };
    assert.equal(f.runtime.startConstruction(kind, { mapId: 'crystal', source: 'player' }), true); assert(placement);
    assert.equal(Object.keys(f.M.definitions).length, definitions); assert.equal(f.manager.trees.size, trees);
    assert.equal(JSON.stringify(f.memory.state.missionLifecycle), lifecycle); assert.equal(JSON.stringify(f.runtime.state.constructionInstances), instances);
  }
});
test('Blueprint bloqué sans matériaux ; revalidation à la confirmation', () => {
  const f = fixture(); f.memory.state.siteProgression = {}; f.memory.state.researchUnlocks['camp-establish-v1'] = { unlockedAt: 1 };
  f.BF.progression.availableInventory = () => 0; assert.equal(f.runtime.startConstruction('camp', { mapId: 'crystal' }), false);
  let placement; f.BF.progression.availableInventory = () => 100; f.runtime.beginMicroScenePlacement = spec => { placement = spec; return true; };
  assert.equal(f.runtime.startConstruction('camp', { mapId: 'crystal' }), true);
  f.BF.progression.availableInventory = () => 0;
  assert.equal(placement.onInstall({ anchor: { x: 1, z: 1 } }, Symbol()), false);
});
test('ANN-ARCH-W01 se révèle sur une revisite physique après les prérequis', () => {
  const f = fixture(); f.memory.state.missionLifecycle.T13 = { status: 'completed' };
  f.memory.state.missionLifecycle['GAME-archaeology_2'] = { status: 'completed' };
  const wall = f.runtime.byId.get('ANN-ARCH-W01');
  for (const id of wall.prerequisites || []) f.memory.state.missionLifecycle[id] = { status: 'completed' };
  delete f.memory.state.missionLifecycle[wall.id]; f.runtime.catalog = [wall];
  const result = f.runtime.consumeTriggerEvent({ type: 'exploration.map_discovered', mapId: 'wall-map',
    featuredMicroSceneIds: ['MSC-CUSTOM-WALL-RUIN-STRAIGHT'], amount: 1 }, { physicalOpportunitiesOnly: true });
  assert.equal(result.activatedMissionId, wall.id);
});
test('une revisite sans MSC et le tutoriel ne révèlent pas W01', () => {
  for (const tutorial of [true, false]) {
    const f = fixture(), wall = f.runtime.byId.get('ANN-ARCH-W01'); f.runtime.catalog = [wall];
    delete f.memory.state.missionLifecycle[wall.id];
    for (const id of wall.prerequisites || []) f.memory.state.missionLifecycle[id] = { status: 'completed' };
    f.memory.state.missionLifecycle.T13 = { status: tutorial ? 'active' : 'completed' };
    const result = f.runtime.consumeTriggerEvent({ type: 'exploration.map_discovered', mapId: 'wall-map',
      featuredMicroSceneIds: tutorial ? ['MSC-CUSTOM-WALL-RUIN-STRAIGHT'] : [], amount: 1 }, { physicalOpportunitiesOnly: true });
    assert.equal(result.activatedMissionId, null);
  }
});
test('une observation déjà connue ne clone ni ne publie le protocole monde', () => {
  const f = fixture(), coverage = { maps: { crystal: { frozen: true, observableEntityIds: ['entity'], observedEntityIds: ['entity'],
    envFamilies: { PLANT: { eligibleInstanceIds: ['instance'], observedInstanceIds: ['instance'] } } } } };
  f.memory.setFact(f.runtime.observationMemoryKey(), coverage);
  f.runtime.captureObservationMap = () => false;
  f.runtime.buildObservationResolver = () => ({ byInstance: new Map([['instance', 'entity']]), envEligible: { PLANT: ['instance'] } });
  const before = f.memory.getFact(f.runtime.observationMemoryKey()), events = f.events.length;
  let copies = 0; before.toJSON = () => { copies += 1; return { maps: before.maps }; };
  assert.equal(f.runtime.recordObservation({ type: 'OBJECT_SEEN', mapId: 'crystal', instanceId: 'instance' }), false);
  assert.equal(f.memory.getFact(f.runtime.observationMemoryKey()), before); assert.equal(f.events.length, events);
  assert.equal(copies, 0, "aucune sérialisation/copie du protocole monde pour un doublon");
});
test('une nouvelle observation conserve les compteurs ENV et le fan-out de publication', () => {
  const f = fixture(), coverage = { maps: { crystal: { frozen: true, observableEntityIds: ['entity'], observedEntityIds: [],
    envFamilies: { PLANT: { eligibleInstanceIds: ['instance'], observedInstanceIds: [] } } } } };
  f.memory.setFact(f.runtime.observationMemoryKey(), coverage); f.runtime.captureObservationMap = () => false;
  f.runtime.buildObservationResolver = () => ({ byInstance: new Map([['instance', 'entity']]), envEligible: { PLANT: ['instance'] } });
  assert.equal(f.runtime.recordObservation({ type: 'OBJECT_SEEN', mapId: 'crystal', instanceId: 'instance' }), true);
  const next = f.memory.getFact(f.runtime.observationMemoryKey());
  assert(next.maps.crystal.observedEntityIds.includes('entity')); assert(next.maps.crystal.envFamilies.PLANT.observedInstanceIds.includes('instance'));
  assert(f.events.some(event => event.type === 'bluefox:observation-coverage-changed'));
});

test('une mission non répétable terminée ne peut être réactivée ni choisie en primaire', () => {
  const f = fixture(); f.activate('GAME-base'); f.memory.state.missionLifecycle['GAME-base'] = { status: 'completed', completedAt: 123 };
  assert.equal(f.manager.startMission('GAME-base'), false); assert.equal(f.manager.activateMission('GAME-base'), false);
  assert.equal(f.manager.setPrimaryMission('GAME-base'), false); assert.equal(f.memory.state.missionLifecycle['GAME-base'].completedAt, 123);
});
test('Top 1 sans cible laisse la main à une Top 2 physiquement runnable', () => {
  const f = fixture(); f.BF.registerMissionDefinitions([
    { id: 'TEST-BLOCKED', priority: 500, root: { id: 'blocked-root', type: 'group', children: [{ id: 'blocked', type: 'observe', target: 1, params: { cuoType: 'thermosap_moss', requiredMapFact: 'test:missing-map', requiredMapField: 'mapId' } }] } },
    { id: 'TEST-RUNNABLE', priority: 250, root: { id: 'runnable-root', type: 'group', children: [{ id: 'runnable', type: 'observe', target: 1, params: { category: 'phenomena' } }] } }
  ]);
  const primary = f.activate('TEST-BLOCKED'); f.activate('TEST-RUNNABLE');
  f.manager.activeMissionIds = ['TEST-BLOCKED', 'TEST-RUNNABLE']; f.manager.primaryMissionId = primary.id;
  f.manager.activeMissionId = primary.id; f.manager.tree = primary;
  f.manager.prioritizedMissionIds = ['TEST-BLOCKED', 'TEST-RUNNABLE'];
  f.memory.state.prioritizedMissionIds = [...f.manager.prioritizedMissionIds];
  f.engine.currentMap.interactables = [f.object('fog_bank')];
  assert.equal(f.manager.chooseRunnableMissionAction(f.manager.bridge.context()).missionId, 'TEST-RUNNABLE');
  assert.equal(f.manager.primaryMissionId, primary.id);
  assert.equal(f.manager.hasPrimaryMissionAuthority(), false);
  assert.equal(f.manager.hasMissionExecutionAuthority(), true);
  const source = fs.readFileSync(path.join(ROOT, 'engine/world-engine.js'), 'utf8');
  // Exposer uniquement la classe privée au test ; ses méthodes restent exactes.
  vm.runInContext(source.replace('  BF.mount = async function mount(options)',
    '  BF.__TestWorldEngine = WorldEngine;\n  BF.mount = async function mount(options)'), f.context);
  const world = Object.assign(Object.create(f.BF.__TestWorldEngine.prototype), f.engine);
  let freeActions = 0;
  Object.assign(world, { autonomyAllowed: () => true, lastActivityAt: 0, lastAutonomyAt: 0,
    postActionRecoveryUntil: 0, autonomyActionStreak: 0, autonomyBreakTarget: Infinity,
    canInteractWith: () => true, targetInteraction: () => { freeActions += 1; },
    startRoutine: () => { freeActions += 1; } });
  world.character.cancelInteraction = () => { freeActions += 1; }; world.character.speed = 0;
  f.BF.getSurvivalState = () => ({ needs: { criticalRest: true } });
  world.ensureActivity(20000); world.updateAutonomy(20000);
  assert.equal(freeActions, 0, 'le monde ne lance aucune action libre quand Top2 détient une action physique');
  const phenomenon = f.activate('LOC-17@crystal'); f.engine.currentMap.interactables = [];
  f.manager.activeMissionIds = [primary.id, phenomenon.id];
  f.manager.prioritizedMissionIds = [primary.id, phenomenon.id];
  f.memory.state.prioritizedMissionIds = [...f.manager.prioritizedMissionIds];
  const work = f.manager.prioritizedMissionWork(f.manager.bridge.context());
  assert.equal(work.kind, 'travel'); assert.equal(work.missionId, phenomenon.id);
  assert.equal(f.manager.primaryMissionId, primary.id);
  world.ensureActivity(20000); world.updateAutonomy(20000);
  assert.equal(freeActions, 0, 'le voyage contractuel Top2 conserve aussi l’autorité');
  f.manager.activeMissionIds = []; f.manager.primaryMissionId = ''; f.manager.tree = null;
  world.currentMap.interactables = [f.object('fog_bank')];
  world.ensureActivity(20000); world.updateAutonomy(20000);
  assert(freeActions > 0, 'sans travail missionnel, l’autonomie libre reprend');
});
test('FAU-01 : le générateur naturel produit le nid après T13 et le bloque avant', () => {
  for (const unlocked of [false, true]) {
    const f = fixture(); f.store.delete('bluefox_generated_maps_v1');
    f.memory.state.missionLifecycle.T13 = { status: unlocked ? 'completed' : 'active' };
    for (const file of ['data/custom-micro-scenes.js', 'data/custom-micro-scenes-arch-r4.js',
      'data/custom-micro-scenes-opp.js', 'data/custom-micro-scenes-remarkable-r1.js', 'data/custom-micro-scenes-remarkable-r2.js',
      'engine/micro-scenes.js', 'engine/map-generation-rules.js']) f.load(file);
    const nest = f.BF.MicroScenes.get('MSC-CUSTOM-NID-DE-FAUNE5'); assert(nest);
    // Pool borné au site audité : même sélection/génération que le jeu, sans tirage statistique.
    f.BF.MicroScenes = { ...f.BF.MicroScenes, list: () => [nest] };
    f.BF.MapGenerationRules = { ...f.BF.MapGenerationRules, discoveryCadence: {
      ...f.BF.MapGenerationRules.discoveryCadence, remarkableSceneInterval: { min: 1, max: 1 }
    } };
    f.BF.maps = { template: { id: 'template', sceneUrl: 'fixture-scene', terrainUrls: ['fixture-terrain'], profile: 'forest' } };
    f.load('engine/map-generator.js');
    const map = f.BF.MapGenerator.generate({ planetSeed: 123, ordinal: 20, discoveryIndex: 20, direction: 'west', fromMapId: 'crystal' });
    assert.equal(map.generator.featuredMicroSceneIds.includes(nest.id), unlocked);
    assert.equal(f.memory.state.missionLifecycle['FAU-01']?.status, undefined);
  }
});
test('bouton de retour : nom canonique visible, choix multiples conservés', () => {
  const f = fixture();
  const source = fs.readFileSync(path.join(ROOT, 'engine/mission-ui-bridge.js'), 'utf8');
  const begin = source.indexOf('  function renderMissionReturnControls('), end = source.indexOf('  function missionHudLeafNodes(', begin);
  const makeElement = tag => ({ tag, children: [], listeners: {}, textContent: '', value: '',
    setAttribute() {}, appendChild(child) { this.children.push(child); }, append(...children) { this.children.push(...children); },
    addEventListener(type, fn) { this.listeners[type] = fn; } });
  const surface = vm.createContext({ BF: f.BF, document: { createElement: makeElement },
    missionReturnDestinations: () => destinations, createTextElement: (tag, cls, text) => Object.assign(makeElement(tag), { textContent: text }) });
  let destinations = [{ mapId: 'map-a', label: 'La Clairière des Lueurs' }];
  vm.runInContext(source.slice(begin, end), surface);
  let controls = surface.renderMissionReturnControls({ id: 'mission' });
  assert.equal(controls.children[0].textContent, 'Retourner vers La Clairière des Lueurs');
  destinations = [...destinations, { mapId: 'map-b', label: 'Le Vallon des Brumes' }];
  controls = surface.renderMissionReturnControls({ id: 'mission' });
  const select = controls.children[0], button = controls.children[1];
  assert.equal(select.children.length, 2); select.value = 'map-b'; select.listeners.change();
  assert.equal(button.textContent, 'Retourner vers Le Vallon des Brumes');
  let requested; f.BF.requestMissionPlayerActionReturn = (id, mapId) => { requested = mapId; return true; };
  button.listeners.click(); assert.equal(requested, 'map-b');
});

async function prescribedMap(f, missionId, direction = 'west') {
  f.store.delete('bluefox_generated_maps_v1');
  for (const file of ['data/custom-micro-scenes.js', 'data/custom-micro-scenes-arch-r4.js',
    'data/custom-micro-scenes-opp.js', 'data/custom-micro-scenes-remarkable-r1.js', 'data/custom-micro-scenes-remarkable-r2.js',
    'engine/micro-scenes.js', 'engine/map-generation-rules.js', 'engine/map-generator.js', 'engine/map-integrity-v20.js',
    'engine/map-generator-bible-overrides-v19.js']) f.load(file);
  f.BF.maps = { crystal: { id: 'crystal', exits: {} },
    template: { id: 'template', sceneUrl: 'fixture-scene', terrainUrls: ['fixture-terrain'], profile: 'forest' } };
  f.BF.mount = async () => f.engine;
  let generated;
  f.engine.generateUnknownPassage = async dir => {
    generated = f.BF.MapGenerator.generate({ planetSeed: 123, ordinal: 20, discoveryIndex: 20, direction: dir, fromMapId: 'crystal' });
    f.BF.maps.crystal.exits[dir] = { targetMap: generated.id }; return true;
  };
  f.load('engine/bible-map-prescription-v19.js'); await f.BF.mount({ engine: f.engine });
  assert.equal(await f.engine.generateUnknownPassage(direction, { bibleMissionId: missionId, source: 'mission' }), true);
  return generated;
}

function populate(f, map) {
  f.load('engine/biome-rules.js'); f.load('engine/object-spawner.js');
  f.BF.clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const spawner = Object.create(f.BF.ObjectSpawner.prototype), records = [];
  let seed = 123;
  Object.assign(spawner, { instances: [], microSceneInstances: [], random: () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; },
    spawnMicroScene: () => [], spawn(type, spec) {
      const definition = f.BF.ObjectLibrary.get(type);
      const root = { userData: { active: true, functional: definition, instanceId: spec.instanceId }, position: { ...spec.position }, scale: { multiplyScalar() {} }, traverse() {} };
      const record = { instance: { root, hitbox: root, colliders: [] } }; records.push(record); return record;
    } });
  const zones = f.BF.MapIntegrity.layouts[map.plateauCount].map(([x, z]) => ({ center: { x, z } }));
  const bounds = { minX: Math.min(...zones.map(r => r.center.x)) - 27, maxX: Math.max(...zones.map(r => r.center.x)) + 27,
    minZ: Math.min(...zones.map(r => r.center.z)) - 27, maxZ: Math.max(...zones.map(r => r.center.z)) + 27 };
  const interactables = [];
  spawner.populateMap({ definition: map, group: { userData: {} }, zoneRegions: zones, bounds, interactables });
  return { records, interactables };
}

test('LOC-17 : génération prescrite, persistance, population puis cible physique runnable', async () => {
  const f = fixture(), tree = f.activate('LOC-17@crystal');
  f.manager.primaryMissionId = tree.id; f.manager.activeMissionId = tree.id; f.manager.tree = tree;
  const map = await prescribedMap(f, tree.id);
  assert.equal(map.generator.bibleMissionId, tree.id); assert.equal(map.generator.requiredObjects[0].type, 'fog_bank');
  assert.equal(JSON.parse(f.store.get('bluefox_generated_maps_v1')).find(item => item.id === map.id).generator.requiredObjects[0].type, 'fog_bank');
  const population = populate(f, map);
  assert(population.interactables.some(root => root.userData.libraryType === 'fog_bank'));
  f.engine.currentMapId = map.id; f.engine.currentMap.interactables = population.interactables;
  const action = f.manager.missionRunnableAction(tree.id, tree, f.manager.bridge.context()); assert(action);
  let target; f.engine.targetInteraction = root => { target = root; return true; };
  const bridge = new f.M.ActionBridge(f.engine);
  assert.equal(bridge.execute(action, 1000), true); assert(target);
  const event = f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED, target,
    { mapId: map.id, interactionSource: "mission" });
  f.manager.consumeObjectEvent(event);
  assert.equal(tree.root.isComplete, true); assert.equal(f.memory.state.missionLifecycle[tree.id].status, 'completed');
});
test('ANN-02 : prescription existante génère 25 Thermosèves et permet le travail sur la map liée', async () => {
  const f = fixture(); f.memory.state.missionLifecycle.T13 = { status: 'completed' };
  f.memory.state.missionLifecycle['ANN-03'] = { status: 'completed' };
  delete f.memory.state.missionLifecycle['ANN-02']; f.manager.trees.delete('ANN-02');
  const map = await prescribedMap(f, 'ANN-02');
  assert.equal(f.memory.state.missionLifecycle['ANN-02']?.status, undefined, 'générer ne révèle pas la mission avant arrivée');
  const population = populate(f, map);
  assert(population.interactables.filter(root => root.userData.libraryType === 'thermosap_moss').length >= 25);
  f.engine.currentMapId = map.id; f.engine.currentMap.interactables = population.interactables;
  f.runtime.catalog = [f.runtime.byId.get('ANN-02')];
  const activation = f.runtime.consumeTriggerEvent({ type: 'exploration.map_discovered', isNew: true, direction: 'west', mapId: map.id, toMapId: map.id, amount: 1 });
  assert.equal(activation.activatedMissionId, 'ANN-02');
  const tree = f.manager.trees.get('ANN-02'); assert(tree);
  assert.equal(f.memory.getFact('bibleActivation:ANN-02').mapId, map.id);
  assert(f.manager.missionRunnableAction(tree.id, tree, f.manager.bridge.context()));
});

test('Blueprint : confirmation, consommation exactly-once, site réel et aucune mission créée', () => {
  const f = fixture(); f.manager.syncLifecycleFromTrees(); f.memory.state.siteProgression = {}; f.memory.state.researchUnlocks['camp-establish-v1'] = { unlockedAt: 1 };
  for (const file of ['data/custom-micro-scenes.js', 'engine/micro-scenes.js']) f.load(file);
  const stockBefore = f.BF.availableInventory('wood');
  f.BF.grantInventory('wood', 10);
  let placement;
  const token = Symbol('confirmation');
  f.runtime.beginMicroScenePlacement = spec => { placement = spec; f.runtime.activePlacement = { missionId: spec.missionId, confirmationToken: token }; return true; };
  f.runtime.renderSite = () => true; f.runtime.renderCurrentSite = () => true;
  assert.equal(f.runtime.startConstruction('camp', { mapId: 'crystal', source: 'player' }), true);
  const before = JSON.stringify(f.memory.state.missionLifecycle), count = f.manager.trees.size;
  assert.equal(placement.onInstall({ anchor: { x: 5, y: 0, z: 5 }, rotation: [0, 0, 0] }, token), true);
  assert.equal(f.BF.availableInventory('wood'), stockBefore); assert(f.runtime.siteBucket('crystal').camp);
  assert.equal(JSON.stringify(f.memory.state.missionLifecycle), before); assert.equal(f.manager.trees.size, count);
  assert.equal(placement.onInstall({ anchor: { x: 5, y: 0, z: 5 } }, token), false);
  assert.equal(f.BF.availableInventory('wood'), stockBefore);
});

test('sauvegarde fournie : réconciliation sans perdre une réussite ni rejouer le Refuge', { skip: !process.env.BLUEFOX_SAVE }, () => {
  const f = fixture();
  const completed = Object.entries(f.memory.state.missionLifecycle).filter(([, state]) => state.status === 'completed')
    .map(([id, state]) => [id, structuredClone(state)]);
  const originalTrees = new Map(completed.filter(([id]) => f.manager.trees.has(id)).map(([id]) => [id, JSON.stringify(f.manager.trees.get(id).toJSON())]));
  const refuge = JSON.stringify(f.manager.trees.get('GAME-shelter').toJSON());
  f.runtime.reconcileStockBackedMissions(); f.manager.syncLifecycleFromTrees();
  for (const [id, state] of completed) {
    assert.equal(f.memory.state.missionLifecycle[id].status, 'completed', id);
    assert.equal(f.memory.state.missionLifecycle[id].completedAt, state.completedAt, id);
    if (originalTrees.has(id)) assert.equal(JSON.stringify(f.manager.trees.get(id).toJSON()), originalTrees.get(id), id);
  }
  assert.equal(f.memory.state.missionLifecycle['GAME-shelter'].status, 'completed');
  assert.equal(f.memory.state.missionLifecycle['GAME-base'].status, 'completed');
  assert.equal(JSON.stringify(f.manager.trees.get('GAME-shelter').toJSON()), refuge);
  assert.equal(f.memory.state.missionLifecycle['DRN-01']?.status, undefined);
  assert.equal(f.memory.state.missionLifecycle['BAL-01']?.status, undefined);
});

test('fan-out réel : FAU-03 révèle FAU-04 et FAU-12 dans le même cycle', () => {
  const f = fixture(); f.memory.state.missionLifecycle.T13 = { status: 'completed' };
  f.memory.state.missionLifecycle['FAU-03'] = { status: 'completed' };
  for (const id of ['FAU-04', 'FAU-12']) { delete f.memory.state.missionLifecycle[id]; f.manager.trees.delete(id); }
  f.runtime.catalog = ['FAU-04', 'FAU-12'].map(id => f.runtime.byId.get(id));
  const result = f.runtime.consumeTriggerEvent({ type: 'progression.mission_completed', missionId: 'FAU-03', mapId: 'crystal', amount: 1 });
  assert.deepEqual([...result.activatedMissionIds].sort(), ['FAU-04', 'FAU-12']);
  for (const id of result.activatedMissionIds) assert.equal(f.memory.state.missionLifecycle[id].status, 'active');
});
test('déclencheur TP-01 différé : respecte le fait requis puis active sans voler la priorité', () => {
  const f = fixture();
  for (const id of ['T13', 'POSTDIP-01', 'ENE-15-C']) f.memory.state.missionLifecycle[id] = { status: 'completed' };
  delete f.memory.state.missionLifecycle['TP-01']; f.manager.trees.delete('TP-01');
  const key = 'civilization:research:teleport-hypothesis-v1'; f.memory.setFact(key, null);
  f.runtime.catalog = [f.runtime.byId.get('TP-01')];
  const primary = f.manager.primaryMissionId;
  const result = f.runtime.consumeTriggerEvent({ type: 'progression.mission_completed', missionId: 'POSTDIP-01', mapId: 'crystal', amount: 1 });
  assert.equal(result.activatedMissionId, null); assert(f.memory.getFact('bibleDeferredTrigger:TP-01'));
  f.memory.setFact(key, { at: 1 }); assert.equal(f.runtime.reconcileDeferredCompletionTriggers(), true);
  assert.equal(f.memory.state.missionLifecycle['TP-01'].status, 'active'); assert.equal(f.manager.primaryMissionId, primary);
});

test('Base : un événement synchrone de consommation ne défait pas la construction atomique', () => {
  const f = fixture(), tree = f.activate('GAME-base');
  for (const file of ['data/custom-micro-scenes.js', 'engine/micro-scenes.js']) f.load(file);
  established(f, 'GAME-shelter', 'refuge', 2);
  delete f.memory.state.effectReceipts['GAME-base:completion:v1'];
  for (const key of Object.keys(f.BF.progression.state.transactions)) if (key.startsWith('GAME-base:completion:v1:consume:')) delete f.BF.progression.state.transactions[key];
  tree.root.walk(node => { if (node.isLeaf) f.completeNode(node); }); tree.refresh();
  const mineralKeys = f.runtime.inventoryKeysForRequirement({ subject: 'mineral' });
  const fiberBefore = f.BF.availableInventory('fiber'), mineralBefore = f.BF.progression.availableInventory(mineralKeys);
  f.BF.grantInventory('fiber', 500); f.BF.grantInventory('magnetic_ore', 500);
  f.runtime.renderSite = () => true; f.runtime.renderCurrentSite = () => true;
  const consume = f.BF.consumeInventoryPoolOnce;
  let callbacks = 0;
  f.BF.consumeInventoryPoolOnce = (...args) => {
    const removed = consume(...args); callbacks += 1;
    assert.equal(f.runtime.reconcileStockBackedMission(f.runtime.byId.get(tree.id)), false);
    assert.equal(tree.root.isComplete, true);
    return removed;
  };
  assert.equal(f.runtime.applyEffects(f.runtime.byId.get(tree.id), { source: 'autonomy',
    placement: { anchor: { x: 5, y: 0, z: 5 }, rotation: [0, 0, 0] } }), true);
  assert.equal(callbacks, 2); assert(f.runtime.siteBucket('crystal').base);
  assert.equal(f.runtime.siteBucket('crystal').refuge, null);
  assert.equal(f.BF.availableInventory('fiber'), fiberBefore);
  assert.equal(f.BF.progression.availableInventory(mineralKeys), mineralBefore);
  f.runtime.reconcileStockBackedMission(f.runtime.byId.get(tree.id)); f.manager.syncLifecycleFromTrees();
  assert.equal(tree.root.isComplete, true); assert.equal(f.memory.state.missionLifecycle[tree.id].status, 'completed');
});
