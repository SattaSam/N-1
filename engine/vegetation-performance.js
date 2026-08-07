(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const original = BF.ObjectLibrary;

  if (!original?.create || !original?.get || !original?.registerCreateHook) {
    console.error("[BlueFox] VegetationPerformance : ObjectLibrary incompatible.");
    return;
  }

  const VERSION = "vegetation-performance-r1";
  const interceptedHooks = new Set();

  const material = (THREE, options = {}) => new THREE.MeshStandardMaterial({
    roughness: 0.78,
    metalness: 0.03,
    ...options
  });

  const makeHitbox = (THREE, root, radius, height, kind) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 8),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    mesh.position.y = height / 2;
    mesh.userData.interactable = true;
    mesh.userData.kind = kind;
    mesh.userData.active = true;
    mesh.userData.worldAnchor = root;
    root.add(mesh);
    return mesh;
  };

  const applyMetadata = (instance, definition, type, variant) => {
    const root = instance?.root;
    if (!root) return instance;

    root.userData ||= {};
    root.userData.libraryType = type;
    root.userData.variant = Number(variant || 0);
    root.userData.catalogId = definition.id;
    root.userData.category = definition.category;
    root.userData.subtype = definition.subtype;
    root.userData.size = definition.size;
    root.userData.rarity = definition.rarity;
    root.userData.functional = definition;
    root.userData.interaction = definition.interaction;
    root.userData.knowledge = definition.knowledge;
    root.userData.observation = definition.observation;
    root.userData.resource = definition.resource;
    root.userData.research = definition.research;
    root.userData.situation = definition.situation;
    root.userData.decision = definition.decision;
    root.userData.progression = definition.progression;
    root.userData.performanceVersion = VERSION;
    return instance;
  };

  const applyHooks = (instance, context) => {
    interceptedHooks.forEach((hook) => {
      try {
        hook(instance, context);
      } catch (error) {
        console.error("[BlueFox MeshBudgetV2] Hook de création en erreur :", error);
      }
    });
    return instance;
  };

  const buildLanternMushrooms = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "LanternMushrooms";

    const stemMaterial = material(THREE, {
      color: 0x66786f,
      emissive: 0x17251f,
      emissiveIntensity: 0.16,
      roughness: 0.88
    });
    const latticeMaterial = material(THREE, {
      color: 0x9b82c8,
      emissive: 0x4b267b,
      emissiveIntensity: 0.85,
      roughness: 0.42,
      wireframe: true
    });
    const glowMaterial = material(THREE, {
      color: 0xe5b9ff,
      emissive: 0xb85cff,
      emissiveIntensity: 1.6,
      roughness: 0.24
    });
    const sporeMaterial = new THREE.MeshBasicMaterial({
      color: 0xdba6ff,
      transparent: true,
      opacity: 0.62,
      depthWrite: false
    });

    const specs = [
      { x:-0.34, z:0.12, h:0.82, s:1.00, phase:0.25 },
      { x: 0.28, z:-0.16, h:1.04, s:1.24, phase:1.15 },
      { x: 0.08, z:0.36, h:0.66, s:0.82, phase:2.05 }
    ];

    specs.forEach((spec, index) => {
      const mushroom = new THREE.Group();
      mushroom.position.set(spec.x, 0, spec.z);
      mushroom.rotation.y = spec.phase + variant * 0.17;
      mushroom.scale.setScalar(spec.s);
      root.add(mushroom);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.085, spec.h, 7),
        stemMaterial
      );
      stem.name = "LanternStem";
      stem.position.y = spec.h / 2;
      mushroom.add(stem);

      // Une seule géométrie wireframe remplace les 17 éléments de grille.
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(
          0.30, 12, 6,
          0, Math.PI * 2,
          0, Math.PI * 0.52
        ),
        latticeMaterial
      );
      cap.name = "LanternCapGrid";
      cap.position.y = spec.h;
      cap.scale.set(1.0, 0.72, 1.0);
      mushroom.add(cap);

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.105, 8, 6),
        glowMaterial
      );
      core.name = "LanternCore";
      core.position.y = spec.h + 0.02;
      core.scale.y = 1.12;
      mushroom.add(core);

      if (index === 1) {
        const light = new THREE.PointLight(0xb95cff, 1.0, 3.0, 2);
        light.name = "LanternLight";
        light.position.y = spec.h + 0.04;
        mushroom.add(light);
      }
    });

    // Trois spores seulement.
    [
      [-0.46,0.76,-0.18],
      [-0.08,1.18,0.02],
      [0.54,1.04,-0.26]
    ].forEach(([x,y,z], index) => {
      const spore = new THREE.Mesh(
        new THREE.SphereGeometry(0.021 + index * 0.003, 5, 4),
        sporeMaterial
      );
      spore.name = "LanternSpore";
      spore.position.set(x,y,z);
      root.add(spore);
    });

    const hitbox = makeHitbox(THREE, root, 0.56, 1.35, "lantern_mushrooms");
    return { root, hitbox, colliders: [], kind: "lantern_mushrooms" };
  };

  const buildFern = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "Fern";
    const plant = new THREE.Group();
    plant.name = "Fern";
    root.add(plant);

    const stemMaterial = material(THREE, {
      color: 0x315f43,
      roughness: 0.84
    });
    const leafMaterial = material(THREE, {
      color: variant % 2 ? 0x5f9f68 : 0x4b8f5b,
      emissive: 0x102b18,
      emissiveIntensity: 0.10,
      roughness: 0.82,
      side: THREE.DoubleSide
    });

    const frondCount = 3;
    for (let index = 0; index < frondCount; index += 1) {
      const angle = (index / frondCount) * Math.PI * 2 + variant * 0.21;
      const length = 0.95 + (index % 2) * 0.18;

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.06, 0),
        new THREE.Vector3(Math.cos(angle)*0.12, length*0.40, Math.sin(angle)*0.12),
        new THREE.Vector3(Math.cos(angle)*0.45, length*0.72, Math.sin(angle)*0.45),
        new THREE.Vector3(Math.cos(angle)*0.80, length*0.52, Math.sin(angle)*0.80)
      ]);
      const stem = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 8, 0.025, 4, false),
        stemMaterial
      );
      stem.name = "FernStem";
      plant.add(stem);

      // Une grande lame par fronde remplace les 12 folioles individuelles.
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 8, 4),
        leafMaterial
      );
      leaf.name = "FernLeaf";
      leaf.position.set(
        Math.cos(angle) * 0.50,
        length * 0.57,
        Math.sin(angle) * 0.50
      );
      leaf.scale.set(1.55, 0.11, 0.42);
      leaf.rotation.y = angle;
      leaf.rotation.z = -0.22 + index * 0.18;
      plant.add(leaf);
    }

    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 6, 4),
      stemMaterial
    );
    center.name = "FernCenter";
    center.position.y = 0.10;
    plant.add(center);

    const hitbox = makeHitbox(THREE, root, 1.05, 1.45, "fern");
    return { root, hitbox, colliders: [], kind: "fern" };
  };

  const buildThermosapMoss = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "ThermosapMoss";

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.62, 0.08, 10),
      material(THREE, {
        color: 0x425a3d,
        roughness: 0.96
      })
    );
    base.name = "ThermosapBase";
    base.position.y = 0.04;
    root.add(base);

    const bulbGeometry = new THREE.SphereGeometry(0.13, 8, 5);
    const bulbMaterial = material(THREE, {
      color: 0x638c58,
      emissive: 0xff8b5d,
      emissiveIntensity: 0.55,
      roughness: 0.82
    });

    const bulbs = new THREE.InstancedMesh(bulbGeometry, bulbMaterial, 7);
    bulbs.name = "ThermosapBulbs";
    bulbs.castShadow = false;
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (let index = 0; index < 7; index += 1) {
      const angle = index * 2.399 + variant * 0.23;
      const radius = 0.12 + (index % 4) * 0.115;
      scale.setScalar(0.82 + (index % 3) * 0.13);
      matrix.compose(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          0.12 + (index % 3) * 0.035,
          Math.sin(angle) * radius
        ),
        q,
        scale
      );
      bulbs.setMatrixAt(index, matrix);
    }
    bulbs.instanceMatrix.needsUpdate = true;
    root.add(bulbs);

    const hitbox = makeHitbox(THREE, root, 0.56, 0.55, "thermosap_moss");
    return { root, hitbox, colliders: [], kind: "thermosap_moss" };
  };

  const builders = Object.freeze({
    lantern_mushrooms: buildLanternMushrooms,
    fern: buildFern,
    thermosap_moss: buildThermosapMoss
  });

  const originalRegisterCreateHook = original.registerCreateHook.bind(original);
  const originalUnregisterCreateHook =
    original.unregisterCreateHook?.bind(original);

  // Politique validée en jeu :
  // aucune végétation ne participe aux shadow maps dynamiques.
  // Les collisions, interactions et animations restent intactes.
  const vegetationTags = (definition) => new Set([
    ...(definition?.spawn?.tags || []),
    ...(definition?.spawnProfile?.tags || []),
    ...(definition?.situation?.tags || []),
    ...(definition?.tags || [])
  ]);

  const isVegetation = (definition, type = "") => {
    const tags = vegetationTags(definition);
    const value = String(type || definition?.type || "").toLowerCase();
    return (
      definition?.category === "flora" ||
      definition?.family === "flora" ||
      definition?.knowledge?.family === "flora" ||
      definition?.resource?.family === "biomass" ||
      tags.has("plant") ||
      tags.has("fungus") ||
      tags.has("ground_cover") ||
      /tree|pine|conifer|fir|spruce|fern|frond|fiber|plant|moss|mushroom|fung|spore|vine|orchid|cactus|vegetation|flora/i.test(value)
    );
  };

  const vegetationShadowHook = (instance, context = {}) => {
    const root = instance?.root;
    if (!root) return;
    const definition =
      instance?.definition ||
      context.definition ||
      original.get?.(context.type || root.userData?.libraryType);
    const type =
      context.type ||
      definition?.type ||
      root.userData?.libraryType ||
      "";
    if (!isVegetation(definition, type)) return;

    root.traverse?.((child) => {
      if (!child?.isMesh || child.userData?.interactable) return;
      child.castShadow = false;
      child.receiveShadow = false;
    });
    root.userData.vegetationShadowPolicy = "static-no-shadowmap-r1";
  };

  // Le hook est enregistré dans la façade d'origine pour les objets standards,
  // et dans la liste interceptée pour les 3 constructeurs allégés.
  originalRegisterCreateHook(vegetationShadowHook);
  interceptedHooks.add(vegetationShadowHook);

  const wrapper = {
    ...original,

    registerCreateHook(hook) {
      if (typeof hook === "function") interceptedHooks.add(hook);
      return originalRegisterCreateHook(hook);
    },

    unregisterCreateHook(hook) {
      interceptedHooks.delete(hook);
      return originalUnregisterCreateHook
        ? originalUnregisterCreateHook(hook)
        : false;
    },

    create(THREE, type, palette, variant = 0) {
      const builder = builders[type];
      if (!builder) return original.create(THREE, type, palette, variant);

      const definition = original.get(type);
      if (!definition) throw new Error(`Type d'objet 3D inconnu : ${type}`);

      const instance = builder(THREE, palette, variant);
      applyMetadata(instance, definition, type, variant);

      return applyHooks(instance, {
        THREE,
        type,
        palette,
        variant,
        definition
      });
    },

    performanceVersion: VERSION,
    meshTargets: Object.freeze({
      lantern_mushrooms: 13,
      fern: 8,
      thermosap_moss: 3
    })
  };

  BF.ObjectLibrary = Object.freeze(wrapper);

  console.info(
    "[BlueFox] Vegetation Performance R1 actif : modèles allégés + végétation hors shadow maps.",
    VERSION
  );
})(window);
