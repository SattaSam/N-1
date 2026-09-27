const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const CORE = path.join(ROOT, 'engine', 'behavior-arbitration-core.js');
const SURVIVAL = path.join(ROOT, 'engine', 'survival-ai-bridge.js');

function makeRuntime({ unlocked = true, rations = 5, initial = { rest: 55, food: 70, safety: 90 } } = {}) {
  const listeners = new Map();
  const store = new Map();
  store.set('bluefox_survival_v1', JSON.stringify({
    version: 2,
    rest: initial.rest,
    food: initial.food,
    safety: initial.safety,
    energy: 0,
    manualPressure: 0,
    lastManualAt: 0,
    updatedAt: Date.now()
  }));
  let rationCount = rations;
  const math = Object.create(Math);
  math.random = () => 0.5;

  class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  }

  const window = {
    Math: math,
    JSON, Date, Number, String, Boolean, Object, Array, Set, Map, RegExp,
    CustomEvent,
    localStorage: {
      getItem(k) { return store.has(k) ? store.get(k) : null; },
      setItem(k, v) { store.set(k, String(v)); },
      removeItem(k) { store.delete(k); }
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatchEvent(event) {
      for (const fn of listeners.get(event.type) || []) fn(event);
      return true;
    },
    setInterval() { return 1; },
    clearInterval() {},
    setTimeout(fn) { fn?.(); return 1; },
    clearTimeout() {},
    document: {
      querySelector() { return null; },
      documentElement: {}
    },
    MutationObserver: class { observe() {} },
    BlueFox3D: {
      BAC: undefined,
      Rations: {
        snapshot: () => ({ rations: rationCount }),
        consume(count = 1, options = {}) {
          if (options.automatic === true && !unlocked) return 0;
          const removed = Math.min(rationCount, count);
          rationCount -= removed;
          if (removed > 0) {
            window.dispatchEvent(new CustomEvent('bluefox:ration-consumed', {
              detail: { quantity: removed, total: rationCount, automatic: options.automatic === true }
            }));
          }
          return removed;
        }
      },
      isTutorialSurvivalCapabilityUnlocked: () => unlocked,
      getWeatherState: () => ({ temperature: 17, condition: 'Tempéré', thermalStress: 0 }),
      canAccessCampInventory: () => true,
      ObjectEvents: { subscribe() {} },
      getMultiProgressionState: () => ({ psychology: null })
    }
  };
  window.window = window;
  window.globalThis = window;
  const context = vm.createContext(window);
  vm.runInContext(fs.readFileSync(CORE, 'utf8'), context, { filename: 'behavior-arbitration-core.js' });
  vm.runInContext(fs.readFileSync(SURVIVAL, 'utf8'), context, { filename: 'survival-ai-bridge.js' });
  return { BF: window.BlueFox3D, window, getRations: () => rationCount, math };
}

test('ration restores Food and a smaller Rest amount than micro-rest/long rest', () => {
  const { BF } = makeRuntime({ unlocked: true, initial: { rest: 50, food: 40, safety: 90 } });
  const before = BF.getSurvivalState();
  BF.survival.completeRoutine('food', { automatic: true });
  const afterFood = BF.getSurvivalState();
  assert.equal(afterFood.food - before.food, 45);
  assert.equal(afterFood.rest - before.rest, 6);

  BF.survival.state.rest = 50;
  BF.survival.completeRoutine('micro-rest', { restGain: 9 });
  assert.equal(BF.getSurvivalState().rest, 59);

  BF.survival.state.rest = 50;
  BF.survival.completeRoutine('rest', { restGain: 18 });
  assert.equal(BF.getSurvivalState().rest, 68);
});

test('non-critical recovery prefers ration probabilistically over long rest when ration exists', () => {
  const { BF, math } = makeRuntime({ unlocked: true, initial: { rest: 54, food: 70, safety: 90 } });
  const survival = BF.getSurvivalState();
  assert.equal(survival.needs.rest, true);
  assert.equal(survival.needs.food, false);

  math.random = () => 0.8;
  const decision = BF.BAC.evaluateSurvivalDecision({ survival });
  assert.equal(decision.id, 'survival-food');
  assert.equal(decision.routine, 'food');
  assert.ok(decision.duration >= 2400 && decision.duration <= 4600, 'food duration must stay in micro-rest range');
});

