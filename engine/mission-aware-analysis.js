(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const knownTypesByMap = Object.create(null);
  let runtimeEngine = null;

  const typeKey = (definition, object) => String(
    definition?.resource?.inventoryKey ||
    definition?.type ||
    object?.userData?.kind ||
    object?.userData?.objectType ||
    ""
  ).trim();

  const markKnown = (engine, definition, object) => {
    const mapId = engine?.currentMapId;
    const key = typeKey(definition, object);
    if (!mapId || !key) return false;
    knownTypesByMap[mapId] ||= {};
    knownTypesByMap[mapId][key] = true;
    return true;
  };

  const resolveDefinition = (object, detail = {}) =>
    object?.userData?.functional ||
    object?.userData?.definition ||
    BF.ObjectLibrary?.getById?.(detail.objectId) ||
    BF.ObjectLibrary?.get?.(detail.kind) ||
    BF.ObjectLibrary?.get?.(object?.userData?.kind) ||
    null;

  const installKnowledgePropagation = () => {
    if (!BF.ObjectEvents?.subscribe) return false;
    BF.ObjectEvents.subscribe((event) => {
      const accepted = new Set([
        BF.ObjectEvents.types?.OBJECT_INSPECTED,
        BF.ObjectEvents.types?.OBJECT_ANALYZED,
        BF.ObjectEvents.types?.PHENOMENON_OBSERVED
      ]);
      if (!accepted.has(event.type)) return;

      const engine = runtimeEngine || BF.currentEngine;
      if (!engine) return;
      const object = event.object || null;
      const definition = resolveDefinition(object, {
        objectId: event.objectId,
        kind: event.detail?.kind
      });
      markKnown(engine, definition, object);
    });
    return true;
  };

  const installMountHook = () => {
    if (typeof BF.mount !== "function" || BF.mount.__knowledgeBridgeWrapped) return false;
    const original = BF.mount;
    const wrapped = async function mountWithKnowledgeBridge(options) {
      const engine = await original.call(this, options);
      runtimeEngine = engine || BF.currentEngine || null;
      return engine;
    };
    wrapped.__knowledgeBridgeWrapped = true;
    BF.mount = wrapped;
    return true;
  };

  installKnowledgePropagation();
  installMountHook();

  BF.getMissionAwareAnalysisState = () => ({
    installed: true,
    version: "knowledge-only-v1",
    missionHooks: false,
    knownTypesByMap: JSON.parse(JSON.stringify(knownTypesByMap)),
    runtimeMapId: runtimeEngine?.currentMapId || BF.currentEngine?.currentMapId || null
  });
})(window);
