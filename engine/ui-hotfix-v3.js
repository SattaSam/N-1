(function (global) {
  "use strict";

  const VERSION = "ui-hotfix-v3";
  let appliedGap = null;

  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();

  const markProgressPanel = () => {
    const labels = [...document.querySelectorAll("span, strong, small, div, p")]
      .filter((node) => normalize(node.textContent) === "ENERGIE");

    labels.forEach((label) => {
      let node = label.parentElement;
      let best = null;

      for (let depth = 0; node && depth < 6; depth += 1, node = node.parentElement) {
        const rect = node.getBoundingClientRect();
        const hasProgressVisual = Boolean(
          node.querySelector(
            'progress, [role="progressbar"], [class*="progress"], [class*="bar"], [class*="gauge"], [class*="meter"]'
          )
        );

        if (
          hasProgressVisual &&
          rect.width >= 220 &&
          rect.width <= Math.max(760, innerWidth * 0.68) &&
          rect.height >= 38 &&
          rect.height <= 170
        ) {
          best = node;
          break;
        }
      }

      if (best) best.classList.add("bluefox-progress-hover-frame");
    });
  };

  const removeTopGap = (forceMeasure = false) => {
    const root = document.getElementById("root");
    if (!root) return false;

    document.documentElement.style.setProperty("margin", "0", "important");
    document.documentElement.style.setProperty("padding", "0", "important");
    document.body.style.setProperty("margin", "0", "important");
    document.body.style.setProperty("padding", "0", "important");

    const canvas = root.querySelector("canvas");
    if (!canvas) return false;

    if (forceMeasure && appliedGap != null) {
      root.style.removeProperty("transform");
      root.style.removeProperty("height");
      root.style.removeProperty("min-height");
      appliedGap = null;
    }

    if (appliedGap == null) {
      const canvasTop = Math.round(canvas.getBoundingClientRect().top);
      const rootTop = Math.round(root.getBoundingClientRect().top);

      // Le défaut observé est un décalage de quelques dizaines de pixels
      // entre le sommet du viewport et le premier pixel du rendu 3D.
      const measuredGap = canvasTop > 2 && canvasTop < 96
        ? canvasTop
        : rootTop > 2 && rootTop < 96
          ? rootTop
          : 0;

      appliedGap = measuredGap;
    }

    root.style.setProperty("margin", "0", "important");
    root.style.setProperty("padding", "0", "important");
    root.style.setProperty("top", "0", "important");

    if (appliedGap > 0) {
      root.style.setProperty(
        "transform",
        `translate3d(0, -${appliedGap}px, 0)`,
        "important"
      );
      root.style.setProperty(
        "height",
        `calc(100vh + ${appliedGap}px)`,
        "important"
      );
      root.style.setProperty(
        "min-height",
        `calc(100vh + ${appliedGap}px)`,
        "important"
      );
    }

    // Neutralise également le décalage local du wrapper WebGL, y compris
    // s'il est absolute/fixed (cas que la V2 laissait volontairement intact).
    let node = canvas.parentElement;
    for (let depth = 0; node && node !== root.parentElement && depth < 5; depth += 1) {
      const rect = node.getBoundingClientRect();
      if (rect.width >= innerWidth * 0.78 && rect.height >= innerHeight * 0.55) {
        node.style.setProperty("margin-top", "0", "important");
        node.style.setProperty("padding-top", "0", "important");
        node.style.setProperty("inset-block-start", "0", "important");
      }
      node = node.parentElement;
    }

    return true;
  };

  const apply = () => {
    removeTopGap(false);
    markProgressPanel();
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  };

  const observer = new MutationObserver(schedule);

  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });

    global.addEventListener("resize", () => {
      appliedGap = null;
      schedule();
    });
    ["bluefox:map-state", "bluefox:map-transition-completed"]
      .forEach((eventName) => global.addEventListener(eventName, schedule));

    apply();

    global.BlueFox3D = global.BlueFox3D || {};
    global.BlueFox3D.UIHotfixV3 = Object.freeze({
      version: VERSION,
      refresh: () => {
        appliedGap = null;
        apply();
      },
      measuredTopGap: () => appliedGap
    });

    console.info("[BlueFox] UI Hotfix V3 actif : suppression du gap supérieur renforcée.");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(window);
