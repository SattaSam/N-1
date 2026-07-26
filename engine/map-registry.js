(function (global) {
  "use strict";

  const BF = global.BlueFox3D;

  BF.maps = {
    crystal: {
      id: "crystal",
      number: 1,
      name: "Plaine des Cristaux",
      zones: ["Abri et épave"],
      terrainAsset: "terrainCrystal",
      sceneAsset: "sceneCrystal",
      entry: { x: 0, z: 20 },
      exits: {
        north: { x: 0, z: -26, targetMap: "jungle", targetEntry: "south" }
      },
      seed: 9173,
      profile: "crystalline",
      palette: { ground: 0x657f98, accent: 0x64e6ff }
    },
    jungle: {
      id: "jungle",
      number: 2,
      name: "Ruines d’Émeraude",
      zones: ["Clairière des stèles", "Ruines noyées"],
      terrainAsset: "terrainJungle",
      sceneAsset: "sceneJungle",
      entry: { x: 0, z: -20 },
      exits: {
        south: { x: 0, z: 26, targetMap: "crystal", targetEntry: "north" }
      },
      seed: 24023,
      profile: "ruins",
      palette: { ground: 0x315f50, accent: 0x63ffc2 }
    }
  };

  const inferBiomeProfile = (name = "") => {
    const value = name.toLocaleLowerCase("fr")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/volcan|lave|magma/.test(value)) return "volcanic";
    if (/neige|glace|glacia|toundra|banquise|boreal/.test(value)) return "frozen";
    if (/ruine|cite|ville|megalo|temple|civilisation/.test(value)) return "ruins";
    if (/foret|jungle|flore|veget|savane|prairie|lande|herbe|fongique/.test(value)) return "forest";
    if (/ocean|marin|corail|recif|sous.?marin|archipel|cote|plage|marais|aquatique/.test(value)) return "aquatic";
    if (/desert|aride|dune|rocheuse/.test(value)) return "desert";
    if (/cristal|mineral|verre/.test(value)) return "crystalline";
    return "alien";
  };

  const normalizedBiomeName = (name = "") =>
    name.toLocaleLowerCase("fr")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const traitRules = [
    ["bioluminescent", "bioluminescence", /biolum|lumines|opaline/],
    ["fungal", "flore fongique", /fong|champignon|spore/],
    ["amber", "ambre", /ambre/],
    ["wetland", "milieu humide", /marais|aquatique|sous.?marin|recif/],
    ["glass", "formations vitrifiées", /verre|vitrif/],
    ["magnetic", "activité magnétique", /magnet|levitation/],
    ["oasis", "oasis", /oasis/],
    ["lava", "activité volcanique", /volcan|lave|magma/],
    ["ice", "glace", /glace|banquise|neige|toundra/],
    ["tropical", "climat tropical", /tropical|plage|archipel/],
    ["urban", "vestiges urbains", /megalo|ville|cite/],
    ["floating", "reliefs flottants", /flott|aerien|cascade/],
    ["mystery", "anomalie inconnue", /curiosity|mystere|anomal/]
  ];

  const inferBiomeTraits = (name = "") => {
    const value = normalizedBiomeName(name);
    return traitRules
      .filter(([, , pattern]) => pattern.test(value))
      .map(([id, label]) => ({ id, label }));
  };

  const biomeDescription = (name, profile, traits) => {
    const profileDescriptions = {
      volcanic: "Milieu minéral instable marqué par la chaleur et les coulées énergétiques.",
      frozen: "Étendue froide où la glace structure les passages et les abris naturels.",
      forest: "Écosystème végétal dense, riche en fibres et en formes vivantes.",
      ruins: "Territoire mêlant structures anciennes, débris et végétation de reconquête.",
      aquatic: "Milieu humide ou marin dominé par les bassins et la flore souple.",
      desert: "Espace aride aux ressources dispersées et aux formations rocheuses exposées.",
      crystalline: "Paysage minéral où les formations cristallines concentrent l’énergie.",
      alien: "Biome extraterrestre atypique dont les règles restent à documenter."
    };
    const clues = traits.map((trait) => trait.label);
    return `${name} — ${profileDescriptions[profile]}${
      clues.length ? ` Indices détectés : ${clues.join(", ")}.` : ""
    }`;
  };

  const biomeResources = (profile, traits) => {
    const base = {
      volcanic: "cristaux thermiques, roche dense et composants minéraux",
      frozen: "cristaux froids, fibres résistantes et glace structurée",
      forest: "fibres végétales, spores et cristaux diffus",
      ruins: "débris anciens, composants et ressources de reconquête",
      aquatic: "fibres aquatiques, spores lumineuses et minéraux immergés",
      desert: "cristaux exposés, roche sèche et fibres rares",
      crystalline: "cristaux énergétiques, aiguilles minérales et fibres",
      alien: "cristaux, fibres et matériaux encore non classés"
    };
    const additions = [];
    const ids = new Set(traits.map((trait) => trait.id));
    if (ids.has("magnetic")) additions.push("matériaux magnétisés");
    if (ids.has("fungal")) additions.push("spores fongiques");
    if (ids.has("urban")) additions.push("composants technologiques");
    if (ids.has("oasis")) additions.push("ressources hydriques");
    return `${base[profile]}${additions.length ? `, ${additions.join(", ")}` : ""}`;
  };

  BF.registerCatalogMaps = function registerCatalogMaps() {
    const catalog = global.BLUEFOX_MAP_ASSETS?.catalog;
    if (!catalog?.maps?.length) return [];
    const knownNumbers = new Set(
      Object.values(BF.maps).map((map) => map.number).filter(Number.isFinite)
    );
    const palettes = {
      volcanic: { ground: 0x4c2928, accent: 0xff7247 },
      frozen: { ground: 0x718b9d, accent: 0xbcefff },
      forest: { ground: 0x47644f, accent: 0x79f0b2 },
      ruins: { ground: 0x4c5e58, accent: 0x72e5bd },
      aquatic: { ground: 0x386476, accent: 0x63dcff },
      desert: { ground: 0x806451, accent: 0xffbd75 },
      crystalline: { ground: 0x586b82, accent: 0x75e8ff },
      alien: { ground: 0x5b526f, accent: 0xc795ff }
    };
    const registered = [];
    catalog.maps.forEach((catalogMap) => {
      const terrainUrls = catalogMap.terrains
        .slice(0, 6)
        .map((terrain) => terrain.url);
      const profile = inferBiomeProfile(catalogMap.name);
      const traits = inferBiomeTraits(catalogMap.name);
      const description = biomeDescription(catalogMap.name, profile, traits);
      const resourceHints = biomeResources(profile, traits);
      const existingMap = Object.values(BF.maps).find(
        (map) => map.number === catalogMap.number
      );
      if (existingMap) {
        existingMap.name = catalogMap.name || existingMap.name;
        existingMap.sceneUrl = catalogMap.scene.url;
        existingMap.sceneVariants = catalogMap.sceneVariants;
        existingMap.terrainUrls = terrainUrls;
        existingMap.terrainUrl =
          terrainUrls[0] || catalogMap.scene.url;
        existingMap.zones = terrainUrls.length
          ? terrainUrls.map((unused, index) => `Zone ${index + 1}`)
          : ["Zone principale"];
        existingMap.profile = profile;
        existingMap.traits = traits;
        existingMap.description = description;
        existingMap.resourceHints = resourceHints;
        existingMap.synthesis =
          `Je relève d’abord les signes de ${traits[0]?.label || "vie et d’énergie"} avant d’élargir mon exploration.`;
        existingMap.palette = palettes[profile];
        registered.push(existingMap.id);
        return;
      }
      if (knownNumbers.has(catalogMap.number) || BF.maps[catalogMap.id]) return;
      BF.maps[catalogMap.id] = {
        id: catalogMap.id,
        number: catalogMap.number,
        name: catalogMap.name || `Biome ${catalogMap.number}`,
        zones: terrainUrls.length
          ? terrainUrls.map((unused, index) => `Zone ${index + 1}`)
          : ["Zone principale"],
        terrainUrls,
        terrainUrl: terrainUrls[0] || catalogMap.scene.url,
        sceneUrl: catalogMap.scene.url,
        entry: { x: 0, z: 20 },
        exits: {},
        seed: catalogMap.number * 7919 + 137,
        profile,
        traits,
        description,
        resourceHints,
        synthesis:
          `Je veux comparer les zones et comprendre ${traits[0]?.label || "l’équilibre de ce milieu"} sans perturber le biome.`,
        palette: palettes[profile]
      };
      registered.push(catalogMap.id);
    });
    return registered;
  };

  BF.registerCatalogMaps();

  class Random {
    constructor(seed) {
      this.seed = seed >>> 0;
    }

    next() {
      this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
      return this.seed / 4294967296;
    }
  }

  const segmentDistanceSquared = (start, end, x, z) => {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared > 0
      ? BF.clamp(((x - start.x) * dx + (z - start.z) * dz) / lengthSquared, 0, 1)
      : 0;
    const offsetX = x - (start.x + dx * t);
    const offsetZ = z - (start.z + dz * t);
    return offsetX * offsetX + offsetZ * offsetZ;
  };

  const zoneLayout = (count) => {
    const layouts = {
      1: [[0, 0]],
      2: [[0, 13], [0, -13]],
      3: [[-13, 10], [13, 10], [0, -12]],
      4: [[-13, 13], [13, 13], [-13, -13], [13, -13]],
      5: [[-14, 14], [14, 14], [0, 0], [-14, -14], [14, -14]],
      6: [[-16, 15], [0, 15], [16, 15], [-16, -15], [0, -15], [16, -15]]
    };
    return layouts[BF.clamp(count, 1, 6)] || layouts[1];
  };

  BF.buildMap = function buildMap(THREE, definition, assets, renderer) {
    const group = new THREE.Group();
    group.name = `Map:${definition.id}`;
    const loader = new THREE.TextureLoader();
    const reportMissingTexture = (source, role) => {
        global.dispatchEvent?.(new CustomEvent("bluefox:image-missing", {
          detail: {
            source,
            role,
            mapId: definition.id,
            mapName: definition.name
          }
        }));
      };
    const loadTexture = (source, role) => {
      const candidates =
        global.BLUEFOX_MAP_ASSETS?.imageUrlCandidates?.(source) || [source];
      let targetTexture;
      const attempt = (index) => {
        const candidate = candidates[index];
        const loadedTexture = loader.load(
          candidate,
          (texture) => {
            if (targetTexture && texture !== targetTexture) {
              targetTexture.image = texture.image;
              targetTexture.needsUpdate = true;
            }
          },
          undefined,
          () => {
            if (index + 1 < candidates.length) {
              attempt(index + 1);
            } else {
              reportMissingTexture(source, role);
            }
          }
        );
        if (!targetTexture) targetTexture = loadedTexture;
      };
      attempt(0);
      return targetTexture;
    };
    const terrainSources = (definition.terrainUrls?.length
      ? definition.terrainUrls
      : [definition.terrainUrl || assets[definition.terrainAsset]]
    ).slice(0, 6);
    const terrainSource = terrainSources[0];
    const texture = loadTexture(terrainSource, "plateau principal");
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.02
      })
    );
    ground.name = "WalkableGround";
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.walkable = true;
    group.add(ground);

    const zoneRegions = [];
    if (definition.terrainUrls?.length) {
      const positions = zoneLayout(terrainSources.length);
      const zoneSize = terrainSources.length <= 2
        ? 25
        : terrainSources.length <= 4
          ? 22
          : 17.5;
      terrainSources.forEach((source, index) => {
        const zoneTexture = loadTexture(source, `plateau ${index + 1}`);
        zoneTexture.colorSpace = THREE.SRGBColorSpace;
        zoneTexture.wrapS = THREE.ClampToEdgeWrapping;
        zoneTexture.wrapT = THREE.ClampToEdgeWrapping;
        zoneTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const zone = new THREE.Mesh(
          new THREE.PlaneGeometry(zoneSize, zoneSize),
          new THREE.MeshStandardMaterial({
            map: zoneTexture,
            color: 0xffffff,
            roughness: 0.92,
            metalness: 0.01,
            polygonOffset: true,
            polygonOffsetFactor: -1
          })
        );
        const [x, z] = positions[index];
        zone.name = `Zone:${index + 1}`;
        zone.rotation.x = -Math.PI / 2;
        zone.position.set(x, 0.012, z);
        zone.receiveShadow = true;
        group.add(zone);
        zoneRegions.push({
          index,
          name: definition.zones[index] || `Zone ${index + 1}`,
          center: new THREE.Vector3(x, 0, z),
          radius: zoneSize * 0.62
        });
      });
    } else {
      zoneRegions.push({
        index: 0,
        name: definition.zones[0] || "Zone principale",
        center: new THREE.Vector3(0, 0, 0),
        radius: 30
      });
    }

    const internalZonePaths = [];
    if (zoneRegions.length > 1) {
      zoneRegions.slice(1).forEach((zone, index) => {
        const previousZones = zoneRegions.slice(0, index + 1);
        const origin = previousZones.reduce((nearest, candidate) =>
          candidate.center.distanceTo(zone.center) <
          nearest.center.distanceTo(zone.center)
            ? candidate
            : nearest
        );
        internalZonePaths.push({
          start: { x: origin.center.x, z: origin.center.z },
          end: { x: zone.center.x, z: zone.center.z }
        });
      });
      internalZonePaths.forEach(({ start, end }, index) => {
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        const length = Math.hypot(dx, dz);
        const path = new THREE.Mesh(
          new THREE.BoxGeometry(2.35, 0.028, length),
          new THREE.MeshStandardMaterial({
            color: definition.palette.ground,
            emissive: definition.palette.accent,
            emissiveIntensity: 0.08,
            roughness: 1,
            metalness: 0,
            transparent: true,
            opacity: 0.78
          })
        );
        path.name = `ZonePath:${index + 1}`;
        path.position.set(
          (start.x + end.x) * 0.5,
          0.018,
          (start.z + end.z) * 0.5
        );
        path.rotation.y = Math.atan2(dx, dz);
        path.receiveShadow = true;
        group.add(path);
      });
    }

    const colliders = [];
    const interactables = [];
    const animatedObjects = [];
    const random = new Random(definition.seed);
    const profile = definition.profile || "alien";
    const landmarks = definition.id === "crystal"
      ? [
          ["arch", -10, -8, 0, 0.25],
          ["stele", 13, 9, 1, -0.4],
          ["tree", -17, 14, 0, 0.1],
          ["tree", 18, -15, 1, 1.2],
          ["pool", 8, -12, 0, 0]
        ]
      : definition.id === "jungle"
        ? [
          ["arch", 0, -8, 1, 0],
          ["arch", 15, 10, 0, 0.7],
          ["stele", -13, -11, 0, 0.2],
          ["stele", 11, -16, 1, -0.3],
          ["tree", -18, 14, 1, 0.8],
          ["tree", 18, 17, 0, -0.5],
          ["tree", -20, -17, 1, 0.4],
          ["pool", -7, 12, 1, 0]
        ]
        : [];
    const reservedPoints = [
      { ...definition.entry, clearance: 4.2 },
      ...Object.values(definition.exits).map((exit) => ({
        ...exit,
        clearance: 4.2
      })),
      ...landmarks.map(([, x, z]) => ({ x, z, clearance: 1.8 }))
    ];
    const protectedCorridors = [
      ...Object.values(definition.exits).map((exit) => ({
        start: definition.entry,
        end: exit
      })),
      ...internalZonePaths
    ];
    const occupied = [];
    const placementRadius = {
      rock: 1.15,
      crystal: 1.05,
      fiber: 0.82,
      needle: 0.46,
      frond: 0.42,
      spore: 0.5,
      debris: 0.72,
      tree: 1.25,
      arch: 2.2,
      stele: 1.05,
      pool: 1.7
    };
    const isReserved = (x, z, radius) =>
      reservedPoints.some((point) =>
        Math.hypot(x - point.x, z - point.z) < radius + point.clearance
      ) ||
      protectedCorridors.some(({ start, end }) =>
        segmentDistanceSquared(start, end, x, z) <
          (radius + 1.45) * (radius + 1.45)
      );
    const isOccupied = (x, z, radius) =>
      occupied.some((item) =>
        Math.hypot(x - item.x, z - item.z) < radius + item.radius + 0.28
      );
    const randomPosition = (minimumDistance, maximumDistance, radius) => {
      for (let attempt = 0; attempt < 72; attempt += 1) {
        const angle = random.next() * Math.PI * 2;
        const distance = minimumDistance +
          random.next() * (maximumDistance - minimumDistance);
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        if (!isReserved(x, z, radius) && !isOccupied(x, z, radius)) {
          return { x, z };
        }
      }
      return null;
    };

    const placeObject = (type, x, z, variant = 0, rotation = 0) => {
      const object = BF.ObjectLibrary.create(THREE, type, definition.palette, variant);
      object.root.position.set(x, 0, z);
      object.root.rotation.y = rotation;
      object.root.userData.libraryType = type;
      group.add(object.root);
      occupied.push({
        x,
        z,
        radius: placementRadius[type] || 0.7
      });
      animatedObjects.push({
        root: object.root,
        type,
        phase: random.next() * Math.PI * 2
      });
      if (object.hitbox) interactables.push(object.hitbox);
      if (object.hitbox && object.colliders.length) {
        object.hitbox.userData.interactionRadius = Math.max(
          ...object.colliders.map((collider) => collider.radius)
        );
      }
      object.colliders.forEach((collider) => {
        const position = collider.offset.clone().applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          rotation
        ).add(object.root.position);
        colliders.push({
          position,
          radius: collider.radius,
          owner: object.root
        });
      });
      return object;
    };

    const biomeProfiles = {
      volcanic: {
        rocks: 18, resources: ["crystal", "crystal", "fiber"],
        decorations: [["needle", 8], ["debris", 8], ["spore", 2]],
        landmark: [
          ["rock", -1.25, 0.25, 2],
          ["rock", 1.1, 0.5, 1],
          ["needle", 0, -0.45, 2],
          ["debris", 0.2, 1.25, 0]
        ]
      },
      frozen: {
        rocks: 11, resources: ["crystal", "crystal", "fiber"],
        decorations: [["needle", 11], ["frond", 3], ["spore", 4]],
        landmark: [
          ["needle", 0, 0, 2],
          ["needle", -1.15, 0.8, 1],
          ["needle", 1.2, 0.65, 0],
          ["rock", 0.15, 1.55, 1]
        ]
      },
      forest: {
        rocks: 7, resources: ["fiber", "fiber", "crystal"],
        decorations: [["frond", 11], ["spore", 9], ["needle", 2]],
        landmark: [
          ["tree", 0, 0, 1],
          ["spore", -1.45, 0.85, 2],
          ["spore", 1.35, 0.9, 1],
          ["frond", 0.25, -1.45, 2]
        ]
      },
      ruins: {
        rocks: 9, resources: ["crystal", "fiber"],
        decorations: [["debris", 12], ["frond", 5], ["spore", 4]],
        landmark: [
          ["stele", 0, 0, 1],
          ["debris", -1.25, 0.8, 2],
          ["debris", 1.3, 0.65, 1],
          ["debris", 0.2, -1.25, 0]
        ]
      },
      aquatic: {
        rocks: 9, resources: ["fiber", "fiber", "crystal"],
        decorations: [["spore", 11], ["frond", 9], ["needle", 3]],
        landmark: [
          ["pool", 0, 0, 1],
          ["spore", -1.8, 0.9, 2],
          ["spore", 1.75, 0.8, 1],
          ["frond", 0.15, -1.9, 2]
        ]
      },
      desert: {
        rocks: 15, resources: ["crystal", "fiber"],
        decorations: [["needle", 9], ["debris", 7], ["frond", 2]],
        landmark: [
          ["stele", 0, 0, 0],
          ["rock", -1.45, 0.85, 2],
          ["rock", 1.5, 0.7, 1],
          ["debris", 0.35, -1.35, 2]
        ]
      },
      crystalline: {
        rocks: 12, resources: ["crystal", "crystal", "fiber"],
        decorations: [["needle", 10], ["frond", 5], ["debris", 4]],
        landmark: [
          ["needle", 0, 0, 2],
          ["needle", -1.35, 0.75, 1],
          ["needle", 1.4, 0.7, 0],
          ["stele", 0.15, 1.65, 1]
        ]
      },
      alien: {
        rocks: 10, resources: ["crystal", "fiber"],
        decorations: [["frond", 7], ["spore", 6], ["needle", 5], ["debris", 4]],
        landmark: [
          ["stele", 0, 0, 1],
          ["pool", 0, 1.8, 0],
          ["spore", -1.7, -0.7, 2],
          ["needle", 1.65, -0.65, 1]
        ]
      }
    };
    const biomeProfile = biomeProfiles[profile] || biomeProfiles.alien;
    const traitIds = new Set((definition.traits || []).map((trait) => trait.id));
    const rockCount =
      biomeProfile.rocks +
      (traitIds.has("magnetic") ? 4 : 0) +
      (traitIds.has("floating") ? 2 : 0) -
      (traitIds.has("wetland") ? 2 : 0);
    const resourcePattern = traitIds.has("fungal")
      ? ["fiber", "fiber", "crystal"]
      : traitIds.has("lava") || traitIds.has("glass")
        ? ["crystal", "crystal", "fiber"]
        : biomeProfile.resources;
    const traitDecorations = [
      ...(traitIds.has("bioluminescent") ? [["spore", 3]] : []),
      ...(traitIds.has("fungal") ? [["spore", 4]] : []),
      ...(traitIds.has("urban") ? [["debris", 5]] : []),
      ...(traitIds.has("wetland") ? [["frond", 3]] : []),
      ...(traitIds.has("glass") ? [["needle", 3]] : [])
    ];

    for (let index = 0; index < rockCount; index += 1) {
      const position = randomPosition(8, 27, placementRadius.rock);
      if (!position) continue;
      placeObject(
        "rock",
        position.x,
        position.z,
        index % 3,
        random.next() * Math.PI
      );
    }

    const resourceCount = Math.min(12, 8 + zoneRegions.length);
    for (let index = 0; index < resourceCount; index += 1) {
      const kind = resourcePattern[index % resourcePattern.length];
      const position = randomPosition(5, 24, placementRadius[kind]);
      if (!position) continue;
      placeObject(
        kind,
        position.x,
        position.z,
        index % 3,
        random.next() * Math.PI
      );
    }

    const biomeDecorations = definition.id === "crystal"
      ? [
          ["needle", 9],
          ["frond", 7],
          ["debris", 3]
        ]
      : definition.id === "jungle"
        ? [
          ["spore", 9],
          ["frond", 8],
          ["debris", 7],
          ["needle", 3]
        ]
        : [...biomeProfile.decorations, ...traitDecorations];
    biomeDecorations.forEach(([type, count], familyIndex) => {
      for (let index = 0; index < count; index += 1) {
        const position = randomPosition(4.5, 27, placementRadius[type]);
        if (!position) continue;
        placeObject(
          type,
          position.x,
          position.z,
          (index + familyIndex) % 3,
          random.next() * Math.PI * 2
        );
      }
    });

    if (!landmarks.length && biomeProfile.landmark) {
      const landmarkCount = Math.min(2, Math.max(1, Math.ceil(zoneRegions.length / 3)));
      for (let landmarkIndex = 0; landmarkIndex < landmarkCount; landmarkIndex += 1) {
        const center = randomPosition(9, 25, 4.2);
        if (!center) continue;
        const rotation = random.next() * Math.PI * 2;
        const cosine = Math.cos(rotation);
        const sine = Math.sin(rotation);
        biomeProfile.landmark.forEach(([type, offsetX, offsetZ, variant]) => {
          const x = center.x + offsetX * cosine - offsetZ * sine;
          const z = center.z + offsetX * sine + offsetZ * cosine;
          const object = placeObject(
            type,
            x,
            z,
            variant,
            rotation + random.next() * 0.45
          );
          object.root.userData.biomeLandmark = profile;
        });
      }
    }

    landmarks.forEach(([type, x, z, variant, rotation]) => {
      placeObject(type, x, z, variant, rotation);
    });

    const gates = [];
    Object.entries(definition.exits).forEach(([direction, exit]) => {
      const gate = new THREE.Group();
      gate.position.set(exit.x, 0, exit.z);
      gate.userData.exit = { ...exit, direction };
      gate.userData.triggerRadius = 2.35;

      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(2.15, 0.17, 18, 64, Math.PI),
        new THREE.MeshStandardMaterial({
          color: definition.palette.accent,
          emissive: definition.palette.accent,
          emissiveIntensity: 2,
          metalness: 0.35,
          roughness: 0.3
        })
      );
      arch.position.y = 0.2;
      gate.add(arch);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.35, 48),
        new THREE.MeshBasicMaterial({
          color: definition.palette.accent,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      gate.add(ring);

      const label = BF.makeLabel(
        THREE,
        `${({
          north: "NORD",
          south: "SUD",
          east: "EST",
          west: "OUEST"
        })[direction] || direction.toUpperCase()} · ${BF.maps[exit.targetMap].name}`
      );
      label.position.y = 3.2;
      gate.add(label);
      group.add(gate);
      gates.push(gate);
    });

    return {
      definition,
      group,
      ground,
      colliders,
      interactables,
      gates,
      zoneRegions,
      internalZonePaths,
      update(elapsed) {
        animatedObjects.forEach(({ root, type, phase }) => {
          const pulse = Math.sin(elapsed * 1.25 + phase);
          if (type === "fiber") {
            root.rotation.z = pulse * 0.025;
            root.rotation.x = Math.cos(elapsed + phase) * 0.018;
          } else if (type === "crystal") {
            const scale = 1 + pulse * 0.018;
            root.scale.setScalar(scale);
          } else if (type === "tree") {
            root.children.slice(1).forEach((crown, index) => {
              crown.rotation.z = Math.sin(elapsed * 0.55 + phase + index) * 0.035;
            });
          } else if (type === "pool" && root.children[1]?.material) {
            root.children[1].material.opacity = 0.4 + (pulse + 1) * 0.07;
            root.children[1].rotation.z = elapsed * 0.025 + phase;
          } else if (type === "stele") {
            root.children.slice(1).forEach((rune) => {
              if (rune.material) rune.material.opacity = 0.62 + (pulse + 1) * 0.15;
            });
          } else if (type === "frond" || type === "spore") {
            root.rotation.z = pulse * 0.018;
            root.rotation.x = Math.cos(elapsed * 0.72 + phase) * 0.012;
          } else if (type === "needle" || type === "debris") {
            root.children.forEach((part) => {
              if (part.material?.emissive) {
                part.material.emissiveIntensity = 0.5 + (pulse + 1) * 0.15;
              } else if (part.material?.opacity !== undefined && part.material.transparent) {
                part.material.opacity = 0.52 + (pulse + 1) * 0.08;
              }
            });
          }
        });
      },
      dispose() {
        BF.disposeObject(group);
      }
    };
  };
})(window);
