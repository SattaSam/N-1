const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

const ROOT = process.env.TARGET_ROOT || path.join(__dirname, '..');
class CE { constructor(type, init={}) { this.type=type; this.detail=init.detail; } }

function loadHarness({ maps, discovered, sites, routes, currentMap='home', bacPick } = {}) {
  const facts = new Map();
  let saveCount = 0;
  let knownSiteQueries = 0;
  let bacCalls = 0;
  let routeCalls = 0;
  const listeners = new Map();
  const window = {
    console, Date, Math, JSON, Set, Map, CustomEvent: CE,
    performance: { now: () => 1000 },
    localStorage: { getItem: () => null, setItem(){} },
    addEventListener(type, fn){ if(!listeners.has(type)) listeners.set(type,new Set()); listeners.get(type).add(fn); },
    removeEventListener(){}, dispatchEvent(){ return true; },
    BlueFox3D: {}
  };
  window.window = window;
  const BF = window.BlueFox3D;
  BF.maps = maps || {};
  BF.discoveredMaps = discovered || new Set([currentMap]);
  BF.getKnownSites = (criteria={}) => {
    knownSiteQueries += 1;
    return (sites || []).filter(site => {
      if(criteria.siteId && site.siteId !== criteria.siteId) return false;
      if(criteria.microSceneId && site.microSceneId !== criteria.microSceneId) return false;
      if(criteria.resource && !site.resources?.[criteria.resource]) return false;
      if(criteria.family && !site.families?.[criteria.family]) return false;
      return true;
    }).map(x => JSON.parse(JSON.stringify(x)));
  };
  BF.getMapExplorationState = (mapId) => ({ surfacePercent: mapId === 'swamp-near' ? 80 : 40 });
  BF.getAutonomyMode = () => 'full';
  BF.BAC = { weightedPick(options){ bacCalls += 1; return bacPick ? bacPick(options) : [...options].sort((a,b)=>b.baseWeight-a.baseWeight)[0]; } };
  const A = {
    TRAVEL:'travel', COLLECT:'collect', EXTRACT:'extract', INSPECT:'inspect', ANALYZE:'analyze',
    OBSERVE:'observe', RESEARCH:'research', CRAFT:'craft', BUILD:'build', EXPLORE_ZONE:'explore_zone', REST:'rest', EAT:'eat'
  };
  BF.Missions = {
    definitions: {}, ActionType:A, MissionStatus:{AVAILABLE:'available',ACTIVE:'active',COMPLETED:'completed',FAILED:'failed'},
    normalizeActionType:t=>t, getDefinition:id=>BF.Missions.definitions[id]||null
  };
  const ctx = vm.createContext({ window, CustomEvent:CE, console, performance:window.performance, Date, Math, JSON, Set, Map });
  vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/mission-manager.js'),'utf8'), ctx, {filename:'engine/mission-manager.js'});

  const manager = Object.create(BF.Missions.MissionManager.prototype);
  manager.engine = {
    currentMapId: currentMap,
    discoveredMaps: BF.discoveredMaps,
    findOptimalRoute(from,to){ routeCalls += 1; const key=`${from}->${to}`; return routes?.[key] || null; },
    findKnownRoute(from,to){ routeCalls += 1; const key=`${from}->${to}`; return routes?.[key] || null; },
    handleNavigationSuggestion(req){ manager.lastNavigation = req; return true; },
    transitioning:false,pendingGate:false,pendingInteraction:false,currentRoutine:null
  };
  manager.memory = {
    state:{missionLifecycle:{}, pendingActivations:{}},
    getFact(key, fallback=null){ return facts.has(key)?facts.get(key):fallback; },
    setFact(key,value){ facts.set(key,value); return value; },
    save(){ saveCount += 1; }, remember(){}, saveTree(){}
  };
  manager.bridge = { context:()=>({mapId:manager.engine.currentMapId,energy:80,needs:{}}), isEngineBusy:()=>false };
  manager.planner = { nextAction:()=>null };
  manager.activeMissionIds = [];
  manager.trees = new Map();
  manager.currentAction = null;
  manager.primaryMissionId = 'MEM-TEST';
  manager.tree = null;
  BF.Missions.definitions['MEM-TEST'] = {
    id:'MEM-TEST', priority:50,
    navigation:{ autonomousKnownDestination:true }
  };
  const travel = (params) => ({ missionId:'MEM-TEST', mission:BF.Missions.definitions['MEM-TEST'], source:'explicit-travel', node:{id:'MEM-TEST:travel',type:A.TRAVEL,params:{eventDriven:true,...params}} });
  manager.primaryMissionTransition = () => manager.testTravel;
  return {window,BF,manager,travel,facts,metrics:()=>({saveCount,knownSiteQueries,bacCalls,routeCalls})};
}

