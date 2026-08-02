import * as THREE from "three";
import { OrbitControls } from "../cuo-lab/vendor/OrbitControls.js";
import { GLTFLoader } from "../cuo-lab/vendor/GLTFLoader.js";

const BF = window.BlueFox3D;
const library = BF.ObjectLibrary;
if (!library || !BF.ObjectSpawner || !BF.MicroScenes) throw new Error("Modules CUO incomplets.");

const canvas = document.querySelector("#viewport");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06111b);
scene.fog = new THREE.FogExp2(0x081824, 0.0065);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 420);
camera.position.set(72, 88, 112);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.maxDistance = 290;
controls.minDistance = 8;
controls.maxPolarAngle = Math.PI * 0.49;
controls.mouseButtons.LEFT = null;
controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
scene.add(new THREE.HemisphereLight(0xbcecff, 0x101b1a, 2.6));
const sun = new THREE.DirectionalLight(0xffffff, 4.2);
sun.position.set(-34, 62, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -130; sun.shadow.camera.right = 130; sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
scene.add(sun);

const LAYOUTS = Object.freeze({
  1:[[0,0]], 2:[[0,27],[0,-27]], 3:[[-54,0],[0,0],[54,0]],
  4:[[-27,27],[27,27],[-27,-27],[27,-27]],
  5:[[-54,27],[0,27],[54,27],[-27,-27],[27,-27]],
  6:[[-54,27],[0,27],[54,27],[-54,-27],[0,-27],[54,-27]]
});
const EVOLUTION_STAGES = Object.freeze([
  Object.freeze({ id: "MSC-CUSTOM-CAMP", label: "ÉTAPE 1 · CAMP + FEU", height: 0.5 }),
  Object.freeze({ id: "MSC-CUSTOM-CAMP-BASE", label: "ÉTAPE 2 · ABRI RENFORCÉ EN BOIS", height: 1.5 }),
  Object.freeze({ id: "MSC-CUSTOM-CAMP-BASE-REINFORCED", label: "ÉTAPE 3 · CAMP DE BASE + MURS EN PIERRE", height: 2.15 })
]);
const STARTING_GROUND_URL = "../Images/01_0Crash_Crystal.png";
const CAPSULE_URL = "../assets/models/BlueFox_Capsule_Depart.glb";
const PALETTES = Object.freeze({
  volcanic:{ground:0x4c2928,accent:0xff7247}, frozen:{ground:0x718b9d,accent:0xbcefff},
  forest:{ground:0x47644f,accent:0x79f0b2}, ruins:{ground:0x4c5e58,accent:0x72e5bd},
  aquatic:{ground:0x386476,accent:0x63dcff}, desert:{ground:0x806451,accent:0xffbd75},
  crystalline:{ground:0x586b82,accent:0x75e8ff}, alien:{ground:0x5b526f,accent:0xc795ff}
});
const profileSelect = document.querySelector("#biome-profile");
Object.keys(PALETTES).forEach(profile => profileSelect.add(new Option(profile, profile)));
profileSelect.value = "forest";

const microSceneCatalog = document.querySelector("#micro-scene-catalog");
const templates = BF.MicroScenes.list().sort((a,b) => (a.name || a.id).localeCompare(b.name || b.id, "fr"));
templates.forEach(template => microSceneCatalog.add(new Option(`${template.name || template.id} · ${template.objects.length} objets`, template.id)));
let queue = [];
let mapRoot = new THREE.Group();
scene.add(mapRoot);
let plateaus = [];
let spawner = null;
let sceneInstances = [];
let selectedScene = null;
let moveMode = false;
let drag = null;
let autonomy = true;
let foxTarget = null;
let foxAction = null;
let lastAutonomy = 0;
const inventory = new Map();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();
let generatedConfig = null;
let capsuleTemplatePromise = null;

const toast = (message) => {
  const element = document.querySelector("#toast");
  element.textContent = message;
  element.classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("visible"), 2400);
};
const setState = message => document.querySelector("#fox-state").textContent = message;
const updateInventory = () => {
  document.querySelector("#inventory").textContent = inventory.size
    ? `Inventaire : ${[...inventory].map(([key,value]) => `${key} ×${value}`).join(" · ")}`
    : "Inventaire : vide";
};
const renderQueue = () => {
  document.querySelector("#scene-queue").replaceChildren(...queue.map((id,index) => {
    const item = document.createElement("li");
    const template = BF.MicroScenes.get(id);
    item.textContent = `${index + 1}. ${template?.name || template?.id || id}`;
    const remove = document.createElement("button");
    remove.textContent = "×";
    remove.addEventListener("click", () => { queue.splice(index,1); renderQueue(); });
    item.append(remove);
    return item;
  }));
};
document.querySelector("#add-scene").addEventListener("click", () => { queue.push(microSceneCatalog.value); renderQueue(); });

