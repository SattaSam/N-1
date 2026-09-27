const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class CustomEvent { constructor(type, init={}) { this.type=type; this.detail=init.detail; } }
const window = {
  BlueFox3D: { Missions: {} },
  addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; },
  localStorage: { getItem(){return null}, setItem(){}, removeItem(){} },
  CustomEvent
};
const M = window.BlueFox3D.Missions;
M.MissionMemory = class {};
M.MissionPlanner = class {};
M.ActionBridge = class {};
M.definitions = {};
M.getDefinition = id => M.definitions[id] || null;
const context = vm.createContext({ window, CustomEvent, console, performance, setTimeout, clearTimeout, queueMicrotask });
vm.runInContext(fs.readFileSync('engine/mission-manager.js','utf8'), context, {filename:'mission-manager.js'});
const Manager = M.MissionManager;

function makeManager() {
  let publishes = 0;
  let saves = 0;
  const m = Object.create(Manager.prototype);
  M.definitions = {
    PRE1: { id:'PRE1' }, PRE2: { id:'PRE2' }, TARGET: { id:'TARGET' }
  };
  m.memory = {
    state: {
      pendingActivations: {},
      missionLifecycle: {
        PRE1: { status:'active' },
        PRE2: { status:'active' }
      }
    },
    save(){ saves += 1; }
  };
  m.definition = id => M.definitions[id] || null;
  m.ensureLifecycle = function(id, status='available') {
    if (!this.memory.state.missionLifecycle[id]) {
      this.memory.state.missionLifecycle[id] = { status };
    }
    return this.memory.state.missionLifecycle[id];
  };
  m.publish = () => { publishes += 1; };
  return { m, counts:()=>({publishes,saves}) };
}

{
  const {m,counts}=makeManager();
  const opts={primary:false, prerequisites:['PRE1','PRE2'], urgency:2, source:'bible-runtime'};
  assert.equal(m.startMission('TARGET',opts),true);
  const first=m.memory.state.pendingActivations.TARGET;
  const firstRequestedAt=first.requestedAt;
  assert.deepEqual(m.ensureLifecycle('TARGET').waitingFor,['PRE1','PRE2']);
  assert.deepEqual(counts(),{publishes:1,saves:1});

  assert.equal(m.startMission('TARGET',opts),true);
  assert.equal(m.memory.state.pendingActivations.TARGET.requestedAt,firstRequestedAt,'identical pending keeps original request ordering');
  assert.deepEqual(counts(),{publishes:1,saves:1},'identical pending must not save or publish again');
}

{
  const {m,counts}=makeManager();
  const opts={primary:false, prerequisites:['PRE1','PRE2'], urgency:2, source:'bible-runtime'};
  m.startMission('TARGET',opts);
  m.memory.state.missionLifecycle.PRE1.status='completed';
  assert.equal(m.startMission('TARGET',opts),true);
  assert.deepEqual(m.ensureLifecycle('TARGET').waitingFor,['PRE2']);
  assert.deepEqual(counts(),{publishes:2,saves:2},'changed waitingFor is observable and must publish');
}

{
  const {m,counts}=makeManager();
  m.startMission('TARGET',{primary:false, prerequisites:['PRE1'], urgency:2, source:'bible-runtime'});
  assert.equal(m.startMission('TARGET',{primary:false, prerequisites:['PRE1'], urgency:5, source:'bible-runtime'}),true);
  assert.equal(m.memory.state.pendingActivations.TARGET.options.urgency,5);
  assert.deepEqual(counts(),{publishes:2,saves:2},'changed pending options must still publish');
}

console.log('PASS 2C: identical pending activation is idempotent; real changes still publish');
