(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const STORAGE_KEY = "bluefox_mission_memory_m0_v1";

  class MissionMemory {
    constructor(storage = global.localStorage) {
      this.storage = storage;
      this.state = this.defaultState();
      this.load();
    }

    defaultState() {
      return {
        version: 3,
        activeMissionId: "",
        primaryMissionId: "",
        activeMissionIds: [],
        missionLifecycle: {},
        pendingActivations: {},
        rewardedMissions: {},
        siteProgression: {},
        missions: {},
        facts: {},
        history: [],
        updatedAt: Date.now()
      };
    }

    load() {
      try {
        const saved = JSON.parse(this.storage.getItem(STORAGE_KEY) || "null");
        if (!saved || saved.version !== 3) {
          this.storage.removeItem(STORAGE_KEY);
          return this.state;
        }
        const { inventory: _obsoleteInventory, ...savedWithoutInventory } = saved;
        this.state = {
          ...this.defaultState(),
          ...savedWithoutInventory,
          activeMissionId: "",
          primaryMissionId: "",
          activeMissionIds: [],
          missionLifecycle: {},
          pendingActivations: {},
          missions: {},
          facts: { ...(saved.facts || {}) },
          rewardedMissions: { ...(saved.rewardedMissions || {}) },
          siteProgression: { ...(saved.siteProgression || {}) },
          history: Array.isArray(saved.history) ? saved.history.slice(-150) : []
        };
      } catch (error) {
        console.warn("Mémoire de mission illisible, réinitialisation sur une base vide.", error);
        this.storage.removeItem(STORAGE_KEY);
      }
      return this.state;
    }

    save() {
      this.state.updatedAt = Date.now();
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        return true;
      } catch (error) {
        console.warn("Sauvegarde de mission indisponible.", error);
        return false;
      }
    }

    saveTree(tree) {
      if (!tree?.id) return false;
      this.state.missions[tree.id] = tree.toJSON();
      return this.save();
    }

    restoreTree(id) {
      const data = this.state.missions[id];
      return data ? Missions.MissionTree.fromJSON(data) : null;
    }

    remember(type, detail = {}) {
      const event = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        detail: JSON.parse(JSON.stringify(detail)),
        at: Date.now()
      };
      this.state.history.push(event);
      this.state.history = this.state.history.slice(-150);
      this.save();
      return event;
    }

    setFact(key, value) {
      this.state.facts[key] = value;
      this.save();
    }

    getFact(key, fallback = null) {
      return Object.prototype.hasOwnProperty.call(this.state.facts, key)
        ? this.state.facts[key]
        : fallback;
    }

    snapshot() {
      return JSON.parse(JSON.stringify(this.state));
    }
  }

  Missions.MissionMemory = MissionMemory;
  Missions.MISSION_STORAGE_KEY = STORAGE_KEY;
})(window);
