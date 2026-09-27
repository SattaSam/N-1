const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function context() {
  const storage = new Map();
  const window = {
    BlueFox3D: {},
    console,
    performance,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    }
  };
  const ctx = vm.createContext({
    window,
    console,
    performance,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    CustomEvent: window.CustomEvent
  });
  return { window, ctx };
}

function loadCatalog() {
  const { window, ctx } = context();
  vm.runInContext(fs.readFileSync(path.join(root, 'data/bible-catalog.js'), 'utf8'), ctx);
  return { window, ctx };
}

function loadRuntime() {
  const { window, ctx } = loadCatalog();
  const BF = window.BlueFox3D;
  BF.BiblePatterns = {};
  BF.Missions = {};
  BF.ObjectLibrary = {
    list() {
      return [
        { knowledge: { family: 'mineral' }, resource: { family: 'crystal', inventoryKey: 'crystal' }, spawn: { tags: ['mineral', 'crystal'] } },
        { knowledge: { family: 'mineral' }, resource: { family: 'ore', inventoryKey: 'magnetic_ore' }, situation: { tags: ['mineral'] } },
        { knowledge: { family: 'flora' }, resource: { family: 'fiber', inventoryKey: 'fiber' }, spawn: { tags: ['plant'] } }
      ];
    }
  };
  BF.MicroScenes = { get: () => ({ radius: 4 }) };
  const source = fs.readFileSync(path.join(root, 'engine/bible-runtime-v0-1-unified.js'), 'utf8')
    .replace(/\n\s*runtime\.start\(\);\n\}\)\(window\);\s*$/, '\n})(window);');
  vm.runInContext(source, ctx);
  return { window, BF: window.BlueFox3D };
}

test('Shelter finit sur les trois objectifs utiles et passe en finalisation autonome', () => {
  const { window } = loadCatalog();
  const shelter = window.BlueFox3D.BibleCatalog.find(m => m.id === 'GAME-shelter');
  assert.ok(shelter);
  assert.equal(shelter.activationSource, 'autonomy');
  assert.deepEqual(Array.from(shelter.sequence, s => s.slot), ['fibers', 'plantStudy', 'wood']);
  assert.equal(shelter.sequence.some(s => s.params?.kind === 'camp'), false);
  const establish = shelter.effects.find(e => e.type === 'site.establish');
  assert.equal(establish.kind, 'refuge');
  assert.equal(establish.microSceneId, 'MSC-CUSTOM-CAMP-BASE');
  assert.equal(establish.placement.referenceKind, 'camp');
});

test('GAME-base est cachée derrière Shelter et demande 500 + 500, puis établit la MSC renforcée', () => {
  const { window } = loadCatalog();
  const base = window.BlueFox3D.BibleCatalog.find(m => m.id === 'GAME-base');
  assert.ok(base);
  assert.equal(base.trigger.type, 'manual');
  assert.equal(base.initialState, 'active');
  assert.deepEqual(Array.from(base.prerequisites), ['GAME-shelter']);
  assert.equal(base.activationSource, 'autonomy');
  const fibers = base.sequence.find(s => s.slot === 'fibers');
  const minerals = base.sequence.find(s => s.slot === 'minerals');
  const rockStudy = base.sequence.find(s => s.slot === 'rockStudy');
  assert.equal(fibers.target, 500);
  assert.equal(minerals.target, 500);
  assert.equal(minerals.params.subject, 'mineral');
  assert.equal(rockStudy.target, 100);
  const consumes = base.effects.filter(e => e.type === 'inventory.consume');
  assert.equal(consumes.find(e => e.inventoryKey === 'fiber').quantity, 500);
  assert.equal(consumes.find(e => e.subject === 'mineral').quantity, 500);
  const establish = base.effects.find(e => e.type === 'site.establish');
  assert.equal(establish.kind, 'base');
  assert.equal(establish.microSceneId, 'MSC-CUSTOM-CAMP-BASE-REINFORCED');
  assert.equal(establish.placement.referenceKind, 'refuge');
});


