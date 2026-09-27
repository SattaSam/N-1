const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const specialSrc = fs.readFileSync(path.join(root, 'engine/special-object-runtime.js'), 'utf8');
const worldSrc = fs.readFileSync(path.join(root, 'engine/world-engine.js'), 'utf8');
const spawnerSrc = fs.readFileSync(path.join(root, 'engine/object-spawner.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'journal.css'), 'utf8');

assert(worldSrc.includes('specialAction: "teleport-return"'), 'WorldEngine doit distinguer la balise deployed de la balise abandonnée');
assert(worldSrc.includes('requestBeaconTeleport?.(object)'), 'le clic balise doit déléguer au runtime TP existant');
assert(worldSrc.includes('beginCanonicalMapTransition(options = {})'), 'la transition canonique doit accepter le contexte TP');
assert(worldSrc.includes('options.mode === "teleport" || options.source === "teleporter"'), 'la variante visuelle doit être limitée aux TP');
assert(worldSrc.includes('classList?.remove?.("teleport")'), 'la variante TP doit être nettoyée après transition');
assert(spawnerSrc.includes('instance.hitbox.removeFromParent?.()'), 'ASTROLOGY doit retirer la hitbox de ses arches');
assert(spawnerSrc.includes('instance.hitbox = null'), 'ASTROLOGY ne doit pas exposer la hitbox arch aux interactables');
assert(css.includes('.map-transition.teleport'), 'le style de chargement TP doit exister');
assert(css.includes('repeating-linear-gradient'), 'le chargement TP doit contenir les barres lumineuses');
assert(specialSrc.includes('calibratedBeaconInstanceId'), 'la calibration doit conserver l’identité de la balise');

function makeRuntime({ currentMapId, playerX, confirmResult, tp11Status, storedTeleporter }) {
  const store = {
    bluefox_special_objects_v1: JSON.stringify({
      version: 1,
      drones: {},
      harvestFleet: [],
      resources: {},
      teleporter: storedTeleporter,
      lastRuntimeAt: Date.now()
    })
  };
  const hub = { instanceId: 'hub:astro', microSceneId: 'MSC-CUSTOM-ASTROLOGY', contextRole: 'teleporter_anchor', kind: 'teleporter_site', persistent: true, anchor: { x: 0, y: 0, z: 0 } };
  const a = { instanceId: 'b:beacon-a', contextRole: 'deployed_beacon', kind: 'deployed_beacon', persistent: true, anchor: { x: 10, y: 0, z: 10 } };
  const b = { instanceId: 'b:beacon-b', contextRole: 'deployed_beacon', kind: 'deployed_beacon', persistent: true, anchor: { x: 100, y: 0, z: 100 } };
  const c = { instanceId: 'c:beacon', contextRole: 'deployed_beacon', kind: 'deployed_beacon', persistent: true, anchor: { x: 20, y: 0, z: 20 } };
  const d = { instanceId: 'd:beacon', contextRole: 'deployed_beacon', kind: 'deployed_beacon', persistent: true, anchor: { x: 30, y: 0, z: 30 } };
  const e = { instanceId: 'e:beacon', contextRole: 'deployed_beacon', kind: 'deployed_beacon', persistent: true, anchor: { x: 40, y: 0, z: 40 } };
  const records = { hub: [hub], b: [a, b], c: [c], d: [d], e: [e] };
  const transitions = [];
  const statuses = [];
  const engine = {
    currentMapId,
    discoveredMaps: new Set(['hub','b','c','d','e']),
    character: { root: { position: { x: playerX, y: 0, z: playerX } }, target: null },
    currentMap: { group: null },
    transitioning: false,
    pendingInteraction: null,
    currentRoutine: null,
    pendingZoneExploration: null,
    pendingGate: null,
    missionManager: { currentAction: null, memory: { state: { missionLifecycle: { 'TP-11': { status: tp11Status } } } } },
    callbacks: { onStatus(text) { statuses.push(text); } },
    async transitionToKnownMap(target, options) { transitions.push({ target, options }); this.currentMapId = target; return true; }
  };
  const BF = {
    maps: { hub:{id:'hub',name:'Hub'}, b:{id:'b',name:'B'}, c:{id:'c'}, d:{id:'d'}, e:{id:'e'} },
    currentEngine: engine,
    PersistentMicroScenes: { list(def) { return records[def.id] || []; } },
    MicroScenes: { get() { return { radius: 6, objects: [{type:'eroded_monolith',offset:[5,0,0]}] }; } },
    ObjectEvents: { subscribe(){ return ()=>{}; }, types:{} },
    availableInventory(){ return 999; }
  };
  const w = {
    BlueFox3D: BF,
    localStorage: { getItem(k){ return store[k] || null; }, setItem(k,v){ store[k]=v; } },
    addEventListener(){}, dispatchEvent(){},
    CustomEvent: class { constructor(type,o={}){ this.type=type; this.detail=o.detail; } },
    setTimeout(fn){ fn(); return 0; },
    confirm(){ return confirmResult; },
    Date, Math, console
  };
  w.window = w;
  vm.runInNewContext(specialSrc, w);
  return { BF, engine, records, transitions, statuses, rt: BF.SpecialObjectRuntime };
}

(async () => {
  {
    const ctx = makeRuntime({
      currentMapId: 'b', playerX: 100, confirmResult: true, tp11Status: 'completed',
      storedTeleporter: { active:true, activatedAt:1, calibratedAt:1, calibratedBeaconMapId:'b', calibratedBeaconInstanceId:'b:beacon-b', calibratedNetworkSize:4, firstOutboundAt:1 }
    });
    const clicked = { userData: { persistentMicroSceneId: 'b:beacon-b', contextRole: 'deployed_beacon', libraryType: 'survey_beacon' } };
    assert.equal(await ctx.rt.requestBeaconTeleport(clicked), true, 'OUI sur la balise B doit lancer le retour');
    assert.equal(ctx.transitions.length, 1);
    assert.equal(ctx.transitions[0].target, 'hub');
    assert.equal(ctx.transitions[0].options.source, 'teleporter');
    assert.equal(ctx.transitions[0].options.mode, 'teleport');
    // Le joueur est à 100,100 : un fallback records[0] (balise A à 10,10) échouerait au contrôle de proximité.
  }

  {
    const ctx = makeRuntime({
      currentMapId: 'b', playerX: 100, confirmResult: false, tp11Status: 'completed',
      storedTeleporter: { active:true, activatedAt:1, calibratedAt:1, calibratedBeaconMapId:'b', calibratedBeaconInstanceId:'b:beacon-b', calibratedNetworkSize:4, firstOutboundAt:1 }
    });
    const clicked = { userData: { persistentMicroSceneId: 'b:beacon-b', contextRole: 'deployed_beacon', libraryType: 'survey_beacon' } };
    assert.equal(await ctx.rt.requestBeaconTeleport(clicked), false, 'NON doit annuler le TP');
    assert.equal(ctx.transitions.length, 0);
  }

  {
    const ctx = makeRuntime({
      currentMapId: 'hub', playerX: 0, confirmResult: true, tp11Status: 'active',
      storedTeleporter: { active:true, activatedAt:1, calibratedAt:1, calibratedBeaconMapId:'b', calibratedBeaconInstanceId:'b:beacon-b', calibratedNetworkSize:4, firstOutboundAt:0 }
    });
    assert.equal(await ctx.rt.teleportTo('b'), true, 'le premier outbound doit utiliser la balise calibrée exacte');
    assert.equal(ctx.transitions.length, 1);
    assert.equal(ctx.transitions[0].options.targetAnchor.x, 100, 'la cible doit être la balise B calibrée, pas records[0]');
    assert.equal(ctx.transitions[0].options.targetAnchor.z, 100);
  }

  console.log('PASS R-TP-R3 beacon identity/direct return/ASTROLOGY hitbox/teleport transition visual');
})().catch((error) => { console.error(error); process.exit(1); });
