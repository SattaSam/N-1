const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('node:assert/strict');

const ROOT=process.env.TARGET_ROOT || path.join(__dirname,'..');
class CE { constructor(type,init={}){this.type=type;this.detail=init.detail;} }

function makeNode(id,params={}){
  return {
    id,type:'travel',params:{eventDriven:true,...params},progress:0,target:1,status:'available',
    historyValues:[],
    get isComplete(){return this.progress>=this.target;},
    increment(n=1){const before=this.progress;this.progress=Math.min(this.target,this.progress+n);return this.progress!==before;},
    incrementDistinct(_id,n=1){return this.increment(n);},
    pushHistoryValue(v){this.historyValues.push(v);}
  };
}
function makeTree(id,node){
  return {
    id,title:id,description:id,
    root:{get isComplete(){return node.isComplete;},walk(cb){cb(node);}},
    find(k){return k===node.id?node:null;},
    availableLeaves(){return node.isComplete?[]:[node];},
    refresh(){},toJSON(){return {id,root:{children:[]}}}
  };
}

function harness({current='home',sites=[],routes={}}={}){
  const listeners=new Map();
  const facts=new Map();
  const window={
    console,Date,Math,JSON,Set,Map,CustomEvent:CE,performance:{now:()=>1000},
    localStorage:{getItem(){return null},setItem(){}},
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
    removeEventListener(){},dispatchEvent(){return true;},BlueFox3D:{}
  };
  window.window=window;
  const BF=window.BlueFox3D;
  BF.maps={home:{},quarry:{},forest:{}};
  BF.getKnownSites=(criteria={})=>sites.filter(site=>{
    if(criteria.siteId&&site.siteId!==criteria.siteId)return false;
    if(criteria.resource&&!site.resources?.[criteria.resource])return false;
    if(criteria.family&&!site.families?.[criteria.family])return false;
    if(criteria.microSceneId&&site.microSceneId!==criteria.microSceneId)return false;
    return true;
  }).map(x=>JSON.parse(JSON.stringify(x)));
  BF.getMapExplorationState=()=>({surfacePercent:50});
  BF.getAutonomyMode=()=> 'full';
  BF.BAC={weightedPick(options){return [...options].sort((a,b)=>b.baseWeight-a.baseWeight)[0]||null;}};
  BF.Missions={
    definitions:{},
    ActionType:{TRAVEL:'travel',COLLECT:'collect',EXTRACT:'extract',INSPECT:'inspect',ANALYZE:'analyze',OBSERVE:'observe',RESEARCH:'research',CRAFT:'craft',BUILD:'build',EXPLORE_ZONE:'explore-zone',REST:'rest',EAT:'eat'},
    MissionStatus:{AVAILABLE:'available',ACTIVE:'active',COMPLETED:'completed',FAILED:'failed'},
    normalizeActionType:x=>String(x||'').toLowerCase(),
    getDefinition(id){return this.definitions[id]||null;}
  };
  const ctx=vm.createContext({window,CustomEvent:CE,console,Date,Math,JSON,Set,Map,performance:window.performance});
  vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/mission-manager.js'),'utf8'),ctx,{filename:'mission-manager.js'});
  vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/travel-cycle-bridge.js'),'utf8'),ctx,{filename:'travel-cycle-bridge.js'});

  const Manager=BF.Missions.MissionManager;
  const manager=Object.create(Manager.prototype);
  const node=makeNode('MEM:travel',{knownDestination:{resource:'magnetic_ore'}});
  const tree=makeTree('MEM',node);
  let syncCalls=0;
  manager.engine={
    currentMapId:current,discoveredMaps:new Set(['home','quarry','forest']),
    findOptimalRoute(from,to){return routes[`${from}->${to}`]||null;},
    findKnownRoute(from,to){return routes[`${from}->${to}`]||null;},
    transitioning:false,pendingGate:false,pendingInteraction:false,currentRoutine:null,
    handleNavigationSuggestion(){return true;}
  };
  manager.memory={
    state:{missionLifecycle:{MEM:{status:'active',autoPrimaryEligible:true,narrativePriority:0,urgency:0}},pendingActivations:{}},
    getFact(k,d=null){return facts.has(k)?facts.get(k):d;},setFact(k,v){facts.set(k,v);return v;},save(){},saveTree(){},remember(){}
  };
  manager.bridge={context:()=>({mapId:manager.engine.currentMapId,energy:80,needs:{}}),isEngineBusy:()=>false};
  manager.planner={nextAction:()=>null};
  manager.activeMissionIds=['MEM'];manager.trees=new Map([['MEM',tree]]);manager.primaryMissionId='MEM';manager.tree=tree;manager.currentAction=null;
  manager.reevaluatePendingActivations=()=>false;manager.catalogController=null;manager.publish=()=>{};
  manager.syncLifecycleFromTrees=()=>{syncCalls+=1;return true;};
  BF.Missions.definitions.MEM={id:'MEM',priority:50,navigation:{autonomousKnownDestination:true},sequence:[{slot:'travel',action:'travel',params:node.params}]};
  manager.testTravel={missionId:'MEM',mission:BF.Missions.definitions.MEM,source:'explicit-travel',node};
  manager.primaryMissionTransition=()=>manager.testTravel;
  BF.currentEngine={currentMapId:current,missionManager:manager};
  return {BF,manager,node,tree,facts,syncCalls:()=>syncCalls};
}

