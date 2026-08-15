import * as THREE from "three";
import { OrbitControls } from "../cuo-lab/vendor/OrbitControls.js";

const BF = window.BlueFox3D;
if (!BF?.buildMap || !BF?.ObjectSpawner || !BF?.MicroScenes) {
  throw new Error("MAP_Test : pipeline moteur incomplet.");
}

BF.MapGenerator?.restore?.();

const $ = (selector) => document.querySelector(selector);
const canvas = $("#viewport");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06111b);
// Pas de brouillard propre à MAP_Test.
// Pas d'éclairage décoratif spécifique au laboratoire.
// Un éclairage neutre minimum reste nécessaire aux MeshStandardMaterial du moteur.
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.35));
const neutralLight = new THREE.DirectionalLight(0xffffff, 1.6);
neutralLight.position.set(-20, 45, 25);
scene.add(neutralLight);

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

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

let currentBuilt = null;
let currentDefinition = null;
let selectedTemplate = null;
let customSceneInstances = [];
let selectedScene = null;
let moveMode = false;
let drag = null;
let queue = [];

const toast = (message) => {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("visible"), 2400);
};

const setState = (message) => {
  $("#fox-state").textContent = message;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const templateEntries = () => {
  const customDefinitions = BF.CustomMapRegistry?.list?.() || [];
  const customIds = new Set(customDefinitions.map((map) => map.id));

  const engine = Object.values(BF.maps || {})
    .filter((map) =>
      map?.id &&
      map.sceneUrl &&
      (map.terrainUrls?.length || map.terrainUrl) &&
      !map.generated &&
      !customIds.has(map.id)
    )
    .map((map) => ({ map, source: "MOTEUR" }));

  const custom = customDefinitions
    .filter((map) =>
      map?.id &&
      map.sceneUrl &&
      (map.terrainUrls?.length || map.terrainUrl)
    )
    .map((source) => ({
      map: BF.maps?.[source.id] || source,
      source: "CUSTOM"
    }));

  return [...engine, ...custom].sort((a, b) =>
    (a.source === b.source ? 0 : a.source === "MOTEUR" ? -1 : 1) ||
    (Number(a.map.number) || 9999) - (Number(b.map.number) || 9999) ||
    String(a.map.name || a.map.id).localeCompare(
      String(b.map.name || b.map.id),
      "fr"
    )
  );
};

function templateTerrainUrls(template) {
  const urls = template?.terrainUrls?.length
    ? template.terrainUrls
    : [template?.terrainUrl];
  return [...new Set(urls.filter(Boolean))];
}

function refreshTemplateList() {
  const select = $("#engine-template");
  const entries = templateEntries();

  select.replaceChildren(...entries.map(({ map, source }) =>
    new Option(
      `${source} · ${String(map.number || "").padStart(2, "0")} · ${map.name || map.id}`,
      map.id
    )
  ));

  if (!entries.length) {
    select.add(new Option("Aucun modèle moteur ou CUSTOM disponible", ""));
    selectedTemplate = null;
    return;
  }

  select.value = entries[0].map.id;
  selectedTemplate = BF.maps?.[entries[0].map.id] || entries[0].map;
  updateTemplateInfo();
}

function updateTemplateInfo() {
  const selectedId = $("#engine-template").value;
  selectedTemplate =
    BF.maps?.[selectedId] ||
    BF.CustomMapRegistry?.list?.().find((map) => map.id === selectedId) ||
    null;
  if (!selectedTemplate) {
    $("#template-info").textContent = "Modèle introuvable.";
    return;
  }

  const terrains = templateTerrainUrls(selectedTemplate);
  const traits = (selectedTemplate.traits || []).map((trait) => trait.label || trait.id);

  $("#template-info").textContent =
    `Profil ${selectedTemplate.profile || "—"} · ` +
    `${terrains.length} texture${terrains.length > 1 ? "s" : ""} associée${terrains.length > 1 ? "s" : ""}` +
    `${traits.length ? ` · ${traits.join(", ")}` : ""}`;
}
$("#engine-template").addEventListener("change", updateTemplateInfo);

function clearCurrentMap() {
  if (currentBuilt?.dispose) currentBuilt.dispose();
  else currentBuilt?.group?.removeFromParent?.();

  currentBuilt = null;
  currentDefinition = null;
  customSceneInstances = [];
  selectedScene = null;
}

function centerCamera() {
  const regions = currentBuilt?.walkableRegions || [];
  if (!regions.length) return;

  const minX = Math.min(...regions.map((r) => r.minX));
  const maxX = Math.max(...regions.map((r) => r.maxX));
  const minZ = Math.min(...regions.map((r) => r.minZ));
  const maxZ = Math.max(...regions.map((r) => r.maxZ));

  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxZ - minZ);

  controls.target.set(cx, 0, cz);
  camera.position.set(
    cx + span * 0.62,
    Math.max(35, span * 0.72),
    cz + span * 0.88
  );
}

