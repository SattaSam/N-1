(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_odyssey_save_v1";
  const VERSION = "BAC-3.0";
  const PRIORITY_BUDGET = 225;
  const MAX_DECISION_INFLUENCE = 0.25;
  const RELATION_STORAGE_KEY = "bluefox_bac_relation_v1";

  const AXES = Object.freeze([
    "exploration",
    "collection",
    "research",
    "relations",
    "survival"
  ]);

  const DEFAULT_PRIORITIES = Object.freeze({
    exploration: 45,
    collection: 45,
    research: 45,
    relations: 45,
    survival: 45
  });


  const DEFAULT_RELATION_STATE = Object.freeze({
    version: 1,
    awareness: 0,
    trustGeneral: 0,
    trustByAxis: {
      exploration: 0,
      collection: 0,
      research: 0,
      relations: 0,
      survival: 0
    },
    emotions: {
      curiosity: 20,
      serenity: 55,
      concern: 10,
      determination: 25,
      frustration: 0
    },
    lastPlayerSuggestion: null,
    lastReactionAt: 0,
    updatedAt: Date.now()
  });

  const PRIORITY_ALIASES = Object.freeze({
    exploration: ["exploration", "Explorer", "Exploration"],
    collection: ["collection", "collecte", "Collecte"],
    research: ["research", "recherche", "Recherche"],
    relations: ["relations", "relation", "Relation", "Relations"],
    survival: ["survival", "survie", "repos", "Repos", "Survie"]
  });

  const clamp = (value, min = 0, max = 100) =>
    Math.max(min, Math.min(max, Number(value) || 0));

  const clone = (value) => value == null
    ? value
    : JSON.parse(JSON.stringify(value));

  const loadLegacySave = () => {
    try {
      const saved = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "null");
      return saved && typeof saved === "object" && !Array.isArray(saved)
        ? saved
        : {};
    } catch {
      return {};
    }
  };

  const firstNumeric = (source, keys, fallback) => {
    for (const key of keys) {
      const value = Number(source?.[key]);
      if (Number.isFinite(value)) return clamp(value);
    }
    return fallback;
  };

  const readPriorities = () => {
    const source = loadLegacySave().priorities || {};
    return AXES.reduce((result, axis) => {
      result[axis] = firstNumeric(
        source,
        PRIORITY_ALIASES[axis],
        DEFAULT_PRIORITIES[axis]
      );
      return result;
    }, {});
  };

  const readTraits = () => {
    const saved = loadLegacySave();
    const source = saved.personality || saved.traits || saved.personnalite || {};
    return source && typeof source === "object" && !Array.isArray(source)
      ? clone(source)
      : {};
  };

  const readProfile = () => {
    const priorities = readPriorities();
    const allocated = AXES.reduce((total, axis) => total + priorities[axis], 0);
    return {
      priorities,
      traits: readTraits(),
      budget: {
        target: PRIORITY_BUDGET,
        allocated,
        remaining: PRIORITY_BUDGET - allocated,
        valid: allocated === PRIORITY_BUDGET
      }
    };
  };


  const loadRelationState = () => {
    const base = clone(DEFAULT_RELATION_STATE);
    try {
      const saved = JSON.parse(
        global.localStorage.getItem(RELATION_STORAGE_KEY) || "null"
      );
      if (!saved || saved.version !== 1) return base;
      return {
        ...base,
        ...saved,
        trustByAxis: {
          ...base.trustByAxis,
          ...(saved.trustByAxis || {})
        },
        emotions: {
          ...base.emotions,
          ...(saved.emotions || {})
        }
      };
    } catch {
      return base;
    }
  };

  const relation = loadRelationState();

  const saveRelation = () => {
    relation.updatedAt = Date.now();
    global.localStorage.setItem(
      RELATION_STORAGE_KEY,
      JSON.stringify(relation)
    );
  };

  const clampEmotion = (value) => clamp(value, 0, 100);
  const clampTrust = (value) => Math.max(-100, Math.min(100, Number(value) || 0));

  const awarenessStage = () => {
    const value = clamp(relation.awareness, 0, 100);
    if (value < 20) return "intuition";
    if (value < 40) return "hasard";
    if (value < 60) return "presence";
    if (value < 80) return "guide";
    return relation.trustGeneral >= 0 ? "compagnon" : "donneur-ordre";
  };

  const dominantEmotion = () =>
    Object.entries(relation.emotions)
      .sort((left, right) => right[1] - left[1])[0]?.[0] || "serenity";

  const decayEmotions = () => {
    relation.emotions.curiosity = clampEmotion(
      relation.emotions.curiosity + (20 - relation.emotions.curiosity) * 0.06
    );
    relation.emotions.serenity = clampEmotion(
      relation.emotions.serenity + (55 - relation.emotions.serenity) * 0.05
    );
    relation.emotions.concern = clampEmotion(
      relation.emotions.concern + (10 - relation.emotions.concern) * 0.08
    );
    relation.emotions.determination = clampEmotion(
      relation.emotions.determination + (25 - relation.emotions.determination) * 0.05
    );
    relation.emotions.frustration = clampEmotion(
      relation.emotions.frustration * 0.9
    );
  };

  const shiftEmotion = (changes = {}) => {
    Object.entries(changes).forEach(([key, delta]) => {
      if (!Object.prototype.hasOwnProperty.call(relation.emotions, key)) return;
      relation.emotions[key] = clampEmotion(
        relation.emotions[key] + Number(delta || 0)
      );
    });
    saveRelation();
  };

  const suggestionMultiplier = (axis) => {
    const normalized = normalizeAxis(axis) || "exploration";
    const domainTrust = clampTrust(relation.trustByAxis[normalized]);
    const combined = clampTrust(
      relation.trustGeneral * 0.4 + domainTrust * 0.6
    );
    if (combined >= 0) {
      return 1 + (combined / 100) * 0.5;
    }
    return 1 + (combined / 100) * 1.5;
  };

  const recordPlayerSuggestion = (axis, detail = {}) => {
    const normalized = normalizeAxis(axis) || "exploration";
    relation.awareness = clamp(relation.awareness + 1.5, 0, 100);
    relation.lastPlayerSuggestion = {
      axis: normalized,
      detail: clone(detail),
      at: Date.now(),
      resolved: false
    };
    saveRelation();
    return relation.lastPlayerSuggestion;
  };

  const evaluatePlayerSuggestion = (result = {}) => {
    const suggestion = relation.lastPlayerSuggestion;
    if (!suggestion || suggestion.resolved) return null;

    const priorities = readPriorities();
    const axisPriority = priorities[suggestion.axis] ?? 50;
    const useful = result.useful !== false;
    const successful = result.success !== false;
    const aligned = axisPriority >= 50;
    let delta = 0;

    if (successful && useful && aligned) delta = 5;
    else if (successful && useful) delta = 2;
    else if (!successful && !aligned) delta = -6;
    else if (!useful && !aligned) delta = -4;
    else delta = -1;

    relation.trustByAxis[suggestion.axis] = clampTrust(
      relation.trustByAxis[suggestion.axis] + delta
    );
    relation.trustGeneral = clampTrust(
      relation.trustGeneral + delta * 0.35
    );
    relation.awareness = clamp(relation.awareness + 1, 0, 100);
    suggestion.resolved = true;
    suggestion.result = {
      ...clone(result),
      delta,
      at: Date.now()
    };

    if (delta > 0) {
      shiftEmotion({
        determination: 4,
        serenity: 3,
        curiosity: suggestion.axis === "exploration" ? 3 : 1,
        frustration: -4
      });
    } else {
      shiftEmotion({
        frustration: Math.abs(delta) * 2,
        concern: Math.abs(delta),
        serenity: -Math.abs(delta)
      });
    }
    saveRelation();
    return { suggestion: clone(suggestion), delta };
  };

  const reactionText = (evaluation) => {
    if (!evaluation) return "";
    const stage = awarenessStage();
    const axis = evaluation.suggestion.axis;
    const positive = evaluation.delta > 0;
    const highTrust = suggestionMultiplier(axis) >= 1.35;
    const rebellious = suggestionMultiplier(axis) < 0.25;

    if (stage === "intuition") {
      return positive
        ? "Mon instinct m’a bien orienté."
        : "Étrange… pourquoi ai-je eu envie de faire ça ?";
    }
    if (stage === "hasard") {
      return positive
        ? "Le hasard semble insister dans cette direction."
        : "Mais pourquoi je fais ça, moi ?";
    }
    if (stage === "presence") {
      return positive
        ? "Quelque chose semble réellement m’orienter."
        : "Cette influence me pousse dans une direction qui ne me ressemble pas.";
    }
    if (stage === "guide") {
      if (positive && highTrust) return "On dirait que le destin m’a mis sur cette voie.";
      if (!positive) return "Je ne comprends pas encore ce que mon guide cherche à obtenir.";
      return "Je commence à comprendre la direction que mon guide m’indique.";
    }
    if (stage === "compagnon") {
      return positive
        ? "Tu avais raison. Cette voie me correspond."
        : "Je t’écoute, mais cette décision ne me ressemble pas.";
    }
    if (rebellious) return "Non. Cette fois, je préfère suivre mon propre jugement.";
    return positive
      ? "Ton ordre s’est révélé utile."
      : "Tu me donnes encore un ordre contraire à ce que je suis.";
  };

  const speakReaction = (evaluation) => {
    const engine = BF.currentEngine;
    if (!engine?.callbacks?.onSpeak || !evaluation) return false;
    const now = Date.now();
    if (now - relation.lastReactionAt < 12000) return false;
    const text = reactionText(evaluation);
    if (!text) return false;
    engine.callbacks.onSpeak(text);
    relation.lastReactionAt = now;
    saveRelation();
    return true;
  };

  const state = {
    enabled: true,
    passive: false,
    installed: false,
    initializedAt: Date.now(),
    decisions: 0,
    lastDecision: null,
    lastObservedAt: 0,
    lastEvent: null,
    missionOverlayInstalled: false,
    relationOverlayInstalled: false
  };

  const observe = (type, detail = {}) => {
    state.lastObservedAt = Date.now();
    state.lastEvent = {
      type: String(type || "unknown"),
      detail: clone(detail || {}),
      at: state.lastObservedAt
    };
  };

  const axisWeight = (axis) => {
    const value = readPriorities()[axis] ?? 50;
    return 1 + ((value - 50) / 50) * MAX_DECISION_INFLUENCE;
  };

  const weightedPick = (options) => {
    const valid = options.filter((option) =>
      option && option.available !== false && Number(option.baseWeight) > 0
    );
    if (!valid.length) return null;

    const weighted = valid.map((option) => ({
      ...option,
      priority: readPriorities()[option.axis] ?? 50,
      finalWeight: Math.max(
        0.001,
        Number(option.baseWeight) * axisWeight(option.axis)
      )
    }));

    const total = weighted.reduce((sum, option) => sum + option.finalWeight, 0);
    let roll = Math.random() * total;
    const selected = weighted.find((option) => {
      roll -= option.finalWeight;
      return roll <= 0;
    }) || weighted[weighted.length - 1];

    state.decisions += 1;
    state.lastDecision = {
      at: Date.now(),
      selected: selected.id,
      axis: selected.axis,
      priority: selected.priority,
      finalWeight: selected.finalWeight,
      options: weighted.map((option) => ({
        id: option.id,
        axis: option.axis,
        priority: option.priority,
        baseWeight: option.baseWeight,
        finalWeight: option.finalWeight
      }))
    };
    return selected;
  };

  const interactionAxis = (engine, object) => {
    const profile = engine.interactionProfile(object);
    const data = object?.userData || {};
    const definition = data.functional ||
      BF.ObjectLibrary?.get?.(data.libraryType) ||
      BF.ObjectLibrary?.get?.(data.kind) ||
      {};
    const category = String(
      definition.category ||
      data.category ||
      definition.spawn?.category ||
      ""
    ).toLowerCase();
    const tags = [
      ...(definition.spawn?.tags || []),
      ...(definition.tags || []),
      ...(data.tags || [])
    ].map((value) => String(value).toLowerCase());

    const living = /fauna|animal|creature|npc|pnj|species|espèce/.test(category) ||
      tags.some((tag) => /fauna|animal|creature|npc|pnj|species|living/.test(tag));

    if (living) return "relations";
    if (profile.collectable) return "collection";
    if (["analyze", "inspect", "observe"].includes(profile.action)) return "research";
    return "exploration";
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
    const types = BF.Missions?.ActionType || {};
    if ([types.COLLECT, types.EXTRACT].includes(actionType)) return "collection";
    if ([types.INSPECT, types.ANALYZE, types.OBSERVE, types.RESEARCH, types.CRAFT, types.BUILD].includes(actionType)) return "research";
    if ([types.EXPLORE_ZONE, types.TRAVEL].includes(actionType)) return "exploration";
    if ([types.REST, types.EAT].includes(actionType)) return "survival";
    return null;
  };

  const priorityModifier = (axis, baseScore, options = {}) => {
    const normalized = normalizeAxis(axis);
    if (!normalized || !Number.isFinite(Number(baseScore))) {
      return { axis: normalized, priority: 50, modifier: 0 };
    }
    const priority = readPriorities()[normalized] ?? 50;
    const centered = (priority - 50) / 50;
    const maxRatio = Math.max(
      0,
      Math.min(MAX_DECISION_INFLUENCE, Number(options.maxRatio) || MAX_DECISION_INFLUENCE)
    );
    const magnitude = Math.max(0, Math.abs(Number(baseScore))) * maxRatio;
    const modifier = centered * magnitude;
    return { axis: normalized, priority, modifier };
  };

  const installMissionOverlay = () => {
    const Planner = BF.Missions?.MissionPlanner;
    const Manager = BF.Missions?.MissionManager;
    let installed = false;

    if (
      Planner?.prototype &&
      typeof Planner.prototype.score === "function" &&
      !Planner.prototype.__bluefoxBAC2ScoreInstalled
    ) {
      const originalScore = Planner.prototype.score;
      Planner.prototype.score = function scoreWithBAC(node, context) {
        const baseScore = originalScore.call(this, node, context);
        if (!Number.isFinite(baseScore) || baseScore < 0) return baseScore;

        const type = BF.Missions.normalizeActionType(node?.type);
        const axis = normalizeAxis(node?.params?.priorityAxis) || actionAxis(type);
        if (!axis) return baseScore;

        const survival = context?.needs || {};
        const vital =
          (type === BF.Missions.ActionType.REST && survival.rest) ||
          (type === BF.Missions.ActionType.EAT && survival.food);
        if (vital) return baseScore;

        const influence = priorityModifier(axis, baseScore, { maxRatio: 0.25 });
        return baseScore + influence.modifier;
      };
      Planner.prototype.score.__bluefoxBAC2 = true;
      Planner.prototype.__bluefoxBAC2ScoreInstalled = true;
      installed = true;
    }

    if (
      Manager?.prototype &&
      typeof Manager.prototype.assessMission === "function" &&
      !Manager.prototype.__bluefoxBAC2AssessInstalled
    ) {
      const originalAssess = Manager.prototype.assessMission;
      Manager.prototype.assessMission = function assessMissionWithBAC(missionId, context) {
        const result = originalAssess.call(this, missionId, context);
        if (!result || !Number.isFinite(result.score) || result.score < 0) return result;

        const definition = this.definition?.(missionId) ||
          BF.Missions.getDefinition?.(missionId) ||
          BF.Missions.definitions?.[missionId] ||
          {};
        const actionType = result.action?.type;
        const axis =
          normalizeAxis(definition.passivePriorityAxis) ||
          normalizeAxis(definition.priorityAxis) ||
          normalizeAxis(definition.domain) ||
          actionAxis(actionType);

        if (!axis) return result;

        // Retire l'ancienne lecture directe du curseur pour éviter un double comptage.
        if (definition.passivePriorityAxis) {
          const legacyPriority = this.playerPriority?.(definition.passivePriorityAxis) ?? 50;
          const legacyInfluence = Math.max(0, legacyPriority - 50) * 1.6;
          result.score -= legacyInfluence;
          result.reasons = (result.reasons || []).filter(
            (reason) => !String(reason).startsWith("curseur ")
          );
        }

        const vital = (result.reasons || []).includes("besoin vital prioritaire");
        if (vital || !result.action) return result;

        const influence = priorityModifier(axis, result.score, { maxRatio: 0.25 });
        result.score += influence.modifier;
        result.reasons = result.reasons || [];
        if (Math.abs(influence.modifier) >= 0.5) {
          result.reasons.push(
            `BAC ${axis} ${influence.modifier >= 0 ? "+" : ""}${Math.round(influence.modifier)}`
          );
        }
        result.bac = {
          axis,
          priority: influence.priority,
          modifier: influence.modifier
        };
        return result;
      };
      Manager.prototype.assessMission.__bluefoxBAC2 = true;
      Manager.prototype.__bluefoxBAC2AssessInstalled = true;
      installed = true;
    }

    state.missionOverlayInstalled = installed ||
      Boolean(Planner?.prototype?.__bluefoxBAC2ScoreInstalled) ||
      Boolean(Manager?.prototype?.__bluefoxBAC2AssessInstalled);
    return state.missionOverlayInstalled;
  };

  const installAutonomyOverlay = () => {
    const Engine = BF.WorldEngine;
    if (!Engine?.prototype || Engine.prototype.__bluefoxBAC1Installed) return false;

    const original = Engine.prototype.updateAutonomy;
    if (typeof original !== "function") return false;

    Engine.prototype.updateAutonomy = function updateAutonomyWithBAC(now) {
      if (
        this.transitioning ||
        this.pendingInteraction ||
        this.pendingGate ||
        this.pendingZoneExploration ||
        this.currentRoutine ||
        this.missionManager?.currentAction
      ) return;
      if (now < this.postActionRecoveryUntil) return;
      if (now - this.lastAutonomyAt < 5000) return;
      if (this.character.root.position.distanceTo(this.character.target) > 0.2) return;

      const survival = BF.getSurvivalState?.() || {};
      const fatigue = survival.fatigue || {
        level: "normal",
        movement: 1,
        actionDuration: 1
      };
      this.character.fatigueSpeedMultiplier = fatigue.movement || 1;

      // Les missions actives et réalisables gardent la priorité absolue.
      if (this.missionManager?.hasRunnablePrimaryMission?.()) return;

      this.lastAutonomyAt = now;

      // Les besoins critiques ne sont jamais soumis au BAC.
      if (survival.needs?.criticalRest) {
        if (this.speechVisible && now - this.lastFatigueSpeechAt > 15000) {
          this.callbacks.onSpeak(
            "Je suis fatigué, j’ai besoin de récupérer avant de continuer."
          );
          this.lastFatigueSpeechAt = now;
        }
        this.startRoutine("critical-rest", now, 9000 + Math.random() * 6000, {
          targetEnergy: 33,
          pressureReduction: 3
        });
        return;
      }

      // Les pauses physiologiques existantes sont conservées.
      if (this.autonomyActionStreak >= this.autonomyBreakTarget) {
        if (
          this.speechVisible &&
          Math.random() < 0.45 &&
          now - this.lastFatigueSpeechAt > 12000
        ) {
          const phrases = [
            "Je prends un instant pour respirer.",
            "Une petite pause, puis je reprends.",
            "Je vais ralentir un peu.",
            "Je reprends mon souffle."
          ];
          this.callbacks.onSpeak(
            phrases[Math.floor(Math.random() * phrases.length)]
          );
          this.lastFatigueSpeechAt = now;
        }
        this.startRoutine("micro-rest", now, 2400 + Math.random() * 2200, {
          restGain: fatigue.level === "heavy" ? 4.2 : 3.2,
          pressureReduction: 0.75
        });
        this.autonomyActionStreak = 0;
        this.autonomyBreakTarget = 2 + Math.floor(Math.random() * 2);
        return;
      }

      const interactables = this.currentMap.interactables
        .filter((object) => this.canInteractWith(object, now));

      const relationObjects = interactables.filter((object) =>
        interactionAxis(this, object) === "relations"
      );
      const collectionObjects = interactables.filter((object) =>
        interactionAxis(this, object) === "collection"
      );
      const researchObjects = interactables.filter((object) =>
        interactionAxis(this, object) === "research"
      );

      const knownGates = this.currentMap.gates.filter((gate) =>
        this.discoveredMaps.has(gate.userData.exit.targetMap)
      );

      const options = [
        {
          id: "survival-rest",
          axis: "survival",
          baseWeight: survival.needs?.rest ? 22 : 7,
          available: true,
          execute: () => this.startRoutine(
            "rest",
            now,
            survival.needs?.rest ? 8200 : 7200,
            {
              restGain: survival.needs?.rest ? 18 : 12,
              pressureReduction: 2
            }
          )
        },
        {
          id: "research-routine",
          axis: "research",
          baseWeight: 10,
          available: true,
          execute: () => this.startRoutine("research", now, 6500)
        },
        {
          id: "relations-object",
          axis: "relations",
          baseWeight: 16,
          available: relationObjects.length > 0,
          execute: () => {
            const object = relationObjects[
              Math.floor(Math.random() * relationObjects.length)
            ];
            object.userData.requestedInteractionSource = "autonomy";
            this.targetInteraction(object);
          }
        },
        {
          id: "collection-object",
          axis: "collection",
          baseWeight: 24,
          available: collectionObjects.length > 0,
          execute: () => {
            const object = collectionObjects[
              Math.floor(Math.random() * collectionObjects.length)
            ];
            object.userData.requestedInteractionSource = "autonomy";
            this.targetInteraction(object);
          }
        },
        {
          id: "research-object",
          axis: "research",
          baseWeight: 18,
          available: researchObjects.length > 0,
          execute: () => {
            const object = researchObjects[
              Math.floor(Math.random() * researchObjects.length)
            ];
            object.userData.requestedInteractionSource = "autonomy";
            this.targetInteraction(object);
          }
        },
        {
          id: "exploration-known-gate",
          axis: "exploration",
          baseWeight: 8,
          available: knownGates.length > 0,
          execute: () => {
            const gate = knownGates[
              Math.floor(Math.random() * knownGates.length)
            ];
            this.pendingGate = gate;
            this.character.setTarget(gate.position);
            this.callbacks.onStatus(
              `BlueFox choisit de retourner vers ${
                BF.maps[gate.userData.exit.targetMap].name
              }.`
            );
          }
        },
        {
          id: "exploration-patrol",
          axis: "exploration",
          baseWeight: 20,
          available: true,
          execute: () => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 6 + Math.random() * 12;
            const patrolTarget = new this.THREE.Vector3(
              BF.clamp(
                this.character.root.position.x + Math.cos(angle) * distance,
                -25,
                25
              ),
              0,
              BF.clamp(
                this.character.root.position.z + Math.sin(angle) * distance,
                -25,
                25
              )
            );
            this.character.setTarget(patrolTarget);
            this.showWorldMarker(patrolTarget);
            this.callbacks.onStatus(
              "BlueFox poursuit une exploration locale autonome."
            );
          }
        }
      ];

      const selected = weightedPick(options);
      if (!selected) return original.call(this, now);

      if (Math.random() < 0.08) {
        const duration = this.character.playAmbientObservation();
        if (duration > 0) {
          this.lastActivityAt = now;
          this.callbacks.onStatus(
            "BlueFox s’immobilise un instant et observe les environs."
          );
          return;
        }
      }

      selected.execute();
    };

    Engine.prototype.updateAutonomy.__bluefoxBAC1 = true;
    Engine.prototype.__bluefoxBAC1Installed = true;
    state.installed = true;
    return true;
  };


  const installRelationOverlay = () => {
    const Engine = BF.WorldEngine;
    const Manager = BF.Missions?.MissionManager;
    let installed = false;

    if (
      Engine?.prototype &&
      typeof Engine.prototype.targetInteraction === "function" &&
      !Engine.prototype.__bluefoxBAC3TargetInstalled
    ) {
      const originalTargetInteraction = Engine.prototype.targetInteraction;
      Engine.prototype.targetInteraction = function targetInteractionWithBAC(object, retry = false) {
        if (!retry && object?.userData?.requestedInteractionSource === "manual") {
          recordPlayerSuggestion(interactionAxis(this, object), {
            kind: object.userData.kind || null,
            action: this.interactionProfile(object)?.action || null,
            source: "manual-interaction"
          });
        }
        return originalTargetInteraction.call(this, object, retry);
      };
      Engine.prototype.__bluefoxBAC3TargetInstalled = true;
      installed = true;
    }

    if (
      Manager?.prototype &&
      typeof Manager.prototype.suggestPrimaryMission === "function" &&
      !Manager.prototype.__bluefoxBAC3MissionSuggestionInstalled
    ) {
      const originalSuggestPrimaryMission = Manager.prototype.suggestPrimaryMission;
      Manager.prototype.suggestPrimaryMission = function suggestPrimaryMissionWithBAC(missionId) {
        const definition = this.definition?.(missionId) ||
          BF.Missions.getDefinition?.(missionId) ||
          {};
        const axis =
          normalizeAxis(definition.passivePriorityAxis) ||
          normalizeAxis(definition.priorityAxis) ||
          normalizeAxis(definition.domain) ||
          actionAxis(this.trees?.get(missionId)?.availableLeaves?.()[0]?.type) ||
          "exploration";
        recordPlayerSuggestion(axis, {
          missionId,
          source: "mission-priority"
        });
        return originalSuggestPrimaryMission.call(this, missionId);
      };
      Manager.prototype.__bluefoxBAC3MissionSuggestionInstalled = true;
      installed = true;
    }

    state.relationOverlayInstalled = installed ||
      Boolean(Engine?.prototype?.__bluefoxBAC3TargetInstalled) ||
      Boolean(Manager?.prototype?.__bluefoxBAC3MissionSuggestionInstalled);
    return state.relationOverlayInstalled;
  };

  const diagnostics = () => ({
    version: VERSION,
    enabled: state.enabled,
    passive: state.passive,
    installed: state.installed,
    missionOverlayInstalled: state.missionOverlayInstalled,
    relationOverlayInstalled: state.relationOverlayInstalled,
    maxDecisionInfluence: MAX_DECISION_INFLUENCE,
    profile: readProfile(),
    relation: {
      awareness: relation.awareness,
      awarenessStage: awarenessStage(),
      trustGeneral: relation.trustGeneral,
      trustByAxis: clone(relation.trustByAxis),
      suggestionMultipliers: AXES.reduce((result, axis) => {
        result[axis] = suggestionMultiplier(axis);
        return result;
      }, {}),
      dominantEmotion: dominantEmotion(),
      emotions: clone(relation.emotions),
      lastPlayerSuggestion: clone(relation.lastPlayerSuggestion)
    },
    decisions: state.decisions,
    lastDecision: clone(state.lastDecision),
    survival: BF.getSurvivalState?.() || null,
    mission: BF.getMissionState?.() || BF.missionState || null,
    lastObservedAt: state.lastObservedAt,
    lastEvent: clone(state.lastEvent)
  });

  global.addEventListener("bluefox:mission-state", (event) => {
    observe("mission-state", {
      primaryMissionId: event.detail?.primaryMissionId || "",
      currentAction: event.detail?.currentAction?.type || null
    });
    const suggestion = relation.lastPlayerSuggestion;
    if (
      suggestion &&
      !suggestion.resolved &&
      suggestion.detail?.source === "mission-priority" &&
      event.detail?.primaryMissionId === suggestion.detail?.missionId
    ) {
      const evaluation = evaluatePlayerSuggestion({
        success: true,
        useful: true,
        missionId: event.detail.primaryMissionId
      });
      speakReaction(evaluation);
    }
  });
  global.addEventListener("bluefox:survival-changed", (event) => {
    const reason = event.detail?.reason || "";
    observe("survival-changed", {
      reason,
      energy: event.detail?.state?.energy ?? null
    });
    if (String(reason).includes(":manual")) {
      const evaluation = evaluatePlayerSuggestion({
        success: true,
        useful: true,
        reason
      });
      speakReaction(evaluation);
    }
    const energy = Number(event.detail?.state?.energy);
    if (Number.isFinite(energy) && energy < 30) {
      shiftEmotion({ concern: 8, serenity: -5 });
    }
  });
  global.addEventListener("bluefox:map-transition-completed", (event) =>
    observe("map-transition-completed", event.detail || {})
  );
  BF.ObjectEvents?.subscribe?.((event) => {
    observe("object-event", {
      type: event.type,
      objectId: event.objectId,
      mapId: event.mapId,
      quantity: event.quantity
    });
    const source = event.detail?.interactionSource || event.detail?.source || "";
    if (source === "manual") {
      const evaluation = evaluatePlayerSuggestion({
        success: true,
        useful: true,
        eventType: event.type
      });
      speakReaction(evaluation);
    }
    if (["OBJECT_SEEN", "OBJECT_INSPECTED", "OBJECT_ANALYZED", "PHENOMENON_OBSERVED"].includes(event.type)) {
      shiftEmotion({ curiosity: 4, serenity: 1 });
    }
    if (["RESOURCE_COLLECTED", "RESOURCE_EXTRACTED", "OBJECT_BUILT", "OBJECT_CRAFTED"].includes(event.type)) {
      shiftEmotion({ determination: 3, serenity: 2 });
    }
  });

  BF.BAC = Object.freeze({
    version: VERSION,
    axes: AXES,
    priorityBudget: PRIORITY_BUDGET,
    maxDecisionInfluence: MAX_DECISION_INFLUENCE,
    readProfile,
    axisWeight,
    priorityModifier,
    suggestionMultiplier,
    recordPlayerSuggestion,
    evaluatePlayerSuggestion,
    weightedPick,
    observe,
    getDiagnostics: diagnostics,
    isPassive: () => false
  });
  BF.getBACDiagnostics = diagnostics;

  installMissionOverlay();
  installAutonomyOverlay();
  installRelationOverlay();
  global.setInterval(() => {
    decayEmotions();
    saveRelation();
  }, 30000);

  global.dispatchEvent(new CustomEvent("bluefox:bac-ready", {
    detail: {
      version: VERSION,
      passive: false,
      installed: state.installed,
      missionOverlayInstalled: state.missionOverlayInstalled,
      relationOverlayInstalled: state.relationOverlayInstalled,
      awarenessStage: awarenessStage()
    }
  }));
})(window);
