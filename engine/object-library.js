(function (global) {
  "use strict";

  const BF = global.BlueFox3D;

  const setShadows = (root) => {
    root.traverse((child) => {
      if (!child.isMesh) return;
      if (child.userData.interactable) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return root;
  };

  const material = (THREE, options) => new THREE.MeshStandardMaterial({
    roughness: 0.72,
    metalness: 0.05,
    ...options
  });

  const makeHitbox = (THREE, root, radius, height, kind) => {
    const hitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 12),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    hitbox.position.y = height / 2;
    hitbox.userData.interactable = true;
    hitbox.userData.kind = kind;
    hitbox.userData.active = true;
    hitbox.userData.worldAnchor = root;
    root.add(hitbox);
    return hitbox;
  };

  const crystalCluster = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "CrystalCluster";
    const crystalMaterial = material(THREE, {
      color: palette.accent,
      emissive: palette.accent,
      emissiveIntensity: 0.72,
      roughness: 0.24,
      metalness: 0.18
    });
    const baseMaterial = material(THREE, {
      color: palette.ground,
      roughness: 0.92
    });
    const base = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.62 + variant * 0.05, 1),
      baseMaterial
    );
    base.position.y = 0.25;
    base.scale.y = 0.42;
    root.add(base);
    [
      [-0.32, 0, 0.98, -0.16],
      [0.08, 0.02, 1.55, 0.04],
      [0.38, 0.08, 1.16, 0.17],
      [-0.02, -0.28, 0.82, 0.08]
    ].forEach(([x, z, height, tilt], index) => {
      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(0.19 + index * 0.025, height, 6),
        crystalMaterial
      );
      shard.position.set(x, 0.28 + height / 2, z);
      shard.rotation.z = tilt;
      shard.rotation.y = index * 0.7;
      root.add(shard);
    });
    const hitbox = makeHitbox(THREE, root, 0.72, 1.7, "crystal");
    return {
      root: setShadows(root),
      hitbox,
      colliders: [{ offset: new THREE.Vector3(), radius: 0.5 }],
      kind: "crystal"
    };
  };

  const fiberPlant = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "FiberPlant";
    const stemMaterial = material(THREE, {
      color: 0x6fe3ad,
      emissive: 0x164c38,
      emissiveIntensity: 0.55,
      roughness: 0.62
    });
    const bulbMaterial = material(THREE, {
      color: variant % 2 ? 0xa6fff0 : 0x8fd6ff,
      emissive: variant % 2 ? 0x2ca98b : 0x1f6c91,
      emissiveIntensity: 1.1,
      roughness: 0.32
    });
    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * Math.PI * 2;
      const height = 0.68 + (index % 3) * 0.18;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.07, height, 7),
        stemMaterial
      );
      stem.position.set(Math.cos(angle) * 0.27, height / 2, Math.sin(angle) * 0.27);
      stem.rotation.z = Math.cos(angle) * 0.18;
      stem.rotation.x = Math.sin(angle) * 0.18;
      root.add(stem);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 + (index % 2) * 0.035, 12, 9),
        bulbMaterial
      );
      bulb.position.set(
        Math.cos(angle) * 0.35,
        height + 0.02,
        Math.sin(angle) * 0.35
      );
      root.add(bulb);
    }
    const hitbox = makeHitbox(THREE, root, 0.62, 1.25, "fiber");
    return {
      root: setShadows(root),
      hitbox,
      colliders: [],
      kind: "fiber"
    };
  };

  const alienRock = (THREE, palette, variant = 0) => {
    const radius = 0.62 + variant * 0.12;
    const root = new THREE.Group();
    root.name = "AlienRock";
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(radius, 1),
      material(THREE, {
        color: variant % 2 ? palette.ground : 0x455f70,
        roughness: 0.94
      })
    );
    rock.position.y = radius * 0.48;
    rock.scale.set(1.15, 0.72 + variant * 0.08, 0.9);
    rock.rotation.set(0.1 * variant, 0.55 * variant, -0.08);
    root.add(rock);
    return {
      root: setShadows(root),
      colliders: [{ offset: new THREE.Vector3(), radius: radius * 0.86 }],
      kind: "rock"
    };
  };

  const alienTree = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "AlienTree";
    const trunkMaterial = material(THREE, {
      color: variant % 2 ? 0x5e4868 : 0x40566a,
      roughness: 0.9
    });
    const leafMaterial = material(THREE, {
      color: variant % 2 ? 0x78b568 : palette.accent,
      emissive: variant % 2 ? 0x20391c : palette.accent,
      emissiveIntensity: 0.28,
      roughness: 0.7
    });
    const height = 2.5 + variant * 0.35;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.46, height, 8),
      trunkMaterial
    );
    trunk.position.y = height / 2;
    root.add(trunk);
    for (let index = 0; index < 4; index += 1) {
      const crown = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.82 - index * 0.08, 1),
        leafMaterial
      );
      const angle = index * Math.PI * 0.5;
      crown.position.set(
        Math.cos(angle) * 0.58,
        height - 0.1 + (index % 2) * 0.5,
        Math.sin(angle) * 0.58
      );
      crown.scale.y = 0.72;
      root.add(crown);
    }
    return {
      root: setShadows(root),
      colliders: [{ offset: new THREE.Vector3(), radius: 0.55 }],
      kind: "tree"
    };
  };

  const ancientStele = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "AncientStele";
    const stoneMaterial = material(THREE, {
      color: variant % 2 ? 0x526f69 : 0x59677d,
      roughness: 0.88,
      metalness: 0.1
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: palette.accent,
      transparent: true,
      opacity: 0.8
    });
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.68, 2.35, 6),
      stoneMaterial
    );
    body.position.y = 1.17;
    body.rotation.y = variant * 0.4;
    root.add(body);
    for (let index = 0; index < 3; index += 1) {
      const rune = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.055, 0.035),
        glowMaterial
      );
      rune.position.set(0, 0.78 + index * 0.43, 0.53);
      rune.rotation.z = index % 2 ? 0.55 : -0.2;
      root.add(rune);
    }
    const hitbox = makeHitbox(THREE, root, 0.82, 2.5, "structure");
    return {
      root: setShadows(root),
      hitbox,
      colliders: [{ offset: new THREE.Vector3(), radius: 0.66 }],
      kind: "structure"
    };
  };

  const traversableArch = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "TraversableArch";
    const stoneMaterial = material(THREE, {
      color: variant % 2 ? 0x536a60 : 0x59647a,
      roughness: 0.91
    });
    const left = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.7, 3.2, 7),
      stoneMaterial
    );
    left.position.set(-1.55, 1.6, 0);
    left.rotation.z = -0.07;
    root.add(left);
    const right = left.clone();
    right.position.x = 1.55;
    right.rotation.z = 0.07;
    root.add(right);
    const top = new THREE.Mesh(
      new THREE.TorusGeometry(1.57, 0.47, 12, 36, Math.PI),
      stoneMaterial
    );
    top.position.y = 3.15;
    root.add(top);
    const beacon = new THREE.PointLight(palette.accent, 4, 7);
    beacon.position.y = 3;
    root.add(beacon);
    return {
      root: setShadows(root),
      colliders: [
        { offset: new THREE.Vector3(-1.55, 0, 0), radius: 0.72 },
        { offset: new THREE.Vector3(1.55, 0, 0), radius: 0.72 }
      ],
      kind: "arch"
    };
  };

  const luminousPool = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "LuminousPool";
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.6, 40),
      material(THREE, {
        color: 0x526e75,
        roughness: 0.85
      })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.035;
    root.add(rim);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 40),
      new THREE.MeshBasicMaterial({
        color: palette.accent,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.045;
    root.add(water);
    const hitbox = makeHitbox(THREE, root, 1.45, 0.32, "discovery");
    return {
      root: setShadows(root),
      hitbox,
      colliders: [],
      kind: "discovery"
    };
  };

  const crystalNeedles = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "CrystalNeedles";
    const glow = material(THREE, {
      color: palette.accent,
      emissive: palette.accent,
      emissiveIntensity: 0.8,
      roughness: 0.26,
      metalness: 0.18
    });
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2 + variant * 0.31;
      const height = 0.34 + ((index + variant) % 3) * 0.18;
      const needle = new THREE.Mesh(
        new THREE.ConeGeometry(0.055 + (index % 2) * 0.018, height, 5),
        glow
      );
      needle.position.set(
        Math.cos(angle) * (0.15 + (index % 2) * 0.1),
        height / 2,
        Math.sin(angle) * (0.15 + (index % 2) * 0.1)
      );
      needle.rotation.z = Math.cos(angle) * 0.18;
      root.add(needle);
    }
    return {
      root: setShadows(root),
      colliders: [],
      kind: "needle"
    };
  };

  const groundFronds = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "GroundFronds";
    const frondMaterial = material(THREE, {
      color: variant % 2 ? 0x66cda7 : palette.accent,
      emissive: variant % 2 ? 0x103f35 : palette.accent,
      emissiveIntensity: 0.22,
      roughness: 0.78,
      side: THREE.DoubleSide
    });
    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * Math.PI * 2;
      const blade = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.035, 0.32 + (index % 3) * 0.09, 3, 6),
        frondMaterial
      );
      blade.position.set(
        Math.cos(angle) * 0.13,
        0.2 + (index % 3) * 0.04,
        Math.sin(angle) * 0.13
      );
      blade.rotation.z = Math.cos(angle) * 0.48;
      blade.rotation.x = Math.sin(angle) * 0.48;
      root.add(blade);
    }
    return {
      root: setShadows(root),
      colliders: [],
      kind: "frond"
    };
  };

  const sporeFan = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "SporeFan";
    const stem = material(THREE, {
      color: 0x315b4f,
      roughness: 0.86
    });
    const cap = material(THREE, {
      color: variant % 2 ? 0x91f0c8 : 0x82bfff,
      emissive: variant % 2 ? 0x2b886d : 0x254f8a,
      emissiveIntensity: 0.55,
      roughness: 0.54
    });
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2 + 0.4;
      const height = 0.36 + index * 0.1;
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.045, height, 6),
        stem
      );
      stalk.position.set(Math.cos(angle) * 0.16, height / 2, Math.sin(angle) * 0.16);
      root.add(stalk);
      const fan = new THREE.Mesh(
        new THREE.SphereGeometry(0.13 + index * 0.015, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        cap
      );
      fan.position.set(Math.cos(angle) * 0.16, height, Math.sin(angle) * 0.16);
      fan.scale.y = 0.42;
      root.add(fan);
    }
    return {
      root: setShadows(root),
      colliders: [],
      kind: "spore"
    };
  };

  const ruinDebris = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "RuinDebris";
    const stone = material(THREE, {
      color: variant % 2 ? 0x526c67 : 0x566577,
      roughness: 0.93,
      metalness: 0.08
    });
    const rune = new THREE.MeshBasicMaterial({
      color: palette.accent,
      transparent: true,
      opacity: 0.66
    });
    for (let index = 0; index < 4; index += 1) {
      const fragment = new THREE.Mesh(
        new THREE.BoxGeometry(
          0.34 + (index % 2) * 0.22,
          0.12 + (index % 3) * 0.07,
          0.28 + ((index + 1) % 2) * 0.18
        ),
        stone
      );
      fragment.position.set((index - 1.5) * 0.28, fragment.geometry.parameters.height / 2, (index % 2) * 0.22);
      fragment.rotation.set(0.05 * index, 0.48 * index, (index - 1.5) * 0.08);
      root.add(fragment);
    }
    const trace = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.025, 0.045),
      rune
    );
    trace.position.set(0.04, 0.22, 0.04);
    trace.rotation.set(0, 0.35, -0.08);
    root.add(trace);
    return {
      root: setShadows(root),
      colliders: [],
      kind: "debris"
    };
  };


  const magneticOre = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "MagneticOre";
    const ore = material(THREE, {
      color: variant % 2 ? 0x596d7a : 0x394b5a,
      emissive: palette.accent,
      emissiveIntensity: 0.28,
      roughness: 0.52,
      metalness: 0.62
    });
    for (let index = 0; index < 5; index += 1) {
      const shard = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28 + (index % 2) * 0.08, 0), ore
      );
      const angle = index * Math.PI * 0.4;
      shard.position.set(Math.cos(angle) * 0.34, 0.3 + (index % 3) * 0.18, Math.sin(angle) * 0.34);
      shard.rotation.set(index * 0.17, angle, index * 0.11);
      root.add(shard);
    }
    const hitbox = makeHitbox(THREE, root, 0.75, 1.35, "magnetic_ore");
    return { root: setShadows(root), hitbox, colliders: [{ offset: new THREE.Vector3(), radius: 0.55 }], kind: "magnetic_ore" };
  };

  const adaptivePlant = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "AdaptivePlant";
    const stemMaterial = material(THREE, { color: 0x3f8f72, roughness: 0.72 });
    const leafMaterial = material(THREE, {
      color: variant % 2 ? 0xc06adf : 0x70d9b2,
      emissive: variant % 2 ? 0x4b1f61 : 0x1d624d,
      emissiveIntensity: 0.5,
      roughness: 0.56,
      side: THREE.DoubleSide
    });
    for (let index = 0; index < 6; index += 1) {
      const angle = index * Math.PI / 3;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.055, 0.72, 6), stemMaterial);
      stem.position.set(Math.cos(angle) * 0.18, 0.36, Math.sin(angle) * 0.18);
      stem.rotation.z = Math.cos(angle) * 0.25;
      stem.rotation.x = Math.sin(angle) * 0.25;
      root.add(stem);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 7), leafMaterial);
      leaf.scale.set(1.5, 0.38, 0.75);
      leaf.position.set(Math.cos(angle) * 0.34, 0.68 + (index % 2) * 0.12, Math.sin(angle) * 0.34);
      leaf.rotation.y = -angle;
      root.add(leaf);
    }
    const hitbox = makeHitbox(THREE, root, 0.68, 1.25, "adaptive_plant");
    return { root: setShadows(root), hitbox, colliders: [], kind: "adaptive_plant" };
  };

  const technologicalRelic = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "TechnologicalRelic";
    const shell = material(THREE, { color: 0x4d5d6c, roughness: 0.42, metalness: 0.75 });
    const core = material(THREE, {
      color: palette.accent,
      emissive: palette.accent,
      emissiveIntensity: 1.35,
      roughness: 0.18,
      metalness: 0.35
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.64, 1.3, 8), shell);
    body.position.y = 0.65;
    body.rotation.y = variant * 0.28;
    root.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.08, 8, 24), core);
    ring.position.y = 0.82;
    ring.rotation.x = Math.PI / 2;
    root.add(ring);
    const beacon = new THREE.PointLight(palette.accent, 3.2, 5.5);
    beacon.position.y = 1.05;
    root.add(beacon);
    const hitbox = makeHitbox(THREE, root, 0.78, 1.6, "tech_relic");
    return { root: setShadows(root), hitbox, colliders: [{ offset: new THREE.Vector3(), radius: 0.58 }], kind: "tech_relic" };
  };


  const FUNCTIONAL_FIELDS = Object.freeze([
    "interaction",
    "knowledge",
    "observation",
    "resource",
    "research",
    "situation",
    "decision",
    "progression"
  ]);

  const DEFAULT_FUNCTIONAL = Object.freeze({
    interaction: null,
    knowledge: null,
    observation: null,
    resource: null,
    research: null,
    situation: null,
    decision: null,
    progression: null
  });

  const freezeFunctionalValue = (value) => {
    if (Array.isArray(value)) return Object.freeze(value.map(freezeFunctionalValue));
    if (value && typeof value === "object") {
      return Object.freeze(Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, freezeFunctionalValue(nested)])
      ));
    }
    return value ?? null;
  };

  const normalizeFunctional = (definition) => Object.freeze(
    Object.fromEntries(FUNCTIONAL_FIELDS.map((field) => [
      field,
      freezeFunctionalValue(definition[field] ?? DEFAULT_FUNCTIONAL[field])
    ]))
  );

  const RAW_OBJECT_LIBRARY = {
    crystal: Object.freeze({
      id: "RES-CRYS-M-001",
      type: "crystal",
      label: "Amas de cristaux",
      category: "resources",
      subtype: "crystal_cluster",
      size: "M",
      rarity: "common",
      status: "active",
      biomes: ["all"],
      placement: Object.freeze({
        edgeWeight: 0.25,
        centerWeight: 0.75,
        minSlope: 0,
        maxSlope: 35
      }),
      gameplay: Object.freeze({
        interactive: true,
        collectable: true,
        destructible: false,
        obstacle: true
      }),
      ai: Object.freeze({
        curiosity: 0.95,
        harvestPriority: 1,
        danger: 0
      }),
      interaction: { actions: ["inspect", "collect", "analyze"], defaultAction: "collect" },
      knowledge: { family: "mineral", discoverable: true, uniqueByVariant: true },
      observation: { events: ["OBJECT_SEEN", "OBJECT_INSPECTED", "OBJECT_ANALYZED"] },
      resource: { family: "crystal", exploitability: "extractable", inventoryKey: "crystal" },
      research: { domains: ["energy", "geology", "magnetism"] },
      progression: { mapExpertise: 1, discovery: 1 },
      build: crystalCluster
    }),

    fiber: Object.freeze({
      id: "RES-FIBR-S-001",
      type: "fiber",
      label: "Plante fibreuse",
      category: "resources",
      subtype: "fiber_plant",
      size: "S",
      rarity: "common",
      status: "active",
      biomes: ["forest", "jungle", "swamp"],
      placement: Object.freeze({
        edgeWeight: 0.4,
        centerWeight: 0.6,
        minSlope: 0,
        maxSlope: 30
      }),
      gameplay: Object.freeze({
        interactive: true,
        collectable: true,
        destructible: true,
        obstacle: false
      }),
      ai: Object.freeze({
        curiosity: 0.65,
        harvestPriority: 0.8,
        danger: 0
      }),
      interaction: { actions: ["inspect", "collect", "analyze"], defaultAction: "collect" },
      knowledge: { family: "flora", discoverable: true, uniqueByVariant: true },
      observation: { events: ["OBJECT_SEEN", "OBJECT_INSPECTED", "OBJECT_ANALYZED"] },
      resource: { family: "fiber", exploitability: "harvestable", inventoryKey: "fiber" },
      research: { domains: ["botany", "materials", "adaptation"] },
      progression: { mapExpertise: 1, discovery: 1 },
      build: fiberPlant
    }),


    magnetic_ore: Object.freeze({
      id: "RES-MAGN-M-001", type: "magnetic_ore", label: "Minerai magnétique",
      category: "resources", subtype: "magnetic_ore_cluster", size: "M", rarity: "uncommon",
      status: "active", biomes: ["mountain", "cave", "desert", "ruins"],
      placement: Object.freeze({ edgeWeight: 0.4, centerWeight: 0.6, minSlope: 0, maxSlope: 42 }),
      gameplay: Object.freeze({ interactive: true, collectable: true, inspectable: true, destructible: false, obstacle: true }),
      ai: Object.freeze({ curiosity: 0.9, harvestPriority: 0.88, danger: 0.05 }),
      interaction: { actions: ["inspect", "collect", "analyze"], defaultAction: "collect" },
      knowledge: { family: "mineral", discoverable: true, uniqueByVariant: true },
      observation: { events: ["OBJECT_SEEN", "OBJECT_INSPECTED", "OBJECT_ANALYZED"] },
      resource: { family: "ore", exploitability: "extractable", inventoryKey: "magnetic_ore" },
      research: { domains: ["geology", "magnetism", "materials"] },
      situation: { tags: ["mineral", "magnetic", "conductive"] },
      progression: { mapExpertise: 2, discovery: 1 },
      build: magneticOre
    }),

    adaptive_plant: Object.freeze({
      id: "BIO-ADAP-S-001", type: "adaptive_plant", label: "Plante adaptative",
      category: "resources", subtype: "adaptive_bioluminescent_plant", size: "S", rarity: "uncommon",
      status: "active", biomes: ["forest", "jungle", "swamp", "tundra", "coast"],
      placement: Object.freeze({ edgeWeight: 0.48, centerWeight: 0.52, minSlope: 0, maxSlope: 30 }),
      gameplay: Object.freeze({ interactive: true, collectable: true, inspectable: true, destructible: true, obstacle: false }),
      ai: Object.freeze({ curiosity: 0.92, harvestPriority: 0.66, danger: 0 }),
      interaction: {
        actions: ["inspect", "collect", "analyze"],
        defaultAction: "inspect",
        defaultManualAction: "inspect",
        requiresInspectionBeforeCollect: true,
        afterInspectionAction: "collect"
      },
      knowledge: { family: "flora", discoverable: true, uniqueByVariant: true },
      observation: { events: ["OBJECT_SEEN", "OBJECT_INSPECTED", "OBJECT_ANALYZED"] },
      resource: { family: "biomass", exploitability: "harvestable", inventoryKey: "adaptive_biomass" },
      research: { domains: ["botany", "adaptation", "bioluminescence"] },
      situation: { tags: ["plant", "adaptive", "bioluminescent"] },
      decision: { sustainableHarvestRecommended: true },
      progression: { mapExpertise: 2, discovery: 1, journal: true },
      build: adaptivePlant
    }),

    tech_relic: Object.freeze({
      id: "TEC-RELI-M-001", type: "tech_relic", label: "Vestige technologique",
      category: "technology", subtype: "ancient_technology_relic", size: "M", rarity: "rare",
      status: "active", biomes: ["ruins", "desert", "mountain", "cave"],
      placement: Object.freeze({ edgeWeight: 0.2, centerWeight: 0.8, minSlope: 0, maxSlope: 18 }),
      gameplay: Object.freeze({ interactive: true, collectable: false, inspectable: true, destructible: false, obstacle: true, discoverable: true }),
      ai: Object.freeze({ curiosity: 1, harvestPriority: 0, danger: 0.12 }),
      interaction: { actions: ["inspect", "analyze"], defaultAction: "inspect" },
      knowledge: { family: "technology", discoverable: true, uniqueByInstance: true },
      observation: { events: ["OBJECT_SEEN", "OBJECT_INSPECTED", "OBJECT_ANALYZED"] },
      research: { domains: ["engineering", "ancient-technology", "energy"] },
      situation: { tags: ["technology", "ruin", "component", "landmark"] },
      decision: { mayTriggerProject: true, extractionForbiddenUntilAnalyzed: true },
      progression: { mapExpertise: 4, discovery: 1, journal: true },
      build: technologicalRelic
    }),

    rock: Object.freeze({
      id: "NAT-ROCK-M-001",
      type: "rock",
      label: "Roche extraterrestre",
      category: "natural_decor",
      subtype: "alien_rock",
      size: "M",
      rarity: "common",
      status: "active",
      biomes: ["all"],
      placement: Object.freeze({
        edgeWeight: 0.55,
        centerWeight: 0.45,
        minSlope: 0,
        maxSlope: 50
      }),
      gameplay: Object.freeze({
        interactive: true,
        collectable: false,
        inspectable: true,
        destructible: false,
        obstacle: true
      }),
      ai: Object.freeze({
        curiosity: 0,
        harvestPriority: 0,
        danger: 0
      }),
      build: alienRock
    }),

    tree: Object.freeze({
      id: "NAT-TREE-L-001",
      type: "tree",
      label: "Arbre extraterrestre",
      category: "natural_decor",
      subtype: "alien_tree",
      size: "L",
      rarity: "common",
      status: "active",
      biomes: ["forest", "jungle"],
      placement: Object.freeze({
        edgeWeight: 0.35,
        centerWeight: 0.65,
        minSlope: 0,
        maxSlope: 28
      }),
      gameplay: Object.freeze({
        interactive: true,
        collectable: false,
        inspectable: true,
        destructible: false,
        obstacle: true,
        discoverable: true
      }),
      ai: Object.freeze({
        curiosity: 0.1,
        harvestPriority: 0,
        danger: 0
      }),
      build: alienTree
    }),

    stele: Object.freeze({
      id: "RUI-STEL-L-001",
      type: "stele",
      label: "Stèle ancienne",
      category: "ruins",
      subtype: "ancient_stele",
      size: "L",
      rarity: "rare",
      status: "active",
      biomes: ["ruins", "desert", "mountain"],
      placement: Object.freeze({
        edgeWeight: 0.15,
        centerWeight: 0.85,
        minSlope: 0,
        maxSlope: 20
      }),
      gameplay: Object.freeze({
        interactive: true,
        collectable: false,
        inspectable: true,
        destructible: false,
        obstacle: true
      }),
      ai: Object.freeze({
        curiosity: 1,
        harvestPriority: 0,
        danger: 0
      }),
      interaction: { actions: ["inspect", "analyze"], defaultAction: "inspect", defaultManualAction: "inspect" },
      knowledge: { family: "ancient-ruin", discoverable: true, uniqueByInstance: true },
      observation: { events: ["OBJECT_SEEN", "OBJECT_INSPECTED", "OBJECT_ANALYZED"] },
      research: { domains: ["archaeology", "xenolinguistics", "ancient-technology"] },
      situation: { tags: ["ruin", "landmark", "evidence"] },
      decision: { mayTriggerProject: true },
      progression: { mapExpertise: 3, discovery: 1, journal: true },
      build: ancientStele
    }),

    arch: Object.freeze({
      id: "RUI-ARCH-XL-001",
      type: "arch",
      label: "Arche traversable",
      category: "ruins",
      subtype: "traversable_arch",
      size: "XL",
      rarity: "rare",
      status: "active",
      biomes: ["ruins", "desert", "forest", "mountain"],
      placement: Object.freeze({
        edgeWeight: 0.25,
        centerWeight: 0.75,
        minSlope: 0,
        maxSlope: 12
      }),
      gameplay: Object.freeze({
        interactive: false,
        collectable: false,
        destructible: false,
        obstacle: true,
        traversable: true
      }),
      ai: Object.freeze({
        curiosity: 0.9,
        harvestPriority: 0,
        danger: 0
      }),
      build: traversableArch
    }),

    pool: Object.freeze({
      id: "NAT-POOL-L-001",
      type: "pool",
      label: "Bassin lumineux",
      category: "natural_decor",
      subtype: "luminous_pool",
      size: "L",
      rarity: "uncommon",
      status: "active",
      biomes: ["swamp", "forest", "cave", "coast"],
      placement: Object.freeze({
        edgeWeight: 0.2,
        centerWeight: 0.8,
        minSlope: 0,
        maxSlope: 6
      }),
      gameplay: Object.freeze({
        interactive: true,
        collectable: false,
        inspectable: true,
        destructible: false,
        obstacle: false,
        discoverable: true
      }),
      ai: Object.freeze({
        curiosity: 0.85,
        harvestPriority: 0,
        danger: 0.1
      }),
      interaction: { actions: ["inspect", "analyze"], defaultAction: "inspect", defaultManualAction: "inspect" },
      knowledge: { family: "phenomenon", discoverable: true, uniqueByInstance: true },
      observation: { events: ["OBJECT_SEEN", "PHENOMENON_OBSERVED", "OBJECT_ANALYZED"] },
      research: { domains: ["biology", "chemistry", "energy"] },
      situation: { tags: ["liquid", "bioluminescent", "environmental-phenomenon"] },
      progression: { mapExpertise: 2, discovery: 1, journal: true },
      build: luminousPool
    }),

    needle: Object.freeze({
      id: "NAT-NEDL-S-001",
      type: "needle",
      label: "Aiguilles cristallines",
      category: "natural_decor",
      subtype: "crystal_needles",
      size: "S",
      rarity: "common",
      status: "active",
      biomes: ["all"],
      placement: Object.freeze({
        edgeWeight: 0.45,
        centerWeight: 0.55,
        minSlope: 0,
        maxSlope: 40
      }),
      gameplay: Object.freeze({
        interactive: false,
        collectable: false,
        destructible: false,
        obstacle: false
      }),
      ai: Object.freeze({
        curiosity: 0.2,
        harvestPriority: 0,
        danger: 0
      }),
      build: crystalNeedles
    }),

    frond: Object.freeze({
      id: "NAT-FRND-S-001",
      type: "frond",
      label: "Frondes de sol",
      category: "natural_decor",
      subtype: "ground_fronds",
      size: "S",
      rarity: "common",
      status: "active",
      biomes: ["forest", "jungle", "swamp", "tundra"],
      placement: Object.freeze({
        edgeWeight: 0.5,
        centerWeight: 0.5,
        minSlope: 0,
        maxSlope: 32
      }),
      gameplay: Object.freeze({
        interactive: false,
        collectable: false,
        destructible: false,
        obstacle: false
      }),
      ai: Object.freeze({
        curiosity: 0.05,
        harvestPriority: 0,
        danger: 0
      }),
      build: groundFronds
    }),

    spore: Object.freeze({
      id: "NAT-SPOR-S-001",
      type: "spore",
      label: "Éventail à spores",
      category: "natural_decor",
      subtype: "spore_fan",
      size: "S",
      rarity: "uncommon",
      status: "active",
      biomes: ["forest", "jungle", "swamp", "cave"],
      placement: Object.freeze({
        edgeWeight: 0.55,
        centerWeight: 0.45,
        minSlope: 0,
        maxSlope: 28
      }),
      gameplay: Object.freeze({
        interactive: false,
        collectable: false,
        destructible: false,
        obstacle: false
      }),
      ai: Object.freeze({
        curiosity: 0.35,
        harvestPriority: 0,
        danger: 0
      }),
      build: sporeFan
    }),

    debris: Object.freeze({
      id: "RUI-DEBR-S-001",
      type: "debris",
      label: "Débris de ruines",
      category: "ruins",
      subtype: "ruin_debris",
      size: "S",
      rarity: "common",
      status: "active",
      biomes: ["ruins", "desert", "forest", "mountain"],
      placement: Object.freeze({
        edgeWeight: 0.65,
        centerWeight: 0.35,
        minSlope: 0,
        maxSlope: 36
      }),
      gameplay: Object.freeze({
        interactive: false,
        collectable: false,
        destructible: false,
        obstacle: false
      }),
      ai: Object.freeze({
        curiosity: 0.45,
        harvestPriority: 0,
        danger: 0
      }),
      build: ruinDebris
    })
  };


  const SIZE_RADIUS = Object.freeze({ XS: 0.25, S: 0.5, M: 0.9, L: 1.5, XL: 2.4 });
  const RARITY_WEIGHT = Object.freeze({ common: 1, uncommon: 0.55, rare: 0.22, epic: 0.08, legendary: 0.02 });

  const SPAWN_OVERRIDES = Object.freeze({
    magnetic_ore: { spawnCost: 4, maxPerZone: 4, minDistance: 2.5, tags: ["resource", "mineral", "magnetic", "technology"], lootTable: "magnetic_ore_basic", harvestTime: 5 },
    adaptive_plant: { spawnCost: 3, maxPerZone: 5, minDistance: 1.8, tags: ["resource", "plant", "adaptive", "bioluminescent"], lootTable: "adaptive_biomass", harvestTime: 3.8 },
    tech_relic: { spawnCost: 10, maxPerZone: 1, minDistance: 8, tags: ["technology", "ruin", "component", "landmark", "discovery"], discoverable: true },
    crystal: { spawnCost: 3, maxPerZone: 5, minDistance: 2.2, tags: ["resource", "mineral", "glowing"], lootTable: "crystal_basic", harvestTime: 4.5 },
    fiber: { spawnCost: 2, maxPerZone: 7, minDistance: 1.4, tags: ["resource", "plant", "fiber"], lootTable: "fiber_basic", harvestTime: 3 },
    rock: { spawnCost: 2, maxPerZone: 12, minDistance: 1.3, tags: ["decor", "mineral", "obstacle"] },
    tree: { spawnCost: 5, maxPerZone: 8, minDistance: 3.2, tags: ["decor", "plant", "obstacle", "landmark"] },
    stele: { spawnCost: 8, maxPerZone: 2, minDistance: 6, tags: ["ruin", "discovery", "landmark"], discoverable: true },
    arch: { spawnCost: 12, maxPerZone: 1, minDistance: 10, tags: ["ruin", "landmark", "traversable"], discoverable: true },
    pool: { spawnCost: 8, maxPerZone: 2, minDistance: 7, tags: ["decor", "liquid", "glowing", "discovery"], discoverable: true },
    needle: { spawnCost: 1, maxPerZone: 18, minDistance: 0.7, tags: ["decor", "mineral", "glowing"] },
    frond: { spawnCost: 1, maxPerZone: 22, minDistance: 0.55, tags: ["decor", "plant", "ground_cover"] },
    spore: { spawnCost: 1, maxPerZone: 14, minDistance: 0.8, tags: ["decor", "plant", "spore", "glowing"] },
    debris: { spawnCost: 1, maxPerZone: 16, minDistance: 0.75, tags: ["ruin", "decor", "ground_cover"] }
  });

  // Valeurs historiques utilisées par le générateur de cartes V16.24.
  // Elles restent distinctes des profils de spawn génériques : les modifier
  // changerait les espacements, les collisions et la disposition des maps.
  const MAP_PLACEMENT = Object.freeze({

    magnetic_ore: Object.freeze({
      id: "RES-MAGN-M-001", type: "magnetic_ore", label: "Minerai magnétique",
      category: "resources", subtype: "magnetic_ore_cluster", size: "M", rarity: "uncommon",
      status: "active", biomes: ["mountain", "cave", "desert", "ruins"],
      placement: Object.freeze({ edgeWeight: 0.4, centerWeight: 0.6, minSlope: 0, maxSlope: 42 }),
      gameplay: Object.freeze({ interactive: true, collectable: true, inspectable: true, destructible: false, obstacle: true }),
      ai: Object.freeze({ curiosity: 0.9, harvestPriority: 0.88, danger: 0.05 }),
      interaction: { actions: ["inspect", "collect", "analyze"], defaultAction: "collect" },
      knowledge: { family: "mineral", discoverable: true, uniqueByVariant: true },
      observation: { events: ["OBJECT_SEEN", "OBJECT_INSPECTED", "OBJECT_ANALYZED"] },
      resource: { family: "ore", exploitability: "extractable", inventoryKey: "magnetic_ore" },
      research: { domains: ["geology", "magnetism", "materials"] },
      situation: { tags: ["mineral", "magnetic", "conductive"] },
      progression: { mapExpertise: 2, discovery: 1 },
      build: magneticOre
    }),

    adaptive_plant: Object.freeze({
      id: "BIO-ADAP-S-001", type: "adaptive_plant", label: "Plante adaptative",
      category: "resources", subtype: "adaptive_bioluminescent_plant", size: "S", rarity: "uncommon",
      status: "active", biomes: ["forest", "jungle", "swamp", "tundra", "coast"],
      placement: Object.freeze({ edgeWeight: 0.48, centerWeight: 0.52, minSlope: 0, maxSlope: 30 }),
      gameplay: Object.freeze({ interactive: true, collectable: true, inspectable: true, destructible: true, obstacle: false }),
      ai: Object.freeze({ curiosity: 0.92, harvestPriority: 0.66, danger: 0 }),
      interaction: { actions: ["inspect", "collect", "analyze"], defaultAction: "inspect" },
      knowledge: { family: "flora", discoverable: true, uniqueByVariant: true },
      observation: { events: ["OBJECT_SEEN", "OBJECT_INSPECTED", "OBJECT_ANALYZED"] },
      resource: { family: "biomass", exploitability: "harvestable", inventoryKey: "adaptive_biomass" },
      research: { domains: ["botany", "adaptation", "bioluminescence"] },
      situation: { tags: ["plant", "adaptive", "bioluminescent"] },
      decision: { sustainableHarvestRecommended: true },
      progression: { mapExpertise: 2, discovery: 1, journal: true },
      build: adaptivePlant
    }),

    tech_relic: Object.freeze({
      id: "TEC-RELI-M-001", type: "tech_relic", label: "Vestige technologique",
      category: "technology", subtype: "ancient_technology_relic", size: "M", rarity: "rare",
      status: "active", biomes: ["ruins", "desert", "mountain", "cave"],
      placement: Object.freeze({ edgeWeight: 0.2, centerWeight: 0.8, minSlope: 0, maxSlope: 18 }),
      gameplay: Object.freeze({ interactive: true, collectable: false, inspectable: true, destructible: false, obstacle: true, discoverable: true }),
      ai: Object.freeze({ curiosity: 1, harvestPriority: 0, danger: 0.12 }),
      interaction: { actions: ["inspect", "analyze"], defaultAction: "inspect" },
      knowledge: { family: "technology", discoverable: true, uniqueByInstance: true },
      observation: { events: ["OBJECT_SEEN", "OBJECT_INSPECTED", "OBJECT_ANALYZED"] },
      research: { domains: ["engineering", "ancient-technology", "energy"] },
      situation: { tags: ["technology", "ruin", "component", "landmark"] },
      decision: { mayTriggerProject: true, extractionForbiddenUntilAnalyzed: true },
      progression: { mapExpertise: 4, discovery: 1, journal: true },
      build: technologicalRelic
    }),

    magnetic_ore: Object.freeze({ radius: 1.1, volume: "medium" }),
    adaptive_plant: Object.freeze({ radius: 0.8, volume: "small" }),
    tech_relic: Object.freeze({ radius: 1.15, volume: "medium" }),
    rock: Object.freeze({ radius: 1.15, volume: "medium" }),
    crystal: Object.freeze({ radius: 1.05, volume: "medium" }),
    fiber: Object.freeze({ radius: 0.82, volume: "small" }),
    needle: Object.freeze({ radius: 0.46, volume: "small" }),
    frond: Object.freeze({ radius: 0.42, volume: "small" }),
    spore: Object.freeze({ radius: 0.5, volume: "small" }),
    debris: Object.freeze({ radius: 0.72, volume: "small" }),
    tree: Object.freeze({ radius: 1.25, volume: "large" }),
    arch: Object.freeze({ radius: 2.2, volume: "large" }),
    stele: Object.freeze({ radius: 1.05, volume: "medium" }),
    pool: Object.freeze({ radius: 1.7, volume: "large" })
  });

  const freezeDefinition = (definition) => {
    const overrides = SPAWN_OVERRIDES[definition.type] || {};
    const radius = SIZE_RADIUS[definition.size] || SIZE_RADIUS.M;
    const spawn = Object.freeze({
      spawnCost: overrides.spawnCost ?? Math.max(1, Math.round(radius * 3)),
      rarityWeight: RARITY_WEIGHT[definition.rarity] ?? 1,
      minDistance: overrides.minDistance ?? radius * 2,
      maxPerZone: overrides.maxPerZone ?? 8,
      preferredNeighbors: Object.freeze([...(overrides.preferredNeighbors || [])]),
      avoidNeighbors: Object.freeze([...(overrides.avoidNeighbors || [])]),
      tags: Object.freeze([...(overrides.tags || [])])
    });
    const gameplay = Object.freeze({
      ...definition.gameplay,
      discoverable: overrides.discoverable ?? definition.gameplay.discoverable ?? false,
      harvestTime: overrides.harvestTime ?? null,
      lootTable: overrides.lootTable ?? null
    });
    const functional = normalizeFunctional(definition);
    return Object.freeze({
      ...definition,
      placement: Object.freeze({ ...definition.placement }),
      gameplay,
      ai: Object.freeze({ ...definition.ai }),
      spawn,
      ...functional
    });
  };

  const OBJECT_LIBRARY = Object.freeze(
    Object.fromEntries(Object.entries(RAW_OBJECT_LIBRARY).map(([type, definition]) => [type, freezeDefinition(definition)]))
  );

  const OBJECT_INDEX_BY_ID = Object.freeze(
    Object.values(OBJECT_LIBRARY).reduce((index, definition) => {
      index[definition.id] = definition;
      return index;
    }, {})
  );

  BF.ObjectLibrary = Object.freeze({
    schemaVersion: 3,
    functionalFields: FUNCTIONAL_FIELDS,
    data: OBJECT_LIBRARY,

    get(type) {
      return OBJECT_LIBRARY[type] || null;
    },

    getById(id) {
      return OBJECT_INDEX_BY_ID[id] || null;
    },

    exists(type) {
      return Object.prototype.hasOwnProperty.call(OBJECT_LIBRARY, type);
    },

    list(filters = {}) {
      const entries = Object.values(OBJECT_LIBRARY);
      return entries.filter((definition) => {
        if (filters.category && definition.category !== filters.category) return false;
        if (filters.size && definition.size !== filters.size) return false;
        if (filters.rarity && definition.rarity !== filters.rarity) return false;
        if (filters.status && definition.status !== filters.status) return false;
        if (filters.biome && !definition.biomes.includes("all") && !definition.biomes.includes(filters.biome)) return false;
        return true;
      });
    },

    getSpawnProfile(type) {
      return OBJECT_LIBRARY[type]?.spawn || null;
    },

    getMapPlacement(type) {
      return MAP_PLACEMENT[type] || Object.freeze({ radius: 0.7, volume: "small" });
    },

    listByTag(tag) {
      return Object.values(OBJECT_LIBRARY).filter((definition) => definition.spawn.tags.includes(tag));
    },

    validate() {
      const ids = new Set();
      const errors = [];
      Object.values(OBJECT_LIBRARY).forEach((definition) => {
        if (!definition.id || !definition.type || typeof definition.build !== "function") errors.push(`Définition invalide : ${definition.type || "inconnue"}`);
        if (ids.has(definition.id)) errors.push(`Identifiant dupliqué : ${definition.id}`);
        ids.add(definition.id);
      });
      return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
    },

    create(THREE, type, palette, variant = 0) {
      const definition = OBJECT_LIBRARY[type];
      if (!definition) throw new Error(`Type d'objet 3D inconnu : ${type}`);

      const instance = definition.build(THREE, palette, variant);
      instance.catalogId = definition.id;
      instance.definition = definition;

      if (instance.root) {
        instance.root.userData.objectType = definition.type;
        instance.root.userData.catalogId = definition.id;
        instance.root.userData.category = definition.category;
        instance.root.userData.subtype = definition.subtype;
        instance.root.userData.size = definition.size;
        instance.root.userData.rarity = definition.rarity;
        instance.root.userData.functional = definition;
        instance.root.userData.interaction = definition.interaction;
        instance.root.userData.knowledge = definition.knowledge;
        instance.root.userData.observation = definition.observation;
        instance.root.userData.resource = definition.resource;
        instance.root.userData.research = definition.research;
        instance.root.userData.situation = definition.situation;
        instance.root.userData.decision = definition.decision;
        instance.root.userData.progression = definition.progression;
      }

      return instance;
    }
  });
})(window);
