(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const VERSION = "explore-scope-v1";

  const normalize = (value) => String(value ?? "").trim().toLowerCase();

  const nodeDistinctValue = (node, detail) => {
    const distinctBy = String(node?.params?.distinctBy || "").trim();
    if (!distinctBy || distinctBy === "none") return null;
    if (distinctBy === "mapId") return String(detail.mapId || "");
    if (distinctBy === "zoneId") {
      return detail.mapId != null && detail.zoneId != null
        ? `${detail.mapId}:${detail.zoneId}`
        : "";
    }
    if (distinctBy === "biomeId") {
      return String(detail.biomeId || detail.biome || "");
    }
    return null;
  };

  const scopeMatches = (node, detail, engine) => {
    const scope = String(node?.params?.scope || "map").trim();
    if (scope === "global" || scope === "multi-map") return true;
    if (scope === "local") {
      return String(detail.mapId || "") === String(engine?.currentMapId || "") &&
        (node.params?.zoneId == null ||
          String(detail.zoneId ?? "") === String(node.params.zoneId));
    }
    return String(detail.mapId || "") === String(
      node.params?.mapId || engine?.currentMapId || ""
    );
  };

  const biomeMatches = (node, detail) => {
    const filter = node?.params?.biomeFilter;
    if (filter == null) return true;
    const actual = normalize(detail.biomeId || detail.biome);
    const expected = Array.isArray(filter) ? filter : [filter];
    return expected.map(normalize).includes(actual);
  };

  const progressExploreNode = (node, detail) => {
    const metric = String(node?.params?.metric || "").trim();
    const threshold = Number(node?.params?.threshold);
    if (metric === "surfacePercent" || Number.isFinite(threshold)) {
      const value = Number(detail.surfacePercent);
      if (!Number.isFinite(value)) return false;
      const required = Number.isFinite(threshold) ? threshold : Number(node.target);
      if (value < required) return false;
      const delta = Math.max(0, node.target - node.progress);
      return delta > 0 ? node.increment(delta) : false;
    }

    const identity = nodeDistinctValue(node, detail);
    if (identity != null) {
      return node.incrementDistinct?.(identity, 1) || false;
    }

    return node.increment(Math.max(1, Number(detail.amount) || 1));
  };

  const progressActiveExploration = (detail = {}) => {
    const manager = BF.currentEngine?.missionManager;
    if (!manager?.trees?.size) return 0;

    let changed = 0;
    manager.trees.forEach((tree, missionId) => {
      if (manager.ensureLifecycle?.(missionId)?.status !== "active") return;
      let treeChanged = false;

      tree.availableLeaves().forEach((node) => {
        if (node.isComplete) return;
        if (node.params?.biblePattern !== "EXPLORE_SCOPE") return;
        if (Missions.normalizeActionType(node.type) !== Missions.ActionType.EXPLORE_ZONE) return;
        if (!scopeMatches(node, detail, BF.currentEngine)) return;
        if (!biomeMatches(node, detail)) return;

        if (progressExploreNode(node, detail)) {
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

  const onExplorationChanged = (event) => {
    const detail = event?.detail || {};
    progressActiveExploration({
      ...detail,
      amount: Math.max(1, Number(detail.revealedSectorCount) || 1)
    });
  };

  const onMapTransition = (event) => {
    const detail = event?.detail || {};
    if (detail.isNew !== true) return;
    const mapId = detail.toMapId || detail.mapId || null;
    if (!mapId) return;
    progressActiveExploration({
      mapId,
      zoneId: null,
      biomeId: detail.biomeId || detail.biome || null,
      biome: detail.biome || null,
      amount: 1,
      surfacePercent: Number(
        BF.getMapExplorationState?.(mapId)?.surfacePercent
      ) || 0
    });
  };

  const install = () => {
    if (BF.__exploreScopeBridgeVersion === VERSION) return true;
    global.addEventListener?.("bluefox:map-exploration-changed", onExplorationChanged);
    global.addEventListener?.("bluefox:map-transition-completed", onMapTransition);
    BF.__exploreScopeBridgeVersion = VERSION;
    return true;
  };

  BF.progressExploreScopeMissions = progressActiveExploration;
  BF.installExploreScopeBridge = install;
  install();
})(window);
