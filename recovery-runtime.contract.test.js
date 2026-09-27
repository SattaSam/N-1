const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(ROOT, 'engine', name), 'utf8');

function storage() {
  const map = new Map();
  return {
    getItem(k){ return map.has(k) ? map.get(k) : null; },
    setItem(k,v){ map.set(k, String(v)); },
    removeItem(k){ map.delete(k); },
    key(i){ return [...map.keys()][i] || null; },
    get length(){ return map.size; },
    _map: map
  };
}

function loadWorldEngine(localStorage) {
  let source = read('world-engine.js');
  source = source.replace(
    '  BF.mount = async function mount(options) {',
    '  BF.__WorldEngine = WorldEngine;\n  BF.mount = async function mount(options) {'
  );
  const events = [];
  const context = {
    window: null,
    localStorage,
    performance: { now: () => 1000 },
    CustomEvent: class CustomEvent { constructor(type, init={}) { this.type=type; this.detail=init.detail; } },
    setTimeout: () => 0,
    clearTimeout: () => {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    document: { body:{classList:{add(){},remove(){}},append(){},querySelector(){return null}}, documentElement:{classList:{add(){},remove(){}}}, addEventListener(){}, removeEventListener(){}, getElementById(){return null} },
    console,
  };
  context.window = context;
  context.addEventListener = () => {};
  context.removeEventListener = () => {};
  context.dispatchEvent = (e) => events.push(e);
  context.BlueFox3D = {
    maps: {},
    clamp: (v,a,b) => Math.max(a, Math.min(b,v)),
    resolveBibleNavigationSuggestion: () => null
  };
  vm.createContext(context);
  vm.runInContext(source, context, {filename:'world-engine.js'});
  return { WorldEngine: context.BlueFox3D.__WorldEngine, context, events };
}

test('directive joueur B: persiste pendant action atomique puis part avant nouvelle décision', () => {
  const ls = storage();
  const {WorldEngine} = loadWorldEngine(ls);
  const engine = Object.create(WorldEngine.prototype);
  engine.currentMapId = 'A';
  engine.transitioning = false;
  engine.pendingInteraction = null;
  engine.currentRoutine = null;
  engine.pendingGate = null;
  engine.navigationRoute = [];
  engine.persistentNavigationIntent = null;
  engine.missionManager = { currentAction: { type:'collect' } };
  engine.callbacks = { onStatus(){} };
  let navigations = 0;
  engine.findKnownRoute = () => ['A','B'];
  engine.navigateNextRouteStep = () => { navigations += 1; };

  engine.handleNavigationSuggestion({mapId:'B'});
  assert.equal(navigations, 0, 'ne doit pas interrompre l action atomique');
  assert.equal(engine.persistentNavigationIntent.mapId, 'B');
  assert.ok(ls.getItem('bluefox_navigation_intent_v1'));

  engine.missionManager.currentAction = null;
  assert.equal(engine.resumePersistentNavigation(), true);
  assert.equal(navigations, 1);
  assert.deepEqual(Array.from(engine.navigationRoute), ['B']);
  assert.ok(ls.getItem('bluefox_navigation_intent_v1'), 'reste persistante jusqu a realisation');
});

test('directive joueur survit a un reload runtime', () => {
  const ls = storage();
  const first = loadWorldEngine(ls).WorldEngine;
  const a = Object.create(first.prototype);
  a.persistentNavigationIntent = null;
  a.setPersistentNavigationIntent({mapId:'B'});

  const second = loadWorldEngine(ls).WorldEngine;
  const b = Object.create(second.prototype);
  const restored = b.restorePersistentNavigationIntent();
  assert.equal(restored.mapId, 'B');
  assert.ok(restored.requestedAt > 0);
});

test('ordre runtime: reprise directive avant MissionManager puis BAC', () => {
  const source = read('world-engine.js');
  const start = source.indexOf('    update(dt, now) {');
  const end = source.indexOf('    loop() {', start);
  const update = source.slice(start, end);
  const resume = update.indexOf('this.resumePersistentNavigation();');
  const mission = update.indexOf('this.missionManager?.update(now);');
  const bac = update.indexOf('this.updateAutonomy(now);');
  assert.ok(resume >= 0 && mission >= 0 && bac >= 0);
  assert.ok(resume < mission, 'directive joueur avant nouvelle planification missionnelle');
  assert.ok(mission < bac, 'MissionManager reste avant autonomie BAC');
});

test('pathfinding: absence de chemin devient un echec explicite', () => {
  let source = read('character-controller.js');
  source = source.replace(
    '  BF.CharacterController = CharacterController;',
    '  BF.__CharacterController = CharacterController;\n  BF.CharacterController = CharacterController;'
  );
  const dispatched = [];
  const context = {
    window:null,
    performance:{now:()=>1000},
    CustomEvent: class CustomEvent { constructor(type, init={}) { this.type=type; this.detail=init.detail; } },
    console,
    BlueFox3D:{ clamp:(v,a,b)=>Math.max(a,Math.min(b,v)), dampAngle:(a)=>a, damp:(a)=>a }
  };
  context.window=context;
  context.dispatchEvent=(e)=>dispatched.push(e);
  vm.createContext(context);
  vm.runInContext(source, context, {filename:'character-controller.js'});
  const C = context.BlueFox3D.__CharacterController;
  const vec = (x=0,y=0,z=0) => ({x,y,z, clone(){return vec(this.x,this.y,this.z)}, copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}});
  const obj = Object.create(C.prototype);
  obj.pathPlanner = { plan: () => null };
  obj.root = { position: vec(0,0,0) };
  obj.finalTarget = vec(5,0,5);
  obj.colliders = [];
  obj.radius = 0.4;
  obj.stop = function(){ this.stopped = true; };
  assert.equal(obj.rebuildPath(), false);
  assert.equal(obj.stopped, true);
  assert.equal(dispatched.at(-1).type, 'bluefox:navigation-failed');
  assert.equal(dispatched.at(-1).detail.reason, 'no-path');
  assert.match(read('path-planner.js'), /return null;\s*\n\s*}\s*\n\s*\n\s*smooth\(/);
});

