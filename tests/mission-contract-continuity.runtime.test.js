const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = process.env.BLUEFOX_ROOT || path.resolve(__dirname, '..');
process.env.BLUEFOX_ROOT = ROOT;
const fixtureSource = fs.readFileSync(path.join(ROOT, 'tests/mission-physical-contracts.runtime.test.js'), 'utf8');
const { fixture, physicalObject } = new Function('require', '__dirname',
  fixtureSource.slice(0, fixtureSource.indexOf('\nfor (const [slot')) + '\nreturn {fixture,physicalObject};')(require, path.join(ROOT, 'tests'));
const catalogWindow = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data/bible-catalog.js'), 'utf8'), { window: catalogWindow });
const catalog = catalogWindow.BlueFox3D.BibleCatalog;
const plain = value => JSON.parse(JSON.stringify(value));
const populationSource = fs.readFileSync(path.join(ROOT, 'tests/population-persistence.runtime.test.js'), 'utf8');
const populationHarness = new Function('require', '__dirname',
  populationSource.slice(0, populationSource.indexOf('\nfor(const [name')) + '\nreturn {environment,THREE:{Vector3:V,Box3:Box,Group}};')(require, path.join(ROOT, 'tests'));
function populate(f, mapId) {
  const e = populationHarness.environment(); e.load('engine/map-integrity-v20.js');
  e.BF.currentEngine = { missionManager: f.manager };
  let result;
  e.BF.buildMap = (THREE, definition) => {
    result = e.populate(definition, definition.plateauCount || 1);
    result.options.group.userData.microScenes = result.s.microSceneInstances;
    return result.options;
  };
  e.load('engine/persistent-micro-scenes-v20.js');
  const definition = plain(f.BF.maps[mapId]);
  const built = e.BF.buildMap(populationHarness.THREE, definition);
  f.BF.maps[mapId].persistentMicroScenes = plain(definition.persistentMicroScenes || []);
  f.engine.currentMap.interactables = built.interactables;
  f.engine.currentMap.group = built.group;
  result.built = built;
  return result;
}
async function live() { const f = await fixture(); f.runtime.connect(); return f; }
function start(f, id) {
  const m = f.BF.BibleCatalog.find(m => m.id === id);
  for (const p of m.prerequisites || []) f.memory.state.missionLifecycle[p] = { status: 'completed' };
  f.manager.startMission(id, { primary: true });
  return f.manager.trees.get(id);
}
// Only predecessors are staged in leaf-level matrix tests. The tested travel,
// study, proof and completion are always consumed by the native owners.
function stage(f, m, t, slot) {
  for (const step of m.sequence) { if (step.slot === slot) break; f.completeNode(t.find(`${m.id}:${step.slot}`)); }
  t.refresh();
}
function arrive(f, to, options = {}) {
  const from = f.engine.currentMapId;
  f.engine.currentMapId = to; f.engine.discoveredMaps.add(to);
  f.BF.maps[to] ||= { id: to, exits: {} }; f.engine.currentMap.interactables = [];
  f.window.dispatchEvent(new f.window.CustomEvent('bluefox:map-transition-completed', {
    detail: { fromMapId: from, toMapId: to, mapId: to, isNew: true, direction: 'north', source: 'manual', mode: 'gate', ...options }
  }));
}
function physical(f, t, clock = 10000) {
  const a = f.manager.missionRunnableAction(t.id, t, f.manager.bridge.context());
  assert(a, `No physical action for ${t.id}`); f.manager.currentAction = a;
  assert.equal(f.manager.bridge.execute(a, clock), true);
  for (let i = 0; i < 6 && f.engine.pendingInteraction; i++) f.engine.updateInteraction(clock + i * 25000);
  return a;
}
function restore(f, id) {
  f.memory.saveTree(f.manager.trees.get(id)); f.memory.flush(true);
  f.manager.memory = f.memory = new f.M.MissionMemory();
  f.manager.planner = f.planner = new f.M.MissionPlanner(f.memory);
  const t = f.planner.restoreOrCreate(id); f.manager.trees.set(id, t); f.manager.tree = t; return t;
}

