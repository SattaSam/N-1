const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { performance } = require('node:perf_hooks');
const source = fs.readFileSync(path.join(__dirname, 'mission-repair.runtime.test.js'), 'utf8');
const makeFixture = new Function('require', '__dirname', source.slice(0, source.indexOf("test('")) + '\nreturn fixture;')(require, __dirname);
const plain = value => JSON.parse(JSON.stringify(value));

function scenario(remoteCount = 0) {
  const f = makeFixture();
  f.engine.currentMapId = 'p4-current';
  const relic = f.BF.ObjectLibrary.list({ status: 'active' }).find(definition => f.runtime.environmentFamilyMatches('RELIC', definition));
  assert(relic);
  const objects = [f.object(relic.type), f.object('electrostatic_storm')];
  objects.forEach((object, index) => { object.userData.instanceId = `p4:${index}`; object.position = { x: index * 10, y: 0, z: 0 }; });
  f.engine.currentMap = { interactables: objects, group: { userData: { microScenes: [] } } };
  f.runtime.captureObservationMap(f.engine);
  const key = f.runtime.observationMemoryKey();
  const initial = plain(f.memory.getFact(key));
  for (let i = 0; i < remoteCount; i++) initial.maps[`remote-${i}`] = {
    ...plain(initial.maps['p4-current']), observableEntityIds: Array.from({ length: 100 }, (_, j) => `remote-${i}:entity-${j}`)
  };
  const restore = () => { f.memory.state.facts[key] = initial; f.events.length = 0; };
  restore();
  const event = { type: 'PHENOMENON_OBSERVED', mapId: f.engine.currentMapId, instanceId: 'p4:0' };
  return { f, initial, key, restore, event };
}

test('P4 nouvelle preuve : ancien protocole isolé, seuils et publication uniques', () => {
  const { f, initial, key, event } = scenario(69), before = JSON.stringify(initial);
  assert.equal(f.runtime.recordObservation(event), true);
  assert.equal(JSON.stringify(initial), before);
  const next = f.memory.getFact(key);
  assert.equal(next.maps['p4-current'].observedEntityIds.length, 1);
  assert(next.mapsReached50.includes('p4-current'));
  assert(!next.mapsReached100.includes('p4-current'));
  assert.equal(f.events.filter(e => e.type === 'bluefox:observation-coverage-changed').length, 1);
  assert.equal(f.runtime.recordObservation(event), false);
  assert.equal(f.memory.getFact(key), next);
  assert.equal(f.events.length, 1);
  assert.equal(f.runtime.recordObservation({ ...event, instanceId: 'p4:1' }), true);
  assert(f.memory.getFact(key).mapsReached100.includes('p4-current'));
  assert.equal(next.maps['p4-current'].observedEntityIds.length, 1);
});

test('P4 observation rejetée : aucune écriture ni publication', () => {
  const { f, initial, key, event } = scenario(69);
  for (const invalid of [{ ...event, mapId: 'remote-0' }, { ...event, instanceId: 'unknown' }, { ...event, type: 'OBJECT_COLLECTED' }]) assert.equal(f.runtime.recordObservation(invalid), false);
  assert.equal(f.memory.getFact(key), initial); assert.equal(f.events.length, 0);
});

test('P4 visite suivante : la map précédente et les compteurs historiques restent isolés', () => {
  const { f, key, event } = scenario(69);
  f.runtime.recordObservation(event);
  const previous = f.memory.getFact(key), before = JSON.stringify(previous);
  f.engine.currentMapId = 'remote-0';
  f.engine.currentMap = { ...f.engine.currentMap };
  assert.equal(f.runtime.recordObservation({ ...event, mapId: 'remote-0' }), true);
  assert.equal(JSON.stringify(previous), before);
  const snapshot = f.memory.snapshot();
  assert.deepEqual(plain(snapshot.facts[key]), plain(f.runtime.observationMemory()));
  snapshot.facts[key].maps['p4-current'].observedEntityIds.push('external');
  assert.equal(JSON.stringify(previous), before);
});

