const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

class Storage {
  constructor(seed={}) { this.map = new Map(Object.entries(seed)); }
  getItem(k){ return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k,v){ this.map.set(k,String(v)); }
  removeItem(k){ this.map.delete(k); }
}
class CE { constructor(type, init={}){ this.type=type; this.detail=init.detail; } }
function makeContext(storage=new Storage()){
  const listeners = new Map();
  const ctx = {
    console, JSON, Math, Number, String, Boolean, Object, Array, Set, Map, WeakMap,
    Date, performance:{now:()=>1000},
    localStorage:storage, CustomEvent:CE,
    addEventListener:(t,fn)=>{ const a=listeners.get(t)||[]; a.push(fn); listeners.set(t,a); },
    removeEventListener:()=>{}, dispatchEvent:(e)=>{ for(const fn of listeners.get(e.type)||[]) fn(e); },
    setInterval:()=>0, clearInterval:()=>{}, setTimeout:(fn)=>{fn();return 0;}, clearTimeout:()=>{},
  };
  ctx.window = ctx;
  ctx.BlueFox3D = {
    ObjectEvents:{ types:{}, subscribe:()=>null, history:()=>[] },
    Missions:{}
  };
  return vm.createContext(ctx);
}
const ROOT = process.env.BLUEFOX_TEST_ROOT || path.resolve(__dirname, '..');
function load(ctx, name){ vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine', name),'utf8'), ctx, {filename:name}); }

// Progression psychology owner: memories are acquired by lived completion, persisted, and idempotent.
{
  const storage=new Storage();
  const ctx=makeContext(storage);
  load(ctx,'progression-multisystem.js');
  const BF=ctx.BlueFox3D;
  assert.strictEqual(BF.getNarrativeAxisScore('ARCHEOLOGUE'),0);
  assert.strictEqual(BF.getPsychologicalMemoryScore({narrativeAxis:'ARCHEOLOGUE'}),0,'no memory influence before lived completion');
  assert.strictEqual(BF.deferObsessiveMission('M-OBS',3,10000),4);
  assert.strictEqual(BF.deferObsessiveMission('M-OBS',3,12000),4,'cooldown must block inflation');
  assert.strictEqual(BF.deferObsessiveMission('M-OBS',3,15000),8);
  BF.completeMissionPsychology({id:'M-OBS',narrativeAxis:'ARCHEOLOGUE',reinforcesNarrativeAxis:{axis:'ARCHEOLOGUE',weight:2},souvenir:true,memoryValence:'positive',scoreTrauma:80});
  assert.strictEqual(BF.getMissionObsessionPressure('M-OBS'),0,'completion clears transient obsession pressure');
  assert.strictEqual(BF.getNarrativeAxisScore('ARCHEOLOGUE'),2,'narrative axis persists');
  assert.strictEqual(BF.getPsychologicalMemoryScore({narrativeAxis:'ARCHEOLOGUE'}),80,'completed lived event creates contextual memory');
  const snap=BF.getMultiProgressionState();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(snap.psychology.missionMemories['M-OBS'])), {
    missionId:'M-OBS', acquiredAt:snap.psychology.missionMemories['M-OBS'].acquiredAt, valence:'positive', scoreTrauma:80, narrativeAxis:'ARCHEOLOGUE'
  });
  assert.strictEqual(BF.completeMissionPsychology({id:'M-OBS',narrativeAxis:'ARCHEOLOGUE',reinforcesNarrativeAxis:{axis:'ARCHEOLOGUE',weight:2},souvenir:true,memoryValence:'positive',scoreTrauma:80}),false,'completion effect idempotent');
  assert.strictEqual(BF.getNarrativeAxisScore('ARCHEOLOGUE'),2);
  assert.strictEqual(BF.getPsychologicalMemoryScore({narrativeAxis:'ARCHEOLOGUE'}),80,'idempotent completion must not duplicate memory');

  const reloaded=makeContext(storage);
  load(reloaded,'progression-multisystem.js');
  assert.strictEqual(reloaded.BlueFox3D.getPsychologicalMemoryScore({narrativeAxis:'ARCHEOLOGUE'}),80,'memory survives reload');
}

// Contract validation
{
  const ctx=makeContext();
  load(ctx,'bible-contract-v0-1.js');
  const contract=ctx.BlueFox3D.BibleContractV01;
  const patterns={P:{steps:[]}};
  const base={id:'M',title:'M',pattern:'P',slots:{},trigger:{type:'manual'}};
  assert.strictEqual(contract.validateMission({...base, ponderation:.25, obsessionEligible:true, obsessionIntensity:4, souvenir:true, memoryValence:'positive', scoreTrauma:62, narrativeAxis:'ARCHEOLOGUE', reinforcesNarrativeAxis:{axis:'ARCHEOLOGUE',weight:1}},patterns).ok,true);
  assert.strictEqual(contract.validateMission({...base, ponderation:2},patterns).ok,false);
  assert.strictEqual(contract.validateMission({...base, obsessionIntensity:8},patterns).ok,false);
  assert.strictEqual(contract.validateMission({...base, souvenir:true, scoreTrauma:20},patterns).ok,false);
  assert.strictEqual(contract.validateMission({...base, narrativeAxis:'RESEARCH'},patterns).ok,false,'BAC axis must not masquerade as narrative axis');
}

