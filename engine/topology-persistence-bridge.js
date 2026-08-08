(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "topology-persistence-v3.1";
  const TOPOLOGY_KEY = "bluefox_world_topology_v2";
  const GENERATED_MAPS_KEY = "bluefox_generated_maps_v1";
  const ENGINE_DISCOVERY_KEY = "bluefox_engine_discovered_maps_v2";
  const POSITION_KEY = "bluefox_position_v1";
  const CHECK_INTERVAL_MS = 15000;

  const diagnostics = {
    version: VERSION,
    installedAt: Date.now(),
    lastReconcileAt: 0,
    lastValidationAt: 0,
    lastSaveGuardAt: 0,
    lastReason: "",
    valid: false,
    errors: [],
    warnings: []
  };

  const readJson = (key, fallback) => {
    try {
      const value = JSON.parse(global.localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch {
      return fallback;
    }
  };

  const topologySnapshot = () => BF.WorldTopology?.snapshot?.() || null;

  const validate = () => {
    const errors = [];
    const warnings = [];
    const snapshot = topologySnapshot();
    const coordinates = snapshot?.coordinates || {};
    const occupied = new Map();

    if (!snapshot) {
      errors.push("WorldTopology indisponible.");
    }

    const crystal = coordinates.crystal;
    if (!crystal || Number(crystal.x) !== 0 || Number(crystal.y) !== 0) {
      errors.push("Crystal doit être enregistrée en (0,0).");
    }

    Object.entries(coordinates).forEach(([mapId, point]) => {
      if (!BF.maps?.[mapId]) {
        errors.push(`Coordonnée orpheline : ${mapId}.`);
        return;
      }
      if (!Number.isFinite(Number(point?.x)) || !Number.isFinite(Number(point?.y))) {
        errors.push(`Coordonnée invalide : ${mapId}.`);
        return;
      }
      const key = `${Math.trunc(Number(point.x))},${Math.trunc(Number(point.y))}`;
      const previous = occupied.get(key);
      if (previous && previous !== mapId) {
        errors.push(`Collision ${key} : ${previous} / ${mapId}.`);
      } else {
        occupied.set(key, mapId);
      }
    });

    const generated = readJson(GENERATED_MAPS_KEY, []);
    if (Array.isArray(generated)) {
      generated.forEach((map) => {
        if (map?.id && !coordinates[map.id]) {
          warnings.push(`Map générée sans coordonnée canonique : ${map.id}.`);
        }
      });
    }

    const discovered = readJson(ENGINE_DISCOVERY_KEY, []);
    if (Array.isArray(discovered)) {
      discovered.forEach((mapId) => {
        if (mapId && BF.maps?.[mapId] && !coordinates[mapId]) {
          warnings.push(`Map découverte sans coordonnée : ${mapId}.`);
        }
      });
    }

    const position = readJson(POSITION_KEY, null);
    if (position?.mapId && BF.maps?.[position.mapId] && !coordinates[position.mapId]) {
      errors.push(`Map de reprise sans coordonnée : ${position.mapId}.`);
    }

    diagnostics.lastValidationAt = Date.now();
    diagnostics.valid = errors.length === 0;
    diagnostics.errors = errors;
    diagnostics.warnings = warnings;
    return Object.freeze({
      valid: diagnostics.valid,
      errors: Object.freeze([...errors]),
      warnings: Object.freeze([...warnings]),
      coordinates
    });
  };

  const reconcile = (reason = "runtime") => {
    if (!BF.WorldTopology?.reconcile) return validate();
    try {
      BF.WorldTopology.reconcile();
      diagnostics.lastReconcileAt = Date.now();
      diagnostics.lastReason = reason;
    } catch (error) {
      diagnostics.errors = [error?.message || String(error)];
      diagnostics.valid = false;
    }
    return validate();
  };

  const ensureStored = (reason) => {
    const result = reconcile(reason);
    const stored = readJson(TOPOLOGY_KEY, null);
    if (!stored?.coordinates || typeof stored.coordinates !== "object") {
      diagnostics.valid = false;
      diagnostics.errors = [
        ...diagnostics.errors,
        "La topologie canonique n'a pas été écrite dans localStorage."
      ];
    }
    return result;
  };

  const wrapSave = (name) => {
    const original = BF[name];
    if (typeof original !== "function" || original.__topologyPersistenceWrapped) return;

    const wrapped = async function topologySafeSave(...args) {
      diagnostics.lastSaveGuardAt = Date.now();
      ensureStored(`before-${name}`);
      return original.apply(this, args);
    };
    Object.defineProperty(wrapped, "__topologyPersistenceWrapped", {
      value: true
    });
    BF[name] = wrapped;
  };

  const installSaveGuards = () => {
    wrapSave("saveGame");
    wrapSave("createManualSave");
  };

  const validateCurrentMap = () => {
    const currentId = BF.currentEngine?.currentMapId;
    if (!currentId) return validate();
    const point = BF.WorldTopology?.coordinateOf?.(currentId);
    if (!point) {
      console.error(
        "[BlueFox] Topology Persistence V3.1 : map courante sans coordonnée canonique.",
        currentId
      );
    }
    return reconcile("current-map-check");
  };

  const start = () => {
    installSaveGuards();
    validateCurrentMap();

    [
      "bluefox:map-transition-completed",
      "bluefox:discovery-changed",
      "bluefox:map-state"
    ].forEach((eventName) => {
      global.addEventListener(eventName, () => reconcile(eventName));
    });

    global.setInterval(() => {
      installSaveGuards();
      ensureStored("periodic-integrity-check");
    }, CHECK_INTERVAL_MS);

    global.addEventListener("pagehide", () => {
      ensureStored("pagehide");
    }, { capture: true });

    global.addEventListener("beforeunload", () => {
      ensureStored("beforeunload");
    }, { capture: true });

    global.document.addEventListener("visibilitychange", () => {
      if (global.document.hidden) ensureStored("visibility-hidden");
    }, { capture: true });

    BF.TopologyPersistence = Object.freeze({
      version: VERSION,
      reconcile: (reason = "manual") => reconcile(reason),
      validate,
      diagnostics: () => Object.freeze({
        ...diagnostics,
        errors: Object.freeze([...diagnostics.errors]),
        warnings: Object.freeze([...diagnostics.warnings])
      })
    });

    console.info(
      "[BlueFox] Topology Persistence V3.1 actif : coordonnées validées et verrouillées avant sauvegarde.",
      validate()
    );
  };

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(window);
