const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(other) { this.x += other.x || 0; this.y += other.y || 0; this.z += other.z || 0; return this; }
}

class Group {
  constructor() {
    this.name = '';
    this.userData = {};
    this.children = [];
    this.parent = null;
    this.position = {
      x: 0, y: 0, z: 0,
      set: (x, y, z) => { this.position.x = x; this.position.y = y; this.position.z = z; }
    };
    this.rotation = { x: 0, y: 0, z: 0 };
  }
  add(child) { this.children.push(child); child.parent = this; }
  getObjectByProperty(key, value) {
    if (this[key] === value) return this;
    for (const child of this.children) {
      const found = child?.getObjectByProperty?.(key, value) || (child?.[key] === value ? child : null);
      if (found) return found;
    }
    return null;
  }
}

function harness({ colliders = [], walkableRegions = [{ minX: -20, maxX: 20, minZ: -20, maxZ: 20 }] } = {}) {
  const spawnCalls = [];
  const BF = {
    MicroScenes: {
      get(id) {
        if (id === 'MSC-MISSION') return { id, radius: 7, rarity: 'story' };
        if (id === 'MSC-CANONICAL') return { id, radius: 5, rarity: 'story' };
        if (id === 'MSC-WORLD') return { id, radius: 7, rarity: 'rare' };
        return null;
      }
    },
    MapIntegrity: { persistGeneratedDefinition() { return true; } },
    currentEngine: null
  };

  BF.ObjectSpawner = class ObjectSpawner {
    constructor(options = {}) { this.scene = options.scene; }
    spawnMicroScene(id, options = {}) {
      spawnCalls.push({ id, options });
      const root = new Group();
      root.userData = {};
      const objectRoot = new Group();
      objectRoot.updateWorldMatrix = () => {};
      objectRoot.localToWorld = (v) => v;
      return [{
        root,
        objectRoot,
        instanceRoot: null,
        instance: { hitbox: null, colliders: [] }
      }];
    }
  };

  const context = vm.createContext({
    window: { BlueFox3D: BF }, console,
    Date, Math, Object, Array, Set, Map, JSON, Number, String
  });
  vm.runInContext(read('engine/persistent-micro-scenes-v20.js'), context, {
    filename: 'persistent-micro-scenes-v20.js'
  });

  const group = new Group();
  group.userData.microScenes = [];
  const built = { group, colliders: [...colliders], interactables: [], walkableRegions };
  return { BF, THREE: { Group, Vector3 }, built, spawnCalls };
}

function missionRecord(extra = {}) {
  return {
    instanceId: 'map-x:MISSION-X:MSC-MISSION',
    missionId: 'MISSION-X',
    microSceneId: 'MSC-MISSION',
    contextRole: 'objectiveSubject',
    rotation: 0.75,
    persistent: true,
    ...extra
  };
}

function definition(extra = {}) {
  return {
    id: 'map-x',
    entry: { x: -18, y: 0, z: -18 },
    exits: { east: { x: 18, y: 0, z: 0 } },
    palette: {},
    ...extra
  };
}

test('P2: une MSC missionnelle saturée par les colliders reçoit quand même un ancrage terminal et spawn', () => {
  const h = harness({
    colliders: [{ position: { x: 0, y: 0, z: 0 }, radius: 1000 }]
  });
  const record = missionRecord();
  const ok = h.BF.PersistentMicroScenes.spawnRecord(h.THREE, h.built, definition(), record);
  assert.equal(ok, true);
  assert.equal(h.spawnCalls.length, 1);
  assert.equal(h.built.group.userData.microScenes.length, 1);
  assert.equal(h.built.group.userData.microScenes[0].instanceId, record.instanceId);
  assert.ok(Number.isFinite(record.anchor.x));
  assert.ok(Number.isFinite(record.anchor.z));
});

test('P2: le fallback terminal ne modifie jamais la géométrie locale de la MSC', () => {
  const h = harness({ colliders: [{ position: { x: 0, z: 0 }, radius: 1000 }] });
  const record = missionRecord({ rotation: 1.2 });
  h.BF.PersistentMicroScenes.spawnRecord(h.THREE, h.built, definition(), record);
  const call = h.spawnCalls[0];
  assert.equal(call.options.origin.x, 0);
  assert.equal(call.options.origin.y, 0);
  assert.equal(call.options.origin.z, 0);
  assert.equal(call.options.rotation, 0);
  const root = h.built.group.getObjectByProperty('name', `PersistentMicroScene:${record.instanceId}`);
  assert.ok(root);
  assert.equal(root.rotation.y, 1.2);
  assert.equal(root.position.x, record.anchor.x);
  assert.equal(root.position.y, record.anchor.y);
  assert.equal(root.position.z, record.anchor.z);
});

