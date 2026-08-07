(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  BF.BiblePatterns = Object.freeze({
    COLLECT_THEN_BUILD: Object.freeze({
      id: "COLLECT_THEN_BUILD", version: 1, autonomyAxis: "survival",
      steps: Object.freeze([
        Object.freeze({ slot: "collect", action: "collect" }),
        Object.freeze({ slot: "build", action: "build", requires: ["collect"] })
      ]),
      narrativeMoments: Object.freeze(["revealed", "progress", "completed"])
    }),
    DISCOVER_THEN_ANALYZE: Object.freeze({
      id: "DISCOVER_THEN_ANALYZE", version: 1, autonomyAxis: "research",
      steps: Object.freeze([
        Object.freeze({ slot: "observe", action: "observe" }),
        Object.freeze({ slot: "analyze", action: "analyze", requires: ["observe"] })
      ]),
      narrativeMoments: Object.freeze(["revealed", "progress", "completed"])
    }),
    ARCHAEOLOGY_INVESTIGATION: Object.freeze({
      id: "ARCHAEOLOGY_INVESTIGATION", version: 1, autonomyAxis: "research",
      steps: Object.freeze([
        Object.freeze({ slot: "observe", action: "observe" }),
        Object.freeze({ slot: "inspect", action: "inspect", requires: ["observe"] }),
        Object.freeze({ slot: "analyze", action: "analyze", requires: ["inspect"] })
      ]),
      narrativeMoments: Object.freeze(["revealed", "progress", "hesitation", "completed"])
    })
  });
})(window);
