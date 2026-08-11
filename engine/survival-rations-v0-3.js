(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_personal_consumables_v1";
  const VERSION = 1;

  const CONFIG = Object.freeze({
    rationKey: "ration",
    maxRations: 50,
    criticalMax: 3,
    lowMax: 11,
    acceptableMax: 25,
    recipe: Object.freeze({
      id: "ration-basic-v2",
      ingredients: Object.freeze({
        fiber: 2,
        adaptive_biomass: 1
      })
    }),
    nutrition: Object.freeze({
      foodGain: 40,
      restGain: 10
    }),
    offline: Object.freeze({
      collectionIntervalMs: 20 * 60 * 1000,
      maxPlantCollectionsPerSession: 12,
      preferredRestGainPerHour: 6,
      craftTarget: 12
    })
  });

  const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, Number(value) || 0));
  const clone = (value) => JSON.parse(JSON.stringify(value));

  const defaultState = () => ({
    version: VERSION,
    rations: 0,
    recipeUnlocked: false,
    craftedTotal: 0,
    consumedTotal: 0,
    updatedAt: Date.now()
  });

  const load = () => {
    const base = defaultState();
    try {
      const saved = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || Number(saved.version) !== VERSION) return base;
      return {
        ...base,
        ...saved,
        version: VERSION,
        rations: clamp(saved.rations, 0, CONFIG.maxRations),
        craftedTotal: Math.max(0, Number(saved.craftedTotal) || 0),
        consumedTotal: Math.max(0, Number(saved.consumedTotal) || 0)
      };
    } catch {
      return base;
    }
  };

  let state = load();

  const saveState = (reason = "save") => {
    state.rations = clamp(state.rations, 0, CONFIG.maxRations);
    state.updatedAt = Date.now();
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    global.dispatchEvent(new CustomEvent("bluefox:rations-changed", {
      detail: { reason, state: clone(state), profile: needProfile() }
    }));
    return snapshot();
  };

  const snapshot = () => ({
    ...clone(state),
    maxRations: CONFIG.maxRations,
    slotCost: 0,
    autoDeposit: false,
    profile: needProfile()
  });

  function needProfile() {
    const count = clamp(state.rations, 0, CONFIG.maxRations);
    if (count <= CONFIG.criticalMax) {
      return { level: "critical", targetMin: 12, targetComfort: 25, shouldCollect: true, shouldCraft: true };
    }
    if (count <= CONFIG.lowMax) {
      return { level: "low", targetMin: 12, targetComfort: 25, shouldCollect: true, shouldCraft: true };
    }
    if (count <= CONFIG.acceptableMax) {
      return { level: "acceptable", targetMin: 12, targetComfort: 25, shouldCollect: false, shouldCraft: false };
    }
    if (count < CONFIG.maxRations) {
      return { level: "comfortable", targetMin: 12, targetComfort: 25, shouldCollect: false, shouldCraft: false };
    }
    return { level: "max", targetMin: 12, targetComfort: 25, shouldCollect: false, shouldCraft: false };
  }

  const rationIngredientKeys = () =>
    Object.keys(CONFIG.recipe.ingredients);

  const floraInventoryKeys = () => rationIngredientKeys();

  const progressionState = () => BF.getProgressionState?.() || {};
  const amountForKey = (key) => {
    const progression = progressionState();
    return (Number(progression.inventory?.[key]) || 0) +
      (Number(progression.campStorage?.[key]) || 0);
  };

  const canCraftFromPlants = (count = 1) => {
    const requested = Math.max(1, Math.floor(Number(count) || 1));
    return Object.entries(CONFIG.recipe.ingredients).every(
      ([key, quantity]) => amountForKey(key) >= quantity * requested
    );
  };

  const campAccessible = () => {
    if (typeof BF.canAccessCampInventory === "function") {
      return BF.canAccessCampInventory() === true;
    }
    const site = BF.currentEngine?.missionManager?.memory?.state?.siteProgression?.[
      BF.currentEngine?.currentMapId
    ];
    return Number(site?.stage) >= 1;
  };

  const consumePlantRecipe = () => {
    if (!canCraftFromPlants(1)) return false;
    for (const [key, quantity] of Object.entries(CONFIG.recipe.ingredients)) {
      const removed = BF.consumeInventoryPool?.([key], quantity) || 0;
      if (removed !== quantity) return false;
    }
    return true;
  };

  const craft = (count = 1, options = {}) => {
    const requested = Math.max(1, Math.floor(Number(count) || 1));
    const availableCapacity = CONFIG.maxRations - state.rations;
    const target = Math.min(requested, availableCapacity);
    if (target <= 0) return 0;

    const offline = options.offline === true;
    const requireCamp = options.requireCamp !== false;
    if (!offline && requireCamp && !campAccessible()) return 0;

    let crafted = 0;
    while (crafted < target && canCraftFromPlants(1)) {
      if (!consumePlantRecipe()) break;
      state.rations += 1;
      state.craftedTotal += 1;
      state.recipeUnlocked = true;
      crafted += 1;
    }

    if (crafted > 0) {
      saveState(offline ? "offline-craft" : "craft");
      global.dispatchEvent(new CustomEvent("bluefox:ration-crafted", {
        detail: { quantity: crafted, total: state.rations, offline }
      }));
    }
    return crafted;
  };

  const add = (count = 1, reason = "grant") => {
    const before = state.rations;
    state.rations = clamp(state.rations + Math.max(0, Number(count) || 0), 0, CONFIG.maxRations);
    const added = state.rations - before;
    if (added > 0) {
      state.craftedTotal += added;
      saveState(reason);
    }
    return added;
  };

  const consume = (count = 1, options = {}) => {
    const requested = Math.max(1, Math.floor(Number(count) || 1));
    const removed = Math.min(state.rations, requested);
    if (!removed) return 0;
    state.rations -= removed;
    state.consumedTotal += removed;
    saveState(options.reason || "consume");
    global.dispatchEvent(new CustomEvent("bluefox:ration-consumed", {
      detail: { quantity: removed, total: state.rations, automatic: options.automatic === true }
    }));
    return removed;
  };

  const reset = () => {
    state = defaultState();
    global.localStorage.removeItem(STORAGE_KEY);
    saveState("reset");
    return snapshot();
  };

  BF.Rations = Object.freeze({
    config: CONFIG,
    snapshot,
    needProfile,
    floraInventoryKeys,
    canCraft: canCraftFromPlants,
    craft,
    add,
    consume,
    reset,
    unlockRecipe: () => {
      if (state.recipeUnlocked) return false;
      state.recipeUnlocked = true;
      saveState("recipe-unlocked");
      return true;
    }
  });

  BF.getRationState = snapshot;
  BF.craftRations = craft;
  BF.consumeRations = consume;

  // Étend le système de survie existant sans remplacer son état canonique.
  const legacySurvival = BF.survival;
  if (legacySurvival) {
    const legacySnapshot = BF.getSurvivalState?.bind(BF);
    const originalCompleteRoutine = legacySurvival.completeRoutine?.bind(legacySurvival);

    const extendedSnapshot = () => {
      const base = legacySnapshot?.() || {};
      const rationState = snapshot();
      return {
        ...base,
        rations: rationState,
        needs: {
          ...(base.needs || {}),
          rations: rationState.profile.level === "critical" || rationState.profile.level === "low"
        }
      };
    };

    const completeRoutine = (routine, detail = {}) => {
      if (routine !== "food") {
        return originalCompleteRoutine?.(routine, detail);
      }

      const removed = consume(1, {
        reason: detail.offline ? "offline-eat" : "eat",
        automatic: detail.automatic !== false
      });
      if (!removed) {
        legacySurvival.save?.();
        global.dispatchEvent(new CustomEvent("bluefox:ration-unavailable", {
          detail: { reason: "food-routine", state: snapshot() }
        }));
        return extendedSnapshot().energy;
      }

      legacySurvival.state.food = clamp(
        legacySurvival.state.food + CONFIG.nutrition.foodGain,
        0,
        100
      );
      legacySurvival.state.rest = clamp(
        legacySurvival.state.rest + CONFIG.nutrition.restGain,
        0,
        100
      );
      legacySurvival.save?.();
      return extendedSnapshot().energy;
    };

    BF.survival = Object.freeze({
      ...legacySurvival,
      snapshot: extendedSnapshot,
      completeRoutine,
      rationState: snapshot,
      rationConfig: CONFIG,
      craftRations: craft,
      consumeRations: consume,
      reset: () => {
        reset();
        const base = legacySurvival.state;
        const initial = 82;
        base.rest = initial;
        base.food = initial;
        base.safety = initial;
        base.energy = initial;
        base.manualPressure = 0;
        base.lastManualAt = 0;
        legacySurvival.save?.();
        return extendedSnapshot();
      }
    });
    BF.getSurvivalState = extendedSnapshot;
  }

  // Ajoute l'exécution CRAFT(ration) aux missions sans toucher ActionBridge.
  const ActionBridge = BF.Missions?.ActionBridge;
  if (ActionBridge?.prototype && !ActionBridge.prototype.__rationCraftV01) {
    const originalExecute = ActionBridge.prototype.execute;
    ActionBridge.prototype.execute = function executeWithRations(action, now) {
      const craftType = BF.Missions?.ActionType?.CRAFT || "craft";
      const recipe = String(action?.params?.recipe || action?.params?.kind || "").toLowerCase();
      if (action?.type === craftType && ["ration", "rations", "ration-basic-v1"].includes(recipe)) {
        if (this.isEngineBusy()) return false;
        const quantity = Math.max(1, Number(action?.params?.quantity || action?.params?.amount) || 1);
        const crafted = craft(quantity, { requireCamp: true });
        if (!crafted) return false;
        this.engine?.callbacks?.onAction?.(
          `BlueFox prépare ${crafted} ration${crafted > 1 ? "s" : ""}.`
        );
        global.dispatchEvent(new CustomEvent("bluefox:mission-craft", {
          detail: { recipe: "ration", quantity: crafted, at: Date.now() }
        }));
        return true;
      }
      return originalExecute.call(this, action, now);
    };
    ActionBridge.prototype.__rationCraftV01 = true;
  }

  // Progression hors ligne : privilégier la récupération, collecter de la flore,
  // puis fabriquer des rations jusqu'au seuil minimal raisonnable (12).
  const emitOfflinePlant = (inventoryKey, index, mapId) => {
    const type = BF.ObjectEvents?.types?.RESOURCE_COLLECTED || "resource_collected";
    BF.progression?.consume?.({
      id: `offline-ration-plant-${Date.now()}-${index}-${inventoryKey}`,
      type,
      quantity: 1,
      family: inventoryKey,
      inventoryKey,
      mapId: mapId || "crystal",
      objectId: `offline-flora-${inventoryKey}`,
      instanceId: `offline-${mapId || "crystal"}-${inventoryKey}-${Date.now()}-${index}`,
      detail: { offline: true, inventoryKey, kind: inventoryKey, source: "survival-rations-v0-3" },
      at: Date.now()
    });
  };

  const processOffline = (detail = {}) => {
    const durationMs = Math.max(0, Number(detail.durationMs) || 0);
    if (!durationMs) return;

    const hours = durationMs / 3600000;
    const survival = BF.survival;
    if (survival?.state) {
      survival.state.rest = clamp(
        survival.state.rest + hours * CONFIG.offline.preferredRestGainPerHour,
        0,
        100
      );
    }

    const profile = needProfile();
    const keys = floraInventoryKeys();
    if (profile.shouldCollect && keys.length >= 2) {
      const collectionBudget = Math.min(
        CONFIG.offline.maxPlantCollectionsPerSession,
        Math.max(0, Math.floor(durationMs / CONFIG.offline.collectionIntervalMs))
      );
      const recipeCycle = ["fiber", "fiber", "adaptive_biomass"];
      for (let i = 0; i < collectionBudget; i += 1) {
        emitOfflinePlant(recipeCycle[i % recipeCycle.length], i, detail.mapId);
      }
    }

    if (state.rations < CONFIG.offline.craftTarget) {
      craft(CONFIG.offline.craftTarget - state.rations, {
        offline: true,
        requireCamp: false
      });
    }

    // L'absence est un moment favorable à la récupération : si l'alimentation
    // est basse et que des rations existent, BlueFox peut en consommer.
    if (survival?.state) {
      let guard = 0;
      while (
        survival.state.food < 65 &&
        state.rations > 0 &&
        guard < 4
      ) {
        survival.completeRoutine?.("food", { offline: true, automatic: true });
        guard += 1;
      }
      survival.save?.();
    }

    global.dispatchEvent(new CustomEvent("bluefox:offline-survival-rations", {
      detail: {
        durationMs,
        rations: snapshot(),
        energy: BF.getSurvivalState?.().energy ?? null
      }
    }));
  };

  global.addEventListener("bluefox:offline-progress", (event) =>
    processOffline(event.detail || {})
  );

  // API diagnostic pratique pour les tests console.
  BF.getRationDiagnostics = () => ({
    version: "survival-rations-v0.3",
    state: snapshot(),
    floraKeys: floraInventoryKeys(),
    canCraftOne: canCraftFromPlants(1),
    campAccessible: campAccessible(),
    survival: BF.getSurvivalState?.() || null
  });

  saveState("initialized");
})(window);