test('P2: sans walkableRegions, un ancrage missionnel préexistant est préservé plutôt que d abandonner', () => {
  const h = harness({ walkableRegions: [] });
  const preferred = { x: 9, y: 0.4, z: -7 };
  const record = missionRecord({ anchor: preferred });
  assert.equal(h.BF.PersistentMicroScenes.spawnRecord(h.THREE, h.built, definition(), record), true);
  assert.equal(record.anchor.x, preferred.x);
  assert.equal(record.anchor.y, preferred.y);
  assert.equal(record.anchor.z, preferred.z);
});

test('P2: sans walkableRegions ni ancrage, le dernier recours missionnel reste déterministe', () => {
  const h = harness({ walkableRegions: [] });
  const record = missionRecord();
  const def = definition({ entry: { x: 3, y: 0, z: 4 } });
  assert.equal(h.BF.PersistentMicroScenes.spawnRecord(h.THREE, h.built, def, record), true);
  assert.equal(record.anchor.x, 3);
  assert.equal(record.anchor.y, 0);
  assert.equal(record.anchor.z, 4);
});

test('P2: une scène persistante non missionnelle conserve le contrat historique et peut refuser la saturation', () => {
  const h = harness({ colliders: [{ position: { x: 0, z: 0 }, radius: 1000 }] });
  const record = {
    instanceId: 'map-x:world:MSC-WORLD', missionId: null, microSceneId: 'MSC-WORLD', persistent: true
  };
  assert.equal(h.BF.PersistentMicroScenes.spawnRecord(h.THREE, h.built, definition(), record), false);
  assert.equal(h.spawnCalls.length, 0);
});

test('P2: le placement canonique tutoriel reste prioritaire et inchangé', () => {
  const h = harness({ colliders: [{ position: { x: 6, z: 3 }, radius: 1000 }] });
  const record = {
    instanceId: 'crystal:TUTORIAL:MSC-CANONICAL', missionId: 'TUTORIAL', microSceneId: 'MSC-CANONICAL', rotation: 0
  };
  const def = definition({
    id: 'crystal',
    crashSite: { campSitePlacements: {
      'MSC-CANONICAL': { position: { x: 6.17, y: 0.25, z: 3.25 }, rotation: [0, 0.6, 0] }
    }}
  });
  assert.equal(h.BF.PersistentMicroScenes.spawnRecord(h.THREE, h.built, def, record), true);
  assert.equal(record.anchor.x, 6.17);
  assert.equal(record.anchor.y, 0.25);
  assert.equal(record.anchor.z, 3.25);
  assert.equal(record.rotation, 0.6);
  assert.equal(record.fixedAnchor, true);
});

test('P2: le même instanceId ne respawn pas et reste une seule MSC autoritaire', () => {
  const h = harness();
  const record = missionRecord();
  assert.equal(h.BF.PersistentMicroScenes.spawnRecord(h.THREE, h.built, definition(), record), true);
  assert.equal(h.BF.PersistentMicroScenes.spawnRecord(h.THREE, h.built, definition(), record), true);
  assert.equal(h.spawnCalls.length, 1);
  assert.equal(h.built.group.userData.microScenes.filter(e => e.instanceId === record.instanceId).length, 1);
});

test('P2: si la racine physique existe mais que l index a été perdu, elle est réindexée sans double spawn', () => {
  const h = harness();
  const record = missionRecord();
  assert.equal(h.BF.PersistentMicroScenes.spawnRecord(h.THREE, h.built, definition(), record), true);
  h.built.group.userData.microScenes.length = 0;
  assert.equal(h.BF.PersistentMicroScenes.spawnRecord(h.THREE, h.built, definition(), record), true);
  assert.equal(h.spawnCalls.length, 1);
  assert.equal(h.built.group.userData.microScenes.length, 1);
  assert.equal(h.built.group.userData.microScenes[0].instanceId, record.instanceId);
  assert.ok(h.built.group.userData.microScenes[0].instanceRoot);
});

test('P2 source: aucun offset/pivot CUO Lab n est modifié dans PersistentMicroScenes', () => {
  const source = read('engine/persistent-micro-scenes-v20.js');
  assert.match(source, /findMissionTerminalAnchor/);
  assert.match(source, /origin: \{ x: 0, y: 0, z: 0 \}/);
  assert.match(source, /rotation: 0,/);
  assert.doesNotMatch(source, /MSCObjectPivot/);
  assert.doesNotMatch(source, /entry\.offset/);
});