test('BAC: une survie tutorielle explicitement débloquée peut interrompre une primaire, sinon la primaire reste propriétaire', () => {
  const source = read('behavior-arbitration-integration.js');
  assert.match(source, /const primaryMissionOwnsAction\s*=\s*\n\s*this\.missionManager\?\.hasPrimaryMissionAuthority\?\.\(\) === true;/);
  assert.match(source, /const tutorialMicroRestUnlocked = Boolean\(/);
  assert.match(source, /isTutorialSurvivalCapabilityUnlocked\?\.\("micro-rest"\) === true/);
  assert.match(source, /const tutorialAutonomousRestUnlocked = Boolean\(/);
  assert.match(source, /isTutorialSurvivalCapabilityUnlocked\?\.\("autonomous-rest"\) === true/);
  assert.match(source, /!primaryMissionOwnsAction \|\|\s*tutorialRationConsumeUnlocked \|\|\s*tutorialMicroRestUnlocked \|\|\s*tutorialAutonomousRestUnlocked/);
  assert.match(source, /primaryMissionOwnsAction\s*&&\s*rationCandidate\?\.allowDuringPrimaryMission !== true[\s\S]{0,40}return;/);
});

test('UI: un panneau non-Recherche masque l’injection Recherche sans détruire le nœud React', () => {
  const source = read('ui-enhancements.js');
  assert.match(source, /function cleanupResearchPanelArtifacts\(\)/);
  assert.match(source, /const researchPanel = isResearchPanel\(panel\);/);
  assert.match(source, /panel\.querySelectorAll\("\.bluefox-research-runtime"\)/);
  assert.match(source, /section\.hidden = !researchPanel;/);
  assert.match(source, /cleanupResearchPanelArtifacts\(\);\s*\n\s*const panels/);
});

test('late wrapper MissionManager ne remplace plus le proprietaire canonique', () => {
  const source = read('mission-manager-bible-fix-v19.js');
  assert.doesNotMatch(source, /Manager\.prototype\./);
  assert.match(source, /__bibleCleanStateOwner = "mission-manager"/);
});

test('traveling reste hors diff et la course autonome commence hors proximité', () => {
  const world = read('world-engine.js');
  const character = read('character-controller.js');
  assert.match(world, /this\.shouldPlayStartupCinematic/);
  assert.match(world, /this\.startupQuietUntil = quietUntil/);
  assert.match(character, /this\.maxSpeed = 3\.55;/);
  assert.match(character, /this\.autonomousRunThreshold = 6;/);
  assert.match(character, /this\.acceleration = 5\.2;/);
  assert.match(character, /this\.deceleration = 7\.5;/);
});
