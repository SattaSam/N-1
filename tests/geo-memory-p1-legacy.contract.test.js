const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const ROOT=process.argv[2]?path.resolve(process.argv[2]):path.join(__dirname,'..');
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
class FakeDate extends Date{static now(){return 123456789;}}
const store=new Map(),listeners=new Map();const math=Object.create(Math);math.random=()=>0.25;
const window={console,Math:math,JSON,Set,Map,WeakMap,Date:FakeDate,CustomEvent:CE,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},addEventListener(t,f){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(f)},dispatchEvent(e){for(const f of listeners.get(e.type)||[])f(e);return true},BlueFox3D:{}};window.window=window;
const ctx=vm.createContext(window),BF=window.BlueFox3D,load=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
load('engine/object-event-registry.js');load('engine/progression-multisystem.js');
BF.currentEngine={currentMapId:'map-a',currentMap:{group:{userData:{microScenes:[]}}}};
const def={id:'fiber',resource:{inventoryKey:'fiber',family:'plant'},knowledge:{family:'flora'},research:{domains:['biology']},spawn:{tags:['resource','plant']},progression:{mapExpertise:2}};
const source={userData:{catalogId:'fiber',instanceId:'inst-1',functional:def,microSceneId:'MSC-X'}};
const event=BF.ObjectEvents.emit(BF.ObjectEvents.types.OBJECT_SEEN,source,{mapId:'map-a',zoneId:1});
assert.equal(event.objectId,'fiber');assert.equal(event.instanceId,'inst-1');assert.equal(event.microSceneId,'MSC-X');assert.equal(event.family,'plant');assert.equal(event.inventoryKey,'fiber');assert.equal(event.knowledgeFamily,'flora');assert.equal(event.mapId,'map-a');assert.equal(event.zoneId,1);assert.equal(event.quantity,1);assert.deepEqual([...event.researchDomains],['biology']);
const snapshot=BF.getMultiProgressionState();assert.equal(Object.prototype.hasOwnProperty.call(snapshot,'geographicKnowledge'),false,'legacy snapshot shape remains light');
assert.equal(BF.getKnownSites({microSceneId:'MSC-X'}).length,0,'no site fabricated without occurrence identity');
console.log('PASS GEO-MEM-P1 legacy contract preserved');
