(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const runtime = BF.bibleRuntime;
  if (!runtime || runtime.__triggerOnlyV19) return;

  const originalActivate = runtime.activateMission.bind(runtime);
  runtime.activateMission = function activateMissionTriggerOnlyV19(mission, event = {}) {
    const ok = originalActivate(mission, event);
    if (!ok) return ok;
    if (mission?.triggerOnly === true) {
      this.manager()?.memory?.setFact?.(`bibleTarget:${mission.id}`, null);
      this.manager()?.memory?.save?.();
    }
    return ok;
  };
  runtime.__triggerOnlyV19 = true;
})(window);
