(function(global){
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{};
const VERSION="MSC-SAVES-r10-direct";
if(BF.CustomMicroScenesRuntime?.version===VERSION)return;
const source=Array.isArray(global.BlueFoxCustomMicroScenes)
 ? global.BlueFoxCustomMicroScenes
 : [];
const loaded=source.map(scene=>BF.MicroScenes?.get?.(scene.id)).filter(Boolean);
const failed=source
 .filter(scene=>!BF.MicroScenes?.get?.(scene.id))
 .map(scene=>Object.freeze({id:scene.id,error:"absente du registre MicroScenes"}));
BF.CustomMicroScenes=Object.freeze(loaded);
BF.CustomMicroScenesRuntime=Object.freeze({
 version:VERSION,
 expected:source.length,
 loaded:loaded.length,
 failed:Object.freeze(failed),
 objects:loaded.reduce((total,scene)=>total+(scene.objects?.length||0),0),
 transformMode:"direct",
 modifiesTransforms:false
});
if(failed.length){
 console.error("[MSC R10 direct] Scènes non enregistrées",BF.CustomMicroScenesRuntime);
}else{
 console.info(`[MSC R10 direct] ${loaded.length}/${source.length} scènes canoniques, transformations sources inchangées.`);
}
global.dispatchEvent?.(new CustomEvent("bluefox:custom-micro-scenes-ready",{detail:BF.CustomMicroScenesRuntime}));
})(window);
