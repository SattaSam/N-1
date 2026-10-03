const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=process.argv[2] || process.cwd();
function boot(resourceKeys){
  const w={console,performance:{now:()=>1000},setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,addEventListener:()=>{},removeEventListener:()=>{}};
  w.window=w; w.globalThis=w;
  const evaluation={isComplete:true};
  const tree={find:(id)=>String(id).includes(':evaluate')?evaluation:null};
  const manager={
    activeMissionIds:['LOC-14@map-test'], primaryMissionId:'', trees:new Map([['LOC-14@map-test',tree]]),
    memory:{state:{siteProgression:{'home':{sites:{camp:{kind:'camp',mapId:'home'}}}}}},
    hasMissionExecutionAuthority:()=>false, hasPrimaryMissionAuthority:()=>false
  };
  const engine={
    currentMapId:'map-test', currentMap:{interactables:[]}, missionManager:manager,
    findKnownRoute:()=>Array.from({length:12},(_,i)=>'m'+i),
    targetInteraction:()=>true, updateAutonomy:()=>{}, ensureActivity:()=>{},
    character:{root:{position:{distanceTo:()=>0}},target:{},speed:0,stop:()=>{},setTarget:()=>true},
    callbacks:{onStatus:()=>{},onSpeak:()=>{}}, autonomyAllowed:()=>true,
    canInteractWith:()=>false, discoveredMaps:new Set(), THREE:{Vector3:class{}},
    postActionRecoveryUntil:0,lastAutonomyAt:0,lastActivityAt:0
  };
  const BF={
    Missions:{MissionManager:class{}}, BAC:{}, currentEngine:engine,
    bibleRuntime:{constructionAvailability:(kind)=>({allowed:kind==='camp'})},
    getSurvivalState:()=>({energy:100,needs:{},fatigue:{}}),
    getMapProgressionIndicators:()=>({uniqueResources:Object.fromEntries(resourceKeys.map(k=>[k,{count:1}]))}),
    getKnownSites:()=>[], getAutonomyMode:()=> 'full'
  };
  w.BlueFox3D=BF;
  vm.runInContext(fs.readFileSync(path.join(root,'engine/behavior-arbitration-integration.js'),'utf8'),vm.createContext(w),{filename:'behavior-arbitration-integration.js'});
  return BF.getBACDiagnostics().shelterOpportunity;
}
assert.strictEqual(boot(['fiber']),null,'LOC-14 with one distinct known resource must not admit autonomous camp');
const two=boot(['fiber','wood']);
assert(two,'LOC-14 with two distinct known resources must admit autonomous camp when existing gates allow it');
assert.strictEqual(two.distinctKnownResources,2);
console.log('PASS LOC-14 site-quality runtime');
