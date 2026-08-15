const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function runBrowserScript(relativePath, blueFox3D, extras = {}) {
  const context = {
    window: { BlueFox3D: blueFox3D, ...extras.window },
    requestAnimationFrame: extras.requestAnimationFrame || (() => 0),
    setInterval: extras.setInterval || (() => 0),
    clearInterval: extras.clearInterval || (() => {}),
    performance: extras.performance || { now: () => 0 },
    URL,
    ...extras
  };
  context.window.window = context.window;
  vm.runInNewContext(read(relativePath), context, { filename: relativePath });
  return context.window.BlueFox3D;
}

const loadCanonicalBiomeRules = () => runBrowserScript(
  "engine/biome-rules.js",
  {},
  { window: { setTimeout: () => 0 } }
);

test("le jeu charge explicitement les correctifs R3 dans l'ordre de leurs dépendances", () => {
  const html = read("index.html");
  const positions = [
    "object-library-flora-patch.js",
    "cuo-catalog-consistency-r3.js",
    "flora-wind-runtime.js",
    "spore-static-r3.js",
    "biome-rules.js",
    "camera-extended-look.js",
    "plateau-underlay-r3.js",
    "behavior-arbitration-integration.js"
  ].map((name) => {
    const position = html.indexOf(name);
    assert.notEqual(position, -1, `${name} doit être chargé par index.html`);
    return position;
  });
  for (let index = 1; index < positions.length; index += 1) {
    assert.ok(positions[index] > positions[index - 1], "ordre de chargement R3 invalide");
  }
  assert.doesNotMatch(html, /multicorrectif-r3-loader\.js/);
  assert.doesNotMatch(html, /biome-population-policy-r3\.js/);
});

test("la politique canonique est intégrée à biome-rules sans chargeur parallèle", () => {
  const BF = runBrowserScript("engine/biome-rules.js", {}, {
    window: { setTimeout: () => 0 }
  });
  const population = BF.BiomeRules.getMapPopulation({
    id: "map-03",
    number: 3,
    name: "Forêt fongique aux champignons géants",
    profile: "forest",
    traits: [{ id: "fungal", label: "Flore fongique" }],
    plateauCount: 2
  });
  assert.equal(BF.BiomePopulationPolicy.version, "canonical");
  assert.deepEqual(
    Array.from(population.decorations.find(([type]) => type === "giant_mushroom")),
    ["giant_mushroom", 6]
  );
});

test("la politique R3 exclut la verdure aride, les camps spontanés et la faune de départ", () => {
  const BF = loadCanonicalBiomeRules();
  const result = BF.BiomeRules.getMapPopulation({ id: "crystal", profile: "desert", isStartingMap: true });
  const types = result.decorations.map(([type]) => type);
  assert.equal(result.policyVersion, "canonical");
  assert.ok(result.rockCount >= 14);
  assert.ok(types.includes("cactus"));
  assert.ok(!types.includes("tree"));
  assert.ok(!types.includes("fern"));
  assert.ok(!types.includes("pool"));
  assert.ok(!types.includes("base_fire"));
  assert.ok(!types.includes("brouteur"));
  assert.ok(!types.includes("sauteur"));
  assert.ok(!Array.from(result.resourceWeights, ({ family }) => family).includes("energy_crystal"));
});

test("la politique R3 limite une map à un ou deux types de faune", () => {
  const BF = loadCanonicalBiomeRules();
  const result = BF.BiomeRules.getMapPopulation({ id: "forest-42", seed: 42, profile: "forest" });
  const fauna = result.decorations
    .map(([type]) => type)
    .filter((type) => ["brouteur", "sauteur", "small_creature", "patte_creature"].includes(type));
  assert.ok(new Set(fauna).size >= 1);
  assert.ok(new Set(fauna).size <= 2);
});

test("les trois premières maps sont protégées, y compris les définitions statiques", () => {
  const BF = loadCanonicalBiomeRules();
  for (const number of [1, 2, 3]) {
    const result = BF.BiomeRules.getMapPopulation({ id: `start-${number}`, number, profile: "forest" });
    const types = result.decorations.map(([type]) => type);
    assert.ok(!types.includes("small_creature"));
    assert.ok(!types.includes("electrostatic_storm"));
    assert.ok(!types.includes("mobile_islet"));
    assert.ok(!types.includes("abandoned_drone"));
    assert.ok(!types.includes("prismatic_orchid"));
    assert.ok(!Array.from(result.resourceWeights, ({ family }) => family).includes("energy_crystal"));
  }
});

