(function(global){
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{},music=BF.music,cat=BF.MusicCatalogV1||global.BlueFoxMusicCatalogV1;
if(!music||!cat){console.warn("[BlueFox Music Bridge] moteur musical absent");return;}
const VERSION="1.3.0",leases=new Map(),listeners=[],objectTimes=[],activityHistory=[];
const ACTIVITY_WINDOW_MS=5*60*1000,STREAK_REQUIRED=3,DOMINANCE_MIN_ACTIONS=6,DOMINANCE_SHARE=.5,DOMINANCE_LEASE_MS=150000;
const SPECIAL_MAP_LEASE_MS=4*60*1000,SPECIAL_INTEREST_LEASE_MS=3*60*1000;
let current=null,timer=null,lastMission=null,lastReason="initialization",lastSignalKey=null,currentMapId=null,lastActivity=null,lastMissionCueKey=null,specialMapId=null;
const now=()=>Date.now(),lower=v=>String(v||"").toLowerCase();
const priorities={ambient:10,mission:40,interaction:55,action:75,danger:90,narrative:100};

function on(type,handler){global.addEventListener(type,handler);listeners.push([type,handler]);}
function lease(source,context,priority,durationMs,reason){
 if(!cat.contextProfiles[context])return false;
 leases.set(source,{source,context,priority,expiresAt:durationMs===Infinity?Infinity:now()+durationMs,reason});
 lastReason=reason||source;evaluate();return true;
}
function release(source){const changed=leases.delete(source);if(changed)evaluate();return changed;}
function activeLeases(){const time=now();for(const [key,item] of leases)if(item.expiresAt!==Infinity&&item.expiresAt<=time)leases.delete(key);return [...leases.values()].sort((a,b)=>b.priority-a.priority||b.expiresAt-a.expiresAt);}
function activityProfile(kind){
 if(kind==="relic")return{context:cat.contexts.ARCHAEOLOGY,axis:"research",reason:"activity-relic"};
 if(kind==="research")return{context:cat.contexts.RESEARCH,axis:"research",reason:"activity-research"};
 if(kind==="collection")return{context:cat.contexts.EXPLORATION_SIGNIFICANT,axis:"collection",reason:"activity-collection"};
 if(kind==="observation")return{context:cat.contexts.EXPLORATION_CALM,axis:"exploration",reason:"activity-observation"};
 return null;
}
function cue(id,reason,force=false){return music.playCue?.(id,{reason,force})||false;}
function hasAny(labels,pattern){return labels.some(value=>pattern.test(value));}
function collectionCue(labels){
 if(hasAny(labels,/plant|flora|fiber|fibre|spore|moss|mousse|mushroom|champignon|fern|fougere|vine|liane|cactus|tree|arbre|wood|bois/))return"collection.plant";
 if(hasAny(labels,/mineral|minerai|ore|crystal|cristal|rock|roche|basalt|ferrite|iridium|magnet/))return"collection.mineral";
 return"collection.generic";
}
function mapSpecialProfile(mapId){
 const map=BF.maps?.[mapId]||{},traits=(map.traits||[]).flatMap(item=>[item?.id,item?.label]).map(lower),generator=map.generator||{};
 const scenes=[...(generator.featuredMicroSceneIds||[]),...(generator.microSceneIds||[])].map(lower);
 const text=[map.name,map.profile,map.description,...traits,...scenes].map(lower).join(" ");
 return{special:/anomal|phenomen|phénom|mystery|curiosity|msc-custom/.test(text)||scenes.some(id=>id.includes("msc-custom")),map,traits,scenes};
}
function renewSpecialMapInterest(labels=[]){
 if(!specialMapId||currentMapId!==specialMapId)return false;
 if(labels.length&&!hasAny(labels,/anomal|phenomen|phénom|relic|ruin|micro.?scene|msc-custom|curiosity|mystery/))return false;
 lease("special-map",cat.contexts.DANGER,priorities.action+3,SPECIAL_INTEREST_LEASE_MS,"special-map-interest");return true;
}
function pruneActivity(){const cutoff=now()-ACTIVITY_WINDOW_MS;while(activityHistory.length&&activityHistory[0].at<cutoff)activityHistory.shift();}
function activitySnapshot(){
 pruneActivity();const counts={collection:0,observation:0,relic:0,research:0};
 activityHistory.forEach(item=>{counts[item.kind]=(counts[item.kind]||0)+1;});
 const total=activityHistory.length,dominant=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0]||null;
 return{windowMs:ACTIVITY_WINDOW_MS,total,counts,dominant,share:dominant&&total?counts[dominant]/total:0,streak:lastActivity?.streak||0,lastKind:lastActivity?.kind||null,mapId:currentMapId};
}
function registerActivity(kind,event){
 const time=now(),mapId=event.mapId||event.detail?.mapId||currentMapId||null;
 if(currentMapId&&mapId&&mapId!==currentMapId){activityHistory.length=0;lastActivity=null;}
 if(mapId)currentMapId=mapId;
 const streak=lastActivity?.kind===kind?lastActivity.streak+1:1;
 lastActivity={kind,streak,at:time};activityHistory.push({kind,at:time,mapId:currentMapId});pruneActivity();
 const profile=activityProfile(kind);
 if(profile&&streak>=STREAK_REQUIRED)lease("activity-streak",profile.context,priorities.mission,90000,profile.reason+"-streak");
 const snapshot=activitySnapshot(),dominantProfile=activityProfile(snapshot.dominant);
 if(dominantProfile&&snapshot.total>=DOMINANCE_MIN_ACTIONS&&snapshot.share>DOMINANCE_SHARE)
  lease("activity-dominant",dominantProfile.context,priorities.mission+2,DOMINANCE_LEASE_MS,dominantProfile.reason+"-dominant");
 evaluate();
}
function actionContext(action){
 const value=lower(action);
 if(/rest|eat|food|sleep/.test(value))return cat.contexts.REST;
 if(/analy|research/.test(value))return cat.contexts.RESEARCH;
 if(/inspect|observe|scan/.test(value))return cat.contexts.ARCHAEOLOGY;
 if(/build|craft|construct|repair/.test(value))return cat.contexts.CRAFT;
 if(/run|escape|danger|fight/.test(value))return cat.contexts.ACTION_DYNAMIC;
 return null;
}
function baseline(){
 const action=lastMission?.currentAction?.type;
 const missionContext=actionContext(action);
 if(missionContext)return{context:missionContext,priority:priorities.mission,reason:"mission-action:"+action};
 return{context:cat.contexts.EXPLORATION_CALM,priority:priorities.ambient,reason:"ambient-exploration"};
}
function bacSignal(winner){
 const d=BF.getBACDiagnostics?.()||BF.BAC?.getDiagnostics?.()||{},decision=d.lastDecision||{},survival=d.survival||BF.getSurvivalState?.()||{};
 const activityKind=String(winner.reason||"").match(/^activity-(collection|observation|relic|research)/)?.[1];
 const axis=(activityKind&&activityProfile(activityKind)?.axis)||decision.axis||({research:"research",archaeology:"research",craft:"research",civilization:"relations",rest:"survival",danger:"survival"}[winner.context])||"exploration";
 const recent=objectTimes.filter(at=>at>=now()-8000).length;
 let activation=recent>=4?4:recent>=2?2:0;
 if(Number(decision.at)>0&&now()-Number(decision.at)<45000)activation=Math.max(activation,1);
 if(lastMission?.currentAction)activation=Math.max(activation,2);
 if(winner.priority>=priorities.action)activation=Math.max(activation,4);
 if(winner.priority>=priorities.danger||survival.needs?.criticalRest)activation=5;
 const event=winner.context===cat.contexts.MAP_DISCOVERY?"map_discovery":null;
 if(event==="map_discovery")activation=3;
 return{axis,activation,event,decisionAt:Number(decision.at)||0};
}
function evaluate(){
 if(BF.currentEngine?.transitioning)return;
 const winner=activeLeases()[0]||baseline(),key=winner.context+"|"+winner.priority;
 const signal=bacSignal(winner),signalKey=[signal.axis,signal.activation,signal.event,signal.decisionAt].join("|");
 const contextChanged=key!==current,signalChanged=signalKey!==lastSignalKey;
 if(!contextChanged&&!signalChanged)return;
 if(signalChanged){lastSignalKey=signalKey;music.setMusicalState?.({...signal,defer:contextChanged,advisory:true});}
 if(contextChanged){current=key;lastReason=winner.reason;music.setContext(winner.context,{priority:winner.priority,source:"gameplay-bridge",reason:winner.reason});}
 global.dispatchEvent?.(new CustomEvent("bluefox:music-context-resolved",{detail:{...winner,version:VERSION}}));
}
function tags(event){return[...(event.tags||[]),event.category,event.family,event.knowledgeFamily,event.objectId,event.inventoryKey,event.detail?.kind,event.detail?.subject,event.detail?.cuoType,event.detail?.label,event.detail?.microSceneId].map(lower).filter(Boolean);}
function onObject(event){
 const e=event.detail||{},type=e.type,labels=tags(e);
 objectTimes.push(now());while(objectTimes.length&&objectTimes[0]<now()-8000)objectTimes.shift();
 const relic=labels.some(v=>/ruin|relic|artefact|artifact|technology|ancient|civilization|micro.?scene/.test(v));
 const civilization=labels.some(v=>/civilization|civilisation|contact|ancient.?city|cite|cité/.test(v));
 const phenomenon=type==="PHENOMENON_OBSERVED"||labels.some(v=>/phenomen|phénom|anomal|danger|storm|cyclone/.test(v));
 if(["RESOURCE_COLLECTED","RESOURCE_EXTRACTED"].includes(type)){cue(collectionCue(labels),"resource-collection");registerActivity("collection",e);}
 else if(relic&&["OBJECT_SEEN","OBJECT_INSPECTED","OBJECT_ANALYZED","PHENOMENON_OBSERVED","KNOWLEDGE_ACQUIRED"].includes(type)){
  const cueId=civilization&&type==="KNOWLEDGE_ACQUIRED"?"civilization.major":type==="OBJECT_SEEN"?"relic.detected":type==="OBJECT_INSPECTED"?"relic.intermediate":type==="KNOWLEDGE_ACQUIRED"?"research.complete":"relic.active";
  cue(cueId,"relic-interaction");registerActivity("relic",e);
 }
 else if(type==="OBJECT_ANALYZED"||type==="KNOWLEDGE_ACQUIRED"){cue(type==="KNOWLEDGE_ACQUIRED"?"research.complete":"research.notes","research-interaction");registerActivity("research",e);}
 else if(["OBJECT_SEEN","OBJECT_INSPECTED","PHENOMENON_OBSERVED"].includes(type)){cue(phenomenon?"curiosity.subtle":"observation.quiet","observation");registerActivity("observation",e);}
 else if(["OBJECT_CRAFTED","OBJECT_BUILT","OBJECT_REPAIRED"].includes(type))lease("craft",cat.contexts.CRAFT,priorities.interaction,60000,"craft-interaction");
 if(phenomenon||relic)renewSpecialMapInterest(labels);
}
function onMission(event){
 lastMission=event.detail||null;const action=lower(lastMission?.currentAction?.type),key=[lastMission?.id||lastMission?.missionId||"",action].join("|");
 if(action&&key!==lastMissionCueKey){
  lastMissionCueKey=key;
  if(/run|escape|danger|fight/.test(action))cue("dynamic.priority","mission-priority");
  else if(/analy|research/.test(action))cue("research.notes","mission-priority");
  else if(/inspect|observe|scan/.test(action))cue("relic.intermediate","mission-priority");
  else if(/collect|extract/.test(action))cue("collection.generic","mission-priority");
 }
 evaluate();
}
function onTransition(event){
 const detail=event.detail||{};
 activityHistory.length=0;lastActivity=null;currentMapId=detail.mapId||detail.toMapId||detail.destinationMapId||null;release("activity-streak");release("activity-dominant");
 const special=mapSpecialProfile(currentMapId);
 if(special.special){specialMapId=currentMapId;cue("dynamic.priority","special-map-arrival",true);lease("special-map",cat.contexts.DANGER,priorities.action+3,SPECIAL_MAP_LEASE_MS,"special-map-dynamics");}
 else{specialMapId=null;release("special-map");if(detail.isNew)cue("curiosity.subtle","new-map-arrival",true);}
 lease("map-arrival",detail.isNew?cat.contexts.MAP_DISCOVERY:cat.contexts.EXPLORATION_SIGNIFICANT,detail.isNew?88:60,detail.isNew?24000:14000,detail.isNew?"new-map-discovery":"known-map-arrival");
}
function onMilestone(event){
 const d=event.detail||{},context=d.type==="expertise"?cat.contexts.RESEARCH:cat.contexts.EXPLORATION_SIGNIFICANT;
 lease("map-milestone",context,70,85000,"map-"+(d.type||"milestone")+"-"+(d.threshold??""));
}
function onSurvival(event){
 const detail=event.detail||{},reason=lower(detail.reason),state=detail.state||{};
 if(reason.includes("hazard")){cue("dynamic.priority","hazard",true);lease("hazard",cat.contexts.DANGER,priorities.danger,60000,detail.reason);}
 else if(state.needs?.criticalRest||Number(state.energy)<20)lease("critical-rest",cat.contexts.REST,85,90000,"critical-rest");
 else if(state.needs?.rest||Number(state.energy)<38)lease("rest",cat.contexts.REST,65,60000,"rest-needed");
 else{release("critical-rest");release("rest");}
}
function onVisibility(){
 if(global.document?.hidden)music.stop();else if(music.unlocked&&music.settings.enabled)music.start();
}
on("bluefox:object-event",onObject);on("bluefox:mission-state",onMission);on("bluefox:map-transition-completed",onTransition);
on("bluefox:map-milestone",onMilestone);on("bluefox:survival-changed",onSurvival);global.document?.addEventListener?.("visibilitychange",onVisibility);
timer=global.setInterval(evaluate,500);evaluate();

BF.MusicGameplayBridge=Object.freeze({
 version:VERSION,priorities,
 setTemporaryContext:(source,context,priority=55,durationMs=60000,reason="external")=>lease(source,context,priority,durationMs,reason),
 releaseContext:release,
 getDiagnostics:()=>({version:VERSION,current,lastReason,leases:activeLeases(),baseline:baseline(),activity:activitySnapshot(),specialMapId,thresholds:{streak:STREAK_REQUIRED,dominanceMinActions:DOMINANCE_MIN_ACTIONS,dominanceShare:DOMINANCE_SHARE,windowMs:ACTIVITY_WINDOW_MS,specialMapLeaseMs:SPECIAL_MAP_LEASE_MS}}),
 dispose:()=>{if(timer)global.clearInterval(timer);listeners.forEach(([type,handler])=>global.removeEventListener(type,handler));global.document?.removeEventListener?.("visibilitychange",onVisibility);leases.clear();}
});
BF.getMusicBridgeDiagnostics=()=>BF.MusicGameplayBridge.getDiagnostics();
})(window);
