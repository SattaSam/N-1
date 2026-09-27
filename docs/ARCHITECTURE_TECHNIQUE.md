# BlueFox Odyssey — Architecture technique

Référence technique auditée : **checkpoint R-HEALTH `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46` — 12 septembre 2026 — `fix Save`**  
Synchronisation missionnelle courante : **HEAD `bca4b01b8606b630b8ccbae7e5bd3356d3ac0c31` — 13 septembre 2026 — `restaure CARN/STORM`**.

Ce document décrit les propriétaires et contrats effectifs à préserver. Le HEAD courant et les validations runtime plus récentes priment sur toute description antérieure contradictoire.

## Registre canonique des propriétaires

| Domaine | Propriétaire canonique | Rôle / règle |
| --- | --- | --- |
| Objet / métadonnées CUO | `engine/object-library.js` | Source de vérité des objets |
| Placement / instanciation | `engine/object-spawner.js` | Placement global, spawn objets/MSC |
| Biomes | `engine/biome-rules.js` | Règles de biome |
| Politique / hiérarchie de population | propriétaires population existants | Pondérations, exclusions et organisation de population |
| Génération de map | `engine/map-generator.js` + `engine/map-generation-rules.js` | Génération structurelle |
| Prescription Bible des maps | `engine/bible-map-prescription-v19.js` | Prescriptions, excursions et contraintes géographiques |
| Application prescription | `engine/map-generator-bible-overrides-v19.js` | Applique tardivement les enrichissements de contenu |
| Micro-scènes | `engine/micro-scenes.js` | Registre/orchestration des MSC |
| Données MSC custom | `data/custom-micro-scenes.js` + extensions de données | Compositions custom sans moteur parallèle |
| Persistance MSC | `engine/persistent-micro-scenes-v20.js` | Identité et persistance des instances MSC |
| Monde / transitions | `engine/world-engine.js` | Monde, transitions, autonomie exécutée, directive joueur |
| Topologie | `engine/world-topology-v3.js` | Graphe des maps |
| Chemins | `engine/path-planner.js` | Calcul des routes ; absence de chemin = échec |
| Déplacement | `engine/character-controller.js` | Mouvement et signalement d'échec |
| Mission lifecycle / sélection | `engine/mission-manager.js` | Unique propriétaire du lifecycle et de l'action missionnelle |
| Planification mission | `engine/mission-planner.js` | Intentions/actions et contraintes de map |
| Arbre d'objectifs | `engine/mission-tree.js` | Progression et distinctivité |
| Mémoire mission | `engine/mission-memory.js` | Lifecycles, faits, historiques, sites |
| Contrat Bible | `engine/bible-contract-v0-1.js` | Validation structurelle |
| Runtime Bible | `engine/bible-runtime-v0-1-unified.js` | Triggers, bindings, effets, gates, sites, runtimeValidation |
| Catalogue Bible | `data/bible-catalog.js` | Définitions missionnelles |
| Patrons Bible | `data/bible-patterns.js` | Familles génériques |
| CUO → mission | `engine/object-m0-bridge.js` | Matching, même-instance, fan-out, filtres CUO |
| Exécution mission | `engine/action-bridge.js` | Action réelle |
| Événements objets | `engine/object-event-registry.js` | Événements canoniques |
| Contexte MSC | `engine/context-msc-bridge.js` | Progression de découverte/proximité par identité de MSC |
| Séquence | `engine/sequence-actions-bridge.js` | Séquences d'actions déclaratives |
| Exploration | `engine/explore-scope-bridge.js` + propriétaires exploration | Seuils d'exploration |
| BAC | `engine/behavior-arbitration-core.js` | Arbitrage comportemental |
| Intégration BAC | `engine/behavior-arbitration-integration.js` | Raccord runtime, sans posséder le lifecycle |
| Budget CPU | `engine/runtime-budget.js` | Unique throttling adaptatif |
| Progression / inventaire | `engine/progression-registry.js` | Stock physique et progression canonique |
| Objets spéciaux / drones / balise / téléporteur | `engine/special-object-runtime.js` | Runtime réel des objets spéciaux et réseau TP |
| Transition TP / monde | `engine/world-engine.js` + raccords de transition existants | Lifecycle de changement de map, relocalisation, événement canonique |
| NPC / comportement relationnel | `engine/npc-runtime.js` + propriétaires relation existants | Approche, réaction physique, dialogue et signaux relationnels |
| Relations / commerce | `engine/mission-catalog.js` + mémoire/faits/recherche existants | Réputation, échanges, coûts physiques, connaissances/blueprints |
| Recherche / effets / recettes | `engine/bible-runtime-v0-1-unified.js` + UI consommatrice | Le runtime reste propriétaire métier |
| Inventaire UI / Kit | `engine/inventory-ui-bridge.js` + `engine/inventory-ui-clean-v0-2.js` | Présentation/transport ; aucune logique métier d'objet |
| UI générale / Journal / présentation TP | `engine/ui-enhancements.js` | Présentation seulement ; aucune décision d'éligibilité TP |
| Sauvegarde UI/snapshot | `engine/save-ui-bridge.js` | Sélection du slot et snapshot après flush |
| Hydratation missions sauvegardées | `engine/mission-manager.js` | Préserve l'état tant que les définitions nécessaires ne sont pas encore disponibles |
| `map-registry.js` | **PROTÉGÉ** | Aucun ajout de logique mission/objet/population |

