(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};

  const BUILTIN_TEMPLATES = Object.freeze({
    ecological_lunar_edge: Object.freeze({ id: "MSC-ECO-LUNAR-001", biomes: Object.freeze(["forest", "jungle", "swamp", "alien"]), rarity: "common", radius: 7, objects: Object.freeze([Object.freeze({ type: "lunar_vine", offset: [0,0,0], variant: 1 }), Object.freeze({ type: "lunar_vine", offset: [1.8,0,1.1], variant: 0 }), Object.freeze({ type: "fern", offset: [-1.1,0,-0.9], variant: 1 }), Object.freeze({ type: "lantern_mushrooms", offset: [-1.5,0,0.8], variant: 1 }), Object.freeze({ type: "strong_rock", offset: [2.6,0,-1.5], variant: 2 }), Object.freeze({ type: "large_rock", offset: [-3.1,0,-1.4], variant: 1 })]) }),
    thermal_vein: Object.freeze({ id: "MSC-ECO-THERM-001", biomes: Object.freeze(["volcanic", "cave", "mountain", "frozen"]), rarity: "uncommon", radius: 8, objects: Object.freeze([Object.freeze({ type: "resonant_basalt", offset: [0,0,0], variant: 1 }), Object.freeze({ type: "thermosap_moss", offset: [1.4,0,0.7], variant: 2 }), Object.freeze({ type: "thermosap_moss", offset: [-1.2,0,1.2], variant: 0 }), Object.freeze({ type: "strong_rock", offset: [2.8,0,-1.4], variant: 3 }), Object.freeze({ type: "large_rock", offset: [-3.2,0,-1.7], variant: 2 })]) }),
    stellar_impact: Object.freeze({ id: "MSC-ECO-STAR-001", biomes: Object.freeze(["crystalline", "magnetic", "volcanic", "ruins"]), rarity: "rare", radius: 10, objects: Object.freeze([Object.freeze({ type: "stellar_iridium", offset: [0,0,0], variant: 2 }), Object.freeze({ type: "strong_rock", offset: [2.2,0,1.7], variant: 4 }), Object.freeze({ type: "large_rock", offset: [-2.9,0,1.3], variant: 3 }), Object.freeze({ type: "crystal", offset: [1.3,0,-2.1], variant: 1 }), Object.freeze({ type: "eroded_monolith", offset: [-3.5,0,-2.4], variant: 0 })]) }),
    broken_relay: Object.freeze({ id: "MSC-TECH-RELAY-001", biomes: Object.freeze(["ruins", "desert", "alien"]), rarity: "uncommon", radius: 8, objects: Object.freeze([Object.freeze({ type: "survey_beacon", offset: [0,0,0], variant: 1 }), Object.freeze({ type: "relay_block", offset: [1.4,0,0.8], variant: 0 }), Object.freeze({ type: "pulse_core", offset: [-1.2,0,1], variant: 1 }), Object.freeze({ type: "memory_capsule", offset: [0.7,0,-1.4], variant: 2 }), Object.freeze({ type: "debris", offset: [-2.3,0,-1.6], variant: 1 }), Object.freeze({ type: "strong_rock", offset: [3,0,-1.3], variant: 2 })]) }),
    fossil_passage: Object.freeze({ id: "MSC-ECO-FOSSIL-001", biomes: Object.freeze(["forest", "swamp", "desert", "alien"]), rarity: "rare", radius: 10, objects: Object.freeze([Object.freeze({ type: "fossil_root_arch", offset: [0,0,0], variant: 0 }), Object.freeze({ type: "abandoned_nest", offset: [2.4,0,1.8], variant: 1 }), Object.freeze({ type: "lantern_mushrooms", offset: [-2.2,0,1.2], variant: 0 }), Object.freeze({ type: "strong_rock", offset: [3.5,0,-2.2], variant: 4 }), Object.freeze({ type: "large_rock", offset: [-3.8,0,-2.1], variant: 2 })]) }),
    fern_clearing: Object.freeze({
      id: "MSC-FERN-CLEARING-001", biomes: Object.freeze(["forest", "jungle", "swamp"]), rarity: "common", radius: 7,
      objects: Object.freeze([
        Object.freeze({ type: "fern", offset: [0, 0, 0], variant: 2 }),
        Object.freeze({ type: "fern", offset: [1.6, 0, 0.9], variant: 0 }),
        Object.freeze({ type: "fern", offset: [-1.5, 0, 1.1], variant: 1 }),
        Object.freeze({ type: "fern", offset: [0.9, 0, -1.6], variant: 2 }),
        Object.freeze({ type: "fern", offset: [-1.8, 0, -1.3], variant: 0 }),
        Object.freeze({ type: "lunar_vine", offset: [2.8, 0, -0.5], variant: 1 }),
        Object.freeze({ type: "lantern_mushrooms", offset: [-2.7, 0, 0.2], variant: 0 }),
        Object.freeze({ type: "strong_rock", offset: [0.2, 0, 2.7], variant: 1 })
      ])
    }),
    crystal_grove: Object.freeze({
      id: "MSC-CRYSTAL-GROVE-001", biomes: Object.freeze(["all"]), rarity: "uncommon", radius: 5,
      objects: Object.freeze([
        Object.freeze({ type: "crystal", offset: [0, 0, 0], variant: 1 }),
        Object.freeze({ type: "needle", offset: [1.4, 0, 0.8], variant: 2 }),
        Object.freeze({ type: "needle", offset: [-1.2, 0, 1.1], variant: 0 }),
        Object.freeze({ type: "needle", offset: [0.5, 0, -1.5], variant: 1 }),
        Object.freeze({ type: "rock", offset: [-2, 0, -0.7], variant: 0 })
      ])
    }),
    ancient_gateway: Object.freeze({
      id: "MSC-ANCIENT-GATEWAY-001", biomes: Object.freeze(["ruins", "desert", "mountain", "forest"]), rarity: "rare", radius: 9,
      objects: Object.freeze([
        Object.freeze({ type: "arch", offset: [0, 0, 0], variant: 0 }),
        Object.freeze({ type: "debris", offset: [-2.8, 0, 1.6], variant: 1 }),
        Object.freeze({ type: "debris", offset: [2.5, 0, -1.4], variant: 0 }),
        Object.freeze({ type: "stele", offset: [4.2, 0, 2.5], variant: 1 })
      ])
    }),
    luminous_oasis: Object.freeze({
      id: "MSC-LUMINOUS-OASIS-001", biomes: Object.freeze(["swamp", "forest", "cave", "coast"]), rarity: "rare", radius: 8,
      objects: Object.freeze([
        Object.freeze({ type: "pool", offset: [0, 0, 0], variant: 0 }),
        Object.freeze({ type: "spore", offset: [2.2, 0, 1.1], variant: 1 }),
        Object.freeze({ type: "spore", offset: [-2.1, 0, 0.8], variant: 0 }),
        Object.freeze({ type: "fern", offset: [1.5, 0, -2], variant: 1 }),
        Object.freeze({ type: "fern", offset: [-1.6, 0, -1.7], variant: 2 }),
        Object.freeze({ type: "fiber", offset: [-1.4, 0, -2.2], variant: 0 })
      ])
    }),
    ruined_shrine: Object.freeze({
      id: "MSC-RUINED-SHRINE-001", biomes: Object.freeze(["ruins", "desert", "forest", "mountain"]), rarity: "uncommon", radius: 7,
      objects: Object.freeze([
        Object.freeze({ type: "stele", offset: [0, 0, 0], variant: 0 }),
        Object.freeze({ type: "debris", offset: [-1.8, 0, 1.5], variant: 0 }),
        Object.freeze({ type: "debris", offset: [1.9, 0, 1.2], variant: 1 }),
        Object.freeze({ type: "debris", offset: [0.6, 0, -2], variant: 2 }),
        Object.freeze({ type: "needle", offset: [-2.4, 0, -1.5], variant: 1 })
      ])
    }),
    conifer_edge: Object.freeze({
      id: "MSC-CONIFER-EDGE-001", biomes: Object.freeze(["default", "forest", "jungle", "mountain", "alien"]), rarity: "common", radius: 7,
      objects: Object.freeze([
        Object.freeze({ type: "nature_tree", offset: [0, 0, 0], variant: 1 }),
        Object.freeze({ type: "nature_tree", offset: [-2.4, 0, 1.7], variant: 0 }),
        Object.freeze({ type: "fern", offset: [1.7, 0, 1.3], variant: 2 }),
        Object.freeze({ type: "fern", offset: [-0.8, 0, -1.6], variant: 0 }),
        Object.freeze({ type: "rock", offset: [2.6, 0, -1.5], variant: 0 })
      ])
    }),
    cactus_grove: Object.freeze({
      id: "MSC-CACTUS-GROVE-001", biomes: Object.freeze(["default", "jungle", "desert", "alien"]), rarity: "common", radius: 7,
      objects: Object.freeze([
        Object.freeze({ type: "cactus", offset: [0, 0, 0], variant: 1 }),
        Object.freeze({ type: "cactus", offset: [2.5, 0, 1.4], variant: 0 }),
        Object.freeze({ type: "needle", offset: [-1.7, 0, 1.2], variant: 2 }),
        Object.freeze({ type: "rock", offset: [-2.4, 0, -1.5], variant: 1 })
      ])
    }),
    peaceful_fauna: Object.freeze({
      id: "MSC-PEACEFUL-FAUNA-001", biomes: Object.freeze(["forest", "jungle", "desert", "alien"]), rarity: "uncommon", radius: 8,
      objects: Object.freeze([
        Object.freeze({ type: "brouteur", offset: [0, 0, 0], variant: 0 }),
        Object.freeze({ type: "sauteur", offset: [2.2, 0, 1.3], variant: 1 }),
        Object.freeze({ type: "small_creature", offset: [-1.8, 0, 1.1], variant: 0 }),
        Object.freeze({ type: "patte_creature", offset: [-2.5, 0, -1.8], variant: 1 })
      ])
    }),
    fauna_tool_use: Object.freeze({
      id: "MSC-FAUNA-TOOL-USE-001",
      name: "FAU-10 · Utilisation d’outil",
      biomes: Object.freeze(["all"]),
      rarity: "story",
      missionOnly: true,
      missionId: "FAU-10",
      radius: 5,
      objects: Object.freeze([
        Object.freeze({ type: "brouteur", offset: [-1.55, 0, 0], variant: 0 }),
        Object.freeze({ type: "fauna_straw_ball", offset: [0, 0, 0], variant: 0 })
      ])
    }),
    translucent_encounter: Object.freeze({
      id: "MSC-NPC-TRANSLUCENT-001", biomes: Object.freeze(["crystalline", "aquatic", "alien"]), rarity: "story", radius: 8,
      objects: Object.freeze([
        Object.freeze({ type: "npc_translucent", offset: [0, 0.75, 0], variant: 0 }),
        Object.freeze({ type: "crystal", offset: [-1.8, 0, 1.4], variant: 1 }),
        Object.freeze({ type: "spore", offset: [1.7, 0, -1.2], variant: 0 })
      ])
    }),
    rocky_encounter: Object.freeze({
      id: "MSC-NPC-ROCKY-001", biomes: Object.freeze(["mountain", "desert", "ruins", "alien"]), rarity: "story", radius: 8,
      objects: Object.freeze([
        Object.freeze({ type: "npc_rocky", offset: [0, 0, 0], variant: 0 }),
        Object.freeze({ type: "rock", offset: [-2.1, 0, 1.4], variant: 1 }),
        Object.freeze({ type: "stele", offset: [2, 0, -1.3], variant: 0 })
      ])
    }),
    charged_crystals: Object.freeze({
      id: "MSC-CHARGED-CRYSTALS-001", biomes: Object.freeze(["crystalline", "desert", "magnetic", "electrical", "alien"]), rarity: "rare", radius: 7,
      objects: Object.freeze([
        Object.freeze({ type: "energy_crystal", offset: [0, 0, 0], variant: 0 }),
        Object.freeze({ type: "crystal", offset: [-1.8, 0, 1.2], variant: 1 }),
        Object.freeze({ type: "needle", offset: [1.6, 0, 1.4], variant: 2 }),
        Object.freeze({ type: "rock", offset: [2.2, 0, -1.5], variant: 0 })
      ])
    }),
    abandoned_drone_site: Object.freeze({
      id: "MSC-ABANDONED-DRONE-001", biomes: Object.freeze(["ruins", "desert", "city", "magnetic", "electrical", "alien"]), rarity: "rare", radius: 8,
      objects: Object.freeze([
        Object.freeze({ type: "abandoned_drone", offset: [0, 0, 0], variant: 0 }),
        Object.freeze({ type: "debris", offset: [-2, 0, 1.3], variant: 2 }),
        Object.freeze({ type: "debris", offset: [2.1, 0, -1], variant: 1 }),
        Object.freeze({ type: "magnetic_ore", offset: [-2.4, 0, -1.8], variant: 0 })
      ])
    }),
    nocturnal_den: Object.freeze({
      id: "MSC-NOCTURNAL-DEN-001", biomes: Object.freeze(["forest", "jungle", "swamp", "desert", "alien"]), rarity: "uncommon", radius: 8,
      objects: Object.freeze([
        Object.freeze({ type: "nocturnal_animal", offset: [0, 0, 0], variant: 0 }),
        Object.freeze({ type: "spore", offset: [-1.7, 0, 1.2], variant: 1 }),
        Object.freeze({ type: "fern", offset: [1.8, 0, 1.1], variant: 2 }),
        Object.freeze({ type: "fern", offset: [-1.4, 0, -1.2], variant: 1 }),
        Object.freeze({ type: "rock", offset: [0.7, 0, -2.1], variant: 1 })
      ])
    }),
    local_storm: Object.freeze({
      id: "MSC-LOCAL-STORM-001", biomes: Object.freeze(["magnetic", "electrical", "crystalline", "alien"]), rarity: "rare", radius: 11,
      objects: Object.freeze([
        Object.freeze({ type: "electrostatic_storm", offset: [0, 0, 0], variant: 0 }),
        Object.freeze({ type: "magnetic_ore", offset: [-4.2, 0, 2.6], variant: 1 }),
        Object.freeze({ type: "rock", offset: [4.4, 0, -2.2], variant: 2 })
      ])
    }),
    suspended_island: Object.freeze({
      id: "MSC-SUSPENDED-ISLAND-001", biomes: Object.freeze(["floating_islands", "mountain", "magnetic", "alien"]), rarity: "rare", radius: 11,
      objects: Object.freeze([
        Object.freeze({ type: "mobile_islet", offset: [0, 0, 0], variant: 0 }),
        Object.freeze({ type: "crystal", offset: [-4.1, 0, 2.4], variant: 2 }),
        Object.freeze({ type: "frond", offset: [4, 0, -2.5], variant: 1 })
      ])
    }),
    predator_flora: Object.freeze({
      id: "MSC-PREDATOR-FLORA-001", biomes: Object.freeze(["forest", "jungle", "swamp", "fungal", "alien"]), rarity: "uncommon", radius: 8,
      objects: Object.freeze([
        Object.freeze({ type: "carnivorous_plant", offset: [0, 0, 0], variant: 0 }),
        Object.freeze({ type: "carnivorous_plant", offset: [2.8, 0, 1.5], variant: 1 }),
        Object.freeze({ type: "fiber", offset: [-2, 0, 1.2], variant: 0 }),
        Object.freeze({ type: "spore", offset: [-1.2, 0, -2], variant: 2 })
      ])
    }),
    drone_workshop: Object.freeze({
      id: "MSC-DRONE-WORKSHOP-001", biomes: Object.freeze(["all"]), rarity: "constructed", radius: 8,
      objects: Object.freeze([
        Object.freeze({ type: "scout_drone", offset: [-1.8, 0, 0], variant: 0 }),
        Object.freeze({ type: "harvest_drone", offset: [1.8, 0, 0], variant: 0 }),
        Object.freeze({ type: "wood_plane", offset: [0, 0, -2.2], variant: 1 }),
        Object.freeze({ type: "wall", offset: [0, 0, 2.8], variant: 0 })
      ])
    }),
    shelter_camp: Object.freeze({
      id: "MSC-SHELTER-CAMP-001", biomes: Object.freeze(["all"]), rarity: "constructed", radius: 9,
      objects: Object.freeze([
        Object.freeze({ type: "toile", offset: [0, 0, 0], variant: 0 }),
        Object.freeze({ type: "base_fire", offset: [3.1, 0, 1.7], variant: 1 }),
        Object.freeze({ type: "wall", offset: [-3.4, 0, 0], variant: 0 }),
        Object.freeze({ type: "wood_plane", offset: [2.8, 0, -1.8], variant: 1 })
      ])
    })
  });

  const CUSTOM_TEMPLATES = Object.freeze(Object.fromEntries(
    (Array.isArray(global.BlueFoxCustomMicroScenes) ? global.BlueFoxCustomMicroScenes : [])
      .filter((template) =>
        /^MSC-CUSTOM-[A-Z0-9-]+$/.test(template?.id || "") &&
        Array.isArray(template?.objects) &&
        template.objects.length > 0
      )
      .map((template) => {
        const key = String(template.key || template.id).toLowerCase().replace(/[^a-z0-9_]+/g, "_");
        return [key, Object.freeze({
          id: template.id,
          name: String(template.name || template.id),
          biomes: Object.freeze([...(template.biomes || ["all"])]),
          rarity: template.rarity || "custom",
          radius: Math.max(1, Number(template.radius) || 1),
          custom: true,
          objects: Object.freeze(template.objects.map((entry) => Object.freeze({
            type: entry.type,
            offset: Object.freeze([...(entry.offset || [0, 0, 0])].map((value) => Number(value) || 0)),
            variant: Math.max(0, Number(entry.variant) || 0),
            rotation: Object.freeze([...(entry.rotation || [0, 0, 0])].map((value) => Number(value) || 0))
          })))
        })];
      })
  ));

  const TEMPLATES = Object.freeze({ ...BUILTIN_TEMPLATES, ...CUSTOM_TEMPLATES });

  const MAP_LANDMARKS = Object.freeze({
    volcanic: Object.freeze([["rock", -1.25, 0.25, 2], ["rock", 1.1, 0.5, 1], ["needle", 0, -0.45, 2], ["debris", 0.2, 1.25, 0]].map(Object.freeze)),
    frozen: Object.freeze([["needle", 0, 0, 2], ["needle", -1.15, 0.8, 1], ["needle", 1.2, 0.65, 0], ["rock", 0.15, 1.55, 1]].map(Object.freeze)),
    forest: Object.freeze([["tree", 0, 0, 1], ["spore", -1.45, 0.85, 2], ["spore", 1.35, 0.9, 1], ["frond", 0.25, -1.45, 2]].map(Object.freeze)),
    ruins: Object.freeze([["tech_relic", 0, 0, 1], ["stele", -1.35, 0.75, 1], ["debris", 1.3, 0.65, 1], ["debris", 0.2, -1.25, 0]].map(Object.freeze)),
    aquatic: Object.freeze([["pool", 0, 0, 1], ["spore", -1.8, 0.9, 2], ["spore", 1.75, 0.8, 1], ["frond", 0.15, -1.9, 2]].map(Object.freeze)),
    desert: Object.freeze([["tech_relic", 0, 0, 0], ["stele", -1.45, 0.85, 2], ["rock", 1.5, 0.7, 1], ["debris", 0.35, -1.35, 2]].map(Object.freeze)),
    crystalline: Object.freeze([["needle", 0, 0, 2], ["needle", -1.35, 0.75, 1], ["needle", 1.4, 0.7, 0], ["stele", 0.15, 1.65, 1]].map(Object.freeze)),
    alien: Object.freeze([["stele", 0, 0, 1], ["pool", 0, 1.8, 0], ["spore", -1.7, -0.7, 2], ["needle", 1.65, -0.65, 1]].map(Object.freeze))
  });

  const MAP_CLUSTERS = Object.freeze({
    rock: Object.freeze({ isolatedChance: 0.10, minSize: 4, sizeRange: 5, minRadius: 1.45, radiusRange: 3.4 }),
    resource: Object.freeze({ isolatedChance: 0.42, minSize: 2, sizeRange: 3, minRadius: 1.3, radiusRange: 2.6 }),
    ambient: Object.freeze({ isolatedChance: 0.48, minSize: 2, sizeRange: 4, minRadius: 0.9, radiusRange: 2.5 })
  });

  BF.MicroScenes = Object.freeze({
    data: TEMPLATES,
    mapLandmarks: MAP_LANDMARKS,
    mapClusters: MAP_CLUSTERS,
    get(id) { return TEMPLATES[id] || Object.values(TEMPLATES).find((scene) => scene.id === id) || null; },
    list(biome) { return Object.values(TEMPLATES).filter((scene) => !biome || scene.biomes.includes("all") || scene.biomes.includes(biome)); },
    getMapLandmark(profile) { return MAP_LANDMARKS[profile] || MAP_LANDMARKS.alien; },
    getMapCluster(kind) { return MAP_CLUSTERS[kind] || null; },
    plan(id, origin = { x: 0, y: 0, z: 0 }, rotation = 0) {
      const template = this.get(id);
      if (!template) throw new Error(`Micro-scène inconnue : ${id}`);
      const cos = Math.cos(rotation), sin = Math.sin(rotation);
      return template.objects.map((entry) => {
        const [x, y, z] = entry.offset;
        const [rotationX = 0, rotationY = 0, rotationZ = 0] = entry.rotation || [];
        return Object.freeze({
          type: entry.type, variant: entry.variant || 0,
          position: Object.freeze({ x: origin.x + x * cos - z * sin, y: origin.y + y, z: origin.z + x * sin + z * cos }),
          rotation: rotationY + rotation,
          rotationX,
          rotationY: rotationY + rotation,
          rotationZ
        });
      });
    }
  });
})(window);
