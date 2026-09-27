(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  let latestState = null;
  let lastSignature = "";
  let browserStatus = "active";
  let completionHideTimer = null;
  const HUD_COMPLETION_MS = 6000;
  const hudExpandedMissions = new Set();
  const browserExpandedMissions = new Set();
  const constructionResourceStatusByMission = new Map();
  let hudInitialized = false;

  function rememberExpanded(container, selector, target) {
    container?.querySelectorAll(selector).forEach((details) => {
      const id = details.dataset.missionId;
      if (!id) return;
      if (details.open) target.add(id);
      else target.delete(id);
    });
  }

  function renderTrackedMissionMeters(state) {
    const container = document.querySelector(".meters");
    if (!container) return;
    let energyMeter = container.querySelector(".survival-energy-meter");
    if (!energyMeter) {
      energyMeter = [...container.querySelectorAll("label")].find((meter) =>
        meter.querySelector("span")?.textContent?.trim().toUpperCase() === "ÉNERGIE"
      ) || container.querySelector("label");
      energyMeter?.classList.add("survival-energy-meter");
    }
    let missionMeters = [...container.querySelectorAll("label:not(.survival-energy-meter)")];
    while (missionMeters.length < 2 && missionMeters[0]) {
      const clone = missionMeters[0].cloneNode(true);
      clone.classList.add("tracked-mission-meter");
      container.appendChild(clone);
      missionMeters.push(clone);
    }
    const meters = missionMeters.slice(0, 2);
    if (!meters.length) return;
    const tracked = [...(state.missions || [])]
      .filter((mission) => mission.lifecycleStatus === "active")
      .filter((mission) =>
        !isBackgroundHudMission(mission) || Number(mission.priorityRank) > 0
      )
      .sort((left, right) => {
        const leftRank = Number(left.priorityRank) || (left.isPrimary ? 1 : 99);
        const rightRank = Number(right.priorityRank) || (right.isPrimary ? 1 : 99);
        return leftRank - rightRank;
      })
      .slice(0, 2);
    meters.forEach((meter, index) => {
      meter.classList.add("tracked-mission-meter");
      const mission = tracked[index];
      const label = meter.querySelector("span");
      const value = meter.querySelector("b");
      const fill = meter.querySelector("em");
      meter.hidden=!mission;
      if (!mission) {
        if(label) label.textContent="";
        if(value) value.textContent="";
        if(fill) fill.style.width="0%";
        meter.removeAttribute("title");
        return;
      }
      const percent = Math.round((mission.progress || 0) * 100);
      const valueText = `${percent}%`;
      const width = `${percent}%`;
      const rank = Number(mission.priorityRank) || (mission.isPrimary ? 1 : 0);
      const title = rank ? `Mission prioritaire Top ${rank}` : "Mission suivie";
      if (label && label.textContent !== mission.title) label.textContent = mission.title;
      if (value && value.textContent !== valueText) value.textContent = valueText;
      if (fill && fill.style.width !== width) fill.style.width = width;
      if (meter.title !== title) meter.title = title;
    });
  }

  function createTextElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }


  /* ------------------------------------------------------------------------ */
  /* Tutoriel UI — façade visuelle stable, sans logique missionnelle          */
  /* ------------------------------------------------------------------------ */

  const tutorialTargetResolvers = Object.freeze({
    missions: () => document.querySelector(".mission-tool-button"),
    camera: () => document.querySelector(".bluefox-camera-button"),
    settings: () =>
      document.querySelector('.tool-rail button[aria-label="Réglages"]') ||
      document.querySelector('.tool-rail button[aria-label="Reglages"]'),
    planet: () => document.querySelector('.tool-rail button[aria-label="Planète"]'),
    "planet-directions": () => document.querySelector(".map-grid"),
    "planet-send-unknown": () =>
      [...document.querySelectorAll(".planet-selection-detail button")].find((button) =>
        button.textContent?.includes("terre inconnue")
      ) || null,
    "return-base": () =>
      document.querySelector(".return-base-button, [data-action=\"return-base\"]") ||
      [...document.querySelectorAll(".planet-selection-detail button, .planet-panel button")].find((button) =>
        /retour/i.test(button.textContent || "")
      ) || null,
    "mission-panel": () => document.querySelector(".mission-card")
  });

  let tutorialMessageTimer = null;
  let tutorialMessageOnDismiss = null;
  let tutorialHighlightedElement = null;

  function resolveTutorialTarget(target) {
    if (target instanceof Element) return target;
    const resolver = tutorialTargetResolvers[String(target || "")];
    return resolver?.() || null;
  }

  function hideTutorialMessage() {
    if (tutorialMessageTimer) {
      global.clearTimeout(tutorialMessageTimer);
      tutorialMessageTimer = null;
    }
    const onDismiss = tutorialMessageOnDismiss;
    tutorialMessageOnDismiss = null;
    document.querySelector(".bluefox-tutorial-message")?.remove();
    if (typeof onDismiss === "function") onDismiss();
    return true;
  }

  function showTutorialMessage(text, options = {}) {
    const message = String(text || "").trim();
    if (!message) {
      hideTutorialMessage();
      return false;
    }

    hideTutorialMessage();

    const panel = document.createElement("aside");
    panel.className = "bluefox-tutorial-message";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");

    tutorialMessageOnDismiss =
      typeof options.onDismiss === "function" ? options.onDismiss : null;
    const copy = createTextElement("p", "", message);
    const acknowledge = options.acknowledge;
    const button = createTextElement(
      "button",
      "bluefox-tutorial-message-close",
      acknowledge ? String(acknowledge.label || "OK") : "×"
    );
    button.type = "button";
    button.setAttribute(
      "aria-label",
      acknowledge ? String(acknowledge.label || "OK") : "Fermer le message d’aide"
    );
    button.addEventListener("click", () => {
      if (acknowledge && typeof options.onAcknowledge === "function") {
        options.onAcknowledge();
      }
      hideTutorialMessage();
    });

    panel.append(copy, button);
    document.body.appendChild(panel);

    const duration = Math.max(0, Number(options.duration ?? 14000) || 0);
    if (duration > 0) {
      tutorialMessageTimer = global.setTimeout(hideTutorialMessage, duration);
    }
    return true;
  }

  function clearTutorialHighlight() {
    tutorialHighlightedElement?.classList.remove("bluefox-tutorial-highlight");
    tutorialHighlightedElement = null;
    return true;
  }

  function highlightTutorialTarget(target) {
    const element = resolveTutorialTarget(target);
    clearTutorialHighlight();
    if (!element) return false;
    tutorialHighlightedElement = element;
    element.classList.add("bluefox-tutorial-highlight");
    return true;
  }

  BF.TutorialUI = Object.freeze({
    version: "tutorial-ui-foundation-v1",
    targets: Object.freeze(Object.keys(tutorialTargetResolvers)),
    showMessage: showTutorialMessage,
    hideMessage: hideTutorialMessage,
    highlight: highlightTutorialTarget,
    clearHighlight: clearTutorialHighlight,
    resolveTarget: resolveTutorialTarget
  });

  /* ------------------------------------------------------------------------ */
  /* Consommation des prescriptions UI portées par les fiches Bible           */
  /* ------------------------------------------------------------------------ */

  const tutorialGuidanceShown = new Set();
  const tutorialGuidanceTimers = new Map();
  const tutorialMissionActiveSince = new Map();

  function activeMissionIds(state) {
    const ids = new Set(
      Array.isArray(state?.activeMissionIds) ? state.activeMissionIds : []
    );
    (state?.missions || [])
      .filter((mission) => mission.lifecycleStatus === "active")
      .filter((mission) => mission.contextVisible !== false)
      .forEach((mission) => ids.add(mission.missionId));
    (state?.catalog || [])
      .filter((mission) => mission.status === "active")
      .filter((mission) => mission.contextVisible !== false)
      .forEach((mission) => ids.add(mission.missionId));
    return ids;
  }

  function missionProgress(state, missionId) {
    return Number(
      (state?.missions || []).find((mission) => mission.missionId === missionId)?.progress || 0
    );
  }

  function guidanceConditionMet(guidance, missionId, state) {
    const activeIds = activeMissionIds(state);
    const when = String(guidance?.when || "active");

    if (when === "missions-active") {
      const required = Array.isArray(guidance.missionsAll)
        ? guidance.missionsAll
        : [missionId];
      return required.every((id) => activeIds.has(id));
    }

    if (when === "completed") {
      return (state?.missions || []).some((mission) =>
        mission.missionId === missionId && mission.lifecycleStatus === "completed"
      ) || (state?.catalog || []).some((mission) =>
        mission.missionId === missionId && mission.status === "completed"
      );
    }

    if (!activeIds.has(missionId)) return false;
    if (when === "target-available") {
      return Boolean(guidance.highlight && resolveTutorialTarget(guidance.highlight));
    }
    if (when === "active-idle") return !state?.currentAction;
    return true;
  }

  function cancelTutorialGuidance(key, clearVisuals = false) {
    const timer = tutorialGuidanceTimers.get(key);
    if (timer) global.clearTimeout(timer);
    tutorialGuidanceTimers.delete(key);
    if (clearVisuals) {
      BF.TutorialUI?.hideMessage?.();
      BF.TutorialUI?.clearHighlight?.();
    }
  }

  function showGuidanceOnce(missionId, guidance, state) {
    const key = `${missionId}:${guidance.id || guidance.message || "guidance"}`;
    if (tutorialGuidanceShown.has(key)) return false;
    if (!guidanceConditionMet(guidance, missionId, state)) return false;

    tutorialGuidanceShown.add(key);
    tutorialGuidanceTimers.delete(key);

    let dismissCleanup = null;
    const dismiss = () => {
      BF.TutorialUI?.hideMessage?.();
      BF.TutorialUI?.clearHighlight?.();
    };
    const cleanupDismiss = () => {
      dismissCleanup?.();
      dismissCleanup = null;
    };

    BF.TutorialUI?.showMessage?.(guidance.message, {
      duration: guidance.duration,
      acknowledge: guidance.acknowledge,
      onDismiss: cleanupDismiss,
      onAcknowledge: guidance.acknowledge
        ? () => {
            const mode = String(guidance.acknowledge.autonomyMode || "").toLowerCase();
            if (!["semi", "full"].includes(mode)) return;
            if (BF.unlockAutonomyMode?.(mode) !== true) return;
            if (BF.setAutonomyMode?.(mode, { source: "tutorial" }) !== true) return;
            global.dispatchEvent?.(new CustomEvent(
              "bluefox:tutorial-guidance-acknowledged",
              {
                detail: {
                  missionId,
                  guidanceId: guidance.id || null,
                  autonomyMode: mode
                }
              }
            ));
            BF.TutorialUI?.clearHighlight?.();
          }
        : null
    });

    const dismissCleanups = [];
    const globalEvent = String(guidance.dismissOnEvent || "").trim();
    if (globalEvent) {
      const handler = () => dismiss();
      global.addEventListener?.(globalEvent, handler, { once: true });
      dismissCleanups.push(() => global.removeEventListener?.(globalEvent, handler));
    }

    const targetEvent = String(guidance.dismissOnTargetEvent || "").trim();
    if (targetEvent) {
      const target = resolveTutorialTarget(guidance.highlight);
      if (target?.addEventListener) {
        const handler = () => dismiss();
        target.addEventListener(targetEvent, handler, { once: true });
        dismissCleanups.push(() => target.removeEventListener?.(targetEvent, handler));
      }
    }
    dismissCleanup = () => dismissCleanups.splice(0).forEach((cleanup) => cleanup());

    if (guidance.highlight) BF.TutorialUI?.highlight?.(guidance.highlight);

    const duration = Math.max(0, Number(guidance.duration ?? 14000) || 0);
    if (guidance.highlight && duration > 0) {
      const clearKey = `${key}:clear`;
      cancelTutorialGuidance(clearKey);
      tutorialGuidanceTimers.set(
        clearKey,
        global.setTimeout(() => {
          tutorialGuidanceTimers.delete(clearKey);
          BF.TutorialUI?.clearHighlight?.();
        }, duration)
      );
    }
    return true;
  }

  function consumeTutorialGuidance(state) {
    if (!state) return;

    const now = Date.now();
    const activeIds = activeMissionIds(state);
    activeIds.forEach((missionId) => {
      if (!tutorialMissionActiveSince.has(missionId)) {
        tutorialMissionActiveSince.set(missionId, now);
      }
    });
    [...tutorialMissionActiveSince.keys()].forEach((missionId) => {
      if (!activeIds.has(missionId)) tutorialMissionActiveSince.delete(missionId);
    });

    (BF.BibleCatalog || []).forEach((definition) => {
      const missionId = definition?.id;
      if (!missionId || !Array.isArray(definition.uiGuidance)) return;

      definition.uiGuidance.forEach((guidance) => {
        const key = `${missionId}:${guidance.id || guidance.message || "guidance"}`;
        if (tutorialGuidanceShown.has(key)) return;

        if (
          guidance.dismissOnProgress === true &&
          missionProgress(state, missionId) > 0
        ) {
          cancelTutorialGuidance(key, true);
          tutorialGuidanceShown.add(key);
          return;
        }

        if (!guidanceConditionMet(guidance, missionId, state)) {
          cancelTutorialGuidance(key);
          return;
        }

        const delayMs = Math.max(0, Number(guidance.delayMs) || 0);
        if (delayMs > 0) {
          const activeSince = tutorialMissionActiveSince.get(missionId);
          if (!activeSince || now - activeSince < delayMs) return;
        }
        showGuidanceOnce(missionId, guidance, state);
      });
    });
  }

  function consumeTutorialGuidanceWhenReady(state) {
    if (BF.startupPresentationActive === true) return false;
    if (Date.now() < Number(BF.startupGuidanceReleaseAt || 0)) return false;
    consumeTutorialGuidance(state);
    return true;
  }

  function constructionRequirementLabel(requirement) {
    const key = String(
      requirement?.inventoryKey ||
      requirement?.subject ||
      requirement?.inventoryKeys?.[0] ||
      "composants"
    ).toLowerCase();
    const labels = {
      fiber: "fibres",
      wood: "bois",
      mineral: "minéraux / cristaux"
    };
    return labels[key] || key.replaceAll("_", " ");
  }

  function constructionShortages(mission) {
    if (!mission?.missionId || mission.lifecycleStatus !== "active") return [];
    let status = constructionResourceStatusByMission.get(mission.missionId) || null;

    // Initialisation bornée : une seule lecture lors de la première apparition
    // d'une mission complète. Les mises à jour suivantes viennent de
    // bluefox:construction-resources-changed, jamais d'un polling inventaire.
    if (!status && Number(mission.progress || 0) >= 1) {
      status = BF.getConstructionResourceStatus?.(mission.missionId) || null;
      if (status) constructionResourceStatusByMission.set(mission.missionId, status);
    }

    return Array.isArray(status?.requirements)
      ? status.requirements.filter((entry) => Number(entry?.missing) > 0)
      : [];
  }

  function renderStep(node, index, currentAction) {
    const descendants = [];
    const collectDescendants = (candidate) => {
      (candidate.children || []).forEach((child) => {
        descendants.push(child);
        collectDescendants(child);
      });
    };
    collectDescendants(node);
    const leaves = descendants.filter((candidate) =>
      !(candidate.children || []).length
    );
    const active = currentAction?.nodeId === node.id ||
      descendants.some((candidate) => candidate.id === currentAction?.nodeId);
    const progress = leaves.length
      ? leaves.filter((candidate) => candidate.status === "completed").length
      : node.progress;
    const target = leaves.length ? leaves.length : node.target;
    const row = document.createElement("div");
    row.className = [
      "mission-step",
      node.status === "locked" ? "locked" : "",
      active ? "active" : ""
    ].filter(Boolean).join(" ");

    row.appendChild(
      createTextElement("span", "", String(index + 1).padStart(2, "0"))
    );
    const copy = document.createElement("div");
    copy.appendChild(createTextElement("b", "", node.title));
    const detail = node.params?.progressLabel || (node.status === "locked"
      ? "Prérequis en attente"
      : active
        ? "Action en cours"
        : `${Math.min(progress, target)}/${target}`);
    copy.appendChild(createTextElement("small", "", detail));
    row.appendChild(copy);

    const marker = createTextElement(
      "i",
      node.status === "completed" ? "done" : "progress",
      node.status === "completed" ? "✓" : `${progress}/${target}`
    );
    row.appendChild(marker);
    return row;
  }

  function renderMissionChoiceControls(mission) {
    const missionId = String(mission?.missionId || mission?.id || "");
    if (!missionId || typeof BF.getMissionChoiceState !== "function") return null;
    const choice = BF.getMissionChoiceState(missionId);
    if (!choice || (!choice.available && !choice.resolved)) return null;

    const container = document.createElement("div");
    container.className = "mission-browser-actions mission-choice-actions";
    if (choice.resolved) {
      const selected = (choice.options || []).find((option) => option.id === choice.choiceId);
      container.appendChild(createTextElement(
        "small",
        "mission-choice-resolved",
        `Choix : ${selected?.label || choice.choiceId}`
      ));
      return container;
    }

    (choice.options || []).forEach((option) => {
      const button = createTextElement("button", "mission-choice-button", option.label);
      button.type = "button";
      if (option.text) button.title = option.text;
      button.addEventListener("click", () => {
        const buttons = [...container.querySelectorAll("button")];
        buttons.forEach((candidate) => { candidate.disabled = true; });
        const accepted = BF.submitMissionChoice?.(missionId, option.id) === true;
        if (!accepted) {
          buttons.forEach((candidate) => { candidate.disabled = false; });
          return;
        }
        global.setTimeout(refresh, 0);
      });
      container.appendChild(button);
    });
    return container;
  }

  function missionHudLeafNodes(mission) {
    const root = mission?.tree?.root;
    if (!root) return [];
    const leaves = [];
    const visit = (node) => {
      const children = Array.isArray(node?.children) ? node.children : [];
      if (!children.length) {
        leaves.push(node);
        return;
      }
      children.forEach(visit);
    };
    visit(root);
    return leaves;
  }

  function isStrictCumulativeHudMission(mission, definition) {
    const leaves = missionHudLeafNodes(mission);
    if (!leaves.length) return false;

    // Les paliers de collecte historique ne déclenchent aucune action locale :
    // ils reflètent uniquement le compteur monde porté par ProgressionRegistry.
    if (leaves.every((node) => node?.params?.historicalCollection === true)) {
      return true;
    }

    // Les paliers d'exploration 60/100 sont des compteurs cumulatifs par map.
    // T10 utilise également EXPLORE_SCOPE, mais n'est pas instanceScope=map :
    // il reste donc visible comme mission tutorielle normale.
    if (definition?.instanceScope === "map" && leaves.every((node) =>
      String(node?.params?.biblePattern || "") === "EXPLORE_SCOPE"
    )) {
      return true;
    }

    return false;
  }

  function isBackgroundHudMission(mission) {
    const missionId = String(mission?.missionId || mission?.id || "");
    const definition = BF.Missions?.getDefinition?.(missionId) ||
      (BF.BibleCatalog || []).find?.((entry) => entry?.id === missionId) ||
      null;
    return definition?.backgroundHud === true ||
      isStrictCumulativeHudMission(mission, definition);
  }

  function render(state) {
    renderTrackedMissionMeters(state||{});
    const card = document.querySelector(".mission-card");
    if (!card || !state) return;
    const intentBar = document.querySelector(".intent-bar");
    const hasRealIntention = Boolean(
      state.currentAction ||
      (state.missions || []).some((mission) => mission.lifecycleStatus === "active")
    );
    intentBar?.classList.toggle("bluefox-intent-ready", hasRealIntention);

    const now = Date.now();
    const transientCompleted = [...(state.missions || [])]
      .filter((mission) =>
        mission.lifecycleStatus === "completed" &&
        Number(mission.completedAt || 0) > 0 &&
        now - Number(mission.completedAt) < HUD_COMPLETION_MS
      )
      .sort((left, right) => Number(right.completedAt) - Number(left.completedAt))
      .slice(0, 1);
    if (completionHideTimer) {
      clearTimeout(completionHideTimer);
      completionHideTimer = null;
    }
    if (transientCompleted[0]) {
      const remaining = Math.max(
        0,
        HUD_COMPLETION_MS - (now - Number(transientCompleted[0].completedAt))
      );
      completionHideTimer = setTimeout(() => {
        lastSignature = "";
        render(BF.getMissionState?.() || latestState || {});
      }, remaining + 25);
    }

    let panel = card.querySelector(".m0-mission-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "m0-mission-panel";
      card.insertBefore(panel, card.querySelector(".action-feed"));
    }
    card.classList.add("mission-m0-connected");
    renderTrackedMissionMeters(state);
    const intention = document.querySelector(".intent-bar strong");
    const intentionText = state.description || state.title || "";
    if (intention && intention.textContent !== intentionText) {
      intention.textContent = intentionText;
    }
    const signature = JSON.stringify({
      missionId: state.missionId,
      status: state.status,
      selectionReason: state.selectionReason || "",
      pendingPrimaryMissionId: state.pendingPrimaryMissionId || null,
      prioritizedMissionIds: state.prioritizedMissionIds || [],
      missionGuidanceEnabled: state.missionGuidanceEnabled !== false,
      missionGuidanceResumeAt: state.missionGuidanceResumeAt || 0,
      currentAction: state.currentAction?.id || null,
      constructionResources: [...constructionResourceStatusByMission.entries()].map(
        ([missionId, status]) => [
          missionId,
          ...(status?.requirements || []).map((entry) =>
            `${entry.available}/${entry.required}`
          )
        ]
      ),
      hudCompleted: transientCompleted.map((mission) => mission.missionId),
      missions: (state.missions || []).map((mission) => [
        mission.missionId,
        mission.status,
        mission.lifecycleStatus,
        Math.round((mission.progress || 0) * 100),
        mission.isPrimary,
        mission.priorityRank || 0
      ]),
      catalog: (state.catalog || []).map((mission) => [
        mission.missionId,
        mission.status,
        Math.round((mission.progress || 0) * 100)
      ]),
      children: (state.tree?.root?.children || []).map((node) => [
        node.id,
        node.progress,
        node.target,
        node.status
      ])
    });
    if (signature === lastSignature && panel.childElementCount) return;
    rememberExpanded(panel, ".mission-card-entry", hudExpandedMissions);
    lastSignature = signature;

    panel.replaceChildren();
    panel.appendChild(createTextElement("div", "eyebrow", "MISSIONS EN COURS"));
    if (state.selectionReason) {
      panel.appendChild(createTextElement(
        "small",
        "m2-priority-reason",
        state.selectionReason
      ));
    }
    if (state.pendingPrimaryMissionId) {
      panel.appendChild(createTextElement(
        "small",
        "m2-pending-priority",
        `Prochaine priorité après l’action en cours : ${state.pendingPrimaryMissionTitle || state.pendingPrimaryMissionId}`
      ));
    }
    const activeMissions = [...(state.missions || [])]
      .filter((mission) => mission.lifecycleStatus === "active")
      .filter((mission) =>
        !isBackgroundHudMission(mission) ||
        Number(mission.priorityRank) > 0
      )
      .sort((left, right) => {
        const leftRank = Number(left.priorityRank) || (left.isPrimary ? 1 : 99);
        const rightRank = Number(right.priorityRank) || (right.isPrimary ? 1 : 99);
        return leftRank - rightRank;
      });
    const visibleMissions = [...activeMissions, ...transientCompleted].slice(0, 5);
    visibleMissions.forEach((mission) => {
      const details = document.createElement("details");
      details.className = `mission-card-entry${mission.isPrimary ? " primary" : ""}${mission.lifecycleStatus === "completed" ? " completed" : ""}`;
      details.dataset.missionId = mission.missionId;
      details.open = mission.lifecycleStatus === "completed" || (hudInitialized
        ? hudExpandedMissions.has(mission.missionId)
        : mission.isPrimary);
      details.addEventListener("toggle", () => {
        if (details.open) hudExpandedMissions.add(mission.missionId);
        else hudExpandedMissions.delete(mission.missionId);
      });
      const summary = document.createElement("summary");
      const percent = Math.round((mission.progress || 0) * 100);
      summary.append(
        createTextElement("b", "", mission.title),
        createTextElement(
          "small",
          "",
          mission.lifecycleStatus === "completed"
            ? "TERMINÉE · 100 %"
            : `${mission.priorityRank ? `TOP ${mission.priorityRank} · ` : mission.isPrimary ? "PRIORITAIRE · " : ""}${percent} %`
        )
      );
      details.appendChild(summary);
      const body = document.createElement("div");
      body.className = "mission-card-entry-body";
      if (mission.description) body.appendChild(createTextElement("p", "", mission.description));
      constructionShortages(mission).forEach((requirement) => {
        body.appendChild(createTextElement(
          "small",
          "m2-construction-shortage",
          `Attention : seulement ${Math.floor(Number(requirement.available) || 0)} / ${Math.floor(Number(requirement.required) || 0)} ${constructionRequirementLabel(requirement)} actuellement dans l’inventaire.`
        ));
      });
      (mission.tree?.root?.children || []).forEach((node, index) => {
        body.appendChild(renderStep(node, index, state.currentAction));
      });
      const choiceControls = renderMissionChoiceControls(mission);
      if (choiceControls) body.appendChild(choiceControls);
      if (!mission.isPrimary && mission.lifecycleStatus === "active") {
        const prioritize = createTextElement("button", "mission-priority-button", "Définir comme priorité");
        prioritize.type = "button";
        prioritize.addEventListener("click", () => BF.suggestMissionPriority?.(mission.missionId));
        body.appendChild(prioritize);
      }
      details.appendChild(body);
      panel.appendChild(details);
    });
    hudInitialized = true;
    const activeMissionCount = (state.missions || []).filter(
      (mission) => mission.lifecycleStatus === "active"
    ).length;
    if (activeMissionCount > visibleMissions.length) {
      panel.appendChild(createTextElement(
        "small",
        "mission-card-overflow",
        `+ ${activeMissionCount - visibleMissions.length} mission(s) dans le menu Missions`
      ));
    }
    const catalog = state.catalog || [];
    if (catalog.length) {
      const count = (status) => catalog.filter((mission) =>
        mission.status === status
      ).length;
      panel.appendChild(createTextElement(
        "small",
        "m3-catalog-summary",
        `MISSIONS · ${count("available")} disponibles · ${count("active")} actives · ${count("completed")} terminées`
      ));
    }

  }

  function missionList(state) {
    const merged = new Map((state.catalog || []).map((mission) => [
      mission.missionId,
      { ...mission }
    ]));
    (state.missions || []).forEach((mission) => {
      merged.set(mission.missionId, {
        ...(merged.get(mission.missionId) || {}),
        ...mission,
        status: mission.lifecycleStatus || mission.status
      });
    });
    const publicStatuses = new Set(["available", "active", "paused", "completed"]);
    return [...merged.values()].filter((mission) =>
      mission.missionId !== "foundation" && publicStatuses.has(mission.status)
    );
  }

  function renderMissionBrowser(state) {
    const browser = document.querySelector(".mission-browser");
    if (!browser || !state) return;
    rememberExpanded(browser, ".mission-browser-card", browserExpandedMissions);
    const list = missionList(state);
    const statuses = [
      ["available", "Disponibles"],
      ["active", "Actives"],
      ["paused", "En pause"],
      ["completed", "Terminées"]
    ];
    browser.replaceChildren();
    const close = createTextElement("button", "drawer-close", "×");
    close.type = "button";
    close.addEventListener("click", () => browser.remove());
    browser.append(close);
    browser.appendChild(createTextElement("div", "eyebrow", "JOURNAL DES MISSIONS"));
    browser.appendChild(createTextElement("h2", "", "Missions de BlueFox"));

    const guidance = document.createElement("div");
    guidance.className = "mission-guidance-controls";
    const guidanceEnabled = state.missionGuidanceEnabled !== false;
    const guidanceStatus = createTextElement(
      "small",
      "mission-guidance-status",
      guidanceEnabled
        ? "Priorisation automatique active · jusqu’à 3 missions suivies"
        : `Mode libre temporaire${state.missionGuidanceResumeAt ? ` · retour auto dans ${Math.max(1, Math.ceil((state.missionGuidanceResumeAt - Date.now()) / 60000))} min` : ""}`
    );
    const guidanceButton = createTextElement(
      "button",
      "mission-guidance-button",
      guidanceEnabled ? "Mode libre temporaire" : "Reprendre les priorités"
    );
    guidanceButton.type = "button";
    guidanceButton.addEventListener("click", () => {
      if (guidanceEnabled) BF.suspendMissionGuidance?.();
      else BF.resumeMissionGuidance?.();
      global.setTimeout(refresh, 0);
    });
    guidance.append(guidanceStatus, guidanceButton);
    browser.appendChild(guidance);

    const tabs = document.createElement("nav");
    tabs.className = "mission-browser-tabs";
    statuses.forEach(([status, label]) => {
      const button = createTextElement(
        "button",
        browserStatus === status ? "active" : "",
        `${label} (${list.filter((mission) => mission.status === status).length})`
      );
      button.type = "button";
      button.addEventListener("click", () => {
        browserStatus = status;
        renderMissionBrowser(state);
      });
      tabs.appendChild(button);
    });
    browser.appendChild(tabs);
    const cards = document.createElement("div");
    cards.className = "mission-browser-list";
    list.filter((mission) => mission.status === browserStatus)
      .forEach((mission) => {
        const details = document.createElement("details");
        details.className = "mission-browser-card";
        details.dataset.missionId = mission.missionId;
        details.open = browserExpandedMissions.has(mission.missionId);
        details.addEventListener("toggle", () => {
          if (details.open) browserExpandedMissions.add(mission.missionId);
          else browserExpandedMissions.delete(mission.missionId);
        });
        const summary = document.createElement("summary");
        const percent = Math.round((mission.progress || 0) * 100);
        summary.append(
          createTextElement("b", "", mission.title || mission.missionId),
          createTextElement(
            "small",
            "",
            `${mission.priorityRank ? `TOP ${mission.priorityRank} · ` : ""}${mission.scope || "global"} · ${percent} %`
          )
        );
        details.appendChild(summary);
        const body = document.createElement("div");
        body.className = "mission-browser-body";
        body.appendChild(createTextElement(
          "blockquote",
          "mission-bluefox-note",
          mission.journalIntro || "Je veux comprendre ce que cette mission peut nous apprendre."
        ));
        if (mission.description) {
          body.appendChild(createTextElement("p", "", mission.description));
        }
        const bar = document.createElement("i");
        bar.className = "mission-progress-bar";
        const fill = document.createElement("span");
        fill.style.width = `${percent}%`;
        bar.appendChild(fill);
        body.appendChild(bar);
        if (mission.tree?.root?.children) {
          mission.tree.root.children.forEach((node, index) =>
            body.appendChild(renderStep(node, index, state.currentAction))
          );
        }
        const choiceControls = renderMissionChoiceControls(mission);
        if (choiceControls) body.appendChild(choiceControls);
        const actions = document.createElement("div");
        actions.className = "mission-browser-actions";
        const contextVisible = mission.contextVisible !== false;
        if (contextVisible && mission.status === "active" && !mission.isPrimary) {
          const suggest = createTextElement("button", "", "Définir comme priorité");
          suggest.addEventListener("click", () => BF.suggestMissionPriority?.(mission.missionId));
          actions.appendChild(suggest);
        }
        if (contextVisible && mission.status === "active") {
          const pause = createTextElement("button", "", "Mettre en pause");
          pause.addEventListener("click", () => BF.pauseMission?.(mission.missionId));
          actions.appendChild(pause);
        } else if (contextVisible && mission.status === "paused") {
          const resume = createTextElement("button", "", "Reprendre");
          resume.addEventListener("click", () => BF.resumeMission?.(mission.missionId));
          actions.appendChild(resume);
        }
        body.appendChild(actions);
        details.appendChild(body);
        cards.appendChild(details);
      });
    if (!cards.childElementCount) {
      cards.appendChild(createTextElement("p", "mission-browser-empty", "Aucune mission dans cette catégorie."));
    }
    browser.appendChild(cards);
  }

  function ensureMissionTool() {
    const rail = document.querySelector(".tool-rail");
    if (!rail) return;
    const planetButton = [...rail.querySelectorAll("button")].find((candidate) =>
      candidate.getAttribute("aria-label") === "Planète"
    );
    const planetIcon = planetButton?.querySelector("span");
    if (planetIcon && !planetIcon.classList.contains("planet-sphere-icon")) {
      planetIcon.className = "planet-sphere-icon";
      planetIcon.textContent = "●";
    }
    if (rail.querySelector(".mission-tool-button")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mission-tool-button";
    button.setAttribute("aria-label", "Missions");
    const icon = createTextElement("span", "mission-page-icon", "");
    icon.setAttribute("aria-hidden", "true");
    icon.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
    button.append(icon, createTextElement("small", "", "Missions"));
    button.addEventListener("click", () => {
      document.querySelector(".drawer .drawer-close, .full-screen-panel:not(.mission-browser) .drawer-close")?.click();
      document.querySelector(".mission-browser")?.remove();
      const browser = document.createElement("section");
      browser.className = "full-screen-panel mission-browser";
      browser.setAttribute("role", "dialog");
      browser.setAttribute("aria-label", "Missions de BlueFox");
      document.body.appendChild(browser);
      renderMissionBrowser(BF.getMissionState?.() || latestState);
    });
    rail.appendChild(button);
  }

  document.addEventListener("click", (event) => {
    const toolButton = event.target.closest?.(".tool-rail button");
    if (!toolButton || toolButton.classList.contains("mission-tool-button")) return;
    document.querySelector(".mission-browser")?.remove();
  }, true);

  global.addEventListener("bluefox:construction-resources-changed", (event) => {
    const status = event.detail || null;
    if (!status?.missionId) return;
    constructionResourceStatusByMission.set(status.missionId, status);
    lastSignature = "";
    if (latestState) {
      render(latestState);
      renderMissionBrowser(latestState);
    }
  });

  global.addEventListener("bluefox:mission-state", (event) => {
    latestState = event.detail;
    consumeTutorialGuidanceWhenReady(latestState);
    render(latestState);
    renderMissionBrowser(latestState);
  });


  global.addEventListener("bluefox:intro-presentation", (event) => {
    if (event.detail?.active === true) {
      BF.TutorialUI?.hideMessage?.();
      BF.TutorialUI?.clearHighlight?.();
      return;
    }
    if (latestState) consumeTutorialGuidanceWhenReady(latestState);
  });

  const refresh = () => {
    const current = BF.getMissionState?.() || BF.missionState || latestState;
    if (!current) return;
    latestState = current;
    consumeTutorialGuidanceWhenReady(current);
    const panel = document.querySelector(".m0-mission-panel");
    if (!panel?.isConnected) lastSignature = "";
    render(current);
  };

  const enforceStableIntention = () => {
    const intention = document.querySelector(".intent-bar strong");
    const text = latestState?.description || latestState?.title || "";
    if (!intention || !text || intention.textContent === text) return false;
    intention.textContent = text;
    return true;
  };

  const intentionObserver = new MutationObserver(enforceStableIntention);
  intentionObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  global.setInterval(refresh, 500);
  global.setTimeout(refresh, 0);
  global.setInterval(ensureMissionTool, 1000);
  global.setTimeout(ensureMissionTool, 0);
})(window);
