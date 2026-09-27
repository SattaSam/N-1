const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'data/bible-catalog.js'), 'utf8');
const window = { BlueFox3D: {} }; window.window = window;
vm.runInNewContext(source, window, { filename: 'data/bible-catalog.js' });
const catalog = window.BlueFox3D.BibleCatalog;
const byId = new Map(catalog.map((m) => [m.id, m]));

for (const id of ['TP-05', 'TP-07']) {
  const mission = byId.get(id);
  assert.ok(mission, `${id} absente`);
  assert.equal(
    mission.navigation?.autonomousUnknownTravel,
    true,
    `${id} doit autoriser le propriétaire à demander un voyage inconnu autonome`
  );
}

const tp = catalog.filter((mission) => /^TP-\d+$/.test(String(mission?.id || '')));
for (const mission of tp) {
  const firstUnknownTravel = (mission.sequence || []).find((step) =>
    String(step?.action || '').toLowerCase() === 'travel' &&
    step?.params?.eventDriven === true &&
    step?.params?.newOnly === true
  );
  if (!firstUnknownTravel) continue;
  assert.equal(
    mission.navigation?.autonomousUnknownTravel,
    true,
    `${mission.id}: travel eventDriven+newOnly sans navigation.autonomousUnknownTravel=true`
  );
}

console.log('PASS R-TP-A runnability: all TP eventDriven+newOnly travels authorize autonomous unknown travel');
