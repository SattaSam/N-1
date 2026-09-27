(function(global){
"use strict";

const BF = global.BlueFox3D = global.BlueFox3D || {};
const KEY = "bluefox_odyssey_save_v1";
const BUDGET = 225;
const TRAIT_STORAGE_KEY = "bluefox_player_traits_v1";
const DEFAULT_TRAIT_PAIRS = Object.freeze({
  "curieux|prudent": 72,
  "courageux|craintif": 58,
  "empathique|indifferent": 71,
  "respectueux|destructeur": 88
});

const AUTONOMY_MODE_KEY = "bluefox_autonomy_mode_v1";
const AUTONOMY_UNLOCK_KEY = "bluefox_autonomy_unlock_v1";
const NEW_GAME_KEY = "bluefox_new_game_start_v1";
const AUTONOMY_MODES = Object.freeze(["off", "semi", "full"]);
const AUTONOMY_LABELS = Object.freeze({
  off: "OFF",
  semi: "SEMI",
  full: "FULL"
});

const AX = {
  exploration: "exploration",
  collecte: "collection",
  collection: "collection",
  recherche: "research",
  relations: "relations",
  relation: "relations",
  repos: "survival",
  survie: "survival",
  "repos / survie": "survival",
  "repos/survie": "survival"
};

const traitStorageName = (value) =>
  norm(value) === "opportuniste" ? "destructeur" : norm(value);
const traitDisplayName = (value) =>
  norm(value) === "destructeur" ? "Opportuniste" : String(value || "");
const traitPairKey = (left, right) =>
  `${traitStorageName(left)}|${traitStorageName(right)}`;

const PAIR_TIP = {
  "curieux|prudent":
    "Curieux : Observe spontanément ce qui l'entoure. ↑ Exploration, observation et recherche.\n" +
    "Prudent : Limite les prises de risque. ↑ Sécurité, survie et retour à la base.",
  "courageux|craintif":
    "Courageux : Affronte plus facilement l'inconnu. ↑ Exploration des zones dangereuses.\n" +
    "Craintif : Évite les situations menaçantes. ↑ Préférence pour les zones sûres.",
  "empathique|indifferent":
    "Empathique : S'intéresse aux êtres vivants. ↑ Relations, faune et PNJ.\n" +
    "Indifférent : Reste focalisé sur ses objectifs. ↑ Ignore plus souvent les interactions sociales.",
  "respectueux|destructeur":
    "Respectueux : S'arrête plus volontiers à l'interaction utile et tient compte de ses conséquences.\n" +
    "Opportuniste : Saisit plus volontiers une occasion locale utile, rare ou avantageuse."
};

let lock = false;
let lastAxis = null;
let autonomyUiOpen = false;
let autonomyGateTimer = 0;
let settingsObserver = null;
let observedSettings = null;
let scheduled = false;
let scheduledAxis = null;

const norm = (value) =>
  String(value || "")
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const axisFor = (value) => AX[norm(value)] || null;
const split = (value) =>
  String(value || "")
    .split(/\s+[—–-]\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

function readTraitPairs() {
  let saved = {};
  try {
    const parsed = JSON.parse(global.localStorage.getItem(TRAIT_STORAGE_KEY) || "null");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) saved = parsed;
  } catch {}
  return Object.fromEntries(
    Object.entries(DEFAULT_TRAIT_PAIRS).map(([key, fallback]) => [
      key,
      Object.prototype.hasOwnProperty.call(saved, key) ? clamp(saved[key]) : fallback
    ])
  );
}

function writeTraitPair(left, right, leftValue) {
  const key = traitPairKey(left, right);
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_TRAIT_PAIRS, key)) return false;
  const next = readTraitPairs();
  next[key] = clamp(leftValue);
  global.localStorage.setItem(TRAIT_STORAGE_KEY, JSON.stringify(next));
  return true;
}

function readTraitProfile() {
  const pairs = readTraitPairs();
  const profile = {};
  Object.entries(pairs).forEach(([key, left]) => {
    const [leftName, rightName] = key.split("|");
    profile[leftName] = left;
    profile[rightName] = 100 - left;
    if (rightName === "destructeur") profile.opportuniste = 100 - left;
  });
  return Object.freeze(profile);
}

