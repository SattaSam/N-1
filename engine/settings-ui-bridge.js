(function (global) {
  "use strict";

  const LEGACY_STORAGE_KEY = "bluefox_odyssey_save_v1";
  const CONSTRUCTION_LABEL = "construction";

  const removeLegacyConstructionPriority = (value) => {
    try {
      const save = JSON.parse(String(value));
      if (!save || typeof save !== "object" || Array.isArray(save)) return value;
      if (!save.priorities || typeof save.priorities !== "object") return value;
      const priorities = { ...save.priorities };
      delete priorities.Construction;
      return JSON.stringify({ ...save, priorities });
    } catch {
      return value;
    }
  };

  const installSaveGuard = () => {
    const prototype = global.Storage?.prototype;
    if (!prototype || prototype.setItem.__bluefoxSettingsGuard) return;
    const originalSetItem = prototype.setItem;
    const guardedSetItem = function guardedSetItem(key, value) {
      return originalSetItem.call(
        this,
        key,
        key === LEGACY_STORAGE_KEY
          ? removeLegacyConstructionPriority(value)
          : value
      );
    };
    guardedSetItem.__bluefoxSettingsGuard = true;
    prototype.setItem = guardedSetItem;
  };

  const splitTrait = (label) => String(label || "")
    .split(/\s+[—–-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const updateTraitBalance = (row) => {
    const input = row.querySelector('input[type="range"]');
    const output = row.querySelector("b");
    const names = splitTrait(row.querySelector("span")?.textContent);
    if (!input || !output || names.length !== 2) return false;
    const left = Math.max(0, Math.min(100, Number(input.value) || 0));
    const right = 100 - left;
    output.classList.add("trait-balance-value");
    const text = `${names[0]} ${left} % / ${names[1]} ${right} %`;
    const ariaText = `${names[0]} ${left} %, ${names[1]} ${right} %`;
    if (output.textContent !== text) output.textContent = text;
    if (input.getAttribute("aria-valuetext") !== ariaText) {
      input.setAttribute("aria-valuetext", ariaText);
    }
    return true;
  };

  const enhanceSettings = () => {
    const settings = document.querySelector(".settings-content");
    if (!settings) return false;
    settings.querySelectorAll(".slider-row").forEach((row) => {
      const label = row.querySelector("span")?.textContent?.trim().toLowerCase();
      if (label === CONSTRUCTION_LABEL) {
        row.remove();
        return;
      }
      if (!row.classList.contains("trait-row")) return;
      updateTraitBalance(row);
      const input = row.querySelector('input[type="range"]');
      if (input && !input.dataset.bluefoxBalanceConnected) {
        input.dataset.bluefoxBalanceConnected = "true";
        input.addEventListener("input", () => updateTraitBalance(row));
        input.addEventListener("change", () => updateTraitBalance(row));
      }
    });
    return true;
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      enhanceSettings();
    });
  };

  installSaveGuard();
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  global.addEventListener("DOMContentLoaded", schedule, { once: true });
  global.BlueFox3D = global.BlueFox3D || {};
  global.BlueFox3D.refreshSettingsUI = enhanceSettings;
})(window);
