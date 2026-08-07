(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_bible_runtime_v0";
  const VERSION = 0;

  const clone = (value) =>
    value == null ? value : JSON.parse(JSON.stringify(value));

  class BibleRuntimeV0 {
    constructor() {
      this.catalog = [];
      this.patterns = {};
      this.byId = new Map();
      this.errors = [];
      this.warnings = [];
      this.unsubscribeObjectEvents = null;
      this.started = false;
      this.state = this.loadState();
      this.onMissionState = (event) =>
        this.consumeMissionState(event.detail || BF.getMissionState?.() || {});
    }

    loadState() {
      try {
        const saved = JSON.parse(
          global.localStorage?.getItem?.(STORAGE_KEY) || "null"
        );
        return saved?.version === VERSION
          ? {
              version: VERSION,
              revealed: { ...(saved.revealed || {}) },
              completed: { ...(saved.completed || {}) },
              narrative: { ...(saved.narrative || {}) }
            }
          : {
              version: VERSION,
              revealed: {},
              completed: {},
              narrative: {}
            };
      } catch {
        return {
          version: VERSION,
          revealed: {},
          completed: {},
          narrative: {}
        };
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

    configure(patterns = BF.BiblePatterns, catalog = BF.BibleCatalog) {
      this.patterns = patterns || {};
      this.catalog = Array.isArray(catalog)
        ? catalog
        : Object.values(catalog || {});
      this.byId = new Map(this.catalog.map((mission) => [mission.id, mission]));
      return this.validate();
    }

    validate() {
      const errors = [];
      const warnings = [];
      const ids = new Set();
      const actionTypes = new Set(
        Object.values(BF.Missions?.ActionType || {})
      );

      if (!this.catalog.length) errors.push("Catalogue BIBLE vide.");
      if (!Object.keys(this.patterns).length) errors.push("Catalogue de patrons BIBLE vide.");

      for (const mission of this.catalog) {
        if (!mission?.id) {
          errors.push("Mission sans id.");
          continue;
        }
        if (ids.has(mission.id)) {
          errors.push(`ID mission dupliqué : ${mission.id}`);
        }
        ids.add(mission.id);

        const pattern = this.patterns[mission.pattern];
        if (!pattern) {
          errors.push(`${mission.id} : patron inconnu ${mission.pattern}`);
          continue;
        }

        for (const step of pattern.steps || []) {
          if (!mission.slots?.[step.slot]) {
            errors.push(`${mission.id} : slot manquant ${step.slot}`);
          }
          if (actionTypes.size && !actionTypes.has(step.action)) {
            errors.push(`${mission.id} : action moteur inconnue ${step.action}`);
          }
          for (const requirement of step.requires || []) {
            if (!(pattern.steps || []).some((candidate) =>
              candidate.slot === requirement
            )) {
              errors.push(
                `${mission.id} : dépendance de patron inconnue ${requirement}`
              );
            }
          }
        }

        for (const next of mission.next || []) {
          if (!this.byId.has(next)) {
            warnings.push(
              `${mission.id} : mission suivante absente du lot V0 : ${next}`
            );
          }
        }

        if ((pattern.steps || []).some((step) =>
          ["build", "craft"].includes(step.action)
        )) {
          warnings.push(
            `${mission.id} : BUILD/CRAFT progresse sur événement, mais l'exécution autonome n'est pas encore raccordée dans ActionBridge.`
          );
        }
      }

      this.errors = errors;
      this.warnings = warnings;
      return {
        ok: !errors.length,
        errors: [...errors],
        warnings: [...warnings],
        missions: this.catalog.length,
        patterns: Object.keys(this.patterns).length
      };
    }

    compileMission(mission) {
      const pattern = this.patterns[mission.pattern];
      if (!pattern) return null;

      const nodeIds = Object.fromEntries(
        (pattern.steps || []).map((step) => [
          step.slot,
          `${mission.id}:${step.slot}`
        ])
      );

      const children = (pattern.steps || []).map((step) => {
        const specific = mission.slots[step.slot] || {};
        return {
          id: nodeIds[step.slot],
          title: specific.title || step.slot,
          description: specific.description || "",
          type: step.action,
          target: Math.max(1, Number(specific.target) || 1),
          params: {
            ...(specific.params || {}),
            bibleMissionId: mission.id,
            biblePattern: mission.pattern
          },
          requires: (step.requires || [])
            .map((slot) => nodeIds[slot])
            .filter(Boolean)
        };
      });

      return {
        id: mission.id,
        title: mission.title,
        description: mission.description || "",
        priority: Number(mission.priority) || 0,
        passivePriorityAxis:
          mission.passivePriorityAxis ||
          pattern.autonomyAxis ||
          null,
        journalIntro: mission.narrative?.revealed?.[0] || "",
        bible: {
          pattern: mission.pattern,
          version: VERSION
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

    register() {
      const report = this.validate();
      if (!report.ok) return { ...report, registered: 0 };
      if (typeof BF.registerMissionDefinitions !== "function") {
        return {
          ...report,
          registered: 0,
          errors: [
            ...report.errors,
            "registerMissionDefinitions indisponible."
          ],
          ok: false
        };
      }

      const definitions = this.catalog
        .map((mission) => this.compileMission(mission))
        .filter(Boolean);

      const registered = BF.registerMissionDefinitions(definitions);
      return { ...report, registered };
    }

    matches(trigger, event) {
      if (!trigger || trigger.mode === "manual") return false;
      if (trigger.event && trigger.event !== event?.type) return false;
      if (trigger.family && trigger.family !== event?.family) return false;
      if (trigger.objectId && trigger.objectId !== event?.objectId) return false;
      if (
        trigger.tagsAny?.length &&
        !trigger.tagsAny.some((tag) => (event?.tags || []).includes(tag))
      ) {
        return false;
      }
      return true;
    }

    emitNarrative(missionId, moment, context = {}) {
      const mission = this.byId.get(missionId);
      const lines = mission?.narrative?.[moment] || [];
      if (!lines.length) return false;

      const key = `${missionId}:${moment}`;
      if (this.state.narrative[key]) return false;

      this.state.narrative[key] = Date.now();
      this.saveState();

      lines.forEach((text, index) => {
        BF.addJournalEntry?.({
          id: `bible:${key}:${index}`,
          type: "bible",
          title: mission.title,
          text,
          mapId: context.mapId ?? null,
          zoneId: context.zoneId ?? null,
          important: moment === "revealed" || moment === "completed"
        });
      });
      return true;
    }

    reveal(mission, event = {}) {
      if (!mission) return false;

      const manager = BF.currentEngine?.missionManager;
      if (!manager || typeof BF.startMission !== "function") {
        this.warnings.push(`${mission.id} : MissionManager indisponible au moment de l'activation.`);
        return false;
      }

      const currentState = BF.getMissionState?.() || {};
      const alreadyActive = (currentState.activeMissionIds || []).includes(mission.id) ||
        (currentState.missions || []).some((entry) =>
          entry.missionId === mission.id &&
          ["active", "paused", "completed"].includes(entry.lifecycleStatus || entry.status)
        );

      if (alreadyActive) {
        this.state.revealed[mission.id] ||= Date.now();
        this.saveState();
        return false;
      }

      const started = BF.startMission(mission.id, {
        primary: false,
        autoPrimaryEligible: false,
        source: "bible-runtime-v0-validated",
        reason: `Déclencheur BIBLE : ${event.type || "manuel"}`
      });

      const after = BF.getMissionState?.() || {};
      const activated =
        manager.activeMissionIds?.includes(mission.id) ||
        manager.trees?.has?.(mission.id) ||
        (after.activeMissionIds || []).includes(mission.id) ||
        (after.missions || []).some((entry) =>
          entry.missionId === mission.id &&
          ["active", "paused", "completed"].includes(entry.lifecycleStatus || entry.status)
        );

      if (started === true && activated) {
        this.state.revealed[mission.id] = Date.now();
        this.saveState();
        this.emitNarrative(mission.id, "revealed", event);
        return true;
      }

      this.warnings.push(
        `${mission.id} : startMission=${String(started)} mais mission absente de l'état moteur après activation.`
      );
      return false;
    }

    buildEventDetail(event) {
      return {
        ...(event?.detail || {}),
        kind:
          event?.detail?.kind ||
          event?.inventoryKey ||
          event?.family ||
          event?.objectId ||
          null,
        amount: Math.max(1, Number(event?.quantity) || 1),
        objectId: event?.objectId || null,
        instanceId: event?.instanceId || null,
        mapId: event?.mapId ?? null,
        zoneId: event?.zoneId ?? null,
        eventType: event?.type || ""
      };
    }

    bridgeBuildCraftEvent(event) {
      const types = BF.ObjectEvents?.types || {};
      const actionTypes = BF.Missions?.ActionType || {};
      const mapped =
        event?.type === types.OBJECT_BUILT
          ? actionTypes.BUILD
          : event?.type === types.OBJECT_CRAFTED
            ? actionTypes.CRAFT
            : null;

      if (!mapped) return false;

      const manager = BF.currentEngine?.missionManager;
      if (!manager || typeof manager.notifyActionCompleted !== "function") {
        return false;
      }

      return Boolean(
        manager.notifyActionCompleted(
          mapped,
          this.buildEventDetail(event),
          { passive: true }
        )
      );
    }

    onObjectEvent(event) {
      for (const mission of this.catalog) {
        if (
          !this.state.revealed[mission.id] &&
          this.matches(mission.trigger, event)
        ) {
          this.reveal(mission, event);
        }
      }

      // OBJECT_BUILT / OBJECT_CRAFTED ne sont pas encore couverts par
      // object-m0-bridge : BibleRuntime V0 validé assure uniquement ce raccord événementiel.
      this.bridgeBuildCraftEvent(event);
    }

    consumeMissionState(state) {
      const missions = state?.missions || [];
      for (const entry of missions) {
        const missionId = entry.missionId || entry.id;
        if (!missionId || !this.byId.has(missionId)) continue;

        const completed =
          entry.lifecycleStatus === "completed" ||
          entry.status === "completed" ||
          entry.tree?.root?.status === "completed";

        if (!completed || this.state.completed[missionId]) continue;

        this.state.completed[missionId] = Date.now();
        this.saveState();
        this.emitNarrative(missionId, "completed");

        const mission = this.byId.get(missionId);
        for (const unlock of mission.unlocks || []) {
          if (unlock?.type === "research-skill" && unlock.id) {
            BF.unlockResearchSkill?.({
              id: unlock.id,
              title: unlock.title || unlock.id
            });
          } else if (unlock?.type === "milestone" && unlock.id) {
            BF.reachProgressionMilestone?.(unlock.id, {
              source: "bible-runtime-v0-validated",
              missionId
            });
          }
        }

        for (const next of mission.next || []) {
          const nextMission = this.byId.get(next);
          if (nextMission) this.reveal(nextMission, {
            type: "BIBLE_CHAIN",
            missionId
          });
        }
      }
    }

    connect() {
      if (!this.unsubscribeObjectEvents && BF.ObjectEvents?.subscribe) {
        this.unsubscribeObjectEvents = BF.ObjectEvents.subscribe(
          (event) => this.onObjectEvent(event)
        );
      }
      global.removeEventListener(
        "bluefox:mission-state",
        this.onMissionState
      );
      global.addEventListener(
        "bluefox:mission-state",
        this.onMissionState
      );
      return Boolean(this.unsubscribeObjectEvents);
    }

    start() {
      if (this.started) return this.diagnostics();
      const report = this.configure();
      const registration = this.register();
      this.connect();
      this.started = registration.ok && registration.registered > 0;

      global.dispatchEvent(
        new CustomEvent("bluefox:bible-runtime-ready", {
          detail: clone(registration)
        })
      );
      return registration;
    }

    reset() {
      this.state = {
        version: VERSION,
        revealed: {},
        completed: {},
        narrative: {}
      };
      this.saveState();
      return clone(this.state);
    }

    activationDiagnostics(missionId) {
      const manager = BF.currentEngine?.missionManager;
      return {
        missionId,
        definitionExists: Boolean(BF.Missions?.getDefinition?.(missionId)),
        startMissionAvailable: typeof BF.startMission === "function",
        managerType: manager?.constructor?.name || null,
        managerActiveIds: [...(manager?.activeMissionIds || [])],
        managerLifecycle: clone(manager?.memory?.state?.missionLifecycle?.[missionId] || null),
        managerTreeExists: Boolean(manager?.trees?.has?.(missionId)),
        publicState: clone(BF.getMissionState?.() || null),
        bibleRevealed: Boolean(this.state.revealed?.[missionId])
      };
    }

    diagnostics() {
      return {
        version: VERSION,
        started: this.started,
        catalogCount: this.catalog.length,
        patternCount: Object.keys(this.patterns).length,
        definitionCount:
          Object.keys(BF.Missions?.definitions || {}).length,
        errors: [...this.errors],
        warnings: [...this.warnings],
        connected: Boolean(this.unsubscribeObjectEvents),
        revealed: Object.keys(this.state.revealed || {}),
        completed: Object.keys(this.state.completed || {})
      };
    }
  }

  const runtime = new BibleRuntimeV0();

  BF.BibleRuntimeV0 = BibleRuntimeV0;
  BF.bibleRuntime = runtime;
  BF.getBibleRuntimeDiagnostics = () => runtime.diagnostics();
  BF.resetBibleRuntime = () => runtime.reset();
  BF.startBibleMission = (id) => {
    const mission = runtime.byId.get(id);
    return mission ? runtime.reveal(mission, { type: "manual" }) : false;
  };
  BF.getBibleActivationDiagnostics = (id) =>
    runtime.activationDiagnostics(id);
  BF.startBibleRuntime = () => runtime.start();

  // Chargé avant world-engine.js : les définitions sont enregistrées avant
  // la création du MissionManager, donc mission-empty-core ne prend pas la main.
  runtime.start();
})(window);
