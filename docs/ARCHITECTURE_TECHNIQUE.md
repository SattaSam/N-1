# BlueFox Odyssey — Architecture technique

Référence : **V0.16.20 + cumulatif Missions V17 validé en jeu — 9 août 2026**

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
5. `engine/object-event-registry.js`
6. `engine/map-generation-rules.js`
7. `engine/biome-rules.js`
8. `engine/micro-scenes.js`
9. `engine/object-spawner.js`
10. `engine/map-registry.js`
11. `engine/map-generator.js`
12. modules de déplacement, missions et progression
13. `engine/world-engine.js`
14. `game.js`
15. ponts UI et `engine/ui-enhancements.js`

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
| Définir les pondérations de génération | `engine/map-generation-rules.js` |
| Générer et restaurer les définitions procédurales | `engine/map-generator.js` |

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

## Génération procédurale des Maps

`engine/map-generation-rules.js` contient les données stables : biomes,
pondérations, tailles, richesse, affinités, ressources et classes de
micro-scènes. `engine/map-generator.js` applique ces règles au moment d’une
demande de première exploration.

Ordre de restauration obligatoire :

1. restaurer les définitions de Maps générées ;
2. restaurer les découvertes ;
3. restaurer les noms ;
4. restaurer les liaisons topologiques ;
5. restaurer la position de BlueFox.

Crystal n’est jamais générée. Une nouvelle Map est créée uniquement pendant
une partie active, après une demande du joueur vers une terre inconnue. Son nom
n’est annoncé qu’après franchissement et enregistrement de la découverte.

La sélection des textures privilégie les images associées au panorama. Les
textures associées peuvent être répétées. Les exceptions sont limitées aux
biomes identiques ou explicitement compatibles ; volcanique et glaciaire ne
reçoivent aucun repli étranger.

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
- `bluefox_generated_maps_v1`
- `bluefox_planet_seed_v1`
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

## Banc 3D de validation CUO

Le banc CUO est un point d’entrée autonome, distinct de `index.html`. Il peut
réutiliser `bluefox3d-core.js` et `object-library.js`, mais ne charge pas le
moteur de missions, l’autonomie, la météo, la sauvegarde de partie ni les menus
du jeu.

Il contient deux plateaux neutres : showroom automatique sur le premier,
placement libre sur le second. Les objets sont instanciés exclusivement par
les fonctions publiques de `ObjectLibrary` afin que le modèle validé soit le
même que celui du moteur principal. La spécification complète se trouve dans
`docs/CUO_BANC_VALIDATION_3D.md`.
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


# Extension BibleRuntime — Patrons, fiches et arbitrage BAC

## Responsabilités

| Besoin | Fichier / couche autoritaire |
| --- | --- |
| Patrons de mission | `data/bible-patterns.js` |
| Fiches / catalogue Bible injectables | `data/bible-catalog.js` |
| Traduction Patron + Fiche vers définition moteur | `engine/bible-runtime.js` |
| Arbre et cycle de vie des missions | `engine/mission-manager.js` |
| Planification d'une action réalisable | `engine/mission-planner.js` |
| Exécution d'une action moteur | `engine/action-bridge.js` |
| Événements objets réels et progression passive | `engine/object-m0-bridge.js` + `ObjectEvents` |
| Arbitrage entre comportements / axes | BAC |
| Persistance des missions | `engine/mission-memory.js` |
| Quantités d'inventaire et transactions | `engine/progression-registry.js` |
| Effets déclaratifs et sites établis | `engine/bible-runtime-v0-1-unified.js` |

## Pipeline officiel

```text
Bible documentaire
      ↓
classification par patron
      ↓
fiche légère
      ↓
BibleRuntime
      ↓
définition MissionTree
      ↓
MissionManager / Planner
      ↓
ActionBridge / ObjectEvents
      ↓
BAC + WorldEngine
```

BibleRuntime n'est pas une seconde IA ni un moteur parallèle. Il sert d'adaptateur
entre la documentation narrative et le moteur de missions existant.

## Patrons V1

### DÉCOUVRIR / COMPRENDRE
Cas type : observation → inspection éventuelle → analyse → connaissance.

### ACCUMULER / ATTEINDRE UN SEUIL
Cas type : N collectes, N observations, N rencontres, N zones, N analyses.
Les événements sont comptés indépendamment de la mission qui a motivé l'action.

### PRÉPARER → PRODUIRE / DÉBLOQUER
Cas type : prérequis + ressources / connaissances → résolution automatique.

