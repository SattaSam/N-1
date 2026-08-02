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
    DRONE_ACTIVATED: "DRONE_ACTIVATED"
  });

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

  const normalize = (type, source, detail = {}) => {
    const root = source?.userData?.worldAnchor || source?.userData?.worldRoot || source;
    const data = source?.userData || root?.userData || {};
    const definition = data.functional || root?.userData?.functional || {};
    return Object.freeze({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      at: Date.now(),
      objectId: data.catalogId || root?.userData?.catalogId || definition.id || null,
      instanceId: data.instanceId || root?.userData?.instanceId || null,
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
      detail: Object.freeze(clone(detail) || {})
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
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    history() { return history.slice(); },
    clear() { history.length = 0; }
  });
})(window);
