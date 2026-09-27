const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root='/mnt/data/terr_work/CANDIDAT';
const catalogPath='/mnt/data/terr_work/CANDIDAT/data/bible-catalog.js';
const runtimePath=path.join(root,'engine/bible-runtime-v0-1-unified.js');
const window={BlueFox3D:{},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},addEventListener(){},removeEventListener(){},dispatchEvent(){},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},performance:{now:()=>0},document:null,CustomEvent:function(t,i){this.type=t;this.detail=i?.detail}};window.window=window;
const BF=window.BlueFox3D;
BF.BiblePatterns={SEQUENCE_ACTIONS:{autonomyAxis:'research'},TRAVEL_CYCLE:{autonomyAxis:'exploration'},EXPLORE_SCOPE:{autonomyAxis:'exploration'},OBSERVE_TARGET:{autonomyAxis:'research'},COLLECT_THEN_REWARD:{autonomyAxis:'collection'},DISCOVER_THEN_ANALYZE:{autonomyAxis:'research'}};
const ctx=vm.createContext({window,console,performance:window.performance,CustomEvent:window.CustomEvent,setTimeout:window.setTimeout,clearTimeout:window.clearTimeout,setInterval:window.setInterval,clearInterval:window.clearInterval});
vm.runInContext(fs.readFileSync(catalogPath,'utf8'),ctx,{filename:catalogPath});
const tp8=BF.BibleCatalog.find(m=>m.id==='TP-08');assert(tp8,'TP-08 absente');
assert.equal(tp8.trigger.type,'progression.mission_completed');assert.equal(tp8.trigger.missionId,'TP-07');
assert.deepStrictEqual(Array.from(tp8.prerequisites),['TP-07']);
const bySlot=Object.fromEntries(tp8.sequence.map(s=>[s.slot,s]));
assert(bySlot.returnHub&&bySlot.placeAnchor,'slots TP-08 incomplets');
assert.equal(bySlot.returnHub.params.targetMapFact,'tp07:hubSite');
assert.equal(bySlot.returnHub.params.targetMapField,'mapId');
assert.equal(bySlot.placeAnchor.params.catalogManaged,true);
const spec=tp8.persistentWorldScenes?.[0];assert(spec,'persistentWorldScenes absent');
assert.equal(spec.requiredMapFact,'tp07:hubSite');assert.equal(spec.requiredMapField,'mapId');
assert.equal(spec.microSceneId,'MSC-CUSTOM-ASTROLOGY');assert.equal(spec.placement.mode,'player');assert.equal(spec.spawnOnce,true);assert.equal(spec.persistent,true);assert.equal(spec.progressSlotWhenResolved,'placeAnchor');

BF.ObjectEvents={types:{}};BF.ObjectLibrary={list:()=>[]};BF.getProgressionState=()=>({counters:{global:{}}});BF.maps={hub:{id:'hub'}};
const records=[];
BF.PersistentMicroScenes={
 list(def){return records.filter(r=>!r.mapId||r.mapId===def.id)},
 ensure(def,s){let r=records.find(x=>x.instanceId===s.instanceId);if(!r){r={...s};records.push(r)}else Object.assign(r,s);return r},
 spawnRecord(THREE,built,def,s){records.push({...s,resolvedAt:Date.now()});return true}
};
let runtime=fs.readFileSync(runtimePath,'utf8');
runtime=runtime.replace(/\n\s*runtime\.start\(\);\n\}\)\(window\);\s*$/,'\n})(window);');
vm.runInContext(runtime,ctx,{filename:runtimePath});
const rt=BF.bibleRuntime;assert(rt,'BibleRuntime absent');
assert(rt.compileMission(tp8),'TP-08 ne compile pas');
rt.catalog=[tp8];rt.byId=new Map([[tp8.id,tp8]]);
let returnComplete=false,placeComplete=false,placeProgress=0;
const nodes={returnHub:{isComplete:false},placeAnchor:{isComplete:false}};
const tree={find(id){const slot=String(id).split(':').pop();return nodes[slot]||null}};
const facts={'tp07:hubSite':{mapId:'hub'}};
const memory={state:{missionLifecycle:{'TP-08':{status:'active'}}},getFact(k,f=null){return facts[k]??f},setFact(k,v){facts[k]=v},save(){},saveTree(){}};
const manager={memory,trees:new Map([['TP-08',tree]]),publish(){},syncLifecycleFromTrees(){}};
BF.currentEngine={currentMapId:'hub',currentMap:{},THREE:{},missionManager:manager};
rt.manager=()=>manager;rt.missionLifecycle=id=>({active:id==='TP-08'});
rt.progressRuntimeValidationSlot=(id,slot)=>{if(id==='TP-08'&&slot==='placeAnchor'&&!placeComplete){placeProgress++;placeComplete=true;nodes.placeAnchor.isComplete=true;return true}return false};
let placementSpec=null,placementCalls=0;
rt.beginMicroScenePlacement=s=>{placementSpec=s;placementCalls++;return true};

// 1. Pas de placement avant le retour au hub.
assert.equal(rt.reconcilePersistentWorldScenes(),false);assert.equal(placementCalls,0,'placement déclenché avant returnHub');assert.equal(records.length,0,'auto-spawn avant returnHub');
// 2. Une fois revenu, proposer le placement joueur mais ne rien spawner tout seul.
nodes.returnHub.isComplete=true;
assert.equal(rt.reconcilePersistentWorldScenes(),false);assert.equal(placementCalls,1,'placement joueur non proposé');assert(placementSpec,'spec placement absente');assert.equal(placementSpec.mapId,'hub');assert.equal(placementSpec.microSceneId,'MSC-CUSTOM-ASTROLOGY');assert.equal(records.length,0,'auto-spawn interdit avant confirmation joueur');
// 3. Confirmation joueur -> scène persistante à l'ancre choisie.
assert.equal(placementSpec.onInstall({anchor:{x:3,y:0,z:4},rotation:[0,1.2,0]}),true,'installation joueur échoue');
assert(records.length>=1,'aucun record persistant créé');
const rec=records[0];assert.equal(rec.instanceId,'TP-08:teleporter-anchor:primary');assert.equal(rec.mapId,'hub');assert.equal(rec.anchor.x,3);assert.equal(rec.anchor.z,4);assert.equal(rec.fixedAnchor,true);assert.equal(rec.contextRole,'teleporter_anchor');
// 4. Reconcile après résolution crédite le slot une seule fois.
rt.reconcilePersistentWorldScenes();assert.equal(placeProgress,1,'placeAnchor non crédité');
rt.reconcilePersistentWorldScenes();assert.equal(placeProgress,1,'placeAnchor crédité plusieurs fois');
assert(facts['persistentWorldSceneProgress:TP-08:placeAnchor:TP-08:teleporter-anchor:primary'],'receipt de progression absent');
// 5. Pas de nouvelle demande de placement après persistance.
assert.equal(placementCalls,1,'spawnOnce/player placement reproposé après persistance');
console.log('PASS TP-08 functional precheck: compile + gated player placement + persistence + one-shot progress');
