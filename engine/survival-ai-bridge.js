(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_survival_v1";
  const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
  const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
  const clone = (value) => JSON.parse(JSON.stringify(value));

  const FATIGUE_LEVELS = Object.freeze({
    normal: Object.freeze({ minEnergy: 50, movement: 1, actionDuration: 1 }),
    light: Object.freeze({ minEnergy: 35, movement: 0.92, actionDuration: 1.1 }),
    heavy: Object.freeze({ minEnergy: 25, movement: 0.8, actionDuration: 1.25 }),
    critical: Object.freeze({ minEnergy: 0, movement: 0.65, actionDuration: 1.5 })
  });
  const RATION_RECIPE = Object.freeze({
    output: "ration",
    totalPlants: 4,
    minimumDistinctPlantTypes: 2,
    implemented: false
  });

  const legacyEnergy = () => {
    try {
      const save = JSON.parse(global.localStorage.getItem("bluefox_odyssey_save_v1") || "null");
      return Number.isFinite(Number(save?.energy)) ? clamp(save.energy) : 82;
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
      const saved = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || ![1, 2].includes(saved.version)) return base;
      return {
        ...base,
        ...saved,
        version: 2,
        rest: clamp(saved.rest),
        food: clamp(saved.food),
        safety: clamp(saved.safety),
        manualPressure: Math.max(0, Number(saved.manualPressure) || 0)
      };
    } catch {
      return base;
    }
  };

  const state = load();
  const recalculate = () => {
    state.energy = clamp(Math.round(
      state.rest * 0.55 + state.food * 0.32 + state.safety * 0.13
    ));
    state.updatedAt = Date.now();
    return state.energy;
  };
  const publish = (reason) => {
    recalculate();
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    global.dispatchEvent(new CustomEvent("bluefox:survival-changed", {
      detail: { reason, state: clone(state) }
    }));
  };

  const interactionCost = Object.freeze({
    collect: 3.2,
    extract: 4.2,
    analyze: 2.4,
    inspect: 1.2,
    observe: 0.8
  });

  const weather = () => BF.getWeatherState?.() || BF.currentWeatherState || {
    temperature: 17,
    condition: "Tempéré",
    thermalStress: 0
  };

  const fatigueProfile = () => {
    const energy = recalculate();
    if (energy >= FATIGUE_LEVELS.normal.minEnergy) {
      return { level: "normal", ...FATIGUE_LEVELS.normal };
    }
    if (energy >= FATIGUE_LEVELS.light.minEnergy) {
      return { level: "light", ...FATIGUE_LEVELS.light };
    }
    if (energy >= FATIGUE_LEVELS.heavy.minEnergy) {
      return { level: "heavy", ...FATIGUE_LEVELS.heavy };
    }
    return { level: "critical", ...FATIGUE_LEVELS.critical };
  };

  const recordAction = (action, source = "autonomy") => {
    const baseCost = interactionCost[action] || 1;
    const now = Date.now();
    if (source === "manual") {
      state.manualPressure = now - state.lastManualAt < 15000
        ? Math.min(6, state.manualPressure + 1)
        : 1;
      state.lastManualAt = now;
    } else if (source === "autonomy") {
      state.manualPressure = Math.max(0, state.manualPressure - 0.5);
    }
    const manualMultiplier = source === "manual"
      ? 1.35 + state.manualPressure * 0.12
      : 1;
    const thermalMultiplier = 1 + clamp01(weather().thermalStress) * 0.55;
    const cost = baseCost * manualMultiplier * thermalMultiplier;
    state.rest = clamp(state.rest - cost);
    state.food = clamp(state.food - cost * 0.42);
    publish(`action:${action}:${source}`);
    return state.energy;
  };

  const recoverRest = (amount, reason = "rest", pressureReduction = 0) => {
    const gain = Math.max(0, Number(amount) || 0);
    if (!gain && !pressureReduction) return state.energy;
    state.rest = clamp(state.rest + gain);
    state.manualPressure = Math.max(
      0,
      state.manualPressure - Math.max(0, Number(pressureReduction) || 0)
    );
    publish(reason);
    return state.energy;
  };

  const completeRoutine = (routine, detail = {}) => {
    if (routine === "rest") {
      const restGain = Number.isFinite(Number(detail.restGain))
        ? Number(detail.restGain)
        : 24;
      state.rest = clamp(state.rest + restGain);
      state.manualPressure = Math.max(
        0,
        state.manualPressure - Math.max(0, Number(detail.pressureReduction) || 2)
      );
    } else if (routine === "micro-rest") {
      state.rest = clamp(state.rest + Math.max(1.5, Number(detail.restGain) || 3.2));
      state.manualPressure = Math.max(0, state.manualPressure - 0.75);
    } else if (routine === "critical-rest") {
      const targetEnergy = Math.max(30, Number(detail.targetEnergy) || 33);
      let guard = 0;
      while (recalculate() < targetEnergy && state.rest < 100 && guard < 100) {
        state.rest = clamp(state.rest + 1);
        guard += 1;
      }
      state.manualPressure = Math.max(0, state.manualPressure - 3);
    } else if (routine === "food") {
      state.food = clamp(state.food + 28);
      state.rest = clamp(state.rest + 4);
    } else if (routine === "research") {
      state.rest = clamp(state.rest - 1.5);
      state.food = clamp(state.food - 0.8);
    }
    publish(`routine:${routine}`);
    return state.energy;
  };

  const applyHazard = (hazard, pressure = {}) => {
    const restCost = Math.max(0, Number(pressure.rest) || 0);
    const foodCost = Math.max(0, Number(pressure.food) || 0);
    const safetyCost = Math.max(0, Number(pressure.safety) || 0);
    if (!restCost && !foodCost && !safetyCost) return state.energy;
    state.rest = clamp(state.rest - restCost);
    state.food = clamp(state.food - foodCost);
    state.safety = clamp(state.safety - safetyCost);
    publish(`hazard:${String(hazard || "environment")}`);
    return state.energy;
  };

  const updateSafety = () => {
    const target = BF.canAccessCampInventory?.() ? 100 : 62;
    const next = state.safety + (target - state.safety) * 0.08;
    if (Math.abs(next - state.safety) < 0.25) return false;
    state.safety = clamp(next);
    publish("safety");
    return true;
  };

  const snapshot = () => {
    const profile = fatigueProfile();
    return {
      ...clone(state),
      fatigue: profile,
      weather: { ...weather() },
      needs: {
        rest: state.rest < 35 || state.energy < 30,
        food: state.food < 35 || state.energy < 25,
        criticalRest: state.rest < 25 || state.energy < 25
      }
    };
  };

  let lastExposureAt = Date.now();
  const applyEnvironmentalExposure = () => {
    const now = Date.now();
    if (now - lastExposureAt < 30000) return false;
    lastExposureAt = now;
    const currentWeather = weather();
    const stress = clamp01(currentWeather.thermalStress);
    if (stress <= 0) return false;
    state.rest = clamp(state.rest - stress * 0.9);
    state.food = clamp(state.food - stress * 0.25);
    publish(`weather:${currentWeather.condition}:${currentWeather.temperature}`);
    return true;
  };

  const renderEnergy = () => {
    const meter = document.querySelector(".survival-energy-meter");
    if (!meter) return false;
    const current = snapshot();
    const label = meter.querySelector("span");
    const value = meter.querySelector("b");
    const fill = meter.querySelector("em");
    const energyText = `${Math.round(current.energy)}%`;
    if (label && label.textContent !== "ÉNERGIE") label.textContent = "ÉNERGIE";
    if (value && value.textContent !== energyText) value.textContent = energyText;
    if (fill) {
      const width = `${current.energy}%`;
      const className = current.energy < 25
        ? "energy-critical"
        : current.energy < 50
          ? "energy-low"
          : "energy-healthy";
      if (fill.style.width !== width) fill.style.width = width;
      if (fill.className !== className) fill.className = className;
    }
    const title = `Repos ${Math.round(current.rest)} % · Alimentation ${Math.round(current.food)} % · Sécurité ${Math.round(current.safety)} % · ${current.weather.condition} ${Math.round(current.weather.temperature)} °C`;
    if (meter.title !== title) meter.title = title;
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
    rationRecipe: RATION_RECIPE,
    save: () => publish("manual-save")
  });
  BF.getSurvivalState = snapshot;

  BF.ObjectEvents?.subscribe?.((event) => {
    const mode = event.detail?.interactionMode;
    if (!mode || !interactionCost[mode]) return;
    recordAction(mode, event.detail?.interactionSource || "autonomy");
  });
  global.addEventListener("bluefox:survival-changed", renderEnergy);
  global.addEventListener("bluefox:mission-state", renderEnergy);
  global.addEventListener("bluefox:weather-changed", renderEnergy);
  const observer = new MutationObserver(renderEnergy);
  observer.observe(document.documentElement, { childList: true, subtree: true });
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
