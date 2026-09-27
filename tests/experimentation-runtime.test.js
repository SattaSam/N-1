const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
function harness(){
  const inventory={parts:100,azure_ferrite:100,resonant_basalt:100,stellar_iridium:100,magnetic_ore:100,crystal:100,core:20};
  let reevaluations=0,publishes=0;
  const memory={state:{researchUnlocks:{},missionLifecycle:{}},save(){},getFact(){return null},setFact(){}};
  const manager={memory,reevaluatePendingActivations(){reevaluations++;return true},catalogController:{schedule(){}},publish(){publishes++}};
  const BF={
    Missions:{ActionType:{},MissionStatus:{}},
    BiblePatterns:{},BibleCatalog:[],
    BibleExperiments:[{
      id:'engineering',label:'Ingénierie',axis:'research',stages:[
        {stage:1,location:'camp',title:'E1',requirements:[{inventoryKey:'parts',quantity:10},{inventoryKeys:['azure_ferrite','resonant_basalt','stellar_iridium'],quantity:6}],narratives:['n1']},
        {stage:2,location:'camp',title:'E2',requirements:[{inventoryKey:'parts',quantity:8},{inventoryKey:'magnetic_ore',quantity:4},{inventoryKey:'crystal',quantity:3}],narratives:['n2']},
        {stage:3,location:'camp',title:'E3',requirements:[{inventoryKey:'parts',quantity:10},{inventoryKey:'core',quantity:2},{inventoryKeys:['azure_ferrite','resonant_basalt','stellar_iridium'],quantity:4}],knowledge:{id:'reverse_engineering',label:'Rétro-ingénierie comprise'},narratives:['n3']},
        {stage:4,location:'workbench',title:'E4',requirements:[{inventoryKey:'parts',quantity:8},{inventoryKey:'core',quantity:2},{inventoryKey:'stellar_iridium',quantity:4}],narratives:['n4']},
        {stage:5,location:'workbench',title:'E5',requirements:[{inventoryKey:'parts',quantity:8},{inventoryKey:'core',quantity:2},{inventoryKey:'crystal',quantity:2},{inventoryKey:'resonant_basalt',quantity:2}],knowledge:{id:'advanced_engineering',label:'Ingénierie avancée'},narratives:['n5']}
      ]
    }],
    currentEngine:{currentMapId:'crystal',currentZoneIndex:0,missionManager:manager,callbacks:{onStatus(){},onSpeak(){},onAction(){}},speechVisible:false},
    progression:{availableInventory(keys){return [...new Set(keys)].reduce((n,k)=>n+(inventory[k]||0),0)}},
    canAccessCampInventory:()=>true,
    consumeInventoryPool(keys,qty){
      if(BF.progression.availableInventory(keys)<qty)return 0;
      let left=qty; for(const k of keys){const take=Math.min(left,inventory[k]||0);inventory[k]-=take;left-=take;if(!left)break;} return left?0:qty;
    },
    BibleContractV01:{validateCatalog(){return{ok:true,errors:[],warnings:[]}}},registerMissionDefinitions(){return 0}
  };
  const localStorage={getItem(){return null},setItem(){},removeItem(){}};
  const window={BlueFox3D:BF,localStorage,addEventListener(){},removeEventListener(){},dispatchEvent(){},setTimeout(){return 1},clearTimeout(){},queueMicrotask(){}};
  const context=vm.createContext({window,console:{info(){},warn(){},error(){}},performance:{now:()=>0},Date,Set,Map,WeakMap,CustomEvent:function(type,init){this.type=type;this.detail=init?.detail},Math,Object,Array,JSON,Promise});
  let src=fs.readFileSync(path.join(ROOT,'engine/bible-runtime-v0-1-unified.js'),'utf8').replace(/\n\s*runtime\.start\(\);\n\}\)\(window\);\s*$/,'\n})(window);');
  vm.runInContext(src,context);
  const runtime=new BF.BibleRuntimeV01();
  BF.bibleRuntime=runtime;
  BF.Research={experimentationForKnowledge:id=>runtime.experimentKnowledgeDefinition(id)};
  return {BF,runtime,inventory,memory,get reevaluations(){return reevaluations},get publishes(){return publishes}};
}
test('expérimentation consomme le stock réel, persiste le compteur et débloque au seuil 3',()=>{
  const h=harness();
  const startParts=h.inventory.parts;
  for(let i=0;i<3;i++) assert.equal(h.runtime.runExperiment('engineering',{source:'test'}),true);
  assert.equal(h.memory.state.researchExperiments.engineering.count,3);
  assert.equal(h.runtime.isResearchRewardUnlocked('reverse_engineering'),true);
  assert.ok(h.inventory.parts<startParts);
  assert.equal(h.reevaluations,3,'chaque expérimentation provoque une réévaluation causale');
});
test('étapes 4/5 exigent réellement l établi et débloquent le seuil 5',()=>{
  const h=harness();
  for(let i=0;i<3;i++) assert.equal(h.runtime.runExperiment('engineering'),true);
  h.runtime.canAccessWorkbench=()=>false;
  assert.equal(h.runtime.experimentState('engineering').canRun,false);
  assert.equal(h.runtime.runExperiment('engineering'),false);
  h.runtime.canAccessWorkbench=()=>true;
  assert.equal(h.runtime.runExperiment('engineering'),true);
  assert.equal(h.runtime.runExperiment('engineering'),true);
  assert.equal(h.memory.state.researchExperiments.engineering.count,5);
  assert.equal(h.runtime.isResearchRewardUnlocked('advanced_engineering'),true);
});
