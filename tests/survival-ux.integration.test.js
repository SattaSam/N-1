const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function fixture(priorities, inventory = {}) {
  const listeners = new Map();
  const storage = new Map();
  class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  }
  class MutationObserver { observe() {} }
  const progression = { inventory: { ...inventory }, campStorage: {} };
  const window = {
    BlueFox3D: {
      BAC: { readProfile: () => ({ priorities }) },
      ObjectLibrary: {
        list: () => [
          { type: "fiber", knowledge: { family: "flora" }, resource: { family: "fiber", inventoryKey: "fiber" } },
          { type: "adaptive_plant", knowledge: { family: "flora" }, resource: { family: "biomass", inventoryKey: "adaptive_biomass" } }
        ]
      },
      getProgressionState: () => JSON.parse(JSON.stringify(progression)),
      consumeInventoryPool(keys, amount) {
        let remaining = amount;
        for (const key of keys) {
          const removed = Math.min(Number(progression.inventory[key]) || 0, remaining);
          progression.inventory[key] = (Number(progression.inventory[key]) || 0) - removed;
          remaining -= removed;
        }
        return amount - remaining;
      }
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value))
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    dispatchEvent(event) {
      (listeners.get(event.type) || []).forEach((listener) => listener(event));
    },
    setInterval: () => 0,
    setTimeout: (callback) => { callback(); return 0; }
  };
  const document = { querySelector: () => null, documentElement: {} };
  const context = vm.createContext({
    window, document, CustomEvent, MutationObserver,
    console, setInterval: window.setInterval, setTimeout: window.setTimeout
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "engine/survival-ai-bridge.js"), "utf8"),
    context,
    { filename: "engine/survival-ai-bridge.js" }
  );
  return { BF: window.BlueFox3D, progression };
}

test("une action manuelle alignée fatigue nettement moins qu'une action opposée", () => {
  const aligned = fixture({ collection: 80, exploration: 40, research: 35, relations: 35, survival: 35 }).BF;
  const opposed = fixture({ collection: 10, exploration: 80, research: 45, relations: 45, survival: 45 }).BF;
  const alignedBefore = aligned.getSurvivalState().energy;
  const opposedBefore = opposed.getSurvivalState().energy;
  aligned.survival.recordAction("collect", "manual", { axis: "collection" });
  opposed.survival.recordAction("collect", "manual", { axis: "collection" });
  const alignedLoss = alignedBefore - aligned.getSurvivalState().energy;
  const opposedLoss = opposedBefore - opposed.getSurvivalState().energy;
  assert.ok(opposedLoss >= alignedLoss * 2);
});

test("BlueFox peut fabriquer et consommer une ration à partir de deux plantes", () => {
  const { BF, progression } = fixture(
    { collection: 45, exploration: 45, research: 45, relations: 45, survival: 45 },
    { fiber: 2, adaptive_biomass: 2 }
  );
  BF.survival.state.food = 30;
  assert.equal(BF.survival.canConsumeRation(), true);
  BF.survival.completeRoutine("food");
  assert.equal(progression.inventory.fiber + progression.inventory.adaptive_biomass, 0);
  assert.ok(BF.survival.state.food >= 58);
});

test("les correctifs CSS masquent les commandes 3D au-dessus des menus", () => {
  const css = fs.readFileSync(
    path.join(__dirname, "..", "engine/ui-enhancements.css"),
    "utf8"
  );
  assert.match(css, /body:has\(\.drawer, \.full-screen-panel\) \.bluefox-camera-button/);
  assert.match(css, /\.intent-bar\.bluefox-intent-ready/);
  assert.match(css, /\.intent-bar\s*\{[\s\S]*?right:\s*14px\s*!important/);
  assert.match(css, /height:\s*auto\s*!important/);
  assert.match(css, /\.intent-bar strong\s*\{[\s\S]*?white-space:\s*normal/);
  assert.doesNotMatch(css.match(/\.intent-bar strong\s*\{[\s\S]*?\}/)?.[0] || "", /text-overflow:\s*ellipsis/);
});
