const fs=require('fs');
const vm=require('vm');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const window={}; window.window=window; window.performance={now:()=>0};
window.BlueFox3D={Missions:{},ObjectLibrary:null,ObjectEvents:{types:{OBJECT_SEEN:'OBJECT_SEEN',OBJECT_INSPECTED:'OBJECT_INSPECTED',OBJECT_ANALYZED:'OBJECT_ANALYZED',PHENOMENON_OBSERVED:'PHENOMENON_OBSERVED',RESOURCE_COLLECTED:'RESOURCE_COLLECTED',RESOURCE_EXTRACTED:'RESOURCE_EXTRACTED',NPC_REACTION:'NPC_REACTION'},subscribe(){return()=>{};}}};
const BF=window.BlueFox3D; const Missions=BF.Missions;
Missions.ActionType={OBSERVE:'observe',INSPECT:'inspect',ANALYZE:'analyze',COLLECT:'collect',EXTRACT:'extract'}; Missions.normalizeActionType=v=>String(v||'').toLowerCase();
class MissionManager{static create(){return new MissionManager();}} Missions.MissionManager=MissionManager;
const cw={BlueFox3D:{}}; cw.window=cw; vm.runInNewContext(fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8'),{window:cw,console}); BF.BibleCatalog=cw.BlueFox3D.BibleCatalog;
const ctx=vm.createContext({window,console,performance:window.performance,CustomEvent:function(){}}); vm.runInContext(fs.readFileSync(path.join(root,'engine/object-m0-bridge.js'),'utf8'),ctx);
const makeNode=(mission,slot)=>{const step=mission.sequence.find(x=>x.slot===slot);return {id:`${mission.id}:${slot}`,type:step.action,params:step.params,isComplete:false,progress:0,target:step.target,historyValues:[],increment(n=1){this.progress+=n;this.isComplete=this.progress>=this.target;return true;},incrementDistinct(v,n=1){this._d??=new Set();if(!v||this._d.has(v))return false;this._d.add(v);this.progress+=n;this.isComplete=this.progress>=this.target;return true;},hasDistinctValue(v){return !!(v&&this._d?.has(v));},pushHistoryValue(v){this.historyValues.push(v);return true;}}};
const makeManager=(mission,nodes,availableFn,facts={})=>{const tree={id:mission.id,root:{walk(cb){nodes.forEach(cb);}},availableLeaves(){return availableFn();},find(id){return nodes.find(n=>n.id===id)||null;},refresh(){}};const m=new Missions.MissionManager();m.trees=new Map([[mission.id,tree]]);m.ensureLifecycle=()=>({status:'active'});const seen=new Set();m.memory={getFact:k=>facts[k]??null,hasProcessedObjectEvent:id=>seen.has(id),markProcessedObjectEvent:id=>seen.add(id),saveTree(){},remember(){},save(){}};m.syncLifecycleFromTrees=()=>{};m.reevaluatePendingActivations=()=>{};m.catalogController={schedule(){}};m.publish=()=>{};return m;};
let seq=0; const scout=(mapId,{remote=false,id=`evt-${++seq}`}={})=>({id,type:'OBJECT_SEEN',objectId:'energy_crystal',instanceId:`crystal-${mapId}-${seq}`,mapId,tags:['drone-scouted',...(remote?['remote']:[])],detail:{interactionSource:'drone',droneType:'scout_drone',remote,cuoType:'energy_crystal',kind:'crystal',subject:'geology',tags:['drone-scouted',...(remote?['remote']:[])]}});
// PHEN-07: same map rejected by relation differentBy mapId; another map accepted.
{
 const mission=BF.BibleCatalog.find(m=>m.id==='PHEN-07'); const n1=makeNode(mission,'scoutSite1'), n2=makeNode(mission,'scoutSite2');
 const facts={'phen07:site1':{mapId:'map-A'},'phen07:site2':{mapId:'map-B'}}; let phase=1; const m=makeManager(mission,[n1,n2],()=>phase===1?[n1]:[n2],facts);
 m.consumeObjectEvent(scout('map-A')); assert.equal(n1.progress,1,'premier site Scout doit progresser'); assert(n1.historyValues.length,'la preuve relationnelle du premier site doit être mémorisée'); phase=2;
 // même map mais fact temporairement pointé vers A pour tester la relation elle-même
 facts['phen07:site2']={mapId:'map-A'}; m.consumeObjectEvent(scout('map-A')); assert.equal(n2.progress,0,'même map doit être refusée par differentBy mapId');
 facts['phen07:site2']={mapId:'map-B'}; m.consumeObjectEvent(scout('map-B')); assert.equal(n2.progress,1,'deuxième map distincte doit progresser');
}
// PHEN-08: only real remote Scout events count, one per distinct map.
{
 const mission=BF.BibleCatalog.find(m=>m.id==='PHEN-08'); const n=makeNode(mission,'networkReadings'); const m=makeManager(mission,[n],()=>[n],{});
 m.consumeObjectEvent(scout('map-A',{remote:false})); assert.equal(n.progress,0,'un Scout local ne doit pas valider le réseau distant');
 m.consumeObjectEvent(scout('map-A',{remote:true})); m.consumeObjectEvent(scout('map-A',{remote:true})); assert.equal(n.progress,1,'une même map distante ne compte qu une fois');
 m.consumeObjectEvent(scout('map-B',{remote:true})); m.consumeObjectEvent(scout('map-C',{remote:true})); assert.equal(n.progress,3,'trois maps distantes distinctes doivent valider PHEN-08');
}
console.log('PASS R-PHEN-FINAL Object-M0 PHEN-07 relation mapId + PHEN-08 remote network');