## Contrat d'autorité missionnelle

`MissionManager` reste l'unique propriétaire du lifecycle et du choix missionnel.

Une mission :
- peut rester active/primary tout en étant non-runnable localement ;
- ne doit pas produire de fausse action lorsque son `requiredMapFact` pointe hors map ;
- peut provoquer une transition missionnelle réelle lorsque son prochain travail est géographiquement distant ;
- ne doit pas conserver l'autorité exclusive si sa transition n'est pas exécutable et qu'aucune action locale n'est runnable.

Le mécanisme de transition missionnelle couvre :
- TRAVEL événementiel explicite ;
- feuille contrainte par map ;
- cible de map mémorisée par mission ;
- completion gate portant une cible géographique.

Une secondaire locale réellement runnable peut retarder un départ lorsque le contrat le permet. Une fois terminée/non-runnable, la transition primaire reprend.

Les retries restent réveillés par causes réelles ; aucun polling de runnabilité parallèle.

### Autorité des étapes runtime spécialisées

Une étape réellement possédée par un runtime métier ne doit pas pouvoir être complétée par un fallback générique du Planner.

Application TP validée :
- assemblage TP-10 ;
- calibration TP-11 ;
- transfert de matière inerte TP-11 ;
- déplacements téléportés.

Ces étapes restent déclarées `eventDriven`/runtime-managed dans le catalogue et leur progression provient des événements/actions du propriétaire réel.

## BAC / expérimentation-prérequis

Une expérimentation requise par une mission n'est pas exécutée comme ordre parallèle au lifecycle. Elle est portée comme intention persistante et candidate du BAC.

Contrat actuel :
- conservation du poids missionnel et de l'axe thématique ;
- arbitrage contre Survival et les autres candidats ;
- directive joueur persistante prioritaire ;
- primaire réellement runnable prioritaire ;
- navigation par les propriétaires existants si le site expérimental est distant ;
- absence d'exécution et de déplacement lorsque les ressources requises manquent.

Un ancien test exigeant une exécution expérimentale immédiate peut donc être obsolète sans panne moteur.

## Triggers différés

Un trigger ponctuel réellement acquis avant la complétion d'un prérequis missionnel peut être mémorisé puis repris lors de l'activation différée.

Garde-fou :
- un trigger `count > 1` ne doit pas être backfillé artificiellement avec des événements antérieurs au prérequis ;
- les dépendances lifecycle restent portées par MissionManager.

## ObjectM0 / CUO

`engine/object-m0-bridge.js` reste propriétaire du matching générique.

Filtres à préserver :
- `objectId`
- `cuoType`
- `cuoTypes`
- `kind`
- `family`
- `subject`
- `category`
- tags / exclusions
- contexte MSC / instance selon le contrat du nœud.

`cuoTypes` :
- n'annule pas `cuoType` historique ;
- n'altère pas SAME-INSTANCE ;
- reste cumulatif avec les autres filtres ;
- ne crée aucun classement global parallèle.

Observer / inspecter / analyser restent les nuances d'une même étude physique lorsque le CUO le prévoit.

