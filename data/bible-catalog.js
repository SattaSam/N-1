(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};

  const SCIENTIFIC_EXPERIMENTS = Object.freeze([
    Object.freeze({
      id: "biology", label: "Biologie", axis: "research",
      stages: Object.freeze([
        Object.freeze({ stage: 1, location: "camp", title: "Comparer des échantillons biologiques", requirements: Object.freeze([Object.freeze({ inventoryKey: "adaptive_biomass", quantity: 10 }), Object.freeze({ inventoryKey: "fiber", quantity: 5 })]), knowledge: Object.freeze({ id: "biology_experimented", label: "Expérimentation biologique menée" }), narratives: Object.freeze(["Les tissus réagissent différemment. Je garde la comparaison, même si le résultat reste imparfait.", "Cette combinaison est plus stable que prévu. J'ai une base biologique exploitable."]) }),
        Object.freeze({ stage: 2, location: "camp", title: "Tester conservation et compatibilité", requirements: Object.freeze([Object.freeze({ inventoryKey: "adaptive_biomass", quantity: 12 }), Object.freeze({ inventoryKey: "fiber", quantity: 2 })]), narratives: Object.freeze(["La conservation modifie la réponse des tissus. C'est utile, même sans résultat parfait.", "La compatibilité tient assez longtemps pour être mesurée proprement."]) }),
        Object.freeze({ stage: 3, location: "camp", title: "Stabiliser une association biologique", requirements: Object.freeze([Object.freeze({ inventoryKey: "adaptive_biomass", quantity: 15 })]), knowledge: Object.freeze({ id: "biology_applied", label: "Biologie appliquée" }), narratives: Object.freeze(["Trois essais cohérents : je comprends mieux comment stabiliser ces ressources vivantes.", "Cette fois la logique biologique est assez claire pour guider une préparation réelle."]) }),
        Object.freeze({ stage: 4, location: "workbench", title: "Mesurer un échange vivant-minéral", requirements: Object.freeze([Object.freeze({ inventoryKey: "adaptive_biomass", quantity: 6 }), Object.freeze({ inventoryKey: "crystal", quantity: 4 }), Object.freeze({ inventoryKey: "parts", quantity: 2 })]), narratives: Object.freeze(["L'échange existe, mais il reste instable. L'établi me permet enfin de le mesurer.", "Le vivant et le cristal ne réagissent pas au hasard. Il y a une signature reproductible."]) }),
        Object.freeze({ stage: 5, location: "workbench", title: "Confirmer une symbiose énergétique", requirements: Object.freeze([Object.freeze({ inventoryKey: "adaptive_biomass", quantity: 10 }), Object.freeze({ inventoryKey: "crystal", quantity: 5 })]), knowledge: Object.freeze({ id: "biotic_energy_symbiosis", label: "Symbiose énergétique" }), narratives: Object.freeze(["La relation tient. Le vivant peut participer à un échange énergétique mesurable.", "Je peux désormais relier certaines réponses biologiques aux signatures énergétiques du monde."]) })
      ])
    }),
    Object.freeze({
      id: "geology", label: "Géologie", axis: "research",
      stages: Object.freeze([
        Object.freeze({ stage: 1, location: "camp", title: "Comparer trois familles minérales", requirements: Object.freeze([Object.freeze({ inventoryKey: "magnetic_ore", quantity: 4 }), Object.freeze({ inventoryKey: "azure_ferrite", quantity: 4 }), Object.freeze({ inventoryKey: "resonant_basalt", quantity: 4 })]), narratives: Object.freeze(["Les trois minerais ne réagissent pas de la même manière. C'est déjà une information utile.", "Le contraste entre les échantillons est net. Je peux commencer à les classer par comportement."]) }),
        Object.freeze({ stage: 2, location: "camp", title: "Comparer roche, cristal et minerai rare", requirements: Object.freeze([Object.freeze({ inventoryKey: "magnetic_ore", quantity: 5 }), Object.freeze({ inventoryKey: "crystal", quantity: 5 }), Object.freeze({ inventoryKey: "stellar_iridium", quantity: 4 })]), narratives: Object.freeze(["Le cristal amplifie certaines différences entre les minerais.", "La structure rare répond autrement. Je dois cesser de traiter tous les minerais comme une seule famille."]) }),
        Object.freeze({ stage: 3, location: "camp", title: "Caractériser un matériau magnétique", requirements: Object.freeze([Object.freeze({ inventoryKey: "magnetic_ore", quantity: 6 }), Object.freeze({ inventoryKey: "crystal", quantity: 4 }), Object.freeze({ inventoryKey: "azure_ferrite", quantity: 4 })]), knowledge: Object.freeze({ id: "materials_science", label: "Science des matériaux" }), narratives: Object.freeze(["Je commence à prévoir la réaction d'un matériau avant de le transformer.", "Trois séries suffisent : j'ai une vraie méthode de comparaison des matériaux."]) }),
        Object.freeze({ stage: 4, location: "workbench", title: "Tester une résonance minérale contrôlée", requirements: Object.freeze([Object.freeze({ inventoryKey: "magnetic_ore", quantity: 5 }), Object.freeze({ inventoryKey: "resonant_basalt", quantity: 5 }), Object.freeze({ inventoryKey: "crystal", quantity: 3 })]), narratives: Object.freeze(["La résonance est faible mais mesurable. Sans l'établi, je l'aurais prise pour du bruit.", "Le basalte et le minerai magnétique se répondent sous contrainte contrôlée."]) }),
        Object.freeze({ stage: 5, location: "workbench", title: "Relier structure profonde et énergie", requirements: Object.freeze([Object.freeze({ inventoryKey: "magnetic_ore", quantity: 4 }), Object.freeze({ inventoryKey: "resonant_basalt", quantity: 4 }), Object.freeze({ inventoryKey: "crystal", quantity: 4 })]), knowledge: Object.freeze({ id: "deep_geology", label: "Géologie profonde" }), narratives: Object.freeze(["Les signatures convergent : la géologie profonde participe au réseau énergétique.", "Je ne regarde plus seulement des roches isolées ; je commence à lire une structure planétaire."]) })
      ])
    }),
    Object.freeze({
      id: "construction", label: "Construction", axis: "research",
      stages: Object.freeze([
        Object.freeze({ stage: 1, location: "camp", title: "Tester un assemblage bois-fibres", requirements: Object.freeze([Object.freeze({ inventoryKey: "wood", quantity: 8 }), Object.freeze({ inventoryKey: "fiber", quantity: 6 })]), narratives: Object.freeze(["L'assemblage tient, mais les contraintes se concentrent toujours aux mêmes endroits.", "Bois et fibres suffisent pour tester une vraie logique de structure."]) }),
        Object.freeze({ stage: 2, location: "camp", title: "Renforcer un assemblage simple", requirements: Object.freeze([Object.freeze({ inventoryKey: "wood", quantity: 6 }), Object.freeze({ inventoryKey: "fiber", quantity: 4 }), Object.freeze({ inventoryKey: "magnetic_ore", quantity: 4 })]), narratives: Object.freeze(["Le renfort minéral change complètement la distribution des efforts.", "La structure gagne en rigidité sans devenir inutilement lourde."]) }),
        Object.freeze({ stage: 3, location: "camp", title: "Définir une structure reproductible", requirements: Object.freeze([Object.freeze({ inventoryKey: "wood", quantity: 5 }), Object.freeze({ inventoryKey: "fiber", quantity: 5 }), Object.freeze({ inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 5 })]), knowledge: Object.freeze({ id: "structural_design", label: "Conception structurelle" }), narratives: Object.freeze(["Je peux maintenant raisonner en fonctions structurelles plutôt qu'en empilement de ressources.", "Trois essais cohérents : je sais définir une structure avant de la construire."]) }),
        Object.freeze({ stage: 4, location: "workbench", title: "Tester un assemblage modulaire", requirements: Object.freeze([Object.freeze({ inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 6 }), Object.freeze({ inventoryKey: "parts", quantity: 4 }), Object.freeze({ inventoryKey: "fiber", quantity: 4 })]), narratives: Object.freeze(["Les pièces standardisées réduisent les faiblesses de l'assemblage.", "Avec l'établi, je peux enfin tester des modules plutôt qu'un bloc unique."]) }),
        Object.freeze({ stage: 5, location: "workbench", title: "Valider une architecture modulaire", requirements: Object.freeze([Object.freeze({ inventoryKeys: Object.freeze(["azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 6 }), Object.freeze({ inventoryKey: "parts", quantity: 5 }), Object.freeze({ inventoryKey: "crystal", quantity: 3 })]), knowledge: Object.freeze({ id: "modular_architecture", label: "Architecture modulaire" }), narratives: Object.freeze(["La structure reste stable quand je remplace un module : c'est le principe qu'il me fallait.", "Je peux désormais concevoir une infrastructure comme un ensemble de fonctions remplaçables."]) })
      ])
    }),
    Object.freeze({
      id: "engineering", label: "Ingénierie", axis: "research",
      stages: Object.freeze([
        Object.freeze({ stage: 1, location: "camp", title: "Tester un assemblage électronique rudimentaire", requirements: Object.freeze([Object.freeze({ inventoryKey: "parts", quantity: 10 }), Object.freeze({ inventoryKeys: Object.freeze(["azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 6 })]), narratives: Object.freeze(["J'ai bien failli faire exploser l'assemblage. Mauvais résultat, excellente information.", "Le montage tient juste assez longtemps pour montrer quelles pièces ne doivent surtout pas être associées."]) }),
        Object.freeze({ stage: 2, location: "camp", title: "Stabiliser un circuit minéral", requirements: Object.freeze([Object.freeze({ inventoryKey: "parts", quantity: 8 }), Object.freeze({ inventoryKey: "magnetic_ore", quantity: 4 }), Object.freeze({ inventoryKey: "crystal", quantity: 3 })]), narratives: Object.freeze(["Le minerai magnétique stabilise une partie du signal, mais pas toute la chaîne.", "Le circuit devient assez régulier pour être comparé à une architecture réelle."]) }),
        Object.freeze({ stage: 3, location: "camp", title: "Comprendre une architecture technique", requirements: Object.freeze([Object.freeze({ inventoryKey: "parts", quantity: 10 }), Object.freeze({ inventoryKey: "core", quantity: 2 }), Object.freeze({ inventoryKeys: Object.freeze(["azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 4 })]), knowledge: Object.freeze({ id: "reverse_engineering", label: "Rétro-ingénierie comprise" }), narratives: Object.freeze(["Je peux maintenant remonter d'un assemblage fonctionnel vers les choix qui l'ont rendu possible.", "Le noyau n'est plus une boîte noire : j'en distingue les fonctions et les contraintes."]) }),
        Object.freeze({ stage: 4, location: "workbench", title: "Contrôler une architecture avancée", requirements: Object.freeze([Object.freeze({ inventoryKey: "parts", quantity: 8 }), Object.freeze({ inventoryKey: "core", quantity: 2 }), Object.freeze({ inventoryKey: "stellar_iridium", quantity: 4 })]), narratives: Object.freeze(["L'établi me permet de séparer les fonctions au lieu de bricoler tout le système d'un coup.", "L'iridium tient là où les assemblages précédents dérivaient."]) }),
        Object.freeze({ stage: 5, location: "workbench", title: "Valider une ingénierie avancée", requirements: Object.freeze([Object.freeze({ inventoryKey: "parts", quantity: 8 }), Object.freeze({ inventoryKey: "core", quantity: 2 }), Object.freeze({ inventoryKey: "crystal", quantity: 2 }), Object.freeze({ inventoryKey: "resonant_basalt", quantity: 2 })]), knowledge: Object.freeze({ id: "advanced_engineering", label: "Ingénierie avancée" }), narratives: Object.freeze(["Je peux désormais combiner noyau, composants et matériaux résonants sans travailler à l'aveugle.", "Ce niveau d'ingénierie ouvre la voie aux systèmes anciens, mais ne suffit pas à les comprendre seul."]) })
      ])
    }),
    Object.freeze({
      id: "energy", label: "Énergie", axis: "research",
      stages: Object.freeze([
        Object.freeze({ stage: 1, location: "camp", title: "Tester un transfert énergétique simple", requirements: Object.freeze([Object.freeze({ inventoryKey: "crystal", quantity: 5 }), Object.freeze({ inventoryKey: "magnetic_ore", quantity: 5 }), Object.freeze({ inventoryKey: "parts", quantity: 4 })]), narratives: Object.freeze(["Le transfert est bref, mais réel. Je peux mesurer quelque chose au lieu de seulement l'observer.", "Le cristal et le minerai magnétique forment une boucle imparfaite mais reproductible."]) }),
        Object.freeze({ stage: 2, location: "camp", title: "Comparer transfert minéral et biologique", requirements: Object.freeze([Object.freeze({ inventoryKey: "crystal", quantity: 5 }), Object.freeze({ inventoryKey: "adaptive_biomass", quantity: 5 }), Object.freeze({ inventoryKey: "magnetic_ore", quantity: 4 })]), narratives: Object.freeze(["Le vivant perturbe le transfert, mais il ne l'annule pas.", "La réponse biologique suit une partie de la signature énergétique du cristal."]) }),
        Object.freeze({ stage: 3, location: "camp", title: "Stabiliser un transfert contrôlé", requirements: Object.freeze([Object.freeze({ inventoryKey: "crystal", quantity: 6 }), Object.freeze({ inventoryKey: "magnetic_ore", quantity: 4 }), Object.freeze({ inventoryKey: "parts", quantity: 4 })]), knowledge: Object.freeze({ id: "energy_control", label: "Maîtrise énergétique de base" }), narratives: Object.freeze(["Je sais maintenant provoquer et limiter un transfert énergétique simple.", "Trois séries cohérentes : je peux parler de maîtrise de base, pas seulement d'observation."]) }),
        Object.freeze({ stage: 4, location: "workbench", title: "Tester un stockage intermédiaire", requirements: Object.freeze([Object.freeze({ inventoryKey: "crystal", quantity: 6 }), Object.freeze({ inventoryKey: "magnetic_ore", quantity: 4 }), Object.freeze({ inventoryKey: "accumulator", quantity: 1 })]), narratives: Object.freeze(["L'accumulateur amortit le transfert et rend la mesure beaucoup plus propre.", "Pour la première fois, je peux séparer la production, le stockage et la restitution."]) }),
        Object.freeze({ stage: 5, location: "workbench", title: "Confirmer une résonance énergétique", requirements: Object.freeze([Object.freeze({ inventoryKey: "crystal", quantity: 5 }), Object.freeze({ inventoryKey: "resonant_basalt", quantity: 5 }), Object.freeze({ inventoryKey: "magnetic_ore", quantity: 4 })]), knowledge: Object.freeze({ id: "energy_resonance", label: "Résonance énergétique" }), narratives: Object.freeze(["Les trois matériaux entrent dans une résonance stable. Ce n'est plus un accident local.", "Je peux désormais relier ces essais aux signatures énergétiques mesurées à l'échelle de la planète."]) })
      ])
    })
  ]);

  const T01 = Object.freeze({
    id: "T01",
    title: "Reconnaître le Site du crash",
    description: "Observer la capsule accidentée et mémoriser le point zéro.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual", count: 1 }),
    initialState: "active",
    targetBinding: "definition",
    priority: 100,
    primaryOnActivation: true,
    passivePriorityAxis: "survival",
    slots: Object.freeze({
      study: Object.freeze({
        title: "Observer la capsule",
        target: 1,
        params: Object.freeze({ objectId: "LANDMARK-CRASH-CAPSULE-001" })
      })
    }),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "crash-capsule-help",
        when: "active-idle",
        message: "Observer le site du crash : cliquez sur la capsule pour interagir.",
        duration: 14000,
        dismissOnProgress: true
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La capsule a tenu juste assez longtemps pour me déposer ici. Avant de m’éloigner, je veux regarder ce qui a survécu et mémoriser cet endroit."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "study",
          atCount: 1,
          text: "Je garde la capsule comme premier repère. Ce n’est pas forcément ma maison, mais c’est le seul endroit que je connais déjà."
        })
      ]),
      completed: Object.freeze([
        "D’accord. Je sais où revenir. Maintenant je peux regarder ce que cette zone peut réellement m’offrir."
      ])
    })
  });

  const T02 = Object.freeze({
    id: "T02",
    title: "Prélever les premiers échantillons",
    description: "Prélever une plante, du bois et un minerai pour comparer les premières ressources locales.",
    pattern: "COLLECT_THEN_REWARD",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T01",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T01"]),
    priority: 96,
    primaryOnActivation: true,
    passivePriorityAxis: "collection",
    slots: Object.freeze({
      collect: Object.freeze({
        title: "Prélever trois types de ressources",
        requirements: Object.freeze([
          Object.freeze({
            title: "Prélever une plante",
            target: 1,
            params: Object.freeze({
              subject: "flora",
              excludeKinds: Object.freeze(["wood"])
            })
          }),
          Object.freeze({
            title: "Prélever du bois",
            target: 1,
            params: Object.freeze({
              kind: "wood"
            })
          }),
          Object.freeze({
            title: "Prélever un minerai",
            target: 1,
            params: Object.freeze({
              subject: "mineral"
            })
          })
        ])
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je ne vais pas remplir mon sac au hasard. Quelques échantillons différents suffiront pour comprendre ce que cette zone peut fournir."
      ]),
      progress: Object.freeze([
        Object.freeze({
          at: 0.34,
          text: "Les matériaux ne se ressemblent pas. Tant mieux : chacun pourra servir à autre chose."
        })
      ]),
      completed: Object.freeze([
        "J’ai de quoi comparer. Le bois, surtout, pourrait me donner un point de départ très simple."
      ])
    })
  });

  const T03 = Object.freeze({
    id: "T03",
    title: "Établir le premier Camp",
    description: "Étudier le bois puis réunir dix unités pour installer un premier camp près du Site du crash.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T02",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T02"]),
    targetMapId: "crystal",
    localVisibility: "current-map",
    priority: 94,
    primaryOnActivation: true,
    passivePriorityAxis: "collection",
    sequence: Object.freeze([
      Object.freeze({
        slot: "studyWood",
        title: "Étudier un élément de bois",
        action: "observe",
        target: 1,
        params: Object.freeze({
          kind: "wood"
        })
      }),
      Object.freeze({
        slot: "collectWood",
        title: "Réunir 10 bois",
        action: "collect",
        target: 10,
        requires: Object.freeze(["studyWood"]),
        params: Object.freeze({
          kind: "wood"
        })
      })
    ]),
    activationInventoryCredits: Object.freeze([
      Object.freeze({
        slot: "collectWood",
        inventoryKey: "wood",
        maximum: 10
      })
    ]),
    effects: Object.freeze([
      Object.freeze({
        type: "inventory.consume",
        inventoryKey: "wood",
        quantity: 10
      }),
      Object.freeze({
        type: "site.establish",
        kind: "camp",
        microSceneId: "MSC-CUSTOM-CAMP",
        stage: 1,
        placement: Object.freeze({
          mode: "near-bluefox",
          anchor: "crash-capsule",
          distance: 7
        })
      })
    ]),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "camera-help",
        when: "active",
        delayMs: 90000,
        message: "Double clic : désactiver le suivi caméra. Clic simple : revenir à BlueFox.",
        duration: 0,
        highlight: "camera",
        dismissOnTargetEvent: "dblclick",
        dismissOnProgress: false
      })
    ]),
    rewards: Object.freeze([
      Object.freeze({
        type: "research.blueprint",
        id: "camp-establish-v1",
        category: "construction",
        constructionKind: "camp",
        label: "Établir un camp",
        description: "Installer un camp sur une map qui ne possède encore aucune infrastructure locale.",
        requiresShelter: false
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ce bois est assez régulier. Je pourrais le transformer en planches et monter quelque chose de simple près de la capsule. Dix unités devraient suffire pour commencer."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "collectWood",
          atCount: 1,
          text: "Je ne cherche pas une forteresse. Un feu, quelques planches, un endroit où poser mon sac : ce sera déjà un vrai point d’ancrage."
        })
      ]),
      completed: Object.freeze([
        "Voilà mon premier camp. Pour en faire un vrai refuge il faudra beaucoup plus, mais je n’ai aucune raison d’attendre ici jusque-là."
      ])
    })
  });

  const shelter = Object.freeze({
    id: "GAME-shelter",
    title: "Construire un refuge",
    description: "Projet de Refuge : accumuler les ressources et connaissances nécessaires sans bloquer les autres missions.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T03",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T03"]),
    activationSource: "autonomy",
    priority: 54,
    passivePriorityAxis: "collection",
    sequence: Object.freeze([
      Object.freeze({
        slot: "fibers",
        title: "Réunir 100 plantes fibreuses",
        action: "collect",
        target: 100,
        requires: Object.freeze([]),
        params: Object.freeze({
          kind: "fiber"
        })
      }),
      Object.freeze({
        slot: "plantStudy",
        title: "Observer, inspecter ou analyser 100 plantes",
        action: "analyze",
        target: 100,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "flora",
          excludeKinds: Object.freeze(["wood"])
        })
      }),
      Object.freeze({
        slot: "wood",
        title: "Réunir 100 bois",
        action: "collect",
        target: 100,
        requires: Object.freeze([]),
        params: Object.freeze({
          kind: "wood"
        })
      }),
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["refuge"]),
      radius: 9999,
      scope: "current-map"
    }),
    effects: Object.freeze([
      Object.freeze({
        type: "inventory.consume",
        inventoryKey: "fiber",
        quantity: 100
      }),
      Object.freeze({
        type: "inventory.consume",
        inventoryKey: "wood",
        quantity: 100
      }),
      Object.freeze({
        type: "site.establish",
        kind: "refuge",
        microSceneId: "MSC-CUSTOM-CAMP-BASE",
        stage: 2,
        placement: Object.freeze({
          mode: "near-camp",
          referenceKind: "camp"
        })
      })
    ]),
    rewards: Object.freeze([
      Object.freeze({
        type: "research.blueprint",
        id: "refuge-build-v1",
        category: "construction",
        constructionKind: "refuge",
        label: "Construire un refuge",
        description: "Construire un refuge sur une map où un camp a déjà été établi.",
        requiresShelter: false
      })
    ])
  });

  const base = Object.freeze({
    id: "GAME-base",
    title: "Construire une base renforcée",
    description: "Projet de Base renforcée : réunir les matériaux et connaissances nécessaires puis faire évoluer automatiquement le Refuge.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "manual",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["GAME-shelter"]),
    activationSource: "autonomy",
    priority: 52,
    passivePriorityAxis: "collection",
    sequence: Object.freeze([
      Object.freeze({
        slot: "fibers",
        title: "Réunir 500 plantes fibreuses",
        action: "collect",
        target: 500,
        requires: Object.freeze([]),
        params: Object.freeze({ kind: "fiber" })
      }),
      Object.freeze({
        slot: "minerals",
        title: "Réunir 500 minéraux ou cristaux",
        action: "extract",
        target: 500,
        requires: Object.freeze([]),
        params: Object.freeze({ subject: "mineral" })
      }),
      Object.freeze({
        slot: "rockStudy",
        title: "Observer, inspecter ou analyser 100 éléments rocheux",
        action: "analyze",
        target: 100,
        requires: Object.freeze([]),
        params: Object.freeze({ subject: "mineral" })
      })
    ]),
    stockBackedSlots: Object.freeze([
      Object.freeze({ slot: "fibers", inventoryKey: "fiber", maximum: 500 }),
      Object.freeze({ slot: "minerals", subject: "mineral", maximum: 500 })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["base"]),
      radius: 9999,
      scope: "current-map"
    }),
    effects: Object.freeze([
      Object.freeze({
        type: "inventory.consume",
        inventoryKey: "fiber",
        quantity: 500
      }),
      Object.freeze({
        type: "inventory.consume",
        subject: "mineral",
        quantity: 500
      }),
      Object.freeze({
        type: "site.establish",
        kind: "base",
        microSceneId: "MSC-CUSTOM-CAMP-BASE-REINFORCED",
        stage: 3,
        placement: Object.freeze({
          mode: "near-camp",
          referenceKind: "refuge"
        })
      })
    ]),
    narrative: Object.freeze({
      completed: Object.freeze([
        "Le Refuge est devenu une Base renforcée capable de soutenir des excursions plus lointaines."
      ])
    })
  });

  const nouvelleFondation = Object.freeze({
    id: "GAME-Nouvelle fondation",
    title: "Établir un camp-relais lointain",
    description: "Après une excursion de dix nouvelles maps depuis Crystal, établir sur la zone atteinte un nouveau camp-relais.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      count: 10,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["GAME-base"]),
    bindActivationMap: true,
    targetMapFact: "bibleActivation:GAME-Nouvelle fondation",
    targetMapField: "mapId",
    priority: 48,
    passivePriorityAxis: "survival",
    ponderation: 0.1,
    sequence: Object.freeze([
      Object.freeze({
        slot: "studyWood",
        title: "Vérifier le bois disponible sur la zone du relais",
        action: "observe",
        target: 1,
        params: Object.freeze({
          kind: "wood",
          requiredMapFact: "bibleActivation:GAME-Nouvelle fondation",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "collectWood",
        title: "Réunir 10 bois pour le camp-relais",
        action: "collect",
        target: 10,
        requires: Object.freeze(["studyWood"]),
        params: Object.freeze({
          kind: "wood",
          requiredMapFact: "bibleActivation:GAME-Nouvelle fondation",
          requiredMapField: "mapId"
        })
      })
    ]),
    activationInventoryCredits: Object.freeze([
      Object.freeze({ slot: "collectWood", inventoryKey: "wood", maximum: 10 })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      shelterKinds: Object.freeze(["camp"]),
      radius: 9999,
      scope: "current-map"
    }),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 10 }),
      Object.freeze({
        type: "site.establish",
        kind: "camp",
        microSceneId: "MSC-CUSTOM-CAMP",
        stage: 1,
        placement: Object.freeze({ mode: "near-bluefox" })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Crystal est loin derrière moi. Si je veux continuer sans transformer chaque excursion en aller-retour, il me faut un nouveau point d’ancrage."
      ]),
      completed: Object.freeze([
        "Le relais est en place. Je peux désormais déposer mes trouvailles et préparer la suite sans dépendre de chaque retour à Crystal."
      ])
    })
  });

  const foundation = Object.freeze({
    id: "GAME-foundation",
    title: "Transformer le camp-relais en Refuge",
    description: "Renforcer le camp-relais lointain en Refuge sur la même map, avec les ressources canoniques du patron Camp → Refuge.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-Nouvelle fondation",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-Nouvelle fondation"]),
    targetMapFact: "bibleActivation:GAME-Nouvelle fondation",
    targetMapField: "mapId",
    priority: 46,
    passivePriorityAxis: "survival",
    ponderation: 0.1,
    sequence: Object.freeze([
      Object.freeze({
        slot: "fibers",
        title: "Réunir 100 plantes fibreuses",
        action: "collect",
        target: 100,
        params: Object.freeze({
          kind: "fiber",
          requiredMapFact: "bibleActivation:GAME-Nouvelle fondation",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "wood",
        title: "Réunir 100 bois",
        action: "collect",
        target: 100,
        requires: Object.freeze([]),
        params: Object.freeze({
          kind: "wood",
          requiredMapFact: "bibleActivation:GAME-Nouvelle fondation",
          requiredMapField: "mapId"
        })
      })
    ]),
    activationInventoryCredits: Object.freeze([
      Object.freeze({ slot: "fibers", inventoryKey: "fiber", maximum: 100 }),
      Object.freeze({ slot: "wood", inventoryKey: "wood", maximum: 100 })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      shelterKinds: Object.freeze(["refuge"]),
      radius: 9999,
      scope: "current-map"
    }),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKey: "fiber", quantity: 100 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 100 }),
      Object.freeze({
        type: "site.establish",
        kind: "refuge",
        microSceneId: "MSC-CUSTOM-CAMP-BASE",
        stage: 2,
        placement: Object.freeze({ mode: "near-camp" })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ce camp-relais peut devenir plus qu’une halte. Je peux le transformer en Refuge sans perdre le lien avec la zone choisie."
      ]),
      completed: Object.freeze([
        "Le camp-relais est devenu un Refuge. Cette région possède maintenant un second point d’ancrage durable."
      ])
    })
  });

  const survivalRest = Object.freeze({
    id: "GAME-survival_rest",
    title: "Repos sécurisé",
    description: "Après le retour à Crystal depuis l’expédition du relais lointain, effectuer un vrai repos au Refuge ou à la Base.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "movement.portal_crossed",
      toMapId: "crystal",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-foundation"]),
    priority: 44,
    passivePriorityAxis: "protection",
    ponderation: 0.25,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 34,
    sequence: Object.freeze([
      Object.freeze({
        slot: "returnCrystal",
        title: "Achever le retour à Crystal",
        action: "travel",
        target: 1,
        params: Object.freeze({
          eventDriven: true,
          toMapId: "crystal",
          distinctBy: "transition"
        })
      }),
      Object.freeze({
        slot: "secureRest",
        title: "Effectuer un repos sécurisé au Refuge ou à la Base",
        action: "rest",
        target: 1,
        requires: Object.freeze(["returnCrystal"]),
        params: Object.freeze({})
      })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["refuge", "base"]),
      radius: 8,
      scope: "any-established"
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Le trajet jusqu’au relais a changé l’échelle de mes sorties. De retour à Crystal, je veux vérifier ce que vaut réellement un repos protégé."
      ]),
      completed: Object.freeze([
        "À l’abri, le repos n’est plus seulement une pause : il redevient une vraie récupération."
      ])
    })
  });

  const survivalStable = Object.freeze({
    id: "GAME-survival_stable",
    title: "Campement stable",
    description: "Valider trois retours au camp/base réellement demandés et consommés par d’autres missions.",
    pattern: "TRAVEL_CYCLE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-survival_rest",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-survival_rest"]),
    priority: 18,
    passivePriorityAxis: "protection",
    ponderation: 0.25,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 34,
    slots: Object.freeze({
      travel: Object.freeze({
        title: "Comptabiliser 3 retours missionnels réels à Crystal",
        target: 3,
        params: Object.freeze({
          eventDriven: true,
          returnConsumedOnly: true,
          toMapId: "crystal"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Un refuge devient un vrai point d’ancrage quand mes trajets finissent naturellement par y revenir."
      ]),
      completed: Object.freeze([
        "Trois expéditions m’ont ramené ici pour de bonnes raisons. Ce campement fait désormais partie de ma manière d’explorer."
      ])
    })
  });

  const collectionSamples = Object.freeze({
    id: "GAME-collection_samples",
    title: "Échantillons de base",
    description: "Après quatre nouvelles maps d’expédition, constituer un petit ensemble de ressources de natures différentes.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      count: 4,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["GAME-survival_stable"]),
    priority: 28,
    passivePriorityAxis: "collection",
    ponderation: 0.25,
    sequence: Object.freeze([
      Object.freeze({
        slot: "mineral",
        title: "Collecter 3 minerais ou cristaux",
        action: "collect",
        target: 3,
        params: Object.freeze({ subject: "mineral" })
      }),
      Object.freeze({
        slot: "plant",
        title: "Collecter une plante",
        action: "collect",
        target: 1,
        params: Object.freeze({ subject: "flora", excludeKinds: Object.freeze(["wood"]) })
      }),
      Object.freeze({
        slot: "other",
        title: "Collecter une autre ressource",
        action: "collect",
        target: 1,
        params: Object.freeze({ tagsAny: Object.freeze(["resource"]) })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je suis assez loin pour que quelques échantillons variés aient plus de valeur qu’un sac rempli au hasard."
      ]),
      completed: Object.freeze([
        "Ce lot suffit pour comparer ce que ces territoires peuvent réellement fournir."
      ])
    })
  });

  const collectionVariety = Object.freeze({
    id: "GAME-collection_variety",
    title: "Panier varié",
    description: "Sur une nouvelle map, collecter cinq familles de ressources distinctes puis revenir les déposer réellement au camp.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-collection_samples",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-collection_samples"]),
    priority: 30,
    passivePriorityAxis: "collection",
    ponderation: 0.25,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true,
      autonomousKnownReturn: true
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "newMap",
        title: "Atteindre une nouvelle map",
        action: "travel",
        target: 1,
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "variety",
        title: "Collecter 5 familles de ressources distinctes",
        action: "collect",
        target: 5,
        requires: Object.freeze(["newMap"]),
        params: Object.freeze({
          tagsAny: Object.freeze(["resource"]),
          distinctBy: "family",
          requiredMapFact: "tutorialExcursion:GAME-collection_variety",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "returnHome",
        title: "Revenir au camp pour déposer la collecte",
        action: "travel",
        target: 1,
        requires: Object.freeze(["variety"]),
        params: Object.freeze({
          eventDriven: true,
          toMapId: "crystal",
          distinctBy: "transition"
        })
      })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 8,
      scope: "any-established",
      requireDeposit: true
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Cette fois je veux un panier réellement varié, puis le ramener proprement au stockage."
      ]),
      completed: Object.freeze([
        "Cinq familles différentes, revenues au camp et déposées : cette collecte est enfin exploitable."
      ])
    })
  });

  const collectionReserves = Object.freeze({
    id: "GAME-collection_reserves",
    title: "Réserves sûres",
    description: "Sur une nouvelle map, collecter vingt ressources puis revenir les déposer réellement au camp.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-collection_variety",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-collection_variety"]),
    priority: 30,
    passivePriorityAxis: "collection",
    ponderation: 0.25,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true,
      autonomousKnownReturn: true
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "newMap",
        title: "Atteindre une nouvelle map",
        action: "travel",
        target: 1,
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "reserves",
        title: "Collecter 20 ressources",
        action: "collect",
        target: 20,
        requires: Object.freeze(["newMap"]),
        params: Object.freeze({
          tagsAny: Object.freeze(["resource"]),
          requiredMapFact: "tutorialExcursion:GAME-collection_reserves",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "returnHome",
        title: "Revenir au camp pour déposer les réserves",
        action: "travel",
        target: 1,
        requires: Object.freeze(["reserves"]),
        params: Object.freeze({
          eventDriven: true,
          toMapId: "crystal",
          distinctBy: "transition"
        })
      })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 8,
      scope: "any-established",
      requireDeposit: true
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Un stock utile n’est pas seulement ce que je ramasse : c’est ce qui revient réellement au camp."
      ]),
      completed: Object.freeze([
        "Vingt ressources ont rejoint le stockage. Cette réserve est maintenant réelle, pas seulement transportée."
      ])
    })
  });

  const explorationCartographer = Object.freeze({
    id: "GAME-exploration_cartographer",
    title: "Cartographe local",
    description: "Vers le Sud, découvrir puis explorer successivement trois nouvelles maps à au moins 80 %.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-collection_reserves",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-collection_reserves"]),
    priority: 42,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      repeatUnknownTravelUntilComplete: true
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "south1",
        title: "Découvrir une première nouvelle map au Sud",
        action: "travel",
        target: 1,
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", direction: "south" })
      }),
      Object.freeze({
        slot: "explore1",
        title: "Explorer cette map à 80 %",
        action: "explore-zone",
        target: 80,
        requires: Object.freeze(["south1"]),
        params: Object.freeze({
          scope: "map", metric: "surfacePercent", threshold: 80,
          requiredMapFact: "gameCartographer:map1", requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "south2",
        title: "Découvrir une deuxième nouvelle map au Sud",
        action: "travel",
        target: 1,
        requires: Object.freeze(["explore1"]),
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", direction: "south" })
      }),
      Object.freeze({
        slot: "explore2",
        title: "Explorer cette deuxième map à 80 %",
        action: "explore-zone",
        target: 80,
        requires: Object.freeze(["south2"]),
        params: Object.freeze({
          scope: "map", metric: "surfacePercent", threshold: 80,
          requiredMapFact: "gameCartographer:map2", requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "south3",
        title: "Découvrir une troisième nouvelle map au Sud",
        action: "travel",
        target: 1,
        requires: Object.freeze(["explore2"]),
        params: Object.freeze({
          eventDriven: true, newOnly: true, distinctBy: "mapId", direction: "south",
          completionArrivalFact: "gameCartographer:map3",
          completionArrivalField: "mapId"
        })
      }),
      Object.freeze({
        slot: "explore3",
        title: "Explorer cette troisième map à 80 %",
        action: "explore-zone",
        target: 80,
        requires: Object.freeze(["south3"]),
        params: Object.freeze({
          scope: "map", metric: "surfacePercent", threshold: 80,
          requiredMapFact: "gameCartographer:map3", requiredMapField: "mapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Au Sud, je veux cesser d’empiler des cartes à peine entamées : une zone, puis 80 %, avant d’aller plus loin."
      ]),
      completed: Object.freeze([
        "Trois territoires méridionaux sont maintenant reliés par une exploration réellement approfondie."
      ])
    })
  });

  const explorationComplete = Object.freeze({
    id: "GAME-exploration_complete",
    title: "Exploration approfondie",
    description: "Achever à 100 % la troisième map validée par Cartographe local.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-exploration_cartographer",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-exploration_cartographer"]),
    priority: 40,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Explorer à 100 % la troisième map",
        target: 100,
        params: Object.freeze({
          scope: "map",
          metric: "surfacePercent",
          threshold: 100,
          requiredMapFact: "gameCartographer:map3",
          requiredMapField: "mapId"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Cette troisième carte est déjà bien comprise. Je veux aller jusqu’au bout et fermer ses derniers blancs."
      ]),
      completed: Object.freeze([
        "Plus aucun secteur n’est laissé dans l’ombre sur cette carte. Je peux maintenant comparer le monde à une autre échelle."
      ])
    })
  });

  const travelBiomes = Object.freeze({
    id: "GAME-travel_biomes",
    title: "Explorateur de biomes",
    description: "Découvrir trois types de biomes distincts.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-exploration_complete",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-exploration_complete"]),
    priority: 20,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Découvrir 3 biomes distincts",
        target: 3,
        params: Object.freeze({ scope: "multi-map", distinctBy: "biomeId" })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Une carte complète ne suffit pas à comprendre le monde. Je veux comparer des milieux vraiment différents."
      ]),
      completed: Object.freeze([
        "Trois biomes distincts : assez pour commencer à mesurer la diversité du monde plutôt que celle d’une seule route."
      ])
    })
  });

  const explorationTotal = Object.freeze({
    id: "GAME-exploration_total",
    title: "Exploration mondiale — 10 biomes",
    description: "Valider dix biomes distincts dont au moins une map a été explorée à 100 %, y compris dans l’historique déjà acquis.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-travel_biomes",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-travel_biomes"]),
    priority: 16,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Explorer intégralement 10 biomes distincts",
        target: 10,
        params: Object.freeze({
          scope: "multi-map",
          metric: "surfacePercent",
          threshold: 100,
          distinctBy: "biomeId",
          historicalBackfill: true
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je veux maintenant distinguer les biomes que j’ai seulement traversés de ceux que je connais réellement jusqu’au dernier secteur."
      ]),
      completed: Object.freeze([
        "Dix biomes ont été explorés intégralement. Le monde commence à avoir une structure comparable, pas seulement une suite de paysages."
      ])
    })
  });

  const explorationTotal20 = Object.freeze({
    id: "GAME-exploration_total_20",
    title: "Exploration mondiale — 20 biomes",
    description: "Étendre la cartographie complète à vingt biomes distincts, avec reprise de l’historique déjà exploré à 100 %.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-exploration_total",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-exploration_total"]),
    priority: 14,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Explorer intégralement 20 biomes distincts",
        target: 20,
        params: Object.freeze({
          scope: "multi-map",
          metric: "surfacePercent",
          threshold: 100,
          distinctBy: "biomeId",
          historicalBackfill: true
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Dix biomes m’ont donné une première lecture du monde. Je veux maintenant vérifier si cette diversité tient à l’échelle planétaire."
      ]),
      completed: Object.freeze([
        "Vingt biomes distincts ont été intégralement explorés. La diversité planétaire repose maintenant sur une cartographie solide."
      ])
    })
  });

  const travelShort = Object.freeze({
    id: "GAME-travel_short",
    title: "Voyage court",
    description: "Depuis le réseau territorial connu, découvrir trois nouvelles maps vers le Nord.",
    pattern: "TRAVEL_CYCLE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-exploration_total_20",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-foundation", "GAME-exploration_total_20"]),
    priority: 38,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      repeatUnknownTravelUntilComplete: true
    }),
    slots: Object.freeze({
      travel: Object.freeze({
        title: "Découvrir 3 nouvelles maps au Nord",
        target: 3,
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId",
          direction: "north"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Le relais me permet maintenant de pousser une route courte vers le Nord sans repartir de zéro à chaque sortie."
      ]),
      completed: Object.freeze([
        "Trois nouvelles zones au Nord sont reliées au réseau connu. La route peut maintenant s’allonger."
      ])
    })
  });

  const travelLong = Object.freeze({
    id: "GAME-travel_long",
    title: "Voyage long",
    description: "À partir de son activation, découvrir huit nouvelles maps vers le Nord ; les maps du Voyage court ne comptent pas.",
    pattern: "TRAVEL_CYCLE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-travel_short",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-travel_short"]),
    priority: 40,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      repeatUnknownTravelUntilComplete: true
    }),
    slots: Object.freeze({
      travel: Object.freeze({
        title: "Découvrir 8 nouvelles maps au Nord",
        target: 8,
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId",
          direction: "north"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Trois cartes ont tracé une direction. Cette fois je veux mesurer ce que vaut vraiment cette route : huit nouvelles zones, pas les anciennes étapes déjà franchies."
      ]),
      completed: Object.freeze([
        "Huit nouvelles zones prolongent maintenant la route du Nord. Ce n’est plus une excursion courte : c’est un véritable axe d’exploration."
      ])
    })
  });

  const gameFlora = Object.freeze({
    id: "GAME-flora",
    title: "Étudier une plante phosphorescente",
    description: "Observer une plante phosphorescente puis analyser une plante du même type sans perturber son cycle.",
    pattern: "DISCOVER_THEN_ANALYZE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-travel_long",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-travel_long"]),
    passivePriorityAxis: "research",
    ponderation: 0.25,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 30,
    slots: Object.freeze({
      observe: Object.freeze({
        title: "Observer une plante phosphorescente",
        target: 1,
        params: Object.freeze({
          subject: "flora",
          tagsAny: Object.freeze(["glowing"]),
          excludeKinds: Object.freeze(["wood"])
        })
      }),
      analyze: Object.freeze({
        title: "Analyser une plante phosphorescente du même type",
        target: 1,
        params: Object.freeze({
          subject: "flora",
          tagsAny: Object.freeze(["glowing"]),
          excludeKinds: Object.freeze(["wood"]),
          relation: Object.freeze({
            fromSlot: "observe",
            sameBy: Object.freeze(["cuoType"])
          })
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Cette plante phosphorescente réagit à son environnement. Je veux d’abord l’observer sans intervenir, puis analyser une plante du même type."
      ]),
      completed: Object.freeze([
        "L’observation et l’analyse de deux spécimens du même type concordent. Cette plante fournit un premier repère fiable pour structurer mes recherches."
      ])
    })
  });

  const researchInitial = Object.freeze({
    id: "GAME-research_initial",
    title: "Analyse initiale",
    description: "Effectuer trois analyses réelles afin d’établir une première base de comparaison.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "west",
      count: 1,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["GAME-flora"]),
    passivePriorityAxis: "research",
    ponderation: 0.25,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 32,
    sequence: Object.freeze([
      Object.freeze({
        slot: "analysisStart",
        title: "Effectuer une première analyse",
        action: "analyze",
        target: 1,
        params: Object.freeze({})
      }),
      Object.freeze({
        slot: "analysisFollowup",
        title: "Effectuer deux analyses supplémentaires",
        action: "analyze",
        target: 2,
        requires: Object.freeze(["analysisStart"]),
        params: Object.freeze({})
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Une observation isolée ne suffit pas. Trois analyses comparables devraient me donner une première base solide."
      ]),
      completed: Object.freeze([
        "Trois analyses concordantes : je peux commencer à formuler des hypothèses au lieu d’accumuler des impressions."
      ])
    })
  });

  const researchHypothesis = Object.freeze({
    id: "GAME-research_hypothesis",
    title: "Hypothèse validée",
    description: "Effectuer dix analyses réelles puis formaliser la comparaison par une recherche.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "east",
      count: 1,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["GAME-research_initial"]),
    passivePriorityAxis: "research",
    ponderation: 0.25,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 32,
    sequence: Object.freeze([
      Object.freeze({
        slot: "analyses",
        title: "Effectuer dix analyses",
        action: "analyze",
        target: 10,
        params: Object.freeze({})
      }),
      Object.freeze({
        slot: "research",
        title: "Formaliser l’hypothèse",
        action: "research",
        target: 1,
        requires: Object.freeze(["analyses"]),
        params: Object.freeze({})
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "J’ai assez d’indices pour chercher une règle commune. Il me faut maintenant suffisamment d’analyses pour vérifier si elle tient."
      ]),
      completed: Object.freeze([
        "Les résultats convergent. Ce n’est plus une intuition : l’hypothèse tient assez bien pour guider la suite."
      ])
    })
  });

  const specialInvestigator = Object.freeze({
    id: "GAME-special_investigator",
    title: "Investigateur",
    description: "Effectuer dix inspections réelles pour consolider une méthode d’investigation.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "south",
      count: 1,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["GAME-research_hypothesis"]),
    passivePriorityAxis: "research",
    ponderation: 0.25,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 32,
    sequence: Object.freeze([
      Object.freeze({
        slot: "inspectionStart",
        title: "Effectuer une première inspection",
        action: "inspect",
        target: 1,
        params: Object.freeze({})
      }),
      Object.freeze({
        slot: "inspectionFollowup",
        title: "Effectuer neuf inspections supplémentaires",
        action: "inspect",
        target: 9,
        requires: Object.freeze(["inspectionStart"]),
        params: Object.freeze({})
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Observer donne une impression ; inspecter permet de vérifier. Dix inspections devraient suffire pour rendre cette méthode naturelle."
      ]),
      completed: Object.freeze([
        "Dix inspections plus tard, je distingue mieux les détails utiles du simple décor."
      ])
    })
  });

  const specialArchivist = Object.freeze({
    id: "GAME-special_archivist",
    title: "Archiviste",
    description: "Constater que cinq familles différentes ont déjà fait l’objet d’au moins une observation réelle.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-special_investigator",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-special_investigator"]),
    passivePriorityAxis: "research",
    ponderation: 0.25,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 38,
    runtimeCounters: Object.freeze([
      Object.freeze({
        slot: "study",
        source: "observations.distinctFamiliesHistorical",
        baselineOnActivation: false
      })
    ]),
    slots: Object.freeze({
      study: Object.freeze({
        title: "Avoir observé cinq familles différentes",
        target: 5,
        params: Object.freeze({
          catalogManaged: true
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Mon journal contient déjà assez de matière pour prendre du recul. Je veux simplement vérifier si mes observations couvrent cinq familles réellement différentes."
      ]),
      completed: Object.freeze([
        "Cinq familles distinctes ont maintenant été observées. Mon journal commence à ressembler à une mémoire structurée du monde."
      ])
    })
  });


  const gameCivilization1 = Object.freeze({
    id: "GAME-civilization_1",
    title: "Les mêmes marques",
    description: "Après le Refuge, relire l'historique des stèles puis comparer plusieurs exemplaires pour vérifier qu'elles appartiennent au même ensemble.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "GAME-shelter", count: 1 }),
    initialState: "active",
    prerequisites: Object.freeze(["GAME-shelter"]),
    priority: 67,
    passivePriorityAxis: "research",
    sequence: Object.freeze([
      Object.freeze({ slot: "steles", title: "Avoir observé 10 stèles", action: "observe", target: 10, requires: Object.freeze([]), params: Object.freeze({ cuoType: "stele", catalogManaged: true }) }),
      Object.freeze({ slot: "compare", title: "Analyser 2 stèles pour comparer leurs motifs", action: "analyze", target: 2, requires: Object.freeze(["steles"]), params: Object.freeze({ cuoType: "stele" }) })
    ]),
    runtimeCounters: Object.freeze([Object.freeze({ slot: "steles", source: "observations.historical", cuoType: "stele", baselineOnActivation: false })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Dix stèles, et toujours ces mêmes formes. Ce n'est plus une coïncidence. Je devrais regarder ce qu'elles ont réellement en commun."]),
      progress: Object.freeze([Object.freeze({ slot: "compare", atCount: 1, text: "Les motifs changent un peu, mais leur organisation reste la même. Quelqu'un répétait volontairement ce langage." })]),
      completed: Object.freeze(["Ces stèles appartiennent au même ensemble. Ce monde porte les traces d'une présence organisée."])
    })
  });

  const gameCivilization2 = Object.freeze({
    id: "GAME-civilization_2",
    title: "Une intention derrière les traces",
    description: "Comparer les stèles à d'autres vestiges afin de vérifier qu'ils obéissent à une même logique.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "GAME-civilization_1", count: 1 }),
    prerequisites: Object.freeze(["GAME-civilization_1"]),
    priority: 66,
    passivePriorityAxis: "research",
    sequence: Object.freeze([
      Object.freeze({ slot: "relic", title: "Inspecter un vestige technologique", action: "inspect", target: 1, requires: Object.freeze([]), params: Object.freeze({ family: "technology" }) }),
      Object.freeze({ slot: "synthesis", title: "Comparer les traces anciennes", action: "research", target: 1, requires: Object.freeze(["relic"]), params: Object.freeze({}) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Les stèles ne sont peut-être qu'une partie du message. Les arches et les ruines pourraient suivre la même logique."]),
      progress: Object.freeze([Object.freeze({ slot: "relic", atCount: 1, text: "Même façon d'organiser les formes, mêmes choix de matériaux... ces vestiges semblent liés." })]),
      completed: Object.freeze(["Ce ne sont pas des monuments isolés. Quelqu'un a structuré ces lieux avec une intention précise."])
    })
  });

  const gameCivilization3 = Object.freeze({
    id: "GAME-civilization_3",
    title: "Première piste",
    description: "Suivre la piste sur une nouvelle map et y retrouver une stèle.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "GAME-civilization_2", count: 1 }),
    prerequisites: Object.freeze(["GAME-civilization_2"]),
    priority: 65,
    passivePriorityAxis: "exploration",
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ size: "random", biome: "random", requiredObjects: Object.freeze([Object.freeze({ type: "stele", count: 1, contextRole: "civilizationTrail1" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "travel", title: "Rejoindre une nouvelle map", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "stele", title: "Observer la stèle de cette nouvelle map", action: "observe", target: 1, requires: Object.freeze(["travel"]), params: Object.freeze({ cuoType: "stele" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Certaines marques ressemblent moins à un symbole qu'à une indication. Peut-être qu'elles montrent une direction."]),
      progress: Object.freeze([Object.freeze({ slot: "stele", atCount: 1, text: "Les mêmes marques, ici aussi. La piste ne s'arrête donc pas à un seul territoire." })]),
      completed: Object.freeze(["La piste continue au-delà des cartes que je connaissais déjà."])
    })
  });

  const gameCivilization4 = Object.freeze({
    id: "GAME-civilization_4",
    title: "La piste continue",
    description: "Poursuivre sur une deuxième nouvelle map et confirmer le fil conducteur par une nouvelle stèle.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "GAME-civilization_3", count: 1 }),
    prerequisites: Object.freeze(["GAME-civilization_3"]),
    priority: 64,
    passivePriorityAxis: "exploration",
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ size: "random", biome: "random", requiredObjects: Object.freeze([Object.freeze({ type: "stele", count: 1, contextRole: "civilizationTrail2" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "travel", title: "Rejoindre une deuxième nouvelle map", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "stele", title: "Observer une nouvelle stèle", action: "observe", target: 1, requires: Object.freeze(["travel"]), params: Object.freeze({ cuoType: "stele" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["La première stèle m'a donné une direction. Je veux savoir si cette logique tient encore une carte plus loin."]),
      progress: Object.freeze([Object.freeze({ slot: "stele", atCount: 1, text: "Deux cartes plus loin, et toujours cette logique. Quelqu'un voulait vraiment qu'on puisse suivre ces traces." })]),
      completed: Object.freeze(["La répétition est trop précise pour être accidentelle. Il doit y avoir quelque chose au bout de ce chemin."])
    })
  });

  const gameCivilization5 = Object.freeze({
    id: "GAME-civilization_5",
    title: "Le dépôt oublié",
    description: "Atteindre une troisième nouvelle map, suivre sa stèle jusqu'à une réserve abandonnée et récupérer tout ce qui reste exploitable.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "GAME-civilization_4", count: 1 }),
    prerequisites: Object.freeze(["GAME-civilization_4"]),
    priority: 63,
    passivePriorityAxis: "exploration",
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredObjects: Object.freeze([Object.freeze({ type: "stele", count: 1, contextRole: "civilizationTrail3" })]),
      requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-RESERVE-ABANDONEE", persistent: true, spawnOnce: true, contextRole: "civilizationReserve" })])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "travel", title: "Rejoindre une troisième nouvelle map", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "stele", title: "Observer la stèle qui termine la piste", action: "observe", target: 1, requires: Object.freeze(["travel"]), params: Object.freeze({ cuoType: "stele" }) }),
      Object.freeze({ slot: "reserve", title: "Récupérer les 700 unités encore exploitables", action: "collect", target: 700, requires: Object.freeze(["stele"]), params: Object.freeze({ catalogManaged: true }) })
    ]),
    proximityContexts: Object.freeze([Object.freeze({
      id: "civilization-reserve-proximity",
      microSceneId: "MSC-CUSTOM-RESERVE-ABANDONEE",
      fact: "civilizationReserve:v1",
      slot: "reserve",
      radius: 2.75,
      reserve: Object.freeze({
        items: Object.freeze([
          Object.freeze({ inventoryKey: "fiber", quantity: 350 }),
          Object.freeze({ inventoryKey: "azure_ferrite", quantity: 175 }),
          Object.freeze({ inventoryKey: "magnetic_ore", quantity: 175 })
        ]),
        fullMessage: "Il reste des ressources utilisables, mais je ne peux pas en emporter plus. Je reviendrai plus tard.",
        partialMessage: "Il reste des ressources utilisables ici, mais mon sac est presque plein. Je reviendrai après l'avoir vidé.",
        exhaustedMessage: "J'ai récupéré tout ce qui pouvait encore servir. Le reste est trop dégradé pour être exploitable."
      })
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["La piste continue encore. Une troisième stèle devrait me dire si elle mène réellement quelque part."]),
      progress: Object.freeze([
        Object.freeze({ slot: "stele", atCount: 1, text: "Ce n'est pas une ruine ordinaire. On dirait que quelqu'un avait rassemblé des matériaux ici." }),
        Object.freeze({ slot: "reserve", at: 0.5, text: "Tout n'a pas résisté au temps, mais il reste largement de quoi servir à ma propre construction." })
      ]),
      completed: Object.freeze(["C'est tout ce que je peux sauver. Ces matériaux avaient été stockés pour construire autrefois ; ils vont maintenant m'aider à terminer ma propre Base."])
    })
  });

  const gameEnergy = Object.freeze({
    id: "GAME-energy",
    title: "Comparer les cristaux",
    description: "Comparer huit cristaux, inspecter deux éléments technologiques, effectuer quatre analyses puis formaliser une première hypothèse énergétique.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-special_archivist",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-special_archivist"]),
    passivePriorityAxis: "research",
    ponderation: 0.1,
    sequence: Object.freeze([
      Object.freeze({
        slot: "crystals",
        title: "Réunir 8 cristaux pour comparaison",
        action: "collect",
        target: 8,
        requires: Object.freeze([]),
        params: Object.freeze({
          tagsAny: Object.freeze(["crystal"])
        })
      }),
      Object.freeze({
        slot: "technology",
        title: "Inspecter 2 éléments technologiques",
        action: "inspect",
        target: 2,
        requires: Object.freeze(["crystals"]),
        params: Object.freeze({
          family: "technology"
        })
      }),
      Object.freeze({
        slot: "analyses",
        title: "Effectuer 4 analyses comparatives",
        action: "analyze",
        target: 4,
        requires: Object.freeze(["technology"]),
        params: Object.freeze({
          tagsAny: Object.freeze(["crystal", "technology"])
        })
      }),
      Object.freeze({
        slot: "research",
        title: "Formaliser le principe d’une énergie douce",
        action: "research",
        target: 1,
        requires: Object.freeze(["analyses"]),
        params: Object.freeze({})
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ces cristaux ne réagissent pas tous de la même manière. Je vais comparer leurs propriétés à quelques éléments technologiques avant d’en tirer une conclusion."
      ]),
      completed: Object.freeze([
        "Les comparaisons convergent. Je tiens une première piste énergétique exploitable, sans encore prétendre construire quoi que ce soit."
      ])
    })
  });

  const gameEngineering1 = Object.freeze({
    id: "GAME-engineering_1",
    title: "Ingénierie I",
    description: "Étudier vingt-cinq minerais et dix composants technologiques, puis utiliser vingt-cinq unités minérales dans une première recherche comparative.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-base",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["GAME-energy", "GAME-base"]),
    passivePriorityAxis: "research",
    ponderation: 0.25,
    sequence: Object.freeze([
      Object.freeze({
        slot: "minerals",
        title: "Étudier 25 minerais",
        action: "analyze",
        target: 25,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "mineral"
        })
      }),
      Object.freeze({
        slot: "components",
        title: "Étudier 10 composants technologiques",
        action: "analyze",
        target: 10,
        requires: Object.freeze(["minerals"]),
        params: Object.freeze({
          subject: "components"
        })
      }),
      Object.freeze({
        slot: "research",
        title: "Synthétiser les résultats d’Ingénierie I",
        action: "research",
        target: 1,
        requires: Object.freeze(["components"]),
        params: Object.freeze({})
      })
    ]),
    effects: Object.freeze([
      Object.freeze({
        type: "inventory.consume",
        inventoryKeys: Object.freeze([
          "magnetic_ore",
          "azure_ferrite",
          "resonant_basalt",
          "stellar_iridium"
        ]),
        quantity: 25
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je peux maintenant comparer des matériaux plutôt que les examiner isolément. Vingt-cinq minerais et dix composants devraient suffire pour une première méthode d’ingénierie."
      ]),
      completed: Object.freeze([
        "Les premiers essais comparatifs sont terminés. Les échantillons utilisés ont servi à établir une méthode plus fiable."
      ])
    })
  });

  const gameEngineering2 = Object.freeze({
    id: "GAME-engineering_2",
    title: "Étudier cinquante minerais",
    description: "Étudier cinquante minerais et vingt-cinq composants technologiques, puis utiliser cinquante unités minérales dans une recherche avancée.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GAME-engineering_1",
      count: 1
    }),
    prerequisites: Object.freeze(["GAME-engineering_1"]),
    passivePriorityAxis: "research",
    ponderation: 0.1,
    sequence: Object.freeze([
      Object.freeze({
        slot: "minerals",
        title: "Étudier 50 minerais",
        action: "analyze",
        target: 50,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "mineral"
        })
      }),
      Object.freeze({
        slot: "components",
        title: "Étudier 25 composants technologiques",
        action: "analyze",
        target: 25,
        requires: Object.freeze(["minerals"]),
        params: Object.freeze({
          subject: "components"
        })
      }),
      Object.freeze({
        slot: "research",
        title: "Synthétiser les résultats d’Ingénierie II",
        action: "research",
        target: 1,
        requires: Object.freeze(["components"]),
        params: Object.freeze({})
      })
    ]),
    effects: Object.freeze([
      Object.freeze({
        type: "inventory.consume",
        inventoryKeys: Object.freeze([
          "magnetic_ore",
          "azure_ferrite",
          "resonant_basalt",
          "stellar_iridium"
        ]),
        quantity: 50
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La méthode tient. Je peux élargir l’échantillon et vérifier si les mêmes principes restent valables à plus grande échelle."
      ]),
      completed: Object.freeze([
        "Cinquante minerais et vingt-cinq composants comparés : cette méthode d’ingénierie est désormais suffisamment robuste pour ouvrir la suite."
      ])
    })
  });


  const gameEngineering3 = Object.freeze({
    id: "GAME-engineering_3",
    experimentalPrerequisites: Object.freeze(["materials_science"]),
    title: "Chauffer pour comprendre",
    description: "Utiliser le feu du camp pour tester l'effet de la chaleur sur des matériaux réels.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "GAME-engineering_2", count: 1 }),
    initialState: "active",
    prerequisites: Object.freeze(["GAME-engineering_2"]),
    priority: 61,
    passivePriorityAxis: "research",
    sequence: Object.freeze([
      Object.freeze({ slot: "fire", title: "Observer le feu du camp avant l'expérience", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ cuoType: "base_fire" }) }),
      Object.freeze({ slot: "experiment", title: "Analyser les matériaux chauffés", action: "research", target: 1, requires: Object.freeze(["fire"]), params: Object.freeze({}) })
    ]),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 8 }),
      Object.freeze({ type: "inventory.consume", inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 5 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "fiber", quantity: 3 })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Observer ces matériaux à froid ne me dit pas tout. Je pourrais utiliser le feu du camp et voir comment ils réagissent à la chaleur."]),
      progress: Object.freeze([Object.freeze({ slot: "fire", atCount: 1, text: "Huit morceaux de bois devraient suffire. Si je concentre mieux la chaleur, l'expérience sera plus lisible." })]),
      completed: Object.freeze(["Ça fonctionne. Collecter n'est qu'une première étape : certaines ressources doivent être consommées pour apprendre quelque chose."])
    })
  });

  const gameFire = Object.freeze({
    id: "GAME-fire",
    title: "Alimenter le feu du camp",
    description: "Quand BlueFox est déjà près de sa Base sur Crystal et que le bois s'accumule, consacrer huit unités à un feu de travail.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "manual", count: 1 }),
    prerequisites: Object.freeze(["GAME-engineering_3"]),
    repeatable: true,
    repeatableCondition: Object.freeze({
      mapId: "crystal",
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 12,
      inventoryKey: "wood",
      minimum: 80,
      rearmIncrease: 8
    }),
    priority: 28,
    passivePriorityAxis: "research",
    autoPrimaryEligible: false,
    sequence: Object.freeze([
      Object.freeze({ slot: "fire", title: "Vérifier le feu du camp", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ cuoType: "base_fire" }) }),
      Object.freeze({ slot: "feed", title: "Préparer le feu pour le travail", action: "research", target: 1, requires: Object.freeze(["fire"]), params: Object.freeze({}) })
    ]),
    effects: Object.freeze([Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 8 })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le bois s'accumule. J'en utiliserais bien une partie pour entretenir un feu vraiment utile, puisque je suis déjà au camp."]),
      progress: Object.freeze([Object.freeze({ slot: "fire", atCount: 1, text: "Ce feu peut faire plus que me réchauffer : il peut préparer mes prochains essais." })]),
      completed: Object.freeze(["Voilà. Le feu tiendra assez longtemps pour travailler correctement."])
    })
  });

  const gameEngineering4 = Object.freeze({
    id: "GAME-engineering_4",
    title: "Les limites du feu",
    description: "Tenter un assemblage plus précis au feu du camp et constater les limites de cette méthode.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "GAME-engineering_3", count: 1 }),
    prerequisites: Object.freeze(["GAME-engineering_3"]),
    priority: 60,
    passivePriorityAxis: "research",
    sequence: Object.freeze([
      Object.freeze({ slot: "materials", title: "Analyser les matériaux de l'essai avancé", action: "analyze", target: 2, requires: Object.freeze([]), params: Object.freeze({ tagsAny: Object.freeze(["mineral", "technology"]) }) }),
      Object.freeze({ slot: "experiment", title: "Tenter l'assemblage au feu", action: "research", target: 1, requires: Object.freeze(["materials"]), params: Object.freeze({}) })
    ]),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 8 }),
      Object.freeze({ type: "inventory.consume", inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 10 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "fiber", quantity: 5 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "parts", quantity: 2 })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je peux aller un peu plus loin. Minerais, fibres, composants... voyons jusqu'où un simple feu de camp peut me mener."]),
      progress: Object.freeze([Object.freeze({ slot: "experiment", atCount: 1, text: "Ça chauffe assez fort, mais je contrôle mal la température et encore moins l'assemblage. Je perds trop de matière." })]),
      completed: Object.freeze(["Le feu suffit pour bricoler. Pas pour construire quelque chose de précis. Il me faut un vrai poste de travail."])
    })
  });

  const gameEngineering5 = Object.freeze({
    id: "GAME-engineering_5",
    experimentalPrerequisites: Object.freeze(["structural_design"]),
    title: "Concevoir un établi",
    description: "Formaliser le plan d'un véritable poste de travail après avoir constaté les limites du feu.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "GAME-engineering_4", count: 1 }),
    prerequisites: Object.freeze(["GAME-engineering_4", "GAME-base"]),
    priority: 59,
    passivePriorityAxis: "research",
    sequence: Object.freeze([
      Object.freeze({ slot: "design", title: "Définir les fonctions nécessaires de l'établi", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({}) }),
      Object.freeze({ slot: "blueprint", title: "Finaliser le Blueprint Établi", action: "research", target: 1, requires: Object.freeze(["design"]), params: Object.freeze({}) })
    ]),
    rewards: Object.freeze([Object.freeze({
      type: "research.blueprint",
      id: "workbench-build-v1",
      category: "construction",
      constructionKind: "workbench",
      mapId: "crystal",
      label: "Installer un établi",
      description: "Installer sur Crystal un poste de travail permanent pour les expériences et fabrications avancées.",
      requiresShelter: true
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Une surface stable, quelques outils, de quoi maintenir les pièces et contrôler mes essais... Je peux concevoir quelque chose de bien plus précis qu'un feu entouré de pierres."]),
      progress: Object.freeze([Object.freeze({ slot: "blueprint", atCount: 1, text: "Je sais ce que l'établi devra supporter. Il reste à transformer cette idée en plan réellement constructible." })]),
      completed: Object.freeze(["Le plan est prêt. Sur Crystal, je peux maintenant choisir où installer mon premier véritable établi."])
    })
  });

  const gameEngineering6 = Object.freeze({
    id: "GAME-engineering_6",
    title: "Installer l'établi",
    description: "Depuis Crystal, utiliser le Blueprint pour placer l'établi à l'endroit choisi par le joueur.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "GAME-engineering_5", count: 1 }),
    prerequisites: Object.freeze(["GAME-engineering_5", "GAME-base"]),
    priority: 58,
    passivePriorityAxis: "research",
    sequence: Object.freeze([
      Object.freeze({ slot: "prepare", title: "Préparer l'installation depuis le Blueprint", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({}) }),
      Object.freeze({ slot: "place", title: "Installer réellement l'établi sur Crystal", action: "research", target: 1, requires: Object.freeze(["prepare"]), params: Object.freeze({ catalogManaged: true }) })
    ]),
    proximityContexts: Object.freeze([Object.freeze({
      id: "engineering-workbench-installed",
      microSceneId: "MSC-CUSTOM-ETABLI-VIDE",
      fact: "gameEngineering6:workbenchInstalled",
      slot: "place",
      radius: 8
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["La Base est en place. Je peux enfin choisir un emplacement pour travailler sans gêner les installations principales."]),
      progress: Object.freeze([Object.freeze({ slot: "place", atCount: 1, text: "L'endroit doit rester accessible : je vais revenir souvent ici pour fabriquer, réparer et expérimenter." })]),
      completed: Object.freeze(["Mon établi est prêt. Je ne suis plus obligé d'improviser chaque expérience autour du feu."])
    })
  });



  const ENE01 = Object.freeze({
    id: "ENE-01",
    title: "Les traces laissées dans le vivant",
    description: "Comparer des plantes exposées puis vérifier sur un prélèvement que la trace énergétique appartient bien au vivant.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "interaction.observe", count: 1 }),
    triggerOnly: true,
    prerequisites: Object.freeze(["FLO-04"]),
    priority: 308,
    passivePriorityAxis: "research",
    ponderation: 0.7,
    sequence: Object.freeze([
      Object.freeze({ slot: "exposedPlant", title: "Observer une plante exposée", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ subject: "flora", tagsAny: Object.freeze(["prismatic", "crystal", "ground_cover"]), excludeCuoTypes: Object.freeze(["thermosap_moss", "fern", "lantern_mushrooms"]) }) }),
      Object.freeze({ slot: "controlPlant", title: "Observer un témoin végétal distinct", action: "observe", target: 1, requires: Object.freeze(["exposedPlant"]), params: Object.freeze({ subject: "flora", relation: Object.freeze({ fromSlot: "exposedPlant", sameBy: Object.freeze(["family"]), differentBy: Object.freeze(["instanceId"]) }) }) }),
      Object.freeze({ slot: "sample", title: "Prélever un spécimen compatible", action: "collect", target: 1, requires: Object.freeze(["controlPlant"]), params: Object.freeze({ subject: "flora", excludeKinds: Object.freeze(["wood"]) }) }),
      Object.freeze({ slot: "sampleStudy", title: "Réétudier le prélèvement", action: "analyze", target: 1, requires: Object.freeze(["sample"]), params: Object.freeze({ subject: "flora", excludeKinds: Object.freeze(["wood"]) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Une plante exposée porte une trace que je n’avais pas isolée jusque-là. Je vais la comparer avant de conclure."]),
      completed: Object.freeze(["La trace reste mesurable après prélèvement : le vivant peut retenir quelque chose de son environnement."])
    })
  });

  const ENE02 = Object.freeze({
    id: "ENE-02",
    title: "Le minerai qui garde le champ",
    description: "Comparer des minerais magnétiques et ordinaires, retrouver la signature ailleurs puis tester un fragment isolé.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "interaction.analyze", count: 1 }),
    triggerOnly: true,
    prerequisites: Object.freeze(["ENE-01", "GEO-06"]),
    priority: 307,
    passivePriorityAxis: "research",
    ponderation: 0.7,
    sequence: Object.freeze([
      Object.freeze({ slot: "magneticReference", title: "Analyser un minerai magnétique", action: "analyze", target: 1, requires: Object.freeze([]), params: Object.freeze({ cuoType: "magnetic_ore" }) }),
      Object.freeze({ slot: "ordinaryReference", title: "Comparer avec un autre minerai", action: "analyze", target: 1, requires: Object.freeze(["magneticReference"]), params: Object.freeze({ subject: "mineral", relation: Object.freeze({ fromSlot: "magneticReference", differentBy: Object.freeze(["objectId"]) }) }) }),
      Object.freeze({ slot: "secondOccurrence", title: "Retrouver la signature sur un autre territoire", action: "analyze", target: 1, requires: Object.freeze(["ordinaryReference"]), params: Object.freeze({ cuoType: "magnetic_ore", relation: Object.freeze({ fromSlot: "magneticReference", differentBy: Object.freeze(["mapId"]) }) }) }),
      Object.freeze({ slot: "isolatedFragment", title: "Prélever un fragment magnétique", action: "collect", target: 1, requires: Object.freeze(["secondOccurrence"]), params: Object.freeze({ cuoType: "magnetic_ore" }) }),
      Object.freeze({ slot: "isolatedStudy", title: "Vérifier le fragment isolé", action: "research", target: 1, requires: Object.freeze(["isolatedFragment"]), params: Object.freeze({}) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je dois savoir si le minerai n’est qu’un témoin du champ ou s’il en conserve réellement une propriété."]),
      completed: Object.freeze(["Le minerai conserve sa propriété loin du gisement : il peut concentrer une signature énergétique stable."])
    })
  });

  const ENE03 = Object.freeze({
    id: "ENE-03",
    title: "Après la tempête",
    description: "Observer un phénomène énergétique puis comparer la flore et le minerai affectés dans le même contexte.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "interaction.observe", count: 1 }),
    triggerOnly: true,
    prerequisites: Object.freeze(["ENE-01", "ENE-02"]),
    priority: 306,
    passivePriorityAxis: "research",
    ponderation: 0.8,
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-LOCAL-STORM-001", persistent: true, spawnOnce: true, contextRole: "energyStormContext" })])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reachStormMap", title: "Rejoindre un nouveau territoire soumis au phénomène", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "phenomenon", title: "Observer le phénomène énergétique", action: "observe", target: 1, requires: Object.freeze(["reachStormMap"]), params: Object.freeze({ cuoType: "electrostatic_storm", microSceneId: "MSC-LOCAL-STORM-001" }) }),
      Object.freeze({ slot: "affectedFlora", title: "Étudier la flore affectée", action: "analyze", target: 1, requires: Object.freeze(["phenomenon"]), params: Object.freeze({ cuoType: "fluorescent_vegetation", microSceneId: "MSC-LOCAL-STORM-001", relation: Object.freeze({ fromSlot: "phenomenon", sameBy: Object.freeze(["persistentMicroSceneId", "mapId"]) }) }) }),
      Object.freeze({ slot: "affectedMineral", title: "Étudier le minerai affecté", action: "analyze", target: 1, requires: Object.freeze(["affectedFlora"]), params: Object.freeze({ cuoType: "magnetic_ore", microSceneId: "MSC-LOCAL-STORM-001", relation: Object.freeze({ fromSlot: "affectedFlora", sameBy: Object.freeze(["persistentMicroSceneId", "mapId"]) }) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cette fois, je veux regarder ce que le phénomène transporte, pas seulement ce qu’il fait bouger."]),
      completed: Object.freeze(["La même variation apparaît dans le vivant et le minerai : le phénomène relie les deux supports."])
    })
  });

  const ENE04 = Object.freeze({
    id: "ENE-04",
    title: "Les îlots impossibles",
    description: "Relire les îlots suspendus avec l’hypothèse énergétique, sans rejouer les acquis de GEO-05.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 1, uniqueOnly: true }),
    prerequisites: Object.freeze(["ENE-02", "GEO-05"]),
    priority: 305,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({ id: "MSC-CUSTOM-ILES-SUSPENDUES2", persistent: true, spawnOnce: true, contextRole: "suspendedRocksContext" }),
        Object.freeze({ id: "MSC-SUSPENDED-ISLAND-001", persistent: true, spawnOnce: true, contextRole: "mobileIsletContext" })
      ]),
      requiredObjects: Object.freeze([Object.freeze({ type: "magnetic_ore", count: 1, contextRole: "magneticOreContext" })])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "islands", title: "Réexaminer une zone d’îlots suspendus", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-ILES-SUSPENDUES2" }) }),
      Object.freeze({ slot: "siteMineral", title: "Analyser le minerai du site", action: "analyze", target: 1, requires: Object.freeze(["islands"]), params: Object.freeze({ cuoType: "magnetic_ore", relation: Object.freeze({ fromSlot: "islands", sameBy: Object.freeze(["mapId"]) }) }) }),
      Object.freeze({ slot: "normalReference", title: "Comparer avec une référence hors anomalie", action: "analyze", target: 1, requires: Object.freeze(["siteMineral"]), params: Object.freeze({ subject: "mineral", relation: Object.freeze({ fromSlot: "siteMineral", differentBy: Object.freeze(["mapId"]) }) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["J’avais classé ces roches comme anomalie. Je peux maintenant les relire avec ce que j’ai appris des minerais magnétiques."]),
      completed: Object.freeze(["Les îlots relient les anomalies minérales locales à un phénomène capable d’agir à l’échelle du paysage."])
    })
  });

  const ENE05 = Object.freeze({
    id: "ENE-05",
    title: "Une même signature",
    description: "Faire converger les indices du vivant, des minerais et des phénomènes puis formuler une hypothèse énergétique unifiée.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-03", count: 1 }),
    prerequisites: Object.freeze(["ENE-03"]),
    priority: 304,
    passivePriorityAxis: "research",
    ponderation: 1,
    navigation: Object.freeze({ autonomousUnknownTravel: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "floraEvidence", title: "Raccorder l’indice végétal", action: "analyze", target: 1, requires: Object.freeze([]), params: Object.freeze({ subject: "flora" }) }),
      Object.freeze({ slot: "mineralEvidence", title: "Raccorder l’indice minéral", action: "analyze", target: 1, requires: Object.freeze(["floraEvidence"]), params: Object.freeze({ subject: "mineral" }) }),
      Object.freeze({ slot: "newMap", title: "Vérifier la signature sur une autre map", action: "travel", target: 1, requires: Object.freeze(["mineralEvidence"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "remoteEvidence", title: "Comparer une nouvelle mesure", action: "analyze", target: 1, requires: Object.freeze(["newMap"]), params: Object.freeze({ tagsAny: Object.freeze(["mineral", "plant", "glowing", "magnetic"]) }) }),
      Object.freeze({ slot: "hypothesis", title: "Formuler l’hypothèse énergétique unifiée", action: "research", target: 1, requires: Object.freeze(["remoteEvidence"]), params: Object.freeze({}) })
    ]),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKeys: Object.freeze(["fiber", "adaptive_biomass", "biocapital"]), quantity: 6 }),
      Object.freeze({ type: "inventory.consume", inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 6 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "crystal", quantity: 3 })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Plantes, minerais, tempêtes, îlots : ces indices commencent à former une seule chaîne."]),
      completed: Object.freeze(["Les observations convergent vers une même hypothèse : la planète transporte une énergie que certains minerais concentrent et que le vivant transforme."])
    })
  });

  const ENE06 = Object.freeze({
    id: "ENE-06",
    title: "Là où la pierre nourrit la plante",
    description: "Étudier une association locale entre flore et minerai, puis suivre les indices vers le Giant Tree.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-05", count: 1 }),
    prerequisites: Object.freeze(["ENE-05"]),
    priority: 303,
    passivePriorityAxis: "research",
    ponderation: 0.8,
    navigation: Object.freeze({ autonomousUnknownTravel: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({ id: "MSC-ECO-THERM-001", persistent: true, spawnOnce: true, contextRole: "thermalFloraMineralContext" }),
        Object.freeze({ id: "MSC-CUSTOM-GIANTCRISTAL-TREE", persistent: true, spawnOnce: true, contextRole: "giantTreeContext" })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reachThermalMap", title: "Rejoindre un nouveau territoire avec une veine thermique", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "floraPartner", title: "Analyser une mousse thermosève associée au basalte", action: "analyze", target: 1, requires: Object.freeze(["reachThermalMap"]), params: Object.freeze({ cuoType: "thermosap_moss", microSceneId: "MSC-ECO-THERM-001" }) }),
      Object.freeze({ slot: "mineralPartner", title: "Analyser le basalte résonant du même contexte", action: "analyze", target: 1, requires: Object.freeze(["floraPartner"]), params: Object.freeze({ cuoType: "resonant_basalt", microSceneId: "MSC-ECO-THERM-001", relation: Object.freeze({ fromSlot: "floraPartner", sameBy: Object.freeze(["persistentMicroSceneId", "mapId"]) }) }) }),
      Object.freeze({ slot: "nearPlant", title: "Comparer une seconde mousse thermosève", action: "analyze", target: 1, requires: Object.freeze(["mineralPartner"]), params: Object.freeze({ cuoType: "thermosap_moss", microSceneId: "MSC-ECO-THERM-001", relation: Object.freeze({ fromSlot: "floraPartner", sameBy: Object.freeze(["persistentMicroSceneId", "mapId"]), differentBy: Object.freeze(["instanceId"]) }) }) }),
      Object.freeze({ slot: "reachGiantTree", title: "Suivre les indices vers un nouveau territoire", action: "travel", target: 1, requires: Object.freeze(["nearPlant"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["La proximité entre le minerai et la flore devient elle-même un indice. Je vais suivre cette relation jusqu’à un cas impossible à confondre."]),
      completed: Object.freeze(["Les associations ordinaires convergent vers une concentration exceptionnelle : le Giant Tree peut maintenant trancher la question."])
    })
  });

  const ENE07 = Object.freeze({
    id: "ENE-07",
    title: "Le Giant Tree — La preuve vivante",
    description: "Étudier le Giant Tree comme système naturel complet reliant structures minérales et végétales.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-06", count: 1 }),
    prerequisites: Object.freeze(["ENE-06"]),
    priority: 302,
    passivePriorityAxis: "research",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({ slot: "architecture", title: "Observer l’architecture du Giant Tree", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ cuoType: "crystalline_tree", microSceneId: "MSC-CUSTOM-GIANTCRISTAL-TREE" }) }),
      Object.freeze({ slot: "livingComponent", title: "Analyser la composante végétale", action: "analyze", target: 1, requires: Object.freeze(["architecture"]), params: Object.freeze({ cuoType: "crystalline_tree", microSceneId: "MSC-CUSTOM-GIANTCRISTAL-TREE" }) }),
      Object.freeze({ slot: "mineralComponent", title: "Analyser une composante minérale du site", action: "analyze", target: 1, requires: Object.freeze(["livingComponent"]), params: Object.freeze({ subject: "mineral", microSceneId: "MSC-CUSTOM-GIANTCRISTAL-TREE", relation: Object.freeze({ fromSlot: "livingComponent", sameBy: Object.freeze(["persistentMicroSceneId", "mapId"]) }) }) }),
      Object.freeze({ slot: "synthesis", title: "Comparer le Giant Tree aux indices antérieurs", action: "research", target: 1, requires: Object.freeze(["mineralComponent"]), params: Object.freeze({}) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Ici, minerai et vivant ne sont plus voisins : ils forment un seul système."]),
      completed: Object.freeze(["Le Giant Tree ferme la chaîne : le minerai concentre, les structures vivantes captent et transforment une énergie stable."])
    })
  });

  const ENE08 = Object.freeze({
    id: "ENE-08",
    title: "Le sanctuaire comme étalon",
    description: "Transformer le Giant Tree en site de référence biologique et minérale pour les recherches suivantes.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-07", count: 1 }),
    prerequisites: Object.freeze(["ENE-07"]),
    priority: 301,
    passivePriorityAxis: "research",
    ponderation: 0.9,
    navigation: Object.freeze({ autonomousUnknownTravel: true, autonomousKnownReturn: true }),
    proximityContexts: Object.freeze([
      Object.freeze({
        id: "ene08-giant-tree-reference",
        fact: "ene08:giant-tree-reference",
        slot: "plantReference",
        microSceneId: "MSC-CUSTOM-GIANTCRISTAL-TREE",
        useSceneRadius: true
      }),
      Object.freeze({
        id: "ene08-giant-tree-return",
        fact: "ene08:giant-tree-return",
        slot: "returnValidation",
        microSceneId: "MSC-CUSTOM-GIANTCRISTAL-TREE",
        useSceneRadius: true,
        requiredMapFact: "ene08:giant-tree-reference",
        requiredMapField: "mapId"
      })
    ]),
    sequence: Object.freeze([
      Object.freeze({ slot: "plantReference", title: "Établir la référence du Giant Tree par proximité", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "mineralReference", title: "Établir la référence minérale du site", action: "analyze", target: 1, requires: Object.freeze(["plantReference"]), params: Object.freeze({ subject: "mineral", microSceneId: "MSC-CUSTOM-GIANTCRISTAL-TREE", requiredMapFact: "ene08:giant-tree-reference", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "leaveReference", title: "Quitter le site pour préparer un contrôle", action: "travel", target: 1, requires: Object.freeze(["mineralReference"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "returnToReference", title: "Revenir sur la map de référence du Giant Tree", action: "travel", target: 1, requires: Object.freeze(["leaveReference"]), params: Object.freeze({ eventDriven: true, targetMapFact: "ene08:giant-tree-reference", targetMapField: "mapId", distinctBy: "transition" }) }),
      Object.freeze({ slot: "returnValidation", title: "Revenir à proximité du même Giant Tree", action: "observe", target: 1, requires: Object.freeze(["returnToReference"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le Giant Tree peut devenir mon étalon, à condition que ses références restent reproductibles après un retour."]),
      completed: Object.freeze(["Le Giant Tree est désormais mon point de contrôle naturel pour les recherches énergétiques."])
    })
  });

  const ENE09 = Object.freeze({
    id: "ENE-09",
    title: "Le bon couple de matériaux",
    description: "Comparer plusieurs supports végétaux et minerais puis valider au Giant Tree le couple le plus prometteur.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-08", count: 1 }),
    prerequisites: Object.freeze(["ENE-08"]),
    priority: 300,
    passivePriorityAxis: "research",
    ponderation: 0.7,
    sequence: Object.freeze([
      Object.freeze({ slot: "plants", title: "Comparer trois supports végétaux", action: "analyze", target: 3, requires: Object.freeze([]), params: Object.freeze({ subject: "flora", distinctBy: "objectId", excludeKinds: Object.freeze(["wood"]) }) }),
      Object.freeze({ slot: "minerals", title: "Comparer trois stabilisateurs minéraux", action: "analyze", target: 3, requires: Object.freeze(["plants"]), params: Object.freeze({ subject: "mineral", distinctBy: "objectId" }) }),
      Object.freeze({ slot: "couple", title: "Valider le couple au Giant Tree", action: "analyze", target: 1, requires: Object.freeze(["minerals"]), params: Object.freeze({ cuoType: "crystalline_tree", microSceneId: "MSC-CUSTOM-GIANTCRISTAL-TREE" }) })
    ]),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKeys: Object.freeze(["fiber", "adaptive_biomass", "biocapital"]), quantity: 12 }),
      Object.freeze({ type: "inventory.consume", inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 12 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "crystal", quantity: 6 })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["L’arbre me montre une fonction, pas une recette. Je dois isoler les matériaux capables de recevoir puis stabiliser la charge."]),
      completed: Object.freeze(["Un couple se distingue : un support végétal pour recevoir la charge et un minerai magnétique pour la concentrer et la stabiliser."])
    })
  });

  const ENE10 = Object.freeze({
    id: "ENE-10",
    title: "Une charge qui voyage",
    description: "Obtenir une charge expérimentale au Giant Tree, s’en éloigner puis reproduire l’expérience sans créer encore d’accumulateur persistant.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-09", count: 1 }),
    prerequisites: Object.freeze(["ENE-09"]),
    priority: 299,
    passivePriorityAxis: "research",
    ponderation: 0.85,
    navigation: Object.freeze({ autonomousUnknownTravel: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "charge", title: "Charger expérimentalement le support au Giant Tree", action: "analyze", target: 1, requires: Object.freeze([]), params: Object.freeze({ cuoType: "crystalline_tree", microSceneId: "MSC-CUSTOM-GIANTCRISTAL-TREE" }) }),
      Object.freeze({ slot: "leave", title: "Éloigner l’expérience du sanctuaire", action: "travel", target: 1, requires: Object.freeze(["charge"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "remoteCheck", title: "Vérifier la charge après déplacement", action: "research", target: 1, requires: Object.freeze(["leave"]), params: Object.freeze({}) }),
      Object.freeze({ slot: "repeat", title: "Reproduire l’expérience", action: "research", target: 2, requires: Object.freeze(["remoteCheck"]), params: Object.freeze({}) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le prochain seuil est simple : emporter l’effet sans emporter l’arbre."]),
      completed: Object.freeze(["L’expérience reste cohérente après déplacement et peut être reproduite. Cela prépare une application technique, sans fabriquer encore d’accumulateur."])
    })
  });


  const ENE11 = Object.freeze({
    id: "ENE-11",
    experimentalPrerequisites: Object.freeze(["energy_control"]),
    title: "Premier accumulateur",
    description: "Revenir à l’établi de Crystal, assembler un premier prototype avec des ressources réelles puis valider que la charge reste exploitable.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-10", count: 1 }),
    initialState: "active",
    prerequisites: Object.freeze(["ENE-10", "GAME-engineering_6"]),
    priority: 298,
    passivePriorityAxis: "research",
    ponderation: 0.9,
    sequence: Object.freeze([
      Object.freeze({ slot: "prototype", title: "Assembler le prototype à l’établi", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "charge", title: "Valider narrativement la charge du prototype", action: "research", target: 1, requires: Object.freeze(["prototype"]), params: Object.freeze({}) })
    ]),
    proximityContexts: Object.freeze([Object.freeze({
      id: "ene11-workbench-prototype",
      microSceneId: "MSC-CUSTOM-ETABLI-VIDE",
      fact: "ene11:workbenchPrototype:v1",
      slot: "prototype",
      radius: 8
    })]),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 12 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "crystal", quantity: 8 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "fiber", quantity: 6 })
    ]),
    rewards: Object.freeze([Object.freeze({
      type: "research.recipe",
      id: "accumulator-basic-v1",
      category: "energy",
      label: "Fabriquer un accumulateur",
      description: "Assembler un accumulateur transportable à l’établi.",
      requiresShelter: true,
      requiresWorkbench: true,
      mapId: "crystal",
      requirements: Object.freeze([
        Object.freeze({ inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 12 }),
        Object.freeze({ inventoryKey: "crystal", quantity: 8 }),
        Object.freeze({ inventoryKey: "fiber", quantity: 6 })
      ]),
      output: Object.freeze({ objectId: "accumulator", quantity: 1 })
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["L’expérience voyage. Il me faut maintenant un contenant réel, assemblé proprement à l’établi."]),
      progress: Object.freeze([Object.freeze({ slot: "prototype", atCount: 1, text: "Le prototype tient. La charge elle-même reste une propriété du montage, pas un nouvel objet à stocker." })]),
      completed: Object.freeze(["Le prototype a rempli son rôle. Je peux désormais fabriquer de vrais accumulateurs transportables à l’établi."])
    })
  });

  const ENE12 = Object.freeze({
    id: "ENE-12",
    title: "Réveiller une ancienne machine",
    description: "Transporter un accumulateur jusqu’à une machine abandonnée et lui céder cette réserve d’énergie.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-11", count: 1 }),
    prerequisites: Object.freeze(["ENE-11"]),
    priority: 297,
    passivePriorityAxis: "research",
    ponderation: 0.95,
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-MACHINE-ABANDONNEE", persistent: true, spawnOnce: true, contextRole: "energyMachineTest" })])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "approach", title: "Approcher la machine abandonnée avec un accumulateur", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "machine", title: "Céder l’accumulateur à la machine", action: "research", target: 1, requires: Object.freeze(["approach"]), params: Object.freeze({ catalogManaged: true }) })
    ]),
    proximityContexts: Object.freeze([
      Object.freeze({
        id: "ene12-machine-approach",
        microSceneId: "MSC-CUSTOM-MACHINE-ABANDONNEE",
        fact: "ene12:machineApproached:v1",
        slot: "approach",
        radius: 3.5
      }),
      Object.freeze({
        id: "ene12-machine-proximity",
        microSceneId: "MSC-CUSTOM-MACHINE-ABANDONNEE",
        fact: "ene12:machineReached:v1",
        slot: "machine",
        radius: 3.5,
        inventoryConsume: Object.freeze({
          inventoryKey: "accumulator",
          quantity: 1,
          missingMessage: "Il me faut un accumulateur réel dans mon inventaire avant d’alimenter cette machine."
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Un accumulateur n’a d’intérêt que s’il peut alimenter autre chose que mes propres essais. Une vieille machine fera un bon test."]),
      completed: Object.freeze(["L’accumulateur a été cédé à la machine. Elle répond de nouveau : assez pour confirmer que cette énergie peut alimenter une technologie existante."])
    })
  });

  const ENE13 = Object.freeze({
    id: "ENE-13",
    title: "Donner de l’autonomie au drone",
    description: "Réutiliser le drone éclaireur existant, lui consacrer ses composants et un accumulateur puis confirmer un premier balayage autonome d’un plateau sur la map courante.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-12", count: 1 }),
    prerequisites: Object.freeze(["ENE-12"]),
    priority: 296,
    passivePriorityAxis: "research",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({ slot: "activate", title: "Activer le drone éclaireur avec un accumulateur", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "scout", title: "Laisser le drone balayer un plateau de cette map", action: "research", target: 1, requires: Object.freeze(["activate"]), params: Object.freeze({ catalogManaged: true }) })
    ]),
    runtimeValidation: Object.freeze({ type: "ene13-scout-drone", activationSlot: "activate", scoutSlot: "scout" }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le drone éclaireur existe déjà. Je n’ai pas besoin d’en inventer un autre : seulement de lui donner une réserve d’énergie autonome."]),
      progress: Object.freeze([Object.freeze({ slot: "activate", atCount: 1, text: "L’accumulateur est engagé. Maintenant je veux voir ce que le drone sait réellement repérer seul, ici, sur cette map." })]),
      completed: Object.freeze(["Le drone a balayé son premier plateau de façon autonome. Il transporte surtout de l’information ; c’est exactement ce qu’il me faut."])
    })
  });

  const ENE14 = Object.freeze({
    id: "ENE-14",
    experimentalPrerequisites: Object.freeze(["biotic_energy_symbiosis", "deep_geology", "energy_resonance"]),
    title: "Le réseau énergétique planétaire",
    description: "Relier trois mesures de cristaux chargés, calibrer la lecture au Giant Tree puis formaliser la synthèse dans Recherche.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-13", count: 1 }),
    prerequisites: Object.freeze(["ENE-13"]),
    priority: 295,
    passivePriorityAxis: "research",
    concurrentAvailabilityGroup: "ENE-13-BRANCH",
    ponderation: 1,
    navigation: Object.freeze({ autonomousUnknownTravel: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CHARGED-CRYSTALS-001", persistent: true, spawnOnce: true, contextRole: "energyNetworkSample" })])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "measurements", title: "Comparer la signature sur trois maps", action: "analyze", target: 3, requires: Object.freeze([]), params: Object.freeze({ objectId: "RES-ENER-M-001", distinctBy: "mapId" }) }),
      Object.freeze({ slot: "calibration", title: "Calibrer la lecture au Giant Tree", action: "research", target: 1, requires: Object.freeze(["measurements"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "synthesis", title: "Formaliser la synthèse dans Recherche", action: "research", target: 1, requires: Object.freeze(["calibration"]), params: Object.freeze({}) })
    ]),
    proximityContexts: Object.freeze([Object.freeze({
      id: "ene14-giant-tree-calibration",
      microSceneId: "MSC-CUSTOM-GIANTCRISTAL-TREE",
      fact: "ene14:giantTreeCalibration:v1",
      slot: "calibration",
      radius: 5
    })]),
    runtimeValidation: Object.freeze({ type: "ene14-energy-network", reuseMissionId: "GEO-07", reuseSlot: "measurements", reuseAmount: 3 }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Les mesures locales et le Giant Tree commencent à dessiner la même chose : un réseau énergétique à l’échelle de la planète."]),
      completed: Object.freeze(["La synthèse tient : les signatures mesurées et le Giant Tree appartiennent au même réseau énergétique planétaire. Ce réseau reste une interprétation de mesures réelles, pas un nouvel objet physique."])
    })
  });




  const ENE15A = Object.freeze({
    id: "ENE-15-A",
    title: "Reconnaître une technologie du réseau",
    description: "Après la synthèse énergétique, réexaminer une technologie ancienne réellement conservée au Temple des savoirs et reconnaître qu’elle appartient au même réseau planétaire.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "DIP-03", count: 1 }),
    prerequisites: Object.freeze(["ENE-14", "ARCH-17", "DIP-03"]),
    requiredFacts: Object.freeze(["shared_civilization_knowledge"]),
    priority: 294,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 82,
    sequence: Object.freeze([
      Object.freeze({
        slot: "observeNetworkTechnology",
        title: "Reconnaître une technologie ancienne du réseau",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "tech_relic",
          microSceneId: "MSC-CUSTOM-HUGE-TEMPLE",
          requiredMapFact: "dip03:temple-map",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "analyzeNetworkTechnology",
        title: "Comparer sa signature au réseau planétaire",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["observeNetworkTechnology"]),
        params: Object.freeze({
          cuoType: "tech_relic",
          microSceneId: "MSC-CUSTOM-HUGE-TEMPLE",
          requiredMapFact: "dip03:temple-map",
          requiredMapField: "mapId",
          relation: Object.freeze({
            fromSlot: "observeNetworkTechnology",
            sameBy: Object.freeze(["instanceId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["La relique énergétique n’est plus une curiosité isolée. Avec ce que je sais du réseau et des archives communes, je peux enfin la relire correctement."]),
      progress: Object.freeze([Object.freeze({ slot: "observeNetworkTechnology", atCount: 1, text: "Cette technologie appartient bien au même langage énergétique que les structures déjà étudiées. Je dois maintenant confronter sa signature au réseau planétaire." })]),
      completed: Object.freeze(["Sa signature rejoint la trame planétaire : la maîtrise ancienne du réseau n’était pas locale, elle était pensée comme une architecture cohérente."])
    })
  });

  const ENE15B = Object.freeze({
    id: "ENE-15-B",
    title: "Obtenir la connaissance manquante",
    description: "Revenir au Temple des savoirs et confronter l’interprétation énergétique de BlueFox à la mémoire vivante de l’alliance Rocky–Translucide.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-15-A", count: 1 }),
    prerequisites: Object.freeze(["ENE-15-A", "DIP-03"]),
    requiredFacts: Object.freeze(["shared_civilization_knowledge"]),
    priority: 293,
    passivePriorityAxis: "relations",
    ponderation: 0.8,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 90,
    slots: Object.freeze({
      study: Object.freeze({
        title: "Consulter une délégation au Temple des savoirs",
        target: 1,
        params: Object.freeze({
          cuoType: "npc_rocky",
          persistentMicroSceneId: "DIP-03:delegate:rocky:1",
          requiredMapFact: "dip03:temple-map",
          requiredMapField: "mapId"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je peux suivre les traces des anciens, mais pas deviner tout ce qu’ils savaient. Il me faut une mémoire vivante, pas seulement une relique."]),
      completed: Object.freeze(["Le savoir partagé donne enfin un sens à l’architecture : ces nœuds n’étaient pas seulement alimentés, ils étaient synchronisés entre eux."])
    })
  });

  const ENE15C = Object.freeze({
    id: "ENE-15-C",
    title: "Comprendre le transfert de matière",
    description: "Formaliser la compréhension du transfert de matière comme branche de recherche tardive, sans fabriquer ni débloquer encore de téléporteur opérationnel.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-15-B", count: 1 }),
    prerequisites: Object.freeze(["ENE-15-B", "ENE-14", "ARCH-17", "DIP-03", "GAME-engineering_6"]),
    experimentalPrerequisites: Object.freeze(["advanced_engineering"]),
    requiredFacts: Object.freeze(["shared_civilization_knowledge"]),
    priority: 292,
    passivePriorityAxis: "engineering",
    ponderation: 0.8,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 100,
    sequence: Object.freeze([
      Object.freeze({
        slot: "nodeSynchronization",
        title: "Formuler le principe de synchronisation de deux nœuds",
        action: "research",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ duration: 6500 })
      }),
      Object.freeze({
        slot: "matterTransferResearch",
        title: "Formaliser la recherche sur le transfert de matière",
        action: "research",
        target: 1,
        requires: Object.freeze(["nodeSynchronization"]),
        params: Object.freeze({ duration: 6500 })
      })
    ]),
    rewards: Object.freeze([Object.freeze({
      type: "research.knowledge",
      id: "matter_transfer_research",
      category: "energy",
      label: "Recherche sur le transfert de matière",
      description: "Comprendre le principe de synchronisation de nœuds distants et ouvrir une branche de recherche tardive sans débloquer directement la téléportation."
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["L’énergie n’était que la moitié du problème. Les anciens synchronisaient des nœuds avant de déplacer quoi que ce soit."]),
      progress: Object.freeze([Object.freeze({ slot: "nodeSynchronization", atCount: 1, text: "Je comprends enfin pourquoi certaines structures existent par paires : leur fonction dépend d’un état partagé du réseau." })]),
      completed: Object.freeze(["Le transfert de matière devient techniquement concevable, mais il reste dangereux et verrouillé. Je n’ai débloqué qu’une branche de recherche, pas un téléporteur."])
    })
  });


  const BAL01 = Object.freeze({
    id: "BAL-01",
    title: "Comprendre une balise abandonnée",
    description: "Retrouver une balise d’arpentage abandonnée et analyser son principe de relais fixe après les premiers essais du drone éclaireur.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-13", count: 1 }),
    prerequisites: Object.freeze(["ENE-13"]),
    priority: 295,
    passivePriorityAxis: "research",
    concurrentAvailabilityGroup: "ENE-13-BRANCH",
    ponderation: 1,
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([Object.freeze({
        id: "MSC-TECH-RELAY-001",
        persistent: true,
        spawnOnce: true,
        contextRole: "beaconReverseEngineeringSource"
      })])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "analyzeBeacon",
        title: "Analyser une balise d’arpentage abandonnée",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ cuoType: "survey_beacon" })
      }),
      Object.freeze({
        slot: "understandRelay",
        title: "Interpréter le principe de relais",
        action: "research",
        target: 1,
        requires: Object.freeze(["analyzeBeacon"]),
        params: Object.freeze({ catalogManaged: true })
      })
    ]),
    proximityContexts: Object.freeze([Object.freeze({
      id: "bal01-relay-understanding",
      microSceneId: "MSC-TECH-RELAY-001",
      fact: "bal01:relayUnderstood:v1",
      slot: "understandRelay",
      radius: 5
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le Scout fonctionne, mais sans repère fixe il reste lié à ma présence. Les anciennes balises d’arpentage pourraient expliquer comment maintenir un lien avec une zone distante."]),
      completed: Object.freeze(["Cette balise ne transporte rien : elle maintient surtout un repère technique stable. Je peux probablement en reconstruire le principe à l’établi."])
    })
  });

  const BAL02 = Object.freeze({
    id: "BAL-02",
    title: "Rétroconcevoir une balise",
    description: "Revenir à l’établi, reproduire le principe du relais étudié et formaliser un Blueprint de balise transportable.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "BAL-01", count: 1 }),
    prerequisites: Object.freeze(["BAL-01", "GAME-engineering_6"]),
    priority: 294,
    passivePriorityAxis: "research",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({
        slot: "reverseEngineer",
        title: "Rétroconcevoir le relais à l’établi",
        action: "research",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ catalogManaged: true })
      }),
      Object.freeze({
        slot: "formalizeBlueprint",
        title: "Formaliser le Blueprint de la balise",
        action: "research",
        target: 1,
        requires: Object.freeze(["reverseEngineer"]),
        params: Object.freeze({ catalogManaged: true })
      })
    ]),
    proximityContexts: Object.freeze([
      Object.freeze({
        id: "bal02-workbench-reverse-engineering",
        microSceneId: "MSC-CUSTOM-ETABLI-VIDE",
        fact: "bal02:workbenchReverseEngineering:v1",
        slot: "reverseEngineer",
        radius: 8
      }),
      Object.freeze({
        id: "bal02-workbench-blueprint",
        microSceneId: "MSC-CUSTOM-ETABLI-VIDE",
        fact: "bal02:workbenchBlueprint:v1",
        slot: "formalizeBlueprint",
        radius: 8
      })
    ]),
    rewards: Object.freeze([Object.freeze({
      type: "research.recipe",
      id: "deployed-beacon-v1",
      category: "technology",
      label: "Balise d’arpentage BlueFox",
      description: "Assembler une balise transportable destinée à être implantée comme relais persistant.",
      requiresShelter: true,
      requiresWorkbench: true,
      requirements: Object.freeze([
        Object.freeze({ inventoryKey: "core", quantity: 1 }),
        Object.freeze({ inventoryKey: "accumulator", quantity: 1 }),
        Object.freeze({ inventoryKey: "parts", quantity: 6 }),
        Object.freeze({ inventoryKey: "wood", quantity: 8 }),
        Object.freeze({ inventoryKey: "stellar_iridium", quantity: 4 })
      ]),
      output: Object.freeze({ objectId: "deployed_beacon", quantity: 1 })
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le principe est simple, mais pas rudimentaire : un mât, un noyau de calcul, une réserve d’énergie et des matériaux capables de maintenir le signal proprement."]),
      completed: Object.freeze(["Le Blueprint est cohérent. Je peux maintenant fabriquer une balise reconnaissable des anciennes et l’emporter dans mon Kit d’expédition."])
    })
  });

  const BAL03 = Object.freeze({
    id: "BAL-03",
    title: "Implanter un premier relais",
    description: "S’éloigner de trois nouvelles maps, atteindre un plateau riche en minerai puis y implanter une balise BlueFox persistante.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "BAL-02", count: 1 }),
    prerequisites: Object.freeze(["BAL-02"]),
    priority: 293,
    passivePriorityAxis: "exploration",
    ponderation: 1,
    navigation: Object.freeze({ autonomousUnknownTravel: true, repeatUnknownTravelUntilComplete: true }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachRemoteMap",
        title: "Découvrir 3 nouvelles maps avant l’implantation",
        action: "travel",
        target: 3,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId",
          mapGenerationOnCount: Object.freeze({
            3: Object.freeze({
              size: 1,
              biome: "magnetic",
              requiredObjects: Object.freeze([Object.freeze({
                type: "magnetic_ore",
                count: 10,
                contextRole: "firstRemoteHarvestRichVein"
              })])
            })
          })
        })
      }),
      Object.freeze({
        slot: "deployBeacon",
        title: "Implanter la balise sur le plateau riche",
        action: "research",
        target: 1,
        requires: Object.freeze(["reachRemoteMap"]),
        params: Object.freeze({ catalogManaged: true })
      })
    ]),
    runtimeValidation: Object.freeze({
      type: "bal03-deployed-beacon",
      slot: "deployBeacon",
      requiredMapFact: "tutorialExcursion:BAL-03",
      requiredMapField: "generatedTargetMapId"
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Une balise n’a d’intérêt que si elle m’évite un aller-retour inutile. Je vais l’installer assez loin de mes bases, sur une petite zone dont les ressources justifient un relais permanent."]),
      progress: Object.freeze([Object.freeze({ slot: "reachRemoteMap", atCount: 3, text: "Cette zone est assez éloignée et le minerai y est abondant. C’est exactement le type d’endroit où un relais autonome peut devenir utile." })]),
      completed: Object.freeze(["La balise violette est implantée et persiste comme repère de cette map. Un drone pourra désormais utiliser ce relais au lieu de dépendre systématiquement de mon retour physique."])
    })
  });

  const DRN01 = Object.freeze({
    id: "DRN-01",
    experimentalPrerequisites: Object.freeze(["reverse_engineering"]),
    title: "Comprendre le Scout",
    description: "Démonter intellectuellement le Scout déjà opérationnel afin de formaliser son architecture reproductible.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "BAL-03", count: 1 }),
    prerequisites: Object.freeze(["BAL-03", "ENE-13"]),
    priority: 292,
    passivePriorityAxis: "research",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({ slot: "core", title: "Analyser l'architecture du Scout", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "blueprint", title: "Formaliser le Blueprint Scout", action: "research", target: 1, requires: Object.freeze(["core"]), params: Object.freeze({ catalogManaged: true }) })
    ]),
    proximityContexts: Object.freeze([
      Object.freeze({ id: "drn01-scout-core", microSceneId: "MSC-CUSTOM-ETABLI-VIDE", fact: "drn01:scoutCore:v1", slot: "core", radius: 8 }),
      Object.freeze({ id: "drn01-scout-blueprint", microSceneId: "MSC-CUSTOM-ETABLI-VIDE", fact: "drn01:scoutBlueprint:v1", slot: "blueprint", radius: 8 })
    ]),
    rewards: Object.freeze([Object.freeze({
      type: "research.drone-blueprint",
      id: "scout-drone-blueprint-v1",
      category: "technology",
      label: "Blueprint Scout",
      description: "Architecture reproductible du drone éclaireur existant."
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le Scout fonctionne. Je veux maintenant comprendre ce qui, dans son noyau, rend son autonomie reproductible."]),
      completed: Object.freeze(["Le Blueprint Scout est formalisé. Son architecture énergétique et son guidage ne sont plus une boîte noire."])
    })
  });

  const DRN02 = Object.freeze({
    id: "DRN-02",
    title: "Du regard à la récolte",
    description: "Transposer l'architecture du Scout vers un drone capable de manipuler des ressources et de gérer un cargo.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "DRN-01", count: 1 }),
    prerequisites: Object.freeze(["DRN-01", "BAL-03"]),
    priority: 291,
    passivePriorityAxis: "research",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({ slot: "manipulation", title: "Étudier une architecture de manipulation", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "cargo", title: "Concevoir le cargo et la logique de retour", action: "research", target: 1, requires: Object.freeze(["manipulation"]), params: Object.freeze({ catalogManaged: true }) })
    ]),
    proximityContexts: Object.freeze([
      Object.freeze({ id: "drn02-manipulation", microSceneId: "MSC-CUSTOM-ETABLI-VIDE", fact: "drn02:manipulation:v1", slot: "manipulation", radius: 8 }),
      Object.freeze({ id: "drn02-cargo", microSceneId: "MSC-CUSTOM-ETABLI-VIDE", fact: "drn02:cargo:v1", slot: "cargo", radius: 8 })
    ]),
    rewards: Object.freeze([Object.freeze({
      type: "research.drone-blueprint",
      id: "harvest-drone-blueprint-v1",
      category: "technology",
      label: "Blueprint Harvest",
      description: "Architecture de drone récolteur avec cargo logique et pilotage par priorité."
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Voir ne suffit plus. Je peux adapter ce que j'ai appris du Scout à un châssis capable de saisir, trier et rapporter des ressources."]),
      completed: Object.freeze(["Le Blueprint Harvest est prêt. Il ne reste qu'à tester une vraie récolte distante sur une map balisée."])
    })
  });

  const DRN03 = Object.freeze({
    id: "DRN-03",
    title: "Une récolte qui reste là-bas",
    description: "Déployer un Harvest sur une map balisée, lui donner une priorité puis confirmer une première collecte pendant l'absence de BlueFox.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "DRN-02", count: 1 }),
    prerequisites: Object.freeze(["DRN-02", "BAL-03"]),
    priority: 290,
    passivePriorityAxis: "research",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({ slot: "deploy", title: "Déployer un Harvest sur une map balisée", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "priority", title: "Choisir sa première priorité de collecte", action: "research", target: 1, requires: Object.freeze(["deploy"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "remoteCollect", title: "Confirmer une collecte distante pendant l'absence de BlueFox", action: "research", target: 1, requires: Object.freeze(["priority"]), params: Object.freeze({ catalogManaged: true }) })
    ]),
    runtimeValidation: Object.freeze({ type: "drn03-remote-harvest", deploySlot: "deploy", prioritySlot: "priority", collectSlot: "remoteCollect" }),
    narrative: Object.freeze({
      revealed: Object.freeze(["La balise est en place. Je peux enfin vérifier qu'un Harvest reste utile lorsque je quitte réellement la zone."]),
      completed: Object.freeze(["La récolte a continué sans moi. La balise ne sert plus seulement de repère : elle ancre un véritable réseau de travail distant."])
    })
  });

  const DRN04 = Object.freeze({
    id: "DRN-04",
    title: "Régler le réseau",
    description: "Piloter un Harvest depuis Recherche, modifier sa priorité et valider le dépôt logique de son cargo vers les stocks du camp ou de la base.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "DRN-03", count: 1 }),
    prerequisites: Object.freeze(["DRN-03"]),
    priority: 289,
    passivePriorityAxis: "research",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({ slot: "console", title: "Consulter l'état du drone dans Recherche", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "priority", title: "Modifier ou confirmer sa priorité", action: "research", target: 1, requires: Object.freeze(["console"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "deposit", title: "Valider un dépôt de cargo vers les stocks", action: "research", target: 1, requires: Object.freeze(["priority"]), params: Object.freeze({ catalogManaged: true }) })
    ]),
    runtimeValidation: Object.freeze({ type: "drn04-network-console", consoleSlot: "console", prioritySlot: "priority", depositSlot: "deposit" }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le réseau fonctionne. Il faut maintenant pouvoir le lire et le régler sans transformer chaque drone en nouvelle mission logistique."]),
      completed: Object.freeze(["Le réseau est réglable depuis Recherche, et le cargo rejoint les stocks sans gonfler deux fois l'historique de collecte."])
    })
  });

  const DRN05 = Object.freeze({
    id: "DRN-05",
    title: "Dépannage sur le terrain",
    description: "Rejoindre le drone réellement en panne et le réparer sur place avec les ressources que BlueFox transporte.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "manual", count: 1 }),
    prerequisites: Object.freeze([]),
    repeatable: true,
    targetBinding: "instance",
    priority: 288,
    passivePriorityAxis: "protection",
    ponderation: 1,
    navigation: Object.freeze({ autonomousKnownReturn: true }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachDrone",
        title: "Rejoindre la map du drone en panne",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          targetMapFact: "droneRepairTarget:DRN-05",
          targetMapField: "mapId",
          distinctBy: "transition"
        })
      }),
      Object.freeze({
        slot: "repairDrone",
        title: "Rejoindre et réparer le drone en panne",
        action: "inspect",
        target: 1,
        requires: Object.freeze(["reachDrone"]),
        params: Object.freeze({
          catalogManaged: true,
          requiredMapFact: "droneRepairTarget:DRN-05",
          requiredMapField: "mapId"
        })
      })
    ]),
    runtimeValidation: Object.freeze({
      type: "drone-field-repair",
      targetFact: "droneRepairTarget:DRN-05",
      travelSlot: "reachDrone",
      repairSlot: "repairDrone"
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Un drone s’est arrêté loin d’ici. Je dois le rejoindre avec de quoi le remettre en état ; les réserves restées au camp ne m’aideront pas une fois sur place."]),
      completed: Object.freeze(["Le drone est de nouveau opérationnel. Il reprend son travail là où la panne l’avait interrompu."])
    })
  });

  const FAU01 = Object.freeze({
    id: "FAU-01",
    title: "Approche prudente",
    description:
      "Découvrir un nid de faune puis approcher une créature avec précaution, sans provoquer sa fuite.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      count: 1,
      uniqueOnly: true,
      featuredMicroSceneIdsAny: Object.freeze(["MSC-CUSTOM-NID-DE-FAUNE5"])
    }),
    prerequisites: Object.freeze([]),
    priority: 323,
    passivePriorityAxis: "relations",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 20,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true
    }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-NID-DE-FAUNE5",
          persistent: true,
          spawnOnce: true,
          contextRole: "faunaFirstApproach"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachFaunaNest",
        title: "Rejoindre un territoire où un nid de faune est présent",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ eventDriven: true, newOnly: true })
      }),
      Object.freeze({
        slot: "cautiousApproach",
        title: "Approcher une créature progressivement sans la faire fuir",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachFaunaNest"]),
        params: Object.freeze({
          subject: "fauna",
          microSceneId: "MSC-CUSTOM-NID-DE-FAUNE5",
          tagsAll: Object.freeze(["fauna_behavior", "cautious_approach", "no_flee"])
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je vais ralentir avant d'entrer dans sa zone proche et observer sa réaction."
      ]),
      completed: Object.freeze([
        "En marquant des arrêts et en réduisant progressivement la distance, je peux approcher sans déclencher de fuite."
      ])
    })
  });

  const FAU02 = Object.freeze({
    id: "FAU-02",
    title: "Territoire animal",
    description:
      "Découvrir la même définition de nid de faune sur trois maps distinctes ; les deux changements de territoire matérialisent les deux limites territoriales.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      count: 1,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["FAU-01"]),
    priority: 322,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 34,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-NID-DE-FAUNE5",
          persistent: true,
          spawnOnce: true,
          contextRole: "faunaTerritoryContext"
        })
      ])
    }),
    slots: Object.freeze({
      context: Object.freeze({
        title: "Identifier trois territoires occupés par le même type de nid",
        target: 3,
        params: Object.freeze({
          microSceneId: "MSC-CUSTOM-NID-DE-FAUNE5",
          distinctBy: "mapId"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ses déplacements dessinent une frontière plus nette que je ne le pensais. Je vais retrouver le même type de nid sur plusieurs territoires."
      ]),
      completed: Object.freeze([
        "La même définition de nid apparaît sur trois maps distinctes. Les deux passages entre ces territoires matérialisent deux limites sans supposer qu’une même instance physique ait migré."
      ])
    })
  });


  const FAU03 = Object.freeze({
    id: "FAU-03",
    title: "Rythme jour et nuit",
    description:
      "Observer calmement une créature durant une période du cycle puis confirmer une nouvelle observation durant la période opposée.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "FAU-02",
      count: 1
    }),
    prerequisites: Object.freeze(["FAU-02"]),
    priority: 321,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "firstPeriod",
        title: "Observer calmement une créature dans la période actuelle",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "calm_nearby"])
        })
      }),
      Object.freeze({
        slot: "oppositePeriod",
        title: "Confirmer une observation dans la période opposée",
        action: "observe",
        target: 1,
        requires: Object.freeze(["firstPeriod"]),
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "temporal_contrast"])
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je veux comparer le même type de présence animale entre jour et nuit, sans confondre le cycle réel avec l'heure de l'interface."
      ]),
      completed: Object.freeze([
        "Deux observations calmes dans des périodes opposées du cycle réel confirment une variation temporelle exploitable."
      ])
    })
  });

  const FAU04 = Object.freeze({
    id: "FAU-04",
    title: "Distance et réaction",
    description:
      "Comparer une approche prudente, une fuite provoquée par une approche rapide et un retour au calme près d'une créature déjà approchée avec précaution.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "FAU-03",
      count: 1
    }),
    prerequisites: Object.freeze(["FAU-03"]),
    priority: 320,
    passivePriorityAxis: "relations",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 28,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "indifference",
        title: "Approcher progressivement une créature sans provoquer de fuite",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "cautious_approach", "no_flee"])
        })
      }),
      Object.freeze({
        slot: "flee",
        title: "Observer une fuite provoquée par une approche rapide",
        action: "observe",
        target: 1,
        requires: Object.freeze(["indifference"]),
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "flee", "intrusive_approach"])
        })
      }),
      Object.freeze({
        slot: "neutrality",
        title: "Rester immobile près de la première créature jusqu'au retour au calme",
        action: "observe",
        target: 1,
        requires: Object.freeze(["flee"]),
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "calm_nearby"]),
          relation: Object.freeze({
            fromSlot: "indifference",
            sameBy: Object.freeze(["instanceId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je vais comparer la réaction à une arrivée prudente et à une fermeture de distance trop rapide."
      ]),
      completed: Object.freeze([
        "La réaction dépend bien de la dynamique d'approche : prudence tolérée, charge repoussée par la fuite, puis calme retrouvé après une approche maîtrisée."
      ])
    })
  });

  const FAU05 = Object.freeze({
    id: "FAU-05",
    title: "Observer un petit groupe",
    description:
      "Observer calmement trois individus distincts sans provoquer leur fuite.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "FAU-04",
      count: 1
    }),
    prerequisites: Object.freeze(["FAU-04"]),
    priority: 319,
    passivePriorityAxis: "relations",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 24,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "firstIndividual",
        title: "Observer un premier individu sans fuite",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "calm_nearby"])
        })
      }),
      Object.freeze({
        slot: "otherIndividuals",
        title: "Observer deux autres individus distincts sans fuite",
        action: "observe",
        target: 2,
        requires: Object.freeze(["firstIndividual"]),
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "calm_nearby"]),
          distinctBy: "instanceId",
          relation: Object.freeze({
            fromSlot: "firstIndividual",
            differentBy: Object.freeze(["instanceId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Un individu isolé ne suffit pas. Je vais répéter cette approche sur plusieurs membres du groupe."
      ]),
      completed: Object.freeze([
        "Trois individus distincts ont toléré une présence calme sans fuite."
      ])
    })
  });

  const FAU06 = Object.freeze({
    id: "FAU-06",
    title: "Routes de migration",
    description:
      "Observer une espèce de faune de référence puis retrouver cette même définition animale sur une nouvelle map située à l’est.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "FAU-05",
      count: 1
    }),
    prerequisites: Object.freeze(["FAU-05"]),
    priority: 318,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 34,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true
    }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredObjects: Object.freeze([
        Object.freeze({
          sourceSlot: "referenceFauna",
          identityField: "objectId",
          count: 1,
          contextRole: "faunaMigrationTarget"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "referenceFauna",
        title: "Observer une espèce animale de référence",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "fauna"
        })
      }),
      Object.freeze({
        slot: "reachEastMap",
        title: "Continuer vers l’est jusqu’à une nouvelle map",
        action: "travel",
        target: 1,
        requires: Object.freeze(["referenceFauna"]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          direction: "east",
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "compareFauna",
        title: "Observer la même espèce sur cette nouvelle map",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachEastMap"]),
        params: Object.freeze({
          subject: "fauna",
          relation: Object.freeze({
            fromSlot: "referenceFauna",
            sameBy: Object.freeze(["objectId"]),
            differentBy: Object.freeze(["mapId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ces traces ne décrivent pas une ronde, mais un voyage. Je vais prendre une espèce comme référence et chercher la même plus à l’est."
      ]),
      completed: Object.freeze([
        "La même espèce est confirmée sur une autre map à l’est. Le déplacement saisonnier reste une interprétation narrative de ces deux observations."
      ])
    })
  });


  const FAU07 = Object.freeze({
    id: "FAU-07",
    title: "Comportement à distance",
    description:
      "Observer pendant plusieurs secondes un comportement animal réel depuis une distance prudente.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "FAU-06",
      count: 1
    }),
    prerequisites: Object.freeze(["FAU-06"]),
    priority: 317,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 24,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "observationDistance",
        title: "S'arrêter à distance prudente d'une créature",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "cautious_approach"])
        })
      }),
      Object.freeze({
        slot: "behavior",
        title: "Maintenir l'observation du comportement pendant cinq secondes",
        action: "observe",
        target: 1,
        requires: Object.freeze(["observationDistance"]),
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "behavior_observed"]),
          relation: Object.freeze({
            fromSlot: "observationDistance",
            sameBy: Object.freeze(["instanceId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je vais rester assez loin pour laisser l'animal réagir naturellement tout en suivant son comportement."
      ]),
      completed: Object.freeze([
        "Le comportement a été maintenu et observé plusieurs secondes sans forcer un contact."
      ])
    })
  });

  const FAU08 = Object.freeze({
    id: "FAU-08",
    title: "Coexistence locale",
    description:
      "Sur une nouvelle map, observer au moins deux espèces proches l'une de l'autre pendant cinq secondes sans provoquer de fuite.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "FAU-07",
      count: 1
    }),
    prerequisites: Object.freeze(["FAU-07"]),
    priority: 316,
    passivePriorityAxis: "relations",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 28,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true
    }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-PEACEFUL-FAUNA-001",
          persistent: true,
          spawnOnce: true,
          contextRole: "faunaMixedGroup"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachMixedGroup",
        title: "Rejoindre une nouvelle map avec plusieurs espèces proches",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ eventDriven: true, newOnly: true })
      }),
      Object.freeze({
        slot: "observeMixedGroup",
        title: "Observer plusieurs espèces proches pendant cinq secondes sans fuite",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachMixedGroup"]),
        params: Object.freeze({
          subject: "fauna",
          microSceneId: "MSC-PEACEFUL-FAUNA-001",
          tagsAll: Object.freeze(["fauna_behavior", "peaceful_group", "multi_species", "no_flee"])
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je vais chercher un endroit où plusieurs espèces occupent le même espace sans se disperser."
      ]),
      completed: Object.freeze([
        "Plusieurs espèces sont restées proches et calmes pendant toute l'observation."
      ])
    })
  });

  const FAU09 = Object.freeze({
    id: "FAU-09",
    title: "Réaction parentale",
    description:
      "Observer une réaction protectrice réelle d'un adulte envers un jeune dans la micro-scène parentale.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "FAU-08",
      count: 1
    }),
    prerequisites: Object.freeze(["FAU-08"]),
    priority: 315,
    passivePriorityAxis: "relations",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 32,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true
    }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-FUNA-PARENTAL",
          persistent: true,
          spawnOnce: true,
          contextRole: "faunaParentalContext"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachParentalContext",
        title: "Rejoindre un nouveau territoire où observer un groupe parental",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true
        })
      }),
      Object.freeze({
        slot: "observeProtection",
        title: "Observer une réaction protectrice envers le jeune",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachParentalContext"]),
        params: Object.freeze({
          subject: "fauna",
          microSceneId: "MSC-CUSTOM-FUNA-PARENTAL",
          tagsAll: Object.freeze(["fauna_behavior", "parental_protect"])
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Le groupe ne réagit pas seulement individuellement. Je vais observer ce qui se passe quand je m'approche du plus jeune."
      ]),
      completed: Object.freeze([
        "Un adulte s'est réellement interposé pour protéger le jeune. Ce comportement parental est maintenant observé, pas seulement supposé."
      ])
    })
  });

  const FAU10 = Object.freeze({
    id: "FAU-10",
    title: "Utilisation d'outil",
    description:
      "Observer un brouteur utiliser réellement une boule de paille comme outil et répéter ce comportement.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "FAU-09",
      count: 1
    }),
    prerequisites: Object.freeze(["FAU-09"]),
    priority: 314,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 34,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true
    }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-FAUNA-TOOL-USE-001",
          persistent: true,
          spawnOnce: true,
          contextRole: "faunaToolUseContext"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachToolUseContext",
        title: "Rejoindre un nouveau territoire où un comportement d'outil peut être observé",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true
        })
      }),
      Object.freeze({
        slot: "observeToolUse",
        title: "Observer deux cycles complets d'utilisation de la boule",
        action: "observe",
        target: 2,
        requires: Object.freeze(["reachToolUseContext"]),
        params: Object.freeze({
          subject: "fauna",
          microSceneId: "MSC-FAUNA-TOOL-USE-001",
          tagsAll: Object.freeze(["fauna_behavior", "tool_use_cycle"])
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ce brouteur ne semble pas déplacer cette boule au hasard. Je vais vérifier s'il reproduit volontairement le même geste."
      ]),
      completed: Object.freeze([
        "Le brouteur a poussé puis réutilisé la boule à deux reprises. L'utilisation d'outil est confirmée par le comportement réel."
      ])
    })
  });


  const FAU11 = Object.freeze({
    id: "FAU-11",
    title: "Familiarité",
    description:
      "Retrouver trois individus déjà rencontrés et réussir avec chacun une nouvelle approche calme sans fuite.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "FAU-10",
      count: 1
    }),
    prerequisites: Object.freeze(["FAU-10"]),
    priority: 313,
    passivePriorityAxis: "relations",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 26,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "firstFamiliar",
        title: "Retrouver un premier individu déjà rencontré",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "familiar_encounter"])
        })
      }),
      Object.freeze({
        slot: "otherFamiliar",
        title: "Retrouver deux autres individus déjà rencontrés",
        action: "observe",
        target: 2,
        requires: Object.freeze(["firstFamiliar"]),
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "familiar_encounter"]),
          distinctBy: "instanceId",
          relation: Object.freeze({
            fromSlot: "firstFamiliar",
            differentBy: Object.freeze(["instanceId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Certaines créatures ont déjà toléré ma présence. Je vais vérifier si cette familiarité se retrouve lors d'une nouvelle rencontre."
      ]),
      completed: Object.freeze([
        "Trois individus déjà rencontrés ont de nouveau accepté une approche calme sans fuite."
      ])
    })
  });

  const FAU12 = Object.freeze({
    id: "FAU-12",
    title: "Présence paisible",
    description:
      "Découvrir une scène de faune paisible et maintenir une observation calme pendant plus de cinq secondes sans provoquer de fuite.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "FAU-03",
      count: 1
    }),
    prerequisites: Object.freeze(["FAU-03"]),
    priority: 312,
    passivePriorityAxis: "relations",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true
    }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-PEACEFUL-FAUNA-001",
          persistent: true,
          spawnOnce: true,
          contextRole: "faunaPeacefulContext"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachPeacefulScene",
        title: "Découvrir une scène de faune paisible sur une nouvelle map",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ eventDriven: true, newOnly: true })
      }),
      Object.freeze({
        slot: "peacefulObservation",
        title: "Maintenir une observation calme pendant cinq secondes",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachPeacefulScene"]),
        params: Object.freeze({
          subject: "fauna",
          microSceneId: "MSC-PEACEFUL-FAUNA-001",
          tagsAll: Object.freeze(["fauna_behavior", "peaceful_group", "no_flee"])
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je vais chercher un groupe réellement paisible et rester suffisamment longtemps pour vérifier que ma présence ne le perturbe pas."
      ]),
      completed: Object.freeze([
        "Le groupe est resté paisible pendant toute l'observation. Ma présence n'a déclenché aucune fuite."
      ])
    })
  });

  const FAU01A = Object.freeze({
    id: "FAU-01A",
    title: "Approche par espèce",
    description: "Réussir une nouvelle approche prudente de cette espèce à moins de cinq mètres sans provoquer de fuite.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual", count: 1 }),
    prerequisites: Object.freeze(["FAU-11"]),
    repeatable: true,
    faunaSpeciesTemplate: true,
    priority: 311,
    passivePriorityAxis: "relations",
    ponderation: 1,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 34,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    slots: Object.freeze({
      study: Object.freeze({
        title: "Approcher cette espèce sans fuite",
        target: 1,
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "cautious_approach", "no_flee"]),
          maxDistance: 5,
          catalogManaged: true
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cette espèce réagit à ma façon d'approcher. Je vais confirmer qu'une arrivée prudente suffit à éviter la fuite."]),
      completed: Object.freeze(["Cette espèce tolère une approche prudente. Je peux maintenant rester près d'elle sans forcer le contact."])
    })
  });

  const FAU03A = Object.freeze({
    id: "FAU-03A",
    title: "Présence calme par espèce",
    description: "Maintenir une présence calme auprès de cette espèce après une approche réussie.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual", count: 1 }),
    prerequisites: Object.freeze([]),
    repeatable: true,
    faunaSpeciesTemplate: true,
    priority: 310,
    passivePriorityAxis: "relations",
    ponderation: 1,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 34,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    slots: Object.freeze({
      study: Object.freeze({
        title: "Rester calmement près de cette espèce",
        target: 1,
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "calm_nearby"])
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["L'approche a été acceptée. Je vais vérifier que ma présence reste tolérée dans la durée."]),
      completed: Object.freeze(["La présence calme est acceptée. Je peux comparer maintenant plusieurs individus de la même espèce."])
    })
  });

  const FAU05A = Object.freeze({
    id: "FAU-05A",
    title: "Tolérance du groupe par espèce",
    description: "Observer calmement trois individus distincts de cette espèce sans provoquer leur fuite.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual", count: 1 }),
    prerequisites: Object.freeze([]),
    repeatable: true,
    faunaSpeciesTemplate: true,
    priority: 309,
    passivePriorityAxis: "relations",
    ponderation: 1,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 34,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    slots: Object.freeze({
      study: Object.freeze({
        title: "Observer trois individus distincts sans fuite",
        target: 3,
        params: Object.freeze({
          subject: "fauna",
          tagsAll: Object.freeze(["fauna_behavior", "calm_nearby"]),
          distinctBy: "instanceId"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Un individu ne suffit pas à caractériser l'espèce. Je vais vérifier cette tolérance sur trois individus distincts."]),
      completed: Object.freeze(["Trois individus distincts ont accepté une présence calme. Il reste à tenter un contact supplémentaire sans les brusquer."])
    })
  });

  const FAU11A = Object.freeze({
    id: "FAU-11A",
    title: "Relation avec l'espèce",
    description: "Réussir une présence calme auprès d'un individu supplémentaire de cette espèce ; une fuite rend la relation hostile jusqu'à une nouvelle tentative réussie.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual", count: 1 }),
    prerequisites: Object.freeze([]),
    repeatable: true,
    faunaSpeciesTemplate: true,
    priority: 308,
    passivePriorityAxis: "relations",
    ponderation: 1,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 34,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    slots: Object.freeze({
      study: Object.freeze({
        title: "Rester calmement près d'un individu supplémentaire",
        target: 1,
        params: Object.freeze({
          subject: "fauna",
          catalogManaged: true
        })
      })
    }),
    runtimeValidation: Object.freeze({
      type: "fauna-species-terminal",
      slot: "study"
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je vais tenter une présence supplémentaire. Si je brusque cette espèce au point de la faire fuir, elle me considérera comme une menace."]),
      completed: Object.freeze(["La présence supplémentaire a réussi sans fuite. Cette espèce me tolère désormais comme une présence familière."])
    })
  });

  const T04 = Object.freeze({
    id: "T04",
    title: "Comprendre qu’un projet peut progresser en parallèle",
    description: "Faire avancer le Refuge avec une ressource utile sans interrompre les autres projets actifs.",
    pattern: "COLLECT_THEN_REWARD",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T03",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T03"]),
    priority: 92,
    primaryOnActivation: true,
    passivePriorityAxis: "exploration",
    slots: Object.freeze({
      collect: Object.freeze({
        title: "Collecter une ressource utile au Refuge",
        requirements: Object.freeze([
          Object.freeze({
            title: "Collecter une ressource utile au Refuge",
            target: 1,
            params: Object.freeze({
              kind: "wood"
            })
          })
        ])
      })
    }),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "parallel-missions-help",
        when: "missions-active",
        missionsAll: Object.freeze(["T04", "GAME-shelter"]),
        message: "Plusieurs missions peuvent évoluer simultanément.",
        duration: 14000
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Le refuge va demander du temps. Je peux continuer à ramasser ce qui lui sera utile sans en faire mon unique préoccupation."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "collect",
          atCount: 1,
          text: "Cette ressource comptera pour le refuge même si, maintenant, je pars reconnaître le terrain."
        })
      ]),
      completed: Object.freeze([
        "Voilà l’idée : un projet peut continuer à avancer sans rester mon seul objectif."
      ])
    })
  });


  const T05 = Object.freeze({
    id: "T05",
    title: "Explorer réellement la map de départ",
    description: "Explorer réellement le Site du crash jusqu’à connaître au moins 60 % de sa surface.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T04",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T04"]),
    priority: 90,
    primaryOnActivation: true,
    passivePriorityAxis: "exploration",
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Explorer 60 % du Site du crash",
        target: 60,
        params: Object.freeze({
          scope: "map",
          mapId: "crystal",
          metric: "surfacePercent",
          threshold: 60
        })
      })
    }),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "exploration-surface-help",
        when: "active-idle",
        delayMs: 12000,
        message: "Explore réellement le terrain : éloigne-toi du Site du crash et découvre au moins 60 % de la map.",
        duration: 14000,
        dismissOnProgress: true
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Le camp me donne un point de retour. Maintenant je veux cesser de tourner autour de la capsule et comprendre vraiment cette zone."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "explore",
          at: 0.5,
          text: "Le terrain devient une carte plutôt qu’une collection d’objets isolés."
        })
      ]),
      completed: Object.freeze([
        "J’en connais assez pour me déplacer ici sans tout redécouvrir à chaque sortie."
      ])
    })
  });

  const T06 = Object.freeze({
    id: "T06",
    title: "Analyser avant de décider",
    description: "Analyser trois familles différentes : une plante, un minerai et une relique de type stèle ou arche.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T05",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T05"]),
    priority: 88,
    primaryOnActivation: true,
    passivePriorityAxis: "research",
    sequence: Object.freeze([
      Object.freeze({
        slot: "flora",
        title: "Analyser une plante",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "flora",
          excludeObjectIds: Object.freeze(["DOC-RES-WOOD-M-001"])
        })
      }),
      Object.freeze({
        slot: "mineral",
        title: "Analyser un minerai",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "mineral"
        })
      }),
      Object.freeze({
        slot: "relic",
        title: "Analyser une relique, une stèle ou une arche",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          tagsAny: Object.freeze(["ruin", "arch", "stele"]),
          excludeObjectIds: Object.freeze(["LANDMARK-CRASH-CAPSULE-001"]),
          excludeKinds: Object.freeze(["debris"])
        })
      })
    ]),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "analysis-families-help",
        when: "active-idle",
        delayMs: 10000,
        message: "Analyse trois familles différentes : une plante, un minerai et une relique — stèle ou arche.",
        duration: 14000,
        dismissOnProgress: false
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ramasser et cartographier ne suffisent pas. Je veux vérifier que je sais aussi transformer une observation en connaissance."
      ]),
      progress: Object.freeze([
        Object.freeze({
          at: 0.34,
          text: "Chaque analyse réduit un peu la part de hasard."
        })
      ]),
      completed: Object.freeze([
        "Très bien. Pour la suite, essaie de me donner une direction plutôt qu’un trajet pas à pas."
      ])
    })
  });

  const T07 = Object.freeze({
    id: "T07",
    title: "Suggérer une direction et découvrir une nouvelle map",
    description: "Choisir une direction, laisser BlueFox franchir seul un passage puis analyser la scène de reconnaissance garantie sur la map voisine.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T06",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T06"]),
    priority: 86,
    autoPrimaryEligible: false,
    passivePriorityAxis: "exploration",
    slots: Object.freeze({
      study: Object.freeze({
        title: "Étudier la scène de reconnaissance",
        target: 1,
        params: Object.freeze({})
      })
    }),
    navigation: Object.freeze({
      controlsUnknownTravel: true,
      singleUnknownTransition: true,
      autonomyModeOnArrival: "semi",
      autonomyModeOnComplete: "off",
      makePrimaryOnArrival: true,
      target: Object.freeze({
        cuoType: "stele",
        binding: "type-or-mission-scene"
      })
    }),
    mapGeneration: Object.freeze({
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-ANCIENT-GATEWAY-001",
          persistent: true,
          spawnOnce: true
        })
      ])
    }),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "choose-direction-help",
        when: "active",
        delayMs: 4000,
        message: "Cette fois, choisis seulement une direction. Ouvre Planète pour indiquer Nord, Sud, Est ou Ouest.",
        duration: 0,
        highlight: "planet",
        dismissOnEvent: "bluefox:map-transition-completed"
      }),
      Object.freeze({
        id: "direction-cards-help",
        when: "target-available",
        message: "Choisis une direction : Nord, Sud, Est ou Ouest.",
        duration: 0,
        highlight: "planet-directions",
        dismissOnEvent: "bluefox:map-transition-completed"
      }),
      Object.freeze({
        id: "unknown-send-help",
        when: "target-available",
        message: "Confirme ensuite avec « Envoyer BlueFox en terre inconnue ».",
        duration: 0,
        highlight: "planet-send-unknown",
        dismissOnEvent: "bluefox:map-transition-completed"
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Cette fois, ne me montre pas un point précis. Choisis simplement une direction. Je chercherai moi-même comment quitter cette zone."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "recognize",
          atCount: 1,
          text: "J’ai trouvé le passage. La direction vient de toi ; le chemin, de moi."
        })
      ]),
      completed: Object.freeze([
        "Nouvelle zone… quelque chose se détache du décor. Je vais aller voir sans que tu aies besoin de me le demander."
      ])
    })
  });

  const T08 = Object.freeze({
    id: "T08",
    title: "Retrouver le Site du crash",
    description: "Suggérer explicitement le retour puis laisser BlueFox retrouver le Site du crash par les passages connus.",
    pattern: "TRAVEL_CYCLE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T07",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T07"]),
    priority: 84,
    primaryOnActivation: true,
    slots: Object.freeze({
      travel: Object.freeze({
        title: "Revenir au Site du crash",
        target: 1,
        params: Object.freeze({
          toMapId: "crystal",
          distinctBy: "transition"
        })
      })
    }),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 8,
      scope: "any-established"
    }),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "return-home-help",
        when: "active",
        delayMs: 4000,
        message: "Si tu veux rentrer, suggère simplement le retour au Site du crash depuis Planète.",
        duration: 14000,
        highlight: "planet"
      }),
      Object.freeze({
        id: "return-button-help",
        when: "target-available",
        message: "Utilise « Demander le retour à la base ». BlueFox retrouvera seul la route connue.",
        duration: 14000,
        highlight: "return-base"
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je sais d’où je viens. Si tu veux rentrer, dis-le-moi simplement : je devrais pouvoir retrouver le Site du crash sans que tu reconstruises chaque étape."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "travel",
          atCount: 1,
          text: "Je reconnais ce passage. Je reprends la route connue."
        })
      ]),
      completed: Object.freeze([
        "Voilà le Site du crash. Je peux partir et revenir : les zones connues commencent à former un vrai territoire."
      ]),
      hesitation: Object.freeze([
        "On peut continuer à regarder autour de nous, mais si tu veux tester ma mémoire du trajet, suggère-moi simplement de rentrer au Site du crash."
      ])
    })
  });

  const T09 = Object.freeze({
    id: "T09",
    title: "Retrouver les mêmes plantes ailleurs",
    description: "Laisser BlueFox choisir seul une nouvelle destination puis vérifier la présence de deux espèces déjà connues.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T08",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T08"]),
    priority: 400,
    primaryOnActivation: true,
    passivePriorityAxis: "exploration",
    tutorialAutonomy: Object.freeze({
      autonomousEligibleOnAcknowledge: true
    }),
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachFourPlateauMap",
        title: "Rejoindre un nouveau territoire",
        action: "travel",
        target: 1,
        params: Object.freeze({
          eventDriven: true,
          toDiscoveryIndex: 2,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "adaptivePlant",
        title: "Observer une plante adaptative",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachFourPlateauMap"]),
        params: Object.freeze({
          cuoType: "adaptive_plant",
          requiredMapFact: "tutorialExcursion:T09",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "fiberPlant",
        title: "Observer une plante fibreuse",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachFourPlateauMap"]),
        params: Object.freeze({
          cuoType: "fiber",
          requiredMapFact: "tutorialExcursion:T09",
          requiredMapField: "generatedTargetMapId"
        })
      })
    ]),
    mapGeneration: Object.freeze({
      size: 4,
      compatibleBiomes: Object.freeze([
        "forest",
        "aquatic"
      ])
    }),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "full-autonomy-introduction",
        when: "active",
        message: "À partir de maintenant, BlueFox est autonome dans ses décisions. Il peut choisir ses destinations et suivre une mission tout seul.",
        duration: 0,
        acknowledge: Object.freeze({
          label: "OK",
          autonomyMode: "full"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "J’ai reconnu certaines de ces plantes dans plusieurs zones. Elles ne sont peut-être pas propres au Site du crash. Je vais partir vérifier jusqu’où elles se sont répandues."
      ]),
      progress: Object.freeze([
        Object.freeze({
          at: 0.66,
          text: "Cette espèce pousse donc aussi ici. Une seule correspondance pourrait être un hasard ; il m’en faut une seconde."
        })
      ]),
      completed: Object.freeze([
        "Deux espèces connues dans une nouvelle zone. Leur présence dépasse probablement les environs immédiats du crash.",
        "Ces plantes semblent capables d’occuper plusieurs territoires. Pour comprendre leur répartition, je dois maintenant comparer un environnement plus vaste."
      ])
    })
  });

  const T10 = Object.freeze({
    id: "T10",
    title: "Comparer les ressources d’un territoire plus vaste",
    description: "Poursuivre l’étude sur le territoire de quatre plateaux atteint pendant T09, en explorer au moins 15 % puis comparer trois familles de ressources distinctes.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T09",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T09"]),
    priority: 400,
    autoPrimaryEligible: true,
    primaryOnActivation: true,
    passivePriorityAxis: "exploration",
    sequence: Object.freeze([
      Object.freeze({
        slot: "surface",
        title: "Explorer 15 % du territoire",
        action: "explore-zone",
        target: 15,
        requires: Object.freeze([]),
        params: Object.freeze({
          scope: "map",
          metric: "surfacePercent",
          threshold: 15,
          requiredMapFact: "tutorialExcursion:T09",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "resourceFamilies",
        title: "Observer 3 familles de ressources distinctes",
        action: "observe",
        target: 3,
        requires: Object.freeze([]),
        params: Object.freeze({
          tagsAny: Object.freeze(["resource"]),
          excludeCuoTypes: Object.freeze(["tree_fallen"]),
          distinctBy: "family",
          requiredMapFact: "tutorialExcursion:T09",
          requiredMapField: "generatedTargetMapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Deux plantes connues dans une nouvelle zone, c’est un indice. Pour savoir si cette répétition concerne toute la planète, je dois comparer un territoire plus vaste."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "surface",
          atCount: 15,
          text: "Je commence à distinguer la structure de cette zone. Quinze pour cent suffiront pour une première comparaison, pas pour prétendre la connaître entièrement."
        }),
        Object.freeze({
          slot: "resourceFamilies",
          atCount: 1,
          text: "Première famille confirmée. Je cherche maintenant une ressource d’une autre nature."
        }),
        Object.freeze({
          slot: "resourceFamilies",
          atCount: 2,
          text: "Deux familles différentes apparaissent dans le même territoire. Il me manque encore un troisième point de comparaison."
        }),
        Object.freeze({
          slot: "resourceFamilies",
          atCount: 3,
          text: "Trois familles de ressources coexistent ici. La répartition du vivant et des matériaux semble suivre des règles plus larges que chaque zone isolée."
        })
      ]),
      completed: Object.freeze([
        "Je peux maintenant formuler une hypothèse : les zones diffèrent, mais certaines ressources traversent leurs frontières. Il faudra cartographier cette continuité plus précisément."
      ])
    })
  });

  const LOC01 = Object.freeze({
    id: "LOC-01",
    title: "Explorer une ruine locale",
    description: "Étudier une structure ancienne rencontrée dans une micro-scène de ruines.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 28,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    localMission: Object.freeze({
      activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-HABITAT-RUINE" })
    }),
    slots: Object.freeze({
      context: Object.freeze({
        title: "Étudier la ruine",
        target: 1,
        params: Object.freeze({ microSceneId: "MSC-CUSTOM-HABITAT-RUINE", distinctBy: "microSceneInstance" })
      })
    })
  });

  const LOC02 = Object.freeze({
    id: "LOC-02",
    title: "Comprendre une source d’eau locale",
    description: "Étudier une micro-scène aquatique afin de mieux comprendre les ressources du territoire.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 27,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    narrativeAxis: "EXPLORATEUR",
    reinforcesNarrativeAxis: Object.freeze({ axis: "EXPLORATEUR", weight: 1 }),
    localMission: Object.freeze({
      activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-RUISSEAU-MARE" })
    }),
    slots: Object.freeze({
      context: Object.freeze({
        title: "Étudier la source d’eau",
        target: 1,
        params: Object.freeze({ microSceneId: "MSC-CUSTOM-RUISSEAU-MARE", distinctBy: "microSceneInstance" })
      })
    })
  });

  const LOC03 = Object.freeze({
    id: "LOC-03",
    title: "Évaluer un secteur riche en minerais",
    description: "Étudier une ressource minérale réelle de la map sans imposer de pseudo-type documentaire.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 26,
    passivePriorityAxis: "research",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    localMission: Object.freeze({
      activation: Object.freeze({ type: "interaction.any", subject: "mineral" })
    }),
    slots: Object.freeze({
      study: Object.freeze({
        title: "Étudier une ressource minérale locale",
        target: 1,
        params: Object.freeze({ subject: "mineral", tagsAny: Object.freeze(["resource"]) })
      })
    })
  });

  const LOC04 = Object.freeze({
    id: "LOC-04",
    title: "Observer un nid de faune occupé",
    description: "Confirmer la présence réelle d’une créature autour d’un nid de faune.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 31,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 35,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    localMission: Object.freeze({
      activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-NID-DE-FAUNE5" })
    }),
    slots: Object.freeze({
      study: Object.freeze({
        title: "Détecter et observer une créature près du nid",
        target: 1,
        params: Object.freeze({ cuoType: "brouteur", persistentMicroSceneId: "MSC-CUSTOM-NID-DE-FAUNE5" })
      })
    })
  });

  const LOC05 = Object.freeze({
    id: "LOC-05",
    title: "Cartographier 60 % du territoire actuel",
    description: "Explorer au moins 60 % de la map liée à cette mission locale.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 35,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    narrativeAxis: "EXPLORATEUR",
    reinforcesNarrativeAxis: Object.freeze({
      axis: "EXPLORATEUR",
      weight: 1
    }),
    localExploration: Object.freeze({
      unlockMissionId: "T10",
      activationThreshold: 15,
      completionThreshold: 60,
      nextMissionId: "LOC-06"
    }),
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Explorer 60 % de cette map",
        target: 60,
        params: Object.freeze({
          scope: "map",
          metric: "surfacePercent",
          threshold: 60
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Quinze pour cent suffisent pour comparer, mais pas pour connaître ce territoire. Je peux poursuivre sa cartographie pendant nos autres recherches."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "explore",
          at: 0.5,
          text: "Les zones isolées commencent à former un ensemble cohérent."
        })
      ]),
      completed: Object.freeze([
        "J’en connais maintenant la majorité. Il reste possible d’en établir une cartographie complète."
      ])
    })
  });

  const LOC06 = Object.freeze({
    id: "LOC-06",
    title: "Cartographier 100 % du territoire actuel",
    description: "Atteindre 100 % d’exploration réelle sur la map liée à cette mission locale.",
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 30,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    narrativeAxis: "EXPLORATEUR",
    reinforcesNarrativeAxis: Object.freeze({
      axis: "EXPLORATEUR",
      weight: 1
    }),
    localExploration: Object.freeze({
      unlockMissionId: "T10",
      activationThreshold: 60,
      completionThreshold: 100,
      previousMissionId: "LOC-05"
    }),
    slots: Object.freeze({
      explore: Object.freeze({
        title: "Explorer 100 % de cette map",
        target: 100,
        params: Object.freeze({
          scope: "map",
          metric: "surfacePercent",
          threshold: 100
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La plus grande partie de cette zone est connue. Il reste quelques secteurs à relier pour obtenir une carte complète."
      ]),
      completed: Object.freeze([
        "Cette map ne contient plus de territoire inconnu. Elle fait maintenant partie de notre environnement maîtrisé."
      ])
    })
  });

  const LOC07 = Object.freeze({
    id: "LOC-07",
    title: "Explorer une épave locale",
    description: "Étudier une épave réelle rencontrée sur la map.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 27,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    narrativeAxis: "EXPLORATEUR",
    reinforcesNarrativeAxis: Object.freeze({ axis: "EXPLORATEUR", weight: 1 }),
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-EPAVE-MAJEUR" }) }),
    slots: Object.freeze({ context: Object.freeze({ title: "Étudier l’épave", target: 1, params: Object.freeze({ microSceneId: "MSC-CUSTOM-EPAVE-MAJEUR", distinctBy: "microSceneInstance" }) }) })
  });

  const LOC08 = Object.freeze({
    id: "LOC-08",
    title: "Étudier une végétation rare",
    description: "Observer une forme végétale rare réellement présente sur la map.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 26,
    passivePriorityAxis: "research",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", subject: "flora", tagsAny: Object.freeze(["rare"]) }) }),
    slots: Object.freeze({ study: Object.freeze({ title: "Étudier une végétation rare", target: 1, params: Object.freeze({ subject: "flora", tagsAny: Object.freeze(["rare"]) }) }) })
  });

  const LOC09 = Object.freeze({
    id: "LOC-09",
    title: "Étudier une faille basaltique",
    description: "Étudier une faille géologique réelle sans créer de type moteur artificiel.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 30,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 32,
    narrativeAxis: "SCIENTIFIQUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "SCIENTIFIQUE", weight: 1 }),
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-BASALT-RIFT" }) }),
    slots: Object.freeze({ context: Object.freeze({ title: "Étudier la faille", target: 1, params: Object.freeze({ microSceneId: "MSC-CUSTOM-BASALT-RIFT", distinctBy: "microSceneInstance" }) }) })
  });

  const LOC10 = Object.freeze({
    id: "LOC-10",
    title: "Explorer un sanctuaire local",
    description: "Étudier un sanctuaire réel rencontré sur la map.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 32,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 62,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-SANCTUAIRE-RING" }) }),
    slots: Object.freeze({ context: Object.freeze({ title: "Étudier le sanctuaire", target: 1, params: Object.freeze({ microSceneId: "MSC-CUSTOM-SANCTUAIRE-RING", distinctBy: "microSceneInstance" }) }) })
  });

  const LOC11 = Object.freeze({
    id: "LOC-11",
    title: "Analyser une ressource encore inconnue ici",
    description: "Choisir une cible réellement non étudiée en privilégiant la famille du contexte, puis la MSC, puis la map actuelle.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 29,
    passivePriorityAxis: "research",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 1,
    localMission: Object.freeze({
      captureFamily: true,
      captureMicroScene: true,
      activation: Object.freeze({ type: "interaction.any", tagsAny: Object.freeze(["resource"]) })
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "observe", title: "Repérer une ressource non étudiée", action: "observe", target: 1, params: Object.freeze({ tagsAny: Object.freeze(["resource"]), preferUnstudied: true }) }),
      Object.freeze({ slot: "analyze", title: "Analyser cette même ressource", action: "analyze", target: 1, requires: Object.freeze(["observe"]), params: Object.freeze({ tagsAny: Object.freeze(["resource"]), relation: Object.freeze({ fromSlot: "observe", sameBy: Object.freeze(["instanceId"]) }) }) })
    ])
  });

  const LOC12 = Object.freeze({
    id: "LOC-12",
    title: "Observer une espèce encore inconnue ici",
    description: "Observer une créature réelle qui n’a pas encore été étudiée dans ce contexte.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 30,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 35,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", subject: "fauna" }) }),
    slots: Object.freeze({ study: Object.freeze({ title: "Observer une espèce non étudiée", target: 1, params: Object.freeze({ subject: "fauna", preferUnstudied: true }) }) })
  });

  const LOC13 = Object.freeze({
    id: "LOC-13",
    title: "Évaluer le potentiel minéral local",
    description: "Observer puis analyser une ressource minérale réelle de la map.",
    pattern: "DISCOVER_THEN_ANALYZE",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 30,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 32,
    narrativeAxis: "SCIENTIFIQUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "SCIENTIFIQUE", weight: 1 }),
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", subject: "mineral" }) }),
    slots: Object.freeze({
      observe: Object.freeze({ title: "Repérer un indice minéral", target: 1, params: Object.freeze({ subject: "mineral", tagsAny: Object.freeze(["resource"]) }) }),
      analyze: Object.freeze({ title: "Analyser cet indice minéral", target: 1, params: Object.freeze({ subject: "mineral", tagsAny: Object.freeze(["resource"]) }) })
    })
  });

  const LOC14 = Object.freeze({
    id: "LOC-14",
    title: "Évaluer puis établir un camp secondaire",
    description: "Laisser le BAC évaluer un site puis construire réellement un camp secondaire persistant.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 34,
    passivePriorityAxis: "survival",
    ponderation: 0.25,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 35,
    localMission: Object.freeze({
      activation: Object.freeze({ type: "interaction.any", tagsAny: Object.freeze(["resource"]) }),
      constructionKind: "camp"
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "evaluate", title: "Évaluer le potentiel du site", action: "analyze", target: 1, params: Object.freeze({ tagsAny: Object.freeze(["resource"]), siteEvaluation: true }) }),
      Object.freeze({ slot: "construct", title: "Construire réellement le camp secondaire", action: "observe", target: 1, requires: Object.freeze(["evaluate"]), params: Object.freeze({ siteProgressionKind: "camp" }) })
    ])
  });

  const LOC15 = Object.freeze({
    id: "LOC-15",
    title: "Comprendre la collecte par drone",
    description: "Collecter un composant technologique réel afin de comprendre les prérequis d’une future collecte automatisée, sans déclarer cette capacité disponible.",
    pattern: "COLLECT_THEN_REWARD",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 33,
    passivePriorityAxis: "collection",
    ponderation: 0.25,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 62,
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", persistentMicroSceneId: "MSC-CUSTOM-BASE-DRONE-FONCTIONEL" }) }),
    slots: Object.freeze({
      collect: Object.freeze({
        title: "Collecter un composant technologique",
        requirements: Object.freeze([
          Object.freeze({ target: 1, params: Object.freeze({ persistentMicroSceneId: "MSC-CUSTOM-BASE-DRONE-FONCTIONEL", tagsAny: Object.freeze(["technology", "component"]) }) })
        ])
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Ces composants peuvent m’aider à comprendre comment une collecte par drone pourrait fonctionner plus tard. Pour l’instant, je dois simplement en récupérer un et l’étudier dans nos systèmes existants."])
    })
  });

  const LOC16 = Object.freeze({
    id: "LOC-16",
    title: "Prendre une vue d’ensemble d’un nouveau territoire",
    description: "Explorer une micro-scène pertinente sur une nouvelle map afin de construire une compréhension générale du territoire.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 28,
    passivePriorityAxis: "exploration",
    ponderation: 0.25,
    obsessionEligible: false,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 22,
    narrativeAxis: "EXPLORATEUR",
    reinforcesNarrativeAxis: Object.freeze({ axis: "EXPLORATEUR", weight: 1 }),
    localMission: Object.freeze({ newMapOnly: true, activation: Object.freeze({ type: "interaction.any", requireMicroScene: true }) }),
    slots: Object.freeze({ context: Object.freeze({ title: "Explorer une micro-scène de cette nouvelle map", target: 1, params: Object.freeze({ anyMicroScene: true, distinctBy: "microSceneInstance" }) }) })
  });

  const LOC17 = Object.freeze({
    id: "LOC-17",
    title: "Étudier un phénomène naturel inhabituel",
    description: "Découvrir ou analyser un phénomène naturel suffisamment inhabituel en utilisant uniquement les taxonomies existantes.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    backgroundHud: true,
    priority: 31,
    passivePriorityAxis: "research",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 32,
    narrativeAxis: "SCIENTIFIQUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "SCIENTIFIQUE", weight: 1 }),
    localMission: Object.freeze({ activation: Object.freeze({ type: "interaction.any", tagsAny: Object.freeze(["phenomenon", "resonant"]) }) }),
    slots: Object.freeze({ study: Object.freeze({ title: "Étudier le phénomène", target: 1, params: Object.freeze({ tagsAny: Object.freeze(["phenomenon", "resonant"]) }) }) })
  });

  const T11 = Object.freeze({
    id: "T11",
    title: "Comprendre comment préparer une ration",
    description:
      "Rejoindre la prochaine grande map tutorielle de six plateaux, y réunir des fibres végétales et de la biomasse adaptative, puis revenir au Site du crash pour préparer une première ration.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T10",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T10"]),
    priority: 390,
    autoPrimaryEligible: true,
    primaryOnActivation: true,
    passivePriorityAxis: "survival",
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true,
      autonomousKnownReturn: true
    }),
    returnPolicy: Object.freeze({
      mode: "bac-discretion",
      deferForCurrentMapExclusiveMissions: true,
      maxDeferMs: 45000
    }),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "unknown-zone-help",
        when: "active",
        message: "Envoie BlueFox vers une zone non explorée.",
        duration: 14000,
        highlight: "planet"
      })
    ]),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachSixPlateauMap",
        title: "Rejoindre la prochaine grande map tutorielle",
        action: "travel",
        target: 1,
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          toDiscoveryIndex: 3,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "fibers",
        title: "Réunir 2 fibres végétales",
        action: "collect",
        target: 2,
        requires: Object.freeze(["reachSixPlateauMap"]),
        params: Object.freeze({
          kind: "fiber",
          requiredMapFact: "tutorialExcursion:T11",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "adaptiveBiomass",
        title: "Réunir 1 biomasse adaptative",
        action: "collect",
        target: 1,
        requires: Object.freeze(["reachSixPlateauMap"]),
        params: Object.freeze({
          kind: "adaptive_biomass",
          requiredMapFact: "tutorialExcursion:T11",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "returnHome",
        title: "Revenir au Site du crash",
        action: "travel",
        target: 1,
        requires: Object.freeze(["fibers", "adaptiveBiomass"]),
        params: Object.freeze({
          eventDriven: true,
          toMapId: "crystal",
          distinctBy: "transition"
        })
      })
    ]),
    mapGeneration: Object.freeze({
      size: 6,
      compatibleBiomes: Object.freeze([
        "forest",
        "aquatic"
      ])
    }),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      mapId: "crystal",
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 8,
      scope: "any-established"
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ces plantes pourraient peut-être servir à autre chose qu'à renforcer l'abri. Je vais réunir ce qu'il faut, puis revenir au Site du crash pour essayer."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "fibers",
          atCount: 2,
          text: "J'ai assez de fibres. Il me faut encore la biomasse adaptative si je ne l'ai pas déjà trouvée."
        }),
        Object.freeze({
          slot: "adaptiveBiomass",
          atCount: 1,
          text: "J'ai la biomasse. Dès que mes collectes sont terminées, je peux rentrer au Site du crash."
        }),
        Object.freeze({
          slot: "returnHome",
          atCount: 1,
          text: "Je reconnais le territoire du crash. Il ne me reste qu'à rejoindre l'abri pour préparer ça correctement."
        })
      ]),
      completed: Object.freeze([
        "Ça fonctionne. C'est comestible, compact, et je peux le conserver. Je sais maintenant préparer des rations."
      ])
    }),
    rewards: Object.freeze([
      Object.freeze({
        type: "research.recipe",
        id: "ration-basic-v2",
        category: "food",
        label: "Ration de survie",
        description:
          "Une ration simple préparée à partir de fibres végétales et de biomasse adaptative.",
        requirements: Object.freeze([
          Object.freeze({ inventoryKey: "fiber", quantity: 2 }),
          Object.freeze({ inventoryKey: "adaptive_biomass", quantity: 1 })
        ]),
        output: Object.freeze({ objectId: "ration", quantity: 1 }),
        autoCraft: false,
        requiresShelter: true
      })
    ])
  });


  const T12 = Object.freeze({
    id: "T12",
    title: "Utiliser une ration pour récupérer de l’énergie",
    description:
      "Utiliser manuellement une ration lorsque les réserves ont diminué et vérifier un gain réel d’énergie.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T11",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T11"]),
    priority: 410,
    autoPrimaryEligible: true,
    primaryOnActivation: true,
    passivePriorityAxis: "survival",
    tutorialSurvivalUnlocks: Object.freeze([
      "ration-craft",
      "ration-consume",
      "micro-rest",
      "autonomous-rest"
    ]),
    uiGuidance: Object.freeze([
      Object.freeze({
        id: "ration-manual-use-help",
        when: "active",
        message: "1. Placer BlueFox à proximité du camp, fabriquer une ration à partir du menu \"Recherche\". 2. Ouvrir le \"sac d’expédition\" et cliquer sur une ration pour la consommer.",
        duration: 0,
        acknowledge: Object.freeze({ label: "OK" })
      })
    ]),
    runtimeValidation: Object.freeze({
      type: "manual-ration-energy-gain",
      consumeSlot: "consumeRation",
      gainSlot: "recoverEnergy"
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "consumeRation",
        title: "Utiliser une ration depuis le sac d’expédition",
        action: "eat",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          automatic: false,
          proof: "ration-consumed"
        })
      }),
      Object.freeze({
        slot: "recoverEnergy",
        title: "Constater un gain réel d’énergie",
        action: "eat",
        target: 1,
        requires: Object.freeze(["consumeRation"]),
        params: Object.freeze({
          eventDriven: true,
          proof: "survival-energy-gain"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La recette existe. Il reste à vérifier qu’elle m’aide réellement lorsque mes réserves diminuent."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "consumeRation",
          atCount: 1,
          text: "J’utilise une ration. Je vais comparer mon état avant et après."
        })
      ]),
      completed: Object.freeze([
        "L’énergie revient assez vite pour poursuivre l’exploration. La ration ne remplace pas le repos, mais elle augmente clairement mon autonomie."
      ])
    })
  });

  const T13 = Object.freeze({
    id: "T13",
    title: "Préparer une excursion prolongée",
    description:
      "Préparer dix rations puis découvrir deux nouvelles maps distinctes avant d’ouvrir l’exploration du monde.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T12",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["T12"]),
    priority: 405,
    autoPrimaryEligible: true,
    primaryOnActivation: true,
    passivePriorityAxis: "exploration",
    allowsAutonomousRationCraft: true,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      repeatUnknownTravelUntilComplete: true
    }),
    runtimeCounters: Object.freeze([
      Object.freeze({
        slot: "craftRations",
        source: "rations.craftedTotal",
        baselineOnActivation: true
      })
    ]),
    sequence: Object.freeze([
      Object.freeze({
        slot: "craftRations",
        title: "Fabriquer 10 rations après le début de la mission",
        action: "craft",
        target: 10,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          recipeId: "ration-basic-v2"
        })
      }),
      Object.freeze({
        slot: "newMaps",
        title: "Découvrir 2 nouvelles maps distinctes",
        action: "travel",
        target: 2,
        requires: Object.freeze(["craftRations"]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId",
          mapGenerationOnCount: Object.freeze({
            2: Object.freeze({
              size: "random",
              biome: "random",
              requiredMicroScenes: Object.freeze([
                Object.freeze({
                  id: "MSC-CUSTOM-BOSQUET-BIO",
                  persistent: true,
                  spawnOnce: true,
                  contextRole: "triggerContext"
                })
              ])
            })
          }),
          completionArrivalFact: "tutorialExcursion:FLO-01",
          completionArrivalField: "toMapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Une ration m’aide à prolonger un trajet. Dix rations me permettraient de préparer une véritable excursion au-delà des territoires familiers."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "craftRations",
          atCount: 10,
          text: "Les réserves sont prêtes. Je peux maintenant partir assez loin pour que le retour ne soit plus la seule décision raisonnable."
        }),
        Object.freeze({
          slot: "newMaps",
          atCount: 1,
          text: "Premier territoire inconnu enregistré. Mes réserves restent suffisantes ; je peux poursuivre."
        })
      ]),
      completed: Object.freeze([
        "L’excursion est prête à devenir autre chose qu’un exercice. À partir d’ici, les découvertes pourront orienter progressivement nos prochaines missions."
      ])
    })
  });

  const FLO01 = Object.freeze({
    id: "FLO-01",
    title: "Inventaire vivant",
    description:
      "Élargir l’étude de la map de comparaison et distinguer plusieurs fonctions de sa flore.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "FLO-02",
      count: 1
    }),
    initialState: "active",
    prerequisites: Object.freeze(["FLO-02"]),
    priority: 330,
    autoPrimaryEligible: true,
    primaryOnActivation: true,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 30,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({
      axis: "NATURALISTE",
      weight: 1
    }),
    proximityContexts: Object.freeze([
      Object.freeze({
        id: "bosquet-bio-world-open",
        microSceneId: "MSC-CUSTOM-BOSQUET-BIO",
        fact: "worldContext:bosquet-bio",
        useSceneRadius: true
      })
    ]),
    sequence: Object.freeze([
      Object.freeze({
        slot: "studyFlora",
        title: "Analyser 3 espèces végétales différentes",
        action: "analyze",
        target: 3,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "flora",
          distinctBy: "objectId",
          requiredMapFact: "tutorialExcursion:FLO-02",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "exploreBosquetMap",
        title: "Explorer au moins 40 % de cette map",
        action: "explore-zone",
        target: 40,
        requires: Object.freeze([]),
        params: Object.freeze({
          scope: "map",
          metric: "surfacePercent",
          threshold: 40,
          requiredMapFact: "tutorialExcursion:FLO-02",
          requiredMapField: "generatedTargetMapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La flore ne forme pas un décor uniforme. Chaque espèce occupe une fonction."
      ]),
      completed: Object.freeze([
        "Cette première classification me donne enfin une lecture biologique cohérente du territoire."
      ])
    })
  });

  const FLO02 = Object.freeze({
    id: "FLO-02",
    title: "Même espèce, autre monde",
    description:
      "Choisir une plante de référence puis comparer cette même espèce sur une nouvelle map.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "T13",
      count: 1
    }),
    prerequisites: Object.freeze(["T13"]),
    priority: 330,
    autoPrimaryEligible: true,
    primaryOnActivation: true,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 30,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({
      axis: "NATURALISTE",
      weight: 1
    }),
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true
    }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-FERN-CLEARING-001",
          persistent: true,
          spawnOnce: true,
          contextRole: "comparisonContext"
        }),
        Object.freeze({
          id: "MSC-CUSTOM-BOSQUET-BIO",
          persistent: true,
          spawnOnce: true,
          contextRole: "floraContext"
        })
      ]),
      requiredObjects: Object.freeze([
        Object.freeze({
          sourceSlot: "referencePlant",
          identityField: "objectId",
          count: 1,
          contextRole: "comparisonTarget"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "referencePlant",
        title: "Analyser une espèce végétale de référence",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "flora"
        })
      }),
      Object.freeze({
        slot: "reachComparisonMap",
        title: "Rejoindre une nouvelle map pour comparer cette espèce",
        action: "travel",
        target: 1,
        requires: Object.freeze(["referencePlant"]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "comparePlant",
        title: "Analyser la même espèce sur une autre map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["reachComparisonMap"]),
        params: Object.freeze({
          subject: "flora",
          relation: Object.freeze({
            fromSlot: "referencePlant",
            sameBy: Object.freeze(["objectId"]),
            differentBy: Object.freeze(["mapId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je vais choisir une plante ici, puis vérifier si cette même lignée existe ailleurs et comment elle s’y adapte."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "referencePlant",
          atCount: 1,
          text: "J’ai ma référence. Je peux maintenant chercher cette même espèce sur un autre territoire."
        }),
        Object.freeze({
          slot: "reachComparisonMap",
          atCount: 1,
          text: "Nouveau territoire. Si la même espèce est présente ici, la comparaison devient possible."
        })
      ]),
      completed: Object.freeze([
        "Une adaptation végétale entre deux territoires est confirmée."
      ])
    })
  });


  const FLO03 = Object.freeze({
    id: "FLO-03",
    title: "Symbioses locales",
    description: "Étudier une plante et un partenaire minéral ou animal dans une même micro-scène afin d’identifier une relation écologique locale.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "FLO-01", count: 1 }),
    prerequisites: Object.freeze(["FLO-01"]),
    priority: 329,
    passivePriorityAxis: "research",
    ponderation: 1, obsessionEligible: true, obsessionIntensity: 3, souvenir: true, memoryValence: "positive", scoreTrauma: 30,
    narrativeAxis: "NATURALISTE", reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({ slot: "floraPartner", title: "Analyser une plante dans la clairière de comparaison", action: "analyze", target: 1, requires: Object.freeze([]), params: Object.freeze({ subject: "flora", microSceneId: "MSC-FERN-CLEARING-001", requiredMapFact: "tutorialExcursion:FLO-02", requiredMapField: "generatedTargetMapId" }) }),
      Object.freeze({ slot: "associatedPartner", title: "Analyser un partenaire minéral ou animal dans la même micro-scène", action: "analyze", target: 1, requires: Object.freeze(["floraPartner"]), params: Object.freeze({ tagsAny: Object.freeze(["mineral", "fauna", "animal", "geology"]), microSceneId: "MSC-FERN-CLEARING-001", requiredMapFact: "tutorialExcursion:FLO-02", requiredMapField: "generatedTargetMapId", relation: Object.freeze({ fromSlot: "floraPartner", sameBy: Object.freeze(["persistentMicroSceneId", "mapId"]) }) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cette plante ne vit pas seule. Je veux comparer ce qu’elle fait avec ce qui l’entoure avant de parler de symbiose."]),
      completed: Object.freeze(["Les deux partenaires répondent au même contexte. Cette association devient une symbiose locale plausible."])
    })
  });

  const FLO04 = Object.freeze({
    id: "FLO-04",
    title: "Lumière intérieure",
    description: "Comparer deux plantes bioluminescentes sur deux maps distinctes afin de confirmer un phénomène biologique reproductible.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "FLO-03", count: 1 }),
    prerequisites: Object.freeze(["FLO-03"]),
    priority: 328,
    passivePriorityAxis: "research",
    ponderation: 1, obsessionEligible: true, obsessionIntensity: 4, souvenir: true, memoryValence: "positive", scoreTrauma: 64,
    narrativeAxis: "NATURALISTE", reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ size: "random", biome: "random", requiredObjects: Object.freeze([Object.freeze({ type: "fluorescent_vegetation", count: 1, contextRole: "bioluminescentFlora" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reachFirstGlowMap", title: "Rejoindre un territoire avec une plante lumineuse", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "firstGlowPlant", title: "Analyser une première plante bioluminescente", action: "analyze", target: 1, requires: Object.freeze(["reachFirstGlowMap"]), params: Object.freeze({ subject: "flora", tagsAny: Object.freeze(["glowing", "bioluminescent"]) }) }),
      Object.freeze({ slot: "reachSecondGlowMap", title: "Rejoindre un autre territoire", action: "travel", target: 1, requires: Object.freeze(["firstGlowPlant"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "secondGlowPlant", title: "Analyser une plante bioluminescente sur l’autre map", action: "analyze", target: 1, requires: Object.freeze(["reachSecondGlowMap"]), params: Object.freeze({ subject: "flora", tagsAny: Object.freeze(["glowing", "bioluminescent"]), relation: Object.freeze({ fromSlot: "firstGlowPlant", differentBy: Object.freeze(["mapId"]) }) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Leur lumière ne ressemble pas à une simple réaction isolée. Je veux la retrouver ailleurs et l’observer comme un phénomène du vivant, surtout lorsqu’elle devient visible dans l’obscurité."]),
      completed: Object.freeze(["La même logique lumineuse réapparaît sur plusieurs territoires. La bioluminescence végétale appartient à un mécanisme partagé."])
    })
  });

  const FLO05 = Object.freeze({
    id: "FLO-05",
    title: "Racines énergétiques",
    description: "Relier l’activité d’une plante à une anomalie géologique observée dans la même micro-scène.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "FLO-04", count: 1 }),
    prerequisites: Object.freeze(["FLO-04"]),
    priority: 327,
    passivePriorityAxis: "research",
    ponderation: 1, obsessionEligible: true, obsessionIntensity: 5, souvenir: true, memoryValence: "positive", scoreTrauma: 86,
    narrativeAxis: "NATURALISTE", reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ size: "random", biome: "random", requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-ECO-FOSSIL-001", persistent: true, spawnOnce: true, contextRole: "energyRootContext" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reachEnergyRoots", title: "Rejoindre un territoire où sol et végétation peuvent être comparés", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "rootFlora", title: "Analyser la végétation de la micro-scène", action: "analyze", target: 1, requires: Object.freeze(["reachEnergyRoots"]), params: Object.freeze({ subject: "flora", microSceneId: "MSC-ECO-FOSSIL-001" }) }),
      Object.freeze({ slot: "groundReference", title: "Analyser une référence géologique dans la même micro-scène", action: "analyze", target: 1, requires: Object.freeze(["rootFlora"]), params: Object.freeze({ tagsAny: Object.freeze(["rock", "geology", "mineral"]), microSceneId: "MSC-ECO-FOSSIL-001", relation: Object.freeze({ fromSlot: "rootFlora", sameBy: Object.freeze(["persistentMicroSceneId", "mapId"]) }) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Les racines suivent les mêmes lignes que certaines anomalies du sol. Je veux vérifier le lien sans rejouer les études géologiques déjà acquises."]),
      completed: Object.freeze(["La croissance végétale et l’anomalie du sol sont corrélées. Le vivant semble puiser dans une énergie que la géologie concentre."])
    })
  });

  const FLO06 = Object.freeze({
    id: "FLO-06",
    title: "Une biosphère alimentée",
    description: "Comparer trois territoires distincts afin de confirmer que la même logique énergétique traverse plusieurs milieux biologiques.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "FLO-05", count: 1 }),
    prerequisites: Object.freeze(["FLO-05"]),
    priority: 326,
    passivePriorityAxis: "research",
    ponderation: 1, obsessionEligible: true, obsessionIntensity: 5, souvenir: true, memoryValence: "positive", scoreTrauma: 96,
    narrativeAxis: "NATURALISTE", reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ size: "random", biome: "random", requiredObjects: Object.freeze([Object.freeze({ type: "fluorescent_vegetation", count: 1, contextRole: "energyFloraReference" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "firstBiome", title: "Analyser une première référence végétale énergétique", action: "analyze", target: 1, requires: Object.freeze([]), params: Object.freeze({ subject: "flora", tagsAny: Object.freeze(["glowing", "bioluminescent"]) }) }),
      Object.freeze({ slot: "reachSecondBiome", title: "Rejoindre un second territoire", action: "travel", target: 1, requires: Object.freeze(["firstBiome"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "secondBiome", title: "Analyser une référence végétale énergétique sur le second territoire", action: "analyze", target: 1, requires: Object.freeze(["reachSecondBiome"]), params: Object.freeze({ subject: "flora", tagsAny: Object.freeze(["glowing", "bioluminescent"]), relation: Object.freeze({ fromSlot: "firstBiome", differentBy: Object.freeze(["mapId"]) }) }) }),
      Object.freeze({ slot: "reachThirdBiome", title: "Rejoindre un troisième territoire", action: "travel", target: 1, requires: Object.freeze(["secondBiome"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "thirdBiome", title: "Analyser une référence végétale énergétique sur le troisième territoire", action: "analyze", target: 1, requires: Object.freeze(["reachThirdBiome"]), params: Object.freeze({ subject: "flora", tagsAny: Object.freeze(["glowing", "bioluminescent"]), relation: Object.freeze({ fromSlot: "secondBiome", differentBy: Object.freeze(["mapId"]) }) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Une anomalie locale ne suffirait pas. Si la même signature traverse plusieurs territoires, alors c’est la biosphère entière qu’il faut relire."]),
      completed: Object.freeze(["Trois territoires racontent la même histoire énergétique. Cette planète n’est plus seulement un lieu à traverser : elle pourrait devenir un endroit où vivre durablement."])
    })
  });

  const FLO07 = Object.freeze({
    id: "FLO-07",
    title: "Envisager de s’installer",
    description: "Conclusion narrative de la branche FLO : BlueFox commence à envisager une installation durable sur cette planète.",
    pattern: "NARRATIVE_ONLY",
    narrativeOnly: true,
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "FLO-06", count: 1 }),
    prerequisites: Object.freeze(["FLO-06"]),
    priority: 325,
    autoPrimaryEligible: false, primaryOnActivation: false,
    passivePriorityAxis: "research",
    ponderation: 1, obsessionEligible: true, obsessionIntensity: 5, souvenir: true, memoryValence: "positive", scoreTrauma: 96,
    narrativeAxis: "NATURALISTE", reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    slots: Object.freeze({}),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je pensais surtout en termes d’expédition, de retour et de prochaine étape. Maintenant une autre idée devient possible : rester ici assez longtemps pour appeler cet endroit chez moi."]),
      completed: Object.freeze(["Je n’ai rien décidé de définitif. Mais cette planète est devenue plus qu’un terrain d’étude : je peux réellement envisager de m’y installer durablement."])
    })
  });

  const GEO01 = Object.freeze({
    id: "GEO-01",
    title: "Lire les couches",
    description:
      "Comparer trois falaises d’une même map en observant une roche géologique sur chacune pour lire les strates du terrain.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "east",
      count: 1
    }),
    priority: 315,
    passivePriorityAxis: "collection",
    ponderation: 1,
    mapGeneration: Object.freeze({
      size: 6,
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-FALAISE1",
          instanceId: "FALAISE1-A",
          persistent: true,
          spawnOnce: true,
          contextRole: "geologyLayerA"
        }),
        Object.freeze({
          id: "MSC-CUSTOM-FALAISE2",
          instanceId: "FALAISE2",
          persistent: true,
          spawnOnce: true,
          contextRole: "geologyLayerB"
        }),
        Object.freeze({
          id: "MSC-CUSTOM-FALAISE1",
          instanceId: "FALAISE1-B",
          persistent: true,
          spawnOnce: true,
          contextRole: "geologyLayerC"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "layerA",
        title: "Observer une roche de FALAISE1-A",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          family: "geology",
          persistentMicroSceneId: "FALAISE1-A",
          requiredMapFact: "tutorialExcursion:GEO-01",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "layerB",
        title: "Observer une roche de FALAISE2",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          family: "geology",
          persistentMicroSceneId: "FALAISE2",
          requiredMapFact: "tutorialExcursion:GEO-01",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "layerC",
        title: "Observer une roche de FALAISE1-B",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          family: "geology",
          persistentMicroSceneId: "FALAISE1-B",
          requiredMapFact: "tutorialExcursion:GEO-01",
          requiredMapField: "generatedTargetMapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ces parois se répondent. Chaque strate ressemble à une époque comprimée dans la pierre ; je veux les lire sans confondre les falaises."
      ]),
      progress: Object.freeze([
        Object.freeze({
          at: 0.34,
          text: "Une première couche se dessine. Il faut confronter les autres falaises avant de tirer une conclusion."
        }),
        Object.freeze({
          at: 0.67,
          text: "Deux falaises racontent déjà des histoires différentes. La troisième doit confirmer la lecture."
        })
      ]),
      completed: Object.freeze([
        "Trois falaises, trois lectures d’un même territoire : les strates forment une histoire géologique cohérente."
      ])
    })
  });


  const GEO02 = Object.freeze({
    id: "GEO-02",
    title: "Reconnaître les minerais",
    description:
      "Distinguer plusieurs minerais réels par l’analyse puis en extraire des échantillons selon leur contrat CUO.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "west",
      count: 1
    }),
    prerequisites: Object.freeze(["GEO-01"]),
    priority: 314,
    passivePriorityAxis: "collection",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({
        slot: "analyzeMinerals",
        title: "Analyser 3 minerais différents",
        action: "analyze",
        target: 3,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "mineral",
          distinctBy: "objectId"
        })
      }),
      Object.freeze({
        slot: "extractMinerals",
        title: "Extraire 3 minerais différents",
        action: "extract",
        target: 3,
        requires: Object.freeze(["analyzeMinerals"]),
        params: Object.freeze({
          subject: "mineral",
          distinctBy: "objectId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La couleur ne suffit pas. La densité et la structure racontent davantage ; je vais comparer plusieurs minerais avant d’en prélever des échantillons."
      ]),
      completed: Object.freeze([
        "Trois signatures minérales distinctes sont confirmées et leurs échantillons peuvent maintenant servir de références fiables."
      ])
    })
  });

  const GEO03 = Object.freeze({
    id: "GEO-03",
    title: "Failles actives",
    description:
      "Étudier un basalte résonant dans une faille puis extraire ce même spécimen pour confirmer l’activité géologique observée.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "west",
      count: 1
    }),
    prerequisites: Object.freeze(["GEO-02"]),
    priority: 313,
    passivePriorityAxis: "research",
    ponderation: 1,
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-BASALT-RIFT",
          persistent: true,
          spawnOnce: true,
          contextRole: "geologicalActivityContext"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "analyzeBasalt",
        title: "Analyser le basalte résonant de la faille",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "resonant_basalt"
        })
      }),
      Object.freeze({
        slot: "extractBasalt",
        title: "Extraire ce même basalte résonant",
        action: "extract",
        target: 1,
        requires: Object.freeze(["analyzeBasalt"]),
        params: Object.freeze({
          cuoType: "resonant_basalt",
          relation: Object.freeze({
            fromSlot: "analyzeBasalt",
            sameBy: Object.freeze(["instanceId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La roche bouge encore, lentement mais sûrement. Le basalte de cette faille devrait conserver une signature mesurable."
      ]),
      completed: Object.freeze([
        "La résonance appartient bien au matériau de la faille : l’échantillon extrait confirme une activité géologique récente."
      ])
    })
  });

  const GEO04 = Object.freeze({
    id: "GEO-04",
    title: "Veines profondes",
    description:
      "Prendre un basalte résonant comme référence puis retrouver cette même définition minérale sur une autre map.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GEO-03",
      count: 1
    }),
    prerequisites: Object.freeze(["GEO-03"]),
    priority: 312,
    passivePriorityAxis: "research",
    ponderation: 1,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true
    }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredObjects: Object.freeze([
        Object.freeze({
          sourceSlot: "referenceBasalt",
          identityField: "objectId",
          count: 1,
          contextRole: "geologicalContinuityTarget"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "referenceBasalt",
        title: "Analyser un basalte résonant de référence",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "resonant_basalt"
        })
      }),
      Object.freeze({
        slot: "reachOtherMap",
        title: "Rejoindre une nouvelle map pour suivre le filon",
        action: "travel",
        target: 1,
        requires: Object.freeze(["referenceBasalt"]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "compareBasalt",
        title: "Analyser le même basalte résonant sur une autre map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["reachOtherMap"]),
        params: Object.freeze({
          cuoType: "resonant_basalt",
          relation: Object.freeze({
            fromSlot: "referenceBasalt",
            sameBy: Object.freeze(["objectId"]),
            differentBy: Object.freeze(["mapId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ce filon ne s’arrête pas ici. S’il traverse le sous-sol à l’échelle régionale, je dois retrouver la même signature sur un autre territoire."
      ]),
      completed: Object.freeze([
        "La même définition de basalte résonant réapparaît sur une autre map : la continuité géologique est confirmée sans inventer de nouvel objet moteur."
      ])
    })
  });

  const GEO05 = Object.freeze({
    id: "GEO-05",
    title: "Roches en suspension",
    description:
      "Étudier les indices réels d’un secteur occidental où des îlots mobiles et des minerais magnétiques donnent un contexte aux roches en suspension ; le champ magnétique reste narratif.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "west",
      count: 1
    }),
    prerequisites: Object.freeze(["GEO-04"]),
    priority: 311,
    passivePriorityAxis: "research",
    ponderation: 1,
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-ILES-SUSPENDUES2",
          persistent: true,
          spawnOnce: true,
          contextRole: "suspendedRocksContext"
        }),
        Object.freeze({
          id: "MSC-SUSPENDED-ISLAND-001",
          persistent: true,
          spawnOnce: true,
          contextRole: "mobileIsletContext"
        })
      ]),
      requiredObjects: Object.freeze([
        Object.freeze({
          type: "magnetic_ore",
          count: 1,
          contextRole: "magneticOreContext"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "analyzeMagneticOre",
        title: "Analyser un minerai magnétique",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "magnetic_ore"
        })
      }),
      Object.freeze({
        slot: "analyzeMobileIslet",
        title: "Analyser un îlot mobile",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "mobile_islet"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Vers l’ouest, certaines masses rocheuses semblent suspendues. Je vais m’en tenir aux indices mesurables : minerais magnétiques et îlots réellement mobiles."
      ]),
      completed: Object.freeze([
        "Les roches en suspension ont des indices matériels cohérents. Le « champ magnétique » reste mon interprétation du phénomène, pas un nouvel objet du moteur."
      ])
    })
  });

  const GEO06 = Object.freeze({
    id: "GEO-06",
    title: "Le cœur magnétique",
    description:
      "Poursuivre deux cartes vers l’ouest, atteindre en second un territoire magnétique à cristaux chargés puis analyser ses objets et phénomènes réels.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GEO-05",
      count: 1
    }),
    prerequisites: Object.freeze(["GEO-05"]),
    priority: 310,
    passivePriorityAxis: "research",
    ponderation: 1,
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      repeatUnknownTravelUntilComplete: true
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "newMapsWest",
        title: "Découvrir 2 nouvelles maps vers l’ouest",
        action: "travel",
        target: 2,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId",
          direction: "west",
          mapGenerationOnCount: Object.freeze({
            2: Object.freeze({
              size: "random",
              biome: "magnetic",
              requiredMicroScenes: Object.freeze([
                Object.freeze({
                  id: "MSC-CHARGED-CRYSTALS-001",
                  persistent: true,
                  spawnOnce: true,
                  contextRole: "magneticCoreContext"
                })
              ]),
              requiredObjects: Object.freeze([
                Object.freeze({
                  type: "magnetic_ore",
                  count: 1,
                  contextRole: "magneticCoreOre"
                }),
                Object.freeze({
                  type: "electrostatic_storm",
                  count: 1,
                  contextRole: "magneticCoreStorm"
                })
              ])
            })
          })
        })
      }),
      Object.freeze({
        slot: "analyzeMagneticOre",
        title: "Analyser un minerai magnétique sur la seconde map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["newMapsWest"]),
        params: Object.freeze({
          cuoType: "magnetic_ore",
          requiredMapFact: "tutorialExcursion:GEO-06",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "analyzeEnergyCrystal",
        title: "Analyser un cristal d’énergie sur la seconde map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["newMapsWest"]),
        params: Object.freeze({
          cuoType: "energy_crystal",
          requiredMapFact: "tutorialExcursion:GEO-06",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "analyzeStorm",
        title: "Analyser une tempête électrostatique sur la seconde map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["newMapsWest"]),
        params: Object.freeze({
          cuoType: "electrostatic_storm",
          requiredMapFact: "tutorialExcursion:GEO-06",
          requiredMapField: "generatedTargetMapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Les indices deviennent plus nets vers l’ouest. Deux nouvelles zones devraient suffire pour atteindre le foyer le plus chargé sans inventer un « champ magnétique » comme objet."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "newMapsWest",
          atCount: 1,
          text: "Première zone franchie vers l’ouest. Je poursuis : la signature la plus forte devrait être plus loin."
        }),
        Object.freeze({
          slot: "newMapsWest",
          atCount: 2,
          text: "La seconde zone est magnétique. Cristaux chargés, minerai et phénomènes électrostatiques donnent enfin des cibles mesurables."
        })
      ]),
      completed: Object.freeze([
        "Le cœur magnétique est décrit par des phénomènes réels et convergents. Le champ lui-même reste une lecture narrative de leurs effets."
      ])
    })
  });

  const GEO07 = Object.freeze({
    id: "GEO-07",
    title: "Cartographie énergétique",
    description:
      "Comparer une même signature énergétique sur trois nouvelles maps afin de relier plusieurs anomalies à un réseau énergétique planétaire ; le réseau reste une interprétation narrative.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "GEO-06",
      count: 1
    }),
    prerequisites: Object.freeze(["GEO-06"]),
    priority: 309,
    passivePriorityAxis: "research",
    ponderation: 1,
    navigation: Object.freeze({
      autonomousUnknownTravel: true
    }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CHARGED-CRYSTALS-001",
          persistent: true,
          spawnOnce: true,
          contextRole: "energyNetworkSample"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachEnergyMap1",
        title: "Découvrir une première nouvelle map énergétique",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "measureEnergyMap1",
        title: "Analyser le cristal chargé de la première map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["reachEnergyMap1"]),
        params: Object.freeze({
          objectId: "RES-ENER-M-001",
          requiredMapFact: "tutorialExcursion:GEO-07",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "reachEnergyMap2",
        title: "Découvrir une deuxième nouvelle map énergétique",
        action: "travel",
        target: 1,
        requires: Object.freeze(["measureEnergyMap1"]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "measureEnergyMap2",
        title: "Comparer le même cristal chargé sur la deuxième map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["reachEnergyMap2"]),
        params: Object.freeze({
          objectId: "RES-ENER-M-001",
          requiredMapFact: "tutorialExcursion:GEO-07",
          requiredMapField: "generatedTargetMapId",
          relation: Object.freeze({
            fromSlot: "measureEnergyMap1",
            sameBy: Object.freeze(["objectId"]),
            differentBy: Object.freeze(["mapId"])
          })
        })
      }),
      Object.freeze({
        slot: "reachEnergyMap3",
        title: "Découvrir une troisième nouvelle map énergétique",
        action: "travel",
        target: 1,
        requires: Object.freeze(["measureEnergyMap2"]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "measureEnergyMap3",
        title: "Comparer le même cristal chargé sur la troisième map",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["reachEnergyMap3"]),
        params: Object.freeze({
          objectId: "RES-ENER-M-001",
          requiredMapFact: "tutorialExcursion:GEO-07",
          requiredMapField: "generatedTargetMapId",
          relation: Object.freeze({
            fromSlot: "measureEnergyMap2",
            sameBy: Object.freeze(["objectId"]),
            differentBy: Object.freeze(["mapId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Les anomalies se répondent à travers les maps. Je veux vérifier si une même signature énergétique réapparaît sur trois territoires distincts."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "measureEnergyMap1",
          atCount: 1,
          text: "Première mesure enregistrée. Une anomalie isolée ne suffit pas encore à dessiner un réseau."
        }),
        Object.freeze({
          slot: "measureEnergyMap2",
          atCount: 1,
          text: "Deuxième signature concordante. La répétition dépasse maintenant le simple phénomène local."
        })
      ]),
      completed: Object.freeze([
        "Trois maps portent la même signature de cristal chargé. La cartographie énergétique révèle un système planétaire interconnecté."
      ])
    })
  });

  const SUR01 = Object.freeze({
    id: "SUR-01",
    title: "Identifier une plante comestible",
    description:
      "Observer puis analyser la même plante afin de confirmer qu’elle peut être consommée sans danger.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "interaction.observe",
      count: 1,
      subject: "flora"
    }),
    triggerOnly: true,
    priority: 192,
    passivePriorityAxis: "survival",
    sequence: Object.freeze([
      Object.freeze({
        slot: "observeCandidate",
        title: "Observer une plante comestible candidate",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "flora",
          tagsAny: Object.freeze(["fiber", "adaptive", "biological", "fungus"])
        })
      }),
      Object.freeze({
        slot: "analyzeCandidate",
        title: "Analyser cette même plante avant toute consommation",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["observeCandidate"]),
        params: Object.freeze({
          subject: "flora",
          tagsAny: Object.freeze(["fiber", "adaptive", "biological", "fungus"]),
          relation: Object.freeze({
            fromSlot: "observeCandidate",
            sameBy: Object.freeze(["instanceId"])
          })
        })
      })
    ]),
    rewards: Object.freeze([
      Object.freeze({
        type: "research.knowledge",
        id: "edible_flora",
        category: "survival",
        label: "Plantes comestibles"
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Identifier une plante comestible : je vais isoler les faits utiles avant d’agir."
      ]),
      completed: Object.freeze([
        "Identifier une plante comestible devient un acquis fiable pour la suite de l’expédition."
      ])
    })
  });

  const SUR02 = Object.freeze({
    id: "SUR-02",
    title: "Identifier une plante toxique",
    description:
      "Reconnaître une plante dangereuse et mémoriser ses signes distinctifs sans la consommer.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "SUR-01",
      count: 1
    }),
    prerequisites: Object.freeze(["SUR-01"]),
    priority: 191,
    passivePriorityAxis: "survival",
    sequence: Object.freeze([
      Object.freeze({
        slot: "observeToxic",
        title: "Observer la plante dangereuse",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "carnivorous_plant",
          microSceneId: "MSC-PREDATOR-FLORA-001"
        })
      }),
      Object.freeze({
        slot: "analyzeToxic",
        title: "Analyser ses signes distinctifs",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["observeToxic"]),
        params: Object.freeze({
          cuoType: "carnivorous_plant",
          microSceneId: "MSC-PREDATOR-FLORA-001",
          relation: Object.freeze({
            fromSlot: "observeToxic",
            sameBy: Object.freeze(["instanceId"])
          })
        })
      })
    ]),
    rewards: Object.freeze([
      Object.freeze({
        type: "research.knowledge",
        id: "toxic_flora",
        category: "survival",
        label: "Plantes toxiques"
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Identifier une plante toxique : je vais isoler les faits utiles avant d’agir."
      ]),
      completed: Object.freeze([
        "Identifier une plante toxique devient un acquis fiable pour la suite de l’expédition."
      ])
    })
  });

  const SUR03 = Object.freeze({
    id: "SUR-03",
    experimentalPrerequisites: Object.freeze(["biology_applied"]),
    title: "Composer une ration stable",
    description:
      "Comparer plusieurs plantes du Bosquet et confirmer une préparation alimentaire stable.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "interaction.observe",
      count: 1,
      subject: "flora"
    }),
    triggerOnly: true,
    requiredFacts: Object.freeze(["worldContext:bosquet-bio"]),
    priority: 190,
    passivePriorityAxis: "survival",
    runtimeCounters: Object.freeze([
      Object.freeze({
        slot: "craftStableRation",
        source: "rations.craftedTotal",
        baselineOnActivation: true
      })
    ]),
    sequence: Object.freeze([
      Object.freeze({
        slot: "studyPlants",
        title: "Analyser 2 plantes différentes",
        action: "analyze",
        target: 2,
        requires: Object.freeze([]),
        params: Object.freeze({
          subject: "flora",
          distinctBy: "objectId"
        })
      }),
      Object.freeze({
        slot: "craftStableRation",
        title: "Fabriquer une ration stable",
        action: "craft",
        target: 1,
        requires: Object.freeze(["studyPlants"]),
        params: Object.freeze({
          eventDriven: true,
          recipeId: "ration-basic-v2"
        })
      })
    ])
  });

  const SUR05 = Object.freeze({
    id: "SUR-05",
    title: "Conserver les aliments",
    description:
      "Tester une méthode de conservation, préparer trois rations puis utiliser des échantillons alimentaires au camp.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "SUR-03",
      count: 1
    }),
    prerequisites: Object.freeze(["SUR-03"]),
    priority: 189,
    passivePriorityAxis: "survival",
    allowsAutonomousRationCraft: true,
    runtimeCounters: Object.freeze([
      Object.freeze({
        slot: "craftPreservedRations",
        source: "rations.craftedTotal",
        baselineOnActivation: true
      })
    ]),
    sequence: Object.freeze([
      Object.freeze({
        slot: "researchPreservation",
        title: "Achever la recherche sur la conservation des aliments",
        action: "research",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          researchId: "food_preservation"
        })
      }),
      Object.freeze({
        slot: "craftPreservedRations",
        title: "Fabriquer trois rations pour valider la méthode",
        action: "craft",
        target: 3,
        requires: Object.freeze(["researchPreservation"]),
        params: Object.freeze({
          eventDriven: true,
          recipeId: "ration-basic-v2"
        })
      }),
      Object.freeze({
        slot: "collectEdibleSamples",
        title: "Réunir six plantes comestibles pour les essais de conservation",
        action: "collect",
        target: 6,
        requires: Object.freeze(["craftPreservedRations"]),
        params: Object.freeze({
          subject: "flora",
          tagsAny: Object.freeze(["fiber", "adaptive", "biological", "fungus"])
        })
      }),
      Object.freeze({
        slot: "collectFiberSamples",
        title: "Réunir trois fibres supplémentaires pour les essais",
        action: "collect",
        target: 3,
        requires: Object.freeze(["collectEdibleSamples"]),
        params: Object.freeze({
          kind: "fiber"
        })
      })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 8,
      scope: "any-established",
      requireDeposit: true
    }),
    effects: Object.freeze([
      Object.freeze({
        type: "inventory.consume",
        inventoryKey: "fiber",
        quantity: 3
      }),
      Object.freeze({
        type: "inventory.consume",
        inventoryKeys: Object.freeze(["fiber", "adaptive_biomass"]),
        quantity: 6
      })
    ]),
    rewards: Object.freeze([
      Object.freeze({
        type: "research.knowledge",
        id: "food_preservation",
        category: "survival",
        label: "Conservation des aliments"
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Conserver les aliments : je vais isoler les faits utiles avant d’agir."
      ]),
      completed: Object.freeze([
        "Conserver les aliments devient un acquis fiable pour la suite de l’expédition."
      ])
    })
  });

  const SUR06 = Object.freeze({
    id: "SUR-06",
    title: "Atteindre une autonomie alimentaire durable",
    description:
      "Fabriquer dix rations au total puis revenir à un camp avec au moins une ration encore dans le sac.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "SUR-05",
      count: 1
    }),
    prerequisites: Object.freeze(["SUR-05", "T13"]),
    priority: 188,
    passivePriorityAxis: "survival",
    runtimeCounters: Object.freeze([
      Object.freeze({
        slot: "craftTenRations",
        source: "rations.craftedTotal",
        baselineOnActivation: false
      })
    ]),
    sequence: Object.freeze([
      Object.freeze({
        slot: "craftTenRations",
        title: "Fabriquer dix rations au total",
        action: "craft",
        target: 10,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          recipeId: "ration-basic-v2"
        })
      }),
      Object.freeze({
        slot: "returnToCamp",
        title: "Revenir au camp avec une réserve alimentaire",
        action: "travel",
        target: 1,
        requires: Object.freeze(["craftTenRations"]),
        optional: true,
        params: Object.freeze({
          eventDriven: true
        })
      })
    ]),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 8,
      scope: "any-established",
      bagCounter: Object.freeze({
        source: "rations",
        minimum: 1
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je veux vérifier que mes réserves permettent maintenant une vraie autonomie, pas seulement une sortie de plus."
      ]),
      completed: Object.freeze([
        "Dix rations préparées au total, et une ration encore disponible au retour : mon autonomie alimentaire devient durable."
      ])
    })
  });


  const SUR07 = Object.freeze({
    id: "SUR-07",
    title: "Ration d’expédition améliorée",
    description:
      "Comparer trois ressources alimentaires, réunir les échantillons nécessaires, mener un essai de conservation au camp puis fabriquer trois rations.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "SUR-06",
      count: 1
    }),
    prerequisites: Object.freeze(["SUR-06"]),
    experimentalPrerequisites: Object.freeze(["biology_experimented"]),
    priority: 187,
    passivePriorityAxis: "survival",
    theme: "Flore",
    allowsAutonomousRationCraft: true,
    ponderation: 1,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 28,
    narrativeAxis: "NATURALISTE",
    runtimeCounters: Object.freeze([
      Object.freeze({
        slot: "craftRations",
        source: "rations.craftedTotal",
        baselineOnActivation: true
      })
    ]),
    sequence: Object.freeze([
      Object.freeze({
        slot: "observeAdaptivePlant",
        title: "Observer une plante adaptative",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ cuoType: "adaptive_plant", subject: "flora" })
      }),
      Object.freeze({
        slot: "observeBiologicalResource",
        title: "Observer une ressource biologique",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ cuoType: "rare_biological_resource", subject: "flora" })
      }),
      Object.freeze({
        slot: "observeGiantMushroom",
        title: "Observer un champignon géant",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ cuoType: "giant_mushroom", subject: "flora" })
      }),
      Object.freeze({
        slot: "collectBiomass",
        title: "Réunir douze unités végétales pour l’essai",
        action: "collect",
        target: 12,
        requires: Object.freeze([
          "observeAdaptivePlant",
          "observeBiologicalResource",
          "observeGiantMushroom"
        ]),
        params: Object.freeze({ kind: "adaptive_biomass", subject: "flora" })
      }),
      Object.freeze({
        slot: "collectFiber",
        title: "Réunir quatre fibres pour l’essai",
        action: "collect",
        target: 4,
        requires: Object.freeze(["collectBiomass"]),
        params: Object.freeze({ kind: "fiber" })
      }),
      Object.freeze({
        slot: "experimentConservation",
        title: "Mener l’expérimentation de conservation au camp",
        action: "research",
        target: 1,
        requires: Object.freeze(["collectFiber"]),
        params: Object.freeze({
          requiresShelter: true,
          inventoryConsume: Object.freeze([
            Object.freeze({ inventoryKey: "adaptive_biomass", quantity: 12 }),
            Object.freeze({ inventoryKey: "fiber", quantity: 4 })
          ])
        })
      }),
      Object.freeze({
        slot: "craftRations",
        title: "Fabriquer trois rations après l’essai",
        action: "craft",
        target: 3,
        requires: Object.freeze(["experimentConservation"]),
        params: Object.freeze({
          eventDriven: true,
          recipeId: "ration-basic-v2"
        })
      })
    ]),
    rewards: Object.freeze([
      Object.freeze({
        type: "research.knowledge",
        id: "ration_conservation_mastery",
        category: "survival",
        label: "Maîtrise de la conservation",
        description:
          "Les champignons géants et les ressources biologiques sont des sources de biomasse plus riches ; BlueFox les privilégie lorsqu’il cherche de quoi préparer des rations."
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je connais déjà les bases biologiques. Je veux comparer les ressources alimentaires et vérifier au camp ce qui permet de préparer mes réserves plus efficacement."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "experimentConservation",
          atCount: 1,
          text: "L’essai est concluant : certaines ressources biologiques concentrent nettement plus de biomasse que les plantes adaptatives."
        })
      ]),
      completed: Object.freeze([
        "Pour mes futures rations, je retiens les champignons géants et les ressources biologiques quand ils sont disponibles : leur biomasse est plus riche."
      ])
    })
  });


  // Missions de consommation — transformer des surplus réels en entretien ou recherche.
  // Les effets restent portés par inventory.consume ; aucune seconde économie n'est créée.
  const SURPLUS01 = Object.freeze({
    id: "SURPLUS-01",
    title: "Entretenir et améliorer la Base",
    description: "Profiter d'un surplus de bois et de fibres pour effectuer un entretien concret de la Base : couchage ou matelas, toiture, murs, rangement ou espace de préparation.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "manual", count: 1 }),
    prerequisites: Object.freeze(["GAME-base"]),
    repeatable: true,
    repeatableCondition: Object.freeze({
      shelterKinds: Object.freeze(["base"]),
      radius: 12,
      requirements: Object.freeze([
        Object.freeze({ inventoryKey: "wood", minimum: 100, rearmIncrease: 50 }),
        Object.freeze({ inventoryKey: "fiber", minimum: 100, rearmIncrease: 50 })
      ])
    }),
    priority: 27,
    passivePriorityAxis: "survival",
    narrativeAxis: "LOGISTICIEN",
    autoPrimaryEligible: false,
    sequence: Object.freeze([
      Object.freeze({
        slot: "chooseMaintenance",
        title: "Choisir l'entretien le plus utile à la Base",
        action: "research",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({})
      }),
      Object.freeze({
        slot: "performMaintenance",
        title: "Réaliser l'amélioration avec le surplus disponible",
        action: "research",
        target: 1,
        requires: Object.freeze(["chooseMaintenance"]),
        params: Object.freeze({})
      })
    ]),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 50 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "fiber", quantity: 50 })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Le stock déborde assez pour penser à autre chose qu'au strict nécessaire. Je peux reprendre le couchage ou le matelas, refaire une partie de la toiture, consolider un mur, améliorer les rangements ou rendre l'espace de préparation plus pratique."
      ]),
      completed: Object.freeze([
        "Cinquante bois et cinquante fibres ont servi à un entretien utile de la Base. Ce n'est pas une nouvelle construction : simplement un lieu de vie un peu plus solide, pratique ou confortable."
      ])
    })
  });

  const SURPLUS02_MINERAL = Object.freeze({
    id: "SURPLUS-02-MINERAL",
    title: "Série d'essais sur les matériaux — minerais",
    description: "Employer un stock minéral redevenu abondant pour mener une série d'essais comparatifs au lieu de laisser les échantillons s'accumuler.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "manual", count: 1 }),
    prerequisites: Object.freeze(["GAME-engineering_2"]),
    repeatable: true,
    repeatableCondition: Object.freeze({
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 12,
      inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium"]),
      minimum: 50,
      rearmIncrease: 30
    }),
    priority: 26,
    passivePriorityAxis: "research",
    autoPrimaryEligible: false,
    sequence: Object.freeze([
      Object.freeze({ slot: "prepare", title: "Préparer une série d'essais minéraux", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({}) }),
      Object.freeze({ slot: "compare", title: "Comparer les résultats des essais", action: "research", target: 1, requires: Object.freeze(["prepare"]), params: Object.freeze({}) })
    ]),
    effects: Object.freeze([
      Object.freeze({
        type: "inventory.consume",
        inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium"]),
        quantity: 30
      })
    ]),
    rewards: Object.freeze([Object.freeze({
      type: "research.knowledge",
      id: "surplus-material-tests-v1",
      category: "engineering",
      label: "Essais comparatifs sur les matériaux"
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Les minerais recommencent à s'accumuler. J'en sacrifierais volontiers une partie pour comparer leurs réactions plutôt que les conserver sans but."]),
      completed: Object.freeze(["Trente unités minérales ont été utilisées dans les essais. Même les résultats peu concluants enrichissent ma compréhension des matériaux."])
    })
  });

  const SURPLUS02_CRYSTAL = Object.freeze({
    id: "SURPLUS-02-CRYSTAL",
    title: "Série d'essais sur les matériaux — cristaux",
    description: "Employer un stock de cristaux redevenu abondant pour mener la variante cristalline des essais comparatifs.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "manual", count: 1 }),
    prerequisites: Object.freeze(["GAME-engineering_2"]),
    repeatable: true,
    repeatableCondition: Object.freeze({
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 12,
      inventoryKey: "crystal",
      minimum: 50,
      rearmIncrease: 20
    }),
    priority: 26,
    passivePriorityAxis: "research",
    autoPrimaryEligible: false,
    sequence: Object.freeze([
      Object.freeze({ slot: "prepare", title: "Préparer une série d'essais cristallins", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({}) }),
      Object.freeze({ slot: "compare", title: "Comparer les résultats des essais", action: "research", target: 1, requires: Object.freeze(["prepare"]), params: Object.freeze({}) })
    ]),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKey: "crystal", quantity: 20 })
    ]),
    rewards: Object.freeze([Object.freeze({
      type: "research.knowledge",
      id: "surplus-material-tests-v1",
      category: "engineering",
      label: "Essais comparatifs sur les matériaux"
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Les cristaux sont assez nombreux pour que je puisse en consacrer quelques-uns à des comparaisons destructives sans compromettre mes réserves utiles."]),
      completed: Object.freeze(["Vingt cristaux ont servi aux essais. Les mesures complètent la même connaissance expérimentale que les séries minérales."])
    })
  });

  const SURPLUS03 = Object.freeze({
    id: "SURPLUS-03",
    title: "Essais biologiques et préparation",
    description: "Employer un surplus végétal pour comparer, conserver ou préparer des ressources alimentaires sans laisser les stocks s'accumuler inutilement.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "manual", count: 1 }),
    prerequisites: Object.freeze(["SUR-05"]),
    repeatable: true,
    repeatableCondition: Object.freeze({
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 12,
      inventoryKeys: Object.freeze(["fiber", "adaptive_biomass"]),
      minimum: 50,
      rearmIncrease: 20
    }),
    priority: 26,
    passivePriorityAxis: "survival",
    autoPrimaryEligible: false,
    sequence: Object.freeze([
      Object.freeze({ slot: "prepare", title: "Préparer les échantillons végétaux", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({}) }),
      Object.freeze({ slot: "experiment", title: "Mener les essais biologiques", action: "research", target: 1, requires: Object.freeze(["prepare"]), params: Object.freeze({}) })
    ]),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKeys: Object.freeze(["fiber", "adaptive_biomass"]), quantity: 20 })
    ]),
    rewards: Object.freeze([Object.freeze({
      type: "research.knowledge",
      id: "surplus-biological-preparation-v1",
      category: "survival",
      label: "Essais biologiques de préparation"
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le stock végétal est suffisamment confortable pour que je puisse tester plusieurs préparations sans mettre mes réserves en danger."]),
      completed: Object.freeze(["Vingt unités végétales ont servi aux essais. Les résultats pourront guider mes prochaines préparations et recherches alimentaires."])
    })
  });

  const MAT01 = Object.freeze({
    id: "MAT-01",
    title: "Matériaux composites",
    description: "Tester l'association du bois, des fibres et d'une petite quantité de minerai afin d'obtenir un matériau léger utilisable dans de futurs équipements.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "COL-MINERAL-100", count: 1 }),
    prerequisites: Object.freeze(["COL-WOOD-100", "COL-FIBER-100", "COL-MINERAL-100"]),
    priority: 55,
    passivePriorityAxis: "research",
    sequence: Object.freeze([
      Object.freeze({ slot: "assemblies", title: "Comparer plusieurs assemblages bois-fibres-minerai", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({}) }),
      Object.freeze({ slot: "validateComposite", title: "Valider un composite suffisamment stable", action: "research", target: 1, requires: Object.freeze(["assemblies"]), params: Object.freeze({}) })
    ]),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 20 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "fiber", quantity: 20 }),
      Object.freeze({ type: "inventory.consume", inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 5 })
    ]),
    rewards: Object.freeze([Object.freeze({
      type: "research.knowledge",
      id: "composite-materials-v1",
      category: "engineering",
      label: "Matériaux composites"
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Bois, fibres et minerai n'ont pas les mêmes qualités. En sacrifiant quelques lots à des assemblages comparatifs, je peux chercher un matériau plus utile que chacun séparément."]),
      completed: Object.freeze(["Un composite suffisamment stable se dégage des essais. Je peux désormais considérer ces matériaux comme une base crédible pour des fabrications plus techniques."])
    })
  });

  const TECHLAB01 = Object.freeze({
    id: "TECH-LAB-01",
    title: "Améliorer le poste d'analyse",
    description: "Transformer l'espace de travail existant en poste d'analyse plus fiable pour les recherches avancées.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "MAT-01", count: 1 }),
    prerequisites: Object.freeze(["MAT-01", "GAME-engineering_6"]),
    priority: 54,
    passivePriorityAxis: "research",
    sequence: Object.freeze([
      Object.freeze({ slot: "prepareUpgrade", title: "Préparer l'amélioration du poste d'analyse", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({}) }),
      Object.freeze({ slot: "validateUpgrade", title: "Valider le poste amélioré par une analyse avancée", action: "research", target: 1, requires: Object.freeze(["prepareUpgrade"]), params: Object.freeze({}) })
    ]),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 30 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "fiber", quantity: 20 }),
      Object.freeze({ type: "inventory.consume", inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 20 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "crystal", quantity: 5 })
    ]),
    rewards: Object.freeze([Object.freeze({
      type: "research.knowledge",
      id: "advanced-analysis-station-v1",
      category: "engineering",
      label: "Poste d'analyse amélioré"
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["L'établi me permet déjà de travailler proprement. Avec de meilleurs supports et davantage de matière, je peux rendre mes analyses plus fiables plutôt que multiplier les bricolages."]),
      completed: Object.freeze(["Le poste d'analyse est renforcé et mieux organisé. Les recherches qui exigent un matériel scientifique plus précis disposent maintenant d'une base crédible."])
    })
  });

  const COLLECTION_FAMILIES = Object.freeze({
    WOOD: Object.freeze({
      key: "WOOD",
      label: "Bois",
      axis: "collection",
      triggerParams: Object.freeze({ kind: "wood" }),
      params: Object.freeze({ kind: "wood" }),
      description: "menuiserie et construction"
    }),
    FIBER: Object.freeze({
      key: "FIBER",
      label: "Fibres",
      axis: "collection",
      triggerParams: Object.freeze({ kind: "fiber" }),
      params: Object.freeze({ kind: "fiber" }),
      description: "tissage et conservation"
    }),
    MINERAL: Object.freeze({
      key: "MINERAL",
      label: "Minerais",
      axis: "research",
      triggerParams: Object.freeze({ subject: "mineral" }),
      params: Object.freeze({
        subject: "mineral",
        excludeKinds: Object.freeze(["crystal"])
      }),
      description: "métallurgie et ingénierie"
    }),
    CRYSTAL: Object.freeze({
      key: "CRYSTAL",
      label: "Cristaux",
      axis: "collection",
      triggerParams: Object.freeze({ kind: "crystal" }),
      params: Object.freeze({ kind: "crystal" }),
      description: "énergie et recherche"
    }),
    PLANT: Object.freeze({
      key: "PLANT",
      label: "Plantes",
      axis: "survival",
      triggerParams: Object.freeze({ subject: "flora" }),
      params: Object.freeze({
        subject: "flora",
        excludeKinds: Object.freeze(["wood"])
      }),
      description: "survie, recettes et recherche"
    })
  });

  const COLLECTION_THRESHOLDS = Object.freeze([20, 50, 100, 250, 500, 1000]);

  const collectionTitle = (threshold) =>
    threshold === 20
      ? "Premiers échantillons"
      : threshold === 50
        ? "Réserve fiable"
        : threshold === 100
          ? "Maîtrise de collecte"
          : threshold === 250
            ? "Réserve confirmée"
            : threshold === 500
              ? "Maîtrise avancée"
              : "Expertise de ressource";

  const collectionPsychology = (threshold) => {
    if (threshold === 250) return {};
    if (threshold === 500) {
      return {
        ponderation: 1,
        souvenir: true,
        memoryValence: "positive",
        scoreTrauma: 16
      };
    }
    if (threshold === 1000) {
      return {
        ponderation: 1,
        obsessionEligible: true,
        obsessionIntensity: 3,
        souvenir: true,
        memoryValence: "negative",
        scoreTrauma: 38
      };
    }
    return { ponderation: 1 };
  };

  const collectionTrigger = (family, threshold) => {
    if (threshold === 20) {
      return Object.freeze({
        type: "interaction.collect",
        count: 1,
        uniqueOnly: true,
        ...family.triggerParams
      });
    }
    const previous =
      threshold === 500
        ? 250
        : threshold === 1000
          ? 500
          : threshold === 250
            ? 100
            : threshold === 100
              ? 50
              : 20;
    return Object.freeze({
      type: "progression.mission_completed",
      missionId: `COL-${family.key}-${previous}`,
      count: 1
    });
  };

  const collectionPrerequisites = (family, threshold) => {
    if (threshold === 20) return Object.freeze([]);
    const previous =
      threshold === 500
        ? 250
        : threshold === 1000
          ? 500
          : threshold === 250
            ? 100
            : threshold === 100
              ? 50
              : 20;
    return Object.freeze([`COL-${family.key}-${previous}`]);
  };

  const createCollectionMission = (family, threshold, familyIndex) => {
    const id = `COL-${family.key}-${threshold}`;
    const psychology = collectionPsychology(threshold);
    return Object.freeze({
      id,
      title: `${collectionTitle(threshold)} — ${family.label} ${threshold}`,
      description:
        `Collecter historiquement ${threshold} unités de ${family.label.toLowerCase()} ` +
        `afin d’ouvrir les connaissances avancées liées à ${family.description}.`,
      pattern: "COLLECT_THEN_REWARD",
      trigger: collectionTrigger(family, threshold),
      triggerOnly: true,
      prerequisites: collectionPrerequisites(family, threshold),
      priority: 150 - familyIndex,
      passivePriorityAxis: family.axis,
      backgroundHud: true,
      ...psychology,
      slots: Object.freeze({
        collect: Object.freeze({
          title: `Collecter historiquement ${threshold} unités de ${family.label.toLowerCase()}`,
          requirements: Object.freeze([
            Object.freeze({
              target: threshold,
              params: Object.freeze({
                ...family.params,
                historicalCollection: true
              })
            })
          ])
        })
      }),
      narrative: Object.freeze({
        revealed: Object.freeze([
          "À ce volume, je ne collecte plus au hasard : je commence à comprendre la place de cette ressource dans mon organisation."
        ]),
        completed: Object.freeze([
          `Palier de collecte atteint : ${threshold} unités de ${family.label.toLowerCase()}.`
        ])
      })
    });
  };

  const COLLECTION_MISSIONS = Object.freeze(
    Object.values(COLLECTION_FAMILIES).flatMap((family, familyIndex) =>
      COLLECTION_THRESHOLDS.map((threshold) =>
        createCollectionMission(family, threshold, familyIndex)
      )
    )
  );


  const ENV_THRESHOLDS = Object.freeze([20, 50, 100, 250, 500, 1000]);
  const ENV_FAMILIES = Object.freeze({
    RELIC: Object.freeze({
      key: "RELIC",
      label: "vestiges",
      titles: Object.freeze({
        20: "Premiers vestiges",
        50: "Motifs récurrents",
        100: "Lecture des traces",
        250: "Géographie des vestiges",
        500: "Mémoire du paysage",
        1000: "Atlas des présences anciennes"
      }),
      revealed: Object.freeze({
        20: "Quelques formes reviennent déjà. Ce ne sont plus des accidents isolés : je veux garder la trace de chaque vestige.",
        50: "Les stèles et les arches commencent à dessiner une grammaire. Je reconnais des motifs avant même d’en comprendre l’origine.",
        100: "Les traces se répondent. Je peux commencer à distinguer les formes isolées des présences qui structurent un territoire.",
        250: "À cette échelle, les vestiges cessent d’être des points : ils dessinent une géographie.",
        500: "À cette échelle, les vestiges forment une mémoire inscrite dans le relief. Je peux comparer des régions entières.",
        1000: "Mille présences anciennes : ce relevé devient un atlas plutôt qu’une suite de découvertes."
      })
    }),
    ROCK: Object.freeze({
      key: "ROCK",
      label: "roches",
      titles: Object.freeze({
        20: "Premiers reliefs",
        50: "Formes récurrentes",
        100: "Lecture du substrat",
        250: "Variations de terrain",
        500: "Structure du monde",
        1000: "Atlas lithique"
      }),
      revealed: Object.freeze({
        20: "Vingt roches ne font pas une planète, mais elles suffisent pour arrêter de regarder le sol comme un simple décor.",
        50: "Les mêmes formes de relief reviennent. Je veux comprendre ce qui appartient au hasard et ce qui appartient au terrain.",
        100: "Le substrat commence à parler : certaines formes reviennent assez souvent pour devenir des repères.",
        250: "Les variations du terrain ne sont plus des détails. Elles dessinent des familles de paysages.",
        500: "À cette échelle, les reliefs décrivent la structure du monde bien mieux qu’une poignée d’échantillons.",
        1000: "Mille observations lithiques : je peux enfin comparer les terrains comme un atlas cohérent."
      })
    }),
    PLANT: Object.freeze({
      key: "PLANT",
      label: "plantes",
      titles: Object.freeze({
        20: "Premières silhouettes végétales",
        50: "Formes d’occupation",
        100: "Inventaire du vivant fixe",
        250: "Adaptations locales",
        500: "Architecture des biomes",
        1000: "Atlas naturaliste"
      }),
      revealed: Object.freeze({
        20: "Les plantes que je ne prélève pas comptent autant que les ressources. Elles donnent sa forme au milieu.",
        50: "Arbres, lianes, fougères : leur présence n’est pas aléatoire. Elles occupent le terrain selon des règles que je commence à voir.",
        100: "Le vivant fixe n’est plus un décor : il devient un inventaire de formes, de fonctions et d’occupations.",
        250: "Les mêmes familles changent avec le terrain. Je commence à lire leurs adaptations locales.",
        500: "Certaines absences deviennent aussi parlantes que les présences. La végétation dessine l’architecture des biomes.",
        1000: "Mille observations végétales : mon journal ressemble enfin à l’atlas d’un naturaliste plutôt qu’à une liste de trouvailles."
      })
    })
  });

  const envPreviousThreshold = (threshold) => {
    const index = ENV_THRESHOLDS.indexOf(threshold);
    return index > 0 ? ENV_THRESHOLDS[index - 1] : null;
  };

  const envPsychology = (threshold, localPercent = null, worldThreshold = null) => {
    if (worldThreshold === 10) {
      return Object.freeze({
        ponderation: 0.35,
        obsessionEligible: true,
        obsessionIntensity: 3,
        souvenir: true,
        memoryValence: "positive",
        scoreTrauma: 38,
        narrativeAxis: "NATURALISTE",
        reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 0.45 })
      });
    }
    if (worldThreshold === 20) {
      return Object.freeze({
        ponderation: 0.45,
        obsessionEligible: true,
        obsessionIntensity: 4,
        souvenir: true,
        memoryValence: "positive",
        scoreTrauma: 55,
        narrativeAxis: "NATURALISTE",
        reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 0.55 })
      });
    }
    if (localPercent === 50) {
      return Object.freeze({
        ponderation: 0.08,
        obsessionEligible: false,
        obsessionIntensity: 1,
        narrativeAxis: "NATURALISTE"
      });
    }
    if (localPercent === 100) {
      return Object.freeze({
        ponderation: 0.15,
        obsessionEligible: true,
        obsessionIntensity: 2,
        souvenir: true,
        memoryValence: "positive",
        scoreTrauma: 20,
        narrativeAxis: "NATURALISTE",
        reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 0.18 })
      });
    }
    const weights = { 20: 0.10, 50: 0.10, 100: 0.20, 250: 0.15, 500: 0.30, 1000: 0.45 };
    if (threshold === 50 || threshold === 250) {
      return Object.freeze({
        ponderation: weights[threshold],
        narrativeAxis: "NATURALISTE"
      });
    }
    const intensity = { 20: 1, 100: 2, 500: 3, 1000: 4 }[threshold] || 1;
    const score = { 20: 12, 100: 24, 500: 36, 1000: 52 }[threshold] || 0;
    return Object.freeze({
      ponderation: weights[threshold] || 0.10,
      obsessionEligible: threshold !== 20,
      obsessionIntensity: intensity,
      souvenir: true,
      memoryValence: "positive",
      scoreTrauma: score,
      narrativeAxis: "NATURALISTE",
      reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: weights[threshold] || 0.10 })
    });
  };

  const createEnvGlobalMission = (family, threshold, familyIndex) => {
    const previous = envPreviousThreshold(threshold);
    const sourceId = previous ? `ENV-${family.key}-${previous}` : "T13";
    return Object.freeze({
      id: `ENV-${family.key}-${threshold}`,
      title: `${family.titles[threshold]} — ${threshold}`,
      description: `Construire progressivement une connaissance historique de ${family.label} environnementaux en créditant les observations déjà réalisées et les nouvelles observations.`,
      pattern: "OBSERVE_TARGET",
      trigger: Object.freeze({
        type: "progression.mission_completed",
        missionId: sourceId,
        count: 1
      }),
      triggerOnly: true,
      prerequisites: Object.freeze([sourceId]),
      priority: 130 - familyIndex,
      autoPrimaryEligible: false,
      primaryOnActivation: false,
      passivePriorityAxis: "research",
      backgroundHud: true,
      ...envPsychology(threshold),
      slots: Object.freeze({
        study: Object.freeze({
          title: `Observer historiquement ${threshold} instances distinctes de ${family.label}`,
          target: threshold,
          params: Object.freeze({
            eventDriven: true,
            envHistoricalFamily: family.key,
            catalogManaged: true
          })
        })
      }),
      narrative: Object.freeze({
        revealed: Object.freeze([family.revealed[threshold]]),
        progress: Object.freeze([Object.freeze({
          text: `Mon relevé de ${family.label} s’épaissit. Ce qui semblait isolé commence à prendre place dans une lecture plus large du monde.`,
          at: 0.5
        })]),
        completed: Object.freeze([`Palier ENV ${family.key} atteint : ${threshold} instances distinctes observées et intégrées à l’historique naturaliste.`])
      })
    });
  };

  const ENV_GLOBAL_MISSIONS = Object.freeze(
    Object.values(ENV_FAMILIES).flatMap((family, familyIndex) =>
      ENV_THRESHOLDS.map((threshold) => createEnvGlobalMission(family, threshold, familyIndex))
    )
  );

  const createEnvMapMission = (family, percent, familyIndex) => Object.freeze({
    id: `ENV-MAP-${family.key}-${percent}`,
    title: percent === 50
      ? `Lecture locale — ${family.label === "vestiges" ? "Vestiges" : family.label === "roches" ? "Roches" : "Végétation"} 50 %`
      : `Inventaire local complet — ${family.label === "vestiges" ? "Vestiges" : family.label === "roches" ? "Roches" : "Végétation"} 100 %`,
    description: "La couverture est calculée sur les instances ENV éligibles réellement présentes sur la map, par identités physiques distinctes.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({ type: "manual" }),
    instanceScope: "map",
    localVisibility: "current-map",
    autoPrimaryEligible: false,
    primaryOnActivation: false,
    priority: 120 - familyIndex,
    passivePriorityAxis: "research",
    backgroundHud: true,
    envLocal: Object.freeze({ family: family.key, targetPercent: percent }),
    ...envPsychology(null, percent),
    slots: Object.freeze({
      study: Object.freeze({
        title: `Observer ${percent} % des ${family.label} ENV de la map`,
        target: percent,
        params: Object.freeze({
          eventDriven: true,
          envLocalFamily: family.key,
          targetPercent: percent,
          catalogManaged: true
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([percent === 50
        ? `Je ne veux pas traverser ce territoire en ne regardant que ce qui se ramasse. Je vais lire au moins la moitié de ses ${family.label}.`
        : `La moitié donne une tendance ; pour prétendre connaître ce territoire, il faut aller jusqu’au bout des ${family.label} observables.`]),
      progress: Object.freeze([Object.freeze({
        text: "La carte se remplit autrement : chaque observation ajoute une pièce au portrait environnemental de cette zone.",
        at: 0.5
      })]),
      completed: Object.freeze([`Couverture ENV ${family.key} de cette map : ${percent} % des instances éligibles ont été observées.`])
    })
  });

  const ENV_MAP_MISSIONS = Object.freeze(
    Object.values(ENV_FAMILIES).flatMap((family, familyIndex) => [
      createEnvMapMission(family, 50, familyIndex),
      createEnvMapMission(family, 100, familyIndex)
    ])
  );

  const createEnvWorldMission = (threshold) => Object.freeze({
    id: `ENV-WORLD-${threshold}`,
    title: threshold === 10
      ? "Première synthèse des biomes — 10 biomes"
      : "Atlas naturaliste du monde — 20 biomes",
    description: `Valider ${threshold} types de biomes distincts dont au moins une map est à 100 % d’exploration et à 100 % de couverture ENV RELIC, ROCK et PLANT.`,
    pattern: "EXPLORE_SCOPE",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: threshold === 10 ? "T13" : "ENV-WORLD-10",
      count: 1
    }),
    triggerOnly: true,
    prerequisites: Object.freeze([threshold === 10 ? "T13" : "ENV-WORLD-10"]),
    priority: threshold === 10 ? 118 : 116,
    autoPrimaryEligible: false,
    primaryOnActivation: false,
    passivePriorityAxis: "research",
    backgroundHud: true,
    envWorld: Object.freeze({ targetBiomeTypes: threshold }),
    ...envPsychology(null, null, threshold),
    slots: Object.freeze({
      explore: Object.freeze({
        title: `Valider ${threshold} types de biomes distincts totalement étudiés`,
        target: threshold,
        params: Object.freeze({
          eventDriven: true,
          envWorldMastery: true,
          distinctBy: "biomeId",
          historicalBackfill: true,
          catalogManaged: true
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([threshold === 10
        ? "Explorer une map ne suffit plus. Je veux pouvoir dire que j’ai réellement lu dix milieux différents, jusque dans ce qu’ils montrent et pas seulement dans leurs chemins."
        : "Dix biomes forment une première synthèse. Je veux maintenant étendre cette lecture à vingt milieux réellement qualifiés." ]),
      progress: Object.freeze([Object.freeze({
        text: "Les biomes cessent d’être des cases sur une carte. Chacun devient un ensemble de formes, de vestiges, de roches et de végétation que je peux réellement comparer.",
        at: 0.5
      })]),
      completed: Object.freeze([`${threshold} types de biomes distincts sont maintenant totalement étudiés selon le protocole ENV.`])
    })
  });

  const ENV_WORLD_MISSIONS = Object.freeze([
    createEnvWorldMission(10),
    createEnvWorldMission(20)
  ]);



  // ARCH-R1 — Premières traces (ARCH-01 → ARCH-06)
  // Contrat gameplay : une MSC réellement découverte porte la preuve contextuelle.
  // Les formulations documentaires d'observation/analyse ne sont pas transformées
  // en clics supplémentaires lorsque la découverte de la scène suffit.
  const ARCH01 = Object.freeze({
    id: "ARCH-01",
    title: "Les premières traces",
    description: "Découvrir une première structure dont la régularité rend plausible une intervention intelligente ancienne.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "north",
      count: 1,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze([]),
    priority: 280,
    passivePriorityAxis: "collection",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-RUINE-MODULAIRE1",
          persistent: true,
          spawnOnce: true,
          contextRole: "archFirstTrace"
        })
      ])
    }),
    slots: Object.freeze({
      context: Object.freeze({
        title: "Découvrir la première trace travaillée",
        target: 1,
        params: Object.freeze({
          microSceneId: "MSC-CUSTOM-RUINE-MODULAIRE1",
          distinctBy: "microSceneInstance"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ces arêtes sont trop régulières. Quelqu’un a voulu donner une forme à cette pierre."
      ]),
      completed: Object.freeze([
        "Ces formes suffisent pour considérer qu’une intervention intelligente ancienne est plausible."
      ])
    })
  });

  const ARCH02 = Object.freeze({
    id: "ARCH-02",
    title: "Alignements impossibles",
    description: "Découvrir un second ensemble structuré dont l’organisation ne peut plus être traitée comme une simple coïncidence.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "north",
      count: 1,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["ARCH-01"]),
    priority: 279,
    passivePriorityAxis: "exploration",
    ponderation: 0.45,
    obsessionEligible: true,
    obsessionIntensity: 2,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-SANCTUAIRE-RING",
          persistent: true,
          spawnOnce: true,
          contextRole: "archImpossibleAlignment"
        })
      ])
    }),
    slots: Object.freeze({
      context: Object.freeze({
        title: "Découvrir l’alignement ancien",
        target: 1,
        params: Object.freeze({
          microSceneId: "MSC-CUSTOM-SANCTUAIRE-RING",
          distinctBy: "microSceneInstance"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Trois alignements semblables ne peuvent plus être traités comme une coïncidence."
      ]),
      completed: Object.freeze([
        "La répétition de ces formes révèle désormais une organisation intentionnelle."
      ])
    })
  });

  const ARCH03 = Object.freeze({
    id: "ARCH-03",
    title: "Les pierres gravées",
    description: "Observer deux stèles distinctes afin de confirmer la répétition d’un premier système symbolique ancien.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      count: 1,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["ARCH-02"]),
    priority: 278,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-WORKED-STONE-BLOCK",
          persistent: true,
          spawnOnce: true,
          contextRole: "archEngravedStone"
        })
      ]),
      requiredObjects: Object.freeze([
        Object.freeze({
          type: "stele",
          count: 2,
          contextRole: "archEngravedSteles"
        })
      ])
    }),
    slots: Object.freeze({
      study: Object.freeze({
        title: "Observer deux stèles distinctes",
        target: 2,
        params: Object.freeze({
          cuoType: "stele",
          distinctBy: "instanceId"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ces marques se répètent. Une seule stèle pourrait être un hasard ; deux supports distincts permettront de vérifier qu’il s’agit bien d’un système."
      ]),
      completed: Object.freeze([
        "Les mêmes signes apparaissent sur deux stèles distinctes. Un premier vocabulaire graphique ancien peut maintenant être distingué du décor."
      ])
    })
  });

  const ARCH04 = Object.freeze({
    id: "ARCH-04",
    title: "Fragments travaillés",
    description: "Étudier un composant commun dans une ruine puis prélever exactement cette même instance.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      count: 1,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["ARCH-03"]),
    priority: 277,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-COMPOSANT-RUIN",
          persistent: true,
          spawnOnce: true,
          contextRole: "archWorkedFragments"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "observeComponent",
        title: "Observer un composant commun de la ruine",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "relay_block",
          microSceneId: "MSC-CUSTOM-COMPOSANT-RUIN"
        })
      }),
      Object.freeze({
        slot: "collectComponent",
        title: "Prélever ce même composant",
        action: "collect",
        target: 1,
        requires: Object.freeze(["observeComponent"]),
        params: Object.freeze({
          cuoType: "relay_block",
          microSceneId: "MSC-CUSTOM-COMPOSANT-RUIN",
          relation: Object.freeze({
            fromSlot: "observeComponent",
            sameBy: Object.freeze(["instanceId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La matière a été découpée, assemblée et réutilisée. Je vais d’abord enregistrer précisément un composant avant de le prélever."
      ]),
      completed: Object.freeze([
        "J’ai prélevé exactement le composant que j’avais étudié. Son contexte et son origine restent donc reliés."
      ])
    })
  });

  const ARCH05 = Object.freeze({
    id: "ARCH-05",
    title: "Architecture oubliée",
    description: "Découvrir une ruine structurée permettant de reconnaître un mur ou une fondation ancienne sous le relief.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      count: 1,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["ARCH-04"]),
    priority: 276,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-RUINE-MODULAIRE4",
          persistent: true,
          spawnOnce: true,
          contextRole: "archForgottenArchitecture"
        })
      ])
    }),
    slots: Object.freeze({
      context: Object.freeze({
        title: "Découvrir la structure effondrée",
        target: 1,
        params: Object.freeze({
          microSceneId: "MSC-CUSTOM-RUINE-MODULAIRE4",
          distinctBy: "microSceneInstance"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ce relief n’est pas une simple crête. Il suit l’angle d’une construction effondrée."
      ]),
      completed: Object.freeze([
        "Cette structure suffit pour reconnaître ici un premier ensemble architectural ancien."
      ])
    })
  });

  const ARCH06 = Object.freeze({
    id: "ARCH-06",
    title: "Une voie sous la poussière",
    description: "Découvrir vers l’ouest un ancien passage reliant les vestiges et reconnaître le début d’un réseau de déplacement.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "west",
      count: 1,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["ARCH-05"]),
    priority: 275,
    passivePriorityAxis: "exploration",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-ANCIENT-GATEWAY-001",
          persistent: true,
          spawnOnce: true,
          contextRole: "archAncientRoute"
        })
      ])
    }),
    slots: Object.freeze({
      context: Object.freeze({
        title: "Découvrir le passage ancien",
        target: 1,
        params: Object.freeze({
          microSceneId: "MSC-ANCIENT-GATEWAY-001",
          distinctBy: "microSceneInstance"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Le sol est compacté selon une direction constante. Cette voie reliait des lieux importants."
      ]),
      completed: Object.freeze([
        "Le réseau de déplacement ancien commence à apparaître entre les vestiges."
      ])
    })
  });


  // ARCH-R2 — Site, carte régionale et chronologie ancienne (ARCH-07 → ARCH-12)
  // Les preuves restent physiques et déclaratives ; les déductions archéologiques
  // (relation entre sites, âges relatifs, provenance, fonction domestique) restent narratives.
  const ARCH07 = Object.freeze({
    id: "ARCH-07",
    title: "Le premier site",
    description: "Confirmer un véritable site archéologique en étudiant cinq éléments distincts de la ruine sur une même map puis en explorant 60 % de cette map.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      count: 1,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["ARCH-06"]),
    bindActivationMap: true,
    priority: 274,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 72,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-RUINE-MODULAIRE1",
          persistent: true,
          spawnOnce: true,
          contextRole: "archFirstSite"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "siteElements",
        title: "Observer cinq éléments distincts du site",
        action: "observe",
        target: 5,
        requires: Object.freeze([]),
        params: Object.freeze({
          microSceneId: "MSC-CUSTOM-RUINE-MODULAIRE1",
          distinctBy: "instanceId",
          requiredMapFact: "bibleActivation:ARCH-07",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "siteCoverage",
        title: "Explorer 60 % de la map du site",
        action: "explore-zone",
        target: 60,
        requires: Object.freeze(["siteElements"]),
        params: Object.freeze({
          metric: "surfacePercent",
          threshold: 60,
          scope: "map",
          requiredMapFact: "bibleActivation:ARCH-07",
          requiredMapField: "mapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Les indices convergent ici. Je peux enfin vérifier s’il s’agit d’un véritable site plutôt que de traces dispersées."
      ]),
      progress: Object.freeze([
        Object.freeze({
          slot: "siteCoverage",
          at: 0.6,
          text: "Les éléments observés cessent d’être isolés. À cette échelle de la map, leur organisation commence à former un ensemble cohérent."
        })
      ]),
      completed: Object.freeze([
        "Premier site archéologique confirmé. L’hypothèse d’une civilisation ancienne devient difficile à écarter."
      ])
    })
  });

  const ARCH08 = Object.freeze({
    id: "ARCH-08",
    title: "Carte des vestiges",
    description: "Confirmer trois sites archéologiques distincts sur un nouveau territoire à l’est afin d’établir une première lecture régionale.",
    pattern: "CONTEXT_MSC",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      direction: "east",
      count: 1,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["ARCH-07"]),
    bindActivationMap: true,
    priority: 273,
    passivePriorityAxis: "exploration",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-RUINE-MODULAIRE1",
          persistent: true,
          spawnOnce: true,
          contextRole: "archRegionalSite"
        }),
        Object.freeze({
          id: "MSC-CUSTOM-RUINE-MODULAIRE2",
          persistent: true,
          spawnOnce: true,
          contextRole: "archRegionalSite"
        }),
        Object.freeze({
          id: "MSC-CUSTOM-SANCTUAIRE-RING",
          persistent: true,
          spawnOnce: true,
          contextRole: "archRegionalSite"
        })
      ])
    }),
    slots: Object.freeze({
      context: Object.freeze({
        title: "Confirmer trois sites archéologiques distincts",
        target: 3,
        params: Object.freeze({
          anyMicroScene: true,
          contextRole: "archRegionalSite",
          distinctBy: "microSceneId"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Les vestiges ne sont pas isolés. Leur répartition pourrait déjà dessiner une histoire régionale."
      ]),
      completed: Object.freeze([
        "Trois sites distincts sont maintenant confirmés. Leurs formes, leurs voies et leurs matériaux peuvent être rapprochés sans inventer une métrique supplémentaire."
      ])
    })
  });

  const ARCH09 = Object.freeze({
    id: "ARCH-09",
    title: "Deux âges de pierre",
    description: "Observer trois arches puis trois stèles distinctes afin de disposer de deux ensembles techniques comparables.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "ARCH-08",
      count: 1
    }),
    prerequisites: Object.freeze(["ARCH-08"]),
    priority: 272,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "arches",
        title: "Observer trois arches distinctes",
        action: "observe",
        target: 3,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "arch",
          microSceneId: "MSC-CUSTOM-SANCTUAIRE-RING",
          distinctBy: "instanceId",
          requiredMapFact: "bibleActivation:ARCH-08",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "steles",
        title: "Observer trois stèles distinctes",
        action: "observe",
        target: 3,
        requires: Object.freeze(["arches"]),
        params: Object.freeze({
          cuoType: "stele",
          microSceneId: "MSC-CUSTOM-SANCTUAIRE-RING",
          distinctBy: "instanceId",
          requiredMapFact: "bibleActivation:ARCH-08",
          requiredMapField: "mapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Je veux comparer deux familles de formes anciennes plutôt que prétendre lire leur âge directement dans la pierre."
      ]),
      completed: Object.freeze([
        "Les deux ensembles présentent des choix techniques assez différents pour distinguer narrativement deux phases de construction."
      ])
    })
  });

  const ARCH10 = Object.freeze({
    id: "ARCH-10",
    title: "Strates d’occupation",
    description: "Observer un élément réel de la ruine modulaire afin d’appuyer une lecture narrative de ses niveaux d’occupation.",
    pattern: "OBSERVE_TARGET",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "ARCH-09",
      count: 1
    }),
    prerequisites: Object.freeze(["ARCH-09"]),
    priority: 271,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    slots: Object.freeze({
      study: Object.freeze({
        title: "Observer un élément de la ruine à plusieurs niveaux",
        target: 1,
        params: Object.freeze({
          cuoType: "debris",
          microSceneId: "MSC-CUSTOM-RUINE-MODULAIRE2",
          distinctBy: "instanceId",
          requiredMapFact: "bibleActivation:ARCH-08",
          requiredMapField: "mapId"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Une structure en recouvre une autre. Je vais observer directement un élément de cette ruine avant d’en tirer une chronologie."
      ]),
      completed: Object.freeze([
        "L’organisation visible de la ruine permet maintenant de proposer une première chronologie relative sans créer de système de stratigraphie artificiel."
      ])
    })
  });

  const ARCH11 = Object.freeze({
    id: "ARCH-11",
    title: "La carrière et la cité",
    description: "Rejoindre une nouvelle map, reconnaître une ancienne carrière puis prélever un minerai réel pour étayer la comparaison avec les constructions.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "ARCH-10",
      count: 1
    }),
    prerequisites: Object.freeze(["ARCH-10"]),
    priority: 270,
    passivePriorityAxis: "exploration",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    navigation: Object.freeze({
      autonomousUnknownTravel: true,
      singleUnknownTransition: true
    }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-CARRIERE",
          persistent: true,
          spawnOnce: true,
          contextRole: "archAncientQuarry"
        })
      ]),
      requiredObjects: Object.freeze([
        Object.freeze({
          type: "magnetic_ore",
          count: 1,
          contextRole: "archQuarrySample"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "travel",
        title: "Rejoindre une nouvelle map susceptible d’abriter la carrière",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "quarry",
        title: "Observer un élément rocheux de l’ancienne carrière",
        action: "observe",
        target: 1,
        requires: Object.freeze(["travel"]),
        params: Object.freeze({
          cuoType: "strong_rock",
          microSceneId: "MSC-CUSTOM-CARRIERE"
        })
      }),
      Object.freeze({
        slot: "sample",
        title: "Prélever un minerai pour comparaison",
        action: "collect",
        target: 1,
        requires: Object.freeze(["quarry"]),
        params: Object.freeze({
          cuoType: "magnetic_ore"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Si ces constructions ont mobilisé autant de pierre, une carrière ancienne devrait encore conserver des traces exploitables."
      ]),
      completed: Object.freeze([
        "La carrière et l’échantillon prélevé donnent une base physique suffisante pour relier narrativement l’extraction ancienne aux grands chantiers."
      ])
    })
  });

  const ARCH12 = Object.freeze({
    id: "ARCH-12",
    title: "Habiter la planète",
    description: "Découvrir un habitat en ruine, observer l’un de ses éléments puis récupérer un composant réellement présent sur place.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({
      type: "exploration.map_discovered",
      count: 1,
      uniqueOnly: true
    }),
    prerequisites: Object.freeze(["ARCH-11"]),
    bindActivationMap: true,
    priority: 269,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({
          id: "MSC-CUSTOM-HABITAT-RUINE",
          persistent: true,
          spawnOnce: true,
          contextRole: "archCivilHabitat"
        })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "habitatElement",
        title: "Observer un élément de l’habitat en ruine",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "stele",
          microSceneId: "MSC-CUSTOM-HABITAT-RUINE",
          requiredMapFact: "bibleActivation:ARCH-12",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "habitatComponent",
        title: "Récupérer un composant présent dans l’habitat",
        action: "collect",
        target: 1,
        requires: Object.freeze(["habitatElement"]),
        params: Object.freeze({
          cuoType: "relay_block",
          microSceneId: "MSC-CUSTOM-HABITAT-RUINE",
          requiredMapFact: "bibleActivation:ARCH-12",
          requiredMapField: "mapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ici, les traces sont modestes et répétées. Je veux vérifier qu’il s’agit bien d’un lieu de vie plutôt que d’un monument."
      ]),
      completed: Object.freeze([
        "L’élément observé et le composant récupéré suffisent à reconnaître narrativement un premier habitat civil."
      ])
    })
  });


  // ARCH-R3 — Organisation sociale, astronomie et premières reliques (ARCH-13 → ARCH-18)
  const ARCH13 = Object.freeze({
    id: "ARCH-13",
    title: "La place commune",
    description: "Revenir sur le sanctuaire régional et observer trois accès distincts pour étayer l'hypothèse d'un espace collectif.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-12", count: 1 }),
    prerequisites: Object.freeze(["ARCH-12"]),
    priority: 268,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "context",
        title: "Retrouver la place ancienne",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          microSceneId: "MSC-CUSTOM-SANCTUAIRE-RING",
          requiredMapFact: "bibleActivation:ARCH-08",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "accesses",
        title: "Observer trois accès distincts autour de la place",
        action: "observe",
        target: 3,
        requires: Object.freeze(["context"]),
        params: Object.freeze({
          cuoType: "arch",
          microSceneId: "MSC-CUSTOM-SANCTUAIRE-RING",
          distinctBy: "instanceId",
          requiredMapFact: "bibleActivation:ARCH-08",
          requiredMapField: "mapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["La circulation converge vers ce centre. Je veux vérifier si plusieurs accès dessinent réellement un espace commun."]),
      completed: Object.freeze(["Trois accès distincts convergent vers le même espace. L'organisation collective devient une lecture crédible de ce lieu."])
    })
  });

  const ARCH14 = Object.freeze({
    id: "ARCH-14",
    title: "Ateliers anciens",
    description: "Découvrir un ancien atelier puis observer trois éléments techniques distincts pour reconnaître une activité spécialisée.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-13", count: 1 }),
    prerequisites: Object.freeze(["ARCH-13"]),
    priority: 267,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({ id: "MSC-CUSTOM-ETABLI", persistent: true, spawnOnce: true, contextRole: "archAncientWorkshop" })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "travel",
        title: "Chercher un ancien secteur de production sur une nouvelle map",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" })
      }),
      Object.freeze({
        slot: "context",
        title: "Découvrir l'ancien atelier",
        action: "observe",
        target: 1,
        requires: Object.freeze(["travel"]),
        params: Object.freeze({ microSceneId: "MSC-CUSTOM-ETABLI" })
      }),
      Object.freeze({
        slot: "relay",
        title: "Observer un bloc relais de l'atelier",
        action: "observe",
        target: 1,
        requires: Object.freeze(["context"]),
        params: Object.freeze({ cuoType: "relay_block", microSceneId: "MSC-CUSTOM-ETABLI" })
      }),
      Object.freeze({
        slot: "core",
        title: "Observer un noyau pulsé de l'atelier",
        action: "observe",
        target: 1,
        requires: Object.freeze(["context"]),
        params: Object.freeze({ cuoType: "pulse_core", microSceneId: "MSC-CUSTOM-ETABLI" })
      }),
      Object.freeze({
        slot: "machine",
        title: "Observer une ancienne machine de l'atelier",
        action: "observe",
        target: 1,
        requires: Object.freeze(["context"]),
        params: Object.freeze({ cuoType: "ancient_machine_wreck", microSceneId: "MSC-CUSTOM-ETABLI" })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Les déchets et les outils sont trop cohérents pour être fortuits. Ce secteur semble avoir été consacré à une activité précise."]),
      completed: Object.freeze(["Trois éléments techniques convergent. Je peux maintenant parler d'un atelier spécialisé sans inventer une chaîne de production complète."])
    })
  });

  const ARCH15 = Object.freeze({
    id: "ARCH-15",
    title: "Regarder les étoiles",
    description: "Découvrir un observatoire à l'est puis observer deux éléments distincts de sa composition avant d'interpréter son orientation.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", direction: "east", count: 1, uniqueOnly: true }),
    prerequisites: Object.freeze(["ARCH-14"]),
    bindActivationMap: true,
    priority: 266,
    passivePriorityAxis: "exploration",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({ id: "MSC-CUSTOM-ASTROLOGY", persistent: true, spawnOnce: true, contextRole: "archAncientObservatory" })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "context",
        title: "Découvrir la structure orientée vers le ciel",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ microSceneId: "MSC-CUSTOM-ASTROLOGY", requiredMapFact: "bibleActivation:ARCH-15", requiredMapField: "mapId" })
      }),
      Object.freeze({
        slot: "axis",
        title: "Observer une arche de l'observatoire",
        action: "observe",
        target: 1,
        requires: Object.freeze(["context"]),
        params: Object.freeze({ cuoType: "arch", microSceneId: "MSC-CUSTOM-ASTROLOGY", requiredMapFact: "bibleActivation:ARCH-15", requiredMapField: "mapId" })
      }),
      Object.freeze({
        slot: "marker",
        title: "Observer un second repère de l'observatoire",
        action: "observe",
        target: 1,
        requires: Object.freeze(["context"]),
        params: Object.freeze({ cuoType: "tech_relic", microSceneId: "MSC-CUSTOM-ASTROLOGY", requiredMapFact: "bibleActivation:ARCH-15", requiredMapField: "mapId" })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cette ouverture ne vise pas simplement l'horizon. Sa géométrie semble suivre un repère céleste."]),
      completed: Object.freeze(["Les deux repères observés suffisent pour conclure que les anciens orientaient cette structure en fonction du ciel."])
    })
  });

  const ARCH16 = Object.freeze({
    id: "ARCH-16",
    title: "Chronologie des bâtisseurs",
    description: "Observer des arches, des stèles et des reliques puis accumuler dix-huit observations nouvelles de ces trois familles pour construire une première chronologie régionale.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-15", count: 1 }),
    prerequisites: Object.freeze(["ARCH-15"]),
    priority: 265,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "arches",
        title: "Observer au moins une arche ancienne",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ cuoType: "arch" })
      }),
      Object.freeze({
        slot: "steles",
        title: "Observer au moins une stèle élaborée",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ cuoType: "stele" })
      }),
      Object.freeze({
        slot: "relics",
        title: "Observer au moins une relique technologique",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ cuoType: "tech_relic" })
      }),
      Object.freeze({
        slot: "evidence18",
        title: "Observer dix-huit objets archéologiques depuis l'activation de la mission",
        action: "observe",
        target: 18,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoTypes: Object.freeze(["arch", "stele", "tech_relic"]),
          distinctBy: "instanceId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Les traces du temps ne racontent pas toutes la même étape. Les arches semblent plus anciennes, les stèles plus élaborées, et les reliques relèvent déjà d'une ingénierie avancée."]),
      progress: Object.freeze([
        Object.freeze({ slot: "arches", atCount: 1, text: "Ces arches portent davantage les traces du temps. Elles pourraient appartenir à une phase plus ancienne." }),
        Object.freeze({ slot: "steles", atCount: 1, text: "La fabrication de ces stèles paraît plus élaborée. La technique s'est clairement raffinée." }),
        Object.freeze({ slot: "relics", atCount: 1, text: "Cette relique suppose une ingénierie nettement plus avancée que les premières structures de pierre." })
      ]),
      completed: Object.freeze(["Dix-huit observations nouvelles, réparties entre arches, stèles et reliques, suffisent à établir une première chronologie régionale des bâtisseurs."])
    })
  });

  const ARCH17 = Object.freeze({
    id: "ARCH-17",
    title: "La relique énergétique",
    description: "Découvrir une relique encore active dans son contexte cérémoniel puis l'observer et l'analyser sans transformer la surcharge en mécanique dédiée.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-16", count: 1 }),
    prerequisites: Object.freeze(["ARCH-16"]),
    priority: 264,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 88,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({ id: "MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP", persistent: true, spawnOnce: true, contextRole: "archActiveRelic" })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "travel",
        title: "Rejoindre une nouvelle map susceptible d'abriter la relique",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" })
      }),
      Object.freeze({
        slot: "context",
        title: "Découvrir le contexte de la relique active",
        action: "observe",
        target: 1,
        requires: Object.freeze(["travel"]),
        params: Object.freeze({ microSceneId: "MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP" })
      }),
      Object.freeze({
        slot: "relicObserve",
        title: "Observer la relique énergétique",
        action: "observe",
        target: 1,
        requires: Object.freeze(["context"]),
        params: Object.freeze({ cuoType: "tech_relic", microSceneId: "MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP" })
      }),
      Object.freeze({
        slot: "relicAnalyze",
        title: "Analyser l'activité résiduelle de la relique",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["relicObserve"]),
        params: Object.freeze({ cuoType: "tech_relic", microSceneId: "MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP" })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cette relique n'est pas totalement éteinte. Elle échange encore de l'énergie avec son environnement." ]),
      completed: Object.freeze(["La relique est encore active. Son analyse confirme une technologie énergétique ancienne sans qu'aucun système artificiel de surcharge soit nécessaire."])
    })
  });

  const ARCH18 = Object.freeze({
    id: "ARCH-18",
    title: "Objet de mémoire",
    description: "Dans le même contexte cérémoniel, observer la relique puis comparer ses symboles à deux stèles distinctes.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-17", count: 1 }),
    prerequisites: Object.freeze(["ARCH-17"]),
    bindActivationMap: true,
    priority: 263,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "relic",
        title: "Observer la relique dans son contexte cérémoniel",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ cuoType: "tech_relic", microSceneId: "MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP", requiredMapFact: "bibleActivation:ARCH-18", requiredMapField: "mapId" })
      }),
      Object.freeze({
        slot: "steles",
        title: "Comparer la relique à deux stèles distinctes",
        action: "observe",
        target: 2,
        requires: Object.freeze(["relic"]),
        params: Object.freeze({ cuoType: "stele", microSceneId: "MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP", distinctBy: "instanceId", requiredMapFact: "bibleActivation:ARCH-18", requiredMapField: "mapId" })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cet objet n'était pas seulement utile. Sa place et ses symboles donnent l'impression qu'il portait une mémoire collective."]),
      completed: Object.freeze(["La relique et les deux stèles partagent assez de signes pour soutenir une lecture cérémonielle ou commémorative."])
    })
  });


  // ARCH-R4 — Reliques, savoirs et premiers indices de peuples actuels (ARCH-19 → ARCH-29)
  const ARCH19 = Object.freeze({
    id: "ARCH-19",
    title: "Les instruments du conflit",
    description: "Découvrir la machine abandonnée et l'observer comme indice matériel d'un ancien usage conflictuel, sans généraliser cette conclusion à toute la civilisation.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-18", count: 1 }),
    prerequisites: Object.freeze(["ARCH-18"]),
    priority: 262,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 62,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({ id: "MSC-CUSTOM-MACHINE-ABANDONNEE", persistent: true, spawnOnce: true, contextRole: "archConflictInstrument" })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "travel", title: "Rejoindre un nouveau secteur de vestiges", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "weapon", title: "Observer la machine abandonnée", action: "observe", target: 1, requires: Object.freeze(["travel"]), params: Object.freeze({ cuoType: "ancient_machine_wreck", microSceneId: "MSC-CUSTOM-MACHINE-ABANDONNEE" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Une arme prouve un conflit, pas la nature entière d'un peuple. Je veux regarder cette machine avant d'en tirer davantage." ]),
      completed: Object.freeze(["La machine abandonnée constitue un indice crédible d'un usage conflictuel ancien, sans suffire à définir toute cette société."])
    })
  });

  const ARCH20 = Object.freeze({
    id: "ARCH-20",
    title: "La relique scientifique",
    description: "Rejoindre un nouveau secteur scientifique, puis étudier une relique et l’un de ses composants pour reconstituer narrativement une fonction de mesure ou d’expérimentation.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-19", count: 1 }),
    prerequisites: Object.freeze(["ARCH-19"]),
    priority: 261,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({
      size: "random", biome: "random",
      requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP", persistent: true, spawnOnce: true, contextRole: "archScientificRelic" })])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "travel", title: "Rejoindre un nouveau secteur susceptible d’abriter l’instrument", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "relic", title: "Observer l’instrument ancien", action: "observe", target: 1, requires: Object.freeze(["travel"]), params: Object.freeze({ cuoType: "tech_relic", microSceneId: "MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP" }) }),
      Object.freeze({ slot: "component", title: "Analyser un composant de l’instrument", action: "analyze", target: 1, requires: Object.freeze(["relic"]), params: Object.freeze({ cuoTypes: Object.freeze(["logic_prism", "pulse_core"]), microSceneId: "MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cet appareil ne transforme rien. Il semble conçu pour mesurer, comparer ou expérimenter." ]),
      completed: Object.freeze(["La relique et son composant soutiennent l’hypothèse d’un instrument scientifique ancien."])
    })
  });

  const ARCH21 = Object.freeze({
    id: "ARCH-21",
    title: "Archives cristallines",
    description: "Découvrir un support cristallin associé aux ruines puis réaliser deux lectures complémentaires du même cristal sans l'endommager.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-20", count: 1 }),
    prerequisites: Object.freeze(["ARCH-20"]),
    priority: 260,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({
      size: "random", biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({ id: "MSC-CUSTOM-RUINE-MODULAIRE4", persistent: true, spawnOnce: true, contextRole: "archArchiveRuin" }),
        Object.freeze({ id: "MSC-CRYSTAL-GROVE-001", persistent: true, spawnOnce: true, contextRole: "archCrystalArchive" })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "travel", title: "Rejoindre un nouveau secteur d'archives", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "surface", title: "Observer le cristal porteur de motifs", action: "observe", target: 1, requires: Object.freeze(["travel"]), params: Object.freeze({ cuoType: "crystal", microSceneId: "MSC-CRYSTAL-GROVE-001", distinctBy: "instanceId" }) }),
      Object.freeze({ slot: "analysis", title: "Compléter l'analyse du même support", action: "analyze", target: 1, requires: Object.freeze(["surface"]), params: Object.freeze({ cuoType: "crystal", microSceneId: "MSC-CRYSTAL-GROVE-001", relation: Object.freeze({ fromSlot: "surface", sameBy: Object.freeze(["instanceId"]) }) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Les motifs internes varient comme une écriture. Ce cristal pourrait être une archive." ]),
      completed: Object.freeze(["Deux lectures complémentaires du même support rendent plausible l'existence d'une archive cristalline."])
    })
  });

  const ARCH22 = Object.freeze({
    id: "ARCH-22",
    title: "Carte du ciel ancien",
    description: "Après deux nouvelles maps, retrouver un observatoire et comparer trois repères physiques à une carte céleste reconstruite narrativement.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 2, uniqueOnly: true }),
    prerequisites: Object.freeze(["ARCH-21"]),
    bindActivationMap: true,
    priority: 259,
    passivePriorityAxis: "exploration",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 90,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    mapGeneration: Object.freeze({ size: "random", biome: "random", requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-ASTROLOGY", persistent: true, spawnOnce: true, contextRole: "archAncientSkyMap" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "context", title: "Retrouver la structure astronomique", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-ASTROLOGY", requiredMapFact: "bibleActivation:ARCH-22", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "markers", title: "Observer trois repères célestes distincts", action: "observe", target: 3, requires: Object.freeze(["context"]), params: Object.freeze({ cuoType: "arch", microSceneId: "MSC-CUSTOM-ASTROLOGY", distinctBy: "instanceId", requiredMapFact: "bibleActivation:ARCH-22", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Certaines étoiles ne sont plus à la même place. Cette carte peut aussi dater ses auteurs." ]),
      completed: Object.freeze(["Trois repères concordants suffisent à comparer narrativement cette carte au ciel actuel."])
    })
  });

  const ARCH23 = Object.freeze({
    id: "ARCH-23",
    title: "La balise oubliée",
    description: "Après deux nouvelles maps au sud, découvrir une ancienne balise et étudier son relais pour comprendre narrativement la direction de son signal.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", direction: "south", count: 2, uniqueOnly: true }),
    prerequisites: Object.freeze(["ARCH-22"]),
    bindActivationMap: true,
    priority: 258,
    passivePriorityAxis: "exploration",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 92,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    mapGeneration: Object.freeze({ size: "random", biome: "random", requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-TECH-RELAY-001", persistent: true, spawnOnce: true, contextRole: "archAncientRelay" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "beacon", title: "Observer la balise ancienne", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ cuoType: "survey_beacon", microSceneId: "MSC-TECH-RELAY-001", requiredMapFact: "bibleActivation:ARCH-23", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "signal", title: "Analyser un composant du relais", action: "analyze", target: 1, requires: Object.freeze(["beacon"]), params: Object.freeze({ cuoTypes: Object.freeze(["relay_block", "pulse_core", "memory_capsule"]), microSceneId: "MSC-TECH-RELAY-001", requiredMapFact: "bibleActivation:ARCH-23", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Elle ne diffusait pas au hasard. Quelqu'un devait écouter ce signal." ]),
      completed: Object.freeze(["La balise et son relais permettent de proposer une direction de communication sans simuler une fréquence dédiée."])
    })
  });

  const ARCH24 = Object.freeze({
    id: "ARCH-24",
    title: "Bibliothèque brisée",
    description: "Réunir quinze composants ou noyaux issus de technologies anciennes afin d'assembler narrativement plusieurs fragments de savoir compatibles.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-23", count: 1 }),
    prerequisites: Object.freeze(["ARCH-23"]),
    priority: 257,
    passivePriorityAxis: "collection",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({ slot: "firstFragment", title: "Récupérer un premier fragment technologique", action: "collect", target: 1, requires: Object.freeze([]), params: Object.freeze({ cuoTypes: Object.freeze(["relay_block", "pulse_core", "memory_capsule", "logic_prism"]) }) }),
      Object.freeze({ slot: "fragments", title: "Récupérer quatorze fragments supplémentaires", action: "collect", target: 14, requires: Object.freeze(["firstFragment"]), params: Object.freeze({ cuoTypes: Object.freeze(["relay_block", "pulse_core", "memory_capsule", "logic_prism"]) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Aucun fragment ne suffit, mais ensemble ils peuvent décrire une société complexe." ]),
      progress: Object.freeze([Object.freeze({ slot: "fragments", atCount: 4, text: "Quatre fragments donnent déjà un premier ensemble compatible ; il faut poursuivre pour consolider la lecture." })]),
      completed: Object.freeze(["Quinze composants et noyaux récupérés forment une base suffisante pour reconstruire narrativement une bibliothèque fragmentaire."])
    })
  });

  const ARCH25 = Object.freeze({
    id: "ARCH-25",
    title: "Des traces trop récentes",
    description: "Découvrir deux nouvelles maps après la bibliothèque brisée puis explorer 50 % de la seconde afin d'y reconnaître narrativement des traces récentes.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 2, uniqueOnly: true }),
    prerequisites: Object.freeze(["ARCH-24"]),
    bindActivationMap: true,
    priority: 256,
    passivePriorityAxis: "exploration",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 86,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({ slot: "firstSweep", title: "Commencer le relevé de la deuxième nouvelle map", action: "explore-zone", target: 25, requires: Object.freeze([]), params: Object.freeze({ metric: "surfacePercent", threshold: 25, scope: "map", requiredMapFact: "bibleActivation:ARCH-25", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "coverage", title: "Explorer 50 % de la deuxième nouvelle map", action: "explore-zone", target: 50, requires: Object.freeze(["firstSweep"]), params: Object.freeze({ metric: "surfacePercent", threshold: 50, scope: "map", requiredMapFact: "bibleActivation:ARCH-25", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Deux nouveaux territoires permettront de vérifier si certaines marques sont trop récentes pour appartenir aux anciens." ]),
      completed: Object.freeze(["La moitié de cette deuxième map est maintenant couverte. Certaines traces semblent trop récentes pour être animales, météorologiques ou antiques."])
    })
  });

  const ARCH26 = Object.freeze({
    id: "ARCH-26",
    title: "Le feu encore tiède",
    description: "Découvrir un foyer récent et observer son feu afin d'étayer narrativement l'idée d'un abandon très récent.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-25", count: 1 }),
    prerequisites: Object.freeze(["ARCH-25"]),
    priority: 255,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 90,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ size: "random", biome: "random", requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-FOYER-ANCIEN", persistent: true, spawnOnce: true, contextRole: "archRecentFire" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "travel", title: "Chercher un foyer récent sur une nouvelle map", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "fire", title: "Observer le foyer encore identifiable", action: "observe", target: 1, requires: Object.freeze(["travel"]), params: Object.freeze({ cuoType: "base_fire", microSceneId: "MSC-CUSTOM-FOYER-ANCIEN" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["La chaleur résiduelle peut lever le doute : je veux vérifier ce foyer sans perturber d'éventuels occupants." ]),
      completed: Object.freeze(["Le foyer constitue une preuve physique suffisamment récente pour rendre une présence intelligente actuelle plausible."])
    })
  });

  const ARCH27 = Object.freeze({
    id: "ARCH-27",
    title: "Outils contemporains",
    description: "Revenir sur le même foyer et observer deux objets distincts de sa micro-scène afin de comparer narrativement des gestes récents aux techniques anciennes.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-26", count: 1 }),
    prerequisites: Object.freeze(["ARCH-26"]),
    bindActivationMap: true,
    priority: 254,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    sequence: Object.freeze([
      Object.freeze({ slot: "firstObject", title: "Observer un premier objet autour du foyer", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-FOYER-ANCIEN", requiredMapFact: "bibleActivation:ARCH-27", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "secondObject", title: "Observer un second objet distinct autour du foyer", action: "observe", target: 1, requires: Object.freeze(["firstObject"]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-FOYER-ANCIEN", requiredMapFact: "bibleActivation:ARCH-27", requiredMapField: "mapId", relation: Object.freeze({ fromSlot: "firstObject", differentBy: Object.freeze(["instanceId"]) }) }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["La technique a changé, mais certains gestes peuvent encore rappeler ceux des bâtisseurs anciens." ]),
      completed: Object.freeze(["Deux objets distincts du même foyer suffisent à proposer narrativement un lien entre gestes récents et héritage technique ancien."])
    })
  });

  const ARCH28 = Object.freeze({
    id: "ARCH-28",
    title: "Habitat occupé",
    description: "Découvrir un habitat entretenu et observer deux signes distincts d'occupation active sans entrer dans la structure.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-27", count: 1 }),
    prerequisites: Object.freeze(["ARCH-27"]),
    priority: 253,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ size: "random", biome: "random", requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-HABITAT-RUINE", persistent: true, spawnOnce: true, contextRole: "archOccupiedHabitat" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "travel", title: "Chercher un habitat entretenu sur une nouvelle map", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "signs", title: "Observer deux signes distincts d'occupation", action: "observe", target: 2, requires: Object.freeze(["travel"]), params: Object.freeze({ cuoTypes: Object.freeze(["base_fire", "wall", "toile", "wood_plane"]), microSceneId: "MSC-CUSTOM-HABITAT-RUINE", distinctBy: "instanceId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cette structure semble réparée, approvisionnée et utilisée. Je vais rester à distance et chercher seulement des signes matériels." ]),
      completed: Object.freeze(["Deux signes distincts concordent : cet habitat peut être considéré comme occupé sans avoir eu besoin d'y entrer."])
    })
  });

  const ARCH29 = Object.freeze({
    id: "ARCH-29",
    title: "Compter sans déranger",
    description: "Parcourir trois nouvelles maps et cartographier cinq unités d’habitation distinctes : quatre vestiges composés de ruines variées, puis un habitat complet.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-28", count: 1 }),
    prerequisites: Object.freeze(["ARCH-28"]),
    priority: 252,
    passivePriorityAxis: "exploration",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    narrativeAxis: "ARCHEOLOGUE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "ARCHEOLOGUE", weight: 1 }),
    navigation: Object.freeze({ autonomousUnknownTravel: true }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "travel1", title: "Explorer une première nouvelle map et chercher des vestiges d’habitation", action: "travel", target: 1, requires: Object.freeze([]),
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", mapGenerationOnCount: Object.freeze({
          1: Object.freeze({ size: "random", biome: "random", requiredMicroScenes: Object.freeze([
            Object.freeze({ id: "MSC-CUSTOM-HABITAT-VESTIGE-01", persistent: true, spawnOnce: true, contextRole: "archPopulationHabitatVestigeA" }),
            Object.freeze({ id: "MSC-CUSTOM-HABITAT-VESTIGE-02", persistent: true, spawnOnce: true, contextRole: "archPopulationHabitatVestigeB" })
          ]) })
        }) })
      }),
      Object.freeze({ slot: "habitat1", title: "Découvrir un premier vestige d’habitation", action: "observe", target: 1, requires: Object.freeze(["travel1"]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-HABITAT-VESTIGE-01", distinctBy: "microSceneInstance" }) }),
      Object.freeze({ slot: "habitat2", title: "Découvrir un second vestige d’habitation", action: "observe", target: 1, requires: Object.freeze(["travel1"]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-HABITAT-VESTIGE-02", distinctBy: "microSceneInstance" }) }),
      Object.freeze({
        slot: "travel2", title: "Explorer une deuxième nouvelle map et poursuivre le relevé", action: "travel", target: 1, requires: Object.freeze(["habitat1", "habitat2"]),
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", mapGenerationOnCount: Object.freeze({
          1: Object.freeze({ size: "random", biome: "random", requiredMicroScenes: Object.freeze([
            Object.freeze({ id: "MSC-CUSTOM-HABITAT-VESTIGE-03", persistent: true, spawnOnce: true, contextRole: "archPopulationHabitatVestigeC" }),
            Object.freeze({ id: "MSC-CUSTOM-HABITAT-VESTIGE-04", persistent: true, spawnOnce: true, contextRole: "archPopulationHabitatVestigeD" })
          ]) })
        }) })
      }),
      Object.freeze({ slot: "habitat3", title: "Découvrir un troisième vestige d’habitation", action: "observe", target: 1, requires: Object.freeze(["travel2"]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-HABITAT-VESTIGE-03", distinctBy: "microSceneInstance" }) }),
      Object.freeze({ slot: "habitat4", title: "Découvrir un quatrième vestige d’habitation", action: "observe", target: 1, requires: Object.freeze(["travel2"]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-HABITAT-VESTIGE-04", distinctBy: "microSceneInstance" }) }),
      Object.freeze({
        slot: "travel3", title: "Explorer une troisième nouvelle map et chercher la dernière unité d’habitation", action: "travel", target: 1, requires: Object.freeze(["habitat3", "habitat4"]),
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", mapGenerationOnCount: Object.freeze({
          1: Object.freeze({ size: "random", biome: "random", requiredMicroScenes: Object.freeze([
            Object.freeze({ id: "MSC-CUSTOM-HABITAT-RUINE", persistent: true, spawnOnce: true, contextRole: "archPopulationHabitatComplete" })
          ]) })
        }) })
      }),
      Object.freeze({ slot: "habitat5", title: "Découvrir la dernière unité d’habitation", action: "observe", target: 1, requires: Object.freeze(["travel3"]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-HABITAT-RUINE", distinctBy: "microSceneInstance" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je peux estimer leur nombre sans les exposer à ma présence, en comptant les habitats plutôt que les individus." ]),
      completed: Object.freeze(["Cinq unités d’habitation réparties sur trois nouvelles maps donnent une première base pour estimer prudemment la taille de cette population."])
    })
  });


  // ARCH-R5 — Territoires actuels, rencontre prudente et choix de civilisation (ARCH-30 → ARCH-40)
  const ARCH30 = Object.freeze({
    id: "ARCH-30", title: "Territoires et frontières",
    description: "Suivre une limite territoriale actuelle à partir de trois marqueurs distincts.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-29", count: 1 }),
    prerequisites: Object.freeze(["ARCH-29"]), priority: 251, passivePriorityAxis: "exploration",
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "travel", title: "Rejoindre un nouveau territoire", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", mapGenerationOnCount: Object.freeze({ 1: Object.freeze({ size: "random", biome: "random", requiredObjects: Object.freeze([Object.freeze({ type: "stele", count: 3, contextRole: "archTerritoryMarkers" })]) }) }) }) }),
      Object.freeze({ slot: "markers", title: "Observer trois marqueurs de frontière distincts", action: "observe", target: 3, requires: Object.freeze(["travel"]), params: Object.freeze({ cuoType: "stele", distinctBy: "instanceId" }) }),
      Object.freeze({ slot: "follow", title: "Suivre la frontière vers un autre territoire", action: "travel", target: 1, requires: Object.freeze(["markers"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) })
    ])
  });

  const ARCH31 = Object.freeze({
    id: "ARCH-31", title: "Routes d’échange",
    description: "Identifier deux passages entretenus puis un lieu d’échange ou de stockage.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-30", count: 1 }),
    prerequisites: Object.freeze(["ARCH-30"]), priority: 250, passivePriorityAxis: "exploration",
    navigation: Object.freeze({ autonomousUnknownTravel: true, repeatUnknownTravelUntilComplete: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "route1", title: "Rejoindre une première route entretenue", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", mapGenerationOnCount: Object.freeze({ 1: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-ANCIENT-GATEWAY-001", persistent: true, spawnOnce: true })]) }) }) }) }),
      Object.freeze({ slot: "gate1", title: "Observer le premier passage", action: "observe", target: 1, requires: Object.freeze(["route1"]), params: Object.freeze({ microSceneId: "MSC-ANCIENT-GATEWAY-001" }) }),
      Object.freeze({ slot: "route2", title: "Rejoindre une seconde route entretenue", action: "travel", target: 1, requires: Object.freeze(["gate1"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", mapGenerationOnCount: Object.freeze({ 1: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-ANCIENT-GATEWAY-001", persistent: true, spawnOnce: true }), Object.freeze({ id: "MSC-CUSTOM-RESERVE-ABANDONEE", persistent: true, spawnOnce: true })]) }) }) }) }),
      Object.freeze({ slot: "gate2", title: "Observer le second passage", action: "observe", target: 1, requires: Object.freeze(["route2"]), params: Object.freeze({ microSceneId: "MSC-ANCIENT-GATEWAY-001" }) }),
      Object.freeze({ slot: "exchange", title: "Observer le lieu d’échange ou de stockage", action: "observe", target: 1, requires: Object.freeze(["gate2"]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-RESERVE-ABANDONEE" }) })
    ])
  });

  const ARCH32 = Object.freeze({
    id: "ARCH-32", title: "Population actuelle",
    description: "Comparer trois unités d’habitation actuelles sans compter directement leurs occupants.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-31", count: 1 }),
    prerequisites: Object.freeze(["ARCH-31"]), priority: 249, passivePriorityAxis: "exploration",
    navigation: Object.freeze({ autonomousUnknownTravel: true, repeatUnknownTravelUntilComplete: true }),
    sequence: Object.freeze([
      ...[1,2,3].flatMap((n) => [
        Object.freeze({ slot: `travel${n}`, title: `Rejoindre le secteur d’habitation ${n}`, action: "travel", target: 1, requires: n===1?Object.freeze([]):Object.freeze([`settlement${n-1}`]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", mapGenerationOnCount: Object.freeze({ 1: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-HABITAT-RUINE", persistent: true, spawnOnce: true })]) }) }) }) }),
        Object.freeze({ slot: `settlement${n}`, title: `Observer l’unité d’habitation ${n}`, action: "observe", target: 1, requires: Object.freeze([`travel${n}`]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-HABITAT-RUINE", distinctBy: "microSceneInstance" }) })
      ])
    ])
  });

  const ARCH33 = Object.freeze({
    id: "ARCH-33", title: "Symboles et coïncidences",
    description: "Confirmer deux véritables symboles anciens puis écarter deux ressemblances fortuites.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-32", count: 1 }),
    prerequisites: Object.freeze(["ARCH-32"]), priority: 248, passivePriorityAxis: "research",
    mapGeneration: Object.freeze({ requiredObjects: Object.freeze([Object.freeze({ type: "stele", count: 2 }), Object.freeze({ type: "eroded_monolith", count: 2 })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "confirmed", title: "Confirmer deux symboles anciens", action: "observe", target: 2, params: Object.freeze({ cuoType: "stele", distinctBy: "instanceId" }) }),
      Object.freeze({ slot: "coincidences", title: "Écarter deux ressemblances fortuites", action: "observe", target: 2, requires: Object.freeze(["confirmed"]), params: Object.freeze({ cuoType: "eroded_monolith", distinctBy: "instanceId" }) })
    ]),
    narrative: Object.freeze({ progress: Object.freeze([
      Object.freeze({ slot: "confirmed", atCount: 2, text: "Oui, ce sont bien des symboles anciens." }),
      Object.freeze({ slot: "coincidences", atCount: 2, text: "Ça ressemble, mais ce n’est qu’une coïncidence." })
    ]) })
  });

  const ARCH34 = Object.freeze({
    id: "ARCH-34", title: "Le site entretenu",
    description: "Rejoindre un ancien site encore entretenu puis l’observer une fois.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-33", count: 1 }),
    prerequisites: Object.freeze(["ARCH-33"]), priority: 247, passivePriorityAxis: "research",
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP", persistent: true, spawnOnce: true })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "travel", title: "Rejoindre le site entretenu", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "site", title: "Observer le site ancien encore entretenu", action: "observe", target: 1, requires: Object.freeze(["travel"]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP" }) })
    ])
  });

  const ARCH35 = Object.freeze({
    id: "ARCH-35", title: "Le signal répond",
    description: "Observer une ancienne balise puis récupérer quinze composants pendant qu’une présence intelligente reste à distance.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-34", count: 1 }),
    prerequisites: Object.freeze(["ARCH-34"]), priority: 246, passivePriorityAxis: "research",
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-TECH-RELAY-001", persistent: true, spawnOnce: true })]), requiredObjects: Object.freeze([Object.freeze({ type: "relay_block", count: 15 }), Object.freeze({ type: "npc_translucent", count: 1 })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "travel", title: "Rejoindre la map du signal", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "beacon", title: "Observer l’ancienne balise", action: "observe", target: 1, requires: Object.freeze(["travel"]), params: Object.freeze({ cuoType: "survey_beacon", microSceneId: "MSC-TECH-RELAY-001" }) }),
      Object.freeze({ slot: "components", title: "Récupérer quinze composants", action: "collect", target: 15, requires: Object.freeze(["beacon"]), params: Object.freeze({ cuoTypes: Object.freeze(["relay_block","pulse_core","logic_prism","memory_capsule"]) }) })
    ]),
    npcEncounters: Object.freeze([Object.freeze({ id: "arch35-witness", cuoType: "npc_translucent", speech: "⋔ ⌁ ∆ ⟟", despawnOnDistanceBelow: 10, despawnOnSlotComplete: "components" })])
  });

  const ARCH36 = Object.freeze({
    id: "ARCH-36", title: "Observation réciproque",
    description: "Observer une réaction réelle d’un Rocky puis obtenir au moins une réaction qui ne soit pas une fuite.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-35", count: 1 }),
    prerequisites: Object.freeze(["ARCH-35"]), priority: 245, passivePriorityAxis: "relations",
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-RUINED-SHRINE-001", persistent: true, spawnOnce: true })]), requiredObjects: Object.freeze([Object.freeze({ type: "npc_rocky", count: 1 })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reaction", title: "Observer une première réaction", action: "observe", target: 1, params: Object.freeze({ cuoType: "npc_rocky", reactionsAny: Object.freeze(["flee","vigilance","curiosity","calm"]), distinctBy: "instanceId" }) }),
      Object.freeze({ slot: "nonFlee", title: "Obtenir une réaction sans fuite", action: "observe", target: 1, params: Object.freeze({ cuoType: "npc_rocky", excludeReactions: Object.freeze(["flee"]), distinctBy: "instanceId" }) })
    ]),
    npcEncounters: Object.freeze([Object.freeze({ id: "arch36-rocky", cuoType: "npc_rocky", triggerDistance: 8, rearmDistance: 12, behaviors: Object.freeze(["flee","vigilance","curiosity"]) })])
  });

  const ARCH37 = Object.freeze({
    id: "ARCH-37", title: "Deux civilisations possibles",
    description: "Découvrir deux unités d’habitation culturellement distinctes sur deux maps différentes.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-36", count: 1 }),
    prerequisites: Object.freeze(["ARCH-36"]), priority: 244, passivePriorityAxis: "exploration",
    navigation: Object.freeze({ autonomousUnknownTravel: true, repeatUnknownTravelUntilComplete: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "travelRocky", title: "Rejoindre le premier territoire d’habitation", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", mapGenerationOnCount: Object.freeze({ 1: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-HABITAT-ROCKY-ARCH37", persistent: true, spawnOnce: true })]) }) }) }) }),
      Object.freeze({ slot: "rockyHabitat", title: "Approcher l’habitat rocheux", action: "observe", target: 1, requires: Object.freeze(["travelRocky"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "travelTranslucent", title: "Rejoindre le second territoire d’habitation", action: "travel", target: 1, requires: Object.freeze(["rockyHabitat"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", mapGenerationOnCount: Object.freeze({ 1: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-HABITAT-TRANSLUCENT-ARCH37", persistent: true, spawnOnce: true })]), requiredObjects: Object.freeze([Object.freeze({ type: "npc_translucent", count: 1 })]) }) }) }) }),
      Object.freeze({ slot: "translucentHabitat", title: "Approcher l’habitat translucide", action: "observe", target: 1, requires: Object.freeze(["travelTranslucent"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) })
    ]),
    proximityContexts: Object.freeze([
      Object.freeze({ id: "arch37-rocky-habitat", fact: "arch37:rocky-habitat", slot: "rockyHabitat", microSceneId: "MSC-CUSTOM-HABITAT-ROCKY-ARCH37", radius: 2.5 }),
      Object.freeze({ id: "arch37-translucent-habitat", fact: "arch37:translucent-habitat", slot: "translucentHabitat", microSceneId: "MSC-CUSTOM-HABITAT-TRANSLUCENT-ARCH37", radius: 2.5 })
    ]),
    npcEncounters: Object.freeze([Object.freeze({ id: "arch37-translucent", cuoType: "npc_translucent", despawnOnDistanceBelow: 10 })])
  });

  const ARCH38 = Object.freeze({
    id: "ARCH-38", title: "Approcher sans brusquer",
    description: "Réussir une approche prudente avec chaque civilisation puis choisir celle du premier contact approfondi.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-37", count: 1 }),
    prerequisites: Object.freeze(["ARCH-37"]), priority: 243, passivePriorityAxis: "relations",
    navigation: Object.freeze({ autonomousUnknownTravel: true, repeatUnknownTravelUntilComplete: true, autonomousKnownReturn: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "travelTranslucent", title: "Rejoindre une présence translucide", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", mapGenerationOnCount: Object.freeze({ 1: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-HABITAT-TRANSLUCENT-ARCH37", persistent: true, spawnOnce: true })]), requiredObjects: Object.freeze([Object.freeze({ type: "npc_translucent", count: 1 })]) }) }) }) }),
      Object.freeze({ slot: "approachTranslucent", title: "Réussir une approche prudente de la civilisation translucide", action: "observe", target: 1, requires: Object.freeze(["travelTranslucent"]), params: Object.freeze({ cuoType: "npc_translucent", excludeReactions: Object.freeze(["flee"]) }) }),
      Object.freeze({ slot: "travelRocky", title: "Rejoindre une présence rocheuse", action: "travel", target: 1, requires: Object.freeze(["approachTranslucent"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", mapGenerationOnCount: Object.freeze({ 1: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-HABITAT-ROCKY-ARCH37", persistent: true, spawnOnce: true })]), requiredObjects: Object.freeze([Object.freeze({ type: "npc_rocky", count: 1 })]) }) }) }) }),
      Object.freeze({ slot: "approachRocky", title: "Réussir une approche prudente de la civilisation rocheuse", action: "observe", target: 1, requires: Object.freeze(["travelRocky"]), params: Object.freeze({ cuoType: "npc_rocky", excludeReactions: Object.freeze(["flee"]) }) }),
      Object.freeze({ slot: "firstContact", title: "Choisir la civilisation du premier contact approfondi", action: "observe", target: 1, requires: Object.freeze(["approachTranslucent","approachRocky"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) })
    ]),
    runtimeValidation: Object.freeze({ type: "arch38-civilization-choice", contactSlot: "firstContact" }),
    npcEncounters: Object.freeze([
      Object.freeze({ id: "arch38-translucent", cuoType: "npc_translucent", triggerDistance: 8, rearmDistance: 12, behaviors: Object.freeze(["curiosity","vigilance","calm"]), contactMode: "symbols-only" }),
      Object.freeze({ id: "arch38-rocky", cuoType: "npc_rocky", triggerDistance: 8, rearmDistance: 12, behaviors: Object.freeze(["curiosity","vigilance","calm"]), contactMode: "symbols-only" })
    ]),
    narrative: Object.freeze({ progress: Object.freeze([
      Object.freeze({ slot: "approachRocky", atCount: 1, text: "Approcher prudemment rencontre plus de succès que l’approche rapide. La prochaine espèce que j’approche, je vais tenter un contact plus approfondi pour essayer de créer un échange." })
    ]) })
  });

  const ARCH39 = Object.freeze({
    id: "ARCH-39", title: "Les preuves convergent",
    description: "Réunir seize observations physiques distinctes et confirmer au moins une habitation de la civilisation choisie.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-38", count: 1 }),
    prerequisites: Object.freeze(["ARCH-38"]), priority: 242, passivePriorityAxis: "research",
    navigation: Object.freeze({ autonomousUnknownTravel: true, repeatUnknownTravelUntilComplete: true }),
    mapGeneration: Object.freeze({
      requiredObjects: Object.freeze([
        Object.freeze({ type: "stele", count: 1 }), Object.freeze({ type: "arch", count: 1 }), Object.freeze({ type: "tech_relic", count: 1 }),
        Object.freeze({ selectionFact: "civilization:arch-selected", selectionField: "civilizationId", choices: Object.freeze({ rocky: Object.freeze({ type: "npc_rocky", count: 1 }), translucent: Object.freeze({ type: "npc_translucent", count: 1 }) }) })
      ]),
      requiredMicroScenes: Object.freeze([
        Object.freeze({ id: "MSC-CUSTOM-RUINE-MODULAIRE1", persistent: true, spawnOnce: true }),
        Object.freeze({ selectionFact: "civilization:arch-selected", selectionField: "civilizationId", persistent: true, spawnOnce: true, choices: Object.freeze({ rocky: "MSC-CUSTOM-HABITAT-ROCKY-ARCH37", translucent: "MSC-CUSTOM-HABITAT-TRANSLUCENT-ARCH37" }) })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "maps", title: "Poursuivre l’enquête sur trois nouvelles maps", action: "travel", target: 3, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "evidence", title: "Observer seize preuves physiques distinctes", action: "observe", target: 16, params: Object.freeze({ distinctBy: "instanceId", anyOfCriteria: Object.freeze([Object.freeze({ cuoTypes: Object.freeze(["stele","arch","tech_relic"]) }), Object.freeze({ microSceneIds: Object.freeze(["MSC-CUSTOM-RUINE-MODULAIRE1","MSC-CUSTOM-HABITAT-ROCKY-ARCH37","MSC-CUSTOM-HABITAT-TRANSLUCENT-ARCH37"]) })]) }) }),
      Object.freeze({ slot: "housing", title: "Confirmer une habitation de la civilisation choisie", action: "observe", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) })
    ]),
    proximityContexts: Object.freeze([
      Object.freeze({ id: "arch39-rocky-housing", fact: "arch39:rocky-housing", slot: "housing", microSceneId: "MSC-CUSTOM-HABITAT-ROCKY-ARCH37", radius: 2.5, selectionFact: "civilization:arch-selected", selectionField: "civilizationId", selectionValue: "rocky" }),
      Object.freeze({ id: "arch39-translucent-housing", fact: "arch39:translucent-housing", slot: "housing", microSceneId: "MSC-CUSTOM-HABITAT-TRANSLUCENT-ARCH37", radius: 2.5, selectionFact: "civilization:arch-selected", selectionField: "civilizationId", selectionValue: "translucent" })
    ]),
    npcEncounters: Object.freeze([
      Object.freeze({ id: "arch39-rocky", cuoType: "npc_rocky", selectionFact: "civilization:arch-selected", selectionField: "civilizationId", selectionValue: "rocky", despawnOnDistanceBelow: 10 }),
      Object.freeze({ id: "arch39-translucent", cuoType: "npc_translucent", selectionFact: "civilization:arch-selected", selectionField: "civilizationId", selectionValue: "translucent", despawnOnDistanceBelow: 10 })
    ])
  });

  const ARCH40 = Object.freeze({
    id: "ARCH-40", title: "Au bord de la rencontre",
    description: "Poursuivre cinq observations concordantes avant de prolonger l’étude de la civilisation choisie.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-39", count: 1 }),
    prerequisites: Object.freeze(["ARCH-39"]), priority: 241, passivePriorityAxis: "research",
    navigation: Object.freeze({ autonomousUnknownTravel: true, repeatUnknownTravelUntilComplete: true }),
    mapGeneration: Object.freeze({
      requiredObjects: Object.freeze([Object.freeze({ type: "stele", count: 1 }), Object.freeze({ type: "arch", count: 1 }), Object.freeze({ type: "tech_relic", count: 1 })]),
      requiredMicroScenes: Object.freeze([
        Object.freeze({ id: "MSC-CUSTOM-RUINE-MODULAIRE1", persistent: true, spawnOnce: true }),
        Object.freeze({ selectionFact: "civilization:arch-selected", selectionField: "civilizationId", persistent: true, spawnOnce: true, choices: Object.freeze({ rocky: "MSC-CUSTOM-HABITAT-ROCKY-ARCH37", translucent: "MSC-CUSTOM-HABITAT-TRANSLUCENT-ARCH37" }) })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "evidence", title: "Observer cinq signes concordants", action: "observe", target: 5, params: Object.freeze({ distinctBy: "instanceId", anyOfCriteria: Object.freeze([Object.freeze({ cuoTypes: Object.freeze(["stele","arch","tech_relic"]) }), Object.freeze({ microSceneIds: Object.freeze(["MSC-CUSTOM-RUINE-MODULAIRE1","MSC-CUSTOM-HABITAT-ROCKY-ARCH37","MSC-CUSTOM-HABITAT-TRANSLUCENT-ARCH37"]) })]) }) }),
      Object.freeze({ slot: "housing", title: "Observer au moins une habitation de la civilisation choisie", action: "observe", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) })
    ]),
    proximityContexts: Object.freeze([
      Object.freeze({ id: "arch40-rocky-housing", fact: "arch40:rocky-housing", slot: "housing", microSceneId: "MSC-CUSTOM-HABITAT-ROCKY-ARCH37", radius: 2.5, selectionFact: "civilization:arch-selected", selectionField: "civilizationId", selectionValue: "rocky" }),
      Object.freeze({ id: "arch40-translucent-housing", fact: "arch40:translucent-housing", slot: "housing", microSceneId: "MSC-CUSTOM-HABITAT-TRANSLUCENT-ARCH37", radius: 2.5, selectionFact: "civilization:arch-selected", selectionField: "civilizationId", selectionValue: "translucent" })
    ]),
    narrative: Object.freeze({ revealed: Object.freeze(["Synthèse des observations sur la civilisation choisie : je vais continuer d’observer quelques signes et espérer une nouvelle rencontre."]) })
  });


  // ANN-ARCH-W — scènes architecturales remarquables.
  // Les MSC existent par la population normale : aucune génération missionnelle.
  const ANNARCHW01 = Object.freeze({
    id: "ANN-ARCH-W01",
    title: "Une ligne dans les ruines",
    description: "Lire un fragment de mur ancien et ses débris comme une structure cohérente plutôt que comme un amas d’objets isolés.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 1, uniqueOnly: true, featuredMicroSceneIdsAny: Object.freeze(["MSC-CUSTOM-WALL-RUIN-STRAIGHT"]) }),
    prerequisites: Object.freeze(["ARCH-02"]),
    bindActivationMap: true, triggerOnly: true,
    priority: 240, passivePriorityAxis: "research", ponderation: 0.45,
    obsessionEligible: false, obsessionIntensity: 2, souvenir: true, memoryValence: "positive", scoreTrauma: 32,
    sequence: Object.freeze([
      Object.freeze({ slot: "wall", title: "Observer le mur", action: "observe", target: 1, params: Object.freeze({ cuoType: "wall", microSceneId: "MSC-CUSTOM-WALL-RUIN-STRAIGHT", requiredMapFact: "bibleActivation:ANN-ARCH-W01", requiredMapField: "mapId", completionSiteFact: "annArchW01:site" }) }),
      Object.freeze({ slot: "debris", title: "Observer au moins deux débris appartenant à la même MSC", action: "observe", target: 2, requires: Object.freeze(["wall"]), params: Object.freeze({ cuoType: "debris", microSceneId: "MSC-CUSTOM-WALL-RUIN-STRAIGHT", distinctBy: "instanceId", allowPassiveMSCObject: true, requiredMapFact: "bibleActivation:ANN-ARCH-W01", requiredMapField: "mapId", requiredSiteFact: "annArchW01:site" }) }),
      Object.freeze({ slot: "axis", title: "Analyser l’axe général de la construction", action: "analyze", target: 1, requires: Object.freeze(["debris"]), params: Object.freeze({ cuoType: "wall", microSceneId: "MSC-CUSTOM-WALL-RUIN-STRAIGHT", requiredMapFact: "bibleActivation:ANN-ARCH-W01", requiredMapField: "mapId", requiredSiteFact: "annArchW01:site" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Les pierres sont dispersées, mais le mur garde une direction nette. Je peux encore lire la structure derrière les dégâts."]),
      progress: Object.freeze([Object.freeze({ slot: "debris", atCount: 2, text: "Les gravats suivent l’ancien axe. Même abîmée, la construction conserve une logique." })]),
      completed: Object.freeze(["Je peux restituer une limite et une orientation. Si je retrouve la même manière de bâtir ailleurs, son état pourra raconter ce qui lui est arrivé.", Object.freeze({ route: "journal", text: "Une ligne dans les ruines — Un fragment de mur ancien conserve suffisamment de cohérence pour restituer une orientation et une limite. Les gravats ne sont pas seulement des objets isolés : leur position permet encore de reconstruire une partie de la structure disparue." })])
    })
  });

  const ANNARCHW02 = Object.freeze({
    id: "ANN-ARCH-W02", title: "Le même langage, brisé",
    description: "Reconnaître dans un mur effondré le même vocabulaire architectural que dans le premier site, puis distinguer vieillissement et destruction structurale.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 1, uniqueOnly: true, featuredMicroSceneIdsAny: Object.freeze(["MSC-CUSTOM-WALL-RUIN-COLLAPSED"]) }),
    prerequisites: Object.freeze(["ANN-ARCH-W01"]), bindActivationMap: true, triggerOnly: true,
    priority: 239, passivePriorityAxis: "research", ponderation: 0.5, obsessionEligible: true, obsessionIntensity: 3,
    sequence: Object.freeze([
      Object.freeze({ slot: "wall", title: "Observer le mur effondré", action: "observe", target: 1, params: Object.freeze({ cuoType: "wall", microSceneId: "MSC-CUSTOM-WALL-RUIN-COLLAPSED", requiredMapFact: "bibleActivation:ANN-ARCH-W02", requiredMapField: "mapId", completionSiteFact: "annArchW02:site" }) }),
      Object.freeze({ slot: "debris", title: "Observer au moins deux débris de cette MSC", action: "observe", target: 2, requires: Object.freeze(["wall"]), params: Object.freeze({ cuoType: "debris", microSceneId: "MSC-CUSTOM-WALL-RUIN-COLLAPSED", distinctBy: "instanceId", allowPassiveMSCObject: true, requiredMapFact: "bibleActivation:ANN-ARCH-W02", requiredMapField: "mapId", requiredSiteFact: "annArchW02:site" }) }),
      Object.freeze({ slot: "compare", title: "Comparer l’organisation avec le souvenir de W01", action: "analyze", target: 1, requires: Object.freeze(["debris"]), params: Object.freeze({ cuoType: "wall", microSceneId: "MSC-CUSTOM-WALL-RUIN-COLLAPSED", requiredMapFact: "bibleActivation:ANN-ARCH-W02", requiredMapField: "mapId", requiredSiteFact: "annArchW02:site" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je connais cette manière de construire. Mais ici, ce n’est pas seulement plus vieux : quelque chose a changé la structure entière."]),
      progress: Object.freeze([Object.freeze({ slot: "debris", atCount: 2, text: "Les matériaux et le vocabulaire correspondent. L’état, lui, raconte une rupture." })]),
      completed: Object.freeze(["Avant d’imaginer une intervention, je dois demander au terrain ce qu’il peut expliquer."])
    })
  });

  const ANNARCHW03 = Object.freeze({
    id: "ANN-ARCH-W03", title: "La roche comme témoin",
    description: "Quitter le mur effondré et utiliser les acquis géologiques existants pour mesurer ce que le terrain peut réellement expliquer de sa destruction.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ANN-ARCH-W02", count: 1 }),
    prerequisites: Object.freeze(["ANN-ARCH-W02"]), priority: 238, passivePriorityAxis: "research", ponderation: 0.45, obsessionEligible: false, obsessionIntensity: 2,
    navigation: Object.freeze({ autonomousKnownDestination: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "leave", title: "Quitter le site et rejoindre un indice géologique déjà connu", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, knownDestination: Object.freeze({ family: "geology" }), completionArrivalFact: "annArchW03:geologyMap", completionArrivalField: "mapId" }) }),
      Object.freeze({ slot: "geology", title: "Observer ou analyser un indice géologique existant", action: "analyze", target: 1, requires: Object.freeze(["leave"]), params: Object.freeze({ family: "geology", requiredMapFact: "annArchW03:geologyMap", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "compare", title: "Comparer cette signature aux déformations mémorisées du mur", action: "research", target: 1, requires: Object.freeze(["geology"]), params: Object.freeze({ requiredMapFact: "annArchW03:geologyMap", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Avant d’inventer une histoire, je dois laisser parler le terrain. Une rupture géologique laisse des signatures que les pierres d’un bâtiment ne peuvent pas masquer."]),
      progress: Object.freeze([Object.freeze({ slot: "geology", atCount: 1, text: "Le terrain peut expliquer une partie des contraintes. Pas encore la distribution complète des gravats." })]),
      completed: Object.freeze(["J’ai une cause naturelle plausible pour une partie de la chute. Il faut retourner voir ce qui reste inexpliqué."])
    })
  });

  const ANNARCHW04 = Object.freeze({
    id: "ANN-ARCH-W04", title: "Ce qui manque dans les gravats",
    description: "Revenir au même mur effondré avec la référence géologique acquise et déterminer si la disposition actuelle résulte uniquement d’une destruction naturelle.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ANN-ARCH-W03", count: 1 }),
    prerequisites: Object.freeze(["ANN-ARCH-W03"]), priority: 237, passivePriorityAxis: "research", ponderation: 0.7, obsessionEligible: true, obsessionIntensity: 4, souvenir: true, memoryValence: "positive", scoreTrauma: 60,
    navigation: Object.freeze({ autonomousKnownDestination: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "return", title: "Revenir dans la même instance persistante de W02", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, knownDestinationFact: "annArchW02:site" }) }),
      Object.freeze({ slot: "reexamine", title: "Réexaminer le mur et ses gravats", action: "analyze", target: 1, requires: Object.freeze(["return"]), params: Object.freeze({ cuoType: "wall", microSceneId: "MSC-CUSTOM-WALL-RUIN-COLLAPSED", requiredSiteFact: "annArchW02:site" }) }),
      Object.freeze({ slot: "compare", title: "Comparer la distribution finale aux contraintes géologiques acquises", action: "research", target: 1, requires: Object.freeze(["reexamine"]), params: Object.freeze({}) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le sol explique une partie de la chute. Pas tout. Si le mur s’était seulement effondré ici, certaines pierres devraient encore être à leur place."]),
      progress: Object.freeze([Object.freeze({ slot: "reexamine", atCount: 1, text: "La destruction naturelle est réelle, mais la distribution actuelle suppose une autre transformation." })]),
      completed: Object.freeze(["Une partie de la structure avait peut-être déjà été démontée, récupérée ou déplacée avant — ou après — l’effondrement. Je ne peux pas encore choisir entre ces histoires.", Object.freeze({ route: "journal", text: "Une ruine a plusieurs histoires — Le mur effondré porte au moins deux histoires différentes. Le terrain explique une partie de sa destruction, mais pas la disparition ou le déplacement de certains éléments. Une construction ancienne peut continuer à être transformée bien après son édification : par la planète, par ses occupants ou par ceux qui viennent après eux." })])
    })
  });


  const contactNpcEntries = (id, options = {}) => {
    const selectionFact = String(options.selectionFact || "civilization:arch-selected");
    const selectionField = String(options.selectionField || "civilizationId");
    return Object.freeze([
      Object.freeze({ id: `${id}-rocky`, cuoType: "npc_rocky", selectionFact, selectionField, selectionValue: "rocky", triggerDistance: options.triggerDistance || 8, rearmDistance: options.rearmDistance || 12, behaviors: Object.freeze(options.behaviors || ["curiosity","calm","vigilance"]), cause: options.cause || "contact-initiative", autoContact: options.autoContact === true, contactMode: options.contactMode || null, contactSlot: options.contactSlot || null, postContactReaction: options.postContactReaction || null, postContactBehaviors: Object.freeze(options.postContactBehaviors || ["curiosity","calm"]), speech: options.speech || null, speechTriggerDistance: options.speechTriggerDistance || null, emitDialogue: options.emitDialogue === true, spatialDecision: options.spatialDecision === true, spatialChoices: Object.freeze(options.spatialChoices || ["approach","hold","retreat"]), spatialStepDistance: options.spatialStepDistance || 1.2, requiresSlotComplete: options.requiresSlotComplete || null }),
      Object.freeze({ id: `${id}-translucent`, cuoType: "npc_translucent", selectionFact, selectionField, selectionValue: "translucent", triggerDistance: options.triggerDistance || 8, rearmDistance: options.rearmDistance || 12, behaviors: Object.freeze(options.behaviors || ["curiosity","calm","vigilance"]), cause: options.cause || "contact-initiative", autoContact: options.autoContact === true, contactMode: options.contactMode || null, contactSlot: options.contactSlot || null, postContactReaction: options.postContactReaction || null, postContactBehaviors: Object.freeze(options.postContactBehaviors || ["curiosity","calm"]), speech: options.speech || null, speechTriggerDistance: options.speechTriggerDistance || null, emitDialogue: options.emitDialogue === true, spatialDecision: options.spatialDecision === true, spatialChoices: Object.freeze(options.spatialChoices || ["approach","hold","retreat"]), spatialStepDistance: options.spatialStepDistance || 1.2, requiresSlotComplete: options.requiresSlotComplete || null })
    ]);
  };

  const contactNpcRequirement = (selectionFact = "civilization:arch-selected") => Object.freeze({
    selectionFact,
    selectionField: "civilizationId",
    choices: Object.freeze({
      rocky: Object.freeze({ type: "npc_rocky", count: 1 }),
      translucent: Object.freeze({ type: "npc_translucent", count: 1 })
    })
  });
  const contactSelectedNpcRequirement = contactNpcRequirement();
  const contactSelectedNpcMapGeneration = Object.freeze({
    requiredObjects: Object.freeze([contactSelectedNpcRequirement])
  });

  const CONTACT01 = Object.freeze({
    id: "CONTACT-01", title: "Rester à la bonne distance",
    description: "Rencontrer la civilisation choisie sans provoquer de fuite et respecter une distance prudente.",
    pattern: "SEQUENCE_ACTIONS", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ARCH-40", count: 1 }), prerequisites: Object.freeze(["ARCH-40"]), priority: 240, passivePriorityAxis: "relations",
    slots: Object.freeze({}),
    mapGeneration: contactSelectedNpcMapGeneration,
    sequence: Object.freeze([Object.freeze({ slot: "contact", title: "Respecter une distance prudente", action: "observe", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) })]),
    runtimeValidation: Object.freeze({ type: "civilization-contact", phase: "approach", slot: "contact" }),
    npcEncounters: contactNpcEntries("contact01", { cause: "contact-initiative", behaviors: ["curiosity","calm","vigilance"] })
  });

  const CONTACT02 = Object.freeze({
    id: "CONTACT-02", title: "Laisser l’autre choisir la distance",
    description: "Rester disponible sans réduire la distance et laisser le PNJ choisir sa réaction spatiale.",
    pattern: "SEQUENCE_ACTIONS", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-01", count: 1 }), prerequisites: Object.freeze(["CONTACT-01"]), priority: 239, passivePriorityAxis: "relations",
    slots: Object.freeze({}),
    mapGeneration: contactSelectedNpcMapGeneration,
    sequence: Object.freeze([Object.freeze({ slot: "contact", title: "Laisser le PNJ choisir la distance", action: "observe", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) })]),
    runtimeValidation: Object.freeze({ type: "civilization-contact", phase: "initiative", slot: "contact" }),
    npcEncounters: contactNpcEntries("contact02", { cause: "contact-initiative", spatialDecision: true, spatialChoices: ["approach","hold","retreat"] })
  });

  const CONTACT03 = Object.freeze({
    id: "CONTACT-03", title: "Un geste qui revient",
    description: "Constater le même signal relationnel lors de deux rencontres distinctes.",
    pattern: "SEQUENCE_ACTIONS", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-02", count: 1 }), prerequisites: Object.freeze(["CONTACT-02"]), priority: 238, passivePriorityAxis: "relations",
    slots: Object.freeze({}),
    mapGeneration: contactSelectedNpcMapGeneration,
    sequence: Object.freeze([Object.freeze({ slot: "contact", title: "Reconnaître deux fois le même signal", action: "observe", target: 2, params: Object.freeze({ eventDriven: true, catalogManaged: true }) })]),
    runtimeValidation: Object.freeze({ type: "civilization-contact", phase: "signal-repeat", slot: "contact" }),
    npcEncounters: contactNpcEntries("contact03", { cause: "contact-signal", behaviors: ["curiosity","calm"] })
  });

  const CONTACT04 = Object.freeze({
    id: "CONTACT-04", title: "Répondre sans imposer",
    description: "Répondre simplement au signal puis obtenir une réaction non hostile du PNJ.",
    pattern: "SEQUENCE_ACTIONS", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-03", count: 1 }), prerequisites: Object.freeze(["CONTACT-03"]), priority: 237, passivePriorityAxis: "relations",
    slots: Object.freeze({}),
    mapGeneration: contactSelectedNpcMapGeneration,
    sequence: Object.freeze([Object.freeze({ slot: "contact", title: "Répondre sans imposer", action: "observe", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) })]),
    runtimeValidation: Object.freeze({ type: "civilization-contact", phase: "response", slot: "contact" }),
    npcEncounters: contactNpcEntries("contact04", { cause: "contact-initiative", behaviors: ["curiosity","calm"], autoContact: true, contactMode: "symbols-only", contactSlot: "contact", postContactReaction: "contact-response", postContactBehaviors: ["curiosity","calm"] })
  });

  const CONTACT05 = Object.freeze({
    id: "CONTACT-05", title: "Revenir sans être rejeté",
    description: "Revenir lors d’une nouvelle rencontre et constater une réaction cohérente avec la relation construite.",
    pattern: "SEQUENCE_ACTIONS", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-04", count: 1 }), prerequisites: Object.freeze(["CONTACT-04"]), priority: 236, passivePriorityAxis: "relations",
    slots: Object.freeze({}),
    mapGeneration: contactSelectedNpcMapGeneration,
    sequence: Object.freeze([Object.freeze({ slot: "contact", title: "Être reconnu lors d’une nouvelle rencontre", action: "observe", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) })]),
    runtimeValidation: Object.freeze({ type: "civilization-contact", phase: "return", slot: "contact" }),
    npcEncounters: contactNpcEntries("contact05", { cause: "contact-return", behaviors: ["curiosity","calm","observation"] })
  });

  const CONTACT06 = Object.freeze({
    id: "CONTACT-06", title: "Quelques mots au milieu des signes",
    description: "Recevoir une émission très courte mêlant signes et indice contextuel, sans traduction universelle.",
    pattern: "SEQUENCE_ACTIONS", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-05", count: 1 }), prerequisites: Object.freeze(["CONTACT-05"]), priority: 235, passivePriorityAxis: "relations",
    slots: Object.freeze({}),
    mapGeneration: contactSelectedNpcMapGeneration,
    sequence: Object.freeze([Object.freeze({ slot: "contact", title: "Comprendre un indice contextuel", action: "observe", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) })]),
    runtimeValidation: Object.freeze({ type: "civilization-contact", phase: "dialogue", slot: "contact" }),
    npcEncounters: contactNpcEntries("contact06", { speech: "⋔ ⌁ … stèle … ⧖", speechTriggerDistance: 8, emitDialogue: true, cause: "contact-dialogue", behaviors: ["calm","curiosity"] })
  });

  const CONTACT07 = Object.freeze({
    id: "CONTACT-07", title: "Suivre une indication",
    description: "Reconnaître une indication du PNJ puis observer le lieu réel qu’elle désigne.",
    pattern: "SEQUENCE_ACTIONS", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-06", count: 1 }), prerequisites: Object.freeze(["CONTACT-06"]), priority: 234, passivePriorityAxis: "relations",
    slots: Object.freeze({}),
    mapGeneration: Object.freeze({ requiredObjects: Object.freeze([contactSelectedNpcRequirement, Object.freeze({ type: "stele", count: 1 })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "indication", title: "Comprendre l’indication", action: "observe", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "follow", title: "Observer le lieu indiqué", action: "observe", target: 1, requires: Object.freeze(["indication"]), params: Object.freeze({ cuoType: "stele" }) })
    ]),
    runtimeValidation: Object.freeze({ type: "civilization-contact", phase: "indication", slot: "indication" }),
    npcEncounters: contactNpcEntries("contact07", { speech: "⌁ ⋔ … stèle … →", speechTriggerDistance: 8, emitDialogue: true, cause: "contact-indication", behaviors: ["calm","curiosity"] })
  });

  const CONTACT08 = Object.freeze({
    id: "CONTACT-08", title: "Agir ensemble",
    description: "Répondre à une demande simple par une action réelle du monde puis observer une réaction positive.",
    pattern: "SEQUENCE_ACTIONS", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-07", count: 1 }), prerequisites: Object.freeze(["CONTACT-07"]), priority: 233, passivePriorityAxis: "relations",
    slots: Object.freeze({}),
    mapGeneration: Object.freeze({ requiredObjects: Object.freeze([contactSelectedNpcRequirement, Object.freeze({ type: "relay_block", count: 1 })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "contribute", title: "Contribuer à une demande simple", action: "collect", target: 1, params: Object.freeze({ cuoType: "relay_block" }) }),
      Object.freeze({ slot: "contact", title: "Observer la réaction après la coopération", action: "observe", target: 1, requires: Object.freeze(["contribute"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) })
    ]),
    runtimeValidation: Object.freeze({ type: "civilization-contact", phase: "cooperation-reaction", slot: "contact" }),
    npcEncounters: contactNpcEntries("contact08", { cause: "contact-cooperation", behaviors: ["calm","curiosity"], requiresSlotComplete: "contribute" })
  });

  const CONTACT09 = Object.freeze({
    id: "CONTACT-09", title: "Reconnu comme ami",
    description: "Revenir après la coopération et obtenir une interaction positive qui établit la relation amicale persistante.",
    pattern: "SEQUENCE_ACTIONS", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-08", count: 1 }), prerequisites: Object.freeze(["CONTACT-08"]), priority: 232, passivePriorityAxis: "relations",
    slots: Object.freeze({}),
    mapGeneration: contactSelectedNpcMapGeneration,
    sequence: Object.freeze([Object.freeze({ slot: "contact", title: "Être reconnu comme ami", action: "observe", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) })]),
    runtimeValidation: Object.freeze({
      type: "civilization-contact", phase: "friendly", slot: "contact",
      nextContactMissionId: "CONTACT-10",
      nextContactSelectionFact: "civilization:contact-secondary"
    }),
    npcEncounters: contactNpcEntries("contact09", { cause: "contact-initiative", behaviors: ["calm","curiosity"], autoContact: true, contactMode: "symbols-only", contactSlot: "contact", postContactReaction: "contact-friendly", postContactBehaviors: ["calm","curiosity"] })
  });

  const contactSecondaryArcIds = Object.freeze([
    "CONTACT-10", "CONTACT-11", "CONTACT-12",
    "CONTACT-13", "CONTACT-14", "CONTACT-15"
  ]);
  const contactSecondarySelectionFact = "civilization:contact-secondary";
  const contactSecondaryValidation = (phase, slot = "contact") => Object.freeze({
    type: "civilization-contact",
    phase,
    slot,
    selectionFact: contactSecondarySelectionFact,
    selectionField: "civilizationId",
    resetMissionIds: contactSecondaryArcIds,
    resetStartMissionId: "CONTACT-10",
    resetPrerequisites: Object.freeze(["CONTACT-09"])
  });
  const contactSecondaryNpcEntries = (id, options = {}) => contactNpcEntries(id, {
    ...options,
    selectionFact: contactSecondarySelectionFact
  });

  const CONTACT10 = Object.freeze({
    id: "CONTACT-10", title: "L’autre peuple, à bonne distance",
    description: "Approcher l’autre civilisation avec la même prudence, sans supposer que ses codes sont identiques.",
    pattern: "OBSERVE_TARGET", trigger: Object.freeze({ type: "manual", count: 1 }), prerequisites: Object.freeze(["CONTACT-09"]), priority: 231, passivePriorityAxis: "relations",
    targetMapFact: contactSecondarySelectionFact, targetMapField: "mapId",
    slots: Object.freeze({ study: Object.freeze({ title: "Trouver une distance acceptable", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) }) }),
    runtimeValidation: contactSecondaryValidation("approach", "study"),
    npcEncounters: contactSecondaryNpcEntries("contact10", { cause: "contact-initiative", behaviors: ["vigilance","curiosity","calm"] })
  });

  const CONTACT11 = Object.freeze({
    id: "CONTACT-11", title: "Attendre leur initiative",
    description: "Laisser ce peuple choisir comment réduire la distance avant de répondre.",
    pattern: "OBSERVE_TARGET", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-10", count: 1 }), prerequisites: Object.freeze(["CONTACT-10"]), priority: 230, passivePriorityAxis: "relations",
    targetMapFact: contactSecondarySelectionFact, targetMapField: "mapId",
    slots: Object.freeze({ study: Object.freeze({ title: "Laisser venir le premier signe", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) }) }),
    runtimeValidation: contactSecondaryValidation("initiative", "study"),
    npcEncounters: contactSecondaryNpcEntries("contact11", { cause: "contact-initiative", spatialDecision: true, spatialChoices: ["hold","approach","retreat"] })
  });

  const CONTACT12 = Object.freeze({
    id: "CONTACT-12", title: "Des signes différents, une intention lisible",
    description: "Comprendre un indice contextuel propre à l’autre civilisation sans supposer une langue commune.",
    pattern: "OBSERVE_TARGET", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-11", count: 1 }), prerequisites: Object.freeze(["CONTACT-11"]), priority: 229, passivePriorityAxis: "relations",
    targetMapFact: contactSecondarySelectionFact, targetMapField: "mapId",
    slots: Object.freeze({ study: Object.freeze({ title: "Comprendre un indice contextuel", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) }) }),
    runtimeValidation: contactSecondaryValidation("dialogue", "study"),
    npcEncounters: contactSecondaryNpcEntries("contact12", { speech: "⟁ ⋔ … ici … ⧖", speechTriggerDistance: 8, emitDialogue: true, cause: "contact-dialogue", behaviors: ["calm","observation"] })
  });

  const CONTACT13 = Object.freeze({
    id: "CONTACT-13", title: "Répondre sans copier les premiers codes",
    description: "Répondre à l’autre civilisation avec un geste simple puis attendre sa réaction réelle, sans supposer que les premiers codes s’appliquent à elle.",
    pattern: "OBSERVE_TARGET", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-12", count: 1 }), prerequisites: Object.freeze(["CONTACT-12"]), priority: 228, passivePriorityAxis: "relations",
    targetMapFact: contactSecondarySelectionFact, targetMapField: "mapId",
    slots: Object.freeze({ study: Object.freeze({ title: "Répondre à leur signe", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) }) }),
    runtimeValidation: contactSecondaryValidation("response", "study"),
    npcEncounters: contactSecondaryNpcEntries("contact13", { cause: "contact-initiative", behaviors: ["curiosity","calm"], autoContact: true, contactMode: "symbols-only", contactSlot: "study", postContactReaction: "contact-response", postContactBehaviors: ["curiosity","calm"] })
  });

  const CONTACT14 = Object.freeze({
    id: "CONTACT-14", title: "Revenir sans être rejeté",
    description: "Revenir lors d’une rencontre distincte avec l’autre civilisation et vérifier que la relation reste stable.",
    pattern: "OBSERVE_TARGET", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-13", count: 1 }), prerequisites: Object.freeze(["CONTACT-13"]), priority: 227, passivePriorityAxis: "relations",
    targetMapFact: contactSecondarySelectionFact, targetMapField: "mapId",
    slots: Object.freeze({ study: Object.freeze({ title: "Être reconnu lors d’une nouvelle rencontre", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) }) }),
    runtimeValidation: contactSecondaryValidation("return", "study"),
    npcEncounters: contactSecondaryNpcEntries("contact14", { cause: "contact-return", behaviors: ["curiosity","calm","observation"] })
  });

  const CONTACT15 = Object.freeze({
    id: "CONTACT-15", title: "Reconnu par l’autre peuple",
    description: "Revenir après les premiers échanges et obtenir une reconnaissance amicale persistante de la seconde civilisation.",
    pattern: "OBSERVE_TARGET", trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-14", count: 1 }), prerequisites: Object.freeze(["CONTACT-14"]), priority: 226, passivePriorityAxis: "relations",
    targetMapFact: contactSecondarySelectionFact, targetMapField: "mapId",
    slots: Object.freeze({ study: Object.freeze({ title: "Être reconnu comme ami", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) }) }),
    runtimeValidation: contactSecondaryValidation("friendly", "study"),
    npcEncounters: contactSecondaryNpcEntries("contact15", { cause: "contact-initiative", behaviors: ["calm","curiosity"], autoContact: true, contactMode: "symbols-only", contactSlot: "study", postContactReaction: "contact-friendly", postContactBehaviors: ["calm","curiosity"] })
  });


  const diplomacyDialogueEncounters = (id, options = {}) => Object.freeze([
    Object.freeze({
      id: `${id}-rocky-dialogue`,
      cuoType: "npc_rocky",
      requiresSlotComplete: options.rockyRequires || null,
      speech: options.rockySpeech || "⟁ … territoire … eau … prudence …",
      speechTriggerDistance: 8,
      emitDialogue: true
    }),
    Object.freeze({
      id: `${id}-translucent-dialogue`,
      cuoType: "npc_translucent",
      requiresSlotComplete: options.translucentRequires || null,
      speech: options.translucentSpeech || "⋔ … eau … survie … passage …",
      speechTriggerDistance: 8,
      emitDialogue: true
    })
  ]);

  const DIP01 = Object.freeze({
    id: "DIP-01",
    title: "L’eau qui divise",
    description: "Écouter séparément les deux civilisations afin d’identifier le besoin d’eau des Translucides et les inquiétudes territoriales des Rocky avant toute médiation.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CONTACT-15", count: 1 }),
    prerequisites: Object.freeze(["CONTACT-15"]),
    relationPrerequisites: Object.freeze([
      Object.freeze({ civilizationId: "rocky", ranks: Object.freeze(["friendly", "honored"]) }),
      Object.freeze({ civilizationId: "translucent", ranks: Object.freeze(["friendly", "honored"]) })
    ]),
    priority: 225,
    passivePriorityAxis: "relations",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 78,
    sequence: Object.freeze([
      Object.freeze({ slot: "rockyContact", title: "Engager volontairement un échange avec un Rocky", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "rockyDialogue", title: "Écouter les inquiétudes Rocky sur le territoire", action: "observe", target: 1, requires: Object.freeze(["rockyContact"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "translucentContact", title: "Engager volontairement un échange avec un Translucide", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "translucentDialogue", title: "Écouter le besoin d’eau des Translucides", action: "observe", target: 1, requires: Object.freeze(["translucentContact"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) })
    ]),
    worldEventRequirements: Object.freeze([
      Object.freeze({ slot: "rockyContact", target: 1, distinctBy: "instanceId", criteria: Object.freeze({ type: "NPC_CONTACTED", civilizationId: "rocky", interactionSource: "manual" }) }),
      Object.freeze({ slot: "rockyDialogue", target: 1, distinctBy: "instanceId", civilizationId: "rocky", relationScoreOnSatisfied: 1, sinceSlotComplete: "rockyContact", criteria: Object.freeze({ type: "NPC_DIALOGUE", civilizationId: "rocky" }) }),
      Object.freeze({ slot: "translucentContact", target: 1, distinctBy: "instanceId", criteria: Object.freeze({ type: "NPC_CONTACTED", civilizationId: "translucent", interactionSource: "manual" }) }),
      Object.freeze({ slot: "translucentDialogue", target: 1, distinctBy: "instanceId", civilizationId: "translucent", relationScoreOnSatisfied: 1, sinceSlotComplete: "translucentContact", criteria: Object.freeze({ type: "NPC_DIALOGUE", civilizationId: "translucent" }) })
    ]),
    npcEncounters: diplomacyDialogueEncounters("dip01", {
      rockyRequires: "rockyContact",
      translucentRequires: "translucentContact",
      rockySpeech: "⟁ … eau … frontière … déplacement … protéger les nôtres …",
      translucentSpeech: "⋔ … sécheresse … eau … survie … accès nécessaire …"
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Les deux peuples me font confiance, mais leur désaccord n’est pas abstrait : l’un manque d’eau, l’autre craint de perdre son territoire. Je dois comprendre les deux avant de proposer quoi que ce soit."]),
      completed: Object.freeze(["Le problème est clair : besoin vital d’un côté, sécurité territoriale de l’autre. Je peux maintenant tenter une médiation sans réduire l’un des deux récits."])
    })
  });

  const GAME_CONTACT_FIRST = Object.freeze({
    id: "GAME-contact_first",
    title: "Comprendre avant de convaincre",
    description: "Échanger réellement avec au moins un Rocky et un Translucide distincts afin de comparer leurs récits du conflit.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "DIP-01", count: 1 }),
    prerequisites: Object.freeze(["DIP-01"]),
    priority: 224,
    passivePriorityAxis: "relations",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 55,
    sequence: Object.freeze([
      Object.freeze({ slot: "rockyContact", title: "Reprendre volontairement contact avec un Rocky", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "rockyDialogue", title: "Comparer le récit Rocky", action: "observe", target: 1, requires: Object.freeze(["rockyContact"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "translucentContact", title: "Reprendre volontairement contact avec un Translucide", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "translucentDialogue", title: "Comparer le récit Translucide", action: "observe", target: 1, requires: Object.freeze(["translucentContact"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) })
    ]),
    worldEventRequirements: Object.freeze([
      Object.freeze({ slot: "rockyContact", target: 1, distinctBy: "instanceId", criteria: Object.freeze({ type: "NPC_CONTACTED", civilizationId: "rocky", interactionSource: "manual" }) }),
      Object.freeze({ slot: "rockyDialogue", target: 1, distinctBy: "instanceId", civilizationId: "rocky", relationScoreOnSatisfied: 1, sinceSlotComplete: "rockyContact", criteria: Object.freeze({ type: "NPC_DIALOGUE", civilizationId: "rocky" }) }),
      Object.freeze({ slot: "translucentContact", target: 1, distinctBy: "instanceId", criteria: Object.freeze({ type: "NPC_CONTACTED", civilizationId: "translucent", interactionSource: "manual" }) }),
      Object.freeze({ slot: "translucentDialogue", target: 1, distinctBy: "instanceId", civilizationId: "translucent", relationScoreOnSatisfied: 1, sinceSlotComplete: "translucentContact", criteria: Object.freeze({ type: "NPC_DIALOGUE", civilizationId: "translucent" }) })
    ]),
    npcEncounters: diplomacyDialogueEncounters("game-contact-first", {
      rockyRequires: "rockyContact",
      translucentRequires: "translucentContact",
      rockySpeech: "⟁ … nous gardons l’accès … peur du déplacement …",
      translucentSpeech: "⋔ … l’eau recule … nous cherchons un passage …"
    }),
    narrative: Object.freeze({ completed: Object.freeze(["Les deux récits ne s’annulent pas. Ils décrivent la même crise depuis deux positions légitimes."]) })
  });

  const GAME_CONTACT_CAUTIOUS = Object.freeze({
    id: "GAME-contact_cautious",
    title: "Installer la confiance",
    description: "Multiplier les échanges volontaires avec des membres distincts des deux peuples, puis vérifier leurs préoccupations avant de formuler une proposition de médiation crédible.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "GAME-contact_first", count: 1 }),
    prerequisites: Object.freeze(["GAME-contact_first"]),
    priority: 223,
    passivePriorityAxis: "relations",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 68,
    sequence: Object.freeze([
      Object.freeze({ slot: "rockyContacts", title: "Échanger volontairement avec trois Rocky distincts", action: "observe", target: 3, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "rockyDialogue", title: "Faire préciser les préoccupations Rocky", action: "observe", target: 1, requires: Object.freeze(["rockyContacts"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "translucentContacts", title: "Échanger volontairement avec trois Translucides distincts", action: "observe", target: 3, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "translucentDialogue", title: "Faire préciser les besoins Translucides", action: "observe", target: 1, requires: Object.freeze(["translucentContacts"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) })
    ]),
    worldEventRequirements: Object.freeze([
      Object.freeze({ slot: "rockyContacts", target: 3, distinctBy: "instanceId", criteria: Object.freeze({ type: "NPC_CONTACTED", civilizationId: "rocky", interactionSource: "manual" }) }),
      Object.freeze({ slot: "rockyDialogue", target: 1, distinctBy: "instanceId", civilizationId: "rocky", relationScoreOnSatisfied: 1, sinceSlotComplete: "rockyContacts", criteria: Object.freeze({ type: "NPC_DIALOGUE", civilizationId: "rocky" }) }),
      Object.freeze({ slot: "translucentContacts", target: 3, distinctBy: "instanceId", criteria: Object.freeze({ type: "NPC_CONTACTED", civilizationId: "translucent", interactionSource: "manual" }) }),
      Object.freeze({ slot: "translucentDialogue", target: 1, distinctBy: "instanceId", civilizationId: "translucent", relationScoreOnSatisfied: 1, sinceSlotComplete: "translucentContacts", criteria: Object.freeze({ type: "NPC_DIALOGUE", civilizationId: "translucent" }) })
    ]),
    npcEncounters: diplomacyDialogueEncounters("game-contact-cautious", {
      rockyRequires: "rockyContacts",
      translucentRequires: "translucentContacts",
      rockySpeech: "⟁ … frontières sûres … pas d’expulsion … coopération possible …",
      translucentSpeech: "⋔ … accès durable à l’eau … pas de conquête … coopération …"
    }),
    narrative: Object.freeze({ completed: Object.freeze(["Les inquiétudes se répètent avec des nuances, mais une proposition commune devient crédible : préserver le territoire tout en garantissant l’accès à l’eau."]) })
  });

  const GAME_CONTACT_AMBASSADOR = Object.freeze({
    id: "GAME-contact_ambassador",
    title: "Porter la paix",
    description: "Obtenir une réaction positive de cinq Rocky et cinq Translucides distincts afin que la coopération soit soutenue dans les deux camps.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "GAME-contact_cautious", count: 1 }),
    prerequisites: Object.freeze(["GAME-contact_cautious"]),
    priority: 222,
    passivePriorityAxis: "relations",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 86,
    sequence: Object.freeze([
      Object.freeze({ slot: "rocky", title: "Obtenir le soutien de cinq Rocky distincts", action: "observe", target: 5, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "translucent", title: "Obtenir le soutien de cinq Translucides distincts", action: "observe", target: 5, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) })
    ]),
    worldEventRequirements: Object.freeze([
      Object.freeze({
        slot: "rocky", target: 5, distinctBy: "instanceId", civilizationId: "rocky", relationScoreOnSatisfied: 1,
        criteria: Object.freeze({ type: "NPC_REACTION", civilizationId: "rocky", reactionAny: Object.freeze(["cautious_approach", "curiosity", "calm", "observation", "interaction"]) })
      }),
      Object.freeze({
        slot: "translucent", target: 5, distinctBy: "instanceId", civilizationId: "translucent", relationScoreOnSatisfied: 1,
        criteria: Object.freeze({ type: "NPC_REACTION", civilizationId: "translucent", reactionAny: Object.freeze(["cautious_approach", "curiosity", "calm", "observation", "interaction"]) })
      })
    ]),
    narrative: Object.freeze({ completed: Object.freeze(["Les deux camps ont assez de voix favorables pour tenter une coopération réelle. La médiation n’est plus seulement mon idée : elle est acceptée des deux côtés."]) })
  });

  const DIP02 = Object.freeze({
    id: "DIP-02",
    title: "Faire circuler l’eau, faire circuler la confiance",
    description: "Faire naître une coopération concrète entre Rocky et Translucides : visites croisées, étude des formes d’eau et des îlots suspendus, puis installation d’un dispositif commun dans les deux villes.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "GAME-contact_ambassador", count: 1 }),
    prerequisites: Object.freeze(["GAME-contact_ambassador"]),
    priority: 221,
    passivePriorityAxis: "relations",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 92,
    sequence: Object.freeze([
      Object.freeze({
        slot: "visitRockyCity",
        title: "Observer un visiteur Translucide dans la ville Rocky",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "npc_translucent",
          microSceneId: "MSC-NPC-TRANSLUCENT-001",
          distinctBy: "instanceId",
          requiredMapFact: "dip02:rocky-city",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "visitTranslucentCity",
        title: "Observer un visiteur Rocky dans Tiny City",
        action: "observe",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoType: "npc_rocky",
          microSceneId: "MSC-NPC-ROCKY-001",
          distinctBy: "instanceId",
          requiredMapFact: "dip02:translucent-city",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "islets",
        title: "Observer trois îlots mobiles distincts",
        action: "observe",
        target: 3,
        requires: Object.freeze(["visitRockyCity", "visitTranslucentCity"]),
        params: Object.freeze({ cuoType: "mobile_islet", distinctBy: "instanceId" })
      }),
      Object.freeze({
        slot: "pools",
        title: "Observer cinq bassins distincts",
        action: "observe",
        target: 5,
        requires: Object.freeze(["islets"]),
        params: Object.freeze({ cuoType: "pool", distinctBy: "instanceId" })
      }),
      Object.freeze({
        slot: "watercourses",
        title: "Approcher deux cours d’eau distincts à moins de 2,5 m",
        action: "observe",
        target: 2,
        requires: Object.freeze(["pools"]),
        params: Object.freeze({
          kind: "watercourse",
          cuoType: "watercourse",
          distinctBy: "instanceId",
          proximityOnly: true,
          proximityRadius: 2.5
        })
      }),
      Object.freeze({
        slot: "hypothesis",
        title: "Relier magnétisme, îlots et circulation de l’eau",
        action: "research",
        target: 1,
        requires: Object.freeze(["watercourses"]),
        params: Object.freeze({})
      }),
      Object.freeze({
        slot: "rockyInstallation",
        title: "Constater l’installation commune dans la ville Rocky",
        action: "observe",
        target: 1,
        requires: Object.freeze(["hypothesis"]),
        params: Object.freeze({
          cuoType: "mobile_islet",
          microSceneId: "MSC-CUSTOM-ILES-SUSPENDUES2",
          requiredMapFact: "dip02:rocky-city",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "translucentInstallation",
        title: "Constater l’installation commune dans Tiny City",
        action: "observe",
        target: 1,
        requires: Object.freeze(["hypothesis"]),
        params: Object.freeze({
          cuoType: "mobile_islet",
          microSceneId: "MSC-CUSTOM-ILES-SUSPENDUES2",
          requiredMapFact: "dip02:translucent-city",
          requiredMapField: "mapId"
        })
      })
    ]),
    worldEventRequirements: Object.freeze([
      Object.freeze({
        slot: "islets",
        target: 3,
        distinctBy: "instanceId",
        sinceSlotsComplete: Object.freeze(["visitRockyCity", "visitTranslucentCity"]),
        criteria: Object.freeze({
          type: "PHENOMENON_OBSERVED",
          cuoType: "mobile_islet",
          interactionSource: "mission"
        })
      }),
      Object.freeze({
        slot: "pools",
        target: 5,
        distinctBy: "instanceId",
        sinceSlotComplete: "islets",
        criteria: Object.freeze({
          type: "PHENOMENON_OBSERVED",
          cuoType: "pool",
          interactionSource: "mission"
        })
      }),
      Object.freeze({
        slot: "watercourses",
        target: 2,
        distinctBy: "instanceId",
        sinceSlotComplete: "pools",
        criteria: Object.freeze({
          type: "OBJECT_SEEN",
          cuoType: "watercourse",
          interactionSource: "mission-proximity"
        })
      })
    ]),
    persistentWorldScenes: Object.freeze([
      Object.freeze({
        mapId: "custom-map-32-rock-village",
        mapFact: "dip02:rocky-city",
        instanceId: "DIP-02:visitor:translucent:rocky-city",
        microSceneId: "MSC-NPC-TRANSLUCENT-001",
        contextRole: "dip02CrossCivilizationVisitor",
        persistent: true, spawnOnce: true
      }),
      Object.freeze({
        mapId: "custom-map-31-tinycity",
        mapFact: "dip02:translucent-city",
        instanceId: "DIP-02:visitor:rocky:translucent-city",
        microSceneId: "MSC-NPC-ROCKY-001",
        contextRole: "dip02CrossCivilizationVisitor",
        persistent: true, spawnOnce: true
      }),
      Object.freeze({
        mapId: "custom-map-32-rock-village",
        instanceId: "DIP-02:growth:rocky-city",
        microSceneId: "MSC-CUSTOM-HOUSE",
        contextRole: "dip02CityCooperationGrowth",
        requiresSlotsComplete: Object.freeze(["visitRockyCity", "visitTranslucentCity"]),
        persistent: true, spawnOnce: true
      }),
      Object.freeze({
        mapId: "custom-map-31-tinycity",
        instanceId: "DIP-02:growth:translucent-city",
        microSceneId: "MSC-CUSTOM-HOUSE",
        contextRole: "dip02CityCooperationGrowth",
        requiresSlotsComplete: Object.freeze(["visitRockyCity", "visitTranslucentCity"]),
        persistent: true, spawnOnce: true
      }),
      Object.freeze({
        mapId: "custom-map-32-rock-village",
        instanceId: "DIP-02:water-installation:rocky-city",
        microSceneId: "MSC-CUSTOM-ILES-SUSPENDUES2",
        contextRole: "dip02SharedWaterInstallation",
        requiresSlotComplete: "hypothesis",
        persistent: true, spawnOnce: true
      }),
      Object.freeze({
        mapId: "custom-map-31-tinycity",
        instanceId: "DIP-02:water-installation:translucent-city",
        microSceneId: "MSC-CUSTOM-ILES-SUSPENDUES2",
        contextRole: "dip02SharedWaterInstallation",
        requiresSlotComplete: "hypothesis",
        persistent: true, spawnOnce: true
      })
    ]),
    completionRelationEffects: Object.freeze([
      Object.freeze({ civilizationId: "rocky", delta: 5 }),
      Object.freeze({ civilizationId: "translucent", delta: 5 })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La médiation est acceptée. Il faut maintenant la rendre visible : que les deux peuples circulent, que leurs villes changent, et que l’eau devienne un problème étudié ensemble plutôt qu’un motif de rupture."
      ]),
      completed: Object.freeze([
        "Les deux villes portent désormais la même solution. Les îlots magnétiques ne sont plus seulement un phénomène à observer : ils servent de point commun entre les besoins des deux peuples."
      ])
    })
  });


  const DIP03 = Object.freeze({
    id: "DIP-03",
    title: "Le grand conseil planétaire — Temple des savoirs",
    description: "Faire de l’alliance Rocky–Translucide une institution durable : formaliser un lieu commun de connaissance, apporter réellement des ressources à chaque peuple puis ouvrir le Temple des savoirs comme archive partagée.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "DIP-02", count: 1 }),
    prerequisites: Object.freeze(["DIP-02"]),
    relationPrerequisites: Object.freeze([
      Object.freeze({ civilizationId: "rocky", ranks: Object.freeze(["friendly", "honored"]) }),
      Object.freeze({ civilizationId: "translucent", ranks: Object.freeze(["friendly", "honored"]) })
    ]),
    priority: 220,
    passivePriorityAxis: "relations",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 100,
    sequence: Object.freeze([
      Object.freeze({ slot: "rockyContact", title: "Proposer l’institution aux Rocky", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "rockyDialogue", title: "Faire préciser ce que les Rocky veulent transmettre", action: "observe", target: 1, requires: Object.freeze(["rockyContact"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "translucentContact", title: "Proposer l’institution aux Translucides", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "translucentDialogue", title: "Faire préciser ce que les Translucides veulent transmettre", action: "observe", target: 1, requires: Object.freeze(["translucentContact"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "rockyContribution", title: "Apporter un lot de construction ou de conservation aux Rocky", action: "research", target: 1, requires: Object.freeze(["rockyDialogue", "translucentDialogue"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "translucentContribution", title: "Apporter un lot de construction ou de conservation aux Translucides", action: "research", target: 1, requires: Object.freeze(["rockyDialogue", "translucentDialogue"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({
        slot: "templeTravel",
        title: "Rejoindre la Bibliothèque / Archive commune",
        action: "travel",
        target: 1,
        requires: Object.freeze(["rockyContribution", "translucentContribution"]),
        params: Object.freeze({ eventDriven: true, toMapId: "custom-map-33-temple-magnet" })
      }),
      Object.freeze({
        slot: "delegateRocky1",
        title: "Observer le premier délégué Rocky au Temple",
        action: "observe",
        target: 1,
        requires: Object.freeze(["templeTravel"]),
        params: Object.freeze({
          cuoType: "npc_rocky",
          persistentMicroSceneId: "DIP-03:delegate:rocky:1",
          requiredMapFact: "dip03:temple-map",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "delegateRocky2",
        title: "Observer le second délégué Rocky au Temple",
        action: "observe",
        target: 1,
        requires: Object.freeze(["templeTravel"]),
        params: Object.freeze({
          cuoType: "npc_rocky",
          persistentMicroSceneId: "DIP-03:delegate:rocky:2",
          requiredMapFact: "dip03:temple-map",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "delegateTranslucent1",
        title: "Observer le premier délégué Translucide au Temple",
        action: "observe",
        target: 1,
        requires: Object.freeze(["templeTravel"]),
        params: Object.freeze({
          cuoType: "npc_translucent",
          persistentMicroSceneId: "DIP-03:delegate:translucent:1",
          requiredMapFact: "dip03:temple-map",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "delegateTranslucent2",
        title: "Observer le second délégué Translucide au Temple",
        action: "observe",
        target: 1,
        requires: Object.freeze(["templeTravel"]),
        params: Object.freeze({
          cuoType: "npc_translucent",
          persistentMicroSceneId: "DIP-03:delegate:translucent:2",
          requiredMapFact: "dip03:temple-map",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "templeKnowledge",
        title: "Étudier une archive technologique du Temple",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["delegateRocky1", "delegateRocky2", "delegateTranslucent1", "delegateTranslucent2"]),
        params: Object.freeze({
          cuoType: "tech_relic",
          microSceneId: "MSC-CUSTOM-HUGE-TEMPLE",
          requiredMapFact: "dip03:temple-map",
          requiredMapField: "mapId"
        })
      })
    ]),
    worldEventRequirements: Object.freeze([
      Object.freeze({ slot: "rockyContact", target: 1, distinctBy: "instanceId", criteria: Object.freeze({ type: "NPC_CONTACTED", civilizationId: "rocky", interactionSource: "manual" }) }),
      Object.freeze({ slot: "rockyDialogue", target: 1, distinctBy: "instanceId", sinceSlotComplete: "rockyContact", criteria: Object.freeze({ type: "NPC_DIALOGUE", civilizationId: "rocky" }) }),
      Object.freeze({ slot: "translucentContact", target: 1, distinctBy: "instanceId", criteria: Object.freeze({ type: "NPC_CONTACTED", civilizationId: "translucent", interactionSource: "manual" }) }),
      Object.freeze({ slot: "translucentDialogue", target: 1, distinctBy: "instanceId", sinceSlotComplete: "translucentContact", criteria: Object.freeze({ type: "NPC_DIALOGUE", civilizationId: "translucent" }) })
    ]),
    npcEncounters: diplomacyDialogueEncounters("dip03", {
      rockyRequires: "rockyContact",
      translucentRequires: "translucentContact",
      rockySpeech: "⟁ … mémoire … pierre … transmettre … lieu commun …",
      translucentSpeech: "⋔ … archives … lumière … conserver … apprendre ensemble …"
    }),
    civilizationTradeRequirements: Object.freeze([
      Object.freeze({
        slot: "rockyContribution",
        civilizationId: "rocky",
        minimumOfferQuantity: 5,
        offerKeysAny: Object.freeze(["wood", "fiber", "magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium", "crystal", "parts"])
      }),
      Object.freeze({
        slot: "translucentContribution",
        civilizationId: "translucent",
        minimumOfferQuantity: 5,
        offerKeysAny: Object.freeze(["wood", "fiber", "magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium", "crystal", "parts"])
      })
    ]),
    worldTopologyLinks: Object.freeze([Object.freeze({
      id: "dip03-temple-link",
      mapId: "custom-map-33-temple-magnet",
      mapFact: "dip03:temple-map",
      anchorMapIds: Object.freeze(["custom-map-32-rock-village", "custom-map-31-tinycity"]),
      directions: Object.freeze(["north", "east", "south", "west"]),
      requiresSlotsComplete: Object.freeze(["rockyContribution", "translucentContribution"])
    })]),
    persistentWorldScenes: Object.freeze([
      Object.freeze({ mapId: "custom-map-33-temple-magnet", instanceId: "DIP-03:delegate:rocky:1", microSceneId: "MSC-NPC-ROCKY-001", contextRole: "dip03TempleDelegate", requiresSlotsComplete: Object.freeze(["rockyContribution", "translucentContribution"]), persistent: true, spawnOnce: true }),
      Object.freeze({ mapId: "custom-map-33-temple-magnet", instanceId: "DIP-03:delegate:rocky:2", microSceneId: "MSC-NPC-ROCKY-001", contextRole: "dip03TempleDelegate", requiresSlotsComplete: Object.freeze(["rockyContribution", "translucentContribution"]), persistent: true, spawnOnce: true }),
      Object.freeze({ mapId: "custom-map-33-temple-magnet", instanceId: "DIP-03:delegate:translucent:1", microSceneId: "MSC-NPC-TRANSLUCENT-001", contextRole: "dip03TempleDelegate", requiresSlotsComplete: Object.freeze(["rockyContribution", "translucentContribution"]), persistent: true, spawnOnce: true }),
      Object.freeze({ mapId: "custom-map-33-temple-magnet", instanceId: "DIP-03:delegate:translucent:2", microSceneId: "MSC-NPC-TRANSLUCENT-001", contextRole: "dip03TempleDelegate", requiresSlotsComplete: Object.freeze(["rockyContribution", "translucentContribution"]), persistent: true, spawnOnce: true })
    ]),
    slotFactEffects: Object.freeze([Object.freeze({
      slot: "templeKnowledge",
      fact: "shared_civilization_knowledge",
      value: Object.freeze({
        knowledgeId: "shared_civilization_knowledge",
        mapId: "custom-map-33-temple-magnet",
        microSceneId: "MSC-CUSTOM-HUGE-TEMPLE",
        sourceMissionId: "DIP-03"
      })
    })]),
    completionRelationEffects: Object.freeze([
      Object.freeze({ civilizationId: "rocky", delta: 5 }),
      Object.freeze({ civilizationId: "translucent", delta: 5 })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Ils ont appris à résoudre un problème ensemble. Si cette alliance doit survivre à la prochaine crise, leurs connaissances doivent pouvoir se rencontrer même quand je ne suis pas là."]),
      progress: Object.freeze([
        Object.freeze({ slot: "rockyContribution", atCount: 1, text: "Les Rocky ont engagé une contribution réelle. Ce lieu commun commence à exister autrement que dans nos paroles." }),
        Object.freeze({ slot: "translucentContribution", atCount: 1, text: "Les Translucides apportent à leur tour leur part. Le projet appartient maintenant aux deux peuples." }),
        Object.freeze({ slot: "templeKnowledge", atCount: 1, text: "Les deux délégations ont bien été observées et l’archive commune répond à leur présence. Le Temple fonctionne comme une institution partagée, pas comme un décor vide." })
      ]),
      completed: Object.freeze(["Les archives communes sont ouvertes. Ce savoir appartient désormais à l’alliance Rocky–Translucide et peut être consulté plus tard comme une véritable source de connaissance."])
    })
  });

  BF.BibleConstructionTemplates = Object.freeze({
    camp: Object.freeze({
      title: "Établir un camp",
      description: "Réunir dix bois puis revenir sur la map choisie pour installer un camp.",
      pattern: "SEQUENCE_ACTIONS",
      priority: 58,
      passivePriorityAxis: "survival",
      sequence: Object.freeze([
        Object.freeze({
          slot: "collectWood",
          title: "Réunir 10 bois",
          action: "collect",
          target: 10,
          params: Object.freeze({ kind: "wood" })
        })
      ]),
      activationInventoryCredits: Object.freeze([
        Object.freeze({ slot: "collectWood", inventoryKey: "wood", maximum: 10 })
      ]),
      effects: Object.freeze([
        Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 10 }),
        Object.freeze({
          type: "site.establish",
          kind: "camp",
          microSceneId: "MSC-CUSTOM-CAMP",
          stage: 1,
          placement: Object.freeze({ mode: "near-bluefox" })
        })
      ])
    }),
    refuge: Object.freeze({
      title: "Construire un refuge",
      description: "Réunir cent bois et cent fibres puis revenir sur la map choisie pour construire un refuge.",
      pattern: "SEQUENCE_ACTIONS",
      priority: 56,
      passivePriorityAxis: "survival",
      sequence: Object.freeze([
        Object.freeze({
          slot: "fibers",
          title: "Réunir 100 plantes fibreuses",
          action: "collect",
          target: 100,
          params: Object.freeze({ kind: "fiber" })
        }),
        Object.freeze({
          slot: "wood",
          title: "Réunir 100 bois",
          action: "collect",
          target: 100,
          requires: Object.freeze([]),
          params: Object.freeze({ kind: "wood" })
        })
      ]),
      activationInventoryCredits: Object.freeze([
        Object.freeze({ slot: "fibers", inventoryKey: "fiber", maximum: 100 }),
        Object.freeze({ slot: "wood", inventoryKey: "wood", maximum: 100 })
      ]),
      effects: Object.freeze([
        Object.freeze({ type: "inventory.consume", inventoryKey: "fiber", quantity: 100 }),
        Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 100 }),
        Object.freeze({
          type: "site.establish",
          kind: "refuge",
          microSceneId: "MSC-CUSTOM-CAMP-BASE",
          stage: 2,
          placement: Object.freeze({ mode: "near-camp" })
        })
      ])
    }),
    workbench: Object.freeze({
      title: "Installer un établi",
      description: "Réunir les matériaux du Blueprint puis choisir l'emplacement de l'établi sur Crystal.",
      pattern: "SEQUENCE_ACTIONS",
      priority: 58,
      passivePriorityAxis: "research",
      sequence: Object.freeze([
        Object.freeze({ slot: "materials", title: "Réunir les matériaux de l'établi", action: "research", target: 1, params: Object.freeze({}) })
      ]),
      effects: Object.freeze([
        Object.freeze({ type: "inventory.consume", inventoryKey: "magnetic_ore", quantity: 20 }),
        Object.freeze({ type: "inventory.consume", inventoryKey: "azure_ferrite", quantity: 20 }),
        Object.freeze({ type: "inventory.consume", inventoryKey: "resonant_basalt", quantity: 20 }),
        Object.freeze({ type: "inventory.consume", inventoryKey: "stellar_iridium", quantity: 20 }),
        Object.freeze({ type: "inventory.consume", inventoryKey: "fiber", quantity: 25 }),
        Object.freeze({ type: "inventory.consume", inventoryKey: "parts", quantity: 10 }),
        Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 20 }),
        Object.freeze({
          type: "site.establish",
          kind: "workbench",
          microSceneId: "MSC-CUSTOM-ETABLI-VIDE",
          stage: 4,
          placement: Object.freeze({ mode: "near-bluefox" })
        })
      ])
    })
  });


  const ANN04 = Object.freeze({
    id: "ANN-04",
    title: "Cycles sous surveillance",
    description: "Après le tutoriel, rejoindre un nouveau territoire vers l’Ouest et observer plusieurs manifestations climatiques avant d’en tirer une première lecture cohérente.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", direction: "west", count: 1, uniqueOnly: true }),
    prerequisites: Object.freeze(["T13"]),
    bindActivationMap: true,
    triggerOnly: true,
    priority: 214,
    passivePriorityAxis: "research",
    ponderation: 0.9,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 38,
    narrativeAxis: "NATURALISTE",
    reinforcesNarrativeAxis: Object.freeze({ axis: "NATURALISTE", weight: 1 }),
    mapGeneration: Object.freeze({
      requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-LOCAL-STORM-001", persistent: true, spawnOnce: true, contextRole: "annClimateStorm" })]),
      requiredObjects: Object.freeze([Object.freeze({ type: "fog_bank", count: 1, contextRole: "annClimateFog" })])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "storm", title: "S’approcher de la tempête et observer le phénomène", action: "observe", target: 1, params: Object.freeze({ cuoType: "electrostatic_storm", microSceneId: "MSC-LOCAL-STORM-001", requiredMapFact: "bibleActivation:ANN-04", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "fog", title: "Traverser ou approcher une nappe de brume", action: "observe", target: 1, requires: Object.freeze(["storm"]), params: Object.freeze({ eventDriven: true, catalogManaged: true, cuoType: "fog_bank", requiredMapFact: "ann04:fogTarget", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "climateReading", title: "Mettre en relation pression, hygrométrie, froid nocturne et rythme jour/nuit", action: "research", target: 1, requires: Object.freeze(["fog"]), params: Object.freeze({ requiredMapFact: "bibleActivation:ANN-04", requiredMapField: "mapId" }) })
    ]),
    proximityContexts: Object.freeze([Object.freeze({
      id: "ann04-fog-proximity",
      cuoType: "fog_bank",
      fact: "ann04:fog-proximity",
      slot: "fog",
      radius: 4.8,
      requiresSlotComplete: "storm",
      allowKnownMapTravel: true,
      targetMapFact: "ann04:fogTarget"
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cette pluie ne ressemble pas à celle de chez moi… et la pression bouge beaucoup trop vite. Je vais suivre ça de près."]),
      progress: Object.freeze([
        Object.freeze({ slot: "fog", atCount: 1, text: "La brume retombe déjà, et la température chute avec la nuit. Ici, le climat change de rythme en quelques heures." })
      ]),
      completed: Object.freeze(["Pression, humidité, froid nocturne, tempêtes… ce monde respire beaucoup plus vite que le mien. J’ai enfin un cycle cohérent."])
    })
  });

  const ANN06 = Object.freeze({
    id: "ANN-06",
    title: "Repaire improvisé",
    description: "À plus de dix maps de toute infrastructure existante, réunir dix bois et dix fibres puis installer manuellement un nouveau Camp logistique.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 1, uniqueOnly: true }),
    prerequisites: Object.freeze(["ANN-04"]),
    bindActivationMap: true,
    targetMapFact: "bibleActivation:ANN-06",
    targetMapField: "mapId",
    triggerOnly: true,
    activationSource: "player",
    siteDistanceGate: Object.freeze({ kinds: Object.freeze(["camp", "refuge", "base"]), minimumExclusive: 10 }),
    priority: 213,
    passivePriorityAxis: "survival",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 52,
    mapGeneration: Object.freeze({
      requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-NOCTURNAL-DEN-001", persistent: true, spawnOnce: true, contextRole: "ann06FaunaContext" })])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "wood", title: "Réunir 10 bois pour la structure", action: "collect", target: 10, params: Object.freeze({ kind: "wood", requiredMapFact: "bibleActivation:ANN-06", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "fiber", title: "Réunir 10 fibres pour la toile", action: "collect", target: 10, requires: Object.freeze([]), params: Object.freeze({ kind: "fiber", requiredMapFact: "bibleActivation:ANN-06", requiredMapField: "mapId" }) })
    ]),
    activationInventoryCredits: Object.freeze([
      Object.freeze({ slot: "wood", inventoryKey: "wood", maximum: 10 }),
      Object.freeze({ slot: "fiber", inventoryKey: "fiber", maximum: 10 })
    ]),
    completionGate: Object.freeze({ type: "proximity.shelter", shelterKinds: Object.freeze(["camp"]), radius: 9999, scope: "current-map" }),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 10 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "fiber", quantity: 10 }),
      Object.freeze({ type: "site.establish", kind: "camp", microSceneId: "MSC-CUSTOM-SMART-CAMP", stage: 1, placement: Object.freeze({ mode: "player" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["À cette distance, rentrer jusqu’au dernier camp pour chaque pause devient absurde. Il me faut un vrai point d’appui ici."]),
      progress: Object.freeze([Object.freeze({ slot: "fiber", atCount: 1, text: "Dix morceaux de bois pour la structure, un peu de fibre pour la toile… ça devrait suffire pour faire quelque chose de solide." })]),
      completed: Object.freeze(["Voilà. Pas vraiment chez moi, mais assez sûr pour dormir, stocker du matériel et repartir plus loin."])
    })
  });

  const ANN03 = Object.freeze({
    id: "ANN-03",
    title: "Épave ciblée",
    description: "Après le nouveau Camp, découvrir un territoire au Sud, inspecter l’épave et récupérer un composant technologique encore exploitable.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", direction: "south", count: 1, uniqueOnly: true }),
    prerequisites: Object.freeze(["ANN-06"]),
    bindActivationMap: true,
    triggerOnly: true,
    priority: 212,
    passivePriorityAxis: "exploration",
    ponderation: 0.95,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 58,
    mapGeneration: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-EPAVE-1DRONE", persistent: true, spawnOnce: true, contextRole: "annWreck" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "wreck", title: "Observer la structure principale de l’épave", action: "observe", target: 1, params: Object.freeze({ cuoTypes: Object.freeze(["abandoned_drone", "ancient_machine_wreck"]), microSceneId: "MSC-CUSTOM-EPAVE-1DRONE", requiredMapFact: "bibleActivation:ANN-03", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "components", title: "Inspecter deux éléments technologiques distincts", action: "analyze", target: 2, requires: Object.freeze(["wreck"]), params: Object.freeze({ cuoTypes: Object.freeze(["relay_block", "pulse_core", "memory_capsule", "logic_prism"]), microSceneId: "MSC-CUSTOM-EPAVE-1DRONE", distinctBy: "objectId", requiredMapFact: "bibleActivation:ANN-03", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "salvage", title: "Récupérer un composant exploitable de l’épave", action: "collect", target: 1, requires: Object.freeze(["components"]), params: Object.freeze({ cuoTypes: Object.freeze(["relay_block", "pulse_core", "memory_capsule", "logic_prism"]), microSceneId: "MSC-CUSTOM-EPAVE-1DRONE", requiredMapFact: "bibleActivation:ANN-03", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Il y a quelque chose dans cette épave qui grésille encore. Si une partie fonctionne toujours, je veux savoir laquelle."]),
      progress: Object.freeze([Object.freeze({ slot: "components", atCount: 1, text: "Ces composants ont survécu au choc… certains pourraient encore servir." })]),
      completed: Object.freeze(["J’ai récupéré ce qui était exploitable. Ce vieux morceau d’épave vient peut-être de me donner une technologie de moins à réinventer."])
    })
  });

  const ANN02 = Object.freeze({
    id: "ANN-02",
    title: "Botanique quantique",
    description: "Sur un nouveau territoire vers l’Ouest, étudier puis collecter vingt-cinq Thermosèves et réaliser une expérimentation consommant six Thermosèves et deux minerais connus.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", direction: "west", count: 1, uniqueOnly: true }),
    prerequisites: Object.freeze(["ANN-03"]),
    bindActivationMap: true,
    triggerOnly: true,
    priority: 211,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 62,
    mapGeneration: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-ECO-THERM-001", persistent: true, spawnOnce: true })]), requiredObjects: Object.freeze([Object.freeze({ type: "thermosap_moss", count: 25 })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "study", title: "Observer la réaction thermique de la Thermosève", action: "observe", target: 1, params: Object.freeze({ cuoType: "thermosap_moss", requiredMapFact: "bibleActivation:ANN-02", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "collect", title: "Collecter 25 Thermosèves", action: "collect", target: 25, requires: Object.freeze(["study"]), params: Object.freeze({ cuoType: "thermosap_moss", requiredMapFact: "bibleActivation:ANN-02", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "experiment", title: "Mener l’expérimentation avec 6 Thermosèves et 2 minerais connus", action: "research", target: 1, requires: Object.freeze(["collect"]), params: Object.freeze({}) })
    ]),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKey: "biocapital", quantity: 6 }),
      Object.freeze({ type: "inventory.consume", inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium"]), quantity: 2 })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cette sève réagit à la chaleur… presque comme si la plante régulait elle-même sa température."]),
      progress: Object.freeze([
        Object.freeze({ slot: "collect", atCount: 25, text: "Vingt-cinq échantillons, ça suffit. Maintenant je peux comparer sans vider toute la population locale." }),
        Object.freeze({ slot: "experiment", atCount: 1, text: "Six Thermosèves, deux minerais connus… je peux enfin voir si la réaction tient quand je change le support." })
      ]),
      completed: Object.freeze(["La Thermosève réagit bien avec des minéraux connus. Ce n’est pas juste une curiosité végétale : il y a un mécanisme derrière."])
    })
  });

  const ANN05 = Object.freeze({
    id: "ANN-05",
    title: "Curiosités géologiques",
    description: "Sur un nouveau territoire vers l’Est, analyser trois types de minéraux différents, collecter quatre exemplaires de chacun puis consommer les douze échantillons lors de l’expérimentation.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", direction: "east", count: 1, uniqueOnly: true }),
    prerequisites: Object.freeze(["ANN-02"]),
    bindActivationMap: true,
    triggerOnly: true,
    priority: 210,
    passivePriorityAxis: "research",
    ponderation: 0.95,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 60,
    mapGeneration: Object.freeze({
      requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-BASALT-RIFT", persistent: true, spawnOnce: true, contextRole: "annGeologyRift" })]),
      requiredObjects: Object.freeze([Object.freeze({ type: "resonant_basalt", count: 4 }), Object.freeze({ type: "magnetic_ore", count: 4 }), Object.freeze({ type: "crystal", count: 4 })])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "analyze", title: "Analyser trois types de minéraux différents", action: "analyze", target: 3, params: Object.freeze({ cuoTypes: Object.freeze(["resonant_basalt", "magnetic_ore", "crystal"]), distinctBy: "objectId", requiredMapFact: "bibleActivation:ANN-05", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "basalt", title: "Collecter 4 basaltes résonants", action: "collect", target: 4, requires: Object.freeze(["analyze"]), params: Object.freeze({ cuoType: "resonant_basalt", requiredMapFact: "bibleActivation:ANN-05", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "magnetic", title: "Collecter 4 minerais magnétiques", action: "collect", target: 4, requires: Object.freeze(["analyze"]), params: Object.freeze({ cuoType: "magnetic_ore", requiredMapFact: "bibleActivation:ANN-05", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "crystal", title: "Collecter 4 cristaux", action: "collect", target: 4, requires: Object.freeze(["analyze"]), params: Object.freeze({ cuoType: "crystal", requiredMapFact: "bibleActivation:ANN-05", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "experiment", title: "Comparer les 12 échantillons lors de l’expérimentation", action: "research", target: 1, requires: Object.freeze(["basalt", "magnetic", "crystal"]), params: Object.freeze({}) })
    ]),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKey: "resonant_basalt", quantity: 4 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "magnetic_ore", quantity: 4 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "crystal", quantity: 4 })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Trois roches différentes… et trois façons de résonner. Ce n’est probablement pas le vent qui joue avec moi."]),
      progress: Object.freeze([
        Object.freeze({ slot: "crystal", atCount: 4, text: "Quatre échantillons de chaque type. Assez pour les comparer sans transformer la faille en carrière." }),
        Object.freeze({ slot: "experiment", atCount: 1, text: "Les douze échantillons réagissent différemment. Ce n’est plus une impression : la composition change vraiment la réponse de la roche." })
      ]),
      completed: Object.freeze(["Les douze échantillons ont parlé : la composition change la résonance. Cette géologie a sa propre signature."])
    })
  });

  const ANN01 = Object.freeze({
    id: "ANN-01",
    title: "Écho de la balise",
    description: "Sur un nouveau territoire au Sud, progresser par trois jalons d’exploration avant d’atteindre le relais, observer trois de ses éléments puis récupérer un composant.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", direction: "south", count: 1, uniqueOnly: true }),
    prerequisites: Object.freeze(["ANN-05"]),
    bindActivationMap: true,
    triggerOnly: true,
    priority: 209,
    passivePriorityAxis: "exploration",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 68,
    mapGeneration: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-TECH-RELAY-001", persistent: true, spawnOnce: true, contextRole: "annRelay" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "signal10", title: "Explorer 10 % de la map pour accrocher le signal", action: "explore-zone", target: 10, params: Object.freeze({ metric: "surfacePercent", threshold: 10, scope: "map", requiredMapFact: "bibleActivation:ANN-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "signal25", title: "Explorer 25 % de la map pour préciser la direction", action: "explore-zone", target: 25, requires: Object.freeze(["signal10"]), params: Object.freeze({ metric: "surfacePercent", threshold: 25, scope: "map", requiredMapFact: "bibleActivation:ANN-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "signal60", title: "Explorer 60 % de la map pour localiser le relais", action: "explore-zone", target: 60, requires: Object.freeze(["signal25"]), params: Object.freeze({ metric: "surfacePercent", threshold: 60, scope: "map", requiredMapFact: "bibleActivation:ANN-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "relayStudy", title: "Observer trois éléments distincts du relais", action: "observe", target: 3, requires: Object.freeze(["signal60"]), params: Object.freeze({ cuoTypes: Object.freeze(["survey_beacon", "relay_block", "pulse_core", "memory_capsule"]), microSceneId: "MSC-TECH-RELAY-001", distinctBy: "objectId", requiredMapFact: "bibleActivation:ANN-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "component", title: "Récupérer un composant du relais", action: "collect", target: 1, requires: Object.freeze(["relayStudy"]), params: Object.freeze({ cuoTypes: Object.freeze(["relay_block", "pulse_core", "memory_capsule"]), microSceneId: "MSC-TECH-RELAY-001", requiredMapFact: "bibleActivation:ANN-01", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le signal est là, quelque part. Pas question de foncer droit dessus : je veux comprendre le terrain avant de m’en approcher."]),
      progress: Object.freeze([
        Object.freeze({ slot: "signal10", atCount: 10, text: "Faible, mais stable. Je tiens la bonne direction." }),
        Object.freeze({ slot: "signal25", atCount: 25, text: "Le signal se précise. Quelque chose le relaie vraiment sur cette map." }),
        Object.freeze({ slot: "signal60", atCount: 60, text: "Là, je peux le localiser. Le relais doit être tout près." })
      ]),
      completed: Object.freeze(["Trois éléments concordent, et ce composant appartient bien au relais. Ce signal n’était pas un simple écho."])
    })
  });

  const ANN07 = Object.freeze({
    id: "ANN-07",
    title: "Premier catalogue du vivant",
    description: "Exploiter l’historique réel des observations afin de confirmer au moins une espèce nocturne et ouvrir une branche persistante de catalogue Faune/Nature dans le journal.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ANN-01", count: 1 }),
    prerequisites: Object.freeze(["ANN-01"]),
    priority: 208,
    passivePriorityAxis: "research",
    ponderation: 0.9,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 48,
    runtimeCounters: Object.freeze([Object.freeze({ slot: "nocturnal", source: "observations.historical", cuoType: "nocturnal_animal", baselineOnActivation: false })]),
    sequence: Object.freeze([
      Object.freeze({ slot: "fallbackTravel", title: "Explorer jusqu’à trois nouvelles maps si aucune espèce nocturne n’est encore connue", action: "travel", target: 3, optional: true, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", mapGenerationOnCount: Object.freeze({ 3: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-NOCTURNAL-DEN-001", persistent: true, spawnOnce: true, contextRole: "ann07NocturnalFallback" })]) }) }) }) }),
      Object.freeze({ slot: "nocturnal", title: "Avoir observé au moins une créature nocturne", action: "observe", target: 1, requires: Object.freeze([]), params: Object.freeze({ catalogManaged: true }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["J’ai déjà croisé assez de formes de vie pour arrêter de les appeler simplement “les bestioles d’ici”. Il est temps de tenir un vrai catalogue."]),
      progress: Object.freeze([Object.freeze({ slot: "nocturnal", atCount: 1, text: "Une espèce nocturne aussi… parfait. Le monde change quand la lumière tombe, et mon inventaire doit en tenir compte." })]),
      completed: Object.freeze([
        "Première base du catalogue terminée. Désormais, chaque nouvelle créature aura sa place dans mes notes.",
        Object.freeze({ route: "journal", text: "Je commence un catalogue des créatures de cette planète. Première base posée : désormais, chaque nouvelle espèce observée aura sa place dans mes notes Faune/Nature." })
      ])
    })
  });


  const EXP01 = Object.freeze({
    id: "EXP-01", title: "Limites du territoire",
    description: "Depuis une map déjà bien comprise, ouvrir trois passages distincts et revenir au point de départ après chaque excursion afin d’en comprendre les limites topologiques.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "GAME-exploration_complete", count: 1 }),
    prerequisites: Object.freeze(["GAME-exploration_complete"]), bindActivationMap: true,
    priority: 207, passivePriorityAxis: "exploration", ponderation: 0.9, obsessionEligible: true, obsessionIntensity: 3,
    souvenir: true, memoryValence: "positive", scoreTrauma: 34,
    navigation: Object.freeze({ autonomousUnknownTravel: true, repeatUnknownTravelUntilComplete: true }),
    sequence: Object.freeze([
      Object.freeze({ slot:"north", title:"Ouvrir un passage au Nord", action:"travel", target:1, requires:Object.freeze([]), params:Object.freeze({ eventDriven:true, newOnly:true, distinctBy:"mapId", direction:"north" }) }),
      Object.freeze({ slot:"return1", title:"Revenir à la map de départ", action:"travel", target:1, requires:Object.freeze(["north"]), params:Object.freeze({ eventDriven:true, targetMapFact:"bibleActivation:EXP-01", targetMapField:"mapId", distinctBy:"transition" }) }),
      Object.freeze({ slot:"east", title:"Ouvrir un passage à l’Est", action:"travel", target:1, requires:Object.freeze(["return1"]), params:Object.freeze({ eventDriven:true, newOnly:true, distinctBy:"mapId", direction:"east" }) }),
      Object.freeze({ slot:"return2", title:"Revenir à la map de départ", action:"travel", target:1, requires:Object.freeze(["east"]), params:Object.freeze({ eventDriven:true, targetMapFact:"bibleActivation:EXP-01", targetMapField:"mapId", distinctBy:"transition" }) }),
      Object.freeze({ slot:"west", title:"Ouvrir un passage à l’Ouest", action:"travel", target:1, requires:Object.freeze(["return2"]), params:Object.freeze({ eventDriven:true, newOnly:true, distinctBy:"mapId", direction:"west" }) }),
      Object.freeze({ slot:"return3", title:"Revenir une dernière fois à la map de départ", action:"travel", target:1, requires:Object.freeze(["west"]), params:Object.freeze({ eventDriven:true, targetMapFact:"bibleActivation:EXP-01", targetMapField:"mapId", distinctBy:"transition" }) })
    ]),
    narrative:Object.freeze({ revealed:Object.freeze(["Je connais cette map, mais pas encore ses limites. Je vais voir jusqu’où ses passages me mènent."]), completed:Object.freeze(["Trois chemins, trois territoires différents… cette zone commence enfin à avoir une forme dans ma tête."]) })
  });

  const EXP02 = Object.freeze({
    id:"EXP-02", title:"Comprendre le territoire", description:"Explorer réellement une nouvelle map naturelle à 60 %, puis synthétiser l’organisation générale du terrain et d’une micro-scène naturelle.",
    pattern:"SEQUENCE_ACTIONS", trigger:Object.freeze({type:"progression.mission_completed",missionId:"EXP-01",count:1}), prerequisites:Object.freeze(["EXP-01"]),
    priority:206, passivePriorityAxis:"exploration", ponderation:0.9, obsessionEligible:true, obsessionIntensity:3, souvenir:true, memoryValence:"positive", scoreTrauma:36,
    navigation:Object.freeze({autonomousUnknownTravel:true,singleUnknownTransition:true}),
    mapGeneration:Object.freeze({compatibleBiomes:Object.freeze(["forest","jungle","swamp"]), requiredMicroScenes:Object.freeze([Object.freeze({id:"MSC-FERN-CLEARING-001",persistent:true,spawnOnce:true,contextRole:"exp02NatureContext"})])}),
    sequence:Object.freeze([
      Object.freeze({slot:"reach",title:"Découvrir un nouveau territoire naturel",action:"travel",target:1,params:Object.freeze({eventDriven:true,newOnly:true,distinctBy:"mapId",completionArrivalFact:"exp02:map",completionArrivalField:"mapId"})}),
      Object.freeze({slot:"explore",title:"Explorer 60 % de cette map",action:"explore-zone",target:60,requires:Object.freeze(["reach"]),params:Object.freeze({scope:"map",metric:"surfacePercent",threshold:60,requiredMapFact:"exp02:map",requiredMapField:"mapId"})}),
      Object.freeze({slot:"context",title:"Observer la scène naturelle et synthétiser le territoire",action:"observe",target:1,requires:Object.freeze(["explore"]),params:Object.freeze({microSceneId:"MSC-FERN-CLEARING-001",requiredMapFact:"exp02:map",requiredMapField:"mapId"})})
    ]),
    narrative:Object.freeze({revealed:Object.freeze(["Regarder une grande partie d’une map ne suffit pas si je ne comprends pas comment tout s’organise."]),completed:Object.freeze(["Relief, végétation, repères… maintenant je vois la logique de cet endroit, pas seulement ses morceaux."])})
  });

  const EXP03 = Object.freeze({
    id:"EXP-03",title:"Un savoir ancien",description:"Pousser l’exploration plus loin et étudier un ancien atelier afin d’identifier une civilisation d’artisans aux techniques avancées.",
    pattern:"SEQUENCE_ACTIONS",trigger:Object.freeze({type:"progression.mission_completed",missionId:"EXP-02",count:1}),prerequisites:Object.freeze(["EXP-02"]),
    priority:205,passivePriorityAxis:"research",ponderation:1,obsessionEligible:true,obsessionIntensity:5,souvenir:true,memoryValence:"positive",scoreTrauma:62,
    navigation:Object.freeze({autonomousUnknownTravel:true,singleUnknownTransition:true}),mapGeneration:Object.freeze({requiredMicroScenes:Object.freeze([Object.freeze({id:"MSC-CUSTOM-ETABLI",persistent:true,spawnOnce:true,contextRole:"exp03AncientWorkshop"})])}),
    sequence:Object.freeze([
      Object.freeze({slot:"reach",title:"Découvrir un territoire plus lointain",action:"travel",target:1,params:Object.freeze({eventDriven:true,newOnly:true,distinctBy:"mapId",completionArrivalFact:"exp03:map",completionArrivalField:"mapId"})}),
      Object.freeze({slot:"observe",title:"Observer l’ancien atelier",action:"observe",target:1,requires:Object.freeze(["reach"]),params:Object.freeze({microSceneId:"MSC-CUSTOM-ETABLI",requiredMapFact:"exp03:map",requiredMapField:"mapId"})}),
      Object.freeze({slot:"analyze",title:"Analyser trois éléments techniques distincts",action:"analyze",target:3,requires:Object.freeze(["observe"]),params:Object.freeze({microSceneId:"MSC-CUSTOM-ETABLI",cuoTypes:Object.freeze(["stele","needle","pulse_core","memory_capsule","relay_block","ancient_machine_wreck"]),distinctBy:"objectId",requiredMapFact:"exp03:map",requiredMapField:"mapId"})})
    ]),
    narrative:Object.freeze({revealed:Object.freeze(["Ça ressemble à un atelier… mais pas au genre de bricolage que je pourrais improviser."]),completed:Object.freeze(["Ils expérimentaient. Et plutôt bien. J’aimerais comprendre jusqu’où leurs techniques pouvaient aller."])})
  });

  const EXP04 = Object.freeze({
    id:"EXP-04",title:"Une source permanente",description:"À plus de dix maps de toute infrastructure établie, étudier une mare et son ruisseau comme futur point d’appui logistique.",
    pattern:"SEQUENCE_ACTIONS",trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true}),prerequisites:Object.freeze(["EXP-03"]),bindActivationMap:true,targetMapFact:"bibleActivation:EXP-04",targetMapField:"mapId",triggerOnly:true,
    siteDistanceGate:Object.freeze({kinds:Object.freeze(["camp","refuge","base"]),minimumExclusive:10}),priority:204,passivePriorityAxis:"survival",ponderation:1,obsessionEligible:true,obsessionIntensity:4,souvenir:true,memoryValence:"positive",scoreTrauma:54,
    mapGeneration:Object.freeze({compatibleBiomes:Object.freeze(["forest","jungle","swamp"]),requiredMicroScenes:Object.freeze([Object.freeze({id:"MSC-CUSTOM-RUISSEAU-MARE",persistent:true,spawnOnce:true,contextRole:"exp04PermanentWater"})])}),
    sequence:Object.freeze([
      Object.freeze({slot:"water",title:"Observer la mare et le cours d’eau",action:"observe",target:1,params:Object.freeze({cuoTypes:Object.freeze(["watercourse","pool"]),microSceneId:"MSC-CUSTOM-RUISSEAU-MARE",requiredMapFact:"bibleActivation:EXP-04",requiredMapField:"mapId"})}),
      Object.freeze({slot:"study",title:"Analyser cette source comme point d’appui durable",action:"analyze",target:1,requires:Object.freeze(["water"]),params:Object.freeze({cuoTypes:Object.freeze(["watercourse","pool"]),microSceneId:"MSC-CUSTOM-RUISSEAU-MARE",requiredMapFact:"bibleActivation:EXP-04",requiredMapField:"mapId"})})
    ]),narrative:Object.freeze({revealed:Object.freeze(["De l’eau permanente, si loin de mes sites… ça change complètement la valeur de cette zone."]),completed:Object.freeze(["Une source fiable ici pourrait devenir le cœur d’un vrai point d’appui."])})
  });

  const EXP05 = Object.freeze({
    id:"EXP-05",title:"Carte des ressources locales",description:"Depuis la source EXP-04, découvrir un gisement voisin, observer trois ressources, prélever deux unités de deux minerais distincts puis revenir à la source.",pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"progression.mission_completed",missionId:"EXP-04",count:1}),prerequisites:Object.freeze(["EXP-04"]),priority:203,passivePriorityAxis:"collection",ponderation:0.95,obsessionEligible:true,obsessionIntensity:4,souvenir:true,memoryValence:"positive",scoreTrauma:48,
    navigation:Object.freeze({autonomousUnknownTravel:true,singleUnknownTransition:true}),mapGeneration:Object.freeze({compatibleBiomes:Object.freeze(["mountain","magnetic","crystalline"]),requiredMicroScenes:Object.freeze([Object.freeze({id:"MSC-CUSTOM-CARRIEREDECRISTAUX1",persistent:true,spawnOnce:true,contextRole:"exp05ResourceDeposit"})])}),
    sequence:Object.freeze([
      Object.freeze({slot:"reach",title:"Découvrir un gisement voisin",action:"travel",target:1,params:Object.freeze({eventDriven:true,newOnly:true,distinctBy:"mapId",completionArrivalFact:"exp05:map",completionArrivalField:"mapId"})}),
      Object.freeze({slot:"observe",title:"Observer trois types de ressources minérales distincts",action:"observe",target:3,requires:Object.freeze(["reach"]),params:Object.freeze({subject:"mineral",distinctBy:"cuoType",requiredMapFact:"exp05:map",requiredMapField:"mapId"})}),
      Object.freeze({slot:"mineralA1",title:"Collecter une première unité d’un minerai",action:"collect",target:1,requires:Object.freeze(["observe"]),params:Object.freeze({subject:"mineral",requiredMapFact:"exp05:map",requiredMapField:"mapId"})}),
      Object.freeze({slot:"mineralA2",title:"Collecter une seconde unité du même minerai",action:"collect",target:1,requires:Object.freeze(["mineralA1"]),params:Object.freeze({subject:"mineral",relation:Object.freeze({fromSlot:"mineralA1",sameBy:Object.freeze(["cuoType"])}),requiredMapFact:"exp05:map",requiredMapField:"mapId"})}),
      Object.freeze({slot:"mineralB1",title:"Collecter une unité d’un second minerai distinct",action:"collect",target:1,requires:Object.freeze(["mineralA2"]),params:Object.freeze({subject:"mineral",relation:Object.freeze({fromSlot:"mineralA1",differentBy:Object.freeze(["cuoType"])}),requiredMapFact:"exp05:map",requiredMapField:"mapId"})}),
      Object.freeze({slot:"mineralB2",title:"Collecter une seconde unité de ce second minerai",action:"collect",target:1,requires:Object.freeze(["mineralB1"]),params:Object.freeze({subject:"mineral",relation:Object.freeze({fromSlot:"mineralB1",sameBy:Object.freeze(["cuoType"])}),requiredMapFact:"exp05:map",requiredMapField:"mapId"})}),
      Object.freeze({slot:"return",title:"Revenir à la source EXP-04",action:"travel",target:1,requires:Object.freeze(["mineralB2"]),params:Object.freeze({eventDriven:true,targetMapFact:"bibleActivation:EXP-04",targetMapField:"mapId",distinctBy:"transition"})})
    ]),narrative:Object.freeze({revealed:Object.freeze(["Si les ressources sont proches aussi, cette source devient beaucoup plus intéressante."]),completed:Object.freeze(["Le trajet est simple, les minerais sont là… je pourrais presque travailler depuis la source."])})
  });

  const EXP06 = Object.freeze({
    id:"EXP-06",title:"Frontière de deux mondes",description:"Depuis la source EXP-04, atteindre un nouveau territoire d’un biome volontairement différent et confirmer la valeur de la source comme carrefour logistique.",pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"progression.mission_completed",missionId:"EXP-05",count:1}),prerequisites:Object.freeze(["EXP-05"]),priority:202,passivePriorityAxis:"exploration",ponderation:1,obsessionEligible:true,obsessionIntensity:5,souvenir:true,memoryValence:"positive",scoreTrauma:72,
    navigation:Object.freeze({autonomousUnknownTravel:true,singleUnknownTransition:true}),mapGeneration:Object.freeze({compatibleBiomes:Object.freeze(["mountain","magnetic","crystalline"]),requiredMicroScenes:Object.freeze([Object.freeze({id:"MSC-CUSTOM-CACTUS-ORE",persistent:true,spawnOnce:true,contextRole:"exp06RichBiome"})])}),
    sequence:Object.freeze([
      Object.freeze({slot:"returnSource",title:"Revenir d’abord sur la map EXP-04",action:"travel",target:1,params:Object.freeze({eventDriven:true,targetMapFact:"bibleActivation:EXP-04",targetMapField:"mapId",distinctBy:"transition"})}),
      Object.freeze({slot:"reach",title:"Découvrir depuis EXP-04 un second milieu",action:"travel",target:1,requires:Object.freeze(["returnSource"]),params:Object.freeze({eventDriven:true,newOnly:true,distinctBy:"mapId",completionArrivalFact:"exp06:map",completionArrivalField:"mapId"})}),
      Object.freeze({slot:"compare",title:"Observer un élément caractéristique de ce nouveau milieu",action:"observe",target:1,requires:Object.freeze(["reach"]),params:Object.freeze({microSceneId:"MSC-CUSTOM-CACTUS-ORE",requiredMapFact:"exp06:map",requiredMapField:"mapId"})})
    ]),narrative:Object.freeze({revealed:Object.freeze(["Deux environnements très différents accessibles depuis le même point… ce n’est plus seulement une belle source."]),completed:Object.freeze(["Eau, ressources et plusieurs milieux autour. J’aimerais vraiment avoir un camp ici un jour."])})
  });

  const EXP07 = Object.freeze({
    id:"EXP-07",title:"Une anomalie locale",description:"Découvrir une map où une tempête électrostatique et trois stèles anciennes coexistent, puis étudier les quatre indices.",pattern:"SEQUENCE_ACTIONS",trigger:Object.freeze({type:"progression.mission_completed",missionId:"EXP-06",count:1}),prerequisites:Object.freeze(["EXP-06"]),priority:201,passivePriorityAxis:"research",ponderation:1,obsessionEligible:true,obsessionIntensity:5,souvenir:true,memoryValence:"positive",scoreTrauma:74,
    navigation:Object.freeze({autonomousUnknownTravel:true,singleUnknownTransition:true}),mapGeneration:Object.freeze({compatibleBiomes:Object.freeze(["magnetic","crystalline","alien"]),requiredObjects:Object.freeze([Object.freeze({type:"electrostatic_storm",count:1,contextRole:"exp07Storm"}),Object.freeze({type:"stele",count:3,contextRole:"exp07Steles"}),Object.freeze({type:"nocturnal_animal",count:1,contextRole:"exp08NightFauna"}),Object.freeze({type:"lunar_vine",count:1,contextRole:"exp08NightFlora"})])}),
    sequence:Object.freeze([
      Object.freeze({slot:"reach",title:"Découvrir le territoire de l’anomalie",action:"travel",target:1,params:Object.freeze({eventDriven:true,newOnly:true,distinctBy:"mapId",completionArrivalFact:"exp07:map",completionArrivalField:"mapId"})}),
      Object.freeze({slot:"storm",title:"Observer la tempête électrostatique",action:"observe",target:1,requires:Object.freeze(["reach"]),params:Object.freeze({cuoType:"electrostatic_storm",requiredMapFact:"exp07:map",requiredMapField:"mapId"})}),
      Object.freeze({slot:"steles",title:"Analyser les trois stèles présentes sur cette map",action:"analyze",target:3,requires:Object.freeze(["storm"]),params:Object.freeze({cuoType:"stele",distinctBy:"instanceId",requiredMapFact:"exp07:map",requiredMapField:"mapId"})})
    ]),narrative:Object.freeze({revealed:Object.freeze(["Une tempête, et trois stèles au même endroit ? Ce n’est probablement pas une coïncidence."]),completed:Object.freeze(["Ces marques ne sont pas là par hasard. Je ne suis visiblement pas le premier à m’interroger sur ce phénomène."])})
  });

  const EXP08 = Object.freeze({
    id:"EXP-08",title:"Map après la nuit",description:"Attendre le visage nocturne du territoire EXP-07 et y observer une créature nocturne ainsi qu’une manifestation végétale bioluminescente déjà garanties sur cette map.",pattern:"SEQUENCE_ACTIONS",trigger:Object.freeze({type:"progression.mission_completed",missionId:"EXP-07",count:1}),prerequisites:Object.freeze(["EXP-07"]),priority:200,passivePriorityAxis:"research",ponderation:0.95,obsessionEligible:true,obsessionIntensity:4,souvenir:true,memoryValence:"positive",scoreTrauma:52,
    targetMapFact:"exp07:map",targetMapField:"mapId",
    sequence:Object.freeze([
      Object.freeze({slot:"animal",title:"Attendre la nuit et observer la créature nocturne de la map EXP-07",action:"observe",target:1,params:Object.freeze({cuoType:"nocturnal_animal",requiredMapFact:"exp07:map",requiredMapField:"mapId"})}),
      Object.freeze({slot:"flora",title:"Observer la liane lunaire de cette même map",action:"observe",target:1,requires:Object.freeze(["animal"]),params:Object.freeze({cuoType:"lunar_vine",requiredMapFact:"exp07:map",requiredMapField:"mapId"})})
    ]),narrative:Object.freeze({revealed:Object.freeze(["Je connais cette map de jour. La nuit, elle raconte peut-être autre chose."]),completed:Object.freeze(["Même terrain, autre vie. Je regardais seulement la moitié de ce monde."])})
  });

  const EXP09 = Object.freeze({
    id:"EXP-09",title:"Après la tempête",description:"Revenir sur la map EXP-07 après l’expérience nocturne et réanalyser ses trois stèles afin de distinguer les changements d’état de ce qui persiste.",pattern:"SEQUENCE_ACTIONS",trigger:Object.freeze({type:"progression.mission_completed",missionId:"EXP-08",count:1}),prerequisites:Object.freeze(["EXP-08"]),priority:199,passivePriorityAxis:"research",ponderation:1,obsessionEligible:true,obsessionIntensity:5,souvenir:true,memoryValence:"positive",scoreTrauma:66,
    sequence:Object.freeze([
      Object.freeze({slot:"return",title:"Revenir sur la map de l’anomalie EXP-07",action:"travel",target:1,params:Object.freeze({eventDriven:true,targetMapFact:"exp07:map",targetMapField:"mapId",distinctBy:"transition"})}),
      Object.freeze({slot:"steles",title:"Réanalyser les trois stèles de cette map",action:"analyze",target:3,requires:Object.freeze(["return"]),params:Object.freeze({cuoType:"stele",distinctBy:"instanceId",requiredMapFact:"exp07:map",requiredMapField:"mapId"})})
    ]),narrative:Object.freeze({revealed:Object.freeze(["Je veux revoir les stèles maintenant que les conditions ont changé."]),completed:Object.freeze(["Le décor change, l’environnement change… mais quelque chose persiste. Une forme d’énergie reste présente."])})
  });

  const EXP10 = Object.freeze({
    id:"EXP-10",title:"Vestiges silencieux",description:"Étudier brièvement un nouveau vestige sans dupliquer la branche ARCH, afin de renforcer la curiosité archéologique de BlueFox.",pattern:"SEQUENCE_ACTIONS",trigger:Object.freeze({type:"progression.mission_completed",missionId:"EXP-09",count:1}),prerequisites:Object.freeze(["EXP-09"]),priority:198,passivePriorityAxis:"research",ponderation:1,obsessionEligible:true,obsessionIntensity:5,souvenir:true,memoryValence:"positive",scoreTrauma:78,
    navigation:Object.freeze({autonomousUnknownTravel:true,singleUnknownTransition:true}),mapGeneration:Object.freeze({requiredObjects:Object.freeze([Object.freeze({type:"tech_relic",count:1,contextRole:"exp10Vestige"})])}),
    sequence:Object.freeze([
      Object.freeze({slot:"reach",title:"Découvrir un territoire portant un vestige",action:"travel",target:1,params:Object.freeze({eventDriven:true,newOnly:true,distinctBy:"mapId",completionArrivalFact:"exp10:map",completionArrivalField:"mapId"})}),
      Object.freeze({slot:"observe",title:"Observer le vestige",action:"observe",target:1,requires:Object.freeze(["reach"]),params:Object.freeze({cuoType:"tech_relic",requiredMapFact:"exp10:map",requiredMapField:"mapId"})}),
      Object.freeze({slot:"analyze",title:"Analyser le vestige sans ouvrir une enquête parallèle",action:"analyze",target:1,requires:Object.freeze(["observe"]),params:Object.freeze({cuoType:"tech_relic",requiredMapFact:"exp10:map",requiredMapField:"mapId"})})
    ]),narrative:Object.freeze({revealed:Object.freeze(["Encore un vestige. Plus j’avance, plus ces traces semblent appartenir à une histoire immense."]),completed:Object.freeze(["Je veux comprendre ceux qui vivaient ici. Je crois que ces ruines vont continuer à m’attirer."])})
  });

  const EXP11 = Object.freeze({
    id:"EXP-11",title:"Le chemin du retour",description:"Interrompre l’expédition pour revenir physiquement vers le réseau de Camp/Refuge/Base et transformer ce retour en besoin logistique d’expérimentation plus proche.",pattern:"TRAVEL_CYCLE",trigger:Object.freeze({type:"progression.mission_completed",missionId:"EXP-10",count:1}),prerequisites:Object.freeze(["EXP-10"]),priority:197,passivePriorityAxis:"research",ponderation:1,obsessionEligible:true,obsessionIntensity:4,souvenir:true,memoryValence:"positive",scoreTrauma:58,
    targetMapFact:"bibleActivation:EXP-04",targetMapField:"mapId",
    slots:Object.freeze({travel:Object.freeze({title:"Revenir physiquement vers le point d’appui connu",target:1,params:Object.freeze({eventDriven:true,targetMapFact:"bibleActivation:EXP-04",targetMapField:"mapId",distinctBy:"transition"})})}),
    narrative:Object.freeze({revealed:Object.freeze(["J’ai assez de données pour travailler, mais pas ici. Il faut rentrer."]),completed:Object.freeze(["Revenir aussi loin chaque fois que je veux expérimenter… si seulement j’avais un établi plus près de mes zones d’étude."])})
  });

  const EXP12 = Object.freeze({
    id:"EXP-12",title:"Expertise locale",description:"Découvrir deux nouvelles maps après le déclenchement, y reconnaître trois micro-scènes garanties et explorer intégralement la seconde.",pattern:"SEQUENCE_ACTIONS",trigger:Object.freeze({type:"progression.mission_completed",missionId:"EXP-11",count:1}),prerequisites:Object.freeze(["EXP-11"]),priority:196,passivePriorityAxis:"exploration",ponderation:1,obsessionEligible:true,obsessionIntensity:5,souvenir:true,memoryValence:"positive",scoreTrauma:76,
    navigation:Object.freeze({autonomousUnknownTravel:true,repeatUnknownTravelUntilComplete:true}),
    sequence:Object.freeze([
      Object.freeze({slot:"map1",title:"Découvrir une première nouvelle map",action:"travel",target:1,params:Object.freeze({eventDriven:true,newOnly:true,distinctBy:"mapId",completionArrivalFact:"exp12:map1",completionArrivalField:"mapId",mapGenerationOnCount:Object.freeze({1:Object.freeze({requiredMicroScenes:Object.freeze([Object.freeze({id:"MSC-FERN-CLEARING-001",persistent:true,spawnOnce:true,contextRole:"exp12Map1Context"})])})})})}),
      Object.freeze({slot:"msc1",title:"Découvrir la micro-scène de la première map",action:"observe",target:1,requires:Object.freeze(["map1"]),params:Object.freeze({microSceneId:"MSC-FERN-CLEARING-001",requiredMapFact:"exp12:map1",requiredMapField:"mapId"})}),
      Object.freeze({slot:"map2",title:"Découvrir une deuxième nouvelle map",action:"travel",target:1,requires:Object.freeze(["msc1"]),params:Object.freeze({eventDriven:true,newOnly:true,distinctBy:"mapId",completionArrivalFact:"exp12:map2",completionArrivalField:"mapId",mapGenerationOnCount:Object.freeze({1:Object.freeze({requiredMicroScenes:Object.freeze([Object.freeze({id:"MSC-CUSTOM-CARRIERE",persistent:true,spawnOnce:true,contextRole:"exp12Map2ContextA"}),Object.freeze({id:"MSC-CUSTOM-CORAILBIOLUMINESCENT1",persistent:true,spawnOnce:true,contextRole:"exp12Map2ContextB"})])})})})}),
      Object.freeze({slot:"msc2a",title:"Découvrir une première micro-scène sur la seconde map",action:"observe",target:1,requires:Object.freeze(["map2"]),params:Object.freeze({microSceneId:"MSC-CUSTOM-CARRIERE",requiredMapFact:"exp12:map2",requiredMapField:"mapId"})}),
      Object.freeze({slot:"msc2b",title:"Découvrir une seconde micro-scène sur la seconde map",action:"observe",target:1,requires:Object.freeze(["msc2a"]),params:Object.freeze({microSceneId:"MSC-CUSTOM-CORAILBIOLUMINESCENT1",requiredMapFact:"exp12:map2",requiredMapField:"mapId"})}),
      Object.freeze({slot:"explore100",title:"Explorer intégralement l’une des deux nouvelles maps",action:"explore-zone",target:100,requires:Object.freeze(["msc2b"]),params:Object.freeze({scope:"map",metric:"surfacePercent",threshold:100,requiredMapFact:"exp12:map2",requiredMapField:"mapId"})})
    ]),narrative:Object.freeze({revealed:Object.freeze(["Deux territoires de plus. Cette fois, je veux vraiment les comprendre jusqu’au bout."]),completed:Object.freeze(["Je ne traverse plus seulement des maps. Je commence à connaître ce monde comme un territoire."])})
  });


  // ECO-SIS — lecture écologique puis tellurique du monde.
  // ECO-03 n'est volontairement pas réintroduite : son ancien rôle de conception de drones
  // est désormais possédé par les chaînes Engineering / BAL / DRN existantes.
  const ECO01 = Object.freeze({
    id: "ECO-01",
    title: "Cartographie du cratère",
    description: "Sur un nouveau territoire, lire les traces géologiques d'un impact et comprendre comment le relief local s'est organisé avant d'étudier la réponse du vivant.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", direction: "west", count: 1, uniqueOnly: true }),
    prerequisites: Object.freeze(["GAME-exploration_complete"]),
    bindActivationMap: true,
    triggerOnly: true,
    priority: 195,
    passivePriorityAxis: "exploration",
    ponderation: 0.8,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "mixed",
    scoreTrauma: 42,
    mapGeneration: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-ECO-STAR-001", persistent: true, spawnOnce: true, contextRole: "eco01ImpactContext" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "explore", title: "Explorer 35 % du territoire marqué par l'impact", action: "explore-zone", target: 35, params: Object.freeze({ scope: "map", metric: "surfacePercent", threshold: 35, requiredMapFact: "bibleActivation:ECO-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "impact", title: "Observer la structure du site d'impact", action: "observe", target: 1, requires: Object.freeze(["explore"]), params: Object.freeze({ microSceneId: "MSC-ECO-STAR-001", requiredMapFact: "bibleActivation:ECO-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "terrain", title: "Analyser deux éléments géologiques distincts du site", action: "analyze", target: 2, requires: Object.freeze(["impact"]), params: Object.freeze({ subject: "mineral", distinctBy: "objectId", requiredMapFact: "bibleActivation:ECO-01", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le relief garde la trace de ce qui lui est arrivé. Je veux comprendre ce que cet impact a changé autour de lui."]),
      completed: Object.freeze(["Le sol raconte ce qui s'est passé ici. Si le terrain a changé, le vivant qui pousse dessus doit forcément en porter quelque chose aussi."])
    })
  });

  const ECO02 = Object.freeze({
    id: "ECO-02",
    title: "La flore comme indice",
    description: "Comparer une plante d'un contexte végétal ordinaire à une plante thermosensible afin de comprendre comment la géologie et les conditions du sol influencent le vivant.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ECO-01", count: 1 }),
    prerequisites: Object.freeze(["ECO-01"]),
    priority: 194,
    passivePriorityAxis: "research",
    ponderation: 0.85,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 34,
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ requiredMicroScenes: Object.freeze([
      Object.freeze({ id: "MSC-FERN-CLEARING-001", persistent: true, spawnOnce: true, contextRole: "eco02OrdinaryFlora" }),
      Object.freeze({ id: "MSC-ECO-THERM-001", persistent: true, spawnOnce: true, contextRole: "eco02ThermalFlora" })
    ]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reach", title: "Découvrir un terrain où comparer deux contextes végétaux", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", completionArrivalFact: "eco02:map", completionArrivalField: "mapId" }) }),
      Object.freeze({ slot: "ordinary", title: "Observer une plante dans un contexte végétal ordinaire", action: "observe", target: 1, requires: Object.freeze(["reach"]), params: Object.freeze({ subject: "flora", microSceneId: "MSC-FERN-CLEARING-001", requiredMapFact: "eco02:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "thermal", title: "Observer une plante thermosensible dans la veine chaude", action: "observe", target: 1, requires: Object.freeze(["ordinary"]), params: Object.freeze({ cuoType: "thermosap_moss", microSceneId: "MSC-ECO-THERM-001", requiredMapFact: "eco02:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "ordinaryStudy", title: "Analyser la plante du contexte ordinaire", action: "analyze", target: 1, requires: Object.freeze(["thermal"]), params: Object.freeze({ subject: "flora", microSceneId: "MSC-FERN-CLEARING-001", requiredMapFact: "eco02:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "thermalStudy", title: "Analyser la réponse de la Thermosève au contexte minéral", action: "analyze", target: 1, requires: Object.freeze(["ordinaryStudy"]), params: Object.freeze({ cuoType: "thermosap_moss", microSceneId: "MSC-ECO-THERM-001", requiredMapFact: "eco02:map", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le sol a changé. Je veux voir si les plantes réagissent elles aussi à ce qu'il y a sous leurs racines."]),
      completed: Object.freeze(["Elles ne poussent pas seulement différemment. Elles répondent à ce qu'il y a sous elles. Le vivant peut m'aider à lire le terrain."])
    })
  });

  const ECO04 = Object.freeze({
    id: "ECO-04",
    title: "La piste des anomalies telluriques",
    description: "Suivre une faille riche en indices minéraux afin de confirmer que plusieurs symptômes locaux partagent une origine souterraine commune.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ECO-02", count: 1 }),
    prerequisites: Object.freeze(["ECO-02"]),
    priority: 193,
    passivePriorityAxis: "research",
    ponderation: 0.95,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 48,
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-BASALT-RIFT", persistent: true, spawnOnce: true, contextRole: "eco04TelluricRift" })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reach", title: "Découvrir une faille porteuse d'indices telluriques", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", completionArrivalFact: "eco04:map", completionArrivalField: "mapId" }) }),
      Object.freeze({ slot: "rift", title: "Observer la faille basaltique", action: "observe", target: 1, requires: Object.freeze(["reach"]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-BASALT-RIFT", requiredMapFact: "eco04:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "indices", title: "Analyser deux indices géologiques distincts de la faille", action: "analyze", target: 2, requires: Object.freeze(["rift"]), params: Object.freeze({ cuoTypes: Object.freeze(["resonant_basalt", "strong_rock", "large_rock", "needle"]), distinctBy: "cuoType", requiredMapFact: "eco04:map", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["La flore m'a montré un symptôme. Maintenant je veux suivre ce qui change réellement sous la surface."]),
      completed: Object.freeze(["Ce ne sont pas des anomalies séparées. Plusieurs indices répondent à la même structure sous le terrain."])
    })
  });

  const SIS01 = Object.freeze({
    id: "SIS-01",
    title: "L'écoute des battements telluriques",
    description: "Sur la faille étudiée par ECO-04, confirmer par plusieurs analyses distinctes qu'une signature tellurique se répète sans recourir à un faux compteur temporel.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ECO-04", count: 1 }),
    prerequisites: Object.freeze(["ECO-04"]),
    priority: 192,
    passivePriorityAxis: "research",
    ponderation: 0.95,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 44,
    targetMapFact: "eco04:map",
    targetMapField: "mapId",
    sequence: Object.freeze([
      Object.freeze({ slot: "baseline", title: "Reprendre une première mesure sur la faille", action: "analyze", target: 1, params: Object.freeze({ cuoTypes: Object.freeze(["resonant_basalt", "strong_rock", "large_rock", "needle"]), requiredMapFact: "eco04:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "repeat", title: "Comparer deux autres indices distincts", action: "analyze", target: 2, requires: Object.freeze(["baseline"]), params: Object.freeze({ cuoTypes: Object.freeze(["resonant_basalt", "strong_rock", "large_rock", "needle"]), distinctBy: "cuoType", requiredMapFact: "eco04:map", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Un point peut tromper. Si la même signature revient ailleurs dans la faille, alors ce phénomène est réel."]),
      completed: Object.freeze(["Trois indices différents, mais une même signature. Ce n'est plus un accident local."])
    })
  });

  const SIS02 = Object.freeze({
    id: "SIS-02",
    title: "La cartographie des failles de surface",
    description: "Découvrir une nouvelle portion du réseau tellurique, explorer le terrain puis comparer deux contextes afin de comprendre comment la signature se propage dans l'espace.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "SIS-01", count: 1 }),
    prerequisites: Object.freeze(["SIS-01"]),
    priority: 191,
    passivePriorityAxis: "exploration",
    ponderation: 0.95,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 46,
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({ requiredMicroScenes: Object.freeze([
      Object.freeze({ id: "MSC-CUSTOM-BASALT-RIFT", persistent: true, spawnOnce: true, contextRole: "sis02Rift" }),
      Object.freeze({ id: "MSC-ECO-THERM-001", persistent: true, spawnOnce: true, contextRole: "sis02ThermalLeak" })
    ]), requiredObjects: Object.freeze([Object.freeze({ type: "resonant_basalt", count: 3 })]) }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reach", title: "Découvrir une autre portion du réseau tellurique", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", completionArrivalFact: "sis02:map", completionArrivalField: "mapId" }) }),
      Object.freeze({ slot: "explore", title: "Explorer 60 % de cette portion du réseau", action: "explore-zone", target: 60, requires: Object.freeze(["reach"]), params: Object.freeze({ scope: "map", metric: "surfacePercent", threshold: 60, requiredMapFact: "sis02:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "rift", title: "Observer la faille de cette nouvelle zone", action: "observe", target: 1, requires: Object.freeze(["explore"]), params: Object.freeze({ microSceneId: "MSC-CUSTOM-BASALT-RIFT", requiredMapFact: "sis02:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "thermal", title: "Observer une fuite thermique liée au même réseau", action: "observe", target: 1, requires: Object.freeze(["rift"]), params: Object.freeze({ microSceneId: "MSC-ECO-THERM-001", requiredMapFact: "sis02:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "compare", title: "Comparer la signature minérale des deux contextes", action: "analyze", target: 2, requires: Object.freeze(["thermal"]), params: Object.freeze({ cuoTypes: Object.freeze(["resonant_basalt", "thermosap_moss", "strong_rock"]), distinctBy: "cuoType", requiredMapFact: "sis02:map", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je sais que la signature existe. Maintenant je veux voir comment elle se déplace dans le terrain."]),
      completed: Object.freeze(["Les pulsations suivent le relief. Je commence à voir le réseau plutôt que ses symptômes."])
    })
  });

  const SIS03 = Object.freeze({
    id: "SIS-03",
    title: "Stabilisation des secousses",
    description: "Prélever du basalte résonant sur le réseau étudié, tester sa résonance à l'établi puis revenir physiquement sur le terrain pour valider une méthode de maîtrise locale sans créer de stabilisateur fictif.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "SIS-02", count: 1 }),
    prerequisites: Object.freeze(["SIS-02", "GAME-engineering_6"]),
    experimentalPrerequisites: Object.freeze(["materials_science"]),
    priority: 190,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 60,
    sequence: Object.freeze([
      Object.freeze({ slot: "collect", title: "Prélever trois basaltes résonants sur le réseau étudié", action: "collect", target: 3, params: Object.freeze({ cuoType: "resonant_basalt", requiredMapFact: "sis02:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "experiment", title: "Tester la résonance du basalte à l'établi", action: "research", target: 1, requires: Object.freeze(["collect"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "returnField", title: "Revenir physiquement sur la portion du réseau étudiée", action: "travel", target: 1, requires: Object.freeze(["experiment"]), params: Object.freeze({ eventDriven: true, targetMapFact: "sis02:map", targetMapField: "mapId", distinctBy: "transition" }) }),
      Object.freeze({ slot: "validation", title: "Valider la maîtrise locale par une dernière analyse du terrain", action: "analyze", target: 1, requires: Object.freeze(["returnField"]), params: Object.freeze({ cuoTypes: Object.freeze(["resonant_basalt", "strong_rock", "large_rock"]), requiredMapFact: "sis02:map", requiredMapField: "mapId" }) })
    ]),
    proximityContexts: Object.freeze([Object.freeze({
      id: "sis03-workbench-resonance",
      microSceneId: "MSC-CUSTOM-ETABLI-VIDE",
      fact: "sis03:workbenchResonance:v1",
      slot: "experiment",
      radius: 8,
      inventoryConsume: Object.freeze({
        inventoryKey: "resonant_basalt",
        quantity: 3,
        missingMessage: "Il me faut trois basaltes résonants réels avant de tester leur comportement à l'établi."
      })
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je ne peux pas empêcher la planète de bouger. Mais je peux peut-être comprendre comment ses roches dissipent ou transmettent cette énergie."]),
      completed: Object.freeze(["Je ne peux pas arrêter la planète de bouger. Mais je comprends maintenant comment éviter que chaque vibration devienne un danger local."])
    })
  });

  const PHEN01 = Object.freeze({
    id: "PHEN-01",
    title: "Une mesure ne suffit pas",
    description: "Comparer l’observation de BlueFox à un relevé indépendant du Scout sur la même anomalie afin d’établir une première méthode scientifique reproductible.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "BAL-03", count: 1 }),
    prerequisites: Object.freeze(["BAL-03", "ENE-13"]),
    priority: 214,
    passivePriorityAxis: "research",
    ponderation: 0.95,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 34,
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredObjects: Object.freeze([Object.freeze({ type: "fog_bank", count: 1, contextRole: "phen01ReferenceAnomaly" })])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachPhenomenon",
        title: "Rejoindre un nouveau territoire propice au relevé",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" })
      }),
      Object.freeze({
        slot: "bluefoxReading",
        title: "Observer personnellement une anomalie",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachPhenomenon"]),
        params: Object.freeze({ cuoType: "fog_bank", actor: "bluefox", sequenceSlot: "bluefoxReading" })
      }),
      Object.freeze({
        slot: "scoutReading",
        title: "Obtenir un relevé indépendant du Scout sur la même anomalie",
        action: "observe",
        target: 1,
        requires: Object.freeze(["bluefoxReading"]),
        params: Object.freeze({
          cuoType: "fog_bank",
          actor: "scout",
          relation: Object.freeze({ fromSlot: "bluefoxReading", sameBy: Object.freeze(["instanceId"]) })
        })
      })
    ]),
    proximityContexts: Object.freeze([Object.freeze({
      id: "phen01-fog-proximity",
      cuoType: "fog_bank",
      fact: "phen01:fog-proximity",
      slot: "bluefoxReading",
      radius: 4.8,
      requiresSlotComplete: "reachPhenomenon"
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Une impression n’est pas une mesure. Si le Scout retrouve la même chose sans moi, alors j’aurai quelque chose de reproductible."]),
      completed: Object.freeze(["Deux regards, le même phénomène. Je peux commencer à comparer le monde au lieu de seulement le décrire."])
    })
  });

  const PHEN02 = Object.freeze({
    id: "PHEN-02",
    title: "Le feu sous la roche",
    description: "Faire reconnaître au Scout plusieurs signatures d’un territoire volcanique puis examiner l’élément géologique le plus significatif.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "PHEN-01", count: 1 }),
    prerequisites: Object.freeze(["PHEN-01"]),
    priority: 210,
    passivePriorityAxis: "research",
    concurrentAvailabilityGroup: "PHEN-01-OPPORTUNITIES",
    ponderation: 0.9,
    navigation: Object.freeze({ autonomousUnknownTravel: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "volcanic",
      requiredObjects: Object.freeze([
        Object.freeze({ type: "resonant_basalt", count: 2, contextRole: "phen02ThermalGeology" }),
        Object.freeze({ type: "magnetic_ore", count: 2, contextRole: "phen02ThermalGeology" })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachVolcanic",
        title: "Rejoindre un nouveau territoire volcanique",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" })
      }),
      Object.freeze({
        slot: "scoutSurvey",
        title: "Faire relever trois signatures géologiques distinctes par le Scout",
        action: "observe",
        target: 3,
        requires: Object.freeze(["reachVolcanic"]),
        params: Object.freeze({
          cuoTypes: Object.freeze(["resonant_basalt", "magnetic_ore", "thermosap_moss"]),
          actor: "scout",
          distinctBy: "instanceId"
        })
      }),
      Object.freeze({
        slot: "bluefoxStudy",
        title: "Examiner l’élément géologique le plus significatif",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["scoutSurvey"]),
        params: Object.freeze({
          cuoTypes: Object.freeze(["resonant_basalt", "magnetic_ore"]),
          actor: "bluefox"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["La chaleur explique ce que je sens. Pas forcément ce que la roche raconte. Je vais laisser le Scout chercher les répétitions."]),
      completed: Object.freeze(["La chaleur est visible, mais la structure va plus profond. Ce territoire ne se résume pas à ce qui brûle en surface."])
    })
  });

  const PHEN03 = Object.freeze({
    id: "PHEN-03",
    title: "La mémoire du froid",
    description: "Comparer plusieurs matériaux dans un territoire froid afin de distinguer ce que le climat modifie de ce qu’il ne fait que préserver.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "PHEN-01", count: 1 }),
    prerequisites: Object.freeze(["PHEN-01"]),
    priority: 208,
    passivePriorityAxis: "research",
    concurrentAvailabilityGroup: "PHEN-01-OPPORTUNITIES",
    ponderation: 0.85,
    navigation: Object.freeze({ autonomousUnknownTravel: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "frozen",
      requiredObjects: Object.freeze([
        Object.freeze({ type: "azure_ferrite", count: 2, contextRole: "phen03FrozenSample" }),
        Object.freeze({ type: "magnetic_ore", count: 2, contextRole: "phen03FrozenSample" }),
        Object.freeze({ type: "crystal", count: 2, contextRole: "phen03FrozenSample" })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachFrozen",
        title: "Rejoindre un nouveau territoire froid",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" })
      }),
      Object.freeze({
        slot: "referenceCold",
        title: "Analyser un premier matériau dans le froid",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["reachFrozen"]),
        params: Object.freeze({
          cuoTypes: Object.freeze(["azure_ferrite", "magnetic_ore", "crystal", "thermosap_moss"]),
          actor: "bluefox",
          sequenceSlot: "referenceCold"
        })
      }),
      Object.freeze({
        slot: "compareCold",
        title: "Comparer deux autres matériaux différents",
        action: "analyze",
        target: 2,
        requires: Object.freeze(["referenceCold"]),
        params: Object.freeze({
          cuoTypes: Object.freeze(["azure_ferrite", "magnetic_ore", "crystal", "thermosap_moss"]),
          actorsAny: Object.freeze(["bluefox", "scout"]),
          distinctBy: "objectId",
          relation: Object.freeze({ fromSlot: "referenceCold", differentBy: Object.freeze(["objectId"]) })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le froid conserve des traces. Il peut aussi les déformer. Je dois comparer ce qui change réellement."]),
      completed: Object.freeze(["Le climat transforme la manifestation, pas forcément sa cause. Certaines traces étaient là avant le froid."])
    })
  });

  const PHEN04 = Object.freeze({
    id: "PHEN-04",
    title: "Une boussole affolée",
    description: "Utiliser la première map balisée comme point fixe et laisser le Scout mesurer un gradient magnétique local à plusieurs positions.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "PHEN-01", count: 1 }),
    prerequisites: Object.freeze(["PHEN-01", "BAL-03"]),
    priority: 211,
    passivePriorityAxis: "research",
    concurrentAvailabilityGroup: "PHEN-01-OPPORTUNITIES",
    ponderation: 0.95,
    sequence: Object.freeze([
      Object.freeze({
        slot: "fixedReference",
        title: "Contrôler un repère magnétique près de la balise",
        action: "analyze",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          cuoTypes: Object.freeze(["magnetic_ore", "resonant_basalt", "crystal"]),
          actor: "bluefox",
          requiredMapFact: "tutorialExcursion:BAL-03",
          requiredMapField: "generatedTargetMapId"
        })
      }),
      Object.freeze({
        slot: "gradient",
        title: "Obtenir trois relevés Scout distincts sur la map balisée",
        action: "observe",
        target: 3,
        requires: Object.freeze(["fixedReference"]),
        params: Object.freeze({
          cuoTypes: Object.freeze(["magnetic_ore", "resonant_basalt", "crystal"]),
          actor: "scout",
          distinctBy: "instanceId",
          requiredMapFact: "tutorialExcursion:BAL-03",
          requiredMapField: "generatedTargetMapId"
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["La balise me donne enfin un point fixe. Si les mesures changent autour d’elle, ce n’est plus une anomalie ponctuelle : c’est un gradient."]),
      completed: Object.freeze(["Les valeurs dérivent avec la position. Le champ est localisable, mesurable, et surtout pas uniforme."])
    })
  });

  const PHEN05 = Object.freeze({
    id: "PHEN-05",
    title: "Ce qui refuse de tomber",
    description: "Observer un ensemble suspendu puis faire reconnaître au Scout plusieurs éléments distincts afin de confirmer qu’il s’agit d’un phénomène structuré.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "PHEN-01", count: 1 }),
    prerequisites: Object.freeze(["PHEN-01"]),
    priority: 209,
    passivePriorityAxis: "exploration",
    concurrentAvailabilityGroup: "PHEN-01-OPPORTUNITIES",
    ponderation: 0.9,
    navigation: Object.freeze({ autonomousUnknownTravel: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "magnetic",
      requiredObjects: Object.freeze([Object.freeze({ type: "mobile_islet", count: 3, contextRole: "phen05SuspendedSet" })])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachSuspended",
        title: "Rejoindre un nouveau territoire magnétique",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" })
      }),
      Object.freeze({
        slot: "bluefoxObserve",
        title: "Observer personnellement un îlot suspendu",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachSuspended"]),
        params: Object.freeze({ cuoType: "mobile_islet", actor: "bluefox" })
      }),
      Object.freeze({
        slot: "scoutSet",
        title: "Faire reconnaître trois éléments suspendus distincts par le Scout",
        action: "observe",
        target: 3,
        requires: Object.freeze(["bluefoxObserve"]),
        params: Object.freeze({ cuoType: "mobile_islet", actor: "scout", distinctBy: "instanceId" })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Un rocher qui flotte est une curiosité. Plusieurs qui répondent au même endroit, c’est un système."]),
      completed: Object.freeze(["Ce n’est pas un accident isolé. La lévitation dessine une zone cohérente, presque une structure invisible."])
    })
  });

  const PHEN06 = Object.freeze({
    id: "PHEN-06",
    title: "L’orage sous l’orage",
    description: "Limiter l’exposition de BlueFox et laisser le Scout relever une tempête électrostatique avant d’en tirer une première interprétation énergétique.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "PHEN-01", count: 1 }),
    prerequisites: Object.freeze(["PHEN-01"]),
    priority: 212,
    passivePriorityAxis: "research",
    concurrentAvailabilityGroup: "PHEN-01-OPPORTUNITIES",
    ponderation: 1,
    navigation: Object.freeze({ autonomousUnknownTravel: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "electrical",
      requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-LOCAL-STORM-001", persistent: true, spawnOnce: true, contextRole: "phen06StormField" })])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachStorm",
        title: "Rejoindre un nouveau territoire électrique",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" })
      }),
      Object.freeze({
        slot: "scoutStorm",
        title: "Faire relever la tempête électrostatique par le Scout",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachStorm"]),
        params: Object.freeze({ cuoType: "electrostatic_storm", actor: "scout" })
      }),
      Object.freeze({
        slot: "interpret",
        title: "Interpréter le relevé énergétique",
        action: "research",
        target: 1,
        requires: Object.freeze(["scoutStorm"]),
        params: Object.freeze({})
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je n’ai aucune raison de mettre les pattes dans cette tempête si le Scout peut y aller pour moi. Je veux des données, pas une brûlure."]),
      completed: Object.freeze(["L’orage n’est que la partie visible. Les mesures suggèrent une circulation énergétique plus profonde dans cette zone."])
    })
  });



  const PHEN07 = Object.freeze({
    id: "PHEN-07",
    title: "Cristaux chargés",
    description: "Comparer deux sites de cristaux chargés sur des territoires distincts à l’aide de relevés Scout réels, tout en conservant la possibilité d’un relevé distant lorsqu’un site est déjà intégré au réseau balisé.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "PHEN-01", count: 1 }),
    prerequisites: Object.freeze(["PHEN-01"]),
    priority: 207,
    passivePriorityAxis: "research",
    concurrentAvailabilityGroup: "PHEN-01-OPPORTUNITIES",
    ponderation: 0.9,
    navigation: Object.freeze({ autonomousUnknownTravel: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({ id: "MSC-CHARGED-CRYSTALS-001", persistent: true, spawnOnce: true, contextRole: "phen07ChargedCrystalSite" })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachSite1",
        title: "Rejoindre un premier territoire de cristaux chargés",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId",
          completionArrivalFact: "phen07:site1",
          completionArrivalField: "mapId"
        })
      }),
      Object.freeze({
        slot: "scoutSite1",
        title: "Obtenir un relevé Scout du premier site",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachSite1"]),
        params: Object.freeze({
          cuoTypes: Object.freeze(["energy_crystal", "crystal"]),
          actor: "scout",
          distinctBy: "mapId",
          sequenceSlot: "scoutSite1",
          requiredMapFact: "phen07:site1",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "reachSite2",
        title: "Rejoindre un second territoire de cristaux chargés",
        action: "travel",
        target: 1,
        requires: Object.freeze(["scoutSite1"]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId",
          completionArrivalFact: "phen07:site2",
          completionArrivalField: "mapId"
        })
      }),
      Object.freeze({
        slot: "scoutSite2",
        title: "Obtenir un relevé Scout du second site",
        action: "observe",
        target: 1,
        requires: Object.freeze(["reachSite2"]),
        params: Object.freeze({
          cuoTypes: Object.freeze(["energy_crystal", "crystal"]),
          actor: "scout",
          distinctBy: "mapId",
          requiredMapFact: "phen07:site2",
          requiredMapField: "mapId",
          relation: Object.freeze({ fromSlot: "scoutSite1", differentBy: Object.freeze(["mapId"]) })
        })
      }),
      Object.freeze({
        slot: "compare",
        title: "Comparer les deux relevés de cristaux chargés",
        action: "research",
        target: 1,
        requires: Object.freeze(["scoutSite2"]),
        params: Object.freeze({})
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Un cristal chargé ne prouve rien à lui seul. Je veux voir si la même signature réapparaît ailleurs, avec le Scout comme mesure indépendante."]),
      completed: Object.freeze(["Deux territoires différents, deux relevés cohérents. La charge des cristaux appartient à une structure plus vaste que le site où je l’ai remarquée."])
    })
  });

  const PHEN08 = Object.freeze({
    id: "PHEN-08",
    title: "Trois points dans le monde",
    description: "Étendre le corpus scientifique à trois territoires distincts et obtenir trois relevés Scout distants réels, preuve que ces sites appartiennent effectivement au réseau balisé.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "PHEN-07", count: 1 }),
    prerequisites: Object.freeze(["PHEN-07", "BAL-03", "ENE-13"]),
    priority: 206,
    passivePriorityAxis: "research",
    ponderation: 1,
    navigation: Object.freeze({ autonomousUnknownTravel: true }),
    mapGeneration: Object.freeze({
      size: "random",
      biome: "random",
      requiredMicroScenes: Object.freeze([
        Object.freeze({ id: "MSC-CHARGED-CRYSTALS-001", persistent: true, spawnOnce: true, contextRole: "phen08ThirdScientificSite" })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "reachSite3",
        title: "Établir un troisième point scientifique sur un nouveau territoire",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          newOnly: true,
          distinctBy: "mapId",
          completionArrivalFact: "phen08:site3",
          completionArrivalField: "mapId"
        })
      }),
      Object.freeze({
        slot: "networkReadings",
        title: "Obtenir trois relevés Scout distants sur trois territoires distincts",
        action: "observe",
        target: 3,
        requires: Object.freeze(["reachSite3"]),
        params: Object.freeze({
          cuoTypes: Object.freeze(["energy_crystal", "crystal"]),
          actor: "scout",
          remote: true,
          distinctBy: "mapId"
        })
      }),
      Object.freeze({
        slot: "synthesis",
        title: "Relier les trois points du réseau scientifique",
        action: "research",
        target: 1,
        requires: Object.freeze(["networkReadings"]),
        params: Object.freeze({})
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Deux sites peuvent encore être une coïncidence. Trois points distants reliés par le Scout et les balises commencent à dessiner un réseau."]),
      completed: Object.freeze(["Trois territoires séparés répondent au même protocole. Je n’ai plus une collection d’anomalies : j’ai un réseau scientifique."])
    })
  });

  const PHEN09 = Object.freeze({
    id: "PHEN-09",
    title: "Les anomalies se répondent",
    description: "Revenir physiquement sur deux anciens sites scientifiques, y refaire des relevés et comparer ce que les mesures actuelles révèlent du même phénomène.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "PHEN-08", count: 1 }),
    prerequisites: Object.freeze(["PHEN-08"]),
    priority: 205,
    passivePriorityAxis: "research",
    concurrentAvailabilityGroup: "PHEN-08-SYNTHESIS",
    ponderation: 0.95,
    sequence: Object.freeze([
      Object.freeze({
        slot: "returnSite1",
        title: "Revenir au premier site de cristaux chargés",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          targetMapFact: "phen07:site1",
          targetMapField: "mapId",
          distinctBy: "transition"
        })
      }),
      Object.freeze({
        slot: "remeasureSite1",
        title: "Refaire un relevé sur le premier site",
        action: "observe",
        target: 1,
        requires: Object.freeze(["returnSite1"]),
        params: Object.freeze({
          cuoTypes: Object.freeze(["energy_crystal", "crystal"]),
          actorsAny: Object.freeze(["bluefox", "scout"]),
          requiredMapFact: "phen07:site1",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "returnSite2",
        title: "Revenir au second site de cristaux chargés",
        action: "travel",
        target: 1,
        requires: Object.freeze(["remeasureSite1"]),
        params: Object.freeze({
          eventDriven: true,
          targetMapFact: "phen07:site2",
          targetMapField: "mapId",
          distinctBy: "transition"
        })
      }),
      Object.freeze({
        slot: "remeasureSite2",
        title: "Refaire un relevé sur le second site",
        action: "observe",
        target: 1,
        requires: Object.freeze(["returnSite2"]),
        params: Object.freeze({
          cuoTypes: Object.freeze(["energy_crystal", "crystal"]),
          actorsAny: Object.freeze(["bluefox", "scout"]),
          requiredMapFact: "phen07:site2",
          requiredMapField: "mapId"
        })
      }),
      Object.freeze({
        slot: "compareHistory",
        title: "Comparer les anciens sites à la lumière des nouvelles mesures",
        action: "research",
        target: 1,
        requires: Object.freeze(["remeasureSite2"]),
        params: Object.freeze({})
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je connais déjà ces endroits. C’est justement pour ça que je dois y retourner : une mesure prend un autre sens quand elle survit au temps et à la comparaison."]),
      completed: Object.freeze(["Les sites n’ont pas cessé d’être eux-mêmes, mais ma lecture a changé. Les anomalies se répondent parce qu’elles appartiennent au même monde, pas parce qu’elles se ressemblent par hasard."])
    })
  });

  const PHEN10 = Object.freeze({
    id: "PHEN-10",
    title: "Sous mes pattes",
    description: "Ramener les observations au laboratoire de terrain, consommer de vrais échantillons et confronter les mesures multi-sites à une expérimentation contrôlée.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "PHEN-08", count: 1 }),
    prerequisites: Object.freeze(["PHEN-08"]),
    priority: 204,
    passivePriorityAxis: "research",
    concurrentAvailabilityGroup: "PHEN-08-SYNTHESIS",
    ponderation: 0.95,
    sequence: Object.freeze([
      Object.freeze({
        slot: "prepare",
        title: "Préparer une comparaison expérimentale à l’établi",
        action: "research",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ eventDriven: true, catalogManaged: true })
      }),
      Object.freeze({
        slot: "experiment",
        title: "Tester ensemble les matériaux représentatifs du réseau",
        action: "research",
        target: 1,
        requires: Object.freeze(["prepare"]),
        params: Object.freeze({})
      })
    ]),
    proximityContexts: Object.freeze([
      Object.freeze({
        id: "phen10-workbench",
        microSceneId: "MSC-CUSTOM-ETABLI-VIDE",
        fact: "phen10:workbench:v1",
        slot: "prepare",
        radius: 8
      }),
      Object.freeze({
        id: "phen10-experiment",
        microSceneId: "MSC-CUSTOM-ETABLI-VIDE",
        fact: "phen10:experiment:v1",
        slot: "experiment",
        radius: 8,
        inventoryConsume: Object.freeze({
          inventoryKeys: Object.freeze(["energy_crystal", "crystal", "magnetic_ore", "resonant_basalt"]),
          quantity: 6,
          missingMessage: "Il me faut six échantillons minéraux ou cristallins réels avant de comparer les signatures du réseau."
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["J’ai accumulé assez de mesures. Il faut maintenant quitter le terrain un instant et vérifier ce que ces signatures font quand je contrôle les conditions."]),
      completed: Object.freeze(["Sous mes pattes, les échantillons reproduisent une partie de ce que le Scout a mesuré à distance. Le réseau n’est pas seulement géographique : il est aussi matériel."])
    })
  });

  const PHEN11 = Object.freeze({
    id: "PHEN-11",
    title: "Atlas des phénomènes",
    description: "Synthétiser le réseau scientifique, les retours sur anciens sites et l’expérimentation en une connaissance persistante de la planète, sans devenir un prérequis de la chaîne ENE.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "PHEN-10", count: 1 }),
    prerequisites: Object.freeze(["PHEN-09", "PHEN-10"]),
    priority: 203,
    passivePriorityAxis: "research",
    ponderation: 1,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 72,
    sequence: Object.freeze([
      Object.freeze({
        slot: "review",
        title: "Relire le corpus scientifique multi-sites",
        action: "research",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({})
      }),
      Object.freeze({
        slot: "atlas",
        title: "Synthétiser l’Atlas des phénomènes planétaires",
        action: "research",
        target: 1,
        requires: Object.freeze(["review"]),
        params: Object.freeze({})
      })
    ]),
    rewards: Object.freeze([
      Object.freeze({
        type: "research.knowledge",
        id: "planetary_phenomena_atlas",
        category: "research",
        label: "Atlas des phénomènes planétaires",
        description: "Corpus synthétique reliant les phénomènes observés, les sites scientifiques persistants, les relevés Scout et les comparaisons expérimentales."
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["J’ai assez de points, assez de retours et assez d’essais pour arrêter de penser en anomalies séparées. Il est temps d’écrire une carte de ce que la planète fait."]),
      progress: Object.freeze([
        Object.freeze({
          slot: "atlas",
          atCount: 1,
          route: "journal",
          text: "L’Atlas relie désormais les phénomènes géologiques, climatiques et énergétiques étudiés sans effacer leurs différences locales."
        })
      ]),
      completed: Object.freeze(["L’Atlas n’explique pas tout. Il fait mieux : il me montre ce que je sais vraiment, ce qui se répète, et ce qui reste encore à comprendre."])
    })
  });


  // PROS — prospection, optimisation du réseau Harvest puis récupération technologique.
  // L'arc réutilise exclusivement la géologie, le réseau drone et SAME-INSTANCE existants.
  const PROS01 = Object.freeze({
    id: "PROS-01",
    title: "Le filon caché de la faille sèche",
    description: "Prospecter une faille basaltique, comparer plusieurs matériaux puis prélever réellement l'échantillon résonant identifié sans introduire de filon ou de minerai fictif.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", direction: "south", count: 1, uniqueOnly: true }),
    bindActivationMap: true,
    triggerOnly: true,
    priority: 189,
    passivePriorityAxis: "collection",
    ponderation: 0.9,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 32,
    mapGeneration: Object.freeze({
      requiredMicroScenes: Object.freeze([
        Object.freeze({ id: "MSC-CUSTOM-BASALT-RIFT", persistent: true, spawnOnce: true, contextRole: "pros01DryRift" })
      ]),
      requiredObjects: Object.freeze([
        Object.freeze({ type: "resonant_basalt", count: 1 })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "explore", title: "Explorer 35 % de la zone de faille", action: "explore-zone", target: 35, params: Object.freeze({ scope: "map", metric: "surfacePercent", threshold: 35, requiredMapFact: "bibleActivation:PROS-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "compare", title: "Comparer deux matériaux distincts de la faille", action: "analyze", target: 2, requires: Object.freeze(["explore"]), params: Object.freeze({ cuoTypes: Object.freeze(["resonant_basalt", "strong_rock", "large_rock", "needle"]), distinctBy: "cuoType", requiredMapFact: "bibleActivation:PROS-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "resonance", title: "Caractériser un basalte résonant du filon", action: "analyze", target: 1, requires: Object.freeze(["compare"]), params: Object.freeze({ cuoType: "resonant_basalt", microSceneId: "MSC-CUSTOM-BASALT-RIFT", requiredMapFact: "bibleActivation:PROS-01", requiredMapField: "mapId" }) }),
      Object.freeze({
        slot: "sample",
        title: "Prélever ce même échantillon résonant",
        action: "collect",
        target: 1,
        requires: Object.freeze(["resonance"]),
        params: Object.freeze({
          cuoType: "resonant_basalt",
          microSceneId: "MSC-CUSTOM-BASALT-RIFT",
          requiredMapFact: "bibleActivation:PROS-01",
          requiredMapField: "mapId",
          relation: Object.freeze({
            fromSlot: "resonance",
            sameBy: Object.freeze(["instanceId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cette faille concentre plusieurs matériaux dans un espace très étroit. Je veux comprendre lequel porte réellement la signature la plus intéressante."]),
      completed: Object.freeze(["Le basalte résonant n'est pas seulement présent ici : j'ai isolé un échantillon dont le comportement mérite d'être exploité dans mon réseau technique."])
    })
  });

  const PROS03 = Object.freeze({
    id: "PROS-03",
    title: "L'optimisation du réseau de drones",
    description: "Utiliser l'échantillon et des ressources réelles pour optimiser un réseau Harvest dont le cycle déploiement, collecte et dépôt a déjà été validé par DRN-04, sans recréer ce cycle dans cette mission.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "PROS-01", count: 1 }),
    prerequisites: Object.freeze(["PROS-01", "DRN-04"]),
    priority: 188,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 62,
    sequence: Object.freeze([
      Object.freeze({ slot: "workbench", title: "Revenir à l'infrastructure pour préparer l'optimisation Harvest", action: "research", target: 1, params: Object.freeze({ eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "optimize", title: "Consacrer les matériaux à l'optimisation du réseau", action: "research", target: 1, requires: Object.freeze(["workbench"]), params: Object.freeze({
        requiresShelter: true,
        inventoryConsume: Object.freeze([
          Object.freeze({ inventoryKey: "magnetic_ore", quantity: 20 }),
          Object.freeze({ inventoryKey: "crystal", quantity: 10 }),
          Object.freeze({ inventoryKey: "parts", quantity: 5 })
        ])
      }) })
    ]),
    proximityContexts: Object.freeze([
      Object.freeze({ id: "pros03-workbench", microSceneId: "MSC-CUSTOM-ETABLI-VIDE", fact: "pros03:workbench:v1", slot: "workbench", radius: 8 })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le réseau Harvest sait déjà se déployer, collecter et déposer son cargo. Je veux maintenant utiliser les matériaux mieux caractérisés de la faille pour améliorer cette infrastructure sans réinventer son fonctionnement."]),
      completed: Object.freeze(["L'optimisation est intégrée au réseau existant. Le cycle Harvest reste celui déjà validé : déploiement, collecte et dépôt conservent leurs propriétaires actuels."])
    })
  });

  const PROS02 = Object.freeze({
    id: "PROS-02",
    title: "Récupération du module ancien",
    description: "Étudier un relais technologique abandonné puis récupérer exactement le module préalablement observé, sans introduire de mécanique de furtivité ou de vol.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", direction: "east", count: 1, uniqueOnly: true }),
    prerequisites: Object.freeze(["PROS-03"]),
    bindActivationMap: true,
    triggerOnly: true,
    priority: 187,
    passivePriorityAxis: "research",
    ponderation: 0.9,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 42,
    mapGeneration: Object.freeze({
      requiredMicroScenes: Object.freeze([
        Object.freeze({ id: "MSC-CUSTOM-COMPOSANT-RUIN", persistent: true, spawnOnce: true, contextRole: "pros02AncientRelay" })
      ]),
      requiredObjects: Object.freeze([
        Object.freeze({ type: "relay_block", count: 1 })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "explore", title: "Explorer 35 % du site technologique ancien", action: "explore-zone", target: 35, params: Object.freeze({ scope: "map", metric: "surfacePercent", threshold: 35, requiredMapFact: "bibleActivation:PROS-02", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "observeModule", title: "Observer un module intact dans la ruine", action: "observe", target: 1, requires: Object.freeze(["explore"]), params: Object.freeze({ cuoType: "relay_block", microSceneId: "MSC-CUSTOM-COMPOSANT-RUIN", requiredMapFact: "bibleActivation:PROS-02", requiredMapField: "mapId" }) }),
      Object.freeze({
        slot: "collectModule",
        title: "Récupérer exactement ce même module",
        action: "collect",
        target: 1,
        requires: Object.freeze(["observeModule"]),
        params: Object.freeze({
          cuoType: "relay_block",
          microSceneId: "MSC-CUSTOM-COMPOSANT-RUIN",
          requiredMapFact: "bibleActivation:PROS-02",
          requiredMapField: "mapId",
          relation: Object.freeze({
            fromSlot: "observeModule",
            sameBy: Object.freeze(["instanceId"])
          })
        })
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Ce relais semble abandonné, mais certains modules sont encore intacts. Je vais d'abord documenter celui que je veux récupérer plutôt que démonter le site au hasard."]),
      completed: Object.freeze(["J'ai récupéré exactement le module que j'avais étudié. Son contexte reste documenté, et je n'ai eu besoin ni de vol ni d'une mécanique de furtivité artificielle."])
    })
  });


  const POSTDIP01 = Object.freeze({
    id: "POSTDIP-01",
    title: "Les anciens avaient raison",
    description: "Relire une ancienne mesure à la lumière du savoir partagé et du réseau énergétique, avec une voie PHEN facultative qui permet de revenir sur un site scientifique réellement étudié sans rendre PHEN obligatoire.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "ENE-15-C", count: 1 }),
    prerequisites: Object.freeze(["ENE-15-C", "DIP-03", "ENE-14"]),
    requiredFacts: Object.freeze(["shared_civilization_knowledge"]),
    priority: 202,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 96,
    sequence: Object.freeze([
      Object.freeze({
        slot: "returnTemple",
        title: "Revenir au Temple des savoirs",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ eventDriven: true, targetMapFact: "dip03:temple-map", targetMapField: "mapId", distinctBy: "transition" })
      }),
      Object.freeze({
        slot: "reread",
        title: "Réexaminer la technologie ancienne avec les connaissances nouvelles",
        action: "analyze",
        target: 1,
        requires: Object.freeze(["returnTemple"]),
        params: Object.freeze({ cuoType: "tech_relic", microSceneId: "MSC-CUSTOM-HUGE-TEMPLE", requiredMapFact: "dip03:temple-map", requiredMapField: "mapId" })
      }),
      Object.freeze({
        slot: "phenReturn",
        title: "Revenir sur un ancien site PHEN déjà mesuré",
        action: "travel",
        target: 1,
        optional: true,
        requires: Object.freeze(["reread"]),
        params: Object.freeze({ eventDriven: true, targetMapFact: "phen07:site1", targetMapField: "mapId", distinctBy: "transition" })
      }),
      Object.freeze({
        slot: "phenScout",
        title: "Demander au Scout un nouveau relevé du site PHEN",
        action: "observe",
        target: 1,
        optional: true,
        requires: Object.freeze(["phenReturn"]),
        params: Object.freeze({ actor: "scout", cuoTypes: Object.freeze(["energy_crystal", "crystal"]), requiredMapFact: "phen07:site1", requiredMapField: "mapId" })
      }),
      Object.freeze({
        slot: "phenCompare",
        title: "Comparer le nouveau relevé aux mesures historiques",
        action: "research",
        target: 1,
        optional: true,
        requires: Object.freeze(["phenScout"]),
        params: Object.freeze({})
      }),
      Object.freeze({
        slot: "conclusion",
        title: "Reformuler ce que les Anciens savaient réellement lire",
        action: "research",
        target: 1,
        requires: Object.freeze(["reread"]),
        params: Object.freeze({})
      })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je pensais avoir déjà compris ce réseau. Les archives partagées disent surtout que j'avais compris trop tôt."]),
      progress: Object.freeze([Object.freeze({ slot: "conclusion", atCount: 1, text: "Je croyais avoir mal mesuré. Non. Les mesures étaient bonnes. C'est ce que j'en avais conclu qui était trop simple. Les Anciens lisaient quelque chose que je ne savais pas encore voir." })]),
      completed: Object.freeze(["Les anciennes mesures n'étaient pas fausses. Elles attendaient simplement le bon cadre pour devenir lisibles."])
    })
  });

  const TP01 = Object.freeze({
    id: "TP-01",
    title: "Deux moitiés d’une même idée",
    description: "Rapprocher la recherche sur le transfert de matière des deux Blueprints civilisationnels déjà acquis et de l'hypothèse persistante qui n'était jusque-là qu'une possibilité théorique.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "POSTDIP-01", count: 1 }),
    prerequisites: Object.freeze(["POSTDIP-01", "ENE-15-C"]),
    requiredFacts: Object.freeze(["civilization:research:teleport-hypothesis-v1"]),
    priority: 201,
    passivePriorityAxis: "engineering",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 102,
    sequence: Object.freeze([
      Object.freeze({ slot: "compare", title: "Comparer les deux technologies civilisationnelles", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({}) }),
      Object.freeze({ slot: "join", title: "Relier stabilisation géographique et fragmentation-recomposition", action: "research", target: 1, requires: Object.freeze(["compare"]), params: Object.freeze({}) })
    ]),
    rewards: Object.freeze([Object.freeze({
      type: "research.knowledge",
      id: "teleport_combined_principle",
      category: "engineering",
      label: "Principe combiné de téléportation",
      description: "Associer le marquage géographique quantique à la fragmentation-recomposition sans encore débloquer un téléporteur opérationnel."
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Les deux peuples ne m'ont pas donné un téléporteur. Ils m'ont donné deux moitiés qui n'avaient jamais été pensées ensemble."]),
      completed: Object.freeze(["La position peut être stabilisée pendant que la matière est fragmentée puis reconstruite. L'idée tient enfin debout. Pas encore la machine."])
    })
  });

  const TP02 = Object.freeze({
    id: "TP-02",
    title: "Fixer une position",
    description: "Vérifier qu'une position balisée peut être relue à distance de manière reproductible par le Scout avant toute tentative de transfert matériel.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-01", count: 1 }),
    prerequisites: Object.freeze(["TP-01", "BAL-03", "DRN-01"]),
    priority: 200,
    passivePriorityAxis: "engineering",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({ slot: "remoteReadings", title: "Obtenir deux relevés Scout distants depuis une même position balisée", action: "observe", target: 2, requires: Object.freeze([]), params: Object.freeze({ actor: "scout", remote: true, distinctBy: "instanceId" }) }),
      Object.freeze({ slot: "stabilize", title: "Formaliser le repère spatial stable", action: "research", target: 1, requires: Object.freeze(["remoteReadings"]), params: Object.freeze({}) })
    ]),
    rewards: Object.freeze([Object.freeze({ type: "research.knowledge", id: "teleport_position_fix", category: "engineering", label: "Position quantiquement fixée", description: "Une balise et des relevés Scout distants fournissent un repère suffisamment stable pour poursuivre les essais." })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Avant de déplacer quoi que ce soit, je dois être certain que l'autre point reste exactement le même quand je ne le regarde plus."]),
      completed: Object.freeze(["Le Scout retrouve la même position à distance. Pour la première fois, le problème n'est plus de savoir où envoyer la matière."])
    })
  });

  const TP03 = Object.freeze({
    id: "TP-03",
    title: "Défaire sans perdre",
    description: "Tester sur de la matière inerte une fragmentation suivie d'une recomposition contrôlée à l'établi, avec consommation réelle d'échantillons.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-02", count: 1 }),
    prerequisites: Object.freeze(["TP-02"]),
    priority: 199,
    passivePriorityAxis: "engineering",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({ slot: "prepare", title: "Préparer les échantillons inertes", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({}) }),
      Object.freeze({ slot: "experiment", title: "Fragmenter puis recomposer les échantillons", action: "research", target: 1, requires: Object.freeze(["prepare"]), params: Object.freeze({ catalogManaged: true }) })
    ]),
    proximityContexts: Object.freeze([Object.freeze({
      id: "tp03-workbench-experiment",
      microSceneId: "MSC-CUSTOM-ETABLI-VIDE",
      fact: "tp03:experiment:v1",
      slot: "experiment",
      radius: 8,
      inventoryConsume: Object.freeze({ inventoryKeys: Object.freeze(["crystal", "magnetic_ore", "resonant_basalt", "azure_ferrite"]), quantity: 3, missingMessage: "Il me faut trois échantillons minéraux ou cristallins réels pour cet essai." })
    })]),
    rewards: Object.freeze([Object.freeze({ type: "research.knowledge", id: "controlled_matter_recomposition", category: "engineering", label: "Recomposition matérielle contrôlée", description: "Fragmenter puis recomposer une petite quantité de matière inerte dans des conditions contrôlées." })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Déplacer de la matière n'a aucun sens si je ne peux pas d'abord la défaire sans perdre ce qui la définit."]),
      completed: Object.freeze(["Les échantillons ont été sacrifiés pour l'essai, mais la structure recomposée reste cohérente. Je peux maintenant travailler sur la distance."])
    })
  });

  const TP04 = Object.freeze({
    id: "TP-04",
    title: "Entre deux points",
    description: "Réaliser un premier transfert très court de matière inerte entre deux points contrôlés de l'établi, sans déplacer BlueFox.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-03", count: 1 }),
    prerequisites: Object.freeze(["TP-03"]),
    priority: 198,
    passivePriorityAxis: "engineering",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({ slot: "shortTransfer", title: "Effectuer un transfert matériel à très courte portée", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "verify", title: "Vérifier la cohérence de la matière recomposée", action: "research", target: 1, requires: Object.freeze(["shortTransfer"]), params: Object.freeze({}) })
    ]),
    proximityContexts: Object.freeze([Object.freeze({
      id: "tp04-workbench-transfer",
      microSceneId: "MSC-CUSTOM-ETABLI-VIDE",
      fact: "tp04:shortTransfer:v1",
      slot: "shortTransfer",
      radius: 8,
      inventoryConsume: Object.freeze({ inventoryKeys: Object.freeze(["crystal", "magnetic_ore", "resonant_basalt", "azure_ferrite"]), quantity: 4, missingMessage: "Il me faut quatre échantillons inertes pour mesurer les pertes du premier transfert." })
    })]),
    rewards: Object.freeze([Object.freeze({ type: "research.knowledge", id: "short_range_matter_transfer", category: "engineering", label: "Transfert matériel à courte portée", description: "Transférer une faible quantité de matière entre deux points proches sans transporter BlueFox." })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Quelques centimètres suffisent. Si ça échoue ici, la distance ne fera qu'empirer les choses."]),
      completed: Object.freeze(["La matière a franchi l'écart sans que je bouge. Ce n'est encore qu'un essai de paillasse, mais c'est un vrai transfert."])
    })
  });

  const TP05 = Object.freeze({
    id: "TP-05",
    title: "Plus loin que l’établi",
    description: "Préparer un relais matériel réel sur une nouvelle map, laisser le Scout sur ce site balisé, revenir à l'établi puis faire confirmer à distance la signature du transfert par le Scout.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-04", count: 1 }),
    prerequisites: Object.freeze(["TP-04", "BAL-03", "DRN-01"]),
    priority: 197,
    passivePriorityAxis: "engineering",
    ponderation: 1,
    navigation: Object.freeze({ autonomousUnknownTravel: true }),
    mapGeneration: Object.freeze({
      requiredMicroScenes: Object.freeze([Object.freeze({ id: "MSC-CUSTOM-COMPOSANT-RUIN", persistent: true, spawnOnce: true, contextRole: "tp05RemoteReceiver" })])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reachReceiver", title: "Rejoindre un nouveau site pour le récepteur distant", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", completionArrivalFact: "tp05:receiverMap", completionArrivalField: "mapId" }) }),
      Object.freeze({ slot: "prepareReceiver", title: "Préparer le relais comme récepteur expérimental", action: "research", target: 1, requires: Object.freeze(["reachReceiver"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "returnWorkbench", title: "Revenir à l'établi sans rappeler le Scout", action: "travel", target: 1, requires: Object.freeze(["prepareReceiver"]), params: Object.freeze({ eventDriven: true, toMapId: "crystal", distinctBy: "transition" }) }),
      Object.freeze({ slot: "transfer", title: "Envoyer un échantillon vers le récepteur distant", action: "research", target: 1, requires: Object.freeze(["returnWorkbench"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "remoteWitness", title: "Faire confirmer le transfert par le Scout distant", action: "observe", target: 1, requires: Object.freeze(["transfer"]), params: Object.freeze({ cuoType: "relay_block", actor: "scout", remote: true, requiredMapFact: "tp05:receiverMap", requiredMapField: "mapId" }) })
    ]),
    proximityContexts: Object.freeze([
      Object.freeze({ id: "tp05-receiver-proximity", microSceneId: "MSC-CUSTOM-COMPOSANT-RUIN", fact: "tp05:receiverPrepared:v1", slot: "prepareReceiver", radius: 6 }),
      Object.freeze({ id: "tp05-workbench-transfer", microSceneId: "MSC-CUSTOM-ETABLI-VIDE", fact: "tp05:transfer:v1", slot: "transfer", radius: 8, inventoryConsume: Object.freeze({ inventoryKeys: Object.freeze(["crystal", "magnetic_ore", "resonant_basalt", "azure_ferrite"]), quantity: 5, missingMessage: "Il me faut cinq échantillons inertes pour tenter le transfert distant." }) })
    ]),
    rewards: Object.freeze([Object.freeze({ type: "research.knowledge", id: "remote_matter_transfer_witnessed", category: "engineering", label: "Transfert distant confirmé", description: "Un Scout resté sur une map balisée confirme à distance la signature du récepteur après un transfert lancé depuis l'établi." })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["La distance n'est plus une idée. Je vais laisser le Scout de l'autre côté et lui demander de me dire ce qui arrive vraiment."]),
      completed: Object.freeze(["Le Scout confirme la signature du relais après l'essai. La matière peut franchir plus que la largeur de mon établi."])
    })
  });

  const TP06 = Object.freeze({
    id: "TP-06",
    title: "Un téléporteur, pas un portail",
    description: "Formaliser une architecture hub-and-spoke : un futur téléporteur central et des balises distantes légères, sans autoriser de transfert balise-vers-balise.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-05", count: 1 }),
    prerequisites: Object.freeze(["TP-05"]),
    priority: 196,
    passivePriorityAxis: "engineering",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({ slot: "architecture", title: "Séparer le hub central des ancrages distants", action: "research", target: 1, requires: Object.freeze([]), params: Object.freeze({}) }),
      Object.freeze({ slot: "safety", title: "Exclure explicitement les transferts balise-vers-balise", action: "research", target: 1, requires: Object.freeze(["architecture"]), params: Object.freeze({}) })
    ]),
    rewards: Object.freeze([Object.freeze({ type: "research.knowledge", id: "teleport_hub_spoke_architecture", category: "engineering", label: "Architecture téléporteur–balises", description: "Un hub central unique dessert des balises distantes ; les balises ne se téléportent jamais directement entre elles." })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Si chaque balise devient un portail complet, je construis un réseau impossible à stabiliser. Il faut un centre et des points d'ancrage."]),
      completed: Object.freeze(["Un seul hub. Des balises comme coordonnées distantes. Aucun passage direct d'une balise à une autre. L'architecture est enfin claire."])
    })
  });

  const TP07 = Object.freeze({
    id: "TP-07",
    title: "Un lieu assez stable",
    description: "Choisir un nouveau territoire compatible pour le futur hub, l'explorer réellement puis conserver cette map comme site d'implantation. L'Atlas PHEN peut enrichir l'interprétation mais n'est pas requis.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-06", count: 1 }),
    prerequisites: Object.freeze(["TP-06"]),
    priority: 195,
    passivePriorityAxis: "exploration",
    ponderation: 1,
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reach", title: "Découvrir un territoire candidat", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", completionArrivalFact: "tp07:hubSite", completionArrivalField: "mapId" }) }),
      Object.freeze({ slot: "explore", title: "Explorer au moins 25 % du site candidat", action: "explore-zone", target: 25, requires: Object.freeze(["reach"]), params: Object.freeze({ scope: "map", metric: "surfacePercent", threshold: 25, requiredMapFact: "tp07:hubSite", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "validate", title: "Valider la stabilité du futur site", action: "research", target: 1, requires: Object.freeze(["explore"]), params: Object.freeze({ requiredMapFact: "tp07:hubSite", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je ne cherche pas seulement de la place. Il faut un endroit que le réseau lui-même ne cherchera pas à déformer."]),
      completed: Object.freeze(["Ce territoire est assez stable et assez accessible pour devenir mon point fixe. Je garde cette position."])
    })
  });

  const TP08 = Object.freeze({
    id: "TP-08",
    title: "Le point fixe",
    description: "Revenir sur le site choisi et placer manuellement la MSC ASTROLOGY comme fondation unique et persistante du futur téléporteur.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-07", count: 1 }),
    prerequisites: Object.freeze(["TP-07"]),
    priority: 194,
    passivePriorityAxis: "engineering",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({ slot: "returnHub", title: "Revenir sur le site retenu", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, targetMapFact: "tp07:hubSite", targetMapField: "mapId", distinctBy: "transition" }) }),
      Object.freeze({ slot: "placeAnchor", title: "Placer manuellement le point fixe ASTROLOGY", action: "research", target: 1, requires: Object.freeze(["returnHub"]), params: Object.freeze({ catalogManaged: true }) })
    ]),
    persistentWorldScenes: Object.freeze([Object.freeze({
      requiredMapFact: "tp07:hubSite",
      requiredMapField: "mapId",
      instanceId: "TP-08:teleporter-anchor:primary",
      microSceneId: "MSC-CUSTOM-ASTROLOGY",
      kind: "teleporter_site",
      contextRole: "teleporter_anchor",
      requiresSlotComplete: "returnHub",
      progressSlotWhenResolved: "placeAnchor",
      placement: Object.freeze({ mode: "player", label: "le point fixe" }),
      persistent: true,
      spawnOnce: true
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["La théorie a besoin d'un endroit réel. Je vais choisir moi-même où poser ce point fixe ; il ne doit pas apparaître tout seul au milieu du terrain."]),
      completed: Object.freeze(["ASTROLOGY est ancrée à l'endroit choisi. Ce n'est pas encore un téléporteur, mais le futur hub a maintenant un lieu réel et persistant."])
    })
  });

  const TP09 = Object.freeze({
    id: "TP-09",
    title: "Ce que coûte un passage",
    description: "Vérifier un réseau réel de quatre maps balisées par des relevés Scout distants et réunir le stock physique nécessaire au futur assemblage sans consommer les balises comme de simples ressources.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-08", count: 1 }),
    prerequisites: Object.freeze(["TP-08"]),
    priority: 193,
    passivePriorityAxis: "logistics",
    ponderation: 1,
    sequence: Object.freeze([
      Object.freeze({ slot: "networkProof", title: "Confirmer quatre maps balisées par le Scout distant", action: "observe", target: 4, requires: Object.freeze([]), params: Object.freeze({ actor: "scout", remote: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "minerals", title: "Disposer d'au moins 100 unités de minerais et cristaux", action: "research", target: 100, requires: Object.freeze(["networkProof"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "rareMinerals", title: "Disposer d'au moins 30 unités de matériaux énergétiques ou rares", action: "research", target: 30, requires: Object.freeze(["networkProof"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "parts", title: "Disposer de 50 composants", action: "research", target: 50, requires: Object.freeze(["networkProof"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "cores", title: "Disposer de 20 cores", action: "research", target: 20, requires: Object.freeze(["networkProof"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "fibers", title: "Disposer de 100 fibres", action: "research", target: 100, requires: Object.freeze(["networkProof"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "accumulators", title: "Disposer de 10 accumulateurs", action: "research", target: 10, requires: Object.freeze(["networkProof"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "plantBiocapital", title: "Disposer de 50 unités de biocapital végétal Thermosève/fluorescent", action: "research", target: 50, requires: Object.freeze(["networkProof"]), params: Object.freeze({ catalogManaged: true }) }),
      Object.freeze({ slot: "costSynthesis", title: "Verrouiller le contrat matériel du futur passage", action: "research", target: 1, requires: Object.freeze(["minerals", "rareMinerals", "parts", "cores", "fibers", "accumulators", "plantBiocapital"]), params: Object.freeze({}) })
    ]),
    stockBackedSlots: Object.freeze([
      Object.freeze({ slot: "minerals", inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium", "crystal", "energy_crystal"]), maximum: 100 }),
      Object.freeze({ slot: "rareMinerals", inventoryKeys: Object.freeze(["stellar_iridium", "energy_crystal"]), maximum: 30 }),
      Object.freeze({ slot: "parts", inventoryKey: "parts", maximum: 50 }),
      Object.freeze({ slot: "cores", inventoryKey: "core", maximum: 20 }),
      Object.freeze({ slot: "fibers", inventoryKey: "fiber", maximum: 100 }),
      Object.freeze({ slot: "accumulators", inventoryKey: "accumulator", maximum: 10 }),
      Object.freeze({ slot: "plantBiocapital", inventoryKey: "biocapital", maximum: 50 })
    ]),
    rewards: Object.freeze([Object.freeze({ type: "research.knowledge", id: "teleporter_material_contract", category: "engineering", label: "Contrat matériel du téléporteur", description: "Le réseau de quatre balises reste déployé ; le futur assemblage exige au moins 100 minerais/cristaux, 30 matériaux énergétiques ou rares, 50 composants, 20 cores, 100 fibres, 10 accumulateurs et 50 unités de biocapital végétal. Aucune biomasse adaptative n'est requise." })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le réseau existe. Maintenant je dois regarder le coût en face : un passage stable ne se construira pas avec trois morceaux de métal et une bonne idée."]),
      completed: Object.freeze(["Quatre points balisés répondent, et le stock nécessaire est enfin réuni. Les balises restent en place : elles sont le réseau, pas des pièces à démonter."])
    })
  });

  // OPP — Opportunités MSC. Data-only: activation strictly follows a real featured MSC.
  const OPPCIV01 = Object.freeze({
    id:"OPP-CIV-01", title:"Quelqu’un entre les arbres",
    description:"Une silhouette réelle aperçue entre les arbres disparaît avant tout contact ; BlueFox examine ensuite les traces laissées sur place.",
    pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-SHADOW-TRANSLUCENT"])}),
    prerequisites:Object.freeze(["T13"]), bindActivationMap:true, priority:219, passivePriorityAxis:"exploration", ponderation:1.5,
    autoPrimaryEligible:true, obsessionEligible:false,
    sequence:Object.freeze([
      Object.freeze({slot:"presence",title:"Repérer la silhouette sans chercher le contact",action:"observe",target:1,params:Object.freeze({eventDriven:true,catalogManaged:true})}),
      Object.freeze({slot:"approach",title:"Approcher l’endroit où elle se tenait",action:"observe",target:1,requires:Object.freeze(["presence"]),params:Object.freeze({eventDriven:true,catalogManaged:true})}),
      Object.freeze({slot:"traces",title:"Observer deux traces récentes dans la végétation",action:"observe",target:2,requires:Object.freeze(["approach"]),params:Object.freeze({cuoType:"fiber",microSceneId:"MSC-CUSTOM-SHADOW-TRANSLUCENT",distinctBy:"instanceId",requiredMapFact:"bibleActivation:OPP-CIV-01",requiredMapField:"mapId"})})
    ]),
    proximityContexts:Object.freeze([
      Object.freeze({id:"opp-civ01-presence",slot:"presence",microSceneId:"MSC-CUSTOM-SHADOW-TRANSLUCENT",radius:16,requiredMapFact:"bibleActivation:OPP-CIV-01",requiredMapField:"mapId"}),
      Object.freeze({id:"opp-civ01-approach",slot:"approach",microSceneId:"MSC-CUSTOM-SHADOW-TRANSLUCENT",radius:9,requiredMapFact:"bibleActivation:OPP-CIV-01",requiredMapField:"mapId"})
    ]),
    npcEncounters:Object.freeze([Object.freeze({id:"opp-civ01-translucent",cuoType:"npc_translucent",microSceneId:"MSC-CUSTOM-SHADOW-TRANSLUCENT",despawnOnDistanceBelow:10})]),
    narrative:Object.freeze({
      revealed:Object.freeze([]),
      progress:Object.freeze([
        Object.freeze({slot:"presence",atCount:1,text:"Il y avait quelqu’un entre les arbres. Je l’ai vu avant qu’il ne m’aperçoive vraiment."}),
        Object.freeze({slot:"approach",atCount:1,text:"Plus rien. La présence s’est retirée avant que je puisse l’approcher."})
      ]),
      completed:Object.freeze(["Les traces sont trop récentes pour être un hasard. Quelqu’un était bien ici, et a choisi de ne pas rester."])
    })
  });

  const OPPFAU01 = Object.freeze({
    id:"OPP-FAU-01", title:"Les yeux dans la nuit",
    description:"À la nuit tombée, observer calmement le même animal nocturne avant puis après son léger déplacement.",
    pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-SHADOW-NOCTURAL"])}),
    bindActivationMap:true, priority:218, passivePriorityAxis:"research", ponderation:1.3, autoPrimaryEligible:true,
    sequence:Object.freeze([
      Object.freeze({slot:"firstLook",title:"Observer la présence nocturne sans la faire fuir",action:"observe",target:1,sameTarget:true,params:Object.freeze({cuoType:"nocturnal_animal",microSceneId:"MSC-CUSTOM-SHADOW-NOCTURAL",tagsAll:Object.freeze(["fauna_behavior","period_night"]),requiredMapFact:"bibleActivation:OPP-FAU-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"secondLook",title:"Retrouver le même animal après son déplacement",action:"observe",target:1,requires:Object.freeze(["firstLook"]),sameTarget:true,params:Object.freeze({cuoType:"nocturnal_animal",microSceneId:"MSC-CUSTOM-SHADOW-NOCTURAL",tagsAll:Object.freeze(["fauna_behavior","period_night"]),requiredMapFact:"bibleActivation:OPP-FAU-01",requiredMapField:"mapId"})})
    ]),
    narrative:Object.freeze({revealed:Object.freeze(["Deux yeux reflètent la nuit. Je peux peut-être rester assez calme pour qu’ils ne disparaissent pas." ]),completed:Object.freeze(["Il s’est déplacé, mais il est resté là. Pendant quelques secondes, nous nous sommes observés tous les deux."])})
  });

  const OPPMET01 = Object.freeze({
    id:"OPP-MET-01", title:"La pluie qui remonte",
    description:"Observer un écoulement qui semble remonter, changer de point de vue puis comparer le phénomène à son environnement proche.",
    pattern:"SEQUENCE_ACTIONS", trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-INVERTED-RAIN"])}),
    bindActivationMap:true, priority:217, passivePriorityAxis:"research", ponderation:1.4, autoPrimaryEligible:true,
    sequence:Object.freeze([
      Object.freeze({slot:"water",title:"Observer l’eau qui paraît remonter",action:"observe",target:1,params:Object.freeze({cuoType:"watercourse",microSceneId:"MSC-CUSTOM-INVERTED-RAIN",requiredMapFact:"bibleActivation:OPP-MET-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"viewpoint",title:"Vérifier le phénomène depuis un second point",action:"observe",target:1,requires:Object.freeze(["water"]),params:Object.freeze({cuoType:"pool",microSceneId:"MSC-CUSTOM-INVERTED-RAIN",requiredMapFact:"bibleActivation:OPP-MET-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"context",title:"Comparer avec la végétation ou le sol voisin",action:"analyze",target:1,requires:Object.freeze(["viewpoint"]),params:Object.freeze({cuoTypes:Object.freeze(["thermosap_moss","fluorescent_vegetation","strong_rock"]),microSceneId:"MSC-CUSTOM-INVERTED-RAIN",requiredMapFact:"bibleActivation:OPP-MET-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"change",title:"Rester assez longtemps pour voir le phénomène évoluer",action:"research",target:1,requires:Object.freeze(["context"]),params:Object.freeze({duration:4500,requiredMapFact:"bibleActivation:OPP-MET-01",requiredMapField:"mapId"})})
    ]),
    narrative:Object.freeze({revealed:Object.freeze(["Les gouttes montent. Ou bien quelque chose ici donne cette impression. Je veux vérifier avant de conclure." ]),completed:Object.freeze(["Le phénomène change avec le lieu et l’air autour. Je n’ai pas encore une explication, mais ce n’est pas une simple illusion de passage."])})
  });

  const OPPMET02 = Object.freeze({
    id:"OPP-MET-02", title:"L’orage sans voix",
    description:"Observer un orage lointain dont les éclairs précèdent anormalement le grondement, sans chercher à prendre de hauteur.",
    pattern:"SEQUENCE_ACTIONS", trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-DISTANT-STORM"])}),
    bindActivationMap:true, priority:216, passivePriorityAxis:"research", ponderation:1.3, autoPrimaryEligible:true,
    sequence:Object.freeze([
      Object.freeze({slot:"lightning",title:"Observer les éclairs du front lointain",action:"observe",target:1,params:Object.freeze({cuoType:"electrostatic_storm",microSceneId:"MSC-CUSTOM-DISTANT-STORM",requiredMapFact:"bibleActivation:OPP-MET-02",requiredMapField:"mapId"})}),
      Object.freeze({slot:"wait",title:"Continuer brièvement l’observation depuis le sol",action:"research",target:1,requires:Object.freeze(["lightning"]),params:Object.freeze({duration:4000,requiredMapFact:"bibleActivation:OPP-MET-02",requiredMapField:"mapId"})})
    ]),
    narrative:Object.freeze({revealed:Object.freeze(["Des éclairs, mais aucun tonnerre. Je reste ici : pas besoin de grimper pour comprendre ce décalage." ]),completed:Object.freeze(["Le grondement finit par arriver. La distance explique une partie du silence ; le front reste assez étrange pour mériter une note."])})
  });

  const OPPBIO01 = Object.freeze({
    id:"OPP-BIO-01", title:"La forêt qui respire",
    description:"Observer deux cycles d’un groupe végétal puis une plante isolée pour comprendre le mouvement collectif sans inventer de mécanisme nouveau.",
    pattern:"SEQUENCE_ACTIONS", trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-BREATHING-GROVE"])}),
    bindActivationMap:true, priority:215, passivePriorityAxis:"research", ponderation:1.3, autoPrimaryEligible:true,
    sequence:Object.freeze([
      Object.freeze({slot:"cycle1",title:"Observer un premier mouvement du bosquet",action:"observe",target:1,params:Object.freeze({cuoType:"lunar_vine",microSceneId:"MSC-CUSTOM-BREATHING-GROVE",requiredMapFact:"bibleActivation:OPP-BIO-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"cycle2",title:"Observer un second mouvement du groupe",action:"observe",target:1,requires:Object.freeze(["cycle1"]),params:Object.freeze({cuoType:"lunar_vine",microSceneId:"MSC-CUSTOM-BREATHING-GROVE",requiredMapFact:"bibleActivation:OPP-BIO-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"plant",title:"Comparer avec une plante isolée",action:"observe",target:1,requires:Object.freeze(["cycle2"]),params:Object.freeze({cuoTypes:Object.freeze(["fern","nature_tree","tree"]),microSceneId:"MSC-CUSTOM-BREATHING-GROVE",requiredMapFact:"bibleActivation:OPP-BIO-01",requiredMapField:"mapId"})})
    ]),
    narrative:Object.freeze({revealed:Object.freeze(["Tout le bosquet bouge presque au même rythme. Le vent seul n’explique peut-être pas ce que je vois." ]),completed:Object.freeze(["Une plante seule ne réagit pas tout à fait comme le groupe. Ce lieu donne l’impression d’un comportement collectif, même si la cause reste naturelle."])})
  });

  const OPPGEO01 = Object.freeze({
    id:"OPP-GEO-01", title:"Les pierres qui chantent",
    description:"Localiser l’origine d’un son, comparer deux formations voisines puis observer la réponse du site au vent.",
    pattern:"SEQUENCE_ACTIONS", trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-SINGING-STONES"])}),
    bindActivationMap:true, priority:214, passivePriorityAxis:"research", ponderation:1.3, autoPrimaryEligible:true,
    sequence:Object.freeze([
      Object.freeze({slot:"sound",title:"Localiser l’origine du son",action:"observe",target:1,params:Object.freeze({eventDriven:true,catalogManaged:true})}),
      Object.freeze({slot:"formations",title:"Observer deux formations voisines",action:"observe",target:2,requires:Object.freeze(["sound"]),params:Object.freeze({cuoType:"eroded_monolith",microSceneId:"MSC-CUSTOM-SINGING-STONES",distinctBy:"instanceId",requiredMapFact:"bibleActivation:OPP-GEO-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"wind",title:"Rester jusqu’à une variation du souffle",action:"research",target:1,requires:Object.freeze(["formations"]),params:Object.freeze({duration:3500,requiredMapFact:"bibleActivation:OPP-GEO-01",requiredMapField:"mapId"})})
    ]),
    proximityContexts:Object.freeze([Object.freeze({id:"opp-geo01-sound",slot:"sound",microSceneId:"MSC-CUSTOM-SINGING-STONES",radius:14,requiredMapFact:"bibleActivation:OPP-GEO-01",requiredMapField:"mapId"})]),
    narrative:Object.freeze({revealed:Object.freeze(["Le son vient bien des pierres. Je veux voir si plusieurs formes réagissent de la même manière." ]),completed:Object.freeze(["Le chant change avec le souffle qui traverse les formations. Pas besoin d’une nouvelle matière : la forme des pierres suffit probablement à l’expliquer."])})
  });

  const OPPCIV02 = Object.freeze({
    id:"OPP-CIV-02", title:"Le feu encore chaud",
    description:"Découvrir un foyer réellement occupé, voir Rocky se retirer avant le contact puis examiner les indices qu’il laisse derrière lui.",
    pattern:"SEQUENCE_ACTIONS", trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-SHADOW-ROCKY-001"])}),
    bindActivationMap:true, priority:219, passivePriorityAxis:"exploration", ponderation:1.6, autoPrimaryEligible:true,
    souvenir:true, memoryValence:"positive", scoreTrauma:28,
    sequence:Object.freeze([
      Object.freeze({slot:"camp",title:"Repérer le foyer et la présence qui l’occupe",action:"observe",target:1,params:Object.freeze({eventDriven:true,catalogManaged:true})}),
      Object.freeze({slot:"approach",title:"Approcher sans chercher le contact",action:"observe",target:1,requires:Object.freeze(["camp"]),params:Object.freeze({eventDriven:true,catalogManaged:true})}),
      Object.freeze({slot:"fire",title:"Examiner le foyer encore chaud",action:"inspect",target:1,requires:Object.freeze(["approach"]),params:Object.freeze({cuoType:"base_fire",microSceneId:"MSC-CUSTOM-SHADOW-ROCKY-001",requiredMapFact:"bibleActivation:OPP-CIV-02",requiredMapField:"mapId"})}),
      Object.freeze({slot:"trace",title:"Observer un second indice d’occupation",action:"observe",target:1,requires:Object.freeze(["fire"]),params:Object.freeze({cuoTypes:Object.freeze(["tree_fallen","eroded_monolith"]),microSceneId:"MSC-CUSTOM-SHADOW-ROCKY-001",requiredMapFact:"bibleActivation:OPP-CIV-02",requiredMapField:"mapId"})})
    ]),
    proximityContexts:Object.freeze([
      Object.freeze({id:"opp-civ02-camp",slot:"camp",microSceneId:"MSC-CUSTOM-SHADOW-ROCKY-001",radius:18,requiredMapFact:"bibleActivation:OPP-CIV-02",requiredMapField:"mapId"}),
      Object.freeze({id:"opp-civ02-approach",slot:"approach",microSceneId:"MSC-CUSTOM-SHADOW-ROCKY-001",radius:9,requiredMapFact:"bibleActivation:OPP-CIV-02",requiredMapField:"mapId"})
    ]),
    npcEncounters:Object.freeze([Object.freeze({id:"opp-civ02-rocky",cuoType:"npc_rocky",microSceneId:"MSC-CUSTOM-SHADOW-ROCKY-001",despawnOnDistanceBelow:10})]),
    narrative:Object.freeze({revealed:Object.freeze([]),progress:Object.freeze([Object.freeze({slot:"camp",atCount:1,text:"Un feu. Et quelqu’un près de lui. Cette fois, la présence n’est pas une trace ancienne."}),Object.freeze({slot:"approach",atCount:1,text:"Rocky s’est retiré avant que je puisse entrer dans sa distance de contact. Je n’insiste pas."})]),completed:Object.freeze(["Le foyer était encore chaud et les marques autour sont récentes. Quelqu’un vit ou passe ici régulièrement."])})
  });

  const OPPMET03 = Object.freeze({
    id:"OPP-MET-03", title:"La mer de brume",
    description:"Suivre la progression d’une brume réelle sur le relief jusqu’à son maximum puis au début de sa dissipation.",
    pattern:"SEQUENCE_ACTIONS", trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-FOG-SEA-SUSPENDU"])}),
    bindActivationMap:true, priority:213, passivePriorityAxis:"exploration", ponderation:1.2, autoPrimaryEligible:true,
    sequence:Object.freeze([
      Object.freeze({slot:"edge",title:"Observer l’arrivée de la brume",action:"observe",target:1,params:Object.freeze({cuoType:"fog_bank",microSceneId:"MSC-CUSTOM-FOG-SEA-SUSPENDU",requiredMapFact:"bibleActivation:OPP-MET-03",requiredMapField:"mapId"})}),
      Object.freeze({slot:"landmarks",title:"Voir les repères disparaître dans la brume",action:"observe",target:1,requires:Object.freeze(["edge"]),params:Object.freeze({cuoType:"mobile_islet",microSceneId:"MSC-CUSTOM-FOG-SEA-SUSPENDU",requiredMapFact:"bibleActivation:OPP-MET-03",requiredMapField:"mapId"})}),
      Object.freeze({slot:"maximum",title:"Attendre le maximum du voile",action:"research",target:1,requires:Object.freeze(["landmarks"]),params:Object.freeze({duration:4500,requiredMapFact:"bibleActivation:OPP-MET-03",requiredMapField:"mapId"})}),
      Object.freeze({slot:"dissipation",title:"Observer le début de la dissipation",action:"observe",target:1,requires:Object.freeze(["maximum"]),params:Object.freeze({cuoType:"fog_bank",microSceneId:"MSC-CUSTOM-FOG-SEA-SUSPENDU",requiredMapFact:"bibleActivation:OPP-MET-03",requiredMapField:"mapId"})})
    ]),
    proximityContexts:Object.freeze([
      Object.freeze({id:"opp-met03-edge-fog",slot:"edge",cuoType:"fog_bank",fact:"opp-met03:edge-fog-proximity",radius:4.8,requiredMapFact:"bibleActivation:OPP-MET-03",requiredMapField:"mapId"}),
      Object.freeze({id:"opp-met03-dissipation-fog",slot:"dissipation",cuoType:"fog_bank",fact:"opp-met03:dissipation-fog-proximity",radius:4.8,requiresSlotComplete:"maximum",requiredMapFact:"bibleActivation:OPP-MET-03",requiredMapField:"mapId"})
    ]),
    narrative:Object.freeze({revealed:Object.freeze(["La brume avance comme une mer basse entre les reliefs. Je veux voir jusqu’où elle efface le paysage." ]),completed:Object.freeze(["Le voile commence déjà à se retirer. Ce n’était pas un mur fixe, mais un phénomène qui traverse réellement le relief."])})
  });

  const OPPBIO02 = Object.freeze({
    id:"OPP-BIO-02", title:"La frontière vivante",
    description:"Comparer deux milieux réellement juxtaposés puis suivre un indice local capable d’expliquer leur frontière.",
    pattern:"SEQUENCE_ACTIONS", trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-BIOME-FRONTIERE"])}),
    bindActivationMap:true, priority:212, passivePriorityAxis:"research", ponderation:1.3, autoPrimaryEligible:true,
    sequence:Object.freeze([
      Object.freeze({slot:"boundary",title:"Repérer la limite entre les deux milieux",action:"observe",target:1,params:Object.freeze({eventDriven:true,catalogManaged:true})}),
      Object.freeze({slot:"drySide",title:"Observer un élément du côté sec ou minéral",action:"observe",target:1,requires:Object.freeze(["boundary"]),params:Object.freeze({cuoTypes:Object.freeze(["cactus","metallic_dune","resonant_basalt"]),microSceneId:"MSC-CUSTOM-BIOME-FRONTIERE",requiredMapFact:"bibleActivation:OPP-BIO-02",requiredMapField:"mapId"})}),
      Object.freeze({slot:"wetSide",title:"Observer un élément du côté humide ou végétal",action:"observe",target:1,requires:Object.freeze(["drySide"]),params:Object.freeze({cuoTypes:Object.freeze(["thermosap_moss","adaptive_plant","pool"]),microSceneId:"MSC-CUSTOM-BIOME-FRONTIERE",requiredMapFact:"bibleActivation:OPP-BIO-02",requiredMapField:"mapId"})}),
      Object.freeze({slot:"cause",title:"Suivre brièvement un indice local de la frontière",action:"observe",target:1,requires:Object.freeze(["wetSide"]),params:Object.freeze({cuoType:"watercourse",microSceneId:"MSC-CUSTOM-BIOME-FRONTIERE",requiredMapFact:"bibleActivation:OPP-BIO-02",requiredMapField:"mapId"})})
    ]),
    proximityContexts:Object.freeze([Object.freeze({id:"opp-bio02-boundary",slot:"boundary",microSceneId:"MSC-CUSTOM-BIOME-FRONTIERE",radius:24,requiredMapFact:"bibleActivation:OPP-BIO-02",requiredMapField:"mapId"})]),
    narrative:Object.freeze({revealed:Object.freeze(["Deux milieux se touchent presque sans transition. Je veux comparer ce qui change exactement de part et d’autre." ]),completed:Object.freeze(["L’eau, le sol et l’exposition donnent une explication plausible à cette limite. Une frontière vivante, mais pas arbitraire."])})
  });

  const OPPORCHNAT01 = Object.freeze({
    id:"OPP-ORCH-NAT-01", title:"Quelque chose a poussé ici",
    description:"Dans un sanctuaire envahi par le vivant, comparer la plante remarquable aux structures anciennes qui l’entourent.",
    pattern:"SEQUENCE_ACTIONS", trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-SANCTUAIRE-OCHIDEE-NATURAL"])}),
    bindActivationMap:true, priority:210, passivePriorityAxis:"research", ponderation:1, autoPrimaryEligible:true, obsessionEligible:true, obsessionIntensity:4,
    sequence:Object.freeze([
      Object.freeze({slot:"living",title:"Observer l’orchidée mêlée aux ruines",action:"observe",target:1,params:Object.freeze({cuoType:"prismatic_orchid",microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-NATURAL",requiredMapFact:"bibleActivation:OPP-ORCH-NAT-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"structure",title:"Analyser une structure érodée voisine",action:"analyze",target:1,requires:Object.freeze(["living"]),params:Object.freeze({cuoType:"eroded_monolith",microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-NATURAL",requiredMapFact:"bibleActivation:OPP-ORCH-NAT-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"secondLiving",title:"Observer un second élément vivant du sanctuaire",action:"observe",target:1,requires:Object.freeze(["structure"]),params:Object.freeze({cuoTypes:Object.freeze(["thermosap_moss","lunar_vine","fern"]),microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-NATURAL",requiredMapFact:"bibleActivation:OPP-ORCH-NAT-01",requiredMapField:"mapId"})})
    ]), narrative:Object.freeze({completed:Object.freeze(["La végétation n’a pas seulement recouvert ces ruines : elle semble s’être organisée autour d’elles. Je veux revenir sur ce lien."])})
  });

  const OPPORCHNAT02 = Object.freeze({
    id:"OPP-ORCH-NAT-02", title:"Gardé vivant",
    description:"Revenir dans le même sanctuaire pour comparer ses traces techniques à la végétation qui les entoure.", pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"progression.mission_completed",missionId:"OPP-ORCH-NAT-01",count:1}), prerequisites:Object.freeze(["OPP-ORCH-NAT-01"]),
    priority:209, passivePriorityAxis:"research", ponderation:0.9, obsessionEligible:true, obsessionIntensity:4, souvenir:true, memoryValence:"positive", scoreTrauma:36,
    sequence:Object.freeze([
      Object.freeze({slot:"memory",title:"Examiner une trace technique conservée",action:"inspect",target:1,params:Object.freeze({cuoTypes:Object.freeze(["memory_capsule","pulse_core"]),microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-NATURAL",requiredMapFact:"bibleActivation:OPP-ORCH-NAT-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"second",title:"Examiner un second élément significatif",action:"inspect",target:1,requires:Object.freeze(["memory"]),params:Object.freeze({cuoTypes:Object.freeze(["pulse_core","memory_capsule","eroded_monolith"]),microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-NATURAL",requiredMapFact:"bibleActivation:OPP-ORCH-NAT-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"living",title:"Revenir vers le vivant voisin",action:"observe",target:1,requires:Object.freeze(["second"]),params:Object.freeze({cuoType:"prismatic_orchid",microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-NATURAL",requiredMapFact:"bibleActivation:OPP-ORCH-NAT-01",requiredMapField:"mapId"})})
    ]), narrative:Object.freeze({completed:Object.freeze(["La technique est ancienne ; le vivant, lui, continue. J’aime l’idée que ce lieu soit resté actif sans avoir besoin de rester intact."])})
  });

  const OPPORCHBAS01 = Object.freeze({
    id:"OPP-ORCH-BAS-01", title:"Un lieu construit autour de l’eau", description:"Observer le bassin d’un sanctuaire puis comparer deux zones de son architecture.", pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-SANCTUAIRE-OCHIDEE-BASSIN"])}), bindActivationMap:true,
    priority:208, passivePriorityAxis:"research", ponderation:1, autoPrimaryEligible:true, obsessionEligible:true, obsessionIntensity:4,
    sequence:Object.freeze([
      Object.freeze({slot:"basin",title:"Observer le bassin et son contexte",action:"observe",target:1,params:Object.freeze({cuoType:"pool",microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-BASSIN",requiredMapFact:"bibleActivation:OPP-ORCH-BAS-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"stele",title:"Examiner une structure proche de l’eau",action:"inspect",target:1,requires:Object.freeze(["basin"]),params:Object.freeze({cuoTypes:Object.freeze(["stele","eroded_monolith"]),microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-BASSIN",requiredMapFact:"bibleActivation:OPP-ORCH-BAS-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"zone2",title:"Observer une seconde zone architecturale",action:"observe",target:1,requires:Object.freeze(["stele"]),params:Object.freeze({cuoType:"arch",microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-BASSIN",requiredMapFact:"bibleActivation:OPP-ORCH-BAS-01",requiredMapField:"mapId"})})
    ]), narrative:Object.freeze({completed:Object.freeze(["Le bassin n’est pas un détail ajouté aux ruines. L’architecture semble s’être organisée autour de l’eau."])})
  });

  const OPPORCHBAS02 = Object.freeze({
    id:"OPP-ORCH-BAS-02", title:"Ce qui venait boire ici", description:"Dans le même sanctuaire, comparer la végétation du bassin à un autre élément naturel puis revenir au centre construit.", pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"progression.mission_completed",missionId:"OPP-ORCH-BAS-01",count:1}), prerequisites:Object.freeze(["OPP-ORCH-BAS-01"]), priority:207, passivePriorityAxis:"research", ponderation:0.9, obsessionEligible:true, obsessionIntensity:4, souvenir:true, memoryValence:"positive", scoreTrauma:34,
    sequence:Object.freeze([
      Object.freeze({slot:"bank",title:"Observer la végétation au bord du bassin",action:"observe",target:1,params:Object.freeze({cuoTypes:Object.freeze(["prismatic_orchid","frond","fern"]),microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-BASSIN",requiredMapFact:"bibleActivation:OPP-ORCH-BAS-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"nature2",title:"Comparer un second élément naturel",action:"analyze",target:1,requires:Object.freeze(["bank"]),params:Object.freeze({cuoTypes:Object.freeze(["thermosap_moss","adaptive_plant","spore"]),microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-BASSIN",requiredMapFact:"bibleActivation:OPP-ORCH-BAS-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"center",title:"Revenir à la structure centrale",action:"observe",target:1,requires:Object.freeze(["nature2"]),params:Object.freeze({cuoType:"pool",microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-BASSIN",requiredMapFact:"bibleActivation:OPP-ORCH-BAS-01",requiredMapField:"mapId"})})
    ]), narrative:Object.freeze({completed:Object.freeze(["Ce bassin a probablement servi à plus que décorer le sanctuaire. Le vivant continue encore d’y converger."])})
  });

  const OPPORCHRIV01 = Object.freeze({
    id:"OPP-ORCH-RIV-01", title:"Elle ne devrait pas être là", description:"Étudier l’orchidée remarquable d’un sanctuaire riverain puis la comparer à deux traces anciennes liées au même lieu.", pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-SANCTUAIRE-OCHIDEE-RIVER-STELLE"])}), bindActivationMap:true,
    priority:211, passivePriorityAxis:"research", ponderation:1, autoPrimaryEligible:true, obsessionEligible:true, obsessionIntensity:5,
    sequence:Object.freeze([
      Object.freeze({slot:"orchid",title:"Analyser l’orchidée remarquable",action:"analyze",target:1,params:Object.freeze({cuoType:"prismatic_orchid",microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-RIVER-STELLE",requiredMapFact:"bibleActivation:OPP-ORCH-RIV-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"stele",title:"Examiner la stèle ou le monolithe lié",action:"inspect",target:1,requires:Object.freeze(["orchid"]),params:Object.freeze({cuoTypes:Object.freeze(["stele","eroded_monolith"]),microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-RIVER-STELLE",requiredMapFact:"bibleActivation:OPP-ORCH-RIV-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"ancient2",title:"Comparer une seconde trace ancienne",action:"observe",target:1,requires:Object.freeze(["stele"]),params:Object.freeze({cuoTypes:Object.freeze(["debris","eroded_monolith"]),microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-RIVER-STELLE",requiredMapFact:"bibleActivation:OPP-ORCH-RIV-01",requiredMapField:"mapId"})})
    ]), narrative:Object.freeze({completed:Object.freeze(["L’orchidée pousse exactement là où ces traces anciennes se répondent. Ce lien mérite une seconde lecture."])})
  });

  const OPPORCHRIV02 = Object.freeze({
    id:"OPP-ORCH-RIV-02", title:"Une réponse sans message", description:"Revenir sur le même site pour comparer un noyau d’impulsion, une capsule mémoire et la plante qui les accompagne.", pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"progression.mission_completed",missionId:"OPP-ORCH-RIV-01",count:1}), prerequisites:Object.freeze(["OPP-ORCH-RIV-01"]), priority:210, passivePriorityAxis:"research", ponderation:0.9, obsessionEligible:true, obsessionIntensity:5,
    sequence:Object.freeze([
      Object.freeze({slot:"pulse",title:"Examiner le noyau d’impulsion",action:"inspect",target:1,params:Object.freeze({cuoType:"pulse_core",microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-RIVER-STELLE",requiredMapFact:"bibleActivation:OPP-ORCH-RIV-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"memory",title:"Examiner la capsule mémoire",action:"inspect",target:1,requires:Object.freeze(["pulse"]),params:Object.freeze({cuoType:"memory_capsule",microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-RIVER-STELLE",requiredMapFact:"bibleActivation:OPP-ORCH-RIV-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"returnPlant",title:"Revenir à l’orchidée et à son voisinage",action:"observe",target:1,requires:Object.freeze(["memory"]),params:Object.freeze({cuoType:"prismatic_orchid",microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-RIVER-STELLE",requiredMapFact:"bibleActivation:OPP-ORCH-RIV-01",requiredMapField:"mapId"})})
    ]), narrative:Object.freeze({completed:Object.freeze(["Je n’ai trouvé aucun message clair. Pourtant, les éléments du lieu se répondent assez pour que le silence lui-même devienne une information."])})
  });

  const OPPORCHRIV03 = Object.freeze({
    id:"OPP-ORCH-RIV-03", title:"Ne rien emporter", description:"Revenir une dernière fois au même sanctuaire, l’observer sans ajouter de collecte obligatoire puis laisser le lieu intact.", pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"progression.mission_completed",missionId:"OPP-ORCH-RIV-02",count:1}), prerequisites:Object.freeze(["OPP-ORCH-RIV-02"]), priority:209, passivePriorityAxis:"research", ponderation:0.5, obsessionEligible:false, souvenir:true, memoryValence:"positive", scoreTrauma:52,
    sequence:Object.freeze([
      Object.freeze({slot:"final",title:"Observer une dernière fois le sanctuaire",action:"observe",target:1,params:Object.freeze({eventDriven:true,catalogManaged:true})}),
      Object.freeze({slot:"orchid",title:"Regarder encore l’orchidée avant de repartir",action:"observe",target:1,requires:Object.freeze(["final"]),params:Object.freeze({cuoType:"prismatic_orchid",microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-RIVER-STELLE",requiredMapFact:"bibleActivation:OPP-ORCH-RIV-01",requiredMapField:"mapId"})})
    ]),
    proximityContexts:Object.freeze([Object.freeze({id:"opp-riv03-final",slot:"final",microSceneId:"MSC-CUSTOM-SANCTUAIRE-OCHIDEE-RIVER-STELLE",radius:10,requiredMapFact:"bibleActivation:OPP-ORCH-RIV-01",requiredMapField:"mapId"})]),
    narrative:Object.freeze({completed:Object.freeze(["Je pourrais emporter quelque chose. Je préfère garder le lieu comme je l’ai trouvé. Ce choix-là suffit à fermer la parenthèse."])})
  });

  const OPPADR01 = Object.freeze({
    id:"OPP-ADR-01", title:"Pas simplement cassé", description:"Examiner un drone abandonné, ses débris et le minerai magnétique présent sur le même site.", pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-ABANDONED-DRONE-001"])}), bindActivationMap:true,
    priority:211, passivePriorityAxis:"research", ponderation:1, autoPrimaryEligible:true, obsessionEligible:true, obsessionIntensity:4,
    sequence:Object.freeze([
      Object.freeze({slot:"drone",title:"Examiner le drone abandonné",action:"inspect",target:1,params:Object.freeze({cuoType:"abandoned_drone",microSceneId:"MSC-ABANDONED-DRONE-001",requiredMapFact:"bibleActivation:OPP-ADR-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"debris",title:"Examiner un débris voisin",action:"inspect",target:1,requires:Object.freeze(["drone"]),params:Object.freeze({cuoType:"debris",microSceneId:"MSC-ABANDONED-DRONE-001",requiredMapFact:"bibleActivation:OPP-ADR-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"ore",title:"Analyser le minerai magnétique du site",action:"analyze",target:1,requires:Object.freeze(["debris"]),params:Object.freeze({cuoType:"magnetic_ore",microSceneId:"MSC-ABANDONED-DRONE-001",requiredMapFact:"bibleActivation:OPP-ADR-01",requiredMapField:"mapId"})})
    ]), narrative:Object.freeze({completed:Object.freeze(["Ce drone n’est pas tombé n’importe où. Les débris et le minerai racontent une fin plus précise qu’une simple panne."])})
  });

  const OPPADR02 = Object.freeze({
    id:"OPP-ADR-02", title:"Dernière tâche", description:"Revenir au même site pour relire le drone, un second débris et son environnement comme les restes d’une dernière activité.", pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"progression.mission_completed",missionId:"OPP-ADR-01",count:1}), prerequisites:Object.freeze(["OPP-ADR-01"]), priority:210, passivePriorityAxis:"research", ponderation:0.9, obsessionEligible:true, obsessionIntensity:5,
    sequence:Object.freeze([
      Object.freeze({slot:"drone",title:"Réexaminer le même site de drone",action:"inspect",target:1,params:Object.freeze({cuoType:"abandoned_drone",microSceneId:"MSC-ABANDONED-DRONE-001",requiredMapFact:"bibleActivation:OPP-ADR-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"debris",title:"Examiner un autre débris du site",action:"inspect",target:1,requires:Object.freeze(["drone"]),params:Object.freeze({cuoType:"debris",microSceneId:"MSC-ABANDONED-DRONE-001",distinctBy:"instanceId",requiredMapFact:"bibleActivation:OPP-ADR-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"environment",title:"Relire l’indice environnemental du site",action:"observe",target:1,requires:Object.freeze(["debris"]),params:Object.freeze({cuoType:"magnetic_ore",microSceneId:"MSC-ABANDONED-DRONE-001",requiredMapFact:"bibleActivation:OPP-ADR-01",requiredMapField:"mapId"})})
    ]), narrative:Object.freeze({completed:Object.freeze(["Les pièces ne me donnent pas un plan à reproduire. Elles me donnent quelque chose de plus simple : la trace de ce que ce drone faisait encore ici."])})
  });

  const OPPADR03 = Object.freeze({
    id:"OPP-ADR-03", title:"Fin de service", description:"Clore l’étude du même site par une dernière inspection du drone ; toute récupération de débris reste facultative et non bloquante.", pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"progression.mission_completed",missionId:"OPP-ADR-02",count:1}), prerequisites:Object.freeze(["OPP-ADR-02"]), priority:209, passivePriorityAxis:"research", ponderation:0.5, obsessionEligible:false, souvenir:true, memoryValence:"positive", scoreTrauma:40,
    sequence:Object.freeze([
      Object.freeze({slot:"optionalDebris",title:"Récupérer un débris si cela vaut réellement la peine",action:"collect",target:1,optional:true,params:Object.freeze({cuoType:"debris",microSceneId:"MSC-ABANDONED-DRONE-001",requiredMapFact:"bibleActivation:OPP-ADR-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"lastLook",title:"Inspecter une dernière fois le drone",action:"inspect",target:1,params:Object.freeze({cuoType:"abandoned_drone",microSceneId:"MSC-ABANDONED-DRONE-001",requiredMapFact:"bibleActivation:OPP-ADR-01",requiredMapField:"mapId"})})
    ]), narrative:Object.freeze({completed:Object.freeze(["Fin de service. Je n’ai pas besoin de transformer cette épave en nouvelle branche de recherche pour que son histoire compte."])})
  });

  const OPPOASIS01 = Object.freeze({
    id:"OPP-OASIS-01", title:"Trop calme", description:"Observer le bassin d’une oasis lumineuse puis comparer deux formes de vie qui l’entourent.", pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-LUMINOUS-OASIS-001"])}), bindActivationMap:true,
    priority:208, passivePriorityAxis:"exploration", ponderation:1.2, autoPrimaryEligible:true,
    sequence:Object.freeze([
      Object.freeze({slot:"pool",title:"Observer le bassin",action:"observe",target:1,params:Object.freeze({cuoType:"pool",microSceneId:"MSC-LUMINOUS-OASIS-001",requiredMapFact:"bibleActivation:OPP-OASIS-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"spore",title:"Observer la vie lumineuse voisine",action:"observe",target:1,requires:Object.freeze(["pool"]),params:Object.freeze({cuoType:"spore",microSceneId:"MSC-LUMINOUS-OASIS-001",requiredMapFact:"bibleActivation:OPP-OASIS-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"plant",title:"Comparer une seconde plante",action:"observe",target:1,requires:Object.freeze(["spore"]),params:Object.freeze({cuoType:"fern",microSceneId:"MSC-LUMINOUS-OASIS-001",requiredMapFact:"bibleActivation:OPP-OASIS-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"optionalSample",title:"Prélever une fibre si cela reste utile",action:"collect",target:1,optional:true,params:Object.freeze({cuoType:"fiber",microSceneId:"MSC-LUMINOUS-OASIS-001",requiredMapFact:"bibleActivation:OPP-OASIS-01",requiredMapField:"mapId"})})
    ]), narrative:Object.freeze({completed:Object.freeze(["Tout est calme, mais pas vide. L’oasis fonctionne comme un petit monde concentré autour de l’eau."])})
  });

  const OPPHIDDEN01 = Object.freeze({
    id:"OPP-HIDDEN-01", title:"Quelqu’un voulait que ça reste là", description:"Examiner deux composants techniques d’un site caché puis leur contexte de débris ou de minerai sans inventer de butin.", pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-COMP-HIDDEN"])}), bindActivationMap:true,
    priority:208, passivePriorityAxis:"research", ponderation:1.3, autoPrimaryEligible:true,
    sequence:Object.freeze([
      Object.freeze({slot:"tech1",title:"Examiner le premier composant remarquable",action:"inspect",target:1,params:Object.freeze({cuoTypes:Object.freeze(["logic_prism","pulse_core"]),microSceneId:"MSC-CUSTOM-COMP-HIDDEN",requiredMapFact:"bibleActivation:OPP-HIDDEN-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"tech2",title:"Examiner un second composant technique",action:"inspect",target:1,requires:Object.freeze(["tech1"]),params:Object.freeze({cuoTypes:Object.freeze(["pulse_core","logic_prism"]),microSceneId:"MSC-CUSTOM-COMP-HIDDEN",requiredMapFact:"bibleActivation:OPP-HIDDEN-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"context",title:"Observer le contexte qui les dissimule",action:"observe",target:1,requires:Object.freeze(["tech2"]),params:Object.freeze({cuoTypes:Object.freeze(["debris","azure_ferrite"]),microSceneId:"MSC-CUSTOM-COMP-HIDDEN",requiredMapFact:"bibleActivation:OPP-HIDDEN-01",requiredMapField:"mapId"})})
    ]), narrative:Object.freeze({completed:Object.freeze(["Ces composants n’étaient pas simplement tombés là. Quelqu’un a probablement voulu que l’ensemble reste discret, pas qu’il devienne un coffre à ouvrir."])})
  });

  const OPPNEST01 = Object.freeze({
    id:"OPP-NEST-01", title:"On partage ?", description:"Observer un nid protecteur à distance puis deux présences animales distinctes avant de réduire prudemment la distance si elles le permettent.", pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-NID-PROTECTEUR"])}), bindActivationMap:true,
    priority:207, passivePriorityAxis:"relations", ponderation:1.2, autoPrimaryEligible:true,
    sequence:Object.freeze([
      Object.freeze({slot:"nest",title:"Observer le nid à distance",action:"observe",target:1,params:Object.freeze({cuoType:"abandoned_nest",microSceneId:"MSC-CUSTOM-NID-PROTECTEUR",requiredMapFact:"bibleActivation:OPP-NEST-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"fauna1",title:"Observer la première présence animale",action:"observe",target:1,requires:Object.freeze(["nest"]),params:Object.freeze({cuoType:"nocturnal_animal",microSceneId:"MSC-CUSTOM-NID-PROTECTEUR",requiredMapFact:"bibleActivation:OPP-NEST-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"fauna2",title:"Observer une seconde présence ou un second comportement",action:"observe",target:1,requires:Object.freeze(["fauna1"]),params:Object.freeze({cuoType:"amphibian_species",microSceneId:"MSC-CUSTOM-NID-PROTECTEUR",requiredMapFact:"bibleActivation:OPP-NEST-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"approach",title:"Réduire prudemment la distance si le groupe reste calme",action:"observe",target:1,requires:Object.freeze(["fauna2"]),params:Object.freeze({eventDriven:true,catalogManaged:true})})
    ]),
    proximityContexts:Object.freeze([Object.freeze({id:"opp-nest01-approach",slot:"approach",microSceneId:"MSC-CUSTOM-NID-PROTECTEUR",radius:5,requiredMapFact:"bibleActivation:OPP-NEST-01",requiredMapField:"mapId"})]),
    narrative:Object.freeze({completed:Object.freeze(["Deux espèces autour du même nid, sans conflit immédiat. Je garde mes distances : partager un lieu n’est pas une invitation à intervenir."])})
  });

  const OPPSANBIG01 = Object.freeze({
    id:"OPP-SAN-BIG-01", title:"Beaucoup trop grand pour une seule idée", description:"Parcourir un vaste sanctuaire en reliant deux zones construites, un élément naturel intégré puis le centre du site.", pattern:"SEQUENCE_ACTIONS",
    trigger:Object.freeze({type:"exploration.map_discovered",count:1,uniqueOnly:true,featuredMicroSceneIdsAny:Object.freeze(["MSC-CUSTOM-SANCTUAIRE-BIG"])}), bindActivationMap:true,
    priority:206, passivePriorityAxis:"research", ponderation:1.2, autoPrimaryEligible:true,
    sequence:Object.freeze([
      Object.freeze({slot:"structure1",title:"Observer une première structure importante",action:"observe",target:1,params:Object.freeze({cuoType:"arch",microSceneId:"MSC-CUSTOM-SANCTUAIRE-BIG",requiredMapFact:"bibleActivation:OPP-SAN-BIG-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"structure2",title:"Examiner une seconde zone construite",action:"inspect",target:1,requires:Object.freeze(["structure1"]),params:Object.freeze({cuoTypes:Object.freeze(["stele","eroded_monolith"]),microSceneId:"MSC-CUSTOM-SANCTUAIRE-BIG",requiredMapFact:"bibleActivation:OPP-SAN-BIG-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"living",title:"Observer l’élément naturel ou cristallin intégré",action:"observe",target:1,requires:Object.freeze(["structure2"]),params:Object.freeze({cuoTypes:Object.freeze(["crystalline_tree","luminescent_tree","lunar_vine"]),microSceneId:"MSC-CUSTOM-SANCTUAIRE-BIG",requiredMapFact:"bibleActivation:OPP-SAN-BIG-01",requiredMapField:"mapId"})}),
      Object.freeze({slot:"center",title:"Revenir vers le centre et relire l’ensemble",action:"observe",target:1,requires:Object.freeze(["living"]),params:Object.freeze({eventDriven:true,catalogManaged:true})})
    ]),
    proximityContexts:Object.freeze([Object.freeze({id:"opp-san-big-center",slot:"center",microSceneId:"MSC-CUSTOM-SANCTUAIRE-BIG",radius:8,requiredMapFact:"bibleActivation:OPP-SAN-BIG-01",requiredMapField:"mapId"})]),
    narrative:Object.freeze({completed:Object.freeze(["Ce sanctuaire est trop vaste pour n’avoir servi qu’à une seule chose. Son architecture, sa végétation et ses traces techniques ont été pensées comme un ensemble."])})
  });


  const TERRCARN01 = Object.freeze({
    id: "TERR-CARN-01",
    title: "Approcher le phénomène",
    description: "Première rencontre opportuniste avec une zone de plantes carnivores : BlueFox se laisse attirer jusqu'au coeur dangereux, reste exposé trop longtemps puis doit réellement se retirer, se reposer et se restaurer.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 1, uniqueOnly: true, featuredMicroSceneIdsAny: Object.freeze(["MSC-PREDATOR-FLORA-001"]) }),
    bindActivationMap: true,
    primaryOnActivation: true,
    autoPrimaryEligible: true,
    priority: 230,
    passivePriorityAxis: "survival",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 4,
    sequence: Object.freeze([
      Object.freeze({ slot: "approach", title: "Approcher assez pour observer", action: "observe", target: 1, params: Object.freeze({ cuoType: "carnivorous_plant", microSceneId: "MSC-PREDATOR-FLORA-001", proximityOnly: true, proximityRadius: 2.0, requiredMapFact: "bibleActivation:TERR-CARN-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "exposure", title: "Rester brièvement dans le champ pour en mesurer le risque", action: "research", target: 1, requires: Object.freeze(["approach"]), params: Object.freeze({ duration: 6500, requiredMapFact: "bibleActivation:TERR-CARN-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "retreat", title: "Rompre l’exposition et reprendre de la distance", action: "explore-zone", target: 1, requires: Object.freeze(["exposure"]), params: Object.freeze({ requiredMapFact: "bibleActivation:TERR-CARN-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "recover", title: "Effectuer un vrai repos après l’exposition", action: "rest", target: 1, requires: Object.freeze(["retreat"]), params: Object.freeze({}) }),
      Object.freeze({ slot: "restore", title: "Se restaurer avant de reprendre la mission précédente", action: "eat", target: 1, requires: Object.freeze(["recover"]), params: Object.freeze({}) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Ces plantes sont fascinantes. Je veux voir jusqu'où leur réaction porte..."]),
      completed: Object.freeze(["J'ai bien failli y laisser ma vie. Je dois récupérer avant de reprendre quoi que ce soit."])
    })
  });

  const TERRCARN02 = Object.freeze({
    id: "TERR-CARN-02",
    title: "Survivre au danger",
    description: "Deuxième rencontre distincte avec les plantes carnivores : BlueFox récidive, mais écourte son exposition avant de se retirer ; l'expérience laisse cette fois un souvenir négatif durable.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 2, uniqueOnly: true, featuredMicroSceneIdsAny: Object.freeze(["MSC-PREDATOR-FLORA-001"]) }),
    bindActivationMap: true,
    primaryOnActivation: true,
    autoPrimaryEligible: true,
    priority: 229,
    passivePriorityAxis: "survival",
    ponderation: 0.5,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "negative",
    scoreTrauma: 84,
    sequence: Object.freeze([
      Object.freeze({ slot: "approach", title: "Approcher assez pour observer", action: "observe", target: 1, params: Object.freeze({ cuoType: "carnivorous_plant", microSceneId: "MSC-PREDATOR-FLORA-001", proximityOnly: true, proximityRadius: 2.1, requiredMapFact: "bibleActivation:TERR-CARN-02", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "exposure", title: "Rester brièvement dans le champ pour en mesurer le risque", action: "research", target: 1, requires: Object.freeze(["approach"]), params: Object.freeze({ duration: 6000, requiredMapFact: "bibleActivation:TERR-CARN-02", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "retreat", title: "Rompre l’exposition et reprendre de la distance", action: "explore-zone", target: 1, requires: Object.freeze(["exposure"]), params: Object.freeze({ requiredMapFact: "bibleActivation:TERR-CARN-02", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "recover", title: "Effectuer un vrai repos après l’exposition", action: "rest", target: 1, requires: Object.freeze(["retreat"]), params: Object.freeze({}) }),
      Object.freeze({ slot: "restore", title: "Se restaurer avant de reprendre la mission précédente", action: "eat", target: 1, requires: Object.freeze(["recover"]), params: Object.freeze({}) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je reconnais cette flore. Je vais quand même vérifier jusqu'où je peux m'approcher, mais je ne dois pas y rester aussi longtemps."]),
      completed: Object.freeze(["C'est la deuxième fois. Je devrais vraiment faire plus attention."])
    })
  });

  const TERRCARN03 = Object.freeze({
    id: "TERR-CARN-03",
    title: "Prudence face au danger",
    description: "Troisième rencontre : BlueFox approche encore, mais transforme plus tôt l'attraction en Observation et limite volontairement le temps passé dans le champ dangereux.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 3, uniqueOnly: true, featuredMicroSceneIdsAny: Object.freeze(["MSC-PREDATOR-FLORA-001"]) }),
    bindActivationMap: true,
    primaryOnActivation: true,
    autoPrimaryEligible: true,
    priority: 228,
    passivePriorityAxis: "survival",
    ponderation: -0.5,
    souvenir: true,
    memoryValence: "negative",
    scoreTrauma: 62,
    sequence: Object.freeze([
      Object.freeze({ slot: "approach", title: "Approcher assez pour observer", action: "observe", target: 1, params: Object.freeze({ cuoType: "carnivorous_plant", microSceneId: "MSC-PREDATOR-FLORA-001", proximityOnly: true, proximityRadius: 2.2, requiredMapFact: "bibleActivation:TERR-CARN-03", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "exposure", title: "Rester brièvement dans le champ pour en mesurer le risque", action: "research", target: 1, requires: Object.freeze(["approach"]), params: Object.freeze({ duration: 5000, requiredMapFact: "bibleActivation:TERR-CARN-03", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "retreat", title: "Rompre l’exposition et reprendre de la distance", action: "explore-zone", target: 1, requires: Object.freeze(["exposure"]), params: Object.freeze({ requiredMapFact: "bibleActivation:TERR-CARN-03", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je connais maintenant le prix d'une seconde de trop. J'approche, j'observe, puis je coupe l'exposition."]),
      completed: Object.freeze(["On peut l'approcher suffisamment, mais pas sans danger. Assez pour cette fois."])
    })
  });

  const TERRCARN04 = Object.freeze({
    id: "TERR-CARN-04",
    title: "Intégration du danger",
    description: "Quatrième rencontre : BlueFox intègre le danger ; il s'approche seulement assez pour valider une Observation puis se retire sans prolonger l'exposition.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 4, uniqueOnly: true, featuredMicroSceneIdsAny: Object.freeze(["MSC-PREDATOR-FLORA-001"]) }),
    bindActivationMap: true,
    primaryOnActivation: true,
    autoPrimaryEligible: true,
    priority: 227,
    passivePriorityAxis: "survival",
    ponderation: -0.75,
    sequence: Object.freeze([
      Object.freeze({ slot: "approach", title: "Approcher assez pour observer", action: "observe", target: 1, params: Object.freeze({ cuoType: "carnivorous_plant", microSceneId: "MSC-PREDATOR-FLORA-001", proximityOnly: true, proximityRadius: 2.3, requiredMapFact: "bibleActivation:TERR-CARN-04", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "retreat", title: "Rompre l’exposition et reprendre de la distance", action: "explore-zone", target: 1, requires: Object.freeze(["approach"]), params: Object.freeze({ requiredMapFact: "bibleActivation:TERR-CARN-04", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je sais ce que cette flore peut faire. Cette fois, une Observation suffit : je n'ai aucune raison de rester dans son champ d'action."]),
      completed: Object.freeze(["Dangereux, mais pas mortel si je ne reste pas trop longtemps dans son champ d'action."])
    })
  });

  const TERRSTORM01 = Object.freeze({
    id: "TERR-STORM-01",
    title: "Approcher le phénomène",
    description: "Première rencontre opportuniste avec une tempête électrostatique : BlueFox se laisse attirer jusque dans le front perturbé, reste exposé trop longtemps puis doit réellement se retirer, se reposer et se restaurer.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 1, uniqueOnly: true, featuredMicroSceneIdsAny: Object.freeze(["MSC-LOCAL-STORM-001"]) }),
    bindActivationMap: true,
    primaryOnActivation: true,
    autoPrimaryEligible: true,
    priority: 226,
    passivePriorityAxis: "survival",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 4,
    sequence: Object.freeze([
      Object.freeze({ slot: "approach", title: "Approcher assez pour observer", action: "observe", target: 1, params: Object.freeze({ cuoType: "electrostatic_storm", microSceneId: "MSC-LOCAL-STORM-001", proximityOnly: true, proximityRadius: 6.5, requiredMapFact: "bibleActivation:TERR-STORM-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "exposure", title: "Rester brièvement dans le champ pour en mesurer le risque", action: "research", target: 1, requires: Object.freeze(["approach"]), params: Object.freeze({ duration: 6500, requiredMapFact: "bibleActivation:TERR-STORM-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "retreat", title: "Rompre l’exposition et reprendre de la distance", action: "explore-zone", target: 1, requires: Object.freeze(["exposure"]), params: Object.freeze({ requiredMapFact: "bibleActivation:TERR-STORM-01", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "recover", title: "Effectuer un vrai repos après l’exposition", action: "rest", target: 1, requires: Object.freeze(["retreat"]), params: Object.freeze({}) }),
      Object.freeze({ slot: "restore", title: "Se restaurer avant de reprendre la mission précédente", action: "eat", target: 1, requires: Object.freeze(["recover"]), params: Object.freeze({}) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cette tempête perturbe tout ce qui l'entoure. Je veux sentir où commence réellement son influence..."]),
      completed: Object.freeze(["J'ai bien failli y laisser ma vie. Je dois récupérer avant de reprendre la route."])
    })
  });

  const TERRSTORM02 = Object.freeze({
    id: "TERR-STORM-02",
    title: "Survivre au danger",
    description: "Deuxième tempête distincte : BlueFox récidive malgré l'expérience, mais écourte son exposition ; la répétition laisse cette fois un souvenir négatif durable.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 2, uniqueOnly: true, featuredMicroSceneIdsAny: Object.freeze(["MSC-LOCAL-STORM-001"]) }),
    bindActivationMap: true,
    primaryOnActivation: true,
    autoPrimaryEligible: true,
    priority: 225,
    passivePriorityAxis: "survival",
    ponderation: 0.5,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "negative",
    scoreTrauma: 84,
    sequence: Object.freeze([
      Object.freeze({ slot: "approach", title: "Approcher assez pour observer", action: "observe", target: 1, params: Object.freeze({ cuoType: "electrostatic_storm", microSceneId: "MSC-LOCAL-STORM-001", proximityOnly: true, proximityRadius: 6.5, requiredMapFact: "bibleActivation:TERR-STORM-02", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "exposure", title: "Rester brièvement dans le champ pour en mesurer le risque", action: "research", target: 1, requires: Object.freeze(["approach"]), params: Object.freeze({ duration: 6000, requiredMapFact: "bibleActivation:TERR-STORM-02", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "retreat", title: "Rompre l’exposition et reprendre de la distance", action: "explore-zone", target: 1, requires: Object.freeze(["exposure"]), params: Object.freeze({ requiredMapFact: "bibleActivation:TERR-STORM-02", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "recover", title: "Effectuer un vrai repos après l’exposition", action: "rest", target: 1, requires: Object.freeze(["retreat"]), params: Object.freeze({}) }),
      Object.freeze({ slot: "restore", title: "Se restaurer avant de reprendre la mission précédente", action: "eat", target: 1, requires: Object.freeze(["recover"]), params: Object.freeze({}) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je reconnais cette signature. Je vais encore vérifier la limite, mais je ne dois pas attendre la panne pour partir."]),
      completed: Object.freeze(["C'est la deuxième fois. Je devrais vraiment faire plus attention."])
    })
  });

  const TERRSTORM03 = Object.freeze({
    id: "TERR-STORM-03",
    title: "Prudence face au danger",
    description: "Troisième tempête : BlueFox approche encore mais s'arrête plus tôt, observe le front et limite volontairement le temps passé sous perturbation.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 3, uniqueOnly: true, featuredMicroSceneIdsAny: Object.freeze(["MSC-LOCAL-STORM-001"]) }),
    bindActivationMap: true,
    primaryOnActivation: true,
    autoPrimaryEligible: true,
    priority: 224,
    passivePriorityAxis: "survival",
    ponderation: -0.5,
    souvenir: true,
    memoryValence: "negative",
    scoreTrauma: 62,
    sequence: Object.freeze([
      Object.freeze({ slot: "approach", title: "Approcher assez pour observer", action: "observe", target: 1, params: Object.freeze({ cuoType: "electrostatic_storm", microSceneId: "MSC-LOCAL-STORM-001", proximityOnly: true, proximityRadius: 6.5, requiredMapFact: "bibleActivation:TERR-STORM-03", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "exposure", title: "Rester brièvement dans le champ pour en mesurer le risque", action: "research", target: 1, requires: Object.freeze(["approach"]), params: Object.freeze({ duration: 5000, requiredMapFact: "bibleActivation:TERR-STORM-03", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "retreat", title: "Rompre l’exposition et reprendre de la distance", action: "explore-zone", target: 1, requires: Object.freeze(["exposure"]), params: Object.freeze({ requiredMapFact: "bibleActivation:TERR-STORM-03", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je connais maintenant ce front. J'approche assez pour l'Observer, pas pour lui abandonner toute mon énergie."]),
      completed: Object.freeze(["Je peux l'approcher suffisamment, mais pas sans danger. Assez pour cette fois."])
    })
  });

  const TERRSTORM04 = Object.freeze({
    id: "TERR-STORM-04",
    title: "Intégration du danger",
    description: "Quatrième tempête : BlueFox intègre le risque ; il s'approche seulement assez pour Observer puis se retire immédiatement.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "exploration.map_discovered", count: 4, uniqueOnly: true, featuredMicroSceneIdsAny: Object.freeze(["MSC-LOCAL-STORM-001"]) }),
    bindActivationMap: true,
    primaryOnActivation: true,
    autoPrimaryEligible: true,
    priority: 223,
    passivePriorityAxis: "survival",
    ponderation: -0.75,
    sequence: Object.freeze([
      Object.freeze({ slot: "approach", title: "Approcher assez pour observer", action: "observe", target: 1, params: Object.freeze({ cuoType: "electrostatic_storm", microSceneId: "MSC-LOCAL-STORM-001", proximityOnly: true, proximityRadius: 6.5, requiredMapFact: "bibleActivation:TERR-STORM-04", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "retreat", title: "Rompre l’exposition et reprendre de la distance", action: "explore-zone", target: 1, requires: Object.freeze(["approach"]), params: Object.freeze({ requiredMapFact: "bibleActivation:TERR-STORM-04", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je n'ai plus besoin d'entrer profondément dans le front. Une Observation courte suffit."]),
      completed: Object.freeze(["Dangereux, mais pas mortel si je ne reste pas trop longtemps dans son champ d'action."])
    })
  });

  const TP10 = Object.freeze({
    id: "TP-10",
    title: "Assembler l’impossible",
    description: "Assembler puis activer, sur le point fixe ASTROLOGY réellement placé, le hub unique qui reliera les balises déjà déployées sans encore transporter BlueFox.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-09", count: 1 }),
    prerequisites: Object.freeze(["TP-09"]),
    priority: 192,
    passivePriorityAxis: "engineering",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 118,
    sequence: Object.freeze([
      Object.freeze({
        slot: "assemble",
        title: "Assembler et activer le hub au cœur d’ASTROLOGY",
        action: "research",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ catalogManaged: true, eventDriven: true })
      })
    ]),
    runtimeValidation: Object.freeze({ type: "teleporter-activation", slot: "assemble" }),
    effects: Object.freeze([
      Object.freeze({ type: "inventory.consume", inventoryKeys: Object.freeze(["stellar_iridium", "energy_crystal"]), quantity: 30 }),
      Object.freeze({ type: "inventory.consume", inventoryKeys: Object.freeze(["magnetic_ore", "azure_ferrite", "resonant_basalt", "stellar_iridium", "crystal", "energy_crystal"]), quantity: 70 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "parts", quantity: 50 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "core", quantity: 20 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "fiber", quantity: 100 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "accumulator", quantity: 10 }),
      Object.freeze({ type: "inventory.consume", inventoryKey: "biocapital", quantity: 50 })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le réseau, les matériaux et le point fixe sont prêts. Il reste à faire de cette architecture une machine réelle, ici, au cœur d’ASTROLOGY."]),
      completed: Object.freeze(["Le point fixe répond. Les balises ne sont toujours que des ancrages distants, mais le hub sait maintenant les atteindre. Le prochain passage sera le mien."])
    })
  });

  const TP11 = Object.freeze({
    id: "TP-11",
    title: "De l’autre côté",
    description: "Préparer la matière, synchroniser une balise réellement déployée, effectuer le premier passage BlueFox du hub vers cette balise puis revenir par la même architecture hub–balise.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-10", count: 1 }),
    prerequisites: Object.freeze(["TP-10"]),
    priority: 191,
    passivePriorityAxis: "engineering",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 5,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 132,
    sequence: Object.freeze([
      Object.freeze({
        slot: "calibrateNetwork",
        title: "Calibrer ASTROLOGY sur quatre balises persistantes",
        action: "research",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({ catalogManaged: true, eventDriven: true })
      }),
      Object.freeze({
        slot: "inertTransfer",
        title: "Confirmer le transfert d’une matière inerte vers la balise synchronisée",
        action: "research",
        target: 1,
        requires: Object.freeze(["calibrateNetwork"]),
        params: Object.freeze({ catalogManaged: true, eventDriven: true })
      }),
      Object.freeze({
        slot: "outbound",
        title: "Effectuer le premier passage du hub vers une balise",
        action: "travel",
        target: 1,
        requires: Object.freeze(["inertTransfer"]),
        params: Object.freeze({
          eventDriven: true,
          direction: "teleport-outbound",
          transitionSource: "teleporter",
          transitionMode: "teleport",
          distinctBy: "transition",
          completionArrivalFact: "tp11:firstDestination",
          completionArrivalField: "mapId"
        })
      }),
      Object.freeze({
        slot: "returnHub",
        title: "Revenir de la balise vers le téléporteur central",
        action: "travel",
        target: 1,
        requires: Object.freeze(["outbound"]),
        params: Object.freeze({
          eventDriven: true,
          direction: "teleport-return",
          transitionSource: "teleporter",
          transitionMode: "teleport",
          distinctBy: "transition"
        })
      })
    ]),
    runtimeValidation: Object.freeze({ type: "teleporter-first-passage", calibrationSlot: "calibrateNetwork", inertTransferSlot: "inertTransfer" }),
    narrative: Object.freeze({
      revealed: Object.freeze(["J’ai déplacé des échantillons. Maintenant il n’y a plus de modèle réduit : je vais synchroniser une balise du réseau et traverser moi-même."]),
      completed: Object.freeze(["Je suis revenu. Le passage n’est plus une hypothèse ni une expérience de matière : ASTROLOGY et les balises forment désormais un réseau de voyage réel, que j’utiliserai seulement quand je le déciderai."])
    })
  });

  const TPAFTER01 = Object.freeze({
    id: "TP-AFTER-01",
    title: "Le monde paraît plus petit",
    description: "Utiliser réellement le réseau depuis ASTROLOGY pour rejoindre une balise déjà déployée sur un territoire connu.",
    pattern: "TRAVEL_CYCLE",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-11", count: 1 }),
    prerequisites: Object.freeze(["TP-11"]),
    priority: 190,
    passivePriorityAxis: "engineering",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 4,
    slots: Object.freeze({
      travel: Object.freeze({
        title: "Rejoindre une ancienne balise par le téléporteur",
        target: 1,
        params: Object.freeze({
          eventDriven: true,
          transitionSource: "teleporter",
          transitionMode: "teleport",
          distinctBy: "transition"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le premier passage a fonctionné. Je veux maintenant utiliser ce réseau comme un vrai moyen de voyage, pas comme une expérience isolée."]),
      completed: Object.freeze(["Une distance qui me demandait autrefois plusieurs passages tient maintenant dans un seul transfert. Le monde paraît soudain plus petit."])
    })
  });

  const TPAFTER02 = Object.freeze({
    id: "TP-AFTER-02",
    title: "Le chemin du retour",
    description: "Depuis la balise atteinte, utiliser réellement le réseau pour revenir au hub ASTROLOGY sans refaire physiquement tout le trajet.",
    pattern: "TRAVEL_CYCLE",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-AFTER-01", count: 1 }),
    prerequisites: Object.freeze(["TP-AFTER-01"]),
    priority: 189,
    passivePriorityAxis: "engineering",
    ponderation: 0.75,
    obsessionEligible: true,
    obsessionIntensity: 3,
    slots: Object.freeze({
      travel: Object.freeze({
        title: "Revenir de la balise vers ASTROLOGY",
        target: 1,
        params: Object.freeze({
          eventDriven: true,
          transitionSource: "teleporter",
          transitionMode: "teleport",
          distinctBy: "transition"
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Partir est utile. Pouvoir revenir sans refaire toute la route, c'est ce qui transforme vraiment ce réseau en infrastructure."]),
      completed: Object.freeze(["ASTROLOGY est de nouveau devant moi. Le réseau ne raccourcit pas seulement l'aller : il rend les longues expéditions réversibles."])
    })
  });

  const TPAFTER03 = Object.freeze({
    id: "TP-AFTER-03",
    title: "Cela peut servir à autre chose",
    description: "Utiliser le téléporteur pour rejoindre un territoire balisé puis reprendre réellement une mission qui était déjà ouverte avant le transfert.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-AFTER-02", count: 1 }),
    prerequisites: Object.freeze(["TP-AFTER-02"]),
    priority: 188,
    passivePriorityAxis: "engineering",
    ponderation: 0.5,
    obsessionEligible: true,
    obsessionIntensity: 2,
    sequence: Object.freeze([
      Object.freeze({
        slot: "teleportToOpenMission",
        title: "Utiliser le réseau pour rejoindre un territoire balisé",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          transitionSource: "teleporter",
          transitionMode: "teleport",
          distinctBy: "transition"
        })
      }),
      Object.freeze({
        slot: "resumeMission",
        title: "Faire progresser une mission déjà ouverte avant le transfert",
        action: "research",
        target: 1,
        requires: Object.freeze(["teleportToOpenMission"]),
        params: Object.freeze({ catalogManaged: true, eventDriven: true })
      })
    ]),
    runtimeValidation: Object.freeze({
      type: "mission-progress-after-slot",
      slot: "resumeMission",
      afterSlot: "teleportToOpenMission",
      excludeMissionIds: Object.freeze(["TP-AFTER-01", "TP-AFTER-02", "TP-AFTER-03", "TP-AFTER-04"])
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le réseau n'a de valeur que s'il me permet de reprendre ce que j'avais laissé loin derrière. Je vais m'en servir pour une mission déjà ouverte."]),
      completed: Object.freeze(["Ce n'est plus un projet à part. Le téléporteur vient de m'aider à reprendre un travail qui existait déjà : il fait maintenant partie de mes outils."])
    })
  });

  const TPAFTER04 = Object.freeze({
    id: "TP-AFTER-04",
    title: "Et maintenant ?",
    description: "Constater que le téléporteur est devenu une infrastructure transversale, puis laisser les autres priorités reprendre naturellement leur place.",
    pattern: "NARRATIVE_ONLY",
    narrativeOnly: true,
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-AFTER-03", count: 1 }),
    prerequisites: Object.freeze(["TP-AFTER-03"]),
    priority: 187,
    passivePriorityAxis: "engineering",
    ponderation: 0.1,
    obsessionEligible: false,
    slots: Object.freeze({}),
    narrative: Object.freeze({
      revealed: Object.freeze(["J'ai passé tant de temps à comprendre comment franchir ces distances. Maintenant que le réseau fonctionne vraiment, je n'ai plus besoin d'en faire le centre de tout."]),
      completed: Object.freeze(["Le téléporteur restera là quand j'en aurai besoin. Pour l'instant, d'autres questions attendent encore leurs réponses."])
    })
  });


  const EXPLONG01 = Object.freeze({
    id: "EXP-LONG-01",
    title: "Plus loin que prévu",
    description: "Après la clôture de l’arc Téléportation, découvrir dix nouvelles maps depuis l’activation, établir un relais sur la frontière atteinte puis utiliser réellement ce relais pour revenir au hub.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "TP-AFTER-04", count: 1 }),
    prerequisites: Object.freeze(["TP-AFTER-04"]),
    priority: 176,
    passivePriorityAxis: "exploration",
    ponderation: 0.65,
    obsessionEligible: false,
    navigation: Object.freeze({ autonomousUnknownTravel: true, repeatUnknownTravelUntilComplete: true, autonomousKnownReturn: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "explore", title: "Découvrir 10 nouvelles maps", action: "travel", target: 10, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", completionArrivalFact: "expLong01:frontier", completionArrivalField: "mapId" }) }),
      Object.freeze({ slot: "deployBeacon", title: "Implanter une balise persistante sur la frontière atteinte", action: "research", target: 1, requires: Object.freeze(["explore"]), params: Object.freeze({ catalogManaged: true, eventDriven: true, requiredMapFact: "expLong01:frontier", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "returnHub", title: "Utiliser ce relais pour revenir à ASTROLOGY", action: "travel", target: 1, requires: Object.freeze(["deployBeacon"]), params: Object.freeze({ eventDriven: true, direction: "teleport-return", transitionSource: "teleporter", transitionMode: "teleport", distinctBy: "transition", targetMapFact: "expLong01:hubTarget", targetMapField: "mapId" }) })
    ]),
    runtimeValidation: Object.freeze({ type: "long-expedition", beaconSlot: "deployBeacon", beaconMapFact: "expLong01:frontier", beaconFact: "expLong01:beacon", hubTargetFact: "expLong01:hubTarget" }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le réseau fonctionne. Maintenant je veux voir jusqu’où il me permet réellement de pousser une expédition sans transformer chaque retour en marche arrière interminable."]),
      completed: Object.freeze(["Dix nouvelles zones plus loin, ce relais change déjà la forme du voyage : je peux avancer sans perdre le chemin du retour."])
    })
  });

  const EXPLONG02 = Object.freeze({
    id: "EXP-LONG-02",
    title: "Là où le terrain change",
    description: "Découvrir douze nouvelles maps, identifier un territoire réellement rare ou remarquable produit par le générateur normal, y mener une étude réelle puis y implanter une balise persistante.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "EXP-LONG-01", count: 1 }),
    prerequisites: Object.freeze(["EXP-LONG-01"]),
    priority: 175,
    passivePriorityAxis: "exploration",
    ponderation: 0.6,
    obsessionEligible: false,
    navigation: Object.freeze({ autonomousUnknownTravel: true, repeatUnknownTravelUntilComplete: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "explore", title: "Découvrir 12 nouvelles maps", action: "travel", target: 12, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "remarkable", title: "Identifier un territoire rare ou remarquable réellement rencontré", action: "research", target: 1, requires: Object.freeze(["explore"]), params: Object.freeze({ catalogManaged: true, eventDriven: true, requiredMapFact: "expLong02:remarkable", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "study", title: "Étudier réellement un élément de ce territoire", action: "research", target: 1, requires: Object.freeze(["remarkable"]), params: Object.freeze({ catalogManaged: true, eventDriven: true, requiredMapFact: "expLong02:remarkable", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "deployBeacon", title: "Implanter une balise dans cette région", action: "research", target: 1, requires: Object.freeze(["study"]), params: Object.freeze({ catalogManaged: true, eventDriven: true, requiredMapFact: "expLong02:remarkable", requiredMapField: "mapId" }) })
    ]),
    runtimeValidation: Object.freeze({ type: "long-expedition", remarkableSlot: "remarkable", remarkableFact: "expLong02:remarkable", studySlot: "study", beaconSlot: "deployBeacon", beaconMapFact: "expLong02:remarkable", beaconFact: "expLong02:beacon" }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je peux aller loin. Ce qui m’intéresse maintenant, c’est l’endroit où le terrain cesse d’être seulement une variation de ce que je connais déjà."]),
      completed: Object.freeze(["Cette région mérite un point fixe. Le réseau commence à relier des différences du monde, pas seulement des distances."])
    })
  });

  const EXPLONG03 = Object.freeze({
    id: "EXP-LONG-03",
    title: "Une base dans l’inconnu",
    description: "Entrer dans le réseau par une ancienne destination balisée, repartir depuis ce secteur, découvrir dix nouvelles maps supplémentaires et établir un nouveau relais sur cette nouvelle frontière.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "EXP-LONG-02", count: 1 }),
    prerequisites: Object.freeze(["EXP-LONG-02"]),
    priority: 174,
    passivePriorityAxis: "exploration",
    ponderation: 0.6,
    obsessionEligible: false,
    navigation: Object.freeze({ autonomousUnknownTravel: true, repeatUnknownTravelUntilComplete: true, autonomousKnownReturn: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "teleportStart", title: "Rejoindre une destination balisée par ASTROLOGY", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, direction: "teleport-outbound", transitionSource: "teleporter", transitionMode: "teleport", distinctBy: "transition", targetMapFact: "expLong03:targetBeacon", targetMapField: "mapId", completionArrivalFact: "expLong03:startBeacon", completionArrivalField: "mapId" }) }),
      Object.freeze({ slot: "explore", title: "Découvrir 10 nouvelles maps au-delà de ce relais", action: "travel", target: 10, requires: Object.freeze(["teleportStart"]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", completionArrivalFact: "expLong03:frontier", completionArrivalField: "mapId" }) }),
      Object.freeze({ slot: "deployBeacon", title: "Créer un second relais profond", action: "research", target: 1, requires: Object.freeze(["explore"]), params: Object.freeze({ catalogManaged: true, eventDriven: true, requiredMapFact: "expLong03:frontier", requiredMapField: "mapId" }) })
    ]),
    runtimeValidation: Object.freeze({ type: "long-expedition", teleportTargetFact: "expLong03:targetBeacon", beaconSlot: "deployBeacon", beaconMapFact: "expLong03:frontier", beaconFact: "expLong03:beacon", excludeBeaconMapFact: "expLong03:startBeacon" }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Une balise n’est pas seulement un point de retour. Elle peut devenir le début d’une nouvelle expédition, bien plus loin que le hub lui-même."]),
      completed: Object.freeze(["Le réseau a maintenant une profondeur : un ancien relais m’a permis d’en construire un autre encore plus loin."])
    })
  });

  const EXPLONG04 = Object.freeze({
    id: "EXP-LONG-04",
    title: "Quelque chose au bout du chemin",
    description: "Découvrir douze nouvelles maps, rencontrer un territoire réellement rare ou remarquable, y effectuer une étude canonique réelle puis y fixer une balise sans créer ni forcer artificiellement le phénomène rencontré.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "EXP-LONG-03", count: 1 }),
    prerequisites: Object.freeze(["EXP-LONG-03"]),
    priority: 173,
    passivePriorityAxis: "research",
    ponderation: 0.55,
    obsessionEligible: false,
    navigation: Object.freeze({ autonomousUnknownTravel: true, repeatUnknownTravelUntilComplete: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "explore", title: "Découvrir 12 nouvelles maps", action: "travel", target: 12, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId" }) }),
      Object.freeze({ slot: "remarkable", title: "Identifier un territoire remarquable réellement généré", action: "research", target: 1, requires: Object.freeze(["explore"]), params: Object.freeze({ catalogManaged: true, eventDriven: true, requiredMapFact: "expLong04:remarkable", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "study", title: "Observer, inspecter ou analyser réellement ce territoire", action: "research", target: 1, requires: Object.freeze(["remarkable"]), params: Object.freeze({ catalogManaged: true, eventDriven: true, requiredMapFact: "expLong04:remarkable", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "deployBeacon", title: "Implanter une balise dans cette région", action: "research", target: 1, requires: Object.freeze(["study"]), params: Object.freeze({ catalogManaged: true, eventDriven: true, requiredMapFact: "expLong04:remarkable", requiredMapField: "mapId" }) })
    ]),
    runtimeValidation: Object.freeze({ type: "long-expedition", remarkableSlot: "remarkable", remarkableFact: "expLong04:remarkable", studySlot: "study", beaconSlot: "deployBeacon", beaconMapFact: "expLong04:remarkable", beaconFact: "expLong04:beacon" }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Je ne cherche pas à fabriquer une découverte. Je veux continuer assez loin pour que le monde finisse par m’en proposer une que je n’avais pas prévue."]),
      completed: Object.freeze(["Je n’ai pas créé ce lieu pour ma mission. Je l’ai trouvé, étudié, puis relié au reste du monde. C’est exactement ce que je voulais."])
    })
  });

  const EXPLONG05 = Object.freeze({
    id: "EXP-LONG-05",
    title: "Un monde relié",
    description: "Mener une dernière expédition de dix nouvelles maps, établir un nouveau relais, revenir réellement à ASTROLOGY puis utiliser le réseau vers une autre balise connue distincte du relais nouvellement posé.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "EXP-LONG-04", count: 1 }),
    prerequisites: Object.freeze(["EXP-LONG-04"]),
    priority: 172,
    passivePriorityAxis: "exploration",
    ponderation: 0.45,
    obsessionEligible: false,
    navigation: Object.freeze({ autonomousUnknownTravel: true, repeatUnknownTravelUntilComplete: true, autonomousKnownReturn: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "explore", title: "Découvrir 10 nouvelles maps", action: "travel", target: 10, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", completionArrivalFact: "expLong05:frontier", completionArrivalField: "mapId" }) }),
      Object.freeze({ slot: "deployBeacon", title: "Implanter un nouveau relais", action: "research", target: 1, requires: Object.freeze(["explore"]), params: Object.freeze({ catalogManaged: true, eventDriven: true, requiredMapFact: "expLong05:frontier", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "returnHub", title: "Revenir réellement à ASTROLOGY par ce relais", action: "travel", target: 1, requires: Object.freeze(["deployBeacon"]), params: Object.freeze({ eventDriven: true, direction: "teleport-return", transitionSource: "teleporter", transitionMode: "teleport", distinctBy: "transition", targetMapFact: "expLong05:hubTarget", targetMapField: "mapId" }) }),
      Object.freeze({ slot: "otherBeacon", title: "Repartir vers une autre balise connue", action: "travel", target: 1, requires: Object.freeze(["returnHub"]), params: Object.freeze({ eventDriven: true, direction: "teleport-outbound", transitionSource: "teleporter", transitionMode: "teleport", distinctBy: "transition", targetMapFact: "expLong05:otherBeaconTarget", targetMapField: "mapId" }) })
    ]),
    runtimeValidation: Object.freeze({ type: "long-expedition", beaconSlot: "deployBeacon", beaconMapFact: "expLong05:frontier", beaconFact: "expLong05:beacon", hubTargetFact: "expLong05:hubTarget", teleportTargetFact: "expLong05:otherBeaconTarget", excludeTeleportMapFact: "expLong05:beacon" }),
    narrative: Object.freeze({
      revealed: Object.freeze(["Une dernière longue route. Pas pour prouver que le téléporteur fonctionne, mais pour vérifier que le réseau est devenu une partie naturelle de ma manière de parcourir ce monde."]),
      completed: Object.freeze(["Les relais ne sont plus des expériences séparées. Ils forment maintenant un monde relié dans lequel je peux partir loin, revenir, puis repartir ailleurs."])
    })
  });

  const ENDCHOICE = Object.freeze({
    id: "END-CHOICE",
    title: "Là où je suis arrivé",
    description: "Lorsque le parcours est suffisamment mûr, revenir réellement au Camp puis choisir de rester sur ce monde ou de chercher un moyen de rentrer.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "EXP-LONG-05", count: 1 }),
    prerequisites: Object.freeze(["EXP-LONG-05", "ENV-WORLD-20", "SIS-03", "ANN-07"]),
    priority: 171,
    passivePriorityAxis: "exploration",
    ponderation: 0.2,
    obsessionEligible: false,
    navigation: Object.freeze({ autonomousKnownReturn: true }),
    sequence: Object.freeze([
      Object.freeze({
        slot: "returnCamp",
        title: "Revenir réellement au Camp",
        action: "travel",
        target: 1,
        requires: Object.freeze([]),
        params: Object.freeze({
          eventDriven: true,
          catalogManaged: true,
          toMapId: "crystal",
          distinctBy: "transition"
        })
      }),
      Object.freeze({
        slot: "decision",
        title: "Décider de la suite du voyage",
        action: "research",
        target: 1,
        requires: Object.freeze(["returnCamp"]),
        params: Object.freeze({ eventDriven: true, catalogManaged: true })
      })
    ]),
    proximityContexts: Object.freeze([
      Object.freeze({ id: "end-choice-camp", microSceneId: "MSC-CUSTOM-CAMP", fact: "endChoice:campReached", slot: "returnCamp", radius: 10 }),
      Object.freeze({ id: "end-choice-refuge", microSceneId: "MSC-CUSTOM-CAMP-BASE", fact: "endChoice:campReached", slot: "returnCamp", radius: 10 }),
      Object.freeze({ id: "end-choice-base", microSceneId: "MSC-CUSTOM-CAMP-BASE-REINFORCED", fact: "endChoice:campReached", slot: "returnCamp", radius: 10 })
    ]),
    runtimeValidation: Object.freeze({
      type: "mission-choice",
      slot: "decision",
      fact: "endChoice:decision",
      options: Object.freeze([
        Object.freeze({ id: "stay", label: "Rester", text: "Rester ici et continuer à explorer ce monde." }),
        Object.freeze({ id: "return", label: "Trouver un moyen de rentrer", text: "Chercher maintenant un moyen de revenir au point de départ." })
      ])
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["J’ai relié des régions lointaines, compris des fragments de ce monde et rencontré ceux qui l’habitent. Avant d’aller plus loin, j’ai envie de revenir là où tout a commencé."]),
      progress: Object.freeze([Object.freeze({ slot: "returnCamp", atCount: 1, text: "Le Camp est toujours là. Tout ce chemin a commencé ici, et la question que j’évitais jusque-là est devenue impossible à repousser." })]),
      completed: Object.freeze(["J’ai choisi. Ce choix ne ferme pas ce monde ; il décide seulement de ce que je vais chercher maintenant."])
    })
  });


  const FIN01 = Object.freeze({
    id: "FIN-01",
    title: "Ce qu'ils m'ont appris",
    description: "Revenir au Temple des savoirs, confronter une dernière fois les acquis du voyage aux archives communes, dire au revoir aux Rocky et aux Translucides puis synthétiser le Noyau de navigation résonante.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "END-CHOICE", count: 1 }),
    prerequisites: Object.freeze(["END-CHOICE"]),
    requiredFactValues: Object.freeze([
      Object.freeze({ fact: "endChoice:decision", field: "choiceId", equals: "return" })
    ]),
    priority: 170,
    passivePriorityAxis: "research",
    ponderation: 0.25,
    obsessionEligible: false,
    navigation: Object.freeze({ autonomousKnownReturn: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "returnTemple", title: "Revenir au Temple des savoirs", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, targetMapFact: "dip03:temple-map", targetMapField: "mapId", distinctBy: "transition" }) }),
      Object.freeze({ slot: "archive", title: "Relire l'archive commune avec tout ce qui a été appris", action: "analyze", target: 1, requires: Object.freeze(["returnTemple"]), params: Object.freeze({ cuoType: "tech_relic", microSceneId: "MSC-CUSTOM-HUGE-TEMPLE", requiredMapFact: "dip03:temple-map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "farewellRocky", title: "Dire au revoir à un délégué Rocky", action: "observe", target: 1, requires: Object.freeze(["archive"]), params: Object.freeze({ cuoType: "npc_rocky", persistentMicroSceneId: "DIP-03:delegate:rocky:1", requiredMapFact: "dip03:temple-map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "farewellTranslucent", title: "Dire au revoir à un délégué Translucide", action: "observe", target: 1, requires: Object.freeze(["archive"]), params: Object.freeze({ cuoType: "npc_translucent", persistentMicroSceneId: "DIP-03:delegate:translucent:1", requiredMapFact: "dip03:temple-map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "synthesizeCore", title: "Synthétiser le Noyau de navigation résonante", action: "research", target: 1, requires: Object.freeze(["farewellRocky", "farewellTranslucent"]), params: Object.freeze({ requiredMapFact: "dip03:temple-map", requiredMapField: "mapId" }) })
    ]),
    slotInventoryGrantEffects: Object.freeze([Object.freeze({
      slot: "synthesizeCore",
      inventoryKey: "resonant_navigation_core",
      quantity: 1,
      fact: "fin:resonant-core",
      value: Object.freeze({ componentId: "resonant_navigation_core", label: "Noyau de navigation résonante", mapId: "custom-map-33-temple-magnet" })
    })]),
    rewards: Object.freeze([Object.freeze({
      type: "research.knowledge",
      id: "resonant_navigation_core",
      category: "final-synthesis",
      label: "Noyau de navigation résonante",
      description: "Synthèse finale des acquis énergétiques, géologiques, d'ingénierie, du réseau, du savoir ancien et des connaissances partagées avec les civilisations."
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Si je veux vraiment rentrer, je ne peux pas chercher une pièce miraculeuse. Tout ce qu'il me faut existe déjà dans ce que ce monde m'a appris."]),
      progress: Object.freeze([
        Object.freeze({ slot: "archive", atCount: 1, text: "Énergie, géologie, réseau, machines, archives anciennes… séparément, ce sont des découvertes. Ensemble, elles décrivent une manière de retrouver un chemin." }),
        Object.freeze({ slot: "farewellRocky", atCount: 1, text: "Les Rocky n'ont pas besoin de comprendre mon départ pour savoir qu'il compte." }),
        Object.freeze({ slot: "farewellTranslucent", atCount: 1, text: "Les Translucides répondent à leur manière. Ce monde ne m'est plus étranger comme au premier jour." })
      ]),
      completed: Object.freeze(["Le Noyau est prêt. Ce n'est pas une technologie trouvée toute faite : c'est la forme que prend tout ce que j'ai appris ici lorsque je l'oriente vers un seul objectif — retrouver le chemin du départ."])
    })
  });

  const FIN02 = Object.freeze({
    id: "FIN-02",
    title: "Le point de départ",
    description: "Revenir à la capsule de crash, intégrer le Noyau de navigation résonante puis tenter le départ.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "FIN-01", count: 1 }),
    prerequisites: Object.freeze(["FIN-01"]),
    requiredFacts: Object.freeze(["fin:resonant-core"]),
    priority: 169,
    passivePriorityAxis: "engineering",
    ponderation: 0.2,
    obsessionEligible: false,
    navigation: Object.freeze({ autonomousKnownReturn: true }),
    sequence: Object.freeze([
      Object.freeze({ slot: "returnCapsule", title: "Revenir à la capsule", action: "travel", target: 1, requires: Object.freeze([]), params: Object.freeze({ eventDriven: true, toMapId: "crystal", distinctBy: "transition" }) }),
      Object.freeze({ slot: "integrateCore", title: "Intégrer le Noyau de navigation résonante à la capsule", action: "analyze", target: 1, requires: Object.freeze(["returnCapsule"]), params: Object.freeze({ cuoType: "crash_capsule", eventDriven: true, catalogManaged: true }) }),
      Object.freeze({ slot: "depart", title: "Entrer dans la capsule", action: "research", target: 1, requires: Object.freeze(["integrateCore"]), params: Object.freeze({ eventDriven: true, catalogManaged: true }) })
    ]),
    runtimeValidation: Object.freeze({
      type: "final-departure",
      slot: "depart",
      integrationSlot: "integrateCore",
      integrationInventoryKey: "resonant_navigation_core",
      integrationQuantity: 1,
      integrationFact: "fin:capsule-core-integrated",
      requiredFact: "fin:capsule-core-integrated",
      mapId: "crystal"
    }),
    narrative: Object.freeze({
      revealed: Object.freeze(["La capsule est toujours l'épave du premier jour. Le Noyau ne répare pas rétroactivement ce qui s'est passé ; il lui donne seulement, maintenant, une possibilité qu'elle n'avait jamais eue."]),
      progress: Object.freeze([Object.freeze({ slot: "integrateCore", atCount: 1, text: "Le Noyau répond. Pour la première fois depuis le crash, la capsule n'est peut-être plus seulement un point d'origine." })]),
      completed: Object.freeze(["Le reste appartient au chemin que BlueFox choisit de reprendre."])
    })
  });

  const CART02 = Object.freeze({
    id: "CART-02",
    title: "La traversée de la brume toxique",
    description: "Cartographier localement une nappe de brume réelle avec BlueFox puis le Scout afin d'identifier sa distribution sur le territoire sans introduire de capteur ou de support météo fictif.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "PHEN-01", count: 1 }),
    prerequisites: Object.freeze(["PHEN-01"]),
    priority: 186,
    passivePriorityAxis: "exploration",
    ponderation: 0.9,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "mixed",
    scoreTrauma: 44,
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({
      biome: "swamp",
      requiredObjects: Object.freeze([Object.freeze({ type: "fog_bank", count: 2, contextRole: "cart02FogField" })])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reach", title: "Découvrir un territoire couvert de brume", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", completionArrivalFact: "cart02:map", completionArrivalField: "mapId" }) }),
      Object.freeze({ slot: "bluefoxFog", title: "Observer personnellement une nappe de brume", action: "observe", target: 1, requires: Object.freeze(["reach"]), params: Object.freeze({ cuoType: "fog_bank", actor: "bluefox", requiredMapFact: "cart02:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "scoutConfirm", title: "Faire relever cette même nappe par le Scout", action: "observe", target: 1, requires: Object.freeze(["bluefoxFog"]), params: Object.freeze({ cuoType: "fog_bank", actor: "scout", remote: false, requiredMapFact: "cart02:map", requiredMapField: "mapId", relation: Object.freeze({ fromSlot: "bluefoxFog", sameBy: Object.freeze(["instanceId"]) }) }) }),
      Object.freeze({ slot: "explore", title: "Explorer 45 % du territoire pour contourner la nappe", action: "explore-zone", target: 45, requires: Object.freeze(["scoutConfirm"]), params: Object.freeze({ scope: "map", metric: "surfacePercent", threshold: 45, requiredMapFact: "cart02:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "distribution", title: "Faire relever deux nappes distinctes sur le territoire", action: "observe", target: 2, requires: Object.freeze(["explore"]), params: Object.freeze({ cuoType: "fog_bank", actor: "scout", remote: false, distinctBy: "instanceId", requiredMapFact: "cart02:map", requiredMapField: "mapId" }) })
    ]),
    proximityContexts: Object.freeze([Object.freeze({
      id: "cart02-fog-proximity",
      cuoType: "fog_bank",
      fact: "cart02:fog-proximity",
      slot: "bluefoxFog",
      radius: 4.8,
      requiresSlotComplete: "reach",
      requiredMapFact: "cart02:map",
      requiredMapField: "mapId"
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Cette brume masque le terrain plus qu'elle ne le transforme. Si je veux la traverser sans tourner en rond, je dois d'abord comprendre où elle s'accumule." ]),
      completed: Object.freeze(["La nappe n'est pas uniforme. J'ai maintenant une première carte locale de ses zones denses et de ses passages praticables."])
    })
  });

  const CART01 = Object.freeze({
    id: "CART-01",
    title: "L'écho des cristaux sonores",
    description: "Cartographier un secteur cristallin en comparant cristal, basalte résonant et aiguilles cristallines ; leur caractère 'sonore' reste une lecture narrative du milieu, pas un nouveau type d'objet.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CART-02", count: 1 }),
    prerequisites: Object.freeze(["CART-02"]),
    priority: 185,
    passivePriorityAxis: "research",
    ponderation: 0.95,
    obsessionEligible: true,
    obsessionIntensity: 3,
    souvenir: true,
    memoryValence: "positive",
    scoreTrauma: 32,
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({
      biome: "crystalline",
      requiredObjects: Object.freeze([
        Object.freeze({ type: "crystal", count: 1, contextRole: "cart01Crystal" }),
        Object.freeze({ type: "resonant_basalt", count: 1, contextRole: "cart01ResonantBasalt" }),
        Object.freeze({ type: "needle", count: 1, contextRole: "cart01BlueCrystals" })
      ])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reach", title: "Découvrir un territoire cristallin", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", completionArrivalFact: "cart01:map", completionArrivalField: "mapId" }) }),
      Object.freeze({ slot: "explore", title: "Explorer 40 % du secteur cristallin", action: "explore-zone", target: 40, requires: Object.freeze(["reach"]), params: Object.freeze({ scope: "map", metric: "surfacePercent", threshold: 40, requiredMapFact: "cart01:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "analyzeCrystal", title: "Analyser un cristal du secteur", action: "analyze", target: 1, requires: Object.freeze(["explore"]), params: Object.freeze({ cuoType: "crystal", requiredMapFact: "cart01:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "analyzeBasalt", title: "Analyser un basalte résonant du secteur", action: "analyze", target: 1, requires: Object.freeze(["analyzeCrystal"]), params: Object.freeze({ cuoType: "resonant_basalt", requiredMapFact: "cart01:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "analyzeNeedle", title: "Analyser les cristaux bleus du secteur", action: "analyze", target: 1, requires: Object.freeze(["analyzeBasalt"]), params: Object.freeze({ cuoType: "needle", requiredMapFact: "cart01:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "scoutCrystal", title: "Faire relever la signature du cristal par le Scout", action: "observe", target: 1, requires: Object.freeze(["analyzeNeedle"]), params: Object.freeze({ cuoType: "crystal", actor: "scout", remote: false, requiredMapFact: "cart01:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "scoutBasalt", title: "Faire relever la signature du basalte résonant par le Scout", action: "observe", target: 1, requires: Object.freeze(["scoutCrystal"]), params: Object.freeze({ cuoType: "resonant_basalt", actor: "scout", remote: false, requiredMapFact: "cart01:map", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "scoutNeedle", title: "Faire relever la signature des cristaux bleus par le Scout", action: "observe", target: 1, requires: Object.freeze(["scoutBasalt"]), params: Object.freeze({ cuoType: "needle", actor: "scout", remote: false, requiredMapFact: "cart01:map", requiredMapField: "mapId" }) })
    ]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Le vent ne fait pas réagir toutes les formations de la même façon. Le cristal, le basalte résonant et les cristaux bleus composent chacun une voix différente du paysage." ]),
      completed: Object.freeze(["Leur 'chant' n'est pas un nouvel objet à mesurer : c'est la manière dont trois structures minérales différentes révèlent l'organisation du terrain."])
    })
  });

  const CART03 = Object.freeze({
    id: "CART-03",
    title: "L'abysse atmosphérique",
    description: "Établir une cartographie atmosphérique régionale à partir d'un contexte de référence puis de relevés Scout provenant de plusieurs territoires réellement distincts.",
    pattern: "SEQUENCE_ACTIONS",
    trigger: Object.freeze({ type: "progression.mission_completed", missionId: "CART-01", count: 1 }),
    prerequisites: Object.freeze(["CART-01"]),
    priority: 184,
    passivePriorityAxis: "research",
    ponderation: 1,
    obsessionEligible: true,
    obsessionIntensity: 4,
    souvenir: true,
    memoryValence: "mixed",
    scoreTrauma: 48,
    navigation: Object.freeze({ autonomousUnknownTravel: true, singleUnknownTransition: true }),
    mapGeneration: Object.freeze({
      requiredObjects: Object.freeze([Object.freeze({ type: "fog_bank", count: 1, contextRole: "cart03ReferenceFlow" })])
    }),
    sequence: Object.freeze([
      Object.freeze({ slot: "reachReference", title: "Découvrir un nouveau contexte atmosphérique de référence", action: "travel", target: 1, params: Object.freeze({ eventDriven: true, newOnly: true, distinctBy: "mapId", completionArrivalFact: "cart03:referenceMap", completionArrivalField: "mapId" }) }),
      Object.freeze({ slot: "reference", title: "Analyser le phénomène atmosphérique de référence", action: "analyze", target: 1, requires: Object.freeze(["reachReference"]), params: Object.freeze({ cuoType: "fog_bank", actor: "bluefox", requiredMapFact: "cart03:referenceMap", requiredMapField: "mapId" }) }),
      Object.freeze({ slot: "regionalSurvey", title: "Obtenir des relevés Scout sur trois territoires distincts", action: "observe", target: 3, requires: Object.freeze(["reference"]), params: Object.freeze({ cuoTypes: Object.freeze(["fog_bank", "electrostatic_storm"]), actor: "scout", distinctBy: "mapId" }) }),
      Object.freeze({ slot: "synthesis", title: "Synthétiser la cartographie atmosphérique régionale", action: "research", target: 1, requires: Object.freeze(["regionalSurvey"]), params: Object.freeze({}) })
    ]),
    proximityContexts: Object.freeze([Object.freeze({
      id: "cart03-fog-proximity",
      cuoType: "fog_bank",
      fact: "cart03:fog-proximity",
      slot: "reference",
      radius: 4.8,
      requiresSlotComplete: "reachReference",
      requiredMapFact: "cart03:referenceMap",
      requiredMapField: "mapId"
    })]),
    narrative: Object.freeze({
      revealed: Object.freeze(["Une carte locale m'aide à passer. Trois territoires comparés peuvent commencer à révéler une structure atmosphérique régionale." ]),
      completed: Object.freeze(["Les relevés ne décrivent plus seulement des phénomènes isolés. Leur distribution dessine désormais une organisation atmosphérique à l'échelle régionale."])
    })
  });


  BF.BibleCatalog = Object.freeze([
    T01,
    T02,
    T03,
    shelter,
    base,
    nouvelleFondation,
    foundation,
    survivalRest,
    survivalStable,
    collectionSamples,
    collectionVariety,
    collectionReserves,
    explorationCartographer,
    explorationComplete,
    travelBiomes,
    explorationTotal,
    explorationTotal20,
    travelShort,
    travelLong,
    gameFlora,
    gameCivilization1,
    gameCivilization2,
    gameCivilization3,
    gameCivilization4,
    gameCivilization5,
    researchInitial,
    researchHypothesis,
    specialInvestigator,
    specialArchivist,
    gameEnergy,
    gameEngineering1,
    gameEngineering2,
    gameEngineering3,
    gameFire,
    gameEngineering4,
    gameEngineering5,
    gameEngineering6,
    ENE01,
    ENE02,
    ENE03,
    ENE04,
    ENE05,
    ENE06,
    ENE07,
    ENE08,
    ENE09,
    ENE10,
    ENE11,
    ENE12,
    ENE13,
    ENE14,
    ENE15A,
    ENE15B,
    ENE15C,
    ARCH01,
    ARCH02,
    ARCH03,
    ARCH04,
    ARCH05,
    ARCH06,
    ARCH07,
    ARCH08,
    ARCH09,
    ARCH10,
    ARCH11,
    ARCH12,
    ARCH13,
    ARCH14,
    ARCH15,
    ARCH16,
    ARCH17,
    ARCH18,
    ARCH19,
    ARCH20,
    ARCH21,
    ARCH22,
    ARCH23,
    ARCH24,
    ARCH25,
    ARCH26,
    ARCH27,
    ARCH28,
    ARCH29,
    ARCH30,
    ARCH31,
    ARCH32,
    ARCH33,
    ARCH34,
    ARCH35,
    ARCH36,
    ARCH37,
    ARCH38,
    ARCH39,
    ARCH40,
    ANNARCHW01, ANNARCHW02, ANNARCHW03, ANNARCHW04,
    CONTACT01, CONTACT02, CONTACT03, CONTACT04, CONTACT05, CONTACT06, CONTACT07, CONTACT08, CONTACT09,
    CONTACT10, CONTACT11, CONTACT12, CONTACT13, CONTACT14, CONTACT15,
    DIP01, GAME_CONTACT_FIRST, GAME_CONTACT_CAUTIOUS, GAME_CONTACT_AMBASSADOR, DIP02, DIP03,
    BAL01,
    BAL02,
    BAL03,
    DRN01,
    DRN02,
    DRN03,
    DRN04,
    DRN05,
    FAU01,
    FAU02,
    FAU03,
    FAU04,
    FAU05,
    FAU06,
    FAU07,
    FAU08,
    FAU09,
    FAU10,
    FAU11,
    FAU12,
    FAU01A,
    FAU03A,
    FAU05A,
    FAU11A,
    T04,
    T05,
    T06,
    T07,
    T08,
    T09,
    T10,
    LOC01,
    LOC02,
    LOC03,
    LOC04,
    LOC05,
    LOC06,
    LOC07,
    LOC08,
    LOC09,
    LOC10,
    LOC11,
    LOC12,
    LOC13,
    LOC14,
    LOC15,
    LOC16,
    LOC17,
    T11,
    T12,
    T13,
    FLO01,
    FLO02,
    FLO03,
    FLO04,
    FLO05,
    FLO06,
    FLO07,
    GEO01,
    GEO02,
    GEO03,
    GEO04,
    GEO05,
    GEO06,
    GEO07,
    SUR01,
    SUR02,
    SUR03,
    SUR05,
    SUR06,
    SUR07,
    PHEN01, PHEN02, PHEN03, PHEN04, PHEN05, PHEN06, PHEN07, PHEN08, PHEN09, PHEN10, PHEN11,
    EXP01, EXP02, EXP03, EXP04, EXP05, EXP06, EXP07, EXP08, EXP09, EXP10, EXP11, EXP12,
    ECO01, ECO02, ECO04, SIS01, SIS02, SIS03,
    PROS01, PROS03, PROS02,
    OPPCIV01, OPPFAU01, OPPMET01, OPPMET02, OPPBIO01, OPPGEO01, OPPCIV02, OPPMET03, OPPBIO02,
    OPPORCHNAT01, OPPORCHNAT02, OPPORCHBAS01, OPPORCHBAS02, OPPORCHRIV01, OPPORCHRIV02, OPPORCHRIV03,
    OPPADR01, OPPADR02, OPPADR03, OPPOASIS01, OPPHIDDEN01, OPPNEST01, OPPSANBIG01,
    TERRCARN01, TERRCARN02, TERRCARN03, TERRCARN04, TERRSTORM01, TERRSTORM02, TERRSTORM03, TERRSTORM04,
    POSTDIP01, TP01, TP02, TP03, TP04, TP05, TP06, TP07, TP08, TP09, TP10, TP11,
    TPAFTER01, TPAFTER02, TPAFTER03, TPAFTER04,
    EXPLONG01, EXPLONG02, EXPLONG03, EXPLONG04, EXPLONG05, ENDCHOICE, FIN01, FIN02,
    CART02, CART01, CART03,
    ANN04,
    ANN06,
    ANN03,
    ANN02,
    ANN05,
    ANN01,
    ANN07,
    SURPLUS01,
    SURPLUS02_MINERAL,
    SURPLUS02_CRYSTAL,
    SURPLUS03,
    MAT01,
    TECHLAB01,
    ...COLLECTION_MISSIONS,
    ...ENV_GLOBAL_MISSIONS,
    ...ENV_MAP_MISSIONS,
    ...ENV_WORLD_MISSIONS
  ]);

  BF.BibleExperiments = SCIENTIFIC_EXPERIMENTS;

  BF.BibleRuntimeReference = Object.freeze({
    phase: "tutorial-rewards-reconnection",
    testMissionsRemoved: true,
    runtimePatternsPreserved: true,
    researchSource: "mission-rewards"
  });
})(window);