test('GAME-base entre dans le bootstrap initial puis reste pending jusqu’à completion de Shelter', () => {
  const { window, ctx } = loadCatalog();
  const BF = window.BlueFox3D;
  const Missions = BF.Missions = {
    definitions: {
      'GAME-shelter': { id: 'GAME-shelter' },
      'GAME-base': { id: 'GAME-base' }
    },
    getDefinition(id) { return this.definitions[id] || null; },
    MissionPlanner: class {},
    ActionBridge: class {}
  };
  vm.runInContext(fs.readFileSync(path.join(root, 'engine/mission-manager.js'), 'utf8'), ctx);

  const proto = Missions.MissionManager.prototype;
  const manager = Object.create(proto);
  manager.memory = {
    state: {
      missionLifecycle: { 'GAME-shelter': { status: 'active' } },
      pendingActivations: {}
    },
    save() {},
    saveTree() {}
  };
  manager.definition = id => Missions.definitions[id] || null;
  manager.publish = () => true;
  const activations = [];
  manager.activateMission = (id, options = {}) => {
    activations.push({ id, options });
    manager.ensureLifecycle(id).status = 'active';
    delete manager.memory.state.pendingActivations[id];
    return true;
  };

  const base = BF.BibleCatalog.find(m => m.id === 'GAME-base');
  assert.equal(base.initialState, 'active');
  assert.equal(base.trigger.type, 'manual');

  assert.equal(manager.startMission(base.id, {
    primary: false,
    prerequisites: Array.from(base.prerequisites),
    source: 'bible-runtime-v0.1'
  }), true);
  assert.equal(manager.ensureLifecycle('GAME-base').status, 'hidden');
  assert.deepEqual(manager.memory.state.pendingActivations['GAME-base'].prerequisites, ['GAME-shelter']);
  assert.equal(activations.length, 0);

  manager.ensureLifecycle('GAME-shelter').status = 'completed';
  assert.equal(manager.reevaluatePendingActivations(), true);
  assert.equal(activations.length, 1);
  assert.equal(activations[0].id, 'GAME-base');
  assert.equal(manager.ensureLifecycle('GAME-base').status, 'active');
});

test('le bootstrap Bible inclut GAME-base parmi les missions initiales activables', () => {
  const { BF } = loadRuntime();
  const runtime = BF.bibleRuntime;
  const attempted = [];
  runtime.manager = () => ({ });
  runtime.missionLifecycle = id => ({
    active: id !== 'GAME-base',
    completed: false,
    lifecycle: { status: id !== 'GAME-base' ? 'active' : 'hidden' },
    tree: null
  });
  runtime.activateMission = mission => {
    attempted.push(mission.id);
    return false;
  };
  runtime.activateInitialMissions();
  assert.ok(attempted.includes('GAME-base'));
});

