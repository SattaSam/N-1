const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { test } = require('node:test');
const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(__dirname, 'mission-repair.runtime.test.js'), 'utf8');
const helpers = new Function('require', '__dirname', source.slice(0, source.indexOf("test('")) +
  '\nreturn { fixture, established };')(require, __dirname);
const json = value => JSON.parse(JSON.stringify(value));

// Real runtime/manager/planner/memory/inventory; deterministic graphics and DOM adapters.
// These tests prove owner/consumer behavior, not WebGL or browser end-to-end rendering.
class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.style = {};
    this.listeners = new Map(); this.textContent = ''; this.value = ''; this.isConnected = true;
  }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  appendChild(node) { this.append(node); return node; }
  remove() { this.isConnected = false; if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); }
  setAttribute() {}
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type, fn) { if (this.listeners.get(type) === fn) this.listeners.delete(type); }
  querySelectorAll(selector) { return this.children.flatMap(x => [x, ...x.querySelectorAll(selector)]).filter(x => x.tagName === selector.toUpperCase()); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  fire(type, detail = {}) { return this.listeners.get(type)?.({ preventDefault() {}, stopImmediatePropagation() {}, ...detail }); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
}
class Vector {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
}
class Group {
  constructor() { this.children = []; this.userData = {}; this.position = new Vector(); this.rotation = new Vector(); }
  add(node) { node.parent = this; this.children.push(node); }
  remove(node) { this.children = this.children.filter(x => x !== node); node.parent = null; }
  traverse(fn) { fn(this); this.children.slice().forEach(node => node.traverse ? node.traverse(fn) : fn(node)); }
  getObjectByProperty(key, value) { let result; this.traverse(x => { if (x[key] === value) result = x; }); return result; }
}
function fresh(state) {
  const previous = process.env.BLUEFOX_SAVE;
  const directory = state ? fs.mkdtempSync(path.join(os.tmpdir(), 'bluefox-p3-')) : null;
  let f;
  try {
    if (state) { process.env.BLUEFOX_SAVE = path.join(directory, 'save.json'); fs.writeFileSync(process.env.BLUEFOX_SAVE, JSON.stringify({ state })); }
    else delete process.env.BLUEFOX_SAVE;
    f = helpers.fixture();
  } finally {
    if (previous === undefined) delete process.env.BLUEFOX_SAVE; else process.env.BLUEFOX_SAVE = previous;
    if (directory) fs.rmSync(directory, { recursive: true });
  }
  const listeners = new Map();
  // The P1 adapter hardcodes "test"; reproduce the real constructor's persisted reason.
  f.manager.selectionReason = f.memory.state.missionLifecycle[f.manager.primaryMissionId]?.selectionReason || 'test';
  f.window.addEventListener = (type, fn) => { const set = listeners.get(type) || new Set(); set.add(fn); listeners.set(type, set); };
  f.window.removeEventListener = (type, fn) => listeners.get(type)?.delete(fn);
  f.window.dispatchEvent = event => { f.events.push(event); for (const fn of [...(listeners.get(event.type) || [])]) fn(event); return true; };
  f.globalFire = (type, detail = {}) => { for (const fn of [...(listeners.get(type) || [])]) fn({ type, preventDefault() {}, ...detail }); };
  f.canvas = new Element('canvas');
  f.hit = { x: 10, y: 0, z: 10 }; f.spawnFailure = false; f.spawns = [];
  f.BF.maps.crystal = { id: 'crystal', name: 'Crystal de test' };
  f.BF.MicroScenes = { get: id => ({ id, radius: 2 }) };
  f.BF.ObjectSpawner = class {
    constructor(options) { this.options = options; }
    spawnMicroScene(id, options) {
      f.spawns.push({ id, ...json({ origin: options.origin, rotation: options.rotation, source: options.source }) });
      if (f.spawnFailure) return [];
      const root = new Group(); this.options.scene.add(root); return [{ root, instance: { colliders: [] } }];
    }
  };
  Object.assign(f.engine, { THREE: { Group, Vector3: Vector }, renderer: { domElement: f.canvas },
    pointer: { set() {} }, camera: {}, groundPlane: {}, raycaster: { setFromCamera() {}, ray: { intersectPlane(plane, point) { point.set(f.hit.x, 0, f.hit.z); return point; } } } });
  f.engine.currentMap = { group: new Group(), interactables: [], colliders: [], bounds: 50 };
  f.engine.scene = f.engine.currentMap.group;
  f.engine.currentMap.group.userData.microScenes = [];
  f.engine.character.setColliders = () => {};
  return f;
}
const rewards = { camp: 'camp-establish-v1', refuge: 'refuge-build-v1', base: 'base-build-v1', workbench: 'workbench-build-v1' };
function fund(f, kind) {
  const template = f.BF.BibleConstructionTemplates[kind];
  f.memory.state.researchUnlocks[rewards[kind]] = { unlockedAt: 1 };
  for (const effect of template.effects) if (effect.type === 'inventory.consume') {
    const keys = f.runtime.inventoryKeysForRequirement(effect);
    f.BF.grantInventory(keys[0], effect.quantity);
  }
}
function prerequisites(f, kind) {
  if (kind === 'refuge') helpers.established(f, 'T03', 'camp', 1);
  if (kind === 'base') helpers.established(f, 'GAME-shelter', 'refuge', 2);
  if (kind === 'workbench') helpers.established(f, 'GAME-base', 'base', 3);
}
function confirm(f) {
  f.canvas.fire('pointermove', { clientX: 50, clientY: 50 });
  f.canvas.fire('pointerup', { button: 2 });
  return f.events.filter(x => x.type === 'bluefox:site-placement-finalize-request').at(-1)?.detail;
}
function invariant(f) {
  return json({ definitions: Object.keys(f.M.definitions).sort(), trees: [...f.manager.trees.keys()].sort(),
    lifecycle: f.memory.state.missionLifecycle, active: f.manager.activeMissionIds,
    primary: f.manager.primaryMissionId, instances: f.runtime.state.constructionInstances });
}
function reload(f) { f.memory.save(); f.memory.flush(); f.BF.progression.save(); f.runtime.saveState(); return fresh(Object.fromEntries(f.store)); }

test('P3 données HEAD : chaque plan référence une MSC existante et des CUO actifs', () => {
  const f = fresh(); f.load('data/custom-micro-scenes.js'); f.load('engine/micro-scenes.js');
  for (const kind of Object.keys(rewards)) {
    const effect = f.runtime.constructionPlacementEffect(f.BF.BibleConstructionTemplates[kind]);
    const scene = f.BF.MicroScenes.get(effect.microSceneId); assert(scene, effect.microSceneId); assert(scene.objects.length);
    for (const object of scene.objects) assert(f.BF.ObjectLibrary.list({ status: 'active' }).some(x => x.type === object.type), object.type);
  }
});

for (const kind of Object.keys(rewards)) test(`P3 ${kind}: preview, orientation, annulation, installation réelle, reload sans mission dynamique`, () => {
  const f = fresh(); prerequisites(f, kind); fund(f, kind);
  const before = invariant(f), stock = json(f.BF.progression.state), sites = json(f.memory.state.siteProgression);
  assert.equal(f.BF.Research.startConstruction(kind), true); assert(f.runtime.activePlacement);
  const cancelled = confirm(f); assert(cancelled); cancelled.onRotate(Math.PI / 2); cancelled.onCancel();
  assert(f.runtime.activePlacement); assert.deepEqual(json(f.BF.progression.state), stock);
  assert.deepEqual(json(f.memory.state.siteProgression), sites);
  f.globalFire('keydown', { key: 'Escape' }); assert.equal(f.runtime.activePlacement, null);
  assert.equal(f.canvas.listeners.size, 0); assert.deepEqual(invariant(f), before);
  assert.equal(cancelled.onInstall(), false, 'stale confirmation after Escape refused');
  assert.equal(f.BF.Research.startConstruction(kind), true);
  const detail = confirm(f); detail.onRotate(-Math.PI / 3); assert.equal(detail.onInstall(), true);
  assert.equal(f.runtime.activePlacement, null); assert.deepEqual(invariant(f), before);
  const site = f.runtime.siteBucket('crystal')[kind]; assert(site);
  assert.deepEqual(json(site.anchor), f.hit); assert.deepEqual(json(site.rotation), [0, -Math.PI / 3, 0]);
  const receipt = f.memory.state.effectReceipts[site.missionId + ':completion:v1'];
  assert.equal(receipt.siteId, site.id); assert.equal(receipt.inventoryBypassed, false);
  for (const effect of f.BF.BibleConstructionTemplates[kind].effects) if (effect.type === 'inventory.consume')
    assert.equal(f.BF.availableInventory(f.runtime.inventoryKeysForRequirement(effect)), 0);
  assert.equal(detail.onInstall(), false, 'a second installation does not consume or establish again');
  const transactions = json(f.BF.progression.state.transactions), r = reload(f);
  assert.deepEqual(json(r.runtime.siteBucket('crystal')[kind]), json(site));
  assert.deepEqual(json(r.BF.progression.state.transactions), transactions);
  assert.deepEqual(invariant(r), before); assert.equal(r.runtime.activePlacement, null);
  assert.equal(r.BF.Research.constructionState(kind).allowed, false);
  r.runtime.renderCurrentSite(); r.runtime.renderCurrentSite();
  assert.equal(r.engine.currentMap.group.children.filter(x => x.name === 'BlueFoxSite:' + site.id).length, 1);
  assert.deepEqual(json(r.BF.progression.state.transactions), transactions);
});

test('P3 Recherche : verrou de plan, prérequis de site, map courante et matériaux contrôlés', () => {
  const f = fresh();
  assert.equal(f.BF.Research.startConstruction('camp'), false);
  f.memory.state.researchUnlocks[rewards.camp] = { unlockedAt: 1 };
  assert.equal(f.BF.Research.startConstruction('camp'), false);
  fund(f, 'camp'); assert.equal(f.BF.Research.startConstruction('camp', { mapId: 'remote' }), false);
  assert.equal(f.BF.Research.startConstruction('camp', { source: 'autonomy' }), false);
  for (const kind of ['refuge', 'base', 'workbench']) { fund(f, kind); assert.equal(f.BF.Research.startConstruction(kind), false); }
  assert.equal(f.runtime.activePlacement, null);
});

test('P3 rupture de rendu avant consommation : aucun site, reçu ou stock perdu', () => {
  const f = fresh(); fund(f, 'camp'); assert.equal(f.BF.Research.startConstruction('camp'), true);
  const detail = confirm(f), before = json(f.BF.progression.state); f.spawnFailure = true;
  assert.equal(detail.onInstall(), false); assert.deepEqual(json(f.BF.progression.state), before);
  assert.equal(f.runtime.siteBucket('crystal').camp, null); assert.equal(Object.keys(f.memory.state.effectReceipts).length, 0);
  f.spawnFailure = false; assert.equal(detail.onInstall(), true);
});

test('P3 revalidation au clic Installer : déplacement de map, obstacle et stock insuffisant', () => {
  const f = fresh(); fund(f, 'camp'); f.BF.Research.startConstruction('camp'); const detail = confirm(f);
  f.engine.currentMapId = 'remote'; assert.equal(detail.onInstall(), false); f.engine.currentMapId = 'crystal';
  f.engine.currentMap.colliders.push({ position: f.hit, radius: 3 }); assert.equal(detail.onInstall(), false);
  f.engine.currentMap.colliders = []; f.BF.consumeInventoryPool(['wood'], 10); assert.equal(detail.onInstall(), false);
  assert.equal(Object.keys(f.memory.state.effectReceipts).length, 0); assert.equal(f.runtime.siteBucket('crystal').camp, null);
  f.BF.grantInventory('wood', 10); assert.equal(detail.onInstall(), true);
});

test('P3 confirmation explicite : gauche, hors plateau et jeton étranger ne construisent pas', () => {
  const f = fresh(); fund(f, 'camp'); f.BF.Research.startConstruction('camp');
  f.canvas.fire('pointermove', { clientX: 50, clientY: 50 }); f.canvas.fire('pointerup', { button: 0 });
  assert.equal(f.events.some(x => x.type === 'bluefox:site-placement-finalize-request'), false);
  f.hit.x = 50; assert.equal(confirm(f), undefined); f.hit.x = 10;
  const detail = confirm(f), missionId = f.runtime.activePlacement.missionId;
  const project = { id: missionId, activationSource: 'player', targetMapId: 'crystal', effects: f.BF.BibleConstructionTemplates.camp.effects };
  assert.equal(f.runtime.applyEffects(project, { source: 'player', placement: { anchor: f.hit }, confirmationToken: Symbol() }), false);
  assert.equal(f.BF.availableInventory('wood'), 10); assert.equal(detail.onInstall(), true);
});

test('P3 stock canonique : porté + camp + Kit protégés, consommation exactement une fois après reload', () => {
  const f = fresh(); f.memory.state.researchUnlocks[rewards.camp] = { unlockedAt: 1 };
  f.BF.grantInventory('wood', 4); f.BF.allocateInventoryToExpedition('wood', 4); f.BF.grantCampStorage('wood', 6);
  assert.equal(f.BF.availableInventory('wood'), 10); assert.equal(f.BF.Research.startConstruction('camp'), true);
  assert.equal(confirm(f).onInstall(), true); assert.equal(f.BF.availableInventory('wood'), 0);
  const transaction = Object.values(f.BF.progression.state.transactions)[0]; assert.equal(transaction.quantity, 10);
  const r = reload(f); assert.equal(r.BF.availableInventory('wood'), 0);
  assert.equal(r.BF.consumeInventoryPoolOnce(transaction.id, ['wood'], 10), 10);
  assert.equal(r.BF.availableInventory('wood'), 0); assert.equal(r.BF.progression.state.consumed.wood, 10);
});

test('P3 mission Refuge puis Base : reçus originaux, succès Refuge et Top1 survivent au remplacement', () => {
  const f = fresh(); helpers.established(f, 'T03', 'camp', 1);
  f.window.addEventListener('bluefox:progression-changed', f.runtime.boundProgressionChanged);
  for (const [id, kind] of [['GAME-shelter', 'refuge'], ['GAME-base', 'base']]) {
    fund(f, kind); const tree = f.activate(id), mission = f.runtime.byId.get(id);
    tree.root.walk(node => { if (node.isLeaf) f.completeNode(node); }); tree.refresh();
    assert.equal(f.runtime.canFinalizeMission(id), false);
    assert.equal(f.runtime.beginSitePlacement(mission), true); const detail = confirm(f);
    assert.equal(detail.onInstall(), true); f.manager.syncLifecycleFromTrees();
    assert.equal(f.memory.state.missionLifecycle[id].status, 'completed');
  }
  assert.equal(f.runtime.siteBucket('crystal').refuge, null);
  assert.equal(f.runtime.initialConstructionReceipt(f.runtime.byId.get('GAME-shelter')).siteId, 'crystal:refuge:primary');
  assert(f.memory.state.effectReceipts['GAME-base:completion:v1']);
  const chosen = f.activate('LOC-17@crystal'); f.manager.setPrimaryMission(chosen.id, true, 'Priorité suggérée par le joueur.');
  const consumed = json(f.BF.progression.state.consumed), r = reload(f);
  r.runtime.reconcileStockBackedMissions(); r.manager.syncLifecycleFromTrees();
  for (const id of ['GAME-shelter', 'GAME-base']) {
    assert.equal(r.memory.state.missionLifecycle[id].status, 'completed');
    assert.equal(r.manager.activeMissionIds.includes(id), false); assert.equal(r.manager.activateMission(id), false);
  }
  assert.equal(r.manager.primaryMissionId, chosen.id); assert.equal(r.manager.isPlayerSelectedPrimary(), true,
    JSON.stringify({ lifecycle: r.memory.state.missionLifecycle[chosen.id], selection: r.manager.selectionReason, complete: r.manager.tree?.root?.isComplete }));
  const ui = uiFunctions('engine/mission-ui-bridge.js', ['missionList'], {});
  const listed = ui.missionList(r.manager.getState());
  for (const id of ['GAME-shelter', 'GAME-base']) {
    const entry = listed.find(x => x.missionId === id); assert(entry); assert.equal(entry.status, 'completed');
  }
  assert.deepEqual(json(r.BF.progression.state.consumed), consumed);
  assert.equal(r.runtime.initialConstructionReceipt(r.runtime.byId.get('GAME-shelter')).siteId, 'crystal:refuge:primary');
});

for (const id of ['T03', 'GAME-shelter', 'GAME-base']) test(`P3 ${id}: état terminal sans reçu/gate tardif, aucun hub actif recréé après reload`, () => {
  const f = fresh(), tree = f.activate(id); tree.root.walk(node => { if (node.isLeaf) f.completeNode(node); }); tree.refresh();
  f.memory.state.missionLifecycle[id] = { status: 'completed', completedAt: 123 };
  f.memory.saveTree(tree); f.manager.syncLifecycleFromTrees(); f.manager.syncMissionSelection();
  const r = reload(f); r.runtime.onMissionState({ missions: [], catalog: [] }); r.manager.syncLifecycleFromTrees();
  assert.equal(r.memory.state.missionLifecycle[id].status, 'completed'); assert.equal(r.memory.state.missionLifecycle[id].completedAt, 123);
  assert.equal(r.manager.activeMissionIds.includes(id), false); assert.equal(r.manager.setPrimaryMission(id, true), false);
  assert.equal(r.manager.activateMission(id), false); assert.equal(r.runtime.activePlacement, null);
});

function uiFunctions(file, names, context) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  // Execute exact function blocks from the HEAD consumer, without unrelated UI startup.
  const chunks = names.map(name => {
    const start = text.indexOf('  function ' + name + '('); assert(start >= 0, name);
    const end = text.indexOf('\n  }', start) + 4; assert(end > start); return text.slice(start, end);
  });
  return vm.runInNewContext(chunks.join('\n') + '\n({' + names.join(',') + '})', context);
}
test('P3 popup consommatrice : rotation, Annuler/reprendre, Installer et refus réactivent le bouton', () => {
  const body = new Element();
  const document = { body, createElement: tag => new Element(tag), getElementById: id => body.children.find(x => x.id === id) };
  const ui = uiFunctions('engine/ui-enhancements.js', ['closeSitePlacementFinalize', 'openSitePlacementFinalize'], { document });
  let yaw, cancels = 0, installs = 0, accepted = false;
  const detail = { missionId: 'test', kind: 'refuge', yaw: 0, onRotate: value => { yaw = value; }, onCancel: () => { cancels++; }, onInstall: () => { installs++; return accepted; } };
  assert.equal(ui.openSitePlacementFinalize(detail), true);
  let overlay = document.getElementById('bluefox-site-placement-finalize'), slider = overlay.querySelector('input');
  slider.value = '90'; slider.fire('input'); assert.equal(yaw, Math.PI / 2);
  let buttons = overlay.querySelectorAll('button'); buttons[1].fire('click'); assert.equal(installs, 1); assert.equal(buttons[1].disabled, false);
  buttons[0].fire('click'); assert.equal(cancels, 1); assert.equal(document.getElementById(overlay.id), undefined);
  ui.openSitePlacementFinalize(detail); overlay = document.getElementById(overlay.id); accepted = true;
  overlay.querySelectorAll('button')[1].fire('click'); assert.equal(installs, 2); assert.equal(document.getElementById(overlay.id), undefined);
});

