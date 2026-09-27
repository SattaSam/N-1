(function(global){
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{};
const VERSION="1.1.1";
const SOUND_KEY="bluefox_sound_settings_v2";
const LEGACY_SOUND_KEY="bluefox_sound_settings_v1";
const MEDIA_PATCH_KEY="__bluefoxSoundVolumePatchV1";
let button=null;
let panel=null;
let musicSlider=null;
let soundSlider=null;
let musicValue=null;
let soundValue=null;
let layoutObserver=null;
let layoutFrame=0;
let outsideHandler=null;
let keyHandler=null;
const trackedMedia=new Set();
const mediaState=new WeakMap();
const MENU_GAP=6;
const CONTROL_SIZE=42;
const PANEL_GAP=8;
const MENU_LABELS=["inventaire","recherche","reglages","planete","journal","missions"];
const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));

function loadSoundSettings(){
 try{
  const stored=JSON.parse(global.localStorage?.getItem(SOUND_KEY)||"null");
  if(stored&&Number.isFinite(Number(stored.volume)))return{volume:clamp(stored.volume)};
  const legacy=JSON.parse(global.localStorage?.getItem(LEGACY_SOUND_KEY)||"null");
  const legacyVolume=Number(legacy?.volume);
  // Ignore a legacy zero produced during the faulty first integration.
  return{volume:Number.isFinite(legacyVolume)&&legacyVolume>.01?clamp(legacyVolume):.8};
 }catch{return{volume:.8};}
}
const soundSettings=loadSoundSettings();

