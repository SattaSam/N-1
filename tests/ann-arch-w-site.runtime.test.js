const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const ROOT=process.env.TARGET_ROOT||path.join(__dirname,'..');
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
const listeners=new Map();
const window={console,Date,Math,JSON,Set,Map,WeakMap,CustomEvent:CE,performance:{now:()=>1000},addEventListener(t,f){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(f)},removeEventListener(){},dispatchEvent(){return true},BlueFox3D:{}};window.window=window;
const BF=window.BlueFox3D;
class MM{}
class AB{constructor(engine){this.engine=engine;}isEngineBusy(){return false;}execute(){return false;}}
BF.Missions={MissionManager:MM,ActionBridge:AB,ActionType:{OBSERVE:'observe',INSPECT:'inspect',ANALYZE:'analyze',COLLECT:'collect',EXTRACT:'extract',EXPLORE_ZONE:'explore-zone',RESEARCH:'research'},normalizeActionType:x=>x};
const defs={
 wall:{id:'CON-WALL-L-001',type:'wall',label:'Mur',category:'constructions',interaction:{actions:['inspect']},gameplay:{inspectable:true}},
 debris:{id:'RUI-DEBR-S-001',type:'debris',label:'Débris',category:'ruins',interaction:{actions:[]},gameplay:{interactive:false,inspectable:false}}
};
BF.ObjectLibrary={getById:id=>Object.values(defs).find(d=>d.id===id)||null,get:t=>defs[t]||null};
BF.mount=async({engine})=>engine;
const ctx=vm.createContext({window,console,CustomEvent:CE,performance:window.performance,Date,Math,JSON,Set,Map,WeakMap});
for(const f of ['engine/object-event-registry.js','engine/object-m0-bridge.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
const facts=new Map();let processed=new Set();
const memory={getFact:(k,d=null)=>facts.has(k)?facts.get(k):d,setFact:(k,v)=>{facts.set(k,v);return v},save(){},saveTree(){},remember(){},hasProcessedObjectEvent:id=>processed.has(id),markProcessedObjectEvent:id=>processed.add(id)};
const makeNode=(id,params)=>({id,type:'observe',params,progress:0,target:1,isComplete:false,historyValues:[],increment(){this.progress++;this.isComplete=this.progress>=this.target;return true},incrementDistinct(){return this.increment()},pushHistoryValue(){return true},hasDistinctValue(){return false}});
const siteNode=makeNode('ANN-ARCH-W02:wall',{cuoType:'wall',microSceneId:'MSC-CUSTOM-WALL-RUIN-COLLAPSED',completionSiteFact:'annArchW02:site'});
const tree={id:'ANN-ARCH-W02',availableLeaves:()=>siteNode.isComplete?[]:[siteNode],refresh(){},root:{walk(){}}};
const manager=new MM();Object.assign(manager,{memory,trees:new Map([[tree.id,tree]]),tree,currentAction:null,ensureLifecycle:()=>({status:'active'}),syncLifecycleFromTrees(){},reevaluatePendingActivations(){},catalogController:{schedule(){}},publish(){}});
const source={userData:{functional:defs.wall,catalogId:defs.wall.id,libraryType:'wall',instanceId:'wall-a',microSceneId:'MSC-CUSTOM-WALL-RUIN-COLLAPSED',persistentMicroSceneId:'ruin-X',active:true},position:{x:0,y:0,z:0}};source.userData.worldAnchor=source;
BF.currentEngine={currentMapId:'ruin-map',missionManager:manager,currentMap:{group:{userData:{microScenes:[]}}}};
const ev=BF.ObjectEvents.emit(BF.ObjectEvents.types.PHENOMENON_OBSERVED,source,{mapId:'ruin-map',cuoType:'wall',interactionSource:'mission'});manager.consumeObjectEvent(ev);
const remembered=facts.get('annArchW02:site');assert(remembered);assert.equal(remembered.siteId,'persistent:ruin-X');assert.equal(remembered.mapId,'ruin-map');assert.equal(remembered.microSceneId,'MSC-CUSTOM-WALL-RUIN-COLLAPSED');
// Event-side SAME-SITE: identical definition on another instance must not validate.
const re=makeNode('ANN-ARCH-W04:reexamine',{cuoType:'wall',microSceneId:'MSC-CUSTOM-WALL-RUIN-COLLAPSED',requiredSiteFact:'annArchW02:site'});const tree4={id:'ANN-ARCH-W04',find:id=>id===re.id?re:null,availableLeaves:()=>re.isComplete?[]:[re],refresh(){},root:{walk(){}}};manager.trees=new Map([[tree4.id,tree4]]);processed=new Set();
const other={userData:{functional:defs.wall,catalogId:defs.wall.id,libraryType:'wall',instanceId:'wall-b',microSceneId:'MSC-CUSTOM-WALL-RUIN-COLLAPSED',persistentMicroSceneId:'ruin-Y',active:true},position:{x:1,y:0,z:0}};other.userData.worldAnchor=other;
manager.consumeObjectEvent(BF.ObjectEvents.emit(BF.ObjectEvents.types.PHENOMENON_OBSERVED,other,{mapId:'ruin-map',cuoType:'wall',interactionSource:'mission'}));assert.equal(re.progress,0,'une autre instance COLLAPSED ne doit pas créditer W04');
manager.consumeObjectEvent(BF.ObjectEvents.emit(BF.ObjectEvents.types.PHENOMENON_OBSERVED,source,{mapId:'ruin-map',cuoType:'wall',interactionSource:'mission'}));assert.equal(re.progress,1,'le site exact W02 doit créditer W04');
// Candidate-side SAME-SITE: ObjectM0 must select the exact persisted instance before interaction.
re.progress=0;re.isComplete=false;manager.trees=new Map([[tree4.id,tree4]]);manager.currentAction=null;
function p(x){return {x,y:0,z:0,distanceTo(o){return Math.abs(x-Number(o?.x||0))}}}
other.position=p(1);source.position=p(4);BF.currentEngine={currentMapId:'ruin-map',missionManager:manager,currentMap:{interactables:[other,source],group:{userData:{microScenes:[]}}},character:{root:{position:p(0)}},interactionWorldPosition:o=>o.position,targetInteraction(o){this.picked=o;return true},callbacks:{onAction(){}}};
const bridge=new BF.Missions.ActionBridge(BF.currentEngine);assert.equal(bridge.execute({missionId:'ANN-ARCH-W04',nodeId:re.id,type:'analyze',params:re.params},1000),true);assert.equal(BF.currentEngine.picked,source,'le sélecteur doit ignorer l’instance identique mais non mémorisée');
// Passive MSC component: debris stays absent from manual interactables but is selectable for an explicit mission objective.
const debrisRoot={userData:{functional:defs.debris,catalogId:defs.debris.id,libraryType:'debris',instanceId:'debris-1',microSceneId:'MSC-CUSTOM-WALL-RUIN-STRAIGHT'},position:p(2)};
const debrisNode=makeNode('ANN-ARCH-W01:debris',{cuoType:'debris',microSceneId:'MSC-CUSTOM-WALL-RUIN-STRAIGHT',allowPassiveMSCObject:true});const debrisTree={id:'ANN-ARCH-W01',find:id=>id===debrisNode.id?debrisNode:null,availableLeaves:()=>[debrisNode],root:{walk(){}}};manager.trees=new Map([[debrisTree.id,debrisTree]]);facts.clear();
BF.currentEngine.currentMap={interactables:[],group:{userData:{microScenes:[{id:'MSC-CUSTOM-WALL-RUIN-STRAIGHT',records:[{root:debrisRoot,definition:defs.debris}]}]}}};BF.currentEngine.picked=null;
assert.equal(bridge.execute({missionId:'ANN-ARCH-W01',nodeId:debrisNode.id,type:'observe',params:debrisNode.params},1000),true);assert.equal(BF.currentEngine.picked,debrisRoot);assert.equal(debrisRoot.userData.missionPassiveStudy,true);assert.equal(debrisRoot.userData.requestedInteraction,'observe');
console.log('PASS ANN-ARCH-W exact site memory + SAME-INSTANCE + passive MSC study');
