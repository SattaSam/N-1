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
    camp: {
      id: "camp",
      title: "Établir un camp",
      description:
        "Collecter dix bois et étudier tous les arbres, buissons et branches de la zone de départ afin de découvrir la menuiserie.",
      priority: 120,
      instanceScope: "map",
      journalIntro: "Cette zone est encore nouvelle pour moi. Je veux d’abord y établir un camp simple : un endroit où reprendre des forces et observer les environs avant d’envisager une installation durable.",
      root: {
        id: "camp-root",
        title: "Établir un camp",
        type: "objective",
        children: [
          {
            id: "camp-wood",
            title: "Réunir 10 bois",
            type: ActionType.COLLECT,
            target: 10,
            params: { startupMetric: "available-wood", kind: "wood" }
          },
          {
            id: "camp-wood-knowledge",
            title: "Étudier chaque arbre, buisson et branche de la zone de départ",
            type: ActionType.INSPECT,
            target: 1,
            params: { startupMetric: "wood-specimens-studied" }
          }
        ]
      }
    },
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
      title: "Transformer le camp en refuge",
      description:
        "Réunir cent bois et cent plantes fibreuses, puis étudier cent plantes pour renforcer l’abri.",
      priority: 110,
      instanceScope: "map",
      journalIntro: "Le camp tient bon. Je pense pouvoir le renforcer en refuge durable sans épuiser les ressources de cette zone. Mon ambition est d’y disposer d’un véritable point d’appui sûr.",
      root: {
        id: "shelter-root",
        title: "Établir un premier refuge",
        type: "objective",
        children: [
          {
            id: "shelter-wood",
            title: "Réunir 100 bois",
            type: ActionType.COLLECT,
            target: 100,
            params: { startupMetric: "available-wood", kind: "wood" }
          },
          {
            id: "shelter-fibers",
            title: "Réunir 100 plantes fibreuses",
            type: ActionType.COLLECT,
            target: 100,
            params: { startupMetric: "available-fiber", kind: "fiber" }
          },
          {
            id: "shelter-plant-knowledge",
            title: "Observer, inspecter ou analyser 100 plantes",
            type: ActionType.ANALYZE,
            target: 100,
            params: { startupMetric: "plant-studies" }
          }
        ]
      }
    },
    base: {
      id: "base",
      title: "Faire évoluer le refuge en base",
      description:
        "Réunir mille plantes fibreuses et mille minéraux ou cristaux, puis étudier cent éléments rocheux pour établir la base principale complète.",
      priority: 105,
      instanceScope: "map",
      journalIntro: "Ce refuge est désormais fiable. Je veux le faire évoluer en base locale afin qu’il soutienne des projets plus complexes et déverrouille de nouvelles possibilités de recherche.",
      root: {
        id: "base-root",
        title: "Établir une base locale",
        type: "objective",
        children: [
          {
            id: "base-fibers",
            title: "Réunir 1 000 plantes fibreuses",
            type: ActionType.COLLECT,
            target: 1000,
            params: { startupMetric: "available-fiber", kind: "fiber" }
          },
          {
            id: "base-minerals",
            title: "Réunir 1 000 minéraux ou cristaux",
            type: ActionType.COLLECT,
            target: 1000,
            params: { startupMetric: "available-minerals", kind: "mineral" }
          },
          {
            id: "base-rock-knowledge",
            title: "Observer, inspecter ou analyser 100 éléments rocheux",
            type: ActionType.ANALYZE,
            target: 100,
            params: { startupMetric: "rock-studies" }
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

  function getDefinition(missionId) {
    if (definitions[missionId]) return definitions[missionId];
    const separator = String(missionId || "").indexOf("@");
    if (separator < 1) return null;
    const baseId = missionId.slice(0, separator);
    const scopeId = missionId.slice(separator + 1);
    const base = definitions[baseId];
    if (!base || base.instanceScope !== "map" || !scopeId) return null;
    const instance = cloneDefinition(base);
    const idMap = new Map();
    const collectIds = (node) => {
      idMap.set(node.id, `${node.id}@${scopeId}`);
      (node.children || []).forEach(collectIds);
    };
    const applyScope = (node) => {
      node.id = idMap.get(node.id);
      node.requires = (node.requires || []).map((id) => idMap.get(id) || id);
      node.params = { ...(node.params || {}), mapId: scopeId };
      (node.children || []).forEach(applyScope);
    };
    collectIds(instance.root);
    applyScope(instance.root);
    instance.id = missionId;
    instance.baseMissionId = baseId;
    instance.scopeId = scopeId;
    instance.title = `${instance.title} — ${scopeId}`;
    return instance;
  }

  Missions.ActionType = ActionType;
  Missions.MissionStatus = MissionStatus;
  Missions.NeedType = NeedType;
  Missions.definitions = definitions;
  Missions.normalizeActionType = normalizeActionType;
  Missions.cloneDefinition = cloneDefinition;
  Missions.getDefinition = getDefinition;
})(window);
