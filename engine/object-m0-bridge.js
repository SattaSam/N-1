﻿(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const installed = { mission: false, action: false, world: false };

  const ancestors = (object) => {
    const chain = [];
    let cursor = object;
    while (cursor) {
      chain.push(cursor);
      cursor = cursor.parent || null;
    }
    return chain;
  };

  const resolveObject = (object) => {
    const chain = ancestors(object);
    const anchor = object?.userData?.worldAnchor ||
      chain.find((node) => node.userData?.worldAnchor)?.userData.worldAnchor ||
      chain.find((node) => node.userData?.functional || node.userData?.objectType) ||
      object;
    const nodes = [...chain, anchor].filter(Boolean);
    let definition = null;

    for (const node of nodes) {
      definition = node.userData?.functional || node.userData?.definition || null;
      if (definition) break;
    }
    if (!definition && BF.ObjectLibrary) {
      for (const node of nodes) {
        const data = node.userData || {};
        definition = BF.ObjectLibrary.getById?.(data.catalogId) ||
          BF.ObjectLibrary.get?.(data.libraryType) ||
          BF.ObjectLibrary.get?.(data.objectType) || null;
        if (definition) break;
      }
    }
    if (!definition && BF.ObjectLibrary) {
      // Compatibilité de lecture pour les anciennes instances sans identifiant
      // CUO. Cette inférence ne décide jamais de l'action à exécuter.
      const names = nodes.map((node) => String(node.name || "").toLowerCase());
      const inferredType = names.some((name) => name.includes("ancientstele")) ? "stele" :
        names.some((name) => name.includes("luminouspool")) ? "pool" :
        names.some((name) => name.includes("fiberplant")) ? "fiber" :
        names.some((name) => name.includes("crystalcluster")) ? "crystal" : null;
      if (inferredType) definition = BF.ObjectLibrary.get(inferredType);
    }

    const data = object?.userData || {};
    const rootData = anchor?.userData || {};
    if (definition) {
      object.userData.functional = definition;
      object.userData.catalogId ||= definition.id;
      object.userData.libraryType ||= definition.type;
      if (anchor) {
        anchor.userData.functional = definition;
        anchor.userData.catalogId ||= definition.id;
        anchor.userData.objectType ||= definition.type;
      }
    }
    return { object, anchor, data, rootData, definition };
  };

  const interactionState = (resolved) => {
    const owner = resolved.anchor || resolved.object;
    owner.userData.interactionState ||= {
      inspected: false,
      observed: false,
      analyzed: false,
      identified: false,
      collected: false,
      inspectionCount: 0,
      observationCount: 0,
      analysisCount: 0,
      collectionCount: 0
    };
    return owner.userData.interactionState;
  };

  const capabilities = (definition) => {
    const actions = new Set(definition?.interaction?.actions || []);
    return {
      observable: actions.has("observe"),
      inspectable: definition?.gameplay?.inspectable === true || actions.has("inspect"),
      analyzable: definition?.gameplay?.analyzable === true || actions.has("analyze"),
      collectable: definition?.gameplay?.collectable === true || actions.has("collect") || actions.has("extract"),
      extractable: actions.has("extract") || definition?.resource?.exploitability === "extractable",
      requiresInspection: definition?.interaction?.requiresInspectionBeforeCollect === true
    };
  };

  const resolveManualAction = (resolved) => {
    const { definition } = resolved;
    if (!definition) return null;
    const state = interactionState(resolved);
    const caps = capabilities(definition);
    const neverStudied =
      !state.observed && !state.inspected && !state.analyzed && !state.identified &&
      Number(state.observationCount || 0) === 0 &&
      Number(state.inspectionCount || 0) === 0 &&
      Number(state.analysisCount || 0) === 0;
    // La première rencontre d'un objet étudiable est toujours une observation
    // physique. Le geste d'acquisition CUO ne devient disponible qu'ensuite.
    if (neverStudied && (caps.observable || caps.inspectable || caps.analyzable)) {
      return "observe";
    }
    if (caps.requiresInspection && caps.inspectable && caps.collectable) {
      return state.inspected || state.identified
        ? (definition.interaction?.afterInspectionAction || "collect")
        : "inspect";
    }
    const preferred = definition.interaction?.defaultManualAction || definition.interaction?.defaultAction;
    if (preferred === "extract" && caps.extractable) return "extract";
    if (preferred === "collect" && caps.collectable) return "collect";
    if (preferred === "analyze" && caps.analyzable) return "analyze";
    if (preferred === "inspect" && caps.inspectable) return "inspect";
    if (preferred === "observe" && caps.observable) return "observe";
    if (caps.extractable) return "extract";
    if (caps.collectable) return definition.interaction?.acquisitionAction || "collect";
    if (caps.analyzable) return "analyze";
    if (caps.inspectable) return "inspect";
    if (caps.observable) return "observe";
    return null;
  };

  const validateAction = (resolved, requested, missionRequested = false) => {
    const caps = capabilities(resolved.definition);
    const state = interactionState(resolved);
    const allowed = new Set(resolved.definition?.interaction?.actions || []);
    if (requested === "collect" || requested === "extract") {
      if (!caps.collectable) return caps.inspectable ? "inspect" : null;
      if (caps.requiresInspection && !state.inspected && !state.identified) return "inspect";
      if (requested === "extract" && !caps.extractable) {
        return allowed.has("collect") ? "collect" : null;
      }
      if (requested === "collect" && caps.extractable && !allowed.has("collect")) {
        return "extract";
      }
      return requested;
    }
    // Une mission peut imposer une nouvelle étude d'un objet déjà connu, même
    // si cette action n'est pas son geste manuel CUO par défaut. L'autorisation
    // contextuelle reste limitée aux trois verbes d'étude et à un objet que le
    // moteur sait au minimum étudier.
    if (missionRequested && ["observe", "inspect", "analyze"].includes(requested)) {
      return canStudy(resolved.definition) ? requested : null;
    }
    if (requested === "analyze") return caps.analyzable ? "analyze" : null;
    if (requested === "inspect") return caps.inspectable ? "inspect" : null;
    // OBSERVE est le geste physique canonique des verbes narratifs observer,
    // inspecter et analyser, y compris pour les anciens CUO qui n'exposent
    // encore que inspect/analyze dans leur catalogue.
    if (requested === "observe") return canStudy(resolved.definition) ? "observe" : null;
    return resolveManualAction(resolved);
  };

  const isStudyAction = (type) => [
    Missions.ActionType.OBSERVE,
    Missions.ActionType.INSPECT,
    Missions.ActionType.ANALYZE
  ].includes(Missions.normalizeActionType(type));

  const narrativeStudyVerb = (type) => {
    const normalized = Missions.normalizeActionType(type);
    if (normalized === Missions.ActionType.ANALYZE) return "analyze";
    if (normalized === Missions.ActionType.INSPECT) return "inspect";
    return "observe";
  };

  const eventMatchesNode = (event, node) => {
    if (node.params?.catalogManaged) return false;
    const type = Missions.normalizeActionType(node.type);
    const detail = event.detail || {};
    const tags = new Set([...(event.tags || []), ...(detail.tags || [])]);
    if ([
      BF.ObjectEvents?.types.RESOURCE_COLLECTED,
      BF.ObjectEvents?.types.RESOURCE_EXTRACTED
    ].includes(event.type)) {
      if (![Missions.ActionType.COLLECT, Missions.ActionType.EXTRACT].includes(type)) {
        return false;
      }
      const kind = detail.kind || event.inventoryKey || event.family;
      return !node.params.kind || node.params.kind === kind;
    }
    if (![BF.ObjectEvents?.types.OBJECT_INSPECTED, BF.ObjectEvents?.types.PHENOMENON_OBSERVED, BF.ObjectEvents?.types.OBJECT_ANALYZED].includes(event.type)) return false;
    if (!isStudyAction(type)) return false;

    if (detail.missionNodeId && detail.missionNodeId !== node.id) return false;
    if (detail.missionNodeId && event.type !== BF.ObjectEvents?.types.PHENOMENON_OBSERVED) return false;

    const requestedVerb = String(
      detail.missionNarrativeVerb || detail.interactionMode || ""
    ).toLowerCase();
    if (
      !detail.missionNodeId &&
      requestedVerb &&
      requestedVerb !== narrativeStudyVerb(type)
    ) return false;
    const subject = String(node.params.subject || "").toLowerCase();
    if (!subject) return true;
    if (subject === "structure") return detail.kind === "structure" || tags.has("ruin") || tags.has("landmark");
    if (subject === "flora") return event.knowledgeFamily === "flora" || tags.has("plant");
    if (subject === "components") return tags.has("technology") || tags.has("ruin") || detail.kind === "debris";
    return subject === detail.subject || subject === detail.kind || subject === event.family;
  };

  const eventMatchesBoundTarget = (manager, missionId, event) => {
    if ([
      BF.ObjectEvents?.types.RESOURCE_COLLECTED,
      BF.ObjectEvents?.types.RESOURCE_EXTRACTED
    ].includes(event.type)) return true;
    const bound = manager?.memory?.getFact?.(`bibleTarget:${missionId}`);
    if (!bound || (!bound.instanceId && !bound.objectId && !bound.cuoType)) return true;
    if (bound.binding === "instance" && bound.instanceId) {
      return String(event.instanceId || "") === String(bound.instanceId);
    }
    const eventType = String(event.detail?.cuoType || "").toLowerCase();
    const sameType = bound.cuoType && eventType === String(bound.cuoType).toLowerCase();
    const sameDefinition = bound.objectId &&
      String(event.objectId || "").toLowerCase() === String(bound.objectId).toLowerCase();
    return Boolean(sameType || sameDefinition);
  };

  const applyObjectEventProgress = (manager, event) => {
    if (!manager || manager.memory?.hasProcessedObjectEvent?.(event.id)) {
      return { changed: 0, currentMatched: false };
    }
    let changed = 0;
    let currentMatched = false;
    const current = manager.currentAction;
    const trees = manager.trees?.size
      ? manager.trees
      : manager.tree
        ? new Map([[manager.tree.id, manager.tree]])
        : new Map();
    if (!trees.size) return 0;
    trees.forEach((tree, missionId) => {
      if (
        manager.ensureLifecycle &&
        manager.ensureLifecycle(missionId).status !== "active"
      ) return;
      if (!eventMatchesBoundTarget(manager, missionId, event)) return;
      let treeChanged = false;
      tree.availableLeaves().forEach((node) => {
        if (node.isComplete || !eventMatchesNode(event, node)) return;
        if (node.increment(Math.max(1, Number(event.quantity) || 1))) {
          changed += 1;
          treeChanged = true;
          if (current?.missionId === missionId && current?.nodeId === node.id) {
            currentMatched = true;
          }
        }
      });
      if (treeChanged) {
        tree.refresh();
        manager.memory.saveTree(tree);
      }
    });
    manager.memory?.markProcessedObjectEvent?.(event.id);
    if (currentMatched) {
      const detail = {
        ...(event.detail || {}),
        kind: event.detail?.kind || event.inventoryKey || event.family,
        amount: Math.max(1, Number(event.quantity) || 1),
        objectId: event.objectId,
        instanceId: event.instanceId,
        mapId: event.mapId,
        zoneId: event.zoneId,
        eventType: event.type
      };
      manager.memory.remember(current.type, detail);
      manager.memory.remember("action-completed", current);
      manager.currentAction = null;
      manager.retryAfter = performance.now() + 650;
    } else {
      manager.memory?.remember?.(event.type, {
        ...(event.detail || {}),
        eventId: event.id,
        amount: Math.max(1, Number(event.quantity) || 1),
        objectId: event.objectId,
        instanceId: event.instanceId
      });
    }
    if (changed) {
      manager.syncLifecycleFromTrees?.();
      manager.reevaluatePendingActivations?.();
      manager.catalogController?.schedule?.();
      manager.publish();
    } else {
      manager.memory?.save?.();
    }
    return { changed, currentMatched };
  };

  const installMissionBridge = () => {
    if (installed.mission || !Missions.MissionManager || !BF.ObjectEvents) return false;
    installed.mission = true;
    const proto = Missions.MissionManager.prototype;
    proto.consumeObjectEvent = function consumeObjectEvent(event) {
      const isAcquisition = [
        BF.ObjectEvents.types.RESOURCE_COLLECTED,
        BF.ObjectEvents.types.RESOURCE_EXTRACTED
      ].includes(event.type);
      if (BF.bibleRuntime?.isActivationEvent?.(event.id) && !isAcquisition) {
        this.memory.remember(event.type, {
          ...(event.detail || {}),
          activationOnly: true,
          eventId: event.id
        });
        return false;
      }
      const result = applyObjectEventProgress(this, event);
      return result.currentMatched || result.changed > 0;
    };
    const originalCreate = Missions.MissionManager.create;
    Missions.MissionManager.create = function createWithObjectEvents(options) {
      const manager = originalCreate.call(this, options);
      manager.unsubscribeObjectEvents?.();
      manager.unsubscribeObjectEvents = BF.ObjectEvents.subscribe((event) => manager.consumeObjectEvent(event));
      const originalDispose = manager.dispose.bind(manager);
      manager.dispose = () => { manager.unsubscribeObjectEvents?.(); manager.unsubscribeObjectEvents = null; originalDispose(); };
      return manager;
    };
    return true;
  };

  const objectTags = (definition) => new Set([
    ...(definition?.spawn?.tags || []),
    ...(definition?.situation?.tags || [])
  ].map((value) => String(value || "").toLowerCase()));

  const matchesStudySubject = (definition, subject) => {
    const expected = String(subject || "").trim().toLowerCase();
    if (!expected) return true;
    const tags = objectTags(definition);
    const family = String(
      definition?.knowledge?.family ||
      definition?.resource?.family ||
      definition?.category || ""
    ).toLowerCase();

    if (expected === "flora") {
      return family === "flora" || tags.has("plant") ||
        /flora|plant|fiber|biomass/i.test(
          `${definition?.type || ""} ${definition?.subtype || ""}`
        );
    }
    if (expected === "fauna") {
      return family === "fauna" || tags.has("fauna") ||
        tags.has("animal") || tags.has("creature");
    }
    if (expected === "components") {
      return family === "technology" || tags.has("technology") ||
        tags.has("component") || tags.has("ruin");
    }
    if (expected === "structure") {
      return definition?.category === "structure" ||
        tags.has("ruin") || tags.has("landmark");
    }
    return expected === family ||
      expected === String(definition?.type || "").toLowerCase();
  };

  const canStudy = (definition) => {
    const caps = capabilities(definition);
    return caps.observable || caps.inspectable || caps.analyzable;
  };

  const canPerformStudyAction = (definition, type) => {
    const caps = capabilities(definition);
    const normalized = Missions.normalizeActionType(type);
    if (normalized === Missions.ActionType.OBSERVE) return caps.observable;
    if (normalized === Missions.ActionType.INSPECT) return caps.inspectable;
    if (normalized === Missions.ActionType.ANALYZE) return caps.analyzable;
    return false;
  };

  const identityOf = (resolved) => ({
    instanceId: String(
      resolved.object?.userData?.instanceId ||
      resolved.anchor?.userData?.instanceId || ""
    ),
    objectId: String(resolved.definition?.id || "").toLowerCase(),
    cuoType: String(resolved.definition?.type || "").toLowerCase()
  });

  const matchesBoundTarget = (engine, missionId, resolved) => {
    const bound = engine?.missionManager?.memory?.getFact?.(`bibleTarget:${missionId}`);
    if (!bound || (!bound.instanceId && !bound.objectId && !bound.cuoType)) return true;
    const identity = identityOf(resolved);
    if (bound.binding === "instance" && bound.instanceId) {
      return identity.instanceId === String(bound.instanceId);
    }
    const sameType = bound.cuoType && identity.cuoType === String(bound.cuoType).toLowerCase();
    const sameDefinition = bound.objectId &&
      identity.objectId === String(bound.objectId).toLowerCase();
    return Boolean(sameType || sameDefinition);
  };

  const selectObservable = (engine, action) =>
    (engine.currentMap?.interactables || [])
      .filter((object) => {
        if (!object.userData.active) return false;
        const definition = resolveObject(object).definition;
        return definition &&
          canStudy(definition) &&
          matchesStudySubject(definition, action.params?.subject) &&
          matchesBoundTarget(engine, action.missionId, resolveObject(object));
      })
      .sort((left, right) => {
        const distance = (object) => engine.character.root.position.distanceTo(
          object.userData.worldAnchor?.position || object.position
        );
        return distance(left) - distance(right);
      })[0] || null;

  const activeStudyDirective = (engine, resolved) => {
    const manager = engine?.missionManager;
    const definition = resolved?.definition;
    if (!manager || !definition || !canStudy(definition)) return null;

    const missionIds = [...(manager.activeMissionIds || [])]
      .filter((id) => manager.trees?.has?.(id))
      .sort((left, right) =>
        Number(right === manager.primaryMissionId) -
        Number(left === manager.primaryMissionId)
      );

    for (const missionId of missionIds) {
      if (manager.ensureLifecycle?.(missionId)?.status !== "active") continue;
      const tree = manager.trees.get(missionId);
      for (const node of tree.availableLeaves()) {
        if (!isStudyAction(node.type)) continue;
        if (!matchesStudySubject(definition, node.params?.subject)) continue;
        if (!matchesBoundTarget(engine, missionId, resolved)) continue;
        return {
          missionId,
          nodeId: node.id,
          subject: node.params?.subject || null,
          narrativeVerb: narrativeStudyVerb(node.type)
        };
      }
    }
    return null;
  };

  const installActionBridge = () => {
    if (installed.action || !Missions.ActionBridge) return false;
    installed.action = true;
    const originalExecute = Missions.ActionBridge.prototype.execute;
    Missions.ActionBridge.prototype.execute = function executeObjectAware(action, now) {
      if ([
        Missions.ActionType.OBSERVE,
        Missions.ActionType.INSPECT,
        Missions.ActionType.ANALYZE
      ].includes(action?.type) && !this.isEngineBusy()) {
        const target = selectObservable(this.engine, action);
        if (target) {
          target.userData.requestedInteraction = "observe";
          target.userData.requestedInteractionSource = "mission";
          target.userData.missionSubject = action.params?.subject || null;
          target.userData.missionNarrativeVerb = narrativeStudyVerb(action.type);
          target.userData.missionNodeId = action.nodeId || null;
          target.userData.missionId = action.missionId || null;

          const accepted = this.engine.targetInteraction(target);
          if (accepted === false) {
            target.userData.requestedInteraction = null;
            target.userData.requestedInteractionSource = null;
            target.userData.missionSubject = null;
            target.userData.missionNarrativeVerb = null;
            target.userData.missionNodeId = null;
            target.userData.missionId = null;
            target.userData.lastInteractionAt = performance.now();
            this.engine.callbacks?.onAction?.("mission-interaction-refused");
            return false;
          }
          return true;
        }
      }
      return originalExecute.call(this, action, now);
    };
    return true;
  };

  const startStudyPose = (character, relicSequence = false) => {
    // Idle_V2 est privilégiée : c'est la respiration la plus ample du modèle.
    const breathIdle = character.findAvailableClip?.(
      ["Idle_V2", "Idle_V3", "Idle", "Idle_V4"]
    ) || "";
    const ear = character.findAvailableClip?.([
      "Ear_Right",
      character.clips?.find?.((clip) => /^ear/i.test(clip.name))?.name
    ]) || "";
    const standardIdle = character.findAvailableClip?.(
      ["Idle", "Idle_V3", "Idle_V2", "Idle_V4"]
    ) || breathIdle;
    const blink = character.findAvailableClip?.([
      "Blink",
      "Blink_Left",
      "Blink_Right",
      character.clips?.find?.((clip) => /^blink/i.test(clip.name))?.name
    ]) || "";

    const now = performance.now();
    const holdMs = 2000;
    const idleAction = breathIdle ? character.actions?.get?.(breathIdle) : null;
    const idleDuration = breathIdle
      ? Math.max(0.8, Math.min(1.6, Number(idleAction?.getClip?.().duration) || 1.2))
      : 0;
    // Le rig de production expose explicitement l'os `Head`. Le cibler avant
    // tout parcours évite de modifier `Head.001` (géométrie faciale), dont le
    // mouvement est presque invisible à la caméra de jeu.
    let headNode = character.visual?.getObjectByName?.("Head") ||
      character.visual?.getObjectByName?.("Neck") || null;
    character.visual?.traverse?.((node) => {
      if (headNode || !/^head(?:[._-]|$)|^neck(?:[._-]|$)|^t[eê]te$|^cou$/i.test(String(node.name || ""))) return;
      if (node.rotation) headNode = node;
    });
    const tiltNode = headNode || character.visual || null;
    const tiltBase = tiltNode?.rotation
      ? { x: tiltNode.rotation.x, y: tiltNode.rotation.y, z: tiltNode.rotation.z }
      : null;
    const visualScaleBase = character.visual?.scale
      ? {
          x: character.visual.scale.x,
          y: character.visual.scale.y,
          z: character.visual.scale.z
        }
      : null;
    // Renfort visuel contrôlé : l'amorce du clip était trop discrète selon les
    // rigs. On marque donc réellement le penché de tête sans bouger l'oreille.
    if (tiltNode?.rotation && tiltBase) {
      tiltNode.rotation.x = tiltBase.x + 0.14;
      tiltNode.rotation.z = tiltBase.z + (relicSequence ? -0.30 : (headNode ? 0.30 : 0.12));
    }

    if (!ear || !character.actions?.has?.(ear)) {
      if (breathIdle) character.play(breathIdle, 0.14, true);
      const fallbackDuration = Math.max(2, idleDuration);
      character.actionLockUntil = now + fallbackDuration * 1000;
      character.__bluefoxStudyPose = {
        endsAt: character.actionLockUntil,
        tiltNode,
        tiltBase,
        visualScaleBase
      };
      return fallbackDuration;
    }

    const action = character.actions.get(ear);
    const duration = Math.max(0.8, Number(action.getClip?.().duration) || 1.2);
    character.play(ear, 0.12, true);

    const freezeAt = Math.max(0.18, Math.min(duration * 0.30, 0.48));
    const firstIdleDuration = relicSequence ? 0.8 : idleDuration;
    const blinkDuration = relicSequence && blink
      ? Math.max(0.12, Math.min(0.3, (Number(character.actions.get(blink)?.getClip?.().duration) || 0.45) / 2.4))
      : 0;
    const secondIdleDuration = relicSequence ? 0.55 : 0;
    const holdEndsAt = now + holdMs + (relicSequence ? freezeAt * 1000 : 0);
    character.__bluefoxStudyPose = {
      action,
      startedAt: now,
      holdEndsAt,
      endsAt: holdEndsAt + (firstIdleDuration + blinkDuration + secondIdleDuration) * 1000,
      breathIdle: relicSequence ? standardIdle : breathIdle,
      idleDuration: firstIdleDuration,
      blink,
      blinkDuration,
      secondIdleDuration,
      relicSequence,
      phase: "hold",
      phaseEndsAt: holdEndsAt,
      idleStarted: false,
      breathStartedAt: 0,
      freezeAt,
      frozen: false,
      tiltNode,
      tiltBase,
      visualScaleBase
    };
    character.actionLockUntil = character.__bluefoxStudyPose.endsAt;
    return (character.__bluefoxStudyPose.endsAt - now) / 1000;
  };

  const updateStudyPose = (character, now) => {
    const pose = character?.__bluefoxStudyPose;
    if (!pose) return;
    // AnimationMixer réécrit les os à chaque frame. Le penché doit donc être
    // réappliqué après mixer.update(), pendant les deux secondes de lecture.
    if (
      !pose.idleStarted &&
      pose.tiltNode?.rotation &&
      pose.tiltBase
    ) {
      pose.tiltNode.rotation.x = pose.tiltBase.x + 0.14;
      pose.tiltNode.rotation.y = pose.tiltBase.y;
      pose.tiltNode.rotation.z = pose.tiltBase.z + (pose.relicSequence ? -0.30 : 0.30);
    }
    if (
      pose.action &&
      !pose.frozen &&
      now - pose.startedAt >= pose.freezeAt * 1000
    ) {
      pose.action.time = pose.freezeAt;
      pose.action.paused = true;
      pose.frozen = true;
    }
    if (!pose.idleStarted && pose.holdEndsAt && now >= pose.holdEndsAt) {
      // L'action Ear reste arrêtée sur la pose penchée : la transition vers
      // Idle la fond sans jamais atteindre les clés de mouvement d'oreille.
      pose.idleStarted = true;
      pose.breathStartedAt = now;
      pose.phase = pose.relicSequence ? "idle-first" : "idle";
      pose.phaseEndsAt = now + pose.idleDuration * 1000;
      if (pose.tiltNode?.rotation && pose.tiltBase) {
        pose.tiltNode.rotation.x = pose.tiltBase.x;
        pose.tiltNode.rotation.y = pose.tiltBase.y;
        pose.tiltNode.rotation.z = pose.tiltBase.z;
      }
      if (pose.breathIdle) character.play(pose.breathIdle, 0.16, true);
    }
    if (pose.relicSequence && pose.phase === "idle-first" && now >= pose.phaseEndsAt) {
      if (pose.blink && pose.blinkDuration > 0) {
        character.play(pose.blink, 0.08, true);
        character.currentAction?.setEffectiveTimeScale?.(2.4);
        pose.phase = "blink";
        pose.phaseEndsAt = now + pose.blinkDuration * 1000;
      } else {
        pose.phase = "blink";
        pose.phaseEndsAt = now;
      }
    }
    if (pose.relicSequence && pose.phase === "blink" && now >= pose.phaseEndsAt) {
      if (pose.breathIdle) character.play(pose.breathIdle, 0.1, true);
      pose.phase = "idle-second";
      pose.phaseEndsAt = now + pose.secondIdleDuration * 1000;
    }
    if (
      pose.idleStarted &&
      pose.idleDuration > 0 &&
      !pose.relicSequence &&
      pose.visualScaleBase &&
      character.visual?.scale
    ) {
      const progress = Math.max(
        0,
        Math.min(1, (now - pose.breathStartedAt) / (pose.idleDuration * 1000))
      );
      const breath = Math.sin(progress * Math.PI);
      character.visual.scale.set(
        pose.visualScaleBase.x * (1 - breath * 0.006),
        pose.visualScaleBase.y * (1 + breath * 0.018),
        pose.visualScaleBase.z * (1 - breath * 0.006)
      );
    }
    if (now < pose.endsAt) return;
    if (pose.action) pose.action.paused = false;
    if (pose.tiltNode?.rotation && pose.tiltBase) {
      pose.tiltNode.rotation.x = pose.tiltBase.x;
      pose.tiltNode.rotation.y = pose.tiltBase.y;
      pose.tiltNode.rotation.z = pose.tiltBase.z;
    }
    if (pose.visualScaleBase && character.visual?.scale) {
      character.visual.scale.set(
        pose.visualScaleBase.x,
        pose.visualScaleBase.y,
        pose.visualScaleBase.z
      );
    }
    character.__bluefoxStudyPose = null;
  };

  const patchWorldEngineInstance = (engine) => {
    if (!engine || engine.__objectM0BridgePatched) return false;
    engine.__objectM0BridgePatched = true;
    const originalTarget = engine.targetInteraction.bind(engine);

    engine.targetInteraction = function targetObjectInteraction(object, retry = false) {
      const resolved = resolveObject(object);
      const source = object.userData.requestedInteractionSource;
      const directive =
        source === "mission" ? null : activeStudyDirective(this, resolved);

      if (directive) {
        object.userData.requestedInteraction = "observe";
        object.userData.requestedInteractionSource = "mission";
        object.userData.missionSubject = directive.subject;
        object.userData.missionNarrativeVerb = directive.narrativeVerb;
        object.userData.missionNodeId = directive.nodeId;
        object.userData.missionId = directive.missionId;
      }

      const requested =
        object.userData.requestedInteractionSource === "mission"
          ? object.userData.requestedInteraction
          : null;
      const mode = validateAction(
        resolved,
        requested || resolveManualAction(resolved),
        object.userData.requestedInteractionSource === "mission"
      );
      if (!resolved.definition || !mode) {
        console.warn("[BlueFox O5.1] Interaction refusée : objet absent ou incomplet dans le CUO.", object);
        this.callbacks.onStatus("BlueFox ne sait pas encore comment interagir avec cet objet.");
        object.userData.requestedInteraction = null;
        object.userData.requestedInteractionSource = null;

        // stale-target-reset-v1
        this.pendingInteraction = null;
        this.interactionStartedAt = 0;
        this.interactionApproachStartedAt = 0;
        this.interactionApproachAttempts = 0;
        this.character.stop?.();
        this.character.setTarget?.(this.character.root.position);
        this.postActionRecoveryUntil = performance.now() + 350;
        return false;
      }
      object.userData.requestedInteraction = mode;
      object.userData.requestedInteractionSource = directive ? "mission" : (source || "manual");
      originalTarget(object, retry);
      const label = resolved.definition.label?.toLowerCase() || "l’objet";
      const narrativeVerb = object.userData.missionNarrativeVerb || mode;
      const approachTexts = {
        collect: `BlueFox s’approche de ${label} pour le prélever.`,
        extract: `BlueFox s’approche de ${label} pour en extraire une ressource.`,
        observe: `BlueFox se place près de ${label} pour l’observer.`,
        inspect: `BlueFox s’approche de ${label} pour l’inspecter.`,
        analyze: `BlueFox s’approche de ${label} pour l’analyser.`
      };
      this.callbacks.onStatus(
        approachTexts[narrativeVerb] ||
        approachTexts[mode] ||
        `BlueFox s’approche de ${label}.`
      );
      return true;
    };

    engine.updateInteraction = function updateObjectInteraction(now) {
      updateStudyPose(this.character, now);
      if (!this.pendingInteraction || !this.pendingInteraction.userData.active) return;
      const object = this.pendingInteraction;
      const resolved = resolveObject(object);
      const { anchor, definition } = resolved;
      if (!definition) {
        console.warn("[BlueFox O5.1] Définition CUO introuvable pendant l’interaction.", object);
        this.pendingInteraction = null;
        this.character.stop();
        return;
      }
      const state = interactionState(resolved);
      const mode = validateAction(
        resolved,
        object.userData.requestedInteraction,
        object.userData.requestedInteractionSource === "mission"
      );
      if (!mode) {
        this.callbacks.onStatus("Cette interaction n’est pas autorisée par le catalogue d’objets.");
        this.pendingInteraction = null;
        this.character.stop();
        return;
      }
      object.userData.requestedInteraction = mode;
      const distance = this.character.root.position.distanceTo(anchor.position);
      const interactionDistance = (object.userData.approachDistance || 1.36) + 0.18;
      if (distance > interactionDistance) {
        if (!this.interactionStartedAt && now - this.interactionApproachStartedAt > 6500) {
          this.interactionApproachAttempts += 1;
          if (this.interactionApproachAttempts <= 3) this.targetInteraction(object, true);
          else {
            this.callbacks.onStatus("BlueFox renonce temporairement à cet objet inaccessible.");
            this.pendingInteraction = null;
            this.interactionApproachStartedAt = 0;
            this.interactionApproachAttempts = 0;
            this.character.stop();
            this.missionManager?.cancelCurrentAction("object-inaccessible");
          }
        }
        return;
      }

      this.character.stop();
      if (!this.interactionStartedAt) {
        this.interactionStartedAt = now;
        this.character.facePoint(anchor.position);
        const acquisition = mode === "collect" || mode === "extract";
        const size = String(definition.size || "S").toUpperCase();
        const isPlant = definition.knowledge?.family === "flora" ||
          definition.resource?.family === "fiber" ||
          /plant|flora|fiber|biomass/i.test(`${definition.type} ${definition.subtype}`);
        const animationHints = acquisition
          ? size === "L" || size === "XL" || definition.knowledge?.family === "mineral"
            ? ["Harvest_Heavy", "Harvest_Medium", "Harvest_Heavy"]
            : size === "M" || isPlant
              ? ["Harvest_Light", "Harvest_Medium", "Harvest_Light"]
              : ["Harvest_Light"]
          : definition.interaction?.animation?.[mode] || [];
        const studyInteraction = !acquisition;
        const duration = studyInteraction
          ? startStudyPose(
              this.character,
              !capabilities(definition).collectable
            )
          : this.character.playInteraction(mode, animationHints);
        this.interactionDuration = Math.max(
          studyInteraction ? 2000 : 2200,
          duration * 1000
        );
        const label = definition.label?.toLowerCase() || "l’objet";
        const actionTexts = {
          collect: `BlueFox collecte ${label}.`,
          extract: `BlueFox extrait une ressource de ${label}.`,
          observe: `BlueFox observe ${label} et mémorise cette information.`,
          inspect: `BlueFox inspecte ${label}.`,
          analyze: `BlueFox analyse ${label}.`
        };
        const narrativeVerb = object.userData.missionNarrativeVerb || mode;
        this.callbacks.onAction(
          actionTexts[narrativeVerb] ||
          actionTexts[mode] ||
          `BlueFox étudie ${label}.`
        );
        return;
      }
      if (now - this.interactionStartedAt < this.interactionDuration) return;

      const detail = {
        kind: definition.resource?.inventoryKey || definition.type || object.userData.kind,
        subject:
          object.userData.missionSubject ||
          definition.knowledge?.family ||
          definition.category ||
          definition.type ||
          object.userData.kind,
        missionNarrativeVerb: object.userData.missionNarrativeVerb || null,
        missionNodeId: object.userData.missionNodeId || null,
        missionId: object.userData.missionId || null,
        mapId: this.currentMapId,
        zoneId: this.currentZoneIndex,
        amount: Math.max(1, Number(object.userData.resourceQuantity || anchor.userData.resourceQuantity || definition.resource?.quantity || 1)),
        quantity: Math.max(1, Number(object.userData.resourceQuantity || anchor.userData.resourceQuantity || definition.resource?.quantity || 1)),
        interactionMode: mode,
        cuoType: definition.type || null,
        interactionSource: object.userData.requestedInteractionSource || "autonomy",
        interactionState: { ...state }
      };
      const autonomousInteraction = detail.interactionSource === "autonomy";

      const acquisition = mode === "collect" || mode === "extract";
      let queueAdaptiveCollection = false;
      if (acquisition) {
        state.collected = true;
        state.collectionCount += 1;
        const removeFromWorld =
          definition.interaction?.removeFromWorld ??
          definition.gameplay?.collectable === true;
        if (removeFromWorld) {
          object.userData.active = false;
          anchor.visible = false;
        }
        const inventoryKey = definition.resource?.inventoryKey || definition.type || object.userData.kind;
        for (let unit = 0; unit < detail.quantity; unit += 1) {
          this.callbacks.onCollect(inventoryKey);
        }
        const eventType = mode === "extract"
          ? BF.ObjectEvents.types.RESOURCE_EXTRACTED
          : BF.ObjectEvents.types.RESOURCE_COLLECTED;
        BF.ObjectEvents.emit(eventType, object, {
          ...detail,
          label: definition.label,
          inventoryKey
        });
        if (removeFromWorld) {
          const respawnSeconds = Number(definition.interaction?.respawnSeconds);
          if (!Number.isFinite(respawnSeconds) || respawnSeconds <= 0) {
            console.error(
              `[BlueFox3D] Métadonnée CUO interaction.respawnSeconds absente ou invalide pour ${definition.id || definition.type}.`
            );
            return;
          }
          const respawnMs = respawnSeconds * 1000;
          const cooldown = setTimeout(() => {
            if (this.disposed) return;
            anchor.visible = true;
            object.userData.active = true;
            state.collected = false;
            object.userData.requestedInteraction = null;
            object.userData.requestedInteractionSource = null;
            this.resourceCooldowns.delete(object);
          }, respawnMs);
          this.resourceCooldowns.set(object, cooldown);
        }
      } else {
        state.identified = true;
        if (mode === "observe") {
          state.observed = true;
          state.observationCount += 1;
        }
        if (mode === "inspect") {
          state.inspected = true;
          state.inspectionCount += 1;
        }
        if (mode === "analyze") {
          state.analyzed = true;
          state.analysisCount += 1;
        }
        const eventType = {
          observe: BF.ObjectEvents.types.PHENOMENON_OBSERVED,
          inspect: BF.ObjectEvents.types.OBJECT_INSPECTED,
          analyze: BF.ObjectEvents.types.OBJECT_ANALYZED
        }[mode];
        BF.ObjectEvents.emit(eventType, object, {
          ...detail,
          label: definition.label,
          interactionState: { ...state }
        });
        // Une plante adaptative étudiée reste une ressource. Si aucune mission
        // ne réclame immédiatement une nouvelle étude, sa collecte devient la
        // prochaine action autonome prioritaire au lieu d'être perdue dans le
        // tirage général des comportements.
        queueAdaptiveCollection =
          definition.type === "adaptive_plant" &&
          capabilities(definition).collectable &&
          !activeStudyDirective(this, resolved);
        object.userData.lastInspectedAt = Date.now();
        object.userData.requestedInteraction = null;
        object.userData.requestedInteractionSource = null;
      }

      if (this.character.__bluefoxStudyPose?.action) {
        this.character.__bluefoxStudyPose.action.paused = false;
      }
      this.character.__bluefoxStudyPose = null;
      this.character.cancelInteraction();
      object.userData.lastInteractionAt = now;
      if (autonomousInteraction) {
        object.userData.lastAutonomousInteractionAt = now;
        object.userData.autonomousInteractionCount =
          (Number(object.userData.autonomousInteractionCount) || 0) + 1;
        this.autonomyActionStreak = (Number(this.autonomyActionStreak) || 0) + 1;
      } else if (detail.interactionSource === "manual") {
        this.autonomyActionStreak = 0;
      }
      this.completedInteractions += 1;
      this.lastCompletedAction = `${mode}:${definition.type}`;
      this.pendingInteraction = null;
      this.interactionStartedAt = 0;
      this.interactionApproachStartedAt = 0;
      this.interactionApproachAttempts = 0;
      this.character.currentAnimation = "";
      this.postActionRecoveryUntil = now + 650;
      this.lastActivityAt = now;
      this.lastAutonomyAt = now - 5600;
      object.userData.requestedMovementMode = null;
      object.userData.requestedInteraction = null;
      object.userData.requestedInteractionSource = null;
      object.userData.missionSubject = null;
      object.userData.missionNarrativeVerb = null;
      object.userData.missionNodeId = null;
      object.userData.missionId = null;
      if (queueAdaptiveCollection) {
        global.setTimeout(() => {
          if (
            this.disposed ||
            !object.userData.active ||
            this.pendingInteraction ||
            this.pendingGate ||
            this.pendingZoneExploration ||
            this.currentRoutine ||
            this.missionManager?.currentAction ||
            activeStudyDirective(this, resolveObject(object))
          ) return;
          object.userData.requestedInteraction =
            definition.interaction?.acquisitionAction || "collect";
          object.userData.requestedInteractionSource = "autonomy";
          this.targetInteraction(object);
        }, 720);
      }
    };

    installed.world = true;
    return true;
  };

  const installWorldBridge = () => {
    if (installed.world || !BF.ObjectEvents || typeof BF.mount !== "function") return false;
    if (BF.mount.__objectM0Wrapped) return false;
    const originalMount = BF.mount;
    const wrappedMount = async function mountWithObjectBridge(options) {
      const engine = await originalMount.call(this, options);
      patchWorldEngineInstance(engine);
      return engine;
    };
    wrappedMount.__objectM0Wrapped = true;
    BF.mount = wrappedMount;
    return true;
  };

  const install = () => {
    installMissionBridge();
    installActionBridge();
    installWorldBridge();
    return { ...installed };
  };

  BF.resolveObjectInteraction = (object) => {
    const resolved = resolveObject(object);
    return {
      definitionId: resolved.definition?.id || null,
      type: resolved.definition?.type || null,
      label: resolved.definition?.label || null,
      action: resolveManualAction(resolved),
      capabilities: capabilities(resolved.definition),
      state: resolved.definition ? { ...interactionState(resolved) } : null
    };
  };
  BF.installObjectM0Bridge = install;
  BF.getObjectM0BridgeState = () => ({ ...installed });
  install();
})(window);
