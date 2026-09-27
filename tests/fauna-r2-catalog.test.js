
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function catalog(){
  const context={window:null,BlueFox3D:{},console:{info(){},warn(){},error(){}}};
  context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','data','bible-catalog.js'),'utf8'),context);
  return context.BlueFox3D.BibleCatalog;
}
const byId=(list,id)=>list.find(m=>m.id===id);

test('R2: les douze missions FAU sont presentes une seule fois',()=>{
  const list=catalog();
  for(let i=1;i<=12;i++){
    const id=`FAU-${String(i).padStart(2,'0')}`;
    assert.equal(list.filter(m=>m.id===id).length,1,id);
  }
});

test('R2: chaine FAU principale et branche FAU-12',()=>{
  const c=catalog();
  assert.deepEqual([...byId(c,'FAU-02').prerequisites],['FAU-01']);
  assert.deepEqual([...byId(c,'FAU-03').prerequisites],['FAU-02']);
  assert.deepEqual([...byId(c,'FAU-04').prerequisites],['FAU-03']);
  assert.deepEqual([...byId(c,'FAU-05').prerequisites],['FAU-04']);
  assert.deepEqual([...byId(c,'FAU-06').prerequisites],['FAU-05']);
  assert.deepEqual([...byId(c,'FAU-07').prerequisites],['FAU-06']);
  assert.deepEqual([...byId(c,'FAU-08').prerequisites],['FAU-07']);
  assert.deepEqual([...byId(c,'FAU-09').prerequisites],['FAU-08']);
  assert.deepEqual([...byId(c,'FAU-10').prerequisites],['FAU-09']);
  assert.deepEqual([...byId(c,'FAU-11').prerequisites],['FAU-10']);
  assert.deepEqual([...byId(c,'FAU-12').prerequisites],['FAU-03']);
});

test('R2: FAU-01 valide une approche prudente dans le nid',()=>{
  const m=byId(catalog(),'FAU-01');
  assert.equal(m.mapGeneration.requiredMicroScenes[0].id,'MSC-CUSTOM-NID-DE-FAUNE5');
  assert.equal(m.sequence[0].action,'travel');
  assert.deepEqual([...m.sequence[1].params.tagsAll],['fauna_behavior','cautious_approach','no_flee']);
});

test('R2: FAU-03 exige un contraste temporel reel et non un ordre jour puis nuit',()=>{
  const m=byId(catalog(),'FAU-03');
  assert.deepEqual([...m.sequence[0].params.tagsAll],['fauna_behavior','calm_nearby']);
  assert.deepEqual([...m.sequence[1].params.tagsAll],['fauna_behavior','temporal_contrast']);
  assert.equal(m.sequence[1].params.tagsAll.includes('period_day'),false);
  assert.equal(m.sequence[1].params.tagsAll.includes('period_night'),false);
});

test('R2: FAU-04 conserve indifference -> fuite -> neutralite sur le premier individu',()=>{
  const m=byId(catalog(),'FAU-04');
  assert.deepEqual([...m.sequence[0].params.tagsAll],['fauna_behavior','cautious_approach','no_flee']);
  assert.ok(m.sequence[1].params.tagsAll.includes('flee'));
  assert.ok(m.sequence[2].params.tagsAll.includes('calm_nearby'));
  assert.deepEqual([...m.sequence[2].params.relation.sameBy],['instanceId']);
  assert.equal(m.sequence[2].params.relation.fromSlot,'indifference');
});

test('R2: FAU-05 et FAU-11 imposent trois individus distincts',()=>{
  const c=catalog();
  for(const id of ['FAU-05','FAU-11']){
    const m=byId(c,id);
    assert.equal(m.sequence[0].target,1);
    assert.equal(m.sequence[1].target,2);
    assert.equal(m.sequence[1].params.distinctBy,'instanceId');
    assert.deepEqual([...m.sequence[1].params.relation.differentBy],['instanceId']);
  }
  assert.ok(byId(c,'FAU-11').sequence[0].params.tagsAll.includes('familiar_encounter'));
});

test('R2: FAU-07 observe un comportement cinq secondes a distance',()=>{
  const m=byId(catalog(),'FAU-07');
  assert.ok(m.sequence[1].params.tagsAll.includes('behavior_observed'));
  assert.deepEqual([...m.sequence[1].params.relation.sameBy],['instanceId']);
});

test('R2: FAU-08 et FAU-12 reutilisent la MSC paisible existante sans nouvelle scene',()=>{
  const c=catalog();
  for(const id of ['FAU-08','FAU-12']){
    const m=byId(c,id);
    assert.equal(m.mapGeneration.requiredMicroScenes[0].id,'MSC-PEACEFUL-FAUNA-001');
    assert.equal(m.sequence[0].action,'travel');
    assert.ok(m.sequence[1].params.tagsAll.includes('peaceful_group'));
    assert.ok(m.sequence[1].params.tagsAll.includes('no_flee'));
  }
  assert.ok(byId(c,'FAU-08').sequence[1].params.tagsAll.includes('multi_species'));
});
