const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');

// Reuse the authenticated P1 fixture without executing its registered tests.
const fixtureSource = fs.readFileSync(path.join(__dirname, 'mission-repair.runtime.test.js'), 'utf8');
const helpers = new Function('require', '__dirname', fixtureSource.slice(0, fixtureSource.indexOf("test('")) +
  '\nreturn { fixture, knownObject };')(require, __dirname);
function fresh(state) {
  const previous = process.env.BLUEFOX_SAVE;
  const directory = state ? fs.mkdtempSync(path.join(os.tmpdir(), 'bluefox-reload-')) : null;
  try {
    if (state) {
      process.env.BLUEFOX_SAVE = path.join(directory, 'reload.json');
      fs.writeFileSync(process.env.BLUEFOX_SAVE, JSON.stringify({ state }));
    } else delete process.env.BLUEFOX_SAVE;
    return helpers.fixture();
  } finally {
    if (previous === undefined) delete process.env.BLUEFOX_SAVE;
    else process.env.BLUEFOX_SAVE = previous;
    if (directory) fs.rmSync(directory, { recursive: true });
  }
}
function ready(f, mission) {
  f.memory.state.missionLifecycle.T13 = { status: 'completed' };
  for (const id of mission.prerequisites || []) f.memory.state.missionLifecycle[id] = { status: 'completed' };
}
function scene(f, id, mapId = 'scene-map') {
  f.engine.currentMapId = mapId;
  f.engine.discoveredMaps.add(mapId);
  f.BF.maps[mapId] = { id: mapId, generator: { featuredMicroSceneIds: [id] } };
  f.engine.currentMap.group.userData.microScenes = [{ id, instanceId: 'scene-instance', instanceRoot: {
    position: { x: 0, y: 0, z: 0 }, userData: { persistentMicroSceneId: 'scene-instance' }
  } }];
}
function eventFor(mission, mapId = 'scene-map') {
  return { ...mission.trigger, type: mission.trigger.type, mapId, toMapId: mapId,
    featuredMicroSceneIds: [...(mission.trigger.featuredMicroSceneIdsAny || [])], amount: 1, isNew: true };
}

test('P2 LOC-17 : cible connue inaccessible exclue, route multi-hop retenue', () => {
  const f = fresh(), tree = f.activate('LOC-17@crystal');
  helpers.knownObject(f, 'unreachable', 'fog_bank'); helpers.knownObject(f, 'reachable', 'fog_bank');
  f.engine.findKnownRoute = (a, b) => b === 'reachable' ? [a, 'intermediate', b] : null;
  const travel = f.manager.missionTransitionFor(tree.id, f.manager.bridge.context());
  assert.equal(travel.source, 'mission-known-destination');
  assert.equal(travel.node.params.toMapId, 'reachable');
});

test('P2 LOC-17 : une définition incompatible ne devient pas destination catégorie', () => {
  const f = fresh(), tree = f.activate('LOC-17@crystal'); helpers.knownObject(f, 'rock-map', 'strong_rock');
  assert.equal(f.manager.missionTransitionFor(tree.id, f.manager.bridge.context()).source, 'mission-map-generation');
});

test('P2 arrivée inconnue : intention causale et identité scoped survivent au reload', () => {
  const f = fresh(), tree = f.activate('LOC-17@crystal');
  f.memory.setFact('missionReturnIntent:' + tree.id, { active: true, missionId: tree.id, kind: 'unknown-travel',
    frontierMapId: 'crystal', direction: 'west' });
  f.memory.setFact('tutorialExcursion:' + tree.id, { generatedTargetMapId: 'arrival', fromMapId: 'crystal', direction: 'west' });
  f.manager.syncMissionSelection();
  f.memory.saveTree(tree); f.memory.save(); f.memory.flush();
  const r = fresh(Object.fromEntries(f.store)); r.engine.currentMapId = 'arrival';
  const work = r.manager.causalArrivalWork(r.manager.bridge.context());
  assert.equal(work.missionId, tree.id); assert.equal(work.awaitingTarget, true);
  assert.equal(r.memory.getFact('missionReturnIntent:' + tree.id).arrivalWorkMapId, 'arrival');
  r.engine.currentMap.interactables = [r.object('fog_bank')];
  assert(r.manager.causalArrivalWork(r.manager.bridge.context()).action);
  assert.equal(r.memory.state.missionLifecycle[tree.id].status, 'active');
});

