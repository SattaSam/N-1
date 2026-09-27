const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function fixture() {
  const listeners = new Map();
  const context = {
    console: { info() {}, warn() {}, error() {} }, performance, Math, Date, setTimeout, clearTimeout,
    addEventListener(type, fn) { const list = listeners.get(type) || []; list.push(fn); listeners.set(type, list); },
    removeEventListener() {}, dispatchEvent() {},
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
  };
  context.window = context;
  vm.createContext(context);
  const load = (file) => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  load(path.join(root, 'data', 'bible-patterns.js'));
  load(path.join(root, 'data', 'bible-catalog.js'));
  const BF = context.BlueFox3D;
  BF.Missions = { normalizeActionType: (v) => v, ActionType: { TRAVEL: 'travel' } };
  BF.maps = { origin: { id: 'origin', exits: {} } };
  BF.mount = async ({ engine }) => engine;
  load(path.join(root, 'engine', 'bible-map-prescription-v19.js'));
  return BF;
}

async function prescription(targetId, direction, completedIds = []) {
  const BF = fixture();
  const lifecycle = {};
  for (const mission of BF.BibleCatalog) {
    if (mission.id !== targetId && mission.mapGeneration && mission.trigger?.type === 'exploration.map_discovered') {
      lifecycle[mission.id] = { status: 'completed' };
    }
  }
  for (const id of completedIds) lifecycle[id] = { status: 'completed' };
  const facts = new Map();
  const manager = {
    memory: {
      state: { missionLifecycle: lifecycle },
      getFact(key, fallback) { return facts.has(key) ? facts.get(key) : fallback; },
      setFact(key, value) { facts.set(key, value); },
      save() {}
    },
    trees: new Map(), selectBestPrimary() {}, publish() {}
  };
  let captured = null;
  const engine = {
    currentMapId: 'origin', missionManager: manager, navigationRoute: [],
    callbacks: { onStatus() {} }, clearPersistentNavigationIntent() {},
    generateUnknownPassage: async () => {
      captured = BF.__pendingBibleMapGeneration ? JSON.parse(JSON.stringify(BF.__pendingBibleMapGeneration)) : null;
      return false;
    }
  };
  BF.currentEngine = engine;
  await BF.mount({ engine });
  await engine.generateUnknownPassage(direction, {});
  return captured;
}

test('ARCH-03: prescription garantit deux stèles', async () => {
  const p = await prescription('ARCH-03', 'north', ['ARCH-01','ARCH-02']);
  assert.equal(p?.missionId, 'ARCH-03');
  const stele = p?.requiredObjects?.find((entry) => entry.type === 'stele');
  assert.ok(stele);
  assert.ok(stele.count >= 2);
});

test('ARCH-04: prescription garantit la MSC qui porte le relay_block', async () => {
  const p = await prescription('ARCH-04', 'north', ['ARCH-01','ARCH-02','ARCH-03']);
  assert.equal(p?.missionId, 'ARCH-04');
  assert.equal(p?.requiredMicroScenes?.[0]?.id, 'MSC-CUSTOM-COMPOSANT-RUIN');
});

test('ARCH-01/02 Nord et ARCH-06 Ouest restent directionnels', async () => {
  const a1 = await prescription('ARCH-01', 'north', []);
  assert.equal(a1?.missionId, 'ARCH-01');
  const a2 = await prescription('ARCH-02', 'north', ['ARCH-01']);
  assert.equal(a2?.missionId, 'ARCH-02');
  const west = await prescription('ARCH-06', 'west', ['ARCH-01','ARCH-02','ARCH-03','ARCH-04','ARCH-05']);
  assert.equal(west?.missionId, 'ARCH-06');
  const east = await prescription('ARCH-06', 'east', ['ARCH-01','ARCH-02','ARCH-03','ARCH-04','ARCH-05']);
  assert.equal(east, null);
});
