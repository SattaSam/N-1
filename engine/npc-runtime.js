(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (!BF.ObjectLibrary?.create) {
    console.error("[BlueFox P2.2.2] ObjectLibrary doit être chargé avant le runtime PNJ.");
    return;
  }

  const VERSION = "P2.2.2-r10-npc-relational-approach";
  const NPC_TYPES = new Set(["npc_translucent", "npc_rocky"]);
  const CIVILIZATION_BY_TYPE = Object.freeze({
    npc_translucent: "translucent",
    npc_rocky: "rocky"
  });
  const VISUAL_CALIBRATION = Object.freeze({
    npc_translucent: Object.freeze({ scale: 0.35 }),
    npc_rocky: Object.freeze({ scale: 0.47 })
  });
  const FORWARD_FOREARM_ANGLE = Math.PI / 2;
  const ALLOWED_STATES = new Set(["rest", "observation", "curiosity", "vigilance", "movement", "interaction", "dialogue", "flee", "calm"]);
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

  const rootEvent = (root, eventName, detail) => {
    try {
      root.dispatchEvent?.({ type: eventName, detail });
      global.dispatchEvent?.(new CustomEvent(eventName, { detail: { root, ...detail } }));
    } catch {
      // Une animation ne doit jamais interrompre la boucle du jeu.
    }
  };

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
      translucentElbows: collectNamed(root, "TranslucentElbow"),
      forearms: collectNamed(root, "TranslucentForearm"),
      translucentHands: collectNamed(root, "TranslucentHand"),
      translucentHandAnchors: collectNamed(root, "TranslucentHandAnchor"),
      translucentFingers: collectNamed(root, "TranslucentFinger"),
      translucentThighs: collectNamed(root, "TranslucentThigh"),
      translucentKnees: collectNamed(root, "TranslucentKnee"),
      translucentShins: collectNamed(root, "TranslucentShin"),
      translucentFeet: collectNamed(root, "TranslucentFoot"),
      rockyHead: collectNamed(root, "RockyHead"),
      rockyTorso: collectNamed(root, "RockyTorso"),
      rockyUpperArms: collectNamed(root, "RockyUpperArm"),
      rockyElbows: collectNamed(root, "RockyElbow"),
      rockyForearms: collectNamed(root, "RockyForearm"),
      rockyThighs: collectNamed(root, "RockyThigh"),
      rockyKnees: collectNamed(root, "RockyKnee"),
      rockyShins: collectNamed(root, "RockyShin"),
      rockyFeet: collectNamed(root, "RockyFoot"),
      rockyPlates: [...collectNamed(root, "RockyPlate"), ...collectNamed(root, "RockyLimbPlate")],
      rockyElbowPlates: collectNamed(root, "RockyLimbPlate").filter((plate) => plate.userData?.jointRole === "elbow"),
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
      controlled: false,
      motion: null,
      contactToken: 0,
      contactControlled: false,
      relationRank: "neutral",
      nextRelationCheckAt: 0,
      relationalEncounterId: 1,
      relationalEncounterOpen: false,
      lastRelationalDistance: Infinity,
      lastRelationalDistanceAt: 0,
      relationalClosureSpeed: 0,
      cautiousSince: 0,
      cautiousEmitted: false,
      relationalFleeUntil: 0,
      relationalFleeEmitted: false,
      relationalReactionControlled: false,
      speechSprite: null,
      speechCanvas: null,
      speechTexture: null,
      speechUntil: 0,
      enabled: true
    };
  };

  const civilizationIdForType = (type) => CIVILIZATION_BY_TYPE[type] || String(type || "unknown");

  const emitNpcReaction = (state, reaction, cause = "approach", extra = {}) => {
    const eventType = BF.ObjectEvents?.types?.NPC_REACTION;
    if (!eventType || !BF.ObjectEvents?.emit || !state?.root) return false;
    const normalizedReaction = String(reaction || state.state || "rest");
    const normalizedCause = String(cause || "approach");
    BF.ObjectEvents.emit(eventType, state.root, {
      civilizationId: civilizationIdForType(state.type),
      cuoType: state.type,
      mapId: BF.currentEngine?.currentMapId || null,
      state: normalizedReaction,
      reaction: normalizedReaction,
      cause: normalizedCause,
      distance: Number(extra.distance ?? distanceToPlayer(state.root)),
      encounterId: Number(extra.encounterId ?? state.relationalEncounterId) || 1,
      behaviorSignature: String(extra.behaviorSignature || normalizedReaction),
      durationSeconds: Number(extra.durationSeconds) || 0,
      closureSpeed: Number(extra.closureSpeed) || 0,
      tags: [
        "npc_reaction",
        "civilization",
        civilizationIdForType(state.type),
        normalizedReaction,
        normalizedCause,
        ...(Array.isArray(extra.tags) ? extra.tags.map(String) : [])
      ]
    });
    return true;
  };


  const updateRelationRank = (state, elapsed) => {
    if (elapsed < state.nextRelationCheckAt) return state.relationRank;
    state.nextRelationCheckAt = elapsed + 1;
    const relation = BF.currentEngine?.missionManager?.catalogController?.getRelation?.(
      civilizationIdForType(state.type)
    );
    state.relationRank = String(relation?.rank || "neutral").toLowerCase();
    return state.relationRank;
  };

  const ensureSpeechSprite = (state) => {
    const THREE = BF.currentEngine?.THREE;
    if (!THREE || !global.document?.createElement) return null;
    if (state.speechSprite) return state.speechSprite;
    const canvas = global.document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 180;
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = "NpcSpeechBubble";
    sprite.position.set(0, state.type === "npc_translucent" ? 4.55 : 3.75, 0);
    if (state.type === "npc_translucent") sprite.scale.set(5.25, 1.25, 1);
    else sprite.scale.set(5.8, 1.38, 1);
    sprite.renderOrder = 80;
    state.root.add(sprite);
    state.speechCanvas = canvas;
    state.speechTexture = texture;
    state.speechSprite = sprite;
    return sprite;
  };

  const drawSpeech = (state, text) => {
    const sprite = ensureSpeechSprite(state);
    const canvas = state.speechCanvas;
    const context = canvas?.getContext?.("2d");
    if (!sprite || !context) return false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(5,18,28,0.90)";
    context.strokeStyle = state.type === "npc_translucent"
      ? "rgba(125,231,255,0.95)"
      : "rgba(255,196,110,0.95)";
    context.lineWidth = 6;
    context.beginPath();
    if (typeof context.roundRect === "function") context.roundRect(8, 8, 752, 142, 28);
    else context.rect(8, 8, 752, 142);
    context.fill();
    context.stroke();
    context.fillStyle = "#f1fbff";
    context.font = "600 42px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    const safe = String(text || "").slice(0, 54);
    context.fillText(safe, canvas.width / 2, 78, 720);
    state.speechTexture.needsUpdate = true;
    sprite.visible = true;
    return true;
  };

  const presentSpeech = (state, text, elapsed, duration = 3.8, emitDialogue = true) => {
    const message = String(text || "⋔ ⌁ ∆ ⟟");
    state.speechUntil = elapsed + Math.max(1.2, Number(duration) || 3.8);
    drawSpeech(state, message);
    rootEvent(state.root, "bluefox:npc-speech", {
      type: state.type,
      civilizationId: civilizationIdForType(state.type),
      text: message
    });
    if (emitDialogue) {
      const eventType = BF.ObjectEvents?.types?.NPC_DIALOGUE;
      if (eventType && BF.ObjectEvents?.emit) {
        BF.ObjectEvents.emit(eventType, state.root, {
          civilizationId: civilizationIdForType(state.type),
          cuoType: state.type,
          mapId: BF.currentEngine?.currentMapId || null,
          state: "dialogue",
          tags: ["npc_dialogue", "civilization", civilizationIdForType(state.type)],
          text: message
        });
      }
    }
    return true;
  };

  const updateContactSession = (state, elapsed) => {
    const engine = BF.currentEngine;
    const object = engine?.pendingInteraction;
    const anchor = object?.userData?.worldAnchor || object;
    const profile = object?.userData?.interactionProfile;
    const action = String(profile?.action || "").toLowerCase();
    const activeContact = Boolean(
      object && anchor === state.root && engine?.interactionStartedAt &&
      (action === "contact" || action === "talk")
    );
    if (!activeContact) {
      if (state.contactToken) {
        state.contactToken = 0;
        if (state.contactControlled) {
          state.contactControlled = false;
          state.controlled = false;
          state.nextIdleChangeAt = elapsed;
        }
      }
      if (state.speechSprite && elapsed >= state.speechUntil) state.speechSprite.visible = false;
      return false;
    }
    const token = Number(engine.interactionStartedAt) || 1;
    if (state.contactToken === token) return true;
    state.contactToken = token;
    state.contactControlled = true;
    changeState(state, "dialogue", elapsed, true);
    const civilizationId = civilizationIdForType(state.type);
    const eventType = BF.ObjectEvents?.types?.NPC_CONTACTED;
    if (eventType && BF.ObjectEvents?.emit) {
      BF.ObjectEvents.emit(eventType, object, {
        civilizationId,
        cuoType: state.type,
        npcRole: String(
          object.userData?.npcRole ||
          anchor?.userData?.npcRole ||
          ""
        ).toLowerCase() || null,
        mapId: engine.currentMapId || null,
        state: "contact",
        interactionSource: object.userData?.requestedInteractionSource || "manual",
        contactMode:
          String(object.userData?.npcMissionContactMode || anchor?.userData?.npcMissionContactMode || "").toLowerCase() ||
          null,
        tags: [
          "npc_contact",
          "civilization",
          civilizationId,
          String(object.userData?.npcRole || anchor?.userData?.npcRole || "").toLowerCase()
        ].filter(Boolean)
      });
    }
    if (!state.speechUntil || elapsed >= state.speechUntil) {
      presentSpeech(state, "⌁ ⋔ … contact … ⧖", elapsed, 3.2, false);
    }
    return true;
  };

  const restoreObject = (snapshot) => {
    snapshot.object.position.copy(snapshot.position);
    snapshot.object.rotation.copy(snapshot.rotation);
    snapshot.object.scale.copy(snapshot.scale);
  };

  const restorePose = (state) => {
    state.objects.forEach(restoreObject);
    state.materials.forEach(({ material, emissiveIntensity, opacity }) => {
      if ("emissiveIntensity" in material) material.emissiveIntensity = emissiveIntensity;
      if ("opacity" in material) material.opacity = opacity;
    });
  };

  const restore = (root) => {
    const state = states.get(root);
    if (!state) return false;
    root.position.copy(state.anchor.position);
    root.rotation.copy(state.anchor.rotation);
    root.scale.copy(state.anchor.scale);
    restorePose(state);
    state.motion = null;
    if (state.speechSprite) state.speechSprite.visible = false;
    state.speechUntil = 0;
    state.contactToken = 0;
    state.contactControlled = false;
    return true;
  };

  const recordVisualCalibration = (root, type) => {
    const config = VISUAL_CALIBRATION[type];
    if (!root || !config) return false;
    root.userData.npcCalibratedScale =
      Number(root.userData?.npcVisualScale) || Number(root.scale?.x) || config.scale;
    root.userData.npcCalibratedGround = Number(root.userData?.npcGroundOffset) || 0;
    return true;
  };

  const isSceneAttached = (root) => {
    let node = root;
    while (node) {
      if (node.isScene || node.type === "Scene") return true;
      node = node.parent;
    }
    return false;
  };

  const register = (root, type) => {
    if (!root || !NPC_TYPES.has(type) || states.has(root)) return false;
    root.userData.libraryType ||= type;
    root.userData.npcRuntime = VERSION;
    recordVisualCalibration(root, type);
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

  const changeState = (state, nextState, elapsed, controlled = state.controlled) => {
    if (!ALLOWED_STATES.has(nextState)) return false;
    const previous = state.state;
    state.controlled = Boolean(controlled);
    if (previous === nextState) return true;
    state.previousState = previous;
    state.state = nextState;
    state.stateSince = elapsed;
    rootEvent(state.root, "bluefox:npc-state", {
      type: state.type,
      previous,
      state: state.state,
      controlled: state.controlled
    });
    return true;
  };


  const updateRelationalApproach = (state, elapsed, distance) => {
    if (!Number.isFinite(distance)) return { threat: false, cautious: false };

    const resetDistance = 12;
    if (distance >= resetDistance) {
      if (state.relationalEncounterOpen) state.relationalEncounterId += 1;
      state.relationalEncounterOpen = false;
      state.cautiousSince = 0;
      state.cautiousEmitted = false;
      state.relationalFleeEmitted = false;
      state.relationalFleeUntil = 0;
    } else {
      state.relationalEncounterOpen = true;
    }

    if (!Number.isFinite(state.lastRelationalDistance)) {
      state.lastRelationalDistance = distance;
      state.lastRelationalDistanceAt = elapsed;
      return { threat: false, cautious: false };
    }

    const dt = Math.max(0.001, elapsed - Number(state.lastRelationalDistanceAt || elapsed));
    const closure = (Number(state.lastRelationalDistance) - distance) / dt;
    state.relationalClosureSpeed = state.relationalClosureSpeed * 0.55 + closure * 0.45;
    state.lastRelationalDistance = distance;
    state.lastRelationalDistanceAt = elapsed;

    // Une interaction réelle ou un mouvement PNJ déjà engagé ne doit pas être
    // requalifié à partir de sa propre variation de distance.
    if (
      state.contactControlled ||
      state.motion ||
      (state.controlled && !state.relationalReactionControlled)
    ) {
      state.cautiousSince = 0;
      return { threat: false, cautious: state.cautiousEmitted };
    }

    const inRespectBand = distance >= 4 && distance <= 8;
    const nearlyStill = Math.abs(state.relationalClosureSpeed) <= 0.14;
    if (inRespectBand && nearlyStill) {
      state.cautiousSince ||= elapsed;
      if (!state.cautiousEmitted && elapsed - state.cautiousSince >= 1.25) {
        state.cautiousEmitted = emitNpcReaction(state, "cautious_approach", "relational-approach", {
          distance,
          encounterId: state.relationalEncounterId,
          durationSeconds: elapsed - state.cautiousSince,
          behaviorSignature: "cautious_approach",
          closureSpeed: state.relationalClosureSpeed,
          tags: ["cautious_approach", "no_flee", "relational_behavior"]
        });
      }
    } else if (!state.cautiousEmitted) {
      state.cautiousSince = 0;
    }

    // Réutilisation du contrat FAU : rapprochement rapide + intrusion proche.
    // Une approche prudente déjà qualifiée augmente la tolérance avant fuite.
    const threatDistance = state.cautiousEmitted ? 2.5 : 3.5;
    const threatSpeed = state.cautiousEmitted ? 2.8 : 1.05;
    const rapidThreat =
      distance < threatDistance &&
      state.relationalClosureSpeed >= threatSpeed;
    const closeIntrusion =
      !state.cautiousEmitted &&
      distance < 2.2;

    return {
      threat: rapidThreat || closeIntrusion,
      cautious: state.cautiousEmitted,
      rapidThreat,
      closeIntrusion,
      closureSpeed: state.relationalClosureSpeed
    };
  };

  const chooseState = (state, elapsed, distance) => {
    if (state.controlled) return;
    const rank = updateRelationRank(state, elapsed);
    let next = state.state;
    if (rank === "honored" && distance < 5.5) next = "calm";
    else if (rank === "friendly" && distance < 2.1) next = "calm";
    else if (distance < 2.1) next = "vigilance";
    else if (distance < 5.5) next = "curiosity";
    else if (elapsed >= state.nextIdleChangeAt) {
      const choices = state.type === "npc_rocky"
        ? ["rest", "observation", "rest", "vigilance"]
        : ["rest", "observation", "curiosity", "rest"];
      next = choices[Math.floor(Math.random() * choices.length)];
      state.nextIdleChangeAt = elapsed + 4 + Math.random() * 7;
    }
    if (next !== state.state) changeState(state, next, elapsed, false);
  };

  const baseOf = (state, object) => state.objects.find((item) => item.object === object);

  const facePlayer = (state, distance, strength, maxAngle) => {
    const player = playerRoot();
    if (!player || !Number.isFinite(distance)) return;
    const dx = Number(player.position.x || 0) - Number(state.root.position.x || 0);
    const dz = Number(player.position.z || 0) - Number(state.root.position.z || 0);
    // Les deux modèles regardent +X : cette formule aligne le regard et le corps
    // sur leur vrai axe frontal, contrairement à l'ancien calcul supposant +Z.
    const targetYaw = Math.atan2(-dz, dx);
    let delta = targetYaw - state.root.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    const desired = clamp(delta, -maxAngle, maxAngle);
    state.lookBlend += (strength - state.lookBlend) * 0.18;
    const heads = state.type === "npc_rocky" ? state.named.rockyHead : state.named.translucentHead;
    heads.forEach((head) => {
      head.rotation.y += desired * state.lookBlend;
    });
    const torsos = state.type === "npc_rocky" ? state.named.rockyTorso : state.named.translucentTorso;
    torsos.forEach((torso) => {
      const base = baseOf(state, torso);
      if (!base) return;
      torso.rotation.y = base.rotation.y + desired * state.lookBlend * (state.type === "npc_rocky" ? 0.28 : 0.38);
    });
  };

  const updateEyes = (state, elapsed, intensity, tracking) => {
    state.named.eyes.forEach((eye, index) => {
      const base = baseOf(state, eye);
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

  const animateHeadState = (state, elapsed) => {
    const vigilant = state.state === "vigilance";
    const calm = state.state === "calm";
    const rest = state.state === "rest";
    const observing = state.state === "observation" || state.state === "curiosity";
    const speed = vigilant ? 2.05 : observing ? 1.25 : calm ? 0.72 : 0.5;
    const yawAmplitude = vigilant ? 0.34 : observing ? 0.24 : calm ? 0.16 : rest ? 0.11 : 0.14;
    const pitchAmplitude = vigilant ? 0.1 : observing ? 0.075 : calm ? 0.05 : 0.035;
    const rollAmplitude = vigilant ? 0.075 : observing ? 0.055 : calm ? 0.035 : 0.025;
    const yaw = Math.sin(elapsed * speed + state.phase) * yawAmplitude;
    const pitch = Math.sin(elapsed * (speed * 0.63) + state.phase * 0.7) * pitchAmplitude;
    const roll = Math.sin(elapsed * (speed * 0.47) + state.phase * 1.3) * rollAmplitude;
    const heads = state.type === "npc_rocky" ? state.named.rockyHead : state.named.translucentHead;
    heads.forEach((head) => {
      const base = baseOf(state, head);
      if (!base) return;
      head.rotation.x = base.rotation.x + pitch;
      head.rotation.y = base.rotation.y + yaw;
      head.rotation.z = base.rotation.z + roll;
    });
  };

  const segmentLength = (object, fallback) =>
    Number(object?.geometry?.parameters?.height) || Number(fallback) || 0.8;

  const bySide = (items, side) =>
    (items || []).find((item) => Number(item?.userData?.side || 0) === Number(side)) || null;

  const syncChain2D = (state, options) => {
    const upper = bySide(options.upper, options.side);
    const lower = bySide(options.lower, options.side);
    if (!upper || !lower) return;
    const upperBase = baseOf(state, upper);
    const lowerBase = baseOf(state, lower);
    if (!upperBase || !lowerBase) return;
    const upperLength = segmentLength(upper, options.upperLength);
    const lowerLength = segmentLength(lower, options.lowerLength);
    const baseAngle = Number(upperBase.rotation.z || 0);
    const anchorX = upperBase.position.x - Math.sin(baseAngle) * upperLength * 0.5;
    const anchorY = upperBase.position.y + Math.cos(baseAngle) * upperLength * 0.5;
    const upperAngle = Number(upper.rotation.z || 0);
    upper.position.x = anchorX + Math.sin(upperAngle) * upperLength * 0.5;
    upper.position.y = anchorY - Math.cos(upperAngle) * upperLength * 0.5;
    const jointX = anchorX + Math.sin(upperAngle) * upperLength;
    const jointY = anchorY - Math.cos(upperAngle) * upperLength;
    const lowerAngle = Number(lower.rotation.z || 0);
    lower.position.x = jointX + Math.sin(lowerAngle) * lowerLength * 0.5;
    lower.position.y = jointY - Math.cos(lowerAngle) * lowerLength * 0.5;
    const endX = jointX + Math.sin(lowerAngle) * lowerLength;
    const endY = jointY - Math.cos(lowerAngle) * lowerLength;
    const joint = bySide(options.joints, options.side);
    if (joint) {
      joint.position.x = jointX;
      joint.position.y = jointY;
    }
    const terminal = bySide(options.terminals, options.side);
    if (terminal) {
      const terminalBase = baseOf(state, terminal);
      terminal.position.x = endX + (terminalBase ? terminalBase.position.x - (lowerBase.position.x + Math.sin(Number(lowerBase.rotation.z || 0)) * lowerLength * 0.5) : 0);
      terminal.position.y = endY + (terminalBase ? terminalBase.position.y - (lowerBase.position.y - Math.cos(Number(lowerBase.rotation.z || 0)) * lowerLength * 0.5) : 0);
    }
  };

  const syncKinematics = (state) => {
    [-1, 1].forEach((side) => {
      if (state.type === "npc_translucent") {
        syncChain2D(state, { side, upper: state.named.upperArms, lower: state.named.forearms, joints: state.named.translucentElbows, terminals: state.named.translucentHandAnchors, upperLength: 0.82, lowerLength: 0.88 });
        syncChain2D(state, { side, upper: state.named.translucentThighs, lower: state.named.translucentShins, joints: state.named.translucentKnees, terminals: state.named.translucentFeet, upperLength: 0.86, lowerLength: 0.82 });
      } else {
        syncChain2D(state, { side, upper: state.named.rockyUpperArms, lower: state.named.rockyForearms, joints: state.named.rockyElbows, terminals: [], upperLength: 0.93, lowerLength: 0.72 });
        syncChain2D(state, { side, upper: state.named.rockyThighs, lower: state.named.rockyShins, joints: state.named.rockyKnees, terminals: state.named.rockyFeet, upperLength: 0.9, lowerLength: 0.75 });
      }
    });
  };

  const syncRockyElbowDecor = (state) => {
    if (state.type !== "npc_rocky") return;
    [-1, 1].forEach((side) => {
      const elbow = bySide(state.named.rockyElbows, side);
      const plate = bySide(state.named.rockyElbowPlates, side);
      if (!elbow || !plate) return;
      const elbowBase = baseOf(state, elbow);
      const plateBase = baseOf(state, plate);
      if (!elbowBase || !plateBase) return;
      // Les plaques de coude restent attachées à la sphère d'articulation.
      // X/Z repartent toujours de l'offset capturé à l'enregistrement : aucune dérive cumulative.
      // Y conserve uniquement la micro-animation recalculée depuis la base à chaque frame.
      const microY = plate.position.y - plateBase.position.y;
      plate.position.x = elbow.position.x + (plateBase.position.x - elbowBase.position.x);
      plate.position.y = elbow.position.y + (plateBase.position.y - elbowBase.position.y) + microY;
      plate.position.z = elbow.position.z + (plateBase.position.z - elbowBase.position.z);
    });
  };

  const gaitPhase = (elapsed, speed, phase) => Math.sin(elapsed * speed + phase);

  const animateTranslucentGait = (state, elapsed, intensity = 1) => {
    const step = gaitPhase(elapsed, 5.0, state.phase);
    const sway = Math.sin(elapsed * 2.5 + state.phase) * intensity;
    state.named.translucentThighs.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z + step * side * 0.22 * intensity;
    });
    state.named.translucentShins.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z - step * side * 0.16 * intensity;
    });
    state.named.translucentFeet.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z + step * side * 0.08 * intensity;
    });
    state.named.upperArms.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z - step * side * 0.11 * intensity;
    });
    state.named.translucentTorso.forEach((torso) => {
      const base = baseOf(state, torso);
      if (base) torso.rotation.x = base.rotation.x + sway * 0.045;
    });
    state.root.rotation.z = state.anchor.rotation.z + sway * 0.035;
  };

  const rockyStepEnvelope = (elapsed, phase) => {
    const cycle = ((elapsed * 1.35 + phase / (Math.PI * 2)) % 1 + 1) % 1;
    // Lent au départ, impulsion courte au milieu, lent à la fin.
    const shaped = cycle < 0.34
      ? (cycle / 0.34) * 0.34
      : cycle < 0.58
        ? 0.34 + ((cycle - 0.34) / 0.24) * 0.46
        : 0.8 + ((cycle - 0.58) / 0.42) * 0.2;
    return Math.sin(shaped * Math.PI * 2);
  };

  const animateRockyGait = (state, elapsed, intensity = 1) => {
    const step = rockyStepEnvelope(elapsed, state.phase) * intensity;
    const headNod = Math.sin(elapsed * 2.7 + state.phase) * intensity;
    state.named.rockyThighs.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z + step * side * 0.14;
    });
    state.named.rockyShins.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z - step * side * 0.1;
    });
    state.named.rockyUpperArms.forEach((part) => {
      const base = baseOf(state, part);
      if (!base) return;
      const side = Number(part.userData.side || 1);
      part.rotation.z = base.rotation.z - step * side * 0.055;
    });
    state.named.rockyHead.forEach((head) => {
      const base = baseOf(state, head);
      if (base) head.rotation.z = base.rotation.z + headNod * 0.045;
    });
  };

  const dialogueEnvelope = (age) => {
    const cycle = ((age % 4.2) + 4.2) % 4.2;
    if (cycle < 0.75) return 0.5 - Math.cos((cycle / 0.75) * Math.PI) * 0.5;
    if (cycle < 2.05) return 1;
    if (cycle < 2.9) return 0.5 + Math.cos(((cycle - 2.05) / 0.85) * Math.PI) * 0.5;
    return 0;
  };

  const animateTranslucentInteraction = (state, elapsed, dialogue) => {
    const age = elapsed - state.stateSince;
    const gesture = dialogue ? Math.max(0.22, dialogueEnvelope(age)) : Math.max(0, Math.sin(age * 1.45));
    const nod = Math.sin(age * 1.35) * (dialogue ? 0.1 : 0.06);
    state.named.translucentHead.forEach((head) => {
      const base = baseOf(state, head);
      if (base) head.rotation.z = base.rotation.z + nod;
    });
    state.named.upperArms.forEach((arm) => {
      const base = baseOf(state, arm);
      if (!base) return;
      const side = Number(arm.userData.side || 1);
      const active = side > 0 ? 1 : 0.28;
      arm.rotation.z = base.rotation.z + side * gesture * (dialogue ? 0.42 : 0.18) * active;
      arm.rotation.x = base.rotation.x + side * gesture * 0.09 * active;
    });
    state.named.forearms.forEach((arm) => {
      const base = baseOf(state, arm);
      if (!base) return;
      const side = Number(arm.userData.side || 1);
      if (dialogue && side > 0) {
        // Un avant-bras monte ponctuellement presque à 90° : parallèle au sol.
        arm.rotation.z = base.rotation.z + (FORWARD_FOREARM_ANGLE - base.rotation.z) * gesture;
      } else {
        arm.rotation.z = base.rotation.z - side * gesture * (dialogue ? 0.28 : 0.16);
      }
    });
  };

  const animateRockyInteraction = (state, elapsed, dialogue) => {
    const age = elapsed - state.stateSince;
    const beat = dialogue ? Math.max(0.2, dialogueEnvelope(age)) : Math.max(0, Math.sin(age * 1.1));
    state.named.rockyHead.forEach((head) => {
      const base = baseOf(state, head);
      if (base) head.rotation.z = base.rotation.z + beat * (dialogue ? 0.11 : 0.07);
    });
    state.named.rockyUpperArms.forEach((arm) => {
      const base = baseOf(state, arm);
      if (!base) return;
      const side = Number(arm.userData.side || 1);
      const active = side > 0 ? 1 : 0.3;
      arm.rotation.z = base.rotation.z + side * beat * (dialogue ? 0.34 : 0.13) * active;
    });
    state.named.rockyForearms.forEach((arm) => {
      const base = baseOf(state, arm);
      if (!base) return;
      const side = Number(arm.userData.side || 1);
      if (dialogue && side > 0) {
        arm.rotation.z = base.rotation.z + (FORWARD_FOREARM_ANGLE - base.rotation.z) * beat;
      } else {
        arm.rotation.z = base.rotation.z - side * beat * (dialogue ? 0.24 : 0.14);
      }
    });
  };

  const updateMotion = (state, elapsed) => {
    const motion = state.motion;
    if (!motion) return;
    const raw = clamp((elapsed - motion.startedAt) / Math.max(0.15, motion.duration), 0, 1);
    const t = state.type === "npc_rocky"
      ? (raw < 0.35
          ? 0.18 * (raw / 0.35) * (raw / 0.35)
          : raw < 0.60
            ? 0.18 + 0.55 * ((raw - 0.35) / 0.25)
            : 0.73 + 0.27 * (1 - Math.pow(1 - (raw - 0.60) / 0.40, 2)))
      : 0.5 - Math.cos(raw * Math.PI) * 0.5;
    state.root.position.x = motion.from.x + (motion.to.x - motion.from.x) * t;
    state.root.position.z = motion.from.z + (motion.to.z - motion.from.z) * t;
    const dx = motion.to.x - motion.from.x;
    const dz = motion.to.z - motion.from.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.001) state.root.rotation.y = Math.atan2(-dz, dx);
    if (raw >= 1) {
      state.motion = null;
      if (motion.autoRelease) {
        changeState(state, "calm", elapsed, false);
        state.nextIdleChangeAt = elapsed + 2.5;
      }
      rootEvent(state.root, "bluefox:npc-motion-complete", { type: state.type, state: state.state });
    }
  };

  const updateTranslucent = (state, elapsed, distance) => {
    const proximity = clamp(1 - distance / 6, 0, 1);
    const curious = state.state === "curiosity" || state.state === "observation";
    const vigilant = state.state === "vigilance";
    const moving = state.state === "movement" || state.state === "flee";
    const interacting = state.state === "interaction" || state.state === "dialogue";
    const calm = state.state === "calm";
    const breathe = Math.sin(elapsed * (vigilant ? 1.25 : calm ? 0.58 : 0.72) + state.phase);
    const hover = Math.sin(elapsed * 0.82 + state.phase * 0.7);
    const drift = Math.sin(elapsed * 0.31 + state.phase);

    state.root.position.y = state.anchor.position.y + hover * (moving ? 0.025 : 0.045);
    if (!moving) state.root.rotation.z = state.anchor.rotation.z + drift * 0.008;
    state.root.rotation.x = state.anchor.rotation.x + (curious ? -0.025 : 0);

    state.named.translucentTorso.forEach((torso) => {
      const base = baseOf(state, torso);
      if (!base) return;
      torso.scale.set(
        base.scale.x * (1 - breathe * 0.012),
        base.scale.y * (1 + breathe * 0.025),
        base.scale.z * (1 + breathe * 0.018)
      );
    });

    state.named.core.forEach((core, index) => {
      const base = baseOf(state, core);
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
      const base = baseOf(state, membrane);
      if (!base) return;
      membrane.rotation.x = base.rotation.x + Math.sin(elapsed * 1.1 + index * 1.7 + state.phase) * 0.045;
      membrane.rotation.z = base.rotation.z + Math.sin(elapsed * 0.83 + index + state.phase) * 0.025;
      membrane.scale.y = base.scale.y * (1 + Math.sin(elapsed * 1.35 + index) * 0.035);
    });

    state.named.filaments.forEach((filament, index) => {
      const base = baseOf(state, filament);
      if (!base) return;
      filament.rotation.z = base.rotation.z + Math.sin(elapsed * 1.05 + index * 0.58 + state.phase) * (0.035 + proximity * 0.025);
      filament.rotation.x = base.rotation.x + Math.cos(elapsed * 0.8 + index * 0.44) * 0.018;
    });

    state.named.shoulders.forEach((part, index) => {
      const base = baseOf(state, part);
      if (base) part.rotation.x = base.rotation.x + breathe * 0.018 * (index ? -1 : 1);
    });
    state.named.upperArms.forEach((part, index) => {
      const base = baseOf(state, part);
      if (base && !moving && !interacting) part.rotation.z = base.rotation.z + breathe * 0.012 + (curious ? (index ? -0.025 : 0.025) : 0);
    });
    state.named.forearms.forEach((part, index) => {
      const base = baseOf(state, part);
      if (base && !moving && !interacting) part.rotation.z = base.rotation.z - breathe * 0.01 + (vigilant ? (index ? 0.035 : -0.035) : 0);
    });

    animateHeadState(state, elapsed);
    if (moving) animateTranslucentGait(state, elapsed, state.state === "flee" ? 1.35 : 1);
    if (interacting) animateTranslucentInteraction(state, elapsed, state.state === "dialogue");
    const tracking = Number.isFinite(distance) && distance < 7 ? Math.max(0.48, clamp(1 - distance / 8, 0, 1)) : 0;
    facePlayer(state, distance, interacting ? 1 : vigilant ? 1 : tracking, interacting ? 1.05 : vigilant ? 0.95 : 0.78);
    updateEyes(state, elapsed, 0.9 + proximity * 0.35, tracking * 1.35);
    syncKinematics(state);
  };

  const updateRocky = (state, elapsed, distance) => {
    const proximity = clamp(1 - distance / 6.5, 0, 1);
    const vigilant = state.state === "vigilance";
    const observation = state.state === "observation" || state.state === "curiosity";
    const moving = state.state === "movement" || state.state === "flee";
    const interacting = state.state === "interaction" || state.state === "dialogue";
    const calm = state.state === "calm";
    const breath = Math.sin(elapsed * (vigilant ? 0.78 : calm ? 0.38 : 0.46) + state.phase);
    const weight = Math.sin(elapsed * 0.24 + state.phase * 0.6);

    if (!moving) state.root.rotation.z = state.anchor.rotation.z + weight * 0.009;
    state.root.rotation.x = state.anchor.rotation.x + (observation ? -0.015 : 0);

    state.named.rockyTorso.forEach((torso) => {
      const base = baseOf(state, torso);
      if (!base) return;
      torso.scale.set(
        base.scale.x * (1 - breath * 0.006),
        base.scale.y * (1 + breath * 0.012),
        base.scale.z * (1 + breath * 0.01)
      );
      torso.position.y = base.position.y + breath * 0.009;
    });

    state.named.rockyPlates.forEach((plate, index) => {
      const base = baseOf(state, plate);
      if (!base) return;
      const local = Math.sin(elapsed * 0.35 + index * 0.9 + state.phase);
      plate.position.y = base.position.y + local * 0.006;
      plate.rotation.z = base.rotation.z + local * 0.004 + (vigilant ? Math.sin(elapsed * 3 + index) * 0.002 : 0);
    });

    state.named.rockyFragments.forEach((fragment, index) => {
      const base = baseOf(state, fragment);
      if (!base) return;
      const loosen = Math.max(0, Math.sin(elapsed * 0.52 + index * 1.31 + state.phase));
      fragment.position.y = base.position.y - loosen * (index % 4 === 0 ? 0.018 : 0.004);
      fragment.rotation.y = base.rotation.y + elapsed * (0.012 + index * 0.001);
    });

    animateHeadState(state, elapsed);
    if (moving) animateRockyGait(state, elapsed, state.state === "flee" ? 1.25 : 1);
    if (interacting) animateRockyInteraction(state, elapsed, state.state === "dialogue");
    const tracking = Number.isFinite(distance) && distance < 7 ? Math.max(0.45, clamp(1 - distance / 8, 0, 1)) : 0;
    facePlayer(state, distance, interacting ? 1 : vigilant ? 1 : tracking, interacting ? 0.9 : vigilant ? 0.82 : 0.7);
    updateEyes(state, elapsed, 0.82 + proximity * 0.5 + Math.max(0, breath) * 0.08, tracking * 1.2);
    syncKinematics(state);
    syncRockyElbowDecor(state);
  };

  const update = (state, elapsed) => {
    if (!state.enabled || !state.root.parent || state.root.visible === false) return;
    const distance = distanceToPlayer(state.root);
    updateRelationRank(state, elapsed);
    updateContactSession(state, elapsed);
    const approach = updateRelationalApproach(state, elapsed, distance);
    if (
      approach.threat &&
      elapsed >= state.relationalFleeUntil &&
      !state.contactControlled &&
      !state.motion
    ) {
      state.relationalFleeUntil = elapsed + 2.6;
      if (!state.relationalFleeEmitted) {
        state.relationalFleeEmitted = emitNpcReaction(state, "flee", "relational-approach", {
          distance,
          encounterId: state.relationalEncounterId,
          behaviorSignature: "flee",
          closureSpeed: approach.closureSpeed,
          tags: ["flee", "intrusive_approach", "relational_behavior"]
        });
      }
      BF.NpcRuntime?.fleeFromPlayer?.(state.root, 3.5);
    }
    chooseState(state, elapsed, distance);
    updateMotion(state, elapsed);
    if (state.speechSprite && elapsed >= state.speechUntil) state.speechSprite.visible = false;
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
        if (!isSceneAttached(root)) unregister(root);
      });
    }
    global.requestAnimationFrame?.(frame);
  };

  BF.NpcRuntime = Object.freeze({
    version: VERSION,
    register,
    unregister,
    restore,
    list(type = null) {
      return Object.freeze([...registry].filter((root) => !type || states.get(root)?.type === type));
    },
    getState(root) {
      const state = states.get(root);
      return state ? Object.freeze({
        type: state.type,
        state: state.state,
        previousState: state.previousState,
        stateSince: state.stateSince,
        controlled: state.controlled,
        moving: Boolean(state.motion),
        relationRank: state.relationRank,
        civilizationId: civilizationIdForType(state.type),
        enabled: state.enabled
      }) : null;
    },
    setState(root, nextState) {
      const state = states.get(root);
      if (!state || !ALLOWED_STATES.has(nextState)) return false;
      state.motion = null;
      state.relationalReactionControlled = false;
      return changeState(state, nextState, nowSeconds() - startedAt, true);
    },
    releaseState(root) {
      const state = states.get(root);
      if (!state) return false;
      state.controlled = false;
      state.relationalReactionControlled = false;
      state.motion = null;
      state.nextIdleChangeAt = nowSeconds() - startedAt;
      return true;
    },
    moveLocal(root, dx = 0, dz = 0, options = {}) {
      const state = states.get(root);
      if (!state) return false;
      state.relationalReactionControlled = false;
      const distance = Math.hypot(Number(dx) || 0, Number(dz) || 0);
      const maxDistance = Math.max(0.25, Math.min(4.5, Number(options.maxDistance) || 4.5));
      const scale = distance > maxDistance ? maxDistance / distance : 1;
      const x = (Number(dx) || 0) * scale;
      const z = (Number(dz) || 0) * scale;
      const nextState = options.state === "flee" ? "flee" : "movement";
      changeState(state, nextState, nowSeconds() - startedAt, true);
      const startedAtMotion = nowSeconds() - startedAt;
      state.motion = {
        from: { x: state.root.position.x, z: state.root.position.z },
        to: { x: state.anchor.position.x + x, z: state.anchor.position.z + z },
        startedAt: startedAtMotion,
        duration: Math.max(0.45, Number(options.duration) || (state.type === "npc_rocky" ? Math.max(1.5, distance / 0.75) : Math.max(1.0, distance / 1.1))),
        autoRelease: options.autoRelease !== false
      };
      return true;
    },
    fleeFromPlayer(root, distance = 2.8) {
      const state = states.get(root);
      const player = playerRoot();
      if (!state || !player) return false;
      let dx = Number(state.root.position.x || 0) - Number(player.position?.x || 0);
      let dz = Number(state.root.position.z || 0) - Number(player.position?.z || 0);
      const length = Math.hypot(dx, dz) || 1;
      dx = dx / length * distance;
      dz = dz / length * distance;
      return this.moveLocal(root, dx, dz, { state: "flee", autoRelease: true });
    },
    chooseRelationalDistance(root, options = {}) {
      const state = states.get(root);
      const player = playerRoot();
      if (!state || !player) return null;
      const choices = (Array.isArray(options.choices) ? options.choices : ["approach", "hold", "retreat"])
        .map((value) => String(value || "").toLowerCase())
        .filter((value) => ["approach", "hold", "retreat"].includes(value));
      if (!choices.length) return null;
      const choice = choices[Math.floor(Math.random() * choices.length)];
      const dx = Number(player.position?.x || 0) - Number(root.position?.x || 0);
      const dz = Number(player.position?.z || 0) - Number(root.position?.z || 0);
      const length = Math.hypot(dx, dz) || 1;
      const step = Math.max(0.6, Number(options.stepDistance) || 1.2);
      const cause = String(options.cause || "relational-distance-choice");
      let reaction = "calm";
      let signature = "distance_hold";
      if (choice === "approach") {
        this.moveLocal(root, dx / length * step, dz / length * step, { state: "movement", autoRelease: true });
        reaction = "curiosity";
        signature = "distance_reduce";
      } else if (choice === "retreat") {
        this.moveLocal(root, -dx / length * step, -dz / length * step, { state: "movement", autoRelease: true });
        reaction = "observation";
        signature = "distance_increase";
      } else {
        state.motion = null;
        changeState(state, "calm", nowSeconds() - startedAt, true);
      }
      emitNpcReaction(state, reaction, cause, {
        distance: distanceToPlayer(root),
        encounterId: state.relationalEncounterId,
        behaviorSignature: signature,
        tags: ["relational_behavior", "spatial_choice", signature]
      });
      if (choice === "hold" && options.autoRelease !== false) {
        global.setTimeout?.(() => { if (states.has(root)) this.releaseState(root); }, 1600);
      }
      return choice;
    },
    reactToApproach(root, options = {}) {
      const state = states.get(root);
      if (!state) return null;
      const candidates = (Array.isArray(options.behaviors) ? options.behaviors : ["curiosity", "vigilance", "flee"])
        .map((value) => String(value || "").toLowerCase())
        .filter((value) => ALLOWED_STATES.has(value) && !["movement", "interaction", "dialogue"].includes(value));
      if (!candidates.length) return null;
      const reaction = candidates[Math.floor(Math.random() * candidates.length)];
      const distance = distanceToPlayer(root);
      if (reaction === "flee") {
        state.relationalReactionControlled = false;
        this.fleeFromPlayer(root, Math.max(2.8, Number(options.fleeDistance) || 3.5));
      } else {
        state.motion = null;
        state.relationalReactionControlled = true;
        changeState(state, reaction, nowSeconds() - startedAt, true);
      }
      emitNpcReaction(state, reaction, options.cause || "approach", {
        distance,
        encounterId: state.relationalEncounterId,
        behaviorSignature: options.behaviorSignature || reaction,
        tags: Array.isArray(options.tags) ? options.tags : []
      });
      if (options.autoRelease !== false && reaction !== "flee") {
        global.setTimeout?.(() => {
          if (states.has(root)) this.releaseState(root);
        }, Math.max(900, Number(options.releaseAfterMs) || 1800));
      }
      return reaction;
    },
    speak(root, text = "⋔ ⌁ ∆ ⟟", options = {}) {
      const state = states.get(root);
      if (!state) return false;
      const elapsed = nowSeconds() - startedAt;
      state.relationalReactionControlled = false;
      changeState(state, "dialogue", elapsed, true);
      return presentSpeech(
        state,
        text,
        elapsed,
        Number(options.duration) || 3.8,
        options.emitDialogue !== false
      );
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
