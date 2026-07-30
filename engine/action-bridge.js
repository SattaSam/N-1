(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};

  class ActionBridge {
    constructor(engine) {
      this.engine = engine;
    }

    context() {
      const engine = this.engine;
      const resources = {};
      (engine.currentMap?.interactables || []).forEach((object) => {
        if (!object.userData.active) return;
        const kind = object.userData.kind;
        resources[kind] = (resources[kind] || 0) + 1;
      });
      const unexploredZones = (engine.currentMap?.zoneRegions || []).filter(
        (zone) => !engine.discoveredZones.has(
          `${engine.currentMapId}:${zone.index}`
        )
      ).length;
      return {
        mapId: engine.currentMapId,
        resources,
        unexploredZones,
        canRoutine: !engine.currentRoutine,
        needs: {
          rest: false,
          food: false
        }
      };
    }

    isEngineBusy() {
      const engine = this.engine;
      return Boolean(
        engine.transitioning ||
        engine.pendingInteraction ||
        engine.currentRoutine ||
        engine.pendingZoneExploration ||
        engine.pendingGate ||
        engine.character.root.position.distanceTo(engine.character.target) > 0.2
      );
    }

    execute(action, now) {
      if (!action || this.isEngineBusy()) return false;
      const engine = this.engine;
      switch (action.type) {
        case Missions.ActionType.COLLECT: {
          const candidates = engine.currentMap.interactables
            .filter((object) =>
              object.userData.active &&
              (!action.params.kind || object.userData.kind === action.params.kind)
            )
            .sort((left, right) =>
              engine.character.root.position.distanceTo(left.position) -
              engine.character.root.position.distanceTo(right.position)
            );
          if (!candidates.length) return false;
          engine.targetInteraction(candidates[0]);
          return true;
        }
        case Missions.ActionType.EXPLORE_ZONE: {
          const zone = engine.currentMap.zoneRegions
            .filter((candidate) => !engine.discoveredZones.has(
              `${engine.currentMapId}:${candidate.index}`
            ))
            .sort((left, right) =>
              engine.character.root.position.distanceTo(left.center) -
              engine.character.root.position.distanceTo(right.center)
            )[0];
          if (!zone) return false;
          engine.pendingZoneExploration = zone;
          engine.character.setTarget(zone.center);
          engine.showWorldMarker(zone.center);
          engine.callbacks.onStatus(
            `Mission : BlueFox reconnaît ${zone.name}.`
          );
          return true;
        }
        case Missions.ActionType.RESEARCH:
          engine.startRoutine(
            "research",
            now,
            Math.max(1500, Number(action.params.duration) || 6500)
          );
          return true;
        case Missions.ActionType.OBSERVE:
          engine.startRoutine(
            "research",
            now,
            Math.max(1500, Number(action.params.duration) || 5200)
          );
          return true;
        case Missions.ActionType.REST:
          engine.startRoutine("rest", now, Number(action.params.duration) || 7200);
          return true;
        case Missions.ActionType.EAT:
          engine.startRoutine("food", now, Number(action.params.duration) || 5200);
          return true;
        default:
          return false;
      }
    }
  }

  Missions.ActionBridge = ActionBridge;
})(window);
