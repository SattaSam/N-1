import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";

const BF = window.BlueFox3D;
const library = BF?.ObjectLibrary;
if (!library) throw new Error("CUO exécutable introuvable : BlueFox3D.ObjectLibrary.");

const canvas = document.querySelector("#viewport");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06111b);
scene.fog = new THREE.Fog(0x06111b, 80, 155);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 240);
camera.position.set(0, 43, 66);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.minDistance = 6;
controls.maxDistance = 125;
controls.maxPolarAngle = Math.PI * 0.48;
controls.rotateSpeed = 0.72;
controls.panSpeed = 1.15;
controls.zoomSpeed = 1.05;
controls.screenSpacePanning = true;
controls.zoomToCursor = true;
controls.mouseButtons.LEFT = null;
controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;

scene.add(new THREE.HemisphereLight(0xbcecff, 0x172016, 2.4));
const sun = new THREE.DirectionalLight(0xffffff, 4.2);
sun.position.set(-22, 42, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -75;
sun.shadow.camera.right = 75;
sun.shadow.camera.top = 55;
sun.shadow.camera.bottom = -55;
scene.add(sun);

const PLATFORM = Object.freeze({ width: 50, depth: 44, y: 0.3 });
const PLATFORM_CENTERS = Object.freeze({ showroom: -25, sandbox: 25 });
const platforms = [];
function makePlatform(name, x, color) {
  const root = new THREE.Group();
  root.name = name;
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(PLATFORM.width, 0.6, PLATFORM.depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.02 })
  );
  slab.position.set(x, 0, 0);
  slab.receiveShadow = true;
  slab.userData.platform = name;
  root.add(slab);
  const grid = new THREE.GridHelper(PLATFORM.width, 20, 0x3a7584, 0x21404c);
  grid.position.set(x, PLATFORM.y + 0.012, 0);
  root.add(grid);
  const label = BF.makeLabel(THREE, name === "showroom" ? "CATALOGUE CUO · XL → S" : "PLATEAU TEST · GLISSER / DÉPOSER");
  label.position.set(x, 1.25, -PLATFORM.depth / 2 + 1.2);
  label.scale.set(9.5, 1.75, 1);
  root.add(label);
  scene.add(root);
  platforms.push(slab);
  return slab;
}
const showroomPlatform = makePlatform("showroom", PLATFORM_CENTERS.showroom, 0x243a42);
const sandboxPlatform = makePlatform("sandbox", PLATFORM_CENTERS.sandbox, 0x263c35);

const palette = Object.freeze({
  accent: 0x66e4ff,
  ground: 0x405664,
  sky: 0x071724,
  vegetation: 0x63c991,
  mineral: 0x8bcce7,
  ruin: 0x72808d
});
const catalog = library.list({ status: "active" });
const validation = library.validate();
const sizeRank = Object.freeze({ XL: 0, L: 1, M: 2, S: 3 });
catalog.sort((a, b) => (sizeRank[a.size] ?? 9) - (sizeRank[b.size] ?? 9) || a.label.localeCompare(b.label, "fr"));

const objectRoots = [];
let nextLabId = 1;
let selected = null;
let selectionVisual = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function groundObject(instance) {
  const box = new THREE.Box3().setFromObject(instance.root);
  if (Number.isFinite(box.min.y)) instance.root.position.y += PLATFORM.y - box.min.y;
}

function createCatalogObject(type, position, origin = "sandbox", variant = 0) {
  const instance = library.create(THREE, type, palette, variant);
  const root = instance.root;
  root.position.copy(position);
  root.userData.labId = nextLabId++;
  root.userData.labOrigin = origin;
  root.userData.labInstance = instance;
  groundObject(instance);
  scene.add(root);
  objectRoots.push(root);
  return root;
}

