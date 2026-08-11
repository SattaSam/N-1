(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const Manager = Missions.MissionManager;
  if (!Manager || Manager.__bibleCleanStateV19_3) return;

  const ARCHAEOLOGY = "BIBLE-V01-ARCHAEOLOGY";

  /*
   * CLEAN STATE V19.3
   * Source de vérité : MissionMemory.
   * Aucune progression n'est reconstruite depuis le monde.
   *
   * Correction AVANT construction du MissionManager :
   * - lifecycle active absent de activeMissionIds => état orphelin hérité d'un test,
   *   ramené à available ;
   * - primary/activeMissionId pointant vers un état completed ou orphelin => nettoyés.
   */
  const originalCreate = Manager.create.bind(Manager);

  Manager.create = function createBibleCleanStateV19_3(options = {}) {
    const memory = options.memory || new Missions.MissionMemory();
    const state = memory.state || {};
    const lifecycle = state.missionLifecycle || {};
    const activeIds = new Set(
      (Array.isArray(state.activeMissionIds) ? state.activeMissionIds : [])
        .filter(Boolean)
        .filter((id) => lifecycle[id]?.status === "active")
    );

    let changed = false;

    Object.entries(lifecycle).forEach(([id, entry]) => {
      if (entry?.status !== "active") return;
      if (activeIds.has(id)) return;

      // Contradiction mémoire : "active" mais absente de la liste canonique active.
      entry.status = "available";
      entry.urgency = 0;
      entry.narrativePriority = 0;
      entry.autoPrimaryEligible = false;
      entry.activatedAt = 0;
      entry.pausedAt = 0;
      entry.completedAt = 0;
      entry.waitingForBibleGate = false;
      entry.updatedAt = Date.now();
      changed = true;
    });

    const validPrimary = (id) =>
      Boolean(
        id &&
        activeIds.has(id) &&
        lifecycle[id]?.status === "active"
      );

    if (!validPrimary(state.primaryMissionId)) {
      if (state.primaryMissionId) changed = true;
      state.primaryMissionId = "";
    }
    if (!validPrimary(state.activeMissionId)) {
      if (state.activeMissionId) changed = true;
      state.activeMissionId = "";
    }

    state.activeMissionIds = [...activeIds];

    if (changed) memory.save?.();

    return originalCreate({
      ...options,
      memory
    });
  };

  /*
   * Une mission terminée ne reste jamais sélectionnée comme mission principale.
   */
  const originalSync = Manager.prototype.syncLifecycleFromTrees;
  Manager.prototype.syncLifecycleFromTrees = function syncLifecycleCleanV19_3() {
    const result = originalSync.call(this);

    if (
      this.primaryMissionId &&
      this.memory.state.missionLifecycle?.[this.primaryMissionId]?.status === "completed"
    ) {
      const finished = this.primaryMissionId;
      this.primaryMissionId = "";
      this.activeMissionId = "";
      this.tree = null;

      const nextId = (this.activeMissionIds || []).find((id) =>
        this.memory.state.missionLifecycle?.[id]?.status === "active" &&
        this.trees?.has(id)
      );

      if (nextId) {
        this.primaryMissionId = nextId;
        this.activeMissionId = nextId;
        this.tree = this.trees.get(nextId);
      }

      this.syncMissionSelection();
      this.memory.save?.();
    }

    return result;
  };

  Manager.__bibleCleanStateV19_3 = true;
})(window);