$("#focus-map").addEventListener("click", centerCamera);

function integritySummary() {
  if (!currentBuilt || !currentDefinition) return;

  const plateauCount = Number(currentDefinition.plateauCount) || 0;
  const terrainCount = currentDefinition.terrainUrls?.length || 0;
  const zonesCount = currentDefinition.zones?.length || 0;
  const regionsCount = currentBuilt.walkableRegions?.length || 0;

  const ok =
    plateauCount === terrainCount &&
    plateauCount === zonesCount &&
    plateauCount === regionsCount;

  $("#integrity-state").textContent =
    `${ok ? "✓" : "⚠"} Topologie ${plateauCount}/${terrainCount}/${zonesCount}/${regionsCount}`;
}

async function renderDefinition(definition, options = {}) {
  clearCurrentMap();

  currentDefinition = BF.MapIntegrity.prepareDefinition(definition, {
    preserveLegacyFive: options.preserveLegacyFive === true
  });

  currentBuilt = BF.buildMap(THREE, currentDefinition, {}, renderer);
  scene.add(currentBuilt.group);
  await currentBuilt.ready;

  currentBuilt.group.traverse((object) => {
    if (
      object.userData?.customMicroSceneId &&
      object.parent === currentBuilt.group
    ) {
      object.userData.initial ||= {
        position: object.position.clone(),
        rotation: object.rotation.clone()
      };
      customSceneInstances.push({
        id: object.userData.customMicroSceneId,
        root: object
      });
    }
  });

  integritySummary();
  centerCamera();

  setState(
    `${currentDefinition.name} · ${currentDefinition.plateauCount} plateau` +
    `${currentDefinition.plateauCount > 1 ? "x" : ""}`
  );
}

$("#load-template").addEventListener("click", async () => {
  updateTemplateInfo();
  if (!selectedTemplate) return;

  await renderDefinition(clone(selectedTemplate), {
    preserveLegacyFive: true
  });
  toast("Modèle moteur affiché sans modification.");
});

function allCatalogTerrainUrls() {
  const catalog = window.BLUEFOX_MAP_ASSETS?.catalog;
  return [...new Set(
    [
      ...(catalog?.maps || []).flatMap((map) =>
        (map.terrains || []).map((terrain) => terrain.url)
      ),
      ...(catalog?.orphanTerrains || []).map((terrain) => terrain.url)
    ].filter(Boolean)
  )];
}

function randomTextureCycle(count) {
  const pool = allCatalogTerrainUrls();
  if (!pool.length) return [];
  return Array.from({ length: count }, () =>
    pool[Math.floor(Math.random() * pool.length)]
  );
}

function associatedTextureCycle(template, count) {
  const terrains = templateTerrainUrls(template);
  if (!terrains.length) {
    return [...(window.BLUEFOX_MAP_ASSETS?.fallbackTerrainUrls || [])]
      .slice(0, Math.max(1, count));
  }

  return Array.from(
    { length: count },
    (_, index) => terrains[index % terrains.length]
  );
}

const mapBudgets = BF.ObjectSpawner.mapObjectBudgets || {};

function currentBudgetRange() {
  const count = Number($("#plateau-count").value) || 1;
  return mapBudgets[count] || {
    min: 60,
    max: 75,
    resourcesMin: 14,
    resourcesMax: 20
  };
}

function syncBudgetInputs(reset = false) {
  const budget = currentBudgetRange();
  const objectInput = $("#object-count-budget");
  const resourceInput = $("#resource-count-budget");

  objectInput.min = budget.min;
  objectInput.max = budget.max;
  resourceInput.min = budget.resourcesMin;
  resourceInput.max = budget.resourcesMax;

  if (
    reset ||
    !Number.isFinite(Number(objectInput.value)) ||
    Number(objectInput.value) < budget.min ||
    Number(objectInput.value) > budget.max
  ) {
    objectInput.value = Math.round((budget.min + budget.max) / 2);
  }

  if (
    reset ||
    !Number.isFinite(Number(resourceInput.value)) ||
    Number(resourceInput.value) < budget.resourcesMin ||
    Number(resourceInput.value) > budget.resourcesMax
  ) {
    resourceInput.value = Math.round(
      (budget.resourcesMin + budget.resourcesMax) / 2
    );
  }

  updateEffectiveBudget();
}

