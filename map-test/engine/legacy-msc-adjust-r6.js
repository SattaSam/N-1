(function(global){
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{};
if(BF.LegacyMSCAdjustR6)return;
/*
 * R8: compatibility shim only.
 * R6 modified historical object offsets (+1.25/+2.00) inside the catalogue.
 * This is intentionally removed: saved object transforms remain immutable.
 * Height belongs to the scene instance / surface anchoring layer.
 */
BF.LegacyMSCAdjustR6=Object.freeze({
 version:"legacy-r8-neutral",
 lifts:Object.freeze({}),
 modifiesTransforms:false
});
console.info("[BlueFox R8] Legacy MSC transforms preserved: no per-scene Y rewrite.");
})(window);
