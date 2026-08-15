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

      this.MODE_ANCHORED = "anchored";
      this.MODE_WORLD_FIXED = "free-follow"; // Nom conservé pour compatibilité UI/localStorage.

      this.DEFAULT_HORIZONTAL_DISTANCE = 8;
      this.DEFAULT_CAMERA_HEIGHT = 6.2;
      this.DEFAULT_TARGET_HEIGHT = 1.15;
      this.ANCHORED_MAX_DISTANCE = 18;
      this.WORLD_FIXED_MAX_DISTANCE = 60;
      this.WORLD_FIXED_LOOK_DELAY = 7500;
      this.HORIZONTAL_ORBIT_THRESHOLD = THREE.MathUtils.degToRad(1.5);

      this.lastUserInput = performance.now();
      this.followTarget = new THREE.Vector3();
      this.desiredCamera = new THREE.Vector3();
      this.previousCharacterPosition = character.root.position.clone();
      this.lastSafeCameraPosition = camera.position.clone();
      this.lastSafeTarget = controls.target.clone();
      this.worldFixedCameraPosition = camera.position.clone();
      this.lastHealthCheck = performance.now();
      this.recoveryCount = 0;
      this.userInteracting = false;

      // Mode 1 : la caméra reste attachée à BlueFox.
      // followBehind=true  -> état 1.A, elle pivote avec BlueFox.
      // followBehind=false -> état 1.B, l'angle choisi reste fixe dans le monde.
      this.followBehind = true;
      this.resettingToDefault = false;
      this.interactionStartAzimuth = 0;

      this.mode = localStorage.getItem("bluefox_camera_mode_v1") === this.MODE_WORLD_FIXED
        ? this.MODE_WORLD_FIXED
        : this.MODE_ANCHORED;

      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 4.5;
      controls.maxDistance = this.mode === this.MODE_WORLD_FIXED
        ? this.WORLD_FIXED_MAX_DISTANCE
        : this.ANCHORED_MAX_DISTANCE;
      controls.minPolarAngle = 0.45;
      controls.maxPolarAngle = Math.PI * 0.47;

      this.onStart = () => {
        this.userInteracting = true;
        this.lastUserInput = performance.now();
        this.interactionStartAzimuth = this.getCameraAzimuthAroundCharacter();
      };

      this.onChange = () => {
        if (!this.userInteracting) return;
        this.lastUserInput = performance.now();

        // En mode 2, la nouvelle position choisie par le joueur devient
        // immédiatement la position fixe dans le monde.
        if (this.mode === this.MODE_WORLD_FIXED) {
          this.worldFixedCameraPosition.copy(this.camera.position);
          return;
        }

        // En mode 1, seul un déplacement horizontal/orbite quitte l'état 1.A.
        // Zoomer, dézoomer ou incliner la caméra conserve le suivi arrière.
        if (this.mode === this.MODE_ANCHORED && this.followBehind) {
          const currentAzimuth = this.getCameraAzimuthAroundCharacter();
          const azimuthDelta = Math.abs(this.shortestAngleDelta(
            this.interactionStartAzimuth,
            currentAzimuth
          ));

          if (azimuthDelta > this.HORIZONTAL_ORBIT_THRESHOLD) {
            this.followBehind = false;
            this.resettingToDefault = false;
          }
        }
      };

      this.onEnd = () => {
        if (this.mode === this.MODE_WORLD_FIXED) {
          this.worldFixedCameraPosition.copy(this.camera.position);
        }
        this.userInteracting = false;
        this.lastUserInput = performance.now();
      };

      controls.addEventListener("start", this.onStart);
      controls.addEventListener("change", this.onChange);
      controls.addEventListener("end", this.onEnd);
    }

    shortestAngleDelta(from, to) {
      return Math.atan2(Math.sin(to - from), Math.cos(to - from));
    }

    getCameraAzimuthAroundCharacter() {
      const position = this.character.root.position;
      const dx = this.camera.position.x - position.x;
      const dz = this.camera.position.z - position.z;
      return Math.atan2(dx, dz);
    }

    captureViewState() {
      const position = this.character.root.position;
      return {
        mode: this.mode,
        followBehind: this.followBehind,
        cameraOffset: this.camera.position.clone().sub(position),
        targetOffset: this.controls.target.clone().sub(position),
        worldFixedOffset: this.worldFixedCameraPosition.clone().sub(position)
      };
    }

    restoreViewState(state) {
      if (!state?.cameraOffset || !state?.targetOffset) return false;
      const position = this.character.root.position;
      this.mode = state.mode === this.MODE_WORLD_FIXED
        ? this.MODE_WORLD_FIXED
        : this.MODE_ANCHORED;
      this.followBehind = state.followBehind === true;
      this.resettingToDefault = false;
      this.userInteracting = false;
      this.controls.maxDistance = this.mode === this.MODE_WORLD_FIXED
        ? this.WORLD_FIXED_MAX_DISTANCE
        : this.ANCHORED_MAX_DISTANCE;
      this.camera.position.copy(position).add(state.cameraOffset);
      this.controls.target.copy(position).add(state.targetOffset);
      this.worldFixedCameraPosition.copy(position).add(
        state.worldFixedOffset || state.cameraOffset
      );
      this.previousCharacterPosition.copy(position);
      this.lastSafeCameraPosition.copy(this.camera.position);
      this.lastSafeTarget.copy(this.controls.target);
      this.lastUserInput = performance.now();
      localStorage.setItem("bluefox_camera_mode_v1", this.mode);
      this.emitMode();
      return true;
    }

    resetBehindCharacter(immediate = false) {
      const position = this.character.root.position;
      const heading = Number.isFinite(this.character.heading)
        ? this.character.heading
        : 0;

      this.followTarget.set(
        position.x,
        position.y + this.DEFAULT_TARGET_HEIGHT,
        position.z
      );
      this.desiredCamera.set(
        position.x - Math.sin(heading) * this.DEFAULT_HORIZONTAL_DISTANCE,
        position.y + this.DEFAULT_CAMERA_HEIGHT,
        position.z - Math.cos(heading) * this.DEFAULT_HORIZONTAL_DISTANCE
      );

      this.mode = this.MODE_ANCHORED;
      this.controls.maxDistance = this.ANCHORED_MAX_DISTANCE;
      this.followBehind = true;
      this.resettingToDefault = !immediate;
      this.userInteracting = false;
      this.lastUserInput = performance.now();
      this.previousCharacterPosition.copy(position);

      if (immediate) {
        this.camera.position.copy(this.desiredCamera);
        this.controls.target.copy(this.followTarget);
      }

      localStorage.setItem("bluefox_camera_mode_v1", this.mode);
      this.emitMode();
    }

    toggleFreeFollow() {
      if (this.mode === this.MODE_WORLD_FIXED) {
        // Retour au mode 1.A : suivi arrière + distance et inclinaison par défaut.
        this.resetBehindCharacter(false);
      } else {
        // Mode 2 : la caméra reste exactement à son emplacement dans le monde.
        this.mode = this.MODE_WORLD_FIXED;
        this.controls.maxDistance = this.WORLD_FIXED_MAX_DISTANCE;
        this.followBehind = false;
        this.resettingToDefault = false;
        this.userInteracting = false;
        this.lastUserInput = performance.now();
        this.worldFixedCameraPosition.copy(this.camera.position);
        this.previousCharacterPosition.copy(this.character.root.position);
        localStorage.setItem("bluefox_camera_mode_v1", this.mode);
        this.emitMode();
      }
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
        position.x - Math.sin(heading) * this.DEFAULT_HORIZONTAL_DISTANCE,
        position.y + this.DEFAULT_CAMERA_HEIGHT,
        position.z - Math.cos(heading) * this.DEFAULT_HORIZONTAL_DISTANCE
      );
      this.controls.target.set(
        position.x,
        position.y + this.DEFAULT_TARGET_HEIGHT,
        position.z
      );
      this.previousCharacterPosition.copy(position);
      this.userInteracting = false;
      this.mode = this.MODE_ANCHORED;
      this.controls.maxDistance = this.ANCHORED_MAX_DISTANCE;
      this.followBehind = true;
      this.resettingToDefault = false;
      this.lastUserInput = performance.now();
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

      // En mode 2, la caméra est volontairement fixe dans le monde :
      // BlueFox peut donc s'en éloigner sans déclencher de recentrage.
      const invalidDistance = this.mode === this.MODE_WORLD_FIXED
        ? false
        : distance < 3.6 || distance > 24;

      if (!finite || invalidDistance) {
        this.recoverCamera();
        return;
      }

      this.lastSafeCameraPosition.copy(this.camera.position);
      this.lastSafeTarget.copy(this.controls.target);
    }

    updateAnchoredMode(dt, position, characterDelta) {
      // Dans les états 1.A et 1.B, la caméra suit toujours la translation de BlueFox.
      if (!this.userInteracting) {
        this.camera.position.add(characterDelta);
        this.controls.target.add(characterDelta);
      }

      this.followTarget.set(
        position.x,
        position.y + this.DEFAULT_TARGET_HEIGHT,
        position.z
      );

      if (this.userInteracting) return;

      if (this.resettingToDefault) {
        const heading = Number.isFinite(this.character.heading)
          ? this.character.heading
          : 0;
        this.desiredCamera.set(
          position.x - Math.sin(heading) * this.DEFAULT_HORIZONTAL_DISTANCE,
          position.y + this.DEFAULT_CAMERA_HEIGHT,
          position.z - Math.cos(heading) * this.DEFAULT_HORIZONTAL_DISTANCE
        );

        const resetAlpha = 1 - Math.exp(-3.2 * dt);
        this.controls.target.lerp(this.followTarget, resetAlpha);
        this.camera.position.lerp(this.desiredCamera, resetAlpha);

        if (
          this.camera.position.distanceTo(this.desiredCamera) < 0.03 &&
          this.controls.target.distanceTo(this.followTarget) < 0.02
        ) {
          this.camera.position.copy(this.desiredCamera);
          this.controls.target.copy(this.followTarget);
          this.resettingToDefault = false;
        }
        return;
      }

      // La cible reste centrée sur BlueFox dans les deux états du mode 1.
      this.controls.target.lerp(this.followTarget, 1 - Math.exp(-10 * dt));

      if (!this.followBehind) {
        // État 1.B : l'offset monde choisi par le joueur est conservé.
        return;
      }

      // État 1.A : conserver le zoom et l'inclinaison choisis par le joueur,
      // mais faire pivoter l'angle horizontal avec l'orientation de BlueFox.
      const offset = this.camera.position.clone().sub(this.controls.target);
      const horizontalDistance = Math.max(
        0.001,
        Math.hypot(offset.x, offset.z)
      );
      const heading = Number.isFinite(this.character.heading)
        ? this.character.heading
        : 0;

      this.desiredCamera.set(
        this.controls.target.x - Math.sin(heading) * horizontalDistance,
        this.controls.target.y + offset.y,
        this.controls.target.z - Math.cos(heading) * horizontalDistance
      );
      this.camera.position.lerp(this.desiredCamera, 1 - Math.exp(-5 * dt));
    }

    updateWorldFixedMode(dt, now, position) {
      // Mode 2 : la caméra est verrouillée à une position absolue dans le monde.
      // Pendant une interaction, la nouvelle position choisie est mémorisée.
      if (this.userInteracting) {
        this.worldFixedCameraPosition.copy(this.camera.position);
        return;
      }

      this.camera.position.copy(this.worldFixedCameraPosition);

      if (now - this.lastUserInput < this.WORLD_FIXED_LOOK_DELAY) return;

      // Après 7,5 s, seule l'orientation évolue progressivement vers BlueFox.
      this.followTarget.set(
        position.x,
        position.y + this.DEFAULT_TARGET_HEIGHT,
        position.z
      );
      this.controls.target.lerp(this.followTarget, 1 - Math.exp(-2.4 * dt));
      this.camera.lookAt(this.controls.target);
    }

    update(dt) {
      const position = this.character.root.position;
      const now = performance.now();
      this.ensureHealthy(now);

      const characterDelta = position.clone().sub(this.previousCharacterPosition);

      if (this.mode === this.MODE_WORLD_FIXED) {
        this.updateWorldFixedMode(dt, now, position);
      } else {
        this.updateAnchoredMode(dt, position, characterDelta);
      }

      this.previousCharacterPosition.copy(position);
      this.controls.update();

      // OrbitControls peut déplacer légèrement la caméra lorsque sa cible change.
      // En mode 2, on réimpose donc la position monde après sa mise à jour.
      if (this.mode === this.MODE_WORLD_FIXED && !this.userInteracting) {
        this.camera.position.copy(this.worldFixedCameraPosition);
        this.camera.lookAt(this.controls.target);
      }

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
