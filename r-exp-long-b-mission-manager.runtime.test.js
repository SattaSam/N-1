const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');
const w={BlueFox3D:{Missions:{ActionType:{TRAVEL:'travel'}}},addEventListener(){},removeEventListener(){},performance:{now:()=>0}};w.window=w;
const ctx=vm.createContext({window:w,console,performance:w.performance,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(root,'engine/mission-manager.js'),'utf8'),ctx);
const MM=w.BlueFox3D.Missions.MissionManager,by=new Map(w.BlueFox3D.BibleCatalog.map(m=>[m.id,m]));
const facts={'expLong01:hubTarget':{mapId:'hub'},'expLong03:targetBeacon':{mapId:'old-a'},'expLong05:hubTarget':{mapId:'hub'},'expLong05:otherBeaconTarget':{mapId:'old-b'}};
const mm=Object.create(MM.prototype);mm.memory={getFact:(k,d=null)=>facts[k]??d};mm.definition=id=>by.get(id);mm.engine={currentMapId:'frontier',findOptimalRoute:(a,b)=>[a,b],findKnownRoute:(a,b)=>[a,b],returnToBase(){}};
const cases=[['EXP-LONG-01','returnHub','hub'],['EXP-LONG-03','teleportStart','old-a'],['EXP-LONG-05','returnHub','hub'],['EXP-LONG-05','otherBeacon','old-b']];
for(const [id,slot,target] of cases){const m=by.get(id),step=m.sequence.find(s=>s.slot===slot),travel={missionId:id,node:{id:`${id}:${slot}`,type:'travel',params:step.params}};assert.equal(mm.isAutonomousUnknownTravel(travel),false,`${id}:${slot} ne doit jamais devenir unknown-travel`);assert.equal(mm.missionTransitionTargetMapId(travel),target,`${id}:${slot} cible connue incorrecte`);assert.equal(mm.missionTransitionExecutable(travel),true,`${id}:${slot} doit être exécutable comme route connue`);}
console.log('PASS EXP-LONG MissionManager: TP slots resolve as known targets, never unknown travel');
