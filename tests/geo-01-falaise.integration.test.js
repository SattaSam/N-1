const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');

function ctx(loadFiles=[]) {
  const listeners=new Map(), storage=new Map();
  class CustomEvent { constructor(type,init={}){this.type=type;this.detail=init.detail;} }
  const window={CustomEvent,console,performance,setTimeout,clearTimeout,setInterval,clearInterval,BlueFox3D:{},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},addEventListener(t,l){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(l)},removeEventListener(t,l){listeners.get(t)?.delete(l)},dispatchEvent(e){for(const l of [...(listeners.get(e.type)||[])])l(e);return true}};
  const context=vm.createContext({window,console,CustomEvent,performance,setTimeout,clearTimeout,setInterval,clearInterval});
  const load=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),context,{filename:f});
  loadFiles.forEach(load);
  return {window,load,storage};
}

const coreFiles=['engine/object-library.js','engine/mission-types.js','engine/mission-tree.js','engine/mission-memory.js','engine/mission-planner.js','engine/action-bridge.js','engine/mission-manager.js','engine/mission-empty-core.js','engine/mission-catalog.js','engine/object-event-registry.js','engine/bible-contract-v0-1.js','data/bible-patterns.js','data/bible-catalog.js','engine/bible-runtime-v0-1-unified.js'];

function game(window){
 const BF=window.BlueFox3D;
 const pos={x:0,y:0,z:0,distanceTo(){return 0}};
 const engine={callbacks:{onAction(){},onStatus(){},onCollect(){},onSpeak(){}},currentMapId:'geo-map',currentZoneIndex:0,currentMap:{interactables:[],zoneRegions:[],gates:[]},character:{root:{position:pos},target:pos,stop(){},setTarget(){return true},facePoint(){},cancelInteraction(){},findAvailableClip(){return''},actions:new Map(),play(){},playInteraction(){return 0},currentAnimation:''},discoveredZones:new Set(),pendingInteraction:null,currentRoutine:null,pendingGate:null,pendingZoneExploration:null,transitioning:false,resourceCooldowns:new WeakMap(),disposed:false,interactionWorldPosition(o){return o.position},targetInteraction(){return true}};
 const manager=BF.Missions.MissionManager.create({engine}); engine.missionManager=manager; BF.currentEngine=engine; BF.getMissionState=()=>manager.getState(); return {BF,engine,manager};
}
function obj(def,instanceId,pms){ const o={position:{x:0,y:0,z:0,distanceTo(){return 0}},userData:{active:true,functional:def,instanceId,persistentMicroSceneId:pms}};o.userData.worldAnchor=o;return o; }

function emit(BF,o,mapId,node){return BF.ObjectEvents.emit(BF.ObjectEvents.types.PHENOMENON_OBSERVED,o,{mapId,missionId:'GEO-01',missionNodeId:node,cuoType:o.userData.functional.type,interactionSource:'mission'});}

test('GEO-01 catalogue/contrat: 3 falaises stables, 6 plateaux, psychologie minimale',()=>{
 const {window}=ctx(coreFiles); const BF=window.BlueFox3D; const m=BF.BibleCatalog.find(x=>x.id==='GEO-01'); assert.ok(m);
 assert.equal(BF.BibleCatalog.length,26); assert.equal(m.trigger.type,'exploration.map_discovered'); assert.equal(m.trigger.direction,'east'); assert.equal(m.mapGeneration.size,6); assert.equal(m.passivePriorityAxis,'collection'); assert.equal(m.ponderation,1); assert.equal(m.obsessionEligible,undefined); assert.equal(m.souvenir,undefined);
 assert.deepEqual(Array.from(m.mapGeneration.requiredMicroScenes,x=>x.instanceId),['FALAISE1-A','FALAISE2','FALAISE1-B']);
 assert.equal(BF.BibleContractV01.validateMission(m,BF.BiblePatterns).ok,true);
 assert.equal(BF.BibleContractV01.validateMission({...m,id:'REL-PMS',sequence:[{slot:'a',action:'observe',target:1,params:{family:'geology'}},{slot:'b',action:'observe',target:1,requires:['a'],params:{family:'geology',relation:{fromSlot:'a',sameBy:['persistentMicroSceneId']}}}]},BF.BiblePatterns).ok,true);
});

