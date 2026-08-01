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

  const inventoryEntries = () => {
    const inventory = BF.getProgressionState?.().inventory || {};
    const keys = new Set(BASE_KEYS);
    Object.entries(inventory).forEach(([key, amount]) => {
      if ((Number(amount) || 0) > 0) keys.add(key);
    });
    return [...keys].map((key) => ({
      ...catalogEntry(key),
      amount: Math.max(0, Number(inventory[key]) || 0)
    }));
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
    const entries = inventoryEntries();
    const signature = JSON.stringify(entries.map(({ key, amount }) => [key, amount]));
    const renderedKeys = [...grid.querySelectorAll("article[data-inventory-key]")]
      .map((article) => article.dataset.inventoryKey);
    const expectedKeys = entries.map((entry) => entry.key);
    if (
      grid.dataset.progressionInventory === signature &&
      JSON.stringify(renderedKeys) === JSON.stringify(expectedKeys)
    ) return true;

    const fragment = document.createDocumentFragment();
    entries.forEach((entry) => {
      const article = document.createElement("article");
      article.dataset.inventoryKey = entry.key;
      const icon = document.createElement("span");
      icon.textContent = entry.icon;
      const amount = document.createElement("b");
      amount.textContent = String(entry.amount);
      const label = document.createElement("small");
      label.textContent = entry.label;
      article.append(icon, amount, label);
      fragment.append(article);
    });
    grid.replaceChildren(fragment);
    grid.dataset.progressionInventory = signature;
    return true;
  };

  let scheduled = false;
  const scheduleRender = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      render();
    });
  };

  global.addEventListener("bluefox:progression-changed", scheduleRender);
  global.addEventListener("DOMContentLoaded", scheduleRender, { once: true });
  const observer = new MutationObserver(scheduleRender);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  installLegacyWriteGuard();
  global.setTimeout(reconcileLegacyOfflineInventory, 1200);

  BF.refreshInventoryUI = render;
  BF.reconcileLegacyOfflineInventory = reconcileLegacyOfflineInventory;
})(window);
