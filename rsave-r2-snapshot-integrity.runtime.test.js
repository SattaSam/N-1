const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const SAVE_FILE = process.env.SAVE_FILE;
if (!SAVE_FILE) throw new Error('SAVE_FILE required');

class Storage {
  constructor(initial={}) { this.map = new Map(Object.entries(initial).map(([k,v]) => [k, String(v)])); }
  get length(){ return this.map.size; }
  key(i){ return [...this.map.keys()][i] ?? null; }
  getItem(k){ return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k,v){ this.map.set(k, String(v)); }
  removeItem(k){ this.map.delete(k); }
}
class Element {
  constructor(){ this.children=[]; this.dataset={}; this.style={}; this.classList={add(){},remove(){},toggle(){}}; this.isConnected=true; }
  append(...v){ this.children.push(...v); } replaceChildren(...v){ this.children=[...v]; } remove(){ this.isConnected=false; }
  setAttribute(){} addEventListener(){} querySelector(){ return null; } querySelectorAll(){ return []; } matches(){ return false; }
}

function validMission(id='MISSION-A') {
  return JSON.stringify({
    version: 3, primaryMissionId: id, activeMissionId: id, activeMissionIds: [id],
    missionLifecycle: { [id]: { status:'active' } }, missions: { [id]: { id } }, facts: {}
  });
}
function snapshot(savedAt, state, slot='1') {
  return { format:'bluefox-save-file', schemaVersion:1, gameVersion:'test', slot:String(slot), savedAt, originAtSave:'http://test', state };
}

function fixture({ withEngine=true, initialStorage={}, initialFiles={} }={}) {
  const storage = new Storage({ bluefox_new_game_start_v1: String(Date.now()-60000), ...initialStorage });
  const fileSlots = new Map(Object.entries(initialFiles));
  const listeners = new Map();
  let reloads = 0;
  let posts = 0;
  const response = (status, value=null) => ({ ok:status>=200&&status<300, status, async json(){return value;}, async text(){return value==null?'':JSON.stringify(value);} });
  const fetch = async (url, options={}) => {
    const method=String(options.method||'GET').toUpperCase();
    const slot=decodeURIComponent(String(url).split('/').pop());
    if (method==='GET') return fileSlots.has(slot) ? response(200,fileSlots.get(slot)) : response(404,null);
    if (method==='POST') { posts += 1; const body=JSON.parse(options.body||'null'); fileSlots.set(slot,body); return response(200,body); }
    if (method==='DELETE') { fileSlots.delete(slot); return response(204,null); }
    return response(405,null);
  };
  const document = {
    hidden:false, documentElement:new Element(), body:new Element(),
    createElement:()=>new Element(), querySelector(sel){ return sel==='meta[name="description"]'?{content:'BlueFox Odyssey test'}:null; },
    querySelectorAll(){return[];}, getElementById(){return null;}, addEventListener(){}
  };
  const BF = {};
  if (withEngine) {
    BF.currentEngine = {
      savePosition(){}, saveDiscovery(){}, saveZoneDiscovery(){},
      missionManager:{ memory:{ flush(){ return true; } } }
    };
  }
  const addListener = (type, fn) => { const set=listeners.get(type)||new Set(); set.add(fn); listeners.set(type,set); };
  const dispatch = async (type) => { for (const fn of listeners.get(type)||[]) await fn({type}); };
  const window = {
    window:null, BlueFox3D:BF, localStorage:storage, document, fetch, console, Intl, Date, JSON,
    location:{ origin:'http://test', reload(){ reloads += 1; } },
    CustomEvent: class { constructor(type,init={}){this.type=type;this.detail=init.detail;} },
    MutationObserver: class { observe(){} disconnect(){} },
    addEventListener(type,fn){ addListener(type,fn); }, removeEventListener(){}, dispatchEvent(){return true;},
    requestAnimationFrame(fn){ fn(); return 1; },
    setTimeout(){ return 1; }, clearTimeout(){}, setInterval(){ return 1; }, clearInterval(){}
  };
  window.window=window;
  const context=vm.createContext(window);
  vm.runInContext(fs.readFileSync(SAVE_FILE,'utf8'),context,{filename:SAVE_FILE});
  return { BF, storage, fileSlots, dispatch, get reloads(){return reloads;}, get posts(){return posts;} };
}

