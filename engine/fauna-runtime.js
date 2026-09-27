(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (!BF.ObjectLibrary?.create) {
    console.error("[BlueFox P2.2.3] ObjectLibrary doit être chargé avant le runtime faune.");
    return;
  }

  const VERSION = "P2.2.3-r3";
  const APPROACH = Object.freeze({
    vigilanceDistance: 6,
    cautiousStopMin: 3.8,
    cautiousStopMax: 5.4,
    cautiousStopSeconds: 1.1,
    rapidClosureSpeed: 1.05,
    cautiousRapidClosureSpeed: 2.8,
    threatDistance: 3.5,
    cautiousThreatDistance: 2.5,
    intrusionDistance: 2.2,
    acceptedDistance: 3.0,
    acceptedTolerance: 0.18,
    resetDistance: 5.8,
    calmSeconds: 5.0,
    fleeSeconds: 2.6,
    fleeOffset: 2.4
  });
  // Le CUO/ObjectLibrary reste la vérité canonique des espèces FAUNA.
  // Le fallback ne sert qu'aux runtimes minimaux/anciens mocks sans list().
  const catalogFaunaTypes = BF.ObjectLibrary?.list
    ? BF.ObjectLibrary.list({ category: "fauna" })
        .map((definition) => String(definition?.type || ""))
        .filter(Boolean)
    : [
        "fun_creature", "small_creature", "brouteur", "sauteur",
        "patte_creature", "nocturnal_animal"
      ];
  const FAUNA_TYPES = new Set(catalogFaunaTypes);
  const REPUTATION_STATES = Object.freeze(["neutral", "wary", "hostile", "friendly"]);
  const SPECIAL_OWNED = new Set(["nocturnal_animal"]);
  const PARENTAL_SCENE_ID = "MSC-CUSTOM-FUNA-PARENTAL";
  const registry = new Set();
  const toolBalls = new Set();
  const states = new WeakMap();
  const ballStates = new WeakMap();
  let grazerSequence = 0;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const seconds = () => (global.performance?.now?.() || Date.now()) / 1000;

  const playerRoot = () =>
    BF.currentEngine?.character?.root ||
    BF.currentEngine?.characterController?.root ||
    BF.characterController?.root || null;

  const playerSpeed = () => {
    const speed = Number(
      BF.currentEngine?.character?.speed ??
      BF.currentEngine?.characterController?.speed ??
      BF.characterController?.speed
    );
    return Number.isFinite(speed) ? Math.max(0, speed) : null;
  };

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
      lastDistance: Infinity,
      lastDistanceAt: 0,
      closureSpeed: 0,
      cautiousStopSince: 0,
      cautiousQualified: false,
      approachDisposition: null,
      acceptedProximity: false,
      acceptedSince: 0,
      calmEmitted: false,
      cautiousEmitted: false,
      fleeEmitted: false,
      behaviorObservedSince: 0,
      behaviorObservedState: "",
      behaviorObservedEmitted: false,
      groupObservedSince: 0,
      groupObservedEmitted: false,
      parentalProtectSince: 0,
      parentalProtectEmitted: false,
      parentalYoung: null,
      forageDirection: Math.random() * Math.PI * 2,
      enabled: true,
      specialOwned: SPECIAL_OWNED.has(type),
      toolUseSlot: type === "brouteur" ? grazerSequence++ : -1,
      toolUseCycleCount: 0,
      toolUse: null
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

  const registerToolBall = (root) => {
    if (!root || ballStates.has(root)) return false;
    ballStates.set(root, { origin: root.position.clone(), generated: root.userData.faunaGeneratedToolUse === true });
    toolBalls.add(root);
    return true;
  };

  const missionLifecycle = () => {
    const life = BF.currentEngine?.missionManager?.memory?.state?.missionLifecycle || {};
    return life["FAU-10"] || life.fauna_tool_use ||
      Object.entries(life).find(([id]) =>
        id.startsWith("FAU-10@") || id.startsWith("fauna_tool_use@")
      )?.[1] || null;
  };

  const missionStatus = () => String(missionLifecycle()?.status || "");

  const sameMissionScene = (grazer, ball) => {
    const mission = String(grazer.userData?.bibleMissionId || "");
    if (!new Set(["FAU-10", "fauna_tool_use"]).has(mission)) return false;
    const grazerScene =
      grazer.userData?.biblePersistentScene ||
      grazer.userData?.persistentMicroSceneId ||
      null;
    const ballScene =
      ball.userData?.biblePersistentScene ||
      ball.userData?.persistentMicroSceneId ||
      null;
    return mission === String(ball.userData?.bibleMissionId || "") &&
      Boolean(grazerScene) &&
      grazerScene === ballScene;
  };

  const nearestToolBall = (state, missionOnly) => {
    let best = null;
    let bestDistance = Infinity;
    toolBalls.forEach((ball) => {
      if (!ball?.parent || ball.parent !== state.root.parent) return;
      if (missionOnly && !sameMissionScene(state.root, ball)) return;
      if (!missionOnly && ball.userData?.faunaToolUseOwnerSlot !== state.toolUseSlot) return;
      const distance = state.root.position.distanceTo(ball.position);
      if (distance >= bestDistance || distance > 5) return;
      best = ball;
      bestDistance = distance;
    });
    return best;
  };

  const createGeneralizedBall = (state) => {
    const THREE = BF.currentEngine?.THREE;
    const parent = state.root.parent;
    if (!THREE || !parent || !BF.ObjectLibrary?.exists?.("fauna_straw_ball")) return null;
    const instance = BF.ObjectLibrary.create(THREE, "fauna_straw_ball", {}, state.toolUseSlot % 3);
    const ball = instance.root;
    const forward = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      state.root.rotation.y
    );
    ball.position.copy(state.anchor.position).addScaledVector(forward, 1.7);
    ball.userData.faunaGeneratedToolUse = true;
    ball.userData.faunaToolUseGeneralized = true;
    ball.userData.faunaToolUseOwnerSlot = state.toolUseSlot;
    parent.add(ball);
    registerToolBall(ball);
    return ball;
  };

  const eligibleToolBall = (state) => {
    if (state.type !== "brouteur") return null;
    const status = missionStatus();
    if (status === "active") return nearestToolBall(state, true);
    if (status !== "completed" || state.toolUseSlot % 5 !== 0) return null;
    return nearestToolBall(state, false) || createGeneralizedBall(state);
  };

  const beginToolUse = (state, ball, elapsed) => {
    state.toolUse = {
      ball,
      phase: "approach",
      phaseStarted: elapsed,
      grazerStart: state.root.position.clone(),
      ballStart: ball.position.clone(),
      direction: ball.position.clone().sub(state.root.position).setY(0).normalize(),
      rollDistance: 0
    };
    if (state.toolUse.direction.lengthSq() < 0.01) state.toolUse.direction.set(1, 0, 0);
  };

  const animateNosePush = (state, amount) => {
    state.parts.heads.forEach((head) => {
      const base = state.objects.find((item) => item.object === head);
      if (!base) return;
      head.position.y = base.position.y - amount * 0.1;
      head.rotation.z = base.rotation.z - amount * 0.18;
    });
  };

  const updateToolUse = (state, elapsed) => {
    const ball = eligibleToolBall(state);
    if (!ball) {
      state.toolUse = null;
      animateNosePush(state, 0);
      return false;
    }
    if (!state.toolUse || state.toolUse.ball !== ball) beginToolUse(state, ball, elapsed);
    const tool = state.toolUse;
    const age = elapsed - tool.phaseStarted;
    state.state = "tool_use";

    if (tool.phase === "approach") {
      const target = tool.ballStart.clone().addScaledVector(tool.direction, -1.02);
      const duration = Math.max(0.8, tool.grazerStart.distanceTo(target) / 0.75);
      const t = clamp(age / duration, 0, 1);
      state.root.position.lerpVectors(tool.grazerStart, target, t);
      state.root.rotation.y = Math.atan2(-tool.direction.z, tool.direction.x);
      animateNosePush(state, t * 0.45);
      if (t >= 1) {
        tool.phase = "push";
        tool.phaseStarted = elapsed;
        tool.grazerStart.copy(state.root.position);
        tool.ballStart.copy(ball.position);
        tool.rollDistance = 0;
      }
      return true;
    }

    if (tool.phase === "push") {
      const t = clamp(age / 1.45, 0, 1);
      const eased = t * t * (3 - 2 * t);
      const distance = eased * 1.35;
      ball.position.copy(tool.ballStart).addScaledVector(tool.direction, distance);
      state.root.position.copy(tool.grazerStart).addScaledVector(tool.direction, distance);
      animateNosePush(state, Math.sin(t * Math.PI));
      if (typeof ball.rotateOnWorldAxis === "function") {
        const axis = tool.direction.clone().cross(new state.root.position.constructor(0, 1, 0)).normalize();
        ball.rotateOnWorldAxis(axis, -(distance - tool.rollDistance) / 0.46);
      }
      tool.rollDistance = distance;
      if (t >= 1) {
        state.toolUseCycleCount += 1;
        emitBehavior(state, "tool_use_cycle", {
          cycle: state.toolUseCycleCount,
          toolInstanceId: ball.userData?.instanceId || null
        });
        tool.phase = "recover";
        tool.phaseStarted = elapsed;
      }
      return true;
    }

    animateNosePush(state, 0);
    if (age >= 2.2) beginToolUse(state, ball, elapsed);
    return true;
  };

  const isNight = () => {
    const dayBlock = global.document?.querySelector?.(".day-block");
    return !dayBlock || dayBlock.classList.contains("night");
  };

  const microSceneIdOf = (root) => String(
    root?.userData?.microSceneId ||
    root?.userData?.worldAnchor?.userData?.microSceneId ||
    root?.userData?.worldRoot?.userData?.microSceneId ||
    ""
  );

  const persistentSceneIdOf = (root) =>
    root?.userData?.persistentMicroSceneId ||
    root?.userData?.worldAnchor?.userData?.persistentMicroSceneId ||
    root?.userData?.biblePersistentScene ||
    null;

  const emitBehavior = (state, behavior, detail = {}) => {
    const type = BF.ObjectEvents?.types?.PHENOMENON_OBSERVED;
    if (!type || typeof BF.ObjectEvents?.emit !== "function") return false;
    const tags = [...new Set([
      "fauna_behavior",
      behavior,
      ...(detail.tags || [])
    ])];
    BF.ObjectEvents.emit(type, state.root, {
      subject: "fauna",
      kind: "fauna_behavior",
      state: behavior,
      cuoType: state.type,
      mapId: BF.currentEngine?.currentMapId || null,
      microSceneId: microSceneIdOf(state.root) || null,
      persistentMicroSceneId: persistentSceneIdOf(state.root),
      ...detail,
      tags
    });
    return true;
  };


  const worldPeriod = () => {
    const clock = BF.currentEngine?.planetClock;
    const gameMinutes = Number(clock?.gameMinutes);
    const realTime = Number(clock?.realTime);
    if (!Number.isFinite(gameMinutes) || !Number.isFinite(realTime)) return null;
    const elapsedSeconds = Math.max(0, (Date.now() - realTime) / 1000);
    const totalMinutes = gameMinutes + elapsedSeconds;
    const hour = Math.floor((totalMinutes % (20 * 60)) / 60);
    return hour < 2 || hour >= 17 ? "night" : "day";
  };

  const missionMemory = () =>
    BF.currentEngine?.missionManager?.memory || null;

  const isFaunaType = (type) => FAUNA_TYPES.has(String(type || ""));
  const reputationKey = (type) => `fauna:reputation:${String(type || "")}`;
  const getReputation = (type) => {
    const normalized = String(type || "");
    if (!isFaunaType(normalized)) return null;
    const stored = String(missionMemory()?.getFact?.(reputationKey(normalized), "neutral") || "neutral");
    return REPUTATION_STATES.includes(stored) ? stored : "neutral";
  };
  const setReputation = (type, reputation) => {
    const normalizedType = String(type || "");
    const normalizedReputation = String(reputation || "");
    const memory = missionMemory();
    if (!memory || !isFaunaType(normalizedType) || !REPUTATION_STATES.includes(normalizedReputation)) return false;
    memory.setFact?.(reputationKey(normalizedType), normalizedReputation);
    memory.save?.();
    return true;
  };

  const traitProfile = () => BF.getPlayerTraitProfile?.() || Object.freeze({
    curieux: 50, prudent: 50, empathique: 50, indifferent: 50,
    respectueux: 50, destructeur: 50
  });

  const prepareApproachDisposition = (state) => {
    if (state.approachDisposition) return state.approachDisposition;
    const traits = traitProfile();
    const prudence = (Number(traits.prudent || 0) - Number(traits.curieux || 0)) / 100;
    const empathy = (Number(traits.empathique || 0) - Number(traits.indifferent || 0)) / 100;
    const respect = (Number(traits.respectueux || 0) - Number(traits.destructeur || 0)) / 100;
    const affinity = clamp(prudence * 0.35 + empathy * 0.30 + respect * 0.35, -1, 1);
    const speciesPenalty = state.type === "nocturnal_animal" ? 0.35 : 0;
    const uncertainty = (Math.random() - 0.5) * 0.5;
    state.approachDisposition = Object.freeze({
      affinity,
      speciesPenalty,
      requiredPauseSeconds: clamp(
        APPROACH.cautiousStopSeconds - affinity * 0.55 + speciesPenalty + uncertainty,
        0.65,
        2.2
      )
    });
    return state.approachDisposition;
  };

  const instanceIdOf = (root) =>
    String(
      root?.userData?.instanceId ||
      root?.userData?.worldAnchor?.userData?.instanceId ||
      ""
    );

  const microSceneObjectIndexOf = (root) => {
    const candidates = [
      root?.userData?.microSceneObjectIndex,
      root?.userData?.microScenePivot?.userData?.microSceneObjectIndex,
      root?.parent?.userData?.microSceneObjectIndex,
      root?.userData?.worldAnchor?.userData?.microSceneObjectIndex,
      root?.userData?.worldAnchor?.userData?.microScenePivot?.userData?.microSceneObjectIndex
    ];
    const value = candidates.find((candidate) =>
      candidate !== null && candidate !== undefined && candidate !== ""
    );
    return value === undefined ? null : String(value);
  };

  const persistentBehaviorIdentity = (state) => {
    const root = state?.root;
    const persistentSceneId = persistentSceneIdOf(root);
    const microSceneId = microSceneIdOf(root);
    const slot = microSceneObjectIndexOf(root);
    const cuo = String(
      root?.userData?.catalogId ||
      root?.userData?.functional?.id ||
      state?.type ||
      root?.userData?.libraryType ||
      "fauna"
    );
    if (persistentSceneId && slot !== null) {
      return `persistent:${persistentSceneId}:slot:${slot}:cuo:${cuo}`;
    }
    const mapId = String(BF.currentEngine?.currentMapId || "");
    if (mapId && microSceneId && slot !== null) {
      return `msc:${mapId}:${microSceneId}:slot:${slot}:cuo:${cuo}`;
    }
    const instanceId = instanceIdOf(root);
    return instanceId ? `session:${instanceId}` : "";
  };

  const recordPersistentEncounter = (state, period) => {
    const memory = missionMemory();
    const behaviorIdentity = persistentBehaviorIdentity(state);
    if (!memory || !behaviorIdentity) return { familiar: false, temporalContrast: false };

    const encounterKey = `fauna:calmEncounters:${behaviorIdentity}`;
    const previousEncounters = Math.max(0, Number(memory.getFact?.(encounterKey, 0)) || 0);
    const encounters = previousEncounters + 1;
    memory.setFact?.(encounterKey, encounters);

    let temporalContrast = false;
    if (period) {
      const periodKey = `fauna:periods:${behaviorIdentity}`;
      const previousPeriods = Array.isArray(memory.getFact?.(periodKey, []))
        ? memory.getFact(periodKey, [])
        : [];
      const periods = [...new Set([...previousPeriods, period])];
      if (periods.length !== previousPeriods.length) {
        memory.setFact?.(periodKey, periods);
      }
      temporalContrast = previousPeriods.length > 0 &&
        !previousPeriods.includes(period) &&
        periods.includes("day") &&
        periods.includes("night");
    }
    memory.save?.();
    return { familiar: encounters >= 2, temporalContrast, encounters };
  };

  const emitCalmFacts = (state, elapsed, distance) => {
    if (
      !state.acceptedProximity ||
      state.calmEmitted ||
      distance > APPROACH.acceptedDistance + APPROACH.acceptedTolerance ||
      elapsed - state.acceptedSince < APPROACH.calmSeconds
    ) return false;
    const speed = playerSpeed();
    if (speed != null && speed > 0.12) return false;

    const period = worldPeriod();
    state.calmEmitted = emitBehavior(state, "calm_nearby", {
      durationSeconds: APPROACH.calmSeconds,
      period,
      tags: [
        "fauna_behavior",
        "calm_nearby",
        ...(period ? [`period_${period}`] : [])
      ]
    });
    if (!state.calmEmitted) return false;

    const persistent = recordPersistentEncounter(state, period);
    if (persistent.familiar) {
      emitBehavior(state, "familiar_encounter", {
        encounterCount: persistent.encounters,
        period,
        tags: [
          "fauna_behavior",
          "familiar_encounter",
          ...(period ? [`period_${period}`] : [])
        ]
      });
    }
    if (persistent.temporalContrast) {
      emitBehavior(state, "temporal_contrast", {
        periods: ["day", "night"],
        tags: ["fauna_behavior", "temporal_contrast", "period_day", "period_night"]
      });
    }
    return true;
  };

  const updateObservedBehavior = (state, elapsed, distance) => {
    const observableState =
      distance >= 4 && distance <= APPROACH.vigilanceDistance &&
      state.state === "observe";
    if (!observableState) {
      state.behaviorObservedSince = 0;
      state.behaviorObservedState = "";
      state.behaviorObservedEmitted = false;
      return false;
    }
    if (state.behaviorObservedState !== state.state) {
      state.behaviorObservedState = state.state;
      state.behaviorObservedSince = elapsed;
      state.behaviorObservedEmitted = false;
    }
    if (
      !state.behaviorObservedEmitted &&
      elapsed - state.behaviorObservedSince >= 5
    ) {
      state.behaviorObservedEmitted = emitBehavior(state, "behavior_observed", {
        behavior: state.state,
        distance,
        durationSeconds: 5,
        tags: ["fauna_behavior", "behavior_observed", `behavior_${state.state}`]
      });
    }
    return state.behaviorObservedEmitted;
  };

  const peacefulSceneMembers = (state) => {
    const sceneId = microSceneIdOf(state.root);
    if (sceneId !== "MSC-PEACEFUL-FAUNA-001") return [];
    const persistentId = persistentSceneIdOf(state.root);
    const members = [];
    registry.forEach((root) => {
      const candidate = states.get(root);
      if (!candidate || microSceneIdOf(root) !== sceneId) return;
      if (persistentId && persistentSceneIdOf(root) !== persistentId) return;
      members.push(candidate);
    });
    return members;
  };

  const updatePeacefulGroupObservation = (state, elapsed) => {
    if (microSceneIdOf(state.root) !== "MSC-PEACEFUL-FAUNA-001") return false;
    const members = peacefulSceneMembers(state);
    if (members.length < 2) return false;
    const representative = members.slice().sort((left, right) =>
      instanceIdOf(left.root).localeCompare(instanceIdOf(right.root))
    )[0];
    if (representative !== state) return false;
    const types = new Set(members.map((member) => member.type));
    if (types.size < 2) return false;
    const distances = members.map((member) => distanceToPlayer(member.root));
    const visible = distances.filter((distance) => distance >= 3.5 && distance <= 6);
    const fleeing = members.some((member) =>
      member.state === "flee" || elapsed < member.fleeUntil
    );
    if (visible.length < 2 || fleeing) {
      state.groupObservedSince = 0;
      state.groupObservedEmitted = false;
      return false;
    }
    state.groupObservedSince ||= elapsed;
    if (
      !state.groupObservedEmitted &&
      elapsed - state.groupObservedSince >= 5
    ) {
      state.groupObservedEmitted = emitBehavior(state, "peaceful_group", {
        speciesCount: types.size,
        durationSeconds: 5,
        tags: ["fauna_behavior", "peaceful_group", "multi_species", "no_flee"]
      });
    }
    return state.groupObservedEmitted;
  };

  const parentalYoungState = () => {
    let young = null;
    registry.forEach((root) => {
      if (young || microSceneIdOf(root) !== PARENTAL_SCENE_ID) return;
      const candidate = states.get(root);
      if (candidate?.type === "fun_creature") young = candidate;
    });
    return young;
  };

  const updateParentalProtection = (state, elapsed) => {
    if (microSceneIdOf(state.root) !== PARENTAL_SCENE_ID) return false;
    const young = parentalYoungState();
    if (!young || young === state) return false;
    const player = playerRoot();
    if (!player) return false;
    const playerToYoung = Math.hypot(
      Number(player.position?.x || 0) - Number(young.root.position?.x || 0),
      Number(player.position?.z || 0) - Number(young.root.position?.z || 0)
    );
    const protectorToYoung = state.root.position.distanceTo(young.root.position);
    if (playerToYoung > 4.6 || protectorToYoung > 7.5) {
      state.parentalProtectSince = 0;
      state.parentalYoung = null;
      return false;
    }
    state.parentalYoung = young.root;
    state.state = "protect";
    state.parentalProtectSince ||= elapsed;
    if (
      !state.parentalProtectEmitted &&
      elapsed - state.parentalProtectSince >= 1.2
    ) {
      state.parentalProtectEmitted = emitBehavior(state, "parental_protect", {
        protectedInstanceId: young.root?.userData?.instanceId || null
      });
    }
    return true;
  };

  const updateApproach = (state, elapsed, distance) => {
    if (!Number.isFinite(distance)) return { threat: false };
    if (!Number.isFinite(state.lastDistance)) {
      state.lastDistance = distance;
      state.lastDistanceAt = elapsed;
      return { threat: false };
    }
    const dt = Math.max(0.001, elapsed - state.lastDistanceAt);
    const rawClosure = (state.lastDistance - distance) / dt;
    state.closureSpeed = state.closureSpeed * 0.55 + rawClosure * 0.45;
    state.lastDistance = distance;
    state.lastDistanceAt = elapsed;

    if (distance >= APPROACH.resetDistance) {
      state.cautiousStopSince = 0;
      state.cautiousQualified = false;
      state.approachDisposition = null;
      state.acceptedProximity = false;
      state.acceptedSince = 0;
      state.calmEmitted = false;
      state.cautiousEmitted = false;
      state.fleeEmitted = false;
      return { threat: false };
    }

    const disposition = prepareApproachDisposition(state);
    const speed = playerSpeed();
    const nearlyStill = speed != null ? speed <= 0.12 : Math.abs(state.closureSpeed) <= 0.12;
    const inCautiousBand = distance >= APPROACH.cautiousStopMin && distance <= APPROACH.cautiousStopMax;
    if (inCautiousBand && nearlyStill) {
      state.cautiousStopSince ||= elapsed;
      if (elapsed - state.cautiousStopSince >= disposition.requiredPauseSeconds) {
        state.cautiousQualified = true;
        if (!state.cautiousEmitted) {
          state.cautiousEmitted = emitBehavior(state, "cautious_approach", {
            distance,
            durationSeconds: disposition.requiredPauseSeconds,
            approachAffinity: disposition.affinity,
            speciesPenalty: disposition.speciesPenalty,
            tags: ["fauna_behavior", "cautious_approach", "no_flee"]
          });
        }
      }
    } else if (!state.cautiousQualified) {
      state.cautiousStopSince = 0;
    }

    const slowForAcceptance = speed != null
      ? speed <= 0.12
      : state.closureSpeed < APPROACH.rapidClosureSpeed * 0.65;
    if (
      state.cautiousQualified &&
      distance <= APPROACH.acceptedDistance + APPROACH.acceptedTolerance &&
      slowForAcceptance
    ) {
      state.acceptedProximity = true;
      state.acceptedSince ||= elapsed;
    }

    const threatDistance = state.cautiousQualified
      ? APPROACH.cautiousThreatDistance
      : APPROACH.threatDistance;
    const threatSpeed = state.cautiousQualified
      ? APPROACH.cautiousRapidClosureSpeed
      : APPROACH.rapidClosureSpeed;
    const rapidThreat =
      !state.acceptedProximity &&
      distance < threatDistance &&
      state.closureSpeed >= threatSpeed;
    const closeIntrusion =
      !state.acceptedProximity &&
      !state.cautiousQualified &&
      distance < APPROACH.intrusionDistance;
    return { threat: rapidThreat || closeIntrusion };
  };

  const chooseState = (state, elapsed, distance) => {
    const approach = updateApproach(state, elapsed, distance);
    if (state.type === "nocturnal_animal") {
      state.state = isNight() ? (distance < 3.2 ? "observe" : "forage") : "sleep";
      return;
    }
    if (approach.threat) {
      state.state = "flee";
      state.fleeUntil = elapsed + APPROACH.fleeSeconds;
      if (!state.fleeEmitted) {
        state.fleeEmitted = emitBehavior(state, "flee", {
          closureSpeed: state.closureSpeed,
          distance,
          tags: ["fauna_behavior", "flee", "intrusive_approach"]
        });
      }
      return;
    }
    if (elapsed < state.fleeUntil) {
      state.state = "flee";
      return;
    }
    if (state.fleeEmitted) state.fleeEmitted = false;
    if (distance < APPROACH.vigilanceDistance) {
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
        const amount = APPROACH.fleeOffset + Math.sin(elapsed * 4.2 + state.phase) * 0.12;
        root.position.x = anchor.x + (dx / len) * amount;
        root.position.z = anchor.z + (dz / len) * amount;
        root.rotation.y = Math.atan2(dx, dz);
      }
      return;
    }
    if (state.state === "protect" && state.parentalYoung) {
      const player = playerRoot();
      const young = state.parentalYoung;
      if (player) {
        const dx = Number(player.position?.x || 0) - Number(young.position?.x || 0);
        const dz = Number(player.position?.z || 0) - Number(young.position?.z || 0);
        const len = Math.hypot(dx, dz) || 1;
        const targetX = Number(young.position?.x || 0) + (dx / len) * 1.15;
        const targetZ = Number(young.position?.z || 0) + (dz / len) * 1.15;
        root.position.x += (targetX - root.position.x) * 0.12;
        root.position.z += (targetZ - root.position.z) * 0.12;
        root.rotation.y = Math.atan2(dx, dz);
      }
      return;
    }
    if (state.state === "forage" || state.state === "play") {
      // Déplacement court sur un axe stable : la créature avance réellement
      // autour de son ancre sans décrire une petite orbite ni tourner sur place.
      const range = state.state === "play" ? 1.45 : 0.95;
      const pace = state.state === "play" ? 0.68 : 0.34;
      const travel = Math.sin((elapsed - state.stateSince) * pace + state.phase) * range;
      const targetX = anchor.x + Math.cos(state.forageDirection) * travel;
      const targetZ = anchor.z + Math.sin(state.forageDirection) * travel;
      const dx = targetX - root.position.x;
      const dz = targetZ - root.position.z;
      root.position.x += dx * 0.14;
      root.position.z += dz * 0.14;
      if (Math.hypot(dx, dz) > 0.015) {
        const targetYaw = Math.atan2(dx, dz);
        const yawDelta = Math.atan2(
          Math.sin(targetYaw - root.rotation.y),
          Math.cos(targetYaw - root.rotation.y)
        );
        root.rotation.y += clamp(yawDelta, -0.12, 0.12);
      }
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
    if (updateToolUse(state, elapsed)) {
      animateParts(state, elapsed, distance);
      return;
    }
    if (!updateParentalProtection(state, elapsed)) {
      chooseState(state, elapsed, distance);
    }
    emitCalmFacts(state, elapsed, distance);
    updateObservedBehavior(state, elapsed, distance);
    updatePeacefulGroupObservation(state, elapsed);
    animateMovement(state, elapsed, distance);
    animateParts(state, elapsed, distance);
  };

  BF.ObjectLibrary.registerCreateHook((instance, context = {}) => {
    const root = instance?.root;
    const type = context.type || instance?.definition?.type || root?.userData?.libraryType;
    if (type === "fauna_straw_ball") {
      const attachBall = () => registerToolBall(root);
      if (root.parent) attachBall();
      else global.requestAnimationFrame?.(attachBall) || attachBall();
      return;
    }
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
      toolBalls.forEach((ball) => {
        if (ball?.parent) return;
        toolBalls.delete(ball);
        ballStates.delete(ball);
      });
    }
    global.requestAnimationFrame?.(frame);
  };

  BF.FaunaRuntime = Object.freeze({
    version: VERSION,
    register,
    unregister,
    restore,
    faunaTypes() { return Object.freeze([...FAUNA_TYPES]); },
    isFaunaType,
    getReputation,
    setReputation,
    getState(root) {
      const state = states.get(root);
      return state ? Object.freeze({
        type: state.type,
        state: state.state,
        enabled: state.enabled,
        closureSpeed: state.closureSpeed,
        cautiousQualified: state.cautiousQualified,
        approachDisposition: state.approachDisposition,
        reputation: getReputation(state.type),
        acceptedProximity: state.acceptedProximity,
        acceptedSince: state.acceptedSince,
        lastDistance: state.lastDistance,
        fleeUntil: state.fleeUntil
      }) : null;
    },
    setState(root, nextState) {
      const state = states.get(root);
      const allowed = new Set(["rest", "observe", "forage", "flee", "play", "sleep", "tool_use", "protect"]);
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
      return Object.freeze({
        version: VERSION,
        registered: registry.size,
        toolBalls: toolBalls.size,
        toolUseMissionStatus: missionStatus(),
        generalizedRate: "1/5",
        running
      });
    },
    stop() {
      running = false;
      registry.forEach((root) => restore(root));
    }
  });

  global.requestAnimationFrame?.(frame);
  console.info("[BlueFox P2.2.3] Runtime faune actif.");
})(window);