for (const m of catalog) for (const step of m.sequence || []) {
  if (!m.mapGeneration || step.action !== 'travel' || !step.params?.newOnly || Number(step.target) !== 1) continue;
  test(`${m.id}:${step.slot}: prescribed arrival rejects foreign/missing/stale ownership and survives reload`, async () => {
    const f = await live(); let t = start(f, m.id); stage(f, m, t, step.slot);
    const nodeId = `${m.id}:${step.slot}`, key = `tutorialExcursion:${m.id}`;
    const direction = step.params.direction || 'north';
    arrive(f, 'foreign', { direction }); assert.equal(t.find(nodeId).progress, 0);
    f.BF.maps.foreign.generator = { bibleMissionId: 'OTHER', biblePrescriptionApplied: true };
    f.memory.setFact(key, { generatedTargetMapId: 'foreign', travelNodeId: nodeId });
    arrive(f, 'foreign', { direction }); assert.equal(t.find(nodeId).progress, 0);
    f.BF.maps.expected = { id: 'expected', exits: {}, generator: { bibleMissionId: m.id, biblePrescriptionApplied: true } };
    if (step.params.toDiscoveryIndex != null) f.BF.maps.expected.generator.discoveryIndex = step.params.toDiscoveryIndex;
    f.memory.setFact(key, { generatedTargetMapId: 'expected', travelNodeId: `${m.id}:previous-trip` });
    arrive(f, 'expected', { direction }); assert.equal(t.find(nodeId).progress, 0);
    f.memory.setFact(key, { generatedTargetMapId: 'expected', travelNodeId: nodeId });
    t = restore(f, m.id);
    arrive(f, 'expected', { direction }); assert.equal(t.find(nodeId).progress, 1);
    if (step.params.completionArrivalFact) assert.equal(f.memory.getFact(step.params.completionArrivalFact)?.[step.params.completionArrivalField || 'toMapId'], 'expected');
  });
}

for (const id of ['GAME-civilization_3', 'GAME-civilization_4']) {
  test(`${id}: poor world cannot consume an unrelated trip or reuse Crystal; correct arrival and real stele complete`, async () => {
    const f = await live(); let t = start(f, id);
    const travelId = `${id}:travel`; arrive(f, 'empty-foreign');
    assert.equal(t.find(travelId).progress, 0);
    assert.equal(f.manager.missionTransitionFor(id)?.node.id, travelId);
    f.engine.currentMapId = 'crystal'; f.engine.currentMap.interactables = [physicalObject(f, 'stele', 'old-stele')];
    assert.equal(f.manager.missionRunnableAction(id, t, f.manager.bridge.context()), null);
    const destination = id + '-own';
    f.memory.setFact(`tutorialExcursion:${id}`, { generatedTargetMapId: destination, travelNodeId: travelId });
    f.BF.maps[destination] = { id: destination, exits: {}, generator: { bibleMissionId: id, biblePrescriptionApplied: true } };
    arrive(f, destination); t = restore(f, id);
    arrive(f, 'crystal', { isNew: false }); f.engine.currentMap.interactables = [physicalObject(f, 'stele', 'old-stele')];
    assert.equal(f.manager.missionRunnableAction(id, t, f.manager.bridge.context()), null);
    arrive(f, destination, { isNew: false }); f.engine.currentMap.interactables = [physicalObject(f, 'stele', 'own-stele')];
    physical(f, t); assert.equal(t.root.isComplete, true);
  });
}

