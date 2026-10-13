const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = process.env.BLUEFOX_ROOT || path.resolve(__dirname, '..');
process.env.BLUEFOX_ROOT = ROOT;
const continuity = fs.readFileSync(path.join(ROOT, 'tests/mission-contract-continuity.runtime.test.js'), 'utf8');
const physical = fs.readFileSync(path.join(ROOT, 'tests/mission-physical-contracts.runtime.test.js'), 'utf8');
const H = new Function('require', '__dirname',
  continuity.slice(0, continuity.indexOf('\nfor (const m of catalog)')) +
  continuity.slice(continuity.indexOf('function nativeNavigation(f)'), continuity.indexOf("test('cold prescribed")) +
  physical.slice(physical.indexOf('function nativeRoutines(f)'), physical.indexOf('function addResearch')) +
  '\nreturn {live,start,stage,populate,catalog,nativeRoutines,generatedWorld,arrive};')(require, path.join(ROOT, 'tests'));
const fauna = fs.readFileSync(path.join(ROOT, 'tests/fauna-r2-behaviors.runtime.test.js'), 'utf8');
const F = new Function('require', '__dirname', fauna.slice(0, fauna.indexOf("\ntest('")) +
  '\nreturn {runtime,makeRoot};')(require, path.join(ROOT, 'tests'));
