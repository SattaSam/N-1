const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
class V3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}clone(){return new V3(this.x,this.y,this.z)}copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}distanceTo(v){return Math.hypot(this.x-v.x,this.z-v.z)}}
const exits=(...ids)=>Object.fromEntries(ids.map((id,i)=>[`e${i}`,{targetMap:id}]));
const maps={S:{exits:exits('A')},A:{exits:exits('S','BA')},BA:{exits:exits('A','C')},C:{exits:exits('BA','D')},D:{exits:exits('C','E')},E:{exits:exits('D','F')},F:{exits:exits('E','G')},G:{exits:exits('F','BB')},BB:{exits:exits('G','T')},T:{exits:exits('BB')},HUB:{exits:{}}};
const net={hub:{mapId:'HUB',anchor:{x:0,y:0,z:0}},destinations:[{mapId:'BA',anchor:{x:10,y:0,z:10}},{mapId:'BB',anchor:{x:20,y:0,z:20}}]};
const BF={maps,clamp:x=>x,SpecialObjectRuntime:{routingNetwork:()=>net,teleportTo:async()=>true}};
const w={BlueFox3D:BF,performance:{now:()=>100},setTimeout:(fn)=>{fn();return 1},clearTimeout(){},console,Date,Math};w.window=w;
let src=fs.readFileSync(path.join(root,'engine/world-engine.js'),'utf8').replace('BF.mount = async function mount(options) {','BF.__WorldEngine = WorldEngine;\n  BF.mount = async function mount(options) {');vm.runInNewContext(src,{window:w,console,performance:w.performance,setTimeout:w.setTimeout,Date,Math});
const P=BF.__WorldEngine.prototype,e=Object.create(P);e.discoveredMaps=new Set(Object.keys(maps));
assert.deepEqual(Array.from(P.findKnownRoute.call(e,'S','T')),['S','A','BA','C','D','E','F','G','BB','T'],'findKnownRoute doit rester physique');
assert.deepEqual(Array.from(P.findOptimalRoute.call(e,'S','T')),['S','A','BA','HUB','BB','T'],'findOptimalRoute doit exploiter le TP');
console.log('PASS TP routing is opt-in: physical contract preserved + optimal multimodal available');
