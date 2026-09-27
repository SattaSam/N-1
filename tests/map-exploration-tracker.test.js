const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "..", "engine", "map-exploration-tracker.js"),
  "utf8"
);

const createRuntime = (savedState = null) => {
  const values = new Map();
  if (savedState) values.set("bluefox_map_exploration_v1", JSON.stringify(savedState));
  const increments = [];
  const window = {
    BlueFox3D: {
      progressionRegistry: {
        incrementScopes: (_event, amount) => increments.push(amount)
      }
    },
    localStorage: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value)
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    setInterval: undefined,
    clearInterval: undefined
  };
  const context = {
    window,
    CustomEvent: class CustomEvent {
      constructor(type, options) {
        this.type = type;
        this.detail = options?.detail;
      }
    },
    console
  };
  vm.runInNewContext(source, context);
  return { api: window.BlueFox3D, increments };
};

test("révèle les secteurs voisins dans un rayon de 4 m", () => {
  const { api, increments } = createRuntime();
  api.recordMapPosition({ mapId: "start", x: 0, z: 0, bounds: 27 });
  const map = api.getMapExplorationState("start");

  assert.equal(map.revealRadius, 4);
  assert.equal(map.sectorCount, 4);
  assert.equal(map.surfacePercent, 2.78);
  assert.deepEqual(increments, [4]);
});

test("un secteur occupé est exploré en passant à proximité", () => {
  const { api } = createRuntime();
  api.recordMapPosition({ mapId: "start", x: 2.25, z: 0, bounds: 27 });
  const map = api.getMapExplorationState("start");

  assert.ok(map.visitedSectors["7:6"], "le secteur voisin doit être révélé sans être traversé");
});

test("propose le secteur incomplet le plus proche pour l’autonomie", () => {
  const { api } = createRuntime();
  api.recordMapPosition({ mapId: "start", x: 0, z: 0, bounds: 27 });
  const target = api.getNextUnexploredMapTarget("start", { x: 0, z: 0 });

  assert.ok(target);
  assert.equal(api.getMapExplorationState("start").visitedSectors[target.key], undefined);
});

test("les anciennes sauvegardes reçoivent le rayon sans perdre leur progression", () => {
  const { api } = createRuntime({
    version: 1,
    updatedAt: 1,
    maps: {
      start: {
        mapId: "start",
        gridSize: 12,
        bounds: 27,
        visitedSectors: { "6:6": { at: 1, zoneId: 0 } },
        visitedZones: { "0": 1 },
        surfacePercent: 0.69,
        sectorCount: 1,
        totalSectors: 144,
        distanceTravelled: 0,
        lastPosition: null,
        explorationMilestones: {},
        expertiseMilestones: {},
        expertise: 0,
        updatedAt: 1
      }
    }
  });
  const map = api.getMapExplorationState("start");

  assert.equal(map.revealRadius, 4);
  assert.equal(map.sectorCount, 1);
  assert.ok(map.visitedSectors["6:6"]);
});
