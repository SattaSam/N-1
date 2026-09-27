(function (global) {
  "use strict";

  const directionNames = {
    north: "Nord",
    south: "Sud",
    east: "Est",
    west: "Ouest"
  };

  const mapData = {
    crystal: {
      name: "Plaine des Cristaux",
      resources: "Cristaux énergétiques, fibres stellaires et composants de l’épave.",
      synthesis: "BlueFox y étudie le site d’arrivée et les ressources proches.",
      directions: {
        north: { mapId: null, title: "Territoire non cartographié" },
        west: { mapId: null, title: "Territoire non cartographié" },
        east: { mapId: null, title: "Territoire non cartographié" },
        south: { mapId: null, title: "Territoire non cartographié" }
      }
    }
  };

  const directionFromExit = (fallbackDirection, exit = {}) => {
    const x = Number(exit.x);
    const z = Number(exit.z);
    if (Number.isFinite(x) && Number.isFinite(z)) {
      if (Math.abs(x) > Math.abs(z) && Math.abs(x) > 0.01) {
        return x > 0 ? "east" : "west";
      }
      if (Math.abs(z) > 0.01) {
        return z > 0 ? "south" : "north";
      }
    }
    return fallbackDirection;
  };

  const exitForDirection = (definition, requestedDirection) =>
    Object.entries(definition?.exits || {})
      .find(([storedDirection, exit]) =>
        directionFromExit(storedDirection, exit) === requestedDirection
      )?.[1];

  const directionsForMap = (mapId) => {
    const definition = global.BlueFox3D?.maps?.[mapId];
    const staticDirections = mapData[mapId]?.directions || {};
    return Object.fromEntries(
      Object.keys(directionNames).map((direction) => {
        const exit = exitForDirection(definition, direction);
        if (exit) {
          return [direction, {
            mapId: exit.targetMap,
            x: exit.x,
            z: exit.z,
            title: `Passage vers ${global.BlueFox3D?.maps?.[exit.targetMap]?.name || "une map connue"}`
          }];
        }
        return [direction, (!definition ? staticDirections[direction] : null) || {
          mapId: null,
          title: "Terre inconnue"
        }];
      })
    );
  };

  const knowledgeForMap = (mapId) => {
    const dynamic = global.BlueFox3D?.maps?.[mapId];
    return {
      name: dynamic?.name || mapData[mapId]?.name || "Territoire inconnu",
      resources:
        dynamic?.resourceHints ||
        mapData[mapId]?.resources ||
        "Ressources encore non classées.",
      synthesis:
        dynamic?.synthesis ||
        mapData[mapId]?.synthesis ||
        "Je dois observer ce milieu avant de formuler une conclusion."
    };
  };

  const currentMapId = (panel) =>
    global.BlueFox3D?.currentEngine?.currentMapId ||
    "crystal";

  const discovered = (panel, mapId) => {
    if (!mapId) return false;
    const engineMemory = global.BlueFox3D?.discoveredMaps;
    if (engineMemory instanceof Set) return engineMemory.has(mapId);
    try {
      const memories = JSON.parse(
        localStorage.getItem("bluefox_discovered_maps_v1") || "[]"
      );
      return mapId === "crystal" || memories.some((map) => map?.id === mapId);
    } catch {
      return mapId === "crystal";
    }
  };

  const discoveryMemories = () => {
    for (const key of [
      "bluefox_engine_discovered_maps_v2",
      "bluefox_discovered_maps_v1"
    ]) {
      try {
        const memories = JSON.parse(localStorage.getItem(key) || "[]");
        if (Array.isArray(memories) && memories.some((memory) => memory?.id)) {
          return memories;
        }
      } catch {
        // Essayer la mémoire de compatibilité suivante.
      }
    }
    return [];
  };

  const discoveryNumber = (mapId) => {
    if (!mapId) return null;

    // Le rang joueur est celui de la mémoire runtime canonique : Crystal = 01,
    // puis chaque map réellement découverte dans l'ordre du Set. Les ordinals
    // techniques des maps générées et les souvenirs obsolètes ne doivent jamais
    // décaler le numéro de Zone affiché.
    const engineMemory = global.BlueFox3D?.discoveredMaps;
    if (engineMemory instanceof Set) {
      const index = [...engineMemory].indexOf(mapId);
      if (index >= 0) return index + 1;
    }

    const memories = discoveryMemories();
    const chronologicalMemories = memories
      .filter((item) => item?.id && global.BlueFox3D?.maps?.[item.id])
      .filter((item, index, list) =>
        list.findIndex((candidate) => candidate.id === item.id) === index
      )
      .map((item, index) => ({ item, index }))
      .sort((left, right) => {
        const leftTime = Number(left.item.discoveredAt);
        const rightTime = Number(right.item.discoveredAt);
        if (Number.isFinite(leftTime) && Number.isFinite(rightTime) &&
            leftTime !== rightTime) {
          return leftTime - rightTime;
        }
        const leftOrder = Number(left.item.order);
        const rightOrder = Number(right.item.order);
        if (Number.isFinite(leftOrder) && Number.isFinite(rightOrder) &&
            leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }
        return left.index - right.index;
      });
    const chronologicalIndex = chronologicalMemories
      .findIndex(({ item }) => item.id === mapId);
    if (chronologicalIndex >= 0) return chronologicalIndex + 1;

    const engineNumber =
      global.BlueFox3D?.currentEngine?.discoveryNumber?.(mapId);
    return Number.isFinite(engineNumber) ? engineNumber : null;
  };

  const discoveryLabel = (mapId) => {
    const number = discoveryNumber(mapId);
    return number
      ? `ZONE ${String(number).padStart(2, "0")}`
      : "ZONE INCONNUE";
  };

  const uniqueNameStorageKey = "bluefox_map_names_v1";
  const blueFoxPlaceNames = Object.freeze([
    "Lisière des Murmures",
    "Veines du Ciel Calme",
    "Refuge des Éclats Patients",
    "Jardin des Signaux Doux",
    "Crête des Curiosités",
    "Passage des Lumières Timides",
    "Bassin des Traces Bleues",
    "Terrasse du Vent Complice",
    "Clairière des Questions",
    "Horizon des Pierres Sages",
    "Détour des Lucioles Astrales",
    "Vallée du Petit Pas"
  ]);

  const readUniqueNames = () => {
    try {
      const names = JSON.parse(localStorage.getItem(uniqueNameStorageKey) || "{}");
      return names && typeof names === "object" ? names : {};
    } catch {
      return {};
    }
  };

  const normalizedSceneIdentity = (mapId) => {
    const definition = global.BlueFox3D?.maps?.[mapId];
    return String(
      sceneImageCandidates(mapId)[0] ||
      definition?.sceneUrl ||
      definition?.backgroundUrl ||
      definition?.sceneImage ||
      ""
    ).split(/[?#]/)[0].toLocaleLowerCase();
  };

  function ensureUniqueDiscoveredMapNames(panel) {
    const ids = discoveredMapIds(panel);
    if (!ids.length) return;
    const storedNames = readUniqueNames();
    const sceneOwners = new Map();
    const usedNames = new Set();
    let changed = false;

    ids.forEach((mapId) => {
      const definition = global.BlueFox3D?.maps?.[mapId];
      if (!definition) return;
      const sceneIdentity = normalizedSceneIdentity(mapId);
      const duplicateScene = Boolean(
        sceneIdentity && sceneOwners.has(sceneIdentity)
      );
      const storedName = storedNames[mapId];
      let displayName = storedName || definition.name || "Territoire inconnu";

      if (duplicateScene && !storedName) {
        const order = Math.max(1, discoveryNumber(mapId) || ids.indexOf(mapId) + 1);
        const start = (order * 5 + mapId.length * 3) % blueFoxPlaceNames.length;
        for (let offset = 0; offset < blueFoxPlaceNames.length; offset += 1) {
          const candidate =
            blueFoxPlaceNames[(start + offset) % blueFoxPlaceNames.length];
          if (!usedNames.has(candidate)) {
            displayName = candidate;
            break;
          }
        }
        storedNames[mapId] = displayName;
        changed = true;
      }

      definition.name = displayName;
      usedNames.add(displayName);
      if (sceneIdentity && !sceneOwners.has(sceneIdentity)) {
        sceneOwners.set(sceneIdentity, mapId);
      }
    });

    if (changed) {
      localStorage.setItem(uniqueNameStorageKey, JSON.stringify(storedNames));
      global.dispatchEvent(new CustomEvent("bluefox:map-names-changed", {
        detail: { names: storedNames }
      }));
    }
  }

  const sceneImageCandidates = (mapId) => {
    const resolvedMapId =
      mapId || global.BlueFox3D?.currentEngine?.currentMapId || "crystal";
    const source = global.BlueFox3D?.maps?.[resolvedMapId]?.sceneUrl || "";
    if (!source) return [];
    const candidates =
      global.BLUEFOX_MAP_ASSETS?.imageUrlCandidates?.(source) || [source];
    return [...new Set(candidates.filter(Boolean))];
  };

  function applySceneImage(element, mapId) {
    if (!element) return;
    const resolvedMapId =
      mapId || global.BlueFox3D?.currentEngine?.currentMapId || "crystal";
    element.dataset.sceneMap = resolvedMapId;

    const candidates = sceneImageCandidates(resolvedMapId);
    const isJournalWindow =
      element.classList?.contains("journal-window-biome");

    if (!candidates.length) {
      // Le hublot n'affiche jamais un faux décor : il attend la scène canonique.
      if (!isJournalWindow && !element.style.backgroundImage) {
        element.style.backgroundImage =
          "linear-gradient(145deg, #123d5e, #071729)";
      }
      return;
    }

    const requestToken = `${resolvedMapId}:${candidates.join("|")}`;
    element.dataset.sceneRequest = requestToken;

    const tryCandidate = (index) => {
      if (element.dataset.sceneRequest !== requestToken) return;
      const asset = candidates[index];
      if (!asset) {
        if (!isJournalWindow && !element.style.backgroundImage) {
          element.style.backgroundImage =
            "linear-gradient(145deg, #123d5e, #071729)";
        }
        return;
      }

      const image = new Image();
      image.onload = () => {
        if (element.dataset.sceneRequest !== requestToken) return;
        element.style.backgroundImage =
          `linear-gradient(180deg, rgba(2, 10, 22, .08), rgba(2, 10, 22, .38)), url("${asset}")`;
        element.dataset.sceneLoaded = resolvedMapId;
      };
      image.onerror = () => {
        if (element.dataset.sceneRequest !== requestToken) return;
        tryCandidate(index + 1);
      };
      image.src = asset;
    };

    tryCandidate(0);
  }


  // Coordonnées du hublot dans Capsule.png (espace image source 0..1).
  // Elles sont projetées dans le portrait selon le même object-fit: cover
  // que l'image de capsule, afin que le décor reste attaché au hublot
  // quelle que soit la taille ou le ratio de la fenêtre.
  const JOURNAL_WINDOW_SOURCE = Object.freeze({
    centerX: 0.72,
    centerY: 0.285,
    width: 0.56,
    height: 0.32
  });

  function positionJournalWindow(panel) {
    const portrait = panel?.querySelector(".journal-portrait");
    const capsule = panel?.querySelector(".journal-capsule");
    const windowBiome = panel?.querySelector(".journal-window-biome");
    if (!portrait || !capsule || !windowBiome) return;

    const update = () => {
      const sourceWidth = Number(capsule.naturalWidth);
      const sourceHeight = Number(capsule.naturalHeight);
      const boxWidth = portrait.clientWidth;
      const boxHeight = portrait.clientHeight;
      if (
        !sourceWidth || !sourceHeight ||
        !boxWidth || !boxHeight
      ) return;

      // .journal-capsule utilise object-fit: cover + object-position:center.
      const scale = Math.max(
        boxWidth / sourceWidth,
        boxHeight / sourceHeight
      );
      const renderedWidth = sourceWidth * scale;
      const renderedHeight = sourceHeight * scale;
      const offsetX = (boxWidth - renderedWidth) / 2;
      const offsetY = (boxHeight - renderedHeight) / 2;

      const centerX =
        offsetX + renderedWidth * JOURNAL_WINDOW_SOURCE.centerX;
      const centerY =
        offsetY + renderedHeight * JOURNAL_WINDOW_SOURCE.centerY;
      const width = renderedWidth * JOURNAL_WINDOW_SOURCE.width;
      const height = renderedHeight * JOURNAL_WINDOW_SOURCE.height;

      portrait.style.setProperty(
        "--journal-window-center-x",
        `${centerX.toFixed(2)}px`
      );
      portrait.style.setProperty(
        "--journal-window-center-y",
        `${centerY.toFixed(2)}px`
      );
      portrait.style.setProperty(
        "--journal-window-width",
        `${width.toFixed(2)}px`
      );
      portrait.style.setProperty(
        "--journal-window-height",
        `${height.toFixed(2)}px`
      );
    };

    if (!capsule.complete || !capsule.naturalWidth) {
      capsule.addEventListener("load", update, { once: true });
    }
    update();

    if (!portrait.__bluefoxJournalWindowObserver) {
      const observer = new ResizeObserver(update);
      observer.observe(portrait);
      portrait.__bluefoxJournalWindowObserver = observer;
    }
  }

  function refreshSceneImages() {
    document.querySelectorAll("[data-scene-map]").forEach((element) => {
      applySceneImage(element, element.dataset.sceneMap);
    });
  }

  function enhanceMission(card) {
    if (card.dataset.bluefoxEnhanced) return;
    card.dataset.bluefoxEnhanced = "true";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mission-toggle";
    button.setAttribute("aria-label", "Rétracter ou déplier la mission en cours");
    button.title = "Rétracter ou déplier";
    const collapsed = localStorage.getItem("bluefox_mission_collapsed_v1") === "true";
    card.classList.toggle("collapsed", collapsed);
    button.textContent = collapsed ? "⌄" : "⌃";
    button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    button.addEventListener("click", () => {
      const next = !card.classList.contains("collapsed");
      card.classList.toggle("collapsed", next);
      button.textContent = next ? "⌄" : "⌃";
      button.setAttribute("aria-expanded", next ? "false" : "true");
      localStorage.setItem("bluefox_mission_collapsed_v1", String(next));
    });
    card.prepend(button);
  }

  function readJournalState() {
    const bac =
      global.BlueFox3D?.getBACDiagnostics?.() ||
      global.BlueFox3D?.BAC?.getDiagnostics?.() ||
      null;
    let clock = {};
    try {
      clock = JSON.parse(
        localStorage.getItem("bluefox_planet_clock_v1") || "{}"
      );
    } catch {
      clock = {};
    }
    const baseMinutes = Number.isFinite(clock.gameMinutes)
      ? clock.gameMinutes
      : 8 * 60 + 42;
    const elapsedSinceClock = Number.isFinite(clock.realTime)
      ? Math.max(0, (Date.now() - clock.realTime) / 1000)
      : 0;
    return {
      bac,
      totalMinutes: Math.max(0, baseMinutes + elapsedSinceClock)
    };
  }

  function fictionalDate(totalMinutes) {
    const minutesPerSol = 20 * 60;
    const solIndex = Math.floor(totalMinutes / minutesPerSol);
    const solOfCycle = solIndex % 30 + 1;
    const cycleIndex = Math.floor(solIndex / 30);
    const cycles = [
      "de l’Éveil",
      "de Floraison",
      "du Zénith",
      "des Brumes"
    ];
    const year = Math.floor(cycleIndex / cycles.length) + 1;
    const cycle = cycles[cycleIndex % cycles.length];
    return `Sol ${String(solOfCycle).padStart(2, "0")} · Cycle ${cycle} · An ${year}`;
  }

  function elapsedPlanetTime(totalMinutes) {
    const wholeMinutes = Math.floor(totalMinutes);
    const sols = Math.floor(wholeMinutes / (20 * 60));
    const remainder = wholeMinutes % (20 * 60);
    const hours = Math.floor(remainder / 60);
    const minutes = remainder % 60;
    return `${sols} sol${sols > 1 ? "s" : ""} · ${String(hours).padStart(2, "0")} h ${String(minutes).padStart(2, "0")}`;
  }

  function bacEmotionSummary(bac) {
    const labels = {
      curiosity: "curiosité",
      serenity: "sérénité",
      concern: "inquiétude",
      determination: "détermination",
      frustration: "frustration"
    };
    const key = bac?.relation?.dominantEmotion;
    if (!key) return { key: "indisponible", label: "indisponible", badge: "ÉMOTION · INDISPONIBLE" };
    const rawValue = Number(bac?.relation?.emotions?.[key]);
    const value = Number.isFinite(rawValue) ? Math.round(rawValue) : null;
    const label = labels[key] || String(key);
    return {
      key,
      label: value == null ? label : `${label} · ${value}%`,
      badge: `ÉMOTION · ${label.toLocaleUpperCase("fr")}`
    };
  }


  const TRUST_NARRATIVES = Object.freeze({
    hasard: Object.freeze({
      title: "Hasard",
      text: "Il m'arrive parfois de changer d'idée... sans vraiment savoir pourquoi."
    }),
    presence: Object.freeze({
      title: "Présence",
      text: "Comme si une présence discrète m'accompagnait."
    }),
    reserve: Object.freeze({
      title: "Réserve",
      text: "Je peine encore à comprendre les intentions de cette présence."
    }),
    mefiance: Object.freeze({
      title: "Méfiance",
      text: "Je préfère désormais remettre certaines de ses suggestions en question."
    }),
    refus: Object.freeze({
      title: "Refus",
      text: "Je ne peux plus suivre cette présence aveuglément."
    }),
    guide: Object.freeze({
      title: "Guide",
      text: "Cette présence cherche peut-être à m'aider."
    }),
    compagnon: Object.freeze({
      title: "Compagnon",
      text: "Nos décisions semblent converger."
    }),
    allie: Object.freeze({
      title: "Allié",
      text: "Nos décisions ne forment plus qu'une seule volonté."
    })
  });

  function bacTrustSummary(bac) {
    const awareness = Math.max(0, Math.min(100, Number(bac?.relation?.awareness) || 0));
    const trust = Math.max(-100, Math.min(100, Number(bac?.relation?.trustGeneral) || 0));
    let key;

    // Les deux premiers niveaux décrivent la prise de conscience de l'influence.
    // La confiance ne fait diverger le récit qu'une fois la présence reconnue.
    if (awareness < 40) key = "hasard";
    else if (awareness < 60) key = "presence";
    else if (trust <= -55) key = "refus";
    else if (trust <= -18) key = "mefiance";
    else if (trust < 0) key = "reserve";
    else if (trust < 18) key = "guide";
    else if (trust < 55) key = "compagnon";
    else key = "allie";

    const narrative = TRUST_NARRATIVES[key];
    return {
      ...narrative,
      key,
      trust,
      needleAngle: -180 + ((trust + 100) / 200) * 180
    };
  }

  function ensureTrustIndicatorStyles() {
    if (document.getElementById("bluefox-journal-trust-styles")) return;
    const style = document.createElement("style");
    style.id = "bluefox-journal-trust-styles";
    style.textContent = `
      .journal-temporal-meta {
        gap: 10px;
        margin: 8px 0 10px;
      }
      .journal-temporal-meta > div {
        min-height: 54px;
        padding: 11px 13px;
      }
      .journal-temporal-meta span {
        margin-bottom: 5px;
        font-size: 10.5px;
      }
      .journal-temporal-meta b {
        font-size: 15px;
        line-height: 1.35;
      }
      .journal-temporal-meta .journal-feeling-block {
        grid-column: span 1;
        width: 100%;
        box-sizing: border-box;
      }
      .journal-temporal-meta .journal-current-thoughts {
        grid-column: span 1;
        width: 100%;
        min-height: 132px;
        box-sizing: border-box;
        padding: 11px 13px;
        border: 1px solid rgba(92,220,255,.22);
        border-radius: 10px;
        background: rgba(4,22,38,.38);
        overflow-y: auto;
        scrollbar-width: thin;
      }
      .journal-current-thoughts .journal-narrative-eyebrow {
        display: block;
        margin-bottom: 8px;
        color: #64e6ff;
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: .11em;
      }
      .journal-current-thoughts .journal-narrative-entry {
        margin: 0 0 7px;
        color: rgba(224,240,244,.86);
        font-size: 13px;
        line-height: 1.45;
      }
      .journal-current-thoughts .journal-narrative-entry:last-child {
        margin-bottom: 0;
      }
      .journal-current-thoughts .journal-narrative-empty {
        color: rgba(190,211,218,.62);
        font-style: italic;
      }
      .journal-temporal-meta .journal-feeling-block > b {
        display: block;
      }
      .journal-temporal-meta .journal-trust-row {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 15px;
        min-width: 0;
        margin-top: 9px;
      }
      .journal-trust-gauge {
        position: relative;
        flex: 0 0 88px;
        width: 88px;
        height: 48px;
      }
      .journal-trust-gauge__arc {
        position: absolute;
        left: 4px;
        top: 2px;
        width: 80px;
        height: 40px;
        overflow: hidden;
        border-radius: 80px 80px 0 0;
        background:
          repeating-conic-gradient(from 270deg at 50% 100%,
            rgba(238,248,247,.42) 0deg .8deg,
            transparent .8deg 9deg),
          conic-gradient(from 270deg at 50% 100%,
            #bd3845 0deg 72deg,
            #8b6268 72deg 88deg,
            #68716e 88deg 92deg,
            #66866c 92deg 108deg,
            #42a568 108deg 180deg,
            transparent 180deg 360deg);
        box-shadow: inset 0 0 0 1px rgba(225,240,242,.22);
      }
      .journal-trust-gauge__arc::after {
        content: "";
        position: absolute;
        left: 12px;
        top: 12px;
        width: 56px;
        height: 28px;
        border-radius: 56px 56px 0 0;
        background: rgba(10,28,34,.94);
      }
      .journal-trust-gauge__needle {
        position: absolute;
        left: 44px;
        top: 39px;
        width: 34px;
        height: 2px;
        border-radius: 2px;
        background: #edf8f7;
        box-shadow: 0 0 4px rgba(232,243,242,.82);
        transform-origin: 0 50%;
        transform: rotate(var(--trust-angle));
        transition: transform .35s ease;
        z-index: 2;
      }
      .journal-trust-gauge__hub {
        position: absolute;
        left: 40px;
        top: 35px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #d7e7e5;
        border: 1px solid rgba(7,20,24,.9);
        z-index: 3;
      }
      .journal-trust-gauge__minus,
      .journal-trust-gauge__zero,
      .journal-trust-gauge__plus {
        position: absolute;
        bottom: 0;
        font-size: 7px;
        line-height: 1;
        font-weight: 800;
        white-space: nowrap;
      }
      .journal-trust-gauge__minus { left: 0; color: #e45d67; }
      .journal-trust-gauge__zero { left: 50%; color: #9bb2b2; transform: translateX(-50%); }
      .journal-trust-gauge__plus { right: 0; color: #61c982; }
      .journal-trust-copy {
        min-width: 0;
        flex: 1 1 auto;
        overflow: visible;
      }
      .journal-trust-copy em {
        display: block;
        color: rgba(220,235,234,.82);
        font-size: 13px;
        line-height: 1.35;
        font-style: italic;
        white-space: normal;
        overflow: visible;
        text-overflow: clip;
      }
      .journal-current-thoughts {
        grid-column: 1 / -1;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
        padding: 11px 13px !important;
      }
      .journal-current-thoughts .journal-narrative-eyebrow {
        margin-bottom: 7px;
      }
      .journal-current-thoughts .journal-narrative-entry {
        margin-bottom: 5px;
      }
      .living-notes.journal-narrative-notes {
        display: block;
        min-height: 0;
        margin-bottom: 10px;
      }
      .living-notes.journal-narrative-notes article {
        min-width: 0;
        min-height: 132px;
        max-height: 174px;
        padding: 12px !important;
        overflow-y: auto;
        scrollbar-width: thin;
      }
      .journal-narrative-notes .journal-narrative-eyebrow {
        display: block;
        margin-bottom: 8px;
        color: #64e6ff;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .11em;
      }
      .journal-narrative-notes .journal-narrative-entry {
        margin: 0 0 7px;
        color: rgba(224,240,244,.86);
        font-size: 13px;
        line-height: 1.45;
      }
      .journal-narrative-notes .journal-narrative-entry:last-child {
        margin-bottom: 0;
      }
      .journal-narrative-notes .journal-narrative-entry b {
        color: #edfaff;
      }
      .journal-narrative-notes .journal-narrative-empty {
        color: rgba(190,211,218,.62);
        font-style: italic;
      }
      .journal-evolution-card {
        grid-column: 1 / -1;
        max-height: none !important;
        overflow: visible !important;
      }
      .journal-evolution-theme {
        margin: 0 0 8px;
        border: 1px solid rgba(100,225,255,.17);
        border-radius: 9px;
        background: rgba(4,22,38,.38);
      }
      .journal-evolution-theme:last-child {
        margin-bottom: 0;
      }
      .journal-evolution-theme summary {
        padding: 8px 9px;
        cursor: pointer;
        color: #edfaff;
        font-size: 12px;
        font-weight: 800;
        list-style: none;
      }
      .journal-evolution-theme summary::-webkit-details-marker {
        display: none;
      }
      .journal-evolution-theme summary::before {
        content: "▸";
        display: inline-block;
        width: 14px;
        color: #64e6ff;
      }
      .journal-evolution-theme[open] summary::before {
        content: "▾";
      }
      .journal-evolution-copy {
        margin: 0;
        padding: 0 9px 10px 23px;
        color: rgba(224,240,244,.86);
        font-size: 13px;
        line-height: 1.5;
      }
      .journal-current-state-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 11px;
        grid-column: 1 / -1;
      }
      .journal-current-state-row > * {
        min-width: 0;
      }
      @media (max-width: 900px) {
        .journal-current-state-row {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }


  const JOURNAL_EVOLUTION_AXIS_LABELS = Object.freeze({
    exploration: "Exploration",
    collection: "Collecte",
    research: "Recherche",
    relations: "Relations",
    survival: "Survie"
  });

  const JOURNAL_EVOLUTION_EVENT_AXES = Object.freeze({
    OBJECT_SEEN: "exploration",
    PHENOMENON_OBSERVED: "exploration",
    OBJECT_INSPECTED: "research",
    OBJECT_ANALYZED: "research",
    KNOWLEDGE_ACQUIRED: "research",
    RESOURCE_COLLECTED: "collection",
    RESOURCE_EXTRACTED: "collection"
  });

  const JOURNAL_EVOLUTION_THEME_FIELDS = Object.freeze([
    "theme",
    "narrativeTheme",
    "domain",
    "category"
  ]);

  const journalEvolutionThemeId = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

  const journalEvolutionLabel = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const id = journalEvolutionThemeId(raw);
    return JOURNAL_EVOLUTION_AXIS_LABELS[id] ||
      raw.replace(/[-_]+/g, " ")
        .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));
  };

  const journalEvolutionMissionDefinitions = () => {
    const BF = global.BlueFox3D;
    const runtime = BF?.bibleRuntime;
    const result = new Map();

    const add = (mission) => {
      if (!mission?.id) return;
      result.set(String(mission.id), mission);
    };

    if (runtime?.allMissions) {
      runtime.allMissions().forEach(add);
    } else {
      runtime?.catalog?.forEach?.(add);
      runtime?.dynamicMissions?.forEach?.(add);
    }

    return result;
  };

  const journalEvolutionMissionTheme = (mission) => {
    if (!mission) return null;
    for (const field of JOURNAL_EVOLUTION_THEME_FIELDS) {
      if (mission[field]) {
        return {
          id: journalEvolutionThemeId(mission[field]),
          label: journalEvolutionLabel(mission[field])
        };
      }
    }
    const axis = mission.passivePriorityAxis || mission.priorityAxis || null;
    if (!axis) return null;
    return {
      id: journalEvolutionThemeId(axis),
      label: journalEvolutionLabel(axis)
    };
  };

  const journalEvolutionEventTheme = (event, missions) => {
    if (!event) return null;

    for (const field of JOURNAL_EVOLUTION_THEME_FIELDS) {
      const value = event[field] ?? event.detail?.[field];
      if (value) {
        return {
          id: journalEvolutionThemeId(value),
          label: journalEvolutionLabel(value)
        };
      }
    }

    const missionId =
      event.missionId ||
      event.detail?.missionId ||
      event.bibleMissionId ||
      event.detail?.bibleMissionId ||
      null;
    const missionTheme = journalEvolutionMissionTheme(
      missionId ? missions.get(String(missionId)) : null
    );
    if (missionTheme) return missionTheme;

    const type = String(event.type || "").toUpperCase();
    const axis = JOURNAL_EVOLUTION_EVENT_AXES[type] || null;
    return axis
      ? { id: axis, label: JOURNAL_EVOLUTION_AXIS_LABELS[axis] }
      : null;
  };

  const journalEvolutionEventWeight = (event, missions) => {
    const missionId =
      event?.missionId ||
      event?.detail?.missionId ||
      event?.bibleMissionId ||
      event?.detail?.bibleMissionId ||
      null;
    const mission = missionId ? missions.get(String(missionId)) : null;
    const priority = Number(mission?.priority);
    if (Number.isFinite(priority) && priority > 0) {
      return Math.max(1, Math.min(4, priority / 30));
    }
    const type = String(event?.type || "").toUpperCase();
    if (type === "KNOWLEDGE_ACQUIRED") return 2.2;
    if (type === "OBJECT_ANALYZED") return 1.7;
    if (type === "OBJECT_INSPECTED" || type === "PHENOMENON_OBSERVED") return 1.3;
    return 1;
  };

  const journalEvolutionEventTime = (event) => {
    const value = Number(event?.at ?? event?.timestamp ?? event?.time);
    return Number.isFinite(value) ? value : 0;
  };

  const journalEvolutionSubjectLabel = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";

    if (/^(?:natural_decor|decors_nature)$/i.test(raw)) {
      return "Décors naturels";
    }
    const definition = global.BlueFox3D?.ObjectLibrary?.getById?.(raw);
    const human = definition?.label || definition?.name || definition?.title;
    if (human) return String(human);

    const normalized = raw
      .replace(/^offline-/i, "")
      .replace(/^doc-/i, "")
      .replace(/^bio-/i, "")
      .replace(/^res-/i, "")
      .replace(/-(?:m|s)-?\d+$/i, "")
      .replace(/-\d+$/i, "")
      .replace(/[_-]+/g, " ")
      .trim();

    const aliases = {
      observation: "mes observations",
      resource: "les ressources étudiées",
      wood: "le bois",
      crystal: "les cristaux",
      bush: "les buissons",
      adap: "les plantes adaptatives",
      "natural decor": "Décors naturels",
      "decors nature": "Décors naturels"
    };

    const words = normalized.split(/\s+/).filter(Boolean);
    const meaningful = words.filter((word) => ![
      "offline", "doc", "bio", "res", "resource", "resources", "m", "s"
    ].includes(word.toLowerCase()));
    const aliasKey = meaningful.join(" ").toLowerCase() || normalized.toLowerCase();
    if (aliases[aliasKey]) return aliases[aliasKey];
    const lastAlias = meaningful.at(-1)?.toLowerCase();
    if (lastAlias && aliases[lastAlias]) return aliases[lastAlias];

    const label = meaningful.join(" ") || normalized;
    if (!label || /^(?:observation|resource)$/i.test(label)) {
      return aliases[label.toLowerCase()] || "";
    }
    return label
      .toLocaleLowerCase("fr")
      .replace(/\b\p{L}/u, (letter) => letter.toLocaleUpperCase("fr"));
  };

  function buildJournalEvolutionThemes() {
    const BF = global.BlueFox3D;
    const progression = BF?.getProgressionState?.();
    const history = Array.isArray(progression?.history)
      ? progression.history
      : [];
    if (!history.length) return [];

    const missions = journalEvolutionMissionDefinitions();
    const grouped = new Map();

    history.forEach((event) => {
      const theme = journalEvolutionEventTheme(event, missions);
      if (!theme?.id) return;

      const bucket = grouped.get(theme.id) || {
        id: theme.id,
        label: theme.label || journalEvolutionLabel(theme.id),
        events: [],
        score: 0,
        subjects: new Map(),
        missionIds: new Set(),
        firstAt: 0,
        lastAt: 0
      };

      const weight = journalEvolutionEventWeight(event, missions);
      const at = journalEvolutionEventTime(event);
      bucket.events.push(event);
      bucket.score += weight;
      if (at) {
        bucket.firstAt = bucket.firstAt ? Math.min(bucket.firstAt, at) : at;
        bucket.lastAt = Math.max(bucket.lastAt, at);
      }

      const subject =
        event.subject ||
        event.objectId ||
        event.family ||
        event.detail?.subject ||
        event.detail?.kind ||
        null;
      if (subject) {
        const rawKey = String(subject);
        const key = /^(?:natural_decor|decors_nature)$/i.test(rawKey)
          ? "natural_decor"
          : rawKey;
        bucket.subjects.set(
          key,
          (bucket.subjects.get(key) || 0) + weight
        );
      }

      const missionId =
        event.missionId ||
        event.detail?.missionId ||
        event.bibleMissionId ||
        event.detail?.bibleMissionId ||
        null;
      if (missionId) bucket.missionIds.add(String(missionId));

      grouped.set(theme.id, bucket);
    });

    const bac =
      BF?.getBACDiagnostics?.() ||
      BF?.BAC?.getDiagnostics?.() ||
      null;
    const priorities = bac?.profile?.priorities || bac?.priorities || {};

    return [...grouped.values()]
      .filter((bucket) => bucket.events.length >= 2 || bucket.score >= 2)
      .map((bucket) => {
        const eventCounts = bucket.events.reduce((counts, event) => {
          const type = String(event?.type || "").toUpperCase();
          if (type) counts[type] = (counts[type] || 0) + 1;
          return counts;
        }, {});
        const topSubjects = [...bucket.subjects.entries()]
          .sort((left, right) => right[1] - left[1])
          .slice(0, 3)
          .map(([subject]) => journalEvolutionSubjectLabel(subject))
          .filter(Boolean);
        const axisPriority = Number(priorities?.[bucket.id]);
        const text = journalEvolutionNarrative(
          bucket,
          eventCounts,
          topSubjects,
          Number.isFinite(axisPriority) ? axisPriority : null
        );
        const psychology = BF?.getMultiProgressionState?.()?.psychology || {};
        const obsessions = Object.entries(psychology.missionObsessions || {})
          .filter(([, value]) => Number(value?.pressure) > 0)
          .map(([id, value]) => `${id}:${Math.round(Number(value.pressure) || 0)}`)
          .sort();
        const memories = Object.values(psychology.missionMemories || {})
          .filter((memory) => memory?.missionId)
          .map((memory) => `${memory.missionId}:${memory.valence || "neutral"}:${Number(memory.scoreTrauma) || 0}`)
          .sort();
        let enrichedText = text;
        if (obsessions.length) {
          enrichedText += " Certaines pistes reviennent avec insistance dans mes pensées, même lorsque je tente de les laisser de côté.";
        }
        if (memories.some((item) => item.includes(":negative:"))) {
          enrichedText += " Quelques souvenirs restent plus lourds que les autres et continuent d’influencer ma manière d’aborder ce domaine.";
        }
        return {
          id: bucket.id,
          label: bucket.label,
          score: bucket.score,
          lastAt: bucket.lastAt,
          text: enrichedText,
          metrics: {
            events: bucket.events.length,
            score: Math.round(bucket.score * 10) / 10,
            subjects: bucket.subjects.size,
            missions: bucket.missionIds.size,
            lastAt: bucket.lastAt
          },
          psychologySignature: [...obsessions, ...memories].join("|")
        };
      })
      .filter((theme) => theme.text)
      .sort((left, right) =>
        right.score - left.score ||
        right.lastAt - left.lastAt ||
        left.label.localeCompare(right.label, "fr")
      );
  }

  function journalEvolutionNarrative(bucket, counts, subjects, playerPriority) {
    const total = bucket.events.length;
    const observed =
      (counts.OBJECT_SEEN || 0) +
      (counts.PHENOMENON_OBSERVED || 0);
    const studied =
      (counts.OBJECT_INSPECTED || 0) +
      (counts.OBJECT_ANALYZED || 0) +
      (counts.KNOWLEDGE_ACQUIRED || 0);
    const collected =
      (counts.RESOURCE_COLLECTED || 0) +
      (counts.RESOURCE_EXTRACTED || 0);
    const focus = subjects.length ? subjects.join(", ") : "";
    const intensity = playerPriority == null
      ? 0
      : playerPriority >= 75
        ? 2
        : playerPriority >= 60
          ? 1
          : 0;
    const variantSeed = Math.abs(
      [...String(bucket.id || "")].reduce(
        (sum, character) => sum + character.charCodeAt(0),
        total + Math.round(bucket.score * 10)
      )
    );
    const pick = (variants, offset = 0) =>
      variants[(variantSeed + offset) % variants.length];

    const sentences = [];
    if (bucket.id === "exploration") {
      sentences.push(pick(total < 6 ? [
        "Je commence à distinguer ce qui mérite vraiment mon attention dans les territoires que je parcours.",
        "Chaque nouveau terrain m'oblige encore à ralentir, regarder, comparer. Peu à peu, certains signes deviennent familiers.",
        "Je n'explore déjà plus tout à fait comme au premier jour : mon regard accroche plus vite les détails utiles."
      ] : [
        "Au fil des territoires parcourus, mes premières impressions se transforment en repères plus solides.",
        "À force d'avancer, le monde me paraît moins opaque. Je commence à reconnaître ses rythmes avant même de les analyser.",
        "Les paysages cessent peu à peu d'être une succession d'inconnues : certains motifs me reviennent, presque instinctivement."
      ]));
      if (observed >= 4) {
        sentences.push(pick([
          "Mes observations répétées m'aident désormais à reconnaître plus vite les phénomènes et les éléments déjà familiers.",
          "Je remarque que mes yeux cherchent d'eux-mêmes ce que j'ai déjà appris à repérer.",
          "Ce que j'observais autrefois avec hésitation devient maintenant un ensemble de signes que je lis beaucoup plus vite."
        ], 3));
      }
    } else if (bucket.id === "collection") {
      sentences.push(pick(collected < 8 ? [
        "Mes premières récoltes m'apprennent surtout quelles ressources sont réellement utiles sur le terrain.",
        "Je commence à faire la différence entre ce qui attire simplement mon attention et ce qui mérite vraiment d'être emporté.",
        "Chaque collecte m'apprend encore quelque chose sur ce dont j'ai réellement besoin pour continuer."
      ] : [
        "La collecte est devenue une activité que je maîtrise bien mieux qu'à mon arrivée, autant dans le choix des ressources que dans leur usage.",
        "Je ne ramasse plus au hasard. Avec l'expérience, mes choix deviennent plus sûrs, plus rapides, presque naturels.",
        "Les ressources ne sont plus de simples objets à prendre : je commence à les replacer dans une logique de préparation et de survie."
      ]));
    } else if (bucket.id === "research") {
      sentences.push(pick(studied < 5 ? [
        "Je rassemble encore mes premières références, mais certaines observations commencent déjà à se répondre.",
        "Quelques détails isolés commencent à se relier entre eux. C'est encore fragile, mais je sens qu'un motif apparaît.",
        "Je manque encore de recul, pourtant certaines découvertes cessent déjà d'être indépendantes les unes des autres."
      ] : [
        "Ce qui n'était au départ qu'une série d'observations isolées commence à former un ensemble de connaissances plus cohérent.",
        "Mes notes finissent par se rejoindre. Plus j'analyse, plus certaines questions anciennes trouvent enfin un contexte.",
        "Je commence à comprendre que mes découvertes forment un réseau plutôt qu'une simple accumulation de faits."
      ]));
      if ((counts.OBJECT_ANALYZED || 0) >= 3 || (counts.KNOWLEDGE_ACQUIRED || 0) >= 1) {
        sentences.push(pick([
          "Mes analyses ne servent plus seulement à identifier ce que je vois : elles m'aident progressivement à comprendre des relations que je ne percevais pas au début.",
          "Je ne cherche plus seulement à nommer les choses. J'essaie de comprendre pourquoi elles sont là, et ce qu'elles racontent ensemble.",
          "Certaines réponses font naître de nouvelles questions, mais elles ont au moins cessé d'être entièrement étrangères."
        ], 5));
      }
    } else if (bucket.id === "relations") {
      sentences.push(pick([
        "Mes rencontres commencent à former une histoire plutôt qu'une succession de contacts isolés.",
        "Je me surprends à attendre certaines réactions, à reconnaître des attitudes, parfois même à espérer une réponse familière.",
        "Les êtres que je croise ne sont plus seulement des présences sur mon chemin. Certains commencent à compter différemment."
      ]));
    } else if (bucket.id === "survival") {
      sentences.push(pick([
        "Ma manière de survivre s'est peu à peu structurée : je ne réagis plus seulement aux urgences, j'anticipe davantage ce dont j'aurai besoin.",
        "Je sens que mes réflexes changent. Je prépare davantage avant d'avoir faim, froid ou besoin de repos.",
        "Au début je répondais surtout à l'urgence. Maintenant, j'essaie de garder une longueur d'avance sur mes besoins."
      ]));
    } else {
      sentences.push(pick([
        `Avec le temps, mes expériences liées à ${bucket.label.toLocaleLowerCase("fr")} commencent à former une évolution identifiable.`,
        `Je remarque que ${bucket.label.toLocaleLowerCase("fr")} prend progressivement une place plus nette dans ce que j'apprends et dans la manière dont j'agis.`,
        `Ce thème revient assez souvent pour que je commence à sentir une véritable continuité dans mon expérience de ${bucket.label.toLocaleLowerCase("fr")}.`
      ]));
    }

    if (focus) {
      sentences.push(pick(subjects.length === 1 ? [
        `Je reviens souvent sur ${focus}, qui devient progressivement un repère plus familier.`,
        `${focus} revient régulièrement dans mon parcours ; je commence à ne plus l'aborder comme quelque chose d'entièrement nouveau.`,
        `Je remarque que ${focus} occupe une place particulière dans ce que j'ai appris jusqu'ici.`
      ] : [
        `Je reviens souvent sur ${focus}; ces éléments deviennent progressivement des repères plus familiers.`,
        `${focus} reviennent assez souvent pour former maintenant un ensemble de repères que je reconnais de mieux en mieux.`,
        `Parmi tout ce que j'ai croisé, ${focus} sont devenus des références récurrentes dans mon expérience.`
      ], 7));
    }

    if (bucket.missionIds.size >= 2) {
      sentences.push(pick([
        "Plusieurs missions différentes ont contribué à cette évolution, ce qui me donne une vision moins ponctuelle de ce domaine.",
        "Ce n'est plus lié à une seule mission : plusieurs expériences différentes commencent à se renforcer les unes les autres.",
        "Cette évolution traverse maintenant plusieurs objectifs, et je sens qu'elle dépasse le simple contexte d'une mission."
      ], 11));
    }

    if (playerPriority != null) {
      if (intensity === 2 && bucket.score >= 6) {
        sentences.push(pick([
          "Et là, je le sens vraiment : cette direction me tire vers elle. Plus j'y consacre d'attention, plus j'ai envie d'aller au bout de ce qu'elle peut m'apprendre.",
          "Cette orientation résonne fortement avec la place que tu lui donnes. Elle n'est plus seulement importante : elle commence à devenir quelque chose que j'attends, presque avec impatience.",
          "Je crois que cette priorité est en train de me marquer. Quand une occasion se présente dans ce domaine, ma curiosité monte immédiatement et j'ai du mal à simplement passer à autre chose."
        ], 13));
      } else if (intensity === 1 && bucket.score >= 6) {
        sentences.push(pick([
          "Cette orientation correspond aussi à l'importance que tu lui accordes, et je sens qu'elle prend une place durable dans mes choix.",
          "Je remarque que l'attention que tu portes à ce domaine renforce aussi la mienne ; j'y reviens plus volontiers.",
          "Cette priorité commence à influencer ma façon de regarder les occasions qui se présentent."
        ], 13));
      } else if (playerPriority >= 65 && bucket.score < 4) {
        sentences.push(
          "Tu sembles vouloir m'orienter davantage dans cette direction, mais mon expérience réelle y reste encore limitée."
        );
      } else if (playerPriority <= 35 && bucket.score >= 8) {
        sentences.push(
          "Même si tu n'en fais pas une priorité forte, le terrain m'a conduit à développer beaucoup d'expérience dans ce domaine."
        );
      }
    }

    return sentences.join(" ");
  }

  let journalConsolidationPending = false;

  function requestJournalConsolidation() {
    journalConsolidationPending = true;
    scheduleScan();
  }

  function consolidateJournalNarrativeAtOpen(panel, emotion) {
    if (!panel || !journalConsolidationPending) return false;
    const BF = global.BlueFox3D;
    if (typeof BF?.consolidateJournalNarrative !== "function") return false;
    BF.consolidateJournalNarrative({
      themes: buildJournalEvolutionThemes(),
      mood: {
        key: String(emotion?.key || "indisponible"),
        label: emotion?.label || "indisponible",
        text: emotion?.key && emotion.key !== "indisponible"
          ? `Aujourd’hui, je me sens surtout traversé par ${String(emotion.label).toLocaleLowerCase("fr")}.`
          : "Je n’arrive pas encore à mettre un mot précis sur mon humeur."
      }
    });
    journalConsolidationPending = false;
    return true;
  }

  function renderJournalNarrativeNotes(report) {
    const host = report?.querySelector(".living-notes");
    if (!host) return;

    const entries = (global.BlueFox3D?.getJournalState?.()?.entries || [])
      .filter((entry) => entry?.type === "bible" && entry?.text);
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const daily = entries
      .filter((entry) => Number(entry.at) >= dayStart.getTime())
      .slice(0, 8);
    const narrativeState = global.BlueFox3D?.getJournalNarrativeState?.() || {};
    const evolutionThemes = Object.values(narrativeState.themes || {})
      .sort((left, right) =>
        Number(right?.metrics?.score || 0) - Number(left?.metrics?.score || 0) ||
        Number(right?.updatedAt || 0) - Number(left?.updatedAt || 0)
      );
    const pastThoughts = Array.isArray(narrativeState.pastThoughts)
      ? narrativeState.pastThoughts.slice(-4).reverse()
      : [];
    const signature = daily
      .map((entry) => `${entry.id}:${entry.at}`)
      .join("|") + "||" + evolutionThemes
        .map((theme) => `${theme.id}:${theme.updatedAt || 0}`)
        .join("|") + "||" + pastThoughts.map((item) => `${item.key}:${item.at}`).join("|");
    const meta = report.querySelector(".journal-temporal-meta");
    const thoughtsPresent = Boolean(
      meta?.querySelector(".journal-current-state-row .journal-current-thoughts")
    );
    if (
      host.dataset.journalNarrativeSignature === signature &&
      thoughtsPresent
    ) return;
    host.dataset.journalNarrativeSignature = signature;
    host.classList.add("journal-narrative-notes");
    host.replaceChildren();

    const makeCard = (label, items, emptyText, className = "") => {
      const article = document.createElement("article");
      if (className) article.className = className;
      const eyebrow = document.createElement("span");
      eyebrow.className = "journal-narrative-eyebrow";
      eyebrow.textContent = label;
      article.appendChild(eyebrow);

      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "journal-narrative-entry journal-narrative-empty";
        empty.textContent = emptyText;
        article.appendChild(empty);
        return article;
      }

      items.forEach((entry) => {
        const paragraph = document.createElement("p");
        paragraph.className = "journal-narrative-entry";
        if (entry.title) {
          const title = document.createElement("b");
          title.textContent = `${entry.title} — `;
          paragraph.appendChild(title);
        }
        paragraph.append(entry.text);
        article.appendChild(paragraph);
      });
      return article;
    };

    const makeEvolutionCard = (themes) => {
      const article = document.createElement("article");
      article.className = "journal-evolution-card";
      const eyebrow = document.createElement("span");
      eyebrow.className = "journal-narrative-eyebrow";
      eyebrow.textContent = "SYNTHÈSE DES ÉVOLUTIONS";
      article.appendChild(eyebrow);

      if (!themes.length) {
        const empty = document.createElement("p");
        empty.className = "journal-narrative-entry journal-narrative-empty";
        empty.textContent =
          "Aucune synthèse narrative consolidée pour le moment.";
        article.appendChild(empty);
        return article;
      }

      let savedThemeState = {};
      try {
        savedThemeState = JSON.parse(
          localStorage.getItem("bluefox_journal_evolution_theme_state_v1") || "{}"
        );
      } catch {
        savedThemeState = {};
      }

      themes.forEach((theme) => {
        const details = document.createElement("details");
        details.className = "journal-evolution-theme";
        const storedOpen = savedThemeState?.[theme.id];
        details.open = storedOpen === true;
        const summary = document.createElement("summary");
        summary.textContent = theme.label;
        const paragraph = document.createElement("p");
        paragraph.className = "journal-evolution-copy";
        paragraph.textContent = theme.text;
        details.append(summary, paragraph);
        details.addEventListener("toggle", () => {
          let state = {};
          try {
            state = JSON.parse(
              localStorage.getItem("bluefox_journal_evolution_theme_state_v1") || "{}"
            );
          } catch {
            state = {};
          }
          state[theme.id] = details.open;
          localStorage.setItem(
            "bluefox_journal_evolution_theme_state_v1",
            JSON.stringify(state)
          );
        });
        article.appendChild(details);
      });
      return article;
    };

    if (meta) {
      const stateRow = meta.querySelector(".journal-current-state-row");
      if (stateRow) {
        const thoughts = stateRow.querySelector(".journal-current-thoughts");
        const replacement = makeCard(
          "PENSÉES DU JOUR",
          daily,
          "Aucune pensée missionnelle dédiée au Journal aujourd’hui.",
          "journal-current-thoughts"
        );
        if (thoughts) thoughts.replaceWith(replacement);
        else stateRow.appendChild(replacement);
      }
    }

    host.append(makeEvolutionCard(evolutionThemes));
    if (pastThoughts.length) {
      host.append(makeCard(
        "PENSÉES PASSÉES",
        pastThoughts.map((item) => ({
          title: item.label || "Humeur précédente",
          text: item.text || ""
        })),
        ""
      ));
    }
  }

  function enhanceJournal(panel) {
    const report = panel.querySelector(".journal-report");
    const heading = report?.querySelector(".journal-heading");
    if (!report || !heading) return;
    const actionHeading = [...report.children].find((element) =>
      element.tagName === "H3"
    );
    if (actionHeading) actionHeading.textContent = "50 dernières actions";
    const mapId = currentMapId(panel);
    const windowBiome = panel.querySelector(".journal-window-biome");
    if (windowBiome) {
      positionJournalWindow(panel);
      applySceneImage(windowBiome, mapId);
      windowBiome.classList.add("journal-window-biome-live");
    }
    let meta = report.querySelector(".journal-temporal-meta");
    if (!meta) {
      meta = document.createElement("section");
      meta.className = "journal-temporal-meta";
      heading.insertAdjacentElement("afterend", meta);
    }
    const { bac, totalMinutes } = readJournalState();
    const emotion = bacEmotionSummary(bac);
    const trust = bacTrustSummary(bac);
    ensureTrustIndicatorStyles();
    const mapName =
      global.BlueFox3D?.maps?.[mapId]?.name ||
      mapData[mapId]?.name ||
      "Zone inconnue";
    const signature = `${Math.floor(totalMinutes)}:${emotion.label}:${trust.key}:${Math.round(trust.trust)}:${mapId}:${mapName}`;
    if (meta.dataset.signature !== signature) {
      meta.dataset.signature = signature;
      meta.innerHTML = `
      <div><span>ZONE ACTUELLE</span><b>${mapName}</b></div>
      <div><span>DATE PLANÉTAIRE</span><b>${fictionalDate(totalMinutes)}</b></div>
      <div><span>DEPUIS L’ARRIVÉE</span><b>${elapsedPlanetTime(totalMinutes)}</b></div>
      <div class="journal-current-state-row">
        <div class="journal-feeling-block">
          <span>RESSENTI DE BLUEFOX</span><b>${emotion.label}</b>
          <div class="journal-trust-row">
            <div class="journal-trust-gauge" role="img" aria-label="Influence perçue : ${trust.title} · ${trust.trust.toFixed(1)} sur 100">
              <span class="journal-trust-gauge__arc"></span>
              <span class="journal-trust-gauge__needle" style="--trust-angle:${trust.needleAngle.toFixed(2)}deg"></span>
              <span class="journal-trust-gauge__hub"></span>
              <span class="journal-trust-gauge__minus" aria-hidden="true">−100</span>
              <span class="journal-trust-gauge__zero" aria-hidden="true">0</span>
              <span class="journal-trust-gauge__plus" aria-hidden="true">+100</span>
            </div>
            <div class="journal-trust-copy"><em>${trust.text}</em></div>
          </div>
        </div>
        <article class="journal-current-thoughts">
          <span class="journal-narrative-eyebrow">PENSÉES DU JOUR</span>
          <p class="journal-narrative-entry journal-narrative-empty">Aucune pensée missionnelle dédiée au Journal aujourd’hui.</p>
        </article>
      </div>`;
    }
    consolidateJournalNarrativeAtOpen(panel, emotion);
    renderJournalNarrativeNotes(report);
  }

  function setPlanetDetail(panel, direction) {
    const mapId = currentMapId(panel);
    const destination = directionsForMap(mapId)[direction];
    const destinationMap = destination.mapId
      ? knowledgeForMap(destination.mapId)
      : null;
    const destinationDefinition = destination.mapId
      ? global.BlueFox3D?.maps?.[destination.mapId]
      : null;
    const isKnown = discovered(panel, destination.mapId);
    const detail = panel.querySelector(".planet-selection-detail");
    if (!detail) return;
    detail.dataset.map = destination.mapId || `unknown-${direction}`;
    if (!destinationMap) {
      detail.innerHTML = `
        <div class="planet-selection-image unknown"></div>
        <div>
          <span>${directionNames[direction].toUpperCase()} · NON EXPLORÉ</span>
          <h3>Zone non explorée</h3>
          <p><b>Biome :</b> Données indisponibles.</p>
          <p><b>Ressources :</b> Aucune observation enregistrée.</p>
          <p><b>Point de vue de BlueFox :</b> Je peux partir dans cette direction si tu me le demandes. Le moteur générera alors une nouvelle map sans révéler son biome à l’avance.</p>
          <button type="button">Envoyer BlueFox en terre inconnue</button>
        </div>`;
      detail.querySelector("button")?.addEventListener("click", () => {
        global.dispatchEvent(new CustomEvent("bluefox:navigate", {
          detail: { direction, discoverUnknown: true }
        }));
        panel.querySelector(".drawer-close")?.click();
      });
      return;
    }
    detail.innerHTML = `
      <div class="planet-selection-image"></div>
      <div>
        <span>${directionNames[direction].toUpperCase()} · ${isKnown ? "DÉJÀ EXPLORÉ" : "NON EXPLORÉ"}</span>
        <h3>${isKnown ? destination.title : "Zone non explorée"}</h3>
        <p><b>Biome :</b> ${isKnown ? destinationDefinition?.name || destinationMap.name : "Données indisponibles."}</p>
        <p><b>Ressources :</b> ${isKnown ? destinationDefinition?.resourceHints || destinationMap.resources : "Données insuffisantes avant une première exploration active."}</p>
        <p><b>Point de vue de BlueFox :</b> ${isKnown ? destinationDefinition?.synthesis || destinationMap.synthesis : "Je ne connais pas encore ce territoire. Sa première exploration exige ta présence."}</p>
        ${isKnown ? '<button type="button">Suggérer cette direction à BlueFox</button>' : ""}
      </div>`;
    const image = detail.querySelector(".planet-selection-image");
    image.classList.toggle("unknown", !isKnown);
    if (isKnown) applySceneImage(image, destination.mapId);
    detail.querySelector("button")?.addEventListener("click", () => {
        global.dispatchEvent(new CustomEvent("bluefox:navigate", {
          detail: { ...destination, direction }
        }));
        panel.querySelector(".drawer-close")?.click();
      });
  }

  function renderCurrentZone(panel) {
    const mapId = currentMapId(panel);
    const definition = mapData[mapId];
    const mapDefinition = global.BlueFox3D?.maps?.[mapId];
    const zoneName =
      mapDefinition?.name ||
      definition?.name ||
      "Zone inconnue";
    const plateauCount = Math.max(
      1,
      mapDefinition?.plateauCount || mapDefinition?.terrainUrls?.length || 1
    );
    const cardKey =
      `${mapId}:${zoneName}:${plateauCount}:${discoveryNumber(mapId) || "?"}`;
    let card = panel.querySelector(".planet-current-zone");
    if (!card) {
      card = document.createElement("section");
      card.className = "planet-current-zone";
      panel.querySelector(".planet-layout > div:last-child")?.prepend(card);
    }
    if (!card || card.dataset.zoneKey === cardKey) return;
    card.dataset.zoneKey = cardKey;
    card.replaceChildren();

    const text = document.createElement("div");
    const eyebrow = document.createElement("span");
    eyebrow.textContent = `${discoveryLabel(mapId)} · ACTUELLE`;
    const title = document.createElement("h3");
    title.textContent = zoneName;
    const description = document.createElement("p");
    description.textContent =
      mapDefinition?.description ||
      `${zoneName} — Zone composée de ${plateauCount} plateau${plateauCount > 1 ? "x" : ""}.`;
    const viewpoint = document.createElement("p");
    const strong = document.createElement("b");
    strong.textContent = "Point de vue de BlueFox :";
    viewpoint.append(
      strong,
      ` ${mapDefinition?.synthesis || definition?.synthesis || "Je poursuis l’observation de cette Zone."}`
    );
    text.append(eyebrow, title, description, viewpoint);

    const image = document.createElement("div");
    image.className = "planet-current-image";
    applySceneImage(image, mapId);
    card.append(text, image);
    let returnButton = card.querySelector(".planet-return-base");
    if (!returnButton) {
      returnButton = document.createElement("button");
      returnButton.type = "button";
      returnButton.className = "planet-return-base";
      returnButton.textContent = "Demander le retour à la base";
      returnButton.addEventListener("click", () => {
        global.dispatchEvent(new CustomEvent("bluefox:return-base"));
        panel.querySelector(".drawer-close")?.click();
      });
      text.appendChild(returnButton);
    }
  }

  const planetDirectionOffset = Object.freeze({
    north: Object.freeze({ x: 0, y: -1 }),
    south: Object.freeze({ x: 0, y: 1 }),
    east: Object.freeze({ x: 1, y: 0 }),
    west: Object.freeze({ x: -1, y: 0 })
  });

  const biomeColor = (definition) => ({
    volcanic: "#d94b35",
    frozen: "#b8e9ff",
    forest: "#4ea86d",
    ruins: "#8b8d76",
    aquatic: "#3f9fd1",
    desert: "#d4a45d",
    crystalline: "#62cfe4",
    alien: "#9b72cf"
  })[definition?.profile] || "#6e8796";

  function discoveredMapIds(panel) {
    return Object.keys(global.BlueFox3D?.maps || {})
      .filter((mapId) => discovered(panel, mapId))
      .sort((left, right) =>
        (discoveryNumber(left) || Number.MAX_SAFE_INTEGER) -
        (discoveryNumber(right) || Number.MAX_SAFE_INTEGER)
      );
  }

  function planetZoneMetrics(mapId) {
    const definition = global.BlueFox3D?.maps?.[mapId];
    const plateauCount = Math.max(
      1,
      Math.min(6, definition?.plateauCount || definition?.terrainUrls?.length || 1)
    );
    const width = 50 + plateauCount * 12;
    return {
      plateauCount,
      width,
      height: Math.round(width * 0.78)
    };
  }

  function planetCoordinates(panel) {
    const ids = discoveredMapIds(panel);
    const known = new Set(ids);
    const coordinates = new Map();
    const start = known.has("crystal")
      ? "crystal"
      : currentMapId(panel);
    coordinates.set(start, { x: 0, y: 0 });
    const queue = [start];
    while (queue.length) {
      const mapId = queue.shift();
      const origin = coordinates.get(mapId);
      Object.entries(global.BlueFox3D?.maps?.[mapId]?.exits || {})
        .forEach(([storedDirection, exit]) => {
          const direction = directionFromExit(storedDirection, exit);
          const offset = planetDirectionOffset[direction];
          if (!offset || !known.has(exit.targetMap) || coordinates.has(exit.targetMap)) {
            return;
          }
          const currentSize = planetZoneMetrics(mapId);
          const targetSize = planetZoneMetrics(exit.targetMap);
          const distance = offset.x
            ? (currentSize.width + targetSize.width) / 2 - 3
            : (currentSize.height + targetSize.height) / 2 - 3;
          coordinates.set(exit.targetMap, {
            x: origin.x + offset.x * distance,
            y: origin.y + offset.y * distance
          });
          queue.push(exit.targetMap);
        });
    }
    ids.filter((id) => !coordinates.has(id)).forEach((id, index) => {
      coordinates.set(id, {
        x: ((index % 4) - 1.5) * 116,
        y: 220 + Math.floor(index / 4) * 104
      });
    });
    return coordinates;
  }

  function setExploredMapDetail(panel, mapId, catalogMap = null) {
    const detail = panel.querySelector(".planet-selection-detail");
    const definition = global.BlueFox3D?.maps?.[mapId];
    if (!detail || !definition || !discovered(panel, mapId)) return;
    detail.dataset.map = mapId;
    detail.replaceChildren();

    const image = document.createElement("div");
    image.className = "planet-selection-image";
    applySceneImage(image, mapId);
    const content = document.createElement("div");
    const state = document.createElement("span");
    state.textContent =
      `${discoveryLabel(mapId)} · EXPLORÉE · ${Math.max(1, definition.plateauCount || definition.terrainUrls?.length || catalogMap?.terrains?.length || 1)} PLATEAU${(definition.plateauCount || definition.terrainUrls?.length || catalogMap?.terrains?.length || 1) > 1 ? "X" : ""}`;
    const title = document.createElement("h3");
    title.textContent = definition.name;
    const paragraph = (label, value) => {
      const element = document.createElement("p");
      const strong = document.createElement("b");
      strong.textContent = `${label} :`;
      element.append(strong, ` ${value}`);
      return element;
    };
    const biome = paragraph(
      "Biome",
      definition.description || catalogMap?.name || definition.profile || "Données en cours d’analyse"
    );
    const resources = paragraph(
      "Ressources",
      definition.resourceHints || "Ressources encore non classées"
    );
    const synthesis = paragraph(
      "Point de vue de BlueFox",
      definition.synthesis || "Je connais cette Zone et peux y retourner."
    );
    const button = document.createElement("button");
    button.type = "button";
    const isCurrent = mapId === currentMapId(panel);
    button.textContent = isCurrent
      ? "BlueFox est déjà dans cette Zone"
      : "Suggérer à BlueFox de s’y rendre";
    button.disabled = isCurrent;
    button.addEventListener("click", () => {
      global.dispatchEvent(new CustomEvent("bluefox:navigate", {
        detail: { mapId }
      }));
      panel.querySelector(".drawer-close")?.click();
    });
    content.append(state, title, biome, resources, synthesis, button);

    const teleportAction = global.BlueFox3D.SpecialObjectRuntime?.teleportUiAction?.(mapId);
    if (teleportAction) {
      const teleportButton = document.createElement("button");
      teleportButton.type = "button";
      teleportButton.className = "planet-teleporter-action";
      teleportButton.disabled = teleportAction.enabled !== true;
      teleportButton.textContent = teleportAction.label;
      teleportButton.addEventListener("click", async () => {
        teleportButton.disabled = true;
        const runtime = global.BlueFox3D.SpecialObjectRuntime;
        const success = teleportAction.type === "activate"
          ? runtime?.activateTeleporter?.()
          : teleportAction.type === "calibrate"
            ? await runtime?.calibrateTeleporter?.(teleportAction.targetMapId)
            : await runtime?.teleportTo?.(teleportAction.targetMapId);
        if (success) {
          panel.querySelector(".drawer-close")?.click();
        } else {
          setExploredMapDetail(panel, mapId, catalogMap);
        }
      });
      content.appendChild(teleportButton);
    }
    detail.append(image, content);

    panel.querySelectorAll(".planet-map-zone").forEach((zone) => {
      zone.classList.toggle("selected", zone.dataset.mapId === mapId);
    });
  }

  function planetSiteMarker(mapId) {
    if (!mapId || mapId === "crystal") return null;
    const raw = global.BlueFox3D.currentEngine?.missionManager?.memory?.state
      ?.siteProgression?.[mapId] || null;
    if (!raw) return null;
    const sites = raw.sites && typeof raw.sites === "object"
      ? raw.sites
      : raw.kind
        ? { [raw.kind]: raw }
        : {};
    if (sites.base) return { kind: "base", label: "Base installée" };
    if (sites.refuge) return { kind: "refuge", label: "Refuge installé" };
    if (sites.camp) return { kind: "camp", label: "Camp installé" };
    return null;
  }

  function planetSiteSignature(mapIds) {
    return mapIds
      .map((mapId) => `${mapId}:${planetSiteMarker(mapId)?.kind || "-"}`)
      .sort()
      .join(",");
  }

  function renderPlanetMap(panel) {
    const sphere = panel.querySelector(".planet-sphere");
    if (!sphere) return;
    let viewport = sphere.querySelector(".planet-map-viewport");
    if (!viewport) {
      sphere.replaceChildren();
      viewport = document.createElement("div");
      viewport.className = "planet-map-viewport";
      const world = document.createElement("div");
      world.className = "planet-map-world";
      const glow = document.createElement("div");
      glow.className = "planet-map-glow";
      const controls = document.createElement("div");
      controls.className = "planet-map-controls";
      const centerButton = document.createElement("button");
      centerButton.type = "button";
      centerButton.textContent = "Centrer sur BlueFox";
      controls.appendChild(centerButton);
      viewport.append(world, glow);
      sphere.appendChild(viewport);
      sphere.insertAdjacentElement("afterend", controls);

      const view = {
        x: 0,
        y: 0,
        zoom: 1,
        dragging: false,
        dragged: false,
        px: 0,
        py: 0,
        startX: 0,
        startY: 0,
        pressedMapId: null
      };
      const savedView = global.BlueFox3D.PlanetMapViewState;
      if (
        savedView &&
        Number.isFinite(savedView.x) &&
        Number.isFinite(savedView.y) &&
        Number.isFinite(savedView.zoom)
      ) {
        view.x = savedView.x;
        view.y = savedView.y;
        view.zoom = Math.max(0.58, Math.min(1.65, savedView.zoom));
        view.restored = true;
      }
      viewport._bluefoxView = view;
      const sphereDepthAt = (clientX) => {
        const rect = viewport.getBoundingClientRect();
        if (!rect.width) return 1;
        const longitude = Math.max(
          -1,
          Math.min(1, (clientX - rect.left - rect.width / 2) / (rect.width / 2))
        );
        return Math.sqrt(Math.max(0, 1 - longitude * longitude));
      };
      const applySphereProjection = () => {
        const rect = viewport.getBoundingClientRect();
        if (!rect.width) return;
        const radius = rect.width / 2;
        world.querySelectorAll(".planet-map-zone").forEach((zone) => {
          const mapX = Number.parseFloat(zone.style.left) || 0;
          const screenX = mapX * view.zoom + view.x;
          const longitude = Math.max(
            -1,
            Math.min(1, (screenX - radius) / radius)
          );
          const depth = Math.sqrt(Math.max(0, 1 - longitude * longitude));
          zone.style.setProperty(
            "--sphere-scale-x",
            String(0.3 + depth * 0.7)
          );
          zone.style.setProperty(
            "--sphere-depth",
            String(0.22 + depth * 0.78)
          );
        });
      };
      const applyTransform = () => {
        world.style.transform =
          `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
        applySphereProjection();
      };
      const saveTransform = () => {
        global.BlueFox3D.PlanetMapViewState = {
          x: view.x,
          y: view.y,
          zoom: view.zoom
        };
      };
      viewport._bluefoxSaveTransform = saveTransform;
      viewport._bluefoxApplyTransform = applyTransform;
      viewport.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        view.dragging = true;
        view.dragged = false;
        view.px = event.clientX;
        view.py = event.clientY;
        view.startX = event.clientX;
        view.startY = event.clientY;
        view.pressedMapId = event.target instanceof Element
          ? event.target.closest(".planet-map-zone")?.dataset.mapId || null
          : null;
        viewport.setPointerCapture?.(event.pointerId);
        viewport.classList.add("dragging");
      });
      viewport.addEventListener("pointermove", (event) => {
        if (!view.dragging) return;
        if (Math.hypot(
          event.clientX - view.startX,
          event.clientY - view.startY
        ) > 5) {
          view.dragged = true;
        }
        const resistance = 0.32 + sphereDepthAt(event.clientX) * 0.68;
        view.x += (event.clientX - view.px) * resistance;
        view.y += (event.clientY - view.py) * resistance;
        view.px = event.clientX;
        view.py = event.clientY;
        applyTransform();
        viewport._bluefoxSaveTransform?.();
      });
      const stopDragging = (event) => {
        const selectedMapId = view.pressedMapId;
        const wasDragged = view.dragged;
        view.dragging = false;
        view.pressedMapId = null;
        viewport.releasePointerCapture?.(event.pointerId);
        viewport.classList.remove("dragging");
        if (!wasDragged && selectedMapId) {
          setExploredMapDetail(panel, selectedMapId);
        }
        global.setTimeout(() => {
          view.dragged = false;
        }, 0);
      };
      viewport.addEventListener("pointerup", stopDragging);
      viewport.addEventListener("pointercancel", stopDragging);
      viewport.addEventListener("wheel", (event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        view.zoom = Math.max(0.58, Math.min(1.65, view.zoom - event.deltaY * 0.001));
        applyTransform();
        saveTransform();
      }, { passive: false });
      centerButton.addEventListener("click", () => {
        viewport._bluefoxCenterCurrent?.();
        saveTransform();
      });
    }

    const world = viewport.querySelector(".planet-map-world");
    const coordinates = planetCoordinates(panel);
    const ids = discoveredMapIds(panel);
    const signature = `${currentMapId(panel)}|${ids.map((id) => {
      const map = global.BlueFox3D.maps[id];
      const point = coordinates.get(id);
      return `${id}:${map.name}:${map.plateauCount || map.terrainUrls?.length || 1}:${point.x},${point.y}`;
    }).join("|")}|sites:${planetSiteSignature(ids)}`;
    if (world.dataset.signature !== signature) {
      world.dataset.signature = signature;
      world.replaceChildren();
      const center = 900;
      const renderedLinks = new Set();
      ids.forEach((mapId) => {
        const from = coordinates.get(mapId);
        Object.values(global.BlueFox3D.maps[mapId]?.exits || {}).forEach((exit) => {
          if (!coordinates.has(exit.targetMap)) return;
          const key = [mapId, exit.targetMap].sort().join(":");
          if (renderedLinks.has(key)) return;
          renderedLinks.add(key);
          const to = coordinates.get(exit.targetMap);
          const x1 = center + from.x;
          const y1 = center + from.y;
          const x2 = center + to.x;
          const y2 = center + to.y;
          const length = Math.hypot(x2 - x1, y2 - y1);
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const link = document.createElement("i");
          link.className = "planet-map-link";
          link.style.left = `${x1}px`;
          link.style.top = `${y1}px`;
          link.style.width = `${length}px`;
          link.style.transform = `rotate(${angle}rad)`;
          world.appendChild(link);
        });
      });
      ids.forEach((mapId) => {
        const definition = global.BlueFox3D.maps[mapId];
        const point = coordinates.get(mapId);
        const metrics = planetZoneMetrics(mapId);
        const zone = document.createElement("button");
        zone.type = "button";
        zone.className = "planet-map-zone";
        zone.dataset.mapId = mapId;
        zone.title = `${discoveryLabel(mapId)} · ${definition.name}`;
        zone.style.left = `${center + point.x}px`;
        zone.style.top = `${center + point.y}px`;
        zone.style.width = `${metrics.width}px`;
        zone.style.height = `${metrics.height}px`;
        zone.style.setProperty("--zone-color", biomeColor(definition));
        zone.style.setProperty("--zone-turn", `${((mapId.length * 17) % 13) - 6}deg`);
        const markers = [];
        if (mapId === currentMapId(panel)) markers.push(["bluefox", "Position de BlueFox"]);
        if (mapId === "crystal") markers.push(["camp", "Camp de base"]);
        const siteMarker = planetSiteMarker(mapId);
        if (siteMarker) markers.push(["camp", siteMarker.label, "remote-site"]);
        const runtimeMarkers = global.BlueFox3D.getPlanetMapMarkers?.(mapId);
        const futureMarkers = [
          ...(Array.isArray(definition.planetMarkers) ? definition.planetMarkers : []),
          ...(Array.isArray(runtimeMarkers) ? runtimeMarkers : [])
        ];
        futureMarkers.forEach((marker) => {
          const type = typeof marker === "string" ? marker : marker?.type;
          if (type === "beacon") markers.push(["beacon", marker.label || "Balise"]);
          if (type === "teleporter") markers.push(["teleporter", marker.label || "Téléporteur"]);
          if (type === "drone") markers.push(["drone", marker.label || "Drone"]);
        });
        const markerLayer = document.createElement("span");
        markerLayer.className = "planet-map-markers";
        markers.forEach(([type, title, variant]) => {
          const marker = document.createElement("span");
          marker.className = `planet-map-marker ${type}`;
          if (variant === "remote-site") {
            marker.style.borderColor = "#ffe0bd";
            marker.style.background = "#f08b43";
            marker.style.boxShadow = "0 0 12px rgba(240, 139, 67, .86)";
          }
          marker.title = title;
          marker.setAttribute("aria-label", title);
          if (type === "teleporter") {
            marker.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50.0,4.0 58.7,32.0 86.0,21.3 69.5,45.5 94.8,60.2 65.6,62.5 70.0,91.4 50.0,70.0 30.0,91.4 34.4,62.5 5.2,60.2 30.5,45.5 14.0,21.3 41.3,32.0" fill="currentColor"/></svg>`;
            marker.style.display = "inline-grid";
            marker.style.placeItems = "center";
            marker.style.color = "#d9fbff";
            marker.style.filter = "drop-shadow(0 0 4px rgba(132,238,255,.95))";
          }
          markerLayer.appendChild(marker);
        });
        const label = document.createElement("b");
        label.textContent = `${discoveryLabel(mapId)} · ${definition.name}`;
        zone.append(markerLayer, label);
        zone.classList.toggle("current", mapId === currentMapId(panel));
        zone.addEventListener("click", (event) => {
          if (viewport._bluefoxView?.dragged) {
            event.preventDefault();
            return;
          }
          setExploredMapDetail(panel, mapId);
        });
        world.appendChild(zone);
      });
    }

    viewport._bluefoxCenterCurrent = () => {
      const currentId = currentMapId(panel);
      const currentZone = [...world.querySelectorAll(".planet-map-zone")]
        .find((zone) => zone.dataset.mapId === currentId);
      if (!currentZone) return;
      const view = viewport._bluefoxView;
      const rect = viewport.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      view.zoom = 1;
      view.x = rect.width / 2 - Number.parseFloat(currentZone.style.left);
      view.y = rect.height / 2 - Number.parseFloat(currentZone.style.top);
      viewport.dataset.centeredMap = currentId;
      viewport._bluefoxApplyTransform();
      return true;
    };
    world.querySelectorAll(".planet-map-zone").forEach((zone) => {
      zone.classList.toggle("current", zone.dataset.mapId === currentMapId(panel));
    });
    if (!viewport.dataset.initialViewApplied) {
      viewport.dataset.initialViewApplied = "true";
      let attempts = 0;
      const applyInitialView = () => {
        attempts += 1;
        // À chaque création/ouverture du menu Planète, la vue part de BlueFox.
        // Aucun événement de changement de map ne passe par ce bloc : pendant
        // que le menu reste ouvert, un déplacement de BlueFox ne recentre pas
        // la carte sans action explicite du joueur.
        if (!viewport._bluefoxCenterCurrent() && attempts < 12) {
          requestAnimationFrame(applyInitialView);
          return;
        }
        viewport._bluefoxSaveTransform?.();
      };
      requestAnimationFrame(applyInitialView);
    }
  }

  function setCatalogDetail(panel, catalogMap) {
    if (discovered(panel, catalogMap?.id)) {
      setExploredMapDetail(panel, catalogMap.id, catalogMap);
      return;
    }
    const detail = panel.querySelector(".planet-selection-detail");
    if (!detail || !catalogMap) return;
    const mapDefinition = global.BlueFox3D?.maps?.[catalogMap.id];
    const passageDefined = Boolean(
      mapDefinition &&
      Object.keys(mapDefinition.exits || {}).length
    );
    detail.dataset.map = catalogMap.id;
    detail.innerHTML = "";

    const image = document.createElement("div");
    image.className = "planet-selection-image";
    image.style.backgroundImage =
      `linear-gradient(180deg, rgba(2, 10, 22, .06), rgba(2, 10, 22, .42)), url("${catalogMap.scene.url}")`;
    const content = document.createElement("div");
    const state = document.createElement("span");
    state.textContent =
      `MAP ${catalogMap.prefix} · ${passageDefined ? "PASSAGE CONFIGURÉ" : "PASSAGE À DÉFINIR"}`;
    const title = document.createElement("h3");
    title.textContent = catalogMap.name;
    const labeledParagraph = (label, value) => {
      const paragraph = document.createElement("p");
      const strong = document.createElement("b");
      strong.textContent = `${label} :`;
      paragraph.append(strong, ` ${value}`);
      return paragraph;
    };
    const biome = labeledParagraph("Scène", catalogMap.scene.filename);
    const terrains = labeledParagraph(
      "Plateaux détectés",
      catalogMap.terrains.length || "aucun pour le moment"
    );
    const clues = labeledParagraph(
      "Indices du nom",
      mapDefinition?.traits?.length
        ? mapDefinition.traits.map((trait) => trait.label).join(", ")
        : "aucun indice spécialisé"
    );
    const resources = labeledParagraph(
      "Ressources probables",
      mapDefinition?.resourceHints || "à déterminer lors de l’exploration"
    );
    const description = labeledParagraph(
      "Synthèse du biome",
      mapDefinition?.description || "Scène cataloguée, analyse en attente."
    );
    const exploredZones = [...(global.BlueFox3D?.discoveredZones || [])]
      .filter((key) => key.startsWith(`${catalogMap.id}:`)).length;
    const exploration = labeledParagraph(
      "Exploration",
      `${exploredZones}/${Math.max(1, catalogMap.terrains.length || 1)} zone${catalogMap.terrains.length > 1 ? "s" : ""} visitée${exploredZones > 1 ? "s" : ""}`
    );
    const synthesis = labeledParagraph(
      "État",
      passageDefined
        ? "Le biome est prêt à recevoir une liaison depuis une map connue."
        : "Images cataloguées. BlueFox ne peut pas encore s’y rendre sans passage cartographié."
    );
    content.append(
      state,
      title,
      biome,
      terrains,
      clues,
      resources,
      description,
      exploration,
      synthesis
    );
    detail.append(image, content);
  }

  function renderCatalogMaps(panel) {
    const future = panel.querySelector(".planet-future-space");
    if (!future) return;
    const maps = (global.BLUEFOX_MAP_ASSETS?.catalog?.maps || [])
      .filter((map) => map.number > 1 && discovered(panel, map.id))
      .sort((left, right) =>
        (discoveryNumber(left.id) || Number.MAX_SAFE_INTEGER) -
        (discoveryNumber(right.id) || Number.MAX_SAFE_INTEGER)
      );
    const signature = maps.map((map) =>
      `${map.id}:${discoveryNumber(map.id)}:${global.BlueFox3D?.maps?.[map.id]?.name || map.name}:${map.scene.filename}:${map.terrains.length}`
    ).join("|");
    if (future.dataset.catalogSignature === signature) return;
    future.dataset.catalogSignature = signature;
    future.replaceChildren();
    future.hidden = maps.length === 0;

    const heading = document.createElement("span");
    heading.textContent = "BIOMES DÉCOUVERTS";
    future.appendChild(heading);
    if (!maps.length) {
      return;
    }

    const grid = document.createElement("div");
    grid.className = "planet-catalog-grid";
    maps.forEach((catalogMap) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "planet-catalog-card";
      const displayedName =
        global.BlueFox3D?.maps?.[catalogMap.id]?.name ||
        catalogMap.name;
      button.title = `Consulter ${displayedName}`;
      const image = document.createElement("i");
      image.style.backgroundImage = `url("${catalogMap.scene.url}")`;
      const label = document.createElement("span");
      label.textContent = discoveryLabel(catalogMap.id);
      const name = document.createElement("b");
      name.textContent = displayedName;
      const count = document.createElement("small");
      count.textContent = `${catalogMap.terrains.length} plateau${catalogMap.terrains.length > 1 ? "x" : ""}`;
      button.append(image, label, name, count);
      button.addEventListener("click", () => {
        grid.querySelectorAll("button").forEach((item) =>
          item.classList.toggle("selected", item === button)
        );
        panel.querySelectorAll(".map-grid button").forEach((item) =>
          item.classList.remove("selected")
        );
        setCatalogDetail(panel, catalogMap);
      });
      grid.appendChild(button);
    });
    future.appendChild(grid);
  }

  function enhancePlanet(panel) {
    const layout = panel.querySelector(".planet-layout");
    const mapGrid = panel.querySelector(".map-grid");
    if (!layout || !mapGrid) return;
    const current = currentMapId(panel);
    const catalogSignature = (global.BLUEFOX_MAP_ASSETS?.catalog?.maps || [])
      .map((map) => `${map.number}:${map.terrains.length}`)
      .join(",");
    const discoverySignature = discoveredMapIds(panel)
      .map((mapId) => {
        const map = global.BlueFox3D?.maps?.[mapId];
        return `${mapId}:${map?.name}:${map?.plateauCount || map?.terrainUrls?.length || 1}`;
      })
      .sort()
      .join(",");
    const discoveredIds = discoveredMapIds(panel);
    const signature = [
      current,
      discoveredIds.length,
      mapGrid.querySelectorAll("button").length,
      catalogSignature,
      discoverySignature,
      planetSiteSignature(discoveredIds)
    ].join(":");
    const alreadyComplete =
      panel.dataset.bluefoxPlanetSignature === signature &&
      Boolean(panel.querySelector(".planet-selection-detail")) &&
      mapGrid.querySelectorAll(".direction-card-content").length === 4;
    if (alreadyComplete) return;

    const firstEnhancement = !panel.dataset.bluefoxPlanetEnhanced;
    panel.dataset.bluefoxPlanetEnhanced = "true";
    panel.dataset.bluefoxPlanetSignature = signature;
    panel.classList.add("planet-panel-enhanced");
    /*
     * La sphère était auparavant le premier enfant direct de la grille et les
     * contrôles devenaient un troisième enfant. Un vrai volet gauche garantit
     * que la grille principale conserve exactement deux colonnes.
     */
    let mapPane = layout.querySelector(":scope > .planet-map-pane");
    const sphere = layout.querySelector(":scope > .planet-sphere");
    if (!mapPane && sphere) {
      mapPane = document.createElement("div");
      mapPane.className = "planet-map-pane";
      sphere.replaceWith(mapPane);
      mapPane.appendChild(sphere);
    }
    const rightColumn = [...layout.children]
      .find((element) => element !== mapPane) || layout.lastElementChild;
    rightColumn?.classList.add("planet-info-pane");
    ensureUniqueDiscoveredMapNames(panel);
    const intro = rightColumn?.querySelector(":scope > p");
    if (intro) {
      intro.classList.add("planet-intro");
    }

    let detail = panel.querySelector(".planet-selection-detail");
    if (!detail) {
      detail = document.createElement("section");
      detail.className = "planet-selection-detail";
      mapGrid.insertAdjacentElement("afterend", detail);
    }
    renderCurrentZone(panel);
    renderPlanetMap(panel);

    mapGrid.querySelectorAll("button").forEach((button) => {
      const direction = Object.keys(directionNames).find((name) =>
        button.classList.contains(name)
      );
      if (!direction) return;
      button.dataset.direction = direction;
      const target = directionsForMap(current)[direction].mapId;
      button.classList.remove("biome-crystal", "biome-jungle", "unknown");
      if (target) button.classList.add(`biome-${target}`);
      const known = discovered(panel, target);
      let content = button.querySelector(".direction-card-content");
      if (!content) {
        content = document.createElement("span");
        content.className = "direction-card-content";
        content.innerHTML = `
          <strong></strong>
          <span class="direction-scene"></span>
          <small><span></span><b></b></small>`;
        button.appendChild(content);
      }
      content.querySelector("strong").textContent = directionNames[direction];
      content.querySelector("small span").textContent =
        known ? discoveryLabel(target) : "ZONE NON EXPLORÉE";
      content.querySelector("small b").textContent =
        known ? knowledgeForMap(target).name : "Non explorée";
      const directionScene = content.querySelector(".direction-scene");
      directionScene.classList.toggle("unknown", !known);
      if (known) {
        applySceneImage(directionScene, target);
      } else {
        directionScene.style.backgroundImage = "";
        delete directionScene.dataset.sceneMap;
      }
      if (!button.dataset.bluefoxDirectionBound) {
        button.dataset.bluefoxDirectionBound = "true";
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          mapGrid.querySelectorAll("button").forEach((item) =>
            item.classList.toggle("selected", item === button)
          );
          setPlanetDetail(panel, direction);
        }, true);
      }
    });
    if (!panel.querySelector(".planet-future-space")) {
      const future = document.createElement("section");
      future.className = "planet-future-space";
      future.innerHTML = "<span>BIOMES DÉCOUVERTS</span>";
      detail.insertAdjacentElement("afterend", future);
    }
    renderCatalogMaps(panel);
    if (firstEnhancement || !detail.dataset.map) {
      const firstDirection =
        Object.keys(directionNames).find(
          (direction) => directionsForMap(current)[direction].mapId
        ) || "north";
      setPlanetDetail(panel, firstDirection);
    }
  }

  const researchResourceLabel = (inventoryKey) => {
    const key = String(inventoryKey || "").trim();
    if (!key) return "ressource";
    const definition = global.BlueFox3D?.ObjectLibrary?.list?.().find(
      (item) => item.resource?.inventoryKey === key
    );
    const human = definition?.label || definition?.name || definition?.title;
    if (human) return String(human);
    return key
      .replace(/[_-]+/g, " ")
      .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));
  };

  const researchRequirementLabel = (requirement = {}) => {
    const keys = Array.isArray(requirement.inventoryKeys)
      ? requirement.inventoryKeys.filter(Boolean)
      : [requirement.inventoryKey || requirement.resource].filter(Boolean);
    return keys.length
      ? keys.map(researchResourceLabel).join(" / ")
      : "ressource";
  };

  function ensureResearchEnhancementStyles() {
    if (document.getElementById("bluefox-research-enhancement-styles")) return;
    const style = document.createElement("style");
    style.id = "bluefox-research-enhancement-styles";
    style.textContent = `
      .bluefox-research-runtime { margin:12px 0; padding:10px; border:1px solid rgba(92,220,255,.28); border-radius:12px; background:rgba(4,22,38,.76); }
      .bluefox-research-runtime > span { display:block; margin-bottom:8px; color:#77dff7; font-size:9px; font-weight:800; letter-spacing:.1em; }
      .bluefox-research-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; }
      .bluefox-experiment-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .bluefox-research-card { grid-column:span 2; display:flex; min-width:0; min-height:108px; flex-direction:column; gap:5px; padding:9px; border:1px solid rgba(124,226,255,.2); border-radius:10px; background:rgba(4,18,32,.72); }
      .bluefox-experiment-card { grid-column:span 1; min-height:124px; padding:12px; gap:7px; }
      .bluefox-research-card h3 { margin:0; overflow-wrap:anywhere; font-size:12px; line-height:1.2; }
      .bluefox-research-card p { margin:0; overflow-wrap:anywhere; color:rgba(225,242,246,.78); font-size:10px; line-height:1.25; }
      .bluefox-research-card small { overflow-wrap:anywhere; color:rgba(180,220,228,.7); font-size:9px; line-height:1.2; }
      .bluefox-experiment-card h3 { font-size:14px; line-height:1.25; }
      .bluefox-experiment-card p { font-size:11.5px; line-height:1.35; }
      .bluefox-experiment-card small { font-size:10px; line-height:1.3; }
      .bluefox-research-card button { margin-top:auto; padding:6px 8px; border:1px solid rgba(96,224,255,.45); border-radius:999px; color:#eafcff; background:rgba(12,64,82,.82); font-size:10px; cursor:pointer; }
      .bluefox-research-card button:disabled { opacity:.42; cursor:not-allowed; filter:grayscale(.4); }
      .bluefox-drone-console { grid-column:1/-1; margin-top:10px; padding:10px; border:1px solid rgba(171,110,255,.3); border-radius:12px; background:rgba(20,10,38,.62); }
      .bluefox-drone-console h3 { margin:0 0 8px; font-size:12px; }
      .bluefox-drone-slots { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
      .bluefox-drone-slot { padding:8px; border:1px solid rgba(180,150,255,.22); border-radius:9px; font-size:10px; }
      .bluefox-drone-slot select,.bluefox-drone-slot button { width:100%; margin-top:6px; }
      @media (max-width:650px) {
        .bluefox-research-grid { gap:5px; }
        .bluefox-experiment-grid { grid-template-columns:minmax(0,1fr); }
        .bluefox-research-card { min-height:100px; padding:7px 6px; }
        .bluefox-experiment-card { grid-column:span 1; padding:10px 8px; }
      }
    `;
    document.head.appendChild(style);
  }

  const menuPanelIdentity = (panel) => String(
    panel?.getAttribute?.("aria-label") ||
    panel?.querySelector?.("h2")?.textContent ||
    ""
  ).trim().toLocaleLowerCase("fr");

  const isResearchPanel = (panel) => {
    const identity = menuPanelIdentity(panel);
    return (
      identity.includes("recherche") ||
      identity.includes("laboratoire") ||
      Boolean(panel?.querySelector?.(".research-layout"))
    );
  };

  const isInventoryPanel = (panel) => {
    const identity = menuPanelIdentity(panel);
    return identity.includes("inventaire");
  };

  const closeOwnedMenuPanel = (panel) => {
    if (!panel?.isConnected) return false;
    const close = panel.querySelector?.(".drawer-close");
    if (!close) return false;
    close.click();
    return true;
  };

  const closeCompetingInventoryResearchPanel = (target) => {
    const mode = String(target || "").trim().toLocaleLowerCase("fr");
    if (!["inventaire", "recherche", "laboratoire"].includes(mode)) return false;
    let changed = false;
    document.querySelectorAll(".drawer, .full-screen-panel").forEach((panel) => {
      const competing = mode === "inventaire"
        ? isResearchPanel(panel)
        : isInventoryPanel(panel);
      if (competing) changed = closeOwnedMenuPanel(panel) || changed;
    });
    return changed;
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.(".tool-rail button");
    if (!button) return;
    const target = (
      button.querySelector("small")?.textContent ||
      button.getAttribute("aria-label") ||
      ""
    ).trim().toLocaleLowerCase("fr");
    closeCompetingInventoryResearchPanel(target);
    if (target.includes("journal")) requestJournalConsolidation();
  }, true);

  function normalizeResearchPanelWindow(panel) {
    if (!isResearchPanel(panel)) return false;
    if (panel.classList.contains("full-screen-panel")) {
      panel.classList.remove("full-screen-panel");
    }
    if (!panel.classList.contains("drawer")) {
      panel.classList.add("drawer");
    }
    return true;
  }

  let researchRefreshPending = true;

  function requestResearchRefresh() {
    researchRefreshPending = true;
    scheduleScan();
  }

  function cleanupResearchPanelArtifacts() {
    document.querySelectorAll(".drawer, .full-screen-panel").forEach((panel) => {
      const researchPanel = isResearchPanel(panel);
      panel.querySelectorAll(".bluefox-research-runtime").forEach((section) => {
        // Le panneau principal appartient à React. Ne jamais retirer ici un nœud
        // pendant son cycle de reconciliation : on masque seulement l'injection
        // runtime lorsque le même conteneur est reutilise pour un autre menu.
        section.hidden = !researchPanel;
      });
    });
  }

  function refreshResearchPanels(force = false) {
    cleanupResearchPanelArtifacts();
    const panels = [...document.querySelectorAll(".drawer, .full-screen-panel")]
      .filter(isResearchPanel);
    if (!panels.length) return;
    panels.forEach(normalizeResearchPanelWindow);
    const needsInitialRender = panels.some((panel) =>
      !panel.querySelector(".bluefox-research-runtime")
    );
    if (!force && !researchRefreshPending && !needsInitialRender) return;
    researchRefreshPending = false;
    panels.forEach(enhanceResearch);
  }

  function renderDroneConsole(section) {
    const runtime = global.BlueFox3D?.SpecialObjectRuntime;
    const research = global.BlueFox3D?.Research;
    let host = section.querySelector(".bluefox-drone-console");
    if (research?.isUnlocked?.("harvest-drone-blueprint-v1") !== true) {
      host?.remove();
      return;
    }
    if (!runtime?.consoleState) return;
    const state = runtime.consoleState();
    if (!host) {
      host = document.createElement("section");
      host.className = "bluefox-drone-console";
      section.appendChild(host);
    }
    host.replaceChildren();
    const title = document.createElement("h3");
    title.textContent = "RÉSEAU HARVEST · 4 EMPLACEMENTS MAX";
    host.append(title);
    const failures = Array.isArray(state.failures) ? state.failures : [];
    if (failures.length) {
      const alert = document.createElement("div");
      alert.className = "bluefox-drone-failures";
      failures.forEach((failure) => {
        const line = document.createElement("p");
        const needs = Object.entries(failure.requirements || {})
          .map(([key, amount]) => `${amount} ${researchResourceLabel(key)}`)
          .join(" · ");
        line.textContent = `PANNE · ${failure.droneType === "scout_drone" ? "Scout" : failure.droneId} · ${failure.mapId}${needs ? ` · Réparation : ${needs}` : ""}`;
        alert.append(line);
      });
      host.append(alert);
    }
    const slots = document.createElement("div");
    slots.className = "bluefox-drone-slots";
    host.append(slots);

    for (let index = 0; index < state.maxSlots; index += 1) {
      const drone = state.harvestFleet[index] || null;
      const card = document.createElement("article");
      card.className = "bluefox-drone-slot";
      const label = document.createElement("strong");
      label.textContent = drone ? `Harvest ${index + 1}` : `Emplacement ${index + 1}`;
      card.append(label);

      if (!drone) {
        const info = document.createElement("div");
        info.textContent = "Libre";
        card.append(info);
        const craft = document.createElement("button");
        craft.type = "button";
        craft.textContent = "Assembler un Harvest";
        craft.disabled = state.canCraftHarvest !== true;
        craft.onclick = () => {
          runtime.craftDrone?.("harvest_drone");
          requestResearchRefresh();
        };
        card.append(craft);
        slots.append(card);
        continue;
      }

      const status = document.createElement("div");
      status.textContent = drone.failure
        ? `PANNE · Map : ${drone.failure.mapId || drone.deployedMapId} · Zone : ${drone.failure.zoneLabel || drone.deployedZoneLabel || "inconnue"} · Cargo ${drone.cargoTotal || 0}/${state.cargoCapacity}`
        : drone.deployedMapId
        ? `Map : ${drone.deployedMapId} · Zone : ${
            drone.deployedZoneLabel ||
            `Plateau ${(Number(drone.deployedZoneId) || 0) + 1}`
          } · Cargo ${drone.cargoTotal || 0}/${state.cargoCapacity}`
        : `Dans le réseau · Cargo ${drone.cargoTotal || 0}/${state.cargoCapacity}`;
      card.append(status);

      const select = document.createElement("select");
      (drone.priorities || ["collect_all"]).forEach((key) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = key === "collect_all" ? "Collecter tout" : researchResourceLabel(key);
        option.selected = String(drone.priority || "collect_all") === key;
        select.append(option);
      });
      select.disabled = !drone.deployedMapId || Boolean(drone.failure);
      select.onchange = () => {
        runtime.setHarvestPriority?.(drone.id, select.value);
        requestResearchRefresh();
      };
      card.append(select);

      const confirmPriority = document.createElement("button");
      confirmPriority.type = "button";
      confirmPriority.textContent = "Confirmer la priorité";
      confirmPriority.disabled = !drone.deployedMapId || Boolean(drone.failure);
      confirmPriority.onclick = () => {
        runtime.setHarvestPriority?.(drone.id, select.value);
        requestResearchRefresh();
      };
      card.append(confirmPriority);

      const action = document.createElement("button");
      action.type = "button";
      if (drone.failure) {
        action.textContent = "Dépannage requis sur place";
        action.disabled = true;
      } else if (drone.deployedMapId) {
        action.textContent = "Rappeler";
        action.onclick = () => {
          runtime.recallDrone?.("harvest_drone", "research-console", drone.id);
          requestResearchRefresh();
        };
      } else {
        action.textContent = "Déployer sur cette map balisée";
        action.onclick = () => {
          runtime.deployDrone?.("harvest_drone", drone.id);
          requestResearchRefresh();
        };
      }
      card.append(action);
      slots.append(card);
    }
    const drn04Active = (global.BlueFox3D?.getMissionState?.()?.missions || [])
      .some((mission) =>
        String(mission?.missionId || mission?.id || "") === "DRN-04" &&
        String(mission?.lifecycleStatus || "") === "active"
      );
    if (drn04Active && host.dataset.drn04ViewNoted !== "true") {
      host.dataset.drn04ViewNoted = "true";
      runtime.noteConsoleViewed?.();
    }
  }

  function enhanceResearch(panel) {
    if (!isResearchPanel(panel)) return;
    const research = global.BlueFox3D?.Research;
    if (!research?.list) return;
    const mapId = currentMapId(panel);
    const entries = research.list({ unlockedOnly: true });
    const experimentStates = research.experimentationList?.() || [];
    const constructionEntries = entries.filter((entry) => entry.type === "research.blueprint");
    const states = constructionEntries.map((entry) => [
      entry.id,
      research.constructionState?.(entry.constructionKind, mapId) || null
    ]);
    const craftStates = entries
      .filter((entry) => entry.type !== "research.blueprint")
      .map((entry) => [
        entry.id,
        research.canCraft?.(entry.id, 1) === true
      ]);
    const signature = JSON.stringify({
      mapId,
      entries: entries.map((entry) => entry.id),
      states: states.map(([id, state]) => [id, state?.allowed, state?.active, state?.completed, state?.reason]),
      craftStates,
      experiments: experimentStates.map((entry) => [
        entry.id, entry.count, entry.canRun, entry.locationReady, entry.resourcesReady,
        entry.nextStage?.stage || 0, entry.reason
      ])
    });
    let section = panel.querySelector(".bluefox-research-runtime");
    if (!entries.length && !experimentStates.length) {
      if (section) section.hidden = true;
      return;
    }
    if (!section) {
      section = document.createElement("section");
      section.className = "bluefox-research-runtime";
      const host = panel.querySelector(".research-layout") || panel.querySelector(".panel-content") || panel;
      host.appendChild(section);
    }
    section.hidden = false;
    if (section.dataset.signature === signature) return;
    section.dataset.signature = signature;
    section.replaceChildren();
    ensureResearchEnhancementStyles();

    if (experimentStates.length) {
      const experimentHeading = document.createElement("span");
      experimentHeading.textContent = "EXPÉRIMENTATIONS SCIENTIFIQUES";
      const experimentGrid = document.createElement("div");
      experimentGrid.className = "bluefox-research-grid bluefox-experiment-grid";
      section.append(experimentHeading, experimentGrid);

      experimentStates.forEach((state) => {
        const card = document.createElement("article");
        card.className = "bluefox-research-card bluefox-experiment-card";
        const title = document.createElement("h3");
        title.textContent = `${state.label} · ${state.count}/5`;
        const description = document.createElement("p");
        description.textContent = state.completed
          ? "Axe expérimental maîtrisé."
          : state.nextStage?.title || "Expérimentation terminée.";
        const requirements = document.createElement("small");
        requirements.textContent = (state.nextStage?.requirements || [])
          .map((item) => `${item.quantity || 0} ${researchRequirementLabel(item)}`)
          .join(" · ");
        requirements.hidden = !requirements.textContent;
        const status = document.createElement("small");
        status.textContent = state.reason || "";
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = state.completed
          ? "Maîtrisé"
          : "Lancer une expérimentation";
        button.disabled = state.canRun !== true;
        button.addEventListener("click", () => {
          if (research.runExperiment?.(state.id, { source: "research-menu" }) !== true) return;
          requestResearchRefresh();
        });
        card.append(title, description, requirements, status, button);
        experimentGrid.appendChild(card);
      });
    }

    if (entries.length) {
      const heading = document.createElement("span");
      heading.textContent = "PLANS ET RECETTES DÉBLOQUÉS";
      const grid = document.createElement("div");
      grid.className = "bluefox-research-grid";
      section.append(heading, grid);

      entries.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "bluefox-research-card";
      const title = document.createElement("h3");
      title.textContent = entry.label || entry.id;
      const description = document.createElement("p");
      description.textContent = entry.description || "";
      const status = document.createElement("small");
      const button = document.createElement("button");
      button.type = "button";

      if (entry.type === "research.drone-blueprint") {
        status.textContent = "Blueprint débloqué";
        status.hidden = false;
        button.textContent = "Débloqué";
        button.disabled = true;
      } else if (entry.type === "research.blueprint") {
        const state = research.constructionState?.(entry.constructionKind, mapId);
        status.hidden = true;
        button.textContent = entry.label || "Lancer le projet";
        button.disabled = state?.allowed !== true;
        button.addEventListener("click", () => {
          const missionId = research.startConstruction?.(
            entry.constructionKind,
            { mapId, source: "player" }
          );
          if (!missionId) return;
          panel.querySelector(".drawer-close")?.click();
          requestResearchRefresh();
        });
      } else {
        const requirements = (entry.requirements || [])
          .map((item) => `${item.quantity || 0} ${researchRequirementLabel(item)}`)
          .join(" · ");
        status.textContent = requirements;
        status.hidden = !requirements;
        button.textContent = "Fabriquer";
        button.disabled = research.canCraft?.(entry.id, 1) !== true;
        button.addEventListener("click", () => {
          research.craft?.(entry.id, 1, { source: "research-menu" });
          requestResearchRefresh();
        });
      }
        card.append(title, description, status, button);
        grid.appendChild(card);
      });
    }
    renderDroneConsole(section);

  }

  const speechBubbleTimers = new WeakMap();

  function speechBubbleDuration(text) {
    const length = String(text || "").trim().length;
    const durationMs = length <= 45
      ? 6500
      : length <= 100
        ? 6500 + ((length - 45) / 55) * 2500
        : length <= 190
          ? 9000 + ((length - 100) / 90) * 3000
          : Math.min(14000, 12000 + ((length - 190) * 20));
    return Math.round(durationMs);
  }

  function regulateSpeechBubbles() {
    document.querySelectorAll(".speech-bubble").forEach((bubble) => {
      const text = bubble.textContent?.trim() || "";
      if (!text) return;
      const signature = `${text.length}:${text}`;
      if (bubble.dataset.bluefoxSpeechTiming === signature) return;

      const previousTimer = speechBubbleTimers.get(bubble);
      if (previousTimer) window.clearTimeout(previousTimer);

      bubble.dataset.bluefoxSpeechTiming = signature;
      bubble.hidden = false;
      const timer = window.setTimeout(() => {
        if (!bubble.isConnected) return;
        if (bubble.dataset.bluefoxSpeechTiming !== signature) return;
        bubble.hidden = true;
        speechBubbleTimers.delete(bubble);
      }, speechBubbleDuration(text));
      speechBubbleTimers.set(bubble, timer);
    });
  }

  function enhanceConstructionMissionAction(card) {
    const BF = global.BlueFox3D;
    const engine = BF?.currentEngine;
    const manager = engine?.missionManager;
    if (!manager || !card) return;

    const titleText = card.querySelector("h3, h2, strong")?.textContent?.trim() || "";
    const activeMissions = BF?.getMissionState?.()?.missions || [];
    const mission = activeMissions.find((entry) => {
      const id = entry.missionId || entry.id || "";
      if (!/^(CAMP|REFUGE|WORKBENCH)@/.test(id)) return false;
      return entry.title === titleText || card.textContent?.includes(entry.title || "");
    });

    let button = card.querySelector(".construction-placement-action");
    if (!mission) {
      button?.remove();
      return;
    }

    const missionId = mission.missionId || mission.id;
    const tree = manager.trees?.get?.(missionId);
    const lifecycle = manager.memory?.state?.missionLifecycle?.[missionId];
    const targetMapId = String(
      tree?.targetMapId ||
      BF?.bibleRuntime?.byId?.get?.(missionId)?.targetMapId ||
      missionId.split("@")[1] ||
      ""
    );
    const ready =
      lifecycle?.status === "active" &&
      tree?.root?.isComplete === true &&
      targetMapId &&
      String(engine.currentMapId || "") === targetMapId &&
      !BF?.bibleRuntime?.gateSatisfied?.(
        BF?.bibleRuntime?.byId?.get?.(missionId)
      );

    if (!ready) {
      button?.remove();
      return;
    }

    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "construction-placement-action";
      button.style.cssText =
        "margin-top:8px;padding:8px 12px;border-radius:999px;border:1px solid rgba(96,224,255,.5);background:rgba(12,72,92,.92);color:#fff;cursor:pointer";
      card.appendChild(button);
    }

    const kind = missionId.startsWith("REFUGE@")
      ? "refuge"
      : missionId.startsWith("WORKBENCH@")
        ? "workbench"
        : "camp";
    button.textContent = kind === "refuge"
      ? "Positionner le refuge"
      : kind === "workbench"
        ? "Positionner l’établi"
        : "Positionner le camp";
    button.onclick = () => {
      const ok = BF?.Research?.resumePlacement?.(missionId);
      if (!ok) {
        engine.callbacks?.onStatus?.(
          "Le placement ne peut pas être ouvert pour le moment."
        );
      }
    };
  }

  function scan() {
    regulateSpeechBubbles();
    const activeMap = global.BlueFox3D?.currentEngine?.currentMapId;
    const activeDefinition = global.BlueFox3D?.maps?.[activeMap];
    const location = document.querySelector(".brand-block strong");
    if (location && activeDefinition) {
      const expectedLocation =
        `${activeDefinition.name} · ${discoveryLabel(activeMap)}`;
      if (location.textContent !== expectedLocation) {
        location.textContent = expectedLocation;
      }
    }
    document.querySelectorAll(".intent-bar button").forEach((button) => {
      if (button.dataset.bluefoxReturnBound) return;
      button.dataset.bluefoxReturnBound = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        global.dispatchEvent(new CustomEvent("bluefox:return-base"));
      }, true);
    });
    document.querySelectorAll(".mission-card").forEach((card) => {
      enhanceMission(card);
      enhanceConstructionMissionAction(card);
    });
    document.querySelectorAll(".full-screen-panel").forEach((panel) => {
      if (panel.querySelector(".planet-layout")) enhancePlanet(panel);
      if (panel.querySelector(".journal-layout")) enhanceJournal(panel);
    });
    refreshResearchPanels();
  }

  let scanFrame = 0;
  function scheduleScan() {
    if (scanFrame) return;
    scanFrame = requestAnimationFrame(() => {
      scanFrame = 0;
      scan();
    });
  }

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, {
    childList: true,
    characterData: true,
    subtree: true
  });
  global.addEventListener("bluefox:map-state", () => {
    researchRefreshPending = true;
    scheduleScan();
  });
  global.addEventListener("bluefox:scene-images", refreshSceneImages);
  global.addEventListener("bluefox:image-catalog", scheduleScan);
  global.addEventListener("bluefox:discovery-changed", scheduleScan);
  global.addEventListener("bluefox:zone-discovery-changed", scheduleScan);
  global.addEventListener("bluefox:research-unlocked", requestResearchRefresh);
  global.addEventListener("bluefox:progression-changed", requestResearchRefresh);
  global.addEventListener("bluefox:construction-mission-started", () => {
    researchRefreshPending = true;
    scheduleScan();
  });
  global.addEventListener("bluefox:site-established", () => {
    researchRefreshPending = true;
    scheduleScan();
  });
  global.addEventListener("bluefox:special-objects-changed", scheduleScan);
  global.addEventListener("bluefox:mission-state", () => {
    researchRefreshPending = true;
    scheduleScan();
  });
  scan();

  function closeSitePlacementFinalize(missionId = null, notifyCancel = false) {
    const overlay = document.getElementById("bluefox-site-placement-finalize");
    if (!overlay) return false;
    if (missionId && overlay.dataset.missionId !== String(missionId)) return false;
    const cancel = overlay.__bluefoxCancel;
    overlay.remove();
    if (notifyCancel) cancel?.();
    return true;
  }

  function openSitePlacementFinalize(detail = {}) {
    closeSitePlacementFinalize(null, true);
    const missionId = String(detail.missionId || "");
    if (!missionId || typeof detail.onInstall !== "function") return false;

    const overlay = document.createElement("div");
    overlay.id = "bluefox-site-placement-finalize";
    overlay.dataset.missionId = missionId;
    overlay.style.cssText = [
      "position:fixed","inset:0","z-index:100000",
      "display:flex","align-items:flex-start","justify-content:center",
      "padding-top:18px","box-sizing:border-box",
      "background:transparent","pointer-events:none"
    ].join(";");

    const panel = document.createElement("div");
    panel.style.cssText = [
      "width:min(360px,calc(100vw - 32px))","padding:16px",
      "border:1px solid rgba(100,225,255,.48)","border-radius:14px",
      "background:rgba(4,22,38,.96)","box-shadow:0 18px 55px rgba(0,0,0,.48)",
      "color:#eafcff","font:12px/1.4 system-ui,sans-serif","pointer-events:auto"
    ].join(";");

    const title = document.createElement("strong");
    title.textContent = detail.kind === "refuge"
      ? "Positionnement du refuge"
      : detail.kind === "workbench"
        ? "Positionnement de l’établi"
        : detail.kind === "deployed_beacon"
          ? "Positionnement de la balise"
          : "Positionnement du camp";
    title.style.cssText = "display:block;font-size:15px;margin-bottom:10px";

    const text = document.createElement("div");
    text.textContent =
      "Réglez la rotation. La structure et les ressources ne seront verrouillées qu'après validation.";
    text.style.cssText = "opacity:.82;margin-bottom:12px";

    const value = document.createElement("div");
    value.style.cssText = "text-align:center;margin:4px 0 8px;font-weight:700";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "-180";
    slider.max = "180";
    slider.step = "5";
    const initialDegrees = Math.round((Number(detail.yaw) || 0) * 180 / Math.PI);
    slider.value = String(Math.max(-180, Math.min(180, initialDegrees)));
    slider.style.cssText = "width:100%;margin:0 0 14px";

    const updateRotation = () => {
      const degrees = Number(slider.value) || 0;
      value.textContent = `Rotation : ${degrees}°`;
      detail.onRotate?.(degrees * Math.PI / 180);
    };
    slider.addEventListener("input", updateRotation);
    updateRotation();

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:10px;justify-content:flex-end";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Annuler";
    cancel.style.cssText =
      "padding:8px 13px;border-radius:999px;border:1px solid rgba(220,235,240,.35);background:rgba(20,38,48,.9);color:#eafcff;cursor:pointer";

    const install = document.createElement("button");
    install.type = "button";
    install.textContent = detail.kind === "refuge"
      ? "Installer le refuge"
      : detail.kind === "workbench"
        ? "Installer l’établi"
        : detail.kind === "deployed_beacon"
          ? "Installer la balise"
          : "Installer le camp";
    install.style.cssText =
      "padding:8px 13px;border-radius:999px;border:1px solid rgba(96,224,255,.55);background:rgba(12,82,104,.95);color:#fff;cursor:pointer";

    overlay.__bluefoxCancel = detail.onCancel;
    cancel.addEventListener("click", () => {
      closeSitePlacementFinalize(missionId, true);
    });
    install.addEventListener("click", () => {
      install.disabled = true;
      const ok = detail.onInstall();
      if (ok === true) closeSitePlacementFinalize(missionId, false);
      else install.disabled = false;
    });

    actions.append(cancel, install);
    panel.append(title, text, value, slider, actions);
    overlay.append(panel);
    document.body.append(overlay);
    return true;
  }

  global.addEventListener("bluefox:site-placement-finalize-request", (event) => {
    openSitePlacementFinalize(event.detail || {});
  });
  global.addEventListener("bluefox:site-placement-finalize-close", (event) => {
    closeSitePlacementFinalize(event.detail?.missionId || null, false);
  });
  global.addEventListener("bluefox:site-placement-ended", () => {
    closeSitePlacementFinalize(null, false);
  });

})(window);