async function templeProof() {
  const f = await live(), id = 'ENE-15-A'; const t = start(f, id);
  f.memory.setFact('dip03:temple-map', { mapId: 'crystal' });
  f.engine.currentMap.interactables = [physicalObject(f, 'tech_relic', 'temple-relic', 'MSC-CUSTOM-HUGE-TEMPLE', 'temple-site')];
  physical(f, t); assert.equal(t.find(`${id}:observeNetworkTechnology`).progress, 1);
  return { f, t, id };
}
test('same-instance narrative confirmation preserves proof location and completes after reload', async () => {
  const { f, id } = await templeProof(); const t = restore(f, id);
  f.engine.currentMap.interactables = [];
  const a = f.manager.missionRunnableAction(id, t, f.manager.bridge.context()); assert(a);
  assert.equal(f.BF.probeMissionActionTarget(f.engine, a)?.missionEvidence, true);
  const count = f.BF.ObjectEvents.history().length;
  assert.equal(f.manager.executeSelectedMissionAction({ missionId: id, action: a, primary: true }, 50000), true);
  assert.equal(t.root.isComplete, true); assert.equal(f.engine.pendingInteraction, null);
  assert.equal(f.BF.ObjectEvents.history().length, count, 'Narrative confirmation must not forge a physical world event');
});
test('wrong proof map cannot be replaced by the current map to validate confirmation', async () => {
  const { f, t, id } = await templeProof(); f.engine.currentMap.interactables = [];
  f.memory.setFact('dip03:temple-map', { mapId: 'elsewhere' }); f.engine.currentMapId = 'elsewhere';
  const a = f.planner.nextAction(t, f.manager.bridge.context()); assert(a);
  assert.equal(Boolean(f.BF.probeMissionActionTarget(f.engine, a)), false);
  assert.equal(f.manager.bridge.execute(a, 50000), false); assert.equal(t.root.isComplete, false);
});
test('independent Scout actor on same instance cannot consume BlueFox narrative evidence', async () => {
  const f = await live(), id = 'PHEN-01', t = start(f, id);
  f.memory.setFact(`tutorialExcursion:${id}`, { generatedTargetMapId: 'fog-map', travelNodeId: `${id}:reachPhenomenon` });
  arrive(f, 'fog-map'); f.engine.currentMap.interactables = [physicalObject(f, 'fog_bank', 'fog')];
  physical(f, t); assert.equal(t.find(`${id}:bluefoxReading`).progress, 1);
  const a = f.planner.nextAction(t, f.manager.bridge.context());
  assert.notEqual(f.BF.probeMissionActionTarget(f.engine, a)?.missionEvidence, true);
  assert.equal(t.find(`${id}:scoutReading`).progress, 0);
});
test('free new-map exploration retains compatible fan-out without prescription', async () => {
  const f = await live();
  const trees = ['EXP-LONG-02', 'EXP-LONG-04'].map(id => start(f, id));
  arrive(f, 'ordinary');
  for (const t of trees) {
    const travel = t.availableLeaves().find(n => n.type === 'travel');
    assert.equal(travel.progress, 1);
  }
});

