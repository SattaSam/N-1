(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const definitions = Array.isArray(global.BlueFoxCustomMaps) ? global.BlueFoxCustomMaps : [];
  definitions.forEach((source) => {
    if (!source?.id || BF.maps?.[source.id]) return;
    BF.maps[source.id] = {
      ...source,
      zones: Array.from({ length: Math.max(1, Number(source.plateauCount) || 1) }, (_, index) => `Plateau ${index + 1}`),
      entry: source.entry || { x: 0, z: 10 },
      exits: {},
      traits: source.traits || [{ id: "custom", label: "composition personnalisée" }],
      description: source.description || `${source.name} — map créée dans le laboratoire mono-map.`,
      synthesis: source.synthesis || "Je vais examiner l’agencement de cette map personnalisée.",
      resourceHints: source.resourceHints || "Ressources distribuées par le profil de biome et les micro-scènes enregistrées.",
      palette: source.palette || { ground: 0x5b526f, accent: 0xc795ff }
    };
  });

  const baseBuildMap = BF.buildMap;
  if (typeof baseBuildMap !== "function" || baseBuildMap.customMapRegistryWrapped) return;
  const wrappedBuildMap = function buildMapWithCustomScenes(THREE, definition, assets, renderer) {
    const built = baseBuildMap(THREE, definition, assets, renderer);
    if (!Array.isArray(definition.customMicroScenes) || !definition.customMicroScenes.length) return built;
    const spawner = new BF.ObjectSpawner({ THREE, scene: built.group, palette: definition.palette });
    definition.customMicroScenes.forEach((placement, index) => {
      const root = new THREE.Group();
      const position = placement.position || [0, 0, 0];
      const rotation = placement.rotation || [0, 0, 0];
      root.position.set(...position);
      root.rotation.set(...rotation);
      root.userData.customMicroSceneId = placement.id;
      root.userData.customMicroSceneIndex = index;
      built.group.add(root);
      const records = spawner.spawnMicroScene(placement.id, { origin: { x: 0, y: 0, z: 0 }, scene: root, force: true, source: `custom-map:${definition.id}` });
      records.forEach((record) => {
        if (record.instance.hitbox) built.interactables.push(record.instance.hitbox);
        record.instance.colliders.forEach((collider) => {
          record.root.updateWorldMatrix(true, false);
          const position = record.root.localToWorld(collider.offset.clone());
          built.colliders.push({ position, radius: collider.radius, owner: record.root });
        });
      });
    });
    return built;
  };
  wrappedBuildMap.customMapRegistryWrapped = true;
  BF.buildMap = wrappedBuildMap;
  BF.CustomMapRegistry = Object.freeze({ list: () => definitions.slice(), count: definitions.length });
})(window);
