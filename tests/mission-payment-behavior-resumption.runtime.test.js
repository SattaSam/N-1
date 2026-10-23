const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');process.env.BLUEFOX_ROOT=ROOT;
const fixtureSource=fs.readFileSync(path.join(ROOT,'tests/mission-eligibility-stock-fauna.runtime.test.js'),'utf8');
const {H,F}=new Function('require','__dirname',fixtureSource.slice(0,fixtureSource.indexOf('\nfor(const id'))+'\nreturn {H,F};')(require,path.join(ROOT,'tests'));
function start(f,id){const m=H.catalog.find(m=>m.id===id);for(const k of m.experimentalPrerequisites||[])f.memory.state.researchUnlocks[k]={id:k,unlockedAt:1};for(const k of m.requiredFacts||[])if(typeof k==='string')f.memory.setFact(k,true);return {m,t:H.start(f,id)};}
function fund(f,m,bucket='bag'){for(const c of m.effects.filter(e=>e.type==='inventory.consume')){const keys=f.runtime.inventoryKeysForRequirement(c);(bucket==='camp'?f.BF.grantCampStorage:f.BF.grantInventory)(keys[0],c.quantity);}}
const repair=fs.readFileSync(path.join(ROOT,'tests/mission-repair.runtime.test.js'),'utf8');
const seedLine="const seed = process.env.BLUEFOX_SAVE ? JSON.parse(fs.readFileSync(process.env.BLUEFOX_SAVE, 'utf8')).state : {};";
assert(repair.includes(seedLine));
const reload=new Function('require','__dirname','seedState',repair.slice(0,repair.indexOf("\ntest('")).replace(seedLine,'const seed = seedState;')+'\nreturn fixture();');
for(const id of ['GAME-engineering_1','GAME-engineering_3','ENE-09','TP-10'])test(`${id}: durable debit resumes after reload without replenishment`,async()=>{
 const f=await H.live(),m=H.catalog.find(m=>m.id===id);fund(f,m);const consume=f.BF.consumeInventoryPoolOnce;
 f.BF.consumeInventoryPoolOnce=(...args)=>{consume(...args);throw Error('interrupted after durable debit');};
 assert.throws(()=>f.runtime.applyEffects(m),/interrupted/);
 const r=reload(require,path.join(ROOT,'tests'),Object.fromEntries(f.store));r.runtime.connect();const restored=r.BF.BibleCatalog.find(m=>m.id===id);
 assert.equal(r.runtime.applyEffects(restored),true);assert(r.memory.hasEffectReceipt(`${id}:completion:v1`));
 const consumed=JSON.stringify(r.BF.getProgressionState().consumed);assert.equal(r.runtime.applyEffects(restored),true);assert.equal(JSON.stringify(r.BF.getProgressionState().consumed),consumed);
});
test('a receipt from an earlier repeat cannot pay the next repeat',async()=>{
 const f=await H.live(),m=H.catalog.find(m=>m.id==='SURPLUS-01');fund(f,m);assert.equal(f.runtime.applyEffects(m),true);
 f.memory.state.missionLifecycle[m.id]={status:'active',repeatCount:1};assert.equal(f.runtime.applyEffects(m),false);
 fund(f,m);assert.equal(f.runtime.applyEffects(m),true);assert(f.BF.getProgressionState().transactions[`${m.id}:repeat:1:completion:v1:consume:0`]);
});
test('a conflicting partial receipt cannot bypass the current requirements',async()=>{
 const f=await H.live(),m=H.catalog.find(m=>m.id==='GAME-engineering_1');fund(f,m);
 f.BF.consumeInventoryPoolOnce(`${m.id}:completion:v1:consume:0`,['magnetic_ore'],1);
 assert.equal(f.runtime.applyEffects(m),false);
});
function complete(f,t){t.root.walk(n=>{if(n.isLeaf)f.completeNode(n)});t.refresh();}
function camp(f,mapId){const site={id:`${mapId}:camp:primary`,mapId,kind:'camp',stage:1,anchor:{x:0,y:0,z:0},interactionRadius:8,establishedAt:1};f.memory.state.siteProgression[mapId]={...site,sites:{camp:site}};f.BF.maps[mapId]={id:mapId,exits:{south:{targetMap:'crystal'}}};f.engine.discoveredMaps.add(mapId);return site;}
function world(f){
 vm.runInContext(fs.readFileSync(path.join(ROOT,'engine/world-engine.js'),'utf8').replace('  BF.mount = async function mount(options) {','  BF.__ResumptionWorld = WorldEngine;\n  BF.mount = async function mount(options) {'),f.context);
 const V=F.makeRoot('brouteur').position.constructor;V.prototype.add=function(v){return this.addScaledVector(v,1);};
 const proto=f.BF.__ResumptionWorld.prototype,THREE={Vector3:V};f.load('engine/bluefox3d-core.js');f.load('engine/path-planner.js');
 Object.assign(f.engine,{THREE,showWorldMarker(){},noteLocalAutonomousDecision(){}});f.engine.currentMap.bounds=27;f.engine.currentMap.colliders=[];
 Object.assign(f.engine.character,{speed:0,radius:.64,stopRadius:.12,colliders:[],constrainToWalkable(p){p.x=f.BF.clamp(p.x,-27,27);p.z=f.BF.clamp(p.z,-27,27);},positionOverlapsCollider(){return false;},pathPlanner:new f.BF.PathPlanner(THREE)});f.engine.character.root.position=new THREE.Vector3(3,0,0);f.engine.character.target=f.engine.character.root.position.clone();
 f.engine.character.setTarget=function(p){this.target=p.clone();return true;};f.engine.character.stop=function(){this.target=this.root.position.clone();};
 f.engine.interactionWorldPosition=o=>o.userData?.worldAnchor?.position||o.position;
 f.engine.interactionApproachNavigationActive=()=>f.engine.character.root.position.distanceTo(f.engine.character.target)>.2;
 for(const name of ['targetInteraction','missionFaunaResultTags','faunaInteractionState','isFau01CautiousInteraction','updateCautiousInteraction','interactionProfile','interactionApproachPoint','approachMissionCompletionGate','approachMissionPoint'])if(proto[name])f.engine[name]=proto[name];
 return proto;
}
for(const id of ['GAME-engineering_3','ENE-05','TP-10'])test(`${id}: inaccessible shared stock produces a known camp destination and completes at physical arrival`,async()=>{
 const f=await H.live(),{m,t}=start(f,id);complete(f,t);const site=camp(f,'known-camp');fund(f,m,'camp');
 world(f);f.BF.canAccessCampInventory=()=>f.engine.currentMapId==='known-camp'&&f.engine.character.root.position.distanceTo(new f.engine.THREE.Vector3())<=8;
 assert.equal(f.runtime.canFinalizeMission(id),false);const gate=f.runtime.completionGateState(id);
 assert.equal(gate.targetMapId,'known-camp');assert.equal(gate.resourcePickup,true);assert.equal(f.runtime.constructionResourceStatus(m).ready,false);
 const transition=f.manager.missionTransitionFor(id,f.manager.bridge.context());assert.equal(transition?.node?.params?.toMapId,'known-camp');
 assert.equal(f.runtime.withdrawCompletionResources(id),false);
 f.engine.currentMapId='known-camp';f.engine.character.root.position.set(20,0,0);f.engine.character.target.copy(f.engine.character.root.position);
 assert.equal(f.engine.approachMissionCompletionGate(id,gate),true);assert(f.engine.character.target.distanceTo(new f.engine.THREE.Vector3())<site.interactionRadius);
 f.engine.character.root.position.copy(f.engine.character.target);assert.equal(f.engine.approachMissionCompletionGate(id,gate),true);
 assert.equal(f.runtime.canFinalizeMission(id),true);assert.equal(f.runtime.constructionResourceStatus(m).ready,true);
});
test('when no camp can supply the materials, the existing collection fallback uses the accessible deficit',async()=>{
 const f=await H.live(),{m,t}=start(f,'ENE-05');complete(f,t);f.BF.canAccessCampInventory=()=>false;
 f.BF.grantCampStorage('fiber',3);f.engine.currentMap.interactables=[f.object('fiber')];
 f.runtime.canFinalizeMission(m.id);assert.equal(f.runtime.resourcePickupTarget?.(m)||null,null);
 const c=f.runtime.constructionCollectionCandidate(f.engine,10000);assert(c);assert(c.missing>0);
});
async function fauna(id,type,scene){
 const f=await H.live(),h=F.runtime({period:'night'}),a=F.makeRoot(type,0,0,scene);h.BF.FaunaRuntime.register(a,type);f.BF.FaunaRuntime=h.BF.FaunaRuntime;
 const o=f.object(type);Object.assign(o.userData,{instanceId:a.userData.instanceId,worldAnchor:a,microSceneId:scene});f.engine.currentMap.interactables=[o];
 f.memory.setFact('bibleActivation:'+id,{mapId:'crystal'});f.memory.setFact('tutorialExcursion:'+id,{generatedTargetMapId:'crystal'});
 const {m,t}=start(f,id);world(f);f.engine.__objectM0BridgePatched=false;f.BF.mount=async({engine})=>engine;f.load('engine/object-m0-bridge.js');await f.BF.mount({engine:f.engine});
 f.engine.planetClock=h.BF.currentEngine.planetClock;h.BF.currentEngine=f.engine;let cursor=0;
 const step=sec=>{f.engine.character.root.position.copy(f.engine.character.target);h.step(sec,f.engine.character.root.position.x,0);for(const e of h.events.slice(cursor))f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED,o,{...e.detail,mapId:'crystal'});cursor=h.events.length;f.engine.updateInteraction(sec*1000);};
 const select=slot=>{const n=t.find(`${id}:${slot}`),action={missionId:id,nodeId:n.id,type:n.type,params:n.params};return f.manager.executeSelectedMissionAction({missionId:id,action,primary:true},10000);};
 return {f,h,a,o,m,t,step,select,skipHistory(){cursor=h.events.length;}};
}
test('OPPFAU: two fresh observations of the same nocturnal animal run through native approach and release the owner action',async()=>{
 const {f,h,t,step,select}=await fauna('OPP-FAU-01','nocturnal_animal','MSC-CUSTOM-SHADOW-NOCTURAL');assert.equal(select('firstLook'),true);
 for(let sec=10;sec<24;sec+=.2)step(sec);assert.equal(t.find('OPP-FAU-01:firstLook').progress,1);assert.equal(f.manager.currentAction,null);
 assert.equal(t.find('OPP-FAU-01:secondLook').progress,0);assert.equal(select('secondLook'),true);
 assert(f.engine.character.target.x>5.8);for(let sec=25;sec<45;sec+=.2)step(sec);
 assert.equal(t.root.isComplete,true);assert.equal(h.events.filter(e=>e.detail.tags.includes('calm_nearby')).length,2);
});
test('OPPFAU: the same target cannot start a night observation during daytime',async()=>{
 const {f,h,t,select}=await fauna('OPP-FAU-01','nocturnal_animal','MSC-CUSTOM-SHADOW-NOCTURAL');h.setPeriod('day');assert.equal(select('firstLook'),false);assert.equal(t.find('OPP-FAU-01:firstLook').progress,0);
});
test('FAU09: a protection emitted before eligibility rearms through physical withdrawal and a fresh episode',async()=>{
 const x=await fauna('FAU-09','brouteur','MSC-CUSTOM-FUNA-PARENTAL');const {f,h,a,o,m,t,step,select}=x;
 const young=F.makeRoot('fun_creature',0,0,'MSC-CUSTOM-FUNA-PARENTAL');h.BF.FaunaRuntime.register(young,'fun_creature');
 for(let sec=.2;sec<4;sec+=.2)h.step(sec,3,0);x.skipHistory();assert.equal(h.events.filter(e=>e.detail.tags.includes('parental_protect')).length,1);
 H.stage(f,m,t,'observeProtection');assert.equal(select('observeProtection'),true);assert(f.engine.character.target.x>5.8);
 for(let sec=10;sec<24;sec+=.2)step(sec);assert.equal(t.find('FAU-09:observeProtection').progress,1);assert.equal(f.manager.currentAction,null);
 assert(h.events.filter(e=>e.detail.tags.includes('parental_protect')).length>=2);
});
const toolSource=fs.readFileSync(path.join(ROOT,'tests/fauna-fau09-10.runtime.test.js'),'utf8');
const Tool=new Function('require','__dirname',toolSource.slice(0,toolSource.indexOf("\ntest('"))+'\nreturn {runtime,root};')(require,path.join(ROOT,'tests'));
async function tools(distance){
 const f=await H.live(),h=Tool.runtime({tool:true}),a=Tool.root('brouteur',-1.55,0,'MSC-FAUNA-TOOL-USE-001'),ball=Tool.root('fauna_straw_ball',0,0,'MSC-FAUNA-TOOL-USE-001');a.parent=ball.parent=h.sceneParent;h.BF.FaunaRuntime.register(a,'brouteur');h.hooks.forEach(fn=>fn({root:ball,definition:{type:'fauna_straw_ball'}},{type:'fauna_straw_ball'}));
 const o=f.object('brouteur');Object.assign(o.userData,{...a.userData,active:true,worldAnchor:a});f.engine.currentMap.interactables=[o];h.player.position.set(distance,0,0);f.engine.character.root.position=h.player.position;
 f.memory.setFact('tutorialExcursion:FAU-10',{generatedTargetMapId:'crystal'});const {m,t}=start(f,'FAU-10');H.stage(f,m,t,'observeToolUse');let cursor=0,last=null;
 const step=sec=>{h.step(sec);for(const e of h.events.slice(cursor)){last=f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED,o,{...e.detail,mapId:'crystal'});}cursor=h.events.length;};return {f,h,a,ball,t,step,last:()=>last};
}
test('FAU10: cycles continue physically at a distance without crediting observation',async()=>{
 const {h,a,t,ball,step}=await tools(20);for(let sec=.2;sec<15;sec+=.2)step(sec);
 assert(a.position.distanceTo(ball.position)<3);assert(ball.position.distanceTo(new ball.position.constructor())>1);
 assert.equal(t.find('FAU-10:observeToolUse').progress,0);
});
test('FAU10: two complete observed cycles of the same animal count, while replaying one ObjectEvent does not',async()=>{
 const {f,h,t,step,last}=await tools(4);for(let sec=.2;sec<15;sec+=.2)step(sec);
 assert(h.events.filter(e=>e.detail.tags.includes('tool_use_cycle')).length>=2);assert.equal(t.find('FAU-10:observeToolUse').progress,2);assert.equal(t.root.isComplete,true);
 if(last())f.manager.consumeObjectEvent(last());assert.equal(t.find('FAU-10:observeToolUse').progress,2);
});
test('FAU10: approaching only at the end of a cycle does not count that whole cycle',async()=>{
 const {h,t,step}=await tools(20);step(.2);step(1);h.player.position.set(4,0,0);step(2);step(3);
 assert.equal(t.find('FAU-10:observeToolUse').progress,0);for(let sec=3.2;sec<18;sec+=.2)step(sec);assert.equal(t.find('FAU-10:observeToolUse').progress,2);
});
for(const origin of [12,-12])test(`FAU10: selected physical observation from ${origin} follows the moving animal and finishes its two cycles`,async()=>{
 const x=await tools(origin),{f,h,a,t}=x;world(f);f.engine.character.root.position.set(origin,0,0);f.engine.character.target.copy(f.engine.character.root.position);
 f.BF.FaunaRuntime=h.BF.FaunaRuntime;h.BF.currentEngine=f.engine;
 f.engine.__objectM0BridgePatched=false;f.BF.mount=async({engine})=>engine;f.load('engine/object-m0-bridge.js');await f.BF.mount({engine:f.engine});
 const controlId='CONTROL-FAUNA-INDIVIDUALS';
 f.BF.registerMissionDefinitions([{id:controlId,title:'Distinct individuals control',priority:1,
   root:{id:controlId+':root',type:'group',children:[{id:controlId+':study',type:'observe',target:2,
     params:{subject:'fauna',cuoType:'brouteur',tagsAll:['fauna_behavior','tool_use_cycle'],distinctBy:'instanceId'}}]}}]);
 f.manager.startMission(controlId,{primary:false});
 const n=t.find('FAU-10:observeToolUse'),action={missionId:t.id,nodeId:n.id,type:n.type,params:n.params};
 assert.equal(f.manager.executeSelectedMissionAction({missionId:t.id,action,primary:true},10000),true);
 for(let sec=10;sec<100&&!n.isComplete;sec+=.2){f.engine.character.root.position.copy(f.engine.character.target);x.step(sec);f.engine.updateInteraction(sec*1000);}
 assert.equal(n.progress,2);assert.equal(t.root.isComplete,true);assert.equal(f.manager.currentAction,null);
 assert.equal(f.manager.trees.get(controlId).find(controlId+':study').progress,1,
   'Owner evidence must fan out, while the individual-count contract keeps distinct instances');
});
test('overlapping mineral pools report the actual unpaid deficit and retain the existing collection fallback',async()=>{
 const f=await H.live(),{m,t}=start(f,'TP-10');complete(f,t);fund(f,m);
 f.BF.consumeInventory('magnetic_ore',70);f.BF.grantInventory('stellar_iridium',40);
 f.engine.currentMap.interactables=[f.object('magnetic_ore')];f.BF.canAccessCampInventory=()=>false;
 assert.equal(f.runtime.canFinalizeMission(m.id),false);
 const status=f.runtime.constructionResourceStatus(m);assert.equal(status.ready,false);assert.equal(status.missingTotal,30);
 const candidate=f.runtime.constructionCollectionCandidate(f.engine,10000);assert(candidate);assert.equal(candidate.missing,30);
});
test('resource pickup uses the inventory primary site even after an attached workbench becomes the latest recorded site',async()=>{
 const f=await H.live(),{m,t}=start(f,'GAME-engineering_3');complete(f,t);camp(f,'known-camp');fund(f,m,'camp');f.BF.canAccessCampInventory=()=>false;
 const site={id:'known-camp:workbench:primary',mapId:'known-camp',kind:'workbench',stage:4,anchor:{x:2,y:0,z:0},interactionRadius:8,establishedAt:2};
 assert.equal(f.runtime.storeSite(site),true);
 const gate=f.runtime.completionGateState(m.id);assert.equal(gate.shelterTarget?.siteId,site.id);assert.equal(gate.targetMapId,'known-camp');
});

