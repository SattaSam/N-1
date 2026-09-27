const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const WORLD_FILE = path.join(ROOT, 'engine', 'world-engine.js');
const ENV_FILE = path.join(ROOT, 'engine', 'environment-geometry-fix.js');
const worldSource = fs.readFileSync(WORLD_FILE, 'utf8');
const envSource = fs.readFileSync(ENV_FILE, 'utf8');

class Vec3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(other) { this.x = other.x; this.y = other.y; this.z = other.z; return this; }
  clone() { return new Vec3(this.x, this.y, this.z); }
  distanceTo(other) { return Math.hypot(this.x - other.x, this.y - other.y, this.z - other.z); }
}

function exposeWorldEngine(source, BF) {
  const marker = '  BF.mount = async function mount(options) {';
  assert.ok(source.includes(marker), 'WorldEngine mount marker missing');
  const instrumented = source.replace(
    marker,
    '  BF.__CpuBoundaryWorldEngine = WorldEngine;\n' + marker
  );
  const window = { BlueFox3D: BF };
  const context = vm.createContext({
    window,
    console,
    performance: { now: () => 1000 },
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout() {},
    CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    document: { visibilityState: 'visible' },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
  });
  vm.runInContext(instrumented, context, { filename: WORLD_FILE });
  return BF.__CpuBoundaryWorldEngine;
}

function makeCharacter(start = new Vec3()) {
  const root = { position: start.clone() };
  const target = start.clone();
  const lastSafePosition = start.clone();
  return {
    root,
    target,
    lastSafePosition,
    constrainCalls: 0,
    constrainToWalkable(position) {
      this.constrainCalls += 1;
      position.x = Math.max(-5, Math.min(5, position.x));
      position.z = Math.max(-5, Math.min(5, position.z));
      return position;
    },
    setTarget(position) { this.target.copy(position); return true; },
    facePoint() {},
    stop() {}
  };
}

test('EnvironmentGeometryFix conserve les contours/portails/panorama mais supprime le garde RAF permanent', () => {
  for (const token of [
    'const buildMapContourRegions =',
    'character.setWalkableRegions(contourRegions);',
    'const refreshGates =',
    'const applyPanoramaGeometry =',
    'loadMapWithGeometryFix'
  ]) assert.ok(envSource.includes(token), `missing preserved capability: ${token}`);
  assert.doesNotMatch(envSource, /const boundaryGuard\s*=|requestAnimationFrame\(boundaryGuard\)/);
});

test('les écritures physiques directes WorldEngine sont contraintes avant synchronisation cible', () => {
  const directWrites = [
    'this.character.root.position.set(saved.x, 0, saved.z);',
    'this.character.root.position.copy(previousPosition);',
    'this.character.root.position.set(spawn.x, 0, spawn.z);'
  ];
  for (const write of directWrites) {
    let offset = 0;
    let found = 0;
    while ((offset = worldSource.indexOf(write, offset)) >= 0) {
      found += 1;
      const block = worldSource.slice(offset, offset + 320);
      const constrainAt = block.indexOf('this.character.constrainToWalkable(this.character.root.position);');
      const targetAt = block.indexOf('this.character.setTarget(this.character.root.position);');
      assert.ok(constrainAt > 0, `missing clamp after ${write}`);
      assert.ok(targetAt > constrainAt, `target synchronized before clamp after ${write}`);
      offset += write.length;
    }
    assert.ok(found > 0, `direct write not found: ${write}`);
  }
});

test('la cinématique finale conserve son déplacement direct volontaire', () => {
  assert.match(worldSource, /root\.position\.lerpVectors\(state\.start, state\.inside, eased\);/);
  const start = worldSource.indexOf('root.position.lerpVectors(state.start, state.inside, eased);');
  const block = worldSource.slice(start - 240, start + 300);
  assert.match(block, /Déplacement cinématique volontairement direct/);
  assert.doesNotMatch(block, /constrainToWalkable/);
});

test('EnvironmentGeometryFix rétablit le contour au montage et après loadMap sans planifier de RAF', async () => {
  let rafCalls = 0;
  const character = makeCharacter(new Vec3(50, 0, -50));
  character.finalTarget = new Vec3(50, 0, -50);
  character.setWalkableRegions = function setWalkableRegions(regions) {
    this.walkableRegions = regions;
  };
  const engine = {
    character,
    currentMapId: 'map-a',
    currentMap: {
      walkableRegions: [{ minX: -5, maxX: 5, minZ: -5, maxZ: 5 }],
      gates: []
    },
    discoveredMaps: new Set(['map-a']),
    panorama: null,
    async loadMap() { return true; }
  };
  const BF = {
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    maps: { 'map-a': { id: 'map-a' } },
    async mount() { return engine; }
  };
  const window = {
    BlueFox3D: BF,
    document: { createElement() { throw new Error('no gate labels expected'); } },
    addEventListener() {},
    requestAnimationFrame() { rafCalls += 1; return rafCalls; },
    console
  };
  const context = vm.createContext({ window, console });
  vm.runInContext(envSource, context, { filename: ENV_FILE });
  const mounted = await BF.mount({});
  assert.equal(mounted, engine);
  assert.deepEqual([character.root.position.x, character.root.position.z], [5, -5]);
  assert.equal(rafCalls, 0, 'geometry fix must not own a permanent RAF loop');
  character.root.position.set(80, 0, 80);
  await engine.loadMap('map-a');
  assert.deepEqual([character.root.position.x, character.root.position.z], [5, 5]);
  assert.equal(rafCalls, 0);
});

