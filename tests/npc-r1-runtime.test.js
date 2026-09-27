const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let now = 0;
let queue = [];
class V3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  clone(){return new V3(this.x,this.y,this.z);}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
}
class Euler extends V3 {}
class Scale extends V3 { constructor(x=1,y=1,z=1){super(x,y,z);} }
function part(name, side=0){return {name,userData:{side},position:new V3(),rotation:new Euler(),scale:new Scale(),material:null,children:[]};}
function npc(type){
  const names = type === 'npc_translucent'
    ? ['NpcEye','NpcEye','NpcCore','TranslucentHeadFine','TranslucentTorsoFine','TranslucentMembrane','TranslucentFilament','TranslucentShoulder','TranslucentShoulder','TranslucentUpperArm','TranslucentUpperArm','TranslucentForearm','TranslucentForearm','TranslucentThigh','TranslucentThigh','TranslucentShin','TranslucentShin','TranslucentFoot','TranslucentFoot']
    : ['NpcEye','NpcEye','RockyHead','RockyTorso','RockyUpperArm','RockyUpperArm','RockyForearm','RockyForearm','RockyThigh','RockyThigh','RockyShin','RockyShin','RockyFoot','RockyFoot','RockyPlate','RockyLimbPlate','RockyFragment'];
  const children = names.map((n,i)=>part(n, i%2 ? 1 : -1));
  const root = {name:type,userData:{},position:new V3(),rotation:new Euler(),scale:new Scale(),children,parent:{},visible:true,
    traverse(fn){children.forEach(fn);}, dispatchEvent(){return true;}};
  return {root,children};
}
const hooks=[];
const events=[];
const window={
  BlueFox3D:{
    ObjectLibrary:{create(){},registerCreateHook(fn){hooks.push(fn);}},
    PassiveObjectRuntime:{setEnabled(){}},
    RuntimeBudget:{shouldUpdate(){return true;}}
  },
  performance:{now:()=>now}, Date, Math, console,
  requestAnimationFrame(fn){queue.push(fn);return queue.length;},
  dispatchEvent(e){events.push(e);},
  CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail;}}
};
window.window=window;
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/npc-runtime.js'),'utf8'),vm.createContext(window));
const BF=window.BlueFox3D;
assert.equal(typeof BF.NpcRuntime.setState,'function');
assert.equal(typeof BF.NpcRuntime.moveLocal,'function');
assert.equal(typeof BF.NpcRuntime.speak,'function');
assert.equal(typeof BF.NpcRuntime.list,'function');

const t=npc('npc_translucent'), r=npc('npc_rocky');
hooks[0]({root:t.root},{type:'npc_translucent'}); hooks[0]({root:r.root},{type:'npc_rocky'});
BF.currentEngine={character:{root:{position:new V3(0,0,0)}}};
assert.equal(BF.NpcRuntime.list().length,2);

// Forced dialogue must survive close proximity instead of being overwritten by vigilance.
BF.NpcRuntime.setState(t.root,'dialogue');
now=1000; const f1=queue.shift(); f1();
assert.equal(BF.NpcRuntime.getState(t.root).state,'dialogue');
assert.equal(BF.NpcRuntime.getState(t.root).controlled,true);
assert(t.children.find(x=>x.name==='TranslucentUpperArm').rotation.z !== 0,'translucent dialogue animates arms');

// Release returns ownership to autonomous proximity logic.
BF.NpcRuntime.releaseState(t.root); now=1200; queue.shift()();
assert.equal(BF.NpcRuntime.getState(t.root).state,'vigilance');

// Physical local locomotion is bounded and animates legs.
BF.NpcRuntime.moveLocal(t.root,0,-9,{state:'movement',duration:1,autoRelease:false});
now=1700; queue.shift()();
assert(Math.abs(t.root.position.z) <= 4.5 + 1e-9,'movement obeys local leash');
assert(t.children.find(x=>x.name==='TranslucentThigh').rotation.z !== 0,'translucent gait animates thighs');

BF.NpcRuntime.moveLocal(r.root,0,-3,{state:'movement',duration:2,autoRelease:false});
now=2200; queue.shift()();
assert(r.children.find(x=>x.name==='RockyThigh').rotation.z !== 0,'rocky gait animates thighs');
assert(r.children.find(x=>x.name==='RockyHead').rotation.z !== 0,'rocky gait includes head tilt');

// Dialogue publishes canonical visual speech event; text remains presentation data.
BF.NpcRuntime.speak(r.root,'⟁ … mission … ⌁');
assert(events.some(e=>e.type==='bluefox:npc-speech' && e.detail.text.includes('mission')));

// Restore returns anchor and pose.
BF.NpcRuntime.restore(t.root);
assert.equal(t.root.position.x,0); assert.equal(t.root.position.z,0);
console.log('PASS npc-r1-runtime');
