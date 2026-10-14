const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = process.env.BLUEFOX_ROOT || path.resolve(__dirname, '..');
process.env.BLUEFOX_ROOT = ROOT;
const source = fs.readFileSync(path.join(ROOT, 'tests/mission-eligibility-stock-fauna.runtime.test.js'), 'utf8');
const { H } = new Function('require', '__dirname',
  source.slice(0, source.indexOf('\nfor(const id')) + '\nreturn {H};')(require, path.join(ROOT, 'tests'));
const repair = fs.readFileSync(path.join(ROOT, 'tests/mission-repair.runtime.test.js'), 'utf8');
const seedLine = "const seed = process.env.BLUEFOX_SAVE ? JSON.parse(fs.readFileSync(process.env.BLUEFOX_SAVE, 'utf8')).state : {};";
const reloader = new Function('require', '__dirname', 'seedState',
  repair.slice(0, repair.indexOf("\ntest('")).replace(seedLine, 'const seed = seedState;') + '\nreturn fixture();');
async function reload(f) {
  f.memory.flush(true);
  const seedState = Object.fromEntries(f.store);
  const chain = fs.readFileSync(path.join(ROOT, 'tests/mission-chain-integrity.runtime.test.js'), 'utf8');
  const runtime = new Function('fixture',
    chain.slice(chain.indexOf('async function runtimeFixture()'), chain.indexOf("\ntest('")) +
    '\nreturn runtimeFixture;')(() => reloader(require, path.join(ROOT, 'tests'), seedState));
  const physical = fs.readFileSync(path.join(ROOT, 'tests/mission-physical-contracts.runtime.test.js'), 'utf8');
  const restored = new Function('coreFixture',
    physical.slice(physical.indexOf('async function fixture()'), physical.indexOf('function physicalObject')) +
    '\nreturn fixture;')(runtime);
  const r = await restored(); r.runtime.connect(); return r;
}

function capacity(f) {
  f.BF.getInventoryCapacityState = () => ({ capacity: 100, returnThreshold: 90,
    count: Object.values(f.BF.getProgressionState().inventory).reduce((a, b) => a + b, 0) });
}
function afterCommit(f, legacyMethod) {
  // Même coupure après le transfert durable dans les deux banques : la BASE
  // utilise l'ancien crédit/débit, le CANDIDAT le reçu du propriétaire central.
  const owner = f.BF.progression?.commitInventoryTransaction ? f.BF.progression : f.BF;
  const method = owner === f.BF ? legacyMethod : 'commitInventoryTransaction';
  const original = owner[method].bind(owner);
  owner[method] = (...args) => { const result = original(...args); assert(result); throw Error('cut after durable transfer'); };
}
const total = bucket => Object.values(bucket).reduce((a, b) => a + b, 0);

