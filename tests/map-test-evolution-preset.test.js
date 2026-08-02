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

test("le préréglage de validation est accessible dans map-test", () => {
  assert.match(html, /id="evolution-preset"/);
  assert.match(source, /createEvolutionValidationMap\(\)/);
  assert.match(source, /createPlateaus\(3,/);
});

test("les trois zones utilisent les étapes de construction validées", () => {
  const camp = byId.get("MSC-CUSTOM-CAMP");
  const shelter = byId.get("MSC-CUSTOM-CAMP-BASE");
  const base = byId.get("MSC-CUSTOM-CAMP-BASE-REINFORCED");

  assert.equal(camp.objects.filter((entry) => entry.type === "base_fire").length, 1);
  assert.ok(shelter.objects.filter((entry) => entry.type === "wood_plane").length >= 20);
  assert.ok(base.objects.filter((entry) => entry.type === "wall").length >= 20);
});

test("chaque zone reçoit la texture de crash et la capsule validée", () => {
  assert.match(source, /01_0Crash_Crystal\.png/);
  assert.match(source, /BlueFox_Capsule_Depart\.glb/);
  assert.match(source, /Promise\.all\(LAYOUTS\[3\]/);
  assert.ok(fs.existsSync(path.join(root, "assets", "models", "BlueFox_Capsule_Depart.glb")));
});
