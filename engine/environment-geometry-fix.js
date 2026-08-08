(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (typeof BF.mount !== "function") {
    console.error("[BlueFox] EnvironmentGeometryFix : BF.mount indisponible.");
    return;
  }

  const VERSION = "portals-bounds-panorama-ui-v3c-map-contour-v2";
  const GATE_INSET = 3.15;
  const GATE_SIDE_MARGIN = 4.6;
  const PANORAMA_LOWERING = -3.15;

  const DIRECTION_LABELS = Object.freeze({
    north: "NORD",
    south: "SUD",
    east: "EST",
    west: "OUEST"
  });

  const intervalDistance = (value, min, max) => {
    if (value < min) return min - value;
    if (value > max) return value - max;
    return 0;
  };

  const discovered = (engine, mapId) =>
    Boolean(mapId && engine?.discoveredMaps instanceof Set && engine.discoveredMaps.has(mapId));

  const extremeRegions = (map, direction) => {
    const regions = Array.isArray(map?.walkableRegions) && map.walkableRegions.length
      ? map.walkableRegions
      : (map?.zoneRegions || []).map((zone) => ({
          minX: zone.center.x - zone.halfSize,
          maxX: zone.center.x + zone.halfSize,
          minZ: zone.center.z - zone.halfSize,
          maxZ: zone.center.z + zone.halfSize
        }));

    if (!regions.length) return [];

    const metric = direction === "north"
      ? Math.min(...regions.map((r) => r.minZ))
      : direction === "south"
        ? Math.max(...regions.map((r) => r.maxZ))
        : direction === "east"
          ? Math.max(...regions.map((r) => r.maxX))
          : Math.min(...regions.map((r) => r.minX));

    const epsilon = 0.25;
    return regions.filter((region) => {
      if (direction === "north") return Math.abs(region.minZ - metric) <= epsilon;
      if (direction === "south") return Math.abs(region.maxZ - metric) <= epsilon;
      if (direction === "east") return Math.abs(region.maxX - metric) <= epsilon;
      return Math.abs(region.minX - metric) <= epsilon;
    });
  };

  const resolveGatePosition = (engine, direction, exit = {}) => {
    const map = engine?.currentMap;
    const candidates = extremeRegions(map, direction);
    if (!candidates.length) {
      const bounds = Number(map?.bounds) || 27;
      const fallback = {
        north: { x: BF.clamp(Number(exit.x) || 0, -bounds + GATE_SIDE_MARGIN, bounds - GATE_SIDE_MARGIN), z: -bounds + GATE_INSET },
        south: { x: BF.clamp(Number(exit.x) || 0, -bounds + GATE_SIDE_MARGIN, bounds - GATE_SIDE_MARGIN), z: bounds - GATE_INSET },
        east: { x: bounds - GATE_INSET, z: BF.clamp(Number(exit.z) || 0, -bounds + GATE_SIDE_MARGIN, bounds - GATE_SIDE_MARGIN) },
        west: { x: -bounds + GATE_INSET, z: BF.clamp(Number(exit.z) || 0, -bounds + GATE_SIDE_MARGIN, bounds - GATE_SIDE_MARGIN) }
      };
      return fallback[direction] || null;
    }

    const desired = direction === "north" || direction === "south"
      ? Number(exit.x) || 0
      : Number(exit.z) || 0;

    const region = [...candidates].sort((a, b) => {
      const da = direction === "north" || direction === "south"
        ? intervalDistance(desired, a.minX + GATE_SIDE_MARGIN, a.maxX - GATE_SIDE_MARGIN)
        : intervalDistance(desired, a.minZ + GATE_SIDE_MARGIN, a.maxZ - GATE_SIDE_MARGIN);
      const db = direction === "north" || direction === "south"
        ? intervalDistance(desired, b.minX + GATE_SIDE_MARGIN, b.maxX - GATE_SIDE_MARGIN)
        : intervalDistance(desired, b.minZ + GATE_SIDE_MARGIN, b.maxZ - GATE_SIDE_MARGIN);
      return da - db;
    })[0];

    if (direction === "north") {
      return {
        x: BF.clamp(desired, region.minX + GATE_SIDE_MARGIN, region.maxX - GATE_SIDE_MARGIN),
        z: region.minZ + GATE_INSET
      };
    }
    if (direction === "south") {
      return {
        x: BF.clamp(desired, region.minX + GATE_SIDE_MARGIN, region.maxX - GATE_SIDE_MARGIN),
        z: region.maxZ - GATE_INSET
      };
    }
    if (direction === "east") {
      return {
        x: region.maxX - GATE_INSET,
        z: BF.clamp(desired, region.minZ + GATE_SIDE_MARGIN, region.maxZ - GATE_SIDE_MARGIN)
      };
    }
    if (direction === "west") {
      return {
        x: region.minX + GATE_INSET,
        z: BF.clamp(desired, region.minZ + GATE_SIDE_MARGIN, region.maxZ - GATE_SIDE_MARGIN)
      };
    }
    return null;
  };

  const disposeSprite = (sprite) => {
    if (!sprite) return;
    sprite.material?.map?.dispose?.();
    sprite.material?.dispose?.();
    sprite.removeFromParent?.();
  };

  const makePortalLabel = (engine, direction, exit) => {
    const THREE = engine.THREE;
    const directionLabel = DIRECTION_LABELS[direction] || String(direction || "").toUpperCase();
    const targetName = discovered(engine, exit?.targetMap)
      ? BF.maps?.[exit.targetMap]?.name || ""
      : "";
    const lines = targetName ? [directionLabel, targetName] : [directionLabel];

    const canvas = global.document.createElement("canvas");
    const context = canvas.getContext("2d");
    const font = "600 27px Arial";
    context.font = font;
    const widest = Math.max(...lines.map((line) => context.measureText(line).width));
    canvas.width = Math.ceil(BF.clamp(widest + 64, 220, 900));
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
    sprite.name = "BlueFoxPortalLabel";
    sprite.position.y = 3.2;
    const pixelsPerUnit = 68.25;
    sprite.scale.set(canvas.width / pixelsPerUnit, canvas.height / pixelsPerUnit, 1);
    return sprite;
  };

  const refreshGate = (engine, gate) => {
    const exit = gate?.userData?.exit;
    const direction = exit?.direction;
    if (!exit || !direction) return false;

    const resolved = resolveGatePosition(engine, direction, exit);
    if (resolved) {
      gate.position.set(resolved.x, 0, resolved.z);
      gate.userData.exit = { ...exit, ...resolved, direction };

      const definition = BF.maps?.[engine.currentMapId];
      if (definition) {
        definition.runtimeExits ||= {};
        definition.runtimeExits[direction] = {
          ...(definition.runtimeExits[direction] || exit),
          ...resolved,
          direction
        };
      }
    }

    gate.children
      .filter((child) => child.isSprite)
      .forEach(disposeSprite);

    gate.add(makePortalLabel(engine, direction, gate.userData.exit));
    return true;
  };

  const refreshGates = (engine) => {
    (engine?.currentMap?.gates || []).forEach((gate) => refreshGate(engine, gate));
  };

  const buildMapContourRegions = (character, sourceRegions = []) => {
    const regions = (sourceRegions || [])
      .map((region) => ({
        minX: Number(region.minX),
        maxX: Number(region.maxX),
        minZ: Number(region.minZ),
        maxZ: Number(region.maxZ)
      }))
      .filter((region) => Object.values(region).every(Number.isFinite));

    if (!regions.length) return [];

    /*
     * CharacterController.constrainToWalkable() applique automatiquement
     * une marge (radius + 0.08) sur LES QUATRE CÔTÉS de chaque région.
     *
     * Cela est correct sur le contour extérieur de la map, mais incorrect
     * entre deux plateaux jointifs : les deux marges internes créent un mur.
     *
     * On agrandit donc uniquement les côtés qui touchent réellement un
     * plateau voisin. Après application de la marge interne du controller,
     * ces raccords redeviennent traversables. Les côtés sans voisin gardent
     * exactement la marge de sécurité et restent infranchissables.
     */
    const margin = Math.max(0.1, Number(character?.radius) || 0.64) + 0.08;
    const seamOverlap = margin + 0.16;
    const epsilon = 0.35;

    const overlapLength = (aMin, aMax, bMin, bMax) =>
      Math.min(aMax, bMax) - Math.max(aMin, bMin);

    return regions.map((region, index) => {
      let openWest = false;
      let openEast = false;
      let openNorth = false;
      let openSouth = false;

      regions.forEach((other, otherIndex) => {
        if (otherIndex === index) return;

        const zOverlap = overlapLength(
          region.minZ, region.maxZ,
          other.minZ, other.maxZ
        );
        const xOverlap = overlapLength(
          region.minX, region.maxX,
          other.minX, other.maxX
        );

        if (zOverlap > margin * 1.25) {
          if (Math.abs(other.maxX - region.minX) <= epsilon) openWest = true;
          if (Math.abs(other.minX - region.maxX) <= epsilon) openEast = true;
        }

        if (xOverlap > margin * 1.25) {
          if (Math.abs(other.maxZ - region.minZ) <= epsilon) openNorth = true;
          if (Math.abs(other.minZ - region.maxZ) <= epsilon) openSouth = true;
        }
      });

      return {
        minX: region.minX - (openWest ? seamOverlap : 0),
        maxX: region.maxX + (openEast ? seamOverlap : 0),
        minZ: region.minZ - (openNorth ? seamOverlap : 0),
        maxZ: region.maxZ + (openSouth ? seamOverlap : 0),
        __bluefoxContour: {
          openWest,
          openEast,
          openNorth,
          openSouth
        }
      };
    });
  };

  const restoreInvisibleWall = (engine) => {
    const character = engine?.character;
    const sourceRegions = engine?.currentMap?.walkableRegions || [];
    if (!character || !sourceRegions.length) return;

    const contourRegions = buildMapContourRegions(character, sourceRegions);

    // Le controller continue donc à utiliser son système de limites éprouvé,
    // mais les coutures internes entre plateaux sont ouvertes.
    character.setWalkableRegions(contourRegions);

    engine.currentMap.__bluefoxSourceWalkableRegions = sourceRegions;
    engine.currentMap.__bluefoxContourWalkableRegions = contourRegions;

    character.constrainToWalkable(character.root.position);
    character.constrainToWalkable(character.target);
    character.constrainToWalkable(character.finalTarget);
    character.lastSafePosition?.copy?.(character.root.position);
  };

  const applyPanoramaGeometry = (engine) => {
    const panorama = engine?.panorama;
    const THREE = engine?.THREE;
    if (!panorama || !THREE) return false;

    const panoramaWidth = 400;
    const panoramaHeight = 136;
    const geometry = new THREE.PlaneGeometry(panoramaWidth, panoramaHeight, 96, 22);
    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const normalized = Math.abs(x) / (panoramaWidth * 0.5);
      const edge = Math.max(0, (normalized - 0.26) / 0.74);
      const vertical = BF.clamp(
        (y + panoramaHeight * 0.5) / panoramaHeight,
        0,
        1
      );
      const upperLean = Math.pow(vertical, 2);

      // Hauteur validée : le panneau garde une large réserve sous le plateau.
      // Déformation conique : les bords montent progressivement au-dessus
      // de la hauteur centrale sur une zone plus large, y compris toute la
      // partie correspondant aux pixels étirés.
      const coneLift =
        Math.pow(edge, 1.28) * (12.5 + vertical * 17.5) +
        Math.pow(edge, 2.4) * 7.5;
      position.setY(index, -19 + vertical * 94 + coneLift);

      // Courbure latérale plus enveloppante et sommet davantage incliné vers
      // le centre/la caméra pour renforcer l'impression de surplomb.
      position.setZ(
        index,
        -88 +
        upperLean * 52 +
        normalized * normalized * 14 +
        Math.pow(edge, 1.38) * 92 +
        Math.pow(edge, 2.35) * 28
      );

      // Conserve le contrat de texture étendue : 96 % pour l'image centrale,
      // 2 % à gauche et 2 % à droite pour les pixels prolongés.
      const t = x / panoramaWidth + 0.5;
      const u = t < 0.28
        ? (t / 0.28) * 0.04
        : t > 0.72
          ? 0.96 + ((t - 0.72) / 0.28) * 0.04
          : 0.04 + ((t - 0.28) / 0.44) * 0.92;
      uv.setX(index, u);
    }

    position.needsUpdate = true;
    uv.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    panorama.geometry?.dispose?.();
    panorama.geometry = geometry;
    panorama.position.y = PANORAMA_LOWERING;
    panorama.frustumCulled = false;
    panorama.userData.environmentGeometryFix = VERSION;
    return true;
  };

  const installOnEngine = (engine) => {
    if (!engine || engine.__environmentGeometryFix === VERSION) return engine;
    engine.__environmentGeometryFix = VERSION;

    const originalAddRuntimeGate = engine.addRuntimeGate?.bind(engine);
    if (originalAddRuntimeGate) {
      engine.addRuntimeGate = function addRuntimeGateInsidePlateau(direction, exit, definition) {
        const gate = originalAddRuntimeGate(direction, exit, definition);
        if (gate) refreshGate(this, gate);
        return gate;
      };
    }

    const originalLoadMap = engine.loadMap?.bind(engine);
    if (originalLoadMap) {
      engine.loadMap = async function loadMapWithGeometryFix(...args) {
        const result = await originalLoadMap(...args);
        restoreInvisibleWall(this);
        refreshGates(this);
        applyPanoramaGeometry(this);
        return result;
      };
    }

    restoreInvisibleWall(engine);
    refreshGates(engine);
    applyPanoramaGeometry(engine);

    global.addEventListener("bluefox:discovery-changed", () => {
      refreshGates(engine);
    });

    // Garde physique légère : si une ancienne routine écrit directement dans
    // root.position, BlueFox est immédiatement replacé à la limite autorisée.
    const boundaryGuard = () => {
      if (engine.disposed) return;
      if (!engine.transitioning && engine.character && engine.currentMap) {
        const beforeX = engine.character.root.position.x;
        const beforeZ = engine.character.root.position.z;
        engine.character.constrainToWalkable(engine.character.root.position);
        if (
          beforeX !== engine.character.root.position.x ||
          beforeZ !== engine.character.root.position.z
        ) {
          engine.character.stop?.();
          engine.character.lastSafePosition?.copy?.(engine.character.root.position);
        }
      }
      global.requestAnimationFrame(boundaryGuard);
    };
    global.requestAnimationFrame(boundaryGuard);

    console.info(
      "[BlueFox] Correctif environnement actif : portails sur plateaux, labels explorés, mur invisible et panorama restauré.",
      { version: VERSION, panoramaLowering: PANORAMA_LOWERING }
    );

    return engine;
  };

  const originalMount = BF.mount.bind(BF);
  BF.mount = async function mountWithEnvironmentGeometryFix(options) {
    const engine = await originalMount(options);
    return installOnEngine(engine);
  };

  BF.EnvironmentGeometryFix = Object.freeze({
    version: VERSION,
    refresh: () => {
      const engine = BF.currentEngine;
      if (!engine) return false;
      restoreInvisibleWall(engine);
      refreshGates(engine);
      applyPanoramaGeometry(engine);
      return true;
    }
  });
})(window);
