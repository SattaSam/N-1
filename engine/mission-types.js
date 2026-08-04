(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};

  const ActionType = Object.freeze({
    COLLECT: "collect",
    EXTRACT: "extract",
    INSPECT: "inspect",
    ANALYZE: "analyze",
    EXPLORE_ZONE: "explore-zone",
    TRAVEL: "travel",
    REST: "rest",
    EAT: "eat",
    RESEARCH: "research",
    OBSERVE: "observe",
    CRAFT: "craft",
    BUILD: "build"
  });

  const MissionStatus = Object.freeze({
    LOCKED: "locked",
    AVAILABLE: "available",
    ACTIVE: "active",
    COMPLETED: "completed",
    FAILED: "failed",
    PAUSED: "paused"
  });

  const NeedType = Object.freeze({
    ENERGY: "energy",
    REST: "rest",
    FOOD: "food",
    SAFETY: "safety"
  });

  let definitions = Object.freeze({});

  function normalizeActionType(value) {
    const candidate = String(value || "").trim().toLowerCase();
    return Object.values(ActionType).includes(candidate)
      ? candidate
      : ActionType.OBSERVE;
  }

  function cloneDefinition(definition) {
    return JSON.parse(JSON.stringify(definition));
  }

  function getDefinition(missionId) {
    if (!missionId) return null;
    if (definitions[missionId]) return definitions[missionId];

    const separator = String(missionId).indexOf("@");
    if (separator < 1) return null;

    const baseId = missionId.slice(0, separator);
    const scopeId = missionId.slice(separator + 1);
    const base = definitions[baseId];

    if (!base || base.instanceScope !== "map" || !scopeId) return null;

    const instance = cloneDefinition(base);
    const idMap = new Map();

    const collectIds = (node) => {
      idMap.set(node.id, `${node.id}@${scopeId}`);
      (node.children || []).forEach(collectIds);
    };

    const applyScope = (node) => {
      node.id = idMap.get(node.id);
      node.requires = (node.requires || []).map((id) => idMap.get(id) || id);
      node.params = { ...(node.params || {}), mapId: scopeId };
      (node.children || []).forEach(applyScope);
    };

    collectIds(instance.root);
    applyScope(instance.root);

    instance.id = missionId;
    instance.baseMissionId = baseId;
    instance.scopeId = scopeId;
    instance.title = `${instance.title} — ${scopeId}`;
    return instance;
  }

  function replaceDefinitions(nextDefinitions = {}) {
    definitions = Object.freeze({ ...nextDefinitions });
    Missions.definitions = definitions;
    return definitions;
  }

  function registerDefinition(definition) {
    if (!definition?.id || !definition?.root) return false;
    replaceDefinitions({
      ...definitions,
      [definition.id]: Object.freeze(cloneDefinition(definition))
    });
    return true;
  }

  function registerDefinitions(collection) {
    const values = Array.isArray(collection)
      ? collection
      : Object.values(collection || {});
    let count = 0;
    values.forEach((definition) => {
      if (registerDefinition(definition)) count += 1;
    });
    return count;
  }

  Missions.ActionType = ActionType;
  Missions.MissionStatus = MissionStatus;
  Missions.NeedType = NeedType;
  Missions.definitions = definitions;
  Missions.normalizeActionType = normalizeActionType;
  Missions.cloneDefinition = cloneDefinition;
  Missions.getDefinition = getDefinition;
  Missions.replaceDefinitions = replaceDefinitions;
  Missions.registerDefinition = registerDefinition;
  Missions.registerDefinitions = registerDefinitions;

  BF.registerMissionDefinition = registerDefinition;
  BF.registerMissionDefinitions = registerDefinitions;
  BF.clearMissionDefinitions = () => replaceDefinitions({});
})(window);
