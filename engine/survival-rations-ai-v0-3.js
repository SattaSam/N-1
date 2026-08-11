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

  const install = () => {
    const engine = BF.currentEngine;
    if (!engine || typeof engine.updateAutonomy !== "function") return false;
    if (engine.__rationAiVersion === VERSION) return true;

    const originalAutonomy = engine.updateAutonomy.bind(engine);

    engine.updateAutonomy = function updateAutonomyWithRationPriority(now) {
      const profile = BF.Rations?.needProfile?.();
      if (!profile?.shouldCollect) return originalAutonomy(now);

      // Une mission principale réalisable reste prioritaire : CAMP/T09 ne peut
      // donc pas être détournée par la recherche alimentaire.
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
        .filter(isFoodFlora)
        .sort((left, right) =>
          this.character.root.position.distanceTo(left.position) -
          this.character.root.position.distanceTo(right.position)
        );

      if (!plants.length) return originalAutonomy(now);

      // Critique = recherche quasi immédiate ; faible = priorité forte mais pas absolue.
      const chooseFood = profile.level === "critical" || Math.random() < 0.72;
      if (!chooseFood) return originalAutonomy(now);

      this.lastAutonomyAt = now;
      const object = plants[0];
      object.userData.requestedInteractionSource = "autonomy";
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