SAME-INSTANCE reste un invariant R-HEALTH : les études dues et l'acquisition doivent conserver l'identité de la même instance. Le fan-out vers plusieurs missions actives compatibles est également à préserver.

## Micro-scènes

Le moteur `MicroScenes` consomme des définitions de scènes contenant des objets avec offsets/rotations.

Règle générale :
- plusieurs `requiredMicroScenes` dans une prescription sont des MSC indépendantes et ne doivent pas être interprétées comme un groupe spatial unique ;
- lorsqu'un besoin gameplay exige que plusieurs fragments visuels forment **une seule unité**, la solution data-only consiste à définir une **MSC composite unique** avec une seule identité, en réutilisant les CUO/transformations des briques existantes.

Les extensions de données MSC ne doivent jamais devenir un deuxième propriétaire de placement ou de progression.

### MSC missionnelles / opportunités

Pour une opportunité basée sur une MSC remarquable :
- la génération/peuplement normal reste propriétaire de l'apparition ;
- la mission ne génère pas sa propre map pour se satisfaire ;
- l'activation peut consommer l'identité de MSC déjà réellement générée ;
- `context-msc-bridge.js`, ObjectM0 et BibleRuntime restent les consommateurs missionnels ;
- si une mini-série exige un retour, `MissionMemory` doit mémoriser map + identité persistante et `PersistentMicroScenes` doit préserver la même instance ;
- une MSC déjà réservée/protégée par un autre contrat missionnel ne doit pas être recyclée sans décision explicite ;
- aucun scheduler OPP parallèle n'est autorisé.

Les missions CARN/STORM utilisent ce principe d'opportunité avec une progression dangereuse en quatre occurrences, sans devenir propriétaire de la génération de map.

## Téléporteur

### Runtime et réseau

Le téléporteur est porté par `special-object-runtime.js` et les propriétaires monde/transition existants.

Contrat :
- hub unique : `MSC-CUSTOM-ASTROLOGY` ;
- destination = map connue avec balise persistante réellement déployée ;
- hub↔balise seulement ;
- aucune balise↔balise ;
- au moins quatre balises persistantes pour TP-11 ;
- balises non consommées par la téléportation ;
- BlueFox proche de la source ;
- refus si action/séquence non interruptible ;
- prévention du double transfert ;
- aucune génération de map, découverte ou exploration synthétique.

### ASTROLOGY

Les arches de `MSC-CUSTOM-ASTROLOGY` sont traversables uniquement dans cette MSC. Le contrat collider global des arches reste inchangé partout ailleurs.

### Transition

La téléportation réutilise le lifecycle canonique de transition :
- lock contrôle ;
- FX ;
- chargement map ;
- relocalisation sûre ;
- sauvegarde/caméra/état ;
- `bluefox:map-transition-completed` ;
- restauration contrôle.

L'événement est distingué par `source:"teleporter"` et `mode:"teleport"`.

## Progression / inventaire / Kit

`ProgressionRegistry` reste propriétaire du stock physique.

`grantInventory()` demeure la primitive de crédit physique sans faux `RESOURCE_COLLECTED`.

Le Kit d'expédition :
- expose les objets transportables réellement possédés ;
- peut inclure accumulateur et balise déployable ;
- ne fabrique, n'active ni ne consomme lui-même les objets ;
- délègue toujours l'action au propriétaire canonique.

## Relations / civilisations

Le sous-système relationnel actuel comprend :
- réactions NPC à l'approche ;
- fuite canonique lors d'une fermeture intrusive ;
- comportement prudent après approche stable ;
- protection d'un dialogue/contact déjà engagé ;
- réputation ;
- commerce consommant le stock physique ;
- déblocage de connaissances et blueprints par les propriétaires existants.

Les couches missionnelles CONTACT/DIP consomment ces capacités ; elles ne doivent pas devenir propriétaires parallèles du comportement NPC ou du stock.

Les futures missions FIN doivent réutiliser ces acquis pour les interactions finales Rocky/Translucides, sans créer de système d'adieux parallèle.

## Énergie, balise et drones

### ENE
ENE-11→15 est présente au HEAD R-HEALTH. Les missions réutilisent l'établi, les accumulateurs, les machines/objets et les propriétaires existants.

