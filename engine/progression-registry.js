(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_progression_registry_v1";
  const VERSION = 1;
  const MAX_HISTORY = 500;

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const cleanKey = (value, fallback = "unknown") => {
    const key = String(value ?? "").trim();
    return key || fallback;
  };

  const defaultState = () => ({
    version: VERSION,
    updatedAt: Date.now(),
    counters: {
      global: {},
      planets: {},
      maps: {},
      zones: {},
      factions: {},
      missions: {}
    },
    inventory: {},
    deposited: {},
    consumed: {},
    discoveries: {
      objects: {},
      instances: {},
      variants: {},
      maps: {},
      zones: {},
      phenomena: {}
    },
    expertise: {
      maps: {},
      planets: {},
      global: 0
    },
    milestones: {},
    history: []
  });

  const mergeState = (saved) => {
    const base = defaultState();
    if (!saved || saved.version !== VERSION) return base;
    return {
      ...base,
      ...saved,
      counters: {
        ...base.counters,
        ...(saved.counters || {})
      },
      inventory: { ...(saved.inventory || {}) },
      deposited: { ...(saved.deposited || {}) },
      consumed: { ...(saved.consumed || {}) },
      discoveries: {
        ...base.discoveries,
        ...(saved.discoveries || {})
      },
      expertise: {
        ...base.expertise,
        ...(saved.expertise || {})
      },
      milestones: { ...(saved.milestones || {}) },
      history: Array.isArray(saved.history) ? saved.history.slice(-MAX_HISTORY) : []
    };
  };

  class ProgressionRegistry {
    constructor(storage = global.localStorage) {
      this.storage = storage;
      this.state = defaultState();
      this.unsubscribe = null;
      this.load();
    }

    load() {
      try {
        this.state = mergeState(JSON.parse(this.storage.getItem(STORAGE_KEY) || "null"));
      } catch (error) {
        console.warn("Registre central de progression illisible, réinitialisation.", error);
        this.state = defaultState();
      }
      return this.state;
    }

    save() {
      this.state.updatedAt = Date.now();
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        return true;
      } catch (error) {
        console.warn("Sauvegarde du registre central indisponible.", error);
        return false;
      }
    }

    increment(bucket, key, amount = 1) {
      const safeKey = cleanKey(key);
      bucket[safeKey] = (Number(bucket[safeKey]) || 0) + Math.max(0, Number(amount) || 0);
      return bucket[safeKey];
    }

    scopedBucket(scope, id) {
      const collection = this.state.counters[scope];
      if (!collection) return this.state.counters.global;
      if (scope === "global") return collection;
      const safeId = cleanKey(id);
      collection[safeId] = collection[safeId] || {};
      return collection[safeId];
    }

    incrementScopes(event, amount) {
      const keys = [
        event.type,
        event.family ? `${event.type}:${event.family}` : null,
        event.objectId ? `${event.type}:object:${event.objectId}` : null
      ].filter(Boolean);
      const scopes = [
        ["global", "global"],
        ["planets", event.planetId],
        ["maps", event.mapId],
        ["zones", event.mapId != null && event.zoneId != null ? `${event.mapId}:${event.zoneId}` : null],
        ["factions", event.factionId],
        ["missions", event.missionId]
      ];
      scopes.forEach(([scope, id]) => {
        if (scope !== "global" && id == null) return;
        const bucket = this.scopedBucket(scope, id);
        keys.forEach((key) => this.increment(bucket, key, amount));
      });
    }

    rememberDiscovery(collection, key, event) {
      if (key == null || key === "") return false;
      const safeKey = cleanKey(key);
      if (collection[safeKey]) return false;
      collection[safeKey] = {
        at: event.at || Date.now(),
        mapId: event.mapId ?? null,
        zoneId: event.zoneId ?? null,
        objectId: event.objectId ?? null,
        instanceId: event.instanceId ?? null
      };
      return true;
    }

    addInventory(key, amount = 1) {
      return this.increment(this.state.inventory, cleanKey(key), amount);
    }

    consumeInventory(key, amount = 1) {
      const safeKey = cleanKey(key);
      const requested = Math.max(0, Number(amount) || 0);
      const available = Number(this.state.inventory[safeKey]) || 0;
      const removed = Math.min(available, requested);
      this.state.inventory[safeKey] = available - removed;
      this.increment(this.state.consumed, safeKey, removed);
      this.save();
      return removed;
    }

    depositInventory(key, amount = 1) {
      const safeKey = cleanKey(key);
      const requested = Math.max(0, Number(amount) || 0);
      const available = Number(this.state.inventory[safeKey]) || 0;
      const moved = Math.min(available, requested);
      this.state.inventory[safeKey] = available - moved;
      this.increment(this.state.deposited, safeKey, moved);
      this.save();
      return moved;
    }

    reachMilestone(id, detail = {}) {
      const safeId = cleanKey(id);
      if (this.state.milestones[safeId]) return false;
      this.state.milestones[safeId] = {
        id: safeId,
        at: Date.now(),
        ...clone(detail)
      };
      this.save();
      global.dispatchEvent(new CustomEvent("bluefox:progression-milestone", {
        detail: clone(this.state.milestones[safeId])
      }));
      return true;
    }

    consume(event) {
      if (!event?.type || !event.id) return false;
      if (this.state.history.some((entry) => entry.id === event.id)) return false;

      const quantity = Math.max(0, Number(event.quantity) || 0);
      this.incrementScopes(event, quantity || 1);

      if ([
        BF.ObjectEvents?.types.RESOURCE_COLLECTED,
        BF.ObjectEvents?.types.RESOURCE_EXTRACTED
      ].includes(event.type)) {
        this.addInventory(event.inventoryKey || event.detail?.inventoryKey || event.detail?.kind || event.family, quantity || 1);
      }

      const discoveryEvent = [
        BF.ObjectEvents?.types.OBJECT_SEEN,
        BF.ObjectEvents?.types.OBJECT_INSPECTED,
        BF.ObjectEvents?.types.OBJECT_ANALYZED,
        BF.ObjectEvents?.types.PHENOMENON_OBSERVED,
        BF.ObjectEvents?.types.KNOWLEDGE_ACQUIRED
      ].includes(event.type);

      if (discoveryEvent) {
        this.rememberDiscovery(this.state.discoveries.objects, event.objectId, event);
        this.rememberDiscovery(this.state.discoveries.instances, event.instanceId, event);
        if (event.objectId != null && event.variant != null) {
          this.rememberDiscovery(this.state.discoveries.variants, `${event.objectId}:${event.variant}`, event);
        }
        this.rememberDiscovery(this.state.discoveries.maps, event.mapId, event);
        if (event.mapId != null && event.zoneId != null) {
          this.rememberDiscovery(this.state.discoveries.zones, `${event.mapId}:${event.zoneId}`, event);
        }
        if (event.type === BF.ObjectEvents?.types.PHENOMENON_OBSERVED) {
          this.rememberDiscovery(this.state.discoveries.phenomena, event.instanceId || event.objectId, event);
        }
      }

      const expertise = Math.max(0, Number(event.progression?.mapExpertise ?? event.detail?.mapExpertise ?? (discoveryEvent ? 1 : 0)) || 0);
      if (expertise > 0) {
        if (event.mapId != null) this.increment(this.state.expertise.maps, event.mapId, expertise);
        if (event.planetId != null) this.increment(this.state.expertise.planets, event.planetId, expertise);
        this.state.expertise.global += expertise;
      }

      this.state.history.push(clone(event));
      this.state.history = this.state.history.slice(-MAX_HISTORY);
      this.save();
      global.dispatchEvent(new CustomEvent("bluefox:progression-changed", {
        detail: { event: clone(event), snapshot: this.snapshot() }
      }));
      return true;
    }

    connect() {
      if (this.unsubscribe || !BF.ObjectEvents?.subscribe) return Boolean(this.unsubscribe);
      this.unsubscribe = BF.ObjectEvents.subscribe((event) => this.consume(event));
      return true;
    }

    disconnect() {
      this.unsubscribe?.();
      this.unsubscribe = null;
    }

    snapshot() {
      return clone(this.state);
    }

    reset() {
      this.state = defaultState();
      this.save();
      return this.snapshot();
    }
  }

  const registry = new ProgressionRegistry();
  BF.ProgressionRegistry = ProgressionRegistry;
  BF.progression = registry;
  BF.getProgressionState = () => registry.snapshot();
  BF.consumeInventory = (key, amount) => registry.consumeInventory(key, amount);
  BF.depositInventory = (key, amount) => registry.depositInventory(key, amount);
  BF.reachProgressionMilestone = (id, detail) => registry.reachMilestone(id, detail);
  registry.connect();
})(window);
