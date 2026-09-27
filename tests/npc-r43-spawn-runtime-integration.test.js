const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ROOT=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');
let now=100, queue=[]; const hooks=[];
class V3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}clone(){return new V3(this.x,this.y,this.z)}copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}setScalar(v){this.x=this.y=this.z=v;return this}}
class E extends V3{}
const scene={type:'Scene',isScene:true,children:[],add(o){o.parent=this;this.children.push(o)}};
function makeRoot(type){const scale=type==='npc_translucent'?.35:type==='npc_rocky'?.47:type==='generic_intrinsic'?1.7:1;const y=type==='npc_translucent'?.22:type==='npc_rocky'?.19:type==='generic_intrinsic'?2.4:0;return{userData:{npcVisualScale:scale,npcGroundOffset:y},position:new V3(0,y,0),rotation:new E(),scale:new V3(scale,scale,scale),parent:null,visible:true,children:[],traverse(){},dispatchEvent(){}}}
const defs={npc_translucent:{id:'NPC-T',type:'npc_translucent',spawn:{}},npc_rocky:{id:'NPC-R',type:'npc_rocky',spawn:{}},generic:{id:'GEN',type:'generic',spawn:{}},generic_intrinsic:{id:'GEN-Y',type:'generic_intrinsic',spawn:{}}};
const BF={ObjectLibrary:{get:t=>defs[t]||null,create(THREE,type){const root=makeRoot(type),instance={root,colliders:[],hitbox:null,definition:defs[type]};hooks.forEach(h=>h(instance,{type,definition:defs[type]}));return instance},registerCreateHook(fn){hooks.push(fn)}},PassiveObjectRuntime:{setEnabled(){}},RuntimeBudget:{shouldUpdate(){return true;}}};
const window={BlueFox3D:BF,performance:{now:()=>now},Date,Math,console,requestAnimationFrame(fn){queue.push(fn);return queue.length},dispatchEvent(){},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail}}};window.window=window;
const ctx=vm.createContext(window);
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/npc-runtime.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/object-spawner.js'),'utf8'),ctx);
const spawner=new BF.ObjectSpawner({THREE:{},scene});
const t=spawner.spawn('npc_translucent',{position:{x:-36,y:0,z:-20},force:true,source:'custom-map:custom-map-31-tinycity'}).root;
assert.equal(t.scale.x,.35,'normal spawn preserves intrinsic translucent scale');
assert(Math.abs(t.position.y-.22)<1e-9,'normal spawn preserves intrinsic grounded Y');
assert.equal(t.position.x,-36);assert.equal(t.position.z,-20);
// runtime frame then deferred registration, then runtime frame after registration
queue.shift()(); queue.shift()(); now=1100; queue.shift()();
assert.equal(t.scale.x,.35,'NpcRuntime must not overwrite model scale');
assert(Math.abs(t.position.y-.22)<=.046,'NpcRuntime hover remains around final grounded spawn anchor');
const g=spawner.spawn('generic',{position:{x:2,y:3,z:4},force:true}).root;
assert.equal(g.scale.x,1);assert.equal(g.position.y,3,'generic y=0 historical placement unchanged');
const gi=spawner.spawn('generic_intrinsic',{position:{x:6,y:3,z:7},force:true}).root;
assert.equal(gi.position.y,3,'non-NPC intrinsic Y must still be overwritten by historical ObjectSpawner contract');
assert.equal(gi.scale.x,1,'non-NPC intrinsic scale must still be reset by historical ObjectSpawner contract');
const e=spawner.spawn('npc_translucent',{position:{x:1,y:5,z:2},scale:2,force:true}).root;
assert.equal(e.scale.x,2,'explicit spawn scale still overrides intrinsic scale');
assert.equal(e.position.y,5.22,'placement Y adds intrinsic grounding offset');
// Detached map group must not leave a ghost NPC after cleanup cadence.
t.parent={type:'Group',parent:null}; now=10100;
for(let i=0;i<4 && BF.NpcRuntime.list('npc_translucent').includes(t);i++){const fn=queue.shift();if(fn)fn();}
assert(!BF.NpcRuntime.list('npc_translucent').includes(t),'detached-map NPC removed from runtime registry');
console.log('PASS npc-r43-spawn-runtime-integration');
