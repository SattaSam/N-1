const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');process.env.BLUEFOX_ROOT=ROOT;
const r2=fs.readFileSync(path.join(ROOT,'tests/fauna-r2-behaviors.runtime.test.js'),'utf8');
const {runtime,makeRoot}=new Function('require','__dirname',r2.slice(0,r2.indexOf("\ntest('"))+'\nreturn {runtime,makeRoot};')(require,path.join(ROOT,'tests'));
const old=fs.readFileSync(path.join(ROOT,'tests/mission-payment-behavior-resumption.runtime.test.js'),'utf8');
const helpers=old.slice(0,old.indexOf('\nfor(const id'))+
 old.slice(old.indexOf('\nfunction complete'),old.indexOf("\nfor(const id of ['GAME-engineering_3'"))+
 old.slice(old.indexOf('\nasync function fauna'),old.indexOf("\ntest('OPPFAU"));
const {H,F,fauna,reload}=new Function('require','__dirname',helpers+'\nreturn {H,F,fauna,reload};')(require,path.join(ROOT,'tests'));
const count=(h,tag)=>h.events.filter(e=>e.detail.tags.includes(tag)).length;

for(const interruption of ['distance','movement'])test(`calm needs five continuous seconds after ${interruption}, without losing cautious acceptance`,()=>{
 const h=runtime(),a=makeRoot('brouteur');h.BF.FaunaRuntime.register(a,'brouteur');
 for(let t=.2;t<3;t+=.2)h.step(t,4.8,0);h.step(3,3,0);h.step(4,3,0);
 h.step(5,interruption==='distance'?4.8:3,1);h.step(8,interruption==='distance'?4.8:3,1);h.step(9,3,0);
 assert.equal(count(h,'calm_nearby'),0);assert.equal(h.BF.FaunaRuntime.getState(a).cautiousQualified,true);
 assert.equal(h.facts['fauna:calmEncounters:session:'+a.userData.instanceId],undefined);
 for(let t=9.2;t<14;t+=.2)h.step(t,3,0);assert.equal(count(h,'calm_nearby'),0);
 h.step(14.2,3,0);assert.equal(count(h,'calm_nearby'),1);
});

for(const condition of ['distant','hidden','ancestor-hidden','disabled','detached'])test(`peaceful multi-species proof excludes the ${condition} species`,()=>{
 const h=runtime(),scene='MSC-PEACEFUL-FAUNA-001';
 const a=makeRoot('brouteur',0,0,scene),b=makeRoot('brouteur',.5,0,scene),c=makeRoot('sauteur',condition==='distant'?20:1,0,scene);
 [a,b,c].forEach((o,i)=>{o.userData.instanceId=String(i);h.BF.FaunaRuntime.register(o,o.userData.libraryType);});
 if(condition==='hidden')c.visible=false;if(condition==='ancestor-hidden')c.parent={visible:false};if(condition==='disabled')h.BF.FaunaRuntime.setEnabled(c,false);if(condition==='detached')c.parent=null;
 for(let t=.2;t<6;t+=.2)h.step(t,5,0);assert.equal(count(h,'peaceful_group'),0);
 if(condition==='distant'){h.BF.FaunaRuntime.unregister(c);const replacement=makeRoot('sauteur',1,0,scene);replacement.userData.instanceId='2-new';h.BF.FaunaRuntime.register(replacement,'sauteur');}
 else {c.visible=true;c.parent={};h.BF.FaunaRuntime.setEnabled(c,true);}
 for(let t=6.2;t<11;t+=.2)h.step(t,5,0);assert.equal(count(h,'peaceful_group'),0);
 h.step(11.6,5,0);assert.equal(count(h,'peaceful_group'),1);
});

test('a hidden ancestor interrupts a calm observation without inventing another encounter',()=>{
 const h=runtime(),a=makeRoot('brouteur');h.BF.FaunaRuntime.register(a,'brouteur');
 for(let t=.2;t<3;t+=.2)h.step(t,4.8,0);h.step(3,3,0);h.step(4,3,0);
 a.parent.visible=false;h.step(5,3,0);h.step(8,3,0);a.parent.visible=true;h.step(9,3,0);
 assert.equal(count(h,'calm_nearby'),0);h.step(13.8,3,0);assert.equal(count(h,'calm_nearby'),0);h.step(14.2,3,0);assert.equal(count(h,'calm_nearby'),1);
});
test('changing the visible representative does not leave a spent group flag after withdrawal',()=>{
 const h=runtime(),scene='MSC-PEACEFUL-FAUNA-001',a=makeRoot('fun_creature',0,0,scene),b=makeRoot('brouteur',.5,0,scene),c=makeRoot('sauteur',1,0,scene);
 [a,b,c].forEach((o,i)=>{o.userData.instanceId=String(i);h.BF.FaunaRuntime.register(o,o.userData.libraryType);});
 for(let t=.2;t<6;t+=.2)h.step(t,5,0);assert.equal(count(h,'peaceful_group'),1);
 a.visible=false;for(let t=6.2;t<12;t+=.2)h.step(t,5,0);
 assert.equal(h.BF.FaunaRuntime.getState(b).groupObservedEmitted,true);
 h.step(12.2,14,0);assert.equal(h.BF.FaunaRuntime.getState(b).groupObservedEmitted,false);
 a.visible=true;h.step(12.4,14,0);assert.equal(h.BF.FaunaRuntime.getState(b).groupObservedEmitted,false);
});

