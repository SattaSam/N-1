const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const store={},listeners={},events=[];
const defs={hub:{id:'hub',name:'Hub'},b:{id:'b',name:'B'},c:{id:'c',name:'C'},d:{id:'d',name:'D'},e:{id:'e',name:'E'}};
const beacon=(id,x)=>({instanceId:`${id}:beacon`,contextRole:'deployed_beacon',kind:'deployed_beacon',persistent:true,anchor:{x,y:0,z:x}});
const records={hub:[{instanceId:'hub:astro',microSceneId:'MSC-CUSTOM-ASTROLOGY',contextRole:'teleporter_anchor',kind:'teleporter_site',persistent:true,anchor:{x:0,y:0,z:0}}],b:[beacon('b',10)],c:[beacon('c',20)],d:[beacon('d',30)],e:[beacon('e',40)]};
const slotState={
  'TP-10:assemble':{progress:0,requires:[]},
  'TP-11:calibrateNetwork':{progress:0,requires:[]},
  'TP-11:inertTransfer':{progress:0,requires:['TP-11:calibrateNetwork']},
  'TP-11:outbound':{progress:0,requires:['TP-11:inertTransfer']},
  'TP-11:returnHub':{progress:0,requires:['TP-11:outbound']}
};
const inventory={magnetic_ore:70,energy_crystal:30,parts:50,core:20,fiber:100,accumulator:10,biocapital:50};
const engine={currentMapId:'hub',discoveredMaps:new Set(['hub','b','c','d','e']),character:{root:{position:{x:0,y:0,z:0}},target:null},currentMap:{group:null},transitioning:false,pendingInteraction:null,currentRoutine:null,pendingZoneExploration:null,pendingGate:null};
const Missions={ActionType:{COLLECT:'collect',EXTRACT:'extract',EXPLORE_ZONE:'explore-zone',RESEARCH:'research',OBSERVE:'observe',REST:'rest',EAT:'eat',TRAVEL:'travel'},normalizeActionType:x=>String(x||'').toLowerCase()};
const BF={Missions,maps:defs,currentEngine:engine,PersistentMicroScenes:{list(def){return records[def.id]||[]}},MicroScenes:{get(){return {radius:6,objects:[{type:'eroded_monolith',offset:[5,0,0]},{type:'eroded_monolith',offset:[-5,0,0]}]}}},ObjectEvents:{subscribe(){return()=>{}},types:{}},availableInventory:k=>inventory[k]||0};
const w={BlueFox3D:BF,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},addEventListener(t,f){(listeners[t]||=[]).push(f)},dispatchEvent(e){events.push(e)},CustomEvent:class{constructor(type,o={}){this.type=type;this.detail=o.detail}},setTimeout(fn){fn();return 0},Date,Math,console};w.window=w;
vm.runInNewContext(fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8'),w);
vm.runInNewContext(fs.readFileSync(path.join(root,'engine/mission-planner.js'),'utf8'),w);
const catalog=new Map(BF.BibleCatalog.map(m=>[m.id,m]));
const tp10=catalog.get('TP-10'),tp11=catalog.get('TP-11');
const makeNode=(mission,slot)=>{const step=mission.sequence.find(s=>s.slot===slot);return{id:`${mission.id}:${slot}`,title:step.title,type:step.action,target:step.target,progress:0,params:{...step.params},createdAt:1}};
const planner=new BF.Missions.MissionPlanner({getFact(){return null}});
const context={canRoutine:true,resources:{},unexploredZones:1,explorationPercent:10,needs:{}};
for(const [mission,slot] of [[tp10,'assemble'],[tp11,'calibrateNetwork'],[tp11,'inertTransfer']]){
  const node=makeNode(mission,slot);
  assert.equal(node.params.catalogManaged,true);
  assert.equal(node.params.eventDriven,true,`${mission.id}:${slot} doit être événementiel`);
  assert.equal(planner.nextAction({availableLeaves:()=>[node]},context),null,`${mission.id}:${slot} ne doit jamais devenir une routine research`);
  assert.equal(slotState[`${mission.id}:${slot}`].progress,0);
}
BF.bibleRuntime={progressRuntimeValidationSlot(missionId,slot){const key=`${missionId}:${slot}`,state=slotState[key];if(!state||state.progress>=1)return false;if(!state.requires.every(req=>slotState[req]?.progress>=1))return false;state.progress=1;return true;}};
engine.missionManager={memory:{state:{missionLifecycle:{'TP-10':{status:'active'},'TP-11':{status:'active'}}}},currentAction:null};
vm.runInNewContext(fs.readFileSync(path.join(root,'engine/special-object-runtime.js'),'utf8'),w);
const rt=BF.SpecialObjectRuntime;
assert.equal(rt.activateTeleporter(),true,'activateTeleporter doit être l’autorité TP-10');
assert.equal(slotState['TP-10:assemble'].progress,1);
assert.equal(slotState['TP-11:calibrateNetwork'].progress,0);
assert.equal(slotState['TP-11:inertTransfer'].progress,0);
(async()=>{
  assert.equal(await rt.calibrateTeleporter('b'),true,'calibrateTeleporter doit être l’autorité TP-11 calibration/transfert inerte');
  assert.equal(slotState['TP-11:calibrateNetwork'].progress,1);
  assert.equal(slotState['TP-11:inertTransfer'].progress,1);
  let active='outbound';
  const mkTravelNode=(slot,direction)=>({id:`TP-11:${slot}`,isComplete:false,progress:0,target:1,params:{eventDriven:true,direction,transitionSource:'teleporter',transitionMode:'teleport',distinctBy:'transition'},type:'travel',incrementDistinct(){this.progress=1;this.isComplete=true;slotState[`TP-11:${slot}`].progress=1;return true}});
  const outbound=mkTravelNode('outbound','teleport-outbound'),ret=mkTravelNode('returnHub','teleport-return');
  const tree={availableLeaves:()=>active==='outbound'?[outbound]:[ret],refresh(){},find(id){return id.endsWith('outbound')?outbound:ret}};
  const manager={trees:new Map([['TP-11',tree]]),ensureLifecycle(){return{status:'active'}},memory:{saveTree(){},save(){},getFact(){return null},setFact(){}},definition(){return{sequence:tp11.sequence}},syncLifecycleFromTrees(){},reevaluatePendingActivations(){},catalogController:{schedule(){}},publish(){}};
  engine.missionManager=manager;
  vm.runInNewContext(fs.readFileSync(path.join(root,'engine/travel-cycle-bridge.js'),'utf8'),w);
  BF.progressTravelCycleMissions({fromMapId:'hub',toMapId:'b',direction:'teleport-outbound',source:'gate',mode:'teleport',isNew:false});
  assert.equal(slotState['TP-11:outbound'].progress,0,'une gate ne doit pas valider outbound');
  BF.progressTravelCycleMissions({fromMapId:'hub',toMapId:'b',direction:'teleport-outbound',source:'teleporter',mode:'teleport',isNew:false});
  assert.equal(slotState['TP-11:outbound'].progress,1);
  active='return';
  BF.progressTravelCycleMissions({fromMapId:'b',toMapId:'hub',direction:'teleport-return',source:'teleporter',mode:'gate',isNew:false});
  assert.equal(slotState['TP-11:returnHub'].progress,0,'un mauvais mode ne doit pas valider le retour');
  BF.progressTravelCycleMissions({fromMapId:'b',toMapId:'hub',direction:'teleport-return',source:'teleporter',mode:'teleport',isNew:false});
  assert.equal(slotState['TP-11:returnHub'].progress,1);
  console.log('PASS R-TP-R2 autorité missionnelle : planner bloqué, SpecialObjectRuntime propriétaire, travel filtré');
})().catch(e=>{console.error(e);process.exit(1)});
