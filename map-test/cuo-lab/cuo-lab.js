import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";

const BF = window.BlueFox3D;
const library = BF?.ObjectLibrary;
if (!library?.list || !library?.create || !library?.validate) {
  throw new Error("CUO exécutable introuvable : BlueFox3D.ObjectLibrary.");
}

const $ = (selector) => document.querySelector(selector);
const canvas = $("#viewport");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06111b);
scene.fog = new THREE.Fog(0x06111b, 80, 155);

const camera = new THREE.PerspectiveCamera(48, 1, .1, 240);
camera.position.set(0, 78, 130);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = .075;
controls.minDistance = 6;
controls.maxDistance = 210;
controls.maxPolarAngle = Math.PI * .48;
controls.rotateSpeed = 1.35;
controls.panSpeed = 1.6;
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
scene.add(sun);

const PLATFORM = Object.freeze({ width: 96, depth: 100, y: .3 });
const GAME_PLATEAU = Object.freeze({ size: 54, half: 27 });
const CENTERS = Object.freeze({ showroom: -48, sandbox: 48 });
const platforms = [];
const palette = { accent: 0x66e4ff, ground: 0x405664, sky: 0x071724, vegetation: 0x63c991, mineral: 0x8bcce7, ruin: 0x72808d };

function makePlatform(name, x, color) {
  const root = new THREE.Group();
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(PLATFORM.width, .6, PLATFORM.depth),
    new THREE.MeshStandardMaterial({ color, roughness: .88 })
  );
  slab.position.set(x, 0, 0);
  slab.receiveShadow = true;
  slab.userData.platform = name;
  root.add(slab);
  const grid = new THREE.GridHelper(PLATFORM.width, 20, 0x3a7584, 0x21404c);
  grid.position.set(x, PLATFORM.y + .012, 0);
  root.add(grid);
  const label = BF.makeLabel(THREE, name === "showroom" ? "CATALOGUE CUO · XL → S" : "PLATEAU TEST · ÉDITEUR");
  label.position.set(x, 1.25, -PLATFORM.depth / 2 + 1.2);
  label.scale.set(9.5, 1.75, 1);
  root.add(label);
  scene.add(root);
  platforms.push(slab);
  return slab;
}

const showroomPlatform = makePlatform("showroom", CENTERS.showroom, 0x243a42);
const sandboxPlatform = makePlatform("sandbox", CENTERS.sandbox, 0x263c35);

// Repère visuel uniquement : plateau moteur 54 × 54 et origine MSC réelle.
{
  const y = PLATFORM.y + .025;
  const half = GAME_PLATEAU.half;
  const points = [
    new THREE.Vector3(CENTERS.sandbox - half, y, -half),
    new THREE.Vector3(CENTERS.sandbox + half, y, -half),
    new THREE.Vector3(CENTERS.sandbox + half, y, half),
    new THREE.Vector3(CENTERS.sandbox - half, y, half)
  ];
  const frame = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x9eefff })
  );
  frame.userData.labDecoration = true;
  scene.add(frame);

  const axes = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(CENTERS.sandbox - half, y, 0),
      new THREE.Vector3(CENTERS.sandbox + half, y, 0),
      new THREE.Vector3(CENTERS.sandbox, y, -half),
      new THREE.Vector3(CENTERS.sandbox, y, half)
    ]),
    new THREE.LineBasicMaterial({ color: 0x4e9eae })
  );
  axes.userData.labDecoration = true;
  scene.add(axes);

  const label = BF.makeLabel(THREE, "ZONE JEU 54 × 54 · ORIGINE MSC AU CENTRE");
  label.position.set(CENTERS.sandbox, 1.0, -half + 1.1);
  label.scale.set(7.0, 1.25, 1);
  label.userData.labDecoration = true;
  scene.add(label);
}

const catalog = library.list({ status: "active" });
const validation = library.validate();
const rank = { XL: 0, L: 1, M: 2, S: 3 };
catalog.sort((a, b) => (rank[a.size] ?? 9) - (rank[b.size] ?? 9) || a.label.localeCompare(b.label, "fr"));

const roots = [];
const selected = new Set();
const selectionVisuals = new Map();
const history = [];
let clipboard = [];
let id = 1;
let moveMode = true;
let drag = null;
let pointerDown = null;
let cameraTransition = null;
let toastTimer = null;
let loadedMicroScene = null;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("visible"), 2800);
}

function rootOf(object) {
  while (object && !object.userData.labId) object = object.parent;
  return object;
}

function definitionOf(root) {
  return root?.userData?.labInstance?.definition || null;
}

function ground(root) {
  // Mesure le bas de l'objet dans son orientation actuelle, puis translate
  // uniquement Y. Cette fonction n'est utilisée que sur demande explicite.
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (Number.isFinite(box.min.y)) {
    root.position.y += PLATFORM.y - box.min.y;
    root.updateMatrixWorld(true);
  }
}

