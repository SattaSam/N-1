const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert/strict');

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..');
class CE { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
const store = new Map();
const listeners = new Map();
const window = {
  console, Math, JSON, Set, Map, WeakMap, Date,
  CustomEvent: CE,
  localStorage: {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  },
  addEventListener(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
  },
  removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
  dispatchEvent(event) {
    for (const fn of listeners.get(event.type) || []) fn(event);
    return true;
  },
  BlueFox3D: {}
};
window.window = window;
const context = vm.createContext(window);
const BF = window.BlueFox3D;
const load = (file) => vm.runInContext(
  fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file }
);

load('engine/object-event-registry.js');
load('engine/progression-multisystem.js');

const makeCustomObject = ({ mapId, sceneId, anchor, index, objectId, instanceId, inventoryKey, family = 'mineral', knowledgeFamily = 'geology' }) => {
  const instanceRoot = {
    userData: { microSceneId: sceneId, microSceneInstance: true },
    position: { x: anchor.x, y: anchor.y || 0, z: anchor.z },
    parent: null
  };
  const pivot = {
    userData: { microSceneId: sceneId, microSceneObjectIndex: index, microScenePivot: true },
    position: { x: 0, y: 0, z: 0 },
    parent: instanceRoot
  };
  const functional = {
    id: objectId,
    resource: inventoryKey ? { inventoryKey, family } : undefined,
    knowledge: { family: knowledgeFamily },
    spawn: { tags: inventoryKey ? ['resource'] : [] }
  };
  const root = {
    userData: {
      catalogId: objectId,
      instanceId,
      functional,
      microSceneId: sceneId,
      microScenePivot: pivot
    },
    parent: pivot
  };
  const hitbox = { userData: { worldAnchor: root }, parent: root };
  BF.currentEngine = { currentMapId: mapId, currentMap: { group: { userData: { microScenes: [] } } } };
  return { instanceRoot, pivot, root, hitbox };
};

const mineA = makeCustomObject({
  mapId: 'map-17', sceneId: 'MSC-CARRIERE', anchor: { x: 12, z: -4 },
  index: 0, objectId: 'magnetic_ore', instanceId: 'runtime-A0', inventoryKey: 'magnetic_ore'
});
let event = BF.ObjectEvents.emit(BF.ObjectEvents.types.OBJECT_SEEN, mineA.hitbox, { mapId: 'map-17' });
assert.equal(event.microSceneInstanceId, 'msc:map-17:MSC-CARRIERE:12.00:-4.00');
assert.equal(event.microSceneAnchor.x, 12); assert.equal(event.microSceneAnchor.y, 0); assert.equal(event.microSceneAnchor.z, -4);
assert.equal(event.microSceneObjectIndex, 0);
assert.equal(BF.getKnownSites({ resource: 'magnetic_ore' }).length, 1);
let site = BF.getKnownSites({ resource: 'magnetic_ore' })[0];
assert.equal(site.knownInstanceCount, 1);
assert.equal(site.resources.magnetic_ore.distinctInstances, 1);
assert.equal(site.sources.bluefox, true);

// Re-observing the same MSC object must not inflate richness.
for (let i = 0; i < 50; i += 1) {
  BF.ObjectEvents.emit(BF.ObjectEvents.types.OBJECT_INSPECTED, mineA.hitbox, { mapId: 'map-17' });
}
site = BF.getKnownSites({ resource: 'magnetic_ore' })[0];
assert.equal(site.knownInstanceCount, 1);
assert.equal(site.resources.magnetic_ore.distinctInstances, 1);
assert.equal(site.instances['slot:0'].knowledgeLevel, 2);

// Distinct objects in the same MSC increase empirical richness.
for (let index = 1; index <= 5; index += 1) {
  const object = makeCustomObject({
    mapId: 'map-17', sceneId: 'MSC-CARRIERE', anchor: { x: 12, z: -4 },
    index, objectId: 'magnetic_ore', instanceId: `runtime-A${index}`, inventoryKey: 'magnetic_ore'
  });
  BF.ObjectEvents.emit(BF.ObjectEvents.types.OBJECT_SEEN, object.hitbox, { mapId: 'map-17' });
}
site = BF.getKnownSites({ resource: 'magnetic_ore' })[0];
assert.equal(site.knownInstanceCount, 6);
assert.equal(site.resources.magnetic_ore.distinctInstances, 6);

// Same MSC definition elsewhere is a separate known site.
const mineB = makeCustomObject({
  mapId: 'map-17', sceneId: 'MSC-CARRIERE', anchor: { x: -18, z: 9 },
  index: 0, objectId: 'magnetic_ore', instanceId: 'runtime-B0', inventoryKey: 'magnetic_ore'
});
BF.ObjectEvents.emit(BF.ObjectEvents.types.OBJECT_SEEN, mineB.hitbox, { mapId: 'map-17', interactionSource: 'drone' });
const mines = BF.getKnownSites({ microSceneId: 'MSC-CARRIERE' });
assert.equal(mines.length, 2);
assert.equal(mines[0].knownInstanceCount, 6, 'richest site first');
assert.equal(mines[1].sources.drone, true, 'Scout knowledge enters same memory');

// A biological MSC is indexed by actually observed family/resource knowledge.
const grove = makeCustomObject({
  mapId: 'map-9', sceneId: 'MSC-BOSQUET-BIO', anchor: { x: 3, z: 14 },
  index: 0, objectId: 'adaptive_plant', instanceId: 'bio-0', inventoryKey: 'biomass', family: 'plant', knowledgeFamily: 'flora'
});
BF.ObjectEvents.emit(BF.ObjectEvents.types.OBJECT_ANALYZED, grove.hitbox, { mapId: 'map-9' });
assert.equal(BF.getKnownSites({ resource: 'biomass' }).length, 1);
assert.equal(BF.getKnownSites({ family: 'flora' }).length, 1);

// Legacy snapshot stays light: geographic site memory is not cloned into frequent consumers.
const legacySnapshot = BF.getMultiProgressionState();
assert.equal(Object.prototype.hasOwnProperty.call(legacySnapshot, 'geographicKnowledge'), false);
assert.equal(BF.getGeographicKnowledgeState().knownSites && Object.keys(BF.getGeographicKnowledgeState().knownSites).length, 3);

// Reload rebuilds indexes once from persisted state; no event-history scan is needed for queries.
const restored = new BF.ProgressionMultiSystem(window.localStorage);
assert.equal(restored.getKnownSites({ resource: 'magnetic_ore' }).length, 2);
const oldHistory = BF.ObjectEvents.history;
BF.ObjectEvents.history = () => { throw new Error('query must not scan event history'); };
assert.equal(restored.getKnownSites({ resource: 'magnetic_ore' })[0].knownInstanceCount, 6);
BF.ObjectEvents.history = oldHistory;

console.log('PASS GEO-MEM-P1 runtime memory, Scout, dedupe, indexes, persistence');
