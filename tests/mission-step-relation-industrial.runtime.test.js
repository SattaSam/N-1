const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function fixture() {
  const root = path.join(__dirname, '..');
  const listeners = new Map();
  const storage = new Map();
  class CustomEvent { constructor(type, init={}) { this.type=type; this.detail=init.detail; } }
  const window = {
    CustomEvent, console, performance, setTimeout, clearTimeout, setInterval, clearInterval,
    BlueFox3D: {},
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type,new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    dispatchEvent(event) { for (const fn of [...(listeners.get(event.type)||[])]) fn(event); return true; }
  };
  const context = vm.createContext({window, console, CustomEvent, performance, setTimeout, clearTimeout, setInterval, clearInterval});
  const load = (file) => vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'), context, {filename:file});
  load('engine/object-library.js');
  [
    'engine/mission-types.js','engine/mission-tree.js','engine/mission-memory.js','engine/mission-planner.js',
    'engine/action-bridge.js','engine/mission-manager.js','engine/mission-empty-core.js','engine/mission-catalog.js',
    'engine/object-event-registry.js','engine/bible-contract-v0-1.js','data/bible-patterns.js','data/bible-catalog.js',
    'engine/bible-runtime-v0-1-unified.js'
  ].forEach(load);
  window.BlueFox3D.mount = async (options) => options.engine;
  load('engine/object-m0-bridge.js');
  return {window, storage};
}

function game(window) {
  const BF = window.BlueFox3D;
  const position = (x=0) => ({x,y:0,z:0,distanceTo(other){return Math.hypot(this.x-Number(other?.x||0),this.y-Number(other?.y||0),this.z-Number(other?.z||0));}});
  const rootPosition = position(0);
  const engine = {
    callbacks:{onAction(){},onStatus(){},onCollect(){},onSpeak(){}}, currentMapId:'map-a', currentZoneIndex:0,
    currentMap:{interactables:[],zoneRegions:[],gates:[]},
    character:{root:{position:rootPosition},target:rootPosition,stop(){},setTarget(){return true;},facePoint(){},cancelInteraction(){},findAvailableClip(){return '';},actions:new Map(),play(){},playInteraction(){return 0;},currentAnimation:''},
    discoveredZones:new Set(),pendingInteraction:null,currentRoutine:null,pendingGate:null,pendingZoneExploration:null,transitioning:false,resourceCooldowns:new WeakMap(),disposed:false,
    interactionWorldPosition(o){return o.position;}, targetInteraction(o){this.lastMissionTarget=o;this.pendingInteraction=o;return true;}
  };
  const manager = BF.Missions.MissionManager.create({engine});
  engine.missionManager=manager; BF.currentEngine=engine; BF.getMissionState=()=>manager.getState();
  return {BF,engine,manager,position};
}

function obj(definition, instanceId, position) {
  const value={position,userData:{active:true,functional:definition,instanceId}}; value.userData.worldAnchor=value; return value;
}

function synthMission(id, relation, sourceParams={subject:'flora'}, targetParams={subject:'flora'}) {
  return {
    id,title:id,pattern:'SEQUENCE_ACTIONS',trigger:{type:'manual'},slots:{},priority:200,passivePriorityAxis:'research',
    sequence:[
      {slot:'source',title:'source',action:'analyze',target:1,requires:[],params:sourceParams},
      {slot:'target',title:'target',action:'analyze',target:1,requires:['source'],params:{...targetParams,relation}}
    ]
  };
}

function install(BF, manager, mission) {
  const validation=BF.BibleContractV01.validateMission(mission,BF.BiblePatterns);
  assert.equal(validation.ok,true,validation.errors?.join('\n'));
  const compiled=BF.bibleRuntime.compileMission(mission);
  assert.ok(compiled);
  BF.registerMissionDefinitions([compiled]);
  assert.equal(manager.startMission(mission.id,{primary:true}),true);
  return manager.trees.get(mission.id);
}

function study(BF, missionId, nodeId, value, mapId, detail={}) {
  return BF.ObjectEvents.emit(BF.ObjectEvents.types.PHENOMENON_OBSERVED,value,{mapId,missionId,missionNodeId:nodeId,subject:'flora',cuoType:value.userData.functional.type,interactionSource:'mission',...detail});
}

