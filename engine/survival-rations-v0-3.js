(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_personal_consumables_v1";
  const VERSION = 2;
  const MAX_RATIONS = 50;

  const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, Number(value) || 0));
  const clone = (value) =>
    JSON.parse(JSON.stringify(value));

  const defaultState = () => ({
    version: VERSION,
    rations: 0,
    craftedTotal: 0,
    consumedTotal: 0,
    credits: {},
    updatedAt: Date.now()
  });

  const load = () => {
    const base = defaultState();
    try {
      const saved = JSON.parse(
        global.localStorage.getItem(STORAGE_KEY) || "null"
      );
      if (
        !saved ||
        ![1, VERSION].includes(Number(saved.version))
      ) {
        return base;
      }
      return {
        ...base,
        credits: saved.credits && typeof saved.credits === "object" ? saved.credits : {},
        rations: clamp(saved.rations, 0, MAX_RATIONS),
        craftedTotal: Math.max(
          0,
          Number(saved.craftedTotal) || 0
        ),
        consumedTotal: Math.max(
          0,
          Number(saved.consumedTotal) || 0
        )
      };
    } catch {
      return base;
    }
  };

  let state = load();

  const snapshot = () => ({
    ...clone(state),
    maxRations: MAX_RATIONS,
    slotCost: 0,
    autoDeposit: false
  });

  const add = (count = 1, reason = "grant", options = {}) => {
    const quantity = Math.max(0, Number(count) || 0);
    const id = String(options.transactionId || "");
    const previous = id && state.credits[id];
    if (previous) return previous.quantity === quantity ? quantity : 0;
    if (id && state.rations + quantity > MAX_RATIONS) return 0;
    const before = clone(state);
    state.rations = clamp(state.rations + quantity, 0, MAX_RATIONS);
    const added = state.rations - before.rations;
    if (added > 0) {
      state.craftedTotal += added;
      state.updatedAt = Date.now();
      if (id) state.credits[id] = { quantity: added, at: Date.now() };
      try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
      catch { state = before; return 0; }
      global.dispatchEvent(new CustomEvent("bluefox:rations-changed", {
        detail: { reason, transactionId: id || null, state: snapshot() }
      }));
    }
    return added;
  };

  const consume = (count = 1, options = {}) => {
    if (Number(BF.getSurvivalState?.().energy) >= 100) return 0;
    if (
      options.automatic === true &&
      BF.isTutorialSurvivalCapabilityUnlocked?.("ration-consume") !== true
    ) return 0;

    const requested = Math.max(
      1,
      Math.floor(Number(count) || 1)
    );
    const removed = Math.min(
      state.rations,
      requested
    );
    if (!removed) return 0;

    const before = clone(state);
    state.rations -= removed;
    state.consumedTotal += removed;
    state.updatedAt = Date.now();
    try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { state = before; return 0; }
    global.dispatchEvent(new CustomEvent("bluefox:rations-changed", {
      detail: { reason: options.reason || "consume", state: snapshot() }
    }));

    global.dispatchEvent(
      new CustomEvent("bluefox:ration-consumed", {
        detail: {
          quantity: removed,
          total: state.rations,
          automatic: options.automatic === true
        }
      })
    );
    return removed;
  };

  const reset = () => {
    state = defaultState();
    global.localStorage.removeItem(STORAGE_KEY);
    return snapshot();
  };

  BF.Rations = Object.freeze({
    snapshot,
    add,
    consume,
    reset,
    maxRations: MAX_RATIONS
  });

  BF.getRationState = snapshot;
  BF.consumeRations = consume;

  BF.getRationDiagnostics = () => ({
    state: snapshot(),
    recipeSource: "Bible mission rewards",
    autonomySource: "BAC survival policy"
  });
})(window);
