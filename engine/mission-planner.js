(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const PROGRESS_BALANCE_WEIGHT = 20;

  class MissionPlanner {
    constructor(memory) {
      this.memory = memory;
    }

    createTree(missionId) {
      const definition = Missions.getDefinition?.(missionId) ||
        Missions.definitions[missionId];
      if (!definition) throw new Error(`Mission inconnue : ${missionId}`);
      return new Missions.MissionTree(Missions.cloneDefinition(definition));
    }

    restoreOrCreate(missionId) {
      const restored = this.memory.restoreTree(missionId);
      const tree = restored || this.createTree(missionId);
      if (restored) {
        const definition = Missions.getDefinition?.(missionId) ||
          Missions.definitions?.[missionId] || null;
        if (definition) {
          tree.title = definition.title || tree.title;
          tree.description = definition.description || tree.description;
        }
      }
      tree.refresh();
      return tree;
    }

    requiredMapState(node, context = {}) {
      const factKey = String(node?.params?.requiredMapFact || "").trim();
      if (!factKey) {
        return { constrained: false, runnable: true, targetMapId: "" };
      }
      const fact = this.memory?.getFact?.(factKey, null);
      const field = String(node?.params?.requiredMapField || "mapId").trim();
      const targetMapId = String(fact?.[field] || fact?.mapId || "");
      const currentMapId = String(context?.mapId || context?.currentMapId || "");
      return {
        constrained: true,
        runnable: Boolean(targetMapId && currentMapId && targetMapId === currentMapId),
        targetMapId,
        currentMapId,
        factKey,
        field,
        reason: !targetMapId
          ? "required-map-unresolved"
          : targetMapId !== currentMapId
            ? "required-map-mismatch"
            : "required-map-current"
      };
    }

    score(node, context) {
      // Une étape événementielle décrit une condition de progression ; elle
      // ne doit jamais être proposée comme action exécutable au bridge.
      if (node?.params?.eventDriven === true) return -100;

      // Une feuille liée à une autre map reste active dans son lifecycle, mais
      // elle n'est pas exécutable localement. MissionManager peut alors produire
      // l'intention de transition canonique au lieu de lancer une fausse action.
      const mapState = this.requiredMapState(node, context);
      if (mapState.constrained && !mapState.runnable) return -100;

      let score = 100;
      const type = Missions.normalizeActionType(node.type);
      if ([Missions.ActionType.COLLECT, Missions.ActionType.EXTRACT].includes(type)) {
        // Les objectifs ciblés par `kind` peuvent utiliser le résumé de ressources
        // construit par ActionBridge. Les objectifs plus riches (`subject`, family,
        // tags...) restent évaluables ici et sont filtrés par ObjectM0, propriétaire
        // canonique du matching missionnel des objets.
        if (node.params.kind) {
          const available = context.resources?.[node.params.kind] || 0;
          score += available ? 60 : -100;
        }
      }
      if (type === Missions.ActionType.EXPLORE_ZONE) {
        score += context.unexploredZones > 0 ||
          context.explorationPercent < 100 ||
          context.hasIncompleteDiscoveredMaps
          ? 70
          : -100;
      }
      if (type === Missions.ActionType.RESEARCH) {
        score += context.canRoutine ? 45 : -100;
      }
      if (type === Missions.ActionType.OBSERVE) {
        score += context.canRoutine ? 40 : -100;
      }
      if (type === Missions.ActionType.REST) {
        score += context.needs?.rest ? 100 : 5;
      }
      if (type === Missions.ActionType.EAT) {
        score += context.needs?.food ? 100 : 5;
      }
      // La progression sert uniquement à répartir le travail entre feuilles
      // parallèles. Elle ne doit jamais rendre inexécutable un objectif long
      // encore faisable (par exemple 51/100 analyses ou 81/100 collectes).
      const target = Math.max(1, Number(node.target) || 1);
      const progressRatio = Math.max(
        0,
        Math.min(1, (Number(node.progress) || 0) / target)
      );
      score -= progressRatio * PROGRESS_BALANCE_WEIGHT;
      return score;
    }

    nextAction(tree, context) {
      const candidates = tree.availableLeaves()
        .map((node) => ({ node, score: this.score(node, context) }))
        .filter((candidate) => candidate.score >= 0)
        .sort((left, right) =>
          right.score - left.score ||
          left.node.createdAt - right.node.createdAt
        );
      const selected = candidates[0]?.node;
      if (!selected) return null;
      return {
        id: `${selected.id}:${selected.progress + 1}`,
        nodeId: selected.id,
        type: Missions.normalizeActionType(selected.type),
        title: selected.title,
        params: { ...selected.params },
        issuedAt: Date.now()
      };
    }

    applyCompletion(tree, action, detail = {}) {
      if (!action?.nodeId) return false;
      const node = tree.find(action.nodeId);
      if (!node || node.isComplete) return false;
      if (
        [Missions.ActionType.COLLECT, Missions.ActionType.EXTRACT].includes(action.type) &&
        node.params.kind &&
        detail.kind !== node.params.kind
      ) {
        return false;
      }
      if (node.params.requiredMapFact) {
        const fact = this.memory?.getFact?.(node.params.requiredMapFact, null);
        const field = node.params.requiredMapField || "mapId";
        const requiredMapId = fact?.[field];
        // Les interactions portent leur map explicitement. Les routines locales
        // (research/rest/eat) sont exécutées par WorldEngine sur la map courante
        // mais leur notification historique ne transporte pas mapId. On utilise
        // donc la map courante uniquement pour ces fins de routine locales.
        const completionMapId = detail.mapId ??
          (detail.routine ? BF.currentEngine?.currentMapId : "");
        if (!requiredMapId || String(completionMapId || "") !== String(requiredMapId)) {
          return false;
        }
      }
      const changed = node.increment(Math.max(1, Number(detail.amount) || 1));
      tree.refresh();
      return changed;
    }
  }

  Missions.MissionPlanner = MissionPlanner;
})(window);
