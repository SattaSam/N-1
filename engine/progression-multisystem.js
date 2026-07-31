(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_progression_multisystem_v1";
  const VERSION = 1;
  const MAX_PROCESSED_IDS = 1000;
  const MAX_JOURNAL_ENTRIES = 50;

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const cleanKey = (value, fallback = "unknown") => {
    const key = String(value ?? "").trim();
    return key || fallback;
  };
  const increment = (bucket, key, amount = 1) => {
    const safeKey = cleanKey(key);
    bucket[safeKey] = (Number(bucket[safeKey]) || 0) + Math.max(0, Number(amount) || 0);
    return bucket[safeKey];
  };
  const rememberUnique = (bucket, key, detail = {}) => {
    if (key == null || key === "") return false;
    const safeKey = cleanKey(key);
    if (bucket[safeKey]) return false;
    bucket[safeKey] = { at: Date.now(), ...clone(detail) };
    return true;
  };

  const defaultState = () => ({
    version: VERSION,
    updatedAt: Date.now(),
    research: {
      domains: {},
      maps: {},
      discoveries: {}
    },
    masteries: {
      actions: {},
      families: {},
      tags: {},
      maps: {}
    },
    mapIndicators: {},
    journal: [],
    processedEventIds: []
  });

  const mergeState = (saved) => {
    const base = defaultState();
    if (!saved || saved.version !== VERSION) return base;
    return {
      ...base,
      ...saved,
      research: { ...base.research, ...(saved.research || {}) },
      masteries: { ...base.masteries, ...(saved.masteries || {}) },
      mapIndicators: { ...(saved.mapIndicators || {}) },
      journal: Array.isArray(saved.journal)
        ? saved.journal.slice(-MAX_JOURNAL_ENTRIES)
        : [],
      processedEventIds: Array.isArray(saved.processedEventIds)
        ? saved.processedEventIds.slice(-MAX_PROCESSED_IDS)
        : []
    };
  };

  const createMapIndicators = () => ({
    expertise: 0,
    collections: 0,
    inspections: 0,
    analyses: 0,
    observations: 0,
    uniqueObjects: {},
    uniqueResources: {},
    uniqueInstances: {},
    poiAnalyzed: {},
    phenomenaObserved: {},
    ruinsScanned: {},
    speciesStudied: {}
  });

  class ProgressionMultiSystem {
    constructor(storage = global.localStorage) {
      this.storage = storage;
      this.state = defaultState();
      this.processedIds = new Set();
      this.unsubscribe = null;
      this.load();
    }

    load() {
      try {
        this.state = mergeState(JSON.parse(this.storage?.getItem?.(STORAGE_KEY) || "null"));
      } catch (error) {
        console.warn("Progression multi-systèmes illisible, réinitialisation.", error);
        this.state = defaultState();
      }
      this.processedIds = new Set(this.state.processedEventIds);
      return this.state;
    }

    save() {
      this.state.updatedAt = Date.now();
      this.state.processedEventIds = [...this.processedIds].slice(-MAX_PROCESSED_IDS);
      try {
        this.storage?.setItem?.(STORAGE_KEY, JSON.stringify(this.state));
        return true;
      } catch (error) {
        console.warn("Sauvegarde de la progression multi-systèmes indisponible.", error);
        return false;
      }
    }

    mapBucket(mapId) {
      const key = cleanKey(mapId, "unassigned");
      this.state.mapIndicators[key] = this.state.mapIndicators[key] || createMapIndicators();
      return this.state.mapIndicators[key];
    }

    researchMapBucket(mapId) {
      const key = cleanKey(mapId, "unassigned");
      this.state.research.maps[key] = this.state.research.maps[key] || {};
      return this.state.research.maps[key];
    }

    masteryMapBucket(mapId) {
      const key = cleanKey(mapId, "unassigned");
      this.state.masteries.maps[key] = this.state.masteries.maps[key] || {};
      return this.state.masteries.maps[key];
    }

    applyResearch(event) {
      const quantity = Math.max(1, Number(event.quantity) || 1);
      const discoveryWeight = [
        BF.ObjectEvents?.types.OBJECT_INSPECTED,
        BF.ObjectEvents?.types.OBJECT_ANALYZED,
        BF.ObjectEvents?.types.PHENOMENON_OBSERVED,
        BF.ObjectEvents?.types.KNOWLEDGE_ACQUIRED
      ].includes(event.type) ? quantity : 0;
      if (!discoveryWeight) return [];

      const changed = [];
      const domains = [...new Set([
        ...(event.researchDomains || []),
        event.knowledgeFamily,
        event.family
      ].filter(Boolean))];
      domains.forEach((domain) => {
        increment(this.state.research.domains, domain, discoveryWeight);
        increment(this.researchMapBucket(event.mapId), domain, discoveryWeight);
        changed.push(domain);
      });
      if (event.objectId) {
        rememberUnique(this.state.research.discoveries, event.objectId, {
          mapId: event.mapId ?? null,
          eventType: event.type,
          domains
        });
      }
      return changed;
    }

    applyMasteries(event) {
      const quantity = Math.max(1, Number(event.quantity) || 1);
      increment(this.state.masteries.actions, event.type, quantity);
      if (event.family) increment(this.state.masteries.families, event.family, quantity);
      (event.tags || []).forEach((tag) => increment(this.state.masteries.tags, tag, quantity));
      const mapBucket = this.masteryMapBucket(event.mapId);
      increment(mapBucket, event.type, quantity);
      if (event.family) increment(mapBucket, `family:${event.family}`, quantity);
    }

    applyMapIndicators(event) {
      const bucket = this.mapBucket(event.mapId);
      const quantity = Math.max(1, Number(event.quantity) || 1);
      const types = BF.ObjectEvents?.types || {};
      const tags = new Set(event.tags || []);

      if (event.type === types.RESOURCE_COLLECTED) bucket.collections += quantity;
      if (event.type === types.OBJECT_INSPECTED) bucket.inspections += quantity;
      if (event.type === types.OBJECT_ANALYZED) bucket.analyses += quantity;
      if (event.type === types.PHENOMENON_OBSERVED) bucket.observations += quantity;

      const expertise = Math.max(0, Number(
        event.progression?.mapExpertise ??
        event.detail?.mapExpertise ??
        ([types.OBJECT_INSPECTED, types.OBJECT_ANALYZED, types.PHENOMENON_OBSERVED].includes(event.type) ? 1 : 0)
      ) || 0);
      bucket.expertise += expertise;

      rememberUnique(bucket.uniqueObjects, event.objectId, { family: event.family || null });
      rememberUnique(bucket.uniqueInstances, event.instanceId, { objectId: event.objectId || null });
      if (event.type === types.RESOURCE_COLLECTED) {
        rememberUnique(bucket.uniqueResources, event.inventoryKey || event.family, {
          objectId: event.objectId || null
        });
      }
      if (tags.has("poi") || tags.has("landmark")) {
        rememberUnique(bucket.poiAnalyzed, event.instanceId || event.objectId);
      }
      if (event.type === types.PHENOMENON_OBSERVED) {
        rememberUnique(bucket.phenomenaObserved, event.instanceId || event.objectId);
      }
      if (tags.has("ruin") || tags.has("technology")) {
        rememberUnique(bucket.ruinsScanned, event.instanceId || event.objectId);
      }
      if (tags.has("plant") || tags.has("fauna") || event.knowledgeFamily === "flora" || event.knowledgeFamily === "fauna") {
        rememberUnique(bucket.speciesStudied, event.objectId || event.instanceId);
      }
    }

    applyJournal(event) {
      const label = event.detail?.label || event.detail?.name || event.objectId || event.family || "objet inconnu";
      const verbs = {
        RESOURCE_COLLECTED: "Ressource collectée",
        OBJECT_SEEN: "Objet repéré",
        OBJECT_INSPECTED: "Objet inspecté",
        OBJECT_ANALYZED: "Objet analysé",
        PHENOMENON_OBSERVED: "Phénomène observé",
        KNOWLEDGE_ACQUIRED: "Connaissance acquise"
      };
      this.state.journal.push({
        id: event.id,
        at: event.at || Date.now(),
        type: event.type,
        title: verbs[event.type] || "Progression",
        text: `${verbs[event.type] || event.type} : ${label}.`,
        mapId: event.mapId ?? null,
        zoneId: event.zoneId ?? null,
        objectId: event.objectId ?? null,
        instanceId: event.instanceId ?? null
      });
      this.state.journal = this.state.journal.slice(-MAX_JOURNAL_ENTRIES);
    }

    consume(event) {
      if (!event?.id || !event?.type || this.processedIds.has(event.id)) return false;
      this.processedIds.add(event.id);

      const researchDomains = this.applyResearch(event);
      this.applyMasteries(event);
      this.applyMapIndicators(event);
      this.applyJournal(event);
      this.save();

      const detail = {
        event: clone(event),
        researchDomains,
        mapIndicators: clone(this.mapBucket(event.mapId)),
        journalEntry: clone(this.state.journal[this.state.journal.length - 1])
      };
      global.dispatchEvent(new CustomEvent("bluefox:multi-progression", { detail }));
      global.dispatchEvent(new CustomEvent("bluefox:journal-entry", {
        detail: detail.journalEntry
      }));
      return true;
    }

    connect() {
      if (this.unsubscribe || !BF.ObjectEvents?.subscribe) return Boolean(this.unsubscribe);
      this.unsubscribe = BF.ObjectEvents.subscribe((event) => this.consume(event));
      (BF.ObjectEvents.history?.() || []).forEach((event) => this.consume(event));
      return true;
    }

    disconnect() {
      this.unsubscribe?.();
      this.unsubscribe = null;
    }

    snapshot() {
      return clone(this.state);
    }

    getMapIndicators(mapId) {
      return clone(this.mapBucket(mapId));
    }

    reset() {
      this.state = defaultState();
      this.processedIds.clear();
      this.save();
      return this.snapshot();
    }
  }

  const system = new ProgressionMultiSystem();
  BF.ProgressionMultiSystem = ProgressionMultiSystem;
  BF.multiProgression = system;
  BF.getMultiProgressionState = () => system.snapshot();
  BF.getMapProgressionIndicators = (mapId) => system.getMapIndicators(mapId);
  BF.resetMultiProgression = () => system.reset();
  system.connect();
})(window);
