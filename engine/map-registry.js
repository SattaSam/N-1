(function (global) {
  "use strict";

  const BF = global.BlueFox3D;

  BF.maps = {
    crystal: {
      id: "crystal",
      number: 1,
      name: "Plaine des Cristaux",
      zones: ["Abri et épave"],
      terrainUrls: ["./Images/04_1.png"],
      terrainUrl: "./Images/04_1.png",
      sceneUrl: "./Images/4Savane.png",
      entry: { x: 0, z: 20 },
      exits: {},
      seed: 9173,
      profile: "crystalline",
      palette: { ground: 0x657f98, accent: 0x64e6ff }
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
    const allTerrains = catalog.maps
      .flatMap((map) => map.terrains || [])
      .concat(catalog.orphanTerrains || []);
    const terrainUrlsFor = (catalogMap) => {
      const preferred = (catalogMap.terrains || []).slice(0, 6);
      if (preferred.length) return preferred.map((terrain) => terrain.url);
      if (!allTerrains.length) return [];
      const fallback = allTerrains[
        (catalogMap.number * 7919 + 137) % allTerrains.length
      ];
      return [fallback.url];
    };
    catalog.maps.forEach((catalogMap) => {
      // N... est le décor panoramique. Les 0N_x sont privilégiés pour
      // les plateaux, mais un autre 0M_x peut servir de repli.
      const terrainUrls = terrainUrlsFor(catalogMap);
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
        const registeredTerrains = existingMap.id === "crystal"
          ? [terrainUrls[0] || existingMap.terrainUrl].filter(Boolean)
          : terrainUrls;
        existingMap.terrainUrls = registeredTerrains;
        existingMap.terrainUrl =
          registeredTerrains[0] || catalogMap.scene.url;
        existingMap.zones = [`Zone ${catalogMap.number}`];
        existingMap.plateauCount = Math.max(1, registeredTerrains.length);
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
        zones: [`Zone ${catalogMap.number}`],
        plateauCount: Math.max(1, terrainUrls.length),
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

  const zoneLayout = (count) => {
    const layouts = {
      1: [[0, 0]],
      2: [[0, 27], [0, -27]],
      3: [[-54, 0], [0, 0], [54, 0]],
      4: [[-27, 27], [27, 27], [-27, -27], [27, -27]],
      5: [[-54, 27], [0, 27], [54, 27], [-27, -27], [27, -27]],
      6: [[-54, 27], [0, 27], [54, 27], [-54, -27], [0, -27], [54, -27]]
    };
    return layouts[BF.clamp(count, 1, 6)] || layouts[1];
  };

  const mapIsDiscovered = (mapId) => {
    if (!mapId) return false;
    if (BF.discoveredMaps instanceof Set) return BF.discoveredMaps.has(mapId);
    try {
      const saved = JSON.parse(
        localStorage.getItem("bluefox_discovered_maps_v1") || "[]"
      );
      return saved.some((map) => map?.id === mapId);
    } catch {
      return mapId === "crystal";
    }
  };

  const makePortalLabel = (THREE, direction, exit) => {
    const directionLabel = ({
      north: "NORD",
      south: "SUD",
      east: "EST",
      west: "OUEST"
    })[direction] || direction.toUpperCase();
    const targetName = mapIsDiscovered(exit.targetMap)
      ? BF.maps[exit.targetMap]?.name
      : "";
    const lines = targetName
      ? [directionLabel, targetName]
      : [directionLabel];

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const font = "600 27px Arial";
    context.font = font;
    const widestLine = Math.max(
      ...lines.map((line) => context.measureText(line).width)
    );
    canvas.width = Math.ceil(BF.clamp(widestLine + 64, 220, 900));
    canvas.height = lines.length === 2 ? 116 : 78;

    context.fillStyle = "rgba(2, 12, 28, .86)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#64e6ff";
    context.lineWidth = 3;
    context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    context.fillStyle = "#eaf8ff";
    context.font = font;
    context.textAlign = "center";
    context.textBaseline = "middle";
    if (lines.length === 1) {
      context.fillText(lines[0], canvas.width / 2, canvas.height / 2);
    } else {
      context.fillText(lines[0], canvas.width / 2, 35);
      context.fillText(lines[1], canvas.width / 2, 81);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    }));
    const pixelsPerUnit = 68.25;
    sprite.scale.set(
      canvas.width / pixelsPerUnit,
      canvas.height / pixelsPerUnit,
      1
    );
    return sprite;
  };

  BF.buildMap = function buildMap(THREE, definition, assets, renderer) {
    const group = new THREE.Group();
    group.name = `Map:${definition.id}`;

    // La map ne devient visible qu'une fois toutes ses textures de plateau prêtes.
    // Cela empêche l'affichage transitoire d'une ancienne image ou d'un canevas
    // partiellement rempli pendant le chargement initial.
    group.visible = false;

    const loader = new THREE.TextureLoader();
    const pendingTextureLoads = [];
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

    const maxTerrainAnisotropy = Math.min(
      8,
      renderer.capabilities.getMaxAnisotropy()
    );

    const configureTerrainTexture = (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = maxTerrainAnisotropy;
      texture.needsUpdate = true;
      return texture;
    };

    const createTerrainTransitionTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const texture = new THREE.CanvasTexture(canvas);
      configureTerrainTexture(texture);
      texture.userData.isTerrainTransitionTexture = true;
      return texture;
    };

    const seededNoise = (x, y, seed) => {
      let value = (
        Math.imul(x + 1, 374761393) ^
        Math.imul(y + 1, 668265263) ^
        Math.imul(seed + 1, 1442695041)
      ) >>> 0;
      value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
      return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
    };

    const updateTerrainTransitionTexture = (
      terrainTexture,
      image,
      textureSeed
    ) => {
      if (!terrainTexture?.image || !image) return;

      const canvas = terrainTexture.image;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      const size = canvas.width;
      const coreRatio = 49 / 55.1;
      const inset = Math.round((size - size * coreRatio) * 0.5);
      const coreSize = size - inset * 2;
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      const edgeSource = Math.max(
        2,
        Math.round(Math.min(sourceWidth, sourceHeight) * 0.022)
      );

      const drawExtendedImage = (filter = "none") => {
        context.save();
        context.filter = filter;

        context.drawImage(
          image, 0, 0, sourceWidth, sourceHeight,
          inset, inset, coreSize, coreSize
        );

        context.drawImage(
          image, 0, 0, sourceWidth, edgeSource,
          inset, 0, coreSize, inset
        );
        context.drawImage(
          image, 0, sourceHeight - edgeSource, sourceWidth, edgeSource,
          inset, size - inset, coreSize, inset
        );
        context.drawImage(
          image, 0, 0, edgeSource, sourceHeight,
          0, inset, inset, coreSize
        );
        context.drawImage(
          image, sourceWidth - edgeSource, 0, edgeSource, sourceHeight,
          size - inset, inset, inset, coreSize
        );

        context.drawImage(
          image, 0, 0, edgeSource, edgeSource,
          0, 0, inset, inset
        );
        context.drawImage(
          image, sourceWidth - edgeSource, 0, edgeSource, edgeSource,
          size - inset, 0, inset, inset
        );
        context.drawImage(
          image, 0, sourceHeight - edgeSource, edgeSource, edgeSource,
          0, size - inset, inset, inset
        );
        context.drawImage(
          image,
          sourceWidth - edgeSource,
          sourceHeight - edgeSource,
          edgeSource,
          edgeSource,
          size - inset,
          size - inset,
          inset,
          inset
        );

        context.restore();
      };

      context.clearRect(0, 0, size, size);
      drawExtendedImage();

      const blurSteps = 7;
      for (let step = 1; step <= blurSteps; step += 1) {
        const outerProgress = step / blurSteps;
        const outerInset = Math.round(inset * (1 - outerProgress));
        const innerInset = Math.round(
          inset * (1 - (step - 1) / blurSteps)
        );

        context.save();
        context.beginPath();
        context.rect(outerInset, outerInset, size - outerInset * 2, size - outerInset * 2);
        context.rect(innerInset, innerInset, size - innerInset * 2, size - innerInset * 2);
        context.clip("evenodd");
        drawExtendedImage(`blur(${(outerProgress * 5.4).toFixed(2)}px)`);
        context.restore();
      }

      context.drawImage(
        image, 0, 0, sourceWidth, sourceHeight,
        inset, inset, coreSize, coreSize
      );

      const pixels = context.getImageData(0, 0, size, size);
      const data = pixels.data;
      const coreMin = inset;
      const coreMax = size - inset - 1;

      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const offset = (y * size + x) * 4;
          const insideCore =
            x >= coreMin && x <= coreMax &&
            y >= coreMin && y <= coreMax;

          if (insideCore) {
            data[offset + 3] = 255;
            continue;
          }

          const distanceX =
            x < coreMin ? coreMin - x :
              x > coreMax ? x - coreMax : 0;
          const distanceY =
            y < coreMin ? coreMin - y :
              y > coreMax ? y - coreMax : 0;
          const distance = Math.max(distanceX, distanceY);
          const progress = Math.min(1, distance / Math.max(1, inset));

          const broadNoise = seededNoise(
            Math.floor(x / 11),
            Math.floor(y / 11),
            textureSeed
          );
          const fineNoise = seededNoise(x, y, textureSeed + 1013);
          const irregularity =
            (broadNoise - 0.5) * 0.18 +
            (fineNoise - 0.5) * 0.08;

          const outerOpacity = 0.22;
          const opacity = BF.clamp(
            1 - progress * (1 - outerOpacity) + irregularity,
            0.25,
            1
          );

          const colorNoise = Math.round((fineNoise - 0.5) * 10);
          data[offset] = BF.clamp(data[offset] + colorNoise, 0, 255);
          data[offset + 1] = BF.clamp(data[offset + 1] + colorNoise, 0, 255);
          data[offset + 2] = BF.clamp(data[offset + 2] + colorNoise, 0, 255);
          data[offset + 3] = Math.round(data[offset + 3] * opacity);
        }
      }

      context.putImageData(pixels, 0, 0);
      terrainTexture.needsUpdate = true;
    };

    const loadTexture = (source, role, onReady) => {
      const candidates =
        global.BLUEFOX_MAP_ASSETS?.imageUrlCandidates?.(source) || [source];

      // Texture volontairement vide : aucune ancienne image ne peut être
      // réaffichée pendant le chargement ou le décodage du nouveau fichier.
      const targetTexture = configureTerrainTexture(new THREE.Texture());
      targetTexture.image = null;
      targetTexture.needsUpdate = false;

      const ready = new Promise((resolve) => {
        const attempt = (index) => {
          const candidate = candidates[index];

          loader.load(
            candidate,
            (loadedTexture) => {
              targetTexture.image = loadedTexture.image;
              configureTerrainTexture(targetTexture);
              targetTexture.needsUpdate = true;

              try {
                onReady?.(targetTexture);
              } finally {
                if (loadedTexture !== targetTexture) loadedTexture.dispose();
                resolve(true);
              }
            },
            undefined,
            () => {
              if (index + 1 < candidates.length) {
                attempt(index + 1);
                return;
              }

              reportMissingTexture(source, role);
              resolve(false);
            }
          );
        };

        attempt(0);
      });

      pendingTextureLoads.push(ready);
      targetTexture.userData.ready = ready;
      return targetTexture;
    };

    const terrainSources = (definition.terrainUrls?.length
      ? definition.terrainUrls
      : [definition.terrainUrl || assets[definition.terrainAsset]]
    ).slice(0, 6);
    const positions = zoneLayout(terrainSources.length);
    const minX = Math.min(...positions.map(([x]) => x)) - 27;
    const maxX = Math.max(...positions.map(([x]) => x)) + 27;
    const minZ = Math.min(...positions.map(([, z]) => z)) - 27;
    const maxZ = Math.max(...positions.map(([, z]) => z)) + 27;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(maxX - minX, maxZ - minZ),
      new THREE.MeshStandardMaterial({
        color: definition.palette.ground,
        roughness: 1,
        metalness: 0.02
      })
    );
    ground.name = "WalkableGround";
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((minX + maxX) * 0.5, -0.018, (minZ + maxZ) * 0.5);
    ground.receiveShadow = true;
    ground.userData.walkable = true;
    group.add(ground);

    const zoneRegions = [];
    if (terrainSources.length) {
      const zoneSize = 54;
      const terrainTextureSize = 55.1;

      terrainSources.forEach((source, index) => {
        const zoneTexture = createTerrainTransitionTexture();
        loadTexture(
          source,
          `plateau ${index + 1}`,
          (loadedTexture) => {
            updateTerrainTransitionTexture(
              zoneTexture,
              loadedTexture.image,
              definition.seed + index * 7919
            );
          }
        );
        const [x, z] = positions[index];

        const zone = new THREE.Mesh(
          new THREE.PlaneGeometry(terrainTextureSize, terrainTextureSize),
          new THREE.MeshStandardMaterial({
            map: zoneTexture,
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            roughness: 1,
            metalness: 0,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
            emissive: 0x000000
          })
        );
        zone.name = `Zone:${index + 1}`;
        zone.rotation.x = -Math.PI / 2;
        zone.position.set(x, 0.008, z);
        zone.renderOrder = 2 + index;
        zone.userData.walkable = true;
        zone.receiveShadow = true;
        group.add(zone);
        zoneRegions.push({
          index,
          name: `Plateau ${index + 1}`,
          center: new THREE.Vector3(x, 0, z),
          radius: zoneSize * 0.62
        });
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
      // Les extensions 55,1 × 55,1 se chevauchent légèrement entre zones voisines.
    }

    const colliders = [];
    const interactables = [];
    const animatedObjects = [];
    const random = new Random(definition.seed);
    const profile = definition.profile || "alien";
    const resolvedExits = Object.fromEntries(
      Object.entries(definition.exits).map(([direction, exit]) => {
        const resolved = { ...exit };
        if (direction === "north") {
          resolved.z = minZ + 1.2;
          resolved.x = BF.clamp(exit.x || 0, minX + 4, maxX - 4);
        } else if (direction === "south") {
          resolved.z = maxZ - 1.2;
          resolved.x = BF.clamp(exit.x || 0, minX + 4, maxX - 4);
        } else if (direction === "east") {
          resolved.x = maxX - 1.2;
          resolved.z = BF.clamp(exit.z || 0, minZ + 4, maxZ - 4);
        } else if (direction === "west") {
          resolved.x = minX + 1.2;
          resolved.z = BF.clamp(exit.z || 0, minZ + 4, maxZ - 4);
        }
        return [direction, resolved];
      })
    );
    definition.runtimeExits = resolvedExits;
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
      ...Object.values(resolvedExits).map((exit) => ({
        ...exit,
        clearance: 4.2
      })),
      ...landmarks.map(([, x, z]) => ({ x, z, clearance: 1.8 }))
    ];
    const protectedCorridors = [
      ...Object.values(resolvedExits).map((exit) => ({
        start: definition.entry,
        end: exit
      })),
      ...internalZonePaths
    ];
    if (!BF.ObjectSpawner) {
      throw new Error("buildMap nécessite ObjectSpawner.");
    }
    const objectSpawner = new BF.ObjectSpawner({
      THREE,
      scene: group,
      palette: definition.palette,
      random: () => random.next()
    });
    objectSpawner.populateMap({
      definition,
      group,
      zoneRegions,
      bounds: { minX, maxX, minZ, maxZ },
      resolvedExits,
      internalZonePaths,
      landmarks,
      colliders,
      interactables,
      animatedObjects,
      random
    });

    const gates = [];
    Object.entries(resolvedExits).forEach(([direction, exit]) => {
      const gate = new THREE.Group();
      gate.position.set(exit.x, 0, exit.z);
      // Le plan du portail reste parallèle au bord du plateau :
      // Nord/Sud suivent X ; Est/Ouest suivent Z.
      gate.rotation.y =
        direction === "east" || direction === "west" ? Math.PI / 2 : 0;
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

      const label = makePortalLabel(THREE, direction, exit);
      label.position.y = 3.2;
      gate.add(label);
      group.add(gate);
      gates.push(gate);
    });

    const ready = Promise.all(pendingTextureLoads).then(() => {
      group.visible = true;
      return true;
    });

    return {
      definition,
      group,
      ground,
      ready,
      colliders,
      interactables,
      gates,
      zoneRegions,
      internalZonePaths,
      bounds: Math.max(
        Math.abs(minX), Math.abs(maxX), Math.abs(minZ), Math.abs(maxZ)
      ),
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
        // Retirer réellement l’ancienne map de la scène avant de libérer ses ressources.
        // disposeObject() seul ne détache pas le groupe et Three.js peut le réafficher.
        group.removeFromParent();
        BF.disposeObject(group);
      }
    };
  };
})(window);
