const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const BASE_REF = "475cf10431df349fb8d1c244f43624f4e54d70d6";

function current(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function base(rel) {
  try {
    return execFileSync(
      "git",
      ["show", `${BASE_REF}:${rel}`],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
  } catch (error) {
    const detail = String(error?.stderr || error?.message || error);
    assert.fail(`Impossible de lire la BASE Git ${BASE_REF}:${rel}\n${detail}`);
  }
}

function block(source, start, end) {
  const i = source.indexOf(start);
  const j = source.indexOf(end, i);
  assert(i >= 0 && j > i, `${start} -> ${end}`);
  return source.slice(i, j);
}

function count(source, re) {
  return (source.match(re) || []).length;
}

const baseCatalog = base("data/bible-catalog.js");
const candidateCatalog = current("data/bible-catalog.js");
const baseFauna = base("engine/fauna-runtime.js");
const candidateFauna = current("engine/fauna-runtime.js");

// 1) FAU-01..12 historiques : byte-identical par rapport au HEAD canonique.
// R3 peut ajouter ses missions après FAU-12 sans altérer FAU-12 elle-même.
for (let n = 1; n <= 12; n += 1) {
  const id = String(n).padStart(2, "0");
  const start = `  const FAU${id} =`;
  const end = n < 12
    ? `  const FAU${String(n + 1).padStart(2, "0")} =`
    : "  const T04 =";

  const expected = block(baseCatalog, start, end);
  let actual = block(candidateCatalog, start, end);

  if (n === 12) {
    const inserted = actual.indexOf("\n  const FAU01A =");
    if (inserted >= 0) actual = actual.slice(0, inserted) + "\n";
  }
  assert.strictEqual(actual, expected, `FAU-${id} changed`);
}

// 2) Producteurs R2 critiques : byte-identical comme dans la sentinelle d'origine.
for (const [start, end] of [
  ["  const updateToolUse =", "  const isNight ="],
  ["  const emitCalmFacts =", "  const updateObservedBehavior ="],
  ["  const updateObservedBehavior =", "  const peacefulSceneMembers ="],
  ["  const updatePeacefulGroupObservation =", "  const parentalYoungState ="],
  ["  const updateParentalProtection =", "  const updateApproach ="],
  ["  const animateMovement =", "  const update ="]
]) {
  assert.strictEqual(
    block(candidateFauna, start, end),
    block(baseFauna, start, end),
    `${start} regressed`
  );
}

// 3) Aucun polling supplémentaire dans les fichiers historiquement surveillés.
for (const rel of [
  "engine/fauna-runtime.js",
  "engine/settings-ui-bridge.js",
  "engine/bible-runtime-v0-1-unified.js"
]) {
  assert.strictEqual(
    count(current(rel), /setInterval\s*\(/g),
    count(base(rel), /setInterval\s*\(/g),
    `${rel} added setInterval`
  );
}

// 4) La famille GAME-contact ne doit pas être détournée par ce chantier.
assert.ok(
  !candidateCatalog.includes("GAME-contact_ambassador —"),
  "GAME-contact family repurposed"
);

console.log("PASS fau-r3 static non-regression against canonical Git BASE");
