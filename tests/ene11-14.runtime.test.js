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
const window = { console, Date, Math, JSON, Set, Map, WeakMap, Promise,
  performance:{now:()=>1000}, queueMicrotask:fn=>fn(), setTimeout:fn=>{fn();return 1;}, clearTimeout(){}, setInterval:()=>1, clearInterval(){}, CustomEvent:CE,
  localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);}, removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
  dispatchEvent(event){for(const fn of listeners.get(event.type)||[]) fn(event);return true;},
  BlueFox3D:{Missions:{},BiblePatterns:{},ObjectEvents:{types:{OBJECT_SEEN:'OBJECT_SEEN',DRONE_ACTIVATED:'DRONE_ACTIVATED'}}}
};
window.window=window; const ctx=vm.createContext(window);
loadScript(path.join(ROOT,'data/bible-catalog.js'),ctx);
const byId=new Map(window.BlueFox3D.BibleCatalog.map(m=>[m.id,m]));
for(const id of ['ENE-11','ENE-12','ENE-13','ENE-14']) assert(byId.has(id),`${id} absent`);
const e11=byId.get('ENE-11'), e12=byId.get('ENE-12'), e13=byId.get('ENE-13'), e14=byId.get('ENE-14');
assert.deepStrictEqual(Array.from(e11.prerequisites),['ENE-10','GAME-engineering_6']);
assert.equal(e11.completionGate,undefined,'ENE-11 ne doit pas détourner proximity.shelter pour l établi');
assert.equal(e11.proximityContexts[0].microSceneId,'MSC-CUSTOM-ETABLI-VIDE');
assert.equal(e12.sequence.length,2,'ENE-12 doit respecter le contrat SEQUENCE_ACTIONS');
assert.equal(e12.sequence[0].slot,'approach'); assert.deepStrictEqual(Array.from(e12.sequence[1].requires),['approach']);
assert.equal(e12.proximityContexts[1].inventoryConsume.inventoryKey,'accumulator');
assert.equal(e13.runtimeValidation.type,'ene13-scout-drone'); assert.equal(e14.runtimeValidation.reuseMissionId,'GEO-07');

loadScript(path.join(ROOT,'engine/bible-runtime-v0-1-unified.js'),ctx,true);
const BF=window.BlueFox3D;
const lifecycle={'ENE-13':{status:'active'},'ENE-14':{status:'active'},'GEO-07':{status:'completed'}};
function node(target=1){return{target,progress:0,isComplete:false,increment(n){this.progress=Math.min(this.target,this.progress+n);this.isComplete=this.progress>=this.target;return true;}};}
const nAct=node(),nScout=node(),nMeasurements=node(3);
const tree13={find(id){return id.endsWith(':activate')?nAct:id.endsWith(':scout')?nScout:null;},availableLeaves(){return nAct.isComplete?[nScout]:[nAct];},refresh(){}};
const tree14={find(id){return id.endsWith(':measurements')?nMeasurements:null;},availableLeaves(){return[nMeasurements];},refresh(){}};
const memory={state:{missionLifecycle:lifecycle},saveTree(){},save(){},getFact(){return null;},setFact(){}};
const manager={memory,trees:new Map([['ENE-13',tree13],['ENE-14',tree14]]),activeMissionIds:['ENE-13','ENE-14'],syncLifecycleFromTrees(){},reevaluatePendingActivations(){},catalogController:{schedule(){}},publish(){}};
BF.currentEngine={missionManager:manager,callbacks:{onStatus(){}}};
let inventory={accumulator:1}; const tx={};
BF.consumeInventoryPoolOnce=(id,keys,amount)=>{if(tx[id])return tx[id];if((inventory.accumulator||0)<amount)return 0;inventory.accumulator-=amount;tx[id]=amount;return amount;};
const runtime=new BF.BibleRuntimeV01();
runtime.onObjectEvent({type:'DRONE_ACTIVATED',detail:{interactionSource:'drone',droneType:'scout_drone'},tags:[]});
assert.equal(nAct.progress,1); assert.equal(inventory.accumulator,0);
runtime.onObjectEvent({type:'OBJECT_SEEN',detail:{interactionSource:'drone'},tags:['drone-scouted'],mapId:'map-test'});
assert.equal(nScout.progress,1,'ENE-13 consomme explicitement le scan Scout');

const nPrototype=node(); lifecycle['ENE-11']={status:'active'}; manager.activeMissionIds.push('ENE-11');
manager.trees.set('ENE-11',{find(id){return id.endsWith(':prototype')?nPrototype:null;},availableLeaves(){return[nPrototype];},refresh(){}});
BF.currentEngine.currentMapId='crystal'; BF.currentEngine.character={root:{position:{x:20,z:0}}};
BF.currentEngine.currentMap={group:{userData:{microScenes:[{id:'MSC-CUSTOM-ETABLI-VIDE',instanceRoot:{position:{x:0,y:0,z:0}}}]}}};
runtime.reviewProximityContexts(); assert.equal(nPrototype.progress,0);
BF.currentEngine.character.root.position={x:4,z:0}; runtime.reviewProximityContexts(); assert.equal(nPrototype.progress,1);

const nApproach=node(),nMachine=node(); lifecycle['ENE-12']={status:'active'}; manager.activeMissionIds.push('ENE-12');
manager.trees.set('ENE-12',{find(id){return id.endsWith(':approach')?nApproach:id.endsWith(':machine')?nMachine:null;},availableLeaves(){return nApproach.isComplete?[nMachine]:[nApproach];},refresh(){}});
inventory.accumulator=1; BF.currentEngine.currentMapId='map-machine'; BF.currentEngine.character={root:{position:{x:0,z:0}}};
BF.currentEngine.currentMap={group:{userData:{microScenes:[{id:'MSC-CUSTOM-MACHINE-ABANDONNEE',instanceRoot:{position:{x:0,y:0,z:0}}}]}}};
runtime.reviewProximityContexts();
assert.equal(nApproach.progress,1,'ENE-12 enregistre d abord l approche réelle');
assert.equal(nMachine.progress,1,'ENE-12 cède ensuite l accumulateur dans la même proximité réelle');
assert.equal(inventory.accumulator,0);
assert.equal(runtime.reconcileEnergyMissionRuntime(e14),true); assert.equal(nMeasurements.progress,3);
console.log('PASS ene11-14 corrected runtime');
