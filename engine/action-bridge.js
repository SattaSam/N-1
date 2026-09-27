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
        const definition = object.userData.functional ||
          BF.ObjectLibrary?.get?.(object.userData.libraryType) ||
          BF.ObjectLibrary?.get?.(object.userData.kind);
        const kind = definition?.resource?.inventoryKey ||
          definition?.type ||
          object.userData.kind;
        resources[kind] = (resources[kind] || 0) + 1;
      });
      const unexploredZones = (engine.currentMap?.zoneRegions || []).filter(
        (zone) => !engine.discoveredZones.has(
          `${engine.currentMapId}:${zone.index}`
        )
      ).length;
      const explorationMaps = Object.values(BF.getExplorationSummary?.().maps || {});
      let energy = null;
      const survival = BF.getSurvivalState?.();
      try {
        const legacy = JSON.parse(
          global.localStorage.getItem("bluefox_odyssey_save_v1") || "null"
        );
        if (Number.isFinite(Number(legacy?.energy))) energy = Number(legacy.energy);
      } catch {
        energy = null;
      }
      if (Number.isFinite(Number(survival?.energy))) {
        energy = Number(survival.energy);
      }
      return {
        mapId: engine.currentMapId,
        resources,
        unexploredZones,
        explorationPercent: Number(
          BF.getMapExplorationState?.(engine.currentMapId)?.surfacePercent
        ) || 0,
        hasIncompleteDiscoveredMaps: explorationMaps.some(
          (map) => Number(map.surfacePercent) > 0 && Number(map.surfacePercent) < 100
        ),
        canRoutine: !engine.currentRoutine,
        needs: {
          rest: survival?.needs?.rest === true || (energy != null && energy < 35),
          food: survival?.needs?.food === true
        },
        energy
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


    revealBlockedZoneMicroScene(action, zone) {
      const engine = this.engine;
      if (!zone || zone.index !== engine.currentZoneIndex) return false;
      if (typeof BF.revealMapArea !== "function") return false;

      const mission =
        engine.missionManager?.definition?.(action?.missionId) ||
        (Array.isArray(BF.BibleCatalog)
          ? BF.BibleCatalog.find((entry) => entry?.id === action?.missionId)
          : Object.values(BF.BibleCatalog || {}).find((entry) => entry?.id === action?.missionId));
      const contexts = (Array.isArray(mission?.proximityContexts)
        ? mission.proximityContexts
        : []
      ).filter((context) =>
        context?.microSceneId && context.useSceneRadius === true
      );
      if (!contexts.length) return false;

      const scenes = Array.isArray(engine.currentMap?.group?.userData?.microScenes)
        ? engine.currentMap.group.userData.microScenes
        : Array.isArray(engine.currentMap?.microScenes)
          ? engine.currentMap.microScenes
          : [];
      const player = engine.character?.root?.position;
      if (!player) return false;

      for (const context of contexts) {
        const scene = scenes.find((entry) =>
          String(entry?.id || "") === String(context.microSceneId)
        );
        const anchor = scene?.instanceRoot || scene?.records?.[0]?.root || null;
        const point = anchor?.getWorldPosition
          ? anchor.getWorldPosition(new engine.THREE.Vector3())
          : anchor?.position;
        if (!point) continue;

        let nearestZone = null;
        let nearestDistance = Infinity;
        (engine.currentMap?.zoneRegions || []).forEach((candidate) => {
          const distance = Math.hypot(
            Number(point.x) - Number(candidate.center.x),
            Number(point.z) - Number(candidate.center.z)
          );
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestZone = candidate;
          }
        });
        if (nearestZone?.index !== zone.index) continue;

        const radius = Number(
          BF.MicroScenes?.get?.(context.microSceneId)?.radius
        );
        if (!Number.isFinite(radius) || radius <= 0) continue;
        const distance = Math.hypot(
          Number(player.x) - Number(point.x),
          Number(player.z) - Number(point.z)
        );
        if (distance > radius) continue;

        BF.revealMapArea({
          mapId: engine.currentMapId,
          planetId: engine.currentPlanetId || "planet-1",
          zoneId: zone.index,
          x: Number(point.x),
          z: Number(point.z),
          radius,
          bounds: engine.currentMap?.bounds || 27,
          source: "mission-msc-proximity",
          microSceneId: context.microSceneId
        });
        const zoneKey = `${engine.currentMapId}:${zone.index}`;
        if (!engine.discoveredZones.has(zoneKey)) {
          engine.discoveredZones.add(zoneKey);
          engine.saveZoneDiscovery?.();
        }
        return true;
      }
      return false;
    }

    execute(action, now) {
      if (!action || this.isEngineBusy()) return false;
      const engine = this.engine;
      switch (action.type) {
        case Missions.ActionType.COLLECT:
        case Missions.ActionType.EXTRACT:
        case Missions.ActionType.INSPECT:
        case Missions.ActionType.ANALYZE:
        case Missions.ActionType.OBSERVE: {
          const candidates = engine.currentMap.interactables
            .filter((object) => {
              if (!object?.userData?.active) return false;
              const anchor = object.userData.worldAnchor || object;
              const objectData = object.userData || {};
              const anchorData = anchor?.userData || {};
              const definition =
                objectData.functional ||
                anchorData.functional ||
                BF.ObjectLibrary?.getById?.(objectData.catalogId || anchorData.catalogId) ||
                BF.ObjectLibrary?.get?.(objectData.libraryType || anchorData.objectType || objectData.kind);
              const kindAliases = new Set([
                objectData.kind,
                definition?.type,
                definition?.resource?.inventoryKey,
                anchorData.kind,
                anchorData.objectType
              ].filter((value) => value != null).map((value) => String(value)));
              const actualCuoType =
                definition?.type ||
                objectData.libraryType ||
                anchorData.objectType ||
                objectData.kind ||
                null;
              const actualMicroSceneId =
                objectData.microSceneId ||
                anchorData.microSceneId ||
                objectData.contextMicroSceneId ||
                anchorData.contextMicroSceneId ||
                null;
              const actualPersistentMicroSceneId =
                objectData.persistentMicroSceneId ||
                anchorData.persistentMicroSceneId ||
                null;

              if (action.params?.kind && !kindAliases.has(String(action.params.kind))) return false;
              if (action.params?.cuoType && String(actualCuoType) !== String(action.params.cuoType)) return false;
              if (action.params?.microSceneId && String(actualMicroSceneId) !== String(action.params.microSceneId)) return false;
              if (
                action.params?.persistentMicroSceneId &&
                String(actualPersistentMicroSceneId) !== String(action.params.persistentMicroSceneId)
              ) return false;
              return true;
            })
            .sort((left, right) =>
              engine.character.root.position.distanceTo(left.position) -
              engine.character.root.position.distanceTo(right.position)
            );
          if (!candidates.length) return false;

          if (action.params?.proximityOnly === true) {
            const target = candidates[0];
            const radius = Math.max(0.5, Number(action.params.proximityRadius) || 2.5);
            const point = engine.interactionWorldPosition?.(target) || target.position;
            if (!point) return false;
            const player = engine.character.root.position;
            const distance = player.distanceTo
              ? player.distanceTo(point)
              : Math.hypot(
                  Number(player.x) - Number(point.x),
                  Number(player.z) - Number(point.z)
                );

            if (distance <= radius) {
              const definition = target.userData.functional ||
                BF.ObjectLibrary?.get?.(target.userData.libraryType) ||
                BF.ObjectLibrary?.get?.(target.userData.kind);
              BF.ObjectEvents?.emit?.(
                BF.ObjectEvents?.types?.OBJECT_SEEN || "OBJECT_SEEN",
                target,
                {
                  mapId: engine.currentMapId,
                  zoneId: engine.currentZoneIndex,
                  missionId: action.missionId || null,
                  missionNodeId: action.nodeId || null,
                  cuoType: definition?.type || target.userData.kind || null,
                  subject: action.params?.subject || definition?.category || definition?.type || null,
                  interactionSource: "mission-proximity",
                  proximityRadius: radius,
                  proximityDistance: distance
                }
              );
              target.userData.lastInteractionAt = performance.now();
              return true;
            }

            const destination = point.clone
              ? point.clone()
              : new engine.THREE.Vector3(Number(point.x) || 0, Number(point.y) || 0, Number(point.z) || 0);
            if (distance > 0.001) {
              const offset = radius * 0.8;
              const dx = Number(player.x) - Number(point.x);
              const dz = Number(player.z) - Number(point.z);
              const length = Math.hypot(dx, dz) || 1;
              destination.x = Number(point.x) + (dx / length) * offset;
              destination.z = Number(point.z) + (dz / length) * offset;
            }
            const accepted = engine.character.setTarget(
              destination,
              action.params?.movementMode || "auto"
            );
            if (accepted === false) return false;
            engine.showWorldMarker?.(destination);
            engine.callbacks?.onStatus?.(
              `Mission : BlueFox s’approche à moins de ${radius.toFixed(1)} m de ${(target.userData.functional?.label || "la cible").toLowerCase()}.`
            );
            return true;
          }

          candidates[0].userData.requestedInteraction = action.type;
          candidates[0].userData.requestedInteractionSource = "mission";
          candidates[0].userData.missionSubject = action.params?.subject || null;

          const accepted = engine.targetInteraction(candidates[0]);
          if (accepted === false) {
            candidates[0].userData.requestedInteraction = null;
            candidates[0].userData.requestedInteractionSource = null;
            candidates[0].userData.missionSubject = null;
            candidates[0].userData.lastInteractionAt = performance.now();
            engine.callbacks?.onAction?.("mission-interaction-refused");
            return false;
          }
          return true;
        }
        case Missions.ActionType.EXPLORE_ZONE: {
          const zones = engine.currentMap.zoneRegions
            .filter((candidate) => !engine.discoveredZones.has(
              `${engine.currentMapId}:${candidate.index}`
            ))
            .sort((left, right) =>
              engine.character.root.position.distanceTo(left.center) -
              engine.character.root.position.distanceTo(right.center)
            );
          for (const zone of zones) {
            const accepted = engine.character.setTarget(zone.center);
            if (accepted === false) {
              const reconciled = this.revealBlockedZoneMicroScene(action, zone);
              if (reconciled) {
                const node = engine.missionManager?.trees
                  ?.get?.(action?.missionId)
                  ?.find?.(action?.nodeId);
                if (node?.isComplete) return false;
              }
              continue;
            }
            engine.pendingZoneExploration = zone;
            engine.showWorldMarker(zone.center);
            engine.callbacks.onStatus(`Mission : BlueFox reconnaît ${zone.name}.`);
            return true;
          }
          if (action.params?.catalogMetric === "all-discovered-biomes-percent") {
            const incompleteMap = Object.values(BF.getExplorationSummary?.().maps || {})
              .filter((map) => Number(map.surfacePercent) > 0 && Number(map.surfacePercent) < 100)
              .sort((left, right) => Number(left.surfacePercent) - Number(right.surfacePercent))
              .find((map) => map.mapId !== engine.currentMapId);
            const route = incompleteMap
              ? engine.findKnownRoute?.(engine.currentMapId, incompleteMap.mapId)
              : null;
            const nextMapId = Array.isArray(route) ? route[1] : null;
            const gate = nextMapId
              ? engine.currentMap.gates.find(
                (candidate) => candidate.userData.exit.targetMap === nextMapId
              )
              : null;
            if (gate && engine.character.setTarget(gate.position, "run") !== false) {
              engine.pendingGate = gate;
              engine.callbacks.onStatus(
                `Mission : BlueFox rejoint ${BF.maps?.[incompleteMap.mapId]?.name || "un biome incomplet"}.`
              );
              return true;
            }
          }
          const target = BF.getNextUnexploredMapTarget?.(
            engine.currentMapId,
            engine.character.root.position
          );
          if (!target) return false;
          const position = new engine.THREE.Vector3(target.x, 0, target.z);
          if (engine.character.setTarget(position) === false) return false;
          engine.showWorldMarker(position);
          engine.callbacks.onStatus("Mission : BlueFox cartographie un secteur encore incomplet.");
          return true;
        }
        case Missions.ActionType.RESEARCH: {
          if (action.params?.requiresShelter === true && BF.canAccessCampInventory?.() !== true) {
            return false;
          }
          const consumes = Array.isArray(action.params?.inventoryConsume)
            ? action.params.inventoryConsume
            : [];
          if (consumes.length) {
            const plan = consumes.map((entry) => ({
              inventoryKey: String(entry?.inventoryKey || ""),
              quantity: Math.max(0, Number(entry?.quantity) || 0)
            }));
            if (plan.some((entry) =>
              !entry.inventoryKey ||
              !entry.quantity ||
              Number(BF.progression?.availableInventory?.([entry.inventoryKey])) < entry.quantity
            )) {
              return false;
            }
            for (const [index, entry] of plan.entries()) {
              const transactionId = `${action.missionId || "mission"}:${action.nodeId || "research"}:inventory-consume:${index}`;
              const removed = BF.consumeInventoryPoolOnce?.(
                transactionId,
                [entry.inventoryKey],
                entry.quantity
              );
              if (removed !== entry.quantity) return false;
            }
          }
          engine.startRoutine(
            "research",
            now,
            Math.max(1500, Number(action.params.duration) || 6500)
          );
          return true;
        }
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
