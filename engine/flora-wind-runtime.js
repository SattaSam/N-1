(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (!BF.ObjectLibrary?.registerCreateHook) {
    console.error("[BlueFox Flora Wind] ObjectLibrary compatible requise.");
    return;
  }

  BF.FloraRuntime?.stop?.();

  const VERSION = "flora-wind-r2";
  const SEQUENCED_TYPES = new Set([
    "lunar_vine", "frond", "ground_frond", "ground_fronds",
    "fern", "prismatic_orchid", "fluorescent_vegetation"
  ]);
  const nocturnalRegistry = new Set();
  const nocturnalStates = new WeakMap();
  const registry = new Set();
  const states = new WeakMap();
  const excluded = new Set(["carnivorous_plant"]);
  const now = () => (global.performance?.now?.() || Date.now()) / 1000;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const tagsOf = (definition) => new Set([
    ...(definition?.spawn?.tags || []),
    ...(definition?.spawnProfile?.tags || []),
    ...(definition?.situation?.tags || []),
    ...(definition?.tags || [])
  ]);

  const isFlora = (definition, type) => {
    if (!definition || excluded.has(type)) return false;
    const tags = tagsOf(definition);
    return definition.category === "flora" || definition.family === "flora" ||
      definition.knowledge?.family === "flora" || definition.resource?.family === "biomass" ||
      tags.has("plant") || tags.has("fungus") || tags.has("ground_cover") || type.includes("tree");
  };

  const snapshot = (object) => ({
    object,
    position: object.position.clone(),
    rotation: object.rotation.clone(),
    scale: object.scale.clone()
  });

  const classify = (root, type, definition) => {
    const meshes = [];
    const groups = [];
    root.traverse?.((child) => {
      if (child.userData?.interactable) return;
      if (child.isMesh) meshes.push(child);
      if (child.isGroup && child !== root) groups.push(child);
    });
    const all = [...groups, ...meshes];
    const crowns = [];
    const flexible = [];
    const glows = [];
    const spores = [];
    const caps = [];
    const coniferCrowns = [];

    all.forEach((part) => {
      const name = String(part.name || "").toLowerCase();
      const geometry = String(part.geometry?.type || "").toLowerCase();
      const y = Number(part.position?.y || 0);
      if (name.includes("spore") || name.includes("pollen")) spores.push(part);
      if (name.includes("cap") || name.includes("mushroom")) caps.push(part);
      if (part.isMesh && (part.material?.emissive || Number(part.material?.emissiveIntensity || 0) > 0)) glows.push(part);
      if (name.includes("crown") || name.includes("leaf") || name.includes("bulb") ||
          geometry.includes("sphere") || geometry.includes("icosahedron") || geometry.includes("dodecahedron")) crowns.push(part);
      if (geometry.includes("cone") && y > 1) coniferCrowns.push(part);
      if (y > 0.12 && !name.includes("stem") && !name.includes("trunk")) flexible.push(part);
    });

    const tags = tagsOf(definition);
    const conifer = type === "nature_tree" || tags.has("conifer") || coniferCrowns.length >= 2;
    const tree = type.includes("tree") || definition.size === "L" || definition.size === "XL";
    const fungus = tags.has("fungus") || type.includes("mushroom") || type.includes("spore");
    const ground = tags.has("ground_cover") || type.includes("vegetation") || type.includes("frond");
    const sequenceParts = all.filter((part) => {
      const name = String(part.name || "").toLowerCase();
      const geometry = String(part.geometry?.type || "").toLowerCase();
      const y = Number(part.position?.y || 0);
      return y > 0.08 && !name.includes("hitbox") &&
        (geometry.includes("cylinder") || geometry.includes("capsule") ||
         name.includes("stem") || name.includes("vine") || name.includes("frond") ||
         name.includes("fern") || name.includes("leaf") || name.includes("orchid") ||
         name.includes("blade") || name.includes("flower"));
    });
    return { all, meshes, crowns, flexible, glows, spores, caps, coniferCrowns, sequenceParts, conifer, tree, fungus, ground };
  };

  const register = (root, type, definition) => {
    if (!root || states.has(root) || !isFlora(definition, type)) return false;
    const parts = classify(root, type, definition);
    const objects = parts.all.map(snapshot);
    const materials = new Set();
    parts.meshes.forEach((mesh) => {
      if (Array.isArray(mesh.material)) mesh.material.forEach((m) => materials.add(m));
      else if (mesh.material) materials.add(mesh.material);
    });
    const materialStates = [...materials].map((material) => ({
      material,
      emissiveIntensity: Number(material.emissiveIntensity || 0),
      opacity: Number(material.opacity ?? 1)
    }));
    states.set(root, {
      root, type, definition, parts, objects, materialStates,
      phase: Math.random() * Math.PI * 2,
      anchor: { position: root.position.clone(), rotation: root.rotation.clone(), scale: root.scale.clone() },
      enabled: true
    });
    root.userData.floraRuntime = VERSION;
    BF.PassiveObjectRuntime?.setEnabled?.(root, false);
    registry.add(root);
    return true;
  };

  const restore = (state) => {
    state.root.position.copy(state.anchor.position);
    state.root.rotation.copy(state.anchor.rotation);
    state.root.scale.copy(state.anchor.scale);
    state.objects.forEach(({ object, position, rotation, scale }) => {
      object.position.copy(position);
      object.rotation.copy(rotation);
      object.scale.copy(scale);
    });
    state.materialStates.forEach(({ material, emissiveIntensity, opacity }) => {
      if ("emissiveIntensity" in material) material.emissiveIntensity = emissiveIntensity;
      if ("opacity" in material) material.opacity = opacity;
    });
  };

  const windStrength = () => {
    const weather = BF.currentEngine?.weather || BF.weather || {};
    return clamp(Number(weather.windStrength ?? weather.wind ?? 0.38), 0.12, 1.5);
  };

  const baseOf = (state, object) => state.objects.find((item) => item.object === object);

  const animatePlant = (state, elapsed, wind) => {
    const slow = Math.sin(elapsed * 0.52 + state.phase);
    const cross = Math.sin(elapsed * 0.37 + state.phase * 1.61);
    state.root.rotation.z = state.anchor.rotation.z + slow * 0.008 * wind;
    state.root.rotation.x = state.anchor.rotation.x + cross * 0.005 * wind;
    state.parts.flexible.forEach((part, index) => {
      const base = baseOf(state, part);
      if (!base) return;
      const phase = elapsed * (0.46 + (index % 4) * 0.045) + state.phase + index * 0.73;
      const amplitude = (state.parts.ground ? 0.024 : 0.014) * wind;
      part.rotation.z = base.rotation.z + Math.sin(phase) * amplitude;
      part.rotation.x = base.rotation.x + Math.cos(phase * 0.81) * amplitude * 0.58;
    });
  };

  const smooth = (value) => value * value * (3 - 2 * value);

  const animateSequencedPlant = (state, elapsed, wind) => {
    const parts = state.parts.sequenceParts.length ? state.parts.sequenceParts : state.parts.flexible;
    const cycle = 20;
    const local = (elapsed + state.phase * 1.7) % cycle;

    // Chaque cycle revient réellement à la transformation d'origine pendant les délais.
    parts.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      part.rotation.copy(base.rotation);
      part.position.copy(base.position);
    });
    state.root.rotation.copy(state.anchor.rotation);

    if (local >= 2.5 && local < 7.2) {
      // Phase 1 : tiges désynchronisées et mouvement volontairement bien visible.
      const p = (local - 2.5) / 4.7;
      const envelope = Math.sin(Math.PI * p);
      parts.forEach((part, index) => {
        const base = baseOf(state, part);
        if (!base) return;
        const wave = Math.sin(elapsed * (1.25 + (index % 5) * 0.13) + state.phase + index * 1.17);
        const cross = Math.cos(elapsed * (0.92 + (index % 3) * 0.11) + index * 0.71);
        const amplitude = (0.105 + (index % 4) * 0.012) * wind * envelope;
        part.rotation.z = base.rotation.z + wave * amplitude;
        part.rotation.x = base.rotation.x + cross * amplitude * 0.58;
        part.position.y = base.position.y + Math.sin(elapsed * 1.08 + index) * 0.018 * envelope;
      });
      return;
    }

    if (local >= 9.4 && local < 14.2) {
      // Phase 2 : toutes les tiges basculent ensemble dans la même direction puis reviennent au repos.
      const p = (local - 9.4) / 4.8;
      const pendulum = Math.sin(Math.PI * p);
      const direction = Math.sin(state.phase) >= 0 ? 1 : -1;
      const sharedTilt = direction * pendulum * 0.145 * wind;
      state.root.rotation.z = state.anchor.rotation.z + sharedTilt * 0.2;
      state.root.rotation.x = state.anchor.rotation.x + sharedTilt * 0.08;
      parts.forEach((part, index) => {
        const base = baseOf(state, part);
        if (!base) return;
        const heightFactor = 0.78 + (index % 5) * 0.055;
        part.rotation.z = base.rotation.z + sharedTilt * heightFactor;
        part.rotation.x = base.rotation.x + sharedTilt * 0.32 * heightFactor;
        part.position.x = base.position.x + direction * pendulum * 0.025 * heightFactor;
      });
    }
  };

  const animateConifer = (state, elapsed, wind) => {
    const sway = Math.sin(elapsed * 0.31 + state.phase);
    const secondary = Math.sin(elapsed * 0.21 + state.phase * 1.43);
    state.root.rotation.z = state.anchor.rotation.z + sway * 0.0065 * wind;
    state.root.rotation.x = state.anchor.rotation.x + secondary * 0.0038 * wind;
    state.parts.coniferCrowns.forEach((part, index) => {
      const base = baseOf(state, part);
      if (!base) return;
      const heightFactor = 0.55 + index / Math.max(1, state.parts.coniferCrowns.length - 1) * 0.65;
      const phase = elapsed * 0.34 + state.phase + index * 0.14;
      part.rotation.z = base.rotation.z + Math.sin(phase) * 0.009 * heightFactor * wind;
      part.rotation.x = base.rotation.x + Math.cos(phase * 0.77) * 0.005 * heightFactor * wind;
    });
  };

  const animateClassicTree = (state, elapsed, wind) => {
    const sway = Math.sin(elapsed * 0.27 + state.phase);
    state.root.rotation.z = state.anchor.rotation.z + sway * 0.0045 * wind;
    state.root.rotation.x = state.anchor.rotation.x + Math.sin(elapsed * 0.19 + state.phase * 1.2) * 0.0025 * wind;
    state.parts.crowns.forEach((part, index) => {
      const base = baseOf(state, part);
      if (!base) return;
      const phase = elapsed * (0.24 + (index % 3) * 0.018) + state.phase + index * 0.53;
      const pendulum = Math.sin(phase);
      const lateral = Math.cos(phase * 0.83);
      part.position.y = base.position.y + pendulum * 0.045 * wind;
      part.position.x = base.position.x + lateral * 0.035 * wind;
      part.position.z = base.position.z + pendulum * 0.022 * wind;
      part.rotation.z = base.rotation.z + lateral * 0.012 * wind;
      part.rotation.x = base.rotation.x + pendulum * 0.007 * wind;
    });
  };

  const animateFungus = (state, elapsed, wind) => {
    state.parts.caps.forEach((part, index) => {
      const base = baseOf(state, part);
      if (!base) return;
      const phase = elapsed * 0.34 + state.phase + index * 0.82;
      part.rotation.z = base.rotation.z + Math.sin(phase) * 0.008 * wind;
      part.rotation.x = base.rotation.x + Math.cos(phase * 0.73) * 0.005 * wind;
    });
  };

  const animateGlow = (state, elapsed) => {
    state.parts.glows.forEach((mesh, index) => {
      const entries = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      entries.forEach((material) => {
        const base = state.materialStates.find((item) => item.material === material);
        if (!base || !("emissiveIntensity" in material)) return;
        material.emissiveIntensity = Math.max(0, base.emissiveIntensity * (0.92 + Math.sin(elapsed * 0.88 + index * 0.61 + state.phase) * 0.08));
      });
    });
  };

  const update = (state, elapsed) => {
    if (!state.enabled || !state.root.parent || state.root.visible === false) return;
    const wind = windStrength();
    if (SEQUENCED_TYPES.has(state.type)) {
      animateSequencedPlant(state, elapsed, wind);
    } else if (state.parts.tree) {
      if (state.parts.conifer) animateConifer(state, elapsed, wind);
      else animateClassicTree(state, elapsed, wind);
    } else {
      animatePlant(state, elapsed, wind);
    }
    if (state.parts.fungus) animateFungus(state, elapsed, wind);
    animateGlow(state, elapsed);
  };

  const registerNocturnal = (root) => {
    if (!root || nocturnalStates.has(root)) return false;
    const ears = [];
    root.traverse?.((child) => { if (child.name === "SensorEar") ears.push(child); });
    if (!ears.length) return false;
    nocturnalStates.set(root, {
      root,
      ears: ears.map((ear, index) => ({
        ear,
        index,
        rotation: ear.rotation.clone()
      })),
      phase: Math.random() * Math.PI * 2
    });
    nocturnalRegistry.add(root);
    return true;
  };

  const animateNocturnalEars = (state, elapsed) => {
    if (!state.root.parent || state.root.visible === false) return;
    const cycle = 7.8;
    const local = (elapsed + state.phase) % cycle;
    state.ears.forEach(({ ear, rotation }) => ear.rotation.copy(rotation));

    if (local < 1.5) {
      // Deux petites orientations d'écoute, volontairement asymétriques.
      state.ears.forEach(({ ear, rotation, index }) => {
        const twitch = Math.sin(local * Math.PI * 2.7 + index * 1.6);
        const envelope = Math.sin(Math.PI * Math.min(1, local / 1.5));
        ear.rotation.z = rotation.z + twitch * envelope * (index ? 0.19 : 0.14);
        ear.rotation.x = rotation.x + Math.cos(local * 5.4 + index) * envelope * 0.075;
        ear.rotation.y = rotation.y + (index ? 1 : -1) * envelope * 0.055;
      });
    } else if (local >= 3.4 && local < 5.4) {
      // Écoute orientée : les deux oreilles se penchent ensemble, puis reviennent.
      const p = (local - 3.4) / 2;
      const lean = Math.sin(Math.PI * p);
      const direction = Math.sin(state.phase) >= 0 ? 1 : -1;
      state.ears.forEach(({ ear, rotation, index }) => {
        ear.rotation.z = rotation.z + direction * lean * (0.13 + index * 0.025);
        ear.rotation.x = rotation.x - lean * 0.06;
      });
    }
  };

  BF.ObjectLibrary.registerCreateHook((instance, context = {}) => {
    const root = instance?.root;
    const definition = instance?.definition || context.definition || BF.ObjectLibrary.get?.(context.type || root?.userData?.libraryType);
    const type = context.type || definition?.type || root?.userData?.libraryType;
    if (root && type === "nocturnal_animal") {
      const attachEars = () => registerNocturnal(root);
      if (root.parent) attachEars();
      else global.requestAnimationFrame?.(attachEars) || attachEars();
    }
    if (!root || !isFlora(definition, type)) return;
    const attach = () => register(root, type, definition);
    if (root.parent) attach();
    else global.requestAnimationFrame?.(attach) || attach();
  });

  let running = true;
  const startedAt = now();
  let lastCleanup = 0;
  const frame = () => {
    if (!running) return;
    const elapsed = now() - startedAt;
    registry.forEach((root) => {
      const state = states.get(root);
      if (state && (!BF.RuntimeBudget || BF.RuntimeBudget.shouldUpdate(root, "flora", elapsed))) update(state, elapsed);
    });
    // Exécuté après FaunaRuntime : cette passe donne la priorité aux mouvements d'oreilles dédiés.
    nocturnalRegistry.forEach((root) => {
      const state = nocturnalStates.get(root);
      if (state) animateNocturnalEars(state, elapsed);
    });
    if (elapsed - lastCleanup > 8) {
      lastCleanup = elapsed;
      registry.forEach((root) => {
        if (!root?.parent) {
          const state = states.get(root);
          if (state) restore(state);
          states.delete(root);
          registry.delete(root);
        }
      });
      nocturnalRegistry.forEach((root) => {
        if (!root?.parent) {
          nocturnalStates.delete(root);
          nocturnalRegistry.delete(root);
        }
      });
    }
    global.requestAnimationFrame?.(frame);
  };

  BF.FloraWindRuntime = Object.freeze({
    version: VERSION,
    snapshot: () => Object.freeze({ version: VERSION, registered: registry.size, nocturnal: nocturnalRegistry.size, running }),
    setEnabled(root, enabled) {
      const state = states.get(root);
      if (!state) return false;
      state.enabled = Boolean(enabled);
      if (!state.enabled) restore(state);
      return true;
    },
    stop() {
      running = false;
      registry.forEach((root) => {
        const state = states.get(root);
        if (state) restore(state);
      });
    }
  });

  global.requestAnimationFrame?.(frame);
  console.info("[BlueFox Flora Wind] Séquences végétales amplifiées et oreilles nocturnes actives.");
})(window);
