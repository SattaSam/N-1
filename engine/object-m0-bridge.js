(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const installed = { mission: false, action: false, world: false };

  const ancestors = (object) => {
    const chain = [];
    let cursor = object;
    while (cursor) {
      chain.push(cursor);
      cursor = cursor.parent || null;
    }
    return chain;
  };

  const resolveObject = (object) => {
    const chain = ancestors(object);
    const anchor = object?.userData?.worldAnchor ||
      chain.find((node) => node.userData?.worldAnchor)?.userData.worldAnchor ||
      chain.find((node) => node.userData?.functional || node.userData?.objectType) ||
      object;
    const nodes = [...chain, anchor].filter(Boolean);
    let definition = null;

    for (const node of nodes) {
      definition = node.userData?.functional || node.userData?.definition || null;
      if (definition) break;
    }
    if (!definition && BF.ObjectLibrary) {
      for (const node of nodes) {
        const data = node.userData || {};
        definition = BF.ObjectLibrary.getById?.(data.catalogId) ||
          BF.ObjectLibrary.get?.(data.libraryType) ||
          BF.ObjectLibrary.get?.(data.objectType) || null;
        if (definition) break;
      }
    }
    if (!definition && BF.ObjectLibrary) {
      const names = nodes.map((node) => String(node.name || "").toLowerCase());
      const inferredType = names.some((name) => name.includes("ancientstele")) ? "stele" :
        names.some((name) => name.includes("luminouspool")) ? "pool" :
        names.some((name) => name.includes("fiberplant")) ? "fiber" :
        names.some((name) => name.includes("crystalcluster")) ? "crystal" : null;
      if (inferredType) definition = BF.ObjectLibrary.get(inferredType);
    }

    const data = object?.userData || {};
    const rootData = anchor?.userData || {};
    if (definition) {
      object.userData.functional = definition;
      object.userData.catalogId ||= definition.id;
      object.userData.libraryType ||= definition.type;
      if (anchor) {
        anchor.userData.functional = definition;
        anchor.userData.catalogId ||= definition.id;
        anchor.userData.objectType ||= definition.type;
      }
    }
    return { object, anchor, data, rootData, definition };
  };

  const interactionState = (resolved) => {
    const owner = resolved.anchor || resolved.object;
    owner.userData.interactionState ||= {
      inspected: false,
      analyzed: false,
      identified: false,
      collected: false,
      inspectionCount: 0,
      collectionCount: 0
    };
    return owner.userData.interactionState;
  };

  const capabilities = (definition) => {
    const actions = new Set(definition?.interaction?.actions || []);
    return {
      inspectable: definition?.gameplay?.inspectable === true || actions.has("inspect") || actions.has("analyze"),
      collectable: definition?.gameplay?.collectable === true || actions.has("collect"),
      requiresInspection: definition?.interaction?.requiresInspectionBeforeCollect === true
    };
  };

  const resolveManualAction = (resolved) => {
    const { definition } = resolved;
    if (!definition) return null;
    const state = interactionState(resolved);
    const caps = capabilities(definition);
    if (caps.requiresInspection && caps.inspectable && caps.collectable) {
      return state.inspected || state.identified
        ? (definition.interaction?.afterInspectionAction || "collect")
        : "inspect";
    }
    const preferred = definition.interaction?.defaultManualAction || definition.interaction?.defaultAction;
    if (preferred === "collect" && caps.collectable) return "collect";
    if ((preferred === "inspect" || preferred === "analyze") && caps.inspectable) return preferred;
    if (caps.collectable) return "collect";
    if (caps.inspectable) return "inspect";
    return null;
  };

  const validateAction = (resolved, requested) => {
    const caps = capabilities(resolved.definition);
    const state = interactionState(resolved);
    if (requested === "collect") {
      if (!caps.collectable) return caps.inspectable ? "inspect" : null;
      if (caps.requiresInspection && !state.inspected && !state.identified) return "inspect";
      return "collect";
    }
    if (requested === "analyze") return caps.inspectable ? "analyze" : null;
    if (requested === "inspect") return caps.inspectable ? "inspect" : null;
    return resolveManualAction(resolved);
  };

  const eventMatchesNode = (event, node) => {
    const type = Missions.normalizeActionType(node.type);
    const detail = event.detail || {};
    const tags = new Set([...(event.tags || []), ...(detail.tags || [])]);
    if (event.type === BF.ObjectEvents?.types.RESOURCE_COLLECTED) {
      if (type !== Missions.ActionType.COLLECT) return false;
      const kind = detail.kind || event.inventoryKey || event.family;
      return !node.params.kind || node.params.kind === kind;
    }
    if (![BF.ObjectEvents?.types.OBJECT_INSPECTED, BF.ObjectEvents?.types.PHENOMENON_OBSERVED, BF.ObjectEvents?.types.OBJECT_ANALYZED].includes(event.type)) return false;
    if (type !== Missions.ActionType.OBSERVE) return false;
    const subject = String(node.params.subject || "").toLowerCase();
    if (!subject) return true;
    if (subject === "structure") return detail.kind === "structure" || tags.has("ruin") || tags.has("landmark");
    if (subject === "flora") return event.knowledgeFamily === "flora" || tags.has("plant");
    if (subject === "components") return tags.has("technology") || tags.has("ruin") || detail.kind === "debris";
    return subject === detail.subject || subject === detail.kind || subject === event.family;
  };

  const fanOut = (manager, event, excludedNodeId = null) => {
    if (!manager?.tree) return 0;
    let changed = 0;
    manager.tree.availableLeaves().forEach((node) => {
      if (node.id === excludedNodeId || node.isComplete || !eventMatchesNode(event, node)) return;
      if (node.increment(Math.max(1, Number(event.quantity) || 1))) changed += 1;
    });
    if (changed) {
      manager.tree.refresh();
      manager.memory.saveTree(manager.tree);
      manager.publish();
    }
    return changed;
  };

  const installMissionBridge = () => {
    if (installed.mission || !Missions.MissionManager || !BF.ObjectEvents) return false;
    installed.mission = true;
    const proto = Missions.MissionManager.prototype;
    proto.consumeObjectEvent = function consumeObjectEvent(event) {
      const mappedType = event.type === BF.ObjectEvents.types.RESOURCE_COLLECTED ? Missions.ActionType.COLLECT : Missions.ActionType.OBSERVE;
      const detail = { ...(event.detail || {}), kind: event.detail?.kind || event.inventoryKey || event.family, amount: Math.max(1, Number(event.quantity) || 1), objectId: event.objectId, instanceId: event.instanceId, mapId: event.mapId, zoneId: event.zoneId, eventType: event.type };
      const current = this.currentAction;
      let currentConsumed = false;
      if (current && current.type === mappedType) {
        const node = this.tree.find(current.nodeId);
        if (node && eventMatchesNode(event, node)) currentConsumed = this.notifyActionCompleted(mappedType, detail);
      }
      const changed = fanOut(this, event, currentConsumed ? current?.nodeId : null);
      if (!currentConsumed) this.memory.remember(event.type, detail);
      return currentConsumed || changed > 0;
    };
    const originalCreate = Missions.MissionManager.create;
    Missions.MissionManager.create = function createWithObjectEvents(options) {
      const manager = originalCreate.call(this, options);
      manager.unsubscribeObjectEvents?.();
      manager.unsubscribeObjectEvents = BF.ObjectEvents.subscribe((event) => manager.consumeObjectEvent(event));
      const originalDispose = manager.dispose.bind(manager);
      manager.dispose = () => { manager.unsubscribeObjectEvents?.(); manager.unsubscribeObjectEvents = null; originalDispose(); };
      return manager;
    };
    return true;
  };

  const selectObservable = (engine, action) => (engine.currentMap?.interactables || [])
    .filter((object) => object.userData.active && capabilities(resolveObject(object).definition).inspectable)
    .sort((left, right) => engine.character.root.position.distanceTo(left.position) - engine.character.root.position.distanceTo(right.position))[0] || null;

  const installActionBridge = () => {
    if (installed.action || !Missions.ActionBridge) return false;
    installed.action = true;
    const originalExecute = Missions.ActionBridge.prototype.execute;
    Missions.ActionBridge.prototype.execute = function executeObjectAware(action, now) {
      if (action?.type === Missions.ActionType.OBSERVE && !this.isEngineBusy()) {
        const target = selectObservable(this.engine, action);
        if (target) {
          target.userData.requestedInteraction = "inspect";
          target.userData.requestedInteractionSource = "mission";
          target.userData.missionSubject = action.params?.subject || null;
          this.engine.targetInteraction(target);
          return true;
        }
      }
      return originalExecute.call(this, action, now);
    };
    return true;
  };

  const patchWorldEngineInstance = (engine) => {
    if (!engine || engine.__objectM0BridgePatched) return false;
    engine.__objectM0BridgePatched = true;
    const originalTarget = engine.targetInteraction.bind(engine);

    engine.targetInteraction = function targetObjectInteraction(object, retry = false) {
      const resolved = resolveObject(object);
      const source = object.userData.requestedInteractionSource;
      const requested = source === "mission" ? object.userData.requestedInteraction : null;
      const mode = validateAction(resolved, requested || resolveManualAction(resolved));
      if (!resolved.definition || !mode) {
        console.warn("[BlueFox O5.1] Interaction refusée : objet absent ou incomplet dans le CUO.", object);
        this.callbacks.onStatus("BlueFox ne sait pas encore comment interagir avec cet objet.");
        object.userData.requestedInteraction = null;
        object.userData.requestedInteractionSource = null;
        return false;
      }
      object.userData.requestedInteraction = mode;
      object.userData.requestedInteractionSource = source || "manual";
      originalTarget(object, retry);
      const label = resolved.definition.label?.toLowerCase() || "l’objet";
      this.callbacks.onStatus(mode === "collect" ? `BlueFox s’approche de ${label} pour le prélever.` : `BlueFox s’approche de ${label} pour l’étudier.`);
      return true;
    };

    engine.updateInteraction = function updateObjectInteraction(now) {
      if (!this.pendingInteraction || !this.pendingInteraction.userData.active) return;
      const object = this.pendingInteraction;
      const resolved = resolveObject(object);
      const { anchor, definition } = resolved;
      if (!definition) {
        console.warn("[BlueFox O5.1] Définition CUO introuvable pendant l’interaction.", object);
        this.pendingInteraction = null;
        this.character.stop();
        return;
      }
      const state = interactionState(resolved);
      const mode = validateAction(resolved, object.userData.requestedInteraction);
      if (!mode) {
        this.callbacks.onStatus("Cette interaction n’est pas autorisée par le catalogue d’objets.");
        this.pendingInteraction = null;
        this.character.stop();
        return;
      }
      object.userData.requestedInteraction = mode;
      const distance = this.character.root.position.distanceTo(anchor.position);
      const interactionDistance = (object.userData.approachDistance || 1.36) + 0.18;
      if (distance > interactionDistance) {
        if (!this.interactionStartedAt && now - this.interactionApproachStartedAt > 6500) {
          this.interactionApproachAttempts += 1;
          if (this.interactionApproachAttempts <= 3) this.targetInteraction(object, true);
          else {
            this.callbacks.onStatus("BlueFox renonce temporairement à cet objet inaccessible.");
            this.pendingInteraction = null;
            this.interactionApproachStartedAt = 0;
            this.interactionApproachAttempts = 0;
            this.character.stop();
            this.missionManager?.cancelCurrentAction("object-inaccessible");
          }
        }
        return;
      }

      this.character.stop();
      if (!this.interactionStartedAt) {
        this.interactionStartedAt = now;
        this.character.facePoint(anchor.position);
        const duration = this.character.playInteraction(object.userData.kind);
        this.interactionDuration = Math.max(2200, duration * 1000);
        const label = definition.label?.toLowerCase() || "l’objet";
        this.callbacks.onAction(mode === "collect" ? `BlueFox collecte ${label}.` : mode === "analyze" ? `BlueFox analyse ${label}.` : definition.type === "pool" ? `BlueFox observe le phénomène du ${label}.` : `BlueFox inspecte ${label}.`);
        return;
      }
      if (now - this.interactionStartedAt < this.interactionDuration) return;

      const detail = {
        kind: definition.resource?.inventoryKey || definition.type || object.userData.kind,
        subject: object.userData.missionSubject || definition.type || object.userData.kind,
        mapId: this.currentMapId,
        zoneId: this.currentZoneIndex,
        amount: 1,
        quantity: 1,
        interactionMode: mode,
        interactionState: { ...state }
      };

      if (mode === "collect") {
        state.collected = true;
        state.collectionCount += 1;
        object.userData.active = false;
        anchor.visible = false;
        const inventoryKey = definition.resource?.inventoryKey || definition.type || object.userData.kind;
        this.callbacks.onCollect(inventoryKey);
        BF.ObjectEvents.emit(BF.ObjectEvents.types.RESOURCE_COLLECTED, object, { ...detail, inventoryKey });
        const cooldown = setTimeout(() => {
          if (this.disposed) return;
          anchor.visible = true;
          object.userData.active = true;
          state.collected = false;
          object.userData.requestedInteraction = null;
          object.userData.requestedInteractionSource = null;
          this.resourceCooldowns.delete(object);
        }, 18000);
        this.resourceCooldowns.set(object, cooldown);
      } else {
        state.inspected = true;
        state.identified = true;
        state.inspectionCount += 1;
        if (mode === "analyze") state.analyzed = true;
        const isPhenomenon = definition.type === "pool" || definition.observation?.events?.includes("PHENOMENON_OBSERVED");
        const eventType = mode === "analyze" ? BF.ObjectEvents.types.OBJECT_ANALYZED : isPhenomenon ? BF.ObjectEvents.types.PHENOMENON_OBSERVED : BF.ObjectEvents.types.OBJECT_INSPECTED;
        BF.ObjectEvents.emit(eventType, object, { ...detail, interactionState: { ...state } });
        object.userData.lastInspectedAt = Date.now();
        object.userData.requestedInteraction = null;
        object.userData.requestedInteractionSource = null;
      }

      this.character.cancelInteraction();
      this.completedInteractions += 1;
      this.lastCompletedAction = `${mode}:${definition.type}`;
      this.pendingInteraction = null;
      this.interactionStartedAt = 0;
      this.interactionApproachStartedAt = 0;
      this.interactionApproachAttempts = 0;
      this.character.currentAnimation = "";
      this.postActionRecoveryUntil = now + 650;
      this.lastActivityAt = now;
      this.lastAutonomyAt = now - 5600;
    };

    installed.world = true;
    return true;
  };

  const installWorldBridge = () => {
    if (installed.world || !BF.ObjectEvents || typeof BF.mount !== "function") return false;
    if (BF.mount.__objectM0Wrapped) return false;
    const originalMount = BF.mount;
    const wrappedMount = async function mountWithObjectBridge(options) {
      const engine = await originalMount.call(this, options);
      patchWorldEngineInstance(engine);
      return engine;
    };
    wrappedMount.__objectM0Wrapped = true;
    BF.mount = wrappedMount;
    return true;
  };

  const install = () => {
    installMissionBridge();
    installActionBridge();
    installWorldBridge();
    return { ...installed };
  };

  BF.resolveObjectInteraction = (object) => {
    const resolved = resolveObject(object);
    return {
      definitionId: resolved.definition?.id || null,
      type: resolved.definition?.type || null,
      label: resolved.definition?.label || null,
      action: resolveManualAction(resolved),
      capabilities: capabilities(resolved.definition),
      state: resolved.definition ? { ...interactionState(resolved) } : null
    };
  };
  BF.installObjectM0Bridge = install;
  BF.getObjectM0BridgeState = () => ({ ...installed });
  install();
})(window);
