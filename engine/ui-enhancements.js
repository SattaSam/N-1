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
      synthesis: "BlueFox y sécurise son premier refuge et étudie les ressources proches.",
      directions: {
        north: { mapId: "jungle", x: 0, z: -27, title: "Passage vers les Ruines d’Émeraude" },
        west: { mapId: null, title: "Territoire non cartographié" },
        east: { mapId: null, title: "Territoire non cartographié" },
        south: { mapId: null, title: "Territoire non cartographié" }
      }
    },
    jungle: {
      name: "Ruines d’Émeraude",
      resources: "Fibres bioluminescentes, bassins énergétiques et structures anciennes.",
      synthesis: "BlueFox compare la flore des clairières et cartographie les ruines noyées.",
      directions: {
        north: { mapId: null, title: "Territoire non cartographié" },
        west: { mapId: null, title: "Territoire non cartographié" },
        east: { mapId: null, title: "Territoire non cartographié" },
        south: { mapId: "crystal", x: 64, z: 27, title: "Passage vers la Plaine des Cristaux" }
      }
    }
  };

  const directionsForMap = (mapId) => {
    const definition = global.BlueFox3D?.maps?.[mapId];
    const staticDirections = mapData[mapId]?.directions || {};
    return Object.fromEntries(
      Object.keys(directionNames).map((direction) => {
        const exit = definition?.exits?.[direction];
        if (exit) {
          return [direction, {
            mapId: exit.targetMap,
            x: exit.x,
            z: exit.z,
            title: `Passage vers ${global.BlueFox3D?.maps?.[exit.targetMap]?.name || "une map connue"}`
          }];
        }
        return [direction, staticDirections[direction] || {
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
    (panel.querySelector(".biome-zones article.current .jungle-zone")
      ? "jungle"
      : "crystal");

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
    let save = {};
    let clock = {};
    try {
      save = JSON.parse(
        localStorage.getItem("bluefox_odyssey_save_v1") || "{}"
      );
    } catch {
      save = {};
    }
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
      save,
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

  function emotionalSummary(traits = {}) {
    const dimensions = [
      {
        value: Number(traits["Curieux — Prudent"] ?? 50),
        high: "curiosité vive",
        low: "prudence attentive"
      },
      {
        value: Number(traits["Courageux — Craintif"] ?? 50),
        high: "confiance mesurée",
        low: "vigilance"
      },
      {
        value: Number(traits["Empathique — Indifférent"] ?? 50),
        high: "empathie",
        low: "recul analytique"
      },
      {
        value: Number(traits["Respectueux — Destructeur"] ?? 50),
        high: "respect profond",
        low: "détermination pragmatique"
      }
    ];
    const strongest = dimensions
      .map((dimension) => ({
        label: dimension.value >= 50 ? dimension.high : dimension.low,
        strength: Math.abs(dimension.value - 50)
      }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 2)
      .map((dimension) => dimension.label);
    return strongest.length
      ? strongest.join(" · ")
      : "curiosité calme";
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
    const { save, totalMinutes } = readJournalState();
    const emotion = emotionalSummary(save.traits);
    const signature = `${Math.floor(totalMinutes)}:${emotion}`;
    if (meta.dataset.signature === signature) return;
    meta.dataset.signature = signature;
    meta.innerHTML = `
      <div><span>DATE PLANÉTAIRE</span><b>${fictionalDate(totalMinutes)}</b></div>
      <div><span>DEPUIS L’ARRIVÉE</span><b>${elapsedPlanetTime(totalMinutes)}</b></div>
      <div><span>RESSENTI DE BLUEFOX</span><b>${emotion}</b></div>`;
    const badge = heading.querySelector(".emotion");
    if (badge) badge.textContent = `ÉMOTION · ${emotion}`;
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
          <h3>Terre inconnue</h3>
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
        <h3>${destination.title}</h3>
        <p><b>Biome :</b> ${destinationDefinition?.name || destinationMap.name}</p>
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
    const zoneName = `Zone ${mapDefinition?.number || 1}`;
    const plateauCount = Math.max(
      1,
      mapDefinition?.plateauCount || mapDefinition?.terrainUrls?.length || 1
    );
    const cardKey = `${mapId}:${plateauCount}`;
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
    eyebrow.textContent = "ZONE ACTUELLE";
    const title = document.createElement("h3");
    title.textContent = zoneName;
    const description = document.createElement("p");
    description.textContent =
      mapDefinition?.description ||
      `${mapDefinition?.name || definition.name} — Zone composée de ${plateauCount} plateau${plateauCount > 1 ? "x" : ""}.`;
    const viewpoint = document.createElement("p");
    const strong = document.createElement("b");
    strong.textContent = "Point de vue de BlueFox :";
    viewpoint.append(strong, ` ${mapDefinition?.synthesis || definition.synthesis}`);
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

  function setCatalogDetail(panel, catalogMap) {
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
      .filter((map) => map.number > 2 && discovered(panel, map.id));
    const signature = maps.map((map) =>
      `${map.number}:${map.scene.filename}:${map.terrains.length}`
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
      button.title = `Consulter ${catalogMap.name}`;
      const image = document.createElement("i");
      image.style.backgroundImage = `url("${catalogMap.scene.url}")`;
      const label = document.createElement("span");
      label.textContent = `MAP ${catalogMap.prefix}`;
      const name = document.createElement("b");
      name.textContent = catalogMap.name;
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
    const signature = [
      current,
      discovered(panel, "jungle") ? "known" : "locked",
      mapGrid.querySelectorAll("button").length,
      catalogSignature
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
    const rightColumn = layout.lastElementChild;
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
        target
          ? `MAP ${String(global.BlueFox3D?.maps?.[target]?.number || "?").padStart(2, "0")}`
          : "MAP INCONNUE";
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
      setPlanetDetail(panel, current === "crystal" ? "north" : "south");
    }
  }

  function scan() {
    const activeMap = global.BlueFox3D?.currentEngine?.currentMapId;
    const activeDefinition = global.BlueFox3D?.maps?.[activeMap];
    const location = document.querySelector(".brand-block strong");
    if (location && activeDefinition) {
      const expectedLocation =
        `${activeDefinition.name} · Zone ${activeDefinition.number || 1}`;
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