function saveSoundSettings(){
 try{global.localStorage?.setItem(SOUND_KEY,JSON.stringify(soundSettings));}catch{}
}
function isMusicMedia(media){
 const source=String(media?.currentSrc||media?.src||"").replace(/\\/g,"/").toLowerCase();
 return source.includes("/audio/music/")||source.startsWith("audio/music/")||media?.dataset?.bluefoxAudioGroup==="music";
}
function applySoundVolume(media){
 if(!media||isMusicMedia(media))return;
 trackedMedia.add(media);
 const previous=mediaState.get(media);
 const current=clamp(media.volume);
 const base=previous&&Math.abs(current-previous.effective)<.002?previous.base:current;
 const effective=clamp(base*soundSettings.volume);
 mediaState.set(media,{base,effective});
 if(Math.abs(current-effective)>.002)media.volume=effective;
}
function refreshTrackedMedia(){
 trackedMedia.forEach(media=>{
  if(!media||isMusicMedia(media))return;
  const previous=mediaState.get(media)||{base:clamp(media.volume)};
  const effective=clamp(previous.base*soundSettings.volume);
  mediaState.set(media,{base:previous.base,effective});
  media.volume=effective;
 });
}
function installMediaPatch(){
 const proto=global.HTMLMediaElement?.prototype;
 if(!proto||proto[MEDIA_PATCH_KEY])return;
 const nativePlay=proto.play;
 Object.defineProperty(proto,MEDIA_PATCH_KEY,{value:true,configurable:false});
 proto.play=function(){applySoundVolume(this);return nativePlay.apply(this,arguments);};
}
function setSoundVolume(value){
 soundSettings.volume=clamp(value);
 saveSoundSettings();
 refreshTrackedMedia();
 update();
 global.dispatchEvent?.(new CustomEvent("bluefox:sound-volume",{detail:{volume:soundSettings.volume}}));
 return soundSettings.volume;
}
function normalizedText(value){
 return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
function findMenuBar(){
 if(!document.querySelectorAll)return null;
 const candidates=[];
 document.querySelectorAll("nav,section,div").forEach((element)=>{
  const rect=element.getBoundingClientRect?.();
  if(!rect||rect.width<250||rect.height<40||rect.height>140||rect.bottom<global.innerHeight*.65)return;
  const text=normalizedText(element.textContent);
  const matches=MENU_LABELS.reduce((count,label)=>count+(text.includes(label)?1:0),0);
  if(matches>=5)candidates.push({element,area:rect.width*rect.height});
 });
 candidates.sort((a,b)=>a.area-b.area);
 return candidates[0]?.element||null;
}
function positionPanel(){
 if(!button||!panel||panel.hidden)return;
 const buttonRect=button.getBoundingClientRect();
 const panelRect=panel.getBoundingClientRect();
 const left=Math.max(6,Math.min(global.innerWidth-panelRect.width-6,buttonRect.left+(buttonRect.width-panelRect.width)/2));
 const top=Math.max(6,buttonRect.top-panelRect.height-PANEL_GAP);
 panel.style.left=`${Math.round(left+global.scrollX)}px`;
 panel.style.top=`${Math.round(top+global.scrollY)}px`;
}
function positionControls(){
 layoutFrame=0;
 const controls=[
  document.querySelector?.(".bluefox-camera-button"),
  document.querySelector?.(".bluefox-speech-button"),
  button
 ].filter(Boolean);
 const menu=findMenuBar();
 if(!menu||controls.length<3){positionPanel();return false;}
 const top=Math.max(6,Math.round(menu.getBoundingClientRect().top-CONTROL_SIZE-MENU_GAP));
 controls.forEach((control)=>{
  control.style.top=`${top}px`;
  control.style.bottom="auto";
 });
 positionPanel();
 layoutObserver?.disconnect();
 layoutObserver=null;
 return true;
}
function schedulePosition(){
 if(layoutFrame)return;
 if(global.requestAnimationFrame)layoutFrame=global.requestAnimationFrame(positionControls);
 else positionControls();
}
function watchLayout(){
 positionControls();
 if(!layoutObserver&&global.MutationObserver){
  layoutObserver=new MutationObserver(schedulePosition);
  layoutObserver.observe(document.body,{childList:true,subtree:true});
 }
 global.addEventListener("resize",schedulePosition);
}
function setPanelOpen(open){
 if(!panel||!button)return;
 panel.hidden=!open;
 button.classList.toggle("open",open);
 button.setAttribute("aria-expanded",open?"true":"false");
 if(open){
  update();
  schedulePosition();
  global.requestAnimationFrame?.(()=>musicSlider?.focus());
 }
}
function iconForLevels(){
 const music=BF.music?.settings?.enabled===false?0:clamp(BF.music?.settings?.volume??0);
 const sounds=clamp(soundSettings.volume);
 const maximum=Math.max(music,sounds);
 return maximum<=.001?"🔇":maximum<.45?"🔉":"🔊";
}
function update(){
 const musicEnabled=BF.music?.settings?.enabled!==false;
 const musicVolume=clamp(BF.music?.settings?.volume??.72);
 const gameSoundVolume=clamp(soundSettings.volume);
 if(musicSlider&&document.activeElement!==musicSlider)musicSlider.value=String(musicVolume);
 if(soundSlider&&document.activeElement!==soundSlider)soundSlider.value=String(gameSoundVolume);
 if(musicValue)musicValue.textContent=`${Math.round(musicVolume*100)} %`;
 if(soundValue)soundValue.textContent=`${Math.round(gameSoundVolume*100)} %`;
 if(!button)return;
 const silent=(!musicEnabled||musicVolume<=.001)&&gameSoundVolume<=.001;
 button.classList.toggle("disabled",silent);
 button.setAttribute("aria-label","Régler les volumes de la musique et des sons");
 button.title="Volumes musique et sons";
 button.querySelector("span").textContent=iconForLevels();
}
function createSlider(id,label){
 const group=document.createElement("label");
 group.className="bluefox-volume-group";
 group.htmlFor=id;
 const title=document.createElement("span");
 title.className="bluefox-volume-label";
 title.textContent=label;
 const rail=document.createElement("div");
 rail.className="bluefox-volume-rail";
 const input=document.createElement("input");
 input.id=id;
 input.className="bluefox-volume-slider";
 input.type="range";
 input.min="0";
 input.max="1";
 input.step="0.01";
 input.setAttribute("aria-label",`Volume ${label.toLowerCase()}`);
 rail.appendChild(input);
 const value=document.createElement("span");
 value.className="bluefox-volume-value";
 group.append(title,rail,value);
 return{group,input,value};
}
function install(){
 if(button||!BF.music)return false;
 installMediaPatch();
 panel=document.createElement("div");
 panel.className="bluefox-volume-panel";
 panel.hidden=true;
 panel.setAttribute("role","group");
 panel.setAttribute("aria-label","Réglage des volumes");
 const music=createSlider("bluefox-music-volume","Musique");
 const sounds=createSlider("bluefox-sound-volume","Sons");
 musicSlider=music.input;musicValue=music.value;
 soundSlider=sounds.input;soundValue=sounds.value;
 panel.append(music.group,sounds.group);
 musicSlider.addEventListener("input",()=>{
  const value=clamp(musicSlider.value);
  if(value>.001&&BF.music.settings.enabled===false)BF.music.setEnabled(true);
  BF.music.setVolume(value);
  update();
 });
 soundSlider.addEventListener("input",()=>setSoundVolume(soundSlider.value));
 button=document.createElement("button");
 button.type="button";
 button.className="bluefox-music-button";
 button.innerHTML="<span>🔊</span>";
 button.setAttribute("aria-haspopup","true");
 button.setAttribute("aria-expanded","false");
 button.addEventListener("click",()=>setPanelOpen(panel.hidden));
 document.body.append(panel,button);
 // The former speaker button stored a separate enabled=false state. The new UI
 // is volume-driven, so migrate that legacy mute state back to an enabled engine.
 if(BF.music.settings.enabled===false&&clamp(BF.music.settings.volume??.72)>.001)BF.music.setEnabled(true);
 setSoundVolume(soundSettings.volume);
 outsideHandler=event=>{if(!panel.hidden&&!panel.contains(event.target)&&event.target!==button)setPanelOpen(false);};
 keyHandler=event=>{if(event.key==="Escape"&&!panel.hidden){setPanelOpen(false);button.focus();}};
 document.addEventListener("pointerdown",outsideHandler);
 document.addEventListener("keydown",keyHandler);
 update();watchLayout();return true;
}
function dispose(){
 layoutObserver?.disconnect();layoutObserver=null;
 if(layoutFrame&&global.cancelAnimationFrame)global.cancelAnimationFrame(layoutFrame);
 layoutFrame=0;global.removeEventListener?.("resize",schedulePosition);
 if(outsideHandler)document.removeEventListener("pointerdown",outsideHandler);
 if(keyHandler)document.removeEventListener("keydown",keyHandler);
 panel?.remove();panel=null;button?.remove();button=null;
 musicSlider=null;soundSlider=null;musicValue=null;soundValue=null;
}
installMediaPatch();
BF.AudioSettings=Object.freeze({
 version:VERSION,
 get musicVolume(){return clamp(BF.music?.settings?.volume??.72);},
 get soundVolume(){return soundSettings.volume;},
 setMusicVolume:value=>BF.music?.setVolume(clamp(value)),
 setSoundVolume
});
BF.setSoundVolume=setSoundVolume;
BF.getSoundVolume=()=>soundSettings.volume;
BF.resetAudioVolumes=()=>{
 BF.music?.setEnabled(true);
 BF.music?.setVolume(.72);
 return{music:.72,sounds:setSoundVolume(.8)};
};
if(!install())global.addEventListener("bluefox:music-ready",install,{once:true});
BF.MusicUI=Object.freeze({version:VERSION,install,update,setPanelOpen,dispose});
})(window);
