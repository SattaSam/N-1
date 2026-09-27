const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "map-test", "map-test.js"), "utf8");
const html = fs.readFileSync(path.join(root, "map-test", "index.html"), "utf8");
const microScenes = JSON.parse(
  fs.readFileSync(path.join(root, "data", "custom-micro-scenes.json"), "utf8")
);
const byId = new Map(microScenes.map((entry) => [entry.id, entry]));

test("MAP_Test charge les cartes du moteur et passe par le pipeline canonique", () => {
  assert.match(html, /id="engine-template"/);
  assert.match(html, /id="load-template"/);
  assert.match(html, /id="generate-variant"/);
  assert.match(source, /Object\.values\(BF\.maps \|\| \{\}\)/);
  assert.match(source, /BF\.MapIntegrity\.prepareDefinition\(definition/);
  assert.match(source, /BF\.buildMap\(THREE, currentDefinition/);
});

test("les trois zones utilisent les étapes de construction validées", () => {
  const camp = byId.get("MSC-CUSTOM-CAMP");
  const shelter = byId.get("MSC-CUSTOM-CAMP-BASE");
  const base = byId.get("MSC-CUSTOM-CAMP-BASE-REINFORCED");

  assert.equal(camp.objects.filter((entry) => entry.type === "base_fire").length, 1);
  assert.ok(shelter.objects.filter((entry) => entry.type === "wood_plane").length >= 20);
  assert.ok(base.objects.filter((entry) => entry.type === "wall").length >= 20);
});

test("MAP_Test ne réinjecte pas localement les assets de crash", () => {
  assert.doesNotMatch(source, /01_0Crash_Crystal\.png/);
  assert.doesNotMatch(source, /BlueFox_Capsule_Depart\.glb/);
  assert.match(source, /await renderDefinition\(clone\(selectedTemplate\)/);
  assert.match(source, /BF\.buildMap\(THREE, currentDefinition/);
});
