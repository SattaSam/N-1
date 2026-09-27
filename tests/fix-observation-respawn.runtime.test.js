const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', 'CANDIDAT');

function loadStudyHelpers(randomValue = 0.5) {
  let now = 1000;
  let source = fs.readFileSync(path.join(ROOT, 'engine', 'object-m0-bridge.js'), 'utf8');
  source = source.replace(
    '  install();\n\n})(window);',
    '  BF.__testStartStudyPose = startStudyPose;\n  BF.__testUpdateStudyPose = updateStudyPose;\n})(window);'
  );
  const context = {
    window: null,
    console,
    performance: { now: () => now },
    setTimeout: () => 0,
    clearTimeout: () => {},
    Math: Object.assign(Object.create(Math), { random: () => randomValue }),
    Number, String, Boolean, Object, Array, Set, Map, WeakMap, RegExp, Date, JSON
  };
  context.window = context;
  context.BlueFox3D = { Missions: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'object-m0-bridge.js' });
  return {
    start: context.BlueFox3D.__testStartStudyPose,
    update: context.BlueFox3D.__testUpdateStudyPose,
    setNow: (value) => { now = value; }
  };
}

function makeCharacter({ ear = true, blink = true, duration = 2 } = {}) {
  const rotation = { x: 0.02, y: 0.03, z: 0.04 };
  const scale = { x: 1, y: 1, z: 1, set(x,y,z){ this.x=x; this.y=y; this.z=z; } };
  const head = { name: 'Head', rotation };
  const visual = {
    rotation: {x:0,y:0,z:0}, scale,
    getObjectByName(name){ return name === 'Head' ? head : null; },
    traverse(fn){ fn(head); }
  };
  const mkAction = (clipDuration) => ({
    time: 0, paused: false,
    getClip(){ return { duration: clipDuration }; }
  });
  const actions = new Map();
  actions.set('Idle_V2', mkAction(1.2));
  actions.set('Idle', mkAction(1.1));
  if (ear) actions.set('Ear_Right', mkAction(duration));
  if (blink) actions.set('Blink', mkAction(0.45));
  const plays = [];
  const character = {
    clips: [], actions, visual, currentAction: { setEffectiveTimeScale(){} },
    findAvailableClip(names){ return names.find((n) => n && actions.has(n)) || ''; },
    play(name){ plays.push(name); this.currentAction = { setEffectiveTimeScale(){} }; return true; }
  };
  return { character, head, scale, plays };
}

test('observation normale: ~9% autorise le mouvement complet, sinon Ear_Right reste figée', () => {
  {
    const h = loadStudyHelpers(0.05);
    const c = makeCharacter({ duration: 2 });
    h.setNow(1000);
    h.start(c.character, false);
    const pose = c.character.__bluefoxStudyPose;
    assert.equal(pose.fullEarMotion, true);
    h.update(c.character, 1500);
    assert.equal(pose.action.paused, false, 'le clip complet ne doit pas être figé');
  }
  {
    const h = loadStudyHelpers(0.10);
    const c = makeCharacter({ duration: 2 });
    h.setNow(1000);
    h.start(c.character, false);
    const pose = c.character.__bluefoxStudyPose;
    assert.equal(pose.fullEarMotion, false);
    h.update(c.character, 1500);
    assert.equal(pose.action.paused, true, 'hors des ~9%, le comportement historique reste raccourci');
  }
});

test('observation accentuée: ~14% autorise le mouvement complet et conserve la séquence spéciale', () => {
  {
    const h = loadStudyHelpers(0.10);
    const c = makeCharacter({ duration: 2, blink: true });
    h.setNow(1000);
    h.start(c.character, true);
    const pose = c.character.__bluefoxStudyPose;
    assert.equal(pose.fullEarMotion, true);
    assert.equal(pose.relicSequence, true);
    h.update(c.character, 1500);
    assert.equal(pose.action.paused, false);
  }
  {
    const h = loadStudyHelpers(0.15);
    const c = makeCharacter({ duration: 2, blink: true });
    h.setNow(1000);
    h.start(c.character, true);
    const pose = c.character.__bluefoxStudyPose;
    assert.equal(pose.fullEarMotion, false);
    h.update(c.character, 1500);
    assert.equal(pose.action.paused, true);
    h.update(c.character, pose.holdEndsAt);
    assert.equal(pose.phase, 'idle-first');
    h.update(c.character, pose.phaseEndsAt);
    assert.equal(pose.phase, 'blink');
  }
});

