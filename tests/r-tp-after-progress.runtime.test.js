const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const ROOT=process.env.BLUEFOX_ROOT||path.join(__dirname,'..');
const runtimePath=path.join(ROOT,'engine/bible-runtime-v0-1-unified.js');
const catalogPath=path.join(ROOT,'data/bible-catalog.js');
const window={BlueFox3D:{},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},addEventListener(){},removeEventListener(){},dispatchEvent(){},setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},queueMicrotask(){},performance:{now:()=>0},document:null,CustomEvent:function(t,i){this.type=t;this.detail=i?.detail}};window.window=window;
const BF=window.BlueFox3D;
BF.BiblePatterns={SEQUENCE_ACTIONS:{steps:[]},TRAVEL_CYCLE:{steps:[]},NARRATIVE_ONLY:{steps:[],narrativeOnly:true}};
const ctx=vm.createContext({window,console,performance:window.performance,CustomEvent:window.CustomEvent,setTimeout:window.setTimeout,clearTimeout:window.clearTimeout,setInterval:window.setInterval,clearInterval:window.clearInterval,Promise});
vm.runInContext(fs.readFileSync(catalogPath,'utf8'),ctx,{filename:catalogPath});
let runtime=fs.readFileSync(runtimePath,'utf8');runtime=runtime.replace(/\n\s*runtime\.start\(\);\n\}\)\(window\);\s*$/,'\n})(window);');
vm.runInContext(runtime,ctx,{filename:runtimePath});
const rt=BF.bibleRuntime;assert(rt,'BibleRuntime absent');assert.equal(typeof rt.reconcileMissionProgressValidations,'function','validation générique de reprise missionnelle absente');
const mission=BF.BibleCatalog.find(m=>m.id==='TP-AFTER-03');assert(mission,'TP-AFTER-03 absente');rt.catalog=[mission];rt.byId=new Map([[mission.id,mission]]);
function node(target=1){return{progress:0,target,isComplete:false,increment(n){this.progress=Math.min(this.target,this.progress+n);this.isComplete=this.progress>=this.target;return true}}}
const travel=node(),proofNode=node();
const tpTree={find(id){if(id.endsWith(':teleportToOpenMission'))return travel;if(id.endsWith(':resumeMission'))return proofNode;return null},availableLeaves(){return travel.isComplete?[proofNode]:[travel]},refresh(){}};
let oldProgress=0.1,newProgress=0;
const oldTree={root:{isComplete:false}},newTree={root:{isComplete:false}};
const facts={};let saves=0,publishes=0;
const lifecycle={'TP-AFTER-03':{status:'active'},'OPEN-MISSION':{status:'active'}};
const memory={state:{missionLifecycle:lifecycle},getFact(k,d=null){return Object.prototype.hasOwnProperty.call(facts,k)?facts[k]:d},setFact(k,v){facts[k]=v;return true},save(){saves++},saveTree(){}};
const manager={memory,activeMissionIds:['TP-AFTER-03','OPEN-MISSION'],trees:new Map([['TP-AFTER-03',tpTree],['OPEN-MISSION',oldTree]]),treeProgress(tree){return tree===oldTree?oldProgress:tree===newTree?newProgress:0},syncLifecycleFromTrees(){if(proofNode.isComplete)lifecycle['TP-AFTER-03'].status='completed'},reevaluatePendingActivations(){},catalogController:{schedule(){}},publish(){publishes++}};
BF.currentEngine={missionManager:manager,currentMapId:'hub'};rt.manager=()=>manager;
// 1) Activation : capture uniquement les missions déjà ouvertes.
assert.equal(rt.reconcileMissionProgressValidations(),true);let receipt=facts['missionProgressValidation:TP-AFTER-03:resumeMission'];assert(receipt);assert.deepEqual(Array.from(receipt.candidateMissionIds),['OPEN-MISSION']);assert.equal(receipt.armedAt,0);assert.equal(proofNode.isComplete,false);
// Une progression AVANT le transfert ne doit pas valider la reprise.
oldProgress=0.35;assert.equal(rt.reconcileMissionProgressValidations(),false);assert.equal(proofNode.isComplete,false);
// Mission ouverte après activation : elle ne doit jamais devenir candidate.
lifecycle['NEW-MISSION']={status:'active'};manager.activeMissionIds.push('NEW-MISSION');manager.trees.set('NEW-MISSION',newTree);newProgress=0.8;
// 2) Transfert réellement terminé : armer une baseline post-TP, sans crédit immédiat.
travel.progress=1;travel.isComplete=true;assert.equal(rt.reconcileMissionProgressValidations(),true);receipt=facts['missionProgressValidation:TP-AFTER-03:resumeMission'];assert(receipt.armedAt>0);assert.equal(receipt.baseline['OPEN-MISSION'],0.35);assert(!Object.prototype.hasOwnProperty.call(receipt.baseline,'NEW-MISSION'));assert.equal(proofNode.isComplete,false);
// 3) La nouvelle mission progresse fortement : toujours interdit.
newProgress=1;assert.equal(rt.reconcileMissionProgressValidations(),false);assert.equal(proofNode.isComplete,false);
// 4) Une vraie progression post-TP de la mission déjà ouverte valide exactement une fois.
oldProgress=0.5;assert.equal(rt.reconcileMissionProgressValidations(),true);assert.equal(proofNode.isComplete,true);receipt=facts['missionProgressValidation:TP-AFTER-03:resumeMission'];assert.equal(receipt.completedByMissionId,'OPEN-MISSION');assert(receipt.completedAt>0);
const published=publishes;assert.equal(rt.reconcileMissionProgressValidations(),false);assert.equal(publishes,published,'la preuve ne doit pas être recréditée');
console.log('PASS TP-AFTER runtime: already-open mission + post-teleport progress + one-shot persistence');
