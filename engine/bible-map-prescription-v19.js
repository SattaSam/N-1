(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (BF.mount?.__bibleMapPrescriptionV20) return;

  const originalMount = BF.mount;
  if (typeof originalMount !== "function") return;

  const missionById = (missionId) =>
    (Array.isArray(BF.BibleCatalog) ? BF.BibleCatalog : Object.values(BF.BibleCatalog || {}))
      .find((mission) => mission?.id === missionId) || null;

  const wrapped = async function mountBibleMapPrescriptionV20(options) {
    const engine = await originalMount.call(this, options);
    const originalGenerateUnknownPassage =
      engine.generateUnknownPassage?.bind(engine);

    if (originalGenerateUnknownPassage) {
      engine.generateUnknownPassage =
        async function generateUnknownPassageWithBiblePrescription(direction, meta = {}) {
          const mission = meta?.bibleMissionId
            ? missionById(meta.bibleMissionId)
            : null;
          const prescription = mission?.mapGeneration || null;

          if (!prescription) {
            return originalGenerateUnknownPassage(direction);
          }

          BF.__pendingBibleMapGeneration = {
            missionId: mission.id,
            ...JSON.parse(JSON.stringify(prescription))
          };

          try {
            return await originalGenerateUnknownPassage(direction);
          } finally {
            BF.__pendingBibleMapGeneration = null;
          }
        };
    }

    return engine;
  };

  wrapped.__bibleMapPrescriptionV20 = true;
  BF.mount = wrapped;
})(window);
