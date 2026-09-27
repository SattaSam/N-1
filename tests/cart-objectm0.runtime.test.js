const fs=require('fs');const vm=require('vm');const path=require('path');const assert=require('assert');
const root=path.resolve(__dirname,'..');
const window={};window.window=window;window.performance={now:()=>0};
window.BlueFox3D={Missions:{},ObjectLibrary:null,ObjectEvents:{types:{OBJECT_SEEN:'OBJECT_SEEN',OBJECT_INSPECTED:'OBJECT_INSPECTED',OBJECT_ANALYZED:'OBJECT_ANALYZED',PHENOMENON_OBSERVED:'PHENOMENON_OBSERVED',RESOURCE_COLLECTED:'RESOURCE_COLLECTED',RESOURCE_EXTRACTED:'RESOURCE_EXTRACTED',NPC_REACTION:'NPC_REACTION'},subscribe(){return()=>{};}}};
const BF=window.BlueFox3D,M=BF.Missions;M.ActionType={OBSERVE:'observe',INSPECT:'inspect',ANALYZE:'analyze',COLLECT:'collect',EXTRACT:'extract'};M.normalizeActionType=v=>String(v||'').toLowerCase();
class MissionManager{};M.MissionManager=MissionManager;
const cw={BlueFox3D:{}};cw.window=cw;vm.runInNewContext(fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8'),{window:cw,console});BF.BibleCatalog=cw.BlueFox3D.BibleCatalog;
const ctx=vm.createContext({window,console,performance:window.performance,CustomEvent:function(){}});vm.runInContext(fs.readFileSync(path.join(root,'engine/object-m0-bridge.js'),'utf8'),ctx);
const byId=new Map(BF.BibleCatalog.map(x=>[x.id,x]));
function node(mission,slot){const s=mission.sequence.find(x=>x.slot===slot);return {id:`${mission.id}:${slot}`,type:s.action,params:{...s.params,sequenceSlot:slot},isComplete:false,progress:0,target:s.target,historyValues:[],increment(n=1){this.progress+=n;this.isComplete=this.progress>=this.target;return true;},incrementDistinct(v,n=1){this._d??=new Set();if(!v||this._d.has(v))return false;this._d.add(v);this.progress+=n;this.isComplete=this.progress>=this.target;return true;},hasDistinctValue(v){return !!(v&&this._d?.has(v));},pushHistoryValue(v){this.historyValues.push(v);return true;}}}
function manager(mission,nodes,available,facts={}){const tree={id:mission.id,root:{walk(cb){nodes.forEach(cb)}},availableLeaves:available,find(id){return nodes.find(n=>n.id===id)||null},refresh(){}};const m=new M.MissionManager();m.trees=new Map([[mission.id,tree]]);m.ensureLifecycle=()=>({status:'active'});const seen=new Set();m.memory={getFact:(k,d=null)=>facts[k]??d,hasProcessedObjectEvent:id=>seen.has(id),markProcessedObjectEvent:id=>seen.add(id),saveTree(){},remember(){},save(){}};m.syncLifecycleFromTrees=()=>{};m.reevaluatePendingActivations=()=>{};m.catalogController={schedule(){}};m.publish=()=>{};return m;}
let seq=0;
const blue=(inst,map='map-A')=>({id:`b-${++seq}`,type:'OBJECT_INSPECTED',objectId:'fog_bank',instanceId:inst,mapId:map,detail:{cuoType:'fog_bank',interactionSource:'manual',kind:'phenomena'}});
const scout=(inst,map='map-A',type='fog_bank')=>({id:`s-${++seq}`,type:'OBJECT_SEEN',objectId:type,instanceId:inst,mapId:map,tags:['drone-scouted'],detail:{cuoType:type,interactionSource:'drone',droneType:'scout_drone',remote:false,kind:'phenomena',tags:['drone-scouted']}});
// CART-02 SAME-INSTANCE BlueFox -> Scout
{
 const mission=byId.get('CART-02');const n1=node(mission,'bluefoxFog'),n2=node(mission,'scoutConfirm');let phase=1;const facts={'cart02:map':{mapId:'map-A'}};const m=manager(mission,[n1,n2],()=>phase===1?[n1]:[n2],facts);
 m.consumeObjectEvent(blue('fog-1'));assert.equal(n1.progress,1);phase=2;
 m.consumeObjectEvent(scout('fog-2'));assert.equal(n2.progress,0,'autre instance doit être refusée');
 m.consumeObjectEvent(scout('fog-1'));assert.equal(n2.progress,1,'même instance doit être acceptée');
}
// CART-03 one credit per distinct mapId
{
 const mission=byId.get('CART-03');const n=node(mission,'regionalSurvey');const m=manager(mission,[n],()=>[n],{});
 m.consumeObjectEvent(scout('f1','map-A','fog_bank'));m.consumeObjectEvent(scout('f2','map-A','fog_bank'));assert.equal(n.progress,1,'même map ne doit compter qu une fois');
 m.consumeObjectEvent(scout('f3','map-B','electrostatic_storm'));m.consumeObjectEvent(scout('f4','map-C','fog_bank'));assert.equal(n.progress,3,'trois mapId distincts doivent valider CART-03');
}
console.log('CART ObjectM0 runtime: PASS');
