(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const VERSION = "context-msc-v1";

  const normalize = (value) => String(value ?? "").trim().toLowerCase();

  const microSceneIdOf = (object) => {
    let cursor = object || null;
    while (cursor) {
      const id = cursor.userData?.microSceneId;
      if (id) return String(id);
      cursor = cursor.parent || null;
    }
    return "";
  };

  const templateOf = (microSceneId) =>
    microSceneId ? BF.MicroScenes?.get?.(microSceneId) || null : null;

  const contextMatches = (node, detail) => {
    const expectedId = node?.params?.microSceneId;
    if (expectedId != null &&
        normalize(expectedId) !== normalize(detail.microSceneId)) {
      return false;
    }

    const expectedMissionId = node?.params?.mscMissionId;
    if (expectedMissionId != null &&
        normalize(expectedMissionId) !== normalize(detail.mscMissionId)) {
      return false;
    }

    const expectedRole = node?.params?.contextRole;
    if (expectedRole != null) {
      const actualRole = detail.contextRole || "scenarioSupport";
      if (normalize(expectedRole) !== normalize(actualRole)) return false;
    }

    const rarity = node?.params?.rarity;
    if (rarity != null && normalize(rarity) !== normalize(detail.rarity)) {
      return false;
    }

    return true;
  };

  const progressContextMissions = (detail = {}) => {
    const manager = BF.currentEngine?.missionManager;
    if (!manager?.trees?.size || !detail.microSceneId) return 0;

    let changed = 0;
    manager.trees.forEach((tree, missionId) => {
      if (manager.ensureLifecycle?.(missionId)?.status !== "active") return;
      let treeChanged = false;

      tree.availableLeaves().forEach((node) => {
        if (node.isComplete) return;
        if (node.params?.biblePattern !== "CONTEXT_MSC") return;
        if (!contextMatches(node, detail)) return;

        const distinctBy = String(node.params?.distinctBy || "microSceneInstance").trim();
        let identity = null;
        if (distinctBy === "microSceneId") {
          identity = String(detail.microSceneId);
        } else if (distinctBy === "mapId") {
          identity = `${detail.mapId || ""}:${detail.microSceneId}`;
        } else {
          identity =
            String(detail.microSceneInstanceId || detail.instanceRootId || "") ||
            `${detail.mapId || ""}:${detail.microSceneId}`;
        }

        const progressed = identity
          ? node.incrementDistinct?.(identity, 1)
          : node.increment(1);

        if (progressed) {
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

  const describeMSCObject = (object, event = null) => {
    const microSceneId = microSceneIdOf(object);
    if (!microSceneId) return null;
    const template = templateOf(microSceneId);
    let root = object;
    while (root?.parent && !root.userData?.microSceneInstance) {
      root = root.parent;
    }
    const instanceRoot = root?.userData?.microSceneInstance ? root : null;

    return {
      microSceneId,
      microSceneInstanceId:
        instanceRoot?.uuid ||
        instanceRoot?.id ||
        null,
      mapId:
        event?.mapId ??
        BF.currentEngine?.currentMapId ??
        null,
      zoneId:
        event?.zoneId ??
        BF.currentEngine?.currentZoneIndex ??
        null,
      rarity: template?.rarity || null,
      mscMissionId: template?.missionId || null,
      missionOnly: template?.missionOnly === true,
      contextRole:
        template?.missionOnly === true
          ? "objectiveSubject"
          : "scenarioSupport"
    };
  };

  const onObjectEvent = (event) => {
    const object =
      event?.object ||
      event?.detail?.object ||
      null;
    if (!object) return;
    const detail = describeMSCObject(object, event);
    if (!detail) return;
    progressContextMissions(detail);
  };

  const activeContextMissionExists = () => {
    const manager = BF.currentEngine?.missionManager;
    if (!manager?.trees?.size) return false;
    for (const [missionId, tree] of manager.trees) {
      if (manager.ensureLifecycle?.(missionId)?.status !== "active") continue;
      if (tree.availableLeaves().some((node) =>
        node.params?.biblePattern === "CONTEXT_MSC" && !node.isComplete
      )) return true;
    }
    return false;
  };

  const currentMicroSceneIndex = () =>
    BF.currentEngine?.currentMap?.microScenes ||
    BF.currentEngine?.currentMap?.group?.userData?.microScenes ||
    [];

  const scanCurrentMap = () => {
    if (!activeContextMissionExists()) return 0;
    const engine = BF.currentEngine;
    if (!engine) return 0;
    let changed = 0;
    currentMicroSceneIndex().forEach((entry) => {
      if (!entry?.id) return;
      changed += progressContextMissions({
        microSceneId: entry.id,
        microSceneInstanceId: entry.instanceId || null,
        mapId: engine.currentMapId || null,
        zoneId: engine.currentZoneIndex ?? null,
        rarity: entry.rarity || null,
        mscMissionId: entry.missionId || null,
        missionOnly: entry.missionOnly === true,
        contextRole: entry.missionOnly === true ? "objectiveSubject" : "scenarioSupport"
      });
    });
    return changed;
  };

  const onMapTransition = () => {
    global.setTimeout?.(() => scanCurrentMap(), 0);
  };

  const install = () => {
    if (BF.__contextMSCBridgeVersion === VERSION) return true;
    if (BF.ObjectEvents?.subscribe) {
      BF.__contextMSCUnsubscribe = BF.ObjectEvents.subscribe(onObjectEvent);
    }
    global.addEventListener?.("bluefox:map-transition-completed", onMapTransition);
    BF.__contextMSCBridgeVersion = VERSION;
    global.setTimeout?.(() => scanCurrentMap(), 0);
    return true;
  };

  BF.progressContextMSCMissions = progressContextMissions;
  BF.scanContextMSC = scanCurrentMap;
  BF.installContextMSCBridge = install;
  BF.getContextMSCDiagnostics = () => ({
    version: VERSION,
    installed: BF.__contextMSCBridgeVersion === VERSION,
    objectEvents: Boolean(BF.__contextMSCUnsubscribe)
  });

  install();
})(window);
