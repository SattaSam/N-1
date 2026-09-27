(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const VERSION = "0.2-map-scoped-construction";
  const STORAGE_KEY = "bluefox_bible_runtime_v0_1_unified";

  const clone = (value) =>
    value == null ? value : JSON.parse(JSON.stringify(value));
  const lower = (value) => String(value ?? "").trim().toLowerCase();
  const asArray = (value) =>
    Array.isArray(value) ? value : value == null ? [] : [value];

  const OBJECT_TYPE_TO_TRIGGER = Object.freeze({
    OBJECT_SEEN: "interaction.observe",
    PHENOMENON_OBSERVED: "interaction.observe",
    OBJECT_INSPECTED: "interaction.inspect",
    OBJECT_ANALYZED: "interaction.analyze",
    RESOURCE_COLLECTED: "interaction.collect",
    RESOURCE_EXTRACTED: "interaction.extract"
  });

  class BibleRuntimeV01 {
    constructor() {
      this.patterns = BF.BiblePatterns || {};
      this.catalog = Array.isArray(BF.BibleCatalog)
        ? BF.BibleCatalog
        : Object.values(BF.BibleCatalog || {});
      this.byId = new Map(this.catalog.map((mission) => [mission.id, mission]));
      this.state = this.loadState();
      this.dynamicMissions = new Map();
      this.activePlacement = null;
      this.restoreConstructionInstances();
      this.restoreFaunaMissionInstances();
      // Les missions scoped dérivées de templates (locales, exploration locale,
      // ENV locale) ne disposent pas d'un registre d'instances autonome.
      // On les reconstruit depuis MissionMemory avant registerDefinitions(),
      // sans modifier le lifecycle possédé par MissionManager.
      this.restoreLocalMissionDefinitions();

      // Migration de structure uniquement : l'ancien runtime utilisait une
      // seconde vérité "revealed/completed" qui pouvait empêcher une mission
      // de se réactiver alors que MissionManager ne l'avait plus en mémoire.
      // On ne réinitialise JAMAIS la mémoire de mission ici.
      try {
        global.localStorage?.removeItem?.("bluefox_bible_runtime_v0");
      } catch {}

      this.unsubscribeObjectEvents = null;
      this.activationEventIds = new Set();
      this.activationEventMissionIds = new Map();
      // Cache runtime uniquement : observe les transitions lifecycle sans
      // backfill au chargement. MissionManager reste propriétaire du statut ;
      // BibleRuntime traduit seulement une transition réelle -> completed en
      // événement de trigger Bible canonique.
      this.missionLifecycleStatuses = new Map();
      // Cache strictement runtime : reconstruit une seule fois pour chaque
      // instance de map chargée. La mémoire persistante reste dans MissionMemory.
      this.observationResolvers = new WeakMap();
      this.observationCaptureQueued = false;
      this.started = false;
      this.lastGateReviewAt = 0;
      this.lastActivationAttempt = null;
      this.boundMissionState = (event) =>
        this.onMissionState(event.detail || BF.getMissionState?.() || {});
      this.boundMapTransition = (event) =>
        this.onMapTransition(event.detail || {});
      this.boundExplorationChange = (event) =>
        this.onExplorationChanged(event.detail || {});
      this.boundRationConsumed = (event) =>
        this.onRationConsumed(event.detail || {});
      this.boundSurvivalChanged = (event) =>
        this.onSurvivalChanged(event.detail || {});
      this.boundRationsChanged = () =>
        this.reconcileRuntimeCounters();
      this.pendingManualRationProof = null;
      this.proximityContextTimer = null;
      this.localExplorationReconciling = false;
      this.localExplorationSessionRestored = false;
      this.localExplorationSessionMapId = null;
      this.localExplorationAwaitingPostArrival = null;
      this.localSiteProgressionReconciling = false;
      this.environmentReconciling = false;
      this.civilizationContactReconciling = false;
      this.worldEventReconciling = false;
      this.persistentWorldSceneReconciling = false;
      this.pendingConstructionResourceMissions = new Set();
      this.constructionResourceSignatures = new Map();
      this.boundProgressionChanged = (event) =>
        this.onProgressionChanged(event.detail || {});
      this.boundSiteEstablished = (event) =>
        this.onSiteEstablished(event.detail || {});
      this.boundCivilizationTradeCompleted = (event) =>
        this.onCivilizationTradeCompleted(event.detail || {});
      this.boundFinalDepartureCompleted = (event) =>
        this.onFinalDepartureCompleted(event.detail || {});
      this.boundTeleportationHypothesis = () =>
        this.reconcileDeferredCompletionTriggers();
    }

    defaultState() {
      return {
        version: VERSION,
        triggerCounts: {},
        uniqueTriggerValues: {},
        progressNarrative: {},
        effectsApplied: {},
        gatesSatisfied: {},
        activationInventoryCredits: {},
        constructionInstances: {},
        localMissionInstances: {},
        faunaMissionInstances: {},
      };
    }

    loadState() {
      try {
        const saved = JSON.parse(
          global.localStorage?.getItem?.(STORAGE_KEY) || "null"
        );
        return {
          ...this.defaultState(),
          ...(saved || {}),
          version: VERSION,
          triggerCounts: { ...(saved?.triggerCounts || {}) },
          uniqueTriggerValues: { ...(saved?.uniqueTriggerValues || {}) },
          progressNarrative: { ...(saved?.progressNarrative || {}) },
          effectsApplied: { ...(saved?.effectsApplied || {}) },
          gatesSatisfied: { ...(saved?.gatesSatisfied || {}) },
          activationInventoryCredits: { ...(saved?.activationInventoryCredits || {}) },
          constructionInstances: { ...(saved?.constructionInstances || {}) },
          localMissionInstances: { ...(saved?.localMissionInstances || {}) },
          faunaMissionInstances: { ...(saved?.faunaMissionInstances || {}) },
        };
      } catch {
        return this.defaultState();
      }
    }

    saveState() {
      try {
        global.localStorage?.setItem?.(
          STORAGE_KEY,
          JSON.stringify(this.state)
        );
        return true;
      } catch {
        return false;
      }
    }

    allMissions() {
      return [...this.catalog, ...this.dynamicMissions.values()];
    }

    localExplorationTemplates() {
      return this.catalog
        .filter((mission) =>
          mission?.instanceScope === "map" && mission?.localExploration
        )
        .sort((left, right) =>
          Number(left.localExploration.activationThreshold) -
          Number(right.localExploration.activationThreshold)
        );
    }

    localExplorationInstanceId(baseId, mapId) {
      return `${String(baseId || "")}@${String(mapId || "")}`;
    }

    localExplorationMission(instanceId) {
      const separator = String(instanceId || "").indexOf("@");
      if (separator < 1) return null;
      const baseId = instanceId.slice(0, separator);
      const mapId = instanceId.slice(separator + 1);
      const template = this.byId.get(baseId);
      if (!template?.localExploration || !mapId) return null;
      return {
        ...template,
        id: instanceId,
        baseMissionId: baseId,
        scopeId: mapId,
        title: template.title
      };
    }

    localMissionTemplates() {
      return this.catalog.filter((mission) =>
        mission?.instanceScope === "map" && mission?.localMission
      );
    }

    localMissionContext(instanceId, event = null) {
      const key = String(instanceId || "");
      const stored = this.state.localMissionInstances?.[key] || {};
      if (!event) return stored;
      this.state.localMissionInstances = this.state.localMissionInstances || {};
      const next = {
        ...stored,
        mapId: event.mapId || stored.mapId || null,
        family: event.family || event.subject || stored.family || null,
        persistentMicroSceneId:
          event.persistentMicroSceneId || stored.persistentMicroSceneId || null,
        activatedAt: stored.activatedAt || Date.now()
      };
      this.state.localMissionInstances[key] = next;
      this.saveState();
      return next;
    }

    localMissionInstance(instanceId, event = null) {
      const separator = String(instanceId || "").indexOf("@");
      if (separator < 1) return null;
      const baseId = instanceId.slice(0, separator);
      const mapId = instanceId.slice(separator + 1);
      const template = this.byId.get(baseId) ||
        this.catalog.find((mission) => mission?.id === baseId);
      if (!template?.localMission || !mapId) return null;
      if (event) this.localMissionContext(instanceId, event);
      return {
        ...template,
        id: instanceId,
        baseMissionId: baseId,
        scopeId: mapId,
        targetMapId: mapId,
        title: template.title
      };
    }

    localMissionActivationMatches(activation, event) {
      if (!activation || !event || activation.type !== event.type) return false;
      const exactKeys = [
        "objectId", "kind", "family", "subject", "persistentMicroSceneId"
      ];
      for (const key of exactKeys) {
        if (activation[key] != null && lower(activation[key]) !== lower(event[key])) {
          return false;
        }
      }
      const tags = new Set(asArray(event.tags).map(lower));
      if (activation.tagsAny?.length &&
          !activation.tagsAny.some((tag) => tags.has(lower(tag)))) return false;
      if (activation.tagsAll?.length &&
          !activation.tagsAll.every((tag) => tags.has(lower(tag)))) return false;
      if (activation.requireMicroScene === true && !event.persistentMicroSceneId) {
        return false;
      }
      return true;
    }

    localMissionsUnlocked() {
      const manager = this.manager();
      const lifecycle = manager?.memory?.state?.missionLifecycle || {};
      return Boolean(
        manager?.memory?.getFact?.("localExplorationUnlocked:v1", false) ||
        lifecycle?.T09?.status === "completed" ||
        ["active", "completed"].includes(lifecycle?.T10?.status)
      );
    }

    localMissionEligibleOnMap(template, mapId) {
      if (!template?.localMission || !mapId || !this.localMissionsUnlocked()) return false;
      const baseId = String(template.id || "").split("@")[0];
      // Pendant T09→T13, seule la progression locale historique 15→60→100
      // est autorisée. Les autres LOC restent verrouillées jusqu'à T13.
      if (!this.foundationTutorialUnlocked() && !["LOC-05", "LOC-06"].includes(baseId)) {
        return false;
      }
      if (template.localMission.newMapOnly === true) {
        const definition = BF.maps?.[mapId] || {};
        const generated = definition.generated === true ||
          String(mapId).startsWith("generated-") ||
          String(mapId).startsWith("map-");
        if (!generated || String(mapId) === "crystal") return false;
      }
      const constructionKind = lower(template.localMission.constructionKind);
      if (constructionKind && this.siteBucket(mapId)?.[constructionKind]) return false;
      return true;
    }

    persistedMissionMemoryState() {
      const managerState = this.manager()?.memory?.state;
      if (managerState && typeof managerState === "object") return managerState;
      try {
        const key = Missions.MISSION_STORAGE_KEY || "bluefox_mission_memory_m0_v1";
        const saved = JSON.parse(global.localStorage?.getItem?.(key) || "null");
        return saved && saved.version === 3 ? saved : null;
      } catch {
        return null;
      }
    }

    persistedScopedMissionIds(memoryState = this.persistedMissionMemoryState()) {
      if (!memoryState || typeof memoryState !== "object") return [];
      const lifecycleIds = Object.keys(memoryState.missionLifecycle || {});
      const treeIds = Object.keys(memoryState.missions || {});
      const rememberedIds = Array.isArray(memoryState.activeMissionIds)
        ? memoryState.activeMissionIds
        : [];
      return [...new Set([
        memoryState.primaryMissionId,
        memoryState.activeMissionId,
        ...rememberedIds,
        ...lifecycleIds,
        ...treeIds,
        ...Object.keys(this.state?.localMissionInstances || {})
      ].filter((id) => String(id || "").includes("@")))];
    }

    restoreLocalMissionDefinitions() {
      const memoryState = this.persistedMissionMemoryState();
      if (!memoryState) return 0;
      let restored = 0;

      for (const missionId of this.persistedScopedMissionIds(memoryState)) {
        if (Missions.getDefinition?.(missionId)) continue;
        const mission =
          this.localExplorationMission(missionId) ||
          this.localMissionInstance(missionId) ||
          this.environmentLocalMission(missionId);
        if (!mission) continue;

        // Ces instances scoped restent dérivées de leur template : on ne crée
        // ni registre parallèle ni nouvelle source de vérité runtime. On réutilise
        // uniquement le compilateur et le registre de définitions canoniques.
        const compiled = this.compileMission(mission);
        if (!compiled || typeof BF.registerMissionDefinitions !== "function") continue;
        BF.registerMissionDefinitions([compiled]);
        if (!Missions.getDefinition?.(mission.id)) continue;
        restored += 1;
      }
      return restored;
    }


    reconcileLocalSiteProgression() {
      if (this.localSiteProgressionReconciling) return false;
      const manager = this.manager();
      if (!manager?.trees?.size) return false;
      this.localSiteProgressionReconciling = true;
      try {
        let changed = false;
        [...(manager.activeMissionIds || [])].forEach((missionId) => {
          const mission = this.localMissionInstance(missionId);
          const kind = lower(mission?.localMission?.constructionKind);
          if (!mission || !kind) return;
          const tree = manager.trees.get(missionId);
          const node = tree?.find?.(`${mission.baseMissionId}:construct@${mission.scopeId}`) ||
            tree?.find?.(`${missionId}:construct`);
          if (!node || node.isComplete || !this.siteBucket(mission.scopeId)?.[kind]) return;
          if (node.increment?.(1)) {
            tree.refresh?.();
            manager.memory?.saveTree?.(tree);
            changed = true;
          }
        });
        if (changed) {
          manager.syncLifecycleFromTrees?.();
          manager.memory?.save?.();
          manager.publish?.();
        }
        return changed;
      } finally {
        this.localSiteProgressionReconciling = false;
      }
    }

    missionsForState(state) {
      const missions = [...this.allMissions()];
      (state?.missions || []).forEach((entry) => {
        const missionId = entry.missionId || entry.id;
        const mission = this.localExplorationMission(missionId) ||
          this.localMissionInstance(missionId) ||
          this.environmentLocalMission(missionId);
        if (mission) missions.push(mission);
      });
      return missions;
    }

    environmentLocalTemplates() {
      return this.catalog.filter((mission) =>
        mission?.instanceScope === "map" && mission?.envLocal
      );
    }

    environmentLocalMission(instanceId) {
      const separator = String(instanceId || "").indexOf("@");
      if (separator < 1) return null;
      const baseId = instanceId.slice(0, separator);
      const mapId = instanceId.slice(separator + 1);
      const template = this.byId.get(baseId);
      if (!template?.envLocal || !mapId) return null;
      const family = String(template.envLocal.family || "").toUpperCase();
      const percent = Number(template.envLocal.targetPercent) || 0;
      return {
        ...template,
        id: instanceId,
        baseMissionId: baseId,
        scopeId: mapId,
        targetMapId: mapId,
        prerequisites: percent >= 100
          ? [`ENV-MAP-${family}-50@${mapId}`]
          : ["T13"],
        title: template.title
      };
    }

    suppressLocalNarrative(mission, surfacePercent) {
      if (!mission) return;
      let changed = false;
      const revealedKey = `${mission.id}:revealed`;
      if (!this.state.progressNarrative[revealedKey]) {
        this.state.progressNarrative[revealedKey] = Date.now();
        changed = true;
      }
      (mission.narrative?.progress || []).forEach((milestone, index) => {
        const threshold = milestone.atCount != null
          ? Number(milestone.atCount)
          : Number(milestone.at) *
            Number(mission.localExploration?.completionThreshold || 100);
        if (Number(surfacePercent) >= threshold) {
          const key = `${mission.id}:progress:${index}`;
          if (!this.state.progressNarrative[key]) {
            this.state.progressNarrative[key] = Date.now();
            changed = true;
          }
        }
      });
      if (
        Number(surfacePercent) >=
        Number(mission.localExploration?.completionThreshold || Infinity)
      ) {
        const completedKey = `${mission.id}:completed`;
        if (!this.state.progressNarrative[completedKey]) {
          this.state.progressNarrative[completedKey] = Date.now();
          changed = true;
        }
      }
      if (changed) this.saveState();
    }

    reconcileLocalExplorationMap(mapId, surfacePercent) {
      const manager = this.manager();
      const targetMapId = String(mapId || "");
      if (!manager || !targetMapId) return false;
      const percent = Math.max(0, Math.min(100, Number(surfacePercent) || 0));
      const currentMapId = String(BF.currentEngine?.currentMapId || "");
      let changed = false;

      for (const template of this.localExplorationTemplates()) {
        const activationThreshold = Number(
          template.localExploration.activationThreshold
        ) || 0;
        const instanceId = this.localExplorationInstanceId(
          template.id,
          targetMapId
        );
        let lifecycle = manager.memory?.state?.missionLifecycle?.[instanceId];
        if (percent < activationThreshold && !lifecycle) continue;

        const mission = this.localExplorationMission(instanceId);
        if (targetMapId !== currentMapId) {
          this.suppressLocalNarrative(mission, percent);
        }

        if (!lifecycle || ["available", "hidden"].includes(lifecycle.status)) {
          changed = this.startMissionThroughBible(instanceId, {
            primary: false,
            autoPrimaryEligible: false,
            source: "local-exploration",
            reason: `Seuil local atteint sur ${targetMapId}.`
          }) || changed;
          lifecycle = manager.memory?.state?.missionLifecycle?.[instanceId];
        } else if (lifecycle.status === "paused" && targetMapId === currentMapId) {
          changed = manager.resumeMission(instanceId, {
            primary: false,
            autoPrimaryEligible: false,
            source: "local-exploration"
          }) === true || changed;
          lifecycle = manager.memory?.state?.missionLifecycle?.[instanceId];
        }

        if (lifecycle?.status === "active") {
          changed = Boolean(BF.progressExploreScopeMissions?.({
            mapId: targetMapId,
            zoneId: null,
            surfacePercent: percent,
            amount: 0
          })) || changed;
          lifecycle = manager.memory?.state?.missionLifecycle?.[instanceId];
        }

        if (lifecycle?.status === "active" && targetMapId !== currentMapId) {
          changed = manager.pauseMission(
            instanceId,
            "Mission locale masquée hors de sa map."
          ) === true || changed;
        }
      }
      return changed;
    }

    reconcileLocalExploration(state = BF.getMissionState?.() || {}) {
      if (this.localExplorationReconciling) return false;
      const manager = this.manager();
      if (!manager) return false;
      const unlockFact = "localExplorationUnlocked:v1";
      const backfillFact = "localExplorationBackfillComplete:v1";
      const tutorialLifecycle = manager.memory?.state?.missionLifecycle || {};
      const localExplorationReady = Boolean(
        tutorialLifecycle?.T09?.status === "completed" ||
        ["active", "completed"].includes(tutorialLifecycle?.T10?.status)
      );
      const unlocked = Boolean(manager.memory?.getFact?.(unlockFact, false));
      const backfilled = Boolean(manager.memory?.getFact?.(backfillFact, false));
      if (!unlocked && !localExplorationReady) return false;
      if (unlocked && backfilled) return false;

      this.localExplorationReconciling = true;
      try {
        if (!unlocked) {
          manager.memory?.setFact?.(unlockFact, {
            missionId: tutorialLifecycle?.T10?.status ? "T10" : "T09",
            unlockedAt: Date.now()
          });
        }
        const maps = BF.getExplorationSummary?.().maps || {};
        let changed = false;
        Object.entries(maps).forEach(([mapId, exploration]) => {
          changed = this.reconcileLocalExplorationMap(
            mapId,
            exploration?.surfacePercent
          ) || changed;
        });
        manager.memory?.setFact?.(backfillFact, {
          completedAt: Date.now(),
          mapCount: Object.keys(maps).length
        });
        manager.memory?.save?.();
        return changed;
      } finally {
        this.localExplorationReconciling = false;
      }
    }

    pauseOffMapLocalExploration(currentMapId) {
      const manager = this.manager();
      if (!manager) return false;
      let changed = false;
      [...(manager.activeMissionIds || [])].forEach((missionId) => {
        const definition = manager.definition?.(missionId);
        if (
          definition?.localVisibility === "current-map" &&
          String(definition.scopeId || "") !== String(currentMapId || "")
        ) {
          changed = manager.pauseMission(
            missionId,
            "Mission locale masquée hors de sa map."
          ) === true || changed;
        }
      });
      return changed;
    }

    resumeCurrentMapLocalMissions(currentMapId) {
      const manager = this.manager();
      const lifecycles = manager?.memory?.state?.missionLifecycle || {};
      if (!manager || !currentMapId) return false;
      let changed = false;
      Object.entries(lifecycles).forEach(([missionId, lifecycle]) => {
        if (lifecycle?.status !== "paused") return;
        const separator = String(missionId).indexOf("@");
        if (separator < 1) return;
        const baseId = String(missionId).slice(0, separator);
        const scopeId = String(missionId).slice(separator + 1);
        const template = this.byId.get(baseId);
        if (!template?.localMission || scopeId !== String(currentMapId)) return;
        changed = manager.resumeMission?.(missionId, {
          primary: false,
          autoPrimaryEligible: false,
          source: "local-mission-return"
        }) === true || changed;
      });
      return changed;
    }

    restoreLocalExplorationSession() {
      if (this.localExplorationSessionRestored) return false;
      const manager = this.manager();
      if (!manager?.memory?.getFact?.("localExplorationUnlocked:v1", false)) {
        return false;
      }
      this.localExplorationSessionRestored = true;
      const mapId = String(BF.currentEngine?.currentMapId || "");
      if (!mapId) return false;
      this.localExplorationSessionMapId = mapId;
      this.localExplorationAwaitingPostArrival = null;
      const paused = this.pauseOffMapLocalExploration(mapId);
      const resumed = this.resumeCurrentMapLocalMissions(mapId);
      const exploration = BF.getMapExplorationState?.(mapId);
      return this.reconcileLocalExplorationMap(
        mapId,
        exploration?.surfacePercent
      ) || resumed || paused;
    }

    constructionTemplate(kind) {
      return BF.BibleConstructionTemplates?.[lower(kind)] || null;
    }

    constructionMissionId(kind, mapId) {
      return `${String(kind || "").trim().toUpperCase()}@${String(mapId || "").trim()}`;
    }

    buildConstructionMission(kind, mapId, source = "player") {
      const normalizedKind = lower(kind);
      const targetMapId = String(mapId || "").trim();
      const template = this.constructionTemplate(normalizedKind);
      if (!template || !targetMapId) return null;
      const id = this.constructionMissionId(normalizedKind, targetMapId);
      return {
        ...clone(template),
        id,
        title: template.title,
        constructionMission: true,
        constructionKind: normalizedKind,
        targetMapId,
        instanceScope: "map",
        activationSource: source === "autonomy" ? "autonomy" : "player",
        trigger: { type: "manual" },
        completionGate: {
          type: "proximity.shelter",
          mapId: targetMapId,
          shelterKinds: [normalizedKind],
          radius: 9999,
          scope: "current-map"
        }
      };
    }

    restoreConstructionInstances() {
      Object.values(this.state?.constructionInstances || {}).forEach((record) => {
        const mission = this.buildConstructionMission(
          record?.kind,
          record?.mapId,
          record?.source || "player"
        );
        if (!mission) return;
        this.dynamicMissions.set(mission.id, mission);
        this.byId.set(mission.id, mission);
      });
    }

    registerDynamicMission(mission) {
      if (!mission?.id) return false;
      this.dynamicMissions.set(mission.id, mission);
      this.byId.set(mission.id, mission);
      const compiled = this.compileMission(mission);
      if (!compiled || typeof BF.registerMissionDefinitions !== "function") {
        return false;
      }
      BF.registerMissionDefinitions([compiled]);
      return Boolean(Missions.getDefinition?.(mission.id));
    }

    faunaSpeciesTemplate(baseId) {
      const mission = this.catalog.find((entry) =>
        entry?.id === baseId && entry?.faunaSpeciesTemplate === true
      );
      return mission || null;
    }

    faunaSpeciesMissionId(baseId, cuoType) {
      return `${String(baseId || "")}@${String(cuoType || "").trim().toLowerCase()}`;
    }

    faunaSpeciesDefinition(cuoType) {
      const normalized = String(cuoType || "").trim().toLowerCase();
      if (!normalized) return null;
      const definition = BF.ObjectLibrary?.get?.(normalized) || null;
      return definition?.category === "fauna" ? definition : null;
    }

    buildFaunaSpeciesMission(baseId, cuoType, options = {}) {
      const template = this.faunaSpeciesTemplate(baseId);
      const definition = this.faunaSpeciesDefinition(cuoType);
      if (!template || !definition) return null;
      const normalized = String(definition.type || cuoType).toLowerCase();
      const id = this.faunaSpeciesMissionId(baseId, normalized);
      const previousByStage = {
        "FAU-01A": "FAU-11",
        "FAU-03A": this.faunaSpeciesMissionId("FAU-01A", normalized),
        "FAU-05A": this.faunaSpeciesMissionId("FAU-03A", normalized),
        "FAU-11A": options.bootstrap === true
          ? "FAU-11"
          : this.faunaSpeciesMissionId("FAU-05A", normalized)
      };
      const previous = previousByStage[baseId];
      const sequence = asArray(clone(template.sequence)).map((step) => ({
        ...step,
        params: {
          ...(step.params || {}),
          cuoType: normalized
        }
      }));
      const slots = Object.fromEntries(
        Object.entries(clone(template.slots || {})).map(([slot, value]) => [
          slot,
          {
            ...(value || {}),
            params: {
              ...(value?.params || {}),
              cuoType: normalized
            }
          }
        ])
      );
      return {
        ...clone(template),
        id,
        baseMissionId: baseId,
        faunaSpeciesTemplate: false,
        faunaSpeciesMission: true,
        faunaSpeciesCuoType: normalized,
        faunaSpeciesBootstrap: options.bootstrap === true,
        trigger: { type: "manual", count: 1 },
        prerequisites: previous ? [previous] : [],
        primaryOnActivation: false,
        autoPrimaryEligible: false,
        title: `${template.title} — ${definition.label || normalized}`,
        sequence,
        slots
      };
    }

    restoreFaunaMissionInstances() {
      Object.values(this.state?.faunaMissionInstances || {}).forEach((record) => {
        const mission = this.buildFaunaSpeciesMission(
          record?.baseMissionId,
          record?.cuoType,
          { bootstrap: record?.bootstrap === true }
        );
        if (!mission) return;
        this.dynamicMissions.set(mission.id, mission);
        this.byId.set(mission.id, mission);
      });
    }

    ensureFaunaSpeciesMission(baseId, cuoType, options = {}) {
      const id = this.faunaSpeciesMissionId(baseId, cuoType);
      let mission = this.dynamicMissions.get(id) || null;
      if (!mission) {
        mission = this.buildFaunaSpeciesMission(baseId, cuoType, options);
        if (!mission || !this.registerDynamicMission(mission)) return null;
        this.state.faunaMissionInstances[id] = {
          missionId: id,
          baseMissionId: baseId,
          cuoType: mission.faunaSpeciesCuoType,
          bootstrap: options.bootstrap === true,
          createdAt: Date.now()
        };
        this.saveState();
      } else if (!Missions.getDefinition?.(id)) {
        if (!this.registerDynamicMission(mission)) return null;
      }
      return mission;
    }

    startFaunaSpeciesMission(baseId, cuoType, options = {}) {
      const candidateId = this.faunaSpeciesMissionId(baseId, cuoType);
      if (!this.foundationTutorialAllows({ id: candidateId })) return false;
      const mission = this.ensureFaunaSpeciesMission(baseId, cuoType, options);
      const manager = this.manager();
      if (!mission || !manager) return false;
      const lifecycle = this.missionLifecycle(mission.id);
      if (lifecycle.active || lifecycle.completed) return false;
      return this.startMissionThroughBible(mission.id, {
        primary: false,
        autoPrimaryEligible: false,
        prerequisites: asArray(mission.prerequisites),
        source: "fauna-species",
        reason: options.reason || `Relation avec l'espèce ${mission.faunaSpeciesCuoType}.`
      });
    }

    rearmFaunaSpeciesChain(cuoType) {
      const manager = this.manager();
      if (!manager) return false;
      let changed = false;
      ["FAU-01A", "FAU-03A", "FAU-05A"].forEach((baseId) => {
        const missionId = this.faunaSpeciesMissionId(baseId, cuoType);
        if (!this.state.faunaMissionInstances?.[missionId]) return;
        if (!this.missionLifecycle(missionId).completed) return;
        changed = manager.rearmRepeatableMission?.(missionId, {
          source: "fauna-species",
          reason: "Nouvelle tentative relationnelle avec cette espèce."
        }) === true || changed;
      });
      return changed;
    }

    faunaBehaviorEvent(rawEvent = {}) {
      const expected = String(BF.ObjectEvents?.types?.PHENOMENON_OBSERVED || "PHENOMENON_OBSERVED");
      if (String(rawEvent?.type || "") !== expected) return null;
      const detail = rawEvent?.detail || {};
      const tags = new Set([
        ...asArray(rawEvent?.tags),
        ...asArray(detail.tags)
      ].map(lower));
      const cuoType = lower(detail.cuoType);
      if (!tags.has("fauna_behavior") || !this.faunaSpeciesDefinition(cuoType)) return null;
      return {
        rawEvent,
        detail,
        tags,
        cuoType,
        instanceId: String(rawEvent?.instanceId || detail.instanceId || ""),
        distance: Number(detail.distance),
        state: lower(detail.state || rawEvent?.state)
      };
    }

    faunaMissionEvidenceInstanceIds(missionId) {
      const tree = this.manager()?.trees?.get?.(missionId);
      if (!tree?.root) return new Set();
      const result = new Set();
      tree.root.walk?.((node) => {
        asArray(node.distinctValues).forEach((value) => {
          const text = String(value || "").trim();
          if (text) result.add(text);
        });
        asArray(node.historyValues).forEach((value) => {
          try {
            const parsed = JSON.parse(value);
            const instanceId = String(parsed?.instanceId || "").trim();
            if (instanceId) result.add(instanceId);
          } catch {}
        });
      });
      return result;
    }

    faunaTerminalPriorInstanceIds(cuoType, mission) {
      const groupMissionId = this.faunaSpeciesMissionId("FAU-05A", cuoType);
      if (this.missionLifecycle(groupMissionId).completed) {
        return this.faunaMissionEvidenceInstanceIds(groupMissionId);
      }
      if (mission?.faunaSpeciesBootstrap === true) {
        return this.faunaMissionEvidenceInstanceIds("FAU-11");
      }
      return this.faunaMissionEvidenceInstanceIds(groupMissionId);
    }

    handleFaunaSpeciesObjectEvent(rawEvent = {}) {
      const event = this.faunaBehaviorEvent(rawEvent);
      const manager = this.manager();
      if (!event || !manager || !this.missionLifecycle("FAU-11").completed) return false;
      const { cuoType, instanceId, distance, tags, state } = event;
      const cautious = tags.has("cautious_approach") && tags.has("no_flee") &&
        Number.isFinite(distance) && distance < 5;
      const calm = tags.has("calm_nearby");
      const reputation = BF.FaunaRuntime?.getReputation?.(cuoType);
      if (reputation === "friendly") return false;

      const terminalId = this.faunaSpeciesMissionId("FAU-11A", cuoType);
      const terminalMission = this.dynamicMissions.get(terminalId) || null;
      const terminalLifecycle = terminalMission ? this.missionLifecycle(terminalId) : null;

      if (terminalMission && terminalLifecycle?.active && (state === "flee" || tags.has("flee"))) {
        BF.FaunaRuntime?.setReputation?.(cuoType, "hostile");
        if (terminalMission.faunaSpeciesBootstrap === true && cuoType === "brouteur") {
          manager.memory?.setFact?.("fauna:relationshipLoopUnlocked", true);
          manager.memory?.save?.();
        }
        return manager.failMission?.(
          terminalId,
          `Cette espèce a fui une approche de BlueFox.`
        ) === true;
      }

      if (terminalMission && terminalLifecycle?.active && calm) {
        const previous = this.faunaTerminalPriorInstanceIds(cuoType, terminalMission);
        if (!instanceId || previous.has(instanceId)) return false;
        return this.progressRuntimeValidationSlot(
          terminalId,
          terminalMission.runtimeValidation?.slot || "study",
          1
        );
      }

      if (!cautious) return false;

      const loopUnlocked = manager.memory?.getFact?.("fauna:relationshipLoopUnlocked", false) === true;
      if (!loopUnlocked) return false;

      const firstId = this.faunaSpeciesMissionId("FAU-01A", cuoType);
      const firstRecord = this.state.faunaMissionInstances?.[firstId] || null;
      const failedTerminal = terminalMission && terminalLifecycle?.status === "failed";
      const hasAnyChainRecord = ["FAU-01A", "FAU-03A", "FAU-05A", "FAU-11A"]
        .some((baseId) => Boolean(this.state.faunaMissionInstances?.[
          this.faunaSpeciesMissionId(baseId, cuoType)
        ]));

      if (hasAnyChainRecord && !failedTerminal && firstRecord) return false;

      if (failedTerminal) this.rearmFaunaSpeciesChain(cuoType);
      const started = this.startFaunaSpeciesMission("FAU-01A", cuoType, {
        reason: failedTerminal
          ? "Nouvelle approche prudente après un échec relationnel."
          : "Approche prudente réussie à moins de cinq mètres."
      });
      if (!started) return false;
      return this.progressRuntimeValidationSlot(firstId, "study", 1);
    }

    reconcileFaunaSpeciesMissions() {
      const manager = this.manager();
      if (!manager || !this.missionLifecycle("FAU-11").completed) return false;
      let changed = false;
      const bootstrapId = this.faunaSpeciesMissionId("FAU-11A", "brouteur");
      if (!this.state.faunaMissionInstances?.[bootstrapId]) {
        changed = this.startFaunaSpeciesMission("FAU-11A", "brouteur", {
          bootstrap: true,
          reason: "FAU-11 terminée : relation approfondie avec le Brouteur."
        }) || changed;
      }

      const records = Object.values(this.state.faunaMissionInstances || {});
      records.forEach((record) => {
        const missionId = String(record?.missionId || "");
        const cuoType = lower(record?.cuoType);
        if (!missionId || !cuoType) return;
        const lifecycle = this.missionLifecycle(missionId);
        if (!lifecycle.completed) return;
        if (record.baseMissionId === "FAU-01A") {
          changed = this.startFaunaSpeciesMission("FAU-03A", cuoType) || changed;
        } else if (record.baseMissionId === "FAU-03A") {
          changed = this.startFaunaSpeciesMission("FAU-05A", cuoType) || changed;
        } else if (record.baseMissionId === "FAU-05A") {
          changed = this.startFaunaSpeciesMission("FAU-11A", cuoType) || changed;
        } else if (record.baseMissionId === "FAU-11A") {
          const friendly = BF.FaunaRuntime?.setReputation?.(cuoType, "friendly") === true;
          if (record.bootstrap === true && cuoType === "brouteur") {
            manager.memory?.setFact?.("fauna:relationshipLoopUnlocked", true);
            manager.memory?.save?.();
          }
          changed = friendly || changed;
        }
      });
      return changed;
    }

    siteBucket(mapId) {
      const memory = this.manager()?.memory;
      const raw = memory?.state?.siteProgression?.[mapId] || null;
      if (!raw) return { camp: null, refuge: null, base: null, workbench: null };
      const sites = raw.sites && typeof raw.sites === "object"
        ? raw.sites
        : { [raw.kind]: raw };
      return {
        ...sites,
        camp: sites.camp || null,
        refuge: sites.refuge || null,
        base: sites.base || null,
        workbench: sites.workbench || null
      };
    }

    obsoleteConstructionSite(mission) {
      if (!mission?.constructionMission || !mission?.id) return null;
      const kind = lower(mission.constructionKind);
      const mapId = String(this.missionTargetMapId(mission) || "");
      if (!mapId) return null;
      const blockingKinds = {
        camp: ["camp", "refuge", "base"],
        refuge: ["refuge", "base"],
        workbench: ["workbench"]
      }[kind] || [];
      if (!blockingKinds.length) return null;

      const sites = this.siteBucket(mapId);
      for (const blockingKind of blockingKinds) {
        const site = sites?.[blockingKind] || null;
        if (!site) continue;
        const siteMissionId = String(site.missionId || "").trim();
        // Une donnée legacy sans mission propriétaire ne suffit pas pour
        // invalider destructivement une construction dynamique.
        if (!siteMissionId || siteMissionId === String(mission.id)) continue;
        return { mapId, kind, blockingKind, site, siteMissionId };
      }
      return null;
    }

    reconcileObsoleteConstructionMissions(options = {}) {
      const manager = this.manager();
      if (!manager?.memory || !manager?.trees) return 0;
      const mapFilter = String(options.mapId || "");
      let changed = 0;

      for (const mission of this.dynamicMissions.values()) {
        if (!mission?.constructionMission) continue;
        const lifecycle = manager.memory.state?.missionLifecycle?.[mission.id];
        if (lifecycle?.status !== "active") continue;
        const targetMapId = String(this.missionTargetMapId(mission) || "");
        if (mapFilter && targetMapId !== mapFilter) continue;
        const obsolete = this.obsoleteConstructionSite(mission);
        if (!obsolete || !manager.trees.get?.(mission.id)) continue;

        const reason =
          `Construction dynamique devenue redondante : ${obsolete.blockingKind} déjà établi sur ${obsolete.mapId}.`;
        if (manager.failMission?.(mission.id, reason) !== true) continue;

        // failMission possède le lifecycle ; BibleRuntime ne nettoie que ses
        // caches de consommation/affichage et resynchronise la sélection
        // persistée du manager. La définition dynamique est conservée.
        this.pendingConstructionResourceMissions.delete(mission.id);
        this.constructionResourceSignatures.delete(mission.id);
        manager.syncMissionSelection?.();
        manager.memory.save?.();
        changed += 1;
      }
      return changed;
    }

    scheduleObsoleteConstructionReconciliation() {
      const delays = [0, 80, 220, 500, 900, 1600, 2800];
      let reconciled = false;
      delays.forEach((delay) => {
        global.setTimeout?.(() => {
          if (reconciled) return;
          const manager = this.manager();
          if (!manager?.memory || !manager?.trees) return;
          const activeConstructionIds = [...this.dynamicMissions.values()]
            .filter((mission) =>
              mission?.constructionMission &&
              manager.memory.state?.missionLifecycle?.[mission.id]?.status === "active"
            )
            .map((mission) => mission.id);
          if (activeConstructionIds.some((missionId) => !manager.trees.get?.(missionId))) return;
          reconciled = true;
          this.reconcileObsoleteConstructionMissions();
        }, delay);
      });
      return true;
    }

    canAccessWorkbench(mapId = BF.currentEngine?.currentMapId) {
      const targetMapId = String(mapId || "");
      if (!targetMapId || String(BF.currentEngine?.currentMapId || "") !== targetMapId) return false;
      if (!this.siteBucket(targetMapId)?.workbench) return false;
      const anchor = this.microSceneProximityAnchor("MSC-CUSTOM-ETABLI-VIDE");
      const player = BF.currentEngine?.character?.root?.position;
      if (!anchor || !player) return false;
      const point = this.observationPoint(anchor, BF.currentEngine);
      return Math.hypot(
        Number(player.x) - Number(point.x),
        Number(player.z) - Number(point.z)
      ) <= 8;
    }

    constructionAvailability(kind, mapId = BF.currentEngine?.currentMapId) {
      const normalizedKind = lower(kind);
      const targetMapId = String(mapId || "");
      const rewardId = normalizedKind === "camp"
        ? "camp-establish-v1"
        : normalizedKind === "refuge"
          ? "refuge-build-v1"
          : normalizedKind === "workbench"
            ? "workbench-build-v1"
            : null;
      const missionId = this.constructionMissionId(normalizedKind, targetMapId);
      const lifecycle = this.missionLifecycle(missionId);
      const sites = this.siteBucket(targetMapId);
      const unlocked = Boolean(rewardId && this.isResearchRewardUnlocked(rewardId));
      let allowed = unlocked && Boolean(targetMapId) && !lifecycle.active && !lifecycle.completed;
      let reason = "Disponible sur cette map.";

      if (!unlocked) {
        allowed = false;
        reason = "Plan non débloqué.";
      } else if (lifecycle.active) {
        allowed = false;
        reason = "Construction déjà suivie dans les missions actives.";
      } else if (normalizedKind === "camp" && (sites.camp || sites.refuge || sites.base)) {
        allowed = false;
        reason = "Une infrastructure est déjà implantée sur cette map.";
      } else if (normalizedKind === "refuge" && !sites.camp) {
        allowed = false;
        reason = "Un camp doit d'abord être établi sur cette map.";
      } else if (normalizedKind === "refuge" && (sites.refuge || sites.base)) {
        allowed = false;
        reason = "Un refuge ou une base existe déjà sur cette map.";
      } else if (normalizedKind === "workbench" && targetMapId !== "crystal") {
        allowed = false;
        reason = "Le premier établi ne peut être installé que sur Crystal.";
      } else if (normalizedKind === "workbench" && !sites.base) {
        allowed = false;
        reason = "La Base renforcée doit être installée avant l'établi.";
      } else if (normalizedKind === "workbench" && sites.workbench) {
        allowed = false;
        reason = "Un établi est déjà implanté sur Crystal.";
      }

      return {
        kind: normalizedKind,
        mapId: targetMapId,
        missionId,
        rewardId,
        unlocked,
        active: lifecycle.active,
        completed: lifecycle.completed,
        allowed,
        reason,
        sites
      };
    }

    startConstruction(kind, options = {}) {
      const targetMapId = String(options.mapId || BF.currentEngine?.currentMapId || "");
      const source = options.source === "autonomy" ? "autonomy" : "player";
      const availability = this.constructionAvailability(kind, targetMapId);
      if (!availability.allowed) return false;
      const mission = this.buildConstructionMission(kind, targetMapId, source);
      if (!mission || !this.registerDynamicMission(mission)) return false;
      this.state.constructionInstances[mission.id] = {
        missionId: mission.id,
        kind: mission.constructionKind,
        mapId: targetMapId,
        source,
        createdAt: Date.now()
      };
      this.saveState();
      const activated = this.activateMission(mission, {
        type: source === "autonomy" ? "autonomy.construction" : "research.blueprint",
        mapId: targetMapId,
        subject: mission.constructionKind
      });
      if (!activated) return false;
      this.applyActivationInventoryCredits(mission);
      global.dispatchEvent?.(new CustomEvent("bluefox:construction-mission-started", {
        detail: { missionId: mission.id, kind: mission.constructionKind, mapId: targetMapId, source }
      }));
      return mission.id;
    }

    validate() {
      if (!BF.BibleContractV01?.validateCatalog) {
        return {
          ok: false,
          errors: ["BibleContractV01 indisponible."],
          warnings: []
        };
      }

      return BF.BibleContractV01.validateCatalog(
        this.catalog,
        this.patterns,
        { compatibility: "strict" }
      );
    }

    compileMission(mission) {
      const pattern = this.patterns[mission?.pattern];
      if (!mission || !pattern) return null;

      const psychology = {
        ponderation: mission.ponderation ?? null,
        obsessionEligible: mission.obsessionEligible === true,
        obsessionIntensity: mission.obsessionIntensity ?? null,
        souvenir: mission.souvenir === true,
        memoryValence: mission.memoryValence ?? null,
        scoreTrauma: mission.scoreTrauma ?? null,
        narrativeAxis: mission.narrativeAxis ?? null,
        reinforcesNarrativeAxis: mission.reinforcesNarrativeAxis
          ? clone(mission.reinforcesNarrativeAxis)
          : null
      };

      if (mission.pattern === "SEQUENCE_ACTIONS") {
        const steps = asArray(mission.sequence)
          .filter((step) => step && typeof step === "object");
        if (steps.length < (mission.constructionMission === true ? 1 : 2)) return null;

        const nodeIds = steps.map((step, index) =>
          `${mission.id}:${step.slot || `step${index + 1}`}`
        );

        const children = steps.map((step, index) => {
          const slot = step.slot || `step${index + 1}`;
          const requires = step.requires != null
            ? asArray(step.requires)
                .map((required) => {
                  const requiredIndex = steps.findIndex(
                    (candidate, candidateIndex) =>
                      (
                        candidate.slot ||
                        `step${candidateIndex + 1}`
                      ) === required
                  );
                  return requiredIndex >= 0
                    ? nodeIds[requiredIndex]
                    : null;
                })
                .filter(Boolean)
            : index > 0
              ? [nodeIds[index - 1]]
              : [];

          return {
            id: nodeIds[index],
            title: step.title || slot,
            description: step.description || "",
            type:
              Missions.normalizeActionType?.(step.action) ||
              String(step.action || "").trim().toLowerCase(),
            target: Math.max(1, Number(step.target) || 1),
            params: {
              ...(step.params || {}),
              bibleMissionId: mission.id,
              biblePattern: mission.pattern,
              sequenceIndex: index,
              sequenceSlot: slot,
              sameTarget:
                mission.sameTarget === true ||
                step.sameTarget === true
            },
            requires,
            optional: step.optional === true
          };
        });

        return {
          id: mission.id,
          title: mission.title,
          description: mission.description || "",
          instanceScope: mission.instanceScope || null,
          localVisibility: mission.localVisibility || null,
          backgroundHud: mission.backgroundHud === true,
          targetMapId: mission.targetMapId || null,
          narrativeOnly:
            mission.narrativeOnly === true || mission.pattern === "NARRATIVE_ONLY",
          repeatable: mission.repeatable === true,
          priority: Number(mission.priority) || 0,
          passivePriorityAxis:
            mission.passivePriorityAxis ||
            pattern.autonomyAxis ||
            null,
          ...psychology,
          journalIntro: mission.narrative?.revealed?.[0] || "",
          navigation: mission.navigation ? clone(mission.navigation) : null,
          returnPolicy: mission.returnPolicy ? clone(mission.returnPolicy) : null,
          allowsAutonomousRationCraft:
            mission.allowsAutonomousRationCraft === true,
          runtimeCounters: Array.isArray(mission.runtimeCounters)
            ? clone(mission.runtimeCounters)
            : null,
          worldEventRequirements: Array.isArray(mission.worldEventRequirements)
            ? clone(mission.worldEventRequirements)
            : null,
          relationPrerequisites: Array.isArray(mission.relationPrerequisites)
            ? clone(mission.relationPrerequisites)
            : null,
          experimentalPrerequisites: Array.isArray(mission.experimentalPrerequisites)
            ? clone(mission.experimentalPrerequisites)
            : null,
          sequence: Array.isArray(mission.sequence)
            ? clone(mission.sequence)
            : null,
          bible: {
            version: VERSION,
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
      }

      const nodeIds = Object.fromEntries(
        (pattern.steps || []).map((step) => [
          step.slot,
          `${mission.id}:${step.slot}`
        ])
      );

      const children = [];
      (pattern.steps || []).forEach((step) => {
        const specific = mission.slots?.[step.slot] || {};
        const requirements =
          mission.pattern === "COLLECT_THEN_REWARD" &&
          step.slot === "collect" &&
          Array.isArray(specific.requirements) &&
          specific.requirements.length
            ? specific.requirements
            : null;

        if (requirements) {
          requirements.forEach((requirement, index) => {
            children.push({
              id: `${mission.id}:${step.slot}:${index + 1}`,
              title:
                requirement.title ||
                specific.title ||
                `${step.slot} ${index + 1}`,
              description:
                requirement.description ||
                specific.description ||
                "",
              type: step.action,
              target: Math.max(1, Number(requirement.target) || 1),
              params: {
                ...(specific.params || {}),
                ...(requirement.params || {}),
                bibleMissionId: mission.id,
                biblePattern: mission.pattern,
                bibleRequirementIndex: index,
                catalogManaged:
                  requirement.params?.historicalCollection === true ||
                  specific.params?.historicalCollection === true
              },
              requires: (step.requires || [])
                .map((slot) => nodeIds[slot])
                .filter(Boolean)
            });
          });
          return;
        }

        children.push({
          id: nodeIds[step.slot],
          title: specific.title || step.slot,
          description: specific.description || "",
          type: step.action,
          target: Math.max(1, Number(specific.target) || 1),
          params: {
            ...(specific.params || {}),
            catalogManaged: specific.params?.catalogManaged === true,
            bibleMissionId: mission.id,
            biblePattern: mission.pattern
          },
          requires: (step.requires || [])
            .map((slot) => nodeIds[slot])
            .filter(Boolean)
        });
      });

      return {
        id: mission.id,
        title: mission.title,
        description: mission.description || "",
        instanceScope: mission.instanceScope || null,
        localVisibility: mission.localVisibility || null,
        backgroundHud: mission.backgroundHud === true,
        targetMapId: mission.targetMapId || null,
        narrativeOnly:
          mission.narrativeOnly === true || mission.pattern === "NARRATIVE_ONLY",
        repeatable: mission.repeatable === true,
        priority: Number(mission.priority) || 0,
        passivePriorityAxis:
          mission.passivePriorityAxis ||
          pattern.autonomyAxis ||
          null,
        ...psychology,
        journalIntro: mission.narrative?.revealed?.[0] || "",
        navigation: mission.navigation ? clone(mission.navigation) : null,
        returnPolicy: mission.returnPolicy ? clone(mission.returnPolicy) : null,
        allowsAutonomousRationCraft:
          mission.allowsAutonomousRationCraft === true,
        runtimeCounters: Array.isArray(mission.runtimeCounters)
          ? clone(mission.runtimeCounters)
          : null,
        worldEventRequirements: Array.isArray(mission.worldEventRequirements)
          ? clone(mission.worldEventRequirements)
          : null,
        relationPrerequisites: Array.isArray(mission.relationPrerequisites)
          ? clone(mission.relationPrerequisites)
          : null,
        experimentalPrerequisites: Array.isArray(mission.experimentalPrerequisites)
          ? clone(mission.experimentalPrerequisites)
          : null,
        sequence: Array.isArray(mission.sequence)
          ? clone(mission.sequence)
          : null,
        bible: {
          version: VERSION,
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
    }

    registerDefinitions() {
      const report = this.validate();
      if (!report.ok) {
        console.error("[BlueFox] Bible Runtime V0.1 : contrat invalide.", report);
        return { ...report, registered: 0 };
      }

      const definitions = this.allMissions()
        .map((mission) => this.compileMission(mission))
        .filter(Boolean);

      const registered =
        typeof BF.registerMissionDefinitions === "function"
          ? BF.registerMissionDefinitions(definitions)
          : 0;

      return {
        ...report,
        registered: Number(registered) || definitions.length
      };
    }

    manager() {
      return BF.currentEngine?.missionManager || null;
    }

    observationMemoryKey() {
      return "observationCoverage:v1";
    }

    observationMemory() {
      const memory = this.manager()?.memory;
      const current = memory?.getFact?.(this.observationMemoryKey(), null);
      return current && typeof current === "object"
        ? current
        : {
            version: 1,
            maps: {},
            mapsReached50: [],
            mapsReached100: []
          };
    }

    observationPoint(object, engine = BF.currentEngine) {
      const anchor = object?.userData?.worldAnchor || object;
      if (!anchor) return { x: 0, y: 0, z: 0 };
      if (anchor.getWorldPosition && engine?.THREE?.Vector3) {
        const point = anchor.getWorldPosition(new engine.THREE.Vector3());
        return {
          x: Number(point.x) || 0,
          y: Number(point.y) || 0,
          z: Number(point.z) || 0
        };
      }
      const point = anchor.position || object?.position || {};
      return {
        x: Number(point.x) || 0,
        y: Number(point.y) || 0,
        z: Number(point.z) || 0
      };
    }

    observationCoordinate(value) {
      return (Math.round((Number(value) || 0) * 1000) / 1000)
        .toFixed(3);
    }

    observationObjectKey(mapId, object, engine = BF.currentEngine) {
      const anchor = object?.userData?.worldAnchor || object;
      const data = object?.userData || {};
      const rootData = anchor?.userData || {};
      const definition =
        data.functional ||
        rootData.functional ||
        BF.ObjectLibrary?.getById?.(data.catalogId || rootData.catalogId) ||
        BF.ObjectLibrary?.get?.(data.libraryType || rootData.libraryType) ||
        null;
      const catalogId = String(
        data.catalogId ||
        rootData.catalogId ||
        definition?.id ||
        data.libraryType ||
        rootData.libraryType ||
        "object"
      );
      const variant = Number(
        data.variant ?? rootData.variant ?? 0
      ) || 0;
      const point = this.observationPoint(object, engine);
      return `${mapId}:obj:${catalogId}:${variant}:` +
        `${this.observationCoordinate(point.x)}:` +
        `${this.observationCoordinate(point.y)}:` +
        `${this.observationCoordinate(point.z)}`;
    }

    observationMicroSceneKey(mapId, entry, engine = BF.currentEngine) {
      const records = Array.isArray(entry?.records) ? entry.records : [];
      const anchor = entry?.instanceRoot || records[0]?.root || null;
      const point = anchor
        ? this.observationPoint(anchor, engine)
        : { x: 0, y: 0, z: 0 };
      return `${mapId}:msc:${String(entry?.id || "unknown")}:` +
        `${this.observationCoordinate(point.x)}:` +
        `${this.observationCoordinate(point.y)}:` +
        `${this.observationCoordinate(point.z)}`;
    }

    isObservationCandidate(object) {
      // Le dénominateur représente le peuplement initial, pas seulement les
      // objets encore actifs au premier événement d'étude. Un objet déjà
      // collecté reste donc comptable s'il faisait partie des interactables.
      if (!object) return false;
      const anchor = object.userData?.worldAnchor || object;
      const data = object.userData || {};
      const rootData = anchor?.userData || {};
      const definition =
        data.functional ||
        rootData.functional ||
        BF.ObjectLibrary?.getById?.(data.catalogId || rootData.catalogId) ||
        BF.ObjectLibrary?.get?.(data.libraryType || rootData.libraryType) ||
        null;
      const actions = new Set(
        asArray(
          definition?.interaction?.actions ||
          data.interaction?.actions ||
          rootData.interaction?.actions
        ).map(lower)
      );
      return ["observe", "inspect", "analyze"].some((action) =>
        actions.has(action)
      );
    }

    environmentDefinition(objectId) {
      const id = String(objectId || "");
      if (!id) return null;
      return BF.ObjectLibrary?.getById?.(id) ||
        BF.ObjectLibrary?.get?.(id) ||
        BF.ObjectLibrary?.list?.({ status: "active" })?.find?.((definition) =>
          String(definition?.id || "") === id ||
          String(definition?.type || "") === id
        ) || null;
    }

    environmentMetadata(definition = {}) {
      const actions = new Set(asArray(definition?.interaction?.actions).map(lower));
      const tags = new Set([
        ...asArray(definition?.spawn?.tags),
        ...asArray(definition?.situation?.tags)
      ].map(lower));
      const type = lower(definition?.type);
      const category = lower(definition?.category);
      const family = lower(definition?.knowledge?.family || definition?.family || category);
      const subject = lower(definition?.semantic?.subject || family || category || type);
      const collectable =
        definition?.gameplay?.collectable === true ||
        actions.has("collect") || actions.has("extract") ||
        Boolean(definition?.resource?.inventoryKey) ||
        lower(definition?.resource?.exploitability) === "extractable";
      const observable = ["observe", "inspect", "analyze"].some((action) => actions.has(action));
      return { actions, tags, type, category, family, subject, collectable, observable };
    }

    environmentFamilyMatches(familyName, definition) {
      if (!definition) return false;
      const familyKey = String(familyName || "").toUpperCase();
      const metadata = this.environmentMetadata(definition);
      if (!metadata.observable) return false;

      if (familyKey === "RELIC") {
        if (["ancient-ruin", "relic", "ruin"].includes(metadata.family) ||
            ["ancient-ruin", "relic", "ruin"].includes(metadata.subject) ||
            metadata.category === "ruins" || metadata.tags.has("ruin")) {
          return true;
        }
        if (metadata.type === "stele" || metadata.tags.has("stele")) return true;
        const explicitAncientTrace =
          metadata.tags.has("ancient") ||
          metadata.tags.has("ancient-ruin") ||
          metadata.tags.has("relic") ||
          metadata.family === "ancient" ||
          metadata.subject === "ancient";
        return metadata.type === "arch" && explicitAncientTrace;
      }

      if (familyKey === "ROCK") {
        if (metadata.collectable) return false;
        return ["geology", "geological", "rock", "stone"].includes(metadata.family) ||
          ["geology", "geological", "rock", "stone"].includes(metadata.subject) ||
          ["rock", "stone", "boulder", "cliff"].includes(metadata.type) ||
          metadata.tags.has("rock") || metadata.tags.has("geology");
      }

      if (familyKey === "PLANT") {
        if (metadata.collectable) return false;
        return metadata.family === "flora" ||
          metadata.subject === "flora" ||
          metadata.category === "flora" ||
          ["plant", "tree", "fern", "vine", "liana", "liane"].includes(metadata.type) ||
          ["plant", "tree", "fern", "vine", "liana", "liane"].some((tag) => metadata.tags.has(tag));
      }
      return false;
    }

    environmentHistoricalCount(familyName) {
      const snapshot = BF.progression?.snapshot?.() || BF.progression?.state || {};
      const instances = snapshot?.discoveries?.instances || {};
      let total = 0;
      Object.entries(instances).forEach(([instanceId, record]) => {
        if (!instanceId) return;
        const definition = this.environmentDefinition(record?.objectId);
        if (this.environmentFamilyMatches(familyName, definition)) total += 1;
      });
      return total;
    }

    buildObservationResolver(engine = BF.currentEngine) {
      const map = engine?.currentMap;
      const mapId = engine?.currentMapId;
      if (!map || !mapId) return null;

      const cached = this.observationResolvers.get(map);
      if (cached?.mapId === mapId) return cached;

      const byInstance = new Map();
      const observable = new Set();
      const envEligible = { RELIC: new Set(), ROCK: new Set(), PLANT: new Set() };
      const initialMscInstances = Array.isArray(map.group?.userData?.microScenes)
        ? map.group.userData.microScenes
        : [];
      const initialMscMembers = new Map();

      initialMscInstances.forEach((entry) => {
        const key = this.observationMicroSceneKey(mapId, entry, engine);
        (entry.records || []).forEach((record) => {
          if (record?.instanceId) {
            initialMscMembers.set(String(record.instanceId), key);
          }
        });
      });

      (map.interactables || []).forEach((object) => {
        if (!this.isObservationCandidate(object)) return;
        const anchor = object.userData?.worldAnchor || object;
        const data = object.userData || {};
        const rootData = anchor?.userData || {};
        const instanceId = String(
          data.instanceId || rootData.instanceId || ""
        );
        if (!instanceId) return;

        const definition =
          data.functional ||
          rootData.functional ||
          BF.ObjectLibrary?.getById?.(data.catalogId || rootData.catalogId) ||
          BF.ObjectLibrary?.get?.(data.libraryType || rootData.libraryType) ||
          null;
        ["RELIC", "ROCK", "PLANT"].forEach((family) => {
          if (this.environmentFamilyMatches(family, definition)) {
            envEligible[family].add(instanceId);
          }
        });

        const initialMscKey = initialMscMembers.get(instanceId);
        if (initialMscKey) {
          byInstance.set(instanceId, initialMscKey);
          observable.add(initialMscKey);
          return;
        }

        const landmarkId = String(
          data.biomeLandmark || rootData.biomeLandmark || ""
        );
        if (landmarkId && BF.MicroScenes?.get?.(landmarkId)) {
          const landmarkKey = `${mapId}:msc:${landmarkId}:landmark`;
          byInstance.set(instanceId, landmarkKey);
          observable.add(landmarkKey);
          return;
        }

        if (data.microSceneId || rootData.microSceneId) return;

        const key = this.observationObjectKey(mapId, object, engine);
        byInstance.set(instanceId, key);
        observable.add(key);
      });

      const resolver = {
        mapId,
        byInstance,
        observable: [...observable],
        envEligible: Object.fromEntries(
          Object.entries(envEligible).map(([family, ids]) => [family, [...ids]])
        )
      };
      this.observationResolvers.set(map, resolver);
      return resolver;
    }

    environmentFamilyCoverageSeed(mapId, resolver) {
      const discoveredInstances = BF.progression?.snapshot?.()?.discoveries?.instances ||
        BF.progression?.state?.discoveries?.instances || {};
      return Object.fromEntries(
        ["RELIC", "ROCK", "PLANT"].map((family) => {
          const eligibleInstanceIds = [...(resolver?.envEligible?.[family] || [])];
          const eligible = new Set(eligibleInstanceIds);
          const observedInstanceIds = Object.entries(discoveredInstances)
            .filter(([instanceId, record]) =>
              eligible.has(String(instanceId)) && String(record?.mapId || "") === String(mapId)
            )
            .map(([instanceId]) => String(instanceId));
          return [family, { eligibleInstanceIds, observedInstanceIds }];
        })
      );
    }

    captureObservationMap(engine = BF.currentEngine) {
      const manager = this.manager();
      const mapId = engine?.currentMapId;
      if (!manager?.memory || !mapId) return false;

      const coverage = this.observationMemory();
      const resolver = this.buildObservationResolver(engine);
      if (coverage.maps?.[mapId]?.frozen === true) {
        if (!resolver) return false;
        const current = coverage.maps[mapId];
        const hasEnvCoverage = current?.envFamilies &&
          ["RELIC", "ROCK", "PLANT"].every((family) => current.envFamilies[family]);
        if (hasEnvCoverage) return false;
        const next = clone(coverage);
        next.maps[mapId].envFamilies = this.environmentFamilyCoverageSeed(mapId, resolver);
        manager.memory.setFact(this.observationMemoryKey(), next);
        return true;
      }


      if (!resolver) return false;
      const next = clone(coverage);
      next.maps = next.maps || {};
      next.mapsReached50 = asArray(next.mapsReached50);
      next.mapsReached100 = asArray(next.mapsReached100);
      next.maps[mapId] = {
        mapId,
        observableEntityIds: [...resolver.observable],
        observedEntityIds: [],
        envFamilies: this.environmentFamilyCoverageSeed(mapId, resolver),
        frozen: true,
        frozenAt: Date.now(),
        seed: BF.maps?.[mapId]?.seed ?? null
      };
      manager.memory.setFact(this.observationMemoryKey(), next);

      global.dispatchEvent?.(
        new CustomEvent("bluefox:observation-coverage-changed", {
          detail: this.observationCoverage(mapId, next)
        })
      );
      return true;
    }

    observationCoverage(mapId = BF.currentEngine?.currentMapId, source = null) {
      const coverage = source || this.observationMemory();
      const entry = coverage.maps?.[mapId] || null;
      const total = entry?.observableEntityIds?.length || 0;
      const observed = entry?.observedEntityIds?.length || 0;
      const percent = total > 0
        ? Math.min(100, (observed / total) * 100)
        : 0;
      return {
        mapId: mapId || null,
        observed,
        total,
        percent,
        reached50: asArray(coverage.mapsReached50).includes(mapId),
        reached100: asArray(coverage.mapsReached100).includes(mapId),
        frozen: entry?.frozen === true
      };
    }

    environmentMapCoverage(mapId, familyName, source = null) {
      const coverage = source || this.observationMemory();
      const family = String(familyName || "").toUpperCase();
      const entry = coverage.maps?.[mapId] || null;
      const familyEntry = entry?.envFamilies?.[family] || null;
      if (!familyEntry) {
        return { mapId: mapId || null, family, known: false, observed: 0, total: 0, percent: 0 };
      }
      const eligible = new Set(asArray(familyEntry.eligibleInstanceIds));
      const observed = new Set(
        asArray(familyEntry.observedInstanceIds).filter((instanceId) => eligible.has(instanceId))
      );
      const total = eligible.size;
      return {
        mapId: mapId || null,
        family,
        known: true,
        observed: observed.size,
        total,
        percent: total === 0 ? 100 : Math.min(100, (observed.size / total) * 100)
      };
    }

    observationTotals(source = null) {
      const coverage = source || this.observationMemory();
      return {
        mapsObserved50Count: new Set(asArray(coverage.mapsReached50)).size,
        mapsObserved100Count: new Set(asArray(coverage.mapsReached100)).size
      };
    }

    recordObservation(rawEvent) {
      if (![
        "OBJECT_SEEN",
        "OBJECT_INSPECTED",
        "OBJECT_ANALYZED",
        "PHENOMENON_OBSERVED"
      ].includes(rawEvent?.type)) {
        return false;
      }

      const engine = BF.currentEngine;
      const manager = this.manager();
      const mapId = rawEvent?.mapId || engine?.currentMapId;
      if (!engine?.currentMap || !manager?.memory || !mapId) return false;
      if (String(engine.currentMapId || "") !== String(mapId)) return false;

      this.captureObservationMap(engine);
      const resolver = this.buildObservationResolver(engine);
      const instanceId = String(rawEvent?.instanceId || "");
      const entityId = instanceId
        ? resolver?.byInstance?.get(instanceId)
        : null;
      const environmentEligible = instanceId && ["RELIC", "ROCK", "PLANT"].some((family) =>
        asArray(resolver?.envEligible?.[family]).includes(instanceId)
      );
      if (!entityId && !environmentEligible) return false;

      const coverage = this.observationMemory();
      const mapCoverage = coverage.maps?.[mapId];
      if (!mapCoverage?.frozen) return false;
      if (entityId && !mapCoverage.observableEntityIds?.includes(entityId)) return false;

      const next = clone(coverage);
      const entry = next.maps[mapId];
      entry.observedEntityIds = asArray(entry.observedEntityIds);
      let changed = false;
      if (entityId && !entry.observedEntityIds.includes(entityId)) {
        entry.observedEntityIds.push(entityId);
        changed = true;

        const observed = entry.observedEntityIds.length;
        const total = entry.observableEntityIds.length;
        if (total > 0 && observed * 2 >= total) {
          const reached50 = new Set(asArray(next.mapsReached50));
          reached50.add(mapId);
          next.mapsReached50 = [...reached50];
        }
        if (total > 0 && observed >= total) {
          const reached100 = new Set(asArray(next.mapsReached100));
          reached100.add(mapId);
          next.mapsReached100 = [...reached100];
        }
      }

      const physicalInstanceId = String(rawEvent?.instanceId || "");
      if (physicalInstanceId) {
        ["RELIC", "ROCK", "PLANT"].forEach((family) => {
          const familyEntry = next.maps?.[mapId]?.envFamilies?.[family];
          if (!familyEntry) return;
          if (!asArray(familyEntry.eligibleInstanceIds).includes(physicalInstanceId)) return;
          familyEntry.observedInstanceIds = asArray(familyEntry.observedInstanceIds);
          if (!familyEntry.observedInstanceIds.includes(physicalInstanceId)) {
            familyEntry.observedInstanceIds.push(physicalInstanceId);
            changed = true;
          }
        });
      }

      if (!changed) return false;
      manager.memory.setFact(this.observationMemoryKey(), next);

      global.dispatchEvent?.(
        new CustomEvent("bluefox:observation-coverage-changed", {
          detail: {
            ...this.observationCoverage(mapId, next),
            ...this.observationTotals(next),
            entityId
          }
        })
      );
      return true;
    }

    foundationTutorialUnlocked() {
      return this.missionLifecycle("T13").completed === true;
    }

    foundationTutorialAllows(mission) {
      if (this.foundationTutorialUnlocked()) return true;
      const id = String(mission?.id || "");
      const baseId = id.split("@")[0];
      if (/^T(?:0[1-9]|1[0-3])$/.test(baseId)) return true;
      // Le Refuge est volontairement introduit au milieu du tutoriel par T03.
      if (baseId === "GAME-shelter") return true;

      const t09Started = ["active", "completed"].includes(this.missionLifecycle("T09").status);
      const t10Started = ["active", "completed"].includes(this.missionLifecycle("T10").status);
      // Exceptions historiques du tutoriel : exploration locale 15→60→100 et
      // FAU-02/03. FAU-01 reste volontairement hors de cette exception.
      if (["LOC-05", "LOC-06"].includes(baseId) && (t09Started || t10Started)) return true;
      if (["FAU-02", "FAU-03"].includes(baseId) && t09Started) return true;
      return false;
    }

    startMissionThroughBible(missionId, options = {}) {
      const manager = this.manager();
      if (!manager || !missionId) return false;
      const id = String(missionId);
      const mission =
        this.byId.get(id) ||
        this.dynamicMissions.get(id) ||
        { id };
      if (!this.foundationTutorialAllows(mission)) return false;
      return manager.startMission(id, options) === true;
    }

    missionLifecycle(missionId) {
      const manager = this.manager();
      const lifecycle =
        manager?.memory?.state?.missionLifecycle?.[missionId] || null;
      const tree = manager?.trees?.get?.(missionId) || null;
      const publicEntry = lifecycle
        ? null
        : ((Array.isArray(BF.missionState?.missions)
            ? BF.missionState.missions
            : BF.getMissionState?.()?.missions) || []).find((entry) =>
            (entry.missionId || entry.id) === missionId
          ) || null;

      const status =
        lifecycle?.status ||
        publicEntry?.lifecycleStatus ||
        publicEntry?.status ||
        null;

      return {
        status,
        lifecycle,
        tree,
        active:
          status === "active" ||
          status === "paused" ||
          manager?.activeMissionIds?.includes?.(missionId) === true,
        completed:
          status === "completed"
      };
    }

    normalizeObjectEvent(event) {
      const type = OBJECT_TYPE_TO_TRIGGER[event?.type];
      if (!type) return null;

      const definition =
        BF.ObjectLibrary?.getById?.(event?.objectId) ||
        BF.ObjectLibrary?.get?.(event?.detail?.kind) ||
        null;

      const tags = [...new Set([
        ...(event?.tags || []),
        ...(event?.detail?.tags || []),
        ...(definition?.spawn?.tags || []),
        ...(definition?.situation?.tags || [])
      ].map(lower).filter(Boolean))];

      const family = lower(
        event?.family ||
        event?.knowledgeFamily ||
        event?.detail?.family ||
        definition?.knowledge?.family
      );

      const category = lower(
        event?.category ||
        event?.detail?.category ||
        definition?.category
      );

      const subject = lower(
        // Sur le dépôt propre, une ressource peut avoir family="fiber"
        // tout en ayant knowledgeFamily="flora". La sémantique narrative
        // doit donc privilégier la famille de connaissance.
        definition?.semantic?.subject ||
        event?.knowledgeFamily ||
        definition?.knowledge?.family ||
        event?.subject ||
        event?.detail?.subject ||
        category ||
        family
      );

      const kind = lower(
        event?.inventoryKey ||
        event?.detail?.kind ||
        definition?.resource?.inventoryKey ||
        definition?.type ||
        event?.family ||
        event?.objectId
      );

      return {
        eventId: event.id || null,
        type,
        rawType: event.type,
        objectId: lower(event.objectId),
        cuoType: lower(event.detail?.cuoType || definition?.type),
        objectLabel:
          event.objectLabel ||
          event.displayName ||
          event.detail?.label ||
          definition?.label ||
          null,
        instanceId: event.instanceId || null,
        persistentMicroSceneId:
          event.persistentMicroSceneId ||
          event.detail?.persistentMicroSceneId ||
          null,
        kind,
        family,
        category,
        subject,
        tags,
        mapId: event.mapId ?? BF.currentEngine?.currentMapId ?? null,
        zoneId: event.zoneId ?? BF.currentEngine?.currentZoneIndex ?? null,
        amount: Math.max(
          1,
          Number(event.quantity ?? event.detail?.amount ?? 1) || 1
        )
      };
    }

    eventMatchesTrigger(trigger, event) {
      if (!trigger || !event || trigger.type !== event.type) return false;
      if (
        trigger.studyOnly === true &&
        !["interaction.observe", "interaction.inspect", "interaction.analyze"].includes(
          OBJECT_TYPE_TO_TRIGGER[event.rawType] || event.rawType
        )
      ) return false;

      const exactKeys = [
        "objectId", "kind", "family", "subject",
        "mapId", "zoneId", "direction", "fromMapId", "toMapId",
        "missionId", "milestoneId", "skillId", "biome"
      ];

      for (const key of exactKeys) {
        if (
          trigger[key] != null &&
          lower(trigger[key]) !== lower(event[key])
        ) {
          return false;
        }
      }

      const eventTags = new Set(asArray(event.tags).map(lower));

      if (
        trigger.tagsAny?.length &&
        !trigger.tagsAny.some((tag) => eventTags.has(lower(tag)))
      ) {
        return false;
      }

      if (
        trigger.tagsAll?.length &&
        !trigger.tagsAll.every((tag) => eventTags.has(lower(tag)))
      ) {
        return false;
      }

      if (trigger.featuredMicroSceneIdsAny?.length) {
        const featuredMicroSceneIds = new Set(
          asArray(event.featuredMicroSceneIds).map(String).filter(Boolean)
        );
        if (!trigger.featuredMicroSceneIdsAny.some((id) =>
          featuredMicroSceneIds.has(String(id))
        )) {
          return false;
        }
      }

      if (trigger.threshold != null) {
        const value = Number(
          event.surfacePercent ??
          event.thresholdValue ??
          event.percent ??
          0
        );
        if (value < Number(trigger.threshold)) return false;
      }

      return true;
    }

    triggerKey(mission) {
      return `${mission.id}:${mission.trigger?.type || "none"}`;
    }

    incrementTrigger(mission, event) {
      const trigger = mission.trigger;
      const key = this.triggerKey(mission);

      if (trigger.uniqueOnly) {
        const identity =
          event.instanceId ||
          event.toMapId ||
          `${event.mapId ?? ""}:${event.zoneId ?? ""}:${event.objectId ?? ""}`;

        const values = new Set(this.state.uniqueTriggerValues[key] || []);
        if (identity) values.add(String(identity));
        this.state.uniqueTriggerValues[key] = [...values];
        this.state.triggerCounts[key] = values.size;
      } else {
        this.state.triggerCounts[key] =
          (Number(this.state.triggerCounts[key]) || 0) +
          Math.max(1, Number(event.amount) || 1);
      }

      this.saveState();
      return Number(this.state.triggerCounts[key]) || 0;
    }

    siteDistanceGateSatisfied(mission, mapId = BF.currentEngine?.currentMapId) {
      const gate = mission?.siteDistanceGate;
      if (!gate) return true;
      const targetMapId = String(mapId || "");
      if (!targetMapId) return false;
      const topology = BF.currentEngine?.worldTopology;
      const target = topology?.coordinateOf?.(targetMapId);
      if (!target) return false;
      const kinds = new Set(asArray(gate.kinds || ["camp", "refuge", "base"]).map(lower));
      const minimumExclusive = Math.max(0, Number(gate.minimumExclusive) || 0);
      const siteProgression = this.manager()?.memory?.state?.siteProgression || {};
      let nearest = Infinity;
      Object.entries(siteProgression).forEach(([siteMapId, raw]) => {
        const sites = raw?.sites && typeof raw.sites === "object"
          ? raw.sites
          : { [raw?.kind]: raw };
        const hasRelevantSite = Object.entries(sites).some(([kind, site]) =>
          Boolean(site) && kinds.has(lower(kind))
        );
        if (!hasRelevantSite) return;
        const point = topology.coordinateOf?.(siteMapId);
        if (!point) return;
        const distance =
          Math.abs(Number(target.x) - Number(point.x)) +
          Math.abs(Number(target.y) - Number(point.y));
        if (Number.isFinite(distance)) nearest = Math.min(nearest, distance);
      });
      return nearest > minimumExclusive;
    }

    prerequisitesSatisfied(mission) {
      const missionPrerequisites = asArray(mission?.prerequisites).every((missionId) =>
        this.missionLifecycle(missionId).completed
      );
      if (!missionPrerequisites) return false;
      const experimentalPrerequisites = asArray(mission?.experimentalPrerequisites).every((knowledgeId) =>
        this.isResearchRewardUnlocked(knowledgeId)
      );
      if (!experimentalPrerequisites) return false;
      const controller = this.manager()?.catalogController;
      const relationPrerequisites = asArray(mission?.relationPrerequisites).every((requirement) => {
        const civilizationId = String(requirement?.civilizationId || "").trim().toLowerCase();
        if (!civilizationId) return true;
        const rank = String(controller?.getRelation?.(civilizationId)?.rank || "neutral").toLowerCase();
        const ranks = asArray(requirement?.ranks || ["friendly", "honored"])
          .map((value) => String(value || "").toLowerCase());
        return ranks.includes(rank);
      });
      if (!relationPrerequisites) return false;
      return this.missionFactRequirementsSatisfied(mission);
    }

    survivalCapabilityUnlocked(capability) {
      const key = String(capability || "").trim();
      if (!key) return false;
      return this.catalog.some((mission) =>
        asArray(mission?.tutorialSurvivalUnlocks).includes(key) &&
        this.missionLifecycle(mission.id).completed
      );
    }

    runtimeCounterValue(source, counter = {}) {
      if (source === "rations.craftedTotal") {
        return Math.max(
          0,
          Number(BF.getRationState?.().craftedTotal) || 0
        );
      }
      if (source === "observations.historical") {
        const requestedType = lower(counter.cuoType || counter.kind || counter.subject);
        if (!requestedType) return null;
        const definitions = BF.ObjectLibrary?.list?.({ status: "active" }) || BF.ObjectLibrary?.list?.() || [];
        const ids = new Set(definitions
          .filter((definition) => {
            const descriptors = [
              definition?.type,
              definition?.resource?.inventoryKey,
              definition?.knowledge?.family,
              definition?.semantic?.subject,
              definition?.category
            ].map(lower).filter(Boolean);
            return descriptors.includes(requestedType);
          })
          .map((definition) => String(definition?.id || ""))
          .filter(Boolean));
        const globalCounters = BF.getProgressionState?.().counters?.global || {};
        const eventType = String(BF.ObjectEvents?.types?.OBJECT_SEEN || "OBJECT_SEEN");
        let total = 0;
        ids.forEach((objectId) => {
          total += Math.max(0, Number(globalCounters[`${eventType}:object:${objectId}`]) || 0);
        });
        return total;
      }
      if (source === "observations.distinctFamiliesHistorical") {
        const globalCounters = BF.getProgressionState?.().counters?.global || {};
        const eventType = String(
          BF.ObjectEvents?.types?.PHENOMENON_OBSERVED || "PHENOMENON_OBSERVED"
        );
        const prefix = `${eventType}:`;
        const families = new Set();
        Object.entries(globalCounters).forEach(([key, amount]) => {
          if (!String(key).startsWith(prefix)) return;
          if (Math.max(0, Number(amount) || 0) <= 0) return;
          const family = String(key).slice(prefix.length).trim().toLowerCase();
          if (family && family !== "unknown") families.add(family);
        });
        return families.size;
      }
      return null;
    }

    runtimeCounterBaselineKey(missionId, slot) {
      return `runtimeCounterBaseline:${missionId}:${slot}`;
    }

    initializeRuntimeCounters(mission) {
      const manager = this.manager();
      if (!manager?.memory) return false;
      let changed = false;
      asArray(mission?.runtimeCounters).forEach((counter) => {
        if (!counter?.slot || !counter?.source) return;
        const key = this.runtimeCounterBaselineKey(mission.id, counter.slot);
        if (manager.memory.getFact?.(key, null) != null) return;
        const current = this.runtimeCounterValue(counter.source, counter);
        if (current == null) return;
        manager.memory.setFact?.(key, {
          source: counter.source,
          value: counter.baselineOnActivation === false ? 0 : current,
          capturedAt: Date.now()
        });
        changed = true;
      });
      if (changed) manager.memory.save?.();
      return changed;
    }

    reconcileRuntimeCounters(missionFilter = null) {
      const manager = this.manager();
      if (!manager?.memory) return 0;
      let changed = 0;
      this.catalog.forEach((mission) => {
        if (missionFilter && mission.id !== missionFilter) return;
        const counters = asArray(mission?.runtimeCounters);
        if (!counters.length) return;
        if (!this.missionLifecycle(mission.id).active) return;
        this.initializeRuntimeCounters(mission);
        const tree = manager.trees?.get?.(mission.id);
        if (!tree) return;
        let treeChanged = false;
        counters.forEach((counter) => {
          const node = tree.find?.(`${mission.id}:${counter.slot}`);
          if (!node || node.isComplete) return;
          const current = this.runtimeCounterValue(counter.source, counter);
          if (current == null) return;
          const baselineRecord = manager.memory.getFact?.(
            this.runtimeCounterBaselineKey(mission.id, counter.slot),
            { value: 0 }
          );
          const baseline = Math.max(0, Number(baselineRecord?.value) || 0);
          const value = Math.max(0, current - baseline);
          const absolute = Math.min(Number(node.target) || value, value);
          const delta = absolute - Number(node.progress || 0);
          if (delta > 0 && node.increment?.(delta)) {
            changed += 1;
            treeChanged = true;
          }
        });
        if (treeChanged) {
          tree.refresh?.();
          manager.memory.saveTree?.(tree);
        }
      });
      if (changed) {
        manager.syncLifecycleFromTrees?.();
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
        manager.publish?.();
      }
      return changed;
    }

    worldEventBaselineKey(missionId) {
      return `worldEventBaseline:${String(missionId || "")}`;
    }

    worldEventRequirementBaselineKey(missionId, slot) {
      return `worldEventRequirementBaseline:${String(missionId || "")}:${String(slot || "")}`;
    }

    ensureWorldEventRequirementBaseline(mission, requirement, tree, missionBaseline) {
      const requiredSlots = asArray(
        requirement?.sinceSlotsComplete ||
        requirement?.sinceSlotComplete ||
        requirement?.requiresSlotComplete
      ).map((slot) => String(slot || "").trim()).filter(Boolean);
      if (!requiredSlots.length) return missionBaseline;
      if (requiredSlots.some((slot) => !tree?.find?.(`${mission.id}:${slot}`)?.isComplete)) return null;
      const manager = this.manager();
      const key = this.worldEventRequirementBaselineKey(mission.id, requirement?.slot);
      const existing = manager?.memory?.getFact?.(key, null);
      if (existing && Number.isFinite(Number(existing.sequence))) return existing;
      const baseline = {
        sequence: Math.max(0, Number(BF.getWorldEventCursor?.()) || 0),
        at: Date.now(),
        afterSlots: requiredSlots.slice()
      };
      manager?.memory?.setFact?.(key, baseline);
      manager?.memory?.save?.();
      return baseline;
    }

    ensureWorldEventBaseline(mission) {
      const manager = this.manager();
      if (!manager?.memory || !mission?.id) return null;
      const key = this.worldEventBaselineKey(mission.id);
      const existing = manager.memory.getFact?.(key, null);
      if (existing && Number.isFinite(Number(existing.sequence))) return existing;
      const baseline = {
        sequence: Math.max(0, Number(BF.getWorldEventCursor?.()) || 0),
        at: Date.now()
      };
      manager.memory.setFact?.(key, baseline);
      manager.memory.save?.();
      return baseline;
    }

    applyWorldEventRelationEffect(mission, requirement) {
      const delta = Number(requirement?.relationScoreOnSatisfied) || 0;
      const civilizationId = String(
        requirement?.civilizationId || requirement?.criteria?.civilizationId || ""
      ).trim().toLowerCase();
      if (!delta || !civilizationId) return false;
      const manager = this.manager();
      const receiptKey = `worldEventRelationApplied:${mission.id}:${requirement.slot}:${civilizationId}`;
      if (manager?.memory?.getFact?.(receiptKey, false)) return false;
      const controller = manager?.catalogController;
      const previous = controller?.getRelation?.(civilizationId);
      if (!previous?.rank || typeof controller?.setRelation !== "function") return false;
      const updated = controller.setRelation(civilizationId, previous.rank, {
        score: Number(previous.score || 0) + delta
      });
      if (!updated) return false;
      manager.memory.setFact?.(receiptKey, {
        appliedAt: Date.now(),
        delta,
        score: updated.score
      });
      manager.memory.save?.();
      return true;
    }

    reconcileWorldEventRequirements() {
      if (this.worldEventReconciling || typeof BF.getHistoricalEventCount !== "function") return false;
      const manager = this.manager();
      if (!manager?.trees?.size) return false;
      this.worldEventReconciling = true;
      try {
        let changed = false;
        let treeChanged = false;
        for (const mission of this.allMissions()) {
          const requirements = asArray(mission?.worldEventRequirements);
          if (!requirements.length) continue;
          const lifecycle = manager.memory?.state?.missionLifecycle?.[mission.id];
          if (lifecycle?.status !== "active") continue;
          const tree = manager.trees.get(mission.id);
          if (!tree) continue;
          const missionBaseline = this.ensureWorldEventBaseline(mission);
          if (!missionBaseline) continue;
          let missionTreeChanged = false;
          for (const requirement of requirements) {
            const slot = String(requirement?.slot || "");
            const node = tree.find?.(`${mission.id}:${slot}`);
            if (!node) continue;
            const baseline = this.ensureWorldEventRequirementBaseline(
              mission, requirement, tree, missionBaseline
            );
            if (!baseline) continue;
            const target = Math.max(1, Number(requirement.target ?? node.target) || 1);
            const criteria = {
              ...(requirement.criteria || {}),
              distinctBy: requirement.distinctBy || requirement.criteria?.distinctBy || null,
              sinceSequence: Math.max(0, Number(baseline.sequence) || 0)
            };
            const count = Math.max(0, Number(BF.getHistoricalEventCount(criteria)) || 0);
            const desired = Math.min(target, count);
            const delta = desired - Math.max(0, Number(node.progress) || 0);
            if (
              delta > 0 &&
              !node.isComplete &&
              tree.availableLeaves?.().includes?.(node) &&
              node.increment?.(delta)
            ) {
              missionTreeChanged = true;
              changed = true;
            }
            if (desired >= target) {
              changed = this.applyWorldEventRelationEffect(mission, requirement) || changed;
            }
          }
          if (missionTreeChanged) {
            tree.refresh?.();
            manager.memory.saveTree?.(tree);
            treeChanged = true;
          }
        }
        if (treeChanged) {
          manager.syncLifecycleFromTrees?.();
          manager.reevaluatePendingActivations?.();
          manager.catalogController?.schedule?.();
          manager.publish?.();
        }
        return changed;
      } finally {
        this.worldEventReconciling = false;
      }
    }

    persistentWorldSceneMap(mapId) {
      const id = String(mapId || "");
      if (!id) return null;
      return BF.maps?.[id] ||
        (Array.isArray(global.BlueFoxCustomMaps)
          ? global.BlueFoxCustomMaps.find((entry) => String(entry?.id || "") === id)
          : null) ||
        null;
    }

    persistentWorldSceneRecord(definition, spec) {
      const instanceId = String(spec?.instanceId || "");
      const records = BF.PersistentMicroScenes?.list?.(definition) || [];
      if (instanceId) {
        return records.find((record) => String(record?.instanceId || "") === instanceId) || null;
      }
      return records.find((record) =>
        String(record?.missionId || "") === String(spec?.missionId || "") &&
        String(record?.microSceneId || "") === String(spec?.microSceneId || "")
      ) || null;
    }

    reconcilePersistentWorldScenes() {
      if (this.persistentWorldSceneReconciling || !BF.PersistentMicroScenes?.ensure) return false;
      const manager = this.manager();
      if (!manager?.memory) return false;
      this.persistentWorldSceneReconciling = true;
      try {
        let changed = false;
        for (const mission of this.allMissions()) {
          const specs = asArray(mission?.persistentWorldScenes);
          if (!specs.length || !this.missionLifecycle(mission.id).active) continue;
          const tree = manager.trees?.get?.(mission.id);
          if (!tree) continue;
          for (const rawSpec of specs) {
            const requiredSlots = asArray(rawSpec?.requiresSlotsComplete || rawSpec?.requiresSlotComplete)
              .map(String)
              .filter(Boolean);
            if (requiredSlots.some((slot) => !tree.find?.(`${mission.id}:${slot}`)?.isComplete)) continue;
            const requiredMapFact = String(rawSpec?.requiredMapFact || "").trim();
            const requiredMapField = String(rawSpec?.requiredMapField || "mapId").trim();
            const requiredMap = requiredMapFact
              ? manager.memory.getFact?.(requiredMapFact, null)
              : null;
            const targetMapId = String(
              rawSpec?.mapId ||
              requiredMap?.[requiredMapField] ||
              requiredMap?.mapId ||
              ""
            );
            const definition = this.persistentWorldSceneMap(targetMapId);
            if (!definition || !rawSpec?.microSceneId) continue;
            if (rawSpec.mapFact) {
              const factKey = String(rawSpec.mapFact);
              const existingMapFact = manager.memory.getFact?.(factKey, null);
              if (String(existingMapFact?.mapId || "") !== targetMapId) {
                manager.memory.setFact?.(factKey, {
                  mapId: targetMapId,
                  missionId: mission.id,
                  updatedAt: Date.now()
                });
                manager.memory.save?.();
                changed = true;
              }
            }
            const spec = {
              ...rawSpec,
              mapId: targetMapId,
              missionId: mission.id,
              persistent: rawSpec.persistent !== false,
              spawnOnce: rawSpec.spawnOnce !== false
            };
            const before = this.persistentWorldSceneRecord(definition, spec);
            if (!before && String(rawSpec?.placement?.mode || "") === "player") {
              const engine = BF.currentEngine;
              if (String(engine?.currentMapId || "") !== targetMapId) continue;
              const placementId = `persistent-world-scene:${mission.id}:${rawSpec.instanceId || rawSpec.microSceneId}`;
              this.beginMicroScenePlacement({
                id: placementId,
                missionId: mission.id,
                mapId: targetMapId,
                microSceneId: rawSpec.microSceneId,
                kind: rawSpec.kind || rawSpec.contextRole || "persistent-scene",
                label: rawSpec?.placement?.label || "structure",
                cancelMessage: rawSpec?.placement?.cancelMessage || "Placement annulé. La mission reste active.",
                onInstall: (placement) => {
                  const rotation = Array.isArray(placement?.rotation)
                    ? Number(placement.rotation[1]) || 0
                    : Number(placement?.rotation) || 0;
                  const placed = {
                    ...spec,
                    anchor: placement?.anchor ? clone(placement.anchor) : null,
                    rotation,
                    fixedAnchor: true
                  };
                  const spawned = BF.PersistentMicroScenes?.spawnRecord?.(
                    engine?.THREE,
                    engine?.currentMap,
                    definition,
                    placed
                  );
                  if (!spawned) return false;
                  BF.PersistentMicroScenes.ensure(definition, placed);
                  this.reconcilePersistentWorldScenes();
                  return true;
                }
              });
              continue;
            }
            const ensured = before || BF.PersistentMicroScenes.ensure(definition, spec);
            if (!before && ensured) changed = true;
            const record = this.persistentWorldSceneRecord(definition, spec) || ensured;
            if (!record?.resolvedAt || !rawSpec.progressSlotWhenResolved) continue;
            const progressSlot = String(rawSpec.progressSlotWhenResolved);
            const progressIdentity = String(rawSpec.instanceId || record.instanceId || rawSpec.microSceneId || "scene");
            const progressReceiptKey = `persistentWorldSceneProgress:${mission.id}:${progressSlot}:${progressIdentity}`;
            if (manager.memory.getFact?.(progressReceiptKey, false)) continue;
            const progressed = this.progressRuntimeValidationSlot(mission.id, progressSlot, 1);
            if (!progressed) continue;
            manager.memory.setFact?.(progressReceiptKey, {
              missionId: mission.id,
              slot: progressSlot,
              instanceId: progressIdentity,
              resolvedAt: record.resolvedAt,
              creditedAt: Date.now()
            });
            manager.memory.save?.();
            changed = true;
          }
        }
        return changed;
      } finally {
        this.persistentWorldSceneReconciling = false;
      }
    }

    civilizationTradeRequirementMatches(requirement, detail = {}) {
      const civilizationId = lower(detail.civilizationId);
      if (!civilizationId || civilizationId !== lower(requirement?.civilizationId)) return false;
      const offerKey = String(detail.offerKey || "");
      const allowedKeys = asArray(requirement?.offerKeysAny).map(String).filter(Boolean);
      if (allowedKeys.length && !allowedKeys.includes(offerKey)) return false;
      const offered = Math.max(0, Number(detail.offerQuantity) || 0);
      if (offered < Math.max(1, Number(requirement?.minimumOfferQuantity) || 1)) return false;
      return true;
    }

    onCivilizationTradeCompleted(detail = {}) {
      let changed = false;
      for (const mission of this.allMissions()) {
        if (!this.missionLifecycle(mission.id).active) continue;
        for (const requirement of asArray(mission?.civilizationTradeRequirements)) {
          if (!requirement?.slot || !this.civilizationTradeRequirementMatches(requirement, detail)) continue;
          changed = this.progressRuntimeValidationSlot(mission.id, String(requirement.slot), 1) || changed;
        }
      }
      return changed;
    }

    topologyLinkSlotsSatisfied(mission, spec, tree) {
      const requiredSlots = asArray(spec?.requiresSlotsComplete || spec?.requiresSlotComplete)
        .map((slot) => String(slot || "").trim())
        .filter(Boolean);
      return requiredSlots.every((slot) => tree?.find?.(`${mission.id}:${slot}`)?.isComplete);
    }

    reconcileWorldTopologyLinks() {
      const engine = BF.currentEngine;
      const topology = engine?.worldTopology;
      const manager = this.manager();
      if (!topology || !manager?.memory) return false;
      let changed = false;

      for (const mission of this.allMissions()) {
        const specs = asArray(mission?.worldTopologyLinks);
        if (!specs.length || !this.missionLifecycle(mission.id).active) continue;
        const tree = manager.trees?.get?.(mission.id);
        if (!tree) continue;

        for (const spec of specs) {
          if (!spec?.mapId || !this.topologyLinkSlotsSatisfied(mission, spec, tree)) continue;
          const targetMapId = String(spec.mapId);
          if (!BF.maps?.[targetMapId] && !this.persistentWorldSceneMap(targetMapId)) continue;
          const anchors = asArray(spec.anchorMapIds).map(String).filter(Boolean);
          const directions = asArray(spec.directions).map((value) => lower(value)).filter(Boolean);
          const existingReceipt = manager.memory.getFact?.(`worldTopologyLink:${mission.id}:${spec.id || targetMapId}`, null);

          let linked = false;
          let linkedAnchor = null;
          let linkedDirection = null;
          for (const anchorMapId of anchors) {
            const exits = BF.maps?.[anchorMapId]?.exits || {};
            for (const direction of directions) {
              if (String(exits?.[direction]?.targetMap || "") === targetMapId) {
                linked = true;
                linkedAnchor = anchorMapId;
                linkedDirection = direction;
                break;
              }
            }
            if (linked) break;
          }

          let topologyChanged = false;
          if (!linked) {
            const targetPoint = topology.coordinateOf?.(targetMapId) || null;
            outer: for (const anchorMapId of anchors) {
              const anchorPoint = topology.coordinateOf?.(anchorMapId);
              if (!anchorPoint) continue;
              for (const direction of directions) {
                const target = topology.targetFrom?.(anchorMapId, direction) || null;
                if (!target || !Number.isFinite(Number(target.x)) || !Number.isFinite(Number(target.y))) continue;
                const x = Number(target.x);
                const y = Number(target.y);
                const occupant = target.mapId || topology.mapAt?.(x, y) || null;
                if (occupant && String(occupant) !== targetMapId) continue;
                if (targetPoint && (Number(targetPoint.x) !== x || Number(targetPoint.y) !== y)) continue;
                if (!targetPoint && topology.place?.(targetMapId, x, y, `bible:${mission.id}`) !== true) continue;
                if (topology.setCanonicalLink?.(anchorMapId, direction, targetMapId) !== true) continue;
                linked = true;
                linkedAnchor = anchorMapId;
                linkedDirection = direction;
                topologyChanged = true;
                changed = true;
                break outer;
              }
            }
          }

          if (!linked) continue;
          if (topologyChanged) {
            if (typeof BF.WorldTopology?.reconcile === "function") {
              BF.WorldTopology.reconcile();
            } else {
              topology.reconcileGeneratedExits?.();
              topology.persist?.();
            }
          }
          const receiptKey = `worldTopologyLink:${mission.id}:${spec.id || targetMapId}`;
          if (!existingReceipt || existingReceipt.mapId !== targetMapId || existingReceipt.anchorMapId !== linkedAnchor || existingReceipt.direction !== linkedDirection) {
            manager.memory.setFact?.(receiptKey, {
              missionId: mission.id,
              mapId: targetMapId,
              anchorMapId: linkedAnchor,
              direction: linkedDirection,
              linkedAt: Date.now()
            });
            changed = true;
          }
          if (spec.mapFact) {
            const current = manager.memory.getFact?.(String(spec.mapFact), null);
            if (String(current?.mapId || "") !== targetMapId) {
              manager.memory.setFact?.(String(spec.mapFact), {
                mapId: targetMapId,
                anchorMapId: linkedAnchor,
                direction: linkedDirection,
                sourceMissionId: mission.id,
                linkedAt: Date.now()
              });
              changed = true;
            }
          }
          if (changed) manager.memory.save?.();
        }
      }
      return changed;
    }

    reconcileSlotInventoryGrantEffects() {
      const manager = this.manager();
      if (!manager?.memory) return false;
      let changed = false;
      for (const mission of this.allMissions()) {
        const effects = asArray(mission?.slotInventoryGrantEffects);
        if (!effects.length) continue;
        const lifecycle = this.missionLifecycle(mission.id);
        if (!lifecycle.active && !lifecycle.completed) continue;
        const tree = manager.trees?.get?.(mission.id);
        if (!tree) continue;
        for (const effect of effects) {
          const slot = String(effect?.slot || "");
          const inventoryKey = String(effect?.inventoryKey || "").trim();
          const fact = String(effect?.fact || "").trim();
          const quantity = Math.max(1, Number(effect?.quantity) || 1);
          if (!slot || !inventoryKey || !fact) continue;
          if (!tree.find?.(`${mission.id}:${slot}`)?.isComplete) continue;
          if (manager.memory.getFact?.(fact, null)) continue;
          const alreadyAvailable = Math.max(0, Number(BF.availableInventory?.([inventoryKey])) || 0);
          const granted = alreadyAvailable >= quantity
            ? quantity
            : BF.grantInventory?.(inventoryKey, quantity, {
                source: "bible-slot-inventory-grant",
                reason: `${mission.id}:${slot}`,
                missionId: mission.id,
                mapId: BF.currentEngine?.currentMapId || null
              }) || 0;
          if (granted !== quantity) continue;
          const baseValue = effect?.value && typeof effect.value === "object"
            ? clone(effect.value)
            : {};
          manager.memory.setFact?.(fact, {
            ...baseValue,
            inventoryKey,
            quantity,
            sourceMissionId: baseValue.sourceMissionId || mission.id,
            acquiredAt: Date.now()
          });
          changed = true;
        }
      }
      if (changed) manager.memory.save?.();
      return changed;
    }

    reconcileSlotFactEffects() {
      const manager = this.manager();
      if (!manager?.memory) return false;
      let changed = false;
      for (const mission of this.allMissions()) {
        const effects = asArray(mission?.slotFactEffects);
        if (!effects.length) continue;
        const lifecycle = this.missionLifecycle(mission.id);
        if (!lifecycle.active && !lifecycle.completed) continue;
        const tree = manager.trees?.get?.(mission.id);
        if (!tree) continue;
        for (const effect of effects) {
          const slot = String(effect?.slot || "");
          const fact = String(effect?.fact || "");
          if (!slot || !fact || !tree.find?.(`${mission.id}:${slot}`)?.isComplete) continue;
          if (manager.memory.getFact?.(fact, null)) continue;
          const baseValue = effect?.value && typeof effect.value === "object"
            ? clone(effect.value)
            : { value: effect?.value ?? true };
          manager.memory.setFact?.(fact, {
            ...baseValue,
            sourceMissionId: baseValue.sourceMissionId || mission.id,
            acquiredAt: Date.now()
          });
          changed = true;
        }
      }
      if (changed) manager.memory.save?.();
      return changed;
    }

    missionProgressValidationKey(missionId, slot) {
      return `missionProgressValidation:${String(missionId || "")}:${String(slot || "")}`;
    }

    missionProgressValue(manager, missionId) {
      const tree = manager?.trees?.get?.(missionId);
      if (!tree) return null;
      if (typeof manager.treeProgress === "function") {
        const value = Number(manager.treeProgress(tree));
        return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;
      }
      return tree.root?.isComplete === true ? 1 : null;
    }

    reconcileMissionProgressValidations() {
      const manager = this.manager();
      if (!manager?.memory) return false;
      let changed = false;

      for (const mission of this.allMissions()) {
        const validation = mission?.runtimeValidation;
        if (validation?.type !== "mission-progress-after-slot") continue;
        if (!this.missionLifecycle(mission.id).active) continue;

        const slot = String(validation.slot || "").trim();
        const afterSlot = String(validation.afterSlot || "").trim();
        const tree = manager.trees?.get?.(mission.id);
        const proofNode = tree?.find?.(`${mission.id}:${slot}`);
        const afterNode = tree?.find?.(`${mission.id}:${afterSlot}`);
        if (!slot || !afterSlot || !proofNode || proofNode.isComplete || !afterNode) continue;

        const key = this.missionProgressValidationKey(mission.id, slot);
        let proof = manager.memory.getFact?.(key, null);
        if (!proof) {
          const excluded = new Set([
            mission.id,
            ...asArray(validation.excludeMissionIds).map(String).filter(Boolean)
          ]);
          const candidateMissionIds = asArray(manager.activeMissionIds)
            .map(String)
            .filter((id, index, values) =>
              id &&
              values.indexOf(id) === index &&
              !excluded.has(id) &&
              manager.memory?.state?.missionLifecycle?.[id]?.status === "active" &&
              manager.trees?.get?.(id)
            );
          proof = {
            candidateMissionIds,
            capturedAt: Date.now(),
            armedAt: 0,
            baseline: null
          };
          manager.memory.setFact?.(key, proof);
          manager.memory.save?.();
          changed = true;
        }

        if (!afterNode.isComplete) continue;

        if (!proof.armedAt || !proof.baseline || typeof proof.baseline !== "object") {
          const baseline = {};
          asArray(proof.candidateMissionIds).forEach((missionId) => {
            const value = this.missionProgressValue(manager, missionId);
            if (value != null) baseline[missionId] = value;
          });
          proof = {
            ...proof,
            baseline,
            armedAt: Date.now()
          };
          manager.memory.setFact?.(key, proof);
          manager.memory.save?.();
          changed = true;
          // Le même cycle qui arme la preuve ne peut jamais la satisfaire :
          // seule une progression réellement postérieure au transfert compte.
          continue;
        }

        const progressedMissionId = asArray(proof.candidateMissionIds).find((missionId) => {
          if (!Object.prototype.hasOwnProperty.call(proof.baseline, missionId)) return false;
          const current = this.missionProgressValue(manager, missionId);
          const baseline = Number(proof.baseline[missionId]);
          return current != null && Number.isFinite(baseline) && current > baseline + 1e-9;
        });
        if (!progressedMissionId) continue;

        if (!this.progressRuntimeValidationSlot(mission.id, slot, 1)) continue;
        manager.memory.setFact?.(key, {
          ...proof,
          completedAt: Date.now(),
          completedByMissionId: progressedMissionId
        });
        manager.memory.save?.();
        changed = true;
      }
      return changed;
    }

    progressRuntimeValidationSlot(missionId, slot, amount = 1) {
      const manager = this.manager();
      const tree = manager?.trees?.get?.(missionId);
      const node = tree?.find?.(`${missionId}:${slot}`);
      if (!node || node.isComplete) return false;
      if (!tree.availableLeaves?.().includes?.(node)) return false;
      if (!node.increment?.(Math.max(1, Number(amount) || 1))) return false;
      tree.refresh?.();
      manager.memory?.saveTree?.(tree);
      manager.syncLifecycleFromTrees?.();
      manager.reevaluatePendingActivations?.();
      manager.catalogController?.schedule?.();
      manager.publish?.();
      return true;
    }

    handleFinalCoreIntegration(event = {}) {
      if (String(event.type || "") !== "interaction.analyze") return false;
      const manager = this.manager();
      if (!manager?.memory) return false;
      for (const mission of this.allMissions()) {
        const validation = mission?.runtimeValidation || {};
        if (validation.type !== "final-departure" || !this.missionLifecycle(mission.id).active) continue;
        const mapId = String(validation.mapId || "crystal");
        if (String(event.mapId || BF.currentEngine?.currentMapId || "") !== mapId) continue;
        if (String(event.cuoType || event.kind || "") !== "crash_capsule") continue;
        const integrationSlot = String(validation.integrationSlot || "").trim();
        const inventoryKey = String(validation.integrationInventoryKey || "").trim();
        const quantity = Math.max(1, Number(validation.integrationQuantity) || 1);
        const integrationFact = String(validation.integrationFact || validation.requiredFact || "").trim();
        const tree = manager.trees?.get?.(mission.id);
        const node = integrationSlot ? tree?.find?.(`${mission.id}:${integrationSlot}`) : null;
        if (!node || node.isComplete || !(tree?.availableLeaves?.() || []).includes(node)) continue;
        if (!inventoryKey || !integrationFact) return false;
        const transactionId = `${mission.id}:${integrationSlot}:${inventoryKey}:v1`;
        const removed = BF.consumeInventoryPoolOnce?.(transactionId, [inventoryKey], quantity) || 0;
        if (removed !== quantity) {
          BF.currentEngine?.callbacks?.onStatus?.("Le Noyau de navigation résonante doit être présent dans l’inventaire avant de pouvoir l’intégrer à la capsule.");
          return false;
        }
        if (!this.progressRuntimeValidationSlot(mission.id, integrationSlot, 1)) return false;
        manager.memory.setFact?.(integrationFact, {
          componentId: inventoryKey,
          inventoryKey,
          quantity,
          mapId,
          consumedByMissionId: mission.id,
          integratedAt: Date.now()
        });
        manager.memory.save?.();
        return true;
      }
      return false;
    }

    reconcileFinalDeparture() {
      const manager = this.manager();
      const engine = BF.currentEngine;
      if (!manager?.memory || !engine) return false;
      for (const mission of this.allMissions()) {
        const validation = mission?.runtimeValidation || {};
        if (validation.type !== "final-departure") continue;
        if (!this.missionLifecycle(mission.id).active) continue;
        const mapId = String(validation.mapId || "crystal");
        if (String(engine.currentMapId || "") !== mapId) continue;
        const requiredFact = String(validation.requiredFact || "").trim();
        if (requiredFact && !manager.memory.getFact?.(requiredFact, null)) continue;
        const tree = manager.trees?.get?.(mission.id);
        const integrationSlot = String(validation.integrationSlot || "").trim();
        const departureSlot = String(validation.slot || "").trim();
        const integrationNode = integrationSlot ? tree?.find?.(`${mission.id}:${integrationSlot}`) : null;
        const departureNode = departureSlot ? tree?.find?.(`${mission.id}:${departureSlot}`) : null;
        if (!departureNode || departureNode.isComplete) continue;
        if (integrationSlot && !integrationNode?.isComplete) continue;
        if (!(tree?.availableLeaves?.() || []).includes(departureNode)) continue;
        if (engine.isFinalCapsuleSequenceActive?.()) return true;
        return engine.beginFinalCapsuleSequence?.({ missionId: mission.id }) === true;
      }
      return false;
    }

    onFinalDepartureCompleted(detail = {}) {
      const missionId = String(detail?.missionId || "FIN-02");
      const mission = this.byId.get(missionId);
      const validation = mission?.runtimeValidation || {};
      if (validation.type !== "final-departure" || !this.missionLifecycle(missionId).active) {
        return false;
      }
      const slot = String(validation.slot || "depart");
      if (!this.progressRuntimeValidationSlot(missionId, slot, 1)) return false;
      const manager = this.manager();
      manager?.memory?.setFact?.("fin:departure-completed", {
        missionId,
        mapId: String(detail?.mapId || BF.currentEngine?.currentMapId || "crystal"),
        completedAt: Date.now()
      });
      manager?.memory?.save?.();
      return true;
    }

    missionChoiceState(missionId) {
      const id = String(missionId || "").trim();
      const mission = this.byId.get(id);
      const validation = mission?.runtimeValidation || {};
      if (!id || validation.type !== "mission-choice") return null;

      const manager = this.manager();
      const factKey = String(validation.fact || "").trim();
      const slot = String(validation.slot || "").trim();
      if (!manager?.memory || !factKey || !slot) return null;

      const stored = manager.memory.getFact?.(factKey, null);
      const tree = manager.trees?.get?.(id);
      const node = tree?.find?.(`${id}:${slot}`) || null;
      const availableLeaves = tree?.availableLeaves?.() || [];
      const resolvedChoiceId = String(stored?.choiceId || stored?.id || "").trim();
      const options = asArray(validation.options).map((option) => ({
        id: String(option?.id || ""),
        label: String(option?.label || option?.id || ""),
        text: String(option?.text || "")
      })).filter((option) => option.id && option.label);

      return {
        missionId: id,
        slot,
        fact: factKey,
        active: this.missionLifecycle(id).active,
        completed: this.missionLifecycle(id).completed,
        available: Boolean(
          this.missionLifecycle(id).active &&
          node &&
          !node.isComplete &&
          availableLeaves.includes(node) &&
          !resolvedChoiceId
        ),
        resolved: Boolean(resolvedChoiceId),
        choiceId: resolvedChoiceId || null,
        options
      };
    }

    submitMissionChoice(missionId, choiceId) {
      const state = this.missionChoiceState(missionId);
      if (!state?.available) return false;
      const selected = state.options.find((option) => option.id === String(choiceId || ""));
      if (!selected) return false;

      const manager = this.manager();
      manager.memory.setFact?.(state.fact, {
        missionId: state.missionId,
        choiceId: selected.id,
        label: selected.label,
        selectedAt: Date.now()
      });
      manager.memory.save?.();

      if (!this.progressRuntimeValidationSlot(state.missionId, state.slot, 1)) {
        manager.memory.setFact?.(state.fact, null);
        manager.memory.save?.();
        return false;
      }

      global.dispatchEvent?.(new CustomEvent("bluefox:mission-choice-completed", {
        detail: {
          missionId: state.missionId,
          choiceId: selected.id,
          fact: state.fact
        }
      }));
      return true;
    }

    onRationConsumed(detail = {}) {
      if (detail.automatic === true) return false;
      const energyBefore = Number(BF.getSurvivalState?.().energy);
      const mission = this.catalog.find((entry) =>
        this.missionLifecycle(entry.id).active &&
        entry?.runtimeValidation?.type === "manual-ration-energy-gain"
      );
      if (!mission || !Number.isFinite(energyBefore)) return false;
      const slot = mission.runtimeValidation.consumeSlot;
      if (!this.progressRuntimeValidationSlot(mission.id, slot, 1)) return false;
      this.pendingManualRationProof = {
        missionId: mission.id,
        energyBefore,
        consumedAt: Date.now()
      };
      return true;
    }

    onSurvivalChanged(detail = {}) {
      const proof = this.pendingManualRationProof;
      if (!proof) return false;
      if (String(detail.reason || "") !== "routine:food") return false;
      const mission = this.byId.get(proof.missionId);
      if (!mission || !this.missionLifecycle(mission.id).active) {
        this.pendingManualRationProof = null;
        return false;
      }
      const energyAfter = Number(
        detail?.state?.energy ?? BF.getSurvivalState?.().energy
      );
      const gained = Number.isFinite(energyAfter) &&
        energyAfter > Number(proof.energyBefore);
      this.pendingManualRationProof = null;
      if (!gained) return false;
      return this.progressRuntimeValidationSlot(
        mission.id,
        mission.runtimeValidation.gainSlot,
        1
      );
    }

    reserveFactState(context = {}) {
      const manager = this.manager();
      if (!manager?.memory || !context?.fact || !context?.reserve) return null;
      const existing = manager.memory.getFact?.(context.fact, null);
      if (existing?.reserveVersion === 1) return existing;
      const remaining = {};
      asArray(context.reserve.items).forEach((item) => {
        if (!item?.inventoryKey) return;
        remaining[String(item.inventoryKey)] = Math.max(0, Number(item.quantity) || 0);
      });
      const state = {
        reserveVersion: 1,
        missionId: context.missionId || null,
        microSceneId: context.microSceneId || null,
        mapId: BF.currentEngine?.currentMapId || null,
        remaining,
        exhausted: Object.values(remaining).every((value) => value <= 0),
        discoveredAt: Date.now(),
        updatedAt: Date.now()
      };
      manager.memory.setFact?.(context.fact, state);
      manager.memory.save?.();
      return state;
    }

    reserveRemainingTotal(state) {
      return Object.values(state?.remaining || {}).reduce((sum, amount) => sum + Math.max(0, Number(amount) || 0), 0);
    }

    withdrawPersistentReserve(mission, context) {
      const manager = this.manager();
      const tree = manager?.trees?.get?.(mission?.id);
      const node = tree?.find?.(`${mission.id}:${context.slot}`);
      if (!manager?.memory || !node || node.isComplete) return false;
      if (!tree.availableLeaves?.().includes?.(node)) return false;

      const state = this.reserveFactState({ ...context, missionId: mission.id });
      if (!state || state.exhausted) return false;
      const capacity = BF.getInventoryCapacityState?.() || {};
      let free = Math.max(0, (Number(capacity.capacity) || 0) - (Number(capacity.count) || 0));
      if (!free) {
        const now = Date.now();
        if (now - Math.max(0, Number(state.lastFullMessageAt) || 0) >= 15000) {
          state.lastFullMessageAt = now;
          state.updatedAt = now;
          manager.memory.setFact?.(context.fact, state);
          manager.memory.save?.();
          BF.currentEngine?.callbacks?.onAction?.(context.reserve.fullMessage || "Il reste des ressources utilisables, mais je ne peux pas en emporter plus. Je reviendrai plus tard.");
        }
        return false;
      }

      const activeKeys = Object.keys(state.remaining).filter((key) => Number(state.remaining[key]) > 0);
      let moved = 0;
      while (free > 0 && activeKeys.some((key) => Number(state.remaining[key]) > 0)) {
        const availableKeys = activeKeys.filter((key) => Number(state.remaining[key]) > 0);
        for (const key of availableKeys) {
          if (free <= 0) break;
          const remaining = Math.max(0, Number(state.remaining[key]) || 0);
          if (!remaining) continue;
          const share = Math.max(1, Math.ceil(free / availableKeys.length));
          const take = Math.min(remaining, share, free);
          const granted = BF.grantInventory?.(key, take, {
            source: "persistent-reserve",
            reason: context.fact,
            missionId: mission.id,
            mapId: BF.currentEngine?.currentMapId
          }) || 0;
          if (!granted) continue;
          state.remaining[key] = remaining - granted;
          free -= granted;
          moved += granted;
        }
      }
      if (!moved) return false;

      state.updatedAt = Date.now();
      state.exhausted = this.reserveRemainingTotal(state) <= 0;
      manager.memory.setFact?.(context.fact, state);
      manager.memory.save?.();
      this.progressRuntimeValidationSlot(mission.id, context.slot, moved);
      if (state.exhausted) {
        BF.currentEngine?.callbacks?.onAction?.(context.reserve.exhaustedMessage || "J’ai récupéré tout ce qui pouvait encore servir. Le reste est trop dégradé pour être exploitable.");
      } else {
        BF.currentEngine?.callbacks?.onAction?.(context.reserve.partialMessage || "Il reste des ressources utilisables ici. Je reviendrai quand mon sac aura de nouveau de la place.");
      }
      return true;
    }

    proximityContextEntries() {
      const manager = this.manager();
      if (!manager?.memory) return [];
      const entries = [];
      this.catalog.forEach((mission) => {
        const contexts = asArray(mission?.proximityContexts);
        if (!contexts.length) return;
        if (!this.missionLifecycle(mission.id).active) return;
        contexts.forEach((context) => {
          if ((!context?.microSceneId && !context?.cuoType) || !context?.fact) return;
          if (context.requiresSlotComplete) {
            const tree = manager.trees?.get?.(mission.id);
            const required = tree?.find?.(`${mission.id}:${context.requiresSlotComplete}`);
            if (!required?.isComplete) return;
          }
          if (context.selectionFact) {
            const selected = manager.memory.getFact?.(String(context.selectionFact), null);
            const field = String(context.selectionField || "value");
            if (String(selected?.[field] ?? selected ?? "") !== String(context.selectionValue ?? "")) return;
          }
          const existingFact = manager.memory.getFact?.(context.fact, false);
          if (!context.reserve && existingFact) return;
          if (context.reserve && existingFact?.exhausted === true) return;
          entries.push({ mission, context });
        });
      });
      return entries;
    }

    microSceneProximityAnchor(microSceneId) {
      const map = BF.currentEngine?.currentMap;
      const entries = Array.isArray(map?.group?.userData?.microScenes)
        ? map.group.userData.microScenes
        : [];
      const normalized = String(microSceneId || "");
      const entry = entries.find((item) => String(item?.id || "") === normalized);
      if (!entry) return null;
      return entry.instanceRoot || entry.records?.[0]?.root || null;
    }

    objectProximityAnchor(cuoType) {
      const engine = BF.currentEngine;
      const player = engine?.character?.root?.position;
      if (!engine?.currentMap || !player || !cuoType) return null;
      const expected = String(cuoType);
      const candidates = (engine.currentMap.interactables || []).filter((object) => {
        if (!object?.userData?.active) return false;
        const anchor = object.userData.worldAnchor || object;
        const definition =
          object.userData.functional ||
          anchor?.userData?.functional ||
          BF.ObjectLibrary?.getById?.(object.userData.catalogId || anchor?.userData?.catalogId) ||
          BF.ObjectLibrary?.get?.(object.userData.libraryType || anchor?.userData?.libraryType);
        return String(definition?.type || object.userData.libraryType || "") === expected;
      });
      return candidates.sort((left, right) => {
        const a = this.observationPoint(left, engine);
        const b = this.observationPoint(right, engine);
        return Math.hypot(player.x - a.x, player.z - a.z) -
          Math.hypot(player.x - b.x, player.z - b.z);
      })[0] || null;
    }


    knownMapForCuoType(cuoType) {
      const engine = BF.currentEngine;
      if (!engine?.discoveredMaps || !cuoType) return "";
      const expected = String(cuoType);
      const current = String(engine.currentMapId || "");
      const candidates = [...engine.discoveredMaps]
        .map(String)
        .filter((mapId) => mapId && mapId !== current)
        .filter((mapId) => {
          const definition = BF.maps?.[mapId];
          return asArray(definition?.generator?.requiredObjects).some((entry) =>
            String(entry?.type || entry?.cuoType || "") === expected
          );
        })
        .map((mapId) => ({
          mapId,
          route: engine.findKnownRoute?.(current, mapId)
        }))
        .filter((entry) => Array.isArray(entry.route) && entry.route.length > 1)
        .sort((left, right) => left.route.length - right.route.length);
      return candidates[0]?.mapId || "";
    }

    npcEncounterEntries() {
      return this.allMissions().flatMap((mission) => {
        if (!this.missionLifecycle(mission.id).active) return [];
        return asArray(mission?.npcEncounters)
          .filter((entry) => entry && entry.cuoType)
          .filter((entry) => {
            if (!entry.selectionFact) return true;
            const fact = this.manager()?.memory?.getFact?.(String(entry.selectionFact), null);
            const field = String(entry.selectionField || "value");
            return String(fact?.[field] ?? fact ?? "") === String(entry.selectionValue ?? "");
          })
          .map((entry) => ({ mission, entry }));
      });
    }

    npcEncounterFactKey(missionId, entry) {
      return String(entry.fact || `npcEncounter:${missionId}:${entry.id || entry.cuoType}`);
    }

    npcEncounterRoot(entry) {
      const roots = BF.NpcRuntime?.list?.(String(entry.cuoType || "")) || [];
      if (!roots.length) return null;
      const expectedMicroSceneId = String(entry.microSceneId || "");
      const candidates = expectedMicroSceneId
        ? roots.filter((root) =>
            String(
              root?.userData?.microSceneId ||
              root?.userData?.worldAnchor?.userData?.microSceneId ||
              ""
            ) === expectedMicroSceneId
          )
        : roots;
      if (!candidates.length) return null;
      const currentMapId = String(BF.currentEngine?.currentMapId || "");
      const exact = candidates.find((root) =>
        String(root?.userData?.bibleNpcEncounter || "") === String(entry.id || "")
      );
      if (exact) return exact;
      const unclaimed = candidates.find((root) =>
        !root?.userData?.bibleNpcEncounter &&
        (!root?.userData?.mapId || String(root.userData.mapId) === currentMapId)
      );
      const root = unclaimed || candidates[candidates.length - 1] || null;
      if (root && entry.id) root.userData.bibleNpcEncounter = String(entry.id);
      return root;
    }

    despawnNpcEncounter(root, mission, entry, reason = "mission-rule") {
      if (!root) return false;
      const manager = this.manager();
      const factKey = this.npcEncounterFactKey(mission.id, entry);
      const previous = manager?.memory?.getFact?.(factKey, {}) || {};
      BF.NpcRuntime?.unregister?.(root);
      root.parent?.remove?.(root);
      manager?.memory?.setFact?.(factKey, {
        ...previous,
        despawned: true,
        despawnReason: reason,
        despawnedAt: Date.now()
      });
      manager?.memory?.save?.();
      return true;
    }

    reviewNpcEncounters() {
      const engine = BF.currentEngine;
      const manager = this.manager();
      const player = engine?.character?.root?.position;
      if (!engine || !manager?.memory || !player) return false;
      let changed = false;

      this.npcEncounterEntries().forEach(({ mission, entry }) => {
        const factKey = this.npcEncounterFactKey(mission.id, entry);
        const state = manager.memory.getFact?.(factKey, {}) || {};
        if (state.despawned) return;
        const tree = manager.trees?.get?.(mission.id);
        if (entry.requiresSlotComplete) {
          const required = tree?.find?.(`${mission.id}:${entry.requiresSlotComplete}`);
          if (!required?.isComplete) return;
        }
        const root = this.npcEncounterRoot(entry);
        if (!root) return;

        if (entry.contactMode) {
          root.userData.npcMissionContactMode = String(entry.contactMode);
          root.userData.npcMissionId = mission.id;
        }

        const distance = Math.hypot(
          Number(player.x) - Number(root.position?.x || 0),
          Number(player.z) - Number(root.position?.z || 0)
        );

        if (entry.speech && !state.speechShown && (
          !Number.isFinite(Number(entry.speechTriggerDistance)) ||
          Number(entry.speechTriggerDistance) <= 0 ||
          distance <= Number(entry.speechTriggerDistance)
        )) {
          BF.NpcRuntime?.speak?.(root, String(entry.speech), {
            duration: Math.max(1.5, Number(entry.speechDuration) || 4),
            emitDialogue: entry.emitDialogue === true
          });
          manager.memory.setFact?.(factKey, {
            ...state,
            speechShown: true,
            speechShownAt: Date.now()
          });
          manager.memory.save?.();
          state.speechShown = true;
          changed = true;
        }

        if (entry.despawnOnSlotComplete) {
          const tree = manager.trees?.get?.(mission.id);
          const node = tree?.find?.(`${mission.id}:${entry.despawnOnSlotComplete}`);
          if (node?.isComplete) {
            changed = this.despawnNpcEncounter(root, mission, entry, "slot-complete") || changed;
            return;
          }
        }

        const despawnDistance = Number(entry.despawnOnDistanceBelow);
        if (Number.isFinite(despawnDistance) && despawnDistance > 0 && distance < despawnDistance) {
          changed = this.despawnNpcEncounter(root, mission, entry, "player-proximity") || changed;
          return;
        }

        const triggerDistance = Number(entry.triggerDistance);
        if (!Number.isFinite(triggerDistance) || triggerDistance <= 0) return;
        const rearmDistance = Math.max(
          triggerDistance + 1,
          Number(entry.rearmDistance) || triggerDistance + 4
        );

        if (distance > rearmDistance && state.armed === false) {
          state.armed = true;
          manager.memory.setFact?.(factKey, state);
          manager.memory.save?.();
          changed = true;
        }

        const armed = state.armed !== false;
        if (!armed || distance >= triggerDistance) return;

        const reaction = entry.spatialDecision === true
          ? BF.NpcRuntime?.chooseRelationalDistance?.(root, {
              choices: asArray(entry.spatialChoices).length ? asArray(entry.spatialChoices) : ["approach", "hold", "retreat"],
              cause: String(entry.cause || "mission-spatial-choice"),
              stepDistance: Number(entry.spatialStepDistance) || 1.2,
              autoRelease: entry.autoRelease !== false
            })
          : BF.NpcRuntime?.reactToApproach?.(root, {
              behaviors: asArray(entry.behaviors),
              cause: String(entry.cause || "mission-approach"),
              behaviorSignature: entry.behaviorSignature || null,
              tags: asArray(entry.tags),
              fleeDistance: Number(entry.fleeDistance) || 4,
              autoRelease: entry.autoRelease !== false
            });
        if (!reaction) return;

        if (entry.autoContact === true && reaction !== "flee") {
          const contactTarget = (engine.currentMap?.interactables || []).find((candidate) =>
            candidate === root || candidate?.userData?.worldAnchor === root
          ) || root;
          contactTarget.userData.requestedInteraction = "contact";
          contactTarget.userData.requestedInteractionSource = "mission";
          contactTarget.userData.missionId = mission.id;
          contactTarget.userData.missionNodeId = entry.contactSlot ? `${mission.id}:${entry.contactSlot}` : null;
          engine.targetInteraction?.(contactTarget);
        }

        manager.memory.setFact?.(factKey, {
          ...state,
          armed: false,
          lastReaction: reaction,
          lastReactionAt: Date.now(),
          lastDistance: distance,
          reactionCount: Math.max(0, Number(state.reactionCount) || 0) + 1
        });
        manager.memory.save?.();
        changed = true;
      });

      return changed;
    }

    reviewProximityContexts() {
      const engine = BF.currentEngine;
      const manager = this.manager();
      const player = engine?.character?.root?.position;
      if (!engine || !manager?.memory || !player) return false;
      let changed = false;
      this.proximityContextEntries().forEach(({ mission, context }) => {
        const anchor = context.microSceneId
          ? this.microSceneProximityAnchor(context.microSceneId)
          : this.objectProximityAnchor(context.cuoType);
        if (!anchor) {
          if (context.allowKnownMapTravel === true && context.cuoType && context.targetMapFact) {
            const targetMapId = this.knownMapForCuoType(context.cuoType);
            if (targetMapId) {
              manager.memory.setFact?.(String(context.targetMapFact), {
                mapId: targetMapId,
                cuoType: String(context.cuoType),
                source: "known-map-proximity-target",
                updatedAt: Date.now()
              });
              manager.memory.save?.();
              changed = true;
            }
          }
          return;
        }
        const point = this.observationPoint(anchor, engine);
        const radius = context.useSceneRadius === true
          ? Math.max(1, Number(BF.MicroScenes?.get?.(context.microSceneId)?.radius) || 8)
          : Math.max(1, Number(context.radius) || 8);
        const distance = Math.hypot(
          Number(player.x) - Number(point.x),
          Number(player.z) - Number(point.z)
        );
        if (distance > radius) return;
        if (context.targetMapFact) {
          manager.memory.setFact?.(String(context.targetMapFact), {
            mapId: engine.currentMapId,
            cuoType: context.cuoType || null,
            source: "local-proximity-target",
            updatedAt: Date.now()
          });
        }
        const requiredMapFact = String(context.requiredMapFact || "").trim();
        if (requiredMapFact) {
          const fact = manager.memory.getFact?.(requiredMapFact, null);
          const field = String(context.requiredMapField || "mapId").trim();
          const requiredMapId = String(fact?.[field] || fact?.mapId || "");
          if (!requiredMapId || String(engine.currentMapId || "") !== requiredMapId) {
            return;
          }
        }
        if (context.reserve) {
          if (!this.withdrawPersistentReserve(mission, context)) return;
          changed = true;
          return;
        }
        if (context.inventoryConsume) {
          const requirement = context.inventoryConsume;
          const keys = this.inventoryKeysForRequirement(requirement);
          const quantity = Math.max(0, Number(requirement.quantity) || 0);
          const transactionId = `${mission.id}:${context.id || context.fact}:inventory-consume:v1`;
          const removed = BF.consumeInventoryPoolOnce?.(transactionId, keys, quantity) || 0;
          if (removed !== quantity) {
            BF.currentEngine?.callbacks?.onStatus?.(requirement.missingMessage || "Ressource missionnelle manquante.");
            return;
          }
        }
        if (context.slot) {
          if (!context.microSceneId && context.cuoType) {
            // La proximité décide QUAND une étude passive est due ; l'ObjectEvent
            // canonique est ensuite consommé par ObjectM0, qui reste propriétaire
            // de la preuve d'objet, de l'instanceId et du fan-out missionnel.
            const nodeId = `${mission.id}:${context.slot}`;
            const tree = manager.trees?.get?.(mission.id);
            const node = tree?.find?.(nodeId);
            const before = Math.max(0, Number(node?.progress) || 0);
            const emitted = BF.ObjectEvents?.emit?.(
              BF.ObjectEvents?.types?.PHENOMENON_OBSERVED || "PHENOMENON_OBSERVED",
              anchor,
              {
                missionId: mission.id,
                missionNodeId: nodeId,
                mapId: engine.currentMapId,
                zoneId: engine.currentZoneIndex,
                cuoType: context.cuoType,
                subject: node?.params?.subject || context.cuoType,
                missionNarrativeVerb: ["analyze", "inspect"].includes(String(node?.type || "").toLowerCase()) ? String(node.type).toLowerCase() : "observe",
                interactionMode: "observe",
                interactionSource: "proximity",
                passiveProximity: true
              }
            );
            const after = Math.max(0, Number(node?.progress) || 0);
            if (!emitted) return;
            if (node?.params?.catalogManaged === true) {
              if (!this.progressRuntimeValidationSlot(mission.id, context.slot, 1)) return;
            } else if (after <= before) {
              return;
            }
          } else if (!this.progressRuntimeValidationSlot(mission.id, context.slot, 1)) {
            return;
          }
        }
        manager.memory.setFact?.(context.fact, {
          active: true,
          missionId: mission.id,
          slot: context.slot || null,
          microSceneId: context.microSceneId || null,
          cuoType: context.cuoType || null,
          mapId: engine.currentMapId,
          reachedAt: Date.now()
        });
        manager.memory.save?.();
        changed = true;
        global.dispatchEvent?.(
          new CustomEvent("bluefox:bible-context-proximity", {
            detail: {
              id: context.id || context.fact,
              fact: context.fact,
              missionId: mission.id,
              slot: context.slot || null,
              microSceneId: context.microSceneId || null,
              cuoType: context.cuoType || null,
              mapId: engine.currentMapId,
              distance,
              radius
            }
          })
        );
      });
      changed = this.reviewNpcEncounters() || changed;
      if (changed) manager.publish?.();
      this.refreshProximityContextMonitor();
      return changed;
    }

    refreshProximityContextMonitor() {
      const needed = this.proximityContextEntries().length > 0 || this.npcEncounterEntries().length > 0;
      if (!needed && this.proximityContextTimer) {
        global.clearInterval?.(this.proximityContextTimer);
        this.proximityContextTimer = null;
        return false;
      }
      if (needed && !this.proximityContextTimer) {
        this.proximityContextTimer = global.setInterval?.(
          () => this.reviewProximityContexts(),
          750
        ) || null;
      }
      return needed;
    }

    narrativeDisplayDuration(text) {
      const length = String(text || "").trim().length;
      return Math.min(12000, Math.max(4500, 3000 + length * 40));
    }

    queueNarrativeLine(payload) {
      this.narrativeQueue = this.narrativeQueue || [];
      this.narrativeQueue.push(payload);
      if (this.narrativeTimer) return;

      const playNext = () => {
        const next = this.narrativeQueue.shift();
        if (!next) {
          this.narrativeTimer = null;
          return;
        }

        const engine = BF.currentEngine;
        const now = performance.now();
        const duration = this.narrativeDisplayDuration(next.text);
        if (engine) {
          engine.speechQuietUntil = Math.max(
            Number(engine.speechQuietUntil) || 0,
            now + duration
          );
          engine.lastSpeechAt = now;
          engine.lastFatigueSpeechAt = now;
          if (engine.speechVisible !== false) {
            engine.callbacks?.onSpeak?.(next.text);
          }
          engine.callbacks?.onAction?.(next.text);
        }

        this.narrativeTimer = global.setTimeout?.(playNext, duration) || null;
      };

      playNext();
    }

    emitNarrative(mission, moment, context = {}) {
      const lines = mission?.narrative?.[moment] || [];
      if (!lines.length) return false;

      lines.forEach((item, index) => {
        const text =
          typeof item === "string"
            ? item
            : item?.text || "";

        if (!text) return;

        const payload = {
          id: `bible:${mission.id}:${moment}:${index}:${Date.now()}`,
          title: mission.title,
          text,
          mapId: context.mapId ?? BF.currentEngine?.currentMapId ?? null,
          zoneId: context.zoneId ?? BF.currentEngine?.currentZoneIndex ?? null,
          important: moment === "revealed" || moment === "completed"
        };

        if (item?.route === "journal") {
          BF.addJournalEntry?.({
            ...payload,
            type: "bible"
          });
          return;
        }

        this.queueNarrativeLine(payload);
      });

      return true;
    }

    activateMission(mission, event = {}, options = {}) {
      const manager = this.manager();
      const diagnostic = {
        at: Date.now(),
        missionId: mission?.id || null,
        triggerType: event?.type || null,
        subject: event?.subject || null,
        objectId: event?.objectId || null,
        managerAvailable: Boolean(manager),
        definitionExists: Boolean(
          mission?.id && Missions.getDefinition?.(mission.id)
        ),
        lifecycleBefore: null,
        startResult: false,
        activated: false,
        lifecycleAfter: null,
        error: null
      };

      if (!mission?.id || !manager) {
        diagnostic.error = !manager
          ? "MissionManager indisponible"
          : "Mission invalide";
        this.lastActivationAttempt = diagnostic;
        return false;
      }

      if (!this.foundationTutorialAllows(mission)) {
        diagnostic.error = "Mission différée pendant le tutoriel de fondation";
        this.lastActivationAttempt = diagnostic;
        return false;
      }

      let lifecycleState = this.missionLifecycle(mission.id);
      diagnostic.lifecycleBefore = clone(lifecycleState.lifecycle);


      if (lifecycleState.active) {
        diagnostic.error = "Mission déjà active";
        this.lastActivationAttempt = diagnostic;
        return false;
      }

      if (lifecycleState.completed) {
        diagnostic.error = "Mission déjà terminée";
        this.lastActivationAttempt = diagnostic;
        return false;
      }

      if (!Missions.getDefinition?.(mission.id)) {
        const compiled = this.compileMission(mission);
        if (compiled && typeof BF.registerMissionDefinitions === "function") {
          BF.registerMissionDefinitions([compiled]);
        }
      }

      if (!Missions.getDefinition?.(mission.id)) {
        diagnostic.error = "Définition mission absente";
        this.lastActivationAttempt = diagnostic;
        return false;
      }

      try {
        diagnostic.startResult =
          this.startMissionThroughBible(mission.id, {
            primary: options.primary ?? (mission.primaryOnActivation === true),
            autoPrimaryEligible: mission.autoPrimaryEligible,
            prerequisites: asArray(mission.prerequisites),
            experimentalPrerequisites: asArray(mission.experimentalPrerequisites),
            source: "bible-runtime-v0.1",
            reason: `Déclencheur Bible V0.1 : ${event.type || "event"}`
          });

        const after = this.missionLifecycle(mission.id);
        diagnostic.lifecycleAfter = clone(after.lifecycle);
        diagnostic.activated = after.active || Boolean(after.tree);

        if (!diagnostic.startResult || !diagnostic.activated) {
          diagnostic.error =
            "MissionManager n'a pas confirmé l'activation";
          this.lastActivationAttempt = diagnostic;
          return false;
        }

        // triggerOnly signifie : l’événement révèle la mission mais ne lie pas
        // la suite à l’objet qui a servi de déclencheur. Cette règle était
        // auparavant portée par bible-runtime-trigger-fix-v19.js.
        if (mission.bindActivationMap === true && event.mapId) {
          manager.memory?.setFact?.(`bibleActivation:${mission.id}`, {
            mapId: String(event.mapId),
            fromMapId: event.fromMapId || null,
            toMapId: event.toMapId || event.mapId,
            activatedAt: Date.now()
          });
        }
        if (mission.triggerOnly === true) {
          manager.memory?.setFact?.(`bibleTarget:${mission.id}`, null);
        } else if (mission.targetBinding) {
          manager.memory?.setFact?.(`bibleTarget:${mission.id}`, {
            binding: mission.targetBinding,
            instanceId: event.instanceId || null,
            objectId: event.objectId || null,
            cuoType: event.cuoType || null
          });
        }
        manager.memory?.save?.();

        // La rencontre déclenche uniquement la révélation. L'autonomie ne doit
        // pas consommer le premier objectif dans la même séquence d'interaction.
        // Une action manuelle reste immédiatement possible et sera forcée par
        // la directive de mission ; l'autonomie reprendra à la séquence suivante.
        manager.retryAfter = Math.max(
          Number(manager.retryAfter || 0),
          performance.now() + 3500
        );

        this.emitRevealedOnce(mission, event);
        this.initializeRuntimeCounters(mission);
        this.reconcileRuntimeCounters(mission.id);
        this.reconcileHistoricalCollections(mission.id);
        this.refreshProximityContextMonitor();
        this.lastActivationAttempt = diagnostic;

        global.dispatchEvent?.(
          new CustomEvent("bluefox:bible-mission-revealed-v0-1", {
            detail: {
              missionId: mission.id,
              title: mission.title,
              trigger: event.type || null,
              subject: event.subject || null,
              objectId: event.objectId || null
            }
          })
        );

        return true;
      } catch (error) {
        diagnostic.error = error?.message || String(error);
        this.lastActivationAttempt = diagnostic;
        console.error(
          "[BlueFox] Bible Runtime V0.1 : activation impossible.",
          diagnostic,
          error
        );
        return false;
      }
    }

    rememberDeferredTriggerContext(mission, event = {}, options = {}) {
      const manager = this.manager();
      const memory = manager?.memory;
      if (!mission?.id || !memory) return false;

      memory.setFact?.(`bibleDeferredTrigger:${mission.id}`, {
        type: event.type || null,
        missionId: event.missionId || null,
        ...(options.factRequirementsDeferred === true
          ? { factRequirementsDeferred: true }
          : {}),
        mapId: event.mapId || null,
        fromMapId: event.fromMapId || null,
        toMapId: event.toMapId || event.mapId || null,
        instanceId: event.instanceId || null,
        objectId: event.objectId || null,
        cuoType: event.cuoType || null,
        subject: event.subject || null,
        acquiredAt: Date.now()
      });

      if (mission.bindActivationMap === true && event.mapId) {
        memory.setFact?.(`bibleActivation:${mission.id}`, {
          mapId: String(event.mapId),
          fromMapId: event.fromMapId || null,
          toMapId: event.toMapId || event.mapId,
          activatedAt: Date.now()
        });
      }
      if (mission.triggerOnly === true) {
        memory.setFact?.(`bibleTarget:${mission.id}`, null);
      } else if (mission.targetBinding) {
        memory.setFact?.(`bibleTarget:${mission.id}`, {
          binding: mission.targetBinding,
          instanceId: event.instanceId || null,
          objectId: event.objectId || null,
          cuoType: event.cuoType || null
        });
      }
      memory.save?.();
      return true;
    }

    missionFactRequirementsSatisfied(mission) {
      const memory = this.manager()?.memory;
      if (!memory) return false;
      const requiredFactsReady = asArray(mission?.requiredFacts).every((factKey) =>
        Boolean(memory.getFact?.(factKey, false))
      );
      if (!requiredFactsReady) return false;
      return asArray(mission?.requiredFactValues).every((requirement) => {
        const factKey = String(requirement?.fact || "").trim();
        if (!factKey) return true;
        const stored = memory.getFact?.(factKey, null);
        const field = String(requirement?.field || "").trim();
        const actual = field && stored && typeof stored === "object"
          ? stored[field]
          : stored;
        if (Object.prototype.hasOwnProperty.call(requirement || {}, "equals")) {
          return actual === requirement.equals;
        }
        const oneOf = asArray(requirement?.oneOf);
        if (oneOf.length) return oneOf.includes(actual);
        return Boolean(actual);
      });
    }

    deferCompletionTrigger(mission, event = {}) {
      if (
        event.type !== "progression.mission_completed" ||
        Math.max(1, Number(mission?.trigger?.count) || 1) !== 1
      ) return false;
      const memory = this.manager()?.memory;
      if (!mission?.id || !memory) return false;
      const key = `bibleDeferredTrigger:${mission.id}`;
      const previous = memory.getFact?.(key, null);
      const sameTrigger = Boolean(
        previous?.type === event.type &&
        String(previous?.missionId || "") === String(event.missionId || "")
      );
      if (!sameTrigger) this.incrementTrigger(mission, event);
      this.rememberDeferredTriggerContext(mission, event, { factRequirementsDeferred: true });
      return true;
    }

    reconcileDeferredCompletionTriggers() {
      const manager = this.manager();
      const memory = manager?.memory;
      if (!memory) return false;
      let changed = false;

      for (const mission of this.catalog) {
        const key = `bibleDeferredTrigger:${mission.id}`;
        const event = memory.getFact?.(key, null);
        if (
          event?.type !== "progression.mission_completed" ||
          event?.factRequirementsDeferred !== true
        ) continue;

        const lifecycle = this.missionLifecycle(mission.id);
        if (lifecycle.active || lifecycle.completed) {
          memory.setFact?.(key, null);
          changed = true;
          continue;
        }
        if (!this.eventMatchesTrigger(mission.trigger, event)) continue;
        if (!this.prerequisitesSatisfied(mission)) continue;
        if (!this.siteDistanceGateSatisfied(
          mission,
          event.mapId || event.toMapId || BF.currentEngine?.currentMapId
        )) continue;

        // Le reçu MissionMemory constitue la preuve persistante du déclencheur
        // one-shot. Le compteur runtime reste diagnostique et ne doit pas rendre
        // le replay dépendant d'un second stockage local.
        // Le déclencheur causal a déjà été compté : on active directement sans
        // le rejouer ni incrémenter une seconde fois. Ces followers différés
        // restent secondaires ; MissionManager conserve l'arbitrage Top1.
        if (!this.activateMission(mission, event, { primary: false })) continue;
        memory.setFact?.(key, null);
        changed = true;
      }
      if (changed) memory.save?.();
      return changed;
    }

    consumeTriggerEvent(event, options = {}) {
      const candidates = [];
      const isPhysicalOpportunity = (mission) => Boolean(
        event?.type === "exploration.map_discovered" &&
        /^OPP-/.test(String(mission?.id || "")) &&
        asArray(mission?.trigger?.featuredMicroSceneIdsAny).length > 0
      );

      for (const template of this.localMissionTemplates()) {
        const mapId = String(event?.mapId || BF.currentEngine?.currentMapId || "");
        if (!this.localMissionEligibleOnMap(template, mapId)) continue;
        if (!this.localMissionActivationMatches(template.localMission.activation, event)) continue;
        const instanceId = this.localExplorationInstanceId(template.id, mapId);
        const lifecycleState = this.missionLifecycle(instanceId);
        if (lifecycleState.completed || lifecycleState.active) continue;
        const mission = this.localMissionInstance(instanceId, event);
        if (!mission || !this.prerequisitesSatisfied(mission)) continue;
        candidates.push(mission);
      }

      for (const mission of this.catalog) {
        if (mission?.localMission) continue;
        if (!this.eventMatchesTrigger(mission.trigger, event)) continue;
        // Le tutoriel filtre avant tout compteur/pending : les événements T01→T13
        // ne doivent pas armer rétroactivement les missions non autorisées.
        if (!this.foundationTutorialAllows(mission)) continue;
        if (!this.siteDistanceGateSatisfied(
          mission,
          event.mapId || event.toMapId || BF.currentEngine?.currentMapId
        )) continue;

        const lifecycleState = this.missionLifecycle(mission.id);
        if (lifecycleState.completed || lifecycleState.active) continue;

        const prerequisitesReady = this.prerequisitesSatisfied(mission);
        if (!prerequisitesReady) {
          const missionPrerequisites = asArray(mission.prerequisites);
          const missingMissionPrerequisites = missionPrerequisites.filter((missionId) =>
            !this.missionLifecycle(missionId).completed
          );

          const missingExperimentalPrerequisites = asArray(mission.experimentalPrerequisites)
            .filter((knowledgeId) => !this.isResearchRewardUnlocked(knowledgeId));

          const hasFactRequirements =
            asArray(mission.requiredFacts).length > 0 ||
            asArray(mission.requiredFactValues).length > 0;

          // Une completion est un événement causal one-shot. Si ce follower est
          // explicitement bloqué par un fait Bible, MissionManager ne doit pas le
          // démarrer prématurément ni perdre l'événement : BibleRuntime conserve
          // le reçu et attend que TOUS les prérequis redeviennent vrais.
          if (
            options.allowActivation !== false &&
            event.type === "progression.mission_completed" &&
            Math.max(1, Number(mission.trigger?.count) || 1) === 1 &&
            hasFactRequirements &&
            !this.missionFactRequirementsSatisfied(mission)
          ) {
            this.deferCompletionTrigger(mission, event);
            continue;
          }

          // Les pendingActivations de MissionManager portent les dépendances de
          // lifecycle et les connaissances expérimentales. Un requiredFact manquant,
          // sans prérequis missionnel ni expérimental manquant, reste simplement en
          // attente de son prochain événement causal.
          if (!missingMissionPrerequisites.length && !missingExperimentalPrerequisites.length) continue;

          const required = Math.max(1, Number(mission.trigger?.count) || 1);
          const completedTriggerMissionId = event.type === "progression.mission_completed"
            ? String(event.missionId || "")
            : "";
          const triggerCompletesPrerequisite = Boolean(
            completedTriggerMissionId && missionPrerequisites.includes(completedTriggerMissionId)
          );

          // R-STAB : conserver un déclencheur ponctuel réellement acquis sans
          // changer la sémantique historique des compteurs multi-événements.
          // Les triggers count > 1 (ex. GAME-collection_samples) commencent
          // toujours après leurs prérequis ; aucun backfill prématuré.
          if (required > 1 && !triggerCompletesPrerequisite) continue;

          const count = this.incrementTrigger(mission, event);
          const preservePhysicalOpportunity =
            isPhysicalOpportunity(mission) && count >= required;
          if (count < required ||
              (options.allowActivation === false && !preservePhysicalOpportunity)) continue;

          this.rememberDeferredTriggerContext(mission, event);
          this.manager()?.startMission?.(mission.id, {
            primary: preservePhysicalOpportunity
              ? false
              : mission.primaryOnActivation === true,
            autoPrimaryEligible: mission.autoPrimaryEligible,
            prerequisites: missionPrerequisites,
            experimentalPrerequisites: asArray(mission.experimentalPrerequisites),
            source: "bible-runtime-v0.1",
            reason: `Déclencheur Bible V0.1 acquis avant prérequis : ${event.type || "event"}`
          });
          continue;
        }

        const count = this.incrementTrigger(mission, event);
        const required = Math.max(1, Number(mission.trigger?.count) || 1);
        if (count >= required) candidates.push(mission);
      }

      candidates.sort((left, right) =>
        (Number(right.priority) || 0) - (Number(left.priority) || 0) ||
        this.catalog.indexOf(left) - this.catalog.indexOf(right)
      );

      const physicalOpportunityCandidates = candidates.filter(isPhysicalOpportunity);
      const activatePhysicalOpportunities = (activatedMissionIds = [], handledIds = new Set()) => {
        physicalOpportunityCandidates.forEach((mission) => {
          if (handledIds.has(mission.id) || activatedMissionIds.includes(mission.id)) return;
          if (this.activateMission(mission, event, { primary: false })) {
            activatedMissionIds.push(mission.id);
          }
        });
        return activatedMissionIds;
      };

      const selected = options.allowActivation === false
        ? null
        : candidates[0] || null;
      if (!selected) {
        const activatedMissionIds = options.allowActivation === false
          ? activatePhysicalOpportunities([])
          : [];
        return {
          matched: candidates.length,
          activatedMissionId: activatedMissionIds[0] || null,
          activatedMissionIds
        };
      }

      const concurrentGroup = String(
        selected.concurrentAvailabilityGroup || ""
      ).trim();
      const completionFanout =
        event.type === "progression.mission_completed";
      if (concurrentGroup) {
        const concurrentCandidates = candidates.filter((mission) =>
          String(mission.concurrentAvailabilityGroup || "").trim() === concurrentGroup
        );
        const activatedMissionIds = [];
        const activatedConcurrentPrimaryCandidates = [];
        concurrentCandidates.forEach((mission) => {
          const physicalOpportunity = isPhysicalOpportunity(mission);
          if (this.activateMission(
            mission,
            event,
            physicalOpportunity ? { primary: false } : {}
          )) {
            activatedMissionIds.push(mission.id);
            if (!physicalOpportunity) {
              activatedConcurrentPrimaryCandidates.push(mission.id);
            }
          }
        });

        if (completionFanout) {
          const alreadyHandled = new Set(
            concurrentCandidates.map((mission) => mission.id)
          );
          candidates.forEach((mission) => {
            if (alreadyHandled.has(mission.id)) return;
            if (this.activateMission(mission, event, { primary: false })) {
              activatedMissionIds.push(mission.id);
            }
          });
        }

        // Les missions concurrentes et les followers du même événement causal
        // sont d'abord toutes confiées au lifecycle canonique. L'arbitrage
        // historique n'intervient qu'une fois le fan-out complet, afin qu'il
        // voie l'ensemble des missions réellement disponibles.
        const manager = this.manager();
        // Les OPP physiques nouvellement révélées restent des opportunités
        // secondaires : elles ne participent pas à une réélection forcée qui
        // pourrait déplacer le Top1 déjà établi. Le comportement historique
        // des groupes concurrents non-OPP reste inchangé.
        if (activatedConcurrentPrimaryCandidates.length > 1) {
          manager?.selectBestPrimary?.(performance.now(), true);
          manager?.memory?.save?.();
          manager?.publish?.();
        }

        activatePhysicalOpportunities(
          activatedMissionIds,
          new Set(concurrentCandidates.map((mission) => mission.id))
        );

        const activatedMissionId =
          manager?.primaryMissionId || activatedMissionIds[0] || null;
        return {
          matched: candidates.length,
          activatedMissionId,
          activatedMissionIds
        };
      }

      const activatedMissionId = this.activateMission(
        selected,
        event,
        isPhysicalOpportunity(selected) ? { primary: false } : {}
      )
        ? selected.id
        : null;
      const activatedMissionIds = activatedMissionId
        ? [activatedMissionId]
        : [];

      if (completionFanout) {
        candidates.slice(1).forEach((mission) => {
          if (this.activateMission(mission, event, { primary: false })) {
            activatedMissionIds.push(mission.id);
          }
        });
      }

      activatePhysicalOpportunities(
        activatedMissionIds,
        new Set(selected ? [selected.id] : [])
      );

      const effectiveActivatedMissionId =
        activatedMissionId || activatedMissionIds[0] || null;
      return {
        matched: candidates.length,
        activatedMissionId: effectiveActivatedMissionId,
        activatedMissionIds
      };
    }

    activateDroneRepairMission(detail = {}) {
      const mission = this.byId.get("DRN-05");
      const manager = this.manager();
      if (!mission || !manager || !detail.failureId || !detail.mapId || !detail.instanceId) return false;
      if (this.missionLifecycle(mission.id).active) return false;
      if (this.missionLifecycle(mission.id).completed) {
        manager.rearmRepeatableMission?.(mission.id, {
          source: "drone-failure",
          reason: "Un autre drone nécessite un dépannage sur le terrain."
        });
      }
      const event = {
        type: "drone.failed",
        instanceId: String(detail.instanceId),
        objectId: detail.droneType === "harvest_drone" ? "EQP-DRON-M-002" : "EQP-DRON-M-001",
        cuoType: String(detail.droneType || ""),
        mapId: String(detail.mapId),
        zoneId: detail.zoneId ?? null,
        droneId: detail.droneId || null,
        failureId: detail.failureId
      };
      if (!this.activateMission(mission, event)) return false;
      manager.memory?.setFact?.("droneRepairTarget:DRN-05", {
        failureId: detail.failureId,
        failureIndex: detail.failureIndex || null,
        droneId: detail.droneId || null,
        droneType: detail.droneType || null,
        instanceId: String(detail.instanceId),
        mapId: String(detail.mapId),
        zoneId: detail.zoneId ?? null,
        requirements: { ...(detail.requirements || {}) },
        failedAt: detail.failedAt || Date.now()
      });
      manager.memory?.save?.();
      if (String(BF.currentEngine?.currentMapId || "") === String(detail.mapId)) {
        this.progressRuntimeValidationSlot(mission.id, "reachDrone", 1);
      }
      return true;
    }

    activateNextDroneRepairMission() {
      if (this.missionLifecycle("DRN-05").active) return false;
      const failures = BF.SpecialObjectRuntime?.failures?.() || [];
      const next = failures[0];
      return next ? this.activateDroneRepairMission(next) : false;
    }

    handleDroneMissionObjectEvent(rawEvent = {}) {
      const type = String(rawEvent?.type || "");
      const detail = rawEvent?.detail || {};
      const source = String(detail.interactionSource || "");
      const droneType = String(detail.droneType || "");
      const remote = detail.remote === true;
      let changed = false;

      if (type === String(BF.ObjectEvents?.types?.DRONE_FAILED || "DRONE_FAILED")) {
        return this.activateDroneRepairMission(detail);
      }

      if (
        type === String(BF.ObjectEvents?.types?.OBJECT_REPAIRED || "OBJECT_REPAIRED") &&
        source === "drone" &&
        this.missionLifecycle("DRN-05").active
      ) {
        const target = this.manager()?.memory?.getFact?.("droneRepairTarget:DRN-05", null);
        if (target?.failureId && String(target.failureId) === String(detail.failureId || "")) {
          changed = this.progressRuntimeValidationSlot("DRN-05", "repairDrone", 1) || changed;
          if (changed) {
            this.manager()?.memory?.setFact?.("droneRepairTarget:DRN-05", null);
            this.manager()?.memory?.save?.();
            this.activateNextDroneRepairMission();
          }
        }
      }

      if (this.missionLifecycle("DRN-03").active) {
        if (
          type === String(BF.ObjectEvents?.types?.DRONE_ACTIVATED || "DRONE_ACTIVATED") &&
          source === "drone" &&
          droneType === "harvest_drone" &&
          detail.state === "deployed" &&
          detail.beaconLinked === true
        ) {
          changed = this.progressRuntimeValidationSlot("DRN-03", "deploy", 1) || changed;
        }
        if (
          type === String(BF.ObjectEvents?.types?.DRONE_PRIORITY_CHANGED || "DRONE_PRIORITY_CHANGED") &&
          source === "drone" &&
          droneType === "harvest_drone"
        ) {
          changed = this.progressRuntimeValidationSlot("DRN-03", "priority", 1) || changed;
        }
        if (
          type === String(BF.ObjectEvents?.types?.RESOURCE_COLLECTED || "RESOURCE_COLLECTED") &&
          source === "drone" &&
          droneType === "harvest_drone" &&
          remote
        ) {
          changed = this.progressRuntimeValidationSlot(
            "DRN-03",
            "remoteCollect",
            Math.max(1, Number(rawEvent.quantity) || 1)
          ) || changed;
        }
      }

      if (this.missionLifecycle("DRN-04").active) {
        if (
          type === String(BF.ObjectEvents?.types?.DRONE_CONSOLE_VIEWED || "DRONE_CONSOLE_VIEWED") &&
          source === "drone"
        ) {
          changed = this.progressRuntimeValidationSlot("DRN-04", "console", 1) || changed;
        }
        if (
          type === String(BF.ObjectEvents?.types?.DRONE_PRIORITY_CHANGED || "DRONE_PRIORITY_CHANGED") &&
          source === "drone" &&
          droneType === "harvest_drone"
        ) {
          changed = this.progressRuntimeValidationSlot("DRN-04", "priority", 1) || changed;
        }
        if (
          type === String(BF.ObjectEvents?.types?.DRONE_CARGO_DEPOSITED || "DRONE_CARGO_DEPOSITED") &&
          source === "drone" &&
          droneType === "harvest_drone"
        ) {
          changed = this.progressRuntimeValidationSlot(
            "DRN-04",
            "deposit",
            Math.max(1, Number(rawEvent.quantity) || 1)
          ) || changed;
        }
      }
      return changed;
    }

    civilizationContactSelection(mission = null) {
      const validation = mission?.runtimeValidation || {};
      const encounter = asArray(mission?.npcEncounters).find((entry) => entry?.selectionFact) || null;
      const factKey = String(
        validation.selectionFact ||
        encounter?.selectionFact ||
        "civilization:arch-selected"
      );
      const field = String(
        validation.selectionField ||
        encounter?.selectionField ||
        "civilizationId"
      );
      const selected = this.manager()?.memory?.getFact?.(factKey, null);
      const civilizationId = lower(selected?.[field] ?? selected ?? "");
      return Object.freeze({ factKey, field, civilizationId });
    }

    selectedCivilization(mission = null) {
      return this.civilizationContactSelection(mission).civilizationId;
    }

    activeCivilizationContactMission() {
      return this.allMissions().find((mission) =>
        mission?.runtimeValidation?.type === "civilization-contact" &&
        this.missionLifecycle(mission.id).active
      ) || null;
    }

    contactArcResetContract(mission) {
      const validation = mission?.runtimeValidation || {};
      const configuredIds = asArray(validation.resetMissionIds).map(String).filter(Boolean);
      const missionIds = configuredIds.length
        ? configuredIds
        : Array.from({ length: 9 }, (_, index) => `CONTACT-${String(index + 1).padStart(2, "0")}`);
      return Object.freeze({
        missionIds,
        startMissionId: String(validation.resetStartMissionId || "CONTACT-01"),
        prerequisites: asArray(validation.resetPrerequisites).length
          ? asArray(validation.resetPrerequisites).map(String)
          : ["ARCH-40"]
      });
    }

    resetCivilizationContactArc(mission, reason = "Rupture relationnelle significative.") {
      const manager = this.manager();
      if (!manager) return false;
      const contract = this.contactArcResetContract(mission);
      let changed = false;
      contract.missionIds.forEach((missionId) => {
        const lifecycle = this.missionLifecycle(missionId);
        if (!["active", "paused", "failed", "completed"].includes(lifecycle.status)) return;
        changed = manager.resetMissionAttempt?.(missionId, {
          source: "civilization-contact",
          reason
        }) === true || changed;
      });
      if (changed) {
        this.startMissionThroughBible(contract.startMissionId, {
          primary: false,
          autoPrimaryEligible: false,
          prerequisites: contract.prerequisites,
          source: "civilization-contact",
          reason: "Nouvelle tentative de rapprochement après une rupture."
        });
      }
      return changed;
    }

    nextCivilizationContactTarget(mission, selectedCivilizationId) {
      const validation = mission?.runtimeValidation || {};
      const nextMissionId = String(validation.nextContactMissionId || "");
      const nextSelectionFact = String(validation.nextContactSelectionFact || "");
      if (!nextMissionId || !nextSelectionFact) return null;

      const selected = lower(selectedCivilizationId);
      const entries = asArray(mission?.npcEncounters);
      const candidateIds = [...new Set(entries.map((entry) => lower(entry?.selectionValue)).filter(Boolean))];
      const civilizationId = candidateIds.find((id) => id !== selected) || "";
      if (!civilizationId) return null;
      const entry = entries.find((candidate) => lower(candidate?.selectionValue) === civilizationId) || null;
      const city = global.BlueFoxCivilizationCities?.[civilizationId] ||
        BF.BlueFoxCivilizationCities?.[civilizationId] ||
        null;
      return Object.freeze({
        civilizationId,
        cuoType: String(entry?.cuoType || ""),
        mapId: String(city?.mapId || ""),
        nextMissionId,
        nextSelectionFact
      });
    }

    ensureNextCivilizationContactContext(mission, selectedCivilizationId) {
      const target = this.nextCivilizationContactTarget(mission, selectedCivilizationId);
      if (!target) return null;
      const manager = this.manager();
      const controller = manager?.catalogController;
      const relation = controller?.getRelation?.(target.civilizationId);
      if (relation && ["friendly", "honored"].includes(lower(relation.rank))) {
        return Object.freeze({ ...target, needed: false });
      }

      const existing = manager?.memory?.getFact?.(target.nextSelectionFact, null);
      if (lower(existing?.civilizationId) !== target.civilizationId) {
        manager?.memory?.setFact?.(target.nextSelectionFact, {
          civilizationId: target.civilizationId,
          cuoType: target.cuoType,
          mapId: target.mapId,
          selectedAt: Date.now(),
          sourceMissionId: mission.id
        });
        manager?.memory?.save?.();
      }
      return Object.freeze({ ...target, needed: true });
    }

    reconcileCivilizationContactContinuation() {
      if (this.civilizationContactReconciling) return false;
      const manager = this.manager();
      if (!manager) return false;
      this.civilizationContactReconciling = true;
      try {
        let changed = false;
        for (const mission of this.allMissions()) {
          const validation = mission?.runtimeValidation || {};
          if (validation.type !== "civilization-contact" || !validation.nextContactMissionId) continue;
          if (!this.missionLifecycle(mission.id).completed) continue;
          const selected = this.selectedCivilization(mission);
          if (!selected) continue;
          const target = this.ensureNextCivilizationContactContext(mission, selected);
          if (!target?.needed) continue;
          const lifecycle = this.missionLifecycle(target.nextMissionId);
          if (["active", "completed"].includes(lifecycle.status)) continue;
          changed = this.startMissionThroughBible(target.nextMissionId, {
            primary: false,
            autoPrimaryEligible: false,
            prerequisites: [mission.id],
            source: "civilization-contact",
            reason: `La seconde civilisation (${target.civilizationId}) reste à approcher.`
          }) || changed;
        }
        return changed;
      } finally {
        this.civilizationContactReconciling = false;
      }
    }

    triggerCivilizationPostContactReaction(mission, civilizationId) {
      const engine = BF.currentEngine;
      const pending = engine?.pendingInteraction;
      const root = pending?.userData?.worldAnchor || pending;
      if (!mission || !root || !BF.NpcRuntime?.reactToApproach) return false;

      const entry = asArray(mission.npcEncounters).find((candidate) => {
        if (!candidate?.postContactReaction) return false;
        if (candidate.selectionFact && candidate.selectionField) {
          const fact = this.manager()?.memory?.getFact?.(candidate.selectionFact, null);
          if (!fact || String(fact[candidate.selectionField] || "") !== String(candidate.selectionValue || "")) {
            return false;
          }
        }
        const expectedCivilization = String(candidate.selectionValue || "").toLowerCase();
        const expectedType = String(candidate.cuoType || "").toLowerCase();
        const actualType = String(root?.userData?.libraryType || root?.userData?.functional?.type || "").toLowerCase();
        if (expectedCivilization && expectedCivilization !== String(civilizationId || "").toLowerCase()) return false;
        return !expectedType || expectedType === actualType;
      });
      if (!entry) return false;

      return BF.NpcRuntime.reactToApproach(root, {
        behaviors: asArray(entry.postContactBehaviors || ["curiosity", "calm"]),
        cause: String(entry.postContactReaction),
        autoRelease: true
      }) || false;
    }

    handleCivilizationContactEvent(rawEvent = {}) {
      const mission = this.activeCivilizationContactMission();
      if (!mission) return false;
      const validation = mission.runtimeValidation || {};
      const detail = rawEvent?.detail || {};
      const types = BF.ObjectEvents?.types || {};
      const type = String(rawEvent?.type || "");
      const civilizationId = lower(detail.civilizationId);
      const selected = this.selectedCivilization(mission);
      if (!selected || civilizationId && civilizationId !== selected) return false;

      const reaction = lower(detail.reaction || detail.state);
      const cause = lower(detail.cause);
      const encounterId = String(detail.encounterId || "");
      const positive = ["cautious_approach", "curiosity", "calm", "observation", "interaction"].includes(reaction);

      if (
        type === String(types.NPC_REACTION || "NPC_REACTION") &&
        reaction === "flee" &&
        (cause.startsWith("contact-") || cause === "relational-approach")
      ) {
        const controller = this.manager()?.catalogController;
        const relation = controller?.getRelation?.(selected);
        if (relation && !["friendly", "honored"].includes(relation.rank)) {
          controller.setRelation?.(selected, relation.rank, { score: Number(relation.score || 0) - 2 });
        }
        return this.resetCivilizationContactArc(mission, "Le PNJ a fui après une rupture relationnelle significative.");
      }

      const phase = String(validation.phase || "");
      const slot = String(validation.slot || "contact");
      if (phase === "approach") {
        if (type !== String(types.NPC_REACTION || "NPC_REACTION") || reaction !== "cautious_approach") return false;
        return this.progressRuntimeValidationSlot(mission.id, slot, 1);
      }
      if (phase === "initiative") {
        if (type !== String(types.NPC_REACTION || "NPC_REACTION") || !positive || cause !== "contact-initiative") return false;
        return this.progressRuntimeValidationSlot(mission.id, slot, 1);
      }
      if (phase === "signal-repeat") {
        if (type !== String(types.NPC_REACTION || "NPC_REACTION") || !positive || cause !== "contact-signal" || !encounterId) return false;
        const key = `civilization:contact-signal:${selected}`;
        const previous = this.manager()?.memory?.getFact?.(key, { signature: "", encounters: [] }) || {};
        const signature = String(detail.behaviorSignature || reaction);
        const encounters = Array.isArray(previous.encounters) ? [...previous.encounters] : [];
        if (previous.signature && previous.signature !== signature) return false;
        if (encounters.includes(encounterId)) return false;
        encounters.push(encounterId);
        this.manager()?.memory?.setFact?.(key, { signature, encounters: encounters.slice(-4), updatedAt: Date.now() });
        this.manager()?.memory?.save?.();
        return this.progressRuntimeValidationSlot(mission.id, slot, 1);
      }
      if (phase === "response") {
        if (type === String(types.NPC_CONTACTED || "NPC_CONTACTED")) {
          this.manager()?.memory?.setFact?.(`civilization:contact-response:${mission.id}`, true);
          this.manager()?.memory?.save?.();
          this.triggerCivilizationPostContactReaction(mission, selected);
          return false;
        }
        if (type !== String(types.NPC_REACTION || "NPC_REACTION") || !positive || cause !== "contact-response") return false;
        if (this.manager()?.memory?.getFact?.(`civilization:contact-response:${mission.id}`, false) !== true) return false;
        if (encounterId) {
          this.manager()?.memory?.setFact?.(`civilization:contact-response-encounter:${selected}`, encounterId);
          this.manager()?.memory?.save?.();
        }
        return this.progressRuntimeValidationSlot(mission.id, slot, 1);
      }
      if (phase === "return") {
        if (type !== String(types.NPC_REACTION || "NPC_REACTION") || !positive || cause !== "contact-return" || !encounterId) return false;
        const key = `civilization:contact-return:${selected}`;
        const responseEncounter = String(this.manager()?.memory?.getFact?.(`civilization:contact-response-encounter:${selected}`, ""));
        const previous = String(this.manager()?.memory?.getFact?.(key, ""));
        if (responseEncounter && responseEncounter === encounterId) return false;
        if (previous === encounterId) return false;
        this.manager()?.memory?.setFact?.(key, encounterId);
        this.manager()?.memory?.save?.();
        return this.progressRuntimeValidationSlot(mission.id, slot, 1);
      }
      if (phase === "dialogue" || phase === "indication") {
        if (type !== String(types.NPC_DIALOGUE || "NPC_DIALOGUE")) return false;
        return this.progressRuntimeValidationSlot(mission.id, slot, 1);
      }
      if (phase === "cooperation-reaction") {
        if (type !== String(types.NPC_REACTION || "NPC_REACTION") || !positive || cause !== "contact-cooperation") return false;
        return this.progressRuntimeValidationSlot(mission.id, slot, 1);
      }
      if (phase === "friendly") {
        if (type === String(types.NPC_CONTACTED || "NPC_CONTACTED")) {
          this.manager()?.memory?.setFact?.(`civilization:contact-friendly:${mission.id}`, true);
          this.manager()?.memory?.save?.();
          this.triggerCivilizationPostContactReaction(mission, selected);
          return false;
        }
        if (type !== String(types.NPC_REACTION || "NPC_REACTION") || !positive || cause !== "contact-friendly") return false;
        if (this.manager()?.memory?.getFact?.(`civilization:contact-friendly:${mission.id}`, false) !== true) return false;
        // Le contexte de la civilisation suivante ET la relation finale sont
        // établis AVANT la complétion. Ainsi le trigger mission_completed voit
        // immédiatement tous les prérequis relationnels de la mission suivante.
        this.ensureNextCivilizationContactContext(mission, selected);
        const controller = this.manager()?.catalogController;
        const relation = controller?.getRelation?.(selected);
        if (relation && !["friendly", "honored"].includes(lower(relation.rank))) {
          controller.setRelation?.(selected, "friendly", {
            score: Math.max(1, Number(relation.score || 0) + 3)
          });
        }
        return this.progressRuntimeValidationSlot(mission.id, slot, 1);
      }
      return false;
    }

    handleCivilizationArchObjectEvent(rawEvent = {}) {
      const mission = this.byId.get("ARCH-38");
      if (!mission || !this.missionLifecycle(mission.id).active) return false;
      const types = BF.ObjectEvents?.types || {};
      if (String(rawEvent?.type || "") !== String(types.NPC_CONTACTED || "NPC_CONTACTED")) {
        return false;
      }
      const detail = rawEvent?.detail || {};
      if (String(detail.interactionSource || "manual") !== "manual") return false;
      const civilizationId = lower(detail.civilizationId);
      if (!["translucent", "rocky"].includes(civilizationId)) return false;

      const manager = this.manager();
      const tree = manager?.trees?.get?.(mission.id);
      const translucent = tree?.find?.(`${mission.id}:approachTranslucent`);
      const rocky = tree?.find?.(`${mission.id}:approachRocky`);
      if (!translucent?.isComplete || !rocky?.isComplete) return false;

      const existing = manager.memory.getFact?.("civilization:arch-selected", null);
      if (existing?.civilizationId && existing.civilizationId !== civilizationId) return false;

      manager.memory.setFact?.("civilization:arch-selected", {
        civilizationId,
        cuoType: String(detail.cuoType || ""),
        selectedAt: existing?.selectedAt || Date.now(),
        sourceMissionId: mission.id
      });
      manager.memory.save?.();
      return this.progressRuntimeValidationSlot(
        mission.id,
        mission.runtimeValidation?.contactSlot || "firstContact",
        1
      );
    }

    handleEnergyMissionObjectEvent(rawEvent = {}) {
      const type = String(rawEvent?.type || "");
      const detail = rawEvent?.detail || {};
      const source = String(detail.interactionSource || "");
      const droneType = String(detail.droneType || "");
      const tags = new Set(asArray(rawEvent?.tags).map(lower));
      const types = BF.ObjectEvents?.types || {};
      const mission = this.byId.get("ENE-13");
      if (!mission || !this.missionLifecycle(mission.id).active) return false;

      if (
        type === String(types.DRONE_ACTIVATED || "DRONE_ACTIVATED") &&
        source === "drone" &&
        droneType === "scout_drone"
      ) {
        if (detail.accumulatorConsumed !== true) {
          const transactionId = "ENE-13:scout-activation:accumulator:v1";
          const removed = BF.consumeInventoryPoolOnce?.(transactionId, ["accumulator"], 1) || 0;
          if (removed !== 1) {
            BF.currentEngine?.callbacks?.onStatus?.("Il me faut un accumulateur réel avant d’alimenter le drone éclaireur.");
            return false;
          }
        }
        return this.progressRuntimeValidationSlot(
          mission.id,
          mission.runtimeValidation?.activationSlot || "activate",
          1
        );
      }

      if (
        type === String(types.OBJECT_SEEN || "OBJECT_SEEN") &&
        source === "drone" &&
        tags.has("drone-scouted")
      ) {
        return this.progressRuntimeValidationSlot(
          mission.id,
          mission.runtimeValidation?.scoutSlot || "scout",
          1
        );
      }
      return false;
    }

    reconcileEnergyMissionRuntime(mission) {
      if (!mission || !this.missionLifecycle(mission.id).active) return false;
      const validation = mission.runtimeValidation || {};
      if (validation.type !== "ene14-energy-network") return false;
      const completed = this.missionLifecycle(validation.reuseMissionId).completed;
      if (!completed) return false;
      return this.progressRuntimeValidationSlot(
        mission.id,
        validation.reuseSlot || "measurements",
        Math.max(1, Number(validation.reuseAmount) || 1)
      );
    }


    longExpeditionRemarkableMap(mapId, featuredMicroSceneIds = []) {
      const definition = BF.maps?.[String(mapId || "")] || {};
      const cadence = definition?.generator?.cadence || {};
      if (cadence.rareBiomeForced === true || cadence.remarkableGuaranteed === true) return true;
      return asArray(featuredMicroSceneIds).some((id) => {
        const scene = BF.MicroScenes?.get?.(id);
        return scene?.custom === true || ["rare", "story"].includes(String(scene?.rarity || "").toLowerCase());
      });
    }

    captureLongExpeditionRemarkableMap(detail = {}, event = {}) {
      if (detail.isNew !== true || !event.mapId) return false;
      if (!this.longExpeditionRemarkableMap(event.mapId, event.featuredMicroSceneIds)) return false;
      const manager = this.manager();
      if (!manager?.memory) return false;
      let changed = false;
      for (const mission of this.allMissions()) {
        const validation = mission?.runtimeValidation || {};
        if (validation.type !== "long-expedition" || !validation.remarkableFact) continue;
        if (!this.missionLifecycle(mission.id).active) continue;
        manager.memory.setFact?.(validation.remarkableFact, {
          mapId: String(event.mapId),
          featuredMicroSceneIds: [...asArray(event.featuredMicroSceneIds)],
          biome: event.biome || null,
          capturedAt: Date.now()
        });
        changed = true;
      }
      if (changed) manager.memory.save?.();
      return changed;
    }

    reconcileLongExpeditionNavigationTargets() {
      const manager = this.manager();
      const network = BF.SpecialObjectRuntime?.routingNetwork?.();
      if (!manager?.memory || !network?.hub?.mapId) return false;
      const destinations = asArray(network.destinations)
        .filter((entry) => entry?.mapId)
        .sort((left, right) => String(left.mapId).localeCompare(String(right.mapId)));
      let changed = false;

      for (const mission of this.allMissions()) {
        const validation = mission?.runtimeValidation || {};
        if (validation.type !== "long-expedition" || !this.missionLifecycle(mission.id).active) continue;

        if (validation.hubTargetFact) {
          const key = String(validation.hubTargetFact);
          const previous = manager.memory.getFact?.(key, null);
          if (String(previous?.mapId || "") !== String(network.hub.mapId)) {
            manager.memory.setFact?.(key, { mapId: String(network.hub.mapId), source: "teleporter-network", updatedAt: Date.now() });
            changed = true;
          }
        }

        if (validation.teleportTargetFact) {
          const key = String(validation.teleportTargetFact);
          const previous = manager.memory.getFact?.(key, null);
          const currentMapId = String(BF.currentEngine?.currentMapId || "");
          const excluded = validation.excludeTeleportMapFact
            ? String(manager.memory.getFact?.(validation.excludeTeleportMapFact, null)?.mapId || "")
            : "";
          const eligible = destinations.filter((entry) =>
            String(entry.mapId) !== currentMapId && (!excluded || String(entry.mapId) !== excluded)
          );
          const previousStillValid = eligible.some((entry) => String(entry.mapId) === String(previous?.mapId || ""));
          const selected = previousStillValid ? previous : eligible[0] || null;
          if (selected && String(previous?.mapId || "") !== String(selected.mapId || "")) {
            manager.memory.setFact?.(key, { mapId: String(selected.mapId), source: "teleporter-network", updatedAt: Date.now() });
            changed = true;
          }
        }
      }
      if (changed) manager.memory.save?.();
      return changed;
    }

    reconcileLongExpeditionValidations() {
      const manager = this.manager();
      if (!manager?.memory) return false;
      let changed = this.reconcileLongExpeditionNavigationTargets();
      for (const mission of this.allMissions()) {
        const validation = mission?.runtimeValidation || {};
        if (validation.type !== "long-expedition" || !this.missionLifecycle(mission.id).active) continue;
        const remarkableSlot = String(validation.remarkableSlot || "");
        const remarkableFact = String(validation.remarkableFact || "");
        if (remarkableSlot && remarkableFact && manager.memory.getFact?.(remarkableFact, null)?.mapId) {
          changed = this.progressRuntimeValidationSlot(mission.id, remarkableSlot, 1) || changed;
        }
      }
      return changed;
    }

    handleLongExpeditionStudyEvent(event = {}) {
      if (!["interaction.observe", "interaction.inspect", "interaction.analyze"].includes(String(event.type || ""))) return false;
      const manager = this.manager();
      if (!manager?.memory) return false;
      let changed = false;
      for (const mission of this.allMissions()) {
        const validation = mission?.runtimeValidation || {};
        if (validation.type !== "long-expedition" || !validation.studySlot || !validation.remarkableFact) continue;
        if (!this.missionLifecycle(mission.id).active) continue;
        const fact = manager.memory.getFact?.(validation.remarkableFact, null);
        if (!fact?.mapId || String(fact.mapId) !== String(event.mapId || "")) continue;
        changed = this.progressRuntimeValidationSlot(mission.id, String(validation.studySlot), 1) || changed;
      }
      return changed;
    }

    progressLongExpeditionTeleport(detail = {}) {
      if (String(detail.source || "") !== "teleporter" || String(detail.mode || "") !== "teleport") return false;
      const manager = this.manager();
      if (!manager?.memory) return false;
      let changed = false;
      for (const mission of this.allMissions()) {
        const validation = mission?.runtimeValidation || {};
        if (validation.type !== "long-expedition" || !validation.distinctTeleportSlot) continue;
        if (!this.missionLifecycle(mission.id).active) continue;
        if (validation.distinctTeleportDirection && String(validation.distinctTeleportDirection) !== String(detail.direction || "")) continue;
        const excluded = validation.excludeTeleportMapFact
          ? manager.memory.getFact?.(validation.excludeTeleportMapFact, null)?.mapId
          : null;
        const targetMapId = String(detail.toMapId || detail.mapId || "");
        if (!targetMapId || (excluded && String(excluded) === targetMapId)) continue;
        changed = this.progressRuntimeValidationSlot(mission.id, String(validation.distinctTeleportSlot), 1) || changed;
      }
      return changed;
    }

    onSiteEstablished(detail = {}) {
      let changed = this.reconcileObsoleteConstructionMissions({
        mapId: detail.mapId || BF.currentEngine?.currentMapId || ""
      }) > 0;
      if (String(detail.kind || "") !== "deployed_beacon") return changed;
      const manager = this.manager();

      const mission = this.byId.get("BAL-03");
      if (mission && this.missionLifecycle(mission.id).active) {
        const validation = mission.runtimeValidation || {};
        if (validation.type === "bal03-deployed-beacon") {
          const fact = manager?.memory?.getFact?.(validation.requiredMapFact, null);
          const field = String(validation.requiredMapField || "mapId");
          const targetMapId = String(fact?.[field] || fact?.mapId || "");
          if (targetMapId && String(detail.mapId || "") === targetMapId) {
            changed = this.progressRuntimeValidationSlot(
              mission.id,
              validation.slot || "deployBeacon",
              1
            ) || changed;
          }
        }
      }

      for (const entry of this.allMissions()) {
        const validation = entry?.runtimeValidation || {};
        if (validation.type !== "long-expedition" || !validation.beaconSlot || !validation.beaconMapFact) continue;
        if (!this.missionLifecycle(entry.id).active) continue;
        const required = manager?.memory?.getFact?.(validation.beaconMapFact, null);
        const targetMapId = String(required?.mapId || required?.toMapId || "");
        const actualMapId = String(detail.mapId || "");
        if (!targetMapId || targetMapId !== actualMapId) continue;
        if (validation.excludeBeaconMapFact) {
          const excluded = manager?.memory?.getFact?.(validation.excludeBeaconMapFact, null)?.mapId;
          if (excluded && String(excluded) === actualMapId) continue;
        }
        const progressed = this.progressRuntimeValidationSlot(entry.id, String(validation.beaconSlot), 1);
        if (!progressed) continue;
        if (validation.beaconFact) {
          manager?.memory?.setFact?.(validation.beaconFact, {
            mapId: actualMapId,
            establishedAt: Date.now(),
            instanceId: detail.instanceId || null
          });
          manager?.memory?.save?.();
        }
        changed = true;
      }
      return changed;
    }

    onObjectEvent(rawEvent) {
      this.handleCivilizationContactEvent(rawEvent);
      this.handleCivilizationArchObjectEvent(rawEvent);
      this.handleEnergyMissionObjectEvent(rawEvent);
      this.handleDroneMissionObjectEvent(rawEvent);
      this.handleFaunaSpeciesObjectEvent(rawEvent);
      const normalized = this.normalizeObjectEvent(rawEvent);
      if (!normalized) return;
      this.handleFinalCoreIntegration(normalized);
      this.handleLongExpeditionStudyEvent(normalized);
      this.recordObservation(rawEvent);
      const droneHistoricalObservation =
        String(rawEvent?.detail?.interactionSource || "") === "drone" &&
        String(rawEvent?.type || "") === String(BF.ObjectEvents?.types?.OBJECT_SEEN || "OBJECT_SEEN") &&
        new Set(asArray(rawEvent?.tags).map(lower)).has("drone-scouted");
      // Le Scout enrichit l'historique mondial via l'événement canonique, mais
      // ne crédite aucune observation missionnelle ordinaire. ENE-13 a déjà
      // consommé explicitement cet événement juste au-dessus.
      if (droneHistoricalObservation) return;
      const activeBefore = new Set(
        this.catalog
          .filter((mission) => this.missionLifecycle(mission.id).active)
          .map((mission) => mission.id)
      );

      // 1) Evénement concret : collect/analyze/observe/etc.
      let result = this.consumeTriggerEvent(normalized);
      let activatedMissionId = result.activatedMissionId || null;
      let allowActivation = !activatedMissionId;

      // 2) Evénement narratif générique : toute interaction réelle avec
      // l'objet. Il est volontairement indépendant de l'état "connu" CUO.
      // Cela permet à une mission ajoutée plus tard de se révéler même si
      // BlueFox a déjà observé/analysé/collecté ce type d'objet auparavant.
      result = this.consumeTriggerEvent({
        ...normalized,
        type: "interaction.any",
        amount: 1
      }, { allowActivation });
      activatedMissionId = activatedMissionId || result.activatedMissionId || null;
      allowActivation = allowActivation && !result.activatedMissionId;

      // 3) Première interaction d'étude : conservée comme vocabulaire
      // distinct pour les missions qui exigent explicitement une découverte.
      if ([
        "interaction.observe",
        "interaction.inspect",
        "interaction.analyze"
      ].includes(normalized.type)) {
        result = this.consumeTriggerEvent({
          ...normalized,
          type: "interaction.discovery",
          amount: 1
        }, { allowActivation });
        activatedMissionId = activatedMissionId || result.activatedMissionId || null;
      }

      const activatedNow = Boolean(activatedMissionId) || this.allMissions().some((mission) =>
        !activeBefore.has(mission.id) && this.missionLifecycle(mission.id).active
      );
      if (activatedNow && rawEvent.id) {
        this.activationEventIds.add(rawEvent.id);
        if (activatedMissionId) {
          this.activationEventMissionIds.set(rawEvent.id, activatedMissionId);
        }
        global.setTimeout?.(() => {
          this.activationEventIds.delete(rawEvent.id);
          this.activationEventMissionIds.delete(rawEvent.id);
        }, 0);
      }

      this.bridgeMissionProgress(rawEvent);
      this.reconcileEnvironmentLocalMap(rawEvent?.mapId || BF.currentEngine?.currentMapId);
      this.reconcileEnvironmentWorld();
    }

    onExplorationChanged(detail) {
      const manager = this.manager();
      const mapId = String(detail.mapId || "");
      if (!mapId) return false;
      let changed = this.reconcileEnvironmentAll(mapId);
      if (!manager?.memory?.getFact?.("localExplorationUnlocked:v1", false)) {
        return changed;
      }

      // WorldEngine place BlueFox avant l'événement de transition. Le tracker
      // peut donc émettre une première surface au spawn : elle ne doit jamais
      // révéler une nouvelle LOC-05. La première variation d'exploration
      // post-arrivée, elle, est une preuve de déplacement/exploration réelle.
      if (this.localExplorationSessionMapId &&
          mapId !== this.localExplorationSessionMapId) {
        this.localExplorationAwaitingPostArrival = mapId;
        return false;
      }
      if (this.localExplorationAwaitingPostArrival === mapId) {
        this.localExplorationAwaitingPostArrival = null;
      }
      this.localExplorationSessionMapId = mapId;
      return this.reconcileLocalExplorationMap(mapId, detail.surfacePercent) || changed;
    }


    fau01NestScene(map = BF.currentEngine?.currentMap) {
      const sceneId = "MSC-CUSTOM-NID-DE-FAUNE5";
      const scenes = asArray(map?.group?.userData?.microScenes);
      return scenes.find((entry) =>
        String(entry?.id || "") === sceneId &&
        String(entry?.missionId || "") === "FAU-01"
      ) || null;
    }

    fau01FaunaDescriptor(object) {
      if (!object) return null;
      const root =
        object?.userData?.worldAnchor ||
        object?.parent ||
        object;
      const data = object?.userData || {};
      const rootData = root?.userData || {};
      const definition =
        data.functional ||
        rootData.functional ||
        BF.ObjectLibrary?.getById?.(data.catalogId || rootData.catalogId) ||
        BF.ObjectLibrary?.get?.(
          data.libraryType ||
          rootData.libraryType ||
          rootData.objectType
        ) ||
        null;
      const type = String(
        data.libraryType ||
        rootData.libraryType ||
        rootData.objectType ||
        definition?.type ||
        ""
      );
      const actions = new Set(asArray(definition?.interaction?.actions).map(lower));
      const studyCompatible =
        actions.has("observe") ||
        actions.has("inspect") ||
        actions.has("analyze") ||
        definition?.gameplay?.inspectable === true ||
        definition?.gameplay?.analyzable === true;
      if (
        !root ||
        !type ||
        BF.FaunaRuntime?.isFaunaType?.(type) !== true ||
        !studyCompatible
      ) return null;
      return { object, root, data, rootData, definition, type };
    }

    bindFau01NestFauna(scene, descriptor) {
      const sceneId = "MSC-CUSTOM-NID-DE-FAUNE5";
      const root = descriptor?.root;
      const object = descriptor?.object;
      if (!scene?.instanceRoot || !root?.userData || !object?.userData) return false;

      const persistentId = String(
        scene.instanceRoot?.userData?.persistentMicroSceneId ||
        scene.instanceId ||
        ""
      );
      const contextRole = String(
        scene.contextRole ||
        scene.instanceRoot?.userData?.contextRole ||
        "faunaFirstApproach"
      );

      const metadata = {
        microSceneId: sceneId,
        bibleMissionId: "FAU-01",
        contextRole
      };
      if (persistentId) metadata.persistentMicroSceneId = persistentId;

      Object.assign(root.userData, metadata, {
        fau01NestFauna: true
      });
      Object.assign(object.userData, metadata, {
        fau01NestFauna: true
      });

      scene.instanceRoot.userData.fau01NestFaunaBound = true;
      scene.instanceRoot.userData.fau01NestFaunaInstanceId = String(
        root.userData.instanceId ||
        object.userData.instanceId ||
        ""
      ) || null;
      return true;
    }

    spawnFau01NestFauna(scene, mapDefinition, map) {
      const engine = BF.currentEngine;
      const THREE = engine?.THREE;
      if (
        !scene?.instanceRoot ||
        !map?.group ||
        !THREE ||
        !BF.ObjectSpawner ||
        !BF.ObjectLibrary ||
        !BF.FaunaRuntime
      ) return null;

      const faunaTypes = asArray(BF.FaunaRuntime.faunaTypes?.());
      const type = faunaTypes.find((candidate) => {
        const definition = BF.ObjectLibrary.get?.(candidate);
        const actions = new Set(asArray(definition?.interaction?.actions).map(lower));
        return Boolean(
          definition &&
          (
            actions.has("observe") ||
            actions.has("inspect") ||
            actions.has("analyze") ||
            definition?.gameplay?.inspectable === true ||
            definition?.gameplay?.analyzable === true
          )
        );
      });
      if (!type) return null;

      const nestRecord = asArray(scene.records).find((record) =>
        lower(record?.type) === "abandoned_nest"
      );
      const anchorObject =
        nestRecord?.objectRoot ||
        nestRecord?.root ||
        scene.instanceRoot;
      const worldPoint = this.observationPoint(anchorObject, engine);
      const localPoint = new THREE.Vector3(
        Number(worldPoint.x) || 0,
        Number(worldPoint.y) || 0,
        Number(worldPoint.z) || 0
      );

      map.group.updateWorldMatrix?.(true, false);
      map.group.worldToLocal?.(localPoint);
      // Décalage court et déterministe : la faune reste dans le nid sans
      // superposer exactement son origine à celle du décor.
      localPoint.x += 0.45;
      localPoint.z += 0.25;

      const spawner = new BF.ObjectSpawner({
        THREE,
        scene: map.group,
        palette: mapDefinition?.palette
      });
      const spawned = spawner.spawn(type, {
        position: {
          x: localPoint.x,
          y: localPoint.y,
          z: localPoint.z
        },
        variant: 0,
        rotation: Number(scene.instanceRoot.rotation?.y) || 0,
        force: true,
        scene: map.group,
        palette: mapDefinition?.palette,
        source: "bible:FAU-01:nest-fauna"
      });
      if (!spawned?.root) return null;

      const hitbox = spawned.instance?.hitbox || null;
      if (hitbox && Array.isArray(map.interactables) && !map.interactables.includes(hitbox)) {
        map.interactables.push(hitbox);
      }

      (spawned.instance?.colliders || []).forEach((collider) => {
        if (!Array.isArray(map.colliders) || !collider?.offset?.clone) return;
        spawned.root.updateWorldMatrix?.(true, false);
        const position = spawned.root.localToWorld(collider.offset.clone());
        map.colliders.push({
          position,
          radius: collider.radius,
          owner: spawned.root
        });
      });

      return hitbox || spawned.root;
    }

    reconcileFau01NestFauna(mapId = BF.currentEngine?.currentMapId) {
      if (!this.missionLifecycle("FAU-01").active) return false;

      const engine = BF.currentEngine;
      const currentMapId = String(engine?.currentMapId || "");
      if (!engine?.currentMap || String(mapId || currentMapId) !== currentMapId) {
        return false;
      }

      const map = engine.currentMap;
      const scene = this.fau01NestScene(map);
      if (!scene?.instanceRoot) return false;
      if (scene.instanceRoot.userData?.fau01NestFaunaBound === true) return true;

      const sceneId = "MSC-CUSTOM-NID-DE-FAUNE5";
      const persistentId = String(
        scene.instanceRoot?.userData?.persistentMicroSceneId ||
        scene.instanceId ||
        ""
      );
      const template = BF.MicroScenes?.get?.(sceneId);
      const radius = Math.max(1, Number(template?.radius) || 5);
      const scenePoint = this.observationPoint(scene.instanceRoot, engine);

      const descriptors = asArray(map.interactables)
        .filter((object) => object?.userData?.active !== false)
        .map((object) => this.fau01FaunaDescriptor(object))
        .filter(Boolean);

      // Si une instance a déjà été reliée à ce nid, elle reste l'unique vérité.
      const alreadyBound = descriptors.find(({ object, root }) => {
        const actualSceneId = String(
          object?.userData?.microSceneId ||
          root?.userData?.microSceneId ||
          ""
        );
        const actualPersistentId = String(
          object?.userData?.persistentMicroSceneId ||
          root?.userData?.persistentMicroSceneId ||
          ""
        );
        return actualSceneId === sceneId &&
          (!persistentId || !actualPersistentId || actualPersistentId === persistentId);
      });
      if (alreadyBound) return this.bindFau01NestFauna(scene, alreadyBound);

      const nearby = descriptors
        .filter(({ object, root }) => {
          const existingSceneId = String(
            object?.userData?.microSceneId ||
            root?.userData?.microSceneId ||
            ""
          );
          const existingMissionId = String(
            object?.userData?.bibleMissionId ||
            root?.userData?.bibleMissionId ||
            ""
          );
          if (existingSceneId && existingSceneId !== sceneId) return false;
          if (existingMissionId && existingMissionId !== "FAU-01") return false;
          const point = this.observationPoint(object, engine);
          return Math.hypot(
            Number(point.x) - Number(scenePoint.x),
            Number(point.z) - Number(scenePoint.z)
          ) <= radius + 1;
        })
        .sort((left, right) => {
          const lp = this.observationPoint(left.object, engine);
          const rp = this.observationPoint(right.object, engine);
          const ld = Math.hypot(
            Number(lp.x) - Number(scenePoint.x),
            Number(lp.z) - Number(scenePoint.z)
          );
          const rd = Math.hypot(
            Number(rp.x) - Number(scenePoint.x),
            Number(rp.z) - Number(scenePoint.z)
          );
          return ld - rd;
        })[0] || null;

      if (nearby) return this.bindFau01NestFauna(scene, nearby);

      const mapDefinition = BF.maps?.[currentMapId] || null;
      const spawnedTarget = this.spawnFau01NestFauna(scene, mapDefinition, map);
      const spawnedDescriptor = this.fau01FaunaDescriptor(spawnedTarget);
      return spawnedDescriptor
        ? this.bindFau01NestFauna(scene, spawnedDescriptor)
        : false;
    }

    onMapTransition(detail) {
      // La transition est émise après chargement de la map courante.
      this.captureObservationMap(BF.currentEngine);
      this.reconcileEnvironmentAll(detail.toMapId || detail.mapId || BF.currentEngine?.currentMapId);
      this.reconcilePersistentWorldScenes();
      this.reconcileWorldTopologyLinks();
      this.reconcileSlotInventoryGrantEffects();
      this.reconcileSlotFactEffects();

      const eventMapId = detail.toMapId || detail.mapId || null;
      const mapDefinition = BF.maps?.[eventMapId] || null;
      const missionPrescribedMicroSceneIds = asArray(mapDefinition?.persistentMicroScenes)
        .filter((entry) => {
          const mission = this.byId?.get?.(String(entry?.missionId || ""));
          const required = asArray(mission?.trigger?.featuredMicroSceneIdsAny)
            .map(String);
          return entry?.microSceneId && required.includes(String(entry.microSceneId));
        })
        .map((entry) => String(entry.microSceneId));
      const plannedFeaturedMicroSceneIds = new Set([
        ...asArray(mapDefinition?.generator?.featuredMicroSceneIds),
        mapDefinition?.generator?.featuredMicroSceneId,
        ...missionPrescribedMicroSceneIds
      ].map(String).filter(Boolean));
      const currentMap = String(BF.currentEngine?.currentMapId || "") === String(eventMapId || "")
        ? BF.currentEngine?.currentMap
        : null;
      const materializedMicroSceneIds = new Set(
        asArray(currentMap?.group?.userData?.microScenes)
          .map((entry) => String(entry?.id || ""))
          .filter(Boolean)
      );
      const featuredMicroSceneIds = [...plannedFeaturedMicroSceneIds]
        .filter((id) => materializedMicroSceneIds.has(id));
      const event = {
        fromMapId: detail.fromMapId || null,
        toMapId: eventMapId,
        mapId: eventMapId,
        direction: lower(detail.direction) || null,
        biome: lower(detail.biome || mapDefinition?.generator?.biomeId) || null,
        featuredMicroSceneIds,
        amount: 1
      };

      this.captureLongExpeditionRemarkableMap(detail, event);
      this.progressLongExpeditionTeleport(detail);

      const crossing = this.consumeTriggerEvent({
        ...event,
        type: "movement.portal_crossed"
      });

      if (detail.isNew === true) {
        this.consumeTriggerEvent({
          ...event,
          type: "exploration.map_discovered"
        }, { allowActivation: !crossing.activatedMissionId });
      }

      // FAU-01 devient active sur la découverte de cette map. À ce stade la
      // MSC persistante est matérialisée et le lifecycle est connu : on peut
      // relier une vraie faune locale au nid, ou en garantir une seule si
      // aucune instance compatible n'existe dans son voisinage immédiat.
      this.reconcileFau01NestFauna(event.mapId);

      this.reviewConstructionReadiness();
      this.scheduleCurrentSiteRestore(event.mapId);

      if (this.manager()?.memory?.getFact?.("localExplorationUnlocked:v1", false)) {
        this.pauseOffMapLocalExploration(event.mapId);
        this.resumeCurrentMapLocalMissions(event.mapId);
        const manager = this.manager();
        const hasExistingLocalInstance = this.localExplorationTemplates().some((template) => {
          const instanceId = this.localExplorationInstanceId(template.id, event.mapId);
          return Boolean(manager?.memory?.state?.missionLifecycle?.[instanceId]);
        });
        this.localExplorationSessionMapId = event.mapId;
        if (hasExistingLocalInstance) {
          this.localExplorationAwaitingPostArrival = null;
          const exploration = BF.getMapExplorationState?.(event.mapId);
          this.reconcileLocalExplorationMap(event.mapId, exploration?.surfacePercent);
        } else {
          this.localExplorationAwaitingPostArrival = event.mapId;
        }
      }
    }

    isActivationEvent(eventId) {
      return Boolean(eventId && this.activationEventIds.has(eventId));
    }

    activationMissionForEvent(eventId) {
      return eventId ? this.activationEventMissionIds.get(eventId) || null : null;
    }

    bridgeMissionProgress(event) {
      const manager = this.manager();
      if (!manager?.consumeObjectEvent) return false;

      // Object-M0 possède déjà le fan-out standard. On ne le double pas.
      return false;
    }

    findMissionEntry(state, missionId) {
      return (state?.missions || []).find((entry) =>
        (entry.missionId || entry.id) === missionId
      ) || null;
    }

    walkTree(node, callback) {
      if (!node) return;
      callback(node);
      (node.children || []).forEach((child) =>
        this.walkTree(child, callback)
      );
    }

    nodeForSlot(entry, missionId, slot) {
      let found = null;
      const separator = String(missionId || "").indexOf("@");
      const scopedNodeId = separator > 0
        ? `${missionId.slice(0, separator)}:${slot}@${missionId.slice(separator + 1)}`
        : null;
      this.walkTree(entry?.tree?.root, (node) => {
        if (
          node.id === `${missionId}:${slot}` ||
          (scopedNodeId && node.id === scopedNodeId)
        ) found = node;
      });
      return found;
    }

    emitRevealedOnce(mission, context = {}) {
      const key = mission.repeatable
        ? `${mission.id}:revealed:${Math.max(0, Number(this.manager()?.memory?.state?.missionLifecycle?.[mission.id]?.repeatCount) || 0)}`
        : `${mission.id}:revealed`;
      if (this.state.progressNarrative[key]) return false;

      this.state.progressNarrative[key] = Date.now();
      this.saveState();
      return this.emitNarrative(mission, "revealed", context);
    }

    emitProgressNarrative(mission, entry) {
      for (const [index, milestone] of
        (mission.narrative?.progress || []).entries()) {
        const key = `${mission.id}:progress:${index}`;
        if (this.state.progressNarrative[key]) continue;

        let reached = false;

        if (milestone.slot) {
          const node = this.nodeForSlot(entry, mission.id, milestone.slot);
          if (!node) continue;

          if (milestone.atCount != null) {
            reached =
              Number(node.progress) >= Number(milestone.atCount);
          } else if (milestone.at != null) {
            reached =
              Number(node.progress) /
                Math.max(1, Number(node.target) || 1) >=
              Number(milestone.at);
          }
        } else if (milestone.at != null) {
          reached = Number(entry.progress) >= Number(milestone.at);
        }

        if (!reached) continue;

        this.state.progressNarrative[key] = Date.now();
        this.saveState();

        if (milestone.route === "journal") {
          BF.addJournalEntry?.({
            id: `bible:${key}`,
            type: "bible",
            title: mission.title,
            text: milestone.text,
            mapId: BF.currentEngine?.currentMapId || null,
            zoneId: BF.currentEngine?.currentZoneIndex ?? null,
            important: false
          });
          continue;
        }

        this.queueNarrativeLine({
          id: `bible:${key}`,
          title: mission.title,
          text: milestone.text,
          mapId: BF.currentEngine?.currentMapId || null,
          zoneId: BF.currentEngine?.currentZoneIndex ?? null,
          important: false
        });
      }
    }

    shelterObjects() {
      const engine = BF.currentEngine;
      if (!engine?.scene) return [];

      const result = [];
      engine.scene.traverse?.((object) => {
        const id = lower(
          object?.userData?.catalogId ||
          object?.userData?.libraryType ||
          object?.userData?.functional?.id ||
          object?.name
        );
        if (!id) return;
        let kind = null;
        if (id.includes("refuge")) kind = "refuge";
        else if (id.includes("base")) kind = "base";
        else if (id === "camp" || id.includes("camp_") || id.includes("_camp")) kind = "camp";
        if (kind) result.push({ kind, object });
      });

      const sites = this.siteBucket(engine.currentMapId);
      Object.values(sites).filter(Boolean).forEach((site) => {
        if (!Number.isFinite(Number(site?.anchor?.x)) || !Number.isFinite(Number(site?.anchor?.z))) return;
        result.push({ kind: site.kind, site: true, id: site.id, position: site.anchor });
      });
      return result;
    }

    missionTargetMapId(mission) {
      const direct = mission?.targetMapId || mission?.completionGate?.mapId;
      if (direct) return String(direct);
      const factKey = String(mission?.targetMapFact || "").trim();
      if (!factKey) return "";
      const fact = this.manager()?.memory?.getFact?.(factKey, null);
      const field = String(mission?.targetMapField || "mapId").trim();
      return String(fact?.[field] || fact?.mapId || "");
    }

    shelterProximitySatisfied(gate, mapOverride = null) {
      const engine = BF.currentEngine;
      const requiredMapId = mapOverride || (gate?.mapId != null ? String(gate.mapId) : null);
      const p = engine?.character?.root?.position;
      if (!p) return false;
      const allowed = new Set(gate?.shelterKinds || ["camp", "refuge", "base"]);
      const radius = Math.max(0.5, Number(gate?.radius) || 8);
      const requiredSiteId = gate?.siteId != null ? String(gate.siteId) : null;
      if (requiredMapId && String(engine.currentMapId || "") !== requiredMapId) return false;
      return this.shelterObjects().some((record) => {
        if (!allowed.has(record.kind)) return false;
        const recordSiteId = String(
          record.object?.userData?.establishedSite ||
          record.object?.userData?.siteId ||
          record.id || ""
        );
        if (requiredSiteId != null && recordSiteId !== requiredSiteId) return false;
        const q = record.object?.getWorldPosition
          ? record.object.getWorldPosition(new engine.THREE.Vector3())
          : record.position;
        return q && Math.hypot(p.x - q.x, p.z - q.z) <= radius;
      });
    }

    gateSatisfied(mission) {
      const gate = mission?.completionGate;
      if (!gate) return true;
      if (this.state.gatesSatisfied[mission.id]) return true;
      if (gate.type !== "proximity.shelter") return false;

      const requiredMapId = this.missionTargetMapId(mission) || null;
      const satisfied = this.shelterProximitySatisfied(gate, requiredMapId);
      if (!satisfied || gate.requireDeposit === true) return false;
      if (!this.bagCounterSatisfied(gate)) return false;
      if (!this.inventoryEffectsReady(mission)) return false;
      this.state.gatesSatisfied[mission.id] = Date.now();
      this.saveState();
      return true;
    }

    markDepositCompletionGates() {
      const manager = this.manager();
      if (!manager) return false;
      let changed = false;
      this.allMissions().forEach((mission) => {
        const gate = mission?.completionGate;
        if (gate?.type !== "proximity.shelter" || gate.requireDeposit !== true) return;
        if (this.state.gatesSatisfied[mission.id]) return;
        const lifecycle = manager.memory?.state?.missionLifecycle?.[mission.id];
        const tree = manager.trees?.get?.(mission.id);
        if (lifecycle?.status !== "active" || !tree?.root?.isComplete) return;
        const targetMapId = this.missionTargetMapId(mission) || null;
        if (!this.shelterProximitySatisfied(gate, targetMapId)) return;
        if (!this.bagCounterSatisfied(gate)) return;
        if (!this.inventoryEffectsReady(mission)) return;
        this.state.gatesSatisfied[mission.id] = Date.now();
        changed = true;
      });
      if (changed) {
        this.saveState();
        manager.syncLifecycleFromTrees?.();
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
        manager.publish?.();
      }
      return changed;
    }

    canFinalizeMission(missionId) {
      const mission = this.byId.get(missionId);
      if (!mission) return true;
      const standaloneConsumes = this.standaloneInventoryConsumeMission(mission);
      const establish = this.constructionPlacementEffect(mission);
      if (!mission.completionGate && !standaloneConsumes && !establish) return true;

      if (establish) {
        const kind = lower(establish.kind);
        const mapId =
          this.missionTargetMapId(mission) ||
          (!mission.completionGate ? String(BF.currentEngine?.currentMapId || "") : "");
        const currentSite = () => mapId ? this.siteBucket(mapId)?.[kind] : null;
        const isEstablished = (site) =>
          Boolean(site) &&
          String(site.mapId || "") === mapId &&
          String(site.missionId || "") === String(mission.id || "");

        // Pour une construction répétable, un ancien gate/receipt ne constitue
        // jamais une preuve de fin : le site réel de CETTE mission doit exister.
        if (!isEstablished(currentSite())) {
          delete this.state.gatesSatisfied[mission.id];

          // Les constructions qui portent un completionGate conservent leur
          // parcours existant (retour de map / placement joueur ou autonomie).
          if (mission.completionGate) return false;

          // Une construction missionnelle sans gate (T03 et futurs équivalents)
          // reste atomique : ressources -> spawn -> consommation -> persistance.
          if (!this.inventoryEffectsReady(mission)) {
            const resourceStatus = this.constructionResourceStatus(mission);
            this.pendingConstructionResourceMissions.add(mission.id);
            this.publishConstructionResourceStatus(mission, resourceStatus);
            return false;
          }
          this.pendingConstructionResourceMissions.delete(mission.id);
          if (!this.applyEffects(mission, { source: "mission-completion" })) return false;
          if (!isEstablished(currentSite())) return false;
        }

        if (!this.state.gatesSatisfied[mission.id]) {
          this.state.gatesSatisfied[mission.id] = Date.now();
          this.saveState();
        }
        return true;
      }

      if (mission.completionGate && !this.gateSatisfied(mission)) return false;
      if (standaloneConsumes) {
        const effectKey = this.repeatableEffectKey(mission);
        const receiptId = `${effectKey}:completion:v${mission.version || 1}`;
        const memory = this.manager()?.memory;
        if (memory?.hasEffectReceipt?.(receiptId)) {
          this.pendingConstructionResourceMissions.delete(mission.id);
          return true;
        }
        if (!this.inventoryEffectsReady(mission)) {
          const resourceStatus = this.constructionResourceStatus(mission);
          this.pendingConstructionResourceMissions.add(mission.id);
          this.publishConstructionResourceStatus(mission, resourceStatus);
          return false;
        }
        this.pendingConstructionResourceMissions.delete(mission.id);
        return this.applyEffects(mission, { source: "mission-completion" });
      }
      return true;
    }

    updateCompletionGates(now = performance.now()) {
      if (now - this.lastGateReviewAt < 500) return false;
      this.lastGateReviewAt = now;
      const manager = this.manager();
      if (!manager) return false;
      const waiting = this.allMissions().some((mission) => {
        if (
          !mission.completionGate &&
          !this.standaloneInventoryConsumeMission(mission) &&
          !this.constructionPlacementEffect(mission)
        ) {
          return false;
        }
        const lifecycle = manager.memory?.state?.missionLifecycle?.[mission.id];
        const tree = manager.trees?.get?.(mission.id);
        return lifecycle?.status === "active" && tree?.root?.isComplete;
      });
      if (!waiting) return false;
      const before = JSON.stringify(manager.memory.state.missionLifecycle);
      manager.syncLifecycleFromTrees?.();
      const changed = before !== JSON.stringify(manager.memory.state.missionLifecycle);
      if (changed) {
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
        manager.publish?.();
      }
      return changed;
    }

    completionGateState(missionId) {
      const mission = this.byId.get(missionId);
      const standaloneConsumes = this.standaloneInventoryConsumeMission(mission);
      const establish = this.constructionPlacementEffect(mission);
      if (!mission?.completionGate && !standaloneConsumes && !establish) {
        return { managed: false, canFinalize: true, message: "" };
      }
      const canFinalize = this.canFinalizeMission(missionId);
      const kind = this.constructionPlacementEffect(mission)?.kind;
      const targetMapId = this.missionTargetMapId(mission);
      const message = kind === "refuge"
        ? `Rendez-vous sur ${targetMapId} pour installer le refuge.`
        : kind === "camp"
          ? `Rendez-vous sur ${targetMapId} pour établir le camp.`
          : standaloneConsumes && !this.inventoryEffectsReady(mission)
            ? "Les ressources missionnelles requises doivent encore être réunies."
            : "Une validation dans le monde est encore requise.";
      return { managed: true, canFinalize, message, targetMapId: targetMapId || null };
    }

    resolveSpawnOrigin(effect) {
      const engine = BF.currentEngine;
      const capsule = engine?.currentMap?.crashCapsule;
      const player = engine?.character?.root?.position;
      const anchor = effect?.placement?.anchor === "crash-capsule" && capsule
        ? capsule.position : player;
      if (!anchor) return null;
      const distance = Math.max(4, Number(effect?.placement?.distance) || 7);
      let dx = Number(anchor.x) || 0;
      let dz = Number(anchor.z) || 0;
      const length = Math.hypot(dx, dz);
      if (length < 0.1) { dx = 1; dz = 0; }
      else { dx /= length; dz /= length; }
      return {
        x: (Number(anchor.x) || 0) + dx * distance,
        y: 0,
        z: (Number(anchor.z) || 0) + dz * distance
      };
    }

    sitePlacementPreset(microSceneId, engine = BF.currentEngine) {
      return engine?.currentMap?.definition?.crashSite?.campSitePlacements?.[
        microSceneId
      ] || BF.maps?.[engine?.currentMapId]?.crashSite?.campSitePlacements?.[
        microSceneId
      ] || null;
    }

    resolveSitePlacement(effect) {
      const preset = this.sitePlacementPreset(effect?.microSceneId);
      if (preset?.position) {
        return {
          anchor: clone(preset.position),
          rotation: Array.isArray(preset.rotation)
            ? preset.rotation.map((value) => Number(value) || 0)
            : [0, Number(preset.rotation) || 0, 0]
        };
      }
      const anchor = this.resolveSpawnOrigin(effect);
      if (!anchor) return null;
      const requestedRotation = effect?.placement?.rotation;
      return {
        anchor,
        rotation: Array.isArray(requestedRotation)
          ? requestedRotation.map((value) => Number(value) || 0)
          : [0, Number(requestedRotation) || 0, 0]
      };
    }

    applyCanonicalSitePlacement(site, engine = BF.currentEngine) {
      if (site?.placementSource === "player") return site;
      const preset = this.sitePlacementPreset(site?.microSceneId, engine);
      if (!preset?.position) return site;
      site.anchor = clone(preset.position);
      site.rotation = Array.isArray(preset.rotation)
        ? preset.rotation.map((value) => Number(value) || 0)
        : [0, Number(preset.rotation) || 0, 0];
      return site;
    }

    attachSiteRecords(records, site, engine = BF.currentEngine) {
      const map = engine?.currentMap;
      if (!map || !records?.length) return false;
      const structuralSite = [
        "MSC-CUSTOM-CAMP",
        "MSC-CUSTOM-CAMP-BASE",
        "MSC-CUSTOM-CAMP-BASE-REINFORCED"
      ].includes(site?.microSceneId);
      if (structuralSite && Array.isArray(map.interactables)) {
        map.interactables = map.interactables.filter((object) =>
          String(object?.userData?.microSceneId || "") !== String(site.microSceneId)
        );
      }
      records.forEach((record, index) => {
        const root = record.root;
        if (!root) return;
        root.userData.bibleMissionId = site.missionId;
        root.userData.establishedSite = site.id;
        if (index === 0) {
          root.name = `BlueFoxSite:${site.id}`;
          root.userData.catalogId = site.kind;
          root.userData.libraryType = site.kind;
          root.userData.shelterKind = site.kind;
        }
        if (!structuralSite && record.instance?.hitbox) {
          map.interactables.push(record.instance.hitbox);
        }
        (record.instance?.colliders || []).forEach((collider) => {
          const transformRoot = record.objectRoot || root;
          transformRoot.updateWorldMatrix(true, false);
          const position = transformRoot.localToWorld(collider.offset.clone());
          map.colliders.push({ position, radius: collider.radius, owner: root });
        });
      });
      engine.character?.setColliders?.(map.colliders);
      return true;
    }

    renderSite(site, engine = BF.currentEngine) {
      const map = engine?.currentMap;
      if (!site?.id || !site?.microSceneId || !site?.anchor) return false;
      if (!engine?.THREE || !map?.group || !BF.ObjectSpawner) return false;
      if (site.mapId !== engine.currentMapId) return false;
      if (map.group.getObjectByProperty?.("name", `BlueFoxSite:${site.id}`)) return true;
      const spawner = new BF.ObjectSpawner({
        THREE: engine.THREE,
        scene: map.group,
        palette: BF.maps?.[engine.currentMapId]?.palette
      });
      const records = spawner.spawnMicroScene(
        site.microSceneId,
        {
          origin: site.anchor,
          rotation: site.rotation || [0, 0, 0],
          scene: map.group,
          force: true,
          source: `site:${site.id}`
        }
      );
      return this.attachSiteRecords(records, site, engine);
    }

    removeEstablishedSite(site, memory = this.manager()?.memory, engine = BF.currentEngine) {
      if (!site?.id || !site?.mapId || !site?.kind || !memory) return false;

      const map = engine?.currentMap;
      if (map && String(engine?.currentMapId || "") === String(site.mapId)) {
        const roots = [];
        map.group?.traverse?.((object) => {
          if (String(object?.userData?.establishedSite || "") === String(site.id)) {
            roots.push(object);
          }
        });
        roots.forEach((root) => {
          if (typeof BF.disposeObject === "function") BF.disposeObject(root);
          else root?.parent?.remove?.(root);
        });

        if (Array.isArray(map.interactables)) {
          map.interactables = map.interactables.filter((object) =>
            String(object?.userData?.establishedSite || object?.parent?.userData?.establishedSite || "") !== String(site.id)
          );
        }
        if (Array.isArray(map.colliders)) {
          map.colliders = map.colliders.filter((collider) =>
            String(collider?.owner?.userData?.establishedSite || "") !== String(site.id)
          );
          engine.character?.setColliders?.(map.colliders);
        }
      }

      const progression = memory.state?.siteProgression?.[site.mapId];
      const sites = progression?.sites;
      if (sites && typeof sites === "object") {
        const persisted = sites[site.kind];
        if (String(persisted?.id || "") === String(site.id)) {
          delete sites[site.kind];
        }
      } else if (String(progression?.id || "") === String(site.id)) {
        delete memory.state.siteProgression[site.mapId];
      }
      memory.save?.();
      return true;
    }

    storeSite(site, memory = this.manager()?.memory) {
      if (!memory || !site?.mapId || !site?.kind) return false;
      memory.state.siteProgression = memory.state.siteProgression || {};
      const previous = memory.state.siteProgression[site.mapId] || null;
      const previousSites = previous?.sites && typeof previous.sites === "object"
        ? { ...previous.sites }
        : previous?.kind
          ? { [previous.kind]: previous }
          : {};
      previousSites[site.kind] = site;
      memory.state.siteProgression[site.mapId] = {
        ...site,
        sites: previousSites
      };
      return true;
    }

    inventoryKeysForRequirement(requirement = {}) {
      const explicitKeys = asArray(requirement.inventoryKeys)
        .map((key) => String(key || "").trim())
        .filter(Boolean);
      if (explicitKeys.length) return [...new Set(explicitKeys)];
      if (requirement.inventoryKey) return [String(requirement.inventoryKey)];
      const subject = lower(requirement.subject);
      if (!subject) return [];

      const keys = new Set();
      BF.ObjectLibrary?.list?.({ status: "active" }).forEach((definition) => {
        const inventoryKey = definition?.resource?.inventoryKey;
        if (!inventoryKey) return;
        const descriptors = new Set([
          definition?.semantic?.subject,
          definition?.knowledge?.family,
          definition?.resource?.family,
          definition?.category,
          definition?.type,
          ...(definition?.spawn?.tags || []),
          ...(definition?.situation?.tags || [])
        ].map(lower).filter(Boolean));
        if (descriptors.has(subject)) keys.add(String(inventoryKey));
      });
      return [...keys];
    }

    inventoryConsumptionPlan(consumes = []) {
      const requirements = asArray(consumes)
        .filter((effect) => effect?.type === "inventory.consume")
        .map((effect) => ({
          quantity: Math.max(0, Number(effect.quantity) || 0),
          inventoryKeys: this.inventoryKeysForRequirement(effect)
        }));
      const keySet = new Set(requirements.flatMap((entry) => entry.inventoryKeys));
      const balances = Object.fromEntries([...keySet].map((key) => [
        key,
        Math.max(0, Number(BF.progression?.availableInventory?.([key])) || 0)
      ]));

      for (const requirement of requirements) {
        if (!requirement.quantity || !requirement.inventoryKeys.length) {
          return { ready: false, balances };
        }
        let remaining = requirement.quantity;
        for (const key of requirement.inventoryKeys) {
          if (remaining <= 0) break;
          const available = Math.max(0, Number(balances[key]) || 0);
          const removed = Math.min(available, remaining);
          balances[key] = available - removed;
          remaining -= removed;
        }
        if (remaining > 0) return { ready: false, balances };
      }
      return { ready: true, balances };
    }

    inventoryEffectsReady(mission) {
      const consumes = asArray(mission?.effects)
        .filter((effect) => effect?.type === "inventory.consume");
      return !consumes.length || this.inventoryConsumptionPlan(consumes).ready;
    }

    standaloneInventoryConsumeMission(mission) {
      const effects = asArray(mission?.effects);
      return (
        effects.some((effect) => effect?.type === "inventory.consume") &&
        !effects.some((effect) => effect?.type === "site.establish")
      );
    }

    bagCounterValue(counter = {}) {
      if (counter.inventoryKey) {
        const state = BF.getProgressionState?.() || BF.progression?.snapshot?.() || {};
        return Math.max(
          0,
          Number(state?.inventory?.[String(counter.inventoryKey)]) || 0
        );
      }
      if (counter.source === "rations") {
        return Math.max(0, Number(BF.getRationState?.().rations) || 0);
      }
      return null;
    }

    bagCounterSatisfied(gate = {}) {
      if (!gate.bagCounter) return true;
      const value = this.bagCounterValue(gate.bagCounter);
      if (value == null) return false;
      return value >= Math.max(1, Number(gate.bagCounter.minimum) || 1);
    }

    constructionResourceStatus(missionOrId) {
      const mission = typeof missionOrId === "string"
        ? this.byId.get(String(missionOrId))
        : missionOrId;
      if (!mission) return null;
      const consumes = asArray(mission.effects)
        .filter((effect) => effect?.type === "inventory.consume");
      if (!consumes.length) {
        return {
          missionId: mission.id,
          ready: true,
          missingTotal: 0,
          requirements: []
        };
      }
      const requirements = consumes.map((consume, index) => {
        const inventoryKeys = this.inventoryKeysForRequirement(consume);
        const required = Math.max(0, Number(consume.quantity) || 0);
        const available = inventoryKeys.length
          ? Math.max(0, Number(BF.progression?.availableInventory?.(inventoryKeys)) || 0)
          : 0;
        const missing = Math.max(0, required - available);
        return {
          index,
          inventoryKey: consume.inventoryKey || null,
          subject: consume.subject || null,
          inventoryKeys,
          required,
          available,
          missing,
          deficitRatio: required > 0 ? missing / required : 0
        };
      });
      return {
        missionId: mission.id,
        ready: requirements.every((entry) => entry.missing <= 0),
        missingTotal: requirements.reduce((sum, entry) => sum + entry.missing, 0),
        requirements
      };
    }

    constructionResourceSignature(status) {
      if (!status) return "";
      return status.requirements
        .map((entry) => `${entry.index}:${entry.available}/${entry.required}`)
        .join("|");
    }

    publishConstructionResourceStatus(mission, status = this.constructionResourceStatus(mission)) {
      if (!mission?.id || !status) return false;
      const signature = this.constructionResourceSignature(status);
      const previous = this.constructionResourceSignatures.get(mission.id) || "";
      this.constructionResourceSignatures.set(mission.id, signature);
      if (signature === previous) return false;
      global.dispatchEvent?.(new CustomEvent("bluefox:construction-resources-changed", {
        detail: clone(status)
      }));
      return true;
    }

    environmentManagedMission(mission) {
      return Boolean(
        mission?.slots?.study?.params?.envHistoricalFamily ||
        mission?.envLocal ||
        mission?.envWorld
      );
    }

    reconcileEnvironmentHistorical() {
      const manager = this.manager();
      if (!manager) return false;
      let changed = false;
      this.catalog.forEach((mission) => {
        const family = mission?.slots?.study?.params?.envHistoricalFamily;
        if (!family || !this.missionLifecycle(mission.id).active) return;
        const tree = manager.trees?.get?.(mission.id);
        const node = tree?.find?.(`${mission.id}:study`);
        if (!node) return;
        const absolute = Math.min(
          Math.max(0, Number(node.target) || 0),
          this.environmentHistoricalCount(family)
        );
        if (Number(node.progress || 0) === absolute) return;
        node.progress = absolute;
        tree.refresh?.();
        manager.memory?.saveTree?.(tree);
        changed = true;
      });
      if (changed) {
        manager.syncLifecycleFromTrees?.();
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
      }
      return changed;
    }

    activateEnvironmentGlobalFollowers() {
      for (const mission of this.catalog) {
        if (!mission?.slots?.study?.params?.envHistoricalFamily) continue;
        const sourceId = String(mission?.trigger?.missionId || "");
        if (!sourceId || !this.missionLifecycle(sourceId).completed) continue;
        const lifecycle = this.missionLifecycle(mission.id);
        if (lifecycle.active || lifecycle.completed) continue;
        if (!this.prerequisitesSatisfied(mission)) continue;
        if (this.activateMission(mission, {
          type: "progression.mission_completed",
          missionId: sourceId,
          amount: 1
        })) return 1;
      }
      return 0;
    }

    environmentInstanceId(baseId, mapId) {
      return `${String(baseId || "")}@${String(mapId || "")}`;
    }

    setEnvironmentManagedProgress(missionId, slot, value) {
      const manager = this.manager();
      const tree = manager?.trees?.get?.(missionId);
      if (!tree) return false;
      const separator = String(missionId || "").indexOf("@");
      const baseId = separator > 0 ? missionId.slice(0, separator) : missionId;
      const scopeId = separator > 0 ? missionId.slice(separator + 1) : null;
      const node = tree.find?.(`${missionId}:${slot}`) ||
        (scopeId ? tree.find?.(`${baseId}:${slot}@${scopeId}`) : null);
      if (!node) return false;
      const absolute = Math.min(
        Math.max(0, Number(node.target) || 0),
        Math.max(0, Number(value) || 0)
      );
      if (Number(node.progress || 0) === absolute) return false;
      node.progress = absolute;
      tree.refresh?.();
      manager.memory?.saveTree?.(tree);
      return true;
    }

    reconcileEnvironmentLocalMap(mapId) {
      const manager = this.manager();
      const targetMapId = String(mapId || "");
      if (!manager || !targetMapId || !this.missionLifecycle("T13").completed) return false;
      if (String(BF.currentEngine?.currentMapId || "") === targetMapId) {
        this.captureObservationMap(BF.currentEngine);
      }
      let changed = false;
      let activationUsed = false;
      for (const family of ["RELIC", "ROCK", "PLANT"]) {
        const coverage = this.environmentMapCoverage(targetMapId, family);
        if (!coverage.known || coverage.total === 0) continue;
        const id50 = this.environmentInstanceId(`ENV-MAP-${family}-50`, targetMapId);
        const mission50 = this.environmentLocalMission(id50);
        let lifecycle50 = manager.memory?.state?.missionLifecycle?.[id50];
        if (!lifecycle50 && !activationUsed && mission50) {
          if (this.activateMission(mission50, { type: "environment.map", mapId: targetMapId, amount: 1 })) {
            changed = true;
            activationUsed = true;
          }
          lifecycle50 = manager.memory?.state?.missionLifecycle?.[id50];
        } else if (lifecycle50?.status === "paused" && String(BF.currentEngine?.currentMapId || "") === targetMapId) {
          changed = manager.resumeMission(id50, { primary: false, autoPrimaryEligible: false, source: "env-local" }) === true || changed;
          lifecycle50 = manager.memory?.state?.missionLifecycle?.[id50];
        }
        if (lifecycle50?.status === "active") {
          changed = this.setEnvironmentManagedProgress(id50, "study", coverage.percent) || changed;
          manager.syncLifecycleFromTrees?.();
          lifecycle50 = manager.memory?.state?.missionLifecycle?.[id50];
        }
        if (lifecycle50?.status !== "completed") continue;

        const id100 = this.environmentInstanceId(`ENV-MAP-${family}-100`, targetMapId);
        const mission100 = this.environmentLocalMission(id100);
        let lifecycle100 = manager.memory?.state?.missionLifecycle?.[id100];
        if (!lifecycle100 && !activationUsed && mission100) {
          if (this.activateMission(mission100, {
            type: "progression.mission_completed", missionId: id50, mapId: targetMapId, amount: 1
          })) {
            changed = true;
            activationUsed = true;
          }
          lifecycle100 = manager.memory?.state?.missionLifecycle?.[id100];
        } else if (lifecycle100?.status === "paused" && String(BF.currentEngine?.currentMapId || "") === targetMapId) {
          changed = manager.resumeMission(id100, { primary: false, autoPrimaryEligible: false, source: "env-local" }) === true || changed;
          lifecycle100 = manager.memory?.state?.missionLifecycle?.[id100];
        }
        if (lifecycle100?.status === "active") {
          changed = this.setEnvironmentManagedProgress(id100, "study", coverage.percent) || changed;
          manager.syncLifecycleFromTrees?.();
        }
      }
      if (changed) {
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
      }
      return changed;
    }

    environmentMapBiome(mapId, mapState = null) {
      return lower(
        mapState?.biomeId || mapState?.biome ||
        BF.maps?.[mapId]?.biomeId || BF.maps?.[mapId]?.biome ||
        (String(BF.currentEngine?.currentMapId || "") === String(mapId || "")
          ? BF.currentEngine?.currentMap?.definition?.biomeId || BF.currentEngine?.currentMap?.definition?.biome
          : null)
      );
    }

    environmentQualifiedBiomeTypes() {
      const rawMaps = BF.getExplorationSummary?.()?.maps || {};
      const maps = Array.isArray(rawMaps)
        ? rawMaps
        : Object.entries(rawMaps).map(([mapId, mapState]) => ({
            ...(mapState || {}),
            mapId: mapState?.mapId || mapState?.id || mapId
          }));
      const qualified = new Set();
      maps.forEach((mapState) => {
        const mapId = String(mapState?.mapId || mapState?.id || "");
        if (!mapId || Number(mapState?.surfacePercent) < 100) return;
        const biome = this.environmentMapBiome(mapId, mapState);
        if (!biome) return;
        const complete = ["RELIC", "ROCK", "PLANT"].every((family) => {
          const coverage = this.environmentMapCoverage(mapId, family);
          return coverage.known && coverage.percent >= 100;
        });
        if (complete) qualified.add(biome);
      });
      return qualified;
    }

    reconcileEnvironmentWorld(options = {}) {
      const manager = this.manager();
      if (!manager || !this.missionLifecycle("T13").completed) return false;
      let changed = false;
      let activationUsed = options.allowActivation === false;
      const count = this.environmentQualifiedBiomeTypes().size;
      for (const threshold of [10, 20]) {
        const missionId = `ENV-WORLD-${threshold}`;
        const sourceId = threshold === 10 ? "T13" : "ENV-WORLD-10";
        if (!this.missionLifecycle(sourceId).completed) continue;
        let lifecycle = manager.memory?.state?.missionLifecycle?.[missionId];
        if (!lifecycle && !activationUsed) {
          const mission = this.byId.get(missionId);
          if (mission && this.activateMission(mission, {
            type: "progression.mission_completed", missionId: sourceId, amount: 1
          })) {
            changed = true;
            activationUsed = true;
          }
          lifecycle = manager.memory?.state?.missionLifecycle?.[missionId];
        }
        if (lifecycle?.status === "active") {
          changed = this.setEnvironmentManagedProgress(missionId, "explore", count) || changed;
          manager.syncLifecycleFromTrees?.();
        }
      }
      if (changed) {
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
      }
      return changed;
    }

    reconcileEnvironmentAll(mapId = BF.currentEngine?.currentMapId) {
      if (this.environmentReconciling) return false;
      this.environmentReconciling = true;
      try {
        let changed = false;
        const activated = this.activateEnvironmentGlobalFollowers();
        changed = this.reconcileEnvironmentHistorical() || Boolean(activated) || changed;
        const localChanged = mapId ? this.reconcileEnvironmentLocalMap(mapId) : false;
        changed = localChanged || changed;
        changed = this.reconcileEnvironmentWorld({
          allowActivation: !activated && !localChanged
        }) || changed;
        if (changed) this.manager()?.publish?.();
        return changed;
      } finally {
        this.environmentReconciling = false;
      }
    }

    progressionChangeAffectsEnvironmentObservations(detail = {}) {
      if (String(detail.reason || "") !== "event-consumed") return false;
      return [
        "OBJECT_SEEN",
        "OBJECT_INSPECTED",
        "OBJECT_ANALYZED",
        "PHENOMENON_OBSERVED",
        "KNOWLEDGE_ACQUIRED"
      ].includes(String(detail.event?.type || ""));
    }

    progressionChangeAffectsHistoricalCollections(detail = {}) {
      return (
        String(detail.reason || "") === "event-consumed" &&
        String(detail.event?.type || "") === String(
          BF.ObjectEvents?.types?.RESOURCE_COLLECTED || "RESOURCE_COLLECTED"
        )
      );
    }

    progressionChangeAffectsObservationRuntimeCounters(detail = {}) {
      if (String(detail.reason || "") !== "event-consumed") return false;
      const type = String(detail.event?.type || "");
      return [
        String(BF.ObjectEvents?.types?.PHENOMENON_OBSERVED || "PHENOMENON_OBSERVED"),
        String(BF.ObjectEvents?.types?.OBJECT_SEEN || "OBJECT_SEEN")
      ].includes(type);
    }

    reconcileHistoricalCollections(missionFilter = null) {
      const manager = this.manager();
      if (!manager) return false;
      let changed = false;

      this.catalog.forEach((mission) => {
        if (missionFilter && mission.id !== missionFilter) return;
        if (!this.missionLifecycle(mission.id).active) return;
        const tree = manager.trees?.get?.(mission.id);
        if (!tree?.root) return;

        let treeChanged = false;
        tree.root.walk?.((node) => {
          if (node?.params?.historicalCollection !== true) return;
          const total = Math.max(
            0,
            Number(
              BF.progression?.historicalCollectionTotal?.(node.params) ??
              BF.getHistoricalCollectionTotal?.(node.params)
            ) || 0
          );
          const absolute = Math.min(
            Math.max(0, Number(node.target) || 0),
            total
          );
          if (Number(node.progress || 0) === absolute) return;
          node.progress = absolute;
          treeChanged = true;
        });

        if (!treeChanged) return;
        tree.refresh?.();
        manager.memory?.saveTree?.(tree);
        changed = true;
      });

      if (changed) {
        manager.syncLifecycleFromTrees?.();
        manager.reevaluatePendingActivations?.();
        manager.catalogController?.schedule?.();
        manager.publish?.();
      }
      return changed;
    }

    isHistoricalCollectionMission(mission) {
      const requirements = asArray(mission?.slots?.collect?.requirements);
      return requirements.some((requirement) =>
        requirement?.params?.historicalCollection === true
      );
    }

    activateHistoricalCollectionFollowers() {
      let activated = 0;
      this.catalog.forEach((mission) => {
        if (!this.isHistoricalCollectionMission(mission)) return;
        if (mission?.trigger?.type !== "progression.mission_completed") return;
        const sourceId = String(mission.trigger?.missionId || "");
        if (!sourceId || !this.missionLifecycle(sourceId).completed) return;
        const lifecycle = this.missionLifecycle(mission.id);
        if (lifecycle.active || lifecycle.completed) return;
        if (!this.prerequisitesSatisfied(mission)) return;
        if (this.activateMission(mission, {
          type: "progression.mission_completed",
          missionId: sourceId,
          amount: 1
        })) activated += 1;
      });
      return activated;
    }

    reconcileHistoricalCollectionChains() {
      let changed = false;
      const limit = Math.max(1, this.catalog.length + 1);
      for (let guard = 0; guard < limit; guard += 1) {
        const progressed = this.reconcileHistoricalCollections();
        const activated = this.activateHistoricalCollectionFollowers();
        if (!progressed && !activated) break;
        changed = true;
      }
      return changed;
    }

    setStockBackedNodeProgress(tree, mission, stock = {}) {
      const node = tree?.find?.(`${mission.id}:${stock.slot}`);
      if (!node) return false;
      const inventoryKeys = this.inventoryKeysForRequirement(stock);
      if (!inventoryKeys.length) return false;
      const available = Math.max(0, Number(BF.progression?.availableInventory?.(inventoryKeys)) || 0);
      const maximum = Math.max(0, Number(stock.maximum) || node.target || 0);
      const next = Math.min(node.target, maximum || node.target, available);
      const previous = Math.max(0, Number(node.progress) || 0);
      if (next === previous && ((next >= node.target) === node.isComplete)) return false;

      node.progress = next;
      if (next >= node.target) {
        node.status = Missions.MissionStatus.COMPLETED;
        node.completedAt ||= Date.now();
        node.startedAt ||= Date.now();
      } else {
        node.completedAt = 0;
        node.status = next > 0
          ? Missions.MissionStatus.ACTIVE
          : (node.prerequisitesMet?.(tree.root) ? Missions.MissionStatus.AVAILABLE : Missions.MissionStatus.LOCKED);
        if (tree.root?.isComplete) {
          tree.root.completedAt = 0;
          tree.root.status = Missions.MissionStatus.ACTIVE;
        }
      }
      return true;
    }

    reconcileStockBackedMission(mission) {
      const stocks = asArray(mission?.stockBackedSlots);
      if (!stocks.length) return false;
      const manager = this.manager();
      const lifecycle = manager?.memory?.state?.missionLifecycle?.[mission.id];
      const tree = manager?.trees?.get?.(mission.id);
      if (!manager || lifecycle?.status !== "active" || !tree) return false;
      let changed = false;
      stocks.forEach((stock) => {
        changed = this.setStockBackedNodeProgress(tree, mission, stock) || changed;
      });
      if (!changed) return false;
      tree.refresh?.();
      manager.memory?.saveTree?.(tree);
      manager.syncLifecycleFromTrees?.();
      manager.publish?.();
      return true;
    }

    reconcileStockBackedMissions() {
      let changed = false;
      this.catalog.forEach((mission) => {
        changed = this.reconcileStockBackedMission(mission) || changed;
      });
      return changed;
    }

    repeatableEffectKey(mission) {
      const lifecycle = this.manager()?.memory?.state?.missionLifecycle?.[mission?.id] || {};
      const repeatCount = mission?.repeatable ? Math.max(0, Number(lifecycle.repeatCount) || 0) : 0;
      return mission?.repeatable ? `${mission.id}:repeat:${repeatCount}` : mission.id;
    }

    repeatableWoodBaselineKey(missionId) {
      return `repeatableWoodBaseline:${missionId}`;
    }

    repeatableStockRequirements(rule = {}) {
      const structured = asArray(rule.requirements)
        .filter((requirement) => requirement && typeof requirement === "object");
      return structured.length ? structured : [rule];
    }

    repeatableStockSnapshot(rule = {}) {
      return this.repeatableStockRequirements(rule).map((requirement) => {
        const keys = this.inventoryKeysForRequirement(requirement);
        return {
          amount: keys.length
            ? Math.max(0, Number(BF.progression?.availableInventory?.(keys)) || 0)
            : 0,
          minimum: Math.max(0, Number(requirement.minimum) || 0),
          rearmIncrease: Math.max(0, Number(requirement.rearmIncrease) || 0)
        };
      });
    }

    nearShelterForRepeatable(rule = {}) {
      const engine = BF.currentEngine;
      const mapId = String(engine?.currentMapId || "");
      if (!engine?.character?.root?.position || !mapId) return false;
      if (rule.mapId && mapId !== String(rule.mapId)) return false;
      const sites = this.siteBucket(mapId);
      const kinds = asArray(rule.shelterKinds).length ? asArray(rule.shelterKinds) : ["camp", "refuge", "base"];
      const player = engine.character.root.position;
      const radius = Math.max(1, Number(rule.radius) || 12);
      return kinds.some((kind) => {
        const site = sites[lower(kind)];
        const anchor = site?.anchor;
        if (!anchor) return false;
        return Math.hypot(Number(player.x) - Number(anchor.x), Number(player.z) - Number(anchor.z)) <= radius;
      });
    }

    reviewRepeatableOpportunities() {
      const manager = this.manager();
      if (!manager?.memory) return false;
      let changed = false;
      this.catalog.filter((mission) =>
        mission?.repeatable === true && mission?.repeatableCondition
      ).forEach((mission) => {
        const rule = mission.repeatableCondition;
        if (!asArray(mission.prerequisites).every((id) => this.missionLifecycle(id).completed)) return;
        if (!this.nearShelterForRepeatable(rule)) return;
        const stock = this.repeatableStockSnapshot(rule);
        if (!stock.length || stock.some((entry) => entry.amount < entry.minimum)) return;

        let lifecycle = manager.memory.state.missionLifecycle?.[mission.id] || null;
        const baselineKey = this.repeatableWoodBaselineKey(mission.id);
        const baselineFact = manager.memory.getFact?.(baselineKey, 0) || 0;
        if (lifecycle?.status === "completed") {
          const baselineAmounts = Array.isArray(baselineFact?.amounts)
            ? baselineFact.amounts
            : [Math.max(0, Number(baselineFact?.amount ?? baselineFact) || 0)];
          if (stock.some((entry, index) =>
            entry.amount < Math.max(0, Number(baselineAmounts[index]) || 0) + entry.rearmIncrease
          )) return;
          if (!manager.rearmRepeatableMission?.(mission.id, { source: "bible-repeatable", reason: "Le stock local permet de reprendre cette routine." })) return;
          lifecycle = manager.memory.state.missionLifecycle?.[mission.id] || null;
          changed = true;
        }
        if (!lifecycle || lifecycle.status === "available" || lifecycle.status === "hidden") {
          changed = this.activateMission(mission, { type: "repeatable.local-opportunity", mapId: BF.currentEngine?.currentMapId }) || changed;
        }
      });
      return changed;
    }

    progressionChangeAffectsInventory(detail = {}) {
      const reason = String(detail.reason || "");
      if (["inventory-consumed", "inventory-pool-consumed", "inventory-granted", "inventory-deposited", "inventory-withdrawn", "inventory-reset"].includes(reason)) {
        return true;
      }
      if (reason !== "event-consumed") return false;
      const type = String(detail.event?.type || "");
      return [
        String(BF.ObjectEvents?.types?.RESOURCE_COLLECTED || "RESOURCE_COLLECTED"),
        String(BF.ObjectEvents?.types?.RESOURCE_EXTRACTED || "RESOURCE_EXTRACTED")
      ].includes(type);
    }

    onProgressionChanged(detail = {}) {
      let changed = false;
      if (String(detail.reason || "") === "event-consumed") {
        changed = this.reconcileWorldEventRequirements() || changed;
      }
      if (this.progressionChangeAffectsInventory(detail)) {
        changed = this.reconcileStockBackedMissions() || changed;
        changed = this.reviewRepeatableOpportunities() || changed;
      }
      if (this.progressionChangeAffectsEnvironmentObservations(detail)) {
        changed = this.reconcileEnvironmentAll(detail.event?.mapId || BF.currentEngine?.currentMapId) || changed;
      }
      if (this.progressionChangeAffectsHistoricalCollections(detail)) {
        changed = this.reconcileHistoricalCollectionChains() || changed;
      }
      if (this.progressionChangeAffectsObservationRuntimeCounters(detail)) {
        changed = Boolean(this.reconcileRuntimeCounters()) || changed;
      }
      if (String(detail.reason || "") === "inventory-deposited") {
        changed = this.markDepositCompletionGates() || changed;
      }
      if (!this.progressionChangeAffectsInventory(detail)) return changed;
      if (!this.pendingConstructionResourceMissions.size) return changed;
      for (const missionId of [...this.pendingConstructionResourceMissions]) {
        const mission = this.byId.get(missionId);
        const manager = this.manager();
        const tree = manager?.trees?.get?.(missionId);
        const lifecycle = manager?.memory?.state?.missionLifecycle?.[missionId];
        if (!mission || lifecycle?.status !== "active" || !tree?.root?.isComplete) {
          this.pendingConstructionResourceMissions.delete(missionId);
          this.constructionResourceSignatures.delete(missionId);
          continue;
        }
        const status = this.constructionResourceStatus(mission);
        changed = this.publishConstructionResourceStatus(mission, status) || changed;
        if (!status?.ready) continue;
        this.pendingConstructionResourceMissions.delete(missionId);
        this.handleConstructionReady(mission);
      }
      return changed;
    }

    constructionCollectionCandidate(engine, now = performance.now()) {
      if (!engine || !this.pendingConstructionResourceMissions.size) return null;
      const manager = engine.missionManager;
      const missions = [...this.pendingConstructionResourceMissions]
        .map((missionId) => this.byId.get(missionId))
        .filter(Boolean)
        .map((mission) => ({ mission, status: this.constructionResourceStatus(mission) }))
        .filter(({ mission, status }) => {
          const tree = manager?.trees?.get?.(mission.id);
          const lifecycle = manager?.memory?.state?.missionLifecycle?.[mission.id];
          return lifecycle?.status === "active" && tree?.root?.isComplete && status && !status.ready;
        })
        .sort((left, right) =>
          Math.max(...right.status.requirements.map((entry) => entry.deficitRatio), 0) -
          Math.max(...left.status.requirements.map((entry) => entry.deficitRatio), 0) ||
          Number(right.mission.priority || 0) - Number(left.mission.priority || 0)
        );
      const selected = missions[0];
      if (!selected) return null;
      const deficits = selected.status.requirements
        .filter((entry) => entry.missing > 0)
        .sort((left, right) =>
          right.deficitRatio - left.deficitRatio ||
          right.missing - left.missing
        );
      if (!deficits.length) return null;
      const deficit = deficits[0];
      const keySet = new Set(deficit.inventoryKeys);
      const interactables = (engine.currentMap?.interactables || []).filter((object) => {
        if (!object?.userData?.active || engine.canInteractWith?.(object, now) === false) return false;
        const data = object.userData || {};
        const definition = data.functional || BF.ObjectLibrary?.get?.(data.libraryType) || BF.ObjectLibrary?.get?.(data.kind) || {};
        const key = definition?.resource?.inventoryKey || data.inventoryKey || null;
        if (!key || !keySet.has(String(key))) return false;
        const actions = new Set(definition?.interaction?.actions || []);
        return actions.has("collect") || actions.has("extract") || definition?.gameplay?.collectable === true;
      });
      if (!interactables.length) return null;
      const origin = engine.character?.root?.position;
      const point = (object) => object?.userData?.worldAnchor?.position || object?.position || null;
      const target = [...interactables].sort((left, right) => {
        if (!origin) return 0;
        const lp = point(left); const rp = point(right);
        const ld = lp ? origin.distanceTo(lp) : Infinity;
        const rd = rp ? origin.distanceTo(rp) : Infinity;
        return ld - rd;
      })[0];
      if (!target) return null;
      const definition = target.userData?.functional || BF.ObjectLibrary?.get?.(target.userData?.libraryType) || BF.ObjectLibrary?.get?.(target.userData?.kind) || {};
      const actions = new Set(definition?.interaction?.actions || []);
      const configured = String(definition?.interaction?.acquisitionAction || definition?.interaction?.afterInspectionAction || "").toLowerCase();
      const action = configured === "extract" && actions.has("extract")
        ? "extract"
        : actions.has("collect") || definition?.gameplay?.collectable === true
          ? "collect"
          : actions.has("extract")
            ? "extract"
            : null;
      if (!action) return null;
      const ratio = Math.max(0, Math.min(1, deficit.deficitRatio));
      const absoluteBoost = Math.min(18, Math.log2(1 + deficit.missing) * 2.4);
      const missionPriorityBoost = Math.min(20, Math.max(0, Number(selected.mission.priority) || 0) / 10);
      return {
        id: "bible-construction-resource-deficit",
        axis: "collection",
        baseWeight: Math.round(44 + ratio * 30 + absoluteBoost + missionPriorityBoost),
        available: true,
        allowDuringPrimaryMission: manager?.primaryMissionId === selected.mission.id,
        missionDriven: true,
        missionId: selected.mission.id,
        inventoryKeys: [...deficit.inventoryKeys],
        missing: deficit.missing,
        required: deficit.required,
        availableQuantity: deficit.available,
        execute: () => {
          target.userData.requestedInteraction = action;
          target.userData.requestedInteractionSource = "autonomy";
          const accepted = engine.targetInteraction?.(target);
          if (accepted === false) {
            target.userData.requestedInteraction = null;
            target.userData.requestedInteractionSource = null;
            target.userData.lastInteractionAt = performance.now();
            return false;
          }
          engine.callbacks?.onStatus?.(
            `BlueFox cherche les composants manquants pour ${selected.mission.title}.`
          );
          return true;
        }
      };
    }

    applyCompletionRelationEffects(mission) {
      const effects = asArray(mission?.completionRelationEffects);
      if (!effects.length) return true;
      const manager = this.manager();
      const memory = manager?.memory;
      const controller = manager?.catalogController;
      if (!memory || !controller) return false;
      for (const effect of effects) {
        const civilizationId = String(effect?.civilizationId || "").trim().toLowerCase();
        const delta = Number(effect?.delta) || 0;
        if (!civilizationId || !delta) return false;
        const receiptId = `${mission.id}:completion-relation:${civilizationId}:v1`;
        if (memory.hasEffectReceipt?.(receiptId)) continue;
        const previous = controller.getRelation?.(civilizationId);
        if (!previous?.rank || typeof controller.setRelation !== "function") return false;
        const updated = controller.setRelation(civilizationId, previous.rank, {
          score: Number(previous.score || 0) + delta
        });
        if (!updated) return false;
        memory.recordEffectReceipt?.(receiptId, {
          missionId: mission.id,
          civilizationId,
          delta,
          at: Date.now()
        });
        memory.save?.();
      }
      return true;
    }

    applyEffects(mission, options = {}) {
      const effects = mission.effects || [];
      if (!effects.length) return true;
      const memory = this.manager()?.memory;
      const effectKey = this.repeatableEffectKey(mission);
      const receiptId = `${effectKey}:completion:v${mission.version || 1}`;
      if (!memory) return false;
      if (memory.hasEffectReceipt?.(receiptId)) {
        this.renderCurrentSite();
        return true;
      }
      const consumes = effects.filter((effect) => effect.type === "inventory.consume");
      const establish = effects.find((effect) => effect.type === "site.establish");
      if (!this.inventoryConsumptionPlan(consumes).ready) return false;

      if (!establish) {
        if (effects.some((effect) => effect.type !== "inventory.consume")) return false;
        for (const [index, consume] of consumes.entries()) {
          const quantity = Math.max(0, Number(consume.quantity) || 0);
          const inventoryKeys = this.inventoryKeysForRequirement(consume);
          const removed = BF.consumeInventoryPoolOnce?.(
            `${receiptId}:consume:${index}`,
            inventoryKeys,
            quantity
          );
          if (removed !== quantity) return false;
        }
        memory.recordEffectReceipt?.(receiptId, { missionId: mission.id });
        memory.save?.();
        return true;
      }

      if (!BF.MicroScenes?.get?.(establish.microSceneId)) return false;
      const targetMapId = this.missionTargetMapId(mission) || String(BF.currentEngine?.currentMapId || "");
      if (!targetMapId || targetMapId !== BF.currentEngine?.currentMapId) return false;

      const activationSource =
        mission.activationSource ||
        this.state.constructionInstances?.[mission.id]?.source ||
        "system";
      const playerConstruction =
        activationSource === "player" &&
        Boolean(this.constructionPlacementEffect(mission));

      // Une construction répétable déclenchée par le joueur ne peut jamais
      // tomber sur resolveSitePlacement()/un preset implicite. Seul le callback
      // Installer de la popup peut fournir le jeton de confirmation courant.
      if (
        playerConstruction &&
        (
          options.source !== "player" ||
          options.confirmationToken !== this.activePlacement?.confirmationToken ||
          this.activePlacement?.missionId !== mission.id ||
          !options.placement?.anchor
        )
      ) {
        return false;
      }

      const placement = options.placement || this.resolveSitePlacement(establish);
      if (!placement?.anchor) return false;

      const replacedRefuge = establish.kind === "base"
        ? this.siteBucket(targetMapId).refuge
        : null;

      const site = {
        id: `${targetMapId}:${establish.kind}:primary`,
        stage: Math.max(1, Number(establish.stage) || 1),
        kind: establish.kind,
        mapId: targetMapId,
        missionId: mission.id,
        microSceneId: establish.microSceneId,
        anchor: clone(placement.anchor),
        rotation: Array.isArray(placement.rotation) ? placement.rotation.slice() : [0, 0, 0],
        placementSource: options.source || mission.activationSource || "system",
        interactionRadius: 8,
        establishedAt: Date.now()
      };

      // Le spawn est tenté avant la consommation : un échec graphique ne doit
      // jamais détruire des ressources ni valider la mission.
      if (!this.renderSite(site)) return false;

      for (const [index, consume] of consumes.entries()) {
        const quantity = Math.max(0, Number(consume.quantity) || 0);
        if (!quantity) continue;
        const inventoryKeys = this.inventoryKeysForRequirement(consume);
        const removed = BF.consumeInventoryPoolOnce?.(
          `${receiptId}:consume:${index}`,
          inventoryKeys,
          quantity
        );
        if (removed !== quantity) return false;
      }

      if (!this.storeSite(site, memory)) return false;
      if (replacedRefuge) {
        this.removeEstablishedSite(replacedRefuge, memory, BF.currentEngine);
      }
      memory.recordEffectReceipt?.(receiptId, { missionId: mission.id, siteId: site.id });
      memory.save?.();
      this.state.gatesSatisfied[mission.id] = Date.now();
      this.state.effectsApplied[mission.id] = Date.now();
      this.saveState();

      // Le site vient d'être persisté. Une ancienne construction dynamique de
      // cette même map peut désormais être obsolète (notamment CAMP@crystal
      // après T03). On attend la fin de la transaction courante avant de faire
      // arbitrer le lifecycle par MissionManager.
      const schedule = global.queueMicrotask || ((callback) => Promise.resolve().then(callback));
      schedule(() => this.reconcileObsoleteConstructionMissions({ mapId: targetMapId }));
      return true;
    }

    renderCurrentSite(engine = BF.currentEngine) {
      const mapId = engine?.currentMapId;
      if (!mapId) return false;
      const sites = this.siteBucket(mapId);
      let rendered = false;
      Object.values(sites).filter(Boolean).forEach((site) => {
        this.applyCanonicalSitePlacement(site, engine);
        rendered = this.renderSite(site, engine) || rendered;
      });
      return rendered;
    }

    scheduleCurrentSiteRestore(mapId = BF.currentEngine?.currentMapId) {
      const expectedMapId = mapId != null ? String(mapId) : "";
      const delays = [0, 80, 220, 500, 900, 1600, 2800];
      delays.forEach((delay) => {
        global.setTimeout?.(() => {
          const engine = BF.currentEngine;
          const currentMapId = String(engine?.currentMapId || "");
          if (!currentMapId) return;
          if (expectedMapId && currentMapId !== expectedMapId) return;
          if (!engine?.currentMap?.group || !BF.ObjectSpawner) return;
          if (!Object.values(this.siteBucket(currentMapId)).some(Boolean)) return;
          this.renderCurrentSite(engine);
        }, delay);
      });
      return true;
    }

    constructionPlacementEffect(mission) {
      return asArray(mission?.effects).find((effect) => effect?.type === "site.establish") || null;
    }

    autonomousPlacement(mission) {
      const engine = BF.currentEngine;
      const effect = this.constructionPlacementEffect(mission);
      if (!engine?.character?.root || !effect) return null;
      const kind = lower(effect.kind);
      const targetMapId = this.missionTargetMapId(mission) || String(engine.currentMapId || "");

      const referenceKind = lower(effect.placement?.referenceKind);
      if (referenceKind) {
        const referenceSite = this.siteBucket(targetMapId)[referenceKind];
        if (!referenceSite?.anchor) return null;

        // Fallback générique uniquement pour une future construction sans
        // preset canonique : progression relative au site de référence.
        const referenceYaw = Number(referenceSite.rotation?.[1]) || 0;
        const dx = 6;
        const dz = 2;
        const baseDistance = Math.max(5, Math.hypot(dx, dz));
        const baseAngle = Math.atan2(dz, dx) + referenceYaw;
        for (const angleOffset of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
          const angle = baseAngle + angleOffset;
          const placement = {
            anchor: {
              x: Number(referenceSite.anchor.x) + Math.cos(angle) * baseDistance,
              y: Number(referenceSite.anchor.y) || 0,
              z: Number(referenceSite.anchor.z) + Math.sin(angle) * baseDistance
            },
            rotation: [0, referenceYaw + angleOffset + Math.PI / 6, 0]
          };
          if (this.sitePlacementValid(mission, placement, engine)) return placement;
        }
        return null;
      }

      const p = engine.character.root.position;
      const baseAngle = ((String(mission.id).length * 47) % 360) * Math.PI / 180;
      for (const radius of [7, 10, 13]) {
        for (let index = 0; index < 8; index += 1) {
          const angle = baseAngle + index * Math.PI / 4;
          const placement = {
            anchor: {
              x: p.x + Math.cos(angle) * radius,
              y: 0,
              z: p.z + Math.sin(angle) * radius
            },
            rotation: [0, angle + Math.PI, 0]
          };
          if (this.sitePlacementValid(mission, placement, engine)) return placement;
        }
      }
      return null;
    }


    cleanupPlacement() {
      const placement = this.activePlacement;
      if (!placement) return false;
      const { canvas, previewRoot, handlers, clonedMaterials } = placement;
      Object.entries(handlers || {}).forEach(([type, handler]) => {
        const target = type === "keydown" ? global : canvas;
        target?.removeEventListener?.(type, handler, true);
      });
      previewRoot?.parent?.remove?.(previewRoot);
      (clonedMaterials || []).forEach((material) => material?.dispose?.());
      this.activePlacement = null;
      global.dispatchEvent?.(new CustomEvent("bluefox:site-placement-ended"));
      return true;
    }

    microScenePlacementValid(microSceneId, placement, engine = BF.currentEngine) {
      const anchor = placement?.anchor;
      const scene = BF.MicroScenes?.get?.(microSceneId);
      if (!engine?.currentMap || !scene || !anchor) return false;
      const radius = Math.max(2, Number(scene?.radius) || 4);
      const bounds = Number(engine.currentMap.bounds);
      if (
        Number.isFinite(bounds) &&
        (
          Math.abs(Number(anchor.x) || 0) > bounds - radius ||
          Math.abs(Number(anchor.z) || 0) > bounds - radius
        )
      ) {
        return false;
      }
      return !(engine.currentMap.colliders || []).some((collider) => {
        const q = collider?.position;
        if (!q) return false;
        return Math.hypot(
          (Number(anchor.x) || 0) - Number(q.x || 0),
          (Number(anchor.z) || 0) - Number(q.z || 0)
        ) < radius + Math.max(0, Number(collider.radius) || 0) + 0.6;
      });
    }

    sitePlacementValid(mission, placement, engine = BF.currentEngine) {
      const effect = this.constructionPlacementEffect(mission);
      return Boolean(
        effect?.microSceneId &&
        this.microScenePlacementValid(effect.microSceneId, placement, engine)
      );
    }

    autonomousMicroScenePlacement(spec = {}, engine = BF.currentEngine) {
      const microSceneId = String(spec.microSceneId || "");
      if (!microSceneId || !engine?.character?.root) return null;
      const origin = spec.referenceAnchor || engine.character.root.position;
      const referenceYaw = Number(spec.referenceYaw) || 0;
      const key = String(spec.id || microSceneId);
      const baseAngle = referenceYaw + ((key.length * 47) % 360) * Math.PI / 180;
      for (const radius of spec.referenceAnchor ? [5, 7, 10] : [7, 10, 13]) {
        for (let index = 0; index < 8; index += 1) {
          const angle = baseAngle + index * Math.PI / 4;
          const placement = {
            anchor: {
              x: Number(origin.x) + Math.cos(angle) * radius,
              y: Number(origin.y) || 0,
              z: Number(origin.z) + Math.sin(angle) * radius
            },
            rotation: [0, angle + Math.PI, 0]
          };
          if (this.microScenePlacementValid(microSceneId, placement, engine)) {
            return placement;
          }
        }
      }

      const scene = BF.MicroScenes?.get?.(microSceneId);
      if (!scene || !engine.currentMap) return null;
      const sceneRadius = Math.max(2, Number(scene.radius) || 4);
      const bounds = Number(engine.currentMap.bounds);
      const fallbackCandidates = [];
      const addFallback = (x, z, index) => {
        const angle = Math.atan2(z - Number(origin.z), x - Number(origin.x));
        fallbackCandidates.push({
          placement: {
            anchor: { x, y: Number(origin.y) || 0, z },
            rotation: [0, angle + Math.PI, 0]
          },
          index
        });
      };
      const halton = (index, base) => {
        let result = 0;
        let fraction = 1 / base;
        let value = index;
        while (value > 0) {
          result += fraction * (value % base);
          value = Math.floor(value / base);
          fraction /= base;
        }
        return result;
      };

      if (Number.isFinite(bounds)) {
        const limit = bounds - sceneRadius;
        if (limit < 0) return null;
        for (let index = 1; index <= 320; index += 1) {
          addFallback(
            -limit + 2 * limit * halton(index, 2),
            -limit + 2 * limit * halton(index, 3),
            index
          );
        }
      } else {
        let index = 0;
        for (const radius of [16, 20, 24, 28, 32, 36, 40]) {
          for (let step = 0; step < 16; step += 1) {
            const angle = baseAngle + step * Math.PI / 8;
            addFallback(
              Number(origin.x) + Math.cos(angle) * radius,
              Number(origin.z) + Math.sin(angle) * radius,
              index += 1
            );
          }
        }
      }

      const validCandidates = fallbackCandidates.filter(({ placement }) =>
        this.microScenePlacementValid(microSceneId, placement, engine)
      );
      if (!validCandidates.length) return null;

      const colliders = engine.currentMap.colliders || [];
      const collisionPressure = ({ anchor }) => colliders.reduce((pressure, collider) => {
        const position = collider?.position;
        if (!position) return pressure;
        const clearance = sceneRadius + Math.max(0, Number(collider.radius) || 0) + 0.6;
        const influence = clearance + Math.max(4, sceneRadius);
        const distance = Math.hypot(
          (Number(anchor.x) || 0) - Number(position.x || 0),
          (Number(anchor.z) || 0) - Number(position.z || 0)
        );
        return pressure + Math.max(0, influence - distance) / influence;
      }, 0);
      return validCandidates
        .map((entry) => ({
          ...entry,
          pressure: collisionPressure(entry.placement),
          distance: Math.hypot(
            Number(entry.placement.anchor.x) - Number(origin.x),
            Number(entry.placement.anchor.z) - Number(origin.z)
          )
        }))
        .sort((left, right) =>
          left.pressure - right.pressure ||
          left.distance - right.distance ||
          left.index - right.index
        )[0]?.placement || null;
    }

    beginMicroScenePlacement(spec = {}) {
      const engine = BF.currentEngine;
      const microSceneId = String(spec.microSceneId || "");
      const placementId = String(spec.id || spec.missionId || microSceneId || "micro-scene");
      const missionId = spec.missionId ? String(spec.missionId) : placementId;
      const mapId = String(spec.mapId || engine?.currentMapId || "");
      const canvas = engine?.renderer?.domElement;
      if (!microSceneId || !BF.MicroScenes?.get?.(microSceneId)) return false;
      if (this.activePlacement?.placementId === placementId) return true;
      if (this.activePlacement) this.cleanupPlacement();
      if (!engine?.THREE || !engine?.raycaster || !engine?.groundPlane || !canvas) return false;
      if (!mapId || String(engine.currentMapId || "") !== mapId) return false;

      const previewRoot = new engine.THREE.Group();
      previewRoot.name = `BlueFoxMicroScenePreview:${placementId}`;
      engine.currentMap?.group?.add(previewRoot);
      const spawner = new BF.ObjectSpawner({
        THREE: engine.THREE,
        scene: previewRoot,
        palette: BF.maps?.[engine.currentMapId]?.palette
      });
      const records = spawner.spawnMicroScene(microSceneId, {
        origin: { x: 0, y: 0, z: 0 },
        rotation: [0, 0, 0],
        scene: previewRoot,
        force: true,
        source: `preview:${placementId}`
      });
      if (!records?.length) {
        previewRoot.parent?.remove(previewRoot);
        return false;
      }

      const clonedMaterials = [];
      const confirmationToken = Symbol(`micro-scene-placement:${placementId}`);
      let yaw = Number(spec.initialYaw) || 0;
      let candidate = null;
      let finalizing = false;
      const label = String(spec.label || "structure");
      const kind = String(spec.kind || "micro-scene");

      const movePreview = (event) => {
        if (finalizing) return;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        engine.pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        engine.raycaster.setFromCamera(engine.pointer, engine.camera);
        const point = new engine.THREE.Vector3();
        if (!engine.raycaster.ray.intersectPlane(engine.groundPlane, point)) return;
        candidate = { x: point.x, y: 0, z: point.z };
        previewRoot.position.set(candidate.x, 0, candidate.z);
        previewRoot.rotation.set(0, yaw, 0);
        previewRoot.userData.validPlacement = this.microScenePlacementValid(
          microSceneId,
          { anchor: candidate, rotation: [0, yaw, 0] },
          engine
        );
      };

      const pointerup = (event) => {
        if (event.button !== 2 || finalizing) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!candidate) return;
        const placement = { anchor: { ...candidate }, rotation: [0, yaw, 0] };
        if (!this.microScenePlacementValid(microSceneId, placement, engine)) {
          engine.callbacks?.onStatus?.(
            "Emplacement invalide : choisissez une zone libre à l'intérieur du plateau."
          );
          return;
        }
        finalizing = true;
        const cancel = () => {
          finalizing = false;
          engine.callbacks?.onStatus?.(
            spec.resumeMessage || `Placement de ${label} repris. Choisissez un autre emplacement ou Échap pour annuler.`
          );
        };
        const rotate = (nextYaw) => {
          yaw = Number(nextYaw) || 0;
          previewRoot.rotation.set(0, yaw, 0);
        };
        const install = () => {
          const finalPlacement = {
            anchor: { ...candidate },
            rotation: [0, yaw, 0]
          };
          if (!this.microScenePlacementValid(microSceneId, finalPlacement, engine)) {
            finalizing = false;
            engine.callbacks?.onStatus?.("Emplacement devenu invalide.");
            return false;
          }
          if (typeof spec.onInstall === "function" && spec.onInstall(finalPlacement, confirmationToken) === false) {
            finalizing = false;
            return false;
          }
          this.cleanupPlacement();
          return true;
        };
        global.dispatchEvent?.(new CustomEvent("bluefox:site-placement-finalize-request", {
          detail: {
            missionId,
            mapId: engine.currentMapId,
            kind,
            label,
            yaw,
            onRotate: rotate,
            onCancel: cancel,
            onInstall: install
          }
        }));
        if (!["camp", "refuge", "workbench"].includes(kind)) {
          const overlay = global.document?.getElementById?.("bluefox-site-placement-finalize");
          if (overlay) {
            const title = overlay.querySelector?.("strong");
            if (title) title.textContent = `Positionnement de ${label}`;
            const installButton = [...(overlay.querySelectorAll?.("button") || [])].find((button) =>
              String(button.textContent || "").startsWith("Installer")
            );
            if (installButton) installButton.textContent = `Installer ${label}`;
          }
        }
      };
      const contextmenu = (event) => {
        if (!this.activePlacement || finalizing) return;
        event.preventDefault();
      };
      const keydown = (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        global.dispatchEvent?.(new CustomEvent("bluefox:site-placement-finalize-close", {
          detail: { missionId }
        }));
        this.cleanupPlacement();
        engine.callbacks?.onStatus?.(spec.cancelMessage || "Placement annulé. L'objet reste disponible.");
      };
      const handlers = { pointermove: movePreview, pointerup, contextmenu, keydown };
      Object.entries(handlers).forEach(([type, handler]) => {
        const target = type === "keydown" ? global : canvas;
        target.addEventListener(type, handler, {
          capture: true,
          passive: type === "pointermove"
        });
      });
      this.activePlacement = {
        placementId,
        missionId,
        microSceneId,
        canvas,
        previewRoot,
        handlers,
        clonedMaterials,
        confirmationToken
      };
      engine.callbacks?.onStatus?.(
        spec.startMessage || `Placement de ${label} : déplacez avec la souris. Clic gauche : déplacement de BlueFox. Clic droit : confirmer. Molette : caméra. Échap : annuler.`
      );
      global.dispatchEvent?.(new CustomEvent("bluefox:site-placement-started", {
        detail: { missionId, mapId: engine.currentMapId, kind, microSceneId }
      }));
      return true;
    }

    beginSitePlacement(mission) {
      const effect = this.constructionPlacementEffect(mission);
      const engine = BF.currentEngine;
      if (!effect) return false;
      const targetMapId = String(this.missionTargetMapId(mission) || engine?.currentMapId || "");
      const label = effect.kind === "refuge"
        ? "refuge"
        : effect.kind === "workbench"
          ? "établi"
          : "camp";
      const resumeMessage = effect.kind === "workbench"
        ? "Placement de l’établi repris. Choisissez un autre emplacement ou Échap pour annuler."
        : `Placement du ${label} repris. Choisissez un autre emplacement ou Échap pour annuler.`;
      return this.beginMicroScenePlacement({
        id: `site:${mission.id}`,
        missionId: mission.id,
        mapId: targetMapId,
        microSceneId: effect.microSceneId,
        kind: effect.kind,
        label,
        resumeMessage,
        cancelMessage: "Placement annulé. La mission reste active.",
        startMessage: "Placement : déplacez la structure avec la souris. Clic gauche : déplacement de BlueFox. Clic droit : confirmer la position. Molette : caméra. Échap : annuler.",
        onInstall: (placement, confirmationToken) => {
          if (!this.applyEffects(mission, {
            placement,
            source: "player",
            confirmationToken
          })) {
            engine?.callbacks?.onStatus?.(
              "Construction impossible à cet emplacement ou ressources insuffisantes."
            );
            return false;
          }
          this.manager()?.syncLifecycleFromTrees?.();
          this.manager()?.publish?.();
          global.dispatchEvent?.(new CustomEvent("bluefox:site-established", {
            detail: { missionId: mission.id, mapId: engine?.currentMapId, kind: effect.kind }
          }));
          return true;
        }
      });
    }

    handleConstructionReady(mission) {
      const manager = this.manager();
      const tree = manager?.trees?.get?.(mission?.id);
      const lifecycle = manager?.memory?.state?.missionLifecycle?.[mission?.id];
      if (!mission?.completionGate || !this.constructionPlacementEffect(mission)) return false;
      if (lifecycle?.status !== "active" || !tree?.root?.isComplete) return false;
      const targetMapId = this.missionTargetMapId(mission);
      if (!targetMapId) return false;
      if (String(BF.currentEngine?.currentMapId || "") !== targetMapId) {
        const messageKey = `${mission.id}:waiting-target-map`;
        if (!this.state.progressNarrative[messageKey]) {
          const kind = this.constructionPlacementEffect(mission)?.kind;
          BF.currentEngine?.callbacks?.onStatus?.(
            kind === "refuge"
              ? `Rendez-vous sur ${targetMapId} pour installer le refuge.`
              : kind === "workbench"
                ? `Rendez-vous sur ${targetMapId} pour installer l'établi.`
                : `Rendez-vous sur ${targetMapId} pour établir le camp.`
          );
          this.state.progressNarrative[messageKey] = Date.now();
          this.saveState();
        }
        return false;
      }
      if (this.canFinalizeMission(mission.id)) {
        manager.syncLifecycleFromTrees?.();
        return true;
      }
      const source = mission.activationSource || this.state.constructionInstances?.[mission.id]?.source || "player";
      const resourceStatus = this.constructionResourceStatus(mission);
      if (resourceStatus && !resourceStatus.ready) {
        this.pendingConstructionResourceMissions.add(mission.id);
        this.publishConstructionResourceStatus(mission, resourceStatus);
        return false;
      }
      this.pendingConstructionResourceMissions.delete(mission.id);
      this.publishConstructionResourceStatus(mission, resourceStatus);
      if (source === "autonomy") {
        const effect = this.constructionPlacementEffect(mission);
        const preset = this.sitePlacementPreset(effect?.microSceneId, BF.currentEngine);
        const placement = preset?.position
          ? {
              anchor: clone(preset.position),
              rotation: Array.isArray(preset.rotation)
                ? preset.rotation.map((value) => Number(value) || 0)
                : [0, Number(preset.rotation) || 0, 0]
            }
          : this.autonomousPlacement(mission);
        if (
          !placement ||
          !this.applyEffects(mission, { placement, source: "autonomy" })
        ) return false;
        manager.syncLifecycleFromTrees?.();
        manager.publish?.();
        return true;
      }

      // En mode joueur, la mission reste simplement "prête à positionner".
      // L'ouverture du preview est une action UI explicite afin d'éviter toute
      // reprise automatique après reload ou publication MissionManager.
      return true;
    }

    resumeConstructionPlacement(missionId) {
      const mission = this.byId.get(String(missionId || ""));
      if (!mission || mission.activationSource === "autonomy") return false;
      const manager = this.manager();
      const tree = manager?.trees?.get?.(mission.id);
      const lifecycle = manager?.memory?.state?.missionLifecycle?.[mission.id];
      const targetMapId = this.missionTargetMapId(mission);
      if (
        lifecycle?.status !== "active" ||
        !tree?.root?.isComplete ||
        !targetMapId ||
        String(BF.currentEngine?.currentMapId || "") !== targetMapId ||
        this.gateSatisfied(mission)
      ) {
        return false;
      }
      return this.beginSitePlacement(mission);
    }

    reviewConstructionReadiness() {
      return this.allMissions().some((mission) => this.handleConstructionReady(mission));
    }


    researchRewardDefinitions() {
      const entries = [];
      this.catalog.forEach((mission) => {
        const rewards = Array.isArray(mission.rewards)
          ? mission.rewards
          : mission.rewards == null
            ? []
            : [mission.rewards];
        rewards.forEach((reward, index) => {
          if (!reward?.type?.startsWith?.("research.") || !reward.id) return;
          entries.push({
            ...clone(reward),
            missionId: mission.id,
            missionTitle: mission.title,
            rewardIndex: index
          });
        });
      });
      return entries;
    }

    researchRewardById(id) {
      const key = String(id || "");
      return this.researchRewardDefinitions()
        .find((entry) => entry.id === key) || null;
    }

    experimentDefinitions() {
      return Array.isArray(BF.BibleExperiments) ? BF.BibleExperiments : [];
    }

    experimentDefinition(themeId) {
      const key = lower(themeId);
      return this.experimentDefinitions().find((entry) => lower(entry?.id) === key) || null;
    }

    experimentMemory() {
      const memory = this.ensureResearchMemory();
      if (!memory) return null;
      memory.state.researchExperiments = memory.state.researchExperiments || {};
      return memory.state.researchExperiments;
    }

    experimentKnowledgeDefinition(knowledgeId) {
      const key = String(knowledgeId || "");
      for (const theme of this.experimentDefinitions()) {
        for (const stage of asArray(theme?.stages)) {
          if (String(stage?.knowledge?.id || "") === key) {
            return { theme, stage, knowledge: stage.knowledge };
          }
        }
      }
      return null;
    }

    experimentRequirementsReady(stage) {
      const consumes = asArray(stage?.requirements).map((requirement) => ({
        type: "inventory.consume",
        ...requirement
      }));
      return consumes.length > 0 && this.inventoryConsumptionPlan(consumes).ready;
    }

    experimentLocationReady(stage) {
      if (stage?.location === "workbench") {
        return this.canAccessWorkbench(BF.currentEngine?.currentMapId) === true;
      }
      return BF.canAccessCampInventory?.() === true;
    }

    experimentState(themeId) {
      const theme = this.experimentDefinition(themeId);
      if (!theme) return null;
      const memory = this.experimentMemory() || {};
      const record = memory[theme.id] || {};
      const count = Math.max(0, Math.min(5, Number(record.count) || 0));
      const nextStage = asArray(theme.stages).find((stage) => Number(stage.stage) === count + 1) || null;
      const locationReady = nextStage ? this.experimentLocationReady(nextStage) : false;
      const resourcesReady = nextStage ? this.experimentRequirementsReady(nextStage) : false;
      let reason = count >= 5
        ? "Axe expérimental maîtrisé."
        : "Expérimentation disponible.";
      if (nextStage && !locationReady) {
        reason = nextStage.location === "workbench"
          ? "J’ai besoin d’un établi à proximité pour contrôler ce test."
          : "Je dois être près du Camp, du Refuge ou de la Base pour préparer ce test.";
      } else if (nextStage && !resourcesReady) {
        reason = "Il me manque encore certains échantillons pour tenter cette expérience.";
      }
      return {
        id: theme.id,
        label: theme.label,
        axis: theme.axis || "research",
        count,
        completed: count >= 5,
        nextStage: nextStage ? clone(nextStage) : null,
        locationReady,
        resourcesReady,
        canRun: Boolean(nextStage && locationReady && resourcesReady),
        reason
      };
    }

    experimentEntries() {
      return this.experimentDefinitions().map((theme) => this.experimentState(theme.id)).filter(Boolean);
    }

    unlockExperimentKnowledge(theme, stage) {
      const knowledge = stage?.knowledge;
      if (!knowledge?.id) return false;
      const memory = this.ensureResearchMemory();
      if (!memory || memory.state.researchUnlocks[knowledge.id]) return false;
      memory.state.researchUnlocks[knowledge.id] = {
        id: knowledge.id,
        type: "research.knowledge",
        category: theme.id,
        label: knowledge.label || knowledge.id,
        missionId: null,
        source: "scientific-experiment",
        experimentTheme: theme.id,
        experimentStage: Number(stage.stage) || null,
        unlockedAt: Date.now()
      };
      memory.save?.();
      global.dispatchEvent?.(new CustomEvent("bluefox:research-unlocked", {
        detail: {
          id: knowledge.id,
          type: "research.knowledge",
          missionId: null,
          source: "scientific-experiment",
          experimentTheme: theme.id
        }
      }));
      return true;
    }

    consumeExperimentRequirements(stage) {
      if (!this.experimentRequirementsReady(stage)) return false;
      for (const requirement of asArray(stage?.requirements)) {
        const keys = this.inventoryKeysForRequirement(requirement);
        const quantity = Math.max(0, Number(requirement.quantity) || 0);
        if (!keys.length || !quantity) return false;
        const removed = BF.consumeInventoryPool?.(keys, quantity) || 0;
        if (removed !== quantity) return false;
      }
      return true;
    }

    runExperiment(themeId, options = {}) {
      const theme = this.experimentDefinition(themeId);
      const state = this.experimentState(themeId);
      if (!theme || !state?.nextStage || !state.canRun) return false;
      const stage = state.nextStage;
      if (!this.consumeExperimentRequirements(stage)) return false;

      const memory = this.ensureResearchMemory();
      const experiments = this.experimentMemory();
      if (!memory || !experiments) return false;
      const previous = experiments[theme.id] || {};
      experiments[theme.id] = {
        ...previous,
        count: Number(stage.stage),
        completedStages: [...new Set([...(previous.completedStages || []), Number(stage.stage)])],
        updatedAt: Date.now()
      };
      memory.save?.();
      this.unlockExperimentKnowledge(theme, stage);

      const lines = asArray(stage.narratives).filter(Boolean);
      const text = lines.length
        ? lines[Math.floor(Math.random() * lines.length)]
        : `L'expérimentation ${theme.label} progresse.`;
      this.queueNarrativeLine({
        id: `experiment:${theme.id}:${stage.stage}:${Date.now()}`,
        title: `Expérimentation — ${theme.label}`,
        text,
        mapId: BF.currentEngine?.currentMapId || null,
        zoneId: BF.currentEngine?.currentZoneIndex ?? null,
        important: Boolean(stage.knowledge)
      });
      BF.currentEngine?.callbacks?.onStatus?.(
        stage.knowledge?.label
          ? `Connaissance acquise : ${stage.knowledge.label}.`
          : `${theme.label} : expérimentation ${stage.stage}/5 validée.`
      );
      this.manager()?.reevaluatePendingActivations?.();
      this.manager()?.catalogController?.schedule?.();
      this.manager()?.publish?.();
      global.dispatchEvent?.(new CustomEvent("bluefox:experiment-completed", {
        detail: {
          themeId: theme.id,
          stage: Number(stage.stage),
          knowledgeId: stage.knowledge?.id || null,
          source: options.source || "research-menu",
          at: Date.now()
        }
      }));
      return true;
    }

    ensureResearchMemory() {
      const memory = this.manager()?.memory;
      if (!memory) return null;
      memory.state.researchUnlocks =
        memory.state.researchUnlocks || {};
      return memory;
    }

    isResearchRewardUnlocked(id) {
      const memory = this.ensureResearchMemory();
      return Boolean(
        memory?.state?.researchUnlocks?.[String(id || "")]
      );
    }

    unlockResearchRewards(mission) {
      const memory = this.ensureResearchMemory();
      if (!memory) return 0;
      const rewards = Array.isArray(mission?.rewards)
        ? mission.rewards
        : mission?.rewards == null
          ? []
          : [mission.rewards];
      let changed = 0;
      rewards.forEach((reward, index) => {
        if (!reward?.type?.startsWith?.("research.") || !reward.id) return;
        if (memory.state.researchUnlocks[reward.id]) return;
        memory.state.researchUnlocks[reward.id] = {
          id: reward.id,
          type: reward.type,
          missionId: mission.id,
          rewardIndex: index,
          unlockedAt: Date.now()
        };
        changed += 1;
        global.dispatchEvent?.(
          new CustomEvent("bluefox:research-unlocked", {
            detail: {
              id: reward.id,
              type: reward.type,
              missionId: mission.id
            }
          })
        );
      });
      if (changed) memory.save?.();
      return changed;
    }

    reconcileCompletedResearchRewards() {
      const manager = this.manager();
      const lifecycle = manager?.memory?.state?.missionLifecycle;
      if (!lifecycle) return 0;

      let changed = 0;
      for (const mission of this.allMissions()) {
        if (lifecycle?.[mission.id]?.status !== "completed") continue;
        changed += this.unlockResearchRewards(mission);
      }
      return changed;
    }

    scheduleCompletedResearchRewardReconciliation() {
      const delays = [0, 80, 220, 500, 900, 1600, 2800];
      let reconciled = false;
      delays.forEach((delay) => {
        global.setTimeout?.(() => {
          if (reconciled) return;
          if (!this.manager()?.memory) return;
          reconciled = true;
          this.reconcileCompletedResearchRewards();
        }, delay);
      });
      return true;
    }

    migrateLegacyRationUnlock() {
      const reward = this.researchRewardById("ration-basic-v2");
      const memory = this.ensureResearchMemory();
      if (!reward || !memory || memory.state.researchUnlocks[reward.id]) {
        return false;
      }
      try {
        const raw = global.localStorage?.getItem?.(
          "bluefox_personal_consumables_v1"
        );
        if (!raw) return false;
        const legacy = JSON.parse(raw);
        if (legacy?.recipeUnlocked !== true) return false;
        memory.state.researchUnlocks[reward.id] = {
          id: reward.id,
          type: reward.type,
          missionId: "legacy-ration-migration",
          rewardIndex: 0,
          unlockedAt: Date.now(),
          migrated: true
        };
        memory.save?.();
        return true;
      } catch {
        return false;
      }
    }

    researchEntries(options = {}) {
      const unlockedOnly = options.unlockedOnly !== false;
      const currentMapId = String(BF.currentEngine?.currentMapId || "");
      return this.researchRewardDefinitions()
        .map((entry) => ({
          ...entry,
          unlocked: this.isResearchRewardUnlocked(entry.id)
        }))
        .filter((entry) => !unlockedOnly || entry.unlocked)
        .filter((entry) => options.includeUnavailableMap === true || !entry.mapId || String(entry.mapId) === currentMapId);
    }

    canCraftResearchReward(id, count = 1, options = {}) {
      const reward = this.researchRewardById(id);
      const requested = Math.max(1, Math.floor(Number(count) || 1));
      if (!reward || reward.type !== "research.recipe") {
        return false;
      }
      if (!options.ignoreUnlock && !this.isResearchRewardUnlocked(reward.id)) {
        return false;
      }
      if (
        reward.requiresShelter !== false &&
        options.ignoreShelter !== true &&
        BF.canAccessCampInventory?.() !== true
      ) {
        return false;
      }
      if (
        reward.requiresWorkbench === true &&
        options.ignoreWorkbench !== true &&
        this.canAccessWorkbench(reward.mapId || BF.currentEngine?.currentMapId) !== true
      ) {
        return false;
      }
      const requirements = Array.isArray(reward.requirements)
        ? reward.requirements
        : [];
      return requirements.every((requirement) => {
        const keys = this.inventoryKeysForRequirement(requirement);
        const quantity =
          Math.max(0, Number(requirement.quantity) || 0) * requested;
        return Boolean(
          keys.length &&
          BF.progression?.availableInventory?.(keys) >= quantity
        );
      });
    }

    craftResearchReward(id, count = 1, options = {}) {
      const reward = this.researchRewardById(id);
      const requested = Math.max(1, Math.floor(Number(count) || 1));
      if (!this.canCraftResearchReward(id, requested, options)) return 0;

      const requirements = Array.isArray(reward.requirements)
        ? reward.requirements
        : [];
      for (const requirement of requirements) {
        const keys = this.inventoryKeysForRequirement(requirement);
        const quantity =
          Math.max(0, Number(requirement.quantity) || 0) * requested;
        const removed = BF.consumeInventoryPool?.(keys, quantity) || 0;
        if (removed !== quantity) return 0;
      }

      const output = reward.output || {};
      const objectId = output.objectId || output.inventoryKey || null;
      const outputQuantity =
        Math.max(1, Number(output.quantity) || 1) * requested;
      let created = 0;
      if (objectId === "ration" && BF.Rations?.add) {
        created = BF.Rations.add(
          outputQuantity,
          options.automatic ? "bac-craft" : "research-craft"
        );
      } else if (objectId && BF.progression?.addInventory) {
        BF.progression.addInventory(objectId, outputQuantity);
        BF.progression.save?.();
        BF.progression.publishChange?.("research-crafted", {
          inventoryKey: objectId,
          quantity: outputQuantity,
          researchRewardId: reward.id
        });
        created = outputQuantity;
      }

      if (!created) return 0;
      const detail = {
        rewardId: reward.id,
        category: reward.category || null,
        objectId,
        quantity: created,
        automatic: options.automatic === true,
        source: options.source || "research-menu",
        at: Date.now()
      };
      global.dispatchEvent?.(
        new CustomEvent("bluefox:research-crafted", { detail })
      );
      global.dispatchEvent?.(
        new CustomEvent("bluefox:mission-craft", {
          detail: {
            recipe: reward.id,
            objectId,
            quantity: created,
            automatic: options.automatic === true,
            at: detail.at
          }
        })
      );
      return created;
    }

    applyActivationInventoryCredits(mission) {
      const credits = asArray(mission?.activationInventoryCredits)
        .filter((credit) => credit?.slot && (credit?.inventoryKey || credit?.subject));
      if (!credits.length) return false;

      const key = `${mission.id}:v${mission.version || 1}`;
      if (this.state.activationInventoryCredits[key]) return false;

      const manager = this.manager();
      const tree = manager?.trees?.get?.(mission.id);
      if (!manager || !tree) return false;

      let changed = false;
      credits.forEach((credit) => {
        const node = tree.find?.(`${mission.id}:${credit.slot}`);
        if (!node || node.isComplete) return;
        const inventoryKeys = this.inventoryKeysForRequirement(credit);
        if (!inventoryKeys.length) return;
        const available = Math.max(
          0,
          Number(BF.progression?.availableInventory?.(inventoryKeys)) || 0
        );
        const maximum = Math.max(0, Number(credit.maximum) || node.target || 0);
        const credited = Math.min(node.target, maximum || node.target, available);
        if (credited <= Number(node.progress || 0)) return;
        const delta = credited - Number(node.progress || 0);
        changed = node.increment?.(delta) === true || changed;
      });

      this.state.activationInventoryCredits[key] = Date.now();
      this.saveState();
      if (changed) {
        tree.refresh?.();
        manager.memory?.saveTree?.(tree);
        manager.syncLifecycleFromTrees?.();
        manager.publish?.();
      }
      return changed;
    }

    reconcileMissionCompletionTriggers() {
      let changed = false;
      for (const mission of this.allMissions()) {
        const missionId = String(mission?.id || "");
        if (!missionId) continue;
        const currentStatus = String(this.missionLifecycle(missionId).status || "absent");
        if (!this.missionLifecycleStatuses.has(missionId)) {
          // Première observation = baseline. Aucune complétion historique ne
          // doit être rejouée au chargement/reload.
          this.missionLifecycleStatuses.set(missionId, currentStatus);
          continue;
        }
        const previousStatus = this.missionLifecycleStatuses.get(missionId);
        if (previousStatus === currentStatus) continue;
        this.missionLifecycleStatuses.set(missionId, currentStatus);
        if (currentStatus !== "completed" || previousStatus === "completed") continue;

        const result = this.consumeTriggerEvent({
          type: "progression.mission_completed",
          missionId,
          amount: 1,
          mapId: BF.currentEngine?.currentMapId || null
        });
        changed = Boolean(result?.activatedMissionId || result?.activatedMissionIds?.length) || changed;
      }
      return changed;
    }

    onMissionState(state) {
      if (!this.observationCaptureQueued) {
        this.observationCaptureQueued = true;
        const schedule = global.queueMicrotask || ((callback) => Promise.resolve().then(callback));
        schedule(() => {
          this.observationCaptureQueued = false;
          this.captureObservationMap(BF.currentEngine);
        });
      }

      // Les faits acquis par une interaction réelle doivent exister avant la
      // traduction lifecycle -> mission_completed, afin qu'une mission suivante
      // puisse les consommer dans le même cycle causal.
      this.reconcileSlotInventoryGrantEffects();
      this.reconcileSlotFactEffects();
      this.reconcileFinalDeparture();
      this.reconcileMissionCompletionTriggers();
      this.reconcileDeferredCompletionTriggers();
      this.reconcileMissionProgressValidations();
      this.reconcileLongExpeditionValidations();
      this.reconcileWorldEventRequirements();
      this.reconcilePersistentWorldScenes();
      this.reconcileWorldTopologyLinks();
      this.migrateLegacyRationUnlock();
      this.activateNextDroneRepairMission();
      this.reconcileRuntimeCounters();
      this.reconcileHistoricalCollectionChains();
      this.reconcileStockBackedMissions();
      this.reconcileEnvironmentAll(BF.currentEngine?.currentMapId);
      this.refreshProximityContextMonitor();
      this.reconcileLocalExploration(state);
      this.restoreLocalExplorationSession();
      this.restoreLocalMissionDefinitions(state);
      this.reconcileLocalSiteProgression();
      this.reconcileFaunaSpeciesMissions();
      this.reconcileCivilizationContactContinuation();
      for (const mission of this.missionsForState(state)) {
        const entry = this.findMissionEntry(state, mission.id);
        if (entry) this.emitProgressNarrative(mission, entry);

        const manager = this.manager();
        const lifecycle =
          manager?.memory?.state?.missionLifecycle?.[mission.id];

        // MissionManager est l'unique propriétaire de l'état lifecycle.
        // BibleRuntime ne réactive jamais lui-même une mission terminée :
        // completionGateState() décrit le gate et MissionManager décide si
        // l'état reste actif jusqu'à sa validation réelle.

        if (lifecycle?.status === "active") {
          this.emitRevealedOnce(mission);
          this.applyActivationInventoryCredits(mission);
          this.reconcileEnergyMissionRuntime(mission);
          this.handleConstructionReady(mission);
        }

        if (lifecycle?.status !== "completed") continue;

        const effectKey = this.repeatableEffectKey(mission);
        let effectsReady = Boolean(this.state.effectsApplied[effectKey]);
        if (!effectsReady) {
          effectsReady = this.applyEffects(mission);
          if (effectsReady) {
            this.state.effectsApplied[effectKey] = Date.now();
            this.saveState();
          }
        }
        if (!effectsReady) continue;
        if (!this.applyCompletionRelationEffects(mission)) continue;

        if (mission.repeatable === true && mission.repeatableCondition) {
          const stock = this.repeatableStockSnapshot(mission.repeatableCondition);
          const baseline = stock.length > 1
            ? { amounts: stock.map((entry) => entry.amount), at: Date.now() }
            : { amount: stock[0]?.amount || 0, at: Date.now() };
          manager?.memory?.setFact?.(this.repeatableWoodBaselineKey(mission.id), baseline);
          manager?.memory?.save?.();
        }
        BF.completeMissionPsychology?.(mission);
        this.unlockResearchRewards(mission);
        this.emitCompletedOnce(mission);
      }
    }


    emitCompletedOnce(mission) {
      const key = mission.repeatable
        ? `${mission.id}:completed:${Math.max(0, Number(this.manager()?.memory?.state?.missionLifecycle?.[mission.id]?.repeatCount) || 0)}`
        : `${mission.id}:completed`;
      if (this.state.progressNarrative[key]) return false;

      this.state.progressNarrative[key] = Date.now();
      this.saveState();
      return this.emitNarrative(mission, "completed");
    }

    connect() {
      if (!this.unsubscribeObjectEvents && BF.ObjectEvents?.subscribe) {
        this.unsubscribeObjectEvents =
          BF.ObjectEvents.subscribe((event) =>
            this.onObjectEvent(event)
          );
      }

      global.removeEventListener?.(
        "bluefox:mission-state",
        this.boundMissionState
      );
      global.addEventListener?.(
        "bluefox:mission-state",
        this.boundMissionState
      );
      global.removeEventListener?.(
        "bluefox:progression-changed",
        this.boundProgressionChanged
      );
      global.addEventListener?.(
        "bluefox:progression-changed",
        this.boundProgressionChanged
      );
      global.removeEventListener?.(
        "bluefox:map-transition-completed",
        this.boundMapTransition
      );
      global.addEventListener?.(
        "bluefox:map-transition-completed",
        this.boundMapTransition
      );
      global.removeEventListener?.(
        "bluefox:map-exploration-changed",
        this.boundExplorationChange
      );
      global.addEventListener?.(
        "bluefox:map-exploration-changed",
        this.boundExplorationChange
      );
      global.removeEventListener?.(
        "bluefox:ration-consumed",
        this.boundRationConsumed
      );
      global.addEventListener?.(
        "bluefox:ration-consumed",
        this.boundRationConsumed
      );
      global.removeEventListener?.(
        "bluefox:survival-changed",
        this.boundSurvivalChanged
      );
      global.addEventListener?.(
        "bluefox:survival-changed",
        this.boundSurvivalChanged
      );
      global.removeEventListener?.(
        "bluefox:rations-changed",
        this.boundRationsChanged
      );
      global.addEventListener?.(
        "bluefox:rations-changed",
        this.boundRationsChanged
      );
      global.removeEventListener?.(
        "bluefox:site-established",
        this.boundSiteEstablished
      );
      global.addEventListener?.(
        "bluefox:site-established",
        this.boundSiteEstablished
      );
      global.removeEventListener?.(
        "bluefox:civilization-trade-completed",
        this.boundCivilizationTradeCompleted
      );
      global.addEventListener?.(
        "bluefox:civilization-trade-completed",
        this.boundCivilizationTradeCompleted
      );
      global.removeEventListener?.(
        "bluefox:final-departure-completed",
        this.boundFinalDepartureCompleted
      );
      global.addEventListener?.(
        "bluefox:final-departure-completed",
        this.boundFinalDepartureCompleted
      );
      global.removeEventListener?.(
        "bluefox:teleportation-hypothesis",
        this.boundTeleportationHypothesis
      );
      global.addEventListener?.(
        "bluefox:teleportation-hypothesis",
        this.boundTeleportationHypothesis
      );
      return Boolean(this.unsubscribeObjectEvents);
    }

    activationDiagnostics(missionId) {
      const lifecycle = this.missionLifecycle(missionId);
      return {
        missionId,
        definitionExists: Boolean(
          Missions.getDefinition?.(missionId)
        ),
        managerAvailable: Boolean(this.manager()),
        lifecycle: clone(lifecycle.lifecycle),
        active: lifecycle.active,
        completed: lifecycle.completed,
        treeExists: Boolean(lifecycle.tree),
        triggerCount:
          this.state.triggerCounts[
            `${missionId}:${this.byId.get(missionId)?.trigger?.type || "none"}`
          ] || 0,
        lastActivationAttempt:
          this.lastActivationAttempt?.missionId === missionId
            ? clone(this.lastActivationAttempt)
            : null
      };
    }

    activateInitialMissions() {
      const manager = this.manager();
      if (!manager) return false;
      const initialMissions = this.catalog.filter(
        (mission) => mission?.initialState === "active"
      );
      if (!initialMissions.length) return true;

      let settled = true;
      initialMissions.forEach((mission) => {
        const state = this.missionLifecycle(mission.id);
        if (state.active || state.completed) return;
        settled = false;

        const prerequisites = asArray(mission.prerequisites);
        const gatedPrerequisites = this.foundationTutorialAllows(mission)
          ? prerequisites
          : [...new Set([...prerequisites, "T13"])];

        manager.startMission?.(mission.id, {
          primary: mission.primaryOnActivation === true,
          autoPrimaryEligible: mission.autoPrimaryEligible,
          prerequisites: gatedPrerequisites,
          experimentalPrerequisites: asArray(mission.experimentalPrerequisites),
          source: "bible-runtime-v0.1",
          reason: "Déclencheur Bible V0.1 : manual"
        });
      });

      if (!settled) {
        settled = initialMissions.every((mission) => {
          const state = this.missionLifecycle(mission.id);
          return state.active || state.completed;
        });
      }
      return settled;
    }

    diagnostics() {
      return {
        version: VERSION,
        started: this.started,
        connected: Boolean(this.unsubscribeObjectEvents),
        missionLifecycleSource: "MissionManager/MissionMemory",
        strictContract: this.validate().ok,
        catalogCount: this.catalog.length,
        registeredDefinitions: this.allMissions().filter((mission) =>
          Missions.getDefinition?.(mission.id)
        ).length,
        constructionInstances: clone(this.state.constructionInstances),
        triggerCounts: clone(this.state.triggerCounts),
        lifecycle: Object.fromEntries(
          this.catalog.map((mission) => [
            mission.id,
            this.missionLifecycle(mission.id).status
          ])
        )
      };
    }

    start() {
      if (this.started) return this.diagnostics();

      const registration = this.registerDefinitions();
      if (!registration.ok) return registration;

      this.connect();
      this.reconcileHistoricalCollectionChains();
      this.migrateLegacyRationUnlock();
      // BibleRuntime peut démarrer avant que WorldEngine ait installé
      // MissionManager. Réconciliation bornée : aucun polling permanent.
      this.scheduleCompletedResearchRewardReconciliation();
      // Les anciennes constructions dynamiques sont restaurées avant
      // MissionManager. Réconciliation bornée dès que son lifecycle est prêt.
      this.scheduleObsoleteConstructionReconciliation();
      // Le chargement initial de Crystal ne garantit pas l'émission d'une
      // transition après que WorldEngine et ObjectSpawner soient prêts.
      // On arme donc une restauration bornée, sans boucle permanente.
      this.scheduleCurrentSiteRestore();
      this.started = true;

      console.info(
        "[BlueFox] Bible Runtime V0.1 unifié actif.",
        {
          missions: this.catalog.length,
          connected: Boolean(this.unsubscribeObjectEvents)
        }
      );

      return {
        ...registration,
        started: true,
        connected: Boolean(this.unsubscribeObjectEvents)
      };
    }
  }

  BibleRuntimeV01.prototype.__sequenceActionsCompilerV1 = true;

  const runtime = new BibleRuntimeV01();

  // Une seule source de vérité Runtime.
  BF.BibleRuntimeV01 = BibleRuntimeV01;
  BF.bibleRuntime = runtime;

  // Compatibilité API avec les outils/tests précédents.
  BF.startBibleRuntime = () => runtime.start();
  BF.getBibleRuntimeDiagnostics = () => runtime.diagnostics();
  BF.getBibleRuntimeV01Diagnostics = () => runtime.diagnostics();
  BF.getBibleActivationDiagnostics = (id) =>
    runtime.activationDiagnostics(id);
  BF.getLastBibleActivationAttempt = () =>
    clone(runtime.lastActivationAttempt);
  BF.captureObservationMap = (engine) =>
    runtime.captureObservationMap(engine || BF.currentEngine);
  BF.getObservationCoverage = (mapId) =>
    runtime.observationCoverage(mapId);
  BF.getObservationCoverageTotals = () =>
    runtime.observationTotals();
  BF.getConstructionResourceStatus = (missionId) =>
    clone(runtime.constructionResourceStatus(missionId));
  BF.getConstructionCollectionCandidate = (engine, now) =>
    runtime.constructionCollectionCandidate(engine || BF.currentEngine, now);
  BF.isTutorialSurvivalCapabilityUnlocked = (capability) =>
    runtime.survivalCapabilityUnlocked(capability);
  BF.getMissionChoiceState = (missionId) =>
    clone(runtime.missionChoiceState(missionId));
  BF.submitMissionChoice = (missionId, choiceId) =>
    runtime.submitMissionChoice(missionId, choiceId);


  BF.MicroScenePlacement = Object.freeze({
    start: (options) => runtime.beginMicroScenePlacement(options || {}),
    cancel: () => runtime.cleanupPlacement(),
    isValid: (microSceneId, placement, engine) =>
      runtime.microScenePlacementValid(microSceneId, placement, engine || BF.currentEngine),
    suggest: (options, engine) =>
      runtime.autonomousMicroScenePlacement(options || {}, engine || BF.currentEngine)
  });

  BF.Research = Object.freeze({
    list: (options) => runtime.researchEntries(options),
    get: (id) => runtime.researchRewardById(id),
    isUnlocked: (id) => runtime.isResearchRewardUnlocked(id),
    canCraft: (id, count, options) =>
      runtime.canCraftResearchReward(id, count, options),
    craft: (id, count, options) =>
      runtime.craftResearchReward(id, count, options),
    constructionState: (kind, mapId) =>
      runtime.constructionAvailability(kind, mapId),
    startConstruction: (kind, options) =>
      runtime.startConstruction(kind, options),
    resumePlacement: (missionId) =>
      runtime.resumeConstructionPlacement(missionId),
    cancelPlacement: () => runtime.cleanupPlacement(),
    canAccessWorkbench: (mapId) => runtime.canAccessWorkbench(mapId),
    experimentationList: () => runtime.experimentEntries(),
    experimentationState: (themeId) => runtime.experimentState(themeId),
    experimentationForKnowledge: (knowledgeId) => runtime.experimentKnowledgeDefinition(knowledgeId),
    hasKnowledge: (knowledgeId) => runtime.isResearchRewardUnlocked(knowledgeId),
    runExperiment: (themeId, options) => runtime.runExperiment(themeId, options)
  });
  BF.getResearchEntries = (options) =>
    runtime.researchEntries(options);
  BF.getResearchReward = (id) =>
    runtime.researchRewardById(id);
  BF.craftResearchReward = (id, count, options) =>
    runtime.craftResearchReward(id, count, options);

  BF.startBibleMission = (id) => {
    const mission = runtime.byId.get(id);
    return mission
      ? runtime.activateMission(mission, {
          type: "manual",
          subject: null
        })
      : false;
  };

  runtime.start();
})(window);
