const fs=require('fs'); const vm=require('vm'); const assert=require('assert'); const path=require('path');
const ROOT=path.resolve(__dirname,'..'); let now=100, queue=[];
const TestMath=Object.create(Math); TestMath.random=()=>0.25;
class V3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}clone(){return new V3(this.x,this.y,this.z)}copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}setScalar(v){this.x=this.y=this.z=v;return this}}
class E extends V3{}
function part(name,side,x,y,z,rz=0,height=0){return{name,userData:{side},position:new V3(x,y,z),rotation:new E(0,0,rz),scale:new V3(1,1,1),geometry:height?{parameters:{height}}:null,material:null,children:[]};}
function translucent(){
 const c=[
  part('NpcEye',-1,.34,3.77,-.18),part('NpcEye',1,.34,3.77,.18),part('NpcCore',0,.13,2.34,0),part('TranslucentHeadFine',0,.06,3.72,0),part('TranslucentTorsoFine',0,0,1.15,0),
  part('TranslucentShoulder',-1,0,2.82,-.48),part('TranslucentShoulder',1,0,2.82,.48),
  part('TranslucentUpperArm',-1,.01,2.39,-.54,-.025,.82),part('TranslucentUpperArm',1,.01,2.39,.54,-.025,.82),
  part('TranslucentElbow',-1,.03,1.97,-.59),part('TranslucentElbow',1,.03,1.97,.59),
  part('TranslucentForearm',-1,.05,1.53,-.61,-.04,.88),part('TranslucentForearm',1,.05,1.53,.61,-.04,.88),
  part('TranslucentHandAnchor',-1,.08,1.06,-.63),part('TranslucentHandAnchor',1,.08,1.06,.63),
  part('TranslucentHand',-1,0,0,0),part('TranslucentHand',1,0,0,0),
  part('TranslucentThigh',-1,-.02,.77,-.22,-.025,.86),part('TranslucentThigh',1,-.02,.77,.22,.025,.86),
  part('TranslucentKnee',-1,.04,.3,-.22),part('TranslucentKnee',1,.04,.3,.22),
  part('TranslucentShin',-1,.08,-.16,-.22,-.04,.82),part('TranslucentShin',1,.08,-.16,.22,-.04,.82),
  part('TranslucentFoot',-1,.23,-.61,-.22),part('TranslucentFoot',1,.23,-.61,.22)
 ];
 const root={userData:{spawnSource:'test',npcVisualScale:.35,npcGroundOffset:.22},position:new V3(0,.22,0),rotation:new E(),scale:new V3(.35,.35,.35),children:c,parent:{type:'Scene'},visible:true,traverse(fn){c.forEach(fn)},dispatchEvent(){}}; return {root,c};
}

function rocky(){
 const c=[
  part('NpcEye',-1,.33,3.14,-.17),part('NpcEye',1,.33,3.14,.17),part('RockyHead',0,.02,3.08,0),part('RockyTorso',0,0,1.9,0),
  part('RockyUpperArm',-1,0,2.03,-.62,.08,.93),part('RockyUpperArm',1,0,2.03,.62,-.08,.93),
  part('RockyElbow',-1,.03,1.58,-.65),part('RockyElbow',1,.03,1.58,.65),
  part('RockyForearm',-1,.05,1.25,-.68,-.08,.72),part('RockyForearm',1,.05,1.25,.68,-.08,.72),
  Object.assign(part('RockyLimbPlate',-1,-.02,1.45,-.72),{userData:{side:-1,plateIndex:2,jointRole:'elbow'}}),
  Object.assign(part('RockyLimbPlate',1,-.02,1.45,.72),{userData:{side:1,plateIndex:2,jointRole:'elbow'}}),
  part('RockyThigh',-1,-.02,.82,-.27,0,.9),part('RockyThigh',1,-.02,.82,.27,0,.9),
  part('RockyKnee',-1,.02,.39,-.28),part('RockyKnee',1,.02,.39,.28),
  part('RockyShin',-1,.05,.07,-.28,0,.75),part('RockyShin',1,.05,.07,.28,0,.75),
  part('RockyFoot',-1,.19,-.39,-.28),part('RockyFoot',1,.19,-.39,.28)
 ];
 const root={userData:{spawnSource:'test',npcVisualScale:.47,npcGroundOffset:.19},position:new V3(0,.19,0),rotation:new E(),scale:new V3(.47,.47,.47),children:c,parent:{type:'Scene'},visible:true,traverse(fn){c.forEach(fn)},dispatchEvent(){}}; return {root,c};
}
const hooks=[]; const window={BlueFox3D:{ObjectLibrary:{create(){},registerCreateHook(fn){hooks.push(fn)}},PassiveObjectRuntime:{setEnabled(){}},RuntimeBudget:{shouldUpdate(){return true;}}},performance:{now:()=>now},Date,Math:TestMath,console,requestAnimationFrame(fn){queue.push(fn);return queue.length},dispatchEvent(){},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail}}}; window.window=window;
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/npc-runtime.js'),'utf8'),vm.createContext(window));
const BF=window.BlueFox3D, npc=translucent(); hooks[0]({root:npc.root},{type:'npc_translucent'});
BF.currentEngine={character:{root:{position:new V3(0,0,2)}}};
assert(Math.abs(npc.root.scale.x-.35)<1e-9,'NpcRuntime preserves translucent model scale');
assert(Math.abs(npc.root.position.y-.22)<1e-9,'NpcRuntime preserves translucent grounded anchor');
BF.NpcRuntime.setState(npc.root,'vigilance'); now=1000; queue.shift()();
const head=npc.c.find(x=>x.name==='TranslucentHeadFine'); assert(Math.abs(head.rotation.y)>.08,'player tracking visibly rotates head');
const elbow=npc.c.find(x=>x.name==='TranslucentElbow'&&x.userData.side===1), ex=elbow.position.x;
BF.NpcRuntime.setState(npc.root,'dialogue'); now=2200; queue.shift()();
const fore=npc.c.find(x=>x.name==='TranslucentForearm'&&x.userData.side===1);
assert(fore.rotation.z>0 && Math.abs(fore.rotation.z-Math.PI/2)<.55,'dialogue bends one forearm forward close to 90 degrees');
assert(Math.abs(elbow.position.x-ex)>.015,'elbow follows animated upper arm');
BF.NpcRuntime.moveLocal(npc.root,3,0,{state:'movement',duration:1,autoRelease:false}); now=2700; queue.shift()();
assert(Math.abs(npc.root.rotation.y)<.05,'movement along +X faces model forward +X');
BF.NpcRuntime.restore(npc.root);
BF.NpcRuntime.moveLocal(npc.root,0,3,{state:'movement',duration:1,autoRelease:false}); now=3200; queue.shift()();
assert(Math.abs(npc.root.rotation.y+Math.PI/2)<.05,'movement along +Z rotates +X-front model toward +Z');

