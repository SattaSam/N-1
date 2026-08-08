(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};

  /*
   * Bible Catalog V0.1 — trois missions techniques conformes au contrat strict.
   *
   * Ces fiches servent à prouver que :
   * 1. le déclencheur est déclaratif ;
   * 2. les objectifs sont compilés depuis un patron générique ;
   * 3. la narration intermédiaire est bornée à 3 jalons maximum ;
   * 4. la création d'objet est un effect, pas une action BUILD/CRAFT ;
   * 5. une mission peut demander un retour à un abri avant validation finale.
   */
  BF.BibleCatalog = Object.freeze([
    Object.freeze({
      id: "BIBLE-V0-CAMP",
      version: 1,

      pattern: "COLLECT_THEN_REWARD",

      title: "Établir un camp",
      description:
        "Réunir le bois nécessaire pour disposer d'un premier point de repli.",

      priority: 80,
      passivePriorityAxis: "survival",

      // La mission apparaît dès que BlueFox commence réellement à ramasser
      // du bois : pas de déclenchement spécifique codé dans le moteur.
      trigger: Object.freeze({
        type: "interaction.collect",
        kind: "wood",
        count: 1
      }),

      slots: Object.freeze({
        collect: Object.freeze({
          title: "Réunir du bois",
          description: "Rassembler suffisamment de bois pour établir un camp.",
          target: 10,
          params: Object.freeze({
            kind: "wood"
          })
        })
      }),

      narrative: Object.freeze({
        revealed: Object.freeze([
          "Ce bois devrait suffire à commencer à sécuriser un point de chute."
        ]),

        // Deux jalons seulement : volontairement sous la limite V0.1 de trois.
        progress: Object.freeze([
          Object.freeze({
            slot: "collect",
            atCount: 4,
            text: "J'ai déjà de quoi préparer une partie du camp."
          }),
          Object.freeze({
            slot: "collect",
            atCount: 8,
            text: "Il ne me manque plus grand-chose pour établir un vrai point de repli."
          })
        ]),

        completed: Object.freeze([
          "Le matériel est prêt. Je peux maintenant établir le camp."
        ])
      }),

      // BUILD disparaît du patron. Une fois la mission validée, le runtime
      // appliquera directement cet effet.
      effects: Object.freeze([
        Object.freeze({
          type: "world.spawn",
          objectId: "camp",
          placement: Object.freeze({
            mode: "near-bluefox"
          })
        })
      ]),

      unlocks: Object.freeze([]),
      next: Object.freeze([])
    }),

    Object.freeze({
      id: "BIBLE-V0-DISCOVERY",
      version: 1,

      pattern: "DISCOVER_THEN_ANALYZE",

      title: "Comprendre une découverte",
      description:
        "Observer puis analyser une forme de vie végétale afin d'en tirer une connaissance exploitable.",

      priority: 55,
      passivePriorityAxis: "research",

      trigger: Object.freeze({
        type: "interaction.observe",
        subject: "flora",
        count: 1
      }),

      slots: Object.freeze({
        observe: Object.freeze({
          title: "Observer la découverte",
          target: 1,
          params: Object.freeze({
            subject: "flora"
          })
        }),
        analyze: Object.freeze({
          title: "Analyser la découverte",
          target: 1,
          params: Object.freeze({
            subject: "flora"
          })
        })
      }),

      narrative: Object.freeze({
        revealed: Object.freeze([
          "Cette forme de vie mérite que je m'y attarde."
        ]),
        progress: Object.freeze([
          Object.freeze({
            slot: "observe",
            atCount: 1,
            text: "L'observation confirme qu'il y a quelque chose à comprendre ici."
          })
        ]),
        completed: Object.freeze([
          "Cette observation commence à former une connaissance exploitable."
        ])
      }),

      effects: Object.freeze([]),
      unlocks: Object.freeze([]),
      next: Object.freeze([])
    }),

    Object.freeze({
      id: "BIBLE-V0-ARCHAEOLOGY",
      version: 1,

      pattern: "ARCHAEOLOGY_INVESTIGATION",

      title: "Étudier une trace ancienne",
      description:
        "Repérer, inspecter puis analyser une structure ou des composants d'origine artificielle.",

      priority: 60,
      passivePriorityAxis: "research",

      trigger: Object.freeze({
        type: "interaction.observe",
        subject: "components",
        tagsAny: Object.freeze([
          "technology",
          "ruin"
        ]),
        count: 1
      }),

      slots: Object.freeze({
        observe: Object.freeze({
          title: "Observer la trace",
          target: 1,
          params: Object.freeze({
            subject: "components"
          })
        }),
        inspect: Object.freeze({
          title: "Inspecter la trace",
          target: 1,
          params: Object.freeze({
            subject: "components"
          })
        }),
        analyze: Object.freeze({
          title: "Analyser la trace",
          target: 1,
          params: Object.freeze({
            subject: "components"
          })
        })
      }),

      narrative: Object.freeze({
        revealed: Object.freeze([
          "Cette trace n'est probablement pas naturelle."
        ]),
        progress: Object.freeze([
          Object.freeze({
            slot: "observe",
            atCount: 1,
            text: "La forme générale confirme qu'il faut regarder cela de plus près."
          }),
          Object.freeze({
            slot: "inspect",
            atCount: 1,
            text: "L'inspection révèle des indices suffisamment cohérents pour justifier une analyse."
          })
        ]),
        completed: Object.freeze([
          "Les indices sont suffisants. Je vais consigner cette découverte au camp."
        ])
      }),

      // Exemple représentatif du nouveau verrou de fin :
      // les objectifs peuvent être achevés sur n'importe quelle map,
      // mais la validation narrative finale attend le retour auprès d'un
      // camp/refuge/base déjà établi.
      completionGate: Object.freeze({
        type: "proximity.shelter",
        shelterKinds: Object.freeze([
          "camp",
          "refuge",
          "base"
        ]),
        scope: "any-established",
        radius: 8
      }),

      effects: Object.freeze([]),
      unlocks: Object.freeze([]),
      next: Object.freeze([])
    })
  ]);
})(window);
