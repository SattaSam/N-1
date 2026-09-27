const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function contextFor(corePath, traits) {
  const storage = new Map();
  const listeners = new Map();
  class Planner {
    score() { return 100; }
  }
  class Manager {
    constructor() {
      this.primaryMissionId = 'CURRENT';
      this.activeMissionIds = ['CURRENT', 'NEW'];
      this.bridge = { context: () => ({ needs: {} }) };
    }
    definition(id) {
      if (id === 'NEW') return { narrativeAxis: 'unknown-axis', obsessionEligible: true, obsessionIntensity: 3, domain: 'research' };
      return { narrativeAxis: 'known-axis', obsessionEligible: true, obsessionIntensity: 3, domain: 'research' };
    }
    assessMission(id) { return { missionId:id, score:100, action:{ type:'research' }, reasons:[] }; }
    selectBestPrimary() { return false; }
    ensureLifecycle() { return { status:'active', autoPrimaryEligible:true }; }
    suggestPrimaryMission() { return true; }
  }
  function EventTarget() {}
  const sandbox = {
    console,
    Date,
    Math,
    JSON,
    performance: { now: () => 1 },
    setInterval: () => 1,
    clearInterval: () => {},
    CustomEvent: class CustomEvent { constructor(type, init={}) { this.type=type; this.detail=init.detail; } },
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    dispatchEvent(event) { for (const fn of listeners.get(event.type) || []) fn(event); },
    localStorage: {
      getItem(k) { return storage.has(k) ? storage.get(k) : null; },
      setItem(k,v) { storage.set(k, String(v)); },
      removeItem(k) { storage.delete(k); }
    },
    BlueFox3D: {
      getPlayerTraitProfile: () => ({...traits}),
      getPsychologicalMemoryScore: () => 80,
      getMissionObsessionPressure: () => 10,
      getNarrativeAxisScore: (axis) => axis === 'unknown-axis' ? 0 : 4,
      getMultiProgressionState: () => ({ psychology:{} }),
      getSurvivalState: () => ({ energy:80, needs:{} }),
      isTutorialSurvivalCapabilityUnlocked: (id) => id === 'micro-rest',
      Missions: {
        MissionPlanner: Planner,
        MissionManager: Manager,
        ActionType: { COLLECT:'collect', EXTRACT:'extract', INSPECT:'inspect', ANALYZE:'analyze', OBSERVE:'observe', RESEARCH:'research', CRAFT:'craft', BUILD:'build', EXPLORE_ZONE:'explore-zone', TRAVEL:'travel', REST:'rest', EAT:'eat' },
        normalizeActionType: (x) => x,
        definitions: {}
      }
    },
    EventTarget,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(corePath, 'utf8'), sandbox, {filename:corePath});
  return sandbox;
}

const CORE = path.join(ROOT, 'engine/behavior-arbitration-core.js');

test('Empathique/Indifférent module uniquement le poids psychologique existant', () => {
  const empath = contextFor(CORE, { empathique:100, indifferent:0, courageux:50,craintif:50,respectueux:50,opportuniste:50,destructeur:50,curieux:50,prudent:50 });
  const indifferent = contextFor(CORE, { empathique:0, indifferent:100, courageux:50,craintif:50,respectueux:50,opportuniste:50,destructeur:50,curieux:50,prudent:50 });
  const E = new empath.BlueFox3D.Missions.MissionManager().assessMission('CURRENT', {});
  const I = new indifferent.BlueFox3D.Missions.MissionManager().assessMission('CURRENT', {});
  assert.ok(E.bac.psychology.parts.traitFactor > 1);
  assert.ok(I.bac.psychology.parts.traitFactor < 1);
  assert.ok(E.bac.psychology.modifier > I.bac.psychology.modifier);
});

test('Courageux favorise un nouvel axe et Craintif la continuité sans remplacer les priorités BAC', () => {
  const brave = contextFor(CORE, { courageux:100,craintif:0,empathique:50,indifferent:50,respectueux:50,opportuniste:50,destructeur:50,curieux:50,prudent:50 });
  const fearful = contextFor(CORE, { courageux:0,craintif:100,empathique:50,indifferent:50,respectueux:50,opportuniste:50,destructeur:50,curieux:50,prudent:50 });
  const B = new brave.BlueFox3D.Missions.MissionManager().assessMission('NEW', {});
  const F = new fearful.BlueFox3D.Missions.MissionManager().assessMission('CURRENT', {});
  assert.equal(B.bac.temperament.reason, 'courageux:nouvel-axe');
  assert.ok(B.bac.temperament.modifier > 0);
  assert.equal(F.bac.temperament.reason, 'craintif:continuite');
  assert.ok(F.bac.temperament.modifier > 0);
});

