const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("la scène 28 possède trois terrains qui forment aussi le fallback", () => {
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const window = { dispatchEvent() {} };
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "map-assets.js"), "utf8"),
    vm.createContext({ window, CustomEvent, console }),
    { filename: "map-assets.js" }
  );
  const api = window.BLUEFOX_MAP_ASSETS;
  const entries = [
    { name: "28Zone de Magetisme.png", url: "./Images/28Zone de Magetisme.png" },
    ...[1, 2, 3].map((frame) => ({
      name: `028_${frame}.png`,
      url: `./Images/028_${frame}.png`
    }))
  ];
  const catalog = api.buildCatalog(entries);
  const map28 = catalog.maps.find((map) => map.number === 28);
  assert.deepEqual(Array.from(map28.terrains, (terrain) => terrain.frame), [1, 2, 3]);
  assert.deepEqual(Array.from(api.fallbackTerrainUrls), [
    "./Images/028_1.png", "./Images/028_2.png", "./Images/028_3.png"
  ]);
});