/* -------------------------------------------------------------------------- */
/* Priorités / traits BAC existants — comportement conservé                   */
/* -------------------------------------------------------------------------- */

function sanitizePriorities(src, preferred) {
  if (!src || typeof src !== "object" || Array.isArray(src)) return src;
  const priorities = { ...src };
  delete priorities.Construction;
  delete priorities.construction;

  const entries = Object.keys(priorities)
    .map((key) => ({ key, axis: axisFor(key), value: clamp(priorities[key]) }))
    .filter((item) => item.axis);

  entries.forEach((item) => {
    priorities[item.key] = item.value;
  });

  let overflow = entries.reduce((sum, item) => sum + item.value, 0) - BUDGET;
  if (overflow <= 0) return priorities;

  for (
    const item of entries
      .filter((entry) => entry.axis !== preferred)
      .sort((left, right) => right.value - left.value)
  ) {
    if (overflow <= 0) break;
    const delta = Math.min(item.value, overflow);
    item.value -= delta;
    priorities[item.key] = item.value;
    overflow -= delta;
  }

  if (overflow > 0) {
    const item =
      entries.find((entry) => entry.axis === preferred) ||
      entries.sort((left, right) => right.value - left.value)[0];
    if (item) {
      const delta = Math.min(item.value, overflow);
      item.value -= delta;
      priorities[item.key] = item.value;
    }
  }
  return priorities;
}

function guard() {
  const proto = global.Storage?.prototype;
  if (!proto || proto.setItem.__bacFinal) return;
  const original = proto.setItem;
  const guarded = function(key, value) {
    if (key === KEY) {
      try {
        const save = JSON.parse(String(value));
        if (save && typeof save === "object" && save.priorities) {
          save.priorities = sanitizePriorities(save.priorities, lastAxis);
          value = JSON.stringify(save);
        }
      } catch {}
    }
    return original.call(this, key, value);
  };
  guarded.__bacFinal = true;
  proto.setItem = guarded;
}

function updateTrait(row) {
  const input = row.querySelector('input[type="range"]');
  const output = row.querySelector("b");
  const label = row.querySelector("span");
  const names =
    row.dataset.traitLeft && row.dataset.traitRight
      ? [row.dataset.traitLeft, row.dataset.traitRight]
      : split(label?.textContent).map(traitDisplayName);

  if (!input || !output || names.length !== 2) return;
  row.dataset.traitLeft = traitDisplayName(names[0]);
  row.dataset.traitRight = traitDisplayName(names[1]);

  const left = clamp(input.value);
  const right = 100 - left;
  row.classList.add("trait-bipolar-row");
  label.classList.add("trait-pole", "trait-pole-left");
  output.classList.add("trait-balance-value", "trait-pole", "trait-pole-right");
  label.textContent = `${names[0]} ${left} %`;
  output.textContent = `${names[1]} ${right} %`;
  input.setAttribute(
    "aria-valuetext",
    `${names[0]} ${left} %, ${names[1]} ${right} %`
  );
}

function tooltips(row) {
  row.removeAttribute("title");
  row.querySelectorAll("[title]").forEach((element) => element.removeAttribute("title"));
  row.querySelectorAll(".bac-trait-info").forEach((element) => element.remove());

  const left = row.dataset.traitLeft;
  const right = row.dataset.traitRight;
  const text = PAIR_TIP[traitPairKey(left, right)] || "";

  if (text) {
    row.dataset.tooltip = text;
    row.classList.add("bac-trait-tooltip-row");
    row.setAttribute("aria-label", text.replace(/\n/g, " "));
  } else {
    delete row.dataset.tooltip;
    row.classList.remove("bac-trait-tooltip-row");
    row.removeAttribute("aria-label");
  }
}

