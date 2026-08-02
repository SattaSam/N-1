(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const PRIMARY_MAP_ID = "crystal";
  const SESSION_KEY = "bluefox_tutorial_test_session_v1";
  const TEST_SOURCE = "tutorial-test-bridge";
  const STAGES = Object.freeze({
    1: Object.freeze({ missionId: "camp@crystal", inventory: { wood: 10 } }),
    2: Object.freeze({ missionId: "shelter@crystal", inventory: { wood: 100, fiber: 100 }, studies: { kind: "plant", count: 100 } }),
    3: Object.freeze({ missionId: "base@crystal", inventory: { fiber: 1000, mineral: 1000 }, studies: { kind: "rock", count: 100 } })
  });

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const bluefoxStorage = () => {
    const state = {};
    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index);
      if (key?.startsWith("bluefox_")) state[key] = global.localStorage.getItem(key);
    }
    return state;
  };
  const readSession = () => {
    try {
      return JSON.parse(global.sessionStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  };
  const writeSession = (session) => {
    global.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  };
  const engine = () => BF.currentEngine || null;
  const manager = () => engine()?.missionManager || null;
  const siteStage = () => Number(
    manager()?.memory?.state?.siteProgression?.[PRIMARY_MAP_ID]?.stage
  ) || 0;
  const ensureReady = () => {
    if (!engine() || !manager() || !BF.ObjectEvents || !BF.progression) {
      throw new Error("Le moteur BlueFox n’est pas encore prêt.");
    }
    if (engine().currentMapId !== PRIMARY_MAP_ID) {
      throw new Error("Le test tutoriel fonctionne uniquement sur la map crystal.");
    }
  };
  const available = (keys) => BF.availableInventory?.(keys) || 0;
  const mineralKeys = () => {
    const keys = new Set(["crystal", "magnetic_ore"]);
    BF.ObjectLibrary?.list?.({ status: "active" }).forEach((definition) => {
      const tags = new Set(definition.spawn?.tags || []);
      const descriptor = `${definition.resource?.family || ""} ${definition.resource?.inventoryKey || ""}`.toLowerCase();
      if (
        definition.gameplay?.collectable === true &&
        definition.resource?.inventoryKey &&
        (tags.has("mineral") || tags.has("crystal") || /mineral|minerai|crystal|cristal|ore/.test(descriptor))
      ) keys.add(definition.resource.inventoryKey);
    });
    return [...keys];
  };
  const virtualSource = (type, instanceId) => {
    const definition = BF.ObjectLibrary?.get?.(type);
    if (!definition) throw new Error(`Objet CUO indisponible : ${type}.`);
    return {
      userData: {
        functional: definition,
        catalogId: definition.id,
        libraryType: definition.type,
        instanceId,
        variant: 0
      }
    };
  };
  const emit = (type, source, detail) => BF.ObjectEvents.emit(type, source, {
    mapId: PRIMARY_MAP_ID,
    zoneId: 0,
    source: TEST_SOURCE,
    ...detail
  });
  const addResource = (inventoryKey, target, type) => {
    const keys = inventoryKey === "mineral" ? mineralKeys() : [inventoryKey];
    const missing = Math.max(0, target - available(keys));
    if (!missing) return 0;
    const selectedKey = inventoryKey === "mineral" ? "crystal" : inventoryKey;
    emit(
      BF.ObjectEvents.types.RESOURCE_COLLECTED,
      virtualSource(type, `tutorial-resource-${inventoryKey}-${Date.now()}`),
      { inventoryKey: selectedKey, kind: selectedKey, quantity: missing }
    );
    return missing;
  };
  const isWoodDefinition = (definition) => {
    const tags = new Set(definition?.spawn?.tags || []);
    const descriptor = `${definition?.id || ""} ${definition?.type || ""} ${definition?.resource?.family || ""} ${definition?.resource?.inventoryKey || ""}`.toLowerCase();
    return tags.has("wood") || tags.has("tree") ||
      /tree|arbre|bush|buisson|branch|branche|wood/.test(descriptor);
  };
  const studyWoodSpecimens = () => {
    const history = BF.getProgressionState?.().history || [];
    const studied = new Set(history
      .filter((event) => event.mapId === PRIMARY_MAP_ID && [
        "PHENOMENON_OBSERVED", "OBJECT_INSPECTED", "OBJECT_ANALYZED"
      ].includes(event.type))
      .map((event) => event.instanceId || event.objectId));
    let emitted = 0;
    (engine().currentMap?.interactables || []).forEach((object) => {
      const data = object?.userData || object?.parent?.userData || {};
      const definition = data.functional || object?.parent?.userData?.functional;
      const instanceId = data.instanceId || object?.parent?.userData?.instanceId || definition?.id;
      if (!definition || !instanceId || !isWoodDefinition(definition) || studied.has(instanceId)) return;
      emit(BF.ObjectEvents.types.OBJECT_INSPECTED, object, {
        interactionMode: "inspect",
        kind: definition.resource?.inventoryKey || definition.type,
        quantity: 1
      });
      emitted += 1;
    });
    return emitted;
  };
  const studySynthetic = (kind, count) => {
    const type = kind === "plant" ? "bush" : "rock";
    const eventType = BF.ObjectEvents.types.OBJECT_ANALYZED;
    const history = BF.getProgressionState?.().history || [];
    const definition = BF.ObjectLibrary?.get?.(type);
    const matches = (event) => {
      if (event.mapId !== PRIMARY_MAP_ID || ![
        "PHENOMENON_OBSERVED", "OBJECT_INSPECTED", "OBJECT_ANALYZED"
      ].includes(event.type)) return false;
      const tags = new Set(event.tags || []);
      const descriptor = `${event.objectId || ""} ${event.family || ""} ${event.inventoryKey || ""}`.toLowerCase();
      return kind === "plant"
        ? tags.has("plant") || tags.has("tree") || /flora|plant|tree|arbre|bush|buisson|branch|branche|fiber|fibre|frond|cactus/.test(descriptor)
        : tags.has("mineral") || tags.has("rock") || tags.has("crystal") || /geolog|rock|roche|mineral|minerai|crystal|cristal|ore/.test(descriptor);
    };
    const missing = Math.max(0, count - history.filter(matches).length);
    if (!definition) throw new Error(`Objet CUO indisponible : ${type}.`);
    for (let index = 0; index < missing; index += 1) {
      emit(eventType, virtualSource(type, `tutorial-${kind}-${Date.now()}-${index}`), {
        interactionMode: "analyze",
        kind: type,
        quantity: 1
      });
    }
    return missing;
  };
  const waitForStage = (target, timeoutMs = 6000) => new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (siteStage() >= target) return resolve(api.status());
      if (Date.now() - startedAt >= timeoutMs) {
        return reject(new Error(`Le moteur n’a pas validé l’étape ${target} dans le délai prévu.`));
      }
      global.setTimeout(check, 50);
    };
    check();
  });
  const missionSummary = () => {
    const state = BF.getMissionState?.() || {};
    return (state.missions || []).filter((entry) =>
      /^(camp|shelter|base)@crystal$/.test(entry.missionId)
    ).map((entry) => ({
      missionId: entry.missionId,
      status: entry.lifecycleStatus || entry.status,
      progress: entry.progress
    }));
  };

  const api = Object.freeze({
    start() {
      ensureReady();
      const existing = readSession();
      if (existing?.active) return this.status();
      writeSession({
        version: 1,
        active: true,
        startedAt: Date.now(),
        mapId: engine().currentMapId,
        initialStage: siteStage(),
        localStorage: bluefoxStorage()
      });
      return this.status();
    },

    status() {
      const session = readSession();
      const progression = BF.getProgressionState?.() || {};
      return Object.freeze({
        ready: Boolean(engine() && manager() && BF.ObjectEvents && BF.progression),
        active: Boolean(session?.active),
        mapId: engine()?.currentMapId || null,
        stage: siteStage(),
        inventory: clone(progression.inventory || {}),
        campStorage: clone(progression.campStorage || {}),
        missions: missionSummary(),
        startedAt: session?.startedAt || null,
        initialStage: session?.initialStage ?? null
      });
    },

    async completeStage(stage) {
      ensureReady();
      if (!readSession()?.active) this.start();
      const target = Math.max(1, Math.min(3, Number(stage) || 0));
      if (target !== Number(stage)) throw new Error("L’étape doit être 1, 2 ou 3.");
      const current = siteStage();
      if (current >= target) return this.status();
      if (target !== current + 1) {
        throw new Error(`Validez d’abord l’étape ${current + 1}.`);
      }
      const config = STAGES[target];
      if (config.missionId !== `camp@crystal` && !manager().definition(config.missionId)) {
        throw new Error(`Mission indisponible : ${config.missionId}.`);
      }
      if (config.inventory.wood) addResource("wood", config.inventory.wood, "tree_fallen");
      if (config.inventory.fiber) addResource("fiber", config.inventory.fiber, "fiber");
      if (config.inventory.mineral) addResource("mineral", config.inventory.mineral, "crystal");
      if (target === 1) studyWoodSpecimens();
      if (config.studies) studySynthetic(config.studies.kind, config.studies.count);
      return waitForStage(target);
    },

    reset() {
      const session = readSession();
      if (!session?.active || !session.localStorage) return false;
      const keys = [];
      for (let index = 0; index < global.localStorage.length; index += 1) {
        const key = global.localStorage.key(index);
        if (key?.startsWith("bluefox_")) keys.push(key);
      }
      keys.forEach((key) => global.localStorage.removeItem(key));
      Object.entries(session.localStorage).forEach(([key, value]) => {
        if (value != null) global.localStorage.setItem(key, String(value));
      });
      global.sessionStorage.removeItem(SESSION_KEY);
      global.location.reload();
      return true;
    }
  });

  BF.TutorialTest = api;
})(window);
