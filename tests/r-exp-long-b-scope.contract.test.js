const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const w={BlueFox3D:{}};w.window=w;
vm.runInNewContext(fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8'),{window:w,console});
const by=new Map(w.BlueFox3D.BibleCatalog.map(m=>[m.id,m]));
for(const id of ['BAL-03','ARCH-31','ARCH-32','ARCH-37','ARCH-39','ARCH-40','EXP-01']){
  assert(by.has(id),`${id} absente`);
  assert.notEqual(by.get(id)?.navigation?.autonomousKnownReturn,true,`${id} ne doit pas recevoir autonomousKnownReturn dans EXP-LONG B`);
}
for(const id of ['EXP-LONG-01','EXP-LONG-03','EXP-LONG-05']){
  assert.equal(by.get(id)?.navigation?.autonomousKnownReturn,true,`${id} doit autoriser la cible connue`);
}
console.log('PASS EXP-LONG scope: no autonomousKnownReturn leakage into 7 historical missions');