function serialize(root) {
  const definition = definitionOf(root);
  return {
    type: definition?.type,
    variant: root.userData.labVariant || 0,
    position: root.position.toArray(),
    rotation: [root.rotation.x, root.rotation.y, root.rotation.z]
  };
}

function snapshot(rootsToCapture) {
  return rootsToCapture.map(root => ({ root, before: serialize(root) }));
}

function pushHistory(entry) {
  history.push(entry);
  if (history.length > 80) history.shift();
  $("#undo-action").disabled = history.length === 0;
}

function create(type, position, origin = "sandbox", variant = 0, options = {}) {
  const instance = library.create(THREE, type, palette, variant);
  const objectRoot = instance.root;

  /*
   * IMPORTANT : la racine CUO appartient au moteur et peut être animée ou
   * réorientée par un runtime (faune, flore, PNJ, phénomènes...).
   * Le Lab ne transforme donc plus directement cette racine.
   *
   * Toutes les transformations d'édition sont portées par ce pivot externe.
   * Ainsi, même si le runtime modifie objectRoot.rotation ensuite, la rotation
   * utilisateur du Lab reste appliquée au-dessus dans la hiérarchie Three.js.
   */
  const root = new THREE.Group();
  root.name = `CUOLabPivot:${type}`;
  root.add(objectRoot);
  root.position.copy(position);

  root.userData.labId = id++;
  root.userData.labOrigin = origin;
  root.userData.labInstance = instance;
  root.userData.labObjectRoot = objectRoot;
  root.userData.labVariant = variant;

  if (options.rotation) root.rotation.set(...options.rotation);
  if (options.keepY !== true) ground(root);

  root.userData.labInitialTransform = {
    position: root.position.clone(),
    rotation: root.rotation.clone()
  };

  scene.add(root);
  roots.push(root);
  return root;
}

function disposeRoot(root) {
  const index = roots.indexOf(root);
  if (index >= 0) roots.splice(index, 1);
  selected.delete(root);
  const helper = selectionVisuals.get(root);
  if (helper) {
    scene.remove(helper);
    selectionVisuals.delete(root);
  }
  scene.remove(root);
  const objectRoot = root.userData?.labObjectRoot || root;
  BF.disposeObject?.(objectRoot);
}

function clearSandbox() {
  roots
    .filter(root => root.userData.labOrigin === "sandbox")
    .forEach(disposeRoot);
  clearSelection();
}

function restoreSerialized(data) {
  const root = create(data.type, new THREE.Vector3(...data.position), "sandbox", data.variant, {
    keepY: true,
    rotation: data.rotation
  });
  root.position.fromArray(data.position);
  return root;
}

function undo() {
  const entry = history.pop();
  if (!entry) return;
  if (entry.kind === "create") {
    entry.items.forEach(item => {
      const match = roots.find(root => root.userData.labId === item.labId);
      if (match) disposeRoot(match);
    });
  } else if (entry.kind === "delete") {
    clearSelection();
    entry.items.forEach(data => selectRoot(restoreSerialized(data), true));
  } else if (entry.kind === "transform") {
    entry.items.forEach(item => {
      if (!roots.includes(item.root)) return;
      item.root.position.fromArray(item.before.position);
      item.root.rotation.set(...item.before.rotation);
    });
    refreshSelectionUI();
  }
  $("#undo-action").disabled = history.length === 0;
  toast("Action annulée.");
}

function populate() {
  const columns = 5;
  const xStep = 18;
  const zStep = 16;
  const startX = CENTERS.showroom - (columns - 1) * xStep / 2;
  const rows = Math.ceil(catalog.length / columns);
  const startZ = -(rows - 1) * zStep / 2 + 1;
  catalog.forEach((definition, index) => {
    const root = create(
      definition.type,
      new THREE.Vector3(startX + (index % columns) * xStep, PLATFORM.y, startZ + Math.floor(index / columns) * zStep),
      "showroom",
      index % 3
    );
    const label = BF.makeLabel(THREE, `${definition.size} · ${definition.label}`);
    label.position.set(0, 2, 0);
    label.scale.set(5.4, 1, 1);
    label.userData.labDecoration = true;
    root.add(label);
  });
}

function setPointer(x, y) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((x - rect.left) / rect.width * 2 - 1, -((y - rect.top) / rect.height * 2 - 1));
  raycaster.setFromCamera(pointer, camera);
}

function clampXZ(position) {
  position.x = THREE.MathUtils.clamp(position.x, CENTERS.sandbox - PLATFORM.width / 2 + 1, CENTERS.sandbox + PLATFORM.width / 2 - 1);
  position.z = THREE.MathUtils.clamp(position.z, -PLATFORM.depth / 2 + 1, PLATFORM.depth / 2 - 1);
  return position;
}

function clearVisuals() {
  selectionVisuals.forEach(helper => scene.remove(helper));
  selectionVisuals.clear();
}

