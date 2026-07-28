# BlueFox Odyssey — Architecture technique

Référence : **V0.16.20 + refonte catalogue du 28 juillet 2026**

## Démarrage

`LANCER_BLUEFOX.bat` lance `tools/bluefox-local-server.ps1`.

Le serveur :

- écoute uniquement sur `127.0.0.1` ;
- choisit un port local ;
- désactive le cache HTTP ;
- sert les images, modèles, scripts et styles ;
- permet à WebGL de charger les fichiers du dossier `Images`.

Le lancement direct de `index.html` avec le protocole `file:` n’est pas une
procédure de test valide.

## Ordre obligatoire des scripts

`index.html` fait autorité sur l’ordre de chargement :

1. `map-assets.js`
2. `Images/images-catalog.js`
3. `engine/bluefox3d-core.js`
4. `engine/object-library.js`
5. `engine/biome-rules.js`
6. `engine/micro-scenes.js`
7. `engine/object-spawner.js`
8. `engine/map-registry.js`
9. `engine/path-planner.js`
10. `engine/character-controller.js`
11. `engine/camera-controller.js`
12. `engine/world-engine.js`
13. `game.js`
14. `engine/ui-enhancements.js`

Les quatre modules du catalogue doivent exister et être chargés avant
`map-registry.js`. Toute modification de cet ordre exige un test de lancement.

## Matrice des responsabilités

| Besoin | Fichier autoritaire |
| --- | --- |
| Définir ou construire un objet | `engine/object-library.js` |
| Régler les biomes, densités et budgets | `engine/biome-rules.js` |
| Définir un amas ou un landmark | `engine/micro-scenes.js` |
| Créer, placer et raccorder collisions/interactions | `engine/object-spawner.js` |
| Définir les Maps, terrains, sorties et textures | `engine/map-registry.js` |
| Reconnaître et associer les fichiers image | `map-assets.js` |
| Fixer l’ordre de démarrage | `index.html` |
| Piloter monde, transitions et autonomie | `engine/world-engine.js` |

## Protection de `map-registry.js`

> **FICHIER ARCHITECTURAL PROTÉGÉ — `engine/map-registry.js`**
>
> Ne pas ajouter ni modifier ici la génération, les définitions ou les règles
> de placement des objets. Toute évolution du catalogue passe par
> `object-library.js`, `biome-rules.js`, `micro-scenes.js` et
> `object-spawner.js`.

Une modification de `map-registry.js` reste autorisée uniquement pour :

- le registre et les métadonnées des Maps ;
- les terrains et textures de plateaux ;
- les sorties, portails et limites de Map ;
- la construction ou destruction de la Map ;
- une correction explicitement localisée relevant de ces responsabilités.

Avant livraison : vérifier les dépendances, lancer le jeu, charger une Map,
changer de Zone et contrôler les collisions. Le verrouillage est architectural,
pas un blocage technique absolu.

## Catalogue Universel des Objets

`engine/object-library.js` est la source unique des objets. Chaque définition
active expose un identifiant unique, un type, une fonction de construction, ses
métadonnées de gameplay et son profil de placement.

Flux de génération :

```text
ObjectLibrary + BiomeRules + MicroScenes
                    ↓
              ObjectSpawner
                    ↓
               MapRegistry
```

`MapRegistry` fournit le contexte de Map ; il ne décide plus quels objets
générer.

## Source unique de Zone

Le moteur 3D est autoritaire pour :

- `mapId` ;
- numéro et nom de Zone ;
- décor panoramique ;
- textures des plateaux ;
- état exploré/inexploré ;
- position de BlueFox.

L’événement `bluefox:map-state` synchronise le HUD et les menus. L’interface
historique ne doit pas imposer un identifiant divergent.

## Déplacement, caméra et panorama

- Pathfinding avec points de passage, lissage et recalcul en cas de blocage.
- Collisions adaptées à la fonction des objets.
- Approche multipoint autour des ressources.
- Vitesse autonome maximale connue : 3,55 unités.
- Direction acceptée : multiplicateur de sprint 1,30 et `Run_fast`.
- Root motion neutralisé dans les animations GLB.
- Distance caméra connue : 4,5 à 34 unités.
- Cyclorama incurvé, bord inférieur proche du plateau et défilement doux.

## Nettoyage et persistance

Une ancienne Map doit être détachée avec `removeFromParent()` avant la
libération de ses ressources par `BF.disposeObject()`.

Principales clés locales :

- `bluefox_world_position_v2`
- `bluefox_engine_discovered_maps_v2`
- `bluefox_discovered_zones_v1`
- `bluefox_generated_topology_v1`
- `bluefox_planet_clock_v1`
- `bluefox_odyssey_save_v1`

Les Maps procédurales sont régénérées à partir de leurs définitions et graines.
