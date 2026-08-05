(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};

  const BIOMES = Object.freeze({
    default: Object.freeze({ id: "default", budget: 34, density: 1, weights: Object.freeze({ rock: 0.72, strong_rock: 0.9, large_rock: 0.38, needle: 1.2, frond: 1, crystal: 0.18, fiber: 0.45, adaptive_plant: 0.3, magnetic_ore: 0.2, tree: 0.35, nature_tree: 0.32, cactus: 0.2, brouteur: 0.12, sauteur: 0.1, fun_creature: 0.12, small_creature: 0.12, patte_creature: 0.08, spore: 0.25, debris: 0.15 }), requiredTags: Object.freeze([]), forbiddenTags: Object.freeze([]) }),
    forest: Object.freeze({ id: "forest", budget: 46, density: 1.15, weights: Object.freeze({ tree: 2.6, nature_tree: 1.1, cactus: 0.25, frond: 1.75, fern: 2.6, fiber: 1.2, lunar_vine: 0.78, prismatic_orchid: 0.055, adaptive_plant: 0.9, lantern_mushrooms: 0.7, spore: 1.1, rock: 0.38, strong_rock: 0.72, large_rock: 0.28, crystal: 0.08, pool: 0.25, debris: 0.2, brouteur: 0.3, sauteur: 0.24, fun_creature: 0.3, small_creature: 0.32, patte_creature: 0.22 }), requiredTags: Object.freeze([]), forbiddenTags: Object.freeze([]) }),
    jungle: Object.freeze({ id: "jungle", budget: 54, density: 1.3, weights: Object.freeze({ tree: 2.8, nature_tree: 0.85, cactus: 0.42, frond: 1.9, fern: 3.2, fiber: 1.35, lunar_vine: 0.95, adaptive_plant: 1.25, lantern_mushrooms: 0.9, spore: 1.6, pool: 0.35, rock: 0.25, strong_rock: 0.58, large_rock: 0.22, crystal: 0.06, brouteur: 0.34, sauteur: 0.3, fun_creature: 0.35, small_creature: 0.38, patte_creature: 0.28 }), requiredTags: Object.freeze(["plant"]), forbiddenTags: Object.freeze([]) }),
    swamp: Object.freeze({ id: "swamp", budget: 42, density: 1.05, weights: Object.freeze({ pool: 1.8, spore: 1.8, frond: 1.25, fern: 2.75, fiber: 0.85, lunar_vine: 0.5, lantern_mushrooms: 0.85, tree: 0.65, nature_tree: 0.18, small_creature: 0.16, patte_creature: 0.12, rock: 0.18, strong_rock: 0.42, large_rock: 0.18 }), requiredTags: Object.freeze([]), forbiddenTags: Object.freeze([]) }),
    ruins: Object.freeze({ id: "ruins", budget: 48, density: 1, weights: Object.freeze({ debris: 2.8, stele: 0.75, tech_relic: 0.28, relay_block: 0.62, pulse_core: 0.32, memory_capsule: 0.25, logic_prism: 0.08, survey_beacon: 0.22, arch: 0.28, rock: 0.38, strong_rock: 0.82, large_rock: 0.42, needle: 0.7, crystal: 0.08, magnetic_ore: 0.25, azure_ferrite: 0.48, stellar_iridium: 0.05, frond: 0.35 }), requiredTags: Object.freeze([]), forbiddenTags: Object.freeze([]) }),
    desert: Object.freeze({ id: "desert", budget: 32, density: 0.75, weights: Object.freeze({ rock: 0.75, strong_rock: 1.55, large_rock: 0.72, needle: 1.7, debris: 0.75, stele: 0.22, tech_relic: 0.12, arch: 0.08, crystal: 0.05, magnetic_ore: 0.2, azure_ferrite: 0.38, eroded_monolith: 0.24, relay_block: 0.08, cactus: 0.5, brouteur: 0.14, sauteur: 0.18 }), requiredTags: Object.freeze([]), forbiddenTags: Object.freeze(["plant"]) }),
    mountain: Object.freeze({ id: "mountain", budget: 38, density: 0.85, weights: Object.freeze({ rock: 0.85, strong_rock: 1.9, large_rock: 0.95, eroded_monolith: 0.18, needle: 1.2, crystal: 0.12, magnetic_ore: 0.42, azure_ferrite: 0.72, resonant_basalt: 0.42, stellar_iridium: 0.05, debris: 0.4, stele: 0.18, tech_relic: 0.1, arch: 0.06, nature_tree: 0.28 }), requiredTags: Object.freeze([]), forbiddenTags: Object.freeze([]) }),
    cave: Object.freeze({ id: "cave", budget: 36, density: 0.9, weights: Object.freeze({ needle: 2.2, crystal: 0.35, magnetic_ore: 0.48, resonant_basalt: 0.72, thermosap_moss: 0.38, tech_relic: 0.08, spore: 1.15, pool: 0.35, rock: 0.52, strong_rock: 1.15, large_rock: 0.48 }), requiredTags: Object.freeze([]), forbiddenTags: Object.freeze(["tree"]) }),
    coast: Object.freeze({ id: "coast", budget: 36, density: 0.9, weights: Object.freeze({ rock: 0.58, strong_rock: 1.05, large_rock: 0.42, pool: 0.9, frond: 0.75, needle: 0.55, debris: 0.3, nature_tree: 0.16, fun_creature: 0.12, small_creature: 0.14, patte_creature: 0.1 }), requiredTags: Object.freeze([]), forbiddenTags: Object.freeze([]) }),
    tundra: Object.freeze({ id: "tundra", budget: 28, density: 0.7, weights: Object.freeze({ rock: 0.62, strong_rock: 1.05, large_rock: 0.45, frond: 0.8, needle: 0.9, crystal: 0.08, thermosap_moss: 0.25 }), requiredTags: Object.freeze([]), forbiddenTags: Object.freeze(["spore"]) })
  });

  const aliases = Object.freeze({ woodland: "forest", rainforest: "jungle", marsh: "swamp", ruin: "ruins", mountains: "mountain" });
  const resolveId = (biome) => aliases[String(biome || "default").toLowerCase()] || String(biome || "default").toLowerCase();
  const resourceFamily = (family, weight) => Object.freeze({ family, weight });
  const freezeResources = (entries) => Object.freeze(entries.map((entry) => resourceFamily(entry[0], entry[1])));
  const freezeDecorations = (entries) => Object.freeze(entries.map((entry) => Object.freeze(entry)));
  const profile = (rocks, resources, decorations, options = {}) => Object.freeze({
    rocks,
    resources: freezeResources(resources),
    decorations: freezeDecorations(decorations),
    familyMin: options.familyMin || 3,
    familyMax: options.familyMax || 4,
    componentMax: options.componentMax || 0,
    particles: options.particles ?? 0.45,
    specialization: options.specialization || "balanced"
  });

  const MAP_PROFILES = Object.freeze({
    volcanic: profile(18, [["resonant_basalt", 38], ["magnetic_ore", 24], ["thermosap_moss", 20], ["stellar_iridium", 5], ["crystal", 5]], [["strong_rock", 8], ["large_rock", 4], ["needle", 6], ["debris", 8], ["spore", 2]], { particles: 0.28, familyMin: 2, familyMax: 4, specialization: "dominant" }),
    frozen: profile(11, [["thermosap_moss", 32], ["fiber", 27], ["azure_ferrite", 23], ["magnetic_ore", 13], ["crystal", 5]], [["strong_rock", 7], ["large_rock", 3], ["needle", 8], ["frond", 3], ["spore", 4]], { particles: 0.3, familyMin: 2, familyMax: 4 }),
    forest: profile(7, [["lunar_vine", 31], ["fiber", 29], ["adaptive_plant", 26], ["prismatic_orchid", 8], ["crystal", 3]], [["fern", 12], ["frond", 7], ["lantern_mushrooms", 5], ["spore", 7], ["strong_rock", 4], ["nature_tree", 4], ["fun_creature", 2], ["small_creature", 2], ["patte_creature", 1], ["brouteur", 1], ["sauteur", 1], ["needle", 2]], { particles: 0.55, familyMin: 3, familyMax: 4, specialization: "dominant" }),
    plain: profile(6, [["fiber", 32], ["adaptive_plant", 25], ["azure_ferrite", 23], ["magnetic_ore", 16], ["prismatic_orchid", 4]], [["frond", 12], ["fern", 6], ["nature_tree", 3], ["small_creature", 2], ["brouteur", 2], ["sauteur", 2], ["rock", 4]], { particles: 0.4, familyMin: 2, familyMax: 4 }),
    swamp: profile(6, [["fiber", 38], ["lunar_vine", 31], ["adaptive_plant", 23], ["thermosap_moss", 8]], [["fern", 15], ["spore", 12], ["frond", 9], ["lantern_mushrooms", 7], ["pool", 6], ["small_creature", 2], ["patte_creature", 2]], { particles: 0.82, familyMin: 2, familyMax: 4, specialization: "dominant" }),
    ruins: profile(9, [["azure_ferrite", 32], ["magnetic_ore", 25], ["relay_block", 18], ["pulse_core", 13], ["memory_capsule", 12]], [["debris", 10], ["strong_rock", 6], ["large_rock", 3], ["survey_beacon", 2], ["frond", 5], ["spore", 3]], { particles: 0.48, familyMin: 2, familyMax: 4, componentMax: 2, specialization: "archaeological" }),
    archaeological: profile(8, [["relay_block", 29], ["pulse_core", 23], ["memory_capsule", 18], ["azure_ferrite", 17], ["magnetic_ore", 13]], [["debris", 14], ["stele", 4], ["survey_beacon", 3], ["arch", 3], ["strong_rock", 4], ["frond", 3]], { particles: 0.55, familyMin: 3, familyMax: 5, componentMax: 3, specialization: "archaeological" }),
    aquatic: profile(8, [["lunar_vine", 32], ["adaptive_plant", 29], ["fiber", 26], ["prismatic_orchid", 8], ["azure_ferrite", 5]], [["spore", 12], ["fern", 11], ["frond", 8], ["pool", 5], ["small_creature", 2], ["patte_creature", 2], ["needle", 3]], { particles: 0.86, familyMin: 2, familyMax: 4 }),
    coastal: profile(9, [["fiber", 31], ["lunar_vine", 25], ["azure_ferrite", 24], ["magnetic_ore", 15], ["adaptive_plant", 5]], [["frond", 10], ["pool", 7], ["strong_rock", 6], ["large_rock", 3], ["nature_tree", 2], ["small_creature", 2], ["debris", 3]], { particles: 0.65, familyMin: 2, familyMax: 4 }),
    archipelago: profile(7, [["lunar_vine", 31], ["fiber", 28], ["adaptive_plant", 20], ["azure_ferrite", 17], ["prismatic_orchid", 4]], [["pool", 10], ["frond", 10], ["fern", 8], ["nature_tree", 3], ["small_creature", 3], ["patte_creature", 2], ["strong_rock", 4]], { particles: 0.76, familyMin: 2, familyMax: 4, specialization: "dominant" }),
    desert: profile(15, [["azure_ferrite", 38], ["magnetic_ore", 31], ["fiber", 16], ["resonant_basalt", 12], ["crystal", 3]], [["strong_rock", 8], ["large_rock", 4], ["eroded_monolith", 2], ["needle", 6], ["debris", 6], ["cactus", 4], ["brouteur", 1], ["sauteur", 2], ["frond", 2]], { particles: 0.2, familyMin: 2, familyMax: 4, specialization: "dominant" }),
    magnetic: profile(16, [["magnetic_ore", 49], ["azure_ferrite", 24], ["resonant_basalt", 16], ["stellar_iridium", 6], ["crystal", 5]], [["strong_rock", 9], ["large_rock", 6], ["needle", 8], ["debris", 5], ["eroded_monolith", 3]], { particles: 0.52, familyMin: 2, familyMax: 4, specialization: "dominant" }),
    crystalline: profile(12, [["magnetic_ore", 38], ["azure_ferrite", 25], ["crystal", 20], ["stellar_iridium", 9], ["logic_prism", 8]], [["strong_rock", 5], ["large_rock", 3], ["needle", 10], ["frond", 4], ["debris", 4]], { particles: 0.5, familyMin: 2, familyMax: 4, componentMax: 1, specialization: "exceptional" }),
    atypical: profile(10, [["adaptive_plant", 30], ["magnetic_ore", 27], ["lunar_vine", 22], ["azure_ferrite", 16], ["pulse_core", 5]], [["frond", 8], ["spore", 8], ["needle", 7], ["nature_tree", 3], ["debris", 5], ["fun_creature", 2], ["small_creature", 2]], { particles: 0.58, familyMin: 2, familyMax: 4, componentMax: 1, specialization: "dominant" }),
    alien: profile(10, [["lunar_vine", 27], ["adaptive_plant", 27], ["azure_ferrite", 24], ["magnetic_ore", 18], ["crystal", 4]], [["frond", 7], ["spore", 6], ["nature_tree", 3], ["cactus", 3], ["fun_creature", 2], ["small_creature", 2], ["patte_creature", 1], ["brouteur", 1], ["sauteur", 1], ["needle", 5], ["debris", 4]], { particles: 0.5, familyMin: 2, familyMax: 4 })
  });

  const MAX_RESOURCE_FAMILIES = 5;
  const COMPONENT_FAMILIES = new Set(["relay_block", "pulse_core", "memory_capsule", "logic_prism", "tech_relic"]);
  const clampRichness = (value) => Math.max(1.2, Math.min(2.8, Number(value) || 1.2));
  const RESOURCE_RICHNESS = Object.freeze({
    volcanic: Object.freeze({ family: "resonant_basalt", multiplier: 1.65 }), frozen: Object.freeze({ family: "thermosap_moss", multiplier: 1.35 }), forest: Object.freeze({ family: "fiber", multiplier: 1.55 }), plain: Object.freeze({ family: "fiber", multiplier: 1.35 }), swamp: Object.freeze({ family: "fiber", multiplier: 1.65 }), ruins: Object.freeze({ family: "azure_ferrite", multiplier: 1.35 }), archaeological: Object.freeze({ family: "relay_block", multiplier: 1.8 }), aquatic: Object.freeze({ family: "lunar_vine", multiplier: 1.45 }), coastal: Object.freeze({ family: "fiber", multiplier: 1.35 }), archipelago: Object.freeze({ family: "lunar_vine", multiplier: 1.55 }), desert: Object.freeze({ family: "azure_ferrite", multiplier: 1.5 }), magnetic: Object.freeze({ family: "magnetic_ore", multiplier: 1.85 }), crystalline: Object.freeze({ family: "crystal", multiplier: 1.75 }), atypical: Object.freeze({ family: "adaptive_plant", multiplier: 1.5 }), alien: Object.freeze({ family: "adaptive_plant", multiplier: 1.2 })
  });

  const normalize = (value = "") => String(value).toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const inferProfile = (definition, fallback) => {
    const name = normalize(`${definition?.name || ""} ${definition?.description || ""}`);
    const traits = new Set((definition?.traits || []).map((trait) => trait.id));
    if (traits.has("magnetic") || /magnet|aimant|levitation/.test(name)) return "magnetic";
    if (/archipel|ilot/.test(name)) return "archipelago";
    if (/marais|mangrove|tourbiere|marecage/.test(name)) return "swamp";
    if (/plaine|prairie|steppe|savane|lande/.test(name)) return "plain";
    if (/cote|littoral|plage|falaise marine/.test(name)) return "coastal";
    if (/site archeologique|archeolog|fouilles|ancienne cite/.test(name)) return "archaeological";
    if (traits.has("mystery") || traits.has("floating") || /atypique|anomal|impossible|curiosity|mystere/.test(name)) return "atypical";
    return MAP_PROFILES[fallback] ? fallback : "alien";
  };
  const deterministicRoll = (definition) => {
    let value = Number(definition?.seed) || 1;
    const text = String(definition?.id || definition?.name || "map");
    for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 2654435761) >>> 0;
    return (value >>> 0) / 4294967295;
  };

  BF.BiomeRules = Object.freeze({
    data: BIOMES, mapProfiles: MAP_PROFILES, maxResourceFamilies: MAX_RESOURCE_FAMILIES, resourceRichness: RESOURCE_RICHNESS,
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
      return BF.ObjectLibrary.list({ status: "active" }).filter((definition) => this.allows(rule.id, definition)).map((definition) => Object.freeze({ definition, weight: (rule.weights[definition.type] || 0) * definition.spawn.rarityWeight }));
    },
    getMapProfile(profileId) { return MAP_PROFILES[profileId] || MAP_PROFILES.alien; },
    validateMapProfiles() {
      const errors = [];
      Object.entries(MAP_PROFILES).forEach(([profileId, mapProfile]) => {
        const families = mapProfile.resources.map((entry) => entry.family);
        if (families.length > MAX_RESOURCE_FAMILIES) errors.push(`${profileId}: plus de ${MAX_RESOURCE_FAMILIES} familles`);
        if (new Set(families).size !== families.length) errors.push(`${profileId}: famille dupliquée`);
        mapProfile.resources.forEach((entry) => {
          const definition = BF.ObjectLibrary?.get(entry.family);
          if (!definition) errors.push(`${profileId}: objet inconnu ${entry.family}`);
          else if (!definition.gameplay?.collectable) errors.push(`${profileId}: ${entry.family} n'est pas collectable`);
          if (!(Number(entry.weight) > 0)) errors.push(`${profileId}: poids invalide pour ${entry.family}`);
        });
      });
      return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
    },
    getMapPopulation(definition) {
      const requestedProfile = definition.profile || "alien";
      const profileId = inferProfile(definition, requestedProfile);
      const mapProfile = this.getMapProfile(profileId);
      const traitIds = new Set((definition.traits || []).map((trait) => trait.id));
      const plateauCount = Math.max(1, Math.min(6, Number(definition.plateauCount || definition.zones?.length) || 1));
      const isStartingMap = Boolean(definition.isStartingMap || definition.startingMap || definition.id === "crystal" || definition.number === 1);
      const rockCount = mapProfile.rocks + (traitIds.has("magnetic") ? 4 : 0) + (traitIds.has("floating") ? 2 : 0) - (traitIds.has("wetland") ? 2 : 0);
      const roll = deterministicRoll(definition);
      let familyLimit = Math.max(mapProfile.familyMin, Math.min(mapProfile.familyMax, mapProfile.familyMin + Math.floor(roll * (mapProfile.familyMax - mapProfile.familyMin + 1))));
      if (isStartingMap) familyLimit = plateauCount <= 2 ? 2 : plateauCount <= 4 ? 4 : 5;
      familyLimit = Math.min(MAX_RESOURCE_FAMILIES, familyLimit);
      const componentLimit = isStartingMap && plateauCount < 6 ? 0 : Math.min(mapProfile.componentMax, plateauCount >= 6 ? mapProfile.componentMax : 0);
      const normalResources = mapProfile.resources.filter((entry) => !COMPONENT_FAMILIES.has(entry.family));
      const componentResources = mapProfile.resources.filter((entry) => COMPONENT_FAMILIES.has(entry.family)).slice(0, componentLimit);
      const normalLimit = Math.max(1, familyLimit - componentResources.length);
      const resourceEntries = [...normalResources.slice(0, normalLimit), ...componentResources].slice(0, familyLimit);
      const traitDecorations = [
        ...(traitIds.has("bioluminescent") ? [["spore", 3]] : []), ...(traitIds.has("fungal") ? [["spore", 4]] : []), ...(traitIds.has("urban") ? [["debris", 5]] : []), ...(traitIds.has("wetland") ? [["fern", 5], ["frond", 2]] : []), ...(traitIds.has("glass") ? [["needle", 3]] : [])
      ];
      const decorations = definition.id === "crystal" ? [["needle", 9], ["frond", 7], ["debris", 3]] : definition.id === "jungle" ? [["fern", 14], ["spore", 8], ["frond", 6], ["debris", 5], ["needle", 2]] : [...mapProfile.decorations.map((entry) => [...entry]), ...traitDecorations];
      const resourceFamilies = resourceEntries.map((entry) => entry.family);
      const richnessProfile = RESOURCE_RICHNESS[profileId] || RESOURCE_RICHNESS.alien;
      const richness = Object.freeze({ family: resourceFamilies.includes(richnessProfile.family) ? richnessProfile.family : resourceFamilies[0] || null, multiplier: clampRichness(richnessProfile.multiplier) });
      const resourceWeights = Object.freeze(resourceEntries.map((entry) => Object.freeze({ family: entry.family, baseWeight: Math.max(0, Number(entry.weight) || 0), weight: Math.max(0, Number(entry.weight) || 0) * (entry.family === richness.family ? richness.multiplier : 1) })));
      const resourcePattern = Object.freeze(resourceWeights.flatMap((entry) => Array(Math.max(1, Math.round(entry.weight / 10))).fill(entry.family)));
      let particleIntensity = mapProfile.particles + (traitIds.has("wetland") ? 0.12 : 0) + (traitIds.has("fungal") ? 0.12 : 0) + (traitIds.has("bioluminescent") ? 0.15 : 0) - (traitIds.has("lava") ? 0.05 : 0) - (traitIds.has("ice") ? 0.05 : 0);
      particleIntensity = Math.max(0.1, Math.min(1, particleIntensity));
      definition.particleIntensity = particleIntensity;
      definition.resolvedPopulationProfile = profileId;
      return { profileId, rockCount, resourcePattern, resourceWeights, resourceFamilies, richness, decorations, particleIntensity, specialization: mapProfile.specialization };
    }
  });

  // Pont léger : applique les paramètres affinés au spawner existant et expose
  // automatiquement les profils dans MAP TEST, sans ajouter d'étape au générateur.
  const PROFILE_LABELS = Object.freeze({
    volcanic: "Volcanique",
    frozen: "Glace / toundra",
    forest: "Forêt",
    plain: "Plaine",
    swamp: "Marais",
    ruins: "Ruines",
    archaeological: "Site archéologique",
    aquatic: "Océanique",
    coastal: "Côte",
    archipelago: "Archipel",
    desert: "Désert",
    magnetic: "Magnétique",
    crystalline: "Cristallin exceptionnel",
    atypical: "Map atypique",
    alien: "Alien générique"
  });

  const MAP_RESOURCE_BUDGETS = Object.freeze({
    1: Object.freeze({ min: 10, max: 14 }),
    2: Object.freeze({ min: 15, max: 21 }),
    3: Object.freeze({ min: 20, max: 28 }),
    4: Object.freeze({ min: 25, max: 34 }),
    5: Object.freeze({ min: 30, max: 39 }),
    6: Object.freeze({ min: 34, max: 45 })
  });

  const profilePalette = (profileId) => ({
    volcanic: { ground: 0x4c2928, accent: 0xff7247 },
    frozen: { ground: 0x718b9d, accent: 0xbcefff },
    forest: { ground: 0x47644f, accent: 0x79f0b2 },
    plain: { ground: 0x657753, accent: 0xb8e27f },
    swamp: { ground: 0x3e5b4b, accent: 0x82dfb0 },
    ruins: { ground: 0x4c5e58, accent: 0x72e5bd },
    archaeological: { ground: 0x61594f, accent: 0xe2bf7a },
    aquatic: { ground: 0x386476, accent: 0x63dcff },
    coastal: { ground: 0x59766f, accent: 0x7de5dc },
    archipelago: { ground: 0x3f7180, accent: 0x82e6ff },
    desert: { ground: 0x806451, accent: 0xffbd75 },
    magnetic: { ground: 0x4d5268, accent: 0xb08cff },
    crystalline: { ground: 0x586b82, accent: 0x75e8ff },
    atypical: { ground: 0x635275, accent: 0xe194ff },
    alien: { ground: 0x5b526f, accent: 0xc795ff }
  })[profileId] || { ground: 0x5b526f, accent: 0xc795ff };

  const weightedProfilePick = (entries, random) => {
    const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
    if (total <= 0) return null;
    let cursor = random() * total;
    for (const entry of entries) {
      cursor -= Math.max(0, Number(entry.weight) || 0);
      if (cursor <= 0) return entry.family || entry[0];
    }
    const last = entries[entries.length - 1];
    return last?.family || last?.[0] || null;
  };

  const addParticlePreview = (spawner, profileId, intensity, options) => {
    const THREE = spawner.THREE;
    const targetScene = options.scene || spawner.scene;
    const bounds = options.bounds;
    if (!THREE || !targetScene || !bounds || !(intensity > 0)) return null;
    const count = Math.max(3, Math.round(6 + intensity * 26));
    const positions = new Float32Array(count * 3);
    const random = spawner.random || Math.random;
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = bounds.minX + random() * (bounds.maxX - bounds.minX);
      positions[index * 3 + 1] = 0.8 + random() * (4 + intensity * 5);
      positions[index * 3 + 2] = bounds.minZ + random() * (bounds.maxZ - bounds.minZ);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: profilePalette(profileId).accent,
      size: 0.08 + intensity * 0.12,
      transparent: true,
      opacity: Math.min(0.62, 0.18 + intensity * 0.42),
      depthWrite: false
    });
    const particles = new THREE.Points(geometry, material);
    particles.name = `BiomeParticles:${profileId}`;
    particles.userData.biomeParticlePreview = true;
    particles.userData.particleIntensity = intensity;
    targetScene.add(particles);
    return particles;
  };

  const populateProfilePreview = function populateProfilePreview(profileId, options = {}) {
    const bounds = options.bounds || { minX: -10, maxX: 10, minZ: -10, maxZ: 10, y: 0 };
    const budget = Math.max(1, Math.round(Number(options.budget) || 10));
    const previewDefinition = {
      id: `map-test-${profileId}`,
      name: PROFILE_LABELS[profileId] || profileId,
      profile: profileId,
      plateauCount: 1,
      seed: Math.floor((this.random || Math.random)() * 2147483647) + 1,
      traits: profileId === "magnetic" ? [{ id: "magnetic" }]
        : profileId === "swamp" ? [{ id: "wetland" }]
          : profileId === "atypical" ? [{ id: "mystery" }] : []
    };
    const population = BF.BiomeRules.getMapPopulation(previewDefinition);
    const random = this.random || Math.random;
    const resourceBudget = Math.max(1, Math.round(budget * 0.35));
    const decorationBudget = Math.max(0, budget - resourceBudget);
    const spawned = [];
    let spent = 0;
    let attempts = 0;

    const place = (type, source) => {
      const definition = BF.ObjectLibrary?.get(type);
      if (!definition) return false;
      const position = {
        x: bounds.minX + random() * (bounds.maxX - bounds.minX),
        y: bounds.y || 0,
        z: bounds.minZ + random() * (bounds.maxZ - bounds.minZ)
      };
      const record = this.spawn(type, {
        position,
        rotation: random() * Math.PI * 2,
        variant: Math.floor(random() * 3),
        scene: options.scene,
        palette: options.palette || profilePalette(profileId),
        source,
        placed: [...this.instances, ...spawned]
      });
      if (!record) return false;
      spawned.push(record);
      spent += definition.spawn?.spawnCost || 1;
      return true;
    };

    while (spawned.length < resourceBudget && attempts < resourceBudget * 18) {
      attempts += 1;
      const type = weightedProfilePick(population.resourceWeights, random);
      if (type) place(type, `map-test-resource:${profileId}`);
    }

    const decorationEntries = population.decorations.map(([type, weight]) => ({ family: type, weight }));
    attempts = 0;
    while (spawned.length < resourceBudget + decorationBudget && attempts < decorationBudget * 18) {
      attempts += 1;
      const type = weightedProfilePick(decorationEntries, random);
      if (type) place(type, `map-test-ecology:${profileId}`);
    }

    addParticlePreview(this, profileId, population.particleIntensity, { ...options, bounds });
    return Object.freeze({
      biome: profileId,
      budget,
      spent,
      attempts,
      spawned: Object.freeze(spawned),
      population
    });
  };

  const installMapTestProfiles = () => {
    const select = global.document?.querySelector?.("#biome-profile");
    if (!select) return;
    Object.entries(PROFILE_LABELS).forEach(([profileId, label]) => {
      let option = Array.from(select.options).find((entry) => entry.value === profileId);
      if (!option) {
        option = new Option(label, profileId);
        select.add(option);
      } else {
        option.textContent = label;
      }
    });
  };

  const installSpawnerProfileBridge = () => {
    const Spawner = BF.ObjectSpawner;
    if (!Spawner?.prototype) {
      global.setTimeout(installSpawnerProfileBridge, 0);
      return;
    }
    const prototype = Spawner.prototype;
    if (prototype.__bluefoxBiomeProfilesV2) {
      installMapTestProfiles();
      return;
    }

    const originalPopulateBiome = prototype.populateBiome;
    const originalPopulateMap = prototype.populateMap;

    prototype.populateBiome = function patchedPopulateBiome(biome, options = {}) {
      const profileId = MAP_PROFILES[biome] ? biome : null;
      if (!profileId) return originalPopulateBiome.call(this, biome, options);
      return populateProfilePreview.call(this, profileId, options);
    };

    prototype.populateMap = function patchedPopulateMap(options = {}) {
      const definition = options.definition;
      if (!definition) return originalPopulateMap.call(this, options);
      const plateauCount = Math.max(1, Math.min(6,
        Number(definition.plateauCount || options.zoneRegions?.length || definition.zones?.length) || 1
      ));
      const resourceBudget = MAP_RESOURCE_BUDGETS[plateauCount];
      const locked = definition.populationBudget || {};
      if (Number.isFinite(Number(locked.resources))) {
        return originalPopulateMap.call(this, options);
      }
      const roll = deterministicRoll(definition);
      const resources = Math.round(
        resourceBudget.min + roll * (resourceBudget.max - resourceBudget.min)
      );
      const adjustedDefinition = {
        ...definition,
        populationBudget: { ...locked, resources }
      };
      return originalPopulateMap.call(this, { ...options, definition: adjustedDefinition });
    };

    Object.defineProperty(prototype, "__bluefoxBiomeProfilesV2", {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });
    Spawner.mapResourceBudgetsV2 = MAP_RESOURCE_BUDGETS;
    installMapTestProfiles();
    global.setTimeout(installMapTestProfiles, 50);
    global.setTimeout(installMapTestProfiles, 250);
  };

  installSpawnerProfileBridge();
})(window);
