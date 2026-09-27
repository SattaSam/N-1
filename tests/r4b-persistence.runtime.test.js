const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const ROOT=path.join(__dirname,'..');
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
const store=new Map();
const initialSpecial={version:1,drones:{scout_drone:{crafted:true,active:false,inKit:false,deployedMapId:'remote',deployedAnchor:{x:1,y:0,z:2},deployedZoneId:0,deployedZoneLabel:'P1',workTotal:500,failureCount:1,failure:{id:'scout_drone:failure-1',index:1,failedAt:100,mapId:'remote',zoneId:0,zoneLabel:'P1',anchor:{x:1,y:0,z:2},instanceId:'remote:scout_drone:scout_drone',requirements:{accumulator:1}}}},harvestFleet:[],resources:{},lastRuntimeAt:100};
store.set('bluefox_special_objects_v1',JSON.stringify(initialSpecial));
function boot(){
  const listeners=new Map();
  const window={console,Date,Math,JSON,Set,Map,WeakMap,Promise,CustomEvent:CE,performance:{now:()=>1000},
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    addEventListener(t,f){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(f)},removeEventListener(){},dispatchEvent(e){for(const f of listeners.get(e.type)||[])f(e);return true},
    document:{querySelector(){return null}},BlueFox3D:{maps:{remote:{id:'remote',zones:['P1']}},ObjectLibrary:{list:()=>[]},PersistentMicroScenes:{list:()=>[]},Research:{},RuntimeBudget:{shouldUpdate(){return true}}}};
  window.window=window; const ctx=vm.createContext(window); const run=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
  run('engine/object-event-registry.js'); run('engine/progression-registry.js');
  const BF=window.BlueFox3D; BF.currentEngine={currentMapId:'remote',currentMap:{group:{children:[],traverse(){}},interactables:[]},character:{root:{position:{x:1,y:0,z:2}}},callbacks:{onStatus(){}}};
  run('engine/special-object-runtime.js'); return {window,BF};
}
let a=boot(); let snap=a.BF.SpecialObjectRuntime.snapshot(); assert.equal(snap.drones.scout_drone.failure?.id,'scout_drone:failure-1','failure survives load'); assert.equal(snap.drones.scout_drone.active,false);
a.BF.grantInventory('accumulator',1); assert.equal(a.BF.SpecialObjectRuntime.repairDrone('scout_drone'),true); snap=a.BF.SpecialObjectRuntime.snapshot(); assert.equal(snap.drones.scout_drone.failure,null); assert.equal(snap.drones.scout_drone.active,true); assert.equal(snap.drones.scout_drone.failureCount,1);
const persisted=JSON.parse(store.get('bluefox_special_objects_v1')); assert.equal(persisted.drones.scout_drone.failure,null,'repair persisted'); assert.equal(persisted.drones.scout_drone.active,true);
let b=boot(); snap=b.BF.SpecialObjectRuntime.snapshot(); assert.equal(snap.drones.scout_drone.failure,null,'repair remains after reload'); assert.equal(snap.drones.scout_drone.active,true); assert.equal(snap.drones.scout_drone.failureCount,1,'lifetime failure count persists');
console.log('PASS R4-B failure and repair persistence survive reload');
