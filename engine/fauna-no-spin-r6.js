(function(global){
"use strict";const BF=global.BlueFox3D=global.BlueFox3D||{};if(BF.FaunaNoSpinR6)return;
const T=new Set(["fun_creature","small_creature","brouteur","sauteur","patte_creature"]),A=new WeakMap(),R=new Set();
function add(root,type){if(!root||A.has(root)||!T.has(type))return;const f=()=>{if(!root.parent||A.has(root))return;A.set(root,{p:root.position.clone(),y:root.rotation.y,phase:Math.random()*6.28,axis:Math.random()*6.28});R.add(root);};root.parent?f():requestAnimationFrame(f);}
BF.ObjectLibrary?.registerCreateHook?.((i,c={})=>add(i?.root,c.type||i?.definition?.type||i?.root?.userData?.libraryType));
let scan=-9,start=performance.now()/1000;(function frame(){const e=performance.now()/1000-start;if(e-scan>1.5){scan=e;BF.currentEngine?.scene?.traverse?.(r=>add(r,r?.userData?.libraryType||r?.userData?.objectType||r?.userData?.kind));}
R.forEach(r=>{if(!r?.parent){R.delete(r);return;}const a=A.get(r),s=BF.FaunaRuntime?.getState?.(r)?.state;if(s==="tool_use"||s==="flee")return;const mobile=s==="forage"||s==="play",amp=mobile?(s==="play"?.32:.24):.04,spd=mobile?(s==="play"?.55:.32):.18,w=Math.sin(e*spd+a.phase);r.position.x=a.p.x+Math.cos(a.axis)*w*amp;r.position.z=a.p.z+Math.sin(a.axis)*w*amp;r.rotation.y=a.y+Math.sin(e*.22+a.phase)*.03;});requestAnimationFrame(frame);})();
BF.FaunaNoSpinR6=Object.freeze({version:"no-spin-r6"});})(window);