const validFields=['objectId','cuoType','family','subject','category','mapId','instanceId'];

test('IMI relation contract: every supported evidence field is accepted and unknown fields are rejected',()=>{
  const {window}=fixture(); const BF=window.BlueFox3D;
  for (const field of validFields) {
    const result=BF.BibleContractV01.validateMission(synthMission(`REL-${field}`,{fromSlot:'source',sameBy:[field]}),BF.BiblePatterns);
    assert.equal(result.ok,true,`${field}: ${result.errors}`);
  }
  const invalid=BF.BibleContractV01.validateMission(synthMission('REL-BAD',{fromSlot:'source',sameBy:['not-a-field']}),BF.BiblePatterns);
  assert.equal(invalid.ok,false);
});

test('IMI compiler preserves relation declaratively without creating a runtime owner',()=>{
  const {window}=fixture(); const BF=window.BlueFox3D;
  const mission=synthMission('REL-COMPILE',{fromSlot:'source',sameBy:['objectId'],differentBy:['mapId']});
  const compiled=BF.bibleRuntime.compileMission(mission);
  const target=compiled.root.children.find(x=>x.id==='REL-COMPILE:target');
  assert.deepEqual(JSON.parse(JSON.stringify(target.params.relation)),{fromSlot:'source',sameBy:['objectId'],differentBy:['mapId']});
});

test('runtime generic sameBy/differentBy rejects false positives and accepts the unique valid candidate',async()=>{
  const {window}=fixture(); const {BF,engine,manager,position}=game(window); await BF.mount({engine});
  const tree=install(BF,manager,synthMission('REL-RUNTIME',{fromSlot:'source',sameBy:['objectId','family'],differentBy:['mapId','instanceId']}));
  const fern=BF.ObjectLibrary.get('fern'); const treeDef=BF.ObjectLibrary.get('luminescent_tree');
  const source=obj(fern,'src',position(1)); study(BF,'REL-RUNTIME','REL-RUNTIME:source',source,'map-a');
  const target=tree.find('REL-RUNTIME:target'); assert.equal(target.progress,0);
  study(BF,'REL-RUNTIME','REL-RUNTIME:target',obj(fern,'other-instance',position(1)),'map-a'); assert.equal(target.progress,0,'same map must fail');
  study(BF,'REL-RUNTIME','REL-RUNTIME:target',obj(treeDef,'other-type',position(1)),'map-b'); assert.equal(target.progress,0,'other definition must fail');
  study(BF,'REL-RUNTIME','REL-RUNTIME:target',obj(fern,'src',position(1)),'map-b'); assert.equal(target.progress,0,'same instance must fail');
  study(BF,'REL-RUNTIME','REL-RUNTIME:target',obj(fern,'dst',position(1)),'map-b'); assert.equal(target.progress,1,'same definition/family, other map/instance must pass');
});

test('runtime source evidence is isolated per mission and does not cross-credit concurrent missions',async()=>{
  const {window}=fixture(); const {BF,engine,manager,position}=game(window); await BF.mount({engine});
  const fernDef=BF.ObjectLibrary.get('fern'); const luminousDef=BF.ObjectLibrary.get('luminescent_tree');
  const m1=synthMission('REL-ISO-A',{fromSlot:'source',sameBy:['objectId'],differentBy:['mapId']},{subject:'flora',objectId:fernDef.id},{subject:'flora'});
  const m2=synthMission('REL-ISO-B',{fromSlot:'source',sameBy:['objectId'],differentBy:['mapId']},{subject:'flora',objectId:luminousDef.id},{subject:'flora'});
  const t1=install(BF,manager,m1); manager.setPrimaryMission('REL-ISO-A',false);
  const t2=install(BF,manager,m2); manager.setPrimaryMission('REL-ISO-A',false);
  const fern=fernDef; const treeDef=luminousDef;
  study(BF,'REL-ISO-A','REL-ISO-A:source',obj(fern,'a-src',position(1)),'map-a');
  study(BF,'REL-ISO-B','REL-ISO-B:source',obj(treeDef,'b-src',position(1)),'map-a');
  study(BF,'REL-ISO-A','REL-ISO-A:target',obj(fern,'a-dst',position(1)),'map-b');
  assert.equal(t1.find('REL-ISO-A:target').progress,1);
  assert.equal(t2.find('REL-ISO-B:target').progress,0);
});


