(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const rules = BF.MapGenerationRules;
  if (!rules || rules.__noFiveV20_1) return;

  const allowed = Object.freeze([1, 2, 3, 4, 6]);
  const originalGetPlateauCount = rules.getPlateauCount.bind(rules);

  const getPlateauCount = (discoveryIndex, random = Math.random) => {
    const generated = originalGetPlateauCount(discoveryIndex, random);
    return generated === 5 ? 6 : generated;
  };

  BF.MapGenerationRules = Object.freeze({
    ...rules,
    getPlateauCount,
    generationCounts: allowed,
    __noFiveV20_1: true
  });
})(window);
