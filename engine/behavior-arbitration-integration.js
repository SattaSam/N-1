(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions || {};
  const INTEGRATION_VERSION = "bac-knowledge-routing-r16c";
  const PREFERENCE_DECAY_MS = 20 * 60 * 1000;
  const PREFERENCE_WINDOW_MS = 4 * 60 * 1000;
  const PREFERENCE_COMMIT_MS = 3 * 60 * 1000;
  const TARGET_LOCK_MS = 12000;
  const TARGET_SWITCH_RATIO = 0.62;
  const TARGET_CANDIDATES = 6;
  const MISSION_GUIDANCE_DEFAULT_MS = 4 * 60 * 1000;
  const MISSION_PRIORITY_WEIGHTS = Object.freeze([100, 45, 20]);
  const preferenceMemory = new Map();
  let lastTargetDecision = null;
  let lastResearchRoutineSourceAt = 0;

  const getBAC = () => BF.BAC || null;
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
  const scoreModifier = (axis, baseScore) => {
    const BAC = getBAC();
    if (!BAC || !axis || !Number.isFinite(Number(baseScore))) return 0;
    return typeof BAC.priorityModifier === "function" ? Number(BAC.priorityModifier(axis, baseScore)?.modifier) || 0 : 0;
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

  const historyForObject = (engine, object) => {
    const { objectId, instanceId } = objectIdentity(object);
    return (BF.ObjectEvents?.history?.() || []).filter((event) => {
      if (!event) return false;
      if (event.mapId && engine?.currentMapId && event.mapId !== engine.currentMapId) return false;
      if (objectId && event.objectId === objectId) return true;
      if (instanceId && event.instanceId === instanceId) return true;
      return false;
    });
  };

  const researchKnowledge = (engine, object) => {
    const events = historyForObject(engine, object);
    const types = researchEventTypes();
    return {
      seen: events.some((event) => types.seen.has(event.type)),
      inspected: events.some((event) => types.inspected.has(event.type)),
      analyzed: events.some((event) => types.analyzed.has(event.type)),
      latestAt: events.reduce((latest, event) =>
        Math.max(latest, Number(event.at) || 0), 0)
    };
  };

  const instanceResearchKnowledge = (engine, object) => {
    const { instanceId } = objectIdentity(object);
    if (!instanceId) return { seen:false, inspected:false, analyzed:false, latestAt:0 };
    const events = (BF.ObjectEvents?.history?.() || []).filter((event) => {
      if (!event || event.instanceId !== instanceId) return false;
      if (event.mapId && engine?.currentMapId && event.mapId !== engine.currentMapId) return false;
      return true;
    });
    const types = researchEventTypes();
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

  const targetInterest = (engine, object, axis) => {
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
    const knowledge = mapKnowledge(engine);
    const knownObject = Boolean(objectId && knowledge.uniqueObjects?.[objectId]);
    const knownInstance = Boolean(instanceId && knowledge.uniqueInstances?.[instanceId]);
    const knownResource = Boolean(kind && knowledge.uniqueResources?.[kind]);
    const objectResearch = researchKnowledge(engine, object);
    const instanceResearch = instanceResearchKnowledge(engine, object);
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
        return { score: -1000, reasons: ["incompatible"] };
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
        return { score: -1000, reasons: ["incompatible"] };
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
      return { score: -1000, reasons: ["unsupported-axis"] };
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

    return {
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
    };
  };

  const bestInterest = (engine, objects, axis) =>
    objects.reduce(
      (best, object) => Math.max(best, targetInterest(engine, object, axis).score),
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

  const newestResearchMaterialAt = (engine) => {
    const types = BF.ObjectEvents?.types || {};
    return (BF.ObjectEvents?.history?.() || []).reduce((latest, event) => {
      if (!event) return latest;
      if (event.mapId && engine?.currentMapId && event.mapId !== engine.currentMapId) {
        return latest;
      }
      if (![
        types.OBJECT_SEEN,
        types.OBJECT_INSPECTED,
        types.OBJECT_ANALYZED,
        types.PHENOMENON_OBSERVED,
        types.KNOWLEDGE_ACQUIRED
      ].includes(event.type)) {
        return latest;
      }
      return Math.max(latest, Number(event.at) || 0);
    }, 0);
  };

  const hasUnprocessedResearchMaterial = (engine) =>
    newestResearchMaterialAt(engine) > lastResearchRoutineSourceAt;

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
  const targetPosition = (object) =>
    object?.userData?.worldAnchor?.position || object?.position || null;

  const directDistance = (engine, object) => {
    const point = targetPosition(object);
    return point && engine?.character?.root?.position
      ? engine.character.root.position.distanceTo(point)
      : Infinity;
  };

  const routeCost = (engine, object) => {
    try {
      const approach = engine.interactionApproachPoint?.(object);
      const point = approach?.point || approach?.position || null;
      if (!point) return directDistance(engine, object);
      const planner = engine.character?.pathPlanner;
      if (!planner?.plan) {
        return engine.character.root.position.distanceTo(point);
      }
      const anchor = object?.userData?.worldAnchor || object;
      const colliders = (engine.currentMap?.colliders || [])
        .filter((collider) => collider.owner !== anchor);
      const path = planner.plan(
        engine.character.root.position,
        point,
        colliders,
        engine.character.radius,
        0.16
      );
      if (!Array.isArray(path) || !path.length) {
        return engine.character.root.position.distanceTo(point);
      }
      return path.reduce((total, waypoint, index) => {
        const previous = index ? path[index - 1] : engine.character.root.position;
        return total + previous.distanceTo(waypoint);
      }, 0);
    } catch (_) {
      return directDistance(engine, object);
    }
  };

  const chooseLocalTarget = (engine, objects, axis) => {
    if (!objects?.length) return null;
    const now = Date.now();
    const preferred = preferredKind();
    const valid = objects.filter((object) =>
      !object.userData?.bacAvoidUntil || object.userData.bacAvoidUntil <= now
    );
    const available = valid.length ? valid : objects;

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

    const ranked = candidatePool
      .map((object) => {
        const interest = targetInterest(engine, object, axis);
        return {
          object,
          interest: interest.score,
          interestBand: Math.floor(interest.score / 10),
          reasons: interest.reasons,
          direct: directDistance(engine, object),
          cost: routeCost(engine, object)
        };
      })
      .filter((entry) => entry.interest > 0)
      .sort((left, right) =>
        right.interestBand - left.interestBand ||
        left.cost - right.cost ||
        right.interest - left.interest ||
        left.direct - right.direct
      );

    const shortlist = ranked.slice(0, TARGET_CANDIDATES);
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
      newestResearchMaterialAt: newestResearchMaterialAt(engine),
      lastResearchRoutineSourceAt,
      candidates: shortlist.map((entry) => ({
        kind: objectKind(entry.object),
        action: objectAction(engine, entry.object),
        finalIntent: axis === "collection"
          ? acquisitionAction(objectDefinition(entry.object))
          : null,
        interest: entry.interest,
        reasons: entry.reasons,
        researchKnowledge: targetInterest(engine, entry.object, axis).researchKnowledge || null,
        directDistance: Number(entry.direct.toFixed?.(2) ?? entry.direct),
        routeCost: Number(entry.cost.toFixed?.(2) ?? entry.cost)
      }))
    };
    return selected;
  };

  const commitTarget = (engine, object, axis, source = "autonomy") => {
    if (!object) return false;
    const now = Date.now();

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
    const Planner = Missions.MissionPlanner;
    if (Planner?.prototype && !Planner.prototype.__bacRoutingFix2Planner) {
      const originalScore = Planner.prototype.score;
      Planner.prototype.score = function scoreWithBAC(node, context) {
        const base = originalScore.call(this, node, context);
        if (!Number.isFinite(base) || base < 0) return base;
        const type = Missions.normalizeActionType?.(node?.type) || node?.type;
        const vital =
          (type === Missions.ActionType?.REST && context?.needs?.rest) ||
          (type === Missions.ActionType?.EAT && context?.needs?.food);
        if (vital) return base;
        const axis = normalizeAxis(node?.params?.priorityAxis) || actionAxis(type);
        return base + scoreModifier(axis, base);
      };
      Planner.prototype.__bacRoutingFix2Planner = true;
    }

    const Manager = Missions.MissionManager;
    if (Manager?.prototype && !Manager.prototype.__bacPriorityQueueInstalled) {
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
          .slice(0, 3);
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
          const queue = [
            missionId,
            ...before.filter((id) => id !== missionId)
          ]
            .filter((id) => this.trees?.has(id))
            .filter((id) => this.ensureLifecycle?.(id)?.status === "active")
            .slice(0, 3);
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
            const result = originalSuggest.call(this, missionId);
            ensurePriorityState.call(this);
            return result;
          };
      }

      const originalSelectBestPrimary = Manager.prototype.selectBestPrimary;
      if (typeof originalSelectBestPrimary === "function") {
        Manager.prototype.selectBestPrimary =
          function selectBestPrimaryWithQueue(now, force) {
            const result = originalSelectBestPrimary.call(this, now, force);
            const primary = this.primaryMissionId;
            const ranked = (this.activeMissionIds || [])
              .filter((id) => id !== primary)
              .filter((id) => this.ensureLifecycle?.(id)?.status === "active")
              .map((id) => this.assessMission?.(id, this.bridge?.context?.()))
              .filter(Boolean)
              .sort((a, b) => Number(b.score) - Number(a.score))
              .map((entry) => entry.missionId);
            const current = ensurePriorityState
              .call(this)
              .filter((id) => id !== primary && ranked.includes(id));
            this.prioritizedMissionIds = [
              primary,
              ...current,
              ...ranked
            ]
              .filter(Boolean)
              .filter((id, index, values) => values.indexOf(id) === index)
              .slice(0, 3);
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

      const originalChoose = Manager.prototype.chooseRunnableMissionAction;
      if (typeof originalChoose === "function") {
        Manager.prototype.chooseRunnableMissionAction =
          function choosePrioritizedMissionAction(context) {
            if (!this.isMissionGuidanceEnabled()) return null;
            const queue = ensurePriorityState.call(this);
            const candidates = queue
              .map((missionId, rank) => {
                const assessment = this.assessMission?.(missionId, context);
                if (!assessment?.action) return null;
                return {
                  missionId,
                  action: assessment.action,
                  primary: rank === 0,
                  rank
                };
              })
              .filter(Boolean);

            if (!candidates.length) return originalChoose.call(this, context);

            const vital = candidates.find((candidate) =>
              (candidate.action.type === Missions.ActionType?.REST &&
                context?.needs?.rest) ||
              (candidate.action.type === Missions.ActionType?.EAT &&
                context?.needs?.food)
            );
            if (vital) return vital;

            const options = candidates.map((candidate) => ({
              id: `mission-priority-${candidate.rank + 1}:${candidate.missionId}`,
              axis:
                this.missionActionAxis?.(
                  candidate.missionId,
                  candidate.action
                ) || "exploration",
              baseWeight:
                MISSION_PRIORITY_WEIGHTS[candidate.rank] || 10,
              candidate
            }));
            const selected = BAC.weightedPick?.(options);
            return selected?.candidate || candidates[0];
          };
      }

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
    engine.updateAutonomy = function updateAutonomyWithBAC(now) {
      if (this.transitioning || this.pendingInteraction || this.pendingGate || this.pendingZoneExploration || this.currentRoutine || this.missionManager?.currentAction) {
        if (this.persistentNavigationIntent && !this.transitioning && !this.pendingInteraction && !this.currentRoutine && !this.missionManager?.currentAction) {
          this.resumePersistentNavigation?.();
        }
        return;
      }
      if (now < this.postActionRecoveryUntil || now - this.lastAutonomyAt < 5000) return;
      if (this.character.root.position.distanceTo(this.character.target) > 0.2) return;
      const survival = BF.getSurvivalState?.() || {};
      const fatigue = survival.fatigue || { level: "normal", movement: 1, actionDuration: 1 };
      this.character.fatigueSpeedMultiplier = fatigue.movement || 1;
      if (this.missionManager?.hasRunnablePrimaryMission?.()) return;
      if (survival.needs?.criticalRest || this.autonomyActionStreak >= this.autonomyBreakTarget) {
        return originalAutonomy(now);
      }
      this.lastAutonomyAt = now;
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

      const interests = {
        collection: bestInterest(this, byAxis.collection, "collection"),
        research: bestInterest(this, byAxis.research, "research"),
        relations: bestInterest(this, byAxis.relations, "relations")
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

      const options = [
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
          id: "research-routine",
          axis: "research",
          baseWeight: 8,
          available: hasUnprocessedResearchMaterial(this),
          execute: () => {
            lastResearchRoutineSourceAt = newestResearchMaterialAt(this);
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
            chooseLocalTarget(this, byAxis.relations, "relations"),
            "relations"
          )
        },
        {
          id: "collection-object",
          axis: "collection",
          baseWeight: objectWeight(interests.collection, preferenceBoosts.collection),
          available: interests.collection > 0,
          execute: () => commitTarget(
            this,
            chooseLocalTarget(this, byAxis.collection, "collection"),
            "collection"
          )
        },
        {
          id: "research-object",
          axis: "research",
          baseWeight: objectWeight(interests.research, preferenceBoosts.research),
          available: interests.research > 0,
          execute: () => commitTarget(
            this,
            chooseLocalTarget(this, byAxis.research, "research"),
            "research"
          )
        },
        {
          id: "known-gate",
          axis: "exploration",
          baseWeight: 12,
          available: gateUseful,
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
          baseWeight: exploration.next ? 24 : 0,
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
          preferredCollectionOption?.available
        );

      const selected = preferenceCommitmentActive
        ? preferredCollectionOption
        : weightedPick(options);
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
      selected.execute();
    };
    const originalEnsureActivity = engine.ensureActivity?.bind(engine);
    if (originalEnsureActivity) {
      engine.ensureActivity = function ensureActivityAsWatchdog(now) {
        const idle = now - Number(this.lastActivityAt || now);
        if (idle < 12000 || this.transitioning || this.pendingInteraction || this.currentRoutine) return;

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
        this.updateAutonomy(now);
      };
    }
    engine.__bacRoutingVersion = INTEGRATION_VERSION;
    engine.__bacIntegrated = true;
    engine.chooseBACTarget = (objects, axis) => chooseLocalTarget(engine, objects, axis);
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
        autonomyUnderlyingHook: engine?.__autonomyBeforeRationAI?.name || "",
        rationAutonomyDecision: engine?.__lastRationAutonomyDecision || null, targetPreference: (() => { const e = preferredEntry(); return e ? { kind:e.kind, count:e.count, strength:Number(e.strength.toFixed(2)), ageMs:Date.now()-e.lastAt, lastAxis:e.lastAxis } : null; })(),
        lastTargetDecision,
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
        missionOverlayInstalled: Boolean(base.missionOverlayInstalled || Missions.MissionPlanner?.prototype?.__bacRoutingFix2Planner || Missions.MissionManager?.prototype?.__bacRoutingFix2Manager) };
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