test("les champignons géants restent réservés aux marais et forêts fongiques", () => {
  const library = read("engine/object-library.js");
  assert.match(library, /type: "giant_mushroom", label: "Champignon géant"/);
  assert.match(library, /type === "giant_mushroom"/);
  for (const profile of ["plain", "forest", "desert", "alien"]) {
    const BF = loadCanonicalBiomeRules();
    assert.ok(!BF.BiomeRules.getMapPopulation({ id: profile, profile }).decorations.some(([type]) => type === "giant_mushroom"));
  }
  for (const profile of ["swamp", "fungal"]) {
    const BF = loadCanonicalBiomeRules();
    const giant = BF.BiomeRules.getMapPopulation({ id: profile, profile }).decorations.find(([type]) => type === "giant_mushroom");
    assert.ok(giant);
    assert.ok(giant[1] >= (profile === "fungal" ? 6 : 3));
  }
  const fixedMaps = [
    { id: "map-3", number: 3, name: "Forêt fongique aux champignons géants", profile: "forest", minimum: 6 },
    { id: "map-7", number: 7, name: "Marais d’ambre et végétation aquatique", profile: "aquatic", minimum: 3 },
    { id: "map-8", number: 8, name: "Marais flottant extraterrestre", profile: "aquatic", minimum: 3 }
  ];
  fixedMaps.forEach((definition) => {
    const BF = loadCanonicalBiomeRules();
    const giant = BF.BiomeRules.getMapPopulation(definition).decorations.find(([type]) => type === "giant_mushroom");
    assert.ok(giant, `${definition.name} doit autoriser les champignons géants`);
    assert.ok(giant[1] >= definition.minimum);
  });
  const spawner = read("engine/object-spawner.js");
  assert.match(spawner, /guaranteeGiantMushrooms/);
  assert.match(spawner, /biomeIdentity = fungalMushroomMap/);
  assert.ok(
    spawner.indexOf("guaranteeGiantMushrooms();") <
      spawner.indexOf("let placedRocks = 0"),
    "les champignons identitaires doivent être placés avant le remplissage de la map"
  );
  assert.match(spawner, /fungalMushroomMap \? Math\.max\(2, Math\.min\(6, plateauCount\)\) : 2/);
});

test("MAP_Test conserve un dosage CUSTOM effectif et une sauvegarde hors serveur", () => {
  const mapTest = read("map-test/map-test.js");
  const spawner = read("engine/object-spawner.js");
  const server = read("tools/bluefox-local-server.ps1");
  assert.match(mapTest, /allowCustomRange:\s*true/);
  assert.match(mapTest, /downloadMapPayload/);
  assert.match(mapTest, /URL\.createObjectURL/);
  assert.match(spawner, /allowCustomRange \? 1 : mapBudget\.min/);
  assert.match(spawner, /allowCustomRange \? mapBudget\.max \* 2 : mapBudget\.max/);
  assert.match(server, /populationBudget = \$draft\.populationBudget/);
});

test("les arches gardent deux collisions de piliers et un passage central", () => {
  const library = read("engine/object-library.js");
  assert.match(library, /Vector3\(-1\.55, 0, 0\), radius: 0\.48/);
  assert.match(library, /Vector3\(1\.55, 0, 0\), radius: 0\.48/);
  assert.match(library, /Vector3\(-1\.35,0,0\),radius:0\.4/);
  assert.match(library, /Vector3\(1\.35,0,0\),radius:0\.4/);
});