function populateShowroom() {
  const columns = 4;
  const xStep = 10.8;
  const zStep = 10.2;
  const startX = PLATFORM_CENTERS.showroom - ((columns - 1) * xStep) / 2;
  const rows = Math.ceil(catalog.length / columns);
  const startZ = -((rows - 1) * zStep) / 2 + 1;
  catalog.forEach((definition, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const root = createCatalogObject(
      definition.type,
      new THREE.Vector3(startX + column * xStep, PLATFORM.y, startZ + row * zStep),
      "showroom",
      index % 3
    );
    const label = BF.makeLabel(THREE, `${definition.size} · ${definition.label}`);
    const box = new THREE.Box3().setFromObject(root);
    label.position.set(0, Math.max(1.8, box.max.y - root.position.y + 1.1), 0);
    label.scale.set(5.4, 1, 1);
    label.userData.labDecoration = true;
    root.add(label);
  });
}

function renderCatalog() {
  const query = document.querySelector("#name-filter").value.trim().toLocaleLowerCase("fr");
  const category = document.querySelector("#category-filter").value;
  const size = document.querySelector("#size-filter").value;
  const matches = catalog.filter((definition) => {
    const text = `${definition.label} ${definition.type} ${definition.id}`.toLocaleLowerCase("fr");
    return (!query || text.includes(query)) && (!category || definition.category === category) && (!size || definition.size === size);
  });
  const list = document.querySelector("#catalog-list");
  list.replaceChildren(...matches.map((definition) => {
    const card = document.createElement("article");
    card.className = "catalog-card";
    card.draggable = true;
    card.dataset.type = definition.type;
    card.innerHTML = `<span class="size">${definition.size}</span><span><b>${definition.label}</b><small>${definition.type}</small></span><em>${definition.category}</em>`;
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("application/x-bluefox-cuo", definition.type);
      event.dataTransfer.effectAllowed = "copy";
    });
    return card;
  }));
}

function populateFilters() {
  const select = document.querySelector("#category-filter");
  [...new Set(catalog.map((item) => item.category))].sort().forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.append(option);
  });
  ["#name-filter", "#category-filter", "#size-filter"].forEach((selector) => {
    document.querySelector(selector).addEventListener("input", renderCatalog);
  });
}

function setPointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
}

function labRootFromObject(object) {
  let current = object;
  while (current && !current.userData.labId) current = current.parent;
  return current || null;
}

function clearSelectionVisual() {
  if (!selectionVisual) return;
  scene.remove(selectionVisual);
  selectionVisual.traverse((child) => {
    child.geometry?.dispose?.();
    child.material?.dispose?.();
  });
  selectionVisual = null;
}

function updateSelectionVisual() {
  clearSelectionVisual();
  if (!selected || !document.querySelector("#show-hitboxes").checked) return;
  const group = new THREE.Group();
  const instance = selected.userData.labInstance;
  const box = new THREE.Box3().setFromObject(selected);
  const helper = new THREE.Box3Helper(box, 0x77e8ff);
  group.add(helper);
  (instance.colliders || []).forEach((collider) => {
    const radius = collider.radius || 0.5;
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.08, 28, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffad55, wireframe: true, depthTest: false })
    );
    const offset = collider.offset || new THREE.Vector3();
    ring.position.copy(selected.localToWorld(offset.clone())).setY(PLATFORM.y + 0.12);
    group.add(ring);
  });
  if (instance.hitbox) {
    const hitboxBox = new THREE.Box3().setFromObject(instance.hitbox);
    group.add(new THREE.Box3Helper(hitboxBox, 0xff4fd8));
  }
  scene.add(group);
  selectionVisual = group;
}

function selectObject(root) {
  selected = root;
  if (!root) {
    document.querySelector("#selection-details").textContent = "Sélectionnez un objet.";
    clearSelectionVisual();
    return;
  }
  const definition = root.userData.labInstance.definition;
  const colliders = root.userData.labInstance.colliders || [];
  document.querySelector("#selection-details").innerHTML = `<b>${definition.label}</b><br>${definition.id} · ${definition.category} · taille ${definition.size}<br>Rareté : ${definition.rarity} · hitbox : ${root.userData.labInstance.hitbox ? "oui" : "non"} · collisions : ${colliders.length}`;
  updateSelectionVisual();
}

