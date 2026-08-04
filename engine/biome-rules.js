(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};

  const BIOMES = Object.freeze({
    default: Object.freeze({
      id: "default", budget: 34, density: 1,
      weights: Object.freeze({ rock: 0.72, strong_rock: 0.9, large_rock: 0.38, needle: 1.2, frond: 1, crystal: 0.55, fiber: 0.45, adaptive_plant: 0.3, magnetic_ore: 0.2, tree: 0.35, nature_tree: 0.32, cactus: 0.2, brouteur: 0.12, sauteur: 0.1, fun_creature: 0.12, small_creature: 0.12, patte_creature: 0.08, spore: 0.25, debris: 0.15 }),
      requiredTags: Object.freeze([]), forbiddenTags: Object.freeze([])
    }),
    forest: Object.freeze({
      id: "forest", budget: 46, density: 1.15,
      weights: Object.freeze({ tree: 2.6, nature_tree: 1.1, cactus: 0.25, frond: 1.75, fern: 2.6, fiber: 1.2, lunar_vine: 0.78, prismatic_orchid: 0.055, adaptive_plant: 0.9, lantern_mushrooms: 0.7, spore: 1.1, rock: 0.38, strong_rock: 0.72, large_rock: 0.28, crystal: 0.35, pool: 0.25, debris: 0.2, brouteur: 0.3, sauteur: 0.24, fun_creature: 0.3, small_creature: 0.32, patte_creature: 0.22 }),
      requiredTags: Object.freeze([]), forbiddenTags: Object.freeze([])
    }),
    jungle: Object.freeze({
      id: "jungle", budget: 54, density: 1.3,
      weights: Object.freeze({ tree: 2.8, nature_tree: 0.85, cactus: 0.42, frond: 1.9, fern: 3.2, fiber: 1.35, lunar_vine: 0.95, adaptive_plant: 1.25, lantern_mushrooms: 0.9, spore: 1.6, pool: 0.35, rock: 0.25, strong_rock: 0.58, large_rock: 0.22, crystal: 0.25, brouteur: 0.34, sauteur: 0.3, fun_creature: 0.35, small_creature: 0.38, patte_creature: 0.28 }),
      requiredTags: Object.freeze(["plant"]), forbiddenTags: Object.freeze([])
    }),
    swamp: Object.freeze({
      id: "swamp", budget: 42, density: 1.05,
      weights: Object.freeze({ pool: 1.8, spore: 1.8, frond: 1.25, fern: 2.75, fiber: 0.85, lunar_vine: 0.5, lantern_mushrooms: 0.85, tree: 0.65, nature_tree: 0.18, small_creature: 0.16, patte_creature: 0.12, rock: 0.18, strong_rock: 0.42, large_rock: 0.18 }),
      requiredTags: Object.freeze([]), forbiddenTags: Object.freeze([])
    }),
    ruins: Object.freeze({
      id: "ruins", budget: 48, density: 1,
      weights: Object.freeze({ debris: 2.8, stele: 0.75, tech_relic: 0.28, relay_block: 0.62, pulse_core: 0.32, memory_capsule: 0.25, logic_prism: 0.08, survey_beacon: 0.22, arch: 0.28, rock: 0.38, strong_rock: 0.82, large_rock: 0.42, needle: 0.7, crystal: 0.25, magnetic_ore: 0.25, azure_ferrite: 0.48, stellar_iridium: 0.05, frond: 0.35 }),
      requiredTags: Object.freeze([]), forbiddenTags: Object.freeze([])
    }),
    desert: Object.freeze({
      id: "desert", budget: 32, density: 0.75,
      weights: Object.freeze({ rock: 0.75, strong_rock: 1.55, large_rock: 0.72, needle: 1.7, debris: 0.75, stele: 0.22, tech_relic: 0.12, arch: 0.08, crystal: 0.35, magnetic_ore: 0.2, azure_ferrite: 0.38, eroded_monolith: 0.24, relay_block: 0.18, cactus: 0.5, brouteur: 0.14, sauteur: 0.18 }),
      requiredTags: Object.freeze([]), forbiddenTags: Object.freeze(["plant"])
    }),
    mountain: Object.freeze({
      id: "mountain", budget: 38, density: 0.85,
      weights: Object.freeze({ rock: 0.85, strong_rock: 1.9, large_rock: 0.95, eroded_monolith: 0.18, needle: 1.2, crystal: 0.65, magnetic_ore: 0.42, azure_ferrite: 0.72, resonant_basalt: 0.42, stellar_iridium: 0.05, debris: 0.4, stele: 0.18, tech_relic: 0.1, arch: 0.06, nature_tree: 0.28 }),
      requiredTags: Object.freeze([]), forbiddenTags: Object.freeze([])
    }),
    cave: Object.freeze({
      id: "cave", budget: 36, density: 0.9,
      weights: Object.freeze({ needle: 2.2, crystal: 1.2, magnetic_ore: 0.48, resonant_basalt: 0.72, thermosap_moss: 0.38, tech_relic: 0.08, spore: 1.15, pool: 0.35, rock: 0.52, strong_rock: 1.15, large_rock: 0.48 }),
      requiredTags: Object.freeze([]), forbiddenTags: Object.freeze(["tree"])
    }),
    coast: Object.freeze({
      id: "coast", budget: 36, density: 0.9,
      weights: Object.freeze({ rock: 0.58, strong_rock: 1.05, large_rock: 0.42, pool: 0.9, frond: 0.75, needle: 0.55, debris: 0.3, nature_tree: 0.16, fun_creature: 0.12, small_creature: 0.14, patte_creature: 0.1 }),
      requiredTags: Object.freeze([]), forbiddenTags: Object.freeze([])
    }),
    tundra: Object.freeze({
      id: "tundra", budget: 28, density: 0.7,
      weights: Object.freeze({ rock: 0.62, strong_rock: 1.05, large_rock: 0.45, frond: 0.8, needle: 0.9, crystal: 0.3, thermosap_moss: 0.25 }),
      requiredTags: Object.freeze([]), forbiddenTags: Object.freeze(["spore"])
    })
  });

  const aliases = Object.freeze({ woodland: "forest", rainforest: "jungle", marsh: "swamp", ruin: "ruins", mountains: "mountain" });
  const resolveId = (biome) => aliases[String(biome || "default").toLowerCase()] || String(biome || "default").toLowerCase();

  // Profils exacts du peuplement V16.24. Ils décrivent quoi générer ;
  // ObjectSpawner reste seul responsable de la création et du placement.
  const resourceFamily = (family, weight) => Object.freeze({ family, weight });
  const freezeResources = (entries) => Object.freeze(entries.map((entry) => resourceFamily(entry[0], entry[1])));

  // Profils O3 : une famille est déclarée une seule fois avec un poids relatif.
  // Le générateur conserve resourcePattern comme vue de compatibilité temporaire.
  const MAP_PROFILES = Object.freeze({
    volcanic: Object.freeze({ rocks: 18, resources: freezeResources([["crystal", 30], ["resonant_basalt", 28], ["stellar_iridium", 8], ["thermosap_moss", 20], ["magnetic_ore", 14]]), decorations: Object.freeze([Object.freeze(["strong_rock", 8]), Object.freeze(["large_rock", 4]), Object.freeze(["needle", 6]), Object.freeze(["debris", 8]), Object.freeze(["spore", 2])]) }),
    frozen: Object.freeze({ rocks: 11, resources: freezeResources([["crystal", 38], ["thermosap_moss", 22], ["fiber", 20], ["azure_ferrite", 12], ["magnetic_ore", 8]]), decorations: Object.freeze([Object.freeze(["strong_rock", 7]), Object.freeze(["large_rock", 3]), Object.freeze(["needle", 8]), Object.freeze(["frond", 3]), Object.freeze(["spore", 4])]) }),
    forest: Object.freeze({ rocks: 7, resources: freezeResources([["lunar_vine", 28], ["fiber", 24], ["adaptive_plant", 24], ["prismatic_orchid", 6], ["crystal", 18]]), decorations: Object.freeze([Object.freeze(["fern", 12]), Object.freeze(["frond", 7]), Object.freeze(["lantern_mushrooms", 5]), Object.freeze(["spore", 7]), Object.freeze(["strong_rock", 4]), Object.freeze(["nature_tree", 4]), Object.freeze(["fun_creature", 2]), Object.freeze(["small_creature", 2]), Object.freeze(["patte_creature", 1]), Object.freeze(["brouteur", 1]), Object.freeze(["sauteur", 1]), Object.freeze(["needle", 2])]) }),
    ruins: Object.freeze({ rocks: 9, resources: freezeResources([["azure_ferrite", 24], ["relay_block", 24], ["pulse_core", 18], ["memory_capsule", 16], ["crystal", 18]]), decorations: Object.freeze([Object.freeze(["debris", 9]), Object.freeze(["strong_rock", 6]), Object.freeze(["large_rock", 3]), Object.freeze(["survey_beacon", 2]), Object.freeze(["frond", 4]), Object.freeze(["spore", 4])]) }),
    aquatic: Object.freeze({ rocks: 9, resources: freezeResources([["lunar_vine", 24], ["adaptive_plant", 24], ["fiber", 22], ["prismatic_orchid", 8], ["crystal", 22]]), decorations: Object.freeze([Object.freeze(["spore", 11]), Object.freeze(["fern", 10]), Object.freeze(["frond", 7]), Object.freeze(["small_creature", 1]), Object.freeze(["patte_creature", 1]), Object.freeze(["needle", 3])]) }),
    desert: Object.freeze({ rocks: 15, resources: freezeResources([["azure_ferrite", 28], ["magnetic_ore", 22], ["relay_block", 16], ["crystal", 24], ["fiber", 10]]), decorations: Object.freeze([Object.freeze(["strong_rock", 8]), Object.freeze(["large_rock", 4]), Object.freeze(["eroded_monolith", 2]), Object.freeze(["needle", 6]), Object.freeze(["debris", 6]), Object.freeze(["cactus", 4]), Object.freeze(["brouteur", 1]), Object.freeze(["sauteur", 2]), Object.freeze(["frond", 2])]) }),
    crystalline: Object.freeze({ rocks: 12, resources: freezeResources([["crystal", 42], ["stellar_iridium", 10], ["logic_prism", 8], ["prismatic_orchid", 8], ["magnetic_ore", 32]]), decorations: Object.freeze([Object.freeze(["strong_rock", 5]), Object.freeze(["large_rock", 3]), Object.freeze(["needle", 8]), Object.freeze(["frond", 4]), Object.freeze(["debris", 4])]) }),
    alien: Object.freeze({ rocks: 10, resources: freezeResources([["crystal", 24], ["lunar_vine", 20], ["adaptive_plant", 20], ["azure_ferrite", 18], ["pulse_core", 18]]), decorations: Object.freeze([Object.freeze(["frond", 7]), Object.freeze(["spore", 6]), Object.freeze(["nature_tree", 3]), Object.freeze(["cactus", 3]), Object.freeze(["fun_creature", 2]), Object.freeze(["small_creature", 2]), Object.freeze(["patte_creature", 1]), Object.freeze(["brouteur", 1]), Object.freeze(["sauteur", 1]), Object.freeze(["needle", 5]), Object.freeze(["debris", 4])]) })
  });


  const MAX_RESOURCE_FAMILIES = 5;
  const clampRichness = (value) => Math.max(1.2, Math.min(1.75, Number(value) || 1.2));

  const RESOURCE_RICHNESS = Object.freeze({
    volcanic: Object.freeze({ family: "crystal", multiplier: 1.65 }),
    frozen: Object.freeze({ family: "crystal", multiplier: 1.35 }),
    forest: Object.freeze({ family: "fiber", multiplier: 1.55 }),
    ruins: Object.freeze({ family: "magnetic_ore", multiplier: 1.35 }),
    aquatic: Object.freeze({ family: "fiber", multiplier: 1.45 }),
    desert: Object.freeze({ family: "magnetic_ore", multiplier: 1.5 }),
    crystalline: Object.freeze({ family: "crystal", multiplier: 1.75 }),
    alien: Object.freeze({ family: "adaptive_plant", multiplier: 1.2 })
  });

  BF.BiomeRules = Object.freeze({
    data: BIOMES,
    mapProfiles: MAP_PROFILES,
    maxResourceFamilies: MAX_RESOURCE_FAMILIES,
    resourceRichness: RESOURCE_RICHNESS,
    get(biome) { return BIOMES[resolveId(biome)] || BIOMES.default; },
    exists(biome) { return Boolean(BIOMES[resolveId(biome)]); },
    getWeight(biome, type) { return this.get(biome).weights[type] || 0; },
    allows(biome, definition) {
      const rule = this.get(biome);
      if (!definition || definition.status !== "active") return false;
      if (!definition.biomes.includes("all") && !definition.biomes.includes(rule.id)) return false;
      const tags = definition.spawn?.tags || [];
      if (rule.requiredTags.length && !rule.requiredTags.some((tag) => tags.includes(tag))) return false;
      if (rule.forbiddenTags.some((tag) => tags.includes(tag) || definition.type === tag)) return false;
      return (rule.weights[definition.type] || 0) > 0;
    },
    candidates(biome) {
      if (!BF.ObjectLibrary) throw new Error("BiomeRules nécessite ObjectLibrary.");
      const rule = this.get(biome);
      return BF.ObjectLibrary.list({ status: "active" })
        .filter((definition) => this.allows(rule.id, definition))
        .map((definition) => Object.freeze({ definition, weight: (rule.weights[definition.type] || 0) * definition.spawn.rarityWeight }));
    },
    getMapProfile(profile) {
      return MAP_PROFILES[profile] || MAP_PROFILES.alien;
    },
    validateMapProfiles() {
      const errors = [];
      Object.entries(MAP_PROFILES).forEach(([profileId, profile]) => {
        const families = profile.resources.map((entry) => entry.family);
        if (families.length > MAX_RESOURCE_FAMILIES) errors.push(`${profileId}: plus de ${MAX_RESOURCE_FAMILIES} familles`);
        if (new Set(families).size !== families.length) errors.push(`${profileId}: famille dupliquée`);
        profile.resources.forEach((entry) => {
          const definition = BF.ObjectLibrary?.get(entry.family);
          if (!definition) errors.push(`${profileId}: objet inconnu ${entry.family}`);
          else if (!definition.gameplay?.collectable) errors.push(`${profileId}: ${entry.family} n'est pas collectable`);
          if (!(Number(entry.weight) > 0)) errors.push(`${profileId}: poids invalide pour ${entry.family}`);
        });
        const richness = RESOURCE_RICHNESS[profileId];
        if (!richness || richness.multiplier < 1.2 || richness.multiplier > 1.75) errors.push(`${profileId}: richesse hors limites`);
      });
      return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
    },
    getMapPopulation(definition) {
      const profileId = definition.profile || "alien";
      const profile = this.getMapProfile(profileId);
      const traitIds = new Set((definition.traits || []).map((trait) => trait.id));
      const rockCount =
        profile.rocks +
        (traitIds.has("magnetic") ? 4 : 0) +
        (traitIds.has("floating") ? 2 : 0) -
        (traitIds.has("wetland") ? 2 : 0);
      const baseResources = traitIds.has("fungal")
        ? freezeResources([["fiber", 55], ["adaptive_plant", 30], ["crystal", 15]])
        : traitIds.has("lava") || traitIds.has("glass")
          ? freezeResources([["crystal", 58], ["magnetic_ore", 27], ["fiber", 15]])
          : profile.resources;
      const resourceEntries = baseResources.slice(0, MAX_RESOURCE_FAMILIES);
      const traitDecorations = [
        ...(traitIds.has("bioluminescent") ? [["spore", 3]] : []),
        ...(traitIds.has("fungal") ? [["spore", 4]] : []),
        ...(traitIds.has("urban") ? [["debris", 5]] : []),
        ...(traitIds.has("wetland") ? [["fern", 5], ["frond", 2]] : []),
        ...(traitIds.has("glass") ? [["needle", 3]] : [])
      ];
      const decorations = definition.id === "crystal"
        ? [["needle", 9], ["frond", 7], ["debris", 3]]
        : definition.id === "jungle"
          ? [["fern", 14], ["spore", 8], ["frond", 6], ["debris", 5], ["needle", 2]]
          : [...profile.decorations.map((entry) => [...entry]), ...traitDecorations];
      const resourceFamilies = resourceEntries.map((entry) => entry.family);
      const richnessProfile = RESOURCE_RICHNESS[profileId] || RESOURCE_RICHNESS.alien;
      const richness = Object.freeze({
        family: resourceFamilies.includes(richnessProfile.family)
          ? richnessProfile.family
          : resourceFamilies[0] || null,
        multiplier: clampRichness(richnessProfile.multiplier)
      });
      const resourceWeights = Object.freeze(resourceEntries.map((entry) => Object.freeze({
        family: entry.family,
        baseWeight: Math.max(0, Number(entry.weight) || 0),
        weight: Math.max(0, Number(entry.weight) || 0) * (entry.family === richness.family ? richness.multiplier : 1)
      })));
      const resourcePattern = Object.freeze(resourceWeights.flatMap((entry) =>
        Array(Math.max(1, Math.round(entry.weight / 10))).fill(entry.family)
      ));
      return {
        profileId,
        rockCount,
        resourcePattern,
        resourceWeights,
        resourceFamilies,
        richness,
        decorations
      };
    }
  });
})(window);
