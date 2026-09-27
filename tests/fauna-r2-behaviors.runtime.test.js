
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

class V3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  clone(){return new V3(this.x,this.y,this.z)}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
  setY(y){this.y=y;return this}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
  addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}
  lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}
  normalize(){const l=Math.hypot(this.x,this.y,this.z)||1;this.x/=l;this.y/=l;this.z/=l;return this}
  lerpVectors(a,b,t){this.x=a.x+(b.x-a.x)*t;this.y=a.y+(b.y-a.y)*t;this.z=a.z+(b.z-a.z)*t;return this}
  applyAxisAngle(){return this}
  cross(){return this}
}
function makeRoot(type,x=0,z=0,scene=''){
  return {
    position:new V3(x,0,z),rotation:new V3(),scale:new V3(1,1,1),
    children:[],parent:{},visible:true,
    userData:{libraryType:type,microSceneId:scene,instanceId:`${type}-${x}-${z}-${scene}`},
    traverse(fn){fn(this)},rotateOnWorldAxis(){}
  };
}
function runtime({period='day',sharedFacts=null}={}){
  let perf=1000, epoch=1_800_000_000_000, raf=null;
  const hooks=[], events=[], facts=sharedFacts || {};
  const memory={
    getFact(k,d=null){return Object.prototype.hasOwnProperty.call(facts,k)?facts[k]:d;},
    setFact(k,v){facts[k]=JSON.parse(JSON.stringify(v));return true;},
    save(){return true;}
  };
  const player={position:new V3(8,0,0)};
  const gameMinutes=period==='night'?18*60:10*60;
  const BF={
    ObjectLibrary:{create(){},exists(){return false},registerCreateHook(fn){hooks.push(fn)}},
    PassiveObjectRuntime:{setEnabled(){}},
    ObjectEvents:{types:{PHENOMENON_OBSERVED:'PHENOMENON_OBSERVED'},
      emit(type,source,detail){const ev={type,source,detail,tags:detail.tags,instanceId:source.userData.instanceId,microSceneId:detail.microSceneId,mapId:detail.mapId,state:detail.state};events.push(ev);return ev;}},
    currentEngine:{currentMapId:'map-a',planetClock:{gameMinutes,realTime:epoch},character:{root:player,speed:0},THREE:{Vector3:V3},missionManager:{memory}}
  };
  const FakeDate={now:()=>epoch};
  const context={window:null,BlueFox3D:BF,performance:{now:()=>perf},Date:FakeDate,Math,Set,Map,WeakMap,Object,
    console:{info(){},error(){},warn(){}},requestAnimationFrame(fn){raf=fn;return 1},
    document:{querySelector(){return {classList:{contains(){return period==='night'}}}}}};
  context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','engine','fauna-runtime.js'),'utf8'),context);
  const step=(sec,pos=null,speed=0)=>{
    perf=1000+sec*1000; epoch+=100;
    if(pos!=null) player.position.x=pos;
    BF.currentEngine.character.speed=speed;
    const cb=raf;cb();
  };
  return {BF,events,facts,player,hooks,step,setPeriod(next){BF.currentEngine.planetClock.gameMinutes=(next==='night'?18:10)*60;BF.currentEngine.planetClock.realTime=epoch;}};
}

test('R2: approche prudente emet cautious_approach et calme apres 5 s',()=>{
  const h=runtime();
  const a=makeRoot('brouteur',0,0,'MSC-CUSTOM-NID-DE-FAUNE5');
  h.BF.FaunaRuntime.register(a,'brouteur');
  h.step(.2,6.5,2);h.step(.8,5.0,1.5);h.step(1.2,4.8,0);
  for(let t=1.4;t<=2.6;t+=.2)h.step(t,4.8,0);
  assert.ok(h.events.some(e=>e.detail.tags.includes('cautious_approach')));
  h.step(3.0,3.0,0);
  for(let t=3.2;t<=8.4;t+=.2)h.step(t,3.0,0);
  const calm=h.events.find(e=>e.detail.tags.includes('calm_nearby'));
  assert.ok(calm,'calm_nearby absent');
  assert.equal(calm.detail.period,'day');
});

