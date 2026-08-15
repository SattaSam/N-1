(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "survival-rations-ai-v0.3";

  const isFoodFlora = (object) => {
    const data = object?.userData || {};
    const definition = data.functional ||
      BF.ObjectLibrary?.get?.(data.libraryType) ||
      BF.ObjectLibrary?.get?.(data.kind) || {};
    const inventoryKey = definition?.resource?.inventoryKey;
    if (!inventoryKey) return false;
    return BF.Rations?.floraInventoryKeys?.().includes(inventoryKey) === true;
  };

  const targetPosition = (object) =>
    object?.userData?.worldAnchor?.position || object?.position || null;

  const nearest = (engine, objects) => {
    if (!objects?.length) return null;

    // Le BAC/routeur comportemental est la source canonique lorsqu'il est présent.
    if (typeof engine.chooseBACTarget === "function") {
      return engine.chooseBACTarget(objects, "survival") || null;
    }

    // Compatibilité avec nearest-interaction-r3 sans créer un moteur parallèle.
    if (typeof engine.pickNearestInteractable === "function") {
      return engine.pickNearestInteractable(objects) || null;
    }

    const origin = engine.character?.root?.position;
    if (!origin) return objects[0] || null;
    return [...objects].sort((left, right) => {
      const lp = targetPosition(left);
      const rp = targetPosition(right);
      const ld = lp ? origin.distanceTo(lp) : Infinity;
      const rd = rp ? origin.distanceTo(rp) : Infinity;
      return ld - rd;
    })[0] || null;
  };

  const install = () => {
    const engine = BF.currentEngine;
    if (!engine || typeof engine.updateAutonomy !== "function") return false;
    if (engine.__rationAiVersion === VERSION) return true;

    const originalAutonomy = engine.updateAutonomy.bind(engine);
    engine.__autonomyBeforeRationAI = originalAutonomy;

    engine.updateAutonomy = function updateAutonomyWithRationPriority(now) {
      const profile = BF.Rations?.needProfile?.();
      if (!profile?.shouldCollect) return originalAutonomy(now);

      // En jeu actif, le nombre de rations n'est pas à lui seul une urgence.
      // Le direct override n'est autorisé que si la survie réelle est elle-même critique.
      const survivalState = BF.getSurvivalState?.() || {};
      const survivalCritical = Boolean(
        survivalState.needs?.criticalRest ||
        survivalState.needs?.food ||
        Number(survivalState.energy) < 40 ||
        Number(survivalState.food) < 40
      );
      if (profile.level !== "critical" || !survivalCritical) {
        this.__lastRationAutonomyDecision = {
          at: Date.now(),
          level: profile.level || null,
          shouldCollect: true,
          directOverride: false,
          survivalCritical,
          energy: Number(survivalState.energy) || null,
          food: Number(survivalState.food) || null,
          reason: survivalCritical
            ? "ration-stock-non-critical-online-delegated-to-bac"
            : "survival-state-healthy-online-delegated-to-bac"
        };
        return originalAutonomy(now);
      }

      // Une mission principale réalisable reste prioritaire.
      if (this.missionManager?.hasRunnablePrimaryMission?.()) {
        return originalAutonomy(now);
      }

      if (
        this.transitioning || this.pendingInteraction || this.pendingGate ||
        this.pendingZoneExploration || this.currentRoutine ||
        this.missionManager?.currentAction
      ) return originalAutonomy(now);
      if (now < this.postActionRecoveryUntil) return originalAutonomy(now);
      if (now - this.lastAutonomyAt < 5000) return originalAutonomy(now);
      if (this.character.root.position.distanceTo(this.character.target) > 0.2) {
        return originalAutonomy(now);
      }

      const plants = (this.currentMap?.interactables || [])
        .filter((object) => object?.userData?.active && this.canInteractWith(object, now))
        .filter(isFoodFlora);

      if (!plants.length) return originalAutonomy(now);

      // Le direct override n'existe plus qu'en situation critique.
      this.lastAutonomyAt = now;
      const object = nearest(this, plants);
      if (!object) return originalAutonomy(now);

      object.userData.requestedInteractionSource = "autonomy";
      this.__lastRationAutonomyDecision = {
        at: Date.now(),
        level: profile.level || null,
        shouldCollect: true,
        directOverride: true,
        candidateCount: plants.length,
        selectedKind:
          object.userData?.functional?.resource?.inventoryKey ||
          object.userData?.inventoryKey ||
          object.userData?.libraryType ||
          object.userData?.kind ||
          null
      };
      this.callbacks?.onStatus?.(
        profile.level === "critical"
          ? "BlueFox cherche en priorité de quoi reconstituer ses réserves alimentaires."
          : "BlueFox profite de l’occasion pour renforcer son stock de rations."
      );
      return this.targetInteraction(object);
    };

    engine.__rationAiVersion = VERSION;
    return true;
  };

  const connect = () => {
    if (install()) return;
    let attempts = 0;
    const timer = global.setInterval(() => {
      attempts += 1;
      if (install() || attempts >= 120) global.clearInterval(timer);
    }, 250);
  };

  BF.reconnectRationAI = install;
  global.addEventListener("bluefox:scene-images", () => global.setTimeout(install, 0));
  global.addEventListener("bluefox:map-transition-completed", () => global.setTimeout(install, 0));
  global.addEventListener("bluefox:rations-changed", () => global.setTimeout(install, 0));

  connect();
})(window);
