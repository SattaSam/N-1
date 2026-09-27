const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'..');
function boot(){
 const store=new Map();
 const window={BlueFox3D:{},localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},performance:{now:()=>0},Math,Date};window.window=window;
 const BF=window.BlueFox3D;
 BF.maps={template:{id:'template',number:1,name:'Template',profile:'forest',traits:[{id:'forest'}],sceneUrl:'scene.glb',terrainUrls:['terrain.jpg'],palette:{ground:1,accent:2},generated:false}};
 BF.MapGenerationRules={discoveryCadence:{eligibleAfterDiscovery:1,rareBiomeIds:[],rareBiomeInterval:{min:99,max:99},decorativeSceneInterval:{min:99,max:99},remarkableSceneInterval:{min:99,max:99},northernFrozenMultiplier:1},biomes:[{id:'forest',label:'Forêt',weight:1}],pickBiome:()=>({id:'forest',label:'Forêt'}),toLegacyBiomeDraft:()=>({profile:'forest',traits:[{id:'forest'}],resourceFamilies:['wood'],microSceneIds:['MSC-PREDATOR-FLORA-001','MSC-ECO-STAR-001']}),getPlateauCount:()=>1,pickRichness:()=>({id:'standard'}),validate:()=>({valid:true})};
 BF.MicroScenes={list:()=>[{id:'MSC-PREDATOR-FLORA-001',rarity:'uncommon',missionOnly:false,biomes:['forest']},{id:'MSC-ECO-STAR-001',rarity:'story',missionOnly:false,biomes:['forest']}],get:()=>null};
 const ctx=vm.createContext({window,console,Math,Date,Uint32Array});vm.runInContext(fs.readFileSync(path.join(root,'engine/map-generator.js'),'utf8'),ctx);return {BF};
}
function generate(seed,context,legacyFlag){const {BF}=boot();BF.__pendingBibleMapGenerationContext=context;return BF.MapGenerator.generate({planetSeed:seed,ordinal:1,discoveryIndex:2,fromMapId:'a',direction:'north',lowMissionProgress:legacyFlag});}
{
 const d=generate(1,{intent:'mission-destination',opportunisticEncounterEligible:false,longMissionTransit:false},true);assert.deepStrictEqual(Array.from(d.generator.featuredMicroSceneIds),[],'lowMissionProgress ne doit plus forcer une opportunité');assert.equal(d.generator.cadence.missionOpportunityEligible,false);
}
let normalOpp=0,longOpp=0,normalDanger=0,longDanger=0;const runs=240;
for(let seed=1;seed<=runs;seed++){
 const normal=generate(seed,{intent:'free-exploration',opportunisticEncounterEligible:true,longMissionTransit:false},false);if(normal.generator.featuredMicroSceneId){normalOpp++;if(normal.generator.featuredMicroSceneId==='MSC-PREDATOR-FLORA-001')normalDanger++;}assert.equal(normal.generator.cadence.missionOpportunityChance,0.25);
 const long=generate(seed,{intent:'mission-transit',opportunisticEncounterEligible:true,longMissionTransit:true},false);if(long.generator.featuredMicroSceneId){longOpp++;if(long.generator.featuredMicroSceneId==='MSC-PREDATOR-FLORA-001')longDanger++;}assert.equal(long.generator.cadence.missionOpportunityChance,0.65);
}
assert(normalOpp>0&&normalOpp<runs,'exploration libre doit rester probabiliste');assert(longOpp>normalOpp,`transit long pas plus fréquent: ${normalOpp} -> ${longOpp}`);assert(longDanger>normalDanger,`danger non renforcé: ${normalDanger} -> ${longDanger}`);assert(longDanger/Math.max(1,longOpp)>0.65,`pondération danger trop faible parmi opportunités longues: ${longDanger}/${longOpp}`);
console.log(`PASS P0 map-generator: normal ${normalOpp}/${runs} (danger ${normalDanger}), long ${longOpp}/${runs} (danger ${longDanger})`);
