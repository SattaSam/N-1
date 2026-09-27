const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness(root, { lifecycle, unlocks = {}, managerAtBoot = true } = {}) {
  const listeners = new Map();
  const timers = [];
  class CustomEventStub { constructor(type, init={}) { this.type=type; this.detail=init.detail; } }
  const memory = {
    state: { missionLifecycle: structuredClone(lifecycle), researchUnlocks: structuredClone(unlocks) },
    saveCalls: 0,
    save(){ this.saveCalls++; }, getFact(){return null;}, setFact(){}, recordEffectReceipt(){}
  };
  const w = {
    BlueFox3D:{}, CustomEvent:CustomEventStub,
    localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    addEventListener(t,f){ const a=listeners.get(t)||[]; a.push(f); listeners.set(t,a); },
    removeEventListener(t,f){ listeners.set(t,(listeners.get(t)||[]).filter(x=>x!==f)); },
    dispatchEvent(e){ for(const f of [...(listeners.get(e.type)||[])]) f(e); return true; },
    setTimeout(cb,d=0){timers.push({cb,d});return timers.length;}, clearTimeout(){}, setInterval(){return 1;}, clearInterval(){},
    queueMicrotask(cb){cb();}, performance:{now:()=>0}, console
  };
  w.window=w; w.globalThis=w;
  const ctx=vm.createContext(w);
  vm.runInContext(fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8'),ctx);
  w.BlueFox3D.BibleContractV01={validateCatalog(){return {ok:true,errors:[],warnings:[]};}};
  w.BlueFox3D.BiblePatterns=new Proxy({}, {get(){return {};}});
  w.BlueFox3D.registerMissionDefinitions=()=>1;
  if (managerAtBoot) w.BlueFox3D.currentEngine={currentMapId:'crystal',missionManager:{memory}};
  vm.runInContext(fs.readFileSync(path.join(root,'engine/bible-runtime-v0-1-unified.js'),'utf8'),ctx);
  return {w,memory,timers};
}

function run(root){
  // Guard: active missions must never be restored as acquired research.
  {
    const h=harness(root,{lifecycle:{T03:{status:'active'},T11:{status:'active'}},managerAtBoot:false});
    h.w.BlueFox3D.currentEngine={currentMapId:'crystal',missionManager:{memory:h.memory}};
    for(const t of h.timers) t.cb();
    assert.equal(h.memory.state.researchUnlocks['camp-establish-v1'],undefined);
    assert.equal(h.memory.state.researchUnlocks['ration-basic-v2'],undefined);
  }

  // Existing unlocks must stay unchanged and not duplicate saves.
  {
    const existing={
      'camp-establish-v1':{id:'camp-establish-v1',type:'research.blueprint',missionId:'T03',rewardIndex:0,unlockedAt:1},
      'ration-basic-v2':{id:'ration-basic-v2',type:'research.recipe',missionId:'T11',rewardIndex:0,unlockedAt:1}
    };
    const h=harness(root,{lifecycle:{T03:{status:'completed'},T11:{status:'completed'}},unlocks:existing,managerAtBoot:false});
    h.w.BlueFox3D.currentEngine={currentMapId:'crystal',missionManager:{memory:h.memory}};
    for(const t of h.timers) t.cb();
    assert.equal(h.memory.saveCalls,0);
    assert.equal(Object.keys(h.memory.state.researchUnlocks).length,2);
  }

  // Normal runtime completion remains event-driven and immediate.
  {
    const h=harness(root,{lifecycle:{T03:{status:'active'},T11:{status:'active'}},managerAtBoot:true});
    const BF=h.w.BlueFox3D;
    // Prevent unrelated completion side effects from affecting the assertion.
    BF.bibleRuntime.state.effectsApplied.T03=1;
    BF.bibleRuntime.state.effectsApplied.T11=1;
    h.memory.state.missionLifecycle.T03.status='completed';
    h.memory.state.missionLifecycle.T11.status='completed';
    h.w.dispatchEvent(new h.w.CustomEvent('bluefox:mission-state',{detail:{missions:[],catalog:[]}}));
    assert.ok(h.memory.state.researchUnlocks['camp-establish-v1']);
    assert.ok(h.memory.state.researchUnlocks['ration-basic-v2']);
    const visible=Array.from(BF.Research.list({unlockedOnly:true})).map(x=>x.id);
    assert.ok(visible.includes('camp-establish-v1'));
    assert.ok(visible.includes('ration-basic-v2'));
  }
  console.log('PASS research non-regression');
}
run(path.resolve(__dirname, '..'));
