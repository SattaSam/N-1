(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const listeners = new Set();
  const history = [];
  const MAX_HISTORY = 250;

  const EVENT_TYPES = Object.freeze({
    OBJECT_SEEN: "OBJECT_SEEN",
    OBJECT_INSPECTED: "OBJECT_INSPECTED",
    OBJECT_ANALYZED: "OBJECT_ANALYZED",
    PHENOMENON_OBSERVED: "PHENOMENON_OBSERVED",
    RESOURCE_COLLECTED: "RESOURCE_COLLECTED",
    RESOURCE_EXTRACTED: "RESOURCE_EXTRACTED",
    KNOWLEDGE_ACQUIRED: "KNOWLEDGE_ACQUIRED",
    OBJECT_CRAFTED: "OBJECT_CRAFTED",
    OBJECT_BUILT: "OBJECT_BUILT",
    OBJECT_USED: "OBJECT_USED",
    OBJECT_REPAIRED: "OBJECT_REPAIRED",
    OBJECT_DESTROYED: "OBJECT_DESTROYED",
    NPC_CONTACTED: "NPC_CONTACTED",
    NPC_DIALOGUE: "NPC_DIALOGUE",
    NPC_REACTION: "NPC_REACTION",
    DRONE_ACTIVATED: "DRONE_ACTIVATED",
    DRONE_FAILED: "DRONE_FAILED",
    DRONE_CONSOLE_VIEWED: "DRONE_CONSOLE_VIEWED",
    DRONE_PRIORITY_CHANGED: "DRONE_PRIORITY_CHANGED",
    DRONE_CARGO_DEPOSITED: "DRONE_CARGO_DEPOSITED"
  });

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

  const siteContextCache = new WeakMap();
  const finitePoint = (point) => {
    if (!point) return null;
    const x = Number(point.x);
    const y = Number(point.y);
    const z = Number(point.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    return { x, y: Number.isFinite(y) ? y : 0, z };
  };
  const nodeChain = (node, limit = 12) => {
    const chain = [];
    let current = node;
    while (current && chain.length < limit) {
      chain.push(current);
      current = current.parent || null;
    }
    return chain;
  };
  const averageRecordPoint = (records = []) => {
    const points = records
      .map((record) => finitePoint(record?.position || record?.root?.position))
      .filter(Boolean);
    if (!points.length) return null;
    const sum = points.reduce(
      (acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y,
        z: acc.z + point.z
      }),
      { x: 0, y: 0, z: 0 }
    );
    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
      z: sum.z / points.length
    };
  };
  const stableSiteId = (mapId, microSceneId, persistentId, anchor, fallbackId = null) => {
    if (persistentId) return `persistent:${String(persistentId)}`;
    const mapKey = String(mapId || "unassigned");
    const sceneKey = String(microSceneId || "unknown");
    if (anchor) {
      return `msc:${mapKey}:${sceneKey}:${anchor.x.toFixed(2)}:${anchor.z.toFixed(2)}`;
    }
    return fallbackId
      ? `msc:${mapKey}:${sceneKey}:${String(fallbackId)}`
      : null;
  };
  const indexedMicroSceneContext = (source, root) => {
    const candidates = new Set([
      ...nodeChain(source),
      ...nodeChain(root)
    ].filter(Boolean));
    const entries = BF.currentEngine?.currentMap?.group?.userData?.microScenes;
    if (!Array.isArray(entries) || !entries.length) return null;

    for (const entry of entries) {
      const records = Array.isArray(entry?.records) ? entry.records : [];
      for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        const nodes = [
          record?.root,
          record?.objectRoot,
          record?.pivot,
          record?.instance?.root,
          record?.instance?.hitbox
        ].filter(Boolean);
        if (!nodes.some((node) => candidates.has(node))) continue;
        const anchor =
          finitePoint(entry?.instanceRoot?.position) ||
          averageRecordPoint(records);
        return {
          microSceneId: entry?.id || null,
          persistentMicroSceneId:
            entry?.instanceRoot?.userData?.persistentMicroSceneId ||
            record?.root?.userData?.persistentMicroSceneId ||
            null,
          anchor,
          objectIndex: index,
          fallbackInstanceId: entry?.instanceId || null
        };
      }
    }
    return null;
  };
  const resolveMicroSceneContext = (source, root, detail = {}) => {
    const cached = source && typeof source === "object"
      ? siteContextCache.get(source)
      : null;
    if (cached) return cached;

    const sourceData = source?.userData || {};
    const rootData = root?.userData || {};
    const pivot =
      sourceData.microScenePivot ||
      rootData.microScenePivot ||
      null;
    const chain = [
      ...nodeChain(source),
      ...nodeChain(root),
      ...nodeChain(pivot)
    ].filter(Boolean);
    const persistentRoot = chain.find((node) =>
      node?.userData?.persistent === true &&
      node?.userData?.persistentMicroSceneId
    ) || null;
    const instanceRoot = chain.find((node) =>
      node?.userData?.microSceneInstance === true
    ) || pivot?.parent || null;
    const directMicroSceneId =
      detail.microSceneId ||
      sourceData.microSceneId ||
      rootData.microSceneId ||
      pivot?.userData?.microSceneId ||
      instanceRoot?.userData?.microSceneId ||
      null;
    // Custom/persistent MSCs expose enough ancestry metadata to resolve the site
    // without scanning the map index. The fallback index is used only by the
    // legacy non-custom MSC path where objects are spawned independently.
    const indexed = (!directMicroSceneId || (!pivot && !instanceRoot))
      ? indexedMicroSceneContext(source, root)
      : null;
    const microSceneId = directMicroSceneId || indexed?.microSceneId || null;
    if (!microSceneId) return null;

    const persistentMicroSceneId =
      detail.persistentMicroSceneId ||
      sourceData.persistentMicroSceneId ||
      rootData.persistentMicroSceneId ||
      persistentRoot?.userData?.persistentMicroSceneId ||
      instanceRoot?.userData?.persistentMicroSceneId ||
      indexed?.persistentMicroSceneId ||
      null;
    const anchor =
      finitePoint(detail.microSceneAnchor) ||
      finitePoint(persistentRoot?.position) ||
      finitePoint(instanceRoot?.position) ||
      indexed?.anchor ||
      null;
    const mapId = detail.mapId || BF.currentEngine?.currentMapId || null;
    const microSceneInstanceId =
      detail.microSceneInstanceId ||
      stableSiteId(
        mapId,
        microSceneId,
        persistentMicroSceneId,
        anchor,
        indexed?.fallbackInstanceId
      );
    const microSceneObjectIndex =
      detail.microSceneObjectIndex ??
      sourceData.microSceneObjectIndex ??
      rootData.microSceneObjectIndex ??
      pivot?.userData?.microSceneObjectIndex ??
      indexed?.objectIndex ??
      null;

    const context = Object.freeze({
      microSceneId,
      persistentMicroSceneId,
      microSceneInstanceId,
      microSceneAnchor: anchor ? Object.freeze({ ...anchor }) : null,
      microSceneObjectIndex:
        Number.isInteger(Number(microSceneObjectIndex))
          ? Number(microSceneObjectIndex)
          : null
    });
    [source, root, pivot].filter((node) => node && typeof node === "object")
      .forEach((node) => siteContextCache.set(node, context));
    return context;
  };

  const normalize = (type, source, detail = {}) => {
    const root = source?.userData?.worldAnchor || source?.userData?.worldRoot || source;
    const data = source?.userData || root?.userData || {};
    const definition = data.functional || root?.userData?.functional || {};
    const microSceneContext = resolveMicroSceneContext(source, root, detail);
    const acquisitionIntent =
      detail.acquisitionIntent ??
      data.acquisitionIntent ??
      root?.userData?.acquisitionIntent ??
      null;
    const acquisitionPhase =
      detail.acquisitionPhase ??
      data.acquisitionPhase ??
      root?.userData?.acquisitionPhase ??
      null;
    const normalizedDetail = acquisitionIntent != null || acquisitionPhase != null
      ? { ...detail, acquisitionIntent, acquisitionPhase }
      : detail;
    return Object.freeze({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      at: Date.now(),
      objectId: data.catalogId || root?.userData?.catalogId || definition.id || null,
      instanceId: data.instanceId || root?.userData?.instanceId || null,
      persistentMicroSceneId:
        microSceneContext?.persistentMicroSceneId ||
        detail.persistentMicroSceneId ||
        data.persistentMicroSceneId ||
        root?.userData?.persistentMicroSceneId ||
        null,
      microSceneId:
        microSceneContext?.microSceneId ||
        detail.microSceneId ||
        data.microSceneId ||
        root?.userData?.microSceneId ||
        null,
      microSceneInstanceId: microSceneContext?.microSceneInstanceId || null,
      microSceneAnchor: microSceneContext?.microSceneAnchor || null,
      microSceneObjectIndex: microSceneContext?.microSceneObjectIndex ?? null,
      family: definition.resource?.family || definition.knowledge?.family || definition.category || null,
      inventoryKey: detail.inventoryKey || definition.resource?.inventoryKey || null,
      knowledgeFamily: definition.knowledge?.family || null,
      category: definition.category || data.category || null,
      variant: data.variant ?? root?.userData?.variant ?? 0,
      state: detail.state || "present",
      planetId: detail.planetId || null,
      mapId: detail.mapId || null,
      zoneId: detail.zoneId ?? null,
      factionId: detail.factionId || null,
      missionId: detail.missionId || null,
      quantity: Math.max(0, Number(detail.quantity ?? detail.amount ?? 1) || 0),
      progression: Object.freeze(clone(definition.progression || detail.progression || {}) || {}),
      researchDomains: Object.freeze([...(definition.research?.domains || detail.researchDomains || [])]),
      tags: Object.freeze([...(definition.spawn?.tags || []), ...(detail.tags || [])]),
      detail: Object.freeze(clone(normalizedDetail) || {})
    });
  };

  const emit = (type, source, detail = {}) => {
    if (!Object.values(EVENT_TYPES).includes(type)) {
      throw new Error(`Type d’événement objet inconnu : ${type}`);
    }
    const event = normalize(type, source, detail);
    history.push(event);
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    listeners.forEach((listener) => listener(event));
    global.dispatchEvent(new CustomEvent("bluefox:object-event", { detail: event }));
    return event;
  };

  BF.ObjectEvents = Object.freeze({
    types: EVENT_TYPES,
    emit,
    siteContext(source, detail = {}) {
      const root = source?.userData?.worldAnchor || source?.userData?.worldRoot || source;
      return resolveMicroSceneContext(source, root, detail);
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    history() { return history.slice(); },
    clear() { history.length = 0; }
  });
})(window);
