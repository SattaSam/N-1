const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const BF={Missions:{ActionType:{},MissionStatus:{}},currentEngine:null};
const window={BlueFox3D:BF,localStorage:{getItem(){return null},setItem(){},removeItem(){}},addEventListener(){},removeEventListener(){},dispatchEvent(){},setTimeout(){return 1},clearTimeout(){},queueMicrotask(){}};
const context=vm.createContext({window,console:{info(){},warn(){},error(){}},performance:{now:()=>0},Date,Set,Map,WeakMap,CustomEvent:function(){},Math,Object,Array,JSON,Promise});
for(const rel of ['data/bible-patterns.js','data/bible-catalog.js']) vm.runInContext(fs.readFileSync(path.join(ROOT,rel),'utf8'),context);
let src=fs.readFileSync(path.join(ROOT,'engine/bible-runtime-v0-1-unified.js'),'utf8').replace(/\n\s*runtime\.start\(\);\n\}\)\(window\);\s*$/,'\n})(window);');
vm.runInContext(src,context);
test('le compilateur transporte le prérequis expérimental vers MissionManager',()=>{
  const runtime=new BF.BibleRuntimeV01();
  const mission=BF.BibleCatalog.find(m=>m.id==='DRN-01');
  const compiled=runtime.compileMission(mission);
  assert.deepEqual(Array.from(compiled.experimentalPrerequisites),['reverse_engineering']);
});
