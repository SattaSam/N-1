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

  const isTutorialProtected = (definition) => {
    const mapNumber = Number(definition?.number);
    const discoveryIndex = Number(definition?.generator?.discoveryIndex);
    return Boolean(
      definition?.isStartingMap ||
      definition?.startingMap ||
      definition?.id === "crystal" ||
      (Number.isFinite(mapNumber) && mapNumber >= 1 && mapNumber <= 3) ||
      (Number.isFinite(discoveryIndex) && discoveryIndex >= 0 && discoveryIndex <= 3)
    );
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

    if (!zones.length) {
      try { return originalPopulateMap.call(this, options); }
      finally { this.spawn = originalSpawn; }
    }
    let result;
    const zoneStats = zones.map(() => ({ objects: 0, rocks: [], scenes: 0 }));
    const corridors = [
      ...Object.values(options.resolvedExits || {}).map((exit) => ({ start: options.definition.entry, end: exit })),
      ...(options.internalZonePaths || [])
    ];
    const biome = options.definition?.generator?.biomeId ||
      options.definition?.profile || options.definition?.biome ||
      options.definition?.id || "alien";
    const compatibleScenes = DECORATIVE_SCENES.filter((scene) =>
      scene.biomes.includes(biome) || scene.biomes.includes("alien")
    );
    const existingConfigured = configuredMicroSceneCount(options.definition);
    const regularLimit = zones.length * defaultPerPlateau(zones.length);
    const targetScenes = existingConfigured > zones.length * 3
      ? existingConfigured
      : Math.max(existingConfigured, regularLimit);
    // Les installations ajoutées après la découverte ne changent ni les
    // quotas naturels ni la séquence RNG du peuplement déjà mémorisable par seed.
    const isConstruction = (scene) => {
      const id = scene?.microSceneId || scene?.id;
      const template = BF.MicroScenes?.get?.(id);
      return template?.rarity === "constructed" ||
        ["camp", "refuge", "shelter", "base", "workbench", "deployed_beacon"]
          .includes(String(scene?.kind || scene?.contextRole || ""));
    };
    const sceneCountsByZone = () => {
      const counts = zones.map(() => 0);
      const indexed = new Set();
      (this.microSceneInstances || []).forEach((scene) => {
        if (isConstruction(scene)) return;
        const root = scene.instanceRoot || scene.records?.[0]?.root;
        const point = root?.getWorldPosition?.(new this.THREE.Vector3()) || scene.anchor;
        if (!point) return;
        counts[nearestZoneIndex(zones, point)] += 1;
        if (scene.instanceId) indexed.add(String(scene.instanceId));
      });
      // Les ancrages persistants sont déjà réservés même avant leur instanciation.
      (options.definition?.persistentMicroScenes || []).forEach((scene) => {
        if (scene.persistent === false || !scene.anchor || isConstruction(scene) || indexed.has(String(scene.instanceId))) return;
        counts[nearestZoneIndex(zones, scene.anchor)] += 1;
      });
      return counts;
    };
    const sceneQuota = zones.map(() => 0);

    const occupied = this.instances.map((record) => {
      const point = record.root?.getWorldPosition?.(new this.THREE.Vector3()) || record.position;
      return { x: point.x, z: point.z,
        radius: BF.ObjectLibrary.getMapPlacement(record.type)?.radius || 1 };
    });
    const reservations = [];
    const constructionReservations = [];
    const reserveScene = (scene) => {
      const footprint = BF.ObjectSpawner.microSceneFootprint(this.THREE, scene);
      const root = scene.instanceRoot;
      if (!footprint) return;
      const p = root?.getWorldPosition(new this.THREE.Vector3()) || scene.anchor || { x: 0, z: 0 };
      (isConstruction(scene) ? constructionReservations : reservations).push({ minX: p.x + footprint.minX, maxX: p.x + footprint.maxX,
        minZ: p.z + footprint.minZ, maxZ: p.z + footprint.maxZ });
    };
    (this.microSceneInstances || []).forEach(reserveScene);
    // Les occurrences résolues seront matérialisées après la population.
    // Réserver leurs offsets conservés dès maintenant, sans déplacer l'ancrage.
    const anchoredScenes = [
      ...(options.definition?.persistentMicroScenes || []),
      ...(options.definition?.customMicroScenes || []).map(scene => ({
        microSceneId: scene.id,
        anchor: { x: Number(scene.position?.[0]) || 0, z: Number(scene.position?.[2]) || 0 },
        rotation: Number(scene.rotation?.[1]) || 0
      }))
    ];
    anchoredScenes.forEach((scene) => {
      if (scene.persistent === false || !scene.anchor) return;
      const template = BF.MicroScenes?.get?.(scene.microSceneId);
      if (!template?.objects?.length) return;
      const angle = Number(scene.rotation) || 0;
      const cos = Math.cos(angle), sin = Math.sin(angle) * (template.custom ? 1 : -1);
      const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
      template.objects.forEach((entry) => {
        const [ox, , oz] = entry.offset || [0, 0, 0];
        const x = scene.anchor.x + ox * cos + oz * sin;
        const z = scene.anchor.z - ox * sin + oz * cos;
        const r = Math.max(0.5, BF.ObjectLibrary.getMapPlacement(entry.type)?.radius || 1);
        box.minX = Math.min(box.minX, x - r); box.maxX = Math.max(box.maxX, x + r);
        box.minZ = Math.min(box.minZ, z - r); box.maxZ = Math.max(box.maxZ, z + r);
      });
      (isConstruction(scene) ? constructionReservations : reservations).push(box);
    });
    const overlapsReservation = (x, z, radius) => reservations.some(box =>
      x + radius + 0.55 > box.minX && x - radius - 0.55 < box.maxX &&
      z + radius + 0.55 > box.minZ && z - radius - 0.55 < box.maxZ);
    const protectedPoints = [
      options.definition?.entry,
      ...Object.values(options.resolvedExits || {})
    ].filter(Boolean);
    const isProtected = (x, z, radius) => protectedPoints.some((point) =>
      Math.hypot(x - point.x, z - point.z) < radius + 4.2
    ) || corridors.some(({ start, end }) =>
      pointToSegmentSquared(start, end, x, z) < (radius + 1.8) ** 2
    );
    const isFree = (x, z, radius, ignoreOccupied = false) =>
      !overlapsReservation(x, z, radius) && (ignoreOccupied || !occupied.some((item) =>
        Math.hypot(x - item.x, z - item.z) < radius + item.radius + 0.55
      )) && !isProtected(x, z, radius);

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

    const findDeterministicOrigin = (radius, ignoreOccupied = false) => {
      const distances = [18, 20, 22, Math.max(12, 24 - radius)];
      const counts = sceneCountsByZone();
      const ordered = zones.map((_, index) => index).sort((a, b) => counts[a] - counts[b] || a - b);
      for (const zoneIndex of ordered) {
        const zone = zones[zoneIndex];
        for (const distance of distances) {
          for (let step = 0; step < 48; step += 1) {
            const angle = (step / 48) * Math.PI * 2;
            const x = zone.center.x + Math.cos(angle) * distance;
            const z = zone.center.z + Math.sin(angle) * distance;
            if (isFree(x, z, radius, ignoreOccupied)) {
              return { origin: { x, y: 0, z }, zoneIndex };
            }
          }
        }
      }
      return null;
    };

    const alreadyRegistered = (sceneId) =>
      (options.group?.userData?.microScenes || this.microSceneInstances || [])
        .some((entry) => String(entry?.id || "") === String(sceneId));

    const spawnGuaranteedScene = (sceneId, preferredZoneIndex = 0, source = "featured", terminal = true) => {
      if (!sceneId || alreadyRegistered(sceneId)) return true;
      const scene = BF.MicroScenes?.get?.(sceneId);
      if (!scene) return false;
      const rotation = random() * Math.PI * 2;
      // Construire une seule fois, puis choisir uniquement l'ancrage global.
      // Le volume mesuré conserve chaque pose interne issue de CUO Lab.
      let records;
      try {
        records = this.spawnMicroScene(scene.id, {
          origin: { x: 0, y: 0, z: 0 }, rotation, force: true,
          scene: options.group || this.scene, palette: options.definition.palette,
          source: `${source}-microscene:${scene.id}`
        }) || [];
        const indexed = this.microSceneInstances.find(entry => entry.records === records);
        const footprint = BF.ObjectSpawner.microSceneFootprint(this.THREE, indexed);
        const regions = options.walkableRegions || zones.map(zone => ({
          minX: zone.center.x - zone.halfSize, maxX: zone.center.x + zone.halfSize,
          minZ: zone.center.z - zone.halfSize, maxZ: zone.center.z + zone.halfSize
        }));
        const counts = sceneCountsByZone();
        // Ne pas compter la composition provisoire à l'origine parmi les occupants.
        const provisionalRoot = indexed?.instanceRoot || indexed?.records?.[0]?.root;
        if (provisionalRoot) counts[nearestZoneIndex(zones,
          provisionalRoot.getWorldPosition(new this.THREE.Vector3()))] -= 1;
        const candidates = BF.ObjectSpawner.microScenePlacementCandidates(footprint, regions, options.bounds);
        const overlapArea = point => reservations.reduce((total, box) => total +
          Math.max(0, Math.min(point.x + footprint.maxX + 0.55, box.maxX) -
            Math.max(point.x + footprint.minX - 0.55, box.minX)) *
          Math.max(0, Math.min(point.z + footprint.maxZ + 0.55, box.maxZ) -
            Math.max(point.z + footprint.minZ - 0.55, box.minZ)), 0);
        const blocksPassage = point => footprint.colliders.some(collider =>
          isProtected(point.x + collider.x, point.z + collider.z, collider.radius));
        const clearOfObjects = point => !occupied.some(item =>
          item.x + item.radius > point.x + footprint.minX &&
          item.x - item.radius < point.x + footprint.maxX &&
          item.z + item.radius > point.z + footprint.minZ &&
          item.z - item.radius < point.z + footprint.maxZ);
        candidates.sort((a, b) => counts[a.zoneIndex] - counts[b.zoneIndex] ||
          a.distance - b.distance);
        const safe = candidates.filter(({ point }) => !blocksPassage(point));
        let selected = safe.find(({ point }) => overlapArea(point) === 0 && clearOfObjects(point));
        if (!selected && terminal) selected = safe.find(({ point }) => overlapArea(point) === 0);
        // Une signature garantie reste entière sur un plateau réel. Si les
        // ancrages conservés saturent la map, minimiser explicitement le recouvrement.
        if (!selected && terminal) selected = [...safe].sort((a, b) =>
          overlapArea(a.point) - overlapArea(b.point) || a.distance - b.distance)[0];
        if (!selected) {
          // Ne jamais conserver une composition provisoire à l'origine.
          records.forEach(record => { record.root?.removeFromParent?.();
            const at = this.instances.indexOf(record); if (at >= 0) this.instances.splice(at, 1); });
          indexed?.instanceRoot?.removeFromParent?.();
          const at = this.microSceneInstances.indexOf(indexed);
          if (at >= 0) this.microSceneInstances.splice(at, 1);
          console.warn(`[BlueFox] Aucun plateau compatible avec le volume entier de ${scene.id}.`);
          return false;
        }
        const origin = selected.point;
        const resolvedZoneIndex = selected.zoneIndex;
        indexed.anchor = { ...origin };
        if (indexed.instanceRoot) {
          indexed.instanceRoot.position.set(origin.x, origin.y, origin.z);
          indexed.instanceRoot.updateWorldMatrix(true, true);
        } else records.forEach(record => {
          record.root.position.add(new this.THREE.Vector3(origin.x, origin.y, origin.z));
          record.position = { x: record.root.position.x, y: record.root.position.y, z: record.root.position.z };
        });
        if (overlapArea(origin) > 0) console.warn(`[BlueFox] Recouvrement MSC minimal imposé par les ancrages conservés: ${scene.id}.`);
        reserveScene(indexed);
        records.forEach((record) => {
          const root = record.instanceRoot || record.root;
          if (root?.userData) {
            root.userData.microScene = scene.id;
            root.userData.outsideObjectBudget = true;
          }
          const hitbox = record.instance?.hitbox;
          if (hitbox && !options.interactables?.includes(hitbox)) options.interactables?.push(hitbox);
          (record.instance?.colliders || []).forEach((collider) => {
            const owner = record.objectRoot || record.root;
            const world = new this.THREE.Vector3();
            owner?.updateWorldMatrix?.(true, false);
            const position = collider.offset && owner?.localToWorld
              ? owner.localToWorld(collider.offset.clone())
              : owner?.getWorldPosition?.(world) || world;
            if (!protectedPoints.some((point) =>
              Math.hypot(position.x - point.x, position.z - point.z) < collider.radius + 4.2
            )) options.colliders?.push({ position, radius: collider.radius, owner });
          });
        });
        zoneStats[resolvedZoneIndex].scenes += 1;
        return true;
      } catch (error) {
        console.warn(`MSC garantie impossible: ${scene.id}`, error);
        return false;
      }
    };

    const featuredSceneIds = Array.isArray(options.definition?.generator?.featuredMicroSceneIds)
      ? options.definition.generator.featuredMicroSceneIds.filter(Boolean)
      : [options.definition?.generator?.featuredMicroSceneId].filter(Boolean);
    if (!isTutorialProtected(options.definition)) featuredSceneIds.forEach((sceneId, index) => {
      spawnGuaranteedScene(sceneId, index, "featured", true);
    });
    // Le volume des compositions remarquables précède le décor ordinaire.
    // Le budget ordinaire et les garanties tutoriel restent ceux du moteur.
    try {
      result = originalPopulateMap.call(this, { ...options, microSceneReservations: reservations });
    } finally {
      this.spawn = originalSpawn;
    }
    const generated = this.instances.slice(startIndex);
    generated.forEach((record) => {
      const index = nearestZoneIndex(zones, record.position || record.root?.position || { x: 0, z: 0 });
      zoneStats[index].objects += 1;
      if (/rock|basalt|monolith/i.test(record.type) && record.root?.userData?.microScene === "rock-cluster") {
        zoneStats[index].rocks.push(record);
      }
    });

    // Réduction du poids visuel des rochers : on conserve en priorité ceux de
    // la couronne historique située en bord de plateau, jamais les corridors.
    zoneStats.forEach((stat, zoneIndex) => {
      const center = zones[zoneIndex].center;
      // Les gros blocs placés en lisière servent aussi de cache-couture.
      const keepTarget = Math.max(2, Math.round(stat.rocks.length * 0.72));
      const ranked = [...stat.rocks].sort((a, b) => {
        const score = (record) => {
          const p = record.root.position;
          const distance = Math.hypot(p.x - center.x, p.z - center.z);
          const halfSize = Number(zones[zoneIndex].halfSize) || 27;
          const edgeDistance = Math.min(
            Math.abs(Math.abs(p.x - center.x) - halfSize),
            Math.abs(Math.abs(p.z - center.z) - halfSize)
          );
          const edgeScore = edgeDistance <= 5.8
            ? 5
            : distance >= 18 && distance <= 26 ? 3 : distance >= 14 ? 1 : -2;
          const corridorPenalty = corridors.some(({ start, end }) => pointToSegmentSquared(start, end, p.x, p.z) < 12.25) ? -6 : 0;
          return edgeScore + corridorPenalty;
        };
        return score(b) - score(a);
      });
      ranked.slice(keepTarget).forEach((record) => {
        const root = record.root || null;
        const hitbox = record.instance?.hitbox || null;
        root?.parent?.remove(root);

        if (hitbox && Array.isArray(options.interactables)) {
          const hitboxIndex = options.interactables.indexOf(hitbox);
          if (hitboxIndex >= 0) options.interactables.splice(hitboxIndex, 1);
        }
        if (root && Array.isArray(options.colliders)) {
          for (let index = options.colliders.length - 1; index >= 0; index -= 1) {
            if (options.colliders[index]?.owner === root) {
              options.colliders.splice(index, 1);
            }
          }
        }
        if (root && Array.isArray(options.animatedObjects)) {
          for (let index = options.animatedObjects.length - 1; index >= 0; index -= 1) {
            if (options.animatedObjects[index]?.root === root) {
              options.animatedObjects.splice(index, 1);
            }
          }
        }
        const instanceIndex = this.instances.indexOf(record);
        if (instanceIndex >= 0) this.instances.splice(instanceIndex, 1);
      });
    });


    const clearConstructionOverlaps = () => {
      if (!constructionReservations.length) return 0;
      const removed = this.instances.slice(startIndex).filter((record) => {
        const source = String(record.root?.userData?.spawnSource || "");
        if (source !== "map-population" && !source.startsWith("decorative-microscene:")) return false;
        const point = record.root?.getWorldPosition?.(new this.THREE.Vector3()) || record.position;
        const radius = BF.ObjectLibrary.getMapPlacement(record.type)?.radius || 1;
        return constructionReservations.some(box =>
          point.x + radius + 0.55 > box.minX && point.x - radius - 0.55 < box.maxX &&
          point.z + radius + 0.55 > box.minZ && point.z - radius - 0.55 < box.maxZ);
      });
      const roots = new Set(removed.map(record => record.root));
      const hitboxes = new Set(removed.map(record => record.instance?.hitbox).filter(Boolean));
      const prune = (array, predicate) => {
        if (!Array.isArray(array)) return;
        for (let i = array.length - 1; i >= 0; i -= 1) if (predicate(array[i])) array.splice(i, 1);
      };
      removed.forEach(record => {
        if (record.root?.userData) record.root.userData.active = false;
        if (record.instance?.hitbox?.userData) record.instance.hitbox.userData.active = false;
        record.root?.parent?.remove(record.root);
        BF.disposeObject?.(record.root);
      });
      prune(this.instances, record => roots.has(record.root));
      prune(options.interactables, object => hitboxes.has(object) || roots.has(object?.userData?.worldAnchor));
      prune(options.colliders, collider => roots.has(collider?.owner));
      prune(options.animatedObjects, object => roots.has(object?.root));
      this.microSceneInstances.forEach(scene => prune(scene.records, record => roots.has(record.root)));
      return removed.length;
    };

    if (isTutorialProtected(options.definition)) return {
      removedConstructionOverlaps: clearConstructionOverlaps(),
      ...result, microSceneBudgetSeparate: true, decorativeMicroScenes: 0,
      decorativeMicroScenesByZone: zoneStats.map(() => 0),
      populationHierarchyVersion: VERSION, tutorialPopulationProtected: true
    };
    this.instances.slice(startIndex).forEach(record => {
      const point = record.root?.getWorldPosition?.(new this.THREE.Vector3()) || record.position;
      occupied.push({ x: point.x, z: point.z,
        radius: BF.ObjectLibrary.getMapPlacement(record.type)?.radius || 1 });
    });

    const biomeId = options.definition?.generator?.biomeId || options.definition?.profile || null;
    const context = String([
      options.definition?.generator?.biomeId,
      options.definition?.profile,
      options.definition?.generator?.baseTemplateName,
      options.definition?.name,
      options.definition?.description,
      ...(options.definition?.traits || []).map((trait) => trait?.label || trait?.id || "")
    ].join(" ")).toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // La signature corallienne est une vraie MSC de population. Sa densité
    // dépend de la taille de la map : 1 sur un plateau, 2 sur 2-3, 3 sur 4-6.
    const underwaterContext = biomeId === "aquatic" || /sous.?marin|underwater|ocean/.test(context);
    const bioluminescentContext = /biolum|luminescen|fluorescen/.test(context);
    if (underwaterContext && bioluminescentContext) {
      const coralIds = [
        "MSC-CUSTOM-CORAILBIOLUMINESCENT1",
        "MSC-CUSTOM-CORAILBIOLUMINESCENT2",
        "MSC-CUSTOM-CORAILBIOLUMINESCENT3"
      ];
      const coralTarget = zones.length <= 1 ? 1 : zones.length <= 3 ? 2 : 3;
      for (let index = 0; index < coralTarget; index += 1) {
        spawnGuaranteedScene(coralIds[index], index, "biome-signature-coral", true);
      }
    }

    // Cette MSC remarquable reste une occurrence unique. La densité 1..5
    // demandée pour les "îles flottantes" concerne l'objet mobile_islet,
    // géré par ObjectSpawner, jamais cette composition dense. On reprend ici
    // les trois signatures historiques d'ObjectSpawner afin que la seconde
    // passe puisse garantir l'occurrence si la première n'a trouvé aucun ancrage.
    const suspendedIslandSignature =
      options.definition?.generator?.biomeId === "floating_islands" ||
      (/ile|island/.test(context) && /flott|floating|suspend/.test(context)) ||
      (/magnet/.test(context) && /desert/.test(context) && /roch|rock/.test(context) &&
        /levitat|flott|floating|suspend/.test(context)) ||
      ((biomeId === "swamp" || /marais|swamp/.test(context)) &&
        /ile|island/.test(context) && /flott|floating|suspend/.test(context));
    if (suspendedIslandSignature) {
      spawnGuaranteedScene("MSC-SUSPENDED-ISLAND-001", 0, "biome-signature", true);
    }

    const initialScenes = sceneCountsByZone();
    for (let i = 0; i < targetScenes; i += 1) {
      const index = zones.map((_, index) => index).sort((a, b) =>
        initialScenes[a] + sceneQuota[a] - initialScenes[b] - sceneQuota[b] || a - b)[0];
      sceneQuota[index] += 1;
    }

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
        const decorativeRecords = [];
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
          decorativeRecords.push(record);
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
          const animationPhase = random() * Math.PI * 2;
          if (type !== "debris") {
            options.animatedObjects?.push({ root: record.root, type, phase: animationPhase });
          }
        });
        if (decorativeRecords.length) {
          this.registerMicroSceneInstance(scene, decorativeRecords, {
            instanceId: `${options.definition.id}:decorative:${zoneIndex}:${sceneIndex}`
          });
        }
        previousSceneId = scene.id;
        zoneStats[zoneIndex].scenes += 1;
      }
    });

    return {
      ...result,
      microSceneBudgetSeparate: true,
      decorativeMicroScenes: zoneStats.reduce((sum, stat) => sum + stat.scenes, 0),
      decorativeMicroScenesByZone: zoneStats.map((stat) => stat.scenes),
      populationHierarchyVersion: VERSION,
      removedConstructionOverlaps: clearConstructionOverlaps()
    };
  };

  BF.MapPopulationHierarchy = Object.freeze({ VERSION, decorativeScenes: DECORATIVE_SCENES });
})(window);
