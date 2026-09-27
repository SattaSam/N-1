const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(ROOT, 'engine', name), 'utf8');

test('Settings UI does not own or replace runtime autonomy methods', () => {
  const source = read('settings-ui-bridge.js');
  assert.doesNotMatch(source, /\.updateAutonomy\s*=\s*function/);
  assert.doesNotMatch(source, /\.ensureActivity\s*=\s*function/);
  assert.match(source, /applyAutonomyMode/);
});

test('Ration AI exposes a BAC candidate and delegates crafting to Research owner', () => {
  const source = read('survival-rations-ai-v0-3.js');
  assert.match(source, /autonomyCandidate/);
  assert.match(source, /BF\.Research\?\.craft/);
  assert.doesNotMatch(source, /progression\?\.state\?\.inventory\s*\[[^\]]+\]\s*[+\-]=/);
});

test('BAC integration does not replace MissionManager mission chooser', () => {
  const source = read('behavior-arbitration-integration.js');
  assert.doesNotMatch(source, /Manager\.prototype\.chooseRunnableMissionAction\s*=/);
  assert.match(source, /MissionManager owns mission arbitration/);
});

test('late MissionManager compatibility bridge is marker-only', () => {
  const source = read('mission-manager-bible-fix-v19.js');
  assert.doesNotMatch(source, /Manager\.prototype\./);
  assert.doesNotMatch(source, /Manager\.create\s*=/);
  assert.match(source, /__bibleCleanStateOwner = "mission-manager"/);
});

test('generic engine owners contain no tutorial mission-id branches', () => {
  const names = [
    'behavior-arbitration-integration.js','bible-runtime-v0-1-unified.js',
    'character-controller.js','mission-manager.js','path-planner.js',
    'save-ui-bridge.js','settings-ui-bridge.js','survival-rations-ai-v0-3.js',
    'ui-enhancements.js','world-engine.js'
  ];
  for (const name of names) {
    const source = read(name);
    assert.doesNotMatch(source, /missionId\s*={2,3}\s*["']T(?:0?\d|1[0-3])["']/i, name);
    assert.doesNotMatch(source, /case\s+["']T(?:0?\d|1[0-3])["']/i, name);
  }
});


test('Bible map prescription no longer owns a second known-return executor', () => {
  const source = read('bible-map-prescription-v19.js');
  assert.doesNotMatch(source, /returnToBase\s*\(/);
  assert.doesNotMatch(source, /requestAutonomousKnownReturn/);
  assert.doesNotMatch(source, /requestKnownReturnAfterRuntimeCleanup/);
});

test('save snapshot includes the persistent player navigation key through generic bluefox_* capture', () => {
  const save = read('save-ui-bridge.js');
  const world = read('world-engine.js');
  assert.match(world, /bluefox_navigation_intent_v1/);
  assert.match(save, /key\.startsWith\("bluefox_"\)/);
  assert.doesNotMatch(save, /RESERVED_KEYS[\s\S]{0,700}bluefox_navigation_intent_v1/);
});
