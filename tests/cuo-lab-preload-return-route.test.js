const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const labHtml = fs.readFileSync(path.join(root, "cuo-lab", "index.html"), "utf8");
const labSource = fs.readFileSync(path.join(root, "cuo-lab", "cuo-lab.js"), "utf8");
const worldSource = fs.readFileSync(path.join(root, "engine", "world-engine.js"), "utf8");
const objectSource = fs.readFileSync(path.join(root, "engine", "object-library.js"), "utf8");
const faunaSource = fs.readFileSync(path.join(root, "engine", "fauna-runtime.js"), "utf8");
const microScenesSource = fs.readFileSync(path.join(root, "engine", "micro-scenes.js"), "utf8");

test("CUO Lab précharge les micro-scènes sans module de déplacement 3D", () => {
  assert.match(labHtml, /id="micro-scene-select"/);
  assert.match(labHtml, /id="load-micro-scene"/);
  assert.match(labHtml, /data\/custom-micro-scenes\.js/);
  assert.match(labHtml, /engine\/micro-scenes\.js/);
  assert.doesNotMatch(labHtml, /cuo-height|guided-traversal|character-controller|path-planner/);
  assert.match(labSource, /function preloadMicroScene\(template\)/);
  assert.match(labSource, /clearSandbox\(\)/);
});

test("une scène préchargée ne peut être enregistrée qu'avec un nouvel identifiant", () => {
  assert.match(labSource, /loadedMicroScene = \{ id: template\.id/);
  assert.match(labSource, /existingIds\.has\(template\.id\)/);
  assert.match(labSource, /la micro-scène source ne sera pas écrasée/);
});

test("le retour au camp suit les passages mémorisés sans charger Crystal directement", () => {
  const start = worldSource.indexOf("returnToBase() {");
  const end = worldSource.indexOf("handlePointer(", start);
  const method = worldSource.slice(start, end);
  assert.match(method, /findKnownRoute\(this\.currentMapId, "crystal"\)/);
  assert.match(method, /this\.navigationRoute = route\.slice\(1\)/);
  assert.match(method, /this\.navigateNextRouteStep\(\)/);
  assert.doesNotMatch(method, /loadMap\("crystal"/);
  assert.doesNotMatch(method, /character\.root\.position\.copy/);
});

test("l'arrivée finale rejoint le refuge à pied", () => {
  assert.match(worldSource, /else if \(this\.returningToBase && this\.currentMapId === "crystal"\)/);
  assert.match(worldSource, /window\.setTimeout\(\(\) => this\.moveToBaseCamp\(\), 450\)/);
  assert.match(worldSource, /this\.character\.setTarget\(camp, "run"\)/);
});

test("FAU-10 dispose d'une boule de paille couleur nid dans le CUO", () => {
  assert.match(objectSource, /id: "FAU-TOOL-S-001"/);
  assert.match(objectSource, /type: "fauna_straw_ball"/);
  assert.match(objectSource, /color: 0x76644f/);
  assert.match(objectSource, /color: 0x5e4a38/);
  assert.match(objectSource, /faunaManipulable = true/);
  assert.match(microScenesSource, /id: "MSC-FAUNA-TOOL-USE-001"/);
  assert.match(microScenesSource, /missionOnly: true/);
  assert.match(microScenesSource, /missionId: "FAU-10"/);
});

test("le brouteur pousse la boule pendant FAU-10 puis pour exactement un slot sur cinq", () => {
  assert.match(faunaSource, /missionStatus\(\)/);
  assert.match(faunaSource, /status === "active"/);
  assert.match(faunaSource, /status !== "completed" \|\| state\.toolUseSlot % 5 !== 0/);
  assert.match(faunaSource, /faunaToolUseOwnerSlot = state\.toolUseSlot/);
  assert.match(faunaSource, /faunaToolUseOwnerSlot !== state\.toolUseSlot/);
  assert.match(faunaSource, /tool\.phase === "approach"/);
  assert.match(faunaSource, /tool\.phase === "push"/);
  assert.match(faunaSource, /ball\.position\.copy\(tool\.ballStart\)\.addScaledVector/);
  assert.match(faunaSource, /animateNosePush/);
  assert.match(faunaSource, /generalizedRate: "1\/5"/);
});
