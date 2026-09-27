const fs=require('fs'), vm=require('vm'), assert=require('assert'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
let now=100, raf=null, events=[];
class V3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
  clone(){return new V3(this.x,this.y,this.z)}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
  setScalar(v){this.x=this.y=this.z=v;return this}
}
class Euler extends V3{}
const player={position:new V3(8,0,0)};
const BF={
  ObjectLibrary:{create(){},registerCreateHook(){}},
  PassiveObjectRuntime:{setEnabled(){}},
  ObjectEvents:{types:{NPC_REACTION:'NPC_REACTION',NPC_CONTACTED:'NPC_CONTACTED'},emit(type,source,detail){events.push({type,source,detail});return true}},
  currentEngine:{
    currentMapId:'test-map',
    character:{root:player},
    missionManager:{catalogController:{getRelation(){return {rank:'neutral'}}}}
  }
};
const ctx={
  window:null,BlueFox3D:BF,performance:{now:()=>now*1000},Date,Math,Set,WeakMap,Object,Array,Number,String,Boolean,
  console:{info(){},warn(){},error(){}},
  requestAnimationFrame(fn){raf=fn;return 1},
  setTimeout(){return 1},clearTimeout(){},
  dispatchEvent(){},CustomEvent:function(){}
};ctx.window=ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine','npc-runtime.js'),'utf8'),ctx,{filename:'npc-runtime.js'});

function root(type='npc_translucent'){
  return {
    userData:{libraryType:type,npcVisualScale:type==='npc_rocky'?.47:.35,npcGroundOffset:0},
    position:new V3(0,0,0),rotation:new Euler(),scale:new V3(1,1,1),
    children:[],parent:{type:'Scene'},visible:true,
    traverse(fn){},dispatchEvent(){}
  };
}
function register(type='npc_translucent'){
  const r=root(type);
  assert.equal(BF.NpcRuntime.register(r,type),true);
  return r;
}
function step(t,x){
  now=t; player.position.x=x;
  assert(raf,'runtime frame expected');
  const cb=raf; cb();
}
function resetHarness(){
  events=[];
  player.position.set(8,0,0);
}

{
  resetHarness();
  const r=register();
  step(100.1,8);
  step(100.6,5.5);
  step(101.1,3.2);
  const state=BF.NpcRuntime.getState(r);
  assert.equal(state.state,'flee','rapid closure must trigger flee');
  assert.equal(state.moving,true,'automatic flee must use the existing motion path');
  const flee=events.find(e=>e.type==='NPC_REACTION'&&e.detail.reaction==='flee');
  assert(flee,'canonical NPC_REACTION flee must be emitted');
  assert.equal(flee.detail.cause,'relational-approach');
  assert(flee.detail.tags.includes('intrusive_approach'));
  assert(flee.detail.closureSpeed>1.05);
}

{
  resetHarness();
  const r=register();
  step(110.1,7);
  for(let t=110.35;t<=113.6;t+=.25) step(t,6);
  const cautious=events.find(e=>e.source===r&&e.detail.reaction==='cautious_approach');
  assert(cautious,'stable respectful distance must emit cautious_approach');
  assert(cautious.detail.tags.includes('no_flee'));
  step(114.6,5.3);
  step(115.6,4.6);
  step(116.6,3.9);
  step(117.6,3.2);
  step(118.6,2.5);
  assert.notEqual(BF.NpcRuntime.getState(r).state,'flee','qualified cautious approach must tolerate slow closing');
}

{
  resetHarness();
  const r=register();
  BF.NpcRuntime.reactToApproach(r,{behaviors:['curiosity'],autoRelease:false,cause:'contact-initiative'});
  assert.equal(BF.NpcRuntime.getState(r).controlled,true);
  step(130.1,8);
  step(130.6,5.5);
  step(131.1,3.2);
  assert.equal(BF.NpcRuntime.getState(r).state,'flee','mission curiosity must not mask a real rapid threat');
}

{
  resetHarness();
  const r=register();
  const hitbox={userData:{worldAnchor:r,interactionProfile:{action:'contact'}}};
  BF.currentEngine.pendingInteraction=hitbox;
  BF.currentEngine.interactionStartedAt=1234;
  step(140.1,8);
  step(140.6,5.5);
  step(141.1,1.8);
  assert.equal(BF.NpcRuntime.getState(r).state,'dialogue','active contact must stay interaction-controlled');
  assert.equal(events.some(e=>e.source===r&&e.detail.reaction==='flee'),false,'active contact must not emit flee');
  BF.currentEngine.pendingInteraction=null;
  BF.currentEngine.interactionStartedAt=0;
}

console.log('PASS npc-r45-relational-approach-runtime');