const rock=rocky(); hooks[0]({root:rock.root},{type:'npc_rocky'});
assert(Math.abs(rock.root.scale.x-.47)<1e-9,'NpcRuntime preserves Rocky model scale');
assert(Math.abs(rock.root.position.y-.19)<1e-9,'NpcRuntime preserves Rocky grounded anchor');
BF.currentEngine.character.root.position.set(100,0,100);
BF.NpcRuntime.setState(rock.root,'rest'); now=4000; queue.shift()();
const rockHead=rock.c.find(x=>x.name==='RockyHead'); const restHead=[rockHead.rotation.x,rockHead.rotation.y,rockHead.rotation.z];
assert(restHead.some(v=>Math.abs(v)>.01),'Rocky rest has visible head motion');
BF.NpcRuntime.setState(rock.root,'calm'); now=4700; queue.shift()();
assert(Math.abs(rockHead.rotation.y-restHead[1])>.01 || Math.abs(rockHead.rotation.x-restHead[0])>.01,'Rocky calm head motion differs from rest');
const rockElbow=rock.c.find(x=>x.name==='RockyElbow'&&x.userData.side===1), rockEx=rockElbow.position.x;
const elbowPlateR=rock.c.find(x=>x.name==='RockyLimbPlate'&&x.userData.side===1), plateRx=elbowPlateR.position.x;
const elbowPlateL=rock.c.find(x=>x.name==='RockyLimbPlate'&&x.userData.side===-1), plateLx=elbowPlateL.position.x;
BF.NpcRuntime.setState(rock.root,'dialogue'); now=5900; queue.shift()();
const rockFore=rock.c.find(x=>x.name==='RockyForearm'&&x.userData.side===1);
assert(rockFore.rotation.z>0 && Math.abs(rockFore.rotation.z-Math.PI/2)<.6,'Rocky dialogue bends one forearm forward close to 90 degrees');
assert(Math.abs(rockElbow.position.x-rockEx)>.01,'Rocky elbow follows animated upper arm');
assert(Math.abs(elbowPlateR.position.x-plateRx)>.005,'Rocky right elbow plate follows its joint');
assert(Math.abs(elbowPlateL.position.x-plateLx)>.002,'Rocky left elbow plate follows its joint');
const elbowL=rock.c.find(x=>x.name==='RockyElbow'&&x.userData.side===-1);
const fixedR={x:elbowPlateR.position.x-rockElbow.position.x,z:elbowPlateR.position.z-rockElbow.position.z};
const fixedL={x:elbowPlateL.position.x-elbowL.position.x,z:elbowPlateL.position.z-elbowL.position.z};
for(let i=0;i<160;i++){ now=6000+i*33; const frame=queue.shift(); assert(frame,'runtime frame remains scheduled'); frame(); }
assert(Math.abs((elbowPlateR.position.x-rockElbow.position.x)-fixedR.x)<1e-9,'Rocky right elbow plate has zero cumulative X drift');
assert(Math.abs((elbowPlateR.position.z-rockElbow.position.z)-fixedR.z)<1e-9,'Rocky right elbow plate has zero cumulative Z drift');
assert(Math.abs((elbowPlateL.position.x-elbowL.position.x)-fixedL.x)<1e-9,'Rocky left elbow plate has zero cumulative X drift');
assert(Math.abs((elbowPlateL.position.z-elbowL.position.z)-fixedL.z)<1e-9,'Rocky left elbow plate has zero cumulative Z drift');

console.log('PASS npc-r4-animation-runtime');
