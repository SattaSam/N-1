(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "inventory-kit-clean-v0.3";
  const LEGACY_STORAGE_KEY = "bluefox_odyssey_save_v1";
  const DEFAULT_SITE_INTERACTION_RADIUS = 12;
  const EXPEDITION_KIT_OPEN_KEY = "bluefox_expedition_kit_open_v1";
  const PERSONAL_BAG_OPEN_KEY = "bluefox_personal_bag_open_v1";
  const CAMP_STORAGE_OPEN_KEY = "bluefox_camp_storage_open_v1";
  const LOCKED_KIT_INVENTORY_KEYS = new Set([
    "deployed_beacon",
    "survival_bag"
  ]);

  const FALLBACKS = Object.freeze({
    crystal: { label: "Cristaux", icon: "◆" },
    fiber: { label: "Fibres", icon: "❧" },
    parts: { label: "Composants", icon: "⚙" },
    magnetic_ore: { label: "Minerai magnétique", icon: "⬡" },
    adaptive_biomass: { label: "Biomasse adaptative", icon: "✦" }
  });

  const titleCase = (value) => String(value || "ressource")
    .replace(/[_-]+/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));

  const catalogEntry = (inventoryKey) => {
    const definition = BF.ObjectLibrary?.list?.().find(
      (item) => item.resource?.inventoryKey === inventoryKey
    );
    const fallback = FALLBACKS[inventoryKey] || {};
    return {
      key: inventoryKey,
      label: fallback.label || definition?.label || titleCase(inventoryKey),
      icon: fallback.icon ||
        (definition?.knowledge?.family === "flora" ? "❧" : "◇")
    };
  };

  const inventoryEntries = (bucketName = "inventory") => {
    const bucket = BF.getProgressionState?.()[bucketName] || {};
    return Object.entries(bucket)
      .map(([key, rawAmount]) => ({
        ...catalogEntry(key),
        amount: Math.max(0, Number(rawAmount) || 0)
      }))
      .filter((entry) => entry.amount > 0);
  };

  const currentMapId = () => BF.currentEngine?.currentMapId || null;
  const currentSite = () => {
    const mapId = currentMapId();
    if (!mapId) return null;
    const sites =
      BF.currentEngine?.missionManager?.memory?.state?.siteProgression || {};

    // Compatibilité avec le site primaire historique indexé directement par map.
    if (sites[mapId]) return sites[mapId];

    // Les constructions persistantes récentes sont stockées par instanceId
    // et portent leur map d'appartenance dans site.mapId.
    const candidates = Object.values(sites)
      .filter((site) =>
        site &&
        String(site.mapId || "") === String(mapId) &&
        site.persistent !== false &&
        (
          ["camp", "refuge", "base"].includes(
            String(site.kind || "").toLocaleLowerCase("fr")
          ) ||
          /camp|refuge|base/i.test(
            `${site.microSceneId || ""} ${site.missionId || ""} ${site.id || ""}`
          )
        )
      )
      .sort((left, right) =>
        (Number(right.stage) || 0) - (Number(left.stage) || 0) ||
        (Number(right.establishedAt || right.createdAt) || 0) -
          (Number(left.establishedAt || left.createdAt) || 0)
      );

    return candidates[0] || null;
  };

  // Source de vérité UI : un stage mémorisé n'est PAS suffisant.
  // Le stockage Camp/Base n'existe que si la construction persistante est
  // effectivement instanciée dans la scène courante.
  const campSceneRoot = () => {
    const map = BF.currentEngine?.currentMap;
    const group = map?.group;
    if (!group) return null;
    const site = currentSite();
    if (!site) return null;
    let found = null;
    let fallback = null;

    group.traverse?.((node) => {
      if (found || !node) return;
      const data = node.userData || {};
      const name = String(node.name || "");
      const missionId = String(
        data.missionId ||
        data.bibleMissionId ||
        ""
      );
      const microSceneId = String(data.microSceneId || "");
      const persistentId = String(data.persistentMicroSceneId || "");

      const exactSiteRoot =
        Boolean(site.id) &&
        name === `BlueFoxSite:${String(site.id)}`;

      const belongsToCurrentSite =
        Boolean(site?.missionId) &&
        missionId === String(site.missionId);

      const matchesCurrentMicroScene =
        Boolean(site?.microSceneId) &&
        microSceneId === String(site.microSceneId);

      if (
        exactSiteRoot ||
        (belongsToCurrentSite && matchesCurrentMicroScene)
      ) {
        found = node;
        return;
      }

      const currentMicroSceneRoot =
        matchesCurrentMicroScene &&
        name === `MSCInstance:${String(site.microSceneId)}`;

      const looksLikeBuiltSite =
        /camp|refuge|base/i.test(
          `${name} ${microSceneId} ${persistentId}`
        );

      const legacyPersistent =
        data.persistent === true ||
        Boolean(persistentId) ||
        name.startsWith("PersistentMicroScene:");

      if (
        !fallback &&
        (
          currentMicroSceneRoot ||
          (legacyPersistent && (belongsToCurrentSite || looksLikeBuiltSite))
        )
      ) {
        fallback = node;
      }
    });
    return found || fallback;
  };

  const campExistsInScene = () =>
    Number(currentSite()?.stage) >= 1 && Boolean(campSceneRoot());

  const siteAnchor = () => {
    const root = campSceneRoot();
    if (root?.getWorldPosition && BF.currentEngine?.THREE) {
      const p = new BF.currentEngine.THREE.Vector3();
      root.getWorldPosition(p);
      return { x: p.x, z: p.z };
    }
    const site = currentSite();
    const anchor = site?.anchor || site?.position;
    if (
      campExistsInScene() &&
      Number.isFinite(Number(anchor?.x)) &&
      Number.isFinite(Number(anchor?.z))
    ) {
      return { x: Number(anchor.x), z: Number(anchor.z) };
    }
    return null;
  };

  const distanceToCurrentSite = () => {
    const anchor = siteAnchor();
    const position = BF.currentEngine?.character?.root?.position;
    if (!anchor || !position) return Infinity;
    return Math.hypot(
      Number(position.x) - anchor.x,
      Number(position.z) - anchor.z
    );
  };

  const canAccessCampInventory = () => {
    if (!campExistsInScene()) return false;
    const site = currentSite();
    const radius = Math.max(
      4,
      Number(site?.interactionRadius) || DEFAULT_SITE_INTERACTION_RADIUS
    );
    return distanceToCurrentSite() <= radius;
  };

  const expeditionQuantity = (key) => Math.max(
    0,
    Number(BF.getExpeditionQuantity?.(key)) || 0
  );

  const bagQuantity = (key) => Math.max(
    0,
    Number(BF.getUnallocatedInventoryQuantity?.(key)) || 0
  );

  const isExpeditionTransferableKey = (key) => {
    const safeKey = String(key || "");
    if (!safeKey || LOCKED_KIT_INVENTORY_KEYS.has(safeKey)) return false;
    if (safeKey === "accumulator") return true;
    const definition = BF.ObjectLibrary?.list?.().find(
      (item) => item.resource?.inventoryKey === safeKey
    );
    if (!definition) return true;
    const category = String(definition.category || "").toLowerCase();
    const type = String(definition.type || "").toLowerCase();
    const tags = new Set([
      ...(definition.spawn?.tags || []),
      ...(definition.spawnProfile?.tags || []),
      ...(definition.situation?.tags || [])
    ].map((tag) => String(tag).toLowerCase()));
    if (
      category === "equipment" ||
      tags.has("equipment") ||
      tags.has("tool") ||
      tags.has("drone") ||
      tags.has("beacon") ||
      /drone|beacon|tool/.test(type)
    ) return false;
    return true;
  };

  const freeBagCapacity = () => {
    const state = BF.getInventoryCapacityState?.() || {};
    if (!Number.isFinite(Number(state.capacity))) return Infinity;
    return Math.max(
      0,
      Number(state.capacity) - Math.max(0, Number(state.count) || 0)
    );
  };

  const sourceQuantity = (source, key) => {
    if (source === "bag") return bagQuantity(key);
    if (source === "kit") return expeditionQuantity(key);
    if (source === "camp") {
      return Math.max(
        0,
        Number(BF.getProgressionState?.().campStorage?.[key]) || 0
      );
    }
    return 0;
  };

  const transferMax = (source, destination, key) => {
    if (!source || !destination || source === destination) return 0;
    if ((source === "camp" || destination === "camp") && !canAccessCampInventory()) {
      return 0;
    }
    if (
      (source === "kit" || destination === "kit") &&
      !isExpeditionTransferableKey(key)
    ) return 0;
    let available = sourceQuantity(source, key);
    if (source === "camp" && (destination === "bag" || destination === "kit")) {
      available = Math.min(available, freeBagCapacity());
    }
    return Math.max(0, Math.floor(available));
  };

  const performTransfer = (source, destination, key, quantity) => {
    const amount = Math.max(0, Math.floor(Number(quantity) || 0));
    const maximum = transferMax(source, destination, key);
    if (!amount || amount > maximum) return 0;
    if (source === "bag" && destination === "camp") {
      return BF.depositInventory?.(key, amount) || 0;
    }
    if (source === "camp" && destination === "bag") {
      return BF.withdrawInventory?.(key, amount) || 0;
    }
    if (source === "bag" && destination === "kit") {
      return BF.allocateInventoryToExpedition?.(key, amount) || 0;
    }
    if (source === "kit" && destination === "bag") {
      return BF.releaseExpeditionAllocation?.(key, amount) || 0;
    }
    if (source === "camp" && destination === "kit") {
      return BF.transferCampToExpedition?.(key, amount) || 0;
    }
    if (source === "kit" && destination === "camp") {
      return BF.transferExpeditionToCamp?.(key, amount) || 0;
    }
    return 0;
  };

  const transferLabel = (bucket) => ({
    bag: "Sac personnel",
    kit: "Kit d’expédition",
    camp: "Stockage Camp/Base"
  }[bucket] || bucket);

  const openQuantityTransfer = (source, destination, key) => {
    const maximum = transferMax(source, destination, key);
    if (maximum <= 0) return false;
    const drawer = inventoryDrawer();
    if (!drawer) return false;
    drawer.querySelector(".inventory-transfer-quantity")?.remove();

    const meta = catalogEntry(key);
    const panel = document.createElement("div");
    panel.className = "inventory-transfer-quantity";
    panel.dataset.inventoryKey = key;
    panel.dataset.source = source;
    panel.dataset.destination = destination;

    const title = document.createElement("strong");
    title.textContent = `${meta.label} · ${transferLabel(source)} → ${transferLabel(destination)}`;

    const controls = document.createElement("div");
    controls.className = "inventory-transfer-quantity-controls";
    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", "Réduire la quantité");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = String(maximum);
    input.step = "1";
    input.value = "1";
    input.inputMode = "numeric";
    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", "Augmenter la quantité");

    const clamp = (value) => Math.max(
      1,
      Math.min(maximum, Math.floor(Number(value) || 1))
    );
    const setValue = (value) => {
      input.value = String(clamp(value));
    };
    minus.addEventListener("click", () => setValue(Number(input.value) - 1));
    plus.addEventListener("click", () => setValue(Number(input.value) + 1));
    input.addEventListener("change", () => setValue(input.value));
    input.addEventListener("wheel", (event) => {
      event.preventDefault();
      setValue(Number(input.value) + (event.deltaY < 0 ? 1 : -1));
    }, { passive: false });
    controls.append(minus, input, plus);

    const actions = document.createElement("div");
    actions.className = "inventory-transfer-quantity-actions";
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.textContent = "Transférer";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Annuler";
    confirm.addEventListener("click", () => {
      const moved = performTransfer(source, destination, key, clamp(input.value));
      if (moved > 0) {
        panel.remove();
        scheduleRender();
      }
    });
    cancel.addEventListener("click", () => panel.remove());
    actions.append(confirm, cancel);
    panel.append(title, controls, actions);
    drawer.appendChild(panel);
    input.focus?.();
    input.select?.();
    return true;
  };

  const dragPayload = (event) => ({
    key: event.dataTransfer?.getData("text/bluefox-inventory") || "",
    source: event.dataTransfer?.getData("text/bluefox-inventory-source") || ""
  });

  const installDropTarget = (node, destination, enabled = true) => {
    if (!enabled) return node;
    node.addEventListener("dragover", (event) => {
      const payload = dragPayload(event);
      if (transferMax(payload.source, destination, payload.key) > 0) {
        event.preventDefault();
      }
    });
    node.addEventListener("drop", (event) => {
      const payload = dragPayload(event);
      if (transferMax(payload.source, destination, payload.key) <= 0) return;
      event.preventDefault();
      openQuantityTransfer(payload.source, destination, payload.key);
    });
    return node;
  };

  const createInventoryGrid = (entries, bucket, enabled = true) => {
    const grid = document.createElement("div");
    grid.className = "inventory-grid inventory-transfer-grid";
    grid.dataset.inventoryBucket = bucket;
    installDropTarget(grid, bucket, enabled);

    const visibleEntries = (entries || []).filter(
      (entry) => Math.max(0, Number(entry?.amount) || 0) > 0
    );

    visibleEntries.forEach((entry) => {
      const article = document.createElement("article");
      article.dataset.inventoryKey = entry.key;
      article.dataset.inventorySource = bucket;
      article.draggable = Boolean(enabled) && entry.amount > 0;
      if (article.draggable) {
        article.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData("text/bluefox-inventory", entry.key);
          event.dataTransfer?.setData("text/bluefox-inventory-source", bucket);
        });
      }

      const icon = document.createElement("span");
      icon.textContent = entry.icon;
      const amount = document.createElement("b");
      amount.textContent = String(entry.amount);
      const label = document.createElement("small");
      label.textContent = entry.label;
      article.append(icon, amount, label);
      grid.appendChild(article);
    });

    if (!visibleEntries.length) {
      const empty = document.createElement("p");
      empty.className = "inventory-empty-state";
      empty.textContent = bucket === "camp"
        ? "Aucun objet stocké dans ce camp."
        : bucket === "kit"
          ? "Aucune ressource missionnelle réservée."
          : "Le sac est vide.";
      grid.appendChild(empty);
    }

    return grid;
  };

  let autoDepositRunning = false;
  const autoDeposit = () => {
    if (
      autoDepositRunning ||
      !canAccessCampInventory() ||
      global.localStorage.getItem("bluefox_auto_deposit_v1") !== "true"
    ) return false;
    const total = Object.values(BF.getProgressionState?.().inventory || {})
      .reduce((sum, amount) => sum + Math.max(0, Number(amount) || 0), 0);
    const reserved = Object.keys(BF.getProgressionState?.().inventory || {})
      .reduce((sum, key) => sum + expeditionQuantity(key), 0);
    if (total <= reserved) return false;
    autoDepositRunning = true;
    const moved = BF.depositAllInventory?.() || 0;
    autoDepositRunning = false;
    return moved > 0;
  };

  // Conservation de la compatibilité ancienne sauvegarde :
  // ceci ne recrée aucun ancien inventaire visuel.
  const installLegacyWriteGuard = () => {
    const prototype = global.Storage?.prototype;
    if (
      !prototype ||
      prototype.setItem.__bluefoxInventoryGuard
    ) return;

    const originalSetItem = prototype.setItem;
    const guardedSetItem = function guardedSetItem(key, value) {
      if (
        key === LEGACY_STORAGE_KEY &&
        BF.progression?.state?.migrations?.legacyOfflineReconciled
      ) {
        try {
          const legacy = JSON.parse(String(value));
          if (
            legacy &&
            typeof legacy === "object" &&
            !Array.isArray(legacy)
          ) {
            value = JSON.stringify({
              ...legacy,
              resources: {
                ...(BF.getProgressionState?.().inventory || {})
              },
              inventorySource: "progression-registry-v1"
            });
          }
        } catch {
          // Compatibilité sauvegarde historique uniquement.
        }
      }
      return originalSetItem.call(this, key, value);
    };
    guardedSetItem.__bluefoxInventoryGuard = true;
    prototype.setItem = guardedSetItem;
  };

  const reconcileLegacyOfflineInventory = () => {
    if (
      BF.progression?.state?.migrations?.legacyOfflineReconciled
    ) return false;

    let resources = {};
    let legacySave = null;
    try {
      legacySave = JSON.parse(
        global.localStorage.getItem(LEGACY_STORAGE_KEY) || "null"
      );
      resources = legacySave?.resources || {};
    } catch {
      resources = {};
    }

    if (legacySave?.newGame === true) {
      BF.completeLegacyInventoryReconciliation?.();
      return true;
    }

    const inventory =
      BF.getProgressionState?.().inventory || {};

    Object.entries(resources).forEach(
      ([inventoryKey, legacyAmount]) => {
        const quantity = Math.max(
          0,
          (Number(legacyAmount) || 0) -
            (Number(inventory[inventoryKey]) || 0)
        );
        if (!quantity || !BF.ObjectEvents?.emit) return;

        const definition =
          BF.ObjectLibrary?.list?.().find(
            (item) =>
              item.resource?.inventoryKey === inventoryKey
          ) || {
            id: `LEGACY-${inventoryKey}`,
            type: inventoryKey,
            category: "resources",
            resource: {
              family: inventoryKey,
              inventoryKey
            },
            progression: {}
          };

        BF.ObjectEvents.emit(
          BF.ObjectEvents.types.RESOURCE_COLLECTED,
          {
            userData: {
              functional: definition,
              catalogId: definition.id,
              kind: definition.type
            }
          },
          {
            inventoryKey,
            quantity,
            amount: quantity,
            offline: true,
            source: "legacy-offline-reconciliation"
          }
        );
      }
    );

    BF.completeLegacyInventoryReconciliation?.();
    return true;
  };

  const drawerIdentity = (drawer) =>
    String(
      drawer?.getAttribute("aria-label") ||
      drawer?.querySelector("h2")?.textContent ||
      ""
    ).trim().toLocaleLowerCase("fr");

  const isInventoryDrawer = (drawer) =>
    drawerIdentity(drawer).includes("inventaire");

  const inventoryDrawer = () =>
    [...document.querySelectorAll(
      ".drawer, .full-screen-panel"
    )].find(isInventoryDrawer) || null;

  const cleanupStaleInventoryUI = () => {
    document.querySelectorAll(
      ".drawer, .full-screen-panel"
    ).forEach((panel) => {
      if (isInventoryDrawer(panel)) return;

      panel
        .querySelectorAll(":scope > .inventory-sections")
        .forEach((sections) => sections.remove());

      panel
        .querySelectorAll(
          ':scope > [data-bluefox-legacy-inventory-hidden="true"]'
        )
        .forEach((node) => {
          node.hidden = false;
          node.style.removeProperty("display");
          delete node.dataset.bluefoxLegacyInventoryHidden;
        });
    });
  };

  const ensureSections = (drawer) => {
    let sections = drawer.querySelector(".inventory-sections");
    if (sections) return sections;

    sections = document.createElement("div");
    sections.className = "inventory-sections";
    sections.dataset.bluefoxInventoryBridge = VERSION;

    const title = drawer.querySelector("h2");
    if (title?.nextSibling) {
      title.parentNode.insertBefore(sections, title.nextSibling);
    } else {
      drawer.appendChild(sections);
    }
    return sections;
  };

  // La grille historique appartient à React : ne jamais la retirer du DOM.
  // Le bridge Inventaire la masque seulement pendant qu'il affiche ses sections
  // enrichies, afin de laisser React seul propriétaire de son démontage.
  const hideLegacyInventoryGrid = (drawer) => {
    if (!drawer) return false;
    let changed = false;

    // Le contenu React historique de l'Inventaire est composé de deux
    // siblings directs après le titre : son paragraphe descriptif et sa
    // grille fixe Cristaux/Fibres/Composants. Ils restent montés pour laisser
    // React propriétaire de leur cycle de vie, mais ne doivent plus être
    // visibles dès que les sections modernes sont actives.
    drawer
      .querySelectorAll(
        ":scope > p, :scope > .inventory-grid:not(.inventory-transfer-grid)"
      )
      .forEach((node) => {
        if (node.closest(".inventory-sections")) return;
        node.hidden = true;
        node.style.display = "none";
        node.dataset.bluefoxLegacyInventoryHidden = "true";
        changed = true;
      });

    return changed;
  };

  const createSection = (
    title,
    entries,
    bucket,
    target,
    storageKey,
    defaultOpen = true
  ) => {
    const details = document.createElement("details");
    const storedOpen = storageKey
      ? global.localStorage.getItem(storageKey)
      : null;
    details.open = storedOpen == null
      ? defaultOpen
      : storedOpen === "true";
    if (storageKey) {
      details.addEventListener("toggle", () => {
        global.localStorage.setItem(
          storageKey,
          String(details.open)
        );
      });
    }
    const summary = document.createElement("summary");
    summary.textContent = title;
    details.append(
      summary,
      createInventoryGrid(entries, bucket, Boolean(target))
    );
    return details;
  };

  const rationCount = () =>
    Math.max(
      0,
      Number(BF.getRationState?.().rations) || 0
    );

  const consumeRation = () => {
    if (rationCount() <= 0) return false;
    const before = rationCount();
    BF.survival?.completeRoutine?.(
      "food",
      { automatic: false }
    );
    const after = rationCount();
    if (after >= before) return false;

    BF.currentEngine?.callbacks?.onAction?.(
      "BlueFox consomme une ration de son Kit d’expédition."
    );
    return true;
  };

  const expeditionInventoryCount = (key) => Math.max(
    0,
    Number(BF.getProgressionState?.().inventory?.[key]) || 0
  );

  const expeditionResourceEntries = () => {
    const allocation = BF.getProgressionState?.().expeditionAllocation || {};
    return Object.keys(allocation)
      .map((key) => ({
        ...catalogEntry(key),
        amount: expeditionQuantity(key)
      }))
      .filter((entry) =>
        entry.amount > 0 && isExpeditionTransferableKey(entry.key)
      );
  };

  const scoutMissionActive = () =>
    BF.currentEngine?.missionManager?.memory?.state?.missionLifecycle?.["ENE-13"]?.status === "active";

  const createExpeditionKit = () => {
    const occupied = [];
    const rations = rationCount();
    const beaconCount = expeditionInventoryCount("deployed_beacon");
    const resources = expeditionResourceEntries();
    const special = BF.SpecialObjectRuntime?.snapshot?.() || {};
    const scout = special.drones?.scout_drone || null;

    if (rations > 0) {
      occupied.push({
        id: "ration",
        label: "Rations",
        icon: "◈",
        count: rations,
        locked: true,
        title: `Consommer une ration · ${rations}/50`,
        action: consumeRation
      });
    }

    if (beaconCount > 0) {
      occupied.push({
        id: "deployed_beacon",
        label: "Balise BlueFox",
        icon: "◆",
        count: beaconCount,
        locked: true,
        title: "Implanter une balise sur la map courante",
        action: () => BF.SpecialObjectRuntime?.deployBeacon?.({
          source: "player",
          missionId: "BAL-03"
        })
      });
    }

    if (scout?.crafted) {
      const deployedMapId = String(scout.deployedMapId || "");
      const mapLabel = deployedMapId
        ? String(BF.maps?.[deployedMapId]?.name || deployedMapId)
        : "";
      occupied.push({
        id: "scout_drone",
        label: "Drone éclaireur",
        icon: "◇",
        count: 1,
        locked: true,
        status: deployedMapId ? `déployé · ${mapLabel}` : "dans le Kit",
        title: deployedMapId
          ? `Rappeler le drone éclaireur depuis ${mapLabel}`
          : "Déployer le drone éclaireur sur la map courante",
        action: () => deployedMapId
          ? BF.SpecialObjectRuntime?.recallDrone?.("scout_drone", "kit-manual")
          : BF.SpecialObjectRuntime?.deployDrone?.("scout_drone")
      });
    } else if (scoutMissionActive()) {
      occupied.push({
        id: "scout_drone_assembly",
        label: "Assembler le Scout",
        icon: "◇",
        count: 1,
        locked: true,
        status: "prototype",
        title: "Assembler le premier drone éclaireur avec les ressources requises",
        action: () => BF.SpecialObjectRuntime?.craftDrone?.("scout_drone")
      });
    }

    const details = document.createElement("details");
    details.className = "expedition-kit-section";
    details.open =
      global.localStorage.getItem(EXPEDITION_KIT_OPEN_KEY) === "true";
    details.addEventListener("toggle", () => {
      global.localStorage.setItem(
        EXPEDITION_KIT_OPEN_KEY,
        String(details.open)
      );
    });

    const summary = document.createElement("summary");
    summary.textContent = "Kit d’expédition";

    const grid = document.createElement("div");
    grid.className = "expedition-kit-grid inventory-transfer-grid";
    installDropTarget(grid, "kit", true);

    resources.forEach((entry) => {
      const article = document.createElement("article");
      article.className = "expedition-kit-slot expedition-kit-resource";
      article.dataset.expeditionItem = entry.key;
      article.dataset.inventoryKey = entry.key;
      article.dataset.inventorySource = "kit";
      article.draggable = true;
      article.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/bluefox-inventory", entry.key);
        event.dataTransfer?.setData("text/bluefox-inventory-source", "kit");
      });
      const icon = document.createElement("span");
      icon.className = "expedition-kit-icon";
      icon.textContent = entry.icon;
      const label = document.createElement("span");
      label.className = "expedition-kit-label";
      label.textContent = entry.label;
      const amount = document.createElement("span");
      amount.className = "expedition-kit-count";
      amount.textContent = `×${entry.amount}`;
      article.append(icon, label, amount);
      grid.appendChild(article);
    });

    occupied.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "expedition-kit-slot";
      button.dataset.expeditionItem = item.id;
      button.dataset.expeditionLocked = item.locked ? "true" : "false";
      button.draggable = false;
      button.title = item.title || `Utiliser ${item.label}`;
      button.disabled = typeof item.action !== "function";

      const icon = document.createElement("span");
      icon.className = "expedition-kit-icon";
      icon.textContent = item.icon;

      const label = document.createElement("span");
      label.className = "expedition-kit-label";
      label.textContent = item.label;

      const amount = document.createElement("span");
      amount.className = "expedition-kit-count";
      amount.textContent = item.status || `×${item.count}`;

      button.append(icon, label, amount);
      if (typeof item.action === "function") {
        button.addEventListener("click", () => {
          if (item.action() !== false) scheduleRender();
        });
      }
      grid.appendChild(button);
    });

    if (!resources.length && !occupied.length) {
      const empty = document.createElement("p");
      empty.className = "inventory-empty-state";
      empty.textContent = "Glissez ici les ressources à réserver pour l’expédition.";
      grid.appendChild(empty);
    }

    details.append(summary, grid);
    return details;
  };

  const render = () => {
    cleanupStaleInventoryUI();
    const drawer = inventoryDrawer();
    if (!drawer) return false;

    // La grille React reste montée ; le bridge la masque sans en prendre possession.
    hideLegacyInventoryGrid(drawer);

    const sections = ensureSections(drawer);

    const campExists = campExistsInScene();
    const campAccessible = canAccessCampInventory();
    if (campAccessible) autoDeposit();

    const personal = inventoryEntries("inventory")
      .map((entry) => ({
        ...entry,
        amount: bagQuantity(entry.key)
      }))
      .filter((entry) => entry.amount > 0);
    const stored = inventoryEntries("campStorage");
    const expeditionResources = expeditionResourceEntries();
    const rations = rationCount();

    const signature = JSON.stringify({
      map: currentMapId(),
      campExists,
      campAccessible,
      stage: Number(currentSite()?.stage) || 0,
      personal: personal.map(({ key, amount }) => [
        key,
        amount
      ]),
      stored: stored.map(({ key, amount }) => [
        key,
        amount
      ]),
      rations,
      expeditionSpecial: BF.SpecialObjectRuntime?.snapshot?.() || null,
      deployedBeaconCount: expeditionInventoryCount("deployed_beacon"),
      expeditionResources: expeditionResources.map(({ key, amount }) => [key, amount]),
      autoDeposit:
        global.localStorage.getItem(
          "bluefox_auto_deposit_v1"
        ) === "true"
    });

    if (sections.dataset.signature === signature) {
      return true;
    }

    sections.replaceChildren();

    const personalSection = createSection(
      "Sac personnel de BlueFox",
      personal,
      "bag",
      "enabled",
      PERSONAL_BAG_OPEN_KEY,
      true
    );

    if (!campAccessible) {
      personalSection
        .querySelectorAll("article")
        .forEach((article) => {
          article.title = campExists
            ? "Glissez vers le Kit ; rapprochez-vous du camp pour déposer au stockage."
            : "Glissez vers le Kit ; établissez un camp pour accéder au stockage.";
        });
    }

    const automation = document.createElement("label");
    automation.className =
      "inventory-auto-deposit inventory-bag-controls";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked =
      global.localStorage.getItem(
        "bluefox_auto_deposit_v1"
      ) === "true";
    checkbox.disabled = !campExists;
    checkbox.addEventListener("change", () => {
      global.localStorage.setItem(
        "bluefox_auto_deposit_v1",
        String(checkbox.checked)
      );
      if (checkbox.checked) autoDeposit();
      scheduleRender();
    });

    automation.append(
      checkbox,
      " Vider automatiquement le sac à proximité d’un camp"
    );
    personalSection.appendChild(automation);
    sections.appendChild(personalSection);

    const expeditionKit = createExpeditionKit();
    if (expeditionKit) {
      sections.appendChild(expeditionKit);
    }

    // Règle UI : le stockage d'un camp existant reste consultable partout
    // sur sa map. Les transferts restent strictement propriétaires de la
    // proximité et ne sont activés qu'à portée du site.
    if (campExists) {
      const campSection = createSection(
        "Stockage partagé des camps",
        stored,
        "camp",
        campAccessible ? "enabled" : "",
        CAMP_STORAGE_OPEN_KEY,
        false
      );
      if (!campAccessible) {
        campSection
          .querySelectorAll("article")
          .forEach((article) => {
            article.draggable = false;
            article.title =
              "Consultation uniquement ; rapprochez-vous du camp pour reprendre des objets.";
          });
        const readonly = document.createElement("p");
        readonly.className = "inventory-camp-readonly";
        readonly.textContent =
          "Camp hors de portée · consultation uniquement.";
        campSection.appendChild(readonly);
      }
      sections.appendChild(campSection);
    }

    sections.dataset.signature = signature;
    return true;
  };

  const updateInventoryToolAvailability = () => {
    document
      .querySelectorAll(".tool-rail button")
      .forEach((button) => {
        const label = button
          .querySelector("small")
          ?.textContent
          ?.trim()
          .toLowerCase();

        if (label !== "inventaire") return;
        button.disabled = false;
        button.title = campExistsInScene()
          ? "Ouvrir le sac, le Kit d’expédition et le stockage Camp/Base"
          : "Ouvrir le sac personnel et le Kit d’expédition";
      });
  };

  let scheduled = false;
  const scheduleRender = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      updateInventoryToolAvailability();
      render();
    });
  };

  [
    "bluefox:progression-changed",
    "bluefox:rations-changed",
    "bluefox:mission-state",
    "bluefox:map-state",
    "bluefox:map-transition-completed",
    "bluefox:special-objects-changed",
    "bluefox:research-crafted"
  ].forEach((eventName) =>
    global.addEventListener(eventName, scheduleRender)
  );

  global.addEventListener(
    "DOMContentLoaded",
    scheduleRender,
    { once: true }
  );

  global.setInterval(scheduleRender, 750);

  const observer = new MutationObserver(scheduleRender);
  observer.observe(
    document.documentElement,
    { childList: true, subtree: true }
  );

  installLegacyWriteGuard();
  global.setTimeout(
    reconcileLegacyOfflineInventory,
    1200
  );

  BF.refreshInventoryUI = render;
  BF.reconcileLegacyOfflineInventory =
    reconcileLegacyOfflineInventory;
  BF.canAccessCampInventory =
    canAccessCampInventory;
  BF.campExistsInScene =
    campExistsInScene;
  BF.distanceToCurrentSite =
    distanceToCurrentSite;

  BF.getInventoryKitDiagnostics = () => ({
    version: VERSION,
    mapId: currentMapId(),
    site: currentSite(),
    campExistsInScene: campExistsInScene(),
    campAccessible: canAccessCampInventory(),
    campRoot: campSceneRoot()?.name || null,
    rations: rationCount(),
    expeditionAllocation: { ...(BF.getProgressionState?.().expeditionAllocation || {}) },
    legacyGridsRemaining:
      inventoryDrawer()
        ?.querySelectorAll(
          ".inventory-grid:not(.inventory-transfer-grid)"
        ).length || 0
  });
})(window);
