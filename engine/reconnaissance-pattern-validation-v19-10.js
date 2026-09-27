(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const RECON = "BIBLE-V01-RECONNAISSANCE";
  const SCENE_ID = "MSC-BIBLE-RELIC-001";
  const RELIC_ID = "TEC-RELI-M-001";

  const manager = () => BF.currentEngine?.missionManager || null;
  const tree = () => manager()?.trees?.get?.(RECON) || null;
  const node = (slot) => tree()?.find?.(`${RECON}:${slot}`) || null;
  const active = () =>
    manager()?.memory?.state?.missionLifecycle?.[RECON]?.status === "active";

  function chooseSafeOrigin(engine) {
    const regions = engine?.currentMap?.walkableRegions || [];

    if (regions.length) {
      // Choisir la zone marchable dont le centre est le plus éloigné du point d'entrée.
      const entry = BF.maps?.[engine.currentMapId]?.entry || { x: 0, z: 0 };
      const candidates = regions.map((region) => {
        const x = (Number(region.minX) + Number(region.maxX)) / 2;
        const z = (Number(region.minZ) + Number(region.maxZ)) / 2;
        return {
          x,
          y: 0,
          z,
          margin: Math.min(
            x - Number(region.minX),
            Number(region.maxX) - x,
            z - Number(region.minZ),
            Number(region.maxZ) - z
          ),
          distance: Math.hypot(x - (Number(entry.x) || 0), z - (Number(entry.z) || 0))
        };
      }).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.z) && p.margin >= 7);

      if (candidates.length) {
        candidates.sort((a, b) => b.distance - a.distance);
        return candidates[0];
      }
    }

    // Fallback test : proche de BlueFox, uniquement si aucune walkableRegion exploitable.
    const p = engine?.character?.root?.position;
    if (!p) return null;
    return { x: Number(p.x) + 5, y: 0, z: Number(p.z) + 5, margin: 0 };
  }

  function findMissionRelic(engine) {
    return (engine?.currentMap?.interactables || []).find((object) => {
      const id = String(
        object?.userData?.functional?.id ||
        object?.userData?.catalogId ||
        ""
      );
      return id === RELIC_ID &&
        object?.userData?.bibleMissionId === RECON;
    }) || null;
  }

  function bindTarget(hitbox) {
    const m = manager();
    if (!m || !hitbox) return false;

    const instanceId =
      hitbox.userData?.instanceId ||
      `${RECON}:${Date.now()}:relic`;

    hitbox.userData.instanceId = instanceId;
    hitbox.userData.bibleMissionId = RECON;
    hitbox.userData.biblePatternValidation = true;

    m.memory?.setFact?.(`bibleTarget:${RECON}`, {
      binding: "instance",
      instanceId,
      objectId: RELIC_ID,
      cuoType: "tech_relic",
      mapId: BF.currentEngine?.currentMapId || null
    });
    m.memory?.save?.();
    return true;
  }

  function spawnRelicForPatternTest() {
    const engine = BF.currentEngine;
    if (!engine || !active()) return false;
    if (!node("exploreMaps")?.isComplete) return false;
    if (node("observeRelic")?.isComplete) return false;

    const existing = findMissionRelic(engine);
    if (existing) return bindTarget(existing);

    const definition = BF.maps?.[engine.currentMapId];
    if (!definition || !BF.PersistentMicroScenes) return false;

    const record = BF.PersistentMicroScenes.ensure(definition, {
      missionId: RECON,
      microSceneId: SCENE_ID,
      persistent: true,
      spawnOnce: true,
      anchor: null,
      rotation: 0
    });

    if (!record) return false;

    BF.PersistentMicroScenes.spawnForBuiltMap(
      engine.THREE,
      engine.currentMap,
      definition
    );

    const relicHitbox = findMissionRelic(engine);
    if (!relicHitbox) {
      console.error(
        "[BlueFox] Reconnaissance : relique persistante absente après restauration.",
        { mapId: engine.currentMapId, record }
      );
      return false;
    }

    bindTarget(relicHitbox);
    engine.character?.setColliders?.(engine.currentMap.colliders || []);

    engine.callbacks?.onStatus?.(
      "Une relique missionnelle persistante est détectée sur ce territoire."
    );

    return true;
  }

  function review() {
    if (!active()) return;
    if (node("exploreMaps")?.isComplete && !node("observeRelic")?.isComplete) {
      spawnRelicForPatternTest();
    }
  }

  global.addEventListener("bluefox:map-transition-completed", () => {
    global.setTimeout(review, 300);
  });

  global.addEventListener("bluefox:mission-state", () => {
    global.setTimeout(review, 0);
  });

  global.setInterval(review, 1000);

  BF.getReconnaissancePatternTestState = () => ({
    active: active(),
    mapId: BF.currentEngine?.currentMapId || null,
    exploreComplete: Boolean(node("exploreMaps")?.isComplete),
    relicComplete: Boolean(node("observeRelic")?.isComplete),
    returnComplete: Boolean(node("returnToShelter")?.isComplete),
    relicPresent: Boolean(findMissionRelic(BF.currentEngine)),
    target: manager()?.memory?.getFact?.(`bibleTarget:${RECON}`, null)
  });
})(window);
