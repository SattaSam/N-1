const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ROOT=path.join(__dirname,'..');
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
const facts={};
const window={console,Date,Math,JSON,Set,Map,WeakMap,Promise,performance:{now:()=>1000},CustomEvent:CE,queueMicrotask:fn=>fn(),setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},localStorage:{getItem(){return null},setItem(){},removeItem(){}},addEventListener(){},removeEventListener(){},dispatchEvent(){return true},BlueFox3D:{Missions:{},BiblePatterns:{},ObjectEvents:{types:{}}}};window.window=window;
const ctx=vm.createContext(window);
vm.runInContext(fs.readFileSync(path.join(ROOT,'data/bible-catalog.js'),'utf8'),ctx,{filename:'bible-catalog.js'});
let src=fs.readFileSync(path.join(ROOT,'engine/bible-runtime-v0-1-unified.js'),'utf8').replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/,'\n})(window);');
vm.runInContext(src,ctx,{filename:'bible-runtime-v0-1-unified.js'});
const BF=window.BlueFox3D;
const mission={id:'RSTAB-DEFERRED-ONESHOT',title:'Deferred one-shot',trigger:{type:'object.special_seen',count:1},prerequisites:['PRE'],bindActivationMap:true,priority:1};
const rt=Object.create(BF.BibleRuntimeV01.prototype);rt.catalog=[mission];rt.byId=new Map([[mission.id,mission]]);rt.state={triggerCounts:{},uniqueTriggerValues:{}};rt.saveState=()=>true;
const status={PRE:'active','RSTAB-DEFERRED-ONESHOT':'hidden'};
let queued=null,activated=null;
const manager={startMission(id,opts){queued={id,opts};return true;},memory:{state:{missionLifecycle:{}},setFact(k,v){facts[k]=v;return true;},getFact(k,d=null){return Object.hasOwn(facts,k)?facts[k]:d;},save(){}}};
rt.manager=()=>manager;rt.missionLifecycle=id=>({active:status[id]==='active',completed:status[id]==='completed',status:status[id]});rt.activateMission=(m,e)=>{activated={id:m.id,e};return true;};
let r=rt.consumeTriggerEvent({type:'object.special_seen',mapId:'m-early',objectId:'o-1',amount:1});
assert.equal(r.activatedMissionId,null);assert.equal(queued?.id,mission.id,'acquired one-shot trigger must become pending');assert.deepEqual(Array.from(queued.opts.prerequisites),['PRE']);assert.equal(facts['bibleDeferredTrigger:RSTAB-DEFERRED-ONESHOT']?.mapId,'m-early');assert.equal(facts['bibleActivation:RSTAB-DEFERRED-ONESHOT']?.mapId,'m-early');assert.equal(activated,null,'BibleRuntime must not own lifecycle activation while prerequisite is missing');
console.log('PASS R-STAB deferred one-shot trigger -> canonical pending activation / causal context preserved');
