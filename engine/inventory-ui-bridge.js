(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const LEGACY_STORAGE_KEY = "bluefox_odyssey_save_v1";
  const DEFAULT_SITE_INTERACTION_RADIUS = 12;
  const FALLBACKS = Object.freeze({
    wood: { label: "Bois", icon: "▥" },
    crystal: { label: "Cristaux", icon: "◆" },
    fiber: { label: "Fibres", icon: "❧" },
    parts: { label: "Composants", icon: "⚙" },
    magnetic_ore: { label: "Minerai magnétique", icon: "⬡" },
    adaptive_biomass: { label: "Biomasse adaptative", icon: "✦" }
  });

  let scheduled = false;
  let catalogByInventoryKey = null;
  let rootObserver = null;

  const titleCase = (value) =>
    String(value || "ressource")
      .replace(/[_-]+/g, " ")
      .replace(
        /\b\p{L}/gu,
        (letter) => letter.toLocaleUpperCase("fr")
      );

  const catalog = () => {
    if (catalogByInventoryKey) return catalogByInventoryKey;
    catalogByInventoryKey = new Map();
    BF.ObjectLibrary?.list?.({ status: "active" }).forEach((definition) => {
      const key = definition.resource?.inventoryKey;
      if (key && !catalogByInventoryKey.has(key)) {
        catalogByInventoryKey.set(key, definition);
      }
    });
    return catalogByInventoryKey;
  };

  const catalogEntry = (inventoryKey) => {
    const definition = catalog().get(inventoryKey);
    const fallback = FALLBACKS[inventoryKey] || {};
    return {
      key: inventoryKey,
      label:
        fallback.label ||
        definition?.label ||
        titleCase(inventoryKey),
      icon:
        fallback.icon ||
        (definition?.knowledge?.family === "flora" ? "❧" : "◇")
    };
  };

  const state = () => BF.getProgressionState?.() || {};

  const inventoryEntries = (bucketName) =>
    Object.entries(state()[bucketName] || {})
      .map(([key, amount]) => ({
        ...catalogEntry(key),
        amount: Math.max(0, Number(amount) || 0)
      }))
      .filter((entry) => entry.amount > 0)
      .sort((left, right) =>
        left.label.localeCompare(right.label, "fr")
      );

  const currentMapId = () => BF.currentEngine?.currentMapId || null;

  const currentSite = () => {
    const mapId = currentMapId();
    return mapId
      ? BF.currentEngine?.missionManager?.memory?.state
          ?.siteProgression?.[mapId]
      : null;
  };

  const siteAnchor = (site = currentSite()) => {
    if (!site || Number(site.stage) < 1) return null;
    const anchor = site.anchor || site.position;
    if (
      Number.isFinite(Number(anchor?.x)) &&
      Number.isFinite(Number(anchor?.z))
    ) {
      return { x: Number(anchor.x), z: Number(anchor.z) };
    }
    return { x: 0, z: 8 };
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
    const site = currentSite();
    const radius = Math.max(
      4,
      Number(site?.interactionRadius) ||
        DEFAULT_SITE_INTERACTION_RADIUS
    );
    return (
      Number(site?.stage) >= 1 &&
      distanceToCurrentSite() <= radius
    );
  };

  const transfer = (key, direction, amount = 1) => {
    if (!canAccessCampInventory()) return 0;
    const moved =
      direction === "camp"
        ? BF.depositInventory?.(key, amount) || 0
        : BF.withdrawInventory?.(key, amount) || 0;
    BF.flushPersistence?.("inventory-transfer");
    scheduleRender();
    return moved;
  };

  const emptyMessage = (text) => {
    const node = document.createElement("p");
    node.className = "inventory-empty-message";
    node.textContent = text;
    return node;
  };

  const createInventoryGrid = (
    entries,
    bucket,
    target,
    emptyText
  ) => {
    const grid = document.createElement("div");
    grid.className = "inventory-grid inventory-transfer-grid";
    grid.dataset.inventoryBucket = bucket;
    grid.addEventListener("dragover", (event) =>
      event.preventDefault()
    );
    grid.addEventListener("drop", (event) => {
      event.preventDefault();
      const key = event.dataTransfer?.getData(
        "text/bluefox-inventory"
      );
      if (key) {
        transfer(
          key,
          target,
          event.shiftKey ? Number.MAX_SAFE_INTEGER : 1
        );
      }
    });

    if (!entries.length) {
      grid.appendChild(emptyMessage(emptyText));
      return grid;
    }

    entries.forEach((entry) => {
      const article = document.createElement("article");
      article.dataset.inventoryKey = entry.key;
      article.draggable = entry.amount > 0 && Boolean(target);
      article.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData(
          "text/bluefox-inventory",
          entry.key
        );
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

  const autoDeposit = () => {
    if (
      !canAccessCampInventory() ||
      global.localStorage.getItem(
        "bluefox_auto_deposit_v1"
      ) !== "true"
    ) {
      return false;
    }

    const total = Object.values(state().inventory || {}).reduce(
      (sum, amount) => sum + Math.max(0, Number(amount) || 0),
      0
    );
    if (!total) return false;

    BF.depositAllInventory?.();
    BF.flushPersistence?.("inventory-auto-deposit");
    return true;
  };

  const createSection = (
    title,
    entries,
    bucket,
    target,
    emptyText
  ) => {
    const details = document.createElement("details");
    details.open = true;
    const summary = document.createElement("summary");
    summary.textContent = title;
    details.append(
      summary,
      createInventoryGrid(
        entries,
        bucket,
        target,
        emptyText
      )
    );
    return details;
  };

  const renderWorkshop = (sections) => {
    if (Number(currentSite()?.stage) < 3) return;

    const droneState =
      BF.SpecialObjectRuntime?.snapshot?.() ||
      { drones: {}, recipes: {} };
    const workshop = document.createElement("details");
    workshop.open = true;
    const summary = document.createElement("summary");
    summary.textContent = "Atelier de drones";
    workshop.appendChild(summary);

    Object.entries(droneState.recipes || {}).forEach(
      ([type, recipe]) => {
        const row = document.createElement("p");
        row.className = "inventory-bag-controls";
        const button = document.createElement("button");
        const label =
          type === "scout_drone"
            ? "Drone éclaireur"
            : "Drone récolteur";
        const crafted = Boolean(
          droneState.drones?.[type]?.crafted
        );
        button.type = "button";
        button.textContent = crafted
          ? `${label} assemblé`
          : `Assembler : ${label}`;
        button.disabled =
          crafted ||
          !BF.SpecialObjectRuntime?.canCraft?.(type);
        button.addEventListener("click", () => {
          BF.SpecialObjectRuntime?.craftDrone?.(type);
          scheduleRender();
        });

        const cost = document.createElement("small");
        cost.textContent = Object.entries(recipe)
          .map(
            ([key, amount]) =>
              `${amount} ${catalogEntry(key).label.toLocaleLowerCase(
                "fr"
              )}`
          )
          .join(" · ");
        row.append(button, cost);
        workshop.appendChild(row);
      }
    );
    sections.appendChild(workshop);
  };

  const updateInventoryToolAvailability = () => {
    document.querySelectorAll(".tool-rail button").forEach(
      (button) => {
        const label = button
          .querySelector("small")
          ?.textContent?.trim()
          .toLowerCase();
        if (label !== "inventaire") return;
        button.disabled = false;
        button.title = canAccessCampInventory()
          ? "Ouvrir le sac et le stockage partagé des camps"
          : "Ouvrir le sac personnel";
      }
    );
  };

  const render = () => {
    updateInventoryToolAvailability();

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
    const signature = JSON.stringify({
      campAccessible,
      stage: Number(currentSite()?.stage) || 0,
      autoDeposit:
        global.localStorage.getItem(
          "bluefox_auto_deposit_v1"
        ) === "true",
      personal: personal.map(({ key, amount }) => [key, amount]),
      stored: stored.map(({ key, amount }) => [key, amount])
    });

    let sections = drawer?.querySelector(
      ".inventory-sections"
    );
    if (sections?.dataset.signature === signature) {
      return true;
    }
    if (!sections) {
      sections = document.createElement("div");
      sections.className = "inventory-sections";
      grid.before(sections);
    }

    grid.hidden = true;
    sections.replaceChildren();

    const personalSection = createSection(
      "Sac personnel de BlueFox",
      personal,
      "inventory",
      campAccessible ? "camp" : "",
      "Le sac de BlueFox est vide."
    );

    const automation = document.createElement("label");
    automation.className =
      "inventory-auto-deposit inventory-bag-controls";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked =
      global.localStorage.getItem(
        "bluefox_auto_deposit_v1"
      ) === "true";
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

    if (campAccessible) {
      sections.appendChild(
        createSection(
          "Stockage partagé des camps",
          stored,
          "campStorage",
          "bag",
          "Le stockage du camp est vide."
        )
      );
    } else {
      const locked = document.createElement("p");
      locked.className = "inventory-camp-locked";
      locked.textContent =
        Number(currentSite()?.stage) >= 1
          ? "Le stockage partagé est hors de portée."
          : "Établissez un camp pour accéder au stockage partagé.";
      sections.appendChild(locked);
    }

    renderWorkshop(sections);
    sections.dataset.signature = signature;
    return true;
  };

  const scheduleRender = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      render();
    });
  };

  const installLegacyWriteGuard = () => {
    const prototype = global.Storage?.prototype;
    if (
      !prototype ||
      prototype.setItem.__bluefoxInventoryGuard
    ) {
      return;
    }

    const originalSetItem = prototype.setItem;
    const guardedSetItem = function (key, value) {
      if (
        key === LEGACY_STORAGE_KEY &&
        BF.progression?.state?.migrations
          ?.legacyOfflineReconciled
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
          // Compatibilité historique inchangée.
        }
      }
      return originalSetItem.call(this, key, value);
    };
    guardedSetItem.__bluefoxInventoryGuard = true;
    prototype.setItem = guardedSetItem;
  };

  [
    "bluefox:progression-changed",
    "bluefox:mission-state",
    "bluefox:map-state",
    "bluefox:research-skill-unlocked",
    "bluefox:inventory-capacity-changed"
  ].forEach((eventName) =>
    global.addEventListener(eventName, scheduleRender)
  );

  global.addEventListener(
    "DOMContentLoaded",
    scheduleRender,
    { once: true }
  );

  const observeRoot = () => {
    const root =
      document.getElementById("root") ||
      document.body;
    rootObserver?.disconnect();
    rootObserver = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) =>
        [...mutation.addedNodes].some(
          (node) =>
            node.nodeType === 1 &&
            (
              node.matches?.(".drawer, .inventory-grid") ||
              node.querySelector?.(".drawer, .inventory-grid")
            )
        )
      );
      if (relevant) scheduleRender();
    });
    rootObserver.observe(root, {
      childList: true,
      subtree: true
    });
  };

  installLegacyWriteGuard();
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      observeRoot,
      { once: true }
    );
  } else {
    observeRoot();
  }

  BF.refreshInventoryUI = render;
  BF.canAccessCampInventory = canAccessCampInventory;
  BF.distanceToCurrentSite = distanceToCurrentSite;
  BF.invalidateInventoryCatalog = () => {
    catalogByInventoryKey = null;
    scheduleRender();
  };
})(window);
