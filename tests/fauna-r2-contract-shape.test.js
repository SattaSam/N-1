
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function load(file,bf){
  const c={window:null,BlueFox3D:bf,console:{info(){},warn(){},error(){}}};c.window=c;vm.createContext(c);
  vm.runInContext(fs.readFileSync(file,'utf8'),c);return c.BlueFox3D;
}
test('R2: forme SEQUENCE_ACTIONS compatible avec le contrat V0.1 courant',()=>{
  const bf=load(path.join(__dirname,'..','data','bible-catalog.js'),{});
  const ids=['FAU-01','FAU-03','FAU-04','FAU-05','FAU-07','FAU-08','FAU-11','FAU-12'];
  const supported=new Set(['observe','inspect','analyze','collect','extract','travel','research','craft','build','rest','eat','explore-zone']);
  for(const id of ids){
    const m=bf.BibleCatalog.find(x=>x.id===id);
    assert.equal(m.pattern,'SEQUENCE_ACTIONS',id);
    assert.ok(Array.isArray(m.sequence)&&m.sequence.length>=2,`${id}: sequence`);
    const slots=new Set();
    for(const step of m.sequence){
      assert.ok(step.slot&&!slots.has(step.slot),`${id}: slot`);
      slots.add(step.slot);
      assert.ok(supported.has(step.action),`${id}: ${step.action}`);
      assert.ok(Number(step.target)>=1,`${id}: target`);
    }
    for(const step of m.sequence){
      for(const req of step.requires||[]) assert.ok(slots.has(req),`${id}: requires ${req}`);
      const rel=step.params?.relation;
      if(rel){
        assert.ok(slots.has(rel.fromSlot),`${id}: relation source`);
        for(const field of [...(rel.sameBy||[]),...(rel.differentBy||[])])
          assert.ok(['objectId','cuoType','family','subject','category','mapId','instanceId','persistentMicroSceneId'].includes(field),`${id}: relation ${field}`);
      }
    }
  }
});
