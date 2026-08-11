(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const ACTIVE_SLOT_KEY = "bluefox_active_save_slot_v1";
  const RESTORED_AT_KEY = "bluefox_active_state_restored_at_v1";
  const LAST_SESSION_END_KEY = "bluefox_last_session_end_v1";
  const FILE_BOOTSTRAP_KEY = "bluefox_file_save_bootstrap_v1";
  const FILE_DIAGNOSTICS_KEY = "bluefox_file_save_diagnostics_v1";
  const AUTOSAVE_INTERVAL_MS = 90000;

  const SLOT_KEYS = Object.freeze({
    auto: "bluefox_autosave_slot_v1",
    backup: "bluefox_autosave_backup_v1",
    1: "bluefox_save_slot_1_v1",
    2: "bluefox_save_slot_2_v1"
  });

  const SAVE_UI_CONFIG = Object.freeze({
    version: "save-file-v3",
    targetSelector: ".settings-content",
    rootId: "bluefox-save-game-controls",
    actionClass: "save-game-actions",
    actions: Object.freeze([
      Object.freeze({ id: "save", label: "Sauvegarder" }),
      Object.freeze({ id: "load", label: "Charger" }),
      Object.freeze({ id: "new", label: "Nouvelle partie" })
    ])
  });

  const RESERVED_KEYS = new Set([
    ...Object.values(SLOT_KEYS),
    "bluefox_last_manual_save_v1",
    "bluefox_new_game_start_v1",
    "bluefox_last_start_map_v1",
    "bluefox_save_diagnostics_v1",
    FILE_DIAGNOSTICS_KEY,
    FILE_BOOTSTRAP_KEY,
    ACTIVE_SLOT_KEY,
    RESTORED_AT_KEY,
    LAST_SESSION_END_KEY
  ]);

  const diagnostics = {
    version: SAVE_UI_CONFIG.version,
    sourceOfTruth: "file",
    autosaveIntervalMs: AUTOSAVE_INTERVAL_MS,
    lastAttemptAt: 0,
    lastSuccessAt: 0,
    lastFailureAt: 0,
    lastSlot: null,
    lastBytes: 0,
    lastError: "",
    verified: false,
    fileApiAvailable: false,
    restoredFromFile: false,
    origin: global.location.origin
  };

  let lastFlushAt = 0;
  let startupReady = false;
  let startupPromise = null;
  let newGameResetInProgress = false;

  const keys = () =>
    Array.from({ length: global.localStorage.length }, (_, index) =>
      global.localStorage.key(index)
    ).filter(Boolean);

  const persistRuntime = () => {
    const calls = [
      () => BF.currentEngine?.savePosition?.(),
      () => BF.currentEngine?.saveDiscovery?.(),
      () => BF.currentEngine?.saveZoneDiscovery?.(),
      () => BF.currentEngine?.missionManager?.memory?.save?.(),
      () => BF.progression?.save?.(),
      () => BF.multiProgression?.save?.(),
      () => BF.mapExploration?.save?.(),
      () => BF.survival?.save?.()
    ];
    const errors = [];
    calls.forEach((call) => {
      try {
        call();
      } catch (error) {
        errors.push(error);
      }
    });
    return errors;
  };

  const captureState = () =>
    Object.fromEntries(
      keys()
        .filter((key) => key.startsWith("bluefox_") && !RESERVED_KEYS.has(key))
        .map((key) => [key, global.localStorage.getItem(key)])
    );

  const validSnapshot = (snapshot) =>
    Boolean(
      snapshot &&
      snapshot.format === "bluefox-save-file" &&
      snapshot.schemaVersion === 1 &&
      snapshot.state &&
      typeof snapshot.state === "object" &&
      !Array.isArray(snapshot.state) &&
      Number.isFinite(Number(snapshot.savedAt))
    );

  const buildSnapshot = (slot) => {
    const runtimeErrors = persistRuntime();
    const snapshot = {
      format: "bluefox-save-file",
      schemaVersion: 1,
      gameVersion: global.document
        .querySelector('meta[name="description"]')
        ?.content?.replace(/^BlueFox Odyssey\s*/i, "") || "unknown",
      slot: String(slot),
      savedAt: Date.now(),
      originAtSave: global.location.origin,
      state: captureState()
    };
    return { snapshot, runtimeErrors };
  };

  const readLocalSnapshot = (slot) => {
    try {
      const value = JSON.parse(
        global.localStorage.getItem(SLOT_KEYS[slot]) || "null"
      );
      if (validSnapshot(value)) return value;
      if (value?.version === 1 && value?.state) {
        return {
          format: "bluefox-save-file",
          schemaVersion: 1,
          gameVersion: "legacy",
          slot: String(slot),
          savedAt: Number(value.savedAt) || 0,
          originAtSave: "legacy-localStorage",
          state: value.state
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const writeLocalCache = (slot, snapshot) => {
    const serialized = JSON.stringify(snapshot);
    if (slot === "auto") {
      const previous = global.localStorage.getItem(SLOT_KEYS.auto);
      if (previous) {
        global.localStorage.setItem(SLOT_KEYS.backup, previous);
      }
    }
    global.localStorage.setItem(SLOT_KEYS[slot], serialized);
    global.localStorage.setItem(ACTIVE_SLOT_KEY, String(slot));
    global.localStorage.setItem(RESTORED_AT_KEY, String(snapshot.savedAt));
    global.localStorage.setItem(LAST_SESSION_END_KEY, String(snapshot.savedAt));
  };

  const fileRequest = async (path, options = {}) => {
    const response = await global.fetch(path, {
      cache: "no-store",
      ...options,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `API sauvegarde ${response.status}${detail ? ` : ${detail}` : ""}`
      );
    }
    diagnostics.fileApiAvailable = true;
    return response.status === 204 ? null : response.json();
  };

  const readFileSnapshot = async (slot) => {
    try {
      const snapshot = await fileRequest(
        `/api/saves/${encodeURIComponent(String(slot))}`
      );
      return validSnapshot(snapshot) ? snapshot : null;
    } catch (error) {
      if (/404/.test(error.message)) return null;
      diagnostics.fileApiAvailable = false;
      diagnostics.lastError = error.message;
      return null;
    }
  };

  const applySnapshot = (snapshot, slot) => {
    if (!validSnapshot(snapshot)) {
      throw new Error("Instantané de sauvegarde invalide.");
    }

    // Important : on ne supprime plus toutes les clés actives avant chargement.
    // Cela préserve les paramètres ajoutés par des hotfixs ultérieurs, absents
    // des anciennes sauvegardes.
    Object.entries(snapshot.state).forEach(([key, value]) => {
      if (
        key.startsWith("bluefox_") &&
        !RESERVED_KEYS.has(key) &&
        value != null
      ) {
        global.localStorage.setItem(key, String(value));
      }
    });

    global.localStorage.setItem(ACTIVE_SLOT_KEY, String(slot));
    global.localStorage.setItem(RESTORED_AT_KEY, String(snapshot.savedAt));
  };

  const clearActive = () => {
    keys().forEach((key) => {
      if (key.startsWith("bluefox_") && !RESERVED_KEYS.has(key)) {
        global.localStorage.removeItem(key);
      }
    });
  };

  const writeSnapshot = async (slot = "auto") => {
    diagnostics.lastAttemptAt = Date.now();
    diagnostics.lastSlot = String(slot);
    diagnostics.lastError = "";
    diagnostics.verified = false;

    const { snapshot, runtimeErrors } = buildSnapshot(slot);
    const serialized = JSON.stringify(snapshot);
    diagnostics.lastBytes = serialized.length * 2;

    try {
      writeLocalCache(slot, snapshot);
      const stored = await fileRequest(
        `/api/saves/${encodeURIComponent(String(slot))}`,
        {
          method: "POST",
          body: serialized
        }
      );
      if (!validSnapshot(stored) || stored.savedAt !== snapshot.savedAt) {
        throw new Error("Le fichier relu ne correspond pas à l’écriture.");
      }
      diagnostics.lastSuccessAt = snapshot.savedAt;
      diagnostics.verified = true;
      if (runtimeErrors.length) {
        diagnostics.lastError =
          `${runtimeErrors.length} sous-système(s) n’ont pas pu être forcés.`;
      }
      global.localStorage.setItem(
        FILE_DIAGNOSTICS_KEY,
        JSON.stringify(diagnostics)
      );
      return snapshot;
    } catch (error) {
      diagnostics.lastFailureAt = Date.now();
      diagnostics.lastError = error?.message || String(error);
      diagnostics.verified = false;
      global.localStorage.setItem(
        FILE_DIAGNOSTICS_KEY,
        JSON.stringify(diagnostics)
      );
      return false;
    }
  };

  const createRecoverySnapshot = async () => {
    const { snapshot } = buildSnapshot("recovery");
    try {
      await fileRequest("/api/saves/recovery", {
        method: "POST",
        body: JSON.stringify(snapshot)
      });
      return true;
    } catch {
      return false;
    }
  };

  const restoreSnapshot = async (slot = "auto") => {
    const snapshot =
      (await readFileSnapshot(slot)) ||
      readLocalSnapshot(slot) ||
      (slot === "auto" ? readLocalSnapshot("backup") : null);

    if (!snapshot) return false;

    await createRecoverySnapshot();
    applySnapshot(snapshot, slot);
    writeLocalCache(slot, snapshot);
    BF.newGameResetInProgress = false;
    global.location.reload();
    return true;
  };

  const bootstrapFromFile = async () => {
    if (startupPromise) return startupPromise;
    startupPromise = (async () => {
      const slot = global.localStorage.getItem(ACTIVE_SLOT_KEY) || "auto";
      const fileSnapshot =
        (await readFileSnapshot(slot)) ||
        (slot !== "auto" ? await readFileSnapshot("auto") : null);
      const localSnapshot =
        readLocalSnapshot(slot) ||
        (slot === "auto" ? readLocalSnapshot("backup") : null);
      const restoredAt =
        Number(global.localStorage.getItem(RESTORED_AT_KEY)) || 0;

      if (
        fileSnapshot &&
        fileSnapshot.savedAt > Math.max(
          restoredAt,
          Number(localSnapshot?.savedAt) || 0
        )
      ) {
        applySnapshot(fileSnapshot, slot);
        writeLocalCache(slot, fileSnapshot);
        diagnostics.restoredFromFile = true;
        global.localStorage.setItem(
          FILE_BOOTSTRAP_KEY,
          String(fileSnapshot.savedAt)
        );
        global.location.reload();
        return false;
      }

      startupReady = true;
      return true;
    })();
    return startupPromise;
  };

  const flush = async () => {
    if (!startupReady || newGameResetInProgress) return false;
    const now = Date.now();
    if (now - lastFlushAt < 3000) return false;
    lastFlushAt = now;
    global.localStorage.setItem(LAST_SESSION_END_KEY, String(now));
    return Boolean(await writeSnapshot("auto"));
  };

  BF.saveGame = async (slot = 1) => Boolean(await writeSnapshot(slot));
  BF.createManualSave = async (slot = 1) =>
    Boolean(await writeSnapshot(slot));
  BF.loadGame = async (slot = "auto") => restoreSnapshot(slot);
  BF.getSaveSlots = async () => ({
    auto: (await readFileSnapshot("auto")) || readLocalSnapshot("auto"),
    recovery: await readFileSnapshot("recovery"),
    1: (await readFileSnapshot(1)) || readLocalSnapshot(1),
    2: (await readFileSnapshot(2)) || readLocalSnapshot(2)
  });
  BF.getSaveDiagnostics = () => ({ ...diagnostics });

  const formatDate = (snapshot) =>
    snapshot?.savedAt
      ? new Intl.DateTimeFormat("fr-FR", {
          dateStyle: "short",
          timeStyle: "short"
        }).format(new Date(snapshot.savedAt))
      : "Vide";

  const button = (label, className, onClick) => {
    const node = global.document.createElement("button");
    node.type = "button";
    node.className = className || "";
    node.textContent = label;
    node.addEventListener("click", onClick);
    return node;
  };

  const closePopover = (root) =>
    root.querySelector(".save-game-popover")?.remove();

  const showSaveChoices = async (root) => {
    closePopover(root);
    const popover = global.document.createElement("div");
    popover.className = "save-game-popover";
    const slots = await BF.getSaveSlots();

    [1, 2].forEach((slot) =>
      popover.append(
        button(
          `Emplacement ${slot} · ${formatDate(slots[slot])}`,
          "save-slot-button",
          async () => {
            const saved = await BF.createManualSave(slot);
            root.querySelector(".save-game-status").textContent = saved
              ? `Partie sauvegardée dans le fichier de l’emplacement ${slot}.`
              : `Échec de la sauvegarde dans l’emplacement ${slot}.`;
            closePopover(root);
          }
        )
      )
    );
    root.append(popover);
  };

  const showLoadChoices = async (root) => {
    closePopover(root);
    const popover = global.document.createElement("div");
    popover.className = "save-game-popover";
    const slots = await BF.getSaveSlots();

    [
      ["auto", "Automatique"],
      ["recovery", "Récupération"],
      [1, "Emplacement 1"],
      [2, "Emplacement 2"]
    ].forEach(([slot, label]) => {
      const snapshot = slots[slot];
      const loadButton = button(
        `${label} · ${formatDate(snapshot)}`,
        "load-slot-button",
        () => BF.loadGame(slot)
      );
      loadButton.disabled = !snapshot;
      popover.append(loadButton);
    });
    root.append(popover);
  };

  const resetRuntimeState = () => {
    const errors = [];
    const run = (callback) => {
      try {
        callback();
      } catch (error) {
        errors.push(error);
      }
    };

    // Réinitialise d'abord les sources de vérité encore vivantes en mémoire.
    // Elles ne doivent pas pouvoir réécrire l'ancien inventaire ou les anciennes
    // progressions pendant les événements pagehide/beforeunload du rechargement.
    run(() => BF.progression?.reset?.());
    run(() => BF.multiProgression?.reset?.());
    run(() => BF.mapExploration?.reset?.());
    run(() => BF.survival?.reset?.());

    run(() => {
      const memory = BF.currentEngine?.missionManager?.memory;
      if (!memory) return;
      memory.state = typeof memory.defaultState === "function"
        ? memory.defaultState()
        : {
            version: 3,
            activeMissionId: "",
            primaryMissionId: "",
            activeMissionIds: [],
            missionLifecycle: {},
            pendingActivations: {},
            rewardedMissions: {},
            processedObjectEvents: {},
            effectReceipts: {},
            siteProgression: {},
            missions: {},
            facts: {},
            history: [],
            updatedAt: Date.now()
          };
      memory.save?.();
    });

    run(() => {
      const manager = BF.currentEngine?.missionManager;
      if (!manager) return;
      manager.currentAction = null;
      manager.primaryMissionId = "";
      manager.activeMissionId = "";
      manager.activeMissionIds = [];
      manager.pendingPrimaryMissionId = null;
      manager.pendingPauseMissionId = null;
      manager.trees?.clear?.();
      manager.tree = null;
    });

    return errors;
  };

  const startNewGame = async () => {
    // La récupération doit contenir l'état de la partie qui va être abandonnée.
    await createRecoverySnapshot();

    // Bloque immédiatement toute sauvegarde automatique pendant la purge.
    newGameResetInProgress = true;
    BF.newGameResetInProgress = true;
    startupReady = false;

    try {
      await fileRequest("/api/saves/auto", { method: "DELETE" });
    } catch {
      // La nouvelle partie locale reste possible même si le fichier auto
      // ne peut pas être supprimé.
    }

    resetRuntimeState();
    clearActive();

    // Les sauvegardes manuelles sont volontairement conservées. Seuls les
    // instantanés automatiques et les marqueurs de session active sont retirés.
    global.localStorage.removeItem(SLOT_KEYS.auto);
    global.localStorage.removeItem(SLOT_KEYS.backup);
    global.localStorage.removeItem(ACTIVE_SLOT_KEY);
    global.localStorage.removeItem(RESTORED_AT_KEY);
    global.localStorage.removeItem(LAST_SESSION_END_KEY);
    global.localStorage.removeItem(FILE_BOOTSTRAP_KEY);

    const startedAt = Date.now();
    global.localStorage.setItem("bluefox_new_game_start_v1", String(startedAt));
    global.localStorage.setItem("bluefox_last_start_map_v1", "crystal");
    global.location.reload();
  };

  const showNewGameConfirmation = (root) => {
    closePopover(root);
    const popover = global.document.createElement("div");
    popover.className = "save-game-popover new-game-confirmation";
    const warning = global.document.createElement("p");
    warning.textContent =
      "Réinitialiser la progression active ? Une récupération sera créée et les sauvegardes manuelles seront conservées.";
    popover.append(
      warning,
      button("Annuler", "new-game-cancel-button", () => closePopover(root)),
      button("Confirmer", "new-game-confirm-button", startNewGame)
    );
    root.append(popover);
  };

  const buildSaveControls = () => {
    const root = global.document.createElement("section");
    root.id = SAVE_UI_CONFIG.rootId;
    root.className = "save-game-controls";
    root.dataset.saveUiVersion = SAVE_UI_CONFIG.version;

    const title = global.document.createElement("h3");
    title.textContent = "SAUVEGARDE";

    const status = global.document.createElement("p");
    status.className = "save-game-status";
    status.textContent =
      "Sauvegarde fichier active · auto toutes les 90 s · 5 versions tournantes.";

    const actions = global.document.createElement("div");
    actions.className = SAVE_UI_CONFIG.actionClass;
    actions.append(
      button("Sauvegarder", "save-game-button", () => showSaveChoices(root)),
      button("Charger", "load-game-button", () => showLoadChoices(root)),
      button(
        "Nouvelle partie",
        "new-game-button",
        () => showNewGameConfirmation(root)
      )
    );

    root.append(title, status, actions);
    return root;
  };

  const hasLockedContract = (root) => {
    if (!root || root.dataset.saveUiVersion !== SAVE_UI_CONFIG.version) {
      return false;
    }
    const labels = [
      ...root.querySelectorAll(`.${SAVE_UI_CONFIG.actionClass} > button`)
    ].map((node) => node.textContent.trim());
    return (
      labels.length === SAVE_UI_CONFIG.actions.length &&
      SAVE_UI_CONFIG.actions.every(
        (action, index) => labels[index] === action.label
      )
    );
  };

  const ensureSaveControls = () => {
    const target = global.document.querySelector(
      SAVE_UI_CONFIG.targetSelector
    );
    if (!target) return false;

    let root = global.document.getElementById(SAVE_UI_CONFIG.rootId);
    if (root && root.parentElement !== target) root.remove();
    root = global.document.getElementById(SAVE_UI_CONFIG.rootId);

    if (!hasLockedContract(root)) {
      root?.remove();
      root = buildSaveControls();
      target.append(root);
    }
    return true;
  };

  let mountScheduled = false;
  const scheduleSaveControls = () => {
    if (mountScheduled) return;
    mountScheduled = true;
    const run = () => {
      mountScheduled = false;
      ensureSaveControls();
    };
    (global.requestAnimationFrame || global.setTimeout)(run);
  };

  const saveUiObserver = new MutationObserver(scheduleSaveControls);
  saveUiObserver.observe(global.document.documentElement, {
    childList: true,
    subtree: true
  });

  global.addEventListener(
    "DOMContentLoaded",
    scheduleSaveControls,
    { once: true }
  );
  scheduleSaveControls();

  Object.defineProperty(BF, "saveUiConfig", {
    value: SAVE_UI_CONFIG,
    writable: false,
    configurable: false,
    enumerable: true
  });

  BF.refreshSaveUI = ensureSaveControls;
  BF.getSaveUiDiagnostics = () =>
    Object.freeze({
      version: SAVE_UI_CONFIG.version,
      targetPresent: Boolean(
        global.document.querySelector(SAVE_UI_CONFIG.targetSelector)
      ),
      controlsPresent: hasLockedContract(
        global.document.getElementById(SAVE_UI_CONFIG.rootId)
      ),
      sourceOfTruth: "file",
      autosaveIntervalMs: AUTOSAVE_INTERVAL_MS,
      origin: global.location.origin
    });

  bootstrapFromFile().then((ready) => {
    if (!ready) return;
    global.setTimeout(flush, 15000);
    global.setInterval(flush, AUTOSAVE_INTERVAL_MS);
    global.addEventListener("pagehide", flush);
    global.addEventListener("beforeunload", flush);
    global.document.addEventListener("visibilitychange", () => {
      if (global.document.hidden) flush();
    });
  });
})(window);
