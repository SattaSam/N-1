(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "P2.6-r2-adaptive";
  const records = new WeakMap();

  const profiles = Object.freeze({
    passive: Object.freeze({ near: 1 / 60, medium: 1 / 30, far: 1 / 12, distant: 1 / 4 }),
    npc: Object.freeze({ near: 1 / 60, medium: 1 / 30, far: 1 / 15, distant: 1 / 6 }),
    fauna: Object.freeze({ near: 1 / 60, medium: 1 / 30, far: 1 / 12, distant: 1 / 5 }),
    flora: Object.freeze({ near: 1 / 45, medium: 1 / 24, far: 1 / 10, distant: 1 / 3 }),
    phenomenon: Object.freeze({ near: 1 / 60, medium: 1 / 30, far: 1 / 15, distant: 1 / 6 })
  });

  const quotas = Object.freeze({
    high: Object.freeze({ passive: 22, npc: 8, fauna: 12, flora: 18, phenomenon: 8 }),
    balanced: Object.freeze({ passive: 14, npc: 6, fauna: 8, flora: 12, phenomenon: 6 }),
    low: Object.freeze({ passive: 8, npc: 4, fauna: 5, flora: 7, phenomenon: 4 }),
    critical: Object.freeze({ passive: 4, npc: 3, fauna: 3, flora: 4, phenomenon: 2 })
  });

  const frameState = {
    id: -1,
    counts: Object.create(null),
    tier: "high",
    fps: 60
  };

  let sequence = 0;

  const playerRoot = () =>
    BF.currentEngine?.character?.root ||
    BF.currentEngine?.characterController?.root ||
    BF.characterController?.root ||
    null;

  const distance = (root) => {
    const player = playerRoot();
    if (!player || !root?.position) return 0;
    const dx = Number(player.position.x || 0) - Number(root.position.x || 0);
    const dz = Number(player.position.z || 0) - Number(root.position.z || 0);
    return Math.sqrt(dx * dx + dz * dz);
  };

  const performanceTier = () => {
    const engine = BF.currentEngine;
    const fps = Number(engine?.measuredFps);
    const quality = engine?.performanceQuality;

    frameState.fps = Number.isFinite(fps) ? fps : 60;

    if (quality === "low" || frameState.fps < 28) return "critical";
    if (frameState.fps < 40) return "low";
    if (quality === "balanced" || frameState.fps < 55) return "balanced";
    return "high";
  };

  const intervalMultiplier = (tier, distanceBand) => {
    const base = {
      high: 1,
      balanced: 1.25,
      low: 1.75,
      critical: 2.5
    }[tier] || 1;

    if (distanceBand === "distant") {
      return base * (
        tier === "critical" ? 2.4 :
        tier === "low" ? 1.8 :
        tier === "balanced" ? 1.35 :
        1
      );
    }

    if (distanceBand === "far") {
      return base * (
        tier === "critical" ? 1.65 :
        tier === "low" ? 1.3 :
        1
      );
    }

    return base;
  };

  const intervalData = (category, root) => {
    const profile = profiles[category] || profiles.passive;
    const d = distance(root);
    let band;
    let interval;

    if (d <= 12) {
      band = "near";
      interval = profile.near;
    } else if (d <= 28) {
      band = "medium";
      interval = profile.medium;
    } else if (d <= 55) {
      band = "far";
      interval = profile.far;
    } else {
      band = "distant";
      interval = profile.distant;
    }

    const tier = performanceTier();
    return {
      distance: d,
      band,
      tier,
      interval: interval * intervalMultiplier(tier, band)
    };
  };

  const resetFrameBudget = () => {
    const id = Math.floor(
      (global.performance?.now?.() || Date.now()) / (1000 / 60)
    );
    if (id === frameState.id) return;
    frameState.id = id;
    frameState.counts = Object.create(null);
    frameState.tier = performanceTier();
  };

  const hasQuota = (category, record) => {
    resetFrameBudget();
    const normalizedCategory = profiles[category] ? category : "passive";
    const limit =
      quotas[frameState.tier]?.[normalizedCategory] ??
      quotas.high.passive;
    const used = frameState.counts[normalizedCategory] || 0;

    if (used < limit) {
      frameState.counts[normalizedCategory] = used + 1;
      record.deferred = 0;
      return true;
    }

    record.deferred += 1;

    if (record.deferred >= 8) {
      record.deferred = 0;
      return true;
    }

    return false;
  };

  const shouldUpdate = (root, category = "passive", elapsed = 0) => {
    if (
      global.document?.hidden ||
      !root?.parent ||
      root.visible === false
    ) {
      return false;
    }

    const data = intervalData(category, root);
    let record = records.get(root);

    if (!record) {
      record = {
        id: ++sequence,
        last: elapsed - data.interval * Math.random(),
        interval: data.interval,
        band: data.band,
        tier: data.tier,
        deferred: 0
      };
      records.set(root, record);
    }

    record.interval = data.interval;
    record.band = data.band;
    record.tier = data.tier;

    if (elapsed - record.last < data.interval) {
      return false;
    }

    if (!hasQuota(category, record)) {
      return false;
    }

    record.last = elapsed;
    return true;
  };

  const snapshot = () => Object.freeze({
    version: VERSION,
    tier: frameState.tier,
    measuredFps: frameState.fps,
    frameId: frameState.id,
    frameCounts: Object.freeze({ ...frameState.counts }),
    quotas: quotas[frameState.tier]
  });

  BF.RuntimeBudget = Object.freeze({
    version: VERSION,
    shouldUpdate,
    distance,
    getInterval(root, category = "passive") {
      return intervalData(category, root).interval;
    },
    getDistanceBand(root, category = "passive") {
      const data = intervalData(category, root);
      return Object.freeze({
        distance: data.distance,
        band: data.band,
        tier: data.tier
      });
    },
    snapshot,
    profiles,
    quotas
  });

  console.info(
    "[BlueFox P2.6] Budget adaptatif intégré actif.",
    VERSION
  );
})(window);
