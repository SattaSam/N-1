(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const previous = BF.BiblePatterns || {};
  BF.BiblePatterns = Object.freeze({
    ...previous,
    ACTIVE_EXPLORATION_RELIC_RETURN: Object.freeze({
      id: "ACTIVE_EXPLORATION_RELIC_RETURN",
      version: 1,
      autonomyAxis: "exploration",
      steps: Object.freeze([
        Object.freeze({ slot: "exploreMaps", action: "travel" }),
        Object.freeze({ slot: "observeRelic", action: "observe", requires: ["exploreMaps"] }),
        Object.freeze({ slot: "returnToShelter", action: "travel", requires: ["observeRelic"] })
      ]),
      narrativeMoments: Object.freeze(["revealed","progress","completed"])
    }),
    PASSIVE_MAP_EXPLORATION: Object.freeze({
      id: "PASSIVE_MAP_EXPLORATION",
      version: 1,
      autonomyAxis: "exploration",
      steps: Object.freeze([
        Object.freeze({ slot: "exploreMaps", action: "travel" })
      ]),
      narrativeMoments: Object.freeze(["revealed","progress","completed"])
    })
  });
})(window);