test('Confiance réagit immédiatement au tempérament puis réévalue le résultat sans bloquer la directive', () => {
  const aligned = contextFor(CORE, { opportuniste:100,destructeur:100,respectueux:0,curieux:50,prudent:50,courageux:50,craintif:50,empathique:50,indifferent:50 });
  aligned.BlueFox3D.BAC.recordPlayerSuggestion('collection', { opportunity:true, source:'test' });
  const a0 = aligned.BlueFox3D.BAC.getDiagnostics().relation.trustGeneral;
  assert.ok(a0 > 0);

  const opposed = contextFor(CORE, { opportuniste:0,destructeur:0,respectueux:100,curieux:50,prudent:50,courageux:50,craintif:50,empathique:50,indifferent:50 });
  opposed.BlueFox3D.BAC.recordPlayerSuggestion('collection', { opportunity:true, source:'test' });
  const before = opposed.BlueFox3D.BAC.getDiagnostics().relation.trustGeneral;
  assert.ok(before < 0);
  const evaluation = opposed.BlueFox3D.BAC.evaluatePlayerSuggestion({success:true,useful:true});
  const after = opposed.BlueFox3D.BAC.getDiagnostics().relation.trustGeneral;
  assert.ok(evaluation.delta > 0, 'un ordre opposé mais utile doit regagner de la confiance');
  assert.ok(after > before, 'la jauge doit remonter après résultat utile');
});

test('Prudent peut déclencher une micro-récupération préventive modeste, sans toucher au repos critique', () => {
  const prudent = contextFor(CORE, { prudent:100,curieux:0,courageux:50,craintif:50,empathique:50,indifferent:50,respectueux:50,opportuniste:50,destructeur:50 });
  const curious = contextFor(CORE, { prudent:0,curieux:100,courageux:50,craintif:50,empathique:50,indifferent:50,respectueux:50,opportuniste:50,destructeur:50 });
  const p = prudent.BlueFox3D.BAC.evaluateSurvivalDecision({survival:{energy:65,needs:{},fatigue:{level:'normal',movement:1,actionDuration:1}}});
  const c = curious.BlueFox3D.BAC.evaluateSurvivalDecision({survival:{energy:65,needs:{},fatigue:{level:'normal',movement:1,actionDuration:1}}});
  assert.equal(p?.id, 'prudent-micro-rest');
  assert.notEqual(c?.id, 'prudent-micro-rest');
});

