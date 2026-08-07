(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};

  /*
   * Bible Catalog V0 — trois cas techniques représentatifs.
   * Les textes sont temporaires V0 : les passes par patron remplaceront
   * ces textes par ceux de la Bible validée.
   */
  BF.BibleCatalog = Object.freeze([
    Object.freeze({
      id: "BIBLE-V0-CAMP",
      pattern: "COLLECT_THEN_BUILD",
      title: "Établir un camp",
      description: "Réunir le bois nécessaire puis établir le premier camp.",
      priority: 80,
      passivePriorityAxis: "survival",
      trigger: Object.freeze({ mode: "manual" }),
      slots: Object.freeze({
        collect: Object.freeze({
          title: "Réunir du bois",
          target: 10,
          params: Object.freeze({ kind: "wood" })
        }),
        build: Object.freeze({
          title: "Établir le camp",
          target: 1,
          params: Object.freeze({ kind: "camp" })
        })
      }),
      narrative: Object.freeze({
        revealed: Object.freeze([
          "Je dois d'abord sécuriser un point de chute près de la capsule."
        ]),
        progress: Object.freeze([]),
        completed: Object.freeze([
          "Le camp est établi. J'ai maintenant un point de repli."
        ])
      }),
      unlocks: Object.freeze([]),
      next: Object.freeze([])
    }),

    Object.freeze({
      id: "BIBLE-V0-DISCOVERY",
      pattern: "DISCOVER_THEN_ANALYZE",
      title: "Comprendre une découverte",
      description: "Observer puis analyser une forme de vie végétale afin d'en tirer une connaissance exploitable.",
      priority: 55,
      passivePriorityAxis: "research",
      trigger: Object.freeze({ mode: "manual" }),
      slots: Object.freeze({
        observe: Object.freeze({
          title: "Observer la découverte",
          target: 1,
          params: Object.freeze({ subject: "flora" })
        }),
        analyze: Object.freeze({
          title: "Analyser la découverte",
          target: 1,
          params: Object.freeze({ subject: "flora" })
        })
      }),
      narrative: Object.freeze({
        revealed: Object.freeze([
          "Cette forme de vie mérite que je m'y attarde."
        ]),
        progress: Object.freeze([]),
        completed: Object.freeze([
          "Cette observation commence à former une connaissance exploitable."
        ])
      }),
      unlocks: Object.freeze([]),
      next: Object.freeze([])
    }),

    Object.freeze({
      id: "BIBLE-V0-ARCHAEOLOGY",
      pattern: "ARCHAEOLOGY_INVESTIGATION",
      title: "Étudier une trace ancienne",
      description: "Repérer, inspecter puis analyser une structure ou des composants d'origine artificielle.",
      priority: 60,
      passivePriorityAxis: "research",
      trigger: Object.freeze({ mode: "manual" }),
      slots: Object.freeze({
        observe: Object.freeze({
          title: "Observer la trace",
          target: 1,
          params: Object.freeze({ subject: "components" })
        }),
        inspect: Object.freeze({
          title: "Inspecter la trace",
          target: 1,
          params: Object.freeze({ subject: "components" })
        }),
        analyze: Object.freeze({
          title: "Analyser la trace",
          target: 1,
          params: Object.freeze({ subject: "components" })
        })
      }),
      narrative: Object.freeze({
        revealed: Object.freeze([
          "Cette trace n'est probablement pas naturelle."
        ]),
        progress: Object.freeze([]),
        hesitation: Object.freeze([
          "Je préfère vérifier avant de tirer une conclusion."
        ]),
        completed: Object.freeze([
          "Les indices sont suffisants pour conserver cette découverte dans le journal."
        ])
      }),
      unlocks: Object.freeze([]),
      next: Object.freeze([])
    })
  ]);
})(window);
