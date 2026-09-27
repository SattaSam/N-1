const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

function load(file, context) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
}
function context(extra={}) {
  const listeners = new Map();
  const window = {
    addEventListener:(n,f)=>listeners.set(n,f), removeEventListener(){}, dispatchEvent(){},
    performance:{now:()=>1000}, localStorage:{getItem:()=>null,setItem(){},removeItem(){}}, setInterval:()=>0, clearInterval(){},
    ...extra
  };
  window.window=window; window.globalThis=window;
  return vm.createContext(window);
}

test('SUR-07 data contract', () => {
  const ctx=context();
  load('data/bible-catalog.js',ctx);
  const BF=ctx.BlueFox3D;
  const sur=BF.BibleCatalog.find(m=>m.id==='SUR-07');
  assert.ok(sur);
  assert.deepEqual([...sur.experimentalPrerequisites],['biology_experimented']);
  const bio=BF.BibleExperiments.find(e=>e.id==='biology');
  assert.equal(bio.stages[0].knowledge.id,'biology_experimented');
  assert.equal(sur.sequence.find(s=>s.slot==='collectBiomass').target,12);
  assert.equal(sur.sequence.find(s=>s.slot==='collectFiber').target,4);
  const exp=sur.sequence.find(s=>s.slot==='experimentConservation');
  assert.equal(exp.action,'research');
  assert.equal(exp.params.requiresShelter,true);
  assert.equal(JSON.stringify(exp.params.inventoryConsume.map(x=>[x.inventoryKey,x.quantity])),JSON.stringify([['adaptive_biomass',12],['fiber',4]]));
  const craft=sur.sequence.find(s=>s.slot==='craftRations');
  assert.equal(craft.params.recipeId,'ration-basic-v2');
  assert.equal(craft.target,3);
  assert.deepEqual([...craft.requires],['experimentConservation']);
  assert.equal(sur.rewards[0].id,'ration_conservation_mastery');
  assert.equal(sur.theme,'Flore');
});

test('mission research consumes 12 biomass + 4 fiber before routine', () => {
  const stock={adaptive_biomass:12,fiber:4};
  const ctx=context();
  const BF=ctx.BlueFox3D={
    Missions:{ActionType:{RESEARCH:'research',COLLECT:'collect',EXTRACT:'extract',INSPECT:'inspect',ANALYZE:'analyze',OBSERVE:'observe',EXPLORE_ZONE:'explore-zone',REST:'rest',EAT:'eat'}},
    canAccessCampInventory:()=>true,
    progression:{availableInventory:keys=>stock[keys[0]]||0},
    consumeInventoryPoolOnce:(id,keys,qty)=>{const k=keys[0]; if((stock[k]||0)<qty)return 0; stock[k]-=qty; return qty;}
  };
  const engine={transitioning:false,pendingInteraction:null,currentRoutine:null,pendingZoneExploration:null,pendingGate:null,character:{root:{position:{distanceTo:()=>0}},target:{}},startRoutine:(name)=>{engine.currentRoutine=name;}};
  load('engine/action-bridge.js',ctx);
  const bridge=new BF.Missions.ActionBridge(engine);
  const ok=bridge.execute({type:'research',missionId:'SUR-07',nodeId:'SUR-07:experimentConservation',params:{requiresShelter:true,inventoryConsume:[{inventoryKey:'adaptive_biomass',quantity:12},{inventoryKey:'fiber',quantity:4}]}},1000);
  assert.equal(ok,true); assert.deepEqual(stock,{adaptive_biomass:0,fiber:0}); assert.equal(engine.currentRoutine,'research');
  engine.currentRoutine=null;
  assert.equal(bridge.execute({type:'research',missionId:'OTHER',nodeId:'OTHER:research',params:{}},1100),true);
  assert.equal(engine.currentRoutine,'research');
});

test('ration collection preference is contextual and favors richer biomass after SUR-07', () => {
  const ctx=context();
  const BF=ctx.BlueFox3D={};
  const rich={userData:{active:true,functional:{type:'rare_biological_resource',resource:{inventoryKey:'adaptive_biomass',quantity:15},interaction:{actions:['collect']},gameplay:{collectable:true}}},position:{d:10}};
  const poor={userData:{active:true,functional:{type:'adaptive_plant',resource:{inventoryKey:'adaptive_biomass',quantity:1},interaction:{actions:['collect']},gameplay:{collectable:true}}},position:{d:1}};
  BF.Rations={snapshot:()=>({rations:0,maxRations:50}),maxRations:50};
  BF.getRationState=()=>({rations:0});
  let learned=false;
  BF.Research={get:id=>id==='ration-basic-v2'?{id,type:'research.recipe',requirements:[{inventoryKey:'adaptive_biomass',quantity:1}],output:{objectId:'ration',quantity:1},autoCraft:true}:null,isUnlocked:id=>id==='ration-basic-v2'||(id==='ration_conservation_mastery'&&learned)};
  BF.progression={availableInventory:()=>0}; BF.canAccessCampInventory=()=>false; BF.isTutorialSurvivalCapabilityUnlocked=()=>true;
  let selected=null;
  const engine={missionManager:{primaryMissionId:'',hasPrimaryMissionAuthority:()=>false},currentMap:{interactables:[poor,rich]},canInteractWith:()=>true,character:{root:{position:{distanceTo:p=>p.d}}},pickNearestInteractable:xs=>xs.slice().sort((a,b)=>a.position.d-b.position.d)[0],targetInteraction:o=>{selected=o;return true;},callbacks:{onStatus(){}}};
  load('engine/survival-rations-ai-v0-3.js',ctx);
  const before=BF.RationPolicy.autonomyCandidate(engine,1000);
  assert.equal(before.execute(),true);
  assert.equal(selected,poor);
  selected=null; learned=true;
  const candidate=BF.RationPolicy.autonomyCandidate(engine,1000);
  assert.equal(candidate.id,'survival-ration-ingredient');
  assert.equal(candidate.execute(),true);
  assert.equal(selected,rich);
});