test('R2: approche rapide emet flee une seule fois par episode',()=>{
  const h=runtime();
  const a=makeRoot('sauteur',0,0);
  h.BF.FaunaRuntime.register(a,'sauteur');
  h.step(.2,6,3);h.step(.5,4.5,3);h.step(.8,3.1,3);h.step(1.0,2.5,3);
  const flee=h.events.filter(e=>e.detail.tags.includes('flee'));
  assert.equal(flee.length,1);
  assert.ok(a.position.distanceTo(new V3(0,0,0))>1);
});

test('R2: deux calmes jour/nuit produisent temporal_contrast et la deuxieme rencontre familiar',()=>{
  const h=runtime({period:'day'});
  const a=makeRoot('brouteur',0,0);a.userData.instanceId='same-animal';
  h.BF.FaunaRuntime.register(a,'brouteur');
  // first cautious/calm
  h.step(.2,4.8,0);for(let t=.4;t<=1.6;t+=.2)h.step(t,4.8,0);
  h.step(2,3,0);for(let t=2.2;t<=7.4;t+=.2)h.step(t,3,0);
  assert.ok(h.events.some(e=>e.detail.tags.includes('calm_nearby')));
  // leave to reset
  h.step(8,6.2,0);
  h.setPeriod('night');
  h.step(8.2,4.8,0);for(let t=8.4;t<=9.6;t+=.2)h.step(t,4.8,0);
  h.step(10,3,0);for(let t=10.2;t<=15.8;t+=.2)h.step(t,3,0);
  assert.ok(h.events.some(e=>e.detail.tags.includes('temporal_contrast')),'temporal_contrast absent');
  assert.ok(h.events.some(e=>e.detail.tags.includes('familiar_encounter')),'familiar_encounter absent');
  assert.deepEqual(h.facts['fauna:periods:session:same-animal'],['day','night']);
  assert.equal(h.facts['fauna:calmEncounters:session:same-animal'],2);
});

test('R2: comportement observe a 4-6 m pendant 5 s',()=>{
  const h=runtime();
  const a=makeRoot('patte_creature',0,0);
  h.BF.FaunaRuntime.register(a,'patte_creature');
  h.step(.2,5,0);
  for(let t=.4;t<=5.8;t+=.2)h.step(t,5,0);
  const ev=h.events.find(e=>e.detail.tags.includes('behavior_observed'));
  assert.ok(ev,'behavior_observed absent');
  assert.ok(ev.detail.distance>=4 && ev.detail.distance<=6);
});

test('R2: MSC paisible emet un seul peaceful_group multi-especes sans fuite',()=>{
  const h=runtime();
  const a=makeRoot('brouteur',0,0,'MSC-PEACEFUL-FAUNA-001');a.userData.instanceId='a';
  const b=makeRoot('sauteur',2.2,1.3,'MSC-PEACEFUL-FAUNA-001');b.userData.instanceId='b';
  const c=makeRoot('small_creature',-1.8,1.1,'MSC-PEACEFUL-FAUNA-001');c.userData.instanceId='c';
  h.BF.FaunaRuntime.register(a,'brouteur');h.BF.FaunaRuntime.register(b,'sauteur');h.BF.FaunaRuntime.register(c,'small_creature');
  h.player.position.set(0,0,5);
  for(let t=.2;t<=5.8;t+=.2)h.step(t,null,0);
  const groups=h.events.filter(e=>e.detail.tags.includes('peaceful_group'));
  assert.equal(groups.length,1,`peaceful_group=${groups.length}`);
  assert.ok(groups[0].detail.speciesCount>=2);
  assert.ok(groups[0].detail.tags.includes('no_flee'));
});


