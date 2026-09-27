const fs=require('fs');const vm=require('vm');const path=require('path');const assert=require('assert');
const candPath=path.resolve(__dirname,'../data/bible-catalog.js');
const basePath=process.argv[2]?path.resolve(process.argv[2]):path.resolve('/mnt/data/rtpa/BASE/data/bible-catalog.js');
function load(p){const w={BlueFox3D:{}};w.window=w;vm.runInNewContext(fs.readFileSync(p,'utf8'),{window:w,console});return w.BlueFox3D.BibleCatalog;}
const base=load(basePath),cand=load(candPath),added=new Set(['POSTDIP-01','TP-01','TP-02','TP-03','TP-04','TP-05','TP-06','TP-07','TP-08','TP-09']);
assert.equal(base.length,290,'BASE HEAD 73360203 doit contenir 290 missions');assert.equal(cand.length,300);
const baseMap=new Map(base.map(x=>[x.id,x]));const stripped=cand.filter(x=>!added.has(x.id));assert.equal(stripped.length,base.length);
for(let i=0;i<base.length;i++){assert.equal(stripped[i].id,base[i].id,`ordre changé à ${i}`);assert.deepStrictEqual(JSON.parse(JSON.stringify(stripped[i])),JSON.parse(JSON.stringify(base[i])),`mission HEAD modifiée: ${base[i].id}`);}
for(const id of ['PHEN-01','PHEN-11','PROS-01','PROS-03','PROS-02','CART-02','CART-01','CART-03','ENE-15-A','ENE-15-B','ENE-15-C','BAL-03','DRN-01','DIP-03'])assert(baseMap.has(id),`${id} absent de BASE`);
console.log('PASS R-TP-A non-regression 290/290 missions HEAD identiques');
