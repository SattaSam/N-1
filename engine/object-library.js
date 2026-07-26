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
    return {
      root: setShadows(root),
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
    return {
      root: setShadows(root),
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

  BF.ObjectLibrary = {
    create(THREE, type, palette, variant = 0) {
      const factories = {
        crystal: crystalCluster,
        fiber: fiberPlant,
        rock: alienRock,
        tree: alienTree,
        stele: ancientStele,
        arch: traversableArch,
        pool: luminousPool,
        needle: crystalNeedles,
        frond: groundFronds,
        spore: sporeFan,
        debris: ruinDebris
      };
      if (!factories[type]) throw new Error(`Type d'objet 3D inconnu : ${type}`);
      return factories[type](THREE, palette, variant);
    }
  };
})(window);
