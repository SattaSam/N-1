const fs=require('fs'), path=require('path'), vm=require('vm'), assert=require('assert');
const ROOT=path.join(__dirname,'..');
const storage=new Map();
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
const window={console,Date,Math,JSON,CustomEvent:CE,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},BlueFox3D:{}};
window.window=window;
const ctx=vm.createContext(window);
for(const p of ['engine/object-event-registry.js','engine/progression-registry.js']) vm.runInContext(fs.readFileSync(path.join(ROOT,p),'utf8'),ctx,{filename:p});
const BF=window.BlueFox3D;
BF.progression.start?.();
BF.ObjectEvents.emit(BF.ObjectEvents.types.OBJECT_SEEN,null,{mapId:'map-test',interactionSource:'drone',tags:['drone-scouted'],quantity:1});
const state=BF.getProgressionState();
assert.equal(state.counters.global.OBJECT_SEEN,1);
assert.equal(BF.ObjectEvents.history()[0].detail.interactionSource,'drone');
assert(BF.ObjectEvents.history()[0].tags.includes('drone-scouted'));
console.log('PASS drone OBJECT_SEEN remains canonical historical observation');
