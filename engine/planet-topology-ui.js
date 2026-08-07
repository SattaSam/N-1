(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "planet-topology-ui-r2-organic";
  const CENTER = 900;

  // Une Zone 1 plateau fait ~62 x 48 px dans l'UI existante.
  // Ce pas place donc les petites presque bord à bord et laisse les grandes
  // se chevaucher naturellement.
  const CELL_X = 63;
  const CELL_Y = 49;
  const JITTER_X = 7;
  const JITTER_Y = 5;

  let scheduled = false;
  let applying = false;

  const discoveredSet = () => {
    const memory = BF.discoveredMaps;
    if (memory instanceof Set) return memory;
    return new Set(["crystal"]);
  };

  const topologyCoordinates = () =>
    BF.WorldTopology?.snapshot?.()?.coordinates || null;

  const hash = (value) => {
    let h = 2166136261;
    for (const c of String(value || "")) {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  const jitterFor = (mapId, p) => {
    // Crystal reste parfaitement centré à l'origine.
    if (mapId === "crystal" || (Number(p?.x) === 0 && Number(p?.y) === 0)) {
      return { x: 0, y: 0 };
    }
    const h = hash(`${mapId}:${p?.x}:${p?.y}`);
    return {
      x: ((h & 0xff) / 255 * 2 - 1) * JITTER_X,
      y: (((h >>> 8) & 0xff) / 255 * 2 - 1) * JITTER_Y
    };
  };

  const visualCenter = (mapId, coordinates) => {
    const p = coordinates?.[mapId];
    if (!p) return null;
    const j = jitterFor(mapId, p);
    return {
      x: CENTER + Number(p.x || 0) * CELL_X + j.x,
      y: CENTER + Number(p.y || 0) * CELL_Y + j.y
    };
  };

  const metricsOf = (zone) => {
    const width = Number.parseFloat(zone?.style?.width) || zone?.offsetWidth || 62;
    const height = Number.parseFloat(zone?.style?.height) || zone?.offsetHeight || 48;
    return { width, height };
  };

  const canonicalNeighbors = (a, b) => {
    const dx = Math.abs(Number(a.x) - Number(b.x));
    const dy = Math.abs(Number(a.y) - Number(b.y));
    return dx + dy === 1;
  };

  const sceneAsset = (mapId) => {
    if (!mapId) return "";
    const definition = BF.maps?.[mapId];
    const catalogScene =
      global.BLUEFOX_MAP_ASSETS?.catalog?.maps?.find?.((entry) =>
        entry?.id === mapId ||
        (definition?.number != null && entry?.number === definition.number)
      )?.scene?.url || "";

    return (
      BF.sceneImages?.[mapId] ||
      definition?.sceneUrl ||
      definition?.backgroundUrl ||
      definition?.sceneImage ||
      catalogScene ||
      ""
    );
  };

  const applyResolvedImage = (element, mapId) => {
    if (!element || !mapId) return false;
    const asset = sceneAsset(mapId);
    element.dataset.sceneMap = mapId;
    if (!asset) return false;
    element.style.backgroundImage =
      `linear-gradient(180deg, rgba(2, 10, 22, .08), rgba(2, 10, 22, .48)), url("${asset}")`;
    return true;
  };

  const repairSceneImages = () => {
    // Corrige aussi les vignettes directionnelles déjà créées par
    // ui-enhancements.js.
    document.querySelectorAll("[data-scene-map]").forEach((element) => {
      applyResolvedImage(element, element.dataset.sceneMap);
    });

    document.querySelectorAll(".direction-card").forEach((card) => {
      const direction = card.dataset.direction;
      const currentId = BF.currentEngine?.currentMapId;
      if (!direction || !currentId) return;
      const targetId = BF.maps?.[currentId]?.exits?.[direction]?.targetMap;
      const scene = card.querySelector(".direction-scene");
      if (!scene || !targetId || !discoveredSet().has(targetId)) return;
      scene.classList.remove("unknown");
      applyResolvedImage(scene, targetId);
    });
  };

  const redrawLinks = (world, coordinates, discovered) => {
    world.querySelectorAll(".planet-map-link").forEach((link) => link.remove());

    const firstZone = world.querySelector(".planet-map-zone");
    const rendered = new Set();

    for (const [mapId, fromPoint] of Object.entries(coordinates)) {
      if (!discovered.has(mapId)) continue;
      const fromZone = world.querySelector(`.planet-map-zone[data-map-id="${CSS.escape(mapId)}"]`);
      if (!fromZone) continue;
      const fromCenter = visualCenter(mapId, coordinates);
      const fromMetrics = metricsOf(fromZone);

      for (const exit of Object.values(BF.maps?.[mapId]?.exits || {})) {
        const targetId = exit?.targetMap;
        const targetPoint = coordinates[targetId];
        if (
          !targetId ||
          !targetPoint ||
          !discovered.has(targetId) ||
          !canonicalNeighbors(fromPoint, targetPoint)
        ) continue;

        const pairKey = [mapId, targetId].sort().join("|");
        if (rendered.has(pairKey)) continue;
        rendered.add(pairKey);

        const toZone = world.querySelector(`.planet-map-zone[data-map-id="${CSS.escape(targetId)}"]`);
        if (!toZone) continue;
        const toCenter = visualCenter(targetId, coordinates);
        const toMetrics = metricsOf(toZone);

        const dx = toCenter.x - fromCenter.x;
        const dy = toCenter.y - fromCenter.y;
        const centerDistance = Math.hypot(dx, dy) || 1;

        // Approximation du rayon de chaque tache dans la direction de la liaison.
        const ux = Math.abs(dx / centerDistance);
        const uy = Math.abs(dy / centerDistance);
        const fromRadius =
          (fromMetrics.width / 2) * ux + (fromMetrics.height / 2) * uy;
        const toRadius =
          (toMetrics.width / 2) * ux + (toMetrics.height / 2) * uy;
        const visibleGap = centerDistance - fromRadius - toRadius;

        // Si les taches se touchent ou se chevauchent, aucun trait :
        // la géographie elle-même matérialise la connexion.
        if (visibleGap <= 5) continue;

        const startX = fromCenter.x + (dx / centerDistance) * fromRadius;
        const startY = fromCenter.y + (dy / centerDistance) * fromRadius;
        const endX = toCenter.x - (dx / centerDistance) * toRadius;
        const endY = toCenter.y - (dy / centerDistance) * toRadius;
        const lineDx = endX - startX;
        const lineDy = endY - startY;

        const link = document.createElement("i");
        link.className = "planet-map-link";
        link.dataset.topologyUi = VERSION;
        link.style.left = `${startX}px`;
        link.style.top = `${startY}px`;
        link.style.width = `${Math.hypot(lineDx, lineDy)}px`;
        link.style.transform = `rotate(${Math.atan2(lineDy, lineDx)}rad)`;
        link.style.opacity = "0.38";
        link.style.pointerEvents = "none";

        if (firstZone) world.insertBefore(link, firstZone);
        else world.appendChild(link);
      }
    }
  };

  function apply() {
    if (applying) return;
    const coordinates = topologyCoordinates();
    if (!coordinates) return;

    applying = true;
    try {
      repairSceneImages();
      const discovered = discoveredSet();

      document.querySelectorAll(".planet-map-world").forEach((world) => {
        let changed = false;

        world.querySelectorAll(".planet-map-zone[data-map-id]").forEach((zone) => {
          const mapId = zone.dataset.mapId;
          const center = visualCenter(mapId, coordinates);
          if (!center || !discovered.has(mapId)) return;

          const left = `${center.x}px`;
          const top = `${center.y}px`;
          if (zone.style.left !== left) {
            zone.style.left = left;
            changed = true;
          }
          if (zone.style.top !== top) {
            zone.style.top = top;
            changed = true;
          }
          zone.dataset.topologyX = String(coordinates[mapId].x);
          zone.dataset.topologyY = String(coordinates[mapId].y);
          zone.dataset.topologyUi = VERSION;
        });

        redrawLinks(world, coordinates, discovered);
        world.dataset.topologyUi = VERSION;

        if (changed) {
          const viewport = world.closest(".planet-map-viewport");
          const currentId = BF.currentEngine?.currentMapId;
          if (
            viewport &&
            currentId &&
            viewport.dataset.centeredMap === currentId &&
            typeof viewport._bluefoxCenterCurrent === "function"
          ) {
            global.requestAnimationFrame(() => viewport._bluefoxCenterCurrent());
          }
        }
      });
    } finally {
      applying = false;
    }
  }

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  };

  const observer = new MutationObserver((mutations) => {
    if (applying) return;
    if (mutations.some((m) =>
      [...m.addedNodes].some((node) =>
        node instanceof Element &&
        (
          node.matches?.(
            ".planet-map-world, .planet-map-zone, .direction-card, .direction-scene, [data-scene-map]"
          ) ||
          node.querySelector?.(
            ".planet-map-world, .planet-map-zone, .direction-card, .direction-scene, [data-scene-map]"
          )
        )
      )
    )) schedule();
  });

  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });

    [
      "bluefox:topology-coordinates-changed",
      "bluefox:discovery-changed",
      "bluefox:map-state",
      "bluefox:map-transition-completed",
      "bluefox:scene-images"
    ].forEach((eventName) => global.addEventListener(eventName, schedule));

    schedule();
    console.info(
      "[BlueFox] Planet Topology UI R2 : géographie organique + images directionnelles fiabilisées."
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  BF.PlanetTopologyUI = Object.freeze({
    version: VERSION,
    refresh: schedule,
    resolveSceneAsset: sceneAsset,
    cell: Object.freeze({ x: CELL_X, y: CELL_Y }),
    jitter: Object.freeze({ x: JITTER_X, y: JITTER_Y })
  });
})(window);
