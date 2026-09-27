const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ROOT=path.join(__dirname,'..');
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
function boot(savedSpecial, now=2_000_000){
  let NOW=now;
  class FakeDate extends Date { static now(){return NOW;} }
  const store=new Map([['bluefox_special_objects_v1',JSON.stringify(savedSpecial)]]), listeners=new Map();
  const window={console,Date:FakeDate,Math,JSON,Set,Map,WeakMap,Promise,CustomEvent:CE,performance:{now:()=>NOW},
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    addEventListener(t,fn){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(fn);},removeEventListener(){},dispatchEvent(e){for(const fn of listeners.get(e.type)||[])fn(e);return true;},document:{querySelector(){return null;}},
    BlueFox3D:{maps:{remote:{id:'remote',zones:['P1']}},ObjectLibrary:{},PersistentMicroScenes:{},Research:{},RuntimeBudget:{shouldUpdate(){return true;}}}};
  window.window=window; const ctx=vm.createContext(window);
  const run=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
  run('engine/object-event-registry.js'); run('engine/progression-registry.js');
  const BF=window.BlueFox3D;
  const defs={
    RARE:{id:'RARE',gameplay:{collectable:true},resource:{family:'crystal',inventoryKey:'stellar_iridium'},interaction:{respawnSeconds:300},spawn:{tags:['rare']}},
    COMMON:{id:'COMMON',gameplay:{collectable:true},resource:{family:'ore',inventoryKey:'magnetic_ore'},interaction:{respawnSeconds:30},spawn:{tags:['mineral']}}
  };
  BF.ObjectLibrary.getById=id=>defs[id]||null; BF.ObjectLibrary.list=()=>Object.values(defs);
  BF.PersistentMicroScenes.list=def=>def?.id==='remote'?[{contextRole:'deployed_beacon',persistent:true}]:[];
  BF.currentEngine={currentMapId:'crystal',currentMap:{group:{children:[],traverse(){}},interactables:[]},character:{root:{position:{x:0,y:0,z:0}}},callbacks:{onStatus(){}}};
  run('engine/special-object-runtime.js');
  return {BF,R:BF.SpecialObjectRuntime,store,setNow:v=>{NOW=v;}};
}
function saved({cargo={},lastRuntimeAt=1_640_000,lastActionAt=1_640_000}={}){
  return {version:1,drones:{harvest_drone:{crafted:true,count:1,active:true}},harvestFleet:[{
    id:'harvest-1',crafted:true,active:true,inKit:false,deployedMapId:'remote',priority:'stellar_iridium',cargo,cargoTotal:Object.values(cargo).reduce((a,b)=>a+b,0),lastActionAt,
    remoteManifest:[{objectId:'RARE',instanceId:'r1',zoneId:0},{objectId:'COMMON',instanceId:'c1',zoneId:0}]
  }],resources:{},lastRuntimeAt};
}
// 360 s offline -> 2 reduced actions. Rare respawn is 300 s, so fallback must take common for the second action.
{
  const {BF,R}=boot(saved());
  R.update({children:[],traverse(){}},0);
  const d=R.snapshot().harvestFleet[0];
  assert.equal(d.cargo.stellar_iridium,1,'priority resource harvested first');
  assert.equal(d.cargo.magnetic_ore,1,'fallback resource harvested while priority is unavailable');
  assert.equal(d.cargoTotal,2,'offline reduced aggregate must produce two actions over 360 s');
  assert.equal(BF.getProgressionState().inventory.stellar_iridium||0,0);
  assert.equal(BF.getProgressionState().inventory.magnetic_ore||0,0);
  assert.equal(BF.getProgressionState().history.filter(e=>e.type==='RESOURCE_COLLECTED').reduce((n,e)=>n+e.quantity,0),2,'history receives exact aggregate once');
}
// Cargo 149 + first offline action => logical 150 deposit to camp; second action remains in cargo.
{
  const {BF,R}=boot(saved({cargo:{stellar_iridium:149}}));
  R.update({children:[],traverse(){}},0);
  const d=R.snapshot().harvestFleet[0];
  const p=BF.getProgressionState();
  assert.equal(p.campStorage.stellar_iridium,150,'full cargo is deposited directly to camp/base stock');
  assert.equal(d.cargoTotal,1,'second offline action starts the next cargo');
  assert.equal(d.cargo.magnetic_ore,1,'fallback resumes after the logical deposit');
  assert.ok(p.history.some(e=>e.type==='DRONE_CARGO_DEPOSITED'&&e.quantity===150),'cargo deposit emits canonical drone deposit event');
  assert.equal(p.history.filter(e=>e.type==='RESOURCE_COLLECTED').reduce((n,e)=>n+e.quantity,0),2,'deposit does not duplicate collection history');
}
console.log('PASS R3 offline aggregate/fallback/cargo150');
