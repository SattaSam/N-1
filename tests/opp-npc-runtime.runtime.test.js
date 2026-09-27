const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');
const window={BlueFox3D:{},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},addEventListener(){},removeEventListener(){},dispatchEvent(){},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},queueMicrotask(){},performance:{now:()=>0},document:null,CustomEvent:function(t,i){this.type=t;this.detail=i?.detail}};window.window=window;
const BF=window.BlueFox3D;BF.BiblePatterns={SEQUENCE_ACTIONS:{steps:[]},NARRATIVE_ONLY:{steps:[],narrativeOnly:true}};
const ctx=vm.createContext({window,console,performance:window.performance,CustomEvent:window.CustomEvent,setTimeout:window.setTimeout,clearTimeout:window.clearTimeout,setInterval:window.setInterval,clearInterval:window.clearInterval,Promise});
vm.runInContext(fs.readFileSync(path.join(root,'data','bible-catalog.js'),'utf8'),ctx);let code=fs.readFileSync(path.join(root,'engine','bible-runtime-v0-1-unified.js'),'utf8');code=code.replace(/\n\s*runtime\.start\(\);\n\}\)\(window\);\s*$/,'\n})(window);');vm.runInContext(code,ctx);const rt=BF.bibleRuntime;
const removed=[];const unregistered=[];const rootNpc=(scene,x)=>({userData:{microSceneId:scene,mapId:'map-opp'},position:{x,z:0},parent:{remove(o){removed.push(o)}}});
const decoy=rootNpc('MSC-NPC-ROCKY-001',1),target=rootNpc('MSC-CUSTOM-SHADOW-ROCKY-001',12);BF.NpcRuntime={list:type=>type==='npc_rocky'?[decoy,target]:[],unregister:o=>unregistered.push(o)};BF.currentEngine={currentMapId:'map-opp',character:{root:{position:{x:0,z:0}}}};
const entry={id:'opp-civ02-rocky',cuoType:'npc_rocky',microSceneId:'MSC-CUSTOM-SHADOW-ROCKY-001',despawnOnDistanceBelow:10};assert.equal(rt.npcEncounterRoot(entry),target,'must select PNJ from requested MSC, not nearest/same-type decoy');assert.equal(decoy.userData.bibleNpcEncounter,undefined);assert.equal(target.userData.bibleNpcEncounter,entry.id);
const facts={};const manager={memory:{getFact(k,d={}){return Object.prototype.hasOwnProperty.call(facts,k)?facts[k]:d},setFact(k,v){facts[k]=v},save(){}},trees:new Map()};rt.manager=()=>manager;rt.npcEncounterEntries=()=>[{mission:{id:'OPP-CIV-02'},entry}];
assert.equal(rt.reviewNpcEncounters(),false,'at 12m target must remain');assert.equal(removed.length,0);
target.position.x=9.99;assert.equal(rt.reviewNpcEncounters(),true,'below 10m target must despawn');assert.deepEqual(removed,[target]);assert.deepEqual(unregistered,[target]);assert.equal(facts['npcEncounter:OPP-CIV-02:opp-civ02-rocky'].despawnReason,'player-proximity');assert.equal(removed.includes(decoy),false,'decoy historical Rocky must survive');
// Backward compatibility: absent microSceneId preserves legacy type/map selection.
const legacyA=rootNpc('MSC-ANY-A',5),legacyB=rootNpc('MSC-ANY-B',6);BF.NpcRuntime.list=()=>[legacyA,legacyB];const legacy={id:'legacy',cuoType:'npc_rocky'};assert.equal(rt.npcEncounterRoot(legacy),legacyA);assert.equal(legacyA.userData.bibleNpcEncounter,'legacy');
// Strict scoped behavior: no target scene means no fallback to unrelated NPC.
BF.NpcRuntime.list=()=>[decoy];assert.equal(rt.npcEncounterRoot(entry),null);
console.log('PASS OPP NPC runtime: MSC-scoped selection + <10m despawn + no wrong-PNJ fallback + legacy selector preserved');
