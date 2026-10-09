const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');process.env.BLUEFOX_ROOT=ROOT;
const source=fs.readFileSync(path.join(ROOT,'tests/mission-physical-contracts.runtime.test.js'),'utf8');
const {fixture,physicalObject,physical}=new Function('require','__dirname',source.slice(0,source.indexOf('\nfor (const [slot'))+'\nreturn {fixture,physicalObject,physical};')(require,path.join(ROOT,'tests'));
async function live(){const f=await fixture();f.runtime.connect();return f;}
function arrive(f,to,options={}){const from=f.engine.currentMapId;f.engine.currentMapId=to;f.engine.discoveredMaps.add(to);f.BF.maps[to]||={id:to,exits:{}};f.window.dispatchEvent(new f.window.CustomEvent('bluefox:map-transition-completed',{detail:{fromMapId:from,toMapId:to,mapId:to,source:'manual',mode:'gate',direction:'north',isNew:false,...options}}));}
function start(f,id){const m=f.BF.BibleCatalog.find(x=>x.id===id);for(const p of m.prerequisites||[])f.memory.state.missionLifecycle[p]={status:'completed'};return f.manager.startMission(id,{primary:true}),f.manager.trees.get(id)||f.activate(id);}
function stage(f,m,t,slot){for(const s of m.sequence){if(s.slot===slot)break;f.completeNode(t.find(m.id+':'+s.slot));}t.refresh();}
// Each late-stage fixture has satisfied predecessors; the tested leaf is never incremented manually.
const catalogue=(()=>{const code=fs.readFileSync(path.join(ROOT,'data/bible-catalog.js'),'utf8');const vm=require('node:vm'),window={};vm.runInNewContext(code,{window});return window.BlueFox3D.BibleCatalog;})();
for(const m of catalogue)for(const step of m.sequence||[])if(step.action==='travel'&&step.params?.targetMapFact){test(`${m.id}:${step.slot} rejects missing/foreign destination and credits correct arrival after reload`,async()=>{const f=await live();const t=start(f,m.id);stage(f,m,t,step.slot);const n=t.find(m.id+':'+step.slot),key=step.params.targetMapFact,field=step.params.targetMapField||'mapId';f.memory.setFact(key,null);const mode={direction:step.params.direction||'north',source:step.params.transitionSource||'manual',mode:step.params.transitionMode||'gate'};arrive(f,'foreign',mode);assert.equal(n.progress,0);const fact={mapId:'expected',[field]:'expected',siteId:'original-site',sourceMissionId:'original-owner'};f.memory.setFact(key,fact);arrive(f,'another-foreign',mode);assert.equal(n.progress,0);assert.deepEqual(JSON.parse(JSON.stringify(f.memory.getFact(key))),fact);f.memory.saveTree(t);f.memory.save();const restored=f.planner.restoreOrCreate(m.id);f.manager.trees.set(m.id,restored);arrive(f,'expected',mode);assert.equal(restored.find(m.id+':'+step.slot).progress,1);assert.deepEqual(JSON.parse(JSON.stringify(f.memory.getFact(key))),fact);});}
for(const id of ['EXP-LONG-02','EXP-LONG-04'])test(`${id} preserves first real remarkable; Scout cannot study; physical interaction and beacon complete it`,async()=>{const f=await live();const t=start(f,id),m=f.BF.BibleCatalog.find(x=>x.id===id),key=m.runtimeValidation.remarkableFact;
for(let i=1;i<=12;i++)arrive(f,'plain-'+i,{isNew:true});assert.equal(f.memory.getFact(key,null),null);assert.equal(t.find(id+':remarkable').progress,0);
f.BF.maps.rare={id:'rare',exits:{},generator:{cadence:{rareBiomeForced:true}}};arrive(f,'rare',{isNew:true});assert.equal(f.memory.getFact(key).mapId,'rare');assert.equal(t.find(id+':remarkable').progress,1);
f.BF.maps['other-rare']={id:'other-rare',exits:{},generator:{cadence:{rareBiomeForced:true}}};arrive(f,'other-rare',{isNew:true});assert.equal(f.memory.getFact(key).mapId,'rare');arrive(f,'rare');const object=physicalObject(f,'tech_relic','physical-relic');f.engine.currentMap.interactables=[object];const n=t.find(id+':study');f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.OBJECT_SEEN,object,{mapId:'rare',interactionSource:'drone',tags:['drone-scouted']});assert.equal(n.progress,0);f.engine.targetInteraction(object);f.engine.updateInteraction(10000);f.engine.updateInteraction(35000);assert.equal(n.progress,1);
f.window.dispatchEvent(new f.window.CustomEvent('bluefox:site-established',{detail:{mapId:'other-rare',kind:'deployed_beacon'}}));assert.equal(t.find(id+':deployBeacon').progress,0);f.window.dispatchEvent(new f.window.CustomEvent('bluefox:site-established',{detail:{mapId:'rare',kind:'deployed_beacon'}}));assert.equal(t.root.isComplete,true);});
for(const id of ['EXP-LONG-02','EXP-LONG-04'])test(`${id} early remarkable remains bound after twelve ordinary arrivals`,async()=>{const f=await live(),t=start(f,id),m=f.BF.BibleCatalog.find(x=>x.id===id);for(let i=1;i<=12;i++){const to='map-'+i;f.BF.maps[to]={id:to,exits:{},generator:{cadence:{rareBiomeForced:i===3}}};arrive(f,to,{isNew:true});}assert.equal(f.memory.getFact(m.runtimeValidation.remarkableFact).mapId,'map-3');assert.equal(t.find(id+':remarkable').progress,1);});
test('explicit cartographer producers persist each destination; unrelated arrivals cannot overwrite them',async()=>{const f=await live(),id='GAME-exploration_cartographer',m=f.BF.BibleCatalog.find(x=>x.id===id),t=start(f,id);for(let i=1;i<=3;i++){stage(f,m,t,'south'+i);arrive(f,'south-map-'+i,{isNew:true,direction:'south'});assert.equal(f.memory.getFact('gameCartographer:map'+i)?.mapId,'south-map-'+i);}arrive(f,'unrelated',{isNew:true,direction:'east'});for(let i=1;i<=3;i++)assert.equal(f.memory.getFact('gameCartographer:map'+i).mapId,'south-map-'+i);});
test('DIP-03 explicit arrival still produces the Temple reference; invalid arrival does not',async()=>{const f=await live(),t=start(f,'DIP-03'),m=f.BF.BibleCatalog.find(x=>x.id==='DIP-03');stage(f,m,t,'templeTravel');arrive(f,'foreign');assert.equal(f.memory.getFact('dip03:temple-map',null),null);arrive(f,'custom-map-33-temple-magnet');assert.equal(t.find('DIP-03:templeTravel').progress,1);assert.equal(f.memory.getFact('dip03:temple-map').mapId,'custom-map-33-temple-magnet');});

