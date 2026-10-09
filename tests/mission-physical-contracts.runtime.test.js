const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ROOT = process.env.BLUEFOX_ROOT || path.resolve(__dirname, '..');
process.env.BLUEFOX_ROOT = ROOT;
// Geometry is stubbed; the actual owners, wrappers, event bus and persistence execute.
const source = fs.readFileSync(path.join(ROOT, 'tests/mission-chain-integrity.runtime.test.js'), 'utf8');
const coreFixture = new Function('require', '__dirname',
  source.slice(0, source.indexOf("\ntest('")) + '\nreturn runtimeFixture;')(require, path.join(ROOT, 'tests'));
async function fixture() {
  const f = await coreFixture();
  f.engine.loadMap = async id => { f.engine.currentMapId = id; };
  for (const file of ['engine/explore-scope-bridge.js', 'engine/sequence-actions-bridge.js',
    'engine/context-msc-bridge.js', 'engine/travel-cycle-bridge.js',
    'engine/bible-exploration-world-v19.js', 'engine/mission-aware-analysis.js',
    'engine/mission-runtime-integration-v19-7.js', 'engine/mission-target-arbitration-v19-12.js']) f.load(file);
  await f.BF.mount({ engine: f.engine });
  return f;
}
function physicalObject(f, type, id, scene, persistent) {
  const object = f.object(type);
  Object.assign(object.userData, { worldAnchor: object, instanceId: id,
    ...(scene ? { microSceneId: scene } : {}),
    ...(persistent ? { persistentMicroSceneId: persistent } : {}) });
  return object;
}
function physical(f, tree, clock = 10000) {
  const action = f.manager.missionRunnableAction(tree.id, tree, f.manager.bridge.context());
  assert(action, `No runnable action in ${tree.id}`);
  f.manager.currentAction = action;
  assert.equal(f.manager.bridge.execute(action, clock), true);
  if (f.engine.pendingInteraction) { f.engine.updateInteraction(clock); f.engine.updateInteraction(clock + 25000); }
  return action;
}
async function dip02(slot) {
  const f = await fixture();
  f.load('data/custom-maps.js'); f.load('data/civilization-cities.js');
  f.BF.buildMap = () => ({}); f.load('engine/custom-map-registry.js');
  f.memory.state.missionLifecycle['GAME-contact_ambassador'] = { status: 'completed' };
  f.memory.setFact('dip02:rocky-city', { mapId: 'custom-map-32-rock-village' });
  f.memory.setFact('dip02:translucent-city', { mapId: 'custom-map-31-tinycity' });
  f.manager.startMission('DIP-02', { primary: true });
  const tree = f.manager.trees.get('DIP-02');
  for (const s of ['visitRockyCity', 'visitTranslucentCity', 'islets', 'pools', 'watercourses']) {
    if (s === slot) break;
    f.completeNode(tree.find(`DIP-02:${s}`));
  }
  tree.refresh(); f.memory.saveTree(tree); f.manager.publish();
  f.engine.currentMapId = 'custom-map-31-tinycity';
  return { ...f, tree, node: tree.find(`DIP-02:${slot}`) };
}
for (const [slot, type, target] of [['islets', 'mobile_islet', 3], ['pools', 'pool', 5], ['watercourses', 'watercourse', 2]]) {
  test(`DIP-02 ${slot}: one qualified instance gives one credit, selection survives reload`, async () => {
    const f = await dip02(slot), objects = Array.from({ length: target }, (_, i) => physicalObject(f, type, `${slot}:${i}`));
    f.engine.currentMap.interactables = objects;
    physical(f, f.tree);
    assert.equal(f.node.progress, 1);
    assert.equal(f.BF.getHistoricalEventCount({
      type: slot === 'watercourses' ? 'OBJECT_SEEN' : 'PHENOMENON_OBSERVED',
      cuoType: type, distinctBy: 'instanceId',
      interactionSource: slot === 'watercourses' ? 'mission-proximity' : 'mission'
    }), 1);
    // Same real target remains on the map, but cannot be selected or counted again.
    f.memory.flush(true);
    f.manager.memory = f.memory = new f.M.MissionMemory();
    f.manager.planner = f.planner = new f.M.MissionPlanner(f.memory);
    f.tree = f.planner.restoreOrCreate('DIP-02');
    f.node = f.tree.find(`DIP-02:${slot}`);
    f.manager.trees.set('DIP-02', f.tree); f.manager.tree = f.tree;
    for (let i = 1; i < target; i++) {
      const action = physical(f, f.tree, 10000 + i * 30000);
      assert.equal(action.instanceId, `${slot}:${i}`);
      assert.equal(f.node.progress, i + 1);
    }
    assert.equal(f.node.isComplete, true);
  });
}
test('proximity keeps rich target matching and never succeeds when approach fails', async () => {
  const f = await dip02('watercourses'), object = physicalObject(f, 'watercourse', 'river');
  object.position = { x: 10, y: 0, z: 0, clone() { return { x: this.x, y: this.y, z: this.z }; } };
  f.engine.character.root.position.distanceTo = p => p === object.position ? 10 : 0;
  f.engine.character.setTarget = () => false;
  f.engine.currentMap.interactables = [object];
  const action = f.manager.missionRunnableAction(f.tree.id, f.tree, f.manager.bridge.context());
  assert(action); f.manager.currentAction = action;
  assert.equal(f.manager.bridge.execute(action, 10000), false);
  assert.equal(f.node.progress, 0); assert.equal(f.engine.pendingInteraction, null);
  // Wrong map is still refused by ObjectM0 rather than the old fallback picker.
  f.node.params.requiredMapFact = 'river-map'; f.memory.setFact('river-map', { mapId: 'elsewhere' });
  assert.equal(f.manager.bridge.execute(action, 10000), false);
});
for (const family of ['CARN', 'STORM']) for (let step = 1; step <= 4; step++) {
  const id = `TERR-${family}-0${step}`;
  test(`${id}: ordinary observation is refused, the declared proximity contract executes`, async () => {
    const f = await fixture(); f.manager.startMission(id, { primary: true });
    const tree = f.manager.trees.get(id), node = tree.find(`${id}:approach`);
    f.memory.setFact(`bibleActivation:${id}`, { mapId: 'crystal' });
    const o = physicalObject(f, node.params.cuoType, 'hazard', node.params.microSceneId);
    f.engine.currentMap.interactables = [o];
    f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED, o, { mapId: 'crystal', interactionSource: 'manual' });
    assert.equal(node.progress, 0); physical(f, tree); assert.equal(node.progress, 1);
    const event = f.BF.ObjectEvents.history().at(-1);
    assert.equal(event.detail.interactionSource, 'mission-proximity');
    assert.equal(event.detail.proximityRadius, node.params.proximityRadius);
    assert.equal(f.manager.currentAction, null);
  });
}
function nativeRoutines(f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine/world-engine.js'), 'utf8')
    .replace('  BF.mount = async function mount(options) {', '  BF.__TestWorldEngine = WorldEngine;\n  BF.mount = async function mount(options) {'), f.context);
  for (const name of ['startRoutine', 'updateRoutine', 'noteLocalAutonomousDecision']) f.engine[name] = f.BF.__TestWorldEngine.prototype[name];
  f.engine.character.playRoutine = () => {}; f.engine.navigationRoute = [];
}
function addResearch(f, id, params = {}) {
  f.BF.registerMissionDefinitions([{ id, title: id, priority: 1000,
    root: { id: `${id}:root`, type: 'group', children: [{ id: `${id}:research`, type: 'research', target: 1, params }] } }]);
  f.manager.startMission(id, { primary: true, source: 'player' });
  return f.manager.trees.get(id);
}
function routine(f, tree, clock = 10000) {
  physical(f, tree, clock); f.engine.updateRoutine(clock + 10000);
}
test('foreign research at Crystal cannot synthesize the Temple core; ordinary fan-out is preserved', async () => {
  const f = await fixture(); nativeRoutines(f);
  f.memory.state.missionLifecycle['END-CHOICE'] = { status: 'completed' };
  f.memory.setFact('endChoice:decision', { choiceId: 'return' });
  f.memory.setFact('dip03:temple-map', { mapId: 'temple' });
  f.manager.startMission('FIN-01', { primary: true });
  const fin = f.manager.trees.get('FIN-01');
  for (const s of ['travel', 'archive', 'farewellRocky', 'farewellTranslucent']) {
    const n = fin.find(`FIN-01:${s}`); if (n) f.completeNode(n);
  }
  // Complete actual predecessor leaves without faking the synthesis itself.
  for (const n of fin.availableLeaves()) if (n.id !== 'FIN-01:synthesizeCore') f.completeNode(n);
  fin.refresh();
  assert(fin.availableLeaves().some(n => n.id === 'FIN-01:synthesizeCore'));
  const passive = addResearch(f, 'CONTROL-PASSIVE'); const origin = addResearch(f, 'CONTROL-ORIGIN');
  routine(f, origin);
  assert(origin.root.isComplete); assert(passive.root.isComplete);
  assert.equal(fin.find('FIN-01:synthesizeCore').progress, 0);
  assert.equal(f.BF.getProgressionState().inventory.resonant_navigation_core || 0, 0);
});
test('research fan-out honors duration, required map and real inventory consumption', async () => {
  const f = await fixture(); nativeRoutines(f);
  f.memory.setFact('research-site', { mapId: 'crystal' });
  const slow = addResearch(f, 'CONTROL-LONG', { duration: 9000 });
  const mapped = addResearch(f, 'CONTROL-MAP', { requiredMapFact: 'research-site' });
  const spent = addResearch(f, 'CONTROL-SPEND', { inventoryConsume: [{ inventoryKey: 'wood', quantity: 2 }] });
  const origin = addResearch(f, 'CONTROL-SHORT', { duration: 1500 });
  routine(f, origin);
  assert.equal(slow.root.isComplete, false); assert.equal(mapped.root.isComplete, true);
  assert.equal(spent.root.isComplete, false);
  f.BF.grantInventory('wood', 2); f.manager.currentAction = null;
  routine(f, spent, 40000); assert.equal(spent.root.isComplete, true);
  assert.equal(f.BF.getProgressionState().inventory.wood || 0, 0);
});
async function travel(f, from, to) {
  f.BF.maps[to] ||= { id: to, exits: {} }; f.engine.currentMapId = to; f.engine.discoveredMaps.add(to);
  f.window.dispatchEvent(new f.window.CustomEvent('bluefox:map-transition-completed', { detail:
    { fromMapId: from, toMapId: to, mapId: to, isNew: false, source: 'mission', mode: 'gate' } }));
}
test('FIN-01 → FIN-02: native research grants a core, real capsule click consumes it once, reload preserves integration', async () => {
  const f = await fixture(); nativeRoutines(f);
  f.memory.state.missionLifecycle['END-CHOICE'] = { status: 'completed' };
  f.memory.setFact('endChoice:decision', { choiceId: 'return' });
  f.memory.setFact('dip03:temple-map', { mapId: 'temple' });
  f.manager.startMission('FIN-01', { primary: true }); await travel(f, 'crystal', 'temple');
  const t = f.manager.trees.get('FIN-01'); let clock = 10000;
  for (const [slot, type, scene, persistent] of [
    ['archive', 'tech_relic', 'MSC-CUSTOM-HUGE-TEMPLE'],
    ['farewellRocky', 'npc_rocky', 'MSC-NPC-ROCKY-001', 'DIP-03:delegate:rocky:1'],
    ['farewellTranslucent', 'npc_translucent', 'MSC-NPC-TRANSLUCENT-001', 'DIP-03:delegate:translucent:1']]) {
    f.engine.currentMap.interactables = [physicalObject(f, type, persistent || type, scene, persistent)];
    assert.equal(physical(f, t, clock).nodeId, `FIN-01:${slot}`); clock += 30000;
  }
  routine(f, t, clock); assert(t.root.isComplete);
  assert.equal(f.BF.getProgressionState().inventory.resonant_navigation_core, 1);
  f.manager.startMission('FIN-02', { primary: true }); await travel(f, 'temple', 'crystal');
  const t2 = f.manager.trees.get('FIN-02'), capsule = physicalObject(f, 'crash_capsule', 'capsule');
  f.engine.currentMap.interactables = [capsule];
  for (let i = 0; i < 2; i++) {
    clock += 30000; assert.equal(f.engine.targetInteraction(capsule), true);
    f.engine.updateInteraction(clock); f.engine.updateInteraction(clock + 25000);
  }
  assert.equal(t2.find('FIN-02:integrateCore').progress, 1);
  assert.equal(f.BF.getProgressionState().inventory.resonant_navigation_core || 0, 0);
  assert(f.memory.getFact('fin:capsule-core-integrated'));
  f.memory.flush(true); const memory = new f.M.MissionMemory();
  assert.equal(new f.M.MissionPlanner(memory).restoreOrCreate('FIN-02').find('FIN-02:integrateCore').progress, 1);
  assert(memory.getFact('fin:capsule-core-integrated'));
});
for (const mode of ['no-core', 'wrong-map', 'before-return', 'wrong-object']) {
  test(`capsule integration rejects ${mode}`, async () => {
    const f = await fixture();
    f.memory.state.missionLifecycle['FIN-01'] = { status: 'completed' };
    f.manager.startMission('FIN-02', { primary: true });
    if (mode !== 'before-return') await travel(f, 'temple', 'crystal');
    if (mode !== 'no-core') f.BF.grantInventory('resonant_navigation_core', 1);
    if (mode === 'wrong-map') f.engine.currentMapId = 'elsewhere';
    const o = physicalObject(f, mode === 'wrong-object' ? 'tech_relic' : 'crash_capsule', 'control');
    f.engine.currentMap.interactables = [o];
    f.engine.targetInteraction(o); f.engine.updateInteraction(10000); f.engine.updateInteraction(35000);
    assert.equal(f.manager.trees.get('FIN-02').find('FIN-02:integrateCore').progress, 0);
    assert.equal(f.memory.getFact('fin:capsule-core-integrated', null), null);
    assert.equal(f.BF.getProgressionState().inventory.resonant_navigation_core || 0, mode === 'no-core' ? 0 : 1);
  });
}

