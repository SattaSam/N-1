(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const VERSION = "sequence-actions-v1";
  const STUDY_TYPES = new Set(["observe", "inspect", "analyze"]);

  const normalizeAction = (value) =>
    Missions.normalizeActionType?.(value) || String(value || "").trim().toLowerCase();

  const sequenceTargetKey = (missionId) => `sequenceTarget:${missionId}`;

  const identityFromEvent = (event) => ({
    instanceId: String(event?.instanceId || ""),
    objectId: String(event?.objectId || "").toLowerCase(),
    cuoType: String(event?.detail?.cuoType || "").toLowerCase()
  });

  const bindSequenceTarget = (manager, missionId, event) => {
    const identity = identityFromEvent(event);
    if (!identity.instanceId && !identity.objectId && !identity.cuoType) return false;
    manager?.memory?.setFact?.(sequenceTargetKey(missionId), identity);
    return true;
  };

  const eventMatchesSequenceTarget = (manager, missionId, event) => {
    const bound = manager?.memory?.getFact?.(sequenceTargetKey(missionId));
    if (!bound) return true;
    const identity = identityFromEvent(event);
    if (bound.instanceId) return identity.instanceId === bound.instanceId;
    if (bound.objectId) return identity.objectId === bound.objectId;
    if (bound.cuoType) return identity.cuoType === bound.cuoType;
    return true;
  };

  const installEventBinding = () => {
    const Manager = Missions.MissionManager;
    if (!Manager?.prototype || Manager.prototype.__sequenceActionsBindingV1) return false;
    const originalConsume = Manager.prototype.consumeObjectEvent;
    if (typeof originalConsume !== "function") return false;

    Manager.prototype.consumeObjectEvent = function consumeSequenceObjectEvent(event) {
      const missionId = event?.detail?.missionId || this.currentAction?.missionId || null;
      if (missionId) {
        const tree = this.trees?.get?.(missionId);
        const currentNode = this.currentAction?.nodeId
          ? tree?.find?.(this.currentAction.nodeId)
          : null;
        const isSequence =
          currentNode?.params?.biblePattern === "SEQUENCE_ACTIONS";
        const sameTarget = currentNode?.params?.sameTarget === true;

        if (isSequence && sameTarget) {
          const existing = this.memory?.getFact?.(sequenceTargetKey(missionId));
          if (existing && !eventMatchesSequenceTarget(this, missionId, event)) {
            return false;
          }
          if (!existing && STUDY_TYPES.has(normalizeAction(currentNode.type))) {
            bindSequenceTarget(this, missionId, event);
          }
        }
      }
      return originalConsume.call(this, event);
    };

    Manager.prototype.__sequenceActionsBindingV1 = true;
    return true;
  };

  const installActionTargeting = () => {
    const Bridge = Missions.ActionBridge;
    if (!Bridge?.prototype || Bridge.prototype.__sequenceActionsTargetingV1) return false;
    const originalExecute = Bridge.prototype.execute;

    Bridge.prototype.execute = function executeSequenceAction(action, now) {
      if (
        action?.params?.biblePattern === "SEQUENCE_ACTIONS" &&
        action?.params?.sameTarget === true &&
        STUDY_TYPES.has(normalizeAction(action.type))
      ) {
        const bound = this.engine?.missionManager?.memory?.getFact?.(
          sequenceTargetKey(action.missionId)
        );
        if (bound?.instanceId) {
          const candidates = (this.engine.currentMap?.interactables || [])
            .filter((object) => {
              if (!object?.userData?.active) return false;
              const instanceId = String(
                object.userData?.instanceId ||
                object.userData?.worldAnchor?.userData?.instanceId ||
                ""
              );
              return instanceId === String(bound.instanceId);
            });
          if (!candidates.length) return false;
          const target = candidates[0];
          target.userData.requestedInteraction = action.type;
          target.userData.requestedInteractionSource = "mission";
          target.userData.missionSubject = action.params?.subject || null;
          target.userData.missionNarrativeVerb = action.type;
          target.userData.missionNodeId = action.nodeId || null;
          target.userData.missionId = action.missionId || null;
          return this.engine.targetInteraction(target) !== false;
        }
      }
      return originalExecute.call(this, action, now);
    };

    Bridge.prototype.__sequenceActionsTargetingV1 = true;
    return true;
  };

  const install = () => {
    installEventBinding();
    installActionTargeting();
    return true;
  };

  BF.installSequenceActions = install;
  BF.compileSequenceMission = (mission) =>
    BF.bibleRuntime?.compileMission?.(mission) || null;
  BF.getSequenceActionsDiagnostics = () => ({
    version: VERSION,
    compiler: Boolean(BF.BibleRuntimeV01?.prototype?.__sequenceActionsCompilerV1),
    eventBinding: Boolean(Missions.MissionManager?.prototype?.__sequenceActionsBindingV1),
    targeting: Boolean(Missions.ActionBridge?.prototype?.__sequenceActionsTargetingV1)
  });

  install();
})(window);
