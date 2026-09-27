const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function fixture() {
  const listeners = new Map();
  const storage = new Map();
  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }

  const window = {
    CustomEvent,
    console,
    performance,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    BlueFox3D: {},
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event) {
      for (const listener of [...(listeners.get(event.type) || [])]) listener(event);
      return true;
    }
  };

  const context = vm.createContext({
    window,
    console,
    CustomEvent,
    performance,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  });
  const load = (file) => vm.runInContext(
    fs.readFileSync(path.join(root, file), 'utf8'),
    context,
    { filename: file }
  );

  load('engine/object-library.js');
  [
    'engine/mission-types.js',
    'engine/mission-tree.js',
    'engine/mission-memory.js',
    'engine/mission-planner.js',
    'engine/action-bridge.js',
    'engine/mission-manager.js',
    'engine/mission-empty-core.js',
    'engine/mission-catalog.js',
    'engine/object-event-registry.js',
    'engine/bible-contract-v0-1.js',
    'data/bible-patterns.js',
    'data/bible-catalog.js',
    'engine/bible-runtime-v0-1-unified.js'
  ].forEach(load);

  window.BlueFox3D.mount = async ({ engine }) => engine;
  load('engine/object-m0-bridge.js');

  const BF = window.BlueFox3D;
  const position = (x = 0) => ({
    x, y: 0, z: 0,
    distanceTo(other) {
      return Math.hypot(
        this.x - Number(other?.x || 0),
        this.y - Number(other?.y || 0),
        this.z - Number(other?.z || 0)
      );
    }
  });
  const rootPosition = position(0);
  const engine = {
    callbacks: { onAction() {}, onStatus() {}, onCollect() {}, onSpeak() {} },
    currentMapId: 'map-a',
    currentZoneIndex: 0,
    currentMap: { interactables: [], zoneRegions: [], gates: [] },
    character: {
      root: { position: rootPosition },
      target: rootPosition,
      stop() {},
      setTarget() { return true; },
      facePoint() {},
      cancelInteraction() {},
      findAvailableClip() { return ''; },
      actions: new Map(),
      play() {},
      playInteraction() { return 0; },
      currentAnimation: ''
    },
    discoveredZones: new Set(),
    pendingInteraction: null,
    currentRoutine: null,
    pendingGate: null,
    pendingZoneExploration: null,
    transitioning: false,
    resourceCooldowns: new WeakMap(),
    disposed: false,
    interactionWorldPosition(value) { return value.position; },
    interactionValidationDistance() { return 2; },
    interactionApproachPoint(value) {
      return { point: value.position, approachDistance: 1 };
    },
    showWorldMarker() {},
    targetInteraction(value) {
      this.lastMissionTarget = value;
      this.pendingInteraction = value;
      return true;
    }
  };

  const manager = BF.Missions.MissionManager.create({ engine });
  engine.missionManager = manager;
  BF.currentEngine = engine;
  BF.getMissionState = () => manager.getState();

  return { window, BF, engine, manager, position };
}

function objectValue(definition, instanceId, position, metadata = {}) {
  const value = {
    position,
    userData: {
      active: true,
      functional: definition,
      instanceId,
      ...metadata
    }
  };
  value.userData.worldAnchor = value;
  return value;
}

function registerMission(BF, manager, mission) {
  const report = BF.BibleContractV01.validateMission(mission, BF.BiblePatterns);
  assert.equal(report.ok, true, (report.errors || []).join('\n'));

  const compiled = BF.bibleRuntime.compileMission(mission);
  assert.ok(compiled, `${mission.id} non compilée`);
  BF.bibleRuntime.byId.set(mission.id, mission);
  BF.BibleCatalog = Object.freeze([...BF.BibleCatalog, mission]);
  BF.registerMissionDefinitions([compiled]);
  assert.equal(
    manager.startMission(mission.id, { primary: true, autoPrimaryEligible: false }),
    true
  );
  return manager.trees.get(mission.id);
}

function emitStudy(BF, source, missionId, nodeId, detail = {}) {
  return BF.ObjectEvents.emit(BF.ObjectEvents.types.PHENOMENON_OBSERVED, source, {
    mapId: BF.currentEngine?.currentMapId || 'map-a',
    missionId,
    missionNodeId: nodeId,
    interactionSource: 'mission',
    ...detail
  });
}

