const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function fixture() {
  const root = path.join(__dirname, "..");
  const listeners = new Map();
  const storage = new Map();
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const window = { CustomEvent, console, performance, setTimeout, clearTimeout, setInterval, clearInterval, BlueFox3D: {},
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) },
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    dispatchEvent(event) { for (const listener of [...(listeners.get(event.type) || [])]) listener(event); return true; }
  };
  const context = vm.createContext({ window, console, CustomEvent, performance, setTimeout, clearTimeout, setInterval, clearInterval });
  const load = (file) => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  load("engine/object-library.js");
  ["engine/mission-types.js","engine/mission-tree.js","engine/mission-memory.js","engine/mission-planner.js","engine/action-bridge.js","engine/mission-manager.js","engine/mission-empty-core.js","engine/mission-catalog.js","engine/object-event-registry.js","engine/bible-contract-v0-1.js","data/bible-patterns.js","data/bible-catalog.js","engine/bible-runtime-v0-1-unified.js"].forEach(load);
  window.BlueFox3D.mount = async (options) => options.engine;
  load("engine/object-m0-bridge.js");
  return { window, storage };
}
function game(window) {
  const BF = window.BlueFox3D;
  const position = (distance = 0) => ({x:distance,y:0,z:0,distanceTo(other){return Math.hypot(this.x-Number(other?.x||0),this.y-Number(other?.y||0),this.z-Number(other?.z||0));}});
  const rootPosition=position(0);
  const character={root:{position:rootPosition},target:rootPosition,stop(){},setTarget(){return true;},facePoint(){},cancelInteraction(){},findAvailableClip(){return "";},actions:new Map(),play(){},playInteraction(){return 0;},currentAnimation:""};
  const engine={callbacks:{onAction(){},onStatus(){},onCollect(){},onSpeak(){}},currentMapId:"crystal",currentZoneIndex:0,currentMap:{interactables:[],zoneRegions:[],gates:[]},character,discoveredZones:new Set(),pendingInteraction:null,currentRoutine:null,pendingGate:null,pendingZoneExploration:null,transitioning:false,resourceCooldowns:new WeakMap(),disposed:false,interactionWorldPosition(object){return object.position;},targetInteraction(object){this.lastMissionTarget=object;this.pendingInteraction=object;return true;}};
  const manager=BF.Missions.MissionManager.create({engine}); engine.missionManager=manager; BF.currentEngine=engine; BF.getMissionState=()=>manager.getState(); BF.startMission=(id,options)=>manager.startMission(id,options); return {BF,engine,manager,position};
}
function mission(overrides={}) { return {id:"FUTURE-INTERACTION",title:"Mission d'intégration future",pattern:"OBSERVE_TARGET",trigger:{type:"interaction.observe",count:1,subject:"flora"},slots:{study:{title:"Observer une cible",target:1,params:{subject:"flora"}}},...overrides}; }

test("le contrat des fiches exige une relation déclencheur-cible explicite",()=>{const {window}=fixture();const BF=window.BlueFox3D;const validate=(definition)=>BF.BibleContractV01.validateMission(definition,BF.BiblePatterns);const ambiguous=validate(mission());assert.equal(ambiguous.ok,false);assert.ok(ambiguous.errors.some((error)=>error.includes("triggerOnly")&&error.includes("targetBinding")));assert.equal(validate(mission({triggerOnly:true})).ok,true);assert.equal(validate(mission({targetBinding:"definition"})).ok,true);assert.equal(validate(mission({targetBinding:"instance"})).ok,true);const contradictory=validate(mission({triggerOnly:true,targetBinding:"definition"}));assert.equal(contradictory.ok,false);const manual=validate(mission({trigger:{type:"manual",count:1}}));assert.equal(manual.ok,true);});

