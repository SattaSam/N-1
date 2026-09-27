const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const listeners={},defs={},facts={},lifecycles={},receipts={};
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail||{}}}
const inventory={energy_crystal:25,biocapital:40,fiber:20,crystal:10};
const unlocked={};
const objectDefs=[
 {label:'Cristal bleu',rarity:'rare',gameplay:{collectable:true},interaction:{actions:['collect']},resource:{inventoryKey:'energy_crystal'}},
 {label:'BioCapital',rarity:'common',gameplay:{collectable:true},interaction:{actions:['collect']},resource:{inventoryKey:'biocapital'}},
 {label:'Fibres',rarity:'common',gameplay:{collectable:true},interaction:{actions:['collect']},resource:{inventoryKey:'fiber'}},
 {label:'Cristaux',rarity:'common',gameplay:{collectable:true},interaction:{actions:['collect']},resource:{inventoryKey:'crystal'}}
];
const window={console,Date,Math,CustomEvent:CE,setTimeout(fn){fn();return 1},addEventListener(t,f){(listeners[t]||(listeners[t]=new Set())).add(f)},removeEventListener(t,f){listeners[t]?.delete(f)},dispatchEvent(e){for(const f of listeners[e.type]||[])f(e)},document:null,BlueFox3D:{
 maps:{'custom-map-31-tinycity':{id:'custom-map-31-tinycity'}},Missions:{definitions:defs},registerMissionDefinitions(list){for(const d of list)defs[d.id]=d;return list.length},
 ObjectLibrary:{list(){return objectDefs}},ObjectEvents:{types:{NPC_CONTACTED:'NPC_CONTACTED',RESOURCE_COLLECTED:'RESOURCE_COLLECTED'},subscribe(){return ()=>{}}},
 getProgressionState(){return {inventory:{...inventory}}},consumeInventory(key,q){const n=Math.min(Number(inventory[key])||0,q);inventory[key]=(Number(inventory[key])||0)-n;window.dispatchEvent(new CE('bluefox:progression-changed',{detail:{reason:'inventory-consumed',event:{inventoryKey:key,quantity:n}}}));return n},
 grantInventory(key,q){inventory[key]=(Number(inventory[key])||0)+q;return q},getInventoryCapacityState(){return {capacity:999,count:Object.values(inventory).reduce((a,b)=>a+b,0)}},
 Research:{isUnlocked(id){return Boolean(unlocked[id])}},bibleRuntime:{unlockResearchRewards(mission){let changed=0;for(const reward of mission.rewards||[]){if(!unlocked[reward.id]){unlocked[reward.id]=true;changed++}}return changed}},
 currentEngine:null
}};window.window=window;
const ctx=vm.createContext(window);vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/mission-catalog.js'),'utf8'),ctx);
const BF=window.BlueFox3D;
const memory={state:{missionLifecycle:lifecycles},getFact:(k,d)=>k in facts?facts[k]:d,setFact:(k,v)=>{facts[k]=v;return v},save(){},hasEffectReceipt:k=>Boolean(receipts[k]),recordEffectReceipt:(k,v)=>{receipts[k]=v;return true}};
const manager={memory,definition:id=>defs[id]||null,startMission(){return false}};
const ctl=new BF.Missions.MissionCatalogController(manager);manager.catalogController=ctl;BF.currentEngine={missionManager:manager,currentMapId:'none',callbacks:{onAction(){}}};
const canonicalCatalog=ctl.resourceCatalog();assert(canonicalCatalog.some(entry=>entry.key==='energy_crystal'));assert(canonicalCatalog.some(entry=>entry.key==='fiber'));objectDefs.push({label:'Décor non récoltable',rarity:'common',gameplay:{collectable:false},interaction:{actions:['inspect']},resource:{inventoryKey:'not_tradeable'}});assert.equal(ctl.resourceCatalog().some(entry=>entry.key==='not_tradeable'),false);
ctl.setRelation('rocky','friendly');
let result=ctl.purchaseBlueprint('rocky');assert.equal(result.ok,false);assert.equal(result.reason,'reputation');assert.equal(inventory.energy_crystal,25);
ctl.setRelation('rocky','honored');inventory.energy_crystal=24;result=ctl.purchaseBlueprint('rocky');assert.equal(result.ok,false);assert.equal(result.reason,'inventory');assert.equal(inventory.energy_crystal,24);
inventory.energy_crystal=25;result=ctl.purchaseBlueprint('rocky');assert.equal(result.ok,true);assert.equal(inventory.energy_crystal,0);assert.equal(BF.Research.isUnlocked('quantum-geographic-marker-blueprint-v1'),true);
result=ctl.purchaseBlueprint('rocky');assert.equal(result.ok,false);assert.equal(result.reason,'owned');
ctl.setRelation('translucent','honored');facts['civilization:trade:prismatic-orchid-balance']=24;result=ctl.purchaseBlueprint('translucent');assert.equal(result.ok,false);assert.equal(result.reason,'orchid');assert.equal(inventory.biocapital,40);
facts['civilization:trade:prismatic-orchid-balance']=25;result=ctl.purchaseBlueprint('translucent');assert.equal(result.ok,true);assert.equal(inventory.biocapital,15);assert.equal(BF.Research.isUnlocked('fragmenter-assembler-blueprint-v1'),true);assert(facts['civilization:research:teleport-hypothesis-v1']);assert.equal(facts['civilization:research:teleport-hypothesis-v1'].unlocksTeleporter,false);
ctl.dispose();console.log('PASS npc-r3-trade-runtime');
