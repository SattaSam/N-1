const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ROOT=path.join(__dirname,'..');
function run(file,ctx){vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});}

// Scout OBJECT_SEEN remains historical but is not fanned out to ordinary Bible missions.
{
  class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
  const window={console,Date,Math,JSON,Set,Map,WeakMap,Promise,CustomEvent:CE,queueMicrotask:fn=>fn(),setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},BlueFox3D:{Missions:{},BiblePatterns:{},ObjectEvents:{types:{OBJECT_SEEN:'OBJECT_SEEN',DRONE_ACTIVATED:'DRONE_ACTIVATED'}}}};
  window.window=window; const ctx=vm.createContext(window); run(path.join(ROOT,'data/bible-catalog.js'),ctx);
  let src=fs.readFileSync(path.join(ROOT,'engine/bible-runtime-v0-1-unified.js'),'utf8').replace(/\n\s*runtime\.start\(\);\s*\n\}\)\(window\);\s*$/,'\n})(window);');
  vm.runInContext(src,ctx,{filename:'bible-runtime-v0-1-unified.js'});
  const rt=new window.BlueFox3D.BibleRuntimeV01();
  let history=0,fanout=0,ene=0;
  rt.recordObservation=()=>{history+=1;};
  rt.consumeTriggerEvent=()=>{fanout+=1;return{matched:0,activatedMissionId:null};};
  rt.handleEnergyMissionObjectEvent=()=>{ene+=1;return true;};
  rt.onObjectEvent({type:'OBJECT_SEEN',detail:{interactionSource:'drone'},tags:['drone-scouted'],mapId:'x'});
  assert.equal(ene,1); assert.equal(history,1); assert.equal(fanout,0);
}

// Static owner invariants.
{
 const special=fs.readFileSync(path.join(ROOT,'engine/special-object-runtime.js'),'utf8');
 assert(special.includes('object.userData?.specialRuntimeRoot && SPECIAL_TYPES.has(type)'),'special runtime root guard must remain');
 assert(special.includes('scout_drone: Object.freeze({ accumulator: 1, core: 2, parts: 10'));
 assert(special.includes('harvest_drone: Object.freeze({ accumulator: 1, core: 2, parts: 15'));
 assert(special.includes('magnetic_ore: 30, stellar_iridium: 6'));
 assert(special.includes('contextRole || record?.kind || "") === "deployed_beacon"'));
 assert(special.includes('PersistentMicroScenes?.ensure?.(definition, record)'));
 const catalog=fs.readFileSync(path.join(ROOT,'data/bible-catalog.js'),'utf8');
 assert(catalog.includes('id: "deployed-beacon-v1"'));
 assert(catalog.includes('Object.freeze({ inventoryKey: "core", quantity: 1 })'));
 assert(catalog.includes('Object.freeze({ inventoryKey: "accumulator", quantity: 1 })'));
 const msc=fs.readFileSync(path.join(ROOT,'engine/micro-scenes.js'),'utf8');
 assert(msc.includes('MSC-DEPLOYED-BEACON-001'));
 const ui=fs.readFileSync(path.join(ROOT,'engine/ui-enhancements.js'),'utf8');
 assert(ui.includes('detail.kind === "deployed_beacon"'));
 assert(ui.includes('Positionnement de la balise'));
 assert(ui.includes('bluefox:special-objects-changed'));
}
console.log('PASS R2 drone/beacon mission-filter invariants');
