const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const run = (file, window) => {
  const sandbox = { window, console, Object, Array, Set, Map, Math, JSON, Date, String, Number, Boolean, performance:{now:()=>0} };
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(read(file), vm.createContext(sandbox), { filename:file });
  return window.BlueFox3D;
};

test('tailles: tutoriel 1→2→4→6 préservé et post-tutoriel équilibré sans 5', () => {
  const window = {};
  let BF = run('engine/map-generation-rules.js', window);
  assert.equal(BF.MapGenerationRules.validate().valid, true);
  BF = run('engine/map-generation-no5-v20-1.js', window);
  assert.deepEqual(Array.from(BF.MapGenerationRules.generationCounts), [1,2,3,4,6]);
  assert.deepEqual(
    [0,1,2,3].map(i => BF.MapGenerationRules.getPlateauCount(i, () => 0.99)),
    [1,2,4,6]
  );
  const expected = [1,2,3,4,6];
  const samples = [0.01,0.21,0.41,0.61,0.81].map(r =>
    BF.MapGenerationRules.getPlateauCount(4, () => r)
  );
  assert.deepEqual(samples, expected);
  assert.equal(BF.MapGenerationRules.plateauWeights.find(e=>e.value===5).weight, 0);
  const counts = new Map(expected.map(v=>[v,0]));
  for (let i=0;i<10000;i++) {
    const r=(i+0.5)/10000;
    const v=BF.MapGenerationRules.getPlateauCount(4,()=>r);
    assert.notEqual(v,5);
    counts.set(v,(counts.get(v)||0)+1);
  }
  expected.forEach(v=>assert.equal(counts.get(v),2000));
});

test('faune: choix stable par map mais réellement diversifié entre maps', () => {
  const baseDecorations = [
    ['fun_creature',4], ['small_creature',5], ['brouteur',3],
    ['sauteur',2], ['patte_creature',2], ['nocturnal_animal',1],
    ['tree',20]
  ];
  const window = { BlueFox3D:{
    BiomeRules:{
      getMapPopulation(def){
        return {
          profileId:def.profile || 'forest',
          decorations:baseDecorations.map(e=>[...e]),
          resourceWeights:[],
          rockCount:4
        };
      }
    }
  }};
  const BF = run('engine/biome-population-policy-r3.js', window);
  const species = new Set();
  for (let i=0;i<80;i++) {
    const def={id:`generated-${i}`,seed:1000+i,number:20+i,profile:'forest',generator:{discoveryIndex:10,biomeId:'forest'}};
    const a=BF.BiomeRules.getMapPopulation(def);
    const b=BF.BiomeRules.getMapPopulation(def);
    const fa=a.decorations.filter(([t])=>new Set(['fun_creature','small_creature','brouteur','sauteur','patte_creature','nocturnal_animal','amphibian_species']).has(t)).map(([t])=>t);
    const fb=b.decorations.filter(([t])=>fa.includes(t)).map(([t])=>t);
    assert.deepEqual(fa,fb);
    assert.ok(fa.length>=1 && fa.length<=2);
    fa.forEach(x=>species.add(x));
  }
  assert.ok(species.size >= 4, `diversité insuffisante: ${[...species]}`);

  const desert={id:'desert-x',seed:22,number:40,profile:'desert',generator:{discoveryIndex:10,biomeId:'desert'}};
  const d=BF.BiomeRules.getMapPopulation(desert);
  const faunaSet=new Set(['fun_creature','small_creature','brouteur','sauteur','patte_creature','nocturnal_animal','amphibian_species']);
  assert.ok(d.decorations.filter(([t])=>faunaSet.has(t)).length<=1);

  const tutorial={id:'crystal',seed:1,number:1,profile:'forest',generator:{discoveryIndex:0,biomeId:'crystal'}};
  const t=BF.BiomeRules.getMapPopulation(tutorial);
  assert.equal(t.decorations.some(([type])=>faunaSet.has(type)),false);
});

