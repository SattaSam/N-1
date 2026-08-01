(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const SAVE_PREFIX = "bluefox_";

  const forceSave = () => {
    BF.currentEngine?.savePosition?.();
    BF.currentEngine?.saveDiscovery?.();
    BF.currentEngine?.saveZoneDiscovery?.();
    BF.currentEngine?.missionManager?.memory?.save?.();
    BF.currentEngine?.missionManager?.trees?.forEach?.((tree) =>
      BF.currentEngine.missionManager.memory.saveTree(tree)
    );
    BF.progression?.save?.();
    BF.multiProgression?.save?.();
    global.localStorage.setItem("bluefox_last_manual_save_v1", String(Date.now()));
    global.dispatchEvent(new CustomEvent("bluefox:manual-save", {
      detail: { savedAt: Date.now() }
    }));
    return true;
  };

  const clearGameState = () => {
    const keys = [];
    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index);
      if (key?.startsWith(SAVE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => global.localStorage.removeItem(key));
    global.location.reload();
  };

  const ensureControls = () => {
    const settings = document.querySelector(".settings-content");
    if (!settings || settings.querySelector(".save-game-controls")) return false;
    const section = document.createElement("section");
    section.className = "save-game-controls";
    const title = document.createElement("h3");
    title.textContent = "PARTIE";
    const status = document.createElement("p");
    status.textContent = "La partie est sauvegardée automatiquement.";
    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Sauvegarder maintenant";
    save.addEventListener("click", () => {
      forceSave();
      status.textContent = `Sauvegarde effectuée à ${new Date().toLocaleTimeString("fr-FR")}.`;
    });
    const fresh = document.createElement("button");
    fresh.type = "button";
    fresh.className = "new-game-button";
    fresh.textContent = "Nouvelle partie";
    fresh.addEventListener("click", () => {
      section.querySelector(".new-game-confirmation")?.remove();
      const confirmation = document.createElement("div");
      confirmation.className = "new-game-confirmation";
      const warning = document.createElement("p");
      warning.textContent = "Cette action effacera la progression locale actuelle.";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Annuler";
      cancel.addEventListener("click", () => confirmation.remove());
      const confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = "new-game-confirm-button";
      confirm.textContent = "Confirmer la nouvelle partie";
      confirm.addEventListener("click", clearGameState);
      confirmation.append(warning, cancel, confirm);
      section.appendChild(confirmation);
    });
    section.append(title, status, save, fresh);
    settings.appendChild(section);
    return true;
  };

  const observer = new MutationObserver(ensureControls);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  global.addEventListener("DOMContentLoaded", ensureControls, { once: true });
  BF.saveGame = forceSave;
  BF.startNewGame = clearGameState;
})(window);
