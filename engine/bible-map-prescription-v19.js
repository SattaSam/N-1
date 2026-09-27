(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};

  const catalog = () =>
    Array.isArray(BF.BibleCatalog)
      ? BF.BibleCatalog
      : Object.values(BF.BibleCatalog || {});

  const missionById = (missionId) =>
    catalog().find((mission) => mission?.id === missionId) || null;

  const missionStatus = (engine, missionId) =>
    engine?.missionManager?.memory?.state?.missionLifecycle?.[missionId]?.status || null;

  const activeEventDrivenTravelNode = (engine, mission) => {
    if (!mission?.id) return null;
    const tree = engine?.missionManager?.trees?.get?.(mission.id);
    return tree?.availableLeaves?.().find((node) =>
      !node.isComplete &&
      node.params?.eventDriven === true &&
      BF.Missions?.normalizeActionType?.(node.type) === BF.Missions?.ActionType?.TRAVEL
    ) || null;
  };

  const POST_TRAVEL_DISCOVERY_MISSIONS = new Set([
    "EXP-LONG-02",
    "EXP-LONG-04"
  ]);

  // Relais directionnels structurants : ils restent dormants jusqu'au vrai
  // exploration.map_discovered. Cette whitelist ne concerne ni les OPP ni
  // les missions opportunistes ; elle ne change jamais leur lifecycle.
  const DORMANT_STRUCTURAL_TRAVEL_MISSIONS = new Set([
    "GEO-01",
    "GEO-02",
    "GEO-03",
    "GEO-05",
    "GAME-research_initial",
    "GAME-research_hypothesis",
    "GAME-special_investigator"
  ]);
  const DORMANT_TRAVEL_HANDOFF_FACT = "bibleDormantTravelHandoff:v1";

  const pendingPostTravelDiscovery = (engine, mission) => {
    if (!POST_TRAVEL_DISCOVERY_MISSIONS.has(String(mission?.id || ""))) {
      return null;
    }
    const tree = engine?.missionManager?.trees?.get?.(mission.id);
    if (!tree || tree.root?.isComplete) return null;

    const waitingNode = tree.availableLeaves?.().find((node) =>
      !node.isComplete &&
      node.params?.eventDriven === true &&
      node.params?.catalogManaged === true &&
      BF.Missions?.normalizeActionType?.(node.type) !== BF.Missions?.ActionType?.TRAVEL
    ) || null;
    if (!waitingNode) return null;

    let completedTravelNode = null;
    tree.root?.walk?.((node) => {
      if (completedTravelNode || !node?.isComplete) return;
      if (node.params?.eventDriven !== true) return;
      if (BF.Missions?.normalizeActionType?.(node.type) !== BF.Missions?.ActionType?.TRAVEL) return;
      completedTravelNode = node;
    });
    if (!completedTravelNode) return null;
    return { waitingNode, travelNode: completedTravelNode };
  };

  const parsedMissionEvidence = (node) =>
    (node?.historyValues || []).map((value) => {
      try {
        const parsed = JSON.parse(value);
        return parsed?.owner === "object-m0" ? parsed.evidence || null : null;
      } catch {
        return null;
      }
    }).filter(Boolean);

  const resolveRequiredObjects = (engine, mission, prescription) => {
    const required = Array.isArray(prescription?.requiredObjects)
      ? prescription.requiredObjects
      : [];
    if (!required.length) return { requiredObjects: [], unresolved: false };

    const tree = engine?.missionManager?.trees?.get?.(mission.id);
    const resolved = [];
    let unresolved = false;

    required.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      if (entry.objectId || entry.type) {
        resolved.push(JSON.parse(JSON.stringify(entry)));
        return;
      }

      const sourceSlot = String(entry.sourceSlot || "").trim();
      const identityField = String(entry.identityField || "objectId").trim();
      const sourceNode = sourceSlot
        ? tree?.find?.(`${tree.id}:${sourceSlot}`)
        : null;
      const evidence = parsedMissionEvidence(sourceNode)
        .slice()
        .reverse()
        .find((candidate) => candidate?.[identityField] != null);
      const identity = evidence?.[identityField];

      if (identity == null || identity === "") {
        unresolved = true;
        return;
      }

      const concrete = {
        ...JSON.parse(JSON.stringify(entry)),
        [identityField]: identity
      };
      if (identityField === "objectId") {
        const normalizedId = String(identity).toLowerCase();
        const definition =
          BF.ObjectLibrary?.getById?.(identity) ||
          BF.ObjectLibrary?.list?.({ status: "active" })?.find?.((candidate) =>
            String(candidate?.id || "").toLowerCase() === normalizedId
          ) ||
          null;
        if (!definition?.id || !definition?.type) {
          unresolved = true;
          return;
        }
        concrete.objectId = definition.id;
        concrete.type = definition.type;
      } else if (identityField === "cuoType") {
        const definition = BF.ObjectLibrary?.get?.(String(identity));
        if (!definition?.type) {
          unresolved = true;
          return;
        }
        concrete.type = definition.type;
        concrete.objectId = definition.id || null;
      }
      delete concrete.sourceSlot;
      delete concrete.identityField;
      resolved.push(concrete);
    });

    return { requiredObjects: resolved, unresolved };
  };

  const resolveMissionMapGeneration = (engine, mission) => {
    if (!mission?.id) return null;
    const travelNode = activeEventDrivenTravelNode(engine, mission);
    const nextCount = Math.max(0, Number(travelNode?.progress) || 0) + 1;
    const staged = travelNode?.params?.mapGenerationOnCount?.[nextCount] ||
      travelNode?.params?.mapGenerationOnCount?.[String(nextCount)] ||
      null;
    const prescription = staged || mission?.mapGeneration || null;
    if (!prescription || typeof prescription !== "object") return null;

    const resolved = JSON.parse(JSON.stringify(prescription));
    if (Array.isArray(prescription.requiredObjects)) {
      const dynamicObjects = resolveRequiredObjects(engine, mission, prescription);
      resolved.requiredObjects = dynamicObjects.requiredObjects;
      resolved.unresolvedRequiredObjects = dynamicObjects.unresolved;
    }
    return resolved;
  };

  const activeMapGenerationPrescription = () => {
    const engine = BF.currentEngine;
    const manager = engine?.missionManager;
    const missionId = String(
      manager?.primaryMissionId ||
      manager?.activeMissionId ||
      ""
    );
    if (!missionId || missionStatus(engine, missionId) !== "active") return null;

    const mission = missionById(missionId);
    const prescription = resolveMissionMapGeneration(engine, mission);
    if (!prescription) return null;

    return {
      missionId: mission.id,
      ...JSON.parse(JSON.stringify(prescription))
    };
  };

  // API générique du propriétaire "Prescription Bible des maps".
  // Le générateur ne connaît aucune mission particulière : il demande seulement
  // si la mission primaire active porte une prescription de génération.
  BF.resolveBibleMapGenerationPrescription = activeMapGenerationPrescription;

  if (BF.mount?.__bibleMapPrescriptionV21) return;

  const originalMount = BF.mount;
  if (typeof originalMount !== "function") return;

  const controlledNavigationMissions = () =>
    catalog().filter((mission) => mission?.navigation?.controlsUnknownTravel === true);

  const activeControlledNavigationMission = (engine) =>
    controlledNavigationMissions().find((mission) =>
      missionStatus(engine, mission.id) === "active"
    ) || null;

  const prerequisitesSatisfied = (engine, mission) => {
    const runtime = BF.bibleRuntime;
    if (typeof runtime?.prerequisitesSatisfied === "function") {
      return runtime.prerequisitesSatisfied(mission) === true;
    }
    return (mission?.prerequisites || []).every((missionId) =>
      missionStatus(engine, missionId) === "completed"
    );
  };

  const foundationTutorialAllows = (mission) => {
    const runtime = BF.bibleRuntime;
    if (typeof runtime?.foundationTutorialAllows === "function") {
      return runtime.foundationTutorialAllows(mission) === true;
    }
    return missionStatus(BF.currentEngine, "T13") === "completed" ||
      /^T(?:0[1-9]|1[0-3])$/.test(String(mission?.id || ""));
  };

  const foundationTutorialUnlocked = () =>
    BF.bibleRuntime?.foundationTutorialUnlocked?.() === true ||
    missionStatus(BF.currentEngine, "T13") === "completed";

  const dormantMapDiscoveryPrescriptionMission = (engine, direction) => {
    // Une prescription dormante ne doit jamais contourner le verrou canonique
    // du voyage inconnu. Elle ne prépare une destination missionnelle qu'une
    // fois la progression réellement autorisée à quitter le territoire connu.
    if (!unknownTravelUnlocked(engine)) return null;
    return catalog()
      .filter((mission) => {
        if (!mission?.id || !mission?.mapGeneration) return false;
        if (!foundationTutorialAllows(mission)) return false;
        if (missionStatus(engine, mission.id) != null) return false;
        if (mission?.trigger?.type !== "exploration.map_discovered") return false;
        if (
          mission.trigger.direction != null &&
          String(mission.trigger.direction) !== String(direction)
        ) return false;
        return prerequisitesSatisfied(engine, mission);
      })
      .sort((left, right) =>
        (Number(right.priority) || 0) - (Number(left.priority) || 0) ||
        catalog().indexOf(left) - catalog().indexOf(right)
      )[0] || null;
  };

  const unknownTravelUnlocked = (engine) => {
    const controlled = controlledNavigationMissions();
    if (!controlled.length) return true;
    return controlled.some((mission) =>
      ["active", "completed"].includes(missionStatus(engine, mission.id))
    );
  };

  const dormantStructuralTravelMission = (engine) => {
    if (!unknownTravelUnlocked(engine)) return null;
    return catalog()
      .filter((mission) => {
        if (!DORMANT_STRUCTURAL_TRAVEL_MISSIONS.has(String(mission?.id || ""))) return false;
        if (!foundationTutorialAllows(mission)) return false;
        if (missionStatus(engine, mission.id) != null) return false;
        if (mission?.trigger?.type !== "exploration.map_discovered") return false;
        const direction = String(mission.trigger.direction || "").toLowerCase();
        if (!["north", "south", "east", "west"].includes(direction)) return false;
        return prerequisitesSatisfied(engine, mission);
      })
      .sort((left, right) =>
        (Number(right.priority) || 0) - (Number(left.priority) || 0) ||
        catalog().indexOf(left) - catalog().indexOf(right)
      )[0] || null;
  };

  const dormantTravelHandoff = (engine) =>
    engine?.missionManager?.memory?.getFact?.(DORMANT_TRAVEL_HANDOFF_FACT, null) || null;

  const saveDormantTravelHandoff = (engine, value) => {
    const memory = engine?.missionManager?.memory;
    if (!memory?.setFact) return false;
    memory.setFact(DORMANT_TRAVEL_HANDOFF_FACT, value || null);
    memory.save?.();
    return true;
  };

  const issueDormantNavigation = (engine, detail) => {
    if (!detail || typeof engine?.handleNavigationSuggestion !== "function") return false;
    engine.handleNavigationSuggestion(detail);
    return true;
  };

  const dormantTravelCanRun = (engine) => {
    if (String(BF.getAutonomyMode?.() || "").toLowerCase() !== "full") return false;
    if (!unknownTravelUnlocked(engine)) return false;
    if (engine?.persistentNavigationIntent) return false;
    if (engine?.missionManager?.hasMissionExecutionAuthority?.() === true) return false;
    return true;
  };

  const continueDormantStructuralTravel = (engine, handoff) => {
    if (!handoff?.missionId || !dormantTravelCanRun(engine)) return false;
    const mission = missionById(handoff.missionId);
    const status = missionStatus(engine, handoff.missionId);
    if (!mission || status != null || !prerequisitesSatisfied(engine, mission)) {
      saveDormantTravelHandoff(engine, null);
      return false;
    }

    const direction = String(handoff.direction || mission.trigger?.direction || "").toLowerCase();
    const currentMapId = String(engine.currentMapId || "");
    const exit = BF.maps?.[currentMapId]?.exits?.[direction] || null;
    const targetMapId = String(exit?.targetMap || "");
    const discovered = engine.discoveredMaps instanceof Set
      ? engine.discoveredMaps
      : new Set([currentMapId]);
    const visited = new Set(Array.isArray(handoff.visitedMapIds) ? handoff.visitedMapIds : []);
    visited.add(currentMapId);

    if (targetMapId) {
      // Ne jamais consommer une destination pré-générée mais encore inconnue :
      // son contenu n'a pas forcément reçu la prescription de cette mission.
      if (!discovered.has(targetMapId) || visited.has(targetMapId)) return false;
      saveDormantTravelHandoff(engine, {
        ...handoff,
        phase: "route",
        nextMapId: targetMapId,
        visitedMapIds: [...visited],
        updatedAt: Date.now()
      });
      return issueDormantNavigation(engine, {
        mapId: targetMapId,
        direction,
        discoverUnknown: false,
        source: "bible-dormant",
        missionId: mission.id,
        allowTeleportOptimization: false
      });
    }

    saveDormantTravelHandoff(engine, {
      ...handoff,
      phase: "generate",
      generationFromMapId: currentMapId,
      visitedMapIds: [...visited],
      updatedAt: Date.now()
    });
    return issueDormantNavigation(engine, {
      mapId: null,
      direction,
      discoverUnknown: true,
      source: "bible-dormant",
      missionId: mission.id,
      allowTeleportOptimization: false
    });
  };

  const requestDormantStructuralTravel = (engine) => {
    if (!dormantTravelCanRun(engine)) return false;
    if (dormantTravelHandoff(engine)?.missionId) return false;
    const mission = dormantStructuralTravelMission(engine);
    if (!mission) return false;
    const handoff = {
      missionId: mission.id,
      phase: "seek-frontier",
      direction: String(mission.trigger.direction || "").toLowerCase(),
      startedFromMapId: engine.currentMapId,
      visitedMapIds: [],
      requestedAt: Date.now()
    };
    saveDormantTravelHandoff(engine, handoff);
    return continueDormantStructuralTravel(engine, handoff);
  };

  const resumeDormantStructuralTravel = (engine) => {
    const handoff = dormantTravelHandoff(engine);
    if (!handoff?.missionId || handoff.phase === "await-activation") return false;
    return continueDormantStructuralTravel(engine, handoff);
  };

  const resolveNavigationSuggestionPrescription = (engine, detail = {}) => {
    const targetMapId = String(detail?.mapId || "");
    if (targetMapId !== "crystal") return null;

    const mission = catalog().find((entry) => {
      if (missionStatus(engine, entry?.id) !== "active") return false;
      if (entry?.pattern !== "TRAVEL_CYCLE") return false;
      if (String(entry?.slots?.travel?.params?.toMapId || "") !== targetMapId) {
        return false;
      }
      const gate = entry?.completionGate;
      return gate?.type === "proximity.shelter" &&
        String(gate?.mapId || "") === targetMapId;
    });

    return mission
      ? { action: "return-base", missionId: mission.id, mapId: targetMapId }
      : null;
  };

  BF.resolveBibleNavigationSuggestion = resolveNavigationSuggestionPrescription;

  const matchesTarget = (object, target = {}) => {
    if (!object?.userData?.active) return false;
    const definition =
      object.userData.functional ||
      BF.ObjectLibrary?.getById?.(object.userData.catalogId) ||
      BF.ObjectLibrary?.get?.(object.userData.libraryType) ||
      null;
    if (!definition) return false;
    if (target.objectId != null && String(definition.id) !== String(target.objectId)) {
      return false;
    }
    if (target.cuoType != null && String(definition.type) !== String(target.cuoType)) {
      return false;
    }
    return true;
  };

  const ensureMissionMicroScenes = (mapId, mission) => {
    const definition = BF.maps?.[mapId];
    const required = mission?.mapGeneration?.requiredMicroScenes;
    if (!definition || !Array.isArray(required) || !required.length) return false;

    const existing = Array.isArray(definition.missionMicroScenes)
      ? definition.missionMicroScenes.slice()
      : [];
    let changed = false;

    required.forEach((scene) => {
      if (!scene?.id || scene.persistent === true) return;
      const recordId = `${mission.id}:${scene.id}`;
      if (existing.some((record) => record?.id === recordId)) return;
      existing.push({
        id: recordId,
        missionId: mission.id,
        microSceneId: scene.id,
        anchor: { x: 0, y: 0, z: 0 },
        rotation: 0,
        persistent: scene.persistent === true,
        spawnOnce: scene.spawnOnce !== false
      });
      changed = true;
    });

    if (changed) definition.missionMicroScenes = existing;
    return changed || existing.some((record) => record?.missionId === mission.id);
  };

  const bindGeneratedMissionTarget = (engine, mission) => {
    const target = mission?.navigation?.target;
    const manager = engine?.missionManager;
    if (!target || !manager?.memory || !engine?.currentMap?.interactables) return false;

    const object = engine.currentMap.interactables.find((candidate) =>
      candidate?.userData?.bibleMissionId === mission.id &&
      matchesTarget(candidate, target)
    );
    if (!object) return false;

    const definition =
      object.userData.functional ||
      BF.ObjectLibrary?.getById?.(object.userData.catalogId) ||
      BF.ObjectLibrary?.get?.(object.userData.libraryType) ||
      null;
    const instanceId =
      object.userData.instanceId ||
      object.userData.worldAnchor?.userData?.instanceId ||
      null;
    if (!instanceId || !definition) return false;

    manager.memory.setFact?.(`bibleTarget:${mission.id}`, {
      binding: target.binding || "instance",
      instanceId: target.binding === "instance" ? instanceId : null,
      objectId: target.binding === "instance"
        ? (definition.id || target.objectId || null)
        : (target.objectId || null),
      cuoType: target.cuoType || definition.type || null,
      missionSceneMissionId:
        target.binding === "type-or-mission-scene" ? mission.id : null,
      mapId: engine.currentMapId
    });
    manager.memory.setFact?.(`tutorialExcursion:${mission.id}`, {
      arrived: true,
      mapId: engine.currentMapId,
      boundInstanceId: instanceId,
      updatedAt: Date.now()
    });

    if (mission.navigation?.makePrimaryOnArrival === true) {
      const lifecycle = manager.ensureLifecycle?.(mission.id);
      if (lifecycle) lifecycle.autoPrimaryEligible = true;
      manager.setPrimaryMission?.(
        mission.id,
        false,
        "Première initiative semi-autonome sur la scène de reconnaissance."
      );
    }
    manager.memory.save?.();
    manager.publish?.();
    return true;
  };

  const applyTutorialAutonomy = (mode) => {
    const normalized = String(mode || "").toLowerCase();
    if (!["off", "semi", "full"].includes(normalized)) return false;
    if (normalized !== "off") BF.unlockAutonomyMode?.(normalized);
    return BF.setAutonomyMode?.(normalized, { source: "tutorial" }) !== false;
  };

  const unlockCompletedMissionAutonomy = (state) => {
    (state?.missions || []).forEach((entry) => {
      if (entry.lifecycleStatus !== "completed") return;
      const mission = missionById(entry.missionId);
      const unlock = mission?.tutorialAutonomy?.unlockOnComplete;
      if (!unlock) return;
      BF.unlockAutonomyMode?.(unlock);
    });
  };

  const unknownDirectionsFrom = (engine) => {
    const definition = BF.maps?.[engine?.currentMapId];
    if (!definition) return [];
    return ["north", "south", "east", "west"].filter((direction) => {
      if (definition.exits?.[direction]?.targetMap) return false;
      const topologyTarget = engine.worldTopology?.targetFrom?.(
        engine.currentMapId,
        direction
      );
      return !topologyTarget?.mapId;
    });
  };

  const requestAutonomousUnknownTravel = async (engine, mission) => {
    if (mission?.navigation?.autonomousUnknownTravel !== true) return false;
    if (missionStatus(engine, mission.id) !== "active") return false;
    if (engine?.missionManager?.primaryMissionId !== mission.id) return false;
    if (String(BF.getAutonomyMode?.() || "").toLowerCase() !== "full") {
      return false;
    }
    if (
      engine.transitioning ||
      engine.pendingGate ||
      engine.pendingInteraction ||
      engine.currentRoutine ||
      engine.missionManager?.currentAction
    ) return false;

    const memory = engine.missionManager?.memory;
    const key = `tutorialExcursion:${mission.id}`;
    const previous = memory?.getFact?.(key, {}) || {};
    const repeatUntilComplete =
      mission?.navigation?.repeatUnknownTravelUntilComplete === true;
    const activeTravelNode = activeEventDrivenTravelNode(engine, mission);
    const postTravelDiscovery = pendingPostTravelDiscovery(engine, mission);
    const travelNode = activeTravelNode || postTravelDiscovery?.travelNode || null;

    if (previous.requesting === true) return false;
    if (!travelNode) return false;
    if (travelNode.isComplete && !postTravelDiscovery) return false;
    if (postTravelDiscovery) {
      // Une seule génération supplémentaire par map tant que l'événement
      // remarquable terminal n'a pas été réellement observé.
      if (String(previous.postTravelRequestedFromMapId || "") === String(engine.currentMapId || "")) {
        return false;
      }
    } else if (repeatUntilComplete) {
      const progress = Math.max(0, Number(travelNode.progress) || 0);
      const requestedProgress = Math.max(
        0,
        Number(previous.requestedProgress) || 0
      );
      // Une génération déjà demandée doit produire une vraie transition et
      // créditer la feuille TRAVEL avant qu'une seconde demande soit possible.
      if (requestedProgress > progress) return false;
    } else if (
      (previous.generatedTargetMapId || previous.arrived === true) &&
      String(previous.travelNodeId || travelNode?.id || "") ===
        String(travelNode?.id || "")
    ) {
      return false;
    }

    const directions = unknownDirectionsFrom(engine);
    if (!directions.length) return false;
    const preferredDirection = String(travelNode?.params?.direction || "")
      .trim()
      .toLowerCase();
    const direction = directions.includes(preferredDirection)
      ? preferredDirection
      : (directions[
          Math.floor(Math.random() * directions.length)
        ] || directions[0]);

    memory?.setFact?.(key, {
      ...previous,
      direction,
      fromMapId: engine.currentMapId,
      travelNodeId: String(travelNode?.id || ""),
      requesting: true,
      requestedProgress: postTravelDiscovery
        ? previous.requestedProgress
        : repeatUntilComplete
          ? (Math.max(0, Number(travelNode?.progress) || 0) + 1)
          : previous.requestedProgress,
      postTravelRequestedFromMapId: postTravelDiscovery
        ? engine.currentMapId
        : previous.postTravelRequestedFromMapId,
      requestedAt: Date.now()
    });
    memory?.save?.();

    try {
      const result = await engine.generateUnknownPassage?.(direction, {
        bibleMissionId: mission.id,
        source: "autonomy"
      });
      if (result === false) {
        const current = memory?.getFact?.(key, {}) || {};
        memory?.setFact?.(key, {
          ...current,
          requesting: false,
          postTravelRequestedFromMapId: postTravelDiscovery
            ? null
            : current.postTravelRequestedFromMapId
        });
        memory?.save?.();
        return false;
      }
      return true;
    } catch (error) {
      const current = memory?.getFact?.(key, {}) || {};
      memory?.setFact?.(key, {
        ...current,
        requesting: false,
        postTravelRequestedFromMapId: postTravelDiscovery
          ? null
          : current.postTravelRequestedFromMapId
      });
      memory?.save?.();
      console.warn("[BlueFox] Voyage autonome Bible différé.", error);
      return false;
    }
  };

  const acknowledgeMissionAutonomy = (engine, detail = {}) => {
    const mission = missionById(detail.missionId);
    if (missionStatus(engine, mission?.id) !== "active") return false;
    if (mission?.tutorialAutonomy?.autonomousEligibleOnAcknowledge !== true) {
      return false;
    }

    const manager = engine?.missionManager;
    const lifecycle = manager?.ensureLifecycle?.(mission.id);
    if (!lifecycle) return false;
    lifecycle.autoPrimaryEligible = true;
    lifecycle.updatedAt = Date.now();
    manager.memory?.save?.();
    manager.selectBestPrimary?.(performance.now(), true);
    manager.publish?.();
    return true;
  };

  const wrapped = async function mountBibleMapPrescriptionV21(options) {
    const engine = await originalMount.call(this, options);
    const originalGenerateUnknownPassage =
      engine.generateUnknownPassage?.bind(engine);

    if (originalGenerateUnknownPassage) {
      engine.generateUnknownPassage =
        async function generateUnknownPassageWithBiblePrescription(direction, meta = {}) {
          const explicitMission = meta?.bibleMissionId
            ? missionById(meta.bibleMissionId)
            : null;
          const activeMission = activeControlledNavigationMission(engine);
          const dormantMission =
            !explicitMission && !activeMission
              ? dormantMapDiscoveryPrescriptionMission(engine, direction)
              : null;
          const mission = explicitMission || activeMission || dormantMission;

          if (!mission && !unknownTravelUnlocked(engine)) {
            engine.clearPersistentNavigationIntent?.();
            engine.callbacks?.onStatus?.(
              "BlueFox n’est pas encore prêt à quitter le territoire connu."
            );
            return false;
          }

          if (!mission) {
            BF.__pendingBibleMapGenerationContext = {
              intent: "free-exploration",
              missionId: null,
              opportunisticEncounterEligible: foundationTutorialUnlocked(),
              longMissionTransit: false
            };
            try {
              return await originalGenerateUnknownPassage(direction);
            } finally {
              BF.__pendingBibleMapGenerationContext = null;
            }
          }

          const postTravelDiscovery = pendingPostTravelDiscovery(engine, mission);
          const prescription = postTravelDiscovery
            ? null
            : resolveMissionMapGeneration(engine, mission);
          const travelNode = activeEventDrivenTravelNode(engine, mission) ||
            postTravelDiscovery?.travelNode ||
            null;
          const remainingTravel = travelNode
            ? Math.max(0, Number(travelNode.target) - Number(travelNode.progress || 0))
            : 0;
          const longMissionTransit = Boolean(
            foundationTutorialUnlocked() && (
              postTravelDiscovery ||
              (!prescription && travelNode && remainingTravel > 3)
            )
          );
          // Tolérance légère : une étape intermédiaire réellement libre d'un
          // trajet plus court peut recevoir une opportunité au taux normal du
          // générateur (0,25), sans être reclassée en "long transit" (0,65).
          const shortTransitOpportunity = Boolean(
            foundationTutorialUnlocked() &&
            !postTravelDiscovery &&
            !prescription &&
            travelNode &&
            remainingTravel > 1 &&
            remainingTravel <= 3
          );
          const generationContext = {
            intent: prescription
              ? "mission-destination"
              : longMissionTransit
                ? "mission-transit"
                : "mission-directed",
            missionId: mission.id,
            opportunisticEncounterEligible:
              longMissionTransit || shortTransitOpportunity,
            longMissionTransit,
            remainingTravel
          };
          if (prescription?.unresolvedRequiredObjects === true) {
            engine.callbacks?.onStatus?.(
              "Le contenu requis par la mission doit être identifié avant de générer la prochaine zone."
            );
            return false;
          }

          const manager = engine.missionManager;
          const excursionKey = `tutorialExcursion:${mission.id}`;
          const previousExcursion =
            manager?.memory?.getFact?.(excursionKey, {}) || {};
          manager?.memory?.setFact?.(excursionKey, {
            ...previousExcursion,
            fromMapId: engine.currentMapId,
            direction,
            confirmedAt: Date.now()
          });
          manager?.memory?.save?.();

          if (prescription) {
            BF.__pendingBibleMapGeneration = {
              missionId: mission.id,
              ...JSON.parse(JSON.stringify(prescription))
            };
          }

          BF.__pendingBibleMapGenerationContext = generationContext;
          try {
            const result = await originalGenerateUnknownPassage(direction);
            const destinationMapId = BF.maps?.[engine.currentMapId]?.exits?.[direction]?.targetMap || null;
            const excursion = manager?.memory?.getFact?.(excursionKey, {}) || {};
            manager?.memory?.setFact?.(excursionKey, {
              ...excursion,
              requesting: false,
              generatedTargetMapId: destinationMapId || excursion.generatedTargetMapId || null,
              generatedAt: destinationMapId ? Date.now() : excursion.generatedAt || 0
            });
            manager?.memory?.save?.();
            if (destinationMapId) {
              ensureMissionMicroScenes(destinationMapId, mission);
              const target = mission.navigation?.target;
              if (target?.cuoType) {
                manager?.memory?.setFact?.(`bibleTarget:${mission.id}`, {
                  binding: target.binding || "type",
                  instanceId: null,
                  objectId: target.objectId || null,
                  cuoType: target.cuoType || null,
                  missionSceneMissionId: mission.id,
                  mapId: destinationMapId
                });
                manager?.memory?.save?.();
              }
            }
            return result;
          } finally {
            BF.__pendingBibleMapGeneration = null;
            BF.__pendingBibleMapGenerationContext = null;
          }
        };
    }

    const onMapTransition = (event) => {
      const detail = event?.detail || {};
      const handoff = dormantTravelHandoff(engine);
      if (handoff?.missionId) {
        const toMapId = String(detail.toMapId || detail.mapId || engine.currentMapId || "");
        const fromMapId = String(detail.fromMapId || "");
        if (handoff.phase === "generate") {
          if (
            detail.isNew === true &&
            String(detail.direction || "") === String(handoff.direction || "") &&
            (!handoff.generationFromMapId || fromMapId === String(handoff.generationFromMapId))
          ) {
            saveDormantTravelHandoff(engine, {
              ...handoff,
              phase: "await-activation",
              arrivedMapId: toMapId,
              updatedAt: Date.now()
            });
          } else {
            saveDormantTravelHandoff(engine, null);
          }
        } else if (handoff.phase === "route") {
          if (toMapId === String(handoff.nextMapId || "")) {
            resumeDormantStructuralTravel(engine);
          } else {
            // Une navigation différente a pris la main (joueur ou autre owner).
            // Abandonner ce handoff évite de reprendre l'initiative derrière lui.
            saveDormantTravelHandoff(engine, null);
          }
        }
      }

      const activeMission = activeControlledNavigationMission(engine);
      if (!activeMission) return;

      if (activeMission.navigation?.singleUnknownTransition === true) {
        // La suggestion T07 est consommée au premier passage : aucune
        // propagation de la direction sur les maps suivantes.
        engine.clearPersistentNavigationIntent?.();
        engine.navigationRoute = [];
      }

      const arrivalTarget = activeMission.navigation?.target;
      if (arrivalTarget?.cuoType || arrivalTarget?.binding === "type-or-mission-scene") {
        engine.missionManager?.memory?.setFact?.(
          `bibleTarget:${activeMission.id}`,
          {
            binding: arrivalTarget.binding || "type",
            instanceId: null,
            objectId: arrivalTarget.objectId || null,
            cuoType: arrivalTarget.cuoType || null,
            missionSceneMissionId: activeMission.id,
            mapId: detail.toMapId || detail.mapId || engine.currentMapId
          }
        );
        engine.missionManager?.memory?.save?.();
      }

      // T07 : à l'arrivée seulement, rendre la mission prioritaire puis
      // rétablir l'autonomie semi. Le planner existant reste propriétaire
      // du choix de la cible et du trajet jusqu'à la MSC.
      if (activeMission.navigation?.makePrimaryOnArrival === true) {
        const manager = engine.missionManager;
        const lifecycle = manager?.ensureLifecycle?.(activeMission.id);
        if (lifecycle) lifecycle.autoPrimaryEligible = true;
        manager?.setPrimaryMission?.(
          activeMission.id,
          false,
          "Première initiative semi-autonome sur la scène de reconnaissance."
        );
        const arrivalMode = activeMission.navigation?.autonomyModeOnArrival;
        if (arrivalMode) applyTutorialAutonomy(arrivalMode);
        manager?.memory?.save?.();
        manager?.publish?.();
      }

      const bound = bindGeneratedMissionTarget(engine, activeMission);
      if (!bound) {
        engine.callbacks?.onStatus?.(
          "BlueFox a atteint la nouvelle zone et cherche la scène de reconnaissance."
        );
        return;
      }

      const memory = engine.missionManager?.memory;
      const previous = memory?.getFact?.(`tutorialExcursion:${activeMission.id}`, {}) || {};
      memory?.setFact?.(`tutorialExcursion:${activeMission.id}`, {
        ...previous,
        direction: previous.direction || detail.direction || null,
        fromMapId: previous.fromMapId || detail.fromMapId || null,
        toMapId: detail.toMapId || detail.mapId || engine.currentMapId,
        arrived: true,
        updatedAt: Date.now()
      });
      memory?.save?.();
    };

    const onMissionState = (event) => {
      const state = event?.detail || BF.getMissionState?.() || {};
      const manager = BF.currentEngine?.missionManager;
      (state?.missions || []).forEach((entry) => {
        if (entry.lifecycleStatus !== "active") return;
        const mission = missionById(entry.missionId);
        if (mission?.navigation?.controlsUnknownTravel !== true) return;
        const target = mission.navigation?.target;
        if (!target?.cuoType) return;
        const excursion = manager?.memory?.getFact?.(`tutorialExcursion:${mission.id}`, null);
        const bound = manager?.memory?.getFact?.(`bibleTarget:${mission.id}`, null);
        if (excursion?.arrived === true || bound?.mapId) return;
        manager?.memory?.setFact?.(`bibleTarget:${mission.id}`, {
          binding: target.binding || "type",
          instanceId: null,
          objectId: target.objectId || null,
          cuoType: target.cuoType,
          mapId: "__pending_tutorial_transition__"
        });
        manager?.memory?.save?.();
      });
      unlockCompletedMissionAutonomy(state);

      const primaryMission = missionById(manager?.primaryMissionId);
      if (
        primaryMission?.navigation?.autonomousUnknownTravel === true &&
        missionStatus(engine, primaryMission.id) === "active"
      ) {
        requestAutonomousUnknownTravel(engine, primaryMission);
      }

      (state?.missions || []).forEach((entry) => {
        if (entry.lifecycleStatus !== "completed") return;
        const mission = missionById(entry.missionId);
        const mode = mission?.navigation?.autonomyModeOnComplete;
        if (!mode) return;

        // Une transition d'autonomie de fin de mission est un effet one-shot.
        // La mission reste "completed" dans l'historique et ne doit donc pas
        // réappliquer OFF à chaque publication d'état ultérieure (T08, UI, etc.).
        const memory = engine.missionManager?.memory;
        const appliedKey = `tutorialAutonomyCompletionApplied:${mission.id}`;
        if (memory?.getFact?.(appliedKey, false) === true) return;

        if (applyTutorialAutonomy(mode)) {
          memory?.setFact?.(appliedKey, true);
          memory?.save?.();
        }
      });

      const handoff = dormantTravelHandoff(engine);
      if (handoff?.missionId) {
        const status = missionStatus(engine, handoff.missionId);
        if (status === "active" || status === "completed") {
          saveDormantTravelHandoff(engine, null);
        } else {
          resumeDormantStructuralTravel(engine);
        }
      } else {
        requestDormantStructuralTravel(engine);
      }
    };

    const onTutorialGuidanceAcknowledged = (event) =>
      acknowledgeMissionAutonomy(engine, event?.detail || {});

    global.addEventListener("bluefox:map-transition-completed", onMapTransition);
    global.addEventListener("bluefox:mission-state", onMissionState);
    global.addEventListener(
      "bluefox:tutorial-guidance-acknowledged",
      onTutorialGuidanceAcknowledged
    );
    engine.__disposeBibleMapPrescriptionV21 = () => {
      global.removeEventListener("bluefox:map-transition-completed", onMapTransition);
      global.removeEventListener("bluefox:mission-state", onMissionState);
      global.removeEventListener(
        "bluefox:tutorial-guidance-acknowledged",
        onTutorialGuidanceAcknowledged
      );
    };

    return engine;
  };

  wrapped.__bibleMapPrescriptionV21 = true;
  BF.mount = wrapped;
})(window);
