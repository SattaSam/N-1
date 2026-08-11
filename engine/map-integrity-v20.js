(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (BF.MapIntegrity?.version === "20.0-test") return;

  const HARD_FALLBACKS = Object.freeze([
    "./Images/028_1.png",
    "./Images/028_2.png",
    "./Images/028_3.png"
  ]);

  const LAYOUTS = Object.freeze({
    1: Object.freeze([[0, 0]]),
    2: Object.freeze([[0, 27], [0, -27]]),
    3: Object.freeze([[-54, 0], [0, 0], [54, 0]]),
    4: Object.freeze([[-27, 27], [27, 27], [-27, -27], [27, -27]]),
    5: Object.freeze([[-54, 27], [0, 27], [54, 27], [-27, -27], [27, -27]]),
    6: Object.freeze([[-54, 27], [0, 27], [54, 27], [-54, -27], [0, -27], [54, -27]])
  });

  const clampCount = (value) =>
    Math.max(1, Math.min(6, Math.round(Number(value) || 1)));

  const GENERATION_COUNTS = Object.freeze([1, 2, 3, 4, 6]);

  const normalizeGeneratedCount = (value) => {
    const count = clampCount(value);
    return count === 5 ? 6 : count;
  };

  const clone = (value) =>
    value == null ? value : JSON.parse(JSON.stringify(value));

  const mapPalette = (profile) => ({
    volcanic: { ground: 0x4c2928, accent: 0xff7247 },
    frozen: { ground: 0x718b9d, accent: 0xbcefff },
    forest: { ground: 0x47644f, accent: 0x79f0b2 },
    ruins: { ground: 0x4c5e58, accent: 0x72e5bd },
    aquatic: { ground: 0x386476, accent: 0x63dcff },
    desert: { ground: 0x806451, accent: 0xffbd75 },
    crystalline: { ground: 0x586b82, accent: 0x75e8ff },
    alien: { ground: 0x5b526f, accent: 0xc795ff }
  })[profile] || { ground: 0x5b526f, accent: 0xc795ff };

  const mapTraits = (map) =>
    new Set((map?.traits || []).map((trait) => trait?.id).filter(Boolean));

  const templateForBiome = (biomeId, seed = 1) => {
    const rules = BF.MapGenerationRules;
    const draft = rules?.toLegacyBiomeDraft?.(biomeId);
    if (!draft) return null;

    const candidates = Object.values(BF.maps || {}).filter((map) =>
      map?.id &&
      map.id !== "crystal" &&
      !map.generated &&
      map.sceneUrl &&
      (map.terrainUrls?.length || map.terrainUrl)
    );

    if (!candidates.length) return null;

    const scored = candidates.map((map) => {
      const traits = mapTraits(map);
      let score = 1;
      if (traits.has(biomeId)) score = 6;
      else if (map.profile === draft.profile) score = 3;
      return { map, score };
    });

    const best = Math.max(...scored.map((entry) => entry.score));
    const pool = scored.filter((entry) => entry.score === best);
    return pool[Math.abs(Number(seed) || 1) % pool.length]?.map || null;
  };

  const sourcesOf = (definition, template) => [
    ...(definition?.terrainUrls || []),
    definition?.terrainUrl,
    ...(template?.terrainUrls || []),
    template?.terrainUrl
  ].filter(Boolean);

  const prepareDefinition = (definition, options = {}) => {
    if (!definition) return definition;

    const requestedCount =
      options.plateauCount === "random" || options.plateauCount == null
        ? (definition.plateauCount || definition.terrainUrls?.length || 1)
        : options.plateauCount;

    const count =
      options.preserveLegacyFive === true
        ? clampCount(requestedCount)
        : normalizeGeneratedCount(requestedCount);
    let template = null;

    if (options.biome && options.biome !== "random") {
      const rules = BF.MapGenerationRules;
      const draft = rules?.toLegacyBiomeDraft?.(options.biome);
      if (draft) {
        template = templateForBiome(options.biome, definition.seed);
        definition.profile = draft.profile;
        definition.traits = clone(draft.traits);
        definition.palette = clone(template?.palette || mapPalette(draft.profile));
        definition.description =
          `${rules.getBiome?.(options.biome)?.label || options.biome} généré pour une mission.`;
        definition.generator ||= {};
        definition.generator.biomeId = options.biome;
        definition.generator.resourceFamilies = [...draft.resourceFamilies];
        definition.generator.microSceneIds = [...draft.microSceneIds];

        if (template?.sceneUrl) {
          definition.sceneUrl = template.sceneUrl;
          definition.sceneVariants = clone(template.sceneVariants || []);
          definition.generator.templateId = template.id;
          definition.generator.templateNumber = template.number;
        }
      }
    }

    const associatedTerrains = [...new Set(sourcesOf(definition, template))];

    /*
     * Politique terrain :
     * 1. utiliser uniquement les textures associées à la map / au modèle ;
     * 2. si elles sont moins nombreuses que les plateaux, répéter les motifs ;
     * 3. 028_1 / 028_2 / 028_3 ne complètent jamais une map normale ;
     * 4. elles ne servent qu'en secours de chargement, ou si aucune texture
     *    associée n'existe du tout.
     */
    const terrainCycle = associatedTerrains.length
      ? associatedTerrains
      : [...HARD_FALLBACKS];

    definition.plateauCount = count;
    definition.terrainUrls = Array.from(
      { length: count },
      (_, index) => terrainCycle[index % terrainCycle.length]
    );
    definition.terrainUrl = definition.terrainUrls[0];
    definition.zones = Array.from({ length: count }, (_, index) => `Plateau ${index + 1}`);
    definition.generator ||= {};
    definition.generator.integrityVersion = "20.0-test";
    definition.generator.topologyContract = "plateauCount=terrainUrls=zones=walkableRegions";
    definition.generator.hardTerrainFallbacks = [...HARD_FALLBACKS];
    definition.generator.terrainPolicy = associatedTerrains.length
      ? "associated-textures-repeat-then-hard-fallback-on-load-error"
      : "hard-fallback-no-associated-texture";

    return definition;
  };

  const persistGeneratedDefinition = (definition) => {
    if (!definition?.generated || !BF.MapGenerator?.storageKey) return false;
    try {
      const key = BF.MapGenerator.storageKey;
      const current = JSON.parse(global.localStorage.getItem(key) || "[]");
      const list = Array.isArray(current) ? current : [];
      const next = list.filter((entry) => entry?.id !== definition.id);
      next.push(clone(definition));
      global.localStorage.setItem(key, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  };

  // Hard fallback at actual texture-load time. This is the missing part:
  // map-assets already declares 028_1/2/3, but buildMap previously never
  // retried them after the requested source had failed.
  if (
    global.BLUEFOX_MAP_ASSETS?.imageUrlCandidates &&
    !global.BLUEFOX_MAP_ASSETS.__hardFallbackV20
  ) {
    const assets = global.BLUEFOX_MAP_ASSETS;
    const originalCandidates = assets.imageUrlCandidates.bind(assets);
    assets.imageUrlCandidates = (source) => {
      const result = [
        ...originalCandidates(source),
        ...HARD_FALLBACKS.flatMap((fallback) => originalCandidates(fallback))
      ];
      return [...new Set(result.filter(Boolean))];
    };
    assets.__hardFallbackV20 = true;
  }

  // ObjectSpawner currently uses the global bounding rectangle for its
  // "mapEdge" branch. On a 5-plateau 3+2 layout this rectangle contains two
  // areas where no plateau exists. Remove any population record that ended
  // outside every true zone region.
  const Spawner = BF.ObjectSpawner;
  if (Spawner?.prototype && !Spawner.prototype.__plateauGuardV20) {
    const originalPopulateMap = Spawner.prototype.populateMap;

    Spawner.prototype.populateMap = function populateMapOnRealPlateaus(options = {}) {
      const before = this.instances.length;
      const result = originalPopulateMap.call(this, options);
      const regions = options.zoneRegions || [];

      if (!regions.length) return result;

      const insideAnyRegion = (record) => {
        const x = Number(record?.position?.x);
        const z = Number(record?.position?.z);
        if (!Number.isFinite(x) || !Number.isFinite(z)) return true;

        const radius = Math.max(
          0.1,
          Number(BF.ObjectLibrary?.getMapPlacement?.(record.type)?.radius) || 0.5
        );
        const margin = radius + 0.2;

        return regions.some((region) => {
          const half = Number(region.halfSize) || 27;
          const cx = Number(region.center?.x) || 0;
          const cz = Number(region.center?.z) || 0;
          return (
            x >= cx - half + margin &&
            x <= cx + half - margin &&
            z >= cz - half + margin &&
            z <= cz + half - margin
          );
        });
      };

      const created = this.instances.slice(before);
      const invalid = created.filter((record) => !insideAnyRegion(record));

      invalid.forEach((record) => {
        record.root?.removeFromParent?.();

        if (Array.isArray(options.interactables) && record.instance?.hitbox) {
          const at = options.interactables.indexOf(record.instance.hitbox);
          if (at >= 0) options.interactables.splice(at, 1);
        }

        if (Array.isArray(options.colliders)) {
          for (let i = options.colliders.length - 1; i >= 0; i -= 1) {
            if (options.colliders[i]?.owner === record.root) {
              options.colliders.splice(i, 1);
            }
          }
        }

        if (Array.isArray(options.animatedObjects)) {
          for (let i = options.animatedObjects.length - 1; i >= 0; i -= 1) {
            if (options.animatedObjects[i]?.root === record.root) {
              options.animatedObjects.splice(i, 1);
            }
          }
        }

        const index = this.instances.indexOf(record);
        if (index >= 0) this.instances.splice(index, 1);
      });

      if (result && typeof result === "object") {
        result.removedOutsidePlateaus = invalid.length;
      }
      return result;
    };

    Spawner.prototype.__plateauGuardV20 = true;
  }

  // BuildMap contract: the map definition is normalized before construction.
  // The historical rectangular WalkableGround remains available for raycast
  // compatibility but is visually transparent. Only actual plateau meshes
  // define the visible terrain.
  if (typeof BF.buildMap === "function" && !BF.buildMap.__integrityV20) {
    const previousBuildMap = BF.buildMap;

    const wrapped = function buildMapIntegrityV20(THREE, definition, assets, renderer) {
      prepareDefinition(definition);
      const built = previousBuildMap(THREE, definition, assets, renderer);

      if (built?.ground?.material) {
        built.ground.material.transparent = true;
        built.ground.material.opacity = 0;
        built.ground.material.depthWrite = false;
        built.ground.userData.visualBackgroundOnly = true;
      }

      built.definition = definition;
      return built;
    };

    wrapped.__integrityV20 = true;
    BF.buildMap = wrapped;
  }

  BF.MapIntegrity = Object.freeze({
    version: "20.0-test",
    hardFallbacks: HARD_FALLBACKS,
    layouts: LAYOUTS,
    clampCount,
    generationCounts: GENERATION_COUNTS,
    normalizeGeneratedCount,
    prepareDefinition,
    templateForBiome,
    persistGeneratedDefinition
  });
})(window);
