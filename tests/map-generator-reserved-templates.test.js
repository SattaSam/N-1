const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'engine/map-generator.js'), 'utf8');

function makeWindow() {
  const storage = new Map();
  const window = {
    BLUEFOX_MAP_ASSETS: { fallbackTerrainUrls: [] },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    performance: { now: () => 0 },
    crypto: { getRandomValues(values) { values[0] = 12345; return values; } },
    BlueFox3D: {
      maps: {},
      MapGenerationRules: {
        toLegacyBiomeDraft() {
          return {
            profile: 'desert',
            traits: [{ id: 'rocky', label: 'rocheux' }],
            resourceFamilies: [],
            microSceneIds: []
          };
        },
        validate() { return { valid: true }; }
      }
    }
  };
  window.window = window;
  return window;
}

function run(window) {
  const sandbox = {
    window,
    console,
    Object,
    Array,
    Set,
    Map,
    Math,
    JSON,
    Date,
    String,
    Number,
    Boolean,
    Uint32Array
  };
  vm.runInNewContext(source, vm.createContext(sandbox), { filename: 'engine/map-generator.js' });
  return window.BlueFox3D;
}

function map(id, name, extras = {}) {
  return {
    id,
    number: extras.number || 1,
    name,
    profile: 'desert',
    traits: [{ id: 'rocky', label: 'rocheux' }],
    sceneUrl: `${id}.png`,
    terrainUrls: [`${id}-terrain.png`],
    palette: { ground: 1, accent: 2 },
    ...extras
  };
}

test('une ville civilisationnelle ne peut pas être choisie comme template explicite', () => {
  const window = makeWindow();
  window.BlueFox3D.maps = {
    normal: map('normal', 'Normal'),
    rockyCity: map('custom-map-32-rock-village', 'ROCK_VILLAGE', {
      number: 32,
      civilizationId: 'rocky',
      civilizationRole: 'city'
    }),
    tinyCity: map('custom-map-31-tinycity', 'TinyCity', {
      number: 31,
      civilizationId: 'translucent',
      civilizationRole: 'city'
    })
  };
  const BF = run(window);
  const definition = { id: 'generated-test', seed: 7, generator: { biomeId: 'rocky' } };
  BF.MapGenerator.resolveVisualIdentity(definition, {
    biomeId: 'rocky',
    plateauCount: 1,
    templateId: 'custom-map-32-rock-village'
  });
  assert.equal(definition.generator.templateId, 'normal');
  assert.notEqual(definition.name, 'ROCK_VILLAGE');
});

test('les villes réservées sont aussi exclues des terrains fallback thématiques', () => {
  const window = makeWindow();
  window.BlueFox3D.maps = {
    normalA: map('normal-a', 'Normal A', { number: 1, terrainUrls: ['a.png'] }),
    normalB: map('normal-b', 'Normal B', { number: 2, terrainUrls: ['b.png'] }),
    rockyCity: map('custom-map-32-rock-village', 'ROCK_VILLAGE', {
      number: 32,
      civilizationRole: 'city',
      terrainUrls: ['city.png']
    })
  };
  const BF = run(window);
  const plan = BF.MapGenerator.terrainSelection(
    window.BlueFox3D.maps.normalA,
    3,
    { integer: () => 0 },
    'rocky',
    'desert'
  );
  assert.equal(plan.sources.some((entry) => entry.sourceTemplateId === 'custom-map-32-rock-village'), false);
  assert.equal(plan.urls.includes('city.png'), false);
});

test('un custom map non réservé reste utilisable comme template', () => {
  const window = makeWindow();
  window.BlueFox3D.maps = {
    village: map('custom-map-30-village', 'village', { number: 30 }),
    city: map('custom-map-32-rock-village', 'ROCK_VILLAGE', {
      number: 32,
      civilizationRole: 'city'
    })
  };
  const BF = run(window);
  const definition = { id: 'generated-test', seed: 9, generator: { biomeId: 'rocky' } };
  BF.MapGenerator.resolveVisualIdentity(definition, {
    biomeId: 'rocky',
    plateauCount: 1,
    templateId: 'custom-map-30-village'
  });
  assert.equal(definition.generator.templateId, 'custom-map-30-village');
  assert.equal(definition.name, 'village');
});

test('un map explicitement marqué non génératif ou missionOnly est exclu sans hardcode id', () => {
  const window = makeWindow();
  window.BlueFox3D.maps = {
    normal: map('normal', 'Normal'),
    reserved: map('future-mission-map', 'Mission Map', { generationTemplateEligible: false }),
    missionOnly: map('future-mission-only-map', 'Mission Only', { missionOnly: true })
  };
  const BF = run(window);
  for (const templateId of ['future-mission-map', 'future-mission-only-map']) {
    const definition = { id: `generated-${templateId}`, seed: 11, generator: { biomeId: 'rocky' } };
    BF.MapGenerator.resolveVisualIdentity(definition, {
      biomeId: 'rocky', plateauCount: 1, templateId
    });
    assert.equal(definition.generator.templateId, 'normal');
  }
});
