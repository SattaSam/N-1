const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  add(other) { this.x += other.x || 0; this.y += other.y || 0; this.z += other.z || 0; return this; }
}

function fakeRoot(position = { x: 0, y: 0, z: 0 }) {
  return {
    position: { ...position },
    userData: {},
    parent: { remove() {} },
    getWorldPosition(out) { out.x = this.position.x || 0; out.y = this.position.y || 0; out.z = this.position.z || 0; return out; }
  };
}

function loadHierarchy() {
  const BF = {};
  class Spawner {
    constructor() {
      this.instances = [];
      this.microSceneInstances = [];
      this.random = () => 0.37;
      this.THREE = { Vector3 };
      this.scene = null;
    }
    spawn(type, options = {}) {
      const root = fakeRoot(options.position || { x: 0, y: 0, z: 0 });
      const record = {
        type,
        position: { ...(options.position || { x: 0, y: 0, z: 0 }) },
        root,
        instance: { hitbox: null, colliders: [] }
      };
      this.instances.push(record);
      return record;
    }
    spawnMicroScene(id, options = {}) {
      const entry = { id, instanceId: `${id}:${this.microSceneInstances.length + 1}`, records: [] };
      this.microSceneInstances.push(entry);
      const group = options.scene;
      if (group) {
        group.userData ||= {};
        group.userData.microScenes = this.microSceneInstances;
      }
      return [{
        type: 'msc-object',
        root: fakeRoot(options.origin),
        instanceRoot: fakeRoot(options.origin),
        objectRoot: fakeRoot(options.origin),
        instance: { hitbox: null, colliders: [] }
      }];
    }
    populateMap(options = {}) {
      options.group.userData ||= {};
      options.group.userData.microScenes = this.microSceneInstances;
      return { occupied: [] };
    }
  }
  BF.ObjectSpawner = Spawner;
  BF.ObjectLibrary = {
    get: () => ({ obstacle: false }),
    getMapPlacement: () => ({ radius: 0.6 })
  };
  const sceneDefs = new Map([
    ['MSC-CUSTOM-CORAILBIOLUMINESCENT1', { id: 'MSC-CUSTOM-CORAILBIOLUMINESCENT1', radius: 5, objects: [] }],
    ['MSC-CUSTOM-CORAILBIOLUMINESCENT2', { id: 'MSC-CUSTOM-CORAILBIOLUMINESCENT2', radius: 5, objects: [] }],
    ['MSC-CUSTOM-CORAILBIOLUMINESCENT3', { id: 'MSC-CUSTOM-CORAILBIOLUMINESCENT3', radius: 5, objects: [] }],
    ['MSC-SUSPENDED-ISLAND-001', { id: 'MSC-SUSPENDED-ISLAND-001', radius: 11, objects: [] }],
    ['MSC-FEATURED-TEST', { id: 'MSC-FEATURED-TEST', radius: 6, objects: [] }]
  ]);
  BF.MicroScenes = { get: id => sceneDefs.get(id) || null };
  const context = vm.createContext({ window: { BlueFox3D: BF }, console, Math, Object, Array, Set, Map, String, Number });
  vm.runInContext(read('engine/map-population-hierarchy.js'), context, { filename: 'map-population-hierarchy.js' });
  return BF;
}

function zones(count) {
  return Array.from({ length: count }, (_, i) => ({ center: { x: i * 70, z: 0 }, halfSize: 27 }));
}

function populate(BF, definition, count) {
  const spawner = new BF.ObjectSpawner();
  const group = { userData: {} };
  spawner.populateMap({
    definition,
    group,
    zoneRegions: zones(count),
    resolvedExits: {},
    internalZonePaths: [],
    interactables: [],
    colliders: [],
    animatedObjects: [],
    random: () => 0.37
  });
  return { spawner, group };
}

