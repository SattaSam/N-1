const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'../engine/persistent-micro-scenes-v20.js'),'utf8');
function run(definition,site){
 let saves=0;
 const memory={state:{siteProgression:site},save(){saves++}};
 const BF={currentEngine:{missionManager:{memory}},MapIntegrity:{persistGeneratedDefinition(){return true}},MicroScenes:{get(){return null}},ObjectSpawner:function(){}};
 const context={window:{BlueFox3D:BF},console,Date,JSON,Set,Math};
 vm.runInNewContext(source,context,{timeout:3000});
 BF.PersistentMicroScenes.spawnForBuiltMap({}, {group:{userData:{}},interactables:[],colliders:[]},definition);
 return {records:definition.persistentMicroScenes,saves};
}
const map='generated-test';const id=`${map}:world:MSC-A`;
const resolved={instanceId:id,microSceneId:'MSC-A',mapId:map,anchor:{x:11,y:0,z:19},rotation:0.7,resolvedAt:100};
const stale={...resolved,anchor:null,resolvedAt:0};
let d={id:map,persistentMicroScenes:[structuredClone(resolved)]};
let r=run(d,{[id]:stale}); assert.equal(r.records[0].anchor.x,11);assert.equal(r.records[0].resolvedAt,100);
d={id:map,persistentMicroScenes:[{...stale}]};r=run(d,{[id]:resolved});assert.equal(r.records[0].anchor.x,11);assert.equal(r.records[0].resolvedAt,100);
d={id:map,persistentMicroScenes:[]};r=run(d,{[id]:resolved});assert.equal(r.records.length,1);assert.equal(r.records[0].anchor.x,11);
console.log('PASS MSC: existing resolved anchor not erased; saved resolved anchor restored; persisted site hydrated');
