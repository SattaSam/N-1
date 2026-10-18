const fs=require('fs'),vm=require('vm'),assert=require('assert'),cp=require('child_process');
const src=fs.readFileSync(require('path').join(__dirname,'..','engine','object-m0-bridge.js'),'utf8').replace(/\}\)\(window\);\s*$/,`window.__loc11Test={loc11ProofOnMissionMap,loc11NeedsReferenceRecovery,missionEvidenceForAction,relationMatches,selectObservable,eventMatchesBoundTarget,applyObjectEventProgress,eventMatchesNode,relationEvidenceFromEvent,requiredMapMatches,requiredSiteMatchesEvent,progressNodeFromEvent};})(window);`);
const BF={ObjectEvents:{types:{OBJECT_INSPECTED:'OBJECT_INSPECTED',PHENOMENON_OBSERVED:'PHENOMENON_OBSERVED',OBJECT_ANALYZED:'OBJECT_ANALYZED',OBJECT_SEEN:'OBJECT_SEEN',RESOURCE_COLLECTED:'RESOURCE_COLLECTED',RESOURCE_EXTRACTED:'RESOURCE_EXTRACTED'}},Missions:{normalizeActionType:t=>t,ActionType:{OBSERVE:'observe',ANALYZE:'analyze',INSPECT:'inspect',COLLECT:'collect',EXTRACT:'extract'}},BibleCatalog:[],ObjectLibrary:{getById:()=>null}};
const context={window:{BlueFox3D:BF},performance:{now:()=>0},console};vm.runInNewContext(src,context);
const t=context.window.__loc11Test;
const audit=JSON.parse(fs.readFileSync(require('path').join(__dirname,'fixtures','LOC11_SAUVEGARDE_AUDIT.json'),'utf8'));
let repaired=0, valid=0, done=0;
for(const m of audit.loc11_detail){const mission=m.mission,source={id:mission+':observe',type:'observe',target:1,isComplete:m.observe===1,historyValues:m.evidence.map(e=>JSON.stringify({owner:'object-m0',evidence:e})),params:{sequenceSlot:'observe'}};const analyze={id:mission+':analyze',type:'analyze',target:1,isComplete:m.analyze===1,params:{sequenceSlot:'analyze',relation:{fromSlot:'observe',sameBy:['instanceId']},allowSameTypeOnSourceMap:true},requires:[source.id]};const tree={id:mission,find: id=>id===analyze.id?analyze:source,findSequenceSlot:slot=>slot==='observe'?source:analyze};const manager={trees:new Map([[mission,tree]]),memory:{getFact:()=>null}};const engine={missionManager:manager,currentMapId:mission.split('@')[1],currentMap:{interactables:[]}};const action={missionId:mission,nodeId:analyze.id,type:'analyze',params:analyze.params};
 const recovery=t.loc11NeedsReferenceRecovery(tree,mission);if(m.analyze===1){assert(!recovery);done++;}else if(m.map_identity_mismatch){assert(recovery,mission+' must request real observation'); assert.equal(t.missionEvidenceForAction(engine,action),null);repaired++;}else if(m.analyze===0){assert(!recovery,mission+' should preserve original evidence');assert(t.missionEvidenceForAction(engine,action),mission+' must continue from same-instance observation');valid++;}
}
assert.equal(repaired,1);assert.equal(valid,9);assert.equal(done,10);
// No cross-map aliasing, while already completed cases are never reopened.
assert.equal(t.loc11ProofOnMissionMap({mapId:'generated-5269cd00-0004',instanceId:'generated-5269cd00-0005:population:adaptive_plant:32'},'LOC-11@generated-5269cd00-0004'),false);
// Recovery must pick a real local instance, never a target from another map.
const recoveryId='LOC-11@generated-5269cd00-0004';
const prior=audit.loc11_detail.find(x=>x.mission===recoveryId);
const observation={id:recoveryId+':observe',type:'observe',target:1,isComplete:true,historyValues:prior.evidence.map(e=>JSON.stringify({owner:'object-m0',evidence:e})),params:{sequenceSlot:'observe'}};
const analysis={id:recoveryId+':analyze',type:'analyze',target:1,isComplete:false,params:{sequenceSlot:'analyze',tagsAny:['resource'],allowSameTypeOnSourceMap:true,relation:{fromSlot:'observe',sameBy:['instanceId']}},requires:[observation.id]};
const tree={id:recoveryId,find:id=>id===analysis.id?analysis:observation,findSequenceSlot:slot=>slot==='observe'?observation:analysis};
const object={userData:{active:true,instanceId:'generated-5269cd00-0004:population:adaptive_plant:12',functional:{id:'bio-adap-s-001',type:'adaptive_plant',category:'resources',interaction:{actions:['observe']},resource:{family:'biomass'},semantic:{subject:'flora'},spawn:{tags:['resource']}}}};
const manager={trees:new Map([[recoveryId,tree]]),memory:{getFact:()=>({binding:'instance',instanceId:prior.evidence[0].instanceId,mapId:'generated-5269cd00-0004'}),hasProcessedObjectEvent:()=>false,markProcessedObjectEvent:()=>{},remember:()=>{},saveTree:()=>{},save:()=>{}},ensureLifecycle:()=>({status:'active'}),publish:()=>{},syncLifecycleFromTrees:()=>{},retryAfter:0};
const engine={missionManager:manager,currentMapId:'generated-5269cd00-0004',currentMap:{interactables:[object]},character:{root:{position:{distanceTo:()=>1}}},interactionWorldPosition:()=>({})};
const action={missionId:recoveryId,nodeId:analysis.id,type:'analyze',params:analysis.params};
assert.equal(t.selectObservable(engine,action,{activatePassive:false}),object,'recovery must select eligible physical resource');
assert.equal(t.missionEvidenceForAction(engine,action),null,'incoherent old proof cannot complete analysis');
// One *real* observation may append a reference to an already completed source
// without immediately completing the analyze step.
observation.pushHistoryValue=function(v){this.historyValues.push(v);return true};
tree.root={walk:fn=>[observation,analysis].forEach(fn)};
tree.availableLeaves=()=>[analysis];tree.refresh=()=>{};
const observed={id:'loc11-observation-recovery',type:'PHENOMENON_OBSERVED',objectId:'bio-adap-s-001',instanceId:object.userData.instanceId,mapId:engine.currentMapId,quantity:1,detail:{missionId:recoveryId,missionNodeId:analysis.id,instanceId:object.userData.instanceId,cuoType:'adaptive_plant',interactionSource:'mission'}};
BF.ObjectLibrary.getById=id=>id==='bio-adap-s-001'?object.userData.functional:null;
manager.currentAction={...action,instanceId:object.userData.instanceId};
const before=observation.historyValues.length;
const result=t.applyObjectEventProgress(manager,observed);
assert.equal(observation.historyValues.length,before+1,'legitimate local observation appended, not overwritten');
assert.equal(result.changed,0,'first gesture must not falsely credit analysis');
assert.equal(manager.currentAction,null,'current action unblocked for second gesture');
assert.equal(t.loc11NeedsReferenceRecovery(tree,recoveryId),false,'reference repaired without migrating old history');
assert(t.eventMatchesBoundTarget(manager,recoveryId,observed),'source-bound observation must override stale binding for same instance');
const otherEvent={...observed,instanceId:'generated-5269cd00-0004:population:adaptive_plant:99'};
assert.equal(t.eventMatchesBoundTarget(manager,recoveryId,otherEvent),false,'different instance must not pass binding');
analysis.incrementDistinct=function(){return this.increment(1)};analysis.increment=function(n){this.progress=(this.progress||0)+n;this.isComplete=true;return true};
manager.currentAction={...action,instanceId:object.userData.instanceId};
const analyzed={...observed,id:'loc11-second-gesture',type:'OBJECT_ANALYZED'};
const second=t.applyObjectEventProgress(manager,analyzed);
assert.equal(second.changed,1,'second physical gesture should finish analyze');
assert.equal(analysis.isComplete,true);
assert.equal(observation.historyValues.length,before+1,'no extra history is fabricated by analysis');


// Independent contracts retain their existing type-bound semantics.
const independentManager={trees:new Map(),memory:{getFact:()=>({binding:'type',cuoType:'adaptive_plant'})}};
assert.equal(t.eventMatchesBoundTarget(independentManager,'ENV-OTHER@map',observed),true);
assert.equal(t.eventMatchesBoundTarget(independentManager,'ENV-OTHER@map',{...observed,detail:{cuoType:'rock'}}),false);
console.log(JSON.stringify({result:'PASS' ,observed_unanalyzed_continuable:valid,requires_real_reobservation:repaired,completed_preserved:done}));
