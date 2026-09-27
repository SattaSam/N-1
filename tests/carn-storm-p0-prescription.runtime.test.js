const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'..');
async function scenario(mission,meta){
 const listeners={};let captured=null;
 const window={BlueFox3D:{},addEventListener:(t,f)=>listeners[t]=f,removeEventListener(){},performance:{now:()=>0},Math,Date};window.window=window;const BF=window.BlueFox3D;
 BF.BibleCatalog=mission?[mission]:[];BF.Missions={ActionType:{TRAVEL:'travel'},normalizeActionType:v=>String(v||'').toLowerCase()};BF.getAutonomyMode=()=> 'full';
 const state=mission?{[mission.id]:{status:'active'}}:{};
 const travelNode=mission?{id:`${mission.id}:travel`,type:'travel',target:mission.__target||1,progress:0,isComplete:false,params:{eventDriven:true}}:null;
 const manager={memory:{state:{missionLifecycle:state},getFact:()=>null,setFact(){},save(){}},trees:new Map(mission?[[mission.id,{availableLeaves:()=>[travelNode]}]]:[]),primaryMissionId:mission?.id||'',activeMissionId:mission?.id||''};
 const engine={currentMapId:'origin',missionManager:manager,worldTopology:{targetFrom:()=>null},transitioning:false,pendingGate:null,pendingInteraction:null,currentRoutine:null,navigationRoute:[],callbacks:{onStatus(){}},clearPersistentNavigationIntent(){},generateUnknownPassage:async()=>{captured={ctx:BF.__pendingBibleMapGenerationContext?JSON.parse(JSON.stringify(BF.__pendingBibleMapGenerationContext)):null,prescription:BF.__pendingBibleMapGeneration?JSON.parse(JSON.stringify(BF.__pendingBibleMapGeneration)):null};return false;}};
 BF.maps={origin:{id:'origin',exits:{}}};BF.mount=async()=>engine;
 const ctx=vm.createContext({window,console,performance:window.performance,Math,Date});vm.runInContext(fs.readFileSync(path.join(root,'engine/bible-map-prescription-v19.js'),'utf8'),ctx);const mounted=await BF.mount();await mounted.generateUnknownPassage('north',meta||{});assert.equal(BF.__pendingBibleMapGenerationContext,null);return captured;
}
(async()=>{
 let c=await scenario(null,{});assert.equal(c.ctx.intent,'free-exploration');assert.equal(c.ctx.opportunisticEncounterEligible,true);assert.equal(c.prescription,null);
 const shortTransit={id:'SHORT',navigation:{repeatUnknownTravelUntilComplete:true},__target:3};c=await scenario(shortTransit,{bibleMissionId:'SHORT'});assert.equal(c.ctx.intent,'mission-directed');assert.equal(c.ctx.opportunisticEncounterEligible,false);assert.equal(c.ctx.longMissionTransit,false);
 const transit={id:'TRANSIT',navigation:{repeatUnknownTravelUntilComplete:true},__target:5};c=await scenario(transit,{bibleMissionId:'TRANSIT'});assert.equal(c.ctx.intent,'mission-transit');assert.equal(c.ctx.opportunisticEncounterEligible,true);assert.equal(c.ctx.longMissionTransit,true);assert.equal(c.ctx.remainingTravel,5);assert.equal(c.prescription,null);
 const dest={id:'DEST',mapGeneration:{biome:'forest'},__target:1};c=await scenario(dest,{bibleMissionId:'DEST'});assert.equal(c.ctx.intent,'mission-destination');assert.equal(c.ctx.opportunisticEncounterEligible,false);assert.equal(c.prescription.missionId,'DEST');
 console.log('PASS P0 prescription contexts free/transit/destination');
})().catch(e=>{console.error(e);process.exit(1)});