for (const cut of ['none', 'after-transfer', 'before-progress', 'after-progress']) {
  test(`persistent reserve: ${cut} retains exactly 700 units and reaches 700/700 after reload`, async () => {
    const f = await H.live(), m = H.catalog.find(m => m.id === 'GAME-civilization_5');
    const c = m.proximityContexts.find(c => c.reserve), t = H.start(f, m.id);
    H.stage(f, m, t, c.slot); f.memory.saveTree(t); capacity(f);
    if (cut === 'after-transfer') afterCommit(f, 'grantInventory');
    if (cut === 'before-progress' || cut === 'after-progress') {
      const progress = f.runtime.progressRuntimeValidationSlot.bind(f.runtime);
      f.runtime.progressRuntimeValidationSlot = (...args) => {
        if (cut === 'after-progress') progress(...args);
        f.memory.flush(true); throw Error('cut around progress');
      };
    }
    if (cut === 'none') assert.equal(f.runtime.withdrawPersistentReserve(m, c), true);
    else assert.throws(() => f.runtime.withdrawPersistentReserve(m, c), /cut/);
    const r = await reload(f); capacity(r);
    const restored = r.BF.BibleCatalog.find(x => x.id === m.id), context = restored.proximityContexts.find(c => c.reserve);
    for (let i = 0; i < 10; i++) {
      for (const [key, amount] of Object.entries(r.BF.getProgressionState().inventory)) r.BF.depositInventory(key, amount);
      if (!r.runtime.withdrawPersistentReserve(restored, context)) break;
    }
    const stock = r.BF.getProgressionState();
    assert.equal(total(stock.inventory) + total(stock.campStorage), 700);
    assert.equal(r.manager.trees.get(m.id).find(`${m.id}:reserve`).progress, 700);
    assert.equal(r.memory.getFact(c.fact).exhausted, true);
    assert.equal(r.runtime.withdrawPersistentReserve(restored, context), false);
  });
}
for (const civ of ['rocky', 'translucent']) for (const cut of ['none', 'after-transfer', 'before-receipt']) {
  test(`${civ} service: ${cut} pays one reward and counts one completion`, async () => {
    const f = await H.live(), id = `NPC-SERVICE-OBSERVE@${civ}`;
    f.memory.state.missionLifecycle[id] = { status: 'completed', completedAt: 12345 };
    if (cut === 'after-transfer') afterCommit(f, 'grantInventory');
    if (cut === 'before-receipt') f.memory.recordEffectReceipt = () => { throw Error('cut before receipt'); };
    if (cut === 'none') f.manager.catalogController.reconcileServiceRewards();
    else assert.throws(() => f.manager.catalogController.reconcileServiceRewards(), /cut/);
    const r = await reload(f), ctl = r.manager.catalogController;
    ctl.reconcileServiceRewards(); ctl.reconcileServiceRewards();
    const key = civ === 'rocky' ? 'resonant_basalt' : 'stellar_iridium', quantity = civ === 'rocky' ? 2 : 1;
    assert.equal(r.BF.getProgressionState().inventory[key], quantity);
    assert.equal(ctl.getRelation(civ).completedMissions, 1);
    r.memory.state.missionLifecycle[id] = { status: 'completed', completedAt: 23456 };
    ctl.reconcileServiceRewards();
    assert.equal(r.BF.getProgressionState().inventory[key], quantity * 2);
    assert.equal(ctl.getRelation(civ).completedMissions, 2);
  });
}
for (const cut of ['none', 'after-transfer']) {
  test(`trade: ${cut} atomically transfers payment, goods and merchant stock`, async () => {
    const f = await H.live(), ctl = f.manager.catalogController;
    ctl.setRelation('rocky', 'friendly'); f.BF.grantInventory('fiber', 16);
    const before = ctl.tradeStock('rocky').energy_crystal;
    if (cut === 'after-transfer') afterCommit(f, 'consumeInventory');
    if (cut === 'none') assert.equal(ctl.tradeResource('rocky', 'fiber', 8, 'energy_crystal', 1).ok, true);
    else assert.throws(() => ctl.tradeResource('rocky', 'fiber', 8, 'energy_crystal', 1), /cut/);
    const r = await reload(f), controller = r.manager.catalogController;
    controller.reconcileServiceRewards(); controller.reconcileServiceRewards();
    assert.equal(r.BF.getProgressionState().inventory.fiber, 8);
    assert.equal(r.BF.getProgressionState().inventory.energy_crystal, 1);
    assert.equal(controller.tradeStock('rocky').energy_crystal, before - 1);
    assert.equal(controller.tradeResource('rocky', 'fiber', 8, 'energy_crystal', 1).ok, true);
    assert.equal(r.BF.getProgressionState().inventory.energy_crystal, 2);
    assert.equal(controller.tradeStock('rocky').energy_crystal, before - 2);
  });
}
for (const civ of ['rocky', 'translucent']) for (const cut of ['none', 'after-transfer', 'before-unlock']) {
  test(`${civ} blueprint: ${cut} preserves the paid unlock after reload`, async () => {
    const f = await H.live(), ctl = f.manager.catalogController; ctl.setRelation(civ, 'honored');
    const b = ctl.blueprint(civ); f.BF.grantInventory(b.purchase.inventoryKey, b.purchase.quantity);
    if (civ === 'translucent') f.memory.setFact('civilization:trade:prismatic-orchid-balance', 25);
    if (cut === 'after-transfer') afterCommit(f, 'consumeInventory');
    if (cut === 'before-unlock') f.runtime.unlockResearchRewards = () => { throw Error('cut before unlock'); };
    if (cut === 'none') assert.equal(ctl.purchaseBlueprint(civ).ok, true);
    else assert.throws(() => ctl.purchaseBlueprint(civ), /cut/);
    const r = await reload(f); r.manager.catalogController.reconcileServiceRewards();
    assert.equal(r.BF.Research.isUnlocked(b.id), true);
    assert.equal(r.BF.getProgressionState().consumed[b.purchase.inventoryKey], b.purchase.quantity);
    assert.equal(r.manager.catalogController.purchaseBlueprint(civ).reason, 'owned');
  });
}
for (const method of ['single', 'pool', 'pool-once']) {
  test(`${method} payment keeps actual orchid provenance and refuses unqualified purchase`, async () => {
    const f = await H.live(), ctl = f.manager.catalogController;
    f.BF.grantInventory('biocapital', 25); f.memory.setFact('civilization:trade:prismatic-orchid-balance', 25);
    if (method === 'single') f.BF.consumeInventory('biocapital', 20);
    if (method === 'pool') f.BF.consumeInventoryPool(['biocapital'], 20);
    if (method === 'pool-once') {
      f.BF.consumeInventoryPoolOnce('orchid-test', ['biocapital'], 20);
      f.BF.consumeInventoryPoolOnce('orchid-test', ['biocapital'], 20);
    }
    assert.equal(ctl.orchidBalance(), 5);
    f.BF.grantInventory('biocapital', 20); ctl.setRelation('translucent', 'honored');
    assert.equal(ctl.purchaseBlueprint('translucent').reason, 'orchid');
  });
}
test('native transfer refuses insufficient bag payment even with remote camp stock', async () => {
  const f = await H.live(), ctl = f.manager.catalogController;
  ctl.setRelation('rocky', 'friendly'); f.BF.grantCampStorage('fiber', 8);
  assert.equal(ctl.tradeResource('rocky', 'fiber', 8, 'energy_crystal', 1).reason, 'inventory');
  assert.equal(f.BF.getProgressionState().campStorage.fiber, 8);
});
test('central transfer receipt rejects a conflicting replay and a failed durable write', async () => {
  const f = await H.live(), registry = f.BF.progression;
  assert.equal(typeof registry.commitInventoryTransaction, 'function');
  f.BF.grantInventory('fiber', 8);
  const spec = { debits: { fiber: 8 }, credits: { energy_crystal: 1 } };
  assert(registry.commitInventoryTransaction('one-transfer', spec));
  assert(registry.commitInventoryTransaction('one-transfer', spec));
  assert.equal(registry.commitInventoryTransaction('one-transfer', { ...spec, credits: { energy_crystal: 2 } }), null);
  assert.equal(f.BF.getProgressionState().inventory.energy_crystal, 1);
  assert.equal(registry.commitInventoryTransaction('invalid-transfer', { debits: { energy_crystal: -1 }, credits: { fiber: 8 } }), null);
  const snapshot = JSON.stringify(registry.state); registry.save = () => false;
  assert.equal(registry.commitInventoryTransaction('failed-transfer', { credits: { fiber: 3 } }), null);
  assert.equal(JSON.stringify(registry.state), snapshot);
});

