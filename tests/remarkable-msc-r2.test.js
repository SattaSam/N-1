const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..', 'CANDIDAT');
const IDS = [
  'MSC-CUSTOM-FLUORCHI','MSC-CUSTOM-FLOATING-SPHERES','MSC-CUSTOM-MAGNETIC-FLOATING-ISLAND',
  'MSC-CUSTOM-BLUE-CORE-ROCK','MSC-CUSTOM-HIGH-GATE','MSC-CUSTOM-CURIOUS-ROCK',
  'MSC-CUSTOM-MACHINA','MSC-CUSTOM-CARN-RUIN','MSC-CUSTOM-ORCHI-ROCK','MSC-CUSTOM-ORCHI-RUIN',
  'MSC-CUSTOM-MOVING-ROCKS','MSC-CUSTOM-RELIC-RUIN'
];

test('R2 contient exactement les 12 nouvelles MSC et reste idempotent', () => {
  const context = { window:null, console, Math, Object, Array, Set, Map, String, Number };
  context.window=context;
  vm.createContext(context);
  const src=fs.readFileSync(path.join(ROOT,'data/custom-micro-scenes-remarkable-r2.js'),'utf8');
  vm.runInContext(src,context);
  vm.runInContext(src,context);
  const ids=context.BlueFoxCustomMicroScenes.map(x=>x.id);
  assert.equal(ids.length,12);
  assert.deepEqual(new Set(ids),new Set(IDS));
});

test('les 12 JSON sources concordent avec le registre R2', () => {
  for(const id of IDS){
    const p=path.join(ROOT,'assets','MSC_saves',`${id}.json`);
    const obj=JSON.parse(fs.readFileSync(p,'utf8'));
    assert.equal(obj.id,id);
    assert.equal(obj.rarity,'custom');
    assert.ok(Array.isArray(obj.objects) && obj.objects.length>0);
  }
});

test('R2 est chargé après R1 mais avant MicroScenes', () => {
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const r1=html.indexOf('./data/custom-micro-scenes-remarkable-r1.js');
  const r2=html.indexOf('./data/custom-micro-scenes-remarkable-r2.js');
  const runtime=html.indexOf('./engine/micro-scenes.js');
  assert.ok(r1>=0 && r2>r1 && runtime>r2);
});
