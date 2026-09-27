const fs=require('fs');
const vm=require('vm');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const bridgePath=process.argv[2] ? path.resolve(process.argv[2]) : path.join(root,'engine/object-m0-bridge.js');

const window={}; window.window=window; window.performance={now:()=>0};
window.BlueFox3D={Missions:{},ObjectLibrary:null,ObjectEvents:{types:{OBJECT_SEEN:'OBJECT_SEEN',OBJECT_INSPECTED:'OBJECT_INSPECTED',OBJECT_ANALYZED:'OBJECT_ANALYZED',PHENOMENON_OBSERVED:'PHENOMENON_OBSERVED',RESOURCE_COLLECTED:'RESOURCE_COLLECTED',RESOURCE_EXTRACTED:'RESOURCE_EXTRACTED',NPC_REACTION:'NPC_REACTION'},subscribe(){return()=>{};}}};
const BF=window.BlueFox3D; const Missions=BF.Missions;
Missions.ActionType={OBSERVE:'observe',INSPECT:'inspect',ANALYZE:'analyze',COLLECT:'collect',EXTRACT:'extract'};
Missions.normalizeActionType=v=>String(v||'').toLowerCase();
class MissionManager{static create(){return new MissionManager();}} Missions.MissionManager=MissionManager;

const catalogWindow={BlueFox3D:{BiblePatterns:{SEQUENCE_ACTIONS:{autonomyAxis:'research'},TRAVEL_CYCLE:{autonomyAxis:'exploration'},EXPLORE_SCOPE:{autonomyAxis:'exploration'},OBSERVE_TARGET:{autonomyAxis:'research'},COLLECT_THEN_REWARD:{autonomyAxis:'collection'}}}}; catalogWindow.window=catalogWindow;
vm.runInNewContext(fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8'),{window:catalogWindow,console});
BF.BibleCatalog=catalogWindow.BlueFox3D.BibleCatalog;

const context=vm.createContext({window,console,performance:window.performance,CustomEvent:function(){}});
vm.runInContext(fs.readFileSync(bridgePath,'utf8'),context,{filename:'object-m0-bridge.js'});

const mission=BF.BibleCatalog.find(m=>m.id==='PHEN-01');
const bySlot=slot=>mission.sequence.find(step=>step.slot===slot);
const makeNode=(step)=>({id:`PHEN-01:${step.slot}`,type:step.action,params:step.params,isComplete:false,progress:0,target:step.target,historyValues:[],increment(n=1){this.progress+=n;return true;},incrementDistinct(v,n=1){this._d??=new Set();if(!v||this._d.has(v))return false;this._d.add(v);this.progress+=n;return true;},pushHistoryValue(v){this.historyValues.push(v);return true;}});
const nTravel=makeNode(bySlot('reachPhenomenon'));
const nBlue=makeNode(bySlot('bluefoxReading'));
const nScout=makeNode(bySlot('scoutReading'));
// Le test Object-M0 commence après l'arrivée : le voyage est déjà réellement validé.
nTravel.progress=1; nTravel.isComplete=true;
let available=[nBlue];
const nodes=[nTravel,nBlue,nScout];
const tree={id:'PHEN-01',root:{walk(cb){nodes.forEach(cb);}},availableLeaves(){return available;},find(id){return nodes.find(n=>n.id===id)||null;},refresh(){if(nBlue.progress>=1) available=[nScout];}};
const manager=new Missions.MissionManager();manager.trees=new Map([['PHEN-01',tree]]);manager.currentAction=null;manager.ensureLifecycle=()=>({status:'active'});
const processed=new Set();manager.memory={hasProcessedObjectEvent:id=>processed.has(id),markProcessedObjectEvent:id=>processed.add(id),getFact(){return null;},saveTree(){},remember(){},save(){}};manager.syncLifecycleFromTrees=()=>{};manager.reevaluatePendingActivations=()=>{};manager.catalogController={schedule(){}};manager.publish=()=>{};

const blue={id:'blue-1',type:'OBJECT_INSPECTED',objectId:'PHEN-FOG',instanceId:'fog-instance-1',mapId:'map-a',tags:[],detail:{interactionSource:'manual',cuoType:'fog_bank',kind:'fog_bank',subject:'climate'}};
manager.consumeObjectEvent(blue);
assert.equal(nBlue.progress,1,'BlueFox doit valider sa propre lecture');
tree.refresh();
const wrong={id:'scout-wrong',type:'OBJECT_SEEN',objectId:'PHEN-FOG',instanceId:'fog-instance-2',mapId:'map-a',tags:['drone-scouted'],detail:{interactionSource:'drone',droneType:'scout_drone',cuoType:'fog_bank',kind:'fog_bank',subject:'climate',tags:['drone-scouted']}};
manager.consumeObjectEvent(wrong);
assert.equal(nScout.progress,0,'un autre brouillard ne doit pas satisfaire la relation SAME-INSTANCE');
const same={...wrong,id:'scout-same',instanceId:'fog-instance-1'};
manager.consumeObjectEvent(same);
assert.equal(nScout.progress,1,'le Scout doit valider le même phénomène observé par BlueFox');
console.log('PASS R-PHEN-2A Object-M0 same-instance Scout propagation');