test('autonomous fauna observation neither activates LOC-12 nor consumes local novelty; explicit interaction does',async()=>{
 const f=await live();f.memory.state.missionLifecycle.T13={status:'completed'};f.memory.setFact('localExplorationUnlocked:v1',true);
 const def=f.BF.ObjectLibrary.list({status:'active'}).find(d=>d.type==='small_creature');assert(def);
 const animal=physicalObject(f,def.type,'local-fauna','MSC-FAUNA-TEST','fauna:site');animal.userData.microSceneObjectIndex=0;f.engine.currentMap.interactables=[animal];
 const autonomous=f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED,animal,{mapId:'crystal',subject:'fauna',kind:'fauna_behavior',tags:['fauna_behavior','resting']});
 assert.equal(autonomous.isLocalInteraction,false);assert.equal(autonomous.firstLocalInteraction,false);
 assert.equal(f.manager.trees.has('LOC-12@crystal'),false);
 const active=f.activate('LOC-12@crystal');f.manager.trees.set(active.id,active);f.manager.activeMissionIds.push(active.id);
 f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED,animal,{mapId:'crystal',subject:'fauna',tags:['fauna_behavior','resting']});assert.equal(active.root.isComplete,false);
 physical(f,active,10000);
 assert.equal(active.root.isComplete,true);
});
test('FLO-05 rejects an unrelated new map then completes two physical analyses at the prescribed persistent site',async()=>{
 const f=await live();let t=start(f,'FLO-05');
 arrive(f,'ordinary',{isNew:true});assert.equal(t.find('FLO-05:reachEnergyRoots').progress,0);
 f.memory.setFact('tutorialExcursion:FLO-05',{generatedTargetMapId:'fossil-map'});
 const plant=physicalObject(f,'lantern_mushrooms','fossil:plant','MSC-ECO-FOSSIL-001','fossil:site');
 const rock=physicalObject(f,'strong_rock','fossil:rock','MSC-ECO-FOSSIL-001','fossil:site');
 f.engine.currentMap.interactables=[plant,rock];
 f.BF.maps['fossil-map']={id:'fossil-map',exits:{},persistentMicroScenes:[{microSceneId:'MSC-ECO-FOSSIL-001',instanceId:'fossil:site',missionId:'FLO-05',persistent:true,anchor:{x:0,z:0}}]};
 f.engine.currentMap.group.userData.microScenes=[{id:'MSC-ECO-FOSSIL-001',instanceId:'fossil:site',instanceRoot:{position:f.engine.character.root.position,userData:{persistentMicroSceneId:'fossil:site',bibleMissionId:'FLO-05'}},records:[{root:plant},{root:rock}]}];
 arrive(f,'fossil-map',{isNew:true});assert.equal(t.find('FLO-05:reachEnergyRoots').progress,1);
 physical(f,t,10000);assert.equal(t.find('FLO-05:rootFlora').progress,1);
 const wrong=physicalObject(f,'strong_rock','other:rock','MSC-ECO-FOSSIL-001','other:site');
 f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.OBJECT_ANALYZED,wrong,{mapId:'fossil-map',interactionSource:'manual'});
 assert.equal(t.find('FLO-05:groundReference').progress,0);
 f.memory.saveTree(t);f.memory.save();t=f.planner.restoreOrCreate('FLO-05');f.manager.trees.set(t.id,t);
 physical(f,t,50000);assert.equal(t.root.isComplete,true);
});

test('local novelty ignores prior object knowledge and blocks a second interaction on the same map',async()=>{
 const f=await live(),animal=physicalObject(f,'small_creature','known-animal');
 animal.userData.interactionState={observed:true,identified:true,observationCount:1};
 f.engine.currentMap.interactables=[animal];
 const t=f.activate('LOC-12@crystal');f.manager.trees.set(t.id,t);f.manager.activeMissionIds.push(t.id);
 physical(f,t,10000);assert.equal(t.root.isComplete,true);
 assert.equal(f.BF.hasLocalObjectInteraction('crystal',{instanceId:'known-animal'}),true);
 const repeated=f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED,animal,{mapId:'crystal',interactionSource:'manual'});
 assert.equal(repeated.firstLocalInteraction,false);
 assert.equal(f.BF.hasLocalObjectInteraction('other-map',{instanceId:'known-animal'}),false);
});
