(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const distance2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const randomPoint = (bounds, random) => ({ x: bounds.minX + random() * (bounds.maxX - bounds.minX), y: bounds.y || 0, z: bounds.minZ + random() * (bounds.maxZ - bounds.minZ) });
  const weightedPick = (entries, random) => {
    const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
    if (total <= 0) return null;
    let cursor = random() * total;
    for (const entry of entries) { cursor -= Math.max(0, entry.weight); if (cursor <= 0) return entry; }
    return entries[entries.length - 1] || null;
  };
  const MAP_OBJECT_BUDGETS = Object.freeze({
    1: Object.freeze({ min: 60, max: 75, resourcesMin: 14, resourcesMax: 20, landmarksMin: 1, landmarksMax: 1 }),
    2: Object.freeze({ min: 75, max: 92, resourcesMin: 22, resourcesMax: 30, landmarksMin: 1, landmarksMax: 1 }),
    3: Object.freeze({ min: 88, max: 108, resourcesMin: 30, resourcesMax: 39, landmarksMin: 1, landmarksMax: 2 }),
    4: Object.freeze({ min: 102, max: 124, resourcesMin: 38, resourcesMax: 48, landmarksMin: 1, landmarksMax: 2 }),
    5: Object.freeze({ min: 116, max: 138, resourcesMin: 44, resourcesMax: 56, landmarksMin: 1, landmarksMax: 2 }),
    6: Object.freeze({ min: 132, max: 150, resourcesMin: 50, resourcesMax: 62, landmarksMin: 1, landmarksMax: 3 })
  });
  const segmentDistanceSquared = (start, end, x, z) => {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const lengthSquared = dx * dx + dz * dz;
    const unclamped = lengthSquared > 0
      ? ((x - start.x) * dx + (z - start.z) * dz) / lengthSquared
      : 0;
    const t = Math.max(0, Math.min(1, unclamped));
    const offsetX = x - (start.x + dx * t);
    const offsetZ = z - (start.z + dz * t);
    return offsetX * offsetX + offsetZ * offsetZ;
  };

  class ObjectSpawner {
    constructor(options = {}) {
      this.THREE = options.THREE || global.THREE;
      this.scene = options.scene || null;
      this.palette = options.palette || { accent: 0x65d9ff, ground: 0x52606c };
      this.random = options.random || Math.random;
      this.instances = [];
      this.instanceSequence = 0;
      if (!this.THREE) throw new Error("ObjectSpawner nécessite THREE.");
      if (!BF.ObjectLibrary) throw new Error("ObjectSpawner nécessite ObjectLibrary.");
    }

    canPlace(definition, position, placed = this.instances) {
      const minDistance = definition.spawn?.minDistance || 0;
      const sameTypeCount = placed.filter((entry) => entry.type === definition.type).length;
      if (sameTypeCount >= (definition.spawn?.maxPerZone ?? Infinity)) return false;
      return placed.every((entry) => distance2D(position, entry.position) >= Math.max(minDistance, entry.definition?.spawn?.minDistance || 0) * 0.5);
    }

    spawn(type, options = {}) {
      const definition = BF.ObjectLibrary.get(type);
      if (!definition) throw new Error(`Objet inconnu : ${type}`);
      const position = options.position || { x: 0, y: 0, z: 0 };
      if (!options.force && !this.canPlace(definition, position, options.placed || this.instances)) return null;
      const instance = BF.ObjectLibrary.create(this.THREE, type, options.palette || this.palette, options.variant || 0);
      const root = instance.root;
      if (root) {
        root.position.set(position.x || 0, position.y || 0, position.z || 0);
        root.rotation.set(
          options.rotationX || 0,
          options.rotationY ?? options.rotation ?? 0,
          options.rotationZ || 0
        );
        root.scale.setScalar(options.scale || 1);
        root.userData.spawnSource = options.source || "object-spawner";
        (options.scene || this.scene)?.add(root);
      }
      const instanceId = options.instanceId || `${definition.id}:${Date.now().toString(36)}:${(++this.instanceSequence).toString(36)}`;
      if (root) {
        root.userData.instanceId = instanceId;
        root.userData.variant = options.variant || 0;
      }
      if (instance.hitbox) {
        instance.hitbox.userData.instanceId = instanceId;
        instance.hitbox.userData.catalogId = definition.id;
        instance.hitbox.userData.libraryType = type;
        instance.hitbox.userData.variant = options.variant || 0;
        instance.hitbox.userData.functional = definition;
      }
      const record = { type, definition, instance, instanceId, root, position: { x: position.x || 0, y: position.y || 0, z: position.z || 0 } };
      this.instances.push(record);
      return record;
    }

    spawnMicroScene(id, options = {}) {
      if (!BF.MicroScenes) throw new Error("ObjectSpawner nécessite MicroScenes.");
      const plan = BF.MicroScenes.plan(id, options.origin, options.rotation || 0);
      return plan.map((entry) => this.spawn(entry.type, {
        ...options,
        position: entry.position,
        rotation: entry.rotation,
        rotationX: entry.rotationX,
        rotationY: entry.rotationY,
        rotationZ: entry.rotationZ,
        variant: entry.variant,
        force: options.force ?? true,
        source: id
      })).filter(Boolean);
    }

    populateBiome(biome, options = {}) {
      if (!BF.BiomeRules) throw new Error("ObjectSpawner nécessite BiomeRules.");
      const rule = BF.BiomeRules.get(biome);
      const bounds = options.bounds || { minX: -10, maxX: 10, minZ: -10, maxZ: 10, y: 0 };
      const budget = options.budget ?? rule.budget;
      const maxAttempts = options.maxAttempts ?? budget * 20;
      const candidates = BF.BiomeRules.candidates(biome);
      const spawned = [];
      let spent = 0, attempts = 0;
      while (spent < budget && attempts < maxAttempts) {
        attempts += 1;
        const pick = weightedPick(candidates.filter((entry) => entry.definition.spawn.spawnCost + spent <= budget), this.random);
        if (!pick) break;
        const position = randomPoint(bounds, this.random);
        const record = this.spawn(pick.definition.type, { position, variant: Math.floor(this.random() * 3), rotation: this.random() * Math.PI * 2, placed: [...this.instances, ...spawned], scene: options.scene, palette: options.palette, source: `biome:${rule.id}` });
        if (!record) continue;
        spawned.push(record);
        spent += pick.definition.spawn.spawnCost;
      }
      return Object.freeze({ biome: rule.id, budget, spent, attempts, spawned: Object.freeze(spawned) });
    }

    populateMap(options = {}) {
      if (!BF.BiomeRules) throw new Error("ObjectSpawner nécessite BiomeRules.");
      if (!BF.MicroScenes) throw new Error("ObjectSpawner nécessite MicroScenes.");

      const {
        definition,
        group = this.scene,
        zoneRegions = [],
        bounds,
        resolvedExits = {},
        internalZonePaths = [],
        landmarks = [],
        colliders = [],
        interactables = [],
        animatedObjects = []
      } = options;
      if (!definition || !group || !bounds) {
        throw new Error("ObjectSpawner.populateMap nécessite definition, group et bounds.");
      }

      const random = options.random || this.random;
      const next = () => typeof random === "function" ? random() : random.next();
      const { minX, maxX, minZ, maxZ } = bounds;
      const occupied = [];
      const placementPreferences = {
        large: { mapEdge: 0.68, plateauEdge: 0.20, center: 0.12 },
        medium: { mapEdge: 0.48, plateauEdge: 0.30, center: 0.22 },
        small: { mapEdge: 0.27, plateauEdge: 0.41, center: 0.32 }
      };
      const placement = (type) => BF.ObjectLibrary.getMapPlacement(type);
      const reservedPoints = [
        { ...definition.entry, clearance: 4.2 },
        ...Object.values(resolvedExits).map((exit) => ({ ...exit, clearance: 4.2 })),
        ...landmarks.map(([, x, z]) => ({ x, z, clearance: 1.8 }))
      ];
      const protectedCorridors = [
        ...Object.values(resolvedExits).map((exit) => ({ start: definition.entry, end: exit })),
        ...internalZonePaths
      ];
      const isReserved = (x, z, radius) =>
        reservedPoints.some((point) =>
          Math.hypot(x - point.x, z - point.z) < radius + point.clearance
        ) ||
        protectedCorridors.some(({ start, end }) =>
          segmentDistanceSquared(start, end, x, z) <
            (radius + 1.45) * (radius + 1.45)
        );
      const isOccupied = (x, z, radius) =>
        occupied.some((item) =>
          Math.hypot(x - item.x, z - item.z) < radius + item.radius + 0.28
        );
      const randomPosition = (minimumDistance, maximumDistance, radius, type = "frond") => {
        const volume = placement(type).volume;
        const preferences = placementPreferences[volume];
        const mapEdgeBand = volume === "large" ? 9.5 : volume === "medium" ? 8 : 6.5;
        const plateauEdgeBand = volume === "large" ? 5.5 : volume === "medium" ? 7 : 8.5;
        const outerSafety = Math.max(1.8, radius + 0.65);

        for (let attempt = 0; attempt < 96; attempt += 1) {
          const region = zoneRegions[Math.floor(next() * zoneRegions.length)] ||
            { center: { x: 0, z: 0 } };
          const roll = next();
          let x;
          let z;

          if (roll < preferences.mapEdge) {
            const side = Math.floor(next() * 4);
            const edgeDepth = outerSafety + next() * Math.max(0.5, mapEdgeBand - outerSafety);
            const cornerBias = next() < 0.46;
            const alongX = cornerBias
              ? (next() < 0.5 ? minX + outerSafety + next() * 10 : maxX - outerSafety - next() * 10)
              : minX + outerSafety + next() * Math.max(1, maxX - minX - outerSafety * 2);
            const alongZ = cornerBias
              ? (next() < 0.5 ? minZ + outerSafety + next() * 10 : maxZ - outerSafety - next() * 10)
              : minZ + outerSafety + next() * Math.max(1, maxZ - minZ - outerSafety * 2);
            if (side === 0) {
              x = alongX; z = minZ + edgeDepth;
            } else if (side === 1) {
              x = alongX; z = maxZ - edgeDepth;
            } else if (side === 2) {
              x = minX + edgeDepth; z = alongZ;
            } else {
              x = maxX - edgeDepth; z = alongZ;
            }
          } else if (roll < preferences.mapEdge + preferences.plateauEdge) {
            const side = Math.floor(next() * 4);
            const halfPlateau = 27;
            const depth = outerSafety + next() * Math.max(0.5, plateauEdgeBand - outerSafety);
            const along = -halfPlateau + outerSafety +
              next() * Math.max(1, halfPlateau * 2 - outerSafety * 2);
            if (side === 0) {
              x = region.center.x + along; z = region.center.z - halfPlateau + depth;
            } else if (side === 1) {
              x = region.center.x + along; z = region.center.z + halfPlateau - depth;
            } else if (side === 2) {
              x = region.center.x - halfPlateau + depth; z = region.center.z + along;
            } else {
              x = region.center.x + halfPlateau - depth; z = region.center.z + along;
            }
          } else {
            const angle = next() * Math.PI * 2;
            const maxDistance = Math.min(maximumDistance, 25);
            const distance = minimumDistance +
              next() * Math.max(0.5, maxDistance - minimumDistance);
            x = region.center.x + Math.cos(angle) * distance;
            z = region.center.z + Math.sin(angle) * distance;
          }
          if (
            x < minX + outerSafety || x > maxX - outerSafety ||
            z < minZ + outerSafety || z > maxZ - outerSafety
          ) continue;
          if (!isReserved(x, z, radius) && !isOccupied(x, z, radius)) return { x, z };
        }
        return null;
      };

      const placeObject = (type, x, z, variant = 0, rotation = 0) => {
        const record = this.spawn(type, {
          position: { x, y: 0, z },
          variant,
          rotation,
          force: true,
          scene: group,
          palette: definition.palette,
          source: "map-population"
        });
        const object = record.instance;
        object.root.userData.libraryType = type;
        occupied.push({ x, z, radius: placement(type).radius });
        animatedObjects.push({ root: object.root, type, phase: next() * Math.PI * 2 });
        if (object.hitbox) interactables.push(object.hitbox);
        if (object.hitbox && object.colliders.length) {
          object.hitbox.userData.interactionRadius = Math.max(
            ...object.colliders.map((collider) => collider.radius)
          );
        }
        object.colliders.forEach((collider) => {
          const position = collider.offset.clone().applyAxisAngle(
            new this.THREE.Vector3(0, 1, 0),
            rotation
          ).add(object.root.position);
          colliders.push({ position, radius: collider.radius, owner: object.root });
        });
        return object;
      };

      const population = BF.BiomeRules.getMapPopulation(definition);
      const rockCluster = BF.MicroScenes.getMapCluster("rock");
      const resourceCluster = BF.MicroScenes.getMapCluster("resource");
      const ambientCluster = BF.MicroScenes.getMapCluster("ambient");
      const plateauCount = BF.clamp(zoneRegions.length || 1, 1, 6);
      const mapBudget = MAP_OBJECT_BUDGETS[plateauCount];
      const lockedBudget = definition.populationBudget || {};
      const targetObjectBudget = Number.isFinite(Number(lockedBudget.targetObjects))
        ? BF.clamp(Math.round(Number(lockedBudget.targetObjects)), mapBudget.min, mapBudget.max)
        : Math.round(mapBudget.min + next() * (mapBudget.max - mapBudget.min));
      const resourceCount = Number.isFinite(Number(lockedBudget.resources))
        ? BF.clamp(
            Math.round(Number(lockedBudget.resources)),
            mapBudget.resourcesMin,
            Math.min(mapBudget.resourcesMax, targetObjectBudget)
          )
        : Math.round(
            mapBudget.resourcesMin +
            next() * (mapBudget.resourcesMax - mapBudget.resourcesMin)
          );
      const landmarkCount = mapBudget.landmarksMin + Math.floor(
        next() * (mapBudget.landmarksMax - mapBudget.landmarksMin + 1)
      );
      const landmarkTemplate = BF.MicroScenes.getMapLandmark(population.profileId);
      const landmarkObjectBudget = landmarks.length
        ? landmarks.length
        : landmarkCount * landmarkTemplate.length;
      const remainingAfterResources = Math.max(
        0,
        targetObjectBudget - resourceCount - landmarkObjectBudget
      );
      const mineralDensity = BF.clamp(population.rockCount / 18, 0.35, 1);
      const obstacleBudget = Math.max(
        plateauCount * 2,
        Math.round(remainingAfterResources * (0.27 + mineralDensity * 0.12))
      );
      const decorationBudget = Math.max(
        0,
        targetObjectBudget - resourceCount - obstacleBudget - landmarkObjectBudget
      );
      let placedRocks = 0;
      let clusterGuard = 0;
      while (placedRocks < obstacleBudget && clusterGuard < obstacleBudget * 5) {
        clusterGuard += 1;
        const center = randomPosition(7, 27, placement("rock").radius, "rock");
        if (!center) continue;
        const remaining = obstacleBudget - placedRocks;
        const clusterSize = Math.min(
          remaining,
          next() < rockCluster.isolatedChance
            ? 1
            : rockCluster.minSize + Math.floor(next() * rockCluster.sizeRange)
        );
        const clusterRotation = next() * Math.PI * 2;
        for (let member = 0; member < clusterSize; member += 1) {
          const isAnchor = member === 0;
          const distance = isAnchor ? 0 : rockCluster.minRadius + next() * rockCluster.radiusRange;
          const angle = clusterRotation + next() * Math.PI * 2;
          const x = center.x + Math.cos(angle) * distance;
          const z = center.z + Math.sin(angle) * distance;
          const radius = placement("rock").radius;
          if (!isAnchor && (isReserved(x, z, radius) || isOccupied(x, z, radius))) continue;
          const volumeRoll = next();
          const variant = isAnchor || volumeRoll < 0.75 ? 2 : volumeRoll < 0.93 ? 1 : 0;
          const object = placeObject("rock", x, z, variant, next() * Math.PI * 2);
          const scaleBase = variant === 2
            ? 1.28 + next() * 0.34
            : variant === 1 ? 1.08 + next() * 0.22 : 0.88 + next() * 0.18;
          object.root.scale.multiplyScalar(scaleBase);
          object.root.userData.microScene = "rock-cluster";
          object.root.userData.permanentObstacle = true;
          placedRocks += 1;
          if (placedRocks >= obstacleBudget) break;
        }
      }

      let placedResources = 0;
      let resourceGuard = 0;
      const pickResourceKind = () => {
        const entries = (population.resourceWeights || []).map((entry) => ({
          definition: { type: entry.family },
          weight: entry.weight
        }));
        return weightedPick(entries, next)?.definition?.type ||
          population.resourcePattern[placedResources % population.resourcePattern.length];
      };
      while (placedResources < resourceCount && resourceGuard < resourceCount * 6) {
        resourceGuard += 1;
        const kind = pickResourceKind();
        const center = randomPosition(3.5, 24, placement(kind).radius, kind);
        if (!center) continue;
        const remaining = resourceCount - placedResources;
        const clusterSize = Math.min(
          remaining,
          next() < resourceCluster.isolatedChance
            ? 1
            : resourceCluster.minSize + Math.floor(next() * resourceCluster.sizeRange)
        );
        const rotation = next() * Math.PI * 2;
        for (let member = 0; member < clusterSize; member += 1) {
          const memberKind = member === 0 ? kind : pickResourceKind();
          const isAnchor = member === 0;
          const distance = isAnchor ? 0 : resourceCluster.minRadius + next() * resourceCluster.radiusRange;
          const angle = rotation + next() * Math.PI * 2;
          const x = center.x + Math.cos(angle) * distance;
          const z = center.z + Math.sin(angle) * distance;
          const radius = placement(memberKind).radius;
          if (!isAnchor && (isReserved(x, z, radius) || isOccupied(x, z, radius))) continue;
          const object = placeObject(
            memberKind, x, z, (placedResources + member) % 3, next() * Math.PI * 2
          );
          object.root.userData.microScene = "resource-cluster";
          placedResources += 1;
          if (placedResources >= resourceCount) break;
        }
      }

      const decorationWeightTotal = population.decorations.reduce(
        (sum, [, weight]) => sum + Math.max(0, Number(weight) || 0),
        0
      );
      let allocatedDecorations = 0;
      population.decorations.forEach(([type, count], familyIndex) => {
        const isLastFamily = familyIndex === population.decorations.length - 1;
        const denseCount = isLastFamily
          ? Math.max(0, decorationBudget - allocatedDecorations)
          : Math.max(0, Math.floor(
            decorationBudget * (Math.max(0, Number(count) || 0) / Math.max(1, decorationWeightTotal))
          ));
        allocatedDecorations += denseCount;
        let placed = 0;
        let guard = 0;
        while (placed < denseCount && guard < denseCount * 5) {
          guard += 1;
          const center = randomPosition(2.5, 27, placement(type).radius, type);
          if (!center) continue;
          const remaining = denseCount - placed;
          const clusterSize = Math.min(
            remaining,
            next() < ambientCluster.isolatedChance
              ? 1
              : ambientCluster.minSize + Math.floor(next() * ambientCluster.sizeRange)
          );
          const rotation = next() * Math.PI * 2;
          for (let member = 0; member < clusterSize; member += 1) {
            const isAnchor = member === 0;
            const distance = isAnchor ? 0 : ambientCluster.minRadius + next() * ambientCluster.radiusRange;
            const angle = rotation + next() * Math.PI * 2;
            const x = center.x + Math.cos(angle) * distance;
            const z = center.z + Math.sin(angle) * distance;
            const radius = placement(type).radius;
            if (!isAnchor && (isReserved(x, z, radius) || isOccupied(x, z, radius))) continue;
            const object = placeObject(
              type, x, z, (placed + familyIndex + member) % 3, next() * Math.PI * 2
            );
            object.root.userData.microScene = "ambient-cluster";
            placed += 1;
            if (placed >= denseCount) break;
          }
        }
      });

      if (!landmarks.length) {
        for (let landmarkIndex = 0; landmarkIndex < landmarkCount; landmarkIndex += 1) {
          const center = randomPosition(9, 25, 4.2, "stele");
          if (!center) continue;
          const rotation = next() * Math.PI * 2;
          const cosine = Math.cos(rotation);
          const sine = Math.sin(rotation);
          landmarkTemplate.forEach(([type, offsetX, offsetZ, variant]) => {
            const x = center.x + offsetX * cosine - offsetZ * sine;
            const z = center.z + offsetX * sine + offsetZ * cosine;
            const object = placeObject(type, x, z, variant, rotation + next() * 0.45);
            object.root.userData.biomeLandmark = population.profileId;
          });
        }
      }
      landmarks.forEach(([type, x, z, variant, rotation]) => {
        placeObject(type, x, z, variant, rotation);
      });
      return {
        occupied,
        plateauCount,
        targetObjectBudget,
        obstacleBudget,
        resourceCount,
        decorationBudget,
        landmarkCount: landmarks.length ? 1 : landmarkCount,
        resourceFamilies: population.resourceFamilies,
        richness: population.richness
      };
    }

    clear(dispose = false) {
      this.instances.forEach((record) => {
        record.root?.parent?.remove(record.root);
        if (dispose && BF.disposeObject && record.root) BF.disposeObject(record.root);
      });
      this.instances.length = 0;
    }
  }

  ObjectSpawner.mapObjectBudgets = MAP_OBJECT_BUDGETS;
  BF.ObjectSpawner = ObjectSpawner;
})(window);
