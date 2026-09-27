(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_generated_maps_v1";
  const PLANET_SEED_KEY = "bluefox_planet_seed_v1";
  const GENERATOR_VERSION = 1;
  const VISUAL_IDENTITY_VERSION = 2;
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

  const BLUEFOX_DUPLICATE_NAMES = Object.freeze({
    forest: Object.freeze([
      "Le Sous-Bois des Murmures", "La Clairière Patiente",
      "Les Racines du Souvenir", "Le Jardin des Silences",
      "La Canopée qui Respire", "Le Bois des Lueurs Douces"
    ]),
    aquatic: Object.freeze([
      "Les Eaux qui Écoutent", "Le Miroir des Roseaux",
      "La Lagune des Reflets", "Les Rives du Calme",
      "Le Marais des Lumières Lentes", "La Nappe aux Échos"
    ]),
    desert: Object.freeze([
      "La Plaine du Souffle Chaud", "Les Dunes de l'Attente",
      "Le Désert des Traces Fines", "La Ligne des Mirages",
      "Les Pierres du Grand Silence", "L'Horizon Pâle"
    ]),
    crystalline: Object.freeze([
      "Le Champ des Éclats", "La Vallée qui Résonne",
      "Les Cristaux du Lointain", "Le Jardin des Reflets",
      "La Plaine aux Mille Lueurs", "Le Seuil de Verre"
    ]),
    ruins: Object.freeze([
      "Les Murs qui se Souviennent", "Le Quartier Endormi",
      "Les Vestiges du Passage", "La Place Sans Voix",
      "Les Pierres de l'Avant", "Le Chemin des Absents"
    ]),
    frozen: Object.freeze([
      "Le Silence Blanc", "La Plaine du Souffle Froid",
      "Les Glaces Immobiles", "Le Bord du Ciel Pâle",
      "La Neige des Échos", "Le Plateau du Givre Bleu"
    ]),
    volcanic: Object.freeze([
      "La Terre qui Gronde", "Les Braises du Lointain",
      "Le Sol au Cœur Rouge", "La Plaine des Cendres",
      "Le Bord du Feu", "Les Roches de la Chaleur Sourde"
    ]),
    alien: Object.freeze([
      "L'Endroit qui Intrigue", "La Plaine de l'Étrange",
      "Le Pays des Signes", "L'Horizon Inattendu",
      "Le Jardin Inconnu", "La Terre qui me Regarde"
    ])
  });

  class Random {
    constructor(seed) { this.seed = seed >>> 0; }
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

  const isGenerationTemplateEligible = (map) => Boolean(
    map?.id &&
    map.id !== "crystal" &&
    !map.generated &&
    map.sceneUrl &&
    (map.terrainUrls?.length || map.terrainUrl) &&
    map.generationTemplateEligible !== false &&
    map.missionOnly !== true &&
    map.civilizationRole !== "city"
  );

  const catalogTemplates = () =>
    Object.values(BF.maps || {}).filter(isGenerationTemplateEligible);

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
    if ((COMPATIBLE_PROFILES[biomeId] || []).includes(template.profile)) return 1.5;
    return 1;
  };

  const pickTemplate = (random, biomeId, legacyProfile, preferredId = null) => {
    const candidates = catalogTemplates();
    if (!candidates.length) return null;
    if (preferredId) {
      const explicit = candidates.find((template) => template.id === preferredId);
      if (explicit) return explicit;
    }
    const scored = candidates.map((template) => ({
      template,
      score: templateScore(template, biomeId, legacyProfile)
    }));
    const bestScore = Math.max(...scored.map((entry) => entry.score));
    const best = scored.filter((entry) => entry.score === bestScore);
    return best[random.integer(best.length)].template;
  };

  const terrainUrlsOf = (template) => [...new Set(
    (template?.terrainUrls?.length ? template.terrainUrls : [template?.terrainUrl])
      .filter(Boolean)
  )];

  const themedTerrainCandidates = (template, biomeId, legacyProfile) => {
    const preferred = new Set(terrainUrlsOf(template));
    return catalogTemplates()
      .filter((candidate) => candidate.id !== template?.id)
      .map((candidate) => ({
        candidate,
        score: templateScore(candidate, biomeId, legacyProfile)
      }))
      .filter((entry) => entry.score > 1)
      .sort((left, right) =>
        right.score - left.score ||
        Number(left.candidate.number || 0) - Number(right.candidate.number || 0)
      )
      .flatMap((entry) => terrainUrlsOf(entry.candidate).map((url) => ({
        url,
        templateId: entry.candidate.id,
        score: entry.score
      })))
      .filter((entry, index, list) =>
        !preferred.has(entry.url) &&
        list.findIndex((candidate) => candidate.url === entry.url) === index
      );
  };

  const terrainSelection = (
    template,
    plateauCount,
    random,
    biomeId,
    legacyProfile
  ) => {
    const preferred = terrainUrlsOf(template);
    const themed = themedTerrainCandidates(template, biomeId, legacyProfile);
    const fallback = fallbackTerrainUrls();
    const selected = [];
    const sources = [];
    const usage = new Map();

    const canUse = (url, maximum = 2) =>
      Boolean(url) && (usage.get(url) || 0) < maximum;

    const add = (url, role, meta = {}) => {
      if (!url) return false;
      selected.push(url);
      usage.set(url, (usage.get(url) || 0) + 1);
      sources.push({ url, role, ...meta });
      return true;
    };

    // 1) Chaque texture réellement associée au décor une première fois.
    preferred.forEach((url) => {
      if (selected.length < plateauCount) add(url, "associated");
    });

    // 2) Puis une deuxième fois au maximum, avant tout fallback.
    preferred.forEach((url) => {
      if (selected.length < plateauCount && canUse(url, 2)) {
        add(url, "associated-repeat");
      }
    });

    // 3) Seulement ensuite, textures d'un template du même thème/biome.
    for (const entry of themed) {
      if (selected.length >= plateauCount) break;
      if (canUse(entry.url, 2)) {
        add(entry.url, "themed-fallback", {
          sourceTemplateId: entry.templateId,
          affinityScore: entry.score
        });
      }
    }
    for (const entry of themed) {
      if (selected.length >= plateauCount) break;
      if (canUse(entry.url, 2)) {
        add(entry.url, "themed-fallback-repeat", {
          sourceTemplateId: entry.templateId,
          affinityScore: entry.score
        });
      }
    }

    // 4) Les 028_x ne sont qu'un dernier recours.
    let fallbackIndex = 0;
    while (selected.length < plateauCount && fallback.length) {
      const url = fallback[fallbackIndex % fallback.length];
      fallbackIndex += 1;
      if (canUse(url, 2) || fallback.every((item) => !canUse(item, 2))) {
        add(url, "default-fallback");
      }
      if (fallbackIndex > plateauCount * Math.max(1, fallback.length) * 3) break;
    }

    // Garde ultime : une définition doit toujours avoir exactement N terrains.
    while (selected.length < plateauCount) {
      const url = preferred[selected.length % Math.max(1, preferred.length)] ||
        fallback[selected.length % Math.max(1, fallback.length)] ||
        template?.sceneUrl;
      add(url, "emergency-repeat");
    }

    return { urls: selected.slice(0, plateauCount), sources: sources.slice(0, plateauCount) };
  };

  const usedGeneratedNames = (excludeId = null) => new Set(
    readDefinitions()
      .filter((entry) => entry?.id !== excludeId)
      .map((entry) => String(entry?.name || "").trim())
      .filter(Boolean)
  );

  const duplicateVisualIdentity = (template, excludeId = null) =>
    readDefinitions().some((entry) =>
      entry?.id !== excludeId &&
      (
        entry?.generator?.templateId === template?.id ||
        String(entry?.generator?.templateNumber || "") === String(template?.number || "") ||
        String(entry?.generator?.baseTemplateName || "") === String(template?.name || "")
      )
    );

  const blueFoxName = (template, profile, seed, excludeId = null) => {
    const used = usedGeneratedNames(excludeId);
    const names = BLUEFOX_DUPLICATE_NAMES[profile] || BLUEFOX_DUPLICATE_NAMES.alien;
    const start = hash(seed, template?.id, template?.name, profile) % names.length;
    for (let offset = 0; offset < names.length; offset += 1) {
      const candidate = names[(start + offset) % names.length];
      if (!used.has(candidate)) return candidate;
    }
    // Cas exceptionnel : garder un nom humain, jamais un ID/nom de fichier.
    return `${names[start]} — ${["Nord", "Sud", "Aube", "Crépuscule"][hash(seed, "name") % 4]}`;
  };

  const resolvedMapName = (definition, template, profile, seed, options = {}) => {
    const source = definition?.generator?.nameSource;
    const explicitCustom =
      options.preserveName === true ||
      source === "custom" ||
      source === "bluefox" ||
      definition?.customName === true ||
      definition?.nameLocked === true;
    if (explicitCustom && definition?.name) {
      return { name: definition.name, source: source || "custom" };
    }
    if (!duplicateVisualIdentity(template, definition?.id)) {
      return { name: template?.name || "Territoire inconnu", source: "template" };
    }
    return {
      name: blueFoxName(template, profile, seed, definition?.id),
      source: "bluefox"
    };
  };

  const resolveVisualIdentity = (definition, options = {}) => {
    if (!definition) return definition;
    const rules = BF.MapGenerationRules;
    if (!rules) return definition;

    const biomeId = options.biomeId && options.biomeId !== "random"
      ? options.biomeId
      : definition?.generator?.biomeId;
    const draft = rules.toLegacyBiomeDraft?.(biomeId);
    if (!draft) return definition;

    const plateauCount = Math.max(
      1,
      Math.min(6, Math.round(Number(options.plateauCount ?? definition.plateauCount) || 1))
    );
    const seed = Number(definition.seed) || Number(definition.generator?.ordinal) || 1;
    const random = new Random(hash(seed, biomeId, plateauCount, "visual"));
    const preferredTemplateId =
      options.templateId ||
      options.predefinedMapId ||
      options.mapId ||
      null;
    const template = options.template ||
      pickTemplate(random, biomeId, draft.profile, preferredTemplateId);
    if (!template) return definition;

    const terrainPlan = terrainSelection(
      template,
      plateauCount,
      random,
      biomeId,
      draft.profile
    );
    const naming = resolvedMapName(
      definition,
      template,
      draft.profile,
      seed,
      options
    );

    definition.name = naming.name;
    definition.profile = draft.profile;
    definition.traits = clone(draft.traits);
    definition.palette = clone(template.palette || PALETTES[draft.profile] || PALETTES.alien);
    definition.sceneUrl = template.sceneUrl;
    definition.sceneVariants = clone(template.sceneVariants || []);
    definition.plateauCount = plateauCount;
    definition.terrainUrls = terrainPlan.urls;
    definition.terrainUrl = terrainPlan.urls[0];
    definition.zones = Array.from(
      { length: plateauCount },
      (_, index) => definition.zones?.[index] || `Plateau ${index + 1}`
    );

    definition.generator ||= {};
    definition.generator.biomeId = biomeId;
    definition.generator.resourceFamilies = [...draft.resourceFamilies];
    definition.generator.microSceneIds = [...draft.microSceneIds];
    definition.generator.templateId = template.id;
    definition.generator.templateNumber = template.number;
    definition.generator.baseTemplateName = template.name || null;
    definition.generator.nameSource = naming.source;
    definition.generator.visualIdentityVersion = VISUAL_IDENTITY_VERSION;
    definition.generator.terrainPolicy =
      "associated-max2_then-themed-max2_then-default-028";
    definition.generator.terrainSources = clone(terrainPlan.sources);
    return definition;
  };

  const restore = () => {
    const restored = [];
    const savedDefinitions = readDefinitions();
    let migrated = false;
    const healed = [];

    savedDefinitions.forEach((saved) => {
      if (!saved?.id || saved.id === "crystal" || !saved.sceneUrl) return;
      const definition = clone(saved);
      const terrainUrls = Array.isArray(definition.terrainUrls)
        ? definition.terrainUrls.filter(Boolean).slice(0, 6)
        : [];
      if (!terrainUrls.length) return;

      definition.terrainUrls = terrainUrls;
      definition.terrainUrl = terrainUrls[0];
      definition.exits =
        definition.exits && typeof definition.exits === "object"
          ? definition.exits
          : {};

      // Migration des anciennes définitions générées : une map déjà persistée
      // ne doit pas rester nom03/scene10/terrains03 après installation du correctif.
      if (
        definition.generated === true &&
        definition.generator?.biomeId &&
        Number(definition.generator?.visualIdentityVersion || 0) < VISUAL_IDENTITY_VERSION
      ) {
        const before = JSON.stringify({
          name: definition.name,
          sceneUrl: definition.sceneUrl,
          terrainUrls: definition.terrainUrls,
          templateId: definition.generator?.templateId
        });
        resolveVisualIdentity(definition, {
          biomeId: definition.generator.biomeId,
          plateauCount: definition.plateauCount || definition.terrainUrls.length,
          templateId: definition.generator.templateId || null,
          preserveName:
            definition.generator?.nameSource === "bluefox" ||
            definition.generator?.nameSource === "custom" ||
            definition.customName === true ||
            definition.nameLocked === true
        });
        const after = JSON.stringify({
          name: definition.name,
          sceneUrl: definition.sceneUrl,
          terrainUrls: definition.terrainUrls,
          templateId: definition.generator?.templateId
        });
        migrated = migrated || before !== after;
      }

      BF.maps[definition.id] = definition;
      healed.push(clone(definition));
      restored.push(definition.id);
    });

    if (migrated) saveDefinitions(healed);
    return restored;
  };

  const intervalFor = (planetSeed, family, afterOrdinal, range) => {
    const minimum = Math.max(1, Number(range?.min) || 1);
    const maximum = Math.max(minimum, Number(range?.max) || minimum);
    return minimum + (hash(planetSeed, family, afterOrdinal) % (maximum - minimum + 1));
  };

  const discoveriesSince = (definitions, predicate) => {
    const ordered = [...definitions]
      .filter((definition) => definition?.generated)
      .sort((left, right) =>
        Number(left.generator?.ordinal || 0) - Number(right.generator?.ordinal || 0)
      );
    const lastIndex = ordered.map(predicate).lastIndexOf(true);
    return lastIndex < 0 ? ordered.length : ordered.length - lastIndex - 1;
  };

  const opportunityMicroSceneIds = () => new Set(
    (Array.isArray(BF.BibleCatalog)
      ? BF.BibleCatalog
      : Object.values(BF.BibleCatalog || {}))
      .filter((mission) =>
        /^OPP-/.test(String(mission?.id || "")) &&
        mission?.trigger?.type === "exploration.map_discovered"
      )
      .flatMap((mission) =>
        Array.isArray(mission?.trigger?.featuredMicroSceneIdsAny)
          ? mission.trigger.featuredMicroSceneIdsAny
          : []
      )
      .map(String)
      .filter(Boolean)
  );

  const chooseScene = (random, biomeId, kind, options = {}) => {
    const compatible = BF.MicroScenes?.list?.(biomeId)
      ?.filter((scene) => !scene.missionOnly) || [];
    const opportunityKeys = opportunityMicroSceneIds();
    const missionKeys = new Set([
      "MSC-ABANDONED-DRONE-001", "MSC-TECH-RELAY-001",
      "MSC-ANCIENT-GATEWAY-001", "MSC-RUINED-SHRINE-001",
      "MSC-ECO-STAR-001",
      "MSC-PREDATOR-FLORA-001", "MSC-LOCAL-STORM-001"
    ]);
    const candidates = compatible.filter((scene) => {
      if (kind === "mission") {
        return missionKeys.has(scene.id) || opportunityKeys.has(scene.id);
      }
      if (kind === "remarkable") {
        return !opportunityKeys.has(scene.id) &&
          (scene.custom === true || ["rare", "story"].includes(scene.rarity));
      }
      return ["common", "uncommon"].includes(scene.rarity);
    });
    if (kind === "mission" && !candidates.length) return null;
    let pool = candidates.length ? candidates : compatible;
    if (kind === "mission" && options.longMissionTransit === true) {
      const dangerous = new Set([
        "MSC-PREDATOR-FLORA-001", "MSC-LOCAL-STORM-001"
      ]);
      const weighted = [];
      pool.forEach((scene) => {
        weighted.push(scene);
        if (dangerous.has(scene.id)) {
          weighted.push(scene, scene, scene);
        }
      });
      pool = weighted;
    }
    return pool.length ? pool[random.integer(pool.length)] : null;
  };

  const isWetOrAerialBiome = (id) => ["aquatic", "floating_islands"].includes(id);

  const wetAerialSince = (definitions) => discoveriesSince(
    definitions,
    (definition) => isWetOrAerialBiome(definition.generator?.biomeId)
  );

  const generate = (options = {}) => {
    const rules = BF.MapGenerationRules;
    if (!rules) throw new Error("MapGenerator nécessite MapGenerationRules.");
    const existing = readDefinitions();
    const planetSeed = ensurePlanetSeed(options.planetSeed);
    const ordinal = Math.max(1, Number(options.ordinal) || existing.length + 1);
    const discoveryIndex = Math.max(1, Number(options.discoveryIndex) || ordinal);
    const mapSeed = hash(planetSeed, ordinal, options.fromMapId, options.direction);
    const random = new Random(mapSeed);
    const cadenceRules = rules.discoveryCadence;
    const eligible = discoveryIndex > cadenceRules.eligibleAfterDiscovery;
    const rareIds = new Set(cadenceRules.rareBiomeIds);
    const sinceRare = discoveriesSince(existing, (definition) =>
      rareIds.has(definition.generator?.biomeId)
    );
    const sinceDecorative = discoveriesSince(existing, (definition) =>
      definition.generator?.cadence?.decorativeGuaranteed === true
    );
    const sinceRemarkable = discoveriesSince(existing, (definition) =>
      definition.generator?.cadence?.remarkableGuaranteed === true
    );
    const sinceWetAerial = wetAerialSince(existing);
    const previousOrdinal = existing.reduce((maximum, definition) =>
      Math.max(maximum, Number(definition?.generator?.ordinal) || 0), 0
    );
    const rareInterval = intervalFor(
      planetSeed, "rare-biome", previousOrdinal - sinceRare,
      cadenceRules.rareBiomeInterval
    );
    const decorativeInterval = intervalFor(
      planetSeed, "decorative-scene", previousOrdinal - sinceDecorative,
      cadenceRules.decorativeSceneInterval
    );
    const remarkableInterval = intervalFor(
      planetSeed, "remarkable-scene", previousOrdinal - sinceRemarkable,
      cadenceRules.remarkableSceneInterval
    );
    const forceRare = eligible && sinceRare + 1 >= rareInterval;
    const forceWetAerial = eligible && sinceWetAerial + 1 >= 7;
    const weights = Object.fromEntries(rules.biomes.map((biome) => {
      let weight = forceWetAerial
        ? (isWetOrAerialBiome(biome.id) ? Math.max(biome.weight, biome.id === "aquatic" ? 10 : 6) : 0)
        : forceRare
          ? (rareIds.has(biome.id) ? biome.weight : 0)
          : biome.weight;
      if (options.direction === "north" && biome.id === "frozen") {
        weight *= cadenceRules.northernFrozenMultiplier;
      }
      return [biome.id, weight];
    }));
    const biomeDefinition = rules.pickBiome(() => random.next(), weights);
    const draft = rules.toLegacyBiomeDraft(biomeDefinition.id);
    const plateauCount = rules.getPlateauCount(discoveryIndex, () => random.next());
    const richness = rules.pickRichness(() => random.next());
    const forceRemarkable = eligible && sinceRemarkable + 1 >= remarkableInterval;
    const forceDecorative = eligible && sinceDecorative + 1 >= decorativeInterval;
    const generationContext = BF.__pendingBibleMapGenerationContext || null;
    const missionOpportunityEligible = Boolean(
      eligible && generationContext?.opportunisticEncounterEligible === true
    );
    const missionOpportunityChance = generationContext?.longMissionTransit === true
      ? 0.65
      : 0.25;
    const preferMissionOpportunity = Boolean(
      missionOpportunityEligible && random.next() < missionOpportunityChance
    );
    const featuredScenes = [];
    const appendScene = (kind) => {
      const scene = chooseScene(random, biomeDefinition.id, kind, generationContext || {});
      if (scene && !featuredScenes.some((entry) => entry.scene.id === scene.id)) {
        featuredScenes.push({ kind, scene });
      }
    };
    if (preferMissionOpportunity) appendScene("mission");
    if (!featuredScenes.length) {
      if (forceDecorative) appendScene("decorative");
      if (forceRemarkable) appendScene("remarkable");
      if (["magnetic", "floating_islands"].includes(biomeDefinition.id)) {
        const suspended = BF.MicroScenes?.get?.("MSC-SUSPENDED-ISLAND-001");
        if (suspended && !featuredScenes.some((entry) => entry.scene.id === suspended.id)) {
          featuredScenes.push({ kind: "biome-guaranteed", scene: suspended });
        }
      }
    }

    const template = pickTemplate(random, biomeDefinition.id, draft.profile);
    if (!template) throw new Error("Aucun décor local compatible avec le générateur.");

    const id = `generated-${planetSeed.toString(16)}-${String(ordinal).padStart(4, "0")}`;
    const definition = {
      id,
      number: 1000 + ordinal,
      name: template.name || "Territoire inconnu",
      zones: [],
      plateauCount,
      terrainUrls: [],
      terrainUrl: null,
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
        featuredMicroSceneId: featuredScenes[0]?.scene.id || null,
        featuredMicroSceneIds: featuredScenes.map((entry) => entry.scene.id),
        cadence: {
          rareBiomeForced: forceRare,
          wetAerialForced: forceWetAerial,
          discoveriesSinceWetAerialBeforeGeneration: sinceWetAerial,
          rareBiomeInterval: rareInterval,
          decorativeGuaranteed: featuredScenes.some((entry) => entry.kind === "decorative"),
          decorativeInterval,
          remarkableGuaranteed: featuredScenes.some((entry) => entry.kind === "remarkable"),
          remarkableInterval,
          missionOpportunityEligible,
          missionOpportunityChance,
          missionOpportunityPreferred: featuredScenes.some((entry) => entry.kind === "mission"),
          missionOpportunityLongTransit: Boolean(
            featuredScenes.some((entry) => entry.kind === "mission") &&
            generationContext?.longMissionTransit === true
          ),
          direction: options.direction || null,
          northernFrozenAffinityApplied: options.direction === "north",
          discoveriesSinceRareBeforeGeneration: sinceRare,
          discoveriesSinceDecorativeBeforeGeneration: sinceDecorative,
          discoveriesSinceRemarkableBeforeGeneration: sinceRemarkable
        }
      }
    };

    resolveVisualIdentity(definition, {
      biomeId: biomeDefinition.id,
      plateauCount,
      template
    });

    BF.maps[id] = definition;
    const next = existing.filter((entry) => entry?.id !== id);
    next.push(clone(definition));
    saveDefinitions(next);
    return definition;
  };

  BF.MapGenerator = Object.freeze({
    version: GENERATOR_VERSION,
    visualIdentityVersion: VISUAL_IDENTITY_VERSION,
    storageKey: STORAGE_KEY,
    planetSeedKey: PLANET_SEED_KEY,
    restore,
    generate,
    getPlanetSeed: ensurePlanetSeed,
    listSaved: () => clone(readDefinitions()),
    resolveVisualIdentity,
    terrainSelection,
    terrainUrlsOf,
    templateScore,
    validate() {
      const errors = [];
      if (!BF.MapGenerationRules?.validate?.().valid) errors.push("Tables de génération invalides.");
      if (!catalogTemplates().length) errors.push("Catalogue de décors vide.");
      return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
    }
  });
})(window);
