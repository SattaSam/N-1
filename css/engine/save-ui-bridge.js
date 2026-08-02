(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const SAVE_PREFIX = "bluefox_";
  const SLOT_KEYS = Object.freeze({
    auto: "bluefox_autosave_slot_v1",
    backup: "bluefox_autosave_backup_v1",
    1: "bluefox_save_slot_1_v1",
    2: "bluefox_save_slot_2_v1"
  });
  const RESERVED_KEYS = new Set([
    ...Object.values(SLOT_KEYS),
    "bluefox_last_manual_save_v1",
    "bluefox_new_game_start_v1",
    "bluefox_last_start_map_v1",
    "bluefox_save_diagnostics_v1"
  ]);
  const PREFERENCE_KEYS = new Set([
    "bluefox_camera_mode_v1",
    "bluefox_speech_visible_v1",
    "bluefox_auto_deposit_v1",
    "bluefox_mission_collapsed_v1"
  ]);
  const diagnostics = {
    lastAttemptAt: 0,
    lastSuccessAt: 0,
    lastFailureAt: 0,
    lastSlot: null,
    lastBytes: 0,
    lastError: "",
    verified: false
  };

  const storageKeys = () => {
    const keys = [];
    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index);
      if (key) keys.push(key);
    }
    return keys;
  };

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
      try { call(); } catch (error) { errors.push(error); }
    });
    return errors;
  };

  const captureState = () => Object.fromEntries(
    storageKeys()
      .filter((key) => key.startsWith(SAVE_PREFIX) && !RESERVED_KEYS.has(key))
      .map((key) => [key, global.localStorage.getItem(key)])
  );

  const byteLength = (value) => {
    try { return new Blob([value]).size; }
    catch { return String(value).length * 2; }
  };

  const rememberDiagnostics = () => {
    try {
      global.localStorage.setItem(
        "bluefox_save_diagnostics_v1",
        JSON.stringify(diagnostics)
      );
    } catch {
      // Les diagnostics ne doivent jamais faire échouer une sauvegarde.
    }
  };

  const readSnapshot = (slot) => {
    const key = SLOT_KEYS[slot];
    if (!key) return null;
    try {
      const snapshot = JSON.parse(global.localStorage.getItem(key) || "null");
      return snapshot?.version === 1 && snapshot.state ? snapshot : null;
    } catch {
      return null;
    }
  };

  const verifiedWrite = (key, serialized) => {
    global.localStorage.setItem(key, serialized);
    return global.localStorage.getItem(key) === serialized;
  };

  const writeSnapshot = (slot = "auto", options = {}) => {
    const key = SLOT_KEYS[slot];
    if (!key) return false;

    diagnostics.lastAttemptAt = Date.now();
    diagnostics.lastSlot = String(slot);
    diagnostics.verified = false;
    diagnostics.lastError = "";

    const runtimeErrors = options.flush === false ? [] : persistRuntime();
    const savedAt = Date.now();
    const snapshot = {
      version: 1,
      slot: String(slot),
      savedAt,
      state: captureState()
    };
    const serialized = JSON.stringify(snapshot);
    diagnostics.lastBytes = byteLength(serialized);

    try {
      if (slot === "auto") {
        const previous = global.localStorage.getItem(SLOT_KEYS.auto);
        if (previous) {
          try { verifiedWrite(SLOT_KEYS.backup, previous); } catch { /* secours facultatif */ }
        }
      }
      if (!verifiedWrite(key, serialized)) {
        throw new Error("Le navigateur n’a pas confirmé l’écriture du snapshot.");
      }
      const reread = readSnapshot(slot);
      if (!reread || reread.savedAt !== savedAt) {
        throw new Error("Le snapshot sauvegardé ne peut pas être relu correctement.");
      }
      diagnostics.lastSuccessAt = savedAt;
      diagnostics.verified = true;
      if (runtimeErrors.length) {
        diagnostics.lastError =
          `${runtimeErrors.length} sous-système(s) n’ont pas pu être forcés avant la capture.`;
      }
    } catch (error) {
      diagnostics.lastFailureAt = Date.now();
      diagnostics.lastError = error?.message || String(error);
      console.warn(`Sauvegarde ${slot} indisponible.`, error);
      if (slot === "auto") {
        const backup = global.localStorage.getItem(SLOT_KEYS.backup);
        if (backup) {
          try { global.localStorage.setItem(SLOT_KEYS.auto, backup); } catch { /* conserver l’échec */ }
        }
      }
      rememberDiagnostics();
      global.dispatchEvent(new CustomEvent("bluefox:save-failed", {
        detail: { slot: String(slot), bytes: diagnostics.lastBytes, error: diagnostics.lastError }
      }));
      return false;
    }

    if (slot !== "auto" && slot !== "backup") {
      global.localStorage.setItem("bluefox_last_manual_save_v1", String(savedAt));
      global.dispatchEvent(new CustomEvent("bluefox:manual-save", {
        detail: { slot: Number(slot), savedAt }
      }));
    }
    rememberDiagnostics();
    return snapshot;
  };

  const clearActiveGameState = ({ preservePreferences = true } = {}) => {
    storageKeys().forEach((key) => {
      if (!key.startsWith(SAVE_PREFIX) || RESERVED_KEYS.has(key)) return;
      if (preservePreferences && PREFERENCE_KEYS.has(key)) return;
      global.localStorage.removeItem(key);
    });
  };

  const restoreSnapshot = (slot = "auto") => {
    const snapshot = readSnapshot(slot) || (slot === "auto" ? readSnapshot("backup") : null);
    if (!snapshot) return false;
    clearActiveGameState({ preservePreferences: false });
    Object.entries(snapshot.state).forEach(([key, value]) => {
      if (!key.startsWith(SAVE_PREFIX) || RESERVED_KEYS.has(key) || value == null) return;
      global.localStorage.setItem(key, String(value));
    });
    global.dispatchEvent(new CustomEvent("bluefox:save-loaded", {
      detail: { slot: String(slot), savedAt: snapshot.savedAt }
    }));
    global.location.reload();
    return true;
  };

  const startMapCandidates = () => Object.keys(BF.maps || {}).filter((mapId) =>
    (BF.maps[mapId]?.terrainUrl || BF.maps[mapId]?.terrainUrls?.length) &&
    Math.max(1, Number(BF.maps[mapId]?.plateauCount) ||
      Number(BF.maps[mapId]?.terrainUrls?.length) || 1) === 1
  );

  const selectNewStartMap = () => {
    const candidates = startMapCandidates();
    if (!candidates.length) return "crystal";
    let previous = global.localStorage.getItem("bluefox_last_start_map_v1") || "";
    try {
      const position = JSON.parse(global.localStorage.getItem("bluefox_world_position_v2") || "null");
      previous = position?.map || previous;
    } catch { /* conserver la valeur précédente */ }
    const alternatives = candidates.filter((mapId) => mapId !== previous);
    const pool = alternatives.length ? alternatives : candidates;
    return pool[Math.floor(Math.random() * pool.length)] || "crystal";
  };

  const startNewGame = () => {
    const startMap = selectNewStartMap();
    clearActiveGameState({ preservePreferences: true });
    global.localStorage.setItem("bluefox_odyssey_save_v1", JSON.stringify({
      resources: { crystal: 0, fiber: 0, parts: 0 },
      energy: 82,
      actions: [{ text: "Début d’une nouvelle exploration.", at: "JOUR 01" }],
      knowledge: 0,
      relations: 0,
      saveVersion: 3,
      newGame: true,
      startedAt: Date.now()
    }));
    global.localStorage.setItem("bluefox_last_seen", String(Date.now()));
    global.localStorage.setItem("bluefox_new_game_start_v1", startMap);
    global.localStorage.setItem("bluefox_last_start_map_v1", startMap);
    global.dispatchEvent(new CustomEvent("bluefox:new-game", { detail: { startMap } }));
    global.location.reload();
    return startMap;
  };

  const formatSlot = (slot, fallback) => {
    const snapshot = readSnapshot(slot);
    return snapshot ? `${fallback} · ${new Date(snapshot.savedAt).toLocaleString("fr-FR")}` : fallback;
  };

  const createButton = (text, className = "") => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    return button;
  };

  const showChoices = (section, mode, status) => {
    section.querySelector(".save-game-popover")?.remove();
    const popover = document.createElement("div");
    popover.className = "save-game-popover";
    if (mode === "save") {
      [1, 2].forEach((slot) => {
        const button = createButton(formatSlot(slot, `Sauvegarde ${slot}`));
        button.addEventListener("click", () => {
          const snapshot = writeSnapshot(slot);
          status.textContent = snapshot
            ? `Partie enregistrée et vérifiée dans la sauvegarde ${slot} (${Math.ceil(diagnostics.lastBytes / 1024)} Ko).`
            : `Échec de la sauvegarde : ${diagnostics.lastError || "stockage indisponible"}.`;
          if (snapshot) popover.remove();
        });
        popover.appendChild(button);
      });
    } else {
      [["auto", "Reprendre la partie en cours"], [1, "Sauvegarde 1"], [2, "Sauvegarde 2"]]
        .forEach(([slot, label]) => {
          const button = createButton(formatSlot(slot, label));
          button.disabled = !readSnapshot(slot) && !(slot === "auto" && readSnapshot("backup"));
          button.addEventListener("click", () => restoreSnapshot(slot));
          popover.appendChild(button);
        });
    }
    section.appendChild(popover);
  };

  const showNewGameConfirmation = (section) => {
    section.querySelector(".save-game-popover")?.remove();
    const confirmation = document.createElement("div");
    confirmation.className = "save-game-popover new-game-confirmation";
    const warning = document.createElement("p");
    warning.textContent = "La progression active sera remise à zéro. Les sauvegardes restent disponibles.";
    const cancel = createButton("Annuler");
    cancel.addEventListener("click", () => confirmation.remove());
    const confirm = createButton("Confirmer", "new-game-confirm-button");
    confirm.addEventListener("click", startNewGame);
    confirmation.append(warning, cancel, confirm);
    section.appendChild(confirmation);
  };

  const ensureControls = () => {
    const settings = document.querySelector(".settings-content");
    if (!settings || settings.querySelector(".save-game-controls")) return false;
    const section = document.createElement("section");
    section.className = "save-game-controls";
    const title = document.createElement("h3");
    title.textContent = "PARTIE";
    const status = document.createElement("p");
    status.textContent = readSnapshot("auto")
      ? "Sauvegarde automatique disponible."
      : "La sauvegarde automatique démarre avec cette partie.";
    const actions = document.createElement("div");
    actions.className = "save-game-actions";
    const save = createButton("Sauvegarder");
    const load = createButton("Charger une partie");
    const fresh = createButton("Nouvelle partie", "new-game-button");
    save.addEventListener("click", () => showChoices(section, "save", status));
    load.addEventListener("click", () => showChoices(section, "load", status));
    fresh.addEventListener("click", () => showNewGameConfirmation(section));
    actions.append(save, load, fresh);
    section.append(title, status, actions);
    settings.appendChild(section);
    return true;
  };

  const observer = new MutationObserver(ensureControls);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  global.addEventListener("DOMContentLoaded", ensureControls, { once: true });

  const scheduleAutoSave = () => {
    const save = () => writeSnapshot("auto");
    if (typeof global.requestIdleCallback === "function") {
      global.requestIdleCallback(save, { timeout: 4000 });
    } else {
      global.setTimeout(save, 750);
    }
  };
  global.addEventListener("pagehide", () => writeSnapshot("auto"));
  global.setTimeout(scheduleAutoSave, 5000);
  global.setInterval(scheduleAutoSave, 30000);

  BF.saveGame = (slot = 1) => Boolean(writeSnapshot(slot));
  BF.createManualSave = (slot = 1) => Boolean(writeSnapshot(slot));
  BF.loadGame = (slot = "auto") => restoreSnapshot(slot);
  BF.startNewGame = startNewGame;
  BF.getSaveSlots = () => ({
    auto: readSnapshot("auto"),
    backup: readSnapshot("backup"),
    1: readSnapshot(1),
    2: readSnapshot(2)
  });
  BF.getSaveDiagnostics = () => ({ ...diagnostics });
})(window);