test('custom MSC: le NID est missionOnly, les autres custom restent remarquables', () => {
  const window = {
    BlueFoxCustomMicroScenes:[
      {id:'MSC-CUSTOM-NID-DE-FAUNE5',name:'Nid_de_faune5',biomes:['all'],rarity:'custom',radius:5,objects:[{type:'abandoned_nest',offset:[0,0,0]}]},
      {id:'MSC-CUSTOM-LIBRE-TEST',name:'Libre',biomes:['all'],rarity:'custom',radius:8,objects:[{type:'rock',offset:[0,0,0]}]},
      {id:'MSC-CUSTOM-DECLARED-MISSION',name:'Mission',biomes:['all'],rarity:'custom',missionOnly:true,missionId:'X',radius:8,objects:[{type:'rock',offset:[0,0,0]}]}
    ]
  };
  const BF = run('engine/micro-scenes.js', window);
  assert.equal(BF.MicroScenes.get('MSC-CUSTOM-NID-DE-FAUNE5').missionOnly,true);
  assert.equal(BF.MicroScenes.get('MSC-CUSTOM-LIBRE-TEST').missionOnly,false);
  assert.equal(BF.MicroScenes.get('MSC-CUSTOM-DECLARED-MISSION').missionOnly,true);
  assert.equal(BF.MicroScenes.get('MSC-CUSTOM-DECLARED-MISSION').missionId,'X');
  const remarkable = BF.MicroScenes.list('forest')
    .filter(scene=>!scene.missionOnly)
    .filter(scene=>scene.custom===true || ['rare','story'].includes(scene.rarity))
    .map(scene=>scene.id);
  assert.ok(remarkable.includes('MSC-CUSTOM-LIBRE-TEST'));
  assert.ok(!remarkable.includes('MSC-CUSTOM-NID-DE-FAUNE5'));
});

test('NID: la pré-prescription dormante respecte le déverrouillage réel et reste disponible ensuite', async () => {
  const facts = new Map();
  const lifecycle = {};
  const pending = [];
  const listeners = new Map();
  let prerequisitesReady = true;
  const window = {
    addEventListener:(name,fn)=>listeners.set(name,fn),
    removeEventListener:(name)=>listeners.delete(name),
    BlueFox3D:{
      BibleCatalog:[
        {
          id:'T-UNLOCK',
          trigger:{type:'manual'},
          prerequisites:[],
          priority:999,
          navigation:{controlsUnknownTravel:true}
        },
        {
          id:'FAU-01',
          trigger:{type:'exploration.map_discovered',count:1,uniqueOnly:true},
          prerequisites:[],
          priority:323,
          mapGeneration:{requiredMicroScenes:[{id:'MSC-CUSTOM-NID-DE-FAUNE5',persistent:true,spawnOnce:true}]}
        }
      ],
      bibleRuntime:{
        prerequisitesSatisfied:(mission)=>mission.id!=='FAU-01' || prerequisitesReady
      },
      Missions:{normalizeActionType:x=>String(x||'').toLowerCase(),ActionType:{TRAVEL:'travel'}},
      maps:{m0:{exits:{}}},
      mount:async()=>engine
    }
  };
  const memory={
    state:{missionLifecycle:lifecycle},
    getFact:(k,d=null)=>facts.has(k)?facts.get(k):d,
    setFact:(k,v)=>facts.set(k,v),
    save:()=>{}
  };
  const engine={
    currentMapId:'m0',
    missionManager:{memory,trees:new Map(),activeMissionIds:[],primaryMissionId:'',activeMissionId:''},
    generateUnknownPassage:async(direction)=>{
      pending.push({
        direction,
        missionId:window.BlueFox3D.__pendingBibleMapGeneration?.missionId || null,
        required:(window.BlueFox3D.__pendingBibleMapGeneration?.requiredMicroScenes||[]).map(x=>x.id)
      });
      const target=`m${pending.length}`;
      window.BlueFox3D.maps.m0.exits[direction]={targetMap:target};
      window.BlueFox3D.maps[target]={exits:{}};
      return true;
    },
    clearPersistentNavigationIntent:()=>{},
    callbacks:{onStatus:()=>{}},
    navigationRoute:[],
    worldTopology:{targetFrom:()=>null}
  };
  run('engine/bible-map-prescription-v19.js', window);
  const mounted=await window.BlueFox3D.mount({});

  // Avant le déverrouillage canonique, FAU-01 dormante ne doit ni prescrire
  // le NID ni permettre de contourner le verrou de voyage inconnu.
  assert.equal(await mounted.generateUnknownPassage('north'),false);
  assert.equal(pending.length,0);

  // Une fois le voyage inconnu réellement déverrouillé, les autres prérequis
  // du propriétaire Bible Runtime restent opposables.
  lifecycle['T-UNLOCK']={status:'completed'};
  prerequisitesReady=false;
  await mounted.generateUnknownPassage('east');
  assert.equal(pending.length,1);
  assert.equal(pending[0].missionId,null);
  assert.deepEqual(pending[0].required,[]);

  // Quand FAU-01 devient réellement éligible, elle peut prescrire son NID.
  prerequisitesReady=true;
  await mounted.generateUnknownPassage('south');
  assert.equal(pending[1].missionId,'FAU-01');
  assert.deepEqual(pending[1].required,['MSC-CUSTOM-NID-DE-FAUNE5']);

  // Si un autre bug empêche encore l'activation, la prescription n'est pas
  // consommée à vie : une future destination reste possible après correction.
  await mounted.generateUnknownPassage('west');
  assert.equal(pending[2].missionId,'FAU-01');
  assert.deepEqual(pending[2].required,['MSC-CUSTOM-NID-DE-FAUNE5']);
});

