const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'); const ROOT=path.join(__dirname,'..');
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
const window={console,Date,Math,JSON,Set,Map,WeakMap,Promise,performance:{now:()=>1000},CustomEvent:CE,queueMicrotask:fn=>fn(),setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},localStorage:{getItem(){return null},setItem(){},removeItem(){}},addEventListener(){},removeEventListener(){},dispatchEvent(){return true},BlueFox3D:{Missions:{},BiblePatterns:{},ObjectEvents:{types:{}}}}; window.window=window; const ctx=vm.createContext(window);
vm.runInContext(fs.readFileSync(path.join(ROOT,'data/bible-catalog.js'),'utf8'),ctx,{filename:'bible-catalog.js'});
let src=fs.readFileSync(path.join(ROOT,'engine/bible-runtime-v0-1-unified.js'),'utf8').replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/,'\n})(window);'); vm.runInContext(src,ctx,{filename:'bible-runtime-v0-1-unified.js'});
const BF=window.BlueFox3D, byId=new Map(BF.BibleCatalog.map(m=>[m.id,m]));
const short=byId.get('GAME-travel_short'), samples=byId.get('GAME-collection_samples');
const rt=Object.create(BF.BibleRuntimeV01.prototype); rt.catalog=[short,samples]; rt.byId=new Map([[short.id,short],[samples.id,samples]]); rt.state={triggerCounts:{},uniqueTriggerValues:{}}; rt.saveState=()=>true;
const status={'GAME-foundation':'active','GAME-exploration_total_20':'completed','GAME-travel_short':'hidden','GAME-survival_stable':'active','GAME-collection_samples':'hidden'};
let queued=null, activated=null;
const manager={startMission(id,opts){queued={id,opts}; return false;},memory:{state:{missionLifecycle:{}},save(){}}};
rt.manager=()=>manager; rt.missionLifecycle=id=>({active:status[id]==='active',completed:status[id]==='completed',status:status[id]}); rt.activateMission=(m,e)=>{activated={id:m.id,e}; return true;};
// Cas composite : exploration mondiale finit en premier, foundation manque encore -> activation doit être confiée à MissionManager en attente.
let r=rt.consumeTriggerEvent({type:'progression.mission_completed',missionId:'GAME-exploration_total_20',amount:1});
assert.equal(r.activatedMissionId,null); assert.ok(queued,'pending activation must be delegated to MissionManager'); assert.equal(queued.id,'GAME-travel_short'); assert.deepEqual(Array.from(queued.opts.prerequisites),['GAME-foundation','GAME-exploration_total_20']); assert.equal(rt.state.triggerCounts['GAME-travel_short:progression.mission_completed'],1);
// L'autre ordre : foundation est déjà terminée quand exploration_total_20 se termine -> activation immédiate normale.
queued=null; activated=null; rt.state.triggerCounts={}; status['GAME-foundation']='completed';
r=rt.consumeTriggerEvent({type:'progression.mission_completed',missionId:'GAME-exploration_total_20',amount:1}); assert.equal(activated.id,'GAME-travel_short'); assert.equal(r.activatedMissionId,'GAME-travel_short'); assert.equal(queued,null);
// Garde-fou : collection_samples ne doit surtout pas compter les maps avant survival_stable.
activated=null; rt.state.triggerCounts={}; rt.state.uniqueTriggerValues={}; status['GAME-survival_stable']='active';
r=rt.consumeTriggerEvent({type:'exploration.map_discovered',mapId:'pre-1',toMapId:'pre-1',amount:1}); assert.equal(rt.state.triggerCounts['GAME-collection_samples:exploration.map_discovered']||0,0); assert.equal(queued,null); assert.equal(activated,null);
console.log('PASS GAME-R3 composite prerequisite activation + no premature collection map credit');
