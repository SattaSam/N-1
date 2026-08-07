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
    const memories = discoveryMemories();
    const chronologicalMemories = memories
      .filter((item) => item?.id)
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
    const engineMemory = global.BlueFox3D?.discoveredMaps;
    if (engineMemory instanceof Set) {
      const index = [...engineMemory].indexOf(mapId);
      if (index >= 0) return index + 1;
    }
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
      sceneImage(mapId) ||
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

  const sceneImage = (mapId) => global.BlueFox3D?.sceneImages?.[mapId] || "";

  function applySceneImage(element, mapId) {
    if (!element) return;
    element.dataset.sceneMap = mapId;
    const asset = sceneImage(mapId);
    element.style.backgroundImage = asset
      ? `linear-gradient(180deg, rgba(2, 10, 22, .08), rgba(2, 10, 22, .48)), url("${asset}")`
      : "linear-gradient(145deg, #123d5e, #071729)";
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
    if (!key) return { label: "indisponible", badge: "ÉMOTION · INDISPONIBLE" };
    const rawValue = Number(bac?.relation?.emotions?.[key]);
    const value = Number.isFinite(rawValue) ? Math.round(rawValue) : null;
    const label = labels[key] || String(key);
    return {
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
      needleAngle: -90 + ((trust + 100) / 200) * 180
    };
  }

  function ensureTrustIndicatorStyles() {
    if (document.getElementById("bluefox-journal-trust-styles")) return;
    const style = document.createElement("style");
    style.id = "bluefox-journal-trust-styles";
    style.textContent = `
      .journal-temporal-meta .journal-feeling-block {
        grid-column: 1 / -1;
        width: 100%;
        box-sizing: border-box;
      }
      .journal-temporal-meta .journal-feeling-block > b {
        display: block;
      }
      .journal-temporal-meta .journal-trust-row {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 8px;
        min-width: 0;
        margin-top: 5px;
      }
      .journal-trust-gauge {
        position: relative;
        flex: 0 0 28px;
        width: 28px;
        height: 16px;
      }
      .journal-trust-gauge__arc {
        position: absolute;
        left: 2px;
        top: 1px;
        width: 24px;
        height: 12px;
        overflow: hidden;
        border-radius: 24px 24px 0 0;
        background: conic-gradient(from 270deg at 50% 100%,
          #bd3845 0deg 72deg,
          #8b6268 72deg 88deg,
          #68716e 88deg 92deg,
          #66866c 92deg 108deg,
          #42a568 108deg 180deg,
          transparent 180deg 360deg);
        box-shadow: inset 0 0 0 1px rgba(225,240,242,.18);
      }
      .journal-trust-gauge__arc::after {
        content: "";
        position: absolute;
        left: 4px;
        top: 4px;
        width: 16px;
        height: 8px;
        border-radius: 16px 16px 0 0;
        background: rgba(10,28,34,.94);
      }
      .journal-trust-gauge__needle {
        position: absolute;
        left: 14px;
        top: 11px;
        width: 10px;
        height: 1px;
        border-radius: 1px;
        background: #e8f3f2;
        box-shadow: 0 0 2px rgba(232,243,242,.75);
        transform-origin: 0 50%;
        transform: rotate(var(--trust-angle));
        transition: transform .35s ease;
        z-index: 2;
      }
      .journal-trust-gauge__hub {
        position: absolute;
        left: 12px;
        top: 9px;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #d7e7e5;
        border: 1px solid rgba(7,20,24,.9);
        z-index: 3;
      }
      .journal-trust-gauge__minus,
      .journal-trust-gauge__plus {
        position: absolute;
        bottom: 0;
        font-size: 7px;
        line-height: 1;
        font-weight: 800;
      }
      .journal-trust-gauge__minus { left: 0; color: #e45d67; }
      .journal-trust-gauge__plus { right: 0; color: #61c982; }
      .journal-trust-copy {
        min-width: 0;
        flex: 1 1 auto;
        overflow: visible;
      }
      .journal-trust-copy em {
        display: block;
        color: rgba(220,235,234,.78);
        font-size: 10px;
        line-height: 1;
        font-style: italic;
        white-space: nowrap;
        overflow: visible;
        text-overflow: clip;
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceJournal(panel) {
    const report = panel.querySelector(".journal-report");
    const heading = report?.querySelector(".journal-heading");
    if (!report || !heading) return;
    const mapId = currentMapId(panel);
    const windowBiome = panel.querySelector(".journal-window-biome");
    if (windowBiome) {
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
    if (meta.dataset.signature === signature) return;
    meta.dataset.signature = signature;
    meta.innerHTML = `
      <div><span>ZONE ACTUELLE</span><b>${mapName}</b></div>
      <div><span>DATE PLANÉTAIRE</span><b>${fictionalDate(totalMinutes)}</b></div>
      <div><span>DEPUIS L’ARRIVÉE</span><b>${elapsedPlanetTime(totalMinutes)}</b></div>
      <div class="journal-feeling-block">
        <span>RESSENTI DE BLUEFOX</span><b>${emotion.label}</b>
        <div class="journal-trust-row">
          <div class="journal-trust-gauge" role="img" aria-label="Influence perçue : ${trust.title}">
            <span class="journal-trust-gauge__arc"></span>
            <span class="journal-trust-gauge__needle" style="--trust-angle:${trust.needleAngle.toFixed(1)}deg"></span>
            <span class="journal-trust-gauge__hub"></span>
            <span class="journal-trust-gauge__minus" aria-hidden="true">−</span>
            <span class="journal-trust-gauge__plus" aria-hidden="true">+</span>
          </div>
          <div class="journal-trust-copy"><em>${trust.text}</em></div>
        </div>
      </div>`;
    const badge = heading.querySelector(".emotion");
    if (badge) badge.textContent = emotion.badge;
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
    detail.append(image, content);

    panel.querySelectorAll(".planet-map-zone").forEach((zone) => {
      zone.classList.toggle("selected", zone.dataset.mapId === mapId);
    });
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
      }, { passive: false });
      centerButton.addEventListener("click", () => {
        viewport._bluefoxCenterCurrent?.();
      });
    }

    const world = viewport.querySelector(".planet-map-world");
    const coordinates = planetCoordinates(panel);
    const ids = discoveredMapIds(panel);
    const signature = `${currentMapId(panel)}|${ids.map((id) => {
      const map = global.BlueFox3D.maps[id];
      const point = coordinates.get(id);
      return `${id}:${map.name}:${map.plateauCount || map.terrainUrls?.length || 1}:${point.x},${point.y}`;
    }).join("|")}`;
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
        const pin = document.createElement("span");
        pin.className = "planet-map-pin";
        const label = document.createElement("b");
        label.textContent = `${discoveryLabel(mapId)} · ${definition.name}`;
        zone.append(pin, label);
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
      const currentZone = [...world.querySelectorAll(".planet-map-zone")]
        .find((zone) => zone.dataset.mapId === currentMapId(panel));
      if (!currentZone) return;
      const view = viewport._bluefoxView;
      const rect = viewport.getBoundingClientRect();
      view.zoom = 1;
      view.x = rect.width / 2 - Number.parseFloat(currentZone.style.left);
      view.y = rect.height / 2 - Number.parseFloat(currentZone.style.top);
      viewport._bluefoxApplyTransform();
    };
    world.querySelectorAll(".planet-map-zone").forEach((zone) => {
      zone.classList.toggle("current", zone.dataset.mapId === currentMapId(panel));
    });
    const currentKey = currentMapId(panel);
    if (viewport.dataset.centeredMap !== currentKey) {
      viewport.dataset.centeredMap = currentKey;
      requestAnimationFrame(() => viewport._bluefoxCenterCurrent());
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
    const signature = [
      current,
      discoveredMapIds(panel).length,
      mapGrid.querySelectorAll("button").length,
      catalogSignature,
      discoverySignature
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

  function scan() {
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
    document.querySelectorAll(".mission-card").forEach(enhanceMission);
    document.querySelectorAll(".full-screen-panel").forEach((panel) => {
      if (panel.querySelector(".planet-layout")) enhancePlanet(panel);
      if (panel.querySelector(".journal-layout")) enhanceJournal(panel);
    });
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
  global.addEventListener("bluefox:map-state", scheduleScan);
  global.addEventListener("bluefox:scene-images", refreshSceneImages);
  global.addEventListener("bluefox:image-catalog", scheduleScan);
  global.addEventListener("bluefox:discovery-changed", scheduleScan);
  global.addEventListener("bluefox:zone-discovery-changed", scheduleScan);
  window.setInterval(scheduleScan, 350);
  scan();
})(window);
