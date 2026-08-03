(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const STORAGE_KEY = "bluefox_known_collectable_types_by_map_v1";
  const TREE_TYPES = Object.freeze([
    "tree",
    "luminescent_tree",
    "crystalline_tree"
  ]);
  const ACQUISITION_TYPES = new Set([
    Missions.ActionType?.COLLECT || "collect",
    Missions.ActionType?.EXTRACT || "extract"
  ]);
  const STUDY_TYPES = new Set([
    Missions.ActionType?.OBSERVE || "observe",
    Missions.ActionType?.INSPECT || "inspect",
    Missions.ActionType?.ANALYZE || "analyze"
  ]);

  let runtimeEngine = null;

  const readKnownTypes = () => {
    try {
      const saved = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "{}");
      return saved && typeof saved === "object" ? saved : {};
    } catch {
      return {};
    }
  };

  const knownTypes = readKnownTypes();

  const saveKnownTypes = () => {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(knownTypes));
    } catch {
      // Une indisponibilité du stockage ne doit jamais bloquer le jeu.
    }
  };

  const typeKey = (definition, object = null) =>
    String(
      definition?.type ||
      object?.userData?.libraryType ||
      object?.userData?.objectType ||
      object?.userData?.kind ||
      ""
    ).trim();

  const mapKey = (engine = runtimeEngine) =>
    String(engine?.currentMapId || "unknown-map");

  const isKnownOnMap = (engine, definition, object = null) => {
    const key = typeKey(definition, object);
    return Boolean(key && knownTypes[mapKey(engine)]?.[key]);
  };

  const markKnownOnMap = (engine, definition, object = null) => {
    const key = typeKey(definition, object);
    if (!key) return false;
    const currentMap = mapKey(engine);
    knownTypes[currentMap] = knownTypes[currentMap] || {};
    if (knownTypes[currentMap][key]) return false;
    knownTypes[currentMap][key] = Date.now();
    saveKnownTypes();
    return true;
  };

  const ancestors = (object) => {
    const nodes = [];
    let cursor = object;
    while (cursor) {
      nodes.push(cursor);
      cursor = cursor.parent || null;
    }
    return nodes;
  };

  const resolveObject = (object) => {
    const chain = ancestors(object);
    const anchor =
      object?.userData?.worldAnchor ||
      chain.find((node) => node.userData?.worldAnchor)?.userData.worldAnchor ||
      chain.find((node) => node.userData?.functional || node.userData?.objectType) ||
      object;
    const candidates = [...chain, anchor].filter(Boolean);
    let definition = candidates
      .map((node) => node.userData?.functional || node.userData?.definition)
      .find(Boolean);

    if (!definition && BF.ObjectLibrary) {
      for (const node of candidates) {
        const data = node.userData || {};
        definition =
          BF.ObjectLibrary.getById?.(data.catalogId) ||
          BF.ObjectLibrary.get?.(data.libraryType) ||
          BF.ObjectLibrary.get?.(data.objectType) ||
          BF.ObjectLibrary.get?.(data.kind) ||
          null;
        if (definition) break;
      }
    }

    return { object, anchor, definition };
  };

  const capabilities = (definition) => {
    const actions = new Set(definition?.interaction?.actions || []);
    return {
      observable: actions.has("observe"),
      inspectable:
        definition?.gameplay?.inspectable === true ||
        actions.has("inspect"),
      analyzable:
        definition?.gameplay?.analyzable === true ||
        actions.has("analyze"),
      collectable:
        definition?.gameplay?.collectable === true ||
        actions.has("collect") ||
        actions.has("extract")
    };
  };

  const ensureInteractionState = (resolved) => {
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

  const objectTags = (definition) => new Set([
    ...(definition?.situation?.tags || []),
    ...(definition?.spawnProfile?.tags || []),
    ...(definition?.tags || [])
  ].map((value) => String(value).toLowerCase()));

  const matchesSubject = (resolved, action) => {
    const definition = resolved.definition;
    if (!definition) return false;

    const requestedTypes = Array.isArray(action?.params?.targetTypes)
      ? action.params.targetTypes.map((value) => String(value).toLowerCase())
      : [];
    const currentType = typeKey(definition, resolved.object).toLowerCase();
    if (requestedTypes.length) return requestedTypes.includes(currentType);

    const subject = String(action?.params?.subject || "").toLowerCase();
    if (!subject) return true;

    const tags = objectTags(definition);
    const family = String(
      definition?.knowledge?.family ||
      definition?.resource?.family ||
      definition?.family ||
      ""
    ).toLowerCase();

    if (subject === "tree") {
      return TREE_TYPES.includes(currentType) ||
        tags.has("tree") ||
        (tags.has("plant") && tags.has("landmark"));
    }
    if (subject === "wood") {
      return definition?.resource?.inventoryKey === "wood" ||
        tags.has("wood") ||
        TREE_TYPES.includes(currentType);
    }
    if (subject === "flora") {
      return family === "flora" || tags.has("plant");
    }
    if (subject === "components") {
      return tags.has("technology") ||
        tags.has("component") ||
        tags.has("ruin");
    }
    return subject === currentType || subject === family || tags.has(subject);
  };

  const canPerformStudy = (resolved, actionType) => {
    const caps = capabilities(resolved.definition);
    if (actionType === (Missions.ActionType?.ANALYZE || "analyze")) {
      return caps.analyzable;
    }
    if (actionType === (Missions.ActionType?.INSPECT || "inspect")) {
      return caps.inspectable;
    }
    return caps.observable || caps.inspectable || caps.analyzable;
  };

  const distanceTo = (engine, resolved) =>
    engine.character.root.position.distanceTo(
      resolved.anchor?.position || resolved.object.position
    );

  const studyScore = (engine, resolved, action, now) => {
    const definition = resolved.definition;
    const state = ensureInteractionState(resolved);
    const currentType = typeKey(definition, resolved.object).toLowerCase();
    const tags = objectTags(definition);
    let score = 0;

    if (matchesSubject(resolved, action)) score += 240;
    if ((action.params?.targetTypes || []).includes(currentType)) score += 120;
    if (!isKnownOnMap(engine, definition, resolved.object)) score += 100;
    if (!state.inspected && !state.observed && !state.analyzed) score += 65;
    if (definition?.knowledge?.discoverable === true) score += 20;
    if (tags.has("landmark")) score += 15;

    const lastInteractionAt = Number(resolved.object.userData.lastInteractionAt || 0);
    if (lastInteractionAt && now - lastInteractionAt < 90000) score -= 180;
    if (state.inspected || state.analyzed) score -= 70;

    score -= Math.min(120, distanceTo(engine, resolved) * 2.5);
    return score;
  };

  const selectMissionTarget = (engine, action) => {
    const now = performance.now();
    const candidates = (engine.currentMap?.interactables || [])
      .filter((object) => object.userData.active)
      .map(resolveObject)
      .filter((resolved) =>
        resolved.definition &&
        canPerformStudy(resolved, action.type)
      );

    const exact = candidates.filter((resolved) => matchesSubject(resolved, action));
    const pool = exact.length ? exact : candidates;

    return pool
      .map((resolved) => ({
        resolved,
        score: studyScore(engine, resolved, action, now)
      }))
      .sort((left, right) =>
        right.score - left.score ||
        distanceTo(engine, left.resolved) - distanceTo(engine, right.resolved)
      )[0]?.resolved.object || null;
  };

  const selectAcquisitionTarget = (engine, action) =>
    (engine.currentMap?.interactables || [])
      .filter((object) => object.userData.active)
      .map(resolveObject)
      .filter((resolved) => {
        const definition = resolved.definition;
        const caps = capabilities(definition);
        if (!definition || !caps.collectable) return false;
        const kind = action.params?.kind;
        return !kind ||
          resolved.object.userData.kind === kind ||
          definition.type === kind ||
          definition.resource?.inventoryKey === kind;
      })
      .sort((left, right) =>
        distanceTo(engine, left) - distanceTo(engine, right)
      )[0] || null;

  const installMissionDefinition = () => {
    const camp = Missions.definitions?.camp;
    if (!camp) return false;

    const updated = JSON.parse(JSON.stringify(camp));
    updated.description =
      "Collecter dix bois et étudier les arbres de la zone de départ afin de découvrir la menuiserie.";

    const knowledge = updated.root?.children?.find(
      (node) => node.id === "camp-wood-knowledge"
    );
    if (knowledge) {
      knowledge.title = "Étudier les arbres de la zone de départ";
      knowledge.type = Missions.ActionType?.OBSERVE || "observe";
      knowledge.target = 1;
      knowledge.params = {
        ...(knowledge.params || {}),
        subject: "tree",
        targetTypes: [...TREE_TYPES],
        acceptedInteractions: ["observe", "inspect", "analyze"]
      };
    }

    Missions.definitions = Object.freeze({
      ...Missions.definitions,
      camp: Object.freeze(updated)
    });
    return true;
  };

  const installTreeMigration = () => {
    const Planner = Missions.MissionPlanner;
    if (!Planner?.prototype?.restoreOrCreate) return false;
    const original = Planner.prototype.restoreOrCreate;
    if (original.__bluefoxMissionAwareMigration) return true;

    const migrated = function restoreOrCreateMissionAware(missionId) {
      const tree = original.call(this, missionId);
      const baseMissionId = String(missionId || "").split("@")[0];
      if (baseMissionId !== "camp") return tree;

      const nodeId = String(missionId || "").includes("@")
        ? `camp-wood-knowledge@${String(missionId).split("@")[1]}`
        : "camp-wood-knowledge";
      const node = tree.find?.(nodeId);
      if (!node) return tree;

      node.title = "Étudier les arbres de la zone de départ";
      node.type = Missions.ActionType?.OBSERVE || "observe";
      node.target = 1;
      node.params = {
        ...(node.params || {}),
        subject: "tree",
        targetTypes: [...TREE_TYPES],
        acceptedInteractions: ["observe", "inspect", "analyze"]
      };
      delete node.params.startupMetric;
      tree.refresh?.();
      this.memory.saveTree?.(tree);
      return tree;
    };
    migrated.__bluefoxMissionAwareMigration = true;
    migrated.__bluefoxOriginal = original;
    Planner.prototype.restoreOrCreate = migrated;
    return true;
  };

  const installPlannerScoring = () => {
    const Planner = Missions.MissionPlanner;
    if (!Planner?.prototype?.score) return false;
    const original = Planner.prototype.score;
    if (original.__bluefoxMissionAwareScore) return true;

    const scored = function scoreMissionAware(node, context) {
      let score = original.call(this, node, context);
      const type = Missions.normalizeActionType(node.type);
      if (STUDY_TYPES.has(type)) {
        const subject = String(node.params?.subject || "");
        score += subject ? 90 : 20;
        if (node.params?.targetTypes?.length) score += 45;
      }
      return score;
    };
    scored.__bluefoxMissionAwareScore = true;
    scored.__bluefoxOriginal = original;
    Planner.prototype.score = scored;
    return true;
  };

  const installActionTargeting = () => {
    const Bridge = Missions.ActionBridge;
    if (!Bridge?.prototype?.execute) return false;
    const original = Bridge.prototype.execute;
    if (original.__bluefoxMissionAwareTargeting) return true;

    const targeted = function executeMissionAware(action, now) {
      runtimeEngine = this.engine || runtimeEngine;
      if (!action || this.isEngineBusy()) return false;

      if (STUDY_TYPES.has(action.type)) {
        const target = selectMissionTarget(this.engine, action);
        if (target) {
          target.userData.requestedInteraction = action.type;
          target.userData.requestedInteractionSource = "mission";
          target.userData.missionSubject = action.params?.subject || null;
          this.engine.targetInteraction(target);
          return true;
        }
      }

      if (ACQUISITION_TYPES.has(action.type)) {
        const resolved = selectAcquisitionTarget(this.engine, action);
        if (resolved) {
          const caps = capabilities(resolved.definition);
          const known = isKnownOnMap(
            this.engine,
            resolved.definition,
            resolved.object
          );
          const state = ensureInteractionState(resolved);

          if (!known && caps.inspectable && !state.inspected && !state.identified) {
            resolved.object.userData.requestedInteraction = "inspect";
            resolved.object.userData.requestedInteractionSource = "mission";
            resolved.object.userData.__bluefoxResumeAcquisition = action.type;
            resolved.object.userData.__bluefoxMissionNodeId = action.nodeId;
            this.engine.targetInteraction(resolved.object);
            return true;
          }

          if (known) state.identified = true;
        }
      }

      return original.call(this, action, now);
    };
    targeted.__bluefoxMissionAwareTargeting = true;
    targeted.__bluefoxOriginal = original;
    Bridge.prototype.execute = targeted;
    return true;
  };

  const installMissionEventRecovery = () => {
    const Manager = Missions.MissionManager;
    if (!Manager?.prototype?.consumeObjectEvent) return false;
    const original = Manager.prototype.consumeObjectEvent;
    if (original.__bluefoxMissionAwareRecovery) return true;

    const recovered = function consumeMissionAwareEvent(event) {
      const result = original.call(this, event);
      const mode = event?.detail?.interactionMode;
      const current = this.currentAction;
      const studyCompleted = ["observe", "inspect", "analyze"].includes(mode);

      if (studyCompleted) {
        const currentMap = this.engine?.currentMapId || event.mapId;
        const definition =
          BF.ObjectLibrary?.getById?.(event.objectId) ||
          BF.ObjectLibrary?.get?.(event.detail?.kind) ||
          null;
        if (definition) markKnownOnMap(this.engine, definition);

        if (
          current &&
          ACQUISITION_TYPES.has(current.type) &&
          event.detail?.interactionSource === "mission"
        ) {
          this.currentAction = null;
          this.retryAfter = performance.now() + 450;
          this.memory.remember?.("inspection-before-acquisition", {
            mapId: currentMap,
            objectId: event.objectId,
            kind: event.detail?.kind,
            resumedAction: current.type
          });
        }
      }
      return result;
    };
    recovered.__bluefoxMissionAwareRecovery = true;
    recovered.__bluefoxOriginal = original;
    Manager.prototype.consumeObjectEvent = recovered;
    return true;
  };

  const installKnowledgePropagation = () => {
    if (!BF.ObjectEvents?.subscribe) return false;
    BF.ObjectEvents.subscribe((event) => {
      if (![
        BF.ObjectEvents.types?.OBJECT_INSPECTED,
        BF.ObjectEvents.types?.OBJECT_ANALYZED,
        BF.ObjectEvents.types?.PHENOMENON_OBSERVED
      ].includes(event.type)) return;

      const engine = runtimeEngine;
      if (!engine?.currentMap?.interactables) return;
      const sourceType = String(
        event.detail?.kind ||
        event.objectType ||
        event.objectId ||
        ""
      );
      if (!sourceType) return;

      const matching = engine.currentMap.interactables
        .map(resolveObject)
        .filter((resolved) => {
          const definitionType = typeKey(resolved.definition, resolved.object);
          return definitionType === sourceType ||
            resolved.definition?.id === event.objectId ||
            resolved.definition?.resource?.inventoryKey === sourceType;
        });

      matching.forEach((resolved) => {
        ensureInteractionState(resolved).identified = true;
        markKnownOnMap(engine, resolved.definition, resolved.object);
      });
    });
    return true;
  };

  installMissionDefinition();
  installTreeMigration();
  installPlannerScoring();
  installActionTargeting();
  installMissionEventRecovery();
  installKnowledgePropagation();

  BF.getMissionAwareAnalysisState = () => ({
    installed: true,
    version: "mission-event-only-v3",
    knownTypesByMap: JSON.parse(JSON.stringify(knownTypes)),
    treeTypes: [...TREE_TYPES],
    runtimeMapId: runtimeEngine?.currentMapId || null
  });
})(window);
