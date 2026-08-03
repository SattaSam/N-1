(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (!BF.ObjectLibrary?.create) {
    console.error("[BlueFox P2.2.4] ObjectLibrary doit être chargé avant le runtime flore.");
    return;
  }

  const VERSION = "P2.2.4-r1";
  const EXCLUDED_TYPES = new Set(["carnivorous_plant"]);
  const registry = new Set();
  const states = new WeakMap();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const nowSeconds = () => (global.performance?.now?.() || Date.now()) / 1000;

  const isFlora = (definition, type) => {
    if (!definition || EXCLUDED_TYPES.has(type)) return false;
    const tags = new Set([
      ...(definition.spawn?.tags || []),
      ...(definition.spawnProfile?.tags || []),
      ...(definition.situation?.tags || []),
      ...(definition.tags || [])
    ]);
    return definition.category === "flora" ||
      definition.family === "flora" ||
      definition.knowledge?.family === "flora" ||
      definition.resource?.family === "biomass" ||
      tags.has("plant") ||
      tags.has("fungus") ||
      tags.has("ground_cover");
  };

  const collectMeshes = (root) => {
    const meshes = [];
    root.traverse?.((child) => {
      if (child.isMesh && !child.userData?.interactable) meshes.push(child);
    });
    return meshes;
  };

  const snapshotObject = (object) => ({
    object,
    position: object.position.clone(),
    rotation: object.rotation.clone(),
    scale: object.scale.clone()
  });

  const snapshotMaterial = (material) => ({
    material,
    emissiveIntensity: Number(material?.emissiveIntensity || 0),
    opacity: Number(material?.opacity ?? 1)
  });

  const classifyParts = (root, meshes) => {
    const stems = [];
    const crowns = [];
    const spores = [];
    const glow = [];
    const flexible = [];
    const caps = [];

    meshes.forEach((mesh) => {
      const name = String(mesh.name || "").toLowerCase();
      const geometryType = String(mesh.geometry?.type || "");
      const y = Number(mesh.position?.y || 0);

      if (name.includes("spore") || name.includes("pollen")) spores.push(mesh);
      if (name.includes("cap") || name.includes("mushroom")) caps.push(mesh);
      if (name.includes("stem") || name.includes("trunk") || geometryType.includes("Cylinder")) stems.push(mesh);
      if (name.includes("leaf") || name.includes("frond") || name.includes("crown") ||
          name.includes("bulb") || geometryType.includes("Sphere") ||
          geometryType.includes("Icosahedron")) crowns.push(mesh);
      if (mesh.material?.emissive || Number(mesh.material?.emissiveIntensity || 0) > 0) glow.push(mesh);
      if (y > 0.15 || crowns.includes(mesh)) flexible.push(mesh);
    });

    return { stems, crowns, spores, glow, flexible, caps };
  };

  const capture = (root, type, definition) => {
    const meshes = collectMeshes(root);
    const parts = classifyParts(root, meshes);
    const materials = new Set();
    meshes.forEach((mesh) => {
      if (Array.isArray(mesh.material)) mesh.material.forEach((item) => materials.add(item));
      else if (mesh.material) materials.add(mesh.material);
    });

    const tags = new Set([
      ...(definition.spawn?.tags || []),
      ...(definition.spawnProfile?.tags || []),
      ...(definition.situation?.tags || []),
      ...(definition.tags || [])
    ]);

    return {
      root,
      type,
      definition,
      phase: Math.random() * Math.PI * 2,
      anchor: {
        position: root.position.clone(),
        rotation: root.rotation.clone(),
        scale: root.scale.clone()
      },
      objects: meshes.map(snapshotObject),
      materials: [...materials].map(snapshotMaterial),
      parts,
      tags,
      enabled: true
    };
  };

  const restore = (root) => {
    const state = states.get(root);
    if (!state) return false;
    root.position.copy(state.anchor.position);
    root.rotation.copy(state.anchor.rotation);
    root.scale.copy(state.anchor.scale);
    state.objects.forEach(({ object, position, rotation, scale }) => {
      object.position.copy(position);
      object.rotation.copy(rotation);
      object.scale.copy(scale);
    });
    state.materials.forEach(({ material, emissiveIntensity, opacity }) => {
      if ("emissiveIntensity" in material) material.emissiveIntensity = emissiveIntensity;
      if ("opacity" in material) material.opacity = opacity;
    });
    return true;
  };

  const register = (root, type, definition) => {
    if (!root || states.has(root) || !isFlora(definition, type)) return false;
    root.userData.floraRuntime = VERSION;
    BF.PassiveObjectRuntime?.setEnabled?.(root, false);
    const state = capture(root, type, definition);
    states.set(root, state);
    registry.add(root);
    return true;
  };

  const unregister = (root) => {
    if (!states.has(root)) return false;
    restore(root);
    states.delete(root);
    registry.delete(root);
    return true;
  };

  const weatherStrength = () => {
    const weather = BF.currentEngine?.weather || BF.weather || {};
    const wind = Number(weather.windStrength ?? weather.wind ?? 0.35);
    return clamp(wind, 0, 1.5);
  };

  const updateGlow = (state, elapsed, intensity = 1) => {
    state.parts.glow.forEach((mesh, index) => {
      const material = mesh.material;
      const base = state.materials.find((item) => item.material === material);
      if (!material || !base || !("emissiveIntensity" in material)) return;
      material.emissiveIntensity = Math.max(
        0,
        base.emissiveIntensity *
          (0.88 + Math.sin(elapsed * 1.15 + index * 0.7 + state.phase) * 0.12) *
          intensity
      );
    });
  };

  const updateSpores = (state, elapsed, wind) => {
    state.parts.spores.forEach((mesh, index) => {
      const base = state.objects.find((item) => item.object === mesh);
      if (!base) return;
      const loop = (elapsed * (0.18 + index * 0.01) + index * 0.17 + state.phase) % 1;
      mesh.position.y = base.position.y + loop * (0.7 + wind * 0.35);
      mesh.position.x = base.position.x + Math.sin(elapsed * 0.55 + index) * 0.05 * wind;
      mesh.position.z = base.position.z + Math.cos(elapsed * 0.49 + index) * 0.05 * wind;
      if (mesh.material && "opacity" in mesh.material) {
        const baseMat = state.materials.find((item) => item.material === mesh.material);
        mesh.material.opacity = Number(baseMat?.opacity ?? 1) * (1 - loop * 0.75);
      }
    });
  };

  const update = (state, elapsed) => {
    if (!state.enabled || !state.root.parent || state.root.visible === false) return;

    const wind = weatherStrength();
    const low = Math.sin(elapsed * 0.43 + state.phase);
    const high = Math.sin(elapsed * 0.92 + state.phase * 1.7);
    const isFungus = state.tags.has("fungus") || state.type.includes("mushroom") || state.type.includes("spore");
    const isGround = state.tags.has("ground_cover") || state.type === "frond" || state.type.includes("vegetation");
    const isTree = state.type.includes("tree") || state.definition.size === "L" || state.definition.size === "XL";

    state.root.rotation.z = state.anchor.rotation.z + low * (isTree ? 0.006 : 0.012) * wind;
    state.root.rotation.x = state.anchor.rotation.x + high * (isGround ? 0.01 : 0.004) * wind;

    state.parts.flexible.forEach((mesh, index) => {
      const base = state.objects.find((item) => item.object === mesh);
      if (!base) return;
      const phase = elapsed * (0.58 + (index % 5) * 0.05) + index * 0.71 + state.phase;
      const amount = (isTree ? 0.008 : isGround ? 0.035 : 0.018) * wind;
      mesh.rotation.z = base.rotation.z + Math.sin(phase) * amount;
      mesh.rotation.x = base.rotation.x + Math.cos(phase * 0.83) * amount * 0.6;
    });

    state.parts.crowns.forEach((mesh, index) => {
      const base = state.objects.find((item) => item.object === mesh);
      if (!base) return;
      const breathe = Math.sin(elapsed * (isFungus ? 0.48 : 0.72) + index * 0.5 + state.phase);
      const amp = isFungus ? 0.018 : 0.009;
      mesh.scale.set(
        base.scale.x * (1 + breathe * amp),
        base.scale.y * (1 + breathe * amp * 1.25),
        base.scale.z * (1 + breathe * amp)
      );
    });

    state.parts.caps.forEach((mesh, index) => {
      const base = state.objects.find((item) => item.object === mesh);
      if (!base) return;
      mesh.rotation.y = base.rotation.y + Math.sin(elapsed * 0.22 + index + state.phase) * 0.018;
    });

    updateGlow(state, elapsed, isFungus ? 1.08 : 1);
    updateSpores(state, elapsed, wind);
  };

  const originalCreate = BF.ObjectLibrary.create.bind(BF.ObjectLibrary);
  BF.ObjectLibrary.create = function createWithFloraRuntime(THREE, type, palette, variant) {
    const instance = originalCreate(THREE, type, palette, variant);
    const definition = instance?.definition || BF.ObjectLibrary.get?.(type);
    if (instance?.root && isFlora(definition, type)) register(instance.root, type, definition);
    return instance;
  };

  let running = true;
  const startedAt = nowSeconds();
  let lastCleanupAt = 0;

  const frame = () => {
    if (!running) return;
    const elapsed = nowSeconds() - startedAt;
    registry.forEach((root) => {
      const state = states.get(root);
      if (state && (!BF.RuntimeBudget || BF.RuntimeBudget.shouldUpdate(root, "flora", elapsed))) update(state, elapsed);
    });
    if (elapsed - lastCleanupAt > 8) {
      lastCleanupAt = elapsed;
      registry.forEach((root) => {
        if (!root?.parent) unregister(root);
      });
    }
    global.requestAnimationFrame?.(frame);
  };

  BF.FloraRuntime = Object.freeze({
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
  console.info("[BlueFox P2.2.4] Runtime flore actif.");
})(window);
