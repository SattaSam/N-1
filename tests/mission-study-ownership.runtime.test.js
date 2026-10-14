const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = process.env.BLUEFOX_ROOT || path.resolve(__dirname, '..');
process.env.BLUEFOX_ROOT = ROOT;

// Même fixture de partie neuve et mêmes propriétaires que les suites E2E du
// dépôt : aucun simulateur de progression ou d'acquittement supplémentaire.
const source = fs.readFileSync(path.join(ROOT, 'tests/mission-eligibility-stock-fauna.runtime.test.js'), 'utf8');
const { H } = new Function('require', '__dirname',
  source.slice(0, source.indexOf('\nfor(const id')) + '\nreturn {H};'
)(require, path.join(ROOT, 'tests'));

async function study(type, scenario, target = 2) {
  const f = await H.live();
  const id = 'TEST-STUDY-OWNER';
  const leaf = (slot, action) => ({ id: `${id}:${slot}`, type: action, target,
    params: { subject: 'flora', distinctBy: 'objectId' } });
  f.BF.registerMissionDefinitions([
    { id, priority: 1000, root: { id: `${id}:root`, type: 'group', children:
      scenario === 'same-mission'
        ? [leaf('first', 'observe'), leaf('selected', type)]
        : [leaf('selected', type)] } },
    { id: 'TEST-STUDY-RIVAL', priority: 1000, root: { id: 'TEST-STUDY-RIVAL:root', type: 'group', children: [
      { id: 'TEST-STUDY-RIVAL:observe', type: 'observe', target: 2, params: { subject: 'flora' } }
    ] } }
  ]);
  f.manager.startMission(id, { primary: false });
  f.manager.startMission('TEST-STUDY-RIVAL', { primary: false });
  f.manager.setPrimaryMission(scenario === 'other-primary' ? 'TEST-STUDY-RIVAL' : id, true, 'player');
  const tree = f.manager.trees.get(id), node = tree.find(`${id}:selected`);
  const object = f.object('adaptive_plant');
  f.engine.currentMap.interactables = [object];
  assert.equal(f.manager.executeSelectedMissionAction({ missionId: id,
    action: { nodeId: node.id, type: node.type, params: node.params, issuedAt: Date.now() },
    primary: scenario !== 'other-primary' }, 10000), true);
  return { f, id, tree, node, object };
}

function finish(f) {
  f.engine.updateInteraction(10000);
  f.engine.updateInteraction(35000);
}

for (const type of ['observe', 'inspect', 'analyze']) {
  for (const scenario of ['same-mission', 'other-primary', 'owner-primary']) {
    test(`${type}: ${scenario} retains the selected node, credits passive fan-out and releases its action`, async () => {
      const { f, id, tree, node, object } = await study(type, scenario);
      assert.equal(object.userData.missionId, id);
      assert.equal(object.userData.missionNodeId, node.id);
      finish(f);
      const event = f.BF.ObjectEvents.history().find(e => e.detail.missionId === id);
      assert(event, 'The physical study must carry its selected owner');
      assert.equal(event.detail.missionNodeId, node.id);
      assert.equal(event.instanceId, object.userData.instanceId);
      assert.equal(node.progress, 1);
      assert.equal(node.isComplete, false, 'One study must not finish a two-definition objective');
      assert.equal(f.manager.currentAction, null, 'The completed action must release even while its objective remains incomplete');
      assert.equal(f.manager.trees.get('TEST-STUDY-RIVAL').find('TEST-STUDY-RIVAL:observe').progress, 1);
      if (scenario === 'same-mission') assert.equal(tree.find(`${id}:first`).progress, 0,
        'A selected study must not credit another available sibling in its own mission');
      // La libération doit permettre la vraie action suivante, pas seulement
      // rendre currentAction nulle : achever l'objectif avec une autre définition.
      const next = f.object('fiber');
      f.engine.currentMap.interactables = [next];
      assert.equal(f.manager.executeSelectedMissionAction({ missionId: id,
        action: { nodeId: node.id, type: node.type, params: node.params, issuedAt: Date.now() },
        primary: scenario !== 'other-primary' }, 40000), true);
      f.engine.updateInteraction(40000);
      f.engine.updateInteraction(65000);
      assert.equal(node.progress, 2);
      assert.equal(node.isComplete, true);
      assert.equal(f.manager.currentAction, null);
      assert.equal(f.manager.trees.get('TEST-STUDY-RIVAL').find('TEST-STUDY-RIVAL:observe').progress, 2);
      if (scenario === 'same-mission') assert.equal(tree.find(`${id}:first`).progress, 0);
    });
  }

  test(`${type}: a physical retry cannot select another study or duplicate its credit`, async () => {
    const { f, id, node, object } = await study(type, 'other-primary');
    const action = f.manager.currentAction;
    f.engine.updateInteraction(10000);
    assert.equal(f.engine.targetInteraction(object, true), true);
    assert.equal(object.userData.missionId, id);
    assert.equal(object.userData.missionNodeId, node.id);
    assert.equal(f.manager.currentAction, action);
    f.engine.updateInteraction(11000);
    f.engine.updateInteraction(36000);
    assert.equal(node.progress, 1);
    assert.equal(f.manager.currentAction, null);
    const events = f.BF.ObjectEvents.history().filter(e => e.detail.missionId === id);
    assert.equal(events.length, 1);
    f.manager.consumeObjectEvent(events[0]);
    assert.equal(node.progress, 1);
  });

  test(`${type}: an ownerless credit cannot redirect a late acknowledgement or reset a completed mission`, async () => {
    const { f, id, node, object } = await study(type, 'owner-primary', 1);
    f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED, object,
      { mapId: 'crystal', subject: 'flora', interactionSource: 'manual' });
    assert.equal(node.progress, 1);
    assert.equal(f.memory.state.missionLifecycle[id].status, 'completed');
    assert(f.manager.currentAction, 'An ownerless event must not acknowledge the physical owner');
    assert.equal(f.engine.targetInteraction(object, true), true);
    assert.equal(object.userData.missionNodeId, node.id);
    finish(f);
    assert.equal(node.progress, 1);
    assert.equal(f.memory.state.missionLifecycle[id].status, 'completed');
    assert.equal(f.manager.currentAction, null);
  });
}