function selected(f, t, now = 10000) {
  const action = f.manager.missionRunnableAction(t.id, t, f.manager.bridge.context());
  assert(action, `No action: ${t.id}`);
  return f.manager.executeSelectedMissionAction({ missionId: t.id, action, primary: true }, now);
}
function restore(f, t) {
  f.memory.saveTree(t); f.memory.flush(true);
  f.manager.memory = f.memory = new f.M.MissionMemory();
  f.manager.planner = f.planner = new f.M.MissionPlanner(f.memory);
  const restored = f.planner.restoreOrCreate(t.id);
  f.manager.trees.set(t.id, restored); f.manager.tree = restored;
  return restored;
}
async function giant() {
  const f = await H.live(); f.BF.getMapExplorationState = () => null;
  const m = H.catalog.find(m => m.id === 'ENE-06'), precursor = H.start(f, m.id);
  H.stage(f, m, precursor, 'reachGiantTree');
  await H.generatedWorld(f);
  await f.engine.generateUnknownPassage('north', { bibleMissionId: m.id, source: 'mission' });
  const target = f.memory.getFact('tutorialExcursion:ENE-06')?.generatedTargetMapId;
  assert(target); f.engine.pendingGate = null; H.arrive(f, target);
  const pop = H.populate(f, target);
  const scene = pop.s.microSceneInstances.find(s => s.id === 'MSC-CUSTOM-GIANTCRISTAL-TREE');
  assert(scene?.instanceRoot); assert(scene.records.length > 20);
  const point = f.runtime.observationPoint(scene.instanceRoot, f.engine);
  Object.assign(f.engine.character.root.position, point);
  f.memory.state.missionLifecycle['ENE-06'] = { status: 'completed' };
  return { f, scene };
}
test('Giant: full native composition is discovered and studied globally, one selected step per action, then reload', async () => {
  const { f, scene } = await giant();
  assert(scene.records.some(r => Number(r.root.position.y) > 8));
  f.runtime.reviewProximityContexts();
  const firstComponent = f.BF.ObjectEvents.siteContext(scene.records[0].root, { mapId: f.engine.currentMapId });
  assert.equal(f.BF.hasLocalObjectInteraction(f.engine.currentMapId, firstComponent), false, 'MSC discovery must preserve component novelty');
  let t = f.manager.trees.get('ENE-07'); assert(t, 'Whole-site proximity must discover ENE07');
  assert.equal(t.find('ENE-07:architecture').progress, 0, 'Discovery is not the whole study');
  f.runtime.reviewProximityContexts(); assert.equal(t.find('ENE-07:architecture').progress, 0);
  // Internal meshes are deliberately unavailable: whole-site study must still run.
  f.engine.currentMap.interactables = [];
  assert(selected(f, t)); assert.equal(t.find('ENE-07:architecture').progress, 1);
  assert.equal(f.BF.ObjectEvents.history().at(-1).firstLocalInteraction, false, 'Whole-site novelty is credited only once');
  assert.equal(t.find('ENE-07:livingComponent').progress, 0);
  t = restore(f, t);
  assert(selected(f, t, 20000)); assert.equal(t.find('ENE-07:livingComponent').progress, 1);
  assert.equal(t.find('ENE-07:mineralComponent').progress, 0);
  assert(selected(f, t, 30000)); assert.equal(t.find('ENE-07:mineralComponent').progress, 1);
  H.nativeRoutines(f); assert(selected(f, t, 40000)); f.engine.updateRoutine(47000);
  assert(t.root.isComplete);
  assert.equal(f.memory.getFact('ene07:giant-tree-site').persistentMicroSceneId, scene.instanceRoot.userData.persistentMicroSceneId);
});
for (const [id, slot] of [['ENE-08', 'mineralReference'], ['ENE-09', 'couple'], ['ENE-10', 'charge']]) {
  test(`${id}: whole site works without components, rejects a different persistent Giant`, async () => {
    const { f, scene } = await giant(); f.runtime.reviewProximityContexts();
    const t = H.start(f, id); assert(t);
    H.stage(f, H.catalog.find(m => m.id === id), t, slot);
    f.memory.setFact('ene08:giant-tree-reference', { mapId: f.engine.currentMapId, persistentMicroSceneId: f.memory.getFact('ene07:giant-tree-site').persistentMicroSceneId });
    f.engine.currentMap.interactables = [];
    const n = t.find(`${id}:${slot}`), action = { missionId: id, nodeId: n.id, type: n.type, params: n.params };
    const saved = scene.instanceRoot.userData.persistentMicroSceneId;
    scene.instanceRoot.userData.persistentMicroSceneId = 'other'; scene.persistentMicroSceneId = 'other';
    assert.equal(f.BF.probeMissionActionTarget(f.engine, action), null);
    scene.instanceRoot.userData.persistentMicroSceneId = saved; scene.persistentMicroSceneId = saved;
    assert(selected(f, t)); assert.equal(n.progress, 1);
  });
}
test('MSC global study preserves fan-out to another eligible global objective', async () => {
  const { f } = await giant(); f.runtime.reviewProximityContexts();
  const t = f.manager.trees.get('ENE-07'), other = H.start(f, 'ENE-10'); assert(other);
  f.engine.currentMap.interactables = [];
  assert(selected(f, t));
  assert.equal(t.find('ENE-07:architecture').progress, 1);
  assert.equal(t.find('ENE-07:livingComponent').progress, 0);
  assert.equal(other.find('ENE-10:charge').progress, 1);
});
for (const [id, slot] of [['SUR-07', 'experimentConservation'], ['PROS-03', 'optimize']]) {
  test(`${id}: paid research resumes after physical interruption and reload without replenishment`, async () => {
    const f = await H.live(); H.nativeRoutines(f);
    f.BF.getMapExplorationState = () => null; f.BF.canAccessCampInventory = () => true;
    const m = H.catalog.find(m => m.id === id);
    for (const k of m.experimentalPrerequisites || []) f.memory.state.researchUnlocks[k] = { id: k, unlockedAt: 1 };
    for (const k of m.requiredFacts || []) if (typeof k === 'string') f.memory.setFact(k, true);
    let t = H.start(f, id); assert(t); H.stage(f, m, t, slot);
    const n = t.find(`${id}:${slot}`), costs = n.params.inventoryConsume;
    for (const cost of costs) f.BF.grantInventory(cost.inventoryKey, cost.quantity);
    assert(selected(f, t));
    f.BF.__TestWorldEngine.prototype.cancelAutonomousActivity.call(f.engine, 'autonomy-mode-off');
    assert.equal(n.progress, 0); assert.equal(f.engine.currentRoutine, null);
    for (const cost of costs) assert.equal(f.BF.availableInventory(cost.inventoryKey), 0);
    t = restore(f, t); f.load('engine/progression-registry.js');
    assert(selected(f, t, 20000)); f.engine.updateRoutine(28000);
    assert.equal(t.find(`${id}:${slot}`).progress, 1);
    for (const cost of costs) assert.equal(f.BF.availableInventory(cost.inventoryKey), 0);
  });
}
for (const history of [[], ['day'], ['day', 'night']]) {
  test(`FAU03: fresh mission contrast is independent of history ${history.join('/') || 'empty'}`, async () => {
    const f = await H.live(), shared = {};
    const npc = f.object('brouteur'); npc.userData.instanceId = 'same-animal'; npc.userData.worldAnchor = npc;
    const feed = period => {
      const h = F.runtime({ period, sharedFacts: shared }), a = F.makeRoot('brouteur');
      a.userData.instanceId = 'same-animal'; h.BF.FaunaRuntime.register(a, 'brouteur');
      f.BF.FaunaRuntime = h.BF.FaunaRuntime;
      for (let t = .2; t <= 3; t += .2) h.step(t, 4.8, 0);
      for (let t = 3.2; t <= 9; t += .2) h.step(t, 3, 0);
      for (const e of h.events) f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED,
        npc, { ...e.detail, mapId: 'crystal' });
      return h;
    };
    for (const period of history) feed(period);
    let t = H.start(f, 'FAU-03'); assert(t);
    feed('night'); assert.equal(t.find('FAU-03:firstPeriod').progress, 1);
    assert.equal(t.find('FAU-03:oppositePeriod').progress, 0);
    const periodControl = feed('night'); assert.equal(t.find('FAU-03:oppositePeriod').progress, 0);
    t = restore(f, t);
    f.engine.currentMap.interactables = [npc];
    const n = t.find('FAU-03:oppositePeriod'), a = { missionId: t.id, nodeId: n.id, type: n.type, params: n.params };
    assert.equal(f.BF.probeMissionActionTarget(f.engine, a), null, 'Same-period observation cannot be selected as contrast');
    periodControl.setPeriod('day');
    assert.equal(f.BF.probeMissionActionTarget(f.engine, a), npc, 'The real world clock makes the opposite-period study runnable');
    feed('day'); assert(t.root.isComplete);
    assert(Object.keys(shared).length > 0, 'Persistent fauna history must remain');
  });
}

