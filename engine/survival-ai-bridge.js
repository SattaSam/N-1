(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_survival_v1";
  const clamp = (value) =>
    Math.max(0, Math.min(100, Number(value) || 0));
  const clamp01 = (value) =>
    Math.max(0, Math.min(1, Number(value) || 0));
  const clone = (value) =>
    JSON.parse(JSON.stringify(value));

  const FATIGUE_LEVELS = Object.freeze({
    normal: Object.freeze({
      minEnergy: 50,
      movement: 1,
      actionDuration: 1
    }),
    light: Object.freeze({
      minEnergy: 35,
      movement: 0.92,
      actionDuration: 1.1
    }),
    heavy: Object.freeze({
      minEnergy: 25,
      movement: 0.8,
      actionDuration: 1.25
    }),
    critical: Object.freeze({
      minEnergy: 0,
      movement: 0.65,
      actionDuration: 1.5
    })
  });

  const RATION_NUTRITION = Object.freeze({
    foodGain: 45,
    // Une ration aide aussi légèrement à récupérer physiquement, mais moins
    // qu'une micro-pause ou qu'un repos long.
    restGain: 6
  });

  const LONG_REST_RECOVERY = Object.freeze({
    foodGain: 10,
    criticalFoodPerRest: 0.3
  });

  // Zone de régulation autonome : BlueFox commence à récupérer avant
  // d'entrer dans une fatigue pénalisante, sans viser 100 % en permanence.
  const AUTONOMY_RECOVERY = Object.freeze({
    restNeed: 58,
    foodNeed: 52,
    energyRestNeed: 55,
    energyFoodNeed: 48,
    microRestComfort: 62
  });

  const legacyEnergy = () => {
    try {
      const save = JSON.parse(
        global.localStorage.getItem(
          "bluefox_odyssey_save_v1"
        ) || "null"
      );
      return Number.isFinite(Number(save?.energy))
        ? clamp(save.energy)
        : 82;
    } catch {
      return 82;
    }
  };

  const defaultState = () => {
    const initial = legacyEnergy();
    return {
      version: 2,
      rest: initial,
      food: initial,
      safety: initial,
      energy: initial,
      manualPressure: 0,
      lastManualAt: 0,
      updatedAt: Date.now()
    };
  };

  const load = () => {
    const base = defaultState();
    try {
      const saved = JSON.parse(
        global.localStorage.getItem(STORAGE_KEY) ||
          "null"
      );
      if (
        !saved ||
        ![1, 2].includes(saved.version)
      ) {
        return base;
      }
      return {
        ...base,
        ...saved,
        version: 2,
        rest: clamp(saved.rest),
        food: clamp(saved.food),
        safety: clamp(saved.safety),
        manualPressure: Math.max(
          0,
          Number(saved.manualPressure) || 0
        )
      };
    } catch {
      return base;
    }
  };

  const state = load();

  const recalculate = () => {
    state.energy = clamp(
      Math.round(
        state.rest * 0.50 +
        state.food * 0.40 +
        state.safety * 0.10
      )
    );
    state.updatedAt = Date.now();
    return state.energy;
  };

  const publish = (reason) => {
    recalculate();
    global.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
    global.dispatchEvent(
      new CustomEvent("bluefox:survival-changed", {
        detail: {
          reason,
          state: clone(state)
        }
      })
    );
  };

  const interactionCost = Object.freeze({
    collect: 2.2,
    extract: 3,
    analyze: 1.5,
    inspect: 0.8,
    observe: 0.5,
    travel: 1.2
  });

  // Tuning historique R3 réintégré dans le propriétaire Survival.
  // La compensation est appliquée AVANT publish() afin que runtime,
  // événement canonique et sauvegarde décrivent exactement le même état.
  const actionCostCompensation = Object.freeze({
    collect: 0.45,
    extract: 0.65,
    analyze: 0.30,
    inspect: 0.18,
    observe: 0.12,
    travel: 0.25
  });

  const actionAxis = (action) =>
    ["collect", "extract"].includes(action)
      ? "collection"
      : ["observe", "inspect", "analyze"].includes(
          action
        )
        ? "research"
        : action === "travel"
          ? "exploration"
          : "survival";

  const manualAlignment = (axis) => {
    const priorities =
      BF.BAC?.readProfile?.().priorities || null;
    if (!priorities) return "neutral";

    const values = Object.values(priorities)
      .map(Number)
      .filter(Number.isFinite);
    const selected = Number(priorities[axis]);

    if (
      !values.length ||
      !Number.isFinite(selected)
    ) {
      return "neutral";
    }

    const highest = Math.max(...values);
    if (selected >= highest - 8) return "aligned";
    if (selected <= highest - 25) return "opposed";
    return "neutral";
  };

  const weather = () =>
    BF.getWeatherState?.() ||
    BF.currentWeatherState || {
      temperature: 17,
      condition: "Tempéré",
      thermalStress: 0
    };

  const fatigueProfile = () => {
    const energy = recalculate();
    if (energy >= FATIGUE_LEVELS.normal.minEnergy) {
      return {
        level: "normal",
        ...FATIGUE_LEVELS.normal
      };
    }
    if (energy >= FATIGUE_LEVELS.light.minEnergy) {
      return {
        level: "light",
        ...FATIGUE_LEVELS.light
      };
    }
    if (energy >= FATIGUE_LEVELS.heavy.minEnergy) {
      return {
        level: "heavy",
        ...FATIGUE_LEVELS.heavy
      };
    }
    return {
      level: "critical",
      ...FATIGUE_LEVELS.critical
    };
  };

  const recordAction = (
    action,
    source = "autonomy",
    detail = {}
  ) => {
    const baseCost = interactionCost[action] || 1;
    const now = Date.now();

    if (source === "manual") {
      state.manualPressure =
        now - state.lastManualAt < 15000
          ? Math.min(
              6,
              state.manualPressure + 1
            )
          : 1;
      state.lastManualAt = now;
    } else if (source === "autonomy") {
      state.manualPressure = Math.max(
        0,
        state.manualPressure - 0.5
      );
    }

    const alignment =
      source === "manual"
        ? manualAlignment(
            detail.axis || actionAxis(action)
          )
        : "autonomy";

    const manualMultiplier =
      source !== "manual"
        ? 1
        : alignment === "aligned"
          ? 0.55 +
            state.manualPressure * 0.025
          : alignment === "opposed"
            ? 1.9 +
              state.manualPressure * 0.14
            : 0.95 +
              state.manualPressure * 0.055;

    const thermalMultiplier =
      1 +
      clamp01(weather().thermalStress) * 0.55;
    const cost =
      baseCost *
      manualMultiplier *
      thermalMultiplier;

    const restBefore = state.rest;
    const foodBefore = state.food;

    state.rest = clamp(state.rest - cost);
    state.food = clamp(
      state.food - cost * 0.42
    );

    const compensation =
      actionCostCompensation[action] || 0;
    if (compensation > 0) {
      const restLoss = Math.max(
        0,
        restBefore - state.rest
      );
      const foodLoss = Math.max(
        0,
        foodBefore - state.food
      );
      state.rest = clamp(
        state.rest + restLoss * compensation
      );
      state.food = clamp(
        state.food + foodLoss * compensation
      );
    }

    publish(
      `action:${action}:${source}:${alignment}`
    );
    return state.energy;
  };

  const recoverRest = (
    amount,
    reason = "rest",
    pressureReduction = 0
  ) => {
    const gain = Math.max(
      0,
      Number(amount) || 0
    );
    if (!gain && !pressureReduction) {
      return state.energy;
    }

    state.rest = clamp(state.rest + gain);
    state.manualPressure = Math.max(
      0,
      state.manualPressure -
        Math.max(
          0,
          Number(pressureReduction) || 0
        )
    );

    publish(reason);
    return state.energy;
  };

  const completeRoutine = (
    routine,
    detail = {}
  ) => {
    if (routine === "rest") {
      state.rest = clamp(
        state.rest +
          (
            Number.isFinite(
              Number(detail.restGain)
            )
              ? Number(detail.restGain)
              : 24
          )
      );
      state.food = clamp(
        state.food +
          (
            Number.isFinite(
              Number(detail.foodGain)
            )
              ? Math.max(0, Number(detail.foodGain))
              : LONG_REST_RECOVERY.foodGain
          )
      );
      state.manualPressure = Math.max(
        0,
        state.manualPressure -
          Math.max(
            0,
            Number(detail.pressureReduction) ||
              2
          )
      );
    } else if (routine === "micro-rest") {
      state.rest = clamp(
        state.rest +
          Math.max(
            1.5,
            Number(detail.restGain) || 3.2
          )
      );
      state.manualPressure = Math.max(
        0,
        state.manualPressure - 0.75
      );
    } else if (
      routine === "critical-rest"
    ) {
      const targetEnergy = Math.max(
        30,
        Number(detail.targetEnergy) || 33
      );
      let guard = 0;
      while (
        (
          state.rest < 45 ||
          recalculate() < targetEnergy
        ) &&
        state.rest < 100 &&
        guard < 100
      ) {
        state.rest = clamp(state.rest + 1);
        state.food = clamp(
          state.food +
            LONG_REST_RECOVERY.criticalFoodPerRest
        );
        guard += 1;
      }
      state.manualPressure = Math.max(
        0,
        state.manualPressure - 3
      );
    } else if (routine === "food") {
      const removed =
        BF.Rations?.consume?.(1, {
          reason: detail.offline
            ? "offline-eat"
            : "eat",
          automatic:
            detail.automatic !== false
        }) || 0;

      if (!removed) {
        publish("routine:food-unavailable");
        global.dispatchEvent(
          new CustomEvent(
            "bluefox:ration-unavailable",
            {
              detail: {
                reason: "food-routine",
                state:
                  BF.Rations?.snapshot?.() ||
                  null
              }
            }
          )
        );
        return state.energy;
      }

      state.food = clamp(
        state.food +
          RATION_NUTRITION.foodGain
      );
      state.rest = clamp(
        state.rest +
          RATION_NUTRITION.restGain
      );
    } else if (routine === "research") {
      state.rest = clamp(
        state.rest - 1.5
      );
      state.food = clamp(
        state.food - 0.8
      );
    }

    publish(`routine:${routine}`);
    return state.energy;
  };

  const applyHazard = (
    hazard,
    pressure = {}
  ) => {
    const restCost = Math.max(
      0,
      Number(pressure.rest) || 0
    );
    const foodCost = Math.max(
      0,
      Number(pressure.food) || 0
    );
    const safetyCost = Math.max(
      0,
      Number(pressure.safety) || 0
    );

    if (
      !restCost &&
      !foodCost &&
      !safetyCost
    ) {
      return state.energy;
    }

    state.rest = clamp(
      state.rest - restCost
    );
    state.food = clamp(
      state.food - foodCost
    );
    state.safety = clamp(
      state.safety - safetyCost
    );

    publish(
      `hazard:${String(
        hazard || "environment"
      )}`
    );
    return state.energy;
  };

  const normalizeSafeSiteMarker = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const safeSiteMapIds = () => {
    const ids = new Set(["crystal"]);
    const sites =
      BF.currentEngine?.missionManager?.memory?.state
        ?.siteProgression || {};

    Object.values(sites).forEach((site) => {
      if (!site?.mapId || site.persistent === false) return;
      const marker = normalizeSafeSiteMarker([
        site.kind,
        site.stage,
        site.microSceneId,
        site.missionId
      ].filter(Boolean).join(" "));
      if (/(^|[^a-z])(camp|refuge|base)([^a-z]|$)/.test(marker)) {
        ids.add(site.mapId);
      }
    });
    return [...ids];
  };

  const mapTransitionDistance = (fromMapId, toMapId) => {
    if (!fromMapId || !toMapId) return Infinity;
    if (fromMapId === toMapId) return 0;

    const visited = new Set([fromMapId]);
    const queue = [{ mapId: fromMapId, distance: 0 }];
    while (queue.length) {
      const current = queue.shift();
      const definition = BF.maps?.[current.mapId];
      const exits = {
        ...(definition?.exits || {}),
        ...(definition?.runtimeExits || {})
      };
      for (const exit of Object.values(exits)) {
        const targetMap = exit?.targetMap;
        if (!targetMap || visited.has(targetMap)) continue;
        if (targetMap === toMapId) return current.distance + 1;
        visited.add(targetMap);
        queue.push({
          mapId: targetMap,
          distance: current.distance + 1
        });
      }
    }
    return Infinity;
  };

  const nearestSafeSiteDistance = () => {
    const currentMapId = BF.currentEngine?.currentMapId;
    if (!currentMapId) return null;

    let nearest = Infinity;
    safeSiteMapIds().forEach((mapId) => {
      nearest = Math.min(
        nearest,
        mapTransitionDistance(currentMapId, mapId)
      );
    });
    return Number.isFinite(nearest) ? nearest : null;
  };

  const safetyTarget = () => {
    if (BF.canAccessCampInventory?.()) return 100;

    const distance = nearestSafeSiteDistance();
    if (distance == null) return 92;
    if (distance <= 0) return 96;
    if (distance === 1) return 92;
    if (distance === 2) return 87;
    if (distance === 3) return 82;
    return Math.max(62, 82 - (distance - 3) * 4);
  };

  const updateSafety = () => {
    const target = safetyTarget();
    const next =
      state.safety +
      (target - state.safety) * 0.08;

    if (
      Math.abs(next - state.safety) <
      0.25
    ) {
      return false;
    }

    state.safety = clamp(next);
    publish("safety");
    return true;
  };

  const snapshot = () => {
    const profile = fatigueProfile();
    const rationState =
      BF.Rations?.snapshot?.() || {
        rations: 0
      };

    return {
      ...clone(state),
      fatigue: profile,
      weather: { ...weather() },
      rations: rationState,
      needs: {
        rest:
          state.rest < AUTONOMY_RECOVERY.restNeed ||
          state.energy < AUTONOMY_RECOVERY.energyRestNeed,
        food:
          state.food < AUTONOMY_RECOVERY.foodNeed ||
          state.energy < AUTONOMY_RECOVERY.energyFoodNeed,
        preventiveMicroRest:
          state.rest < AUTONOMY_RECOVERY.microRestComfort ||
          state.energy < AUTONOMY_RECOVERY.microRestComfort,
        criticalRest:
          state.rest < 25 ||
          state.energy < 25,
        rations: Boolean(
          BF.RationPolicy
            ?.profile?.()
            ?.shouldCraft
        )
      }
    };
  };

  let lastExposureAt = Date.now();

  const applyEnvironmentalExposure = () => {
    const now = Date.now();
    if (now - lastExposureAt < 30000) {
      return false;
    }
    lastExposureAt = now;

    const currentWeather = weather();
    const stress = clamp01(
      currentWeather.thermalStress
    );
    if (stress <= 0) return false;

    state.rest = clamp(
      state.rest - stress * 0.9
    );
    state.food = clamp(
      state.food - stress * 0.25
    );
    publish(
      `weather:${currentWeather.condition}:${currentWeather.temperature}`
    );
    return true;
  };

  const renderEnergy = () => {
    const meter = document.querySelector(
      ".survival-energy-meter"
    );
    if (!meter) return false;

    const current = snapshot();
    const label =
      meter.querySelector("span");
    const value =
      meter.querySelector("b");
    const fill =
      meter.querySelector("em");
    const energyText =
      `${Math.round(current.energy)}%`;

    if (
      label &&
      label.textContent !== "ÉNERGIE"
    ) {
      label.textContent = "ÉNERGIE";
    }
    if (
      value &&
      value.textContent !== energyText
    ) {
      value.textContent = energyText;
    }

    if (fill) {
      const width =
        `${current.energy}%`;
      const className =
        current.energy < 25
          ? "energy-critical"
          : current.energy < 50
            ? "energy-low"
            : "energy-healthy";

      if (fill.style.width !== width) {
        fill.style.width = width;
      }
      if (fill.className !== className) {
        fill.className = className;
      }
    }

    const title =
      `Repos ${Math.round(current.rest)} % · ` +
      `Alimentation ${Math.round(current.food)} % · ` +
      `Sécurité ${Math.round(current.safety)} % · ` +
      `${current.weather.condition} ` +
      `${Math.round(current.weather.temperature)} °C`;

    if (meter.title !== title) {
      meter.title = title;
    }
    return true;
  };

  BF.survival = Object.freeze({
    state,
    snapshot,
    fatigueProfile,
    recordAction,
    recoverRest,
    completeRoutine,
    applyHazard,
    updateSafety,
    applyEnvironmentalExposure,
    save: () => publish("manual-save")
  });

  BF.getSurvivalState = snapshot;

  BF.ObjectEvents?.subscribe?.((event) => {
    const mode =
      event.detail?.interactionMode;
    if (
      !mode ||
      !interactionCost[mode]
    ) {
      return;
    }
    recordAction(
      mode,
      event.detail
        ?.interactionSource ||
        "autonomy",
      {
        axis: actionAxis(mode)
      }
    );
  });

  global.addEventListener(
    "bluefox:navigate",
    () =>
      recordAction(
        "travel",
        "manual",
        { axis: "exploration" }
      )
  );

  global.addEventListener(
    "bluefox:survival-changed",
    renderEnergy
  );
  global.addEventListener(
    "bluefox:mission-state",
    renderEnergy
  );
  global.addEventListener(
    "bluefox:weather-changed",
    renderEnergy
  );

  const observer =
    new MutationObserver(renderEnergy);
  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

  global.setInterval(() => {
    updateSafety();
    applyEnvironmentalExposure();
    renderEnergy();
  }, 2000);

  global.setTimeout(() => {
    publish("initialized");
    renderEnergy();
  }, 0);
})(window);