function updateVisuals() {
  clearVisuals();
  if (!$("#show-hitboxes").checked) return;
  selected.forEach(root => {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const helper = new THREE.Box3Helper(box, 0x77e8ff);
    selectionVisuals.set(root, helper);
    scene.add(helper);
  });
}

function clearSelection() {
  selected.clear();
  refreshSelectionUI();
}

function selectRoot(root, additive = false) {
  if (!root) return clearSelection();
  if (!additive) selected.clear();
  if (additive && selected.has(root)) selected.delete(root);
  else selected.add(root);
  refreshSelectionUI();
}

function sandboxSelection() {
  return [...selected].filter(root => root.userData.labOrigin === "sandbox");
}

function selectedPrimary() {
  return [...selected][0] || null;
}

function refreshSelectionUI() {
  const list = [...selected];
  $("#focus-selected").disabled = list.length === 0;
  $("#delete-object").disabled = sandboxSelection().length === 0;
  if (!list.length) {
    $("#selection-details").textContent = "Sélectionnez un objet.";
  } else if (list.length === 1) {
    const root = list[0];
    const definition = definitionOf(root);
    $("#selection-details").innerHTML = `<b>${definition.label}</b><br>${definition.id} · ${definition.category} · taille ${definition.size}<br>Position : ${root.position.x.toFixed(2)} / ${root.position.y.toFixed(2)} / ${root.position.z.toFixed(2)}<br>Rotation pivot : X ${Math.round(THREE.MathUtils.radToDeg(root.rotation.x))}° · Y ${Math.round(THREE.MathUtils.radToDeg(root.rotation.y))}° · Z ${Math.round(THREE.MathUtils.radToDeg(root.rotation.z))}°`;
  } else {
    const sandboxCount = sandboxSelection().length;
    $("#selection-details").innerHTML = `<b>${list.length} objets sélectionnés</b><br>${sandboxCount} modifiable(s) sur le plateau test.`;
  }
  updateVisuals();
  updatePanel();
}

function updatePanel() {
  const panel = $("#transform-window");
  const list = sandboxSelection();
  const primary = list[0];
  const ok = moveMode && list.length > 0;
  panel.hidden = !ok;
  if (!ok) return;
  $("#transform-object-name").textContent = list.length === 1 ? definitionOf(primary).label : `${list.length} objets`;
  $("#position-y").value = primary.position.y.toFixed(2);
  panel.querySelectorAll(".axis-control").forEach(row => {
    row.querySelector("output").textContent = `${Math.round(THREE.MathUtils.radToDeg(primary.rotation[row.dataset.axis]))}°`;
  });
}

function renderCatalog() {
  const query = $("#name-filter").value.trim().toLowerCase();
  const category = $("#category-filter").value;
  const size = $("#size-filter").value;
  const matches = catalog.filter(definition =>
    (!query || `${definition.label} ${definition.type} ${definition.id}`.toLowerCase().includes(query)) &&
    (!category || definition.category === category) &&
    (!size || definition.size === size)
  );
  $("#catalog-list").replaceChildren(...matches.map(definition => {
    const card = document.createElement("article");
    card.className = "catalog-card";
    card.draggable = true;
    card.dataset.type = definition.type;
    card.innerHTML = `<span class="size">${definition.size}</span><span><b>${definition.label}</b><small>${definition.type}</small></span><em>${definition.category}</em>`;
    card.addEventListener("dragstart", event => event.dataTransfer.setData("application/x-bluefox-cuo", definition.type));
    card.addEventListener("click", () => showPreview(definition));
    return card;
  }));
}

canvas.addEventListener("dragover", event => event.preventDefault());
canvas.addEventListener("drop", event => {
  event.preventDefault();
  const type = event.dataTransfer.getData("application/x-bluefox-cuo");
  setPointer(event.clientX, event.clientY);
  const hit = raycaster.intersectObject(sandboxPlatform, false)[0];
  if (!hit || !library.exists(type)) return;
  const root = create(type, clampXZ(hit.point.clone()), "sandbox", Math.floor(Math.random() * 3));
  pushHistory({ kind: "create", items: [{ labId: root.userData.labId }] });
  selectRoot(root);
});

canvas.addEventListener("pointerdown", event => {
  if (event.button === 0) {
    setPointer(event.clientX, event.clientY);
    const hit = raycaster.intersectObjects(roots, true).find(item => !item.object.userData.labDecoration);
    const root = hit && rootOf(hit.object);
    const additive = event.ctrlKey || event.metaKey;

    if (root) {
      if (root.userData.labOrigin === "sandbox") {
        if (additive) {
          selectRoot(root, true);
          pointerDown = null;
          return;
        }
        if (!selected.has(root)) selectRoot(root);
        if (moveMode) {
          const group = sandboxSelection();
          drag = {
            mode: event.altKey ? "height" : (event.shiftKey ? "rotate" : "move"),
            startPoint: null,
            startClientY: event.clientY,
            startClientX: event.clientX,
            roots: group,
            before: snapshot(group),
            originalPositions: group.map(item => item.position.clone()),
            originalRotations: group.map(item => item.rotation.clone())
          };
          canvas.setPointerCapture(event.pointerId);
        }
      } else {
        selectRoot(root, additive);
      }
    } else {
      pointerDown = { x: event.clientX, y: event.clientY };
    }
  }
  if (event.button === 2) canvas.classList.add("camera-drag");
});