function entries(settings) {
  return [...settings.querySelectorAll(".slider-row")]
    .filter((row) => !row.classList.contains("trait-row"))
    .map((row) => {
      const label = row.querySelector("span");
      const input = row.querySelector('input[type="range"]');
      const output = row.querySelector("b");
      const raw =
        row.dataset.priorityLabel ||
        label?.textContent?.replace(/\s+\d+\s*%.*$/, "").trim() ||
        "";
      row.dataset.priorityLabel = raw;
      return { row, input, output, axis: axisFor(raw) };
    })
    .filter((item) => item.axis && item.input);
}

const total = (items) =>
  items.reduce((sum, item) => sum + clamp(item.input.value), 0);

function indicator(settings, items) {
  let indicatorNode = settings.querySelector(".bac-priority-budget");
  if (!indicatorNode) {
    indicatorNode = document.createElement("div");
    indicatorNode.className = "bac-priority-budget";
    const first = items[0]?.row;
    first?.parentElement
      ? first.parentElement.insertBefore(indicatorNode, first)
      : settings.prepend(indicatorNode);
  }

  const used = total(items);
  const available = BUDGET - used;
  indicatorNode.classList.toggle("is-valid", available === 0);
  indicatorNode.classList.toggle("is-invalid", available !== 0);
  indicatorNode.textContent =
    available === 0
      ? `Priorités : ${used}/${BUDGET} points répartis`
      : available > 0
        ? `Priorités : ${used}/${BUDGET} · ${available} point${available > 1 ? "s" : ""} disponible${available > 1 ? "s" : ""}`
        : `Priorités : ${used}/${BUDGET} · dépassement de ${Math.abs(available)} point${Math.abs(available) > 1 ? "s" : ""}`;
}

function publish(item) {
  item.input.dispatchEvent(new Event("input", { bubbles: true }));
  item.input.dispatchEvent(new Event("change", { bubbles: true }));
}

function enforce(settings, axis = null) {
  if (lock) return;
  const items = entries(settings);
  if (items.length !== 5) return;

  let overflow = total(items) - BUDGET;
  if (overflow <= 0) {
    indicator(settings, items);
    return;
  }

  lock = true;
  try {
    const changed = items.find((item) => item.axis === axis);
    let candidates = items
      .filter((item) => item !== changed)
      .sort((left, right) => clamp(right.input.value) - clamp(left.input.value));
    const modified = new Set();

    while (overflow > 0) {
      const adjustable = candidates.filter((item) => clamp(item.input.value) > 0);
      if (!adjustable.length) break;
      const share = Math.max(1, Math.ceil(overflow / adjustable.length));
      let reduced = 0;

      for (const item of adjustable) {
        if (reduced >= overflow) break;
        const current = clamp(item.input.value);
        const delta = Math.min(current, share, overflow - reduced);
        if (!delta) continue;
        item.input.value = String(current - delta);
        if (item.output) item.output.textContent = `${current - delta}%`;
        modified.add(item);
        reduced += delta;
      }

      if (!reduced) break;
      overflow -= reduced;
      candidates = adjustable;
    }

    if (overflow > 0 && changed) {
      const current = clamp(changed.input.value);
      changed.input.value = String(current - overflow);
      if (changed.output) changed.output.textContent = `${current - overflow}%`;
      modified.add(changed);
    }

    modified.forEach(publish);
    indicator(settings, entries(settings));
  } finally {
    lock = false;
  }
}

function scheduleEnforce(settings, axis = null) {
  scheduledAxis = axis || scheduledAxis;
  if (settings.dataset.bacEnforceScheduled === "1") return;
  settings.dataset.bacEnforceScheduled = "1";
  requestAnimationFrame(() => {
    settings.dataset.bacEnforceScheduled = "0";
    const nextAxis = scheduledAxis;
    scheduledAxis = null;
    if (settings.isConnected) enforce(settings, nextAxis);
  });
}

function connect(settings) {
  const items = entries(settings);
  if (items.length !== 5) return;

  items.forEach((item) => {
    if (item.input.dataset.bacPriorityConnected === "final") return;
    item.input.dataset.bacPriorityConnected = "final";
    const run = () => {
      if (lock) return;
      lastAxis = item.axis;
      scheduleEnforce(settings, item.axis);
    };
    item.input.addEventListener("input", run);
    item.input.addEventListener("change", run);
  });

  indicator(settings, items);
  scheduleEnforce(settings, null);
}

