'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'engine', 'ui-enhancements.js'), 'utf8');

// Existing owners / UI consumers that share ui-enhancements.js must remain present.
for (const token of [
  'function enhancePlanet(panel)',
  'function enhanceResearch(panel)',
  'function renderDroneConsole(section)',
  'function refreshResearchPanels(force = false)',
  'closeCompetingInventoryResearchPanel(target)',
  'function enhanceConstructionMissionAction(card)',
  'function buildJournalEvolutionThemes()',
  'function renderJournalNarrativeNotes(report)',
  'bluefox_journal_evolution_theme_state_v1',
  'bluefox:site-placement-finalize-request'
]) assert.ok(src.includes(token), `missing historical invariant: ${token}`);

assert.ok(src.includes('renderJournalNarrativeNotes(report);'), 'persistent narrative renderer preserved');
assert.ok(src.includes('global.BlueFox3D?.getJournalNarrativeState?.()'), 'renderer still consumes persisted narrative state');
assert.ok(!/setInterval\s*\(/.test(src), 'no polling introduced');
console.log('PASS journal shared-UI non-regression static');