function nativeNavigation(f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine/world-engine.js'), 'utf8')
    .replace('  BF.mount = async function mount(options) {', '  BF.__ContractWorldEngine = WorldEngine;\n  BF.mount = async function mount(options) {'), f.context);
  const proto = f.BF.__ContractWorldEngine.prototype;
  for (const method of ['generateUnknownPassage', 'applyGeneratedLink', 'findPhysicalRoute', 'findKnownRoute']) f.engine[method] = proto[method];
  f.engine.generatedTopology = []; f.engine.navigationRoute = [];
  f.engine.autonomyMode = 'full';
  f.engine.addRuntimeGate = (direction, exit) => ({ position: f.engine.character.root.position, userData: { exit } });
  f.engine.handleNavigationSuggestion = detail => { f.suggestions.push(detail); }; f.suggestions = [];
  // Expose native methods without installing a second engine or replacing the
  // already mounted ObjectM0 wrappers. Mesh loading/movement remain stubs.
  f.BF.mount = async ({ engine }) => engine;
}
async function generatedWorld(f) {
  for (const file of ['map-assets.js', 'Images/images-catalog.js', 'engine/map-registry.js',
    'engine/map-generation-rules.js', 'engine/map-generation-no5-v20-1.js', 'engine/map-generator.js',
    'engine/persistent-micro-scenes-v20.js', 'engine/map-integrity-v20.js', 'engine/map-generator-bible-overrides-v19.js']) f.load(file);
  nativeNavigation(f); f.load('engine/bible-map-prescription-v19.js'); await f.BF.mount({ engine: f.engine });
}
test('cold prescribed generation uses native generator, physical graph, two separate glow trips and persistent targets', async () => {
  const f = await live(); await generatedWorld(f); const id = 'FLO-04'; let t = start(f, id);
  f.manager.setPrimaryMission(id, true, 'Priorité suggérée par le joueur.');
  // Native mission-state publication requests the map. Await its async wrapper.
  await new Promise(r => setImmediate(r));
  let fact = f.memory.getFact(`tutorialExcursion:${id}`);
  assert(fact, JSON.stringify({primary:f.manager.primaryMissionId,life:f.memory.state.missionLifecycle[id],mode:f.BF.getAutonomyMode(),busy:f.manager.currentAction,pending:f.engine.pendingGate,leaves:t.availableLeaves().map(n=>n.id)})); assert.equal(fact.travelNodeId, `${id}:reachFirstGlowMap`); const first = fact.generatedTargetMapId; assert(first);
  assert.equal(f.BF.maps[first].generator.bibleMissionId, id);
  assert(f.BF.maps[first].generator.requiredObjects.some(o => o.type === 'fluorescent_vegetation'));
  assert.equal(f.engine.findKnownRoute('crystal', first), null, 'Generated but undiscovered is not a known destination');
  f.engine.pendingGate = null; arrive(f, first); assert.deepEqual(plain(f.engine.findKnownRoute('crystal', first)), ['crystal', first]);
  const firstPopulation = populate(f, first);
  assert(firstPopulation.rows.some(r => r.type === 'fluorescent_vegetation'), 'Target must be instantiated by native population, not supplied by the test');
  physical(f, t);
  f.manager.currentAction = null; f.manager.publish(); await new Promise(r => setImmediate(r));
  fact = f.memory.getFact(`tutorialExcursion:${id}`); const second = fact.generatedTargetMapId;
  assert.equal(fact.travelNodeId, `${id}:reachSecondGlowMap`); assert(second && second !== first);
  assert.equal(f.BF.maps[second].generator.bibleMissionId, id);
  assert.equal(t.find(`${id}:reachSecondGlowMap`).progress, 0);
  // An arrival on the first target must not complete the second excursion.
  arrive(f, first); assert.equal(t.find(`${id}:reachSecondGlowMap`).progress, 0);
  f.engine.pendingGate = null; arrive(f, second); t = restore(f, id);
  populate(f, second); physical(f, t, 100000);
  assert.equal(t.root.isComplete, true);
  assert.deepEqual(plain(f.engine.findKnownRoute('crystal', second)), ['crystal', first, second]);
  const saved = plain(f.BF.maps[second]); f.BF.MapGenerator.restore();
  assert.equal(f.BF.maps[second].generator.bibleMissionId, id);
  assert.deepEqual(plain(f.BF.maps[second].generator.requiredObjects), saved.generator.requiredObjects);
});
test('older active save applies destination contract at runtime without rewriting completed predecessors or serialized params', async () => {
  const f = await live(), id = 'GAME-civilization_3'; let t = start(f, id);
  const travel = t.find(`${id}:travel`); f.completeNode(travel); t.refresh();
  const n = t.find(`${id}:stele`); delete n.params.requiredMapFact; delete n.params.requiredMapField;
  const old = plain(t.toJSON()); f.memory.saveTree(t); f.memory.flush(true); t = f.planner.restoreOrCreate(id); f.manager.trees.set(id, t);
  assert.equal(t.find(`${id}:stele`).params.requiredMapFact, `tutorialExcursion:${id}`);
  assert.deepEqual(plain(t.toJSON()), old);
  assert.equal(t.find(`${id}:travel`).isComplete, true);
  assert.equal(f.manager.missionTransitionFor(id)?.source, 'mission-map-generation');
});

test('a second excursion cannot credit the first destination while generation is still pending', async () => {
  const f = await live(), id = 'FLO-04', t = start(f, id), m = catalog.find(m => m.id === id);
  stage(f, m, t, 'reachSecondGlowMap');
  f.engine.currentMapId = 'first-site'; f.BF.maps['first-site'] = { id: 'first-site', exits: {} };
  f.memory.setFact(`tutorialExcursion:${id}`, { generatedTargetMapId: 'first-site', travelNodeId: `${id}:reachFirstGlowMap`, arrived: true, mapId: 'first-site', toMapId: 'first-site' });
  let release; const pending = new Promise(resolve => { release = resolve; });
  f.engine.generateUnknownPassage = async direction => {
    await pending;
    f.BF.maps['first-site'].exits[direction] = { targetMap: 'second-site' };
    f.BF.maps['second-site'] = { id: 'second-site', exits: {}, generator: { bibleMissionId: id, biblePrescriptionApplied: true } };
    return true;
  };
  f.load('engine/bible-map-prescription-v19.js'); await f.BF.mount({ engine: f.engine });
  f.manager.setPrimaryMission(id, true, 'Priorité suggérée par le joueur.');
  const during = f.memory.getFact(`tutorialExcursion:${id}`);
  assert.equal(during.generatedTargetMapId, null); assert.equal(during.arrived, false);
  arrive(f, 'first-site'); assert.equal(t.find(`${id}:reachSecondGlowMap`).progress, 0);
  release(); await new Promise(r => setImmediate(r));
  assert.equal(f.memory.getFact(`tutorialExcursion:${id}`).generatedTargetMapId, 'second-site');
  arrive(f, 'second-site'); assert.equal(t.find(`${id}:reachSecondGlowMap`).progress, 1);
});