for (const position of [2, 3, 4]) test(`P2 Top${position} : action locale relayée sans changer Top1 joueur`, () => {
  const f = fresh();
  const ids = Array.from({ length: position }, (_, i) => 'P2-TOP-' + i);
  f.BF.registerMissionDefinitions(ids.map((id, i) => ({ id, priority: 400 - i, root: { id: id + ':root', type: 'group', children: [
    { id: id + ':study', type: 'observe', target: 1, params: i === position - 1 ? { category: 'phenomena' } :
      { cuoType: 'fog_bank', requiredMapFact: 'missing:' + id, requiredMapField: 'mapId' } }
  ] } })));
  for (const id of ids) f.activate(id);
  f.manager.primaryMissionId = ids[0]; f.manager.tree = f.manager.trees.get(ids[0]);
  f.memory.state.missionLifecycle[ids[0]].selectionReason = 'Priorité suggérée par le joueur.';
  f.manager.prioritizedMissionIds = ids; f.memory.state.prioritizedMissionIds = ids;
  f.engine.currentMap.interactables = [f.object('fog_bank')];
  assert.equal(f.manager.prioritizedMissionWork(f.manager.bridge.context()).missionId, ids[position - 1]);
  assert.equal(f.manager.primaryMissionId, ids[0]); assert.equal(f.manager.isPlayerSelectedPrimary(), true);
});

for (const id of ['BAL-01', 'DRN-01', 'DRN-02', 'ANN-ARCH-W02', 'PHEN-02']) {
  test(`P2 ${id} : révélation causale après prérequis, aucune completion fictive`, () => {
    const f = fresh(), mission = f.runtime.byId.get(id); ready(f, mission);
    for (const knowledge of mission.experimentalPrerequisites || []) f.memory.state.researchUnlocks[knowledge] = { unlockedAt: 1 };
    f.runtime.catalog = [mission]; const ev = eventFor(mission);
    f.runtime.consumeTriggerEvent(ev);
    assert.equal(f.memory.state.missionLifecycle[id]?.status, 'active');
    assert.equal(f.manager.trees.get(id).root.isComplete, false);
    f.memory.save(); f.memory.saveTree(f.manager.trees.get(id)); f.memory.flush();
    const r = fresh(Object.fromEntries(f.store));
    assert.equal(r.memory.state.missionLifecycle[id]?.status, 'active');
    assert.equal(r.manager.trees.get(id).root.isComplete, false);
  });
}

test('P2 DRN-01 : reverse_engineering manquant conserve activation en attente', () => {
  const f = fresh(), mission = f.runtime.byId.get('DRN-01'); ready(f, mission); f.runtime.catalog = [mission];
  f.runtime.consumeTriggerEvent(eventFor(mission));
  assert.notEqual(f.memory.state.missionLifecycle[mission.id]?.status, 'active');
  f.memory.state.researchUnlocks.reverse_engineering = { unlockedAt: 1 };
  f.manager.reevaluatePendingActivations();
  assert.equal(f.memory.state.missionLifecycle[mission.id]?.status, 'active');
});

for (const id of ['BAL-02', 'DRN-01', 'DRN-02']) test(`P2 ${id} : retour à l'établi connu puis progression des contextes réels`, () => {
  const f = fresh(), mission = f.runtime.byId.get(id); ready(f, mission); f.activate(id); f.runtime.catalog = [mission];
  f.engine.discoveredMaps.add('workbench-map'); f.BF.maps['workbench-map'] = { id: 'workbench-map' };
  f.BF.getKnownSites = () => [{ mapId: 'workbench-map', microSceneId: 'MSC-CUSTOM-ETABLI-VIDE',
    siteId: 'persistent:workbench-site', anchor: { x: 0, z: 0 }, knownInstanceCount: 1 }];
  const travel = f.manager.missionTransitionFor(id, f.manager.bridge.context());
  assert.equal(travel.node.params.toMapId, 'workbench-map');
  f.engine.currentMapId = 'workbench-map';
  f.engine.currentMap.group.userData.microScenes = [{ id: 'MSC-CUSTOM-ETABLI-VIDE',
    instanceRoot: { position: { x: 0, y: 0, z: 0 }, userData: {} } }];
  for (let i = 0; i < 3; i++) f.runtime.reviewProximityContexts();
  assert.equal(f.manager.trees.get(id).root.isComplete, true);
  assert.equal(f.memory.state.missionLifecycle[id].status, 'completed');
});

