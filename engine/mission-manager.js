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
      this.activeMissionId = this.resolveInitialMission(
        options.missionId || "shelter"
      );
      this.memory.state.activeMissionId = this.activeMissionId;
      this.tree = this.planner.restoreOrCreate(this.activeMissionId);
      this.currentAction = null;
      this.lastPlanAt = 0;
      this.retryAfter = 0;
      this.enabled = true;
      this.memory.saveTree(this.tree);
      this.publish();
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
        "shelter"
      ];
      const selected = candidates.find((id) =>
        Missions.definitions[id] && id !== "foundation"
      );
      return selected || "shelter";
    }

    activateMission(missionId) {
      if (!Missions.definitions[missionId]) return false;
      this.activeMissionId = missionId;
      this.memory.state.activeMissionId = missionId;
      this.tree = this.planner.restoreOrCreate(missionId);
      this.currentAction = null;
      this.retryAfter = performance.now() + 1200;
      this.memory.saveTree(this.tree);
      this.publish();
      return true;
    }

    update(now) {
      if (!this.enabled || this.tree.root.isComplete) return false;
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

    notifyActionCompleted(type, detail = {}) {
      if (!this.currentAction || this.currentAction.type !== type) return false;
      const completedAction = this.currentAction;
      if (!this.planner.applyCompletion(this.tree, completedAction, detail)) {
        return false;
      }
      this.memory.remember(type, detail);
      this.memory.remember("action-completed", completedAction);
      this.currentAction = null;
      this.retryAfter = performance.now() + 650;
      this.memory.saveTree(this.tree);
      this.publish();
      if (this.tree.root.isComplete) {
        this.engine.callbacks.onAction(
          `Mission accomplie : ${this.tree.title}.`
        );
        this.engine.callbacks.onStatus(
          `« ${this.tree.title} » terminée. BlueFox attend avant de choisir un nouveau projet.`
        );
      }
      return true;
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
        version: "M0",
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
        inventory: {
          ...(BF.getProgressionState?.().inventory || {})
        }
      };
    }

    dispose() {
      this.enabled = false;
      this.memory.saveTree(this.tree);
    }

    static create(options) {
      return new MissionManager(options);
    }
  }

  Missions.MissionManager = MissionManager;
})(window);
