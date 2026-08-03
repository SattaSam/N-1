(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const original = BF.ObjectLibrary;
  if (!original?.data) {
    console.error("[BlueFox P2.1] ObjectLibrary doit être chargé avant ce correctif.");
    return;
  }

  const setShadows = (root) => {
    root.traverse((child) => {
      if (!child.isMesh || child.userData?.interactable) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return root;
  };

  const standard = (THREE, options = {}) => new THREE.MeshStandardMaterial({
    roughness: 0.82,
    metalness: 0.03,
    ...options
  });

  const hitbox = (THREE, root, radius, height, kind) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    mesh.position.y = height / 2;
    mesh.userData.interactable = true;
    mesh.userData.kind = kind;
    mesh.userData.active = true;
    mesh.userData.worldAnchor = root;
    root.add(mesh);
    return mesh;
  };

  const taperedLimb = (THREE, upperRadius, lowerRadius, length, material, radialSegments = 8) =>
    new THREE.Mesh(new THREE.CylinderGeometry(lowerRadius, upperRadius, length, radialSegments), material);

  const addJoint = (THREE, root, material, position, scale) => {
    const joint = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), material);
    joint.position.copy(position);
    joint.scale.set(...scale);
    root.add(joint);
    return joint;
  };

  const buildTranslucentNpc = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "NpcTranslucentP21";

    const membrane = new THREE.MeshPhysicalMaterial({
      color: variant % 2 ? 0xbff7ff : 0xa8e9ff,
      emissive: 0x195f82,
      emissiveIntensity: 0.48,
      transparent: true,
      opacity: 0.47,
      transmission: 0.38,
      thickness: 0.18,
      roughness: 0.28,
      metalness: 0.01,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const contour = standard(THREE, {
      color: 0x73dfff,
      emissive: 0x1688b8,
      emissiveIntensity: 1.2,
      roughness: 0.4
    });
    const coreMaterial = standard(THREE, {
      color: 0xd7fbff,
      emissive: 0x42cfff,
      emissiveIntensity: 1.65,
      roughness: 0.2
    });
    const eyeMaterial = standard(THREE, {
      color: 0x102e48,
      emissive: 0x73eaff,
      emissiveIntensity: 1.5,
      roughness: 0.15
    });

    const torsoShape = [
      [0.16, 0.0], [0.27, 0.18], [0.25, 0.46], [0.34, 0.75],
      [0.3, 1.04], [0.44, 1.31], [0.48, 1.55], [0.34, 1.79], [0.2, 1.98]
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoShape, 22), membrane);
    torso.name = "TranslucentTorsoFine";
    torso.position.y = 1.15;
    torso.scale.set(0.84, 1, 0.62);
    root.add(torso);

    const sternum = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 2), coreMaterial);
    sternum.name = "NpcCore";
    sternum.position.set(0.13, 2.34, 0);
    sternum.scale.set(0.62, 1.55, 0.52);
    root.add(sternum);

    const neck = taperedLimb(THREE, 0.14, 0.105, 0.48, membrane, 9);
    neck.position.y = 3.24;
    root.add(neck);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48, 3), membrane);
    head.name = "TranslucentHeadFine";
    head.position.set(0.06, 3.72, 0);
    head.scale.set(0.64, 1.04, 0.68);
    head.rotation.z = -0.05;
    root.add(head);

    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.58, 7), contour);
    crest.position.set(-0.06, 4.24, 0);
    crest.rotation.z = -0.18;
    root.add(crest);

    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 8), eyeMaterial);
      eye.name = "NpcEye";
      eye.userData.side = side;
      eye.position.set(0.34, 3.77, side * 0.18);
      eye.scale.set(0.65, 1.12, 0.55);
      root.add(eye);

      const shoulder = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 2), membrane);
      shoulder.name = "TranslucentShoulder";
      shoulder.userData.side = side;
      shoulder.position.set(0, 2.82, side * 0.48);
      shoulder.scale.set(1.15, 0.55, 0.66);
      root.add(shoulder);

      const upperArm = taperedLimb(THREE, 0.125, 0.075, 0.82, membrane, 9);
      upperArm.name = "TranslucentUpperArm";
      upperArm.userData.side = side;
      upperArm.position.set(0.02, 2.37, side * 0.59);
      upperArm.rotation.x = side * 0.12;
      upperArm.rotation.z = -0.04;
      root.add(upperArm);

      addJoint(THREE, root, contour, new THREE.Vector3(0.05, 1.93, side * 0.65), [0.68, 0.86, 0.64]);

      const forearm = taperedLimb(THREE, 0.09, 0.045, 0.88, membrane, 8);
      forearm.name = "TranslucentForearm";
      forearm.userData.side = side;
      forearm.position.set(0.12, 1.46, side * 0.69);
      forearm.rotation.x = side * 0.08;
      forearm.rotation.z = -0.09;
      root.add(forearm);

      const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), membrane);
      hand.position.set(0.2, 0.95, side * 0.72);
      hand.scale.set(0.55, 1.25, 0.67);
      root.add(hand);

      [-1, 0, 1].forEach((finger) => {
        const digit = taperedLimb(THREE, 0.021, 0.012, 0.3 + Math.abs(finger) * 0.035, contour, 5);
        digit.position.set(0.24 + finger * 0.03, 0.72, side * (0.72 + finger * 0.036));
        digit.rotation.z = finger * 0.09 - 0.04;
        root.add(digit);
      });

      const thigh = taperedLimb(THREE, 0.17, 0.105, 0.86, membrane, 10);
      thigh.position.set(-0.02, 0.77, side * 0.22);
      thigh.rotation.z = side * 0.025;
      root.add(thigh);

      addJoint(THREE, root, contour, new THREE.Vector3(0.04, 0.3, side * 0.22), [0.72, 0.95, 0.68]);

      const shin = taperedLimb(THREE, 0.105, 0.052, 0.82, membrane, 8);
      shin.position.set(0.08, -0.16, side * 0.22);
      shin.rotation.z = -0.04;
      root.add(shin);

      const foot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), membrane);
      foot.position.set(0.23, -0.61, side * 0.22);
      foot.scale.set(1.5, 0.34, 0.62);
      root.add(foot);

      const wingGeometry = new THREE.BufferGeometry();
      wingGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
        -0.05, 2.78, side * 0.42,
        -0.26, 2.22, side * 0.56,
        -0.02, 1.58, side * 0.62,
        -0.05, 2.78, side * 0.42,
        -0.02, 1.58, side * 0.62,
        0.16, 2.25, side * 0.5
      ], 3));
      wingGeometry.computeVertexNormals();
      const wing = new THREE.Mesh(wingGeometry, membrane);
      wing.name = "TranslucentMembrane";
      root.add(wing);
    });

    for (let index = 0; index < 9; index += 1) {
      const filament = taperedLimb(THREE, 0.016, 0.008, 0.46 + index * 0.045, contour, 5);
      filament.name = "TranslucentFilament";
      filament.userData.filamentIndex = index;
      filament.position.set(0.2, 1.48 + index * 0.18, Math.sin(index * 1.45) * 0.14);
      filament.rotation.z = 0.24 + index * 0.035;
      root.add(filament);
    }

    root.scale.setScalar(0.69);
    root.rotation.y = variant * 0.31;
    const interactive = hitbox(THREE, root, 0.5, 2.9, "npc_translucent");
    return {
      root: setShadows(root),
      hitbox: interactive,
      colliders: [{ offset: new THREE.Vector3(), radius: 0.32 }],
      kind: "npc_translucent"
    };
  };

  const buildRockyNpc = (THREE, palette, variant = 0) => {
    const root = new THREE.Group();
    root.name = "NpcRockyP21";
    const dark = standard(THREE, { color: 0x26292a, roughness: 0.98 });
    const stone = standard(THREE, {
      color: variant % 2 ? 0x776958 : 0x625d54,
      roughness: 1,
      metalness: 0
    });
    const lichen = standard(THREE, { color: 0x627b62, roughness: 1 });
    const glow = standard(THREE, {
      color: 0xffc56b,
      emissive: 0xb64d12,
      emissiveIntensity: 1.45,
      roughness: 0.25
    });

    const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 1), dark);
    torso.name = "RockyTorso";
    torso.position.y = 1.9;
    torso.scale.set(0.86, 1.22, 0.67);
    torso.rotation.set(0.02, variant * 0.1, -0.03);
    root.add(torso);

    const plates = [
      [0.02, 2.58, 0.05, 0.51, 1.22, 0.48, 0.08, 0.12],
      [-0.13, 2.16, 0.38, 0.43, 1.14, 0.42, -0.12, 0.52],
      [0.15, 1.83, -0.36, 0.4, 1.1, 0.4, 0.15, 0.96],
      [-0.02, 1.5, 0.15, 0.42, 1.18, 0.42, -0.08, 1.34]
    ];
    plates.forEach(([x, y, z, size, sx, sy, rz, ry], index) => {
      const plate = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), index === 2 ? lichen : stone);
      plate.name = "RockyPlate";
      plate.userData.plateIndex = index;
      plate.position.set(x, y, z);
      plate.scale.set(sx, sy, 0.5 + index * 0.025);
      plate.rotation.set(index * 0.08, ry, rz);
      root.add(plate);
    });

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.44, 1), stone);
    head.name = "RockyHead";
    head.position.set(0.02, 3.08, 0);
    head.scale.set(0.76, 1.02, 0.72);
    head.rotation.set(-0.04, 0.12, 0.02);
    root.add(head);

    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.062, 9, 6), glow);
      eye.name = "NpcEye";
      eye.userData.side = side;
      eye.position.set(0.33, 3.14, side * 0.17);
      root.add(eye);

      const upperArm = taperedLimb(THREE, 0.16, 0.105, 0.93, dark, 7);
      upperArm.name = "RockyUpperArm";
      upperArm.userData.side = side;
      upperArm.position.set(0, 2.03, side * 0.62);
      upperArm.rotation.x = side * 0.08;
      root.add(upperArm);
      const forearm = taperedLimb(THREE, 0.13, 0.09, 0.72, dark, 7);
      forearm.position.set(0.05, 1.25, side * 0.68);
      forearm.rotation.z = -0.08;
      root.add(forearm);

      const thigh = taperedLimb(THREE, 0.2, 0.14, 0.9, dark, 7);
      thigh.position.set(-0.02, 0.82, side * 0.27);
      root.add(thigh);
      const shin = taperedLimb(THREE, 0.17, 0.115, 0.75, dark, 7);
      shin.position.set(0.05, 0.07, side * 0.28);
      root.add(shin);

      [
        [2.45, 0.58, 0.23], [2.02, 0.69, 0.22], [1.45, 0.72, 0.2],
        [0.92, 0.29, 0.24], [0.35, 0.29, 0.22], [-0.18, 0.29, 0.2]
      ].forEach(([y, spread, size], index) => {
        const plate = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), index % 3 === 1 ? lichen : stone);
        plate.name = "RockyLimbPlate";
        plate.userData.side = side;
        plate.userData.plateIndex = index;
        plate.position.set(index % 2 ? 0.08 : -0.02, y, side * spread);
        plate.scale.set(1.08, 0.72, 0.55);
        plate.rotation.set(index * 0.13, index * 0.27, side * index * 0.07);
        root.add(plate);
      });

      const foot = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), stone);
      foot.position.set(0.19, -0.39, side * 0.28);
      foot.scale.set(1.45, 0.45, 0.7);
      root.add(foot);
    });

    for (let index = 0; index < 11; index += 1) {
      const chip = new THREE.Mesh(new THREE.TetrahedronGeometry(0.055 + (index % 3) * 0.018, 0), index % 4 === 0 ? lichen : stone);
      chip.name = "RockyFragment";
      chip.userData.fragmentIndex = index;
      const angle = index * 2.1;
      chip.position.set(Math.cos(angle) * 0.42, 1.25 + (index % 5) * 0.42, Math.sin(angle) * 0.34);
      chip.rotation.set(angle * 0.2, angle * 0.3, angle * 0.15);
      root.add(chip);
    }

    root.scale.setScalar(0.72);
    root.rotation.y = variant * 0.31;
    const interactive = hitbox(THREE, root, 0.58, 2.55, "npc_rocky");
    return {
      root: setShadows(root),
      hitbox: interactive,
      colliders: [{ offset: new THREE.Vector3(), radius: 0.42 }],
      kind: "npc_rocky"
    };
  };

  const replacements = Object.freeze({
    npc_translucent: buildTranslucentNpc,
    npc_rocky: buildRockyNpc
  });

  const data = Object.freeze(Object.fromEntries(
    Object.entries(original.data).map(([type, definition]) => {
      if (!replacements[type]) return [type, definition];
      return [type, Object.freeze({
        ...definition,
        build: replacements[type],
        production: Object.freeze({
          ...(definition.production || {}),
          pass: "P2.1",
          geometryRevision: 2,
          decision: "validated"
        })
      })];
    })
  ));

  const byId = Object.freeze(Object.values(data).reduce((index, definition) => {
    index[definition.id] = definition;
    return index;
  }, {}));

  const attachMetadata = (instance, definition) => {
    instance.catalogId = definition.id;
    instance.definition = definition;
    if (!instance.root) return instance;
    Object.assign(instance.root.userData, {
      objectType: definition.type,
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
      productionPass: replacements[definition.type] ? "P2.1" : undefined
    });
    return instance;
  };

  BF.ObjectLibrary = Object.freeze({
    schemaVersion: Math.max(5, Number(original.schemaVersion || 0)),
    functionalFields: original.functionalFields,
    data,
    get: (type) => data[type] || null,
    getById: (id) => byId[id] || null,
    exists: (type) => Object.prototype.hasOwnProperty.call(data, type),
    list(filters = {}) {
      return Object.values(data).filter((definition) => {
        if (filters.category && definition.category !== filters.category) return false;
        if (filters.size && definition.size !== filters.size) return false;
        if (filters.rarity && definition.rarity !== filters.rarity) return false;
        if (filters.status && definition.status !== filters.status) return false;
        if (filters.biome && !definition.biomes.includes("all") && !definition.biomes.includes(filters.biome)) return false;
        return true;
      });
    },
    getSpawnProfile: (type) => data[type]?.spawn || null,
    getMapPlacement: (type) => original.getMapPlacement(type),
    listByTag: (tag) => Object.values(data).filter((definition) => definition.spawn?.tags?.includes(tag)),
    validate() {
      const base = original.validate();
      const errors = [...(base.errors || [])];
      Object.keys(replacements).forEach((type) => {
        if (typeof data[type]?.build !== "function") errors.push(`Constructeur P2.1 absent : ${type}`);
      });
      return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
    },
    create(THREE, type, palette, variant = 0) {
      const definition = data[type];
      if (!definition) throw new Error(`Type d'objet 3D inconnu : ${type}`);
      if (!replacements[type]) return original.create(THREE, type, palette, variant);
      return attachMetadata(definition.build(THREE, palette, variant), definition);
    }
  });

  BF.ObjectLibraryP21 = Object.freeze({
    version: "P2.1-r3",
    replacedTypes: Object.freeze(Object.keys(replacements)),
    validate: () => BF.ObjectLibrary.validate()
  });

  console.info("[BlueFox P2.1] Modèles PNJ affinés actifs.", BF.ObjectLibraryP21.replacedTypes);
})(window);