/* -------------------------------------------------------------------------- */
/* Autonomie OFF / SEMI / FULL                                                */
/* -------------------------------------------------------------------------- */

function isFreshNewGame() {
  const startedAt = Number(global.localStorage.getItem(NEW_GAME_KEY)) || 0;
  return startedAt > 0 && Date.now() - startedAt < 120000;
}

function readAutonomyUnlocks() {
  try {
    const parsed = JSON.parse(global.localStorage.getItem(AUTONOMY_UNLOCK_KEY) || "null");
    if (parsed && typeof parsed === "object") {
      return {
        semi: parsed.semi === true,
        full: parsed.full === true
      };
    }
  } catch {}

  return isFreshNewGame()
    ? { semi: false, full: false }
    : { semi: true, full: true };
}

function writeAutonomyUnlocks(unlocks) {
  global.localStorage.setItem(
    AUTONOMY_UNLOCK_KEY,
    JSON.stringify({
      semi: unlocks.semi === true,
      full: unlocks.full === true
    })
  );
}

function readAutonomyMode() {
  const stored = String(global.localStorage.getItem(AUTONOMY_MODE_KEY) || "").toLowerCase();
  if (AUTONOMY_MODES.includes(stored)) return stored;

  const mode = isFreshNewGame()
    ? "off"
    : global.localStorage.getItem(NEW_GAME_KEY)
      ? "full"
      : "off";

  global.localStorage.setItem(AUTONOMY_MODE_KEY, mode);
  return mode;
}

function autonomyAvailability(mode) {
  if (mode === "off") return true;
  const unlocks = readAutonomyUnlocks();
  if (mode === "semi") return unlocks.semi;
  if (mode === "full") return unlocks.full;
  return false;
}

function publishAutonomyState(source = "system") {
  const mode = readAutonomyMode();
  const unlocks = readAutonomyUnlocks();
  global.dispatchEvent(
    new CustomEvent("bluefox:autonomy-mode", {
      detail: {
        mode,
        source,
        available: {
          off: true,
          semi: unlocks.semi,
          full: unlocks.full
        }
      }
    })
  );
}

function cancelPlannedAutonomousAction() {
  const engine = BF.currentEngine;
  const manager = engine?.missionManager;
  if (!engine || !manager?.currentAction) return;
  manager.cancelCurrentAction?.("autonomy-mode-off");
}

function setAutonomyMode(mode, options = {}) {
  const normalized = String(mode || "").toLowerCase();
  const source = options.source || "user";

  if (!AUTONOMY_MODES.includes(normalized)) return false;
  if (source === "user" && !autonomyAvailability(normalized)) return false;

  const previous = readAutonomyMode();
  if (previous === normalized) {
    publishAutonomyState(source);
    refreshAutonomyUI();
    return true;
  }

  global.localStorage.setItem(AUTONOMY_MODE_KEY, normalized);

  if (normalized === "off") {
    cancelPlannedAutonomousAction();
  }

  publishAutonomyState(source);
  refreshAutonomyUI();
  return true;
}

function unlockAutonomyMode(mode) {
  const normalized = String(mode || "").toLowerCase();
  if (!["semi", "full"].includes(normalized)) return false;

  const unlocks = readAutonomyUnlocks();
  if (normalized === "semi") unlocks.semi = true;
  if (normalized === "full") {
    unlocks.semi = true;
    unlocks.full = true;
  }
  writeAutonomyUnlocks(unlocks);
  publishAutonomyState("tutorial");
  refreshAutonomyUI();
  return true;
}

function resetAutonomyForNewGame() {
  global.localStorage.setItem(AUTONOMY_MODE_KEY, "off");
  writeAutonomyUnlocks({ semi: false, full: false });
  publishAutonomyState("new-game");
  refreshAutonomyUI();
  return true;
}