test('tête: entrée/sortie lissées et inclinaison ramenée à ~11°', () => {
  const h = loadStudyHelpers(0.5);
  const c = makeCharacter({ duration: 2 });
  const z0 = c.head.rotation.z;
  h.setNow(1000);
  h.start(c.character, false);
  const pose = c.character.__bluefoxStudyPose;
  assert.equal(c.head.rotation.z, z0, 'aucun snap au démarrage');
  h.update(c.character, 1090);
  assert.ok(Math.abs(c.head.rotation.z - (z0 + 0.095)) < 1e-9, 'entrée smoothstep à mi-course');
  h.update(c.character, 1180);
  assert.ok(Math.abs(c.head.rotation.z - (z0 + 0.19)) < 1e-9, 'inclinaison cible ~10,9°');
  h.update(c.character, pose.holdEndsAt);
  const releaseStart = c.head.rotation.z;
  h.update(c.character, pose.holdEndsAt + 120);
  assert.ok(c.head.rotation.z < releaseStart && c.head.rotation.z > z0, 'sortie progressive');
});

test('pose étude restaure rotations et scale à la fin', () => {
  const h = loadStudyHelpers(0.5);
  const c = makeCharacter({ duration: 2 });
  const base = { ...c.head.rotation };
  h.setNow(1000);
  h.start(c.character, false);
  const pose = c.character.__bluefoxStudyPose;
  h.update(c.character, 1180);
  h.update(c.character, pose.holdEndsAt);
  h.update(c.character, pose.endsAt + 1);
  assert.equal(c.character.__bluefoxStudyPose, null);
  assert.deepEqual(c.head.rotation, base);
  assert.deepEqual({x:c.scale.x,y:c.scale.y,z:c.scale.z}, {x:1,y:1,z:1});
});

test('fallback sans Ear_Right garde une pose bornée et lissée', () => {
  const h = loadStudyHelpers(0.5);
  const c = makeCharacter({ ear: false });
  const z0 = c.head.rotation.z;
  h.setNow(1000);
  const duration = h.start(c.character, false);
  assert.ok(duration >= 2);
  assert.equal(c.head.rotation.z, z0);
  h.update(c.character, 1180);
  assert.ok(Math.abs(c.head.rotation.z - (z0 + 0.19)) < 1e-9);
  h.update(c.character, 3001);
  assert.equal(c.character.__bluefoxStudyPose, null);
  assert.equal(c.head.rotation.z, z0);
});

test('raccord contexte: relique/stèle/arche et MSC missionnelle utilisent la probabilité accentuée', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine', 'object-m0-bridge.js'), 'utf8');
  assert.match(src, /relic\|st\[eè\]le\|stele\|arch/i);
  assert.ok(src.includes('missionMicroSceneStudy'));
  assert.ok(src.includes('startStudyPose(this.character, emphasizedStudy)'));
});

function loadObjectLibrary(t13Status) {
  const context = {
    window: null, console,
    Math, Number, String, Boolean, Object, Array, Set, Map, WeakMap, RegExp, Date, JSON,
    performance: { now: () => 1000 }
  };
  context.window = context;
  context.BlueFox3D = {
    currentEngine: {
      missionManager: { memory: { state: { missionLifecycle: { T13: { status: t13Status } } } } }
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine', 'object-library.js'), 'utf8'), context, { filename:'object-library.js' });
  return context.BlueFox3D.resolveObjectRespawnSeconds;
}

test('respawn pré-T13 reste strictement inchangé', () => {
  const resolve = loadObjectLibrary('active');
  assert.equal(resolve({ rarity:'common', interaction:{respawnSeconds:60} }), 60);
  assert.equal(resolve({ rarity:'rare', interaction:{respawnSeconds:120} }), 120);
  assert.equal(resolve({ rarity:'rare', interaction:{respawnSeconds:300} }), 300);
});

test('respawn post-T13 applique x2 non-rare et paliers rares 1.5/1.4/1.3', () => {
  const resolve = loadObjectLibrary('completed');
  assert.equal(resolve({ rarity:'common', interaction:{respawnSeconds:60} }), 120);
  assert.equal(resolve({ rarity:'rare', interaction:{respawnSeconds:120} }), 180);
  assert.ok(Math.abs(resolve({ rarity:'rare', interaction:{respawnSeconds:180} }) - 252) < 1e-9);
  assert.equal(resolve({ rarity:'rare', interaction:{respawnSeconds:300} }), 390);
  assert.equal(resolve({ rarity:'uncommon', spawn:{tags:['mineral','rare']}, interaction:{respawnSeconds:120} }), 180);
});

test('respawn ne fabrique pas de cooldown invalide', () => {
  const resolve = loadObjectLibrary('completed');
  assert.ok(Number.isNaN(resolve({ interaction:{respawnSeconds:null} }, undefined)) || resolve({ interaction:{respawnSeconds:null} }, undefined) === 0);
  assert.equal(resolve({ interaction:{respawnSeconds:-1} }), -1);
});

test('tous les consommateurs production du périmètre passent par le résolveur canonique', () => {
  const files = [
    'engine/object-m0-bridge.js',
    'engine/world-engine.js',
    'engine/mission-runtime-integration-v19-7.js',
    'engine/special-object-runtime.js'
  ];
  for (const file of files) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.ok(src.includes('BF.resolveObjectRespawnSeconds'), `${file} ne consomme pas le résolveur canonique`);
  }
});
