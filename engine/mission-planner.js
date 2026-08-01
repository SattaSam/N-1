(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};

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
      tree.refresh();
      return tree;
    }

    score(node, context) {
      let score = 100;
      const type = Missions.normalizeActionType(node.type);
      if ([Missions.ActionType.COLLECT, Missions.ActionType.EXTRACT].includes(type)) {
        const available = context.resources?.[node.params.kind] || 0;
        score += available ? 60 : -100;
      }
      if (type === Missions.ActionType.EXPLORE_ZONE) {
        score += context.unexploredZones > 0 ? 70 : -100;
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
      score -= node.progress * 2;
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
      const changed = node.increment(Math.max(1, Number(detail.amount) || 1));
      tree.refresh();
      return changed;
    }
  }

  Missions.MissionPlanner = MissionPlanner;
})(window);