function clampToSandbox(point) {
  point.x = THREE.MathUtils.clamp(
    point.x,
    PLATFORM_CENTERS.sandbox - PLATFORM.width / 2 + 1,
    PLATFORM_CENTERS.sandbox + PLATFORM.width / 2 - 1
  );
  point.z = THREE.MathUtils.clamp(point.z, -PLATFORM.depth / 2 + 1, PLATFORM.depth / 2 - 1);
  point.y = PLATFORM.y;
  return point;
}

canvas.addEventListener("dragover", (event) => {
  if ([...event.dataTransfer.types].includes("application/x-bluefox-cuo")) event.preventDefault();
});
canvas.addEventListener("drop", (event) => {
  event.preventDefault();
  const type = event.dataTransfer.getData("application/x-bluefox-cuo");
  if (!library.exists(type)) return;
  setPointer(event.clientX, event.clientY);
  const hit = raycaster.intersectObject(sandboxPlatform, false)[0];
  if (!hit) return showToast("Déposez l’objet sur le plateau test à droite.");
  const root = createCatalogObject(type, clampToSandbox(hit.point.clone()), "sandbox", Math.floor(Math.random() * 3));
  selectObject(root);
  showToast(`${root.userData.labInstance.definition.label} ajouté.`);
});

let pointerDown = null;
canvas.addEventListener("pointerdown", (event) => {
  if (event.button === 0) pointerDown = { x: event.clientX, y: event.clientY };
  if (event.button === 2) canvas.classList.add("camera-drag");
});
canvas.addEventListener("pointerup", (event) => {
  if (event.button !== 0 || !pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) return;
  pointerDown = null;
  setPointer(event.clientX, event.clientY);
  const objectHit = raycaster.intersectObjects(objectRoots, true).find((hit) => !hit.object.userData.labDecoration);
  const root = objectHit && labRootFromObject(objectHit.object);
  if (root) return selectObject(root);
  const groundHit = raycaster.intersectObjects(platforms, false)[0];
  if (groundHit) {
    selectObject(null);
    foxTarget.copy(groundHit.point);
    foxTarget.y = PLATFORM.y;
  }
});
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
window.addEventListener("pointerup", (event) => {
  if (event.button === 2) canvas.classList.remove("camera-drag");
});

function makeFox() {
  const root = new THREE.Group();
  const blue = new THREE.MeshStandardMaterial({ color: 0x2794d2, roughness: 0.58 });
  const light = new THREE.MeshStandardMaterial({ color: 0xbdefff, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.75, 6, 12), blue);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.65;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), blue);
  head.position.set(0.58, 0.88, 0);
  const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 12), light);
  muzzle.rotation.z = -Math.PI / 2;
  muzzle.position.set(0.92, 0.82, 0);
  [-1, 1].forEach((sign) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 8), blue);
    ear.position.set(0.48, 1.25, sign * 0.22);
    root.add(ear);
  });
  root.add(body, head, muzzle);
  root.traverse((child) => { if (child.isMesh) child.castShadow = true; });
  return root;
}
const fox = makeFox();
fox.position.set(PLATFORM_CENTERS.sandbox, PLATFORM.y, 12);
scene.add(fox);
const foxTarget = fox.position.clone();
const keys = new Set();
window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (event.key === "Escape") selectObject(null);
  if ((event.key === "Delete" || event.key === "Backspace") && selected?.userData.labOrigin === "sandbox") deleteSelected();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

function deleteSelected() {
  if (!selected || selected.userData.labOrigin !== "sandbox") return showToast("Le showroom automatique est protégé.");
  const index = objectRoots.indexOf(selected);
  if (index >= 0) objectRoots.splice(index, 1);
  BF.disposeObject(selected);
  selectObject(null);
}