test("les mondes sous-marins bioluminescents utilisent les trois MSC coralliennes sans arche droite isolée", () => {
  const BF = loadCanonicalBiomeRules();
  const population = BF.BiomeRules.getMapPopulation({
    id: "underwater-bioluminescent",
    name: "Monde sous marin bioluminescent",
    profile: "aquatic",
    traits: [{ id: "bioluminescent", label: "Bioluminescent" }]
  });
  assert.ok(!population.decorations.some(([type]) => type === "arch"));

  const registry = JSON.parse(read("data/custom-micro-scenes.json"));
  const coralScenes = registry.filter(({ id }) => /^MSC-CUSTOM-CORAILBIOLUMINESCENT[123]$/.test(id));
  assert.equal(coralScenes.length, 3);
  assert.deepEqual(Array.from(coralScenes, ({ objects }) => objects.length), [6, 8, 27]);
  coralScenes.forEach((scene) => assert.ok(scene.objects.some(({ type }) => type === "arch")));

  const spawner = read("engine/object-spawner.js");
  coralScenes.forEach(({ id }) => assert.match(spawner, new RegExp(id)));
  assert.match(spawner, /underwaterCoralMicroSceneId/);
});

test("les rochers enneigés restent strictement réservés à la glace, la banquise et la toundra", () => {
  const spawner = read("engine/object-spawner.js");
  assert.match(spawner, /const frozenIdentity/);
  assert.match(spawner, /frozen\|ice\|snow\|glace\|glaciaire\|banquise\|neige\|toundra/);
  assert.match(spawner, /frozenRockContext && snowRockTypes\.has\(type\)/);
  assert.doesNotMatch(spawner, /frozenIdentity[^;]*description/);
});

test("les bassins aquatiques sont ancrés sur les pixels bleus avant affichage", () => {
  const registry = read("engine/map-registry.js");
  assert.match(registry, /attachTerrainColorSampler/);
  assert.match(registry, /isWaterColor/);
  assert.match(registry, /textureGuidedPlacement = "water-blue"/);
  assert.match(registry, /terrainWaterCoverageAt/);
  assert.match(registry, /< 0\.68/);
  assert.ok(registry.indexOf("placePoolsOnWater();") < registry.indexOf("group.visible = true"));
});

test("la partie 4 force les cadences inter-maps sans compteur parallèle", () => {
  const storage = new Map();
  const localStorage = {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  };
  const BF = {
    maps: {
      template: {
        id: "template", number: 20, name: "Template",
        sceneUrl: "Images/scene.png", terrainUrls: ["Images/terrain.png"],
        profile: "alien", traits: []
      }
    },
    MicroScenes: {
      list: () => [
        { id: "MSC-ECO-LUNAR-001", rarity: "common", biomes: ["all"] },
        { id: "MSC-ECO-STAR-001", rarity: "rare", biomes: ["all"] },
        { id: "MSC-ABANDONED-DRONE-001", rarity: "rare", biomes: ["all"] }
      ]
    }
  };
  const context = {
    window: { BlueFox3D: BF, localStorage, performance: { now: () => 0 } },
    Uint32Array, Date, Math, JSON, Object, Set, Map
  };
  context.window.window = context.window;
  vm.runInNewContext(read("engine/map-generation-rules.js"), context);
  vm.runInNewContext(read("engine/map-generator.js"), context);

  const generated = [];
  for (let ordinal = 1; ordinal <= 20; ordinal += 1) {
    generated.push(BF.MapGenerator.generate({
      ordinal,
      discoveryIndex: ordinal,
      planetSeed: 424242,
      direction: "north",
      lowMissionProgress: true
    }));
  }
  const rareIds = new Set(BF.MapGenerationRules.discoveryCadence.rareBiomeIds);
  let lastRare = 0;
  generated.forEach((definition, index) => {
    const ordinal = index + 1;
    if (rareIds.has(definition.generator.biomeId)) {
      if (lastRare >= 3) assert.ok(ordinal - lastRare <= 8);
      lastRare = ordinal;
    }
  });
  assert.ok(generated.some((definition) => definition.generator.cadence.rareBiomeForced));
  assert.ok(generated.some((definition) => definition.generator.cadence.decorativeGuaranteed));
  assert.ok(generated.some((definition) => definition.generator.cadence.remarkableGuaranteed));
  assert.ok(generated.some((definition) => definition.generator.cadence.missionOpportunityPreferred));
  assert.ok(generated.every((definition) =>
    definition.generator.cadence.northernFrozenAffinityApplied
  ));

  const spawner = read("engine/object-spawner.js");
  assert.match(spawner, /featuredGeneratedScene/);
  assert.ok(
    spawner.indexOf("featuredGeneratedScene") <
    spawner.indexOf("generatedSpecialScenes.length && next() < specialChance")
  );
});

