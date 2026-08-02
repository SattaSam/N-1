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
})(window);
