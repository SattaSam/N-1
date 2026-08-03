(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const BASE_CAPACITY = 200;
  const SURVIVAL_BAG_CAPACITY = 400;
  const RETURN_THRESHOLD_RATIO = 0.9;
  const CHECK_COOLDOWN_MS = 1800;

  let returning = false;
  let lastCheckAt = 0;
  let lastStatus = "";

  const normalize = (value) =>
    String(value || "")
      .toLocaleLowerCase("fr")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[_\s]+/g, "-");

  const hasSurvivalBagSkill = () => {
    const skills =
      BF.getMultiProgressionState?.()?.research?.skills ||
      BF.multiProgression?.state?.research?.skills ||
      {};
    return Object.entries(skills).some(([id, skill]) => {
      const candidates = [
        id,
        skill?.id,
        skill?.title,
        skill?.name
      ].map(normalize);
      return candidates.some(
        (value) =>
          value === "survival-bag" ||
          value === "sac-de-survie" ||
          value.includes("sac-de-survie")
      );
    });
  };

  const capacity = () =>
    hasSurvivalBagSkill()
      ? SURVIVAL_BAG_CAPACITY
      : BASE_CAPACITY;

  const total = () =>
    Object.values(
      BF.getProgressionState?.().inventory || {}
    ).reduce(
      (sum, amount) =>
        sum + Math.max(0, Number(amount) || 0),
      0
    );

  const currentSite = () => {
    const engine = BF.currentEngine;
    const mapId = engine?.currentMapId;
    return mapId
      ? engine?.missionManager?.memory?.state
          ?.siteProgression?.[mapId]
      : null;
  };

  const moveToLocalCamp = () => {
    const engine = BF.currentEngine;
    const site = currentSite();
    if (!engine || Number(site?.stage) < 1) return false;

    const anchor = site.anchor || site.position || {
      x: 0,
      z: 8
    };
    const THREE = engine.THREE;
    if (!THREE || !engine.character?.setTarget) return false;

    const destination = new THREE.Vector3(
      Number(anchor.x) || 0,
      0,
      Number(anchor.z) || 8
    );
    engine.pendingInteraction = null;
    engine.pendingGate = null;
    engine.character.setTarget(destination, "walk");
    engine.showWorldMarker?.(destination);
    engine.callbacks?.onStatus?.(
      "Le sac approche de sa limite. BlueFox retourne au camp pour le vider."
    );
    return true;
  };

  const depositIfArrived = () => {
    if (!returning || !BF.canAccessCampInventory?.()) {
      return false;
    }

    const before = total();
    if (!before) {
      returning = false;
      return true;
    }

    BF.depositAllInventory?.();
    BF.flushPersistence?.("capacity-auto-deposit");
    returning = false;
    BF.currentEngine?.callbacks?.onStatus?.(
      "BlueFox a vidé son sac dans le stockage du camp."
    );
    global.dispatchEvent(
      new CustomEvent("bluefox:inventory-capacity-changed")
    );
    return true;
  };

  const evaluate = () => {
    const now = performance.now();
    if (now - lastCheckAt < CHECK_COOLDOWN_MS) return false;
    lastCheckAt = now;

    if (depositIfArrived()) return true;

    const count = total();
    const limit = capacity();
    const threshold = Math.ceil(
      limit * RETURN_THRESHOLD_RATIO
    );
    const status = `${count}:${limit}:${returning}`;
    if (status !== lastStatus) {
      lastStatus = status;
      global.dispatchEvent(
        new CustomEvent(
          "bluefox:inventory-capacity-changed",
          {
            detail: {
              count,
              capacity: limit,
              threshold,
              returning
            }
          }
        )
      );
    }

    if (count < threshold || returning) return false;

    returning = true;

    if (!moveToLocalCamp()) {
      BF.currentEngine?.callbacks?.onStatus?.(
        "Le sac approche de sa limite. BlueFox prépare un retour vers la base."
      );
      BF.currentEngine?.returnToBase?.();
    }
    return true;
  };

  global.addEventListener(
    "bluefox:progression-changed",
    evaluate
  );
  global.addEventListener("bluefox:map-state", evaluate);
  global.addEventListener(
    "bluefox:research-skill-unlocked",
    evaluate
  );

  global.setInterval(depositIfArrived, 1000);

  BF.getInventoryCapacityState = () =>
    Object.freeze({
      count: total(),
      capacity: capacity(),
      returnThreshold: Math.ceil(
        capacity() * RETURN_THRESHOLD_RATIO
      ),
      survivalBagLearned: hasSurvivalBagSkill(),
      returningToBase: returning
    });
})(window);
