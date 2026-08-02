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
camera.position.set(0, 78, 130);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.minDistance = 6;
controls.maxDistance = 210;
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

const PLATFORM = Object.freeze({ width: 96, depth: 100, y: 0.3 });
const PLATFORM_CENTERS = Object.freeze({ showroom: -48, sandbox: 48 });
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
let moveMode = false;
let objectDrag = null;
let cameraTransition = null;
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
  root.userData.labVariant = variant;
  groundObject(instance);
  root.userData.labInitialTransform = {
    position: root.position.clone(),
    rotation: root.rotation.clone()
  };
  scene.add(root);
  objectRoots.push(root);
  return root;
}

function populateShowroom() {
  const columns = 5;
  const xStep = 18;
  const zStep = 16;
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
  document.querySelector("#focus-selected").disabled = !root;
  if (!root) {
    document.querySelector("#selection-details").textContent = "Sélectionnez un objet.";
    clearSelectionVisual();
    updateTransformWindow();
    return;
  }
  const definition = root.userData.labInstance.definition;
  const colliders = root.userData.labInstance.colliders || [];
  document.querySelector("#selection-details").innerHTML = `<b>${definition.label}</b><br>${definition.id} · ${definition.category} · taille ${definition.size}<br>Rareté : ${definition.rarity} · hitbox : ${root.userData.labInstance.hitbox ? "oui" : "non"} · collisions : ${colliders.length}`;
  updateSelectionVisual();
  updateTransformWindow();
}