test('transition directe contraint réellement un spawn hors contour avant target/lastSafe', async () => {
  const BF = { maps: { old: {}, target: {} } };
  const WorldEngine = exposeWorldEngine(worldSource, BF);
  const engine = Object.create(WorldEngine.prototype);
  engine.THREE = { Vector3: Vec3 };
  engine.currentMapId = 'old';
  engine.transitioning = false;
  engine.discoveredMaps = new Set(['old', 'target']);
  engine.character = makeCharacter(new Vec3(1, 0, 1));
  engine.beginCanonicalMapTransition = () => ({ preservedCameraView: null });
  engine.releaseCanonicalMapTransition = () => { engine.transitioning = false; };
  engine.loadMap = async (mapId) => { engine.currentMapId = mapId; return true; };
  engine.safeTeleportArrival = () => ({ x: 99, z: -99 });
  engine.completeCanonicalMapTransition = async () => true;
  engine.cameraController = { restoreViewState: () => true, resetBehindCharacter() {} };
  engine.explorationRelocationGuard = null;
  engine.pendingGate = null;
  engine.lastActivityAt = 0;
  engine.lastAutonomyAt = 0;

  const ok = await engine.transitionToKnownMap('target', {
    targetAnchor: { x: 0, z: 0 },
    source: 'test', mode: 'teleport'
  });
  assert.equal(ok, true);
  assert.deepEqual([engine.character.root.position.x, engine.character.root.position.z], [5, -5]);
  assert.deepEqual([engine.character.target.x, engine.character.target.z], [5, -5]);
  assert.deepEqual([engine.character.lastSafePosition.x, engine.character.lastSafePosition.z], [5, -5]);
  assert.ok(engine.character.constrainCalls >= 1);
});

test('rollback d’une transition directe rétablit une position contrainte', async () => {
  const BF = { maps: { old: {}, target: {} } };
  const WorldEngine = exposeWorldEngine(worldSource, BF);
  const engine = Object.create(WorldEngine.prototype);
  engine.THREE = { Vector3: Vec3 };
  engine.currentMapId = 'old';
  engine.transitioning = false;
  engine.discoveredMaps = new Set(['old', 'target']);
  engine.character = makeCharacter(new Vec3(9, 0, 9));
  engine.beginCanonicalMapTransition = () => ({ preservedCameraView: null });
  engine.releaseCanonicalMapTransition = () => { engine.transitioning = false; };
  engine.loadMap = async (mapId) => { engine.currentMapId = mapId; return true; };
  engine.safeTeleportArrival = () => null;
  engine.completeCanonicalMapTransition = async () => true;
  engine.cameraController = { restoreViewState: () => true, resetBehindCharacter() {} };
  engine.explorationRelocationGuard = null;

  const ok = await engine.transitionToKnownMap('target', { source: 'test', mode: 'teleport' });
  assert.equal(ok, false);
  assert.equal(engine.currentMapId, 'old');
  assert.deepEqual([engine.character.root.position.x, engine.character.root.position.z], [5, 5]);
  assert.deepEqual([engine.character.target.x, engine.character.target.z], [5, 5]);
  assert.deepEqual([engine.character.lastSafePosition.x, engine.character.lastSafePosition.z], [5, 5]);
});

test('passage de gate contraint réellement l’arrivée hors contour avant target/lastSafe', async () => {
  const BF = { maps: { old: {}, target: {} } };
  const WorldEngine = exposeWorldEngine(worldSource, BF);
  const engine = Object.create(WorldEngine.prototype);
  engine.THREE = { Vector3: Vec3 };
  engine.currentMapId = 'old';
  engine.transitioning = false;
  engine.autonomyMode = 'full';
  engine.discoveredMaps = new Set(['old', 'target']);
  engine.navigationRoute = [];
  engine.returningToBase = false;
  engine.persistentNavigationIntent = null;
  engine.character = makeCharacter(new Vec3(1, 0, 1));
  engine.canStartAutonomousGate = () => true;
  engine.canDiscoverMap = () => true;
  engine.beginCanonicalMapTransition = () => ({ preservedCameraView: null });
  engine.releaseCanonicalMapTransition = () => { engine.transitioning = false; };
  engine.loadMap = async (mapId) => { engine.currentMapId = mapId; return true; };
  engine.safeEntryPosition = () => ({ x: 99, z: 99 });
  engine.completeCanonicalMapTransition = async () => true;
  engine.ensureUniqueMapName = () => {};
  engine.saveDiscovery = () => {};
  engine.narrativeMapName = (id) => id;
  engine.callbacks = { onStatus() {}, onAction() {}, onMapDiscovered() {} };
  engine.pendingGate = null;
  engine.lastActivityAt = 0;
  engine.lastAutonomyAt = 0;
  const gate = { userData: { exit: { targetMap: 'target', targetEntry: 'west' } } };

  await engine.crossGate(gate);
  assert.deepEqual([engine.character.root.position.x, engine.character.root.position.z], [5, 5]);
  assert.deepEqual([engine.character.target.x, engine.character.target.z], [5, 5]);
  assert.deepEqual([engine.character.lastSafePosition.x, engine.character.lastSafePosition.z], [5, 5]);
  assert.ok(engine.character.constrainCalls >= 1);
});

test('les capacités WorldEngine hors périmètre restent présentes', () => {
  for (const token of [
    'restoreDiscovery() {',
    'saveDiscovery() {',
    'async generateUnknownPassage(',
    'async transitionToKnownMap(',
    'async crossGate(gate) {',
    'navigateNextRouteStep() {',
    'autonomyAllowed(now = performance.now()) {',
    'beginFinalCapsuleSequence(options = {}) {'
  ]) assert.ok(worldSource.includes(token), `missing preserved WorldEngine capability: ${token}`);
});
