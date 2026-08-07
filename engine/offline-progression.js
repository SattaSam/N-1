(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const LAST_SESSION_END_KEY="bluefox_last_session_end_v1";
  const LAST_RECONCILIATION_KEY="bluefox_last_offline_reconciliation_v1";
  const MIN_OFFLINE_MS=2*60*1000,MAX_OFFLINE_MS=8*60*60*1000,MAX_ACTIONS=100,ACTION_INTERVAL_MS=5*60*1000;
  const readJson=(k,f={})=>{try{return JSON.parse(global.localStorage.getItem(k)||"null")??f;}catch{return f;}};
  const mapId=()=>readJson("bluefox_world_position_v2",{}).map||"crystal";
  const resources=()=>{const p=BF.progression?.snapshot?.()||readJson("bluefox_progression_registry_v1",{});return [...new Set([...Object.keys(p.inventory||{}),...Object.keys(p.campStorage||{}),"crystal","fiber","parts"])];};
  const logSummary=text=>BF.addJournalEntry?.({id:`offline-summary-${Date.now()}`,at:Date.now(),type:"offline_progress",title:"Reprise de l’expédition",text,important:true,mapId:mapId()});
  const observe=(i,m)=>BF.progression?.consume?.({id:`offline-observe-${Date.now()}-${i}`,type:BF.ObjectEvents?.types?.OBJECT_SEEN||"object_seen",quantity:1,mapId:m,objectId:`offline-observation-${i%12}`,instanceId:`offline-${m}-observation-${i}`,progression:{mapExpertise:1},detail:{offline:true},at:Date.now()});
  const collect=(i,m,list)=>{const key=list[i%list.length]||"crystal";BF.progression?.consume?.({id:`offline-collect-${Date.now()}-${i}`,type:BF.ObjectEvents?.types?.RESOURCE_COLLECTED||"resource_collected",quantity:1,family:key,inventoryKey:key,mapId:m,objectId:`offline-resource-${key}`,instanceId:`offline-${m}-${key}-${i}`,detail:{offline:true,inventoryKey:key,kind:key},at:Date.now()});return key;};
  const run=()=>{
    const now=Date.now(),start=Math.max(Number(global.localStorage.getItem(LAST_SESSION_END_KEY))||0,Number(global.localStorage.getItem(LAST_RECONCILIATION_KEY))||0),elapsed=now-start;
    if(!start||elapsed<MIN_OFFLINE_MS){global.localStorage.setItem(LAST_RECONCILIATION_KEY,String(now));return {applied:false};}
    const effective=Math.min(elapsed,MAX_OFFLINE_MS),count=Math.min(MAX_ACTIONS,Math.max(1,Math.floor(effective/ACTION_INTERVAL_MS))),m=mapId(),list=resources();
    let observations=0,collections=0;
    for(let i=0;i<count;i++){if(Math.random()<0.32){collect(i,m,list);collections++;}else{observe(i,m);observations++;}}
    if(BF.survival?.state){const h=effective/3600000,s=BF.survival.state;s.rest=Math.min(100,Number(s.rest||0)+h*3);s.food=Math.max(0,Number(s.food||0)-count*.12);BF.survival.save?.();}
    const mins=Math.round(effective/60000),duration=mins>=60?`${Math.floor(mins/60)} h ${String(mins%60).padStart(2,"0")}`:`${mins} min`;
    logSummary(`Pendant votre absence de ${duration}, BlueFox a poursuivi ses activités locales : ${observations} observation${observations>1?"s":""} et ${collections} collecte${collections>1?"s":""}.`);
    global.localStorage.setItem(LAST_RECONCILIATION_KEY,String(now));global.localStorage.setItem(LAST_SESSION_END_KEY,String(now));
    const result={applied:true,actionCount:count,observations,collections,durationMs:effective,mapId:m};global.dispatchEvent(new CustomEvent("bluefox:offline-progress",{detail:result}));return result;
  };
  const boot=()=>{if(!BF.progression||!BF.survival)return global.setTimeout(boot,100);BF.offlineProgressionResult=run();};
  BF.runOfflineProgression=run;boot();
})(window);