test('failed mission-memory acknowledgement leaves a reserve transfer resumable without a second pickup', async () => {
  const f = await H.live(), m = H.catalog.find(m => m.id === 'GAME-civilization_5');
  const c = m.proximityContexts.find(c => c.reserve), t = H.start(f, m.id);
  H.stage(f, m, t, c.slot); f.memory.saveTree(t); f.memory.flush(true); capacity(f);
  f.memory.flush = () => false;
  assert.equal(f.runtime.withdrawPersistentReserve(m, c), true);
  assert.equal(f.runtime.withdrawPersistentReserve(m, c), false);
  assert.equal(total(f.BF.getProgressionState().inventory), 100);
  const r = await reload(f); capacity(r); r.runtime.reviewProximityContexts();
  assert.equal(r.manager.trees.get(m.id).find(`${m.id}:reserve`).progress, 100);
  assert.equal(r.runtime.reserveRemainingTotal(r.memory.getFact(c.fact)), 600);
  assert.equal(total(r.BF.getProgressionState().inventory), 100);
});
test('failed service acknowledgement survives reload without duplicate reward or completion', async () => {
  const f = await H.live(), id = 'NPC-SERVICE-OBSERVE@rocky';
  f.memory.state.missionLifecycle[id] = { status: 'completed', completedAt: 12345 }; f.memory.flush(true);
  f.memory.flush = () => false;
  f.manager.catalogController.reconcileServiceRewards(); f.manager.catalogController.reconcileServiceRewards();
  assert.equal(f.BF.getProgressionState().inventory.resonant_basalt, 2);
  const r = await reload(f); r.manager.catalogController.reconcileServiceRewards();
  assert.equal(r.BF.getProgressionState().inventory.resonant_basalt, 2);
  assert.equal(r.manager.catalogController.getRelation('rocky').completedMissions, 1);
});
test('mixed pool provenance uses the actual biocapital debit, never the requested total', async () => {
  const f = await H.live(); f.BF.grantInventory('fiber', 20); f.BF.grantInventory('biocapital', 25);
  f.memory.setFact('civilization:trade:prismatic-orchid-balance', 25);
  assert.equal(f.BF.consumeInventoryPoolOnce('mixed-pool', ['fiber', 'biocapital'], 25), 25);
  assert.equal(f.manager.catalogController.orchidBalance(), 20);
});

