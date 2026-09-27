const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const listeners={};
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail||{}}}
const defs={}; const facts={}; const lifecycles={}; const receipts={}; const rewards=[]; const speech=[];
const window={
  console, CustomEvent:CE,
  addEventListener(type,fn){(listeners[type]||(listeners[type]=new Set())).add(fn)},
  removeEventListener(type,fn){listeners[type]?.delete(fn)},
  dispatchEvent(event){for(const fn of listeners[event.type]||[])fn(event)},
  BlueFox3D:{
    Missions:{definitions:defs},
    registerMissionDefinitions(list){for(const d of list){defs[d.id]=d} return list.length},
    ObjectEvents:{types:{NPC_CONTACTED:'NPC_CONTACTED'},subscribe(fn){window._object=fn;return()=>{window._object=null}}},
    NpcRuntime:{list(){return[window.npcRoot]},speak(root,text){speech.push(text);return true}},
    grantInventory(key,qty,detail){rewards.push({key,qty,detail});return qty},
  }
}; window.window=window; window.performance={now:()=>1000};
window.npcRoot={userData:{instanceId:'npc-1'}};
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/mission-catalog.js'),'utf8'),vm.createContext(window));
const BF=window.BlueFox3D;
assert.equal(Object.keys(defs).filter(id=>id.startsWith('NPC-SERVICE-')).length,6,'six static service definitions expected');
const memory={state:{missionLifecycle:lifecycles},getFact:(k,d)=>k in facts?facts[k]:d,setFact:(k,v)=>{facts[k]=v;return v},save(){},hasEffectReceipt:k=>Boolean(receipts[k]),recordEffectReceipt:(k,v)=>{receipts[k]=v;return true}};
const manager={memory,definition:id=>defs[id]||null,rearmRepeatableMission(id){if(lifecycles[id]?.status!=='completed')return false;lifecycles[id].status='available';lifecycles[id].repeatCount=(lifecycles[id].repeatCount||0)+1;return true},startMission(id){if(!defs[id])return false;lifecycles[id]={...(lifecycles[id]||{}),status:'active',activatedAt:Date.now()};return true}};
const Controller=BF.Missions.MissionCatalogController; const ctl=new Controller(manager); BF.currentEngine={missionManager:{catalogController:ctl}};
// Neutral contact never offers a mission.
window._object({type:'NPC_CONTACTED',instanceId:'npc-1',detail:{civilizationId:'translucent',cuoType:'npc_translucent',interactionSource:'manual'}});
assert.equal(Object.values(lifecycles).filter(x=>x.status==='active').length,0);
assert(speech.at(-1).includes('contact'));
// CONTACT can later establish AMICAL through the public relation API.
assert(BF.setCivilizationRelation('translucent','friendly'));
for(let i=0;i<3;i++){
  window._object({type:'NPC_CONTACTED',instanceId:'npc-1',detail:{civilizationId:'translucent',cuoType:'npc_translucent',interactionSource:'manual'}});
  const active=Object.entries(lifecycles).find(([,v])=>v.status==='active');
  assert(active,'service mission should be offered at friendly rank');
  active[1].status='completed'; active[1].completedAt=100+i;
  window.dispatchEvent(new CE('bluefox:mission-state',{detail:{}}));
}
const relation=ctl.getRelation('translucent');
assert.equal(relation.acceptedMissions,3);
assert.equal(relation.rank,'honored','third accepted service must reach HONORED');
assert.equal(rewards.length,3,'each completed service should grant one idempotent reward');
window.dispatchEvent(new CE('bluefox:mission-state',{detail:{}}));
assert.equal(rewards.length,3,'reward receipts must prevent duplicate grants');
ctl.dispose();
console.log('PASS npc-r2-catalog-runtime');
