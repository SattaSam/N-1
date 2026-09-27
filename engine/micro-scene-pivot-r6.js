(function(global){
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{},P=BF.ObjectSpawner?.prototype;
if(!P?.spawnMicroScene||P.__pivotR6)return;
const original=P.spawnMicroScene;
P.spawnMicroScene=function(id,options={}){
 const t=BF.MicroScenes?.get?.(id);
 if(!t?.masterR6)return original.call(this,id,options);
 const plan=BF.MicroScenes.plan(id,options.origin,options.rotation||0),scene=options.scene||this.scene,palette=options.palette||this.palette,records=[];
 plan.forEach((e,i)=>{
  const def=BF.ObjectLibrary.get(e.type);if(!def)throw new Error(`MSC ${t.id}: type CUO absent ${e.type}`);
  const inst=BF.ObjectLibrary.create(this.THREE,e.type,palette,e.variant),obj=inst.root;
  const pivot=new this.THREE.Group();pivot.name=`MSCObjectPivot:${t.id}:${i}`;
  pivot.position.set(e.position.x,e.position.y,e.position.z);
  pivot.rotation.set(e.rotationX||0,e.rotationY||0,e.rotationZ||0);
  pivot.userData.microSceneId=t.id;pivot.userData.microSceneObjectIndex=i;pivot.userData.microScenePivot=true;
  pivot.add(obj);scene?.add(pivot);
  const iid=`${def.id}:msc:${t.id}:${i}:${Date.now().toString(36)}`;
  if(obj)Object.assign(obj.userData,{instanceId:iid,variant:e.variant||0,catalogId:def.id,libraryType:e.type,functional:def,spawnSource:options.source||t.id,microSceneId:t.id,microScenePivot:pivot});
  if(inst.hitbox)Object.assign(inst.hitbox.userData,{instanceId:iid,catalogId:def.id,libraryType:e.type,variant:e.variant||0,functional:def});
  const rec={type:e.type,definition:def,instance:inst,instanceId:iid,root:obj,pivot,position:{x:e.position.x,y:e.position.y,z:e.position.z}};
  this.instances.push(rec);records.push(rec);
 });
 return records;
};
Object.defineProperty(P,"__pivotR6",{value:true});
BF.MicroScenePivotR6=Object.freeze({version:"pivot-r6"});
})(window);