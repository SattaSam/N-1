(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (!BF.ObjectLibrary?.create) {
    console.error("[BlueFox P2.2.2] ObjectLibrary doit être chargé avant le runtime PNJ.");
    return;
  }

  const VERSION = "P2.2.2-r1";
  const NPC_TYPES = new Set(["npc_translucent", "npc_rocky"]);
  const registry = new Set();
  const states = new WeakMap();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const nowSeconds = () => (global.performance?.now?.() || Date.now()) / 1000;

  const playerRoot = () =>
    BF.currentEngine?.character?.root ||
    BF.currentEngine?.characterController?.root ||
    BF.characterController?.root ||
    null;

  const distanceToPlayer = (root) => {
    const player = playerRoot();
    if (!player) return Infinity;
    return Math.hypot(
      Number(player.position?.x || 0) - Number(root.position?.x || 0),
      Number(player.position?.z || 0) - Number(root.position?.z || 0)
    );
  };

  const collectNamed = (root, name) => {
    const values = [];
    root.traverse?.((child) => {
      if (child.name === name) values.push(child);
    });
    return values;
  };

  const materialSnapshot = (materials) => materials.map((material) => ({
    material,
    emissiveIntensity: Number(material?.emissiveIntensity || 0),
    opacity: Number(material?.opacity ?? 1)
  }));

  const objectSnapshot = (object) => ({
    object,
    position: object.position.clone(),
    rotation: object.rotation.clone(),
    scale: object.scale.clone()
  });

  const capture = (root, type) => {
    const named = {
      eyes: collectNamed(root, "NpcEye"),
      core: collectNamed(root, "NpcCore"),
      translucentHead: collectNamed(root, "TranslucentHeadFine"),
      translucentTorso: collectNamed(root, "TranslucentTorsoFine"),
      membranes: collectNamed(root, "TranslucentMembrane"),
      filaments: collectNamed(root, "TranslucentFilament"),
      shoulders: collectNamed(root, "TranslucentShoulder"),
      upperArms: collectNamed(root, "TranslucentUpperArm"),
      forearms: collectNamed(root, "TranslucentForearm"),
      rockyHead: collectNamed(root, "RockyHead"),
      rockyTorso: collectNamed(root, "RockyTorso"),
      rockyPlates: [...collectNamed(root, "RockyPlate"), ...collectNamed(root, "RockyLimbPlate")],
      rockyFragments: collectNamed(root, "RockyFragment")
    };

    const animatedObjects = new Set(Object.values(named).flat());
    const materials = new Set();
    animatedObjects.forEach((object) => {
      if (Array.isArray(object.material)) object.material.forEach((item) => materials.add(item));
      else if (object.material) materials.add(object.material);
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
      named,
      objects: [...animatedObjects].map(objectSnapshot),
      materials: materialSnapshot([...materials]),
      state: "rest",
      previousState: "rest",
      stateSince: nowSeconds(),
      nextIdleChangeAt: nowSeconds() + 3 + Math.random() * 4,
      lookBlend: 0,
      enabled: true
    };
  };

  const restoreObject = (snapshot) => {
    snapshot.object.position.copy(snapshot.position);
    snapshot.object.rotation.copy(snapshot.rotation);
    snapshot.object.scale.copy(snapshot.scale);
  };

  const restore = (root) => {
    const state = states.get(root);
    if (!state) return false;
    root.position.copy(state.anchor.position);
    root.rotation.copy(state.anchor.rotation);
    root.scale.copy(state.anchor.scale);
    state.objects.forEach(restoreObject);
    state.materials.forEach(({ material, emissiveIntensity, opacity }) => {
      if ("emissiveIntensity" in material) material.emissiveIntensity = emissiveIntensity;
      if ("opacity" in material) material.opacity = opacity;
    });
    return true;
  };

  const register = (root, type) => {
    if (!root || !NPC_TYPES.has(type) || states.has(root)) return false;
    root.userData.libraryType ||= type;
    root.userData.npcRuntime = VERSION;
    BF.PassiveObjectRuntime?.setEnabled?.(root, false);
    const state = capture(root, type);
    states.set(root, state);
    registry.add(root);
    return true;
  };

  const unregister = (root) => {
    if (!states.has(root)) return false;
    restore(root);
    registry.delete(root);
    states.delete(root);
    return true;
  };

  const chooseState = (state, elapsed, distance) => {
    const previous = state.state;
    if (distance < 2.1) state.state = "vigilance";
    else if (distance < 5.5) state.state = "curiosity";
    else if (elapsed >= state.nextIdleChangeAt) {
      const choices = state.type === "npc_rocky"
        ? ["rest", "observation", "rest", "vigilance"]
        : ["rest", "observation", "curiosity", "rest"];
      state.state = choices[Math.floor(Math.random() * choices.length)];
      state.nextIdleChangeAt = elapsed + 4 + Math.random() * 7;
    }
    if (previous !== state.state) {
      state.previousState = previous;
      state.stateSince = elapsed;
      rootEvent(state.root, "bluefox:npc-state", {
        type: state.type,
        previous,
        state: state.state
      });
    }
  };

  const rootEvent = (root, eventName, detail) => {
    try {
      root.dispatchEvent?.({ type: eventName, detail });
      global.dispatchEvent?.(new CustomEvent(eventName, { detail: { root, ...detail } }));
    } catch {
      // Une animation ne doit jamais interrompre la boucle du jeu.
    }
  };

  const facePlayer = (state, distance, strength, maxAngle) => {
    const player = playerRoot();
    if (!player || !Number.isFinite(distance)) return;
    const dx = Number(player.position.x || 0) - Number(state.root.position.x || 0);
    const dz = Number(player.position.z || 0) - Number(state.root.position.z || 0);
    const targetYaw = Math.atan2(dx, dz);
    let delta = targetYaw - state.root.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    const desired = clamp(delta, -maxAngle, maxAngle);
    state.lookBlend += (strength - state.lookBlend) * 0.06;
    const heads = state.type === "npc_rocky" ? state.named.rockyHead : state.named.translucentHead;
    heads.forEach((head) => {
      const base = state.objects.find((item) => item.object === head);
      if (!base) return;
      head.rotation.y = base.rotation.y + desired * state.lookBlend;
    });
  };

  const updateEyes = (state, elapsed, intensity, tracking) => {
    state.named.eyes.forEach((eye, index) => {
      const base = state.objects.find((item) => item.object === eye);
      if (!base) return;
      eye.scale.set(
        base.scale.x * (1 + Math.sin(elapsed * 1.7 + index + state.phase) * 0.025),
        base.scale.y * (1 + Math.sin(elapsed * 1.2 + index) * 0.04),
        base.scale.z
      );
      if (eye.material && "emissiveIntensity" in eye.material) {
        const materialBase = state.materials.find((item) => item.material === eye.material);
        eye.material.emissiveIntensity = Math.max(
          0,
          Number(materialBase?.emissiveIntensity || 0) * intensity
        );
      }
      eye.rotation.y = base.rotation.y + tracking * (eye.userData.side || 0) * 0.06;
    });
  };

  const updateTranslucent = (state, elapsed, distance) => {
    const proximity = clamp(1 - distance / 6, 0, 1);
    const curious = state.state === "curiosity" || state.state === "observation";
    const vigilant = state.state === "vigilance";
    const breathe = Math.sin(elapsed * (vigilant ? 1.25 : 0.72) + state.phase);
    const hover = Math.sin(elapsed * 0.82 + state.phase * 0.7);
    const drift = Math.sin(elapsed * 0.31 + state.phase);

    state.root.position.y = state.anchor.position.y + hover * 0.045;
    state.root.rotation.z = state.anchor.rotation.z + drift * 0.008;
    state.root.rotation.x = state.anchor.rotation.x + (curious ? -0.025 : 0);

    state.named.translucentTorso.forEach((torso) => {
      const base = state.objects.find((item) => item.object === torso);
      if (!base) return;
      torso.scale.set(
        base.scale.x * (1 - breathe * 0.012),
        base.scale.y * (1 + breathe * 0.025),
        base.scale.z * (1 + breathe * 0.018)
      );
    });

    state.named.core.forEach((core, index) => {
      const base = state.objects.find((item) => item.object === core);
      if (!base) return;
      const pulse = 1 + Math.sin(elapsed * 1.85 + index + state.phase) * (0.08 + proximity * 0.04);
      core.scale.set(base.scale.x * pulse, base.scale.y * pulse, base.scale.z * pulse);
      core.rotation.y = base.rotation.y + elapsed * 0.62;
      if (core.material && "emissiveIntensity" in core.material) {
        const materialBase = state.materials.find((item) => item.material === core.material);
        core.material.emissiveIntensity =
          Number(materialBase?.emissiveIntensity || 0) * (1 + proximity * 0.3 + Math.max(0, breathe) * 0.12);
      }
    });

    state.named.membranes.forEach((membrane, index) => {
      const base = state.objects.find((item) => item.object === membrane);
      if (!base) return;
      membrane.rotation.x = base.rotation.x + Math.sin(elapsed * 1.1 + index * 1.7 + state.phase) * 0.045;
      membrane.rotation.z = base.rotation.z + Math.sin(elapsed * 0.83 + index + state.phase) * 0.025;
      membrane.scale.y = base.scale.y * (1 + Math.sin(elapsed * 1.35 + index) * 0.035);
    });

    state.named.filaments.forEach((filament, index) => {
      const base = state.objects.find((item) => item.object === filament);
      if (!base) return;
      filament.rotation.z =
        base.rotation.z + Math.sin(elapsed * 1.05 + index * 0.58 + state.phase) * (0.035 + proximity * 0.025);
      filament.rotation.x =
        base.rotation.x + Math.cos(elapsed * 0.8 + index * 0.44) * 0.018;
    });

    state.named.shoulders.forEach((part, index) => {
      const base = state.objects.find((item) => item.object === part);
      if (base) part.rotation.x = base.rotation.x + breathe * 0.018 * (index ? -1 : 1);
    });
    state.named.upperArms.forEach((part, index) => {
      const base = state.objects.find((item) => item.object === part);
      if (base) part.rotation.z = base.rotation.z + breathe * 0.012 + (curious ? (index ? -0.025 : 0.025) : 0);
    });
    state.named.forearms.forEach((part, index) => {
      const base = state.objects.find((item) => item.object === part);
      if (base) part.rotation.z = base.rotation.z - breathe * 0.01 + (vigilant ? (index ? 0.035 : -0.035) : 0);
    });

    facePlayer(state, distance, proximity, vigilant ? 0.62 : 0.42);
    updateEyes(state, elapsed, 0.9 + proximity * 0.35, proximity);
  };

  const updateRocky = (state, elapsed, distance) => {
    const proximity = clamp(1 - distance / 6.5, 0, 1);
    const vigilant = state.state === "vigilance";
    const observation = state.state === "observation" || state.state === "curiosity";
    const breath = Math.sin(elapsed * (vigilant ? 0.78 : 0.46) + state.phase);
    const weight = Math.sin(elapsed * 0.24 + state.phase * 0.6);

    state.root.rotation.z = state.anchor.rotation.z + weight * 0.009;
    state.root.rotation.x = state.anchor.rotation.x + (observation ? -0.015 : 0);

    state.named.rockyTorso.forEach((torso) => {
      const base = state.objects.find((item) => item.object === torso);
      if (!base) return;
      torso.scale.set(
        base.scale.x * (1 - breath * 0.006),
        base.scale.y * (1 + breath * 0.012),
        base.scale.z * (1 + breath * 0.01)
      );
      torso.position.y = base.position.y + breath * 0.009;
    });

    state.named.rockyPlates.forEach((plate, index) => {
      const base = state.objects.find((item) => item.object === plate);
      if (!base) return;
      const local = Math.sin(elapsed * 0.35 + index * 0.9 + state.phase);
      plate.position.y = base.position.y + local * 0.006;
      plate.rotation.z = base.rotation.z + local * 0.004 + (vigilant ? Math.sin(elapsed * 3 + index) * 0.002 : 0);
    });

    state.named.rockyFragments.forEach((fragment, index) => {
      const base = state.objects.find((item) => item.object === fragment);
      if (!base) return;
      const loosen = Math.max(0, Math.sin(elapsed * 0.52 + index * 1.31 + state.phase));
      fragment.position.y = base.position.y - loosen * (index % 4 === 0 ? 0.018 : 0.004);
      fragment.rotation.y = base.rotation.y + elapsed * (0.012 + index * 0.001);
    });

    facePlayer(state, distance, proximity, vigilant ? 0.35 : 0.24);
    updateEyes(state, elapsed, 0.82 + proximity * 0.5 + Math.max(0, breath) * 0.08, proximity * 0.65);
  };

  const update = (state, elapsed) => {
    if (!state.enabled || !state.root.parent || state.root.visible === false) return;
    const distance = distanceToPlayer(state.root);
    chooseState(state, elapsed, distance);
    if (state.type === "npc_translucent") updateTranslucent(state, elapsed, distance);
    else updateRocky(state, elapsed, distance);
  };

  BF.ObjectLibrary.registerCreateHook((instance, context = {}) => {
    const root = instance?.root;
    const type = context.type || instance?.definition?.type || root?.userData?.libraryType;
    if (!root || !NPC_TYPES.has(type)) return;
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
      if (state && (!BF.RuntimeBudget || BF.RuntimeBudget.shouldUpdate(root, "npc", elapsed))) update(state, elapsed);
    });
    if (elapsed - lastCleanupAt > 8) {
      lastCleanupAt = elapsed;
      registry.forEach((root) => {
        if (!root?.parent) unregister(root);
      });
    }
    global.requestAnimationFrame?.(frame);
  };

  BF.NpcRuntime = Object.freeze({
    version: VERSION,
    register,
    unregister,
    restore,
    getState(root) {
      const state = states.get(root);
      return state ? Object.freeze({
        type: state.type,
        state: state.state,
        previousState: state.previousState,
        stateSince: state.stateSince,
        enabled: state.enabled
      }) : null;
    },
    setState(root, nextState) {
      const state = states.get(root);
      const allowed = new Set(["rest", "observation", "curiosity", "vigilance", "movement", "interaction", "dialogue", "flee", "calm"]);
      if (!state || !allowed.has(nextState)) return false;
      state.previousState = state.state;
      state.state = nextState;
      state.stateSince = nowSeconds() - startedAt;
      state.nextIdleChangeAt = Infinity;
      return true;
    },
    releaseState(root) {
      const state = states.get(root);
      if (!state) return false;
      state.nextIdleChangeAt = nowSeconds() - startedAt;
      return true;
    },
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
  console.info("[BlueFox P2.2.2] Runtime PNJ actif.");
})(window);
