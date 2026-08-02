(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const LEGACY_STORAGE_KEY = "bluefox_odyssey_save_v1";
  const BASE_KEYS = ["crystal", "fiber", "parts"];
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
      icon: fallback.icon || (definition?.knowledge?.family === "flora" ? "❧" : "◇")
    };
  };

  const inventoryKeys = () => {
    const keys = new Set(BASE_KEYS);
    BF.ObjectLibrary?.list?.({ status: "active" }).forEach((definition) => {
      const key = definition.gameplay?.collectable === true
        ? definition.resource?.inventoryKey
        : null;
      if (key) keys.add(key);
    });
    const state = BF.getProgressionState?.() || {};
    [state.inventory, state.campStorage].forEach((bucket) => {
      Object.keys(bucket || {}).forEach((key) => keys.add(key));
    });
    return [...keys];
  };

  const inventoryEntries = (bucketName = "inventory") => {
    const inventory = BF.getProgressionState?.()[bucketName] || {};
    return inventoryKeys().map((key) => ({
      ...catalogEntry(key),
      amount: Math.max(0, Number(inventory[key]) || 0)
    }));
  };

  const currentMapId = () => BF.currentEngine?.currentMapId || null;
  const currentSite = () => {
    const mapId = currentMapId();
    return mapId
      ? BF.currentEngine?.missionManager?.memory?.state?.siteProgression?.[mapId]
      : null;
  };
  const siteAnchor = (site = currentSite()) => {
    if (!site || Number(site.stage) < 1) return null;
    const anchor = site.anchor || site.position;
    if (Number.isFinite(Number(anchor?.x)) && Number.isFinite(Number(anchor?.z))) {
      return { x: Number(anchor.x), z: Number(anchor.z) };
    }
    return { x: 0, z: 8 };
  };
  const distanceToCurrentSite = () => {
    const anchor = siteAnchor();
    const position = BF.currentEngine?.character?.root?.position;
    if (!anchor || !position) return Infinity;
    return Math.hypot(Number(position.x) - anchor.x, Number(position.z) - anchor.z);
  };
  const canAccessCampInventory = () => {
    const site = currentSite();
    const radius = Math.max(
      4,
      Number(site?.interactionRadius) || DEFAULT_SITE_INTERACTION_RADIUS
    );
    return Number(site?.stage) >= 1 && distanceToCurrentSite() <= radius;
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
    grid.addEventListener("dragover", (event) => event.preventDefault());
    grid.addEventListener("drop", (event) => {
      event.preventDefault();
      const key = event.dataTransfer?.getData("text/bluefox-inventory");
      if (key) transfer(key, target, event.shiftKey ? Number.MAX_SAFE_INTEGER : 1);
    });
    entries.forEach((entry) => {
      const article = document.createElement("article");
      article.dataset.inventoryKey = entry.key;
      article.draggable = entry.amount > 0;
      article.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/bluefox-inventory", entry.key);
      });
      const icon = document.createElement("span");
      icon.textContent = entry.icon;
      const amount = document.createElement("b");
      amount.textContent = String(entry.amount);
      const label = document.createElement("small");
      label.textContent = entry.label;
      article.append(icon, amount, label);
      grid.appendChild(article);
    });
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
    if (!total) return false;
    autoDepositRunning = true;
    BF.depositAllInventory?.();
    autoDepositRunning = false;
    return true;
  };

  const installLegacyWriteGuard = () => {
    const prototype = global.Storage?.prototype;
    if (!prototype || prototype.setItem.__bluefoxInventoryGuard) return;
    const originalSetItem = prototype.setItem;
    const guardedSetItem = function guardedSetItem(key, value) {
      if (
        key === LEGACY_STORAGE_KEY &&
        BF.progression?.state?.migrations?.legacyOfflineReconciled
      ) {
        try {
          const legacy = JSON.parse(String(value));
          if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
            value = JSON.stringify({
              ...legacy,
              resources: { ...(BF.getProgressionState?.().inventory || {}) },
              inventorySource: "progression-registry-v1"
            });
          }
        } catch {
          // La sauvegarde brute reste prise en charge par le code historique.
        }
      }
      return originalSetItem.call(this, key, value);
    };
    guardedSetItem.__bluefoxInventoryGuard = true;
    prototype.setItem = guardedSetItem;
  };

  const reconcileLegacyOfflineInventory = () => {
    if (BF.progression?.state?.migrations?.legacyOfflineReconciled) return false;
    let resources = {};
    let legacySave = null;
    try {
      legacySave = JSON.parse(global.localStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      resources = legacySave?.resources || {};
    } catch {
      resources = {};
    }

    if (legacySave?.newGame === true) {
      BF.completeLegacyInventoryReconciliation?.();
      return true;
    }
    const inventory = BF.getProgressionState?.().inventory || {};
    Object.entries(resources).forEach(([inventoryKey, legacyAmount]) => {
      const quantity = Math.max(
        0,
        (Number(legacyAmount) || 0) - (Number(inventory[inventoryKey]) || 0)
      );
      if (!quantity || !BF.ObjectEvents?.emit) return;
      const definition = BF.ObjectLibrary?.list?.().find(
        (item) => item.resource?.inventoryKey === inventoryKey
      ) || {
        id: `LEGACY-${inventoryKey}`,
        type: inventoryKey,
        category: "resources",
        resource: { family: inventoryKey, inventoryKey },
        progression: {}
      };
      BF.ObjectEvents.emit(BF.ObjectEvents.types.RESOURCE_COLLECTED, {
        userData: {
          functional: definition,
          catalogId: definition.id,
          kind: definition.type
        }
      }, {
        inventoryKey,
        quantity,
        amount: quantity,
        offline: true,
        source: "legacy-offline-reconciliation"
      });
    });
    BF.completeLegacyInventoryReconciliation?.();
    return true;
  };

  const render = () => {
    const grid = document.querySelector(
      ".drawer > .inventory-grid:not(.inventory-transfer-grid), " +
      ".drawer .inventory-grid:not(.inventory-transfer-grid)"
    );
    if (!grid) return false;
    const drawer = grid.closest(".drawer");
    const campAccessible = canAccessCampInventory();
    if (campAccessible) autoDeposit();
    const personal = inventoryEntries("inventory");
    const stored = inventoryEntries("campStorage");
    const droneState = BF.SpecialObjectRuntime?.snapshot?.() || { drones: {}, recipes: {} };
    const signature = JSON.stringify({
      campAccessible,
      campEstablished: Number(currentSite()?.stage) >= 1,
      autoDeposit: global.localStorage.getItem("bluefox_auto_deposit_v1") === "true",
      personal: personal.map(({ key, amount }) => [key, amount]),
      stored: stored.map(({ key, amount }) => [key, amount]),
      drones: droneState.drones
    });
    let sections = drawer?.querySelector(".inventory-sections");
    if (sections?.dataset.signature === signature) return true;
    if (!sections) {
      sections = document.createElement("div");
      sections.className = "inventory-sections";
      grid.before(sections);
    }
    grid.hidden = true;
    sections.replaceChildren();
    const createSection = (title, entries, bucket, target) => {
      const details = document.createElement("details");
      details.open = true;
      const summary = document.createElement("summary");
      summary.textContent = title;
      details.append(summary, createInventoryGrid(entries, bucket, target));
      return details;
    };
    const personalSection = createSection(
      "Sac personnel de BlueFox",
      personal,
      "inventory",
      campAccessible ? "camp" : ""
    );
    if (!campAccessible) {
      personalSection.querySelectorAll("article").forEach((article) => {
        article.draggable = false;
        article.title = Number(currentSite()?.stage) >= 1
          ? "Le sac reste consultable ; rapprochez-vous du site pour déposer son contenu."
          : "Le sac reste consultable ; établissez un camp pour déposer son contenu.";
      });
    }
    const automation = document.createElement("label");
    automation.className = "inventory-auto-deposit inventory-bag-controls";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = global.localStorage.getItem("bluefox_auto_deposit_v1") === "true";
    checkbox.addEventListener("change", () => {
      global.localStorage.setItem("bluefox_auto_deposit_v1", String(checkbox.checked));
      if (checkbox.checked) autoDeposit();
      scheduleRender();
    });
    automation.append(checkbox, " Vider automatiquement le sac à proximité d’un camp");
    personalSection.appendChild(automation);
    sections.appendChild(personalSection);
    if (campAccessible) {
      sections.appendChild(
        createSection("Stockage partagé des camps", stored, "deposited", "bag")
      );
    } else {
      const locked = document.createElement("p");
      locked.className = "inventory-camp-locked";
      locked.textContent = Number(currentSite()?.stage) >= 1
        ? "Le stockage partagé est hors de portée. Rapprochez BlueFox du camp, du refuge ou de la base."
        : "Le stockage Camp/Base sera disponible dès qu’un camp aura été établi dans cette zone. Le sac personnel reste consultable.";
      sections.appendChild(locked);
    }
    if (Number(currentSite()?.stage) >= 3) {
      const workshop = document.createElement("details");
      workshop.open = true;
      const summary = document.createElement("summary");
      summary.textContent = "Atelier de drones";
      workshop.appendChild(summary);
      Object.entries(droneState.recipes || {}).forEach(([type, recipe]) => {
        const row = document.createElement("p");
        row.className = "inventory-bag-controls";
        const button = document.createElement("button");
        const label = type === "scout_drone" ? "Drone éclaireur" : "Drone récolteur";
        const crafted = Boolean(droneState.drones?.[type]?.crafted);
        button.type = "button";
        button.textContent = crafted ? `${label} assemblé` : `Assembler : ${label}`;
        button.disabled = crafted || !BF.SpecialObjectRuntime?.canCraft?.(type);
        button.addEventListener("click", () => {
          BF.SpecialObjectRuntime?.craftDrone?.(type);
          scheduleRender();
        });
        const cost = document.createElement("small");
        cost.textContent = Object.entries(recipe)
          .map(([key, amount]) => `${amount} ${catalogEntry(key).label.toLocaleLowerCase("fr")}`)
          .join(" · ");
        row.append(button, cost);
        workshop.appendChild(row);
      });
      sections.appendChild(workshop);
    }
    sections.dataset.signature = signature;
    return true;
  };

  const updateInventoryToolAvailability = () => {
    document.querySelectorAll(".tool-rail button").forEach((button) => {
      const label = button.querySelector("small")?.textContent?.trim().toLowerCase();
      if (label !== "inventaire") return;
      button.disabled = false;
      button.title = canAccessCampInventory()
        ? "Ouvrir le sac et le stockage partagé des camps"
        : "Ouvrir le sac personnel (stockage Camp/Base encore verrouillé)";
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

  global.addEventListener("bluefox:progression-changed", scheduleRender);
  global.addEventListener("bluefox:mission-state", scheduleRender);
  global.addEventListener("bluefox:map-state", scheduleRender);
  global.addEventListener("DOMContentLoaded", scheduleRender, { once: true });
  global.setInterval(scheduleRender, 750);
  const observer = new MutationObserver(scheduleRender);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  installLegacyWriteGuard();
  global.setTimeout(reconcileLegacyOfflineInventory, 1200);

  BF.refreshInventoryUI = render;
  BF.reconcileLegacyOfflineInventory = reconcileLegacyOfflineInventory;
  BF.canAccessCampInventory = canAccessCampInventory;
  BF.distanceToCurrentSite = distanceToCurrentSite;
})(window);
