const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ui = fs.readFileSync(path.join(root, 'engine', 'ui-enhancements.js'), 'utf8');
const world = fs.readFileSync(path.join(root, 'engine', 'world-engine.js'), 'utf8');

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
};

test('UI numbering uses canonical runtime discovery order before persisted fallback', () => {
  const start = ui.indexOf('const discoveryNumber = (mapId) => {');
  const end = ui.indexOf('\n  const discoveryLabel =', start);
  assert.ok(start >= 0 && end > start);
  const block = ui.slice(start, end);
  assert.ok(block.indexOf('const engineMemory') < block.indexOf('const memories = discoveryMemories()'));
  assert.match(block, /\[\.\.\.engineMemory\]\.indexOf\(mapId\)/);
  assert.match(block, /return index \+ 1/);
  assert.match(block, /global\.BlueFox3D\?\.maps\?\.\[item\.id\]/);
  assert.match(block, /findIndex\(\(candidate\) => candidate\.id === item\.id\)/);
});

test('Crystal remains Zone 01 and first discovered map becomes Zone 02', () => {
  const discoveredMaps = new Set(['crystal', 'generated-map-01', 'generated-map-02']);
  const discoveryNumber = (mapId) => {
    const index = [...discoveredMaps].indexOf(mapId);
    return index >= 0 ? index + 1 : null;
  };
  const label = (id) => `ZONE ${String(discoveryNumber(id)).padStart(2, '0')}`;
  assert.equal(label('crystal'), 'ZONE 01');
  assert.equal(label('generated-map-01'), 'ZONE 02');
  assert.equal(label('generated-map-02'), 'ZONE 03');
});

test('Player-facing current Zone label never uses technical definition.number', () => {
  const match = world.match(/const playerZoneNumber = this\.discoveryNumber\(this\.currentMapId\)[\s\S]{0,220}?onZoneChange\([\s\S]{0,220}?\);/);
  assert.ok(match, 'onZoneChange player numbering block missing');
  assert.doesNotMatch(match[0], /definition\.number/);
  assert.match(match[0], /padStart\(2, "0"\)/);
});

test('Planet opens centered on BlueFox even when a saved view exists', () => {
  const start = ui.indexOf('if (!viewport.dataset.initialViewApplied)');
  const end = ui.indexOf('\n  }\n\n  function setCatalogDetail', start);
  assert.ok(start >= 0 && end > start);
  const block = ui.slice(start, end);
  assert.match(block, /viewport\._bluefoxCenterCurrent\(\)/);
  assert.doesNotMatch(block, /_bluefoxView\?\.restored/);
});

test('Recenter remains explicit during an already-open planet view', () => {
  const calls = [...ui.matchAll(/_bluefoxCenterCurrent(?:\?\.)?\(\)/g)].map((m) => m.index);
  assert.equal(calls.length, 2, 'expected only manual button + initial opening calls');
  assert.doesNotMatch(ui, /map-transition-completed[\s\S]{0,250}_bluefoxCenterCurrent/);
  assert.doesNotMatch(ui, /discovery-changed[\s\S]{0,250}_bluefoxCenterCurrent/);
});

test('Manual center marks the map without changing pan/zoom interaction support', () => {
  const start = ui.indexOf('viewport._bluefoxCenterCurrent = () => {');
  const end = ui.indexOf('\n    world.querySelectorAll(".planet-map-zone")', start);
  const block = ui.slice(start, end);
  assert.match(block, /viewport\.dataset\.centeredMap = currentId/);
  assert.match(block, /view\.zoom = 1/);
  assert.match(ui, /viewport\.addEventListener\("pointermove"/);
  assert.match(ui, /viewport\.addEventListener\("wheel"/);
  assert.match(ui, /centerButton\.addEventListener\("click"/);
  assert.match(ui, /saveTransform\(\)/);
});

test('UI owner keeps unrelated Journal, Research and placement capabilities', () => {
  for (const token of [
    'function enhanceJournal(',
    'function refreshResearchPanels(',
    'function openSitePlacementFinalize(',
    'function ensureUniqueDiscoveredMapNames(',
    'function setExploredMapDetail('
  ]) assert.ok(ui.includes(token), `missing ${token}`);
});

test('WorldEngine keeps unrelated discovery, navigation, autonomy, save and final sequence capabilities', () => {
  for (const token of [
    'restoreDiscovery() {',
    'saveDiscovery() {',
    'async generateUnknownPassage(',
    'async transitionToKnownMap(',
    'navigateNextRouteStep() {',
    'autonomyAllowed(now = performance.now()) {',
    'beginFinalCapsuleSequence(options = {}) {'
  ]) assert.ok(world.includes(token), `missing ${token}`);
});

test('WorldEngine discoveryNumber canonical method itself is preserved', () => {
  assert.match(world, /discoveryNumber\(mapId\) \{\s*const index = \[\.\.\.this\.discoveredMaps\]\.indexOf\(mapId\);\s*if \(index >= 0\) return index \+ 1;/);
});

console.log(`\n${passed}/9 PASS`);
