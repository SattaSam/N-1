# Index du projet — V4_1_BFO version de travail - Copie

_Généré automatiquement le 07/08/2026 à 01:51:51._

## Résumé

- Fichiers : **286**
- Taille totale : **383.49 Mo**
- Lignes de texte/code : **46512**

### Répartition par catégorie

| Catégorie | Nombre |
|---|---:|
| Asset | 121 |
| Autre | 11 |
| Sans extension | 1 |
| Texte / Code | 153 |

## Arborescence

```text
V4_1_BFO version de travail - Copie
├── .project_index_cache.json
├── Cahier_des_Charges_BlueFox_Odyssey.docx
├── game.css
├── game.js
├── generate_project_index.py
├── index.html
├── INSTALLATION.txt
├── journal.css
├── LANCER_BLUEFOX.bat
├── LANCER_CUO_LAB.bat
├── LANCER_MAP_TEST.bat
├── map-assets.js
├── map-test.zip
├── README_LANCEMENT.txt
├── Savegarde BFO
├── VERIFIER_ET_REPARER_IMAGES.bat
├── vide.txt
├── assets
│   ├── Capsule.png
│   ├── maps
│   │   └── CONVENTION_IMAGES.txt
│   └── models
│       └── BlueFox_Capsule_Depart.glb
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
│   ├── config.json
│   ├── custom-maps.js
│   ├── custom-maps.json
│   ├── custom-micro-scenes.js
│   └── custom-micro-scenes.json
├── docs
│   ├── ARCHITECTURE_TECHNIQUE.md
│   ├── BlueFox_CUO_v2_Production_complet.xlsx
│   ├── BlueFox_Decisions_2026-07-31.docx
│   ├── BlueFox_Documents_de_reference_Fin_de_session.txt
│   ├── BlueFox_Game.glb
│   ├── BlueFox_Odyssey_Catalogue_Missions.docx
│   ├── BlueFox_Reference_Methodologie.docx
│   ├── CHANGELOG_2026-08-03.txt
│   ├── CHANGELOG_DOCUMENTATION_2026-08-03.md
│   ├── CONVENTIONS_MAPS_IMAGES.md
│   ├── CUM_COMPLET_audit_psychologique.xlsx
│   ├── CUO_BANC_VALIDATION_3D.md
│   ├── DEV_HISTORIQUE.md
│   ├── ETAT_REPRISE.md
│   ├── GENERER_CATALOGUE_IMAGES.bat
│   ├── MASTER.md
│   ├── MASTER_BLUEFOX_ODYSSEY.md
│   ├── PLAN_TESTS_V0.16.20.md
│   ├── README.md
│   ├── Reference_BlueFox_2026-08-03.md
│   ├── ROADMAP_TODO.md
│   ├── SAVE_UI_LOCK.md
│   ├── SPRINT_M0_FONDATION_IA.md
│   ├── SPRINT_O1_3_O2_1.md
│   ├── SPRINT_O2_2_O2_3.md
│   ├── SPRINT_O3_PROFILS_RESSOURCES_PONDERES.md
│   ├── SPRINT_O4_REGISTRE_CENTRAL_PROGRESSION.md
│   ├── SPRINT_O5_1_ROUTEUR_INTERACTIONS_MANUELLES.md
│   ├── SPRINT_O5_PROGRESSION_MULTI_SYSTEMES.md
│   ├── SPRINT_O6_EXPLORATION_EXPERTISE_MAP.md
│   └── TODO.md
├── engine
│   ├── action-bridge.js
│   ├── behavior-arbitration-core.js
│   ├── behavior-arbitration-integration.js
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
│   ├── mission-manager.js
│   ├── mission-memory.js
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
│   ├── object-spawner.js
│   ├── offline-progression.js
│   ├── passive-object-runtime.js
│   ├── path-planner.js
│   ├── persistence-write-buffer.js
│   ├── phenomenon-runtime.js
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
│   └── world-engine.js
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
│   ├── 01_0Crash_Crystal.png
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
│   ├── 026_2.png
│   ├── 026_3.png
│   ├── 026_4.png
│   ├── 026_5.png
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
│   ├── 26BisZone de Magetisme.png
│   ├── 26Zone de magnetisme.png
│   ├── 27Zone de curiosity.png
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
│   ├── LISEZ_MOI.txt
│   └── docs
│       ├── ARCHITECTURE_TECHNIQUE.md
│       ├── BlueFox_CUO_Audit_Consolidation.xlsx
│       ├── BlueFox_Decisions_2026-07-31.docx
│       ├── BlueFox_Game.glb
│       ├── BlueFox_Reference_Methodologie.docx
│       ├── CONVENTIONS_MAPS_IMAGES.md
│       ├── DEV_HISTORIQUE.md
│       ├── ETAT_REPRISE.md
│       ├── GENERER_CATALOGUE_IMAGES.bat
│       ├── MASTER.md
│       ├── MASTER_BLUEFOX_ODYSSEY.md
│       ├── PLAN_TESTS_V0.16.20.md
│       ├── README.md
│       ├── ROADMAP_TODO.md
│       ├── SPRINT_M0_FONDATION_IA.md
│       ├── SPRINT_O1_3_O2_1.md
│       ├── SPRINT_O2_2_O2_3.md
│       ├── SPRINT_O3_PROFILS_RESSOURCES_PONDERES.md
│       ├── SPRINT_O4_REGISTRE_CENTRAL_PROGRESSION.md
│       ├── SPRINT_O5_1_ROUTEUR_INTERACTIONS_MANUELLES.md
│       ├── SPRINT_O5_PROGRESSION_MULTI_SYSTEMES.md
│       ├── SPRINT_O6_EXPLORATION_EXPERTISE_MAP.md
│       └── TODO.md
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
| `.project_index_cache.json` | Texte / Code | 86.15 Ko | 2951 |
| `assets/Capsule.png` | Asset | 4.04 Mo |  |
| `assets/maps/CONVENTION_IMAGES.txt` | Texte / Code | 1.43 Ko | 36 |
| `assets/models/BlueFox_Capsule_Depart.glb` | Asset | 1.97 Mo |  |
| `Cahier_des_Charges_BlueFox_Odyssey.docx` | Autre | 39.34 Ko |  |
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
| `data/config.json` | Texte / Code | 238 o | 16 |
| `data/custom-maps.js` | Texte / Code | 1.48 Ko | 77 |
| `data/custom-maps.json` | Texte / Code | 1.46 Ko | 77 |
| `data/custom-micro-scenes.js` | Texte / Code | 20.70 Ko | 1 |
| `data/custom-micro-scenes.json` | Texte / Code | 39.38 Ko | 1958 |
| `docs/ARCHITECTURE_TECHNIQUE.md` | Texte / Code | 9.06 Ko | 232 |
| `docs/BlueFox_CUO_v2_Production_complet.xlsx` | Autre | 47.87 Ko |  |
| `docs/BlueFox_Decisions_2026-07-31.docx` | Autre | 37.20 Ko |  |
| `docs/BlueFox_Documents_de_reference_Fin_de_session.txt` | Texte / Code | 1.88 Ko | 88 |
| `docs/BlueFox_Game.glb` | Asset | 9.10 Mo |  |
| `docs/BlueFox_Odyssey_Catalogue_Missions.docx` | Autre | 47.74 Ko |  |
| `docs/BlueFox_Reference_Methodologie.docx` | Autre | 36.09 Ko |  |
| `docs/CHANGELOG_2026-08-03.txt` | Texte / Code | 1.60 Ko | 63 |
| `docs/CHANGELOG_DOCUMENTATION_2026-08-03.md` | Texte / Code | 658 o | 18 |
| `docs/CONVENTIONS_MAPS_IMAGES.md` | Texte / Code | 2.83 Ko | 84 |
| `docs/CUM_COMPLET_audit_psychologique.xlsx` | Autre | 229.72 Ko |  |
| `docs/CUO_BANC_VALIDATION_3D.md` | Texte / Code | 5.28 Ko | 137 |
| `docs/DEV_HISTORIQUE.md` | Texte / Code | 3.43 Ko | 62 |
| `docs/ETAT_REPRISE.md` | Texte / Code | 2.03 Ko | 45 |
| `docs/GENERER_CATALOGUE_IMAGES.bat` | Texte / Code | 348 o | 14 |
| `docs/MASTER.md` | Texte / Code | 3.93 Ko | 83 |
| `docs/MASTER_BLUEFOX_ODYSSEY.md` | Texte / Code | 8.60 Ko | 179 |
| `docs/PLAN_TESTS_V0.16.20.md` | Texte / Code | 4.66 Ko | 109 |
| `docs/README.md` | Texte / Code | 2.17 Ko | 46 |
| `docs/Reference_BlueFox_2026-08-03.md` | Texte / Code | 1.59 Ko | 52 |
| `docs/ROADMAP_TODO.md` | Texte / Code | 6.42 Ko | 126 |
| `docs/SAVE_UI_LOCK.md` | Texte / Code | 1.17 Ko | 30 |
| `docs/SPRINT_M0_FONDATION_IA.md` | Texte / Code | 4.69 Ko | 130 |
| `docs/SPRINT_O1_3_O2_1.md` | Texte / Code | 2.09 Ko | 47 |
| `docs/SPRINT_O2_2_O2_3.md` | Texte / Code | 1.38 Ko | 24 |
| `docs/SPRINT_O3_PROFILS_RESSOURCES_PONDERES.md` | Texte / Code | 1.40 Ko | 46 |
| `docs/SPRINT_O4_REGISTRE_CENTRAL_PROGRESSION.md` | Texte / Code | 2.59 Ko | 78 |
| `docs/SPRINT_O5_1_ROUTEUR_INTERACTIONS_MANUELLES.md` | Texte / Code | 1.24 Ko | 39 |
| `docs/SPRINT_O5_PROGRESSION_MULTI_SYSTEMES.md` | Texte / Code | 1.92 Ko | 71 |
| `docs/SPRINT_O6_EXPLORATION_EXPERTISE_MAP.md` | Texte / Code | 2.60 Ko | 70 |
| `docs/TODO.md` | Texte / Code | 1.81 Ko | 35 |
| `engine/action-bridge.js` | Texte / Code | 6.70 Ko | 175 |
| `engine/behavior-arbitration-core.js` | Texte / Code | 31.21 Ko | 966 |
| `engine/behavior-arbitration-integration.js` | Texte / Code | 13.27 Ko | 301 |
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
| `engine/mission-empty-core.js` | Texte / Code | 6.01 Ko | 222 |
| `engine/mission-manager.js` | Texte / Code | 25.43 Ko | 688 |
| `engine/mission-memory.js` | Texte / Code | 3.12 Ko | 114 |
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
| `engine/object-m0-bridge.js` | Texte / Code | 23.35 Ko | 547 |
| `engine/object-spawner.js` | Texte / Code | 23.38 Ko | 503 |
| `engine/offline-progression.js` | Texte / Code | 3.28 Ko | 27 |
| `engine/passive-object-runtime.js` | Texte / Code | 12.16 Ko | 304 |
| `engine/path-planner.js` | Texte / Code | 6.67 Ko | 200 |
| `engine/persistence-write-buffer.js` | Texte / Code | 3.78 Ko | 163 |
| `engine/phenomenon-runtime.js` | Texte / Code | 11.32 Ko | 317 |
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
| `engine/ui-enhancements.js` | Texte / Code | 44.18 Ko | 1179 |
| `engine/world-engine.js` | Texte / Code | 106.90 Ko | 2823 |
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
| `Images/01_0Crash_Crystal.png` | Asset | 3.31 Mo |  |
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
| `Images/026_2.png` | Asset | 1.45 Mo |  |
| `Images/026_3.png` | Asset | 1.96 Mo |  |
| `Images/026_4.png` | Asset | 3.53 Mo |  |
| `Images/026_5.png` | Asset | 3.13 Mo |  |
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
| `Images/26BisZone de Magetisme.png` | Asset | 2.89 Mo |  |
| `Images/26Zone de magnetisme.png` | Asset | 3.02 Mo |  |
| `Images/27Zone de curiosity.png` | Asset | 2.54 Mo |  |
| `Images/2Jungle envahissant les ruines d’une civilisation.png` | Asset | 2.84 Mo |  |
| `Images/3Forêt fongique aux champignons géants.png` | Asset | 2.65 Mo |  |
| `Images/4Savane.png` | Asset | 2.68 Mo |  |
| `Images/5Prairie céladon aux végétaux en voiles2.png` | Asset | 2.46 Mo |  |
| `Images/6Forêt d’ambre aux arbres et racines luminescentes.png` | Asset | 3.18 Mo |  |
| `Images/7Marais d’ambre et végétation aquatique.png` | Asset | 2.91 Mo |  |
| `Images/8Marais flottant extraterrestre.png` | Asset | 2.97 Mo |  |
| `Images/9Steppe de verre et failles turquoise.png` | Asset | 2.92 Mo |  |
| `Images/Capsule.png` | Asset | 3.60 Mo |  |
| `Images/docs/ARCHITECTURE_TECHNIQUE.md` | Texte / Code | 7.13 Ko | 190 |
| `Images/docs/BlueFox_CUO_Audit_Consolidation.xlsx` | Autre | 38.37 Ko |  |
| `Images/docs/BlueFox_Decisions_2026-07-31.docx` | Autre | 37.20 Ko |  |
| `Images/docs/BlueFox_Game.glb` | Asset | 9.10 Mo |  |
| `Images/docs/BlueFox_Reference_Methodologie.docx` | Autre | 36.09 Ko |  |
| `Images/docs/CONVENTIONS_MAPS_IMAGES.md` | Texte / Code | 2.83 Ko | 84 |
| `Images/docs/DEV_HISTORIQUE.md` | Texte / Code | 2.21 Ko | 42 |
| `Images/docs/ETAT_REPRISE.md` | Texte / Code | 1.33 Ko | 34 |
| `Images/docs/GENERER_CATALOGUE_IMAGES.bat` | Texte / Code | 348 o | 14 |
| `Images/docs/MASTER.md` | Texte / Code | 3.93 Ko | 83 |
| `Images/docs/MASTER_BLUEFOX_ODYSSEY.md` | Texte / Code | 6.20 Ko | 132 |
| `Images/docs/PLAN_TESTS_V0.16.20.md` | Texte / Code | 4.66 Ko | 109 |
| `Images/docs/README.md` | Texte / Code | 2.00 Ko | 45 |
| `Images/docs/ROADMAP_TODO.md` | Texte / Code | 5.08 Ko | 104 |
| `Images/docs/SPRINT_M0_FONDATION_IA.md` | Texte / Code | 4.69 Ko | 130 |
| `Images/docs/SPRINT_O1_3_O2_1.md` | Texte / Code | 2.09 Ko | 47 |
| `Images/docs/SPRINT_O2_2_O2_3.md` | Texte / Code | 1.38 Ko | 24 |
| `Images/docs/SPRINT_O3_PROFILS_RESSOURCES_PONDERES.md` | Texte / Code | 1.40 Ko | 46 |
| `Images/docs/SPRINT_O4_REGISTRE_CENTRAL_PROGRESSION.md` | Texte / Code | 2.59 Ko | 78 |
| `Images/docs/SPRINT_O5_1_ROUTEUR_INTERACTIONS_MANUELLES.md` | Texte / Code | 1.24 Ko | 39 |
| `Images/docs/SPRINT_O5_PROGRESSION_MULTI_SYSTEMES.md` | Texte / Code | 1.92 Ko | 71 |
| `Images/docs/SPRINT_O6_EXPLORATION_EXPERTISE_MAP.md` | Texte / Code | 2.00 Ko | 60 |
| `Images/docs/TODO.md` | Texte / Code | 1.81 Ko | 35 |
| `Images/images-catalog.js` | Texte / Code | 7.17 Ko | 1 |
| `Images/images.txt` | Texte / Code | 184 o | 5 |
| `Images/LISEZ_MOI.txt` | Texte / Code | 744 o | 19 |
| `index.html` | Texte / Code | 5.17 Ko | 79 |
| `INSTALLATION.txt` | Texte / Code | 551 o | 17 |
| `journal.css` | Texte / Code | 3.10 Ko | 189 |
| `LANCER_BLUEFOX.bat` | Texte / Code | 346 o | 14 |
| `LANCER_CUO_LAB.bat` | Texte / Code | 414 o | 14 |
| `LANCER_MAP_TEST.bat` | Texte / Code | 210 o | 5 |
| `map-assets.js` | Texte / Code | 5.06 Ko | 175 |
| `map-test.zip` | Asset | 11.81 Ko |  |
| `map-test/index.html` | Texte / Code | 5.41 Ko | 98 |
| `map-test/map-test.css` | Texte / Code | 3.03 Ko | 3 |
| `map-test/map-test.js` | Texte / Code | 25.84 Ko | 402 |
| `map-test/README.md` | Texte / Code | 1.72 Ko | 29 |
| `README_LANCEMENT.txt` | Texte / Code | 31.08 Ko | 566 |
| `reference/image_annotee.png` | Asset | 1.19 Mo |  |
| `Savegarde BFO` | Sans extension | 31 o |  |
| `saves/autosave-1.json` | Texte / Code | 18.52 Ko | 1 |
| `saves/autosave-2.json` | Texte / Code | 18.52 Ko | 1 |
| `saves/autosave-3.json` | Texte / Code | 16.79 Ko | 1 |
| `saves/autosave-4.json` | Texte / Code | 16.78 Ko | 1 |
| `saves/autosave-5.json` | Texte / Code | 14.10 Ko | 1 |
| `saves/autosave.json` | Texte / Code | 18.52 Ko | 1 |
| `saves/recovery.json` | Texte / Code | 7.80 Ko | 1 |
| `saves/slot-1.json` | Texte / Code | 133.42 Ko | 1 |
| `tests/exploration-mission-routing.test.js` | Texte / Code | 1.86 Ko | 61 |
| `tests/map-exploration-tracker.test.js` | Texte / Code | 3.03 Ko | 102 |
| `tests/map-test-evolution-preset.test.js` | Texte / Code | 1.57 Ko | 35 |
| `tools/bluefox-local-server.ps1` | Texte / Code | 23.88 Ko | 572 |
| `tools/generer-catalogue-images.mjs` | Autre | 980 o |  |
| `tools/generer-catalogue-images.ps1` | Texte / Code | 931 o | 27 |
| `VERIFIER_ET_REPARER_IMAGES.bat` | Texte / Code | 618 o | 26 |
| `vide.txt` | Texte / Code | 6 o | 2 |
