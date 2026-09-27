const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const ROOT=process.env.TARGET_ROOT||path.join(__dirname,'..');
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
const store=new Map(),listeners=new Map();
const window={console,Math,JSON,Set,Map,WeakMap,Date,performance:{now:()=>1000},CustomEvent:CE,
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 addEventListener(t,f){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(f)},removeEventListener(){},
 dispatchEvent(e){for(const f of listeners.get(e.type)||[])f(e);return true},BlueFox3D:{}};window.window=window;
const ctx=vm.createContext(window),BF=window.BlueFox3D,load=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
load('engine/object-event-registry.js');load('engine/progression-multisystem.js');
const A={TRAVEL:'travel',COLLECT:'collect',EXTRACT:'extract',INSPECT:'inspect',ANALYZE:'analyze',OBSERVE:'observe',RESEARCH:'research',CRAFT:'craft',BUILD:'build',EXPLORE_ZONE:'explore-zone',REST:'rest',EAT:'eat'};
BF.Missions={definitions:{MEM:{id:'MEM',priority:50,navigation:{autonomousKnownDestination:true}}},ActionType:A,MissionStatus:{AVAILABLE:'available',ACTIVE:'active'},normalizeActionType:x=>x,getDefinition(id){return this.definitions[id]||null}};
load('engine/mission-manager.js');
function obj(mapId,anchor,index){const ir={userData:{microSceneId:'MSC-CARRIERE',microSceneInstance:true},position:{x:anchor.x,y:0,z:anchor.z},parent:null};const pivot={userData:{microSceneId:'MSC-CARRIERE',microSceneObjectIndex:index,microScenePivot:true},parent:ir};const root={userData:{catalogId:'magnetic_ore',instanceId:`${mapId}-${index}`,functional:{id:'magnetic_ore',resource:{inventoryKey:'magnetic_ore',family:'ore'},knowledge:{family:'mineral'}},microSceneId:'MSC-CARRIERE',microScenePivot:pivot},parent:pivot};return {userData:{worldAnchor:root},parent:root};}
BF.currentEngine={currentMapId:'near',currentMap:{group:{userData:{microScenes:[]}}}};
BF.ObjectEvents.emit(BF.ObjectEvents.types.OBJECT_SEEN,obj('near',{x:2,z:2},0),{mapId:'near'});
for(let i=0;i<6;i++){BF.currentEngine.currentMapId='quarry';BF.ObjectEvents.emit(BF.ObjectEvents.types.OBJECT_SEEN,obj('quarry',{x:12,z:-4},i),{mapId:'quarry',interactionSource:i===0?'drone':'bluefox'});}
assert.equal(BF.getKnownSites({resource:'magnetic_ore'})[0].knownInstanceCount,6);
BF.maps={home:{},near:{},quarry:{}};BF.discoveredMaps=new Set(['home','near','quarry']);BF.BAC={weightedPick:o=>[...o].sort((a,b)=>b.baseWeight-a.baseWeight)[0]};
const facts=new Map(),M=BF.Missions.MissionManager,m=Object.create(M.prototype);m.engine={currentMapId:'home',discoveredMaps:BF.discoveredMaps,findOptimalRoute:(a,b)=>b==='near'?['home','near']:b==='quarry'?['home','a','b','quarry']:null,findKnownRoute:()=>null};m.memory={getFact:(k,d=null)=>facts.has(k)?facts.get(k):d,setFact:(k,v)=>facts.set(k,v),save(){},state:{missionLifecycle:{}}};m.bridge={context:()=>({mapId:'home'}),isEngineBusy:()=>false};m.primaryMissionId='MEM';m.activeMissionIds=[];m.trees=new Map();m.planner={nextAction:()=>null};
const travel={missionId:'MEM',mission:BF.Missions.definitions.MEM,node:{id:'MEM:travel',type:'travel',params:{eventDriven:true,knownDestination:{resource:'magnetic_ore'}}}};m.primaryMissionTransition=()=>travel;
const picked=m.resolveKnownDestination(travel);assert.equal(picked.mapId,'quarry');assert.equal(picked.siteId,BF.getKnownSites({resource:'magnetic_ore'})[0].siteId);assert.equal(picked.anchor.x,12);assert.equal(picked.anchor.z,-4);
console.log('PASS GEO-MEM P1->P2 real knownSites propagation into BAC destination choice');