test('P3 menu Missions : noms connus, plusieurs destinations, choix transmis exactement, état terminal exclu', () => {
  const document = { createElement: tag => new Element(tag) }, requests = [];
  const BF = { getMissionPlayerActionDestinations: () => [{ mapId: 'a', label: 'Forêt Boréale' }, { mapId: 'b', label: 'Archipel de Verre' }],
    requestMissionPlayerActionReturn: (id, map) => { requests.push([id, map]); return true; } };
  const ui = uiFunctions('engine/mission-ui-bridge.js', ['missionReturnDestinations', 'createTextElement', 'renderMissionReturnControls'], { document, BF });
  const controls = ui.renderMissionReturnControls({ missionId: 'CONTACT-test', lifecycleStatus: 'active' });
  const select = controls.querySelector('select'), button = controls.querySelector('button');
  assert.deepEqual(select.children.map(x => x.textContent), ['Forêt Boréale', 'Archipel de Verre']);
  select.value = 'b'; select.fire('change'); assert.equal(button.textContent, 'Retourner vers Archipel de Verre');
  button.fire('click'); assert.deepEqual(requests, [['CONTACT-test', 'b']]);
  assert.equal(ui.renderMissionReturnControls({ missionId: 'CONTACT-test', lifecycleStatus: 'completed' }), null);
});

