(function(global){
"use strict";const BF=global.BlueFox3D=global.BlueFox3D||{},p=BF.PersistentMicroScenes;if(!p?.findSafeAnchor||p.__r6)return;
const orig=p.findSafeAnchor.bind(p);
BF.PersistentMicroScenes=Object.freeze({...p,__r6:true,findSafeAnchor(built,def,radius=7,preferred=null){const hit=orig(built,def,radius,preferred);if(hit)return hit;const regions=[...(built?.walkableRegions||[])].sort((a,b)=>((b.maxX-b.minX)*(b.maxZ-b.minZ))-((a.maxX-a.minX)*(a.maxZ-a.minZ)));const r=regions[0];return r?{x:(Number(r.minX)+Number(r.maxX))/2,y:0,z:(Number(r.minZ)+Number(r.maxZ))/2}:null;}});
})(window);