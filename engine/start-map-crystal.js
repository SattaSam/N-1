(function (global) {
  "use strict";

  const BF = global.BlueFox3D;
  if (!BF?.maps?.crystal || !BF.ObjectSpawner) return;

  /*
   * Repères calculés sur le plateau carré de 54 x 54 unités à partir
   * de la texture 01_1.png fournie :
   * - ellipse centrale : future capsule 3D ;
   * - emprise nord : première extension / Refuge ;
   * - emprise sud : extension finale / Base.
   *
   * Les marges sont volontairement légèrement supérieures aux traits
   * de l'annotation afin qu'aucun objet, collider ou micro-scène ne
   * déborde sur les futures constructions.
   */
  const constructionExclusionZones = Object.freeze([
    Object.freeze({
      id: "crash-capsule",
      label: "Capsule 3D",
      shape: "ellipse",
      center: Object.freeze({ x: 0.8, z: -0.9 }),
      radiusX: 7.0,
      radiusZ: 4.7,
      clearance: 1.25
    }),
    Object.freeze({
      id: "crash-refuge-extension",
      label: "Extension Refuge",
      shape: "polygon",
      points: Object.freeze([
        Object.freeze({ x: -3.1, z: -13.5 }),
        Object.freeze({ x: 10.4, z: -10.1 }),
        Object.freeze({ x: 8.9, z: -5.5 }),
        Object.freeze({ x: -2.3, z: -6.4 })
      ]),
      clearance: 1.5
    }),
    Object.freeze({
      id: "crash-base-extension",
      label: "Extension Base",
      shape: "polygon",
      points: Object.freeze([
        Object.freeze({ x: -10.8, z: -2.8 }),
        Object.freeze({ x: 4.0, z: 0.8 }),
        Object.freeze({ x: 0.6, z: 11.0 }),
        Object.freeze({ x: -11.5, z: 7.7 })
      ]),
      clearance: 1.75
    })
  ]);

  /*
   * Objets tutoriels fixes : positions choisies hors de la capsule, des trois
   * emprises de construction, de l'entrée et des cinq repères historiques.
   * Ils sont ajoutés aux landmarks avant la population aléatoire : le moteur
   * réserve donc leur rayon et ne peut rien générer par-dessus.
   */
  const tutorialLandmarks = Object.freeze([
    Object.freeze(["bush", -19, 4, 0, 0.523599]),
    Object.freeze(["bush", 18, 4, 2, -0.785398]),
    Object.freeze(["tree_fallen", -15, -18, 1, 1.047198])
  ]);

  const tutorialPopulationBudget = Object.freeze({
    targetObjects: 68,
    resources: 18
  });

  Object.assign(BF.maps.crystal, {
    name: "Site du crash",
    zones: ["Zone du crash"],
    plateauCount: 1,
    terrainUrls: ["./Images/01_1.png"],
    terrainUrl: "./Images/01_1.png",
    sceneUrl: "./Images/1Crystal site du crash.png",
    exits: {},
    profile: "crystalline",
    constructionExclusionZones,
    tutorialLandmarks,
    populationBudget: tutorialPopulationBudget,
    crashSite: Object.freeze({
      capsuleAsset: "./assets/models/BlueFox_Capsule_Depart.glb",
      capsuleAnchor: Object.freeze({ x: 0.8, y: 0, z: -0.9 }),
      capsuleRotation: 0,
      capsuleScale: 1,
      capsuleGroundOffset: 0.16,
      stages: Object.freeze(["crash", "refuge", "base"]),
      exclusionZoneIds: Object.freeze(
        constructionExclusionZones.map((zone) => zone.id)
      )
    })
  });

  const pointInPolygon = (x, z, points) => {
    let inside = false;
    for (let current = 0, previous = points.length - 1;
      current < points.length;
      previous = current, current += 1) {
      const a = points[current];
      const b = points[previous];
      const intersects =
        ((a.z > z) !== (b.z > z)) &&
        (x < ((b.x - a.x) * (z - a.z)) / ((b.z - a.z) || Number.EPSILON) + a.x);
      if (intersects) inside = !inside;
    }
    return inside;
  };

  const distanceToSegment = (x, z, start, end) => {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const lengthSquared = dx * dx + dz * dz;
    const ratio = lengthSquared
      ? Math.max(0, Math.min(1, ((x - start.x) * dx + (z - start.z) * dz) / lengthSquared))
      : 0;
    return Math.hypot(
      x - (start.x + ratio * dx),
      z - (start.z + ratio * dz)
    );
  };

  const radiusForRecord = (record) => {
    const placement = BF.ObjectLibrary?.getMapPlacement?.(record.type);
    return Math.max(0.35, Number(placement?.radius) || 0.35);
  };

  const intersectsZone = (record, zone) => {
    const x = Number(record?.position?.x) || 0;
    const z = Number(record?.position?.z) || 0;
    const objectRadius = radiusForRecord(record);
    const clearance = Math.max(0, Number(zone.clearance) || 0);
    const margin = objectRadius + clearance;

    if (zone.shape === "ellipse") {
      const radiusX = Math.max(0.01, zone.radiusX + margin);
      const radiusZ = Math.max(0.01, zone.radiusZ + margin);
      const normalizedX = (x - zone.center.x) / radiusX;
      const normalizedZ = (z - zone.center.z) / radiusZ;
      return normalizedX * normalizedX + normalizedZ * normalizedZ <= 1;
    }

    const points = zone.points || [];
    if (points.length < 3) return false;
    if (pointInPolygon(x, z, points)) return true;
    return points.some((point, index) =>
      distanceToSegment(x, z, point, points[(index + 1) % points.length]) <= margin
    );
  };

  const removeFromArray = (array, predicate) => {
    if (!Array.isArray(array)) return;
    for (let index = array.length - 1; index >= 0; index -= 1) {
      if (predicate(array[index])) array.splice(index, 1);
    }
  };

  const originalPopulateMap = BF.ObjectSpawner.prototype.populateMap;
  if (!originalPopulateMap.__bluefoxCrashSiteProtected) {
    const protectedPopulateMap = function populateMapWithConstructionProtection(options = {}) {
      const instanceStart = this.instances.length;
      const fixedLandmarks = options.definition?.id === "crystal"
        ? options.definition.tutorialLandmarks || []
        : [];
      const landmarks = [...(options.landmarks || [])];
      fixedLandmarks.forEach((landmark) => {
        const alreadyRegistered = landmarks.some((entry) =>
          entry[0] === landmark[0] && entry[1] === landmark[1] && entry[2] === landmark[2]
        );
        if (!alreadyRegistered) landmarks.push([...landmark]);
      });
      const populatedOptions = fixedLandmarks.length
        ? { ...options, landmarks }
        : options;
      const result = originalPopulateMap.call(this, populatedOptions);
      const zones = options.definition?.constructionExclusionZones || [];
      if (!zones.length) return result;

      const generated = this.instances.slice(instanceStart);
      const removedRecords = generated.filter((record) =>
        zones.some((zone) => intersectsZone(record, zone))
      );
      if (!removedRecords.length) {
        return { ...result, constructionExclusions: zones, excludedObjectCount: 0 };
      }

      const removedRoots = new Set(removedRecords.map((record) => record.root).filter(Boolean));
      const removedHitboxes = new Set(
        removedRecords.map((record) => record.instance?.hitbox).filter(Boolean)
      );

      removedRecords.forEach((record) => {
        record.root?.parent?.remove(record.root);
        BF.disposeObject?.(record.root);
      });

      removeFromArray(this.instances, (record) => removedRecords.includes(record));
      removeFromArray(options.interactables, (item) =>
        removedHitboxes.has(item) || removedRoots.has(item?.parent)
      );
      removeFromArray(options.animatedObjects, (item) => removedRoots.has(item?.root));
      removeFromArray(options.colliders, (item) => removedRoots.has(item?.owner));

      if (Array.isArray(result?.occupied)) {
        removeFromArray(result.occupied, (occupied) =>
          zones.some((zone) => intersectsZone({
            type: "reserved-check",
            position: occupied
          }, zone))
        );
      }

      return {
        ...result,
        constructionExclusions: zones,
        excludedObjectCount: removedRecords.length
      };
    };

    protectedPopulateMap.__bluefoxCrashSiteProtected = true;
    protectedPopulateMap.__bluefoxOriginalPopulateMap = originalPopulateMap;
    BF.ObjectSpawner.prototype.populateMap = protectedPopulateMap;
  }

  BF.getCrashSiteLayout = () => ({
    mapId: "crystal",
    capsuleAsset: BF.maps.crystal.crashSite.capsuleAsset,
    capsuleAnchor: { ...BF.maps.crystal.crashSite.capsuleAnchor },
    capsuleRotation: BF.maps.crystal.crashSite.capsuleRotation,
    capsuleScale: BF.maps.crystal.crashSite.capsuleScale,
    tutorialPopulationBudget: { ...BF.maps.crystal.populationBudget },
    tutorialLandmarks: BF.maps.crystal.tutorialLandmarks.map((landmark) => [...landmark]),
    zones: BF.maps.crystal.constructionExclusionZones.map((zone) => ({
      ...zone,
      center: zone.center ? { ...zone.center } : undefined,
      points: zone.points?.map((point) => ({ ...point }))
    }))
  });
})(window);
