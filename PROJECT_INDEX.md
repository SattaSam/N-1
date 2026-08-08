# Index du projet — N-1

_Généré automatiquement le 08/08/2026 à 04:03:49._

## Résumé

- Fichiers : **274**
- Taille totale : **379.74 Mo**
- Lignes de texte/code : **44990**

### Répartition par catégorie

| Catégorie | Nombre |
|---|---:|
| Asset | 122 |
| Autre | 26 |
| Texte / Code | 126 |

## Arborescence

```text
N-1
├── game.css
├── game.js
├── generate_project_index.py
├── index.html
├── index.html.before-bible-runtime-v0-validated.bak
├── index.html.before-missions-cumulative-v1.bak
├── INSTALLER_MISSIONS_CUMULATIVE_V1.bat
├── INSTALLER_MISSIONS_CUMULATIVE_V1.ps1
├── journal.css
├── LANCER_BLUEFOX.bat
├── LANCER_CUO_LAB.bat
├── LANCER_MAP_TEST.bat
├── map-assets.js
├── README_LANCEMENT.txt
├── assets
│   ├── Capsule.png
│   ├── maps
│   │   └── CONVENTION_IMAGES.txt
│   ├── models
│   │   └── BlueFox_Capsule_Depart.glb
│   └── planet
│       ├── planet_texture_01.png
│       ├── planet_texture_02.png
│       └── planet_texture_main.png
├── css
│   └── style.css
├── cuo-lab
│   ├── cuo-lab.css
│   ├── cuo-lab.js
│   ├── index.html
│   ├── README.md
│   └── vendor
│       ├── BufferGeometryUtils.js
│       ├── GLTFLoader.js
│       ├── OrbitControls.js
│       ├── three.core.min.js
│       └── three.module.min.js
├── data
│   ├── bible-catalog.js
│   ├── bible-patterns.js
│   ├── config.json
│   ├── custom-maps.js
│   ├── custom-maps.json
│   ├── custom-micro-scenes.js
│   └── custom-micro-scenes.json
├── docs
│   ├── ARCHITECTURE_TECHNIQUE.md
│   ├── BlueFox_Architecture_de_Reference_du_Projet_ARP_v1.docx
│   ├── BlueFox_ARP_MAJ_2026-08-08.docx
│   ├── BlueFox_BAC_CUM_v2_Architecture_Fonctionnelle_v0.1.docx
│   ├── BlueFox_Bible_Documentaire_Etat_Actuel_MAJ_2026-08-08.docx
│   ├── BlueFox_BIBLE_RECONSTRUITE.docx
│   ├── BlueFox_Cahier_des_Charges_ADDENDUM_2026-08-08.docx
│   ├── BlueFox_CUM_V2_Refonte_Passe_16C_menus_deroulants_restaures.xlsx
│   ├── BlueFox_CUO_v2_Production_complet.xlsx
│   ├── BlueFox_Decisions_2026-07-31.docx
│   ├── BlueFox_Game.glb
│   ├── BlueFox_Methode_Bible_Patrons_Fiches_V1.docx
│   ├── BlueFox_Note_Synchronisation_CUM_CUO_2026-08-08.docx
│   ├── BlueFox_Odyssey_Catalogue_Missions.docx
│   ├── BlueFox_Reference_Methodologie.docx
│   ├── BlueFox_TODO_MAJ_2026-08-08.docx
│   ├── CONVENTIONS_MAPS_IMAGES.md
│   ├── CUM_COMPLET_audit_psychologique.xlsx
│   ├── CUO_BANC_VALIDATION_3D.md
│   ├── DEV_HISTORIQUE.md
│   ├── GENERER_CATALOGUE_IMAGES.bat
│   ├── MASTER.md
│   ├── README.txt
│   ├── Reference_BlueFox_2026-08-03.md
│   ├── ROADMAP_TODO.md
│   ├── TODO.md
│   └── correctifs_valides
│       ├── BlueFox_Missions_Cumulative_Validated_V1_GitHubBase.zip
│       └── README_CORRECTIFS.txt
├── engine
│   ├── action-bridge.js
│   ├── action-bridge.js.before-missions-cumulative-v1.bak
│   ├── behavior-arbitration-core.js
│   ├── behavior-arbitration-integration.js
│   ├── bible-runtime.js
│   ├── biome-rules.js
│   ├── bluefox3d-core.js
│   ├── camera-controller.js
│   ├── character-controller.js
│   ├── custom-map-registry.js
│   ├── exploration-hud.css
│   ├── fauna-runtime.js
│   ├── flora-runtime.js
│   ├── flora-wind-runtime.js
│   ├── inventory-capacity-ai.js
│   ├── inventory-ui-bridge.css
│   ├── inventory-ui-bridge.js
│   ├── map-exploration-tracker.js
│   ├── map-generation-rules.js
│   ├── map-generator.js
│   ├── map-population-hierarchy.js
│   ├── map-registry.js
│   ├── micro-scenes.js
│   ├── mission-aware-analysis.js
│   ├── mission-catalog.js
│   ├── mission-empty-core.js
│   ├── mission-empty-core.js.before-bible-runtime-v0-validated.bak
│   ├── mission-manager.js
│   ├── mission-manager.js.before-bible-runtime-v0-validated.bak
│   ├── mission-manager.js.before-missions-cumulative-v1.bak
│   ├── mission-memory.js
│   ├── mission-memory.js.before-bible-runtime-v0-validated.bak
│   ├── mission-planner.js
│   ├── mission-tree.js
│   ├── mission-types.js
│   ├── mission-ui-bridge.css
│   ├── mission-ui-bridge.js
│   ├── npc-runtime.js
│   ├── object-event-registry.js
│   ├── object-library-flora-patch.js
│   ├── object-library-p2-1.js
│   ├── object-library.js
│   ├── object-m0-bridge.js
│   ├── object-m0-bridge.js.before-bible-runtime-v0-validated.bak
│   ├── object-m0-bridge.js.before-missions-cumulative-v1.bak
│   ├── object-spawner.js
│   ├── offline-progression.js
│   ├── passive-object-runtime.js
│   ├── path-planner.js
│   ├── persistence-write-buffer.js
│   ├── phenomenon-runtime.js
│   ├── planet-globe-ui.css
│   ├── planet-globe-ui.js
│   ├── planet-topology-ui.js
│   ├── position-save-throttle.js
│   ├── procedural-variants.js
│   ├── progression-multisystem.js
│   ├── progression-registry.js
│   ├── runtime-budget.js
│   ├── save-ui-bridge.css
│   ├── save-ui-bridge.js
│   ├── settings-ui-bridge.css
│   ├── settings-ui-bridge.js
│   ├── special-object-runtime.js
│   ├── start-map-crystal.js
│   ├── survival-ai-bridge.js
│   ├── tutorial-test-bridge.js
│   ├── ui-enhancements.css
│   ├── ui-enhancements.js
│   ├── vegetation-performance.js
│   ├── world-engine.js
│   └── world-topology-v3.js
├── Images
│   ├── .2Jungle envahissant les ruines d’une civilisation.png.HQIbXc
│   ├── 010_1.png
│   ├── 010_2.png
│   ├── 010_3.png
│   ├── 011_1.png
│   ├── 011_2.png
│   ├── 011_3.png
│   ├── 012-1.png
│   ├── 012-2.png
│   ├── 012_2.png
│   ├── 013_1.png
│   ├── 013_2.png
│   ├── 013_3.png
│   ├── 014-1.png
│   ├── 014_2.png
│   ├── 014_3.png
│   ├── 015_1.png
│   ├── 015_2.png
│   ├── 016_1.png
│   ├── 016_2.png
│   ├── 016_3.png
│   ├── 017_1.png
│   ├── 017_2.png
│   ├── 017_3.png
│   ├── 017_4.png
│   ├── 018_1.png
│   ├── 018_2.png
│   ├── 018_3.png
│   ├── 019_1.png
│   ├── 019_2.png
│   ├── 019_3.png
│   ├── 01_1.png
│   ├── 01_2.png
│   ├── 01_3.png
│   ├── 01_4.png
│   ├── 020-1.png
│   ├── 020_2.png
│   ├── 020_3.png
│   ├── 021_1.png
│   ├── 021_2.png
│   ├── 022_1.png
│   ├── 022_2.png
│   ├── 023_1.png
│   ├── 023_2.png
│   ├── 023_3.png
│   ├── 023_4.png
│   ├── 024_1.png
│   ├── 024_2.png
│   ├── 024_3.png
│   ├── 024_4.png
│   ├── 025_1.png
│   ├── 025_2.png
│   ├── 025_3.png
│   ├── 026_1.png
│   ├── 026_2.png
│   ├── 026_3.png
│   ├── 026_4.png
│   ├── 027-2.png
│   ├── 027_1.png
│   ├── 027_3.png
│   ├── 027_5.png
│   ├── 02_1.png
│   ├── 02_2.png
│   ├── 030_0Crash_Crystal.png
│   ├── 03_1.png
│   ├── 03_2.png
│   ├── 04_1.png
│   ├── 04_2.png
│   ├── 04_3.png
│   ├── 05_1.png
│   ├── 05_2.png
│   ├── 05_3.png
│   ├── 05_4.png
│   ├── 06_1.png
│   ├── 06_2.png
│   ├── 07_1.png
│   ├── 07_2.png
│   ├── 07_3.png
│   ├── 08_1.png
│   ├── 08_2.png
│   ├── 08_3.png
│   ├── 08_4.png
│   ├── 09_1.png
│   ├── 09_2.png
│   ├── 09_3.png
│   ├── 10Landes vitrifiées aux herbes rouges et mousses pâles.png
│   ├── 11Plaine rocheuse à végétation éparse.png
│   ├── 12Désert cristallin au sol craquelé .png
│   ├── 13Monde cristallin monumental.png
│   ├── 14Désert magnétique aux roches en lévitation.png
│   ├── 15Désert de dunes extraterrestres.png
│   ├── 16Désert aride avec oasis opaline.png
│   ├── 17Monde volcanique et rivières de lave.png
│   ├── 18Banquise fracturée et cavernes de glace.png
│   ├── 19Toundra extraterrestre enneigée.png
│   ├── 1Crystal site du crash.png
│   ├── 1Jungle extraterrestre bioluminescente.png
│   ├── 20Archipel tropical extraterrestre.png
│   ├── 21Côte tropicale et grandes plages .png
│   ├── 22Côte de galets et falaises sombres.png
│   ├── 23Monde sous-marin bioluminescent.png
│   ├── 24Mégalopole extraterrestre abandonnée et reconquise par la nature.png
│   ├── 25Îles flottantes et cascades aériennes.png
│   ├── 26Zone de magnetisme.png
│   ├── 27Zone de curiosity.png
│   ├── 28Zone de Magetisme.png
│   ├── 2Jungle envahissant les ruines d’une civilisation.png
│   ├── 3Forêt fongique aux champignons géants.png
│   ├── 4Savane.png
│   ├── 5Prairie céladon aux végétaux en voiles2.png
│   ├── 6Forêt d’ambre aux arbres et racines luminescentes.png
│   ├── 7Marais d’ambre et végétation aquatique.png
│   ├── 8Marais flottant extraterrestre.png
│   ├── 9Steppe de verre et failles turquoise.png
│   ├── Capsule.png
│   ├── images-catalog.js
│   ├── images.txt
│   └── LISEZ_MOI.txt
├── map-test
│   ├── index.html
│   ├── map-test.css
│   ├── map-test.js
│   └── README.md
├── reference
│   └── image_annotee.png
├── saves
│   ├── autosave-1.json
│   ├── autosave-2.json
│   ├── autosave-3.json
│   ├── autosave-4.json
│   ├── autosave-5.json
│   ├── autosave.json
│   ├── recovery.json
│   └── slot-1.json
├── tests
│   ├── exploration-mission-routing.test.js
│   ├── map-exploration-tracker.test.js
│   └── map-test-evolution-preset.test.js
└── tools
    ├── bluefox-local-server.ps1
    ├── generer-catalogue-images.mjs
    └── generer-catalogue-images.ps1
```

