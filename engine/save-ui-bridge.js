(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const SAVE_PREFIX = "bluefox_";
  const SLOT_KEYS = Object.freeze({
    auto: "bluefox_autosave_slot_v1",
    1: "bluefox_save_slot_1_v1",
    2: "bluefox_save_slot_2_v1"
  });
  const RESERVED_KEYS = new Set([
    ...Object.values(SLOT_KEYS),
    "bluefox_last_manual_save_v1",
    "bluefox_new_game_start_v1",
    "bluefox_last_start_map_v1"
  ]);
  const PREFERENCE_KEYS = new Set([
    "bluefox_camera_mode_v1",
    "bluefox_speech_visible_v1",
    "bluefox_auto_deposit_v1",
    "bluefox_mission_collapsed_v1"
  ]);

  const storageKeys = () => {
    const keys = [];
    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index);
      if (key) keys.push(key);
    }
    return keys;
  };

  const persistRuntime = () => {
    BF.currentEngine?.savePosition?.();
    BF.currentEngine?.saveDiscovery?.();
    BF.currentEngine?.saveZoneDiscovery?.();
    BF.currentEngine?.missionManager?.memory?.save?.();
    BF.progression?.save?.();
    BF.multiProgression?.save?.();
    BF.mapExploration?.save?.();
    BF.survival?.save?.();
  };

  const captureState = () => Object.fromEntries(
    storageKeys()
      .filter((key) => key.startsWith(SAVE_PREFIX) && !RESERVED_KEYS.has(key))
      .map((key) => [key, global.localStorage.getItem(key)])
  );

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

  const writeSnapshot = (slot = "auto", options = {}) => {
    const key = SLOT_KEYS[slot];
    if (!key) return false;
    if (options.flush !== false && slot !== "auto") persistRuntime();
    const savedAt = Date.now();
    const snapshot = { version: 1, slot: String(slot), savedAt, state: captureState() };
    try {
      global.localStorage.setItem(key, JSON.stringify(snapshot));
    } catch (error) {
      console.warn(`Sauvegarde ${slot} indisponible : espace local insuffisant.`, error);
      return false;
    }
    if (slot !== "auto") {
      global.localStorage.setItem("bluefox_last_manual_save_v1", String(savedAt));
      global.dispatchEvent(new CustomEvent("bluefox:manual-save", {
        detail: { slot: Number(slot), savedAt }
      }));
    }
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
    const snapshot = readSnapshot(slot);
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
    BF.maps[mapId]?.terrainUrl || BF.maps[mapId]?.terrainUrls?.length
  );

  const selectNewStartMap = () => {
    const candidates = startMapCandidates();
    if (!candidates.length) return "crystal";
    let previous = global.localStorage.getItem("bluefox_last_start_map_v1") || "";
    try {
      const position = JSON.parse(global.localStorage.getItem("bluefox_world_position_v2") || "null");
      previous = position?.map || previous;
    } catch {
      // Le dernier identifiant valide reste utilisable.
    }
    const alternatives = candidates.filter((mapId) => mapId !== previous);
    const pool = alternatives.length ? alternatives : candidates;
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex] || pool[0] || "crystal";
  };

  const startNewGame = () => {
    const startMap = selectNewStartMap();
    clearActiveGameState({ preservePreferences: true });
    global.localStorage.setItem("bluefox_new_game_start_v1", startMap);
    global.localStorage.setItem("bluefox_last_start_map_v1", startMap);
    global.dispatchEvent(new CustomEvent("bluefox:new-game", { detail: { startMap } }));
    global.location.reload();
    return startMap;
  };

  const formatSlot = (slot, fallback) => {
    const snapshot = readSnapshot(slot);
    if (!snapshot) return fallback;
    return `${fallback} · ${new Date(snapshot.savedAt).toLocaleString("fr-FR")}`;
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
          status.textContent = `Partie enregistrée dans la sauvegarde ${slot}.`;
          popover.remove();
          return snapshot;
        });
        popover.appendChild(button);
      });
    } else {
      [["auto", "Reprendre la partie en cours"], [1, "Sauvegarde 1"], [2, "Sauvegarde 2"]]
        .forEach(([slot, label]) => {
          const button = createButton(formatSlot(slot, label));
          button.disabled = !readSnapshot(slot);
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
    warning.textContent = "La progression, les missions, les compteurs et le journal actifs seront remis à zéro. Les sauvegardes restent disponibles.";
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
    const save = () => writeSnapshot("auto", { flush: false });
    if (typeof global.requestIdleCallback === "function") {
      global.requestIdleCallback(save, { timeout: 4000 });
    } else {
      global.setTimeout(save, 750);
    }
  };
  global.addEventListener("pagehide", () => writeSnapshot("auto", { flush: false }));
  global.setInterval(scheduleAutoSave, 60000);

  BF.saveGame = (slot = 1) => Boolean(writeSnapshot(slot));
  BF.createManualSave = (slot = 1) => Boolean(writeSnapshot(slot));
  BF.loadGame = (slot = "auto") => restoreSnapshot(slot);
  BF.startNewGame = startNewGame;
  BF.getSaveSlots = () => ({
    auto: readSnapshot("auto"),
    1: readSnapshot(1),
    2: readSnapshot(2)
  });
})(window);
