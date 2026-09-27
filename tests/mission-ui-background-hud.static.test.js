const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'engine/mission-ui-bridge.js'), 'utf8');

test('HUD 3D masque les compteurs cumulatifs sauf s ils sont prioritaires', () => {
  assert.match(src, /historicalCollection === true/);
  assert.match(src, /definition\?\.instanceScope === "map"/);
  assert.match(src, /biblePattern \|\| ""\) === "EXPLORE_SCOPE"/);
  assert.match(src, /!isBackgroundHudMission\(mission\) \|\| Number\(mission\.priorityRank\) > 0/);
});

test('la règle HUD reste sémantique et ne code pas les familles missionnelles en dur', () => {
  const start = src.indexOf('function isStrictCumulativeHudMission');
  const end = src.indexOf('function isBackgroundHudMission', start);
  const block = src.slice(start, end);
  assert.doesNotMatch(block, /COL-|LOC-05|LOC-06/);
  assert.match(block, /historicalCollection/);
  assert.match(block, /EXPLORE_SCOPE/);
});

test('le menu Missions complet reste distinct du filtrage HUD', () => {
  const start = src.indexOf('function missionList');
  const end = src.indexOf('function renderMissionBrowser', start);
  const block = src.slice(start, end);
  assert.doesNotMatch(block, /isBackgroundHudMission/);
  assert.match(block, /available", "active", "paused", "completed/);
});