test('Racines énergétiques: native generation and persistent MSC provide both physical analyses after reload', async () => {
  const f = await live(); await generatedWorld(f); const id = 'FLO-05'; let t = start(f, id);
  f.manager.setPrimaryMission(id, true, 'Priorité suggérée par le joueur.'); await new Promise(r => setImmediate(r));
  const target = f.memory.getFact(`tutorialExcursion:${id}`)?.generatedTargetMapId; assert(target);
  assert(f.BF.maps[target].persistentMicroScenes.some(s => s.microSceneId === 'MSC-ECO-FOSSIL-001'));
  f.engine.pendingGate = null; arrive(f, target); populate(f, target); physical(f, t);
  assert.equal(t.find(`${id}:rootFlora`).progress, 1);
  t = restore(f, id); populate(f, target); physical(f, t, 100000);
  assert.equal(t.root.isComplete, true);
});

test('civilization trail: native generation/spawn and physical studies complete both maps and reveal the reserve mission', async () => {
  const f = await live(); await generatedWorld(f);
  for (const id of ['GAME-civilization_3', 'GAME-civilization_4']) {
    const t = start(f, id); f.manager.setPrimaryMission(id, true, 'Priorité suggérée par le joueur.');
    await new Promise(r => setImmediate(r)); const fact = f.memory.getFact(`tutorialExcursion:${id}`); assert(fact?.generatedTargetMapId);
    const target = fact.generatedTargetMapId; assert.equal(f.BF.maps[target].generator.bibleMissionId, id);
    f.engine.pendingGate = null; arrive(f, target); populate(f, target); physical(f, t);
    assert.equal(t.root.isComplete, true); assert.equal(f.memory.state.missionLifecycle[id].status, 'completed');
  }
  assert.equal(f.memory.state.missionLifecycle['GAME-civilization_5'].status, 'active');
});

test('an open travel with a saved foreign destination can request its own map instead of remaining locked', async () => {
  const f = await live(); const id = 'GAME-civilization_3', t = start(f, id); await generatedWorld(f);
  f.BF.maps['saved-foreign'] = { id: 'saved-foreign', exits: {}, generator: { bibleMissionId: 'OTHER', biblePrescriptionApplied: true } };
  f.memory.setFact(`tutorialExcursion:${id}`, { generatedTargetMapId: 'saved-foreign', travelNodeId: `${id}:travel`, arrived: true });
  f.manager.setPrimaryMission(id, true, 'Priorité suggérée par le joueur.'); await new Promise(r => setImmediate(r));
  const fact = f.memory.getFact(`tutorialExcursion:${id}`);
  assert.notEqual(fact.generatedTargetMapId, 'saved-foreign'); assert(fact.generatedTargetMapId);
  assert.equal(f.BF.maps[fact.generatedTargetMapId].generator.bibleMissionId, id);
  assert.equal(t.find(`${id}:travel`).progress, 0, 'Recovery must not fabricate arrival credit');
});

for (const id of ['FAU-01', 'FAU-08', 'FAU-09', 'FAU-10', 'FAU-12']) {
  test(`${id}: autonomous fauna behavior counts only on its prescribed map, never as local novelty`, async () => {
    const f = await live(), m = catalog.find(m => m.id === id), t = start(f, id);
    const travel = t.availableLeaves().find(n => n.type === 'travel'); const target = 'fauna-site';
    f.memory.setFact(`tutorialExcursion:${id}`, { generatedTargetMapId: target, travelNodeId: travel.id });
    arrive(f, target); const node = t.availableLeaves()[0]; assert(node);
    const animal = physicalObject(f, 'small_creature', 'animal', node.params.microSceneId, 'fauna-persistent');
    const event = { subject: 'fauna', kind: 'fauna_behavior', tags: node.params.tagsAll, mapId: 'other-site' };
    const wrong = f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED, animal, event);
    assert.equal(wrong.isLocalInteraction, false); assert.equal(node.progress, 0);
    const correct = f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED, animal, { ...event, mapId: target });
    assert.equal(correct.firstLocalInteraction, false); assert.equal(node.progress, 1);
  });
}