test('a distant member of the same scene cannot force an unreachable withdrawal',()=>{
 const h=runtime(),scene='MSC-PEACEFUL-FAUNA-001',a=makeRoot('brouteur',0,0,scene),b=makeRoot('fun_creature',.5,0,scene),c=makeRoot('sauteur',20,0,scene);
 [a,b,c].forEach((o,i)=>{o.userData.instanceId=String(i);h.BF.FaunaRuntime.register(o,o.userData.libraryType);});
 for(let t=.2;t<6;t+=.2)h.step(t,5,0);assert.equal(count(h,'peaceful_group'),1);
 assert(h.BF.FaunaRuntime.getState(a).groupResetDistance<8);
});

test('losing the second visible species restarts the group duration',()=>{
 const h=runtime(),scene='MSC-PEACEFUL-FAUNA-001',a=makeRoot('brouteur',0,0,scene),b=makeRoot('brouteur',.5,0,scene),c=makeRoot('sauteur',1,0,scene);
 [a,b,c].forEach((o,i)=>{o.userData.instanceId=String(i);h.BF.FaunaRuntime.register(o,o.userData.libraryType);});
 h.step(.2,5,0);h.step(2,5,0);c.visible=false;h.step(3,5,0);h.step(6,5,0);c.visible=true;h.step(7,5,0);
 assert.equal(count(h,'peaceful_group'),0);h.step(11.8,5,0);assert.equal(count(h,'peaceful_group'),0);h.step(12.2,5,0);assert.equal(count(h,'peaceful_group'),1);
});

for(const id of ['FAU-08','FAU-12'])for(const spent of [false,true])test(`${id}: ${spent?'old':'fresh'} group observation runs physically and acknowledges a selected non-representative`,async()=>{
 const x=await fauna(id,'brouteur','MSC-PEACEFUL-FAUNA-001'),{f,h,a,o,m,t}=x;
 const other=F.makeRoot('sauteur',.2,0,'MSC-PEACEFUL-FAUNA-001');other.userData.instanceId='0-representative';h.BF.FaunaRuntime.register(other,'sauteur');
 const secondary=f.object('sauteur');Object.assign(secondary.userData,{instanceId:other.userData.instanceId,worldAnchor:other,microSceneId:'MSC-PEACEFUL-FAUNA-001'});f.engine.currentMap.interactables.push(secondary);
 f.engine.character.root.position.set(4.8,0,0);f.engine.character.target.copy(f.engine.character.root.position);
 if(spent){for(let sec=.2;sec<7;sec+=.2)h.step(sec,4.8,0);assert.equal(count(h,'peaceful_group'),1);}x.skipHistory();let cursor=h.events.length;
 const slot=id==='FAU-08'?'observeMixedGroup':'peacefulObservation';H.stage(f,m,t,slot);
 f.BF.registerMissionDefinitions([{id:'TEST-GROUP-FANOUT',root:{id:'TEST-GROUP-FANOUT:root',type:'group',children:[{id:'TEST-GROUP-FANOUT:observe',type:'observe',target:1,params:{subject:'fauna',tagsAll:['fauna_behavior','peaceful_group']}}]}}]);
 f.manager.startMission('TEST-GROUP-FANOUT',{primary:false});
 assert.equal(x.select(slot),true);if(spent)assert.equal(f.engine.cautiousInteraction?.phase,'withdraw');
 for(let sec=10;sec<34;sec+=.2){
  f.engine.character.root.position.copy(f.engine.character.target);h.step(sec,f.engine.character.root.position.x,0);
  for(const e of h.events.slice(cursor))f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED,e.source===a?o:secondary,{...e.detail,mapId:'crystal'});
  cursor=h.events.length;f.engine.updateInteraction(sec*1000);
 }
 assert.equal(t.find(`${id}:${slot}`).progress,1);assert.equal(f.manager.currentAction,null);
 assert.equal(f.manager.trees.get('TEST-GROUP-FANOUT').root.isComplete,true);
 assert.equal(count(h,'peaceful_group'),spent?2:1);
});

