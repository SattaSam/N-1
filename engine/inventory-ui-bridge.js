(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const LEGACY_STORAGE_KEY = "bluefox_odyssey_save_v1";
  const BASE_KEYS = ["crystal", "fiber", "parts"];
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

  const inventoryEntries = (bucketName = "inventory") => {
    const inventory = BF.getProgressionState?.()[bucketName] || {};
    const keys = new Set(BASE_KEYS);
    Object.entries(inventory).forEach(([key, amount]) => {
      if ((Number(amount) || 0) > 0) keys.add(key);
    });
    return [...keys].map((key) => ({
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
  const canAccessCampInventory = () => Number(currentSite()?.stage) >= 1;

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
      currentSite()?.isPrimary !== true ||
      global.localStorage.getItem("bluefox_auto_deposit_v1") === "false"
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
    try {
      resources = JSON.parse(
        global.localStorage.getItem(LEGACY_STORAGE_KEY) || "null"
      )?.resources || {};
    } catch {
      resources = {};
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
    const grid = document.querySelector(".inventory-grid");
    if (!grid) return false;
    const drawer = grid.closest(".drawer");
    if (!canAccessCampInventory()) {
      drawer?.querySelector(".inventory-sections")?.remove();
      grid.hidden = true;
      let locked = drawer?.querySelector(".inventory-camp-locked");
      if (!locked && drawer) {
        locked = document.createElement("p");
        locked.className = "inventory-camp-locked";
        locked.textContent = "Le menu Inventaire est accessible uniquement dans une zone où BlueFox a établi un camp.";
        drawer.appendChild(locked);
      }
      return true;
    }
    drawer?.querySelector(".inventory-camp-locked")?.remove();
    autoDeposit();
    const personal = inventoryEntries("inventory");
    const stored = inventoryEntries("campStorage");
    const signature = JSON.stringify({
      personal: personal.map(({ key, amount }) => [key, amount]),
      stored: stored.map(({ key, amount }) => [key, amount])
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
    sections.append(
      createSection("Sac personnel de BlueFox", personal, "inventory", "camp"),
      createSection("Stockage partagé des camps", stored, "deposited", "bag")
    );
    const automation = document.createElement("label");
    automation.className = "inventory-auto-deposit";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = global.localStorage.getItem("bluefox_auto_deposit_v1") !== "false";
    checkbox.addEventListener("change", () => {
      global.localStorage.setItem("bluefox_auto_deposit_v1", String(checkbox.checked));
      if (checkbox.checked) autoDeposit();
    });
    automation.append(checkbox, " Vider automatiquement le sac à l’arrivée au camp de base");
    sections.appendChild(automation);
    sections.dataset.signature = signature;
    return true;
  };

  const updateInventoryToolAvailability = () => {
    document.querySelectorAll(".tool-rail button").forEach((button) => {
      const label = button.querySelector("small")?.textContent?.trim().toLowerCase();
      if (label !== "inventaire") return;
      const enabled = canAccessCampInventory();
      button.disabled = !enabled;
      button.title = enabled
        ? "Ouvrir le sac et le stockage partagé des camps"
        : "Établir un camp dans cette zone pour accéder à l’inventaire";
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
  const observer = new MutationObserver(scheduleRender);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  installLegacyWriteGuard();
  global.setTimeout(reconcileLegacyOfflineInventory, 1200);

  BF.refreshInventoryUI = render;
  BF.reconcileLegacyOfflineInventory = reconcileLegacyOfflineInventory;
})(window);
