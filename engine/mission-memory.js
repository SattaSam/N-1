(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const STORAGE_KEY = "bluefox_mission_memory_m0_v1";
  const SAVE_INTERVAL_MS = 3000;

  class MissionMemory {
    constructor(storage = global.localStorage) {
      this.storage = storage;
      this.state = this.defaultState();
      this.dirty = false;
      this.lastSavedAt = 0;
      this.saveTimer = null;
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
        processedObjectEvents: {},
        effectReceipts: {},
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
          this.lastSavedAt = Date.now();
          return this.state;
        }
        const { inventory: _obsoleteInventory, ...savedWithoutInventory } = saved;
        this.state = {
          ...this.defaultState(),
          ...savedWithoutInventory,
          activeMissionId: saved.activeMissionId || "",
          primaryMissionId: saved.primaryMissionId || "",
          activeMissionIds: Array.isArray(saved.activeMissionIds) ? [...saved.activeMissionIds] : [],
          missionLifecycle: { ...(saved.missionLifecycle || {}) },
          pendingActivations: { ...(saved.pendingActivations || {}) },
          missions: { ...(saved.missions || {}) },
          facts: { ...(saved.facts || {}) },
          rewardedMissions: { ...(saved.rewardedMissions || {}) },
          processedObjectEvents: { ...(saved.processedObjectEvents || {}) },
          effectReceipts: { ...(saved.effectReceipts || {}) },
          siteProgression: { ...(saved.siteProgression || {}) },
          history: Array.isArray(saved.history) ? saved.history.slice(-150) : []
        };
        this.lastSavedAt = Date.now();
      } catch (error) {
        console.warn("Mémoire de mission illisible, réinitialisation sur une base vide.", error);
        this.storage.removeItem(STORAGE_KEY);
        this.lastSavedAt = Date.now();
      }
      return this.state;
    }

    markDirty() {
      this.dirty = true;
      if (this.saveTimer) return true;
      const elapsed = Date.now() - this.lastSavedAt;
      const delay = Math.max(0, SAVE_INTERVAL_MS - elapsed);
      this.saveTimer = global.setTimeout?.(() => {
        this.saveTimer = null;
        this.flush();
      }, delay);
      return true;
    }

    flush(force = false) {
      if (!force && !this.dirty) return true;
      this.state.updatedAt = Date.now();
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        this.dirty = false;
        this.lastSavedAt = Date.now();
        return true;
      } catch (error) {
        console.warn("Sauvegarde de mission indisponible.", error);
        return false;
      }
    }

    save() { return this.markDirty(); }

    saveTree(tree) {
      if (!tree?.id) return false;
      this.state.missions[tree.id] = tree.toJSON();
      return this.markDirty();
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
      this.markDirty();
      return event;
    }

    hasProcessedObjectEvent(eventId) {
      return Boolean(eventId && this.state.processedObjectEvents?.[eventId]);
    }

    markProcessedObjectEvent(eventId) {
      if (!eventId) return false;
      const entries = this.state.processedObjectEvents = this.state.processedObjectEvents || {};
      entries[eventId] = Date.now();
      const overflow = Object.entries(entries)
        .sort((left, right) => Number(left[1]) - Number(right[1]))
        .slice(0, Math.max(0, Object.keys(entries).length - 250));
      overflow.forEach(([id]) => delete entries[id]);
      return this.markDirty();
    }

    hasEffectReceipt(receiptId) {
      return Boolean(receiptId && this.state.effectReceipts?.[receiptId]);
    }

    recordEffectReceipt(receiptId, detail = {}) {
      if (!receiptId || this.hasEffectReceipt(receiptId)) return false;
      this.state.effectReceipts[receiptId] = {
        id: receiptId,
        at: Date.now(),
        ...JSON.parse(JSON.stringify(detail))
      };
      return this.markDirty();
    }

    setFact(key, value) {
      this.state.facts[key] = value;
      return this.markDirty();
    }

    getFact(key, fallback = null) {
      return Object.prototype.hasOwnProperty.call(this.state.facts, key)
        ? this.state.facts[key]
        : fallback;
    }

    snapshot() { return JSON.parse(JSON.stringify(this.state)); }

    dispose() {
      if (this.saveTimer) {
        global.clearTimeout?.(this.saveTimer);
        this.saveTimer = null;
      }
      return this.flush(true);
    }
  }

  Missions.MissionMemory = MissionMemory;
  Missions.MISSION_STORAGE_KEY = STORAGE_KEY;
})(window);
