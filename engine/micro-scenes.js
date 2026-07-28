(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};

  const TEMPLATES = Object.freeze({
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
        Object.freeze({ type: "frond", offset: [1.5, 0, -2], variant: 1 }),
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
    })
  });

  const MAP_LANDMARKS = Object.freeze({
    volcanic: Object.freeze([["rock", -1.25, 0.25, 2], ["rock", 1.1, 0.5, 1], ["needle", 0, -0.45, 2], ["debris", 0.2, 1.25, 0]].map(Object.freeze)),
    frozen: Object.freeze([["needle", 0, 0, 2], ["needle", -1.15, 0.8, 1], ["needle", 1.2, 0.65, 0], ["rock", 0.15, 1.55, 1]].map(Object.freeze)),
    forest: Object.freeze([["tree", 0, 0, 1], ["spore", -1.45, 0.85, 2], ["spore", 1.35, 0.9, 1], ["frond", 0.25, -1.45, 2]].map(Object.freeze)),
    ruins: Object.freeze([["stele", 0, 0, 1], ["debris", -1.25, 0.8, 2], ["debris", 1.3, 0.65, 1], ["debris", 0.2, -1.25, 0]].map(Object.freeze)),
    aquatic: Object.freeze([["pool", 0, 0, 1], ["spore", -1.8, 0.9, 2], ["spore", 1.75, 0.8, 1], ["frond", 0.15, -1.9, 2]].map(Object.freeze)),
    desert: Object.freeze([["stele", 0, 0, 0], ["rock", -1.45, 0.85, 2], ["rock", 1.5, 0.7, 1], ["debris", 0.35, -1.35, 2]].map(Object.freeze)),
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
        return Object.freeze({
          type: entry.type, variant: entry.variant || 0,
          position: Object.freeze({ x: origin.x + x * cos - z * sin, y: origin.y + y, z: origin.z + x * sin + z * cos }),
          rotation
        });
      });
    }
  });
})(window);