## Tous les fichiers

| Chemin | Catégorie | Taille | Lignes |
|---|---|---:|---:|
| `assets/Capsule.png` | Asset | 4.04 Mo |  |
| `assets/maps/CONVENTION_IMAGES.txt` | Texte / Code | 1.43 Ko | 36 |
| `assets/models/BlueFox_Capsule_Depart.glb` | Asset | 1.97 Mo |  |
| `assets/planet/planet_texture_01.png` | Asset | 2.83 Mo |  |
| `assets/planet/planet_texture_02.png` | Asset | 1.85 Mo |  |
| `assets/planet/planet_texture_main.png` | Asset | 3.02 Mo |  |
| `css/style.css` | Texte / Code | 1.74 Ko | 23 |
| `cuo-lab/cuo-lab.css` | Texte / Code | 3.92 Ko | 1 |
| `cuo-lab/cuo-lab.js` | Texte / Code | 14.21 Ko | 50 |
| `cuo-lab/index.html` | Texte / Code | 5.20 Ko | 53 |
| `cuo-lab/README.md` | Texte / Code | 2.39 Ko | 39 |
| `cuo-lab/vendor/BufferGeometryUtils.js` | Texte / Code | 34.71 Ko | 1435 |
| `cuo-lab/vendor/GLTFLoader.js` | Texte / Code | 111.96 Ko | 4886 |
| `cuo-lab/vendor/OrbitControls.js` | Texte / Code | 37.80 Ko | 1860 |
| `cuo-lab/vendor/three.core.min.js` | Texte / Code | 371.46 Ko | 6 |
| `cuo-lab/vendor/three.module.min.js` | Texte / Code | 330.89 Ko | 6 |
| `data/bible-catalog.js` | Texte / Code | 3.80 Ko | 118 |
| `data/bible-patterns.js` | Texte / Code | 1.38 Ko | 31 |
| `data/config.json` | Texte / Code | 238 o | 16 |
| `data/custom-maps.js` | Texte / Code | 1.48 Ko | 77 |
| `data/custom-maps.json` | Texte / Code | 1.46 Ko | 77 |
| `data/custom-micro-scenes.js` | Texte / Code | 20.70 Ko | 1 |
| `data/custom-micro-scenes.json` | Texte / Code | 39.38 Ko | 1958 |
| `docs/ARCHITECTURE_TECHNIQUE.md` | Texte / Code | 13.29 Ko | 381 |
| `docs/BlueFox_Architecture_de_Reference_du_Projet_ARP_v1.docx` | Autre | 37.00 Ko |  |
| `docs/BlueFox_ARP_MAJ_2026-08-08.docx` | Autre | 36.95 Ko |  |
| `docs/BlueFox_BAC_CUM_v2_Architecture_Fonctionnelle_v0.1.docx` | Autre | 36.71 Ko |  |
| `docs/BlueFox_Bible_Documentaire_Etat_Actuel_MAJ_2026-08-08.docx` | Autre | 56.56 Ko |  |
| `docs/BlueFox_BIBLE_RECONSTRUITE.docx` | Autre | 54.65 Ko |  |
| `docs/BlueFox_Cahier_des_Charges_ADDENDUM_2026-08-08.docx` | Autre | 36.77 Ko |  |
| `docs/BlueFox_CUM_V2_Refonte_Passe_16C_menus_deroulants_restaures.xlsx` | Autre | 551.56 Ko |  |
| `docs/BlueFox_CUO_v2_Production_complet.xlsx` | Autre | 47.87 Ko |  |
| `docs/BlueFox_Decisions_2026-07-31.docx` | Autre | 37.20 Ko |  |
| `docs/BlueFox_Game.glb` | Asset | 9.10 Mo |  |
| `docs/BlueFox_Methode_Bible_Patrons_Fiches_V1.docx` | Autre | 36.57 Ko |  |
| `docs/BlueFox_Note_Synchronisation_CUM_CUO_2026-08-08.docx` | Autre | 36.30 Ko |  |
| `docs/BlueFox_Odyssey_Catalogue_Missions.docx` | Autre | 51.71 Ko |  |
| `docs/BlueFox_Reference_Methodologie.docx` | Autre | 36.09 Ko |  |
| `docs/BlueFox_TODO_MAJ_2026-08-08.docx` | Autre | 37.24 Ko |  |
| `docs/CONVENTIONS_MAPS_IMAGES.md` | Texte / Code | 2.83 Ko | 84 |
| `docs/correctifs_valides/BlueFox_Missions_Cumulative_Validated_V1_GitHubBase.zip` | Asset | 6.11 Ko |  |
| `docs/correctifs_valides/README_CORRECTIFS.txt` | Texte / Code | 682 o | 7 |
| `docs/CUM_COMPLET_audit_psychologique.xlsx` | Autre | 229.72 Ko |  |
| `docs/CUO_BANC_VALIDATION_3D.md` | Texte / Code | 5.28 Ko | 137 |
| `docs/DEV_HISTORIQUE.md` | Texte / Code | 7.39 Ko | 172 |
| `docs/GENERER_CATALOGUE_IMAGES.bat` | Texte / Code | 348 o | 14 |
| `docs/MASTER.md` | Texte / Code | 8.12 Ko | 218 |
| `docs/README.txt` | Texte / Code | 356 o | 9 |
| `docs/Reference_BlueFox_2026-08-03.md` | Texte / Code | 1.59 Ko | 52 |
| `docs/ROADMAP_TODO.md` | Texte / Code | 6.42 Ko | 126 |
| `docs/TODO.md` | Texte / Code | 5.22 Ko | 131 |
| `engine/action-bridge.js` | Texte / Code | 7.12 Ko | 184 |
| `engine/action-bridge.js.before-missions-cumulative-v1.bak` | Autre | 6.70 Ko |  |
| `engine/behavior-arbitration-core.js` | Texte / Code | 30.92 Ko | 957 |
| `engine/behavior-arbitration-integration.js` | Texte / Code | 13.27 Ko | 301 |
| `engine/bible-runtime.js` | Texte / Code | 15.32 Ko | 508 |
| `engine/biome-rules.js` | Texte / Code | 28.13 Ko | 382 |
| `engine/bluefox3d-core.js` | Texte / Code | 1.77 Ko | 54 |
| `engine/camera-controller.js` | Texte / Code | 12.56 Ko | 359 |
| `engine/character-controller.js` | Texte / Code | 21.01 Ko | 566 |
| `engine/custom-map-registry.js` | Texte / Code | 2.70 Ko | 50 |
| `engine/exploration-hud.css` | Texte / Code | 4.00 Ko | 204 |
| `engine/fauna-runtime.js` | Texte / Code | 11.95 Ko | 330 |
| `engine/flora-runtime.js` | Texte / Code | 10.11 Ko | 288 |
| `engine/flora-wind-runtime.js` | Texte / Code | 8.18 Ko | 274 |
| `engine/inventory-capacity-ai.js` | Texte / Code | 4.38 Ko | 180 |
| `engine/inventory-ui-bridge.css` | Texte / Code | 1.14 Ko | 69 |
| `engine/inventory-ui-bridge.js` | Texte / Code | 15.14 Ko | 399 |
| `engine/map-exploration-tracker.js` | Texte / Code | 11.99 Ko | 318 |
| `engine/map-generation-rules.js` | Texte / Code | 11.03 Ko | 245 |
| `engine/map-generator.js` | Texte / Code | 10.83 Ko | 308 |
| `engine/map-population-hierarchy.js` | Texte / Code | 11.24 Ko | 226 |
| `engine/map-registry.js` | Texte / Code | 28.97 Ko | 839 |
| `engine/micro-scenes.js` | Texte / Code | 16.83 Ko | 253 |
| `engine/mission-aware-analysis.js` | Texte / Code | 2.40 Ko | 78 |
| `engine/mission-catalog.js` | Texte / Code | 1.10 Ko | 42 |
| `engine/mission-empty-core.js` | Texte / Code | 6.07 Ko | 222 |
| `engine/mission-empty-core.js.before-bible-runtime-v0-validated.bak` | Autre | 6.01 Ko |  |
| `engine/mission-manager.js` | Texte / Code | 30.64 Ko | 843 |
| `engine/mission-manager.js.before-bible-runtime-v0-validated.bak` | Autre | 25.43 Ko |  |
| `engine/mission-manager.js.before-missions-cumulative-v1.bak` | Autre | 25.86 Ko |  |
| `engine/mission-memory.js` | Texte / Code | 3.36 Ko | 116 |
| `engine/mission-memory.js.before-bible-runtime-v0-validated.bak` | Autre | 3.12 Ko |  |
| `engine/mission-planner.js` | Texte / Code | 2.96 Ko | 94 |
| `engine/mission-tree.js` | Texte / Code | 5.62 Ko | 191 |
| `engine/mission-types.js` | Texte / Code | 3.56 Ko | 129 |
| `engine/mission-ui-bridge.css` | Texte / Code | 6.17 Ko | 327 |
| `engine/mission-ui-bridge.js` | Texte / Code | 17.41 Ko | 443 |
| `engine/npc-runtime.js` | Texte / Code | 15.24 Ko | 406 |
| `engine/object-event-registry.js` | Texte / Code | 3.14 Ko | 75 |
| `engine/object-library-flora-patch.js` | Texte / Code | 6.81 Ko | 206 |
| `engine/object-library-p2-1.js` | Texte / Code | 15.58 Ko | 437 |
| `engine/object-library.js` | Texte / Code | 148.66 Ko | 2451 |
| `engine/object-m0-bridge.js` | Texte / Code | 24.50 Ko | 577 |
| `engine/object-m0-bridge.js.before-bible-runtime-v0-validated.bak` | Autre | 23.35 Ko |  |
| `engine/object-m0-bridge.js.before-missions-cumulative-v1.bak` | Autre | 23.74 Ko |  |
| `engine/object-spawner.js` | Texte / Code | 23.38 Ko | 503 |
| `engine/offline-progression.js` | Texte / Code | 3.28 Ko | 27 |
| `engine/passive-object-runtime.js` | Texte / Code | 12.16 Ko | 304 |
| `engine/path-planner.js` | Texte / Code | 6.67 Ko | 200 |
| `engine/persistence-write-buffer.js` | Texte / Code | 3.78 Ko | 163 |
| `engine/phenomenon-runtime.js` | Texte / Code | 11.32 Ko | 317 |
| `engine/planet-globe-ui.css` | Texte / Code | 9.59 Ko | 324 |
| `engine/planet-globe-ui.js` | Texte / Code | 9.75 Ko | 325 |
| `engine/planet-topology-ui.js` | Texte / Code | 9.70 Ko | 301 |
| `engine/position-save-throttle.js` | Texte / Code | 2.95 Ko | 113 |
| `engine/procedural-variants.js` | Texte / Code | 6.40 Ko | 203 |
| `engine/progression-multisystem.js` | Texte / Code | 12.15 Ko | 360 |
| `engine/progression-registry.js` | Texte / Code | 14.14 Ko | 432 |
| `engine/runtime-budget.js` | Texte / Code | 5.63 Ko | 223 |
| `engine/save-ui-bridge.css` | Texte / Code | 1.50 Ko | 78 |
| `engine/save-ui-bridge.js` | Texte / Code | 19.71 Ko | 650 |
| `engine/settings-ui-bridge.css` | Texte / Code | 2.86 Ko | 121 |
| `engine/settings-ui-bridge.js` | Texte / Code | 7.41 Ko | 45 |
| `engine/special-object-runtime.js` | Texte / Code | 16.69 Ko | 369 |
| `engine/start-map-crystal.js` | Texte / Code | 8.43 Ko | 240 |
| `engine/survival-ai-bridge.js` | Texte / Code | 9.46 Ko | 283 |
| `engine/tutorial-test-bridge.js` | Texte / Code | 9.86 Ko | 241 |
| `engine/ui-enhancements.css` | Texte / Code | 21.34 Ko | 1012 |
| `engine/ui-enhancements.js` | Texte / Code | 49.30 Ko | 1341 |
| `engine/vegetation-performance.js` | Texte / Code | 11.94 Ko | 403 |
| `engine/world-engine.js` | Texte / Code | 106.90 Ko | 2823 |
| `engine/world-topology-v3.js` | Texte / Code | 18.83 Ko | 579 |
| `game.css` | Texte / Code | 10.65 Mo | 1 |
| `game.js` | Texte / Code | 27.59 Mo | 3905 |
| `generate_project_index.py` | Texte / Code | 11.13 Ko | 285 |
| `Images/.2Jungle envahissant les ruines d’une civilisation.png.HQIbXc` | Autre | 1.35 Mo |  |
| `Images/010_1.png` | Asset | 2.49 Mo |  |
| `Images/010_2.png` | Asset | 3.35 Mo |  |
| `Images/010_3.png` | Asset | 2.28 Mo |  |
| `Images/011_1.png` | Asset | 2.48 Mo |  |
| `Images/011_2.png` | Asset | 3.43 Mo |  |
| `Images/011_3.png` | Asset | 2.21 Mo |  |
| `Images/012-1.png` | Asset | 2.11 Mo |  |
| `Images/012-2.png` | Asset | 1.85 Mo |  |
| `Images/012_2.png` | Asset | 1.85 Mo |  |
| `Images/013_1.png` | Asset | 2.36 Mo |  |
| `Images/013_2.png` | Asset | 1.85 Mo |  |
| `Images/013_3.png` | Asset | 2.35 Mo |  |
| `Images/014-1.png` | Asset | 3.20 Mo |  |
| `Images/014_2.png` | Asset | 2.36 Mo |  |
| `Images/014_3.png` | Asset | 2.35 Mo |  |
| `Images/015_1.png` | Asset | 3.27 Mo |  |
| `Images/015_2.png` | Asset | 2.98 Mo |  |
| `Images/016_1.png` | Asset | 2.36 Mo |  |
| `Images/016_2.png` | Asset | 3.43 Mo |  |
| `Images/016_3.png` | Asset | 1.87 Mo |  |
| `Images/017_1.png` | Asset | 3.41 Mo |  |
| `Images/017_2.png` | Asset | 3.26 Mo |  |
| `Images/017_3.png` | Asset | 1.75 Mo |  |
| `Images/017_4.png` | Asset | 1.20 Mo |  |
| `Images/018_1.png` | Asset | 3.06 Mo |  |
| `Images/018_2.png` | Asset | 3.37 Mo |  |
| `Images/018_3.png` | Asset | 1.93 Mo |  |
| `Images/019_1.png` | Asset | 3.28 Mo |  |
| `Images/019_2.png` | Asset | 3.38 Mo |  |
| `Images/019_3.png` | Asset | 3.52 Mo |  |
| `Images/01_1.png` | Asset | 3.19 Mo |  |
| `Images/01_2.png` | Asset | 2.45 Mo |  |
| `Images/01_3.png` | Asset | 2.25 Mo |  |
| `Images/01_4.png` | Asset | 2.41 Mo |  |
| `Images/020-1.png` | Asset | 3.15 Mo |  |
| `Images/020_2.png` | Asset | 3.26 Mo |  |
| `Images/020_3.png` | Asset | 3.34 Mo |  |
| `Images/021_1.png` | Asset | 3.21 Mo |  |
| `Images/021_2.png` | Asset | 3.22 Mo |  |
| `Images/022_1.png` | Asset | 3.48 Mo |  |
| `Images/022_2.png` | Asset | 3.78 Mo |  |
| `Images/023_1.png` | Asset | 2.51 Mo |  |
| `Images/023_2.png` | Asset | 1.92 Mo |  |
| `Images/023_3.png` | Asset | 2.28 Mo |  |
| `Images/023_4.png` | Asset | 2.56 Mo |  |
| `Images/024_1.png` | Asset | 3.39 Mo |  |
| `Images/024_2.png` | Asset | 2.07 Mo |  |
| `Images/024_3.png` | Asset | 3.28 Mo |  |
| `Images/024_4.png` | Asset | 1.89 Mo |  |
| `Images/025_1.png` | Asset | 1.94 Mo |  |
| `Images/025_2.png` | Asset | 1.82 Mo |  |
| `Images/025_3.png` | Asset | 3.27 Mo |  |
| `Images/026_1.png` | Asset | 1.96 Mo |  |
| `Images/026_2.png` | Asset | 1.45 Mo |  |
| `Images/026_3.png` | Asset | 3.13 Mo |  |
| `Images/026_4.png` | Asset | 3.53 Mo |  |
| `Images/027-2.png` | Asset | 1.94 Mo |  |
| `Images/027_1.png` | Asset | 1.30 Mo |  |
| `Images/027_3.png` | Asset | 2.13 Mo |  |
| `Images/027_5.png` | Asset | 3.20 Mo |  |
| `Images/02_1.png` | Asset | 2.49 Mo |  |
| `Images/02_2.png` | Asset | 2.28 Mo |  |
| `Images/030_0Crash_Crystal.png` | Asset | 3.31 Mo |  |
| `Images/03_1.png` | Asset | 3.41 Mo |  |
| `Images/03_2.png` | Asset | 2.41 Mo |  |
| `Images/04_1.png` | Asset | 3.43 Mo |  |
| `Images/04_2.png` | Asset | 1.61 Mo |  |
| `Images/04_3.png` | Asset | 3.58 Mo |  |
| `Images/05_1.png` | Asset | 3.58 Mo |  |
| `Images/05_2.png` | Asset | 1.76 Mo |  |
| `Images/05_3.png` | Asset | 2.36 Mo |  |
| `Images/05_4.png` | Asset | 3.28 Mo |  |
| `Images/06_1.png` | Asset | 3.15 Mo |  |
| `Images/06_2.png` | Asset | 3.40 Mo |  |
| `Images/07_1.png` | Asset | 3.41 Mo |  |
| `Images/07_2.png` | Asset | 2.45 Mo |  |
| `Images/07_3.png` | Asset | 2.61 Mo |  |
| `Images/08_1.png` | Asset | 3.26 Mo |  |
| `Images/08_2.png` | Asset | 1.99 Mo |  |
| `Images/08_3.png` | Asset | 3.15 Mo |  |
| `Images/08_4.png` | Asset | 1.97 Mo |  |
| `Images/09_1.png` | Asset | 3.58 Mo |  |
| `Images/09_2.png` | Asset | 3.40 Mo |  |
| `Images/09_3.png` | Asset | 3.35 Mo |  |
| `Images/10Landes vitrifiées aux herbes rouges et mousses pâles.png` | Asset | 2.85 Mo |  |
| `Images/11Plaine rocheuse à végétation éparse.png` | Asset | 2.62 Mo |  |
| `Images/12Désert cristallin au sol craquelé .png` | Asset | 2.99 Mo |  |
| `Images/13Monde cristallin monumental.png` | Asset | 2.95 Mo |  |
| `Images/14Désert magnétique aux roches en lévitation.png` | Asset | 2.59 Mo |  |
| `Images/15Désert de dunes extraterrestres.png` | Asset | 2.62 Mo |  |
| `Images/16Désert aride avec oasis opaline.png` | Asset | 2.85 Mo |  |
| `Images/17Monde volcanique et rivières de lave.png` | Asset | 2.89 Mo |  |
| `Images/18Banquise fracturée et cavernes de glace.png` | Asset | 2.86 Mo |  |
| `Images/19Toundra extraterrestre enneigée.png` | Asset | 2.90 Mo |  |
| `Images/1Crystal site du crash.png` | Asset | 2.37 Mo |  |
| `Images/1Jungle extraterrestre bioluminescente.png` | Asset | 2.69 Mo |  |
| `Images/20Archipel tropical extraterrestre.png` | Asset | 2.86 Mo |  |
| `Images/21Côte tropicale et grandes plages .png` | Asset | 2.93 Mo |  |
| `Images/22Côte de galets et falaises sombres.png` | Asset | 2.94 Mo |  |
| `Images/23Monde sous-marin bioluminescent.png` | Asset | 2.68 Mo |  |
| `Images/24Mégalopole extraterrestre abandonnée et reconquise par la nature.png` | Asset | 3.03 Mo |  |
| `Images/25Îles flottantes et cascades aériennes.png` | Asset | 2.78 Mo |  |
| `Images/26Zone de magnetisme.png` | Asset | 3.02 Mo |  |
| `Images/27Zone de curiosity.png` | Asset | 2.54 Mo |  |
| `Images/28Zone de Magetisme.png` | Asset | 2.89 Mo |  |
| `Images/2Jungle envahissant les ruines d’une civilisation.png` | Asset | 2.84 Mo |  |
| `Images/3Forêt fongique aux champignons géants.png` | Asset | 2.65 Mo |  |
| `Images/4Savane.png` | Asset | 2.68 Mo |  |
| `Images/5Prairie céladon aux végétaux en voiles2.png` | Asset | 2.46 Mo |  |
| `Images/6Forêt d’ambre aux arbres et racines luminescentes.png` | Asset | 3.18 Mo |  |
| `Images/7Marais d’ambre et végétation aquatique.png` | Asset | 2.91 Mo |  |
| `Images/8Marais flottant extraterrestre.png` | Asset | 2.97 Mo |  |
| `Images/9Steppe de verre et failles turquoise.png` | Asset | 2.92 Mo |  |
| `Images/Capsule.png` | Asset | 3.60 Mo |  |
| `Images/images-catalog.js` | Texte / Code | 7.16 Ko | 1 |
| `Images/images.txt` | Texte / Code | 184 o | 5 |
| `Images/LISEZ_MOI.txt` | Texte / Code | 744 o | 19 |
| `index.html` | Texte / Code | 5.86 Ko | 87 |
| `index.html.before-bible-runtime-v0-validated.bak` | Autre | 5.26 Ko |  |
| `index.html.before-missions-cumulative-v1.bak` | Autre | 5.70 Ko |  |
| `INSTALLER_MISSIONS_CUMULATIVE_V1.bat` | Texte / Code | 132 o | 5 |
| `INSTALLER_MISSIONS_CUMULATIVE_V1.ps1` | Texte / Code | 16.57 Ko | 467 |
| `journal.css` | Texte / Code | 3.10 Ko | 189 |
| `LANCER_BLUEFOX.bat` | Texte / Code | 346 o | 14 |
| `LANCER_CUO_LAB.bat` | Texte / Code | 414 o | 14 |
| `LANCER_MAP_TEST.bat` | Texte / Code | 210 o | 5 |
| `map-assets.js` | Texte / Code | 5.06 Ko | 175 |
| `map-test/index.html` | Texte / Code | 5.41 Ko | 98 |
| `map-test/map-test.css` | Texte / Code | 3.03 Ko | 3 |
| `map-test/map-test.js` | Texte / Code | 25.84 Ko | 402 |
| `map-test/README.md` | Texte / Code | 1.72 Ko | 29 |
| `README_LANCEMENT.txt` | Texte / Code | 31.08 Ko | 566 |
| `reference/image_annotee.png` | Asset | 1.19 Mo |  |
| `saves/autosave-1.json` | Texte / Code | 67.05 Ko | 1 |
| `saves/autosave-2.json` | Texte / Code | 63.55 Ko | 1 |
| `saves/autosave-3.json` | Texte / Code | 18.52 Ko | 1 |
| `saves/autosave-4.json` | Texte / Code | 18.52 Ko | 1 |
| `saves/autosave-5.json` | Texte / Code | 18.52 Ko | 1 |
| `saves/autosave.json` | Texte / Code | 67.56 Ko | 1 |
| `saves/recovery.json` | Texte / Code | 7.80 Ko | 1 |
| `saves/slot-1.json` | Texte / Code | 133.42 Ko | 1 |
| `tests/exploration-mission-routing.test.js` | Texte / Code | 1.86 Ko | 61 |
| `tests/map-exploration-tracker.test.js` | Texte / Code | 3.03 Ko | 102 |
| `tests/map-test-evolution-preset.test.js` | Texte / Code | 1.57 Ko | 35 |
| `tools/bluefox-local-server.ps1` | Texte / Code | 23.88 Ko | 572 |
| `tools/generer-catalogue-images.mjs` | Autre | 980 o |  |
| `tools/generer-catalogue-images.ps1` | Texte / Code | 931 o | 27 |
