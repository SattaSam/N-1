(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (!BF.ObjectLibrary?.registerCreateHook || BF.FloraWindRuntime) return;

  const VERSION = "flora-wind-r2-reconstituted";
  const registry = new Set();
  const states = new WeakMap();

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const nowSeconds = () => (global.performance?.now?.() || Date.now()) / 1000;

  const tagSet = (definition) => new Set([
    ...(definition?.spawn?.tags || []),
    ...(definition?.spawnProfile?.tags || []),
    ...(definition?.situation?.tags || []),
    ...(definition?.tags || [])
  ]);

  const isFlora = (definition, type = "") => {
    const tags = tagSet(definition);
    return definition?.category === "flora" ||
      definition?.family === "flora" ||
      definition?.knowledge?.family === "flora" ||
      definition?.resource?.family === "biomass" ||
      tags.has("plant") ||
      tags.has("fungus") ||
      tags.has("ground_cover") ||
      /tree|fern|frond|fiber|plant|moss|mushroom|spore|vine|orchid|cactus/i.test(type);
  };

  const typeProfile = (type, definition) => {
    const tags = tagSet(definition);
    const size = String(definition?.size || "M").toUpperCase();
    const fungus = tags.has("fungus") || /mushroom|spore|fung/i.test(type);
    const tree = /tree/i.test(type) || size === "L" || size === "XL";
    const ground = tags.has("ground_cover") || /fern|frond|moss|fiber/i.test(type);
    const vine = /vine|adaptive_plant|orchid/i.test(type);

    if (tree) return {
      rootSway: 0.026,
      rootPitch: 0.012,
      partSway: 0.060,
      speed: 0.42,
      gust: 0.55,
      breathe: 0.006
    };
    if (fungus) return {
      rootSway: 0.018,
      rootPitch: 0.010,
      partSway: 0.030,
      speed: 0.48,
      gust: 0.28,
      breathe: 0.025
    };
    if (ground) return {
      rootSway: 0.055,
      rootPitch: 0.034,
      partSway: 0.090,
      speed: 0.72,
      gust: 0.72,
      breathe: 0.012
    };
    if (vine) return {
      rootSway: 0.045,
      rootPitch: 0.025,
      partSway: 0.075,
      speed: 0.60,
      gust: 0.62,
      breathe: 0.018
    };
    return {
      rootSway: 0.032,
      rootPitch: 0.018,
      partSway: 0.050,
      speed: 0.56,
      gust: 0.45,
      breathe: 0.012
    };
  };

  const collectFlexibleParts = (root) => {
    const parts = [];
    root.traverse?.((child) => {
      if (!child.isMesh || child === root) return;
      const name = String(child.name || "").toLowerCase();
      const y = Number(child.position?.y || 0);
      if (
        y > 0.12 ||
        /leaf|frond|fern|crown|branch|stem|cap|petal|vine|fiber|blade|spore/.test(name)
      ) {
        parts.push({
          object: child,
          rotation: child.rotation.clone(),
          scale: child.scale.clone(),
          position: child.position.clone()
        });
      }
    });
    return parts;
  };

  const register = (root, definition, type) => {
    if (!root || states.has(root) || !isFlora(definition, type)) return false;

    // La couche vent devient autoritaire sur les transformations de la flore.
    BF.FloraRuntime?.setEnabled?.(root, false);
    BF.PassiveObjectRuntime?.setEnabled?.(root, false);

    const state = {
      root,
      definition,
      type,
      profile: typeProfile(type, definition),
      anchorRotation: root.rotation.clone(),
      anchorScale: root.scale.clone(),
      parts: collectFlexibleParts(root),
      phase: Math.random() * Math.PI * 2,
      gustPhase: Math.random() * Math.PI * 2,
      enabled: true
    };
    states.set(root, state);
    registry.add(root);
    root.userData.floraWindRuntime = VERSION;
    return true;
  };

  const restore = (root) => {
    const state = states.get(root);
    if (!state) return false;
    root.rotation.copy(state.anchorRotation);
    root.scale.copy(state.anchorScale);
    state.parts.forEach((part) => {
      part.object.rotation.copy(part.rotation);
      part.object.scale.copy(part.scale);
      part.object.position.copy(part.position);
    });
    return true;
  };

  const unregister = (root) => {
    if (!states.has(root)) return false;
    restore(root);
    states.delete(root);
    registry.delete(root);
    return true;
  };

  const windStrength = () => {
    const weather = BF.currentEngine?.weather || BF.weather || {};
    const base = Number(weather.windStrength ?? weather.wind ?? 0.55);
    return clamp(Number.isFinite(base) ? base : 0.55, 0.18, 1.45);
  };

  const update = (state, elapsed) => {
    const { root, profile, phase, gustPhase } = state;
    if (!state.enabled || !root.parent || root.visible === false) return;

    const wind = windStrength();
    const low = Math.sin(elapsed * profile.speed + phase);
    const secondary = Math.sin(elapsed * profile.speed * 1.73 + phase * 0.63);
    const gustEnvelope = Math.max(
      0,
      Math.sin(elapsed * 0.105 + gustPhase) * 0.5 +
      Math.sin(elapsed * 0.047 + gustPhase * 1.7) * 0.5
    );
    const gust = 1 + gustEnvelope * profile.gust;

    root.rotation.z =
      state.anchorRotation.z + low * profile.rootSway * wind * gust;
    root.rotation.x =
      state.anchorRotation.x + secondary * profile.rootPitch * wind * gust;

    const breathe = 1 + Math.sin(elapsed * 0.55 + phase) * profile.breathe;
    root.scale.set(
      state.anchorScale.x / Math.sqrt(breathe),
      state.anchorScale.y * breathe,
      state.anchorScale.z / Math.sqrt(breathe)
    );

    state.parts.forEach((part, index) => {
      const localPhase = phase + index * 0.61;
      const wave = Math.sin(
        elapsed * (profile.speed * (1.15 + (index % 4) * 0.08)) + localPhase
      );
      const cross = Math.cos(
        elapsed * (profile.speed * 0.83) + localPhase * 1.31
      );
      const amount = profile.partSway * wind * gust *
        (0.72 + Math.min(1, Math.abs(part.position.y)) * 0.16);

      part.object.rotation.z = part.rotation.z + wave * amount;
      part.object.rotation.x = part.rotation.x + cross * amount * 0.46;

      if (/spore/i.test(state.type) || /spore/i.test(part.object.name || "")) {
        const loop = (elapsed * 0.11 + index * 0.17 + phase) % 1;
        part.object.position.y = part.position.y + loop * 0.55;
        part.object.position.x =
          part.position.x + Math.sin(elapsed * 0.43 + index) * 0.055 * wind;
        part.object.position.z =
          part.position.z + Math.cos(elapsed * 0.39 + index) * 0.055 * wind;
      }
    });
  };

  BF.ObjectLibrary.registerCreateHook((instance, context = {}) => {
    const root = instance?.root;
    const definition = instance?.definition || context.definition ||
      BF.ObjectLibrary.get?.(context.type || root?.userData?.libraryType);
    const type = context.type || definition?.type || root?.userData?.libraryType || "";
    if (!root || !isFlora(definition, type)) return;

    const attach = () => register(root, definition, type);
    if (root.parent) attach();
    else global.requestAnimationFrame?.(attach) || attach();
  });

  let running = true;
  const startedAt = nowSeconds();
  let lastCleanup = 0;

  const frame = () => {
    if (!running) return;
    const elapsed = nowSeconds() - startedAt;

    registry.forEach((root) => {
      const state = states.get(root);
      if (!state) return;
      if (
        !BF.RuntimeBudget ||
        BF.RuntimeBudget.shouldUpdate(root, "flora", elapsed)
      ) {
        update(state, elapsed);
      }
    });

    if (elapsed - lastCleanup > 8) {
      lastCleanup = elapsed;
      registry.forEach((root) => {
        if (!root?.parent) unregister(root);
      });
    }
    global.requestAnimationFrame?.(frame);
  };

  BF.FloraWindRuntime = Object.freeze({
    version: VERSION,
    register,
    unregister,
    restore,
    setEnabled(root, enabled) {
      const state = states.get(root);
      if (!state) return false;
      state.enabled = Boolean(enabled);
      if (!state.enabled) restore(root);
      return true;
    },
    snapshot() {
      return Object.freeze({
        version: VERSION,
        registered: registry.size,
        running
      });
    },
    stop() {
      running = false;
      registry.forEach((root) => restore(root));
    }
  });

  global.requestAnimationFrame?.(frame);
  console.info("[BlueFox] FloraWindRuntime restauré.", VERSION);
})(window);
