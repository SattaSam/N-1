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
      this.primaryMissionId = this.resolveInitialMission(
        options.missionId || "shelter"
      );
      this.activeMissionId = this.primaryMissionId;
      const rememberedIds = Array.isArray(this.memory.state.activeMissionIds)
        ? this.memory.state.activeMissionIds
        : [];
      this.activeMissionIds = [...new Set(
        [this.primaryMissionId, ...rememberedIds]
          .filter((id) => this.definition(id))
      )];
      this.trees = new Map(this.activeMissionIds.map((id) => [
        id,
        this.planner.restoreOrCreate(id)
      ]));
      this.tree = this.trees.get(this.primaryMissionId);
      this.activeMissionIds.forEach((id) => this.ensureLifecycle(id, "active"));
      this.selectionReason = this.memory.state.missionLifecycle[
        this.primaryMissionId
      ]?.selectionReason || "Mission reprise depuis la sauvegarde.";
      this.pendingPrimaryMissionId = null;
      this.pendingPauseMissionId = null;
      this.lastPriorityReviewAt = 0;
      this.syncMissionSelection();
      this.currentAction = null;
      this.lastPlanAt = 0;
      this.retryAfter = 0;
      this.enabled = true;
      this.onMissionTrigger = (event) => this.notifyMissionEvent(
        event.detail?.type || "event",
        event.detail || {}
      );
      global.addEventListener("bluefox:mission-trigger", this.onMissionTrigger);
      this.memory.saveTree(this.tree);
      this.catalogController = Missions.MissionCatalogController
        ? new Missions.MissionCatalogController(this)
        : null;
      this.publish();
    }

    syncMissionSelection() {
      this.memory.state.primaryMissionId = this.primaryMissionId;
      this.memory.state.activeMissionId = this.primaryMissionId;
      this.memory.state.activeMissionIds = [...this.activeMissionIds];
      const lifecycle = this.ensureLifecycle(this.primaryMissionId, "active");
      lifecycle.selectionReason = this.selectionReason || lifecycle.selectionReason || "";
      lifecycle.updatedAt = Date.now();
    }

    definition(missionId) {
      return Missions.getDefinition?.(missionId) || Missions.definitions[missionId];
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
      let legacyMissionId = "";
      try {
        const legacy = JSON.parse(
          localStorage.getItem("bluefox_odyssey_save_v1") || "null"
        );
        legacyMissionId = legacy?.mission?.id || "";
      } catch {
        legacyMissionId = "";
      }
      const rememberedMissionId = Object.keys(
        this.memory.state.missions || {}
      ).length
        ? this.memory.state.activeMissionId
        : "";
      const candidates = [
        rememberedMissionId,
        legacyMissionId,
        fallback,
        "camp"
      ];
      const selected = candidates.find((id) =>
        this.definition(id) && id !== "foundation"
      );
      return selected || "camp";
    }

    activateMission(missionId, options = {}) {
      if (!this.definition(missionId)) return false;
      if (!this.trees.has(missionId)) {
        this.trees.set(missionId, this.planner.restoreOrCreate(missionId));
      }
      if (!this.activeMissionIds.includes(missionId)) {
        this.activeMissionIds.push(missionId);
      }
      const lifecycle = this.ensureLifecycle(missionId);
      lifecycle.status = this.trees.get(missionId).root.isComplete
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
      if (options.autoPrimaryEligible === false) {
        lifecycle.autoPrimaryEligible = false;
      }
      if (!lifecycle.activatedAt) lifecycle.activatedAt = Date.now();
      lifecycle.updatedAt = Date.now();
      delete this.memory.state.pendingActivations?.[missionId];
      const makePrimary = options.primary !== false;
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
      }
      this.memory.saveTree(this.trees.get(missionId));
      this.publish();
      return true;
    }

    startMission(missionId, options = {}) {
      if (!this.definition(missionId)) return false;
      const prerequisites = Array.isArray(options.prerequisites)
        ? options.prerequisites.filter(Boolean)
        : [];
      const missing = prerequisites.filter((id) =>
        this.ensureLifecycle(id).status !== "completed"
      );
      if (missing.length) {
        this.memory.state.pendingActivations = this.memory.state.pendingActivations || {};
        this.memory.state.pendingActivations[missionId] = {
          missionId,
          prerequisites,
          options: { ...options, prerequisites: undefined },
          requestedAt: Date.now()
        };
        const lifecycle = this.ensureLifecycle(missionId, "available");
        lifecycle.status = "available";
        lifecycle.waitingFor = missing;
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
      if (this.currentAction || this.bridge.isEngineBusy()) {
        this.pendingPrimaryMissionId = missionId;
        this.selectionReason = `Changement vers « ${this.trees.get(missionId).title} » après l’action en cours.`;
        if (publish) this.publish();
        return true;
      }
      this.primaryMissionId = missionId;
      this.activeMissionId = missionId;
      this.tree = this.trees.get(missionId);
      this.selectionReason = reason;
      this.pendingPrimaryMissionId = null;
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
      const changed = this.selectBestPrimary(performance.now());
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
      return total ? completed / total : 0;
    }

    assessMission(missionId, context) {
      const tree = this.trees.get(missionId);
      const definition = this.definition(missionId);
      const lifecycle = this.ensureLifecycle(missionId, "active");
      const action = tree?.root.isComplete ? null : this.planner.nextAction(tree, context);
      const progress = tree ? this.treeProgress(tree) : 0;
      let score = Number(definition?.priority) || 0;
      const reasons = [];
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
          score += 90;
          reasons.push("besoin prioritaire");
        }
      } else {
        score -= 120;
        reasons.push("aucune action réalisable");
      }
      if (missionId === this.primaryMissionId) score += 12;
      return { missionId, score, action, progress, reasons };
    }

    selectBestPrimary(now = performance.now(), force = false) {
      if (this.currentAction || this.bridge.isEngineBusy()) return false;
      const candidates = this.activeMissionIds
        .filter((id) => {
          const lifecycle = this.ensureLifecycle(id);
          return lifecycle.status === "active" &&
            lifecycle.autoPrimaryEligible !== false;
        })
        .map((id) => this.assessMission(id, this.bridge.context()))
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
        this.pendingPrimaryMissionId = null;
        changed = this.setPrimaryMission(missionId, false) || changed;
      }
      return changed;
    }

    reevaluatePendingActivations() {
      const pending = Object.values(this.memory.state.pendingActivations || {});
      let changed = false;
      pending.forEach((request) => {
        const ready = request.prerequisites.every((id) =>
          this.ensureLifecycle(id).status === "completed"
        );
        if (!ready) return;
        changed = this.activateMission(request.missionId, request.options || {}) || changed;
      });
      return changed;
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

    update(now) {
      if (!this.enabled) return false;
      this.applyPendingTransitions();
      if (now - this.lastPriorityReviewAt > 5000) {
        this.lastPriorityReviewAt = now;
        this.selectBestPrimary(now);
      }
      if (
        !this.tree ||
        this.tree.root.isComplete ||
        this.ensureLifecycle(this.primaryMissionId).status !== "active"
      ) return false;
      if (this.currentAction) return true;
      if (now < this.retryAfter || now - this.lastPlanAt < 1200) return false;
      if (this.bridge.isEngineBusy()) return false;

      this.lastPlanAt = now;
      const action = this.planner.nextAction(this.tree, this.bridge.context());
      if (!action) {
        this.retryAfter = now + 5000;
        return false;
      }
      if (!this.bridge.execute(action, now)) {
        this.retryAfter = now + 4000;
        return false;
      }
      this.currentAction = action;
      const node = this.tree.find(action.nodeId);
      if (node && node.status === Missions.MissionStatus.AVAILABLE) {
        node.status = Missions.MissionStatus.ACTIVE;
        if (!node.startedAt) node.startedAt = Date.now();
      }
      this.engine.callbacks.onAction(`Mission : ${action.title}.`);
      this.memory.remember("action-started", action);
      this.memory.saveTree(this.tree);
      this.publish();
      return true;
    }

    notifyActionCompleted(type, detail = {}, options = {}) {
      const passive = options.passive !== false;
      if (!this.currentAction || this.currentAction.type !== type) {
        const changed = passive ? this.progressPassiveMissions(type, detail) : 0;
        if (changed) {
          this.syncLifecycleFromTrees();
          this.reevaluatePendingActivations();
          this.catalogController?.schedule();
          this.publish();
        }
        return changed > 0;
      }
      const completedAction = this.currentAction;
      if (!this.planner.applyCompletion(this.tree, completedAction, detail)) {
        return false;
      }
      this.memory.remember(type, detail);
      this.memory.remember("action-completed", completedAction);
      this.currentAction = null;
      this.retryAfter = performance.now() + 650;
      this.memory.saveTree(this.tree);
      if (passive) {
        this.progressPassiveMissions(type, detail, {
          missionId: this.primaryMissionId,
          nodeId: completedAction.nodeId
        });
      }
      this.syncLifecycleFromTrees();
      this.catalogController?.schedule();
      this.publish();
      if (this.tree.root.isComplete) {
        this.reevaluatePendingActivations();
        this.engine.callbacks.onAction(
          `Mission accomplie : ${this.tree.title}.`
        );
        this.engine.callbacks.onStatus(
          `« ${this.tree.title} » terminée. BlueFox réévalue uniquement les projets déjà actifs.`
        );
      }
      return true;
    }

    syncLifecycleFromTrees() {
      let changed = false;
      this.trees.forEach((tree, missionId) => {
        if (!tree.root.isComplete) return;
        const lifecycle = this.ensureLifecycle(missionId);
        if (lifecycle.status !== "completed") changed = true;
        lifecycle.status = "completed";
        lifecycle.completedAt = tree.root.completedAt || Date.now();
        this.activeMissionIds = this.activeMissionIds.filter(
          (id) => id !== missionId
        );
      });
      this.syncMissionSelection();
      if (changed) this.memory.save();
    }

    cancelCurrentAction(reason = "cancelled") {
      if (!this.currentAction) return;
      this.memory.remember("action-cancelled", {
        ...this.currentAction,
        reason
      });
      this.currentAction = null;
      this.retryAfter = performance.now() + 1800;
      this.publish();
    }

    publish() {
      const detail = this.getState();
      BF.missionState = detail;
      global.dispatchEvent(new CustomEvent("bluefox:mission-state", { detail }));
    }

    getState() {
      return {
        version: "M2",
        primaryMissionId: this.primaryMissionId,
        activeMissionIds: [...this.activeMissionIds],
        selectionReason: this.selectionReason,
        pendingPrimaryMissionId: this.pendingPrimaryMissionId,
        missionId: this.tree.id,
        title: this.tree.title,
        description: this.tree.description,
        status: this.tree.root.status,
        currentAction: this.currentAction
          ? { ...this.currentAction, params: { ...this.currentAction.params } }
          : null,
        available: this.tree.availableLeaves().map((node) => ({
          id: node.id,
          title: node.title,
          type: node.type,
          progress: node.progress,
          target: node.target
        })),
        tree: this.tree.toJSON(),
        missions: [...new Set([
          this.primaryMissionId,
          ...this.activeMissionIds
        ])].map((id) => {
          const tree = this.trees.get(id);
          return {
            missionId: id,
            title: tree.title,
            description: tree.description,
            status: tree.root.status,
            lifecycleStatus: this.ensureLifecycle(id).status,
            progress: this.treeProgress(tree),
            journalIntro: this.definition(id)?.journalIntro ||
              `J’ai ouvert cette mission parce que ${this.ensureLifecycle(id).discoveryReason || "mes observations indiquent qu’elle est désormais réalisable"} Mon ambition est de la faire progresser sans négliger mes besoins ni les autres projets actifs.`,
            discoveryReason: this.ensureLifecycle(id).discoveryReason,
            isPrimary: id === this.primaryMissionId,
            tree: tree.toJSON()
          };
        }),
        catalog: Object.keys(Missions.definitions)
          .filter((id) => id !== "foundation")
          .map((id) => ({
            missionId: id,
            title: Missions.definitions[id].title,
            status: this.ensureLifecycle(id).status,
            scope: Missions.definitions[id].scope ||
              Missions.definitions[id].instanceScope || "global",
            progress: this.trees.has(id)
              ? this.treeProgress(this.trees.get(id))
              : 0,
            journalIntro: Missions.definitions[id].journalIntro ||
              `Cette mission est apparue lorsque ma progression a atteint un nouveau seuil. Je veux maintenant vérifier méthodiquement ce que ces découvertes rendent possible.`,
            discoveryReason: this.ensureLifecycle(id).discoveryReason,
            waitingFor: [...(this.ensureLifecycle(id).waitingFor || [])]
          })),
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
