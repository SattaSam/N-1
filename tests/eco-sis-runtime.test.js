const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
function loadScript(p, ctx, stripStart = false) {
  let src = fs.readFileSync(p, 'utf8');
  if (stripStart) src = src.replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/, '\n})(window);');
  vm.runInContext(src, ctx, { filename: p });
}

const storage = new Map(), listeners = new Map();
class CE { constructor(type, init={}) { this.type=type; this.detail=init.detail; } }
const window = {
  console, Date, Math, JSON, Set, Map, WeakMap, Promise,
  performance:{now:()=>1000}, queueMicrotask:fn=>fn(),
  setTimeout:fn=>{fn();return 1;}, clearTimeout(){}, setInterval:()=>1, clearInterval(){}, CustomEvent:CE,
  localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
  removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
  dispatchEvent(event){for(const fn of listeners.get(event.type)||[]) fn(event);return true;},
  BlueFox3D:{Missions:{},BiblePatterns:{},ObjectEvents:{types:{}}}
};
window.window=window;
const ctx=vm.createContext(window);
loadScript(path.join(ROOT,'data/bible-catalog.js'),ctx);
loadScript(path.join(ROOT,'engine/bible-runtime-v0-1-unified.js'),ctx,true);

const BF=window.BlueFox3D;
const sis3=BF.BibleCatalog.find(m=>m.id==='SIS-03');
assert(sis3,'SIS-03 absente');

function node(target=1, progress=0){
  return {
    target, progress, isComplete: progress>=target,
    increment(n){this.progress=Math.min(this.target,this.progress+n);this.isComplete=this.progress>=this.target;return true;}
  };
}
const collect=node(3,3), experiment=node(), returnField=node(), validation=node();
const tree={
  find(id){
    if(id.endsWith(':collect')) return collect;
    if(id.endsWith(':experiment')) return experiment;
    if(id.endsWith(':returnField')) return returnField;
    if(id.endsWith(':validation')) return validation;
    return null;
  },
  availableLeaves(){return collect.isComplete && !experiment.isComplete ? [experiment] : experiment.isComplete && !returnField.isComplete ? [returnField] : [];},
  refresh(){}
};
const facts=new Map();
const lifecycle={'SIS-03':{status:'active'}};
const memory={
  state:{missionLifecycle:lifecycle},
  saveTree(){}, save(){},
  getFact(k,d=null){return facts.has(k)?facts.get(k):d;},
  setFact(k,v){facts.set(k,v);}
};
const manager={
  memory, trees:new Map([['SIS-03',tree]]), activeMissionIds:['SIS-03'],
  syncLifecycleFromTrees(){}, reevaluatePendingActivations(){}, catalogController:{schedule(){}}, publish(){}
};
BF.currentEngine={
  missionManager:manager,
  currentMapId:'workbench-map',
  character:{root:{position:{x:20,z:0}}},
  currentMap:{group:{userData:{microScenes:[{id:'MSC-CUSTOM-ETABLI-VIDE',instanceRoot:{position:{x:0,y:0,z:0}}}]}}},
  callbacks:{onStatus(){} }
};
let inventory={resonant_basalt:3};
const tx={};
BF.consumeInventoryPoolOnce=(id,keys,amount)=>{
  if(tx[id]!==undefined) return tx[id];
  const key=keys[0];
  if((inventory[key]||0)<amount) return 0;
  inventory[key]-=amount; tx[id]=amount; return amount;
};
const runtime=new BF.BibleRuntimeV01();

runtime.reviewProximityContexts();
assert.equal(experiment.progress,0,'hors portée, l expérience ne doit pas progresser');
assert.equal(inventory.resonant_basalt,3,'hors portée, aucune ressource ne doit être consommée');

BF.currentEngine.character.root.position={x:4,z:0};
runtime.reviewProximityContexts();
assert.equal(experiment.progress,1,'à l établi, le slot experiment doit progresser');
assert.equal(inventory.resonant_basalt,0,'l essai doit consommer exactement 3 basaltes résonants');
assert.ok(facts.get('sis03:workbenchResonance:v1'),'la proximité expérimentale doit être mémorisée');

runtime.reviewProximityContexts();
assert.equal(inventory.resonant_basalt,0,'la consommation doit être idempotente après validation');
assert.equal(experiment.progress,1,'le slot ne doit pas progresser deux fois');

console.log('ECO-SIS runtime: PASS');
