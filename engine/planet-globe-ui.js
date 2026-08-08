(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "planet-globe-validated-r1";
  const TEXTURE_URL = "./assets/planet/planet_texture_main.png";
  const installed = new WeakSet();
  const textureImage = new Image();
  textureImage.decoding = "async";
  textureImage.src = TEXTURE_URL;

  let imageReady = false;

  textureImage.addEventListener("load", () => {
    imageReady = true;
    document.querySelectorAll(".planet-map-viewport")
      .forEach((viewport) => scheduleRender(viewport));
  });

  textureImage.addEventListener("error", () => {
    console.warn("[BlueFox] Texture du globe introuvable :", TEXTURE_URL);
  });

  const stateFor = (viewport) => {
    viewport._bluefoxGlobeState ||= {
      raf: 0,
      canvas: null,
      context: null,
      width: 0,
      height: 0,
      dpr: 1
    };
    return viewport._bluefoxGlobeState;
  };

  const ensureCanvas = (viewport) => {
    const state = stateFor(viewport);
    let canvas = state.canvas;

    if (!canvas || !canvas.isConnected) {
      canvas = document.createElement("canvas");
      canvas.className = "planet-globe-texture-canvas";
      canvas.setAttribute("aria-hidden", "true");
      viewport.prepend(canvas);
      state.canvas = canvas;
      state.context = canvas.getContext("2d", { alpha: true });
    }

    const rect = viewport.getBoundingClientRect();
    const dpr = Math.min(2, Math.max(1, global.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    if (state.width !== width || state.height !== height || state.dpr !== dpr) {
      state.width = width;
      state.height = height;
      state.dpr = dpr;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      state.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    return state;
  };

  const positiveModulo = (value, modulo) =>
    ((value % modulo) + modulo) % modulo;

  /* Raccord sur les deux axes de la texture. */
  const drawWrappedPatch = (
    ctx, image,
    sx, sy, sw, sh,
    dx, dy, dw, dh
  ) => {
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    if (!iw || !ih || sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;

    sx = positiveModulo(sx, iw);
    sy = positiveModulo(sy, ih);

    const xParts = [];
    const firstW = Math.min(sw, iw - sx);
    xParts.push({ s: sx, len: firstW, ratioStart: 0 });
    if (firstW < sw) {
      xParts.push({ s: 0, len: sw - firstW, ratioStart: firstW / sw });
    }

    const yParts = [];
    const firstH = Math.min(sh, ih - sy);
    yParts.push({ s: sy, len: firstH, ratioStart: 0 });
    if (firstH < sh) {
      yParts.push({ s: 0, len: sh - firstH, ratioStart: firstH / sh });
    }

    for (const xp of xParts) {
      for (const yp of yParts) {
        const rx = xp.len / sw;
        const ry = yp.len / sh;
        ctx.drawImage(
          image,
          xp.s, yp.s, xp.len, yp.len,
          dx + dw * xp.ratioStart,
          dy + dh * yp.ratioStart,
          dw * rx,
          dh * ry
        );
      }
    }
  };

  const renderTexture = (viewport) => {
    if (!imageReady) return;
    const view = viewport._bluefoxView;
    if (!view) return;

    const state = ensureCanvas(viewport);
    const ctx = state.context;
    const width = state.width;
    const height = state.height;
    if (!ctx || width <= 2 || height <= 2) return;

    const imageWidth = textureImage.naturalWidth;
    const imageHeight = textureImage.naturalHeight;
    if (!imageWidth || !imageHeight) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#06131b";
    ctx.fillRect(0, 0, width, height);

    const radiusX = width / 2;
    const radiusY = height / 2;
    const zoom = Number(view.zoom) || 1;

    const rotationLongitude =
      -(Number(view.x) || 0) / Math.max(1, radiusX);
    const rotationLatitude =
      -(Number(view.y) || 0) / Math.max(1, radiusY) * 0.92;

    const sourcePerLonRadian = imageWidth / (Math.PI * 2);
    const sourcePerLatRadian = imageHeight / Math.PI;

    const rowStep = height > 760 ? 3 : 2;
    const colStep = width > 760 ? 3 : 2;

    for (let y = 0; y < height; y += rowStep) {
      const nextY = Math.min(height, y + rowStep);
      const ny1 = Math.max(-.9995, Math.min(.9995, (y - radiusY) / radiusY));
      const ny2 = Math.max(-.9995, Math.min(.9995, (nextY - radiusY) / radiusY));
      const lat1 = Math.asin(ny1);
      const lat2 = Math.asin(ny2);

      const sourceY =
        imageHeight / 2 +
        (lat1 + rotationLatitude) * sourcePerLatRadian / Math.max(.82, zoom);
      const sourceH = Math.max(
        .45,
        Math.abs(lat2 - lat1) * sourcePerLatRadian / Math.max(.82, zoom)
      );

      for (let x = 0; x < width; x += colStep) {
        const nextX = Math.min(width, x + colStep);
        const nx1 = Math.max(-.9995, Math.min(.9995, (x - radiusX) / radiusX));
        const nx2 = Math.max(-.9995, Math.min(.9995, (nextX - radiusX) / radiusX));
        const lon1 = Math.asin(nx1);
        const lon2 = Math.asin(nx2);

        const sourceX =
          imageWidth / 2 +
          (lon1 + rotationLongitude) * sourcePerLonRadian / Math.max(.82, zoom);
        const sourceW = Math.max(
          .45,
          Math.abs(lon2 - lon1) * sourcePerLonRadian / Math.max(.82, zoom)
        );

        drawWrappedPatch(
          ctx,
          textureImage,
          sourceX,
          sourceY,
          sourceW,
          sourceH,
          x,
          y,
          nextX - x,
          nextY - y
        );
      }
    }

    const vignette = ctx.createRadialGradient(
      width * .47, height * .42, 0,
      width * .5, height * .5, Math.max(width, height) * .59
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(.76, "rgba(2,12,17,.025)");
    vignette.addColorStop(1, "rgba(0,4,10,.20)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  };

  const applySphereProjection = (viewport) => {
    const view = viewport._bluefoxView;
    const world = viewport.querySelector(".planet-map-world");
    if (!view || !world) return;

    const rect = viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const radiusX = rect.width / 2;
    const radiusY = rect.height / 2;

    world.querySelectorAll(".planet-map-zone").forEach((zone) => {
      const mapX = Number.parseFloat(zone.style.left) || 0;
      const mapY = Number.parseFloat(zone.style.top) || 0;
      const screenX = mapX * view.zoom + view.x;
      const screenY = mapY * view.zoom + view.y;

      const nx = Math.max(-1, Math.min(1, (screenX - radiusX) / radiusX));
      const ny = Math.max(-1, Math.min(1, (screenY - radiusY) / radiusY));
      const depthX = Math.sqrt(Math.max(0, 1 - nx * nx));
      const depthY = Math.sqrt(Math.max(0, 1 - ny * ny));

      zone.style.setProperty("--sphere-scale-x", String(.28 + depthX * .72));
      zone.style.setProperty("--sphere-scale-y", String(.30 + depthY * .70));
      zone.style.setProperty(
        "--sphere-depth",
        String(.16 + Math.min(depthX, depthY) * .84)
      );
    });
  };

  function scheduleRender(viewport) {
    if (!(viewport instanceof Element)) return;
    const state = stateFor(viewport);
    if (state.raf) return;
    state.raf = global.requestAnimationFrame(() => {
      state.raf = 0;
      renderTexture(viewport);
      applySphereProjection(viewport);
    });
  }

  const installViewport = (viewport) => {
    if (installed.has(viewport)) return;
    installed.add(viewport);

    viewport.style.backgroundImage = "none";
    viewport.style.backgroundColor = "#06131b";
    ensureCanvas(viewport);

    ["pointermove", "pointerup", "pointercancel", "wheel"].forEach((type) => {
      viewport.addEventListener(type, () => scheduleRender(viewport));
    });

    const originalApply = viewport._bluefoxApplyTransform;
    if (typeof originalApply === "function" && !originalApply._globeValidatedWrapped) {
      const wrapped = function globeValidatedTransform(...args) {
        const result = originalApply.apply(this, args);
        scheduleRender(viewport);
        return result;
      };
      wrapped._globeValidatedWrapped = true;
      viewport._bluefoxApplyTransform = wrapped;
    }

    const resizeObserver = new ResizeObserver(() => scheduleRender(viewport));
    resizeObserver.observe(viewport);

    scheduleRender(viewport);
  };

  const scan = () => {
    document.querySelectorAll(".planet-map-viewport").forEach(installViewport);
  };

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) =>
      [...mutation.addedNodes].some((node) =>
        node instanceof Element &&
        (
          node.matches?.(".planet-map-viewport") ||
          node.querySelector?.(".planet-map-viewport")
        )
      )
    )) scan();
  });

  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });

    [
      "bluefox:topology-coordinates-changed",
      "bluefox:map-transition-completed",
      "bluefox:discovery-changed"
    ].forEach((eventName) => {
      global.addEventListener(eventName, () => {
        scan();
        document.querySelectorAll(".planet-map-viewport").forEach(scheduleRender);
      });
    });

    scan();
    console.info(
      "[BlueFox] Planet Globe validé : texture + projection sphérique + responsive."
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  BF.PlanetGlobeUI = Object.freeze({
    version: VERSION,
    texture: TEXTURE_URL,
    refresh() {
      scan();
      document.querySelectorAll(".planet-map-viewport").forEach(scheduleRender);
    }
  });
})(window);
