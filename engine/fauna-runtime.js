(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (!BF.ObjectLibrary?.create) {
    console.error("[BlueFox P2.2.3] ObjectLibrary doit être chargé avant le runtime faune.");
    return;
  }

  const VERSION = "P2.2.3-r1";
  const FAUNA_TYPES = new Set([
    "fun_creature", "small_creature", "brouteur", "sauteur",
    "patte_creature", "nocturnal_animal"
  ]);
  const SPECIAL_OWNED = new Set(["nocturnal_animal"]);
  const registry = new Set();
  const states = new WeakMap();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const seconds = () => (global.performance?.now?.() || Date.now()) / 1000;

  const playerRoot = () =>
    BF.currentEngine?.character?.root ||
    BF.currentEngine?.characterController?.root ||
    BF.characterController?.root || null;

  const distanceToPlayer = (root) => {
    const player = playerRoot();
    if (!player) return Infinity;
    return Math.hypot(
      Number(player.position?.x || 0) - Number(root.position?.x || 0),
      Number(player.position?.z || 0) - Number(root.position?.z || 0)
    );
  };

  const snapshot = (object) => ({
    object,
    position: object.position.clone(),
    rotation: object.rotation.clone(),
    scale: object.scale.clone()
  });

  const meshChildren = (root) => (root.children || []).filter((child) => child?.isMesh);

  const tagGenericParts = (root, type) => {
    const meshes = meshChildren(root).filter((mesh) => !mesh.userData?.interactable);
    if (!meshes.length) return;
    meshes[0].name ||= "FaunaBody";
    if (meshes[1]) meshes[1].name ||= "FaunaHead";
    const eyes = meshes.filter((mesh) => {
      const r = mesh.geometry?.parameters?.radius;
      return Number.isFinite(r) && r <= 0.12 && mesh.position.x > 0;
    });
    eyes.forEach((eye) => { eye.name = "FaunaEye"; });
    meshes.slice(2).forEach((mesh) => {
      if (eyes.includes(mesh)) return;
      const height = Number(mesh.geometry?.parameters?.height || mesh.geometry?.parameters?.length || 0);
      if (height > 0.35) mesh.name ||= "FaunaLimb";
      else mesh.name ||= "FaunaDetail";
    });
    root.userData.faunaTagged = type;
  };

  const collectNamed = (root, name) => {
    const items = [];
    root.traverse?.((child) => { if (child.name === name) items.push(child); });
    return items;
  };

  const capture = (root, type) => {
    if (!SPECIAL_OWNED.has(type)) tagGenericParts(root, type);
    const parts = {
      bodies: [...collectNamed(root, "FaunaBody"), ...collectNamed(root, "NocturnalBody")],
      heads: collectNamed(root, "FaunaHead"),
      eyes: [...collectNamed(root, "FaunaEye"), ...collectNamed(root, "NightGlow")],
      limbs: collectNamed(root, "FaunaLimb"),
      ears: collectNamed(root, "SensorEar"),
      details: collectNamed(root, "FaunaDetail")
    };
    const objects = [...new Set(Object.values(parts).flat())].map(snapshot);
    return {
      root, type, parts, objects,
      anchor: {
        position: root.position.clone(),
        rotation: root.rotation.clone(),
        scale: root.scale.clone()
      },
      phase: Math.random() * Math.PI * 2,
      state: type === "nocturnal_animal" ? "sleep" : "rest",
      previousState: null,
      stateSince: seconds(),
      nextStateAt: seconds() + 3 + Math.random() * 5,
      fleeUntil: 0,
      forageDirection: Math.random() * Math.PI * 2,
      enabled: true,
      specialOwned: SPECIAL_OWNED.has(type)
    };
  };

  const restore = (root) => {
    const state = states.get(root);
    if (!state) return false;
    if (!state.specialOwned) {
      root.position.copy(state.anchor.position);
      root.rotation.copy(state.anchor.rotation);
      root.scale.copy(state.anchor.scale);
    }
    state.objects.forEach(({ object, position, rotation, scale }) => {
      object.position.copy(position);
      object.rotation.copy(rotation);
      object.scale.copy(scale);
    });
    return true;
  };

  const register = (root, type) => {
    if (!root || !FAUNA_TYPES.has(type) || states.has(root)) return false;
    if (!SPECIAL_OWNED.has(type)) BF.PassiveObjectRuntime?.setEnabled?.(root, false);
    const state = capture(root, type);
    root.userData.faunaRuntime = VERSION;
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

  const isNight = () => {
    const dayBlock = global.document?.querySelector?.(".day-block");
    return !dayBlock || dayBlock.classList.contains("night");
  };

  const chooseState = (state, elapsed, distance) => {
    if (state.type === "nocturnal_animal") {
      state.state = isNight() ? (distance < 3.2 ? "observe" : "forage") : "sleep";
      return;
    }
    if (distance < 1.7) {
      state.state = "flee";
      state.fleeUntil = elapsed + 2.2;
      return;
    }
    if (elapsed < state.fleeUntil) {
      state.state = "flee";
      return;
    }
    if (distance < 4.8) {
      state.state = "observe";
      return;
    }
    if (elapsed < state.nextStateAt) return;
    const pool = state.type === "brouteur"
      ? ["forage", "forage", "rest", "observe"]
      : state.type === "sauteur"
        ? ["play", "rest", "observe", "play"]
        : ["rest", "forage", "observe", "play"];
    state.previousState = state.state;
    state.state = pool[Math.floor(Math.random() * pool.length)];
    state.stateSince = elapsed;
    state.nextStateAt = elapsed + 3.5 + Math.random() * 6.5;
    state.forageDirection += (Math.random() - 0.5) * 1.4;
  };

  const orientHead = (state, distance, amount) => {
    const player = playerRoot();
    if (!player || !Number.isFinite(distance)) return;
    const dx = player.position.x - state.root.position.x;
    const dz = player.position.z - state.root.position.z;
    const target = Math.atan2(dx, dz) - state.root.rotation.y;
    const yaw = clamp(Math.atan2(Math.sin(target), Math.cos(target)), -0.65, 0.65) * amount;
    state.parts.heads.forEach((head) => {
      const base = state.objects.find((item) => item.object === head);
      if (base) head.rotation.y = base.rotation.y + yaw;
    });
  };

  const animateParts = (state, elapsed, distance) => {
    const speed = state.state === "flee" ? 6.2 : state.state === "play" ? 3.6 : 1.4;
    const breath = Math.sin(elapsed * (state.state === "sleep" ? 0.55 : 1.05) + state.phase);
    const alert = clamp(1 - distance / 5, 0, 1);

    state.parts.bodies.forEach((body) => {
      const base = state.objects.find((item) => item.object === body);
      if (!base) return;
      body.scale.set(
        base.scale.x * (1 - breath * 0.01),
        base.scale.y * (1 + breath * 0.022),
        base.scale.z * (1 + breath * 0.014)
      );
      if (!state.specialOwned) body.position.y = base.position.y + Math.max(0, Math.sin(elapsed * speed + state.phase)) * (state.type === "sauteur" ? 0.1 : 0.018);
    });

    state.parts.limbs.forEach((limb, index) => {
      const base = state.objects.find((item) => item.object === limb);
      if (!base) return;
      const gait = Math.sin(elapsed * speed + index * Math.PI + state.phase);
      limb.rotation.z = base.rotation.z + gait * (state.state === "flee" ? 0.16 : state.state === "play" ? 0.1 : 0.025);
    });

    state.parts.ears.forEach((ear, index) => {
      const base = state.objects.find((item) => item.object === ear);
      if (base) ear.rotation.z = base.rotation.z + Math.sin(elapsed * 2.1 + index + state.phase) * (0.035 + alert * 0.08);
    });

    state.parts.eyes.forEach((eye, index) => {
      if (eye.material && "emissiveIntensity" in eye.material) {
        const base = Number(eye.userData.faunaBaseEmission ?? eye.material.emissiveIntensity ?? 0);
        eye.userData.faunaBaseEmission ??= base;
        eye.material.emissiveIntensity = base * (0.85 + alert * 0.35 + Math.max(0, Math.sin(elapsed * 1.7 + index)) * 0.12);
      }
    });

    orientHead(state, distance, alert);
  };

  const animateMovement = (state, elapsed, distance) => {
    if (state.specialOwned) return;
    const root = state.root;
    const anchor = state.anchor.position;
    if (state.state === "flee") {
      const player = playerRoot();
      if (player) {
        const dx = anchor.x - player.position.x;
        const dz = anchor.z - player.position.z;
        const len = Math.hypot(dx, dz) || 1;
        const amount = 0.55 + Math.sin(elapsed * 4.2 + state.phase) * 0.08;
        root.position.x = anchor.x + (dx / len) * amount;
        root.position.z = anchor.z + (dz / len) * amount;
        root.rotation.y = Math.atan2(dx, dz);
      }
      return;
    }
    if (state.state === "forage" || state.state === "play") {
      const radius = state.state === "play" ? 0.42 : 0.28;
      const pace = state.state === "play" ? 0.75 : 0.28;
      root.position.x = anchor.x + Math.cos(state.forageDirection + elapsed * pace) * radius;
      root.position.z = anchor.z + Math.sin(state.forageDirection + elapsed * pace) * radius;
      root.rotation.y = state.anchor.rotation.y + state.forageDirection + elapsed * pace + Math.PI / 2;
      root.position.y = anchor.y + (state.type === "sauteur" ? Math.max(0, Math.sin(elapsed * 3.5 + state.phase)) * 0.18 : 0);
      return;
    }
    root.position.x += (anchor.x - root.position.x) * 0.035;
    root.position.z += (anchor.z - root.position.z) * 0.035;
    root.position.y += (anchor.y - root.position.y) * 0.05;
    root.rotation.y += (state.anchor.rotation.y - root.rotation.y) * 0.025;
  };

  const update = (state, elapsed) => {
    if (!state.enabled || !state.root.parent || state.root.visible === false) return;
    const distance = distanceToPlayer(state.root);
    chooseState(state, elapsed, distance);
    animateMovement(state, elapsed, distance);
    animateParts(state, elapsed, distance);
  };

  BF.ObjectLibrary.registerCreateHook((instance, context = {}) => {
    const root = instance?.root;
    const type = context.type || instance?.definition?.type || root?.userData?.libraryType;
    if (!root || !FAUNA_TYPES.has(type)) return;
    const attach = () => register(root, type);
    if (root.parent) attach();
    else global.requestAnimationFrame?.(attach) || attach();
  });

  let running = true;
  const startedAt = seconds();
  let lastCleanupAt = 0;
  const frame = () => {
    if (!running) return;
    const elapsed = seconds() - startedAt;
    registry.forEach((root) => {
      const state = states.get(root);
      if (state && (!BF.RuntimeBudget || BF.RuntimeBudget.shouldUpdate(root, "fauna", elapsed))) update(state, elapsed);
    });
    if (elapsed - lastCleanupAt > 8) {
      lastCleanupAt = elapsed;
      registry.forEach((root) => { if (!root?.parent) unregister(root); });
    }
    global.requestAnimationFrame?.(frame);
  };

  BF.FaunaRuntime = Object.freeze({
    version: VERSION,
    register,
    unregister,
    restore,
    getState(root) {
      const state = states.get(root);
      return state ? Object.freeze({ type: state.type, state: state.state, enabled: state.enabled }) : null;
    },
    setState(root, nextState) {
      const state = states.get(root);
      const allowed = new Set(["rest", "observe", "forage", "flee", "play", "sleep"]);
      if (!state || !allowed.has(nextState)) return false;
      state.previousState = state.state;
      state.state = nextState;
      state.stateSince = seconds() - startedAt;
      state.nextStateAt = Infinity;
      return true;
    },
    releaseState(root) {
      const state = states.get(root);
      if (!state) return false;
      state.nextStateAt = seconds() - startedAt;
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
      return Object.freeze({ version: VERSION, registered: registry.size, running });
    },
    stop() {
      running = false;
      registry.forEach((root) => restore(root));
    }
  });

  global.requestAnimationFrame?.(frame);
  console.info("[BlueFox P2.2.3] Runtime faune actif.");
})(window);