test("le correctif de proximité choisit réellement la cible la plus proche", () => {
  const origin = { distanceTo: (position) => Math.abs(position.x) };
  const engine = { character: { root: { position: origin } } };
  const BF = runBrowserScript("engine/nearest-interaction-r3.js", { currentEngine: engine });
  const near = { position: { x: 2 } };
  const far = { position: { x: 18 } };
  assert.equal(engine.pickNearestInteractable([far, near]), near);
  assert.equal(BF.NearestInteractionPolicy.version, "nearest-r3");
});

test("les chemins restent dégagés et les volumes rouges renforcent les coutures", () => {
  const spawner = read("engine/object-spawner.js");
  const hierarchy = read("engine/map-population-hierarchy.js");
  assert.match(spawner, /large: \{ mapEdge: 0\.56, plateauEdge: 0\.36, center: 0\.08 \}/);
  assert.match(spawner, /radius \+ 2\.65/);
  assert.match(spawner, /seamJitter/);
  assert.match(spawner, /plateauCount === 4 \|\| plateauCount === 6/);
  assert.match(spawner, /Math\.abs\(x - mapCenter\.x\)/);
  assert.match(spawner, /Math\.abs\(z - mapCenter\.z\)/);
  assert.match(spawner, /isReserved\(x, z, radius, "rock"\)/);
  assert.match(spawner, /isReserved\(x, z, radius, "giant_mushroom"\)/);
  assert.match(spawner, /type === "lantern_mushrooms"/);
  assert.match(spawner, /plateauCount \* 8/);
  assert.match(spawner, /type === "spore"/);
  assert.match(spawner, /plateauCount \* 14/);
  assert.match(spawner, /Math\.max\(2, Math\.min\(6, plateauCount\)\)/);
  assert.match(read("engine/biome-rules.js"), /addOrRaise\(dec,"spore",26\)/);
  assert.match(hierarchy, /stat\.rocks\.length \* 0\.72/);
  assert.match(hierarchy, /edgeDistance <= 5\.8/);
});

test("la caméra et le glissement de la carte Planète persistent pendant la partie", () => {
  const camera = read("engine/camera-controller.js");
  const world = read("engine/world-engine.js");
  const planet = read("engine/ui-enhancements.js");
  const css = read("engine/ui-enhancements.css");
  const globeCss = read("engine/planet-globe-ui.css");
  assert.match(camera, /captureViewState\(\)/);
  assert.match(camera, /restoreViewState\(state\)/);
  assert.match(world, /preservedCameraView/);
  assert.match(world, /restoreViewState\(preservedCameraView\)/);
  assert.match(planet, /PlanetMapViewState/);
  assert.doesNotMatch(planet, /bluefox_planet_map_view_v1/);
  assert.match(planet, /planet-map-marker \$\{type\}/);
  assert.match(planet, /\["bluefox", "Position de BlueFox"\]/);
  assert.match(planet, /\["camp", "Camp de base"\]/);
  assert.doesNotMatch(planet, /dataset\.centeredMap/);
  assert.match(css, /position: sticky;/);
  assert.match(css, /margin-top: -54px;/);
  assert.match(css, /bluefox-map-icon\.png/);
  assert.match(globeCss, /align-self: start !important;/);
  assert.match(globeCss, /margin-top: -54px !important;/);
  assert.match(globeCss, /max-height: calc\(100vh - 12px\) !important;/);
});

test("le réglage de survie rembourse une partie du coût sans créer d'énergie", () => {
  const state = { rest: 80, food: 70 };
  const survival = {
    state,
    recordAction() {
      state.rest -= 10;
      state.food -= 4;
      return "ok";
    }
  };
  const BF = runBrowserScript("engine/survival-tuning-r3.js", { survival });
  assert.equal(BF.survival.recordAction("collect"), "ok");
  assert.equal(state.rest, 74.5);
  assert.equal(state.food, 67.8);
});