function site(siteId,mapId, count, opts={}) {
  return {
    siteId,mapId,microSceneId:opts.microSceneId||'MSC-CARRIERE', anchor:opts.anchor||{x:10,y:0,z:5},
    knownInstanceCount:count,
    resources: opts.resources || { magnetic_ore:{distinctInstances:count} },
    families: opts.families || { mineral:{distinctInstances:count} }
  };
}

assert.equal(typeof loadHarness().manager.resolveKnownDestination, 'function', 'P2 resolver absent');

// Biome: only actually discovered maps may become candidates; unknown swamp must stay invisible.
{
  const h=loadHarness({
    maps:{home:{profile:'desert'},'swamp-near':{generator:{biomeId:'swamp'},name:'Marais connu'},'swamp-unknown':{generator:{biomeId:'swamp'},name:'Marais inconnu'}},
    discovered:new Set(['home','swamp-near']), routes:{'home->swamp-near':['home','swamp-near'],'home->swamp-unknown':['home','x','swamp-unknown']}
  });
  h.manager.testTravel=h.travel({knownDestination:{biome:'swamp'}});
  const resolved=h.manager.resolveKnownDestination(h.manager.testTravel);
  assert.equal(resolved.mapId,'swamp-near');
  assert.notEqual(resolved.mapId,'swamp-unknown');
}

// Richness can justify a longer trip: knowledge is based on distinct actually-known instances.
{
  const h=loadHarness({
    maps:{home:{},near:{},quarry:{}}, discovered:new Set(['home','near','quarry']),
    sites:[site('near-one','near',1),site('quarry-six','quarry',6)],
    routes:{'home->near':['home','near'],'home->quarry':['home','a','b','c','quarry']}
  });
  h.manager.testTravel=h.travel({knownDestination:{resource:'magnetic_ore'}});
  const resolved=h.manager.resolveKnownDestination(h.manager.testTravel);
  assert.equal(resolved.siteId,'quarry-six');
  assert.ok(resolved.baseWeight > 0);
}

// Distance still matters: modestly richer but very remote can lose to a nearby known site.
{
  const h=loadHarness({
    maps:{home:{},near:{},far:{}}, discovered:new Set(['home','near','far']),
    sites:[site('near-one','near',1),site('far-two','far',2)],
    routes:{'home->near':['home','near'],'home->far':['home','a','b','c','far']}
  });
  h.manager.testTravel=h.travel({knownDestination:{resource:'magnetic_ore'}});
  const resolved=h.manager.resolveKnownDestination(h.manager.testTravel);
  assert.equal(resolved.siteId,'near-one');
}

// Family/site use: a remembered biological grove is a valid semantic destination.
{
  const grove=site('bio-grove','bio-map',5,{microSceneId:'MSC-BOSQUET-BIO',resources:{biomass:{distinctInstances:4}},families:{flora:{distinctInstances:5}}});
  const h=loadHarness({maps:{home:{},'bio-map':{}},discovered:new Set(['home','bio-map']),sites:[grove],routes:{'home->bio-map':['home','bio-map']}});
  h.manager.testTravel=h.travel({knownDestination:{family:'flora'}});
  const resolved=h.manager.resolveKnownDestination(h.manager.testTravel);
  assert.equal(resolved.siteId,'bio-grove'); assert.equal(resolved.microSceneId,'MSC-BOSQUET-BIO');
}

// Exact site may be supplied by a mission fact (future W02 -> W04 contract), with identity+anchor preserved in intent.
{
  const target=site('ruin-exact','ruin-map',3,{microSceneId:'MSC-CUSTOM-WALL-RUIN-COLLAPSED',anchor:{x:-12,y:0,z:7},resources:{},families:{}});
  const h=loadHarness({maps:{home:{},'ruin-map':{}},discovered:new Set(['home','ruin-map']),sites:[target],routes:{'home->ruin-map':['home','ruin-map']}});
  h.facts.set('rememberedSite',{siteId:'ruin-exact'});
  h.manager.testTravel=h.travel({knownDestinationFact:'rememberedSite'});
  const intent=h.manager.ensureMissionTransitionIntent();
  assert.equal(intent.active,true); assert.equal(intent.kind,'known-destination');
  assert.equal(intent.targetMapId,'ruin-map'); assert.equal(intent.targetSiteId,'ruin-exact');
  assert.deepEqual(intent.targetAnchor,{x:-12,y:0,z:7});
}

