const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function load() {
  const window = { BlueFox3D: {} };
  window.window = window;
  const context = vm.createContext({ window, Object, Array, Set, Map, JSON, Number, String, Boolean, console });
  for (const file of [
    'engine/mission-types.js',
    'data/bible-patterns.js',
    'data/bible-catalog.js',
    'engine/bible-contract-v0-1.js'
  ]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  }
  return window.BlueFox3D;
}

test('Bible strict contract: zero errors', () => {
  const BF = load();
  const report = BF.BibleContractV01.validateCatalog(BF.BibleCatalog, BF.BiblePatterns, { compatibility: 'strict' });
  assert.deepEqual(Array.from(report.errors || []), []);
  assert.equal(report.ok, true);
});

test('conditional generation identity is accepted', () => {
  const BF = load();
  const report = BF.BibleContractV01.validateMission({
    id:'COND', title:'COND', pattern:'SEQUENCE_ACTIONS',
    trigger:{type:'manual'},
    runtimeValidation:{type:'catalog-runtime',slot:'contact'},
    mapGeneration:{requiredObjects:[{
      selectionFact:'civilization:selected',
      selectionField:'civilizationId',
      choices:{rocky:{type:'npc_rocky',count:1}, translucent:{type:'npc_translucent',count:1}}
    }]},
    sequence:[{slot:'contact',action:'observe',target:1,params:{catalogManaged:true,eventDriven:true}}]
  }, BF.BiblePatterns, { compatibility:'strict' });
  assert.deepEqual(Array.from(report.errors || []), []);
});

test('arbitrary single-step SEQUENCE_ACTIONS remains rejected', () => {
  const BF = load();
  const report = BF.BibleContractV01.validateMission({
    id:'ONE', title:'ONE', pattern:'SEQUENCE_ACTIONS',
    trigger:{type:'manual'},
    sequence:[{slot:'only',action:'observe',target:1,params:{subject:'fauna'}}]
  }, BF.BiblePatterns, { compatibility:'strict' });
  assert.ok(Array.from(report.errors || []).some(e => String(e).includes('minimum 2')));
});
