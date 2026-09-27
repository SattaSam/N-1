const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

class V3 {
  constructor(x=0,y=0,z=0){ this.x=x; this.y=y; this.z=z; }
  clone(){ return new V3(this.x,this.y,this.z); }
  copy(v){ this.x=v.x; this.y=v.y; this.z=v.z; return this; }
  set(x,y,z){ this.x=x; this.y=y; this.z=z; return this; }
  setY(y){ this.y=y; return this; }
  sub(v){ this.x-=v.x; this.y-=v.y; this.z-=v.z; return this; }
  addScaledVector(v,s){ this.x+=v.x*s; this.y+=v.y*s; this.z+=v.z*s; return this; }
  distanceTo(v){ return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z); }
  lengthSq(){ return this.x*this.x+this.y*this.y+this.z*this.z; }
  normalize(){ const l=Math.hypot(this.x,this.y,this.z)||1; this.x/=l; this.y/=l; this.z/=l; return this; }
  lerpVectors(a,b,t){ this.x=a.x+(b.x-a.x)*t; this.y=a.y+(b.y-a.y)*t; this.z=a.z+(b.z-a.z)*t; return this; }
  applyAxisAngle(){ return this; }
  cross(){ return this; }
}

function loadRuntime(){
  let now=1000;
  let raf=null;
  const hooks=[];
  const player={ position:new V3(6.5,0,0) };
  const BF={
    ObjectLibrary:{ create(){}, registerCreateHook(fn){hooks.push(fn);}, exists(){return false;} },
    PassiveObjectRuntime:{ setEnabled(){} },
    currentEngine:{ character:{root:player,speed:0}, THREE:{Vector3:V3}, missionManager:{memory:{state:{missionLifecycle:{}}}} }
  };
  const context={
    window:null, BlueFox3D:BF,
    performance:{now:()=>now}, Date, Math, Set, WeakMap, Object, console:{info(){},error(){}},
    requestAnimationFrame(fn){raf=fn; return 1;},
    document:{querySelector(){return {classList:{contains(){return false;}}};}}
  };
  context.window=context;
  vm.createContext(context);
  const source=fs.readFileSync(path.join(__dirname,'..','engine','fauna-runtime.js'),'utf8');
  vm.runInContext(source,context,{filename:'fauna-runtime.js'});
  const root={
    position:new V3(0,0,0), rotation:new V3(), scale:new V3(1,1,1),
    userData:{libraryType:'brouteur'}, children:[], parent:{}, visible:true,
    traverse(fn){ fn(this); }
  };
  assert.equal(BF.FaunaRuntime.register(root,'brouteur'),true);
  const step=(seconds,x,speed=0)=>{ now=1000+seconds*1000; if(x!=null) player.position.x=x; BF.currentEngine.character.speed=speed; const cb=raf; assert.ok(cb); cb(); };
  return {BF,root,player,step};
}

test('approche directe continue depuis loin declenche une fuite visible',()=>{
  const {BF,root,step}=loadRuntime();
  step(0.1,6.5,0); step(0.6,5.4,2.2); step(1.1,4.2,2.4); step(1.6,3.1,2.2);
  const s=BF.FaunaRuntime.getState(root);
  assert.equal(s.state,'flee');
  assert.ok(Math.abs(root.position.x) > 2.0, `fuite trop faible: ${root.position.x}`);
});

test('arret a distance puis approche progressive qualifie une proximite acceptee',()=>{
  const {BF,root,step}=loadRuntime();
  step(0.1,6.5,0); step(1.0,4.8,1.9);
  for(let t=1.25;t<=3.25;t+=0.25) step(t,4.8,0);
  assert.equal(BF.FaunaRuntime.getState(root).cautiousQualified,true);
  step(4.25,4.2,0.6); step(5.25,3.6,0.6); step(6.25,3.0,0.6); step(6.5,3.0,0); step(6.75,2.8,0.4);
  const s=BF.FaunaRuntime.getState(root);
  assert.notEqual(s.state,'flee');
  assert.equal(s.acceptedProximity,true);
});

test('clic final proche apres approche prudente ne transforme pas interaction en menace',()=>{
  const {BF,root,step}=loadRuntime();
  step(0.1,6.5,0); step(1.0,4.8,1.9);
  for(let t=1.25;t<=3.25;t+=0.25) step(t,4.8,0);
  step(4.25,4.2,0.6); step(5.25,3.6,0.6); step(6.25,3.0,0.6); step(6.5,3.0,0); step(6.75,2.8,0.4);
  assert.equal(BF.FaunaRuntime.getState(root).acceptedProximity,true);
  step(7.15,1.8,2.5); // equivalent a une derniere approche directe vers le point d'interaction
  assert.notEqual(BF.FaunaRuntime.getState(root).state,'flee');
});

test('fauna-no-spin ne reecrit plus la position d une creature possedee par FaunaRuntime',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','engine','fauna-no-spin-r6.js'),'utf8');
  assert.match(source,/const a=A\.get\(r\),s=BF\.FaunaRuntime\?\.getState\?\.\(r\)\?\.state;if\(s\)return;/);
  assert.doesNotMatch(source,/if\(s==="tool_use"\|\|s==="flee"\)return/);
});
