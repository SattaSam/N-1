(function (global) {
  "use strict";

  const BF = global.BlueFox3D;

  class WorldEngine {
    constructor(options) {
      Object.assign(this, options);
      this.disposed = false;
      this.frame = 0;
      this.currentMap = null;
      this.currentMapId = "crystal";
      this.pendingInteraction = null;
      this.interactionStartedAt = 0;
      this.interactionApproachStartedAt = 0;
      this.interactionApproachAttempts = 0;
      this.transitioning = false;
      this.lastSavedAt = 0;
      this.lastAutonomyAt = performance.now();
      this.autonomyActionStreak = 0;
      this.autonomyBreakTarget = 2 + Math.floor(Math.random() * 2);
      this.lastFatigueSpeechAt = -30000;
      this.lastSpeechAt = -10000;
      this.discoveredMaps = new Set(["crystal"]);
      this.discoveredZones = new Set();
      this.resourceCooldowns = new WeakMap();
      this.pointerDown = { x: 0, y: 0 };
      this.raycaster = null;
      this.pointer = null;
      this.groundPlane = null;
      this.clock = null;
      this.resizeObserver = null;
      this.transitionElement = null;
      this.panorama = null;
      this.panoramaTexture = null;
      this.compassNeedle = null;
      this.lastCompassCheck = 0;
      this.cameraButton = null;
      this.clickMarker = null;
      this.lastCycleUpdate = 0;
      this.gateCooldownUntil = 0;
      this.lastActivityAt = performance.now();
      this.lastIntentUpdate = 0;
      this.destinationMarker = null;
      this.destinationMarkerStartedAt = 0;
      this.pathLine = null;
      this.characterGroundShadow = null;
      this.speechButton = null;
      this.speechVisible = localStorage.getItem("bluefox_speech_visible_v1") !== "false";
      this.lastActivityUiUpdate = 0;
      this.currentActivityKey = "";
      this.intentMissionKey = "";
      this.stableIntentText = "";
      this.currentRoutine = null;
      this.postActionRecoveryUntil = 0;
      this.lastCompletedAction = "";
      this.transitionStartedAt = 0;
      this.explorationRelocationGuard = null;
      this.completedTransitions = 0;
      this.completedInteractions = 0;
      this.navigationFailures = 0;
      this.resumeCount = 0;
      this.lastResumeAt = 0;
      this.currentZoneIndex = -1;
      this.lastZoneCheckAt = 0;
      this.pendingZoneExploration = null;
      this.biomeParticles = null;
      this.biomeParticleSettings = null;
      this.mobilePerformanceProfile = this.prefersMobilePerformanceProfile();
      this.performanceQuality = this.mobilePerformanceProfile ? "balanced" : "high";
      this.performanceFrames = 0;
      this.performanceElapsed = 0;
      this.performanceWarmup = this.mobilePerformanceProfile ? 4 : 8;
      this.performanceLowSamples = 0;
      this.performanceHighSamples = 0;
      this.measuredFps = 60;
      this.missingImageUrls = new Set();
      this.generatedTopology = [];
      this.mapNames = new Map();
      this.navigationRoute = [];
      this.pendingTeleport = null;
      this.navigationAllowsTeleport = false;
      this.persistentNavigationIntent = this.restorePersistentNavigationIntent();
      this.returningToBase = false;
      this.__cachedInteractionApproach = null;
      this.cautiousInteraction = null;

      // WorldEngine reste le propriétaire unique de l'exécution du monde :
      // OFF, pause d'intro et fenêtres de grâce agissent ici, avant BAC/Missions.
      this.runtimePaused = false;
      this.runtimePauseReason = "";
      this.autonomyMode = this.readAutonomyMode();
      this.autonomyGraceUntil = 0;
      this.speechQuietUntil = 0;
      this.startupQuietUntil = 0;
      this.semiAutonomousGateLock = false;
      this.onAutonomyMode = (event) => this.applyAutonomyMode(
        event?.detail?.mode,
        event?.detail?.source || "event"
      );

      const freshNewGameAt = Number(
        localStorage.getItem("bluefox_new_game_start_v1") || 0
      );
      this.freshNewGameStartup =
        freshNewGameAt > 0 && Date.now() - freshNewGameAt < 120000;
      this.startupNewGameAt = freshNewGameAt;
      const startupCinematicDoneAt = Number(
        localStorage.getItem("bluefox_startup_cinematic_done_v1") || 0
      );
      this.shouldPlayStartupCinematic =
        this.freshNewGameStartup && startupCinematicDoneAt !== freshNewGameAt;
      this.startupCinematic = null;
      this.startupFadeElement = null;
      this.startupUiRevealTimer = 0;
      this.finalCapsuleSequence = null;
      this.finalFadeElement = null;
      if (this.freshNewGameStartup) {
        const quietUntil = performance.now() + (
          this.shouldPlayStartupCinematic
            ? 12000
            : this.autonomyQuietDelayMs()
        );
        this.autonomyGraceUntil = quietUntil;
        this.speechQuietUntil = quietUntil;
        this.startupQuietUntil = quietUntil;
      }
      if (this.shouldPlayStartupCinematic) {
        this.prepareStartupPresentation();
      }

      this.onMissingImage = (event) => {
        const source = String(event.detail?.source || "image inconnue");
        if (this.missingImageUrls.has(source)) return;
        this.missingImageUrls.add(source);
        let filename = source.split("/").pop() || source;
        try {
          filename = decodeURIComponent(filename);
        } catch {
          // Le chemin brut reste suffisamment explicite pour le diagnostic.
        }
        this.callbacks.onStatus(
          `Image locale introuvable : ${filename}. Vérifiez le dossier Images puis relancez GENERER_CATALOGUE_IMAGES.bat.`
        );
        this.callbacks.onAction(
          `Asset manquant pour ${event.detail?.mapName || "la map actuelle"} : ${filename}.`
        );
      };
    }

    prefersMobilePerformanceProfile() {
      const touchPoints = Math.max(0, Number(global.navigator?.maxTouchPoints) || 0);
      const coarsePointer = global.matchMedia?.("(pointer: coarse)")?.matches === true;
      // Le profil mobile ne dépend jamais de la largeur de fenêtre : un PC
      // redimensionné, même tactile, conserve donc le chemin desktop.
      return touchPoints > 0 && coarsePointer;
    }

    autonomyQuietDelayMs() {
      return 2000 + Math.floor(Math.random() * 2001);
    }

    ensureStartupPresentationStyle() {
      if (document.getElementById("bluefox-startup-presentation-style")) return;
      const style = document.createElement("style");
      style.id = "bluefox-startup-presentation-style";
      style.textContent = `
        body.bluefox-startup-cinematic .game-shell > :not(.world-3d):not(#bluefox-speech),
        body.bluefox-startup-cinematic .bluefox-camera-button,
        body.bluefox-startup-cinematic .bluefox-speech-button,
        body.bluefox-startup-cinematic .mission-browser,
        body.bluefox-startup-cinematic .bluefox-tutorial-message,
        body.bluefox-startup-cinematic .bluefox-click-marker {
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
        body.bluefox-startup-cinematic #bluefox-speech {
          visibility: visible !important;
          pointer-events: none !important;
          z-index: 95 !important;
        }
        .bluefox-startup-fade {
          position: fixed;
          inset: 0;
          z-index: 90;
          background: #000;
          opacity: 1;
          pointer-events: none;
          transition: opacity .9s ease;
        }
        .bluefox-startup-fade.revealed {
          opacity: 0;
        }
        body.bluefox-startup-ui-reveal .game-shell > :not(.world-3d):not(#bluefox-speech),
        body.bluefox-startup-ui-reveal .bluefox-camera-button,
        body.bluefox-startup-ui-reveal .bluefox-speech-button {
          animation: bluefoxStartupUiReveal .45s ease both;
        }
        @keyframes bluefoxStartupUiReveal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        body.bluefox-final-cinematic .game-shell > :not(.world-3d),
        body.bluefox-final-cinematic .bluefox-camera-button,
        body.bluefox-final-cinematic .bluefox-speech-button,
        body.bluefox-final-cinematic .mission-browser,
        body.bluefox-final-cinematic .bluefox-tutorial-message,
        body.bluefox-final-cinematic .bluefox-click-marker {
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
        .bluefox-final-fade {
          position: fixed;
          inset: 0;
          z-index: 140;
          display: grid;
          place-items: center;
          background: #000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 1.6s ease;
        }
        .bluefox-final-fade.covered { opacity: 1; }
        .bluefox-final-credits {
          max-width: min(760px, 82vw);
          text-align: center;
          color: #fff;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 1.4s ease, transform 1.4s ease;
          font-family: inherit;
        }
        .bluefox-final-fade.credits-visible { pointer-events: auto; }
        .bluefox-final-fade.credits-visible .bluefox-final-credits {
          opacity: 1;
          transform: translateY(0);
        }
        .bluefox-final-credits h1 {
          margin: 0 0 .7rem;
          font-size: clamp(2rem, 6vw, 4.4rem);
          letter-spacing: .12em;
        }
        .bluefox-final-credits p {
          margin: .35rem 0;
          opacity: .82;
        }
        .bluefox-final-credits button {
          margin-top: 1.4rem;
          padding: .65rem 1.1rem;
          font: inherit;
          cursor: pointer;
        }
      `;
      document.head.appendChild(style);
    }

    prepareStartupPresentation() {
      this.ensureStartupPresentationStyle();
      BF.startupPresentationActive = true;
      BF.startupGuidanceReleaseAt = 0;
      if (!this.startupPresentationOriginalOnSpeak) {
        this.startupPresentationOriginalOnSpeak = this.callbacks.onSpeak;
        this.startupPresentationDeferredSpeech = null;
        this.callbacks.onSpeak = (text) => {
          this.startupPresentationDeferredSpeech = text;
        };
      }
      document.body.classList.add("bluefox-startup-cinematic");
      if (!this.startupFadeElement) {
        this.startupFadeElement = document.createElement("div");
        this.startupFadeElement.className = "bluefox-startup-fade";
        this.startupFadeElement.setAttribute("aria-hidden", "true");
        document.body.appendChild(this.startupFadeElement);
      }
      global.dispatchEvent(new CustomEvent("bluefox:intro-presentation", {
        detail: { active: true }
      }));
    }

    startStartupCinematic() {
      if (!this.shouldPlayStartupCinematic || this.startupCinematic) return false;
      const crashSite = BF.maps?.crystal?.crashSite;
      if (
        this.currentMapId !== "crystal" ||
        !crashSite?.capsuleAnchor ||
        !this.cameraController ||
        !this.character?.root
      ) {
        this.finishStartupCinematic();
        return false;
      }

      const now = performance.now();
      const anchor = new this.THREE.Vector3(
        Number(crashSite.capsuleAnchor.x) || 0,
        0,
        Number(crashSite.capsuleAnchor.z) || 0
      );
      this.startupCinematic = {
        startedAt: now,
        orbitEndsAt: now + 6800,
        hardEndsAt: now + 11200,
        returnStarted: false,
        nextMovement: 0,
        firstSpeechShown: false,
        secondSpeechShown: false,
        anchor,
        movementPlan: [
          { at: 0, x: 2.4, z: 5 },
          { at: 2600, x: -0.8, z: 5 },
          { at: 4800, x: 0.8, z: 5 }
        ]
      };

      this.startupQuietUntil = Math.max(this.startupQuietUntil, now + 11200);
      this.autonomyGraceUntil = Math.max(this.autonomyGraceUntil, now + 11200);
      this.speechQuietUntil = Math.max(this.speechQuietUntil, now + 11200);
      this.cameraController.beginCinematicOrbit({
        center: anchor,
        durationMs: 6800,
        radius: 13.4,
        height: 7.2,
        targetHeight: 1.15,
        startAngle: -Math.PI + 0.22 - Math.PI / 4,
        arc: Math.PI
      });
      const first = this.startupCinematic.movementPlan[0];
      this.character.setTarget(
        new this.THREE.Vector3(first.x, 0, first.z),
        "walk"
      );
      this.startupCinematic.nextMovement = 1;

      requestAnimationFrame(() => requestAnimationFrame(() => {
        this.startupFadeElement?.classList.add("revealed");
      }));
      return true;
    }

    updateStartupCinematic(now) {
      const state = this.startupCinematic;
      if (!state) return false;
      const elapsed = now - state.startedAt;

      while (
        state.nextMovement < state.movementPlan.length &&
        elapsed >= state.movementPlan[state.nextMovement].at
      ) {
        const next = state.movementPlan[state.nextMovement];
        this.character.setTarget(
          new this.THREE.Vector3(next.x, 0, next.z),
          "walk"
        );
        state.nextMovement += 1;
      }

      if (!state.firstSpeechShown && elapsed >= 1800) {
        state.firstSpeechShown = true;
        this.startupPresentationOriginalOnSpeak?.("Quelle catastrophe…");
        this.lastSpeechAt = now;
      }
      if (!state.secondSpeechShown && elapsed >= 5700) {
        state.secondSpeechShown = true;
        this.startupPresentationOriginalOnSpeak?.("Ma capsule est complètement hors d’usage.");
        this.lastSpeechAt = now;
      }

      if (!state.returnStarted && now >= state.orbitEndsAt) {
        state.returnStarted = true;
        this.character.stop();
        this.character.facePoint(state.anchor);
        this.cameraController.beginCinematicReturn(2200);
      }

      if (
        state.returnStarted &&
        !this.cameraController.isCinematicActive?.()
      ) {
        this.finishStartupCinematic();
        return false;
      }

      if (now >= state.hardEndsAt) {
        this.cameraController.finishCinematic?.();
        this.finishStartupCinematic();
        return false;
      }
      return true;
    }

    finishStartupCinematic() {
      const state = this.startupCinematic;
      if (state?.anchor && this.character?.root) {
        this.character.stop();
        this.character.facePoint(state.anchor);
      }
      this.cameraController?.finishCinematic?.();
      this.startupCinematic = null;
      this.shouldPlayStartupCinematic = false;
      if (this.startupNewGameAt > 0) {
        localStorage.setItem(
          "bluefox_startup_cinematic_done_v1",
          String(this.startupNewGameAt)
        );
      }
      BF.startupPresentationActive = false;
      BF.startupGuidanceReleaseAt = Date.now() + 1800;
      const originalOnSpeak = this.startupPresentationOriginalOnSpeak;
      const deferredSpeech = this.startupPresentationDeferredSpeech;
      window.clearTimeout(this.startupSpeechReleaseTimer);
      this.startupSpeechReleaseTimer = window.setTimeout(() => {
        if (originalOnSpeak) this.callbacks.onSpeak = originalOnSpeak;
        this.startupPresentationOriginalOnSpeak = null;
        this.startupPresentationDeferredSpeech = null;
        if (deferredSpeech && this.speechVisible !== false) {
          originalOnSpeak?.(deferredSpeech);
          const speechNow = performance.now();
          this.lastSpeechAt = speechNow;
          this.lastFatigueSpeechAt = speechNow;
        }
      }, 1800);
      this.startupFadeElement?.remove();
      this.startupFadeElement = null;
      document.body.classList.remove("bluefox-startup-cinematic");
      document.body.classList.add("bluefox-startup-ui-reveal");
      window.clearTimeout(this.startupUiRevealTimer);
      this.startupUiRevealTimer = window.setTimeout(() => {
        document.body.classList.remove("bluefox-startup-ui-reveal");
      }, 500);
      global.dispatchEvent(new CustomEvent("bluefox:intro-presentation", {
        detail: { active: false }
      }));
      const now = performance.now();
      this.startupQuietUntil = now + 900;
      this.beginAutonomyGrace("startup-cinematic-complete", now);
      this.lastActivityAt = now;
      this.lastAutonomyAt = now;
      this.savePosition();
      return true;
    }

    clearStartupPresentation() {
      this.cameraController?.finishCinematic?.();
      this.startupCinematic = null;
      BF.startupPresentationActive = false;
      BF.startupGuidanceReleaseAt = 0;
      window.clearTimeout(this.startupSpeechReleaseTimer);
      if (this.startupPresentationOriginalOnSpeak) {
        this.callbacks.onSpeak = this.startupPresentationOriginalOnSpeak;
      }
      this.startupPresentationOriginalOnSpeak = null;
      this.startupPresentationDeferredSpeech = null;
      this.startupFadeElement?.remove();
      this.startupFadeElement = null;
      window.clearTimeout(this.startupUiRevealTimer);
      document.body.classList.remove(
        "bluefox-startup-cinematic",
        "bluefox-startup-ui-reveal"
      );
      global.dispatchEvent(new CustomEvent("bluefox:intro-presentation", {
        detail: { active: false }
      }));
    }

    isFinalCapsuleSequenceActive() {
      return Boolean(this.finalCapsuleSequence);
    }

    beginFinalCapsuleSequence(options = {}) {
      if (this.finalCapsuleSequence) return true;
      const capsule = this.currentMap?.crashCapsule;
      if (
        this.currentMapId !== "crystal" ||
        !capsule?.position ||
        !this.character?.root ||
        !this.cameraController
      ) {
        return false;
      }

      this.ensureStartupPresentationStyle();
      this.clearPersistentNavigationIntent?.("final-capsule-sequence");
      this.navigationRoute = [];
      this.pendingGate = null;
      this.pendingTeleport = null;
      this.pendingInteraction = null;
      this.currentRoutine = null;
      this.returningToBase = false;
      this.runtimePaused = true;
      this.runtimePauseReason = "final-capsule-sequence";
      this.character.stop?.();
      this.character.enabled = false;

      const start = this.character.root.position.clone();
      const anchor = capsule.position.clone();
      const outward = start.clone().sub(anchor);
      outward.y = 0;
      if (outward.lengthSq() < 0.01) outward.set(0, 0, 1);
      outward.normalize();
      const inside = anchor.clone().addScaledVector(outward, -1.15);
      inside.y = start.y;

      this.finalCapsuleSequence = {
        missionId: String(options.missionId || "FIN-02"),
        startedAt: performance.now(),
        start,
        anchor,
        inside,
        fadeStarted: false,
        hiddenInside: false,
        completed: false
      };

      document.body.classList.add("bluefox-final-cinematic");
      this.finalFadeElement?.remove();
      this.finalFadeElement = document.createElement("div");
      this.finalFadeElement.className = "bluefox-final-fade";
      this.finalFadeElement.setAttribute("aria-hidden", "true");
      const credits = document.createElement("div");
      credits.className = "bluefox-final-credits";
      const title = document.createElement("h1");
      title.textContent = "BLUEFOX ODYSSEY";
      const line = document.createElement("p");
      line.textContent = "Le point de départ";
      const thanks = document.createElement("p");
      thanks.textContent = "Merci d’avoir parcouru ce monde avec BlueFox.";
      const restart = document.createElement("button");
      restart.type = "button";
      restart.className = "bluefox-final-new-game";
      restart.textContent = "Nouvelle partie";
      restart.addEventListener?.("click", () => BF.playNewGameIntro?.());
      credits.append(title, line, thanks, restart);
      this.finalFadeElement.appendChild(credits);
      document.body.appendChild(this.finalFadeElement);

      this.character.facePoint?.(anchor);
      this.cameraController.beginCinematicOrbit({
        center: anchor,
        durationMs: 6200,
        radius: 9.6,
        height: 5.8,
        targetHeight: 1.2,
        startAngle: -Math.PI * 0.72,
        arc: Math.PI * 1.35
      });
      global.dispatchEvent?.(new CustomEvent("bluefox:final-presentation", {
        detail: { active: true, missionId: this.finalCapsuleSequence.missionId }
      }));
      return true;
    }

    updateFinalCapsuleSequence(now) {
      const state = this.finalCapsuleSequence;
      if (!state || state.completed) return false;
      const elapsed = now - state.startedAt;

      if (elapsed >= 650 && elapsed <= 4700) {
        const raw = Math.max(0, Math.min(1, (elapsed - 650) / 4050));
        const eased = raw * raw * (3 - 2 * raw);
        // Déplacement cinématique volontairement direct : pendant cette séquence
        // BlueFox traverse la coque et ses colliders au lieu de demander un passage.
        this.character.root.position.lerpVectors(state.start, state.inside, eased);
        this.character.target?.copy?.(this.character.root.position);
        this.character.facePoint?.(state.anchor);
      }

      if (!state.fadeStarted && elapsed >= 3900) {
        state.fadeStarted = true;
        this.finalFadeElement?.classList.add("covered");
      }
      if (!state.hiddenInside && elapsed >= 4850) {
        state.hiddenInside = true;
        this.character.root.visible = false;
      }
      if (elapsed < 6100) return true;

      state.completed = true;
      this.cameraController.finishCinematic?.();
      this.finalFadeElement?.classList.add("covered", "credits-visible");
      global.dispatchEvent?.(new CustomEvent("bluefox:final-departure-completed", {
        detail: {
          missionId: state.missionId,
          mapId: this.currentMapId,
          source: "crash-capsule",
          mode: "final-departure"
        }
      }));
      global.dispatchEvent?.(new CustomEvent("bluefox:final-presentation", {
        detail: { active: false, completed: true, missionId: state.missionId }
      }));
      return true;
    }

    readAutonomyMode() {
      const apiMode = String(BF.getAutonomyMode?.() || "").toLowerCase();
      if (["off", "semi", "full"].includes(apiMode)) return apiMode;

      const stored = String(
        localStorage.getItem("bluefox_autonomy_mode_v1") || ""
      ).toLowerCase();
      if (["off", "semi", "full"].includes(stored)) return stored;

      const startedAt = Number(
        localStorage.getItem("bluefox_new_game_start_v1") || 0
      );
      if (startedAt > 0 && Date.now() - startedAt < 120000) return "off";
      return startedAt > 0 ? "full" : "off";
    }

    beginAutonomyGrace(reason = "runtime", now = performance.now()) {
      const until = now + this.autonomyQuietDelayMs();
      this.autonomyGraceUntil = Math.max(this.autonomyGraceUntil, until);
      this.speechQuietUntil = Math.max(this.speechQuietUntil, until);
      this.lastAutonomyAt = now;
      this.lastActivityAt = now;
      this.lastAutonomyGraceReason = reason;
      return Math.max(0, until - now);
    }

    cancelAutonomousActivity(reason = "autonomy-disabled") {
      const playerNavigation = Boolean(
        this.persistentNavigationIntent ||
        this.returningToBase ||
        this.navigationRoute.length
      );
      const manualInteraction =
        this.pendingInteraction?.userData?.requestedInteractionSource === "manual";

      this.missionManager?.cancelCurrentAction?.(reason);

      if (this.pendingInteraction && !manualInteraction) {
        this.pendingInteraction.userData.requestedInteractionSource = null;
        this.pendingInteraction.userData.requestedMovementMode = null;
        this.pendingInteraction = null;
        this.interactionStartedAt = 0;
        this.interactionApproachStartedAt = 0;
        this.interactionApproachAttempts = 0;
        this.character?.cancelInteraction?.();
      }

      if (!playerNavigation) {
        this.pendingGate = null;
        this.pendingTeleport = null;
        this.pendingZoneExploration = null;
      }

      if (this.currentRoutine) {
        this.currentRoutine = null;
        this.character?.cancelInteraction?.();
      }

      if (!playerNavigation && !manualInteraction && this.character?.root) {
        this.character.stop?.();
        this.character.setTarget?.(this.character.root.position);
        if (this.destinationMarker) this.destinationMarker.visible = false;
        if (this.pathLine) this.pathLine.visible = false;
      }

      const now = performance.now();
      this.lastAutonomyAt = now;
      this.lastActivityAt = now;
    }

    applyAutonomyMode(mode, source = "system", now = performance.now()) {
      const normalized = String(mode || this.readAutonomyMode()).toLowerCase();
      if (!["off", "semi", "full"].includes(normalized)) return false;

      const previous = this.autonomyMode;
      this.autonomyMode = normalized;

      if (normalized === "off") {
        // Un simple resync UI/storage OFF -> OFF ne doit pas annuler une
        // commande manuelle du joueur (notamment un clic au sol).
        // L'annulation des tâches autonomes n'est nécessaire qu'au vrai
        // basculement SEMI/FULL -> OFF.
        if (previous !== "off") {
          this.cancelAutonomousActivity("autonomy-mode-off");
        }
        return true;
      }

      if (normalized !== previous) {
        this.beginAutonomyGrace(`autonomy-${source}`, now);
      }
      if (normalized !== "semi") this.semiAutonomousGateLock = false;
      return true;
    }

    autonomyAllowed(now = performance.now()) {
      const storedMode = this.readAutonomyMode();
      if (storedMode !== this.autonomyMode) {
        this.applyAutonomyMode(storedMode, "storage-sync", now);
      }
      return Boolean(
        !this.runtimePaused &&
        this.autonomyMode !== "off" &&
        now >= this.autonomyGraceUntil &&
        now >= this.startupQuietUntil
      );
    }

    setRuntimePaused(paused, reason = "runtime") {
      const next = paused === true;
      if (this.runtimePaused === next) return true;
      this.runtimePaused = next;
      this.runtimePauseReason = next ? reason : "";
      this.clock?.getDelta?.();
      if (!next) this.beginAutonomyGrace(`resume-${reason}`);
      return true;
    }

    canStartAutonomousGate() {
      return !(
        this.autonomyMode === "semi" &&
        this.semiAutonomousGateLock
      );
    }

    noteLocalAutonomousDecision() {
      if (this.autonomyMode === "semi" && this.semiAutonomousGateLock) {
        this.semiAutonomousGateLock = false;
      }
    }

    async initialize() {
      const { THREE, OrbitControls, GLTFLoader, container } = this;
      global.addEventListener("bluefox:image-missing", this.onMissingImage);
      BF.MapGenerator?.restore?.();
      this.restoreDiscovery();
      this.restoreMapNames();
      this.restoreGeneratedTopology();
      BF.sceneImages = {
        crystal: this.assets.sceneCrystal,
        jungle: this.assets.sceneJungle
      };
      Object.values(BF.maps).forEach((definition) => {
        if (definition.sceneUrl) {
          BF.sceneImages[definition.id] = definition.sceneUrl;
        }
      });

      this.renderer = new THREE.WebGLRenderer({
        antialias: !this.mobilePerformanceProfile,
        alpha: true,
        powerPreference: "high-performance"
      });
      this.renderer.setPixelRatio(Math.min(
        devicePixelRatio,
        this.mobilePerformanceProfile ? 1.25 : 2
      ));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.14;
      this.renderer.shadowMap.enabled = !this.mobilePerformanceProfile;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x071426);
      this.scene.fog = new THREE.FogExp2(0x071426, 0.012);
      this.createDestinationMarker();
      this.createPathVisual();

      this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
      this.camera.position.set(8, 6.2, 8);
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      this.hemisphere = new THREE.HemisphereLight(0x9ddfff, 0x10243a, 2.6);
      this.scene.add(this.hemisphere);
      this.sun = new THREE.DirectionalLight(0xccecff, 4.1);
      this.sun.position.set(-8, 14, 9);
      this.sun.castShadow = !this.mobilePerformanceProfile;
      const shadowMapSize = this.mobilePerformanceProfile ? 1024 : 2048;
      this.sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
      this.sun.shadow.camera.left = -32;
      this.sun.shadow.camera.right = 32;
      this.sun.shadow.camera.top = 32;
      this.sun.shadow.camera.bottom = -32;
      this.scene.add(this.sun);
      this.fill = new THREE.PointLight(0x71dfff, 9, 28);
      this.fill.position.set(8, 5, -5);
      this.scene.add(this.fill);

      this.createPanorama();
      this.character = await BF.CharacterController.create(
        THREE,
        GLTFLoader,
        this.assets.model
      );
      this.scene.add(this.character.root);
      this.createCharacterGrounding();

      const saved = this.restorePosition();
      this.currentMapId = saved.map;
      await this.loadMap(this.currentMapId, saved, false);
      this.character.root.position.set(saved.x, 0, saved.z);
      this.character.constrainToWalkable(this.character.root.position);
      this.character.setTarget(this.character.root.position);
      this.character.lastSafePosition.copy(this.character.root.position);

      this.cameraController = new BF.CameraController(
        THREE,
        this.camera,
        this.controls,
        this.character,
        this.renderer.domElement
      );
      this.cameraController.resetBehindCharacter(true);

      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2();
      this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      this.clock = new THREE.Clock();
      this.createTransitionElement();
      this.bindEvents();
      this.createExplorationHud();
      this.initializePlanetaryClock();
      this.resize();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(container);

      this.callbacks.onStatus("Nouveau moteur 3D initialisé sur une base stable.");
      global.dispatchEvent(new CustomEvent("bluefox:scene-images"));
      BF.currentEngine = this;
      BF.getDiagnostics = () => this.getDiagnostics();
      if (BF.Missions?.MissionManager) {
        this.missionManager = BF.Missions.MissionManager.create({
          engine: this
        });
        BF.getMissionState = () => this.missionManager.getState();
        BF.startMission = (missionId, options) =>
          this.missionManager.startMission(missionId, options);
        BF.setPrimaryMission = (missionId) =>
          this.missionManager.setPrimaryMission(missionId);
        BF.suggestMissionPriority = (missionId) =>
          this.missionManager.suggestPrimaryMission(missionId);
        BF.pauseMission = (missionId, reason) =>
          this.missionManager.pauseMission(missionId, reason);
        BF.resumeMission = (missionId, options) =>
          this.missionManager.resumeMission(missionId, options);
        BF.failMission = (missionId, reason) =>
          this.missionManager.failMission(missionId, reason);
        BF.triggerMission = (missionId, options = {}) =>
          this.missionManager.notifyMissionEvent(options.type || "event", {
            ...options,
            missionId
          });
        BF.setSiteStage = (mapId, stage, detail) =>
          this.missionManager.catalogController?.registerSiteStage(
            mapId,
            stage,
            detail
          ) || false;
        BF.bibleRuntime?.activateInitialMissions?.();
      }
      if (this.freshNewGameStartup) {
        const now = performance.now();
        const quietUntil = now + (
          this.shouldPlayStartupCinematic
            ? 12000
            : this.autonomyQuietDelayMs()
        );
        this.autonomyGraceUntil = Math.max(this.autonomyGraceUntil, quietUntil);
        this.speechQuietUntil = Math.max(this.speechQuietUntil, quietUntil);
        this.startupQuietUntil = Math.max(this.startupQuietUntil, quietUntil);
        this.lastAutonomyAt = now;
        this.lastActivityAt = now;
      }
      if (this.shouldPlayStartupCinematic) this.startStartupCinematic();
      this.loop();
      return this;
    }

    restoreDiscovery() {
      try {
        const memories = JSON.parse(
          localStorage.getItem("bluefox_engine_discovered_maps_v2") ||
          localStorage.getItem("bluefox_discovered_maps_v1") ||
          "[]"
        );
        const orderedMemories = memories
          .filter((map) => map?.id && BF.maps[map.id])
          .sort((left, right) =>
            (Number(left.order) || Number.MAX_SAFE_INTEGER) -
            (Number(right.order) || Number.MAX_SAFE_INTEGER)
          );
        this.discoveredMaps.clear();
        if (BF.maps.crystal) this.discoveredMaps.add("crystal");
        orderedMemories.forEach((map) => this.discoveredMaps.add(map.id));
      } catch {
        localStorage.removeItem("bluefox_discovered_maps_v1");
      }
      global.BlueFox3D.discoveredMaps = this.discoveredMaps;
      global.dispatchEvent(new CustomEvent("bluefox:discovery-changed", {
        detail: { maps: [...this.discoveredMaps] }
      }));
      try {
        const zones = JSON.parse(
          localStorage.getItem("bluefox_discovered_zones_v1") || "[]"
        );
        zones.filter((zone) => typeof zone === "string")
          .forEach((zone) => this.discoveredZones.add(zone));
      } catch {
        localStorage.removeItem("bluefox_discovered_zones_v1");
      }
      global.BlueFox3D.discoveredZones = this.discoveredZones;
    }

    discoveryNumber(mapId) {
      const index = [...this.discoveredMaps].indexOf(mapId);
      if (index >= 0) return index + 1;
      return BF.maps[mapId] ? this.discoveredMaps.size + 1 : null;
    }

    restoreGeneratedTopology() {
      try {
        const saved = JSON.parse(
          localStorage.getItem("bluefox_generated_topology_v1") || "[]"
        );
        if (!Array.isArray(saved)) return;
        this.generatedTopology = saved.filter((link) =>
          this.applyGeneratedLink(link)
        );
        if (this.generatedTopology.length !== saved.length) {
          localStorage.setItem(
            "bluefox_generated_topology_v1",
            JSON.stringify(this.generatedTopology)
          );
        }
      } catch {
        localStorage.removeItem("bluefox_generated_topology_v1");
        this.generatedTopology = [];
      }
    }

    restoreMapNames() {
      try {
        const saved = JSON.parse(
          localStorage.getItem("bluefox_map_names_v1") || "{}"
        );
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) return;
        Object.entries(saved).forEach(([mapId, name]) => {
          if (!BF.maps[mapId] || typeof name !== "string" || !name.trim()) return;
          const resolvedName = name.trim();
          BF.maps[mapId].name = resolvedName;
          this.mapNames.set(mapId, resolvedName);
        });
      } catch {
        localStorage.removeItem("bluefox_map_names_v1");
        this.mapNames.clear();
      }
    }

    sceneIdentity(definition) {
      if (!definition) return "";
      const catalogScene =
        global.BLUEFOX_MAP_ASSETS?.catalog?.maps?.find(
          (map) => map.id === definition.id || map.number === definition.number
        )?.scene?.url;
      const source =
        definition.sceneUrl ||
        catalogScene ||
        this.assets?.[definition.sceneAsset] ||
        definition.sceneAsset ||
        "";
      try {
        return decodeURIComponent(String(source))
          .replace(/\\/g, "/")
          .split(/[?#]/)[0]
          .toLocaleLowerCase("fr");
      } catch {
        return String(source)
          .replace(/\\/g, "/")
          .split(/[?#]/)[0]
          .toLocaleLowerCase("fr");
      }
    }

    ensureUniqueMapName(mapId) {
      const definition = BF.maps[mapId];
      if (!definition) return "";
      const savedName = this.mapNames.get(mapId);
      if (savedName) {
        definition.name = savedName;
        return savedName;
      }

      const normalize = (value) => String(value || "")
        .toLocaleLowerCase("fr")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      const discoveredDefinitions = [...this.discoveredMaps]
        .filter((id) => id !== mapId && BF.maps[id])
        .map((id) => BF.maps[id]);
      const sceneKey = this.sceneIdentity(definition);
      const duplicateScene = Boolean(sceneKey) && discoveredDefinitions.some(
        (map) => this.sceneIdentity(map) === sceneKey
      );
      const duplicateName = discoveredDefinitions.some(
        (map) => normalize(map.name) === normalize(definition.name)
      );
      if (!duplicateScene && !duplicateName) return definition.name;

      const namesByProfile = {
        volcanic: [
          "La Cicatrice d’Aube", "Les Forges Rouges", "Le Seuil de Braise",
          "La Caldeira Murmurante"
        ],
        frozen: [
          "Le Silence Boréal", "Les Éclats de Givre", "La Veille Blanche",
          "Le Miroir des Brumes"
        ],
        forest: [
          "La Canopée des Veilleurs", "Le Jardin des Échos", "Les Racines Célestes",
          "La Clairière Patiente"
        ],
        ruins: [
          "Les Vestiges Endormis", "La Cité des Silences", "Le Passage des Anciens",
          "Les Arches Oubliées"
        ],
        aquatic: [
          "Le Lagon des Lueurs", "Les Profondeurs Calmes", "La Mer des Murmures",
          "L’Archipel Opalin"
        ],
        desert: [
          "La Mer de Sable", "Les Dunes du Veilleur", "Le Désert des Deux Lunes",
          "La Vallée Sèche"
        ],
        crystalline: [
          "Le Champ des Résonances", "Les Flèches d’Azur", "La Plaine Prismatique",
          "Le Sanctuaire de Verre"
        ],
        alien: [
          "L’Horizon Inconnu", "La Terre des Signes", "Le Domaine des Échos",
          "La Frontière Silencieuse"
        ]
      };
      const candidates = namesByProfile[definition.profile] || namesByProfile.alien;
      let hash = 2166136261;
      for (const character of `${mapId}:${definition.seed}:${definition.name}`) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      }
      const usedNames = new Set(
        Object.values(BF.maps).map((map) => normalize(map.name))
      );
      let chosen = "";
      for (let offset = 0; offset < candidates.length; offset += 1) {
        const candidate = candidates[((hash >>> 0) + offset) % candidates.length];
        if (!usedNames.has(normalize(candidate))) {
          chosen = candidate;
          break;
        }
      }
      if (!chosen) {
        const base = candidates[(hash >>> 0) % candidates.length];
        let suffix = 2;
        chosen = `${base} ${suffix}`;
        while (usedNames.has(normalize(chosen))) {
          suffix += 1;
          chosen = `${base} ${suffix}`;
        }
      }

      definition.name = chosen;
      this.mapNames.set(mapId, chosen);
      localStorage.setItem(
        "bluefox_map_names_v1",
        JSON.stringify(Object.fromEntries(this.mapNames))
      );
      this.callbacks.onAction(
        `BlueFox baptise ce nouveau territoire « ${chosen} ».`
      );
      return chosen;
    }

    applyGeneratedLink(link) {
      const directions = {
        north: { x: 0, z: -26, opposite: "south" },
        south: { x: 0, z: 26, opposite: "north" },
        east: { x: 26, z: 0, opposite: "west" },
        west: { x: -26, z: 0, opposite: "east" }
      };
      const fromMap = BF.maps[link?.from];
      const toMap = BF.maps[link?.to];
      const placement = directions[link?.direction];
      if (!fromMap || !toMap || !placement) return false;
      const reverse = directions[placement.opposite];
      fromMap.exits[link.direction] = {
        x: placement.x,
        z: placement.z,
        targetMap: toMap.id,
        targetEntry: placement.opposite,
        generated: true
      };
      toMap.exits[placement.opposite] = {
        x: reverse.x,
        z: reverse.z,
        targetMap: fromMap.id,
        targetEntry: link.direction,
        generated: true
      };
      return true;
    }

    ensureMapContinuation(mapId) {
      const definition = BF.maps[mapId];
      if (!definition) return;
      // Les anciennes liaisons sont restaurées par restoreGeneratedTopology().
      // Une nouvelle destination n'est créée que sur ordre d'exploration du
      // joueur, dans generateUnknownPassage().
    }

    saveDiscovery() {
      const previous = (() => {
        try {
          return JSON.parse(
            localStorage.getItem("bluefox_discovered_maps_v1") || "[]"
          );
        } catch {
          return [];
        }
      })();
      const metadata = new Map(
        previous.filter((map) => map?.id).map((map) => [map.id, map])
      );
      const memories = [...this.discoveredMaps].map((id, index) => ({
        ...(metadata.get(id) || {}),
        id,
        name: BF.maps[id]?.name || metadata.get(id)?.name,
        sceneKey: this.sceneIdentity(BF.maps[id]),
        order: index + 1,
        discoveredAt: metadata.get(id)?.discoveredAt || Date.now()
      }));
      // game.js conserve un ancien catalogue React limité à crystal/jungle et
      // déréférence directement ses entrées au rechargement. Sa vue V1 reste
      // donc volontairement limitée aux IDs qu'il sait lire ; le moteur V2
      // demeure la source complète pour les cartes procédurales.
      const legacyMemories = memories.filter((map) =>
        map.id === "crystal" || map.id === "jungle"
      );
      localStorage.setItem(
        "bluefox_discovered_maps_v1",
        JSON.stringify(legacyMemories)
      );
      localStorage.setItem(
        "bluefox_engine_discovered_maps_v2",
        JSON.stringify(memories)
      );
      global.BlueFox3D.discoveredMaps = this.discoveredMaps;
      global.dispatchEvent(new CustomEvent("bluefox:discovery-changed", {
        detail: { maps: [...this.discoveredMaps] }
      }));
    }

    saveZoneDiscovery() {
      localStorage.setItem(
        "bluefox_discovered_zones_v1",
        JSON.stringify([...this.discoveredZones])
      );
      global.BlueFox3D.discoveredZones = this.discoveredZones;
      global.dispatchEvent(new CustomEvent("bluefox:zone-discovery-changed", {
        detail: { zones: [...this.discoveredZones] }
      }));
    }

    restorePosition() {
      try {
        const saved = JSON.parse(
          localStorage.getItem("bluefox_world_position_v2") ||
          localStorage.getItem("bluefox_world_position_v1") ||
          "null"
        );
        if (saved && BF.maps[saved.map]) {
          const center = saved.map === "jungle" && Math.abs(saved.x) > 30 ? 64 : 0;
          return {
            map: saved.map,
            x: BF.clamp(saved.x - center, -27, 27),
            z: BF.clamp(saved.z, -27, 27)
          };
        }
      } catch {
        localStorage.removeItem("bluefox_world_position_v2");
      }
      if (this.freshNewGameStartup) {
        return {
          map: "crystal",
          x: this.shouldPlayStartupCinematic ? -1.3 : 0.8,
          z: 5
        };
      }
      return { map: "crystal", x: 0, z: 5 };
    }

    savePosition() {
      localStorage.setItem("bluefox_world_position_v2", JSON.stringify({
        map: this.currentMapId,
        x: this.character.root.position.x,
        z: this.character.root.position.z,
        savedAt: Date.now()
      }));
    }

    createPanorama() {
      const { THREE } = this;

      // Grand panneau incurvé conservant la perspective actuelle.
      // Les dimensions sont légèrement augmentées pour couvrir le champ maximal
      // sans transformer la structure générale du décor.
      const panoramaWidth = 400;
      const panoramaHeight = 136;
      const geometry = new THREE.PlaneGeometry(
        panoramaWidth,
        panoramaHeight,
        96,
        22
      );
      const position = geometry.attributes.position;
      const uv = geometry.attributes.uv;

      for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index);
        const y = position.getY(index);
        const normalized = Math.abs(x) / (panoramaWidth * 0.5);
        const edge = Math.max(0, (normalized - 0.52) / 0.48);
        const vertical = BF.clamp(
          (y + panoramaHeight * 0.5) / panoramaHeight,
          0,
          1
        );
        const upperLean = Math.pow(vertical, 2);

        // Le panneau descend sous le plateau et monte largement au-dessus
        // de la limite visible de la caméra.
        position.setY(index, -19 + vertical * 94);

        // Inclinaison inversée par rapport au PATCH B1 : la base reste en retrait
        // tandis que le haut avance progressivement vers la caméra.
        // La courbure latérale du B1 est conservée sans autre modification.
        position.setZ(
          index,
          -88 +
          upperLean * 34 -
          normalized * normalized * 4 -
          edge * edge * 44
        );

        // 96 % de la texture restent consacrés à l'image normale.
        // Les 2 % extérieurs de chaque côté sont réservés aux pixels étirés.
        const t = x / panoramaWidth + 0.5;
        const u = t < 0.24
          ? (t / 0.24) * 0.02
          : t > 0.76
            ? 0.98 + ((t - 0.76) / 0.24) * 0.02
            : 0.02 + ((t - 0.24) / 0.52) * 0.96;
        uv.setX(index, u);
      }

      position.needsUpdate = true;
      uv.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();

      const material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        fog: false,
        depthWrite: false,
        toneMapped: false
      });

      this.panorama = new THREE.Mesh(geometry, material);
      this.panorama.name = "BiomePanorama";
      this.panorama.position.y = 0;
      this.panorama.renderOrder = -10;
      this.panorama.frustumCulled = false;
      this.scene.add(this.panorama);
    }

    createDestinationMarker() {
      const geometry = new this.THREE.RingGeometry(0.34, 0.48, 40);
      const material = new this.THREE.MeshBasicMaterial({
        color: 0x6ee9ff,
        transparent: true,
        opacity: 0,
        side: this.THREE.DoubleSide,
        depthWrite: false
      });
      this.destinationMarker = new this.THREE.Mesh(geometry, material);
      this.destinationMarker.name = "BlueFoxDestinationMarker";
      this.destinationMarker.rotation.x = -Math.PI / 2;
      this.destinationMarker.position.y = 0.055;
      this.destinationMarker.visible = false;
      this.scene.add(this.destinationMarker);
    }

    createPathVisual() {
      const geometry = new this.THREE.BufferGeometry().setFromPoints([
        new this.THREE.Vector3(),
        new this.THREE.Vector3()
      ]);
      const material = new this.THREE.LineDashedMaterial({
        color: 0x70e9ff,
        transparent: true,
        opacity: 0.34,
        dashSize: 0.28,
        gapSize: 0.2,
        depthWrite: false
      });
      this.pathLine = new this.THREE.Line(geometry, material);
      this.pathLine.name = "BlueFoxPlannedPath";
      this.pathLine.visible = false;
      this.scene.add(this.pathLine);
    }

    createCharacterGrounding() {
      const geometry = new this.THREE.CircleGeometry(0.72, 32);
      const material = new this.THREE.MeshBasicMaterial({
        color: 0x020711,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        side: this.THREE.DoubleSide
      });
      this.characterGroundShadow = new this.THREE.Mesh(geometry, material);
      this.characterGroundShadow.name = "BlueFoxGroundContact";
      this.characterGroundShadow.rotation.x = -Math.PI / 2;
      this.characterGroundShadow.scale.set(1, 1.34, 1);
      this.characterGroundShadow.position.y = 0.025;
      this.scene.add(this.characterGroundShadow);
    }

    updatePathVisual(detail) {
      if (!this.pathLine || !detail?.points?.length) return;
      const points = detail.points.map(
        (point) => new this.THREE.Vector3(point.x, 0.065, point.z)
      );
      if (points.length < 2) {
        this.pathLine.visible = false;
        return;
      }
      this.pathLine.geometry.dispose();
      this.pathLine.geometry = new this.THREE.BufferGeometry().setFromPoints(points);
      this.pathLine.computeLineDistances();
      this.pathLine.visible = true;
    }

    showWorldMarker(point) {
      if (!this.destinationMarker || !point) return;
      this.destinationMarker.position.set(point.x, 0.055, point.z);
      this.destinationMarker.scale.setScalar(1);
      this.destinationMarker.material.opacity = 0.9;
      this.destinationMarker.visible = true;
      this.destinationMarkerStartedAt = performance.now();
    }

    createExtendedPanoramaTexture(image) {
      const { THREE } = this;
      const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1);
      const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1);

      // PATCH A V16.21 : cadrage vertical conservé.
      // Le haut de l'image reste intact et les 9 % inférieurs sont retirés
      // afin de laisser davantage de place au ciel.
      const visibleSourceHeight = Math.max(
        1,
        Math.round(sourceHeight * 0.91)
      );

      // PATCH C V16.21 : extension latérale progressive.
      // Les marges sont plus larges que dans la V16.20 et ne sont plus
      // remplies par une simple colonne de pixels étirée uniformément.
      const sideFill = Math.max(24, Math.round(sourceWidth * 0.075));
      const topFill = Math.max(4, Math.round(sourceHeight * 0.012));
      const bottomFill = Math.max(12, sourceHeight - visibleSourceHeight);

      const canvas = document.createElement("canvas");
      canvas.width = sourceWidth + sideFill * 2;
      canvas.height = visibleSourceHeight + topFill + bottomFill;
      const context = canvas.getContext("2d", { alpha: false });

      if (!context) {
        const fallback = new THREE.Texture(image);
        fallback.needsUpdate = true;
        fallback.colorSpace = THREE.SRGBColorSpace;
        fallback.wrapS = THREE.ClampToEdgeWrapping;
        fallback.wrapT = THREE.ClampToEdgeWrapping;
        return fallback;
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      // Partie centrale : largeur complète, haut conservé, bas recadré.
      context.drawImage(
        image,
        0,
        0,
        sourceWidth,
        visibleSourceHeight,
        sideFill,
        topFill,
        sourceWidth,
        visibleSourceHeight
      );

      // Étire progressivement une petite bande située au bord de l'image.
      // Les bandes restent fines près de la jonction puis deviennent plus
      // larges vers l'extérieur, ce qui évite l'effet de colonne répétée.
      const drawProgressiveSide = (isLeft) => {
        const strips = 36;
        const sourceBand = Math.max(8, Math.round(sourceWidth * 0.045));

        for (let index = 0; index < strips; index += 1) {
          const t0 = index / strips;
          const t1 = (index + 1) / strips;
          const eased0 = Math.pow(t0, 1.7);
          const eased1 = Math.pow(t1, 1.7);

          const destinationStart = Math.round(sideFill * t0);
          const destinationEnd = Math.round(sideFill * t1);
          const destinationWidth = Math.max(1, destinationEnd - destinationStart);

          // À la jonction, on prélève presque le pixel extérieur. En allant
          // vers le bord du canvas, on utilise progressivement une zone plus
          // profonde du bord de l'image, puis on l'étire davantage.
          const sampleDepth = Math.max(1, Math.round(sourceBand * (eased1 - eased0)));
          const sampleOffset = Math.round(sourceBand * eased0);

          const sourceX = isLeft
            ? Math.min(sourceWidth - 1, sampleOffset)
            : Math.max(0, sourceWidth - sampleOffset - sampleDepth);

          const destinationX = isLeft
            ? sideFill - destinationEnd
            : sideFill + sourceWidth + destinationStart;

          context.drawImage(
            image,
            sourceX,
            0,
            sampleDepth,
            visibleSourceHeight,
            destinationX,
            topFill,
            destinationWidth,
            visibleSourceHeight
          );
        }

        // Fusion légère au raccord pour rendre la transition imperceptible.
        const seamWidth = Math.max(6, Math.round(sourceWidth * 0.006));
        const gradient = context.createLinearGradient(
          isLeft ? sideFill - seamWidth : sideFill + sourceWidth,
          0,
          isLeft ? sideFill : sideFill + sourceWidth + seamWidth,
          0
        );
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, "rgba(0,0,0,0.18)");
        context.save();
        context.globalCompositeOperation = "source-over";
        context.fillStyle = gradient;
        context.fillRect(
          isLeft ? sideFill - seamWidth : sideFill + sourceWidth,
          topFill,
          seamWidth,
          visibleSourceHeight
        );
        context.restore();
      };

      drawProgressiveSide(true);
      drawProgressiveSide(false);

      // Haut : première ligne de l'image centrale et des extensions.
      context.drawImage(
        canvas,
        0,
        topFill,
        canvas.width,
        1,
        0,
        0,
        canvas.width,
        topFill
      );

      // Bas : dernière ligne de la zone conservée.
      const visibleBottomY = topFill + visibleSourceHeight - 1;
      context.drawImage(
        canvas,
        0,
        visibleBottomY,
        canvas.width,
        1,
        0,
        topFill + visibleSourceHeight,
        canvas.width,
        bottomFill
      );

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = Math.min(
        8,
        this.renderer?.capabilities?.getMaxAnisotropy?.() || 1
      );
      texture.needsUpdate = true;
      return texture;
    }

    async setPanorama(asset, definition = BF.maps[this.currentMapId]) {
      const loader = new this.THREE.TextureLoader();
      const catalogMap = global.BLUEFOX_MAP_ASSETS?.catalog?.maps?.find(
        (map) => map.number === definition?.number
      );

      // Source autoritaire : l'image N... portant le même numéro que la Map.
      asset = catalogMap?.scene?.url || definition?.sceneUrl || asset;
      const filename = String(asset || "").split("/").pop();
      const isTerrain = Boolean(
        global.BLUEFOX_MAP_ASSETS?.parseTerrain?.({ name: filename })
      );

      if (isTerrain) {
        asset = catalogMap?.scene?.url || definition?.sceneUrl || asset;
      }

      this.currentPanoramaAsset = asset;
      const requestedAsset = asset;

      // Retire immédiatement l'ancien panorama afin qu'aucune image résiduelle
      // ne puisse réapparaître pendant le chargement asynchrone de la suivante.
      if (this.panorama) {
        this.panorama.visible = false;
        this.panorama.material.map = null;
        this.panorama.material.needsUpdate = true;
      }
      if (this.panoramaTexture) {
        this.panoramaTexture.dispose();
        this.panoramaTexture = null;
      }

      const candidates =
        global.BLUEFOX_MAP_ASSETS?.imageUrlCandidates?.(asset) || [asset];

      const loadCandidate = (candidate) => new Promise((resolve, reject) => {
        loader.load(candidate, resolve, undefined, reject);
      });

      for (const candidate of candidates) {
        try {
          const sourceTexture = await loadCandidate(candidate);

          // Ignore une réponse devenue obsolète si une autre map a été demandée.
          if (this.currentPanoramaAsset !== requestedAsset) {
            sourceTexture?.dispose?.();
            return false;
          }
          if (!sourceTexture?.image) {
            sourceTexture?.dispose?.();
            continue;
          }

          const extendedTexture = this.createExtendedPanoramaTexture(
            sourceTexture.image
          );

          this.panoramaTexture = extendedTexture;
          this.panorama.material.map = extendedTexture;
          this.panorama.material.needsUpdate = true;
          this.panorama.visible = true;

          // La texture source n'est plus utilisée après création du canvas.
          if (sourceTexture !== extendedTexture) sourceTexture.dispose();
          return true;
        } catch {
          // Essaie le chemin candidat suivant.
        }
      }

      if (this.currentPanoramaAsset === requestedAsset) {
        global.dispatchEvent(new CustomEvent("bluefox:image-missing", {
          detail: {
            source: asset,
            role: "scène panoramique",
            mapId: this.currentMapId
          }
        }));
      }
      return false;
    }

    createTransitionElement() {
      this.transitionElement = document.createElement("div");
      this.transitionElement.className = "map-transition";
      this.transitionElement.innerHTML = "<span>CHARGEMENT DE LA MAP…</span>";
      this.container.appendChild(this.transitionElement);
    }

    createExplorationHud() {
      this.ensureCompassNeedle(true);

      this.onCameraClick = this.onCameraClick || (() => {
        window.clearTimeout(this.cameraClickTimer);
        this.cameraClickTimer = window.setTimeout(() => {
          this.cameraController.resetBehindCharacter(false);
          this.callbacks.onStatus("Caméra recentrée derrière BlueFox.");
        }, 240);
      });
      this.onCameraDoubleClick = this.onCameraDoubleClick || ((event) => {
        event.preventDefault();
        window.clearTimeout(this.cameraClickTimer);
        const mode = this.cameraController.toggleFreeFollow();
        this.updateCameraButton(mode);
        this.callbacks.onStatus(
          mode === "free-follow"
            ? "Caméra libre : elle conserve son point de vue tout en suivant BlueFox."
            : "Caméra ancrée : recentrage automatique après 3,5 secondes."
        );
      });
      this.onCameraMode = this.onCameraMode || ((event) =>
        this.updateCameraButton(event.detail.mode)
      );
      this.onSpeechToggle = this.onSpeechToggle || (() => {
        this.speechVisible = !this.speechVisible;
        localStorage.setItem(
          "bluefox_speech_visible_v1",
          String(this.speechVisible)
        );
        this.updateSpeechButton();
      });

      this.ensureHudControl("camera");
      this.ensureHudControl("speech");

      if (!this.cameraModeListenerBound) {
        global.addEventListener("bluefox:camera-mode", this.onCameraMode);
        this.cameraModeListenerBound = true;
      }
      this.updateCameraButton(this.cameraController.mode);
      this.updateSpeechButton();
    }

    ensureHudControl(control) {
      const definitions = {
        camera: {
          property: "cameraButton",
          className: "bluefox-camera-button",
          ariaLabel: "Recentrer la caméra sur BlueFox",
          title: "Clic : recentrer · double-clic : suivi libre",
          content: "<span>◎</span>",
          listeners: [
            ["click", this.onCameraClick],
            ["dblclick", this.onCameraDoubleClick]
          ]
        },
        speech: {
          property: "speechButton",
          className: "bluefox-speech-button",
          ariaLabel: "Afficher ou masquer les paroles de BlueFox",
          title: "Afficher ou masquer les paroles de BlueFox",
          content: "<span>💬</span>",
          listeners: [["click", this.onSpeechToggle]]
        }
      };
      const definition = definitions[control];
      if (!definition) return null;

      let node = this[definition.property];
      if (!node || !node.isConnected) {
        const existing = document.querySelector(`.${definition.className}`);
        node = existing || document.createElement("button");
        node.type = "button";
        node.classList.add(definition.className);
        node.setAttribute("aria-label", definition.ariaLabel);
        node.title = definition.title;
        if (!node.querySelector("span")) node.innerHTML = definition.content;
        if (!node.isConnected) document.body.appendChild(node);
        this[definition.property] = node;
      }

      definition.listeners.forEach(([type, listener]) => {
        if (!listener) return;
        const key = `bluefox${type}Bound`;
        if (node.dataset[key] === "1") return;
        node.addEventListener(type, listener);
        node.dataset[key] = "1";
      });
      return node;
    }

    setHudHighlight(control, enabled = true) {
      const node = this.ensureHudControl(control);
      if (!node) return false;
      node.classList.toggle("bluefox-ui-highlight", enabled === true);
      node.setAttribute("data-bluefox-highlight", enabled === true ? "true" : "false");
      return true;
    }

    ensureCompassNeedle(force = false) {
      const now = performance.now();
      if (!force && now - this.lastCompassCheck < 1000) return;
      this.lastCompassCheck = now;
      const compass = document.querySelector(".compass-pad > span");
      if (!compass) return;
      const attachedNeedle = compass.querySelector(".bluefox-compass-needle");
      if (attachedNeedle) {
        this.compassNeedle = attachedNeedle;
        return;
      }
      this.compassNeedle = document.createElement("i");
      this.compassNeedle.className = "bluefox-compass-needle";
      compass.appendChild(this.compassNeedle);
    }

    updateCameraButton(mode) {
      const button = this.ensureHudControl("camera");
      if (!button) return;
      const free = mode === "free-follow";
      button.classList.toggle("free", free);
      button.setAttribute("aria-pressed", free ? "true" : "false");
      const icon = button.querySelector("span");
      if (icon) icon.textContent = free ? "⊘" : "◎";
    }

    updateSpeechButton() {
      document.body.classList.toggle(
        "bluefox-speech-hidden",
        !this.speechVisible
      );
      const button = this.ensureHudControl("speech");
      button?.classList.toggle("disabled", !this.speechVisible);
      button?.setAttribute(
        "aria-pressed",
        this.speechVisible ? "true" : "false"
      );
    }

    initializePlanetaryClock() {
      const defaultGameMinutes = 8 * 60 + 42;
      try {
        const saved = JSON.parse(localStorage.getItem("bluefox_planet_clock_v1") || "null");
        this.planetClock = saved && Number.isFinite(saved.gameMinutes)
          ? saved
          : { gameMinutes: defaultGameMinutes, realTime: Date.now() };
      } catch {
        this.planetClock = { gameMinutes: defaultGameMinutes, realTime: Date.now() };
      }
      this.updatePlanetaryClock(true);
    }

    updatePlanetaryClock(force = false) {
      const now = Date.now();
      if (!force && now - this.lastCycleUpdate < 1000) return;
      const elapsedSeconds = Math.max(0, (now - this.planetClock.realTime) / 1000);
      const totalMinutes = this.planetClock.gameMinutes + elapsedSeconds;
      const minutesPerDay = 20 * 60;
      const day = Math.floor(totalMinutes / minutesPerDay) + 1;
      const minuteOfDay = Math.floor(totalMinutes % minutesPerDay);
      const hour = Math.floor(minuteOfDay / 60);
      const minute = minuteOfDay % 60;
      // Cycle de 20 h : 15 h de jour et seulement 5 h de nuit.
      const isNight = hour < 2 || hour >= 17;
      const daylight = isNight
        ? 0
        : Math.sin(((minuteOfDay - 2 * 60) / (15 * 60)) * Math.PI);

      const block = document.querySelector(".day-block");
      if (block) {
        const dayElement = block.querySelector("span");
        const timeElement = block.querySelector("strong");
        const detailElement = block.querySelector("small");
        if (dayElement) dayElement.textContent = `JOUR ${String(day).padStart(2, "0")}`;
        if (timeElement) {
          timeElement.textContent =
            `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        }
        if (detailElement) {
          const temperature = Math.round(11 + daylight * 8);
          detailElement.textContent =
            `${isNight ? "NUIT" : "JOUR"} · Cycle calme · ${temperature} °C`;
        }
        block.classList.toggle("night", isNight);
      }

      this.hemisphere.intensity = BF.damp(
        this.hemisphere.intensity,
        1.15 + daylight * 1.8,
        2,
        1
      );
      this.sun.intensity = BF.damp(this.sun.intensity, 0.45 + daylight * 3.8, 2, 1);
      this.fill.intensity = BF.damp(this.fill.intensity, isNight ? 1.7 : 0.75, 2, 1);
      if (this.biomeParticles && this.biomeParticleSettings) {
        this.biomeParticles.material.opacity =
          this.biomeParticleSettings.baseOpacity * (isNight ? 1.15 : 0.78);
      }
      this.renderer.toneMappingExposure = BF.damp(
        this.renderer.toneMappingExposure,
        isNight ? 0.88 : 1.06,
        2,
        1
      );
      this.lastCycleUpdate = now;
      if (force || now % 10000 < 1100) {
        localStorage.setItem("bluefox_planet_clock_v1", JSON.stringify({
          gameMinutes: totalMinutes,
          realTime: now
        }));
        this.planetClock = { gameMinutes: totalMinutes, realTime: now };
      }
    }

    showClickMarker(event) {
      if (!this.clickMarker) {
        this.clickMarker = document.createElement("i");
        this.clickMarker.className = "bluefox-click-marker";
        document.body.appendChild(this.clickMarker);
      }
      this.clickMarker.style.left = `${event.clientX}px`;
      this.clickMarker.style.top = `${event.clientY}px`;
      this.clickMarker.classList.remove("active");
      void this.clickMarker.offsetWidth;
      this.clickMarker.classList.add("active");
    }

    bindEvents() {
      this.onPointerDown = (event) => {
        this.pointerDown.x = event.clientX;
        this.pointerDown.y = event.clientY;
      };
      this.onPointerUp = (event) => {
        if (Math.hypot(
          event.clientX - this.pointerDown.x,
          event.clientY - this.pointerDown.y
        ) > 8) return;
        window.clearTimeout(this.pointerClickTimer);
        const pointer = {
          clientX: event.clientX,
          clientY: event.clientY
        };
        this.pointerClickTimer = window.setTimeout(
          () => this.handlePointer(pointer, "run"),
          220
        );
      };
      this.onWorldDoubleClick = (event) => {
        event.preventDefault();
        window.clearTimeout(this.pointerClickTimer);
        this.handlePointer(event, "run-fast");
      };
      this.onNavigate = (event) => this.handleNavigationSuggestion(event.detail);
      this.onReturnBase = () => this.returnToBase();
      this.onPathPlanned = (event) => this.updatePathVisual(event.detail);
      this.onNavigationFailed = () => {
        this.navigationFailures += 1;
        const wasResource = Boolean(this.pendingInteraction);
        const wasGate = Boolean(this.pendingGate);
        const wasTeleport = Boolean(this.pendingTeleport);
        this.pendingInteraction = null;
        this.cautiousInteraction = null;
        this.pendingGate = null;
        this.pendingTeleport = null;
        this.pendingZoneExploration = null;
        this.returningToBase = false;
        this.interactionStartedAt = 0;
        this.interactionApproachStartedAt = 0;
        this.interactionApproachAttempts = 0;
        this.destinationMarker && (this.destinationMarker.visible = false);
        this.pathLine && (this.pathLine.visible = false);
        this.lastAutonomyAt = performance.now() - 5200;
        this.lastActivityAt = performance.now();
        this.callbacks.onStatus(
          wasResource
            ? "BlueFox change d’approche : cette ressource est momentanément inaccessible."
            : (wasGate || wasTeleport) && this.persistentNavigationIntent
              ? "BlueFox diffère ce passage mais conserve la destination suggérée."
              : wasTeleport
                ? "BlueFox interrompt l’accès au réseau de téléportation et réévalue la route."
                : wasGate
                  ? "BlueFox interrompt ce trajet vers le passage et réévalue la route."
                  : "BlueFox abandonne ce trajet impossible et choisit une autre destination."
        );
        if (this.persistentNavigationIntent) {
          this.persistentNavigationIntent.retryAfter = Date.now() + 5000;
          this.persistNavigationIntent();
          window.setTimeout(() => this.resumePersistentNavigation(), 900);
        }
      };
      this.onVisibilityChange = () => {
        if (document.visibilityState !== "visible" || this.disposed) return;
        const now = performance.now();
        this.resumeCount += 1;
        this.lastResumeAt = now;
        this.clock?.getDelta();
        this.gateCooldownUntil = Math.max(this.gateCooldownUntil, now + 900);
        this.character.lastSafePosition.copy(this.character.root.position);
        this.cameraController.previousCharacterPosition.copy(
          this.character.root.position
        );
        this.cameraController.ensureHealthy(now);
        this.ensureHudControl("camera");
        this.ensureHudControl("speech");
        this.lastActivityAt = now;
        this.lastAutonomyAt = Math.min(this.lastAutonomyAt, now - 4800);
        this.resize();
      };
      this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
      this.renderer.domElement.addEventListener("pointerup", this.onPointerUp);
      this.renderer.domElement.addEventListener("dblclick", this.onWorldDoubleClick);
      global.addEventListener("bluefox:navigate", this.onNavigate);
      global.addEventListener("bluefox:return-base", this.onReturnBase);
      global.addEventListener("bluefox:path-planned", this.onPathPlanned);
      global.addEventListener("bluefox:navigation-failed", this.onNavigationFailed);
      global.addEventListener("bluefox:autonomy-mode", this.onAutonomyMode);
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    }

    moveToBaseCamp() {
      const camp = new this.THREE.Vector3(0, 0, 8);
      this.pendingInteraction = null;
      this.pendingGate = null;
      this.pendingTeleport = null;
      this.character.setTarget(camp, "run");
      this.showWorldMarker(camp);
      this.callbacks.onStatus("BlueFox revient vers le refuge.");
    }

    returnToBase() {
      if (this.transitioning) return;
      if (this.currentMapId === "crystal") {
        this.returningToBase = false;
        this.moveToBaseCamp();
        return;
      }

      const route = this.findKnownRoute(this.currentMapId, "crystal");
      if (!route || route.length < 2) {
        this.returningToBase = false;
        this.callbacks.onStatus(
          "Aucun itinéraire mémorisé ne permet encore de rejoindre le refuge."
        );
        return;
      }
      this.pendingInteraction = null;
      this.navigationRoute = route.slice(1);
      this.returningToBase = true;
      this.callbacks.onStatus(
        "BlueFox utilise les passages mémorisés pour revenir à la base."
      );
      this.navigateNextRouteStep();
    }

    handlePointer(event, movementMode = "run") {
      if (this.transitioning || performance.now() < this.startupQuietUntil) return;
      this.noteLocalAutonomousDecision();
      this.navigationRoute = [];
      this.clearPersistentNavigationIntent();
      this.pendingGate = null;
      this.pendingTeleport = null;
      this.pendingZoneExploration = null;
      this.returningToBase = false;
      this.showClickMarker(event);
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(this.pointer, this.camera);

      const hits = this.raycaster.intersectObjects(
        this.currentMap.interactables,
        false
      );
      if (hits.length) {
        const object = hits[0].object;
        if (object.userData.active) {
          if (
            this.pendingInteraction === object &&
            (this.interactionStartedAt || this.interactionApproachStartedAt)
          ) {
            return;
          }
          object.userData.requestedMovementMode = movementMode;
          object.userData.requestedInteractionSource = "manual";
          this.targetInteraction(object);
        }
        return;
      }

      const point = new this.THREE.Vector3();
      if (!this.raycaster.ray.intersectPlane(this.groundPlane, point)) return;
      const mapBounds = this.currentMap?.bounds || 27;
      point.x = BF.clamp(point.x, -mapBounds, mapBounds);
      point.z = BF.clamp(point.z, -mapBounds, mapBounds);
      this.pendingInteraction = null;
      this.character.cancelInteraction();
      this.character.setTarget(point, movementMode);
      this.showWorldMarker(this.character.finalTarget || point);
      this.callbacks.onStatus("BlueFox suit progressivement la destination suggérée.");
    }


    addRuntimeGate(direction, exit, definition = BF.maps[this.currentMapId]) {
      if (!direction || !exit || !this.currentMap?.group || !definition) return null;
      const existing = this.currentMap.gates?.find(
        (gate) => gate.userData?.exit?.targetMap === exit.targetMap
      );
      if (existing) return existing;

      const bounds = this.currentMap.bounds || 27;
      const resolved = { ...exit };
      if (direction === "north") {
        resolved.z = -bounds + 1.2;
        resolved.x = BF.clamp(Number(exit.x) || 0, -bounds + 4, bounds - 4);
      } else if (direction === "south") {
        resolved.z = bounds - 1.2;
        resolved.x = BF.clamp(Number(exit.x) || 0, -bounds + 4, bounds - 4);
      } else if (direction === "east") {
        resolved.x = bounds - 1.2;
        resolved.z = BF.clamp(Number(exit.z) || 0, -bounds + 4, bounds - 4);
      } else if (direction === "west") {
        resolved.x = -bounds + 1.2;
        resolved.z = BF.clamp(Number(exit.z) || 0, -bounds + 4, bounds - 4);
      } else {
        return null;
      }

      definition.runtimeExits = definition.runtimeExits || {};
      definition.runtimeExits[direction] = resolved;

      const gate = new this.THREE.Group();
      gate.position.set(resolved.x, 0, resolved.z);
      gate.rotation.y =
        direction === "east" || direction === "west" ? Math.PI / 2 : 0;
      gate.userData.exit = { ...resolved, direction };
      gate.userData.triggerRadius = 2.35;
      gate.userData.runtimeGenerated = true;

      const arch = new this.THREE.Mesh(
        new this.THREE.TorusGeometry(2.15, 0.17, 18, 64, Math.PI),
        new this.THREE.MeshStandardMaterial({
          color: definition.palette.accent,
          emissive: definition.palette.accent,
          emissiveIntensity: 2,
          metalness: 0.35,
          roughness: 0.3
        })
      );
      arch.position.y = 0.2;
      gate.add(arch);

      const ring = new this.THREE.Mesh(
        new this.THREE.RingGeometry(0.9, 1.35, 48),
        new this.THREE.MeshBasicMaterial({
          color: definition.palette.accent,
          transparent: true,
          opacity: 0.7,
          side: this.THREE.DoubleSide,
          depthWrite: false
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      gate.add(ring);

      this.currentMap.group.add(gate);
      this.currentMap.gates = this.currentMap.gates || [];
      this.currentMap.gates.push(gate);
      return gate;
    }

    async generateUnknownPassage(direction) {
      const opposites = {
        north: "south", south: "north", east: "west", west: "east"
      };
      const opposite = opposites[direction];
      const currentDefinition = BF.maps[this.currentMapId];
      if (!opposite || !currentDefinition) return;
      const existing = currentDefinition.exits[direction];
      if (existing) {
        this.handleNavigationSuggestion({ mapId: existing.targetMap });
        return;
      }
      if (!BF.MapGenerator) {
        this.callbacks.onStatus(
          "Le générateur de territoires n’est pas disponible."
        );
        return;
      }
      let destination;
      try {
        const missionState = this.missionManager?.getState?.() || BF.getMissionState?.();
        const activeMissionCount = Array.isArray(missionState?.activeMissionIds)
          ? missionState.activeMissionIds.length
          : 0;
        destination = BF.MapGenerator.generate({
          fromMapId: this.currentMapId,
          direction,
          discoveryIndex: this.discoveredMaps.size,
          ordinal: BF.MapGenerator.listSaved().length + 1,
          lowMissionProgress: activeMissionCount <=
            BF.MapGenerationRules.discoveryCadence.lowMissionActiveMaximum
        });
      } catch (error) {
        console.error("Échec de génération de map", error);
        this.callbacks.onStatus(
          "Aucun territoire compatible ne peut être généré dans cette direction."
        );
        return;
      }
      const link = { from: this.currentMapId, direction, to: destination.id };
      if (!this.applyGeneratedLink(link)) return;
      this.generatedTopology.push(link);
      localStorage.setItem(
        "bluefox_generated_topology_v1",
        JSON.stringify(this.generatedTopology)
      );

      // Ajoute seulement le nouveau portail. La map courante n'est jamais
      // détruite ni reconstruite lors d'une suggestion d'exploration.
      const exit = currentDefinition.exits[direction];
      const gate = this.addRuntimeGate(direction, exit, currentDefinition);
      if (!gate) return;
      this.pendingGate = gate;
      this.character.setTarget(gate.position, "run");
      this.showWorldMarker(gate.position);
      const frenchDirection = {
        north: "le Nord", south: "le Sud", east: "l’Est", west: "l’Ouest"
      }[direction];
      this.callbacks.onStatus(
        `BlueFox se dirige vers une terre inconnue vers ${frenchDirection}.`
      );
      this.callbacks.onAction(
        "Une route vient d’être générée sur demande du joueur. Le biome reste inconnu jusqu’au passage."
      );
    }

    narrativeMapName(mapId) {
      return this.mapNames?.get(mapId) || BF.maps?.[mapId]?.name || "Territoire inconnu";
    }

    restorePersistentNavigationIntent() {
      try {
        const intent = JSON.parse(
          localStorage.getItem("bluefox_navigation_intent_v1") || "null"
        );
        if (!intent || typeof intent !== "object") return null;
        const requestedAt = Number(intent.requestedAt) || 0;
        const newGameAt = Number(
          localStorage.getItem("bluefox_new_game_start_v1") || 0
        );
        if (newGameAt > 0 && requestedAt > 0 && requestedAt < newGameAt) {
          localStorage.removeItem("bluefox_navigation_intent_v1");
          return null;
        }
        const direction = ["north", "south", "east", "west"].includes(intent.direction)
          ? intent.direction
          : null;
        const mapId = typeof intent.mapId === "string" && intent.mapId
          ? intent.mapId
          : null;
        const discoverUnknown = intent.discoverUnknown === true;
        if (!mapId && !(discoverUnknown && direction)) {
          localStorage.removeItem("bluefox_navigation_intent_v1");
          return null;
        }
        return {
          mapId,
          direction,
          discoverUnknown,
          source: typeof intent.source === "string" ? intent.source : null,
          missionId: typeof intent.missionId === "string" && intent.missionId
            ? intent.missionId
            : null,
          allowTeleportOptimization: intent.allowTeleportOptimization === true,
          requestedAt,
          retryAfter: Math.max(0, Number(intent.retryAfter) || 0)
        };
      } catch {
        localStorage.removeItem("bluefox_navigation_intent_v1");
        return null;
      }
    }

    persistNavigationIntent() {
      if (!this.persistentNavigationIntent) {
        localStorage.removeItem("bluefox_navigation_intent_v1");
        return false;
      }
      localStorage.setItem(
        "bluefox_navigation_intent_v1",
        JSON.stringify(this.persistentNavigationIntent)
      );
      return true;
    }

    setPersistentNavigationIntent(detail) {
      if (!detail) return false;
      this.persistentNavigationIntent = {
        mapId: detail.mapId || null,
        direction: ["north", "south", "east", "west"].includes(detail.direction)
          ? detail.direction
          : null,
        discoverUnknown: detail.discoverUnknown === true,
        source: typeof detail.source === "string" ? detail.source : null,
        missionId: typeof detail.missionId === "string" && detail.missionId
          ? detail.missionId
          : null,
        allowTeleportOptimization: detail.allowTeleportOptimization === true,
        requestedAt: Date.now(),
        retryAfter: 0
      };
      if (
        !this.persistentNavigationIntent.mapId &&
        !(this.persistentNavigationIntent.discoverUnknown && this.persistentNavigationIntent.direction)
      ) {
        this.persistentNavigationIntent = null;
        this.persistNavigationIntent();
        return false;
      }
      this.persistNavigationIntent();
      return true;
    }

    clearPersistentNavigationIntent() {
      this.persistentNavigationIntent = null;
      this.navigationAllowsTeleport = false;
      this.persistNavigationIntent();
    }

    resumePersistentNavigation() {
      const intent = this.persistentNavigationIntent;
      if (!intent || this.transitioning) return false;
      if (Date.now() < Math.max(0, Number(intent.retryAfter) || 0)) return false;
      if (this.pendingInteraction || this.currentRoutine || this.missionManager?.currentAction) {
        return false;
      }
      const survival = BF.getSurvivalState?.() || {};
      if (survival.needs?.criticalRest) return false;
      const prescription = BF.resolveBibleNavigationSuggestion?.(this, intent);
      if (prescription?.action === "return-base") {
        this.clearPersistentNavigationIntent();
        this.returnToBase();
        return true;
      }
      if (intent.mapId && intent.mapId === this.currentMapId) {
        this.clearPersistentNavigationIntent();
        return true;
      }
      if (intent.discoverUnknown && intent.direction) {
        const known = BF.maps[this.currentMapId]?.exits?.[intent.direction];
        if (known?.targetMap) {
          this.navigationRoute = [known.targetMap];
          this.navigateNextRouteStep();
          return true;
        }
        this.generateUnknownPassage(intent.direction, {
          source: intent.source || null,
          bibleMissionId: intent.missionId || null
        });
        return true;
      }
      if (intent.mapId) {
        const route = intent.allowTeleportOptimization === true
          ? this.findOptimalRoute(this.currentMapId, intent.mapId)
          : this.findKnownRoute(this.currentMapId, intent.mapId);
        if (!route || route.length < 2) return false;
        this.navigationAllowsTeleport = intent.allowTeleportOptimization === true;
        this.navigationRoute = route.slice(1);
        this.navigateNextRouteStep();
        return true;
      }
      return false;
    }

    handleNavigationSuggestion(detail) {
      if (!detail) return;
      this.setPersistentNavigationIntent(detail);
      if (this.transitioning) return;
      if (this.pendingInteraction || this.currentRoutine || this.missionManager?.currentAction) {
        this.callbacks.onStatus(
          "BlueFox termine son action en cours puis suivra la destination suggérée."
        );
        return;
      }
      const prescription = BF.resolveBibleNavigationSuggestion?.(this, detail);
      if (prescription?.action === "return-base") {
        this.clearPersistentNavigationIntent();
        this.returnToBase();
        return;
      }
      if (detail.discoverUnknown && detail.direction) {
        this.generateUnknownPassage(detail.direction, {
          source: detail.source || null,
          bibleMissionId: detail.missionId || null
        });
        return;
      }
      if (detail.mapId && detail.mapId !== this.currentMapId) {
        const route = detail.allowTeleportOptimization === true
          ? this.findOptimalRoute(this.currentMapId, detail.mapId)
          : this.findKnownRoute(this.currentMapId, detail.mapId);
        if (!route) {
          this.callbacks.onStatus(
            "Aucun itinéraire exploré ne relie encore ces deux Zones."
          );
          return;
        }
        this.navigationAllowsTeleport = detail.allowTeleportOptimization === true;
        this.navigationRoute = route.slice(1);
        this.callbacks.onStatus(
          `BlueFox prépare un itinéraire vers ${this.narrativeMapName(detail.mapId)}.`
        );
        this.navigateNextRouteStep();
        return;
      }
      const centerOffset = this.currentMapId === "jungle" ? 64 : 0;
      const target = new this.THREE.Vector3(
        BF.clamp((detail.x || 0) - centerOffset, -27, 27),
        0,
        BF.clamp(detail.z || 0, -27, 27)
      );
      this.clearPersistentNavigationIntent();
      this.character.setTarget(target, "run");
      this.showWorldMarker(target);
    }

    findPhysicalRoute(startMapId, targetMapId) {
      if (startMapId === targetMapId) return [startMapId];
      if (!this.discoveredMaps.has(targetMapId)) return null;
      const queue = [[startMapId]];
      const visited = new Set([startMapId]);
      while (queue.length) {
        const route = queue.shift();
        const currentId = route[route.length - 1];
        const exits = Object.values(BF.maps[currentId]?.exits || {});
        for (const exit of exits) {
          const nextId = String(exit?.targetMap || "");
          if (!nextId || visited.has(nextId) || !this.discoveredMaps.has(nextId)) {
            continue;
          }
          const nextRoute = [...route, nextId];
          if (nextId === targetMapId) return nextRoute;
          visited.add(nextId);
          queue.push(nextRoute);
        }
      }
      return null;
    }

    teleportRoutingNetwork() {
      const network = BF.SpecialObjectRuntime?.routingNetwork?.();
      const hubMapId = String(network?.hub?.mapId || "");
      if (!hubMapId || !network?.hub?.anchor || !this.discoveredMaps.has(hubMapId)) {
        return null;
      }
      const destinations = Array.isArray(network.destinations)
        ? network.destinations
            .map((entry) => ({
              mapId: String(entry?.mapId || ""),
              anchor: entry?.anchor ? { ...entry.anchor } : null,
              instanceId: entry?.instanceId || null
            }))
            .filter((entry) =>
              entry.mapId &&
              entry.mapId !== hubMapId &&
              entry.anchor &&
              this.discoveredMaps.has(entry.mapId)
            )
        : [];
      if (!destinations.length) return null;
      return {
        hub: {
          mapId: hubMapId,
          anchor: { ...network.hub.anchor },
          instanceId: network.hub.instanceId || null
        },
        destinations
      };
    }

    teleportRouteNeighbors(mapId, network = this.teleportRoutingNetwork()) {
      if (!network) return [];
      const currentId = String(mapId || "");
      if (currentId === network.hub.mapId) {
        return network.destinations.map((entry) => entry.mapId);
      }
      return network.destinations.some((entry) => entry.mapId === currentId)
        ? [network.hub.mapId]
        : [];
    }

    teleportRouteEdge(fromMapId, toMapId, network = this.teleportRoutingNetwork()) {
      if (!network) return null;
      const fromId = String(fromMapId || "");
      const toId = String(toMapId || "");
      if (fromId === network.hub.mapId) {
        const destination = network.destinations.find((entry) => entry.mapId === toId);
        return destination
          ? {
              sourceAnchor: { ...network.hub.anchor },
              targetMapId: toId,
              activationRadius: 6.5
            }
          : null;
      }
      const source = network.destinations.find((entry) => entry.mapId === fromId);
      if (source && toId === network.hub.mapId) {
        return {
          sourceAnchor: { ...source.anchor },
          targetMapId: toId,
          activationRadius: 4.0
        };
      }
      return null;
    }

    findMultimodalRoute(startMapId, targetMapId) {
      if (startMapId === targetMapId) return [startMapId];
      if (!this.discoveredMaps.has(targetMapId)) return null;
      const network = this.teleportRoutingNetwork();
      if (!network) return this.findPhysicalRoute(startMapId, targetMapId);
      const queue = [[startMapId]];
      const visited = new Set([startMapId]);
      while (queue.length) {
        const route = queue.shift();
        const currentId = route[route.length - 1];
        const physical = Object.values(BF.maps[currentId]?.exits || {})
          .map((exit) => String(exit?.targetMap || ""))
          .filter(Boolean);
        const teleports = this.teleportRouteNeighbors(currentId, network);
        for (const nextId of [...physical, ...teleports]) {
          if (visited.has(nextId) || !this.discoveredMaps.has(nextId)) continue;
          const nextRoute = [...route, nextId];
          if (nextId === targetMapId) return nextRoute;
          visited.add(nextId);
          queue.push(nextRoute);
        }
      }
      return null;
    }

    findKnownRoute(startMapId, targetMapId) {
      return this.findPhysicalRoute(startMapId, targetMapId);
    }

    findOptimalRoute(startMapId, targetMapId) {
      const physical = this.findPhysicalRoute(startMapId, targetMapId);
      const multimodal = this.findMultimodalRoute(startMapId, targetMapId);
      if (!multimodal) return physical;
      if (!physical || multimodal.length < physical.length) return multimodal;
      // À coût égal, conserver le chemin historique évite un TP sans gain réel.
      return physical;
    }

    navigateNextRouteStep() {
      const nextMapId = this.navigationRoute[0];
      if (!nextMapId || nextMapId === this.currentMapId) {
        if (nextMapId === this.currentMapId) this.navigationRoute.shift();
        if (!this.navigationRoute.length) return;
      }
      const destinationId = this.navigationRoute[0];
      const gate = this.currentMap.gates.find(
        (candidate) => candidate.userData.exit.targetMap === destinationId
      );
      if (!gate) {
        const teleportEdge = this.navigationAllowsTeleport === true
          ? this.teleportRouteEdge(this.currentMapId, destinationId)
          : null;
        if (teleportEdge && typeof BF.SpecialObjectRuntime?.teleportTo === "function") {
          const anchor = new this.THREE.Vector3(
            Number(teleportEdge.sourceAnchor?.x) || 0,
            0,
            Number(teleportEdge.sourceAnchor?.z) || 0
          );
          this.pendingGate = null;
          this.pendingTeleport = {
            sourceMapId: String(this.currentMapId || ""),
            targetMapId: destinationId,
            sourceAnchor: { ...teleportEdge.sourceAnchor },
            activationRadius: Number(teleportEdge.activationRadius) || 4,
            startedAt: Date.now(),
            inFlight: false
          };
          this.character.setTarget(anchor, "run");
          this.showWorldMarker(anchor);
          this.callbacks.onStatus(
            this.currentMapId === this.teleportRoutingNetwork()?.hub?.mapId
              ? `BlueFox rejoint le téléporteur pour atteindre ${this.narrativeMapName(destinationId)}.`
              : "BlueFox rejoint la balise pour emprunter le réseau de téléportation."
          );
          return;
        }
        this.navigationRoute = [];
        this.pendingTeleport = null;
        this.clearPersistentNavigationIntent();
        this.callbacks.onStatus("L’itinéraire mémorisé est devenu impraticable.");
        return;
      }
      this.pendingTeleport = null;
      this.pendingGate = gate;
      this.character.setTarget(gate.position, "run");
      this.showWorldMarker(gate.position);
      this.callbacks.onStatus(
        `BlueFox rejoint le passage vers ${this.narrativeMapName(destinationId)}.`
      );
    }

    async executePendingTeleportRouteStep(pending) {
      if (!pending || pending !== this.pendingTeleport || pending.inFlight !== true) return false;
      const runtime = BF.SpecialObjectRuntime;
      const targetMapId = String(pending.targetMapId || "");
      let success = false;
      try {
        success = await runtime?.teleportTo?.(targetMapId) === true;
      } catch (error) {
        console.error("Échec du trajet autonome par téléportation", error);
        success = false;
      }
      if (pending !== this.pendingTeleport) return success;
      this.pendingTeleport = null;
      if (!success) {
        this.navigationRoute = [];
        if (this.persistentNavigationIntent) {
          this.persistentNavigationIntent.retryAfter = Date.now() + 5000;
          this.persistNavigationIntent();
        }
        this.callbacks.onStatus(
          "Le réseau de téléportation n’est momentanément pas utilisable. BlueFox réévaluera son trajet."
        );
        return false;
      }
      if (this.navigationRoute[0] === this.currentMapId) {
        this.navigationRoute.shift();
      }
      if (this.navigationRoute.length) {
        window.setTimeout(() => this.navigateNextRouteStep(), 900);
      } else if (this.persistentNavigationIntent) {
        window.setTimeout(() => this.resumePersistentNavigation(), 450);
      } else if (this.returningToBase && this.currentMapId === "crystal") {
        this.returningToBase = false;
        window.setTimeout(() => this.moveToBaseCamp(), 450);
      }
      return true;
    }

    updatePendingTeleportRoute(now) {
      const pending = this.pendingTeleport;
      if (!pending || pending.inFlight || this.transitioning) return false;
      if (String(this.currentMapId || "") !== String(pending.sourceMapId || "")) {
        this.pendingTeleport = null;
        return false;
      }
      const edge = this.teleportRouteEdge(this.currentMapId, pending.targetMapId);
      if (!edge) {
        this.pendingTeleport = null;
        this.navigationRoute = [];
        if (this.persistentNavigationIntent) {
          this.persistentNavigationIntent.retryAfter = Date.now() + 5000;
          this.persistNavigationIntent();
        }
        return false;
      }
      const anchor = new this.THREE.Vector3(
        Number(edge.sourceAnchor?.x) || 0,
        0,
        Number(edge.sourceAnchor?.z) || 0
      );
      const distance = this.character.root.position.distanceTo(anchor);
      const activationRadius = Math.max(
        0.8,
        Math.min(Number(edge.activationRadius) || Number(pending.activationRadius) || 4, 6.5)
      );
      if (distance > activationRadius) {
        if (this.character.speed <= 0.08 && now - Number(pending.lastApproachAt || 0) >= 1200) {
          this.character.setTarget(anchor, "run");
          this.showWorldMarker(anchor);
          pending.lastApproachAt = now;
        }
        return false;
      }
      this.character.stop?.();
      this.character.setTarget(this.character.root.position);
      pending.inFlight = true;
      this.executePendingTeleportRouteStep(pending);
      return true;
    }

    interactionWorldPosition(object) {
      const anchor = object?.userData?.worldAnchor || object;
      if (!anchor) return null;
      anchor.updateWorldMatrix?.(true, false);
      return typeof anchor.getWorldPosition === "function"
        ? anchor.getWorldPosition(new this.THREE.Vector3())
        : anchor.position?.clone?.() || null;
    }

    interactionValidationDistance(object) {
      const interactionRadius = Number(object?.userData?.interactionRadius);
      const targetRadius = Number.isFinite(interactionRadius)
        ? Math.max(0, interactionRadius)
        : 0.5;
      const characterRadius = Math.max(
        0.1,
        Number(this.character?.radius) || 0.64
      );
      // Portée fonctionnelle fixe : elle ne dépend jamais d'un fallback
      // physique ou d'un collider rencontré pendant l'approche.
      return targetRadius + characterRadius + 0.7;
    }

    interactionApproachPoint(object, attempt = 0, preferredDistance = null) {
      const anchor = object.userData.worldAnchor || object;
      const anchorPosition = this.interactionWorldPosition(object) || anchor.position;
      const colliderRadius = Number(object.userData.interactionRadius);
      const targetRadius = Number.isFinite(colliderRadius)
        ? Math.max(0, colliderRadius)
        : 0.5;
      const normalApproachDistance =
        targetRadius + this.character.radius + 0.22;
      const preferred =
        preferredDistance != null && Number.isFinite(Number(preferredDistance))
          ? Math.max(0.5, Number(preferredDistance))
          : null;
      const interactionDistance = normalApproachDistance + 0.48;
      const fromResource = this.character.root.position.clone()
        .sub(anchorPosition);
      fromResource.y = 0;
      if (fromResource.lengthSq() < 0.001) fromResource.set(0, 0, 1);
      const baseAngle = Math.atan2(fromResource.z, fromResource.x);
      const colliders = this.currentMap?.colliders || [];
      const mapBounds = (this.currentMap?.bounds || 27) - 0.4;
      const searchLimit = preferred != null
        ? preferred + 0.8
        : interactionDistance;
      const blockerPadding = 0.16;
      const maxPathPlans = 12;
      let pathPlans = 0;

      const horizontalDistanceToAnchor = (point) => Math.hypot(
        Number(point?.x || 0) - Number(anchorPosition.x || 0),
        Number(point?.z || 0) - Number(anchorPosition.z || 0)
      );

      // Les colliders éloignés restent transmis au PathPlanner pour le trajet,
      // mais seuls ceux qui recoupent la zone fonctionnelle servent au filtre local.
      const blockers = colliders
        .filter((collider) => {
          if (!collider?.position) return false;
          const expandedRadius =
            this.character.radius +
            Math.max(0, Number(collider.radius) || 0) +
            blockerPadding;
          return Math.hypot(
            collider.position.x - anchorPosition.x,
            collider.position.z - anchorPosition.z
          ) <= searchLimit + expandedRadius;
        })
        .map((collider) => ({
          collider,
          x: Number(collider.position.x) || 0,
          z: Number(collider.position.z) || 0,
          radius:
            this.character.radius +
            Math.max(0, Number(collider.radius) || 0) +
            blockerPadding
        }));

      const pointIsClear = (point, paddingAdjustment = 0) =>
        blockers.every((entry) =>
          Math.hypot(point.x - entry.x, point.z - entry.z) >=
            Math.max(0, entry.radius + paddingAdjustment)
        );

      const candidatePath = (point) => {
        if (!point || pathPlans >= maxPathPlans) return null;
        if (Math.abs(point.x) > mapBounds || Math.abs(point.z) > mapBounds) return null;
        const radius = horizontalDistanceToAnchor(point);
        if (preferred != null) {
          if (radius < preferred - 0.8 || radius > preferred + 0.8) return null;
        } else if (radius > interactionDistance + 0.001) {
          return null;
        }
        if (!pointIsClear(point)) return null;

        pathPlans += 1;
        const path = this.character.pathPlanner.plan(
          this.character.root.position,
          point,
          colliders,
          this.character.radius,
          blockerPadding
        );
        if (!Array.isArray(path) || !path.length) return null;
        const finalPoint = path[path.length - 1] || point;
        const finalRadius = horizontalDistanceToAnchor(finalPoint);
        if (preferred != null) {
          if (finalRadius < preferred - 0.8 || finalRadius > preferred + 0.8) {
            return null;
          }
        } else if (finalRadius > interactionDistance + 0.001) {
          // Le PathPlanner peut corriger un but encombré, mais jamais étendre
          // la portée fonctionnelle de l'interaction.
          return null;
        }
        if (!pointIsClear(finalPoint, -0.005)) return null;

        const pathLength = path.reduce((total, waypoint, pathIndex) => {
          const previous = pathIndex
            ? path[pathIndex - 1]
            : this.character.root.position;
          return total + previous.distanceTo(waypoint);
        }, 0);
        return { point: finalPoint.clone?.() || finalPoint, pathLength };
      };

      // Si BlueFox se trouve déjà dans la zone fonctionnelle et hors collider,
      // il n'est pas renvoyé artificiellement sur sa bordure.
      if (
        preferred == null &&
        horizontalDistanceToAnchor(this.character.root.position) <= interactionDistance &&
        pointIsClear(this.character.root.position, -0.02)
      ) {
        const result = {
          point: this.character.root.position.clone(),
          approachDistance: normalApproachDistance,
          pathLength: 0
        };
        if (attempt === 0) {
          this.__cachedInteractionApproach = {
            object,
            mapId: this.currentMapId,
            at: performance.now(),
            originX: this.character.root.position.x,
            originZ: this.character.root.position.z,
            result
          };
        }
        return result;
      }

      const radialPoint = (radius, angle) => new this.THREE.Vector3(
        anchorPosition.x + Math.cos(angle) * radius,
        0,
        anchorPosition.z + Math.sin(angle) * radius
      );

      const tryOrderedPoints = (points, phasePlanLimit) => {
        const unique = [];
        const seen = new Set();
        points.forEach((point) => {
          if (!point) return;
          const key = `${Math.round(point.x * 1000)}:${Math.round(point.z * 1000)}`;
          if (seen.has(key)) return;
          seen.add(key);
          if (Math.abs(point.x) > mapBounds || Math.abs(point.z) > mapBounds) return;
          if (!pointIsClear(point, -0.005)) return;
          unique.push(point);
        });
        unique.sort((a, b) =>
          a.distanceTo(this.character.root.position) -
          b.distanceTo(this.character.root.position)
        );
        const phaseStartPlans = pathPlans;
        for (const point of unique) {
          if (pathPlans >= maxPathPlans) break;
          if (pathPlans - phaseStartPlans >= phasePlanLimit) break;
          const planned = candidatePath(point);
          if (planned) return planned;
        }
        return null;
      };

      let chosen = null;

      if (preferred != null) {
        // FAU-01 : conserver le palier prudent historique autour de 4,6 m,
        // tout en bornant le coût au plafond historique de 12 plans.
        const cautiousPoints = [];
        for (let index = 0; index < 24; index += 1) {
          const alternatingStep = index === 0
            ? 0
            : Math.ceil(index / 2) * (index % 2 ? 1 : -1);
          const angle = baseAngle +
            (alternatingStep + attempt * 0.5) * (Math.PI / 12);
          cautiousPoints.push(radialPoint(preferred, angle));
        }
        chosen = tryOrderedPoints(cautiousPoints, 12);
      } else {
        // 1) Six essais nominaux maximum : on conserve la priorité du point
        // historique sans laisser cette phase consommer tout le budget.
        const nominalPoints = [];
        for (let index = 0; index < 12; index += 1) {
          const alternatingStep = index === 0
            ? 0
            : Math.ceil(index / 2) * (index % 2 ? 1 : -1);
          const angle = baseAngle +
            (alternatingStep + attempt * 0.5) * (Math.PI / 6);
          nominalPoints.push(radialPoint(normalApproachDistance, angle));
        }
        chosen = tryOrderedPoints(nominalPoints, 6);

        if (!chosen) {
          // 2) Recherche géométrique riche, mais seuls cinq candidats réellement
          // plausibles sont envoyés au PathPlanner.
          const regionPoints = [];
          const minimumRadius = Math.min(0.5, interactionDistance);
          const innerSpan = Math.max(0, normalApproachDistance - minimumRadius);
          const radii = [...new Set([
            normalApproachDistance - innerSpan * 0.33,
            normalApproachDistance - innerSpan * 0.66,
            minimumRadius,
            normalApproachDistance +
              Math.max(0, interactionDistance - normalApproachDistance) * 0.5,
            interactionDistance
          ].map((value) => Math.max(0.05, Number(value.toFixed(4)))))];

          radii.forEach((radius) => {
            for (let index = 0; index < 24; index += 1) {
              const angle = baseAngle +
                (index + attempt * 0.5) * (Math.PI / 12);
              regionPoints.push(radialPoint(radius, angle));
            }
          });

          const circleIntersections = (ax, az, ar, bx, bz, br) => {
            const dx = bx - ax;
            const dz = bz - az;
            const distance = Math.hypot(dx, dz);
            if (
              distance < 0.0001 ||
              distance > ar + br ||
              distance < Math.abs(ar - br)
            ) return [];
            const along =
              (ar * ar - br * br + distance * distance) /
              (2 * distance);
            const heightSq = ar * ar - along * along;
            if (heightSq < -0.0001) return [];
            const height = Math.sqrt(Math.max(0, heightSq));
            const midX = ax + dx * (along / distance);
            const midZ = az + dz * (along / distance);
            const normalX = -dz / distance;
            const normalZ = dx / distance;
            return [
              new this.THREE.Vector3(
                midX + normalX * height,
                0,
                midZ + normalZ * height
              ),
              new this.THREE.Vector3(
                midX - normalX * height,
                0,
                midZ - normalZ * height
              )
            ];
          };

          blockers.forEach((entry) => {
            regionPoints.push(...circleIntersections(
              anchorPosition.x,
              anchorPosition.z,
              interactionDistance,
              entry.x,
              entry.z,
              entry.radius
            ));
          });
          for (let left = 0; left < blockers.length; left += 1) {
            for (let right = left + 1; right < blockers.length; right += 1) {
              regionPoints.push(...circleIntersections(
                blockers[left].x,
                blockers[left].z,
                blockers[left].radius,
                blockers[right].x,
                blockers[right].z,
                blockers[right].radius
              ).filter((point) =>
                horizontalDistanceToAnchor(point) <= interactionDistance + 0.001
              ));
            }
          }
          chosen = tryOrderedPoints(regionPoints, 5);
        }

        // 3) Un unique plan reste réservé au fallback historique. Il est lui
        // aussi rejeté s'il sort de la zone fonctionnelle.
        if (!chosen && pathPlans < maxPathPlans) {
          const fallback = this.character.pathPlanner.nearestClearGoal(
            radialPoint(interactionDistance, baseAngle),
            colliders,
            this.character.radius,
            0.2
          );
          chosen = candidatePath(fallback);
        }
      }

      const result = {
        point: chosen?.point || null,
        // Donnée nominale uniquement : jamais réécrite à partir d'un fallback.
        approachDistance: preferred ?? normalApproachDistance,
        pathLength: chosen?.pathLength
      };
      if (attempt === 0 && preferred == null && result.point) {
        this.__cachedInteractionApproach = {
          object,
          mapId: this.currentMapId,
          at: performance.now(),
          originX: this.character.root.position.x,
          originZ: this.character.root.position.z,
          result
        };
      }
      return result;
    }


    interactionProfile(object) {
      const data = object?.userData || {};
      const functional = data.functional || {};
      const interaction = functional.interaction || data.interaction || {};
      const gameplay = functional.gameplay || data.gameplay || {};
      const deployedBeacon =
        String(data.contextRole || "") === "deployed_beacon" &&
        String(data.libraryType || functional.type || "") === "survey_beacon";
      if (deployedBeacon) {
        const label = "la balise BlueFox déployée";
        return {
          kind: "deployed_beacon",
          action: "inspect",
          label,
          collectable: false,
          removeFromWorld: false,
          respawnMs: null,
          animationHints: [],
          actionText: `BlueFox consulte ${label}.`,
          approachText: `BlueFox approche ${label}.`,
          speechText: "Cette balise est reliée au réseau BlueFox.",
          specialAction: "teleport-return"
        };
      }
      const actions = new Set(interaction.actions || []);
      const kind = String(
        functional.resource?.inventoryKey ||
        functional.type ||
        data.kind ||
        "unknown"
      );
      const configuredAction = String(
        interaction.defaultManualAction ||
        interaction.defaultAction ||
        data.defaultAction ||
        ""
      ).toLowerCase();
      const action = actions.has(configuredAction)
        ? configuredAction
        : actions.has("extract")
          ? "extract"
          : actions.has("collect")
            ? "collect"
            : actions.has("analyze")
              ? "analyze"
              : actions.has("inspect")
                ? "inspect"
                : actions.has("observe")
                  ? "observe"
                  : "";
      const label = interaction.label || functional.label || data.label || "l’objet";
      const collectable = action === "collect" || action === "extract";
      const removeFromWorld =
        interaction.removeFromWorld ??
        (collectable && gameplay.collectable === true);
      const actionText = {
        collect: `BlueFox collecte ${label}.`,
        extract: `BlueFox extrait une ressource de ${label}.`,
        inspect: `BlueFox inspecte attentivement ${label}.`,
        observe: `BlueFox observe ${label} sans le perturber.`,
        analyze: `BlueFox analyse méthodiquement ${label}.`
      }[action] || `BlueFox interagit avec ${label}.`;
      const approachText = {
        collect: `BlueFox approche ${label} avant la collecte.`,
        extract: `BlueFox approche ${label} avant l’extraction.`,
        inspect: `BlueFox approche ${label} pour l’inspecter.`,
        observe: `BlueFox se place près de ${label} pour l’observer.`,
        analyze: `BlueFox approche ${label} pour l’analyser.`
      }[action] || `BlueFox approche ${label}.`;
      const speechText = {
        collect: `Je collecte ${label} avec précaution.`,
        extract: `J’extrais seulement ce qui est utile de ${label}.`,
        inspect: `J’inspecte ${label} avant de tirer des conclusions.`,
        observe: `J’observe ${label} sans intervenir.`,
        analyze: `J’analyse ${label} et j’enregistre les résultats.`
      }[action] || `J’examine ${label}.`;
      return {
        kind,
        action,
        label,
        collectable,
        removeFromWorld,
        respawnMs: (() => {
          const seconds = BF.resolveObjectRespawnSeconds?.(functional, interaction.respawnSeconds) ??
            Number(interaction.respawnSeconds);
          return Number.isFinite(seconds) ? seconds * 1000 : null;
        })(),
        animationHints: interaction.animation?.[action] || [],
        actionText,
        approachText,
        speechText
      };
    }

    canInteractWith(object, now = performance.now()) {
      if (!object?.userData?.active) return false;
      const last = Number(object.userData.lastInteractionAt || 0);
      const profile = this.interactionProfile(object);
      if (!profile.action) return false;
      return profile.collectable || now - last > 30000;
    }

    missionActionForInteraction(action) {
      const types = BF.Missions?.ActionType || {};
      return {
        collect: types.COLLECT,
        extract: types.EXTRACT || types.COLLECT,
        inspect: types.INSPECT || types.OBSERVE,
        observe: types.OBSERVE,
        analyze: types.ANALYZE || types.OBSERVE
      }[action];
    }

    faunaInteractionState(object) {
      const anchor = object?.userData?.worldAnchor || object;
      return anchor ? BF.FaunaRuntime?.getState?.(anchor) || null : null;
    }

    faunaInteractionSceneId(object) {
      const anchor = object?.userData?.worldAnchor || object;
      return String(
        object?.userData?.microSceneId ||
        anchor?.userData?.microSceneId ||
        object?.userData?.biblePersistentScene ||
        anchor?.userData?.biblePersistentScene ||
        object?.userData?.persistentMicroSceneId ||
        anchor?.userData?.persistentMicroSceneId ||
        ""
      );
    }

    isFau01CautiousInteraction(object) {
      const data = object?.userData || {};
      return (
        data.requestedInteractionSource === "mission" &&
        String(data.missionId || "") === "FAU-01" &&
        String(data.missionNodeId || "") === "FAU-01:cautiousApproach" &&
        this.faunaInteractionSceneId(object) === "MSC-CUSTOM-NID-DE-FAUNE5"
      );
    }

    targetInteraction(object, retry = false) {
      if (!retry && object?.userData?.requestedInteractionSource !== "manual") {
        this.noteLocalAutonomousDecision();
      }
      this.pendingZoneExploration = null;
      const cachedApproach = this.__cachedInteractionApproach;
      const cacheUsable = Boolean(
        !retry &&
        cachedApproach?.object === object &&
        cachedApproach.mapId === this.currentMapId &&
        performance.now() - cachedApproach.at <= 1200 &&
        Math.hypot(
          this.character.root.position.x - cachedApproach.originX,
          this.character.root.position.z - cachedApproach.originZ
        ) <= 0.5
      );
      const approach = cacheUsable
        ? cachedApproach.result
        : this.interactionApproachPoint(
            object,
            retry ? this.interactionApproachAttempts : 0
          );
      this.__cachedInteractionApproach = null;
      if (!approach?.point) {
        this.pendingInteraction = null;
        this.cautiousInteraction = null;
        this.interactionApproachStartedAt = 0;
        this.callbacks.onStatus("BlueFox ne trouve aucun point d’approche accessible dans la portée de cet objet.");
        this.missionManager?.cancelCurrentAction("interaction-inaccessible");
        return false;
      }
      this.pendingInteraction = object;
      object.userData.approachDistance = approach.approachDistance;
      object.userData.interactionProfile = this.interactionProfile(object);
      this.interactionStartedAt = 0;
      this.interactionApproachStartedAt = performance.now();
      if (!retry) this.interactionApproachAttempts = 0;

      const faunaState = this.faunaInteractionState(object);
      if (
        this.isFau01CautiousInteraction(object) &&
        faunaState &&
        faunaState.cautiousQualified !== true
      ) {
        const cautiousApproach = this.interactionApproachPoint(
          object,
          retry ? this.interactionApproachAttempts : 0,
          4.6
        );
        if (cautiousApproach?.point) {
          this.cautiousInteraction = {
            object,
            phase: "approach",
            waitStartedAt: 0,
            finalApproachPoint: approach.point.clone()
          };
          const accepted = this.character.setTarget(cautiousApproach.point, "walk");
          if (accepted !== false) {
            this.showWorldMarker(cautiousApproach.point);
            this.callbacks.onStatus("BlueFox ralentit et approche la créature avec précaution.");
            return true;
          }
        }
        this.pendingInteraction = null;
        this.cautiousInteraction = null;
        this.interactionApproachStartedAt = 0;
        this.callbacks.onStatus("BlueFox ne trouve pas d’approche prudente sûre vers cette créature.");
        this.missionManager?.cancelCurrentAction("cautious-approach-inaccessible");
        return false;
      }

      this.cautiousInteraction = null;
      this.character.setTarget(
        approach.point,
        object.userData.requestedMovementMode || "auto"
      );
      this.showWorldMarker(approach.point);
      this.callbacks.onStatus(object.userData.interactionProfile.approachText);
      return true;
    }

    async addCrashCapsule(map, definition) {
      const crashSite = definition?.crashSite;
      if (!map?.group || !crashSite?.capsuleAsset || !this.GLTFLoader) return false;

      try {
        const gltf = await new Promise((resolve, reject) => {
          new this.GLTFLoader().load(
            crashSite.capsuleAsset,
            resolve,
            undefined,
            reject
          );
        });
        const capsule = gltf.scene;
        const anchor = crashSite.capsuleAnchor || { x: 0, y: 0, z: 0 };
        const scale = Math.max(0.01, Number(crashSite.capsuleScale) || 1);
        capsule.name = "BlueFoxStartCapsule";
        capsule.position.set(
          Number(anchor.x) || 0,
          (Number(anchor.y) || 0) +
            Math.max(0, Number(crashSite.capsuleGroundOffset) || 0),
          Number(anchor.z) || 0
        );
        capsule.rotation.y = Number(crashSite.capsuleRotation) || 0;
        capsule.scale.setScalar(scale);
        capsule.userData.landmark = "crash-capsule";
        capsule.userData.mapId = definition.id;
        capsule.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;
        });
        map.group.add(capsule);
        map.crashCapsule = capsule;

        const capsuleDefinition = BF.ObjectLibrary?.get?.("crash_capsule");
        const capsuleProxy = capsuleDefinition
          ? BF.ObjectLibrary?.create?.(
              this.THREE,
              "crash_capsule",
              definition.palette,
              0
            )
          : null;
        const capsuleHitbox = capsuleProxy?.hitbox || null;
        if (capsuleDefinition && capsuleHitbox) {
          const instanceId = `${capsuleDefinition.id}:${definition.id}`;
          const metadata = {
            instanceId,
            variant: 0,
            catalogId: capsuleDefinition.id,
            libraryType: capsuleDefinition.type,
            functional: capsuleDefinition
          };

          capsuleHitbox.removeFromParent();
          capsule.add(capsuleHitbox);
          Object.assign(capsule.userData, metadata, {
            objectType: capsuleDefinition.type,
            spawnSource: "crash-site",
            specialRuntimeRoot: true
          });
          Object.assign(capsuleHitbox.userData, metadata, {
            worldAnchor: capsule,
            interactionRadius: 1.85 * scale
          });
          map.interactables.push(capsuleHitbox);
          map.crashCapsuleHitbox = capsuleHitbox;
        }

        const colliderOffsets = [-2.35, 0, 2.35];
        colliderOffsets.forEach((offsetX) => {
          const offset = new this.THREE.Vector3(offsetX * scale, 0, 0)
            .applyAxisAngle(
              new this.THREE.Vector3(0, 1, 0),
              capsule.rotation.y
            );
          map.colliders.push({
            position: new this.THREE.Vector3(
              capsule.position.x + offset.x,
              0,
              capsule.position.z + offset.z
            ),
            radius: 1.85 * scale,
            owner: capsule
          });
        });
        return true;
      } catch (error) {
        console.error("Chargement de la capsule de départ impossible.", error);
        this.callbacks.onStatus(
          "La capsule 3D de la map de départ n’a pas pu être chargée."
        );
        return false;
      }
    }

    async loadMap(mapId, entry, announce = true) {
      const definition = BF.maps[mapId];
      if (!definition) throw new Error(`Map inconnue: ${mapId}`);
      this.ensureMapContinuation(mapId);
      const previousMap = this.currentMap;
      const nextMap = BF.buildMap(
        this.THREE,
        definition,
        this.assets,
        this.renderer
      );
      await this.addCrashCapsule(nextMap, definition);
      this.scene.add(nextMap.group);
      this.currentMap = nextMap;
      this.currentMapId = mapId;
      global.dispatchEvent(new CustomEvent("bluefox:map-state", {
        detail: {
          mapId,
          number: this.discoveryNumber(mapId),
          name: definition.name,
          sceneUrl:
            global.BLUEFOX_MAP_ASSETS?.catalog?.maps?.find(
              (map) => map.number === definition.number
            )?.scene?.url ||
            definition.sceneUrl ||
            this.assets[definition.sceneAsset]
        }
      }));
      if (this.character?.pathPlanner) {
        this.character.pathPlanner.bounds = nextMap.bounds || 27;
      }
      this.character?.setColliders(nextMap.colliders);
      await this.setPanorama(
        definition.sceneUrl || this.assets[definition.sceneAsset],
        definition
      );
      this.applyBiomeAtmosphere(definition);
      this.currentZoneIndex = -1;
      this.pendingZoneExploration = null;
      // Évite que l’ancien plateau reste superposé au nouveau (z-fighting).
      previousMap?.group?.removeFromParent();
      previousMap?.dispose();
      BF.bibleRuntime?.renderCurrentSite?.(this);
      if (announce) {
        if (mapId === "crystal" || mapId === "jungle") {
          this.callbacks.onMapChange(mapId);
        }
        this.callbacks.onAction(`Zone chargée : ${this.narrativeMapName(mapId)}.`);
      }
      this.__bacTargetLock = null;
      this.__cachedInteractionApproach = null;
      this.lastAutonomyAt = performance.now() - 5200;
      this.lastActivityAt = performance.now();
      this.updateCurrentZone(performance.now(), true);
      return entry;
    }

    applyBiomeAtmosphere(definition) {
      const profiles = {
        volcanic: {
          sky: 0x24111a, fog: 0x3a1720, density: 0.014,
          hemiSky: 0xffa26b, hemiGround: 0x271018,
          sun: 0xffc08a, fill: 0xff5a36
        },
        frozen: {
          sky: 0x0b1d32, fog: 0x9bc6dc, density: 0.01,
          hemiSky: 0xdaf4ff, hemiGround: 0x294157,
          sun: 0xe8fbff, fill: 0x72cfff
        },
        forest: {
          sky: 0x071b19, fog: 0x163c35, density: 0.014,
          hemiSky: 0xd8eee4, hemiGround: 0x27312e,
          sun: 0xfff4dc, fill: 0xb9d8ca
        },
        ruins: {
          sky: 0x091a20, fog: 0x183b39, density: 0.012,
          hemiSky: 0xd7e9e1, hemiGround: 0x303734,
          sun: 0xfff1d7, fill: 0xb9d2c7
        },
        aquatic: {
          sky: 0x06182b, fog: 0x0b4260, density: 0.016,
          hemiSky: 0x75eaff, hemiGround: 0x092c3e,
          sun: 0xb6f8ff, fill: 0x47cfff
        },
        desert: {
          sky: 0x251811, fog: 0x8a6248, density: 0.009,
          hemiSky: 0xffd0a0, hemiGround: 0x503526,
          sun: 0xffe1b8, fill: 0xff9f62
        },
        crystalline: {
          sky: 0x08172a, fog: 0x183650, density: 0.011,
          hemiSky: 0xa4e8ff, hemiGround: 0x1e3044,
          sun: 0xd4f4ff, fill: 0x64e6ff
        },
        alien: {
          sky: 0x0b1427, fog: 0x182844, density: 0.012,
          hemiSky: 0xb7d8ff, hemiGround: 0x20283b,
          sun: 0xe4e8ff, fill: 0x9d8cff
        }
      };
      const profile = definition.profile || "alien";
      const atmosphere = profiles[profile] || profiles.alien;
      this.scene.background.setHex(atmosphere.sky);
      this.scene.fog.color.setHex(atmosphere.fog);
      this.scene.fog.density = atmosphere.density;
      this.hemisphere.color.setHex(atmosphere.hemiSky);
      this.hemisphere.groundColor.setHex(atmosphere.hemiGround);
      this.sun.color.setHex(atmosphere.sun);
      this.fill.color.setHex(atmosphere.fill);
      this.currentAtmosphereProfile = profile;
      this.createBiomeParticles(profile);
    }

    createBiomeParticles(profile) {
      if (this.biomeParticles) {
        this.scene.remove(this.biomeParticles);
        this.biomeParticles.geometry.dispose();
        this.biomeParticles.material.dispose();
        this.biomeParticles = null;
      }
      const settingsByProfile = {
        volcanic: { color: 0xff7a42, count: 36, size: 0.11, motion: "rise", speed: 0.72, opacity: 0.55 },
        frozen: { color: 0xe8fbff, count: 48, size: 0.1, motion: "fall", speed: 0.62, opacity: 0.62 },
        forest: { color: 0xa8ffd2, count: 34, size: 0.09, motion: "float", speed: 0.28, opacity: 0.48 },
        ruins: { color: 0x9effd5, count: 24, size: 0.08, motion: "float", speed: 0.22, opacity: 0.38 },
        aquatic: { color: 0x69e9ff, count: 42, size: 0.12, motion: "rise", speed: 0.3, opacity: 0.52 },
        desert: { color: 0xffd0a0, count: 32, size: 0.075, motion: "drift", speed: 0.48, opacity: 0.32 },
        crystalline: { color: 0x8cecff, count: 30, size: 0.085, motion: "float", speed: 0.24, opacity: 0.46 },
        alien: { color: 0xb7cfff, count: 26, size: 0.08, motion: "float", speed: 0.22, opacity: 0.4 }
      };
      const settings = settingsByProfile[profile] || settingsByProfile.alien;
      const positions = new Float32Array(settings.count * 3);
      const phases = new Float32Array(settings.count);
      for (let index = 0; index < settings.count; index += 1) {
        const phase = (index * 2.3999632297 + profile.length * 0.71) % (Math.PI * 2);
        const radius = 6 + ((index * 17 + profile.length * 11) % 34);
        positions[index * 3] = Math.cos(phase) * radius;
        positions[index * 3 + 1] = 0.35 + ((index * 13) % 78) / 10;
        positions[index * 3 + 2] = Math.sin(phase) * radius;
        phases[index] = phase;
      }
      const geometry = new this.THREE.BufferGeometry();
      geometry.setAttribute("position", new this.THREE.BufferAttribute(positions, 3));
      const material = new this.THREE.PointsMaterial({
        color: settings.color,
        size: settings.size,
        transparent: true,
        opacity: settings.opacity,
        depthWrite: false,
        blending: this.THREE.AdditiveBlending,
        sizeAttenuation: true
      });
      this.biomeParticles = new this.THREE.Points(geometry, material);
      this.biomeParticles.name = `BiomeParticles_${profile}`;
      this.biomeParticles.frustumCulled = false;
      this.biomeParticleSettings = { ...settings, phases, baseOpacity: settings.opacity };
      const qualityParticleRatios = this.mobilePerformanceProfile
        ? { high: 0.82, balanced: 0.6, low: 0.4 }
        : { high: 1, balanced: 0.72, low: 0.45 };
      const visibleCount = Math.max(
        12,
        Math.round(
          settings.count *
          (qualityParticleRatios[this.performanceQuality] || 1)
        )
      );
      geometry.setDrawRange(0, visibleCount);
      this.scene.add(this.biomeParticles);
    }

    updateBiomeParticles(dt, elapsedTime) {
      if (!this.biomeParticles || !this.biomeParticleSettings) return;
      const settings = this.biomeParticleSettings;
      const attribute = this.biomeParticles.geometry.getAttribute("position");
      const positions = attribute.array;
      const visibleParticleCount = this.mobilePerformanceProfile
        ? Math.min(
            settings.count,
            Math.max(0, Number(this.biomeParticles.geometry.drawRange?.count) || 0)
          )
        : settings.count;
      for (let index = 0; index < visibleParticleCount; index += 1) {
        const offset = index * 3;
        const phase = settings.phases[index];
        if (settings.motion === "rise") {
          positions[offset + 1] += settings.speed * dt;
          if (positions[offset + 1] > 8.2) positions[offset + 1] = 0.25;
        } else if (settings.motion === "fall") {
          positions[offset + 1] -= settings.speed * dt;
          positions[offset] += Math.sin(elapsedTime * 0.7 + phase) * 0.08 * dt;
          if (positions[offset + 1] < 0.2) positions[offset + 1] = 8.1;
        } else if (settings.motion === "drift") {
          positions[offset] += settings.speed * dt;
          positions[offset + 1] += Math.sin(elapsedTime + phase) * 0.035 * dt;
          if (positions[offset] > 42) positions[offset] = -42;
        } else {
          positions[offset] += Math.sin(elapsedTime * 0.45 + phase) * 0.045 * dt;
          positions[offset + 1] += Math.cos(elapsedTime * 0.38 + phase) * 0.025 * dt;
        }
      }
      attribute.needsUpdate = true;
    }

    updatePerformanceGovernor(dt) {
      if (document.hidden || this.transitioning) return;
      if (this.performanceWarmup > 0) {
        this.performanceWarmup -= dt;
        return;
      }
      this.performanceFrames += 1;
      this.performanceElapsed += dt;
      if (this.performanceElapsed < 4) return;

      const fps = this.performanceFrames / this.performanceElapsed;
      this.measuredFps = Math.round(fps);
      this.performanceFrames = 0;
      this.performanceElapsed = 0;

      if (fps < 40) {
        this.performanceLowSamples += 1;
        this.performanceHighSamples = 0;
      } else if (fps > 54) {
        this.performanceHighSamples += 1;
        this.performanceLowSamples = 0;
      } else {
        this.performanceLowSamples = 0;
        this.performanceHighSamples = 0;
      }

      if (this.performanceLowSamples >= 2) {
        const nextQuality =
          this.performanceQuality === "high" ? "balanced" : "low";
        this.applyPerformanceQuality(nextQuality);
        this.performanceLowSamples = 0;
        this.performanceWarmup = 6;
      } else if (this.performanceHighSamples >= 4) {
        const nextQuality =
          this.performanceQuality === "low" ? "balanced" : "high";
        this.applyPerformanceQuality(nextQuality);
        this.performanceHighSamples = 0;
        this.performanceWarmup = 10;
      }
    }

    applyPerformanceQuality(quality) {
      if (quality === this.performanceQuality) return;
      const desktopPresets = {
        high: { pixelRatio: 2, particleRatio: 1, shadows: true },
        balanced: { pixelRatio: 1.5, particleRatio: 0.72, shadows: true },
        low: { pixelRatio: 1, particleRatio: 0.45, shadows: false }
      };
      const mobilePresets = {
        high: { pixelRatio: 1.5, particleRatio: 0.82, shadows: true },
        balanced: { pixelRatio: 1.25, particleRatio: 0.6, shadows: false },
        low: { pixelRatio: 1, particleRatio: 0.4, shadows: false }
      };
      const presets = this.mobilePerformanceProfile
        ? mobilePresets
        : desktopPresets;
      const preset = presets[quality] || presets.high;
      this.performanceQuality = quality;
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, preset.pixelRatio));
      this.renderer.shadowMap.enabled = preset.shadows;
      this.sun.castShadow = preset.shadows;
      if (this.biomeParticles && this.biomeParticleSettings) {
        const visibleCount = Math.max(
          12,
          Math.round(this.biomeParticleSettings.count * preset.particleRatio)
        );
        this.biomeParticles.geometry.setDrawRange(0, visibleCount);
      }
      this.resize();
      this.callbacks.onStatus(
        quality === "high"
          ? "Qualité 3D élevée restaurée."
          : quality === "balanced"
            ? "Qualité 3D équilibrée pour maintenir la fluidité."
            : "Qualité 3D allégée automatiquement pour cet appareil."
      );
    }

    updateCurrentZone(now, force = false) {
      if (!this.currentMap?.zoneRegions?.length) return;
      if (!force && now - this.lastZoneCheckAt < 500) return;
      this.lastZoneCheckAt = now;
      let nearest = this.currentMap.zoneRegions[0];
      let nearestDistance = Infinity;
      this.currentMap.zoneRegions.forEach((zone) => {
        const distance = this.character.root.position.distanceTo(zone.center);
        if (distance < nearestDistance) {
          nearest = zone;
          nearestDistance = distance;
        }
      });
      const reachedPlannedZone =
        this.pendingZoneExploration?.index === nearest.index;
      if (
        !force &&
        nearest.index === this.currentZoneIndex &&
        !reachedPlannedZone
      ) return;
      this.currentZoneIndex = nearest.index;
      const zoneKey = `${this.currentMapId}:map`;
      if (!this.discoveredZones.has(zoneKey)) {
        this.discoveredZones.add(zoneKey);
        this.saveZoneDiscovery();
        const mapIsKnown = this.discoveredMaps.has(this.currentMapId) ||
          this.currentMapId === "crystal";
        if (now >= this.startupQuietUntil) {
          this.callbacks.onAction(mapIsKnown
            ? `Nouvelle zone explorée : ${this.currentMap.definition.name}.`
            : "BlueFox prend pied sur une terre inconnue."
          );
        }
      }
      if (reachedPlannedZone) {
        const preciseZoneKey = `${this.currentMapId}:${nearest.index}`;
        if (!this.discoveredZones.has(preciseZoneKey)) {
          this.discoveredZones.add(preciseZoneKey);
          this.saveZoneDiscovery();
        }
        this.callbacks.onStatus(
          `BlueFox commence l’étude du plateau ${nearest.index + 1}.`
        );
        this.pendingZoneExploration = null;
        this.lastAutonomyAt = now - 5000;
        this.missionManager?.notifyActionCompleted(
          BF.Missions.ActionType.EXPLORE_ZONE,
          {
            mapId: this.currentMapId,
            zoneIndex: nearest.index,
            amount: 1
          }
        );
      }
      const playerZoneNumber = this.discoveryNumber(this.currentMapId) || 1;
      this.callbacks.onZoneChange(
        this.currentMapId,
        `Zone ${String(playerZoneNumber).padStart(2, "0")}`
      );
    }

    canDiscoverMap(mapId) {
      return this.discoveredMaps.has(mapId) ||
        document.visibilityState === "visible";
    }

    safeEntryPosition(targetMap, previousMapId, requestedEntry) {
      const entries = Object.entries(targetMap.runtimeExits || targetMap.exits);
      const matched = entries.find(([direction, candidate]) =>
        direction === requestedEntry || candidate.targetMap === previousMapId
      );
      if (!matched) {
        return new this.THREE.Vector3(targetMap.entry.x, 0, targetMap.entry.z);
      }
      const [, exit] = matched;
      const inward = new this.THREE.Vector3(-exit.x, 0, -exit.z);
      if (inward.lengthSq() < 0.001) inward.set(0, 0, 1);
      inward.normalize();
      const spawn = new this.THREE.Vector3(exit.x, 0, exit.z)
        .addScaledVector(inward, 4.4);
      const minimumClearance = this.character.radius + 0.28;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const blocked = this.currentMap.colliders.some((collider) =>
          spawn.distanceTo(collider.position) <
            minimumClearance + collider.radius
        );
        if (!blocked) return spawn;
        spawn.addScaledVector(inward, 0.8);
      }
      return new this.THREE.Vector3(targetMap.entry.x, 0, targetMap.entry.z);
    }

    beginCanonicalMapTransition(options = {}) {
      if (this.transitioning) return null;
      this.transitioning = true;
      this.transitionStartedAt = performance.now();
      this.character.enabled = false;
      this.character.stop();
      this.transitionElement?.classList?.toggle?.(
        "teleport",
        options.mode === "teleport" || options.source === "teleporter"
      );
      this.transitionElement?.classList?.add?.("active");
      return {
        preservedCameraView: this.cameraController?.captureViewState?.() || null
      };
    }

    async completeCanonicalMapTransition(options = {}) {
      this.savePosition();
      await new Promise((resolve) => setTimeout(resolve, 220));
      if (!this.cameraController?.restoreViewState?.(options.preservedCameraView)) {
        this.cameraController?.resetBehindCharacter?.(true);
      }
      this.completedTransitions += 1;
      options.beforeEvent?.();
      global.dispatchEvent(new CustomEvent("bluefox:map-transition-completed", {
        detail: {
          fromMapId: options.previousMapId || null,
          mapId: this.currentMapId,
          toMapId: this.currentMapId,
          direction: options.direction || null,
          biome: BF.maps[this.currentMapId]?.biome || null,
          isNew: options.isNew === true,
          count: this.completedTransitions,
          ...(options.source ? { source: options.source } : {}),
          ...(options.mode ? { mode: options.mode } : {})
        }
      }));
      return true;
    }

    releaseCanonicalMapTransition() {
      this.transitionElement?.classList?.remove?.("active");
      this.transitionElement?.classList?.remove?.("teleport");
      this.character.enabled = true;
      this.transitioning = false;
      this.transitionStartedAt = 0;
    }

    safeTeleportArrival(anchor, minimumDistance = 2, maximumDistance = 4) {
      if (!anchor || !this.currentMap || !this.character) return null;
      const x = Number(anchor.x);
      const z = Number(anchor.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
      const radius = Math.max(0.1, Number(this.character.radius) || 0.64);
      const regions = Array.isArray(this.character.walkableRegions)
        ? this.character.walkableRegions
        : [];
      const colliders = Array.isArray(this.currentMap.colliders)
        ? this.currentMap.colliders
        : [];
      const walkable = (point) => {
        if (!regions.length) return false;
        const margin = radius + 0.08;
        return regions.some((region) =>
          point.x >= Number(region.minX) + margin &&
          point.x <= Number(region.maxX) - margin &&
          point.z >= Number(region.minZ) + margin &&
          point.z <= Number(region.maxZ) - margin
        );
      };
      const clear = (point) => colliders.every((collider) => {
        const position = collider?.position;
        if (!position) return true;
        const clearance = radius + Math.max(0, Number(collider.radius) || 0) + 0.18;
        return Math.hypot(point.x - position.x, point.z - position.z) >= clearance;
      });
      const min = Math.max(2, Number(minimumDistance) || 2);
      const max = Math.min(4, Math.max(min, Number(maximumDistance) || 4));
      const rings = [min, (min + max) / 2, max];
      for (const ring of rings) {
        for (let index = 0; index < 24; index += 1) {
          const angle = (Math.PI * 2 * index) / 24;
          const point = new this.THREE.Vector3(
            x + Math.cos(angle) * ring,
            0,
            z + Math.sin(angle) * ring
          );
          if (walkable(point) && clear(point)) return point;
        }
      }
      return null;
    }

    async transitionToKnownMap(targetMapId, options = {}) {
      const targetId = String(targetMapId || "");
      if (!targetId || this.transitioning || !this.discoveredMaps.has(targetId)) return false;
      if (!BF.maps?.[targetId]) return false;
      const previousMapId = this.currentMapId;
      const previousPosition = this.character?.root?.position?.clone?.() || null;
      if (targetId === previousMapId) return false;

      const transition = this.beginCanonicalMapTransition(options);
      if (!transition) return false;
      const { preservedCameraView } = transition;
      let loadedTarget = false;
      try {
        if (typeof options.beforeLoad === "function") {
          await options.beforeLoad({ fromMapId: previousMapId, toMapId: targetId });
        }
        await this.loadMap(targetId, null, true);
        loadedTarget = true;
        const spawn = this.safeTeleportArrival(
          options.targetAnchor,
          options.minimumDistance ?? 2,
          options.maximumDistance ?? 4
        );
        if (!spawn) {
          if (previousMapId && BF.maps?.[previousMapId]) {
            await this.loadMap(previousMapId, null, true);
            if (previousPosition) {
              this.character.root.position.copy(previousPosition);
              this.character.constrainToWalkable(this.character.root.position);
              this.character.setTarget(this.character.root.position);
              this.character.lastSafePosition.copy(this.character.root.position);
            }
          }
          throw new Error("teleport-no-safe-arrival");
        }
        this.character.root.position.set(spawn.x, 0, spawn.z);
        this.character.constrainToWalkable(this.character.root.position);
        this.character.setTarget(this.character.root.position);
        this.character.lastSafePosition.copy(this.character.root.position);
        this.character.facePoint(new this.THREE.Vector3(
          Number(options.targetAnchor?.x) || 0,
          0,
          Number(options.targetAnchor?.z) || 0
        ));
        this.explorationRelocationGuard = {
          mapId: targetId,
          x: spawn.x,
          z: spawn.z,
          releaseDistance: 0.9,
          source: options.source || "relocation"
        };
        this.pendingGate = null;
        this.gateCooldownUntil = performance.now() + 2600;
        this.lastActivityAt = performance.now();
        this.lastAutonomyAt = performance.now() - 4200;
        await this.completeCanonicalMapTransition({
          previousMapId,
          direction: options.direction || null,
          isNew: false,
          source: options.source || null,
          mode: options.mode || null,
          preservedCameraView
        });
        return true;
      } catch (error) {
        if (String(error?.message || "") !== "teleport-no-safe-arrival") {
          console.error("Échec de la transition directe", error);
        }
        if (loadedTarget && this.currentMapId !== previousMapId && BF.maps?.[previousMapId]) {
          try {
            await this.loadMap(previousMapId, null, true);
            if (previousPosition) {
              this.character.root.position.copy(previousPosition);
              this.character.constrainToWalkable(this.character.root.position);
              this.character.setTarget(this.character.root.position);
              this.character.lastSafePosition.copy(this.character.root.position);
            }
          } catch (rollbackError) {
            console.error("Échec du retour après transition directe", rollbackError);
          }
        }
        this.explorationRelocationGuard = null;
        if (!this.cameraController?.restoreViewState?.(preservedCameraView)) {
          this.cameraController?.resetBehindCharacter?.(true);
        }
        return false;
      } finally {
        this.releaseCanonicalMapTransition();
      }
    }

    async crossGate(gate) {
      if (this.transitioning) return;
      const exit = gate.userData.exit;
      const previousMapId = this.currentMapId;
      const playerDirectedTransition = Boolean(
        this.persistentNavigationIntent ||
        this.returningToBase ||
        this.navigationRoute.length
      );

      if (
        !playerDirectedTransition &&
        this.autonomyMode === "semi" &&
        !this.canStartAutonomousGate()
      ) {
        this.pendingGate = null;
        this.character.stop();
        this.character.setTarget(this.character.root.position);
        if (this.destinationMarker) this.destinationMarker.visible = false;
        if (this.pathLine) this.pathLine.visible = false;
        this.lastAutonomyAt = performance.now();
        this.lastActivityAt = performance.now();
        this.callbacks.onStatus(
          "BlueFox reste dans cette zone et réévalue d’abord son environnement."
        );
        return;
      }
      if (!this.canDiscoverMap(exit.targetMap)) {
        this.pendingGate = null;
        this.character.stop();
        this.callbacks.onStatus(
          "Première exploration verrouillée : elle exige une partie active et connectée."
        );
        return;
      }

      const transition = this.beginCanonicalMapTransition();
      if (!transition) return;
      const { preservedCameraView } = transition;
      try {
        await new Promise((resolve) => setTimeout(resolve, 340));

        const isNew = !this.discoveredMaps.has(exit.targetMap);
        await this.loadMap(exit.targetMap, null, !isNew);
        const targetMap = BF.maps[exit.targetMap];
        const spawn = this.safeEntryPosition(
          targetMap,
          previousMapId,
          exit.targetEntry
        );
        this.character.root.position.set(spawn.x, 0, spawn.z);
        this.character.constrainToWalkable(this.character.root.position);
        this.character.setTarget(this.character.root.position);
        this.character.lastSafePosition.copy(this.character.root.position);
        this.character.facePoint(new this.THREE.Vector3(0, 0, 0));
        if (isNew) {
          this.discoveredMaps.add(exit.targetMap);
          this.ensureUniqueMapName(exit.targetMap);
          this.saveDiscovery();
          this.callbacks.onAction(
            `Nouvelle terre découverte : ${this.narrativeMapName(exit.targetMap)}.`
          );
          if (exit.targetMap === "crystal" || exit.targetMap === "jungle") {
            this.callbacks.onMapDiscovered(exit.targetMap);
          }
        }
        this.pendingGate = null;
        this.gateCooldownUntil = performance.now() + 2600;
        this.lastActivityAt = performance.now();
        this.lastAutonomyAt = performance.now() - 4200;
        if (!playerDirectedTransition) {
          if (this.autonomyMode === "semi") {
            this.semiAutonomousGateLock = true;
          }
          this.beginAutonomyGrace("autonomous-map-transition");
        }
        await this.completeCanonicalMapTransition({
          previousMapId,
          direction: exit.direction || null,
          isNew,
          preservedCameraView,
          beforeEvent: () => {
            if (this.persistentNavigationIntent?.mapId === this.currentMapId) {
              this.clearPersistentNavigationIntent();
            } else if (this.persistentNavigationIntent?.discoverUnknown === true) {
              // Une suggestion directionnelle vers l'inconnu désigne exactement
              // le territoire voisin. Elle est consommée au premier passage afin
              // de ne jamais se propager aux cartes suivantes.
              this.clearPersistentNavigationIntent();
              this.navigationRoute = [];
            }
          }
        });
      } catch (error) {
        console.error("Échec du passage de map", error);
        this.pendingGate = null;
        this.navigationRoute = [];
        this.returningToBase = false;
        this.clearPersistentNavigationIntent();
        this.callbacks.onStatus(
          "Le passage n’a pas pu être franchi. BlueFox reprend son exploration dans la zone actuelle."
        );
      } finally {
        this.releaseCanonicalMapTransition();
        if (this.navigationRoute[0] === this.currentMapId) {
          this.navigationRoute.shift();
        }
        if (this.navigationRoute.length) {
          window.setTimeout(() => this.navigateNextRouteStep(), 2700);
        } else if (this.persistentNavigationIntent) {
          window.setTimeout(() => this.resumePersistentNavigation(), 900);
        } else if (this.returningToBase && this.currentMapId === "crystal") {
          this.returningToBase = false;
          window.setTimeout(() => this.moveToBaseCamp(), 450);
        }
      }
    }


    updateInteraction(now) {
      if (!this.pendingInteraction || !this.pendingInteraction.userData.active) return;
      const object = this.pendingInteraction;
      const profile = object.userData.interactionProfile || this.interactionProfile(object);
      const anchor = object.userData.worldAnchor || object;
      const anchorPosition = this.interactionWorldPosition(object) || anchor.position;
      const horizontalDistance = Math.hypot(
        this.character.root.position.x - anchorPosition.x,
        this.character.root.position.z - anchorPosition.z
      );
      const verticalDistance = Math.abs(
        Number(this.character.root.position.y || 0) - Number(anchorPosition.y || 0)
      );
      const interactionDistance = this.interactionValidationDistance(object);
      const distance = horizontalDistance;

      if (this.cautiousInteraction?.object === object) {
        const faunaState = this.faunaInteractionState(object);
        if (!faunaState) {
          this.cautiousInteraction = null;
        } else if (faunaState.cautiousQualified === true) {
          const finalApproachPoint = this.cautiousInteraction.finalApproachPoint;
          this.cautiousInteraction = null;
          this.interactionApproachStartedAt = now;
          this.character.setTarget(finalApproachPoint, "walk");
          this.showWorldMarker(finalApproachPoint);
          this.callbacks.onStatus(profile.approachText);
          return;
        } else {
          if (this.cautiousInteraction.phase === "approach") {
            if (distance >= 3.8 && distance <= 5.4) {
              this.character.stop();
              this.cautiousInteraction.phase = "wait";
              this.cautiousInteraction.waitStartedAt = now;
              return;
            }
            if (now - this.interactionApproachStartedAt > 6500) {
              this.interactionApproachAttempts += 1;
              if (this.interactionApproachAttempts <= 3) {
                this.targetInteraction(object, true);
              } else {
                this.callbacks.onStatus(`BlueFox renonce temporairement : ${profile.label} est inaccessible.`);
                this.pendingInteraction = null;
                this.cautiousInteraction = null;
                this.interactionApproachStartedAt = 0;
                this.interactionApproachAttempts = 0;
                this.character.stop();
                this.missionManager?.cancelCurrentAction("interaction-inaccessible");
              }
            }
            return;
          }

          this.character.stop();
          if (now - Number(this.cautiousInteraction.waitStartedAt || now) > 6500) {
            this.interactionApproachAttempts += 1;
            if (this.interactionApproachAttempts <= 3) {
              this.targetInteraction(object, true);
            } else {
              this.callbacks.onStatus(`BlueFox renonce temporairement : ${profile.label} est inaccessible.`);
              this.pendingInteraction = null;
              this.cautiousInteraction = null;
              this.interactionApproachStartedAt = 0;
              this.interactionApproachAttempts = 0;
              this.character.stop();
              this.missionManager?.cancelCurrentAction("interaction-inaccessible");
            }
          }
          return;
        }
      }

      if (
        horizontalDistance > interactionDistance ||
        verticalDistance > interactionDistance
      ) {
        if (!this.interactionStartedAt && now - this.interactionApproachStartedAt > 6500) {
          this.interactionApproachAttempts += 1;
          if (this.interactionApproachAttempts <= 3) {
            this.targetInteraction(object, true);
          } else {
            this.callbacks.onStatus(`BlueFox renonce temporairement : ${profile.label} est inaccessible.`);
            this.pendingInteraction = null;
            this.cautiousInteraction = null;
            this.interactionApproachStartedAt = 0;
            this.interactionApproachAttempts = 0;
            this.character.stop();
            this.missionManager?.cancelCurrentAction("interaction-inaccessible");
          }
        }
        return;
      }
      this.character.stop();
      if (profile.specialAction === "teleport-return") {
        this.callbacks.onAction(profile.actionText);
        this.pendingInteraction = null;
        this.cautiousInteraction = null;
        this.interactionStartedAt = 0;
        this.interactionApproachStartedAt = 0;
        this.interactionApproachAttempts = 0;
        object.userData.requestedMovementMode = null;
        object.userData.requestedInteractionSource = null;
        Promise.resolve(
          BF.SpecialObjectRuntime?.requestBeaconTeleport?.(object)
        ).catch((error) => console.error("Échec de l’interaction balise TP", error));
        return;
      }
      if (!this.interactionStartedAt) {
        this.interactionStartedAt = now;
        this.character.facePoint(anchorPosition);
        const duration = this.character.playInteraction(
          profile.action,
          profile.animationHints
        );
        const fatigueDuration = BF.getSurvivalState?.().fatigue?.actionDuration || 1;
        this.interactionDuration = Math.max(900, duration * 1000 * fatigueDuration);
        this.callbacks.onAction(profile.actionText);
        if (this.speechVisible && now >= this.speechQuietUntil && now - this.lastSpeechAt > 3200) {
          this.callbacks.onSpeak(profile.speechText);
          this.lastSpeechAt = now;
        }
        return;
      }
      if (now - this.interactionStartedAt < this.interactionDuration) return;

      this.character.cancelInteraction();
      object.userData.lastInteractionAt = now;
      if (profile.removeFromWorld) {
        object.userData.active = false;
        anchor.visible = false;
      }
      if (profile.collectable) {
        this.callbacks.onCollect(profile.kind);
      }
      this.completedInteractions += 1;
      this.lastCompletedAction = profile.action;
      const interactionSource = object.userData.requestedInteractionSource || "autonomy";
      if (interactionSource === "autonomy") {
        this.autonomyActionStreak += 1;
      } else if (interactionSource === "manual") {
        this.autonomyActionStreak = 0;
      }
      const missionAction = this.missionActionForInteraction(profile.action);
      if (missionAction) {
        this.missionManager?.notifyActionCompleted(missionAction, {
          kind: profile.kind,
          action: profile.action,
          amount: 1,
          mapId: this.currentMapId,
          zoneIndex: this.currentZoneIndex
        }, { passive: false });
      }
      this.cautiousInteraction = null;
      this.pendingInteraction = null;
      this.interactionStartedAt = 0;
      this.interactionApproachStartedAt = 0;
      this.interactionApproachAttempts = 0;
      this.character.currentAnimation = "";
      this.postActionRecoveryUntil = now + 650;
      this.lastActivityAt = now;
      this.lastAutonomyAt = now - 5600;
      object.userData.requestedMovementMode = null;
      object.userData.requestedInteractionSource = null;
      if (profile.removeFromWorld) {
        if (!Number.isFinite(profile.respawnMs) || profile.respawnMs <= 0) {
          console.error(
            `[BlueFox3D] Métadonnée CUO interaction.respawnSeconds absente ou invalide pour ${profile.kind}.`
          );
          return;
        }
        const respawnMs = profile.respawnMs;
        const cooldown = setTimeout(() => {
          if (this.disposed) return;
          anchor.visible = true;
          object.userData.active = true;
          this.resourceCooldowns.delete(object);
        }, respawnMs);
        this.resourceCooldowns.set(object, cooldown);
      }
    }

    updateAutonomy(now) {
      if (!this.autonomyAllowed(now)) return;
      if (
        this.transitioning ||
        this.pendingInteraction ||
        this.pendingGate ||
        this.pendingZoneExploration ||
        this.currentRoutine ||
        this.missionManager?.currentAction
      ) return;
      if (now < this.postActionRecoveryUntil) return;
      if (now - this.lastAutonomyAt < 5000) return;
      if (this.character.root.position.distanceTo(this.character.target) > 0.2) return;

      const survival = BF.getSurvivalState?.() || {};
      const fatigue = survival.fatigue || { level: "normal", movement: 1, actionDuration: 1 };
      this.character.fatigueSpeedMultiplier = fatigue.movement || 1;

      // Une mission principale active conserve l'autorité, même lorsqu'elle
      // attend temporairement une cible, une direction ou une action joueur.
      if (this.missionManager?.hasPrimaryMissionAuthority?.()) return;

      this.lastAutonomyAt = now;
      if (survival.needs?.criticalRest) {
        if (this.speechVisible && now >= this.speechQuietUntil && now - this.lastFatigueSpeechAt > 15000) {
          this.callbacks.onSpeak("Je suis fatigué, j’ai besoin de récupérer avant de continuer.");
          this.lastFatigueSpeechAt = now;
        }
        this.startRoutine("critical-rest", now, 9000 + Math.random() * 6000, {
          targetEnergy: 33,
          pressureReduction: 3
        });
        return;
      }

      if (this.autonomyActionStreak >= this.autonomyBreakTarget) {
        if (this.speechVisible && now >= this.speechQuietUntil && Math.random() < 0.45 && now - this.lastFatigueSpeechAt > 12000) {
          const phrases = [
            "Je prends un instant pour respirer.",
            "Une petite pause, puis je reprends.",
            "Je vais ralentir un peu.",
            "Je reprends mon souffle."
          ];
          this.callbacks.onSpeak(phrases[Math.floor(Math.random() * phrases.length)]);
          this.lastFatigueSpeechAt = now;
        }
        this.startRoutine("micro-rest", now, 2400 + Math.random() * 2200, {
          restGain: fatigue.level === "heavy" ? 4.2 : 3.2,
          pressureReduction: 0.75
        });
        this.autonomyActionStreak = 0;
        this.autonomyBreakTarget = 2 + Math.floor(Math.random() * 2);
        return;
      }

      if (Math.random() < 0.08) {
        const duration = this.character.playAmbientObservation();
        if (duration > 0) {
          this.noteLocalAutonomousDecision();
          this.lastActivityAt = now;
          this.callbacks.onStatus("BlueFox s’immobilise un instant et observe les environs.");
          return;
        }
      }
      const routineRoll = Math.random();
      if (survival.needs?.rest || routineRoll < 0.12) {
        this.startRoutine("rest", now, survival.needs?.rest ? 8200 : 7200, {
          restGain: survival.needs?.rest ? 18 : 12,
          pressureReduction: 2
        });
        return;
      }
      if (routineRoll < 0.2) {
        this.startRoutine("research", now, 6500);
        return;
      }
      // La ration est actée dans survival.rationRecipe mais sa consommation
      // reste désactivée tant que l'inventaire CUO ne fournit pas deux types
      // de plantes et une vraie ressource ration.
      if (survival.needs?.food && BF.survival?.rationRecipe?.implemented) {
        this.startRoutine("food", now, 5200);
        return;
      }

      const knownGate = this.currentMap.gates.find(
        (gate) => this.discoveredMaps.has(gate.userData.exit.targetMap)
      );
      if (
        knownGate &&
        this.canStartAutonomousGate() &&
        Math.random() < 0.12
      ) {
        this.pendingGate = knownGate;
        this.character.setTarget(knownGate.position);
        this.callbacks.onStatus(
          `BlueFox choisit de retourner vers ${BF.maps[knownGate.userData.exit.targetMap].name}.`
        );
        return;
      }

      const resources = this.currentMap.interactables.filter((object) => this.canInteractWith(object, now));
      if (resources.length) {
        const object = resources[Math.floor(Math.random() * resources.length)];
        object.userData.requestedInteractionSource = "autonomy";
        this.targetInteraction(object);
        return;
      }

      const angle = Math.random() * Math.PI * 2;
      const distance = 6 + Math.random() * 12;
      const patrolTarget = new this.THREE.Vector3(
        BF.clamp(
          this.character.root.position.x + Math.cos(angle) * distance,
          -25,
          25
        ),
        0,
        BF.clamp(
          this.character.root.position.z + Math.sin(angle) * distance,
          -25,
          25
        )
      );
      this.noteLocalAutonomousDecision();
      this.character.setTarget(patrolTarget);
      this.showWorldMarker(patrolTarget);
      this.callbacks.onStatus("BlueFox poursuit une exploration locale autonome.");
    }

    startRoutine(type, now, duration, detail = {}) {
      this.noteLocalAutonomousDecision();
      this.character.stop();
      if (this.destinationMarker) this.destinationMarker.visible = false;
      if (this.pathLine) this.pathLine.visible = false;
      this.currentRoutine = { type, startedAt: now, endsAt: now + duration, detail: { ...detail } };
      const animationType = type === "micro-rest" || type === "critical-rest" ? "rest" : type;
      this.character.playRoutine(animationType, duration / 1000);
      const messages = {
        rest: "BlueFox se repose quelques instants pour préserver ses forces.",
        "micro-rest": "BlueFox marque une courte pause pour reprendre son souffle.",
        "critical-rest": "BlueFox interrompt ses activités pour récupérer d’une fatigue critique.",
        research: "BlueFox analyse ses observations avant de poursuivre l’exploration.",
        food: "BlueFox prend une ration et vérifie ses réserves."
      };
      this.callbacks.onAction(messages[type]);
    }

    updateRoutine(now) {
      if (!this.currentRoutine || now < this.currentRoutine.endsAt) return;
      const finishedRoutine = this.currentRoutine;
      const finished = finishedRoutine.type;
      this.currentRoutine = null;
      this.character.cancelInteraction();
      if (["rest", "micro-rest", "critical-rest"].includes(finished)) this.callbacks.onRest();
      BF.survival?.completeRoutine?.(finished, finishedRoutine.detail || {});
      const missionActionTypes = {
        rest: BF.Missions?.ActionType.REST,
        "micro-rest": null,
        "critical-rest": BF.Missions?.ActionType.REST,
        research: BF.Missions?.ActionType.RESEARCH,
        food: BF.Missions?.ActionType.EAT
      };
      const expectedMissionType = this.missionManager?.currentAction?.type;
      const completedMissionType =
        finished === "research" &&
        expectedMissionType === BF.Missions?.ActionType.OBSERVE
          ? BF.Missions.ActionType.OBSERVE
          : missionActionTypes[finished];
      if (completedMissionType) {
        this.missionManager?.notifyActionCompleted(
          completedMissionType,
          { routine: finished, amount: 1 }
        );
      }
      this.lastAutonomyAt = now - 5000;
      this.lastActivityAt = now;
    }

    ensureActivity(now) {
      if (!this.autonomyAllowed(now)) return;
      if (this.missionManager?.hasPrimaryMissionAuthority?.()) return;
      if (this.pendingTeleport) {
        if (this.character.speed > 0.08 || this.pendingTeleport.inFlight) {
          this.lastActivityAt = now;
          return;
        }
        this.updatePendingTeleportRoute(now);
        this.lastActivityAt = now;
        return;
      }
      if (this.pendingGate) {
        if (this.character.speed > 0.08) {
          this.lastActivityAt = now;
          return;
        }
        if (now - this.lastActivityAt >= 6000) {
          this.character.setTarget(this.pendingGate.position, "run");
          this.showWorldMarker(this.pendingGate.position);
          this.callbacks.onStatus(
            this.discoveredMaps.has(this.pendingGate.userData.exit.targetMap)
              ? "BlueFox reprend le trajet mémorisé sans se laisser détourner."
              : "BlueFox reprend sa route vers la terre inconnue sans interrompre l’exploration."
          );
          this.lastActivityAt = now;
        }
        return;
      }
      const activeMotion = this.character.speed > 0.08 ||
        Boolean(this.interactionStartedAt) ||
        Boolean(this.pendingZoneExploration) ||
        Boolean(this.currentRoutine) ||
        this.transitioning;
      if (activeMotion) {
        this.lastActivityAt = now;
        return;
      }
      if (now - this.lastActivityAt < 12000) return;

      this.pendingInteraction = null;
      this.character.cancelInteraction();
      const resources = this.currentMap.interactables.filter((object) => this.canInteractWith(object, now));
      if (resources.length) {
        const object = resources[Math.floor(Math.random() * resources.length)];
        object.userData.requestedInteractionSource = "autonomy";
        this.targetInteraction(object);
        this.callbacks.onAction(
          "BlueFox reprend spontanément son activité après avoir évalué les priorités locales."
        );
      } else {
        const angle = Math.random() * Math.PI * 2;
        const distance = 7 + Math.random() * 13;
        const target = new this.THREE.Vector3(
          BF.clamp(Math.cos(angle) * distance, -25, 25),
          0,
          BF.clamp(Math.sin(angle) * distance, -25, 25)
        );
        this.noteLocalAutonomousDecision();
        this.character.setTarget(target);
        this.showWorldMarker(target);
        this.callbacks.onStatus("BlueFox reprend une patrouille d’observation autonome.");
      }
      this.lastActivityAt = now;
      this.lastAutonomyAt = now;
    }

    activityPurpose() {
      const mission = document.querySelector(".mission-card h2")?.textContent || "";
      const lower = mission.toLowerCase();
      if (lower.includes("refuge")) {
        return "sécuriser le refuge et rendre le camp durable";
      }
      if (lower.includes("énergie")) {
        return "valider une source d’énergie douce avant toute construction";
      }
      if (lower.includes("flore")) {
        return "comprendre le cycle de la flore sans épuiser l’écosystème";
      }
      if (lower.includes("contact") || lower.includes("rencontre")) {
        return "préparer un contact prudent sans provoquer de réaction hostile";
      }
      return "faire progresser sa mission actuelle sans prendre de risque inutile";
    }

    currentActivity() {
      if (this.currentRoutine) {
        if (["rest", "micro-rest", "critical-rest"].includes(this.currentRoutine.type)) {
          if (this.currentRoutine.type === "micro-rest") {
            return {
              key: "micro-rest",
              label: "Micro-pause et reprise de souffle.",
              speech: "Je souffle un peu avant de reprendre."
            };
          }
          if (this.currentRoutine.type === "critical-rest") {
            return {
              key: "critical-rest",
              label: "Repos prolongé après une fatigue critique.",
              speech: "Je dois vraiment récupérer avant de continuer."
            };
          }
          return {
            key: "rest",
            label: "Pause longue et récupération des forces.",
            speech: "J’ai vraiment besoin d’une bonne pause pour récupérer."
          };
        }
        if (this.currentRoutine.type === "research") {
          return { key: "research", label: "Recherche et analyse des observations récentes.", speech: "Je compare mes observations pour préparer la suite." };
        }
        return { key: "food", label: "Alimentation et vérification des réserves.", speech: "Je prends une ration avant de poursuivre." };
      }
      if (this.pendingInteraction) {
        const profile =
          this.pendingInteraction.userData.interactionProfile ||
          this.interactionProfile(this.pendingInteraction);
        const phase = this.interactionStartedAt ? "action" : "approach";
        return {
          key: `${phase}-${profile.action}-${profile.kind}`,
          label: this.interactionStartedAt
            ? profile.actionText
            : profile.approachText,
          speech: profile.speechText
        };
      }
      if (this.transitioning) {
        return { key: "map-transition", label: "Passage vers une nouvelle zone cartographiée.", speech: "Je franchis le passage vers la zone suivante." };
      }
      if (this.pendingTeleport) {
        return {
          key: `teleport-${this.pendingTeleport.targetMapId}`,
          label: "Déplacement vers un point d’accès au réseau de téléportation.",
          speech: "Je peux raccourcir ce trajet en passant par le réseau de balises."
        };
      }
      if (this.pendingGate) {
        const targetMapId = this.pendingGate.userData.exit.targetMap;
        const isKnown = this.discoveredMaps.has(targetMapId);
        const destination = isKnown ? BF.maps[targetMapId]?.name : "une terre inconnue";
        return {
          key: `gate-${isKnown ? targetMapId : "unknown"}`,
          label: isKnown
            ? `Déplacement vers le passage menant à ${destination}.`
            : "Déplacement vers un passage encore inconnu.",
          speech: isKnown
            ? `Je me dirige vers ${destination}.`
            : "Je me dirige vers une terre inconnue."
        };
      }
      if (this.pendingZoneExploration) {
        return {
          key: `zone-${this.pendingZoneExploration.index}`,
          label: `Exploration de ${this.pendingZoneExploration.name}.`,
          speech: `Je vais reconnaître ${this.pendingZoneExploration.name} avant de revenir aux ressources.`
        };
      }
      if (this.character.speed > 0.08) {
        return { key: "movement", label: "Déplacement et contournement des obstacles.", speech: "Je poursuis mon trajet en contournant les obstacles." };
      }
      const animation = this.character.currentAnimation.toLowerCase();
      if (animation.includes("idle")) {
        return { key: "observation", label: "Observation du terrain et choix de la prochaine action.", speech: "J’observe le terrain avant de poursuivre." };
      }
      return { key: "planning", label: "Planification de la prochaine étape.", speech: "Je vérifie quelle action sera la plus utile." };
    }

    buildGlobalIntention(mission) {
      const lower = mission.toLowerCase();
      if (lower.includes("refuge")) {
        return "Ma priorité est de rendre le refuge sûr et autonome. Je rassemble seulement les ressources nécessaires avant de préparer un voyage plus long.";
      }
      if (lower.includes("énergie")) {
        return "Je veux valider une source d’énergie douce pour sécuriser le camp et préparer les futures explorations. Je n’engagerai aucune construction risquée sans mesures suffisantes.";
      }
      if (lower.includes("flore")) {
        return "Mon projet prioritaire est de comprendre le cycle de la flore afin de voyager sans dégrader les biomes. J’accumule des observations comparables avant de conclure.";
      }
      if (lower.includes("contact") || lower.includes("rencontre")) {
        return "Je prépare un protocole de rencontre prudent pour les prochains voyages. Je veux comprendre les réactions locales avant tout contact direct.";
      }
      return "Je prépare les prochaines étapes du voyage tout en consolidant les acquis du camp. Mes actions immédiates servent cette progression générale.";
    }

    updateInformationLayers(now) {
      if (now - this.lastActivityUiUpdate < 500) return;
      const activity = this.currentActivity();
      const activityElement = document.querySelector(".action-feed p");
      if (activityElement) activityElement.textContent = activity.label;

      const mission = document.querySelector(".mission-card h2")?.textContent || "";
      const intentElement = document.querySelector(".intent-bar strong");
      if (mission !== this.intentMissionKey || !this.stableIntentText) {
        this.intentMissionKey = mission;
        this.stableIntentText = this.buildGlobalIntention(mission);
      }
      if (intentElement && intentElement.textContent !== this.stableIntentText) {
        intentElement.textContent = this.stableIntentText;
      }

      const stateChanged = activity.key !== this.currentActivityKey;
      if (
        this.speechVisible &&
        stateChanged &&
        now >= this.speechQuietUntil &&
        now - this.lastSpeechAt > 6500
      ) {
        this.callbacks.onSpeak(activity.speech);
        this.lastSpeechAt = now;
      }
      this.currentActivityKey = activity.key;
      this.lastActivityUiUpdate = now;
      this.lastIntentUpdate = now;
    }

    updateDestinationMarker(now) {
      if (!this.destinationMarker?.visible) return;
      const age = (now - this.destinationMarkerStartedAt) / 1000;
      const distance = this.character.root.position.distanceTo(
        this.destinationMarker.position
      );
      const pulse = 1 + Math.sin(age * 5) * 0.12;
      this.destinationMarker.scale.setScalar(pulse);
      this.destinationMarker.rotation.z += 0.012;
      this.destinationMarker.material.opacity = Math.max(
        0.2,
        0.72 - Math.min(age / 18, 0.48)
      );
      if (distance < 0.55 || age > 28) this.destinationMarker.visible = false;
      if (
        this.pathLine &&
        (distance < 0.55 || age > 28 || this.interactionStartedAt || this.transitioning)
      ) {
        this.pathLine.visible = false;
      }
    }

    updateSpeechBubble() {
      const bubble = document.getElementById("bluefox-speech");
      if (!bubble) return;
      const projected = new this.THREE.Vector3(
        this.character.root.position.x,
        2.65,
        this.character.root.position.z
      ).project(this.camera);
      bubble.style.left = `${(projected.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth}px`;
      bubble.style.top = `${(-projected.y * 0.5 + 0.5) * this.renderer.domElement.clientHeight}px`;
    }

    update(dt, now) {
      if (this.transitioning && now - this.transitionStartedAt > 12000) {
        this.transitionElement?.classList.remove("active");
        this.character.enabled = true;
        this.transitioning = false;
        this.transitionStartedAt = 0;
        this.pendingGate = null;
        this.pendingTeleport = null;
        this.gateCooldownUntil = now + 2600;
        this.callbacks.onStatus(
          "Le passage a été interrompu proprement. BlueFox reprend son activité."
        );
      }
      this.updateStartupCinematic(now);
      this.updateFinalCapsuleSequence(now);
      const fatigue = BF.getSurvivalState?.().fatigue;
      this.character.fatigueSpeedMultiplier = fatigue?.movement || 1;
      this.character.update(dt);
      this.currentMap.update?.(this.clock.elapsedTime);
      this.updateBiomeParticles(dt, this.clock.elapsedTime);
      this.updatePerformanceGovernor(dt);
      this.updateRoutine(now);
      this.updateInteraction(now);
      this.updatePendingTeleportRoute(now);
      if (
        this.semiAutonomousGateLock &&
        this.pendingZoneExploration
      ) {
        this.noteLocalAutonomousDecision();
      }
      // Une directive joueur persistante reprend dès que l'action atomique
      // déjà engagée est réellement terminée, AVANT toute nouvelle décision
      // missionnelle ou BAC. Elle ne coupe jamais l'action en cours (contrat B).
      if (
        this.persistentNavigationIntent &&
        !this.runtimePaused &&
        !this.startupCinematic &&
        now >= this.startupQuietUntil &&
        !this.transitioning &&
        !this.pendingGate &&
        !this.pendingTeleport &&
        !this.navigationRoute.length
      ) {
        this.resumePersistentNavigation();
      }

      const autonomousRuntimeAllowed = this.autonomyAllowed(now);
      if (autonomousRuntimeAllowed) {
        this.missionManager?.update(now);
      }
      BF.bibleRuntime?.updateCompletionGates?.(now);
      if (autonomousRuntimeAllowed) {
        this.updateAutonomy(now);
        this.ensureActivity(now);
      }
      this.updateInformationLayers(now);
      this.updateCurrentZone(now);
      this.updateDestinationMarker(now);
      if (this.characterGroundShadow) {
        this.characterGroundShadow.position.x = this.character.root.position.x;
        this.characterGroundShadow.position.z = this.character.root.position.z;
        this.characterGroundShadow.material.opacity =
          0.18 + Math.min(this.character.speed / this.character.maxSpeed, 1) * 0.07;
      }

      if (!this.transitioning && now >= this.gateCooldownUntil) {
        const reachedGate = this.currentMap.gates.find((gate) => {
          const radius = gate.userData.triggerRadius || 2.35;
          const nearGate = this.character.root.position.distanceTo(gate.position) < radius;
          const targetAtGate = this.character.target.distanceTo(gate.position) < radius + 0.8;
          return nearGate && (gate === this.pendingGate || targetAtGate);
        });
        if (reachedGate) this.crossGate(reachedGate);
      }

      this.cameraController.update(dt);
      if (this.panorama) {
        const cameraAngle = Math.atan2(
          this.camera.position.x - this.controls.target.x,
          this.camera.position.z - this.controls.target.z
        );
        this.panorama.rotation.y = BF.dampAngle(
          this.panorama.rotation.y,
          cameraAngle,
          3.2,
          dt
        );
        this.panorama.position.x = BF.damp(
          this.panorama.position.x,
          this.controls.target.x,
          1.35,
          dt
        );
        this.panorama.position.z = BF.damp(
          this.panorama.position.z,
          this.controls.target.z,
          1.35,
          dt
        );
      }
      this.updatePlanetaryClock();
      this.ensureCompassNeedle();
      if (this.compassNeedle) {
        this.compassNeedle.style.transform =
          `translate(-50%, -100%) rotate(${Math.PI - this.character.heading}rad)`;
      }
      this.updateSpeechBubble();
      if (!this.startupCinematic && now - this.lastSavedAt > 3000) {
        this.savePosition();
        this.lastSavedAt = now;
      }
    }

    loop() {
      if (this.disposed) return;
      this.frame = requestAnimationFrame(() => this.loop());
      if (this.runtimePaused) {
        this.clock?.getDelta?.();
        return;
      }
      const dt = Math.min(this.clock.getDelta(), 0.04);
      const now = performance.now();
      this.update(dt, now);
      this.renderer.render(this.scene, this.camera);
    }

    getDiagnostics() {
      return {
        version: "0.16.20",
        map: this.currentMapId,
        biomeProfile: this.currentAtmosphereProfile,
        biomeParticles: this.biomeParticleSettings?.count || 0,
        performanceQuality: this.performanceQuality,
        measuredFps: this.measuredFps,
        missingImages: [...this.missingImageUrls],
        panoramaAsset: this.currentPanoramaAsset,
        generatedTopology: this.generatedTopology.length,
        transitioning: this.transitioning,
        transitionsCompleted: this.completedTransitions,
        interactionsCompleted: this.completedInteractions,
        navigationFailures: this.navigationFailures,
        cameraRecoveries: this.cameraController?.recoveryCount || 0,
        browserResumes: this.resumeCount,
        runtimePaused: this.runtimePaused,
        runtimePauseReason: this.runtimePauseReason,
        autonomyMode: this.autonomyMode,
        autonomyGraceRemainingMs: Math.max(
          0,
          Math.round(this.autonomyGraceUntil - performance.now())
        ),
        startupQuietRemainingMs: Math.max(
          0,
          Math.round(this.startupQuietUntil - performance.now())
        ),
        semiAutonomousGateLock: this.semiAutonomousGateLock,
        zonesDiscovered: this.discoveredZones.size,
        mission: this.missionManager?.getState() || null,
        lastResumeAt: this.lastResumeAt,
        characterActive: Boolean(
          this.character?.speed > 0.08 ||
          this.pendingInteraction ||
          this.currentRoutine ||
          this.transitioning
        )
      };
    }

    resize() {
      const width = Math.max(1, this.container.clientWidth);
      const height = Math.max(1, this.container.clientHeight);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }

    dispose() {
      this.clearStartupPresentation();
      this.disposed = true;
      cancelAnimationFrame(this.frame);
      this.resizeObserver?.disconnect();
      this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
      this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp);
      this.renderer.domElement.removeEventListener("dblclick", this.onWorldDoubleClick);
      global.removeEventListener("bluefox:navigate", this.onNavigate);
      global.removeEventListener("bluefox:return-base", this.onReturnBase);
      global.removeEventListener("bluefox:path-planned", this.onPathPlanned);
      global.removeEventListener("bluefox:navigation-failed", this.onNavigationFailed);
      global.removeEventListener("bluefox:autonomy-mode", this.onAutonomyMode);
      global.removeEventListener("bluefox:image-missing", this.onMissingImage);
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      global.removeEventListener("bluefox:camera-mode", this.onCameraMode);
      window.clearTimeout(this.cameraClickTimer);
      window.clearTimeout(this.pointerClickTimer);
      this.cameraButton?.removeEventListener("click", this.onCameraClick);
      this.cameraButton?.removeEventListener("dblclick", this.onCameraDoubleClick);
      this.speechButton?.removeEventListener("click", this.onSpeechToggle);
      this.cameraButton?.remove();
      this.speechButton?.remove();
      this.missionManager?.dispose();
      document.body.classList.remove("bluefox-speech-hidden");
      this.clickMarker?.remove();
      this.finalFadeElement?.remove();
      this.finalFadeElement = null;
      document.body.classList.remove("bluefox-final-cinematic");
      this.cameraController?.dispose();
      this.currentMap?.dispose();
      if (this.character?.root) BF.disposeObject(this.character.root);
      if (this.panorama) BF.disposeObject(this.panorama);
      if (this.destinationMarker) BF.disposeObject(this.destinationMarker);
      if (this.pathLine) BF.disposeObject(this.pathLine);
      if (this.characterGroundShadow) BF.disposeObject(this.characterGroundShadow);
      if (this.biomeParticles) BF.disposeObject(this.biomeParticles);
      this.renderer?.dispose();
      if (BF.currentEngine === this) {
        BF.currentEngine = null;
        BF.getDiagnostics = null;
        BF.getMissionState = null;
        BF.startMission = null;
        BF.setPrimaryMission = null;
        BF.suggestMissionPriority = null;
        BF.pauseMission = null;
        BF.resumeMission = null;
        BF.failMission = null;
        BF.triggerMission = null;
        BF.setSiteStage = null;
      }
      this.container.replaceChildren();
    }
  }

  BF.mount = async function mount(options) {
    const engine = new WorldEngine(options);
    return engine.initialize();
  };
})(window);