const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLATFORM.y);
const dragPlanePoint = new THREE.Vector3();

canvas.addEventListener("pointermove", event => {
  if (!drag) return;

  if (drag.mode === "height") {
    const deltaY = (drag.startClientY - event.clientY) * 0.025;
    drag.roots.forEach((root, index) => {
      root.position.y = drag.originalPositions[index].y + deltaY;
      root.updateMatrixWorld(true);
    });
  } else if (drag.mode === "rotate") {
    const deltaAngle = (event.clientX - drag.startClientX) * 0.012;
    drag.roots.forEach((root, index) => {
      root.rotation.copy(drag.originalRotations[index]);
      root.rotation.y += deltaAngle;
      root.updateMatrixWorld(true);
    });
  } else {
    setPointer(event.clientX, event.clientY);
    if (!raycaster.ray.intersectPlane(dragPlane, dragPlanePoint)) return;
    const point = clampXZ(dragPlanePoint.clone());
    if (!drag.startPoint) drag.startPoint = point.clone();
    const delta = point.clone().sub(drag.startPoint);
    drag.roots.forEach((root, index) => {
      const base = drag.originalPositions[index];
      const next = clampXZ(base.clone().add(new THREE.Vector3(delta.x, 0, delta.z)));
      root.position.set(next.x, base.y, next.z);
      root.updateMatrixWorld(true);
    });
  }
  updateVisuals();
  updatePanel();
  if (selected.size === 1) {
    const root = selectedPrimary();
    const definition = definitionOf(root);
    if (root && definition) {
      $("#selection-details").innerHTML = `<b>${definition.label}</b><br>${definition.id} · ${definition.category} · taille ${definition.size}<br>Position : ${root.position.x.toFixed(2)} / ${root.position.y.toFixed(2)} / ${root.position.z.toFixed(2)}<br>Rotation pivot : X ${Math.round(THREE.MathUtils.radToDeg(root.rotation.x))}° · Y ${Math.round(THREE.MathUtils.radToDeg(root.rotation.y))}° · Z ${Math.round(THREE.MathUtils.radToDeg(root.rotation.z))}°`;
    }
  }
});

canvas.addEventListener("pointerup", event => {
  if (drag) {
    const moved = drag.roots.some((root, index) =>
      root.position.distanceTo(drag.originalPositions?.[index] || root.position) > .001 ||
      Math.abs(root.rotation.x - (drag.originalRotations?.[index]?.x ?? root.rotation.x)) > .001 ||
      Math.abs(root.rotation.y - (drag.originalRotations?.[index]?.y ?? root.rotation.y)) > .001 ||
      Math.abs(root.rotation.z - (drag.originalRotations?.[index]?.z ?? root.rotation.z)) > .001
    );
    if (moved) pushHistory({ kind: "transform", items: drag.before });
    drag = null;
    pointerDown = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    return;
  }
  if (event.button !== 0 || !pointerDown) return;
  const isClick = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) <= 5;
  pointerDown = null;
  if (!isClick) return;
  setPointer(event.clientX, event.clientY);
  const objectHit = raycaster.intersectObjects(roots, true).find(item => !item.object.userData.labDecoration);
  if (objectHit) {
    selectRoot(rootOf(objectHit.object), event.ctrlKey || event.metaKey);
    return;
  }
  const groundHit = raycaster.intersectObjects(platforms, false)[0];
  clearSelection();
  if (groundHit) {
    foxTarget.copy(groundHit.point);
    foxTarget.y = PLATFORM.y;
  }
});

canvas.addEventListener("contextmenu", event => {
  setPointer(event.clientX, event.clientY);
  const hit = raycaster.intersectObjects(roots, true).find(item => !item.object.userData.labDecoration);
  const root = hit && rootOf(hit.object);
  if (root?.userData.labOrigin === "sandbox") {
    event.preventDefault();
    if (!selected.has(root)) selectRoot(root);
    deleteSelected();
  }
});

window.addEventListener("pointerup", () => canvas.classList.remove("camera-drag"));

function makeFox() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x2794d2 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.42, .75, 6, 12), material);
  body.rotation.z = Math.PI / 2;
  body.position.y = .65;
  group.add(body);
  return group;
}

const fox = makeFox();
fox.position.set(CENTERS.sandbox, PLATFORM.y, 12);
scene.add(fox);
const foxTarget = fox.position.clone();

function deleteSelected() {
  const list = sandboxSelection();
  if (!list.length) return;
  const saved = list.map(serialize);
  list.forEach(disposeRoot);
  pushHistory({ kind: "delete", items: saved });
  refreshSelectionUI();
  toast(`${saved.length} objet(s) supprimé(s).`);
}

