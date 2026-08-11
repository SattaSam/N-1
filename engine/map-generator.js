(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_generated_maps_v1";
  const PLANET_SEED_KEY = "bluefox_planet_seed_v1";
  const GENERATOR_VERSION = 1;
  const fallbackTerrainUrls = () => [
    ...(global.BLUEFOX_MAP_ASSETS?.fallbackTerrainUrls || [])
  ].filter(Boolean);

  const PALETTES = Object.freeze({
    volcanic: Object.freeze({ ground: 0x4c2928, accent: 0xff7247 }),
    frozen: Object.freeze({ ground: 0x718b9d, accent: 0xbcefff }),
    forest: Object.freeze({ ground: 0x47644f, accent: 0x79f0b2 }),
    ruins: Object.freeze({ ground: 0x4c5e58, accent: 0x72e5bd }),
    aquatic: Object.freeze({ ground: 0x386476, accent: 0x63dcff }),
    desert: Object.freeze({ ground: 0x806451, accent: 0xffbd75 }),
    crystalline: Object.freeze({ ground: 0x586b82, accent: 0x75e8ff }),
    alien: Object.freeze({ ground: 0x5b526f, accent: 0xc795ff })
  });

  class Random {
    constructor(seed) {
      this.seed = seed >>> 0;
    }

    next() {
      this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
      return this.seed / 4294967296;
    }

    integer(maximum) {
      return maximum > 0 ? Math.floor(this.next() * maximum) : 0;
    }
  }

  const hash = (...parts) => {
    let value = 2166136261;
    for (const character of parts.join(":")) {
      value ^= character.charCodeAt(0);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const readDefinitions = () => {
    try {
      const saved = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      global.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  };

  const saveDefinitions = (definitions) => {
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(definitions));
  };

  const randomSeed = () => {
    if (global.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      global.crypto.getRandomValues(values);
      return values[0] || 1;
    }
    return hash(Date.now(), Math.random(), global.performance?.now?.() || 0) || 1;
  };

  const ensurePlanetSeed = (preferredSeed) => {
    const requested = Number(preferredSeed) >>> 0;
    if (requested) {
      global.localStorage.setItem(PLANET_SEED_KEY, String(requested));
      return requested;
    }
    const stored = Number(global.localStorage.getItem(PLANET_SEED_KEY)) >>> 0;
    if (stored) return stored;
    const created = randomSeed();
    global.localStorage.setItem(PLANET_SEED_KEY, String(created));
    return created;
  };

  const catalogTemplates = () => Object.values(BF.maps || {}).filter((map) =>
    map?.id &&
    map.id !== "crystal" &&
    !map.generated &&
    map.sceneUrl &&
    (map.terrainUrls?.length || map.terrainUrl)
  );

  const COMPATIBLE_PROFILES = Object.freeze({
    grassland: Object.freeze(["forest", "desert"]),
    forest: Object.freeze(["forest", "aquatic"]),
    rocky: Object.freeze(["desert", "crystalline", "ruins"]),
    aquatic: Object.freeze(["aquatic", "forest"]),
    desert: Object.freeze(["desert", "crystalline"]),
    crystalline: Object.freeze(["crystalline", "desert"]),
    fungal: Object.freeze(["forest", "aquatic"]),
    ruins: Object.freeze(["ruins", "desert"]),
    frozen: Object.freeze(["frozen"]),
    volcanic: Object.freeze(["volcanic"]),
    magnetic: Object.freeze(["crystalline", "ruins"]),
    electrical: Object.freeze(["crystalline"]),
    city: Object.freeze(["ruins"]),
    floating_islands: Object.freeze(["alien", "forest"]),
    curiosity: Object.freeze([
      "alien", "forest", "aquatic", "desert", "crystalline", "ruins",
      "frozen", "volcanic"
    ])
  });

  const templateScore = (template, biomeId, legacyProfile) => {
    const traits = new Set((template.traits || []).map((trait) => trait.id));
    if (traits.has(biomeId)) return 4;
    if (biomeId === "city" && traits.has("urban")) return 4;
    if (biomeId === "floating_islands" && traits.has("floating")) return 4;
    if (biomeId === "curiosity" && traits.has("mystery")) return 4;
    if (template.profile === legacyProfile) return 2;
    return 1;
  };

  const pickTemplate = (random, biomeId, legacyProfile) => {
    const candidates = catalogTemplates();
    if (!candidates.length) return null;
    const scored = candidates.map((template) => ({
      template,
      score: templateScore(template, biomeId, legacyProfile)
    }));
    const bestScore = Math.max(...scored.map((entry) => entry.score));
    const best = scored.filter((entry) => entry.score === bestScore);
    return best[random.integer(best.length)].template;
  };

  const terrainUrlsOf = (template) => [...new Set(
    (template.terrainUrls?.length ? template.terrainUrls : [template.terrainUrl])
      .filter(Boolean)
  )];

  const terrainSelection = (
    template,
    plateauCount,
    random,
    biomeId,
    legacyProfile
  ) => {
    const preferred = [...new Set(
      (template.terrainUrls?.length ? template.terrainUrls : [template.terrainUrl])
        .filter(Boolean)
    )];
    const otherTemplates = catalogTemplates().filter((entry) =>
      entry.id !== template.id
    );
    const sameBiome = [...new Set(
      otherTemplates
        .filter((entry) => templateScore(entry, biomeId, legacyProfile) >= 2)
        .flatMap(terrainUrlsOf)
        .filter((url) => !preferred.includes(url))
    )];
    const compatibleProfiles = COMPATIBLE_PROFILES[biomeId] || [legacyProfile];
    const compatible = [...new Set(
      otherTemplates
        .filter((entry) =>
          templateScore(entry, biomeId, legacyProfile) < 2 &&
          compatibleProfiles.includes(entry.profile)
        )
        .flatMap(terrainUrlsOf)
        .filter((url) => !preferred.includes(url) && !sameBiome.includes(url))
    )];
    const selected = [];
    const sources = [];
    const pick = (pool) => {
      if (!pool.length) return null;
      const alternatives = pool.length > 1
        ? pool.filter((url) => url !== selected[selected.length - 1])
        : pool;
      const usable = alternatives.length ? alternatives : pool;
      return usable[random.integer(usable.length)];
    };
    while (selected.length < plateauCount) {
      let role = "associated";
      let pool = preferred;
      if (selected.length >= preferred.length) {
        const roll = random.next();
        if (roll < 0.85) {
          role = "associated-repeat";
        } else if (roll < 0.98 && sameBiome.length) {
          pool = sameBiome;
          role = "same-biome";
        } else if (compatible.length) {
          pool = compatible;
          role = "compatible-exception";
        } else if (sameBiome.length) {
          pool = sameBiome;
          role = "same-biome";
        } else {
          role = "associated-repeat";
        }
      }
      const fallback = fallbackTerrainUrls();
      const url = pick(pool) || preferred[0] ||
        (fallback.length ? fallback[selected.length % fallback.length] : null) ||
        template.sceneUrl;
      selected.push(url);
      sources.push({ url, role });
    }
    return { urls: selected, sources };
  };

  const generatedName = (template, ordinal) =>
    template?.name ? `${template.name} · ${String(ordinal).padStart(2, "0")}` : `Territoire ${String(ordinal).padStart(2, "0")}`;

  const restore = () => {
    const restored = [];
    readDefinitions().forEach((saved) => {
      if (!saved?.id || saved.id === "crystal" || !saved.sceneUrl) return;
      const terrainUrls = Array.isArray(saved.terrainUrls)
        ? saved.terrainUrls.filter(Boolean).slice(0, 6)
        : [];
      if (!terrainUrls.length) return;
      BF.maps[saved.id] = {
        ...clone(saved),
        terrainUrls,
        terrainUrl: terrainUrls[0],
        exits: saved.exits && typeof saved.exits === "object" ? saved.exits : {}
      };
      restored.push(saved.id);
    });
    return restored;
  };

  const generate = (options = {}) => {
    const rules = BF.MapGenerationRules;
    if (!rules) throw new Error("MapGenerator nécessite MapGenerationRules.");
    const existing = readDefinitions();
    const planetSeed = ensurePlanetSeed(options.planetSeed);
    const ordinal = Math.max(1, Number(options.ordinal) || existing.length + 1);
    const discoveryIndex = Math.max(1, Number(options.discoveryIndex) || ordinal);
    const mapSeed = hash(planetSeed, ordinal, options.fromMapId, options.direction);
    const random = new Random(mapSeed);
    const biomeDefinition = rules.pickBiome(() => random.next());
    const draft = rules.toLegacyBiomeDraft(biomeDefinition.id);
    const plateauCount = rules.getPlateauCount(discoveryIndex, () => random.next());
    const richness = rules.pickRichness(() => random.next());
    const template = pickTemplate(random, biomeDefinition.id, draft.profile);
    if (!template) throw new Error("Aucun décor local compatible avec le générateur.");
    const terrainPlan = terrainSelection(
      template,
      plateauCount,
      random,
      biomeDefinition.id,
      draft.profile
    );
    const terrainUrls = terrainPlan.urls;
    const id = `generated-${planetSeed.toString(16)}-${String(ordinal).padStart(4, "0")}`;
    const definition = {
      id,
      number: 1000 + ordinal,
      name: generatedName(template, ordinal),
      zones: terrainUrls.map((_, index) => `Plateau ${index + 1}`),
      plateauCount,
      terrainUrls,
      terrainUrl: terrainUrls[0],
      sceneUrl: template.sceneUrl,
      sceneVariants: clone(template.sceneVariants || []),
      entry: { x: 0, z: 20 },
      exits: {},
      seed: mapSeed,
      profile: draft.profile,
      traits: clone(draft.traits),
      description: `${biomeDefinition.label} généré à la découverte.`,
      resourceHints: "Ressources non classées avant observation locale.",
      synthesis: "Je dois explorer ce territoire avant d’en tirer une conclusion.",
      palette: clone(PALETTES[draft.profile] || PALETTES.alien),
      generated: true,
      generator: {
        version: GENERATOR_VERSION,
        planetSeed,
        ordinal,
        discoveryIndex,
        biomeId: biomeDefinition.id,
        richnessId: richness?.id || "standard",
        resourceFamilies: [...draft.resourceFamilies],
        microSceneIds: [...draft.microSceneIds],
        templateId: template.id,
        templateNumber: template.number,
        terrainPolicy: "associated-85_same-biome-13_compatible-2",
        terrainSources: clone(terrainPlan.sources)
      }
    };
    BF.maps[id] = definition;
    const next = existing.filter((entry) => entry?.id !== id);
    next.push(clone(definition));
    saveDefinitions(next);
    return definition;
  };

  BF.MapGenerator = Object.freeze({
    version: GENERATOR_VERSION,
    storageKey: STORAGE_KEY,
    planetSeedKey: PLANET_SEED_KEY,
    restore,
    generate,
    getPlanetSeed: ensurePlanetSeed,
    listSaved: () => clone(readDefinitions()),
    validate() {
      const errors = [];
      if (!BF.MapGenerationRules?.validate?.().valid) errors.push("Tables de génération invalides.");
      if (!catalogTemplates().length) errors.push("Catalogue de décors vide.");
      return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
    }
  });
})(window);
