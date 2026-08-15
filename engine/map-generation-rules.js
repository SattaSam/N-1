(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const freeze = Object.freeze;
  const record = (value) => freeze(value);
  const list = (value) => freeze(value.map((entry) =>
    Array.isArray(entry) ? freeze(entry) : record(entry)
  ));

  const VERSION = 1;
  const MAX_RESOURCE_FAMILIES = 5;

  // IDs du générateur -> profils actuellement compris par BiomeRules.
  // Cette traduction permet d'ajouter le générateur sans modifier d'un bloc
  // le peuplement historique des cartes déjà sauvegardées.
  const LEGACY_PROFILE_ALIASES = record({
    grassland: "forest",
    forest: "forest",
    rocky: "desert",
    aquatic: "aquatic",
    desert: "desert",
    crystalline: "crystalline",
    fungal: "forest",
    ruins: "ruins",
    frozen: "frozen",
    volcanic: "volcanic",
    magnetic: "crystalline",
    electrical: "crystalline",
    city: "ruins",
    floating_islands: "alien",
    curiosity: "alien"
  });

  const BIOME_TIERS = record({
    common: record({ common: 75, uncommon: 22, rare: 3, density: 1 }),
    uncommon: record({ common: 55, uncommon: 35, rare: 10, density: 0.9 }),
    rare: record({ common: 25, uncommon: 45, rare: 30, density: 0.65 }),
    curiosity: record({ common: 15, uncommon: 35, rare: 50, density: 0.45 })
  });

  const biome = (id, label, weight, tier, technologyMultiplier, resources, microScenes) => record({
    id, label, weight, tier, technologyMultiplier,
    resources: record(resources),
    microScenes: list(microScenes)
  });

  // Total volontairement égal à 100 : le poids est directement lisible
  // comme une fréquence de base avant application des affinités voisines.
  const BIOMES = list([
    biome("grassland", "Prairie / Savane", 16, "common", 0.2,
      { common: ["fiber", "adaptive_plant"], uncommon: ["rock", "crystal"], rare: ["rare_biomass"] },
      ["grove", "pond", "fiber_circle", "observation_rocks"]),
    biome("forest", "Forêt", 16, "common", 0.2,
      { common: ["fiber", "adaptive_plant", "spore"], uncommon: ["crystal"], rare: ["rare_biomass"] },
      ["clearing", "giant_roots", "luminous_forest", "fungal_colony", "basin", "nocturnal_den", "predator_flora"]),
    biome("rocky", "Rocheux / Steppe", 16, "common", 0.2,
      { common: ["rock", "crystal"], uncommon: ["magnetic_ore"], rare: ["dense_ore"] },
      ["scree", "mineral_vein", "needles", "cavity", "rocky_ruin"]),
    biome("aquatic", "Marais / Aquatique", 8, "uncommon", 0.45,
      { common: ["fiber", "adaptive_plant", "spore"], uncommon: ["crystal"], rare: ["aquatic_mineral"] },
      ["luminous_pool", "plant_island", "aquatic_flora", "submerged_ruin"]),
    biome("desert", "Désert", 7, "uncommon", 0.45,
      { common: ["rock", "crystal"], uncommon: ["magnetic_ore", "debris"], rare: ["energy_crystal"] },
      ["vitrified_dunes", "oasis", "exposed_crystals", "desert_wreck", "charged_crystals"]),
    biome("crystalline", "Cristallin", 7, "uncommon", 0.3,
      { common: ["crystal", "needle"], uncommon: ["magnetic_ore"], rare: ["resonance_crystal"] },
      ["crystal_grove", "geode", "resonance_circle", "crystal_stele"]),
    biome("fungal", "Fongique", 6, "uncommon", 0.3,
      { common: ["spore", "adaptive_plant"], uncommon: ["fiber"], rare: ["enzyme", "mycelium"] },
      ["giant_mushrooms", "spore_field", "mycelium_network", "organic_pool"]),
    biome("ruins", "Ruines", 7, "uncommon", 1.5,
      { common: ["debris", "tech_component"], uncommon: ["crystal", "magnetic_ore"], rare: ["tech_relic"] },
      ["collapsed_arch", "stele_court", "debris_dump", "destroyed_workshop", "abandoned_drone_site"]),
    biome("frozen", "Glaciaire", 3, "rare", 0.45,
      { common: ["cold_crystal", "structured_ice"], uncommon: ["rock", "magnetic_ore"], rare: ["cryogenic_component"] },
      ["frozen_fault", "cold_crystals", "icy_pool", "buried_ruin"]),
    biome("volcanic", "Volcanique", 3, "rare", 0.3,
      { common: ["thermal_crystal", "rock"], uncommon: ["magnetic_ore"], rare: ["energetic_obsidian"] },
      ["lava_fissure", "thermal_chimney", "obsidian_field", "burned_ruin"]),
    biome("magnetic", "Magnétique", 3, "rare", 0.75,
      { common: ["magnetic_ore"], uncommon: ["crystal", "debris"], rare: ["magnetic_core"] },
      ["floating_rocks", "suspended_island", "magnetic_vein", "warped_wreck", "local_storm"]),
    biome("electrical", "Électrique", 2, "rare", 0.75,
      { common: ["charged_crystal"], uncommon: ["magnetic_ore", "tech_component"], rare: ["energy_conductor"] },
      ["lightning_zone", "charged_crystals", "ancient_pylon", "conducting_pool", "local_storm"]),
    biome("city", "Cité / Mégalopole", 3, "rare", 2.4,
      { common: ["tech_component", "debris"], uncommon: ["tech_relic", "magnetic_ore"], rare: ["advanced_tech_part"] },
      ["overgrown_street", "city_workshop", "terminal", "abandoned_vehicle", "collapsed_building"]),
    biome("floating_islands", "Îles flottantes", 2, "rare", 0.3,
      { common: ["fiber", "adaptive_plant"], uncommon: ["crystal"], rare: ["aerial_resource"] },
      ["suspended_island", "aerial_waterfall", "hanging_plants", "aerial_ruin"]),
    biome("curiosity", "Curiosity", 1, "curiosity", [0.2, 2],
      { common: ["unusual_resource"], uncommon: ["incompatible_resource"], rare: ["anomaly_resource"] },
      ["visual_anomaly", "impossible_resource", "unusual_geometry", "unknown_remnant"])
  ]);

  const ADJACENCY = record({
    same: 1.35,
    compatible: 1.2,
    neutral: 1,
    highContrast: 0.55,
    normallyImpossible: 0.15,
    anomalyPortalIgnoresCompatibility: true,
    maxConsecutiveSameBiome: 3
  });

  const INITIAL_PROGRESSION = list([
    { discoveryIndex: 0, role: "origin", biomeId: "crystal", plateauCount: 1, fixed: true },
    { discoveryIndex: 1, role: "unknown", plateauCount: 2 },
    { discoveryIndex: 2, role: "unknown", plateauCount: 4 },
    { discoveryIndex: 3, role: "unknown", plateauCount: 6 }
  ]);

  const PLATEAU_WEIGHTS = list([
    { value: 1, weight: 6 }, { value: 2, weight: 20 },
    { value: 3, weight: 10 }, { value: 4, weight: 25 },
    { value: 5, weight: 14 }, { value: 6, weight: 25 }
  ]);

  const RICHNESS = list([
    { id: "standard", label: "Standard", weight: 70 },
    { id: "poor", label: "Pauvre", weight: 12 },
    { id: "diverse", label: "Diversifiée", weight: 10 },
    { id: "common_abundance", label: "Abondance commune", weight: 5 },
    { id: "concentrated_pocket", label: "Poche concentrée", weight: 2.5 },
    { id: "exceptional_deposit", label: "Gisement exceptionnel", weight: 0.5 }
  ]);

  const RICH_ONE_BY_ONE = record({
    eligibleAfterInitialProgression: true,
    oneByOneChance: 0.06,
    maxResourceFamilies: 2,
    variants: list([
      { id: "common_abundance", weight: 65 },
      { id: "specialized_pair", weight: 25 },
      { id: "rare_deposit", weight: 10 }
    ]),
    dominantMicroScene: true,
    persistDefinition: true,
    allowOfflineGeneration: false
  });

  const MICRO_SCENE_CLASSES = list([
    { id: "generic", weight: 45 },
    { id: "biome_specific", weight: 30 },
    { id: "dominant_resource", weight: 15 },
    { id: "rare", weight: 7 },
    { id: "anomaly", weight: 2 },
    { id: "unique_narrative", weight: 1, requiresTrigger: true }
  ]);

  const MICRO_SCENE_COUNTS = record({
    standardOneByOne: record({ min: 1, max: 2, rareMax: 1 }),
    richOneByOne: record({ min: 1, max: 2, rareMax: 1, dominant: true }),
    2: record({ min: 2, max: 4, rareMax: 1 }),
    3: record({ min: 3, max: 5, rareMax: 2 }),
    4: record({ min: 4, max: 7, rareMax: 2 }),
    5: record({ min: 5, max: 8, rareMax: 2 }),
    6: record({ min: 6, max: 10, rareMax: 2 })
  });

  const DISCOVERY_CADENCE = record({
    eligibleAfterDiscovery: 3,
    rareBiomeInterval: record({ min: 7, max: 8 }),
    decorativeSceneInterval: record({ min: 8, max: 10 }),
    remarkableSceneInterval: record({ min: 12, max: 15 }),
    lowMissionActiveMaximum: 1,
    rareBiomeIds: freeze([
      "frozen", "volcanic", "magnetic", "electrical", "city",
      "floating_islands", "curiosity"
    ]),
    northernFrozenMultiplier: 4
  });

  const CRYSTAL = record({
    id: "crystal",
    role: "origin",
    isStoryMap: true,
    isPrimaryBaseMap: true,
    generated: false,
    plateauCount: 1,
    excludeFromBiomeRoll: true
  });

  const weightedPick = (entries, random = Math.random, getWeight = (entry) => entry.weight) => {
    const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(getWeight(entry)) || 0), 0);
    if (!total) return null;
    let cursor = Math.min(0.999999999999, Math.max(0, Number(random()) || 0)) * total;
    for (const entry of entries) {
      cursor -= Math.max(0, Number(getWeight(entry)) || 0);
      if (cursor < 0) return entry;
    }
    return entries[entries.length - 1] || null;
  };

  const byId = record(Object.fromEntries(BIOMES.map((entry) => [entry.id, entry])));

  BF.MapGenerationRules = freeze({
    version: VERSION,
    maxResourceFamilies: MAX_RESOURCE_FAMILIES,
    crystal: CRYSTAL,
    biomes: BIOMES,
    biomeTiers: BIOME_TIERS,
    adjacency: ADJACENCY,
    initialProgression: INITIAL_PROGRESSION,
    plateauWeights: PLATEAU_WEIGHTS,
    richness: RICHNESS,
    richOneByOne: RICH_ONE_BY_ONE,
    microSceneClasses: MICRO_SCENE_CLASSES,
    microSceneCounts: MICRO_SCENE_COUNTS,
    discoveryCadence: DISCOVERY_CADENCE,
    legacyProfileAliases: LEGACY_PROFILE_ALIASES,

    getBiome(id) { return byId[id] || null; },
    getLegacyProfile(id) { return LEGACY_PROFILE_ALIASES[id] || "alien"; },
    getPlateauCount(discoveryIndex, random = Math.random) {
      const fixed = INITIAL_PROGRESSION.find((entry) => entry.discoveryIndex === discoveryIndex);
      return fixed ? fixed.plateauCount : weightedPick(PLATEAU_WEIGHTS, random)?.value || 1;
    },
    pickBiome(random = Math.random, weights = null) {
      return weightedPick(BIOMES, random, (entry) => weights?.[entry.id] ?? entry.weight);
    },
    pickRichness(random = Math.random) { return weightedPick(RICHNESS, random); },
    getMicroSceneCount(plateauCount, rich = false) {
      if (plateauCount === 1) return rich ? MICRO_SCENE_COUNTS.richOneByOne : MICRO_SCENE_COUNTS.standardOneByOne;
      return MICRO_SCENE_COUNTS[plateauCount] || MICRO_SCENE_COUNTS[6];
    },
    toLegacyBiomeDraft(biomeId) {
      const definition = byId[biomeId];
      if (!definition) return null;
      return freeze({
        generatorBiomeId: biomeId,
        profile: this.getLegacyProfile(biomeId),
        traits: freeze([{ id: biomeId, label: definition.label }]),
        resourceFamilies: freeze([
          ...definition.resources.common,
          ...definition.resources.uncommon,
          ...definition.resources.rare
        ].slice(0, MAX_RESOURCE_FAMILIES)),
        microSceneIds: definition.microScenes
      });
    },
    validate() {
      const errors = [];
      const sum = (entries) => entries.reduce((total, entry) => total + entry.weight, 0);
      if (sum(BIOMES) !== 100) errors.push("Le total des biomes doit être 100.");
      if (sum(PLATEAU_WEIGHTS) !== 100) errors.push("Le total des tailles doit être 100.");
      if (sum(RICHNESS) !== 100) errors.push("Le total des richesses doit être 100.");
      if (sum(MICRO_SCENE_CLASSES) !== 100) errors.push("Le total des classes de micro-scènes doit être 100.");
      if (new Set(BIOMES.map((entry) => entry.id)).size !== BIOMES.length) errors.push("IDs de biome dupliqués.");
      BIOMES.forEach((entry) => {
        if (!BIOME_TIERS[entry.tier]) errors.push(`Palier inconnu : ${entry.id}.`);
        if (!LEGACY_PROFILE_ALIASES[entry.id]) errors.push(`Alias moteur absent : ${entry.id}.`);
      });
      return freeze({ valid: errors.length === 0, errors: freeze(errors) });
    }
  });
})(window);
