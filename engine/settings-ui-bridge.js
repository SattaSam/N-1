(function(global){
"use strict";
const KEY="bluefox_odyssey_save_v1",BUDGET=225;
const AX={exploration:"exploration",collecte:"collection",collection:"collection",recherche:"research",relations:"relations",relation:"relations",repos:"survival",survie:"survival","repos / survie":"survival","repos/survie":"survival"};
const PAIR_TIP={
"curieux|prudent":"Curieux : Observe spontanément ce qui l'entoure. ↑ Exploration, observation et recherche.\nPrudent : Limite les prises de risque. ↑ Sécurité, survie et retour à la base.",
"courageux|craintif":"Courageux : Affronte plus facilement l'inconnu. ↑ Exploration des zones dangereuses.\nCraintif : Évite les situations menaçantes. ↑ Préférence pour les zones sûres.",
"empathique|indifferent":"Empathique : S'intéresse aux êtres vivants. ↑ Relations, faune et PNJ.\nIndifférent : Reste focalisé sur ses objectifs. ↑ Ignore plus souvent les interactions sociales.",
"respectueux|destructeur":"Respectueux : Préserve davantage son environnement. ↑ Réduit les destructions inutiles.\nDestructeur : Exploite les ressources sans hésiter. ↑ Collecte rapide, impact environnemental plus important."
};
let lock=false,lastAxis=null;
const norm=v=>String(v||"").toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
const clamp=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)));
const axisFor=v=>AX[norm(v)]||null;
const split=v=>String(v||"").split(/\s+[—–-]\s+/).map(x=>x.trim()).filter(Boolean);
function sanitizePriorities(src,preferred){if(!src||typeof src!=="object"||Array.isArray(src))return src;const p={...src};delete p.Construction;delete p.construction;const e=Object.keys(p).map(k=>({k,a:axisFor(k),v:clamp(p[k])})).filter(x=>x.a);e.forEach(x=>p[x.k]=x.v);let o=e.reduce((s,x)=>s+x.v,0)-BUDGET;if(o<=0)return p;for(const x of e.filter(x=>x.a!==preferred).sort((a,b)=>b.v-a.v)){if(o<=0)break;const d=Math.min(x.v,o);x.v-=d;p[x.k]=x.v;o-=d;}if(o>0){const x=e.find(x=>x.a===preferred)||e.sort((a,b)=>b.v-a.v)[0];if(x){const d=Math.min(x.v,o);x.v-=d;p[x.k]=x.v;}}return p;}
function guard(){const proto=global.Storage?.prototype;if(!proto||proto.setItem.__bacFinal)return;const orig=proto.setItem;const fn=function(k,v){if(k===KEY){try{const s=JSON.parse(String(v));if(s&&typeof s==="object"&&s.priorities)s.priorities=sanitizePriorities(s.priorities,lastAxis);v=JSON.stringify(s);}catch{}}return orig.call(this,k,v)};fn.__bacFinal=true;proto.setItem=fn;}
function updateTrait(row){const input=row.querySelector('input[type="range"]'),out=row.querySelector("b"),lab=row.querySelector("span");const names=row.dataset.traitLeft&&row.dataset.traitRight?[row.dataset.traitLeft,row.dataset.traitRight]:split(lab?.textContent);if(!input||!out||names.length!==2)return;row.dataset.traitLeft=names[0];row.dataset.traitRight=names[1];const l=clamp(input.value),r=100-l;row.classList.add("trait-bipolar-row");lab.classList.add("trait-pole","trait-pole-left");out.classList.add("trait-balance-value","trait-pole","trait-pole-right");lab.textContent=`${names[0]} ${l} %`;out.textContent=`${names[1]} ${r} %`;input.setAttribute("aria-valuetext",`${names[0]} ${l} %, ${names[1]} ${r} %`);}
function tooltips(row){
row.removeAttribute("title");
row.querySelectorAll("[title]").forEach(e=>e.removeAttribute("title"));
row.querySelectorAll(".bac-trait-info").forEach(e=>e.remove());
const left=norm(row.dataset.traitLeft);
const right=norm(row.dataset.traitRight);
const text=PAIR_TIP[`${left}|${right}`]||"";
if(text){
row.dataset.tooltip=text;
row.classList.add("bac-trait-tooltip-row");
row.setAttribute("aria-label",text.replace(/\n/g," "));
}else{
delete row.dataset.tooltip;
row.classList.remove("bac-trait-tooltip-row");
row.removeAttribute("aria-label");
}
}
function entries(settings){return [...settings.querySelectorAll(".slider-row")].filter(r=>!r.classList.contains("trait-row")).map(row=>{const lab=row.querySelector("span"),input=row.querySelector('input[type="range"]'),out=row.querySelector("b");const raw=row.dataset.priorityLabel||lab?.textContent?.replace(/\s+\d+\s*%.*$/,"").trim()||"";row.dataset.priorityLabel=raw;return{row,input,out,axis:axisFor(raw)}}).filter(x=>x.axis&&x.input);}
const total=e=>e.reduce((s,x)=>s+clamp(x.input.value),0);
function indicator(settings,e){let i=settings.querySelector(".bac-priority-budget");if(!i){i=document.createElement("div");i.className="bac-priority-budget";const f=e[0]?.row;f?.parentElement?f.parentElement.insertBefore(i,f):settings.prepend(i);}const t=total(e),a=BUDGET-t;i.classList.toggle("is-valid",a===0);i.classList.toggle("is-invalid",a!==0);i.textContent=a===0?`Priorités : ${t}/${BUDGET} points répartis`:a>0?`Priorités : ${t}/${BUDGET} · ${a} point${a>1?"s":""} disponible${a>1?"s":""}`:`Priorités : ${t}/${BUDGET} · dépassement de ${Math.abs(a)} point${Math.abs(a)>1?"s":""}`;}
function publish(x){x.input.dispatchEvent(new Event("input",{bubbles:true}));x.input.dispatchEvent(new Event("change",{bubbles:true}));}
function enforce(settings,axis=null){if(lock)return;const e=entries(settings);if(e.length!==5)return;let over=total(e)-BUDGET;if(over<=0){indicator(settings,e);return;}lock=true;try{const changed=e.find(x=>x.axis===axis);let candidates=e.filter(x=>x!==changed).sort((a,b)=>clamp(b.input.value)-clamp(a.input.value));const mod=new Set();while(over>0){const adj=candidates.filter(x=>clamp(x.input.value)>0);if(!adj.length)break;const share=Math.max(1,Math.ceil(over/adj.length));let red=0;for(const x of adj){if(red>=over)break;const cur=clamp(x.input.value),d=Math.min(cur,share,over-red);if(!d)continue;x.input.value=String(cur-d);if(x.out)x.out.textContent=`${cur-d}%`;mod.add(x);red+=d;}if(!red)break;over-=red;candidates=adj;}if(over>0&&changed){const cur=clamp(changed.input.value);changed.input.value=String(cur-over);if(changed.out)changed.out.textContent=`${cur-over}%`;mod.add(changed);}mod.forEach(publish);indicator(settings,entries(settings));}finally{lock=false;}}
function connect(settings){const e=entries(settings);if(e.length!==5)return;e.forEach(x=>{if(x.input.dataset.bacPriorityConnected==="final")return;x.input.dataset.bacPriorityConnected="final";const run=()=>{if(lock)return;lastAxis=x.axis;queueMicrotask(()=>enforce(settings,x.axis));requestAnimationFrame(()=>enforce(settings,x.axis));setTimeout(()=>enforce(settings,x.axis),25)};x.input.addEventListener("input",run);x.input.addEventListener("change",run);});indicator(settings,e);requestAnimationFrame(()=>enforce(settings,null));}
function enhance(){const s=document.querySelector(".settings-content");if(!s)return false;s.querySelectorAll(".slider-row").forEach(row=>{const raw=row.querySelector("span")?.textContent||"";if(norm(raw.replace(/\s+\d+\s*%.*$/,"")).toLowerCase()==="construction"){row.remove();return;}if(!row.classList.contains("trait-row"))return;updateTrait(row);tooltips(row);const input=row.querySelector('input[type="range"]');if(input&&input.dataset.bluefoxBalanceConnected!=="final"){input.dataset.bluefoxBalanceConnected="final";const run=()=>{updateTrait(row);tooltips(row)};input.addEventListener("input",run);input.addEventListener("change",run);}});connect(s);return true;}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance();});}
guard();new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});global.addEventListener("DOMContentLoaded",schedule,{once:true});global.BlueFox3D=global.BlueFox3D||{};global.BlueFox3D.refreshSettingsUI=enhance;
})(window);