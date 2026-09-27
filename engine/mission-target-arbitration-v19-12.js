(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};

  if (Missions.__targetArbitrationV19_12_1_1) return;
  Missions.__targetArbitrationV19_12_1_1 = true;

  const STUDY = new Set([
    Missions.ActionType?.OBSERVE || "observe",
    Missions.ActionType?.INSPECT || "inspect",
    Missions.ActionType?.ANALYZE || "analyze"
  ]);

  const normalize = (value) =>
    Missions.normalizeActionType?.(value) || String(value || "").toLowerCase();

  const objectIdentity = (object) => {
    const definition =
      object?.userData?.functional ||
      BF.ObjectLibrary?.getById?.(object?.userData?.catalogId) ||
      BF.ObjectLibrary?.get?.(object?.userData?.libraryType) ||
      BF.ObjectLibrary?.get?.(object?.userData?.kind) ||
      null;

    return {
      instanceId: String(object?.userData?.instanceId || ""),
      objectId: String(
        definition?.id ||
        object?.userData?.catalogId ||
        ""
      ).toLowerCase(),
      cuoType: String(
        definition?.type ||
        object?.userData?.libraryType ||
        object?.userData?.kind ||
        ""
      ).toLowerCase()
    };
  };

  /*
   * Politique déjà portée par bibleTarget :
   * - binding=instance  => l'instance exacte est exigée ;
   * - autre binding    => définition/type équivalent autorisé.
   *
   * Aucun champ supplémentaire n'est obligatoire.
   */
  const matchesBoundTarget = (bound, object) => {
    if (!bound) return true;

    const identity = objectIdentity(object);

    if (bound.binding === "instance" && bound.instanceId) {
      return identity.instanceId === String(bound.instanceId);
    }

    if (bound.objectId) {
      if (
        identity.objectId === String(bound.objectId).toLowerCase()
      ) return true;
    }

    if (bound.cuoType) {
      if (
        identity.cuoType === String(bound.cuoType).toLowerCase()
      ) return true;
    }

    return false;
  };

  const activeObjects = (engine) =>
    (engine?.currentMap?.interactables || [])
      .filter((object) => object?.userData?.active !== false);

  const localBoundTarget = (engine, bound) =>
    activeObjects(engine).find((object) =>
      matchesBoundTarget(bound, object)
    ) || null;

  const boundFor = (manager, missionId) =>
    manager?.memory?.getFact?.(`bibleTarget:${missionId}`) || null;

  const targetKey = (missionId) => `bibleTarget:${missionId}`;

  /*
   * Répare les bindings créés AVANT l'installation de ce correctif.
   * MissionMemory conserve les 150 derniers événements ; pour une mission
   * déclenchée par un objet, l'événement d'activation est enregistré à
   * quelques millisecondes de lifecycle.activatedAt.
   *
   * On ne rend jamais mapId obligatoire : cette fonction enrichit seulement
   * un binding lorsqu'une origine géographique est réellement retrouvée.
   */
  const recoverTargetMapFromHistory = (manager, missionId, bound) => {
    if (!manager || !bound || bound.mapId) return bound;

    const life =
      manager.memory?.state?.missionLifecycle?.[missionId] || null;
    const activatedAt = Number(life?.activatedAt) || 0;
    const history = Array.isArray(manager.memory?.state?.history)
      ? manager.memory.state.history
      : [];

    const candidates = history
      .filter((entry) => {
        const detail = entry?.detail || {};
        if (!detail.mapId) return false;

        const sameInstance =
          bound.instanceId &&
          String(detail.instanceId || "") === String(bound.instanceId);

        const sameDefinition =
          bound.objectId &&
          String(detail.objectId || "").toLowerCase() ===
            String(bound.objectId).toLowerCase();

        const sameType =
          bound.cuoType &&
          String(
            detail.cuoType ||
            detail.kind ||
            detail.subject ||
            ""
          ).toLowerCase() === String(bound.cuoType).toLowerCase();

        const activationWindow =
          activatedAt > 0 &&
          Math.abs(Number(entry.at || 0) - activatedAt) <= 15000;

        // Priorité aux identités exactes. À défaut, un événement d'activation
        // dans la fenêtre temporelle permet de restaurer une ancienne partie.
        return sameInstance ||
          sameDefinition ||
          sameType ||
          (detail.activationOnly === true && activationWindow);
      })
      .sort((left, right) => {
        const ld = left?.detail || {};
        const rd = right?.detail || {};

        const rank = (entry, detail) => {
          let score = 0;
          if (
            bound.instanceId &&
            String(detail.instanceId || "") === String(bound.instanceId)
          ) score += 1000;
          if (
            bound.objectId &&
            String(detail.objectId || "").toLowerCase() ===
              String(bound.objectId).toLowerCase()
          ) score += 500;
          if (
            bound.cuoType &&
            String(detail.cuoType || detail.kind || "").toLowerCase() ===
              String(bound.cuoType).toLowerCase()
          ) score += 250;
          if (detail.activationOnly === true) score += 100;
          if (activatedAt) {
            score -= Math.min(
              90,
              Math.abs(Number(entry.at || 0) - activatedAt) / 100
            );
          }
          return score;
        };

        return rank(right, rd) - rank(left, ld);
      });

    const recoveredMapId = candidates[0]?.detail?.mapId || null;
    if (!recoveredMapId || !BF.maps?.[recoveredMapId]) return bound;

    const enriched = {
      ...bound,
      mapId: recoveredMapId,
      mapRecoveredFromHistory: true
    };

    manager.memory?.setFact?.(targetKey(missionId), enriched);
    manager.memory?.save?.();
    return enriched;
  };

  const resolvedBoundFor = (manager, missionId) => {
    const bound = boundFor(manager, missionId);
    return recoverTargetMapFromHistory(manager, missionId, bound);
  };

  /*
   * Pour les FUTURES activations, BibleRuntime connaît déjà event.mapId.
   * On enrichit le bibleTarget juste après l'activation sans modifier
   * le contrat Bible ni rendre cette donnée obligatoire.
   */
  const installActivationMapCapture = () => {
    const runtime = BF.bibleRuntime;
    if (
      !runtime?.activateMission ||
      runtime.activateMission.__targetMapCaptureV19_12_1
    ) return false;

    const originalActivate = runtime.activateMission.bind(runtime);

    const wrapped = function activateMissionWithTargetMap(mission, event = {}) {
      const result = originalActivate(mission, event);

      if (result && mission?.id && event?.mapId) {
        const manager = this.manager?.();
        const key = targetKey(mission.id);
        const bound = manager?.memory?.getFact?.(key);

        if (bound && !bound.mapId) {
          manager.memory.setFact(key, {
            ...bound,
            mapId: event.mapId
          });
          manager.memory.save?.();
        }
      }

      return result;
    };

    wrapped.__targetMapCaptureV19_12_1 = true;
    runtime.activateMission = wrapped;
    return true;
  };

  installActivationMapCapture();

  const mapExists = (mapId) =>
    Boolean(mapId && BF.maps?.[mapId]);

  const knownRoute = (engine, mapId) => {
    if (!engine || !mapId || mapId === engine.currentMapId) return null;
    const route = engine.findKnownRoute?.(engine.currentMapId, mapId);
    return Array.isArray(route) && route.length >= 2 ? route : null;
  };

  /*
   * Enrichissement optionnel du binding avec sa map d'origine.
   * L'absence de mapId ne bloque JAMAIS une mission.
   */
  const rememberTargetMapFromEvent = (event) => {
    if (!event?.mapId) return;

    const manager = BF.currentEngine?.missionManager;
    if (!manager?.activeMissionIds?.length) return;

    global.setTimeout?.(() => {
      let changed = false;

      manager.activeMissionIds.forEach((missionId) => {
        const key = `bibleTarget:${missionId}`;
        const bound = manager.memory?.getFact?.(key);
        if (!bound || bound.mapId) return;

        const sameInstance =
          bound.instanceId &&
          String(bound.instanceId) === String(event.instanceId || "");

        const sameDefinition =
          !bound.instanceId &&
          bound.objectId &&
          String(bound.objectId).toLowerCase() ===
            String(event.objectId || "").toLowerCase();

        const eventType = String(
          event.detail?.cuoType || event.family || ""
        ).toLowerCase();
        const sameType =
          !bound.instanceId &&
          !sameDefinition &&
          bound.cuoType &&
          String(bound.cuoType).toLowerCase() === eventType;

        if (!sameInstance && !sameDefinition && !sameType) return;

        manager.memory.setFact?.(key, {
          ...bound,
          mapId: event.mapId
        });
        changed = true;
      });

      if (changed) manager.memory?.save?.();
    }, 0);
  };

  BF.ObjectEvents?.subscribe?.(rememberTargetMapFromEvent);

  /*
   * MissionManager : corrige uniquement l'évaluation des objectifs
   * d'étude possédant un bibleTarget.
   *
   * Pas de bibleTarget => comportement existant inchangé.
   */
  const Manager = Missions.MissionManager;
  if (Manager?.prototype && !Manager.prototype.__targetArbitrationV19_12_1_1) {
    const originalAssess = Manager.prototype.assessMission;

    Manager.prototype.assessMission =
      function assessMissionWithTargetAvailability(missionId, context) {
        const result = originalAssess.call(this, missionId, context);
        const action = result?.action;

        if (!action || !STUDY.has(normalize(action.type))) {
          return result;
        }

        const bound = resolvedBoundFor(this, missionId);
        if (!bound) return result;

        const local = localBoundTarget(this.engine, bound);
        if (local) {
          return {
            ...result,
            reasons: [
              ...(result.reasons || []),
              "cible missionnelle locale"
            ]
          };
        }

        /*
         * Cible absente de la map actuelle.
         * Si sa map d'origine est connue et joignable, la mission propose
         * un déplacement. Le BAC arbitre ce TRAVEL normalement.
         */
        const route =
          mapExists(bound.mapId) &&
          bound.mapId !== this.engine.currentMapId
            ? knownRoute(this.engine, bound.mapId)
            : null;

        if (route) {
          return {
            ...result,
            action: {
              id: `${action.id}:travel-target`,
              nodeId: action.nodeId,
              type: Missions.ActionType.TRAVEL,
              title: `Rejoindre la cible de « ${action.title} »`,
              params: {
                ...(action.params || {}),
                missionTargetTravel: true,
                targetMapId: bound.mapId,
                resumeActionType: action.type,
                resumeNodeId: action.nodeId
              },
              issuedAt: Date.now()
            },
            reasons: [
              ...(result.reasons || []).filter(
                (reason) => reason !== "action réalisable"
              ),
              "cible missionnelle sur une autre map connue"
            ]
          };
        }

        /*
         * Ni cible locale, ni route exploitable :
         * la mission reste active mais n'a rien à proposer maintenant.
         * chooseRunnableMissionAction() l'écartera et rendra la main au BAC.
         */
        return {
          ...result,
          action: null,
          score: Number(result.score || 0) - 165,
          reasons: [
            ...(result.reasons || []).filter(
              (reason) => reason !== "action réalisable"
            ),
            "cible missionnelle indisponible actuellement"
          ]
        };
      };

    Manager.prototype.__targetArbitrationV19_12_1_1 = true;
  }

  /*
   * ActionBridge : sécurité de dernier niveau.
   * Si une action d'étude liée à une cible stricte arrive ici alors que
   * la cible n'est pas locale, on refuse l'exécution au lieu de laisser
   * Object-M0 retomber sur l'ancien sélecteur générique.
   */
  const Bridge = Missions.ActionBridge;
  if (Bridge?.prototype && !Bridge.prototype.__targetArbitrationV19_12_1_1) {
    const previousExecute = Bridge.prototype.execute;

    Bridge.prototype.execute =
      function executeWithTargetAvailability(action, now) {
        if (
          action?.missionId &&
          STUDY.has(normalize(action.type))
        ) {
          const manager = this.engine?.missionManager;
          const bound = resolvedBoundFor(manager, action.missionId);

          if (bound && !localBoundTarget(this.engine, bound)) {
            return false;
          }
        }

        if (
          action?.type === Missions.ActionType.TRAVEL &&
          action?.params?.missionTargetTravel
        ) {
          if (this.isEngineBusy()) return false;

          const targetMapId = action.params.targetMapId;
          const route = knownRoute(this.engine, targetMapId);
          const nextMapId = route?.[1];

          const gate = nextMapId
            ? this.engine.currentMap?.gates?.find(
                (candidate) =>
                  candidate.userData?.exit?.targetMap === nextMapId
              )
            : null;

          if (!gate) return false;

          this.engine.pendingGate = gate;
          this.engine.character.setTarget(gate.position, "run");
          this.engine.showWorldMarker?.(gate.position);
          this.engine.callbacks?.onStatus?.(
            `Mission : BlueFox peut rejoindre une cible située sur un territoire connu.`
          );
          return true;
        }

        return previousExecute.call(this, action, now);
      };

    Bridge.prototype.__targetArbitrationV19_12_1_1 = true;
  }

  /*
   * Le TRAVEL est un proxy, pas une étape de mission.
   * À l'arrivée sur la map cible on libère simplement l'action afin que
   * le planner repropose ensuite l'étude de l'objet.
   */
  global.addEventListener?.(
    "bluefox:map-transition-completed",
    (event) => {
      const manager = BF.currentEngine?.missionManager;
      const action = manager?.currentAction;

      if (!action?.params?.missionTargetTravel) return;

      const arrivedMap =
        event?.detail?.mapId ||
        event?.detail?.toMapId ||
        BF.currentEngine?.currentMapId;

      if (
        String(arrivedMap || "") !==
        String(action.params.targetMapId || "")
      ) return;

      manager.memory?.remember?.("mission-target-travel-arrived", {
        missionId: action.missionId,
        nodeId: action.nodeId,
        mapId: arrivedMap
      });

      manager.currentAction = null;
      manager.retryAfter = performance.now() + 300;
      manager.lastPlanAt = 0;
      manager.publish?.();
    }
  );

  BF.getMissionTargetArbitrationDiagnostics = (missionId) => {
    const engine = BF.currentEngine;
    const manager = engine?.missionManager;
    const bound = resolvedBoundFor(manager, missionId);

    const assessment =
      manager?.assessMission?.(
        missionId,
        manager?.bridge?.context?.() || {}
      ) || null;

    return {
      missionId,
      currentMapId: engine?.currentMapId || null,
      bound,
      localTarget: Boolean(bound && localBoundTarget(engine, bound)),
      targetMapKnown: Boolean(bound?.mapId),
      route: bound?.mapId ? knownRoute(engine, bound.mapId) : null,
      proposedAction: assessment?.action
        ? {
            type: assessment.action.type,
            title: assessment.action.title,
            params: assessment.action.params
          }
        : null,
      assessmentReasons: assessment?.reasons || []
    };
  };
})(window);
