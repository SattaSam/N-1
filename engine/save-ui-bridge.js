(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const ACTIVE_SLOT_KEY = "bluefox_active_save_slot_v1";
  const RESTORED_AT_KEY = "bluefox_active_state_restored_at_v1";
  const LAST_SESSION_END_KEY = "bluefox_last_session_end_v1";
  const SLOT_KEYS = Object.freeze({
    auto: "bluefox_autosave_slot_v1",
    backup: "bluefox_autosave_backup_v1",
    1: "bluefox_save_slot_1_v1",
    2: "bluefox_save_slot_2_v1"
  });
  const SAVE_UI_CONFIG = Object.freeze({
    version: "save-ui-locked-v3",
    targetSelector: ".settings-content",
    rootId: "bluefox-save-game-controls",
    actionClass: "save-game-actions",
    actions: Object.freeze([
      Object.freeze({ id: "save", label: "Sauvegarder" }),
      Object.freeze({ id: "load", label: "Charger" }),
      Object.freeze({ id: "new", label: "Nouvelle partie" })
    ])
  });
  const RESERVED_KEYS = new Set([
    ...Object.values(SLOT_KEYS),
    "bluefox_last_manual_save_v1",
    "bluefox_new_game_start_v1",
    "bluefox_last_start_map_v1",
    "bluefox_save_diagnostics_v1",
    ACTIVE_SLOT_KEY,
    RESTORED_AT_KEY,
    LAST_SESSION_END_KEY
  ]);
  const diagnostics = { lastAttemptAt:0,lastSuccessAt:0,lastFailureAt:0,lastSlot:null,lastBytes:0,lastError:"",verified:false };
  let lastFlushAt = 0;
  const keys = () => Array.from({length:global.localStorage.length},(_,i)=>global.localStorage.key(i)).filter(Boolean);
  const persistRuntime = () => {
    const calls = [
      () => BF.currentEngine?.savePosition?.(),
      () => BF.currentEngine?.saveDiscovery?.(),
      () => BF.currentEngine?.saveZoneDiscovery?.(),
      () => BF.currentEngine?.missionManager?.memory?.save?.(),
      () => BF.progression?.save?.(),
      () => BF.multiProgression?.save?.(),
      () => BF.mapExploration?.save?.(),
      () => BF.survival?.save?.()
    ];
    const errors=[]; calls.forEach(fn=>{try{fn();}catch(e){errors.push(e);}}); return errors;
  };
  const captureState = () => Object.fromEntries(keys().filter(k=>k.startsWith("bluefox_")&&!RESERVED_KEYS.has(k)).map(k=>[k,global.localStorage.getItem(k)]));
  const readSnapshot = slot => {
    try { const s=JSON.parse(global.localStorage.getItem(SLOT_KEYS[slot])||"null"); return s?.version===1&&s.state?s:null; }
    catch { return null; }
  };
  const clearActive = () => keys().forEach(k=>{if(k.startsWith("bluefox_")&&!RESERVED_KEYS.has(k))global.localStorage.removeItem(k);});
  const applySnapshot = (snapshot,slot) => {
    clearActive();
    Object.entries(snapshot.state).forEach(([k,v])=>{if(k.startsWith("bluefox_")&&!RESERVED_KEYS.has(k)&&v!=null)global.localStorage.setItem(k,String(v));});
    global.localStorage.setItem(ACTIVE_SLOT_KEY,String(slot));
    global.localStorage.setItem(RESTORED_AT_KEY,String(snapshot.savedAt));
  };
  const activeSlot = global.localStorage.getItem(ACTIVE_SLOT_KEY)||"auto";
  const activeSnapshot = readSnapshot(activeSlot)||(activeSlot==="auto"?readSnapshot("backup"):null);
  const restoredAt = Number(global.localStorage.getItem(RESTORED_AT_KEY))||0;
  if(activeSnapshot&&activeSnapshot.savedAt>restoredAt) applySnapshot(activeSnapshot,activeSlot);

  const writeSnapshot = (slot="auto") => {
    diagnostics.lastAttemptAt=Date.now(); diagnostics.lastSlot=String(slot); diagnostics.lastError=""; diagnostics.verified=false;
    const runtimeErrors=persistRuntime(),savedAt=Date.now(),snapshot={version:1,slot:String(slot),savedAt,state:captureState()},serialized=JSON.stringify(snapshot);
    diagnostics.lastBytes=serialized.length*2;
    try {
      if(slot==="auto"){const prev=global.localStorage.getItem(SLOT_KEYS.auto);if(prev)global.localStorage.setItem(SLOT_KEYS.backup,prev);}
      global.localStorage.setItem(SLOT_KEYS[slot],serialized);
      const reread=readSnapshot(slot); if(!reread||reread.savedAt!==savedAt)throw new Error("Snapshot illisible après écriture.");
      diagnostics.lastSuccessAt=savedAt; diagnostics.verified=true;
      if(runtimeErrors.length)diagnostics.lastError=`${runtimeErrors.length} sous-système(s) non forcé(s).`;
    } catch(error) {
      diagnostics.lastFailureAt=Date.now(); diagnostics.lastError=error?.message||String(error); return false;
    }
    global.localStorage.setItem(ACTIVE_SLOT_KEY,String(slot));
    global.localStorage.setItem(RESTORED_AT_KEY,String(savedAt));
    global.localStorage.setItem(LAST_SESSION_END_KEY,String(savedAt));
    global.localStorage.setItem("bluefox_save_diagnostics_v1",JSON.stringify(diagnostics));
    return snapshot;
  };
  const restoreSnapshot = (slot="auto") => {
    const snapshot=readSnapshot(slot)||(slot==="auto"?readSnapshot("backup"):null);
    if(!snapshot)return false; applySnapshot(snapshot,slot); global.location.reload(); return true;
  };
  const flush=()=>{const now=Date.now();if(now-lastFlushAt<1000)return false;lastFlushAt=now;global.localStorage.setItem(LAST_SESSION_END_KEY,String(now));return Boolean(writeSnapshot("auto"));};
  global.addEventListener("pagehide",flush);
  global.addEventListener("beforeunload",flush);
  global.document.addEventListener("visibilitychange",()=>{if(global.document.hidden)flush();});
  global.setTimeout(flush,5000);
  global.setInterval(flush,30000);

  BF.saveGame=(slot=1)=>Boolean(writeSnapshot(slot));
  BF.createManualSave=(slot=1)=>Boolean(writeSnapshot(slot));
  BF.loadGame=(slot="auto")=>restoreSnapshot(slot);
  BF.getSaveSlots=()=>({auto:readSnapshot("auto"),backup:readSnapshot("backup"),1:readSnapshot(1),2:readSnapshot(2)});
  BF.getSaveDiagnostics=()=>({...diagnostics});

  const formatDate = snapshot => snapshot?.savedAt
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "short"
      }).format(new Date(snapshot.savedAt))
    : "Vide";
  const button = (label,className,onClick) => {
    const node=global.document.createElement("button");
    node.type="button";
    node.className=className||"";
    node.textContent=label;
    node.addEventListener("click",onClick);
    return node;
  };
  const closePopover = root => root.querySelector(".save-game-popover")?.remove();
  const showSaveChoices = root => {
    closePopover(root);
    const popover=global.document.createElement("div");
    popover.className="save-game-popover";
    [1,2].forEach(slot=>popover.append(button(
      `Emplacement ${slot} · ${formatDate(readSnapshot(slot))}`,
      "save-slot-button",
      ()=>{
        const saved=BF.createManualSave(slot);
        root.querySelector(".save-game-status").textContent=saved
          ? `Partie sauvegardée dans l’emplacement ${slot}.`
          : `Échec de la sauvegarde dans l’emplacement ${slot}.`;
        closePopover(root);
      }
    )));
    root.append(popover);
  };
  const showLoadChoices = root => {
    closePopover(root);
    const popover=global.document.createElement("div");
    popover.className="save-game-popover";
    [["auto","Automatique"],[1,"Emplacement 1"],[2,"Emplacement 2"]]
      .forEach(([slot,label])=>{
        const snapshot=readSnapshot(slot);
        const loadButton=button(
          `${label} · ${formatDate(snapshot)}`,
          "load-slot-button",
          ()=>BF.loadGame(slot)
        );
        loadButton.disabled=!snapshot;
        popover.append(loadButton);
      });
    root.append(popover);
  };
  const startNewGame = () => {
    clearActive();
    global.localStorage.removeItem(SLOT_KEYS.auto);
    global.localStorage.removeItem(SLOT_KEYS.backup);
    global.localStorage.removeItem(ACTIVE_SLOT_KEY);
    global.localStorage.removeItem(RESTORED_AT_KEY);
    global.localStorage.removeItem(LAST_SESSION_END_KEY);
    const startedAt=Date.now();
    global.localStorage.setItem("bluefox_new_game_start_v1",String(startedAt));
    global.localStorage.setItem("bluefox_last_start_map_v1","crystal");
    global.location.reload();
  };
  const showNewGameConfirmation = root => {
    closePopover(root);
    const popover=global.document.createElement("div");
    popover.className="save-game-popover new-game-confirmation";
    const warning=global.document.createElement("p");
    warning.textContent="Réinitialiser la progression active ? Les sauvegardes manuelles 1 et 2 seront conservées.";
    popover.append(
      warning,
      button("Annuler","new-game-cancel-button",()=>closePopover(root)),
      button("Confirmer","new-game-confirm-button",startNewGame)
    );
    root.append(popover);
  };
  const buildSaveControls = () => {
    const root=global.document.createElement("section");
    root.id=SAVE_UI_CONFIG.rootId;
    root.className="save-game-controls";
    root.dataset.saveUiVersion=SAVE_UI_CONFIG.version;
    const title=global.document.createElement("h3");
    title.textContent="SAUVEGARDE";
    const status=global.document.createElement("p");
    status.className="save-game-status";
    status.textContent="Sauvegarde automatique active · 2 emplacements manuels.";
    const actions=global.document.createElement("div");
    actions.className=SAVE_UI_CONFIG.actionClass;
    actions.append(
      button("Sauvegarder","save-game-button",()=>showSaveChoices(root)),
      button("Charger","load-game-button",()=>showLoadChoices(root)),
      button("Nouvelle partie","new-game-button",()=>showNewGameConfirmation(root))
    );
    root.append(title,status,actions);
    return root;
  };
  const hasLockedContract = root => {
    if (!root || root.dataset.saveUiVersion!==SAVE_UI_CONFIG.version) return false;
    const labels=[...root.querySelectorAll(`.${SAVE_UI_CONFIG.actionClass} > button`)]
      .map(node=>node.textContent.trim());
    return labels.length===SAVE_UI_CONFIG.actions.length &&
      SAVE_UI_CONFIG.actions.every((action,index)=>labels[index]===action.label);
  };
  const ensureSaveControls = () => {
    const target=global.document.querySelector(SAVE_UI_CONFIG.targetSelector);
    if (!target) return false;
    let root=global.document.getElementById(SAVE_UI_CONFIG.rootId);
    if (root && root.parentElement!==target) root.remove();
    root=global.document.getElementById(SAVE_UI_CONFIG.rootId);
    if (!hasLockedContract(root)) {
      root?.remove();
      root=buildSaveControls();
      target.append(root);
    }
    return true;
  };
  let mountScheduled=false;
  const scheduleSaveControls = () => {
    if (mountScheduled) return;
    mountScheduled=true;
    const run=()=>{mountScheduled=false;ensureSaveControls();};
    (global.requestAnimationFrame||global.setTimeout)(run);
  };
  const saveUiObserver=new MutationObserver(scheduleSaveControls);
  saveUiObserver.observe(global.document.documentElement,{childList:true,subtree:true});
  global.addEventListener("DOMContentLoaded",scheduleSaveControls,{once:true});
  scheduleSaveControls();
  Object.defineProperty(BF,"saveUiConfig",{
    value:SAVE_UI_CONFIG,
    writable:false,
    configurable:false,
    enumerable:true
  });
  BF.refreshSaveUI=ensureSaveControls;
  BF.getSaveUiDiagnostics=()=>Object.freeze({
    version:SAVE_UI_CONFIG.version,
    targetPresent:Boolean(global.document.querySelector(SAVE_UI_CONFIG.targetSelector)),
    controlsPresent:hasLockedContract(global.document.getElementById(SAVE_UI_CONFIG.rootId))
  });
})(window);