test('P3 destinations runtime : plusieurs lieux connus, noms, route refusée et intention persistée', () => {
  const f = fresh(), id = 'P3-MANUAL-CONTACT';
  const mission = { id, npcEncounters: [{ cuoType: 'npc_test' }], worldEventRequirements: [
    { slot: 'contact', criteria: { type: 'NPC_CONTACTED', interactionSource: 'manual', civilizationId: 'test' } }
  ] };
  f.BF.registerMissionDefinitions([{ ...mission, root: { id: id + ':root', type: 'group', children: [
    { id: id + ':contact', sequenceSlot: 'contact', type: 'observe', target: 1,
      params: { slot: 'contact', sequenceSlot: 'contact', eventDriven: true, catalogManaged: true, cuoType: 'npc_test' } }
  ] } }]);
  f.runtime.byId.set(id, mission); const tree = f.activate(id);
  for (const [mapId, name] of [['a', 'Forêt Boréale'], ['b', 'Archipel de Verre'], ['c', 'Lieu inaccessible']]) {
    f.engine.discoveredMaps.add(mapId); f.BF.maps[mapId] = { id: mapId, name, customObjects: [{ type: 'npc_test' }] };
  }
  f.engine.findKnownRoute = (a, b) => b === 'c' ? null : [a, b];
  assert.equal(f.runtime.missionPlayerContactRequirements(id).length, 1, JSON.stringify(tree.toJSON()));
  const destinations = f.runtime.missionPlayerActionDestinations(id);
  assert.deepEqual(json(destinations.map(x => x.label)).sort(), ['Archipel de Verre', 'Forêt Boréale']);
  assert.equal(f.manager.requestMissionPlayerActionReturn(id, 'c'), false);
  assert.equal(f.manager.requestMissionPlayerActionReturn(id, 'b'), true);
  assert.equal(f.memory.getFact('missionReturnIntent:' + id).targetMapId, 'b');
  f.memory.flush(); const persisted = JSON.parse(f.store.get('bluefox_mission_memory_m0_v1'));
  assert.equal(persisted.facts['missionReturnIntent:' + id].targetMapId, 'b');
  assert.equal(tree.root.isComplete, false);
});

