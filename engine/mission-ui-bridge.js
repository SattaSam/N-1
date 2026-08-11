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
      .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary))
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
      const title = mission.isPrimary ? "Mission prioritaire" : "Deuxième mission suivie";
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
      currentAction: state.currentAction?.id || null,
      hudCompleted: transientCompleted.map((mission) => mission.missionId),
      missions: (state.missions || []).map((mission) => [
        mission.missionId,
        mission.status,
        mission.lifecycleStatus,
        Math.round((mission.progress || 0) * 100),
        mission.isPrimary
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
      .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
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
            : `${mission.isPrimary ? "PRIORITAIRE · " : ""}${percent} %`
        )
      );
      details.appendChild(summary);
      const body = document.createElement("div");
      body.className = "mission-card-entry-body";
      if (mission.description) body.appendChild(createTextElement("p", "", mission.description));
      (mission.tree?.root?.children || []).forEach((node, index) => {
        body.appendChild(renderStep(node, index, state.currentAction));
      });
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
          createTextElement("small", "", `${mission.scope || "global"} · ${percent} %`)
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
        const actions = document.createElement("div");
        actions.className = "mission-browser-actions";
        if (mission.status === "active" && !mission.isPrimary) {
          const suggest = createTextElement("button", "", "Définir comme priorité");
          suggest.addEventListener("click", () => BF.suggestMissionPriority?.(mission.missionId));
          actions.appendChild(suggest);
        }
        if (mission.status === "active") {
          const pause = createTextElement("button", "", "Mettre en pause");
          pause.addEventListener("click", () => BF.pauseMission?.(mission.missionId));
          actions.appendChild(pause);
        } else if (mission.status === "paused") {
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

  global.addEventListener("bluefox:mission-state", (event) => {
    latestState = event.detail;
    render(latestState);
    renderMissionBrowser(latestState);
  });

  const refresh = () => {
    const current = BF.getMissionState?.() || BF.missionState || latestState;
    if (!current) return;
    latestState = current;
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
