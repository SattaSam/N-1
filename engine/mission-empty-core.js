(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const OriginalManager = Missions.MissionManager;

  if (!OriginalManager || OriginalManager.__bluefoxEmptyCatalogSupport) return;

  const EMPTY_STATE_VERSION = "M3-empty-catalog-v1";

  class EmptyMissionManager {
    constructor(options = {}) {
      this.engine = options.engine || null;
      this.memory = options.memory || new Missions.MissionMemory();
      this.primaryMissionId = null;
      this.activeMissionId = null;
      this.activeMissionIds = [];
      this.currentAction = null;
      this.pendingPrimaryMissionId = null;
      this.pendingPauseMissionId = null;
      this.selectionReason = "Aucune mission installée dans le catalogue CUM.";
      this.tree = null;
      this.trees = new Map();
      this.catalogController = null;
      this.enabled = true;

      // Un catalogue vide n'est plus une commande de destruction :
      // seule "Nouvelle partie" efface explicitement l'état de mission.
      this.publish();
    }

    resetLegacyMissionState() {
      const state = this.memory.state;
      state.version = Math.max(3, Number(state.version) || 0);
      state.activeMissionId = null;
      state.primaryMissionId = null;
      state.activeMissionIds = [];
      state.missionLifecycle = {};
      state.pendingActivations = {};
      state.rewardedMissions = {};
      state.processedObjectEvents = {};
      state.effectReceipts = {};
      state.missions = {};
      state.siteProgression = {};
      state.facts = {
        ...(state.facts || {}),
        missionCatalogResetAt: state.facts?.missionCatalogResetAt || Date.now(),
        missionCatalogVersion: "empty-catalog-v1"
      };
      this.memory.save();
    }

    purgeLegacyMissionPersistence() {
      try {
        global.localStorage.removeItem("bluefox_mission_memory_m0_v1");
      } catch (error) {
        console.warn("Impossible de supprimer l’ancienne mémoire de missions.", error);
      }

      try {
        const legacyKey = "bluefox_odyssey_save_v1";
        const raw = global.localStorage.getItem(legacyKey);
        if (!raw) return;
        const save = JSON.parse(raw);
        if (!save || typeof save !== "object") return;
        [
          "mission",
          "missions",
          "activeMissionId",
          "primaryMissionId",
          "activeMissionIds",
          "missionLifecycle",
          "pendingActivations",
          "rewardedMissions",
          "siteProgression"
        ].forEach((key) => delete save[key]);
        global.localStorage.setItem(legacyKey, JSON.stringify(save));
      } catch (error) {
        console.warn("Nettoyage des champs de missions de l’ancienne sauvegarde impossible.", error);
      }
    }

    definition(missionId) {
      return Missions.getDefinition?.(missionId) || null;
    }

    update() {
      return false;
    }

    startMission(missionId, options = {}) {
      if (!this.definition(missionId)) return false;
      return this.promoteToFullManager(missionId, options);
    }

    activateMission(missionId, options = {}) {
      return this.startMission(missionId, options);
    }

    resumeMission(missionId, options = {}) {
      return this.startMission(missionId, options);
    }

    setPrimaryMission() {
      return false;
    }

    suggestPrimaryMission() {
      return false;
    }

    pauseMission() {
      return false;
    }

    failMission() {
      return false;
    }

    notifyMissionEvent(type, detail = {}) {
      return detail.missionId
        ? this.startMission(detail.missionId, {
            ...detail,
            source: detail.source || type
          })
        : false;
    }

    notifyActionCompleted() {
      return false;
    }

    progressPassiveMissions() {
      return 0;
    }

    consumeObjectEvent() {
      return false;
    }

    cancelCurrentAction() {
      this.currentAction = null;
    }

    promoteToFullManager(missionId, options = {}) {
      if (!this.engine || !this.definition(missionId)) return false;

      const full = new OriginalManager({
        engine: this.engine,
        memory: this.memory,
        missionId
      });

      if (options.primary === false) {
        full.startMission(missionId, { ...options, primary: false });
      }

      this.engine.missionManager = full;
      if (BF.currentEngine) BF.currentEngine.missionManager = full;
      BF.getMissionState = () => full.getState();
      full.publish();
      return true;
    }

    publish() {
      const detail = this.getState();
      BF.missionState = detail;
      global.dispatchEvent(
        new CustomEvent("bluefox:mission-state", { detail })
      );
    }

    getState() {
      return {
        version: EMPTY_STATE_VERSION,
        emptyCatalog: true,
        primaryMissionId: null,
        activeMissionId: null,
        activeMissionIds: [],
        selectionReason: this.selectionReason,
        pendingPrimaryMissionId: null,
        pendingPrimaryMissionTitle: "",
        missionId: null,
        title: "Aucune mission active",
        description:
          "Le moteur de missions est prêt. Aucune définition CUM n’est encore installée.",
        status: "idle",
        currentAction: null,
        available: [],
        tree: null,
        missions: [],
        catalog: [],
        inventory: {
          ...(BF.getProgressionState?.().inventory || {})
        }
      };
    }

    dispose() {
      this.enabled = false;
      this.memory.save();
    }
  }

  const originalCreate = OriginalManager.create.bind(OriginalManager);

  OriginalManager.create = function createWithEmptyCatalog(options = {}) {
    const definitionCount = Object.keys(Missions.definitions || {}).length;
    if (definitionCount === 0) {
      return new EmptyMissionManager(options);
    }
    return originalCreate(options);
  };

  OriginalManager.__bluefoxEmptyCatalogSupport = true;
  Missions.EmptyMissionManager = EmptyMissionManager;

  BF.getMissionCoreState = () => Object.freeze({
    version: EMPTY_STATE_VERSION,
    emptyCatalog: Object.keys(Missions.definitions || {}).length === 0,
    definitionCount: Object.keys(Missions.definitions || {}).length
  });
})(window);
