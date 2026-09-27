const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

class V3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  clone(){return new V3(this.x,this.y,this.z)} copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this} setY(y){this.y=y;return this}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this} addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)} lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}
  normalize(){const l=Math.hypot(this.x,this.y,this.z)||1;this.x/=l;this.y/=l;this.z/=l;return this}
  lerpVectors(a,b,t){this.x=a.x+(b.x-a.x)*t;this.y=a.y+(b.y-a.y)*t;this.z=a.z+(b.z-a.z)*t;return this}
  applyAxisAngle(){return this} cross(){return this}
}
function root(type,x,z,scene){return {position:new V3(x,0,z),rotation:new V3(),scale:new V3(1,1,1),children:[],parent:null,visible:true,
  userData:{libraryType:type,microSceneId:scene,instanceId:`${type}-${x}-${z}`,bibleMissionId: scene==='MSC-FAUNA-TOOL-USE-001'?'FAU-10':null,persistentMicroSceneId:scene},
  traverse(fn){fn(this)},rotateOnWorldAxis(){}};}
function runtime({tool=false}={}){
  let now=1000,raf=null; const hooks=[],events=[]; const sceneParent={};
  const player={position:new V3(8,0,0)};
  const life=tool?{'FAU-10':{status:'active'}}:{};
  const BF={ObjectLibrary:{create(){},exists(){return false},registerCreateHook(fn){hooks.push(fn)}},PassiveObjectRuntime:{setEnabled(){}},
    ObjectEvents:{types:{PHENOMENON_OBSERVED:'PHENOMENON_OBSERVED'},emit(type,source,detail){events.push({type,source,detail});return {type,detail};}},
    currentEngine:{currentMapId:'map-a',character:{root:player,speed:0},THREE:{Vector3:V3},missionManager:{memory:{state:{missionLifecycle:life}}}}};
  const context={window:null,BlueFox3D:BF,performance:{now:()=>now},Date,Math,Set,WeakMap,Object,console:{info(){},error(){}},
    requestAnimationFrame(fn){raf=fn;return 1},document:{querySelector(){return {classList:{contains(){return false}}}}}};context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','engine','fauna-runtime.js'),'utf8'),context);
  const step=(sec)=>{now=1000+sec*1000;const cb=raf;cb();};
  return {BF,hooks,events,player,sceneParent,step};
}

test('FAU-09: un protecteur se deplace et emet parental_protect dans la MSC parentale',()=>{
  const h=runtime();
  const young=root('fun_creature',0,0,'MSC-CUSTOM-FUNA-PARENTAL');
  const protector=root('sauteur',2.6,0,'MSC-CUSTOM-FUNA-PARENTAL');
  young.parent=protector.parent=h.sceneParent;
  h.BF.FaunaRuntime.register(young,'fun_creature');
  h.BF.FaunaRuntime.register(protector,'sauteur');
  h.player.position.set(3.5,0,0);
  const before=protector.position.clone();
  for(let t=.2;t<=2.0;t+=.2)h.step(t);
  const ev=h.events.find(e=>e.detail.tags?.includes('parental_protect'));
  assert.ok(ev,'aucun fait parental_protect emis');
  assert.equal(ev.detail.microSceneId,'MSC-CUSTOM-FUNA-PARENTAL');
  assert.equal(h.BF.FaunaRuntime.getState(protector).state,'protect');
  assert.ok(protector.position.distanceTo(before)>0.15,'protecteur immobile');
});

test('FAU-10: deux cycles physiques de poussee emettent deux tool_use_cycle',()=>{
  const h=runtime({tool:true});
  const grazer=root('brouteur',-1.55,0,'MSC-FAUNA-TOOL-USE-001');
  const ball=root('fauna_straw_ball',0,0,'MSC-FAUNA-TOOL-USE-001');
  grazer.parent=ball.parent=h.sceneParent;
  h.BF.FaunaRuntime.register(grazer,'brouteur');
  const hook=h.hooks[0];
  h.hooks.forEach(fn=>fn({root:ball,definition:{type:'fauna_straw_ball'}},{type:'fauna_straw_ball'}));
  for(let t=.2;t<=12;t+=.2)h.step(t);
  const cycles=h.events.filter(e=>e.detail.tags?.includes('tool_use_cycle'));
  assert.ok(cycles.length>=2,`cycles=${cycles.length}`);
  assert.equal(cycles[0].detail.microSceneId,'MSC-FAUNA-TOOL-USE-001');
  assert.ok(ball.position.distanceTo(new V3(0,0,0))>0.5,'boule jamais deplacee');
});

test('catalogue FAU-09/10 exige les comportements reels apres generation de MSC',()=>{
  const context={window:null,BlueFox3D:{}};context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','data','bible-catalog.js'),'utf8'),context);
  const byId=id=>context.BlueFox3D.BibleCatalog.find(m=>m.id===id);
  const f9=byId('FAU-09'),f10=byId('FAU-10');
  assert.ok(f9&&f10);
  assert.equal(f9.sequence[0].action,'travel');
  assert.equal(f9.mapGeneration.requiredMicroScenes[0].id,'MSC-CUSTOM-FUNA-PARENTAL');
  assert.deepEqual([...f9.sequence[1].params.tagsAll],['fauna_behavior','parental_protect']);
  assert.equal(f10.sequence[0].action,'travel');
  assert.equal(f10.mapGeneration.requiredMicroScenes[0].id,'MSC-FAUNA-TOOL-USE-001');
  assert.equal(f10.sequence[1].target,2);
  assert.deepEqual([...f10.sequence[1].params.tagsAll],['fauna_behavior','tool_use_cycle']);
});