function transformSelection(mutator) {
  const list = sandboxSelection();
  if (!list.length) return;
  const before = snapshot(list);
  list.forEach(root => {
    mutator(root);
    root.updateMatrixWorld(true);
  });
  pushHistory({ kind: "transform", items: before });
  refreshSelectionUI();
}

function rotate(angle) {
  transformSelection(root => root.rotation.y += angle);
}

$("#delete-object").onclick = deleteSelected;
$("#rotate-left").onclick = () => rotate(Math.PI / 12);
$("#rotate-right").onclick = () => rotate(-Math.PI / 12);
$("#show-hitboxes").onchange = updateVisuals;
$("#undo-action").onclick = undo;

document.querySelectorAll(".axis-control button").forEach(button => {
  button.onclick = () => {
    const axis = button.closest(".axis-control").dataset.axis;
    const amount = THREE.MathUtils.degToRad(Number(button.dataset.step));
    transformSelection(root => root.rotation[axis] += amount);
  };
});

function changeHeight(delta) {
  transformSelection(root => root.position.y += delta);
}

$("#position-down").onclick = () => changeHeight(-.25);
$("#position-up").onclick = () => changeHeight(.25);
$("#position-y").onchange = event => {
  const primary = sandboxSelection()[0];
  if (!primary) return;
  const target = Number(event.target.value) || 0;
  const delta = target - primary.position.y;
  changeHeight(delta);
};
$("#place-on-ground").onclick = () => transformSelection(root => ground(root));
$("#reset-transform").onclick = () => transformSelection(root => {
  const initial = root.userData.labInitialTransform;
  if (initial) {
    root.position.copy(initial.position);
    root.rotation.copy(initial.rotation);
  }
});

function copySelection() {
  clipboard = sandboxSelection().map(serialize);
  if (clipboard.length) toast(`${clipboard.length} objet(s) copié(s).`);
}

function pasteSelection() {
  if (!clipboard.length) return;
  clearSelection();
  const created = clipboard.map((data, index) => {
    const position = new THREE.Vector3(...data.position);
    position.x += 3;
    position.z += 3;
    clampXZ(position);
    const root = create(data.type, position, "sandbox", data.variant, { keepY: true, rotation: data.rotation });
    root.position.copy(position);
    selectRoot(root, true);
    return root;
  });
  clipboard = created.map(serialize);
  pushHistory({ kind: "create", items: created.map(root => ({ labId: root.userData.labId })) });
  refreshSelectionUI();
  toast(`${created.length} objet(s) dupliqué(s).`);
}

window.addEventListener("keydown", event => {
  const tag = event.target?.tagName?.toLowerCase();
  const editing = tag === "input" || tag === "textarea" || tag === "select";
  if (editing) return;
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undo();
  } else if (modifier && event.key.toLowerCase() === "c") {
    event.preventDefault();
    copySelection();
  } else if (modifier && event.key.toLowerCase() === "v") {
    event.preventDefault();
    pasteSelection();
  } else if (event.key === "Delete") {
    event.preventDefault();
    deleteSelected();
  }
});

function focus(object, min = 14) {
  if (!object) return;
  const objects = object instanceof Set ? [...object] : Array.isArray(object) ? object : [object];
  if (!objects.length) return;
  const box = new THREE.Box3();
  objects.forEach(item => box.expandByObject(item));
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  const direction = camera.position.clone().sub(controls.target).normalize();
  cameraTransition = {
    target: center,
    position: center.clone().addScaledVector(direction, Math.max(min, size * 2.2))
  };
}

$("#focus-showroom").onclick = () => cameraTransition = { target: new THREE.Vector3(CENTERS.showroom, 0, 0), position: new THREE.Vector3(CENTERS.showroom, 64, 92) };
$("#focus-sandbox").onclick = () => cameraTransition = { target: new THREE.Vector3(CENTERS.sandbox, 0, 0), position: new THREE.Vector3(CENTERS.sandbox, 64, 92) };
$("#focus-selected").onclick = () => focus(selected);
$("#focus-fox").onclick = () => focus(fox, 16);
$("#move-mode").onclick = event => {
  moveMode = !moveMode;
  event.currentTarget.setAttribute("aria-pressed", String(moveMode));
  event.currentTarget.textContent = moveMode ? "Déplacement actif" : "Déplacement verrouillé";
  canvas.classList.toggle("move-mode", moveMode);
  updatePanel();
};
$("#reload-cuo").onclick = () => location.reload();

$("#choose-saves-folder").onclick = async () => {
  try {
    const handle = await chooseSavesDirectory();
    toast(`Dossier de sauvegarde sélectionné : ${handle.name}`);
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error("[CUO Lab] Sélection du dossier saves impossible :", error);
      toast(`Dossier saves non sélectionné : ${error.message}`);
    }
  }
};

