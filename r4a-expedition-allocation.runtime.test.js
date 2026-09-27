const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const ROOT=path.join(__dirname,'..'); class CE{constructor(t,i={}){this.type=t;this.detail=i.detail;}}
const store=new Map(),listeners=new Map(); const window={console,Date,Math,JSON,Set,Map,WeakMap,CustomEvent:CE,
 localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 addEventListener(t,f){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(f)},removeEventListener(){},dispatchEvent(e){for(const f of listeners.get(e.type)||[])f(e);return true},BlueFox3D:{}}; window.window=window;
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/progression-registry.js'),'utf8'),vm.createContext(window)); const BF=window.BlueFox3D;
BF.grantInventory('parts',20); BF.allocateInventoryToExpedition('parts',7); BF.grantCampStorage('parts',10);
assert.equal(BF.availableInventory('parts'),30,'mission/stock availability remains total inventory + campStorage');
assert.equal(BF.getExpeditionQuantity('parts'),7); assert.equal(BF.getUnallocatedInventoryQuantity('parts'),13);
assert.equal(BF.depositAllInventory(),13,'only unprotected carried stock auto-deposits');
let s=BF.getProgressionState(); assert.equal(s.inventory.parts,7); assert.equal(s.expeditionAllocation.parts,7); assert.equal(s.campStorage.parts,23);
assert.equal(BF.availableInventory('parts'),30,'Kit allocation never removes stock from mission accounting');
assert.equal(BF.consumeInventory('parts',5),5,'normal carried consumption may use protected carried stock');
s=BF.getProgressionState(); assert.equal(s.inventory.parts,2); assert.equal(s.expeditionAllocation.parts,2,'allocation clamps to physical remainder');
BF.getInventoryCapacityState=()=>({count:198,capacity:200}); assert.equal(BF.transferCampToExpedition('parts',10),2,'Camp→Kit respects carrying capacity');
s=BF.getProgressionState(); assert.equal(s.inventory.parts,4); assert.equal(s.expeditionAllocation.parts,4);
assert.equal(BF.transferExpeditionToCamp('parts',3),3); s=BF.getProgressionState(); assert.equal(s.inventory.parts,1); assert.equal(s.expeditionAllocation.parts,1);
BF.grantInventory('accumulator',1); assert.equal(BF.getExpeditionQuantity('accumulator'),1,'accumulator keeps historical automatic Kit placement');
BF.grantInventory('deployed_beacon',1); assert.equal(BF.depositAllInventory(),0,'protected/locked carried items survive automatic deposit');
console.log('PASS R4-A Kit is deposit protection only; total stock semantics preserved');
