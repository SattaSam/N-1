(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};

  /*
   * Réservé aux futurs lots Exploration.
   * La mission test BIBLE-V01-RECONNAISSANCE et la mission passive
   * BIBLE-V01-EXPLORE-3-MAPS ont été retirées de la base active.
   */
  const existing = Array.isArray(BF.BibleCatalog)
    ? BF.BibleCatalog
    : Object.values(BF.BibleCatalog || {});
  BF.BibleCatalog = Object.freeze([...existing]);
})(window);
