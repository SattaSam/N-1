(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};

  /*
   * Bible Catalog — BASE PROPRE après validation des quatre patrons.
   *
   * Les missions de preuve BIBLE-V01-CAMP, BIBLE-V01-DISCOVERY,
   * BIBLE-V01-ARCHAEOLOGY et BIBLE-V01-RECONNAISSANCE ne sont plus
   * du contenu runtime. Les contrats, patrons, validateurs et réglages
   * du moteur missionnel restent chargés séparément.
   */
  BF.BibleCatalog = Object.freeze([]);
  BF.BibleRuntimeReference = Object.freeze({
    phase: "post-proof-of-concept",
    testMissionsRemoved: true,
    runtimePatternsPreserved: true
  });
})(window);