test('M0 cuoTypes: OR strict arch/stele/tech_relic via runtime réel', async () => {
  const { BF, engine, manager, position } = fixture();
  await BF.mount({ engine });

  const mission = {
    id: 'TEST-ARCH-R3-CUOTYPES',
    title: 'OR CUO ObjectM0',
    pattern: 'SEQUENCE_ACTIONS',
    trigger: { type: 'manual' },
    sequence: [
      {
        slot: 'study',
        title: 'Étudier trois familles architecturales',
        action: 'observe',
        target: 3,
        requires: [],
        params: {
          cuoTypes: ['arch', 'stele', 'tech_relic'],
          distinctBy: 'instanceId'
        }
      }
    ]
  };
  const tree = registerMission(BF, manager, mission);
  const node = tree.find('TEST-ARCH-R3-CUOTYPES:study');

  for (const [index, cuoType] of ['arch', 'stele', 'tech_relic'].entries()) {
    const definition = BF.ObjectLibrary.get(cuoType);
    assert.ok(definition, cuoType);
    const value = objectValue(definition, `allowed-${index}`, position(index + 1));
    emitStudy(BF, value, mission.id, node.id, { cuoType });
  }

  assert.equal(node.progress, 3);
  assert.equal(manager.ensureLifecycle(mission.id).status, 'completed');
});

test('M0 cuoTypes: normalisation et compatibilité cuoType existant', async () => {
  const { BF, engine, manager, position } = fixture();
  await BF.mount({ engine });

  const orMission = {
    id: 'TEST-ARCH-R3-NORMALIZED',
    title: 'Normalisation CUO',
    pattern: 'SEQUENCE_ACTIONS',
    trigger: { type: 'manual' },
    sequence: [
      {
        slot: 'study',
        title: 'Étudier une stèle',
        action: 'observe',
        target: 1,
        requires: [],
        params: { cuoTypes: ['arch', 'stele'] }
      }
    ]
  };
  const orTree = registerMission(BF, manager, orMission);
  const stele = BF.ObjectLibrary.get('stele');
  assert.ok(stele);
  emitStudy(
    BF,
    objectValue(stele, 'normalized-stele', position(1)),
    orMission.id,
    'TEST-ARCH-R3-NORMALIZED:study',
    { cuoType: 'STELE' }
  );
  assert.equal(orTree.find('TEST-ARCH-R3-NORMALIZED:study').progress, 1);

  const exactMission = {
    id: 'TEST-ARCH-R3-EXACT',
    title: 'Compatibilité cuoType',
    pattern: 'SEQUENCE_ACTIONS',
    trigger: { type: 'manual' },
    sequence: [
      {
        slot: 'study',
        title: 'Étudier une arche exacte',
        action: 'observe',
        target: 1,
        requires: [],
        params: { cuoType: 'arch' }
      }
    ]
  };
  const exactTree = registerMission(BF, manager, exactMission);
  const exactNode = exactTree.find('TEST-ARCH-R3-EXACT:study');

  emitStudy(
    BF,
    objectValue(stele, 'wrong-stele', position(2)),
    exactMission.id,
    exactNode.id,
    { cuoType: 'stele' }
  );
  assert.equal(exactNode.progress, 0);

  const arch = BF.ObjectLibrary.get('arch');
  assert.ok(arch);
  emitStudy(
    BF,
    objectValue(arch, 'right-arch', position(3)),
    exactMission.id,
    exactNode.id,
    { cuoType: 'arch' }
  );
  assert.equal(exactNode.progress, 1);
});

test('M0 cuoTypes: les autres filtres restent cumulés', async () => {
  const { BF, engine, manager, position } = fixture();
  await BF.mount({ engine });

  const mission = {
    id: 'TEST-ARCH-R3-CUMULATIVE',
    title: 'Filtres cumulés ObjectM0',
    pattern: 'SEQUENCE_ACTIONS',
    trigger: { type: 'manual' },
    sequence: [
      {
        slot: 'study',
        title: 'Étudier une preuve architecturale',
        action: 'observe',
        target: 1,
        requires: [],
        params: {
          cuoTypes: ['arch', 'stele'],
          tagsAll: ['evidence']
        }
      }
    ]
  };
  const tree = registerMission(BF, manager, mission);
  const node = tree.find('TEST-ARCH-R3-CUMULATIVE:study');
  const arch = BF.ObjectLibrary.get('arch');
  assert.ok(arch);

  emitStudy(
    BF,
    objectValue(arch, 'arch-without-evidence', position(1)),
    mission.id,
    node.id,
    { cuoType: 'arch', tags: [] }
  );
  assert.equal(node.progress, 0);

  emitStudy(
    BF,
    objectValue(arch, 'arch-with-evidence', position(2)),
    mission.id,
    node.id,
    { cuoType: 'arch', tags: ['evidence'] }
  );
  assert.equal(node.progress, 1);
  assert.equal(manager.ensureLifecycle(mission.id).status, 'completed');
});
