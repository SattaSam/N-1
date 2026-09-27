const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ROOT=path.resolve(__dirname,'..'); let now=100,queue=[]; const emitted=[];
class V3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}clone(){return new V3(this.x,this.y,this.z)}copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}}
class E extends V3{} class S extends V3{constructor(x=1,y=1,z=1){super(x,y,z)}}
function part(name,side=0){return{name,userData:{side},position:new V3(),rotation:new E(),scale:new S(),material:null}}
const children=['NpcEye','NpcCore','TranslucentHeadFine','TranslucentTorsoFine','TranslucentUpperArm','TranslucentForearm','TranslucentThigh','TranslucentShin'].map((n,i)=>part(n,i%2?1:-1));
const root={userData:{instanceId:'n1'},position:new V3(),rotation:new E(),scale:new S(),children,parent:{},visible:true,traverse(fn){children.forEach(fn)},dispatchEvent(){}};
const hooks=[];
const window={performance:{now:()=>now},Date,Math,console,requestAnimationFrame(fn){queue.push(fn);return queue.length},dispatchEvent(){},CustomEvent:class{constructor(t,o){this.type=t;this.detail=o.detail}},BlueFox3D:{ObjectLibrary:{create(){},registerCreateHook(fn){hooks.push(fn)}},PassiveObjectRuntime:{setEnabled(){}},RuntimeBudget:{shouldUpdate(){return true}},ObjectEvents:{types:{NPC_CONTACTED:'NPC_CONTACTED',NPC_DIALOGUE:'NPC_DIALOGUE'},emit(type,source,detail){emitted.push({type,source,detail});return{type,detail}}}}};window.window=window;
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/npc-runtime.js'),'utf8'),vm.createContext(window));
const BF=window.BlueFox3D;hooks[0]({root},{type:'npc_translucent'});
const hit={userData:{worldAnchor:root,requestedInteractionSource:'manual',interactionProfile:{action:'contact'}}};
BF.currentEngine={character:{root:{position:new V3(0,0,0)}},missionManager:{catalogController:{getRelation(){return{rank:'friendly'}}}},pendingInteraction:hit,interactionStartedAt:100,currentMapId:'city-a'};
now=1000;queue.shift()();
assert(emitted.some(e=>e.type==='NPC_CONTACTED'&&e.detail.civilizationId==='translucent'),'real contact emits canonical NPC_CONTACTED');
assert.equal(BF.NpcRuntime.getState(root).state,'dialogue');
assert.equal(BF.NpcRuntime.getState(root).relationRank,'friendly');
const count=emitted.filter(e=>e.type==='NPC_CONTACTED').length; now=1100;queue.shift()(); assert.equal(emitted.filter(e=>e.type==='NPC_CONTACTED').length,count,'same contact session emitted once');
BF.currentEngine.pendingInteraction=null; BF.currentEngine.interactionStartedAt=0; now=1300;queue.shift()();
assert.equal(BF.NpcRuntime.getState(root).controlled,false,'contact releases runtime control after interaction');
console.log('PASS npc-r2-contact-runtime');
