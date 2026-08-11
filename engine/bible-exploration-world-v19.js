(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (BF.mount?.__bibleExplorationWorldV19) return;
  const originalMount = BF.mount;
  if (typeof originalMount !== "function") return;

  const capsuleDefinition = Object.freeze({
    id: "LANDMARK-CRASH-CAPSULE-001",
    type: "crash-capsule",
    label: "capsule accidentée",
    category: "technology",
    gameplay: Object.freeze({
      interactive: true, collectable: false, inspectable: true,
      destructible: false, obstacle: true, discoverable: true
    }),
    interaction: Object.freeze({
      actions: Object.freeze(["observe"]),
      defaultAction: "observe",
      defaultManualAction: "observe",
      removeFromWorld: false,
      animation: Object.freeze({ observe: Object.freeze(["Ear_Right"]) })
    }),
    knowledge: Object.freeze({ family: "technology", discoverable: true, uniqueByInstance: true }),
    situation: Object.freeze({ tags: Object.freeze(["technology","crash","landmark","capsule"]) })
  });

  function attachCapsule(engine) {
    const map = engine?.currentMap, capsule = map?.crashCapsule;
    if (!capsule) return;
    const old = (map.interactables || []).filter((object) =>
      object?.userData?.instanceId === "crystal:crash-capsule"
    );
    old.forEach((object) => {
      const i = map.interactables.indexOf(object);
      if (i >= 0) map.interactables.splice(i,1);
      object.removeFromParent?.();
    });

    capsule.updateWorldMatrix?.(true,true);
    const box = new engine.THREE.Box3().setFromObject(capsule);
    if (box.isEmpty()) return;
    const size = box.getSize(new engine.THREE.Vector3());
    const center = box.getCenter(new engine.THREE.Vector3());
    const localCenter = capsule.worldToLocal(center.clone());
    const scale = capsule.getWorldScale(new engine.THREE.Vector3());
    const worldSize = new engine.THREE.Vector3(
      Math.max(.8, size.x + .9),
      Math.max(.8, size.y + .6),
      Math.max(.8, size.z + .9)
    );
    const localSize = new engine.THREE.Vector3(
      worldSize.x / Math.max(.0001, Math.abs(scale.x)),
      worldSize.y / Math.max(.0001, Math.abs(scale.y)),
      worldSize.z / Math.max(.0001, Math.abs(scale.z))
    );
    const hitbox = new engine.THREE.Mesh(
      new engine.THREE.BoxGeometry(localSize.x, localSize.y, localSize.z),
      new engine.THREE.MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false })
    );
    hitbox.name = "BlueFoxCrashCapsuleHitbox";
    hitbox.position.copy(localCenter);
    Object.assign(hitbox.userData, {
      interactable:true, active:true, kind:"crash-capsule",
      libraryType:"crash-capsule", catalogId:capsuleDefinition.id,
      functional:capsuleDefinition, instanceId:"crystal:crash-capsule",
      worldAnchor:capsule, interactionRadius:Math.max(worldSize.x,worldSize.z)*.52
    });
    Object.assign(capsule.userData, {
      functional:capsuleDefinition, catalogId:capsuleDefinition.id,
      libraryType:"crash-capsule", instanceId:"crystal:crash-capsule"
    });
    capsule.add(hitbox);
    map.interactables.push(hitbox);
  }

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
          const position = collider.offset.clone()
            .applyAxisAngle(new engine.THREE.Vector3(0,1,0), spawned.root.rotation.y)
            .add(spawned.root.position);
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
      attachCapsule(engine);
      renderMissionScenes(engine);
      return result;
    };
    attachCapsule(engine);
    renderMissionScenes(engine);
    return engine;
  };
  wrapped.__bibleExplorationWorldV19 = true;
  BF.mount = wrapped;
})(window);
