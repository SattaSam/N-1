(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const base = BF.MapGenerator;
  if (!base?.generate || base.__bibleOverridesV20) return;

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const originalGenerate = base.generate.bind(base);

  const persist = (definition) =>
    BF.MapIntegrity?.persistGeneratedDefinition?.(definition) || false;

  const applyPrescription = (definition, prescription) => {
    if (!definition || !prescription) return definition;

    BF.MapIntegrity?.prepareDefinition?.(definition, {
      plateauCount: prescription.size ?? "random",
      biome: prescription.biome ?? "random"
    });

    (prescription.requiredMicroScenes || []).forEach((scene) => {
      BF.PersistentMicroScenes?.ensure?.(definition, {
        missionId: prescription.missionId || "BIBLE-V01-RECONNAISSANCE",
        microSceneId: scene.id,
        persistent: scene.persistent !== false,
        spawnOnce: scene.spawnOnce !== false,
        anchor: null,
        rotation: 0
      });
    });

    definition.generator ||= {};
    definition.generator.bibleMissionId = prescription.missionId || null;
    definition.generator.biblePrescriptionApplied = true;
    persist(definition);
    return definition;
  };

  const generate = (options = {}) => {
    const definition = originalGenerate(options);
    const pending = BF.__pendingBibleMapGeneration
      ? clone(BF.__pendingBibleMapGeneration)
      : null;

    return pending
      ? applyPrescription(definition, pending)
      : BF.MapIntegrity?.prepareDefinition?.(definition) || definition;
  };

  // MAP_Test uses exactly the production generator but restores its persistent
  // storage immediately afterwards. This gives a production-faithful preview
  // without polluting the player's generated-map list.
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
      biome: customization.biome ?? "random"
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
