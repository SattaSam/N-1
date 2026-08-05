(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions || {};
  const INTEGRATION_VERSION = "bac-routing-fix2";

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

  const objectAxis = (engine, object) => {
    const profile = engine?.interactionProfile?.(object) || {};
    const data = object?.userData || {};
    const definition = data.functional ||
      BF.ObjectLibrary?.get?.(data.libraryType) ||
      BF.ObjectLibrary?.get?.(data.kind) ||
      {};
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
    if (profile.collectable) return "collection";
    if (["analyze", "inspect", "observe"].includes(profile.action)) return "research";
    return "exploration";
  };

  const scoreModifier = (axis, baseScore) => {
    const BAC = getBAC();
    if (!BAC || !axis || !Number.isFinite(Number(baseScore))) return 0;
    if (typeof BAC.priorityModifier === "function") {
      return Number(BAC.priorityModifier(axis, baseScore)?.modifier) || 0;
    }
    return 0;
  };

  const recordSuggestion = (axis, detail) => {
    const BAC = getBAC();
    if (!BAC) return null;
    if (typeof BAC.recordPlayerSuggestion === "function") {
      return BAC.recordPlayerSuggestion(axis, detail);
    }
    if (typeof BAC.recordSuggestion === "function") {
      return BAC.recordSuggestion(axis, detail);
    }
    return null;
  };

  const resolveSuggestion = (success = true, useful = true, detail = {}) => {
    const BAC = getBAC();
    if (!BAC) return null;
    if (typeof BAC.evaluatePlayerSuggestion === "function") {
      return BAC.evaluatePlayerSuggestion({ success, useful, ...detail });
    }
    if (typeof BAC.resolveSuggestion === "function") {
      return BAC.resolveSuggestion(success, useful);
    }
    return null;
  };

  const weightedPick = (options) => {
    const BAC = getBAC();
    if (typeof BAC?.weightedPick === "function") return BAC.weightedPick(options);
    const valid = options.filter((option) => option?.available !== false && Number(option?.weight) > 0);
    if (!valid.length) return null;
    const total = valid.reduce((sum, option) => sum + Number(option.weight), 0);
    let roll = Math.random() * total;
    return valid.find((option) => ((roll -= Number(option.weight)) <= 0)) || valid[valid.length - 1];
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
    if (Manager?.prototype && !Manager.prototype.__bacRoutingFix2Manager) {
      const originalSuggest = Manager.prototype.suggestPrimaryMission;
      if (typeof originalSuggest === "function") {
        Manager.prototype.suggestPrimaryMission = function suggestPrimaryMissionWithBAC(missionId) {
          const definition = this.definition?.(missionId) || {};
          const axis =
            normalizeAxis(definition.passivePriorityAxis) ||
            normalizeAxis(definition.priorityAxis) ||
            normalizeAxis(definition.domain) ||
            actionAxis(this.trees?.get(missionId)?.availableLeaves?.()[0]?.type) ||
            "exploration";
          recordSuggestion(axis, { source: "mission-priority", missionId });
          const result = originalSuggest.call(this, missionId);
          if (result) resolveSuggestion(true, true, { missionId });
          return result;
        };
      }
      Manager.prototype.__bacRoutingFix2Manager = true;
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
        recordSuggestion(objectAxis(this, object), {
          source: "manual-interaction",
          kind: object.userData.kind || null
        });
      }
      return originalTargetInteraction(object, retry);
    };

    const originalNavigation = engine.handleNavigationSuggestion?.bind(engine);
    if (originalNavigation) {
      engine.handleNavigationSuggestion = function navigationWithBAC(detail) {
        recordSuggestion("exploration", {
          source: "navigation",
          mapId: detail?.mapId || null,
          direction: detail?.direction || null
        });
        return originalNavigation(detail);
      };
    }

    const originalAutonomy = engine.updateAutonomy.bind(engine);
    engine.updateAutonomy = function updateAutonomyWithBAC(now) {
      if (
        this.transitioning || this.pendingInteraction || this.pendingGate ||
        this.pendingZoneExploration || this.currentRoutine ||
        this.missionManager?.currentAction
      ) return;
      if (now < this.postActionRecoveryUntil) return;
      if (now - this.lastAutonomyAt < 5000) return;
      if (this.character.root.position.distanceTo(this.character.target) > 0.2) return;

      const survival = BF.getSurvivalState?.() || {};
      const fatigue = survival.fatigue || { level: "normal", movement: 1, actionDuration: 1 };
      this.character.fatigueSpeedMultiplier = fatigue.movement || 1;
      if (this.missionManager?.hasRunnablePrimaryMission?.()) return;
      this.lastAutonomyAt = now;

      if (survival.needs?.criticalRest || this.autonomyActionStreak >= this.autonomyBreakTarget) {
        return originalAutonomy(now);
      }

      const interactables = (this.currentMap?.interactables || [])
        .filter((object) => this.canInteractWith(object, now));
      const byAxis = {
        collection: interactables.filter((object) => objectAxis(this, object) === "collection"),
        research: interactables.filter((object) => objectAxis(this, object) === "research"),
        relations: interactables.filter((object) => objectAxis(this, object) === "relations")
      };
      const knownGates = (this.currentMap?.gates || [])
        .filter((gate) => this.discoveredMaps.has(gate.userData.exit.targetMap));

      const options = [
        { id: "survival-rest", axis: "survival", weight: survival.needs?.rest ? 22 : 7,
          execute: () => this.startRoutine("rest", now, survival.needs?.rest ? 8200 : 7200,
            { restGain: survival.needs?.rest ? 18 : 12, pressureReduction: 2 }) },
        { id: "research-routine", axis: "research", weight: 10,
          execute: () => this.startRoutine("research", now, 6500) },
        { id: "relations-object", axis: "relations", weight: 16,
          available: byAxis.relations.length > 0,
          execute: () => { const object = byAxis.relations[Math.floor(Math.random() * byAxis.relations.length)]; object.userData.requestedInteractionSource = "autonomy"; this.targetInteraction(object); } },
        { id: "collection-object", axis: "collection", weight: 24,
          available: byAxis.collection.length > 0,
          execute: () => { const object = byAxis.collection[Math.floor(Math.random() * byAxis.collection.length)]; object.userData.requestedInteractionSource = "autonomy"; this.targetInteraction(object); } },
        { id: "research-object", axis: "research", weight: 18,
          available: byAxis.research.length > 0,
          execute: () => { const object = byAxis.research[Math.floor(Math.random() * byAxis.research.length)]; object.userData.requestedInteractionSource = "autonomy"; this.targetInteraction(object); } },
        { id: "known-gate", axis: "exploration", weight: 8,
          available: knownGates.length > 0,
          execute: () => { const gate = knownGates[Math.floor(Math.random() * knownGates.length)]; this.pendingGate = gate; this.character.setTarget(gate.position); this.callbacks.onStatus(`BlueFox choisit de retourner vers ${BF.maps[gate.userData.exit.targetMap].name}.`); } },
        { id: "patrol", axis: "exploration", weight: 20,
          execute: () => { const angle = Math.random() * Math.PI * 2; const distance = 6 + Math.random() * 12; const target = new this.THREE.Vector3(BF.clamp(this.character.root.position.x + Math.cos(angle) * distance, -25, 25), 0, BF.clamp(this.character.root.position.z + Math.sin(angle) * distance, -25, 25)); this.character.setTarget(target); this.showWorldMarker(target); this.callbacks.onStatus("BlueFox poursuit une exploration locale influencée par ses priorités."); } }
      ];

      const selected = weightedPick(options);
      if (!selected) return originalAutonomy(now);
      selected.execute();
    };

    engine.__bacRoutingVersion = INTEGRATION_VERSION;
    engine.__bacIntegrated = true;
    return true;
  };

  const reconnect = () => {
    const missionConnected = installMissionOverlay();
    const worldConnected = installWorldOverlay();
    return Boolean(missionConnected && worldConnected);
  };

  const connectWithRetries = () => {
    if (reconnect()) return true;
    let attempts = 0;
    const retry = global.setInterval(() => {
      attempts += 1;
      if (reconnect() || attempts >= 80) global.clearInterval(retry);
    }, 250);
    return false;
  };

  const installDiagnosticBridge = () => {
    if (BF.__bacDiagnosticBridgeInstalled) return true;

    const originalDiagnostics =
      typeof BF.getBACDiagnostics === "function"
        ? BF.getBACDiagnostics.bind(BF)
        : null;

    BF.getBACDiagnostics = () => {
      const base = originalDiagnostics?.() || {};
      const engine = BF.currentEngine;
      const worldInstalled = Boolean(
        engine?.__bacIntegrated === true &&
        engine?.__bacRoutingVersion === INTEGRATION_VERSION &&
        typeof engine?.updateAutonomy === "function" &&
        engine.updateAutonomy.name === "updateAutonomyWithBAC"
      );

      return {
        ...base,
        installed: worldInstalled,
        worldOverlayInstalled: worldInstalled,
        integrationVersion:
          engine?.__bacRoutingVersion || INTEGRATION_VERSION,
        autonomyHook:
          engine?.updateAutonomy?.name || "",
        currentEngineAvailable: Boolean(engine),
        missionOverlayInstalled: Boolean(
          base.missionOverlayInstalled ||
          Missions.MissionPlanner?.prototype?.__bacRoutingFix2Planner ||
          Missions.MissionManager?.prototype?.__bacRoutingFix2Manager
        )
      };
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

  BF.ObjectEvents?.subscribe?.((event) => {
    const source = event.detail?.interactionSource || event.detail?.source || "";
    if (source === "manual") resolveSuggestion(true, true, { eventType: event.type });
  });
})(window);
