const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const vm=require('node:vm'); const path=require('node:path');
const root=path.resolve(__dirname,'..'); const context={console:{info(){},warn(){},error(){}}}; context.window=context; vm.createContext(context);
for(const rel of ['data/bible-patterns.js','data/bible-catalog.js','engine/bible-contract-v0-1.js']) vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),context,{filename:rel});
const BF=context.BlueFox3D;
test('ARCH-R3: les six nouvelles missions respectent le contrat V0.1 strict',()=>{
 for(const id of ['ARCH-13','ARCH-14','ARCH-15','ARCH-16','ARCH-17','ARCH-18']){
   const mission=BF.BibleCatalog.find(m=>m.id===id); assert.ok(mission,`${id} absent`);
   const report=BF.BibleContractV01.validateMission(mission,BF.BiblePatterns,{compatibility:'strict'});
   assert.equal(report.ok,true,`${id}: ${report.errors.join(' | ')}`);
 }
});