const previewCanvas = $("#object-preview");
const previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true, alpha: true });
previewRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
previewRenderer.toneMappingExposure = 1.15;
const previewScene = new THREE.Scene();
previewScene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 2.4));
const previewLight = new THREE.DirectionalLight(0xffffff, 3.2);
previewLight.position.set(4, 8, 6);
previewScene.add(previewLight);
const previewCamera = new THREE.PerspectiveCamera(42, 1, .05, 100);
let previewRoot = null;
let previewAngle = 0;

function clearPreviewRoot() {
  if (!previewRoot) return;
  previewScene.remove(previewRoot);
  BF.disposeObject?.(previewRoot);
  previewRoot = null;
}

function showPreview(definition) {
  clearPreviewRoot();
  const instance = library.create(THREE, definition.type, palette, 0);
  previewRoot = instance.root;
  previewScene.add(previewRoot);
  const box = new THREE.Box3().setFromObject(previewRoot);
  const center = box.getCenter(new THREE.Vector3());
  const size = Math.max(.5, box.getSize(new THREE.Vector3()).length());
  previewRoot.position.sub(center);
  previewCamera.position.set(size * .75, size * .55, size * 1.25);
  previewCamera.lookAt(0, 0, 0);
  $("#preview-details").innerHTML = `<b>${definition.label}</b><br>${definition.id}<br>type ${definition.type} · ${definition.category} · taille ${definition.size}`;
  $("#preview-window").hidden = false;
  document.querySelectorAll(".catalog-card").forEach(card => card.classList.toggle("previewed", card.dataset.type === definition.type));
}

$("#close-preview").onclick = () => {
  $("#preview-window").hidden = true;
  clearPreviewRoot();
  document.querySelectorAll(".catalog-card").forEach(card => card.classList.remove("previewed"));
};


const CUSTOM_SCENES_STORAGE_KEY = "bluefox_custom_micro_scenes_v1";

function loadSavedCustomScenes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_SCENES_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("[CUO Lab] Impossible de relire les micro-scènes locales.", error);
    return [];
  }
}

function validateCustomSceneTemplate(template) {
  if (!template || !/^MSC-CUSTOM-[A-Z0-9-]+$/.test(template.id || "")) {
    throw new Error("Identifiant de micro-scène invalide.");
  }
  if (!Array.isArray(template.objects) || !template.objects.length) {
    throw new Error("La micro-scène ne contient aucun objet.");
  }
  for (const entry of template.objects) {
    if (!library.exists(entry.type)) {
      throw new Error(`Objet CUO inconnu : ${entry.type}`);
    }
    if (!Array.isArray(entry.offset) || entry.offset.length !== 3) {
      throw new Error(`Offset invalide pour ${entry.type}`);
    }
    if (!Array.isArray(entry.rotation) || entry.rotation.length !== 3) {
      throw new Error(`Rotation invalide pour ${entry.type}`);
    }
  }
  return true;
}

function saveCustomSceneLocally(template) {
  validateCustomSceneTemplate(template);

  const current = loadSavedCustomScenes();
  const next = current.filter(scene => scene?.id !== template.id);
  next.push(template);

  localStorage.setItem(CUSTOM_SCENES_STORAGE_KEY, JSON.stringify(next));

  // Contrat canonique consommé par engine/micro-scenes.js.
  window.BlueFoxCustomMicroScenes = next.map(scene => JSON.parse(JSON.stringify(scene)));

  return {
    id: template.id,
    total: next.length,
    storageKey: CUSTOM_SCENES_STORAGE_KEY
  };
}

const diskCustomScenes = Array.isArray(window.BlueFoxCustomMicroScenes)
  ? window.BlueFoxCustomMicroScenes.map(scene => JSON.parse(JSON.stringify(scene)))
  : [];

function availableMicroScenes() {
  const byId = new Map();
  // Les brouillons locaux sont chargés d'abord. Une scène canonique portant
  // le même identifiant doit toujours être remplacée par la version du dépôt.
  loadSavedCustomScenes().forEach(template => byId.set(template.id, template));
  BF.MicroScenes?.list?.().forEach(template => byId.set(template.id, template));
  diskCustomScenes.forEach(template => byId.set(template.id, template));
  return [...byId.values()].sort((a, b) =>
    String(a.name || a.id).localeCompare(String(b.name || b.id), "fr")
  );
}

function renderMicroSceneSelector(preferredId = "") {
  const select = $("#micro-scene-select");
  const templates = availableMicroScenes();
  select.replaceChildren(
    new Option("Choisir…", ""),
    ...templates.map(template => new Option(
      `${template.name || template.id} · ${template.objects.length} objet(s)`,
      template.id
    ))
  );
  if (preferredId && templates.some(template => template.id === preferredId)) {
    select.value = preferredId;
  }
  $("#load-micro-scene").disabled = !select.value;
}

