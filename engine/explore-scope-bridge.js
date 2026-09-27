(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const VERSION = "explore-scope-v3-sequence-map-binding";

  const normalize = (value) => String(value ?? "").trim().toLowerCase();

  const mapBiome = (mapId) => {
    const record = BF.maps?.[mapId] || null;
    return record?.biomeId || record?.biome || record?.generator?.biome || null;
  };

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

  const requiredMapId = (node, manager) => {
    const factKey = String(node?.params?.requiredMapFact || "").trim();
    if (!factKey) return null;
    const fact = manager?.memory?.getFact?.(factKey, null);
    if (!fact || typeof fact !== "object") return "";
    const field = String(node.params?.requiredMapField || "mapId").trim();
    return String(fact[field] || "");
  };

  const scopeMatches = (node, detail, engine, manager) => {
    const boundMapId = requiredMapId(node, manager);
    if (boundMapId != null) {
      return Boolean(boundMapId) &&
        String(detail.mapId || "") === boundMapId;
    }
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
    const identity = nodeDistinctValue(node, detail);
    if (metric === "surfacePercent" || Number.isFinite(threshold)) {
      const value = Number(detail.surfacePercent);
      if (!Number.isFinite(value)) return false;
      const required = Math.max(1, Number.isFinite(threshold) ? threshold : Number(node.target));
      if (identity != null) {
        if (!identity || value < required) return false;
        return node.incrementDistinct?.(identity, 1) || false;
      }
      const absolute = Math.min(
        Number(node.target) || required,
        Math.max(0, value)
      );
      const delta = absolute - Number(node.progress || 0);
      return delta > 0 ? node.increment(delta) : false;
    }

    if (identity != null) {
      if (!identity) return false;
      return node.incrementDistinct?.(identity, 1) || false;
    }

    return node.increment(Math.max(1, Number(detail.amount) || 1));
  };

  const progressActiveExploration = (detail = {}, historicalOnly = false) => {
    const manager = BF.currentEngine?.missionManager;
    if (!manager?.trees?.size) return 0;

    let changed = 0;
    manager.trees.forEach((tree, missionId) => {
      if (manager.ensureLifecycle?.(missionId)?.status !== "active") return;
      let treeChanged = false;

      tree.availableLeaves().forEach((node) => {
        if (node.isComplete) return;
        if (!["EXPLORE_SCOPE", "SEQUENCE_ACTIONS"].includes(
          node.params?.biblePattern
        )) return;
        if (Missions.normalizeActionType(node.type) !== Missions.ActionType.EXPLORE_ZONE) return;
        if (historicalOnly && node.params?.historicalBackfill !== true) return;
        if (!scopeMatches(node, detail, BF.currentEngine, manager)) return;
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
      biomeId: detail.biomeId || detail.biome || mapBiome(detail.mapId),
      biome: detail.biome || mapBiome(detail.mapId),
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
      biomeId: detail.biomeId || detail.biome || mapBiome(mapId),
      biome: detail.biome || mapBiome(mapId),
      amount: 1,
      surfacePercent: Number(
        BF.getMapExplorationState?.(mapId)?.surfacePercent
      ) || 0
    });
  };

  const onMissionState = () => {
    const maps = BF.getExplorationSummary?.().maps || {};
    Object.entries(maps).forEach(([mapId, exploration]) => {
      progressActiveExploration({
        mapId,
        zoneId: null,
        biomeId: mapBiome(mapId),
        biome: mapBiome(mapId),
        surfacePercent: Number(exploration?.surfacePercent) || 0,
        amount: 0
      }, true);
    });

    const mapId = BF.currentEngine?.currentMapId;
    if (!mapId) return;
    const exploration = BF.getMapExplorationState?.(mapId);
    if (!exploration) return;
    progressActiveExploration({
      mapId,
      zoneId: null,
      biomeId: mapBiome(mapId),
      biome: mapBiome(mapId),
      surfacePercent: Number(exploration.surfacePercent) || 0,
      amount: 0
    });
  };

  const install = () => {
    if (BF.__exploreScopeBridgeVersion === VERSION) return true;
    global.addEventListener?.("bluefox:map-exploration-changed", onExplorationChanged);
    global.addEventListener?.("bluefox:map-transition-completed", onMapTransition);
    global.addEventListener?.("bluefox:mission-state", onMissionState);
    BF.__exploreScopeBridgeVersion = VERSION;
    return true;
  };

  BF.progressExploreScopeMissions = progressActiveExploration;
  BF.installExploreScopeBridge = install;
  install();
})(window);
