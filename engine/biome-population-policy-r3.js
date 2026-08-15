(function(global){
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{};
const base=BF.BiomeRules;
if(!base?.getMapPopulation||BF.BiomePopulationPolicy?.version==="population-r3.1")return;
const FAUNA=new Set(["fun_creature","small_creature","brouteur","sauteur","patte_creature","nocturnal_animal","amphibian_species"]);
const FAUNA_BY_PROFILE=Object.freeze({
 forest:new Set(["fun_creature","small_creature","brouteur","sauteur","patte_creature","nocturnal_animal"]),
 plain:new Set(["fun_creature","small_creature","brouteur","sauteur","patte_creature"]),
 swamp:new Set(["small_creature","patte_creature","nocturnal_animal","amphibian_species"]),
 fungal:new Set(["small_creature","nocturnal_animal"]),
 ruins:new Set(["small_creature","nocturnal_animal"]),
 archaeological:new Set(["small_creature","nocturnal_animal"]),
 aquatic:new Set(["small_creature","patte_creature","amphibian_species"]),
 coastal:new Set(["small_creature","patte_creature","amphibian_species"]),
 archipelago:new Set(["small_creature","patte_creature","amphibian_species"]),
 desert:new Set(["fun_creature","small_creature","brouteur","sauteur"]),
 volcanic:new Set(["nocturnal_animal"]),frozen:new Set(["nocturnal_animal"]),
 magnetic:new Set(["nocturnal_animal"]),crystalline:new Set(["nocturnal_animal"]),
 atypical:new Set(["nocturnal_animal"]),alien:new Set(["fun_creature","small_creature","patte_creature","nocturnal_animal"])
});
const CAMP_ONLY=new Set(["camp","base","reinforced_base","base_fire","wood_plane","toile"]);
const DESERT_FORBIDDEN=new Set(["tree","nature_tree","luminescent_tree","crystalline_tree","bush","fern","lunar_vine","pool","spore","lantern_mushrooms","fiber","adaptive_plant","frond"]);
const VOLCANIC_FORBIDDEN=new Set(["tree","nature_tree","luminescent_tree","crystalline_tree","bush","fern","lunar_vine","pool","spore","lantern_mushrooms","fiber"]);
const SPECIAL=new Set(["magnetic","crystalline","atypical","alien"]);
const NATURE=new Set(["forest","plain","swamp","fungal","aquatic","coastal","archipelago"]);
const MINERAL=new Set(["desert","volcanic","magnetic","crystalline","archaeological","ruins"]);
const RARE_PLANTS=new Set(["prismatic_orchid","rare_biological_resource"]);
const RARE_MINERALS=new Set(["stellar_iridium","energy_crystal"]);
const PHENOMENA=new Set(["electrostatic_storm","mobile_islet","fog_bank"]);
const normalize=v=>String(v||"").toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const contextOf=def=>normalize([
 def?.id,def?.name,def?.description,def?.profile,def?.generator?.biomeId,
 ...(def?.traits||[]).flatMap(t=>[t?.id,t?.label])
].join(" "));
const addOrRaise=(arr,type,w)=>{const e=arr.find(x=>x[0]===type);if(e)e[1]=Math.max(e[1],w);else arr.push([type,w]);};
const addOrRaiseResource=(arr,family,w)=>{const e=arr.find(x=>x.family===family);if(e)e.weight=Math.max(Number(e.weight)||0,w);else arr.push({family,weight:w});};
const deterministic=(d)=>{const s=`${d?.id||""}:${d?.seed||""}:${d?.number||""}`;let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0)/4294967296;};
const patch=(def,pop)=>{
 const profile=pop.profileId||def?.profile||"alien";
 const context=contextOf(def);
 const savanna=/savane|savanna/.test(context);
 const jungle=/jungle/.test(context);
 const amberForest=/foret d ambre|amber forest/.test(context);
 const vitrified=/lande vitrifi|vitrified/.test(context);
 const crystallineDesert=/desert.*crist|crist.*desert/.test(context);
 const celadon=/celadon/.test(context);
 const tropicalCoast=/cote tropical|tropical coast/.test(context);
 const pebbleCoast=/cote de galet|pebble coast/.test(context);
 const underwater=/sous marin|underwater|ocean/.test(context);
 const floating=/flott|suspend|levitat/.test(context);
 const tutorial=!!(def?.isStartingMap||def?.startingMap||def?.id==="crystal"||Number(def?.number)===1||Number(def?.generator?.discoveryIndex)<=2);
 const biomeId=String(def?.generator?.biomeId||"");
 const magneticWorld=biomeId==="magnetic"||profile==="magnetic"||/magnet/.test(context);
 const magneticRoll=deterministic(def);
 const alienFloatingSwamp=profile==="swamp"&&/marais|swamp/.test(context)&&/flott|floating/.test(context)&&/extraterrestre|alien/.test(context);
 const isletMap=(biomeId==="floating_islands")||(biomeId==="magnetic")||alienFloatingSwamp;
 let dec=(pop.decorations||[]).map(e=>[e[0],Number(e[1])||0]);
 let rw=(pop.resourceWeights||[]).map(e=>({...e}));
 let rocks=Number(pop.rockCount)||0;
 dec=dec.filter(([t])=>!CAMP_ONLY.has(t));
 if(profile==="desert"){
   dec=dec.filter(([t])=>!DESERT_FORBIDDEN.has(t));
   rw=rw.filter(e=>!["fiber","adaptive_plant","lunar_vine","thermosap_moss"].includes(e.family));
   addOrRaise(dec,"cactus",6); rocks=Math.max(rocks,14);
 } else if(profile==="volcanic"){
   dec=dec.filter(([t])=>!VOLCANIC_FORBIDDEN.has(t));
   rw=rw.filter(e=>!["fiber","lunar_vine"].includes(e.family));
   addOrRaise(dec,"frond",5); addOrRaise(dec,"needle",8); rocks=Math.max(rocks,16);
 }
 if(celadon)dec=dec.filter(([t])=>t!=="cactus");
 if(profile==="plain"){
   dec=dec.filter(([t])=>t!=="nature_tree");
   addOrRaise(dec,"lunar_vine",16); addOrRaise(dec,"bush",15); addOrRaise(dec,"frond",18); addOrRaise(dec,"luminescent_tree",3);
   const tree=dec.find(e=>e[0]==="tree"); if(tree)tree[1]=Math.min(tree[1],2); rocks=Math.min(rocks,6);
 }
 if(savanna){
   dec=dec.filter(([t])=>t!=="nature_tree");
   addOrRaise(dec,"luminescent_tree",5);
 }
 if(jungle){
   dec=dec.filter(([t])=>t!=="nature_tree");
   addOrRaise(dec,"lunar_vine",24);addOrRaise(dec,"fern",22);
 }
 if(profile==="forest"){addOrRaise(dec,"tree",36);addOrRaise(dec,"fern",22);rocks=Math.min(rocks,5);}
 if(profile==="swamp"){addOrRaise(dec,"tree",18);addOrRaise(dec,"fern",24);addOrRaise(dec,"fog_bank",2);rocks=Math.min(rocks,4);}
 if(profile==="fungal"){addOrRaise(dec,"lantern_mushrooms",30);rocks=Math.min(rocks,5);}
 if(profile==="frozen"){dec=dec.filter(([t])=>!["spore","lunar_vine","fern"].includes(t));addOrRaise(dec,"nature_tree",5);addOrRaise(dec,"strong_rock",9);}
 if(amberForest){addOrRaise(dec,"fossil_root_arch",8);addOrRaise(dec,"tree_fallen",10);addOrRaise(dec,"lantern_mushrooms",8);}
 if(vitrified){dec=dec.filter(([t])=>!["tree","nature_tree","luminescent_tree"].includes(t));addOrRaise(dec,"lantern_mushrooms",12);addOrRaise(dec,"crystalline_tree",10);}
 if(profile==="crystalline"){
   dec=dec.filter(([t])=>!["tree","nature_tree","luminescent_tree"].includes(t));
   addOrRaise(dec,"crystal",18);addOrRaise(dec,"crystalline_tree",9);
 }
 if(crystallineDesert){
   dec=dec.filter(([t])=>!["tree","nature_tree","luminescent_tree"].includes(t));
   addOrRaise(dec,"crystal",28);addOrRaise(dec,"crystalline_tree",7);
   addOrRaiseResource(rw,"crystal",34);addOrRaiseResource(rw,"energy_crystal",16);
 }
 if(magneticWorld&&!tutorial){
   if(magneticRoll<.58)addOrRaise(dec,"mobile_islet",7);
   if(((magneticRoll*7.13)%1)<.48)addOrRaise(dec,"electrostatic_storm",5);
   if(((magneticRoll*11.71)%1)<.44)addOrRaise(dec,"crystalline_tree",6);
 }
 if(tropicalCoast){dec=dec.filter(([t])=>t!=="nature_tree");addOrRaise(dec,"bush",14);addOrRaise(dec,"luminescent_tree",10);addOrRaise(dec,"crystalline_tree",4);}
 if(pebbleCoast){addOrRaise(dec,"nature_tree",12);const pool=dec.find(e=>e[0]==="pool");if(pool)pool[1]=Math.min(pool[1],3);}
 if(underwater){addOrRaise(dec,"lunar_vine",18);addOrRaise(dec,"lantern_mushrooms",15);addOrRaise(dec,"frond",14);addOrRaise(dec,"arch",2);rocks=Math.max(rocks,9);}
 if(profile==="archipelago"){dec=dec.filter(([t])=>t!=="nature_tree");addOrRaise(dec,"luminescent_tree",9);}
 if(floating||profile==="atypical"){dec=dec.filter(([t])=>t!=="nature_tree");addOrRaise(dec,"luminescent_tree",7);addOrRaise(dec,"fog_bank",2);}
 if(isletMap&&!tutorial)addOrRaise(dec,"mobile_islet",9);
 else dec=dec.filter(([t])=>t!=="mobile_islet");
 if(SPECIAL.has(profile))rw=rw.map(e=>({...e,weight:(RARE_MINERALS.has(e.family)||["magnetic_ore","logic_prism","pulse_core","memory_capsule"].includes(e.family))?e.weight*1.35:e.weight}));
 if(!NATURE.has(profile)&&!SPECIAL.has(profile)){rw=rw.filter(e=>!RARE_PLANTS.has(e.family));dec=dec.filter(([t])=>!RARE_PLANTS.has(t));}
 if(!MINERAL.has(profile)&&!SPECIAL.has(profile))rw=rw.filter(e=>!RARE_MINERALS.has(e.family));
 const faunaAllowed=FAUNA_BY_PROFILE[profile];
 if(faunaAllowed)dec=dec.filter(([t])=>!FAUNA.has(t)||faunaAllowed.has(t));
 if(tutorial){dec=dec.filter(([t])=>!FAUNA.has(t)&&!PHENOMENA.has(t)&&!/drone|tech_relic|logic_prism|pulse_core|memory_capsule|stellar_iridium|energy_crystal/.test(t));rw=rw.filter(e=>!/drone|logic_prism|pulse_core|memory_capsule|stellar_iridium|energy_crystal/.test(e.family));}
 if(!["ruins","archaeological"].includes(profile))dec.forEach(e=>{if(["arch","eroded_monolith","stele"].includes(e[0]))e[1]=Math.min(e[1],1);});
 // limit fauna to one or two types per map
 const faunaTypes=[...new Set(dec.filter(([t])=>FAUNA.has(t)).map(([t])=>t))];
 const faunaLimit=profile==="desert"?1:(deterministic(def)<.48?1:2);
 const keep=new Set(faunaTypes.slice(0,faunaLimit));
 dec=dec.filter(([t])=>!FAUNA.has(t)||keep.has(t));
 return {...pop,rockCount:rocks,decorations:dec,resourceWeights:Object.freeze(rw.map(Object.freeze)),policyVersion:"population-r3.1"};
};
const orig=base.getMapPopulation.bind(base);
BF.BiomeRules=Object.freeze({...base,getMapPopulation(def){return patch(def,orig(def));}});
BF.BiomePopulationPolicy=Object.freeze({version:"population-r3.1"});
})(window);
