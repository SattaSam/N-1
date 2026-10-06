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

  // Articles et accords sont attachés aux termes : aucun assemblage aléatoire
  // ne peut produire « Le Clairière » ou un pluriel avec un adjectif singulier.
  const BLUEFOX_BIOME_LEXICONS = Object.freeze({
    grassland: Object.freeze({ subjects: [["La Prairie", "f"], ["Le Vallon", "m"], ["Les Prés", "mp"], ["La Savane", "f"], ["Le Pâturage", "m"], ["Les Sillons", "mp"], ["La Lande", "f"], ["Le Coteau", "m"]], nouns: [["des Herbes", "fp"], ["des Graminées", "fp"], ["des Semences", "fp"], ["des Pousses", "fp"], ["du Foin", "m"], ["des Bourgeons", "mp"], ["des Tiges", "fp"], ["des Horizons", "mp"]] }),
    forest: Object.freeze({ subjects: [["La Clairière", "f"], ["Le Bois", "m"], ["La Canopée", "f"], ["Les Racines", "fp"], ["Le Sous-Bois", "m"], ["La Lisière", "f"], ["Le Bosquet", "m"], ["Les Ramures", "fp"]], nouns: [["des Mousses", "fp"], ["de la Sève", "f"], ["des Fougères", "fp"], ["des Brumes", "fp"], ["des Écorces", "fp"], ["des Lueurs", "fp"], ["des Feuillages", "mp"], ["des Frondaisons", "fp"]] }),
    rocky: Object.freeze({ subjects: [["La Crête", "f"], ["Le Défilé", "m"], ["Les Strates", "fp"], ["La Faille", "f"], ["Le Massif", "m"], ["Les Éboulis", "mp"], ["La Corniche", "f"], ["Le Promontoire", "m"]], nouns: [["des Schistes", "mp"], ["du Granit", "m"], ["des Roches", "fp"], ["des Galets", "mp"], ["des Fractures", "fp"], ["du Basalte", "m"], ["des Sédiments", "mp"], ["des Escarpements", "mp"]] }),
    aquatic: Object.freeze({ subjects: [["La Lagune", "f"], ["Le Marais", "m"], ["Les Rives", "fp"], ["Le Bassin", "m"], ["Le Delta", "m"], ["La Baie", "f"], ["Les Eaux", "fp"], ["Le Lagon", "m"]], nouns: [["des Roseaux", "mp"], ["des Reflets", "mp"], ["des Courants", "mp"], ["des Ondes", "fp"], ["des Algues", "fp"], ["des Remous", "mp"], ["des Sources", "fp"], ["des Marées", "fp"]] }),
    desert: Object.freeze({ subjects: [["La Dune", "f"], ["Le Désert", "m"], ["Les Sables", "mp"], ["Le Reg", "m"], ["Le Plateau", "m"], ["La Combe", "f"], ["Les Horizons", "mp"], ["Le Couloir", "m"]], nouns: [["des Mirages", "mp"], ["des Vents", "mp"], ["de la Poussière", "f"], ["du Sable", "m"], ["des Chaleurs", "fp"], ["des Grains", "mp"], ["des Ombres", "fp"], ["des Silences", "mp"]] }),
    crystalline: Object.freeze({ subjects: [["Le Prisme", "m"], ["La Veine", "f"], ["Les Facettes", "fp"], ["Le Filon", "m"], ["La Géode", "f"], ["Les Cristaux", "mp"], ["La Galerie", "f"], ["Le Seuil", "m"]], nouns: [["des Éclats", "mp"], ["des Résonances", "fp"], ["du Quartz", "m"], ["des Lumières", "fp"], ["des Reflets", "mp"], ["des Vibrations", "fp"], ["des Transparences", "fp"], ["des Étincelles", "fp"]] }),
    fungal: Object.freeze({ subjects: [["La Colonie", "f"], ["Le Jardin", "m"], ["Les Filaments", "mp"], ["La Futaie", "f"], ["Le Réseau", "m"], ["Les Anneaux", "mp"], ["La Nappe", "f"], ["Le Mycélium", "m"]], nouns: [["des Spores", "fp"], ["des Champignons", "mp"], ["des Hyphes", "fp"], ["des Lamelles", "fp"], ["des Chapeaux", "mp"], ["des Voiles", "mp"], ["des Sporophores", "mp"], ["des Lueurs", "fp"]] }),
    ruins: Object.freeze({ subjects: [["Le Sanctuaire", "m"], ["La Cour", "f"], ["Les Vestiges", "mp"], ["Le Passage", "m"], ["La Voûte", "f"], ["Les Arcades", "fp"], ["La Galerie", "f"], ["Le Portique", "m"]], nouns: [["des Fragments", "mp"], ["des Mémoires", "fp"], ["des Pierres", "fp"], ["des Stèles", "fp"], ["des Reliques", "fp"], ["des Inscriptions", "fp"], ["des Colonnes", "fp"], ["des Traces", "fp"]] }),
    frozen: Object.freeze({ subjects: [["Le Glacier", "m"], ["La Banquise", "f"], ["Les Crevasses", "fp"], ["Le Plateau", "m"], ["La Combe", "f"], ["Les Glaces", "fp"], ["La Plaine", "f"], ["Le Dôme", "m"]], nouns: [["du Givre", "m"], ["des Neiges", "fp"], ["des Flocons", "mp"], ["des Congères", "fp"], ["des Cristaux", "mp"], ["des Frimas", "mp"], ["des Brumes", "fp"], ["des Aiguilles", "fp"]] }),
    volcanic: Object.freeze({ subjects: [["La Caldeira", "f"], ["Le Cratère", "m"], ["Les Coulées", "fp"], ["La Forge", "f"], ["Le Volcan", "m"], ["Les Fumerolles", "fp"], ["La Chambre", "f"], ["Le Cône", "m"]], nouns: [["des Cendres", "fp"], ["des Braises", "fp"], ["de la Lave", "f"], ["des Scories", "fp"], ["des Roches", "fp"], ["des Chaleurs", "fp"], ["du Soufre", "m"], ["des Fissures", "fp"]] }),
    magnetic: Object.freeze({ subjects: [["Le Pôle", "m"], ["La Veine", "f"], ["Les Arches", "fp"], ["Le Champ", "m"], ["La Crête", "f"], ["Les Roches", "fp"], ["La Spirale", "f"], ["Le Seuil", "m"]], nouns: [["des Aimants", "mp"], ["des Attractions", "fp"], ["des Suspensions", "fp"], ["des Courbes", "fp"], ["des Alignements", "mp"], ["des Oscillations", "fp"], ["des Ferrites", "fp"], ["des Lévitations", "fp"]] }),
    electrical: Object.freeze({ subjects: [["Le Circuit", "m"], ["La Spirale", "f"], ["Les Arcs", "mp"], ["Le Nœud", "m"], ["La Trame", "f"], ["Les Sillons", "mp"], ["La Voûte", "f"], ["Le Réseau", "m"]], nouns: [["des Décharges", "fp"], ["des Pulsations", "fp"], ["des Conducteurs", "mp"], ["des Étincelles", "fp"], ["des Impulsions", "fp"], ["des Charges", "fp"], ["des Filaments", "mp"], ["des Signaux", "mp"]] }),
    city: Object.freeze({ subjects: [["La Place", "f"], ["Le Quartier", "m"], ["Les Avenues", "fp"], ["La Cité", "f"], ["Le Rempart", "m"], ["Les Passages", "mp"], ["La Cour", "f"], ["Le Faubourg", "m"]], nouns: [["des Colonnes", "fp"], ["des Portes", "fp"], ["des Escaliers", "mp"], ["des Façades", "fp"], ["des Voûtes", "fp"], ["des Jardins", "mp"], ["des Terrasses", "fp"], ["des Pavés", "mp"]] }),
    floating_islands: Object.freeze({ subjects: [["L’Îlot", "m"], ["La Terrasse", "f"], ["Les Arches", "fp"], ["Le Balcon", "m"], ["La Nacelle", "f"], ["Les Îles", "fp"], ["La Passerelle", "f"], ["Le Belvédère", "m"]], nouns: [["des Nuages", "mp"], ["des Suspensions", "fp"], ["des Hauteurs", "fp"], ["des Courants", "mp"], ["des Ciels", "mp"], ["des Brumes", "fp"], ["des Ascensions", "fp"], ["des Vents", "mp"]] }),
    curiosity: Object.freeze({ subjects: [["Le Domaine", "m"], ["La Frontière", "f"], ["Les Géométries", "fp"], ["Le Jardin", "m"], ["La Trame", "f"], ["Les Signes", "mp"], ["La Chambre", "f"], ["Le Seuil", "m"]], nouns: [["des Anomalies", "fp"], ["des Énigmes", "fp"], ["des Échos", "mp"], ["des Formes", "fp"], ["des Inversions", "fp"], ["des Reflets", "mp"], ["des Questions", "fp"], ["des Silhouettes", "fp"]] }),
  });
  const NAME_ADJECTIVES = Object.freeze([
    ["Paisible", "Paisible", "Paisibles", "Paisibles"],
    ["Secret", "Secrète", "Secrets", "Secrètes"],
    ["Lumineux", "Lumineuse", "Lumineux", "Lumineuses"],
    ["Profond", "Profonde", "Profonds", "Profondes"],
    ["Endormi", "Endormie", "Endormis", "Endormies"],
    ["Silencieux", "Silencieuse", "Silencieux", "Silencieuses"],
    ["Lointain", "Lointaine", "Lointains", "Lointaines"],
    ["Oublié", "Oubliée", "Oubliés", "Oubliées"]
  ]);
  const nameKey = value => String(value || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr")
    .replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
  const validHumanName = value => Boolean(String(value || "").trim()) &&
    !/\d|(?:^|\s)(?:generated-|map[-_]|scene[-_])|\.(?:png|webp|jpg)$/i.test(String(value));
  const readNameAliases = () => {
    try {
      const value = JSON.parse(global.localStorage.getItem("bluefox_map_names_v1") || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  };
  // Le nom humain n'est pas une règle de peuplement. Les maps historiques
  // renommées gardent exactement leur ancien contexte ; les nouvelles utilisent
  // le contexte du template choisi, indépendant du vocabulaire d'affichage.
  const populationDefinition = definition => definition?.generator?.namingContextName
    ? { ...definition, name: definition.generator.namingContextName }
    : definition;

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

  const usedGeneratedNames = (excludeId = null) => new Set([
    ...readDefinitions(), ...Object.values(BF.maps || {}),
    ...Object.entries(readNameAliases()).map(([id, name]) => ({ id, name }))
  ].filter(entry => entry?.id !== excludeId).map(entry => nameKey(entry?.name)).filter(Boolean));

  const blueFoxName = (definition, template, profile, seed, biomeId) => {
    const lexiconId = BLUEFOX_BIOME_LEXICONS[biomeId] ? biomeId
      : BLUEFOX_BIOME_LEXICONS[profile] ? profile : "curiosity";
    const lexicon = BLUEFOX_BIOME_LEXICONS[lexiconId];
    const used = usedGeneratedNames(definition.id);
    const ordinal = Number(definition.generator?.ordinal) || Infinity;
    const recent = readDefinitions().filter(entry => entry.id !== definition.id &&
      entry.generator?.nameLexicon?.biome === lexiconId &&
      (Number(entry.generator?.ordinal) || 0) < ordinal)
      .sort((a, b) => (Number(a.generator?.ordinal) || 0) - (Number(b.generator?.ordinal) || 0))
      .slice(-3).map(entry => entry.generator.nameLexicon);
    const agreement = (adjective, gender) => NAME_ADJECTIVES[adjective][["m", "f", "mp", "fp"].indexOf(gender)];
    const count = lexicon.subjects.length * lexicon.nouns.length * NAME_ADJECTIVES.length * 4;
    const start = hash(seed, biomeId, template?.id, "name") % count;
    // Le pas impair parcourt tout cet espace de taille puissance de deux.
    for (let tier = 0; tier <= NAME_ADJECTIVES.length; tier += 1) {
      for (let relax = 0; relax < 2; relax += 1) {
        for (let offset = 0; offset < count; offset += 1) {
          let index = (start + offset * 131) % count;
          const pattern = index % 4; index = Math.floor(index / 4);
          const adjective = index % NAME_ADJECTIVES.length; index = Math.floor(index / NAME_ADJECTIVES.length);
          const nounIndex = index % lexicon.nouns.length;
          const subjectIndex = Math.floor(index / lexicon.nouns.length);
          const [subject, subjectGender] = lexicon.subjects[subjectIndex];
          const [noun, nounGender] = lexicon.nouns[nounIndex];
          const subjectTerm = nameKey(subject), nounTerm = nameKey(noun);
          if (!relax && recent.some(entry => entry.subject === subjectTerm || entry.noun === nounTerm)) continue;
          const names = [
            `${subject} ${noun}`,
            `${subject} ${agreement(adjective, subjectGender)}`,
            `${subject} ${noun} ${agreement(adjective, nounGender)}`,
            `${subject} ${agreement(adjective, subjectGender)} ${noun}`
          ];
          const name = tier
            ? `${subject} ${agreement(adjective, subjectGender)} ${noun} ${agreement((adjective + tier) % NAME_ADJECTIVES.length, nounGender)}`
            : names[pattern];
          if (used.has(nameKey(name))) continue;
          return { name, source: "bluefox", nameLexicon: {
            biome: lexiconId, subject: subjectTerm, noun: !tier && pattern === 1 ? null : nounTerm
          } };
        }
      }
    }
    throw new Error("Le champ lexical de ce biome est entièrement utilisé.");
  };

  const resolvedMapName = (definition, template, profile, seed, options = {}) => {
    const source = definition?.generator?.nameSource;
    const biomeId = options.biomeId || definition.generator?.biomeId || profile;
    const preserve = options.preserveName === true || source === "custom" || source === "bluefox" ||
      definition.customName === true || definition.nameLocked === true;
    const explicit = definition.customName === true || definition.nameLocked === true || source === "custom";
    if (preserve && definition.name && (explicit || validHumanName(definition.name)) &&
        (!definition.generator?.nameLexicon || definition.generator.nameLexicon.biome === biomeId || explicit)) {
      return { name: definition.name, source: source || "custom", nameLexicon: definition.generator?.nameLexicon };
    }
    return blueFoxName(definition, template, profile, seed, biomeId);
  };

  const resolveName = (definition, options = {}) => {
    if (!definition) return "";
    const aliases = readNameAliases();
    const name = aliases[definition.id] || definition.name;
    const explicit = definition.customName === true || definition.nameLocked === true || definition.generator?.nameSource === "custom";
    if (explicit || validHumanName(name)) {
      definition.name = name;
      return name;
    }
    definition.generator ||= {};
    definition.generator.namingContextName ||= name || definition.generator.baseTemplateName || definition.profile;
    const naming = blueFoxName(definition, { id: definition.generator.templateId || definition.id },
      definition.profile, Number(definition.seed) || hash(definition.id), definition.generator.biomeId);
    definition.name = naming.name;
    definition.generator.nameSource = naming.source;
    definition.generator.nameLexicon = naming.nameLexicon;

    aliases[definition.id] = naming.name;
    global.localStorage.setItem("bluefox_map_names_v1", JSON.stringify(aliases));
    const saved = readDefinitions();
    const index = saved.findIndex(entry => entry.id === definition.id);
    if (index >= 0) { saved[index] = clone(definition); saveDefinitions(saved); }
    return definition.name;
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

    const samePhysicalIdentity = definition.generator?.biomeId === biomeId &&
      definition.generator?.templateId === template.id;
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
      { ...options, biomeId }
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
    definition.generator.baseTemplateName = populationDefinition(template).name || null;
    definition.generator.nameSource = naming.source;
    definition.generator.nameLexicon = naming.nameLexicon;
    if (naming.nameLexicon && (!definition.generator.namingContextName || !samePhysicalIdentity)) {
      definition.generator.namingContextName = populationDefinition(template).name || draft.profile;
    }
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
        (Number(definition.generator?.visualIdentityVersion || 0) < VISUAL_IDENTITY_VERSION ||
          definition.generator?.templateId === "custom-map-29-place-fixe-camp")
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

      resolveName(definition);
      BF.maps[definition.id] = definition;
      healed.push(clone(definition));
      restored.push(definition.id);
    });

    if (migrated || JSON.stringify(savedDefinitions) !== JSON.stringify(healed)) saveDefinitions(healed);
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
    resolveName,
    populationDefinition,
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
