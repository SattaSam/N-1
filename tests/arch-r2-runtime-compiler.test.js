
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const context = {
  console: { info(){}, warn(){}, error(){} },
  setTimeout, clearTimeout, setInterval, clearInterval, performance, Date, Math,
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  addEventListener(){}, removeEventListener(){}, dispatchEvent(){}
};
context.window = context;
vm.createContext(context);
const load = p => vm.runInContext(fs.readFileSync(p,'utf8'), context, { filename:p });
load(path.join(root,'data','bible-patterns.js'));
load(path.join(root,'data','bible-catalog.js'));
context.BlueFox3D.Missions = { normalizeActionType: v => v };
load(path.join(root,'engine','bible-runtime-v0-1-unified.js'));

const BF = context.BlueFox3D;
const byId = id => BF.BibleCatalog.find(m => m.id === id);
const compile = id => {
  const compiled = BF.bibleRuntime.compileMission(byId(id));
  assert.ok(compiled, `${id} compile failed`);
  return compiled;
};

test('ARCH-R2: les six missions compilent via BibleRuntime', () => {
  for (const id of ['ARCH-07','ARCH-08','ARCH-09','ARCH-10','ARCH-11','ARCH-12']) {
    assert.ok(compile(id));
  }
});

test('ARCH-07: compilation conserve 5 observations puis surfacePercent 60', () => {
  const c = compile('ARCH-07');
  const [a,b] = c.root.children;
  assert.equal(a.type,'observe');
  assert.equal(a.target,5);
  assert.equal(a.params.distinctBy,'instanceId');
  assert.equal(a.params.microSceneId,'MSC-CUSTOM-RUINE-MODULAIRE1');
  assert.equal(b.type,'explore-zone');
  assert.equal(b.target,60);
  assert.equal(b.params.threshold,60);
  assert.deepEqual(Array.from(b.requires), ['ARCH-07:siteElements']);
});

test('ARCH-08: compilation CONTEXT_MSC conserve cible 3', () => {
  const c = compile('ARCH-08');
  assert.equal(c.root.children.length, 1);
  const n = c.root.children[0];
  assert.equal(n.type, 'observe');
  assert.equal(n.target, 3);
  assert.equal(n.params.anyMicroScene, true);
  assert.equal(n.params.contextRole, 'archRegionalSite');
  assert.equal(n.params.distinctBy, 'microSceneId');
});

test('ARCH-09: compilation conserve deux groupes distincts de trois', () => {
  const c = compile('ARCH-09');
  const [a,b] = c.root.children;
  assert.equal(a.type,'observe');
  assert.equal(a.target,3);
  assert.equal(a.params.cuoType,'arch');
  assert.equal(b.type,'observe');
  assert.equal(b.target,3);
  assert.equal(b.params.cuoType,'stele');
  assert.deepEqual(Array.from(b.requires), ['ARCH-09:arches']);
});

test('ARCH-10: compilation conserve debris de RUINE-MODULAIRE2', () => {
  const c = compile('ARCH-10');
  assert.equal(c.root.children.length, 1);
  const n = c.root.children[0];
  assert.equal(n.type, 'observe');
  assert.equal(n.params.cuoType, 'debris');
  assert.equal(n.params.microSceneId, 'MSC-CUSTOM-RUINE-MODULAIRE2');
});

test('ARCH-11: compilation conserve travel → observe carriere → collect minerai sans relation implicite', () => {
  const c = compile('ARCH-11');
  const [travel, quarry, sample] = c.root.children;
  assert.equal(travel.type,'travel');
  assert.equal(quarry.type,'observe');
  assert.equal(quarry.params.cuoType,'strong_rock');
  assert.equal(quarry.params.microSceneId,'MSC-CUSTOM-CARRIERE');
  assert.equal(sample.type,'collect');
  assert.equal(sample.params.cuoType,'magnetic_ore');
  assert.equal(sample.params.relation, undefined);
});

test('ARCH-12: compilation conserve habitat puis composant sans SAME-INSTANCE implicite', () => {
  const c = compile('ARCH-12');
  const [observe, collect] = c.root.children;
  assert.equal(observe.type,'observe');
  assert.equal(observe.params.cuoType,'stele');
  assert.equal(observe.params.microSceneId,'MSC-CUSTOM-HABITAT-RUINE');
  assert.equal(collect.type,'collect');
  assert.equal(collect.params.cuoType,'relay_block');
  assert.equal(collect.params.microSceneId,'MSC-CUSTOM-HABITAT-RUINE');
  assert.equal(collect.params.relation, undefined);
});
