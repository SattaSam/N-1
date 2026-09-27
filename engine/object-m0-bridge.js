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
      // Compatibilité de lecture pour les anciennes instances sans identifiant
      // CUO. Cette inférence ne décide jamais de l'action à exécuter.
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
      observed: false,
      analyzed: false,
      identified: false,
      collected: false,
      inspectionCount: 0,
      observationCount: 0,
      analysisCount: 0,
      collectionCount: 0,
      studyGeneration: 0
    };
    const state = owner.userData.interactionState;
    state.studyGeneration = Math.max(0, Number(state.studyGeneration) || 0);
    return state;
  };

  const capabilities = (definition) => {
    const actions = new Set(definition?.interaction?.actions || []);
    return {
      observable: actions.has("observe"),
      inspectable: definition?.gameplay?.inspectable === true || actions.has("inspect"),
      analyzable: definition?.gameplay?.analyzable === true || actions.has("analyze"),
      collectable: definition?.gameplay?.collectable === true || actions.has("collect") || actions.has("extract"),
      extractable: actions.has("extract") || definition?.resource?.exploitability === "extractable",
      requiresInspection: definition?.interaction?.requiresInspectionBeforeCollect === true
    };
  };

  const acquisitionObservationDue = (definition, state) => {
    if (definition?.interaction?.observeBeforeAcquire !== true) return false;
    return state.acquisitionObservationSatisfied !== true;
  };

  const resolveManualAction = (resolved) => {
    const { definition } = resolved;
    if (!definition) return null;
    const state = interactionState(resolved);
    const caps = capabilities(definition);
    const neverStudied =
      !state.observed && !state.inspected && !state.analyzed && !state.identified &&
      Number(state.observationCount || 0) === 0 &&
      Number(state.inspectionCount || 0) === 0 &&
      Number(state.analysisCount || 0) === 0;
    // La première rencontre d'un objet étudiable est toujours une observation
    // physique. Le geste d'acquisition CUO ne devient disponible qu'ensuite.
    if (
      (neverStudied || acquisitionObservationDue(definition, state)) &&
      (caps.observable || caps.inspectable || caps.analyzable)
    ) {
      return "observe";
    }
    if (caps.requiresInspection && caps.inspectable && caps.collectable) {
      return state.inspected || state.identified
        ? (definition.interaction?.afterInspectionAction || "collect")
        : "inspect";
    }
    const preferred = definition.interaction?.defaultManualAction || definition.interaction?.defaultAction;
    if (preferred === "extract" && caps.extractable) return "extract";
    if (preferred === "collect" && caps.collectable) return "collect";
    if (preferred === "analyze" && caps.analyzable) return "analyze";
    if (preferred === "inspect" && caps.inspectable) return "inspect";
    if (preferred === "observe" && caps.observable) return "observe";
    if (caps.extractable) return "extract";
    if (caps.collectable) return definition.interaction?.acquisitionAction || "collect";
    if (caps.analyzable) return "analyze";
    if (caps.inspectable) return "inspect";
    if (caps.observable) return "observe";
    return null;
  };

  const acquisitionAction = (definition) => {
    const caps = capabilities(definition);
    if (!caps.collectable) return null;
    const configured = String(
      definition?.interaction?.acquisitionAction ||
      definition?.interaction?.afterInspectionAction ||
      ""
    ).toLowerCase();
    if (configured === "extract" && caps.extractable) return "extract";
    if (configured === "collect") return "collect";
    const actions = new Set(definition?.interaction?.actions || []);
    if (caps.extractable && !actions.has("collect")) return "extract";
    return "collect";
  };

  const clearAcquisitionIntent = (object) => {
    if (!object?.userData) return;
    object.userData.acquisitionIntent = null;
    object.userData.acquisitionIntentSource = null;
    object.userData.acquisitionPhase = null;
    object.userData.acquisitionMissionId = null;
    object.userData.acquisitionMissionNodeId = null;
    object.userData.acquisitionInstanceId = null;
    object.userData.acquisitionMissionSubject = null;
    object.userData.acquisitionMissionNarrativeVerb = null;
  };

  const clearAcquisitionTransaction = (engine, object) => {
    if (!object) return;
    const resolved = resolveObject(object);
    const instanceId = String(
      object.userData?.instanceId ||
      resolved.anchor?.userData?.instanceId ||
      ""
    );
    clearAcquisitionIntent(object);
    if (resolved.anchor !== object) clearAcquisitionIntent(resolved.anchor);
    if (!instanceId) return;
    (engine?.currentMap?.interactables || []).forEach((candidate) => {
      const candidateId = String(
        candidate?.userData?.instanceId ||
        candidate?.userData?.worldAnchor?.userData?.instanceId ||
        ""
      );
      if (candidateId === instanceId) clearAcquisitionIntent(candidate);
    });
  };

  const rememberAcquisitionIntent = (object, action, source) => {
    if (!object?.userData || !["collect", "extract"].includes(action)) return;
    object.userData.acquisitionIntent = action;
    object.userData.acquisitionIntentSource = source || "manual";
    object.userData.acquisitionMissionId = object.userData.missionId || null;
    object.userData.acquisitionMissionNodeId =
      object.userData.missionNodeId || null;
    object.userData.acquisitionInstanceId = String(
      object.userData.instanceId ||
      object.userData.worldAnchor?.userData?.instanceId ||
      ""
    ) || null;
    object.userData.acquisitionMissionSubject =
      object.userData.missionSubject || null;
    object.userData.acquisitionMissionNarrativeVerb =
      object.userData.missionNarrativeVerb || null;
  };

  const bindAcquisitionMission = (object) => {
    if (!object?.userData?.acquisitionIntent) return;
    object.userData.acquisitionMissionId =
      object.userData.missionId ||
      object.userData.acquisitionMissionId ||
      null;
    object.userData.acquisitionMissionNodeId =
      object.userData.missionNodeId ||
      object.userData.acquisitionMissionNodeId ||
      null;
    object.userData.acquisitionMissionSubject =
      object.userData.missionSubject ||
      object.userData.acquisitionMissionSubject ||
      null;
    object.userData.acquisitionMissionNarrativeVerb =
      object.userData.missionNarrativeVerb ||
      object.userData.acquisitionMissionNarrativeVerb ||
      null;
  };

  const validateAction = (resolved, requested, missionRequested = false) => {
    const caps = capabilities(resolved.definition);
    const state = interactionState(resolved);
    const allowed = new Set(resolved.definition?.interaction?.actions || []);
    if (requested === "collect" || requested === "extract") {
      if (!caps.collectable) return caps.inspectable ? "inspect" : null;
      const neverStudied =
        !state.observed && !state.inspected && !state.analyzed && !state.identified &&
        Number(state.observationCount || 0) === 0 &&
        Number(state.inspectionCount || 0) === 0 &&
        Number(state.analysisCount || 0) === 0;
      if (
        (neverStudied || acquisitionObservationDue(resolved.definition, state)) &&
        canStudy(resolved.definition)
      ) return "observe";
      if (caps.requiresInspection && !state.inspected && !state.identified) return "inspect";
      if (requested === "extract" && !caps.extractable) {
        return allowed.has("collect") ? "collect" : null;
      }
      if (requested === "collect" && caps.extractable && !allowed.has("collect")) {
        return "extract";
      }
      return requested;
    }
    // Une mission peut imposer une nouvelle étude d'un objet déjà connu, même
    // si cette action n'est pas son geste manuel CUO par défaut. L'autorisation
    // contextuelle reste limitée aux trois verbes d'étude et à un objet que le
    // moteur sait au minimum étudier.
    if (missionRequested && ["observe", "inspect", "analyze"].includes(requested)) {
      const passiveMissionStudy = resolved?.object?.userData?.missionPassiveStudy === true;
      return canStudy(resolved.definition) || passiveMissionStudy ? requested : null;
    }
    if (requested === "analyze") return caps.analyzable ? "analyze" : null;
    if (requested === "inspect") return caps.inspectable ? "inspect" : null;
    // OBSERVE est le geste physique canonique des verbes narratifs observer,
    // inspecter et analyser, y compris pour les anciens CUO qui n'exposent
    // encore que inspect/analyze dans leur catalogue.
    if (requested === "observe") return canStudy(resolved.definition) ? "observe" : null;
    return resolveManualAction(resolved);
  };

  const isStudyAction = (type) => [
    Missions.ActionType.OBSERVE,
    Missions.ActionType.INSPECT,
    Missions.ActionType.ANALYZE
  ].includes(Missions.normalizeActionType(type));

  const narrativeStudyVerb = (type) => {
    const normalized = Missions.normalizeActionType(type);
    if (normalized === Missions.ActionType.ANALYZE) return "analyze";
    if (normalized === Missions.ActionType.INSPECT) return "inspect";
    return "observe";
  };

  const lower = (value) => String(value ?? "").trim().toLowerCase();
  const asArray = (value) => Array.isArray(value) ? value : value == null ? [] : [value];

  const FAU_CAUTIOUS_EVENT_TAGS = new Set([
    "fauna_behavior",
    "cautious_approach",
    "no_flee"
  ]);

  // FAU-01 attend un résultat comportemental : ces trois tags décrivent
  // l'événement à obtenir, pas des propriétés statiques que la créature doit
  // posséder avant l'approche. Ils restent strictement vérifiés par
  // eventMatchesNode() au moment du résultat.
  const studyTargetCriteria = (params = {}) => {
    const tagsAll = asArray(params.tagsAll);
    const normalized = new Set(tagsAll.map(lower));
    const cautiousFaunaStudy =
      lower(params.subject) === "fauna" &&
      [...FAU_CAUTIOUS_EVENT_TAGS].every((tag) => normalized.has(tag));
    if (!cautiousFaunaStudy) return params;

    return {
      ...params,
      tagsAll: tagsAll.filter((tag) =>
        !FAU_CAUTIOUS_EVENT_TAGS.has(lower(tag))
      )
    };
  };

  const metadataMatchesMissionCriteria = (metadata, params = {}, options = {}) => {
    const alternatives = asArray(params.anyOfCriteria).filter((entry) => entry && typeof entry === "object");
    if (alternatives.length && !alternatives.some((entry) =>
      metadataMatchesMissionCriteria(metadata, entry, options)
    )) return false;
    const tags = new Set(asArray(metadata.tags).map(lower).filter(Boolean));
    const exact = {
      objectId: metadata.objectId,
      cuoType: metadata.cuoType,
      kind: metadata.kind,
      family: metadata.family,
      subject: metadata.subject,
      category: metadata.category,
      persistentMicroSceneId: metadata.persistentMicroSceneId,
      microSceneId: metadata.microSceneId,
      actor: metadata.actor
    };

    for (const [key, actual] of Object.entries(exact)) {
      if (options.skipSubject && key === "subject") continue;
      if (params[key] != null && lower(params[key]) !== lower(actual)) return false;
    }

    const cuoTypes = asArray(params.cuoTypes).map(lower).filter(Boolean);
    if (cuoTypes.length && !cuoTypes.includes(lower(metadata.cuoType))) return false;
    const microSceneIds = asArray(params.microSceneIds).map(lower).filter(Boolean);
    if (microSceneIds.length && !microSceneIds.includes(lower(metadata.microSceneId))) return false;
    const actorsAny = asArray(params.actorsAny).map(lower).filter(Boolean);
    if (actorsAny.length && !actorsAny.includes(lower(metadata.actor))) return false;
    if (params.remote != null && Boolean(params.remote) !== Boolean(metadata.remote)) return false;

    const tagsAny = asArray(params.tagsAny).map(lower).filter(Boolean);
    if (tagsAny.length && !tagsAny.some((tag) => tags.has(tag))) return false;
    const tagsAll = asArray(params.tagsAll).map(lower).filter(Boolean);
    if (tagsAll.length && !tagsAll.every((tag) => tags.has(tag))) return false;

    const exclusions = {
      excludeObjectIds: metadata.objectId,
      excludeCuoTypes: metadata.cuoType,
      excludeKinds: metadata.kind,
      excludeFamilies: metadata.family,
      excludeSubjects: metadata.subject,
      excludeCategories: metadata.category
    };
    for (const [key, actual] of Object.entries(exclusions)) {
      if (asArray(params[key]).map(lower).includes(lower(actual))) return false;
    }
    const excludedTags = asArray(params.excludeTagsAny).map(lower).filter(Boolean);
    if (excludedTags.some((tag) => tags.has(tag))) return false;
    return true;
  };

  const eventMissionMetadata = (event) => {
    const detail = event?.detail || {};
    const definition =
      BF.ObjectLibrary?.getById?.(event?.objectId) ||
      BF.ObjectLibrary?.get?.(detail.cuoType) ||
      null;
    const interactionSource = lower(detail.interactionSource);
    const droneType = lower(detail.droneType);
    const actor = interactionSource === "drone"
      ? (droneType === "scout_drone" ? "scout" : "drone")
      : "bluefox";
    return {
      objectId: event?.objectId || definition?.id,
      cuoType: detail.cuoType || definition?.type,
      kind:
        detail.kind ||
        event?.inventoryKey ||
        definition?.resource?.inventoryKey ||
        definition?.type ||
        event?.family,
      family:
        event?.family ||
        definition?.resource?.family ||
        event?.knowledgeFamily ||
        definition?.knowledge?.family ||
        definition?.category,
      subject:
        detail.subject ||
        definition?.semantic?.subject ||
        event?.knowledgeFamily ||
        definition?.knowledge?.family ||
        event?.category ||
        definition?.category ||
        event?.family,
      category: event?.category || definition?.category,
      persistentMicroSceneId:
        event?.persistentMicroSceneId ||
        detail.persistentMicroSceneId ||
        null,
      microSceneId:
        event?.microSceneId ||
        detail.microSceneId ||
        null,
      actor,
      remote: detail.remote === true,
      tags: [
        ...(event?.tags || []),
        ...(detail.tags || []),
        ...(definition?.spawn?.tags || []),
        ...(definition?.situation?.tags || [])
      ]
    };
  };

  const STEP_RELATION_FIELDS = new Set([
    "objectId",
    "cuoType",
    "family",
    "subject",
    "category",
    "mapId",
    "instanceId",
    "persistentMicroSceneId"
  ]);

  const relationEvidence = (
    metadata = {},
    mapId = null,
    instanceId = null,
    persistentMicroSceneId = null
  ) => ({
    objectId: lower(metadata.objectId),
    cuoType: lower(metadata.cuoType),
    family: lower(metadata.family),
    subject: lower(metadata.subject),
    category: lower(metadata.category),
    mapId: String(mapId || ""),
    instanceId: String(instanceId || ""),
    persistentMicroSceneId: String(
      persistentMicroSceneId ||
      metadata.persistentMicroSceneId ||
      ""
    )
  });

  const relationEvidenceFromEvent = (event) =>
    relationEvidence(
      eventMissionMetadata(event),
      event?.mapId,
      event?.instanceId,
      event?.persistentMicroSceneId
    );

  const relationEvidenceFromResolved = (resolved, mapId) =>
    relationEvidence(
      {
        ...definitionMissionMetadata(resolved?.definition, resolved),
        ...identityOf(resolved)
      },
      mapId,
      identityOf(resolved).instanceId,
      resolved?.object?.userData?.persistentMicroSceneId ||
        resolved?.anchor?.userData?.persistentMicroSceneId ||
        null
    );

  const parsedRelationEvidence = (node) =>
    (node?.historyValues || []).map((value) => {
      try {
        const parsed = JSON.parse(value);
        return parsed?.owner === "object-m0" ? parsed.evidence || null : null;
      } catch {
        return null;
      }
    }).filter(Boolean);

  const relationMatches = (tree, node, evidence) => {
    const relation = node?.params?.relation;
    if (!relation) return true;
    const fromSlot = String(relation.fromSlot || "").trim();
    const source = tree?.find?.(`${tree.id}:${fromSlot}`);
    if (!source) return false;
    const sameBy = asArray(relation.sameBy).filter((field) => STEP_RELATION_FIELDS.has(field));
    const differentBy = asArray(relation.differentBy).filter((field) => STEP_RELATION_FIELDS.has(field));
    return parsedRelationEvidence(source).some((reference) => {
      const same = sameBy.every((field) =>
        String(reference[field] || "") &&
        String(evidence[field] || "") &&
        String(reference[field]) === String(evidence[field])
      );
      if (!same) return false;
      return differentBy.every((field) =>
        String(reference[field] || "") &&
        String(evidence[field] || "") &&
        String(reference[field]) !== String(evidence[field])
      );
    });
  };

  const nodeNeedsObjectEvidence = (tree, node) => {
    if (!tree?.root || !node) return false;
    const slot = String(node.params?.sequenceSlot || "").trim();
    if (!slot) return false;

    let referencedByRelation = false;
    tree.root.walk?.((candidate) => {
      if (String(candidate?.params?.relation?.fromSlot || "").trim() === slot) {
        referencedByRelation = true;
      }
    });
    if (referencedByRelation) return true;

    const catalog = Array.isArray(BF.BibleCatalog)
      ? BF.BibleCatalog
      : Object.values(BF.BibleCatalog || {});
    const mission =
      BF.bibleRuntime?.byId?.get?.(tree.id) ||
      catalog.find((entry) => entry?.id === tree.id) ||
      null;
    return asArray(mission?.mapGeneration?.requiredObjects).some((entry) =>
      String(entry?.sourceSlot || "").trim() === slot
    );
  };

  const rememberRelationEvidence = (tree, node, event) => {
    if (!nodeNeedsObjectEvidence(tree, node)) return false;
    const evidence = relationEvidenceFromEvent(event);
    if (!evidence.objectId && !evidence.cuoType && !evidence.instanceId) return false;
    return node.pushHistoryValue?.(JSON.stringify({
      owner: "object-m0",
      evidence
    })) || false;
  };

  const acceptsScoutObservation = (node) => {
    const params = node?.params || {};
    if (lower(params.actor) === "scout") return true;
    return asArray(params.actorsAny).map(lower).includes("scout");
  };

  const studySubjectMatches = (event, node, tags) => {
    const detail = event?.detail || {};
    const subject = String(node?.params?.subject || "").toLowerCase();
    if (!subject) return true;
    if (subject === "structure") return detail.kind === "structure" || tags.has("ruin") || tags.has("landmark");
    if (subject === "flora") return event.knowledgeFamily === "flora" || tags.has("plant");
    if (subject === "components") return tags.has("technology") || tags.has("ruin") || detail.kind === "debris";
    return subject === detail.subject || subject === detail.kind || subject === event.family;
  };

  const eventMatchesNode = (event, node, missionId = null, tree = null) => {
    if (node.params?.biblePattern === "CONTEXT_MSC") return false;
    if (node.params?.catalogManaged || node.params?.siteProgressionKind) return false;
    const type = Missions.normalizeActionType(node.type);
    const detail = event.detail || {};
    const tags = new Set([...(event.tags || []), ...(detail.tags || [])]);
    if ([
      BF.ObjectEvents?.types.RESOURCE_COLLECTED,
      BF.ObjectEvents?.types.RESOURCE_EXTRACTED
    ].includes(event.type)) {
      if (![Missions.ActionType.COLLECT, Missions.ActionType.EXTRACT].includes(type)) {
        return false;
      }
      // Une acquisition prescrite ne crédite que son nœud dans la mission
      // d'origine. Le même ObjectEvent reste disponible pour le fan-out vers
      // les autres missions actives compatibles.
      if (detail.missionNodeId) {
        const originMissionId = String(detail.missionId || "");
        const sameOriginMission = !originMissionId ||
          originMissionId === String(missionId || "");
        if (sameOriginMission && detail.missionNodeId !== node.id) return false;
      }
      return metadataMatchesMissionCriteria(eventMissionMetadata(event), node.params || {}) &&
        relationMatches(tree, node, relationEvidenceFromEvent(event));
    }
    if (event.type === BF.ObjectEvents?.types?.NPC_REACTION) {
      if (!isStudyAction(type)) return false;
      if (!metadataMatchesMissionCriteria(eventMissionMetadata(event), node.params || {}, { skipSubject: true })) {
        return false;
      }
      if (!relationMatches(tree, node, relationEvidenceFromEvent(event))) return false;
      const reaction = lower(detail.reaction || detail.state);
      const allowed = asArray(node.params?.reactionsAny).map(lower).filter(Boolean);
      const excluded = asArray(node.params?.excludeReactions).map(lower).filter(Boolean);
      if (allowed.length && !allowed.includes(reaction)) return false;
      if (excluded.includes(reaction)) return false;
      return true;
    }
    const scoutHistoricalObservation =
      event.type === BF.ObjectEvents?.types.OBJECT_SEEN &&
      lower(detail.interactionSource) === "drone" &&
      lower(detail.droneType) === "scout_drone" &&
      [...tags].map(lower).includes("drone-scouted");
    if (scoutHistoricalObservation) {
      if (!isStudyAction(type) || !acceptsScoutObservation(node)) return false;
      if (!metadataMatchesMissionCriteria(eventMissionMetadata(event), node.params || {}, { skipSubject: true })) {
        return false;
      }
      if (!relationMatches(tree, node, relationEvidenceFromEvent(event))) return false;
      return studySubjectMatches(event, node, tags);
    }

    if (![BF.ObjectEvents?.types.OBJECT_INSPECTED, BF.ObjectEvents?.types.PHENOMENON_OBSERVED, BF.ObjectEvents?.types.OBJECT_ANALYZED].includes(event.type)) return false;
    if (!isStudyAction(type)) return false;

    // missionNodeId protège le nœud qui a déclenché l'étude dans SA mission,
    // sans réserver l'événement aux autres missions actives compatibles.
    // Le fan-out reste donc générique, tandis qu'une mission d'origine ne peut
    // pas créditer plusieurs feuilles sœurs avec une seule action prescrite.
    if (detail.missionNodeId) {
      const originMissionId = String(detail.missionId || "");
      const sameOriginMission = !originMissionId ||
        originMissionId === String(missionId || "");
      if (sameOriginMission && detail.missionNodeId !== node.id) return false;
      if (event.type !== BF.ObjectEvents?.types.PHENOMENON_OBSERVED) return false;
    }

    // Convention BlueFox : observer / inspecter / analyser appartiennent à la
    // même famille fonctionnelle d'étude pour le crédit missionnel. Le type
    // physique de l'étude ne doit donc pas empêcher le fan-out ; les critères
    // CUO, le binding et missionNodeId restent les garde-fous.
    if (!metadataMatchesMissionCriteria(eventMissionMetadata(event), node.params || {}, { skipSubject: true })) {
      return false;
    }
    if (!relationMatches(tree, node, relationEvidenceFromEvent(event))) return false;
    return studySubjectMatches(event, node, tags);
  };

  const eventMatchesBoundTarget = (manager, missionId, event) => {
    const bound = manager?.memory?.getFact?.(`bibleTarget:${missionId}`);
    if (!bound || (!bound.instanceId && !bound.objectId && !bound.cuoType && !bound.missionSceneMissionId)) return true;
    if (bound.mapId && String(event.mapId || "") !== String(bound.mapId)) return false;
    if (bound.binding === "instance" && bound.instanceId) {
      return String(event.instanceId || "") === String(bound.instanceId);
    }
    const eventType = String(event.detail?.cuoType || "").toLowerCase();
    const sameType = bound.cuoType &&
      eventType === String(bound.cuoType).toLowerCase();
    const sameDefinition = bound.objectId &&
      String(event.objectId || "").toLowerCase() === String(bound.objectId).toLowerCase();

    // Une interaction de mission sur un objet MSC valide uniquement si la cible
    // avait été reconnue comme appartenant à la MSC de cette mission au moment
    // de la sélection. ActionBridge pose missionId/missionNodeId seulement après
    // matchesBoundTarget(), ce qui évite qu'un objet hors MSC puisse profiter
    // de ce chemin.
    const detailMissionId = String(event.detail?.missionId || "");
    const sameMissionScene =
      bound.binding === "type-or-mission-scene" &&
      bound.missionSceneMissionId &&
      detailMissionId === String(missionId) &&
      Boolean(event.detail?.missionNodeId);

    return Boolean(sameType || sameDefinition || sameMissionScene);
  };

  const requiredMapMatches = (manager, node, mapId) => {
    const factKey = String(node?.params?.requiredMapFact || "").trim();
    if (!factKey) return true;
    const fact = manager?.memory?.getFact?.(factKey, null);
    if (!fact || typeof fact !== "object") return false;
    const field = String(node.params?.requiredMapField || "mapId").trim();
    const expectedMapId = String(fact[field] || "");
    return Boolean(expectedMapId) && String(mapId || "") === expectedMapId;
  };

  const missionSiteFact = (manager, node) => {
    const factKey = String(node?.params?.requiredSiteFact || "").trim();
    if (!factKey) return null;
    const fact = manager?.memory?.getFact?.(factKey, null);
    return fact && typeof fact === "object" ? fact : null;
  };

  const siteFactMatchesContext = (fact, context = {}, mapId = null) => {
    if (!fact) return true;
    const actualSiteId = String(context?.microSceneInstanceId || "");
    const expectedSiteId = String(fact.siteId || "");
    if (expectedSiteId) return Boolean(actualSiteId) && actualSiteId === expectedSiteId;
    if (fact.mapId && String(mapId || "") !== String(fact.mapId)) return false;
    if (fact.microSceneId && String(context?.microSceneId || "") !== String(fact.microSceneId)) return false;
    if (fact.persistentMicroSceneId &&
        String(context?.persistentMicroSceneId || "") !== String(fact.persistentMicroSceneId)) return false;
    return Boolean(fact.mapId || fact.microSceneId || fact.persistentMicroSceneId);
  };

  const requiredSiteMatchesEvent = (manager, node, event) => {
    const fact = missionSiteFact(manager, node);
    if (!fact) return !String(node?.params?.requiredSiteFact || "").trim();
    return siteFactMatchesContext(fact, {
      microSceneInstanceId: event?.microSceneInstanceId,
      microSceneId: event?.microSceneId,
      persistentMicroSceneId: event?.persistentMicroSceneId
    }, event?.mapId);
  };

  const requiredSiteMatchesResolved = (manager, node, resolved, mapId) => {
    const factKey = String(node?.params?.requiredSiteFact || "").trim();
    if (!factKey) return true;
    const fact = missionSiteFact(manager, node);
    if (!fact) return false;
    const context = BF.ObjectEvents?.siteContext?.(resolved?.object, { mapId }) || null;
    return siteFactMatchesContext(fact, context || {}, mapId);
  };

  const rememberCompletionSiteFact = (manager, missionId, node, event) => {
    const factKey = String(node?.params?.completionSiteFact || "").trim();
    if (!factKey || !node?.isComplete) return false;
    const siteId = String(event?.microSceneInstanceId || "");
    if (!siteId) return false;
    const next = {
      siteId,
      mapId: event?.mapId || null,
      microSceneId: event?.microSceneId || null,
      persistentMicroSceneId: event?.persistentMicroSceneId || null,
      anchor: event?.microSceneAnchor ? { ...event.microSceneAnchor } : null,
      sourceMissionId: missionId,
      sourceNodeId: node.id,
      acquiredAt: Number(event?.at) || Date.now()
    };
    const previous = manager?.memory?.getFact?.(factKey, null);
    if (previous?.siteId === next.siteId && previous?.mapId === next.mapId) return false;
    manager?.memory?.setFact?.(factKey, next);
    return true;
  };

  const applyObjectEventProgress = (manager, event) => {
    if (!manager || manager.memory?.hasProcessedObjectEvent?.(event.id)) {
      return { changed: 0, currentMatched: false };
    }
    let changed = 0;
    let currentMatched = false;
    const current = manager.currentAction;
    const trees = manager.trees?.size
      ? manager.trees
      : manager.tree
        ? new Map([[manager.tree.id, manager.tree]])
        : new Map();
    if (!trees.size) return 0;
    trees.forEach((tree, missionId) => {
      if (!eventMatchesBoundTarget(manager, missionId, event)) return;

      // L'acquittement de l'action physique est indépendant de la progression
      // logique du nœud. Un fan-out ownerless peut avoir complété la feuille (et
      // même son lifecycle) avant que l'événement réellement propriétaire arrive.
      // On relit donc explicitement le nœud de currentAction, même s'il n'est plus
      // dans availableLeaves(), sans jamais le recréditer.
      if (current?.missionId === missionId && current?.nodeId) {
        const currentNode = tree.find?.(current.nodeId) || null;
        if (
          currentNode &&
          requiredMapMatches(manager, currentNode, event.mapId) &&
          requiredSiteMatchesEvent(manager, currentNode, event) &&
          eventMatchesNode(event, currentNode, missionId, tree)
        ) {
          const eventMissionId = String(event.detail?.missionId || "");
          const eventNodeId = String(event.detail?.missionNodeId || "");
          const eventInstanceId = String(
            event.instanceId || event.detail?.instanceId || ""
          );
          const currentInstanceId = String(current.instanceId || "");
          const ownerMatchesCurrent =
            Boolean(eventMissionId && eventNodeId) &&
            eventMissionId === String(current.missionId || "") &&
            eventNodeId === String(current.nodeId || "") &&
            (!currentInstanceId ||
              (Boolean(eventInstanceId) && eventInstanceId === currentInstanceId));
          if (ownerMatchesCurrent) currentMatched = true;
        }
      }

      if (
        manager.ensureLifecycle &&
        manager.ensureLifecycle(missionId).status !== "active"
      ) return;

      let treeChanged = false;
      tree.availableLeaves().forEach((node) => {
        if (!requiredMapMatches(manager, node, event.mapId)) return;
        if (!requiredSiteMatchesEvent(manager, node, event)) return;
        if (node.isComplete || !eventMatchesNode(event, node, missionId, tree)) return;
        if (progressNodeFromEvent(node, event)) {
          rememberRelationEvidence(tree, node, event);
          rememberCompletionSiteFact(manager, missionId, node, event);
          changed += 1;
          treeChanged = true;
        }
      });
      if (treeChanged) {
        tree.refresh();
        manager.memory.saveTree(tree);
      }
    });
    manager.memory?.markProcessedObjectEvent?.(event.id);
    if (currentMatched) {
      const detail = {
        ...(event.detail || {}),
        kind: event.detail?.kind || event.inventoryKey || event.family,
        amount: Math.max(1, Number(event.quantity) || 1),
        objectId: event.objectId,
        instanceId: event.instanceId,
        mapId: event.mapId,
        zoneId: event.zoneId,
        eventType: event.type
      };
      manager.memory.remember(current.type, detail);
      manager.memory.remember("action-completed", current);
      manager.currentAction = null;
      manager.retryAfter = performance.now() + 650;
    } else {
      manager.memory?.remember?.(event.type, {
        ...(event.detail || {}),
        eventId: event.id,
        amount: Math.max(1, Number(event.quantity) || 1),
        objectId: event.objectId,
        instanceId: event.instanceId
      });
    }
    if (changed) {
      manager.syncLifecycleFromTrees?.();
      manager.reevaluatePendingActivations?.();
      manager.catalogController?.schedule?.();
      manager.publish();
    } else if (currentMatched) {
      // Cas d'acquittement tardif : la feuille avait déjà été complétée par
      // fan-out, donc aucun lifecycle ne change, mais currentAction vient d'être
      // libérée et l'état public doit le refléter immédiatement.
      manager.memory?.save?.();
      manager.publish?.();
    } else {
      manager.memory?.save?.();
    }
    return { changed, currentMatched };
  };

  const installMissionBridge = () => {
    if (installed.mission || !Missions.MissionManager || !BF.ObjectEvents) return false;
    installed.mission = true;
    const proto = Missions.MissionManager.prototype;
    proto.consumeObjectEvent = function consumeObjectEvent(event) {
      const isAcquisition = [
        BF.ObjectEvents.types.RESOURCE_COLLECTED,
        BF.ObjectEvents.types.RESOURCE_EXTRACTED
      ].includes(event.type);
      const activationMissionId =
        BF.bibleRuntime?.activationMissionForEvent?.(event.id) || null;
      const activationBaseId = String(activationMissionId || "").split("@")[0];
      const localActivation = Boolean(
        activationMissionId &&
        BF.bibleRuntime?.byId?.get?.(activationBaseId)?.localMission
      );
      if (
        BF.bibleRuntime?.isActivationEvent?.(event.id) &&
        (!isAcquisition || localActivation)
      ) {
        this.memory.remember(event.type, {
          ...(event.detail || {}),
          activationOnly: true,
          eventId: event.id
        });
        return false;
      }
      const result = applyObjectEventProgress(this, event);
      return result.currentMatched || result.changed > 0;
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

  const objectTags = (definition) => new Set([
    ...(definition?.spawn?.tags || []),
    ...(definition?.situation?.tags || [])
  ].map((value) => String(value || "").toLowerCase()));

  const definitionMissionMetadata = (definition, resolved = null) => ({
    objectId: definition?.id,
    cuoType: definition?.type,
    actor: "bluefox",
    remote: false,
    kind: definition?.resource?.inventoryKey || definition?.type,
    family: definition?.resource?.family || definition?.knowledge?.family || definition?.category,
    subject: definition?.semantic?.subject || definition?.knowledge?.family || definition?.category || definition?.type,
    category: definition?.category,
    persistentMicroSceneId:
      resolved?.object?.userData?.persistentMicroSceneId ||
      resolved?.anchor?.userData?.persistentMicroSceneId ||
      null,
    microSceneId:
      resolved?.object?.userData?.microSceneId ||
      resolved?.anchor?.userData?.microSceneId ||
      null,
    actor: "bluefox",
    remote: false,
    tags: [...objectTags(definition)]
  });

  const directCandidateDefinition = (object) => {
    if (!object) return null;
    const own = object.userData || {};
    const anchor = own.worldAnchor || null;
    const anchorData = anchor?.userData || {};

    // Pour le choix de cible missionnelle, l'identité portée directement par
    // l'interactable est souveraine. On évite ainsi qu'un enfant de MSC hérite
    // accidentellement du CUO d'un parent/anchor voisin.
    return own.functional ||
      own.definition ||
      BF.ObjectLibrary?.getById?.(own.catalogId) ||
      BF.ObjectLibrary?.get?.(own.libraryType) ||
      BF.ObjectLibrary?.get?.(own.objectType) ||
      anchorData.functional ||
      anchorData.definition ||
      BF.ObjectLibrary?.getById?.(anchorData.catalogId) ||
      BF.ObjectLibrary?.get?.(anchorData.libraryType) ||
      BF.ObjectLibrary?.get?.(anchorData.objectType) ||
      null;
  };

  const resolveMissionCandidate = (object) => {
    const directDefinition = directCandidateDefinition(object);
    if (!directDefinition) return resolveObject(object);

    const anchor = object?.userData?.worldAnchor || object;
    return {
      object,
      anchor,
      data: object?.userData || {},
      rootData: anchor?.userData || {},
      definition: directDefinition
    };
  };

  const matchesStudySubject = (definition, subject) => {
    const expected = String(subject || "").trim().toLowerCase();
    if (!expected) return true;
    const tags = objectTags(definition);
    const family = String(
      definition?.knowledge?.family ||
      definition?.resource?.family ||
      definition?.category || ""
    ).toLowerCase();

    if (expected === "flora") {
      return family === "flora" || tags.has("plant") ||
        /flora|plant|fiber|biomass/i.test(
          `${definition?.type || ""} ${definition?.subtype || ""}`
        );
    }
    if (expected === "fauna") {
      return family === "fauna" || tags.has("fauna") ||
        tags.has("animal") || tags.has("creature");
    }
    if (expected === "components") {
      return family === "technology" || tags.has("technology") ||
        tags.has("component") || tags.has("ruin");
    }
    if (expected === "structure") {
      return definition?.category === "structure" ||
        tags.has("ruin") || tags.has("landmark");
    }
    return expected === family ||
      expected === String(definition?.type || "").toLowerCase();
  };

  const canStudy = (definition) => {
    const caps = capabilities(definition);
    return caps.observable || caps.inspectable || caps.analyzable;
  };

  const canPerformStudyAction = (definition, type) => {
    const caps = capabilities(definition);
    const normalized = Missions.normalizeActionType(type);
    if (normalized === Missions.ActionType.OBSERVE) return caps.observable;
    if (normalized === Missions.ActionType.INSPECT) return caps.inspectable;
    if (normalized === Missions.ActionType.ANALYZE) return caps.analyzable;
    return false;
  };

  const identityOf = (resolved) => ({
    instanceId: String(
      resolved.object?.userData?.instanceId ||
      resolved.anchor?.userData?.instanceId || ""
    ),
    objectId: String(resolved.definition?.id || "").toLowerCase(),
    cuoType: String(resolved.definition?.type || "").toLowerCase()
  });

  const missionSceneIdOf = (resolved) => String(
    resolved?.object?.userData?.bibleMissionId ||
    resolved?.anchor?.userData?.bibleMissionId ||
    ""
  );

  const eventMissionSceneId = (event) => String(
    event?.detail?.bibleMissionId ||
    event?.detail?.missionSceneMissionId ||
    ""
  );

  const studyDistinctMode = (node) => {
    const configured = String(node?.params?.distinctBy || "").trim();
    if (configured) return configured;
    return isStudyAction(node?.type) ? "instanceId" : "";
  };

  const studyInstanceDistinctValue = (instanceId, generation = 0) => {
    const identity = String(instanceId || "");
    if (!identity) return "";
    return `${identity}#study-${Math.max(0, Number(generation) || 0)}`;
  };

  const distinctValueFromEvent = (node, event) => {
    const mode = studyDistinctMode(node);
    if (!mode || mode === "none") return null;
    if (mode === "instanceId") {
      if (isStudyAction(node?.type)) {
        return studyInstanceDistinctValue(
          event?.instanceId,
          event?.detail?.studyGeneration ??
            event?.detail?.interactionState?.studyGeneration ??
            0
        );
      }
      return String(event?.instanceId || "");
    }
    if (mode === "objectId") return String(event?.objectId || "").toLowerCase();
    if (mode === "mapId") return String(event?.mapId || "");
    if (mode === "family") {
      return lower(eventMissionMetadata(event).family);
    }
    return null;
  };

  const distinctValueFromResolved = (node, resolved, mapId = null) => {
    const mode = studyDistinctMode(node);
    if (!mode || mode === "none") return null;
    const identity = identityOf(resolved);
    if (mode === "instanceId") {
      if (isStudyAction(node?.type)) {
        return studyInstanceDistinctValue(
          identity.instanceId,
          interactionState(resolved).studyGeneration
        );
      }
      return identity.instanceId;
    }
    if (mode === "objectId") return identity.objectId;
    if (mode === "mapId") return String(mapId || "");
    if (mode === "family") {
      return lower(
        resolved?.definition?.resource?.family ||
        resolved?.definition?.knowledge?.family ||
        resolved?.definition?.category
      );
    }
    return null;
  };

  const progressNodeFromEvent = (node, event) => {
    const amount = Math.max(1, Number(event?.quantity) || 1);
    const distinctValue = distinctValueFromEvent(node, event);
    if (distinctValue == null) return node.increment(amount);
    return node.incrementDistinct?.(distinctValue, 1) || false;
  };

  const matchesBoundTarget = (engine, missionId, resolved) => {
    const bound = engine?.missionManager?.memory?.getFact?.(`bibleTarget:${missionId}`);
    if (!bound || (!bound.instanceId && !bound.objectId && !bound.cuoType && !bound.missionSceneMissionId)) return true;
    if (bound.mapId && String(engine?.currentMapId || "") !== String(bound.mapId)) return false;
    const identity = identityOf(resolved);
    if (bound.binding === "instance" && bound.instanceId) {
      return identity.instanceId === String(bound.instanceId);
    }
    const sameType = bound.cuoType &&
      identity.cuoType === String(bound.cuoType).toLowerCase();
    const sameDefinition = bound.objectId &&
      identity.objectId === String(bound.objectId).toLowerCase();
    const sameMissionScene =
      bound.binding === "type-or-mission-scene" &&
      bound.missionSceneMissionId &&
      missionSceneIdOf(resolved) === String(bound.missionSceneMissionId);
    return Boolean(sameType || sameDefinition || sameMissionScene);
  };

  const missionCandidateMicroSceneId = (resolved) => String(
    resolved?.object?.userData?.persistentMicroSceneId ||
    resolved?.anchor?.userData?.persistentMicroSceneId ||
    ""
  );

  const missionCandidateFamily = (resolved) => lower(
    resolved?.definition?.resource?.family ||
    resolved?.definition?.knowledge?.family ||
    resolved?.definition?.category ||
    resolved?.definition?.type
  );

  const candidateWasStudied = (resolved) => {
    const state = interactionState(resolved);
    return Boolean(
      state.observed || state.inspected || state.analyzed || state.identified ||
      Number(state.observationCount || 0) > 0 ||
      Number(state.inspectionCount || 0) > 0 ||
      Number(state.analysisCount || 0) > 0
    );
  };

  const unstudiedPriority = (resolved, params = {}, missionId = null) => {
    if (params.preferUnstudied !== true) return 0;
    if (candidateWasStudied(resolved)) return -Infinity;
    const localContext = BF.bibleRuntime?.localMissionContext?.(missionId) || {};
    const preferredFamily = lower(params.preferredFamily || localContext.family);
    const preferredMicroSceneId = String(
      params.preferredMicroSceneId || localContext.persistentMicroSceneId || ""
    );
    if (preferredFamily && missionCandidateFamily(resolved) === preferredFamily) return 300;
    if (preferredMicroSceneId && missionCandidateMicroSceneId(resolved) === preferredMicroSceneId) return 200;
    return 100;
  };

  const passiveMissionSceneObjects = (engine, action, options = {}) => {
    if (action?.params?.allowPassiveMSCObject !== true) return [];
    const activate = options.activate !== false;
    const sceneIds = new Set([
      ...asArray(action?.params?.microSceneIds),
      action?.params?.microSceneId
    ].filter(Boolean).map(String));
    const scenes = Array.isArray(engine.currentMap?.group?.userData?.microScenes)
      ? engine.currentMap.group.userData.microScenes
      : [];
    const objects = [];
    scenes.forEach((scene) => {
      if (sceneIds.size && !sceneIds.has(String(scene?.id || ""))) return;
      asArray(scene?.records).forEach((record) => {
        const object = record?.root || record?.pivot || record?.objectRoot || null;
        if (!object?.userData) return;
        const resolved = resolveMissionCandidate(object);
        if (!resolved?.definition) return;
        if (!metadataMatchesMissionCriteria(
          definitionMissionMetadata(resolved.definition, resolved),
          action.params || {},
          { skipSubject: true }
        )) return;
        if (activate) {
          object.userData.active = true;
          object.userData.missionPassiveStudy = true;
        }
        objects.push(object);
      });
    });
    return objects;
  };

  const selectObservable = (engine, action, options = {}) => {
    const passiveObjects = passiveMissionSceneObjects(engine, action, {
      activate: options.activatePassive !== false
    });
    const passiveSet = new Set(passiveObjects);
    const sourceObjects = [
      ...(engine.currentMap?.interactables || []),
      ...passiveObjects
    ];
    const candidates = [...new Set(sourceObjects)]
      .map((object) => {
        const passiveMissionStudy = passiveSet.has(object) &&
          action?.params?.allowPassiveMSCObject === true;
        if (!object.userData.active && !passiveMissionStudy) return null;
        const resolved = resolveMissionCandidate(object);
        const definition = resolved.definition;
        const tree = engine?.missionManager?.trees?.get?.(action.missionId);
        const node = tree?.find?.(action.nodeId);
        if (!tree || !node) return null;
        if (node?.params?.siteProgressionKind) return null;
        if (!requiredMapMatches(engine?.missionManager, node, engine?.currentMapId)) return null;
        if (!requiredSiteMatchesResolved(engine?.missionManager, node, resolved, engine?.currentMapId)) return null;
        if (!relationMatches(tree, node, relationEvidenceFromResolved(resolved, engine?.currentMapId))) return null;
        const distinctValue = distinctValueFromResolved(node, resolved, engine?.currentMapId);
        if (distinctValue != null && node?.hasDistinctValue?.(distinctValue)) return null;
        if (!(definition && (canStudy(definition) || passiveMissionStudy))) return null;
        if (!metadataMatchesMissionCriteria(
          definitionMissionMetadata(definition, resolved),
          studyTargetCriteria(action.params || {}),
          { skipSubject: true }
        )) return null;
        if (!matchesStudySubject(definition, action.params?.subject)) return null;
        if (!matchesBoundTarget(engine, action.missionId, resolved)) return null;
        const priority = unstudiedPriority(
          resolved, action.params || {}, action.missionId
        );
        if (priority === -Infinity) return null;
        return { object, resolved, priority };
      })
      .filter(Boolean);

    const distance = (object) => engine.character.root.position.distanceTo(
      engine.interactionWorldPosition(object)
    );
    candidates.sort((left, right) =>
      right.priority - left.priority || distance(left.object) - distance(right.object)
    );
    return candidates[0]?.object || null;
  };


  const selectAcquisitionTarget = (engine, action) =>
    (engine.currentMap?.interactables || [])
      .filter((object) => {
        if (!object.userData.active) return false;
        const resolved = resolveMissionCandidate(object);
        const definition = resolved.definition;
        const caps = capabilities(definition);
        const tree = engine?.missionManager?.trees?.get?.(action.missionId);
        const node = tree?.find?.(action.nodeId);
        if (!tree || !node || !definition || !caps.collectable) return false;
        if (!requiredMapMatches(engine?.missionManager, node, engine?.currentMapId)) return false;
        if (!requiredSiteMatchesResolved(engine?.missionManager, node, resolved, engine?.currentMapId)) return false;
        if (!relationMatches(tree, node, relationEvidenceFromResolved(resolved, engine?.currentMapId))) return false;
        const distinctValue = distinctValueFromResolved(node, resolved, engine?.currentMapId);
        if (distinctValue != null && node?.hasDistinctValue?.(distinctValue)) return false;
        if (
          action.type === Missions.ActionType.EXTRACT &&
          !caps.extractable
        ) return false;
        return (
          metadataMatchesMissionCriteria(
            definitionMissionMetadata(definition, resolved),
            action.params || {}
          ) &&
          matchesBoundTarget(engine, action.missionId, resolved)
        );
      })
      .sort((left, right) => {
        const distance = (object) =>
          engine.character.root.position.distanceTo(
            engine.interactionWorldPosition(object)
          );
        return distance(left) - distance(right);
      })[0] || null;

  const probeMissionActionTarget = (engine, action) => {
    if (!engine || !action?.missionId || !action?.nodeId) return null;
    const type = Missions.normalizeActionType(action.type);
    if ([Missions.ActionType.COLLECT, Missions.ActionType.EXTRACT].includes(type)) {
      return selectAcquisitionTarget(engine, { ...action, type });
    }
    if ([
      Missions.ActionType.OBSERVE,
      Missions.ActionType.INSPECT,
      Missions.ActionType.ANALYZE
    ].includes(type)) {
      return selectObservable(engine, { ...action, type }, { activatePassive: false });
    }
    return undefined;
  };

  const activeStudyDirective = (engine, resolved) => {
    const manager = engine?.missionManager;
    const missionResolved = resolveMissionCandidate(resolved?.object || resolved?.anchor);
    const definition = missionResolved?.definition;
    if (!manager || !definition || !canStudy(definition)) return null;

    const missionIds = [...(manager.activeMissionIds || [])]
      .filter((id) => manager.trees?.has?.(id))
      .sort((left, right) =>
        Number(right === manager.primaryMissionId) -
        Number(left === manager.primaryMissionId)
      );

    for (const missionId of missionIds) {
      if (manager.ensureLifecycle?.(missionId)?.status !== "active") continue;
      const tree = manager.trees.get(missionId);
      for (const node of tree.availableLeaves()) {
        if (
          !isStudyAction(node.type) ||
          node.params?.siteProgressionKind ||
          node.params?.eventDriven === true ||
          node.params?.catalogManaged === true
        ) continue;
        if (!requiredMapMatches(manager, node, engine.currentMapId)) continue;
        if (!requiredSiteMatchesResolved(manager, node, missionResolved, engine.currentMapId)) continue;
        if (!metadataMatchesMissionCriteria(
          definitionMissionMetadata(definition, missionResolved),
          studyTargetCriteria(node.params || {}),
          { skipSubject: true }
        )) continue;
        if (!matchesStudySubject(definition, node.params?.subject)) continue;
        if (!relationMatches(tree, node, relationEvidenceFromResolved(missionResolved, engine.currentMapId))) continue;
        if (!matchesBoundTarget(engine, missionId, missionResolved)) continue;
        if (unstudiedPriority(missionResolved, node.params || {}, missionId) === -Infinity) continue;
        const distinctValue = distinctValueFromResolved(node, missionResolved, engine?.currentMapId);
        if (distinctValue != null && node.hasDistinctValue?.(distinctValue)) continue;
        return {
          missionId,
          nodeId: node.id,
          subject: node.params?.subject || null,
          narrativeVerb: narrativeStudyVerb(node.type)
        };
      }
    }
    return null;
  };

  const installActionBridge = () => {
    const proto = Missions.ActionBridge?.prototype;
    if (!proto || typeof proto.execute !== "function") return false;
    if (proto.execute.__objectM0Wrapped) {
      installed.action = true;
      return true;
    }
    const originalExecute = proto.execute;
    const executeObjectAware = function executeObjectAware(action, now) {
      if ([
        Missions.ActionType.COLLECT,
        Missions.ActionType.EXTRACT
      ].includes(action?.type) && !this.isEngineBusy()) {
        const target = selectAcquisitionTarget(this.engine, action);
        if (!target) return false;
        const resolved = resolveMissionCandidate(target);
        const identity = identityOf(resolved);
        const state = interactionState(resolved);
        const neverStudied =
          !state.observed && !state.inspected && !state.analyzed && !state.identified &&
          Number(state.observationCount || 0) === 0 &&
          Number(state.inspectionCount || 0) === 0 &&
          Number(state.analysisCount || 0) === 0;
        const needsInitialStudy =
          (neverStudied || acquisitionObservationDue(resolved.definition, state)) &&
          canStudy(resolved.definition);
        action.instanceId = identity.instanceId || null;
        target.userData.requestedInteraction = needsInitialStudy
          ? "observe"
          : action.type;
        target.userData.requestedInteractionSource = "mission";
        target.userData.missionSubject = action.params?.subject || null;
        target.userData.missionNarrativeVerb = action.type;
        target.userData.missionNodeId = action.nodeId || null;
        target.userData.missionId = action.missionId || null;
        rememberAcquisitionIntent(target, action.type, "mission");
        target.userData.acquisitionPhase = needsInitialStudy
          ? "study"
          : "acquire";
        bindAcquisitionMission(target);
        const accepted = this.engine.targetInteraction(target);
        if (accepted === false) {
          target.userData.requestedInteraction = null;
          target.userData.requestedInteractionSource = null;
          target.userData.missionSubject = null;
          target.userData.missionNarrativeVerb = null;
          target.userData.missionNodeId = null;
          target.userData.missionId = null;
          clearAcquisitionTransaction(this.engine, target);
          target.userData.lastInteractionAt = performance.now();
          this.engine.callbacks?.onAction?.("mission-interaction-refused");
          return false;
        }
        return true;
      }
      if ([
        Missions.ActionType.OBSERVE,
        Missions.ActionType.INSPECT,
        Missions.ActionType.ANALYZE
      ].includes(action?.type) && !this.isEngineBusy()) {
        const target = selectObservable(this.engine, action);
        if (target) {
          const identity = identityOf(resolveMissionCandidate(target));
          action.instanceId = identity.instanceId || null;
          target.userData.requestedInteraction = "observe";
          target.userData.requestedInteractionSource = "mission";
          target.userData.missionSubject = action.params?.subject || null;
          target.userData.missionNarrativeVerb = narrativeStudyVerb(action.type);
          target.userData.missionNodeId = action.nodeId || null;
          target.userData.missionId = action.missionId || null;

          const accepted = this.engine.targetInteraction(target);
          if (accepted === false) {
            target.userData.requestedInteraction = null;
            target.userData.requestedInteractionSource = null;
            target.userData.missionSubject = null;
            target.userData.missionNarrativeVerb = null;
            target.userData.missionNodeId = null;
            target.userData.missionId = null;
            target.userData.lastInteractionAt = performance.now();
            this.engine.callbacks?.onAction?.("mission-interaction-refused");
            return false;
          }
          return true;
        }
        // ObjectM0 possède le matching missionnel riche pour les études.
        // Une cible refusée ici ne doit jamais être réacceptée par le
        // sélecteur générique historique d'ActionBridge.
        return false;
      }
      return originalExecute.call(this, action, now);
    };
    executeObjectAware.__objectM0Wrapped = true;
    executeObjectAware.__objectM0Original = originalExecute;
    proto.execute = executeObjectAware;
    installed.action = true;
    return true;
  };

  const startStudyPose = (character, emphasizedStudy = false) => {
    // Idle_V2 est privilégiée : c'est la respiration la plus ample du modèle.
    const breathIdle = character.findAvailableClip?.(
      ["Idle_V2", "Idle_V3", "Idle", "Idle_V4"]
    ) || "";
    const ear = character.findAvailableClip?.([
      "Ear_Right",
      character.clips?.find?.((clip) => /^ear/i.test(clip.name))?.name
    ]) || "";
    const standardIdle = character.findAvailableClip?.(
      ["Idle", "Idle_V3", "Idle_V2", "Idle_V4"]
    ) || breathIdle;
    const blink = character.findAvailableClip?.([
      "Blink",
      "Blink_Left",
      "Blink_Right",
      character.clips?.find?.((clip) => /^blink/i.test(clip.name))?.name
    ]) || "";

    const now = performance.now();
    const holdMs = 2000;
    const idleAction = breathIdle ? character.actions?.get?.(breathIdle) : null;
    const idleDuration = breathIdle
      ? Math.max(0.8, Math.min(1.6, Number(idleAction?.getClip?.().duration) || 1.2))
      : 0;
    // Le rig de production expose explicitement l'os `Head`. Le cibler avant
    // tout parcours évite de modifier `Head.001` (géométrie faciale), dont le
    // mouvement est presque invisible à la caméra de jeu.
    let headNode = character.visual?.getObjectByName?.("Head") ||
      character.visual?.getObjectByName?.("Neck") || null;
    character.visual?.traverse?.((node) => {
      if (headNode || !/^head(?:[._-]|$)|^neck(?:[._-]|$)|^t[eê]te$|^cou$/i.test(String(node.name || ""))) return;
      if (node.rotation) headNode = node;
    });
    const tiltNode = headNode || character.visual || null;
    const tiltBase = tiltNode?.rotation
      ? { x: tiltNode.rotation.x, y: tiltNode.rotation.y, z: tiltNode.rotation.z }
      : null;
    const visualScaleBase = character.visual?.scale
      ? {
          x: character.visual.scale.x,
          y: character.visual.scale.y,
          z: character.visual.scale.z
        }
      : null;
    // Environ 9 % des études ordinaires, 14 % des études remarquables : le
    // clip d'oreille est laissé aller jusqu'au bout. Sinon il reste figé tôt,
    // comme historiquement, afin que le geste complet reste exceptionnel.
    const fullEarMotion = Math.random() < (emphasizedStudy ? 0.14 : 0.09);
    const tiltZ = emphasizedStudy ? -0.19 : 0.19; // ~11°, soit ~6° de moins qu'avant.
    const tiltX = 0.10; // ~5,7°, également légèrement adouci.
    const tiltEaseInMs = 180;
    const tiltEaseOutMs = 240;

    if (!ear || !character.actions?.has?.(ear)) {
      if (breathIdle) character.play(breathIdle, 0.14, true);
      const fallbackDuration = Math.max(2, idleDuration);
      character.actionLockUntil = now + fallbackDuration * 1000;
      character.__bluefoxStudyPose = {
        startedAt: now,
        endsAt: character.actionLockUntil,
        holdEndsAt: character.actionLockUntil,
        tiltNode,
        tiltBase,
        tiltZ,
        tiltX,
        tiltEaseInMs,
        tiltEaseOutMs,
        visualScaleBase,
        noEarFallback: true
      };
      return fallbackDuration;
    }

    const action = character.actions.get(ear);
    const duration = Math.max(0.8, Number(action.getClip?.().duration) || 1.2);
    character.play(ear, 0.12, true);

    const freezeAt = Math.max(0.18, Math.min(duration * 0.30, 0.48));
    const firstIdleDuration = emphasizedStudy ? 0.8 : idleDuration;
    const blinkDuration = emphasizedStudy && blink
      ? Math.max(0.12, Math.min(0.3, (Number(character.actions.get(blink)?.getClip?.().duration) || 0.45) / 2.4))
      : 0;
    const secondIdleDuration = emphasizedStudy ? 0.55 : 0;
    const earHoldMs = fullEarMotion ? Math.max(holdMs, duration * 1000) : holdMs;
    const holdEndsAt = now + earHoldMs + (emphasizedStudy && !fullEarMotion ? freezeAt * 1000 : 0);
    character.__bluefoxStudyPose = {
      action,
      startedAt: now,
      holdEndsAt,
      endsAt: holdEndsAt + (firstIdleDuration + blinkDuration + secondIdleDuration) * 1000,
      breathIdle: emphasizedStudy ? standardIdle : breathIdle,
      idleDuration: firstIdleDuration,
      blink,
      blinkDuration,
      secondIdleDuration,
      relicSequence: emphasizedStudy,
      emphasizedStudy,
      fullEarMotion,
      phase: "hold",
      phaseEndsAt: holdEndsAt,
      idleStarted: false,
      breathStartedAt: 0,
      freezeAt,
      frozen: false,
      tiltNode,
      tiltBase,
      tiltZ,
      tiltX,
      tiltEaseInMs,
      tiltEaseOutMs,
      tiltReleaseStartedAt: 0,
      visualScaleBase
    };
    character.actionLockUntil = character.__bluefoxStudyPose.endsAt;
    return (character.__bluefoxStudyPose.endsAt - now) / 1000;
  };

  const updateStudyPose = (character, now) => {
    const pose = character?.__bluefoxStudyPose;
    if (!pose) return;
    const smoothstep = (value) => {
      const t = Math.max(0, Math.min(1, value));
      return t * t * (3 - 2 * t);
    };
    // AnimationMixer réécrit les os à chaque frame. La pose de tête est donc
    // réappliquée après mixer.update(), avec entrée et sortie interpolées.
    if (pose.tiltNode?.rotation && pose.tiltBase) {
      let weight = 1;
      if (!pose.idleStarted) {
        weight = smoothstep((now - (pose.startedAt || now)) / Math.max(1, pose.tiltEaseInMs || 180));
      } else if (pose.tiltReleaseStartedAt) {
        weight = 1 - smoothstep((now - pose.tiltReleaseStartedAt) / Math.max(1, pose.tiltEaseOutMs || 240));
      }
      pose.tiltNode.rotation.x = pose.tiltBase.x + (pose.tiltX || 0) * weight;
      pose.tiltNode.rotation.y = pose.tiltBase.y;
      pose.tiltNode.rotation.z = pose.tiltBase.z + (pose.tiltZ || 0) * weight;
    }
    if (
      pose.action &&
      !pose.fullEarMotion &&
      !pose.frozen &&
      now - pose.startedAt >= pose.freezeAt * 1000
    ) {
      pose.action.time = pose.freezeAt;
      pose.action.paused = true;
      pose.frozen = true;
    }
    if (!pose.idleStarted && pose.holdEndsAt && now >= pose.holdEndsAt) {
      pose.idleStarted = true;
      pose.breathStartedAt = now;
      pose.tiltReleaseStartedAt = now;
      pose.phase = pose.relicSequence ? "idle-first" : "idle";
      pose.phaseEndsAt = now + (pose.idleDuration || 0) * 1000;
      if (pose.breathIdle) character.play(pose.breathIdle, 0.16, true);
    }
    if (pose.relicSequence && pose.phase === "idle-first" && now >= pose.phaseEndsAt) {
      if (pose.blink && pose.blinkDuration > 0) {
        character.play(pose.blink, 0.08, true);
        character.currentAction?.setEffectiveTimeScale?.(2.4);
        pose.phase = "blink";
        pose.phaseEndsAt = now + pose.blinkDuration * 1000;
      } else {
        pose.phase = "blink";
        pose.phaseEndsAt = now;
      }
    }
    if (pose.relicSequence && pose.phase === "blink" && now >= pose.phaseEndsAt) {
      if (pose.breathIdle) character.play(pose.breathIdle, 0.1, true);
      pose.phase = "idle-second";
      pose.phaseEndsAt = now + pose.secondIdleDuration * 1000;
    }
    if (
      pose.idleStarted &&
      pose.idleDuration > 0 &&
      !pose.relicSequence &&
      pose.visualScaleBase &&
      character.visual?.scale
    ) {
      const progress = Math.max(
        0,
        Math.min(1, (now - pose.breathStartedAt) / (pose.idleDuration * 1000))
      );
      const breath = Math.sin(progress * Math.PI);
      character.visual.scale.set(
        pose.visualScaleBase.x * (1 - breath * 0.006),
        pose.visualScaleBase.y * (1 + breath * 0.018),
        pose.visualScaleBase.z * (1 - breath * 0.006)
      );
    }
    if (now < pose.endsAt) return;
    if (pose.action) pose.action.paused = false;
    if (pose.tiltNode?.rotation && pose.tiltBase) {
      pose.tiltNode.rotation.x = pose.tiltBase.x;
      pose.tiltNode.rotation.y = pose.tiltBase.y;
      pose.tiltNode.rotation.z = pose.tiltBase.z;
    }
    if (pose.visualScaleBase && character.visual?.scale) {
      character.visual.scale.set(
        pose.visualScaleBase.x,
        pose.visualScaleBase.y,
        pose.visualScaleBase.z
      );
    }
    character.__bluefoxStudyPose = null;
  };

  const patchWorldEngineInstance = (engine) => {
    if (!engine || engine.__objectM0BridgePatched) return false;
    engine.__objectM0BridgePatched = true;
    const originalTarget = engine.targetInteraction.bind(engine);

    engine.cancelMissionInteraction = function cancelMissionInteraction(
      action = null,
      reason = "cancelled"
    ) {
      const object = this.pendingInteraction;
      if (!object?.userData) return false;

      const resolved = resolveObject(object);
      const identity = identityOf(resolved);
      const missionId =
        object.userData.acquisitionMissionId ||
        object.userData.missionId ||
        null;
      const nodeId =
        object.userData.acquisitionMissionNodeId ||
        object.userData.missionNodeId ||
        null;
      const instanceId =
        object.userData.acquisitionInstanceId ||
        identity.instanceId ||
        null;

      if (
        action?.missionId &&
        String(action.missionId) !== String(missionId || "")
      ) return false;
      if (
        action?.nodeId &&
        String(action.nodeId) !== String(nodeId || "")
      ) return false;
      if (
        action?.instanceId &&
        String(action.instanceId) !== String(instanceId || "")
      ) return false;

      object.userData.requestedInteraction = null;
      object.userData.requestedInteractionSource = null;
      object.userData.requestedMovementMode = null;
      object.userData.missionSubject = null;
      object.userData.missionNarrativeVerb = null;
      object.userData.missionNodeId = null;
      object.userData.missionId = null;
      clearAcquisitionTransaction(this, object);

      this.pendingInteraction = null;
      this.interactionStartedAt = 0;
      this.interactionApproachStartedAt = 0;
      this.interactionApproachAttempts = 0;
      this.character?.cancelInteraction?.();
      this.character?.stop?.();
      this.postActionRecoveryUntil = performance.now() + 350;
      this.lastInteractionCancellation = {
        missionId,
        nodeId,
        instanceId,
        reason,
        at: Date.now()
      };
      return true;
    };

    engine.targetInteraction = function targetObjectInteraction(object, retry = false) {
      const resolved = resolveObject(object);
      const source = object.userData.requestedInteractionSource || "manual";
      const incomingRequested = String(
        object.userData.requestedInteraction || ""
      ).toLowerCase();

      // Une même action déjà engagée est atomique : mission/BAC peuvent
      // republier leur demande, mais ils ne doivent pas redémarrer l'approche
      // ni remettre l'animation et ses timers à zéro. Les retries physiques
      // internes et la continuation SAME-INSTANCE passent explicitement avec
      // retry=true et restent donc autorisés.
      if (
        !retry &&
        this.pendingInteraction === object &&
        (
          Number(this.interactionApproachStartedAt) > 0 ||
          Number(this.interactionStartedAt) > 0
        )
      ) {
        return true;
      }

      const acquisitionPhase = object.userData.acquisitionPhase || null;
      const missionStudyFromAcquisition =
        source === "mission" && acquisitionPhase === "study";

      // Une commande missionnelle pure ne crée pas d'acquisition implicite.
      // Une étude missionnelle insérée dans une acquisition conserve au
      // contraire l'intention finale et la cible de CE geste.
      if (!retry && capabilities(resolved.definition).collectable) {
        const wanted = ["collect", "extract"].includes(incomingRequested)
          ? incomingRequested
          : source === "manual"
            ? acquisitionAction(resolved.definition)
            : null;
        if (wanted) rememberAcquisitionIntent(object, wanted, source);
        else if (source === "mission" && !missionStudyFromAcquisition) {
          clearAcquisitionIntent(object);
        }
      } else if (
        source === "mission" &&
        !missionStudyFromAcquisition &&
        !["collect", "extract"].includes(object.userData.acquisitionIntent)
      ) {
        clearAcquisitionTransaction(this, object);
      }

      const intendedAcquisition = object.userData.acquisitionIntent;
      const hasAcquisitionIntent =
        ["collect", "extract"].includes(intendedAcquisition);
      const acquiringSameTarget =
        hasAcquisitionIntent && object.userData.acquisitionPhase === "acquire";

      // Dès que l'étude préalable de CE geste est satisfaite, la phase acquire
      // verrouille la même instance jusqu'à l'acquisition finale. Aucun nouvel
      // arbitrage de mission/BAC ne peut détourner la cible entre les deux.
      const dueStudyDirective = activeStudyDirective(this, resolved);
      const directive =
        acquiringSameTarget && !dueStudyDirective
          ? null
          : dueStudyDirective;

      if (directive) {
        object.userData.requestedInteraction = "observe";
        object.userData.requestedInteractionSource = "mission";
        object.userData.missionSubject = directive.subject;
        object.userData.missionNarrativeVerb = directive.narrativeVerb;
        object.userData.missionNodeId = directive.nodeId;
        object.userData.missionId = directive.missionId;
      }

      const missionRequested =
        object.userData.requestedInteractionSource === "mission";

      const requestedStep = directive
        ? "observe"
        : missionRequested
          ? (incomingRequested || resolveManualAction(resolved))
          : hasAcquisitionIntent
            ? resolveManualAction(resolved)
            : (incomingRequested || resolveManualAction(resolved));

      const mode = validateAction(
        resolved,
        requestedStep,
        missionRequested
      );

      if (hasAcquisitionIntent && mode) {
        object.userData.acquisitionPhase =
          ["collect", "extract"].includes(mode) ? "acquire" : "study";
        if (!directive) bindAcquisitionMission(object);
      }

      // Si le commit précédent appartient encore exactement au même objet
      // currentAction, au même nœud et au même geste physique, sa republication
      // n'est pas une nouvelle action gameplay. Attendre que MissionManager
      // consomme l'événement ou remplace currentAction évite une boucle de
      // commits/énergie sans introduire de cooldown arbitraire.
      const currentMissionAction = this.missionManager?.currentAction || null;
      const previousMissionCommit = this.__objectM0LastMissionCommit || null;
      if (
        !retry &&
        missionRequested &&
        currentMissionAction &&
        previousMissionCommit?.action === currentMissionAction &&
        previousMissionCommit.object === object &&
        previousMissionCommit.missionId === String(object.userData.missionId || "") &&
        previousMissionCommit.nodeId === String(object.userData.missionNodeId || "") &&
        previousMissionCommit.mode === mode
      ) {
        return true;
      }

      if (!resolved.definition || !mode) {
        console.warn("[BlueFox O5.1] Interaction refusée : objet absent ou incomplet dans le CUO.", object);
        this.callbacks.onStatus("BlueFox ne sait pas encore comment interagir avec cet objet.");
        object.userData.requestedInteraction = null;
        object.userData.requestedInteractionSource = null;
        clearAcquisitionTransaction(this, object);

        // stale-target-reset-v1
        this.pendingInteraction = null;
        this.interactionStartedAt = 0;
        this.interactionApproachStartedAt = 0;
        this.interactionApproachAttempts = 0;
        this.character.stop?.();
        this.character.setTarget?.(this.character.root.position);
        this.postActionRecoveryUntil = performance.now() + 350;
        return false;
      }
      object.userData.requestedInteraction = mode;
      object.userData.requestedInteractionSource = directive ? "mission" : (source || "manual");
      originalTarget(object, retry);
      const label = resolved.definition.label?.toLowerCase() || "l’objet";
      const narrativeVerb = object.userData.missionNarrativeVerb || mode;
      const approachTexts = {
        collect: `BlueFox s’approche de ${label} pour le prélever.`,
        extract: `BlueFox s’approche de ${label} pour en extraire une ressource.`,
        observe: `BlueFox se place près de ${label} pour l’observer.`,
        inspect: `BlueFox s’approche de ${label} pour l’inspecter.`,
        analyze: `BlueFox s’approche de ${label} pour l’analyser.`
      };
      this.callbacks.onStatus(
        approachTexts[narrativeVerb] ||
        approachTexts[mode] ||
        `BlueFox s’approche de ${label}.`
      );
      return true;
    };

    engine.updateInteraction = function updateObjectInteraction(now) {
      updateStudyPose(this.character, now);
      if (!this.pendingInteraction) return;
      if (!this.pendingInteraction.userData.active) {
        const failedTarget = this.pendingInteraction;
        const source = failedTarget.userData.requestedInteractionSource;
        if (source === "mission" && this.missionManager?.currentAction) {
          this.missionManager.cancelCurrentAction(
            "object-inactive",
            { failedTarget }
          );
        } else {
          this.cancelMissionInteraction(null, "object-inactive");
        }
        return;
      }
      const object = this.pendingInteraction;
      const resolved = resolveObject(object);
      const { anchor, definition } = resolved;
      if (!definition) {
        console.warn("[BlueFox O5.1] Définition CUO introuvable pendant l'interaction.", object);
        const source = object.userData.requestedInteractionSource;
        if (source === "mission" && this.missionManager?.currentAction) {
          this.missionManager.cancelCurrentAction(
            "object-definition-missing",
            { failedTarget: object }
          );
        } else {
          this.cancelMissionInteraction(null, "object-definition-missing");
        }
        return;
      }
      const state = interactionState(resolved);
      const mode = validateAction(
        resolved,
        object.userData.requestedInteraction,
        object.userData.requestedInteractionSource === "mission"
      );
      if (!mode) {
        this.callbacks.onStatus("Cette interaction n'est pas autorisée par le catalogue d'objets.");
        const source = object.userData.requestedInteractionSource;
        this.cancelMissionInteraction(null, "object-action-rejected");
        if (source === "mission") {
          this.missionManager?.cancelCurrentAction("object-action-rejected");
        }
        return;
      }
      object.userData.requestedInteraction = mode;
      const anchorPosition = this.interactionWorldPosition(object);
      const distance = this.character.root.position.distanceTo(anchorPosition);
      const interactionDistance = this.interactionValidationDistance(object);
      if (!this.interactionStartedAt && distance > interactionDistance) {
        if (now - this.interactionApproachStartedAt > 6500) {
          this.interactionApproachAttempts += 1;
          if (this.interactionApproachAttempts <= 3) this.targetInteraction(object, true);
          else {
            this.callbacks.onStatus("BlueFox renonce temporairement à cet objet inaccessible.");
            const source = object.userData.requestedInteractionSource;
            if (source === "mission" && this.missionManager?.currentAction) {
              this.missionManager.cancelCurrentAction(
                "interaction-inaccessible",
                { failedTarget: object }
              );
            } else {
              this.cancelMissionInteraction(null, "interaction-inaccessible");
            }
          }
        }
        return;
      }

      this.character.stop();
      if (!this.interactionStartedAt) {
        this.interactionStartedAt = now;
        this.character.facePoint(anchorPosition);
        const acquisition = mode === "collect" || mode === "extract";
        const size = String(definition.size || "S").toUpperCase();
        const isPlant = definition.knowledge?.family === "flora" ||
          definition.resource?.family === "fiber" ||
          /plant|flora|fiber|biomass/i.test(`${definition.type} ${definition.subtype}`);
        const animationHints = acquisition
          ? size === "L" || size === "XL" || definition.knowledge?.family === "mineral"
            ? ["Harvest_Heavy", "Harvest_Medium", "Harvest_Heavy"]
            : size === "M" || isPlant
              ? ["Harvest_Light", "Harvest_Medium", "Harvest_Light"]
              : ["Harvest_Light"]
          : definition.interaction?.animation?.[mode] || [];
        const studyInteraction = !acquisition;
        const studyContext = `${definition.type || ""} ${definition.category || ""} ${definition.subtype || ""}`;
        const microSceneContext = Boolean(
          object.userData?.microSceneId ||
          object.userData?.persistentMicroSceneId ||
          resolved.anchor?.userData?.microSceneId ||
          resolved.anchor?.userData?.persistentMicroSceneId
        );
        const missionMicroSceneStudy =
          object.userData.requestedInteractionSource === "mission" &&
          microSceneContext;
        const emphasizedStudy =
          /relic|st[eè]le|stele|arch/i.test(studyContext) ||
          missionMicroSceneStudy;
        const duration = studyInteraction
          ? startStudyPose(this.character, emphasizedStudy)
          : this.character.playInteraction(mode, animationHints);
        this.interactionDuration = Math.max(
          studyInteraction ? 2000 : 2200,
          duration * 1000
        );
        const label = definition.label?.toLowerCase() || "l’objet";
        const actionTexts = {
          collect: `BlueFox collecte ${label}.`,
          extract: `BlueFox extrait une ressource de ${label}.`,
          observe: `BlueFox observe ${label} et mémorise cette information.`,
          inspect: `BlueFox inspecte ${label}.`,
          analyze: `BlueFox analyse ${label}.`
        };
        const narrativeVerb = object.userData.missionNarrativeVerb || mode;
        this.callbacks.onAction(
          actionTexts[narrativeVerb] ||
          actionTexts[mode] ||
          `BlueFox étudie ${label}.`
        );
        return;
      }
      if (now - this.interactionStartedAt < this.interactionDuration) return;
      // CharacterController possède la séquence physique réelle. Pour une
      // acquisition, ObjectM0 ne commit pas tant que cette séquence existe ;
      // son timer reste seulement le garde-fou minimal lorsque le contrôleur
      // ne fournit aucune séquence.
      if (
        ["collect", "extract"].includes(mode) &&
        this.character.interactionSequence
      ) return;

      const detail = {
        kind: definition.resource?.inventoryKey || definition.type || object.userData.kind,
        subject:
          object.userData.missionSubject ||
          definition.knowledge?.family ||
          definition.category ||
          definition.type ||
          object.userData.kind,
        missionNarrativeVerb: object.userData.missionNarrativeVerb || null,
        missionNodeId: object.userData.missionNodeId || null,
        missionId: object.userData.missionId || null,
        mapId: this.currentMapId,
        zoneId: this.currentZoneIndex,
        amount: Math.max(1, Number(object.userData.resourceQuantity || anchor.userData.resourceQuantity || definition.resource?.quantity || 1)),
        quantity: Math.max(1, Number(object.userData.resourceQuantity || anchor.userData.resourceQuantity || definition.resource?.quantity || 1)),
        interactionMode: mode,
        cuoType: definition.type || null,
        interactionSource: object.userData.requestedInteractionSource || "autonomy",
        studyGeneration: Math.max(0, Number(state.studyGeneration) || 0),
        interactionState: { ...state }
      };
      const autonomousInteraction = detail.interactionSource === "autonomy";
      const missionActionAtCommit =
        detail.interactionSource === "mission"
          ? this.missionManager?.currentAction || null
          : null;
      const rememberMissionCommit = () => {
        if (!missionActionAtCommit) return;
        this.__objectM0LastMissionCommit = {
          action: missionActionAtCommit,
          object,
          missionId: String(detail.missionId || ""),
          nodeId: String(detail.missionNodeId || ""),
          mode
        };
      };

      const acquisition = mode === "collect" || mode === "extract";
      let continueAcquisition = false;
      if (acquisition) {
        state.collected = true;
        state.collectionCount += 1;
        const removeFromWorld =
          definition.interaction?.removeFromWorld ??
          definition.gameplay?.collectable === true;
        if (removeFromWorld) {
          object.userData.active = false;
          anchor.visible = false;
        }
        const inventoryKey = definition.resource?.inventoryKey || definition.type || object.userData.kind;
        for (let unit = 0; unit < detail.quantity; unit += 1) {
          this.callbacks.onCollect(inventoryKey);
        }
        const eventType = mode === "extract"
          ? BF.ObjectEvents.types.RESOURCE_EXTRACTED
          : BF.ObjectEvents.types.RESOURCE_COLLECTED;
        BF.ObjectEvents.emit(eventType, object, {
          ...detail,
          label: definition.resource?.inventoryLabel || definition.label,
          inventoryKey
        });
        rememberMissionCommit();
        clearAcquisitionTransaction(this, object);
        if (removeFromWorld) {
          const respawnSeconds = BF.resolveObjectRespawnSeconds?.(definition) ??
            Number(definition.interaction?.respawnSeconds);
          if (!Number.isFinite(respawnSeconds) || respawnSeconds <= 0) {
            console.error(
              `[BlueFox3D] Métadonnée CUO interaction.respawnSeconds absente ou invalide pour ${definition.id || definition.type}.`
            );
          } else {
            const respawnMs = respawnSeconds * 1000;
            const cooldown = setTimeout(() => {
              if (this.disposed) return;
              anchor.visible = true;
              state.studyGeneration =
                Math.max(0, Number(state.studyGeneration) || 0) + 1;
              object.userData.active = true;
              state.collected = false;
              if (definition.interaction?.observeBeforeAcquire === true) {
                state.acquisitionObservationSatisfied = false;
              }
              object.userData.requestedInteraction = null;
              object.userData.requestedInteractionSource = null;
              this.resourceCooldowns.delete(object);
            }, respawnMs);
            this.resourceCooldowns.set(object, cooldown);
          }
        }
      } else {
        state.identified = true;
        if (mode === "observe") {
          state.observed = true;
          state.observationCount += 1;
          if (definition.interaction?.observeBeforeAcquire === true) {
            state.acquisitionObservationSatisfied = true;
          }
        }
        if (mode === "inspect") {
          state.inspected = true;
          state.inspectionCount += 1;
        }
        if (mode === "analyze") {
          state.analyzed = true;
          state.analysisCount += 1;
        }
        const eventType = {
          observe: BF.ObjectEvents.types.PHENOMENON_OBSERVED,
          inspect: BF.ObjectEvents.types.OBJECT_INSPECTED,
          analyze: BF.ObjectEvents.types.OBJECT_ANALYZED
        }[mode];
        BF.ObjectEvents.emit(eventType, object, {
          ...detail,
          label: definition.label,
          interactionState: { ...state }
        });
        rememberMissionCommit();
        // Une étude missionnelle peut en débloquer une autre sur la même
        // instance. OBSERVE reste l'unique geste physique ; le verbe narratif
        // (observe/inspect/analyze) distingue l'objectif missionnel.
        // Le distinct par instance du nœud empêche de recompter cette même
        // instance pour le même objectif avant de reprendre l'acquisition.
        const continueStudyDirective =
          ["collect", "extract"].includes(object.userData.acquisitionIntent) &&
          capabilities(definition).collectable
            ? activeStudyDirective(this, resolved)
            : null;
        continueAcquisition =
          ["collect", "extract"].includes(object.userData.acquisitionIntent) &&
          capabilities(definition).collectable;
        if (continueAcquisition) {
          object.userData.acquisitionPhase =
            continueStudyDirective ? "study" : "acquire";
          if (continueStudyDirective) {
            object.userData.requestedInteraction = "observe";
            object.userData.requestedInteractionSource = "mission";
            object.userData.missionSubject = continueStudyDirective.subject;
            object.userData.missionNarrativeVerb =
              continueStudyDirective.narrativeVerb;
            object.userData.missionNodeId = continueStudyDirective.nodeId;
            object.userData.missionId = continueStudyDirective.missionId;
          }
        }
        object.userData.lastInspectedAt = Date.now();
        object.userData.requestedInteraction = null;
        object.userData.requestedInteractionSource = null;
      }

      if (this.character.__bluefoxStudyPose?.action) {
        this.character.__bluefoxStudyPose.action.paused = false;
      }
      this.character.__bluefoxStudyPose = null;
      this.character.cancelInteraction();
      object.userData.lastInteractionAt = now;
      if (autonomousInteraction) {
        object.userData.lastAutonomousInteractionAt = now;
        object.userData.autonomousInteractionCount =
          (Number(object.userData.autonomousInteractionCount) || 0) + 1;
        this.autonomyActionStreak = (Number(this.autonomyActionStreak) || 0) + 1;
      } else if (detail.interactionSource === "manual") {
        this.autonomyActionStreak = 0;
      }
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
      object.userData.requestedMovementMode = null;
      object.userData.requestedInteraction = null;
      object.userData.requestedInteractionSource = null;
      if (!continueAcquisition) {
        object.userData.missionSubject = null;
        object.userData.missionNarrativeVerb = null;
        object.userData.missionNodeId = null;
        object.userData.missionId = null;
        if (acquisition) {
          clearAcquisitionTransaction(this, object);
        }
      }
      if (continueAcquisition && object.userData.active && !this.disposed) {
        const intended = object.userData.acquisitionIntent;
        const intendedSource =
          object.userData.acquisitionIntentSource ||
          detail.interactionSource ||
          "autonomy";

        // La chaîne continue AVANT toute nouvelle décision autonome.
        // Aucune recherche de cible : on garde exactement le même objet.
        const continuingStudy =
          object.userData.acquisitionPhase === "study" &&
          object.userData.requestedInteraction === "observe" &&
          object.userData.requestedInteractionSource === "mission";
        if (!continuingStudy) {
          object.userData.requestedInteraction = intended;
          object.userData.requestedInteractionSource = intendedSource;
          object.userData.missionSubject =
            object.userData.acquisitionMissionSubject || null;
          object.userData.missionNarrativeVerb =
            object.userData.acquisitionMissionNarrativeVerb || null;
          object.userData.missionNodeId =
            object.userData.acquisitionMissionNodeId || null;
          object.userData.missionId =
            object.userData.acquisitionMissionId || null;
        }
        this.postActionRecoveryUntil = now;
        this.targetInteraction(object, true);
      }
    };

    installed.world = true;
    return true;
  };

  const installWorldBridge = () => {
    if (installed.world || !BF.ObjectEvents || typeof BF.mount !== "function") return false;
    if (BF.mount.__objectM0Wrapped) return false;
    const originalMount = BF.mount;
    const wrappedMount = async function mountWithObjectBridge(options) {
      // ActionBridge peut être défini après le chargement initial de ce
      // bridge. Revalider le prototype réellement actif avant que mount()
      // ne construise MissionManager et son ActionBridge.
      installActionBridge();
      const engine = await originalMount.call(this, options);
      installActionBridge();
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
  BF.probeMissionActionTarget = probeMissionActionTarget;
  BF.installObjectM0Bridge = install;
  BF.getObjectM0BridgeState = () => ({ ...installed });
  install();

})(window);
