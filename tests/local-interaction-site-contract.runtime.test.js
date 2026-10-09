const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ROOT = process.env.BLUEFOX_ROOT || path.resolve(__dirname, '..');

function fixture() {
  const seed = process.env.BLUEFOX_SAVE ? JSON.parse(fs.readFileSync(process.env.BLUEFOX_SAVE, 'utf8')).state : {};
  const store = new Map(Object.entries(seed)), events = [], timers = [];
  class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
  const window = { BlueFox3D: { maps: {} }, CustomEvent, performance, Date, JSON, Math, Set, Map, WeakMap,
    structuredClone, console: { log() {}, info() {}, warn() {}, error: console.error },
    addEventListener() {}, removeEventListener() {}, dispatchEvent(event) { events.push(event); },
    setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {}, setInterval() { return 1; },
    clearInterval() {}, queueMicrotask() {}, localStorage: {
      getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, String(value)),
      removeItem: key => store.delete(key)
    } };
  window.window = window;
  const context = vm.createContext(window);
  const load = file => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  for (const file of ['engine/mission-types.js', 'engine/mission-tree.js', 'engine/mission-memory.js',
    'engine/mission-planner.js', 'engine/mission-manager.js', 'engine/object-event-registry.js',
    'engine/object-library.js', 'engine/progression-registry.js', 'engine/progression-multisystem.js',
    'data/bible-patterns.js', 'data/bible-catalog.js', 'engine/bible-contract-v0-1.js',
    'engine/bible-runtime-v0-1-unified.js']) load(file);
  const BF = window.BlueFox3D, M = BF.Missions, runtime = BF.bibleRuntime;
  const manager = Object.create(M.MissionManager.prototype);
  const memory = new M.MissionMemory(), planner = new M.MissionPlanner(memory);
  Object.assign(manager, { memory, planner, trees: new Map(), activeMissionIds: [...memory.state.activeMissionIds],
    primaryMissionId: memory.state.primaryMissionId, activeMissionId: memory.state.activeMissionId,
    enabled: true, executionRecovery: new Map(), targetProbeDiagnostics: new Map(), currentAction: null,
    selectionReason: 'test', pendingPrimaryMissionId: null, pendingPauseMissionId: null, retryAfter: 0,
    lastPriorityReviewAt: 0, catalogController: null,
    bridge: { context: () => ({ mapId: BF.currentEngine.currentMapId, resources: {}, canRoutine: true, needs: {}, energy: 80 }) }
  });
  for (const id of Object.keys(memory.state.missions)) if (M.getDefinition(id)) manager.trees.set(id, planner.restoreOrCreate(id));
  manager.tree = manager.trees.get(manager.primaryMissionId);
  const point = { x: 0, y: 0, z: 0, distanceTo: () => 0 };
  const engine = { missionManager: manager, currentMapId: 'crystal', currentMap: { interactables: [], group: { userData: { microScenes: [] } } },
    character: { root: { position: point } }, interactionWorldPosition: object => object.position || point,
    findKnownRoute: (a, b) => [a, b], callbacks: { onAction() {}, onStatus() {} },
    discoveredMaps: new Set(['crystal']), pendingInteraction: null };
  manager.engine = engine; BF.currentEngine = engine; BF.getAutonomyMode = () => 'full';
  load('engine/action-bridge.js');
  load('engine/object-m0-bridge.js');
  const activate = id => {
    const tree = planner.restoreOrCreate(id);
    assert(tree, id); manager.trees.set(id, tree);
    memory.state.missionLifecycle[id] = { status: 'active', activatedAt: 1 };
    if (!manager.activeMissionIds.includes(id)) manager.activeMissionIds.push(id);
    return tree;
  };
  const object = type => {
    const definition = BF.ObjectLibrary.list({ status: 'active' }).find(entry => entry.type === type);
    assert(definition, type);
    return { userData: { active: true, functional: definition, instanceId: `test:${type}` }, position: point };
  };
  const completeNode = node => { node.progress = node.target; node.status = M.MissionStatus.COMPLETED; node.completedAt = 10; };
  return { BF, M, runtime, manager, memory, planner, engine, load, events, activate, object, completeNode, window, context, store };
}

