const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = process.argv[2] || process.cwd();

function makeWindow() {
  const w = {
    console,
    performance: { now: () => 1000 },
    setInterval: () => 0,
    clearInterval: () => {},
    setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 0; },
    clearTimeout: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
  w.window = w;
  w.globalThis = w;
  w.BlueFox3D = {
    Missions: {
      ActionType: { OBSERVE:'observe', INSPECT:'inspect', ANALYZE:'analyze', COLLECT:'collect', EXTRACT:'extract' },
      normalizeActionType: (x) => String(x || '').toLowerCase()
    },
    BibleCatalog: []
  };
  return w;
}

const w = makeWindow();
const ctx = vm.createContext(w);
vm.runInContext(fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8'), ctx, {filename:'bible-catalog.js'});
vm.runInContext(fs.readFileSync(path.join(root,'engine/object-m0-bridge.js'),'utf8'), ctx, {filename:'object-m0-bridge.js'});
const BF = w.BlueFox3D;
const arch08 = BF.BibleCatalog.find((m)=>m.id==='ARCH-08');
assert(arch08 && arch08.pattern==='CONTEXT_MSC' && arch08.mapGeneration,'ARCH-08 catalog contract missing');
const slot = arch08.slots.context;

const node = {
  id:'ARCH-08:context', type:'observe', progress:0, target:slot.target, isComplete:false,
  params:{ biblePattern:arch08.pattern, ...slot.params },
  hasDistinctValue: () => false
};
const tree = { id:'ARCH-08', find:(id)=>id===node.id?node:null, availableLeaves:()=>node.isComplete?[]:[node], refresh:()=>{} };
const plant = {
  userData:{ active:true, instanceId:'vine:1', functional:{ id:'BIO-LUNE-S-001', type:'lunar_vine', category:'flora', interaction:{actions:['observe']}, semantic:{subject:'flora'} } }
};
const engine = {
  currentMapId:'map-old', currentMap:{interactables:[plant]},
  missionManager:{ trees:new Map([['ARCH-08',tree]]), memory:{getFact:()=>null} },
  character:{root:{position:{distanceTo:()=>1}}}, interactionWorldPosition:()=>({})
};
const action = { missionId:'ARCH-08', nodeId:node.id, type:'observe', params:{...node.params} };
assert.strictEqual(BF.probeMissionActionTarget(engine, action), null,
  'CONTEXT_MSC must not claim an ordinary CUO target');

// Load the exact HEAD context owner and prove that three real MSC contexts progress the node.
vm.runInContext(fs.readFileSync(path.join(root,'engine/context-msc-bridge.js'),'utf8'), ctx, {filename:'context-msc-bridge.js'});
node._distinct = new Set();
node.incrementDistinct = function(value){
  if (this._distinct.has(value)) return false;
  this._distinct.add(value); this.progress += 1; this.isComplete = this.progress >= this.target; return true;
};
const manager = {
  trees:new Map([['ARCH-08',tree]]), currentAction:null,
  ensureLifecycle:()=>({status:'active'}),
  memory:{saveTree:()=>{}, save:()=>{}, remember:()=>{}},
  syncLifecycleFromTrees:()=>{}, reevaluatePendingActivations:()=>{}, publish:()=>{}
};
BF.currentEngine = {missionManager:manager};
const ids=['MSC-CUSTOM-RUINE-MODULAIRE1','MSC-CUSTOM-RUINE-MODULAIRE2','MSC-CUSTOM-SANCTUAIRE-RING'];
let changed=0;
for (const id of ids) changed += BF.progressContextMSCMissions({microSceneId:id,microSceneInstanceId:'site:'+id,mapId:'generated-0026',contextRole:'archRegionalSite'},{missionIds:['ARCH-08'],source:'exploration.map_discovered'});
assert.strictEqual(changed,3,'three real archaeological contexts must progress');
assert.strictEqual(node.progress,3,'ARCH-08 context must reach 3/3');
console.log('PASS ARCH-08 CONTEXT_MSC runtime');