function preloadMicroScene(template) {
  if (!template?.objects?.length) throw new Error("Micro-scène vide ou inconnue.");
  const unknown = template.objects.find(entry => !library.exists(entry.type));
  if (unknown) throw new Error(`Objet CUO inconnu dans la scène : ${unknown.type}`);

  clearSandbox();
  history.length = 0;
  $("#undo-action").disabled = true;
  const origin = new THREE.Vector3(CENTERS.sandbox, PLATFORM.y, 0);
  const created = template.objects.map(entry => {
    const offset = Array.isArray(entry.offset) ? entry.offset : [0, 0, 0];
    return create(
      entry.type,
      origin.clone().add(new THREE.Vector3(...offset)),
      "sandbox",
      Math.max(0, Number(entry.variant) || 0),
      {
        keepY: true,
        rotation: Array.isArray(entry.rotation) ? entry.rotation : [0, 0, 0]
      }
    );
  });

  loadedMicroScene = { id: template.id, name: template.name || template.id };
  nameInput.value = `${loadedMicroScene.name} copie`;
  nameInput.dispatchEvent(new Event("input"));
  created.forEach(root => selectRoot(root, true));
  focus(created);
  toast(`${loadedMicroScene.name} préchargée · ${created.length} objet(s).`);
}

$("#micro-scene-select").onchange = event => {
  $("#load-micro-scene").disabled = !event.target.value;
};

$("#load-micro-scene").onclick = () => {
  const id = $("#micro-scene-select").value;
  const template = availableMicroScenes().find(scene => scene.id === id);
  try {
    preloadMicroScene(template);
  } catch (error) {
    console.error("[CUO Lab] Préchargement impossible :", error);
    toast(`Préchargement impossible : ${error.message}`);
  }
};

window.BlueFoxCustomMicroScenes = loadSavedCustomScenes();


const CUO_SAVES_DB = "bluefox_cuo_lab_handles_v1";
const CUO_SAVES_STORE = "handles";
const CUO_SAVES_KEY = "saves-directory";

function openHandleDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CUO_SAVES_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CUO_SAVES_STORE)) {
        db.createObjectStore(CUO_SAVES_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeDirectoryHandle(handle) {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CUO_SAVES_STORE, "readwrite");
    tx.objectStore(CUO_SAVES_STORE).put(handle, CUO_SAVES_KEY);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function loadDirectoryHandle() {
  try {
    const db = await openHandleDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(CUO_SAVES_STORE, "readonly");
      const request = tx.objectStore(CUO_SAVES_STORE).get(CUO_SAVES_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function ensureDirectoryPermission(handle, request = false) {
  if (!handle) return false;
  const options = { mode: "readwrite" };
  if ((await handle.queryPermission?.(options)) === "granted") return true;
  if (!request) return false;
  return (await handle.requestPermission?.(options)) === "granted";
}

async function chooseSavesDirectory() {
  if (typeof window.showDirectoryPicker !== "function") {
    throw new Error("Ce navigateur ne permet pas l'écriture directe dans un dossier. Utilisez Chrome ou Edge.");
  }

  const handle = await window.showDirectoryPicker({
    id: "bluefox-cuo-lab-saves",
    mode: "readwrite",
    startIn: "documents"
  });

  if (!(await ensureDirectoryPermission(handle, true))) {
    throw new Error("Permission d'écriture refusée.");
  }

  await storeDirectoryHandle(handle);
  window.__CUO_SAVES_HANDLE__ = handle;
  updateSaveDirectoryStatus(handle);
  return handle;
}

function updateSaveDirectoryStatus(handle) {
  const node = $("#save-directory-status");
  if (!node) return;
  if (handle) {
    node.textContent = `Dossier saves : ${handle.name}`;
    node.classList.add("connected");
  } else {
    node.textContent = "Dossier saves : non sélectionné";
    node.classList.remove("connected");
  }
}

async function getWritableSavesDirectory({ requestPermission = false } = {}) {
  let handle = window.__CUO_SAVES_HANDLE__ || await loadDirectoryHandle();
  if (handle && await ensureDirectoryPermission(handle, requestPermission)) {
    window.__CUO_SAVES_HANDLE__ = handle;
    updateSaveDirectoryStatus(handle);
    return handle;
  }
  return null;
}

async function saveCustomSceneToDisk(template) {
  validateCustomSceneTemplate(template);

  // Filet de sécurité local avant toute écriture disque.
  saveCustomSceneLocally(template);

  let directory = await getWritableSavesDirectory({ requestPermission: true });
  if (!directory) {
    directory = await chooseSavesDirectory();
  }

  const filename = `${template.id}.json`;
  const fileHandle = await directory.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();

  try {
    await writable.write(JSON.stringify(template, null, 2) + "\n");
  } finally {
    await writable.close();
  }

  return {
    saved: true,
    id: template.id,
    filename,
    directory: directory.name,
    objects: template.objects.length
  };
}

const dialog = $("#micro-scene-dialog");
const nameInput = $("#micro-scene-name");
const slug = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "SANS-NOM";
nameInput.oninput = () => $("#micro-scene-code").textContent = `MSC-CUSTOM-${slug(nameInput.value)}`;
$("#save-micro-scene").onclick = () => {
  if (loadedMicroScene && !nameInput.value.trim()) {
    nameInput.value = `${loadedMicroScene.name} copie`;
    nameInput.dispatchEvent(new Event("input"));
  }
  dialog.showModal();
  nameInput.focus();
};
$("#micro-scene-form").onsubmit = async event => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();

  const list = roots.filter(root => root.userData.labOrigin === "sandbox");
  if (!list.length) {
    toast("Ajoutez au moins un objet sur le plateau test.");
    return;
  }

  const template = {
    id: `MSC-CUSTOM-${slug(nameInput.value)}`,
    name: nameInput.value.trim(),
    biomes: ["all"],
    rarity: "custom",
    radius: Math.max(
      1,
      ...list.map(root =>
        Math.hypot(root.position.x - CENTERS.sandbox, root.position.z)
      )
    ),
    objects: list.map(root => ({
      type: definitionOf(root).type,
      offset: [
        root.position.x - CENTERS.sandbox,
        root.position.y - PLATFORM.y,
        root.position.z
      ],
      variant: root.userData.labVariant || 0,
      rotation: [
        root.rotation.x,
        root.rotation.y,
        root.rotation.z
      ]
    }))
  };

  const existingIds = new Set(availableMicroScenes().map(scene => scene.id));
  if (template.id === loadedMicroScene?.id || existingIds.has(template.id)) {
    toast("Choisissez un nouveau nom : la micro-scène source ne sera pas écrasée.");
    nameInput.focus();
    return;
  }

  const button = event.submitter;
  button.disabled = true;

  try {
    const result = await saveCustomSceneToDisk(template);

    $("#micro-scene-code").textContent = result.id;
    $("#micro-scene-summary").textContent =
      `${template.objects.length} objet(s) · fichier : cuo-lab/saves/${result.filename}`;

    dialog.close();
    loadedMicroScene = { id: template.id, name: template.name };
    renderMicroSceneSelector(template.id);

    toast(`Sauvegardée sur disque : saves/${result.filename}`);
    console.info(
      "[CUO Lab] Micro-scène écrite sur disque :",
      result.path,
      template
    );
  } catch (error) {
    console.error("[CUO Lab] Échec écriture disque :", error);
    toast(
      `Sauvegarde disque impossible — copie locale conservée : ${error.message}`
    );
  } finally {
    button.disabled = false;
  }
};

const win = $("#catalog-window");
$("#minimize-window").onclick = () => win.classList.toggle("minimized");
$("#maximize-window").onclick = () => win.classList.toggle("maximized");

function resize() {
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  camera.updateProjectionMatrix();

  const width = previewCanvas.clientWidth || 300;
  const height = previewCanvas.clientHeight || 230;
  previewRenderer.setSize(width, height, false);
  previewCamera.aspect = width / Math.max(1, height);
  previewCamera.updateProjectionMatrix();
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .05);
  const direction = foxTarget.clone().sub(fox.position);
  if (direction.lengthSq() > .0001) {
    const step = Math.min(direction.length(), dt * 4.5);
    fox.position.addScaledVector(direction.normalize(), step);
    fox.rotation.y = Math.atan2(-direction.z, direction.x);
  }
  resize();
  if (cameraTransition) {
    camera.position.lerp(cameraTransition.position, .12);
    controls.target.lerp(cameraTransition.target, .12);
    if (camera.position.distanceTo(cameraTransition.position) < .04) cameraTransition = null;
  }
  if (previewRoot && !$("#preview-window").hidden) {
    previewAngle += dt * .65;
    previewRoot.rotation.y = previewAngle;
    previewRenderer.render(previewScene, previewCamera);
  }
  controls.update();
  renderer.render(scene, camera);
}

const category = $("#category-filter");
[...new Set(catalog.map(item => item.category))].sort().forEach(item => category.add(new Option(item, item)));
["#name-filter", "#category-filter", "#size-filter"].forEach(selector => $(selector).oninput = renderCatalog);

renderCatalog();
renderMicroSceneSelector();
populate();
canvas.classList.add("move-mode");
const patchInfo = [
  BF.ObjectLibraryP21?.version,
  BF.ObjectLibraryFloraPatch?.version
].filter(Boolean).join(" + ");
const savedCustomSceneCount = loadSavedCustomScenes().length;
$("#catalog-status").textContent =
  `${catalog.length} objets exécutables · CUO v${library.schemaVersion}` +
  `${validation.valid ? " · valide" : " · ERREURS"}` +
  `${patchInfo ? ` · ${patchInfo}` : ""}` +
  `${savedCustomSceneCount ? ` · ${savedCustomSceneCount} secours local(aux)` : ""}`;
if (!validation.valid) {
  console.error("[CUO Lab] Catalogue moteur invalide :", validation);
  toast("Attention : validation CUO moteur en erreur.");
}

getWritableSavesDirectory({ requestPermission: false }).then(handle => {
  updateSaveDirectoryStatus(handle);
});

animate();
