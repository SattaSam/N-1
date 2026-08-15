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
  // Budget statique : aucune consommation supplémentaire du RNG et aucun
  // rappel de populateMap. La densité augmente réellement avec la surface.
  // Budget statique : densité progressive sans rappel de populateMap.
  const MAP_OBJECT_BUDGETS = Object.freeze({
    1: Object.freeze({ min: 60, max: 75, resourcesMin: 14, resourcesMax: 20, landmarksMin: 1, landmarksMax: 1 }),
    2: Object.freeze({ min: 94, max: 116, resourcesMin: 24, resourcesMax: 32, landmarksMin: 1, landmarksMax: 1 }),
    3: Object.freeze({ min: 126, max: 152, resourcesMin: 32, resourcesMax: 42, landmarksMin: 1, landmarksMax: 2 }),
    4: Object.freeze({ min: 158, max: 190, resourcesMin: 40, resourcesMax: 52, landmarksMin: 1, landmarksMax: 2 }),
    5: Object.freeze({ min: 190, max: 226, resourcesMin: 48, resourcesMax: 62, landmarksMin: 1, landmarksMax: 2 }),
    6: Object.freeze({ min: 222, max: 264, resourcesMin: 56, resourcesMax: 72, landmarksMin: 1, landmarksMax: 3 })
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
      this.microSceneInstances = [];
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
        root.userData.catalogId = definition.id;
        root.userData.libraryType = type;
        root.userData.functional = definition;
        root.userData.specialRuntimeRoot = true;
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

    registerMicroSceneInstance(template, records, options = {}, instanceRoot = null) {
      if (!template?.id) return null;
      const entry = {
        id: template.id,
        instanceId:
          options.instanceId ||
          instanceRoot?.uuid ||
          instanceRoot?.id ||
          `${template.id}:${this.microSceneInstances.length + 1}`,
        missionId: template.missionId || null,
        missionOnly: template.missionOnly === true,
        rarity: template.rarity || null,
        instanceRoot: instanceRoot || null,
        records: Array.isArray(records) ? records : []
      };
      this.microSceneInstances.push(entry);
      return entry;
    }

    spawnMicroScene(id, options = {}) {
      if (!BF.MicroScenes) throw new Error("ObjectSpawner nécessite MicroScenes.");
      const template = BF.MicroScenes.get(id);

      /*
       * Contrat canonique des compositions CUO Lab.
       *
       * Une MSC personnalisée possède deux niveaux indépendants :
       * - instanceRoot : ancrage global librement déplaçable par le jeu ;
       * - objectPivot : transformation locale sauvegardée par CUO Lab.
       *
       * La racine fonctionnelle construite par ObjectLibrary reste neutre sous
       * le pivot. Les runtimes peuvent ainsi l'animer sans écraser la pose
       * enregistrée. Son échelle intrinsèque est volontairement conservée.
       */
      if (template?.custom) {
        const targetScene = options.scene || this.scene;
        const origin = options.origin || { x: 0, y: 0, z: 0 };
        const instanceRotation = Array.isArray(options.rotation)
          ? options.rotation
          : [0, Number(options.rotation) || 0, 0];
        const instanceRoot = new this.THREE.Group();
        instanceRoot.name = `MSCInstance:${template.id}`;
        instanceRoot.position.set(
          Number(origin.x) || 0,
          Number(origin.y) || 0,
          Number(origin.z) || 0
        );
        instanceRoot.rotation.set(
          Number(instanceRotation[0]) || 0,
          Number(instanceRotation[1]) || 0,
          Number(instanceRotation[2]) || 0
        );
        instanceRoot.userData.microSceneId = template.id;
        instanceRoot.userData.microSceneInstance = true;
        instanceRoot.userData.transformContract = "cuo-lab-canonical-v1";
        targetScene?.add(instanceRoot);

        const records = template.objects.map((entry, index) => {
          const definition = BF.ObjectLibrary.get(entry.type);
          if (!definition) throw new Error(`Objet inconnu : ${entry.type}`);

          const instance = BF.ObjectLibrary.create(
            this.THREE,
            entry.type,
            options.palette || this.palette,
            entry.variant || 0
          );
          const objectRoot = instance.root;
          const objectPivot = new this.THREE.Group();
          const offset = entry.offset || [0, 0, 0];
          const rotation = entry.rotation || [0, 0, 0];

          objectPivot.name = `MSCObjectPivot:${template.id}:${index}`;
          objectPivot.position.set(
            Number(offset[0]) || 0,
            Number(offset[1]) || 0,
            Number(offset[2]) || 0
          );
          objectPivot.rotation.set(
            Number(rotation[0]) || 0,
            Number(rotation[1]) || 0,
            Number(rotation[2]) || 0
          );
          objectPivot.userData.microSceneId = template.id;
          objectPivot.userData.microSceneObjectIndex = index;
          objectPivot.userData.microScenePivot = true;
          objectPivot.userData.transformContract = "cuo-lab-canonical-v1";

          if (objectRoot) {
            objectRoot.position.set(0, 0, 0);
            objectRoot.rotation.set(0, 0, 0);
            if (options.scale != null) objectRoot.scale.setScalar(options.scale);
            objectRoot.userData.spawnSource = options.source || template.id;
            objectPivot.add(objectRoot);
          }
          instanceRoot.add(objectPivot);

          const instanceId = options.instanceId
            ? `${options.instanceId}:${index}`
            : `${definition.id}:msc:${template.id}:${Date.now().toString(36)}:${(++this.instanceSequence).toString(36)}`;
          const metadata = {
            instanceId,
            variant: entry.variant || 0,
            catalogId: definition.id,
            libraryType: entry.type,
            functional: definition,
            microSceneId: template.id,
            microScenePivot: objectPivot
          };
          Object.assign(objectPivot.userData, metadata);
          if (objectRoot) {
            Object.assign(objectRoot.userData, metadata, {
              specialRuntimeRoot: true
            });
          }
          if (instance.hitbox) Object.assign(instance.hitbox.userData, metadata);

          const record = {
            type: entry.type,
            definition,
            instance,
            instanceId,
            root: objectPivot,
            objectRoot,
            pivot: objectPivot,
            instanceRoot,
            position: {
              x: objectPivot.position.x,
              y: objectPivot.position.y,
              z: objectPivot.position.z
            }
          };
          this.instances.push(record);
          return record;
        });

        this.registerMicroSceneInstance(template, records, options, instanceRoot);
        return records;
      }

      const plan = BF.MicroScenes.plan(id, options.origin, options.rotation || 0);
      const records = plan.map((entry) => this.spawn(entry.type, {
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
      records.forEach((record) => {
        if (record?.root?.userData) record.root.userData.microSceneId = template?.id || id;
        if (record?.instance?.hitbox?.userData) {
          record.instance.hitbox.userData.microSceneId = template?.id || id;
        }
      });
      this.registerMicroSceneInstance(template || { id }, records, options, null);
      return records;
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
      group.userData = group.userData || {};
      group.userData.microScenes = this.microSceneInstances;

      const random = options.random || this.random;
      const next = () => typeof random === "function" ? random() : random.next();
      const { minX, maxX, minZ, maxZ } = bounds;
      const plateauCount = BF.clamp(zoneRegions.length || 1, 1, 6);
      const mapCenter = {
        x: (minX + maxX) / 2,
        z: (minZ + maxZ) / 2
      };
      const occupied = [];
      const placementPreferences = {
        // Les volumes rouges structurent les lisières et masquent les raccords
        // entre plateaux. Le centre reste volontairement dégagé afin que les
        // chemins principaux restent immédiatement lisibles.
        large: { mapEdge: 0.56, plateauEdge: 0.36, center: 0.08 },
        medium: { mapEdge: 0.44, plateauEdge: 0.36, center: 0.20 },
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
      const isReserved = (x, z, radius, type = "frond") => {
        const objectPlacement = placement(type);
        const blocksPrincipalAxis =
          (plateauCount === 4 || plateauCount === 6) &&
          (objectPlacement.volume === "large" || BF.ObjectLibrary.get(type)?.obstacle === true) &&
          (
            Math.abs(x - mapCenter.x) < radius + 3.6 ||
            Math.abs(z - mapCenter.z) < radius + 3.6
          );
        return blocksPrincipalAxis || reservedPoints.some((point) =>
          Math.hypot(x - point.x, z - point.z) < radius + point.clearance
        ) ||
        protectedCorridors.some(({ start, end }) =>
          segmentDistanceSquared(start, end, x, z) <
            // Couloir libre plus franc : les grands obstacles peuvent border
            // le passage, jamais le rétrécir ou le couper.
            (radius + 2.65) * (radius + 2.65)
        );
      };
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
            if (volume === "large" || volume === "medium") {
              const seamJitter = (next() - 0.5) * (volume === "large" ? 1.8 : 2.6);
              if (side < 2) z += seamJitter;
              else x += seamJitter;
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
          if (!isReserved(x, z, radius, type) && !isOccupied(x, z, radius)) return { x, z };
        }
        return null;
      };

      let floatingHeightIndex = 0;
      let elevatedFogIndex = 0;
      const placedTypeCounts = new Map();
      const contextText = `${definition.generator?.biomeId || ""} ${definition.name || ""} ${definition.description || ""} ${(definition.traits || []).map((trait) => `${trait.id || ""} ${trait.label || ""}`).join(" ")}`.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const floatingContext = /flott|suspend|levitat|ilot|island/.test(contextText);
      const frozenIdentity = `${definition.generator?.biomeId || ""} ${definition.profile || ""} ${definition.name || ""} ${(definition.traits || []).map((trait) => trait.id || "").join(" ")}`.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const frozenRockContext = /(?:^|\s)(?:frozen|ice|snow|glace|glaciaire|banquise|neige|toundra)(?:\s|$)/.test(frozenIdentity);
      const snowRockTypes = new Set(["rock", "strong_rock", "large_rock"]);
      const placeObject = (type, x, z, variant = 0, rotation = 0) => {
        const height = type === "mobile_islet"
          ? 2.5 + floatingHeightIndex++ * 2.4
          : type === "fog_bank" && floatingContext
            ? (elevatedFogIndex++ % 2 ? 5.5 : 1.2)
            : 0;
        const record = this.spawn(type, {
          position: { x, y: height, z },
          variant,
          rotation,
          force: true,
          scene: group,
          palette: definition.palette,
          source: "map-population"
        });
        const object = record.instance;
        placedTypeCounts.set(type, (placedTypeCounts.get(type) || 0) + 1);
        if (frozenRockContext && snowRockTypes.has(type) && placedTypeCounts.get(type) % 3 === 0) {
          object.root.traverse((node) => {
            if (!node.isMesh || !node.material) return;
            const whiten = (material) => {
              const copy = material.clone();
              if (copy.color) copy.color.lerp(new this.THREE.Color(0xe4eef2), 0.72);
              copy.roughness = Math.max(0.78, Number(copy.roughness) || 0);
              return copy;
            };
            node.material = Array.isArray(node.material)
              ? node.material.map(whiten)
              : whiten(node.material);
          });
          object.root.userData.snowCoveredRock = true;
        }
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
      const mapBudget = MAP_OBJECT_BUDGETS[plateauCount];
      const lockedBudget = definition.populationBudget || {};
      const allowCustomRange = lockedBudget.allowCustomRange === true;
      const targetObjectBudget = Number.isFinite(Number(lockedBudget.targetObjects))
        ? BF.clamp(
            Math.round(Number(lockedBudget.targetObjects)),
            allowCustomRange ? 1 : mapBudget.min,
            allowCustomRange ? mapBudget.max * 2 : mapBudget.max
          )
        : Math.round(mapBudget.min + next() * (mapBudget.max - mapBudget.min));
      const resourceCount = Number.isFinite(Number(lockedBudget.resources))
        ? BF.clamp(
            Math.round(Number(lockedBudget.resources)),
            allowCustomRange ? 0 : mapBudget.resourcesMin,
            Math.min(
              allowCustomRange ? targetObjectBudget : mapBudget.resourcesMax,
              targetObjectBudget
            )
          )
        : Math.round(
            mapBudget.resourcesMin +
            next() * (mapBudget.resourcesMax - mapBudget.resourcesMin)
          );
      const requestedFeaturedSceneIds = Array.isArray(definition.generator?.featuredMicroSceneIds)
        ? definition.generator.featuredMicroSceneIds.filter(Boolean)
        : [definition.generator?.featuredMicroSceneId].filter(Boolean);
      const landmarkCount = Math.max(
        requestedFeaturedSceneIds.length,
        mapBudget.landmarksMin + Math.floor(
          next() * (mapBudget.landmarksMax - mapBudget.landmarksMin + 1)
        )
      );
      const landmarkTemplate = BF.MicroScenes.getMapLandmark(population.profileId);
      const mapNumber = Number(definition.number);
      const discoveryIndex = Number(definition.generator?.discoveryIndex);
      const tutorialProtected = Boolean(
        definition.isStartingMap ||
        definition.startingMap ||
        definition.id === "crystal" ||
        (Number.isFinite(mapNumber) && mapNumber >= 1 && mapNumber <= 3) ||
        (Number.isFinite(discoveryIndex) && discoveryIndex >= 0 && discoveryIndex <= 2)
      );
      const generatedSpecialScenes = definition.generated && !tutorialProtected
        ? (definition.generator?.microSceneIds || [])
          .map((id) => BF.MicroScenes.get(id))
          .filter((scene) => scene && [
            "charged_crystals", "abandoned_drone_site", "nocturnal_den",
            "local_storm", "suspended_island", "predator_flora"
          ].includes(Object.keys(BF.MicroScenes.data).find((key) => BF.MicroScenes.data[key] === scene)))
        : [];
      const featuredGeneratedScenes = definition.generated && !tutorialProtected
        ? requestedFeaturedSceneIds.map((id) => BF.MicroScenes.get(id)).filter(Boolean)
        : [];
      const generationContext = `${
        definition.generator?.biomeId || ""
      } ${definition.name || ""} ${definition.description || ""} ${
        (definition.traits || []).map((trait) => `${trait.id || ""} ${trait.label || ""}`).join(" ")
      }`.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const dedicatedFloatingIslands = !tutorialProtected && (
        definition.generator?.biomeId === "floating_islands" ||
        Number(definition.number) === 25 ||
        (/ile|island/.test(generationContext) && /flott|floating|suspend/.test(generationContext))
      );
      const magneticContext = !tutorialProtected && /magnet/.test(generationContext);
      const magneticDesert = magneticContext && /desert/.test(generationContext);
      const levitatingRockDesert = !tutorialProtected &&
        magneticDesert &&
        /roch|rock/.test(generationContext) &&
        /levitat|flott|floating|suspend/.test(generationContext);
      const floatingSwamp = !tutorialProtected &&
        (population.profileId === "swamp" || /marais|swamp/.test(generationContext)) &&
        /ile|island/.test(generationContext) &&
        /flott|floating|suspend/.test(generationContext);
      const glassSteppe = /steppe.*verre|verre.*steppe|glass.*steppe|steppe.*glass/.test(generationContext);
      const vitrifiedLand = /lande vitrifi|vitrified.*heath|vitrified/.test(generationContext);
      const fungalMushroomMap =
        definition.generator?.biomeId === "fungal" ||
        /fong|fung|champignon|mushroom|spore/.test(generationContext);
      const swampMushroomMap =
        population.profileId === "swamp" ||
        /marais|swamp/.test(generationContext);
      const underwaterContext =
        population.profileId === "aquatic" ||
        /sous marin|underwater|ocean/.test(generationContext);
      const bioluminescentUnderwater = underwaterContext &&
        /biolum|luminescen|fluorescen/.test(generationContext);
      const populationRoll = (() => {
        const text = `${definition.id || ""}:${definition.seed || ""}:${definition.number || ""}`;
        let hash = 2166136261;
        for (let index = 0; index < text.length; index += 1) {
          hash ^= text.charCodeAt(index);
          hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0) / 4294967296;
      })();
      const requiresSuspendedIsland = !tutorialProtected && (
        dedicatedFloatingIslands ||
        levitatingRockDesert ||
        floatingSwamp
      );
      const suspendedIslandScene = requiresSuspendedIsland
        ? BF.MicroScenes.get("suspended_island")
        : null;
      const floatingIslandsCustomScene = dedicatedFloatingIslands
        ? BF.MicroScenes.get("MSC-CUSTOM-ILES-SUSPENDUES2")
        : null;
      const ruinSceneIds = /megalo|city|cite|ruine.*jungle|jungle.*ruine|ruine.*envahi|envahi.*ruine/.test(generationContext)
        ? [
            "MSC-CUSTOM-COMPOSANT-RUIN", "MSC-CUSTOM-HABITAT-RUINE",
            "MSC-CUSTOM-RUINE-MODULAIRE1", "MSC-CUSTOM-RUINE-MODULAIRE2",
            "MSC-CUSTOM-WALL-RUIN-COLLAPSED", "MSC-CUSTOM-WALL-RUIN-STRAIGHT"
          ]
        : [];
      const magneticMajorSceneIds = magneticContext
        ? [
            "MSC-CUSTOM-CARRIEREDECRISTAUX1", "MSC-CUSTOM-BASALT-RIFT"
          ]
        : [];
      const underwaterCoralSceneIds = bioluminescentUnderwater
        ? [
            "MSC-CUSTOM-CORAILBIOLUMINESCENT1",
            "MSC-CUSTOM-CORAILBIOLUMINESCENT2",
            "MSC-CUSTOM-CORAILBIOLUMINESCENT3"
          ]
        : [];
      const landmarkObjectBudget = landmarks.length
        ? landmarks.length
        : landmarkCount * landmarkTemplate.length;
      let remainingAfterResources = Math.max(
        0,
        targetObjectBudget - resourceCount - landmarkObjectBudget
      );

      const spawnPreservedCustomScene = (template, minimumDistance = 10) => {
        if (!template) return false;
        const sceneRadius = Math.max(3, template.radius || 3);
        const center = randomPosition(minimumDistance, 24, sceneRadius, "stele");
        if (!center) return false;
        this.spawnMicroScene(template.id, {
          origin: { x: center.x, y: 0, z: center.z },
          rotation: next() * Math.PI * 2,
          scene: group,
          palette: definition.palette,
          source: "map-population-custom"
        });
        occupied.push({ x: center.x, z: center.z, radius: sceneRadius });
        template.objects.forEach((entry) => {
          placedTypeCounts.set(entry.type, (placedTypeCounts.get(entry.type) || 0) + 1);
        });
        return true;
      };

      if (underwaterCoralSceneIds.length) {
        const coralScenes = underwaterCoralSceneIds
          .map((id) => BF.MicroScenes.get(id))
          .filter(Boolean);
        const selectedCoralScene = coralScenes[
          Math.min(coralScenes.length - 1, Math.floor(populationRoll * coralScenes.length))
        ];
        if (spawnPreservedCustomScene(selectedCoralScene, 5)) {
          group.userData.underwaterCoralMicroSceneId = selectedCoralScene.id;
          remainingAfterResources = Math.max(
            0,
            remainingAfterResources - selectedCoralScene.objects.length
          );
        }
      }

      const guaranteeGiantMushrooms = () => {
        const target = fungalMushroomMap ? 2 : swampMushroomMap ? 1 : 0;
        if (!target) return 0;
        const offsets = [
          [-12, -10], [12, 10], [-13, 11], [13, -11],
          [-8, 14], [8, -14], [-16, 3], [16, -3]
        ];
        let placed = 0;
        for (let index = 0; index < offsets.length && placed < target; index += 1) {
          const region = zoneRegions[index % Math.max(1, zoneRegions.length)] ||
            { center: { x: 0, z: 0 } };
          const [offsetX, offsetZ] = offsets[index];
          const x = region.center.x + offsetX;
          const z = region.center.z + offsetZ;
          const radius = placement("giant_mushroom").radius;
          if (isReserved(x, z, radius, "giant_mushroom") || isOccupied(x, z, radius)) continue;
          const object = placeObject(
            "giant_mushroom",
            x,
            z,
            placed % 3,
            next() * Math.PI * 2
          );
          object.root.userData.biomeIdentity = fungalMushroomMap
            ? "fungal-giant-mushroom"
            : "swamp-giant-mushroom";
          placed += 1;
        }
        return placed;
      };
      guaranteeGiantMushrooms();

      const mineralDensity = BF.clamp(population.rockCount / 18, 0.35, 1);
      // Les rochers restent structurants sans absorber la majorité du budget
      // décoratif sur les grandes cartes.
      // Plafond rocheux volontairement bas.
      const obstacleBudget = Math.max(
        plateauCount,
        Math.round(remainingAfterResources * (0.09 + mineralDensity * 0.05))
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
          if (!isAnchor && (isReserved(x, z, radius, "rock") || isOccupied(x, z, radius))) continue;
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
          if (!isAnchor && (isReserved(x, z, radius, memberKind) || isOccupied(x, z, radius))) continue;
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
        const calculatedTargetCount = type === "giant_mushroom"
          ? Math.max(
              0,
              Math.min(fungalMushroomMap ? Math.max(2, Math.min(6, plateauCount)) : 2, denseCount) -
                (placedTypeCounts.get(type) || 0)
            )
          : type === "electrostatic_storm"
          ? Math.min(6, denseCount)
          : type === "crystalline_tree" && magneticContext
            ? Math.min(6, denseCount)
            : type === "crystalline_tree" && (glassSteppe || vitrifiedLand)
              ? Math.min(3, denseCount)
              : type === "mobile_islet" && magneticContext
                ? Math.min(magneticDesert ? 5 : 3, denseCount)
                : denseCount;
        // Sur une carte fongique, le poids décoratif ne doit jamais être pris
        // pour un nombre illimité d'instances. Les lanternes restent présentes,
        // mais les éventails à spores deviennent la couverture dominante.
        const fungalTypeLimit = fungalMushroomMap && type === "lantern_mushrooms"
          ? plateauCount * 8
          : fungalMushroomMap && type === "spore"
            ? plateauCount * 14
            : Infinity;
        const targetCount = Math.min(
          calculatedTargetCount,
          Math.max(0, fungalTypeLimit - (placedTypeCounts.get(type) || 0))
        );
        let placed = 0;
        let guard = 0;
        while (placed < targetCount && guard < Math.max(5, targetCount * 5)) {
          guard += 1;
          const center = randomPosition(2.5, 27, placement(type).radius, type);
          if (!center) continue;
          const remaining = targetCount - placed;
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
            if (!isAnchor && (isReserved(x, z, radius, type) || isOccupied(x, z, radius))) continue;
            const object = placeObject(
              type, x, z, (placed + familyIndex + member) % 3, next() * Math.PI * 2
            );
            object.root.userData.microScene = "ambient-cluster";
            placed += 1;
            if (placed >= denseCount) break;
          }
        }
      });

      // Les trois signatures validées reçoivent systématiquement une MSC
      // îlot suspendu. Les autres contextes magnétiques/alien restent probabilistes.
      let guaranteedSuspendedIslandSpawned = false;
      if (suspendedIslandScene && requiresSuspendedIsland) {
        const center = randomPosition(
          8,
          25,
          Math.max(4.2, Number(suspendedIslandScene.radius) || 0),
          "stele"
        );
        if (center) {
          this.spawnMicroScene(suspendedIslandScene.id, {
            origin: { x: center.x, y: 0, z: center.z },
            rotation: next() * Math.PI * 2,
            scene: group,
            palette: definition.palette,
            source: "map-population-guaranteed-suspended-island"
          });
          occupied.push({
            x: center.x,
            z: center.z,
            radius: Math.max(4.2, Number(suspendedIslandScene.radius) || 0)
          });
          suspendedIslandScene.objects.forEach((entry) => {
            placedTypeCounts.set(
              entry.type,
              (placedTypeCounts.get(entry.type) || 0) + 1
            );
          });
          guaranteedSuspendedIslandSpawned = true;
        }
      }

      // Les MSC Custom conservent ici leurs pivots/rotations/hauteurs CUO.
      const customFloatingSpawned = floatingIslandsCustomScene && next() < 0.78
        ? spawnPreservedCustomScene(floatingIslandsCustomScene, 8)
        : false;
      if (ruinSceneIds.length && next() < 0.58) {
        const candidates = ruinSceneIds.map((id) => BF.MicroScenes.get(id)).filter(Boolean);
        if (candidates.length) spawnPreservedCustomScene(candidates[Math.floor(next() * candidates.length)], 8);
      }
      if (magneticMajorSceneIds.length && next() < 0.72) {
        const candidates = magneticMajorSceneIds.map((id) => BF.MicroScenes.get(id)).filter(Boolean);
        if (candidates.length) spawnPreservedCustomScene(candidates[Math.floor(next() * candidates.length)], 7);
      }

      const ensureCount = (type, target, minDistance = 5, maxDistance = 22, guardMultiplier = 16) => {
        let guard = 0;
        while ((placedTypeCounts.get(type) || 0) < target && guard < target * guardMultiplier) {
          guard += 1;
          const center = randomPosition(minDistance, maxDistance, placement(type).radius, type);
          if (center) placeObject(type, center.x, center.z, guard % 3, next() * Math.PI * 2);
        }
      };
      if (glassSteppe || vitrifiedLand) ensureCount("crystalline_tree", 2 + (populationRoll >= 0.5 ? 1 : 0));
      if (magneticContext) ensureCount("crystalline_tree", 2 + Math.floor(populationRoll * 5));
      if (fungalMushroomMap || swampMushroomMap) {
        ensureCount(
          "giant_mushroom",
          fungalMushroomMap ? Math.max(2, Math.min(6, plateauCount)) : 1,
          4,
          24,
          96
        );
      }
      const isletChance = magneticDesert ? 0.82 : 0.56;
      if (magneticContext && populationRoll < isletChance) {
        const range = magneticDesert ? 4 : 3;
        ensureCount("mobile_islet", 1 + Math.floor((populationRoll / isletChance) * range), 8, 25);
      }
      if (magneticContext && !["mobile_islet", "electrostatic_storm", "crystalline_tree"].some((type) => (placedTypeCounts.get(type) || 0) > 0)) {
        const signatures = ["mobile_islet", "electrostatic_storm", "crystalline_tree"];
        const type = signatures[Math.floor(next() * signatures.length)];
        const center = randomPosition(7, 24, placement(type).radius, type);
        if (center) placeObject(type, center.x, center.z, Math.floor(next() * 3), next() * Math.PI * 2);
      }
      if (dedicatedFloatingIslands) {
        let guard = 0;
        while ((placedTypeCounts.get("mobile_islet") || 0) < 3 && guard < 24) {
          guard += 1;
          const center = randomPosition(8, 25, placement("mobile_islet").radius, "mobile_islet");
          if (center) placeObject("mobile_islet", center.x, center.z, guard % 3, next() * Math.PI * 2);
        }
      }

      if (!landmarks.length) {
        for (let landmarkIndex = 0; landmarkIndex < landmarkCount; landmarkIndex += 1) {
          const specialChance = ["magnetic", "electrical", "floating_islands", "curiosity"]
            .includes(definition.generator?.biomeId) ? 0.72 : 0.34;
          const specialScene = featuredGeneratedScenes[landmarkIndex]
            ? featuredGeneratedScenes[landmarkIndex]
            : landmarkIndex === 0 && suspendedIslandScene &&
              !customFloatingSpawned && !guaranteedSuspendedIslandSpawned
            ? suspendedIslandScene
            : landmarkIndex === 0 && generatedSpecialScenes.length && next() < specialChance
              ? generatedSpecialScenes[Math.floor(next() * generatedSpecialScenes.length)]
              : null;
          const center = randomPosition(
            9,
            25,
            Math.max(4.2, Number(specialScene?.radius) || 0),
            "stele"
          );
          if (!center) continue;
          const rotation = next() * Math.PI * 2;
          const cosine = Math.cos(rotation);
          const sine = Math.sin(rotation);
          const activeLandmark = specialScene
            ? specialScene.objects.map((entry) => [entry.type, entry.offset[0], entry.offset[2], entry.variant || 0])
            : landmarkTemplate;
          activeLandmark.forEach(([type, offsetX, offsetZ, variant]) => {
            if (type === "electrostatic_storm" && (placedTypeCounts.get(type) || 0) >= 6) return;
            const x = center.x + offsetX * cosine - offsetZ * sine;
            const z = center.z + offsetX * sine + offsetZ * cosine;
            const object = placeObject(type, x, z, variant, rotation + next() * 0.45);
            object.root.userData.biomeLandmark = specialScene?.id || population.profileId;
          });
        }
      }
      landmarks.forEach(([type, x, z, variant, rotation]) => {
        if (type === "electrostatic_storm" && (placedTypeCounts.get(type) || 0) >= 6) return;
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
        richness: population.richness,
        requiredSuspendedIsland: Boolean(suspendedIslandScene),
        guaranteedSuspendedIslandSpawned,
        suspendedIslandRule: requiresSuspendedIsland
          ? dedicatedFloatingIslands
            ? "floating-islands"
            : levitatingRockDesert
              ? "levitating-rock-desert"
              : floatingSwamp
                ? "floating-swamp"
                : null
          : null
      };
    }

    clear(dispose = false) {
      this.instances.forEach((record) => {
        record.root?.parent?.remove(record.root);
        if (dispose && BF.disposeObject && record.root) BF.disposeObject(record.root);
      });
      this.instances.length = 0;
      this.microSceneInstances.length = 0;
    }
  }

  ObjectSpawner.mapObjectBudgets = MAP_OBJECT_BUDGETS;
  BF.ObjectSpawner = ObjectSpawner;
})(window);