function effectiveBudgetValues() {
  const budget = currentBudgetRange();
  const density = Number($("#object-density").value) / 100;

  const baseObjects = Number($("#object-count-budget").value);
  const baseResources = Number($("#resource-count-budget").value);

  // MAP_Test doit pouvoir tester une densité inférieure ou supérieure à la
  // plage native. ObjectSpawner reconnaît explicitement ce contrat CUSTOM.
  const targetObjects = THREE.MathUtils.clamp(
    Math.round(baseObjects * density),
    1,
    budget.max * 2
  );

  const resources = THREE.MathUtils.clamp(
    Math.round(baseResources * density),
    0,
    targetObjects
  );

  return {
    density,
    targetObjects,
    resources,
    range: budget
  };
}

function updateEffectiveBudget() {
  const values = effectiveBudgetValues();

  $("#object-density-value").value =
    `${Math.round(values.density * 100)} %`;

  $("#effective-budget").textContent =
    `Effectif envoyé au moteur : ${values.targetObjects} objets, ` +
    `${values.resources} ressources · référence native ` +
    `${values.range.min}–${values.range.max} / ` +
    `${values.range.resourcesMin}–${values.range.resourcesMax}.`;
}

$("#plateau-count").addEventListener("change", () => syncBudgetInputs(true));
$("#object-count-budget").addEventListener("input", updateEffectiveBudget);
$("#resource-count-budget").addEventListener("input", updateEffectiveBudget);

$("#object-density").addEventListener("input", updateEffectiveBudget);

$("#generate-variant").addEventListener("click", async () => {
  updateTemplateInfo();
  if (!selectedTemplate) return toast("Sélectionnez un modèle moteur.");

  const count = Number($("#plateau-count").value);
  const randomTextures = $("#random-textures").checked;
  const density = Number($("#object-density").value) / 100;

  const definition = clone(selectedTemplate);
  definition.id = `map-test-preview-${Date.now()}`;
  definition.name = `MAP_Test · ${selectedTemplate.name}`;
  definition.generated = true;
  definition.preview = true;
  definition.plateauCount = count;
  definition.zones = Array.from({ length: count }, (_, index) => `Plateau ${index + 1}`);

  definition.terrainUrls = randomTextures
    ? randomTextureCycle(count)
    : associatedTextureCycle(selectedTemplate, count);

  definition.terrainUrl = definition.terrainUrls[0] || selectedTemplate.terrainUrl;

  const effective = effectiveBudgetValues();
  const requestedObjects = effective.targetObjects;
  const requestedResources = effective.resources;

  definition.populationBudget = {
    targetObjects: requestedObjects,
    resources: requestedResources,
    allowCustomRange: true
  };

  definition.generator ||= {};
  definition.generator.mapTest = {
    baseTemplateId: selectedTemplate.id,
    densityMultiplier: density,
    randomTextures,
    texturePolicy: randomTextures
      ? "map-test-random-exception"
      : "engine-associated-repeat"
  };

  await renderDefinition(definition);
  toast(
    randomTextures
      ? "Variante générée avec exception textures aléatoires."
      : "Variante générée avec les textures du modèle."
  );
});

const microSceneCatalog = $("#micro-scene-catalog");
BF.MicroScenes.list()
  .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, "fr"))
  .forEach((template) => {
    microSceneCatalog.add(
      new Option(
        `${template.name || template.id} · ${template.objects.length} objets`,
        template.id
      )
    );
  });

function renderQueue() {
  $("#scene-queue").replaceChildren(...queue.map((id, index) => {
    const item = document.createElement("li");
    item.textContent = `${index + 1}. ${BF.MicroScenes.get(id)?.name || id}`;

    const remove = document.createElement("button");
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      queue.splice(index, 1);
      renderQueue();
    });

    item.append(remove);
    return item;
  }));
}

$("#add-scene").addEventListener("click", () => {
  if (microSceneCatalog.value) queue.push(microSceneCatalog.value);
  renderQueue();
});

