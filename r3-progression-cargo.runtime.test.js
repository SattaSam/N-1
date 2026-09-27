const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ROOT=path.join(__dirname,'..');
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
const store=new Map();
const window={console,Date,Math,JSON,Set,Map,WeakMap,CustomEvent:CE,
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
  addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},BlueFox3D:{}};
window.window=window;
const ctx=vm.createContext(window);
for(const f of ['engine/object-event-registry.js','engine/progression-registry.js']) vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
const BF=window.BlueFox3D;
const resourceDef={id:'TEST-ORE',category:'resource',resource:{family:'ore',inventoryKey:'magnetic_ore'},progression:{mapExpertise:0},spawn:{tags:['mineral','rare']}};
const source={userData:{catalogId:'TEST-ORE',instanceId:'ore-1',functional:resourceDef}};
BF.ObjectEvents.emit(BF.ObjectEvents.types.RESOURCE_COLLECTED,source,{mapId:'remote-map',inventoryKey:'magnetic_ore',quantity:7,inventoryCredit:false,interactionSource:'drone',remote:true});
let s=BF.getProgressionState();
assert.equal(s.inventory.magnetic_ore||0,0,'cargo collect must not credit personal inventory');
assert.equal(s.history.length,1,'canonical collection must remain in progression history');
assert.ok(Object.values(s.counters.global||{}).some(v=>Number(v)>=7),'canonical counters must record cargo collection');
const historyBefore=s.history.length;
assert.equal(BF.grantCampStorage('magnetic_ore',7,{source:'drone-cargo',mapId:'remote-map',droneId:'harvest-1'}),7);
s=BF.getProgressionState();
assert.equal(s.campStorage.magnetic_ore,7,'deposit credits camp storage directly');
assert.equal(s.deposited.magnetic_ore,7,'deposit accounting is preserved');
assert.equal(s.inventory.magnetic_ore||0,0,'deposit does not bounce through bag');
assert.equal(s.history.length,historyBefore,'deposit must not create a second collection history event');
console.log('PASS R3 cargo progression / no double credit');