test('R2: familiarite et contraste temporel survivent a un vrai respawn MSC avec instanceId different',()=>{
  const shared={};
  const persistentSceneId='map-a:FAU-03:MSC-CUSTOM-NID-DE-FAUNE5';
  const decorateStableSlot=(root,instanceId,index)=>{
    root.userData.instanceId=instanceId;
    root.userData.persistentMicroSceneId=persistentSceneId;
    root.userData.microScenePivot={userData:{microSceneObjectIndex:index}};
    root.userData.catalogId='CUO_FAUNA_GRAZER';
  };
  const stableIdentity=`persistent:${persistentSceneId}:slot:3:cuo:CUO_FAUNA_GRAZER`;

  const first=runtime({period:'day',sharedFacts:shared});
  const a=makeRoot('brouteur',0,0,'MSC-CUSTOM-NID-DE-FAUNE5');
  decorateStableSlot(a,'CUO_FAUNA_GRAZER:msc:MSC-CUSTOM-NID-DE-FAUNE5:3:AAA',3);
  first.BF.FaunaRuntime.register(a,'brouteur');
  first.step(.2,4.8,0);for(let t=.4;t<=1.6;t+=.2)first.step(t,4.8,0);
  first.step(2,3,0);for(let t=2.2;t<=7.6;t+=.2)first.step(t,3,0);
  assert.equal(shared[`fauna:calmEncounters:${stableIdentity}`],1);
  assert.deepEqual(shared[`fauna:periods:${stableIdentity}`],['day']);
  assert.equal(shared['fauna:calmEncounters:session:CUO_FAUNA_GRAZER:msc:MSC-CUSTOM-NID-DE-FAUNE5:3:AAA'],undefined);

  const second=runtime({period:'night',sharedFacts:shared});
  const b=makeRoot('brouteur',0,0,'MSC-CUSTOM-NID-DE-FAUNE5');
  decorateStableSlot(b,'CUO_FAUNA_GRAZER:msc:MSC-CUSTOM-NID-DE-FAUNE5:3:BBB',3);
  second.BF.FaunaRuntime.register(b,'brouteur');
  second.step(.2,4.8,0);for(let t=.4;t<=1.6;t+=.2)second.step(t,4.8,0);
  second.step(2,3,0);for(let t=2.2;t<=7.6;t+=.2)second.step(t,3,0);
  assert.equal(shared[`fauna:calmEncounters:${stableIdentity}`],2);
  assert.deepEqual(shared[`fauna:periods:${stableIdentity}`],['day','night']);
  assert.ok(second.events.some(e=>e.detail.tags.includes('familiar_encounter')));
  assert.ok(second.events.some(e=>e.detail.tags.includes('temporal_contrast')));
});

test('R2: deux slots persistants du meme CUO ne partagent pas leur familiarite',()=>{
  const shared={};
  const scene='map-a:FAU-11:MSC-PEACEFUL-FAUNA-001';
  const runCalm=(instanceId,index)=>{
    const h=runtime({period:'day',sharedFacts:shared});
    const a=makeRoot('brouteur',0,0,'MSC-PEACEFUL-FAUNA-001');
    a.userData.instanceId=instanceId;
    a.userData.persistentMicroSceneId=scene;
    a.userData.microScenePivot={userData:{microSceneObjectIndex:index}};
    a.userData.catalogId='CUO_FAUNA_GRAZER';
    h.BF.FaunaRuntime.register(a,'brouteur');
    h.step(.2,4.8,0);for(let t=.4;t<=1.6;t+=.2)h.step(t,4.8,0);
    h.step(2,3,0);for(let t=2.2;t<=7.6;t+=.2)h.step(t,3,0);
    return h;
  };
  runCalm('grazer:AAA',0);
  const secondSlot=runCalm('grazer:BBB',1);
  assert.equal(shared[`fauna:calmEncounters:persistent:${scene}:slot:0:cuo:CUO_FAUNA_GRAZER`],1);
  assert.equal(shared[`fauna:calmEncounters:persistent:${scene}:slot:1:cuo:CUO_FAUNA_GRAZER`],1);
  assert.equal(secondSlot.events.some(e=>e.detail.tags.includes('familiar_encounter')),false);
});
