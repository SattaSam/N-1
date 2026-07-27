# Architecture technique

Référence : **BlueFox Odyssey V0.16.20**

## Démarrage

`LANCER_BLUEFOX.bat` lance `tools/bluefox-local-server.ps1`.

Le serveur :

- fonctionne uniquement sur `127.0.0.1` ;
- choisit un port local aléatoire ;
- désactive le cache HTTP ;
- sert les PNG, JPG, WEBP, GLB, JavaScript et CSS ;
- permet à WebGL de charger les fichiers du dossier `Images`.

`index.html` supprime les anciens caches et service workers puis charge les
modules avec un paramètre de version.

## Ordre des modules

1. `map-assets.js` : analyse des noms d’images et catalogue.
2. `Images/images-catalog.js` : inventaire local généré.
3. `engine/bluefox3d-core.js` : utilitaires communs.
4. `engine/object-library.js` : familles d’objets modulaires.
5. `engine/map-registry.js` : définitions et génération des Maps.
6. `engine/path-planner.js` : calcul et lissage des chemins.
7. `engine/character-controller.js` : déplacement et animations.
8. `engine/camera-controller.js` : caméra et suivi.
9. `engine/world-engine.js` : monde, transitions, autonomie et cycle.
10. `game.js` : interface React historique.
11. `engine/ui-enhancements.js` : interface dynamique reliée au moteur.

## Source unique de Zone

Le moteur 3D est la source autoritaire pour :

- `mapId` ;
- numéro et nom de Zone ;
- image de décor ;
- textures des plateaux ;
- état exploré/inexploré ;
- position de BlueFox.

L’événement `bluefox:map-state` synchronise le HUD et les menus. L’interface
historique ne doit pas imposer un identifiant divergent.

## Déplacement

- Pathfinding avec points de passage et lissage.
- Recalcul en cas d’absence de progression.
- Collisions adaptées à la fonction des objets.
- Approche multipoint autour des ressources.
- Vitesse autonome maximale : 3,55 unités.
- Instruction directionnelle acceptée : multiplicateur de sprint 1,30.
- `Run_fast` prioritaire pendant ce sprint.
- Root motion neutralisé dans les animations GLB.

## Caméra et panorama

- Distance réglable : 4,5 à 34 unités.
- Le recul choisi est conservé en suivi ancré.
- Le pivot se relève progressivement en vue stratégique.
- Le décor est un cyclorama maillé, incurvé horizontalement et verticalement.
- Son bord inférieur reste proche du niveau du plateau.
- Les bords utilisent une portion réduite de la texture, étirée progressivement.
- Le panorama se recentre et tourne doucement derrière le plateau.

## Persistance locale

Principales clés :

- `bluefox_world_position_v2`
- `bluefox_engine_discovered_maps_v2`
- `bluefox_discovered_zones_v1`
- `bluefox_generated_topology_v1`
- `bluefox_planet_clock_v1`
- `bluefox_odyssey_save_v1`

Les Maps procédurales sont régénérées à partir de leurs définitions et graines.

