(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (BF.mount?.__bibleExplorationWorldV19) return;
  const originalMount = BF.mount;
  if (typeof originalMount !== "function") return;

  function renderMissionScenes(engine) {
    const definition = BF.maps?.[engine?.currentMapId], map = engine?.currentMap;
    if (!definition || !map?.group || !BF.ObjectSpawner) return;
    (definition.missionMicroScenes || []).forEach((record) => {
      if (map.group.getObjectByProperty?.("name", `BibleMissionScene:${record.id}`)) return;
      const spawner = new BF.ObjectSpawner({ THREE:engine.THREE, scene:map.group, palette:definition.palette });
      const records = spawner.spawnMicroScene(record.microSceneId, {
        origin:record.anchor, rotation:record.rotation||0, scene:map.group,
        force:true, source:`bible-mission:${record.id}`
      });
      records.forEach((spawned, index) => {
        if (!spawned?.root) return;
        if (index === 0) spawned.root.name = `BibleMissionScene:${record.id}`;
        spawned.root.userData.bibleMissionId = record.missionId;
        spawned.root.userData.biblePersistentScene = record.id;
        if (spawned.instance?.hitbox) {
          const hitbox = spawned.instance.hitbox;
          hitbox.userData.bibleMissionId = record.missionId;
          hitbox.userData.biblePersistentScene = record.id;

          const functionalId = String(
            hitbox.userData.functional?.id ||
            hitbox.userData.catalogId ||
            spawned.root.userData.functional?.id ||
            spawned.root.userData.catalogId ||
            ""
          );
          const functionalType = String(
            hitbox.userData.functional?.type ||
            hitbox.userData.libraryType ||
            spawned.root.userData.functional?.type ||
            spawned.root.userData.objectType ||
            ""
          );

          if (
            record.missionId === "BIBLE-V01-RECONNAISSANCE" &&
            (functionalId === "TEC-RELI-M-001" || functionalType === "tech_relic")
          ) {
            const instanceId =
              hitbox.userData.instanceId ||
              spawned.root.userData.instanceId ||
              `${record.id}:relic`;
            hitbox.userData.instanceId = instanceId;
            spawned.root.userData.instanceId ||= instanceId;

            // Liaison native utilisée par Object-M0 à la sélection ET à la validation.
            engine.missionManager?.memory?.setFact?.(
              `bibleTarget:${record.missionId}`,
              {
                binding: "instance",
                instanceId,
                objectId: "TEC-RELI-M-001",
                cuoType: "tech_relic"
              }
            );
            engine.missionManager?.memory?.save?.();
          }

          map.interactables.push(hitbox);
        }
        (spawned.instance?.colliders || []).forEach((collider) => {
          const transformRoot = spawned.objectRoot || spawned.root;
          transformRoot.updateWorldMatrix(true, false);
          const position = transformRoot.localToWorld(collider.offset.clone());
          map.colliders.push({ position, radius:collider.radius, owner:spawned.root });
        });
      });
      engine.character?.setColliders?.(map.colliders);
    });
  }

  const wrapped = async function mountBibleExplorationWorldV19(options) {
    const engine = await originalMount.call(this, options);
    const originalLoad = engine.loadMap.bind(engine);
    engine.loadMap = async function loadMapBibleV19(...args) {
      const result = await originalLoad(...args);
      renderMissionScenes(engine);
      return result;
    };
    renderMissionScenes(engine);
    return engine;
  };
  wrapped.__bibleExplorationWorldV19 = true;
  BF.mount = wrapped;
})(window);