test('sources falaises exactes: contenus attendus et energy_crystal conservé',()=>{
 for(const [name,exp] of [['MSC-CUSTOM-FALAISE1.json',{large_rock:5,strong_rock:3,energy_crystal:2,crystal:1,debris:13}],['MSC-CUSTOM-FALAISE2.json',{large_rock:9,strong_rock:3,energy_crystal:2,crystal:1,debris:13}]]){
  const j=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/MSC_saves',name),'utf8')); const c={}; for(const o of j.objects)c[o.type]=(c[o.type]||0)+1; assert.equal(j.radius,11.01590281928424); assert.deepEqual(c,exp);
 }
});

test('prescription map transmet instanceId à PersistentMicroScenes sans fusion',()=>{
 const {window,load}=ctx([]); const BF=window.BlueFox3D; const records=[];
 BF.MapGenerator={generate(){return{id:'g',plateauCount:6,generator:{biomeId:'x'}}},storageKey:'x'}; BF.MapIntegrity={persistGeneratedDefinition(){return true},prepareDefinition(d){return d}}; BF.PersistentMicroScenes={ensure(def,spec){records.push(spec);(def.persistentMicroScenes||=[]).push(spec);return spec}}; BF.__pendingBibleMapGeneration={missionId:'GEO-01',requiredMicroScenes:[{id:'MSC-CUSTOM-FALAISE1',instanceId:'FALAISE1-A',persistent:true},{id:'MSC-CUSTOM-FALAISE2',instanceId:'FALAISE2',persistent:true},{id:'MSC-CUSTOM-FALAISE1',instanceId:'FALAISE1-B',persistent:true}]};
 load('engine/map-generator-bible-overrides-v19.js'); const d=BF.MapGenerator.generate({}); assert.deepEqual(records.map(r=>r.instanceId),['FALAISE1-A','FALAISE2','FALAISE1-B']); assert.equal(new Set(records.map(r=>r.instanceId)).size,3); assert.equal(d.persistentMicroScenes.length,3);
});

test('ObjectEvent propage persistentMicroSceneId',()=>{
 const {window}=ctx(['engine/object-library.js','engine/object-event-registry.js']); const BF=window.BlueFox3D; const d=BF.ObjectLibrary.get('large_rock'); const e=BF.ObjectEvents.emit(BF.ObjectEvents.types.OBJECT_SEEN,obj(d,'r1','FALAISE1-A'),{mapId:'geo-map'}); assert.equal(e.persistentMicroSceneId,'FALAISE1-A'); assert.equal(e.family,'geology');
});