test('runtime evidence extraction covers every declared relation field',async()=>{
  const {window}=fixture(); const {BF,engine,manager,position}=game(window); await BF.mount({engine});
  const sourceDef={
    id:'REL-OBJ-A',type:'rel_type',category:'rel_category',actions:['observe','analyze'],defaultAction:'observe',
    semantic:{subject:'rel_subject'},knowledge:{family:'rel_family'},spawn:{tags:['plant']}
  };
  const sameDef={...sourceDef};
  const changed={
    objectId:{...sourceDef,id:'REL-OBJ-B'},
    cuoType:{...sourceDef,type:'rel_type_b'},
    family:{...sourceDef,knowledge:{family:'rel_family_b'}},
    subject:{...sourceDef,semantic:{subject:'rel_subject_b'}},
    category:{...sourceDef,category:'rel_category_b'}
  };
  for (const field of ['objectId','cuoType','family','subject','category']) {
    const id=`REL-FIELD-${field}`;
    const tree=install(BF,manager,synthMission(id,{fromSlot:'source',sameBy:[field]}, {}, {}));
    const sourceDetail=field==='subject'?{subject:'rel_subject'}:{};
    const badDetail=field==='subject'?{subject:'rel_subject_b'}:{};
    const goodDetail=field==='subject'?{subject:'rel_subject'}:{};
    study(BF,id,`${id}:source`,obj(sourceDef,`${id}-src`,position(1)),'map-a',sourceDetail);
    study(BF,id,`${id}:target`,obj(changed[field],`${id}-bad`,position(1)),'map-b',badDetail);
    assert.equal(tree.find(`${id}:target`).progress,0,`${field}: changed evidence must fail sameBy`);
    study(BF,id,`${id}:target`,obj(sameDef,`${id}-good`,position(1)),'map-b',goodDetail);
    assert.equal(tree.find(`${id}:target`).progress,1,`${field}: identical evidence must pass sameBy`);
  }

  const mapTree=install(BF,manager,synthMission('REL-FIELD-mapId',{fromSlot:'source',differentBy:['mapId']},{},{}));
  study(BF,'REL-FIELD-mapId','REL-FIELD-mapId:source',obj(sourceDef,'map-src',position(1)),'map-a');
  study(BF,'REL-FIELD-mapId','REL-FIELD-mapId:target',obj(sourceDef,'map-same',position(1)),'map-a');
  assert.equal(mapTree.find('REL-FIELD-mapId:target').progress,0);
  study(BF,'REL-FIELD-mapId','REL-FIELD-mapId:target',obj(sourceDef,'map-other',position(1)),'map-b');
  assert.equal(mapTree.find('REL-FIELD-mapId:target').progress,1);

  const instanceTree=install(BF,manager,synthMission('REL-FIELD-instanceId',{fromSlot:'source',differentBy:['instanceId']},{},{}));
  study(BF,'REL-FIELD-instanceId','REL-FIELD-instanceId:source',obj(sourceDef,'instance-src',position(1)),'map-a');
  study(BF,'REL-FIELD-instanceId','REL-FIELD-instanceId:target',obj(sourceDef,'instance-src',position(1)),'map-b');
  assert.equal(instanceTree.find('REL-FIELD-instanceId:target').progress,0);
  study(BF,'REL-FIELD-instanceId','REL-FIELD-instanceId:target',obj(sourceDef,'instance-other',position(1)),'map-b');
  assert.equal(instanceTree.find('REL-FIELD-instanceId:target').progress,1);
});

test('runtime source with multiple accepted observations creates an any-reference relation, not a last-write relation',async()=>{
  const {window}=fixture(); const {BF,engine,manager,position}=game(window); await BF.mount({engine});
  const mission={
    id:'REL-MULTI',title:'multi',pattern:'SEQUENCE_ACTIONS',trigger:{type:'manual'},slots:{},
    sequence:[
      {slot:'source',title:'source',action:'analyze',target:2,requires:[],params:{subject:'flora',distinctBy:'objectId'}},
      {slot:'target',title:'target',action:'analyze',target:1,requires:['source'],params:{subject:'flora',relation:{fromSlot:'source',sameBy:['objectId'],differentBy:['mapId']}}}
    ]
  };
  const tree=install(BF,manager,mission); const fern=BF.ObjectLibrary.get('fern'); const treeDef=BF.ObjectLibrary.get('luminescent_tree');
  study(BF,'REL-MULTI','REL-MULTI:source',obj(fern,'src-a',position(1)),'map-a');
  study(BF,'REL-MULTI','REL-MULTI:source',obj(treeDef,'src-b',position(1)),'map-a');
  const source=tree.find('REL-MULTI:source'); assert.equal(source.historyValues.length,2);
  study(BF,'REL-MULTI','REL-MULTI:target',obj(fern,'dst',position(1)),'map-b');
  assert.equal(tree.find('REL-MULTI:target').progress,1,'either valid source evidence should match');
});