function makeFox() {
  const root = new THREE.Group();
  root.name = "BlueFox_Test";
  const blue = new THREE.MeshStandardMaterial({color:0x2794d2,roughness:.55});
  const white = new THREE.MeshStandardMaterial({color:0xc9f2ff,roughness:.7});
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.42,.78,6,12),blue);
  body.rotation.z = Math.PI / 2; body.position.y=.68;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.39,16,12),blue);
  head.position.set(.61,.91,0);
  const muzzle = new THREE.Mesh(new THREE.ConeGeometry(.2,.46,12),white);
  muzzle.rotation.z=-Math.PI/2; muzzle.position.set(.96,.84,0);
  [-1,1].forEach(sign => { const ear=new THREE.Mesh(new THREE.ConeGeometry(.15,.43,8),blue); ear.position.set(.5,1.29,sign*.22); root.add(ear); });
  root.add(body,head,muzzle); root.traverse(child => { if(child.isMesh) child.castShadow=true; });
  return root;
}
const fox = makeFox();
fox.position.set(0,.35,10);
scene.add(fox);

const catalogTerrains = () => (window.BLUEFOX_MAP_ASSETS?.catalog?.maps || []).flatMap(map => map.terrains || []).map(item => item.url);
function plateauTexture(index, forcedUrl = null) {
  const urls = catalogTerrains();
  const url = forcedUrl || urls[index % urls.length];
  if (!url) return null;
  const texture = new THREE.TextureLoader().load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function clearMap() {
  scene.remove(mapRoot);
  mapRoot.traverse(child => { child.geometry?.dispose?.(); if(child.material){(Array.isArray(child.material)?child.material:[child.material]).forEach(material => material.dispose?.());} });
  mapRoot = new THREE.Group(); scene.add(mapRoot);
  plateaus=[]; sceneInstances=[]; selectedScene=null; spawner=null; foxAction=null; foxTarget=null;
}
function createPlateaus(count, profile, options = {}) {
  clearMap();
  const palette = PALETTES[profile] || PALETTES.alien;
  LAYOUTS[count].forEach(([x,z],index) => {
    const material = new THREE.MeshStandardMaterial({map:plateauTexture(index, options.groundUrl),color:options.neutralGround ? 0xffffff : palette.ground,roughness:.9});
    const slab = new THREE.Mesh(new THREE.BoxGeometry(54,.65,54),material);
    slab.position.set(x,0,z); slab.receiveShadow=true; slab.userData.plateauIndex=index; mapRoot.add(slab); plateaus.push(slab);
  });
  spawner = new BF.ObjectSpawner({THREE,scene:mapRoot,palette,random:Math.random});
  if (options.populate !== false) {
    LAYOUTS[count].forEach(([x,z]) => spawner.populateBiome(profile,{bounds:{minX:x-24,maxX:x+24,minZ:z-24,maxZ:z+24,y:.35},budget:10,scene:mapRoot,palette}));
  }
  fox.position.set(LAYOUTS[count][0][0],.35,LAYOUTS[count][0][1]+10);
  controls.target.copy(fox.position);
  generatedConfig={count,profile,palette,terrainUrls:catalogTerrains().slice(0,count)};
  setState(`Map ${count} plateau${count>1?"x":""} générée · autonomie active.`);
}

function createStageLabel(text, x, z) {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 1024;
  labelCanvas.height = 128;
  const context = labelCanvas.getContext("2d");
  context.fillStyle = "rgba(3, 17, 29, 0.9)";
  context.roundRect(8, 8, 1008, 112, 26);
  context.fill();
  context.strokeStyle = "#72dff5";
  context.lineWidth = 5;
  context.stroke();
  context.fillStyle = "#e8f8ff";
  context.font = "700 42px Segoe UI, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 512, 65);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(labelCanvas), depthTest: false }));
  sprite.position.set(x, 9.5, z - 18);
  sprite.scale.set(22, 2.75, 1);
  sprite.renderOrder = 20;
  mapRoot.add(sprite);
}

async function capsuleTemplate() {
  if (!capsuleTemplatePromise) {
    capsuleTemplatePromise = new GLTFLoader().loadAsync(CAPSULE_URL).then((gltf) => gltf.scene);
  }
  return capsuleTemplatePromise;
}

async function addCapsule(x, z) {
  const source = await capsuleTemplate();
  const capsule = source.clone(true);
  capsule.name = "Capsule_Depart_Validation";
  capsule.rotation.y = Math.PI * 0.12;
  capsule.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry = child.geometry.clone();
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone();
    child.castShadow = true;
    child.receiveShadow = true;
  });
  let bounds = new THREE.Box3().setFromObject(capsule);
  const size = bounds.getSize(new THREE.Vector3());
  capsule.scale.setScalar(8 / Math.max(size.x, size.y, size.z, 0.001));
  bounds = new THREE.Box3().setFromObject(capsule);
  const center = bounds.getCenter(new THREE.Vector3());
  capsule.position.set(x - center.x, 0.35 - bounds.min.y, z - center.z);
  mapRoot.add(capsule);
  return capsule;
}