test('P2 BAL-03 : seules trois nouvelles maps distinctes créditent le voyage', () => {
  const f = fresh(), tree = f.activate('BAL-03'); f.load('engine/travel-cycle-bridge.js');
  const node = tree.find('BAL-03:reachRemoteMap');
  const progress = (map, isNew) => f.BF.progressSpecificTravelMissionNode(f.manager, tree.id, node,
    { fromMapId: 'crystal', toMapId: map, mapId: map, isNew, source: 'portal' });
  progress('known', false); assert.equal(node.progress, 0);
  progress('new1', true); progress('new1', true); assert.equal(node.progress, 1);
  progress('new2', true); progress('new3', true); assert.equal(node.progress, 3);
  assert.equal(tree.root.isComplete, false); assert.equal(f.memory.state.missionLifecycle[tree.id].status, 'active');
});

test('P2 DRN-03 : déploiement, priorité, récolte distante ; événements locaux refusés', () => {
  const f = fresh(), tree = f.activate('DRN-03');
  const send = (type, detail) => f.runtime.handleDroneMissionObjectEvent({ type, quantity: 1,
    detail: { interactionSource: 'drone', droneType: 'harvest_drone', ...detail } });
  send('RESOURCE_COLLECTED', { remote: true }); assert.equal(tree.find('DRN-03:remoteCollect').progress, 0);
  send('DRONE_ACTIVATED', { state: 'deployed', beaconLinked: false }); assert.equal(tree.find('DRN-03:deploy').progress, 0);
  send('DRONE_ACTIVATED', { state: 'deployed', beaconLinked: true });
  send('DRONE_PRIORITY_CHANGED', {}); send('RESOURCE_COLLECTED', { remote: false });
  assert.equal(tree.root.isComplete, false); send('RESOURCE_COLLECTED', { remote: true });
  assert.equal(f.memory.state.missionLifecycle[tree.id].status, 'completed');
});

test('P2 DRN-04 : console, priorité et dépôt réel, ordre des étapes conservé', () => {
  const f = fresh(), tree = f.activate('DRN-04');
  const send = type => f.runtime.handleDroneMissionObjectEvent({ type, quantity: 1,
    detail: { interactionSource: 'drone', droneType: 'harvest_drone' } });
  send('DRONE_CARGO_DEPOSITED'); assert.equal(tree.find('DRN-04:deposit').progress, 0);
  send('DRONE_CONSOLE_VIEWED'); send('DRONE_PRIORITY_CHANGED'); send('DRONE_CARGO_DEPOSITED');
  assert.equal(f.memory.state.missionLifecycle[tree.id].status, 'completed');
});

for (const id of ['ANN-ARCH-W01', 'ANN-ARCH-W02', 'OPP-MET-01', 'OPP-CIV-01', 'FAU-01']) {
  test(`P2 ${id} : plan de MSC seul insuffisant ; matérialisation puis revisite révèlent`, () => {
    const f = fresh(), mission = f.runtime.byId.get(id); ready(f, mission); f.runtime.catalog = [mission];
    const msc = mission.trigger.featuredMicroSceneIdsAny[0];
    scene(f, msc); f.engine.currentMap.group.userData.microScenes = [];
    f.runtime.onMapTransition({ toMapId: 'scene-map', isNew: false });
    assert.notEqual(f.memory.state.missionLifecycle[id]?.status, 'active');
    scene(f, msc); f.runtime.onMapTransition({ toMapId: 'scene-map', isNew: false });
    assert.equal(f.memory.state.missionLifecycle[id]?.status, 'active');
    assert.equal(f.memory.state.missionLifecycle[id]?.completedAt || 0, 0);
    if (mission.bindActivationMap) assert.equal(f.memory.getFact('bibleActivation:' + id).mapId, 'scene-map');
    assert.equal(f.manager.missionTransitionFor(id, f.manager.bridge.context())?.source === 'mission-map-generation', false);
  });
}