function acquire(BF, eventType, missionId, nodeId, value, mapId, detail={}) {
  return BF.ObjectEvents.emit(eventType,value,{mapId,missionId,missionNodeId:nodeId,cuoType:value.userData.functional.type,interactionSource:'mission',quantity:1,...detail});
}

test('runtime relation works when acquisition is the source and study is the target',async()=>{
  const {window}=fixture(); const {BF,engine,manager,position}=game(window); await BF.mount({engine});
  const mission={id:'REL-COLLECT-SOURCE',title:'collect source',pattern:'SEQUENCE_ACTIONS',trigger:{type:'manual'},slots:{},sequence:[
    {slot:'source',title:'source',action:'collect',target:1,requires:[],params:{kind:'fiber'}},
    {slot:'target',title:'target',action:'analyze',target:1,requires:['source'],params:{subject:'flora',relation:{fromSlot:'source',sameBy:['objectId'],differentBy:['mapId']}}}
  ]};
  const tree=install(BF,manager,mission); const fiber=BF.ObjectLibrary.get('fiber');
  acquire(BF,BF.ObjectEvents.types.RESOURCE_COLLECTED,'REL-COLLECT-SOURCE','REL-COLLECT-SOURCE:source',obj(fiber,'fiber-src',position(1)),'map-a',{inventoryKey:'fiber'});
  assert.equal(tree.find('REL-COLLECT-SOURCE:source').progress,1);
  assert.equal(tree.find('REL-COLLECT-SOURCE:source').historyValues.length,1);
  study(BF,'REL-COLLECT-SOURCE','REL-COLLECT-SOURCE:target',obj(fiber,'fiber-dst',position(1)),'map-b');
  assert.equal(tree.find('REL-COLLECT-SOURCE:target').progress,1);
});

test('runtime relation filters autonomous collection targets before distance ranking',async()=>{
  const {window}=fixture(); const {BF,engine,manager,position}=game(window); await BF.mount({engine});
  const mission={id:'REL-COLLECT-TARGET',title:'collect target',pattern:'SEQUENCE_ACTIONS',trigger:{type:'manual'},slots:{},sequence:[
    {slot:'source',title:'source',action:'analyze',target:1,requires:[],params:{subject:'flora'}},
    {slot:'target',title:'target',action:'collect',target:1,requires:['source'],params:{relation:{fromSlot:'source',sameBy:['objectId'],differentBy:['mapId']}}}
  ]};
  const tree=install(BF,manager,mission); const fiber=BF.ObjectLibrary.get('fiber'); const ore=BF.ObjectLibrary.get('magnetic_ore');
  study(BF,'REL-COLLECT-TARGET','REL-COLLECT-TARGET:source',obj(fiber,'src',position(1)),'map-a');
  engine.currentMapId='map-b'; const wrong=obj(ore,'wrong-near',position(1)); const right=obj(fiber,'right-far',position(5)); engine.currentMap.interactables=[wrong,right];
  manager.retryAfter=0; manager.lastPlanAt=0; assert.equal(manager.update(10000),true); assert.equal(engine.lastMissionTarget,right);
  acquire(BF,BF.ObjectEvents.types.RESOURCE_COLLECTED,'REL-COLLECT-TARGET','REL-COLLECT-TARGET:target',right,'map-b',{inventoryKey:'fiber'});
  assert.equal(tree.find('REL-COLLECT-TARGET:target').progress,1);
});

