const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ROOT=path.join(__dirname,'..');
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
const window={console,Date,Math,JSON,Set,Map,WeakMap,Promise,performance:{now:()=>1000},CustomEvent:CE,queueMicrotask:fn=>fn(),setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},BlueFox3D:{Missions:{},BiblePatterns:{},ObjectEvents:{types:{DRONE_ACTIVATED:'DRONE_ACTIVATED',DRONE_PRIORITY_CHANGED:'DRONE_PRIORITY_CHANGED',DRONE_CONSOLE_VIEWED:'DRONE_CONSOLE_VIEWED',DRONE_CARGO_DEPOSITED:'DRONE_CARGO_DEPOSITED',RESOURCE_COLLECTED:'RESOURCE_COLLECTED'}}}};
window.window=window; const ctx=vm.createContext(window);
let src=fs.readFileSync(path.join(ROOT,'engine/bible-runtime-v0-1-unified.js'),'utf8').replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/,'\n})(window);');
vm.runInContext(src,ctx,{filename:'bible-runtime-v0-1-unified.js'});
const BF=window.BlueFox3D;
class Node{constructor(id){this.id=id;this.progress=0;this.target=1;this.isComplete=false;}increment(n=1){if(this.isComplete)return false;this.progress=Math.min(this.target,this.progress+n);this.isComplete=this.progress>=this.target;return true;}}
class Tree{constructor(id,slots){this.id=id;this.nodes=Object.fromEntries(slots.map(s=>[s,new Node(`${id}:${s}`)]));this.order=slots;}find(id){return Object.values(this.nodes).find(n=>n.id===id)||null;}availableLeaves(){const out=[];for(let i=0;i<this.order.length;i++){const n=this.nodes[this.order[i]];if(n.isComplete)continue;if(i===0||this.nodes[this.order[i-1]].isComplete)out.push(n);break;}return out;}refresh(){}}
const t3=new Tree('DRN-03',['deploy','priority','remoteCollect']);
const t4=new Tree('DRN-04',['console','priority','deposit']);
const lifecycle={'DRN-03':{status:'active'},'DRN-04':{status:'active'}};
const memory={state:{missionLifecycle:lifecycle},saveTree(){},save(){}};
const manager={memory,trees:new Map([['DRN-03',t3],['DRN-04',t4]]),syncLifecycleFromTrees(){},reevaluatePendingActivations(){},catalogController:{schedule(){}},publish(){}};
BF.currentEngine={missionManager:manager,callbacks:{onStatus(){}}};
const rt=Object.create(BF.BibleRuntimeV01.prototype);rt.manager=()=>manager;
// DRN-03 must reject craft/kit-ready and local harvest.
rt.handleDroneMissionObjectEvent({type:'DRONE_ACTIVATED',detail:{interactionSource:'drone',droneType:'harvest_drone',state:'kit-ready',beaconLinked:true}});
assert.equal(t3.nodes.deploy.progress,0);
rt.handleDroneMissionObjectEvent({type:'DRONE_ACTIVATED',detail:{interactionSource:'drone',droneType:'harvest_drone',state:'deployed',beaconLinked:true}});
assert.equal(t3.nodes.deploy.progress,1);
rt.handleDroneMissionObjectEvent({type:'DRONE_PRIORITY_CHANGED',detail:{interactionSource:'drone',droneType:'harvest_drone',priority:'collect_all'}});
assert.equal(t3.nodes.priority.progress,1);
rt.handleDroneMissionObjectEvent({type:'RESOURCE_COLLECTED',quantity:1,detail:{interactionSource:'drone',droneType:'harvest_drone',remote:false}});
assert.equal(t3.nodes.remoteCollect.progress,0,'local harvest must not validate remote proof');
rt.handleDroneMissionObjectEvent({type:'RESOURCE_COLLECTED',quantity:1,detail:{interactionSource:'drone',droneType:'harvest_drone',remote:true}});
assert.equal(t3.nodes.remoteCollect.progress,1);
// DRN-04 uses real console/priority/deposit events in order.
rt.handleDroneMissionObjectEvent({type:'DRONE_CONSOLE_VIEWED',detail:{interactionSource:'drone',droneType:'harvest_drone'}});
assert.equal(t4.nodes.console.progress,1);
rt.handleDroneMissionObjectEvent({type:'DRONE_PRIORITY_CHANGED',detail:{interactionSource:'drone',droneType:'harvest_drone',priority:'stellar_iridium'}});
assert.equal(t4.nodes.priority.progress,1);
rt.handleDroneMissionObjectEvent({type:'DRONE_CARGO_DEPOSITED',quantity:150,detail:{interactionSource:'drone',droneType:'harvest_drone'}});
assert.equal(t4.nodes.deposit.progress,1);
console.log('PASS R3 DRN-03/04 canonical runtime events');
