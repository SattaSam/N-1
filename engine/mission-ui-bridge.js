(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  let latestState = null;
  let lastSignature = "";

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
      currentAction: state.currentAction?.id || null,
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
    state.tree.root.children.forEach((node, index) => {
      panel.appendChild(renderStep(node, index, state.currentAction));
    });

    const intention = document.querySelector(".intent-bar strong");
    if (intention) {
      intention.textContent = state.currentAction
        ? `En ce moment : ${state.currentAction.title}.`
        : state.description || state.title;
    }
  }

  global.addEventListener("bluefox:mission-state", (event) => {
    latestState = event.detail;
    lastSignature = "";
    render(latestState);
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
})(window);