for (const [type, cuoType, subject, result] of [
  ['collect', 'fiber', 'flora', 'RESOURCE_COLLECTED'],
  ['extract', 'magnetic_ore', 'mineral', 'RESOURCE_EXTRACTED']
]) {
  for (const known of [false, true]) {
    test(`${type}: ${known ? 'known' : 'unknown'} instance preserves its acquisition owner and required preliminary study`, async () => {
      const f = await H.live();
      f.BF.registerMissionDefinitions([
        { id: 'TEST-ACQUIRE', root: { id: 'TEST-ACQUIRE:root', type: 'group', children: [
          { id: 'TEST-ACQUIRE:acquire', type, target: 1, params: { cuoType } }
        ] } },
        { id: 'TEST-PRELIMINARY-STUDY', root: { id: 'TEST-PRELIMINARY-STUDY:root', type: 'group', children: [
          { id: 'TEST-PRELIMINARY-STUDY:observe', type: 'observe', target: 1, params: { subject } }
        ] } }
      ]);
      f.manager.startMission('TEST-ACQUIRE', { primary: false });
      f.manager.startMission('TEST-PRELIMINARY-STUDY', { primary: false });
      f.manager.setPrimaryMission('TEST-PRELIMINARY-STUDY', true, 'player');
      const object = f.object(cuoType);
      if (known) object.userData.interactionState = { observed: true, identified: true, observationCount: 1 };
      f.engine.currentMap.interactables = [object];
      const node = f.manager.trees.get('TEST-ACQUIRE').find('TEST-ACQUIRE:acquire');
      assert.equal(f.manager.executeSelectedMissionAction({ missionId: 'TEST-ACQUIRE',
        action: { nodeId: node.id, type, params: node.params }, primary: false }, 10000), true);
      for (let now = 10000; now < 100000; now += 1000) f.engine.updateInteraction(now);
      const events = f.BF.ObjectEvents.history();
      const acquisition = events.filter(e => e.type === f.BF.ObjectEvents.types[result]);
      assert.equal(acquisition.length, 1);
      assert.equal(acquisition[0].instanceId, object.userData.instanceId);
      assert.equal(acquisition[0].detail.missionId, 'TEST-ACQUIRE');
      assert.equal(node.isComplete, true);
      assert.equal(f.manager.currentAction, null);
      const studies = events.filter(e => e.type === f.BF.ObjectEvents.types.PHENOMENON_OBSERVED);
      assert.equal(studies.length, known ? 0 : 1);
      if (!known) {
        assert.equal(studies[0].instanceId, acquisition[0].instanceId);
        assert(events.indexOf(studies[0]) < events.indexOf(acquisition[0]));
      }
      assert.equal(f.manager.trees.get('TEST-PRELIMINARY-STUDY').root.isComplete, !known);
    });
  }
}
