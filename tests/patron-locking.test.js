
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");

function baseWindow() {
  const listeners = new Map();
  const storage = new Map();
  class CustomEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
  }
  return {
    CustomEvent,
    localStorage: {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k,v) => storage.set(k,String(v)),
      removeItem: (k) => storage.delete(k)
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type,new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    dispatchEvent(event) {
      for (const fn of [...(listeners.get(event.type)||[])]) fn(event);
      return true;
    },
    setTimeout, clearTimeout
  };
}

function runtimeFixture() {
  const window = baseWindow();
  const MissionStatus = { LOCKED:"locked", AVAILABLE:"available", ACTIVE:"active", COMPLETED:"completed", FAILED:"failed", PAUSED:"paused" };
  class Node {
    constructor(def) {
      Object.assign(this, def);
      this.progress = def.progress || 0;
      this.status = def.status || "available";
      this.params = def.params || {};
      this.children = (def.children||[]).map(x=>new Node(x));
      this.distinctValues = [];
    }
    get isComplete(){ return this.status==="completed"; }
    get isLeaf(){ return !this.children.length; }
    increment(n=1){ if(this.isComplete) return false; this.progress=Math.min(this.target,this.progress+n); if(this.progress>=this.target)this.status="completed"; return true; }
    incrementDistinct(v,n=1){ if(this.distinctValues.includes(v))return false;this.distinctValues.push(v);return this.increment(n); }
  }
  const definitions = {};
  window.BlueFox3D = {
    BiblePatterns: {
      COLLECT_THEN_REWARD: { autonomyAxis:"survival", steps:[{slot:"collect",action:"collect"}] },
      OBSERVE_TARGET: { autonomyAxis:"research", steps:[{slot:"study",action:"observe"}] }
    },
    BibleCatalog: [],
    BibleContractV01: { validateCatalog(){ return {ok:true,errors:[],warnings:[]}; } },
    Missions: {
      MissionStatus,
      MissionManager: function(){},
      getDefinition(id){return definitions[id]||null;}
    },
    registerMissionDefinitions(list){ for(const d of list)definitions[d.id]=d; return list.length; },
    getMissionState(){ return {missions:[]}; }
  };
  window.BlueFox3D.Missions.MissionManager.prototype = {};
  const context = vm.createContext({window,console,CustomEvent:window.CustomEvent,performance,setTimeout,clearTimeout});
  vm.runInContext(fs.readFileSync("engine/bible-runtime-v0-1-unified.js","utf8"),context);
  return window;
}

test("completionGate legacy behavior remains valid without mapId/siteId",()=>{
  const w=runtimeFixture(), rt=w.BlueFox3D.bibleRuntime;
  w.BlueFox3D.currentEngine={
    currentMapId:"crystal",
    character:{root:{position:{x:0,z:0}}},
    THREE:{Vector3:class{}}
  };
  rt.shelterObjects=()=>[{kind:"camp",position:{x:2,z:0}}];
  const m={id:"M",completionGate:{type:"proximity.shelter",shelterKinds:["camp"],radius:8}};
  rt.byId.set("M",m);
  assert.equal(rt.gateSatisfied(m),true);
});

test("completionGate can require Crystal and base only",()=>{
  const w=runtimeFixture(), rt=w.BlueFox3D.bibleRuntime;
  w.BlueFox3D.currentEngine={
    currentMapId:"crystal",
    character:{root:{position:{x:0,z:0}}},
    THREE:{Vector3:class{}}
  };
  rt.shelterObjects=()=>[
    {kind:"refuge",position:{x:1,z:0}},
    {kind:"base",position:{x:4,z:0}}
  ];
  const m={id:"M2",completionGate:{type:"proximity.shelter",shelterKinds:["base"],mapId:"crystal",radius:8}};
  rt.byId.set("M2",m);
  assert.equal(rt.gateSatisfied(m),true);
  w.BlueFox3D.currentEngine.currentMapId="other";
  delete rt.state.gatesSatisfied.M2;
  assert.equal(rt.gateSatisfied(m),false);
});

test("completionGate can require an exact established site",()=>{
  const w=runtimeFixture(), rt=w.BlueFox3D.bibleRuntime;
  w.BlueFox3D.currentEngine={
    currentMapId:"crystal",
    character:{root:{position:{x:0,z:0}}},
    THREE:{Vector3:class{}}
  };
  rt.shelterObjects=()=>[
    {kind:"base",object:{userData:{establishedSite:"crystal:base:primary"},getWorldPosition(){return {x:3,z:0};}}}
  ];
  const m={id:"M3",completionGate:{type:"proximity.shelter",shelterKinds:["base"],siteId:"crystal:base:primary",radius:8}};
  rt.byId.set("M3",m);
  assert.equal(rt.gateSatisfied(m),true);
});
