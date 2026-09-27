const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'); const ROOT=path.join(__dirname,'..');
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
const window={console,Date,Math,JSON,Set,Map,WeakMap,Promise,performance:{now:()=>1000},CustomEvent:CE,queueMicrotask:fn=>fn(),setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},localStorage:{getItem(){return null},setItem(){},removeItem(){}},addEventListener(){},removeEventListener(){},dispatchEvent(){return true},BlueFox3D:{Missions:{},BiblePatterns:{},ObjectEvents:{types:{RESOURCE_COLLECTED:'RESOURCE_COLLECTED',RESOURCE_EXTRACTED:'RESOURCE_EXTRACTED'}}}}; window.window=window; const ctx=vm.createContext(window);
vm.runInContext(fs.readFileSync(path.join(ROOT,'data/bible-catalog.js'),'utf8'),ctx,{filename:'bible-catalog.js'});
let src=fs.readFileSync(path.join(ROOT,'engine/bible-runtime-v0-1-unified.js'),'utf8').replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/,'\n})(window);'); vm.runInContext(src,ctx,{filename:'bible-runtime-v0-1-unified.js'});
const BF=window.BlueFox3D, mission=BF.BibleCatalog.find(m=>m.id==='GAME-collection_variety'); assert.ok(mission); assert.equal(mission.completionGate.requireDeposit,true);
const rt=Object.create(BF.BibleRuntimeV01.prototype); rt.catalog=[mission]; rt.byId=new Map([[mission.id,mission]]); rt.dynamicMissions=new Map(); rt.state={gatesSatisfied:{}}; rt.saveState=()=>true;
const tree={root:{isComplete:true}}; let synced=0; const manager={memory:{state:{missionLifecycle:{'GAME-collection_variety':{status:'active'}}}},trees:new Map([[mission.id,tree]]) ,syncLifecycleFromTrees(){synced++},reevaluatePendingActivations(){},catalogController:{schedule(){}},publish(){}};
rt.manager=()=>manager; rt.missionTargetMapId=()=>null; rt.shelterProximitySatisfied=()=>true; rt.bagCounterSatisfied=()=>true; rt.inventoryEffectsReady=()=>true; rt.reconcileStockBackedMissions=()=>false; rt.reviewRepeatableOpportunities=()=>false; rt.progressionChangeAffectsEnvironmentObservations=()=>false; rt.progressionChangeAffectsHistoricalCollections=()=>false; rt.progressionChangeAffectsObservationRuntimeCounters=()=>false; rt.pendingConstructionResourceMissions=new Set();
assert.equal(rt.gateSatisfied(mission),false,'return/proximity alone cannot complete a deposit-gated mission');
assert.equal(Boolean(rt.state.gatesSatisfied[mission.id]),false);
assert.equal(rt.onProgressionChanged({reason:'inventory-deposited'}),true,'real inventory deposit must satisfy the gate');
assert.ok(rt.state.gatesSatisfied[mission.id]); assert.equal(synced,1);
console.log('PASS GAME-R3 variety requires real inventory-deposited event');
