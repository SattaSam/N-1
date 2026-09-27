const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const storage=new Map();
const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
let raf=null, hook=null, now=100, events=[];
class V3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}clone(){return new V3(this.x,this.y,this.z)}copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}setY(y){this.y=y;return this}normalize(){const n=Math.hypot(this.x,this.y,this.z)||1;this.x/=n;this.y/=n;this.z/=n;return this}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}lerpVectors(a,b,t){this.x=a.x+(b.x-a.x)*t;this.y=a.y+(b.y-a.y)*t;this.z=a.z+(b.z-a.z)*t;return this}cross(){return this}}
const player={position:new V3(10,0,0)};
const memoryFacts={};
const memory={getFact:(k,d)=>Object.prototype.hasOwnProperty.call(memoryFacts,k)?memoryFacts[k]:d,setFact:(k,v)=>{memoryFacts[k]=v;return true},save(){},state:{missionLifecycle:{}}};
const defs=[
 {type:'brouteur',category:'fauna',id:'GRAZER'}, {type:'sauteur',category:'fauna',id:'HOPPER'},
 {type:'nocturnal_animal',category:'fauna',id:'NOCT'}, {type:'amphibian_species',category:'fauna',id:'AMPH'},
 {type:'rock',category:'mineral',id:'ROCK'}
];
const BF={ObjectLibrary:{create(){},list({category}={}){return defs.filter(d=>!category||d.category===category)},registerCreateHook(fn){hook=fn},exists(){return false}},PassiveObjectRuntime:{setEnabled(){}},ObjectEvents:{types:{PHENOMENON_OBSERVED:'PHENOMENON_OBSERVED'},emit(type,source,detail){events.push({type,source,detail,tags:detail.tags,instanceId:source.userData.instanceId,state:detail.state});return true}},currentEngine:{currentMapId:'m',planetClock:{gameMinutes:600,realTime:Date.now()},character:{root:player,speed:0},missionManager:{memory},THREE:{Vector3:V3}}};
const doc={querySelector(sel){if(sel==='.day-block')return {classList:{contains:()=>false}};return null},querySelectorAll:()=>[],body:{},documentElement:{}};
const ctx={window:null,BlueFox3D:BF,console:{info(){},warn(){},error(){}},localStorage,Storage:function(){},performance:{now:()=>now*1000},Date,Math:Object.create(Math),JSON,Set,Map,WeakMap,Object,Array,Number,String,Boolean,Promise,document:doc,requestAnimationFrame:fn=>{raf=fn;return 1},cancelAnimationFrame(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},MutationObserver:function(){this.observe=()=>{};this.disconnect=()=>{}},addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){}};ctx.window=ctx;ctx.Storage.prototype={setItem(){}};ctx.Math.random=()=>0.5;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/settings-ui-bridge.js'),'utf8'),ctx,{filename:'settings'});
assert.strictEqual(typeof BF.getPlayerTraitProfile,'function');
let prof=BF.getPlayerTraitProfile();assert.strictEqual(prof.prudent,28);assert.strictEqual(prof.curieux,72);assert.strictEqual(prof.respectueux,88);assert.strictEqual(prof.destructeur,12);
storage.set('bluefox_player_traits_v1',JSON.stringify({'curieux|prudent':0,'courageux|craintif':50,'empathique|indifferent':100,'respectueux|destructeur':100}));prof=BF.getPlayerTraitProfile();assert.strictEqual(prof.prudent,100);assert.strictEqual(prof.empathique,100);assert.strictEqual(prof.respectueux,100);
vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/fauna-runtime.js'),'utf8'),ctx,{filename:'fauna'});
assert(BF.FaunaRuntime.faunaTypes().includes('amphibian_species'));assert(!BF.FaunaRuntime.faunaTypes().includes('rock'));
assert.strictEqual(BF.FaunaRuntime.getReputation('sauteur'),'neutral');assert.strictEqual(BF.FaunaRuntime.setReputation('sauteur','hostile'),true);assert.strictEqual(BF.FaunaRuntime.getReputation('sauteur'),'hostile');assert.strictEqual(BF.FaunaRuntime.setReputation('rock','friendly'),false);
function root(type,id){return {position:new V3(0,0,0),rotation:{x:0,y:0,z:0,clone(){return {...this}},copy(){}},scale:{x:1,y:1,z:1,clone(){return {...this}},copy(){},set(){}},children:[],userData:{instanceId:id,libraryType:type},parent:{},visible:true,traverse(fn){fn(this)}}}
function step(t,x,speed=0){now=t;player.position.x=x;BF.currentEngine.character.speed=speed;raf&&raf();}
storage.set('bluefox_player_traits_v1',JSON.stringify({'curieux|prudent':0,'courageux|craintif':50,'empathique|indifferent':100,'respectueux|destructeur':100}));
let a=root('brouteur','good');hook({root:a,definition:{type:'brouteur'}},{type:'brouteur'});step(100,7,0);step(100.2,4.5,0);step(100.3,4.5,0);step(101.5,4.5,0);assert.strictEqual(BF.FaunaRuntime.getState(a).cautiousQualified,true);assert(events.some(e=>e.source===a&&e.detail.state==='cautious_approach'));
storage.set('bluefox_player_traits_v1',JSON.stringify({'curieux|prudent':100,'courageux|craintif':50,'empathique|indifferent':0,'respectueux|destructeur':0}));events=[];let b=root('brouteur','bad');hook({root:b,definition:{type:'brouteur'}},{type:'brouteur'});step(102,7,0);step(102.2,4.5,0);step(102.3,4.5,0);step(103.4,4.5,0);assert.strictEqual(BF.FaunaRuntime.getState(b).cautiousQualified,false);step(104.0,3.0,2.05);assert(events.some(e=>e.source===b&&e.detail.state==='flee'));
storage.set('bluefox_player_traits_v1',JSON.stringify({'curieux|prudent':0,'courageux|craintif':50,'empathique|indifferent':100,'respectueux|destructeur':100}));let n=root('nocturnal_animal','night');hook({root:n,definition:{type:'nocturnal_animal'}},{type:'nocturnal_animal'});step(105,7,0);step(105.2,4.5,0);step(105.3,4.5,0);const nd=BF.FaunaRuntime.getState(n).approachDisposition;assert(nd&&nd.speciesPenalty===0.35);
console.log('PASS fau-r3-approach-runtime 16 assertions');