test('runtime relation filters extract targets as well as collect targets',async()=>{
  const {window}=fixture(); const {BF,engine,manager,position}=game(window); await BF.mount({engine});
  const mission={id:'REL-EXTRACT',title:'extract target',pattern:'SEQUENCE_ACTIONS',trigger:{type:'manual'},slots:{},sequence:[
    {slot:'source',title:'source',action:'analyze',target:1,requires:[],params:{}},
    {slot:'target',title:'target',action:'extract',target:1,requires:['source'],params:{relation:{fromSlot:'source',sameBy:['objectId'],differentBy:['mapId']}}}
  ]};
  const tree=install(BF,manager,mission); const ore=BF.ObjectLibrary.get('magnetic_ore'); const crystal=BF.ObjectLibrary.get('crystal');
  study(BF,'REL-EXTRACT','REL-EXTRACT:source',obj(ore,'ore-src',position(1)),'map-a');
  engine.currentMapId='map-b'; const wrong=obj(crystal,'crystal-near',position(1)); const right=obj(ore,'ore-far',position(4)); engine.currentMap.interactables=[wrong,right];
  manager.retryAfter=0; manager.lastPlanAt=0; assert.equal(manager.update(10000),true); assert.equal(engine.lastMissionTarget,right);
  acquire(BF,BF.ObjectEvents.types.RESOURCE_EXTRACTED,'REL-EXTRACT','REL-EXTRACT:target',right,'map-b',{inventoryKey:'magnetic_ore'});
  assert.equal(tree.find('REL-EXTRACT:target').progress,1);
});

test('runtime autonomous selection applies relation before distance ranking',async()=>{
  const {window}=fixture(); const {BF,engine,manager,position}=game(window); await BF.mount({engine});
  const tree=install(BF,manager,synthMission('REL-AUTO',{fromSlot:'source',sameBy:['objectId'],differentBy:['mapId']}));
  const fern=BF.ObjectLibrary.get('fern'); const treeDef=BF.ObjectLibrary.get('luminescent_tree');
  study(BF,'REL-AUTO','REL-AUTO:source',obj(fern,'src',position(1)),'map-a');
  engine.currentMapId='map-b'; const wrong=obj(treeDef,'near',position(1)); const right=obj(fern,'far',position(6)); engine.currentMap.interactables=[wrong,right];
  manager.retryAfter=0; manager.lastPlanAt=0; assert.equal(manager.update(10000),true); assert.equal(engine.lastMissionTarget,right);
  assert.equal(tree.find('REL-AUTO:target').progress,0,'selection must not pre-credit progress');
});

test('runtime relation evidence survives save/restore and resumes without re-observing source',async()=>{
  const {window}=fixture(); const {BF,engine,manager,position}=game(window); await BF.mount({engine});
  install(BF,manager,synthMission('REL-RESTORE',{fromSlot:'source',sameBy:['objectId'],differentBy:['mapId']}));
  const fern=BF.ObjectLibrary.get('fern'); study(BF,'REL-RESTORE','REL-RESTORE:source',obj(fern,'src',position(1)),'map-a');
  const saved=manager.trees.get('REL-RESTORE').toJSON();
  const restored=BF.Missions.MissionTree.fromJSON(JSON.parse(JSON.stringify(saved))); manager.trees.set('REL-RESTORE',restored); manager.tree=restored;
  study(BF,'REL-RESTORE','REL-RESTORE:target',obj(fern,'dst',position(1)),'map-b');
  assert.equal(restored.find('REL-RESTORE:target').progress,1);
});

test('legacy mission without relation never gets hidden relation history pollution',async()=>{
  const {window}=fixture(); const {BF,engine,manager,position}=game(window); await BF.mount({engine});
  const sur=BF.BibleCatalog.find(x=>x.id==='SUR-03'); manager.memory.setFact('worldContext:bosquet-bio',true); assert.ok(sur);
  assert.equal(manager.startMission('SUR-03',{primary:true}),true);
  const fern=BF.ObjectLibrary.get('fern');
  BF.ObjectEvents.emit(BF.ObjectEvents.types.PHENOMENON_OBSERVED,obj(fern,'sur',position(1)),{mapId:'map-a',missionId:'SUR-03',missionNodeId:'SUR-03:studyPlants',subject:'flora',cuoType:fern.type,interactionSource:'mission'});
  const node=manager.trees.get('SUR-03').find('SUR-03:studyPlants');
  assert.equal(node.historyValues.length,0);
});