test('GEO-01 progression: ordre libre, une seule fois par falaise, hors MSC/cristaux/autre map exclus, reload conservé',async()=>{
 const {window,load}=ctx(coreFiles); const BF=window.BlueFox3D; BF.mount=async o=>o.engine; load('engine/object-m0-bridge.js'); const {engine,manager}=game(window); await BF.mount({engine}); assert.equal(manager.startMission('GEO-01',{primary:true}),true); manager.memory.setFact('tutorialExcursion:GEO-01',{generatedTargetMapId:'geo-map'}); manager.memory.save();
 const rock=BF.ObjectLibrary.get('large_rock'), strong=BF.ObjectLibrary.get('strong_rock'), crystal=BF.ObjectLibrary.get('crystal'), energy=BF.ObjectLibrary.get('energy_crystal'); const tree=manager.trees.get('GEO-01'); const A=()=>tree.find('GEO-01:layerA'),B=()=>tree.find('GEO-01:layerB'),C=()=>tree.find('GEO-01:layerC');
 emit(BF,obj(rock,'outside',null),'geo-map','GEO-01:layerA'); assert.equal(A().progress,0);
 emit(BF,obj(crystal,'c','FALAISE1-A'),'geo-map','GEO-01:layerA'); emit(BF,obj(energy,'e','FALAISE1-A'),'geo-map','GEO-01:layerA'); assert.equal(A().progress,0);
 emit(BF,obj(rock,'wrongmap','FALAISE1-A'),'other-map','GEO-01:layerA'); assert.equal(A().progress,0);
 emit(BF,obj(strong,'b','FALAISE2'),'geo-map','GEO-01:layerB'); assert.equal(B().progress,1); assert.equal(A().progress,0);
 emit(BF,obj(rock,'a1','FALAISE1-A'),'geo-map','GEO-01:layerA'); emit(BF,obj(strong,'a2','FALAISE1-A'),'geo-map','GEO-01:layerA'); assert.equal(A().progress,1);
 const saved=tree.toJSON(); const restored=BF.Missions.MissionTree.fromJSON(JSON.parse(JSON.stringify(saved))); manager.trees.set('GEO-01',restored); manager.tree=restored; assert.equal(restored.find('GEO-01:layerA').progress,1); assert.equal(restored.find('GEO-01:layerB').progress,1);
 emit(BF,obj(rock,'c1','FALAISE1-B'),'geo-map','GEO-01:layerC'); assert.equal(restored.find('GEO-01:layerC').progress,1); assert.equal(manager.ensureLifecycle('GEO-01').status,'completed');
 const completedReload=BF.Missions.MissionTree.fromJSON(JSON.parse(JSON.stringify(restored.toJSON()))); assert.equal(completedReload.root.isComplete,true); assert.equal(completedReload.find('GEO-01:layerA').progress,1); assert.equal(completedReload.find('GEO-01:layerB').progress,1); assert.equal(completedReload.find('GEO-01:layerC').progress,1);
});

test('arrivée map_discovered east active GEO-01 par le lifecycle Bible normal',()=>{
 const {window}=ctx(coreFiles); const {BF,manager}=game(window); assert.equal(manager.memory.state.missionLifecycle?.['GEO-01'],undefined);
 const result=BF.bibleRuntime.consumeTriggerEvent({id:'geo-arrival',type:'exploration.map_discovered',direction:'east',mapId:'geo-map',amount:1});
 assert.equal(result.activatedMissionId,'GEO-01'); assert.equal(manager.ensureLifecycle('GEO-01').status,'active');
});

test('pré-prescription dormante: east seulement, sans préactivation; active contrôlée prioritaire',async()=>{
 const {window,load}=ctx(coreFiles); const BF=window.BlueFox3D; const facts=new Map(); const lifecycle={T07:{status:'completed'}}; const memory={state:{missionLifecycle:lifecycle},getFact:(k,d)=>facts.has(k)?facts.get(k):d,setFact:(k,v)=>facts.set(k,v),save(){}}; const engine={currentMapId:'origin',missionManager:{memory},callbacks:{onStatus(){}},clearPersistentNavigationIntent(){},navigationRoute:[],generateUnknownPassage:async function(direction){this.pending=JSON.parse(JSON.stringify(BF.__pendingBibleMapGeneration||null)); BF.maps={origin:{exits:{[direction]:{targetMap:'geo-map'}}},'geo-map':{}}; return true;}}; BF.mount=async()=>engine; load('engine/bible-map-prescription-v19.js'); await BF.mount({engine});
 assert.equal(lifecycle['GEO-01'],undefined); await engine.generateUnknownPassage('west'); assert.equal(engine.pending,null); assert.equal(lifecycle['GEO-01'],undefined);
 await engine.generateUnknownPassage('east'); assert.equal(engine.pending?.missionId,'GEO-01'); assert.equal(engine.pending?.requiredMicroScenes?.length,3); assert.equal(lifecycle['GEO-01'],undefined);
 lifecycle.T07={status:'active'}; BF.BibleCatalog.find(x=>x.id==='T07').mapGeneration; await engine.generateUnknownPassage('east'); assert.equal(engine.pending?.missionId,'T07');
});

