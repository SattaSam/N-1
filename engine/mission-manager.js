(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};

  class MissionManager {
    constructor(options) {
      this.engine = options.engine;
      this.memory = options.memory || new Missions.MissionMemory();
      this.planner = options.planner || new Missions.MissionPlanner(this.memory);
      this.bridge = options.bridge || new Missions.ActionBridge(this.engine);
      const rememberedIds = Array.isArray(this.memory.state.activeMissionIds)
        ? this.memory.state.activeMissionIds
        : [];
      const lifecycleActiveIds = Object.keys(
        this.memory.state.missionLifecycle || {}
      ).filter((id) =>
        this.memory.state.missionLifecycle?.[id]?.status === "active"
      );
      const persistedActiveIds = [...new Set([
        this.memory.state.primaryMissionId,
        this.memory.state.activeMissionId,
        ...rememberedIds,
        ...lifecycleActiveIds
      ].filter(Boolean))].filter((id) =>
        this.memory.state.missionLifecycle?.[id]?.status !== "completed"
      );
      this.persistenceHydrationBlocked = persistedActiveIds.some(
        (id) => !this.definition(id)
      );
      this.primaryMissionId = this.resolveInitialMission(options.missionId || "");
      this.activeMissionId = this.primaryMissionId || "";
      this.activeMissionIds = [...new Set(
        [this.primaryMissionId, ...persistedActiveIds]
          .filter(Boolean)
          .filter((id) => this.definition(id))
          .filter((id) =>
            this.memory.state.missionLifecycle?.[id]?.status !== "completed"
          )
          .filter((id) => !this.isLegacyUnscopedSiteMission(id))
      )];
      Object.keys(this.memory.state.missionLifecycle || {}).forEach((id) => {
        if (!this.isLegacyUnscopedSiteMission(id)) return;
        this.memory.state.missionLifecycle[id].status = "available";
      });
      const completedIds = Object.keys(
        this.memory.state.missionLifecycle || {}
      ).filter((id) =>
        this.memory.state.missionLifecycle[id]?.status === "completed" &&
        this.definition(id) &&
        this.memory.state.missions?.[id] &&
        !this.isLegacyUnscopedSiteMission(id)
      );
      const restorableIds = [...new Set([
        ...this.activeMissionIds,
        ...completedIds
      ])];
      this.trees = new Map(restorableIds.map((id) => [
        id,
        this.planner.restoreOrCreate(id)
      ]));
      this.tree = this.primaryMissionId
        ? this.trees.get(this.primaryMissionId) || null
        : null;
      this.activeMissionIds.forEach((id) => this.ensureLifecycle(id, "active"));
      this.selectionReason = this.primaryMissionId
        ? this.memory.state.missionLifecycle[this.primaryMissionId]?.selectionReason ||
          "Mission reprise depuis la sauvegarde."
        : "Aucune mission active.";
      this.pendingPrimaryMissionId = null;
      this.pendingPrimaryMissionReason = null;
      this.pendingPauseMissionId = null;
      this.lastPriorityReviewAt = 0;
      this.currentAction = null;
      this.lastPlanAt = 0;
      this.retryAfter = 0;
      this.idleRetryUntil = 0;
      // R-STAB recovery: runtime-only pressure for actions that repeatedly fail
      // to start or complete on the same mission node and map. Never persisted.
      this.executionRecovery = new Map();
      this.targetProbeDiagnostics = new Map();
      this.enabled = true;
      if (!this.persistenceHydrationBlocked && !this.hasActivePrimaryMission()) {
        this.primaryMissionId = "";
        this.activeMissionId = "";
        this.tree = null;
        this.selectionReason = this.activeMissionIds.length
          ? "Mission principale restaurée depuis les missions actives."
          : "Aucune mission active.";
        this.selectBestPrimary(performance.now(), true);
      }
      this.syncMissionSelection();
      this.onMissionTrigger = (event) => this.notifyMissionEvent(
        event.detail?.type || "event",
        event.detail || {}
      );
      global.addEventListener("bluefox:mission-trigger", this.onMissionTrigger);
      if (this.tree) this.memory.saveTree(this.tree);
      this.catalogController = Missions.MissionCatalogController
        ? new Missions.MissionCatalogController(this)
        : null;
      this.publish();
    }

    recoverPersistenceHydration(now = performance.now()) {
      if (!this.persistenceHydrationBlocked) return true;

      const rememberedIds = Array.isArray(this.memory.state.activeMissionIds)
        ? this.memory.state.activeMissionIds
        : [];
      const lifecycleActiveIds = Object.keys(
        this.memory.state.missionLifecycle || {}
      ).filter((id) =>
        this.memory.state.missionLifecycle?.[id]?.status === "active"
      );
      const persistedActiveIds = [...new Set([
        this.memory.state.primaryMissionId,
        this.memory.state.activeMissionId,
        ...rememberedIds,
        ...lifecycleActiveIds
      ].filter(Boolean))].filter((id) =>
        this.memory.state.missionLifecycle?.[id]?.status !== "completed"
      );

      if (persistedActiveIds.some((id) => !this.definition(id))) return false;

      this.persistenceHydrationBlocked = false;
      this.primaryMissionId = this.resolveInitialMission("");
      this.activeMissionId = this.primaryMissionId || "";
      this.activeMissionIds = persistedActiveIds
        .filter((id) => this.definition(id))
        .filter((id) => !this.isLegacyUnscopedSiteMission(id));

      const completedIds = Object.keys(
        this.memory.state.missionLifecycle || {}
      ).filter((id) =>
        this.memory.state.missionLifecycle[id]?.status === "completed" &&
        this.definition(id) &&
        this.memory.state.missions?.[id] &&
        !this.isLegacyUnscopedSiteMission(id)
      );
      [...new Set([...this.activeMissionIds, ...completedIds])].forEach((id) => {
        if (!this.trees.has(id)) {
          this.trees.set(id, this.planner.restoreOrCreate(id));
        }
      });

      this.tree = this.primaryMissionId
        ? this.trees.get(this.primaryMissionId) || null
        : null;
      this.activeMissionIds.forEach((id) => this.ensureLifecycle(id, "active"));

      if (!this.hasActivePrimaryMission()) {
        this.primaryMissionId = "";
        this.activeMissionId = "";
        this.tree = null;
        this.selectionReason = this.activeMissionIds.length
          ? "Mission principale restaurée depuis les missions actives."
          : "Aucune mission active.";
        this.selectBestPrimary(now, true);
      } else {
        this.selectionReason =
          this.memory.state.missionLifecycle?.[this.primaryMissionId]?.selectionReason ||
          "Mission reprise depuis la sauvegarde.";
      }

      this.syncMissionSelection();
      if (this.tree) this.memory.saveTree(this.tree);
      this.memory.save?.();
      this.publish();
      return true;
    }

    syncMissionSelection() {
      if (this.persistenceHydrationBlocked) return false;
      const state = this.memory.state;
      const activeIds = this.activeMissionIds;
      const selectionChanged =
        state.primaryMissionId !== this.primaryMissionId ||
        state.activeMissionId !== this.primaryMissionId ||
        !Array.isArray(state.activeMissionIds) ||
        state.activeMissionIds.length !== activeIds.length ||
        state.activeMissionIds.some((id, index) => id !== activeIds[index]);
      this.memory.state.primaryMissionId = this.primaryMissionId;
      this.memory.state.activeMissionId = this.primaryMissionId;
      this.memory.state.activeMissionIds = [...activeIds];
      if (!this.primaryMissionId) return true;
      const existingLifecycle = state.missionLifecycle?.[this.primaryMissionId];
      const lifecycle = this.ensureLifecycle(this.primaryMissionId, "active");
      const reason = this.selectionReason || lifecycle.selectionReason || "";
      const reasonChanged = lifecycle.selectionReason !== reason;
      lifecycle.selectionReason = reason;
      if (selectionChanged || reasonChanged || !existingLifecycle) {
        lifecycle.updatedAt = Date.now();
      }
      return true;
    }

    definition(missionId) {
      if (!missionId) return null;
      return Missions.getDefinition?.(missionId) || Missions.definitions?.[missionId] || null;
    }

    isLegacyUnscopedSiteMission(missionId) {
      return !String(missionId || "").includes("@") &&
        this.definition(missionId)?.instanceScope === "map";
    }

    ensureLifecycle(missionId, status = "available") {
      const collection = this.memory.state.missionLifecycle =
        this.memory.state.missionLifecycle || {};
      collection[missionId] = {
        status,
        urgency: 0,
        narrativePriority: 0,
        autoPrimaryEligible: true,
        activatedAt: 0,
        pausedAt: 0,
        completedAt: 0,
        selectionReason: "",
        discoveryReason: "",
        source: "system",
        ...(collection[missionId] || {})
      };
      return collection[missionId];
    }

    resolveInitialMission(fallback) {
      const candidates = [
        fallback,
        this.memory.state.primaryMissionId,
        this.memory.state.activeMissionId
      ]
        .filter(Boolean)
        .filter((id, index, values) => values.indexOf(id) === index)
        .filter((id) => !this.isLegacyUnscopedSiteMission(id));
      return candidates.find((id) => this.definition(id)) || "";
    }

    activateMission(missionId, options = {}) {
      const definition = this.definition(missionId);
      if (!definition) return false;
      if (!this.trees.has(missionId)) {
        this.trees.set(missionId, this.planner.restoreOrCreate(missionId));
      }
      const tree = this.trees.get(missionId);
      const narrativeOnly = definition.narrativeOnly === true;
      if (narrativeOnly && tree?.root && !tree.root.isComplete) {
        tree.root.progress = tree.root.target;
        tree.root.status = Missions.MissionStatus.COMPLETED;
        tree.root.completedAt ||= Date.now();
      }
      if (!narrativeOnly && !this.activeMissionIds.includes(missionId)) {
        this.activeMissionIds.push(missionId);
      }
      const lifecycle = this.ensureLifecycle(missionId);
      lifecycle.status = tree.root.isComplete
        ? "completed"
        : "active";
      lifecycle.urgency = Math.max(0, Number(options.urgency) || lifecycle.urgency || 0);
      lifecycle.narrativePriority = Math.max(
        0,
        Number(options.narrativePriority) || lifecycle.narrativePriority || 0
      );
      lifecycle.source = options.source || lifecycle.source || "system";
      lifecycle.discoveryReason = options.reason || lifecycle.discoveryReason ||
        `Mission découverte par ${lifecycle.source}.`;
      if (typeof options.autoPrimaryEligible === "boolean") {
        lifecycle.autoPrimaryEligible = options.autoPrimaryEligible;
      }
      if (!lifecycle.activatedAt) lifecycle.activatedAt = Date.now();
      lifecycle.updatedAt = Date.now();
      delete this.memory.state.pendingActivations?.[missionId];
      const makePrimary = !narrativeOnly && options.primary !== false;
      if (makePrimary) {
        this.setPrimaryMission(
          missionId,
          false,
          options.reason || `Mission activée par ${lifecycle.source}.`
        );
      }
      this.syncMissionSelection();
      if (makePrimary && this.primaryMissionId === missionId) {
        this.retryAfter = performance.now() + 1200;
        this.idleRetryUntil = 0;
      } else {
        this.wakeIdleRetry();
      }
      this.memory.saveTree(this.trees.get(missionId));
      this.publish();
      return true;
    }

    rearmRepeatableMission(missionId, options = {}) {
      const definition = this.definition(missionId);
      if (!definition?.repeatable) return false;
      const lifecycle = this.ensureLifecycle(missionId);
      if (lifecycle.status !== "completed") return false;

      this.activeMissionIds = this.activeMissionIds.filter((id) => id !== missionId);
      delete this.memory.state.missions?.[missionId];
      this.trees.delete(missionId);
      lifecycle.status = "available";
      lifecycle.completedAt = 0;
      lifecycle.activatedAt = 0;
      lifecycle.pausedAt = 0;
      lifecycle.repeatCount = Math.max(0, Number(lifecycle.repeatCount) || 0) + 1;
      lifecycle.rearmedAt = Date.now();
      lifecycle.source = options.source || "repeatable";
      lifecycle.selectionReason = "";
      lifecycle.discoveryReason = options.reason || lifecycle.discoveryReason || "Mission répétable de nouveau disponible.";
      delete lifecycle.waitingForBibleGate;
      delete lifecycle.waitingForBibleGateMessage;
      this.memory.save?.();
      this.publish();
      return true;
    }

    resetMissionAttempt(missionId, options = {}) {
      const definition = this.definition(missionId);
      if (!definition) return false;
      const lifecycle = this.ensureLifecycle(missionId);
      if (!["active", "paused", "failed", "completed", "available"].includes(lifecycle.status)) return false;

      const snapshot = {
        status: lifecycle.status,
        activatedAt: Number(lifecycle.activatedAt) || 0,
        completedAt: Number(lifecycle.completedAt) || 0,
        failedAt: Number(lifecycle.failedAt) || 0,
        failureReason: lifecycle.failureReason || "",
        resetAt: Date.now(),
        reason: options.reason || "Nouvelle tentative missionnelle."
      };
      lifecycle.attemptHistory = Array.isArray(lifecycle.attemptHistory)
        ? [...lifecycle.attemptHistory, snapshot].slice(-12)
        : [snapshot];
      lifecycle.attemptCount = Math.max(0, Number(lifecycle.attemptCount) || 0) + 1;

      this.activeMissionIds = this.activeMissionIds.filter((id) => id !== missionId);
      delete this.memory.state.missions?.[missionId];
      this.trees.delete(missionId);
      if (this.primaryMissionId === missionId) this.primaryMissionId = null;
      lifecycle.status = "available";
      lifecycle.activatedAt = 0;
      lifecycle.completedAt = 0;
      lifecycle.failedAt = 0;
      lifecycle.pausedAt = 0;
      lifecycle.failureReason = "";
      lifecycle.rearmedAt = Date.now();
      lifecycle.source = options.source || lifecycle.source || "attempt-reset";
      lifecycle.discoveryReason = options.reason || lifecycle.discoveryReason || "Nouvelle tentative disponible.";
      lifecycle.selectionReason = "";
      delete lifecycle.waitingForBibleGate;
      delete lifecycle.waitingForBibleGateMessage;
      this.memory.save?.();
      this.syncMissionSelection?.();
      this.publish();
      return true;
    }

    startMission(missionId, options = {}) {
      const definition = this.definition(missionId);
      if (!definition) return false;
      const prerequisites = Array.isArray(options.prerequisites)
        ? options.prerequisites.filter(Boolean)
        : [];
      const experimentalPrerequisites = Array.isArray(options.experimentalPrerequisites)
        ? options.experimentalPrerequisites.filter(Boolean)
        : Array.isArray(definition.experimentalPrerequisites)
          ? definition.experimentalPrerequisites.filter(Boolean)
          : [];
      const missing = prerequisites.filter((id) =>
        this.memory.state.missionLifecycle?.[id]?.status !== "completed"
      );
      const missingExperimental = experimentalPrerequisites.filter((id) =>
        BF.bibleRuntime?.isResearchRewardUnlocked?.(id) !== true
      );
      if (missing.length || missingExperimental.length) {
        this.memory.state.pendingActivations = this.memory.state.pendingActivations || {};
        const pendingOptions = {
          ...options,
          prerequisites: undefined,
          experimentalPrerequisites: undefined
        };
        const existing = this.memory.state.pendingActivations[missionId] || null;
        const lifecycle = this.ensureLifecycle(missionId, "hidden");
        const sameList = (left, right) => {
          const a = [...new Set(Array.isArray(left) ? left : [])].sort();
          const b = [...new Set(Array.isArray(right) ? right : [])].sort();
          return a.length === b.length && a.every((value, index) => value === b[index]);
        };
        const waitingFor = [
          ...missing,
          ...missingExperimental.map((id) => `research:${id}`)
        ];
        const unchangedPending = Boolean(
          existing &&
          sameList(existing.prerequisites, prerequisites) &&
          sameList(existing.experimentalPrerequisites, experimentalPrerequisites) &&
          sameList(lifecycle.waitingFor, waitingFor) &&
          JSON.stringify(existing.options || {}) === JSON.stringify(pendingOptions) &&
          lifecycle.status === "hidden"
        );
        if (unchangedPending) return true;

        this.memory.state.pendingActivations[missionId] = {
          missionId,
          prerequisites,
          experimentalPrerequisites,
          options: pendingOptions,
          requestedAt: existing?.requestedAt || Date.now()
        };
        lifecycle.status = "hidden";
        lifecycle.waitingFor = waitingFor;
        this.memory.save();
        this.publish();
        return true;
      }
      return this.activateMission(missionId, {
        ...options,
        primary: options.primary === true
      });
    }

    setPrimaryMission(missionId, publish = true, reason = "Priorité choisie explicitement.") {
      if (!this.definition(missionId)) return false;
      if (!this.trees.has(missionId)) {
        this.trees.set(missionId, this.planner.restoreOrCreate(missionId));
      }
      if (!this.activeMissionIds.includes(missionId)) {
        this.activeMissionIds.push(missionId);
      }

      const playerDirective = reason === "Priorité suggérée par le joueur.";
      const currentActionSuppressed = Boolean(
        this.currentAction &&
        this.isExecutionNodeSuppressed?.(
          this.currentAction.missionId,
          this.currentAction.nodeId,
          this.bridge.context?.()
        )
      );
      if (playerDirective && currentActionSuppressed) {
        this.cancelCurrentAction?.("player-priority-recovery");
      }

      const replacingActivePrimary = this.hasActivePrimaryMission();
      if (
        this.currentAction ||
        (replacingActivePrimary && this.bridge.isEngineBusy())
      ) {
        this.pendingPrimaryMissionId = missionId;
        this.pendingPrimaryMissionReason = reason;
        this.selectionReason = `Changement vers « ${this.trees.get(missionId).title} » après l’action en cours.`;
        if (publish) this.publish();
        return true;
      }
      this.primaryMissionId = missionId;
      this.activeMissionId = missionId;
      this.tree = this.trees.get(missionId);
      this.selectionReason = reason;
      this.pendingPrimaryMissionId = null;
      this.pendingPrimaryMissionReason = null;
      this.ensureLifecycle(missionId, "active").status = "active";
      this.syncMissionSelection();
      if (publish) {
        this.memory.saveTree(this.tree);
        this.publish();
      }
      return true;
    }

    pauseMission(missionId, reason = "Mission mise en pause.") {
      if (!this.activeMissionIds.includes(missionId)) return false;
      if (missionId === this.primaryMissionId && this.currentAction) {
        this.pendingPauseMissionId = missionId;
        this.selectionReason = `${reason} La pause prendra effet après l’action en cours.`;
        this.publish();
        return true;
      }
      this.activeMissionIds = this.activeMissionIds.filter((id) => id !== missionId);
      const lifecycle = this.ensureLifecycle(missionId);
      lifecycle.status = "paused";
      lifecycle.pausedAt = Date.now();
      lifecycle.pauseReason = reason;
      if (missionId === this.primaryMissionId) this.selectBestPrimary(performance.now(), true);
      this.syncMissionSelection();
      this.memory.save();
      this.publish();
      return true;
    }

    resumeMission(missionId, options = {}) {
      return this.activateMission(missionId, {
        ...options,
        primary: options.primary === true,
        source: options.source || "reprise"
      });
    }

    suggestPrimaryMission(missionId) {
      const lifecycle = this.ensureLifecycle(missionId);
      if (lifecycle.status !== "active" || !this.trees.has(missionId)) return false;
      lifecycle.narrativePriority = Math.max(
        Number(lifecycle.narrativePriority) || 0,
        25
      );
      lifecycle.autoPrimaryEligible = true;
      lifecycle.discoveryReason = lifecycle.discoveryReason ||
        "Le joueur m’a suggéré d’en faire une priorité.";
      const changed = this.setPrimaryMission(
        missionId,
        false,
        "Priorité suggérée par le joueur."
      );
      this.memory.save();
      this.publish();
      return changed || true;
    }

    failMission(missionId, reason = "Mission échouée.") {
      const tree = this.trees.get(missionId);
      if (!tree) return false;
      this.activeMissionIds = this.activeMissionIds.filter((id) => id !== missionId);
      tree.root.status = Missions.MissionStatus.FAILED;
      const lifecycle = this.ensureLifecycle(missionId);
      lifecycle.status = "failed";
      lifecycle.failedAt = Date.now();
      lifecycle.failureReason = reason;
      this.memory.saveTree(tree);
      if (missionId === this.primaryMissionId) this.selectBestPrimary(performance.now(), true);
      this.publish();
      return true;
    }

    treeProgress(tree) {
      let total = 0;
      let completed = 0;
      tree.root.walk((node) => {
        if (!node.isLeaf) return;
        total += node.target;
        completed += Math.min(node.progress, node.target);
      });
      return total ? completed / total : (tree.root.isComplete ? 1 : 0);
    }

    playerPriority(axis) {
      if (!axis) return 50;
      try {
        const save = JSON.parse(global.localStorage.getItem("bluefox_odyssey_save_v1") || "null");
        const value = Number(save?.priorities?.[axis]);
        return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
      } catch {
        return 50;
      }
    }

    wakeIdleRetry(now = performance.now()) {
      if (
        !this.idleRetryUntil ||
        this.retryAfter !== this.idleRetryUntil ||
        now >= this.retryAfter
      ) return false;
      this.retryAfter = now;
      this.idleRetryUntil = 0;
      return true;
    }

    executionRecoveryKey(missionId, nodeId, mapId = null) {
      const currentMapId = String(
        mapId ?? this.engine?.currentMapId ?? ""
      );
      return `${String(missionId || "")}|${String(nodeId || "")}|${currentMapId}`;
    }

    executionRecoveryStore() {
      if (!(this.executionRecovery instanceof Map)) {
        this.executionRecovery = new Map();
      }
      return this.executionRecovery;
    }

    pruneExecutionRecovery(now = performance.now()) {
      const store = this.executionRecoveryStore();
      store.forEach((entry, key) => {
        const stale = now - Number(entry?.lastAt || 0) > 60000;
        const expired = Boolean(
          entry?.suppressedUntil && now >= Number(entry.suppressedUntil)
        );
        if (stale || expired) store.delete(key);
      });
      return store.size;
    }

    executionRecoveryNodeProgress(missionId, nodeId) {
      const node = this.trees?.get?.(missionId)?.find?.(nodeId);
      return Number(node?.progress) || 0;
    }

    executionRecoveryEntry(missionId, nodeId, mapId = null, now = performance.now()) {
      if (!missionId || !nodeId) return null;
      const store = this.executionRecoveryStore();
      const key = this.executionRecoveryKey(missionId, nodeId, mapId);
      const entry = store.get(key);
      if (!entry) return null;

      const progress = this.executionRecoveryNodeProgress(missionId, nodeId);
      if (progress > Number(entry.progressAtFailure || 0)) {
        store.delete(key);
        return null;
      }
      if (entry.suppressedUntil && now >= entry.suppressedUntil) {
        store.delete(key);
        return null;
      }
      return entry;
    }

    isExecutionNodeSuppressed(missionId, nodeId, context = null, now = performance.now()) {
      const mapId = String(
        context?.mapId || context?.currentMapId || this.engine?.currentMapId || ""
      );
      const entry = this.executionRecoveryEntry(missionId, nodeId, mapId, now);
      return Boolean(entry?.suppressedUntil && now < entry.suppressedUntil);
    }

    rememberUnresolvedMissionTarget(missionId, action, context, now = performance.now()) {
      const mapId = String(
        context?.mapId || context?.currentMapId || this.engine?.currentMapId || ""
      );
      const key = `${missionId}|${action?.nodeId || ""}|${mapId}`;
      const previous = this.targetProbeDiagnostics.get(key);
      if (!previous || now - Number(previous.at || 0) >= 10000) {
        const detail = {
          missionId,
          nodeId: action?.nodeId || null,
          actionType: action?.type || null,
          mapId: mapId || null,
          reason: "mission-target-unresolved"
        };
        this.targetProbeDiagnostics.set(key, { ...detail, at: now });
        this.memory?.remember?.("mission-target-unresolved", detail);
      }
    }

    missionRunnableAction(missionId, tree, context, now = performance.now(), options = {}) {
      if (!tree || tree.root?.isComplete) return null;
      const availableLeaves = () => tree.availableLeaves().filter((node) =>
        !this.isExecutionNodeSuppressed(missionId, node.id, context, now) &&
        !(node.params?.requiresShelter === true && BF.canAccessCampInventory?.() !== true)
      );
      if (!this.missionAllowsAutomaticExecution(missionId)) return null;
      // Une construction locale délègue au propriétaire natif des sites.
      // Ce n’est ni une observation CUO, ni une preuve de construction acquise.
      const constructionNode = availableLeaves().find(node => {
        const mapState = this.planner.requiredMapState(node, context);
        return node.params?.siteProgressionKind &&
          (!node.params.mapId || String(node.params.mapId) === String(this.engine.currentMapId)) &&
          (!mapState.constrained || mapState.runnable);
      });
      if (constructionNode) {
        const kind = constructionNode.params.siteProgressionKind;
        const state = BF.bibleRuntime?.constructionAvailability?.(kind, this.engine.currentMapId, { source: "autonomy" });
        if (String(BF.getAutonomyMode?.() || "").toLowerCase() === "full" &&
            state?.allowed === true && !state.active) return {
          missionId, nodeId: constructionNode.id, type: Missions.ActionType.BUILD,
          title: constructionNode.title, params: { ...constructionNode.params },
          siteProgressionKind: kind, issuedAt: Date.now()
        };
      }
      const environmentNode = this.missionIsBackgroundProgressOnly(missionId)
        ? availableLeaves().find((node) => {
            const params = node.params || {};
            const mapState = this.planner.requiredMapState(node, context);
            return (!mapState.constrained || mapState.runnable) &&
              (params.envHistoricalFamily || params.envLocalFamily || params.envWorldMastery);
          }) : null;
      let planned = environmentNode ? {
        id: `${environmentNode.id}:${environmentNode.progress + 1}`,
        nodeId: environmentNode.id,
        type: Missions.ActionType.OBSERVE,
        title: environmentNode.title,
        params: { ...environmentNode.params },
        backgroundEnvironment: true,
        issuedAt: Date.now()
      } : this.planner.nextAction({ availableLeaves }, context);
      if (planned?.backgroundEnvironment && !BF.probeMissionActionTarget?.(
          this.engine, { ...planned, missionId })) {
        // La visite/exploration reste physique. Seul le runtime ENV créditera
        // les observations distinctes et la qualification réelle des biomes.
        const destinations = BF.bibleRuntime?.environmentPlayerDestinationMaps?.(environmentNode) || [];
        if (environmentNode.params?.envLocalFamily ||
            Number(BF.getMapExplorationState?.(this.engine.currentMapId)?.surfacePercent) >= 100 ||
            (destinations.length && !destinations.includes(this.engine.currentMapId)) ||
            (environmentNode.params?.envWorldMastery &&
              BF.bibleRuntime?.environmentQualifiedBiomeTypes?.().has(
                BF.bibleRuntime.environmentMapBiome(this.engine.currentMapId)))) return null;
        planned.type = Missions.ActionType.EXPLORE_ZONE;
      }
      if (!planned) return null;

      // `catalogManaged` signifie que la progression de cette feuille appartient
      // à un runtime spécialisé (compteur, proximité, validation, scène...).
      // ObjectM0 et le fan-out passif refusent déjà volontairement de la créditer
      // comme interaction missionnelle générique : ne pas créer ici une
      // currentAction que personne ne pourra clôturer.
      const plannedNode = tree.find?.(planned.nodeId) || null;
      if (plannedNode?.params?.catalogManaged === true && !planned.backgroundEnvironment) return null;
      // Une mission de progression de fond consomme les événements canoniques
      // par fan-out ; elle ne crée pas d'initiative physique autonome. Lire le
      // contrat depuis la définition courante permet aussi de corriger les arbres
      // hydratés depuis une sauvegarde antérieure au marqueur.
      if (!this.missionAllowsAutomaticExecution(missionId)) return null;

      const action = { ...planned, missionId };
      const type = Missions.normalizeActionType(action.type);
      const objectAction = [
        Missions.ActionType.COLLECT,
        Missions.ActionType.EXTRACT,
        Missions.ActionType.OBSERVE,
        Missions.ActionType.INSPECT,
        Missions.ActionType.ANALYZE
      ].includes(type);
      if (objectAction && typeof BF.probeMissionActionTarget === "function") {
        const target = BF.probeMissionActionTarget(this.engine, { ...action, type });
        if (!target) {
          if (options.reportUnresolved !== false) {
            this.rememberUnresolvedMissionTarget(missionId, action, context, now);
          }
          return null;
        }
      }
      return action;
    }

    recordExecutionFailure(
      action,
      reason = "execution-failed",
      now = performance.now(),
      failedTarget = null
    ) {
      const missionId = String(action?.missionId || "");
      const nodeId = String(action?.nodeId || "");
      if (!missionId || !nodeId) return null;

      const mapId = String(this.engine?.currentMapId || "");
      this.pruneExecutionRecovery(now);
      const key = this.executionRecoveryKey(missionId, nodeId, mapId);
      const store = this.executionRecoveryStore();
      const progress = this.executionRecoveryNodeProgress(missionId, nodeId);
      const previous = this.executionRecoveryEntry(missionId, nodeId, mapId, now);
      const withinWindow = previous &&
        now - Number(previous.firstAt || now) <= 60000 &&
        progress <= Number(previous.progressAtFailure || 0);
      const count = withinWindow ? Number(previous.count || 0) + 1 : 1;
      const entry = {
        missionId,
        nodeId,
        mapId,
        count,
        firstAt: withinWindow ? Number(previous.firstAt || now) : now,
        lastAt: now,
        lastReason: reason,
        progressAtFailure: progress,
        suppressedUntil: count >= 3 ? now + 20000 : 0
      };
      store.set(key, entry);
      if (entry.suppressedUntil) {
        this.memory?.remember?.("action-recovery-suppressed", {
          missionId, nodeId, mapId, reason, count, durationMs: 20000
        });
        if (failedTarget?.userData) {
          failedTarget.userData.bacAvoidUntil = Math.max(
            Number(failedTarget.userData.bacAvoidUntil) || 0,
            Date.now() + 20000
          );
          if (this.engine?.__bacTargetLock?.object === failedTarget) {
            this.engine.__bacTargetLock = null;
          }
        }
      }
      return entry;
    }

    clearExecutionRecovery(action) {
      const missionId = String(action?.missionId || "");
      const nodeId = String(action?.nodeId || "");
      if (!missionId || !nodeId) return false;
      const store = this.executionRecoveryStore();
      let changed = false;
      [...store.keys()].forEach((key) => {
        if (!key.startsWith(`${missionId}|${nodeId}|`)) return;
        store.delete(key);
        changed = true;
      });
      return changed;
    }

    executionCancellationIsFailure(reason) {
      return new Set([
        "object-inactive",
        "object-definition-missing",
        "interaction-inaccessible",
        "mission-acquisition-invalid"
      ]).has(String(reason || ""));
    }

    eventDrivenTravelForMission(missionId) {
      if (!missionId) return null;
      const tree = this.trees.get(missionId);
      const lifecycle = this.memory.state.missionLifecycle?.[missionId];
      if (!tree || lifecycle?.status !== "active") return null;
      const node = tree.availableLeaves().find((candidate) =>
        !candidate.isComplete &&
        candidate.params?.eventDriven === true &&
        Missions.normalizeActionType(candidate.type) === Missions.ActionType.TRAVEL
      );
      if (!node) return null;
      return { missionId, mission: this.definition(missionId), node };
    }

    primaryEventDrivenTravel() {
      return this.eventDrivenTravelForMission(this.primaryMissionId);
    }

    missionTransitionFor(missionId, context = this.bridge.context()) {
      const explicitTravel = this.eventDrivenTravelForMission(missionId);
      if (explicitTravel) return explicitTravel;
      if (!missionId) return null;

      const mission = this.definition(missionId) || {};
      const tree = this.trees.get(missionId);
      const lifecycle = this.memory.state.missionLifecycle?.[missionId];
      const currentMapId = String(this.engine?.currentMapId || context?.mapId || "");
      if (!tree || lifecycle?.status !== "active" || !currentMapId) return null;

      if (tree.root.isComplete) {
        const runtime = BF.bibleRuntime;
        const construction = runtime?.byId?.get?.(missionId);
        if (runtime?.constructionPlacementEffect?.(construction) &&
            (construction?.activationSource !== "autonomy" ||
             runtime.constructionResourceStatus?.(construction)?.ready === false)) return null;
        const gate = runtime?.completionGateState?.(missionId) || null;
        const targetMapId = String(gate?.targetMapId || "");
        if (
          mission?.completionGate?.autonomousTravel !== false &&
          gate?.managed === true &&
          gate.canFinalize !== true &&
          targetMapId &&
          targetMapId !== currentMapId
        ) {
          return {
            missionId,
            mission,
            source: "completion-gate",
            node: {
              id: `${missionId}:completion-gate`,
              type: Missions.ActionType.TRAVEL,
              params: { eventDriven: true, toMapId: targetMapId, transitionSource: "completion-gate" }
            }
          };
        }
        return null;
      }

      const availableMapStates = tree.availableLeaves()
        .filter((node) => !node.isComplete)
        .map((node) => ({
          node,
          state: this.planner.requiredMapState?.(node, context) || null
        }));
      const legacyGeneratedTargetMissions = new Set([
        "ARCH-01", "ARCH-02", "ARCH-03", "ARCH-04", "ARCH-05", "ARCH-06"
      ]);
      const generatedExcursion = this.memory.getFact?.(
        `tutorialExcursion:${missionId}`,
        null
      );
      const generatedTargetMapId = String(
        generatedExcursion?.generatedTargetMapId || ""
      );
      const generatedTargetProvenance = this.generatedMissionTargetProvenance(
        missionId,
        generatedTargetMapId
      );
      const foreignGeneratedBinding = Boolean(
        mission?.mapGeneration &&
        generatedTargetMapId &&
        generatedTargetProvenance.known &&
        generatedTargetProvenance.valid === false
      );
      // Une map explicitement prescrite par une autre mission ne peut jamais
      // devenir la destination générée canonique de celle-ci. Ce cas peut
      // subsister dans une sauvegarde ancienne après un fan-out de travel.
      // Réémettre la génération canonique également si une feuille disponible
      // exige cette liaison causale absente, sans reset d'arbre ni migration.
      const generatedBindingRequired = availableMapStates.some(({ node }) =>
        node.params?.requiredMapFact === `tutorialExcursion:${missionId}` &&
        node.params?.requiredMapField === "generatedTargetMapId"
      );
      const missingGeneratedBinding = Boolean(
        mission?.mapGeneration && generatedBindingRequired && !generatedTargetMapId &&
        mission.instanceScope !== "map" && mission.localVisibility !== "current-map" &&
        !/^(?:OPP|ANN|PROS)-/.test(String(missionId))
      );
      // Une action locale garde sa priorité, sauf si elle prétend consommer
      // une destination générée dont la provenance est prouvée étrangère.
      if (!missingGeneratedBinding && !(foreignGeneratedBinding && generatedBindingRequired) &&
          this.missionRunnableAction(missionId, tree, context, performance.now(), { reportUnresolved: false })) {
        return null;
      }
      if (foreignGeneratedBinding || missingGeneratedBinding) {
        // Invalider uniquement le binding généré prouvé étranger. On ne
        // réinitialise ni l'arbre ni le lifecycle : la mission reste active et
        // peut réémettre sa propre prescription de génération canonique.
        if (foreignGeneratedBinding) this.memory.setFact?.(`tutorialExcursion:${missionId}`, {
          ...(generatedExcursion && typeof generatedExcursion === "object"
            ? generatedExcursion
            : {}),
          generatedTargetMapId: null,
          mapId: null,
          toMapId: null,
          arrived: false,
          requesting: false,
          generatedAt: 0,
          invalidatedTargetMapId: generatedTargetMapId,
          invalidatedOwnerMissionId: generatedTargetProvenance.ownerMissionId || null,
          invalidatedAt: Date.now()
        });
        this.memory.save?.();
        const preferredDirection = String(mission.trigger?.direction || "")
          .trim()
          .toLowerCase();
        return {
          missionId,
          mission,
          source: "mission-map-generation",
          node: {
            id: `${missionId}:map-generation`,
            type: Missions.ActionType.TRAVEL,
            params: {
              eventDriven: true,
              missionDirectedUnknownTravel: true,
              transitionSource: "mission-map-generation",
              ...(["north", "south", "east", "west"].includes(preferredDirection)
                ? { direction: preferredDirection }
                : {})
            }
          }
        };
      }
      const shelterWork = this.stepShelterRequirementFor(missionId, context);
      if (shelterWork?.targetMapId && shelterWork.targetMapId !== currentMapId) {
        return {
          missionId, mission, source: "required-shelter",
          node: {
            id: `${shelterWork.requiredNodeId}:shelter`,
            type: Missions.ActionType.TRAVEL,
            params: { eventDriven: true, toMapId: shelterWork.targetMapId,
              transitionSource: "required-shelter", sourceNodeId: shelterWork.requiredNodeId }
          }
        };
      }
      const remote = availableMapStates.filter(({ state }) =>
        state?.constrained === true &&
        state.targetMapId &&
        state.targetMapId !== currentMapId
      );
      const targetMapIds = [...new Set(remote.map(({ state }) => String(state.targetMapId)))];
      if (targetMapIds.length === 1) {
        const targetMapId = targetMapIds[0];
        const sourceNode = remote[0].node;
        return {
          missionId,
          mission,
          source: "required-map",
          node: {
            id: sourceNode.id,
            type: Missions.ActionType.TRAVEL,
            params: {
              eventDriven: true,
              toMapId: targetMapId,
              transitionSource: "required-map",
              sourceNodeId: sourceNode.id
            }
          }
        };
      }

      // CONTEXT_MSC possède une destination prescrite par mapGeneration mais
      // aucune feuille objet locale légitime avant l’arrivée. Réutiliser ici
      // uniquement cette destination causale. Les missions SEQUENCE_ACTIONS
      // (FAU/ENE/...) gardent leur cycle travel/étapes et ne peuvent donc pas
      // reprendre autorité via un ancien generatedTargetMapId.
      const missionPattern = String(
        mission?.bible?.pattern || mission?.pattern || ""
      );
      const generatedContextTargetEligible = Boolean(
        !legacyGeneratedTargetMissions.has(missionId) &&
        missionPattern === "CONTEXT_MSC" &&
        mission?.mapGeneration &&
        generatedTargetMapId &&
        (!availableMapStates.length || availableMapStates.some(({ node }) => !this.missionContextMapConsumed(node, generatedTargetMapId)))
      );
      if (generatedContextTargetEligible || legacyGeneratedTargetMissions.has(missionId)) {
        const targetMapId = generatedContextTargetEligible
          ? generatedTargetMapId
          : String(
              generatedExcursion?.generatedTargetMapId ||
              generatedExcursion?.toMapId ||
              generatedExcursion?.mapId ||
              ""
            );
        if (targetMapId && targetMapId !== currentMapId) {
          const transitionSource = generatedContextTargetEligible
            ? "generated-target"
            : "legacy-generated-target";
          return {
            missionId,
            mission,
            source: transitionSource,
            node: {
              id: `${missionId}:generated-target`,
              type: Missions.ActionType.TRAVEL,
              params: {
                eventDriven: true,
                toMapId: targetMapId,
                transitionSource
              }
            }
          };
        }
      }

      const factKey = String(mission.targetMapFact || "").trim();
      if (factKey) {
        const fact = this.memory.getFact?.(factKey, null);
        const field = String(mission.targetMapField || "mapId").trim();
        const targetMapId = String(fact?.[field] || fact?.mapId || "");
        if (targetMapId && targetMapId !== currentMapId) {
          return {
            missionId,
            mission,
            source: "mission-target-map",
            node: {
              id: `${missionId}:target-map`,
              type: Missions.ActionType.TRAVEL,
              params: { eventDriven: true, toMapId: targetMapId, transitionSource: "mission-target-map" }
            }
          };
        }
      }

      const knownDestinationTravel = this.missionKnownDestinationTransition(
        missionId,
        mission,
        availableMapStates,
        currentMapId
      );
      if (knownDestinationTravel) return knownDestinationTravel;

      // Le choix joueur peut transformer un relevé mondial passif en recherche
      // active. Après épuisement du local et du connu, réutiliser le voyage
      // inconnu canonique, uniquement si le catalogue l'autorise explicitement.
      if (mission?.navigation?.autonomousUnknownTravel === true &&
          this.missionIsBackgroundProgressOnly(missionId) &&
          missionId === this.primaryMissionId && this.isPlayerSelectedPrimary() &&
          availableMapStates.some(({ node, state }) =>
            !state?.constrained &&
            (node.params?.envHistoricalFamily || node.params?.envWorldMastery))) {
        return {
          missionId,
          mission,
          source: "mission-map-generation",
          node: {
            id: `${missionId}:map-generation`,
            type: Missions.ActionType.TRAVEL,
            params: {
              eventDriven: true,
              missionDirectedUnknownTravel: true,
              transitionSource: "mission-map-generation"
            }
          }
        };
      }

      // Une mission déjà active peut dépendre d'un contenu que sa prescription
      // mapGeneration devait placer sur la map de découverte. Si ce contenu
      // n'est pas runnable localement et qu'aucune destination connue n'a été
      // résolue ci-dessus, réutiliser le voyage inconnu canonique au lieu de
      // rendre la main à l'autonomie globale. Les opportunités restent exclues :
      // elles ne doivent jamais générer leur propre map.
      const locallyBoundMissionWork = availableMapStates.some(({ state }) =>
        state?.constrained === true &&
        String(state.targetMapId || "") === currentMapId
      );
      const requiredMicroSceneIds = [...new Set(
        (Array.isArray(mission?.mapGeneration?.requiredMicroScenes)
          ? mission.mapGeneration.requiredMicroScenes
          : [])
          .map((entry) => String(entry?.id || ""))
          .filter(Boolean)
      )];
      const materializedMicroSceneIds = new Set(
        (Array.isArray(this.engine?.currentMap?.group?.userData?.microScenes)
          ? this.engine.currentMap.group.userData.microScenes
          : [])
          .map((entry) => String(entry?.id || ""))
          .filter(Boolean)
      );
      const exhaustedContextMap = availableMapStates.length > 0 &&
        availableMapStates.every(({ node }) => this.missionContextMapConsumed(node, currentMapId));
      const prescribedMicroScenesPresent = !exhaustedContextMap && Boolean(
        requiredMicroSceneIds.length &&
        requiredMicroSceneIds.every((id) => materializedMicroSceneIds.has(id))
      );
      const opportunisticMission = /^(?:OPP|ANN|PROS)-/.test(String(missionId));
      const explicitMapDiscoveryPrescription = Boolean(
        mission?.mapGeneration &&
        mission?.trigger?.type === "exploration.map_discovered" &&
        !locallyBoundMissionWork &&
        !prescribedMicroScenesPresent &&
        !opportunisticMission
      );
      const hasDeclaredUnknownTravelStep = Boolean(
        Array.isArray(mission?.sequence) &&
        mission.sequence.some((entry) =>
          Missions.normalizeActionType(entry?.action) === Missions.ActionType.TRAVEL &&
          entry?.params?.eventDriven === true &&
          entry?.params?.newOnly === true
        )
      );
      const knownLocalMissionTarget = this.missionHasKnownLocalDestination(
        missionId,
        mission,
        availableMapStates,
        currentMapId
      );
      const inferredUnknownDiscovery = Boolean(
        mission?.mapGeneration &&
        mission?.trigger?.type !== "exploration.map_discovered" &&
        !hasDeclaredUnknownTravelStep &&
        mission?.navigation?.controlsUnknownTravel !== true &&
        mission?.instanceScope !== "map" &&
        mission?.localVisibility !== "current-map" &&
        !this.missionHasHistoricalCollectionObjective(missionId) &&
        !knownLocalMissionTarget &&
        !locallyBoundMissionWork &&
        !prescribedMicroScenesPresent &&
        !opportunisticMission
      );
      const mapDiscoveryPrescription =
        explicitMapDiscoveryPrescription || inferredUnknownDiscovery;
      if (mapDiscoveryPrescription) {
        const preferredDirection = String(mission.trigger?.direction || "")
          .trim()
          .toLowerCase();
        return {
          missionId,
          mission,
          source: "mission-map-generation",
          node: {
            id: `${missionId}:map-generation`,
            type: Missions.ActionType.TRAVEL,
            params: {
              eventDriven: true,
              missionDirectedUnknownTravel: true,
              transitionSource: "mission-map-generation",
              ...(["north", "south", "east", "west"].includes(preferredDirection)
                ? { direction: preferredDirection }
                : {})
            }
          }
        };
      }
      return null;
    }

    primaryMissionTransition(context = this.bridge.context()) {
      return this.missionTransitionFor(this.primaryMissionId, context);
    }

    missionTransitionTargetMapId(travel) {
      if (!travel?.node) return "";
      const injectedFactTarget = travel.node.params?.targetMapResolvedFromFact === true;
      const injectedKnownTarget =
        travel.node.params?.targetMapResolvedFromKnownDestination === true;
      if (injectedKnownTarget) {
        return String(travel.node.params?.toMapId || "");
      }
      const staticTargetMapId = injectedFactTarget
        ? ""
        : String(travel.node.params?.toMapId || "");
      if (staticTargetMapId) return staticTargetMapId;
      const factKey = String(travel.node.params?.targetMapFact || "").trim();
      if (factKey) return this.travelTargetMapFromFact(travel);
      if (this.knownDestinationCriteria(travel)) {
        const intent = this.memory.getFact?.(
          this.missionReturnIntentKey(travel.missionId),
          null
        );
        if (
          intent?.active === true &&
          intent.kind === "known-destination" &&
          String(intent.nodeId || "") === String(travel.node?.id || "")
        ) {
          return String(intent.targetMapId || intent.mapId || "");
        }
      }
      return "";
    }

    missionUndiscoveredAdjacentTarget(targetMapId) {
      const target = String(targetMapId || "");
      const currentMapId = String(this.engine?.currentMapId || "");
      if (!target || !currentMapId || target === currentMapId) return null;
      const discovered = this.engine?.discoveredMaps instanceof Set
        ? this.engine.discoveredMaps
        : new Set([currentMapId]);
      if (discovered.has(target)) return null;
      let nearest = null;
      for (const frontierMapId of [currentMapId, ...discovered]) {
        const route = frontierMapId === currentMapId
          ? [currentMapId]
          : this.engine?.findKnownRoute?.(currentMapId, frontierMapId);
        if (!Array.isArray(route) || !route.length) continue;
        const exits = BF.maps?.[frontierMapId]?.exits || {};
        for (const direction of ["north", "east", "south", "west"]) {
          if (String(exits?.[direction]?.targetMap || "") !== target) continue;
          if (!nearest || route.length < nearest.route.length) {
            nearest = { targetMapId: target, direction, frontierMapId, route };
          }
        }
      }
      return nearest;
    }

    generatedMissionTargetProvenance(missionId, targetMapId) {
      const target = String(targetMapId || "");
      if (!missionId || !target) return { known: false, valid: true };
      const generator = BF.maps?.[target]?.generator || null;
      const ownerMissionId = String(generator?.bibleMissionId || "");
      const prescribed = generator?.biblePrescriptionApplied === true;
      if (!prescribed || !ownerMissionId) {
        return { known: false, valid: true, ownerMissionId: ownerMissionId || null };
      }
      return {
        known: true,
        valid: ownerMissionId === String(missionId),
        ownerMissionId
      };
    }

    missionTransitionExecutable(travel) {
      if (!travel) return false;
      const currentMapId = String(this.engine?.currentMapId || "");
      if (!currentMapId) return false;
      if (this.isAutonomousUnknownTravel(travel)) {
        const topology = this.engine?.worldTopology;
        if (
          typeof topology?.coordinateOf === "function" &&
          !topology.coordinateOf(currentMapId)
        ) return false;
        return Boolean(this.missionUnknownTravelPlan(travel));
      }
      const targetMapId = this.missionTransitionTargetMapId(travel);
      if (!targetMapId) return false;
      if (this.missionUndiscoveredAdjacentTarget(targetMapId)) return true;
      if (currentMapId === targetMapId) {
        return Boolean(
          this.travelMissionDefinition(travel)?.navigation?.autonomousKnownReturn === true &&
          typeof this.engine?.returnToBase === "function"
        );
      }
      const route = (this.engine?.findOptimalRoute?.(currentMapId, targetMapId) ||
        this.engine?.findKnownRoute?.(currentMapId, targetMapId));
      return Array.isArray(route) && route.length >= 2;
    }


    missionReturnIntentKey(missionId) {
      return `missionReturnIntent:${missionId}`;
    }

    pendingPlayerActionReturn() {
      const ids = new Set([this.primaryMissionId, ...(this.activeMissionIds || []),
        this.engine.persistentNavigationIntent?.missionId]);
      let pending = null;
      for (const id of ids) {
        const intent = this.memory.getFact?.(this.missionReturnIntentKey(id), null);
        if (intent?.active === true && intent.transitionSource === "player-action-return" &&
            (!pending || Number(intent.requestedAt) > Number(pending.requestedAt))) pending = intent;
      }
      return pending;
    }

    cancelPlayerActionReturn() {
      const ids = new Set(Object.entries(this.memory.state.facts || {})
        .filter(([key, value]) => key.startsWith("missionReturnIntent:") &&
          value?.transitionSource === "player-action-return")
        .map(([, value]) => value.missionId));
      for (const id of ids) {
        const key = this.missionReturnIntentKey(id);
        const intent = this.memory.getFact?.(key, null);
        if (intent?.active && intent.transitionSource === "player-action-return") {
          this.memory.setFact?.(key, { ...intent, active: false, completedAt: Date.now() });
        }
      }
      this.memory.save?.();
    }

    requestMissionPlayerActionReturn(missionId, mapId) {
      const destination = BF.bibleRuntime?.missionPlayerActionDestinations?.(missionId)
        .find(entry => entry.mapId === mapId);
      if (!destination) return false;
      const currentMapId = String(this.engine.currentMapId || "");
      if (currentMapId !== mapId) {
        const route = this.engine.findKnownRoute?.(currentMapId, mapId);
        if (!Array.isArray(route) || route.length < 2) return false;
      }
      this.cancelPlayerActionReturn();
      this.memory.setFact?.(this.missionReturnIntentKey(missionId), {
        active: currentMapId !== mapId, missionId, nodeId: destination.nodeId,
        mapId, targetMapId: mapId, kind: "map-travel",
        transitionSource: "player-action-return", requestedAt: Date.now()
      });
      this.memory.save?.();
      this.wakeIdleRetry?.();
      if (currentMapId !== mapId && !this.shouldDeferPlayerActionReturn()) {
        this.engine.handleNavigationSuggestion?.({ mapId,
          source: "mission-player-action", missionId,
          allowTeleportOptimization: false });
      }
      return true;
    }

    shouldDeferPlayerActionReturn() {
      return Boolean(this.memory.getFact?.("missionInventoryReturn:v1", null)?.active ||
        this.localOpportunityWork(this.bridge.context()));
    }

    playerActionReturnWork() {
      const intent = this.pendingPlayerActionReturn();
      if (!intent) return false;
      const nodeId = BF.bibleRuntime?.missionPlayerActionNode?.(intent.missionId);
      if (nodeId !== intent.nodeId || !BF.maps?.[intent.targetMapId] ||
          String(this.engine.currentMapId) === intent.targetMapId) {
        this.cancelPlayerActionReturn();
        if (this.engine.persistentNavigationIntent?.source === "mission-player-action") {
          this.engine.navigationRoute = [];
          this.engine.pendingGate = null;
          this.engine.clearPersistentNavigationIntent?.();
        }
        return false;
      }
      if (this.shouldDeferPlayerActionReturn()) return false;
      const navigation = this.engine.persistentNavigationIntent;
      if (navigation?.source === "mission-player-action" &&
          navigation.mapId === intent.targetMapId &&
          (this.engine.pendingGate || this.engine.navigationRoute?.length)) return true;
      // Sans chemin connu, conserver l’intention mais ne pas créer de voyage
      // fictif. La prochaine passe pourra relire les liens effectivement découverts.
      const route = this.engine.findKnownRoute?.(this.engine.currentMapId, intent.targetMapId);
      if (!Array.isArray(route) || route.length < 2) return false;
      this.engine.handleNavigationSuggestion?.({ mapId: intent.targetMapId,
        source: "mission-player-action", missionId: intent.missionId,
        allowTeleportOptimization: false });
      return true;
    }

    travelMissionDefinition(travel) {
      const missionId = String(travel?.missionId || "");
      return missionId ? this.definition(missionId) : null;
    }

    travelTargetMapFromFact(travel) {
      const mission = this.travelMissionDefinition(travel);
      if (mission?.navigation?.autonomousKnownReturn !== true) return "";
      const factKey = String(travel?.node?.params?.targetMapFact || "").trim();
      if (!factKey) return "";
      const fact = this.memory.getFact?.(factKey, null);
      if (!fact || typeof fact !== "object") return "";
      const field = String(travel.node.params?.targetMapField || "mapId").trim();
      return String(fact[field] || fact.mapId || "");
    }

    normalizeKnownDestinationToken(value) {
      return String(value ?? "")
        .trim()
        .toLocaleLowerCase("fr")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    }

    knownDestinationCriteria(travel) {
      const mission = this.travelMissionDefinition(travel);
      const derivedFromMissionWork =
        travel?.node?.params?.missionDerivedKnownDestination === true;
      if (
        mission?.navigation?.autonomousKnownDestination !== true &&
        !derivedFromMissionWork
      ) return null;
      const params = travel?.node?.params || {};
      const raw = params.knownDestination;
      const explicit = raw && typeof raw === "object" && !Array.isArray(raw)
        ? raw
        : null;
      const factKey = String(params.knownDestinationFact || "").trim();
      const fact = factKey ? this.memory.getFact?.(factKey, null) : null;
      const fromFact = fact && typeof fact === "object" && !Array.isArray(fact)
        ? fact
        : null;
      if (!explicit && !fromFact) return null;
      const merged = { ...(explicit || {}), ...(fromFact || {}) };
      const criteria = {};
      ["siteId", "microSceneId", "persistentMicroSceneId", "resource", "family", "biome", "mapId"].forEach((key) => {
        const value = String(merged[key] ?? "").trim();
        if (value) criteria[key] = value;
      });
      if (Array.isArray(merged.excludeObjectIds)) {
        criteria.excludeObjectIds = [...new Set(
          merged.excludeObjectIds
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        )];
      }
      if (derivedFromMissionWork && merged.sourceNodeId) {
        criteria.sourceNodeId = String(merged.sourceNodeId);
      }
      const minKnownInstances = Number(merged.minKnownInstances);
      if (Number.isFinite(minKnownInstances) && minKnownInstances > 0) {
        criteria.minKnownInstances = Math.max(1, Math.floor(minKnownInstances));
      }
      return Object.keys(criteria).length ? criteria : null;
    }

    missionRelationKnownMapCriteria(tree, node) {
      const relation = node?.params?.relation;
      const fromSlot = String(relation?.fromSlot || "").trim();
      const sameBy = Array.isArray(relation?.sameBy)
        ? relation.sameBy.map(String)
        : [];
      if (!tree || !fromSlot ||
        !sameBy.some((field) => ["instanceId", "mapId"].includes(field))) return null;

      const source = tree.findSequenceSlot
        ? tree.findSequenceSlot(fromSlot)
        : tree.find?.(`${tree.id}:${fromSlot}`);
      if (!source) return null;
      const evidences = (source.historyValues || []).map((value) => {
        try {
          const parsed = JSON.parse(value);
          return parsed?.owner === "object-m0" ? parsed.evidence || null : null;
        } catch {
          return null;
        }
      }).filter(Boolean);

      const reference = [...evidences].reverse().find((evidence) =>
        String(evidence?.mapId || "").trim() &&
        (!sameBy.includes("instanceId") || String(evidence?.instanceId || "").trim())
      );
      return reference
        ? { mapId: String(reference.mapId).trim() }
        : null;
    }

    knownObjectMatchesGeographicFamily(objectId, storedFamily, family) {
      const requested = this.normalizeKnownDestinationToken(family);
      if (!requested) return false;
      if (this.normalizeKnownDestinationToken(storedFamily) === requested) return true;

      const id = String(objectId || "").trim();
      const definition =
        BF.ObjectLibrary?.getById?.(id) ||
        BF.ObjectLibrary?.get?.(id) ||
        null;
      if (!definition) return false;
      const semanticValues = [
        definition.knowledge?.family,
        definition.resource?.family,
        definition.category,
        definition.type,
        definition.subtype,
        ...(Array.isArray(definition.spawn?.tags) ? definition.spawn.tags : [])
      ].map((value) => this.normalizeKnownDestinationToken(value)).filter(Boolean);
      return semanticValues.includes(requested);
    }

    hasKnownGeographicFamily(family) {
      const key = String(family || "").trim();
      if (!key) return false;
      if (
        typeof BF.getKnownSites === "function" &&
        BF.getKnownSites({ family: key }).length > 0
      ) return true;
      const discovered = this.engine?.discoveredMaps instanceof Set
        ? this.engine.discoveredMaps
        : BF.discoveredMaps instanceof Set
          ? BF.discoveredMaps
          : new Set([String(this.engine?.currentMapId || "")].filter(Boolean));
      if (typeof BF.getMapProgressionIndicators !== "function") return false;
      return [...discovered].some((mapId) => {
        const bucket = BF.getMapProgressionIndicators(String(mapId));
        return Object.entries(bucket?.uniqueObjects || {}).some(([objectId, detail]) =>
          this.knownObjectMatchesGeographicFamily(objectId, detail?.family, key)
        );
      });
    }

    missionNodeKnownDestinationCriteria(node, tree = null) {
      const params = node?.params || {};
      const criteria = {};
      if (params.envHistoricalFamily || params.envLocalFamily || params.envWorldMastery) {
        criteria.environmentNodeId = node.id;
      }
      ["siteId", "microSceneId", "persistentMicroSceneId", "resource", "family", "biome"].forEach((key) => {
        const value = String(params[key] ?? "").trim();
        if (value) criteria[key] = value;
      });

      // Relire le contrat objet canonique dans ObjectM0 : une famille seule
      // ne prouve pas la présence du type précis demandé par la feuille.
      if (params.objectId || params.cuoType ||
          (Array.isArray(params.cuoTypes) && params.cuoTypes.length)) {
        criteria.sourceNodeId = node.id;
      }

      const relationCriteria = this.missionRelationKnownMapCriteria(tree, node);
      if (relationCriteria?.mapId) criteria.mapId = relationCriteria.mapId;

      const differentMaps = Array.isArray(params.relation?.differentBy) &&
        params.relation.differentBy.includes("mapId");
      if (differentMaps && tree) {
        // L'identité du nœud permet au consommateur géographique de relire le
        // contrat canonique et ses preuves ; aucune copie des règles relationnelles.
        criteria.sourceNodeId = node.id;
      }

      const subject = String(params.subject || "").trim();
      const distinctByObjectId =
        String(params.distinctBy || "").trim() === "objectId";
      const multiTypeObjective =
        distinctByObjectId && Math.max(1, Number(node?.target) || 1) > 1;
      const worldSearchSubject = this.normalizeKnownDestinationToken(subject);
      if (
        !criteria.family &&
        worldSearchSubject === "mineral" &&
        multiTypeObjective &&
        !relationCriteria?.mapId &&
        this.hasKnownGeographicFamily(worldSearchSubject)
      ) {
        criteria.family = worldSearchSubject;
      }

      if (
        distinctByObjectId &&
        Array.isArray(node?.distinctValues) &&
        node.distinctValues.length
      ) {
        criteria.excludeObjectIds = [...new Set(
          node.distinctValues.map((value) => String(value || "").trim()).filter(Boolean)
        )];
      }

      const minKnownInstances = Number(params.minKnownInstances);
      if (Number.isFinite(minKnownInstances) && minKnownInstances > 0) {
        criteria.minKnownInstances = Math.max(1, Math.floor(minKnownInstances));
      }
      return Object.keys(criteria).length ? criteria : null;
    }

    missionBoundTargetMapCriteria(missionId, node) {
      const type = Missions.normalizeActionType(node?.type);
      if (![
        Missions.ActionType.OBSERVE,
        Missions.ActionType.INSPECT,
        Missions.ActionType.ANALYZE
      ].includes(type)) {
        return null;
      }
      const bound = this.memory.getFact?.(`bibleTarget:${missionId}`, null);
      const mapId = String(bound?.mapId || "").trim();
      return mapId ? { mapId } : null;
    }

    missionNodeProximityKnownDestinationCriteria(mission, node) {
      const missionId = String(mission?.id || "").trim();
      const nodeId = String(node?.id || "").trim();
      if (!missionId || !nodeId.startsWith(`${missionId}:`)) return null;

      const slot = nodeId.slice(missionId.length + 1);
      if (!slot) return null;
      const contexts = (Array.isArray(mission?.proximityContexts)
        ? mission.proximityContexts
        : [])
        .filter((context) => String(context?.slot || "").trim() === slot)
        .map((context) => {
          const criteria = {};
          ["siteId", "microSceneId", "persistentMicroSceneId", "mapId"].forEach((key) => {
            const value = String(context?.[key] ?? "").trim();
            if (value) criteria[key] = value;
          });
          return criteria;
        })
        .filter((criteria) => Object.keys(criteria).length > 0);
      if (!contexts.length) return null;

      const unique = new Map();
      contexts.forEach((criteria) => {
        const signature = JSON.stringify({
          siteId: criteria.siteId || "",
          microSceneId: criteria.microSceneId || "",
          persistentMicroSceneId: criteria.persistentMicroSceneId || "",
          mapId: criteria.mapId || ""
        });
        unique.set(signature, criteria);
      });
      // Several alternative places for the same slot do not define a unique
      // implicit destination. Explicit mission routing remains authoritative.
      if (unique.size !== 1) return null;
      return [...unique.values()][0];
    }

    missionContextMapConsumed(node, mapId) {
      if (node?.params?.biblePattern !== "CONTEXT_MSC" ||
          node.params.distinctBy !== "mapId") return false;
      const prefix = `${String(mapId || "")}:`;
      return (node.distinctValues || []).some((value) => String(value).startsWith(prefix));
    }

    missionGenerationKnownDestinationCriteria(mission) {
      const generation = mission?.mapGeneration || null;
      if (!generation) return null;
      const criteria = {};
      const biome = String(generation.biome || "").trim();
      if (biome && biome !== "random") criteria.biome = biome;
      const requiredMicroScenes = Array.isArray(generation.requiredMicroScenes)
        ? generation.requiredMicroScenes
        : [];
      const microSceneIds = requiredMicroScenes
        .map((entry) => String(entry?.id || "").trim())
        .filter(Boolean);
      // Une prescription composite/dynamique n'identifie pas nécessairement une
      // destination sémantique unique. Ne réutiliser une MSC connue que lorsque
      // la prescription elle-même porte une seule MSC concrète.
      if (requiredMicroScenes.length === 1 && microSceneIds.length === 1) {
        criteria.microSceneId = microSceneIds[0];
      }
      return Object.keys(criteria).length ? criteria : null;
    }

    missionHasKnownLocalDestination(
      missionId,
      mission,
      availableMapStates,
      currentMapId
    ) {
      if (
        mission?.instanceScope === "map" ||
        mission?.localVisibility === "current-map" ||
        this.missionHasHistoricalCollectionObjective(missionId)
      ) return false;
      const tree = this.trees.get(missionId) || null;
      return (availableMapStates || []).some(({ node, state }) => {
        if (!node || node.isComplete || this.missionContextMapConsumed(node, currentMapId)) return false;
        if (
          state?.constrained === true &&
          String(state.targetMapId || "") === currentMapId
        ) return true;
        const criteria =
          this.missionBoundTargetMapCriteria(missionId, node) ||
          this.missionNodeKnownDestinationCriteria(node, tree) ||
          this.missionNodeProximityKnownDestinationCriteria(mission, node) ||
          this.missionGenerationKnownDestinationCriteria(mission);
        if (!criteria) return false;
        const travel = {
          missionId,
          mission,
          node: {
            id: `${node.id}:known-destination-probe`,
            type: Missions.ActionType.TRAVEL,
            params: {
              eventDriven: true,
              missionDerivedKnownDestination: true,
              knownDestination: criteria,
              transitionSource: "mission-known-destination",
              sourceNodeId: node.id
            }
          }
        };
        return this.knownDestinationCandidates(travel, criteria).some((entry) =>
          String(entry.mapId || "") === currentMapId
        );
      });
    }

    missionKnownDestinationTransition(
      missionId,
      mission,
      availableMapStates,
      currentMapId
    ) {
      if (
        mission?.instanceScope === "map" ||
        mission?.localVisibility === "current-map" ||
        this.missionHasHistoricalCollectionObjective(missionId)
      ) return null;
      const tree = this.trees.get(missionId) || null;
      const candidates = [];
      (availableMapStates || []).forEach(({ node, state }) => {
        if (!node || node.isComplete) return;
        if (
          state?.constrained === true &&
          String(state.targetMapId || "") === currentMapId
        ) return;
        const criteria =
          this.missionBoundTargetMapCriteria(missionId, node) ||
          this.missionNodeKnownDestinationCriteria(node, tree) ||
          this.missionNodeProximityKnownDestinationCriteria(mission, node) ||
          this.missionGenerationKnownDestinationCriteria(mission);
        if (!criteria) return;
        const travel = {
          missionId,
          mission,
          source: "mission-known-destination",
          node: {
            id: `${node.id}:known-destination`,
            type: Missions.ActionType.TRAVEL,
            params: {
              eventDriven: true,
              missionDerivedKnownDestination: true,
              knownDestination: criteria,
              transitionSource: "mission-known-destination",
              sourceNodeId: node.id
            }
          }
        };
        const resolvedCandidates = this.knownDestinationCandidates(travel, criteria)
          .filter((entry) => !this.missionContextMapConsumed(node, entry.mapId));
        // Si une cible sémantiquement valide est déjà connue sur la map courante,
        // le problème reste local (approche, contexte, retry, propriétaire runtime).
        // Ne pas fuir vers une autre occurrence uniquement parce que l'action
        // physique n'est pas runnable à cet instant.
        if (resolvedCandidates.some((entry) =>
          String(entry.mapId || "") === currentMapId
        )) return;
        const known = resolvedCandidates.filter((entry) =>
          String(entry.mapId || "") !== currentMapId
        );
        if (!known.length) return;
        const best = known[0];
        travel.node.params.toMapId = String(best.mapId);
        travel.node.params.targetMapResolvedFromKnownDestination = true;
        candidates.push({ travel, best });
      });
      candidates.sort((left, right) =>
        Number(right.best?.baseWeight || 0) - Number(left.best?.baseWeight || 0) ||
        Number(left.best?.routeHops || 0) - Number(right.best?.routeHops || 0)
      );
      return candidates[0]?.travel || null;
    }

    mapMatchesKnownBiome(mapId, biome) {
      const requested = this.normalizeKnownDestinationToken(biome);
      if (!requested) return true;
      const definition = BF.maps?.[mapId];
      if (!definition) return false;
      const aliases = {
        swamp: ["swamp", "marais", "wetland"],
        marais: ["swamp", "marais", "wetland"],
        aquatic: ["aquatic", "aquatique"],
        aquatique: ["aquatic", "aquatique"],
        forest: ["forest", "foret"],
        foret: ["forest", "foret"],
        ruins: ["ruins", "ruine", "ruines"],
        ruines: ["ruins", "ruine", "ruines"]
      };
      const requestedValues = new Set(aliases[requested] || [requested]);
      const values = [
        definition.generator?.biomeId,
        definition.profile,
        definition.name,
        ...(definition.traits || []).flatMap((trait) => [trait?.id, trait?.label])
      ]
        .map((value) => this.normalizeKnownDestinationToken(value))
        .filter(Boolean);
      return values.some((value) =>
        [...requestedValues].some((candidate) =>
          value === candidate || value.includes(candidate)
        )
      );
    }

    knownDestinationCandidates(travel, criteria = this.knownDestinationCriteria(travel)) {
      if (!criteria) return [];
      const currentMapId = String(this.engine?.currentMapId || "");
      if (!currentMapId) return [];
      const discovered = this.engine?.discoveredMaps instanceof Set
        ? this.engine.discoveredMaps
        : BF.discoveredMaps instanceof Set
          ? BF.discoveredMaps
          : new Set([currentMapId]);
      const routeCache = new Map();
      const routeFor = (mapId) => {
        if (routeCache.has(mapId)) return routeCache.get(mapId);
        if (mapId === currentMapId) {
          const local = [currentMapId];
          routeCache.set(mapId, local);
          return local;
        }
        const route = this.engine?.findOptimalRoute?.(currentMapId, mapId) ||
          this.engine?.findKnownRoute?.(currentMapId, mapId);
        const normalized = Array.isArray(route) && route.length >= 2 ? route : null;
        routeCache.set(mapId, normalized);
        return normalized;
      };
      const siteCriteria = {};
      ["siteId", "microSceneId", "resource", "family", "mapId"].forEach((key) => {
        if (criteria[key]) siteCriteria[key] = criteria[key];
      });
      const persistentMicroSceneId = String(
        criteria.persistentMicroSceneId || ""
      ).trim();
      const hasPersistentMicroSceneIdentity = Boolean(persistentMicroSceneId);
      const hasSemanticSiteCriteria = Boolean(
        hasPersistentMicroSceneIdentity ||
        ["siteId", "microSceneId", "resource", "family"]
          .some((key) => Boolean(siteCriteria[key]))
      );
      const excludedObjectIds = new Set(
        Array.isArray(criteria.excludeObjectIds)
          ? criteria.excludeObjectIds.map((value) => String(value || "").trim()).filter(Boolean)
          : []
      );
      const siteHasUsefulDistinctObject = (site) => {
        if (!excludedObjectIds.size) return true;
        const instances = Object.values(site?.instances || {});
        return instances.some((instance) => {
          const objectId = String(instance?.objectId || "").trim();
          if (!objectId || excludedObjectIds.has(objectId)) return false;
          if (criteria.family && !instance?.families?.[criteria.family]) return false;
          if (criteria.resource && !instance?.resources?.[criteria.resource]) return false;
          return true;
        });
      };
      let rawCandidates = [];

      if (hasSemanticSiteCriteria) {
        const knownSites = !hasPersistentMicroSceneIdentity &&
          typeof BF.getKnownSites === "function"
          ? BF.getKnownSites(siteCriteria)
          : [];
        rawCandidates = knownSites
          .filter((site) => site?.mapId && discovered.has(String(site.mapId)))
          .filter((site) => !criteria.biome || this.mapMatchesKnownBiome(site.mapId, criteria.biome))
          .filter((site) =>
            !criteria.minKnownInstances ||
            Number(site.knownInstanceCount) >= Number(criteria.minKnownInstances)
          )
          .filter(siteHasUsefulDistinctObject)
          .slice(0, 24)
          .map((site) => ({
            mapId: String(site.mapId),
            siteId: site.siteId || null,
            microSceneId: site.microSceneId || null,
            anchor: site.anchor || null,
            knownInstanceCount: Number(site.knownInstanceCount) || 0,
            resourceCount: criteria.resource
              ? Number(site.resources?.[criteria.resource]?.distinctInstances) || 0
              : 0,
            familyCount: criteria.family
              ? Number(site.families?.[criteria.family]?.distinctInstances) || 0
              : 0
          }));

        // Une identité persistante explicite (ex. GEO-01/FALAISE1-A) est
        // plus forte qu'une famille sémantique. Elle doit être résolue sur le
        // record canonique PersistentMicroScenes et ne peut jamais retomber
        // vers une autre MSC simplement parce qu'elle expose la même famille.
        if (hasPersistentMicroSceneIdentity) {
          [...discovered].map(String).forEach((mapId) => {
            if (criteria.mapId && criteria.mapId !== mapId) return;
            if (criteria.biome && !this.mapMatchesKnownBiome(mapId, criteria.biome)) return;
            const records = BF.maps?.[mapId]?.persistentMicroScenes || [];
            const record = records.find((entry) =>
              String(entry?.instanceId || "") === persistentMicroSceneId &&
              entry?.microSceneId &&
              BF.MicroScenes?.get?.(String(entry.microSceneId))
            );
            if (!record) return;
            rawCandidates.push({
              mapId,
              siteId: null,
              microSceneId: String(record.microSceneId),
              persistentMicroSceneId,
              anchor: record.anchor || null,
              knownInstanceCount: 0,
              resourceCount: 0,
              familyCount: 0
            });
          });
        }

        // A prescribed persistent MSC is already a known map destination,
        // even before its first object has been observed as a known site.
        // The record does not prove resources, families or object distinctness.
        if (
          criteria.microSceneId && !criteria.siteId && !criteria.resource &&
          !criteria.family && !criteria.minKnownInstances &&
          !excludedObjectIds.size
        ) {
          [...discovered].map(String).forEach((mapId) => {
            if (criteria.mapId && criteria.mapId !== mapId) return;
            if (criteria.biome && !this.mapMatchesKnownBiome(mapId, criteria.biome)) return;
            if (rawCandidates.some((candidate) => candidate.mapId === mapId &&
              candidate.microSceneId === criteria.microSceneId)) return;
            const records = BF.maps?.[mapId]?.persistentMicroScenes || [];
            const record = records.find((entry) =>
              String(entry?.microSceneId || "") === criteria.microSceneId &&
              BF.MicroScenes?.get?.(criteria.microSceneId)
            );
            if (!record) return;
            rawCandidates.push({
              mapId, siteId: null, microSceneId: criteria.microSceneId,
              anchor: record.anchor || null, knownInstanceCount: 0,
              resourceCount: 0, familyCount: 0
            });
          });
        }

        // Les objets de population normale n'ont pas nécessairement de contexte
        // MSC et ne figurent donc pas dans knownSites. ProgressionMultiSystem
        // conserve néanmoins leur objectId + family par map dans mapIndicators.
        // Cette source complète la mémoire de sites sans créer de second registre.
        if (
          criteria.family &&
          !hasPersistentMicroSceneIdentity &&
          typeof BF.getMapProgressionIndicators === "function"
        ) {
          const existingMaps = new Set(rawCandidates.map((entry) => String(entry.mapId)));
          [...discovered].map(String).forEach((mapId) => {
            if (existingMaps.has(mapId)) return;
            if (criteria.biome && !this.mapMatchesKnownBiome(mapId, criteria.biome)) return;
            const bucket = BF.getMapProgressionIndicators(mapId);
            const usefulObjects = Object.entries(bucket?.uniqueObjects || {})
              .filter(([objectId, detail]) =>
                this.knownObjectMatchesGeographicFamily(
                  objectId,
                  detail?.family,
                  criteria.family
                ) &&
                !excludedObjectIds.has(String(objectId))
              );
            if (!usefulObjects.length) return;
            rawCandidates.push({
              mapId,
              siteId: null,
              microSceneId: null,
              anchor: null,
              knownInstanceCount: usefulObjects.length,
              resourceCount: 0,
              familyCount: usefulObjects.length
            });
            existingMaps.add(mapId);
          });
        }
      } else if (criteria.environmentNodeId) {
        const node = this.trees.get(String(travel?.missionId || ""))?.find?.(criteria.environmentNodeId);
        rawCandidates = (BF.bibleRuntime?.environmentPlayerDestinationMaps?.(node) || [])
          .filter((mapId) => discovered.has(mapId) && (!criteria.mapId || criteria.mapId === mapId))
          .map((mapId) => ({ mapId, siteId: null, microSceneId: null, anchor: null,
            knownInstanceCount: 0, resourceCount: 0, familyCount: 0 }));
      } else if (criteria.mapId) {
        const mapId = String(criteria.mapId);
        rawCandidates = discovered.has(mapId)
          ? [{
              mapId,
              siteId: null,
              microSceneId: null,
              anchor: null,
              knownInstanceCount: 0,
              resourceCount: 0,
              familyCount: 0
            }]
          : [];
      } else if (criteria.biome) {
        rawCandidates = [...discovered]
          .map(String)
          .filter((mapId) => this.mapMatchesKnownBiome(mapId, criteria.biome))
          .map((mapId) => ({
            mapId,
            siteId: null,
            microSceneId: null,
            anchor: null,
            knownInstanceCount: 0,
            resourceCount: 0,
            familyCount: 0
          }));
      }

      const sourceNodeId = String(criteria.sourceNodeId || "");
      const sourceTree = this.trees.get(String(travel?.missionId || ""));
      const sourceNode = sourceTree?.find?.(sourceNodeId);
      if (sourceNodeId) {
        if (!sourceNode || typeof BF.matchesKnownMissionObject !== "function") return [];
        const matchesKnownObject = (mapId, objectId, detail = {}) =>
          BF.matchesKnownMissionObject(sourceTree, sourceNode, {
            ...detail, mapId, objectId
          });
        // Une MSC connue apporte ses instances/contexte. Les objets de population
        // viennent du même mapIndicators canonique déjà consommé pour les familles.
        const matchingMaps = new Set();
        const sites = typeof BF.getKnownSites === "function" ? BF.getKnownSites({}) : [];
        sites.forEach((site) => {
          if (!discovered.has(String(site.mapId))) return;
          Object.entries(site.instances || {}).forEach(([instanceId, detail]) => {
            if (matchesKnownObject(String(site.mapId), detail?.objectId, {
              instanceId, microSceneId: site.microSceneId,
              persistentMicroSceneId: site.siteId
            })) matchingMaps.add(String(site.mapId));
          });
        });
        [...discovered].map(String).forEach((mapId) => {
          const bucket = BF.getMapProgressionIndicators?.(mapId);
          Object.entries(bucket?.uniqueObjects || {}).forEach(([objectId]) => {
            if (matchesKnownObject(mapId, objectId)) matchingMaps.add(mapId);
          });
        });
        rawCandidates = rawCandidates.filter((entry) => matchingMaps.has(entry.mapId));
        matchingMaps.forEach((mapId) => {
          // Une preuve d'objet ne remplace pas un site/une MSC explicitement requis.
          if (hasSemanticSiteCriteria) return;
          if (criteria.mapId && criteria.mapId !== mapId) return;
          if (criteria.biome && !this.mapMatchesKnownBiome(mapId, criteria.biome)) return;
          if (!rawCandidates.some((entry) => entry.mapId === mapId)) {
            rawCandidates.push({ mapId, siteId: null, microSceneId: null,
              anchor: null, knownInstanceCount: 0, resourceCount: 0, familyCount: 0 });
          }
        });
      }

      const candidates = [];
      for (const candidate of rawCandidates) {
        const route = routeFor(candidate.mapId);
        if (!route) continue;
        const hops = Math.max(0, route.length - 1);
        let knowledgeValue = 30;
        if (candidate.siteId) {
          knowledgeValue = 18 + Math.min(10, candidate.knownInstanceCount) * 3;
          if (criteria.siteId) knowledgeValue += 85;
          if (criteria.microSceneId) knowledgeValue += 12;
          if (criteria.resource) knowledgeValue += Math.min(10, candidate.resourceCount) * 14;
          if (criteria.family) knowledgeValue += Math.min(10, candidate.familyCount) * 10;
        } else {
          const surface = Number(BF.getMapExplorationState?.(candidate.mapId)?.surfacePercent) || 0;
          knowledgeValue += Math.min(20, Math.max(0, surface) * 0.2);
        }
        const routePenalty = hops * 11;
        candidates.push({
          ...candidate,
          route,
          routeHops: hops,
          knowledgeValue,
          baseWeight: Math.max(1, knowledgeValue - routePenalty)
        });
      }
      return candidates
        .sort((left, right) =>
          right.baseWeight - left.baseWeight ||
          left.routeHops - right.routeHops ||
          String(left.siteId || left.mapId).localeCompare(String(right.siteId || right.mapId))
        )
        .slice(0, 12);
    }

    validatePersistedKnownDestination(travel, criteria, previous) {
      if (!criteria || previous?.kind !== "known-destination") return null;
      if (previous?.active !== true) return null;
      if (String(previous.nodeId || "") !== String(travel?.node?.id || "")) return null;
      const signature = JSON.stringify(criteria);
      if (String(previous.knownDestinationSignature || "") !== signature) return null;

      const targetMapId = String(previous.targetMapId || previous.mapId || "");
      if (!targetMapId) return null;
      const currentMapId = String(this.engine?.currentMapId || "");
      if (!currentMapId) return null;
      const discovered = this.engine?.discoveredMaps instanceof Set
        ? this.engine.discoveredMaps
        : BF.discoveredMaps instanceof Set
          ? BF.discoveredMaps
          : new Set([currentMapId]);
      if (!discovered.has(targetMapId)) return null;
      if (criteria.mapId && String(criteria.mapId) !== targetMapId) return null;
      if (criteria.biome && !this.mapMatchesKnownBiome(targetMapId, criteria.biome)) return null;

      const route = targetMapId === currentMapId
        ? [currentMapId]
        : (this.engine?.findOptimalRoute?.(currentMapId, targetMapId) ||
          this.engine?.findKnownRoute?.(currentMapId, targetMapId));
      if (!Array.isArray(route) || route.length < 1) return null;
      if (targetMapId !== currentMapId && route.length < 2) return null;

      const excludedObjectIds = new Set(
        Array.isArray(criteria.excludeObjectIds)
          ? criteria.excludeObjectIds.map((value) => String(value || "").trim()).filter(Boolean)
          : []
      );
      const targetSiteId = String(previous.targetSiteId || "").trim();
      const persistentMicroSceneId = String(
        criteria.persistentMicroSceneId || ""
      ).trim();

      if (persistentMicroSceneId) {
        const record = (BF.maps?.[targetMapId]?.persistentMicroScenes || [])
          .find((entry) =>
            String(entry?.instanceId || "") === persistentMicroSceneId &&
            entry?.microSceneId &&
            BF.MicroScenes?.get?.(String(entry.microSceneId))
          );
        if (!record) return null;
        return {
          mapId: targetMapId,
          siteId: null,
          microSceneId: String(record.microSceneId),
          persistentMicroSceneId,
          anchor: record.anchor || null,
          knownInstanceCount: 0,
          resourceCount: 0,
          familyCount: 0,
          route,
          routeHops: Math.max(0, route.length - 1),
          criteria
        };
      }

      if (targetSiteId) {
        const site = typeof BF.getKnownSite === "function"
          ? BF.getKnownSite(targetSiteId)
          : null;
        if (!site || String(site.mapId || "") !== targetMapId) return null;
        if (criteria.siteId && String(criteria.siteId) !== String(site.siteId || "")) return null;
        if (
          criteria.microSceneId &&
          String(criteria.microSceneId) !== String(site.microSceneId || "")
        ) return null;
        if (criteria.resource && !site.resources?.[criteria.resource]) return null;
        if (criteria.family && !site.families?.[criteria.family]) return null;
        if (
          criteria.minKnownInstances &&
          Number(site.knownInstanceCount) < Number(criteria.minKnownInstances)
        ) return null;
        if (excludedObjectIds.size) {
          const usefulInstance = Object.values(site.instances || {}).some((instance) => {
            const objectId = String(instance?.objectId || "").trim();
            if (!objectId || excludedObjectIds.has(objectId)) return false;
            if (criteria.family && !instance?.families?.[criteria.family]) return false;
            if (criteria.resource && !instance?.resources?.[criteria.resource]) return false;
            return true;
          });
          if (!usefulInstance) return null;
        }
        return {
          mapId: targetMapId,
          siteId: site.siteId || targetSiteId,
          microSceneId: site.microSceneId || previous.targetMicroSceneId || null,
          anchor: site.anchor || previous.targetAnchor || null,
          knownInstanceCount: Number(site.knownInstanceCount) || 0,
          resourceCount: criteria.resource
            ? Number(site.resources?.[criteria.resource]?.distinctInstances) || 0
            : 0,
          familyCount: criteria.family
            ? Number(site.families?.[criteria.family]?.distinctInstances) || 0
            : 0,
          route,
          routeHops: Math.max(0, route.length - 1),
          criteria
        };
      }

      // Les destinations sans siteId proviennent principalement des indicateurs
      // de population par map. Elles doivent être revalidées sur la map choisie
      // elle-même, sans repasser par le Top-N pondéré des destinations.
      if (criteria.microSceneId && !criteria.siteId && !criteria.resource &&
          !criteria.family && !criteria.minKnownInstances && !excludedObjectIds.size) {
        const record = (BF.maps?.[targetMapId]?.persistentMicroScenes || [])
          .find((entry) => String(entry?.microSceneId || "") === criteria.microSceneId);
        if (!record || !BF.MicroScenes?.get?.(criteria.microSceneId)) return null;
        return {
          mapId: targetMapId, siteId: null, microSceneId: criteria.microSceneId,
          anchor: record.anchor || null, knownInstanceCount: 0,
          resourceCount: 0, familyCount: 0, route,
          routeHops: Math.max(0, route.length - 1), criteria
        };
      }
      if (criteria.siteId || criteria.microSceneId || criteria.resource) return null;
      let knownInstanceCount = 0;
      let familyCount = 0;
      if (criteria.family) {
        if (typeof BF.getMapProgressionIndicators !== "function") return null;
        const bucket = BF.getMapProgressionIndicators(targetMapId);
        const usefulObjects = Object.entries(bucket?.uniqueObjects || {})
          .filter(([objectId, detail]) =>
            this.knownObjectMatchesGeographicFamily(
              objectId,
              detail?.family,
              criteria.family
            ) &&
            !excludedObjectIds.has(String(objectId))
          );
        if (!usefulObjects.length) return null;
        knownInstanceCount = usefulObjects.length;
        familyCount = usefulObjects.length;
        if (
          criteria.minKnownInstances &&
          knownInstanceCount < Number(criteria.minKnownInstances)
        ) return null;
      }

      return {
        mapId: targetMapId,
        siteId: null,
        microSceneId: null,
        anchor: null,
        knownInstanceCount,
        resourceCount: 0,
        familyCount,
        route,
        routeHops: Math.max(0, route.length - 1),
        criteria
      };
    }

    resolveKnownDestination(travel) {
      const criteria = this.knownDestinationCriteria(travel);
      if (!criteria) return null;
      const candidates = this.knownDestinationCandidates(travel, criteria);
      if (!candidates.length) return null;
      if (criteria.siteId) {
        const exact = candidates.find((candidate) => candidate.siteId === criteria.siteId);
        return exact ? { ...exact, criteria } : null;
      }
      const axis = this.missionActionAxis(
        travel.missionId,
        { type: Missions.ActionType.TRAVEL }
      );
      const options = candidates.map((candidate) => ({
        id: `known-destination:${candidate.siteId || candidate.mapId}`,
        axis,
        baseWeight: candidate.baseWeight,
        candidate
      }));
      const selected = BF.BAC?.weightedPick?.(options)?.candidate || candidates[0];
      return selected ? { ...selected, criteria } : null;
    }

    isAutonomousUnknownTravel(travel) {
      const mission = this.travelMissionDefinition(travel);
      const factTargetDeclared = Boolean(
        String(travel?.node?.params?.targetMapFact || "").trim()
      );
      const knownTargetDeclared = Boolean(this.knownDestinationCriteria(travel));
      return Boolean(
        travel &&
        (
          mission?.navigation?.autonomousUnknownTravel === true ||
          travel.node?.params?.missionDirectedUnknownTravel === true
        ) &&
        !travel.node?.params?.toMapId &&
        !factTargetDeclared &&
        !knownTargetDeclared
      );
    }

    missionUnknownTravelPlan(travel) {
      const directions = ["north", "east", "south", "west"];
      const preferred = String(travel?.node?.params?.direction || "")
        .trim()
        .toLowerCase();
      const currentMapId = String(this.engine?.currentMapId || "");
      if (!currentMapId) return null;

      // Les transitions synthétiques issues d'une prescription directionnelle
      // conservent cet axe à travers les maps déjà connues jusqu'au premier
      // vrai front inconnu. Elles ne dérivent pas vers une autre sortie libre.
      if (
        travel?.node?.params?.missionDirectedUnknownTravel === true &&
        directions.includes(preferred)
      ) {
        const discovered = this.engine?.discoveredMaps instanceof Set
          ? this.engine.discoveredMaps
          : new Set([currentMapId]);
        const route = [currentMapId];
        const visited = new Set(route);
        let mapId = currentMapId;
        while (true) {
          const exit = BF.maps?.[mapId]?.exits?.[preferred] || null;
          const nextMapId = String(exit?.targetMap || "");
          if (!nextMapId) {
            return { frontierMapId: mapId, direction: preferred, route };
          }
          if (!discovered.has(nextMapId) || visited.has(nextMapId)) return null;
          visited.add(nextMapId);
          route.push(nextMapId);
          mapId = nextMapId;
        }
      }

      const freeDirection = (mapId) => {
        const exits = BF.maps?.[mapId]?.exits || {};
        if (directions.includes(preferred) && !exits[preferred]) return preferred;
        return directions.find((direction) => !exits[direction]) || null;
      };

      const localDirection = freeDirection(currentMapId);
      if (localDirection) {
        return {
          frontierMapId: currentMapId,
          direction: localDirection,
          route: [currentMapId]
        };
      }

      const discovered = this.engine?.discoveredMaps instanceof Set
        ? this.engine.discoveredMaps
        : new Set([currentMapId]);
      const queue = [[currentMapId]];
      const visited = new Set([currentMapId]);

      while (queue.length) {
        const route = queue.shift();
        const mapId = route[route.length - 1];
        if (mapId !== currentMapId) {
          const direction = freeDirection(mapId);
          if (direction) {
            return { frontierMapId: mapId, direction, route };
          }
        }
        const exits = Object.values(BF.maps?.[mapId]?.exits || {});
        for (const exit of exits) {
          const nextMapId = String(exit?.targetMap || "");
          if (!nextMapId || visited.has(nextMapId) || !discovered.has(nextMapId)) continue;
          visited.add(nextMapId);
          queue.push([...route, nextMapId]);
        }
      }
      return null;
    }

    isMissionTransitionDeferralEligible(
      missionId,
      context = this.bridge.context()
    ) {
      // Les missions de collecte historique sont cumulatives et progressent
      // passivement. Elles ne constituent donc pas une opportunité locale
      // perdable capable de retarder un voyage missionnel exécutable.
      if (this.missionHasHistoricalCollectionObjective(missionId)) return false;
      return this.isMissionTransitionOpportunity(missionId, context);
    }

    transitionLocalCandidates(missionId, context = this.bridge.context()) {
      return this.activeMissionIds
        .filter((id) => id !== missionId)
        .filter((id) => this.ensureLifecycle(id).status === "active")
        .filter((id) => this.isMissionTransitionDeferralEligible(id, context))
        .filter((id) => {
          const tree = this.trees.get(id);
          return Boolean(
            tree &&
            !tree.root.isComplete &&
            this.missionRunnableAction(id, tree, context)
          );
        });
    }

    chooseTransitionDeferralMission(
      transitionMissionId,
      eligibleMissionIds,
      context = this.bridge.context()
    ) {
      const ids = Array.isArray(eligibleMissionIds)
        ? eligibleMissionIds.filter(Boolean)
        : [];
      if (!ids.length) return null;

      const assessments = ids
        .map((id) => this.assessMission(id, context))
        .filter((candidate) => candidate?.action);

      if (!assessments.length) return null;

      const BAC = BF.BAC;
      if (!BAC?.weightedPick) return null;

      const transitionDefinition = this.definition(transitionMissionId) || {};
      const transitionOption = {
        id: `mission-transition:${transitionMissionId}`,
        axis: this.missionActionAxis(
          transitionMissionId,
          { type: Missions.ActionType.TRAVEL }
        ),
        baseWeight: Math.max(1, Number(transitionDefinition.priority) || 1),
        transition: true
      };

      const options = [transitionOption];
      assessments.forEach((candidate) => {
        options.push({
          id: `mission-local:${candidate.missionId}`,
          axis: this.missionActionAxis(candidate.missionId, candidate.action),
          baseWeight: Math.max(1, Number(candidate.score) || 1),
          missionId: candidate.missionId
        });
      });

      const selected = BAC.weightedPick(options);
      return selected?.missionId || null;
    }

    ensureMissionTransitionIntent(context = null, travelOverride = null) {
      const decisionContext = context || this.bridge.context();
      const playerReturn = this.memory.getFact?.(this.missionReturnIntentKey(this.primaryMissionId), null);
      if (playerReturn?.active && playerReturn.transitionSource === "player-action-return") return playerReturn;
      const travel = travelOverride || this.primaryMissionTransition(decisionContext);
      if (travel && !this.missionAllowsAutomaticExecution(travel.missionId)) {
        const key = this.missionReturnIntentKey(travel.missionId);
        const previous = this.memory.getFact?.(key, null);
        if (previous?.active === true) {
          this.memory.setFact?.(key, {
            ...previous,
            active: false,
            completedAt: Date.now(),
            updatedAt: Date.now()
          });
          this.memory.save?.();
        }
        return null;
      }
      if (!travel) {
        const key = this.missionReturnIntentKey(this.primaryMissionId);
        const previous = this.memory.getFact?.(key, null);
        const genericSources = new Set([
          "required-map",
          "required-shelter",
          "mission-target-map",
          "completion-gate",
          "known-destination",
          "mission-map-generation",
          "generated-target",
          "legacy-generated-target"
        ]);
        if (previous?.active === true && genericSources.has(String(previous.transitionSource || ""))) {
          const currentMapId = String(this.engine?.currentMapId || decisionContext?.mapId || "");
          const targetMapId = String(previous.targetMapId || previous.mapId || "");
          const completionGateTravelDisabled = Boolean(
            String(previous.transitionSource || "") === "completion-gate" &&
            (this.definition(this.primaryMissionId)?.completionGate?.autonomousTravel === false ||
             (BF.bibleRuntime?.constructionPlacementEffect?.(
                BF.bibleRuntime?.byId?.get?.(this.primaryMissionId)) &&
              BF.bibleRuntime?.byId?.get?.(this.primaryMissionId)?.activationSource !== "autonomy"))
          );
          if (completionGateTravelDisabled || !targetMapId || targetMapId === currentMapId) {
            this.memory.setFact?.(key, {
              ...previous,
              active: false,
              completedAt: Date.now(),
              updatedAt: Date.now()
            });
            this.memory.save?.();
          }
        }
        return null;
      }

      const mission = this.travelMissionDefinition(travel);
      const targetMapFactDeclared = Boolean(
        String(travel.node?.params?.targetMapFact || "").trim()
      );
      const injectedFactTarget = travel.node?.params?.targetMapResolvedFromFact === true;
      const injectedKnownTarget =
        travel.node?.params?.targetMapResolvedFromKnownDestination === true;
      const staticTargetMapId = injectedFactTarget || injectedKnownTarget
        ? ""
        : String(travel.node?.params?.toMapId || "");
      const factTargetMapId = targetMapFactDeclared && !staticTargetMapId
        ? this.travelTargetMapFromFact(travel)
        : "";
      const knownCriteria = !staticTargetMapId && !factTargetMapId
        ? this.knownDestinationCriteria(travel)
        : null;
      const key = this.missionReturnIntentKey(travel.missionId);
      const previous = this.memory.getFact?.(key, null);
      const currentMapId = String(this.engine?.currentMapId || "");
      const knownSignature = knownCriteria ? JSON.stringify(knownCriteria) : "";
      const cachedDeferMissionId = String(previous?.deferMissionId || "");
      const cachedDeferralStillEligible = !cachedDeferMissionId ||
        this.isMissionTransitionDeferralEligible(
          cachedDeferMissionId,
          decisionContext
        );
      const persistedKnownResolution = knownCriteria
        ? this.validatePersistedKnownDestination(travel, knownCriteria, previous)
        : null;
      if (
        persistedKnownResolution &&
        previous?.decisionResolved === true &&
        cachedDeferralStillEligible &&
        String(previous.evaluatedMapId || "") === currentMapId
      ) {
        const cachedTargetMapId = String(previous.targetMapId || previous.mapId || "");
        if (cachedTargetMapId && travel.node?.params) {
          travel.node.params.toMapId = cachedTargetMapId;
          travel.node.params.targetMapResolvedFromKnownDestination = true;
        }
        if (
          previous.satisfiedLocally === true &&
          cachedTargetMapId === currentMapId
        ) {
          BF.progressSpecificTravelMissionNode?.(
            this,
            travel.missionId,
            travel.node,
            {
              fromMapId: currentMapId,
              toMapId: currentMapId,
              mapId: currentMapId,
              source: "known-destination-local",
              semanticLocal: true
            }
          );
        }
        return previous;
      }
      const knownResolution = knownCriteria
        ? persistedKnownResolution || this.resolveKnownDestination(travel)
        : null;
      const semanticTargetMapId = String(knownResolution?.mapId || "");
      const targetMapId = staticTargetMapId || factTargetMapId || semanticTargetMapId;

      if (knownResolution && semanticTargetMapId && travel.node?.params) {
        travel.node.params.toMapId = semanticTargetMapId;
        travel.node.params.targetMapResolvedFromKnownDestination = true;
      } else if (!knownResolution && injectedKnownTarget && travel.node?.params) {
        delete travel.node.params.toMapId;
        delete travel.node.params.targetMapResolvedFromKnownDestination;
      }

      // Une destination résolue depuis la mémoire devient le filtre concret du
      // nœud de voyage courant. Le marqueur de provenance évite de la confondre
      // ensuite avec un ancien `toMapId` statique (notamment les retours base).
      if (factTargetMapId && !staticTargetMapId && travel.node?.params) {
        travel.node.params.toMapId = factTargetMapId;
        travel.node.params.targetMapResolvedFromFact = true;
      } else if (!factTargetMapId && injectedFactTarget && travel.node?.params) {
        delete travel.node.params.toMapId;
        delete travel.node.params.targetMapResolvedFromFact;
      }

      const unknownTravel = this.isAutonomousUnknownTravel(travel);
      if (!unknownTravel && !targetMapId) return null;

      if (knownResolution && semanticTargetMapId === currentMapId) {
        const localResolution = {
          ...(previous && typeof previous === "object" ? previous : {}),
          active: false,
          satisfiedLocally: true,
          missionId: travel.missionId,
          nodeId: travel.node?.id || null,
          kind: "known-destination",
          mapId: currentMapId,
          targetMapId: currentMapId,
          targetSiteId: knownResolution.siteId || null,
          targetMicroSceneId: knownResolution.microSceneId || null,
          targetAnchor: knownResolution.anchor || null,
          knownDestinationCriteria: knownCriteria,
          knownDestinationSignature: knownSignature,
          transitionSource: "known-destination",
          evaluatedMapId: currentMapId,
          decisionResolved: true,
          eligibleLocalMissionIds: [],
          deferMissionId: null,
          createdAt: Number(previous?.createdAt) || Date.now(),
          updatedAt: Date.now()
        };
        this.memory.setFact?.(key, localResolution);
        this.memory.save?.();
        BF.progressSpecificTravelMissionNode?.(
          this,
          travel.missionId,
          travel.node,
          {
            fromMapId: currentMapId,
            toMapId: currentMapId,
            mapId: currentMapId,
            source: "known-destination-local",
            semanticLocal: true
          }
        );
        return localResolution;
      }

      const kind = unknownTravel
        ? "unknown-travel"
        : knownResolution
          ? "known-destination"
          : factTargetMapId
            ? "map-travel"
            : mission?.navigation?.autonomousKnownReturn === true
              ? "return-base"
              : "map-travel";
      const causalArrivalEligible = Boolean(
        !this.missionHasHistoricalCollectionObjective(travel.missionId) &&
        targetMapId &&
        (
          travel.missionId !== this.primaryMissionId ||
          travel.source === "required-map"
        )
      );
      const previousSameContext = Boolean(
        previous?.active === true &&
        cachedDeferralStillEligible &&
        String(previous.nodeId || "") === String(travel.node?.id || "") &&
        String(previous.evaluatedMapId || "") === currentMapId &&
        previous.kind === kind
      );

      // Tant que mission, noeud, map et nature du trajet sont inchangés,
      // l'intention persistée reste le résultat canonique. Aucun nouveau
      // contexte ni parcours de topologie n'est nécessaire.
      if (
        previousSameContext &&
        (
          unknownTravel
            ? Boolean(previous.direction && previous.frontierMapId)
            : String(previous.mapId || previous.targetMapId || "") === targetMapId
        )
      ) {
        return previous;
      }

      const travelPlan = unknownTravel
        ? this.missionUnknownTravelPlan(travel)
        : null;
      const direction = unknownTravel
        ? String(travelPlan?.direction || "")
        : null;
      const frontierMapId = unknownTravel
        ? String(travelPlan?.frontierMapId || "")
        : "";
      if (unknownTravel && (!direction || !frontierMapId)) return null;

      const intent = {
        ...(previous && typeof previous === "object" ? previous : {}),
        active: true,
        missionId: travel.missionId,
        nodeId: travel.node?.id || null,
        kind,
        mapId: targetMapId || null,
        targetMapId: targetMapId || null,
        targetSiteId: knownResolution?.siteId || null,
        targetMicroSceneId: knownResolution?.microSceneId || null,
        targetAnchor: knownResolution?.anchor || null,
        knownDestinationCriteria: knownCriteria || null,
        knownDestinationSignature: knownSignature || null,
        frontierMapId: frontierMapId || null,
        direction,
        transitionSource: knownResolution
          ? "known-destination"
          : travel.source || travel.node?.params?.transitionSource || "explicit-travel",
        evaluatedMapId: currentMapId,
        eligibleLocalMissionIds: [],
        deferMissionId: null,
        decisionResolved: false,
        arrivalWorkMissionId: causalArrivalEligible ? travel.missionId : null,
        arrivalWorkMapId: causalArrivalEligible ? targetMapId : null,
        arrivalWorkPending: causalArrivalEligible,
        createdAt: Number(previous?.createdAt) || Date.now(),
        updatedAt: Date.now()
      };

      this.memory.setFact?.(key, intent);
      this.memory.save?.();

      const eligibleLocalMissionIds =
        this.transitionLocalCandidates(travel.missionId, decisionContext);
      const pendingDecision = {
        ...intent,
        eligibleLocalMissionIds
      };
      this.memory.setFact?.(key, pendingDecision);

      const deferMissionId = this.chooseTransitionDeferralMission(
        travel.missionId,
        eligibleLocalMissionIds,
        decisionContext
      );

      const resolved = {
        ...pendingDecision,
        deferMissionId,
        decisionResolved: true,
        updatedAt: Date.now()
      };
      this.memory.setFact?.(key, resolved);
      this.memory.save?.();
      return resolved;
    }

    ensureMissionReturnIntent(context = this.bridge.context()) {
      const travel = this.primaryEventDrivenTravel();
      if (!this.travelMissionDefinition(travel)?.navigation?.autonomousKnownReturn) return null;
      return this.ensureMissionTransitionIntent(context);
    }

    hasPendingMissionReturn(missionId = this.primaryMissionId) {
      if (!missionId) return false;
      return this.memory.getFact?.(
        this.missionReturnIntentKey(missionId),
        null
      )?.active === true;
    }

    causalArrivalWork(context = this.bridge.context()) {
      const currentMapId = String(this.engine?.currentMapId || context?.mapId || "");
      if (!currentMapId) return null;

      const missionIds = [
        this.primaryMissionId,
        ...this.activeMissionIds.filter((id) => id !== this.primaryMissionId)
      ];
      for (const missionId of missionIds) {
        if (!missionId) continue;
        if (this.missionHasHistoricalCollectionObjective(missionId)) continue;
        const key = this.missionReturnIntentKey(missionId);
        let intent = this.memory.getFact?.(key, null);
        const lifecycle = this.ensureLifecycle(missionId);
        const tree = this.trees.get(missionId);
        const excursion = intent?.kind === "unknown-travel"
          ? this.memory.getFact?.(`tutorialExcursion:${missionId}`, null)
          : null;
        const generatedArrivalReady = Boolean(
          intent?.active === true &&
          intent.kind === "unknown-travel" &&
          lifecycle.status === "active" &&
          tree &&
          !tree.root.isComplete &&
          String(excursion?.generatedTargetMapId || "") === currentMapId &&
          (!intent.frontierMapId ||
            String(excursion?.fromMapId || "") === String(intent.frontierMapId)) &&
          (!intent.direction ||
            String(excursion?.direction || "") === String(intent.direction))
        );

        // Un voyage inconnu ne connaît sa destination concrète qu'après la
        // génération. Le wrapper Bible conserve déjà cette preuve dans
        // tutorialExcursion ; raccorder cette destination à l'intention
        // causale existante, sans créer un second propriétaire de navigation.
        if (generatedArrivalReady && intent.arrivalWorkPending !== true) {
          intent = {
            ...intent,
            arrivalWorkMissionId: missionId,
            arrivalWorkMapId: currentMapId,
            arrivalWorkPending: true,
            arrivalWorkResolvedAt: Date.now(),
            updatedAt: Date.now()
          };
          this.memory.setFact?.(key, intent);
          this.memory.save?.();
        }

        if (
          intent?.arrivalWorkPending !== true ||
          String(intent.arrivalWorkMissionId || "") !== String(missionId) ||
          String(intent.arrivalWorkMapId || "") !== currentMapId
        ) continue;
        const action = lifecycle.status === "active" && tree && !tree.root.isComplete
          ? this.missionRunnableAction(
              missionId,
              tree,
              context,
              performance.now(),
              { reportUnresolved: false }
            )
          : null;
        if (action) return { missionId, action, intent };
        if (this.localProximityWork(missionId)) {
          return { missionId, action: null, intent, awaitingTarget: true };
        }

        // La map générée peut être chargée avant que sa cible physique soit
        // immédiatement runnable. La preuve canonique du travel synthétique est
        // l'excursion confirmée vers cette map, pas un nœud absent du MissionTree.
        if (generatedArrivalReady) {
          return { missionId, action: null, intent, awaitingTarget: true };
        }

        // Pour la primaire, un voyage required-map est causal : l'absence
        // momentanée de cible physique à l'arrivée ne signifie pas que le
        // travail local est terminé. Tant que le même noeud reste incomplet et
        // contraint à cette map, conserver l'autorité géographique sans créer
        // de polling ni de nouvelle politique de recovery.
        if (
          missionId === this.primaryMissionId &&
          intent.transitionSource === "required-map" &&
          lifecycle.status === "active" &&
          tree &&
          !tree.root.isComplete
        ) {
          const causalNode = tree.find?.(String(intent.nodeId || "")) || null;
          const requiredMapState = causalNode && !causalNode.isComplete
            ? this.planner.requiredMapState?.(causalNode, context) || null
            : null;
          if (
            causalNode &&
            !causalNode.isComplete &&
            requiredMapState?.constrained === true &&
            String(requiredMapState.targetMapId || "") === currentMapId
          ) {
            return { missionId, action: null, intent, awaitingTarget: true };
          }
        }

        this.memory.setFact?.(key, {
          ...intent,
          arrivalWorkPending: false,
          arrivalWorkCompletedAt: Date.now(),
          updatedAt: Date.now()
        });
        this.memory.save?.();
      }
      return null;
    }

    shouldDeferMissionTransition(
      missionId,
      context = this.bridge.context()
    ) {
      const intent = this.memory.getFact?.(
        this.missionReturnIntentKey(missionId),
        null
      );
      const deferMissionId = String(intent?.deferMissionId || "");
      if (!intent?.active || !deferMissionId) return false;

      const tree = this.trees.get(deferMissionId);
      const stillRunnable = Boolean(
        this.isMissionTransitionDeferralEligible(deferMissionId, context) &&
        this.ensureLifecycle(deferMissionId).status === "active" &&
        tree &&
        !tree.root.isComplete &&
        this.missionRunnableAction(
          deferMissionId,
          tree,
          context,
          performance.now(),
          { reportUnresolved: false }
        )
      );
      if (!stillRunnable) {
        const cleared = {
          ...intent,
          deferMissionId: null,
          updatedAt: Date.now()
        };
        this.memory.setFact?.(
          this.missionReturnIntentKey(missionId),
          cleared
        );
        this.memory.save?.();
        return false;
      }
      return true;
    }

    resumeMissionTransitionIntent(context = this.bridge.context(), travelOverride = null) {
      const travel = travelOverride || this.primaryMissionTransition(context);
      if (!travel) return false;
      const causalArrival = this.causalArrivalWork(context);
      if (causalArrival && causalArrival.missionId !== travel.missionId) {
        return false;
      }
      if (
        this.isAutonomousUnknownTravel(travel) &&
        !this.missionTransitionExecutable(travel)
      ) return false;

      const intent = this.ensureMissionTransitionIntent(context, travel);
      if (!intent?.active) return false;
      if (String(BF.getAutonomyMode?.() || "").toLowerCase() !== "full") {
        return false;
      }
      if (
        this.engine?.transitioning ||
        this.engine?.pendingGate ||
        this.engine?.pendingInteraction ||
        this.engine?.persistentNavigationIntent ||
        this.engine?.currentRoutine ||
        this.currentAction ||
        this.bridge.isEngineBusy()
      ) return false;
      if (this.shouldDeferMissionTransition(travel.missionId, context)) {
        return false;
      }

      const currentMapId = String(this.engine?.currentMapId || "");
      if (!currentMapId) return false;

      if (intent.kind === "unknown-travel") {
        const direction = String(intent.direction || "");
        const frontierMapId = String(intent.frontierMapId || currentMapId);
        if (
          !direction ||
          !frontierMapId ||
          typeof this.engine?.handleNavigationSuggestion !== "function"
        ) return false;

        if (frontierMapId !== currentMapId) {
          const route = (this.engine?.findOptimalRoute?.(currentMapId, frontierMapId) ||
            this.engine?.findKnownRoute?.(currentMapId, frontierMapId));
          if (!Array.isArray(route) || route.length < 2) return false;
          this.engine.handleNavigationSuggestion({
            mapId: frontierMapId,
            source: "mission",
            missionId: travel.missionId,
            allowTeleportOptimization: true
          });
          return true;
        }

        this.engine.handleNavigationSuggestion({
          discoverUnknown: true,
          direction,
          source: "mission",
          missionId: travel.missionId
        });
        return true;
      }

      const targetMapId = String(intent.targetMapId || intent.mapId || "");
      if (!targetMapId) return false;

      const undiscoveredAdjacent = this.missionUndiscoveredAdjacentTarget(targetMapId);
      if (undiscoveredAdjacent) {
        if (typeof this.engine?.handleNavigationSuggestion !== "function") return false;
        // L'intention conserve la destination causale ; seul le trajet immédiat
        // vise sa frontière connue, avant de franchir la sortie déjà générée.
        this.engine.handleNavigationSuggestion(undiscoveredAdjacent.frontierMapId === currentMapId
          ? {
            discoverUnknown: true,
            direction: undiscoveredAdjacent.direction,
            source: "mission",
            missionId: travel.missionId
          }
          : {
            mapId: undiscoveredAdjacent.frontierMapId,
            source: "mission",
            missionId: travel.missionId,
            allowTeleportOptimization: false
          });
        return true;
      }

      if (currentMapId === targetMapId) {
        if (
          intent.kind === "return-base" &&
          typeof this.engine?.returnToBase === "function"
        ) {
          this.engine.returnToBase();
          return true;
        }
        return false;
      }

      const route = (this.engine?.findOptimalRoute?.(currentMapId, targetMapId) ||
        this.engine?.findKnownRoute?.(currentMapId, targetMapId));
      if (!Array.isArray(route) || route.length < 2) return false;

      if (
        intent.kind === "return-base" &&
        route.length === 2 &&
        typeof this.engine?.returnToBase === "function"
      ) {
        this.engine.returnToBase();
        return true;
      }

      if (typeof this.engine?.handleNavigationSuggestion !== "function") return false;
      this.engine.handleNavigationSuggestion({
        mapId: targetMapId,
        source: "mission",
        missionId: travel.missionId,
        allowTeleportOptimization: true
      });
      return true;
    }

    resumeMissionReturnIntent(context = this.bridge.context()) {
      const travel = this.primaryEventDrivenTravel();
      if (!this.travelMissionDefinition(travel)?.navigation?.autonomousKnownReturn) return false;
      return this.resumeMissionTransitionIntent(context);
    }

    isMissionExclusiveToCurrentMap(missionId) {
      const definition = this.definition(missionId) || {};
      if (definition.instanceScope !== "map") return false;
      const currentMapId = String(this.engine?.currentMapId || "");
      if (!currentMapId) return false;
      const separator = String(missionId || "").indexOf("@");
      const scopedMapId = separator >= 0
        ? String(missionId).slice(separator + 1)
        : String(definition.scopeId || definition.targetMapId || "");
      return scopedMapId === currentMapId;
    }

    isMissionVisibleOnCurrentMap(missionId, definition = this.definition(missionId) || {}) {
      if (definition.localVisibility !== "current-map") return true;
      const currentMapId = String(this.engine?.currentMapId || "");
      if (!currentMapId) return false;
      const separator = String(missionId || "").indexOf("@");
      const scopedMapId = separator >= 0
        ? String(missionId).slice(separator + 1)
        : String(definition.scopeId || definition.targetMapId || "");
      return Boolean(scopedMapId) && scopedMapId === currentMapId;
    }

    shouldDeferMissionReturn(
      missionId,
      context = this.bridge.context()
    ) {
      const definition = this.definition(missionId) || {};
      const policy = definition.returnPolicy || {};
      if (
        policy.mode !== "bac-discretion" ||
        policy.deferForCurrentMapExclusiveMissions !== true
      ) return false;
      return this.shouldDeferMissionTransition(missionId, context);
    }

    travelAllowsSecondaryMission(missionId, context) {
      const causalArrival = this.causalArrivalWork(context);
      if (causalArrival?.missionId === missionId) return true;
      // Cette fonction n'est appelée que pour une secondaire qui possède déjà
      // une action locale runnable. Pendant l'attente causale de la primaire,
      // cette action locale reste donc autorisée ; les travels secondaires sont
      // filtrés séparément dans prioritizedMissionWork().
      if (causalArrival?.missionId === this.primaryMissionId) return true;
      const travel = this.primaryMissionTransition(context);
      if (!travel || missionId === travel.missionId) return true;

      const intent = this.memory.getFact?.(
        this.missionReturnIntentKey(travel.missionId),
        null
      );
      if (!intent?.active) {
        const policy = this.travelMissionDefinition(travel)?.returnPolicy || {};
        if (policy.mode !== "bac-discretion") return true;
        return this.isMissionTransitionDeferralEligible(missionId, context);
      }

      const eligible = Array.isArray(intent.eligibleLocalMissionIds)
        ? intent.eligibleLocalMissionIds
        : [];
      if (
        intent.decisionResolved !== true &&
        eligible.includes(missionId)
      ) {
        return this.isMissionTransitionDeferralEligible(missionId, context);
      }
      return (
        intent.deferMissionId === missionId &&
        eligible.includes(missionId) &&
        this.isMissionTransitionDeferralEligible(missionId, context)
      );
    }

    delegatedRuntimeAction(missionId) {
      const definition = this.definition(missionId) || {};
      const tree = this.trees.get(missionId);
      if (!tree || tree.root.isComplete) return null;

      // A runtime counter is not sufficient by itself: the mission must
      // explicitly authorize an autonomous owner for the delegated action.
      if (definition.allowsAutonomousRationCraft !== true) return null;

      const counters = Array.isArray(definition.runtimeCounters)
        ? definition.runtimeCounters
        : [];
      for (const counter of counters) {
        if (
          !counter?.slot ||
          String(counter.source || "") !== "rations.craftedTotal"
        ) continue;
        const node = tree.find?.(`${missionId}:${counter.slot}`);
        if (!node || node.isComplete || !node.prerequisitesMet(tree.root)) continue;
        const sequenceEntry = Array.isArray(definition.sequence)
          ? definition.sequence.find((entry) => entry?.slot === counter.slot)
          : null;
        const type = Missions.normalizeActionType(
          sequenceEntry?.action || node.type
        );
        if (
          sequenceEntry?.params?.eventDriven !== true ||
          type !== Missions.ActionType.CRAFT
        ) continue;
        return {
          type,
          slot: counter.slot,
          source: counter.source || null
        };
      }
      return null;
    }

    missionHasHistoricalCollectionObjective(missionId) {
      const tree = this.trees.get(missionId);
      if (!tree?.root) return false;
      let historical = false;
      tree.root.walk?.((node) => {
        if (node?.params?.historicalCollection === true) historical = true;
      });
      return historical;
    }

    isHistoricalCollectionPriorityMission(missionId) {
      return this.missionHasHistoricalCollectionObjective(missionId);
    }

    missionIsBackgroundProgressOnly(missionId, definition = this.definition(missionId)) {
      const leaves = [];
      const visit = (node) => {
        if (!node || typeof node !== "object") return;
        const children = Array.isArray(node.children) ? node.children : [];
        if (children.length) {
          children.forEach(visit);
          return;
        }
        if (node.type === "group") return;
        leaves.push(node);
      };
      visit(definition?.root);
      return (
        leaves.length > 0 &&
        leaves.every((node) => node.params?.backgroundProgressOnly === true)
      );
    }

    missionAllowsAutomaticExecution(missionId) {
      if (!this.missionIsBackgroundProgressOnly(missionId)) return true;
      return Boolean(
        missionId === this.primaryMissionId &&
        this.isPlayerSelectedPrimary()
      );
    }

    missionPriorityQueueEligible(missionId, context = this.bridge.context()) {
      if (!missionId || !this.trees.has(missionId)) return false;
      if (this.ensureLifecycle(missionId).status !== "active") return false;
      if (!this.missionAllowsAutomaticExecution(missionId)) return false;
      if (missionId === this.primaryMissionId) return true;
      if (this.missionHasHistoricalCollectionObjective(missionId)) return false;
      if (this.isMissionVisibleOnCurrentMap(missionId)) return true;

      const travel = this.missionTransitionFor(missionId, context);
      return Boolean(
        travel &&
        this.missionTransitionExecutable(travel)
      );
    }

    assessMissionPriority(missionId, context = this.bridge.context()) {
      const assessment = this.assessMission(missionId, context);
      if (!assessment) return null;
      if (assessment.action || assessment.delegatedRuntimeAction) return assessment;

      const travel = this.missionTransitionFor(missionId, context);
      if (
        !travel ||
        this.isAutonomousUnknownTravel(travel) ||
        !this.missionTransitionExecutable(travel)
      ) return assessment;

      const reasons = Array.isArray(assessment.reasons)
        ? assessment.reasons
        : [];
      let score = Number(assessment.score || 0);
      if (reasons.includes("hors map cible")) score += 100000;
      if (reasons.includes("aucune action réalisable")) score += 120;
      return {
        ...assessment,
        score,
        transition: travel,
        reasons: [
          ...reasons.filter((reason) =>
            reason !== "hors map cible" && reason !== "aucune action réalisable"
          ),
          "transition distante atteignable"
        ]
      };
    }

    prioritizedMissionTransition(context = this.bridge.context(), options = {}) {
      const excludedMissionIds = options.excludedMissionIds instanceof Set
        ? options.excludedMissionIds
        : new Set(options.excludedMissionIds || []);
      const stored = typeof this.getPrioritizedMissionIds === "function"
        ? this.getPrioritizedMissionIds()
        : Array.isArray(this.prioritizedMissionIds)
          ? this.prioritizedMissionIds
          : [];
      const candidates = [...new Set(stored)]
        .filter(Boolean)
        .filter((id) => id !== this.primaryMissionId)
        .filter((id) => !excludedMissionIds.has(id))
        .filter((id) => this.missionPriorityQueueEligible(id, context))
        .map((id) => ({
          missionId: id,
          assessment: this.assessMissionPriority(id, context),
          travel: this.missionTransitionFor(id, context)
        }))
        .filter(({ travel }) =>
          travel &&
          this.missionTransitionExecutable(travel)
        )
        .sort((left, right) =>
          Number(right.assessment?.score || 0) - Number(left.assessment?.score || 0)
        );
      return candidates[0]?.travel || null;
    }

    historicalCollectionTransitionOpportunity(missionId, context) {
      const tree = this.trees.get(missionId);
      if (!tree || tree.root.isComplete) return false;
      const action = this.missionRunnableAction(missionId, tree, context);
      if (
        !action ||
        ![Missions.ActionType.COLLECT, Missions.ActionType.EXTRACT].includes(action.type)
      ) return false;
      const node = tree.find?.(action.nodeId);
      if (node?.params?.historicalCollection !== true) return false;

      const progression = BF.progression;
      if (
        typeof progression?.historicalCollectionMetadata !== "function" ||
        typeof progression?.historicalCollectionMatches !== "function"
      ) return false;

      return (this.engine?.currentMap?.interactables || []).some((object) => {
        if (object?.userData?.active !== true) return false;
        const definition =
          object.userData.functional ||
          progression.historicalCollectionDefinition?.(
            object.userData.libraryType || object.userData.kind
          );
        if (!definition) return false;
        const metadata = progression.historicalCollectionMetadata(definition);
        return progression.historicalCollectionMatches(node.params || {}, metadata);
      });
    }

    contextualLocalTransitionOpportunity(
      missionId,
      context = this.bridge.context()
    ) {
      const definition = this.definition(missionId) || {};
      const tree = this.trees.get(missionId);
      if (!tree || tree.root.isComplete) return false;

      const currentMapId = String(
        this.engine?.currentMapId || context?.mapId || ""
      );
      if (!currentMapId) return false;

      const availableLeaves = tree.availableLeaves()
        .filter((node) => !node.isComplete);
      if (availableLeaves.some((node) => {
        const state = this.planner.requiredMapState?.(node, context) || null;
        return (
          state?.constrained === true &&
          String(state.targetMapId || "") === currentMapId
        );
      })) return true;

      // CONTEXT_MSC porte une opportunité réellement liée à la scène
      // matérialisée sur la map courante. Elle peut être perdue en quittant la
      // map et reste donc éligible au deferral historique du travel.
      if ((definition.bible?.pattern || definition.pattern) === "CONTEXT_MSC") {
        const requiredIds = (Array.isArray(definition.mapGeneration?.requiredMicroScenes)
          ? definition.mapGeneration.requiredMicroScenes
          : [])
          .map((entry) => String(entry?.id || ""))
          .filter(Boolean);
        const materializedIds = new Set(
          (Array.isArray(this.engine?.currentMap?.group?.userData?.microScenes)
            ? this.engine.currentMap.group.userData.microScenes
            : [])
            .map((entry) => String(entry?.id || ""))
            .filter(Boolean)
        );
        if (
          requiredIds.length > 0 &&
          requiredIds.some((id) => materializedIds.has(id))
        ) return true;
      }

      return false;
    }

    isMissionTransitionOpportunity(missionId, context = this.bridge.context()) {
      return (
        this.isMissionExclusiveToCurrentMap(missionId) ||
        this.contextualLocalTransitionOpportunity(missionId, context) ||
        this.historicalCollectionTransitionOpportunity(missionId, context)
      );
    }

    assessMission(missionId, context) {
      const tree = this.trees.get(missionId);
      const definition = this.definition(missionId);
      const lifecycle = this.ensureLifecycle(missionId, "active");
      const visibleOnCurrentMap = this.isMissionVisibleOnCurrentMap(missionId);
      let action = tree?.root.isComplete || !visibleOnCurrentMap
        ? null
        : this.missionRunnableAction(missionId, tree, context);
      if (action && missionId !== this.primaryMissionId && !this.travelAllowsSecondaryMission(missionId, context)) {
        action = null;
      }
      const delegatedRuntimeAction = visibleOnCurrentMap && !action
        ? this.delegatedRuntimeAction(missionId)
        : null;
      const progress = tree ? this.treeProgress(tree) : 0;
      let score = Number(definition?.priority) || 0;
      const reasons = [];
      if (!visibleOnCurrentMap) {
        score -= 100000;
        reasons.push("hors map cible");
      }
      if (definition?.passivePriorityAxis) {
        const playerPriority = this.playerPriority(definition.passivePriorityAxis);
        const influence = Math.max(0, playerPriority - 50) * 1.6;
        score += influence;
        if (influence > 0) reasons.push(`curseur ${definition.passivePriorityAxis} à ${Math.round(playerPriority)} %`);
      }
      if (lifecycle.narrativePriority > 0) {
        score += lifecycle.narrativePriority * 2;
        reasons.push("priorité narrative");
      }
      if (lifecycle.urgency > 0) {
        score += lifecycle.urgency * 2;
        reasons.push("urgence");
      }
      if (progress > 0) {
        score += progress * 35;
        reasons.push("progression engagée");
      }
      if (action) {
        score += 45;
        reasons.push("action réalisable");
        if (
          (context.needs?.rest && action.type === Missions.ActionType.REST) ||
          (context.needs?.food && action.type === Missions.ActionType.EAT)
        ) {
          score += 120;
          reasons.push("besoin vital prioritaire");
        }
        const energy = Number(context.energy);
        const costlyTypes = new Set([
          Missions.ActionType.COLLECT,
          Missions.ActionType.EXTRACT,
          Missions.ActionType.BUILD,
          Missions.ActionType.TRAVEL
        ]);
        if (Number.isFinite(energy) && energy < 35 && costlyTypes.has(action.type)) {
          score -= energy < 25 ? 95 : 35;
          reasons.push("coût énergétique défavorable");
        }
      } else if (delegatedRuntimeAction) {
        score += 45;
        reasons.push("action runtime déléguée");
      } else {
        score -= 120;
        reasons.push("aucune action réalisable");
      }
      if (missionId === this.primaryMissionId) score += 12;
      return {
        missionId,
        score,
        action,
        delegatedRuntimeAction,
        progress,
        reasons
      };
    }

    isPlayerSelectedPrimary() {
      if (!this.primaryMissionId || !this.tree || this.tree.root?.isComplete) return false;
      const lifecycle = this.memory.state.missionLifecycle?.[this.primaryMissionId];
      if (lifecycle?.status !== "active") return false;
      const reason = String(lifecycle.selectionReason || this.selectionReason || "");
      return reason === "Priorité suggérée par le joueur.";
    }

    selectBestPrimary(now = performance.now(), force = false) {
      const replacingActivePrimary = this.hasActivePrimaryMission();
      if (
        this.currentAction ||
        (replacingActivePrimary && this.bridge.isEngineBusy())
      ) return false;
      if (this.isPlayerSelectedPrimary()) {
        this.selectionReason = "Priorité suggérée par le joueur.";
        return false;
      }
      // Un arbre fini reste une intention active tant que sa validation locale
      // réelle (approche ou dépôt) peut encore être exécutée.
      if (!force && this.localCompletionGateFor(this.primaryMissionId, now)) return false;
      const backgroundOnlyPrimary = Boolean(
        replacingActivePrimary &&
        this.missionIsBackgroundProgressOnly(this.primaryMissionId)
      );
      if (
        this.hasPendingMissionReturn(this.primaryMissionId) &&
        !backgroundOnlyPrimary
      ) {
        this.selectionReason =
          "Intention de transition missionnelle persistante ; l’arbitrage local reste borné à la map courante.";
        return false;
      }
      if (!force && replacingActivePrimary && !backgroundOnlyPrimary) {
        // La runnabilité locale décide quelle mission peut agir maintenant,
        // pas quelle intention globale occupe le Top 1. R-STAB autorise déjà
        // une secondaire à relayer une primaire momentanément stérile sans la
        // déclasser. Le Top 1 ne sort donc que par une transition de lifecycle
        // forcée (completion, pause, échec) ou par un choix explicite.
        return false;
      }
      const context = this.bridge.context();
      const candidates = this.activeMissionIds
        .filter((id) => {
          const lifecycle = this.ensureLifecycle(id);
          return lifecycle.status === "active" &&
            lifecycle.autoPrimaryEligible !== false;
        })
        .filter((id) => this.missionPriorityQueueEligible(id, context))
        .map((id) => this.assessMissionPriority(id, context))
        .filter(Boolean)
        .sort((left, right) => right.score - left.score);
      const best = candidates[0];
      if (!best) return false;
      const current = candidates.find((candidate) =>
        candidate.missionId === this.primaryMissionId
      );
      if (!force && current && best.score < current.score + 20) return false;
      if (best.missionId === this.primaryMissionId) {
        this.selectionReason = best.reasons.join(", ") || "mission principale conservée";
        return false;
      }
      this.lastPriorityReviewAt = now;
      return this.setPrimaryMission(
        best.missionId,
        false,
        `Priorité automatique : ${best.reasons.join(", ")}.`
      );
    }


    hasActivePrimaryMission() {
      if (!this.primaryMissionId || !this.tree) return false;
      const lifecycle = this.memory.state.missionLifecycle?.[this.primaryMissionId];
      return lifecycle?.status === "active" && !this.tree.root.isComplete;
    }

    hasPrimaryMissionAuthority() {
      if (
        this.primaryMissionId &&
        !this.missionAllowsAutomaticExecution(this.primaryMissionId)
      ) return false;
      const context = this.bridge.context();
      if (this.localOpportunityWork(context) || this.localProximityWork(this.primaryMissionId)) return true;
      if (this.memory.getFact?.("missionInventoryReturn:v1", null)?.active === true &&
          String(BF.getAutonomyMode?.() || "").toLowerCase() === "full") return true;
      if (this.localCompletionGateFor(this.primaryMissionId)) return true;
      if (this.causalArrivalWork(context)?.missionId === this.primaryMissionId) {
        return true;
      }
      const transition = this.primaryMissionTransition(context);
      if (transition && this.knownDestinationCriteria(transition)) {
        const intent = this.ensureMissionTransitionIntent(context);
        if (intent?.active === true && this.missionTransitionExecutable(transition)) return true;
        if (intent?.satisfiedLocally === true) return this.hasRunnablePrimaryMission();
      } else if (transition && this.missionTransitionExecutable(transition)) {
        return true;
      }
      if (!this.hasActivePrimaryMission()) return false;
      if (this.delegatedRuntimeAction(this.primaryMissionId)) return true;
      return this.hasRunnablePrimaryMission();
    }

    localCompletionGateFor(missionId, now = performance.now()) {
      if (!missionId || !this.missionAllowsAutomaticExecution(missionId) ||
          this.ensureLifecycle(missionId).status !== "active" ||
          this.definition(missionId)?.completionGate?.autonomousTravel === false ||
          this.isExecutionNodeSuppressed(missionId, `${missionId}:completion-gate-local`, this.bridge.context(), now)) return null;
      if (!this.trees.get(missionId)?.root?.isComplete) {
        const step = this.stepShelterRequirementFor(missionId);
        return step?.shelterTarget?.mapId === this.engine.currentMapId ? step : null;
      }
      const runtime = BF.bibleRuntime;
      const construction = runtime?.byId?.get?.(missionId);
      if (runtime?.constructionPlacementEffect?.(construction) &&
          construction?.activationSource !== "autonomy") return null;
      const gate = runtime?.completionGateState?.(missionId);
      return gate?.managed && gate.shelterTarget?.mapId === this.engine.currentMapId
        ? gate : null;
    }

    stepShelterRequirementFor(missionId, context = this.bridge.context()) {
      const mission = this.definition(missionId);
      const tree = this.trees.get(missionId);
      if (!mission || !tree || tree.root.isComplete ||
          this.ensureLifecycle(missionId).status !== "active" ||
          !this.missionAllowsAutomaticExecution(missionId) ||
          mission.completionGate?.autonomousTravel === false) return null;
      const nodes = tree.availableLeaves().filter(node =>
        node.params?.requiresShelter === true && node.params?.eventDriven !== true &&
        node.params?.catalogManaged !== true && !this.isExecutionNodeSuppressed(missionId, node.id, context));
      if (!nodes.length || BF.canAccessCampInventory?.() === true) return null;
      for (const node of nodes) {
        const mapState = this.planner.requiredMapState(node, context);
        if (mapState?.constrained && !mapState.targetMapId) continue;
        const shelterTarget = BF.bibleRuntime?.completionShelterTarget?.({}, {
          type: "proximity.shelter", scope: "any-established",
          ...(mapState?.targetMapId ? { mapId: mapState.targetMapId } : {}),
          ...(node.params.siteId ? { siteId: node.params.siteId } : {}),
          useSiteInteractionRadius: true, inventoryAccess: true
        });
        if (shelterTarget) return {
          managed: true, canFinalize: false, prerequisiteOnly: true,
          requiredNodeId: node.id, targetMapId: shelterTarget.mapId, shelterTarget
        };
      }
      return null;
    }

    primaryActionAssessment() {
      if (!this.hasActivePrimaryMission()) return null;
      return this.assessMission(this.primaryMissionId, this.bridge.context());
    }

    hasRunnablePrimaryMission() {
      return Boolean(this.primaryActionAssessment()?.action);
    }

    applyPendingTransitions() {
      if (this.currentAction || this.bridge.isEngineBusy()) return false;
      let changed = false;
      if (this.pendingPauseMissionId) {
        const missionId = this.pendingPauseMissionId;
        this.pendingPauseMissionId = null;
        changed = this.pauseMission(missionId, "Interruption demandée") || changed;
      }
      if (this.pendingPrimaryMissionId) {
        const missionId = this.pendingPrimaryMissionId;
        const reason = this.pendingPrimaryMissionReason || "Priorité choisie explicitement.";
        this.pendingPrimaryMissionId = null;
        this.pendingPrimaryMissionReason = null;
        changed = this.setPrimaryMission(missionId, false, reason) || changed;
      }
      return changed;
    }

    pendingExperimentalRequests() {
      return Object.values(this.memory.state.pendingActivations || {})
        .map((request) => {
          const missionPrerequisitesReady = (request.prerequisites || []).every((id) =>
            this.memory.state.missionLifecycle?.[id]?.status === "completed"
          );
          if (!missionPrerequisitesReady) return null;
          const missingKnowledge = (request.experimentalPrerequisites || []).filter((id) =>
            BF.bibleRuntime?.isResearchRewardUnlocked?.(id) !== true
          );
          if (!missingKnowledge.length) return null;
          const definition = this.definition(request.missionId) || {};
          const knowledge = missingKnowledge.map((id) => ({
            id,
            experiment: BF.Research?.experimentationForKnowledge?.(id) || null
          }));
          const nextExperiment = knowledge
            .map((entry) => entry.experiment)
            .filter(Boolean)
            .sort((a, b) => Number(a.stage?.stage || 99) - Number(b.stage?.stage || 99))[0] || null;
          const stageNumber = Number(nextExperiment?.stage?.stage) || 0;
          const target = stageNumber >= 4 ? "workbench" : "camp";
          return {
            missionId: request.missionId,
            missionTitle: definition.title || request.missionId,
            missingKnowledge,
            knowledge,
            target,
            axis: "research",
            baseWeight: Math.max(8, Number(definition.priority) || 0),
            requestedAt: Number(request.requestedAt) || 0
          };
        })
        .filter(Boolean);
    }

    pendingExperimentationIntent() {
      const candidates = this.pendingExperimentalRequests();
      if (!candidates.length) return null;
      const options = candidates.map((candidate) => ({
        id: `pending-experiment:${candidate.missionId}`,
        axis: "research",
        baseWeight: candidate.baseWeight,
        candidate
      }));
      const selected = BF.BAC?.weightedPick?.(options)?.candidate ||
        candidates.sort((left, right) =>
          right.baseWeight - left.baseWeight || left.requestedAt - right.requestedAt
        )[0];
      if (!selected) return null;
      const knowledgeId = selected.missingKnowledge[0] || null;
      const experiment = knowledgeId
        ? BF.Research?.experimentationForKnowledge?.(knowledgeId) || null
        : null;
      return {
        missionId: selected.missionId,
        missionTitle: selected.missionTitle,
        axis: "research",
        baseWeight: selected.baseWeight,
        target: selected.target,
        knowledgeId,
        knowledgeLabel: experiment?.knowledge?.label || knowledgeId,
        experimentThemeId: experiment?.theme?.id || null,
        experimentThemeLabel: experiment?.theme?.label || null,
        requiredStage: Number(experiment?.stage?.stage) || null,
        reason: selected.target === "workbench"
          ? `Une expérimentation avancée à l’établi est nécessaire avant « ${selected.missionTitle} ».`
          : `Une expérimentation au Camp est nécessaire avant « ${selected.missionTitle} ».`
      };
    }

    pendingExperimentCatalogEntries() {
      return this.pendingExperimentalRequests().map((request) => {
        const lifecycle = this.ensureLifecycle(request.missionId, "hidden");
        const knowledgeId = request.missingKnowledge[0] || null;
        const experiment = knowledgeId
          ? BF.Research?.experimentationForKnowledge?.(knowledgeId) || null
          : null;
        const stage = Number(experiment?.stage?.stage) || null;
        const location = stage >= 4 ? "l’établi" : "le Camp";
        const knowledgeLabel = experiment?.knowledge?.label || knowledgeId || "connaissance expérimentale";
        return {
          missionId: request.missionId,
          title: request.missionTitle,
          status: "available",
          scope: this.definition(request.missionId)?.scope || "global",
          progress: 0,
          pendingExperimental: true,
          theme: "research",
          passivePriorityAxis: "research",
          activatedAt: Number(lifecycle.activatedAt) || 0,
          waitingFor: [...(lifecycle.waitingFor || [])],
          journalIntro: `Prérequis expérimental : obtenir « ${knowledgeLabel} » depuis Recherche, près de ${location}.`,
          unlockHint: `Lancer les expérimentations ${experiment?.theme?.label || "scientifiques"} jusqu’au niveau ${stage || "requis"}.`
        };
      });
    }

    reevaluatePendingActivations() {
      this.wakeIdleRetry();
      const ready = Object.values(this.memory.state.pendingActivations || {})
        .filter((request) =>
          (request.prerequisites || []).every((id) =>
            this.memory.state.missionLifecycle?.[id]?.status === "completed"
          ) &&
          (request.experimentalPrerequisites || []).every((id) =>
            BF.bibleRuntime?.isResearchRewardUnlocked?.(id) === true
          ) &&
          BF.bibleRuntime?.pendingActivationMapContractSatisfied?.(request.missionId) !== false
        )
        .sort((left, right) => {
          const leftOptions = left.options || {};
          const rightOptions = right.options || {};
          const leftDefinition = this.definition(left.missionId) || {};
          const rightDefinition = this.definition(right.missionId) || {};
          const score = (request, options, definition) =>
            (Number(options.narrativePriority) || 0) * 10000 +
            (Number(options.urgency) || 0) * 1000 +
            (Number(definition.priority) || 0) * 10 -
            (Number(request.requestedAt) || 0) / 1e13;
          return score(right, rightOptions, rightDefinition) -
            score(left, leftOptions, leftDefinition);
        });
      const request = ready[0];
      if (!request) return false;
      return this.activateMission(request.missionId, request.options || {});
    }

    notifyMissionEvent(type, detail = {}) {
      const missionId = detail.missionId;
      if (!missionId || !this.definition(missionId)) return false;
      return this.startMission(missionId, {
        primary: detail.primary === true,
        prerequisites: detail.prerequisites || [],
        urgency: detail.urgency,
        narrativePriority: detail.narrativePriority,
        source: detail.source || type || "event",
        reason: detail.reason
      });
    }

    matchesPassiveAction(node, type, detail) {
      if (node.params?.catalogManaged) return false;
      const nodeType = Missions.normalizeActionType(node.type);
      const acquisition = [Missions.ActionType.COLLECT, Missions.ActionType.EXTRACT];
      if (nodeType !== type && !(acquisition.includes(nodeType) && acquisition.includes(type))) {
        return false;
      }
      if (node.params.kind && detail.kind !== node.params.kind) return false;
      if (node.params.subject && detail.subject && detail.subject !== node.params.subject) {
        return false;
      }
      return true;
    }

    progressPassiveMissions(type, detail = {}, excluded = {}) {
      let changed = 0;
      this.trees.forEach((tree, missionId) => {
        if (this.ensureLifecycle(missionId).status !== "active") return;
        let treeChanged = false;
        tree.availableLeaves().forEach((node) => {
          if (missionId === excluded.missionId && node.id === excluded.nodeId) return;
          if (!this.matchesPassiveAction(node, type, detail)) return;
          if (node.increment(Math.max(1, Number(detail.amount) || 1))) {
            changed += 1;
            treeChanged = true;
          }
        });
        tree.refresh();
        if (treeChanged) this.memory.saveTree(tree);
      });
      return changed;
    }

    missionActionAxis(missionId, action) {
      const definition = this.definition(missionId) || {};
      if (definition.passivePriorityAxis) return definition.passivePriorityAxis;
      if (definition.priorityAxis) return definition.priorityAxis;
      const type = action?.type;
      if ([Missions.ActionType.COLLECT, Missions.ActionType.EXTRACT].includes(type)) return "collection";
      if ([
        Missions.ActionType.INSPECT,
        Missions.ActionType.ANALYZE,
        Missions.ActionType.OBSERVE,
        Missions.ActionType.RESEARCH,
        Missions.ActionType.CRAFT,
        Missions.ActionType.BUILD
      ].includes(type)) return "research";
      if ([Missions.ActionType.EXPLORE_ZONE, Missions.ActionType.TRAVEL].includes(type)) return "exploration";
      if ([Missions.ActionType.REST, Missions.ActionType.EAT].includes(type)) return "survival";
      return "exploration";
    }

    localProximityWork(missionId, now = performance.now()) {
      if (!missionId || !this.missionAllowsAutomaticExecution(missionId) ||
          this.ensureLifecycle(missionId).status !== "active") return null;
      const work = BF.bibleRuntime?.missionProximityWork?.(missionId);
      return work && !this.isExecutionNodeSuppressed(missionId, work.nodeId, this.bridge.context(), now)
        ? work : null;
    }

    localOpportunityWork(context = this.bridge.context()) {
      if (String(BF.getAutonomyMode?.() || "").toLowerCase() !== "full" ||
          this.isMissionGuidanceEnabled?.() === false) return null;
      // Le relais physique ne remplace jamais Top1/Top4, ni leurs intentions.
      // Seul du travail réellement local est autorisé, après l'action atomique.
      for (const id of this.activeMissionIds || []) {
        if (!/^OPP-/.test(String(id)) || this.ensureLifecycle(id).status !== "active") continue;
        const tree = this.trees.get(id);
        if (!tree || tree.root.isComplete || !this.missionAllowsAutomaticExecution(id)) continue;
        const action = this.missionRunnableAction(id, tree, context, performance.now(), { reportUnresolved: false });
        if (action) return { kind: "action", missionId: id,
          selected: { missionId: id, action, primary: id === this.primaryMissionId } };
        const proximity = this.localProximityWork(id);
        if (proximity) return { kind: "proximity", missionId: id, proximity };
      }
      return null;
    }

    inventoryReturnWork(context = this.bridge.context()) {
      if (String(BF.getAutonomyMode?.() || "").toLowerCase() !== "full" ||
          this.isMissionGuidanceEnabled?.() === false) return false;
      const key = "missionInventoryReturn:v1";
      let intent = this.memory.getFact?.(key, null);
      const currentMapId = String(this.engine.currentMapId || "");
      if (!currentMapId) return false;
      const saveIntent = value => { this.memory.setFact?.(key, value); this.memory.save?.(); };
      if (intent?.active && intent.primaryMissionId !== this.primaryMissionId && this.isPlayerSelectedPrimary()) {
        saveIntent(null);
        return false;
      }
      if (!intent?.active) {
        const capacity = BF.getInventoryCapacityState?.();
        if (!capacity) return false;
        const inventory = BF.getProgressionState?.()?.inventory || {};
        const movable = Object.keys(inventory).reduce((sum, id) =>
          sum + Math.max(0, Number(BF.getUnallocatedInventoryQuantity?.(id)) || 0), 0);
        if (!movable) return false;
        let sourceMissionId = this.localOpportunityWork(context)?.missionId || this.primaryMissionId;
        let reserveFact = null;
        let exhausted = false;
        // Les réserves sont définies par leur contrat et leur dernière vraie
        // transaction. Aucun loot n'est déduit des objets de décor d'une MSC.
        for (const mission of BF.bibleRuntime?.allMissions?.() || []) {
          for (const entry of mission.proximityContexts || []) {
            if (!entry.reserve || !entry.fact) continue;
            const fact = this.memory.getFact?.(entry.fact, null);
            if (fact?.reserveVersion !== 1 || String(fact.mapId || "") !== currentMapId ||
                !(Number(fact.lastWithdrawnAt) > Number(fact.lastDepositedAt || 0))) continue;
            reserveFact = entry.fact;
            sourceMissionId = mission.id;
            exhausted = fact.exhausted === true;
            break;
          }
          if (reserveFact) break;
        }
        if (this.pendingPlayerActionReturn() && !reserveFact &&
            !/^OPP-/.test(String(sourceMissionId || ""))) return false;
        const automatic = global.localStorage?.getItem?.("bluefox_auto_deposit_v1") === "true";
        if (!reserveFact && !automatic && !/^OPP-/.test(String(sourceMissionId || ""))) return false;
        if (!exhausted && Number(capacity.count) < Number(capacity.returnThreshold)) return false;
        const shelter = BF.bibleRuntime?.completionShelterTarget?.({}, {
          type: "proximity.shelter", scope: "any-established", inventoryAccess: true,
          useSiteInteractionRadius: true
        });
        if (!shelter) return false;
        intent = { active: true, phase: "deposit", missionId: sourceMissionId,
          primaryMissionId: this.primaryMissionId, sourceMapId: currentMapId,
          shelter, reserveFact, resume: !exhausted,
          createdAt: Date.now() };
        saveIntent(intent);
      }
      const targetMapId = intent.phase === "resume" ? intent.sourceMapId : intent.shelter?.mapId;
      if (!targetMapId || !BF.maps?.[targetMapId]) { saveIntent(null); return false; }
      if (currentMapId !== targetMapId) {
        const route = this.engine.findKnownRoute?.(currentMapId, targetMapId);
        if (!Array.isArray(route) || route.length < 2 || typeof this.engine.handleNavigationSuggestion !== "function") {
          saveIntent(null);
          return false;
        }
        this.engine.handleNavigationSuggestion({ mapId: targetMapId, source: "mission",
          missionId: intent.missionId, allowTeleportOptimization: false });
        return true;
      }
      if (intent.phase === "resume") { saveIntent(null); return false; }
      const bucket = this.memory.state.siteProgression?.[targetMapId];
      if (!bucket || String(bucket.id || "") !== String(intent.shelter.siteId || "")) {
        saveIntent(null);
        return false;
      }
      if (BF.canAccessCampInventory?.() !== true) {
        if (this.engine.approachMissionPoint?.(intent.shelter)) return true;
        saveIntent(null);
        return false;
      }
      const inventory = BF.getProgressionState?.()?.inventory || {};
      const movable = Object.keys(inventory).reduce((sum, id) =>
        sum + Math.max(0, Number(BF.getUnallocatedInventoryQuantity?.(id)) || 0), 0);
      // Le rendu UI peut avoir déjà déposé le panier ; ne jamais le recréditer.
      if (movable > 0 && !(Number(BF.depositAllInventory?.()) > 0)) {
        saveIntent(null);
        return false;
      }
      if (intent.reserveFact) {
        const reserve = this.memory.getFact?.(intent.reserveFact, null);
        if (reserve) this.memory.setFact?.(intent.reserveFact,
          { ...reserve, lastDepositedAt: Number(reserve.lastWithdrawnAt) || Date.now() });
      }
      const lifecycle = this.memory.state.missionLifecycle?.[intent.missionId];
      if (!intent.resume || lifecycle?.status !== "active") { saveIntent(null); return true; }
      saveIntent({ ...intent, phase: "resume", depositedAt: Date.now() });
      return true;
    }

    prioritizedMissionWork(context, selectionOptions = {}) {
      if (
        typeof this.isMissionGuidanceEnabled === "function" &&
        !this.isMissionGuidanceEnabled()
      ) {
        return null;
      }
      // Les actions runtime déléguées de la primaire possèdent déjà le cycle
      // missionnel. Le relais Top4 ne doit jamais lancer une action concurrente.
      if (
        this.hasActivePrimaryMission() &&
        this.missionAllowsAutomaticExecution(this.primaryMissionId) &&
        this.delegatedRuntimeAction(this.primaryMissionId)
      ) {
        return null;
      }
      const excludedMissionIds = selectionOptions.excludedMissionIds instanceof Set
        ? selectionOptions.excludedMissionIds
        : new Set(selectionOptions.excludedMissionIds || []);
      const storedPriorityIds = typeof this.getPrioritizedMissionIds === "function"
        ? this.getPrioritizedMissionIds()
        : Array.isArray(this.prioritizedMissionIds)
          ? this.prioritizedMissionIds
          : [];
      const prioritizedMissionIds = [...new Set([
        this.primaryMissionId,
        ...storedPriorityIds
      ].filter(Boolean))]
        .filter((id) => !excludedMissionIds.has(id))
        .filter((id) =>
          this.ensureLifecycle(id).status === "active" &&
          this.trees.has(id)
        )
        .filter((id) => this.missionAllowsAutomaticExecution(id))
        .slice(0, 4);
      const causalArrival = this.causalArrivalWork(context);

      const opportunity = this.localOpportunityWork(context);
      if (opportunity && !excludedMissionIds.has(opportunity.missionId)) return opportunity;
      for (const missionId of prioritizedMissionIds) {
        const proximity = this.localProximityWork(missionId);
        if (proximity) return { kind: "proximity", missionId, proximity };
        const gate = this.localCompletionGateFor(missionId);
        if (gate) return { kind: "completion-gate", missionId, gate };
        const assessment = this.assessMission(missionId, context);
        if (assessment?.action) {
          return {
            kind: "action",
            missionId,
            selected: {
              missionId,
              action: assessment.action,
              primary: missionId === this.primaryMissionId
            }
          };
        }

        const travel = this.missionTransitionFor(missionId, context);
        if (
          travel &&
          this.missionTransitionExecutable(travel) &&
          !(
            causalArrival?.missionId &&
            missionId !== causalArrival.missionId
          )
        ) {
          return {
            kind: "travel",
            missionId,
            travel
          };
        }
      }
      return null;
    }

    chooseRunnableMissionAction(context, selectionOptions = {}) {
      if (
        typeof this.isMissionGuidanceEnabled === "function" &&
        !this.isMissionGuidanceEnabled()
      ) {
        return null;
      }
      const excludedMissionIds = selectionOptions.excludedMissionIds instanceof Set
        ? selectionOptions.excludedMissionIds
        : new Set(selectionOptions.excludedMissionIds || []);
      const allowOutsideShortlistFallback =
        selectionOptions.allowOutsideShortlistFallback !== false;
      if (
        this.hasActivePrimaryMission() &&
        this.delegatedRuntimeAction(this.primaryMissionId)
      ) {
        return null;
      }

      const activeMissionIds = this.activeMissionIds
        .filter((id) => this.isMissionVisibleOnCurrentMap(id))
        .filter((id) =>
          this.ensureLifecycle(id).status === "active" &&
          this.trees.has(id)
        );
      const activeMissionSet = new Set(activeMissionIds);
      const storedPriorityIds = typeof this.getPrioritizedMissionIds === "function"
        ? this.getPrioritizedMissionIds()
        : Array.isArray(this.prioritizedMissionIds)
          ? this.prioritizedMissionIds
          : [];
      const prioritizedMissionIds = [...new Set([
        this.primaryMissionId,
        ...storedPriorityIds
      ].filter(Boolean))]
        .filter((id) => activeMissionSet.has(id))
        .filter((id) => this.missionAllowsAutomaticExecution(id))
        .slice(0, 4);
      const prioritizedMissionSet = new Set(prioritizedMissionIds);
      const assessRunnable = (missionIds) => missionIds
        .filter((id) => !excludedMissionIds.has(id))
        .filter((id) => this.missionAllowsAutomaticExecution(id))
        .map((id) => this.assessMission(id, context))
        .filter((candidate) => candidate?.action);

      // La shortlist persistante décrit les missions qui ont actuellement le
      // droit de produire une action physique. Une mission hors shortlist peut
      // toujours progresser passivement par fan-out. Elle ne devient candidate
      // d'exécution que si toute la shortlist est localement stérile (R-STAB).
      let assessments = assessRunnable(prioritizedMissionIds);
      let shortlistFallback = false;
      if (!assessments.length && allowOutsideShortlistFallback) {
        shortlistFallback = true;
        const fallbackMissionIds = activeMissionIds.filter(
          (id) => !prioritizedMissionSet.has(id)
        );
        const structuredMissionIds = fallbackMissionIds
          .filter((id) => !this.missionHasHistoricalCollectionObjective(id))
          .filter((id) => this.missionAllowsAutomaticExecution(id));
        assessments = assessRunnable(structuredMissionIds);
        if (!assessments.length) {
          assessments = assessRunnable(
            fallbackMissionIds.filter((id) =>
              this.missionHasHistoricalCollectionObjective(id) &&
              this.historicalCollectionTransitionOpportunity(id, context)
            )
          );
        }
      }

      const primary = assessments.find(
        (candidate) => candidate.missionId === this.primaryMissionId
      ) || null;

      const secondaries = assessments
        .filter((candidate) => candidate.missionId !== this.primaryMissionId)
        .sort((left, right) => right.score - left.score)
        .slice(0, 3);

      if (!primary && !secondaries.length) return null;

      const tutorialPrimary = Boolean(
        primary && /^T(?:0[1-9]|1[0-3])$/.test(String(primary.missionId || ""))
      );
      if (primary && (this.isPlayerSelectedPrimary() || tutorialPrimary)) {
        return {
          missionId: primary.missionId,
          action: primary.action,
          primary: true
        };
      }

      const primaryVital = primary && (
        (primary.action.type === Missions.ActionType.REST && context.needs?.rest) ||
        (primary.action.type === Missions.ActionType.EAT && context.needs?.food)
      );
      if (primaryVital) {
        return {
          missionId: primary.missionId,
          action: primary.action,
          primary: true
        };
      }

      const BAC = BF.BAC;
      if (!BAC?.weightedPick) {
        const fallback = primary || secondaries[0];
        return fallback
          ? {
              missionId: fallback.missionId,
              action: fallback.action,
              primary: fallback.missionId === this.primaryMissionId
            }
          : null;
      }

      const options = [];
      if (!shortlistFallback) {
        const priorityWeights = [100, 45, 20, 10];
        [primary, ...secondaries]
          .filter(Boolean)
          .forEach((candidate) => {
            const rank = prioritizedMissionIds.indexOf(candidate.missionId);
            options.push({
              id: `mission-priority-${rank + 1}:${candidate.missionId}`,
              axis: this.missionActionAxis(candidate.missionId, candidate.action),
              baseWeight: priorityWeights[rank] || 10,
              candidate
            });
          });
      } else if (secondaries.length) {
        const totalScore = secondaries.reduce(
          (sum, candidate) => sum + Math.max(1, Number(candidate.score) || 1),
          0
        );
        secondaries.forEach((candidate) => {
          options.push({
            id: `mission-secondary:${candidate.missionId}`,
            axis: this.missionActionAxis(candidate.missionId, candidate.action),
            baseWeight:
              100 *
              (Math.max(1, Number(candidate.score) || 1) / totalScore),
            candidate
          });
        });
      }

      const selected = BAC.weightedPick(options);
      const candidate = selected?.candidate || primary || secondaries[0];
      return candidate
        ? {
            missionId: candidate.missionId,
            action: candidate.action,
            primary: candidate.missionId === this.primaryMissionId
          }
        : null;
    }

    outsideShortlistMissionTravel(context, selectionOptions = {}) {
      if (
        typeof this.isMissionGuidanceEnabled === "function" &&
        !this.isMissionGuidanceEnabled()
      ) return null;

      const excludedMissionIds = selectionOptions.excludedMissionIds instanceof Set
        ? selectionOptions.excludedMissionIds
        : new Set(selectionOptions.excludedMissionIds || []);
      const activeMissionIds = this.activeMissionIds
        .filter((id) => this.isMissionVisibleOnCurrentMap(id))
        .filter((id) =>
          this.ensureLifecycle(id).status === "active" &&
          this.trees.has(id)
        );
      const activeMissionSet = new Set(activeMissionIds);
      const storedPriorityIds = typeof this.getPrioritizedMissionIds === "function"
        ? this.getPrioritizedMissionIds()
        : Array.isArray(this.prioritizedMissionIds)
          ? this.prioritizedMissionIds
          : [];
      const prioritizedMissionIds = [...new Set([
        this.primaryMissionId,
        ...storedPriorityIds
      ].filter(Boolean))]
        .filter((id) => activeMissionSet.has(id))
        .filter((id) => this.missionAllowsAutomaticExecution(id))
        .slice(0, 4);
      const prioritizedMissionSet = new Set(prioritizedMissionIds);
      const structuredMissionIds = activeMissionIds
        .filter((id) => !prioritizedMissionSet.has(id))
        .filter((id) => !excludedMissionIds.has(id))
        .filter((id) => !this.missionHasHistoricalCollectionObjective(id))
        .filter((id) => this.missionAllowsAutomaticExecution(id));

      const causalArrival = this.causalArrivalWork(context);
      const candidates = structuredMissionIds
        .map((missionId) => ({
          missionId,
          assessment: this.assessMissionPriority(missionId, context),
          travel: this.missionTransitionFor(missionId, context)
        }))
        .filter(({ missionId, travel }) =>
          travel &&
          this.missionTransitionExecutable(travel) &&
          !(causalArrival?.missionId && missionId !== causalArrival.missionId)
        )
        .sort((left, right) =>
          Number(right.assessment?.score || 0) -
          Number(left.assessment?.score || 0)
        );
      const best = candidates[0] || null;
      return best
        ? { kind: "travel", missionId: best.missionId, travel: best.travel }
        : null;
    }

    executeSelectedMissionAction(selected, now) {
      if (!selected?.action) return false;
      const action = {
        ...selected.action,
        missionId: selected.missionId,
        isSecondary: !selected.primary
      };
      const tree = this.trees.get(selected.missionId);
      if (action.siteProgressionKind) {
        const node = tree?.availableLeaves?.().find(candidate => candidate.id === action.nodeId);
        const mapId = String(this.engine.currentMapId || "");
        const mapState = this.planner.requiredMapState(node, this.bridge.context());
        if (!node || node.params?.siteProgressionKind !== action.siteProgressionKind ||
            (mapState.constrained && !mapState.runnable) ||
            (node.params.mapId && String(node.params.mapId) !== mapId) ||
            String(BF.getAutonomyMode?.() || "").toLowerCase() !== "full") return false;
        return Boolean(BF.bibleRuntime?.startConstruction?.(action.siteProgressionKind, {
          mapId, source: "autonomy"
        }));
      }
      if (!tree || !this.bridge.execute(action, now)) {
        if (tree) this.recordExecutionFailure(action, "execute-false", now);
        return false;
      }

      this.currentAction = action;
      const node = tree.find(action.nodeId);
      if (node && node.status === Missions.MissionStatus.AVAILABLE) {
        node.status = Missions.MissionStatus.ACTIVE;
        if (!node.startedAt) node.startedAt = Date.now();
      }

      this.engine.callbacks.onAction(
        selected.primary
          ? `Mission : ${action.title}.`
          : `Mission secondaire : ${action.title}.`
      );
      this.memory.remember("action-started", action);

      // Les études de preuve sont des étapes missionnelles narratives : le bridge
      // a validé la preuve source mais n'a lancé aucune interaction monde. On
      // complète donc uniquement l'action courante, sans fan-out passif ni faux
      // événement OBJECT_ANALYZED.
      const evidenceCompletion = action.__missionEvidenceCompletion || null;
      if (evidenceCompletion) {
        delete action.__missionEvidenceCompletion;
        const completed = this.notifyActionCompleted(
          action.type,
          evidenceCompletion,
          { passive: false }
        );
        if (!completed) {
          this.currentAction = null;
          this.recordExecutionFailure(action, "evidence-completion-failed", now);
          return false;
        }
        return true;
      }

      this.memory.saveTree(tree);
      this.publish();
      return true;
    }

    hasMissionExecutionAuthority() {
      // Les consommateurs BAC lisent cette autorité du manager : une demande
      // explicite de retour n’est pas une nouvelle initiative d’autonomie libre.
      if (this.pendingPlayerActionReturn()) return true;
      if (this.isMissionGuidanceEnabled?.() === false) return false;
      if (this.hasPrimaryMissionAuthority()) return true;

      const context = this.bridge.context();
      const activeMissionIds = this.activeMissionIds
        .filter((id) => this.isMissionVisibleOnCurrentMap(id))
        .filter((id) =>
          this.ensureLifecycle(id).status === "active" &&
          this.trees.has(id)
        );
      const activeMissionSet = new Set(activeMissionIds);
      const storedPriorityIds = typeof this.getPrioritizedMissionIds === "function"
        ? this.getPrioritizedMissionIds()
        : Array.isArray(this.prioritizedMissionIds)
          ? this.prioritizedMissionIds
          : [];
      const prioritizedMissionIds = [...new Set([
        this.primaryMissionId,
        ...storedPriorityIds
      ].filter(Boolean))]
        .filter((id) => activeMissionSet.has(id))
        .filter((id) => this.missionAllowsAutomaticExecution(id))
        .slice(0, 4);
      const prioritizedMissionSet = new Set(prioritizedMissionIds);
      const hasExecutableMissionWork = (missionId) =>
        this.missionAllowsAutomaticExecution(missionId) &&
        Boolean(
          this.localProximityWork(missionId) ||
          this.localCompletionGateFor(missionId) ||
          this.delegatedRuntimeAction(missionId) ||
          this.assessMission(missionId, context)?.action
        );

      // Preserve the validated authority fast paths. Only when all of them are
      // sterile do we look for a structured travel outside the persistent Top4.
      if (prioritizedMissionIds.some(hasExecutableMissionWork)) return true;
      if (
        activeMissionIds
          .filter((id) => !prioritizedMissionSet.has(id))
          .some(hasExecutableMissionWork)
      ) return true;
      if (this.prioritizedMissionTransition(context)) return true;
      return Boolean(this.outsideShortlistMissionTravel(context));
    }

    update(now) {
      if (!this.enabled) return false;
      if (
        this.persistenceHydrationBlocked &&
        !this.recoverPersistenceHydration(now)
      ) {
        return false;
      }
      this.applyPendingTransitions();
      // An active action cannot start a mission transition. Its completion
      // and cancellation paths already reassess the pending intent.
      // Un tick différé ou occupé ne doit pas rescanner le monde avant sa garde.
      // La progression réévalue immédiatement les intentions ; le tick de
      // planification les réévalue également avant de reprendre le travail.
      if (
        now - this.lastPriorityReviewAt > 5000 &&
        !this.currentAction &&
        (
          !this.hasActivePrimaryMission() ||
          !this.bridge.isEngineBusy()
        )
      ) {
        this.lastPriorityReviewAt = now;
        this.selectBestPrimary(now);
      }

      // mission-action-watchdog-v1
      if (this.currentAction) {
        const actionAge =
          Date.now() - Number(this.currentAction.issuedAt || Date.now());
        const character = this.engine.character;
        const pendingGate = this.engine.pendingGate;
        const stationaryBeforeGate = Boolean(
          pendingGate &&
          character.root.position.distanceTo(character.target) < 0.2 &&
          character.root.position.distanceTo(pendingGate.position) >
            (Number(pendingGate.userData?.triggerRadius) || 2.35)
        );
        const engineIdle =
          (!this.bridge.isEngineBusy() || stationaryBeforeGate) &&
          !this.engine.transitioning &&
          !this.engine.pendingInteraction &&
          !this.engine.currentRoutine &&
          (!pendingGate || stationaryBeforeGate) &&
          !this.engine.pendingZoneExploration &&
          character.root.position.distanceTo(character.target) < 0.25;

        if (engineIdle && actionAge > 5000) {
          const orphan = this.currentAction;
          this.memory.remember("action-orphaned", {
            ...orphan,
            reason: "engine-idle-with-current-action",
            ageMs: actionAge
          });
          this.recordExecutionFailure(
            orphan,
            "engine-idle-with-current-action",
            now
          );
          this.currentAction = null;
          this.retryAfter = now + 650;
          this.idleRetryUntil = 0;
          this.engine.callbacks?.onAction?.(
            `Mission : action interrompue, nouvelle tentative pour « ${orphan.title} ».`
          );
          this.publish();
        } else {
          return true;
        }
      }

      if (now < this.retryAfter || now - this.lastPlanAt < 1200) return false;
      if (this.bridge.isEngineBusy()) return false;

      this.lastPlanAt = now;
      if (this.playerActionReturnWork()) {
        this.retryAfter = now + 1200;
        this.idleRetryUntil = 0;
        return true;
      }
      if (this.inventoryReturnWork(this.bridge.context())) {
        this.retryAfter = now + 1200;
        this.idleRetryUntil = 0;
        return true;
      }
      const opportunity = this.localOpportunityWork(this.bridge.context());
      if (opportunity) {
        const accepted = opportunity.kind === "action"
          ? this.executeSelectedMissionAction(opportunity.selected, now)
          : this.engine.approachMissionContext?.(opportunity.proximity);
        if (accepted) { this.retryAfter = now + 1200; this.idleRetryUntil = 0; return true; }
        if (opportunity.kind === "proximity") this.recordExecutionFailure({
          missionId: opportunity.missionId, nodeId: opportunity.proximity.nodeId
        }, "proximity-approach-failed", now);
      }
      this.ensureMissionTransitionIntent();
      if (this.resumeMissionTransitionIntent()) {
        this.retryAfter = now + 1200;
        this.idleRetryUntil = 0;
        return true;
      }

      const decisionContext = this.bridge.context();
      const refusedMissionIds = new Set();

      // La Top4 est arbitrée mission par mission : une transition réellement
      // exécutable d'une mission mieux classée doit être considérée avant toute
      // action générique d'une mission moins prioritaire. Le deferral historique
      // reste le seul moyen pour une opportunité locale perdable de retarder ce
      // départ.
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const work = this.prioritizedMissionWork(decisionContext, {
          excludedMissionIds: refusedMissionIds
        });
        if (!work) break;

        if (work.kind === "proximity") {
          if (this.engine.approachMissionContext?.(work.proximity)) {
            this.retryAfter = now + 1200;
            this.idleRetryUntil = 0;
            return true;
          }
          this.recordExecutionFailure({ missionId: work.missionId,
            nodeId: work.proximity.nodeId }, "proximity-approach-failed", now);
          refusedMissionIds.add(work.missionId);
          continue;
        }

        if (work.kind === "completion-gate") {
          if (this.engine.approachMissionCompletionGate?.(work.missionId, work.gate)) {
            this.retryAfter = now + 1200;
            this.idleRetryUntil = 0;
            return true;
          }
          this.recordExecutionFailure({ missionId: work.missionId,
            nodeId: work.gate.requiredNodeId || `${work.missionId}:completion-gate-local` }, "completion-gate-approach-failed", now);
          refusedMissionIds.add(work.missionId);
          continue;
        }

        if (work.kind === "action") {
          if (this.executeSelectedMissionAction(work.selected, now)) {
            this.retryAfter = now + 1200;
            this.idleRetryUntil = 0;
            return true;
          }
          refusedMissionIds.add(work.missionId);
          continue;
        }

        const intent = this.ensureMissionTransitionIntent(
          decisionContext,
          work.travel
        );
        if (!intent?.active) {
          refusedMissionIds.add(work.missionId);
          continue;
        }

        if (this.shouldDeferMissionTransition(work.missionId, decisionContext)) {
          const deferMissionId = String(intent.deferMissionId || "");
          const deferTree = this.trees.get(deferMissionId);
          const deferAction = deferTree
            ? this.missionRunnableAction(
                deferMissionId,
                deferTree,
                decisionContext,
                now,
                { reportUnresolved: false }
              )
            : null;
          if (
            deferAction &&
            this.executeSelectedMissionAction({
              missionId: deferMissionId,
              action: deferAction,
              primary: deferMissionId === this.primaryMissionId
            }, now)
          ) {
            this.retryAfter = now + 1200;
            this.idleRetryUntil = 0;
            return true;
          }

          // Une opportunité choisie mais finalement refusée ne doit pas
          // immobiliser le travel qui l'avait autorisée.
          const currentIntent = this.memory.getFact?.(
            this.missionReturnIntentKey(work.missionId),
            null
          );
          if (
            currentIntent?.active === true &&
            String(currentIntent.deferMissionId || "") === deferMissionId
          ) {
            this.memory.setFact?.(
              this.missionReturnIntentKey(work.missionId),
              {
                ...currentIntent,
                deferMissionId: null,
                updatedAt: Date.now()
              }
            );
            this.memory.save?.();
          }
        }

        if (
          this.resumeMissionTransitionIntent(decisionContext, work.travel)
        ) {
          this.retryAfter = now + 1200;
          this.idleRetryUntil = 0;
          return true;
        }

        // Le travel prioritaire est réel mais momentanément non lançable :
        // ne pas descendre vers Shelter/COL/autonomie libre dans ce cycle.
        this.retryAfter = now + 1200;
        this.idleRetryUntil = 0;
        return false;
      }

      // Préserver le fallback R-STAB historique hors shortlist, mais seulement
      // après épuisement réel des actions et transitions de la Top4.
      const fallback = this.chooseRunnableMissionAction(decisionContext, {
        excludedMissionIds: refusedMissionIds,
        allowOutsideShortlistFallback: true
      });
      if (fallback?.action) {
        if (this.executeSelectedMissionAction(fallback, now)) {
          this.retryAfter = now + 1200;
          this.idleRetryUntil = 0;
          return true;
        }
        this.retryAfter = now + 4000;
        this.idleRetryUntil = 0;
        return false;
      }

      const fallbackTravel = this.outsideShortlistMissionTravel(decisionContext, {
        excludedMissionIds: refusedMissionIds
      });
      if (fallbackTravel?.travel) {
        const intent = this.ensureMissionTransitionIntent(
          decisionContext,
          fallbackTravel.travel
        );
        if (
          intent?.active === true &&
          this.resumeMissionTransitionIntent(decisionContext, fallbackTravel.travel)
        ) {
          this.retryAfter = now + 1200;
          this.idleRetryUntil = 0;
          return true;
        }
        // A real structured travel exists: retain mission authority and retry,
        // rather than falling through to free autonomy in this cycle.
        this.retryAfter = now + 1200;
        this.idleRetryUntil = 0;
        return false;
      }

      this.retryAfter = now + 5000;
      this.idleRetryUntil = this.retryAfter;
      return false;
    }

    notifyActionCompleted(type, detail = {}, options = {}) {
      const passive = options.passive !== false;
      if (!this.currentAction || this.currentAction.type !== type) {
        const changed = passive ? this.progressPassiveMissions(type, detail) : 0;
        if (changed) {
          this.syncLifecycleFromTrees();
          this.reevaluatePendingActivations();
          this.ensureMissionTransitionIntent();
          this.catalogController?.schedule();
          this.publish();
        }
        return changed > 0;
      }
      const completedAction = this.currentAction;
      const missionId = completedAction.missionId || this.primaryMissionId;
      const actionTree = this.trees.get(missionId) || this.tree;
      if (!actionTree) return false;
      const node = actionTree.find(completedAction.nodeId);
      const alreadyProgressed = options.progressAlreadyApplied === true &&
        completedAction.type === Missions.ActionType.EXPLORE_ZONE &&
        node?.params?.metric === "surfacePercent" &&
        Number(node.progress) > Number(detail.previousProgress);
      if (!completedAction.backgroundEnvironment && !alreadyProgressed &&
          !this.planner.applyCompletion(actionTree, completedAction, detail)) {
        return false;
      }
      this.memory.remember(type, detail);
      this.memory.remember("action-completed", completedAction);
      this.clearExecutionRecovery(completedAction);
      this.currentAction = null;
      this.retryAfter = performance.now() + 650;
      this.idleRetryUntil = 0;
      this.memory.saveTree(actionTree);
      if (passive) {
        this.progressPassiveMissions(type, detail, {
          missionId,
          nodeId: completedAction.nodeId
        });
      }
      this.syncLifecycleFromTrees();
      this.ensureMissionTransitionIntent();
      this.catalogController?.schedule();
      this.publish();
      if (actionTree.root.isComplete) {
        this.reevaluatePendingActivations();
        this.engine.callbacks.onAction(
          `Mission accomplie : ${actionTree.title}.`
        );
        this.engine.callbacks.onStatus(
          `« ${actionTree.title} » terminée. BlueFox réévalue uniquement les projets déjà actifs.`
        );
      }
      return true;
    }

    syncLifecycleFromTrees() {
      let changed = false;
      this.trees.forEach((tree, missionId) => {
        if (!tree.root.isComplete) return;
        const lifecycle = this.ensureLifecycle(missionId);
        const gate = BF.bibleRuntime?.completionGateState?.(missionId) || null;

        if (gate?.managed === true && gate.canFinalize !== true) {
          if (
            lifecycle.status !== "active" ||
            lifecycle.waitingForBibleGate !== true ||
            lifecycle.waitingForBibleGateMessage !== gate.message
          ) {
            changed = true;
          }
          lifecycle.status = "active";
          lifecycle.completedAt = 0;
          lifecycle.waitingForBibleGate = true;
          lifecycle.waitingForBibleGateMessage = gate.message ||
            "Une validation dans le monde est encore requise.";
          if (!this.activeMissionIds.includes(missionId)) {
            this.activeMissionIds.push(missionId);
          }
          return;
        }

        const wasWaitingForBibleGate = lifecycle.waitingForBibleGate === true;
        if (lifecycle.status !== "completed") changed = true;
        lifecycle.status = "completed";
        lifecycle.completedAt = wasWaitingForBibleGate
          ? Date.now()
          : (tree.root.completedAt || lifecycle.completedAt || Date.now());
        delete lifecycle.waitingForBibleGate;
        delete lifecycle.waitingForBibleGateMessage;
        this.activeMissionIds = this.activeMissionIds.filter(
          (id) => id !== missionId
        );
      });
      const primaryLifecycle = this.primaryMissionId
        ? this.memory.state.missionLifecycle?.[this.primaryMissionId]
        : null;
      if (
        !this.primaryMissionId ||
        primaryLifecycle?.status === "completed" ||
        !this.activeMissionIds.includes(this.primaryMissionId)
      ) {
        this.primaryMissionId = "";
        this.activeMissionId = "";
        this.tree = null;
        this.selectionReason = "Mission principale terminée ; réévaluation des missions actives.";
        this.syncMissionSelection();
        this.selectBestPrimary(performance.now(), true);
      } else {
        this.syncMissionSelection();
      }
      if (changed) this.memory.save();
      return changed;
    }

    cheatCompletePrimaryMission() {
      const missionId = String(this.primaryMissionId || "");
      const tree = missionId ? this.trees.get(missionId) : null;
      const lifecycle = missionId
        ? this.memory.state.missionLifecycle?.[missionId]
        : null;

      if (!missionId || !tree || lifecycle?.status !== "active") {
        return {
          ok: false,
          reason: "no-active-primary",
          message: "TRICHE : aucune mission prioritaire active."
        };
      }

      const preflight = BF.bibleRuntime?.cheatMissionCompletionPreflight?.(missionId) || {
        ok: true,
        missionId
      };
      if (preflight.ok === false) {
        return {
          ok: false,
          missionId,
          reason: preflight.reason || "runtime-preflight-failed",
          message: preflight.message || "TRICHE : validation impossible."
        };
      }

      // Transaction cheat : l'arbre est modifié temporairement en mémoire pour
      // permettre à BibleRuntime de vérifier/matérialiser les effets qui
      // dépendent de slots completed, mais rien n'est persisté avant succès.
      const treeSnapshot = [];
      tree.root.walk((node) => {
        treeSnapshot.push({
          node,
          progress: node.progress,
          status: node.status,
          startedAt: node.startedAt,
          completedAt: node.completedAt
        });
      });
      const restoreTreeSnapshot = () => {
        treeSnapshot.forEach((entry) => {
          entry.node.progress = entry.progress;
          entry.node.status = entry.status;
          entry.node.startedAt = entry.startedAt;
          entry.node.completedAt = entry.completedAt;
        });
        tree.refresh();
      };

      const now = Date.now();
      tree.root.walk((node) => {
        if (!node?.isLeaf || node.isComplete) return;
        let cursor = node;
        let required = true;
        while (cursor && cursor !== tree.root) {
          if (cursor.optional === true) {
            required = false;
            break;
          }
          cursor = cursor.parent;
        }
        if (!required) return;
        node.progress = node.target;
        node.status = Missions.MissionStatus.COMPLETED;
        node.startedAt ||= now;
        node.completedAt ||= now;
      });
      tree.refresh();

      if (!tree.root.isComplete) {
        restoreTreeSnapshot();
        return {
          ok: false,
          missionId,
          reason: "tree-not-complete",
          message: `TRICHE : « ${tree.title} » ne peut pas être validée automatiquement.`
        };
      }

      // Les effets/gates qui ne sont réconciliables que tant que la mission est
      // active doivent être matérialisés après la complétion de l'arbre, mais
      // avant que MissionManager ne fasse basculer le lifecycle à completed.
      const preparation = BF.bibleRuntime?.prepareCheatMissionCompletion?.(missionId) || {
        ok: true,
        missionId
      };
      if (preparation.ok === false) {
        restoreTreeSnapshot();
        this.publish();
        return {
          ok: false,
          missionId,
          reason: preparation.reason || "runtime-preparation-failed",
          message: preparation.message || "TRICHE : validation impossible."
        };
      }

      // Le monde est prêt : seulement maintenant l'action missionnelle courante
      // est annulée et l'arbre completed devient durable. Un refus de la phase
      // BibleRuntime ne laisse donc ni arbre sauvegardé ni action annulée.
      if (this.currentAction) {
        this.cancelCurrentAction("debug-cheat");
      }
      this.memory.saveTree(tree);

      this.syncLifecycleFromTrees();
      this.ensureMissionTransitionIntent();
      this.reevaluatePendingActivations();
      this.catalogController?.schedule();
      this.memory.save?.();
      this.publish();

      const completed =
        this.memory.state.missionLifecycle?.[missionId]?.status === "completed";
      return {
        ok: completed,
        missionId,
        reason: completed ? "completed" : "completion-gate-pending",
        message: completed
          ? `TRICHE : « ${tree.title} » validée.`
          : `TRICHE : « ${tree.title} » reste en attente d'un effet monde.`
      };
    }

    cancelCurrentAction(reason = "cancelled", options = {}) {
      if (!this.currentAction) return;
      const cancelledAction = this.currentAction;
      const failedTarget =
        options?.failedTarget ||
        this.engine?.pendingInteraction ||
        null;
      this.engine?.cancelMissionInteraction?.(
        cancelledAction,
        reason
      );
      this.memory.remember("action-cancelled", {
        ...cancelledAction,
        reason
      });
      if (this.executionCancellationIsFailure(reason)) {
        this.recordExecutionFailure(
          cancelledAction,
          reason,
          performance.now(),
          failedTarget
        );
      }
      this.currentAction = null;
      this.retryAfter = performance.now() + 1800;
      this.idleRetryUntil = 0;
      this.publish();
    }

    publish() {
      const detail = this.getState();
      BF.missionState = detail;
      global.dispatchEvent(new CustomEvent("bluefox:mission-state", { detail }));
    }

    displayTreeSnapshot(tree) {
      if (!tree) return null;
      const snapshot = tree.toJSON();
      const normalizeProgress = (node) => {
        if (node?.params?.metric === "surfacePercent") {
          node.progress = Math.floor(Math.max(0, Number(node.progress) || 0));
        }
        (node?.children || []).forEach(normalizeProgress);
      };
      normalizeProgress(snapshot.root);
      return snapshot;
    }

    missionBrowserMetadata(missionId, definition = this.definition(missionId) || {}) {
      const baseId = definition.baseMissionId || String(missionId).split("@")[0];
      const catalog = BF.bibleRuntime?.byId?.get?.(missionId) ||
        BF.bibleRuntime?.byId?.get?.(baseId) || {};
      const lifecycle = this.memory.state.missionLifecycle?.[missionId] || {};
      const localMapId = definition.instanceScope === "map"
        ? definition.scopeId || String(missionId).split("@").slice(1).join("@") : null;
      return {
        activatedAt: Number(lifecycle.activatedAt) || 0,
        completedAt: Number(lifecycle.completedAt) || 0,
        theme: catalog.theme || null,
        narrativeAxis: definition.narrativeAxis || catalog.narrativeAxis || null,
        passivePriorityAxis: definition.passivePriorityAxis || null,
        backgroundProgressOnly: this.missionIsBackgroundProgressOnly(missionId, definition),
        scope: definition.scope || definition.instanceScope || "global",
        locationMapId: localMapId || definition.targetMapId ||
          (catalog.targetMapFact
            ? this.memory.getFact(catalog.targetMapFact)?.[catalog.targetMapField || "mapId"] : null),
        constructionAdoptionAvailable: lifecycle.status === "active" &&
          BF.bibleRuntime?.constructionAdoptionAvailable?.(missionId) === true,
        playerActionDestinations: lifecycle.status === "active"
          ? BF.getMissionPlayerActionDestinations?.(missionId) || [] : []
      };
    }

    getState() {
      const browserMetadata = new Map(), browserDefinitions = new Map();
      const definitionFor = (id) => {
        if (!browserDefinitions.has(id)) {
          // Métadonnées de présentation : le contrat canonique suffit, la map
          // de l'instance est lue séparément dans son ID persistant. Ne pas
          // cloner des centaines d'arbres scoped à chaque publication UI.
          browserDefinitions.set(id, Missions.definitions[id] ||
            Missions.definitions[String(id).split("@")[0]] || this.definition(id));
        }
        return browserDefinitions.get(id);
      };
      const metadataFor = (id) => {
        if (!browserMetadata.has(id)) browserMetadata.set(id, this.missionBrowserMetadata(id, definitionFor(id)));
        return browserMetadata.get(id);
      };
      const missionIds = [...(this.activeMissionIds || [])]
        .filter((id) => this.trees?.has(id))
        .filter((id) => this.isMissionVisibleOnCurrentMap(id));
      const publicPrimaryMissionId = this.isMissionVisibleOnCurrentMap(
        this.primaryMissionId
      )
        ? this.primaryMissionId
        : "";
      const missionStateIds = [...this.trees.keys()]
        .filter((id) => ["active", "completed"].includes(this.ensureLifecycle(id).status))
        .filter((id) => this.isMissionVisibleOnCurrentMap(id));
      const missionStates = missionStateIds
        .sort((left, right) =>
          Number(right === publicPrimaryMissionId) -
          Number(left === publicPrimaryMissionId)
        )
        .map((id) => {
          const tree = this.trees.get(id);
          return {
            ...metadataFor(id),
            missionId: id,
            title: tree.title,
            description: tree.description,
            status: tree.root.status,
            lifecycleStatus: this.ensureLifecycle(id).status,
            completedAt: this.ensureLifecycle(id).completedAt || 0,
            progress: this.treeProgress(tree),
            journalIntro: this.definition(id)?.journalIntro ||
              `J’ai ouvert cette mission parce que ${this.ensureLifecycle(id).discoveryReason || "mes observations indiquent qu’elle est désormais réalisable"}.`,
            discoveryReason: this.ensureLifecycle(id).discoveryReason,
            isPrimary: id === publicPrimaryMissionId,
            tree: this.displayTreeSnapshot(tree)
          };
        });
      const publicCatalog = [...new Set([
        ...Object.keys(Missions.definitions), ...this.trees.keys()
      ])]
        .filter((id) => id !== "foundation" && definitionFor(id))
        .filter((id) => definitionFor(id).instanceScope !== "map" || String(id).includes("@"))
        .filter((id) => Object.prototype.hasOwnProperty.call(
          this.memory.state.missionLifecycle || {},
          id
        ))
        .filter((id) => ["available", "active", "paused", "completed"].includes(
          this.memory.state.missionLifecycle[id]?.status
        ))
        .filter((id) => {
          const lifecycle = this.memory.state.missionLifecycle[id] || {};
          if (lifecycle.status !== "available") return true;
          // Une simple lecture historique de prérequis a pu matérialiser un
          // lifecycle par défaut. Sans découverte réelle, cet état ne doit
          // pas devenir public dans le journal des missions.
          return Boolean(
            Number(lifecycle.activatedAt) > 0 ||
            String(lifecycle.discoveryReason || "") ||
            String(lifecycle.source || "system") !== "system"
          );
        })
        .map((id) => {
          const lifecycle = this.memory.state.missionLifecycle[id] || {};
          const visibleHere = this.isMissionVisibleOnCurrentMap(id, definitionFor(id));
          return {
            ...metadataFor(id),
            missionId: id,
            title: definitionFor(id).title,
            status: lifecycle.status,
            lifecycleStatus: lifecycle.status,
            contextVisible: visibleHere !== false,
            scope: definitionFor(id).scope ||
              definitionFor(id).instanceScope || "global",
            progress: this.trees.has(id)
              ? this.treeProgress(this.trees.get(id))
              : lifecycle.status === "completed"
                ? 1
                : 0,
            journalIntro: definitionFor(id).journalIntro ||
              `Cette mission est apparue lorsque ma progression a atteint un nouveau seuil. Je veux maintenant vérifier méthodiquement ce que ces découvertes rendent possible.`,
            discoveryReason: lifecycle.discoveryReason,
            waitingFor: [...(lifecycle.waitingFor || [])]
          };
        })
        .concat(this.pendingExperimentCatalogEntries());

      if (!this.tree && !missionStates.length) {
        return {
          version: "M2",
          currentMapId: this.engine?.currentMapId || null,
          primaryMissionId: "",
          activeMissionIds: [],
          selectionReason: "Aucune mission active.",
          pendingPrimaryMissionId: null,
          pendingPrimaryMissionTitle: "",
          missionId: "",
          title: "",
          description: "",
          status: "idle",
          currentAction: null,
          available: [],
          tree: null,
          missions: [],
          catalog: publicCatalog,
          pendingExperimentationIntent: this.pendingExperimentationIntent(),
          inventory: { ...(BF.getProgressionState?.().inventory || {}) }
        };
      }

      const displayTree = publicPrimaryMissionId
        ? this.trees.get(publicPrimaryMissionId) || null
        : this.trees.get(missionIds[0]) || null;
      const publicPendingPrimaryMissionId = this.isMissionVisibleOnCurrentMap(
        this.pendingPrimaryMissionId
      )
        ? this.pendingPrimaryMissionId
        : null;
      return {
        version: "M2",
        currentMapId: this.engine?.currentMapId || null,
        primaryMissionId: publicPrimaryMissionId,
        activeMissionIds: [...missionIds],
        selectionReason: this.selectionReason,
        pendingPrimaryMissionId: publicPendingPrimaryMissionId,
        pendingPrimaryMissionTitle: publicPendingPrimaryMissionId
          ? this.trees.get(publicPendingPrimaryMissionId)?.title || ""
          : "",
        missionId: displayTree?.id || "",
        title: displayTree?.title || "",
        description: displayTree?.description || "",
        status: displayTree?.root?.status || "idle",
        currentAction: this.currentAction
          ? { ...this.currentAction, params: { ...this.currentAction.params } }
          : null,
        available: displayTree
          ? displayTree.availableLeaves().map((node) => ({
              id: node.id,
              title: node.title,
              type: node.type,
              progress: node.progress,
              target: node.target
            }))
          : [],
        tree: this.displayTreeSnapshot(displayTree),
        missions: missionStates,
        catalog: publicCatalog,
        pendingExperimentationIntent: this.pendingExperimentationIntent(),
        inventory: {
          ...(BF.getProgressionState?.().inventory || {})
        }
      };
    }

    dispose() {
      this.enabled = false;
      global.removeEventListener("bluefox:mission-trigger", this.onMissionTrigger);
      this.catalogController?.dispose();
      this.trees.forEach((tree) => this.memory.saveTree(tree));
    }

    static create(options) {
      return new MissionManager(options);
    }
  }

  Missions.MissionManager = MissionManager;
})(window);