test('successful ration schedules exactly one micro-rest follow-up after tutorial unlock', () => {
  const { BF } = makeRuntime({ unlocked: true, initial: { rest: 54, food: 50, safety: 90 } });
  BF.survival.completeRoutine('food', { automatic: true });
  const afterFood = BF.getSurvivalState();
  const followup = BF.BAC.evaluateSurvivalDecision({ survival: afterFood });
  assert.equal(followup.id, 'ration-micro-rest');
  assert.equal(followup.routine, 'micro-rest');
  assert.equal(followup.detail.afterRation, true);
  assert.ok(followup.detail.restGain > 6);
  const foodMaxDuration = 2400 + 2200;
  assert.ok(foodMaxDuration + followup.duration < 8200, 'ration + micro-rest must stay faster than long rest');
  const next = BF.BAC.evaluateSurvivalDecision({ survival: afterFood });
  assert.notEqual(next?.id, 'ration-micro-rest');
});


test('manual ration after unlock does not schedule autonomous micro-rest follow-up', () => {
  const { BF } = makeRuntime({ unlocked: true, initial: { rest: 54, food: 50, safety: 90 } });
  BF.survival.completeRoutine('food', { automatic: false });
  const next = BF.BAC.evaluateSurvivalDecision({
    survival: BF.getSurvivalState(),
    autonomyActionStreak: 0,
    autonomyBreakTarget: 3
  });
  assert.notEqual(next?.id, 'ration-micro-rest');
});

test('T12-style locked capability does not schedule automatic micro-rest after manual ration', () => {
  const { BF } = makeRuntime({ unlocked: false, initial: { rest: 54, food: 50, safety: 90 } });
  BF.survival.completeRoutine('food', { automatic: false });
  const afterFood = BF.getSurvivalState();
  const decision = BF.BAC.evaluateSurvivalDecision({ survival: afterFood });
  assert.notEqual(decision?.id, 'ration-micro-rest');
});

test('critical state keeps critical-rest priority and clears ration follow-up', () => {
  const { BF } = makeRuntime({ unlocked: true, initial: { rest: 20, food: 40, safety: 90 } });
  BF.survival.completeRoutine('food', { automatic: true });
  BF.survival.state.rest = 20;
  const critical = BF.getSurvivalState();
  assert.equal(critical.needs.criticalRest, true);
  const decision = BF.BAC.evaluateSurvivalDecision({ survival: critical });
  assert.equal(decision.id, 'critical-rest');
  const after = BF.BAC.evaluateSurvivalDecision({ survival: critical });
  assert.equal(after.id, 'critical-rest');
});

test('repeated activity lowers energy and spends multiple rations over time', () => {
  const { BF, getRations } = makeRuntime({
    unlocked: true,
    rations: 8,
    initial: { rest: 82, food: 82, safety: 90 }
  });
  const initialEnergy = BF.getSurvivalState().energy;
  let consumed = 0;
  let lowestEnergy = initialEnergy;

  for (let i = 0; i < 80; i += 1) {
    BF.survival.recordAction('collect', 'autonomy');
    let survival = BF.getSurvivalState();
    lowestEnergy = Math.min(lowestEnergy, survival.energy);
    if (!survival.needs.rest && !survival.needs.food) continue;

    const beforeRations = getRations();
    const recovery = BF.BAC.evaluateSurvivalDecision({ survival });
    assert.ok(recovery, 'a recovery decision is expected when survival needs recovery');
    BF.survival.completeRoutine(recovery.routine, recovery.detail || {});
    consumed += Math.max(0, beforeRations - getRations());

    survival = BF.getSurvivalState();
    const followup = BF.BAC.evaluateSurvivalDecision({ survival });
    if (followup?.id === 'ration-micro-rest') {
      BF.survival.completeRoutine(followup.routine, followup.detail || {});
    }
  }

  assert.ok(lowestEnergy < initialEnergy - 10, 'energy must materially fall during sustained activity');
  assert.ok(consumed >= 2, 'sustained activity should create recurring ration expenditure');
});

test('no ration keeps long rest as recovery fallback', () => {
  const { BF } = makeRuntime({ unlocked: true, rations: 0, initial: { rest: 54, food: 70, safety: 90 } });
  const survival = BF.getSurvivalState();
  const decision = BF.BAC.evaluateSurvivalDecision({ survival });
  assert.equal(decision.id, 'survival-rest');
  assert.equal(decision.routine, 'rest');
  const before = survival;
  BF.survival.completeRoutine(decision.routine, decision.detail);
  const after = BF.getSurvivalState();
  assert.ok(after.rest > before.rest);
  assert.ok(after.food > before.food, 'long rest must still restore food as well as rest');
  assert.ok(after.energy > before.energy);
});
