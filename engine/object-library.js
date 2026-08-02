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
      new THREE.BoxGeometry(1.05, 2.65, 0.48),
      stoneMaterial
    );
    body.position.y = 1.32;
    body.rotation.y = variant * 0.16;
    root.add(body);
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(1.28, 0.22, 0.66),
      stoneMaterial
    );
    crown.position.y = 2.62;
    crown.rotation.y = body.rotation.y;
    root.add(crown);
    for (let index = 0; index < 3; index += 1) {
      const rune = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.055, 0.035),
        glowMaterial
      );
      rune.position.set(0, 0.76 + index * 0.52, 0.26);
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
    const hitbox = makeHitbox(THREE, root, 2.45, 4.25, "arch");
    return {
      root: setShadows(root),
      hitbox,
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
    const rimShape = new THREE.Shape();
    rimShape.moveTo(-1.75, 0);
    rimShape.bezierCurveTo(-1.45, -1.05, -0.2, -1.2, 0.45, -0.85);
    rimShape.bezierCurveTo(1.45, -0.95, 1.9, -0.25, 1.55, 0.5);
    rimShape.bezierCurveTo(1.25, 1.15, 0.25, 1.05, -0.35, 0.82);
    rimShape.bezierCurveTo(-1.2, 1.08, -1.85, 0.72, -1.75, 0);
    const waterShape = rimShape.clone();
    const rim = new THREE.Mesh(
      new THREE.ExtrudeGeometry(rimShape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.08, bevelSegments: 2 }),
      material(THREE, {
        color: 0x526e75,
        roughness: 0.85
      })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.08;
    root.add(rim);
    const water = new THREE.Mesh(
      new THREE.ShapeGeometry(waterShape, 40),
      new THREE.MeshBasicMaterial({
        color: palette.accent,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.scale.setScalar(0.82);
    water.position.y = 0.16;
    root.add(water);
    root.rotation.y = variant * 0.47;
    const hitbox = makeHitbox(THREE, root, 1.7, 0.42, "discovery");
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
    const shell = material(THREE, { color: 0xe3e7e9, roughness: 0.28, metalness: 0.88 });
    const core = material(THREE, {
      color: 0xb86cff,
      emissive: 0x7f24dd,
      emissiveIntensity: 1.35,
      roughness: 0.18,
      metalness: 0.35
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.25, 0.82), shell);
    body.position.y = 0.68;
    body.rotation.y = variant * 0.28;
    root.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.075, 8, 24), core);
    ring.position.y = 0.82;
    ring.rotation.x = Math.PI / 2;
    root.add(ring);
    for (let index = 0; index < 4; index += 1) {
      const node = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), core);
      node.position.set(index % 2 ? 0.34 : -0.34, 0.42 + Math.floor(index / 2) * 0.5, 0.44);
      root.add(node);
    }
    const beacon = new THREE.PointLight(0xa743ff, 3.2, 5.5);
    beacon.position.y = 1.05;
    root.add(beacon);
    const hitbox = makeHitbox(THREE, root, 0.78, 1.6, "tech_relic");
    return { root: setShadows(root), hitbox, colliders: [{ offset: new THREE.Vector3(), radius: 0.58 }], kind: "tech_relic" };
  };

  const productionObject = (THREE, palette, variant, type) => {
    const root = new THREE.Group();
    root.name = type.replace(/(^|_)([a-z])/g, (_, separator, letter) => letter.toUpperCase());
    const green = material(THREE, { color: 0x458f69, roughness: 0.72 });
    const luminousGreen = material(THREE, { color: 0x70f2a7, emissive: 0x1c7a55, emissiveIntensity: 0.85, roughness: 0.48 });
    const violet = material(THREE, { color: 0xb567ff, emissive: 0x6920b8, emissiveIntensity: 1.15, roughness: 0.3 });
    const stone = material(THREE, { color: 0x53606b, roughness: 0.92, metalness: 0.04 });
    const metal = material(THREE, { color: 0x9aa4aa, roughness: 0.38, metalness: 0.86 });
    const darkMetal = material(THREE, { color: 0x343d43, roughness: 0.48, metalness: 0.78 });
    const water = new THREE.MeshBasicMaterial({ color: 0x48ccec, transparent: true, opacity: 0.48, side: THREE.DoubleSide });
    let hitbox = null;
    let colliders = [];
    let kind = type;

    if (type === "strong_rock" || type === "large_rock") {
      const scale = type === "large_rock" ? 2.15 : 1.25;
      for (let index = 0; index < (type === "large_rock" ? 5 : 3); index += 1) {
        const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(scale * (0.62 + (index % 3) * 0.14), 0), stone);
        chunk.position.set((index - 2) * scale * 0.42, scale * (0.42 + (index % 2) * 0.18), ((index * 7) % 3 - 1) * scale * 0.32);
        chunk.scale.set(1.15, 0.9 + index * 0.05, 0.72);
        chunk.rotation.set(index * 0.17, index * 0.63 + variant, index * 0.11);
        root.add(chunk);
      }
      const radius = type === "large_rock" ? 2.35 : 1.25;
      hitbox = makeHitbox(THREE, root, radius, type === "large_rock" ? 3.6 : 2.1, type);
      colliders = [{ offset: new THREE.Vector3(), radius }];
    } else if (type === "crystalline_tree" || type === "luminescent_tree") {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.62, 4.4, 7), type === "crystalline_tree" ? metal : green);
      trunk.position.y = 2.2;
      root.add(trunk);
      for (let index = 0; index < 9; index += 1) {
        const angle = index * 2.399 + variant * 0.3;
        const crown = new THREE.Mesh(
          type === "crystalline_tree" ? new THREE.OctahedronGeometry(0.72 + (index % 3) * 0.18, 0) : new THREE.SphereGeometry(0.72 + (index % 3) * 0.14, 12, 9),
          type === "crystalline_tree" ? violet : luminousGreen
        );
        crown.position.set(Math.cos(angle) * (0.8 + index % 2), 3.4 + (index % 4) * 0.52, Math.sin(angle) * (0.8 + index % 2));
        crown.scale.y = type === "crystalline_tree" ? 1.35 : 0.72;
        root.add(crown);
      }
      hitbox = makeHitbox(THREE, root, 1.5, 5.6, type);
      colliders = [{ offset: new THREE.Vector3(), radius: 0.72 }];
    } else if (type === "fluorescent_vegetation") {
      for (let index = 0; index < 12; index += 1) {
        const angle = index * 2.399;
        const blade = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.7 + (index % 4) * 0.16, 4, 7), index % 3 ? luminousGreen : violet);
        blade.position.set(Math.cos(angle) * (0.25 + index * 0.035), 0.42 + (index % 4) * 0.08, Math.sin(angle) * (0.25 + index * 0.035));
        blade.rotation.z = Math.cos(angle) * 0.35;
        blade.rotation.x = Math.sin(angle) * 0.35;
        root.add(blade);
      }
      hitbox = makeHitbox(THREE, root, 0.72, 1.2, type);
    } else if (type === "tree_fallen") {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.25, 2.5, 7), material(THREE, { color: 0x70543a, roughness: 0.94 }));
      branch.rotation.z = Math.PI / 2;
      branch.position.y = 0.23;
      root.add(branch);
      for (let index = 0; index < 3; index += 1) {
        const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.09, 0.8, 6), branch.material);
        twig.position.set(-0.65 + index * 0.62, 0.42, index % 2 ? 0.16 : -0.12);
        twig.rotation.z = index % 2 ? -0.72 : 0.72;
        root.add(twig);
      }
      hitbox = makeHitbox(THREE, root, 1.25, 0.75, type);
      colliders = [{ offset: new THREE.Vector3(), radius: 1.05 }];
    } else if (type === "luminescent_tree") {
      // Couvert par le constructeur d'arbre partagé ci-dessus.
    } else if (type === "survival_bag") {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.86, 0.34), material(THREE, { color: 0x315a73, roughness: 0.84 }));
      bag.position.y = 0.45;
      bag.geometry.translate(0, 0, 0);
      root.add(bag);
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.28, 0.08), material(THREE, { color: 0x6dd6e9, roughness: 0.55 }));
      flap.position.set(0, 0.65, 0.21);
      root.add(flap);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 6, 18, Math.PI), darkMetal);
      strap.position.set(0, 0.7, -0.2);
      root.add(strap);
      hitbox = makeHitbox(THREE, root, 0.52, 1.1, type);
    } else if (type === "giant_mushroom") {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.62, 3, 10), material(THREE, { color: 0xcad9bd, roughness: 0.88 }));
      stem.position.y = 1.5;
      root.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1.55, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), violet);
      cap.scale.y = 0.65;
      cap.position.y = 3.05;
      root.add(cap);
      for (let index = 0; index < 7; index += 1) {
        const spot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), luminousGreen);
        const angle = index * 2.399;
        spot.position.set(Math.cos(angle) * (0.45 + index * 0.09), 3.65 - index * 0.045, Math.sin(angle) * (0.45 + index * 0.09));
        root.add(spot);
      }
      hitbox = makeHitbox(THREE, root, 1.65, 4.1, type);
      colliders = [{ offset: new THREE.Vector3(), radius: 0.68 }];
    } else if (type === "watercourse") {
      const shape = new THREE.Shape();
      shape.moveTo(-4.8, -1.2);
      shape.bezierCurveTo(-2.6, -1.8, -1.2, 0.5, 0.2, -0.4);
      shape.bezierCurveTo(1.8, -1.3, 3.1, 0.6, 4.8, -0.2);
      shape.lineTo(4.8, 1.15);
      shape.bezierCurveTo(2.7, 1.7, 1.5, 0.1, -0.1, 1.05);
      shape.bezierCurveTo(-1.8, 2, -3.3, -0.1, -4.8, 0.4);
      shape.closePath();
      const stream = new THREE.Mesh(new THREE.ShapeGeometry(shape), water);
      stream.rotation.x = -Math.PI / 2;
      stream.position.y = 0.04;
      root.add(stream);
      [-3.4, -1.2, 1.4, 3.5].forEach((x, index) => {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 + (index % 2) * 0.12, 0), stone);
        rock.position.set(x, 0.18, index % 2 ? 0.78 : -0.62);
        root.add(rock);
      });
      hitbox = makeHitbox(THREE, root, 4.8, 0.35, type);
    } else if (type === "rare_biological_resource") {
      const pod = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 2), violet);
      pod.position.y = 0.62;
      root.add(pod);
      for (let index = 0; index < 6; index += 1) {
        const tendril = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.07, 0.75, 6), luminousGreen);
        const angle = index * Math.PI / 3;
        tendril.position.set(Math.cos(angle) * 0.34, 0.28, Math.sin(angle) * 0.34);
        tendril.rotation.z = Math.cos(angle) * 0.48;
        tendril.rotation.x = Math.sin(angle) * 0.48;
        root.add(tendril);
      }
      hitbox = makeHitbox(THREE, root, 0.68, 1.25, type);
    } else if (type === "metallic_dune") {
      for (let index = 0; index < 7; index += 1) {
        const ridge = new THREE.Mesh(new THREE.ConeGeometry(1.4 + index * 0.18, 0.65 + (index % 3) * 0.25, 4), index % 2 ? metal : darkMetal);
        ridge.position.set((index - 3) * 1.05, ridge.geometry.parameters.height / 2, Math.sin(index * 1.7) * 1.25);
        ridge.scale.z = 1.7;
        ridge.rotation.y = Math.PI / 4 + variant * 0.13;
        root.add(ridge);
      }
      hitbox = makeHitbox(THREE, root, 4.6, 1.4, type);
      colliders = [{ offset: new THREE.Vector3(), radius: 4.2 }];
    } else if (type === "ancient_machine_wreck") {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.35, 1.8), darkMetal);
      hull.position.y = 0.72;
      hull.rotation.set(0.08, variant * 0.22, -0.12);
      root.add(hull);
      for (let index = 0; index < 3; index += 1) {
        const gear = new THREE.Mesh(new THREE.TorusGeometry(0.52 + index * 0.13, 0.13, 7, 12), metal);
        gear.position.set(-1.15 + index * 1.1, 0.85 + index * 0.18, 0.96);
        gear.rotation.y = 0.18 * index;
        root.add(gear);
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), violet);
        light.position.set(-1.1 + index * 1.1, 1.15, -0.96);
        root.add(light);
      }
      hitbox = makeHitbox(THREE, root, 2.1, 2.2, type);
      colliders = [{ offset: new THREE.Vector3(), radius: 1.8 }];
    } else if (type === "fog_bank") {
      const fogMaterial = new THREE.MeshBasicMaterial({ color: 0xb5d5d9, transparent: true, opacity: 0.16, depthWrite: false });
      for (let index = 0; index < 11; index += 1) {
        const cloud = new THREE.Mesh(new THREE.SphereGeometry(1.4 + (index % 3) * 0.6, 12, 8), fogMaterial);
        cloud.scale.set(1.8, 0.48, 1.05);
        cloud.position.set((index % 4 - 1.5) * 2.4, 0.55 + (index % 3) * 0.35, (Math.floor(index / 4) - 1) * 2.4);
        root.add(cloud);
      }
      hitbox = makeHitbox(THREE, root, 4.8, 2.6, type);
    } else if (type === "submerged_ruins") {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.34, 5.2), stone);
      floor.position.y = 0.17;
      root.add(floor);
      [[-2.5, 1.1], [2.3, 1.3], [-2.2, -1.5], [2.5, -1.4]].forEach(([x, z], index) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2 + (index % 2) * 0.7, 0.62), stone);
        pillar.position.set(x, pillar.geometry.parameters.height / 2, z);
        pillar.rotation.z = index * 0.06;
        root.add(pillar);
      });
      const flooded = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.8), water);
      flooded.rotation.x = -Math.PI / 2;
      flooded.position.y = 0.48;
      root.add(flooded);
      hitbox = makeHitbox(THREE, root, 4.1, 3.1, type);
      colliders = [{ offset: new THREE.Vector3(-2.5, 0, 1.1), radius: 0.45 }, { offset: new THREE.Vector3(2.3, 0, 1.3), radius: 0.45 }];
    } else if (type === "amphibian_species") {
      const skin = material(THREE, { color: variant % 2 ? 0x70cfa5 : 0x56a9b9, roughness: 0.68 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 10), skin);
      body.scale.set(1.25, 0.7, 0.9);
      body.position.y = 0.55;
      root.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 9), skin);
      head.position.set(0.68, 0.72, 0);
      root.add(head);
      [-1, 1].forEach((side) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), violet);
        eye.position.set(0.92, 0.92, side * 0.25);
        root.add(eye);
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.62, 4, 7), skin);
        leg.position.set(-0.25, 0.23, side * 0.62);
        leg.rotation.x = side * 0.8;
        root.add(leg);
      });
      hitbox = makeHitbox(THREE, root, 0.95, 1.4, type);
      colliders = [{ offset: new THREE.Vector3(), radius: 0.72 }];
    } else if (type === "bush") {
      for (let index = 0; index < 8; index += 1) {
        const angle = index * 2.399;
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 + (index % 3) * 0.13, 1), index % 4 ? green : luminousGreen);
        crown.position.set(Math.cos(angle) * 0.62, 0.55 + (index % 3) * 0.28, Math.sin(angle) * 0.62);
        root.add(crown);
      }
      hitbox = makeHitbox(THREE, root, 1.15, 1.65, type);
      colliders = [{ offset: new THREE.Vector3(), radius: 0.8 }];
    }

    root.rotation.y = variant * 0.31;
    return { root: setShadows(root), hitbox, colliders, kind };
  };

  const buildProduction = (type) => (THREE, palette, variant = 0) =>
    productionObject(THREE, palette, variant, type);

  const PRODUCTION_SPECS = Object.freeze([
    { id: "NAT-ROCK-M-002", type: "strong_rock", label: "Roche solide", category: "natural_decor", subtype: "solid_rock", size: "M", rarity: "common", biomes: ["all"], scenes: ["Éboulis", "Balisage naturel", "Abri minéral"], states: ["présente", "repérée", "observée", "cartographiée"], actions: ["observe", "inspect"], inspectable: true, obstacle: true, family: "geology", tags: ["decor", "mineral", "obstacle", "border-separator"], spawnCost: 2, maxPerZone: 12, minDistance: 1.3, maxSlope: 50, radius: 1.15, volume: "medium", note: "Formes saillantes et découpées, sans arrondis.", decision: "validated" },
    { id: "NAT-ROCK-XL-001", type: "large_rock", label: "Roche obstacle", category: "natural_decor", subtype: "alien_large_rock", size: "XL", rarity: "common", biomes: ["all"], scenes: ["Éboulis", "Séparateur de bordure"], states: ["présente", "repérée", "observée", "cartographiée"], actions: ["observe", "inspect"], inspectable: true, obstacle: true, family: "geology", tags: ["decor", "mineral", "obstacle", "border-separator"], spawnCost: 2, maxPerZone: 18, minDistance: 10, maxSlope: 12, radius: 2.2, volume: "large", note: "Grand séparateur rocheux anguleux.", decision: "validated" },
    { id: "DOC-NAT-TREE-L-002", type: "crystalline_tree", label: "Arbre cristallin", category: "natural_decor", subtype: "crystalline_alien_tree", size: "L", rarity: "rare", biomes: ["forest", "crystalline", "alien"], scenes: ["Forêt cristalline", "Bosquet résonant"], states: ["présent", "lumineux", "résonant", "inspecté", "analysé"], actions: ["observe", "inspect", "analyze"], defaultAction: "inspect", inspectable: true, obstacle: true, discoverable: true, family: "flora", research: ["botany", "crystallography", "energy"], tags: ["plant", "crystal", "glowing", "landmark"], spawnCost: 7, maxPerZone: 3, minDistance: 5, maxSlope: 24, radius: 1.5, volume: "large", curiosity: 0.9, danger: 0.05, decision: "validated" },
    { id: "DOC-BIO-FLUV-S-001", type: "fluorescent_vegetation", label: "Végétation fluorescente", category: "flora", subtype: "fluorescent_ground_vegetation", size: "S", rarity: "common", biomes: ["forest", "jungle", "swamp", "alien"], scenes: ["Sous-bois fluorescent", "Rive lumineuse"], states: ["dormante", "lumineuse", "inspectée", "récoltée", "repousse"], actions: ["observe", "inspect", "collect", "analyze"], defaultAction: "inspect", collectable: true, inspectable: true, respawn: 120, inventoryKey: "fluorescent_biomass", exploitability: "harvestable", family: "flora", resourceFamily: "biomass", research: ["botany", "bioluminescence", "energy"], tags: ["resource", "plant", "glowing", "ground_cover"], spawnCost: 1, maxPerZone: 12, minDistance: 0.8, maxSlope: 30, radius: 0.5, volume: "small", curiosity: 0.55, harvest: 0.35, decision: "validated" },
    { id: "DOC-RES-WOOD-M-001", type: "tree_fallen", label: "Branche", category: "resources", subtype: "fallen_alien_branch", size: "M", rarity: "common", biomes: ["forest", "jungle", "swamp", "plain", "alien"], scenes: ["Bois mort", "Camp de construction"], states: ["au sol", "repérée", "inspectée", "collectée", "transformée"], actions: ["observe", "inspect", "collect", "transform"], defaultAction: "collect", collectable: true, inspectable: true, obstacle: true, respawn: 210, inventoryKey: "wood", exploitability: "combustible/transformable", family: "flora", resourceFamily: "wood", research: ["botany", "materials", "engineering"], tags: ["resource", "wood", "construction", "obstacle"], spawnCost: 3, maxPerZone: 6, minDistance: 2.2, maxSlope: 24, radius: 1.2, volume: "medium", curiosity: 0.45, harvest: 0.72, missions: ["camp", "construction refuge", "fabrication de planches"], note: "5 cristaux + 1 branche permettent de produire du bois de construction.", decision: "validated" },
    { id: "DOC-NAT-TREE-L-001", type: "luminescent_tree", label: "Arbre luminescent", category: "natural_decor", subtype: "luminescent_alien_tree", size: "L", rarity: "uncommon", biomes: ["forest", "jungle", "swamp", "alien"], scenes: ["Clairière luminescente", "Forêt photoréactive"], states: ["présent", "lumineux", "inspecté", "analysé"], actions: ["observe", "inspect", "analyze"], defaultAction: "inspect", inspectable: true, obstacle: true, discoverable: true, family: "flora", research: ["botany", "biology", "bioluminescence"], tags: ["plant", "glowing", "landmark"], spawnCost: 6, maxPerZone: 5, minDistance: 4.2, maxSlope: 25, radius: 1.5, volume: "large", curiosity: 0.82, note: "Intégration autorisée par le CUO Production.", decision: "corrected" },
    { id: "DOC-EQP-BAG-S-001", type: "survival_bag", label: "Sac de survie", category: "equipment", subtype: "survival_inventory_bag", size: "S", rarity: "uncommon", biomes: ["starting-map", "crash-site", "base"], scenes: ["Épave initiale", "Camp de départ"], states: ["rangé", "repéré", "inspecté", "équipé", "endommagé", "réparé"], actions: ["observe", "inspect", "collect", "equip", "repair"], defaultAction: "collect", collectable: true, inspectable: true, respawn: 3600, inventoryKey: "survival_bag", exploitability: "equipable", family: "equipment", resourceFamily: "equipment", research: ["survival", "engineering"], tags: ["equipment", "inventory", "survival", "unique"], spawnCost: 8, maxPerZone: 1, minDistance: 8, maxSlope: 10, radius: 0.55, volume: "small", curiosity: 0.8, harvest: 1, missions: ["augmenter la capacité de collecte", "équipement de survie"], effects: { inventoryCapacityMultiplier: 2 }, note: "Double la capacité d’inventaire de BlueFox.", decision: "corrected" },
    { id: "DOC-NAT-MUSH-L-001", type: "giant_mushroom", label: "Champignon géant", category: "natural_decor", subtype: "giant_alien_fungus", size: "L", rarity: "uncommon", biomes: ["forest", "jungle", "swamp", "mushroom"], scenes: ["Colonie fongique", "Arche de sporophores"], states: ["dormant", "sporulant", "observé", "analysé", "récolté", "repousse"], actions: ["observe", "inspect", "analyze", "collect", "transform"], defaultAction: "inspect", collectable: true, inspectable: true, obstacle: true, respawn: 210, inventoryKey: "fungal_sample", exploitability: "harvestable", family: "flora", resourceFamily: "fungus", research: ["mycology", "biology", "food"], tags: ["resource", "fungus", "spore", "landmark"], spawnCost: 6, maxPerZone: 3, minDistance: 4.5, maxSlope: 22, radius: 1.65, volume: "large", curiosity: 0.75, harvest: 0.62, danger: 0.45, missions: ["étude fongique", "source d’alimentation riche"], effects: { baseTransformationRations: 10, energyRecovery: 1, fatigueDecayMultiplier: 0.75 }, decision: "corrected" },
    { id: "DOC-ENV-WATR-XL-001", type: "watercourse", label: "Cours d’eau", category: "environment", subtype: "alien_watercourse", size: "XL", rarity: "common", biomes: ["forest", "jungle", "swamp", "coast", "aquatic"], scenes: ["Rive vivante", "Gué", "Source"], states: ["calme", "rapide", "pollué", "lumineux", "analysé"], actions: ["observe", "inspect", "analyze", "drink", "cross"], defaultAction: "inspect", inspectable: true, obstacle: true, traversable: true, discoverable: true, family: "phenomenon", research: ["hydrology", "chemistry", "biology"], tags: ["environment", "liquid", "corridor", "phenomenon", "traversable"], spawnCost: 10, maxPerZone: 1, minDistance: 12, maxSlope: 8, radius: 4.8, volume: "large", curiosity: 0.6, danger: 0.08, missions: ["trouver de l’eau", "analyser un milieu", "franchir un obstacle"], effects: { contextualLines: ["Juste assez profond pour me rafraîchir les coussinets.", "Ce filet d’eau me rafraîchit les pattes."] }, decision: "corrected" },
    { id: "DOC-RES-BIOR-S-001", type: "rare_biological_resource", label: "Ressource biologique rare", category: "resources", subtype: "rare_biological_sample", size: "S", rarity: "rare", biomes: ["forest", "jungle", "swamp", "aquatic", "alien"], scenes: ["Niche biologique rare", "Organisme symbiotique"], states: ["présente", "identifiée", "analysée", "récoltée", "régénération"], actions: ["observe", "inspect", "analyze", "collect"], defaultAction: "inspect", collectable: true, inspectable: true, respawn: 180, inventoryKey: "rare_biomass", exploitability: "harvestable", family: "biology", resourceFamily: "biology", research: ["biology", "nutrition", "survival", "adaptation"], tags: ["resource", "biological", "rare", "discovery", "drone-collectable"], spawnCost: 1, maxPerZone: 2, minDistance: 6, maxSlope: 28, radius: 0.6, volume: "small", curiosity: 1, harvest: 0.72, danger: 0.05, missions: ["recherche avancée", "collecte rare", "projet biologique"], note: "Collecte future possible par drones.", decision: "corrected" },
    { id: "DOC-TER-DUNE-XL-001", type: "metallic_dune", label: "Dune métallique", category: "terrain_feature", subtype: "magnetic_metal_dune", size: "XL", rarity: "common", biomes: ["desert", "volcanic", "magnetic"], scenes: ["Mer de dunes métalliques", "Crête magnétique"], states: ["stable", "mouvante", "chargée", "cartographiée"], actions: ["observe", "inspect", "analyze", "traverse"], inspectable: true, obstacle: true, traversable: true, family: "geology", research: ["geology", "magnetism", "materials"], tags: ["terrain", "metal", "magnetic", "obstacle", "traversable"], spawnCost: 10, maxPerZone: 2, minDistance: 12, maxSlope: 18, radius: 4.6, volume: "large", curiosity: 0.4, danger: 0.15, missions: ["cartographie", "franchissement", "étude magnétique"], decision: "corrected" },
    { id: "DOC-RUI-MACH-L-001", type: "ancient_machine_wreck", label: "Carcasse d’ancienne machine", category: "ruins", subtype: "ancient_machine_wreck", size: "L", rarity: "uncommon", biomes: ["desert", "ruins", "crash-site", "magnetic", "electric"], scenes: ["Cimetière de machines", "Épave ensablée"], states: ["enfouie", "repérée", "inspectée", "analysée", "fouillée", "sécurisée"], actions: ["observe", "inspect", "analyze", "salvage"], defaultAction: "inspect", collectable: true, inspectable: true, obstacle: true, persistentResource: true, respawn: 43200, inventoryKey: "ancient_components", exploitability: "salvageable", family: "technology", resourceFamily: "technology", research: ["engineering", "archaeology", "materials"], tags: ["ruin", "technology", "component", "evidence", "landmark"], spawnCost: 6, maxPerZone: 2, minDistance: 8, maxSlope: 16, radius: 2.1, volume: "large", curiosity: 1, harvest: 0.75, danger: 0.18, missions: ["fouille technologique", "composants", "enquête civilisationnelle"], note: "Machine cubique, rouages et points violets clignotants.", decision: "corrected" },
    { id: "DOC-PHE-FOG-XL-001", type: "fog_bank", label: "Banc de brouillard", category: "phenomena", subtype: "dense_alien_fog", size: "XL", rarity: "common", biomes: ["swamp", "forest", "coast", "aquatic"], scenes: ["Nappe de brume", "Passage masqué"], states: ["léger", "dense", "toxique", "lumineux", "dissipé"], actions: ["observe", "analyze", "avoid", "traverse"], inspectable: true, traversable: true, family: "phenomenon", research: ["meteorology", "chemistry"], tags: ["weather", "fog", "visibility", "phenomenon", "danger", "traversable"], spawnCost: 4, maxPerZone: 1, minDistance: 12, maxSlope: 12, radius: 4.8, volume: "large", curiosity: 0.35, danger: 0.9, missions: ["navigation à visibilité réduite", "analyse atmosphérique"], effects: { traversalEnergyDelta: -0.1 }, note: "Traverser la brume réduit l’énergie de 10 %.", decision: "corrected" },
    { id: "DOC-RUI-SUBM-XL-001", type: "submerged_ruins", label: "Ruines immergées", category: "ruins", subtype: "submerged_ancient_ruins", size: "XL", rarity: "rare", biomes: ["swamp", "aquatic", "coast", "oceanic", "archipelago"], scenes: ["Sanctuaire immergé", "Cité noyée"], states: ["submergées", "repérées", "accessibles", "inspectées", "analysées", "cartographiées"], actions: ["observe", "inspect", "analyze", "explore"], defaultAction: "inspect", inspectable: true, obstacle: true, discoverable: true, family: "ancient-ruin", research: ["archaeology", "hydrology", "ancient-technology"], tags: ["ruin", "underwater", "landmark", "discovery", "rare"], spawnCost: 10, maxPerZone: 1, minDistance: 14, maxSlope: 8, radius: 4.1, volume: "large", curiosity: 0.75, missions: ["explorer des ruines", "cartographier", "enquête civilisationnelle"], note: "Réservé aux maps humides et océaniques, apparition rare.", decision: "corrected" },
    { id: "DOC-FAU-AMPH-M-001", type: "amphibian_species", label: "Espèce amphibie", category: "fauna", subtype: "alien_amphibian_species", size: "M", rarity: "uncommon", biomes: ["swamp", "aquatic", "coast"], scenes: ["Colonie amphibie", "Rive de reproduction"], states: ["immergée", "terrestre", "curieuse", "effrayée", "sociale", "hostile"], actions: ["observe", "track", "contact", "feed", "avoid"], inspectable: true, traversable: true, family: "fauna", research: ["zoology", "ecology", "adaptation", "behavior"], tags: ["fauna", "amphibian", "mobile", "living"], spawnCost: 4, maxPerZone: 5, minDistance: 3, maxSlope: 18, radius: 0.95, volume: "medium", curiosity: 0.65, danger: 0.2, missions: ["observer une espèce", "premier contact", "étude inter-biomes"], effects: { dangerDependsOnStanding: true }, note: "Validation visuelle obligatoire avant distribution dans les biomes.", decision: "corrected", visualValidationRequired: true },
    { id: "DOC-BIO-BUSH-M-001", type: "bush", label: "Buisson", category: "flora", subtype: "alien_bush", size: "M", rarity: "common", biomes: ["plain", "forest", "jungle", "swamp", "coast", "alien"], scenes: ["Lisière boisée", "Camp de construction"], states: ["présent", "identifié", "analysé", "récolté", "régénéré", "transformé"], actions: ["observe", "inspect", "analyze", "collect", "transform"], defaultAction: "collect", collectable: true, inspectable: true, traversable: true, respawn: 210, inventoryKey: "wood", exploitability: "combustible/transformable", family: "flora", resourceFamily: "wood", research: ["flora", "engineering"], tags: ["resource", "wood", "plant", "construction"], spawnCost: 4, maxPerZone: 4, minDistance: 0.75, maxSlope: 4, radius: 1.5, volume: "medium", curiosity: 0.25, harvest: 0.4, missions: ["feu de camp", "construction refuge", "fabrication de planches"], effects: { campRecipeBush: 5, refugeRecipe: { crystal: 6, bush: 2 } }, note: "5 buissons pour le feu/camp ; 6 cristaux + 2 buissons pour le refuge.", decision: "corrected" }
  ]);

  const PRODUCTION_OBJECT_LIBRARY = Object.freeze(Object.fromEntries(PRODUCTION_SPECS.map((spec) => [
    spec.type,
    Object.freeze({
      id: spec.id,
      type: spec.type,
      label: spec.label,
      category: spec.category,
      subtype: spec.subtype,
      size: spec.size,
      rarity: spec.rarity,
      status: "active",
      biomes: spec.biomes,
      microScenes: spec.scenes,
      states: spec.states,
      missionLinks: spec.missions || [],
      placement: Object.freeze({ edgeWeight: 0.5, centerWeight: 0.5, minSlope: 0, maxSlope: spec.maxSlope }),
      gameplay: Object.freeze({
        interactive: true,
        collectable: Boolean(spec.collectable),
        inspectable: Boolean(spec.inspectable),
        destructible: false,
        obstacle: Boolean(spec.obstacle),
        traversable: Boolean(spec.traversable),
        discoverable: Boolean(spec.discoverable)
      }),
      ai: Object.freeze({ curiosity: spec.curiosity || 0, harvestPriority: spec.harvest || 0, danger: spec.danger || 0 }),
      interaction: {
        actions: spec.actions,
        defaultAction: spec.defaultAction || spec.actions[0],
        acquisitionAction: spec.collectable ? (spec.actions.includes("salvage") ? "salvage" : "collect") : null,
        removeFromWorld: Boolean(spec.collectable) && !spec.persistentResource,
        respawnSeconds: spec.collectable ? spec.respawn : null,
        animation: spec.collectable ? {
          [spec.actions.includes("salvage") ? "salvage" : "collect"]:
            spec.size === "S"
              ? ["Harvers_Samall"]
              : ["giant_mushroom", "bush", "tree_fallen"].includes(spec.type)
                ? ["Harvers_Samall", "Harvest_Medium", "Harvers_Samall"]
                : ["Harvest_Heavy", "Harvest_Medium", "Harvest_Heavy"]
        } : null
      },
      knowledge: { family: spec.family, discoverable: true, uniqueByVariant: true },
      observation: { events: spec.inspectable ? ["OBJECT_SEEN", "OBJECT_INSPECTED", "OBJECT_ANALYZED"] : ["OBJECT_SEEN", "PHENOMENON_OBSERVED"] },
      resource: spec.collectable ? { family: spec.resourceFamily, exploitability: spec.exploitability, inventoryKey: spec.inventoryKey } : null,
      research: spec.research?.length ? { domains: spec.research } : null,
      situation: { tags: spec.tags },
      decision: spec.effects || null,
      progression: { mapExpertise: spec.rarity === "rare" ? 4 : 2, discovery: 1, journal: spec.rarity === "rare" },
      production: Object.freeze({ decision: spec.decision, note: spec.note || null, visualValidationRequired: Boolean(spec.visualValidationRequired) }),
      spawnProfile: Object.freeze({ spawnCost: spec.spawnCost, maxPerZone: spec.maxPerZone, minDistance: spec.minDistance }),
      mapPlacement: Object.freeze({ radius: spec.radius, volume: spec.volume }),
      build: buildProduction(spec.type)
    })
  ])));


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
      interaction: {
        actions: ["observe", "inspect", "collect", "analyze"],
        defaultAction: "collect",
        acquisitionAction: "collect",
        removeFromWorld: true,
        respawnSeconds: 75,
        animation: {
          collect: ["Harvest_Heavy", "Harvest_Medium"],
          observe: ["Ear_Right"],
          inspect: ["Ear_Right"],
          analyze: ["Ear_Right"]
        }
      },
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
      biomes: ["forest", "jungle", "swamp", "volcanic", "frozen", "ruins", "aquatic", "desert", "crystalline", "alien"],
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
      interaction: {
        actions: ["observe", "inspect", "collect", "analyze"],
        defaultAction: "collect",
        acquisitionAction: "collect",
        removeFromWorld: true,
        respawnSeconds: 45,
        animation: {
          collect: ["Harvers_Samall", "Harvest_Medium"],
          observe: ["Ear_Right"],
          inspect: ["Ear_Right"],
          analyze: ["Ear_Right"]
        }
      },
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
      status: "active", biomes: ["mountain", "cave", "desert", "ruins", "volcanic", "frozen", "crystalline", "alien"],
      placement: Object.freeze({ edgeWeight: 0.4, centerWeight: 0.6, minSlope: 0, maxSlope: 42 }),
      gameplay: Object.freeze({ interactive: true, collectable: true, inspectable: true, destructible: false, obstacle: true }),
      ai: Object.freeze({ curiosity: 0.9, harvestPriority: 0.88, danger: 0.05 }),
      interaction: {
        actions: ["observe", "inspect", "extract", "analyze"],
        defaultAction: "extract",
        acquisitionAction: "extract",
        removeFromWorld: true,
        respawnSeconds: 75,
        animation: { extract: ["Harvest_Heavy", "Harvest_Medium"] }
      },
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
        afterInspectionAction: "collect",
        acquisitionAction: "collect",
        removeFromWorld: true,
        respawnSeconds: 45,
        animation: {
          collect: ["Harvers_Samall", "Harvest_Medium"],
          inspect: ["Ear_Right"],
          analyze: ["Ear_Right"]
        }
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
      interaction: {
        actions: ["observe", "inspect", "analyze"],
        defaultAction: "inspect",
        removeFromWorld: false,
        animation: {
          observe: ["Ear_Right"],
          inspect: ["Ear_Right"],
          analyze: ["Ear_Right"]
        }
      },
      knowledge: { family: "technology", discoverable: true, uniqueByInstance: true },
      observation: { events: ["OBJECT_SEEN", "OBJECT_INSPECTED", "OBJECT_ANALYZED"] },
      research: { domains: ["engineering", "ancient-technology", "energy"] },
      situation: { tags: ["technology", "ruin", "component", "landmark"] },
      decision: { mayTriggerProject: true, extractionForbiddenUntilAnalyzed: true },
      progression: { mapExpertise: 4, discovery: 1, journal: true },
      production: { decision: "validated", note: "Design technologique blanc métallisé avec lueur violette." },
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
        inspectable: false,
        destructible: false,
        obstacle: true
      }),
      ai: Object.freeze({
        curiosity: 0,
        harvestPriority: 0,
        danger: 0
      }),
      interaction: {
        actions: ["observe"],
        defaultAction: "observe",
        removeFromWorld: false,
        animation: { observe: ["Ear_Right"] }
      },
      knowledge: { family: "geology", discoverable: true, uniqueByVariant: true },
      observation: { events: ["OBJECT_SEEN", "PHENOMENON_OBSERVED"] },
      progression: { mapExpertise: 1, discovery: 1 },
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
        inspectable: false,
        destructible: false,
        obstacle: true,
        discoverable: true
      }),
      ai: Object.freeze({
        curiosity: 0.1,
        harvestPriority: 0,
        danger: 0
      }),
      interaction: {
        actions: ["observe"],
        defaultAction: "observe",
        removeFromWorld: false,
        animation: { observe: ["Ear_Right"] }
      },
      knowledge: { family: "flora", discoverable: true, uniqueByVariant: true },
      observation: { events: ["OBJECT_SEEN", "PHENOMENON_OBSERVED"] },
      situation: { tags: ["plant", "landmark"] },
      progression: { mapExpertise: 1, discovery: 1 },
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
      interaction: {
        actions: ["observe", "inspect", "analyze"],
        defaultAction: "inspect",
        defaultManualAction: "inspect",
        removeFromWorld: false,
        animation: {
          observe: ["Ear_Right"],
          inspect: ["Ear_Right"],
          analyze: ["Ear_Right"]
        }
      },
      knowledge: { family: "ancient-ruin", discoverable: true, uniqueByInstance: true },
      observation: { events: ["OBJECT_SEEN", "OBJECT_INSPECTED", "OBJECT_ANALYZED"] },
      research: { domains: ["archaeology", "xenolinguistics", "ancient-technology"] },
      situation: { tags: ["ruin", "landmark", "evidence"] },
      decision: { mayTriggerProject: true },
      progression: { mapExpertise: 3, discovery: 1, journal: true },
      production: { decision: "corrected", note: "Silhouette rectangulaire plutôt que cylindrique." },
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
        interactive: true,
        collectable: false,
        inspectable: true,
        destructible: false,
        obstacle: true,
        traversable: true
      }),
      ai: Object.freeze({
        curiosity: 0.9,
        harvestPriority: 0,
        danger: 0
      }),
      interaction: {
        actions: ["observe", "inspect", "traverse"],
        defaultAction: "inspect",
        removeFromWorld: false,
        contextualLines: ["Une trace de civilisation."],
        animation: { observe: ["Ear_Right"], inspect: ["Ear_Right"] }
      },
      knowledge: { family: "ancient-ruin", discoverable: true, uniqueByInstance: true },
      observation: { events: ["OBJECT_SEEN", "OBJECT_INSPECTED"] },
      research: { domains: ["archaeology", "geology", "ancient-technology"] },
      situation: { tags: ["ruin", "landmark", "traversable", "evidence"] },
      progression: { mapExpertise: 3, discovery: 1, journal: true },
      production: { decision: "corrected", note: "Inspectable ; annonce : Une trace de civilisation." },
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
      interaction: {
        actions: ["observe", "inspect", "analyze"],
        defaultAction: "inspect",
        defaultManualAction: "inspect",
        removeFromWorld: false,
        animation: { observe: ["Ear_Right"] }
      },
      knowledge: { family: "phenomenon", discoverable: true, uniqueByInstance: true },
      observation: { events: ["OBJECT_SEEN", "PHENOMENON_OBSERVED"] },
      research: { domains: ["biology", "chemistry", "energy", "engineering"] },
      situation: { tags: ["liquid", "bioluminescent", "environmental-phenomenon"] },
      progression: { mapExpertise: 2, discovery: 1, journal: true },
      production: { decision: "corrected", note: "Forme organique en haricot, rotations de placement variées." },
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
      biomes: ["forest", "jungle", "swamp", "tundra", "frozen", "ruins", "aquatic", "desert", "crystalline", "alien"],
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
      biomes: ["forest", "jungle", "swamp", "cave", "volcanic", "frozen", "ruins", "aquatic", "alien"],
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
      biomes: ["ruins", "desert", "forest", "mountain", "volcanic", "crystalline", "alien"],
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
    }),

    ...PRODUCTION_OBJECT_LIBRARY
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
    const overrides = { ...(definition.spawnProfile || {}), ...(SPAWN_OVERRIDES[definition.type] || {}) };
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
    const interaction = definition.interaction
      ? { ...definition.interaction }
      : null;
    const functional = normalizeFunctional({ ...definition, interaction });
    return Object.freeze({
      ...definition,
      biomes: Object.freeze([...(definition.biomes || [])]),
      microScenes: Object.freeze([...(definition.microScenes || [])]),
      states: Object.freeze([...(definition.states || [])]),
      missionLinks: Object.freeze([...(definition.missionLinks || [])]),
      production: freezeFunctionalValue(definition.production),
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
    schemaVersion: 4,
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
      return OBJECT_LIBRARY[type]?.mapPlacement || MAP_PLACEMENT[type] || Object.freeze({ radius: 0.7, volume: "small" });
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
        if (
          definition.gameplay.collectable === true &&
          (!Number.isFinite(definition.interaction?.respawnSeconds) ||
            definition.interaction.respawnSeconds < 30)
        ) {
          errors.push(
            `Délai CUO interaction.respawnSeconds invalide : ${definition.type}`
          );
        }
        ids.add(definition.id);
      });
      return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
    },

    create(THREE, type, palette, variant = 0) {
      const definition = OBJECT_LIBRARY[type];
      if (!definition) throw new Error(`Type d'objet 3D inconnu : ${type}`);

      const instance = definition.build(THREE, palette, variant);
      if (
        definition.gameplay.interactive === true &&
        !instance.hitbox &&
        instance.root
      ) {
        const radius = Math.max(0.35, (SIZE_RADIUS[definition.size] || SIZE_RADIUS.M) * 0.8);
        const height = Math.max(0.7, (SIZE_RADIUS[definition.size] || SIZE_RADIUS.M) * 1.8);
        instance.hitbox = makeHitbox(
          THREE,
          instance.root,
          radius,
          height,
          definition.type
        );
      }
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
