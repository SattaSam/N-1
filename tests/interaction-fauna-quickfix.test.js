const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('fog_bank reste missionnellement cliquable mais avec une hitbox centrale réduite', () => {
  const source = read('engine/object-library.js');
  const start = source.indexOf('} else if (type === "fog_bank")');
  const end = source.indexOf('} else if (type === "submerged_ruins")', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /makeHitbox\(THREE, root, 1\.35, 1\.6, type\)/);
  assert.doesNotMatch(block, /makeHitbox\(THREE, root, 4\.8, 2\.6, type\)/);
  assert.match(source, /type: "fog_bank", label: "Banc de brouillard"/);
  assert.match(source, /type: "fog_bank"[^\n]*actions: \["observe", "analyze", "avoid", "traverse"\][^\n]*inspectable: true/);
});

test('Roche XL réduit uniquement sa hitbox de clic et garde son collider physique', () => {
  const source = read('engine/object-library.js');
  assert.match(source, /const radius = type === "large_rock" \? 2\.35 : 1\.25;/);
  assert.match(source, /const hitboxRadius = type === "large_rock" \? 1\.5 : radius;/);
  assert.match(source, /const hitboxHeight = type === "large_rock" \? 2\.6 : 2\.1;/);
  assert.match(source, /hitbox = makeHitbox\(THREE, root, hitboxRadius, hitboxHeight, type\);/);
  assert.match(source, /colliders = \[\{ offset: new THREE\.Vector3\(\), radius \}\];/);
});

test('fauna forage/play avance sur un axe sans orbite ni rotation temporelle continue', () => {
  const source = read('engine/fauna-runtime.js');
  assert.doesNotMatch(source, /Math\.cos\(state\.forageDirection \+ elapsed \* pace\)/);
  assert.doesNotMatch(source, /Math\.sin\(state\.forageDirection \+ elapsed \* pace\)/);
  assert.doesNotMatch(source, /state\.anchor\.rotation\.y \+ state\.forageDirection \+ elapsed \* pace \+ Math\.PI \/ 2/);
  assert.match(source, /const targetX = anchor\.x \+ Math\.cos\(state\.forageDirection\) \* travel;/);
  assert.match(source, /const targetZ = anchor\.z \+ Math\.sin\(state\.forageDirection\) \* travel;/);
  assert.match(source, /const targetYaw = Math\.atan2\(dx, dz\);/);
  assert.match(source, /root\.rotation\.y \+= clamp\(yawDelta, -0\.12, 0\.12\);/);
});

test('les comportements faune voisins validés restent présents', () => {
  const source = read('engine/fauna-runtime.js');
  for (const token of [
    'state.state === "flee"',
    'state.state === "protect" && state.parentalYoung',
    'updateToolUse(state, elapsed)',
    '"cautious_approach"',
    '"parental_protect"',
    '"tool_use_cycle"'
  ]) assert.ok(source.includes(token), `contrat voisin absent: ${token}`);
});

test('runtime fauna: forage reste directionnel et la rotation ne saute plus en continu', () => {
  const vm = require('node:vm');
  let nowMs = 1;
  let frameCallback = null;
  let createHook = null;

  class V3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    clone() { return new V3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  }
  const rotation = () => ({ x: 0, y: 0, z: 0, clone() { return { ...this, clone: this.clone, copy: this.copy }; }, copy(v) { this.x=v.x; this.y=v.y; this.z=v.z; return this; } });
  const scale = () => ({ x: 1, y: 1, z: 1, clone() { return { ...this, clone: this.clone, copy: this.copy }; }, copy(v) { this.x=v.x; this.y=v.y; this.z=v.z; return this; } });
  const rootObject = {
    position: new V3(0, 0, 0), rotation: rotation(), scale: scale(),
    children: [], userData: {}, visible: true, parent: {}, traverse() {}
  };
  const BF = {
    ObjectLibrary: {
      create() {},
      list({ category } = {}) { return category === 'fauna' ? [{ type: 'fun_creature' }] : []; },
      registerCreateHook(fn) { createHook = fn; }
    },
    currentEngine: null
  };
  const sandbox = {
    window: {
      BlueFox3D: BF,
      performance: { now: () => nowMs },
      requestAnimationFrame(fn) { frameCallback = fn; return 1; }
    },
    performance: { now: () => nowMs }, Date, Math, Object, Array, Set, Map, WeakMap,
    console: { info() {}, error() {}, warn() {} }
  };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(read('engine/fauna-runtime.js'), vm.createContext(sandbox), { filename: 'fauna-runtime.js' });
  assert.equal(typeof createHook, 'function');
  createHook({ root: rootObject, definition: { type: 'fun_creature' } }, { type: 'fun_creature' });
  assert.equal(BF.FaunaRuntime.setState(rootObject, 'forage'), true);
  assert.equal(typeof frameCallback, 'function');

  const samples = [];
  for (const t of [1001, 2001, 3001]) {
    nowMs = t;
    const beforeYaw = rootObject.rotation.y;
    const cb = frameCallback;
    cb();
    samples.push({ x: rootObject.position.x, z: rootObject.position.z, yaw: rootObject.rotation.y, dyaw: rootObject.rotation.y - beforeYaw });
  }
  assert.ok(samples.some(({ x, z }) => Math.hypot(x, z) > 0.02), 'la créature doit réellement se déplacer');
  samples.forEach(({ dyaw }) => assert.ok(Math.abs(dyaw) <= 0.1200001, `rotation trop brutale: ${dyaw}`));
  const cross = samples[0].x * samples[2].z - samples[0].z * samples[2].x;
  assert.ok(Math.abs(cross) < 1e-8, `la trajectoire doit rester axiale, cross=${cross}`);
});