test('cautious fauna approach recovers after active navigation stalls for 25 seconds', async()=>{
 const f=await H.live();world(f);const object=f.object('brouteur');let cancelled='';
 f.engine.pendingInteraction=object;
 f.engine.cautiousInteraction={object,phase:'approach',finalApproachPoint:f.engine.character.root.position.clone()};
 f.engine.faunaInteractionState=()=>({cautiousQualified:false,resetDistance:7,state:'approach'});
 f.engine.missionFaunaResultTags=()=>[];
 f.engine.interactionProfile=()=>({label:'créature',approachText:'approche'});
 f.engine.interactionApproachNavigationActive=()=>true;
 f.engine.missionManager.cancelCurrentAction=reason=>{cancelled=reason;};
 f.engine.updateCautiousInteraction(object,1000,8);
 assert.equal(f.engine.cautiousInteraction.stalledSince,1000);
 assert.equal(f.engine.updateCautiousInteraction(object,25999,8),true);
 assert.equal(f.engine.pendingInteraction,object,'do not cancel before the timeout');
 assert.equal(f.engine.updateCautiousInteraction(object,26000,8),true);
 assert.equal(f.engine.pendingInteraction,null);
 assert.equal(f.engine.cautiousInteraction,null);
 assert.equal(cancelled,'interaction-inaccessible');
});