for (const cut of ['before-event', 'after-event']) {
  test(`DIP-03 trade proof: ${cut} completes the eligible contribution exactly once after reload`, async () => {
    const f = await H.live(), m = H.catalog.find(m => m.id === 'DIP-03'), t = H.start(f, m.id);
    H.stage(f, m, t, 'rockyContribution'); f.memory.saveTree(t);
    const ctl = f.manager.catalogController; ctl.setRelation('rocky', 'friendly'); f.BF.grantInventory('fiber', 8);
    const dispatch = f.window.dispatchEvent;
    f.window.dispatchEvent = event => {
      if (event.type !== 'bluefox:civilization-trade-completed') return dispatch(event);
      if (cut === 'after-event') dispatch(event);
      f.memory.flush(true); throw Error('cut around trade proof');
    };
    assert.throws(() => ctl.tradeResource('rocky', 'fiber', 8, 'energy_crystal', 1), /cut/);
    const r = await reload(f);
    r.manager.catalogController.reconcileServiceRewards();
    assert.equal(r.manager.trees.get(m.id).find('DIP-03:rockyContribution').progress, 1);
    assert.equal(r.manager.trees.get(m.id).find('DIP-03:translucentContribution').progress, 0);
    assert.equal(r.BF.getProgressionState().inventory.energy_crystal, 1);
    assert.equal(r.manager.catalogController.tradeStock('rocky').energy_crystal, 4);
  });
}
test('one trade keeps passive fan-out to all eligible missions but cannot credit a future sibling', async () => {
  const f = await H.live();
  for (const id of ['TEST-TRADE-A', 'TEST-TRADE-B']) {
    f.BF.registerMissionDefinitions([{ id, root: { id: `${id}:root`, type: 'group', children: [
      { id: `${id}:first`, type: 'observe', target: 1, params: { catalogManaged: true } },
      { id: `${id}:later`, type: 'observe', target: 1, params: { catalogManaged: true }, requires: [`${id}:first`] }
    ] } }]);
    f.runtime.dynamicMissions.set(id, { id, civilizationTradeRequirements: [
      { slot: 'first', civilizationId: 'rocky', minimumOfferQuantity: 5 },
      { slot: 'later', civilizationId: 'rocky', minimumOfferQuantity: 5 }
    ] });
    f.manager.startMission(id, { primary: false });
  }
  f.manager.catalogController.setRelation('rocky', 'friendly'); f.BF.grantInventory('fiber', 8);
  assert.equal(f.manager.catalogController.tradeResource('rocky', 'fiber', 8, 'energy_crystal', 1).ok, true);
  for (const id of ['TEST-TRADE-A', 'TEST-TRADE-B']) {
    assert.equal(f.manager.trees.get(id).find(`${id}:first`).progress, 1);
    assert.equal(f.manager.trees.get(id).find(`${id}:later`).progress, 0);
  }
});
test('a durable pooled debit is reconciled when interruption preceded its provenance notification', async () => {
  const f = await H.live(); f.BF.grantInventory('biocapital', 25);
  f.memory.setFact('civilization:trade:prismatic-orchid-balance', 25); f.memory.flush(true);
  const publish = f.BF.progression.publishChange.bind(f.BF.progression);
  f.BF.progression.publishChange = (reason, detail) => {
    if (reason === 'inventory-pool-consumed') throw Error('cut before provenance');
    return publish(reason, detail);
  };
  assert.throws(() => f.BF.consumeInventoryPoolOnce('interrupted-orchid-debit', ['biocapital'], 20), /cut/);
  const r = await reload(f); r.manager.catalogController.reconcileServiceRewards();
  assert.equal(r.manager.catalogController.orchidBalance(), 5);
  r.BF.consumeInventoryPoolOnce('interrupted-orchid-debit', ['biocapital'], 20);
  assert.equal(r.manager.catalogController.orchidBalance(), 5);
});
