const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = process.env.BLUEFOX_TEST_ROOT
  ? path.resolve(process.env.BLUEFOX_TEST_ROOT)
  : path.resolve(__dirname, '..');

function harness(options = {}) {
  let experimentRuns = 0;
  let fallbackRuns = 0;
  let rationRuns = 0;
  let intentReads = 0;
  let selectedOptions = [];
  const movements = [];
  const navigations = [];
  const intent = options.intent || {
    missionId: 'DRN-01', axis: 'research', baseWeight: 292,
    target: 'camp', knowledgeId: 'reverse_engineering',
    experimentThemeId: 'engineering', requiredStage: 3
  };
  const state = {
    id: 'engineering', axis: 'research', completed: false,
    nextStage: {
      stage: options.nextStageNumber || intent.requiredStage,
      location: options.nextStageLocation || intent.target
    },
    locationReady: options.locationReady !== false,
    resourcesReady: options.resourcesReady !== false,
    canRun: options.locationReady !== false && options.resourcesReady !== false
  };
  const position = {distanceTo(){ return 0; }};
  const missionManager = {
    memory: {state: {siteProgression: options.siteProgression || {}, missionLifecycle: {}}},
    currentAction: null,
    hasPrimaryMissionAuthority(){ return options.primaryAuthority === true; },
    pendingExperimentationIntent(){ intentReads += 1; return intent; }
  };
  const persistentNavigationIntent = options.persistentNavigationIntent || null;
  const engine = {
    currentMapId: options.currentMapId || 'crystal',
    currentMap: {interactables: [], gates: []},
    discoveredMaps: new Set(['crystal', 'remote']),
    persistentNavigationIntent,
    missionManager,
    character: {
      root: {position}, target: position, fatigueSpeedMultiplier: 1,
      setTarget(target, mode){ movements.push({target, mode}); return true; }
    },
    callbacks: {onStatus(){}, onSpeak(){}}, speechVisible: false,
    transitioning: false, pendingInteraction: null, pendingGate: null,
    pendingZoneExploration: null, currentRoutine: null,
    postActionRecoveryUntil: 0, lastAutonomyAt: 0, lastActivityAt: 0,
    autonomyActionStreak: 0, autonomyBreakTarget: 3,
    updateAutonomy(){ fallbackRuns += 1; }, ensureActivity(){},
    targetInteraction(){ return true; }, canInteractWith(){ return false; },
    autonomyAllowed(){ return true; },
    findKnownRoute(from, to){ return from === to ? [from] : [from, to]; },
    handleNavigationSuggestion(detail){ navigations.push(detail); },
    noteLocalAutonomousDecision(){}, showWorldMarker(){},
    canStartAutonomousGate(){ return false; }
  };
  const BAC = {
    evaluateSurvivalDecision(){ return null; },
    weightedPick(list){
      selectedOptions = list;
      if (options.chooseRation) return list.find((entry) => entry.id === 'test-ration') || null;
      return list.find((entry) => entry.id.startsWith('pending-experimentation:') && entry.available) || null;
    }
  };
  const BF = {
    currentEngine: engine, Missions: {}, BAC,
    Research: {
      experimentationForKnowledge(){
        return {theme: {id: 'engineering', axis: 'research'}, stage: state.nextStage};
      },
      experimentationState(){ return state; },
      runExperiment(themeId, runOptions){
        experimentRuns += 1;
        assert.equal(themeId, 'engineering');
        assert.equal(runOptions.source, 'bac-pending-prerequisite');
        return true;
      }
    },
    RationPolicy: options.chooseRation ? {
      autonomyCandidate(){
        return {id: 'test-ration', axis: 'survival', baseWeight: 100, available: true,
          execute(){ rationRuns += 1; return true; }};
      }
    } : null,
    ObjectLibrary: {get(){ return null; }},
    ObjectEvents: {types: {}, history(){ return []; }},
    getSurvivalState(){ return {fatigue: {movement: 1}, needs: {}}; },
    getMapExplorationState(){ return {surfacePercent: 100}; },
    getNextUnexploredMapTarget(){ return null; }
  };
  const context = {
    window: null, BlueFox3D: BF, performance: {now: () => 0},
    Date, Math, Set, Map, WeakMap, Object, console,
    addEventListener(){}, setTimeout(fn){ fn(); return 1; },
    setInterval(){ return 1; }, clearInterval(){}, requestAnimationFrame(){ return 1; },
    document: {querySelector(){ return null; }}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine/behavior-arbitration-integration.js'), 'utf8'), context);
  return {
    engine, run(now = 6000){ engine.updateAutonomy(now); },
    get experimentRuns(){ return experimentRuns; },
    get fallbackRuns(){ return fallbackRuns; },
    get rationRuns(){ return rationRuns; },
    get intentReads(){ return intentReads; },
    get selectedOptions(){ return selectedOptions; },
    movements, navigations
  };
}

test('la candidate BAC conserve le poids missionnel et l axe thématique', () => {
  const h = harness();
  h.run();
  const candidate = h.selectedOptions.find((entry) => entry.id === 'pending-experimentation:DRN-01');
  assert.equal(candidate.baseWeight, 292);
  assert.equal(candidate.axis, 'research');
  assert.equal(candidate.missionDriven, true);
  assert.equal(h.experimentRuns, 1);
});

test('le BAC reste souverain entre expérimentation et autres candidats', () => {
  const h = harness({chooseRation: true});
  h.run();
  assert.equal(h.rationRuns, 1);
  assert.equal(h.experimentRuns, 0);
});

test('une directive joueur persistante interdit toute candidate expérimentale', () => {
  const directive = {mapId: 'remote', source: 'player'};
  const h = harness({persistentNavigationIntent: directive});
  h.run();
  assert.equal(h.engine.persistentNavigationIntent, directive);
  assert.equal(h.intentReads, 0);
  assert.equal(h.experimentRuns, 0);
  assert.equal(h.movements.length, 0);
});

test('l expérimentation reprend causalement après réalisation de la directive joueur', () => {
  const h = harness({persistentNavigationIntent: {mapId: 'remote'}});
  h.run();
  h.engine.persistentNavigationIntent = null;
  h.run(12000);
  assert.equal(h.experimentRuns, 1);
});

test('une mission primaire runnable conserve son autorité', () => {
  const h = harness({primaryAuthority: true});
  h.run();
  assert.equal(h.experimentRuns, 0);
  assert.equal(h.movements.length, 0);
});

test('prochaine étape distante: la navigation existante rejoint le bon site', () => {
  const h = harness({
    currentMapId: 'remote', locationReady: false,
    nextStageNumber: 3, nextStageLocation: 'camp',
    intent: {
      missionId: 'ENE-X', axis: 'research', baseWeight: 310,
      target: 'workbench', knowledgeId: 'advanced_engineering',
      experimentThemeId: 'engineering', requiredStage: 5
    },
    siteProgression: {crystal: {sites: {
      base: {kind: 'base', mapId: 'crystal', anchor: {x: 1, y: 0, z: 2}},
      workbench: {kind: 'workbench', mapId: 'remote', anchor: {x: 3, y: 0, z: 4}}
    }}}
  });
  h.run();
  assert.equal(h.movements.length, 0, 'ne doit pas rejoindre prématurément l établi');
  assert.equal(h.navigations[0].mapId, 'crystal');
  assert.equal(h.navigations[0].source, 'pending-experimentation');
});

test('sans ressources aucune expérience ni déplacement n est lancé', () => {
  const h = harness({resourcesReady: false, locationReady: false,
    siteProgression: {crystal: {kind: 'camp', mapId: 'crystal', anchor: {x: 1, z: 2}}}});
  h.run();
  assert.equal(h.experimentRuns, 0);
  assert.equal(h.movements.length, 0);
  assert.equal(h.navigations.length, 0);
  const candidate = h.selectedOptions.find((entry) => entry.id === 'pending-experimentation:DRN-01');
  assert.equal(candidate.available, false);
  assert.equal(h.fallbackRuns, 1);
});
