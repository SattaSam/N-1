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

  const missionMemory = () =>
    BF.currentEngine?.missionManager?.memory || null;

  const siteProgression = () => {
    const memory = missionMemory();
    if (!memory?.state) return null;
    memory.state.siteProgression ||= {};
    return memory.state.siteProgression;
  };

  const saveDefinition = (definition) =>
    BF.MapIntegrity?.persistGeneratedDefinition?.(definition) || false;

  const saveSiteRecord = (definition, record) => {
    const sites = siteProgression();
    const memory = missionMemory();
    if (!sites || !memory || !definition?.id || !record?.microSceneId) return false;

    const id = recordId(definition, record);
    sites[id] = {
      instanceId: id,
      mapId: definition.id,
      missionId: record.missionId || null,
      kind: record.kind || null,
      stage: record.stage || null,
      microSceneId: record.microSceneId,
      contextRole: record.contextRole || null,
      anchor: record.anchor ? clone(record.anchor) : null,
      rotation: Number(record.rotation) || 0,
      fixedAnchor: record.fixedAnchor === true,
      persistent: record.persistent !== false,
      spawnOnce: record.spawnOnce !== false,
      createdAt: record.createdAt || Date.now(),
      resolvedAt: record.resolvedAt || 0
    };
    memory.save();
    return true;
  };

  const hydrateSites = (definition) => {
    const sites = siteProgression();
    if (!sites || !definition?.id) return 0;

    let added = 0;
    Object.values(sites).forEach((site) => {
      if (
        !site ||
        site.mapId !== definition.id ||
        !site.microSceneId ||
        site.persistent === false
      ) return;

      const id = recordId(definition, site);
      const records = list(definition);
      const existing = records.find((entry) => recordId(definition, entry) === id);
      if (existing) {
        Object.assign(existing, clone(site));
        return;
      }

      records.push(clone(site));
      added += 1;
    });
    return added;
  };

  const canonicalPlacement = (definition, microSceneId) => {
    const placement = definition?.crashSite?.campSitePlacements?.[microSceneId];
    if (!placement?.position) return null;
    const rotation = Array.isArray(placement.rotation)
      ? Number(placement.rotation[1]) || 0
      : Number(placement.rotation) || 0;
    return {
      anchor: {
        x: Number(placement.position.x) || 0,
        y: Number(placement.position.y) || 0,
        z: Number(placement.position.z) || 0
      },
      rotation
    };
  };

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

  const missionFallbackCandidates = (built, definition, preferred = null) => {
    const regions = (built.walkableRegions || []).filter((region) =>
      Number(region.maxX) - Number(region.minX) >= 4 &&
      Number(region.maxZ) - Number(region.minZ) >= 4
    );
    const candidates = [];
    if (preferred) candidates.push({ point: preferred, preferred: true });
    regions.forEach((region) => {
      const cx = (Number(region.minX) + Number(region.maxX)) / 2;
      const cz = (Number(region.minZ) + Number(region.maxZ)) / 2;
      const dx = Math.max(0, (Number(region.maxX) - Number(region.minX)) * 0.22);
      const dz = Math.max(0, (Number(region.maxZ) - Number(region.minZ)) * 0.22);
      [
        [0, 0], [dx, 0], [-dx, 0], [0, dz], [0, -dz],
        [dx, dz], [-dx, dz], [dx, -dz], [-dx, -dz]
      ].forEach(([ox, oz]) => candidates.push({
        region,
        point: { x: cx + ox, y: 0, z: cz + oz }
      }));
    });
    return candidates;
  };

  const findMissionFallbackAnchor = (built, definition, preferred = null) => {
    const regions = built.walkableRegions || [];
    if (!regions.length) return null;
    const candidates = missionFallbackCandidates(built, definition, preferred);

    const withColliderClearance = candidates.find(({ point }) =>
      regions.some((region) => pointInside(region, point, 2)) &&
      clearOfReserved(definition, point, 2) &&
      clearOfColliders(built, point, 2)
    );
    if (withColliderClearance) {
      const point = withColliderClearance.point;
      return { x: Number(point.x) || 0, y: Number(point.y) || 0, z: Number(point.z) || 0 };
    }

    const walkableOnly = candidates.find(({ point }) =>
      regions.some((region) => pointInside(region, point, 1.5)) &&
      clearOfReserved(definition, point, 1)
    );
    if (!walkableOnly) return null;
    const point = walkableOnly.point;
    return { x: Number(point.x) || 0, y: Number(point.y) || 0, z: Number(point.z) || 0 };
  };

  const normalizePoint = (point) => point &&
    Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.z))
    ? {
        x: Number(point.x) || 0,
        y: Number(point.y) || 0,
        z: Number(point.z) || 0
      }
    : null;

  // Dernier recours strictement missionnel : une scène nécessaire au gameplay
  // ne peut pas disparaître parce que le décor a saturé les emplacements sûrs.
  // On conserve d'abord les réserves entrée/sorties, puis on accepte en ultime
  // recours une superposition avec le décor. La composition interne de la MSC
  // reste inchangée : seul son ancrage global est choisi ici.
  const findMissionTerminalAnchor = (built, definition, preferred = null) => {
    const regions = (built.walkableRegions || []).filter((region) =>
      Number(region.maxX) > Number(region.minX) &&
      Number(region.maxZ) > Number(region.minZ)
    );
    const candidates = missionFallbackCandidates(built, definition, preferred);

    const reservedClear = candidates.find(({ point }) =>
      regions.some((region) => pointInside(region, point, 0.75)) &&
      clearOfReserved(definition, point, 0)
    );
    if (reservedClear) return normalizePoint(reservedClear.point);

    // Balayage déterministe plus dense avant de relâcher les réserves.
    for (const region of regions) {
      const minX = Number(region.minX);
      const maxX = Number(region.maxX);
      const minZ = Number(region.minZ);
      const maxZ = Number(region.maxZ);
      for (const fx of [0.2, 0.35, 0.5, 0.65, 0.8]) {
        for (const fz of [0.2, 0.35, 0.5, 0.65, 0.8]) {
          const point = {
            x: minX + (maxX - minX) * fx,
            y: 0,
            z: minZ + (maxZ - minZ) * fz
          };
          if (pointInside(region, point, 0.5) && clearOfReserved(definition, point, 0)) {
            return point;
          }
        }
      }
    }

    // Ultime garantie : rester dans une région réellement marchable même si
    // elle est déjà occupée. C'est préférable à une MSC missionnelle absente.
    if (regions.length) {
      const region = [...regions].sort((a, b) =>
        (Number(b.maxX) - Number(b.minX)) * (Number(b.maxZ) - Number(b.minZ)) -
        (Number(a.maxX) - Number(a.minX)) * (Number(a.maxZ) - Number(a.minZ))
      )[0];
      return {
        x: (Number(region.minX) + Number(region.maxX)) / 2,
        y: 0,
        z: (Number(region.minZ) + Number(region.maxZ)) / 2
      };
    }

    // Une ancienne intention peut déjà porter un ancrage valide sans que le
    // build courant expose de walkableRegions. On le préserve plutôt que de
    // perdre la scène.
    return normalizePoint(preferred) || normalizePoint(definition.entry) || { x: 0, y: 0, z: 0 };
  };

  const spawnedRoot = (built, id) =>
    built?.group?.getObjectByProperty?.("name", `PersistentMicroScene:${id}`) || null;

  const ensureExistingIndex = (built, record, id, template, root) => {
    built.group.userData ||= {};
    built.group.userData.microScenes ||= [];
    const existingIndex = built.group.userData.microScenes.findIndex(
      (entry) => String(entry?.instanceId || "") === String(id)
    );
    if (existingIndex >= 0) {
      built.group.userData.microScenes[existingIndex].instanceRoot =
        built.group.userData.microScenes[existingIndex].instanceRoot || root;
      return;
    }
    built.group.userData.microScenes.push({
      id: record.microSceneId,
      instanceId: id,
      missionId: record.missionId || null,
      missionOnly: false,
      rarity: template?.rarity || null,
      contextRole: record.contextRole || null,
      instanceRoot: root,
      records: []
    });
  };

  const spawnRecord = (THREE, built, definition, record) => {
    const id = recordId(definition, record);
    const template = BF.MicroScenes?.get?.(record.microSceneId);
    if (!template || !BF.ObjectSpawner) return false;

    const existingRoot = spawnedRoot(built, id);
    if (existingRoot) {
      ensureExistingIndex(built, record, id, template, existingRoot);
      return true;
    }

    const canonical = canonicalPlacement(definition, record.microSceneId);
    if (canonical) {
      record.anchor = canonical.anchor;
      record.rotation = canonical.rotation;
      record.fixedAnchor = true;
    }

    const radius = Math.max(1, Number(template.radius) || Number(record.radius) || 7);
    const preferred = record.anchor || null;
    let anchor = record.fixedAnchor === true
      ? preferred && {
          x: Number(preferred.x) || 0,
          y: Number(preferred.y) || 0,
          z: Number(preferred.z) || 0
        }
      : findSafeAnchor(built, definition, radius, preferred);

    if (!anchor && record.missionId && record.fixedAnchor !== true) {
      anchor = findMissionFallbackAnchor(built, definition, preferred);
      if (anchor) {
        console.warn("[BlueFox] Placement de secours utilisé pour une micro-scène missionnelle persistante.", {
          mapId: definition.id,
          missionId: record.missionId,
          microSceneId: record.microSceneId
        });
      }
    }

    if (!anchor && record.missionId && record.fixedAnchor !== true) {
      anchor = findMissionTerminalAnchor(built, definition, preferred);
      console.warn("[BlueFox] Placement terminal utilisé pour garantir une micro-scène missionnelle persistante.", {
        mapId: definition.id,
        missionId: record.missionId,
        microSceneId: record.microSceneId,
        anchor
      });
    }

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
    root.userData.contextRole = record.contextRole || null;
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
      spawned.root.userData.contextRole = record.contextRole || null;
      if (spawned.instanceRoot?.userData) {
        spawned.instanceRoot.userData.persistentMicroSceneId = id;
        spawned.instanceRoot.userData.bibleMissionId = record.missionId || null;
        spawned.instanceRoot.userData.contextRole = record.contextRole || null;
      }

      const hitbox = spawned.instance?.hitbox;
      if (hitbox) {
        hitbox.userData.persistentMicroSceneId = id;
        hitbox.userData.bibleMissionId = record.missionId || null;
        hitbox.userData.contextRole = record.contextRole || null;
        if (!built.interactables.includes(hitbox)) {
          built.interactables.push(hitbox);
        }
      }

      (spawned.instance?.colliders || []).forEach((collider) => {
        const transformRoot = spawned.objectRoot || spawned.root;
        transformRoot.updateWorldMatrix(true, false);
        const position = transformRoot.localToWorld(collider.offset.clone());
        built.colliders.push({
          position,
          radius: collider.radius,
          owner: spawned.root
        });
      });
    });

    built.group.userData ||= {};
    built.group.userData.microScenes ||= [];
    const indexEntry = {
      id: record.microSceneId,
      instanceId: id,
      missionId: record.missionId || null,
      missionOnly: false,
      rarity: template.rarity || null,
      contextRole: record.contextRole || null,
      instanceRoot: root,
      records
    };
    const existingIndex = built.group.userData.microScenes.findIndex(
      (entry) => String(entry?.instanceId || "") === String(id)
    );
    if (existingIndex >= 0) {
      built.group.userData.microScenes[existingIndex] = indexEntry;
    } else {
      built.group.userData.microScenes.push(indexEntry);
    }

    record.instanceId = id;
    record.anchor = { x: anchor.x, y: anchor.y || 0, z: anchor.z };
    record.rotation = Number(record.rotation) || 0;
    record.persistent = record.persistent !== false;
    record.spawnOnce = record.spawnOnce !== false;
    record.resolvedAt = record.resolvedAt || Date.now();
    saveDefinition(definition);
    saveSiteRecord(definition, record);

    return true;
  };

  const ensure = (definition, spec) => {
    if (!definition?.id || !spec?.microSceneId) return null;

    const id = recordId(definition, spec);
    const records = list(definition);
    let record = records.find((entry) => recordId(definition, entry) === id);

    const canonical = canonicalPlacement(definition, spec.microSceneId);
    const normalized = {
      instanceId: id,
      missionId: spec.missionId || null,
      kind: spec.kind || null,
      stage: spec.stage || null,
      microSceneId: spec.microSceneId,
      contextRole: spec.contextRole || null,
      anchor: canonical?.anchor || (spec.anchor ? clone(spec.anchor) : null),
      rotation: canonical?.rotation ?? (Number(spec.rotation) || 0),
      fixedAnchor: Boolean(canonical) || spec.fixedAnchor === true,
      persistent: spec.persistent !== false,
      spawnOnce: spec.spawnOnce !== false,
      createdAt: spec.createdAt || Date.now()
    };

    if (!record) {
      record = normalized;
      records.push(record);
    } else {
      Object.assign(record, normalized, {
        createdAt: record.createdAt || normalized.createdAt
      });
    }

    saveDefinition(definition);
    saveSiteRecord(definition, record);
    return record;
  };

  const spawnForBuiltMap = (THREE, built, definition) => {
    if (!built || !definition) return 0;
    hydrateSites(definition);
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
    findMissionFallbackAnchor,
    findMissionTerminalAnchor,
    spawnRecord,
    spawnForBuiltMap
  });
})(window);
