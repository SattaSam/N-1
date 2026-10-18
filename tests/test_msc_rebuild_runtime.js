const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const script=fs.readFileSync(path.join(__dirname,'../engine/persistent-micro-scenes-v20.js'),'utf8');
class Group { constructor(){this.userData={};this.children=[];this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};this.rotation={y:0};} add(obj){this.children.push(obj);} }
class Vector3 {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z} clone(){return new Vector3(this.x,this.y,this.z)}}
const THREE={Group,Vector3};
const key='m:world:MSC-A';
let saved={instanceId:key,mapId:'m',microSceneId:'MSC-A',anchor:{x:17,y:0,z:29},rotation:.6,resolvedAt:123,persistent:true,spawnOnce:true};
let memorySaves=0; const memory={state:{siteProgression:{[key]:structuredClone(saved)}},save(){memorySaves++}};
class Spawner{constructor(){} spawnMicroScene(){return []}};
Spawner.microSceneFootprint=()=>({colliders:[]});Spawner.microScenePlacementCandidates=()=>[];
let builds=0; const BF={currentEngine:{missionManager:{memory}},MapIntegrity:{persistGeneratedDefinition(){return true}},MicroScenes:{get:x=>x==='MSC-A'?{radius:3}:null},ObjectSpawner:Spawner,buildMap(){builds++;return {group:new Group(),colliders:[],interactables:[],walkableRegions:[]}}};
const ctx={window:{BlueFox3D:BF},console,Date,Math,JSON,Set};vm.runInNewContext(script,ctx);
function rebuild(definition){const built=BF.buildMap(THREE,definition);assert.equal(built.group.userData.microScenes.length,1);const root=built.group.userData.microScenes[0].instanceRoot;return {x:root.position.x,z:root.position.z,y:root.position.y,rotation:root.rotation.y,instanceId:root.userData.persistentMicroSceneId};}
let d={id:'m',persistentMicroScenes:[]};const first=rebuild(d);assert.deepEqual(first,{x:17,z:29,y:0,rotation:.6,instanceId:key});
// Simulate a subsequent reload with a stale definition but the same saved progression.
d={id:'m',persistentMicroScenes:[{...saved,anchor:null,resolvedAt:0,rotation:0}]};const second=rebuild(d);assert.deepEqual(second,first);
// Another mission reasserting the same scene must not move its persisted root.
BF.PersistentMicroScenes.ensure(d,{instanceId:key,microSceneId:'MSC-A',anchor:{x:90,y:0,z:90},rotation:1.2});const third=rebuild(d);assert.deepEqual(third,first);
assert.equal(builds,3);assert(memorySaves>=3);console.log('PASS MSC 3D stub construction/reload/mission reassertion: identical root transforms and identity');
