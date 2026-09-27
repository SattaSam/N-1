(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_progression_registry_v1";
  const LEGACY_STORAGE_KEY = "bluefox_odyssey_save_v1";
  const VERSION = 1;
  const MAX_HISTORY = 500;
  const AUTO_EXPEDITION_KEYS = new Set(["accumulator"]);
  const LOCKED_EXPEDITION_KEYS = new Set(["deployed_beacon"]);

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
    expeditionAllocation: {},
    campStorage: {},
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
    worldEvents: {
      sequence: 0,
      facts: {}
    },
    migrations: {
      legacyInventoryImported: false,
      legacyOfflineReconciled: false
    },
    history: [],
    transactions: {}
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
      expeditionAllocation: Object.prototype.hasOwnProperty.call(saved, "expeditionAllocation")
        ? { ...(saved.expeditionAllocation || {}) }
        : (() => {
            const inventory = { ...(saved.inventory || {}) };
            const allocation = {};
            AUTO_EXPEDITION_KEYS.forEach((key) => {
              const quantity = Math.max(0, Number(inventory[key]) || 0);
              if (quantity > 0) allocation[key] = quantity;
            });
            return allocation;
          })(),
      campStorage: { ...(saved.campStorage || {}) },
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
      worldEvents: {
        ...base.worldEvents,
        ...(saved.worldEvents || {}),
        sequence: Math.max(0, Number(saved?.worldEvents?.sequence) || 0),
        facts: { ...(saved?.worldEvents?.facts || {}) }
      },
      migrations: {
        ...base.migrations,
        ...(saved.migrations || {})
      },
      history: Array.isArray(saved.history) ? saved.history.slice(-MAX_HISTORY) : [],
      transactions: { ...(saved.transactions || {}) }
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
      this.importLegacyInventoryOnce();
      return this.state;
    }

    importLegacyInventoryOnce() {
      if (this.state.migrations.legacyInventoryImported) return false;
      this.state.migrations.legacyInventoryImported = true;

      if (Object.keys(this.state.inventory).length) {
        this.save();
        return false;
      }

      try {
        const legacy = JSON.parse(
          this.storage.getItem("bluefox_odyssey_save_v1") || "null"
        );
        const resources = legacy?.resources;
        if (resources && typeof resources === "object" && !Array.isArray(resources)) {
          Object.entries(resources).forEach(([key, amount]) => {
            const quantity = Math.max(0, Number(amount) || 0);
            if (quantity > 0) this.state.inventory[cleanKey(key)] = quantity;
          });
        }
      } catch (error) {
        console.warn("Migration de l’ancien inventaire indisponible.", error);
      }
      this.save();
      return true;
    }

    save() {
      this.state.updatedAt = Date.now();
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        if (this.state.migrations.legacyOfflineReconciled) {
          this.syncLegacyInventory();
        }
        return true;
      } catch (error) {
        console.warn("Sauvegarde du registre central indisponible.", error);
        return false;
      }
    }

    syncLegacyInventory() {
      try {
        const legacy = JSON.parse(
          this.storage.getItem(LEGACY_STORAGE_KEY) || "null"
        );
        if (!legacy || typeof legacy !== "object" || Array.isArray(legacy)) {
          return false;
        }
        this.storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({
          ...legacy,
          resources: { ...this.state.inventory },
          inventorySource: "progression-registry-v1"
        }));
        return true;
      } catch (error) {
        console.warn("Synchronisation de l’inventaire historique indisponible.", error);
        return false;
      }
    }

    completeLegacyOfflineReconciliation() {
      if (this.state.migrations.legacyOfflineReconciled) return false;
      this.state.migrations.legacyOfflineReconciled = true;
      this.save();
      this.publishChange("legacy-offline-reconciled");
      return true;
    }

    publishChange(reason, event = null) {
      global.dispatchEvent(new CustomEvent("bluefox:progression-changed", {
        detail: {
          reason,
          event: clone(event),
          snapshot: this.snapshot()
        }
      }));
    }

    increment(bucket, key, amount = 1) {
      const safeKey = cleanKey(key);
      bucket[safeKey] = (Number(bucket[safeKey]) || 0) + Math.max(0, Number(amount) || 0);
      return bucket[safeKey];
    }

    normalizeExpeditionAllocation() {
      const allocation = this.state.expeditionAllocation || (this.state.expeditionAllocation = {});
      Object.keys(allocation).forEach((key) => {
        const inventory = Math.max(0, Number(this.state.inventory[key]) || 0);
        const reserved = Math.min(inventory, Math.max(0, Number(allocation[key]) || 0));
        if (reserved > 0) allocation[key] = reserved;
        else delete allocation[key];
      });
      return allocation;
    }

    expeditionQuantity(key) {
      const safeKey = cleanKey(key);
      const inventory = Math.max(0, Number(this.state.inventory[safeKey]) || 0);
      if (LOCKED_EXPEDITION_KEYS.has(safeKey)) return inventory;
      return Math.min(
        inventory,
        Math.max(0, Number(this.state.expeditionAllocation?.[safeKey]) || 0)
      );
    }

    unallocatedInventoryQuantity(key) {
      const safeKey = cleanKey(key);
      const inventory = Math.max(0, Number(this.state.inventory[safeKey]) || 0);
      return Math.max(0, inventory - this.expeditionQuantity(safeKey));
    }

    allocateInventoryToExpedition(key, amount = 1) {
      const safeKey = cleanKey(key);
      if (LOCKED_EXPEDITION_KEYS.has(safeKey)) return 0;
      const requested = Math.max(0, Number(amount) || 0);
      const moved = Math.min(requested, this.unallocatedInventoryQuantity(safeKey));
      if (!moved) return 0;
      const allocation = this.state.expeditionAllocation || (this.state.expeditionAllocation = {});
      allocation[safeKey] = this.expeditionQuantity(safeKey) + moved;
      this.save();
      this.publishChange("expedition-allocated", { inventoryKey: safeKey, quantity: moved });
      return moved;
    }

    releaseExpeditionAllocation(key, amount = 1) {
      const safeKey = cleanKey(key);
      if (LOCKED_EXPEDITION_KEYS.has(safeKey)) return 0;
      const requested = Math.max(0, Number(amount) || 0);
      const moved = Math.min(requested, this.expeditionQuantity(safeKey));
      if (!moved) return 0;
      const remaining = this.expeditionQuantity(safeKey) - moved;
      if (remaining > 0) this.state.expeditionAllocation[safeKey] = remaining;
      else delete this.state.expeditionAllocation[safeKey];
      this.save();
      this.publishChange("expedition-released", { inventoryKey: safeKey, quantity: moved });
      return moved;
    }

    transferCampToExpedition(key, amount = 1) {
      const safeKey = cleanKey(key);
      if (LOCKED_EXPEDITION_KEYS.has(safeKey)) return 0;
      const requested = Math.max(0, Number(amount) || 0);
      const stored = Math.max(0, Number(this.state.campStorage[safeKey]) || 0);
      const capacity = BF.getInventoryCapacityState?.() || null;
      const free = Number.isFinite(Number(capacity?.capacity)) && Number.isFinite(Number(capacity?.count))
        ? Math.max(0, Number(capacity.capacity) - Number(capacity.count))
        : Infinity;
      const moved = Math.min(requested, stored, free);
      if (!moved) return 0;
      this.state.campStorage[safeKey] = stored - moved;
      this.increment(this.state.inventory, safeKey, moved);
      const allocation = this.state.expeditionAllocation || (this.state.expeditionAllocation = {});
      allocation[safeKey] = this.expeditionQuantity(safeKey) + moved;
      this.save();
      this.publishChange("expedition-withdrawn", { inventoryKey: safeKey, quantity: moved });
      return moved;
    }

    transferExpeditionToCamp(key, amount = 1) {
      const safeKey = cleanKey(key);
      if (LOCKED_EXPEDITION_KEYS.has(safeKey)) return 0;
      const requested = Math.max(0, Number(amount) || 0);
      const moved = Math.min(requested, this.expeditionQuantity(safeKey));
      if (!moved) return 0;
      const remaining = this.expeditionQuantity(safeKey) - moved;
      this.state.inventory[safeKey] = Math.max(0, Number(this.state.inventory[safeKey]) || 0) - moved;
      if (remaining > 0) this.state.expeditionAllocation[safeKey] = remaining;
      else delete this.state.expeditionAllocation[safeKey];
      this.increment(this.state.campStorage, safeKey, moved);
      this.increment(this.state.deposited, safeKey, moved);
      this.save();
      this.publishChange("expedition-deposited", { inventoryKey: safeKey, quantity: moved });
      return moved;
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
      const detail = event?.detail || {};
      const civilizationId = detail.civilizationId || event.factionId || null;
      const keys = [
        event.type,
        event.family ? `${event.type}:${event.family}` : null,
        event.objectId ? `${event.type}:object:${event.objectId}` : null,
        civilizationId ? `${event.type}:civilization:${civilizationId}` : null,
        detail.cuoType ? `${event.type}:cuo:${detail.cuoType}` : null,
        detail.cause ? `${event.type}:cause:${detail.cause}` : null,
        (detail.reaction || detail.state) ? `${event.type}:reaction:${detail.reaction || detail.state}` : null
      ].filter(Boolean);
      const scopes = [
        ["global", "global"],
        ["planets", event.planetId],
        ["maps", event.mapId],
        ["zones", event.mapId != null && event.zoneId != null ? `${event.mapId}:${event.zoneId}` : null],
        ["factions", civilizationId],
        ["missions", event.missionId]
      ];
      scopes.forEach(([scope, id]) => {
        if (scope !== "global" && id == null) return;
        const bucket = this.scopedBucket(scope, id);
        keys.forEach((key) => this.increment(bucket, key, amount));
      });
    }

    worldEventRecord(event = {}) {
      const detail = event?.detail || {};
      const lower = (value) => String(value ?? "").trim().toLowerCase();
      const clean = (value) => {
        const text = String(value ?? "").trim();
        return text || null;
      };
      return {
        type: clean(event.type),
        civilizationId: lower(detail.civilizationId || event.factionId) || null,
        factionId: lower(event.factionId || detail.factionId || detail.civilizationId) || null,
        instanceId: clean(event.instanceId),
        objectId: clean(event.objectId),
        cuoType: lower(detail.cuoType) || null,
        cause: lower(detail.cause) || null,
        reaction: lower(detail.reaction || detail.state) || null,
        state: lower(detail.state || event.state) || null,
        mapId: clean(event.mapId || detail.mapId),
        missionId: clean(event.missionId || detail.missionId),
        encounterId: detail.encounterId == null ? null : String(detail.encounterId),
        contactMode: lower(detail.contactMode) || null,
        interactionSource: lower(detail.interactionSource) || null,
        npcRole: lower(detail.npcRole) || null,
        tags: [...new Set([
          ...(Array.isArray(event.tags) ? event.tags : []),
          ...(Array.isArray(detail.tags) ? detail.tags : [])
        ].map(lower).filter(Boolean))]
      };
    }

    worldEventFingerprint(record = {}) {
      return JSON.stringify([
        record.type || "",
        record.civilizationId || "",
        record.factionId || "",
        record.instanceId || "",
        record.objectId || "",
        record.cuoType || "",
        record.cause || "",
        record.reaction || "",
        record.state || "",
        record.mapId || "",
        record.missionId || "",
        record.encounterId || "",
        record.contactMode || "",
        record.interactionSource || "",
        record.npcRole || "",
        ...(record.tags || []).slice().sort()
      ]);
    }

    rememberWorldEvent(event = {}) {
      if (!event?.type) return false;
      const world = this.state.worldEvents || (this.state.worldEvents = { sequence: 0, facts: {} });
      world.facts = world.facts || {};
      const sequence = Math.max(0, Number(world.sequence) || 0) + 1;
      world.sequence = sequence;
      const record = this.worldEventRecord(event);
      // Les compteurs numériques couvrent déjà tous les événements. L’index
      // distinct persistant reste ciblé : événements de civilisation/faction
      // ou événements explicitement rattachés à une mission. On évite ainsi
      // de dupliquer chaque objet vu dans le monde hors contexte missionnel.
      if (!record.civilizationId && !record.factionId && !record.missionId) return sequence;
      const fingerprint = this.worldEventFingerprint(record);
      const previous = world.facts[fingerprint] || null;
      world.facts[fingerprint] = {
        ...record,
        firstSequence: previous?.firstSequence || sequence,
        lastSequence: sequence,
        firstAt: previous?.firstAt || event.at || Date.now(),
        lastAt: event.at || Date.now(),
        count: Math.max(0, Number(previous?.count) || 0) + Math.max(1, Number(event.quantity) || 1)
      };
      return sequence;
    }

    worldEventCursor() {
      return Math.max(0, Number(this.state.worldEvents?.sequence) || 0);
    }

    historicalEventMatches(criteria = {}, fact = {}) {
      const lower = (value) => String(value ?? "").trim().toLowerCase();
      const list = (value) =>
        (Array.isArray(value) ? value : value == null ? [] : [value])
          .map(lower)
          .filter(Boolean);
      const exact = [
        "type", "civilizationId", "factionId", "instanceId", "objectId",
        "cuoType", "cause", "reaction", "state", "mapId", "missionId",
        "encounterId", "contactMode", "interactionSource", "npcRole"
      ];
      for (const key of exact) {
        if (criteria[key] != null && lower(criteria[key]) !== lower(fact[key])) return false;
      }
      for (const [criteriaKey, factKey] of [
        ["causeAny", "cause"], ["reactionAny", "reaction"],
        ["stateAny", "state"], ["civilizationAny", "civilizationId"]
      ]) {
        const expected = list(criteria[criteriaKey]);
        if (expected.length && !expected.includes(lower(fact[factKey]))) return false;
      }
      const tags = new Set(list(fact.tags));
      const tagsAny = list(criteria.tagsAny);
      if (tagsAny.length && !tagsAny.some((tag) => tags.has(tag))) return false;
      const tagsAll = list(criteria.tagsAll);
      if (tagsAll.length && !tagsAll.every((tag) => tags.has(tag))) return false;
      const sinceSequence = Math.max(0, Number(criteria.sinceSequence) || 0);
      if (sinceSequence && Math.max(0, Number(fact.lastSequence) || 0) <= sinceSequence) return false;
      const sinceAt = Math.max(0, Number(criteria.sinceAt) || 0);
      if (sinceAt && Math.max(0, Number(fact.lastAt) || 0) < sinceAt) return false;
      return true;
    }

    historicalEventCount(criteria = {}) {
      const matching = Object.values(this.state.worldEvents?.facts || {})
        .filter((fact) => this.historicalEventMatches(criteria, fact));
      const distinctBy = String(criteria.distinctBy || "").trim();
      if (distinctBy) {
        return new Set(
          matching
            .map((fact) => fact?.[distinctBy])
            .filter((value) => value != null && String(value) !== "")
            .map(String)
        ).size;
      }
      // Les totaux absolus sont exacts. Les fenêtres `since*` sont destinées
      // aux requêtes distinctes : un fait agrégé peut avoir commencé avant la
      // fenêtre tout en ayant reçu de nouveaux événements après celle-ci.
      if (criteria.sinceSequence != null || criteria.sinceAt != null) {
        return matching.reduce((total, fact) => total + (Number(fact.lastSequence) > Number(criteria.sinceSequence || 0) ? 1 : 0), 0);
      }
      return matching.reduce((total, fact) => total + Math.max(0, Number(fact.count) || 0), 0);
    }

    historicalCollectionDefinition(objectId) {
      const id = String(objectId || "");
      if (!id) return null;
      return (
        BF.ObjectLibrary?.getById?.(id) ||
        BF.ObjectLibrary?.get?.(id) ||
        BF.ObjectLibrary?.list?.({ status: "active" })?.find?.(
          (definition) =>
            String(definition?.id || "") === id ||
            String(definition?.type || "") === id
        ) ||
        null
      );
    }

    historicalCollectionMetadata(definition = {}) {
      const lower = (value) => String(value ?? "").trim().toLowerCase();
      return {
        objectId: lower(definition.id),
        cuoType: lower(definition.type),
        kind: lower(
          definition?.resource?.inventoryKey ||
          definition?.type
        ),
        family: lower(
          definition?.knowledge?.family ||
          definition?.category
        ),
        resourceFamily: lower(definition?.resource?.family),
        category: lower(definition?.category),
        subject: lower(
          definition?.semantic?.subject ||
          definition?.knowledge?.family ||
          definition?.category ||
          definition?.type
        ),
        tags: [...new Set([
          ...(definition?.spawn?.tags || []),
          ...(definition?.situation?.tags || [])
        ].map(lower).filter(Boolean))]
      };
    }

    historicalCollectionMatches(criteria = {}, metadata = {}) {
      const lower = (value) => String(value ?? "").trim().toLowerCase();
      const list = (value) =>
        (Array.isArray(value) ? value : value == null ? [] : [value])
          .map(lower)
          .filter(Boolean);

      for (const key of [
        "objectId", "cuoType", "kind", "family",
        "resourceFamily", "category", "subject"
      ]) {
        if (
          criteria[key] != null &&
          lower(criteria[key]) !== lower(metadata[key])
        ) return false;
      }

      const tags = new Set(list(metadata.tags));
      const tagsAny = list(criteria.tagsAny);
      if (tagsAny.length && !tagsAny.some((tag) => tags.has(tag))) return false;
      const tagsAll = list(criteria.tagsAll);
      if (tagsAll.length && !tagsAll.every((tag) => tags.has(tag))) return false;

      const exclusions = {
        excludeObjectIds: metadata.objectId,
        excludeCuoTypes: metadata.cuoType,
        excludeKinds: metadata.kind,
        excludeFamilies: metadata.family,
        excludeResourceFamilies: metadata.resourceFamily,
        excludeCategories: metadata.category,
        excludeSubjects: metadata.subject
      };
      for (const [key, actual] of Object.entries(exclusions)) {
        if (list(criteria[key]).includes(lower(actual))) return false;
      }

      const excludedTags = list(criteria.excludeTagsAny);
      return !excludedTags.some((tag) => tags.has(tag));
    }

    historicalCollectionTotal(criteria = {}) {
      const eventType = String(
        BF.ObjectEvents?.types?.RESOURCE_COLLECTED || "RESOURCE_COLLECTED"
      );
      const prefix = `${eventType}:object:`;
      let total = 0;
      Object.entries(this.state.counters.global || {}).forEach(([key, amount]) => {
        if (!String(key).startsWith(prefix)) return;
        const objectId = String(key).slice(prefix.length);
        const definition = this.historicalCollectionDefinition(objectId);
        if (!definition) return;
        const metadata = this.historicalCollectionMetadata(definition);
        if (!this.historicalCollectionMatches(criteria, metadata)) return;
        total += Math.max(0, Number(amount) || 0);
      });
      return total;
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
      const safeKey = cleanKey(key);
      const quantity = Math.max(0, Number(amount) || 0);
      const total = this.increment(this.state.inventory, safeKey, quantity);
      if (AUTO_EXPEDITION_KEYS.has(safeKey) && quantity > 0) {
        const allocation = this.state.expeditionAllocation || (this.state.expeditionAllocation = {});
        allocation[safeKey] = this.expeditionQuantity(safeKey) + quantity;
      }
      return total;
    }

    grantInventory(key, amount = 1, detail = {}) {
      const safeKey = cleanKey(key);
      const quantity = Math.max(0, Number(amount) || 0);
      if (!quantity) return 0;
      this.increment(this.state.inventory, safeKey, quantity);
      if (AUTO_EXPEDITION_KEYS.has(safeKey)) {
        const allocation = this.state.expeditionAllocation || (this.state.expeditionAllocation = {});
        allocation[safeKey] = this.expeditionQuantity(safeKey) + quantity;
      }
      this.save();
      this.publishChange("inventory-granted", {
        inventoryKey: safeKey,
        quantity,
        source: detail.source || "system",
        reason: detail.reason || null,
        missionId: detail.missionId || null,
        mapId: detail.mapId || null
      });
      return quantity;
    }

    grantCampStorage(key, amount = 1, detail = {}) {
      const safeKey = cleanKey(key);
      const quantity = Math.max(0, Number(amount) || 0);
      if (!quantity) return 0;
      this.increment(this.state.campStorage, safeKey, quantity);
      this.increment(this.state.deposited, safeKey, quantity);
      this.save();
      this.publishChange("camp-storage-granted", {
        inventoryKey: safeKey,
        quantity,
        source: detail.source || "system",
        reason: detail.reason || null,
        missionId: detail.missionId || null,
        mapId: detail.mapId || null,
        droneId: detail.droneId || null
      });
      return quantity;
    }

    consumeInventory(key, amount = 1) {
      const safeKey = cleanKey(key);
      const requested = Math.max(0, Number(amount) || 0);
      const available = Number(this.state.inventory[safeKey]) || 0;
      const removed = Math.min(available, requested);
      this.state.inventory[safeKey] = available - removed;
      this.increment(this.state.consumed, safeKey, removed);
      this.normalizeExpeditionAllocation();
      this.save();
      this.publishChange("inventory-consumed", {
        inventoryKey: safeKey,
        quantity: removed
      });
      return removed;
    }

    availableInventory(keys) {
      return [...new Set((Array.isArray(keys) ? keys : [keys]).map(cleanKey))]
        .reduce((total, key) => total +
          (Number(this.state.inventory[key]) || 0) +
          (Number(this.state.campStorage[key]) || 0), 0);
    }

    consumeInventoryPoolState(keys, amount = 1) {
      const safeKeys = [...new Set(
        (Array.isArray(keys) ? keys : [keys]).map(cleanKey)
      )];
      const requested = Math.max(0, Number(amount) || 0);
      if (!requested || this.availableInventory(safeKeys) < requested) return null;
      let remaining = requested;
      const removedByKey = {};
      [this.state.inventory, this.state.campStorage].forEach((bucket) => {
        safeKeys.forEach((key) => {
          if (!remaining) return;
          const available = Math.max(0, Number(bucket[key]) || 0);
          const removed = Math.min(available, remaining);
          bucket[key] = available - removed;
          remaining -= removed;
          removedByKey[key] = (removedByKey[key] || 0) + removed;
        });
      });
      Object.entries(removedByKey).forEach(([key, removed]) =>
        this.increment(this.state.consumed, key, removed)
      );
      this.normalizeExpeditionAllocation();
      return {
        inventoryKeys: safeKeys,
        quantity: requested,
        removedByKey
      };
    }

    consumeInventoryPool(keys, amount = 1) {
      const detail = this.consumeInventoryPoolState(keys, amount);
      if (!detail) return 0;
      this.save();
      this.publishChange("inventory-pool-consumed", detail);
      return detail.quantity;
    }

    consumeInventoryPoolOnce(transactionId, keys, amount = 1) {
      const safeId = cleanKey(transactionId);
      if (!safeId) return 0;
      if (this.state.transactions[safeId]) {
        return Number(this.state.transactions[safeId].quantity) || 0;
      }
      const detail = this.consumeInventoryPoolState(keys, amount);
      if (!detail) return 0;
      this.state.transactions[safeId] = {
        id: safeId,
        quantity: detail.quantity,
        keys: [...(Array.isArray(keys) ? keys : [keys])],
        at: Date.now()
      };
      this.save();
      this.publishChange("inventory-pool-consumed", detail);
      return detail.quantity;
    }

    depositInventoryState(key, amount = 1) {
      const safeKey = cleanKey(key);
      const requested = Math.max(0, Number(amount) || 0);
      const available = Math.max(0, Number(this.state.inventory[safeKey]) || 0);
      const moved = Math.min(this.unallocatedInventoryQuantity(safeKey), requested);
      this.state.inventory[safeKey] = available - moved;
      this.increment(this.state.campStorage, safeKey, moved);
      this.increment(this.state.deposited, safeKey, moved);
      return {
        inventoryKey: safeKey,
        quantity: moved
      };
    }

    depositInventory(key, amount = 1) {
      const detail = this.depositInventoryState(key, amount);
      this.save();
      this.publishChange("inventory-deposited", detail);
      return detail.quantity;
    }

    withdrawInventory(key, amount = 1) {
      const safeKey = cleanKey(key);
      const requested = Math.max(0, Number(amount) || 0);
      const stored = Number(this.state.campStorage[safeKey]) || 0;
      const moved = Math.min(stored, requested);
      this.state.campStorage[safeKey] = stored - moved;
      this.increment(this.state.inventory, safeKey, moved);
      this.save();
      this.publishChange("inventory-withdrawn", {
        inventoryKey: safeKey,
        quantity: moved
      });
      return moved;
    }

    depositAllInventory() {
      let moved = 0;
      const changes = Object.entries({ ...this.state.inventory }).map(([key, amount]) => {
        const detail = this.depositInventoryState(key, Number(amount) || 0);
        moved += detail.quantity;
        return detail;
      });
      if (changes.length) {
        this.save();
        changes.forEach((detail) =>
          this.publishChange("inventory-deposited", detail)
        );
      }
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
      this.rememberWorldEvent(event);

      if ([
        BF.ObjectEvents?.types.RESOURCE_COLLECTED,
        BF.ObjectEvents?.types.RESOURCE_EXTRACTED
      ].includes(event.type) && event.detail?.inventoryCredit !== false) {
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
      this.publishChange("event-consumed", event);
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
      this.state.migrations.legacyInventoryImported = true;
      this.state.migrations.legacyOfflineReconciled = true;
      this.save();
      this.publishChange("inventory-reset");
      return this.snapshot();
    }
  }

  const registry = new ProgressionRegistry();
  BF.ProgressionRegistry = ProgressionRegistry;
  BF.progression = registry;
  BF.getProgressionState = () => registry.snapshot();
  BF.getHistoricalCollectionTotal = (criteria) =>
    registry.historicalCollectionTotal(criteria);
  BF.getWorldEventCursor = () => registry.worldEventCursor();
  BF.getHistoricalEventCount = (criteria) => registry.historicalEventCount(criteria);
  BF.grantInventory = (key, amount, detail) => registry.grantInventory(key, amount, detail);
  BF.grantCampStorage = (key, amount, detail) => registry.grantCampStorage(key, amount, detail);
  BF.consumeInventory = (key, amount) => registry.consumeInventory(key, amount);
  BF.availableInventory = (keys) => registry.availableInventory(keys);
  BF.consumeInventoryPool = (keys, amount) =>
    registry.consumeInventoryPool(keys, amount);
  BF.consumeInventoryPoolOnce = (transactionId, keys, amount) =>
    registry.consumeInventoryPoolOnce(transactionId, keys, amount);
  BF.getExpeditionQuantity = (key) => registry.expeditionQuantity(key);
  BF.getUnallocatedInventoryQuantity = (key) => registry.unallocatedInventoryQuantity(key);
  BF.allocateInventoryToExpedition = (key, amount) => registry.allocateInventoryToExpedition(key, amount);
  BF.releaseExpeditionAllocation = (key, amount) => registry.releaseExpeditionAllocation(key, amount);
  BF.transferCampToExpedition = (key, amount) => registry.transferCampToExpedition(key, amount);
  BF.transferExpeditionToCamp = (key, amount) => registry.transferExpeditionToCamp(key, amount);
  BF.depositInventory = (key, amount) => registry.depositInventory(key, amount);
  BF.withdrawInventory = (key, amount) => registry.withdrawInventory(key, amount);
  BF.depositAllInventory = () => registry.depositAllInventory();
  BF.completeLegacyInventoryReconciliation = () =>
    registry.completeLegacyOfflineReconciliation();
  BF.reachProgressionMilestone = (id, detail) => registry.reachMilestone(id, detail);
  registry.connect();
})(window);
