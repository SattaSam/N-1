(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const BASE_CAPACITY = 200;
  const SURVIVAL_BAG_CAPACITY = 400;
  const RETURN_THRESHOLD_RATIO = 0.9;

  const normalize = (value) =>
    String(value || "")
      .toLocaleLowerCase("fr")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[_\s]+/g, "-");

  const hasSurvivalBagSkill = () => {
    const skills =
      BF.getMultiProgressionState?.()?.research?.skills ||
      BF.multiProgression?.state?.research?.skills ||
      {};
    return Object.entries(skills).some(([id, skill]) => {
      const candidates = [
        id,
        skill?.id,
        skill?.title,
        skill?.name
      ].map(normalize);
      return candidates.some(
        (value) =>
          value === "survival-bag" ||
          value === "sac-de-survie" ||
          value.includes("sac-de-survie")
      );
    });
  };

  const capacity = () =>
    hasSurvivalBagSkill()
      ? SURVIVAL_BAG_CAPACITY
      : BASE_CAPACITY;

  const total = () =>
    Object.values(
      BF.getProgressionState?.().inventory || {}
    ).reduce(
      (sum, amount) =>
        sum + Math.max(0, Number(amount) || 0),
      0
    );

  BF.getInventoryCapacityState = () => {
    const count = total();
    const limit = capacity();
    return Object.freeze({ count, capacity: limit,
      returnThreshold: Math.ceil(limit * RETURN_THRESHOLD_RATIO),
      survivalBagLearned: hasSurvivalBagSkill(),
      returningToBase: Boolean(BF.currentEngine?.missionManager?.memory?.getFact?.(
        "missionInventoryReturn:v1", null)?.active) });
  };
})(window);