// CPU/anti-ping-pong: same mission/node/map reuses the persisted decision, no second query/BAC/route scoring.
{
  const h=loadHarness({maps:{home:{},q:{}},discovered:new Set(['home','q']),sites:[site('q1','q',4)],routes:{'home->q':['home','q']}});
  h.manager.testTravel=h.travel({knownDestination:{resource:'magnetic_ore'}});
  const first=h.manager.ensureMissionTransitionIntent();
  const m1=h.metrics();
  const second=h.manager.ensureMissionTransitionIntent();
  const m2=h.metrics();
  assert.equal(first.targetSiteId,'q1'); assert.equal(second.targetSiteId,'q1');
  assert.equal(m2.knownSiteQueries,m1.knownSiteQueries); assert.equal(m2.bacCalls,m1.bacCalls); assert.equal(m2.routeCalls,m1.routeCalls);
}

// Unreachable sites are not candidates.
{
  const h=loadHarness({maps:{home:{},blocked:{},ok:{}},discovered:new Set(['home','blocked','ok']),sites:[site('blocked-site','blocked',9),site('ok-site','ok',1)],routes:{'home->ok':['home','ok']}});
  h.manager.testTravel=h.travel({knownDestination:{resource:'magnetic_ore'}});
  assert.equal(h.manager.resolveKnownDestination(h.manager.testTravel).siteId,'ok-site');
}

// A locally-known best site must not trigger a pointless inter-map departure.
{
  const h=loadHarness({maps:{home:{},remote:{}},discovered:new Set(['home','remote']),sites:[site('local-rich','home',6),site('remote-poor','remote',1)],routes:{'home->remote':['home','remote']}});
  h.manager.testTravel=h.travel({knownDestination:{resource:'magnetic_ore'}});
  const intent=h.manager.ensureMissionTransitionIntent();
  assert.equal(intent.active,false); assert.equal(intent.satisfiedLocally,true); assert.equal(intent.targetSiteId,'local-rich');
  const before=h.metrics(); h.manager.ensureMissionTransitionIntent(); const after=h.metrics();
  assert.equal(after.bacCalls,before.bacCalls,'local decision must also be cached');
}

// Existing navigation owner executes the chosen remote map; P2 does not create another navigator.
{
  const h=loadHarness({maps:{home:{},q:{}},discovered:new Set(['home','q']),sites:[site('q1','q',4)],routes:{'home->q':['home','q']}});
  h.manager.testTravel=h.travel({knownDestination:{resource:'magnetic_ore'}});
  assert.equal(h.manager.resumeMissionTransitionIntent(),true);
  assert.equal(h.manager.lastNavigation.mapId,'q'); assert.equal(h.manager.lastNavigation.source,'mission');
}

// A semantic mission transition acquires normal primary authority once its persisted route is resolved.
{
  const h=loadHarness({maps:{home:{},q:{}},discovered:new Set(['home','q']),sites:[site('q1','q',4)],routes:{'home->q':['home','q']}});
  h.manager.testTravel=h.travel({knownDestination:{resource:'magnetic_ore'}});
  h.manager.tree={root:{isComplete:false}};
  h.manager.activeMissionIds=['MEM-TEST'];
  h.manager.memory.state.missionLifecycle['MEM-TEST']={status:'active'};
  h.manager.hasRunnablePrimaryMission=()=>false;
  assert.equal(h.manager.hasPrimaryMissionAuthority(),true);
  const before=h.metrics(); h.manager.hasPrimaryMissionAuthority(); const after=h.metrics();
  assert.equal(after.bacCalls,before.bacCalls,'authority checks reuse the persisted semantic decision');
}

// Legacy static map transition remains untouched.
{
  const h=loadHarness({maps:{home:{},legacy:{}},discovered:new Set(['home','legacy']),routes:{'home->legacy':['home','legacy']}});
  h.BF.Missions.definitions['MEM-TEST'].navigation={};
  h.manager.testTravel=h.travel({toMapId:'legacy'});
  const intent=h.manager.ensureMissionTransitionIntent();
  assert.equal(intent.targetMapId,'legacy'); assert.equal(intent.kind,'map-travel'); assert.equal(intent.targetSiteId,null);
}

console.log('PASS GEO-MEM-P2 semantic known destinations + BAC + persistent navigation intent');