function installAutonomyGate() {
  const engine = BF.currentEngine;
  if (!engine) return false;

  engine.applyAutonomyMode?.(
    readAutonomyMode(),
    "settings-sync"
  );

  if (!engine.__bluefoxAutonomyGateInstalled) {
    Object.defineProperty(engine, "__bluefoxAutonomyGateInstalled", {
      value: true,
      configurable: true
    });
  }

  const manager = engine.missionManager;
  if (manager && !manager.__bluefoxAutonomyGateInstalled) {
    Object.defineProperty(manager, "__bluefoxAutonomyGateInstalled", {
      value: true,
      configurable: true
    });
  }

  return true;
}

function findPriorityHeading(settings, firstPriorityRow) {
  if (!settings || !firstPriorityRow) return null;

  const candidates = [
    ...settings.querySelectorAll("h1,h2,h3,h4,h5,h6,.section-title,.settings-section-title,strong")
  ];

  const explicit = candidates.find((node) => norm(node.textContent) === "priorites");
  if (explicit) return explicit;

  const parent = firstPriorityRow.parentElement;
  if (!parent) return null;
  const children = [...parent.children];
  const index = children.indexOf(firstPriorityRow);

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const node = children[cursor];
    const text = norm(node.textContent);
    if (!text) continue;
    if (text === "priorites" || text.startsWith("priorites ")) return node;
    if (node.matches?.(".slider-row")) break;
  }
  return null;
}

function createAutonomyHeader(settings) {
  const priorityItems = entries(settings);
  const firstPriorityRow = priorityItems[0]?.row;
  if (!firstPriorityRow) return null;

  let header = settings.querySelector(".bluefox-autonomy-header");
  if (header) return header;

  const existingHeading = findPriorityHeading(settings, firstPriorityRow);
  header = document.createElement("div");
  header.className = "bluefox-autonomy-header";

  const left = document.createElement("div");
  left.className = "bluefox-autonomy-priorities";

  if (existingHeading && !existingHeading.closest(".bluefox-autonomy-header")) {
    existingHeading.parentElement.insertBefore(header, existingHeading);
    left.append(existingHeading);
  } else {
    const title = document.createElement("span");
    title.className = "bluefox-autonomy-fallback-title";
    title.textContent = "Priorités";
    left.append(title);
    firstPriorityRow.parentElement.insertBefore(header, firstPriorityRow);
  }

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "bluefox-autonomy-trigger";
  trigger.setAttribute("aria-expanded", autonomyUiOpen ? "true" : "false");
  trigger.innerHTML =
    '<span>Autonomie</span><b class="bluefox-autonomy-current" aria-hidden="true"></b>';
  trigger.addEventListener("click", () => {
    autonomyUiOpen = !autonomyUiOpen;
    refreshAutonomyUI();
  });

  header.append(left, trigger);

  const panel = document.createElement("div");
  panel.className = "bluefox-autonomy-panel";
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "Niveau d’autonomie de BlueFox");

  AUTONOMY_MODES.forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bluefox-autonomy-mode";
    button.dataset.mode = mode;
    button.textContent = AUTONOMY_LABELS[mode];
    button.addEventListener("click", () => {
      setAutonomyMode(mode, { source: "user" });
    });
    panel.append(button);
  });

  header.insertAdjacentElement("afterend", panel);
  return header;
}

function refreshAutonomyUI() {
  installAutonomyGate();

  const settings = document.querySelector(".settings-content");
  if (!settings) return false;

  const header = createAutonomyHeader(settings);
  if (!header) return false;

  const mode = readAutonomyMode();
  const unlocks = readAutonomyUnlocks();
  const panel = header.nextElementSibling?.classList.contains("bluefox-autonomy-panel")
    ? header.nextElementSibling
    : settings.querySelector(".bluefox-autonomy-panel");
  const trigger = header.querySelector(".bluefox-autonomy-trigger");
  const current = header.querySelector(".bluefox-autonomy-current");

  trigger?.setAttribute("aria-expanded", autonomyUiOpen ? "true" : "false");
  if (current) current.textContent = AUTONOMY_LABELS[mode];

  panel?.classList.toggle("is-open", autonomyUiOpen);
  panel?.querySelectorAll(".bluefox-autonomy-mode").forEach((button) => {
    const buttonMode = button.dataset.mode;
    const available =
      buttonMode === "off" ||
      (buttonMode === "semi" ? unlocks.semi : unlocks.full);
    const active = buttonMode === mode;

    button.disabled = !available;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.title = available
      ? `Passer l’autonomie en ${AUTONOMY_LABELS[buttonMode]}`
      : "Ce niveau sera déverrouillé par le tutoriel.";
  });

  return true;
}

