(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (!BF.ObjectLibrary?.create) {
    console.error("[BlueFox P2.2.5] ObjectLibrary doit être chargé avant le runtime phénomènes.");
    return;
  }

  const VERSION = "P2.2.5-r1";
  const TYPES = new Set([
    "electrostatic_storm",
    "mobile_islet",
    "energy_crystal",
    "charged_crystal",
    "resonance_crystal",
    "cold_crystal",
    "crystal",
    "abandoned_drone",
    "scout_drone",
    "harvest_drone",
    "tech_relic",
    "advanced_tech_part",
    "tech_component"
  ]);
  const registry = new Set();
  const states = new WeakMap();
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const nowSeconds = () => (global.performance?.now?.() || Date.now()) / 1000;

  const collect = (root, predicate) => {
    const result = [];
    root.traverse?.((child) => {
      if (predicate(child)) result.push(child);
    });
    return result;
  };

  const capture = (root, type) => {
    const meshes = collect(root, (child) => child.isMesh && !child.userData?.interactable);
    const lights = collect(root, (child) => child.isLight);
    const materials = new Set();
    meshes.forEach((mesh) => {
      if (Array.isArray(mesh.material)) mesh.material.forEach((m) => materials.add(m));
      else if (mesh.material) materials.add(mesh.material);
    });
    return {
      root,
      type,
      phase: Math.random() * Math.PI * 2,
      anchor: {
        position: root.position.clone(),
        rotation: root.rotation.clone(),
        scale: root.scale.clone()
      },
      meshes: meshes.map((mesh) => ({
        mesh,
        position: mesh.position.clone(),
        rotation: mesh.rotation.clone(),
        scale: mesh.scale.clone()
      })),
      lights: lights.map((light) => ({
        light,
        intensity: Number(light.intensity || 0),
        distance: Number(light.distance || 0)
      })),
      materials: [...materials].map((material) => ({
        material,
        opacity: Number(material.opacity ?? 1),
        emissiveIntensity: Number(material.emissiveIntensity || 0)
      })),
      enabled: true
    };
  };

  const restore = (root) => {
    const state = states.get(root);
    if (!state) return false;
    root.position.copy(state.anchor.position);
    root.rotation.copy(state.anchor.rotation);
    root.scale.copy(state.anchor.scale);
    state.meshes.forEach(({ mesh, position, rotation, scale }) => {
      mesh.position.copy(position);
      mesh.rotation.copy(rotation);
      mesh.scale.copy(scale);
    });
    state.lights.forEach(({ light, intensity, distance }) => {
      light.intensity = intensity;
      light.distance = distance;
    });
    state.materials.forEach(({ material, opacity, emissiveIntensity }) => {
      if ("opacity" in material) material.opacity = opacity;
      if ("emissiveIntensity" in material) material.emissiveIntensity = emissiveIntensity;
    });
    return true;
  };

  const register = (root, type) => {
    if (!root || !TYPES.has(type) || states.has(root)) return false;
    root.userData.phenomenonRuntime = VERSION;
    BF.PassiveObjectRuntime?.setEnabled?.(root, false);
    const state = capture(root, type);
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

  const named = (state, name) =>
    state.meshes.filter(({ mesh }) => mesh.name === name || String(mesh.name || "").includes(name));

  const materialBase = (state, material) =>
    state.materials.find((entry) => entry.material === material);

  const updateCrystal = (state, elapsed) => {
    const pulse = 1 + Math.sin(elapsed * 1.85 + state.phase) * 0.045;
    state.meshes.forEach(({ mesh, scale }, index) => {
      const isShard =
        mesh.name.includes("Crystal") ||
        mesh.name.includes("Shard") ||
        String(mesh.geometry?.type || "").includes("Cone");
      if (isShard) {
        mesh.scale.set(
          scale.x * pulse,
          scale.y * (1 + Math.sin(elapsed * 2.1 + index + state.phase) * 0.06),
          scale.z * pulse
        );
        mesh.rotation.y += 0.0015 + index * 0.00005;
      }
      if (mesh.material && "emissiveIntensity" in mesh.material) {
        const base = materialBase(state, mesh.material);
        mesh.material.emissiveIntensity =
          Number(base?.emissiveIntensity || 0) *
          (0.9 + Math.max(0, Math.sin(elapsed * 2.3 + index)) * 0.35);
      }
    });
    state.lights.forEach(({ light, intensity }, index) => {
      light.intensity = intensity * (0.9 + Math.max(0, Math.sin(elapsed * 2.5 + index)) * 0.4);
    });
  };

  const updateStorm = (state, elapsed) => {
    state.root.position.x = state.anchor.position.x + Math.sin(elapsed * 0.08 + state.phase) * 1.7;
    state.root.position.z = state.anchor.position.z + Math.cos(elapsed * 0.065 + state.phase) * 1.25;
    state.root.rotation.y = state.anchor.rotation.y + elapsed * 0.06;

    state.meshes.forEach(({ mesh, rotation, scale }, index) => {
      if (mesh.name.includes("StormCloud") || mesh.name.includes("StormCore")) {
        const direction = Number(mesh.userData?.spinDirection || (index % 2 ? -1 : 1));
        mesh.rotation.y = rotation.y + elapsed * (0.18 + index * 0.025) * direction;
        mesh.rotation.z = rotation.z + Math.sin(elapsed * 0.45 + index) * 0.03;
        const breathe = 1 + Math.sin(elapsed * 1.3 + index) * 0.025;
        mesh.scale.set(scale.x * breathe, scale.y * breathe, scale.z * breathe);
      }
      if (mesh.name.includes("StormLightning")) {
        if ("opacity" in mesh.material) {
          const base = materialBase(state, mesh.material);
          const flash = Math.max(0, Math.sin(elapsed * 10 + index * 1.7));
          mesh.material.opacity = Number(base?.opacity ?? 1) * (0.2 + flash * 0.8);
        }
        if (mesh.material?.color?.setHex) {
          const band = Math.floor(elapsed * 4 + index) % 4;
          mesh.material.color.setHex(band < 2 ? 0xffffff : band === 2 ? 0xffd36b : 0xff9345);
        }
      }
    });

    state.lights.forEach(({ light, intensity }, index) => {
      const flash = Math.max(0, Math.sin(elapsed * 9.2 + index * 1.3));
      light.intensity = intensity * (0.85 + flash * 0.95);
    });
  };

  const updateIslet = (state, elapsed) => {
    state.root.position.x = state.anchor.position.x + Math.sin(elapsed * 0.07 + state.phase) * 1.25;
    state.root.position.z = state.anchor.position.z + Math.cos(elapsed * 0.055 + state.phase) * 0.9;
    state.root.position.y = state.anchor.position.y + Math.sin(elapsed * 0.52 + state.phase) * 0.22;
    state.root.rotation.y = state.anchor.rotation.y + Math.sin(elapsed * 0.15 + state.phase) * 0.09;

    state.meshes.forEach(({ mesh, rotation }, index) => {
      if (mesh.name.includes("LiftCrystal")) {
        mesh.rotation.y = rotation.y + elapsed * (0.38 + index * 0.03);
        mesh.rotation.z = rotation.z + Math.sin(elapsed * 0.6 + index) * 0.05;
      }
    });
  };

  const updateDrone = (state, elapsed) => {
    const active =
      state.type === "abandoned_drone" ||
      Boolean(BF.SpecialObjectRuntime?.snapshot?.().drones?.[state.type]?.active);

    state.root.position.y =
      state.anchor.position.y +
      Math.sin(elapsed * (active ? 1.35 : 0.55) + state.phase) * (active ? 0.1 : 0.025);
    state.root.rotation.z =
      state.anchor.rotation.z +
      Math.sin(elapsed * 0.82 + state.phase) * (active ? 0.04 : 0.01);

    state.meshes.forEach(({ mesh, rotation }, index) => {
      if (mesh.name.includes("Rotor")) {
        mesh.rotation.z = rotation.z + elapsed * (active ? 8 + index : 0.7);
      }
      if (mesh.name.includes("Sensor") || mesh.name.includes("Optic")) {
        mesh.rotation.y = rotation.y + Math.sin(elapsed * 1.1 + index) * 0.25;
      }
      if (mesh.name.includes("HarvestArm")) {
        mesh.rotation.z = rotation.z + Math.sin(elapsed * 1.2 + index) * 0.12;
      }
      if (mesh.material && "emissiveIntensity" in mesh.material) {
        const base = materialBase(state, mesh.material);
        mesh.material.emissiveIntensity =
          Number(base?.emissiveIntensity || 0) *
          (active ? 1 + Math.max(0, Math.sin(elapsed * 2.7 + index)) * 0.45 : 0.35);
      }
    });

    state.lights.forEach(({ light, intensity }, index) => {
      light.intensity = intensity * (active ? 0.9 + Math.max(0, Math.sin(elapsed * 3 + index)) * 0.6 : 0.25);
    });
  };

  const updateRelic = (state, elapsed) => {
    state.root.rotation.y = state.anchor.rotation.y + Math.sin(elapsed * 0.14 + state.phase) * 0.015;
    state.meshes.forEach(({ mesh, rotation }, index) => {
      if (mesh.material && "emissiveIntensity" in mesh.material) {
        const base = materialBase(state, mesh.material);
        const sweep = Math.max(0, Math.sin(elapsed * 0.9 + index * 0.55 + state.phase));
        mesh.material.emissiveIntensity =
          Number(base?.emissiveIntensity || 0) * (0.75 + sweep * 0.65);
      }
      if (mesh.name.includes("Rune") || mesh.name.includes("Scan")) {
        mesh.rotation.y = rotation.y + elapsed * 0.22;
      }
    });
    state.lights.forEach(({ light, intensity }, index) => {
      light.intensity = intensity * (0.75 + Math.max(0, Math.sin(elapsed * 1.05 + index)) * 0.5);
    });
  };

  const update = (state, elapsed) => {
    if (!state.enabled || !state.root.parent || state.root.visible === false) return;
    if (state.type === "electrostatic_storm") updateStorm(state, elapsed);
    else if (state.type === "mobile_islet") updateIslet(state, elapsed);
    else if (state.type.includes("drone")) updateDrone(state, elapsed);
    else if (
      state.type.includes("crystal") ||
      state.type === "crystal"
    ) updateCrystal(state, elapsed);
    else updateRelic(state, elapsed);
  };

  BF.ObjectLibrary.registerCreateHook((instance, context = {}) => {
    const root = instance?.root;
    const type = context.type || instance?.definition?.type || root?.userData?.libraryType;
    if (!root || !TYPES.has(type)) return;
    const attach = () => register(root, type);
    if (root.parent) attach();
    else global.requestAnimationFrame?.(attach) || attach();
  });

  let running = true;
  const startedAt = nowSeconds();
  let lastCleanupAt = 0;

  const frame = () => {
    if (!running) return;
    const elapsed = nowSeconds() - startedAt;
    registry.forEach((root) => {
      const state = states.get(root);
      if (state && (!BF.RuntimeBudget || BF.RuntimeBudget.shouldUpdate(root, "phenomenon", elapsed))) update(state, elapsed);
    });

    if (elapsed - lastCleanupAt > 8) {
      lastCleanupAt = elapsed;
      registry.forEach((root) => {
        if (!root?.parent) unregister(root);
      });
    }
    global.requestAnimationFrame?.(frame);
  };

  BF.PhenomenonRuntime = Object.freeze({
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
  console.info("[BlueFox P2.2.5] Runtime phénomènes actif.");
})(window);