// BAC mission overlay / mission obsession behaviour
{
  const ctx=makeContext();
  const BF=ctx.BlueFox3D;
  class Planner { nextAction(){ return null; } score(){ return 0; } }
  class Manager {
    constructor(){
      this.primaryMissionId='PRIMARY'; this.defs={}; this.activeMissionIds=[];
      this.bridge={context:()=>({})};
    }
    definition(id){ return this.defs[id] || {}; }
    ensureLifecycle(){ return {status:'active',autoPrimaryEligible:true}; }
    assessMission(id){ const d=this.definition(id); return {missionId:id,score:d.baseScore||100,action:d.action===false?null:{type:'analyze'},reasons:[]}; }
    selectBestPrimary(){ return false; }
  }
  BF.Missions.MissionPlanner=Planner;
  BF.Missions.MissionManager=Manager;
  BF.getNarrativeAxisScore=()=>0;
  let pressures={};
  let memoryScores={};
  BF.getMissionObsessionPressure=(id)=>pressures[id]||0;
  BF.getPsychologicalMemoryScore=({missionId,narrativeAxis})=>memoryScores[missionId] ?? memoryScores[narrativeAxis] ?? 0;
  BF.deferObsessiveMission=(id,intensity)=>{ pressures[id]=(pressures[id]||0)+({1:1.5,2:2.5,3:4,4:6,5:9}[intensity]||1.5); return pressures[id]; };
  BF.getMultiProgressionState=()=>({psychology:{}});
  load(ctx,'behavior-arbitration-core.js');

  const m=new BF.Missions.MissionManager();
  m.defs.PLAIN={baseScore:100,passivePriorityAxis:'research',ponderation:0,obsessionEligible:false};
  m.defs.WEIGHT={baseScore:100,passivePriorityAxis:'research',ponderation:1,obsessionEligible:false};
  const plain=m.assessMission('PLAIN',{});
  const weighted=m.assessMission('WEIGHT',{});
  assert.ok(weighted.score>plain.score,'mission ponderation must affect mission desirability');

  m.defs.POS={baseScore:100,passivePriorityAxis:'research',souvenir:true,memoryValence:'positive',scoreTrauma:80,narrativeAxis:'ARCHEOLOGUE'};
  m.defs.NEG={baseScore:100,passivePriorityAxis:'research',souvenir:true,memoryValence:'negative',scoreTrauma:80,narrativeAxis:'DANGER'};
  assert.strictEqual(m.assessMission('POS',{}).score,plain.score,'declared souvenir must not influence BAC before acquisition');
  assert.strictEqual(m.assessMission('NEG',{}).score,plain.score,'declared negative souvenir must not influence BAC before acquisition');
  memoryScores.ARCHEOLOGUE=80;
  memoryScores.DANGER=-80;
  assert.ok(m.assessMission('POS',{}).score>plain.score,'acquired positive contextual memory must raise BAC score');
  assert.ok(m.assessMission('NEG',{}).score<plain.score,'acquired negative contextual memory must lower BAC score');

  m.defs.OBS={baseScore:100,passivePriorityAxis:'research',obsessionEligible:true,obsessionIntensity:5};
  m.activeMissionIds=['PRIMARY','OBS'];
  const o1=m.assessMission('OBS',{}).score;
  m.selectBestPrimary();
  const o2=m.assessMission('OBS',{}).score;
  assert.ok(o2>o1,'obsessive mission must gain pressure after an arbitration that leaves it secondary');

  m.defs.BLOCKED={baseScore:100,passivePriorityAxis:'research',obsessionEligible:true,obsessionIntensity:5,action:false};
  m.activeMissionIds=['PRIMARY','BLOCKED'];
  m.selectBestPrimary(); m.selectBestPrimary();
  assert.strictEqual(pressures.BLOCKED||0,0,'non-runnable mission must not inflate obsession');

  m.primaryMissionId='OBS';
  m.activeMissionIds=['OBS'];
  const before=pressures.OBS;
  m.selectBestPrimary();
  assert.strictEqual(pressures.OBS,before,'selected primary mission must not keep accumulating deferred pressure');
}

// Rattrapage: mission obsessionnelle finit par dépasser une meilleure candidate
{
  const ctx=makeContext();
  load(ctx,'progression-multisystem.js');
  const BF=ctx.BlueFox3D;
  let now=10000;
  for(let i=0;i<30;i++) BF.deferObsessiveMission('OB5',5,now+=5000);
  const p5=BF.getMissionObsessionPressure('OB5');
  assert.ok(p5>=240,'intensity 5 must reach the bounded catch-up ceiling');
  now=10000;
  for(let i=0;i<30;i++) BF.deferObsessiveMission('OB1',1,now+=5000);
  const p1=BF.getMissionObsessionPressure('OB1');
  assert.ok(p1<p5,'low intensity must grow much more slowly than high intensity');
}


// Runtime transport is present in both compileMission branches.
{
  const source=fs.readFileSync(path.join(ROOT,'engine','bible-runtime-v0-1-unified.js'),'utf8');
  assert.ok(source.includes('const psychology = {'));
  assert.ok((source.match(/\.\.\.psychology,/g)||[]).length>=2,'psychology must be transported by sequence and standard compilers');
  assert.ok(source.includes('BF.completeMissionPsychology?.(mission);'),'completion must hand persistent narrative reinforcement to its owner');
}

console.log('PASS psychology regression');
