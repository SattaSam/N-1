(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "inventory-kit-clean-v0.2";
  const LEGACY_STORAGE_KEY = "bluefox_odyssey_save_v1";
  const DEFAULT_SITE_INTERACTION_RADIUS = 12;

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
    return mapId
      ? BF.currentEngine?.missionManager?.memory?.state?.siteProgression?.[mapId]
      : null;
  };

  // Source de vérité UI : un stage mémorisé n'est PAS suffisant.
  // Le stockage Camp/Base n'existe que si la construction persistante est
  // effectivement instanciée dans la scène courante.
  const campSceneRoot = () => {
    const map = BF.currentEngine?.currentMap;
    const group = map?.group;
    if (!group) return null;
    const site = currentSite();
    let found = null;

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

      const belongsToCurrentSite =
        Boolean(site?.missionId) &&
        missionId === String(site.missionId);

      const looksLikeBuiltSite =
        /camp|refuge|base/i.test(
          `${name} ${microSceneId} ${persistentId}`
        );

      const persistent =
        data.persistent === true ||
        Boolean(persistentId) ||
        name.startsWith("PersistentMicroScene:");

      if (persistent && (belongsToCurrentSite || looksLikeBuiltSite)) {
        found = node;
      }
    });
    return found;
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

  const transfer = (key, direction, amount = 1) => {
    if (!canAccessCampInventory()) return 0;
    return direction === "camp"
      ? BF.depositInventory?.(key, amount) || 0
      : BF.withdrawInventory?.(key, amount) || 0;
  };

  const createInventoryGrid = (entries, bucket, target) => {
    const grid = document.createElement("div");
    grid.className = "inventory-grid inventory-transfer-grid";
    grid.dataset.inventoryBucket = bucket;

    if (target) {
      grid.addEventListener("dragover", (event) => event.preventDefault());
      grid.addEventListener("drop", (event) => {
        event.preventDefault();
        const key =
          event.dataTransfer?.getData("text/bluefox-inventory");
        if (key) {
          transfer(
            key,
            target,
            event.shiftKey ? Number.MAX_SAFE_INTEGER : 1
          );
        }
      });
    }

    const visibleEntries = (entries || []).filter(
      (entry) => Math.max(0, Number(entry?.amount) || 0) > 0
    );

    visibleEntries.forEach((entry) => {
      const article = document.createElement("article");
      article.dataset.inventoryKey = entry.key;
      article.draggable = Boolean(target) && entry.amount > 0;
      if (article.draggable) {
        article.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData(
            "text/bluefox-inventory",
            entry.key
          );
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
      empty.textContent =
        bucket === "deposited"
          ? "Aucun objet stocké dans ce camp."
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

    const total = Object.values(
      BF.getProgressionState?.().inventory || {}
    ).reduce(
      (sum, amount) =>
        sum + Math.max(0, Number(amount) || 0),
      0
    );
    if (!total) return false;

    autoDepositRunning = true;
    BF.depositAllInventory?.();
    autoDepositRunning = false;
    return true;
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

  // Suppression RÉELLE du reliquat visuel historique.
  // On ne lui applique aucun hidden/display:none : le nœud est retiré du DOM.
  const removeLegacyInventoryGrid = (drawer) => {
    drawer
      .querySelectorAll(
        ":scope > .inventory-grid:not(.inventory-transfer-grid)"
      )
      .forEach((grid) => grid.remove());

    // Sécurité pour les anciennes variantes où la grille était enveloppée.
    drawer
      .querySelectorAll(
        ".inventory-grid:not(.inventory-transfer-grid)"
      )
      .forEach((grid) => {
        if (!grid.closest(".inventory-sections")) {
          grid.remove();
        }
      });
  };

  const createSection = (
    title,
    entries,
    bucket,
    target,
    open = true
  ) => {
    const details = document.createElement("details");
    details.open = open;
    const summary = document.createElement("summary");
    summary.textContent = title;
    details.append(
      summary,
      createInventoryGrid(entries, bucket, target)
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

  const createExpeditionKit = () => {
    const occupied = [];
    const rations = rationCount();

    if (rations > 0) {
      occupied.push({
        id: "ration",
        label: "Rations",
        icon: "◈",
        count: rations,
        action: consumeRation
      });
    }

    // Aucun slot vide n'est rendu.
    if (!occupied.length) return null;

    const details = document.createElement("details");
    details.className = "expedition-kit-section";
    details.open = false;

    const summary = document.createElement("summary");
    summary.textContent = "Kit d’expédition";

    const grid = document.createElement("div");
    grid.className = "expedition-kit-grid";

    occupied.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "expedition-kit-slot";
      button.dataset.expeditionItem = item.id;
      button.title =
        item.id === "ration"
          ? `Consommer une ration · ${item.count}/50`
          : `Utiliser ${item.label}`;

      const icon = document.createElement("span");
      icon.className = "expedition-kit-icon";
      icon.textContent = item.icon;

      const label = document.createElement("span");
      label.className = "expedition-kit-label";
      label.textContent = item.label;

      const amount = document.createElement("span");
      amount.className = "expedition-kit-count";
      amount.textContent = `×${item.count}`;

      button.append(icon, label, amount);
      button.addEventListener("click", () => {
        if (item.action() !== false) scheduleRender();
      });
      grid.appendChild(button);
    });

    details.append(summary, grid);
    return details;
  };

  const render = () => {
    const drawer = inventoryDrawer();
    if (!drawer) return false;

    // On retire l'ancien composant avant toute reconstruction.
    removeLegacyInventoryGrid(drawer);

    const sections = ensureSections(drawer);

    const campExists = campExistsInScene();
    const campAccessible = canAccessCampInventory();
    if (campAccessible) autoDeposit();

    const personal = inventoryEntries("inventory");
    const stored = inventoryEntries("campStorage");
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
      "inventory",
      campAccessible ? "camp" : "",
      true
    );

    if (!campAccessible) {
      personalSection
        .querySelectorAll("article")
        .forEach((article) => {
          article.draggable = false;
          article.title = campExists
            ? "Le sac reste consultable ; rapprochez-vous du camp pour déposer son contenu."
            : "Le sac reste consultable ; établissez un camp pour déposer son contenu.";
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

    // Règle validée :
    // - camp absent : AUCUN bloc Camp, même verrouillé ;
    // - camp présent : bloc disponible uniquement à portée ;
    // - bloc replié par défaut.
    if (campExists && campAccessible) {
      sections.appendChild(
        createSection(
          "Stockage partagé des camps",
          stored,
          "deposited",
          "bag",
          false
        )
      );
    } else if (campExists) {
      const locked = document.createElement("p");
      locked.className = "inventory-camp-locked";
      locked.textContent =
        "Le stockage partagé est hors de portée. Rapprochez BlueFox du camp, du refuge ou de la base.";
      sections.appendChild(locked);
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
    "bluefox:map-transition-completed"
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
    legacyGridsRemaining:
      inventoryDrawer()
        ?.querySelectorAll(
          ".inventory-grid:not(.inventory-transfer-grid)"
        ).length || 0
  });
})(window);
