(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "P2.6-r1";
  const records = new WeakMap();
  const profiles = Object.freeze({
    passive: Object.freeze({ near: 1 / 60, medium: 1 / 30, far: 1 / 12, distant: 1 / 4 }),
    npc: Object.freeze({ near: 1 / 60, medium: 1 / 30, far: 1 / 15, distant: 1 / 6 }),
    fauna: Object.freeze({ near: 1 / 60, medium: 1 / 30, far: 1 / 12, distant: 1 / 5 }),
    flora: Object.freeze({ near: 1 / 45, medium: 1 / 24, far: 1 / 10, distant: 1 / 3 }),
    phenomenon: Object.freeze({ near: 1 / 60, medium: 1 / 30, far: 1 / 15, distant: 1 / 6 })
  });

  const playerRoot = () =>
    BF.currentEngine?.character?.root ||
    BF.currentEngine?.characterController?.root ||
    BF.characterController?.root ||
    null;

  const distance = (root) => {
    const player = playerRoot();
    if (!player || !root?.position) return 0;
    return Math.hypot(
      Number(player.position.x || 0) - Number(root.position.x || 0),
      Number(player.position.z || 0) - Number(root.position.z || 0)
    );
  };

  const intervalFor = (category, root) => {
    const profile = profiles[category] || profiles.passive;
    const d = distance(root);
    if (d <= 12) return profile.near;
    if (d <= 28) return profile.medium;
    if (d <= 55) return profile.far;
    return profile.distant;
  };

  const shouldUpdate = (root, category, elapsed) => {
    if (!root?.parent || root.visible === false) return false;
    const interval = intervalFor(category, root);
    const record = records.get(root) || { last: -Infinity, interval };
    record.interval = interval;
    if (elapsed - record.last < interval) {
      records.set(root, record);
      return false;
    }
    record.last = elapsed;
    records.set(root, record);
    return true;
  };

  BF.RuntimeBudget = Object.freeze({
    version: VERSION,
    shouldUpdate,
    distance,
    getInterval(root, category = "passive") {
      return intervalFor(category, root);
    },
    profiles
  });

  console.info("[BlueFox P2.6] Budget central des animations actif.");
})(window);