test('FAU03: an old completed reference without period evidence is completed only by fresh contrasting encounters', async () => {
  const f = await H.live(); f.BF.getMapExplorationState = () => null;
  let t = H.start(f, 'FAU-03'), first = t.find('FAU-03:firstPeriod');
  f.completeNode(first); first.historyValues = []; t.refresh();
  const completedAt = first.completedAt;
  t = restore(f, t);
  const npc = f.object('brouteur'); npc.userData.instanceId = 'fresh-reference'; npc.userData.worldAnchor = npc;
  const emit = period => f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED, npc,
    { period, mapId: 'crystal', tags: ['fauna_behavior', 'calm_nearby', `period_${period}`] });
  emit('night');
  assert.equal(t.find('FAU-03:firstPeriod').progress, 1);
  assert.equal(t.find('FAU-03:firstPeriod').completedAt, completedAt);
  assert.equal(t.find('FAU-03:oppositePeriod').progress, 0);
  assert.equal(t.find('FAU-03:firstPeriod').historyValues.length, 1);
  t = restore(f, t); emit('night'); assert.equal(t.find('FAU-03:oppositePeriod').progress, 0);
  emit('day'); assert(t.root.isComplete);
});
test('Giant: neither distant presence nor a refused approach grants study credit', async () => {
  const { f, scene } = await giant();
  const point = f.runtime.observationPoint(scene.instanceRoot, f.engine);
  Object.assign(f.engine.character.root.position, { x: point.x + 30, z: point.z });
  f.runtime.reviewProximityContexts(); assert.equal(f.manager.trees.has('ENE-07'), false);
  Object.assign(f.engine.character.root.position, point); f.runtime.reviewProximityContexts();
  const t = f.manager.trees.get('ENE-07'); assert(t);
  Object.assign(f.engine.character.root.position, { x: point.x + 30, z: point.z });
  f.engine.THREE = { Vector3: scene.instanceRoot.position.constructor }; f.engine.character.setTarget = () => false;
  assert.equal(selected(f, t), false); assert.equal(t.find('ENE-07:architecture').progress, 0);
  f.engine.character.setTarget = () => true;
  assert(selected(f, t, 20000)); assert.equal(t.find('ENE-07:architecture').progress, 0);
  // The native proximity monitor completes the already selected action on arrival.
  Object.assign(f.engine.character.root.position, point);
  f.runtime.reviewProximityContexts();
  assert.equal(t.find('ENE-07:architecture').progress, 1);
  assert.equal(t.find('ENE-07:livingComponent').progress, 0);
  assert.equal(f.manager.currentAction, null);
});
test('ENE08: leave, native generation, reload and return validate the original complete sanctuary', async () => {
  const { f } = await giant(); f.runtime.reviewProximityContexts();
  const home = f.engine.currentMapId, identity = f.memory.getFact('ene07:giant-tree-site').persistentMicroSceneId;
  let t = H.start(f, 'ENE-08'); assert(t);
  f.runtime.reviewProximityContexts(); assert.equal(t.find('ENE-08:plantReference').progress, 1);
  assert(selected(f, t)); assert.equal(t.find('ENE-08:mineralReference').progress, 1);
  await f.engine.generateUnknownPassage('north', { bibleMissionId: 'ENE-08', source: 'mission' });
  const away = f.memory.getFact('tutorialExcursion:ENE-08')?.generatedTargetMapId;
  assert(away && away !== home);
  assert(!(f.BF.maps[away].generator.requiredMicroScenes || []).some(s => (s.id || s.microSceneId) === 'MSC-CUSTOM-GIANTCRISTAL-TREE'));
  f.engine.pendingGate = null; H.arrive(f, away); H.populate(f, away);
  assert.equal(t.find('ENE-08:leaveReference').progress, 1);
  t = restore(f, t);
  assert.equal(f.memory.getFact('ene07:giant-tree-site').persistentMicroSceneId, identity);
  assert(f.engine.findKnownRoute(away, home));
  H.arrive(f, home, { isNew: false }); H.populate(f, home);
  assert.equal(t.find('ENE-08:returnToReference').progress, 1);
  const anchor = f.runtime.microSceneProximityAnchor('MSC-CUSTOM-GIANTCRISTAL-TREE', { requiredSiteFact: 'ene07:giant-tree-site' });
  assert(anchor); Object.assign(f.engine.character.root.position, f.runtime.observationPoint(anchor, f.engine));
  f.runtime.reviewProximityContexts(); assert(t.root.isComplete);
  assert.equal(f.memory.getFact('ene08:giant-tree-return').persistentMicroSceneId, identity);
});
