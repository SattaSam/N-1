const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const ROOT=path.join(__dirname,'..');let NOW=10_000_000;
class FakeDate extends Date{static now(){return NOW;}}class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
const store=new Map(),listeners=new Map();
store.set('bluefox_special_objects_v1',JSON.stringify({version:1,lastRuntimeAt:NOW,drones:{scout_drone:{crafted:true,active:true,inKit:false,deployedMapId:'remote',lastActionAt:NOW-120001,scannedZones:{remote:{}},remoteManifest:[{objectId:'A',instanceId:'known-1',zoneId:0,type:'plant'},{objectId:'B',instanceId:'new-1',zoneId:0,type:'rock'}]}},harvestFleet:[],resources:{}}));
const window={console,Date:FakeDate,Math,JSON,Set,Map,WeakMap,Promise,CustomEvent:CE,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},document:{querySelector(){return null;}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},addEventListener(t,f){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(f)},removeEventListener(){},dispatchEvent(e){for(const f of listeners.get(e.type)||[])f(e);return true},BlueFox3D:{}};window.window=window;const ctx=vm.createContext(window);const BF=window.BlueFox3D;const run=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
const defs={A:{id:'A',knowledge:{discoverable:true}},B:{id:'B',knowledge:{discoverable:true}}};BF.ObjectLibrary={getById:id=>defs[id]||null,list:()=>Object.values(defs)};BF.maps={remote:{id:'remote',persistentMicroScenes:[{kind:'deployed_beacon',contextRole:'deployed_beacon',persistent:true}]},home:{id:'home'}};BF.PersistentMicroScenes={list:d=>d?.persistentMicroScenes||[]};BF.RuntimeBudget={shouldUpdate(){return true}};BF.currentEngine={currentMapId:'home',currentMap:{group:{children:[],traverse(){}},interactables:[],zoneRegions:[]},callbacks:{onStatus(){}}};
run('engine/object-event-registry.js');run('engine/progression-registry.js');
BF.progression.state.discoveries.instances['known-1']={objectId:'A',instanceId:'known-1',mapId:'remote'};
let seen=[];BF.ObjectEvents.subscribe(e=>{if(e.type===BF.ObjectEvents.types.OBJECT_SEEN)seen.push(e)});
run('engine/special-object-runtime.js');BF.SpecialObjectRuntime.update(BF.currentEngine.currentMap.group,0);
assert.equal(seen.length,1,'remote Scout emits only unseen instance');assert.equal(seen[0].instanceId,'new-1');assert.equal(seen[0].detail.remote,true);assert.equal(seen[0].detail.interactionSource,'drone');
// Without a player-deployed beacon, no additional remote scan is allowed.
BF.maps.remote.persistentMicroScenes=[];NOW+=120001;BF.SpecialObjectRuntime.update(BF.currentEngine.currentMap.group,0);assert.equal(seen.length,1,'remote Scout requires BlueFox beacon');
console.log('PASS R3 remote Scout beacon + no duplicate observations');
