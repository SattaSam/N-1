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

  const KNOWLEDGE_LEVELS = Object.freeze({
    OBJECT_SEEN: 1,
    OBJECT_INSPECTED: 2,
    OBJECT_ANALYZED: 3,
    PHENOMENON_OBSERVED: 3,
    KNOWLEDGE_ACQUIRED: 3,
    RESOURCE_COLLECTED: 4,
    RESOURCE_EXTRACTED: 4
  });
  const createGeographicKnowledge = () => ({
    knownSites: {}
  });

  const defaultState = () => ({
    version: VERSION,
    updatedAt: Date.now(),
    research: {
      domains: {},
      maps: {},
      discoveries: {},
      skills: {}
    },
    masteries: {
      actions: {},
      families: {},
      tags: {},
      maps: {}
    },
    mapIndicators: {},
    geographicKnowledge: createGeographicKnowledge(),
    psychology: {
      narrativeAxes: {},
      missionObsessions: {},
      missionMemories: {},
      completedMissionPsychology: {}
    },
    journalNarrative: {
      themes: {},
      mood: null,
      pastThoughts: []
    },
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
      geographicKnowledge: {
        ...base.geographicKnowledge,
        ...(saved.geographicKnowledge || {}),
        knownSites: { ...(saved.geographicKnowledge?.knownSites || {}) }
      },
      psychology: {
        ...base.psychology,
        ...(saved.psychology || {}),
        narrativeAxes: { ...(saved.psychology?.narrativeAxes || {}) },
        missionObsessions: { ...(saved.psychology?.missionObsessions || {}) },
        missionMemories: { ...(saved.psychology?.missionMemories || {}) },
        completedMissionPsychology: { ...(saved.psychology?.completedMissionPsychology || {}) }
      },
      journalNarrative: {
        ...base.journalNarrative,
        ...(saved.journalNarrative || {}),
        themes: { ...(saved.journalNarrative?.themes || {}) },
        pastThoughts: Array.isArray(saved.journalNarrative?.pastThoughts)
          ? saved.journalNarrative.pastThoughts.slice(-6)
          : []
      },
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
    extractions: 0,
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
      this.siteIndexes = null;
      this.siteById = new Map();
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
      this.rebuildSiteIndexes();
      return this.state;
    }

    createSiteIndexes() {
      return {
        map: new Map(),
        microScene: new Map(),
        resource: new Map(),
        family: new Map()
      };
    }

    indexSiteValue(indexName, key, siteId) {
      const safeKey = cleanKey(key, "");
      if (!safeKey || !siteId) return false;
      const index = this.siteIndexes[indexName];
      let bucket = index.get(safeKey);
      if (!bucket) {
        bucket = new Set();
        index.set(safeKey, bucket);
      }
      bucket.add(siteId);
      return true;
    }

    indexSite(site) {
      if (!site?.siteId) return false;
      this.siteById.set(site.siteId, site);
      this.indexSiteValue("map", site.mapId, site.siteId);
      this.indexSiteValue("microScene", site.microSceneId, site.siteId);
      Object.keys(site.resources || {}).forEach((key) =>
        this.indexSiteValue("resource", key, site.siteId)
      );
      Object.keys(site.families || {}).forEach((key) =>
        this.indexSiteValue("family", key, site.siteId)
      );
      return true;
    }

    rebuildSiteIndexes() {
      this.siteIndexes = this.createSiteIndexes();
      this.siteById = new Map();
      Object.values(this.state.geographicKnowledge?.knownSites || {})
        .forEach((site) => this.indexSite(site));
      return this.siteById.size;
    }

    siteInstanceKey(event) {
      if (event.microSceneObjectIndex != null) {
        return `slot:${Number(event.microSceneObjectIndex)}`;
      }
      return event.instanceId ? `instance:${String(event.instanceId)}` : "";
    }

    applyGeographicKnowledge(event) {
      const level = Number(KNOWLEDGE_LEVELS[event.type]) || 0;
      if (
        !level ||
        !event.mapId ||
        !event.microSceneId ||
        !event.microSceneInstanceId
      ) return null;

      const sites = this.state.geographicKnowledge.knownSites;
      const siteId = cleanKey(event.microSceneInstanceId, "");
      if (!siteId) return null;
      let site = sites[siteId];
      const isNewSite = !site;
      if (!site) {
        site = sites[siteId] = {
          siteId,
          mapId: String(event.mapId),
          microSceneId: String(event.microSceneId),
          persistentMicroSceneId: event.persistentMicroSceneId || null,
          anchor: event.microSceneAnchor ? clone(event.microSceneAnchor) : null,
          firstKnownAt: Number(event.at) || Date.now(),
          lastKnownAt: Number(event.at) || Date.now(),
          knownInstanceCount: 0,
          instances: {},
          resources: {},
          families: {},
          sources: {}
        };
      }

      site.lastKnownAt = Math.max(
        Number(site.lastKnownAt) || 0,
        Number(event.at) || Date.now()
      );
      if (!site.anchor && event.microSceneAnchor) site.anchor = clone(event.microSceneAnchor);
      if (!site.persistentMicroSceneId && event.persistentMicroSceneId) {
        site.persistentMicroSceneId = event.persistentMicroSceneId;
      }
      const source = cleanKey(event.detail?.interactionSource || "bluefox");
      site.sources ||= {};
      site.sources[source] = true;
      site.instances ||= {};
      site.resources ||= {};
      site.families ||= {};

      const instanceKey = this.siteInstanceKey(event);
      if (instanceKey) {
        let instance = site.instances[instanceKey];
        if (!instance) {
          instance = site.instances[instanceKey] = {
            key: instanceKey,
            objectId: event.objectId || null,
            firstKnownAt: Number(event.at) || Date.now(),
            lastKnownAt: Number(event.at) || Date.now(),
            knowledgeLevel: level,
            resources: {},
            families: {}
          };
          site.knownInstanceCount = (Number(site.knownInstanceCount) || 0) + 1;
        } else {
          instance.lastKnownAt = Math.max(
            Number(instance.lastKnownAt) || 0,
            Number(event.at) || Date.now()
          );
          instance.knowledgeLevel = Math.max(Number(instance.knowledgeLevel) || 0, level);
          if (!instance.objectId && event.objectId) instance.objectId = event.objectId;
          instance.resources ||= {};
          instance.families ||= {};
        }

        const resourceKeys = [...new Set([
          event.inventoryKey
        ].map((key) => cleanKey(key, "")).filter(Boolean))];
        resourceKeys.forEach((key) => {
          if (instance.resources[key]) return;
          instance.resources[key] = true;
          const resource = site.resources[key] ||= { distinctInstances: 0 };
          resource.distinctInstances = (Number(resource.distinctInstances) || 0) + 1;
          this.indexSiteValue("resource", key, siteId);
        });

        const familyKeys = [...new Set([
          event.family,
          event.knowledgeFamily,
          ...(event.researchDomains || [])
        ].map((key) => cleanKey(key, "")).filter(Boolean))];
        familyKeys.forEach((key) => {
          if (instance.families[key]) return;
          instance.families[key] = true;
          const family = site.families[key] ||= { distinctInstances: 0 };
          family.distinctInstances = (Number(family.distinctInstances) || 0) + 1;
          this.indexSiteValue("family", key, siteId);
        });
      }

      if (isNewSite) this.indexSite(site);
      return site;
    }

    candidateSiteIds(criteria = {}) {
      if (criteria.siteId) {
        return this.siteById.has(String(criteria.siteId))
          ? new Set([String(criteria.siteId)])
          : new Set();
      }
      const requested = [
        ["map", criteria.mapId],
        ["microScene", criteria.microSceneId],
        ["resource", criteria.resource],
        ["family", criteria.family]
      ].filter(([, value]) => value != null && String(value).trim());
      if (!requested.length) return new Set(this.siteById.keys());

      const sets = requested.map(([indexName, value]) =>
        this.siteIndexes[indexName].get(String(value).trim()) || new Set()
      ).sort((left, right) => left.size - right.size);
      if (!sets.length || sets[0].size === 0) return new Set();
      const result = new Set(sets[0]);
      for (let index = 1; index < sets.length; index += 1) {
        for (const siteId of [...result]) {
          if (!sets[index].has(siteId)) result.delete(siteId);
        }
      }
      return result;
    }

    getKnownSites(criteria = {}) {
      return [...this.candidateSiteIds(criteria)]
        .map((siteId) => this.siteById.get(siteId))
        .filter(Boolean)
        .sort((left, right) =>
          (Number(right.knownInstanceCount) || 0) -
          (Number(left.knownInstanceCount) || 0) ||
          (Number(right.lastKnownAt) || 0) - (Number(left.lastKnownAt) || 0)
        )
        .map(clone);
    }

    getKnownSite(siteId) {
      const site = this.siteById.get(String(siteId || ""));
      return site ? clone(site) : null;
    }

    getGeographicKnowledgeState() {
      return clone(this.state.geographicKnowledge || createGeographicKnowledge());
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
      if (event.type === types.RESOURCE_EXTRACTED) bucket.extractions += quantity;
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
      if ([types.RESOURCE_COLLECTED, types.RESOURCE_EXTRACTED].includes(event.type)) {
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
        RESOURCE_EXTRACTED: "Ressource extraite",
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

    addJournalEntry(entry) {
      if (!entry?.id || this.state.journal.some((item) => item.id === entry.id)) {
        return false;
      }
      const normalized = {
        id: cleanKey(entry.id),
        at: Number(entry.at) || Date.now(),
        type: entry.type || "progression",
        title: entry.title || "Progression",
        text: entry.text || "",
        mapId: entry.mapId ?? null,
        zoneId: entry.zoneId ?? null,
        important: Boolean(entry.important)
      };
      this.state.journal.push(normalized);
      this.state.journal = this.state.journal.slice(-MAX_JOURNAL_ENTRIES);
      this.save();
      global.dispatchEvent(new CustomEvent("bluefox:journal-entry", {
        detail: clone(normalized)
      }));
      return true;
    }

    consolidateJournalNarrative(candidate = {}) {
      const narrative = this.state.journalNarrative = this.state.journalNarrative || {
        themes: {},
        mood: null,
        pastThoughts: []
      };
      narrative.themes = narrative.themes || {};
      narrative.pastThoughts = Array.isArray(narrative.pastThoughts)
        ? narrative.pastThoughts.slice(-6)
        : [];

      const incomingThemes = Array.isArray(candidate.themes) ? candidate.themes : [];
      incomingThemes.forEach((theme) => {
        if (!theme?.id || !theme?.text) return;
        const id = cleanKey(theme.id, "");
        if (!id) return;
        const previous = narrative.themes[id];
        const metrics = theme.metrics || {};
        const previousMetrics = previous?.metrics || {};
        const eventDelta = Math.max(0, Number(metrics.events) - Number(previousMetrics.events || 0));
        const scoreDelta = Math.max(0, Number(metrics.score) - Number(previousMetrics.score || 0));
        const subjectDelta = Math.max(0, Number(metrics.subjects) - Number(previousMetrics.subjects || 0));
        const missionDelta = Math.max(0, Number(metrics.missions) - Number(previousMetrics.missions || 0));
        const psychologicalChanged = String(theme.psychologySignature || "") !==
          String(previous?.psychologySignature || "");
        const significant = !previous || eventDelta >= 3 || scoreDelta >= 3 ||
          subjectDelta >= 2 || missionDelta >= 1 || psychologicalChanged;
        if (!significant) return;
        narrative.themes[id] = {
          id,
          label: theme.label || id,
          text: theme.text,
          metrics: clone(metrics),
          psychologySignature: String(theme.psychologySignature || ""),
          updatedAt: Date.now()
        };
      });

      const mood = candidate.mood?.key ? {
        key: String(candidate.mood.key),
        label: String(candidate.mood.label || candidate.mood.key),
        text: String(candidate.mood.text || ""),
        at: Date.now()
      } : null;
      if (mood) {
        const previousMood = narrative.mood;
        if (previousMood?.key && previousMood.key !== mood.key) {
          narrative.pastThoughts.push({
            key: previousMood.key,
            label: previousMood.label,
            text: previousMood.text,
            at: Number(previousMood.at) || Date.now()
          });
          narrative.pastThoughts = narrative.pastThoughts.slice(-6);
        }
        if (!previousMood || previousMood.key !== mood.key || previousMood.text !== mood.text) {
          narrative.mood = mood;
        }
      }

      this.save();
      return clone(narrative);
    }

    getJournalNarrative() {
      return clone(this.state.journalNarrative || { themes: {}, mood: null, pastThoughts: [] });
    }

    narrativeAxisScore(axis) {
      const key = cleanKey(axis, "");
      return key ? Number(this.state.psychology?.narrativeAxes?.[key]) || 0 : 0;
    }

    missionObsessionPressure(missionId) {
      const key = cleanKey(missionId, "");
      return key ? Number(this.state.psychology?.missionObsessions?.[key]?.pressure) || 0 : 0;
    }

    memoryScoreForContext(context = {}) {
      const missionId = cleanKey(context.missionId, "");
      const narrativeAxis = cleanKey(context.narrativeAxis, "");
      const memories = Object.values(this.state.psychology?.missionMemories || {});
      let score = 0;
      memories.forEach((memory) => {
        if (!memory) return;
        const sameMission = missionId && cleanKey(memory.missionId, "") === missionId;
        const sameAxis = narrativeAxis && cleanKey(memory.narrativeAxis, "") === narrativeAxis;
        if (!sameMission && !sameAxis) return;
        const weight = Math.max(0, Math.min(100, Number(memory.scoreTrauma) || 0));
        if (memory.valence === "positive") score += weight;
        if (memory.valence === "negative") score -= weight;
      });
      return Math.max(-100, Math.min(100, score));
    }

    deferObsessiveMission(missionId, intensity = 1, now = Date.now()) {
      const key = cleanKey(missionId, "");
      if (!key) return 0;
      const level = Math.max(1, Math.min(5, Number(intensity) || 1));
      const bucket = this.state.psychology.missionObsessions;
      const previous = bucket[key] || { pressure: 0, lastDeferredAt: 0, deferrals: 0 };
      if (now - Number(previous.lastDeferredAt || 0) < 4500) return Number(previous.pressure) || 0;
      const increments = { 1: 1.5, 2: 2.5, 3: 4, 4: 6, 5: 9 };
      bucket[key] = {
        pressure: Math.min(240, (Number(previous.pressure) || 0) + increments[level]),
        lastDeferredAt: now,
        deferrals: (Number(previous.deferrals) || 0) + 1,
        intensity: level
      };
      this.save();
      return bucket[key].pressure;
    }

    completeMissionPsychology(mission) {
      if (!mission?.id) return false;
      const psychology = this.state.psychology;
      if (psychology.completedMissionPsychology[mission.id]) return false;

      const reinforcement = mission.reinforcesNarrativeAxis;
      if (reinforcement?.axis) {
        const axis = cleanKey(reinforcement.axis);
        const weight = Number.isFinite(Number(reinforcement.weight))
          ? Number(reinforcement.weight)
          : 1;
        psychology.narrativeAxes[axis] =
          (Number(psychology.narrativeAxes[axis]) || 0) + weight;
      }

      if (mission.souvenir === true) {
        const valence = mission.memoryValence === "negative"
          ? "negative"
          : mission.memoryValence === "positive" ? "positive" : "neutral";
        const scoreTrauma = Math.max(0, Math.min(100, Number(mission.scoreTrauma) || 0));
        const narrativeAxis = cleanKey(
          mission.narrativeAxis || reinforcement?.axis,
          ""
        );
        psychology.missionMemories[mission.id] = {
          missionId: mission.id,
          acquiredAt: Date.now(),
          valence,
          scoreTrauma,
          narrativeAxis: narrativeAxis || null
        };
      }

      delete psychology.missionObsessions[mission.id];
      psychology.completedMissionPsychology[mission.id] = Date.now();
      this.save();
      return true;
    }

    unlockResearchSkill(skill) {
      if (!skill?.id) return false;
      this.state.research.skills = this.state.research.skills || {};
      const id = cleanKey(skill.id);
      if (this.state.research.skills[id]) return false;
      this.state.research.skills[id] = {
        id,
        title: skill.title || id,
        unlockedAt: Number(skill.unlockedAt) || Date.now(),
        mapId: skill.mapId ?? null
      };
      this.save();
      global.dispatchEvent(new CustomEvent("bluefox:research-skill-unlocked", {
        detail: clone(this.state.research.skills[id])
      }));
      return true;
    }

    consume(event) {
      if (!event?.id || !event?.type || this.processedIds.has(event.id)) return false;
      this.processedIds.add(event.id);

      const researchDomains = this.applyResearch(event);
      this.applyMasteries(event);
      this.applyMapIndicators(event);
      this.applyGeographicKnowledge(event);
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

    snapshot(options = {}) {
      const snapshot = clone(this.state);
      if (options.includeGeographicKnowledge !== true) {
        delete snapshot.geographicKnowledge;
      }
      return snapshot;
    }

    getMapIndicators(mapId) {
      return clone(this.mapBucket(mapId));
    }

    reset() {
      this.state = defaultState();
      this.processedIds.clear();
      this.rebuildSiteIndexes();
      this.save();
      global.dispatchEvent(new CustomEvent("bluefox:journal-reset", {
        detail: BF.getJournalState?.() || { entries: [] }
      }));
      return this.snapshot();
    }
  }

  const system = new ProgressionMultiSystem();
  BF.ProgressionMultiSystem = ProgressionMultiSystem;
  BF.multiProgression = system;
  BF.getMultiProgressionState = () => system.snapshot();
  BF.getJournalState = () => {
    const snapshot = system.snapshot();
    const entries = (snapshot.journal || [])
      .slice(-MAX_JOURNAL_ENTRIES)
      .reverse()
      .map((entry) => ({
        ...entry,
        displayTime: new Date(Number(entry.at) || Date.now()).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit"
        })
      }));
    return {
      entries,
      count: entries.length,
      limit: MAX_JOURNAL_ENTRIES
    };
  };
  BF.getJournalNarrativeState = () => system.getJournalNarrative();
  BF.consolidateJournalNarrative = (candidate) => system.consolidateJournalNarrative(candidate);
  BF.getMapProgressionIndicators = (mapId) => system.getMapIndicators(mapId);
  BF.getKnownSites = (criteria) => system.getKnownSites(criteria);
  BF.getKnownSite = (siteId) => system.getKnownSite(siteId);
  BF.getGeographicKnowledgeState = () => system.getGeographicKnowledgeState();
  BF.getNarrativeAxisScore = (axis) => system.narrativeAxisScore(axis);
  BF.getMissionObsessionPressure = (missionId) => system.missionObsessionPressure(missionId);
  BF.getPsychologicalMemoryScore = (context) => system.memoryScoreForContext(context);
  BF.deferObsessiveMission = (missionId, intensity, now) =>
    system.deferObsessiveMission(missionId, intensity, now);
  BF.completeMissionPsychology = (mission) => system.completeMissionPsychology(mission);
  BF.addJournalEntry = (entry) => system.addJournalEntry(entry);
  BF.unlockResearchSkill = (skill) => system.unlockResearchSkill(skill);
  BF.resetMultiProgression = () => system.reset();
  system.connect();
})(window);
