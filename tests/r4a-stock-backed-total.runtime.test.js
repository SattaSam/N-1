const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const ROOT=path.join(__dirname,'..');
class CE{constructor(t,i={}){this.type=t;this.detail=i.detail;}}
const store=new Map(); const window={console,Date,Math,JSON,Set,Map,WeakMap,CustomEvent:CE,
 localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 addEventListener(){},removeEventListener(){},dispatchEvent(){return true},BlueFox3D:{}}; window.window=window;
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/progression-registry.js'),'utf8'),vm.createContext(window));
const BF=window.BlueFox3D;
BF.grantInventory('fiber',300); BF.allocateInventoryToExpedition('fiber',120); BF.grantCampStorage('fiber',200);
assert.equal(BF.availableInventory('fiber'),500,'stock-backed mission sees carried + protected Kit + camp stock');
const runtime=fs.readFileSync(path.join(ROOT,'engine/bible-runtime-v0-1-unified.js'),'utf8');
assert(runtime.includes('BF.progression?.availableInventory?.(inventoryKeys)'), 'stock-backed runtime still consumes canonical total-stock availability');
const catalog=fs.readFileSync(path.join(ROOT,'data/bible-catalog.js'),'utf8');
const base=catalog.slice(catalog.indexOf('const base = Object.freeze({'),catalog.indexOf('const nouvelleFondation'));
assert(base.includes('stockBackedSlots: Object.freeze([')); assert(base.includes('inventoryKey: "fiber"')); assert(base.includes('maximum: 500'));
console.log('PASS R4-A GAME-base stock-backed keeps total-stock semantics including Kit allocation');
