(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const base = BF.MapGenerator;
  if (!base?.generate || base.__bibleOverridesV20) return;

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const originalGenerate = base.generate.bind(base);

  const persist = (definition) =>
    BF.MapIntegrity?.persistGeneratedDefinition?.(definition) || false;

  const compatibleBiome = (definition, prescription) => {
    if (prescription.biome && prescription.biome !== "random") {
      return prescription.biome;
    }
    const allowed = (prescription.compatibleBiomes || [])
      .filter((id) => BF.MapGenerationRules?.getBiome?.(id));
    if (!allowed.length) return "random";
    const current = definition?.generator?.biomeId;
    if (current && allowed.includes(current)) return current;
    const seed = Math.abs(
      Number(definition?.seed) ||
      Number(definition?.generator?.ordinal) ||
      0
    );
    return allowed[seed % allowed.length];
  };

  const identityPrescription = (definition, prescription) => {
    const biome = compatibleBiome(definition, prescription);
    const size = prescription.size ?? "random";
    const requestedCount = size === "random"
      ? definition.plateauCount
      : Number(size);
    const templateId =
      prescription.templateId ||
      prescription.predefinedMapId ||
      prescription.mapId ||
      null;
    const biomeChanges =
      biome !== "random" &&
      String(biome) !== String(definition.generator?.biomeId || "");
    const sizeChanges =
      Number.isFinite(requestedCount) &&
      Number(requestedCount) !== Number(definition.plateauCount);
    const templateChanges =
      Boolean(templateId) &&
      String(templateId) !== String(definition.generator?.templateId || "");

    return {
      changesIdentity: biomeChanges || sizeChanges || templateChanges,
      biome,
      size,
      templateId
    };
  };

  const resolveSelectedEntry = (entry) => {
    if (!entry || !entry.selectionFact || !entry.choices) return entry;
    const memory = BF.currentEngine?.missionManager?.memory;
    const fact = memory?.getFact?.(String(entry.selectionFact), null);
    const field = String(entry.selectionField || "value");
    const selected = String(fact?.[field] ?? fact ?? "");
    const choice = entry.choices?.[selected];
    if (!choice) return null;
    const resolved = typeof choice === "string"
      ? { ...entry, id: choice, type: choice }
      : { ...entry, ...choice };
    delete resolved.selectionFact;
    delete resolved.selectionField;
    delete resolved.choices;
    return resolved;
  };

  const applyPrescription = (definition, prescription) => {
    if (!definition || !prescription) return definition;

    const identity = identityPrescription(definition, prescription);

    // Une mission peut ajouter une MSC sans toucher au décor. La re-résolution
    // visuelle n'est déclenchée que si biome/taille/template changent réellement.
    if (identity.changesIdentity) {
      BF.MapIntegrity?.prepareDefinition?.(definition, {
        plateauCount: identity.size,
        biome: identity.biome,
        templateId: identity.templateId,
        predefinedMapId: prescription.predefinedMapId,
        mapId: prescription.mapId,
        preserveName:
          definition.generator?.nameSource === "bluefox" ||
          definition.generator?.nameSource === "custom" ||
          definition.customName === true ||
          definition.nameLocked === true
      });
    } else {
      BF.MapIntegrity?.prepareDefinition?.(definition, {
        plateauCount: definition.plateauCount,
        biome: "random"
      });
    }

    // Les enrichissements de contenu restent tardifs et indépendants
    // de l'identité visuelle de la map.
    (prescription.requiredMicroScenes || [])
      .map(resolveSelectedEntry)
      .filter(Boolean)
      .forEach((scene) => {
      BF.PersistentMicroScenes?.ensure?.(definition, {
        missionId:
          prescription.missionId ||
          "BIBLE-V01-RECONNAISSANCE",
        microSceneId: scene.id,
        instanceId: scene.instanceId || null,
        contextRole: scene.contextRole || null,
        persistent: scene.persistent !== false,
        spawnOnce: scene.spawnOnce !== false,
        anchor: null,
        rotation: 0
      });
    });

    definition.generator ||= {};
    definition.generator.bibleMissionId = prescription.missionId || null;
    definition.generator.biblePrescriptionApplied = true;
    if (Array.isArray(prescription.requiredObjects)) {
      definition.generator.requiredObjects = prescription.requiredObjects
        .map(resolveSelectedEntry)
        .filter(Boolean)
        .map((entry) => clone(entry));
    }
    persist(definition);
    return definition;
  };

  const resolvePrescription = () => {
    if (BF.__pendingBibleMapGeneration) {
      return clone(BF.__pendingBibleMapGeneration);
    }
    const resolved = BF.resolveBibleMapGenerationPrescription?.();
    return resolved ? clone(resolved) : null;
  };

  const generate = (options = {}) => {
    const prescription = resolvePrescription();
    const definition = originalGenerate(options);

    return prescription
      ? applyPrescription(definition, prescription)
      : BF.MapIntegrity?.prepareDefinition?.(definition) || definition;
  };

  const preview = (options = {}, customization = {}) => {
    const key = base.storageKey;
    const savedStorage = global.localStorage.getItem(key);
    let definition;

    try {
      definition = originalGenerate(options);
    } finally {
      if (savedStorage == null) global.localStorage.removeItem(key);
      else global.localStorage.setItem(key, savedStorage);
    }

    if (definition?.id && BF.maps?.[definition.id]) {
      delete BF.maps[definition.id];
    }

    definition = clone(definition);
    BF.MapIntegrity?.prepareDefinition?.(definition, {
      plateauCount: customization.plateauCount ?? "random",
      biome: customization.biome ?? "random",
      templateId: customization.templateId,
      predefinedMapId: customization.predefinedMapId,
      mapId: customization.mapId,
      preserveName: customization.preserveName === true
    });
    definition.preview = true;
    return definition;
  };

  BF.MapGenerator = Object.freeze({
    ...base,
    generate,
    preview,
    applyBiblePrescription: applyPrescription,
    __bibleOverridesV20: true
  });
})(window);