test('R-SAVE R2: an incomplete snapshot can never erase an existing MissionMemory', async () => {
  const f=fixture();
  await new Promise(resolve=>setImmediate(resolve));
  const original=validMission('MISSION-A');
  f.storage.setItem('bluefox_mission_memory_m0_v1', original);
  f.fileSlots.set('1', snapshot(Date.now(), { bluefox_world_position_v2: JSON.stringify({map:'B'}) }));
  const ok=await f.BF.loadGame(1);
  assert.equal(ok,false);
  assert.equal(f.reloads,0);
  assert.equal(f.storage.getItem('bluefox_mission_memory_m0_v1'), original);
});

test('R-SAVE R2: save is refused before a valid v3 MissionMemory exists', async () => {
  const f=fixture({withEngine:false});
  await new Promise(resolve=>setImmediate(resolve));
  const before=f.posts;
  const ok=await f.BF.createManualSave(1);
  assert.equal(ok,false);
  assert.equal(f.posts,before);
  assert.match(f.BF.getSaveDiagnostics().lastError,/mission/i);
});

test('R-SAVE R2: a complete snapshot still replaces the active mission state exactly', async () => {
  const f=fixture();
  await new Promise(resolve=>setImmediate(resolve));
  f.storage.setItem('bluefox_mission_memory_m0_v1', validMission('MISSION-A'));
  const incoming=validMission('MISSION-B');
  f.fileSlots.set('1', snapshot(Date.now(), {
    bluefox_mission_memory_m0_v1: incoming,
    bluefox_world_position_v2: JSON.stringify({map:'B',x:1,z:2})
  }));
  const ok=await f.BF.loadGame(1);
  assert.equal(ok,true);
  assert.equal(f.reloads,1);
  assert.equal(f.storage.getItem('bluefox_mission_memory_m0_v1'), incoming);
});


test('R-SAVE R2 non-regression: unload after a committed load cannot rewrite the restored MissionMemory', async () => {
  const f=fixture();
  await new Promise(resolve=>setImmediate(resolve));
  f.storage.setItem('bluefox_mission_memory_m0_v1', validMission('MISSION-A'));
  const incoming=validMission('MISSION-B');
  f.fileSlots.set('1', snapshot(Date.now()-1000, {
    bluefox_mission_memory_m0_v1: incoming,
    bluefox_world_position_v2: JSON.stringify({map:'B'})
  }));
  assert.equal(await f.BF.loadGame(1), true);
  await f.dispatch('pagehide');
  await f.dispatch('beforeunload');
  assert.equal(f.storage.getItem('bluefox_mission_memory_m0_v1'), incoming);
});

test('R-SAVE R2: bootstrap never auto-applies a newer incomplete file snapshot', async () => {
  const original=validMission('MISSION-A');
  const incomplete=snapshot(Date.now()+1000, { bluefox_world_position_v2: JSON.stringify({map:'B'}) }, '1');
  const f=fixture({
    initialStorage:{
      bluefox_mission_memory_m0_v1: original,
      bluefox_active_save_slot_v1: '1',
      bluefox_active_state_restored_at_v1: '0'
    },
    initialFiles:{ '1': incomplete }
  });
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.reloads,0);
  assert.equal(f.storage.getItem('bluefox_mission_memory_m0_v1'), original);
});

test('R-SAVE R2: an incomplete file snapshot falls back to a complete local snapshot', async () => {
  const f=fixture();
  await new Promise(resolve=>setImmediate(resolve));
  f.storage.setItem('bluefox_mission_memory_m0_v1', validMission('MISSION-LIVE'));
  const localMission=validMission('MISSION-LOCAL');
  const local=snapshot(Date.now()-2000, {
    bluefox_mission_memory_m0_v1: localMission,
    bluefox_world_position_v2: JSON.stringify({map:'LOCAL'})
  });
  f.storage.setItem('bluefox_save_slot_1_v1', JSON.stringify(local));
  f.fileSlots.set('1', snapshot(Date.now()-1000, {
    bluefox_world_position_v2: JSON.stringify({map:'INCOMPLETE'})
  }));
  assert.equal(await f.BF.loadGame(1), true);
  assert.equal(f.storage.getItem('bluefox_mission_memory_m0_v1'), localMission);
});

test('R-SAVE R2 non-regression: a normal manual save with valid MissionMemory still succeeds', async () => {
  const f=fixture();
  await new Promise(resolve=>setImmediate(resolve));
  f.storage.setItem('bluefox_mission_memory_m0_v1', validMission('MISSION-A'));
  assert.equal(await f.BF.createManualSave(1), true);
  const stored=f.fileSlots.get('1');
  assert.ok(stored);
  assert.equal(JSON.parse(stored.state.bluefox_mission_memory_m0_v1).primaryMissionId, 'MISSION-A');
});