function addStage(stage, index) {
  const [cx, cz] = LAYOUTS[3][index];
  if (!BF.MicroScenes.get(stage.id)) throw new Error(`Micro-scène absente : ${stage.id}`);
  const root = new THREE.Group();
  root.position.set(cx, stage.height, cz + 8);
  root.userData.microSceneId = stage.id;
  root.userData.instanceIndex = index;
  root.userData.initial = { position: root.position.clone(), rotation: root.rotation.clone() };
  mapRoot.add(root);
  const records = spawner.spawnMicroScene(stage.id,{origin:{x:0,y:0,z:0},scene:root,force:true,source:`map-test:evolution:${stage.id}`});
  records.forEach(record => { record.root.userData.microSceneRoot = root; });
  sceneInstances.push({ id: stage.id, root, records });
  createStageLabel(stage.label, cx, cz);
}

async function createEvolutionValidationMap() {
  const button = document.querySelector("#evolution-preset");
  button.disabled = true;
  setState("Chargement des trois capsules et des étapes de construction…");
  try {
    document.querySelector("#plateau-count").value = "3";
    profileSelect.value = "crystalline";
    createPlateaus(3, "crystalline", { populate: false, groundUrl: STARTING_GROUND_URL, neutralGround: true });
    queue = EVOLUTION_STAGES.map((stage) => stage.id);
    renderQueue();
    sceneInstances = [];
    EVOLUTION_STAGES.forEach(addStage);
    await Promise.all(LAYOUTS[3].map(([x, z]) => addCapsule(x, z - 6)));
    generatedConfig.specialPreset = "starting-zone-evolution-validation";
    generatedConfig.terrainUrls = Array(3).fill("Images/01_0Crash_Crystal.png");
    controls.target.set(0, 0, 0);
    camera.position.set(75, 82, 115);
    fox.position.set(LAYOUTS[3][0][0] - 10, .35, LAYOUTS[3][0][1] + 14);
    updateTransform();
    setState("Map spéciale prête · comparez les trois étapes puis ajustez leur placement.");
    toast("Map de validation des 3 étapes chargée.");
  } catch (error) {
    console.error(error);
    setState(`Échec du préréglage : ${error.message}`);
    toast(`Échec : ${error.message}`);
  } finally {
    button.disabled = false;
  }
}
document.querySelector("#evolution-preset").addEventListener("click", createEvolutionValidationMap);
function distributeMicroScenes() {
  if (!spawner) createPlateaus(Number(document.querySelector("#plateau-count").value),profileSelect.value);
  const previousRecords = new Set(sceneInstances.flatMap(entry => entry.records));
  sceneInstances.forEach(entry => { mapRoot.remove(entry.root); });
  spawner.instances = spawner.instances.filter(record => !previousRecords.has(record));
  sceneInstances=[]; selectedScene=null;
  queue.forEach((id,index) => {
    const [cx,cz] = LAYOUTS[generatedConfig.count][index % generatedConfig.count];
    const angle = (index * 2.399) % (Math.PI*2);
    const position={x:cx+Math.cos(angle)*(6+(index%3)*5),y:.35,z:cz+Math.sin(angle)*(6+(index%3)*5)};
    const root = new THREE.Group(); root.position.set(position.x,position.y,position.z); root.userData.microSceneId=id; root.userData.instanceIndex=index;
    root.userData.initial={position:root.position.clone(),rotation:root.rotation.clone()}; mapRoot.add(root);
    const records = spawner.spawnMicroScene(id,{origin:{x:0,y:0,z:0},scene:root,force:true,source:`map-test:${id}`});
    records.forEach(record => { record.root.userData.microSceneRoot=root; });
    sceneInstances.push({id,root,records});
  });
  updateTransform();
  toast(`${sceneInstances.length} micro-scène(s) intégrée(s).`);
}
document.querySelector("#new-map").addEventListener("click", () => createPlateaus(Number(document.querySelector("#plateau-count").value),profileSelect.value));
document.querySelector("#validate-map").addEventListener("click", distributeMicroScenes);