function registerSpawnedRecord(record) {
  if (
    record.instance?.hitbox &&
    !currentBuilt.interactables.includes(record.instance.hitbox)
  ) {
    currentBuilt.interactables.push(record.instance.hitbox);
  }

  (record.instance?.colliders || []).forEach((collider) => {
    const transformRoot = record.objectRoot || record.root;
    transformRoot.updateWorldMatrix(true, false);
    currentBuilt.colliders.push({
      position: transformRoot.localToWorld(collider.offset.clone()),
      radius: collider.radius,
      owner: record.root
    });
  });
}

function addCustomMicroScene(id, index) {
  const template = BF.MicroScenes.get(id);
  if (!template || !currentBuilt || !currentDefinition) return false;

  const anchor = BF.PersistentMicroScenes.findSafeAnchor(
    currentBuilt,
    currentDefinition,
    Number(template.radius) || 7
  );

  if (!anchor) return false;

  const root = new THREE.Group();
  root.position.set(anchor.x, anchor.y || 0, anchor.z);
  root.userData.customMicroSceneId = id;
  root.userData.customMicroSceneIndex = index;
  root.userData.custom = true;
  root.userData.initial = {
    position: root.position.clone(),
    rotation: root.rotation.clone()
  };

  currentBuilt.group.add(root);

  const spawner = new BF.ObjectSpawner({
    THREE,
    scene: root,
    palette: currentDefinition.palette
  });

  const records = spawner.spawnMicroScene(id, {
    origin: { x: 0, y: 0, z: 0 },
    scene: root,
    force: true,
    source: `map-test:custom:${id}`
  });

  records.forEach((record) => {
    record.root.userData.custom = true;
    registerSpawnedRecord(record);
  });

  customSceneInstances.push({ id, root, records });
  return true;
}

$("#validate-map").addEventListener("click", () => {
  if (!currentBuilt) return toast("Chargez ou générez d'abord une map.");

  let added = 0;
  queue.forEach((id, index) => {
    if (addCustomMicroScene(id, customSceneInstances.length + index)) {
      added += 1;
    }
  });

  queue = [];
  renderQueue();
  toast(`${added} micro-scène(s) ajoutée(s).`);
});

function setPointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
}

function rootFrom(object) {
  let current = object;
  while (current && !current.userData?.customMicroSceneId) {
    current = current.parent;
  }
  return current || null;
}

function updateTransform() {
  $("#selection-name").textContent = selectedScene
    ? selectedScene.userData.customMicroSceneId
    : "Aucune micro-scène sélectionnée";

  document.querySelectorAll(".axis[data-axis]").forEach((row) => {
    row.querySelector("output").textContent = selectedScene
      ? `${Math.round(THREE.MathUtils.radToDeg(selectedScene.rotation[row.dataset.axis]))}°`
      : "0°";
  });

  $(".axis.height output").textContent = selectedScene
    ? selectedScene.position.y.toFixed(2)
    : "0.00";
}

function zoneMeshes() {
  return currentBuilt?.group?.children?.filter((child) =>
    child.name?.startsWith("Zone:")
  ) || [];
}

function groundPoint(event) {
  setPointer(event);
  return raycaster.intersectObjects(zoneMeshes(), false)[0]?.point || null;
}

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !moveMode) return;

  setPointer(event);

  const hit = raycaster.intersectObjects(
    customSceneInstances.map((entry) => entry.root),
    true
  )[0];

  const root = hit && rootFrom(hit.object);
  if (!root) return;

  selectedScene = root;
  drag = { root, pointerId: event.pointerId };
  canvas.setPointerCapture(event.pointerId);
  updateTransform();
});

canvas.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const point = groundPoint(event);
  if (!point) return;

  drag.root.position.x = point.x;
  drag.root.position.z = point.z;
  updateTransform();
});

canvas.addEventListener("pointerup", (event) => {
  if (!drag) return;
  canvas.releasePointerCapture(event.pointerId);
  drag = null;
});

canvas.addEventListener("contextmenu", (event) => event.preventDefault());

$("#move-mode").addEventListener("click", (event) => {
  moveMode = !moveMode;
  event.currentTarget.setAttribute("aria-pressed", String(moveMode));
  event.currentTarget.textContent =
    moveMode ? "Déplacement actif" : "Déplacer les micro-scènes";
});

