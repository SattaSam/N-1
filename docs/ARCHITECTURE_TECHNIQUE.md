# BlueFox Odyssey — Architecture technique

Référence : **V0.16.20 + correctifs cumulatifs du 29 juillet 2026**

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
| Afficher et manipuler la carte Planète | `engine/ui-enhancements.js` et `engine/ui-enhancements.css` |

## Discipline des hotfixes cumulatifs

Avant tout sprint, constituer une base de travail à partir du dernier livrable
cumulatif et comparer ses fichiers à GitHub. La version GitHub ne doit pas
écraser un hotfix local qui n’a pas encore été intégré au dépôt.

Pour chaque fichier modifié :

1. recenser les correctifs antérieurs attendus ;
2. vérifier leur présence avant la nouvelle modification ;
3. exécuter les contrôles de non-régression associés ;
4. livrer un paquet cumulatif lorsqu’un même sous-système a reçu plusieurs
   hotfixes.

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

## Topologie et carte Planète

- `map-registry.js` positionne les portails sur les bords réels : Nord `minZ`,
  Sud `maxZ`, Est `maxX`, Ouest `minX`.
- Les portails Nord/Sud suivent l’axe X ; Est/Ouest suivent l’axe Z.
- `world-engine.js` conserve les sorties réciproques et calcule les itinéraires
  uniquement entre Zones découvertes.
- `ui-enhancements.js` projette cette topologie sur la carte Planète.
- Une suggestion vers une Zone distante emprunte les portails connus ; ce
  n’est pas une téléportation.
- Une action directe du joueur annule l’itinéraire suggéré.

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
- `bluefox_map_names_v1`
- `bluefox_planet_clock_v1`
- `bluefox_odyssey_save_v1`
- `bluefox_progression_registry_v1`
- `bluefox_mission_memory_m0_v1`

`bluefox_progression_registry_v1` est l'unique source de vérité des quantités
transportées, déposées et consommées. Le champ `resources` de
`bluefox_odyssey_save_v1` est conservé uniquement comme projection de
compatibilité pour l'interface compilée ; après sa réconciliation initiale, il
ne peut plus réécrire l'inventaire central. La mémoire M0 ne possède plus de
copie d'inventaire.

Les Maps procédurales sont régénérées à partir de leurs définitions et graines.
# Extension M0 — Fondation IA

La couche de missions M0 est composée de six modules indépendants chargés avant
`world-engine.js`. Elle observe l’état réel de la map, choisit une action
réalisable, l’exécute par l’API publique de `WorldEngine`, puis ne valide la
progression qu’au retour d’un hook d’achèvement réel. La mémoire locale
`bluefox_mission_memory_m0_v1` permet une reprise sans modifier les sauvegardes
historiques du monde.

Référence détaillée : `docs/SPRINT_M0_FONDATION_IA.md`.

La carte `.mission-card` est raccordée sans modifier le rendu React historique :
`mission-ui-bridge.js` écoute `bluefox:mission-state`, affiche l’arbre M0 et
réapplique cet état si React reconstruit la carte. Une mission historique n’est
plus considérée comme source d’autorité visuelle.

Une Zone n’est pas validée à l’arrivée. `EXPLORE_ZONE` représente la
reconnaissance géographique ; l’objectif parent doit encore réunir trois relevés
différents et une cartographie avant de devenir `completed`.
