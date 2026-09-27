(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const ACTIVE_SLOT_KEY = "bluefox_active_save_slot_v1";
  const RESTORED_AT_KEY = "bluefox_active_state_restored_at_v1";
  const LAST_SESSION_END_KEY = "bluefox_last_session_end_v1";
  const FILE_BOOTSTRAP_KEY = "bluefox_file_save_bootstrap_v1";
  const FILE_DIAGNOSTICS_KEY = "bluefox_file_save_diagnostics_v1";
  const MISSION_MEMORY_KEY = "bluefox_mission_memory_m0_v1";
  const AUTOSAVE_INTERVAL_MS = 90000;
  const INTRO_VIDEO_PATH = "assets/video/bluefox-intro.mp4";

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
    lastSkippedAt: 0,
    lastSlot: null,
    lastBytes: 0,
    lastError: "",
    verified: false,
    fileApiAvailable: false,
    restoredFromFile: false,
    exactRestore: true,
    origin: global.location.origin
  };

  let lastFlushAt = 0;
  let startupReady = false;
  let startupPromise = null;
  let newGameResetInProgress = false;
  let restoreInProgress = false;
  let introInProgress = false;
  let introOverlay = null;
  let firstLaunchGate = null;
  let firstLaunchGateActive = false;
  let firstLaunchPauseTimer = null;
  let runtimePausedForFirstLaunch = false;
  let lastAutoStateSignature = null;

  const keys = () =>
    Array.from({ length: global.localStorage.length }, (_, index) =>
      global.localStorage.key(index)
    ).filter(Boolean);

  const safeSetItem = (key, value) => {
    try {
      global.localStorage.setItem(key, String(value));
      return true;
    } catch {
      return false;
    }
  };

  const persistDiagnostics = () =>
    safeSetItem(FILE_DIAGNOSTICS_KEY, JSON.stringify(diagnostics));

  // Les fichiers sont la source de vérité. Ces clés ne contiennent que des
  // copies complètes de snapshots et sont explicitement exclues du snapshot
  // gameplay. Les retirer rend immédiatement de la place aux propriétaires
  // runtime sans toucher à progression, missions, BAC ou exploration.
  const relieveSnapshotQuota = (slot = null) => {
    const removable = new Set([SLOT_KEYS.auto, SLOT_KEYS.backup]);
    const normalizedSlot = String(slot ?? "");
    if (normalizedSlot === "1" || normalizedSlot === "2") {
      removable.add(SLOT_KEYS[normalizedSlot]);
    }
    removable.forEach((key) => {
      try { global.localStorage.removeItem(key); } catch {}
    });
  };

  const clearActive = () => {
    keys().forEach((key) => {
      if (key.startsWith("bluefox_") && !RESERVED_KEYS.has(key)) {
        global.localStorage.removeItem(key);
      }
    });
  };

  const persistRuntime = () => {
    const calls = [
      () => BF.currentEngine?.savePosition?.(),
      () => BF.currentEngine?.saveDiscovery?.(),
      () => BF.currentEngine?.saveZoneDiscovery?.(),
      () => {
        const memory = BF.currentEngine?.missionManager?.memory;
        if (typeof memory?.flush === "function") return memory.flush(true);
        return memory?.save?.();
      },
      () => BF.progression?.save?.(),
      () => BF.multiProgression?.save?.(),
      () => {
        if (typeof BF.mapExploration?.flush === "function") {
          return BF.mapExploration.flush(true);
        }
        return BF.mapExploration?.save?.();
      },
      () => BF.survival?.save?.()
    ];
    const errors = [];
    calls.forEach((call) => {
      try { call(); } catch (error) { errors.push(error); }
    });
    return errors;
  };

  const captureState = () =>
    Object.fromEntries(
      keys()
        .filter((key) => key.startsWith("bluefox_") && !RESERVED_KEYS.has(key))
        .sort()
        .map((key) => [key, global.localStorage.getItem(key)])
    );

  const stateSignature = (state) => JSON.stringify(state || {});

  const validMissionMemoryState = (state) => {
    try {
      const raw = state?.[MISSION_MEMORY_KEY];
      if (typeof raw !== "string" || !raw.trim()) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed && parsed.version === 3);
    } catch {
      return false;
    }
  };

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

  const restorableSnapshot = (snapshot) =>
    validSnapshot(snapshot) && validMissionMemoryState(snapshot.state);

  const buildSnapshot = (slot) => {
    const runtimeErrors = persistRuntime();
    const state = captureState();
    return {
      snapshot: {
        format: "bluefox-save-file",
        schemaVersion: 1,
        gameVersion: global.document
          .querySelector('meta[name="description"]')
          ?.content?.replace(/^BlueFox Odyssey\s*/i, "") || "unknown",
        slot: String(slot),
        savedAt: Date.now(),
        originAtSave: global.location.origin,
        state
      },
      stateSignature: stateSignature(state),
      runtimeErrors
    };
  };

  const readLocalSnapshot = (slot) => {
    try {
      const cacheKey = SLOT_KEYS[slot];
      if (!cacheKey) return null;
      const value = JSON.parse(global.localStorage.getItem(cacheKey) || "null");
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
    } catch {}
    return null;
  };

  const writeLocalCache = (slot, snapshot) => {
    const cacheKey = SLOT_KEYS[slot];
    if (!cacheKey) return false;
    try {
      const serialized = JSON.stringify(snapshot);
      if (slot === "auto") {
        const previous = global.localStorage.getItem(SLOT_KEYS.auto);
        if (previous) global.localStorage.setItem(SLOT_KEYS.backup, previous);
      }
      global.localStorage.setItem(cacheKey, serialized);
      safeSetItem(LAST_SESSION_END_KEY, String(snapshot.savedAt));
      return true;
    } catch {
      return false;
    }
  };

  const markActiveSnapshot = (slot, snapshot) => {
    safeSetItem(ACTIVE_SLOT_KEY, String(slot));
    safeSetItem(RESTORED_AT_KEY, String(snapshot.savedAt));
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
      throw new Error(`API sauvegarde ${response.status}${detail ? ` : ${detail}` : ""}`);
    }
    diagnostics.fileApiAvailable = true;
    return response.status === 204 ? null : response.json();
  };

  const readFileSnapshot = async (slot) => {
    try {
      const snapshot = await fileRequest(`/api/saves/${encodeURIComponent(String(slot))}`);
      return validSnapshot(snapshot) ? snapshot : null;
    } catch (error) {
      if (/404/.test(error.message)) return null;
      diagnostics.fileApiAvailable = false;
      diagnostics.lastError = error.message;
      return null;
    }
  };

  const applySnapshot = (snapshot, slot) => {
    if (!restorableSnapshot(snapshot)) {
      throw new Error("Instantané de sauvegarde incomplet : mémoire missionnelle absente ou invalide.");
    }

    clearActive();

    Object.entries(snapshot.state).forEach(([key, value]) => {
      if (
        key.startsWith("bluefox_") &&
        !RESERVED_KEYS.has(key) &&
        value != null
      ) {
        global.localStorage.setItem(key, String(value));
      }
    });

    markActiveSnapshot(slot, snapshot);
  };

  const writeSnapshot = async (slot = "auto", options = {}) => {
    diagnostics.lastAttemptAt = Date.now();
    diagnostics.lastSlot = String(slot);
    diagnostics.lastError = "";
    diagnostics.verified = false;

    const force = options.force === true || String(slot) !== "auto";

    // Libérer les snapshots redondants AVANT persistRuntime() : les owners qui
    // viennent d'échouer sur QuotaExceeded peuvent alors écrire leur état
    // courant avant capture.
    relieveSnapshotQuota(slot);

    const {
      snapshot,
      stateSignature: currentSignature,
      runtimeErrors
    } = buildSnapshot(slot);

    if (!validMissionMemoryState(snapshot.state)) {
      diagnostics.lastFailureAt = Date.now();
      diagnostics.lastError =
        "Mémoire missionnelle indisponible : sauvegarde refusée pour éviter un snapshot incomplet.";
      persistDiagnostics();
      return false;
    }

    if (!force && lastAutoStateSignature === currentSignature) {
      diagnostics.lastSkippedAt = Date.now();
      diagnostics.verified = true;
      if (runtimeErrors.length) {
        diagnostics.lastError =
          `${runtimeErrors.length} sous-système(s) n’ont pas pu être forcés.`;
      }
      persistDiagnostics();
      return snapshot;
    }

    const serialized = JSON.stringify(snapshot);
    diagnostics.lastBytes = serialized.length * 2;

    try {
      const stored = await fileRequest(`/api/saves/${encodeURIComponent(String(slot))}`, {
        method: "POST",
        body: serialized
      });
      if (!validSnapshot(stored) || stored.savedAt !== snapshot.savedAt) {
        throw new Error("Le fichier relu ne correspond pas à l’écriture.");
      }

      // Le fichier vérifié est la source de vérité. Ne pas recréer une copie
      // complète locale qui ferait de nouveau pression sur le quota.
      relieveSnapshotQuota(slot);
      safeSetItem(LAST_SESSION_END_KEY, String(snapshot.savedAt));
      diagnostics.lastSuccessAt = snapshot.savedAt;
      diagnostics.verified = true;
      if (String(slot) === "auto") {
        lastAutoStateSignature = currentSignature;
      }
      if (runtimeErrors.length) {
        diagnostics.lastError =
          `${runtimeErrors.length} sous-système(s) n’ont pas pu être forcés.`;
      }
      persistDiagnostics();
      return snapshot;
    } catch (error) {
      // Le cache local reste un secours uniquement si l'écriture fichier échoue.
      // Un QuotaExceeded de ce fallback ne doit jamais s'échapper.
      writeLocalCache(slot, snapshot);
      diagnostics.lastFailureAt = Date.now();
      diagnostics.lastError = error?.message || String(error);
      persistDiagnostics();
      return false;
    }
  };

  const createRecoverySnapshot = async () => {
    const { snapshot } = buildSnapshot("recovery");
    if (!validMissionMemoryState(snapshot.state)) return false;
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
    const candidates = [
      await readFileSnapshot(slot),
      readLocalSnapshot(slot),
      slot === "auto" ? readLocalSnapshot("backup") : null
    ];
    const snapshot = candidates.find((candidate) => restorableSnapshot(candidate)) || null;
    if (!snapshot) {
      diagnostics.lastFailureAt = Date.now();
      diagnostics.lastError =
        "Aucune sauvegarde restaurable avec mémoire missionnelle valide.";
      persistDiagnostics();
      return false;
    }

    await createRecoverySnapshot();
    restoreInProgress = true;
    applySnapshot(snapshot, slot);
    writeLocalCache(slot, snapshot);
    if (String(slot) === "auto") {
      lastAutoStateSignature = stateSignature(snapshot.state);
    }
    BF.newGameResetInProgress = false;
    global.location.reload();
    return true;
  };

  const bootstrapFromFile = async () => {
    if (startupPromise) return startupPromise;
    startupPromise = (async () => {
      const requestedSlot = global.localStorage.getItem(ACTIVE_SLOT_KEY) || "auto";
      const slot = ["auto", "recovery", "1", "2"].includes(String(requestedSlot))
        ? String(requestedSlot)
        : "auto";
      const fileSnapshot = await readFileSnapshot(slot);
      const localSnapshot =
        readLocalSnapshot(slot) ||
        (slot === "auto" ? readLocalSnapshot("backup") : null);
      const restoredAt = Number(global.localStorage.getItem(RESTORED_AT_KEY)) || 0;

      // Une source fichier valide permet de supprimer sans ambiguïté les
      // duplications de snapshots locales avant le démarrage du runtime.
      if (restorableSnapshot(fileSnapshot)) relieveSnapshotQuota(slot);

      if (
        restorableSnapshot(fileSnapshot) &&
        fileSnapshot.savedAt >
          Math.max(restoredAt, Number(localSnapshot?.savedAt) || 0)
      ) {
        applySnapshot(fileSnapshot, slot);
        diagnostics.restoredFromFile = true;
        safeSetItem(FILE_BOOTSTRAP_KEY, String(fileSnapshot.savedAt));
        global.location.reload();
        return false;
      }

      lastAutoStateSignature = stateSignature(captureState());

      startupReady = true;
      return true;
    })();
    return startupPromise;
  };

  const flush = async () => {
    if (
      !startupReady ||
      newGameResetInProgress ||
      restoreInProgress ||
      firstLaunchGateActive
    ) {
      return false;
    }
    const now = Date.now();
    if (now - lastFlushAt < 3000) return false;
    lastFlushAt = now;
    safeSetItem(LAST_SESSION_END_KEY, String(now));
    return Boolean(await writeSnapshot("auto"));
  };

  BF.saveGame = async (slot = 1) =>
    Boolean(await writeSnapshot(slot, { force: true }));
  BF.createManualSave = async (slot = 1) =>
    Boolean(await writeSnapshot(slot, { force: true }));
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
      try { callback(); } catch (error) { errors.push(error); }
    };
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
    await createRecoverySnapshot();
    newGameResetInProgress = true;
    BF.newGameResetInProgress = true;
    startupReady = false;
    lastAutoStateSignature = null;
    try {
      await fileRequest("/api/saves/auto", { method: "DELETE" });
    } catch {}

    resetRuntimeState();
    clearActive();
    BF.resetAutonomyForNewGame?.();

    global.localStorage.removeItem(SLOT_KEYS.auto);
    global.localStorage.removeItem(SLOT_KEYS.backup);
    global.localStorage.removeItem(ACTIVE_SLOT_KEY);
    global.localStorage.removeItem(RESTORED_AT_KEY);
    global.localStorage.removeItem(LAST_SESSION_END_KEY);
    global.localStorage.removeItem(FILE_BOOTSTRAP_KEY);

    const startedAt = Date.now();
    safeSetItem("bluefox_new_game_start_v1", String(startedAt));
    safeSetItem("bluefox_last_start_map_v1", "crystal");
    global.location.reload();
  };

  const removeIntroOverlay = () => {
    introOverlay?.remove();
    introOverlay = null;
    global.document.documentElement.classList.remove("bluefox-intro-open");
  };

  const pauseExistingMedia = (introVideo) => {
    try { BF.music?.stop?.(); } catch {}
    global.document.querySelectorAll("audio, video").forEach((media) => {
      if (media === introVideo) return;
      try { media.pause(); } catch {}
    });
  };

  const playIntroThenStartNewGame = async () => {
    if (introInProgress) return;
    introInProgress = true;

    const overlay = global.document.createElement("div");
    overlay.className = "bluefox-intro-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Introduction de BlueFox Odyssey");

    const video = global.document.createElement("video");
    video.className = "bluefox-intro-video";
    video.src = INTRO_VIDEO_PATH;
    video.preload = "auto";
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;

    let finished = false;
    const finish = async () => {
      if (finished) return;
      finished = true;
      try { video.pause(); } catch {}
      try {
        // Reste noir et gelé jusqu'au rechargement de la partie neuve.
        await startNewGame();
      } catch (error) {
        removeIntroOverlay();
        BF.currentEngine?.setRuntimePaused?.(false, "new-game-intro-error");
        introInProgress = false;
        throw error;
      }
    };

    const skip = button("Passer", "bluefox-intro-skip", finish);

    video.addEventListener("ended", finish, { once: true });
    video.addEventListener("error", finish, { once: true });
    video.addEventListener("abort", finish, { once: true });

    overlay.append(video, skip);
    global.document.body.append(overlay);
    introOverlay = overlay;
    global.document.documentElement.classList.add("bluefox-intro-open");

    BF.currentEngine?.setRuntimePaused?.(true, "new-game-intro");
    pauseExistingMedia(video);

    try {
      const playResult = video.play();
      if (playResult && typeof playResult.catch === "function") {
        await playResult.catch(finish);
      }
    } catch {
      await finish();
    }
  };

  const pauseRuntimeForFirstLaunch = () => {
    const engine = BF.currentEngine;
    if (!engine?.setRuntimePaused) return false;
    engine.setRuntimePaused(true, "first-launch-gate");
    runtimePausedForFirstLaunch = true;
    if (firstLaunchPauseTimer) {
      global.clearInterval(firstLaunchPauseTimer);
      firstLaunchPauseTimer = null;
    }
    return true;
  };

  const removeFirstLaunchGate = ({ resume = true } = {}) => {
    if (firstLaunchPauseTimer) {
      global.clearInterval(firstLaunchPauseTimer);
      firstLaunchPauseTimer = null;
    }
    firstLaunchGate?.remove();
    firstLaunchGate = null;
    firstLaunchGateActive = false;
    global.document.documentElement.classList.remove(
      "bluefox-first-launch-open"
    );
    if (resume && runtimePausedForFirstLaunch) {
      BF.currentEngine?.setRuntimePaused?.(false, "first-launch-gate-cleared");
    }
    runtimePausedForFirstLaunch = false;
  };

  const showFirstLaunchGate = ({ ready = false } = {}) => {
    if (!firstLaunchGate) {
      const overlay = global.document.createElement("div");
      overlay.className = "bluefox-first-launch-overlay";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Démarrer BlueFox Odyssey");
      global.document.body.append(overlay);
      firstLaunchGate = overlay;
    }

    firstLaunchGate.replaceChildren();
    firstLaunchGateActive = true;
    global.document.documentElement.classList.add(
      "bluefox-first-launch-open"
    );

    if (ready) {
      const startButton = button(
        "Nouvelle partie",
        "bluefox-first-launch-button",
        async () => {
          if (introInProgress) return;
          await playIntroThenStartNewGame();
        }
      );
      firstLaunchGate.append(startButton);
      pauseExistingMedia(null);
      if (!pauseRuntimeForFirstLaunch() && !firstLaunchPauseTimer) {
        firstLaunchPauseTimer = global.setInterval(
          pauseRuntimeForFirstLaunch,
          100
        );
      }
    }
    return firstLaunchGate;
  };

  const hasLocalLaunchEvidence = () => Boolean(
    global.localStorage.getItem("bluefox_new_game_start_v1") ||
    readLocalSnapshot("auto") ||
    readLocalSnapshot(1) ||
    readLocalSnapshot(2)
  );

  const resolveFirstLaunch = async () => {
    let slots = null;
    try {
      slots = await BF.getSaveSlots();
    } catch {}
    const hasExistingSave = Boolean(slots?.auto || slots?.[1] || slots?.[2]);
    const hasStartedGame = Boolean(
      global.localStorage.getItem("bluefox_new_game_start_v1")
    );
    return !hasStartedGame && !hasExistingSave;
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
      button("Confirmer", "new-game-confirm-button", playIntroThenStartNewGame)
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
      button("Nouvelle partie", "new-game-button", () => showNewGameConfirmation(root))
    );
    root.append(title, status, actions);
    return root;
  };

  const hasLockedContract = (root) => {
    if (!root || root.dataset.saveUiVersion !== SAVE_UI_CONFIG.version) return false;
    const labels = [
      ...root.querySelectorAll(`.${SAVE_UI_CONFIG.actionClass} > button`)
    ].map((node) => node.textContent.trim());
    return (
      labels.length === SAVE_UI_CONFIG.actions.length &&
      SAVE_UI_CONFIG.actions.every((action, index) => labels[index] === action.label)
    );
  };

  const refreshFirstLaunchState = async (root) => {
    if (!root?.isConnected) return false;
    let slots = null;
    try {
      slots = await BF.getSaveSlots();
    } catch {}

    const hasExistingSave = Boolean(slots?.auto || slots?.[1] || slots?.[2]);
    const hasStartedGame = Boolean(
      global.localStorage.getItem("bluefox_new_game_start_v1")
    );
    const firstLaunch = !hasStartedGame && !hasExistingSave;

    root.classList.toggle("first-launch", firstLaunch);
    root.dataset.firstLaunch = firstLaunch ? "true" : "false";
    return firstLaunch;
  };

  const ensureSaveControls = () => {
    const target = global.document.querySelector(SAVE_UI_CONFIG.targetSelector);
    if (!target) return false;
    let root = global.document.getElementById(SAVE_UI_CONFIG.rootId);
    if (root && root.parentElement !== target) root.remove();
    root = global.document.getElementById(SAVE_UI_CONFIG.rootId);
    if (!hasLockedContract(root)) {
      root?.remove();
      root = buildSaveControls();
      target.append(root);
    }
    refreshFirstLaunchState(root);
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

  const saveUiObserver = new MutationObserver((mutations) => {
    const relevant = mutations.some((mutation) =>
      [...mutation.addedNodes, ...mutation.removedNodes].some((node) =>
        node?.nodeType === 1 &&
        (
          node.matches?.(SAVE_UI_CONFIG.targetSelector) ||
          node.querySelector?.(SAVE_UI_CONFIG.targetSelector)
        )
      )
    );
    if (relevant) scheduleSaveControls();
  });
  saveUiObserver.observe(global.document.documentElement, {
    childList: true,
    subtree: true
  });

  global.addEventListener("DOMContentLoaded", scheduleSaveControls, { once: true });
  scheduleSaveControls();

  Object.defineProperty(BF, "saveUiConfig", {
    value: SAVE_UI_CONFIG,
    writable: false,
    configurable: false,
    enumerable: true
  });

  BF.refreshSaveUI = ensureSaveControls;
  BF.playNewGameIntro = playIntroThenStartNewGame;
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
      exactRestore: true,
      origin: global.location.origin
    });

  if (!hasLocalLaunchEvidence()) {
    // Masque le monde pendant la vérification asynchrone des sauvegardes
    // fichier. Aucun bouton n'est affiché avant que l'absence soit prouvée.
    showFirstLaunchGate({ ready: false });
  }

  bootstrapFromFile().then(async (ready) => {
    if (!ready) return;
    const firstLaunch = await resolveFirstLaunch();
    if (firstLaunch) {
      showFirstLaunchGate({ ready: true });
      return;
    }
    removeFirstLaunchGate();
    global.setTimeout(flush, 15000);
    global.setInterval(flush, AUTOSAVE_INTERVAL_MS);
    global.addEventListener("pagehide", flush);
    global.addEventListener("beforeunload", flush);
    global.document.addEventListener("visibilitychange", () => {
      if (global.document.hidden) flush();
    });
  });
})(window);
