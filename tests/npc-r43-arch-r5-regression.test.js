const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ROOT=path.resolve(__dirname,'..');let now=100;const queue=[],emitted=[],hooks=[];
class V3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}clone(){return new V3(this.x,this.y,this.z)}copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}setScalar(v){this.x=this.y=this.z=v;return this}}
class E extends V3{}
const root={userData:{npcVisualScale:.35,npcGroundOffset:.22,npcMissionContactMode:'symbols-only'},position:new V3(0,.22,0),rotation:new E(),scale:new V3(.35,.35,.35),children:[],parent:{type:'Scene',isScene:true},visible:true,traverse(){},dispatchEvent(){},add(){}};
const hitbox={userData:{worldAnchor:root,interactionProfile:{action:'contact'},npcMissionContactMode:'symbols-only',requestedInteractionSource:'manual'}};
const BF={ObjectLibrary:{create(){},registerCreateHook(fn){hooks.push(fn)}},PassiveObjectRuntime:{setEnabled(){}},RuntimeBudget:{shouldUpdate(){return true;}},ObjectEvents:{types:{NPC_CONTACTED:'NPC_CONTACTED',NPC_REACTION:'NPC_REACTION'},emit(type,object,detail){emitted.push({type,object,detail})}}};
const window={BlueFox3D:BF,performance:{now:()=>now},Date,Math,console,requestAnimationFrame(fn){queue.push(fn);return queue.length},dispatchEvent(){},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail}},setTimeout(){}};window.window=window;
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/npc-runtime.js'),'utf8'),vm.createContext(window));
hooks[0]({root},{type:'npc_translucent'});
BF.currentEngine={currentMapId:'arch38-map',pendingInteraction:hitbox,interactionStartedAt:12345,character:{root:{position:new V3(2,0,0)}}};
now=200;queue.shift()();
const contact=emitted.find(e=>e.type==='NPC_CONTACTED');
assert(contact,'NPC_CONTACTED must be emitted');
assert.strictEqual(contact.detail.contactMode,'symbols-only','ARCH38 symbols-only contactMode preserved');
assert.equal(root.scale.x,.35,'ARCH-R5 contact path must not mutate visual scale');
assert(Math.abs(root.position.y-.22)<=.046,'ARCH-R5 contact path keeps grounded anchor');
assert.equal(typeof BF.NpcRuntime.reactToApproach,'function','ARCH-R5 approach API preserved');
console.log('PASS npc-r43-arch-r5-regression');