test('cautious fauna approach timeout restarts only after real character movement', async()=>{
 const f=await H.live();world(f);const object=f.object('brouteur');let cancelled='';
 f.engine.pendingInteraction=object;
 f.engine.cautiousInteraction={object,phase:'approach',finalApproachPoint:f.engine.character.root.position.clone()};
 f.engine.faunaInteractionState=()=>({cautiousQualified:false,resetDistance:7,state:'approach'});
 f.engine.missionFaunaResultTags=()=>[];
 f.engine.interactionProfile=()=>({label:'créature',approachText:'approche'});
 f.engine.interactionApproachNavigationActive=()=>true;
 f.engine.missionManager.cancelCurrentAction=reason=>{cancelled=reason;};
 f.engine.updateCautiousInteraction(object,1000,8);
 f.engine.character.root.position.x+=1;
 f.engine.updateCautiousInteraction(object,20000,8);
 f.engine.updateCautiousInteraction(object,44000,8);
 assert.equal(f.engine.pendingInteraction,object,'a progressing approach must remain active');
 f.engine.updateCautiousInteraction(object,45000,8);
 assert.equal(f.engine.pendingInteraction,null,'recover after 25 seconds without further progress');
 assert.equal(cancelled,'interaction-inaccessible');
});

test('cautious fauna withdrawal recovers when retreat navigation remains active without moving', async()=>{
 const f=await H.live();world(f);const object=f.object('brouteur');let cancelled='';
 f.engine.pendingInteraction=object;
 f.engine.cautiousInteraction={object,phase:'withdraw',resetDistance:7};
 f.engine.faunaInteractionState=()=>({cautiousQualified:false,acceptedProximity:false,resetDistance:7,
   calmEmitted:false,cautiousEmitted:false,parentalProtectEmitted:false,state:'flee'});
 f.engine.missionFaunaResultTags=()=>[];
 f.engine.interactionProfile=()=>({label:'créature',approachText:'approche'});
 f.engine.interactionApproachNavigationActive=()=>true;
 f.engine.interactionApproachPoint=()=>({point:f.engine.character.root.position.clone()});
 f.engine.missionManager.cancelCurrentAction=reason=>{cancelled=reason;};
 f.engine.updateCautiousInteraction(object,1000,4);
 assert.equal(f.engine.updateCautiousInteraction(object,25999,4),true);
 assert.equal(f.engine.pendingInteraction,object,'le retrait garde sa chance jusqu’au délai maximal');
 assert.equal(f.engine.updateCautiousInteraction(object,26000,4),true);
 assert.equal(f.engine.pendingInteraction,null);
 assert.equal(cancelled,'interaction-inaccessible');
});
