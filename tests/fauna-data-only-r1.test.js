const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const catalogPath = path.join(__dirname, '..', 'data', 'bible-catalog.js');
const catalogSource = fs.readFileSync(catalogPath, 'utf8');
const context = { window: {}, console: { info() {}, warn() {}, error() {} } };
context.window.BlueFox3D = {};
vm.runInNewContext(catalogSource, context, { filename: 'bible-catalog.js' });
const catalog = context.window.BlueFox3D.BibleCatalog;
const byId = (id) => catalog.find((mission) => mission.id === id);

for (const id of ['FAU-02', 'FAU-06']) assert.ok(byId(id), `${id} absent`);
const f02 = byId('FAU-02');
assert.equal(f02.pattern, 'CONTEXT_MSC');
assert.deepEqual(Array.from(f02.prerequisites), ['FAU-01']);
assert.equal(f02.mapGeneration.requiredMicroScenes[0].id, 'MSC-CUSTOM-NID-DE-FAUNE5');
assert.equal(f02.slots.context.target, 3);
assert.equal(f02.slots.context.params.microSceneId, 'MSC-CUSTOM-NID-DE-FAUNE5');
assert.equal(f02.slots.context.params.distinctBy, 'mapId');

const f06 = byId('FAU-06');
assert.equal(f06.pattern, 'SEQUENCE_ACTIONS');
assert.equal(f06.sequence[1].params.direction, 'east');
assert.equal(f06.mapGeneration.requiredObjects[0].sourceSlot, 'referenceFauna');
assert.equal(f06.mapGeneration.requiredObjects[0].identityField, 'objectId');
assert.deepEqual(Array.from(f06.sequence[2].params.relation.sameBy), ['objectId']);
assert.deepEqual(Array.from(f06.sequence[2].params.relation.differentBy), ['mapId']);

console.log('PASS fauna-data-only-r1');
