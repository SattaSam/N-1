(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  if (BF.mount?.__missionRuntimeIntegrationV19_7) return;

  const ACQUISITION = new Set(["collect", "extract"]);

  function resolve(object) {
    if (!object) return { object:null, anchor:null, definition:null };
    const chain=[];
    let cursor=object;
    while (cursor) { chain.push(cursor); cursor=cursor.parent || null; }
    const anchor = object.userData?.worldAnchor ||
      chain.find((node)=>node.userData?.worldAnchor)?.userData.worldAnchor ||
      chain.find((node)=>node.userData?.functional || node.userData?.objectType) ||
      object;
    const nodes=[...chain,anchor].filter(Boolean);
    let definition=null;
    for (const node of nodes) {
      definition=node.userData?.functional || node.userData?.definition || null;
      if (definition) break;
    }
    if (!definition && BF.ObjectLibrary) {
      for (const node of nodes) {
        const d=node.userData || {};
        definition=BF.ObjectLibrary.getById?.(d.catalogId) ||
          BF.ObjectLibrary.get?.(d.libraryType) ||
          BF.ObjectLibrary.get?.(d.objectType) || null;
        if (definition) break;
      }
    }
    return { object, anchor, definition };
  }

  const actionsOf=(definition)=>new Set(
    (definition?.interaction?.actions || []).map((value)=>String(value || "").toLowerCase())
  );

  function clearDirective(object) {
    if (!object?.userData) return;
    object.userData.requestedInteraction=null;
    object.userData.requestedInteractionSource=null;
    object.userData.requestedMovementMode=null;
    object.userData.missionSubject=null;
    object.userData.missionNarrativeVerb=null;
    object.userData.missionNodeId=null;
    object.userData.missionId=null;
    object.userData.__missionAcquisition=null;
  }

  // Mission -> cible : pour une acquisition, ne sélectionner que les objets
  // qui déclarent explicitement la capacité demandée dans le CUO.
  const Bridge=Missions.ActionBridge;
  if (Bridge?.prototype && !Bridge.prototype.__missionAcquisitionV19_7) {
    const previous=Bridge.prototype.execute;
    Bridge.prototype.execute=function executeMissionAcquisitionV19_7(action, now) {
      const requested=String(action?.type || "").toLowerCase();
      if (!ACQUISITION.has(requested) || this.isEngineBusy()) {
        return previous.call(this, action, now);
      }

      const candidates=(this.engine.currentMap?.interactables || [])
        .filter((object)=>{
          if (!object?.userData?.active) return false;
          const {definition}=resolve(object);
          if (!definition || !actionsOf(definition).has(requested)) return false;
          const kind=definition.resource?.inventoryKey || definition.type || object.userData.kind;
          return !action.params?.kind || String(kind)===String(action.params.kind);
        })
        .sort((a,b)=>{
          const pa=a.userData?.worldAnchor?.position || a.position;
          const pb=b.userData?.worldAnchor?.position || b.position;
          return this.engine.character.root.position.distanceTo(pa)-
            this.engine.character.root.position.distanceTo(pb);
        });

      const target=candidates[0];
      if (!target) return false;
      target.userData.requestedInteraction=requested;
      target.userData.requestedInteractionSource="mission";
      target.userData.missionSubject=action.params?.subject || null;
      target.userData.missionNodeId=action.nodeId || null;
      target.userData.missionId=action.missionId || null;
      const accepted=this.engine.targetInteraction(target);
      if (accepted===false) {
        clearDirective(target);
        target.userData.lastInteractionAt=performance.now();
        return false;
      }
      return true;
    };
    Bridge.prototype.__missionAcquisitionV19_7=true;
  }

  const originalMount=BF.mount;
  if (typeof originalMount !== "function") return;

  const wrapped=async function mountMissionRuntimeV19_7(options) {
    const engine=await originalMount.call(this, options);
    if (!engine || engine.__missionRuntimeIntegrationV19_7) return engine;
    engine.__missionRuntimeIntegrationV19_7=true;

    const previousTarget=engine.targetInteraction.bind(engine);
    const previousUpdate=engine.updateInteraction.bind(engine);

    engine.targetInteraction=function targetInteractionMissionAcquisitionV19_7(object,retry=false) {
      const requested=String(object?.userData?.requestedInteraction || "").toLowerCase();
      const source=object?.userData?.requestedInteractionSource;
      if (!["mission","autonomy"].includes(source) || !ACQUISITION.has(requested)) {
        return previousTarget(object,retry);
      }

      const {definition}=resolve(object);
      if (!definition || !actionsOf(definition).has(requested)) {
        clearDirective(object);
        this.callbacks?.onStatus?.(`Mission : action « ${requested} » incompatible avec cet objet.`);
        return false;
      }

      const approach=this.interactionApproachPoint(
        object,
        retry ? this.interactionApproachAttempts : 0
      );
      object.userData.__missionAcquisition=requested;
      object.userData.approachDistance=approach.approachDistance;
      this.pendingZoneExploration=null;
      this.pendingInteraction=object;
      this.interactionStartedAt=0;
      this.interactionApproachStartedAt=performance.now();
      if (!retry) this.interactionApproachAttempts=0;
      this.character.setTarget(approach.point, object.userData.requestedMovementMode || "auto");
      this.showWorldMarker?.(approach.point);
      return true;
    };

    engine.updateInteraction=function updateInteractionMissionAcquisitionV19_7(now) {
      const object=this.pendingInteraction;
      const mode=String(object?.userData?.__missionAcquisition || "").toLowerCase();
      if (!object || !ACQUISITION.has(mode)) return previousUpdate(now);
      if (!object.userData.active) {
        this.pendingInteraction=null;
        clearDirective(object);
        return;
      }

      const {anchor,definition}=resolve(object);
      if (!definition || !actionsOf(definition).has(mode)) {
        this.pendingInteraction=null;
        clearDirective(object);
        this.missionManager?.cancelCurrentAction?.("mission-acquisition-invalid");
        return;
      }

      const distance=this.character.root.position.distanceTo(anchor.position);
      const interactionDistance=(object.userData.approachDistance || 1.36)+0.18;
      if (distance>interactionDistance) {
        if (!this.interactionStartedAt && now-this.interactionApproachStartedAt>6500) {
          this.interactionApproachAttempts+=1;
          if (this.interactionApproachAttempts<=3) this.targetInteraction(object,true);
          else {
            this.pendingInteraction=null;
            this.character.stop?.();
            clearDirective(object);
            this.missionManager?.cancelCurrentAction?.("interaction-inaccessible");
          }
        }
        return;
      }

      this.character.stop?.();
      if (!this.interactionStartedAt) {
        this.interactionStartedAt=now;
        this.character.facePoint?.(anchor.position);
        const hints=definition.interaction?.animation?.[mode] || [];
        const duration=this.character.playInteraction?.(mode,hints) || 0;
        this.interactionDuration=Math.max(900,duration*1000);
        this.callbacks?.onAction?.(
          mode==="collect"
            ? `BlueFox collecte ${(definition.label || "l’objet").toLowerCase()}.`
            : `BlueFox extrait une ressource de ${(definition.label || "l’objet").toLowerCase()}.`
        );
        return;
      }
      if (now-this.interactionStartedAt<this.interactionDuration) return;

      const state=anchor.userData.interactionState ||= {
        inspected:false, observed:false, analyzed:false, identified:false, collected:false,
        inspectionCount:0, observationCount:0, analysisCount:0, collectionCount:0
      };
      state.identified=true;
      state.collected=true;
      state.collectionCount+=1;

      const quantity=Math.max(1,Number(
        object.userData.resourceQuantity || anchor.userData.resourceQuantity ||
        definition.resource?.quantity || 1
      ));
      const inventoryKey=definition.resource?.inventoryKey || definition.type || object.userData.kind;
      for (let unit=0; unit<quantity; unit+=1) this.callbacks?.onCollect?.(inventoryKey);

      const detail={
        kind:inventoryKey,
        subject:object.userData.missionSubject || definition.knowledge?.family || definition.category || definition.type,
        missionNarrativeVerb:mode,
        missionNodeId:object.userData.missionNodeId || null,
        missionId:object.userData.missionId || null,
        mapId:this.currentMapId,
        zoneId:this.currentZoneIndex,
        amount:quantity,
        quantity,
        interactionMode:mode,
        cuoType:definition.type || null,
        interactionSource:object.userData.requestedInteractionSource || "autonomy",
        interactionState:{...state}
      };
      BF.ObjectEvents?.emit?.(
        mode==="extract" ? BF.ObjectEvents.types.RESOURCE_EXTRACTED : BF.ObjectEvents.types.RESOURCE_COLLECTED,
        object,
        {...detail,label:definition.label,inventoryKey}
      );

      const removeFromWorld=definition.interaction?.removeFromWorld ?? (definition.gameplay?.collectable===true);
      if (removeFromWorld) {
        object.userData.active=false;
        anchor.visible=false;
        const respawnSeconds=Number(definition.interaction?.respawnSeconds);
        if (Number.isFinite(respawnSeconds) && respawnSeconds>0) {
          const cooldown=setTimeout(()=>{
            if (this.disposed) return;
            anchor.visible=true;
            object.userData.active=true;
            state.collected=false;
            this.resourceCooldowns?.delete?.(object);
          },respawnSeconds*1000);
          this.resourceCooldowns?.set?.(object,cooldown);
        }
      }

      this.character.cancelInteraction?.();
      object.userData.lastInteractionAt=now;
      this.completedInteractions=(Number(this.completedInteractions)||0)+1;
      this.lastCompletedAction=`${mode}:${definition.type || ""}`;
      this.pendingInteraction=null;
      this.interactionStartedAt=0;
      this.interactionApproachStartedAt=0;
      this.interactionApproachAttempts=0;
      this.character.currentAnimation="";
      this.postActionRecoveryUntil=now+650;
      this.lastActivityAt=now;
      this.lastAutonomyAt=now-5600;
      clearDirective(object);
    };

    return engine;
  };

  wrapped.__missionRuntimeIntegrationV19_7=true;
  BF.mount=wrapped;
})(window);
