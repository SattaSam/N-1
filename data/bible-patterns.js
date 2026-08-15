(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};

  /*
   * Bible Patterns V0.1
   * Règle : les patrons ne contiennent que des ACTIONS réellement exécutables
   * par le moteur de missions. BUILD/CRAFT n'est plus une action de patron :
   * la création d'un objet est désormais portée par mission.effects.
   */
  BF.BiblePatterns = Object.freeze({
    COLLECT_THEN_REWARD: Object.freeze({
      id: "COLLECT_THEN_REWARD",
      version: 1,
      autonomyAxis: "survival",
      steps: Object.freeze([
        Object.freeze({
          slot: "collect",
          action: "collect"
        })
      ]),
      narrativeMoments: Object.freeze([
        "revealed",
        "progress",
        "completed"
      ])
    }),

    DISCOVER_THEN_ANALYZE: Object.freeze({
      id: "DISCOVER_THEN_ANALYZE",
      version: 1,
      autonomyAxis: "research",
      steps: Object.freeze([
        Object.freeze({
          slot: "observe",
          action: "observe"
        }),
        Object.freeze({
          slot: "analyze",
          action: "analyze",
          requires: ["observe"]
        })
      ]),
      narrativeMoments: Object.freeze([
        "revealed",
        "progress",
        "completed"
      ])
    }),

    ARCHAEOLOGY_INVESTIGATION: Object.freeze({
      id: "ARCHAEOLOGY_INVESTIGATION",
      version: 1,
      autonomyAxis: "research",
      steps: Object.freeze([
        Object.freeze({
          slot: "observe",
          action: "observe"
        }),
        Object.freeze({
          slot: "inspect",
          action: "inspect",
          requires: ["observe"]
        }),
        Object.freeze({
          slot: "analyze",
          action: "analyze",
          requires: ["inspect"]
        })
      ]),
      narrativeMoments: Object.freeze([
        "revealed",
        "progress",
        "completed"
      ])
    }),

    OBSERVE_TARGET: Object.freeze({
      id: "OBSERVE_TARGET",
      version: 1,
      autonomyAxis: "research",
      steps: Object.freeze([
        Object.freeze({
          slot: "study",
          action: "observe"
        })
      ]),
      narrativeMoments: Object.freeze([
        "revealed",
        "progress",
        "completed"
      ])
    }),

    EXPLORE_SCOPE: Object.freeze({
      id: "EXPLORE_SCOPE",
      version: 1,
      autonomyAxis: "exploration",
      steps: Object.freeze([
        Object.freeze({
          slot: "explore",
          action: "explore-zone"
        })
      ]),
      narrativeMoments: Object.freeze([
        "revealed",
        "progress",
        "completed"
      ])
    }),

    SEQUENCE_ACTIONS: Object.freeze({
      id: "SEQUENCE_ACTIONS",
      version: 1,
      autonomyAxis: "research",
      dynamicSequence: true,
      minSteps: 2,
      narrativeMoments: Object.freeze([
        "revealed",
        "progress",
        "completed"
      ])
    }),

    CONTEXT_MSC: Object.freeze({
      id: "CONTEXT_MSC",
      version: 1,
      autonomyAxis: "research",
      steps: Object.freeze([
        Object.freeze({
          slot: "context",
          action: "observe"
        })
      ]),
      narrativeMoments: Object.freeze([
        "revealed",
        "progress",
        "completed"
      ])
    }),

    TRAVEL_CYCLE: Object.freeze({
      id: "TRAVEL_CYCLE",
      version: 1,
      autonomyAxis: "exploration",
      steps: Object.freeze([
        Object.freeze({
          slot: "travel",
          action: "travel"
        })
      ]),
      narrativeMoments: Object.freeze([
        "revealed",
        "progress",
        "completed"
      ])
    })
  });
})(window);
