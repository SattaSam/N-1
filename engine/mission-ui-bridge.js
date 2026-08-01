(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  let latestState = null;
  let lastSignature = "";
  let browserStatus = "active";

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
    const detail = node.status === "locked"
      ? "Prérequis en attente"
      : active
        ? "Action en cours"
        : `${Math.min(progress, target)}/${target}`;
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
    const card = document.querySelector(".mission-card");
    if (!card || !state?.tree?.root) return;

    let panel = card.querySelector(".m0-mission-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "m0-mission-panel";
      card.insertBefore(panel, card.querySelector(".action-feed"));
    }
    card.classList.add("mission-m0-connected");

    const signature = JSON.stringify({
      missionId: state.missionId,
      status: state.status,
      selectionReason: state.selectionReason || "",
      pendingPrimaryMissionId: state.pendingPrimaryMissionId || null,
      currentAction: state.currentAction?.id || null,
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
      children: state.tree.root.children.map((node) => [
        node.id,
        node.progress,
        node.target,
        node.status
      ])
    });
    if (signature === lastSignature && panel.childElementCount) return;
    lastSignature = signature;

    panel.replaceChildren();
    panel.appendChild(createTextElement("div", "eyebrow", "MISSION EN COURS"));
    panel.appendChild(createTextElement("h2", "", state.title));
    panel.appendChild(createTextElement("p", "", state.description || ""));
    if (state.selectionReason) {
      panel.appendChild(createTextElement(
        "small",
        "m2-priority-reason",
        state.selectionReason
      ));
    }
    state.tree.root.children.forEach((node, index) => {
      panel.appendChild(renderStep(node, index, state.currentAction));
    });
    const secondary = (state.missions || []).filter((mission) => !mission.isPrimary);
    if (secondary.length) {
      const summary = document.createElement("div");
      summary.className = "m1-secondary-summary";
      summary.appendChild(createTextElement(
        "small",
        "",
        `${secondary.length} mission${secondary.length > 1 ? "s" : ""} secondaire${secondary.length > 1 ? "s" : ""}`
      ));
      secondary.forEach((mission) => {
        summary.appendChild(createTextElement(
          "span",
          "",
          `${mission.title} · ${mission.lifecycleStatus || mission.status} · ${Math.round((mission.progress || 0) * 100)} %`
        ));
      });
      panel.appendChild(summary);
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

    const intention = document.querySelector(".intent-bar strong");
    if (intention) {
      intention.textContent = state.currentAction
        ? `En ce moment : ${state.currentAction.title}.`
        : state.description || state.title;
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
    return [...merged.values()].filter((mission) =>
      mission.missionId !== "foundation"
    );
  }

  function renderMissionBrowser(state) {
    const browser = document.querySelector(".mission-browser");
    if (!browser || !state) return;
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
          const suggest = createTextElement("button", "", "Suggérer comme priorité");
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
    if (!rail || rail.querySelector(".mission-tool-button")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mission-tool-button";
    button.setAttribute("aria-label", "Missions");
    button.append(
      createTextElement("span", "", "◎"),
      createTextElement("small", "", "Missions")
    );
    button.addEventListener("click", () => {
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

  global.setInterval(refresh, 500);
  global.setTimeout(refresh, 0);
  global.setInterval(ensureMissionTool, 1000);
  global.setTimeout(ensureMissionTool, 0);
})(window);
