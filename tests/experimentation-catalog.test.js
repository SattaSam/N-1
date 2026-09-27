const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
function loadCatalog(){
  const window={BlueFox3D:{}};
  vm.runInContext(fs.readFileSync(path.join(ROOT,'data/bible-catalog.js'),'utf8'),vm.createContext({window,Object}));
  return window.BlueFox3D;
}
test('5 axes scientifiques x 5 étapes, camp puis établi',()=>{
  const BF=loadCatalog();
  assert.equal(BF.BibleExperiments.length,5);
  for(const theme of BF.BibleExperiments){
    assert.equal(theme.stages.length,5,theme.id);
    assert.deepEqual(Array.from(theme.stages.slice(0,3),s=>s.location),['camp','camp','camp'],theme.id);
    assert.deepEqual(Array.from(theme.stages.slice(3),s=>s.location),['workbench','workbench'],theme.id);
    assert.ok(theme.stages.every(s=>Array.isArray(s.requirements)&&s.requirements.length>0),theme.id);
  }
});
test('raccords missionnels expérimentaux documentés',()=>{
  const BF=loadCatalog();
  const byId=id=>BF.BibleCatalog.find(m=>m.id===id);
  assert.deepEqual([...byId('SUR-03').experimentalPrerequisites],['biology_applied']);
  assert.deepEqual([...byId('GAME-engineering_3').experimentalPrerequisites],['materials_science']);
  assert.deepEqual([...byId('GAME-engineering_5').experimentalPrerequisites],['structural_design']);
  assert.deepEqual([...byId('DRN-01').experimentalPrerequisites],['reverse_engineering']);
  assert.deepEqual([...byId('ENE-11').experimentalPrerequisites],['energy_control']);
  assert.deepEqual([...byId('ENE-14').experimentalPrerequisites],['biotic_energy_symbiosis','deep_geology','energy_resonance']);
  assert.deepEqual([...byId('DRN-01').prerequisites],['BAL-03','ENE-13'],'les prérequis historiques DRN-01 restent intacts');
  assert.deepEqual([...byId('ENE-11').prerequisites],['ENE-10','GAME-engineering_6'],'les prérequis historiques ENE-11 restent intacts');
  assert.deepEqual([...byId('ENE-14').prerequisites],['ENE-13'],'le socle ENE-14 reste intact');
});
