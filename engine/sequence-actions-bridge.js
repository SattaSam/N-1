(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const VERSION = "sequence-actions-v1";
  const STUDY_TYPES = new Set(["observe", "inspect", "analyze"]);

  const asArray = (value) =>
    Array.isArray(value) ? value : value == null ? [] : [value];

  const normalizeAction = (value) =>
    Missions.normalizeActionType?.(value) || String(value || "").trim().toLowerCase();

  const sequenceSteps = (mission) =>
    asArray(mission?.sequence).filter((step) => step && typeof step === "object");

  const compileSequenceMission = (mission, runtime) => {
    const steps = sequenceSteps(mission);
    if (mission?.pattern !== "SEQUENCE_ACTIONS" || steps.length < 2) return null;

    const nodeIds = steps.map((step, index) =>
      `${mission.id}:${step.slot || `step${index + 1}`}`
    );

    const children = steps.map((step, index) => {
      const slot = step.slot || `step${index + 1}`;
      const requires = step.requires != null
        ? asArray(step.requires).map((required) => {
            const requiredIndex = steps.findIndex((candidate, candidateIndex) =>
              (candidate.slot || `step${candidateIndex + 1}`) === required
            );
            return requiredIndex >= 0 ? nodeIds[requiredIndex] : null;
          }).filter(Boolean)
        : index > 0 ? [nodeIds[index - 1]] : [];

      return {
        id: nodeIds[index],
        title: step.title || slot,
        description: step.description || "",
        type: normalizeAction(step.action),
        target: Math.max(1, Number(step.target) || 1),
        params: {
          ...(step.params || {}),
          bibleMissionId: mission.id,
          biblePattern: mission.pattern,
          sequenceIndex: index,
          sequenceSlot: slot,
          sameTarget: mission.sameTarget === true || step.sameTarget === true
        },
        requires,
        optional: step.optional === true
      };
    });

    return {
      id: mission.id,
      title: mission.title,
      description: mission.description || "",
      priority: Number(mission.priority) || 0,
      passivePriorityAxis:
        mission.passivePriorityAxis ||
        BF.BiblePatterns?.SEQUENCE_ACTIONS?.autonomyAxis ||
        null,
      journalIntro: mission.narrative?.revealed?.[0] || "",
      bible: {
        version: runtime?.constructor ? "0.1" : "0.1",
        pattern: mission.pattern
      },
      root: {
        id: `${mission.id}:root`,
        title: mission.title,
        type: "group",
        target: 1,
        children
      }
    };
  };

  const installCompiler = () => {
    const Runtime = BF.BibleRuntimeV01;
    if (!Runtime?.prototype || Runtime.prototype.__sequenceActionsCompilerV1) return false;
    const original = Runtime.prototype.compileMission;
    Runtime.prototype.compileMission = function compileMissionWithSequence(mission) {
      if (mission?.pattern === "SEQUENCE_ACTIONS") {
        return compileSequenceMission(mission, this);
      }
      return original.call(this, mission);
    };
    Runtime.prototype.__sequenceActionsCompilerV1 = true;
    return true;
  };

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

  const validateSequenceMission = (mission) => {
    if (mission?.pattern !== "SEQUENCE_ACTIONS") return [];
    const errors = [];
    const steps = sequenceSteps(mission);
    if (steps.length < 2) {
      errors.push(`${mission.id || "<sans-id>"} · sequence : minimum 2 étapes.`);
      return errors;
    }
    const slots = new Set();
    steps.forEach((step, index) => {
      const slot = step.slot || `step${index + 1}`;
      if (slots.has(slot)) {
        errors.push(`${mission.id} · sequence[${index}].slot : identifiant dupliqué.`);
      }
      slots.add(slot);
      const action = normalizeAction(step.action);
      if (!Object.values(Missions.ActionType || {}).includes(action)) {
        errors.push(`${mission.id} · sequence[${index}].action : action non supportée.`);
      }
      if (step.target != null && (!Number.isFinite(Number(step.target)) || Number(step.target) < 1)) {
        errors.push(`${mission.id} · sequence[${index}].target : doit être >= 1.`);
      }
    });
    steps.forEach((step, index) => {
      asArray(step.requires).forEach((required) => {
        if (!slots.has(required)) {
          errors.push(`${mission.id} · sequence[${index}].requires : slot inconnu ${required}.`);
        }
      });
    });
    return errors;
  };

  const installContractExtension = () => {
    const contract = BF.BibleContractV01;
    if (!contract?.validateMission || contract.__sequenceActionsContractV1) return false;
    const originalValidateMission = contract.validateMission;
    const originalValidateCatalog = contract.validateCatalog;

    const validateMission = (mission, patterns, options = {}) => {
      const report = originalValidateMission(mission, patterns, options);
      if (mission?.pattern !== "SEQUENCE_ACTIONS") return report;
      const legacySlotErrors = (report.errors || []).filter((message) =>
        !message.includes("slots : objet requis") &&
        !message.includes("slots.")
      );
      const sequenceErrors = validateSequenceMission(mission);
      return {
        ...report,
        ok: legacySlotErrors.length + sequenceErrors.length === 0,
        errors: [...legacySlotErrors, ...sequenceErrors]
      };
    };

    const validateCatalog = (catalog, patterns, options = {}) => {
      const list = Array.isArray(catalog) ? catalog : Object.values(catalog || {});
      const base = originalValidateCatalog(catalog, patterns, options);
      const sequenceMissionIds = new Set(
        list.filter((mission) => mission?.pattern === "SEQUENCE_ACTIONS").map((mission) => mission.id)
      );
      const errors = (base.errors || []).filter((message) =>
        ![...sequenceMissionIds].some((id) =>
          message.startsWith(`${id} · slots`)
        )
      );
      sequenceMissionIds.forEach((id) => {
        const mission = list.find((item) => item.id === id);
        errors.push(...validateSequenceMission(mission));
      });
      return Object.freeze({
        ...base,
        ok: errors.length === 0,
        errors: Object.freeze(errors)
      });
    };

    // Object.freeze empêche le remplacement direct du contrat existant.
    BF.BibleContractV01 = Object.freeze({
      ...contract,
      validateMission,
      validateCatalog,
      sequenceActions: Object.freeze({
        version: VERSION,
        minSteps: 2
      }),
      __sequenceActionsContractV1: true
    });
    return true;
  };

  const install = () => {
    installContractExtension();
    installCompiler();
    installEventBinding();
    installActionTargeting();
    return true;
  };

  BF.installSequenceActions = install;
  BF.compileSequenceMission = compileSequenceMission;
  BF.getSequenceActionsDiagnostics = () => ({
    version: VERSION,
    compiler: Boolean(BF.BibleRuntimeV01?.prototype?.__sequenceActionsCompilerV1),
    eventBinding: Boolean(Missions.MissionManager?.prototype?.__sequenceActionsBindingV1),
    targeting: Boolean(Missions.ActionBridge?.prototype?.__sequenceActionsTargetingV1)
  });

  install();
})(window);
