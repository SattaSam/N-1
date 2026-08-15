(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const RECON = "BIBLE-V01-RECONNAISSANCE";
  const PASSIVE = "BIBLE-V01-EXPLORE-3-MAPS";

  const manager = () => BF.currentEngine?.missionManager || null;
  const lifecycle = (id) => manager()?.memory?.state?.missionLifecycle?.[id] || null;
  const active = (id) => lifecycle(id)?.status === "active";
  const completed = (id) => lifecycle(id)?.status === "completed";
  const tree = (id) => manager()?.trees?.get?.(id) || null;
  const node = (id, slot) => tree(id)?.find?.(`${id}:${slot}`) || null;

  function increment(id, slot) {
    const m = manager(), t = tree(id), n = node(id, slot);
    if (!m || !t || !n || n.isComplete) return false;
    if (!n.prerequisitesMet?.(t.root)) return false;
    if (!n.increment(1)) return false;
    t.refresh();
    m.memory.saveTree(t);
    m.syncLifecycleFromTrees?.();
    m.publish?.();
    return true;
  }

  /*
   * La mission ne possède jamais les déplacements de BlueFox.
   * Après 4/4, elle devient simplement éligible à l'arbitrage normal.
   * Aucun setPrimaryMission(), aucun cancelCurrentAction().
   */
  function makeReconEligible(reason) {
    const m = manager();
    if (!m || !active(RECON) || !m.trees?.has?.(RECON)) return false;
    const life = m.ensureLifecycle?.(RECON, "active") || lifecycle(RECON);
    if (life) {
      life.autoPrimaryEligible = true;
      life.narrativePriority = Math.max(70, Number(life.narrativePriority) || 0);
      life.updatedAt = Date.now();
      life.lastEligibilityReason = reason || "reconnaissance";
    }
    m.retryAfter = Math.min(Number(m.retryAfter || 0), performance.now() + 250);
    m.lastPlanAt = 0;
    m.memory?.save?.();
    m.publish?.();
    return true;
  }

  function rememberUnique(id, mapId) {
    const m = manager();
    if (!m || !mapId) return false;
    const key = `bibleExploredMaps:${id}`;
    const values = new Set(m.memory.getFact?.(key, []) || []);
    if (values.has(mapId)) return false;
    values.add(mapId);
    m.memory.setFact?.(key, [...values]);
    return true;
  }

  function activatePassiveFromMap(event) {
    if (completed(PASSIVE)) return;
    // BibleRuntime reçoit désormais directement la transition complète
    // (direction comprise). Ce pont historique ne doit plus la recompter.
    if (active(PASSIVE) && rememberUnique(PASSIVE, event.mapId)) {
      increment(PASSIVE, "exploreMaps");
    }
  }

  function onMapTransition(event) {
    if (!event?.isNew || !event.mapId) return;
    activatePassiveFromMap(event);
    if (active(RECON) && rememberUnique(RECON, event.mapId)) {
      increment(RECON, "exploreMaps");
      if (node(RECON, "exploreMaps")?.isComplete) {
        makeReconEligible("Quatrième territoire atteint : relique disponible comme objectif.");
      }
    }
  }

  function unknownDirection(engine) {
    const definition = BF.maps?.[engine.currentMapId];
    if (!definition) return null;
    const directions = ["north","east","south","west"];
    const reconMaps = manager()?.memory?.getFact?.(`bibleExploredMaps:${RECON}`, []) || [];
    if (active(RECON) && reconMaps.length === 3) {
      const empty = directions.find((direction) => !definition.exits?.[direction]);
      if (empty) return { direction: empty, generate: true, missionForced: true };
    }
    const existingUnknown = directions.find((direction) => {
      const target = definition.exits?.[direction]?.targetMap;
      return target && !engine.discoveredMaps?.has?.(target);
    });
    if (existingUnknown) return { direction: existingUnknown, generate: false };
    const empty = directions.find((direction) => !definition.exits?.[direction]);
    return empty ? { direction: empty, generate: true } : null;
  }

  function travelUnknown(engine) {
    const target = unknownDirection(engine);
    if (!target) return false;
    if (target.generate) {
      engine.generateUnknownPassage?.(target.direction, { bibleMissionId: RECON });
      return true;
    }
    const targetMapId = BF.maps[engine.currentMapId]?.exits?.[target.direction]?.targetMap;
    const gate = engine.currentMap?.gates?.find((candidate) =>
      candidate.userData?.exit?.targetMap === targetMapId
    );
    if (!gate) return false;
    engine.pendingGate = gate;
    engine.character.setTarget(gate.position, "run");
    engine.showWorldMarker?.(gate.position);
    return true;
  }

  function shelterTarget(engine) {
    const sites = manager()?.memory?.state?.siteProgression || {};
    const candidates = Object.values(sites).filter((site) =>
      site?.mapId && site?.anchor && BF.maps?.[site.mapId] &&
      ["camp","refuge","base"].includes(String(site.kind || site.type || "camp"))
    );
    return candidates.find((site) => site.mapId === "crystal") || candidates[0] || null;
  }

  function isAtShelter(engine, site, radius = 8) {
    if (!site?.anchor || site.mapId !== engine.currentMapId) return false;
    const dx = Number(engine.character?.root?.position?.x || 0) - Number(site.anchor.x || 0);
    const dz = Number(engine.character?.root?.position?.z || 0) - Number(site.anchor.z || 0);
    return Math.hypot(dx, dz) <= radius;
  }

  function completeShelterArrival(engine) {
    if (!active(RECON)) return false;
    const n = node(RECON, "returnToShelter");
    if (!n || n.isComplete || !n.prerequisitesMet?.(tree(RECON)?.root)) return false;
    const site = shelterTarget(engine);
    if (!site || !isAtShelter(engine, site, Number(n.params?.radius) || 8)) return false;
    return increment(RECON, "returnToShelter");
  }

  function returnToShelter(engine) {
    const target = shelterTarget(engine);
    if (!target) return false;
    if (target.mapId === engine.currentMapId) {
      if (completeShelterArrival(engine)) return true;
      const point = new engine.THREE.Vector3(target.anchor.x, 0, target.anchor.z);
      engine.character.setTarget(point, "run");
      engine.showWorldMarker?.(point);
      return true;
    }
    const route = engine.findKnownRoute?.(engine.currentMapId, target.mapId);
    const nextMap = route?.[1];
    const gate = nextMap
      ? engine.currentMap?.gates?.find((candidate) => candidate.userData?.exit?.targetMap === nextMap)
      : null;
    if (!gate) return false;
    engine.pendingGate = gate;
    engine.character.setTarget(gate.position, "run");
    engine.showWorldMarker?.(gate.position);
    return true;
  }

  function installActionBridge() {
    const Bridge = Missions.ActionBridge;
    if (!Bridge?.prototype || Bridge.prototype.__bibleExplorationV19LastChance) return;
    const original = Bridge.prototype.execute;
    Bridge.prototype.execute = function executeBibleExploration(action, now) {
      if (action?.missionId === PASSIVE && action.type === Missions.ActionType.TRAVEL) {
        return false;
      }
      if (action?.missionId === RECON && action.type === Missions.ActionType.TRAVEL && !this.isEngineBusy()) {
        if (action.nodeId === `${RECON}:exploreMaps`) return travelUnknown(this.engine);
        if (action.nodeId === `${RECON}:returnToShelter`) return returnToShelter(this.engine);
      }
      return original.call(this, action, now);
    };
    Bridge.prototype.__bibleExplorationV19LastChance = true;
  }

  function installPassiveScoring() {
    const Manager = Missions.MissionManager;
    if (!Manager?.prototype || Manager.prototype.__biblePassiveV19LastChance) return;
    const original = Manager.prototype.assessMission;
    Manager.prototype.assessMission = function assessBiblePassive(missionId, context) {
      const result = original.call(this, missionId, context);
      if (missionId === PASSIVE && this.primaryMissionId !== missionId) {
        return { ...result, score: -100000, action: null, reasons: [...(result.reasons || []), "mission passive"] };
      }
      return result;
    };
    Manager.prototype.__biblePassiveV19LastChance = true;
  }

  /*
   * Sécurité de déclenchement idempotente.
   * BibleRuntime reste propriétaire du matching. Ce pont ne fait qu'assurer
   * que l'événement capsule exact lui est présenté si la mission n'est pas active.
   */
  function installCapsuleTriggerSafety() {
    BF.ObjectEvents?.subscribe?.((event) => {
      if (active(RECON) || completed(RECON)) return;
      if (event?.type !== BF.ObjectEvents?.types?.PHENOMENON_OBSERVED) return;
      if (String(event?.objectId || "") !== "LANDMARK-CRASH-CAPSULE-001") return;
      const normalized = BF.bibleRuntime?.normalizeObjectEvent?.(event);
      if (!normalized || normalized.type !== "interaction.observe") return;
      BF.bibleRuntime?.consumeTriggerEvent?.(normalized);
    });
  }

  function installRelicTransition() {
    BF.ObjectEvents?.subscribe?.((event) => {
      if (!active(RECON)) return;
      if (![
        BF.ObjectEvents.types.PHENOMENON_OBSERVED,
        BF.ObjectEvents.types.OBJECT_INSPECTED,
        BF.ObjectEvents.types.OBJECT_ANALYZED
      ].includes(event.type)) return;
      if (String(event.objectId || "") !== "TEC-RELI-M-001") return;
      global.setTimeout(() => {
        if (node(RECON, "observeRelic")?.isComplete) {
          // Retour au camp = objectif disponible, jamais ordre forcé.
          makeReconEligible("Relique observée : retour au camp disponible dans l'arbitrage.");
        }
      }, 0);
    });
  }

  function install() {
    installActionBridge();
    installPassiveScoring();
    installCapsuleTriggerSafety();
    installRelicTransition();
    global.addEventListener("bluefox:map-transition-completed", (event) => {
      onMapTransition(event.detail || {});
      setTimeout(() => completeShelterArrival(BF.currentEngine), 250);
    });
    global.setInterval(() => {
      const engine = BF.currentEngine;
      if (engine && active(RECON)) completeShelterArrival(engine);
    }, 500);
  }

  BF.BibleExplorationV19 = Object.freeze({ install });
  install();
})(window);
