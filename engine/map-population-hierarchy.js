(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (!BF.ObjectSpawner || BF.MapPopulationHierarchy) return;

  const VERSION = "map-population-hierarchy-r1";
  const ROCK_TYPES = [
    ["rock", 48],
    ["strong_rock", 23],
    ["large_rock", 13],
    ["eroded_monolith", 9],
    ["resonant_basalt", 7]
  ];

  const DECORATIVE_SCENES = Object.freeze([
    { id: "edge-ferns", biomes: ["forest", "jungle", "swamp", "fungal", "alien"], radius: 5.2, objects: [["fern",0,0,0],["fern",1.7,0.8,1],["frond",-1.5,1.1,2],["lantern_mushrooms",0.5,-1.6,0]] },
    { id: "mushroom-pocket", biomes: ["forest", "swamp", "fungal", "cave", "alien"], radius: 4.8, objects: [["lantern_mushrooms",0,0,1],["lantern_mushrooms",1.4,0.7,0],["spore",-1.3,0.9,1],["fern",0.4,-1.5,2]] },
    { id: "low-canopy", biomes: ["forest", "jungle", "plain", "swamp", "alien"], radius: 6.2, objects: [["nature_tree",0,0,0],["fern",2.2,0.8,1],["frond",-2,1.1,2],["fiber",0.7,-2,0]] },
    { id: "fiber-bank", biomes: ["forest", "plain", "swamp", "coastal", "alien"], radius: 4.7, objects: [["fiber",0,0,0],["fiber",1.4,0.8,1],["frond",-1.5,0.9,0],["fern",0.2,-1.7,2]] },
    { id: "mineral-edge", biomes: ["mountain", "desert", "volcanic", "magnetic", "crystalline", "alien"], radius: 5.4, objects: [["strong_rock",0,0,1],["large_rock",2,0.9,0],["needle",-1.8,1.1,2],["debris",0.5,-1.8,0]] },
    { id: "weathered-stones", biomes: ["default", "plain", "mountain", "desert", "ruins", "alien"], radius: 5.1, objects: [["eroded_monolith",0,0,0],["rock",2,0.7,1],["frond",-1.8,1,0],["debris",0.4,-1.7,1]] },
    { id: "ruin-fragments", biomes: ["ruins", "archaeological", "desert", "alien"], radius: 5.6, objects: [["debris",0,0,0],["debris",1.7,1,1],["stele",-1.7,0.8,0],["frond",0.5,-1.9,2]] },
    { id: "wet-edge", biomes: ["swamp", "aquatic", "coastal", "archipelago", "alien"], radius: 5.5, objects: [["pool",0,0,0],["fern",2,0.8,1],["spore",-1.8,1.1,0],["frond",0.5,-1.9,2]] },
    { id: "quiet-fauna-trace", biomes: ["forest", "jungle", "plain", "desert", "alien"], radius: 5.3, objects: [["small_creature",0,0,0],["fern",1.8,0.8,2],["frond",-1.6,1.1,0],["rock",0.5,-1.8,1]] },
    { id: "crystal-sparse", biomes: ["crystalline", "magnetic", "cave", "alien"], radius: 5.2, objects: [["needle",0,0,1],["needle",1.7,0.9,0],["strong_rock",-1.8,1.1,1],["spore",0.4,-1.7,0]] },
    { id: "dry-growth", biomes: ["desert", "plain", "alien"], radius: 5.2, objects: [["cactus",0,0,0],["frond",1.8,0.8,1],["rock",-1.7,1.1,0],["fiber",0.4,-1.8,2]] },
    { id: "luminous-verge", biomes: ["fungal", "forest", "swamp", "cave", "alien"], radius: 5.2, objects: [["spore",0,0,1],["lantern_mushrooms",1.7,0.8,2],["fern",-1.6,1.1,0],["lunar_vine",0.4,-1.8,1]] }
  ]);

  const chooseWeighted = (entries, random) => {
    const available = entries.filter(([type]) => BF.ObjectLibrary?.get(type));
    const total = available.reduce((sum, entry) => sum + entry[1], 0);
    if (!total) return "rock";
    let cursor = random() * total;
    for (const [type, weight] of available) {
      cursor -= weight;
      if (cursor <= 0) return type;
    }
    return available[available.length - 1][0];
  };

  const nearestZoneIndex = (zones, position) => {
    let best = 0;
    let bestDistance = Infinity;
    zones.forEach((zone, index) => {
      const distance = Math.hypot(position.x - zone.center.x, position.z - zone.center.z);
      if (distance < bestDistance) { bestDistance = distance; best = index; }
    });
    return best;
  };

  const configuredMicroSceneCount = (definition) => {
    const candidates = [
      definition?.populationBudget?.microScenes,
      definition?.generator?.microSceneCount,
      definition?.generator?.microScenes,
      Array.isArray(definition?.generator?.microSceneIds) ? definition.generator.microSceneIds.length : 0
    ].map(Number).filter(Number.isFinite);
    return candidates.length ? Math.max(...candidates) : 0;
  };

  const defaultPerPlateau = (plateauCount) => {
    if (plateauCount <= 1) return 2;
    if (plateauCount === 2) return 2;
    if (plateauCount === 3) return 2;
    return 3;
  };

  const pointToSegmentSquared = (start, end, x, z) => {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = dx * dx + dz * dz;
    const t = length ? Math.max(0, Math.min(1, ((x - start.x) * dx + (z - start.z) * dz) / length)) : 0;
    const ox = x - (start.x + dx * t);
    const oz = z - (start.z + dz * t);
    return ox * ox + oz * oz;
  };

  const originalPopulateMap = BF.ObjectSpawner.prototype.populateMap;
  BF.ObjectSpawner.prototype.populateMap = function populateMapHierarchical(options = {}) {
    const zones = options.zoneRegions || [];
    const randomSource = options.random || this.random || Math.random;
    const random = () => typeof randomSource === "function" ? randomSource() : randomSource.next();
    const startIndex = this.instances.length;

    // La génération historique des rochers-obstacles reste pilotée par le moteur,
    // mais le modèle visuel est varié et la famille "rock" n'écrase plus tout.
    const originalSpawn = this.spawn;
    this.spawn = function spawnWithRockVariety(type, spawnOptions = {}) {
      let resolvedType = type;
      if (type === "rock" && spawnOptions.source === "map-population") {
        resolvedType = chooseWeighted(ROCK_TYPES, random);
      }
      return originalSpawn.call(this, resolvedType, spawnOptions);
    };

    let result;
    try {
      result = originalPopulateMap.call(this, options);
    } finally {
      this.spawn = originalSpawn;
    }

    if (!zones.length) return result;

    const generated = this.instances.slice(startIndex);
    const zoneStats = zones.map(() => ({ objects: 0, rocks: [], scenes: 0 }));
    generated.forEach((record) => {
      const index = nearestZoneIndex(zones, record.position || record.root?.position || { x: 0, z: 0 });
      zoneStats[index].objects += 1;
      if (/rock|basalt|monolith/i.test(record.type) && record.root?.userData?.microScene === "rock-cluster") {
        zoneStats[index].rocks.push(record);
      }
    });

    // Réduction du poids visuel des rochers : on conserve en priorité ceux de
    // la couronne historique située en bord de plateau, jamais les corridors.
    const corridors = [
      ...Object.values(options.resolvedExits || {}).map((exit) => ({ start: options.definition.entry, end: exit })),
      ...(options.internalZonePaths || [])
    ];
    zoneStats.forEach((stat, zoneIndex) => {
      const center = zones[zoneIndex].center;
      const keepTarget = Math.max(2, Math.round(stat.rocks.length * 0.58));
      const ranked = [...stat.rocks].sort((a, b) => {
        const score = (record) => {
          const p = record.root.position;
          const distance = Math.hypot(p.x - center.x, p.z - center.z);
          const edgeScore = distance >= 18 && distance <= 26 ? 3 : distance >= 14 ? 1 : -2;
          const corridorPenalty = corridors.some(({ start, end }) => pointToSegmentSquared(start, end, p.x, p.z) < 12.25) ? -6 : 0;
          return edgeScore + corridorPenalty;
        };
        return score(b) - score(a);
      });
      ranked.slice(keepTarget).forEach((record) => {
        record.root?.parent?.remove(record.root);
        const instanceIndex = this.instances.indexOf(record);
        if (instanceIndex >= 0) this.instances.splice(instanceIndex, 1);
      });
    });

    const biome = options.definition?.generator?.biomeId ||
      options.definition?.biome || options.definition?.id || "alien";
    const compatibleScenes = DECORATIVE_SCENES.filter((scene) =>
      scene.biomes.includes(biome) || scene.biomes.includes("alien")
    );
    const existingConfigured = configuredMicroSceneCount(options.definition);
    const regularLimit = zones.length * defaultPerPlateau(zones.length);
    const targetScenes = existingConfigured > zones.length * 3
      ? existingConfigured
      : Math.max(existingConfigured, regularLimit);
    const sceneQuota = zones.map(() => 0);
    for (let i = 0; i < targetScenes; i += 1) sceneQuota[i % zones.length] += 1;

    const occupied = this.instances.map((record) => ({
      x: record.root?.position.x ?? record.position.x,
      z: record.root?.position.z ?? record.position.z,
      radius: BF.ObjectLibrary.getMapPlacement(record.type)?.radius || 1
    }));
    const isFree = (x, z, radius) => !occupied.some((item) =>
      Math.hypot(x - item.x, z - item.z) < radius + item.radius + 0.55
    ) && !corridors.some(({ start, end }) => pointToSegmentSquared(start, end, x, z) < (radius + 1.8) ** 2);

    const findZoneEdgeOrigin = (zone, radius) => {
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const angle = random() * Math.PI * 2;
        const distance = 18 + random() * Math.max(1, 25 - radius - 18);
        const x = zone.center.x + Math.cos(angle) * distance;
        const z = zone.center.z + Math.sin(angle) * distance;
        if (isFree(x, z, radius)) return { x, y: 0, z };
      }
      return null;
    };

    zones.forEach((zone, zoneIndex) => {
      let previousSceneId = "";
      for (let sceneIndex = 0; sceneIndex < sceneQuota[zoneIndex]; sceneIndex += 1) {
        const pool = compatibleScenes.filter((scene) => scene.id !== previousSceneId);
        const scene = pool[Math.floor(random() * pool.length)] || compatibleScenes[0];
        if (!scene) break;
        const origin = findZoneEdgeOrigin(zone, scene.radius);
        if (!origin) continue;
        const rotation = random() * Math.PI * 2;
        const cos = Math.cos(rotation), sin = Math.sin(rotation);
        scene.objects.forEach(([type, ox, oz, variant]) => {
          if (!BF.ObjectLibrary.get(type)) return;
          const x = origin.x + ox * cos - oz * sin;
          const z = origin.z + ox * sin + oz * cos;
          const radius = BF.ObjectLibrary.getMapPlacement(type)?.radius || 1;
          if (!isFree(x, z, radius)) return;
          const record = originalSpawn.call(this, type, {
            position: { x, y: 0, z }, variant, rotation: rotation + random() * 0.35,
            force: true, scene: options.group || this.scene,
            palette: options.definition.palette,
            source: `decorative-microscene:${scene.id}`
          });
          if (!record) return;
          record.root.userData.microScene = scene.id;
          record.root.userData.outsideObjectBudget = true;
          occupied.push({ x, z, radius });
          if (record.instance?.hitbox) options.interactables?.push(record.instance.hitbox);
          record.instance?.colliders?.forEach((collider) => {
            const position = collider.offset.clone().applyAxisAngle(
              new this.THREE.Vector3(0, 1, 0), rotation
            ).add(record.root.position);
            options.colliders?.push({ position, radius: collider.radius, owner: record.root });
          });
          options.animatedObjects?.push({ root: record.root, type, phase: random() * Math.PI * 2 });
        });
        previousSceneId = scene.id;
        zoneStats[zoneIndex].scenes += 1;
      }
    });

    return {
      ...result,
      microSceneBudgetSeparate: true,
      decorativeMicroScenes: zoneStats.reduce((sum, stat) => sum + stat.scenes, 0),
      decorativeMicroScenesByZone: zoneStats.map((stat) => stat.scenes),
      populationHierarchyVersion: VERSION
    };
  };

  BF.MapPopulationHierarchy = Object.freeze({ VERSION, decorativeScenes: DECORATIVE_SCENES });
})(window);
