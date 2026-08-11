(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (BF.PersistentMicroScenes?.version === "20.0-test") return;

  const clone = (value) =>
    value == null ? value : JSON.parse(JSON.stringify(value));

  const recordId = (definition, spec) =>
    spec.instanceId ||
    `${definition.id}:${spec.missionId || "world"}:${spec.microSceneId}`;

  const list = (definition) => {
    definition.persistentMicroScenes ||= [];
    return definition.persistentMicroScenes;
  };

  const saveDefinition = (definition) =>
    BF.MapIntegrity?.persistGeneratedDefinition?.(definition) || false;

  const pointInside = (region, point, radius = 0) => (
    point.x >= Number(region.minX) + radius &&
    point.x <= Number(region.maxX) - radius &&
    point.z >= Number(region.minZ) + radius &&
    point.z <= Number(region.maxZ) - radius
  );

  const clearOfColliders = (built, point, clearance) =>
    (built.colliders || []).every((collider) => {
      const p = collider?.position;
      if (!p) return true;
      return Math.hypot(point.x - p.x, point.z - p.z) >=
        clearance + Math.max(0, Number(collider.radius) || 0);
    });

  const clearOfReserved = (definition, point, clearance) => {
    const reserved = [
      definition.entry,
      ...Object.values(definition.runtimeExits || definition.exits || {})
    ].filter(Boolean);

    return reserved.every((candidate) =>
      Math.hypot(
        point.x - (Number(candidate.x) || 0),
        point.z - (Number(candidate.z) || 0)
      ) >= clearance + 4
    );
  };

  const candidatePoints = (built, definition, radius = 7) => {
    const entry = definition.entry || { x: 0, z: 0 };
    const margin = Math.max(2, radius + 1.5);

    const regions = (built.walkableRegions || [])
      .filter((region) =>
        Number(region.maxX) - Number(region.minX) >= margin * 2 &&
        Number(region.maxZ) - Number(region.minZ) >= margin * 2
      )
      .map((region) => ({
        region,
        cx: (Number(region.minX) + Number(region.maxX)) / 2,
        cz: (Number(region.minZ) + Number(region.maxZ)) / 2
      }))
      .sort((a, b) =>
        Math.hypot(b.cx - (entry.x || 0), b.cz - (entry.z || 0)) -
        Math.hypot(a.cx - (entry.x || 0), a.cz - (entry.z || 0))
      );

    const offsets = [
      [0, 0], [7, 0], [-7, 0], [0, 7], [0, -7],
      [7, 7], [-7, 7], [7, -7], [-7, -7]
    ];

    return regions.flatMap(({ region, cx, cz }) =>
      offsets.map(([dx, dz]) => ({
        region,
        point: { x: cx + dx, y: 0, z: cz + dz }
      }))
    );
  };

  const findSafeAnchor = (built, definition, radius = 7, preferred = null) => {
    const margin = Math.max(2, radius + 1.5);
    const regions = built.walkableRegions || [];

    if (
      preferred &&
      regions.some((region) => pointInside(region, preferred, margin)) &&
      clearOfColliders(built, preferred, margin) &&
      clearOfReserved(definition, preferred, margin)
    ) {
      return { x: preferred.x, y: Number(preferred.y) || 0, z: preferred.z };
    }

    const candidate = candidatePoints(built, definition, radius).find(({ region, point }) =>
      pointInside(region, point, margin) &&
      clearOfColliders(built, point, margin) &&
      clearOfReserved(definition, point, margin)
    );

    return candidate?.point || null;
  };

  const alreadySpawned = (built, id) =>
    Boolean(built?.group?.getObjectByProperty?.("name", `PersistentMicroScene:${id}`));

  const spawnRecord = (THREE, built, definition, record) => {
    const id = recordId(definition, record);
    if (alreadySpawned(built, id)) return true;

    const template = BF.MicroScenes?.get?.(record.microSceneId);
    if (!template || !BF.ObjectSpawner) return false;

    const radius = Math.max(1, Number(template.radius) || Number(record.radius) || 7);
    const preferred = record.anchor || null;
    const anchor = findSafeAnchor(built, definition, radius, preferred);
    if (!anchor) {
      console.warn("[BlueFox] Aucun emplacement sûr pour la micro-scène persistante.", {
        mapId: definition.id,
        microSceneId: record.microSceneId
      });
      return false;
    }

    const root = new THREE.Group();
    root.name = `PersistentMicroScene:${id}`;
    root.position.set(anchor.x, anchor.y || 0, anchor.z);
    root.rotation.y = Number(record.rotation) || 0;
    root.userData.persistentMicroSceneId = id;
    root.userData.microSceneId = record.microSceneId;
    root.userData.missionId = record.missionId || null;
    root.userData.persistent = true;
    built.group.add(root);

    const spawner = new BF.ObjectSpawner({
      THREE,
      scene: root,
      palette: definition.palette
    });

    const records = spawner.spawnMicroScene(record.microSceneId, {
      origin: { x: 0, y: 0, z: 0 },
      rotation: 0,
      scene: root,
      force: true,
      source: `persistent:${id}`
    });

    records.forEach((spawned) => {
      spawned.root.userData.persistentMicroSceneId = id;
      spawned.root.userData.bibleMissionId = record.missionId || null;

      const hitbox = spawned.instance?.hitbox;
      if (hitbox) {
        hitbox.userData.persistentMicroSceneId = id;
        hitbox.userData.bibleMissionId = record.missionId || null;
        if (!built.interactables.includes(hitbox)) {
          built.interactables.push(hitbox);
        }
      }

      (spawned.instance?.colliders || []).forEach((collider) => {
        spawned.root.updateWorldMatrix(true, false);
        const position = spawned.root.localToWorld(collider.offset.clone());
        built.colliders.push({
          position,
          radius: collider.radius,
          owner: spawned.root
        });
      });
    });

    record.instanceId = id;
    record.anchor = { x: anchor.x, y: anchor.y || 0, z: anchor.z };
    record.rotation = Number(record.rotation) || 0;
    record.persistent = record.persistent !== false;
    record.spawnOnce = record.spawnOnce !== false;
    record.resolvedAt = record.resolvedAt || Date.now();
    saveDefinition(definition);

    return true;
  };

  const ensure = (definition, spec) => {
    if (!definition?.id || !spec?.microSceneId) return null;

    const id = recordId(definition, spec);
    const records = list(definition);
    let record = records.find((entry) => recordId(definition, entry) === id);

    if (!record) {
      record = {
        instanceId: id,
        missionId: spec.missionId || null,
        microSceneId: spec.microSceneId,
        anchor: spec.anchor ? clone(spec.anchor) : null,
        rotation: Number(spec.rotation) || 0,
        persistent: spec.persistent !== false,
        spawnOnce: spec.spawnOnce !== false,
        createdAt: Date.now()
      };
      records.push(record);
      saveDefinition(definition);
    }

    return record;
  };

  const spawnForBuiltMap = (THREE, built, definition) => {
    if (!built || !definition) return 0;
    let count = 0;
    list(definition).forEach((record) => {
      if (record.persistent === false) return;
      if (spawnRecord(THREE, built, definition, record)) count += 1;
    });
    return count;
  };

  if (typeof BF.buildMap === "function" && !BF.buildMap.__persistentMicroScenesV20) {
    const previousBuildMap = BF.buildMap;
    const wrapped = function buildMapWithPersistentScenes(THREE, definition, assets, renderer) {
      const built = previousBuildMap(THREE, definition, assets, renderer);
      spawnForBuiltMap(THREE, built, definition);
      return built;
    };
    wrapped.__persistentMicroScenesV20 = true;
    BF.buildMap = wrapped;
  }

  BF.PersistentMicroScenes = Object.freeze({
    version: "20.0-test",
    list,
    ensure,
    findSafeAnchor,
    spawnRecord,
    spawnForBuiltMap
  });
})(window);
