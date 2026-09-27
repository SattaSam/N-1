const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const vm=require('node:vm'); const path=require('node:path');
const root=path.resolve(__dirname,'..');
const context={console:{info(){},warn(){},error(){}},setTimeout,clearTimeout,setInterval,clearInterval,performance,Date,Math,localStorage:{getItem(){return null},setItem(){},removeItem(){}},addEventListener(){},removeEventListener(){},dispatchEvent(){}}; context.window=context; vm.createContext(context);
const load=p=>vm.runInContext(fs.readFileSync(p,'utf8'),context,{filename:p});
load(path.join(root,'data','bible-patterns.js')); load(path.join(root,'data','bible-catalog.js')); context.BlueFox3D.Missions={normalizeActionType:v=>v}; load(path.join(root,'engine','bible-runtime-v0-1-unified.js'));
const BF=context.BlueFox3D, byId=id=>BF.BibleCatalog.find(m=>m.id===id), compile=id=>{const c=BF.bibleRuntime.compileMission(byId(id)); assert.ok(c,`${id} compile failed`); return c;};

test('ARCH-R3: 13→18 compilent via BibleRuntime exact',()=>{['ARCH-13','ARCH-14','ARCH-15','ARCH-16','ARCH-17','ARCH-18'].forEach(id=>assert.ok(compile(id)));});

test('ARCH-16: les 4 nœuds sont parallèles et le cumul 18 conserve son filtre',()=>{
 const c=compile('ARCH-16'); assert.equal(c.root.children.length,4);
 const [a,s,r,t]=c.root.children;
 assert.deepEqual(Array.from([a.params.cuoType,s.params.cuoType,r.params.cuoType]),['arch','stele','tech_relic']);
 [a,s,r,t].forEach(n=>assert.equal(n.requires.length,0));
 assert.equal(t.target,18); assert.deepEqual(Array.from(t.params.cuoTypes),['arch','stele','tech_relic']); assert.equal(t.params.tagsAny,undefined); assert.equal(t.params.distinctBy,'instanceId');
});

test('ARCH-17/18: compilation conserve les MSC et cibles physiques',()=>{
 const c17=compile('ARCH-17');
 assert.equal(c17.root.children.find(n=>n.id.endsWith(':relicObserve')).params.cuoType,'tech_relic');
 assert.equal(c17.root.children.find(n=>n.id.endsWith(':relicAnalyze')).type,'analyze');
 const c18=compile('ARCH-18');
 assert.equal(c18.root.children[0].params.cuoType,'tech_relic'); assert.equal(c18.root.children[1].params.cuoType,'stele'); assert.equal(c18.root.children[1].target,2);
});
