(function(global){
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{},cat=BF.MusicCatalogV1||global.BlueFoxMusicCatalogV1;
if(!cat){console.warn("[BlueFox Music] catalogue absent");return;}
const VERSION="1.4.3",KEY="bluefox_music_settings_v1",clamp=v=>Math.max(0,Math.min(1,Number(v)||0)),clock=()=>global.performance?.now?.()||Date.now();
const introOwnsAudio=()=>{
 const root=global.document?.documentElement;
 return Boolean(root?.classList?.contains("bluefox-first-launch-open")||root?.classList?.contains("bluefox-intro-open"));
};

const THEME_HOLD_BASE_MS=75000;
const THEME_HOLD_STRONG_MS=110000;
const THEME_SWITCH_STREAK=3;
function sequenceTheme(id){
 const key=String(id||"").toLowerCase();
 if(key.startsWith("active-"))return "active";
 if(key.includes("dynamics")||key.includes("dynamic")||key.includes("danger"))return "dynamics";
 if(key.includes("relic")||key.includes("archae")||key.includes("research"))return "relic";
 if(key.includes("motif"))return "motif";
 if(key.includes("main"))return "main";
 const sequence=sequenceById(id),firstRef=sequence?.[0],first=firstRef?resolveAnyStep(firstRef):null;
 const trackId=String(first?.track?.id||"").toLowerCase(),family=String(first?.track?.family||"").toLowerCase();
 if(trackId.includes("exploration")||key.includes("explore"))return "explore";
 if(["main","drift","relic","dynamics","motif"].includes(family))return family;
 if(key.includes("drift"))return "drift";
 return "other";
}
function roleCompatibility(fromRole,toRole){
 const from=String(fromRole||""),to=String(toRole||"");
 const matrix={
  intro:{development:18,loop:14,bridge:12,insert:5,outro:-20,intro:-8},
  development:{development:15,loop:13,bridge:10,outro:9,insert:3,intro:-12},
  loop:{loop:16,development:18,bridge:12,outro:6,insert:4,intro:-10},
  bridge:{development:20,loop:17,bridge:6,outro:7,insert:3,intro:-12},
  insert:{development:21,loop:16,bridge:13,outro:5,insert:-4,intro:-14},
  outro:{intro:15,development:12,loop:7,bridge:8,insert:2,outro:-12}
 };
 return matrix[from]?.[to]??0;
}
function themeCompatibility(fromTheme,toTheme){
 if(!fromTheme||!toTheme)return 0;
 if(fromTheme===toTheme)return 32;
 const pair=[fromTheme,toTheme].sort().join("|");
 return ({
  "drift|main":18,
  "drift|explore":24,
  "explore|main":18,
  "explore|relic":6,
  "active|explore":8,
  "dynamics|explore":6,
  "explore|motif":12,
  "main|relic":10,
  "drift|relic":5,
  "dynamics|main":7,
  "dynamics|relic":4,
  "active|main":16,
  "active|drift":8,
  "active|relic":2,
  "active|dynamics":6,
  "main|motif":18,
  "drift|motif":12,
  "motif|relic":14
 })[pair]??-12;
}
const activeTrack=(id,title,file,segments)=>Object.freeze({id,title,family:"main",file,contexts:Object.freeze([cat.contexts.EXPLORATION_SIGNIFICANT,cat.contexts.ACTION_DYNAMIC]),segments:Object.freeze(segments.map(Object.freeze))});
const activeSegment=(id,role,startSec,endSec,fadeSec,extra={})=>({id,role,startSec,endSec,fadeSec,...extra});
const ACTIVE_TRACKS=Object.freeze({
 "active.full":activeTrack("active.full","Bluefox Active Mashup","audio/music/BF_ACTIVE_MASHUP_FINAL_SYNC.mp3",[
  activeSegment("full","development",0,157.25,5.5,{protected:true,gain:.96}),
  activeSegment("entry-17","development",17.3,157.25,5.2,{protected:true,gain:.96}),
  activeSegment("entry-44","development",44,157.25,4.8,{protected:true,gain:.96}),
  activeSegment("exit-107","development",17.3,106.92,4.2,{gain:.96}),
  activeSegment("entry-102","development",102,157.25,4.5,{gain:.96}),
  activeSegment("outro-140","outro",140,157.25,4.5,{gain:.94})
 ]),
 "active.sample-a":activeTrack("active.sample-a","Active Groove Entry","audio/music/BF_ACTIVE_SAMPLE_A_GROOVE_CLEAN.mp3",[
  activeSegment("groove","insert",0,28.9,3.2,{secondary:true,gain:.96})
 ]),
 "active.sample-b":activeTrack("active.sample-b","Active Lead Development","audio/music/BF_ACTIVE_SAMPLE_B_LEAD_CLEAN.mp3",[
  activeSegment("lead","bridge",0,31.5,3.4,{secondary:true,gain:.96})
 ]),
 "active.sample-c":activeTrack("active.sample-c","Curious Interlude","audio/music/BF_ACTIVE_SAMPLE_C_CURIOUS_CLEAN.mp3",[
  activeSegment("curious","insert",0,23.8,4.2,{secondary:true,gain:.91})
 ])
});
const activeStep=(track,segment)=>Object.freeze({track,segment});
const ACTIVE_SEQUENCES=Object.freeze({
 "active-full":Object.freeze([activeStep("active.full","full")]),
 "active-entry-17":Object.freeze([activeStep("active.full","entry-17")]),
 "active-entry-44":Object.freeze([activeStep("active.full","entry-44")]),
 "active-short-development":Object.freeze([activeStep("active.full","exit-107")]),
 "active-groove":Object.freeze([activeStep("active.sample-a","groove")]),
 "active-lead":Object.freeze([activeStep("active.sample-b","lead")]),
 "active-collection-arc":Object.freeze([activeStep("active.sample-a","groove"),activeStep("active.full","entry-44")]),
 "active-exploration-arc":Object.freeze([activeStep("active.sample-a","groove"),activeStep("active.sample-b","lead"),activeStep("active.full","entry-17")]),
 "active-research-arc":Object.freeze([activeStep("active.sample-b","lead"),activeStep("active.full","entry-102")]),
 "active-groove-lead":Object.freeze([activeStep("active.sample-a","groove"),activeStep("active.sample-b","lead"),activeStep("active.full","entry-102")]),
 "active-lead-groove":Object.freeze([activeStep("active.sample-b","lead"),activeStep("active.sample-a","groove"),activeStep("active.full","outro-140")]),
 "active-curious-rare":Object.freeze([activeStep("active.sample-c","curious"),activeStep("active.sample-a","groove")])
});
const ACTIVE_PROFILES=Object.freeze({
 "active-full":{axes:["exploration","collection"],activation:2,penalty:3,long:true},
 "active-entry-17":{axes:["exploration","collection"],activation:2,penalty:0,long:true},
 "active-entry-44":{axes:["exploration","collection"],activation:3,penalty:1,long:true},
 "active-short-development":{axes:["exploration","collection","research"],activation:2,penalty:0,long:true},
 "active-groove":{axes:["collection","exploration"],activation:1,penalty:4},
 "active-lead":{axes:["research","exploration"],activation:2,penalty:4},
 "active-collection-arc":{axes:["collection"],activation:1,penalty:-8,long:true,mixed:true},
 "active-exploration-arc":{axes:["exploration","collection"],activation:2,penalty:-7,long:true,mixed:true},
 "active-research-arc":{axes:["research"],activation:2,penalty:-5,long:true,mixed:true},
 "active-groove-lead":{axes:["collection","exploration"],activation:3,penalty:-3,long:true,mixed:true},
 "active-lead-groove":{axes:["research","exploration","collection"],activation:3,penalty:-1,long:true,mixed:true},
 "active-curious-rare":{axes:["exploration"],activation:2,penalty:34,rare:true}
});
function activeSequence(id){return ACTIVE_SEQUENCES[id]||null;}
function sequenceById(id){return cat.sequences[id]||activeSequence(id);}
function resolveActiveStep(ref){const track=ACTIVE_TRACKS[ref.track],segment=track?.segments.find(item=>item.id===ref.segment);return track&&segment?{track,segment}:null;}
function resolveAnyStep(ref){return cat.resolveStep(ref)||resolveActiveStep(ref);}
function normalizedBACValue(value){const number=Number(value);return Number.isFinite(number)?clamp(number>1?number/100:number):0;}

class AdaptiveMusicEngine{
 constructor(options={}){
  this.audioFactory=options.audioFactory||(()=>new global.Audio());
  this.decks=[this.deck("A"),this.deck("B")];this.active=-1;this.context=cat.contexts.EXPLORATION_CALM;this.priority=10;
  this.sequenceId=null;this.sequence=[];this.index=0;this.repeats=0;this.history=[];this.pending=null;this.started=false;this.unlocked=false;this.disposed=false;
  this.signal={axis:"exploration",activation:0,event:null,decisionAt:0};this.lastSignalChange=0;this.activityStreak={axis:"exploration",count:0,lastAt:0};this.themeHold={theme:null,axis:null,until:0,strength:0};
  this.currentTheme=null;this.themeStartedAt=null;this.themeHistory=[];this.perceptualRun={key:null,count:0};
  this.timer=null;this.fadeTimer=null;this.pendingTimer=null;this.retryTimer=null;this.retryCount=0;this.transitioningAudio=false;this.playGeneration=0;this.segmentStartedAt=0;this.sequenceStartedAt=0;this.lastTransition=null;this.lastError=null;this.settings=this.loadSettings();
  this.cueAudio=this.audioFactory();this.cueAudio.preload="auto";this.cueAudio.loop=false;this.cueAudio.volume=0;this.cueBusyUntil=0;this.cueHistory=[];this.lastCueFile=new Map();this.lastCue=null;this.cueEnvelopeTimer=null;this.cueEnvelopeGeneration=0;
  this.cueAudio.addEventListener?.("ended",()=>this.clearCueEnvelope());
  this.onUnlock=()=>this.unlock();this.onContext=e=>this.setContext(e.detail?.context,e.detail||{});this.onSoundVolume=()=>{if(this.lastCue)this.cueAudio.volume=this.cueVolume(this.lastCue.entry,this.lastCue.variationDb||0);};
  global.addEventListener?.("pointerdown",this.onUnlock,{once:true,passive:true});global.addEventListener?.("keydown",this.onUnlock,{once:true});
  global.addEventListener?.("bluefox:music-context",this.onContext);global.addEventListener?.("bluefox:sound-volume",this.onSoundVolume);
 }
 deck(name){const audio=this.audioFactory(),deck={name,audio,token:0,step:null};audio.preload="auto";audio.loop=false;audio.volume=0;audio.addEventListener?.("ended",()=>this.onAudioEnded(deck));audio.addEventListener?.("error",()=>this.onAudioError(deck));return deck;}
 onAudioEnded(deck){if(!this.started||this.transitioningAudio||this.decks[this.active]!==deck)return;this.clearTimer();this.advance();}
 onAudioError(deck){if(!this.started||this.transitioningAudio||this.decks[this.active]!==deck)return;this.lastError="audio-error:"+(deck.audio.error?.code||"unknown");global.clearTimeout(this.retryTimer);this.retryTimer=global.setTimeout(()=>this.playCurrent(1),300);}
 loadSettings(){try{const s=JSON.parse(global.localStorage?.getItem(KEY)||"null");return{enabled:s?.enabled!==false,volume:clamp(s?.volume??.72)};}catch{return{enabled:true,volume:.72};}}
 saveSettings(){global.localStorage?.setItem(KEY,JSON.stringify(this.settings));}
 setEnabled(v){this.settings.enabled=!!v;this.saveSettings();if(!v)this.stop(.5);else if(this.unlocked)this.start();}
 setVolume(v){this.settings.volume=clamp(v);this.saveSettings();if(this.active>=0)this.decks[this.active].audio.volume=this.targetVolume(this.decks[this.active].step);if(this.lastCue)this.cueAudio.volume=this.cueVolume(this.lastCue.entry,this.lastCue.variationDb||0);}
 bacSnapshot(){const p=BF.BAC?.readProfile?.()||{},d=BF.getBACDiagnostics?.()||BF.BAC?.getDiagnostics?.()||{},relation=d.relation||{};return{priorities:p.priorities||{},emotions:relation.emotions||d.emotions||{},relation,lastDecision:d.lastDecision||null};}
 bacControlMode(){
  const bac=this.bacSnapshot(),relation=bac.relation||{},now=Date.now();
  const suggestion=relation.lastPlayerSuggestion||relation.pendingSuggestion||null;
  const suggestionAt=Number(suggestion?.at||suggestion?.createdAt||suggestion?.requestedAt||0);
  const suggestionAge=suggestionAt?now-suggestionAt:Infinity;
  const decision=bac.lastDecision||{};
  const source=String(decision.source||decision.reason||decision.id||"").toLowerCase();
  const playerDecision=/player|joueur|suggest|command|manual|guided/.test(source);
  const recentPlayerSignal=suggestionAge<=120000||playerDecision;
  const axis=this.signal.axis||"exploration",activation=Math.max(0,Math.min(5,Number(this.signal.activation)||0));
  if(recentPlayerSignal)return{mode:"semi-pilot",recentPlayerSignal:true,suggestionAgeMs:Number.isFinite(suggestionAge)?suggestionAge:null,source:source||null};
  if(axis==="collection"&&activation>=2)return{mode:"autonomous-focused-collection",recentPlayerSignal:false,suggestionAgeMs:Number.isFinite(suggestionAge)?suggestionAge:null,source:source||null};
  return{mode:"autonomous-mixed",recentPlayerSignal:false,suggestionAgeMs:Number.isFinite(suggestionAge)?suggestionAge:null,source:source||null};
 }
 targetVolume(step){if(!step)return 0;const intensity=cat.computeIntensity(this.context,step.track.family,this.bacSnapshot()),level=.86+intensity*.08,gain=.94+((step.segment.gain||1)-1)*.25;return clamp(this.settings.volume*level*gain);}
 cueVolume(entry,variationDb=0){const soundVolume=clamp(BF.getSoundVolume?.()??BF.AudioSettings?.soundVolume??.8);return clamp(soundVolume*Number(entry?.gain||.7)*Math.pow(10,variationDb/20));}
 clearCueEnvelope(){if(this.cueEnvelopeTimer)global.clearInterval(this.cueEnvelopeTimer);this.cueEnvelopeTimer=null;this.cueEnvelopeGeneration++;}
 scheduleCueEnvelope(entry,file,baseVolume){
  const envelope=entry.fileEnvelopes?.[file],fadeStart=Number(envelope?.fadeOutStartSec),end=Number(envelope?.endSec);
  if(!Number.isFinite(fadeStart)||!Number.isFinite(end)||fadeStart<0||end<=fadeStart)return false;
  this.clearCueEnvelope();const generation=this.cueEnvelopeGeneration;
  this.cueEnvelopeTimer=global.setInterval(()=>{
   if(generation!==this.cueEnvelopeGeneration)return;
   const position=Number(this.cueAudio.currentTime)||0;
   if(position>=end){this.clearCueEnvelope();this.cueAudio.pause?.();this.cueAudio.volume=0;return;}
   if(position>=fadeStart)this.cueAudio.volume=clamp(baseVolume*((end-position)/(end-fadeStart)));
  },40);
  return true;
 }
 async playCue(id,detail={}){
  const entry=cat.cues?.[id],time=Date.now();if(!entry||introOwnsAudio()||!this.started||!this.unlocked||!this.settings.enabled||this.disposed)return false;
  this.cueHistory=this.cueHistory.filter(item=>item.at>=time-60000);
  const last=this.cueHistory[this.cueHistory.length-1],familyCount=this.cueHistory.filter(item=>item.family===entry.family).length;
  const globalCooldown=Number(cat.transitions.cueGlobalCooldownMs)||8000,familyCooldown=Number(entry.cooldownMs||cat.transitions.cueFamilyCooldownMs)||12000;
  const lastFamily=[...this.cueHistory].reverse().find(item=>item.family===entry.family);
  if(!detail.force&&(time<this.cueBusyUntil||time-(last?.at||0)<globalCooldown||time-(lastFamily?.at||0)<familyCooldown||familyCount>=3))return false;
  const alternatives=entry.files.filter(file=>file!==this.lastCueFile.get(id)),files=alternatives.length?alternatives:entry.files;
  const file=files[Math.floor(Math.random()*files.length)],variationDb=(Math.random()*2)-1;
  this.clearCueEnvelope();this.cueAudio.pause?.();this.cueAudio.src=file;this.cueAudio.currentTime=0;this.cueAudio.volume=this.cueVolume(entry,variationDb);const baseVolume=this.cueAudio.volume;
  try{await Promise.resolve(this.cueAudio.play());}catch(error){this.lastError="cue-audio-error:"+String(error?.message||error);return false;}
  this.scheduleCueEnvelope(entry,file,baseVolume);this.cueBusyUntil=time+5000;this.lastCueFile.set(id,file);this.cueHistory.push({id,family:entry.family,file,at:time});this.lastCue={id,file,entry,variationDb,at:time,reason:detail.reason||null};return true;
 }
 async unlock(){if(this.unlocked||this.disposed||introOwnsAudio())return false;this.unlocked=true;if(this.settings.enabled)await this.start();return true;}
 async start(){if(introOwnsAudio()||this.started||!this.unlocked||!this.settings.enabled||this.disposed)return false;this.started=true;this.selectSequence(true);return this.playCurrent(0);}
 activeContextSupported(id=this.context){
  return [cat.contexts.EXPLORATION_CALM,cat.contexts.EXPLORATION_SIGNIFICANT,cat.contexts.ACTION_DYNAMIC,cat.contexts.MAP_DISCOVERY].includes(id);
 }
 activeCandidates(recent){
  if(!this.activeContextSupported())return[];
  if(this.context===cat.contexts.ACTION_DYNAMIC&&this.priority>=cat.transitions.priorities.danger)return[];
  const axis=this.signal.axis||"exploration",activation=Math.max(0,Math.min(5,Number(this.signal.activation)||0));
  if(activation<1)return[];
  const calm=this.context===cat.contexts.EXPLORATION_CALM;
  const bac=this.bacSnapshot(),curiosity=normalizedBACValue(bac.emotions?.curiosity),concern=normalizedBACValue(bac.emotions?.concern);
  const recentActive=this.history.slice(-5).filter(id=>id.startsWith("active-")).length;
  const recentStandard=this.history.slice(-4).filter(id=>!id.startsWith("active-")).length;
  return Object.entries(ACTIVE_PROFILES).flatMap(([id,profile])=>{
   if(!profile.axes.includes(axis)||activation<profile.activation)return[];
   if(calm&&id!=="active-groove"&&id!=="active-collection-arc"&&!(id==="active-lead"&&axis==="research"&&activation>=2))return[];
   if(profile.rare&&!(curiosity>=.55&&concern<.5&&activation<=3&&Math.random()<.10))return[];
   let score=100-Math.abs(profile.activation-activation)*14-profile.penalty;
   score+=profile.axes.includes(axis)?42:0;
   if(profile.mixed)score+=12;
   if(profile.long&&activation>=2)score+=12;
   if(recentStandard>=3)score+=18;
   if(calm)score-=10;
   if(recent.includes(id))score-=75;
   if(profile.long&&recentActive>=2)score-=32;
   if(id==="active-full"&&this.history.slice(-4).some(item=>item==="active-full"||item==="active-entry-17"||item==="active-entry-44"))score-=45;
   return[{id,score:score+Math.random()*8}];
  });
 }
 occasionalLongCandidates(recent){
  const explorationContext=[cat.contexts.EXPLORATION_CALM,cat.contexts.EXPLORATION_SIGNIFICANT].includes(this.context);
  const axis=this.signal.axis||"exploration",activation=Math.max(0,Math.min(5,Number(this.signal.activation)||0));
  if(!explorationContext||!["exploration","collection"].includes(axis))return[];
  const sourceIds=[
   ...(cat.contextSequences[cat.contexts.RESEARCH]||[]),
   ...(cat.contextSequences[cat.contexts.ARCHAEOLOGY]||[]),
   ...(cat.contextSequences[cat.contexts.ACTION_DYNAMIC]||[])
  ];
  const unique=[...new Set(sourceIds)];
  const gapFor=(theme)=>{let gap=0;for(const id of [...this.history].reverse()){if(sequenceTheme(id)===theme)break;gap++;}return gap;};
  return unique.flatMap(id=>{
   const theme=sequenceTheme(id),profile=this.sequenceProfile(id)||{};
   if(!["relic","dynamics"].includes(theme)||profile.role!=="development")return[];
   const gap=Math.min(5,gapFor(theme));
   let score=(cat.scoreSequence?cat.scoreSequence(id,this.signal,recent):100)+this.transitionScore(id);
   score-=theme==="relic"?42:52;
   score+=gap*18;
   if(recent.some(item=>sequenceTheme(item)===theme))score-=45;
   return[{id,theme,gap,score,activation}];
  }).sort((a,b)=>b.score-a.score);
 }
 chooseSequence(){
  const c=cat.contextSequences[this.context]||[],recent=this.history.slice(-cat.transitions.recentTrackHistorySize);
  const now=Date.now(),heldTheme=this.themeHold.until>now?this.themeHold.theme:null;
  const axis=this.signal.axis||"exploration",activation=Math.max(0,Math.min(5,Number(this.signal.activation)||0));
  const control=this.bacControlMode();
  const activePressure=activation>=1&&["collection","exploration","research"].includes(axis);
  const active=this.activeCandidates(recent).sort((a,b)=>b.score-a.score);
  const occasional=this.occasionalLongCandidates(recent);
  const recentActive=this.history.slice(-4).filter(id=>id?.startsWith("active-")).length;
  const standardsSinceActive=(()=>{let n=0;for(const id of [...this.history].reverse()){if(id?.startsWith("active-"))break;n++;}return n;})();
  let forceActive=false;
  if(heldTheme){
   const heldStandard=heldTheme==="active"?[]:this.themePool(heldTheme).map(id=>({id,score:(cat.scoreSequence?cat.scoreSequence(id,this.signal,recent):(recent.includes(id)?0:1))+36+Math.random()*5}));
   const heldActive=heldTheme==="active"?active.map(item=>({...item,score:item.score+34})):[];
   const heldCandidates=heldStandard.concat(heldActive).sort((a,b)=>b.score-a.score);
   if(heldCandidates.length){
    const chosen=heldCandidates[0].id;
    this.lastSelection={mode:"theme-persistence",heldTheme,holdUntil:this.themeHold.until,axis,activation,chosen,candidates:heldCandidates.slice(0,4),at:now};
    return chosen;
   }
  }
  if(active.length&&activePressure&&control.mode==="semi-pilot"){
   forceActive=standardsSinceActive>=2&&recentActive<2;
  }else if(active.length&&control.mode==="autonomous-focused-collection"){
   // En autonomie, Active reste une respiration occasionnelle après une vraie focalisation.
   forceActive=standardsSinceActive>=4&&recentActive===0&&Math.random()<.38;
  }
  if(forceActive){
   this.lastSelection={mode:"active-priority",control:control.mode,axis,activation,chosen:active[0].id,active:active.slice(0,4),standardsSinceActive,at:Date.now()};
   return active[0].id;
  }
  let activePenalty=0,standardBonus=0;
  if(control.mode==="autonomous-mixed"){activePenalty=42;standardBonus=18;}
  else if(control.mode==="autonomous-focused-collection"){activePenalty=20;standardBonus=10;}
  else if(control.mode==="semi-pilot"){activePenalty=-8;standardBonus=0;}
  const standard=c.map(id=>({id,score:(cat.scoreSequence?cat.scoreSequence(id,this.signal,recent):(recent.includes(id)?0:1))+standardBonus+this.transitionScore(id)+Math.random()*3}));
  const adjustedActive=active.map(item=>({...item,score:item.score-activePenalty}));
  const candidates=standard.concat(adjustedActive,occasional);
  const chosen=candidates.sort((a,b)=>b.score-a.score)[0]?.id||null;
  this.lastSelection={mode:"scored",control:control.mode,axis,activation,chosen,active:adjustedActive.slice(0,4),occasional:occasional.slice(0,4),standard:standard.slice().sort((a,b)=>b.score-a.score).slice(0,4),standardsSinceActive,at:Date.now()};
  return chosen;
 }
 selectSequence(force=false){const id=this.chooseSequence(),sequence=sequenceById(id);if(!id||!sequence)return false;if(!force&&id===this.sequenceId)return true;this.sequenceId=id;this.sequence=sequence.slice();this.index=0;this.repeats=0;this.history.push(id);if(this.history.length>12)this.history.shift();
  if(this.activityStreak.count>=THEME_SWITCH_STREAK){const strength=this.activityStreak.count>=5?2:1;this.themeHold={theme:sequenceTheme(id),axis:this.activityStreak.axis,until:Date.now()+(strength>=2?THEME_HOLD_STRONG_MS:THEME_HOLD_BASE_MS),strength};}
  return true;}
 currentStep(){return this.sequence[this.index]?resolveAnyStep(this.sequence[this.index]):null;}
 themeAgeSec(){return Number.isFinite(this.themeStartedAt)?Math.max(0,(clock()-this.themeStartedAt)/1000):0;}
 requiredThemeHoldSec(step=this.currentStep()){
  const minimum=Math.max(0,Number(cat.transitions.minimumListenSec)||0),preferred=Math.max(minimum,Number(cat.transitions.preferredDevelopmentSec)||minimum);
  return step?.segment?.protected||step?.segment?.role==="development"?preferred:minimum;
 }
 holdCurrentThemeUntilEligible(step=this.currentStep()){
  if(!this.currentTheme)return false;
  const remaining=Math.max(0,this.requiredThemeHoldSec(step)-this.themeAgeSec());
  if(remaining<=0)return false;
  this.themeHold={theme:this.currentTheme,axis:this.activityStreak.axis,until:Date.now()+remaining*1000,strength:Math.max(1,this.themeHold.strength||0)};
  return true;
 }
 stepKey(step){
  if(!step)return null;
  const segment=step.segment||{};
  return [step.track?.file||step.track?.id||"",Number(segment.startSec)||0,Number(segment.endSec)||0].join("|");
 }
 notePerceptualStep(step){
  const key=this.stepKey(step);if(!key)return;
  this.perceptualRun=key===this.perceptualRun.key?{key,count:Math.min(99,this.perceptualRun.count+1)}:{key,count:1};
 }
 sequenceDurationSec(id){
  const sequence=sequenceById(id)||[];
  return sequence.reduce((total,ref)=>{const resolved=resolveAnyStep(ref);return total+(resolved?Math.max(0,resolved.segment.endSec-resolved.segment.startSec):0);},0);
 }
 sequenceFirstStep(id){const ref=sequenceById(id)?.[0];return ref?resolveAnyStep(ref):null;}
 sequenceProfile(id){return cat.sequenceProfiles?.[id]||ACTIVE_PROFILES[id]||null;}
 themePool(theme){
  if(!theme)return[];
  if(theme==="active"){
   const recent=this.history.slice(-Math.max(1,Number(cat.transitions.recentTrackHistorySize)||3));
   return this.activeCandidates(recent).map(item=>item.id);
  }
  const contextual=(cat.contextSequences[this.context]||[]).filter(id=>sequenceTheme(id)===theme&&this.sequenceProfile(id)?.role!=="cue");
  if(contextual.length)return contextual;
  if(["relic","dynamics"].includes(theme)&&[cat.contexts.EXPLORATION_CALM,cat.contexts.EXPLORATION_SIGNIFICANT].includes(this.context)){
   const recent=this.history.slice(-Math.max(1,Number(cat.transitions.recentTrackHistorySize)||3));
   return this.occasionalLongCandidates(recent).filter(item=>item.theme===theme).map(item=>item.id);
  }
  return[];
 }
 themeCycleCeilingSec(){return Math.max(Number(cat.transitions.preferredDevelopmentSec)||0,Number(cat.transitions.maximumPendingSec)||0,150);}
 shouldContinueInstalledTheme(theme=this.currentTheme){
  if(!theme||this.sequenceProfile(this.sequenceId)?.role==="cue")return false;
  const pool=this.themePool(theme);if(!pool.length)return false;
  const age=this.themeAgeSec(),preferred=Math.max(Number(cat.transitions.preferredDevelopmentSec)||0,Number(cat.transitions.minimumListenSec)||0),ceiling=this.themeCycleCeilingSec();
  if(age<preferred)return true;
  const seen=new Set(this.themeHistory.filter(id=>sequenceTheme(id)===theme));
  const hasUnheard=pool.some(id=>!seen.has(id));
  return age<ceiling&&(hasUnheard||pool.length<=1);
 }
 transitionScore(id,previousStep=this.currentStep()){
  const first=this.sequenceFirstStep(id);if(!first)return 0;
  const recent=this.history.slice(-Math.max(1,Number(cat.transitions.recentTrackHistorySize)||3));
  const recentCount=recent.filter(item=>item===id).length;
  const fromTheme=this.currentTheme||sequenceTheme(this.sequenceId),toTheme=sequenceTheme(id);
  let score=themeCompatibility(fromTheme,toTheme)+roleCompatibility(previousStep?.segment?.role,first.segment?.role);
  if(previousStep?.track?.file&&previousStep.track.file===first.track.file){
   score+=8;const gap=Math.abs((Number(first.segment.startSec)||0)-(Number(previousStep.segment.endSec)||0));
   if(gap<=4)score+=14;else if(gap<=12)score+=7;
  }
  score-=recentCount*12;
  return score;
 }
 selectThemeContinuation(theme,previousStep=this.currentStep()){
  const recent=this.history.slice(-Math.max(1,Number(cat.transitions.recentTrackHistorySize)||3)),activeScores=theme==="active"?new Map(this.activeCandidates(recent).map(item=>[item.id,item.score])):null;
  const pool=this.themePool(theme);if(!pool.length)return false;
  const maxRepeats=Math.max(1,Number(cat.transitions.maxConsecutiveLoopRepeats)||3),previousKey=this.stepKey(previousStep);
  const ranked=pool.map(id=>{
   const firstStep=this.sequenceFirstStep(id),sameStep=Boolean(previousKey&&firstStep&&previousKey===this.stepKey(firstStep));
   const recentCount=recent.filter(item=>item===id).length,profile=this.sequenceProfile(id)||{};
   const long=Boolean(profile.long||profile.role==="development"||firstStep?.segment?.protected||this.sequenceDurationSec(id)>=90);
   const contextualScore=theme==="active"?(activeScores.get(id)??-1000):(cat.scoreSequence?cat.scoreSequence(id,this.signal,recent):100);
   let score=contextualScore+this.transitionScore(id,previousStep);
   if(long)score+=20;
   if(sameStep)score-=12*Math.max(1,this.perceptualRun.count||1);
   if(sameStep&&this.perceptualRun.count>=maxRepeats)score-=1000;
   score-=recentCount*8;
   return{id,score,sameStep,recentCount,long,duration:this.sequenceDurationSec(id)};
  }).sort((a,b)=>b.score-a.score||b.duration-a.duration);
  const eligible=ranked.find(item=>item.score>-500);
  if(!eligible)return false;
  const chosen=eligible.id,sequence=sequenceById(chosen);if(!sequence)return false;
  this.sequenceId=chosen;this.sequence=sequence.slice();this.index=0;this.repeats=0;this.history.push(chosen);if(this.history.length>12)this.history.shift();
  this.lastSelection={mode:"theme-continuation",heldTheme:theme,chosen,perceptualRun:{...this.perceptualRun},candidates:ranked.slice(0,4),at:Date.now()};
  return true;
 }
 setMusicalState(detail={}){
  const next={axis:detail.axis||this.signal.axis,activation:Math.max(0,Math.min(5,Number(detail.activation??this.signal.activation)||0)),event:detail.event||null,decisionAt:Number(detail.decisionAt)||this.signal.decisionAt};
  const changed=next.axis!==this.signal.axis||next.activation!==this.signal.activation||next.event!==this.signal.event;
  const now=Date.now(),sameAxis=next.axis===this.activityStreak.axis&&now-this.activityStreak.lastAt<=45000;
  this.activityStreak={axis:next.axis,count:sameAxis?Math.min(9,this.activityStreak.count+1):1,lastAt:now};
  this.signal=next;if(!changed)return false;this.lastSignalChange=now;if(detail.defer)return true;
  const desired=this.chooseSequence();if(!desired||desired===this.sequenceId||!this.started)return true;
  const heldTheme=this.themeHold.until>now?this.themeHold.theme:null,desiredTheme=sequenceTheme(desired);
  if(heldTheme&&desiredTheme!==heldTheme&&this.activityStreak.count<THEME_SWITCH_STREAK){this.lastSelection={mode:"theme-persistence-block",heldTheme,desiredTheme,streak:this.activityStreak.count,holdUntil:this.themeHold.until,at:now};return true;}
  const existing=this.pending;
  if(existing?.sequenceId===desired&&existing?.id===this.context)return true;
  this.pending={id:this.context,priority:this.priority,sequenceId:desired,requestedAt:Date.now(),reason:detail.advisory?"bac-advisory":"musical-state"};
  this.schedulePendingTransition();return true;
 }
 schedulePendingTransition(){
  if(this.pendingTimer)global.clearTimeout(this.pendingTimer);this.pendingTimer=null;
  if(!this.pending?.sequenceId?.startsWith("active-")||this.sequenceId?.startsWith("active-")||!this.started)return false;
  const delay=Math.max(0,this.requiredThemeHoldSec()-this.themeAgeSec());
  this.pendingTimer=global.setTimeout(()=>{
   this.pendingTimer=null;
   if(this.pending?.sequenceId?.startsWith("active-")&&!this.sequenceId?.startsWith("active-"))this.applyPending();
  },delay*1000);
  return true;
 }
 setContext(id,detail={}){
  if(!cat.contextProfiles[id])return false;const priority=Number(detail.priority??10),urgent=priority>=cat.transitions.priorities.danger;
  const changed=id!==this.context;
  if(!changed){this.priority=priority;this.schedulePendingTransition();return true;}
  if(this.started&&!urgent){
   if(this.pending?.sequenceId?.startsWith("active-")&&this.activeContextSupported(id)){
    this.pending={...this.pending,id,priority,reason:this.pending.reason||detail.reason||null};
    this.schedulePendingTransition();
   }else{
    this.pending={id,priority,requestedAt:Date.now(),reason:detail.reason||null};
   }
   return true;
  }
  this.context=id;this.priority=priority;this.pending=null;
  if(changed&&this.started){this.selectSequence(true);this.playCurrent(urgent?cat.transitions.urgentCrossfadeSec:Number(detail.fadeSec??cat.contextProfiles[id].crossfadeSec??cat.transitions.standardCrossfadeSec));}return true;
 }
 applyPending(){
  if(!this.pending)return false;if(this.pendingTimer)global.clearTimeout(this.pendingTimer);this.pendingTimer=null;const p=this.pending;this.pending=null;
  if(!cat.contextProfiles[p.id])return false;
  this.context=p.id;this.priority=Number(p.priority??this.priority);
  const requestedSequence=p.sequenceId&&sequenceById(p.sequenceId);
  if(requestedSequence){this.sequenceId=p.sequenceId;this.sequence=requestedSequence.slice();this.index=0;this.repeats=0;this.history.push(p.sequenceId);if(this.history.length>12)this.history.shift();}
  else this.selectSequence(true);
  const fade=Number(cat.contextProfiles[p.id].crossfadeSec??cat.transitions.standardCrossfadeSec);
  this.playCurrent(fade);return true;
 }
 async playCurrent(overrideFade){
  const step=this.currentStep();if(!step||!this.started||this.disposed||!this.settings.enabled)return false;
  const nextIndex=this.active===0?1:0,next=this.decks[nextIndex],previous=this.active>=0?this.decks[this.active]:null,token=++next.token,generation=++this.playGeneration,seg=step.segment;
  const fade=Math.max(0,Number(overrideFade??seg.fadeSec??cat.transitions.standardCrossfadeSec));
  next.step=step;next.audio.src=step.track.file;next.audio.currentTime=seg.startSec;next.audio.volume=fade?0:this.targetVolume(step);
  this.transitioningAudio=true;
  try{await Promise.resolve(next.audio.play());}catch(error){if(generation===this.playGeneration)this.transitioningAudio=false;if(token!==next.token||generation!==this.playGeneration)return false;this.lastError=String(error?.message||error);this.retryCount++;global.clearTimeout(this.retryTimer);this.retryTimer=global.setTimeout(()=>this.playCurrent(overrideFade),Math.min(1500,250*this.retryCount));return false;}
  if(generation===this.playGeneration)this.transitioningAudio=false;if(token!==next.token||generation!==this.playGeneration)return false;this.clearTimer();this.retryCount=0;this.lastError=null;this.active=nextIndex;this.segmentStartedAt=clock();if(this.index===0)this.sequenceStartedAt=this.segmentStartedAt;
  const theme=sequenceTheme(this.sequenceId);
  if(theme!==this.currentTheme){this.currentTheme=theme;this.themeStartedAt=this.segmentStartedAt;this.themeHistory=[this.sequenceId];}
  else if(this.index===0&&this.themeHistory[this.themeHistory.length-1]!==this.sequenceId){this.themeHistory.push(this.sequenceId);if(this.themeHistory.length>12)this.themeHistory.shift();}
  this.notePerceptualStep(step);
  this.lastTransition={at:Date.now(),context:this.context,sequence:this.sequenceId,track:step.track.id,segment:seg.id,fadeSec:fade};
  this.crossfade(previous,next,fade);const duration=Math.max(.05,seg.endSec-seg.startSec);this.timer=global.setTimeout(()=>this.advance(),Math.max(20,(duration-fade)*1000));return true;
 }
 crossfade(previous,next,duration){
  if(this.fadeTimer)global.clearInterval(this.fadeTimer);const target=this.targetVolume(next.step);
  if(!duration){next.audio.volume=target;if(previous){previous.audio.pause();previous.audio.volume=0;}return;}
  const start=clock(),from=previous?.audio.volume||0;this.fadeTimer=global.setInterval(()=>{const p=clamp((clock()-start)/(duration*1000));next.audio.volume=target*p;if(previous)previous.audio.volume=from*(1-p);
   if(p>=1){global.clearInterval(this.fadeTimer);this.fadeTimer=null;if(previous){previous.audio.pause();previous.audio.volume=0;}}},50);
 }
 advance(){
  if(!this.started||this.disposed)return;const step=this.currentStep();if(!step)return;
  const pendingAge=this.pending?(Date.now()-Number(this.pending.requestedAt||Date.now()))/1000:0;
  const sequenceEnding=this.index+1>=this.sequence.length,themeAge=this.themeAgeSec(),themeReady=themeAge>=this.requiredThemeHoldSec(step),maximumPendingReached=pendingAge>=cat.transitions.maximumPendingSec;
  const pendingTheme=this.pending?.sequenceId?sequenceTheme(this.pending.sequenceId):null,crossThemeAdvisory=Boolean(this.pending?.reason==="bac-advisory"&&pendingTheme&&pendingTheme!==this.currentTheme&&pendingTheme!=="active");
  const advisoryHold=Math.max(Number(cat.transitions.preferredDevelopmentSec)||0,Number(cat.transitions.minimumListenSec)||0),pendingReady=crossThemeAdvisory?themeAge>=advisoryHold:themeReady;
  const pendingWaiting=Boolean(this.pending&&!pendingReady&&!maximumPendingReached);
  if(this.pending&&((sequenceEnding&&pendingReady)||maximumPendingReached)){if(this.applyPending())return;}
  if(this.pending&&!themeReady&&!maximumPendingReached)this.holdCurrentThemeUntilEligible(step);
  if(this.sequence.length===1&&step.segment.loopable&&this.repeats<cat.transitions.maxConsecutiveLoopRepeats-1)this.repeats++;
  else{
   this.repeats=0;this.index++;
   if(this.index>=this.sequence.length){
    const holdTheme=this.themeHold.until>Date.now()?this.themeHold.theme:null;
    const installedTheme=holdTheme&&holdTheme===this.currentTheme?holdTheme:this.currentTheme;
    const mustContinue=Boolean(installedTheme&&(pendingWaiting||(!themeReady&&!maximumPendingReached)||(!this.pending&&this.shouldContinueInstalledTheme(installedTheme))));
    if(mustContinue){
     if(!this.selectThemeContinuation(installedTheme,step))this.selectSequence(true);
    }else this.selectSequence(true);
   }
  }
  this.playCurrent();
 }
 clearTimer(){if(this.timer)global.clearTimeout(this.timer);this.timer=null;}
 stop(){this.started=false;this.playGeneration++;this.transitioningAudio=false;this.clearTimer();if(this.pendingTimer)global.clearTimeout(this.pendingTimer);this.pendingTimer=null;global.clearTimeout(this.retryTimer);this.retryTimer=null;if(this.fadeTimer)global.clearInterval(this.fadeTimer);this.fadeTimer=null;this.clearCueEnvelope();this.decks.forEach(d=>{d.token++;d.audio.pause();d.audio.volume=0;});this.cueAudio.pause?.();this.cueAudio.volume=0;this.cueBusyUntil=0;}
 diagnostics(){const d=this.active>=0?this.decks[this.active]:null;return{version:VERSION,enabled:this.settings.enabled,unlocked:this.unlocked,started:this.started,context:this.context,priority:this.priority,pending:this.pending,signal:this.signal,sequence:this.sequenceId,index:this.index,track:d?.step?.track?.id||null,segment:d?.step?.segment?.id||null,volume:d?.audio?.volume||0,cue:this.lastCue?{id:this.lastCue.id,file:this.lastCue.file,at:this.lastCue.at,reason:this.lastCue.reason}:null,bac:this.bacSnapshot(),controlMode:this.bacControlMode(),themePersistence:{activityStreak:this.activityStreak,hold:this.themeHold,currentTheme:this.currentTheme,themeAgeSec:this.themeAgeSec(),requiredHoldSec:this.requiredThemeHoldSec(),cycleCeilingSec:this.themeCycleCeilingSec(),themeHistory:this.themeHistory.slice(),perceptualRun:this.perceptualRun,remainingMs:Math.max(0,this.themeHold.until-Date.now())},activeLibrary:{tracks:Object.keys(ACTIVE_TRACKS),sequences:Object.keys(ACTIVE_SEQUENCES)},selection:this.lastSelection||null,lastTransition:this.lastTransition,lastError:this.lastError};}
 dispose(){this.disposed=true;this.stop();global.removeEventListener?.("pointerdown",this.onUnlock);global.removeEventListener?.("keydown",this.onUnlock);global.removeEventListener?.("bluefox:music-context",this.onContext);global.removeEventListener?.("bluefox:sound-volume",this.onSoundVolume);}
}
const validation=cat.validateCatalog();if(!validation.valid){console.error("[BlueFox Music] catalogue invalide",validation.errors);return;}
BF.AdaptiveMusicEngine=AdaptiveMusicEngine;BF.music=new AdaptiveMusicEngine();BF.setMusicContext=(id,detail)=>BF.music.setContext(id,detail);BF.playMusicCue=(id,detail)=>BF.music.playCue(id,detail);BF.getMusicDiagnostics=()=>BF.music.diagnostics();
global.dispatchEvent?.(new CustomEvent("bluefox:music-ready",{detail:{version:VERSION,tracks:cat.tracks.length+Object.keys(ACTIVE_TRACKS).length}}));
})(window);
