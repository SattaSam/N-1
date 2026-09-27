(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const VERSION = "context-msc-v2";

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

  const contextRoleOf = (object) => {
    let cursor = object || null;
    while (cursor) {
      const role = cursor.userData?.contextRole;
      if (role) return String(role);
      cursor = cursor.parent || null;
    }
    return null;
  };

  const contextMatches = (node, detail) => {
    const expectedId = node?.params?.microSceneId;
    if (node?.params?.anyMicroScene !== true && expectedId != null &&
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
          const current = manager.currentAction;
          if (
            current?.missionId === missionId &&
            current?.nodeId === node.id
          ) {
            manager.memory?.remember?.("action-completed", current);
            manager.clearExecutionRecovery?.(current);
            manager.currentAction = null;
            manager.retryAfter = (global.performance?.now?.() || 0) + 650;
            manager.idleRetryUntil = 0;
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
        contextRoleOf(object) ||
        (template?.missionOnly === true
          ? "objectiveSubject"
          : "scenarioSupport")
    };
  };

  const sceneEntryForEvent = (event) => {
    const microSceneId = String(
      event?.microSceneId || event?.detail?.microSceneId || ""
    );
    if (!microSceneId) return null;
    const persistentId = String(
      event?.persistentMicroSceneId ||
      event?.detail?.persistentMicroSceneId ||
      ""
    );
    const scenes = Array.isArray(
      BF.currentEngine?.currentMap?.group?.userData?.microScenes
    )
      ? BF.currentEngine.currentMap.group.userData.microScenes
      : [];
    return scenes.find((scene) => {
      if (normalize(scene?.id) !== normalize(microSceneId)) return false;
      if (!persistentId) return true;
      const scenePersistentId = String(
        scene?.instanceRoot?.userData?.persistentMicroSceneId ||
        scene?.persistentMicroSceneId ||
        ""
      );
      return scenePersistentId === persistentId;
    }) || null;
  };

  const describeMSCEvent = (event) => {
    const microSceneId =
      event?.microSceneId ||
      event?.detail?.microSceneId ||
      null;
    if (!microSceneId) return null;
    const template = templateOf(microSceneId);
    const scene = sceneEntryForEvent(event);
    const instanceRoot = scene?.instanceRoot || null;
    return {
      microSceneId: String(microSceneId),
      microSceneInstanceId:
        event?.microSceneInstanceId ||
        event?.detail?.microSceneInstanceId ||
        scene?.instanceId ||
        null,
      mapId:
        event?.mapId ??
        event?.detail?.mapId ??
        BF.currentEngine?.currentMapId ??
        null,
      zoneId:
        event?.zoneId ??
        event?.detail?.zoneId ??
        BF.currentEngine?.currentZoneIndex ??
        null,
      rarity:
        event?.detail?.rarity ||
        scene?.rarity ||
        template?.rarity ||
        null,
      mscMissionId:
        event?.detail?.mscMissionId ||
        event?.detail?.missionSceneMissionId ||
        event?.detail?.bibleMissionId ||
        scene?.missionId ||
        instanceRoot?.userData?.bibleMissionId ||
        template?.missionId ||
        null,
      missionOnly:
        event?.detail?.missionOnly === true ||
        template?.missionOnly === true,
      contextRole:
        event?.detail?.contextRole ||
        scene?.contextRole ||
        instanceRoot?.userData?.contextRole ||
        (template?.missionOnly === true
          ? "objectiveSubject"
          : "scenarioSupport")
    };
  };

  const onObjectEvent = (event) => {
    if (BF.bibleRuntime?.isActivationEvent?.(event?.id)) return;
    const normalizedDetail = describeMSCEvent(event);
    if (normalizedDetail) {
      progressContextMissions(normalizedDetail);
      return;
    }

    // Compatibilité avec les producteurs historiques non normalisés.
    const object =
      event?.object ||
      event?.detail?.object ||
      null;
    if (!object) return;
    const detail = describeMSCObject(object, event);
    if (!detail) return;
    progressContextMissions(detail);
  };

  // CONTEXT_MSC progresse uniquement sur une preuve d'événement canonique.
  // La simple présence technique d'une MSC dans la map ne vaut pas découverte.
  const scanCurrentMap = () => 0;


  const install = () => {
    if (BF.__contextMSCBridgeVersion === VERSION) return true;
    if (BF.ObjectEvents?.subscribe) {
      BF.__contextMSCUnsubscribe = BF.ObjectEvents.subscribe(onObjectEvent);
    }
    BF.__contextMSCBridgeVersion = VERSION;
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