// Wrong-map transition must not validate a semantic destination resolved to quarry.
{
  const h=harness({
    sites:[{siteId:'quarry-rich',mapId:'quarry',microSceneId:'MSC-CARRIERE',anchor:{x:4,y:0,z:8},knownInstanceCount:6,resources:{magnetic_ore:{distinctInstances:6}},families:{mineral:{distinctInstances:6}}}],
    routes:{'home->quarry':['home','quarry'],'home->forest':['home','forest']}
  });
  const intent=h.manager.ensureMissionTransitionIntent();
  assert.equal(intent.targetMapId,'quarry');
  assert.equal(h.node.params.toMapId,'quarry','resolved semantic target must constrain the real TRAVEL node');
  const changedWrong=h.BF.progressTravelCycleMissions({fromMapId:'home',toMapId:'forest',mapId:'forest',source:'gate'});
  assert.equal(changedWrong,0,'wrong transition must not progress semantic TRAVEL');
  assert.equal(h.node.progress,0);
  const changedRight=h.BF.progressTravelCycleMissions({fromMapId:'home',toMapId:'quarry',mapId:'quarry',source:'gate'});
  assert.ok(changedRight>0,'arrival on resolved target must progress TRAVEL');
  assert.equal(h.node.isComplete,true);
}

// A semantic destination already on the current map is satisfied through the canonical Travel bridge, without a map transition.
{
  const h=harness({
    sites:[{siteId:'local-rich',mapId:'home',microSceneId:'MSC-CARRIERE',anchor:{x:1,y:0,z:2},knownInstanceCount:5,resources:{magnetic_ore:{distinctInstances:5}},families:{mineral:{distinctInstances:5}}}],
    routes:{}
  });
  const intent=h.manager.ensureMissionTransitionIntent();
  assert.equal(intent.satisfiedLocally,true);
  assert.equal(intent.active,false);
  assert.equal(h.node.params.toMapId,'home');
  assert.equal(h.node.isComplete,true,'local semantic TRAVEL must complete immediately');
  assert.ok(h.syncCalls()>0,'local completion must trigger mission lifecycle synchronization');
}

// If MissionManager resolves a local semantic destination before TravelCycleBridge is available, the cached decision completes on the next evaluation once the bridge exists.
{
  const h=harness({
    sites:[{siteId:'local-late-bridge',mapId:'home',microSceneId:'MSC-CARRIERE',anchor:{x:3,y:0,z:4},knownInstanceCount:4,resources:{magnetic_ore:{distinctInstances:4}},families:{mineral:{distinctInstances:4}}}],
    routes:{}
  });
  const helper=h.BF.progressSpecificTravelMissionNode;
  delete h.BF.progressSpecificTravelMissionNode;
  const first=h.manager.ensureMissionTransitionIntent();
  assert.equal(first.satisfiedLocally,true);
  assert.equal(h.node.isComplete,false,'without the bridge owner loaded, MissionManager must not bypass TRAVEL progression');
  h.BF.progressSpecificTravelMissionNode=helper;
  const second=h.manager.ensureMissionTransitionIntent();
  assert.equal(second.satisfiedLocally,true);
  assert.equal(h.node.isComplete,true,'cached local intent must complete when the canonical Travel bridge becomes available');
}

console.log('PASS GEO-MEM-P2 R2 TravelCycleBridge semantic target propagation + local satisfaction');