test('FAU-07 resumes a fresh behavior observation after its previous proof occurred while paused',async()=>{
 const x=await fauna('FAU-07','brouteur',''),{f,h,a,o,t}=x;let cursor=0;
 f.engine.character.root.position.set(4.8,0,0);f.engine.character.target.copy(f.engine.character.root.position);
 for(let sec=.2;sec<3;sec+=.2){
  h.step(sec,4.8,0);
  for(const e of h.events.slice(cursor))f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED,o,{...e.detail,mapId:'crystal'});
  cursor=h.events.length;
 }
 assert.equal(t.find('FAU-07:observationDistance').isComplete,true);
 f.manager.pauseMission('FAU-07');
 for(let sec=3;sec<9;sec+=.2){
  h.step(sec,4.8,0);
  for(const e of h.events.slice(cursor))f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED,o,{...e.detail,mapId:'crystal'});
  cursor=h.events.length;
 }
 assert.equal(count(h,'behavior_observed'),1);assert.equal(t.find('FAU-07:behavior').progress,0);
 f.manager.activateMission('FAU-07',{primary:true});x.skipHistory();
 assert.equal(x.select('behavior'),true);assert.equal(f.engine.cautiousInteraction?.phase,'withdraw');
 for(let sec=10;sec<34;sec+=.2)x.step(sec);
 assert.equal(t.find('FAU-07:behavior').progress,1);assert.equal(f.manager.currentAction,null);
 assert.equal(count(h,'behavior_observed'),2);assert.equal(a.userData.instanceId,o.userData.instanceId);
});

test('FAU-04 cautious approach, real flee and return to calm finish on the original instance',async()=>{
 const x=await fauna('FAU-04','brouteur',''),{f,h,a,o,t}=x;let cursor=0,sec=10;
 const tick=()=>{
  const c=f.engine.character,dx=c.target.x-c.root.position.x,move=Math.max(-.44,Math.min(.44,dx));
  c.root.position.x+=move;c.speed=Math.abs(move)/.2;h.step(sec,c.root.position.x,c.speed);
  for(const e of h.events.slice(cursor))f.BF.ObjectEvents.emit(f.BF.ObjectEvents.types.PHENOMENON_OBSERVED,o,{...e.detail,mapId:'crystal'});
  cursor=h.events.length;f.engine.updateInteraction(sec*1000);sec+=.2;
 };
 for(const slot of ['indifference','flee','neutrality']){
  if(t.find('FAU-04:'+slot).isComplete){
   // Le fan-out d'une preuve fraîche après la fuite peut avoir crédité le
   // retour au calme pendant la fin physique de l'action précédente.
   assert.equal(slot,'neutrality');
   const fleeAt=h.events.findIndex(e=>e.detail.tags.includes('flee'));
   assert(h.events.findIndex(e=>e.detail.tags.includes('calm_nearby'))>fleeAt);
   assert.equal(f.manager.currentAction,null);continue;
  }
  assert.equal(x.select(slot),true,slot);
  const deadline=sec+45;while((!t.find('FAU-04:'+slot).isComplete||f.engine.pendingInteraction)&&sec<deadline)tick();
  assert.equal(t.find('FAU-04:'+slot).isComplete,true,slot);assert.equal(f.manager.currentAction,null,slot);
 }
 assert.equal(t.root.isComplete,true);assert.equal(count(h,'flee'),1);assert.equal(a.userData.instanceId,o.userData.instanceId);
});

// Tous les débits de missions sans placement : chaque point d'interruption
// après un débit durable est testé, puis réellement restauré et rejoué.
for(const m of H.catalog.filter(m=>m.effects?.length&&m.effects.every(e=>e.type==='inventory.consume')))test(`${m.id}: every durable debit boundary resumes once after reload`,async()=>{
 const consumes=m.effects;
 for(let boundary=0;boundary<consumes.length;boundary++){
  const f=await H.live();for(const c of consumes)f.BF.grantInventory(f.runtime.inventoryKeysForRequirement(c)[0],c.quantity);
  const original=f.BF.consumeInventoryPoolOnce;let calls=0;
  f.BF.consumeInventoryPoolOnce=(...args)=>{const result=original(...args);if(calls++===boundary)throw Error('durable-boundary');return result;};
  assert.throws(()=>f.runtime.applyEffects(m),/durable-boundary/);
  const r=reload(require,path.join(ROOT,'tests'),Object.fromEntries(f.store));r.runtime.connect();const restored=r.BF.BibleCatalog.find(x=>x.id===m.id);
  assert.equal(r.runtime.applyEffects(restored),true);const used=JSON.stringify(r.BF.getProgressionState().consumed);
  assert.equal(r.runtime.applyEffects(restored),true);assert.equal(JSON.stringify(r.BF.getProgressionState().consumed),used);
 }
});