test('P1 source: ObjectSpawner ne déplie plus les featured et transmet baseTemplateName', () => {
  const source = read('engine/object-spawner.js');
  assert.doesNotMatch(source, /featuredGeneratedScenes/);
  assert.doesNotMatch(source, /underwaterCoralSceneIds/);
  assert.match(source, /generator\?\.baseTemplateName/);
  assert.match(source, /floatingIsletTarget/);
  assert.match(source, /standaloneFloatingIsletCount < floatingIsletTarget/);
  assert.match(source, /placeObject\("mobile_islet"/);
});

test('P1 source: le quota landmark ne dépend plus des featured', () => {
  const source = read('engine/object-spawner.js');
  assert.doesNotMatch(source, /Math\.max\(\s*requestedFeaturedSceneIds\.length/);
  assert.match(source, /const landmarkCount = mapBudget\.landmarksMin \+ Math\.floor/);
});

test('P1 runtime: une map bioluminescente 1 plateau reçoit exactement 1 vraie MSC corail', () => {
  const BF = loadHierarchy();
  const { group } = populate(BF, {
    id: 'aqua-1', profile: 'aquatic', name: 'Nom BlueFox',
    generator: { baseTemplateName: 'Monde sous marin bioluminescent' },
    traits: []
  }, 1);
  const corals = group.userData.microScenes.filter(e => /^MSC-CUSTOM-CORAILBIOLUMINESCENT/.test(e.id));
  assert.equal(corals.length, 1);
});

test('P1 runtime: 2-3 plateaux donnent 2 coraux et 4-6 donnent 3 coraux', () => {
  for (const [plateaus, expected] of [[2, 2], [3, 2], [4, 3], [6, 3]]) {
    const BF = loadHierarchy();
    const { group } = populate(BF, {
      id: `aqua-${plateaus}`, profile: 'aquatic', name: 'Nom BlueFox',
      generator: { baseTemplateName: 'Océan bioluminescent sous marin' }, traits: []
    }, plateaus);
    const corals = group.userData.microScenes.filter(e => /^MSC-CUSTOM-CORAILBIOLUMINESCENT/.test(e.id));
    assert.equal(corals.length, expected, `${plateaus} plateaux`);
    assert.equal(new Set(corals.map(e => e.id)).size, expected, 'variantes corail distinctes');
  }
});

test('P1 runtime: featured et signature déjà enregistrées ne doublonnent pas', () => {
  const BF = loadHierarchy();
  const spawner = new BF.ObjectSpawner();
  spawner.microSceneInstances.push({ id: 'MSC-SUSPENDED-ISLAND-001', instanceId: 'existing' });
  const group = { userData: { microScenes: spawner.microSceneInstances } };
  spawner.populateMap({
    definition: {
      id: 'floating', profile: 'alien', name: 'îles flottantes',
      generator: { biomeId: 'floating_islands', featuredMicroSceneIds: ['MSC-FEATURED-TEST'] }, traits: []
    },
    group, zoneRegions: zones(4), resolvedExits: {}, internalZonePaths: [],
    interactables: [], colliders: [], animatedObjects: [], random: () => 0.37
  });
  assert.equal(group.userData.microScenes.filter(e => e.id === 'MSC-SUSPENDED-ISLAND-001').length, 1);
  assert.equal(group.userData.microScenes.filter(e => e.id === 'MSC-FEATURED-TEST').length, 1);
});

test('P1 source: la densité des îles flottantes concerne mobile_islet, jamais la grosse MSC custom', () => {
  const source = read('engine/object-spawner.js');
  assert.match(source, /plateauCount <= 1[\s\S]*\? 1[\s\S]*plateauCount <= 3[\s\S]*\? 2[\s\S]*Math\.min\(5, plateauCount - 1\)/);
  assert.doesNotMatch(read('engine/map-population-hierarchy.js'), /for[\s\S]{0,160}MSC-CUSTOM-ILES-SUSPENDUES2/);
});

function loadObjectSpawnerForFloatingIslets() {
  class V3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    clone() { return new V3(this.x, this.y, this.z); }
    applyAxisAngle() { return this; }
    add(other) { this.x += other.x || 0; this.y += other.y || 0; this.z += other.z || 0; return this; }
  }
  class Group {
    constructor() {
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.scale = { setScalar() {}, multiplyScalar() {} };
      this.userData = {};
      this.children = [];
    }
    add(child) { this.children.push(child); child.parent = this; }
    traverse(visitor) { visitor(this); this.children.forEach(visitor); }
    getWorldPosition(out) { out.x = this.position.x; out.y = this.position.y; out.z = this.position.z; return out; }
  }
  const definitions = new Map();
  for (const type of ['rock', 'mobile_islet', 'frond', 'fiber']) {
    definitions.set(type, {
      id: type,
      type,
      rarity: 'common',
      obstacle: type === 'rock',
      spawn: { minDistance: 0, maxPerZone: Infinity }
    });
  }
  const BF = {
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    ObjectLibrary: {
      get: type => definitions.get(type) || null,
      getById: id => definitions.get(id) || null,
      getMapPlacement: type => ({ radius: type === 'mobile_islet' ? 2.2 : 0.8, volume: type === 'rock' ? 'large' : 'small' }),
      create(THREE, type) {
        const root = new Group();
        return { root, hitbox: null, colliders: [] };
      }
    },
    BiomeRules: {
      getMapPopulation() {
        return {
          profileId: 'alien',
          rockCount: 0,
          resourceWeights: [],
          resourcePattern: [],
          resourceFamilies: [],
          richness: 'normal',
          decorations: [['mobile_islet', 100]]
        };
      },
      get: () => ({ id: 'alien', budget: 0 }),
      candidates: () => []
    },
    MicroScenes: {
      data: {},
      get: () => null,
      plan: () => [],
      getMapCluster: () => ({ isolatedChance: 1, minSize: 1, sizeRange: 0, minRadius: 1, radiusRange: 1 }),
      getMapLandmark: () => []
    }
  };
  const context = vm.createContext({
    window: { BlueFox3D: BF, THREE: { Vector3: V3, Group, Color: class Color {} } },
    console, Math, Object, Array, Set, Map, String, Number, Date
  });
  vm.runInContext(read('engine/object-spawner.js'), context, { filename: 'object-spawner.js' });
  return { BF, THREE: context.window.THREE, Group };
}

function floatingZones(count) {
  const centers = [
    [0, 0], [65, 0], [-65, 0], [0, 65], [0, -65], [65, 65]
  ];
  return Array.from({ length: count }, (_, index) => ({
    center: { x: centers[index][0], z: centers[index][1] }, halfSize: 27
  }));
}

test('P1 runtime ObjectSpawner: la densité 1..5 concerne les mobile_islet autonomes', () => {
  const expected = new Map([[1, 1], [2, 2], [3, 2], [4, 3], [6, 5]]);
  for (const [plateaus, target] of expected) {
    const { BF, THREE, Group } = loadObjectSpawnerForFloatingIslets();
    const group = new Group();
    const spawner = new BF.ObjectSpawner({ THREE, scene: group, random: () => 0.41 });
    spawner.populateMap({
      definition: {
        id: `floating-${plateaus}`,
        number: 20,
        generated: true,
        profile: 'alien',
        name: 'Archipel flottant',
        entry: { x: 0, z: 0 },
        traits: [],
        populationBudget: { allowCustomRange: true, targetObjects: 12, resources: 0 },
        generator: { biomeId: 'floating_islands', discoveryIndex: 20, microSceneIds: [] }
      },
      group,
      zoneRegions: floatingZones(plateaus),
      bounds: { minX: -110, maxX: 110, minZ: -110, maxZ: 110 },
      resolvedExits: {}, internalZonePaths: [], landmarks: [],
      colliders: [], interactables: [], animatedObjects: [], random: () => 0.41
    });
    const standalone = spawner.instances.filter(record =>
      record.type === 'mobile_islet' && record.root?.userData?.spawnSource === 'map-population'
    );
    assert.equal(standalone.length, target, `${plateaus} plateaux`);
  }
});

test('P1 runtime: une signature obligatoire se place même si le décor occupe tout l’espace', () => {
  const BF = loadHierarchy();
  BF.ObjectLibrary.getMapPlacement = type => ({ radius: type === 'blocker' ? 200 : 0.6 });
  const spawner = new BF.ObjectSpawner();
  spawner.instances.push({
    type: 'blocker',
    position: { x: 0, y: 0, z: 0 },
    root: fakeRoot({ x: 0, y: 0, z: 0 }),
    instance: { hitbox: null, colliders: [] }
  });
  const group = { userData: { microScenes: spawner.microSceneInstances } };
  spawner.populateMap({
    definition: {
      id: 'aqua-saturated', profile: 'aquatic', name: 'Nom BlueFox',
      generator: { baseTemplateName: 'Monde sous marin bioluminescent' }, traits: []
    },
    group, zoneRegions: zones(1), resolvedExits: {}, internalZonePaths: [],
    interactables: [], colliders: [], animatedObjects: [], random: () => 0.37
  });
  assert.equal(group.userData.microScenes.filter(e => /^MSC-CUSTOM-CORAILBIOLUMINESCENT/.test(e.id)).length, 1);
});

test('P1 source: la géométrie interne CUO-Lab reste sous le pivot local canonique', () => {
  const source = read('engine/object-spawner.js');
  assert.match(source, /objectPivot\.position\.set\(\s*Number\(offset\[0\]\)/);
  assert.match(source, /objectPivot\.rotation\.set\(\s*Number\(rotation\[0\]\)/);
  assert.match(source, /transformContract = "cuo-lab-canonical-v1"/);
});
