const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const vm=require('node:vm'); const path=require('node:path');
const root=path.resolve(__dirname,'..');
const context={}; context.window=context; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'data','custom-micro-scenes-arch-r4.js'),'utf8'),context);
const scenes=Array.from(context.BlueFoxCustomMicroScenes||[]);
const ids=['MSC-CUSTOM-HABITAT-VESTIGE-01','MSC-CUSTOM-HABITAT-VESTIGE-02','MSC-CUSTOM-HABITAT-VESTIGE-03','MSC-CUSTOM-HABITAT-VESTIGE-04'];

test('ARCH-29: quatre MSC composites de données sont définies comme unités uniques',()=>{
  assert.deepEqual(scenes.map(s=>s.id),ids);
  assert.deepEqual(scenes.map(s=>s.objects.length),[21,32,20,33]);
  scenes.forEach(s=>{ assert.equal(s.composition.kind,'habitation-vestige'); assert.equal(s.composition.sources.length,2); assert.ok(s.radius>10); });
});

test('ARCH-29: les assets MSC correspondent exactement aux scènes runtime',()=>{
  ids.forEach(id=>{
    const asset=JSON.parse(fs.readFileSync(path.join(root,'assets','MSC_saves',`${id}.json`),'utf8'));
    const runtime=scenes.find(s=>s.id===id);
    assert.deepEqual(JSON.parse(JSON.stringify(runtime)),asset);
  });
});

test('ARCH-29: chargement des composites avant MicroScenes',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const extension=html.indexOf('./data/custom-micro-scenes-arch-r4.js');
  const microScenes=html.indexOf('./engine/micro-scenes.js');
  assert.ok(extension>0); assert.ok(microScenes>extension);
  assert.equal((html.match(/custom-micro-scenes-arch-r4\.js/g)||[]).length,1);
});