document.querySelectorAll(".axis[data-axis] button").forEach((button) => {
  button.addEventListener("click", () => {
    if (!selectedScene) return;

    selectedScene.rotation[button.closest(".axis").dataset.axis] +=
      THREE.MathUtils.degToRad(Number(button.dataset.step));

    updateTransform();
  });
});

document.querySelectorAll("[data-height]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!selectedScene) return;

    selectedScene.position.y = THREE.MathUtils.clamp(
      selectedScene.position.y + Number(button.dataset.height),
      -1,
      18
    );
    updateTransform();
  });
});

$("#reset-scene").addEventListener("click", () => {
  if (!selectedScene) return;
  selectedScene.position.copy(selectedScene.userData.initial.position);
  selectedScene.rotation.copy(selectedScene.userData.initial.rotation);
  updateTransform();
});

const slug = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42) || "map-sans-nom";

async function refreshIndex() {
  try {
    const response = await fetch("/api/custom-maps/next-index");
    const result = await response.json();

    $("#map-index").textContent =
      `${String(result.number).padStart(2, "0")}-${slug($("#map-name").value)}`;
  } catch {
    $("#map-index").textContent = "attribué lors de la sauvegarde";
  }
}

function downloadMapPayload(payload) {
  const exportPayload = {
    format: "bluefox-custom-map",
    version: 1,
    exportedAt: new Date().toISOString(),
    map: payload
  };
  const blob = new Blob(
    [JSON.stringify(exportPayload, null, 2)],
    { type: "application/json;charset=utf-8" }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `MAP-CUSTOM-${payload.slug}.json`;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return link.download;
}

$("#map-name").addEventListener("input", refreshIndex);

$("#save-map").addEventListener("click", async () => {
  const name = $("#map-name").value.trim();

  if (!name) return toast("Saisissez un nom de map.");
  if (!currentDefinition) return toast("Aucune map à sauvegarder.");

  const payload = {
    name,
    slug: slug(name),
    plateauCount: currentDefinition.plateauCount,
    profile: currentDefinition.profile,
    palette: currentDefinition.palette,
    terrainUrls: [...currentDefinition.terrainUrls],
    sceneUrl: currentDefinition.sceneUrl || null,
    seed: Number(currentDefinition.seed) ||
      Math.floor(Math.random() * 2147483647) + 1,

    populationBudget: currentDefinition.populationBudget
      ? {
          targetObjects: Number(currentDefinition.populationBudget.targetObjects),
          resources: Number(currentDefinition.populationBudget.resources),
          allowCustomRange:
            currentDefinition.populationBudget.allowCustomRange === true
        }
      : null,

    // Le registre custom conserve le tag custom du moteur.
    traits: [
      ...(currentDefinition.traits || []),
      { id: "custom", label: "composition personnalisée" }
    ],

    microScenes: customSceneInstances.map((entry) => ({
      id: entry.id,
      position: [
        entry.root.position.x,
        entry.root.position.y,
        entry.root.position.z
      ].map((value) => Number(value.toFixed(4))),
      rotation: [
        entry.root.rotation.x,
        entry.root.rotation.y,
        entry.root.rotation.z
      ].map((value) => Number(value.toFixed(6)))
    })),

    editor: {
      baseTemplateId:
        currentDefinition.generator?.mapTest?.baseTemplateId ||
        selectedTemplate?.id ||
        null,
      densityMultiplier:
        currentDefinition.generator?.mapTest?.densityMultiplier || 1,
      randomTextures:
        currentDefinition.generator?.mapTest?.randomTextures === true
    }
  };

  try {
    const response = await fetch("/api/custom-maps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Sauvegarde refusée");
    }

    $("#map-index").textContent = result.index;
    toast(`${result.index} sauvegardée comme map CUSTOM.`);
    refreshIndex();
  } catch (error) {
    const filename = downloadMapPayload(payload);
    toast(`Serveur indisponible : ${filename} téléchargé.`);
  }
});

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (
    canvas.width !== Math.floor(width * renderer.getPixelRatio()) ||
    canvas.height !== Math.floor(height * renderer.getPixelRatio())
  ) {
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }
}

function loop() {
  requestAnimationFrame(loop);
  resize();
  controls.update();
  BF.SpecialObjectRuntime?.update(scene, clock.getElapsedTime());
  renderer.render(scene, camera);
}

refreshTemplateList();
syncBudgetInputs(true);
refreshIndex();
renderQueue();
loop();