Sorties normalisées :

- `WORLD` : objet / micro-scène dans le monde ;
- `INVENTORY` : objet ajouté à l'inventaire ;
- `KNOWLEDGE` : blueprint / recherche débloqué.

Une sortie de mission ne doit pas imposer artificiellement une action `BUILD`
si le résultat attendu peut être appliqué directement.

## Multi-missions et BAC

Le moteur distingue :

```text
Mission principale
    → influence forte sur les décisions autonomes

Missions secondaires
    → influence faible mais réelle
    → progression passive permanente
```

Le budget d'influence des missions secondaires est global : multiplier le nombre
de missions secondaires ne doit jamais multiplier mécaniquement leur poids total.

Valeur de test validée : principale `100`, budget global secondaires `20`.

Le BAC reçoit les axes :

- survival ;
- exploration ;
- collection / logistics ;
- research / knowledge ;
- construction / technology.

## Contrat d'exécution d'une action mission

`ActionBridge.execute()` ne peut renvoyer `true` que si une action réelle a
effectivement été acceptée par le moteur.

Une interaction refusée doit :

1. renvoyer `false` ;
2. nettoyer les marqueurs de l'objet ;
3. ne pas créer de `currentAction` fantôme ;
4. remettre à zéro toute cible de déplacement devenue résiduelle.

## Watchdog des actions orphelines

Une `currentAction` peut être annulée et replannifiée si :

- elle existe depuis plusieurs secondes ;
- aucune interaction réelle n'est en cours ;
- aucune routine, transition, exploration de zone ou portail n'est actif ;
- BlueFox n'est plus réellement en déplacement.

Ce watchdog est une sécurité ; il ne doit pas interrompre une action moteur encore
active.

## Persistance F5

`MissionMemory` restaure :

- mission principale ;
- missions actives ;
- lifecycle ;
- arbres ;
- compteurs ;
- activations en attente.

Un simple chargement ou un catalogue vide ne doit jamais être interprété comme une
commande de purge.

Seule une action explicite de type **Nouvelle partie** peut remettre la progression
de mission à zéro.

## Contrat validé Camp / ressources

La collecte suit une seule chaîne autoritaire :

```text
interaction réelle
→ métadonnées CUO (`inventoryKey`, quantité)
→ `RESOURCE_COLLECTED`
→ registre central + fan-out missions
```

Une mission ne modifie jamais artificiellement son compteur pour compenser un
événement manquant. Le même événement ne peut être appliqué deux fois, mais une
nouvelle collecte après réapparition de l'objet constitue un nouvel événement.

Pour `BIBLE-V01-CAMP`, la résolution est transactionnelle : le registre central
consomme `10` bois une seule fois, puis `MissionMemory.state.siteProgression`
enregistre le site `camp` de la Map. Le rendu `MSC-CUSTOM-CAMP` est dérivé de ce
site. Une recharge ou un nouveau chargement de Map restaure le rendu à la fin de
`WorldEngine.loadMap()` ; les temporisations UI et les événements de Map ne sont
pas des mécanismes de restauration autoritaires.

## Contrat validé des missions liées à une cible

Une fiche peut demander une liaison à la définition d'objet ou à son instance.
Pour `BIBLE-V01-ARCHAEOLOGY`, la liaison `instance` impose que Observer,
Inspecter et Analyser concernent exactement la même instance. La validation
finale dépend d'un site réellement établi à proximité, lu depuis
`siteProgression`; aucun fallback propre à une Map n'est autorisé.

## Hydratation des missions terminées

`MissionManager` restaure aussi les arbres terminés enregistrés, tout en les
excluant des missions actives. L'UI du catalogue calcule alors sa progression à
partir de l'arbre restauré. Pour les anciennes sauvegardes marquées `completed`
sans arbre sauvegardé, la projection publique utilise une progression complète
de compatibilité ; elle ne recrée pas une mission active.

# Extension topologie Planète — 8 août 2026

La topologie spatiale est portée par des coordonnées canoniques. Une coordonnée ne
peut représenter qu'une seule Map.

Règle :

```text
déplacement vers coordonnée libre
→ génération d'une nouvelle Map

déplacement vers coordonnée déjà occupée
→ reconnexion vers la Map existante
```

Le menu Planète est une projection de cette topologie, jamais une seconde source
de vérité.

Le rendu organique et la texture planétaire neutre font partie du jalon actuel.
Le dernier réglage visuel du design de menu reste en validation.