BF.getAutonomyMode = readAutonomyMode;
BF.setAutonomyMode = setAutonomyMode;
BF.getAutonomyAvailability = () => ({
  off: true,
  ...readAutonomyUnlocks()
});
BF.unlockAutonomyMode = unlockAutonomyMode;
BF.resetAutonomyForNewGame = resetAutonomyForNewGame;
BF.refreshAutonomyUI = refreshAutonomyUI;

/* -------------------------------------------------------------------------- */
/* Montage Réglages                                                           */
/* -------------------------------------------------------------------------- */

function enhance() {
  const settings = document.querySelector(".settings-content");
  if (!settings) {
    installAutonomyGate();
    return false;
  }

  settings.querySelectorAll(".slider-row").forEach((row) => {
    const raw = row.querySelector("span")?.textContent || "";
    if (norm(raw.replace(/\s+\d+\s*%.*$/, "")).toLowerCase() === "construction") {
      row.remove();
      return;
    }

    if (!row.classList.contains("trait-row")) return;

    const input = row.querySelector('input[type="range"]');
    const rawNames = split(row.querySelector("span")?.textContent || "");
    if (input && rawNames.length === 2 && input.dataset.bluefoxTraitRestored !== "1") {
      const key = traitPairKey(rawNames[0], rawNames[1]);
      if (global.localStorage.getItem(TRAIT_STORAGE_KEY)) {
        const stored = readTraitPairs();
        if (Object.prototype.hasOwnProperty.call(stored, key)) input.value = String(stored[key]);
      }
      input.dataset.bluefoxTraitRestored = "1";
    }

    updateTrait(row);
    tooltips(row);

    if (input && input.dataset.bluefoxBalanceConnected !== "final") {
      input.dataset.bluefoxBalanceConnected = "final";
      const run = () => {
        writeTraitPair(row.dataset.traitLeft, row.dataset.traitRight, input.value);
        updateTrait(row);
        tooltips(row);
      };
      input.addEventListener("input", run);
      input.addEventListener("change", run);
    }
  });

  connect(settings);
  installAutonomyGate();
  refreshAutonomyUI();
  return true;
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    enhance();
  });
}

function observeSettings() {
  const settings = document.querySelector(".settings-content");
  if (settings === observedSettings) return Boolean(settings);

  settingsObserver?.disconnect();
  settingsObserver = null;
  observedSettings = settings || null;

  if (!settings) return false;

  settingsObserver = new MutationObserver(schedule);
  settingsObserver.observe(settings, {
    childList: true,
    subtree: true
  });
  schedule();
  return true;
}

guard();

/*
 * Filet de sécurité global : il ne déclenche pas enhance() sur chaque mutation.
 * Il vérifie seulement si le conteneur Réglages est apparu ou a été remplacé.
 */
const settingsMountObserver = new MutationObserver(() => {
  observeSettings();
});
settingsMountObserver.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true
});

global.addEventListener("DOMContentLoaded", () => {
  observeSettings();
  schedule();
}, { once: true });
global.addEventListener("bluefox:autonomy-mode", refreshAutonomyUI);

BF.getPlayerTraitProfile = readTraitProfile;
BF.refreshSettingsUI = enhance;

let gateAttempts = 0;
autonomyGateTimer = global.setInterval(() => {
  gateAttempts += 1;
  const done = installAutonomyGate();
  if (done || gateAttempts >= 80) {
    global.clearInterval(autonomyGateTimer);
    autonomyGateTimer = 0;
    refreshAutonomyUI();
  }
}, 250);

observeSettings();
schedule();

})(window);