test('a routine keeps its origin when currentAction changes before completion', async () => {
  const f = await fixture(); nativeRoutines(f);
  const origin = addResearch(f, 'CONTROL-ORIGINAL', { inventoryConsume: [{ inventoryKey: 'wood', quantity: 2 }] });
  f.BF.grantInventory('wood', 2); physical(f, origin);
  const other = addResearch(f, 'CONTROL-CHANGED', { inventoryConsume: [{ inventoryKey: 'wood', quantity: 3 }] });
  const node = other.find('CONTROL-CHANGED:research');
  f.manager.currentAction = { missionId: other.id, nodeId: node.id, type: node.type, params: node.params };
  f.engine.updateRoutine(20000);
  assert(origin.root.isComplete); assert.equal(other.root.isComplete, false);
  assert.equal(f.manager.currentAction.nodeId, node.id);
});

test('seeing the capsule, including remote discovery, never integrates its core', async () => {
  const f = await fixture(); f.memory.state.missionLifecycle['FIN-01'] = { status: 'completed' };
  f.manager.startMission('FIN-02', { primary: true }); await travel(f, 'temple', 'crystal');
  f.BF.grantInventory('resonant_navigation_core', 1);
  const capsule = physicalObject(f, 'crash_capsule', 'capsule');
  for (const interactionSource of ['manual', 'drone', 'mission-proximity']) {
    f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.OBJECT_SEEN, capsule, { mapId: 'crystal', interactionSource });
  }
  assert.equal(f.manager.trees.get('FIN-02').find('FIN-02:integrateCore').progress, 0);
  assert.equal(f.BF.getProgressionState().inventory.resonant_navigation_core, 1);
});
