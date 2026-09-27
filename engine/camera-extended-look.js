(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Controller = BF.CameraController;

  if (!Controller?.prototype) {
    console.error("[BlueFox] Camera Extended Look : CameraController indisponible.");
    return;
  }

  const VERSION = "anchored-low-angle-v1";
  const ORIGINAL_MAX_POLAR = Math.PI * 0.47;
  const EXTENDED_MAX_POLAR = Math.PI * 0.69;
  const NORMAL_MIN_DISTANCE = 4.5;
  const LOW_ANGLE_MIN_DISTANCE = 1.65;
  const CAMERA_FLOOR = 0.32;
  const FLOOR_EPSILON = 0.015;

  const originalUpdate = Controller.prototype.update;
  const originalEnsureHealthy = Controller.prototype.ensureHealthy;
  const originalReset = Controller.prototype.resetBehindCharacter;
  const originalRecover = Controller.prototype.recoverCamera;
  const originalToggle = Controller.prototype.toggleFreeFollow;

  const finiteVector = (v) =>
    v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

  const polarAngle = (controller) => {
    const offset = controller.camera.position.clone().sub(controller.controls.target);
    const radius = Math.max(0.0001, offset.length());
    return Math.acos(BF.clamp(offset.y / radius, -1, 1));
  };

  const configureAnchoredLimits = (controller) => {
    if (controller.mode !== controller.MODE_ANCHORED) return;
    controller.controls.maxPolarAngle = EXTENDED_MAX_POLAR;

    const polar = polarAngle(controller);
    controller.controls.minDistance =
      polar > ORIGINAL_MAX_POLAR - 0.015
        ? LOW_ANGLE_MIN_DISTANCE
        : NORMAL_MIN_DISTANCE;
  };

  const applyPlateauLimitedLowAngle = (controller) => {
    if (
      controller.mode !== controller.MODE_ANCHORED ||
      !controller.camera ||
      !controller.controls ||
      !controller.character
    ) return;

    const target = controller.controls.target;
    const camera = controller.camera;
    const offset = camera.position.clone().sub(target);
    const radius = Math.max(0.0001, offset.length());
    const polar = Math.acos(BF.clamp(offset.y / radius, -1, 1));

    controller.controls.maxPolarAngle = EXTENDED_MAX_POLAR;
    controller.controls.minDistance =
      polar > ORIGINAL_MAX_POLAR - 0.015
        ? LOW_ANGLE_MIN_DISTANCE
        : NORMAL_MIN_DISTANCE;

    // Jusqu'à l'ancienne limite, aucun comportement ne change.
    if (polar <= ORIGINAL_MAX_POLAR) return;

    // Au-delà, OrbitControls peut descendre normalement jusqu'au plateau.
    // Dès que la caméra voudrait passer sous le sol, on conserve exactement
    // l'angle demandé mais on réduit son rayon : elle se rapproche de BlueFox
    // et produit progressivement la contre-plongée demandée.
    if (camera.position.y < CAMERA_FLOOR) {
      const cosPolar = Math.cos(polar);

      if (cosPolar < -0.0001) {
        const availableDrop = Math.max(
          0.08,
          target.y - CAMERA_FLOOR
        );
        const floorRadius = availableDrop / -cosPolar;
        const safeRadius = BF.clamp(
          floorRadius,
          LOW_ANGLE_MIN_DISTANCE,
          radius
        );

        offset.setLength(safeRadius);
        camera.position.copy(target).add(offset);
      }

      camera.position.y = Math.max(camera.position.y, CAMERA_FLOOR);
    }

    if (camera.position.y <= CAMERA_FLOOR + FLOOR_EPSILON) {
      camera.position.y = CAMERA_FLOOR;
    }
  };

  Controller.prototype.update = function updateWithExtendedLook(dt) {
    configureAnchoredLimits(this);
    const result = originalUpdate.call(this, dt);
    applyPlateauLimitedLowAngle(this);
    return result;
  };

  Controller.prototype.ensureHealthy = function ensureHealthyExtended(now) {
    // Le mode contre-plongée autorise volontairement une distance < 3.6,
    // ce que l'ancien contrôle considérait comme une caméra invalide.
    if (this.mode === this.MODE_ANCHORED) {
      const characterPosition = this.character?.root?.position;
      const finite =
        finiteVector(this.camera?.position) &&
        finiteVector(this.controls?.target) &&
        finiteVector(characterPosition);

      const distance = finite
        ? this.camera.position.distanceTo(characterPosition)
        : Infinity;

      const lowAngle = finite && polarAngle(this) > ORIGINAL_MAX_POLAR;

      if (lowAngle && distance >= 1.35 && distance <= 24) {
        if (now - this.lastHealthCheck >= 750) {
          this.lastHealthCheck = now;
          this.lastSafeCameraPosition.copy(this.camera.position);
          this.lastSafeTarget.copy(this.controls.target);
        }
        return;
      }
    }

    return originalEnsureHealthy.call(this, now);
  };

  Controller.prototype.resetBehindCharacter = function resetExtended(...args) {
    const result = originalReset.apply(this, args);
    configureAnchoredLimits(this);
    return result;
  };

  Controller.prototype.recoverCamera = function recoverExtended(...args) {
    const result = originalRecover.apply(this, args);
    configureAnchoredLimits(this);
    return result;
  };

  Controller.prototype.toggleFreeFollow = function toggleExtended(...args) {
    const result = originalToggle.apply(this, args);
    if (this.mode === this.MODE_ANCHORED) {
      configureAnchoredLimits(this);
    }
    return result;
  };

  BF.CameraExtendedLook = Object.freeze({
    version: VERSION,
    originalMaxPolar: ORIGINAL_MAX_POLAR,
    extendedMaxPolar: EXTENDED_MAX_POLAR,
    cameraFloor: CAMERA_FLOOR,
    lowAngleMinDistance: LOW_ANGLE_MIN_DISTANCE
  });

  console.info(
    "[BlueFox] Camera Extended Look actif : vue normale prolongée jusqu'à la contre-plongée.",
    BF.CameraExtendedLook
  );
})(window);