test('P2 OPP : un site réservé à ARCH ne devient pas découverte d’opportunité', () => {
  const f = fresh(), mission = f.runtime.byId.get('OPP-CIV-01'); ready(f, mission); f.runtime.catalog = [mission];
  const msc = mission.trigger.featuredMicroSceneIdsAny[0]; scene(f, msc);
  f.BF.maps['scene-map'].generator.featuredMicroSceneIds = [];
  f.engine.currentMap.group.userData.microScenes[0].missionId = 'ARCH-01';
  f.runtime.onMapTransition({ toMapId: 'scene-map', isNew: false });
  assert.notEqual(f.memory.state.missionLifecycle[mission.id]?.status, 'active');
});

test('P2 faune : approche par espèce seulement après FAU-11 et déverrouillage relationnel', () => {
  const f = fresh(); f.memory.state.missionLifecycle.T13 = { status: 'completed' };
  const ev = { type: 'PHENOMENON_OBSERVED', instanceId: 'animal-A', tags: ['fauna_behavior', 'cautious_approach', 'no_flee'],
    detail: { cuoType: 'brouteur', distance: 4, state: 'calm' } };
  assert.equal(f.runtime.handleFaunaSpeciesObjectEvent(ev), false);
  f.memory.state.missionLifecycle['FAU-11'] = { status: 'completed' };
  assert.equal(f.runtime.handleFaunaSpeciesObjectEvent(ev), false);
  f.memory.setFact('fauna:relationshipLoopUnlocked', true);
  assert.equal(f.runtime.handleFaunaSpeciesObjectEvent(ev), true);
  const id = f.runtime.faunaSpeciesMissionId('FAU-01A', 'brouteur');
  assert.equal(f.memory.state.missionLifecycle[id].status, 'completed');
  assert.equal(f.runtime.reconcileFaunaSpeciesMissions(), true);
  assert.equal(f.memory.state.missionLifecycle[f.runtime.faunaSpeciesMissionId('FAU-03A', 'brouteur')].status, 'active');
});

test('P2 DRN-05 : autre panne réarme une nouvelle tentative sans réutiliser l’arbre réussi', () => {
  const f = fresh(); f.memory.state.missionLifecycle.T13 = { status: 'completed' };
  const first = { failureId: 'failure-1', mapId: 'crystal', instanceId: 'drone-1', droneType: 'harvest_drone' };
  assert.equal(f.runtime.activateDroneRepairMission(first), true);
  f.runtime.handleDroneMissionObjectEvent({ type: 'OBJECT_REPAIRED', detail: { interactionSource: 'drone', failureId: 'other' } });
  assert.equal(f.memory.state.missionLifecycle['DRN-05'].status, 'active');
  f.runtime.handleDroneMissionObjectEvent({ type: 'OBJECT_REPAIRED', detail: { interactionSource: 'drone', failureId: 'failure-1' } });
  assert.equal(f.memory.state.missionLifecycle['DRN-05'].status, 'completed');
  assert.equal(f.runtime.activateDroneRepairMission({ ...first, failureId: 'failure-2', instanceId: 'drone-2', mapId: 'remote' }), true);
  assert.equal(f.memory.state.missionLifecycle['DRN-05'].repeatCount, 1);
  assert.equal(f.manager.trees.get('DRN-05').find('DRN-05:reachDrone').progress, 0);
  assert.equal(f.memory.getFact('droneRepairTarget:DRN-05').failureId, 'failure-2');
});