function updateTransformWindow() {
  const panel = document.querySelector("#transform-window");
  const editable = moveMode && selected?.userData.labOrigin === "sandbox";
  panel.hidden = !editable;
  if (!editable) return;
  document.querySelector("#transform-object-name").textContent = selected.userData.labInstance.definition.label;
  panel.querySelectorAll(".axis-control").forEach((row) => {
    const axis = row.dataset.axis;
    const degrees = Math.round(THREE.MathUtils.radToDeg(selected.rotation[axis]));
    row.querySelector("output").textContent = `${degrees}°`;
  });
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
  if (event.button === 0) {
    setPointer(event.clientX, event.clientY);
    const objectHit = raycaster.intersectObjects(objectRoots, true).find((hit) => !hit.object.userData.labDecoration);
    const root = objectHit && labRootFromObject(objectHit.object);
    if (moveMode && root?.userData.labOrigin === "sandbox") {
      selectObject(root);
      objectDrag = { root, moved: false, startX: event.clientX, startY: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("object-drag");
    } else {
      pointerDown = { x: event.clientX, y: event.clientY };
    }
  }
  if (event.button === 2) canvas.classList.add("camera-drag");
});
canvas.addEventListener("pointermove", (event) => {
  if (!objectDrag) return;
  setPointer(event.clientX, event.clientY);
  const hit = raycaster.intersectObject(sandboxPlatform, false)[0];
  if (!hit) return;
  const target = clampToSandbox(hit.point.clone());
  objectDrag.root.position.x = target.x;
  objectDrag.root.position.z = target.z;
  objectDrag.moved = objectDrag.moved || Math.hypot(event.clientX - objectDrag.startX, event.clientY - objectDrag.startY) > 3;
  updateSelectionVisual();
});
canvas.addEventListener("pointerup", (event) => {
  if (event.button === 0 && objectDrag) {
    objectDrag = null;
    canvas.releasePointerCapture(event.pointerId);
    canvas.classList.remove("object-drag");
    updateTransformWindow();
    return;
  }
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
  updateTransformWindow();
}

document.querySelectorAll(".axis-control button").forEach((button) => {
  button.addEventListener("click", () => {
    if (!selected || selected.userData.labOrigin !== "sandbox") return;
    const axis = button.closest(".axis-control").dataset.axis;
    selected.rotation[axis] += THREE.MathUtils.degToRad(Number(button.dataset.step));
    updateSelectionVisual();
    updateTransformWindow();
  });
});
document.querySelector("#reset-transform").addEventListener("click", () => {
  if (!selected?.userData.labInitialTransform) return;
  selected.position.copy(selected.userData.labInitialTransform.position);
  selected.rotation.copy(selected.userData.labInitialTransform.rotation);
  updateSelectionVisual();
  updateTransformWindow();
});

function focusOnObject(object, minimumDistance = 14) {
  if (!object) return;
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  const direction = camera.position.clone().sub(controls.target);
  if (direction.lengthSq() < 0.01) direction.set(0.55, 0.65, 1);
  direction.normalize();
  const destination = center.clone().addScaledVector(direction, Math.max(minimumDistance, size * 2.2));
  cameraTransition = { target: center, position: destination };
}

function focusPlateau(x) {
  cameraTransition = {
    target: new THREE.Vector3(x, 0, 0),
    position: new THREE.Vector3(x, 64, 92)
  };
}
document.querySelector("#focus-showroom").addEventListener("click", () => focusPlateau(PLATFORM_CENTERS.showroom));
document.querySelector("#focus-sandbox").addEventListener("click", () => focusPlateau(PLATFORM_CENTERS.sandbox));
document.querySelector("#focus-selected").addEventListener("click", () => focusOnObject(selected));
document.querySelector("#focus-fox").addEventListener("click", () => focusOnObject(fox, 16));
document.querySelector("#move-mode").addEventListener("click", (event) => {
  moveMode = !moveMode;
  event.currentTarget.setAttribute("aria-pressed", String(moveMode));
  event.currentTarget.textContent = moveMode ? "Déplacement actif" : "Déplacer les objets";
  canvas.classList.toggle("move-mode", moveMode);
  updateTransformWindow();
  showToast(moveMode ? "Mode déplacement : sélectionnez puis glissez un objet du plateau test." : "Mode déplacement désactivé.");
});
document.querySelector("#reload-cuo").addEventListener("click", () => location.reload());

const sceneDialog = document.querySelector("#micro-scene-dialog");
const sceneNameInput = document.querySelector("#micro-scene-name");
const slugSceneName = (value) => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "SANS-NOM";
const updateSceneCode = () => {
  document.querySelector("#micro-scene-code").textContent = `MSC-CUSTOM-${slugSceneName(sceneNameInput.value)}`;
};
sceneNameInput.addEventListener("input", updateSceneCode);
document.querySelector("#save-micro-scene").addEventListener("click", () => {
  const count = objectRoots.filter((root) => root.userData.labOrigin === "sandbox").length;
  if (!count) return showToast("Ajoutez au moins un objet sur le plateau test.");
  sceneNameInput.value = "";
  updateSceneCode();
  document.querySelector("#micro-scene-summary").textContent = `${count} objet${count > 1 ? "s" : ""} du plateau test seront enregistrés.`;
  sceneDialog.showModal();
  sceneNameInput.focus();
});

function buildCustomMicroScene(name) {
  const roots = objectRoots.filter((root) => root.userData.labOrigin === "sandbox");
  const center = roots.reduce((sum, root) => sum.add(root.position), new THREE.Vector3()).multiplyScalar(1 / roots.length);
  center.y = PLATFORM.y;
  const objects = roots.map((root) => ({
    type: root.userData.labInstance.definition.type,
    offset: [root.position.x - center.x, root.position.y - center.y, root.position.z - center.z].map((value) => Number(value.toFixed(4))),
    variant: root.userData.labVariant || 0,
    rotation: [root.rotation.x, root.rotation.y, root.rotation.z].map((value) => Number(value.toFixed(6)))
  }));
  const radius = Math.max(1, ...roots.map((root) => {
    const placementRadius = library.getMapPlacement(root.userData.labInstance.definition.type).radius;
    return Math.hypot(root.position.x - center.x, root.position.z - center.z) + placementRadius;
  }));
  return {
    id: `MSC-CUSTOM-${slugSceneName(name)}`,
    key: `custom_${slugSceneName(name).toLowerCase().replace(/-/g, "_")}`,
    name: name.trim(),
    biomes: ["all"],
    rarity: "custom",
    radius: Number(radius.toFixed(2)),
    objects
  };
}

document.querySelector("#micro-scene-form").addEventListener("submit", async (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  if (!sceneNameInput.reportValidity()) return;
  const template = buildCustomMicroScene(sceneNameInput.value);
  try {
    const json = JSON.stringify(template).replace(/[^\x00-\x7F]/g, (character) =>
      `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
    );
    const response = await fetch("/api/custom-micro-scenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Sauvegarde refusée");
    sceneDialog.close();
    showToast(`${template.id} sauvegardée pour le moteur.`);
  } catch (error) {
    showToast(`Échec de sauvegarde : ${error.message}`);
  }
});

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
  foxTarget.z = THREE.MathUtils.clamp(foxTarget.z, -PLATFORM.depth / 2 + 0.7, PLATFORM.depth / 2 - 0.7);
  const direction = foxTarget.clone().sub(fox.position);
  if (direction.lengthSq() > 0.01) {
    const step = Math.min(direction.length(), dt * 4.5);
    fox.position.addScaledVector(direction.normalize(), step);
    fox.rotation.y = Math.atan2(-direction.z, direction.x);
  }
  resize();
  if (cameraTransition) {
    camera.position.lerp(cameraTransition.position, 0.12);
    controls.target.lerp(cameraTransition.target, 0.12);
    if (camera.position.distanceTo(cameraTransition.position) < 0.04 && controls.target.distanceTo(cameraTransition.target) < 0.04) {
      camera.position.copy(cameraTransition.position);
      controls.target.copy(cameraTransition.target);
      cameraTransition = null;
    }
  }
  controls.update();
  renderer.render(scene, camera);
}

populateFilters();
renderCatalog();
populateShowroom();
document.querySelector("#catalog-status").textContent = `${catalog.length} objets exécutables · schéma CUO v${library.schemaVersion}${validation.valid ? " · valide" : ` · ${validation.errors.length} erreur(s)`}`;
if (!validation.valid) console.error("Validation CUO", validation.errors);
animate();
