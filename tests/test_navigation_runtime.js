const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
let source=fs.readFileSync(path.join(__dirname,'../engine/world-engine.js'),'utf8');source=source.replace('  BF.mount = async function mount(options) {','  BF.__WorldEngine=WorldEngine;\n  BF.mount = async function mount(options) {');
const BF={maps:{A:{exits:{}},B:{exits:{}},C:{exits:{}}},bibleRuntime:{}};vm.runInNewContext(source,{window:{BlueFox3D:BF},console,performance:{now:()=>0},Date,Math,Set,Map});
const proto=BF.__WorldEngine.prototype;let status=[],targets=[];let authority=true;
const gateB={position:{x:20,y:0,z:0},userData:{exit:{targetMap:'B'}}};const gateC={position:{x:40,y:0,z:0},userData:{exit:{targetMap:'C'}}};
const engine=Object.create(proto);Object.assign(engine,{currentMapId:'A',currentMap:{gates:[gateB,gateC]},navigationRoute:[],persistentNavigationIntent:{source:'pending-experimentation',mapId:'C',retryAfter:0},missionManager:{isPlayerSelectedPrimary:()=>true,hasPrimaryMissionAuthority:()=>authority},transitioning:false,pendingInteraction:null,currentRoutine:null,character:{setTarget:(p,mode)=>targets.push([p.x,mode])},callbacks:{onStatus:t=>status.push(t)},showWorldMarker:()=>{},narrativeMapName:x=>x,findKnownRoute:(_from,to)=>['A','B','C'].slice(0,['A','B','C'].indexOf(to)+1),persistNavigationIntent:()=>{},navigationAllowsTeleport:false,clearPersistentNavigationIntent:proto.clearPersistentNavigationIntent});
assert.equal(proto.resumePersistentNavigation.call(engine),false);assert.deepEqual(engine.navigationRoute,[]);assert.equal(targets.length,0);
authority=false;assert.equal(proto.resumePersistentNavigation.call(engine),true);assert.deepEqual(Array.from(engine.navigationRoute),['B','C']);assert.equal(engine.pendingGate,gateB);assert.equal(targets[0][0],20);
// The user Top1 becomes runnable while a route is in progress; defer without launching the next leg.
authority=true;engine.currentMapId='B';engine.currentMap.gates=[gateC];engine.navigationRoute.shift();assert.equal(proto.navigateNextRouteStep.call(engine),false);assert.equal(targets.length,1);assert.equal(engine.pendingGate,null);
// Resume the retained persistent intent when Top1 is no longer runnable.
authority=false;engine.findKnownRoute=(_from,to)=>['B','C'];assert.equal(proto.resumePersistentNavigation.call(engine),true);assert.equal(engine.pendingGate,gateC);assert.equal(targets[1][0],40);
console.log('PASS real WorldEngine methods: Top1 defer, resume A→B, suspend at B, resume B→C');
