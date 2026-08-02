const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const loadBridge = (engine) => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "engine", "action-bridge.js"),
    "utf8"
  );
  const maps = {
    start: { mapId: "start", surfacePercent: 100 },
    forest: { mapId: "forest", surfacePercent: 42 }
  };
  const window = {
    BlueFox3D: {
      maps: { forest: { name: "Forêt d’ambre" } },
      Missions: { ActionType: { EXPLORE_ZONE: "explore-zone" } },
      getExplorationSummary: () => ({ maps }),
      getMapExplorationState: (mapId) => maps[mapId]
    },
    localStorage: { getItem: () => null }
  };
  vm.runInNewContext(source, { window, console });
  return new window.BlueFox3D.Missions.ActionBridge(engine);
};

test("l’exploration totale rejoint une map connue encore incomplète", () => {
  const gate = {
    position: { x: 25, y: 0, z: 0 },
    userData: { exit: { targetMap: "forest" } }
  };
  const targets = [];
  const engine = {
    currentMapId: "start",
    currentMap: { zoneRegions: [], interactables: [], gates: [gate] },
    discoveredZones: new Set(),
    transitioning: false,
    pendingInteraction: null,
    currentRoutine: null,
    pendingZoneExploration: null,
    pendingGate: null,
    character: {
      root: { position: { distanceTo: () => 0 } },
      target: {},
      setTarget: (...args) => targets.push(args)
    },
    findKnownRoute: () => ["start", "forest"],
    callbacks: { onStatus: () => {} }
  };
  const bridge = loadBridge(engine);
  const executed = bridge.execute({
    type: "explore-zone",
    params: { catalogMetric: "all-discovered-biomes-percent" }
  });

  assert.equal(executed, true);
  assert.equal(engine.pendingGate, gate);
  assert.deepEqual(targets[0], [gate.position, "run"]);
});