test('P4 résolution mise en cache : aucune nouvelle énumération pour les doublons', () => {
  const { f, event } = scenario(69);
  f.runtime.recordObservation(event);
  let scans = 0;
  const original = f.engine.currentMap.interactables;
  Object.defineProperty(f.engine.currentMap, 'interactables', { get() { scans++; return original; } });
  for (let i = 0; i < 600; i++) assert.equal(f.runtime.recordObservation(event), false);
  assert.equal(scans, 0);
});

test('P4 preuve ENV physique et save/reload restent idempotents', () => {
  const { f, key, event } = scenario(69);
  const family = Object.keys(f.runtime.observationMemory().maps['p4-current'].envFamilies).find(name =>
    f.runtime.observationMemory().maps['p4-current'].envFamilies[name].eligibleInstanceIds.includes(event.instanceId));
  assert(family);
  f.runtime.recordObservation(event);
  assert.equal(f.runtime.environmentMapCoverage('p4-current', family).observed, 1);
  assert.equal(f.memory.flush(true), true);
  const reloaded = new f.M.MissionMemory();
  assert.deepEqual(plain(reloaded.getFact(key)), plain(f.memory.getFact(key)));
  f.manager.memory = reloaded;
  assert.equal(f.runtime.recordObservation(event), false);
  assert.equal(f.runtime.environmentMapCoverage('p4-current', family).observed, 1);
});