test('P3 snapshot Save réel : flush du stock/site/Top1, restauration exacte et protection unload', async () => {
  const fixtureSource = fs.readFileSync(path.join(__dirname, 'rsave-r2-snapshot-integrity.runtime.test.js'), 'utf8');
  const previous = process.env.SAVE_FILE; let save;
  try {
    process.env.SAVE_FILE = path.join(ROOT, 'engine/save-ui-bridge.js');
    const factory = new Function('require', fixtureSource.slice(0, fixtureSource.indexOf("test('")) + '\nreturn fixture;')(require);
    save = factory();
  } finally { if (previous === undefined) delete process.env.SAVE_FILE; else process.env.SAVE_FILE = previous; }
  await new Promise(resolve => setImmediate(resolve));
  const f = fresh(); fund(f, 'camp'); f.BF.Research.startConstruction('camp'); assert.equal(confirm(f).onInstall(), true);
  const chosen = f.activate('LOC-17@crystal'); f.manager.setPrimaryMission(chosen.id, true, 'Priorité suggérée par le joueur.');
  f.memory.setFact('missionReturnIntent:' + chosen.id, { active: true, missionId: chosen.id, targetMapId: 'remote', source: 'test' });
  f.window.localStorage = save.storage;
  f.memory.storage = save.storage;
  f.BF.progression.storage = save.storage;
  f.BF.multiProgression.storage = save.storage;
  save.BF.currentEngine = f.engine; save.BF.progression = f.BF.progression; save.BF.multiProgression = f.BF.multiProgression;
  f.runtime.saveState();
  assert.equal(await save.BF.createManualSave(1), true, JSON.stringify(save.BF.getSaveDiagnostics()));
  const snapshot = save.fileSlots.get('1'); assert(snapshot);
  const memory = JSON.parse(snapshot.state.bluefox_mission_memory_m0_v1);
  assert.equal(memory.primaryMissionId, chosen.id); assert(memory.siteProgression.crystal.sites.camp);
  assert.equal(Object.keys(memory.effectReceipts).length, 1);
  const r = fresh(snapshot.state); assert.equal(r.manager.primaryMissionId, chosen.id);
  assert.equal(r.BF.availableInventory('wood'), 0); assert.equal(r.BF.progression.state.consumed.wood, 10);
  assert.equal(Object.keys(r.BF.progression.state.transactions).length, 1); assert(r.runtime.siteBucket('crystal').camp);
  assert.equal(r.memory.getFact('missionReturnIntent:' + chosen.id).targetMapId, 'remote');
  const original = snapshot.state.bluefox_mission_memory_m0_v1;
  save.storage.setItem('bluefox_mission_memory_m0_v1', JSON.stringify({ version: 3, primaryMissionId: 'STALE' }));
  assert.equal(await save.BF.loadGame(1), true); assert.equal(save.reloads, 1);
  await save.dispatch('pagehide'); await save.dispatch('beforeunload');
  assert.equal(save.storage.getItem('bluefox_mission_memory_m0_v1'), original);
});
