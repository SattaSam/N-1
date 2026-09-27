const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness } = require('./tests_camp_harness');
const root = path.resolve(process.argv[2] || '.');
const id = 'CAMP@crystal';
const h = createHarness(root, { runtimeState: { constructionInstances: { [id]: { missionId:id, kind:'camp', mapId:'crystal', source:'player' } } } });
const manager = h.makeManager({
  lifecycles: { [id]: { status:'active' }, T03:{ status:'completed' } }, activeIds:[id],
  sites: { crystal: { kind:'camp', mapId:'crystal', missionId:'T03', id:'crystal:camp:primary', sites:{ camp:{ kind:'camp', mapId:'crystal', missionId:'T03', id:'crystal:camp:primary' } } } }
});
h.attachManager(manager);
h.runtime.pendingConstructionResourceMissions.add(id);
h.runtime.constructionResourceSignatures.set(id, '0:0/10');
h.runTimers();
assert.equal(manager.memory.state.missionLifecycle[id].status, 'failed', 'CAMP@crystal legacy doit devenir failed');
assert.equal(manager.activeMissionIds.includes(id), false, 'la mission stale doit sortir des actives runtime');
assert.equal(manager.memory.state.activeMissionIds.includes(id), false, 'la sélection persistée doit être resynchronisée');
assert.ok(h.runtime.state.constructionInstances[id], 'constructionInstances doit être conservé pour restaurer la définition dynamique');
assert.equal(h.runtime.pendingConstructionResourceMissions.has(id), false, 'cache déficit stale nettoyé');
assert.equal(h.runtime.constructionResourceSignatures.has(id), false, 'signature déficit stale nettoyée');
assert.equal(manager.failCalls.length, 1, 'un seul fail');
assert.equal(h.dispatched.some((event) => event.type === 'bluefox:mission-completed'), false, 'aucune completion artificielle');
console.log('PASS stale CAMP@crystal reconciled');