class Vec3 {
  constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
  set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
  copy(v) { return this.set(v.x, v.y, v.z); }
  clone() { return new Vec3(this.x, this.y, this.z); }
  sub(v) { return this.set(this.x - v.x, this.y - v.y, this.z - v.z); }
  add(v) { return this.addScaledVector(v, 1); }
  addScaledVector(v, s) { return this.set(this.x + v.x * s, this.y + v.y * s, this.z + v.z * s); }
  multiplyScalar(s) { return this.set(this.x * s, this.y * s, this.z * s); }
  lengthSq() { return this.dot(this); }
  length() { return Math.sqrt(this.lengthSq()); }
  normalize() { return this.multiplyScalar(1 / (this.length() || 1)); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  distanceToSquared(v) { return (this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2; }
  distanceTo(v) { return Math.sqrt(this.distanceToSquared(v)); }
  lerp(v, s) { return this.set(this.x + (v.x - this.x) * s, this.y + (v.y - this.y) * s, this.z + (v.z - this.z) * s); }
}
function movement() {
  const f = makeFixture();
  f.BF.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  f.BF.damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
  f.BF.dampAngle = (a, b, rate, dt) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * (1 - Math.exp(-rate * dt));
  f.load('engine/path-planner.js'); f.load('engine/character-controller.js');
  const THREE = { Vector3: Vec3, MathUtils: { smoothstep(x, a, b) { const t = f.BF.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); } } };
  const character = new f.BF.CharacterController(THREE, { position: new Vec3(), rotation: { y: 0 } }, { rotation: { y: 0 } }, { update() {} }, []);
  character.colliders = Array.from({ length: 100 }, (_, i) => ({ position: new Vec3(-20 + i % 10, 0, 12 + Math.floor(i / 10)), radius: 0.4 }));
  let plans = 0, lineChecks = 0;
  for (const name of ['plan', 'lineIsClear']) {
    const original = character.pathPlanner[name];
    character.pathPlanner[name] = function (...args) { if (name === 'plan') plans++; else lineChecks++; return original.apply(this, args); };
  }
  assert.equal(character.setTarget(new Vec3(15, 0, 0)), true);
  const before = plans, start = performance.now();
  for (let i = 0; i < 600; i++) character.update(1 / 60);
  return { plans, tickPlans: plans - before, lineChecks, totalMs: performance.now() - start, distance: character.root.position.distanceTo(new Vec3(15, 0, 0)) };
}
test('P4 trajet ordinaire : contrôleur et PathPlanner réels sans replanification par frame', () => {
  const result = movement(); assert.equal(result.tickPlans, 0); assert(result.distance < 0.2);
});

test('P4 mouvement WorldEngine : aucune autorité globale rescannée pendant le trajet', () => {
  const f = makeFixture(), vm = require('node:vm');
  const marker = '  BF.mount = async function mount(options) {';
  const source = fs.readFileSync(path.join(__dirname, '../engine/world-engine.js'), 'utf8');
  assert(source.includes(marker));
  vm.runInContext(source.replace(marker, '  BF.P4WorldEngine = WorldEngine;\n' + marker), f.context);
  const engine = Object.create(f.BF.P4WorldEngine.prototype); let globalScans = 0;
  Object.assign(engine, { autonomyAllowed: () => true, character: { speed: 2, root: { position: new Vec3() }, target: new Vec3(15, 0, 0) }, lastActivityAt: 0, lastAutonomyAt: 0,
    missionManager: { hasPrimaryMissionAuthority: () => false, pendingPlayerActionReturn: () => false, hasMissionExecutionAuthority() { globalScans++; return true; } } });
  for (let i = 0; i < 600; i++) { engine.updateAutonomy(20000 + i * 16); engine.ensureActivity(20000 + i * 16); }
  assert.equal(globalScans, 0);
});

test('P4 tick occupé et différé : aucune planification ou revue des priorités', () => {
  for (const mode of ['busy', 'deferred', 'action']) {
    const f = makeFixture(); let scans = 0;
    f.manager.lastPlanAt = 0; f.manager.lastPriorityReviewAt = 10000;
    f.manager.applyPendingTransitions = () => {};
    f.manager.selectBestPrimary = () => { scans++; };
    f.manager.playerActionReturnWork = () => { scans++; };
    f.manager.bridge.isEngineBusy = () => true;
    if (mode === 'deferred') f.manager.retryAfter = 20000;
    if (mode === 'action') f.manager.currentAction = { issuedAt: Date.now() };
    for (let i = 0; i < 600; i++) f.manager.update(10000 + i);
    assert.equal(scans, 0);
  }
});

function benchmark() {
  const results = [];
  for (const remoteCount of [0, 69, 500]) {
    const { f, initial, restore, event } = scenario(remoteCount);
    const times = [];
    for (let i = 0; i < 180; i++) {
      restore(); const start = performance.now(); f.runtime.recordObservation(event);
      const elapsed = performance.now() - start; if (i >= 30) times.push(elapsed);
    }
    times.sort((a, b) => a - b);
    const original = f.window.JSON;
    let copies = 0, copiedBytes = 0;
    f.window.JSON = { parse: original.parse, stringify(value, ...rest) {
      const result = original.stringify(value, ...rest); copies++; copiedBytes += Buffer.byteLength(result); return result;
    } };
    restore(); f.runtime.recordObservation(event);
    const newProof = { copies, copiedBytes };
    copies = copiedBytes = 0;
    for (let i = 0; i < 600; i++) f.runtime.recordObservation(event);
    results.push({ remoteCount, protocolBytes: Buffer.byteLength(JSON.stringify(initial)), medianMs: times[75], p95Ms: times[142], newProof, duplicate600: { copies, copiedBytes } });
    f.window.JSON = original;
  }
  const f = makeFixture(), samples = [];
  for (let i = 0; i < 80; i++) { const start = performance.now(); f.manager.getState(); if (i >= 20) samples.push(performance.now() - start); }
  samples.sort((a, b) => a - b);
  results.push({ snapshot: { missionTrees: f.manager.trees.size, medianMs: samples[30], p95Ms: samples[57] }, movement: movement() });
  console.log(JSON.stringify(results));
}
if (process.env.BLUEFOX_P4_BENCH === '1') benchmark();
