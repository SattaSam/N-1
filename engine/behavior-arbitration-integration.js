(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions || {};
  const INTEGRATION_VERSION = "bac-knowledge-routing-r16g-shelter-opportunity";
  const PREFERENCE_DECAY_MS = 20 * 60 * 1000;
  const PREFERENCE_WINDOW_MS = 4 * 60 * 1000;
  const PREFERENCE_COMMIT_MS = 3 * 60 * 1000;
  const TARGET_LOCK_MS = 12000;
  const TARGET_SWITCH_RATIO = 0.62;
  const TARGET_CANDIDATES = 6;
  const MISSION_GUIDANCE_DEFAULT_MS = 4 * 60 * 1000;
  const MISSION_PRIORITY_WEIGHTS = Object.freeze([100, 45, 20, 10]);
  const SHELTER_MIN_MAP_DISTANCE = 10;
  // Valeurs alignées sur survival-ai-bridge : interactionCost.travel = 1.2
  // et seuil d'énergie du profil de fatigue normal = 50.
  const SHELTER_TRAVEL_ENERGY_COST = 1.2;
  const SHELTER_NORMAL_ENERGY_FLOOR = 50;
  const TRAIT_THOUGHT_COOLDOWN_MS = 18000;
  const LOCAL_OPPORTUNITY_RADIUS = 14;
  const TRAIT_LOCAL_ACTION_MAX = 5;
  const TRAIT_LOCAL_ACTION_WINDOW_MS = 35000;
  const TRAIT_LOCAL_OPPORTUNITY_COOLDOWN_MS = 45000;
  const preferenceMemory = new Map();
  let lastTargetDecision = null;
  let lastResearchRoutineSourceAt = 0;
  let lastTraitThoughtAt = 0;
  const traitRuntimeNow = () => {
    const value = Number(global.performance?.now?.());
    return Number.isFinite(value) ? value : Date.now();
  };

  const getBAC = () => BF.BAC || null;
  const traitBalance = (left, right) => {
    const BAC = getBAC();
    if (typeof BAC?.traitBalance === "function") return BAC.traitBalance(left, right);
    const traits = BF.getPlayerTraitProfile?.() || {};
    const value = (name) => Math.max(0, Math.min(100, Number(traits?.[name]) || 50));
    return Math.max(-1, Math.min(1, (value(left) - value(right)) / 100));
  };
  const traitThoughts = Object.freeze({
    "curieux:detour": [
      "Tiens… je ferais bien un détour.",
      "Il y a encore quelque chose à découvrir par là."
    ],
    "prudent:proximite": [
      "Je préfère ne pas trop m'éloigner pour l'instant.",
      "Je garde une marge avant d'aller plus loin."
    ],
    "courageux:nouvel-axe": [
      "Je ne sais pas où ça mène… allons voir.",
      "C'est nouveau. J'ai envie de tenter cette piste."
    ],
    "craintif:continuite": [
      "Je préfère continuer sur ma voie pour le moment.",
      "Je dois rester concentré sur mon objectif."
    ],
    "opportuniste:opportunite": [
      "Je ne vais pas passer à côté de cette opportunité.",
      "Tant que je suis ici, autant en profiter."
    ],
    "empathique:souvenir": [
      "Je n'arrive pas à laisser cette piste de côté.",
      "Ce que j'ai vécu ici compte encore pour moi."
    ],
    "indifferent:objectif": [
      "Je dois rester concentré sur mon objectif.",
      "Je préfère m'en tenir à ce qui est utile maintenant."
    ],
    "respectueux:mesure": [
      "Pas besoin d'en prendre plus.",
      "Je préfère laisser le reste tranquille."
    ]
  });
  const speakTraitThought = (engine, reason) => {
    const phrases = traitThoughts[reason];
    if (!phrases?.length || !engine?.speechVisible || !engine?.callbacks?.onSpeak) return false;
    const now = Date.now();
    if (now - lastTraitThoughtAt < TRAIT_THOUGHT_COOLDOWN_MS) return false;
    engine.callbacks.onSpeak(phrases[Math.floor(Math.random() * phrases.length)]);
    lastTraitThoughtAt = now;
    return true;
  };
  const clearTraitLocalActionWindow = (engine, reason = "completed", now = traitRuntimeNow()) => {
    if (!engine?.__traitLocalActionWindow) return false;
    const previous = engine.__traitLocalActionWindow;
    engine.__traitLocalActionWindow = null;
    if (previous.kind === "opportunity") {
      engine.__traitLocalOpportunityCooldownUntil = now + TRAIT_LOCAL_OPPORTUNITY_COOLDOWN_MS;
    }
    engine.__lastTraitLocalActionWindow = {
      ...previous,
      endedAt: now,
      endReason: reason
    };
    return true;
  };
  const activeTraitLocalActionWindow = (engine, now = traitRuntimeNow()) => {
    const state = engine?.__traitLocalActionWindow || null;
    if (!state) return null;
    if (Number(state.remaining) <= 0 || Number(state.expiresAt) <= now) {
      clearTraitLocalActionWindow(engine, Number(state.remaining) <= 0 ? "budget-consumed" : "expired", now);
      return null;
    }
    return state;
  };
  const boundedLocalActionBudget = ({ opposition = 0, trust = 0, opportunism = 0 } = {}) => {
    const resistance = Math.max(0, Math.min(1, Number(opposition) || 0));
    const distrust = Math.max(0, Math.min(1, -(Number(trust) || 0) / 100));
    const opportunity = Math.max(0, Math.min(1, Number(opportunism) || 0));
    const raw = opportunity > 0
      ? 1 + Math.floor(opportunity * 3)
      : 1 + Math.floor(resistance * 2.5 + distrust * 2.5);
    return Math.max(1, Math.min(TRAIT_LOCAL_ACTION_MAX, raw));
  };
  const beginTraitLocalActionWindow = (engine, options = {}) => {
    if (!engine) return null;
    const now = traitRuntimeNow();
    const next = {
      kind: options.kind === "opportunity" ? "opportunity" : "player-opposition",
      reason: String(options.reason || ""),
      targetMissionId: options.targetMissionId || null,
      remaining: Math.max(1, Math.min(TRAIT_LOCAL_ACTION_MAX, Number(options.remaining) || 1)),
      startedAt: now,
      expiresAt: now + TRAIT_LOCAL_ACTION_WINDOW_MS
    };
    engine.__traitLocalActionWindow = next;
    return next;
  };
  const consumeTraitLocalAction = (engine, actionId) => {
    const now = traitRuntimeNow();
    const state = activeTraitLocalActionWindow(engine, now);
    if (!state) return null;
    state.remaining = Math.max(0, Number(state.remaining) - 1);
    state.lastActionId = actionId || null;
    state.lastActionAt = now;
    if (state.remaining <= 0) clearTraitLocalActionWindow(engine, "budget-consumed", now);
    return engine.__traitLocalActionWindow || null;
  };
  const normalizeAxis = (value) => {
    const key = String(value || "").trim().toLowerCase();
    if (["exploration", "explore"].includes(key)) return "exploration";
    if (["collection", "collecte", "collect"].includes(key)) return "collection";
    if (["research", "recherche", "analyse", "analysis", "engineering", "ingenierie", "ingénierie"].includes(key)) return "research";
    if (["relations", "relation", "contact", "biology", "biologie"].includes(key)) return "relations";
    if (["survival", "survie", "repos", "rest", "food", "eat", "safety"].includes(key)) return "survival";
    return null;
  };
  const actionAxis = (actionType) => {
    const types = Missions.ActionType || {};
    if ([types.COLLECT, types.EXTRACT, "collect", "extract"].includes(actionType)) return "collection";
    if ([types.INSPECT, types.ANALYZE, types.OBSERVE, types.RESEARCH, types.CRAFT, types.BUILD,
      "inspect", "analyze", "observe", "research", "craft", "build"].includes(actionType)) return "research";
    if ([types.EXPLORE_ZONE, types.TRAVEL, "explore-zone", "travel"].includes(actionType)) return "exploration";
    if ([types.REST, types.EAT, "rest", "eat"].includes(actionType)) return "survival";
    return null;
  };
  const objectDefinition = (object) => {
    const data = object?.userData || {};
    return data.functional || BF.ObjectLibrary?.get?.(data.libraryType) || BF.ObjectLibrary?.get?.(data.kind) || {};
  };
  const isCollectableDefinition = (definition) => {
    const actions = new Set(definition?.interaction?.actions || []);
    return Boolean(
      definition?.gameplay?.collectable === true ||
      actions.has("collect") ||
      actions.has("extract")
    );
  };
  const acquisitionAction = (definition) => {
    const actions = new Set(definition?.interaction?.actions || []);
    const configured = String(
      definition?.interaction?.acquisitionAction ||
      definition?.interaction?.afterInspectionAction ||
      ""
    ).toLowerCase();
    if (configured === "extract" && actions.has("extract")) return "extract";
    if (configured === "collect") return "collect";
    if (actions.has("extract") && !actions.has("collect")) return "extract";
    return isCollectableDefinition(definition) ? "collect" : null;
  };
  const objectAction = (engine, object) => {
    const resolved = BF.resolveObjectInteraction?.(object);
    const action = String(
      object?.userData?.requestedInteraction ||
      resolved?.action ||
      engine?.interactionProfile?.(object)?.action ||
      ""
    ).toLowerCase();
    return action;
  };
  const objectAxis = (engine, object) => {
    const action = objectAction(engine, object);
    const data = object?.userData || {};
    const definition = objectDefinition(object);
    const category = String(
      definition.category || data.category || definition.spawn?.category || ""
    ).toLowerCase();
    const tags = [
      ...(definition.spawn?.tags || []),
      ...(definition.tags || []),
      ...(data.tags || [])
    ].map((value) => String(value).toLowerCase());
    const living = /fauna|animal|creature|npc|pnj|species|espèce/.test(category) ||
      tags.some((tag) => /fauna|animal|creature|npc|pnj|species|living/.test(tag));
    if (living) return "relations";
    if (["collect", "extract"].includes(action)) return "collection";
    if (["analyze", "inspect", "observe"].includes(action)) return "research";
    return "exploration";
  };
  const objectKind = (object) => {
    const data = object?.userData || {};
    const def = objectDefinition(object);
    return String(
      def.resource?.inventoryKey ||
      data.inventoryKey ||
      def.type ||
      data.libraryType ||
      data.kind ||
      def.id ||
      ""
    ).trim().toLowerCase();
  };
  const rememberPreference = (axis, kind) => {
    if (!kind) return;
    const now = Date.now();
    const key = String(kind).toLowerCase();
    const previous = preferenceMemory.get(key);
    const count =
      previous && now - previous.lastAt <= PREFERENCE_WINDOW_MS
        ? Math.min(6, previous.count + 1)
        : 1;
    preferenceMemory.set(key, {
      kind: key,
      count,
      lastAt: now,
      lastAxis: axis || previous?.lastAxis || null
    });
  };
  const preferredEntry = () => {
    const now = Date.now();
    let best = null;
    for (const [key, entry] of preferenceMemory.entries()) {
      const age = now - entry.lastAt;
      if (age >= PREFERENCE_DECAY_MS) {
        preferenceMemory.delete(key);
        continue;
      }
      if (entry.count < 3) continue;
      const strength = entry.count * (1 - age / PREFERENCE_DECAY_MS);
      if (!best || strength > best.strength) best = { ...entry, strength };
    }
    return best;
  };
  const preferredKind = () => preferredEntry()?.kind || null;
  const preferenceActivityBoost = (engine, axis, objects = []) => {
    const preferred = preferredEntry();
    if (!preferred || !objects.length) return 0;
    const matches = objects.some((object) => objectKind(object) === preferred.kind);
    if (!matches) return 0;

    const relation = getBAC()?.getDiagnostics?.().relation || {};
    const axisTrust = Number(relation.trustByAxis?.[axis]) || 0;
    const trustFactor = Math.max(0.75, Math.min(1.35, 1 + axisTrust / 100));
    return Math.min(26, (8 + preferred.strength * 3) * trustFactor);
  };

  const objectIdentity = (object) => {
    const data = object?.userData || {};
    const anchor = data.worldAnchor || data.worldRoot || object;
    const definition = objectDefinition(object);
    return {
      objectId:
        data.catalogId ||
        anchor?.userData?.catalogId ||
        definition.id ||
        null,
      instanceId:
        data.instanceId ||
        anchor?.userData?.instanceId ||
        null
    };
  };

  const objectTags = (object) => {
    const data = object?.userData || {};
    const definition = objectDefinition(object);
    return [...new Set([
      ...(definition.spawn?.tags || []),
      ...(definition.tags || []),
      ...(data.tags || [])
    ].map((value) => String(value).toLowerCase()))];
  };

  const mapKnowledge = (engine) =>
    BF.getMapProgressionIndicators?.(engine?.currentMapId) ||
    BF.multiProgression?.getMapIndicators?.(engine?.currentMapId) ||
    {};

  const researchEventTypes = () => {
    const types = BF.ObjectEvents?.types || {};
    return {
      seen: new Set([
        types.OBJECT_SEEN,
        types.OBJECT_INSPECTED,
        types.OBJECT_ANALYZED,
        types.PHENOMENON_OBSERVED,
        types.KNOWLEDGE_ACQUIRED
      ].filter(Boolean)),
      inspected: new Set([
        types.OBJECT_INSPECTED,
        types.OBJECT_ANALYZED
      ].filter(Boolean)),
      analyzed: new Set([
        types.OBJECT_ANALYZED
      ].filter(Boolean))
    };
  };

  const createDecisionContext = (engine) => ({
    history: BF.ObjectEvents?.history?.() || [],
    knowledge: mapKnowledge(engine),
    researchTypes: researchEventTypes(),
    interestCache: new WeakMap(),
    newestResearchMaterialAt: null
  });

  const historyForObject = (engine, object, decision = null) => {
    const { objectId, instanceId } = objectIdentity(object);
    const history = decision?.history || BF.ObjectEvents?.history?.() || [];
    return history.filter((event) => {
      if (!event) return false;
      if (event.mapId && engine?.currentMapId && event.mapId !== engine.currentMapId) return false;
      if (objectId && event.objectId === objectId) return true;
      if (instanceId && event.instanceId === instanceId) return true;
      return false;
    });
  };

  const researchKnowledge = (engine, object, decision = null) => {
    const events = historyForObject(engine, object, decision);
    const types = decision?.researchTypes || researchEventTypes();
    return {
      seen: events.some((event) => types.seen.has(event.type)),
      inspected: events.some((event) => types.inspected.has(event.type)),
      analyzed: events.some((event) => types.analyzed.has(event.type)),
      latestAt: events.reduce((latest, event) =>
        Math.max(latest, Number(event.at) || 0), 0)
    };
  };

  const instanceResearchKnowledge = (engine, object, decision = null) => {
    const { instanceId } = objectIdentity(object);
    if (!instanceId) return { seen:false, inspected:false, analyzed:false, latestAt:0 };
    const history = decision?.history || BF.ObjectEvents?.history?.() || [];
    const events = history.filter((event) => {
      if (!event || event.instanceId !== instanceId) return false;
      if (event.mapId && engine?.currentMapId && event.mapId !== engine.currentMapId) return false;
      return true;
    });
    const types = decision?.researchTypes || researchEventTypes();
    return {
      seen: events.some((event) => types.seen.has(event.type)),
      inspected: events.some((event) => types.inspected.has(event.type)),
      analyzed: events.some((event) => types.analyzed.has(event.type)),
      latestAt: events.reduce((latest, event) =>
        Math.max(latest, Number(event.at) || 0), 0)
    };
  };

  const hasPerInstanceKnowledgeValue = (object) => {
    const definition = objectDefinition(object);
    const data = object?.userData || {};
    const category = String(definition.category || data.category || "").toLowerCase();
    const tags = objectTags(object);
    return (
      /fauna|animal|creature|npc|pnj|species/.test(category) ||
      tags.some((tag) =>
        /fauna|animal|creature|npc|pnj|species|poi|landmark|relic|relique|phenomenon|unique/.test(tag)
      )
    );
  };

  const targetInterest = (engine, object, axis, decision = null) => {
    const cachedByAxis = decision?.interestCache?.get(object);
    if (cachedByAxis?.has(axis)) return cachedByAxis.get(axis);

    const remember = (result) => {
      if (!decision?.interestCache) return result;
      let byAxis = decision.interestCache.get(object);
      if (!byAxis) {
        byAxis = new Map();
        decision.interestCache.set(object, byAxis);
      }
      byAxis.set(axis, result);
      return result;
    };

    const now = Date.now();
    const definition = objectDefinition(object);
    const data = object?.userData || {};
    const action = objectAction(engine, object);
    const kind = objectKind(object);
    const tags = objectTags(object);
    const category = String(
      definition.category || data.category || ""
    ).toLowerCase();
    const { objectId, instanceId } = objectIdentity(object);
    const knowledge = decision?.knowledge || mapKnowledge(engine);
    const knownObject = Boolean(objectId && knowledge.uniqueObjects?.[objectId]);
    const knownInstance = Boolean(instanceId && knowledge.uniqueInstances?.[instanceId]);
    const knownResource = Boolean(kind && knowledge.uniqueResources?.[kind]);
    const objectResearch = researchKnowledge(engine, object, decision);
    const instanceResearch = instanceResearchKnowledge(engine, object, decision);
    const perInstanceValue = hasPerInstanceKnowledgeValue(object);
    const latestAt = Math.max(
      Number(objectResearch.latestAt) || 0,
      perInstanceValue ? Number(instanceResearch.latestAt) || 0 : 0
    );
    const age = latestAt ? now - latestAt : Infinity;

    let score = 0;
    const reasons = [];

    if (axis === "collection") {
      const preferred = preferredEntry();
      const preferredCollectable =
        isCollectableDefinition(definition) &&
        preferred?.kind === kind;
      if (
        !["collect", "extract"].includes(action) &&
        !preferredCollectable
      ) {
        return remember({ score: -1000, reasons: ["incompatible"] });
      }
      score = 58;
      reasons.push("resource-action");
      if (
        preferredCollectable &&
        ["observe", "inspect", "analyze"].includes(action)
      ) {
        score += 6;
        reasons.push("preferred-acquisition-prerequisite");
      }
      if (!knownResource) {
        score += 18;
        reasons.push("new-resource");
      }
      if (!knownObject) {
        score += 8;
        reasons.push("new-object");
      }
    } else if (axis === "research") {
      if (!["observe", "inspect", "analyze"].includes(action)) {
        return remember({ score: -1000, reasons: ["incompatible"] });
      }

      const targetKnowledge = perInstanceValue ? instanceResearch : objectResearch;

      if (action === "observe") {
        if (targetKnowledge.seen) {
          score = 3;
          reasons.push("already-seen");
        } else {
          score = 52;
          reasons.push("new-observation");
        }
      } else if (action === "inspect") {
        if (targetKnowledge.inspected) {
          score = 4;
          reasons.push("already-inspected");
        } else {
          score = targetKnowledge.seen ? 58 : 64;
          reasons.push(targetKnowledge.seen ? "new-inspection-level" : "new-observation-and-inspection");
        }
      } else if (action === "analyze") {
        if (targetKnowledge.analyzed) {
          score = 5;
          reasons.push("already-analyzed");
        } else {
          score = targetKnowledge.inspected ? 66 : 72;
          reasons.push(targetKnowledge.inspected ? "new-analysis-level" : "new-deep-knowledge");
        }
      }

      if (tags.some((tag) =>
        /poi|landmark|ruin|relic|relique|technology|phenomenon|fauna|species/.test(tag)
      )) {
        score += 12;
        reasons.push("knowledge-value");
      }

      const decorative =
        /decor|decors|décor/.test(category) ||
        tags.includes("decor");

      if (decorative && !perInstanceValue && objectResearch.seen) {
        score = Math.min(score, action === "analyze" ? 10 : action === "inspect" ? 8 : 3);
        reasons.push("known-decor-type");
      }
    } else if (axis === "relations") {
      score = 48;
      reasons.push("living-target");
      if (!knownObject) {
        score += 25;
        reasons.push("new-species");
      }
      if (!knownInstance) {
        score += 10;
        reasons.push("new-individual");
      }
    } else {
      return remember({ score: -1000, reasons: ["unsupported-axis"] });
    }

    const preferred = preferredEntry();
    if (preferred?.kind === kind) {
      const preferenceBonus = Math.min(30, 8 + preferred.strength * 4);
      score += preferenceBonus;
      reasons.push("player-preference");
    }

    if (age < 90000) {
      score -= 35;
      reasons.push("just-interacted");
    } else if (age < 4 * 60 * 1000) {
      score -= 15;
      reasons.push("recently-interacted");
    }

    return remember({
      score: Math.max(0, score),
      reasons,
      knownObject,
      knownInstance,
      knownResource,
      researchKnowledge: {
        object: objectResearch,
        instance: instanceResearch,
        perInstanceValue
      },
      lastInteractionAgeMs: Number.isFinite(age) ? age : null
    });
  };

  const bestInterest = (engine, objects, axis, decision = null) =>
    objects.reduce(
      (best, object) =>
        Math.max(best, targetInterest(engine, object, axis, decision).score),
      0
    );

  const explorationContext = (engine) => {
    const map = BF.getMapExplorationState?.(engine?.currentMapId) || {};
    const next = BF.getNextUnexploredMapTarget?.(
      engine?.currentMapId,
      {
        x: engine?.character?.root?.position?.x || 0,
        z: engine?.character?.root?.position?.z || 0
      }
    ) || null;
    return {
      surfacePercent: Math.max(0, Number(map.surfacePercent) || 0),
      next
    };
  };

  const newestResearchMaterialAt = (engine, decision = null) => {
    if (decision && Number.isFinite(decision.newestResearchMaterialAt)) {
      return decision.newestResearchMaterialAt;
    }
    const types = BF.ObjectEvents?.types || {};
    const history = decision?.history || BF.ObjectEvents?.history?.() || [];
    const latest = history.reduce((latestAt, event) => {
      if (!event) return latestAt;
      if (event.mapId && engine?.currentMapId && event.mapId !== engine.currentMapId) {
        return latestAt;
      }
      if (![
        types.OBJECT_SEEN,
        types.OBJECT_INSPECTED,
        types.OBJECT_ANALYZED,
        types.PHENOMENON_OBSERVED,
        types.KNOWLEDGE_ACQUIRED
      ].includes(event.type)) {
        return latestAt;
      }
      return Math.max(latestAt, Number(event.at) || 0);
    }, 0);
    if (decision) decision.newestResearchMaterialAt = latest;
    return latest;
  };

  const hasUnprocessedResearchMaterial = (engine, decision = null) =>
    newestResearchMaterialAt(engine, decision) > lastResearchRoutineSourceAt;

  const recordSuggestion = (axis, detail) => {
    const BAC = getBAC();
    if (!BAC) return null;
    if (detail?.source === "manual-interaction" && detail.kind) rememberPreference(axis, String(detail.kind).toLowerCase());
    if (typeof BAC.recordPlayerSuggestion === "function") return BAC.recordPlayerSuggestion(axis, detail);
    if (typeof BAC.recordSuggestion === "function") return BAC.recordSuggestion(axis, detail);
    return null;
  };
  const resolveSuggestion = (success = true, useful = true, detail = {}) => {
    const BAC = getBAC();
    if (!BAC) return null;
    if (typeof BAC.evaluatePlayerSuggestion === "function") return BAC.evaluatePlayerSuggestion({ success, useful, ...detail });
    if (typeof BAC.resolveSuggestion === "function") return BAC.resolveSuggestion(success, useful);
    return null;
  };
  const weightedPick = (options) => {
    const BAC = getBAC();
    if (typeof BAC?.weightedPick === "function") return BAC.weightedPick(options);
    const valid = options.filter((option) => option?.available !== false && Number(option?.weight || option?.baseWeight) > 0);
    if (!valid.length) return null;
    const total = valid.reduce((sum, option) => sum + Number(option.weight || option.baseWeight), 0);
    let roll = Math.random() * total;
    return valid.find((option) => ((roll -= Number(option.weight || option.baseWeight)) <= 0)) || valid[valid.length - 1];
  };
  const activeLocalMissionId = (engine, baseId) =>
    (engine?.missionManager?.activeMissionIds || []).find((missionId) =>
      String(missionId).split("@")[0] === String(baseId)
    ) || null;

  const localCampMissionReady = (engine) => {
    const missionId = activeLocalMissionId(engine, "LOC-14");
    if (!missionId) return null;
    const tree = engine?.missionManager?.trees?.get?.(missionId);
    const separator = String(missionId).indexOf("@");
    const scopedEvaluationId = separator > 0
      ? `${missionId.slice(0, separator)}:evaluate@${missionId.slice(separator + 1)}`
      : `${missionId}:evaluate`;
    const evaluation = tree?.find?.(scopedEvaluationId) || tree?.find?.(`${missionId}:evaluate`);
    if (!evaluation?.isComplete) return null;
    return missionId;
  };

  const autonomousShelterOpportunity = (engine, survival = {}) => {
    const runtime = BF.bibleRuntime;
    if (!runtime || !engine?.findKnownRoute || !engine?.currentMapId) return null;
    const currentMapId = String(engine.currentMapId);
    const loc14MissionId = localCampMissionReady(engine);
    const campState = runtime.constructionAvailability?.("camp", currentMapId);
    const refugeState = runtime.constructionAvailability?.("refuge", currentMapId);
    const kind = loc14MissionId
      ? (campState?.allowed ? "camp" : null)
      : (refugeState?.allowed ? "refuge" : campState?.allowed ? "camp" : null);
    if (!kind) return null;

    const siteProgression = engine.missionManager?.memory?.state?.siteProgression || {};
    let nearest = Infinity;
    Object.entries(siteProgression).forEach(([mapId, raw]) => {
      if (String(mapId) === currentMapId) return;
      const sites = raw?.sites && typeof raw.sites === "object" ? raw.sites : { [raw?.kind]: raw };
      if (!Object.values(sites).some((site) => ["camp", "refuge", "base"].includes(site?.kind))) return;
      const route = engine.findKnownRoute(currentMapId, mapId);
      if (!Array.isArray(route) || !route.length) return;
      nearest = Math.min(nearest, Math.max(0, route.length - 1));
    });
    if (!Number.isFinite(nearest) || nearest < SHELTER_MIN_MAP_DISTANCE) return null;

    const energy = Number(survival.energy);
    if (!loc14MissionId && !Number.isFinite(energy)) return null;
    const estimatedReturnFatigue = nearest * SHELTER_TRAVEL_ENERGY_COST;
    const projectedReturnEnergy = Number.isFinite(energy)
      ? energy - estimatedReturnFatigue
      : SHELTER_NORMAL_ENERGY_FLOOR;
    if (!loc14MissionId && projectedReturnEnergy >= SHELTER_NORMAL_ENERGY_FLOOR) return null;

    const localResources = Object.values(engine.currentMap?.interactables || []).filter((object) =>
      object?.userData?.active && isCollectableDefinition(objectDefinition(object))
    ).length;
    const resourceBoost = Math.min(16, localResources * 0.5);
    const distanceBoost = Math.min(
      18,
      Math.max(0, nearest - SHELTER_MIN_MAP_DISTANCE) * 2
    );
    const fatigueBoost = Math.min(
      18,
      Math.max(0, SHELTER_NORMAL_ENERGY_FLOOR - projectedReturnEnergy)
    );
    return {
      kind,
      mapId: currentMapId,
      nearestSiteDistance: nearest,
      estimatedReturnFatigue,
      projectedReturnEnergy,
      resourceCount: localResources,
      missionId: loc14MissionId,
      missionDriven: Boolean(loc14MissionId),
      weight: (loc14MissionId ? 24 : 7) + distanceBoost + fatigueBoost + resourceBoost
    };
  };

  const targetPosition = (object) =>
    object?.userData?.worldAnchor?.position || object?.position || null;

  const directDistance = (engine, object) => {
    const point = targetPosition(object);
    return point && engine?.character?.root?.position
      ? engine.character.root.position.distanceTo(point)
      : Infinity;
  };

  const knownExperimentationSites = (engine, target) => {
    const progression = engine?.missionManager?.memory?.state?.siteProgression || {};
    const allowedKinds = target === "workbench"
      ? new Set(["workbench"])
      : new Set(["camp", "refuge", "base"]);
    const sites = [];
    Object.entries(progression).forEach(([storedMapId, raw]) => {
      const bucket = raw?.sites && typeof raw.sites === "object"
        ? Object.values(raw.sites)
        : [raw];
      bucket.filter(Boolean).forEach((site) => {
        const kind = String(site.kind || "").toLowerCase();
        const mapId = String(site.mapId || storedMapId || "");
        if (allowedKinds.has(kind) && mapId) sites.push({ ...site, kind, mapId });
      });
    });
    return sites;
  };

  const nearestReachableExperimentationSite = (engine, target) => {
    const currentMapId = String(engine?.currentMapId || "");
    return knownExperimentationSites(engine, target)
      .map((site) => {
        const route = site.mapId === currentMapId
          ? [currentMapId]
          : engine?.findKnownRoute?.(currentMapId, site.mapId);
        return {
          site,
          distance: Array.isArray(route) && route.length
            ? Math.max(0, route.length - 1)
            : Infinity
        };
      })
      .filter((entry) => Number.isFinite(entry.distance))
      .sort((left, right) => left.distance - right.distance)[0]?.site || null;
  };

  const requestExperimentationLocation = (engine, intent, destination) => {
    if (!engine || !intent || !destination) return false;
    if (String(destination.mapId) !== String(engine.currentMapId || "")) {
      if (typeof engine.handleNavigationSuggestion !== "function") return false;
      engine.handleNavigationSuggestion({
        mapId: destination.mapId,
        source: "pending-experimentation",
        missionId: intent.missionId
      });
      return true;
    }
    const anchor = destination.anchor || destination.position;
    if (!anchor || typeof engine.character?.setTarget !== "function") return false;
    const target = engine.THREE?.Vector3
      ? new engine.THREE.Vector3(Number(anchor.x) || 0, 0, Number(anchor.z) || 0)
      : { x: Number(anchor.x) || 0, y: 0, z: Number(anchor.z) || 0 };
    if (engine.character.setTarget(target, "run") === false) return false;
    engine.showWorldMarker?.(target);
    engine.callbacks?.onStatus?.(
      intent.locationTarget === "workbench"
        ? "BlueFox rejoint l’établi pour préparer l’expérimentation nécessaire."
        : "BlueFox rejoint un abri établi pour préparer l’expérimentation nécessaire."
    );
    return true;
  };

  const pendingExperimentationCandidate = (engine) => {
    if (engine?.persistentNavigationIntent) return null;
    const intent = engine?.missionManager?.pendingExperimentationIntent?.() || null;
    if (!intent?.knowledgeId) return null;
    const experiment = BF.Research?.experimentationForKnowledge?.(intent.knowledgeId) || null;
    const themeId = String(experiment?.theme?.id || intent.experimentThemeId || "");
    const state = themeId ? BF.Research?.experimentationState?.(themeId) || null : null;
    if (!experiment || !state?.nextStage || state.completed) return null;
    const locationTarget = state.nextStage.location === "workbench" ? "workbench" : "camp";
    const destination = state.locationReady
      ? null
      : nearestReachableExperimentationSite(engine, locationTarget);
    return {
      id: `pending-experimentation:${intent.missionId}`,
      axis: state.axis || intent.axis || experiment.theme?.axis || "research",
      baseWeight: Math.max(8, Number(intent.baseWeight) || 0),
      available: Boolean(
        state.resourcesReady &&
        (state.canRun || (!state.locationReady && destination))
      ),
      missionDriven: true,
      execute: () => {
        if (state.canRun) {
          return BF.Research?.runExperiment?.(themeId, {
            source: "bac-pending-prerequisite",
            missionId: intent.missionId,
            knowledgeId: intent.knowledgeId
          }) === true;
        }
        if (!state.locationReady && state.resourcesReady) {
          return requestExperimentationLocation(
            engine,
            { ...intent, locationTarget },
            destination
          );
        }
        return false;
      }
    };
  };

  const routeCost = (engine, object) => {
    try {
      const approach = engine.interactionApproachPoint?.(object);
      const point = approach?.point || approach?.position || null;
      if (!point) return directDistance(engine, object);
      if (Number.isFinite(Number(approach?.pathLength))) {
        return Number(approach.pathLength);
      }
      return engine.character?.root?.position
        ? engine.character.root.position.distanceTo(point)
        : directDistance(engine, object);
    } catch (_) {
      return directDistance(engine, object);
    }
  };

  const chooseLocalTarget = (engine, objects, axis, decision = null) => {
    if (!objects?.length) return null;
    const now = Date.now();
    const preferred = preferredKind();
    const valid = objects.filter((object) =>
      !object.userData?.bacAvoidUntil || object.userData.bacAvoidUntil <= now
    );
    const available = valid;
    if (!available.length) return null;

    const preferredAvailable = preferred
      ? available.filter((object) => objectKind(object) === preferred)
      : [];

    // La préférence ne re-classe jamais les autres objets. Elle intervient
    // seulement après le choix d'axe, avant la distance.
    const candidatePool =
      preferredAvailable.length &&
      preferredEntry()?.lastAxis === axis
        ? preferredAvailable
        : available;

    const shortlist = candidatePool
      .map((object) => {
        const interest = targetInterest(engine, object, axis, decision);
        return {
          object,
          interest: interest.score,
          interestBand: Math.floor(interest.score / 10),
          reasons: interest.reasons,
          researchKnowledge: interest.researchKnowledge || null,
          direct: directDistance(engine, object)
        };
      })
      .filter((entry) => entry.interest > 0)
      .sort((left, right) =>
        right.interestBand - left.interestBand ||
        right.interest - left.interest ||
        left.direct - right.direct
      )
      .slice(0, TARGET_CANDIDATES)
      .map((entry) => ({
        ...entry,
        cost: routeCost(engine, entry.object)
      }))
      .sort((left, right) =>
        right.interestBand - left.interestBand ||
        left.cost - right.cost ||
        right.interest - left.interest ||
        left.direct - right.direct
      );
    const selected = shortlist[0]?.object || null;
    lastTargetDecision = {
      at: Date.now(),
      axis,
      action: selected ? objectAction(engine, selected) : null,
      finalIntent: selected && axis === "collection"
        ? acquisitionAction(objectDefinition(selected))
        : null,
      preferredKind: preferred,
      preferenceApplied: Boolean(
        preferredAvailable.length &&
        candidatePool === preferredAvailable
      ),
      selectedKind: selected ? objectKind(selected) : null,
      selectedInterest: shortlist[0]?.interest ?? null,
      selectedReasons: shortlist[0]?.reasons || [],
      selectedDirectDistance: shortlist[0]?.direct ?? null,
      selectedRouteCost: shortlist[0]?.cost ?? null,
      newestResearchMaterialAt: newestResearchMaterialAt(engine, decision),
      lastResearchRoutineSourceAt,
      candidates: shortlist.map((entry) => ({
        kind: objectKind(entry.object),
        action: objectAction(engine, entry.object),
        finalIntent: axis === "collection"
          ? acquisitionAction(objectDefinition(entry.object))
          : null,
        interest: entry.interest,
        reasons: entry.reasons,
        researchKnowledge: entry.researchKnowledge,
        directDistance: Number(entry.direct.toFixed?.(2) ?? entry.direct),
        routeCost: Number(entry.cost.toFixed?.(2) ?? entry.cost)
      }))
    };
    return selected;
  };

  const faunaRoot = (object) =>
    object?.userData?.worldAnchor || object?.userData?.worldRoot || object || null;

  const faunaRuntimeState = (object) => {
    const root = faunaRoot(object);
    return root ? BF.FaunaRuntime?.getState?.(root) || null : null;
  };

  const beginCautiousFaunaApproach = (engine, object, axis, source, now) => {
    const state = faunaRuntimeState(object);
    if (!state || state.acceptedProximity) return false;
    const anchor = targetPosition(object);
    const origin = engine?.character?.root?.position;
    if (!anchor || !origin || directDistance(engine, object) <= 3.0) return false;
    const away = origin.clone().sub(anchor).setY(0);
    if (away.lengthSq() < 0.001) away.set(0, 0, 1);
    away.normalize();
    const cautiousPoint = anchor.clone().addScaledVector(away, 4.8);
    const accepted = engine.character.setTarget(cautiousPoint, "walk");
    if (accepted === false) return false;
    engine.__bacFaunaApproach = {
      object,
      axis,
      source,
      cautiousPoint,
      phase: "outer",
      startedAt: now,
      arrivedAt: 0
    };
    engine.showWorldMarker?.(cautiousPoint);
    engine.callbacks?.onStatus?.(
      "BlueFox s'arrête d'abord à distance pour ne pas brusquer l'animal."
    );
    return true;
  };

  const commitTarget = (engine, object, axis, source = "autonomy") => {
    if (!object) return false;
    const now = Date.now();

    if (
      source === "autonomy" &&
      faunaRuntimeState(object) &&
      !faunaRuntimeState(object).acceptedProximity &&
      directDistance(engine, object) > 3.0
    ) {
      return beginCautiousFaunaApproach(engine, object, axis, source, now);
    }

    const lock = engine.__bacTargetLock;
    if (
      lock?.object === object &&
      lock.until > now &&
      engine.canInteractWith?.(object, now)
    ) {
      object.userData.requestedInteractionSource = source;
      if (
        axis === "collection" &&
        preferredKind() === objectKind(object)
      ) {
        object.userData.requestedInteraction =
          acquisitionAction(objectDefinition(object)) ||
          object.userData.requestedInteraction;
      }
      return engine.targetInteraction(object);
    }

    engine.__bacTargetLock = {
      object,
      axis,
      until: now + TARGET_LOCK_MS
    };
    object.userData.requestedInteractionSource = source;
    if (
      axis === "collection" &&
      preferredKind() === objectKind(object)
    ) {
      object.userData.requestedInteraction =
        acquisitionAction(objectDefinition(object)) ||
        object.userData.requestedInteraction;
    }
    return engine.targetInteraction(object);
  };

  const installMissionOverlay = () => {
    const BAC = getBAC();
    if (!BAC) return false;
    const Manager = Missions.MissionManager;
    if (Manager?.prototype && !Manager.prototype.__bacPriorityQueueInstalled) {
      const priorityQueueEligible = function priorityQueueEligible(missionId) {
        const context = this.bridge?.context?.();
        if (typeof this.missionPriorityQueueEligible === "function") {
          return this.missionPriorityQueueEligible(missionId, context) === true;
        }
        return this.isMissionVisibleOnCurrentMap?.(missionId) !== false;
      };
      const priorityAssessment = function priorityAssessment(missionId) {
        const context = this.bridge?.context?.();
        if (typeof this.assessMissionPriority === "function") {
          return this.assessMissionPriority(missionId, context);
        }
        return this.assessMission?.(missionId, context);
      };

      const ensurePriorityState = function ensurePriorityState() {
        const stored = Array.isArray(this.memory?.state?.prioritizedMissionIds)
          ? this.memory.state.prioritizedMissionIds
          : [];
        const valid = [...new Set([
          this.primaryMissionId,
          ...stored
        ].filter(Boolean))]
          .filter((id) => this.trees?.has(id))
          .filter((id) => this.ensureLifecycle?.(id)?.status === "active")
          .filter((id) => priorityQueueEligible.call(this, id))
          .slice(0, 4);
        this.prioritizedMissionIds = valid;
        if (this.memory?.state) {
          this.memory.state.prioritizedMissionIds = [...valid];
          this.memory.state.missionGuidanceResumeAt =
            Number(this.memory.state.missionGuidanceResumeAt) || 0;
        }
        return valid;
      };

      Manager.prototype.getPrioritizedMissionIds = function getPrioritizedMissionIds() {
        return [...ensurePriorityState.call(this)];
      };

      Manager.prototype.isMissionGuidanceEnabled = function isMissionGuidanceEnabled() {
        const resumeAt = Number(this.memory?.state?.missionGuidanceResumeAt) || 0;
        if (!resumeAt) return true;
        if (Date.now() >= resumeAt) {
          this.memory.state.missionGuidanceResumeAt = 0;
          this.memory.save?.();
          this.selectionReason =
            "BlueFox reprend automatiquement ses objectifs prioritaires.";
          return true;
        }
        return false;
      };

      Manager.prototype.suspendMissionGuidance = function suspendMissionGuidance(
        durationMs = MISSION_GUIDANCE_DEFAULT_MS,
        reason = "Pilotage missionnel suspendu temporairement par le joueur."
      ) {
        const duration = Math.max(
          30000,
          Number(durationMs) || MISSION_GUIDANCE_DEFAULT_MS
        );
        this.memory.state.missionGuidanceResumeAt = Date.now() + duration;
        this.selectionReason = reason;
        if (this.currentAction) this.cancelCurrentAction?.("manual-free-mode");
        this.memory.save?.();
        this.publish?.();
        return this.memory.state.missionGuidanceResumeAt;
      };

      Manager.prototype.resumeMissionGuidance = function resumeMissionGuidance() {
        this.memory.state.missionGuidanceResumeAt = 0;
        this.selectionReason = "Priorisation des missions réactivée.";
        this.memory.save?.();
        this.publish?.();
        return true;
      };

      const originalSetPrimary = Manager.prototype.setPrimaryMission;
      if (typeof originalSetPrimary === "function") {
        Manager.prototype.setPrimaryMission = function setPrimaryMissionWithQueue(
          missionId,
          publish = true,
          reason = "Priorité choisie explicitement."
        ) {
          const before = ensurePriorityState.call(this);
          const result = originalSetPrimary.call(this, missionId, false, reason);
          if (!result) {
            if (publish) this.publish?.();
            return result;
          }
          const previousRank = new Map(
            before.map((id, index) => [id, index])
          );
          const ranked = (this.activeMissionIds || [])
            .filter((id) => id !== missionId)
            .filter((id) => this.trees?.has(id))
            .filter((id) => this.ensureLifecycle?.(id)?.status === "active")
            .filter((id) => priorityQueueEligible.call(this, id))
            .map((id) => priorityAssessment.call(this, id))
            .filter(Boolean)
            .sort((a, b) =>
              Number(b.score) - Number(a.score) ||
              (previousRank.get(a.missionId) ?? Number.MAX_SAFE_INTEGER) -
                (previousRank.get(b.missionId) ?? Number.MAX_SAFE_INTEGER)
            )
            .map((entry) => entry.missionId);
          const queue = [missionId, ...ranked]
            .filter(Boolean)
            .filter((id, index, values) => values.indexOf(id) === index)
            .slice(0, 4);
          this.prioritizedMissionIds = queue;
          this.memory.state.prioritizedMissionIds = [...queue];
          this.memory.save?.();
          if (publish) this.publish?.();
          return result;
        };
      }

      const originalSuggest = Manager.prototype.suggestPrimaryMission;
      if (typeof originalSuggest === "function") {
        Manager.prototype.suggestPrimaryMission =
          function suggestPrimaryMissionWithQueue(missionId) {
            const definition = this.definition?.(missionId) || {};
            const axis =
              normalizeAxis(definition.passivePriorityAxis) ||
              normalizeAxis(definition.priorityAxis) ||
              normalizeAxis(definition.domain) ||
              actionAxis(this.trees?.get(missionId)?.availableLeaves?.()[0]?.type) ||
              "exploration";
            const beforePrimary = this.primaryMissionId;
            const engine = this.engine || BF.currentEngine || null;
            const existingWindow = activeTraitLocalActionWindow(engine);
            const repeatedDirective = Boolean(
              existingWindow?.kind === "player-opposition" &&
              existingWindow.targetMissionId === missionId
            );
            if (repeatedDirective) {
              clearTraitLocalActionWindow(engine, "player-reissued-directive");
            }
            const result = originalSuggest.call(this, missionId);
            ensurePriorityState.call(this);
            const bac = getBAC();
            const narrativeAxis = String(definition.narrativeAxis || "").trim();
            const alignment = bac?.temperamentAlignment?.(axis, {
              missionId,
              continuity: missionId === beforePrimary,
              novelNarrative: Boolean(
                narrativeAxis &&
                missionId !== beforePrimary &&
                Math.max(0, Number(BF.getNarrativeAxisScore?.(narrativeAxis)) || 0) <= 0
              ),
              psychological: Boolean(definition.obsessionEligible || narrativeAxis),
              opportunity: Boolean(
                definition.opportunity === true ||
                definition.opportunistic === true ||
                /(^|[-_])OPP(?:[-_]|$)/i.test(String(missionId || ""))
              )
            }) || { state: "neutral" };
            if (
              result &&
              !repeatedDirective &&
              alignment.state === "opposed" &&
              beforePrimary &&
              missionId !== beforePrimary
            ) {
              const trust = Number(bac?.getDiagnostics?.().relation?.trustGeneral) || 0;
              const remaining = boundedLocalActionBudget({
                opposition: Math.abs(Number(alignment.score) || 0),
                trust
              });
              beginTraitLocalActionWindow(engine, {
                kind: "player-opposition",
                reason: `trait:${alignment.trait || "opposition"}`,
                targetMissionId: missionId,
                remaining
              });
              this.selectionReason =
                `BlueFox a bien pris en compte la nouvelle priorité, mais termine ${remaining > 1 ? "quelques actions" : "une action"} très locale avant de changer de cap.`;
              this.publish?.();
            }
            return result;
          };
      }

      const originalSelectBestPrimary = Manager.prototype.selectBestPrimary;
      if (typeof originalSelectBestPrimary === "function") {
        Manager.prototype.selectBestPrimary =
          function selectBestPrimaryWithQueue(now, force) {
            const beforePrimary = this.primaryMissionId;
            const result = originalSelectBestPrimary.call(this, now, force);
            const primary = this.primaryMissionId;
            if (primary && primary !== beforePrimary) {
              const assessment = this.assessMission?.(primary, this.bridge?.context?.());
              const traitReason = assessment?.bac?.temperament?.reason || null;
              if (traitReason && Math.abs(Number(assessment?.bac?.temperament?.modifier) || 0) >= 0.5) {
                speakTraitThought(BF.currentEngine, traitReason);
              }
            }
            const previous = ensurePriorityState.call(this);
            const previousRank = new Map(
              previous.map((id, index) => [id, index])
            );
            const ranked = (this.activeMissionIds || [])
              .filter((id) => id !== primary)
              .filter((id) => this.ensureLifecycle?.(id)?.status === "active")
              .filter((id) => priorityQueueEligible.call(this, id))
              .map((id) => priorityAssessment.call(this, id))
              .filter(Boolean)
              .sort((a, b) =>
                Number(b.score) - Number(a.score) ||
                (previousRank.get(a.missionId) ?? Number.MAX_SAFE_INTEGER) -
                  (previousRank.get(b.missionId) ?? Number.MAX_SAFE_INTEGER)
              )
              .map((entry) => entry.missionId);
            this.prioritizedMissionIds = [
              primary,
              ...ranked
            ]
              .filter(Boolean)
              .filter((id) => priorityQueueEligible.call(this, id))
              .filter((id, index, values) => values.indexOf(id) === index)
              .slice(0, 4);
            this.memory.state.prioritizedMissionIds = [
              ...this.prioritizedMissionIds
            ];
            this.memory.save?.();
            return result;
          };
      }

      const originalHasRunnable = Manager.prototype.hasRunnablePrimaryMission;
      if (typeof originalHasRunnable === "function") {
        Manager.prototype.hasRunnablePrimaryMission =
          function hasRunnableGuidedMission() {
            if (!this.isMissionGuidanceEnabled()) return false;
            return originalHasRunnable.call(this);
          };
      }

      // MissionManager owns mission arbitration.
      // The BAC integration must not rebuild a parallel shortlist here.

      const originalGetState = Manager.prototype.getState;
      if (typeof originalGetState === "function") {
        Manager.prototype.getState = function getStateWithGuidance() {
          const state = originalGetState.call(this);
          const queue = ensurePriorityState.call(this);
          const resumeAt =
            Number(this.memory?.state?.missionGuidanceResumeAt) || 0;
          state.prioritizedMissionIds = [...queue];
          state.missionGuidanceEnabled = this.isMissionGuidanceEnabled();
          state.missionGuidanceResumeAt = resumeAt;
          state.missions = (state.missions || []).map((mission) => ({
            ...mission,
            priorityRank:
              queue.indexOf(mission.missionId) >= 0
                ? queue.indexOf(mission.missionId) + 1
                : 0
          }));
          return state;
        };
      }

      const originalStartMission = Manager.prototype.startMission;
      if (typeof originalStartMission === "function") {
        Manager.prototype.startMission =
          function startMissionOfflineGuard(missionId, options = {}) {
            if (BF.offlineReconciliationActive) {
              const lifecycle = this.ensureLifecycle?.(
                missionId,
                "available"
              );
              const alreadyActive = lifecycle?.status === "active";
              if (!alreadyActive) {
                this.memory.state.pendingActivations =
                  this.memory.state.pendingActivations || {};
                this.memory.state.pendingActivations[missionId] = {
                  missionId,
                  prerequisites: Array.isArray(options.prerequisites)
                    ? options.prerequisites.filter(Boolean)
                    : [],
                  options: {
                    ...options,
                    prerequisites: undefined,
                    primary: false
                  },
                  requestedAt: Date.now(),
                  offlineDeferred: true
                };
                if (lifecycle) {
                  lifecycle.status = "available";
                  lifecycle.discoveryReason =
                    lifecycle.discoveryReason ||
                    "Nouvelle piste identifiée hors ligne, en attente du retour du joueur.";
                }
                this.memory.save?.();
                this.publish?.();
                return true;
              }
            }
            return originalStartMission.call(this, missionId, options);
          };
      }

      const originalReevaluate =
        Manager.prototype.reevaluatePendingActivations;
      if (typeof originalReevaluate === "function") {
        Manager.prototype.reevaluatePendingActivations =
          function reevaluatePendingActivationsOfflineGuard() {
            if (BF.offlineReconciliationActive) return false;
            return originalReevaluate.call(this);
          };
      }

      Manager.prototype.__bacPriorityQueueInstalled = true;
    }
    return true;
  };

  const installWorldOverlay = () => {
    const BAC = getBAC();
    const engine = BF.currentEngine;
    if (!BAC || !engine) return false;
    if (engine.__bacRoutingVersion === INTEGRATION_VERSION) return true;
    const originalTargetInteraction = engine.targetInteraction.bind(engine);
    engine.targetInteraction = function targetInteractionWithBAC(object, retry = false) {
      if (!retry && object?.userData?.requestedInteractionSource === "manual") {
        this.__bacTargetLock = null;
        this.__bacFaunaApproach = null;
        const intendedAxis = isCollectableDefinition(objectDefinition(object))
          ? "collection"
          : objectAxis(this, object);
        rememberPreference(intendedAxis, objectKind(object));
      }
      const result = originalTargetInteraction(object, retry);
      if (!result && object?.userData) object.userData.bacAvoidUntil = Date.now() + 20000;
      return result;
    };
    const originalNavigation = engine.handleNavigationSuggestion?.bind(engine);
    if (originalNavigation) {
      engine.handleNavigationSuggestion = function navigationWithBAC(detail) {
        recordSuggestion("exploration", { source: "navigation", mapId: detail?.mapId || null, direction: detail?.direction || null });
        return originalNavigation(detail);
      };
    }
    const originalAutonomy = engine.updateAutonomy.bind(engine);
    engine.updateAutonomy = function updateAutonomyWithBAC(now, authorityContext = null) {
      const cautiousFauna = this.__bacFaunaApproach;
      if (cautiousFauna) {
        const { object, axis, source } = cautiousFauna;
        if (!object?.userData?.active || !faunaRuntimeState(object)) {
          this.__bacFaunaApproach = null;
        } else if (this.character.root.position.distanceTo(this.character.target) > 0.2) {
          return;
        } else if (!cautiousFauna.arrivedAt) {
          cautiousFauna.arrivedAt = now;
          this.character.stop?.();
          this.lastActivityAt = now;
          return;
        } else if (
          cautiousFauna.phase === "outer" &&
          now - cautiousFauna.arrivedAt >= 1200
        ) {
          const anchor = targetPosition(object);
          const fromAnimal = this.character.root.position.clone().sub(anchor).setY(0);
          if (fromAnimal.lengthSq() < 0.001) fromAnimal.set(0, 0, 1);
          fromAnimal.normalize();
          const innerPoint = anchor.clone().addScaledVector(fromAnimal, 3.0);
          const accepted = this.character.setTarget(innerPoint, "walk");
          if (accepted === false) {
            this.__bacFaunaApproach = null;
            return false;
          }
          cautiousFauna.phase = "inner";
          cautiousFauna.cautiousPoint = innerPoint;
          cautiousFauna.arrivedAt = 0;
          this.showWorldMarker?.(innerPoint);
          return;
        } else if (
          cautiousFauna.phase === "inner" &&
          now - cautiousFauna.arrivedAt < 800
        ) {
          return;
        } else if (cautiousFauna.phase === "outer") {
          return;
        } else {
          this.__bacFaunaApproach = null;
          object.userData.requestedInteractionSource = source;
          if (
            axis === "collection" &&
            preferredKind() === objectKind(object)
          ) {
            object.userData.requestedInteraction =
              acquisitionAction(objectDefinition(object)) ||
              object.userData.requestedInteraction;
          }
          return this.targetInteraction(object);
        }
      }
      if (
        this.transitioning ||
        this.pendingGate ||
        this.pendingZoneExploration ||
        this.persistentNavigationIntent ||
        this.missionManager?.currentAction
      ) {
        clearTraitLocalActionWindow(this, "higher-authority-action");
      }
      if (this.transitioning || this.pendingInteraction || this.pendingGate || this.pendingZoneExploration || this.currentRoutine || this.missionManager?.currentAction) {
        if (this.persistentNavigationIntent && !this.transitioning && !this.pendingInteraction && !this.currentRoutine && !this.missionManager?.currentAction) {
          this.resumePersistentNavigation?.();
        }
        return;
      }
      let traitLocalWindow = activeTraitLocalActionWindow(this, now);
      if (now < this.postActionRecoveryUntil || now - this.lastAutonomyAt < 5000) return;
      if (this.character.root.position.distanceTo(this.character.target) > 0.2) return;
      const survival = BF.getSurvivalState?.() || {};
      if (
        survival.needs?.criticalRest ||
        survival.needs?.rest ||
        survival.needs?.food
      ) {
        clearTraitLocalActionWindow(this, "survival-priority");
      }
      traitLocalWindow = activeTraitLocalActionWindow(this, now);
      const fatigue = survival.fatigue || { level: "normal", movement: 1, actionDuration: 1 };
      this.character.fatigueSpeedMultiplier = fatigue.movement || 1;
      const survivalDecision = BAC.evaluateSurvivalDecision?.({
        survival,
        autonomyActionStreak: this.autonomyActionStreak,
        autonomyBreakTarget: this.autonomyBreakTarget
      }) || null;

      const precheckedMissionExecutionAuthority =
        typeof authorityContext?.missionExecutionAuthority === "boolean"
          ? authorityContext.missionExecutionAuthority
          : null;
      const primaryMissionOwnsAction = precheckedMissionExecutionAuthority !== null
        ? precheckedMissionExecutionAuthority
        : typeof this.missionManager?.hasMissionExecutionAuthority === "function"
          ? this.missionManager.hasMissionExecutionAuthority() === true
          : this.missionManager?.hasPrimaryMissionAuthority?.() === true;
      const rationCandidate =
        BF.RationPolicy?.autonomyCandidate?.(this, now) || null;
      const constructionCandidate =
        BF.getConstructionCollectionCandidate?.(this, now) || null;
      const experimentationCandidate =
        pendingExperimentationCandidate(this);
      const tutorialRationConsumeUnlocked = Boolean(
        survivalDecision?.routine === "food" &&
        BF.isTutorialSurvivalCapabilityUnlocked?.("ration-consume") === true
      );
      const tutorialMicroRestUnlocked = Boolean(
        survivalDecision?.routine === "micro-rest" &&
        BF.isTutorialSurvivalCapabilityUnlocked?.("micro-rest") === true
      );
      const tutorialAutonomousRestUnlocked = Boolean(
        ["rest", "critical-rest"].includes(survivalDecision?.routine) &&
        BF.isTutorialSurvivalCapabilityUnlocked?.("autonomous-rest") === true
      );

      if (
        survivalDecision &&
        (
          !primaryMissionOwnsAction ||
          tutorialRationConsumeUnlocked ||
          tutorialMicroRestUnlocked ||
          tutorialAutonomousRestUnlocked
        )
      ) {
        // OFF / pause runtime / fenêtre de grâce restent propriétaires dans WorldEngine.
        if (!this.autonomyAllowed?.(now)) {
          return originalAutonomy(now);
        }

        this.lastAutonomyAt = now;

        if (
          survivalDecision.speech === "critical-rest" &&
          this.speechVisible &&
          now - this.lastFatigueSpeechAt > 15000
        ) {
          this.callbacks.onSpeak(
            "Je suis fatigué, j’ai besoin de récupérer avant de continuer."
          );
          this.lastFatigueSpeechAt = now;
        }

        if (
          survivalDecision.speech === "micro-rest" &&
          this.speechVisible &&
          Math.random() < 0.8 &&
          now - this.lastFatigueSpeechAt > 12000
        ) {
          const phrases = [
            "Je prends un instant pour respirer.",
            "Je souffle un peu, puis je reprends.",
            "Une petite pause, puis je reprends.",
            "Je vais ralentir un peu.",
            "Je reprends mon souffle."
          ];
          this.callbacks.onSpeak(
            phrases[Math.floor(Math.random() * phrases.length)]
          );
          this.lastFatigueSpeechAt = now;
        }

        this.startRoutine(
          survivalDecision.routine,
          now,
          survivalDecision.duration,
          survivalDecision.detail
        );

        if (
          ["micro-rest", "rest", "critical-rest", "food"].includes(
            survivalDecision.routine
          )
        ) {
          this.autonomyActionStreak = 0;
          this.autonomyBreakTarget = 2 + Math.floor(Math.random() * 2);
        }
        return;
      }

      if (primaryMissionOwnsAction && traitLocalWindow) {
        clearTraitLocalActionWindow(this, "primary-mission-authority");
        traitLocalWindow = null;
      }
      if (
        primaryMissionOwnsAction &&
        rationCandidate?.allowDuringPrimaryMission !== true &&
        constructionCandidate?.allowDuringPrimaryMission !== true
      ) return;
      this.lastAutonomyAt = now;
      const decision = createDecisionContext(this);
      const interactables = (this.currentMap?.interactables || [])
        .filter((object) => this.canInteractWith(object, now));
      const activePreference = preferredEntry();
      const preferredCollectables = activePreference
        ? interactables.filter((object) =>
            objectKind(object) === activePreference.kind &&
            isCollectableDefinition(objectDefinition(object))
          )
        : [];
      const normalCollection = interactables.filter(
        (object) => objectAxis(this, object) === "collection"
      );
      const byAxis = {
        collection: [...new Set([
          ...normalCollection,
          ...preferredCollectables
        ])],
        research: interactables.filter((object) => objectAxis(this, object) === "research"),
        relations: interactables.filter((object) => objectAxis(this, object) === "relations")
      };
      const localByAxis = Object.fromEntries(
        Object.entries(byAxis).map(([axis, objects]) => [
          axis,
          objects.filter((object) => routeCost(this, object) <= LOCAL_OPPORTUNITY_RADIUS)
        ])
      );

      const interests = {
        collection: bestInterest(this, byAxis.collection, "collection", decision),
        research: bestInterest(this, byAxis.research, "research", decision),
        relations: bestInterest(this, byAxis.relations, "relations", decision)
      };
      const exploration = explorationContext(this);
      const knownGates = (this.currentMap?.gates || [])
        .filter((gate) => this.discoveredMaps.has(gate.userData.exit.targetMap));

      const preferenceBoosts = {
        collection: preferenceActivityBoost(this, "collection", byAxis.collection),
        research: preferenceActivityBoost(this, "research", byAxis.research),
        relations: preferenceActivityBoost(this, "relations", byAxis.relations)
      };

      const objectWeight = (interest, preferenceBoost = 0) =>
        Math.max(0, 6 + interest * 0.22 + preferenceBoost * 0.35);

      const curiosity = traitBalance("curieux", "prudent");
      const opportunism = traitBalance("opportuniste", "respectueux");
      const localOpportunityCollectables = byAxis.collection.filter((object) => {
        if (routeCost(this, object) > LOCAL_OPPORTUNITY_RADIUS) return false;
        const interest = targetInterest(this, object, "collection", decision);
        return interest.score >= 30 && (
          interest.reasons.includes("new-resource") ||
          interest.reasons.includes("new-object") ||
          objectTags(object).some((tag) => /rare|unique|crystal|relic|valuable/.test(tag))
        );
      });
      if (
        !traitLocalWindow &&
        !primaryMissionOwnsAction &&
        opportunism >= 0.35 &&
        localOpportunityCollectables.length >= 2 &&
        now >= Number(this.__traitLocalOpportunityCooldownUntil || 0)
      ) {
        traitLocalWindow = beginTraitLocalActionWindow(this, {
          kind: "opportunity",
          reason: "opportuniste:opportunite",
          remaining: boundedLocalActionBudget({ opportunism })
        });
        speakTraitThought(this, "opportuniste:opportunite");
      }

      const personalityWeight = (baseWeight, balance, maxRatio, positiveReason, negativeReason = null) => {
        const ratio = Math.max(-maxRatio, Math.min(maxRatio, balance * maxRatio));
        return {
          baseWeight: Math.max(0.001, Number(baseWeight) * (1 + ratio)),
          traitReason: ratio >= 0.06 ? positiveReason : ratio <= -0.06 ? negativeReason : null,
          traitRatio: ratio
        };
      };

      const hasFreshLocalInterest =
        interests.collection >= 30 ||
        interests.research >= 30 ||
        interests.relations >= 30;

      const gateUseful =
        knownGates.length > 0 &&
        (
          exploration.surfacePercent >= 60 ||
          !exploration.next
        ) &&
        !hasFreshLocalInterest;
      const shelterOpportunity = autonomousShelterOpportunity(this, survival);

      const options = [
        ...(constructionCandidate ? [constructionCandidate] : []),
        ...(rationCandidate ? [rationCandidate] : []),
        ...(experimentationCandidate ? [experimentationCandidate] : []),
        {
          id: "survival-rest",
          axis: "survival",
          baseWeight: 28,
          available: Boolean(survival.needs?.rest),
          execute: () => this.startRoutine("rest", now, 8200, {
            restGain: 18,
            pressureReduction: 2
          })
        },
        {
          id: "establish-local-shelter",
          axis: "survival",
          baseWeight: shelterOpportunity?.weight || 0,
          available: Boolean(shelterOpportunity),
          execute: () => {
            if (!shelterOpportunity) return false;
            const missionId = BF.Research?.startConstruction?.(
              shelterOpportunity.kind,
              { mapId: shelterOpportunity.mapId, source: "autonomy" }
            );
            if (!missionId) return false;
            this.callbacks?.onStatus?.(
              shelterOpportunity.kind === "refuge"
                ? "BlueFox estime qu'un refuge local devient utile."
                : "BlueFox estime qu'un camp local devient utile."
            );
            return true;
          }
        },
        {
          id: "research-routine",
          axis: "research",
          baseWeight: 8,
          available: hasUnprocessedResearchMaterial(this, decision),
          execute: () => {
            lastResearchRoutineSourceAt = newestResearchMaterialAt(this, decision);
            this.startRoutine("research", now, 6500);
          }
        },
        {
          id: "relations-object",
          axis: "relations",
          baseWeight: objectWeight(interests.relations, preferenceBoosts.relations),
          available: interests.relations > 0,
          execute: () => commitTarget(
            this,
            chooseLocalTarget(this, traitLocalWindow ? localByAxis.relations : byAxis.relations, "relations", decision),
            "relations"
          )
        },
        {
          id: "collection-object",
          axis: "collection",
          ...personalityWeight(
            objectWeight(interests.collection, preferenceBoosts.collection),
            localOpportunityCollectables.length ? opportunism : 0,
            0.28,
            "opportuniste:opportunite",
            "respectueux:mesure"
          ),
          available: interests.collection > 0,
          execute: () => {
            const collectionPool = traitLocalWindow?.kind === "opportunity"
              ? localOpportunityCollectables
              : traitLocalWindow
                ? localByAxis.collection
                : byAxis.collection;
            return commitTarget(
              this,
              chooseLocalTarget(this, collectionPool, "collection", decision),
              "collection"
            );
          }
        },
        {
          id: "research-object",
          axis: "research",
          baseWeight: objectWeight(interests.research, preferenceBoosts.research),
          available: interests.research > 0,
          execute: () => commitTarget(
            this,
            chooseLocalTarget(this, traitLocalWindow ? localByAxis.research : byAxis.research, "research", decision),
            "research"
          )
        },
        {
          id: "known-gate",
          axis: "exploration",
          ...personalityWeight(12, curiosity, 0.16, "curieux:detour", "prudent:proximite"),
          available:
            gateUseful &&
            this.canStartAutonomousGate?.() !== false,
          execute: () => {
            const gate = [...knownGates]
              .sort((a, b) => directDistance(this, a) - directDistance(this, b))[0];
            this.pendingGate = gate;
            this.character.setTarget(gate.position);
            this.callbacks.onStatus(
              `BlueFox choisit de poursuivre son exploration vers ${this.narrativeMapName?.(gate.userData.exit.targetMap) || BF.maps[gate.userData.exit.targetMap].name}.`
            );
          }
        },
        {
          id: "patrol",
          axis: "exploration",
          ...personalityWeight(exploration.next ? 24 : 0, curiosity, 0.22, "curieux:detour", "prudent:proximite"),
          available: Boolean(exploration.next),
          execute: () => {
            const target = new this.THREE.Vector3(
              exploration.next.x,
              0,
              exploration.next.z
            );
            this.character.setTarget(target);
            this.showWorldMarker(target);
            this.callbacks.onStatus(
              "BlueFox se dirige vers une partie encore peu connue de la zone."
            );
          }
        }
      ];
      const preferredCollectionOption = options.find(
        (option) => option.id === "collection-object"
      );
      const preferenceCommitmentActive =
        Boolean(
          activePreference &&
          activePreference.lastAxis === "collection" &&
          Date.now() - activePreference.lastAt < PREFERENCE_COMMIT_MS &&
          preferredCollectables.length > 0 &&
          preferredCollectionOption?.available &&
          rationCandidate?.missionDriven !== true &&
          constructionCandidate?.missionDriven !== true &&
          experimentationCandidate?.missionDriven !== true
        );

      const localActionOptions = options.filter((option) =>
        ["collection-object", "research-object", "relations-object"].includes(option.id) &&
        option.available !== false &&
        (localByAxis[option.axis]?.length || 0) > 0
      );
      let selected = null;
      if (traitLocalWindow?.kind === "opportunity") {
        selected = localOpportunityCollectables.length ? preferredCollectionOption : null;
      } else if (traitLocalWindow?.kind === "player-opposition") {
        selected = weightedPick(localActionOptions);
      } else {
        selected = preferenceCommitmentActive
          ? preferredCollectionOption
          : weightedPick(options);
      }
      if (traitLocalWindow && !selected) {
        clearTraitLocalActionWindow(this, "no-local-action");
        traitLocalWindow = null;
        if (primaryMissionOwnsAction) return;
        selected = preferenceCommitmentActive
          ? preferredCollectionOption
          : weightedPick(options);
      }
      if (!selected) return originalAutonomy(now);
      if (lastTargetDecision) {
        lastTargetDecision.preferenceActivityBoosts = { ...preferenceBoosts };
        lastTargetDecision.interests = { ...interests };
        lastTargetDecision.exploration = {
          surfacePercent: exploration.surfacePercent,
          hasUnexploredTarget: Boolean(exploration.next),
          gateUseful
        };
      }
      const selectedResult = selected.execute();
      if (
        selectedResult !== false &&
        traitLocalWindow &&
        ["collection-object", "research-object", "relations-object"].includes(selected.id)
      ) {
        consumeTraitLocalAction(this, selected.id);
      }
      if (lastTargetDecision) {
        lastTargetDecision.traitReason = selected.traitReason || null;
        lastTargetDecision.traitRatio = Number(selected.traitRatio) || 0;
        lastTargetDecision.localOpportunityCollectables = localOpportunityCollectables.length;
      }
      if (selectedResult !== false && selected.traitReason && Math.abs(Number(selected.traitRatio) || 0) >= 0.06) {
        speakTraitThought(this, selected.traitReason);
      }
      if (selected.id !== "known-gate" && selectedResult !== false) {
        this.noteLocalAutonomousDecision?.();
      }
    };
    const originalEnsureActivity = engine.ensureActivity?.bind(engine);
    if (originalEnsureActivity) {
      engine.ensureActivity = function ensureActivityAsWatchdog(now) {
        const idle = now - Number(this.lastActivityAt || now);
        if (idle < 12000 || this.transitioning || this.pendingInteraction || this.currentRoutine) return;
        // Un personnage encore en route n'est pas inactif : ne pas engager le
        // watchdog ni rescanner l'autorité missionnelle pendant le déplacement.
        if (this.character.root.position.distanceTo(this.character.target) > 0.2) return;
        // Réutilise la cadence d'autonomie existante : le watchdog ne doit pas
        // rescanner l'autorité missionnelle à chaque update monde pendant un idle prolongé.
        if (now - Number(this.lastAutonomyAt || 0) < 5000) return;
        const missionExecutionAuthority =
          typeof this.missionManager?.hasMissionExecutionAuthority === "function"
            ? this.missionManager.hasMissionExecutionAuthority() === true
            : this.missionManager?.hasPrimaryMissionAuthority?.() === true;
        if (missionExecutionAuthority) {
          this.lastAutonomyAt = now;
          return;
        }

        if (this.pendingGate) {
          const survival = BF.getSurvivalState?.() || {};
          const lastManualAt = Number(survival.lastManualAt) || 0;
          const recentlyInterruptedByPlayer = lastManualAt > 0 && now - lastManualAt < 22000;
          const moving = Number(this.character.speed) > 0.08;

          if (moving) {
            this.lastActivityAt = now;
            return;
          }

          if (recentlyInterruptedByPlayer && !this.persistentNavigationIntent) {
            this.pendingGate = null;
            this.character.stop?.();
            this.character.setTarget?.(this.character.root.position);
            this.lastAutonomyAt = 0;
          } else {
            this.character.setTarget(this.pendingGate.position, "run");
            this.showWorldMarker?.(this.pendingGate.position);
            this.lastActivityAt = now;
            return;
          }
        }

        this.lastAutonomyAt = 0;
        this.updateAutonomy(now, { missionExecutionAuthority: false });
      };
    }
    engine.__bacRoutingVersion = INTEGRATION_VERSION;
    engine.__bacIntegrated = true;
    engine.chooseBACTarget = (objects, axis) =>
      chooseLocalTarget(engine, objects, axis, createDecisionContext(engine));
    return true;
  };
  const reconnect = () => {
    const connected =
      Boolean(installMissionOverlay() && installWorldOverlay());
    const manager = BF.currentEngine?.missionManager;
    if (manager) {
      BF.suspendMissionGuidance = (durationMs) =>
        manager.suspendMissionGuidance?.(durationMs);
      BF.resumeMissionGuidance = () =>
        manager.resumeMissionGuidance?.();
      BF.getPrioritizedMissionIds = () =>
        manager.getPrioritizedMissionIds?.() || [];
    }
    return connected;
  };
  const connectWithRetries = () => { if (reconnect()) return true; let attempts = 0; const retry = global.setInterval(() => { attempts += 1; if (reconnect() || attempts >= 80) global.clearInterval(retry); }, 250); return false; };
  const installDiagnosticBridge = () => {
    if (BF.__bacDiagnosticBridgeInstalled) return true;
    const originalDiagnostics = typeof BF.getBACDiagnostics === "function" ? BF.getBACDiagnostics.bind(BF) : null;
    BF.getBACDiagnostics = () => {
      const base = originalDiagnostics?.() || {};
      const engine = BF.currentEngine;
      const worldInstalled = Boolean(
        engine?.__bacIntegrated === true &&
        engine?.__bacRoutingVersion === INTEGRATION_VERSION &&
        typeof engine?.chooseBACTarget === "function"
      );
      return { ...base, installed: worldInstalled, worldOverlayInstalled: worldInstalled, integrationVersion: engine?.__bacRoutingVersion || INTEGRATION_VERSION, currentEngineAvailable: Boolean(engine),
        autonomyHook: engine?.updateAutonomy?.name || "",
        autonomyUnderlyingHook: "",
        rationAutonomyDecision: engine?.__lastRationAutonomyDecision || null, targetPreference: (() => { const e = preferredEntry(); return e ? { kind:e.kind, count:e.count, strength:Number(e.strength.toFixed(2)), ageMs:Date.now()-e.lastAt, lastAxis:e.lastAxis } : null; })(),
        lastTargetDecision,
        traitThoughtCooldownMs: TRAIT_THOUGHT_COOLDOWN_MS,
        lastTraitThoughtAt,
        traitLocalActionWindow: activeTraitLocalActionWindow(engine),
        lastTraitLocalActionWindow: engine?.__lastTraitLocalActionWindow || null,
        traitLocalActionMax: TRAIT_LOCAL_ACTION_MAX,
        traitLocalActionWindowMs: TRAIT_LOCAL_ACTION_WINDOW_MS,
        shelterOpportunity: autonomousShelterOpportunity(engine, BF.getSurvivalState?.() || {}),
        preferenceCommitment: (() => {
          const e = preferredEntry();
          if (!e) return null;
          return {
            active: e.lastAxis === "collection" &&
              Date.now() - e.lastAt < PREFERENCE_COMMIT_MS,
            remainingMs: Math.max(
              0,
              PREFERENCE_COMMIT_MS - (Date.now() - e.lastAt)
            )
          };
        })(),
        missionOverlayInstalled: Boolean(base.missionOverlayInstalled || Missions.MissionPlanner?.prototype?.__bluefoxBAC2ScoreInstalled || Missions.MissionManager?.prototype?.__bacRoutingFix2Manager) };
    };
    BF.__bacDiagnosticBridgeInstalled = true;
    return true;
  };
  BF.reconnectBAC = reconnect;
  installDiagnosticBridge();
  global.addEventListener("bluefox:scene-images", () => global.setTimeout(reconnect, 0));
  global.addEventListener("bluefox:map-transition-completed", () => global.setTimeout(reconnect, 0));
  global.addEventListener("bluefox:bac-ready", () => global.setTimeout(reconnect, 0));
  connectWithRetries();
})(window);
