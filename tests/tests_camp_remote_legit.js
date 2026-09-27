const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness } = require('./tests_camp_harness');
const root = path.resolve(process.argv[2] || '.');
const id = 'CAMP@map-remote';
const h = createHarness(root, { runtimeState: { constructionInstances: { [id]: { missionId:id, kind:'camp', mapId:'map-remote', source:'player' } } } });
const manager = h.makeManager({
  lifecycles: { [id]: { status:'active' }, T03:{ status:'completed' } }, activeIds:[id],
  sites: { crystal: { kind:'camp', mapId:'crystal', missionId:'T03', id:'crystal:camp:primary', sites:{ camp:{ kind:'camp', mapId:'crystal', missionId:'T03', id:'crystal:camp:primary' } } } }
});
h.attachManager(manager, 'crystal');
h.runTimers();
assert.equal(manager.memory.state.missionLifecycle[id].status, 'active', 'un projet distant sans infrastructure sur sa cible reste actif');
assert.equal(manager.failCalls.length, 0, 'aucun fail hors map cible');
console.log('PASS remote CAMP remains legitimate');
