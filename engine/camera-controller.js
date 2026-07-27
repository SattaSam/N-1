(function (global) {
  "use strict";

  const BF = global.BlueFox3D;

  class CameraController {
    constructor(THREE, camera, controls, character, domElement) {
      this.THREE = THREE;
      this.camera = camera;
      this.controls = controls;
      this.character = character;
      this.domElement = domElement;
      this.lastUserInput = performance.now();
      this.followDelay = 3500;
      this.followTarget = new THREE.Vector3();
      this.desiredCamera = new THREE.Vector3();
      this.previousCharacterPosition = character.root.position.clone();
      this.freeOffset = new THREE.Vector3();
      this.lastSafeCameraPosition = camera.position.clone();
      this.lastSafeTarget = controls.target.clone();
      this.lastHealthCheck = performance.now();
      this.recoveryCount = 0;
      this.userInteracting = false;
      this.mode = localStorage.getItem("bluefox_camera_mode_v1") === "free-follow"
        ? "free-follow"
        : "anchored";

      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 4.5;
      controls.maxDistance = 34;
      controls.minPolarAngle = 0.45;
      controls.maxPolarAngle = Math.PI * 0.47;

      this.onStart = () => {
        this.userInteracting = true;
        this.lastUserInput = performance.now();
      };
      this.onChange = () => {
        if (this.userInteracting) this.lastUserInput = performance.now();
      };
      this.onEnd = () => {
        this.userInteracting = false;
        this.lastUserInput = performance.now();
      };
      controls.addEventListener("start", this.onStart);
      controls.addEventListener("change", this.onChange);
      controls.addEventListener("end", this.onEnd);
    }

    resetBehindCharacter(immediate = false) {
      const position = this.character.root.position;
      const heading = this.character.heading;
      this.desiredCamera.set(
        position.x - Math.sin(heading) * 8,
        6.2,
        position.z - Math.cos(heading) * 8
      );
      if (immediate) this.camera.position.copy(this.desiredCamera);
      this.mode = "anchored";
      localStorage.setItem("bluefox_camera_mode_v1", this.mode);
      this.lastUserInput = 0;
      this.emitMode();
    }

    toggleFreeFollow() {
      this.mode = this.mode === "free-follow" ? "anchored" : "free-follow";
      this.freeOffset.copy(this.camera.position).sub(this.character.root.position);
      this.previousCharacterPosition.copy(this.character.root.position);
      this.lastUserInput = performance.now();
      localStorage.setItem("bluefox_camera_mode_v1", this.mode);
      this.emitMode();
      return this.mode;
    }

    emitMode() {
      global.dispatchEvent(new CustomEvent("bluefox:camera-mode", {
        detail: { mode: this.mode }
      }));
    }

    isFiniteVector(vector) {
      return Number.isFinite(vector.x) &&
        Number.isFinite(vector.y) &&
        Number.isFinite(vector.z);
    }

    recoverCamera() {
      const position = this.character.root.position;
      const heading = Number.isFinite(this.character.heading)
        ? this.character.heading
        : 0;
      this.camera.position.set(
        position.x - Math.sin(heading) * 8,
        6.2,
        position.z - Math.cos(heading) * 8
      );
      this.controls.target.set(position.x, 1.15, position.z);
      this.previousCharacterPosition.copy(position);
      this.userInteracting = false;
      this.mode = "anchored";
      this.lastUserInput = 0;
      this.lastSafeCameraPosition.copy(this.camera.position);
      this.lastSafeTarget.copy(this.controls.target);
      this.recoveryCount += 1;
      localStorage.setItem("bluefox_camera_mode_v1", this.mode);
      this.emitMode();
    }

    ensureHealthy(now) {
      if (now - this.lastHealthCheck < 750) return;
      this.lastHealthCheck = now;
      const characterPosition = this.character.root.position;
      const finite = this.isFiniteVector(this.camera.position) &&
        this.isFiniteVector(this.controls.target) &&
        this.isFiniteVector(characterPosition);
      const distance = finite
        ? this.camera.position.distanceTo(characterPosition)
        : Infinity;
      if (!finite || distance < 3.6 || distance > 42) {
        this.recoverCamera();
        return;
      }
      this.lastSafeCameraPosition.copy(this.camera.position);
      this.lastSafeTarget.copy(this.controls.target);
    }

    update(dt) {
      const position = this.character.root.position;
      const now = performance.now();
      this.ensureHealthy(now);
      const horizontalDistance = Math.hypot(
        this.camera.position.x - position.x,
        this.camera.position.z - position.z
      );
      const strategicView = BF.clamp((horizontalDistance - 10) / 24, 0, 1);
      this.followTarget.set(
        position.x,
        1.15 + strategicView * 10.5,
        position.z
      );
      const characterDelta = position.clone().sub(this.previousCharacterPosition);

      if (this.mode === "free-follow" && !this.userInteracting) {
        this.camera.position.add(characterDelta);
        this.controls.target.add(characterDelta);
      } else {
        const targetLambda = this.userInteracting ? 12 : 6;
        this.controls.target.lerp(this.followTarget, 1 - Math.exp(-targetLambda * dt));
      }

      if (
        this.mode === "anchored" &&
        !this.userInteracting &&
        now - this.lastUserInput > this.followDelay
      ) {
        const heading = this.character.heading;
        const followDistance = BF.clamp(horizontalDistance, 7.5, 34);
        this.desiredCamera.set(
          position.x - Math.sin(heading) * followDistance,
          4.75 + followDistance * 0.18,
          position.z - Math.cos(heading) * followDistance
        );
        this.camera.position.lerp(this.desiredCamera, 1 - Math.exp(-1.8 * dt));
      }
      this.previousCharacterPosition.copy(position);
      this.controls.update();
      this.ensureHealthy(now);
    }

    dispose() {
      this.controls.removeEventListener("start", this.onStart);
      this.controls.removeEventListener("change", this.onChange);
      this.controls.removeEventListener("end", this.onEnd);
      this.controls.dispose();
    }
  }

  BF.CameraController = CameraController;
})(window);