test('Une primaire réellement runnable annule la fenêtre locale avant toute autonomie BAC', () => {
  const integrationPath = path.join(ROOT, 'engine/behavior-arbitration-integration.js');
  let originalAutonomyCalls = 0;
  let targetInteractionCalls = 0;
  const listeners = new Map();
  const manager = {
    hasPrimaryMissionAuthority: () => true,
    currentAction: null,
    activeMissionIds: [],
    pendingExperimentationIntent: () => null,
    getPrioritizedMissionIds: () => [],
    memory: { state: {}, save() {} }
  };
  const position = { distanceTo: () => 0 };
  const engine = {
    missionManager: manager,
    updateAutonomy() { originalAutonomyCalls += 1; },
    targetInteraction() { targetInteractionCalls += 1; return true; },
    ensureActivity() {},
    character: {
      root: { position },
      target: position,
      speed: 0,
      stop() {},
      setTarget() { return true; }
    },
    callbacks: { onSpeak() {}, onStatus() {} },
    currentMap: { interactables: [], gates: [] },
    currentMapId: 'map-A',
    discoveredMaps: new Set(['map-A']),
    lastAutonomyAt: 0,
    postActionRecoveryUntil: 0,
    autonomyActionStreak: 0,
    autonomyBreakTarget: 2,
    speechVisible: false,
    transitioning: false,
    pendingInteraction: null,
    pendingGate: null,
    pendingZoneExploration: null,
    currentRoutine: null,
    persistentNavigationIntent: null,
    autonomyAllowed: () => true,
    canInteractWith: () => true,
    noteLocalAutonomousDecision() {},
    __traitLocalActionWindow: {
      kind: 'player-opposition',
      reason: 'trait:craintif',
      targetMissionId: 'NEW',
      remaining: 3,
      startedAt: Date.now(),
      expiresAt: Date.now() + 35000
    }
  };
  manager.engine = engine;
  const sandbox = {
    console,
    Date,
    Math,
    JSON,
    performance: { now: () => 10000 },
    setInterval: () => 1,
    clearInterval() {},
    setTimeout(fn) { return 1; },
    clearTimeout() {},
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    dispatchEvent() {},
    BlueFox3D: {
      currentEngine: engine,
      Missions: {},
      BAC: {
        evaluateSurvivalDecision: () => null,
        weightedPick: (options) => options.find((option) => option?.available !== false && Number(option?.baseWeight || option?.weight) > 0) || null,
        getDiagnostics: () => ({ relation: { trustGeneral: 0, trustByAxis: {} } }),
        traitBalance: () => 0
      },
      getSurvivalState: () => ({ energy: 80, needs: {}, fatigue: { level:'normal', movement:1, actionDuration:1 } }),
      getConstructionCollectionCandidate: () => null,
      getBACDiagnostics: () => ({}),
      ObjectEvents: { history: () => [], types: {}, subscribe() {} }
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(integrationPath, 'utf8'), sandbox, { filename: integrationPath });

  engine.updateAutonomy(10000);

  assert.equal(engine.__traitLocalActionWindow, null, 'l’autorité primaire doit fermer immédiatement la résistance locale');
  assert.equal(engine.__lastTraitLocalActionWindow?.endReason, 'primary-mission-authority');
  assert.equal(targetInteractionCalls, 0, 'aucune interaction locale BAC ne doit passer devant la primaire runnable');
  assert.equal(originalAutonomyCalls, 0, 'le garde-fou MissionManager doit rendre la main sans relancer l’autonomie ordinaire');
});

test('La fenêtre locale expire réellement à 35 s sur la même horloge monotone, même sans action consommée', () => {
  const integrationPath = path.join(ROOT, 'engine/behavior-arbitration-integration.js');
  let runtimeNow = 0;
  let originalAutonomyCalls = 0;
  const listeners = new Map();
  const manager = {
    hasPrimaryMissionAuthority: () => false,
    currentAction: null,
    activeMissionIds: [],
    pendingExperimentationIntent: () => null,
    getPrioritizedMissionIds: () => [],
    memory: { state: {}, save() {} }
  };
  const position = { distanceTo: () => 0 };
  const localResource = {
    position,
    userData: {
      active: true,
      kind: 'wood',
      functional: {
        id: 'wood',
        gameplay: { collectable: true },
        interaction: { actions: ['collect'] },
        resource: { inventoryKey: 'wood' }
      }
    }
  };
  const engine = {
    missionManager: manager,
    updateAutonomy() { originalAutonomyCalls += 1; },
    targetInteraction() { return false; },
    ensureActivity() {},
    character: {
      root: { position },
      target: position,
      speed: 0,
      stop() {},
      setTarget() { return true; }
    },
    callbacks: { onSpeak() {}, onStatus() {} },
    currentMap: { interactables: [localResource], gates: [] },
    currentMapId: 'map-A',
    discoveredMaps: new Set(['map-A']),
    lastAutonomyAt: 0,
    postActionRecoveryUntil: 0,
    autonomyActionStreak: 0,
    autonomyBreakTarget: 2,
    speechVisible: false,
    transitioning: false,
    pendingInteraction: null,
    pendingGate: null,
    pendingZoneExploration: null,
    currentRoutine: null,
    persistentNavigationIntent: null,
    autonomyAllowed: () => true,
    canInteractWith: () => true,
    interactionProfile: () => ({ action: 'collect' }),
    noteLocalAutonomousDecision() {},
    __traitLocalActionWindow: {
      kind: 'player-opposition',
      reason: 'trait:craintif',
      targetMissionId: 'NEW',
      remaining: 3,
      startedAt: 0,
      expiresAt: 35000
    }
  };
  manager.engine = engine;
  const sandbox = {
    console,
    Date,
    Math,
    JSON,
    performance: { now: () => runtimeNow },
    setInterval: () => 1,
    clearInterval() {},
    setTimeout() { return 1; },
    clearTimeout() {},
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    dispatchEvent() {},
    BlueFox3D: {
      currentEngine: engine,
      Missions: {},
      BAC: {
        evaluateSurvivalDecision: () => null,
        weightedPick: (options) => options.find((option) => option?.available !== false && Number(option?.baseWeight || option?.weight) > 0) || null,
        getDiagnostics: () => ({ relation: { trustGeneral: 0, trustByAxis: {} } }),
        traitBalance: () => 0
      },
      getSurvivalState: () => ({ energy: 80, needs: {}, fatigue: { level:'normal', movement:1, actionDuration:1 } }),
      getConstructionCollectionCandidate: () => null,
      getBACDiagnostics: () => ({}),
      ObjectEvents: { history: () => [], types: {}, subscribe() {} }
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(integrationPath, 'utf8'), sandbox, { filename: integrationPath });

  runtimeNow = 34000;
  engine.updateAutonomy(runtimeNow);
  assert.ok(engine.__traitLocalActionWindow, 'à +34 s la fenêtre doit encore être active');
  assert.equal(engine.__traitLocalActionWindow.remaining, 3, 'aucune action échouée/neutre ne doit consommer artificiellement le budget');

  runtimeNow = 36000;
  engine.updateAutonomy(runtimeNow);
  assert.equal(engine.__traitLocalActionWindow, null, 'à +36 s la fenêtre doit être expirée');
  assert.equal(engine.__lastTraitLocalActionWindow?.endReason, 'expired');
  assert.equal(engine.__lastTraitLocalActionWindow?.endedAt, 36000);
});