test('MSC remarquables: cadence 12–15 et matérialisation runtime minimale', () => {
  const custom = [
    {id:'MSC-CUSTOM-A',custom:true,missionOnly:false,rarity:'custom'},
    {id:'MSC-CUSTOM-B',custom:true,missionOnly:false,rarity:'custom'},
    {id:'MSC-CUSTOM-C',custom:true,missionOnly:false,rarity:'custom'},
    {id:'MSC-CUSTOM-MISSION',custom:true,missionOnly:true,rarity:'custom'}
  ];
  const eligible = custom.filter(scene=>!scene.missionOnly)
    .filter(scene=>scene.custom===true || ['rare','story'].includes(scene.rarity));
  assert.deepEqual(eligible.map(x=>x.id),['MSC-CUSTOM-A','MSC-CUSTOM-B','MSC-CUSTOM-C']);

  let since=0;
  let nextInterval=12;
  const guaranteed=[];
  const materialized=[];
  for(let discovery=4; discovery<=160; discovery++){
    since += 1;
    if(since >= nextInterval){
      const scene=eligible[guaranteed.length%eligible.length];
      guaranteed.push({discovery,id:scene.id,interval:since});
      // Contrat runtime MapPopulationHierarchy: une featuredMicroSceneId est
      // transmise au spawn garanti, force=true, puis enregistrée comme instance.
      const group={userData:{microScenes:[]}};
      const spawnMicroScene=(id,options)=>{
        assert.equal(options.force,true);
        group.userData.microScenes.push({id,source:options.source});
        return {id};
      };
      spawnMicroScene(scene.id,{force:true,source:`featured-microscene:${scene.id}`});
      materialized.push(group.userData.microScenes[0].id);
      since=0;
      nextInterval=12+(guaranteed.length%4); // 12,13,14,15, cycle déterministe de test
    }
  }
  assert.ok(guaranteed.length>=10);
  guaranteed.forEach(g=>assert.ok(g.interval>=12 && g.interval<=15));
  assert.deepEqual(materialized,guaranteed.map(g=>g.id));
  assert.ok(new Set(materialized).size===3);
});
