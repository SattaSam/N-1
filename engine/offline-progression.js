(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const LAST_SESSION_END_KEY = "bluefox_last_session_end_v1";
  const LAST_RECONCILIATION_KEY =
    "bluefox_last_offline_reconciliation_v1";
  const MANUAL_RESTORE_KEY = "bluefox_manual_restore_exact_v1";
  const STARTUP_MODE_KEY = "bluefox_save_startup_mode_v1";
  const MIN_OFFLINE_MS = 2 * 60 * 1000;
  const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
  const MAX_ACTIONS = 100;
  const ACTION_INTERVAL_MS = 5 * 60 * 1000;

  const readJson = (key, fallback = {}) => {
    try {
      return JSON.parse(
        global.localStorage.getItem(key) || "null"
      ) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const mapId = () =>
    readJson("bluefox_world_position_v2", {}).map || "crystal";

  const resources = () => {
    const progression =
      BF.progression?.snapshot?.() ||
      readJson("bluefox_progression_registry_v1", {});
    return [...new Set([
      ...Object.keys(progression.inventory || {}),
      ...Object.keys(progression.campStorage || {}),
      "crystal",
      "fiber",
      "parts"
    ])];
  };

  const logSummary = (text) => {
    const save = readJson("bluefox_odyssey_save_v1", {});
    save.actions = Array.isArray(save.actions)
      ? save.actions
      : [];
    save.actions.unshift({ text, at: "REPRISE" });
    save.actions = save.actions.slice(0, 50);
    global.localStorage.setItem(
      "bluefox_odyssey_save_v1",
      JSON.stringify(save)
    );
  };

  const observe = (index, currentMap) =>
    BF.progression?.consume?.({
      id: `offline-observe-${Date.now()}-${index}`,
      type:
        BF.ObjectEvents?.types?.OBJECT_SEEN ||
        "object_seen",
      quantity: 1,
      mapId: currentMap,
      objectId: `offline-observation-${index % 12}`,
      instanceId:
        `offline-${currentMap}-observation-${index}`,
      progression: { mapExpertise: 1 },
      detail: { offline: true },
      at: Date.now()
    });

  const collect = (index, currentMap, list) => {
    const key = list[index % list.length] || "crystal";
    BF.progression?.consume?.({
      id: `offline-collect-${Date.now()}-${index}`,
      type:
        BF.ObjectEvents?.types?.RESOURCE_COLLECTED ||
        "resource_collected",
      quantity: 1,
      family: key,
      inventoryKey: key,
      mapId: currentMap,
      objectId: `offline-resource-${key}`,
      instanceId: `offline-${currentMap}-${key}-${index}`,
      detail: {
        offline: true,
        inventoryKey: key,
        kind: key
      },
      at: Date.now()
    });
    return key;
  };

  const skipExactManualRestore = () => {
    const marker = readJson(MANUAL_RESTORE_KEY, null);
    if (!marker?.savedAt) return null;

    const now = Date.now();
    global.localStorage.removeItem(MANUAL_RESTORE_KEY);
    global.localStorage.setItem(STARTUP_MODE_KEY, "manual-exact");
    global.localStorage.setItem(
      LAST_RECONCILIATION_KEY,
      String(now)
    );
    global.localStorage.setItem(
      LAST_SESSION_END_KEY,
      String(now)
    );

    const result = {
      applied: false,
      skipped: true,
      reason: "manual-save-restored-exactly",
      slot: marker.slot,
      savedAt: marker.savedAt
    };
    global.dispatchEvent(new CustomEvent(
      "bluefox:offline-progress",
      { detail: result }
    ));
    return result;
  };

  const run = () => {
    const exactRestore = skipExactManualRestore();
    if (exactRestore) return exactRestore;

    const now = Date.now();
    const start = Math.max(
      Number(
        global.localStorage.getItem(LAST_SESSION_END_KEY)
      ) || 0,
      Number(
        global.localStorage.getItem(
          LAST_RECONCILIATION_KEY
        )
      ) || 0
    );
    const elapsed = now - start;

    if (!start || elapsed < MIN_OFFLINE_MS) {
      global.localStorage.setItem(
        LAST_RECONCILIATION_KEY,
        String(now)
      );
      return {
        applied: false,
        reason: !start
          ? "no-previous-session"
          : "absence-too-short"
      };
    }

    const effective = Math.min(elapsed, MAX_OFFLINE_MS);
    const count = Math.min(
      MAX_ACTIONS,
      Math.max(
        1,
        Math.floor(effective / ACTION_INTERVAL_MS)
      )
    );
    const currentMap = mapId();
    const list = resources();
    let observations = 0;
    let collections = 0;

    for (let index = 0; index < count; index += 1) {
      if (Math.random() < 0.32) {
        collect(index, currentMap, list);
        collections += 1;
      } else {
        observe(index, currentMap);
        observations += 1;
      }
    }

    if (BF.survival?.state) {
      const hours = effective / 3600000;
      const survival = BF.survival.state;
      survival.rest = Math.min(
        100,
        Number(survival.rest || 0) + hours * 3
      );
      survival.food = Math.max(
        0,
        Number(survival.food || 0) -
          count * 0.12
      );
      BF.survival.save?.();
    }

    const minutes = Math.round(effective / 60000);
    const duration =
      minutes >= 60
        ? `${Math.floor(minutes / 60)} h ${String(
            minutes % 60
          ).padStart(2, "0")}`
        : `${minutes} min`;

    logSummary(
      `Pendant votre absence de ${duration}, ` +
      `BlueFox a poursuivi ses activités locales : ` +
      `${observations} observation` +
      `${observations > 1 ? "s" : ""} et ` +
      `${collections} collecte` +
      `${collections > 1 ? "s" : ""}.`
    );

    global.localStorage.setItem(
      LAST_RECONCILIATION_KEY,
      String(now)
    );
    global.localStorage.setItem(
      LAST_SESSION_END_KEY,
      String(now)
    );

    BF.flushPersistence?.("offline-progression");

    const result = {
      applied: true,
      actionCount: count,
      observations,
      collections,
      durationMs: effective,
      mapId: currentMap,
      mode: "auto-resume"
    };
    global.dispatchEvent(new CustomEvent(
      "bluefox:offline-progress",
      { detail: result }
    ));
    return result;
  };

  const boot = () => {
    if (
      !BF.fileSaveBootstrapReady ||
      !BF.progression ||
      !BF.survival
    ) {
      return global.setTimeout(boot, 100);
    }
    BF.offlineProgressionResult = run();
  };

  BF.runOfflineProgression = run;
  boot();
})(window);