test('P2 W01 : mur, deux débris du même site, analyse, completion puis reload', () => {
  const f = fresh(), mission = f.runtime.byId.get('ANN-ARCH-W01'); ready(f, mission); f.runtime.catalog = [mission];
  const msc = mission.trigger.featuredMicroSceneIdsAny[0]; scene(f, msc);
  f.runtime.onMapTransition({ toMapId: 'scene-map', isNew: false });
  const tree = f.manager.trees.get(mission.id); assert(tree);
  const root = (type, instance, persistent = 'site-A') => {
    const object = f.object(type); Object.assign(object.userData, { instanceId: instance, microSceneId: msc,
      persistentMicroSceneId: persistent, worldAnchor: object }); return object;
  };
  const wall = root('wall', 'wall-A'), a = root('debris', 'debris-A'), b = root('debris', 'debris-B');
  const observe = (object, verb = 'observe') => {
    const event = f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED, object,
      { mapId: 'scene-map', cuoType: object.userData.functional.type, interactionSource: 'mission', missionNarrativeVerb: verb });
    f.manager.consumeObjectEvent(event);
  };
  observe(wall); assert.equal(tree.find(mission.id + ':wall').progress, 1);
  observe(root('debris', 'wrong-site', 'site-B')); assert.equal(tree.find(mission.id + ':debris').progress, 0);
  observe(a); observe(a); assert.equal(tree.find(mission.id + ':debris').progress, 1);
  observe(b); assert.equal(tree.find(mission.id + ':debris').progress, 2);
  observe(wall, 'analyze'); assert.equal(f.memory.state.missionLifecycle[mission.id].status, 'completed');
  f.memory.flush(); const r = fresh(Object.fromEntries(f.store));
  assert.equal(r.memory.state.missionLifecycle[mission.id].status, 'completed');
  assert.equal(r.memory.getFact('annArchW01:site').siteId, 'persistent:site-A');
});

test('P2 arrivée : excursion étrangère ne revendique pas l’autorité causale', () => {
  const f = fresh(), tree = f.activate('LOC-17@crystal');
  f.memory.setFact('missionReturnIntent:' + tree.id, { active: true, missionId: tree.id, kind: 'unknown-travel',
    frontierMapId: 'crystal', direction: 'west' });
  f.memory.setFact('tutorialExcursion:' + tree.id, { generatedTargetMapId: 'arrival', fromMapId: 'crystal', direction: 'east' });
  f.engine.currentMapId = 'arrival'; assert.equal(f.manager.causalArrivalWork(f.manager.bridge.context()), null);
  assert.notEqual(f.memory.getFact('missionReturnIntent:' + tree.id).arrivalWorkPending, true);
});

for (const id of ['ANN-ARCH-W01', 'OPP-CIV-01', 'FAU-01']) test(`P2 ${id} : aucun déblocage avant T13`, () => {
  const f = fresh(), mission = f.runtime.byId.get(id); f.runtime.catalog = [mission];
  for (const prerequisite of mission.prerequisites || []) if (prerequisite !== 'T13') f.memory.state.missionLifecycle[prerequisite] = { status: 'completed' };
  scene(f, mission.trigger.featuredMicroSceneIdsAny[0]);
  f.memory.state.missionLifecycle.T13 = { status: 'active' };
  f.runtime.onMapTransition({ toMapId: 'scene-map', isNew: true });
  assert.notEqual(f.memory.state.missionLifecycle[id]?.status, 'active');
});

test('P2 suite DRN-03 vers DRN-04 : lifecycle réel traduit une fois sans replay au reload', () => {
  const f = fresh(), source = f.runtime.byId.get('DRN-03'), follower = f.runtime.byId.get('DRN-04');
  ready(f, source); const tree = f.activate(source.id); f.runtime.catalog = [source, follower];
  f.runtime.reconcileMissionCompletionTriggers();
  for (const [type, detail] of [['DRONE_ACTIVATED', { state: 'deployed', beaconLinked: true }],
    ['DRONE_PRIORITY_CHANGED', {}], ['RESOURCE_COLLECTED', { remote: true }]])
    f.runtime.handleDroneMissionObjectEvent({ type, quantity: 1, detail: { interactionSource: 'drone', droneType: 'harvest_drone', ...detail } });
  assert.equal(tree.root.isComplete, true); assert.equal(f.runtime.reconcileMissionCompletionTriggers(), true);
  assert.equal(f.memory.state.missionLifecycle[follower.id].status, 'active');
  assert.equal(f.runtime.reconcileMissionCompletionTriggers(), false);
  f.memory.flush(); const r = fresh(Object.fromEntries(f.store)); r.runtime.catalog = [source, follower];
  assert.equal(r.runtime.reconcileMissionCompletionTriggers(), false);
  assert.equal(r.memory.state.missionLifecycle[follower.id].status, 'active');
});