document.querySelector("#delete-object").addEventListener("click", deleteSelected);
document.querySelector("#rotate-left").addEventListener("click", () => rotateSelected(Math.PI / 12));
document.querySelector("#rotate-right").addEventListener("click", () => rotateSelected(-Math.PI / 12));
document.querySelector("#show-hitboxes").addEventListener("change", updateSelectionVisual);
function rotateSelected(angle) {
  if (!selected) return;
  selected.rotation.y += angle;
  updateSelectionVisual();
}

function focusPlateau(x) {
  controls.target.set(x, 0, 0);
  camera.position.set(x, 34, 48);
  controls.update();
}
document.querySelector("#focus-showroom").addEventListener("click", () => focusPlateau(PLATFORM_CENTERS.showroom));
document.querySelector("#focus-sandbox").addEventListener("click", () => focusPlateau(PLATFORM_CENTERS.sandbox));
document.querySelector("#reload-cuo").addEventListener("click", () => location.reload());

const windowElement = document.querySelector("#catalog-window");
document.querySelector("#minimize-window").addEventListener("click", () => windowElement.classList.toggle("minimized"));
document.querySelector("#maximize-window").addEventListener("click", () => {
  windowElement.classList.remove("minimized");
  windowElement.classList.toggle("maximized");
});
let windowDrag = null;
document.querySelector("#window-handle").addEventListener("pointerdown", (event) => {
  if (event.target.closest("button") || windowElement.classList.contains("maximized")) return;
  windowDrag = { x: event.clientX, y: event.clientY, left: windowElement.offsetLeft, top: windowElement.offsetTop };
  event.currentTarget.setPointerCapture(event.pointerId);
});
document.querySelector("#window-handle").addEventListener("pointermove", (event) => {
  if (!windowDrag) return;
  windowElement.style.left = `${THREE.MathUtils.clamp(windowDrag.left + event.clientX - windowDrag.x, 0, innerWidth - 80)}px`;
  windowElement.style.top = `${THREE.MathUtils.clamp(windowDrag.top + event.clientY - windowDrag.y, 0, innerHeight - 43)}px`;
});
document.querySelector("#window-handle").addEventListener("pointerup", () => { windowDrag = null; });

let toastTimer = 0;
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) || canvas.height !== Math.floor(height * renderer.getPixelRatio())) {
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const input = new THREE.Vector3(
    (keys.has("d") ? 1 : 0) - (keys.has("q") || keys.has("a") ? 1 : 0),
    0,
    (keys.has("s") ? 1 : 0) - (keys.has("z") || keys.has("w") ? 1 : 0)
  );
  if (input.lengthSq() > 0) foxTarget.addScaledVector(input.normalize(), dt * 7);
  foxTarget.x = THREE.MathUtils.clamp(
    foxTarget.x,
    PLATFORM_CENTERS.showroom - PLATFORM.width / 2 + 0.7,
    PLATFORM_CENTERS.sandbox + PLATFORM.width / 2 - 0.7
  );
  foxTarget.z = THREE.MathUtils.clamp(foxTarget.z, -21.3, 21.3);
  const direction = foxTarget.clone().sub(fox.position);
  if (direction.lengthSq() > 0.01) {
    const step = Math.min(direction.length(), dt * 4.5);
    fox.position.addScaledVector(direction.normalize(), step);
    fox.rotation.y = Math.atan2(-direction.z, direction.x);
  }
  resize();
  controls.update();
  renderer.render(scene, camera);
}

populateFilters();
renderCatalog();
populateShowroom();
document.querySelector("#catalog-status").textContent = `${catalog.length} objets exécutables · schéma CUO v${library.schemaVersion}${validation.valid ? " · valide" : ` · ${validation.errors.length} erreur(s)`}`;
if (!validation.valid) console.error("Validation CUO", validation.errors);
animate();
