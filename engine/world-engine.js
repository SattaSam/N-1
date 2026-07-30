(function (global) {
  "use strict";

  const BF = global.BlueFox3D;

  class WorldEngine {
    constructor(options) {
      Object.assign(this, options);
      this.disposed = false;
      this.frame = 0;
      this.currentMap = null;
      this.currentMapId = "crystal";
      this.pendingInteraction = null;
      this.interactionStartedAt = 0;
      this.interactionApproachStartedAt = 0;
      this.interactionApproachAttempts = 0;
      this.transitioning = false;
      this.lastSavedAt = 0;
      this.lastAutonomyAt = performance.now();
      this.lastSpeechAt = -10000;
      this.discoveredMaps = new Set(["crystal"]);
      this.discoveredZones = new Set();
      this.resourceCooldowns = new WeakMap();
      this.pointerDown = { x: 0, y: 0 };
      this.raycaster = null;
      this.pointer = null;
      this.groundPlane = null;
      this.clock = null;
      this.resizeObserver = null;
      this.transitionElement = null;
      this.panorama = null;
      this.panoramaTexture = null;
      this.compassNeedle = null;
      this.lastCompassCheck = 0;
      this.cameraButton = null;
      this.clickMarker = null;
      this.lastCycleUpdate = 0;
      this.gateCooldownUntil = 0;
      this.lastActivityAt = performance.now();
      this.lastIntentUpdate = 0;
      this.destinationMarker = null;
      this.destinationMarkerStartedAt = 0;
      this.pathLine = null;
      this.characterGroundShadow = null;
      this.speechButton = null;
      this.speechVisible = localStorage.getItem("bluefox_speech_visible_v1") !== "false";
      this.lastActivityUiUpdate = 0;
      this.currentActivityKey = "";
      this.intentMissionKey = "";
      this.stableIntentText = "";
      this.currentRoutine = null;
      this.postActionRecoveryUntil = 0;
      this.lastCompletedAction = "";
      this.transitionStartedAt = 0;
      this.completedTransitions = 0;
      this.completedInteractions = 0;
      this.navigationFailures = 0;
      this.resumeCount = 0;
      this.lastResumeAt = 0;
      this.currentZoneIndex = -1;
      this.lastZoneCheckAt = 0;
      this.pendingZoneExploration = null;
      this.biomeParticles = null;
      this.biomeParticleSettings = null;
      this.performanceQuality = "high";
      this.performanceFrames = 0;
      this.performanceElapsed = 0;
      this.performanceWarmup = 8;
      this.performanceLowSamples = 0;
      this.performanceHighSamples = 0;
      this.measuredFps = 60;
      this.missingImageUrls = new Set();
      this.generatedTopology = [];
      this.mapNames = new Map();
      this.navigationRoute = [];
      this.onMissingImage = (event) => {
        const source = String(event.detail?.source || "image inconnue");
        if (this.missingImageUrls.has(source)) return;
        this.missingImageUrls.add(source);
        let filename = source.split("/").pop() || source;
        try {
          filename = decodeURIComponent(filename);
        } catch {
          // Le chemin brut reste suffisamment explicite pour le diagnostic.
        }
        this.callbacks.onStatus(
          `Image locale introuvable : ${filename}. Vérifiez le dossier Images puis relancez GENERER_CATALOGUE_IMAGES.bat.`
        );
        this.callbacks.onAction(
          `Asset manquant pour ${event.detail?.mapName || "la map actuelle"} : ${filename}.`
        );
      };
    }

    async initialize() {
      const { THREE, OrbitControls, GLTFLoader, container } = this;
      global.addEventListener("bluefox:image-missing", this.onMissingImage);
      this.restoreDiscovery();
      this.restoreMapNames();
      this.restoreGeneratedTopology();
      BF.sceneImages = {
        crystal: this.assets.sceneCrystal,
        jungle: this.assets.sceneJungle
      };
      Object.values(BF.maps).forEach((definition) => {
        if (definition.sceneUrl) {
          BF.sceneImages[definition.id] = definition.sceneUrl;
        }
      });

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.14;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x071426);
      this.scene.fog = new THREE.FogExp2(0x071426, 0.012);
      this.createDestinationMarker();
      this.createPathVisual();

      this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
      this.camera.position.set(8, 6.2, 8);
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      this.hemisphere = new THREE.HemisphereLight(0x9ddfff, 0x10243a, 2.6);
      this.scene.add(this.hemisphere);
      this.sun = new THREE.DirectionalLight(0xccecff, 4.1);
      this.sun.position.set(-8, 14, 9);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      this.sun.shadow.camera.left = -32;
      this.sun.shadow.camera.right = 32;
      this.sun.shadow.camera.top = 32;
      this.sun.shadow.camera.bottom = -32;
      this.scene.add(this.sun);
      this.fill = new THREE.PointLight(0x71dfff, 9, 28);
      this.fill.position.set(8, 5, -5);
      this.scene.add(this.fill);

      this.createPanorama();
      this.character = await BF.CharacterController.create(
        THREE,
        GLTFLoader,
        this.assets.model
      );
      this.scene.add(this.character.root);
      this.createCharacterGrounding();

      const saved = this.restorePosition();
      this.currentMapId = saved.map;
      await this.loadMap(this.currentMapId, saved, false);
      this.character.root.position.set(saved.x, 0, saved.z);
      this.character.setTarget(this.character.root.position);

      this.cameraController = new BF.CameraController(
        THREE,
        this.camera,
        this.controls,
        this.character,
        this.renderer.domElement
      );
      this.cameraController.resetBehindCharacter(true);

      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2();
      this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      this.clock = new THREE.Clock();
      this.createTransitionElement();
      this.bindEvents();
      this.createExplorationHud();
      this.initializePlanetaryClock();
      this.resize();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(container);

      this.callbacks.onStatus("Nouveau moteur 3D initialisé sur une base stable.");
      this.callbacks.onAction("Le sous-système 3D modulaire prend le contrôle de BlueFox.");
      global.dispatchEvent(new CustomEvent("bluefox:scene-images"));
      BF.currentEngine = this;
      BF.getDiagnostics = () => this.getDiagnostics();
      if (BF.Missions?.MissionManager) {
        this.missionManager = BF.Missions.MissionManager.create({
          engine: this,
          missionId: "shelter"
        });
        BF.getMissionState = () => this.missionManager.getState();
      }
      this.loop();
      return this;
    }

    restoreDiscovery() {
      try {
        const memories = JSON.parse(
          localStorage.getItem("bluefox_engine_discovered_maps_v2") ||
          localStorage.getItem("bluefox_discovered_maps_v1") ||
          "[]"
        );
        const orderedMemories = memories
          .filter((map) => map?.id && BF.maps[map.id])
          .sort((left, right) =>
            (Number(left.order) || Number.MAX_SAFE_INTEGER) -
            (Number(right.order) || Number.MAX_SAFE_INTEGER)
          );
        this.discoveredMaps.clear();
        if (BF.maps.crystal) this.discoveredMaps.add("crystal");
        orderedMemories.forEach((map) => this.discoveredMaps.add(map.id));
      } catch {
        localStorage.removeItem("bluefox_discovered_maps_v1");
      }
      global.BlueFox3D.discoveredMaps = this.discoveredMaps;
      global.dispatchEvent(new CustomEvent("bluefox:discovery-changed", {
        detail: { maps: [...this.discoveredMaps] }
      }));
      try {
        const zones = JSON.parse(
          localStorage.getItem("bluefox_discovered_zones_v1") || "[]"
        );
        zones.filter((zone) => typeof zone === "string")
          .forEach((zone) => this.discoveredZones.add(zone));
      } catch {
        localStorage.removeItem("bluefox_discovered_zones_v1");
      }
      global.BlueFox3D.discoveredZones = this.discoveredZones;
    }

    discoveryNumber(mapId) {
      const index = [...this.discoveredMaps].indexOf(mapId);
      if (index >= 0) return index + 1;
      return BF.maps[mapId] ? this.discoveredMaps.size + 1 : null;
    }

    restoreGeneratedTopology() {
      try {
        const saved = JSON.parse(
          localStorage.getItem("bluefox_generated_topology_v1") || "[]"
        );
        if (!Array.isArray(saved)) return;
        this.generatedTopology = saved.filter((link) =>
          this.applyGeneratedLink(link)
        );
        if (this.generatedTopology.length !== saved.length) {
          localStorage.setItem(
            "bluefox_generated_topology_v1",
            JSON.stringify(this.generatedTopology)
          );
        }
      } catch {
        localStorage.removeItem("bluefox_generated_topology_v1");
        this.generatedTopology = [];
      }
    }

    restoreMapNames() {
      try {
        const saved = JSON.parse(
          localStorage.getItem("bluefox_map_names_v1") || "{}"
        );
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) return;
        Object.entries(saved).forEach(([mapId, name]) => {
          if (!BF.maps[mapId] || typeof name !== "string" || !name.trim()) return;
          const resolvedName = name.trim();
          BF.maps[mapId].name = resolvedName;
          this.mapNames.set(mapId, resolvedName);
        });
      } catch {
        localStorage.removeItem("bluefox_map_names_v1");
        this.mapNames.clear();
      }
    }

    sceneIdentity(definition) {
      if (!definition) return "";
      const catalogScene =
        global.BLUEFOX_MAP_ASSETS?.catalog?.maps?.find(
          (map) => map.id === definition.id || map.number === definition.number
        )?.scene?.url;
      const source =
        definition.sceneUrl ||
        catalogScene ||
        this.assets?.[definition.sceneAsset] ||
        definition.sceneAsset ||
        "";
      try {
        return decodeURIComponent(String(source))
          .replace(/\\/g, "/")
          .split(/[?#]/)[0]
          .toLocaleLowerCase("fr");
      } catch {
        return String(source)
          .replace(/\\/g, "/")
          .split(/[?#]/)[0]
          .toLocaleLowerCase("fr");
      }
    }

    ensureUniqueMapName(mapId) {
      const definition = BF.maps[mapId];
      if (!definition) return "";
      const savedName = this.mapNames.get(mapId);
      if (savedName) {
        definition.name = savedName;
        return savedName;
      }

      const normalize = (value) => String(value || "")
        .toLocaleLowerCase("fr")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      const discoveredDefinitions = [...this.discoveredMaps]
        .filter((id) => id !== mapId && BF.maps[id])
        .map((id) => BF.maps[id]);
      const sceneKey = this.sceneIdentity(definition);
      const duplicateScene = Boolean(sceneKey) && discoveredDefinitions.some(
        (map) => this.sceneIdentity(map) === sceneKey
      );
      const duplicateName = discoveredDefinitions.some(
        (map) => normalize(map.name) === normalize(definition.name)
      );
      if (!duplicateScene && !duplicateName) return definition.name;

      const namesByProfile = {
        volcanic: [
          "La Cicatrice d’Aube", "Les Forges Rouges", "Le Seuil de Braise",
          "La Caldeira Murmurante"
        ],
        frozen: [
          "Le Silence Boréal", "Les Éclats de Givre", "La Veille Blanche",
          "Le Miroir des Brumes"
        ],
        forest: [
          "La Canopée des Veilleurs", "Le Jardin des Échos", "Les Racines Célestes",
          "La Clairière Patiente"
        ],
        ruins: [
          "Les Vestiges Endormis", "La Cité des Silences", "Le Passage des Anciens",
          "Les Arches Oubliées"
        ],
        aquatic: [
          "Le Lagon des Lueurs", "Les Profondeurs Calmes", "La Mer des Murmures",
          "L’Archipel Opalin"
        ],
        desert: [
          "La Mer de Sable", "Les Dunes du Veilleur", "Le Désert des Deux Lunes",
          "La Vallée Sèche"
        ],
        crystalline: [
          "Le Champ des Résonances", "Les Flèches d’Azur", "La Plaine Prismatique",
          "Le Sanctuaire de Verre"
        ],
        alien: [
          "L’Horizon Inconnu", "La Terre des Signes", "Le Domaine des Échos",
          "La Frontière Silencieuse"
        ]
      };
      const candidates = namesByProfile[definition.profile] || namesByProfile.alien;
      let hash = 2166136261;
      for (const character of `${mapId}:${definition.seed}:${definition.name}`) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      }
      const usedNames = new Set(
        Object.values(BF.maps).map((map) => normalize(map.name))
      );
      let chosen = "";
      for (let offset = 0; offset < candidates.length; offset += 1) {
        const candidate = candidates[((hash >>> 0) + offset) % candidates.length];
        if (!usedNames.has(normalize(candidate))) {
          chosen = candidate;
          break;
        }
      }
      if (!chosen) {
        const base = candidates[(hash >>> 0) % candidates.length];
        let suffix = 2;
        chosen = `${base} ${suffix}`;
        while (usedNames.has(normalize(chosen))) {
          suffix += 1;
          chosen = `${base} ${suffix}`;
        }
      }

      definition.name = chosen;
      this.mapNames.set(mapId, chosen);
      localStorage.setItem(
        "bluefox_map_names_v1",
        JSON.stringify(Object.fromEntries(this.mapNames))
      );
      this.callbacks.onAction(
        `BlueFox baptise ce nouveau territoire « ${chosen} ».`
      );
      return chosen;
    }

    applyGeneratedLink(link) {
      const directions = {
        north: { x: 0, z: -26, opposite: "south" },
        south: { x: 0, z: 26, opposite: "north" },
        east: { x: 26, z: 0, opposite: "west" },
        west: { x: -26, z: 0, opposite: "east" }
      };
      const fromMap = BF.maps[link?.from];
      const toMap = BF.maps[link?.to];
      const placement = directions[link?.direction];
      if (!fromMap || !toMap || !placement) return false;
      const reverse = directions[placement.opposite];
      fromMap.exits[link.direction] = {
        x: placement.x,
        z: placement.z,
        targetMap: toMap.id,
        targetEntry: placement.opposite,
        generated: true
      };
      toMap.exits[placement.opposite] = {
        x: reverse.x,
        z: reverse.z,
        targetMap: fromMap.id,
        targetEntry: link.direction,
        generated: true
      };
      return true;
    }

    ensureMapContinuation(mapId) {
      const definition = BF.maps[mapId];
      if (!definition || Object.keys(definition.exits).length > 1) return;
      const opposites = {
        north: "south", south: "north", east: "west", west: "east"
      };
      const returnDirection = Object.keys(definition.exits)[0] || null;
      const preferredDirection = returnDirection
        ? opposites[returnDirection]
        : "north";
      const directions = [
        preferredDirection,
        "north", "east", "south", "west"
      ].filter((value, index, list) =>
        value && list.indexOf(value) === index && !definition.exits[value]
      );
      const usedTargets = new Set(
        this.generatedTopology.flatMap((link) => [link.from, link.to])
      );
      for (const direction of directions) {
        const opposite = opposites[direction];
        const destination = Object.values(BF.maps)
          .filter((map) =>
            map.id !== mapId &&
            !this.discoveredMaps.has(map.id) &&
            !usedTargets.has(map.id) &&
            !map.exits[opposite]
          )
          .sort((left, right) => left.number - right.number)[0];
        if (!destination) continue;
        const link = { from: mapId, direction, to: destination.id };
        if (!this.applyGeneratedLink(link)) continue;
        this.generatedTopology.push(link);
        localStorage.setItem(
          "bluefox_generated_topology_v1",
          JSON.stringify(this.generatedTopology)
        );
        break;
      }
    }

    saveDiscovery() {
      const previous = (() => {
        try {
          return JSON.parse(
            localStorage.getItem("bluefox_discovered_maps_v1") || "[]"
          );
        } catch {
          return [];
        }
      })();
      const metadata = new Map(
        previous.filter((map) => map?.id).map((map) => [map.id, map])
      );
      const memories = [...this.discoveredMaps].map((id, index) => ({
        ...(metadata.get(id) || {}),
        id,
        name: BF.maps[id]?.name || metadata.get(id)?.name,
        sceneKey: this.sceneIdentity(BF.maps[id]),
        order: index + 1,
        discoveredAt: metadata.get(id)?.discoveredAt || Date.now()
      }));
      localStorage.setItem(
        "bluefox_discovered_maps_v1",
        JSON.stringify(memories)
      );
      localStorage.setItem(
        "bluefox_engine_discovered_maps_v2",
        JSON.stringify(memories)
      );
      global.BlueFox3D.discoveredMaps = this.discoveredMaps;
      global.dispatchEvent(new CustomEvent("bluefox:discovery-changed", {
        detail: { maps: [...this.discoveredMaps] }
      }));
    }

    saveZoneDiscovery() {
      localStorage.setItem(
        "bluefox_discovered_zones_v1",
        JSON.stringify([...this.discoveredZones])
      );
      global.BlueFox3D.discoveredZones = this.discoveredZones;
      global.dispatchEvent(new CustomEvent("bluefox:zone-discovery-changed", {
        detail: { zones: [...this.discoveredZones] }
      }));
    }

    restorePosition() {
      try {
        const saved = JSON.parse(
          localStorage.getItem("bluefox_world_position_v2") ||
          localStorage.getItem("bluefox_world_position_v1") ||
          "null"
        );
        if (saved && BF.maps[saved.map]) {
          const center = saved.map === "jungle" && Math.abs(saved.x) > 30 ? 64 : 0;
          return {
            map: saved.map,
            x: BF.clamp(saved.x - center, -27, 27),
            z: BF.clamp(saved.z, -27, 27)
          };
        }
      } catch {
        localStorage.removeItem("bluefox_world_position_v2");
      }
      return { map: "crystal", x: 0, z: 5 };
    }

    savePosition() {
      localStorage.setItem("bluefox_world_position_v2", JSON.stringify({
        map: this.currentMapId,
        x: this.character.root.position.x,
        z: this.character.root.position.z,
        savedAt: Date.now()
      }));
    }

    createPanorama() {
      const { THREE } = this;

      // Grand panneau incurvé conservant la perspective actuelle.
      // Les dimensions sont légèrement augmentées pour couvrir le champ maximal
      // sans transformer la structure générale du décor.
      const panoramaWidth = 400;
      const panoramaHeight = 136;
      const geometry = new THREE.PlaneGeometry(
        panoramaWidth,
        panoramaHeight,
        96,
        22
      );
      const position = geometry.attributes.position;
      const uv = geometry.attributes.uv;

      for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index);
        const y = position.getY(index);
        const normalized = Math.abs(x) / (panoramaWidth * 0.5);
        const edge = Math.max(0, (normalized - 0.52) / 0.48);
        const vertical = BF.clamp(
          (y + panoramaHeight * 0.5) / panoramaHeight,
          0,
          1
        );
        const upperLean = Math.pow(vertical, 2);

        // Le panneau descend sous le plateau et monte largement au-dessus
        // de la limite visible de la caméra.
        position.setY(index, -19 + vertical * 94);

        // Inclinaison inversée par rapport au PATCH B1 : la base reste en retrait
        // tandis que le haut avance progressivement vers la caméra.
        // La courbure latérale du B1 est conservée sans autre modification.
        position.setZ(
          index,
          -88 +
          upperLean * 34 -
          normalized * normalized * 4 -
          edge * edge * 44
        );

        // 96 % de la texture restent consacrés à l'image normale.
        // Les 2 % extérieurs de chaque côté sont réservés aux pixels étirés.
        const t = x / panoramaWidth + 0.5;
        const u = t < 0.24
          ? (t / 0.24) * 0.02
          : t > 0.76
            ? 0.98 + ((t - 0.76) / 0.24) * 0.02
            : 0.02 + ((t - 0.24) / 0.52) * 0.96;
        uv.setX(index, u);
      }

      position.needsUpdate = true;
      uv.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();

      const material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        fog: false,
        depthWrite: false,
        toneMapped: false
      });

      this.panorama = new THREE.Mesh(geometry, material);
      this.panorama.name = "BiomePanorama";
      this.panorama.position.y = 0;
      this.panorama.renderOrder = -10;
      this.panorama.frustumCulled = false;
      this.scene.add(this.panorama);
    }

    createDestinationMarker() {
      const geometry = new this.THREE.RingGeometry(0.34, 0.48, 40);
      const material = new this.THREE.MeshBasicMaterial({
        color: 0x6ee9ff,
        transparent: true,
        opacity: 0,
        side: this.THREE.DoubleSide,
        depthWrite: false
      });
      this.destinationMarker = new this.THREE.Mesh(geometry, material);
      this.destinationMarker.name = "BlueFoxDestinationMarker";
      this.destinationMarker.rotation.x = -Math.PI / 2;
      this.destinationMarker.position.y = 0.055;
      this.destinationMarker.visible = false;
      this.scene.add(this.destinationMarker);
    }

    createPathVisual() {
      const geometry = new this.THREE.BufferGeometry().setFromPoints([
        new this.THREE.Vector3(),
        new this.THREE.Vector3()
      ]);
      const material = new this.THREE.LineDashedMaterial({
        color: 0x70e9ff,
        transparent: true,
        opacity: 0.34,
        dashSize: 0.28,
        gapSize: 0.2,
        depthWrite: false
      });
      this.pathLine = new this.THREE.Line(geometry, material);
      this.pathLine.name = "BlueFoxPlannedPath";
      this.pathLine.visible = false;
      this.scene.add(this.pathLine);
    }

    createCharacterGrounding() {
      const geometry = new this.THREE.CircleGeometry(0.72, 32);
      const material = new this.THREE.MeshBasicMaterial({
        color: 0x020711,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        side: this.THREE.DoubleSide
      });
      this.characterGroundShadow = new this.THREE.Mesh(geometry, material);
      this.characterGroundShadow.name = "BlueFoxGroundContact";
      this.characterGroundShadow.rotation.x = -Math.PI / 2;
      this.characterGroundShadow.scale.set(1, 1.34, 1);
      this.characterGroundShadow.position.y = 0.025;
      this.scene.add(this.characterGroundShadow);
    }

    updatePathVisual(detail) {
      if (!this.pathLine || !detail?.points?.length) return;
      const points = detail.points.map(
        (point) => new this.THREE.Vector3(point.x, 0.065, point.z)
      );
      if (points.length < 2) {
        this.pathLine.visible = false;
        return;
      }
      this.pathLine.geometry.dispose();
      this.pathLine.geometry = new this.THREE.BufferGeometry().setFromPoints(points);
      this.pathLine.computeLineDistances();
      this.pathLine.visible = true;
    }

    showWorldMarker(point) {
      if (!this.destinationMarker || !point) return;
      this.destinationMarker.position.set(point.x, 0.055, point.z);
      this.destinationMarker.scale.setScalar(1);
      this.destinationMarker.material.opacity = 0.9;
      this.destinationMarker.visible = true;
      this.destinationMarkerStartedAt = performance.now();
    }

    createExtendedPanoramaTexture(image) {
      const { THREE } = this;
      const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1);
      const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1);

      // PATCH A V16.21 : cadrage vertical conservé.
      // Le haut de l'image reste intact et les 9 % inférieurs sont retirés
      // afin de laisser davantage de place au ciel.
      const visibleSourceHeight = Math.max(
        1,
        Math.round(sourceHeight * 0.91)
      );

      // PATCH C V16.21 : extension latérale progressive.
      // Les marges sont plus larges que dans la V16.20 et ne sont plus
      // remplies par une simple colonne de pixels étirée uniformément.
      const sideFill = Math.max(24, Math.round(sourceWidth * 0.075));
      const topFill = Math.max(4, Math.round(sourceHeight * 0.012));
      const bottomFill = Math.max(12, sourceHeight - visibleSourceHeight);

      const canvas = document.createElement("canvas");
      canvas.width = sourceWidth + sideFill * 2;
      canvas.height = visibleSourceHeight + topFill + bottomFill;
      const context = canvas.getContext("2d", { alpha: false });

      if (!context) {
        const fallback = new THREE.Texture(image);
        fallback.needsUpdate = true;
        fallback.colorSpace = THREE.SRGBColorSpace;
        fallback.wrapS = THREE.ClampToEdgeWrapping;
        fallback.wrapT = THREE.ClampToEdgeWrapping;
        return fallback;
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      // Partie centrale : largeur complète, haut conservé, bas recadré.
      context.drawImage(
        image,
        0,
        0,
        sourceWidth,
        visibleSourceHeight,
        sideFill,
        topFill,
        sourceWidth,
        visibleSourceHeight
      );

      // Étire progressivement une petite bande située au bord de l'image.
      // Les bandes restent fines près de la jonction puis deviennent plus
      // larges vers l'extérieur, ce qui évite l'effet de colonne répétée.
      const drawProgressiveSide = (isLeft) => {
        const strips = 36;
        const sourceBand = Math.max(8, Math.round(sourceWidth * 0.045));

        for (let index = 0; index < strips; index += 1) {
          const t0 = index / strips;
          const t1 = (index + 1) / strips;
          const eased0 = Math.pow(t0, 1.7);
          const eased1 = Math.pow(t1, 1.7);

          const destinationStart = Math.round(sideFill * t0);
          const destinationEnd = Math.round(sideFill * t1);
          const destinationWidth = Math.max(1, destinationEnd - destinationStart);

          // À la jonction, on prélève presque le pixel extérieur. En allant
          // vers le bord du canvas, on utilise progressivement une zone plus
          // profonde du bord de l'image, puis on l'étire davantage.
          const sampleDepth = Math.max(1, Math.round(sourceBand * (eased1 - eased0)));
          const sampleOffset = Math.round(sourceBand * eased0);

          const sourceX = isLeft
            ? Math.min(sourceWidth - 1, sampleOffset)
            : Math.max(0, sourceWidth - sampleOffset - sampleDepth);

          const destinationX = isLeft
            ? sideFill - destinationEnd
            : sideFill + sourceWidth + destinationStart;

          context.drawImage(
            image,
            sourceX,
            0,
            sampleDepth,
            visibleSourceHeight,
            destinationX,
            topFill,
            destinationWidth,
            visibleSourceHeight
          );
        }

        // Fusion légère au raccord pour rendre la transition imperceptible.
        const seamWidth = Math.max(6, Math.round(sourceWidth * 0.006));
        const gradient = context.createLinearGradient(
          isLeft ? sideFill - seamWidth : sideFill + sourceWidth,
          0,
          isLeft ? sideFill : sideFill + sourceWidth + seamWidth,
          0
        );
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, "rgba(0,0,0,0.18)");
        context.save();
        context.globalCompositeOperation = "source-over";
        context.fillStyle = gradient;
        context.fillRect(
          isLeft ? sideFill - seamWidth : sideFill + sourceWidth,
          topFill,
          seamWidth,
          visibleSourceHeight
        );
        context.restore();
      };

      drawProgressiveSide(true);
      drawProgressiveSide(false);

      // Haut : première ligne de l'image centrale et des extensions.
      context.drawImage(
        canvas,
        0,
        topFill,
        canvas.width,
        1,
        0,
        0,
        canvas.width,
        topFill
      );

      // Bas : dernière ligne de la zone conservée.
      const visibleBottomY = topFill + visibleSourceHeight - 1;
      context.drawImage(
        canvas,
        0,
        visibleBottomY,
        canvas.width,
        1,
        0,
        topFill + visibleSourceHeight,
        canvas.width,
        bottomFill
      );

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = Math.min(
        8,
        this.renderer?.capabilities?.getMaxAnisotropy?.() || 1
      );
      texture.needsUpdate = true;
      return texture;
    }

    async setPanorama(asset, definition = BF.maps[this.currentMapId]) {
      const loader = new this.THREE.TextureLoader();
      const catalogMap = global.BLUEFOX_MAP_ASSETS?.catalog?.maps?.find(
        (map) => map.number === definition?.number
      );

      // Source autoritaire : l'image N... portant le même numéro que la Map.
      asset = catalogMap?.scene?.url || definition?.sceneUrl || asset;
      const filename = String(asset || "").split("/").pop();
      const isTerrain = Boolean(
        global.BLUEFOX_MAP_ASSETS?.parseTerrain?.({ name: filename })
      );

      if (isTerrain) {
        asset = catalogMap?.scene?.url || definition?.sceneUrl || asset;
      }

      this.currentPanoramaAsset = asset;
      const requestedAsset = asset;

      // Retire immédiatement l'ancien panorama afin qu'aucune image résiduelle
      // ne puisse réapparaître pendant le chargement asynchrone de la suivante.
      if (this.panorama) {
        this.panorama.visible = false;
        this.panorama.material.map = null;
        this.panorama.material.needsUpdate = true;
      }
      if (this.panoramaTexture) {
        this.panoramaTexture.dispose();
        this.panoramaTexture = null;
      }

      const candidates =
        global.BLUEFOX_MAP_ASSETS?.imageUrlCandidates?.(asset) || [asset];

      const loadCandidate = (candidate) => new Promise((resolve, reject) => {
        loader.load(candidate, resolve, undefined, reject);
      });

      for (const candidate of candidates) {
        try {
          const sourceTexture = await loadCandidate(candidate);

          // Ignore une réponse devenue obsolète si une autre map a été demandée.
          if (this.currentPanoramaAsset !== requestedAsset) {
            sourceTexture?.dispose?.();
            return false;
          }
          if (!sourceTexture?.image) {
            sourceTexture?.dispose?.();
            continue;
          }

          const extendedTexture = this.createExtendedPanoramaTexture(
            sourceTexture.image
          );

          this.panoramaTexture = extendedTexture;
          this.panorama.material.map = extendedTexture;
          this.panorama.material.needsUpdate = true;
          this.panorama.visible = true;

          // La texture source n'est plus utilisée après création du canvas.
          if (sourceTexture !== extendedTexture) sourceTexture.dispose();
          return true;
        } catch {
          // Essaie le chemin candidat suivant.
        }
      }

      if (this.currentPanoramaAsset === requestedAsset) {
        global.dispatchEvent(new CustomEvent("bluefox:image-missing", {
          detail: {
            source: asset,
            role: "scène panoramique",
            mapId: this.currentMapId
          }
        }));
      }
      return false;
    }

    createTransitionElement() {
      this.transitionElement = document.createElement("div");
      this.transitionElement.className = "map-transition";
      this.transitionElement.innerHTML = "<span>CHARGEMENT DE LA MAP…</span>";
      this.container.appendChild(this.transitionElement);
    }

    createExplorationHud() {
      this.ensureCompassNeedle(true);

      this.cameraButton = document.createElement("button");
      this.cameraButton.type = "button";
      this.cameraButton.className = "bluefox-camera-button";
      this.cameraButton.setAttribute("aria-label", "Recentrer la caméra sur BlueFox");
      this.cameraButton.title = "Clic : recentrer · double-clic : suivi libre";
      this.cameraButton.innerHTML = "<span>◎</span>";
      document.body.appendChild(this.cameraButton);

      this.speechButton = document.createElement("button");
      this.speechButton.type = "button";
      this.speechButton.className = "bluefox-speech-button";
      this.speechButton.setAttribute("aria-label", "Afficher ou masquer les paroles de BlueFox");
      this.speechButton.title = "Afficher ou masquer les paroles de BlueFox";
      this.speechButton.innerHTML = "<span>💬</span>";
      document.body.appendChild(this.speechButton);

      this.onCameraClick = () => {
        window.clearTimeout(this.cameraClickTimer);
        this.cameraClickTimer = window.setTimeout(() => {
          this.cameraController.resetBehindCharacter(false);
          this.callbacks.onStatus("Caméra recentrée derrière BlueFox.");
        }, 240);
      };
      this.onCameraDoubleClick = (event) => {
        event.preventDefault();
        window.clearTimeout(this.cameraClickTimer);
        const mode = this.cameraController.toggleFreeFollow();
        this.updateCameraButton(mode);
        this.callbacks.onStatus(
          mode === "free-follow"
            ? "Caméra libre : elle conserve son point de vue tout en suivant BlueFox."
            : "Caméra ancrée : recentrage automatique après 3,5 secondes."
        );
      };
      this.onCameraMode = (event) => this.updateCameraButton(event.detail.mode);
      this.cameraButton.addEventListener("click", this.onCameraClick);
      this.cameraButton.addEventListener("dblclick", this.onCameraDoubleClick);
      this.onSpeechToggle = () => {
        this.speechVisible = !this.speechVisible;
        localStorage.setItem(
          "bluefox_speech_visible_v1",
          String(this.speechVisible)
        );
        this.updateSpeechButton();
      };
      this.speechButton.addEventListener("click", this.onSpeechToggle);
      global.addEventListener("bluefox:camera-mode", this.onCameraMode);
      this.updateCameraButton(this.cameraController.mode);
      this.updateSpeechButton();
    }

    ensureCompassNeedle(force = false) {
      const now = performance.now();
      if (!force && now - this.lastCompassCheck < 1000) return;
      this.lastCompassCheck = now;
      const compass = document.querySelector(".compass-pad > span");
      if (!compass) return;
      const attachedNeedle = compass.querySelector(".bluefox-compass-needle");
      if (attachedNeedle) {
        this.compassNeedle = attachedNeedle;
        return;
      }
      this.compassNeedle = document.createElement("i");
      this.compassNeedle.className = "bluefox-compass-needle";
      compass.appendChild(this.compassNeedle);
    }

    updateCameraButton(mode) {
      if (!this.cameraButton) return;
      const free = mode === "free-follow";
      this.cameraButton.classList.toggle("free", free);
      this.cameraButton.setAttribute("aria-pressed", free ? "true" : "false");
      this.cameraButton.querySelector("span").textContent = free ? "⊘" : "◎";
    }

    updateSpeechButton() {
      document.body.classList.toggle(
        "bluefox-speech-hidden",
        !this.speechVisible
      );
      this.speechButton?.classList.toggle("disabled", !this.speechVisible);
      this.speechButton?.setAttribute(
        "aria-pressed",
        this.speechVisible ? "true" : "false"
      );
    }

    initializePlanetaryClock() {
      const defaultGameMinutes = 8 * 60 + 42;
      try {
        const saved = JSON.parse(localStorage.getItem("bluefox_planet_clock_v1") || "null");
        this.planetClock = saved && Number.isFinite(saved.gameMinutes)
          ? saved
          : { gameMinutes: defaultGameMinutes, realTime: Date.now() };
      } catch {
        this.planetClock = { gameMinutes: defaultGameMinutes, realTime: Date.now() };
      }
      this.updatePlanetaryClock(true);
    }

    updatePlanetaryClock(force = false) {
      const now = Date.now();
      if (!force && now - this.lastCycleUpdate < 1000) return;
      const elapsedSeconds = Math.max(0, (now - this.planetClock.realTime) / 1000);
      const totalMinutes = this.planetClock.gameMinutes + elapsedSeconds;
      const minutesPerDay = 20 * 60;
      const day = Math.floor(totalMinutes / minutesPerDay) + 1;
      const minuteOfDay = Math.floor(totalMinutes % minutesPerDay);
      const hour = Math.floor(minuteOfDay / 60);
      const minute = minuteOfDay % 60;
      // Cycle de 20 h : 15 h de jour et seulement 5 h de nuit.
      const isNight = hour < 2 || hour >= 17;
      const daylight = isNight
        ? 0
        : Math.sin(((minuteOfDay - 2 * 60) / (15 * 60)) * Math.PI);

      const block = document.querySelector(".day-block");
      if (block) {
        const dayElement = block.querySelector("span");
        const timeElement = block.querySelector("strong");
        const detailElement = block.querySelector("small");
        if (dayElement) dayElement.textContent = `JOUR ${String(day).padStart(2, "0")}`;
        if (timeElement) {
          timeElement.textContent =
            `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        }
        if (detailElement) {
          const temperature = Math.round(11 + daylight * 8);
          detailElement.textContent =
            `${isNight ? "NUIT" : "JOUR"} · Cycle calme · ${temperature} °C`;
        }
        block.classList.toggle("night", isNight);
      }

      this.hemisphere.intensity = BF.damp(
        this.hemisphere.intensity,
        1.15 + daylight * 1.8,
        2,
        1
      );
      this.sun.intensity = BF.damp(this.sun.intensity, 0.45 + daylight * 3.8, 2, 1);
      this.fill.intensity = BF.damp(this.fill.intensity, isNight ? 1.7 : 0.75, 2, 1);
      if (this.biomeParticles && this.biomeParticleSettings) {
        this.biomeParticles.material.opacity =
          this.biomeParticleSettings.baseOpacity * (isNight ? 1.15 : 0.78);
      }
      this.renderer.toneMappingExposure = BF.damp(
        this.renderer.toneMappingExposure,
        isNight ? 0.88 : 1.06,
        2,
        1
      );
      this.lastCycleUpdate = now;
      if (force || now % 10000 < 1100) {
        localStorage.setItem("bluefox_planet_clock_v1", JSON.stringify({
          gameMinutes: totalMinutes,
          realTime: now
        }));
        this.planetClock = { gameMinutes: totalMinutes, realTime: now };
      }
    }

    showClickMarker(event) {
      if (!this.clickMarker) {
        this.clickMarker = document.createElement("i");
        this.clickMarker.className = "bluefox-click-marker";
        document.body.appendChild(this.clickMarker);
      }
      this.clickMarker.style.left = `${event.clientX}px`;
      this.clickMarker.style.top = `${event.clientY}px`;
      this.clickMarker.classList.remove("active");
      void this.clickMarker.offsetWidth;
      this.clickMarker.classList.add("active");
    }

    bindEvents() {
      this.onPointerDown = (event) => {
        this.pointerDown.x = event.clientX;
        this.pointerDown.y = event.clientY;
      };
      this.onPointerUp = (event) => {
        if (Math.hypot(
          event.clientX - this.pointerDown.x,
          event.clientY - this.pointerDown.y
        ) > 8) return;
        this.handlePointer(event);
      };
      this.onNavigate = (event) => this.handleNavigationSuggestion(event.detail);
      this.onReturnBase = () => this.returnToBase();
      this.onPathPlanned = (event) => this.updatePathVisual(event.detail);
      this.onNavigationFailed = () => {
        this.navigationFailures += 1;
        const wasResource = Boolean(this.pendingInteraction);
        const wasGate = Boolean(this.pendingGate);
        this.pendingInteraction = null;
        this.pendingGate = null;
        this.pendingZoneExploration = null;
        this.interactionStartedAt = 0;
        this.interactionApproachStartedAt = 0;
        this.interactionApproachAttempts = 0;
        this.destinationMarker && (this.destinationMarker.visible = false);
        this.pathLine && (this.pathLine.visible = false);
        this.lastAutonomyAt = performance.now() - 5200;
        this.lastActivityAt = performance.now();
        this.callbacks.onStatus(
          wasResource
            ? "BlueFox change d’approche : cette ressource est momentanément inaccessible."
            : wasGate
              ? "BlueFox interrompt ce trajet vers le passage et réévalue la route."
              : "BlueFox abandonne ce trajet impossible et choisit une autre destination."
        );
      };
      this.onVisibilityChange = () => {
        if (document.visibilityState !== "visible" || this.disposed) return;
        const now = performance.now();
        this.resumeCount += 1;
        this.lastResumeAt = now;
        this.clock?.getDelta();
        this.gateCooldownUntil = Math.max(this.gateCooldownUntil, now + 900);
        this.character.lastSafePosition.copy(this.character.root.position);
        this.cameraController.previousCharacterPosition.copy(
          this.character.root.position
        );
        this.cameraController.ensureHealthy(now);
        this.lastActivityAt = now;
        this.lastAutonomyAt = Math.min(this.lastAutonomyAt, now - 4800);
        this.resize();
      };
      this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
      this.renderer.domElement.addEventListener("pointerup", this.onPointerUp);
      global.addEventListener("bluefox:navigate", this.onNavigate);
      global.addEventListener("bluefox:return-base", this.onReturnBase);
      global.addEventListener("bluefox:path-planned", this.onPathPlanned);
      global.addEventListener("bluefox:navigation-failed", this.onNavigationFailed);
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    }

    async returnToBase() {
      if (this.transitioning) return;
      if (this.currentMapId === "crystal") {
        const camp = new this.THREE.Vector3(0, 0, 8);
        this.pendingInteraction = null;
        this.pendingGate = null;
        this.character.setTarget(camp);
        this.showWorldMarker(camp);
        this.callbacks.onStatus("BlueFox revient vers le refuge.");
        return;
      }
      this.transitioning = true;
      this.character.enabled = false;
      this.character.stop();
      this.transitionElement.classList.add("active");
      this.callbacks.onStatus("BlueFox utilise les passages mémorisés pour revenir à la base.");
      try {
        await new Promise((resolve) => setTimeout(resolve, 340));
        await this.loadMap("crystal", null, true);
        const camp = new this.THREE.Vector3(0, 0, 8);
        this.character.root.position.copy(camp);
        this.character.setTarget(camp);
        this.character.lastSafePosition.copy(camp);
        this.savePosition();
        await new Promise((resolve) => setTimeout(resolve, 220));
        this.cameraController.resetBehindCharacter(true);
      } catch (error) {
        console.error("Échec du retour à la base", error);
        this.callbacks.onStatus("Le retour a échoué. BlueFox reste dans la zone actuelle.");
      } finally {
        this.transitionElement.classList.remove("active");
        this.character.enabled = true;
        this.transitioning = false;
      }
    }

    handlePointer(event) {
      if (this.transitioning) return;
      this.navigationRoute = [];
      this.showClickMarker(event);
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(this.pointer, this.camera);

      const hits = this.raycaster.intersectObjects(
        this.currentMap.interactables,
        false
      );
      if (hits.length) {
        const object = hits[0].object;
        if (object.userData.active) this.targetInteraction(object);
        return;
      }

      const point = new this.THREE.Vector3();
      if (!this.raycaster.ray.intersectPlane(this.groundPlane, point)) return;
      const mapBounds = this.currentMap?.bounds || 27;
      point.x = BF.clamp(point.x, -mapBounds, mapBounds);
      point.z = BF.clamp(point.z, -mapBounds, mapBounds);
      this.pendingInteraction = null;
      this.pendingZoneExploration = null;
      this.character.cancelInteraction();
      this.character.setTarget(point);
      this.showWorldMarker(point);
      this.callbacks.onStatus("BlueFox suit progressivement la destination suggérée.");
    }

    async generateUnknownPassage(direction) {
      const opposites = {
        north: "south", south: "north", east: "west", west: "east"
      };
      const opposite = opposites[direction];
      const currentDefinition = BF.maps[this.currentMapId];
      if (!opposite || !currentDefinition) return;
      const existing = currentDefinition.exits[direction];
      if (existing) {
        this.handleNavigationSuggestion({ mapId: existing.targetMap });
        return;
      }
      const candidates = Object.values(BF.maps)
        .filter((map) =>
          map.id !== this.currentMapId &&
          !this.discoveredMaps.has(map.id) &&
          !map.exits[opposite]
        )
        .sort((left, right) => left.number - right.number);
      if (!candidates.length) {
        this.callbacks.onStatus(
          "Aucun territoire compatible ne peut être généré dans cette direction."
        );
        return;
      }
      const key = `${this.currentMapId}:${direction}`;
      let hash = 2166136261;
      for (const character of key) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      }
      const destination = candidates[(hash >>> 0) % candidates.length];
      const link = { from: this.currentMapId, direction, to: destination.id };
      if (!this.applyGeneratedLink(link)) return;
      this.generatedTopology.push(link);
      localStorage.setItem(
        "bluefox_generated_topology_v1",
        JSON.stringify(this.generatedTopology)
      );

      const position = this.character.root.position.clone();
      await this.loadMap(this.currentMapId, null, false);
      this.character.root.position.copy(position);
      this.character.setTarget(position);
      const gate = this.currentMap.gates.find(
        (candidate) => candidate.userData.exit.targetMap === destination.id
      );
      if (!gate) return;
      this.pendingGate = gate;
      this.character.setPlayerSprint(24);
      this.character.setTarget(gate.position);
      this.showWorldMarker(gate.position);
      const frenchDirection = {
        north: "le Nord", south: "le Sud", east: "l’Est", west: "l’Ouest"
      }[direction];
      this.callbacks.onStatus(
        `BlueFox se dirige vers une terre inconnue vers ${frenchDirection}.`
      );
      this.callbacks.onAction(
        "Une route vient d’être générée sur demande du joueur. Le biome reste inconnu jusqu’au passage."
      );
    }

    handleNavigationSuggestion(detail) {
      if (!detail || this.transitioning) return;
      if (detail.discoverUnknown && detail.direction) {
        this.generateUnknownPassage(detail.direction);
        return;
      }
      if (detail.mapId && detail.mapId !== this.currentMapId) {
        const route = this.findKnownRoute(this.currentMapId, detail.mapId);
        if (!route) {
          this.callbacks.onStatus(
            "Aucun itinéraire exploré ne relie encore ces deux Zones."
          );
          return;
        }
        this.navigationRoute = route.slice(1);
        this.callbacks.onStatus(
          `BlueFox prépare un itinéraire vers ${BF.maps[detail.mapId].name}.`
        );
        this.navigateNextRouteStep();
        return;
      }
      const centerOffset = this.currentMapId === "jungle" ? 64 : 0;
      const target = new this.THREE.Vector3(
        BF.clamp((detail.x || 0) - centerOffset, -27, 27),
        0,
        BF.clamp(detail.z || 0, -27, 27)
      );
      this.character.setPlayerSprint(16);
      this.character.setTarget(target);
      this.showWorldMarker(target);
    }

    findKnownRoute(startMapId, targetMapId) {
      if (startMapId === targetMapId) return [startMapId];
      if (!this.discoveredMaps.has(targetMapId)) return null;
      const queue = [[startMapId]];
      const visited = new Set([startMapId]);
      while (queue.length) {
        const route = queue.shift();
        const currentId = route[route.length - 1];
        const exits = Object.values(BF.maps[currentId]?.exits || {});
        for (const exit of exits) {
          const nextId = exit.targetMap;
          if (!nextId || visited.has(nextId) || !this.discoveredMaps.has(nextId)) {
            continue;
          }
          const nextRoute = [...route, nextId];
          if (nextId === targetMapId) return nextRoute;
          visited.add(nextId);
          queue.push(nextRoute);
        }
      }
      return null;
    }

    navigateNextRouteStep() {
      const nextMapId = this.navigationRoute[0];
      if (!nextMapId || nextMapId === this.currentMapId) {
        if (nextMapId === this.currentMapId) this.navigationRoute.shift();
        if (!this.navigationRoute.length) return;
      }
      const destinationId = this.navigationRoute[0];
      const gate = this.currentMap.gates.find(
        (candidate) => candidate.userData.exit.targetMap === destinationId
      );
      if (!gate) {
        this.navigationRoute = [];
        this.callbacks.onStatus("L’itinéraire mémorisé est devenu impraticable.");
        return;
      }
      this.pendingGate = gate;
      this.character.setPlayerSprint(24);
      this.character.setTarget(gate.position);
      this.showWorldMarker(gate.position);
      this.callbacks.onStatus(
        `BlueFox rejoint le passage vers ${BF.maps[destinationId].name}.`
      );
    }

    interactionApproachPoint(object, attempt = 0) {
      const anchor = object.userData.worldAnchor || object;
      const colliderRadius = object.userData.interactionRadius || 0.5;
      const approachDistance =
        colliderRadius + this.character.radius + 0.22;
      const fromResource = this.character.root.position.clone()
        .sub(anchor.position);
      fromResource.y = 0;
      if (fromResource.lengthSq() < 0.001) fromResource.set(0, 0, 1);
      const baseAngle = Math.atan2(fromResource.z, fromResource.x);
      const colliders = this.currentMap.colliders.filter(
        (collider) => collider.owner !== anchor
      );
      const candidates = [];
      for (let index = 0; index < 12; index += 1) {
        const alternatingStep = index === 0
          ? 0
          : Math.ceil(index / 2) * (index % 2 ? 1 : -1);
        const angle = baseAngle +
          (alternatingStep + attempt * 2) * (Math.PI / 6);
        const point = new this.THREE.Vector3(
          anchor.position.x + Math.cos(angle) * approachDistance,
          0,
          anchor.position.z + Math.sin(angle) * approachDistance
        );
        const mapBounds = (this.currentMap?.bounds || 27) - 0.4;
        if (Math.abs(point.x) > mapBounds || Math.abs(point.z) > mapBounds) continue;
        const clear = colliders.every((collider) =>
          point.distanceTo(collider.position) >=
            this.character.radius + collider.radius + 0.16
        );
        if (!clear) continue;
        const path = this.character.pathPlanner.plan(
          this.character.root.position,
          point,
          colliders,
          this.character.radius,
          0.16
        );
        const pathLength = path.reduce((total, waypoint, pathIndex) => {
          const previous = pathIndex
            ? path[pathIndex - 1]
            : this.character.root.position;
          return total + previous.distanceTo(waypoint);
        }, 0);
        candidates.push({ point, pathLength });
      }
      candidates.sort((a, b) => a.pathLength - b.pathLength);
      return {
        point: candidates[0]?.point || this.character.pathPlanner.nearestClearGoal(
          anchor.position.clone().add(fromResource.normalize()
            .multiplyScalar(approachDistance)),
          colliders,
          this.character.radius,
          0.2
        ),
        approachDistance
      };
    }

    targetInteraction(object, retry = false) {
      this.pendingZoneExploration = null;
      const approach = this.interactionApproachPoint(
        object,
        retry ? this.interactionApproachAttempts : 0
      );
      this.pendingInteraction = object;
      object.userData.approachDistance = approach.approachDistance;
      this.interactionStartedAt = 0;
      this.interactionApproachStartedAt = performance.now();
      if (!retry) this.interactionApproachAttempts = 0;
      this.character.setTarget(approach.point);
      this.showWorldMarker(approach.point);
      this.callbacks.onStatus(
        object.userData.kind === "crystal"
          ? "BlueFox approche le cristal avant de le récolter."
          : "BlueFox approche les fibres avant de les prélever."
      );
    }

    async loadMap(mapId, entry, announce = true) {
      const definition = BF.maps[mapId];
      if (!definition) throw new Error(`Map inconnue: ${mapId}`);
      this.ensureMapContinuation(mapId);
      const previousMap = this.currentMap;
      const nextMap = BF.buildMap(
        this.THREE,
        definition,
        this.assets,
        this.renderer
      );
      this.scene.add(nextMap.group);
      this.currentMap = nextMap;
      this.currentMapId = mapId;
      global.dispatchEvent(new CustomEvent("bluefox:map-state", {
        detail: {
          mapId,
          number: this.discoveryNumber(mapId),
          name: definition.name,
          sceneUrl:
            global.BLUEFOX_MAP_ASSETS?.catalog?.maps?.find(
              (map) => map.number === definition.number
            )?.scene?.url ||
            definition.sceneUrl ||
            this.assets[definition.sceneAsset]
        }
      }));
      if (this.character?.pathPlanner) {
        this.character.pathPlanner.bounds = nextMap.bounds || 27;
      }
      this.character?.setColliders(nextMap.colliders);
      await this.setPanorama(
        definition.sceneUrl || this.assets[definition.sceneAsset],
        definition
      );
      this.applyBiomeAtmosphere(definition);
      this.currentZoneIndex = -1;
      this.pendingZoneExploration = null;
      // Évite que l’ancien plateau reste superposé au nouveau (z-fighting).
      previousMap?.group?.removeFromParent();
      previousMap?.dispose();
      if (announce) {
        if (mapId === "crystal" || mapId === "jungle") {
          this.callbacks.onMapChange(mapId);
        }
        this.callbacks.onAction(`Map chargée : ${definition.name}.`);
      }
      this.updateCurrentZone(performance.now(), true);
      return entry;
    }

    applyBiomeAtmosphere(definition) {
      const profiles = {
        volcanic: {
          sky: 0x24111a, fog: 0x3a1720, density: 0.014,
          hemiSky: 0xffa26b, hemiGround: 0x271018,
          sun: 0xffc08a, fill: 0xff5a36
        },
        frozen: {
          sky: 0x0b1d32, fog: 0x9bc6dc, density: 0.01,
          hemiSky: 0xdaf4ff, hemiGround: 0x294157,
          sun: 0xe8fbff, fill: 0x72cfff
        },
        forest: {
          sky: 0x071b19, fog: 0x163c35, density: 0.014,
          hemiSky: 0xd8eee4, hemiGround: 0x27312e,
          sun: 0xfff4dc, fill: 0xb9d8ca
        },
        ruins: {
          sky: 0x091a20, fog: 0x183b39, density: 0.012,
          hemiSky: 0xd7e9e1, hemiGround: 0x303734,
          sun: 0xfff1d7, fill: 0xb9d2c7
        },
        aquatic: {
          sky: 0x06182b, fog: 0x0b4260, density: 0.016,
          hemiSky: 0x75eaff, hemiGround: 0x092c3e,
          sun: 0xb6f8ff, fill: 0x47cfff
        },
        desert: {
          sky: 0x251811, fog: 0x8a6248, density: 0.009,
          hemiSky: 0xffd0a0, hemiGround: 0x503526,
          sun: 0xffe1b8, fill: 0xff9f62
        },
        crystalline: {
          sky: 0x08172a, fog: 0x183650, density: 0.011,
          hemiSky: 0xa4e8ff, hemiGround: 0x1e3044,
          sun: 0xd4f4ff, fill: 0x64e6ff
        },
        alien: {
          sky: 0x0b1427, fog: 0x182844, density: 0.012,
          hemiSky: 0xb7d8ff, hemiGround: 0x20283b,
          sun: 0xe4e8ff, fill: 0x9d8cff
        }
      };
      const profile = definition.profile || "alien";
      const atmosphere = profiles[profile] || profiles.alien;
      this.scene.background.setHex(atmosphere.sky);
      this.scene.fog.color.setHex(atmosphere.fog);
      this.scene.fog.density = atmosphere.density;
      this.hemisphere.color.setHex(atmosphere.hemiSky);
      this.hemisphere.groundColor.setHex(atmosphere.hemiGround);
      this.sun.color.setHex(atmosphere.sun);
      this.fill.color.setHex(atmosphere.fill);
      this.currentAtmosphereProfile = profile;
      this.createBiomeParticles(profile);
    }

    createBiomeParticles(profile) {
      if (this.biomeParticles) {
        this.scene.remove(this.biomeParticles);
        this.biomeParticles.geometry.dispose();
        this.biomeParticles.material.dispose();
        this.biomeParticles = null;
      }
      const settingsByProfile = {
        volcanic: { color: 0xff7a42, count: 36, size: 0.11, motion: "rise", speed: 0.72, opacity: 0.55 },
        frozen: { color: 0xe8fbff, count: 48, size: 0.1, motion: "fall", speed: 0.62, opacity: 0.62 },
        forest: { color: 0xa8ffd2, count: 34, size: 0.09, motion: "float", speed: 0.28, opacity: 0.48 },
        ruins: { color: 0x9effd5, count: 24, size: 0.08, motion: "float", speed: 0.22, opacity: 0.38 },
        aquatic: { color: 0x69e9ff, count: 42, size: 0.12, motion: "rise", speed: 0.3, opacity: 0.52 },
        desert: { color: 0xffd0a0, count: 32, size: 0.075, motion: "drift", speed: 0.48, opacity: 0.32 },
        crystalline: { color: 0x8cecff, count: 30, size: 0.085, motion: "float", speed: 0.24, opacity: 0.46 },
        alien: { color: 0xb7cfff, count: 26, size: 0.08, motion: "float", speed: 0.22, opacity: 0.4 }
      };
      const settings = settingsByProfile[profile] || settingsByProfile.alien;
      const positions = new Float32Array(settings.count * 3);
      const phases = new Float32Array(settings.count);
      for (let index = 0; index < settings.count; index += 1) {
        const phase = (index * 2.3999632297 + profile.length * 0.71) % (Math.PI * 2);
        const radius = 6 + ((index * 17 + profile.length * 11) % 34);
        positions[index * 3] = Math.cos(phase) * radius;
        positions[index * 3 + 1] = 0.35 + ((index * 13) % 78) / 10;
        positions[index * 3 + 2] = Math.sin(phase) * radius;
        phases[index] = phase;
      }
      const geometry = new this.THREE.BufferGeometry();
      geometry.setAttribute("position", new this.THREE.BufferAttribute(positions, 3));
      const material = new this.THREE.PointsMaterial({
        color: settings.color,
        size: settings.size,
        transparent: true,
        opacity: settings.opacity,
        depthWrite: false,
        blending: this.THREE.AdditiveBlending,
        sizeAttenuation: true
      });
      this.biomeParticles = new this.THREE.Points(geometry, material);
      this.biomeParticles.name = `BiomeParticles_${profile}`;
      this.biomeParticles.frustumCulled = false;
      this.biomeParticleSettings = { ...settings, phases, baseOpacity: settings.opacity };
      const qualityParticleRatios = { high: 1, balanced: 0.72, low: 0.45 };
      const visibleCount = Math.max(
        12,
        Math.round(
          settings.count *
          (qualityParticleRatios[this.performanceQuality] || 1)
        )
      );
      geometry.setDrawRange(0, visibleCount);
      this.scene.add(this.biomeParticles);
    }

    updateBiomeParticles(dt, elapsedTime) {
      if (!this.biomeParticles || !this.biomeParticleSettings) return;
      const settings = this.biomeParticleSettings;
      const attribute = this.biomeParticles.geometry.getAttribute("position");
      const positions = attribute.array;
      for (let index = 0; index < settings.count; index += 1) {
        const offset = index * 3;
        const phase = settings.phases[index];
        if (settings.motion === "rise") {
          positions[offset + 1] += settings.speed * dt;
          if (positions[offset + 1] > 8.2) positions[offset + 1] = 0.25;
        } else if (settings.motion === "fall") {
          positions[offset + 1] -= settings.speed * dt;
          positions[offset] += Math.sin(elapsedTime * 0.7 + phase) * 0.08 * dt;
          if (positions[offset + 1] < 0.2) positions[offset + 1] = 8.1;
        } else if (settings.motion === "drift") {
          positions[offset] += settings.speed * dt;
          positions[offset + 1] += Math.sin(elapsedTime + phase) * 0.035 * dt;
          if (positions[offset] > 42) positions[offset] = -42;
        } else {
          positions[offset] += Math.sin(elapsedTime * 0.45 + phase) * 0.045 * dt;
          positions[offset + 1] += Math.cos(elapsedTime * 0.38 + phase) * 0.025 * dt;
        }
      }
      attribute.needsUpdate = true;
    }

    updatePerformanceGovernor(dt) {
      if (document.hidden || this.transitioning) return;
      if (this.performanceWarmup > 0) {
        this.performanceWarmup -= dt;
        return;
      }
      this.performanceFrames += 1;
      this.performanceElapsed += dt;
      if (this.performanceElapsed < 4) return;

      const fps = this.performanceFrames / this.performanceElapsed;
      this.measuredFps = Math.round(fps);
      this.performanceFrames = 0;
      this.performanceElapsed = 0;

      if (fps < 40) {
        this.performanceLowSamples += 1;
        this.performanceHighSamples = 0;
      } else if (fps > 54) {
        this.performanceHighSamples += 1;
        this.performanceLowSamples = 0;
      } else {
        this.performanceLowSamples = 0;
        this.performanceHighSamples = 0;
      }

      if (this.performanceLowSamples >= 2) {
        const nextQuality =
          this.performanceQuality === "high" ? "balanced" : "low";
        this.applyPerformanceQuality(nextQuality);
        this.performanceLowSamples = 0;
        this.performanceWarmup = 6;
      } else if (this.performanceHighSamples >= 4) {
        const nextQuality =
          this.performanceQuality === "low" ? "balanced" : "high";
        this.applyPerformanceQuality(nextQuality);
        this.performanceHighSamples = 0;
        this.performanceWarmup = 10;
      }
    }

    applyPerformanceQuality(quality) {
      if (quality === this.performanceQuality) return;
      const presets = {
        high: { pixelRatio: 2, particleRatio: 1, shadows: true },
        balanced: { pixelRatio: 1.5, particleRatio: 0.72, shadows: true },
        low: { pixelRatio: 1, particleRatio: 0.45, shadows: false }
      };
      const preset = presets[quality] || presets.high;
      this.performanceQuality = quality;
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, preset.pixelRatio));
      this.renderer.shadowMap.enabled = preset.shadows;
      this.sun.castShadow = preset.shadows;
      if (this.biomeParticles && this.biomeParticleSettings) {
        const visibleCount = Math.max(
          12,
          Math.round(this.biomeParticleSettings.count * preset.particleRatio)
        );
        this.biomeParticles.geometry.setDrawRange(0, visibleCount);
      }
      this.resize();
      this.callbacks.onStatus(
        quality === "high"
          ? "Qualité 3D élevée restaurée."
          : quality === "balanced"
            ? "Qualité 3D équilibrée pour maintenir la fluidité."
            : "Qualité 3D allégée automatiquement pour cet appareil."
      );
    }

    updateCurrentZone(now, force = false) {
      if (!this.currentMap?.zoneRegions?.length) return;
      if (!force && now - this.lastZoneCheckAt < 500) return;
      this.lastZoneCheckAt = now;
      let nearest = this.currentMap.zoneRegions[0];
      let nearestDistance = Infinity;
      this.currentMap.zoneRegions.forEach((zone) => {
        const distance = this.character.root.position.distanceTo(zone.center);
        if (distance < nearestDistance) {
          nearest = zone;
          nearestDistance = distance;
        }
      });
      const reachedPlannedZone =
        this.pendingZoneExploration?.index === nearest.index;
      if (
        !force &&
        nearest.index === this.currentZoneIndex &&
        !reachedPlannedZone
      ) return;
      this.currentZoneIndex = nearest.index;
      const zoneKey = `${this.currentMapId}:map`;
      if (!this.discoveredZones.has(zoneKey)) {
        this.discoveredZones.add(zoneKey);
        this.saveZoneDiscovery();
        this.callbacks.onAction(
          `Nouvelle zone explorée : ${this.currentMap.definition.name}.`
        );
      }
      if (reachedPlannedZone) {
        const preciseZoneKey = `${this.currentMapId}:${nearest.index}`;
        if (!this.discoveredZones.has(preciseZoneKey)) {
          this.discoveredZones.add(preciseZoneKey);
          this.saveZoneDiscovery();
        }
        this.callbacks.onStatus(
          `BlueFox commence l’étude du plateau ${nearest.index + 1}.`
        );
        this.pendingZoneExploration = null;
        this.lastAutonomyAt = now - 5000;
        this.missionManager?.notifyActionCompleted(
          BF.Missions.ActionType.EXPLORE_ZONE,
          {
            mapId: this.currentMapId,
            zoneIndex: nearest.index,
            amount: 1
          }
        );
      }
      this.callbacks.onZoneChange(
        this.currentMapId,
        `Zone ${this.currentMap.definition.number || 1}`
      );
    }

    canDiscoverMap(mapId) {
      return this.discoveredMaps.has(mapId) ||
        document.visibilityState === "visible";
    }

    safeEntryPosition(targetMap, previousMapId, requestedEntry) {
      const entries = Object.entries(targetMap.runtimeExits || targetMap.exits);
      const matched = entries.find(([direction, candidate]) =>
        direction === requestedEntry || candidate.targetMap === previousMapId
      );
      if (!matched) {
        return new this.THREE.Vector3(targetMap.entry.x, 0, targetMap.entry.z);
      }
      const [, exit] = matched;
      const inward = new this.THREE.Vector3(-exit.x, 0, -exit.z);
      if (inward.lengthSq() < 0.001) inward.set(0, 0, 1);
      inward.normalize();
      const spawn = new this.THREE.Vector3(exit.x, 0, exit.z)
        .addScaledVector(inward, 4.4);
      const minimumClearance = this.character.radius + 0.28;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const blocked = this.currentMap.colliders.some((collider) =>
          spawn.distanceTo(collider.position) <
            minimumClearance + collider.radius
        );
        if (!blocked) return spawn;
        spawn.addScaledVector(inward, 0.8);
      }
      return new this.THREE.Vector3(targetMap.entry.x, 0, targetMap.entry.z);
    }

    async crossGate(gate) {
      if (this.transitioning) return;
      const exit = gate.userData.exit;
      const previousMapId = this.currentMapId;
      if (!this.canDiscoverMap(exit.targetMap)) {
        this.pendingGate = null;
        this.character.stop();
        this.callbacks.onStatus(
          "Première exploration verrouillée : elle exige une partie active et connectée."
        );
        return;
      }

      this.transitioning = true;
      this.transitionStartedAt = performance.now();
      this.character.enabled = false;
      this.character.stop();
      this.transitionElement.classList.add("active");
      try {
        await new Promise((resolve) => setTimeout(resolve, 340));

        const isNew = !this.discoveredMaps.has(exit.targetMap);
        if (isNew) this.ensureUniqueMapName(exit.targetMap);
        await this.loadMap(exit.targetMap, null, true);
        const targetMap = BF.maps[exit.targetMap];
        const spawn = this.safeEntryPosition(
          targetMap,
          previousMapId,
          exit.targetEntry
        );
        this.character.root.position.set(spawn.x, 0, spawn.z);
        this.character.setTarget(this.character.root.position);
        this.character.lastSafePosition.copy(this.character.root.position);
        this.character.facePoint(new this.THREE.Vector3(0, 0, 0));
        if (isNew) {
          this.discoveredMaps.add(exit.targetMap);
          this.saveDiscovery();
          if (exit.targetMap === "crystal" || exit.targetMap === "jungle") {
            this.callbacks.onMapDiscovered(exit.targetMap);
          }
        }
        this.pendingGate = null;
        this.gateCooldownUntil = performance.now() + 2600;
        this.lastActivityAt = performance.now();
        this.lastAutonomyAt = performance.now() - 4200;
        this.savePosition();

        await new Promise((resolve) => setTimeout(resolve, 220));
        this.cameraController.resetBehindCharacter(true);
        this.completedTransitions += 1;
      } catch (error) {
        console.error("Échec du passage de map", error);
        this.pendingGate = null;
        this.navigationRoute = [];
        this.callbacks.onStatus(
          "Le passage n’a pas pu être franchi. BlueFox reprend son exploration dans la zone actuelle."
        );
      } finally {
        this.transitionElement.classList.remove("active");
        this.character.enabled = true;
        this.transitioning = false;
        this.transitionStartedAt = 0;
        if (this.navigationRoute[0] === this.currentMapId) {
          this.navigationRoute.shift();
        }
        if (this.navigationRoute.length) {
          window.setTimeout(() => this.navigateNextRouteStep(), 2700);
        }
      }
    }

    updateInteraction(now) {
      if (!this.pendingInteraction || !this.pendingInteraction.userData.active) return;
      const distance = this.character.root.position.distanceTo(
        (this.pendingInteraction.userData.worldAnchor || this.pendingInteraction).position
      );
      const interactionDistance =
        (this.pendingInteraction.userData.approachDistance || 1.36) + 0.18;
      if (distance > interactionDistance) {
        if (
          !this.interactionStartedAt &&
          now - this.interactionApproachStartedAt > 6500
        ) {
          this.interactionApproachAttempts += 1;
          if (this.interactionApproachAttempts <= 3) {
            this.targetInteraction(this.pendingInteraction, true);
          } else {
            this.callbacks.onStatus(
              "BlueFox renonce temporairement à cette ressource inaccessible."
            );
            this.pendingInteraction = null;
            this.interactionApproachStartedAt = 0;
            this.interactionApproachAttempts = 0;
            this.character.stop();
            this.missionManager?.cancelCurrentAction("resource-inaccessible");
          }
        }
        return;
      }
      this.character.stop();
      if (!this.interactionStartedAt) {
        this.interactionStartedAt = now;
        this.character.facePoint(
          (this.pendingInteraction.userData.worldAnchor || this.pendingInteraction).position
        );
        const duration = this.character.playInteraction(this.pendingInteraction.userData.kind);
        this.interactionDuration = duration * 1000;
        this.callbacks.onAction(
          this.pendingInteraction.userData.kind === "crystal"
            ? "BlueFox récolte méthodiquement un cristal."
            : "BlueFox prélève uniquement les fibres arrivées à maturité."
        );
        if (this.speechVisible && now - this.lastSpeechAt > 3200) {
          this.callbacks.onSpeak(
            this.pendingInteraction.userData.kind === "crystal"
              ? "Je prélève ce cristal pour l’étape en cours."
              : "Je récolte uniquement les fibres arrivées à maturité."
          );
          this.lastSpeechAt = now;
        }
        return;
      }
      if (now - this.interactionStartedAt < this.interactionDuration) return;

      const object = this.pendingInteraction;
      const anchor = object.userData.worldAnchor || object;
      this.character.cancelInteraction();
      object.userData.active = false;
      anchor.visible = false;
      this.callbacks.onCollect(object.userData.kind);
      this.completedInteractions += 1;
      this.lastCompletedAction = object.userData.kind;
      this.missionManager?.notifyActionCompleted(
        BF.Missions.ActionType.COLLECT,
        { kind: object.userData.kind, amount: 1 }
      );
      this.pendingInteraction = null;
      this.interactionStartedAt = 0;
      this.interactionApproachStartedAt = 0;
      this.interactionApproachAttempts = 0;
      this.character.currentAnimation = "";
      this.postActionRecoveryUntil = now + 650;
      this.lastActivityAt = now;
      this.lastAutonomyAt = now - 5600;
      const cooldown = setTimeout(() => {
        if (this.disposed) return;
        anchor.visible = true;
        object.userData.active = true;
        this.resourceCooldowns.delete(object);
      }, 18000);
      this.resourceCooldowns.set(object, cooldown);
    }

    updateAutonomy(now) {
      if (
        this.transitioning ||
        this.pendingInteraction ||
        this.currentRoutine ||
        this.missionManager?.currentAction
      ) return;
      if (now < this.postActionRecoveryUntil) return;
      if (now - this.lastAutonomyAt < 6500) return;
      if (this.character.root.position.distanceTo(this.character.target) > 0.2) return;
      this.lastAutonomyAt = now;

      const routineRoll = Math.random();
      if (routineRoll < 0.12) {
        this.startRoutine("rest", now, 7200);
        return;
      }
      if (routineRoll < 0.2) {
        this.startRoutine("research", now, 6500);
        return;
      }
      if (routineRoll < 0.25) {
        this.startRoutine("food", now, 5200);
        return;
      }

      const unexploredZones = this.currentMap.zoneRegions.filter(
        (zone) => !this.discoveredZones.has(`${this.currentMapId}:${zone.index}`)
      );
      if (unexploredZones.length && Math.random() < 0.58) {
        unexploredZones.sort((left, right) =>
          this.character.root.position.distanceTo(left.center) -
          this.character.root.position.distanceTo(right.center)
        );
        const zone = unexploredZones[0];
        this.pendingZoneExploration = zone;
        this.character.setTarget(zone.center);
        this.showWorldMarker(zone.center);
        this.callbacks.onStatus(
          `BlueFox choisit d’explorer ${zone.name} avant de poursuivre les collectes.`
        );
        return;
      }

      const knownGate = this.currentMap.gates.find(
        (gate) => this.discoveredMaps.has(gate.userData.exit.targetMap)
      );
      if (knownGate && Math.random() < 0.12) {
        this.pendingGate = knownGate;
        this.character.setTarget(knownGate.position);
        this.callbacks.onStatus(
          `BlueFox choisit de retourner vers ${BF.maps[knownGate.userData.exit.targetMap].name}.`
        );
        return;
      }

      const resources = this.currentMap.interactables.filter(
        (object) => object.userData.active
      );
      if (resources.length) {
        const object = resources[Math.floor(Math.random() * resources.length)];
        this.targetInteraction(object);
        return;
      }

      const angle = Math.random() * Math.PI * 2;
      const distance = 6 + Math.random() * 12;
      const patrolTarget = new this.THREE.Vector3(
        BF.clamp(
          this.character.root.position.x + Math.cos(angle) * distance,
          -25,
          25
        ),
        0,
        BF.clamp(
          this.character.root.position.z + Math.sin(angle) * distance,
          -25,
          25
        )
      );
      this.character.setTarget(patrolTarget);
      this.showWorldMarker(patrolTarget);
      this.callbacks.onStatus("BlueFox poursuit une exploration locale autonome.");
    }

    startRoutine(type, now, duration) {
      this.character.stop();
      if (this.destinationMarker) this.destinationMarker.visible = false;
      if (this.pathLine) this.pathLine.visible = false;
      this.currentRoutine = { type, startedAt: now, endsAt: now + duration };
      this.character.playRoutine(type, duration / 1000);
      const messages = {
        rest: "BlueFox se repose quelques instants pour préserver ses forces.",
        research: "BlueFox analyse ses observations avant de poursuivre l’exploration.",
        food: "BlueFox prend une ration et vérifie ses réserves."
      };
      this.callbacks.onAction(messages[type]);
    }

    updateRoutine(now) {
      if (!this.currentRoutine || now < this.currentRoutine.endsAt) return;
      const finished = this.currentRoutine.type;
      this.currentRoutine = null;
      this.character.cancelInteraction();
      if (finished === "rest") this.callbacks.onRest();
      const missionActionTypes = {
        rest: BF.Missions?.ActionType.REST,
        research: BF.Missions?.ActionType.RESEARCH,
        food: BF.Missions?.ActionType.EAT
      };
      const expectedMissionType = this.missionManager?.currentAction?.type;
      const completedMissionType =
        finished === "research" &&
        expectedMissionType === BF.Missions?.ActionType.OBSERVE
          ? BF.Missions.ActionType.OBSERVE
          : missionActionTypes[finished];
      if (completedMissionType) {
        this.missionManager?.notifyActionCompleted(
          completedMissionType,
          { routine: finished, amount: 1 }
        );
      }
      this.lastAutonomyAt = now - 5000;
      this.lastActivityAt = now;
    }

    ensureActivity(now) {
      const activeMotion = this.character.speed > 0.08 ||
        Boolean(this.interactionStartedAt) ||
        Boolean(this.pendingZoneExploration) ||
        Boolean(this.currentRoutine) ||
        this.transitioning;
      if (activeMotion) {
        this.lastActivityAt = now;
        return;
      }
      if (now - this.lastActivityAt < 26000) return;

      this.pendingInteraction = null;
      this.character.cancelInteraction();
      const resources = this.currentMap.interactables.filter(
        (object) => object.userData.active
      );
      if (resources.length) {
        const object = resources[Math.floor(Math.random() * resources.length)];
        this.targetInteraction(object);
        this.callbacks.onAction(
          "BlueFox reprend spontanément son activité après avoir évalué les priorités locales."
        );
      } else {
        const angle = Math.random() * Math.PI * 2;
        const distance = 7 + Math.random() * 13;
        const target = new this.THREE.Vector3(
          BF.clamp(Math.cos(angle) * distance, -25, 25),
          0,
          BF.clamp(Math.sin(angle) * distance, -25, 25)
        );
        this.character.setTarget(target);
        this.showWorldMarker(target);
        this.callbacks.onStatus("BlueFox reprend une patrouille d’observation autonome.");
      }
      this.lastActivityAt = now;
      this.lastAutonomyAt = now;
    }

    activityPurpose() {
      const mission = document.querySelector(".mission-card h2")?.textContent || "";
      const lower = mission.toLowerCase();
      if (lower.includes("refuge")) {
        return "sécuriser le refuge et rendre le camp durable";
      }
      if (lower.includes("énergie")) {
        return "valider une source d’énergie douce avant toute construction";
      }
      if (lower.includes("flore")) {
        return "comprendre le cycle de la flore sans épuiser l’écosystème";
      }
      if (lower.includes("contact") || lower.includes("rencontre")) {
        return "préparer un contact prudent sans provoquer de réaction hostile";
      }
      return "faire progresser sa mission actuelle sans prendre de risque inutile";
    }

    currentActivity() {
      if (this.currentRoutine) {
        if (this.currentRoutine.type === "rest") {
          return { key: "rest", label: "Repos et récupération des forces.", speech: "Je fais une courte pause avant de reprendre." };
        }
        if (this.currentRoutine.type === "research") {
          return { key: "research", label: "Recherche et analyse des observations récentes.", speech: "Je compare mes observations pour préparer la suite." };
        }
        return { key: "food", label: "Alimentation et vérification des réserves.", speech: "Je prends une ration avant de poursuivre." };
      }
      if (this.pendingInteraction) {
        const kind = this.pendingInteraction.userData.kind;
        if (kind === "crystal") {
          return this.interactionStartedAt
            ? { key: "collect-crystal", label: "Collecte de cristaux énergétiques.", speech: "Je prélève ce cristal, juste la quantité nécessaire." }
            : { key: "approach-crystal", label: "Déplacement vers un gisement de cristaux.", speech: "Je rejoins le cristal que j’ai repéré." };
        }
        return this.interactionStartedAt
          ? { key: "collect-fiber", label: "Collecte de fibres arrivées à maturité.", speech: "Je récolte uniquement les fibres mûres." }
          : { key: "approach-fiber", label: "Déplacement vers une plante à fibres.", speech: "Je vais prélever quelques fibres utiles." };
      }
      if (this.transitioning) {
        return { key: "map-transition", label: "Passage vers une nouvelle zone cartographiée.", speech: "Je franchis le passage vers la zone suivante." };
      }
      if (this.pendingGate) {
        const destination = BF.maps[this.pendingGate.userData.exit.targetMap]?.name;
        return { key: `gate-${destination}`, label: `Déplacement vers le passage menant à ${destination}.`, speech: `Je me dirige vers ${destination}.` };
      }
      if (this.pendingZoneExploration) {
        return {
          key: `zone-${this.pendingZoneExploration.index}`,
          label: `Exploration de ${this.pendingZoneExploration.name}.`,
          speech: `Je vais reconnaître ${this.pendingZoneExploration.name} avant de revenir aux ressources.`
        };
      }
      if (this.character.speed > 0.08) {
        return { key: "movement", label: "Déplacement et contournement des obstacles.", speech: "Je poursuis mon trajet en contournant les obstacles." };
      }
      const animation = this.character.currentAnimation.toLowerCase();
      if (animation.includes("idle")) {
        return { key: "observation", label: "Observation du terrain et choix de la prochaine action.", speech: "J’observe le terrain avant de poursuivre." };
      }
      return { key: "planning", label: "Planification de la prochaine étape.", speech: "Je vérifie quelle action sera la plus utile." };
    }

    buildGlobalIntention(mission) {
      const lower = mission.toLowerCase();
      if (lower.includes("refuge")) {
        return "Ma priorité est de rendre le refuge sûr et autonome. Je rassemble seulement les ressources nécessaires avant de préparer un voyage plus long.";
      }
      if (lower.includes("énergie")) {
        return "Je veux valider une source d’énergie douce pour sécuriser le camp et préparer les futures explorations. Je n’engagerai aucune construction risquée sans mesures suffisantes.";
      }
      if (lower.includes("flore")) {
        return "Mon projet prioritaire est de comprendre le cycle de la flore afin de voyager sans dégrader les biomes. J’accumule des observations comparables avant de conclure.";
      }
      if (lower.includes("contact") || lower.includes("rencontre")) {
        return "Je prépare un protocole de rencontre prudent pour les prochains voyages. Je veux comprendre les réactions locales avant tout contact direct.";
      }
      return "Je prépare les prochaines étapes du voyage tout en consolidant les acquis du camp. Mes actions immédiates servent cette progression générale.";
    }

    updateInformationLayers(now) {
      if (now - this.lastActivityUiUpdate < 500) return;
      const activity = this.currentActivity();
      const activityElement = document.querySelector(".action-feed p");
      if (activityElement) activityElement.textContent = activity.label;

      const mission = document.querySelector(".mission-card h2")?.textContent || "";
      const intentElement = document.querySelector(".intent-bar strong");
      if (mission !== this.intentMissionKey || !this.stableIntentText) {
        this.intentMissionKey = mission;
        this.stableIntentText = this.buildGlobalIntention(mission);
      }
      if (intentElement && intentElement.textContent !== this.stableIntentText) {
        intentElement.textContent = this.stableIntentText;
      }

      const stateChanged = activity.key !== this.currentActivityKey;
      if (
        this.speechVisible &&
        stateChanged &&
        now - this.lastSpeechAt > 6500
      ) {
        this.callbacks.onSpeak(activity.speech);
        this.lastSpeechAt = now;
      }
      this.currentActivityKey = activity.key;
      this.lastActivityUiUpdate = now;
      this.lastIntentUpdate = now;
    }

    updateDestinationMarker(now) {
      if (!this.destinationMarker?.visible) return;
      const age = (now - this.destinationMarkerStartedAt) / 1000;
      const distance = this.character.root.position.distanceTo(
        this.destinationMarker.position
      );
      const pulse = 1 + Math.sin(age * 5) * 0.12;
      this.destinationMarker.scale.setScalar(pulse);
      this.destinationMarker.rotation.z += 0.012;
      this.destinationMarker.material.opacity = Math.max(
        0.2,
        0.72 - Math.min(age / 18, 0.48)
      );
      if (distance < 0.55 || age > 28) this.destinationMarker.visible = false;
      if (
        this.pathLine &&
        (distance < 0.55 || age > 28 || this.interactionStartedAt || this.transitioning)
      ) {
        this.pathLine.visible = false;
      }
    }

    updateSpeechBubble() {
      const bubble = document.getElementById("bluefox-speech");
      if (!bubble) return;
      const projected = new this.THREE.Vector3(
        this.character.root.position.x,
        2.65,
        this.character.root.position.z
      ).project(this.camera);
      bubble.style.left = `${(projected.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth}px`;
      bubble.style.top = `${(-projected.y * 0.5 + 0.5) * this.renderer.domElement.clientHeight}px`;
    }

    update(dt, now) {
      if (this.transitioning && now - this.transitionStartedAt > 12000) {
        this.transitionElement?.classList.remove("active");
        this.character.enabled = true;
        this.transitioning = false;
        this.transitionStartedAt = 0;
        this.pendingGate = null;
        this.gateCooldownUntil = now + 2600;
        this.callbacks.onStatus(
          "Le passage a été interrompu proprement. BlueFox reprend son activité."
        );
      }
      this.character.update(dt);
      this.currentMap.update?.(this.clock.elapsedTime);
      this.updateBiomeParticles(dt, this.clock.elapsedTime);
      this.updatePerformanceGovernor(dt);
      this.updateRoutine(now);
      this.updateInteraction(now);
      this.missionManager?.update(now);
      this.updateAutonomy(now);
      this.ensureActivity(now);
      this.updateInformationLayers(now);
      this.updateCurrentZone(now);
      this.updateDestinationMarker(now);
      if (this.characterGroundShadow) {
        this.characterGroundShadow.position.x = this.character.root.position.x;
        this.characterGroundShadow.position.z = this.character.root.position.z;
        this.characterGroundShadow.material.opacity =
          0.18 + Math.min(this.character.speed / this.character.maxSpeed, 1) * 0.07;
      }

      if (!this.transitioning && now >= this.gateCooldownUntil) {
        const reachedGate = this.currentMap.gates.find((gate) => {
          const radius = gate.userData.triggerRadius || 2.35;
          const nearGate = this.character.root.position.distanceTo(gate.position) < radius;
          const targetAtGate = this.character.target.distanceTo(gate.position) < radius + 0.8;
          return nearGate && (gate === this.pendingGate || targetAtGate);
        });
        if (reachedGate) this.crossGate(reachedGate);
      }

      this.cameraController.update(dt);
      if (this.panorama) {
        const cameraAngle = Math.atan2(
          this.camera.position.x - this.controls.target.x,
          this.camera.position.z - this.controls.target.z
        );
        this.panorama.rotation.y = BF.dampAngle(
          this.panorama.rotation.y,
          cameraAngle,
          3.2,
          dt
        );
        this.panorama.position.x = BF.damp(
          this.panorama.position.x,
          this.controls.target.x,
          1.35,
          dt
        );
        this.panorama.position.z = BF.damp(
          this.panorama.position.z,
          this.controls.target.z,
          1.35,
          dt
        );
      }
      this.updatePlanetaryClock();
      this.ensureCompassNeedle();
      if (this.compassNeedle) {
        this.compassNeedle.style.transform =
          `translate(-50%, -100%) rotate(${Math.PI - this.character.heading}rad)`;
      }
      this.updateSpeechBubble();
      if (now - this.lastSavedAt > 3000) {
        this.savePosition();
        this.lastSavedAt = now;
      }
    }

    loop() {
      if (this.disposed) return;
      this.frame = requestAnimationFrame(() => this.loop());
      const dt = Math.min(this.clock.getDelta(), 0.04);
      const now = performance.now();
      this.update(dt, now);
      this.renderer.render(this.scene, this.camera);
    }

    getDiagnostics() {
      return {
        version: "0.16.20",
        map: this.currentMapId,
        biomeProfile: this.currentAtmosphereProfile,
        biomeParticles: this.biomeParticleSettings?.count || 0,
        performanceQuality: this.performanceQuality,
        measuredFps: this.measuredFps,
        missingImages: [...this.missingImageUrls],
        panoramaAsset: this.currentPanoramaAsset,
        generatedTopology: this.generatedTopology.length,
        transitioning: this.transitioning,
        transitionsCompleted: this.completedTransitions,
        interactionsCompleted: this.completedInteractions,
        navigationFailures: this.navigationFailures,
        cameraRecoveries: this.cameraController?.recoveryCount || 0,
        browserResumes: this.resumeCount,
        zonesDiscovered: this.discoveredZones.size,
        mission: this.missionManager?.getState() || null,
        lastResumeAt: this.lastResumeAt,
        characterActive: Boolean(
          this.character?.speed > 0.08 ||
          this.pendingInteraction ||
          this.currentRoutine ||
          this.transitioning
        )
      };
    }

    resize() {
      const width = Math.max(1, this.container.clientWidth);
      const height = Math.max(1, this.container.clientHeight);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }

    dispose() {
      this.disposed = true;
      cancelAnimationFrame(this.frame);
      this.resizeObserver?.disconnect();
      this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
      this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp);
      global.removeEventListener("bluefox:navigate", this.onNavigate);
      global.removeEventListener("bluefox:return-base", this.onReturnBase);
      global.removeEventListener("bluefox:path-planned", this.onPathPlanned);
      global.removeEventListener("bluefox:navigation-failed", this.onNavigationFailed);
      global.removeEventListener("bluefox:image-missing", this.onMissingImage);
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      global.removeEventListener("bluefox:camera-mode", this.onCameraMode);
      window.clearTimeout(this.cameraClickTimer);
      this.cameraButton?.removeEventListener("click", this.onCameraClick);
      this.cameraButton?.removeEventListener("dblclick", this.onCameraDoubleClick);
      this.speechButton?.removeEventListener("click", this.onSpeechToggle);
      this.cameraButton?.remove();
      this.speechButton?.remove();
      this.missionManager?.dispose();
      document.body.classList.remove("bluefox-speech-hidden");
      this.clickMarker?.remove();
      this.cameraController?.dispose();
      this.currentMap?.dispose();
      if (this.character?.root) BF.disposeObject(this.character.root);
      if (this.panorama) BF.disposeObject(this.panorama);
      if (this.destinationMarker) BF.disposeObject(this.destinationMarker);
      if (this.pathLine) BF.disposeObject(this.pathLine);
      if (this.characterGroundShadow) BF.disposeObject(this.characterGroundShadow);
      if (this.biomeParticles) BF.disposeObject(this.biomeParticles);
      this.renderer?.dispose();
      if (BF.currentEngine === this) {
        BF.currentEngine = null;
        BF.getDiagnostics = null;
        BF.getMissionState = null;
      }
      this.container.replaceChildren();
    }
  }

  BF.mount = async function mount(options) {
    const engine = new WorldEngine(options);
    return engine.initialize();
  };
})(window);