### Balise
Le runtime réel est porté par `special-object-runtime.js`.
La balise déployée est représentée par sa MSC/runtime existant.
Les missions `BAL-01→03` consomment ces propriétaires ; aucune logique de balise parallèle.
Une balise persistante peut être consommée comme **destination logique** du réseau TP sans être consommée physiquement.

### Drones
`DRN-01→05` réutilise le runtime existant :
- Blueprint Scout ;
- Blueprint Harvest ;
- déploiement/récolte distante sur map balisée ;
- priorité et dépôt cargo ;
- console dans Recherche ;
- dépannage terrain.

Le Scout :
- observe les objets de map ;
- alimente le compteur historique global via `OBJECT_SEEN`;
- ne réalise pas d'observations missionnelles ordinaires sauf demande explicite de mission.

## Fin de jeu — contrat d'architecture

La fin reste missionnelle et consomme les propriétaires existants :
- TP-AFTER utilise le runtime TP + MissionManager/BAC ;
- EXP-LONG utilise topologie/navigation/réseau existants ;
- END-CHOICE mémorise un choix de branche dans MissionMemory ;
- FIN-01 consomme les propriétaires relation/recherche existants ;
- FIN-02 utilise la capsule/objet réel et les effets de fin existants ou, s'ils manquent, un chantier moteur séparé explicitement audité.

Aucun « moteur de fin » parallèle ne doit être créé tant que les propriétaires existants peuvent porter le besoin.

La capsule reste non réparée avant FIN-02. Le **Noyau de navigation résonante** est un résultat final de synthèse, pas un état rétroactif ni une ressource disponible prématurément.

## Sauvegarde / hydratation

Le snapshot reste initié par `save-ui-bridge.js` après flush des états différés.

Depuis `560249…`, MissionManager protège le cas où un état sauvegardé référence une mission dont la définition n'est pas encore chargée :
- l'hydratation reste bloquée sans détruire l'état sauvegardé ;
- aucun nouvel arbitrage ne doit écraser cette mission pendant la fenêtre de chargement ;
- dès que la définition devient disponible, l'hydratation peut reprendre dans MissionManager ;
- aucun moteur de sauvegarde missionnelle parallèle n'est introduit.

Les chantiers TP-AFTER et OPP doivent revalider explicitement les états persistants multi-map : hub, balises destinations, MSC d'opportunité et bindings SAME-INSTANCE.

## Journal lazy et persistant

`engine/ui-enhancements.js` déclenche la consolidation narrative uniquement à l'ouverture du Journal.

Contrat :
- aucune consolidation au scan initial ;
- aucune consolidation due aux seules mutations DOM ;
- une ouverture = au plus une consolidation ;
- réouverture = nouvelle consolidation possible ;
- briques persistantes et stabilité des branches inchangées ;
- aucun `setInterval` ajouté.

TP-AFTER, OPP et END/FIN enrichissent les branches existantes ; aucun second journal narratif.

## R-HEALTH / barrière de non-régression

Le checkpoint R-HEALTH du 12 septembre 2026 considère la base `560249…` saine :
- 13 domaines VERT ;
- 3 VERT ÉVOLUÉ ;
- 4 ORANGE de validation incomplète ;
- 0 ROUGE systémique démontré.

Avant de corriger le moteur pour un test rouge préexistant, déterminer s'il s'agit de :
- test/API/fixture obsolète ;
- harness incomplet ;
- ancien contrat remplacé ;
- panne runtime actuelle reproduite.

Une correction moteur n'est justifiée que dans le dernier cas, ou lorsqu'un contrat encore valide est réellement violé.

Le contrôle post-commit doit également vérifier le diff contre le **parent Git réel** afin de détecter les écrasements inter-chantiers par fichiers partagés.

## Discipline de modification

- HEAD courant = seule base ;
- décision utilisateur récente > ancienne traduction technique ;
- audit producteur → propriétaire → runtime → événement → consommateurs ;
- aucun bridge/propriétaire parallèle si l'existant suffit ;
- aucun fichier reconstruit depuis un extrait ;
- BASE partielle exacte limitée au périmètre ;
- comparer HEAD/CANDIDAT et refuser toute dérive ;
- comparer aussi le commit final à son parent réel ;
- `map-registry.js` protégé.
