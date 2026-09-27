const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const context = { console: { info() {}, warn() {}, error() {} } };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'bible-catalog.js'), 'utf8'), context);

const catalog = context.BlueFox3D.BibleCatalog;

test('ARCH-04: chaque cycle relay_block SAME-INSTANCE dispose d’une instance physique dédiée dans sa MSC', () => {
  const cyclesByScene = new Map();

  for (const mission of catalog) {
    const sequence = Array.isArray(mission.sequence) ? mission.sequence : [];
    for (const collect of sequence.filter((step) => step.action === 'collect' && step.params?.cuoType === 'relay_block')) {
      const relation = collect.params?.relation;
      if (!relation?.fromSlot || !Array.from(relation.sameBy || []).includes('instanceId')) continue;
      const observe = sequence.find((step) => step.slot === relation.fromSlot);
      if (!observe || observe.action !== 'observe' || observe.params?.cuoType !== 'relay_block') continue;
      const sceneId = collect.params?.microSceneId || observe.params?.microSceneId;
      assert.ok(sceneId, `${mission.id}: cycle relay_block sans MSC`);
      const key = sceneId;
      cyclesByScene.set(key, (cyclesByScene.get(key) || 0) + 1);
    }
  }

  assert.ok((cyclesByScene.get('MSC-CUSTOM-COMPOSANT-RUIN') || 0) >= 1, 'cycle ARCH-04 absent');

  for (const [sceneId, cycles] of cyclesByScene) {
    const scenePath = path.join(root, 'assets', 'MSC_saves', `${sceneId}.json`);
    assert.ok(fs.existsSync(scenePath), `${sceneId}: fichier MSC absent`);
    const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
    const relayBlocks = (scene.objects || []).filter((object) => object.type === 'relay_block').length;
    assert.ok(
      relayBlocks >= cycles,
      `${sceneId}: ${relayBlocks} relay_block physique(s) pour ${cycles} cycle(s) SAME-INSTANCE`
    );
  }
});
