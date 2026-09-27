const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const BF={Missions:{ActionType:{TRAVEL:'travel'}}};
const w={BlueFox3D:BF,performance:{now:()=>0},addEventListener(){},removeEventListener(){},dispatchEvent(){},setTimeout(fn){fn();return 1},Date,Math,console};w.window=w;
vm.runInNewContext(fs.readFileSync(path.join(root,'engine/mission-manager.js'),'utf8'),{window:w,console,performance:w.performance,Date,Math});
const P=BF.Missions.MissionManager.prototype;
const travel={node:{params:{toMapId:'T'}},missionId:'M'};
let optimal=0,physical=0;
const manager=Object.create(P);
Object.assign(manager,{
  engine:{currentMapId:'S',findOptimalRoute(){optimal++;return ['S','HUB','T']},findKnownRoute(){physical++;return null}},
  isAutonomousUnknownTravel(){return false},
  missionTransitionTargetMapId(){return 'T'},
  travelMissionDefinition(){return {navigation:{autonomousKnownReturn:false}}}
});
assert.equal(P.missionTransitionExecutable.call(manager,travel),true,'route TP optimale doit rendre la transition missionnelle exécutable');
assert.equal(optimal,1);assert.equal(physical,0,'le fallback physique ne doit pas masquer une route optimale disponible');
manager.engine={currentMapId:'S',findKnownRoute(){physical++;return ['S','A','T']}};
assert.equal(P.missionTransitionExecutable.call(manager,travel),true,'fallback historique doit rester opérationnel sans findOptimalRoute');
assert.equal(physical,1);
console.log('PASS R-EXP-LONG A MissionManager optimal route + historical fallback');
