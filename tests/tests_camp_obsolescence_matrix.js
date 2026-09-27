const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness } = require('./tests_camp_harness');
const root = path.resolve(process.argv[2] || '.');

function site(kind, missionId, mapId='target') { return { kind, missionId, mapId, id:`${mapId}:${kind}:primary` }; }
function runCase(kind, sites, { expectedFail, ownMission=false, noOwner=false } = {}) {
  const id = `${kind.toUpperCase()}@target`;
  const record = { missionId:id, kind, mapId:'target', source:'player' };
  const normalizedSites = {};
  for (const [key, value] of Object.entries(sites || {})) {
    normalizedSites[key] = value === true ? site(key, ownMission ? id : `OTHER-${key.toUpperCase()}`) : value;
    if (noOwner && normalizedSites[key]) delete normalizedSites[key].missionId;
  }
  const h = createHarness(root, { runtimeState:{ constructionInstances:{ [id]:record } } });
  const manager = h.makeManager({
    lifecycles:{ [id]:{status:'active'} }, activeIds:[id],
    sites:{ target:{ ...(Object.values(normalizedSites)[0] || {kind:'camp',mapId:'target'}), sites:normalizedSites } }
  });
  h.attachManager(manager, 'elsewhere');
  h.runTimers();
  assert.equal(manager.memory.state.missionLifecycle[id].status === 'failed', expectedFail, `${id} discrimination`);
  return {h, manager, id};
}

runCase('camp', {camp:true}, {expectedFail:true});
runCase('camp', {refuge:true}, {expectedFail:true});
runCase('camp', {base:true}, {expectedFail:true});
runCase('refuge', {camp:true}, {expectedFail:false});
runCase('refuge', {refuge:true}, {expectedFail:true});
runCase('refuge', {base:true}, {expectedFail:true});
runCase('workbench', {workbench:true}, {expectedFail:true});
runCase('camp', {camp:true}, {expectedFail:false, ownMission:true});
runCase('camp', {camp:true}, {expectedFail:false, noOwner:true});

// Runtime event: site nouvellement établi sur la cible fait disparaître le stale immédiatement.
{
  const id='CAMP@crystal';
  const h=createHarness(root,{runtimeState:{constructionInstances:{[id]:{missionId:id,kind:'camp',mapId:'crystal',source:'player'}}}});
  const m=h.makeManager({lifecycles:{[id]:{status:'active'}},activeIds:[id],sites:{}}); h.attachManager(m);
  m.memory.state.siteProgression.crystal={kind:'camp',mapId:'crystal',missionId:'T03',sites:{camp:site('camp','T03','crystal')}};
  h.runtime.onSiteEstablished({kind:'camp',mapId:'crystal',missionId:'T03'});
  assert.equal(m.memory.state.missionLifecycle[id].status,'failed','site-established doit réconcilier immédiatement');
}

// Runtime atomique T03: applyEffects persiste le site, puis la microtask invalide CAMP@crystal.
{
  const id='CAMP@crystal';
  const h=createHarness(root,{runtimeState:{constructionInstances:{[id]:{missionId:id,kind:'camp',mapId:'crystal',source:'player'}}}});
  const m=h.makeManager({lifecycles:{[id]:{status:'active'},T03:{status:'active'}},activeIds:[id],sites:{}}); h.attachManager(m);
  h.runtime.renderSite=()=>true;
  h.runtime.inventoryConsumptionPlan=()=>({ready:true});
  const ok=h.runtime.applyEffects({id:'T03',effects:[{type:'site.establish',kind:'camp',microSceneId:'MSC-camp'}],targetMapId:'crystal'}, {placement:{anchor:{x:1,y:0,z:1},rotation:[0,0,0]},source:'mission-completion'});
  assert.equal(ok,true,'T03 site.establish doit réussir dans le harness');
  assert.equal(m.memory.state.missionLifecycle[id].status,'active','la réconciliation doit être différée après la transaction');
  h.runMicrotasks();
  assert.equal(m.memory.state.missionLifecycle[id].status,'failed','T03 atomique doit invalider le stale sans reload');
}

// Reload/idempotence: failed + record conservé ne doit jamais être re-fail.
{
  const id='CAMP@crystal';
  const h=createHarness(root,{runtimeState:{constructionInstances:{[id]:{missionId:id,kind:'camp',mapId:'crystal',source:'player'}}}});
  const m=h.makeManager({lifecycles:{[id]:{status:'failed'}},activeIds:[],sites:{crystal:{kind:'camp',mapId:'crystal',missionId:'T03',sites:{camp:site('camp','T03','crystal')}}}}); h.attachManager(m);
  h.runTimers();
  assert.equal(m.failCalls.length,0,'un lifecycle failed conservé ne doit pas être rejoué au reload');
  assert.ok(h.runtime.state.constructionInstances[id],'la définition dynamique reste restaurable');
}

// Réentrance: le publish de failMission ne doit pas provoquer un second fail.
{
  const id='CAMP@crystal';
  const h=createHarness(root,{runtimeState:{constructionInstances:{[id]:{missionId:id,kind:'camp',mapId:'crystal',source:'player'}}}});
  const m=h.makeManager({lifecycles:{[id]:{status:'active'}},activeIds:[id],sites:{crystal:{kind:'camp',mapId:'crystal',missionId:'T03',sites:{camp:site('camp','T03','crystal')}}}}); h.attachManager(m);
  h.runTimers();
  assert.equal(m.failCalls.length,1,'publish/onMissionState ne doit pas réentrer dans la réconciliation');
}

// Le chemin balise historique reste traversé.
{
  const h=createHarness(root);
  const m=h.makeManager({lifecycles:{'BAL-03':{status:'active'}},activeIds:['BAL-03'],sites:{}}); h.attachManager(m,'target');
  m.memory.state.facts['beacon-target']={mapId:'target'};
  h.runtime.byId.set('BAL-03',{id:'BAL-03',runtimeValidation:{type:'bal03-deployed-beacon',requiredMapFact:'beacon-target',slot:'deployBeacon'}});
  let progressed=0; h.runtime.progressRuntimeValidationSlot=()=>{progressed++;return true;};
  h.runtime.onSiteEstablished({kind:'deployed_beacon',mapId:'target'});
  assert.equal(progressed,1,'le traitement BAL-03 historique doit rester actif');
}

console.log('PASS construction obsolescence matrix');