function setPointer(event) {
  const rect=canvas.getBoundingClientRect(); pointer.x=((event.clientX-rect.left)/rect.width)*2-1; pointer.y=-((event.clientY-rect.top)/rect.height)*2+1; raycaster.setFromCamera(pointer,camera);
}
function sceneRootFrom(object) { let current=object; while(current && !current.userData.microSceneId) current=current.parent; return current || null; }
function updateTransform() {
  document.querySelector("#selection-name").textContent=selectedScene?`${selectedScene.userData.microSceneId} · instance ${selectedScene.userData.instanceIndex+1}`:"Aucune micro-scène sélectionnée";
  document.querySelectorAll(".axis[data-axis]").forEach(row => row.querySelector("output").textContent=selectedScene?`${Math.round(THREE.MathUtils.radToDeg(selectedScene.rotation[row.dataset.axis]))}°`:"0°");
  document.querySelector(".axis.height output").textContent=selectedScene?selectedScene.position.y.toFixed(2):"0.00";
}
function groundPoint(event) { setPointer(event); const hit=raycaster.intersectObjects(plateaus,false)[0]; return hit?.point || null; }
canvas.addEventListener("pointerdown", event => {
  if(event.button!==0)return; setPointer(event);
  const objectHit=raycaster.intersectObjects(sceneInstances.map(entry=>entry.root),true)[0];
  const root=objectHit&&sceneRootFrom(objectHit.object);
  if(moveMode&&root){selectedScene=root;drag={root,pointerId:event.pointerId};canvas.setPointerCapture(event.pointerId);updateTransform();return;}
  const interactive=raycaster.intersectObjects((spawner?.instances||[]).map(record=>record.instance?.hitbox||record.root).filter(Boolean),true).find(hit=>hit.object.userData.interactable);
  if(interactive){foxAction={record:(spawner?.instances||[]).find(record=>record.instance?.hitbox===interactive.object),started:0,manual:true};return;}
  const point=groundPoint(event); if(point){foxTarget=point.clone().setY(.35);foxAction=null;setState("BlueFox suit l’indication du joueur.");}
});
canvas.addEventListener("pointermove", event => { if(!drag)return; const point=groundPoint(event); if(!point)return; drag.root.position.x=point.x;drag.root.position.z=point.z;updateTransform(); });
canvas.addEventListener("pointerup", event => {if(!drag)return;canvas.releasePointerCapture(event.pointerId);drag=null;});
canvas.addEventListener("contextmenu",event=>event.preventDefault());
document.querySelector("#move-mode").addEventListener("click",event=>{moveMode=!moveMode;event.currentTarget.setAttribute("aria-pressed",String(moveMode));event.currentTarget.textContent=moveMode?"Déplacement actif":"Déplacer les micro-scènes";if(moveMode)setState("Autonomie suspendue pendant le placement.");});
document.querySelectorAll(".axis[data-axis] button").forEach(button=>button.addEventListener("click",()=>{if(!selectedScene)return;selectedScene.rotation[button.closest(".axis").dataset.axis]+=THREE.MathUtils.degToRad(Number(button.dataset.step));updateTransform();}));
document.querySelectorAll("[data-height]").forEach(button=>button.addEventListener("click",()=>{if(!selectedScene)return;selectedScene.position.y=THREE.MathUtils.clamp(selectedScene.position.y+Number(button.dataset.height),-1,18);updateTransform();}));
document.querySelector("#reset-scene").addEventListener("click",()=>{if(!selectedScene)return;selectedScene.position.copy(selectedScene.userData.initial.position);selectedScene.rotation.copy(selectedScene.userData.initial.rotation);updateTransform();});
document.querySelector("#toggle-autonomy").addEventListener("click",event=>{autonomy=!autonomy;event.currentTarget.setAttribute("aria-pressed",String(autonomy));event.currentTarget.textContent=autonomy?"Autonomie active":"Autonomie en pause";});
document.querySelector("#focus-fox").addEventListener("click",()=>{controls.target.copy(fox.position);camera.position.copy(fox.position).add(new THREE.Vector3(14,12,18));});

