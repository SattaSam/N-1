(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const VERSION = "travel-cycle-v1";

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

  const progressActiveTravel = (detail = {}) => {
    const manager = BF.currentEngine?.missionManager;
    if (!manager?.trees?.size || !detail.toMapId) return 0;
    let changed = 0;

    manager.trees.forEach((tree, missionId) => {
      if (manager.ensureLifecycle?.(missionId)?.status !== "active") return;
      let treeChanged = false;

      tree.availableLeaves().forEach((node) => {
        if (node.isComplete) return;
        if (node.params?.biblePattern !== "TRAVEL_CYCLE") return;
        if (Missions.normalizeActionType(node.type) !== Missions.ActionType.TRAVEL) return;
        if (!eventMatchesFilters(node, detail)) return;

        if (progressTravelNode(node, detail)) {
          changed += 1;
          treeChanged = true;
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
      direction: detail.direction || null
    });
  };

  const install = () => {
    if (BF.__travelCycleBridgeVersion === VERSION) return true;
    global.addEventListener?.("bluefox:map-transition-completed", onMapTransition);
    BF.__travelCycleBridgeVersion = VERSION;
    return true;
  };

  BF.progressTravelCycleMissions = progressActiveTravel;
  BF.installTravelCycleBridge = install;
  BF.getTravelCycleDiagnostics = () => ({
    version: VERSION,
    installed: BF.__travelCycleBridgeVersion === VERSION
  });

  install();
})(window);
