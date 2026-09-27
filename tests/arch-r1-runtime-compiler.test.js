const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const context = {
  console: { info() {}, warn() {}, error() {} },
  setTimeout, clearTimeout, setInterval, clearInterval, performance, Date, Math,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}
};
context.window = context;
vm.createContext(context);
const load = (file) => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
load(path.join(root, 'data', 'bible-patterns.js'));
load(path.join(root, 'data', 'bible-catalog.js'));
context.BlueFox3D.Missions = { normalizeActionType: (value) => value };
load(path.join(root, 'engine', 'bible-runtime-v0-1-unified.js'));

const BF = context.BlueFox3D;
const byId = (id) => BF.BibleCatalog.find((mission) => mission.id === id);
const compile = (id) => BF.bibleRuntime.compileMission(byId(id));

test('ARCH-03: compilation conserve cible 2 + distinctBy instanceId', () => {
  const compiled = compile('ARCH-03');
  assert.ok(compiled);
  assert.equal(compiled.root.children.length, 1);
  const node = compiled.root.children[0];
  assert.equal(node.type, 'observe');
  assert.equal(node.target, 2);
  assert.equal(node.params.cuoType, 'stele');
  assert.equal(node.params.distinctBy, 'instanceId');
});

test('ARCH-04: compilation conserve la relation SAME-INSTANCE relay_block', () => {
  const compiled = compile('ARCH-04');
  assert.ok(compiled);
  const [observe, collect] = compiled.root.children;
  assert.equal(observe.type, 'observe');
  assert.equal(observe.params.cuoType, 'relay_block');
  assert.equal(collect.type, 'collect');
  assert.equal(collect.params.cuoType, 'relay_block');
  assert.deepEqual(Array.from(collect.requires), ['ARCH-04:observeComponent']);
  assert.equal(collect.params.relation.fromSlot, 'observeComponent');
  assert.deepEqual(Array.from(collect.params.relation.sameBy), ['instanceId']);
});