function chooseAutonomousAction(now) {
  if(!autonomy||moveMode||foxAction||foxTarget||now-lastAutonomy<3500||!spawner)return;
  lastAutonomy=now;
  const options=spawner.instances.filter(record=>record.root?.parent&&record.definition?.interaction?.actions?.length&&record.instance?.hitbox?.userData.active!==false);
  if(options.length&&Math.random()<.72){const record=options[Math.floor(Math.random()*options.length)];foxAction={record,started:0,manual:false};setState(`BlueFox choisit : ${record.definition.interaction.defaultAction} ${record.definition.label}.`);}
  else {const [cx,cz]=LAYOUTS[generatedConfig.count][Math.floor(Math.random()*generatedConfig.count)];foxTarget=new THREE.Vector3(cx-20+Math.random()*40,.35,cz-20+Math.random()*40);setState("BlueFox explore la map de manière autonome.");}
}
function updateFox(dt,now) {
  if(foxAction?.record?.root?.parent){const target=foxAction.record.root.getWorldPosition(new THREE.Vector3());const distance=fox.position.distanceTo(target);if(distance>1.7){foxTarget=target;}
    else {foxTarget=null;if(!foxAction.started)foxAction.started=now;const action=foxAction.record.definition.interaction.defaultAction;if(now-foxAction.started>1200){const record=foxAction.record;const definition=record.definition;setState(`${definition.label} : action ${action} terminée.`);if(definition.gameplay.collectable){const key=definition.interaction.inventoryKey||definition.resource?.inventoryKey||definition.type;inventory.set(key,(inventory.get(key)||0)+1);updateInventory();record.root.visible=false;if(record.instance?.hitbox)record.instance.hitbox.userData.active=false;setTimeout(()=>{record.root.visible=true;if(record.instance?.hitbox)record.instance.hitbox.userData.active=true;},Math.max(30000,(definition.interaction.respawnSeconds||30)*1000));}foxAction=null;lastAutonomy=now;}}}
  if(foxTarget){const delta=foxTarget.clone().sub(fox.position);const distance=delta.length();if(distance<.28){foxTarget=null;if(!foxAction)setState("BlueFox observe les environs.");}else{delta.normalize();fox.position.addScaledVector(delta,Math.min(distance,dt*(distance>14?7.2:3.8)));fox.rotation.y=Math.atan2(delta.x,delta.z)-Math.PI/2;}}
  chooseAutonomousAction(now);
}

const slug=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,42)||"map-sans-nom";
async function refreshIndex(){try{const response=await fetch("/api/custom-maps/next-index");const result=await response.json();document.querySelector("#map-index").textContent=`${String(result.number).padStart(2,"0")}-${slug(document.querySelector("#map-name").value)}`;}catch{document.querySelector("#map-index").textContent="attribué lors de la sauvegarde";}}
document.querySelector("#map-name").addEventListener("input",refreshIndex);
document.querySelector("#save-map").addEventListener("click",async()=>{const name=document.querySelector("#map-name").value.trim();if(!name)return toast("Saisissez un nom de map.");if(!generatedConfig)return toast("Générez d’abord une map.");const payload={name,slug:slug(name),plateauCount:generatedConfig.count,profile:generatedConfig.profile,palette:generatedConfig.palette,terrainUrls:generatedConfig.terrainUrls,sceneUrl:window.BLUEFOX_MAP_ASSETS?.catalog?.maps?.find(map=>map.terrains?.length)?.scene?.url||null,seed:Math.floor(Math.random()*2147483647)+1,microScenes:sceneInstances.map(entry=>({id:entry.id,position:[entry.root.position.x,entry.root.position.y,entry.root.position.z].map(value=>Number(value.toFixed(4))),rotation:[entry.root.rotation.x,entry.root.rotation.y,entry.root.rotation.z].map(value=>Number(value.toFixed(6)))}))};try{const response=await fetch("/api/custom-maps",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result.error||"Sauvegarde refusée");document.querySelector("#map-index").textContent=result.index;toast(`${result.index} sauvegardée dans le moteur.`);refreshIndex();}catch(error){toast(`Échec : ${error.message}`);}});

function resize(){const width=canvas.clientWidth,height=canvas.clientHeight;if(canvas.width!==Math.floor(width*renderer.getPixelRatio())||canvas.height!==Math.floor(height*renderer.getPixelRatio())){renderer.setSize(width,height,false);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();}}
function loop(){requestAnimationFrame(loop);const dt=Math.min(.05,clock.getDelta()),now=performance.now();resize();controls.update();updateFox(dt,now);renderer.render(scene,camera);}
createEvolutionValidationMap();refreshIndex();renderQueue();loop();
