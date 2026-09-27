(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const VERSION = "travel-cycle-v2";

  const normalize = (value) => String(value ?? "").trim().toLowerCase();

  const routeSequence = (node) =>
    Array.isArray(node?.params?.route)
      ? node.params.route.map((value) => String(value))
      : [];

  const routeProgressIndex = (node, route) => {
    if (!route.length) return 0;
    const history = node.historyValues || [];
    const maxLength = Math.min(history.length, route.length);
    for (let length = maxLength; length >= 1; length -= 1) {
      let matches = true;
      for (let index = 0; index < length; index += 1) {
        const historyValue = history[history.length - length + index];
        if (normalize(historyValue) !== normalize(route[index])) {
          matches = false;
          break;
        }
      }
      if (matches) return length;
    }
    return 0;
  };

  const eventMatchesFilters = (node, detail) => {
    const params = node?.params || {};
    if (params.direction != null &&
        normalize(params.direction) !== normalize(detail.direction)) {
      return false;
    }
    if (params.fromMapId != null &&
        normalize(params.fromMapId) !== normalize(detail.fromMapId)) {
      return false;
    }
    if (params.toMapId != null &&
        normalize(params.toMapId) !== normalize(detail.toMapId)) {
      return false;
    }
    if (params.transitionSource != null &&
        normalize(params.transitionSource) !== normalize(detail.source)) {
      return false;
    }
    if (params.transitionMode != null &&
        normalize(params.transitionMode) !== normalize(detail.mode)) {
      return false;
    }
    if (params.toDiscoveryIndex != null) {
      const discoveryIndex = Number(
        BF.maps?.[detail.toMapId]?.generator?.discoveryIndex
      );
      if (discoveryIndex !== Number(params.toDiscoveryIndex)) return false;
    }
    if (params.newOnly === true && detail.isNew !== true) {
      return false;
    }
    return true;
  };

  const progressRoute = (node, detail) => {
    const route = routeSequence(node);
    if (route.length < 2) return false;

    if (!node.historyValues.length && detail.fromMapId) {
      node.pushHistoryValue?.(detail.fromMapId, route.length + 2);
    }
    node.pushHistoryValue?.(detail.toMapId, route.length + 2);

    const index = routeProgressIndex(node, route);
    if (index <= node.progress) return false;
    const delta = Math.min(node.target, index) - node.progress;
    return delta > 0 ? node.increment(delta) : false;
  };

  const progressCycle = (node, detail) => {
    const params = node?.params || {};
    const cycleMode = String(params.cycleMode || "return").trim();
    if (cycleMode === "distinctTransitions") {
      const identity = `${detail.fromMapId || ""}->${detail.toMapId || ""}`;
      return node.incrementDistinct?.(identity, 1) || false;
    }

    const origin =
      params.originMapId ||
      node.historyValues?.[0] ||
      detail.fromMapId ||
      null;
    if (!origin || !detail.toMapId) return false;

    if (!node.historyValues.length) {
      node.pushHistoryValue?.(origin, 16);
    }
    node.pushHistoryValue?.(detail.toMapId, 16);

    const history = node.historyValues || [];
    if (history.length < 3) return false;
    const leftOrigin = history.some((value, index) =>
      index > 0 && index < history.length - 1 &&
      normalize(value) !== normalize(origin)
    );
    const returned = normalize(history[history.length - 1]) === normalize(origin);
    if (!leftOrigin || !returned) return false;

    const cycleIdentity = `${origin}:${history.length}:${history.join(">")}`;
    return node.incrementDistinct?.(cycleIdentity, 1) || false;
  };

  const progressCount = (node, detail) => {
    const distinctBy = String(node?.params?.distinctBy || "").trim();
    if (distinctBy === "mapId") {
      return node.incrementDistinct?.(String(detail.toMapId || ""), 1) || false;
    }
    if (distinctBy === "transition") {
      return node.incrementDistinct?.(
        `${detail.fromMapId || ""}->${detail.toMapId || ""}`,
        1
      ) || false;
    }
    return node.increment(1);
  };

  const progressTravelNode = (node, detail) => {
    const mode = String(node?.params?.mode || "count").trim();
    if (mode === "route") return progressRoute(node, detail);
    if (mode === "cycle") return progressCycle(node, detail);
    return progressCount(node, detail);
  };

  const bindArrivalFacts = (manager, missionId, node, detail) => {
    const definition = manager?.definition?.(missionId);
    const sequence = Array.isArray(definition?.sequence)
      ? definition.sequence
      : [];
    const slot = sequence.find((step) =>
      String(node?.id || "") === `${missionId}:${step?.slot || ""}`
    )?.slot || null;
    if (!slot || !detail?.toMapId) return 0;

    const bindings = new Map();
    sequence
      .filter((step) => Array.isArray(step?.requires) && step.requires.includes(slot))
      .forEach((step) => {
        const key = String(step?.params?.requiredMapFact || "");
        const field = String(step?.params?.requiredMapField || "mapId");
        if (key) bindings.set(`${key}::${field}`, { key, field });
      });

    let changed = 0;
    bindings.forEach(({ key, field }) => {
      const previous = manager.memory?.getFact?.(key, {}) || {};
      if (normalize(previous?.[field]) === normalize(detail.toMapId)) return;
      manager.memory?.setFact?.(key, {
        ...previous,
        [field]: detail.toMapId,
        mapId: detail.toMapId,
        toMapId: detail.toMapId,
        arrived: true,
        updatedAt: Date.now()
      });
      changed += 1;
    });
    if (changed) manager.memory?.save?.();
    return changed;
  };

  const bindCompletionArrivalFact = (manager, node, detail) => {
    if (!node?.isComplete || !detail?.toMapId) return 0;
    const key = String(node?.params?.completionArrivalFact || "");
    if (!key) return 0;
    const field = String(node?.params?.completionArrivalField || "toMapId");
    const previous = manager?.memory?.getFact?.(key, {}) || {};
    if (normalize(previous?.[field]) === normalize(detail.toMapId)) return 0;
    manager?.memory?.setFact?.(key, {
      ...previous,
      [field]: detail.toMapId,
      mapId: detail.toMapId,
      toMapId: detail.toMapId,
      arrived: true,
      updatedAt: Date.now()
    });
    manager?.memory?.save?.();
    return 1;
  };

  const reconcileCurrentArrivalBindings = () => {
    const manager = BF.currentEngine?.missionManager;
    const currentMapId = BF.currentEngine?.currentMapId;
    if (!manager?.trees?.size || !currentMapId) return 0;
    let changed = 0;

    manager.trees.forEach((tree, missionId) => {
      if (manager.ensureLifecycle?.(missionId)?.status !== "active") return;
      const definition = manager.definition?.(missionId);
      const sequence = Array.isArray(definition?.sequence)
        ? definition.sequence
        : [];
      sequence.forEach((step) => {
        if (step?.params?.eventDriven !== true) return;
        if (String(step?.action || "").toLowerCase() !== "travel") return;
        const hasDestinationFilter =
          step.params?.toMapId != null ||
          step.params?.toDiscoveryIndex != null;
        if (!hasDestinationFilter) return;
        const node = tree.find?.(`${missionId}:${step.slot}`);
        if (!node?.isComplete) return;
        const detail = { toMapId: currentMapId, mapId: currentMapId };
        if (!eventMatchesFilters(node, detail)) return;
        changed += bindArrivalFacts(manager, missionId, node, detail);
      });
    });

    if (changed) manager.publish?.();
    return changed;
  };

  const progressReturnConsumedObservers = (manager, sourceMissionId, detail) => {
    if (!manager?.trees?.size) return 0;
    let changed = 0;
    manager.trees.forEach((tree, missionId) => {
      if (missionId === sourceMissionId) return;
      if (manager.ensureLifecycle?.(missionId)?.status !== "active") return;
      let treeChanged = false;
      tree.availableLeaves().forEach((node) => {
        if (node.isComplete || node.params?.returnConsumedOnly !== true) return;
        if (Missions.normalizeActionType(node.type) !== Missions.ActionType.TRAVEL) return;
        if (!eventMatchesFilters(node, detail)) return;
        if (node.increment(1)) {
          changed += 1;
          treeChanged = true;
        }
      });
      if (treeChanged) {
        tree.refresh();
        manager.memory?.saveTree?.(tree);
      }
    });
    return changed;
  };

  const progressSpecificTravelMissionNode = (
    manager,
    missionId,
    requestedNode,
    detail = {}
  ) => {
    if (!manager || !missionId || !requestedNode || !detail?.toMapId) return false;
    if (manager.ensureLifecycle?.(missionId)?.status !== "active") return false;
    const tree = manager.trees?.get?.(missionId);
    if (!tree) return false;
    const node = tree.find?.(requestedNode.id) || requestedNode;
    if (!node || node.isComplete) return false;
    if (node.params?.returnConsumedOnly === true) return false;
    const eventDriven = node.params?.eventDriven === true;
    if (!eventDriven && node.params?.biblePattern !== "TRAVEL_CYCLE") return false;
    if (Missions.normalizeActionType(node.type) !== Missions.ActionType.TRAVEL) return false;
    if (!eventMatchesFilters(node, detail)) return false;
    if (!progressTravelNode(node, detail)) return false;

    bindArrivalFacts(manager, missionId, node, detail);
    bindCompletionArrivalFact(manager, node, detail);
    if (node.isComplete) {
      const key = `missionReturnIntent:${missionId}`;
      const intent = manager.memory?.getFact?.(key, null);
      if (intent?.active === true) {
        manager.memory?.setFact?.(key, null);
        manager.memory?.save?.();
        progressReturnConsumedObservers(manager, missionId, detail);
      }
    }
    tree.refresh?.();
    manager.memory?.saveTree?.(tree);
    manager.syncLifecycleFromTrees?.();
    manager.reevaluatePendingActivations?.();
    manager.catalogController?.schedule?.();
    manager.publish?.();
    return true;
  };

  const progressActiveTravel = (detail = {}) => {
    const manager = BF.currentEngine?.missionManager;
    if (!manager?.trees?.size || !detail.toMapId) return 0;
    let changed = 0;

    manager.trees.forEach((tree, missionId) => {
      if (manager.ensureLifecycle?.(missionId)?.status !== "active") return;
      let treeChanged = false;

      tree.availableLeaves().forEach((node) => {
        if (node.isComplete) return;
        if (node.params?.returnConsumedOnly === true) return;
        const eventDriven = node.params?.eventDriven === true;
        if (!eventDriven && node.params?.biblePattern !== "TRAVEL_CYCLE") return;
        if (Missions.normalizeActionType(node.type) !== Missions.ActionType.TRAVEL) return;
        if (!eventMatchesFilters(node, detail)) return;

        if (progressTravelNode(node, detail)) {
          changed += 1;
          treeChanged = true;
          bindArrivalFacts(manager, missionId, node, detail);
          bindCompletionArrivalFact(manager, node, detail);
          if (node.isComplete) {
            const key = `missionReturnIntent:${missionId}`;
            const intent = manager.memory?.getFact?.(key, null);
            if (intent?.active === true) {
              manager.memory?.setFact?.(key, null);
              manager.memory?.save?.();
              changed += progressReturnConsumedObservers(manager, missionId, detail);
            }
          }
        }
      });

      if (treeChanged) {
        tree.refresh();
        manager.memory?.saveTree?.(tree);
      }
    });

    if (changed) {
      manager.syncLifecycleFromTrees?.();
      manager.reevaluatePendingActivations?.();
      manager.catalogController?.schedule?.();
      manager.publish?.();
    }
    return changed;
  };

  const onMapTransition = (event) => {
    const detail = event?.detail || {};
    const toMapId = detail.toMapId || detail.mapId || null;
    if (!toMapId) return;
    progressActiveTravel({
      fromMapId: detail.fromMapId || null,
      toMapId,
      mapId: toMapId,
      direction: detail.direction || null,
      isNew: detail.isNew === true,
      source: detail.source || null,
      mode: detail.mode || null
    });
  };

  const install = () => {
    if (BF.__travelCycleBridgeVersion === VERSION) return true;
    global.addEventListener?.("bluefox:map-transition-completed", onMapTransition);
    global.addEventListener?.("bluefox:mission-state", reconcileCurrentArrivalBindings);
    BF.__travelCycleBridgeVersion = VERSION;
    reconcileCurrentArrivalBindings();
    return true;
  };

  BF.progressTravelCycleMissions = progressActiveTravel;
  BF.progressSpecificTravelMissionNode = progressSpecificTravelMissionNode;
  BF.installTravelCycleBridge = install;
  BF.getTravelCycleDiagnostics = () => ({
    version: VERSION,
    installed: BF.__travelCycleBridgeVersion === VERSION
  });

  install();
})(window);