test('la Base renforcée remplace le Refuge autonome en persistance tout en conservant le Camp', () => {
  const { BF } = loadRuntime();
  const runtime = BF.bibleRuntime;
  const base = BF.BibleCatalog.find(m => m.id === 'GAME-base');
  const memory = {
    state: {
      siteProgression: {
        crystal: {
          sites: {
            camp: { id: 'crystal:camp:primary', kind: 'camp', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-CAMP', anchor: { x: 6.174798, y: 0.25, z: 3.249376 }, rotation: [0, 2.356194, 0] },
            refuge: { id: 'crystal:refuge:primary', kind: 'refuge', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-CAMP-BASE', anchor: { x: -0.4399, y: 0.25, z: 4.9833 }, rotation: [0, 1.308997, 0] }
          }
        }
      }
    },
    hasEffectReceipt: () => false,
    recordEffectReceipt() {},
    save() {}
  };
  BF.currentEngine = { currentMapId: 'crystal', missionManager: { memory } };
  BF.progression = { availableInventory: () => 500 };
  BF.consumeInventoryPoolOnce = (id, keys, quantity) => quantity;
  runtime.renderSite = () => true;
  assert.equal(runtime.applyEffects(base, {
    source: 'autonomy',
    placement: { anchor: { x: -2.7567, y: 0.25, z: 4.768 }, rotation: [0, 1.308997, 0] }
  }), true);
  assert.deepEqual(
    Object.keys(memory.state.siteProgression.crystal.sites).sort(),
    ['base', 'camp']
  );
  assert.equal(memory.state.siteProgression.crystal.sites.camp.microSceneId, 'MSC-CUSTOM-CAMP');
  assert.equal(memory.state.siteProgression.crystal.sites.refuge, undefined);
  assert.equal(memory.state.siteProgression.crystal.sites.base.microSceneId, 'MSC-CUSTOM-CAMP-BASE-REINFORCED');
});


test('le reload ne restaure que Camp + Base renforcée après substitution du Refuge', () => {
  const { BF } = loadRuntime();
  const runtime = BF.bibleRuntime;
  const sites = {
    camp: { id: 'crystal:camp:primary', kind: 'camp', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-CAMP', anchor: { x: 0, y: 0, z: 0 }, rotation: [0, 0, 0] },
    base: { id: 'crystal:base:primary', kind: 'base', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-CAMP-BASE-REINFORCED', anchor: { x: 0, y: 0, z: 0 }, rotation: [0, 0, 0] }
  };
  const presets = {
    'MSC-CUSTOM-CAMP': { position: { x: 6.174798, y: 0.25, z: 3.249376 }, rotation: [0, 2.356194, 0] },
    'MSC-CUSTOM-CAMP-BASE-REINFORCED': { position: { x: -2.7567, y: 0.25, z: 4.768 }, rotation: [0, 1.308997, 0] }
  };
  runtime.siteBucket = () => ({ camp: sites.camp, refuge: null, base: sites.base });
  runtime.sitePlacementPreset = id => presets[id] || null;
  const rendered = [];
  runtime.renderSite = site => {
    rendered.push({ id: site.microSceneId, anchor: { ...site.anchor }, rotation: [...site.rotation] });
    return true;
  };
  assert.equal(runtime.renderCurrentSite({ currentMapId: 'crystal' }), true);
  assert.equal(rendered.length, 2);
  for (const item of rendered) {
    assert.deepEqual(item.anchor, presets[item.id].position);
    assert.deepEqual(item.rotation, presets[item.id].rotation);
  }
});

test('removeEstablishedSite retire uniquement le Refuge rendu, ses colliders et sa persistance', () => {
  const { BF } = loadRuntime();
  const runtime = BF.bibleRuntime;
  const refuge = { id: 'crystal:refuge:primary', kind: 'refuge', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-CAMP-BASE' };
  const campRoot = { userData: { establishedSite: 'crystal:camp:primary' }, parent: { remove() {} } };
  const refugeRootA = { userData: { establishedSite: refuge.id }, parent: { remove(object) { object.removed = true; } } };
  const refugeRootB = { userData: { establishedSite: refuge.id }, parent: { remove(object) { object.removed = true; } } };
  const group = { traverse(visitor) { [campRoot, refugeRootA, refugeRootB].forEach(visitor); } };
  const colliderCamp = { owner: campRoot };
  const colliderRefuge = { owner: refugeRootA };
  const map = { group, interactables: [], colliders: [colliderCamp, colliderRefuge] };
  const memory = {
    state: { siteProgression: { crystal: { sites: {
      camp: { id: 'crystal:camp:primary', kind: 'camp', mapId: 'crystal' },
      refuge
    } } } },
    save() {}
  };
  let colliderRefresh = 0;
  const engine = { currentMapId: 'crystal', currentMap: map, character: { setColliders() { colliderRefresh += 1; } } };
  BF.disposeObject = object => object.parent?.remove?.(object);

  assert.equal(runtime.removeEstablishedSite(refuge, memory, engine), true);
  assert.equal(refugeRootA.removed, true);
  assert.equal(refugeRootB.removed, true);
  assert.equal(campRoot.removed, undefined);
  assert.deepEqual(map.colliders, [colliderCamp]);
  assert.equal(colliderRefresh, 1);
  assert.equal(memory.state.siteProgression.crystal.sites.refuge, undefined);
  assert.ok(memory.state.siteProgression.crystal.sites.camp);
});

test('le pool générique par sujet agrège les inventaires minéraux sans coder GAME-base', () => {
  const { BF } = loadRuntime();
  assert.deepEqual(
    Array.from(BF.bibleRuntime.inventoryKeysForRequirement({ subject: 'mineral' })).sort(),
    ['crystal', 'magnetic_ore']
  );
  assert.deepEqual(Array.from(BF.bibleRuntime.inventoryKeysForRequirement({ inventoryKey: 'fiber' })), ['fiber']);
});

test('un échec de spawn n\'enlève aucune ressource et ne pose aucun receipt', () => {
  const { BF } = loadRuntime();
  const runtime = BF.bibleRuntime;
  const base = BF.BibleCatalog.find(m => m.id === 'GAME-base');
  let consumed = 0;
  let receipted = false;
  const memory = {
    state: { siteProgression: { crystal: { sites: {
      camp: { id: 'crystal:camp:primary', kind: 'camp', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-CAMP' },
      refuge: { id: 'crystal:refuge:primary', kind: 'refuge', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-CAMP-BASE' }
    } } } },
    hasEffectReceipt: () => false,
    recordEffectReceipt: () => { receipted = true; },
    save() {}
  };
  BF.currentEngine = { currentMapId: 'crystal', missionManager: { memory } };
  BF.progression = { availableInventory: () => 500 };
  BF.consumeInventoryPoolOnce = () => { consumed += 1; return 500; };
  runtime.renderSite = () => false;
  const ok = runtime.applyEffects(base, {
    source: 'autonomy',
    placement: { anchor: { x: 1, y: 0, z: 1 }, rotation: [0, 0, 0] }
  });
  assert.equal(ok, false);
  assert.equal(consumed, 0);
  assert.equal(receipted, false);
  assert.equal(memory.state.siteProgression.crystal.sites.refuge.microSceneId, 'MSC-CUSTOM-CAMP-BASE');
});

test('le spawn réussi consomme une fois les pools exacts puis persiste la Base', () => {
  const { BF } = loadRuntime();
  const runtime = BF.bibleRuntime;
  const base = BF.BibleCatalog.find(m => m.id === 'GAME-base');
  const calls = [];
  const receipts = [];
  const memory = {
    state: { siteProgression: {} },
    hasEffectReceipt: () => false,
    recordEffectReceipt: (id, detail) => receipts.push({ id, detail }),
    save() {}
  };
  BF.currentEngine = { currentMapId: 'crystal', missionManager: { memory } };
  BF.progression = { availableInventory: () => 500 };
  BF.consumeInventoryPoolOnce = (id, keys, quantity) => {
    calls.push({ id, keys: Array.from(keys), quantity });
    return quantity;
  };
  runtime.renderSite = () => true;
  const ok = runtime.applyEffects(base, {
    source: 'autonomy',
    placement: { anchor: { x: 2, y: 0, z: 3 }, rotation: [0, 0, 0] }
  });
  assert.equal(ok, true);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].keys, ['fiber']);
  assert.deepEqual(calls[1].keys.sort(), ['crystal', 'magnetic_ore']);
  assert.equal(calls[0].quantity, 500);
  assert.equal(calls[1].quantity, 500);
  assert.equal(receipts.length, 1);
  assert.equal(memory.state.siteProgression.crystal.sites.base.microSceneId, 'MSC-CUSTOM-CAMP-BASE-REINFORCED');
});

test('Shelter résout la map de placement depuis son completionGate', () => {
  const { BF } = loadRuntime();
  const runtime = BF.bibleRuntime;
  const shelter = BF.BibleCatalog.find(m => m.id === 'GAME-shelter');
  BF.currentEngine = { currentMapId: 'crystal', character: { root: { position: { x: 0, y: 0, z: 0 } } } };
  let requestedMap = null;
  runtime.siteBucket = mapId => {
    requestedMap = mapId;
    return { camp: { anchor: { x: 0, y: 0, z: 0 }, rotation: [0, 0, 0], microSceneId: 'MSC-CUSTOM-CAMP' } };
  };
  runtime.sitePlacementPreset = () => null;
  runtime.sitePlacementValid = () => true;
  assert.ok(runtime.autonomousPlacement(shelter)?.anchor);
  assert.equal(requestedMap, 'crystal');
});

test('Shelter utilise le preset canonique sans autonomousPlacement ni validation collision générique', () => {
  const { BF } = loadRuntime();
  const runtime = BF.bibleRuntime;
  const shelter = BF.BibleCatalog.find(m => m.id === 'GAME-shelter');
  const memory = {
    state: { missionLifecycle: { 'GAME-shelter': { status: 'active' } } }
  };
  let synced = 0;
  let published = 0;
  const manager = {
    trees: new Map([['GAME-shelter', { root: { isComplete: true } }]]),
    memory,
    syncLifecycleFromTrees() { synced += 1; },
    publish() { published += 1; }
  };
  BF.currentEngine = {
    currentMapId: 'crystal',
    character: { root: { position: { x: 0, y: 0, z: 0 } } },
    missionManager: manager
  };
  runtime.manager = () => manager;
  runtime.gateSatisfied = () => false;
  runtime.constructionResourceStatus = () => ({ missionId: shelter.id, ready: true, missingTotal: 0, requirements: [] });
  runtime.publishConstructionResourceStatus = () => true;
  runtime.sitePlacementPreset = id => id === 'MSC-CUSTOM-CAMP-BASE'
    ? { position: { x: -0.4399, y: 0.25, z: 4.9833 }, rotation: [0, 1.308997, 0] }
    : null;
  runtime.autonomousPlacement = () => { throw new Error('autonomousPlacement ne doit pas être appelé avec un preset canonique'); };
  runtime.sitePlacementValid = () => { throw new Error('sitePlacementValid ne doit pas arbitrer un preset canonique'); };
  let applied = null;
  runtime.applyEffects = (mission, options) => { applied = { mission, options }; return true; };

  assert.equal(runtime.handleConstructionReady(shelter), true);
  assert.equal(applied.mission.id, 'GAME-shelter');
  assert.deepEqual(JSON.parse(JSON.stringify(applied.options.placement)), {
    anchor: { x: -0.4399, y: 0.25, z: 4.9833 },
    rotation: [0, 1.308997, 0]
  });
  assert.equal(applied.options.source, 'autonomy');
  assert.equal(synced, 1);
  assert.equal(published, 1);
});

test('GAME-base utilise son preset canonique malgré Camp + Refuge déjà présents et une collision générique refusée', () => {
  const { BF } = loadRuntime();
  const runtime = BF.bibleRuntime;
  const base = BF.BibleCatalog.find(m => m.id === 'GAME-base');
  const memory = {
    state: {
      missionLifecycle: { 'GAME-base': { status: 'active' } },
      siteProgression: {
        crystal: {
          sites: {
            camp: { id: 'crystal:camp:primary', kind: 'camp', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-CAMP', anchor: { x: 6.174798, y: 0.25, z: 3.249376 }, rotation: [0, 2.356194, 0] },
            refuge: { id: 'crystal:refuge:primary', kind: 'refuge', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-CAMP-BASE', anchor: { x: -0.4399, y: 0.25, z: 4.9833 }, rotation: [0, 1.308997, 0] }
          }
        }
      }
    }
  };
  const manager = {
    trees: new Map([['GAME-base', { root: { isComplete: true } }]]),
    memory,
    syncLifecycleFromTrees() {},
    publish() {}
  };
  BF.currentEngine = {
    currentMapId: 'crystal',
    character: { root: { position: { x: 0, y: 0, z: 0 } } },
    missionManager: manager
  };
  runtime.manager = () => manager;
  // Régression réelle : le gate générique peut voir le Refuge MSC-CUSTOM-CAMP-BASE
  // comme une "base" alors qu'aucun site GAME-base n'a encore été établi.
  runtime.state.gatesSatisfied[base.id] = Date.now();
  runtime.gateSatisfied = () => true;
  assert.equal(runtime.canFinalizeMission(base.id), false);
  assert.equal(Boolean(runtime.state.gatesSatisfied[base.id]), false);
  runtime.constructionResourceStatus = () => ({ missionId: base.id, ready: true, missingTotal: 0, requirements: [] });
  runtime.publishConstructionResourceStatus = () => true;
  runtime.sitePlacementPreset = id => id === 'MSC-CUSTOM-CAMP-BASE-REINFORCED'
    ? { position: { x: -2.7567, y: 0.25, z: 4.768 }, rotation: [0, 1.308997, 0] }
    : null;
  runtime.sitePlacementValid = () => false;
  runtime.autonomousPlacement = () => { throw new Error('autonomousPlacement ne doit pas être appelé pour GAME-base canonique'); };
  let placement = null;
  runtime.applyEffects = (mission, options) => { placement = options.placement; return true; };

  assert.equal(runtime.handleConstructionReady(base), true);
  assert.deepEqual(JSON.parse(JSON.stringify(placement)), {
    anchor: { x: -2.7567, y: 0.25, z: 4.768 },
    rotation: [0, 1.308997, 0]
  });
  assert.deepEqual(Object.keys(memory.state.siteProgression.crystal.sites).sort(), ['camp', 'refuge']);
});

test('reproduction console : Base prête + pool 300/200 finalise au preset malgré collision générique', () => {
  const { BF } = loadRuntime();
  const runtime = BF.bibleRuntime;
  const base = BF.BibleCatalog.find(m => m.id === 'GAME-base');
  const stocks = { fiber: 500, crystal: 300, magnetic_ore: 200 };
  const receipts = new Set();
  const memory = {
    state: {
      missionLifecycle: { 'GAME-base': { status: 'active' } },
      siteProgression: {
        crystal: {
          sites: {
            camp: { id: 'crystal:camp:primary', kind: 'camp', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-CAMP', anchor: { x: 6.174798, y: 0.25, z: 3.249376 }, rotation: [0, 2.356194, 0] },
            refuge: { id: 'crystal:refuge:primary', kind: 'refuge', mapId: 'crystal', microSceneId: 'MSC-CUSTOM-CAMP-BASE', anchor: { x: -0.4399, y: 0.25, z: 4.9833 }, rotation: [0, 1.308997, 0] }
          }
        }
      }
    },
    hasEffectReceipt(id) { return receipts.has(id); },
    recordEffectReceipt(id) { receipts.add(id); return true; },
    save() {}
  };
  const manager = {
    trees: new Map([['GAME-base', { root: { isComplete: true } }]]),
    memory,
    syncLifecycleFromTrees() {
      if (runtime.gateSatisfied(base)) memory.state.missionLifecycle['GAME-base'].status = 'completed';
    },
    publish() {}
  };
  BF.currentEngine = {
    currentMapId: 'crystal',
    character: { root: { position: { x: 0, y: 0, z: 0 } } },
    missionManager: manager
  };
  runtime.manager = () => manager;
  runtime.sitePlacementPreset = id => id === 'MSC-CUSTOM-CAMP-BASE-REINFORCED'
    ? { position: { x: -2.7567, y: 0.25, z: 4.768 }, rotation: [0, 1.308997, 0] }
    : null;
  runtime.sitePlacementValid = () => false;
  runtime.renderSite = () => true;
  runtime.publishConstructionResourceStatus = () => true;
  BF.progression = {
    availableInventory(keys) { return keys.reduce((sum, key) => sum + (stocks[key] || 0), 0); }
  };
  BF.consumeInventoryPoolOnce = (id, keys, quantity) => {
    if (receipts.has(id)) return quantity;
    let remaining = quantity;
    for (const key of keys) {
      const take = Math.min(stocks[key] || 0, remaining);
      stocks[key] = (stocks[key] || 0) - take;
      remaining -= take;
      if (!remaining) break;
    }
    if (remaining) return quantity - remaining;
    receipts.add(id);
    return quantity;
  };

  assert.equal(runtime.constructionResourceStatus(base).ready, true);
  assert.equal(runtime.handleConstructionReady(base), true);
  assert.equal(memory.state.missionLifecycle['GAME-base'].status, 'completed');
  assert.equal(memory.state.siteProgression.crystal.sites.base.microSceneId, 'MSC-CUSTOM-CAMP-BASE-REINFORCED');
  assert.deepEqual(JSON.parse(JSON.stringify(memory.state.siteProgression.crystal.sites.base.anchor)), { x: -2.7567, y: 0.25, z: 4.768 });
  assert.deepEqual(stocks, { fiber: 0, crystal: 0, magnetic_ore: 0 });
  assert.deepEqual(Object.keys(memory.state.siteProgression.crystal.sites).sort(), ['base', 'camp']);
  assert.equal(memory.state.siteProgression.crystal.sites.refuge, undefined);

  const snapshot = JSON.stringify(memory.state.siteProgression.crystal.sites);
  assert.equal(runtime.handleConstructionReady(base), false);
  assert.equal(JSON.stringify(memory.state.siteProgression.crystal.sites), snapshot);
  assert.deepEqual(stocks, { fiber: 0, crystal: 0, magnetic_ore: 0 });
});

test('le fallback relatif reste disponible pour une future MSC sans preset canonique', () => {
  const { BF } = loadRuntime();
  const runtime = BF.bibleRuntime;
  const future = {
    id: 'FUTURE-UPGRADE',
    targetMapId: 'crystal',
    effects: [{
      type: 'site.establish',
      kind: 'base',
      microSceneId: 'FUTURE-MSC',
      placement: { mode: 'near-camp', referenceKind: 'refuge' }
    }]
  };
  BF.currentEngine = {
    currentMapId: 'crystal',
    character: { root: { position: { x: 0, y: 0, z: 0 } } }
  };
  runtime.siteBucket = () => ({
    refuge: { anchor: { x: 10, y: 0.25, z: 10 }, rotation: [0, 0, 0], microSceneId: 'REFUGE-MSC' }
  });
  runtime.sitePlacementPreset = () => null;
  runtime.sitePlacementValid = () => true;
  const placement = runtime.autonomousPlacement(future);
  assert.ok(placement?.anchor);
  assert.equal(placement.anchor.y, 0.25);
  assert.notEqual(placement.anchor.x, 10);
  assert.notEqual(placement.anchor.z, 10);
});

test('le planner laisse un objectif subject:mineral 500 runnable jusqu’à 499/500 et délègue le matching à ObjectM0', () => {
  const { window, ctx } = context();
  const Missions = window.BlueFox3D.Missions = {
    ActionType: {
      COLLECT: 'collect', EXTRACT: 'extract', EXPLORE_ZONE: 'explore-zone', RESEARCH: 'research',
      OBSERVE: 'observe', REST: 'rest', EAT: 'eat'
    },
    normalizeActionType: x => x,
    definitions: {}
  };
  vm.runInContext(fs.readFileSync(path.join(root, 'engine/mission-planner.js'), 'utf8'), ctx);
  const planner = new Missions.MissionPlanner({});
  const plannerContext = {
    resources: {}, unexploredZones: 0, explorationPercent: 100, hasIncompleteDiscoveredMaps: false,
    canRoutine: true, needs: {}
  };
  for (const progress of [0, 1, 250, 499]) {
    const node = {
      id: 'GAME-base:minerals',
      type: 'extract',
      target: 500,
      progress,
      createdAt: 0,
      title: 'Rassembler les composants minéraux',
      params: { subject: 'mineral' }
    };
    const score = planner.score(node, plannerContext);
    assert.ok(score >= 0, `progress=${progress}, score=${score}`);
    const tree = { availableLeaves: () => [node] };
    assert.equal(planner.nextAction(tree, plannerContext)?.nodeId, 'GAME-base:minerals');
  }
});

test('le planner conserve le scoring historique d’un kind absent', () => {
  const { window, ctx } = context();
  const Missions = window.BlueFox3D.Missions = {
    ActionType: {
      COLLECT: 'collect', EXTRACT: 'extract', EXPLORE_ZONE: 'explore-zone', RESEARCH: 'research',
      OBSERVE: 'observe', REST: 'rest', EAT: 'eat'
    },
    normalizeActionType: x => x,
    definitions: {}
  };
  vm.runInContext(fs.readFileSync(path.join(root, 'engine/mission-planner.js'), 'utf8'), ctx);
  const planner = new Missions.MissionPlanner({});
  const node = { type: 'collect', target: 100, progress: 0, params: { kind: 'fiber' } };
  assert.equal(planner.score(node, { resources: {}, needs: {} }), 0);
});

test('le planner du ZIP garde un objectif long runnable à 81/100', () => {
  const { window, ctx } = context();
  const Missions = window.BlueFox3D.Missions = {
    ActionType: {
      COLLECT: 'collect', EXTRACT: 'extract', EXPLORE_ZONE: 'explore-zone', RESEARCH: 'research',
      OBSERVE: 'observe', REST: 'rest', EAT: 'eat'
    },
    normalizeActionType: x => x,
    definitions: {}
  };
  vm.runInContext(fs.readFileSync(path.join(root, 'engine/mission-planner.js'), 'utf8'), ctx);
  const planner = new Missions.MissionPlanner({});
  const score = planner.score({ type: 'collect', target: 100, progress: 81, params: { kind: 'fiber' } }, {
    resources: { fiber: 1 }, unexploredZones: 0, explorationPercent: 100, hasIncompleteDiscoveredMaps: false,
    canRoutine: true, needs: {}
  });
  assert.ok(score >= 0, `score=${score}`);
});


test('les protections IMI du HEAD restent présentes sans réintroduire la migration supprimée au HEAD', () => {
  const { window } = loadCatalog();
  const catalog = window.BlueFox3D.BibleCatalog;
  for (const id of ['SUR-03', 'COL-PLANT-20', 'COL-FIBER-20']) {
    assert.equal(catalog.find(m => m.id === id)?.triggerOnly, true, id);
  }
  const runtimeSource = fs.readFileSync(path.join(root, 'engine/bible-runtime-v0-1-unified.js'), 'utf8');
  assert.match(runtimeSource, /else if \(mission\.targetBinding\)/);
  assert.doesNotMatch(runtimeSource, /reconcileTriggerOnlyBindings\(\)/);
});

test('le preset canonique du Refuge porte la hauteur validée du premier spawn', () => {
  const source = fs.readFileSync(path.join(root, 'engine/start-map-crystal.js'), 'utf8');
  assert.match(
    source,
    /"MSC-CUSTOM-CAMP-BASE": Object\.freeze\(\{[\s\S]*?position: Object\.freeze\(\{ x: -0\.4399, y: 0\.25, z: 4\.9833 \}\)/
  );
});

test('le preset canonique de la Base renforcée porte la hauteur finale validée', () => {
  const source = fs.readFileSync(path.join(root, 'engine', 'start-map-crystal.js'), 'utf8');
  assert.match(source, /MSC-CUSTOM-CAMP-BASE-REINFORCED[\s\S]*?x:\s*-2\.7567,\s*y:\s*0\.25,\s*z:\s*4\.768/);
});

test('le sous-stockage arme une réévaluation événementielle bornée puis se désarme avant finalisation', () => {
  const { BF } = loadRuntime();
  const runtime = BF.bibleRuntime;
  const shelter = BF.BibleCatalog.find(m => m.id === 'GAME-shelter');
  let fiber = 93;
  const tree = { root: { isComplete: true } };
  const memory = {
    state: { missionLifecycle: { 'GAME-shelter': { status: 'active' } } }
  };
  BF.currentEngine = {
    currentMapId: 'crystal',
    character: { root: { position: { x: 0, y: 0, z: 0 } } },
    missionManager: {
      trees: new Map([['GAME-shelter', tree]]),
      memory,
      syncLifecycleFromTrees() {},
      publish() {}
    }
  };
  BF.progression = {
    availableInventory(keys) {
      if (keys.includes('fiber')) return fiber;
      if (keys.includes('wood')) return 125;
      return 0;
    }
  };
  runtime.gateSatisfied = () => false;
  assert.equal(runtime.handleConstructionReady(shelter), false);
  assert.equal(runtime.pendingConstructionResourceMissions.has('GAME-shelter'), true);
  assert.equal(runtime.constructionResourceStatus(shelter).requirements[0].missing, 7);

  fiber = 102;
  let calls = 0;
  let stillPendingAtCall = null;
  runtime.handleConstructionReady = mission => {
    calls += 1;
    stillPendingAtCall = runtime.pendingConstructionResourceMissions.has(mission.id);
    return true;
  };
  runtime.onProgressionChanged({
    reason: 'event-consumed',
    event: { type: 'RESOURCE_COLLECTED' }
  });
  assert.equal(calls, 1);
  assert.equal(stillPendingAtCall, false);
  assert.equal(runtime.pendingConstructionResourceMissions.size, 0);

  runtime.onProgressionChanged({
    reason: 'event-consumed',
    event: { type: 'RESOURCE_COLLECTED' }
  });
  assert.equal(calls, 1, 'aucune seconde finalisation sans nouvel état pending');
});

test('le boost de collecte construction est raccordé au BAC sans écraser le boost ration validé', () => {
  const source = fs.readFileSync(path.join(root, 'engine/behavior-arbitration-integration.js'), 'utf8');
  assert.match(source, /const constructionCandidate\s*=\s*BF\.getConstructionCollectionCandidate/);
  assert.match(source, /\.\.\.\(constructionCandidate \? \[constructionCandidate\] : \[\]\)/);
  assert.match(source, /rationCandidate\?\.missionDriven !== true\s*&&\s*constructionCandidate\?\.missionDriven !== true/);
  assert.match(source, /createDecisionContext\(this\)/, 'le gain CPU validé reste présent');
});

test('l’UI affiche le déficit en marron clair sans ajouter de polling inventaire', () => {
  const ui = fs.readFileSync(path.join(root, 'engine/mission-ui-bridge.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'engine/mission-ui-bridge.css'), 'utf8');
  assert.match(ui, /bluefox:construction-resources-changed/);
  assert.match(ui, /Attention : seulement/);
  assert.match(ui, /m2-construction-shortage/);
  assert.match(css, /\.m2-construction-shortage[\s\S]*?#c9a675/);
  assert.equal((ui.match(/setInterval\(/g) || []).length, 2, 'aucun nouveau setInterval');
});

test('le manager du ZIP conserve la primaire pendant une action ou activité moteur', () => {
  const source = fs.readFileSync(path.join(root, 'engine/mission-manager.js'), 'utf8');
  assert.match(source, /now - this\.lastPriorityReviewAt > 5000\s*&&\s*!this\.currentAction/);
  assert.match(source, /!this\.hasActivePrimaryMission\(\)\s*\|\|\s*!this\.bridge\.isEngineBusy\(\)/);
});
