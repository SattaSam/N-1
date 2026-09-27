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

test('ARCH-R2: ObjectM0 filtre microSceneId par le chemin runtime réel', async () => {
  const { BF, engine, manager, position } = fixture();
  await BF.mount({ engine });

  const mission = {
    id: 'TEST-ARCH-R2-MSC',
    title: 'Filtre MSC ObjectM0',
    pattern: 'SEQUENCE_ACTIONS',
    trigger: { type: 'manual' },
    sequence: [
      {
        slot: 'study',
        title: 'Étudier une arche du sanctuaire',
        action: 'observe',
        target: 1,
        requires: [],
        params: {
          cuoType: 'arch',
          microSceneId: 'MSC-CUSTOM-SANCTUAIRE-RING'
        }
      }
    ]
  };
  const tree = registerMission(BF, manager, mission);
  const node = tree.find('TEST-ARCH-R2-MSC:study');
  const definition = BF.ObjectLibrary.get('arch');
  assert.ok(definition);

  const wrong = objectValue(
    definition,
    'arch-wrong',
    position(1),
    { microSceneId: 'MSC-CUSTOM-RUINE-MODULAIRE2' }
  );
  emitStudy(BF, wrong, mission.id, node.id, {
    cuoType: 'arch',
    microSceneId: 'MSC-CUSTOM-RUINE-MODULAIRE2'
  });
  assert.equal(node.progress, 0);

  const right = objectValue(
    definition,
    'arch-right',
    position(2),
    { microSceneId: 'MSC-CUSTOM-SANCTUAIRE-RING' }
  );
  emitStudy(BF, right, mission.id, node.id, {
    cuoType: 'arch',
    microSceneId: 'MSC-CUSTOM-SANCTUAIRE-RING'
  });
  assert.equal(node.progress, 1);
  assert.equal(manager.ensureLifecycle(mission.id).status, 'completed');
});
