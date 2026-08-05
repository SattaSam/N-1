(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const original = BF.ObjectLibrary;
  if (!original?.data || !original?.create) {
    console.error("[BlueFox Flora Skin] ObjectLibrary doit être chargé avant le correctif flore.");
    return;
  }

  const TYPE = "lantern_mushrooms";
  const baseDefinition = original.get?.(TYPE) || original.data?.[TYPE];
  if (!baseDefinition) {
    console.warn(`[BlueFox Flora Skin] Type absent : ${TYPE}`);
    return;
  }

  const setShadows = (root) => {
    root.traverse?.((child) => {
      if (!child.isMesh || child.userData?.interactable) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return root;
  };

  const makeLanternMushrooms = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "LanternMushroomsGrid";

    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x756b7d,
      roughness: 0.86,
      metalness: 0.01
    });
    const gridMaterial = new THREE.MeshStandardMaterial({
      color: 0x342640,
      emissive: 0x39144f,
      emissiveIntensity: 0.34,
      roughness: 0.64,
      metalness: 0.08
    });
    const innerGlowMaterial = new THREE.MeshStandardMaterial({
      color: 0xd8a6ff,
      emissive: 0x8c2cff,
      emissiveIntensity: 2.35,
      transparent: true,
      opacity: 0.88,
      roughness: 0.2,
      metalness: 0.02,
      depthWrite: false
    });

    const placements = [
      [-0.46, -0.08, 0.82, 0.34],
      [0.34, 0.18, 1.08, 0.42],
      [0.08, -0.48, 0.68, 0.29]
    ];

    placements.forEach(([x, z, height, radius], index) => {
      const mushroom = new THREE.Group();
      mushroom.name = "LanternMushroom";
      mushroom.position.set(x, 0, z);
      mushroom.rotation.y = variant * 0.23 + index * 1.7;
      mushroom.userData.windPhase = index * 1.91;

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.22, radius * 0.31, height, 9),
        stemMaterial
      );
      stem.name = "MushroomStem";
      stem.position.y = height / 2;
      mushroom.add(stem);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.73, 16, 11),
        innerGlowMaterial.clone()
      );
      glow.name = "MushroomInnerGlow";
      glow.scale.set(1, 0.62, 1);
      glow.position.y = height + radius * 0.12;
      mushroom.add(glow);

      const capRoot = new THREE.Group();
      capRoot.name = "MushroomGridCap";
      capRoot.position.y = height + radius * 0.13;
      mushroom.add(capRoot);

      const ringCount = 4;
      for (let ring = 0; ring < ringCount; ring += 1) {
        const t = ring / (ringCount - 1);
        const ringRadius = radius * (0.28 + Math.sin(t * Math.PI) * 0.78);
        const ringY = radius * (0.4 - t * 0.64);
        const hoop = new THREE.Mesh(
          new THREE.TorusGeometry(ringRadius, radius * 0.045, 6, 22),
          gridMaterial
        );
        hoop.name = "MushroomGridRing";
        hoop.rotation.x = Math.PI / 2;
        hoop.position.y = ringY;
        capRoot.add(hoop);
      }

      const ribCount = 10;
      for (let rib = 0; rib < ribCount; rib += 1) {
        const angle = (rib / ribCount) * Math.PI * 2;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(Math.cos(angle) * radius * 0.08, radius * 0.48, Math.sin(angle) * radius * 0.08),
          new THREE.Vector3(Math.cos(angle) * radius * 0.72, radius * 0.2, Math.sin(angle) * radius * 0.72),
          new THREE.Vector3(Math.cos(angle) * radius * 0.92, -radius * 0.08, Math.sin(angle) * radius * 0.92),
          new THREE.Vector3(Math.cos(angle) * radius * 0.42, -radius * 0.28, Math.sin(angle) * radius * 0.42)
        ]);
        const ribMesh = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 10, radius * 0.035, 5, false),
          gridMaterial
        );
        ribMesh.name = "MushroomGridRib";
        capRoot.add(ribMesh);
      }

      const light = new THREE.PointLight(0xa54cff, 1.5 + index * 0.2, 2.8 + radius * 2.5);
      light.name = "MushroomPurpleLight";
      light.position.y = height + radius * 0.18;
      mushroom.add(light);
      root.add(mushroom);
    });

    root.rotation.y = variant * 0.31;
    return {
      root: setShadows(root),
      hitbox: null,
      colliders: [],
      kind: TYPE
    };
  };

  const definition = Object.freeze({
    ...baseDefinition,
    build: makeLanternMushrooms,
    production: Object.freeze({
      ...(baseDefinition.production || {}),
      pass: "flora-skin-r1",
      geometryRevision: 3,
      decision: "validated"
    })
  });

  const data = Object.freeze({ ...original.data, [TYPE]: definition });
  const byId = Object.freeze(Object.values(data).reduce((index, item) => {
    index[item.id] = item;
    return index;
  }, {}));

  const attachMetadata = (instance) => {
    instance.catalogId = definition.id;
    instance.definition = definition;
    if (instance.root) {
      Object.assign(instance.root.userData, {
        libraryType: TYPE,
        objectType: TYPE,
        catalogId: definition.id,
        category: definition.category,
        subtype: definition.subtype,
        size: definition.size,
        rarity: definition.rarity,
        functional: definition,
        interaction: definition.interaction,
        knowledge: definition.knowledge,
        observation: definition.observation,
        resource: definition.resource,
        research: definition.research,
        situation: definition.situation,
        decision: definition.decision,
        progression: definition.progression,
        productionPass: "flora-skin-r1"
      });
    }
    return instance;
  };

  BF.ObjectLibrary = Object.freeze({
    ...original,
    data,
    get: (type) => data[type] || null,
    getById: (id) => byId[id] || null,
    exists: (type) => Object.prototype.hasOwnProperty.call(data, type),
    list(filters = {}) {
      return Object.values(data).filter((item) => {
        if (filters.category && item.category !== filters.category) return false;
        if (filters.size && item.size !== filters.size) return false;
        if (filters.rarity && item.rarity !== filters.rarity) return false;
        if (filters.status && item.status !== filters.status) return false;
        if (filters.biome && !item.biomes.includes("all") && !item.biomes.includes(filters.biome)) return false;
        return true;
      });
    },
    create(THREE, type, palette, variant = 0) {
      if (type !== TYPE) return original.create(THREE, type, palette, variant);
      const instance = attachMetadata(makeLanternMushrooms(THREE, palette, variant));
      return original.applyCreateHooks(instance, { THREE, type, palette, variant, definition });
    }
  });

  BF.ObjectLibraryFloraPatch = Object.freeze({ version: "flora-skin-r1", replacedTypes: [TYPE] });
  console.info("[BlueFox Flora Skin] Champignons-lanternes grillagés actifs.");
})(window);
