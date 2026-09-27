const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ROOT=path.resolve(__dirname,'..'); let now=100,queue=[]; const listeners={}; const defs={},facts={},lifecycles={},receipts={},rewards=[],hooks=[];
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail||{}}}
class V3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}clone(){return new V3(this.x,this.y,this.z)}copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}}
class E extends V3{} class S extends V3{constructor(x=1,y=1,z=1){super(x,y,z)}}
function part(name,side=0){return{name,userData:{side},position:new V3(),rotation:new E(),scale:new S(),material:null}}
const children=['NpcEye','NpcCore','TranslucentHeadFine','TranslucentTorsoFine','TranslucentUpperArm','TranslucentForearm','TranslucentThigh','TranslucentShin'].map((n,i)=>part(n,i%2?1:-1));
const root={userData:{instanceId:'npc-x'},position:new V3(),rotation:new E(),scale:new S(),parent:{},visible:true,children,traverse(fn){children.forEach(fn)},dispatchEvent(){}};
const window={console,Date,Math,CustomEvent:CE,performance:{now:()=>now},requestAnimationFrame(fn){queue.push(fn);return queue.length},addEventListener(t,f){(listeners[t]||(listeners[t]=new Set())).add(f)},removeEventListener(t,f){listeners[t]?.delete(f)},dispatchEvent(e){for(const f of listeners[e.type]||[])f(e)},BlueFox3D:{Missions:{definitions:defs},registerMissionDefinitions(list){for(const d of list)defs[d.id]=d;return list.length},ObjectLibrary:{create(){},registerCreateHook(fn){hooks.push(fn)}},PassiveObjectRuntime:{setEnabled(){}},RuntimeBudget:{shouldUpdate(){return true}},grantInventory(k,q,d){rewards.push({k,q,d});return q}}};window.window=window;
const ctx=vm.createContext(window);
for(const f of ['engine/object-event-registry.js','engine/npc-runtime.js','engine/mission-catalog.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx);
const BF=window.BlueFox3D;hooks[0]({root},{type:'npc_translucent'});
const memory={state:{missionLifecycle:lifecycles},getFact:(k,d)=>k in facts?facts[k]:d,setFact:(k,v)=>{facts[k]=v;return v},save(){},hasEffectReceipt:k=>Boolean(receipts[k]),recordEffectReceipt:(k,v)=>{receipts[k]=v;return true}};
const manager={memory,definition:id=>defs[id]||null,rearmRepeatableMission(id){if(lifecycles[id]?.status!=='completed')return false;lifecycles[id].status='available';return true},startMission(id){if(!defs[id])return false;lifecycles[id]={...(lifecycles[id]||{}),status:'active',activatedAt:Date.now()};return true}};
const ctl=new BF.Missions.MissionCatalogController(manager);manager.catalogController=ctl;
const hit={userData:{worldAnchor:root,instanceId:'npc-x',requestedInteractionSource:'manual',interactionProfile:{action:'contact'},active:true}};
BF.currentEngine={THREE:null,missionManager:manager,character:{root:{position:new V3()}},pendingInteraction:hit,interactionStartedAt:500,currentMapId:'city-translucent'};
assert(BF.setCivilizationRelation('translucent','friendly'));
now=1000;queue.shift()();
assert.equal(BF.ObjectEvents.history().filter(e=>e.type==='NPC_CONTACTED').length,1);
const active=Object.entries(lifecycles).find(([,v])=>v.status==='active'); assert(active,'contact should activate one service mission');
assert(active[0].includes('@translucent'));
assert.equal(BF.getCivilizationRelation('translucent').acceptedMissions,1);
active[1].status='completed';active[1].completedAt=42;window.dispatchEvent(new CE('bluefox:mission-state'));
assert.equal(rewards.length,1,'completion grants one physical reward');
ctl.dispose();
console.log('PASS npc-r2-integration');
