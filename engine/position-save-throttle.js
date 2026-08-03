(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "position-save-v1";
  const MOVING_INTERVAL_MS = 15000;
  const MIN_POSITION_DELTA = 0.04;

  if (typeof BF.mount !== "function" || BF.mount.__bluefoxPositionThrottle) {
    return;
  }

  const originalMount = BF.mount;

  const patchEngine = (engine) => {
    if (!engine?.savePosition || engine.savePosition.__bluefoxThrottled) {
      return engine;
    }

    const originalSavePosition = engine.savePosition.bind(engine);
    let lastWriteAt = 0;
    let lastMapId = "";
    let lastX = NaN;
    let lastZ = NaN;
    let wasMoving = false;
    let requested = 0;
    let performed = 0;
    let skipped = 0;

    const currentState = () => {
      const position = engine.character?.root?.position;
      return {
        mapId: String(engine.currentMapId || ""),
        x: Number(position?.x) || 0,
        z: Number(position?.z) || 0,
        moving: Number(engine.character?.speed || 0) > 0.08
      };
    };

    const hasChanged = (state) =>
      state.mapId !== lastMapId ||
      !Number.isFinite(lastX) ||
      Math.hypot(state.x - lastX, state.z - lastZ) >= MIN_POSITION_DELTA;

    const write = (state) => {
      const result = originalSavePosition();
      lastWriteAt = performance.now();
      lastMapId = state.mapId;
      lastX = state.x;
      lastZ = state.z;
      wasMoving = state.moving;
      performed += 1;
      return result;
    };

    const throttled = function savePositionThrottled(force = false) {
      requested += 1;
      const state = currentState();
      const now = performance.now();
      const mapChanged = state.mapId !== lastMapId;
      const justStopped = wasMoving && !state.moving;
      const dueWhileMoving =
        state.moving &&
        now - lastWriteAt >= MOVING_INTERVAL_MS;
      const firstWrite = !lastWriteAt;

      if (
        force ||
        firstWrite ||
        mapChanged ||
        justStopped ||
        (dueWhileMoving && hasChanged(state))
      ) {
        return write(state);
      }

      wasMoving = state.moving;
      skipped += 1;
      return true;
    };

    throttled.__bluefoxThrottled = true;
    throttled.flush = () => throttled(true);
    throttled.diagnostics = () => Object.freeze({
      version: VERSION,
      intervalMs: MOVING_INTERVAL_MS,
      requested,
      performed,
      skipped,
      lastWriteAt,
      lastMapId,
      lastPosition: { x: lastX, z: lastZ }
    });

    engine.savePosition = throttled;
    BF.getPositionSaveDiagnostics = throttled.diagnostics;
    return engine;
  };

  const wrappedMount = async function mountWithPositionThrottle(options) {
    const engine = await originalMount.call(this, options);
    return patchEngine(engine);
  };

  wrappedMount.__bluefoxPositionThrottle = true;
  wrappedMount.__bluefoxOriginal = originalMount;
  BF.mount = wrappedMount;

  console.info(
    "[BlueFox] Sauvegarde de position optimisée active.",
    VERSION
  );
})(window);
