(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const id = "BIBLE-V01-ARCHAEOLOGY";
  if (!Array.isArray(BF.BibleCatalog)) return;

  const index = BF.BibleCatalog.findIndex((mission) => mission?.id === id);
  if (index < 0) return;

  const current = BF.BibleCatalog[index];
  if (!current?.completionGate) return;

  const { completionGate, ...withoutGate } = current;
  const next = BF.BibleCatalog.slice();
  next[index] = Object.freeze(withoutGate);
  BF.BibleCatalog = Object.freeze(next);
})(window);
