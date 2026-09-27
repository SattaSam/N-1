const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ROOT=path.join(__dirname,'..');
let NOW=1_000_000;
class FakeDate extends Date { static now(){return NOW;} }
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
const store=new Map();
const listeners=new Map();
const window={console,Date:FakeDate,Math,JSON,Set,Map,WeakMap,Promise,CustomEvent:CE,
  performance:{now:()=>NOW},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
  addEventListener(t,fn){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(fn);},
  removeEventListener(t,fn){listeners.get(t)?.delete(fn);},
  dispatchEvent(e){for(const fn of listeners.get(e.type)||[])fn(e);return true;},
  document:{querySelector(){return null;}},
  BlueFox3D:{maps:{},ObjectLibrary:{},PersistentMicroScenes:{},Research:{},RuntimeBudget:{shouldUpdate(){return true;}}}
};
window.window=window;
const ctx=vm.createContext(window);
function run(f){vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});}
run('engine/object-event-registry.js');
run('engine/progression-registry.js');
const BF=window.BlueFox3D;
const defs={
  COMMON:{id:'COMMON',category:'resource',gameplay:{collectable:true},resource:{family:'ore',inventoryKey:'magnetic_ore'},interaction:{respawnSeconds:30},spawn:{tags:['mineral']}},
  RARE:{id:'RARE',category:'resource',gameplay:{collectable:true},resource:{family:'crystal',inventoryKey:'stellar_iridium'},interaction:{respawnSeconds:30},spawn:{tags:['rare','mineral']}},
  UNIQUE:{id:'UNIQUE',category:'resource',gameplay:{collectable:true},resource:{family:'ore',inventoryKey:'mission_relic'},interaction:{respawnSeconds:30},spawn:{tags:['unique','mission','mineral']}}
};
BF.ObjectLibrary.getById=id=>defs[id]||null;
BF.ObjectLibrary.list=()=>Object.values(defs);
BF.maps.crystal={id:'crystal',zones:['A'],palette:{}};
BF.maps.remote={id:'remote',zones:['Plateau 1'],palette:{}};
BF.PersistentMicroScenes.list=def=>def?.id==='remote'?[{contextRole:'deployed_beacon',persistent:true}]:[];
BF.Research.isUnlocked=id=>id==='harvest-drone-blueprint-v1';
BF.Research.canAccessWorkbench=()=>true;
BF.canAccessCampInventory=()=>true;
const siteProgression={crystal:{sites:{base:{kind:'base'},workbench:{kind:'workbench'}}}};
BF.currentEngine={
 currentMapId:'crystal',
 missionManager:{memory:{state:{siteProgression}}},
 character:{root:{position:{x:0,y:0,z:0}}},
 currentMap:{group:{children:[],traverse(){}},interactables:[]},
 callbacks:{onStatus(){}}, clock:{elapsedTime:0}
};
for(const [k,n] of Object.entries({accumulator:10,core:20,parts:100,energy_crystal:30,magnetic_ore:300,stellar_iridium:100})) BF.progression.addInventory(k,n);
// Known resources on remote map come from canonical discovery memory.
BF.progression.state.discoveries.instances={
 c1:{objectId:'COMMON',mapId:'remote',instanceId:'c1'},
 r1:{objectId:'RARE',mapId:'remote',instanceId:'r1'},
 u1:{objectId:'UNIQUE',mapId:'remote',instanceId:'u1'}
};
run('engine/special-object-runtime.js');
const R=BF.SpecialObjectRuntime;
for(let i=0;i<4;i++) assert.equal(R.craftDrone('harvest_drone'),true,`craft ${i+1}`);
assert.equal(R.craftDrone('harvest_drone'),false,'fifth Harvest must be rejected');
assert.equal(R.snapshot().harvestFleet.length,4,'fleet hard-capped at 4');
BF.currentEngine.currentMapId='remote';
const makeRoot=(id,def,x)=>({visible:true,position:{x,y:0,z:0},userData:{functional:def,catalogId:def.id,instanceId:id,libraryType:def.id},traverse(fn){fn(this);}});
const commonRoot=makeRoot('c1',defs.COMMON,2), rareRoot=makeRoot('r1',defs.RARE,4), uniqueRoot=makeRoot('u1',defs.UNIQUE,6);
const hitbox=root=>({userData:{worldAnchor:root}});
BF.currentEngine.currentMap={group:{children:[],traverse(){}},interactables:[hitbox(commonRoot),hitbox(rareRoot),hitbox(uniqueRoot)],zoneRegions:[{index:0,minX:-10,maxX:10,minZ:-10,maxZ:10}]};
for(const d of R.snapshot().harvestFleet) assert.equal(R.deployDrone('harvest_drone',d.id),true,`deploy ${d.id}`);
const first=R.snapshot().harvestFleet[0];
assert.deepEqual(Array.from(R.availablePriorities(first.id)).sort(),['collect_all','magnetic_ore','stellar_iridium'].sort(),'priorities must be known/eligible on deployed map only');
assert.equal(R.setHarvestPriority(first.id,'mission_relic'),false,'mission-locked unique must be excluded');
assert.equal(R.setHarvestPriority(first.id,'stellar_iridium'),true,'rare collectable is allowed');
// Leave remote map: beacon keeps Harvest active remotely.
BF.currentEngine.currentMapId='crystal';
NOW += 90_001;
R.update({children:[],traverse(){}},0);
let snap=R.snapshot();
const after=snap.harvestFleet.find(d=>d.id===first.id);
assert.equal(after.cargo.stellar_iridium,1,'selected rare priority collected remotely');
assert.equal(BF.getProgressionState().inventory.stellar_iridium,76,'remote cargo must not credit bag; only recipe costs changed it');
assert.ok(BF.getProgressionState().history.some(e=>e.type==='RESOURCE_COLLECTED'&&e.detail?.remote===true&&e.detail?.droneId===first.id),'remote harvest remains canonical RESOURCE_COLLECTED');
// No beacon => deployment rejected.
BF.maps.nobeacon={id:'nobeacon',zones:['A']};
BF.currentEngine.currentMapId='nobeacon';
assert.equal(R.deployDrone('harvest_drone',first.id),false,'Harvest deploy requires player beacon');
console.log('PASS R3 Harvest network max4/beacon/priorities/rare/remote');
