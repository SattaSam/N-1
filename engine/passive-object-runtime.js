(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (!BF.ObjectLibrary || BF.PassiveObjectRuntime) return;

  const VERSION = 1;
  const registry = new Set();
  const states = new WeakMap();
  const materialStates = new WeakMap();
  const SPECIAL_RUNTIME_TYPES = new Set([
    "energy_crystal", "abandoned_drone", "nocturnal_animal",
    "electrostatic_storm", "mobile_islet", "carnivorous_plant",
    "scout_drone", "harvest_drone", "npc_translucent", "npc_rocky"
  ]);

  const DEFAULTS = Object.freeze({
    enabled: true,
    sway: 0,
    swaySpeed: 0.55,
    breathe: 0,
    breatheSpeed: 1.15,
    hover: 0,
    hoverSpeed: 0.85,
    rotate: 0,
    pulse: 0,
    pulseSpeed: 1.35,
    opacityPulse: 0,
    lightPulse: 0,
    rotorSpeed: 0,
    windResponse: 1,
    phaseOffset: 0,
    externalTransform: false
  });

  const TYPE_PROFILES = Object.freeze({
    crystal: { pulse: 0.12, pulseSpeed: 1.55, lightPulse: 0.18 },
    needle: { sway: 0.012, swaySpeed: 0.7, pulse: 0.08, pulseSpeed: 1.7 },
    fiber: { sway: 0.055, swaySpeed: 0.75, breathe: 0.025, pulse: 0.08 },
    adaptive_plant: { sway: 0.06, swaySpeed: 0.62, breathe: 0.03, pulse: 0.12 },
    fluorescent_vegetation: { sway: 0.07, swaySpeed: 0.8, pulse: 0.18, lightPulse: 0.2 },
    frond: { sway: 0.09, swaySpeed: 0.68, breathe: 0.025 },
    spore: { hover: 0.035, hoverSpeed: 0.75, pulse: 0.12, opacityPulse: 0.08 },
    tree: { sway: 0.018, swaySpeed: 0.3 },
    luminescent_tree: { sway: 0.022, swaySpeed: 0.32, pulse: 0.1, lightPulse: 0.12 },
    crystalline_tree: { sway: 0.012, swaySpeed: 0.25, pulse: 0.1, lightPulse: 0.16 },
    cactus: { sway: 0.01, swaySpeed: 0.26 },
    giant_mushroom: { sway: 0.025, swaySpeed: 0.42, breathe: 0.018, pulse: 0.08 },
    pool: { pulse: 0.035, pulseSpeed: 0.55, opacityPulse: 0.08 },
    watercourse: { pulse: 0.025, pulseSpeed: 0.45, opacityPulse: 0.06 },
    tech_relic: { rotate: 0.035, pulse: 0.08, pulseSpeed: 1.1, lightPulse: 0.18 },
    survival_bag: { breathe: 0.008, breatheSpeed: 0.65 },
    fun_creature: { breathe: 0.035, breatheSpeed: 1.25 },
    small_creature: { breathe: 0.04, breatheSpeed: 1.45 },
    brouteur: { breathe: 0.025, breatheSpeed: 0.9 },
    sauteur: { breathe: 0.045, breatheSpeed: 1.6 },
    patte_creature: { breathe: 0.018, breatheSpeed: 0.72 }
  });

  const CATEGORY_PROFILES = Object.freeze({
    flora: { sway: 0.035, swaySpeed: 0.55, breathe: 0.015 },
    fauna: { breathe: 0.025, breatheSpeed: 1.05 },
    npc: { breathe: 0.018, breatheSpeed: 0.72 },
    technology: { pulse: 0.06, pulseSpeed: 1.15, lightPulse: 0.12 },
    phenomenon: { pulse: 0.045, pulseSpeed: 0.75, opacityPulse: 0.05 },
    environment: { sway: 0.008, swaySpeed: 0.22 },
    resources: { pulse: 0.025, pulseSpeed: 0.9 }
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const cloneVector = (vector) => ({ x: vector.x, y: vector.y, z: vector.z });
  const tagSet = (definition) => new Set([
    ...(definition?.spawn?.tags || []),
    ...(definition?.spawnProfile?.tags || []),
    ...(definition?.situation?.tags || []),
    ...(definition?.tags || [])
  ]);

  const explicitProfile = (definition) =>
    definition?.dynamic ||
    definition?.passiveBehavior ||
    definition?.behavior?.passive ||
    definition?.production?.dynamic ||
    definition?.production?.passiveBehavior ||
    null;

  const inferProfile = (definition) => {
    const tags = tagSet(definition);
    const category = CATEGORY_PROFILES[definition?.category] || {};
    const typed = TYPE_PROFILES[definition?.type] || {};
    const inferred = {};
    if (tags.has("plant") || tags.has("ground_cover")) Object.assign(inferred, CATEGORY_PROFILES.flora);
    if (tags.has("glowing") || tags.has("bioluminescent")) Object.assign(inferred, { pulse: 0.08, lightPulse: 0.12 });
    if (tags.has("liquid")) Object.assign(inferred, { pulse: 0.025, opacityPulse: 0.06 });
    if (tags.has("technology")) Object.assign(inferred, CATEGORY_PROFILES.technology);
    if (tags.has("creature") || tags.has("animal")) Object.assign(inferred, CATEGORY_PROFILES.fauna);
    return { ...DEFAULTS, ...category, ...inferred, ...typed, ...(explicitProfile(definition) || {}) };
  };

  const normalizeProfile = (profile, type) => {
    const result = { ...DEFAULTS, ...(profile || {}) };
    ["sway", "breathe", "hover", "rotate", "pulse", "opacityPulse", "lightPulse", "rotorSpeed"].forEach((key) => {
      result[key] = clamp(finite(result[key]), -5, 5);
    });
    ["swaySpeed", "breatheSpeed", "hoverSpeed", "pulseSpeed", "windResponse"].forEach((key) => {
      result[key] = clamp(finite(result[key], DEFAULTS[key]), 0, 12);
    });
    if (SPECIAL_RUNTIME_TYPES.has(type)) result.externalTransform = true;
    return Object.freeze(result);
  };

  const captureMaterial = (material) => {
    if (!material || materialStates.has(material)) return;
    materialStates.set(material, {
      emissiveIntensity: finite(material.emissiveIntensity, 0),
      opacity: finite(material.opacity, 1)
    });
  };

  const captureState = (root, definition, profile) => {
    const materials = [];
    const lights = [];
    const rotors = [];
    root.traverse?.((child) => {
      const childMaterials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
      childMaterials.forEach((item) => {
        captureMaterial(item);
        if (!materials.includes(item)) materials.push(item);
      });
      if (child.isLight || typeof child.intensity === "number" && /light|glow/i.test(child.name || "")) {
        lights.push({ object: child, intensity: finite(child.intensity, 0) });
      }
      if (/rotor|fan|turbine/i.test(child.name || "")) {
        rotors.push({ object: child, rotation: cloneVector(child.rotation) });
      }
    });
    return {
      root,
      definition,
      type: definition?.type || root.userData?.libraryType || "object",
      profile,
      position: cloneVector(root.position),
      rotation: cloneVector(root.rotation),
      scale: cloneVector(root.scale),
      materials,
      lights,
      rotors,
      phase: finite(profile.phaseOffset) + Math.random() * Math.PI * 2,
      enabled: true
    };
  };

  const register = (root, definition) => {
    if (!root || states.has(root)) return root;
    const resolvedDefinition = definition || root.userData?.functional || BF.ObjectLibrary.get?.(root.userData?.libraryType);
    if (!resolvedDefinition) return root;
    const profile = normalizeProfile(inferProfile(resolvedDefinition), resolvedDefinition.type);
    if (profile.enabled === false) return root;
    const state = captureState(root, resolvedDefinition, profile);
    states.set(root, state);
    registry.add(root);
    root.userData.passiveBehavior = profile;
    root.userData.passiveRuntimeVersion = VERSION;
    return root;
  };

  const unregister = (root) => {
    const state = states.get(root);
    if (state) restore(root);
    registry.delete(root);
    states.delete(root);
  };

  const restore = (root) => {
    const state = states.get(root);
    if (!state) return false;
    root.position.set(state.position.x, state.position.y, state.position.z);
    root.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    root.scale.set(state.scale.x, state.scale.y, state.scale.z);
    state.materials.forEach((item) => {
      const base = materialStates.get(item);
      if (!base) return;
      if ("emissiveIntensity" in item) item.emissiveIntensity = base.emissiveIntensity;
      if ("opacity" in item) item.opacity = base.opacity;
    });
    state.lights.forEach(({ object, intensity }) => { object.intensity = intensity; });
    return true;
  };

  const applyMaterials = (state, wave) => {
    const { profile } = state;
    state.materials.forEach((item) => {
      const base = materialStates.get(item);
      if (!base) return;
      if (profile.pulse && "emissiveIntensity" in item && (item.emissive || base.emissiveIntensity > 0)) {
        item.emissiveIntensity = Math.max(0, base.emissiveIntensity * (1 + wave * profile.pulse) + Math.max(0, wave) * profile.pulse * 0.35);
      }
      if (profile.opacityPulse && item.transparent && "opacity" in item) {
        item.opacity = clamp(base.opacity + wave * profile.opacityPulse, 0.08, 1);
      }
    });
    if (profile.lightPulse) {
      state.lights.forEach(({ object, intensity }) => {
        object.intensity = Math.max(0, intensity * (1 + wave * profile.lightPulse));
      });
    }
  };

  const updateState = (state, elapsed, wind) => {
    const { root, profile, phase } = state;
    if (!root.parent || root.visible === false || !state.enabled) return;
    const swayWave = Math.sin(elapsed * profile.swaySpeed + phase);
    const breatheWave = Math.sin(elapsed * profile.breatheSpeed + phase * 0.7);
    const hoverWave = Math.sin(elapsed * profile.hoverSpeed + phase * 1.3);
    const pulseWave = Math.sin(elapsed * profile.pulseSpeed + phase * 0.9);

    if (!profile.externalTransform) {
      root.position.y = state.position.y + hoverWave * profile.hover;
      root.rotation.x = state.rotation.x + swayWave * profile.sway * 0.42 * wind;
      root.rotation.z = state.rotation.z + swayWave * profile.sway * wind;
      root.rotation.y = state.rotation.y + elapsed * profile.rotate;
      const vertical = 1 + breatheWave * profile.breathe;
      root.scale.set(state.scale.x / Math.sqrt(vertical), state.scale.y * vertical, state.scale.z / Math.sqrt(vertical));
    }

    applyMaterials(state, pulseWave);
    if (profile.rotorSpeed) {
      state.rotors.forEach(({ object, rotation }, index) => {
        object.rotation.set(rotation.x, rotation.y, rotation.z + elapsed * profile.rotorSpeed * (index % 2 ? -1 : 1));
      });
    }
  };

  let running = true;
  let lastCleanup = 0;
  const startedAt = global.performance?.now?.() || Date.now();
  const frame = (now) => {
    if (!running) return;
    const elapsed = Math.max(0, (now - startedAt) / 1000);
    const weatherWind = finite(BF.currentEngine?.weather?.windStrength, 1);
    const wind = clamp(weatherWind, 0.15, 2.5);
    registry.forEach((root) => {
      const state = states.get(root);
      if (state && (!BF.RuntimeBudget || BF.RuntimeBudget.shouldUpdate(root, "passive", elapsed))) updateState(state, elapsed, wind * state.profile.windResponse);
    });
    if (now - lastCleanup > 10000) {
      lastCleanup = now;
      registry.forEach((root) => { if (!root?.parent) unregister(root); });
    }
    global.requestAnimationFrame?.(frame);
  };

  const originalCreate = BF.ObjectLibrary.create.bind(BF.ObjectLibrary);
  BF.ObjectLibrary.create = function createWithPassiveBehavior(THREE, type, palette, variant) {
    const instance = originalCreate(THREE, type, palette, variant);
    if (instance?.root) {
      instance.root.userData.libraryType ||= type;
      instance.root.userData.variant ??= variant || 0;
      register(instance.root, instance.definition || BF.ObjectLibrary.get(type));
    }
    return instance;
  };

  BF.PassiveObjectRuntime = Object.freeze({
    version: VERSION,
    register,
    unregister,
    restore,
    getProfile(rootOrType) {
      if (typeof rootOrType === "string") {
        const definition = BF.ObjectLibrary.get?.(rootOrType);
        return definition ? normalizeProfile(inferProfile(definition), definition.type) : null;
      }
      return states.get(rootOrType)?.profile || null;
    },
    setEnabled(root, enabled) {
      const state = states.get(root);
      if (!state) return false;
      state.enabled = Boolean(enabled);
      if (!state.enabled) restore(root);
      return true;
    },
    snapshot() {
      return Object.freeze({ version: VERSION, registered: registry.size, running });
    },
    stop() {
      running = false;
      registry.forEach((root) => restore(root));
    }
  });

  global.requestAnimationFrame?.(frame);
})(window);
