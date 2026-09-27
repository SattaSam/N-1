const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function storage() {
  const map = new Map();
  return {
    getItem(k){ return map.has(k) ? map.get(k) : null; },
    setItem(k,v){ map.set(k, String(v)); },
    removeItem(k){ map.delete(k); },
    key(i){ return [...map.keys()][i] || null; },
    get length(){ return map.size; }
  };
}

function loadWorldEngine() {
  let source = fs.readFileSync(path.join(ROOT, 'engine', 'world-engine.js'), 'utf8');
  source = source.replace(
    '  BF.mount = async function mount(options) {',
    '  BF.__WorldEngine = WorldEngine;\n  BF.mount = async function mount(options) {'
  );
  const localStorage = storage();
  const context = {
    window: null,
    localStorage,
    performance: { now: () => 1000 },
    CustomEvent: class CustomEvent { constructor(type, init={}) { this.type=type; this.detail=init.detail; } },
    setTimeout: () => 0,
    clearTimeout: () => {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    document: {
      body:{ classList:{add(){},remove(){}}, append(){}, querySelector(){return null} },
      documentElement:{ classList:{add(){},remove(){}} },
      addEventListener(){}, removeEventListener(){}, getElementById(){return null}
    },
    console
  };
  context.window = context;
  context.addEventListener = () => {};
  context.removeEventListener = () => {};
  context.dispatchEvent = () => {};
  context.BlueFox3D = {
    maps: {},
    clamp: (v,a,b) => Math.max(a, Math.min(b,v)),
    resolveBibleNavigationSuggestion: () => null,
    getSurvivalState: () => ({ needs: {} })
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename:'world-engine.js' });
  return { WorldEngine: context.BlueFox3D.__WorldEngine, BF: context.BlueFox3D, localStorage };
}

function makeEngine(WorldEngine) {
  const engine = Object.create(WorldEngine.prototype);
  engine.currentMapId = 'A';
  engine.transitioning = false;
  engine.pendingInteraction = null;
  engine.currentRoutine = null;
  engine.pendingGate = null;
  engine.pendingTeleport = null;
  engine.navigationRoute = [];
  engine.navigationAllowsTeleport = false;
  engine.persistentNavigationIntent = {
    mapId:'B', direction:null, discoverUnknown:false,
    source:'player', missionId:null, allowTeleportOptimization:false,
    requestedAt:Date.now(), retryAfter:0
  };
  engine.missionManager = { currentAction: null };
  engine.findKnownRoute = () => ['A','B'];
  engine.findOptimalRoute = () => ['A','B'];
  engine.persistNavigationIntent = () => true;
  engine.clearPersistentNavigationIntent = function(){ this.persistentNavigationIntent = null; };
  engine.returnToBase = () => {};
  engine.generateUnknownPassage = () => {};
  let navigations = 0;
  engine.navigateNextRouteStep = () => { navigations += 1; };
  return { engine, navigations: () => navigations };
}

test('navigation persistante reprend normalement hors fatigue critique', () => {
  const {WorldEngine, BF} = loadWorldEngine();
  BF.getSurvivalState = () => ({ needs: {} });
  const h = makeEngine(WorldEngine);
  assert.equal(h.engine.resumePersistentNavigation(), true);
  assert.equal(h.navigations(), 1);
  assert.deepEqual(Array.from(h.engine.navigationRoute), ['B']);
  assert.equal(h.engine.persistentNavigationIntent.mapId, 'B');
});

test('criticalRest differe la reprise sans perdre intention ni route existante', () => {
  const {WorldEngine, BF} = loadWorldEngine();
  BF.getSurvivalState = () => ({ needs: { criticalRest:true } });
  const h = makeEngine(WorldEngine);
  h.engine.navigationRoute = [];
  const intent = h.engine.persistentNavigationIntent;
  assert.equal(h.engine.resumePersistentNavigation(), false);
  assert.equal(h.navigations(), 0);
  assert.deepEqual(Array.from(h.engine.navigationRoute), []);
  assert.equal(h.engine.persistentNavigationIntent, intent);
  assert.equal(h.engine.persistentNavigationIntent.mapId, 'B');
});

test('action atomique et transition gardent leurs verrous historiques', () => {
  const {WorldEngine, BF} = loadWorldEngine();
  BF.getSurvivalState = () => ({ needs: {} });
  const atomic = makeEngine(WorldEngine);
  atomic.engine.missionManager.currentAction = { type:'collect' };
  assert.equal(atomic.engine.resumePersistentNavigation(), false);
  assert.equal(atomic.navigations(), 0);
  const transition = makeEngine(WorldEngine);
  transition.engine.transitioning = true;
  assert.equal(transition.engine.resumePersistentNavigation(), false);
  assert.equal(transition.navigations(), 0);
});

test('la meme intention reprend apres disparition du criticalRest', () => {
  const {WorldEngine, BF} = loadWorldEngine();
  let critical = true;
  BF.getSurvivalState = () => ({ needs: critical ? { criticalRest:true } : {} });
  const h = makeEngine(WorldEngine);
  const intent = h.engine.persistentNavigationIntent;
  assert.equal(h.engine.resumePersistentNavigation(), false);
  assert.equal(h.engine.persistentNavigationIntent, intent);
  critical = false;
  assert.equal(h.engine.resumePersistentNavigation(), true);
  assert.equal(h.navigations(), 1);
  assert.deepEqual(Array.from(h.engine.navigationRoute), ['B']);
  assert.equal(h.engine.persistentNavigationIntent, intent);
});

test('optimisation TP historique reste active hors criticalRest et ne demarre pas pendant criticalRest', () => {
  const {WorldEngine, BF} = loadWorldEngine();
  let critical = false;
  BF.getSurvivalState = () => ({ needs: critical ? { criticalRest:true } : {} });
  const h = makeEngine(WorldEngine);
  h.engine.persistentNavigationIntent.allowTeleportOptimization = true;
  let optimalCalls = 0;
  let physicalCalls = 0;
  h.engine.findOptimalRoute = () => { optimalCalls += 1; return ['A','B']; };
  h.engine.findKnownRoute = () => { physicalCalls += 1; return ['A','B']; };
  assert.equal(h.engine.resumePersistentNavigation(), true);
  assert.equal(optimalCalls, 1);
  assert.equal(physicalCalls, 0);
  assert.equal(h.engine.navigationAllowsTeleport, true);

  const blocked = makeEngine(WorldEngine);
  blocked.engine.persistentNavigationIntent.allowTeleportOptimization = true;
  blocked.engine.findOptimalRoute = () => { throw new Error('route should not be computed while critical'); };
  critical = true;
  assert.equal(blocked.engine.resumePersistentNavigation(), false);
  assert.equal(blocked.navigations(), 0);
  assert.equal(blocked.engine.persistentNavigationIntent.mapId, 'B');
});
