const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

class V3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  clone(){return new V3(this.x,this.y,this.z)}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
  setY(y){this.y=y;return this}
  lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}
  normalize(){const l=Math.hypot(this.x,this.y,this.z)||1;this.x/=l;this.y/=l;this.z/=l;return this}
  addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
}

function load(){
  const animalRoot={position:new V3(0,0,0),userData:{}};
  const animal={position:animalRoot.position,userData:{active:true,worldAnchor:animalRoot,functional:{type:'brouteur',category:'fauna',spawn:{tags:['fauna']},interaction:{actions:['observe']}}}};
  let originalInteractions=0;
  const character={root:{position:new V3(8,0,0)},target:new V3(8,0,0),speed:0,fatigueSpeedMultiplier:1,
    setTarget(p,mode){this.target=p.clone();this.lastMode=mode;return true;},stop(){this.speed=0;}};
  const engine={
    character, THREE:{Vector3:V3}, currentMapId:'map-a', currentMap:{interactables:[animal],gates:[]}, discoveredMaps:new Set(),
    transition:false,transitioning:false,pendingInteraction:null,pendingGate:null,pendingZoneExploration:null,currentRoutine:null,
    postActionRecoveryUntil:0,lastAutonomyAt:0,lastActivityAt:0,autonomyActionStreak:0,autonomyBreakTarget:3,
    missionManager:{currentAction:null,hasPrimaryMissionAuthority(){return false;}},
    canInteractWith(){return true;}, interactionProfile(){return {action:'observe'};},
    interactionApproachPoint(){return {point:new V3(1.5,0,0),pathLength:6.5};},
    targetInteraction(){originalInteractions++;return true;}, updateAutonomy(){return 'original';}, ensureActivity(){},
    noteLocalAutonomousDecision(){this.noted=(this.noted||0)+1;},showWorldMarker(p){this.marker=p.clone();},
    callbacks:{onStatus(msg){engine.status=msg;}}, narrativeMapName(){return 'map';},canStartAutonomousGate(){return false;}
  };
  const BF={
    Missions:{}, currentEngine:engine,
    BAC:{evaluateSurvivalDecision(){return null;},weightedPick(options){return options.find(o=>o.id==='relations-object');}},
    FaunaRuntime:{getState(root){return root===animalRoot?{state:'observe',acceptedProximity:false}:null;}},
    ObjectLibrary:{get(){return null;}},
    ObjectEvents:{types:{},history(){return[];}},
    getSurvivalState(){return {fatigue:{level:'normal',movement:1,actionDuration:1},needs:{}};},
    getMapExplorationState(){return {surfacePercent:20};},getNextUnexploredMapTarget(){return null;}
  };
  const context={window:null,BlueFox3D:BF,console,Date,Math,Set,Map,WeakMap,Object,performance:{now(){return 1000;}},
    addEventListener(){},setTimeout(fn){fn();},setInterval(){return 1;},clearInterval(){}};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','engine','behavior-arbitration-integration.js'),'utf8'),context);
  return {BF,engine,animal,animalRoot,character,get interactions(){return originalInteractions;}};
}

test('autonomie faune: point prudent, arret, puis interaction finale',()=>{
  const h=load();
  h.engine.updateAutonomy(6000);
  assert.equal(h.interactions,0);
  assert.equal(h.character.lastMode,'walk');
  assert.ok(Math.abs(h.character.target.distanceTo(h.animalRoot.position)-4.8)<1e-6);
  assert.ok(h.engine.__bacFaunaApproach);

  h.character.root.position.copy(h.character.target);
  h.engine.updateAutonomy(7000);
  assert.equal(h.interactions,0);
  assert.equal(h.engine.__bacFaunaApproach.arrivedAt,7000);

  h.engine.updateAutonomy(8300);
  assert.equal(h.interactions,0);
  assert.equal(h.engine.__bacFaunaApproach.phase,'inner');
  assert.ok(Math.abs(h.character.target.distanceTo(h.animalRoot.position)-3.0)<1e-6);

  h.character.root.position.copy(h.character.target);
  h.engine.updateAutonomy(8500);
  assert.equal(h.engine.__bacFaunaApproach.arrivedAt,8500);
  h.engine.updateAutonomy(9400);
  assert.equal(h.interactions,1);
  assert.equal(h.engine.__bacFaunaApproach,null);
});

test('interaction joueur annule proprement une preparation autonome faune',()=>{
  const h=load();
  h.engine.updateAutonomy(6000);
  assert.ok(h.engine.__bacFaunaApproach);
  h.animal.userData.requestedInteractionSource='manual';
  h.engine.targetInteraction(h.animal);
  assert.equal(h.engine.__bacFaunaApproach,null);
  assert.equal(h.interactions,1);
});
