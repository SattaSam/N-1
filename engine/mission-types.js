(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};

  const ActionType = Object.freeze({
    COLLECT: "collect",
    EXTRACT: "extract",
    INSPECT: "inspect",
    ANALYZE: "analyze",
    EXPLORE_ZONE: "explore-zone",
    TRAVEL: "travel",
    REST: "rest",
    EAT: "eat",
    RESEARCH: "research",
    OBSERVE: "observe",
    CRAFT: "craft",
    BUILD: "build"
  });

  const MissionStatus = Object.freeze({
    LOCKED: "locked",
    AVAILABLE: "available",
    ACTIVE: "active",
    COMPLETED: "completed",
    FAILED: "failed",
    PAUSED: "paused"
  });

  const NeedType = Object.freeze({
    ENERGY: "energy",
    REST: "rest",
    FOOD: "food",
    SAFETY: "safety"
  });

  const definitions = Object.freeze({
    foundation: {
      id: "foundation",
      title: "Sécuriser le refuge",
      description:
        "Établir une première réserve, reconnaître le voisinage et analyser les ressources sans perturber le moteur autonome.",
      priority: 100,
      root: {
        id: "foundation-root",
        title: "Fondation du refuge",
        type: "objective",
        children: [
          {
            id: "foundation-survey",
            title: "Reconnaître le terrain proche",
            type: ActionType.EXPLORE_ZONE,
            target: 1,
            params: {}
          },
          {
            id: "foundation-crystals",
            title: "Constituer une réserve énergétique",
            type: ActionType.COLLECT,
            target: 2,
            params: { kind: "crystal" }
          },
          {
            id: "foundation-fibers",
            title: "Prélever des fibres utiles",
            type: ActionType.COLLECT,
            target: 2,
            params: { kind: "fiber" }
          },
          {
            id: "foundation-analysis",
            title: "Analyser les prélèvements",
            type: ActionType.RESEARCH,
            target: 1,
            requires: ["foundation-crystals", "foundation-fibers"],
            params: { duration: 6500 }
          }
        ]
      }
    },
    shelter: {
      id: "shelter",
      title: "Établir un premier refuge",
      description:
        "Rassembler ce qui protège l’épave sans épuiser les ressources du site.",
      priority: 100,
      root: {
        id: "shelter-root",
        title: "Établir un premier refuge",
        type: "objective",
        children: [
          {
            id: "shelter-camp",
            title: "Établir le camp près de l’épave",
            type: ActionType.OBSERVE,
            target: 1,
            params: { subject: "camp", duration: 4200 }
          },
          {
            id: "shelter-zone-analysis",
            title: "Analyser la zone du camp",
            type: "objective",
            requires: ["shelter-camp"],
            children: [
              {
                id: "shelter-zone-reach",
                title: "Reconnaître le plateau",
                type: ActionType.EXPLORE_ZONE,
                target: 1,
                params: {}
              },
              {
                id: "shelter-zone-crystal",
                title: "Identifier un cristal",
                type: ActionType.COLLECT,
                target: 1,
                requires: ["shelter-zone-reach"],
                params: { kind: "crystal" }
              },
              {
                id: "shelter-zone-fiber",
                title: "Identifier des fibres",
                type: ActionType.COLLECT,
                target: 1,
                requires: ["shelter-zone-reach"],
                params: { kind: "fiber" }
              },
              {
                id: "shelter-zone-structure",
                title: "Identifier une structure locale",
                type: ActionType.OBSERVE,
                target: 1,
                requires: ["shelter-zone-reach"],
                params: { subject: "structure", duration: 5200 }
              },
              {
                id: "shelter-zone-map",
                title: "Cartographier les ressources",
                type: ActionType.RESEARCH,
                target: 1,
                requires: [
                  "shelter-zone-crystal",
                  "shelter-zone-fiber",
                  "shelter-zone-structure"
                ],
                params: { duration: 6500 }
              }
            ]
          },
          {
            id: "shelter-crystals",
            title: "Stabiliser une source d’énergie",
            type: ActionType.COLLECT,
            target: 3,
            requires: ["shelter-zone-analysis"],
            params: { kind: "crystal" }
          },
          {
            id: "shelter-fibers",
            title: "Collecter des fibres",
            type: ActionType.COLLECT,
            target: 5,
            requires: ["shelter-zone-analysis"],
            params: { kind: "fiber" }
          }
        ]
      }
    },
    energy: {
      id: "energy",
      title: "Concevoir une énergie douce",
      description:
        "Comprendre les cristaux et les ruines avant de construire une source durable.",
      priority: 80,
      root: {
        id: "energy-root",
        title: "Concevoir une énergie douce",
        type: "objective",
        children: [
          {
            id: "energy-crystals",
            title: "Comparer les cristaux",
            type: ActionType.COLLECT,
            target: 8,
            params: { kind: "crystal" }
          },
          {
            id: "energy-components",
            title: "Étudier les composants",
            type: ActionType.OBSERVE,
            target: 2,
            params: { subject: "components", duration: 6500 }
          },
          {
            id: "energy-hypothesis",
            title: "Valider une hypothèse",
            type: ActionType.RESEARCH,
            target: 4,
            requires: ["energy-crystals", "energy-components"],
            params: { duration: 6500 }
          }
        ]
      }
    },
    flora: {
      id: "flora",
      title: "Étudier la flore photoréactive",
      description:
        "Observer plusieurs spécimens sans perturber leur cycle lumineux.",
      priority: 70,
      root: {
        id: "flora-root",
        title: "Étudier la flore photoréactive",
        type: "objective",
        children: [
          {
            id: "flora-observe",
            title: "Observer sans prélever",
            type: ActionType.OBSERVE,
            target: 4,
            params: { subject: "flora", duration: 5200 }
          },
          {
            id: "flora-environments",
            title: "Comparer deux milieux",
            type: ActionType.EXPLORE_ZONE,
            target: 2,
            params: {}
          },
          {
            id: "flora-cycle",
            title: "Établir un cycle",
            type: ActionType.RESEARCH,
            target: 8,
            requires: ["flora-observe", "flora-environments"],
            params: { duration: 5200 }
          }
        ]
      }
    },
    contact: {
      id: "contact",
      title: "Créer un premier lien",
      description:
        "Approcher les créatures avec patience et mémoriser leurs réactions.",
      priority: 60,
      root: {
        id: "contact-root",
        title: "Créer un premier lien",
        type: "objective",
        children: [
          {
            id: "contact-approach",
            title: "Approcher calmement",
            type: ActionType.OBSERVE,
            target: 2,
            params: { subject: "contact", duration: 5600 }
          },
          {
            id: "contact-responses",
            title: "Observer les réponses",
            type: ActionType.OBSERVE,
            target: 4,
            requires: ["contact-approach"],
            params: { subject: "contact", duration: 5600 }
          },
          {
            id: "contact-memory",
            title: "Mémoriser un lien",
            type: ActionType.RESEARCH,
            target: 5,
            requires: ["contact-responses"],
            params: { duration: 5600 }
          }
        ]
      }
    }
  });

  function normalizeActionType(value) {
    const candidate = String(value || "").trim().toLowerCase();
    return Object.values(ActionType).includes(candidate)
      ? candidate
      : ActionType.OBSERVE;
  }

  function cloneDefinition(definition) {
    return JSON.parse(JSON.stringify(definition));
  }

  Missions.ActionType = ActionType;
  Missions.MissionStatus = MissionStatus;
  Missions.NeedType = NeedType;
  Missions.definitions = definitions;
  Missions.normalizeActionType = normalizeActionType;
  Missions.cloneDefinition = cloneDefinition;
})(window);