test("l'IMI contractualise la génération industrielle avant le runtime",()=>{const imi=fs.readFileSync(path.join(__dirname,"..","docs","IMI — CONTRAT IA D'INTÉGRATION DES MISSIONS.txt"),"utf8");assert.match(imi,/la fiche missionnelle déclare l’intention/);assert.match(imi,/contrat strict des fiches\/patrons doit refuser/);assert.match(imi,/déclarer exactement une\s+relation/);assert.match(imi,/interdit de\s+remplacer une absence par targetBinding: "definition"/);});

test("les fiches cumulatives actuelles déclarent REVEAL-ONLY",()=>{const {window}=fixture();const catalog=window.BlueFox3D.BibleCatalog;for(const id of ["SUR-03","COL-PLANT-20","COL-FIBER-20"]){const definition=catalog.find((entry)=>entry.id===id);assert.ok(definition,id);assert.equal(definition.triggerOnly,true,id);assert.equal(definition.targetBinding,undefined,id);}});

test("SUR-03 révèle sans lier puis ObjectM0 sélectionne une autre définition",async()=>{const {window}=fixture();const {BF,engine,manager,position}=game(window);const firstDefinition=BF.ObjectLibrary.get("fern");const secondDefinition=BF.ObjectLibrary.get("luminescent_tree");const first={position:position(1),userData:{active:true,functional:firstDefinition,instanceId:"flora-first"}};const second={position:position(2),userData:{active:true,functional:secondDefinition,instanceId:"flora-second"}};first.userData.worldAnchor=first;second.userData.worldAnchor=second;engine.currentMap.interactables=[first,second];await BF.mount({engine});const sur03=BF.BibleCatalog.find((entry)=>entry.id==="SUR-03");assert.equal(BF.bibleRuntime.activateMission(sur03,{type:"interaction.observe",mapId:"crystal",instanceId:"flora-first",objectId:firstDefinition.id,cuoType:firstDefinition.type,subject:"flora"}),true);assert.equal(manager.memory.getFact("bibleTarget:SUR-03","missing"),null);const tree=manager.trees.get("SUR-03");const study=tree.find("SUR-03:studyPlants");assert.equal(study.incrementDistinct(firstDefinition.id.toLowerCase(),1),true);tree.refresh();manager.memory.saveTree(tree);manager.retryAfter=0;manager.lastPlanAt=0;assert.equal(manager.update(10000),true);assert.equal(engine.lastMissionTarget,second);assert.equal(second.userData.missionId,"SUR-03");assert.equal(second.userData.missionNarrativeVerb,"analyze");});

test("le runtime conserve SAME-DEFINITION et SAME-INSTANCE explicites",()=>{const {window}=fixture();const {BF,manager}=game(window);const event={type:"interaction.observe",instanceId:"explicit-instance",objectId:"DOC-NAT-TREE-L-002",cuoType:"crystalline_tree",subject:"flora"};for(const binding of ["definition","instance"]){const id=`FUTURE-SAME-${binding.toUpperCase()}`;const definition=mission({id,targetBinding:binding});assert.equal(BF.bibleRuntime.activateMission(definition,event),true);assert.deepEqual(JSON.parse(JSON.stringify(manager.memory.getFact(`bibleTarget:${id}`))),{binding,instanceId:"explicit-instance",objectId:"DOC-NAT-TREE-L-002",cuoType:"crystalline_tree"});}});

test("la reprise initiale ne migre pas les bibleTarget persistés",()=>{const {window}=fixture();const {BF,manager}=game(window);const sur03=BF.BibleCatalog.find((entry)=>entry.id==="SUR-03");assert.equal(BF.bibleRuntime.activateMission(sur03,{type:"interaction.observe",instanceId:"legacy-instance",objectId:"DOC-NAT-TREE-L-002",cuoType:"crystalline_tree",subject:"flora"}),true);const persistedBinding={binding:"definition",instanceId:"legacy-instance",objectId:"DOC-NAT-TREE-L-002",cuoType:"crystalline_tree",mapId:"crystal"};manager.memory.setFact("bibleTarget:SUR-03",persistedBinding);manager.memory.save?.();BF.bibleRuntime.activateInitialMissions();assert.deepEqual(manager.memory.getFact("bibleTarget:SUR-03"),persistedBinding);});
