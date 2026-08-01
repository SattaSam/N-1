(function (global) {
  "use strict";

  const BF = global.BlueFox3D;

  class CharacterController {
    constructor(THREE, root, visual, mixer, clips) {
      this.THREE = THREE;
      this.root = root;
      this.visual = visual;
      this.mixer = mixer;
      this.clips = clips;
      this.actions = new Map();
      this.currentAction = null;
      this.currentAnimation = "";
      this.locomotionState = "idle";
      this.target = root.position.clone();
      this.finalTarget = root.position.clone();
      this.waypoints = [];
      this.pathPlanner = new BF.PathPlanner(THREE, { step: 1.2, bounds: 27 });
      this.velocity = new THREE.Vector3();
      this.desiredDirection = new THREE.Vector3();
      this.collisionNormal = new THREE.Vector3();
      this.heading = 0;
      this.speed = 0;
      this.radius = 0.64;
      this.maxSpeed = 3.55;
      this.playerSprintUntil = 0;
      this.movementMode = "auto";
      this.autonomousRunThreshold = 13.5;
      this.acceleration = 5.2;
      this.deceleration = 7.5;
      this.turnSpeed = 9;
      this.arrivalRadius = 1.6;
      this.stopRadius = 0.1;
      this.colliders = [];
      this.enabled = true;
      this.lastSafePosition = root.position.clone();
      this.stuckTime = 0;
      this.lastDistance = Infinity;
      this.failedReplans = 0;
      this.maxFrameTravel = 0.22;
      this.actionLockUntil = 0;
      this.interactionSequence = null;
      clips.forEach((clip) => this.actions.set(clip.name, mixer.clipAction(clip)));
      this.play(this.findClip(["Idle", "Idle_V2", "Idle_V1"]), 0);
    }

    static async create(THREE, GLTFLoader, modelAsset) {
      const gltf = await new Promise((resolve, reject) => {
        new GLTFLoader().load(modelAsset, resolve, undefined, reject);
      });
      const root = new THREE.Group();
      root.name = "BlueFoxPhysicsRoot";
      const visualPivot = new THREE.Group();
      visualPivot.name = "BlueFoxVisualPivot";
      root.add(visualPivot);
      const visual = gltf.scene;
      visual.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false;
      });
      visualPivot.add(visual);

      const initialBox = new THREE.Box3().setFromObject(visual);
      const size = initialBox.getSize(new THREE.Vector3());
      visual.scale.setScalar(2.25 / Math.max(size.y, 0.001));
      const normalizedBox = new THREE.Box3().setFromObject(visual);
      const center = normalizedBox.getCenter(new THREE.Vector3());
      visual.position.set(-center.x, -normalizedBox.min.y, -center.z);
      visual.rotation.set(0, 0, 0);

      const clips = CharacterController.withoutRootMotion(gltf.animations);
      const mixer = new THREE.AnimationMixer(visual);
      return new CharacterController(THREE, root, visual, mixer, clips);
    }

    static withoutRootMotion(sourceClips) {
      return sourceClips.map((source) => {
        const clip = source.clone();
        clip.tracks.forEach((track) => {
          if (!/(^|[./\[])Root\]?\.position$/i.test(track.name)) return;
          const size = track.getValueSize();
          if (size < 3 || track.values.length < size) return;
          const anchor = Array.from(track.values.slice(0, size));
          for (let index = 0; index < track.values.length; index += size) {
            track.values[index] = anchor[0];
            track.values[index + 1] = anchor[1];
            track.values[index + 2] = anchor[2];
          }
          track.userData = { ...(track.userData || {}), bluefoxRootMotionRemoved: true };
        });
        return clip;
      });
    }

    findClip(names) {
      for (const name of names) {
        if (this.actions.has(name)) return name;
      }
      return this.clips[0]?.name || "";
    }

    findClipMatching(patterns, fallbackNames = []) {
      for (const pattern of patterns) {
        const clip = this.clips.find((candidate) => pattern.test(candidate.name));
        if (clip) return clip.name;
      }
      return this.findClip(fallbackNames);
    }

    findAvailableClip(names) {
      return names.find((name) => name && this.actions.has(name)) || "";
    }

    setColliders(colliders) {
      this.colliders = colliders;
      if (this.finalTarget) this.rebuildPath();
    }

    setTarget(target, movementMode = "auto") {
      if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.z)) return;
      const directDistance = this.root.position.distanceTo(target);
      this.movementMode = movementMode === "auto"
        ? (directDistance > this.autonomousRunThreshold ? "run" : "walk")
        : movementMode;
      this.finalTarget.copy(target);
      this.finalTarget.y = 0;
      this.failedReplans = 0;
      this.rebuildPath();
    }

    rebuildPath(extraPadding = 0) {
      this.waypoints = this.pathPlanner.plan(
        this.root.position,
        this.finalTarget,
        this.colliders,
        this.radius,
        0.12 + extraPadding
      );
      if (this.waypoints.length) {
        this.finalTarget.copy(this.waypoints[this.waypoints.length - 1]);
      }
      const next = this.waypoints.shift() || this.finalTarget;
      this.target.copy(next);
      this.lastDistance = Infinity;
      global.dispatchEvent(new CustomEvent("bluefox:path-planned", {
        detail: {
          points: [
            { x: this.root.position.x, z: this.root.position.z },
            { x: this.target.x, z: this.target.z },
            ...this.waypoints.map((point) => ({ x: point.x, z: point.z }))
          ]
        }
      }));
    }

    stop() {
      this.finalTarget.copy(this.root.position);
      this.target.copy(this.root.position);
      this.waypoints.length = 0;
      this.speed = 0;
      this.velocity.set(0, 0, 0);
      this.stuckTime = 0;
      this.failedReplans = 0;
      this.playerSprintUntil = 0;
      this.movementMode = "auto";
    }

    setPlayerSprint(durationSeconds = 18) {
      this.playerSprintUntil =
        performance.now() + Math.max(2, durationSeconds) * 1000;
      this.movementMode = "run-fast";
    }

    cancelInteraction() {
      this.actionLockUntil = 0;
      this.interactionSequence = null;
      this.currentAnimation = "";
    }

    facePoint(point, immediate = true) {
      if (!point) return;
      const dx = point.x - this.root.position.x;
      const dz = point.z - this.root.position.z;
      if (Math.hypot(dx, dz) < 0.001) return;
      const heading = Math.atan2(dx, dz);
      this.heading = immediate
        ? heading
        : BF.dampAngle(this.heading, heading, this.turnSpeed, 1 / 30);
      this.root.rotation.y = this.heading;
    }

    play(name, fade = 0.18, once = false) {
      if (!name || (name === this.currentAnimation && !once)) return;
      const action = this.actions.get(name);
      if (!action) return;
      if (this.currentAction && this.currentAction !== action) this.currentAction.fadeOut(fade);
      action.reset();
      action.enabled = true;
      action.setEffectiveWeight(1);
      action.setLoop(once ? this.THREE.LoopOnce : this.THREE.LoopRepeat, once ? 1 : Infinity);
      action.clampWhenFinished = once;
      action.fadeIn(fade).play();
      this.currentAction = action;
      this.currentAnimation = name;
    }

    playInteraction(action, animationHints = []) {
      const normalizedAction = String(action || "observe").toLowerCase();
      const acquisition = normalizedAction === "collect" ||
        normalizedAction === "extract";
      const requestedNames = Array.isArray(animationHints)
        ? animationHints
        : [animationHints];
      const useObservationGesture = Math.random() < 0.28;
      const names = acquisition
        ? [
            ...requestedNames,
            this.clips.find((clip) => /harvest[_\s-]*heavy/i.test(clip.name))?.name,
            this.clips.find((clip) => /harvest[_\s-]*medium/i.test(clip.name))?.name,
            this.clips.find((clip) => /harvers/i.test(clip.name))?.name,
            this.clips.find((clip) => /harvest[_\s-]*small/i.test(clip.name))?.name
          ]
        : useObservationGesture ? [
            ...requestedNames,
            this.clips.find((clip) => /ear[_\s-]*right/i.test(clip.name))?.name,
            this.clips.find((clip) => /^ear/i.test(clip.name))?.name
          ] : [];
      const idle = this.findAvailableClip(["Idle", "Idle_V2", "Idle_V3", "Idle_V4"]);
      const uniqueNames = names.filter(
        (name, index) =>
          name &&
          this.actions.has(name) &&
          names.indexOf(name) === index
      );
      if (!uniqueNames.length && idle) uniqueNames.push(idle);
      const speed = acquisition ? 1.1 : 1;
      const steps = uniqueNames.map((name) => ({
        name,
        duration: Math.max(
          0.65,
          (this.actions.get(name)?.getClip().duration || 1.2) / speed
        )
      }));
      if (!steps.length) {
        this.actionLockUntil = 0;
        this.interactionSequence = null;
        return 0.9;
      }
      const now = performance.now();
      const duration = steps.reduce((total, step) => total + step.duration, 0);
      this.interactionSequence = {
        steps,
        index: 0,
        speed,
        stepEndsAt: now + steps[0].duration * 1000,
        endsAt: now + duration * 1000
      };
      this.actionLockUntil = this.interactionSequence.endsAt;
      this.play(steps[0].name, 0.14, true);
      this.currentAction?.setEffectiveTimeScale(speed);
      return duration;
    }

    playAmbientObservation() {
      const ear = this.findAvailableClip([
        "Ear_Right",
        this.clips.find((clip) => /^ear/i.test(clip.name))?.name
      ]);
      if (!ear) return 0;
      const duration = Math.max(
        0.65,
        this.actions.get(ear)?.getClip().duration || 1.2
      );
      const now = performance.now();
      this.interactionSequence = {
        steps: [{ name: ear, duration }],
        index: 0,
        speed: 1,
        stepEndsAt: now + duration * 1000,
        endsAt: now + duration * 1000
      };
      this.actionLockUntil = this.interactionSequence.endsAt;
      this.play(ear, 0.18, true);
      return duration;
    }

    updateInteractionSequence(now) {
      const sequence = this.interactionSequence;
      if (!sequence || now < sequence.stepEndsAt) return;
      sequence.index += 1;
      if (sequence.index >= sequence.steps.length) {
        this.interactionSequence = null;
        this.actionLockUntil = 0;
        this.currentAnimation = "";
        return;
      }
      const step = sequence.steps[sequence.index];
      sequence.stepEndsAt += step.duration * 1000;
      this.play(step.name, 0.12, true);
      this.currentAction?.setEffectiveTimeScale(sequence.speed);
    }

    playRoutine(kind, durationSeconds) {
      const candidates = kind === "research"
        ? ["Idle_V3", "Idle_V2", "Idle"]
        : kind === "food"
          ? ["Idle_V4", "Idle_V2", "Idle"]
          : ["Idle_V2", "Idle_V3", "Idle"];
      const clip = this.findClip(candidates);
      this.actionLockUntil = performance.now() + durationSeconds * 1000;
      this.play(clip, 0.24, false);
    }

    updateLocomotionState() {
      if (this.movementMode === "walk" && this.speed > 0.08) {
        this.locomotionState = "walk";
        return this.locomotionState;
      }
      if (
        (this.movementMode === "run" || this.movementMode === "run-fast") &&
        this.speed > 1.15
      ) {
        this.locomotionState = "run";
        return this.locomotionState;
      }
      if (this.locomotionState === "idle") {
        if (this.speed > 0.26) this.locomotionState = "walk";
      } else if (this.locomotionState === "walk") {
        if (this.speed < 0.14) this.locomotionState = "idle";
        else if (this.speed > 2.5) this.locomotionState = "run";
      } else if (this.speed < 2.08) {
        this.locomotionState = this.speed < 0.14 ? "idle" : "walk";
      }
      return this.locomotionState;
    }

    resolveCollisions(position, previous) {
      for (const collider of this.colliders) {
        const dx = position.x - collider.position.x;
        const dz = position.z - collider.position.z;
        const minimum = this.radius + collider.radius;
        const distanceSquared = dx * dx + dz * dz;
        if (distanceSquared >= minimum * minimum) continue;
        const distance = Math.sqrt(Math.max(distanceSquared, 0.0001));
        this.collisionNormal.set(dx / distance, 0, dz / distance);
        const attempted = position.clone().sub(previous);
        const inward = attempted.dot(this.collisionNormal);
        if (inward < 0) attempted.addScaledVector(this.collisionNormal, -inward);
        position.copy(previous).add(attempted);
        const correctionX = position.x - collider.position.x;
        const correctionZ = position.z - collider.position.z;
        const correctedDistance = Math.hypot(correctionX, correctionZ);
        if (correctedDistance < minimum) {
          const correction = Math.min(minimum - correctedDistance, this.maxFrameTravel);
          position.x += (correctionX / Math.max(correctedDistance, 0.001)) * correction;
          position.z += (correctionZ / Math.max(correctedDistance, 0.001)) * correction;
        }
      }
    }

    update(dt) {
      if (!this.enabled) {
        this.mixer.update(dt);
        return;
      }
      this.updateInteractionSequence(performance.now());

      const delta = this.target.clone().sub(this.root.position);
      delta.y = 0;
      let distance = delta.length();
      while (distance < 0.42 && this.waypoints.length) {
        this.target.copy(this.waypoints.shift());
        this.lastDistance = Infinity;
        delta.copy(this.target).sub(this.root.position);
        delta.y = 0;
        distance = delta.length();
      }
      const moving = distance > this.stopRadius;

      if (
        !Number.isFinite(this.root.position.x) ||
        !Number.isFinite(this.root.position.z) ||
        this.root.position.lengthSq() > 10000
      ) {
        this.root.position.copy(this.lastSafePosition);
        this.stop();
      }

      if (moving) {
        this.desiredDirection.copy(delta).normalize();
        for (const collider of this.colliders) {
          const relative = collider.position.clone().sub(this.root.position);
          relative.y = 0;
          const forwardDistance = relative.dot(this.desiredDirection);
          if (forwardDistance <= 0 || forwardDistance > 4.2) continue;
          const closest = this.root.position.clone().addScaledVector(
            this.desiredDirection,
            forwardDistance
          );
          const clearance = closest.distanceTo(collider.position);
          const required = this.radius + collider.radius + 0.34;
          if (clearance >= required) continue;
          const perpendicular = new this.THREE.Vector3(
            -this.desiredDirection.z,
            0,
            this.desiredDirection.x
          );
          const cross = this.desiredDirection.x * relative.z -
            this.desiredDirection.z * relative.x;
          const stableSide = Math.abs(cross) > 0.04
            ? (cross > 0 ? -1 : 1)
            : (collider.owner.id % 2 ? -1 : 1);
          perpendicular.multiplyScalar(stableSide);
          const strength = (1 - clearance / required) *
            (1 - forwardDistance / 4.2) * 2.4;
          this.desiredDirection.addScaledVector(perpendicular, strength).normalize();
        }
        const arrival = distance < this.arrivalRadius
          ? this.THREE.MathUtils.smoothstep(distance, this.stopRadius, this.arrivalRadius)
          : 1;
        const playerSprint =
          this.movementMode === "run-fast" ||
          performance.now() < this.playerSprintUntil;
        const movementSpeed = this.movementMode === "walk"
          ? Math.min(this.maxSpeed, 2.05)
          : this.maxSpeed;
        const desiredSpeed =
          movementSpeed * (playerSprint ? 1.3 : 1) * arrival;
        const lambda = desiredSpeed > this.speed ? this.acceleration : this.deceleration;
        this.speed = BF.damp(this.speed, desiredSpeed, lambda, dt);
        this.velocity.lerp(this.desiredDirection, 1 - Math.exp(-7 * dt)).normalize();

        const previous = this.root.position.clone();
        const proposed = previous.clone().addScaledVector(
          this.velocity,
          Math.min(distance, this.speed * dt, this.maxFrameTravel)
        );
        this.resolveCollisions(proposed, previous);
        const actualTravel = proposed.distanceTo(previous);
        if (actualTravel > this.maxFrameTravel * 1.05) {
          proposed.copy(previous).lerp(
            proposed,
            this.maxFrameTravel / Math.max(actualTravel, 0.001)
          );
        }
        this.root.position.copy(proposed);
        const remainingDistance = this.root.position.distanceTo(this.target);
        const madeProgress =
          actualTravel > 0.003 &&
          (
            !Number.isFinite(this.lastDistance) ||
            remainingDistance < this.lastDistance - 0.002
          );
        let replanned = false;
        if (madeProgress) {
          this.lastSafePosition.copy(this.root.position);
          this.stuckTime = 0;
          if (actualTravel > 0.025) this.failedReplans = 0;
        } else if (distance > 0.7) {
          this.stuckTime += dt;
          if (this.stuckTime > 1.2) {
            this.failedReplans += 1;
            this.stuckTime = 0;
            if (this.failedReplans >= 3) {
              const failedTarget = this.finalTarget.clone();
              this.stop();
              global.dispatchEvent(new CustomEvent("bluefox:navigation-failed", {
                detail: { target: failedTarget }
              }));
            } else {
              this.rebuildPath(0.24 + this.failedReplans * 0.14);
              replanned = true;
            }
          }
        }
        if (!replanned) this.lastDistance = remainingDistance;

        const desiredHeading = Math.atan2(this.velocity.x, this.velocity.z);
        this.heading = BF.dampAngle(this.heading, desiredHeading, this.turnSpeed, dt);
        this.root.rotation.y = this.heading;
      } else {
        this.speed = BF.damp(this.speed, 0, this.deceleration, dt);
        this.velocity.multiplyScalar(Math.max(0, 1 - dt * this.deceleration));
      }

      const actionLocked = performance.now() < this.actionLockUntil;
      const walk = this.findClip(["Walk", "Walk_V1"]);
      const playerSprint =
        this.movementMode === "run-fast" ||
        performance.now() < this.playerSprintUntil;
      const run = playerSprint
        ? this.findClip(["Run_fast", "Run", "Walk", "Walk_V1"])
        : this.findClip(["Run", "Run_fast", "Walk", "Walk_V1"]);
      const idle = this.findClip(["Idle", "Idle_V2", "Idle_V1"]);
      const locomotion = this.updateLocomotionState();
      if (!actionLocked) {
        this.play(
          locomotion === "run" ? run : locomotion === "walk" ? walk : idle,
          locomotion === "idle" ? 0.24 : 0.16
        );
      }
      if (this.currentAction && this.speed > 0.22) {
        const referenceSpeed = locomotion === "run"
          ? (playerSprint ? 2.35 : 2.5)
          : 2.25;
        this.currentAction.setEffectiveTimeScale(
          BF.clamp(
            this.speed / referenceSpeed,
            0.72,
            playerSprint ? 1.65 : 1.5
          )
        );
      }
      this.root.position.y = 0;
      this.mixer.update(dt);
    }
  }

  BF.CharacterController = CharacterController;
})(window);
