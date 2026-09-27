const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const BASE=path.resolve(ROOT,'../base');
function validate(catalogPath){
  const window={BlueFox3D:{}};window.window=window;
  const context=vm.createContext({window,Object,Array,Set,Map,JSON,console:{info(){},warn(){},error(){}}});
  vm.runInContext(fs.readFileSync(path.join(ROOT,'data/bible-patterns.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(catalogPath,'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/bible-contract-v0-1.js'),'utf8'),context);
  const BF=window.BlueFox3D;
  return BF.BibleContractV01.validateCatalog(BF.BibleCatalog,BF.BiblePatterns,{compatibility:'strict'});
}
test('le candidat n ajoute aucune erreur au contrat strict du HEAD',()=>{
  const base=validate(path.join(BASE,'data/bible-catalog.js'));
  const candidate=validate(path.join(ROOT,'data/bible-catalog.js'));
  assert.deepEqual(Array.from(candidate.errors||[]),Array.from(base.errors||[]));
  assert.deepEqual(Array.from(candidate.warnings||[]),Array.from(base.warnings||[]));
});