test('P2 faune : une chaîne répétable réarmée ne valide pas sur des preuves de la précédente', () => {
  const f = fresh(); f.memory.state.missionLifecycle.T13 = { status: 'completed' };
  f.memory.state.missionLifecycle['FAU-11'] = { status: 'completed' };
  const mission = f.runtime.ensureFaunaSpeciesMission('FAU-05A', 'brouteur');
  const tree = f.activate(mission.id), node = tree.availableLeaves()[0];
  node.incrementDistinct('previous-animal-1'); node.incrementDistinct('previous-animal-2'); node.incrementDistinct('previous-animal-3');
  tree.refresh(); f.manager.syncLifecycleFromTrees();
  assert.equal(f.memory.state.missionLifecycle[mission.id].status, 'completed');
  assert.equal(f.manager.rearmRepeatableMission(mission.id), true);
  assert.equal(f.manager.activateMission(mission.id), true);
  const newNode = f.manager.trees.get(mission.id).availableLeaves()[0];
  assert.equal(newNode.progress, 0); assert.equal(newNode.distinctValues.length, 0);
  assert.equal(f.memory.state.missionLifecycle[mission.id].repeatCount, 1);
});

for (const position of [3, 4]) test(`P2 Top${position} : voyage contractuel relayé sans changer Top1 joueur`, () => {
  const f = fresh(), blocked = Array.from({ length: position - 1 }, (_, i) => 'P2-TRAVEL-' + i);
  f.BF.registerMissionDefinitions(blocked.map(id => ({ id, root: { id: id + ':root', type: 'group', children: [
    { id: id + ':study', type: 'observe', target: 1, params: { category: 'phenomena', requiredMapFact: 'missing:' + id } }
  ] } })));
  for (const id of blocked) f.activate(id);
  const phenomenon = f.activate('LOC-17@crystal'), ids = [...blocked, phenomenon.id];
  f.manager.primaryMissionId = blocked[0]; f.manager.tree = f.manager.trees.get(blocked[0]);
  f.memory.state.missionLifecycle[blocked[0]].selectionReason = 'Priorité suggérée par le joueur.';
  f.manager.prioritizedMissionIds = ids; f.memory.state.prioritizedMissionIds = ids;
  const work = f.manager.prioritizedMissionWork(f.manager.bridge.context());
  assert.equal(work.kind, 'travel'); assert.equal(work.missionId, phenomenon.id);
  assert.equal(work.travel.source, 'mission-map-generation');
  assert.equal(f.manager.primaryMissionId, blocked[0]);
});

test('P2 tagsAll : le matching géographique conserve la conjonction canonique', () => {
  const f = fresh(), definition = f.object('fluorescent_vegetation').userData.functional;
  const tag = definition.spawn.tags[0]; assert(tag);
  f.BF.registerMissionDefinitions([{ id: 'P2-TAGS', root: { id: 'P2-TAGS:root', type: 'group', children: [
    { id: 'P2-TAGS:study', type: 'observe', target: 1, params: { category: definition.category, tagsAll: [tag] } }
  ] } }]);
  const tree = f.activate('P2-TAGS'); helpers.knownObject(f, 'valid-tags', 'fluorescent_vegetation');
  helpers.knownObject(f, 'invalid-tags', 'strong_rock');
  const node = tree.availableLeaves()[0], criteria = f.manager.missionNodeKnownDestinationCriteria(node, tree);
  const candidates = f.manager.knownDestinationCandidates({ missionId: tree.id }, criteria);
  assert(candidates.some(entry => entry.mapId === 'valid-tags'));
  assert(!candidates.some(entry => entry.mapId === 'invalid-tags'));
  node.params.tagsAll = [tag, 'p2-impossible-tag'];
  assert.equal(f.manager.knownDestinationCandidates({ missionId: tree.id }, criteria).length, 0);
});

test('P2 Top1 choisie : sélection et absence de cible restent persistantes au reload', () => {
  const f = fresh(), tree = f.activate('LOC-17@crystal');
  assert.equal(f.manager.setPrimaryMission(tree.id, true, 'Priorité suggérée par le joueur.'), true);
  f.memory.flush(); const r = fresh(Object.fromEntries(f.store));
  assert.equal(r.manager.primaryMissionId, tree.id); assert.equal(r.manager.isPlayerSelectedPrimary(), true);
  assert.equal(r.manager.tree.root.isComplete, false);
  assert.equal(r.manager.missionTransitionFor(tree.id, r.manager.bridge.context()).source, 'mission-map-generation');
});
