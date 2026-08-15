(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (!BF.ObjectLibrary?.create || BF.FaunaToolBallReturn?.version === "FAU10-return-r2") return;

  const tracked = new Set();
  const states = new WeakMap();
  const originalLibrary = BF.ObjectLibrary;
  const originalCreate = originalLibrary.create.bind(originalLibrary);

  const register = (root) => {
    if (!root || states.has(root)) return root;
    states.set(root, {
      origin: null,
      lastPosition: null,
      lastMotionAt: 0,
      returning: false,
      returnStartAt: 0,
      returnFrom: null
    });
    tracked.add(root);
    return root;
  };

  BF.ObjectLibrary = Object.freeze({
    ...originalLibrary,
    create(THREE, type, palette, variant = 0) {
      const instance = originalCreate(THREE, type, palette, variant);
      if (type === "fauna_straw_ball" && instance?.root) register(instance.root);
      return instance;
    }
  });

  const nowSeconds = () => (global.performance?.now?.() || Date.now()) / 1000;
  const RETURN_DURATION = 1.95; // plus lent que la poussée (~1,45 s)
  const MOTION_EPS = 0.006;
  const PUSH_THRESHOLD = 0.42;

  const smoothStep = (t) => t * t * (3 - 2 * t);

  const tickBall = (ball, elapsed) => {
    if (!ball?.parent) {
      tracked.delete(ball);
      states.delete(ball);
      return;
    }

    const state = states.get(ball);
    if (!state.origin) {
      // Différé : ObjectSpawner peut repositionner l'objet juste après create().
      state.origin = ball.position.clone();
      state.lastPosition = ball.position.clone();
      state.lastMotionAt = elapsed;
      return;
    }

    const moved = ball.position.distanceTo(state.lastPosition);
    const distanceFromOrigin = ball.position.distanceTo(state.origin);

    if (!state.returning) {
      if (moved > MOTION_EPS) {
        state.lastMotionAt = elapsed;
        state.lastPosition.copy(ball.position);
        return;
      }

      // Le runtime FAU-10 vient de terminer sa poussée rapide :
      // dès que la boule est stabilisée hors de son origine, retour lent.
      if (
        distanceFromOrigin >= PUSH_THRESHOLD &&
        elapsed - state.lastMotionAt >= 0.16
      ) {
        state.returning = true;
        state.returnStartAt = elapsed;
        state.returnFrom = ball.position.clone();
      }
      return;
    }

    const t = Math.min(1, Math.max(0, (elapsed - state.returnStartAt) / RETURN_DURATION));
    const eased = smoothStep(t);
    ball.position.lerpVectors(state.returnFrom, state.origin, eased);

    if (t >= 1) {
      ball.position.copy(state.origin);
      state.lastPosition.copy(ball.position);
      state.lastMotionAt = elapsed;
      state.returning = false;
      state.returnFrom = null;
    }
  };

  const frame = () => {
    const elapsed = nowSeconds();
    tracked.forEach((ball) => tickBall(ball, elapsed));
    global.requestAnimationFrame?.(frame);
  };
  global.requestAnimationFrame?.(frame);

  BF.FaunaToolBallReturn = Object.freeze({
    version: "FAU10-return-r2",
    register,
    ratioAfterMission: 1 / 5,
    behavior: Object.freeze([
      "approche",
      "poussee_nez",
      "depart_rapide",
      "retour_lent",
      "repetition"
    ])
  });

  console.info("[BlueFox FAU-10] Retour lent de la boule actif ; comportement post-mission conservé sur 1 brouteur / 5.");
})(window);