test('placement physique: 3 grosses falaises sur 6 plateaux sans fallback ni chevauchement',()=>{
 const warnings=[];
 const baseConsole={...console,warn:(...args)=>warnings.push(args)};
 const listeners=new Map();
 class CustomEvent { constructor(type,init={}){this.type=type;this.detail=init.detail;} }
 class V3 { constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;} clone(){return new V3(this.x,this.y,this.z);} }
 class Group {
  constructor(){this.name='';this.children=[];this.userData={};this.position={x:0,y:0,z:0,set:(x,y,z)=>{this.position.x=x;this.position.y=y;this.position.z=z;}};this.rotation={y:0};}
  add(o){this.children.push(o);o.parent=this;}
  getObjectByProperty(key,value){return this.children.find(c=>c?.[key]===value)||null;}
  updateWorldMatrix(){}
  localToWorld(v){let x=v.x,y=v.y,z=v.z,n=this; while(n){x+=n.position?.x||0;y+=n.position?.y||0;z+=n.position?.z||0;n=n.parent;} return new V3(x,y,z);}
 }
 const window={CustomEvent,console:baseConsole,BlueFox3D:{},addEventListener(t,l){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(l)},removeEventListener(){},dispatchEvent(){return true}};
 const context=vm.createContext({window,console:baseConsole,CustomEvent,performance,setTimeout,clearTimeout});
 const load=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),context,{filename:f});
 const BF=window.BlueFox3D;
 const radii={'MSC-CUSTOM-FALAISE1':11.01590281928424,'MSC-CUSTOM-FALAISE2':11.01590281928424};
 BF.MicroScenes={get:id=>({id,radius:radii[id],rarity:'custom'})};
 BF.MapIntegrity={persistGeneratedDefinition(){return true}};
 BF.ObjectSpawner=class { constructor({scene}){this.scene=scene;} spawnMicroScene(){ const localRoot=new Group(); this.scene.add(localRoot); return [{root:localRoot,objectRoot:localRoot,instanceRoot:localRoot,instance:{colliders:[{offset:new V3(0,0,0),radius:11.01590281928424}]}}]; } };
 load('engine/persistent-micro-scenes-v20.js');
 const definition={id:'geo-map',entry:{x:0,z:-120},runtimeExits:{east:{x:0,z:120}},persistentMicroScenes:[]};
 ['FALAISE1-A','FALAISE2','FALAISE1-B'].forEach((instanceId,i)=>BF.PersistentMicroScenes.ensure(definition,{instanceId,missionId:'GEO-01',microSceneId:i===1?'MSC-CUSTOM-FALAISE2':'MSC-CUSTOM-FALAISE1',persistent:true,spawnOnce:true}));
 const built={group:new Group(),interactables:[],colliders:[],walkableRegions:[-100,-60,-20,20,60,100].map(cx=>({minX:cx-15,maxX:cx+15,minZ:-15,maxZ:15}))};
 const count=BF.PersistentMicroScenes.spawnForBuiltMap({Group},built,definition);
 assert.equal(count,3);
 const roots=built.group.userData.microScenes.map(x=>x.instanceRoot);
 assert.equal(new Set(roots.map(r=>r.userData.persistentMicroSceneId)).size,3);
 const pts=roots.map(r=>({x:r.position.x,z:r.position.z}));
 for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++)assert.ok(Math.hypot(pts[i].x-pts[j].x,pts[i].z-pts[j].z)>=22.03180563856848,`falaises ${i}/${j} se chevauchent`);
 assert.equal(warnings.some(args=>String(args[0]||'').includes('Placement de secours')),false);
 assert.equal(warnings.some(args=>String(args[0]||'').includes('Aucun emplacement sûr')),false);
 const childCount=built.group.children.length; const indexCount=built.group.userData.microScenes.length; const recordCount=definition.persistentMicroScenes.length;
 assert.equal(BF.PersistentMicroScenes.spawnForBuiltMap({Group},built,definition),3); assert.equal(built.group.children.length,childCount); assert.equal(built.group.userData.microScenes.length,indexCount); assert.equal(definition.persistentMicroScenes.length,recordCount);
});