function established(f, id, kind, stage) {
  const site = { id: `crystal:${kind}:primary`, kind, stage, mapId: 'crystal', missionId: id,
    anchor: { x: 1, y: 0, z: 2 }, establishedAt: 100, microSceneId: 'test' };
  f.memory.state.siteProgression.crystal = { mapId: 'crystal', sites: { [kind]: site } };
  f.memory.state.effectReceipts[`${id}:completion:v1`] = { id: `${id}:completion:v1`, missionId: id,
    siteId: site.id, at: 100, inventoryBypassed: false, source: 'autonomy' };
  return site;
}

function knownObject(f, mapId, type) {
  const definition = f.object(type).userData.functional;
  f.engine.discoveredMaps.add(mapId); f.BF.maps[mapId] = { id: mapId, name: `Nom ${mapId}` };
  const previous = f.BF.getMapProgressionIndicators;
  f.BF.getMapProgressionIndicators = id => id === mapId
    ? { uniqueObjects: { [definition.id]: { family: definition.knowledge?.family } } }
    : previous?.(id);
}
function unlocked(){const f=fixture();f.memory.state.missionLifecycle.T13={status:'completed'};f.memory.setFact('localExplorationUnlocked:v1',true);return f;}
function emit(f,o,type='OBJECT_INSPECTED',detail={}){return f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types[type],o,{mapId:f.engine.currentMapId,interactionSource:'manual',...detail});}
function probe(f,t){const n=t.availableLeaves()[0];return f.BF.probeMissionActionTarget(f.engine,{missionId:t.id,nodeId:n.id,type:n.type,params:n.params});}
function reference(f,id='original'){f.memory.setFact('ene07:giant-tree-site',{mapId:'crystal',persistentMicroSceneId:id});}
test('first local interaction preserves other instances and maps',()=>{const f=unlocked(),a=f.object('magnetic_ore'),b=f.object('magnetic_ore');b.userData.instanceId='second';assert.equal(emit(f,a).firstLocalInteraction,true);assert.equal(emit(f,a).firstLocalInteraction,false);assert.equal(emit(f,b).firstLocalInteraction,true);f.engine.currentMapId='elsewhere';assert.equal(emit(f,a).firstLocalInteraction,true);});
test('collection and reload keep the persistent local receipt',()=>{const f=unlocked(),a=f.object('magnetic_ore');assert.equal(emit(f,a,'RESOURCE_COLLECTED').firstLocalInteraction,true);f.BF.multiProgression.state.mapIndicators={};f.BF.multiProgression.load();assert.equal(emit(f,a).firstLocalInteraction,false);const t=f.activate('LOC-11@crystal');f.engine.currentMap.interactables=[a];assert.equal(probe(f,t),null);});
test('first study reveals LOC11, credits first step, then analyzes same instance only',()=>{const f=unlocked(),a=f.object('magnetic_ore');f.engine.currentMap.interactables=[a];const e=emit(f,a),t=f.manager.trees.get('LOC-11@crystal');assert(t);f.manager.consumeObjectEvent(e);assert(t.findSequenceSlot('observe').isComplete);assert.equal(t.findSequenceSlot('analyze').isComplete,false);const b=f.object('magnetic_ore');b.userData.instanceId='other';f.manager.consumeObjectEvent(emit(f,b,'OBJECT_ANALYZED'));assert.equal(t.findSequenceSlot('analyze').isComplete,false);f.manager.consumeObjectEvent(emit(f,a,'OBJECT_ANALYZED'));assert(t.root.isComplete);});
test('already interacted instance cannot activate or credit unknown entry',()=>{const f=unlocked(),a=f.object('magnetic_ore');f.memory.state.missionLifecycle.T13={status:'paused'};emit(f,a);f.memory.state.missionLifecycle.T13={status:'completed'};const e=emit(f,a);assert.equal(f.manager.trees.has('LOC-11@crystal'),false);const t=f.activate('LOC-11@crystal');f.manager.consumeObjectEvent(e);assert.equal(t.findSequenceSlot('observe').isComplete,false);});
test('collection before study and empty ANY cannot reveal LOC11',()=>{const f=unlocked(),a=f.object('magnetic_ore');emit(f,a,'RESOURCE_COLLECTED');emit(f,a);assert.equal(f.manager.trees.has('LOC-11@crystal'),false);f.runtime.consumeTriggerEvent({type:'interaction.any',mapId:'crystal',tags:['resource']});assert.equal(f.manager.trees.has('LOC-11@crystal'),false);});
test('drone sighting does not consume first physical interaction',()=>{const f=unlocked(),a=f.object('magnetic_ore');assert.equal(emit(f,a,'OBJECT_SEEN',{interactionSource:'drone',droneType:'scout_drone',tags:['drone-scouted']}).firstLocalInteraction,false);assert.equal(emit(f,a).firstLocalInteraction,true);});
test('stable site-slot survives rebuilt render IDs',()=>{const f=unlocked(),a=f.object('magnetic_ore');Object.assign(a.userData,{microSceneId:'scene',persistentMicroSceneId:'site',microSceneObjectIndex:2});emit(f,a);const b=f.object('magnetic_ore');Object.assign(b.userData,{instanceId:'rebuilt',microSceneId:'scene',persistentMicroSceneId:'site',microSceneObjectIndex:2});assert.equal(emit(f,b).firstLocalInteraction,false);const c=f.object('magnetic_ore');Object.assign(c.userData,{instanceId:'other-slot',microSceneId:'scene',persistentMicroSceneId:'site',microSceneObjectIndex:3});assert.equal(emit(f,c).firstLocalInteraction,true);});
test('collection flag excludes unknown selection',()=>{const f=unlocked(),a=f.object('magnetic_ore');f.BF.resolveObjectInteraction(a);a.userData.interactionState.collected=true;const t=f.activate('LOC-11@crystal');f.engine.currentMap.interactables=[a];assert.equal(probe(f,t),null);});
test('same receipt cannot credit twice',()=>{const f=unlocked(),t=f.activate('LOC-11@crystal'),a=f.object('magnetic_ore'),e=emit(f,a);f.manager.consumeObjectEvent(e);const progress=t.findSequenceSlot('observe').progress;f.manager.consumeObjectEvent(e);assert.equal(t.findSequenceSlot('observe').progress,progress);});
test('ENE06 stage prescriptions omit tree from first destination and study phase',()=>{const f=unlocked();f.load('engine/bible-map-prescription-v19.js');const t=f.activate('ENE-06');f.manager.primaryMissionId=t.id;assert.deepEqual(Array.from(f.BF.resolveBibleMapGenerationPrescription().requiredMicroScenes,x=>x.id),['MSC-ECO-THERM-001']);f.completeNode(t.findSequenceSlot('reachThermalMap'));t.refresh();assert.equal(f.BF.resolveBibleMapGenerationPrescription(),null);for(const slot of ['floraPartner','mineralPartner','nearPlant'])f.completeNode(t.findSequenceSlot(slot));t.refresh();assert.deepEqual(Array.from(f.BF.resolveBibleMapGenerationPrescription().requiredMicroScenes,x=>x.id),['MSC-CUSTOM-GIANTCRISTAL-TREE']);});
test('free generation does not inherit primary; multisite comparison survives',()=>{const f=unlocked();f.load('engine/bible-map-prescription-v19.js');const t=f.activate('PHEN-07');f.manager.primaryMissionId=t.id;assert(f.BF.resolveBibleMapGenerationPrescription());f.BF.__pendingBibleMapGenerationContext={intent:'free-exploration'};assert.equal(f.BF.resolveBibleMapGenerationPrescription(),null);f.BF.__pendingBibleMapGenerationContext=null;assert(f.BF.resolveBibleMapGenerationPrescription());assert.deepEqual(Array.from(f.runtime.byId.get('PHEN-07').sequence.find(x=>x.slot==='scoutSite2').params.relation.differentBy),['mapId']);});
test('ENE07 requires actual Giant Tree discovery rather than ENE06 completion',()=>{const f=unlocked();f.memory.state.missionLifecycle['ENE-06']={status:'completed'};f.runtime.consumeTriggerEvent({type:'progression.mission_completed',missionId:'ENE-06'});assert.equal(f.manager.trees.has('ENE-07'),false);const a=f.object('crystalline_tree');Object.assign(a.userData,{microSceneId:'MSC-CUSTOM-GIANTCRISTAL-TREE',persistentMicroSceneId:'reference',microSceneObjectIndex:0});emit(f,a);assert(f.manager.trees.has('ENE-07'));assert.equal(f.memory.getFact('ene07:giant-tree-site').persistentMicroSceneId,'reference');});
test('proximity rejects impostor then accepts original persistent site',()=>{const f=unlocked(),t=f.activate('ENE-08');reference(f);f.memory.setFact("ene08:giant-tree-reference",{mapId:"crystal",persistentMicroSceneId:"original"});for(const slot of ['plantReference','mineralReference','leaveReference','returnToReference'])f.completeNode(t.findSequenceSlot(slot));t.refresh();function root(id){return {position:{x:0,y:0,z:0},userData:{persistentMicroSceneId:id,microSceneId:'MSC-CUSTOM-GIANTCRISTAL-TREE',persistent:true}};}f.engine.currentMap.group.userData.microScenes=[{id:'MSC-CUSTOM-GIANTCRISTAL-TREE',instanceRoot:root('impostor')}];assert.equal(f.runtime.missionProximityWork(t.id),null);f.runtime.reviewProximityContexts();assert.equal(t.findSequenceSlot('returnValidation').isComplete,false);f.engine.currentMap.group.userData.microScenes.push({id:'MSC-CUSTOM-GIANTCRISTAL-TREE',instanceRoot:root('original')});assert(f.runtime.missionProximityWork(t.id));assert.equal(f.runtime.reviewProximityContexts(),true);assert(t.findSequenceSlot('returnValidation').isComplete);assert.equal(f.memory.getFact('ene08:giant-tree-return').persistentMicroSceneId,'original');});
test('legacy producer exact evidence is reused without deleting history',()=>{const f=unlocked(),t=f.activate('ENE-07'),n=t.findSequenceSlot('architecture');f.completeNode(n);n.historyValues.push(JSON.stringify({owner:'object-m0',evidence:{mapId:'crystal',persistentMicroSceneId:'exact'}}));assert.equal(f.runtime.completionSiteFact('ene07:giant-tree-site').persistentMicroSceneId,'exact');assert.equal(n.historyValues.length,1);});
test('ambiguous producer identities are rejected',()=>{const f=unlocked(),t=f.activate('ENE-07'),n=t.findSequenceSlot('architecture');f.completeNode(n);for(const id of ['first','second'])n.historyValues.push(JSON.stringify({owner:'object-m0',evidence:{mapId:'crystal',persistentMicroSceneId:id}}));assert.equal(f.runtime.completionSiteFact('ene07:giant-tree-site'),null);});
test('site receipts do not inflate unique instance counters',()=>{const f=unlocked(),a=f.object('magnetic_ore');Object.assign(a.userData,{microSceneId:'scene',persistentMicroSceneId:'site',microSceneObjectIndex:2});emit(f,a);assert.equal(Object.keys(f.BF.getMapProgressionIndicators('crystal').uniqueInstances).length,1);});
test('legacy distinct physical identity recovers exact persisted site',()=>{const f=unlocked(),t=f.activate('ENE-07'),n=t.findSequenceSlot('architecture');f.completeNode(n);n.distinctValues.push('saved:0#study-0');f.BF.maps.crystal={persistentMicroScenes:[{instanceId:'saved',microSceneId:'MSC-CUSTOM-GIANTCRISTAL-TREE'},{instanceId:'other',microSceneId:'MSC-CUSTOM-GIANTCRISTAL-TREE'}]};assert.equal(f.runtime.completionSiteFact('ene07:giant-tree-site').persistentMicroSceneId,'saved');});
test('first receipt is independent of progression listener order',()=>{const f=unlocked(),a=f.object('magnetic_ore');f.BF.multiProgression.disconnect();assert.equal(emit(f,a).firstLocalInteraction,true);assert.equal(emit(f,a).firstLocalInteraction,false);f.BF.multiProgression.connect();assert(f.BF.hasLocalObjectInteraction('crystal',{instanceId:a.userData.instanceId}));});
test('actual save keeps histories and recovers the studied Giant Tree',{skip:!process.env.BLUEFOX_DIAGNOSTIC_SAVE},()=>{const f=fixture(),state=JSON.parse(fs.readFileSync(process.env.BLUEFOX_DIAGNOSTIC_SAVE,'utf8')).state;for(const [key,value]of Object.entries(state))f.store.set(key,value);f.memory.load();for(const id of Object.keys(f.memory.state.missions))if(f.M.getDefinition(id))f.manager.trees.set(id,f.planner.restoreOrCreate(id));for(const map of JSON.parse(state.bluefox_generated_maps_v1))f.BF.maps[map.id]=map;const before=JSON.stringify(f.memory.state.missionLifecycle);const site=f.runtime.completionSiteFact('ene07:giant-tree-site');assert.equal(site.persistentMicroSceneId,'generated-7df4b30d-0040:ENE-06:MSC-CUSTOM-GIANTCRISTAL-TREE');assert.equal(JSON.stringify(f.memory.state.missionLifecycle),before);assert.equal(Object.keys(f.memory.state.missionLifecycle).filter(id=>id.startsWith('LOC-11@')).length,32);});
test('canonical local receipt uses current map if caller omits detail.mapId',()=>{const f=unlocked(),a=f.object('magnetic_ore');const first=f.BF.ObjectEvents.emit('OBJECT_INSPECTED',a,{interactionSource:'manual'});assert.equal(first.mapId,'crystal');assert.equal(first.firstLocalInteraction,true);assert.equal(f.BF.ObjectEvents.emit('OBJECT_INSPECTED',a,{interactionSource:'manual'}).firstLocalInteraction,false);});
test('native prescription and persistence create only the scene required by each ENE06 stage',()=>{const f=unlocked();f.BF.MapGenerator={generate({id}){const map={id,name:id,plateauCount:1,generator:{}};f.BF.maps[id]=map;return map;}};for(const file of ['engine/persistent-micro-scenes-v20.js','engine/bible-map-prescription-v19.js','engine/map-generator-bible-overrides-v19.js'])f.load(file);const t=f.activate('ENE-06');f.manager.primaryMissionId=t.id;const a=f.BF.MapGenerator.generate({id:'first'});assert.deepEqual(Array.from(a.persistentMicroScenes,x=>x.microSceneId),['MSC-ECO-THERM-001']);for(const slot of ['reachThermalMap','floraPartner','mineralPartner','nearPlant'])f.completeNode(t.findSequenceSlot(slot));t.refresh();const b=f.BF.MapGenerator.generate({id:'second'});assert.deepEqual(Array.from(b.persistentMicroScenes,x=>x.microSceneId),['MSC-CUSTOM-GIANTCRISTAL-TREE']);f.BF.MapGenerator.applyBiblePrescription(b,f.BF.resolveBibleMapGenerationPrescription());assert.equal(b.persistentMicroScenes.length,1);});
test('native multisite prescription still creates two distinct persistent comparison sites',()=>{const f=unlocked();f.BF.MapGenerator={generate({id}){const map={id,name:id,plateauCount:1,generator:{}};f.BF.maps[id]=map;return map;}};for(const file of ['engine/persistent-micro-scenes-v20.js','engine/bible-map-prescription-v19.js','engine/map-generator-bible-overrides-v19.js'])f.load(file);const t=f.activate('PHEN-07');f.manager.primaryMissionId=t.id;const a=f.BF.MapGenerator.generate({id:'first'}),b=f.BF.MapGenerator.generate({id:'second'});assert.notEqual(a.persistentMicroScenes[0].instanceId,b.persistentMicroScenes[0].instanceId);assert.equal(a.persistentMicroScenes[0].microSceneId,'MSC-CHARGED-CRYSTALS-001');});
test('Giant Tree discovery before prerequisite keeps its original site for pending activation',()=>{const f=unlocked(),a=f.object('crystalline_tree');Object.assign(a.userData,{microSceneId:'MSC-CUSTOM-GIANTCRISTAL-TREE',persistentMicroSceneId:'reference',microSceneObjectIndex:0});emit(f,a);assert.equal(f.memory.getFact('ene07:giant-tree-site').persistentMicroSceneId,'reference');assert(f.memory.state.pendingActivations['ENE-07']);f.memory.state.missionLifecycle['ENE-06']={status:'completed'};f.manager.reevaluatePendingActivations();assert(f.manager.trees.has('ENE-07'));assert.equal(f.memory.getFact('ene07:giant-tree-site').persistentMicroSceneId,'reference');});
test('mission proximity is an interaction; passive sightings remain distinct',()=>{const f=unlocked(),a=f.object('magnetic_ore');assert.equal(emit(f,a,'OBJECT_SEEN',{interactionSource:'tracker'}).firstLocalInteraction,false);assert.equal(emit(f,a,'OBJECT_SEEN',{interactionSource:'mission-proximity'}).firstLocalInteraction,true);assert.equal(f.manager.trees.has('LOC-11@crystal'),false);assert.equal(emit(f,a).firstLocalInteraction,false);assert.equal(f.manager.trees.has('LOC-11@crystal'),false);});
test('local novelty contract works for another template, not a LOC11 exception',()=>{const f=unlocked(),original=f.runtime.byId.get('LOC-11'),template={...original,id:'LOC-CONTRACT',priority:999};f.runtime.catalog=[...f.runtime.catalog,template];f.runtime.byId.set(template.id,template);const a=f.object('magnetic_ore'),e=emit(f,a),t=f.manager.trees.get('LOC-CONTRACT@crystal');assert(t);f.manager.consumeObjectEvent(e);assert(t.findSequenceSlot('observe').isComplete);f.manager.consumeObjectEvent(emit(f,a,'OBJECT_ANALYZED'));assert(t.root.isComplete);});
test('LOC12 first observation is credited once and remains one instance per map',()=>{const f=unlocked(),a=f.object('brouteur'),e=emit(f,a,'PHENOMENON_OBSERVED'),t=f.manager.trees.get('LOC-12@crystal');assert(t);f.manager.consumeObjectEvent(e);assert(t.root.isComplete);const again=emit(f,a,'PHENOMENON_OBSERVED');assert.equal(again.firstLocalInteraction,false);assert.equal([...f.manager.trees.keys()].filter(id=>id==='LOC-12@crystal').length,1);});
test('known return destination carries the required persistent site, not only scene type',()=>{const f=unlocked(),t=f.activate('ENE-14');f.memory.setFact('ene07:giant-tree-site',{mapId:'home',persistentMicroSceneId:'original'});const c=f.manager.missionNodeProximityKnownDestinationCriteria(f.runtime.byId.get('ENE-14'),t.findSequenceSlot('calibration'));assert.equal(c.mapId,'home');assert.equal(c.persistentMicroSceneId,'original');});
test('another proximity contract preserves exact site navigation and refuses missing identity',()=>{const f=unlocked(),mission={id:'OTHER',proximityContexts:[{slot:'check',microSceneId:'scene',requiredSiteFact:'other-site'}]},node={id:'OTHER:check'};assert.equal(f.manager.missionNodeProximityKnownDestinationCriteria(mission,node),null);f.memory.setFact('other-site',{mapId:'known',persistentMicroSceneId:'exact'});const c=f.manager.missionNodeProximityKnownDestinationCriteria(mission,node);assert.equal(c.mapId,'known');assert.equal(c.persistentMicroSceneId,'exact');});
