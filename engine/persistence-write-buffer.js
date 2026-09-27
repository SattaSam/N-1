(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "persistence-buffer-v1";
  const WRITE_DELAY_MS = 1200;
  const targets = new Map();

  const registerTarget = (name, instance, Prototype) => {
    if (!instance || !Prototype?.prototype?.save) return false;
    if (targets.has(name)) return true;

    const prototype = Prototype.prototype;
    const originalSave = prototype.save;
    if (originalSave.__bluefoxBufferedOriginal) return true;

    const state = {
      name,
      instance,
      originalSave,
      timer: 0,
      dirty: false,
      writesRequested: 0,
      writesPerformed: 0,
      lastRequestedAt: 0,
      lastFlushedAt: 0,
      lastResult: true
    };

    const flush = function flushBufferedPersistence() {
      const target = targets.get(name);
      if (!target) return false;

      if (target.timer) {
        global.clearTimeout(target.timer);
        target.timer = 0;
      }
      if (!target.dirty) return target.lastResult;

      target.dirty = false;
      target.lastResult = Boolean(
        target.originalSave.call(this || target.instance)
      );
      target.writesPerformed += 1;
      target.lastFlushedAt = Date.now();
      return target.lastResult;
    };

    const schedule = function scheduleBufferedPersistence() {
      const target = targets.get(name);
      if (!target) return false;

      target.dirty = true;
      target.writesRequested += 1;
      target.lastRequestedAt = Date.now();

      if (!target.timer) {
        target.timer = global.setTimeout(() => {
          target.timer = 0;
          flush.call(target.instance);
        }, WRITE_DELAY_MS);
      }

      return true;
    };

    Object.defineProperty(schedule, "__bluefoxBufferedOriginal", {
      value: originalSave
    });

    prototype.save = schedule;
    prototype.flush = flush;
    targets.set(name, state);
    return true;
  };

  const install = () => {
    registerTarget("progression", BF.progression, BF.ProgressionRegistry);
    registerTarget(
      "multiProgression",
      BF.multiProgression,
      BF.ProgressionMultiSystem
    );
    return targets.size;
  };

  const flushAll = (reason = "manual") => {
    install();
    let success = true;

    targets.forEach((target) => {
      const result = target.instance.flush?.();
      if (result === false) success = false;
    });

    global.dispatchEvent(new CustomEvent(
      "bluefox:persistence-flushed",
      {
        detail: {
          reason,
          at: Date.now(),
          success
        }
      }
    ));
    return success;
  };

  const diagnostics = () => Object.freeze({
    version: VERSION,
    delayMs: WRITE_DELAY_MS,
    targets: Object.freeze(
      Object.fromEntries(
        [...targets.entries()].map(([name, state]) => [
          name,
          Object.freeze({
            dirty: state.dirty,
            writesRequested: state.writesRequested,
            writesPerformed: state.writesPerformed,
            lastRequestedAt: state.lastRequestedAt,
            lastFlushedAt: state.lastFlushedAt,
            pending: Boolean(state.timer)
          })
        ])
      )
    )
  });

  install();

  global.addEventListener(
    "bluefox:map-state",
    () => flushAll("map-state"),
    { capture: true }
  );

  global.document.addEventListener(
    "visibilitychange",
    () => {
      if (global.document.hidden) flushAll("document-hidden");
    }
  );

  global.addEventListener(
    "pagehide",
    () => flushAll("pagehide"),
    { capture: true }
  );

  global.addEventListener(
    "beforeunload",
    () => flushAll("beforeunload"),
    { capture: true }
  );

  BF.flushPersistence = flushAll;
  BF.getPersistenceBufferDiagnostics = diagnostics;

  console.info(
    "[BlueFox] Écritures de progression groupées actives.",
    VERSION
  );
})(window);
