# BlueFox Odyssey — Architecture technique

Référence technique courante : **HEAD `d334ed2cb193c80c44e98c401b5947bbd263348e` — 1 octobre 2026 — `Mission routines`**.  
Checkpoint historique de santé : **R-HEALTH `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46` — 12 septembre 2026 — `fix Save`**.

Le HEAD courant et les validations runtime plus récentes priment sur toute description antérieure contradictoire. Ce document décrit les propriétaires effectifs et les frontières à préserver ; il ne crée aucune couche moteur.

## Registre canonique des propriétaires

| Domaine | Propriétaire canonique | Rôle / règle |
| --- | --- | --- |
| Objet / métadonnées CUO | `engine/object-library.js` | Source de vérité objets |
| Placement / instanciation | `engine/object-spawner.js` | Placement global, objets/MSC |
| Biomes | `engine/biome-rules.js` | Cohérence biome |
| Génération de map | `engine/map-generator.js` + `engine/map-generation-rules.js` | Génération structurelle |
| Prescription Bible maps | `engine/bible-map-prescription-v19.js` | Excursions, tailles, contenus requis |
| Application prescription | `engine/map-generator-bible-overrides-v19.js` | Enrichissements tardifs |
| Micro-scènes | `engine/micro-scenes.js` | Registre/orchestration MSC |
| Données MSC custom | `data/custom-micro-scenes.js` + données existantes | Composition, pas de moteur parallèle |
| Persistance MSC | `engine/persistent-micro-scenes-v20.js` | Identité persistante |
| Monde / transitions / interaction physique | `engine/world-engine.js` | Monde, autonomie exécutée, transitions, directive joueur, approche interaction |
| Topologie | `engine/world-topology-v3.js` | Graphe canonique des maps |
| Chemins | `engine/path-planner.js` | Routes ; absence de chemin = échec |
| Déplacement | `engine/character-controller.js` | Mouvement réel et échec |
| Mission lifecycle / sélection / autorité | `engine/mission-manager.js` | Lifecycle, Top1/shortlist, runnabilité, travel missionnel |
| Planification mission | `engine/mission-planner.js` | Objectif → action/intention/contraintes |
| Arbre d'objectifs | `engine/mission-tree.js` | Progression et distinctivité |
| Mémoire mission | `engine/mission-memory.js` | Faits, lifecycle, sites, intentions persistées |
| Contrat Bible | `engine/bible-contract-v0-1.js` | Validation structurelle |
| Runtime Bible | `engine/bible-runtime-v0-1-unified.js` | Triggers, bindings, effets, gates, compteurs, sites |
| Catalogue Bible | `data/bible-catalog.js` | Définitions missionnelles |
| Patrons Bible | `data/bible-patterns.js` | Familles génériques |
| CUO → mission | `engine/object-m0-bridge.js` | Matching, études dues, SAME-INSTANCE, fan-out |
| Exécution mission | `engine/action-bridge.js` | Action réelle |
| Événements objets | `engine/object-event-registry.js` | Événements canoniques |
| Contexte MSC | `engine/context-msc-bridge.js` | Découverte/proximité par identité MSC |
| Séquences | `engine/sequence-actions-bridge.js` | Séquences déclaratives |
| Exploration | `engine/explore-scope-bridge.js` + propriétaires exploration | Seuils réels |
| BAC | `engine/behavior-arbitration-core.js` | Arbitrage comportemental |
| Intégration BAC | `engine/behavior-arbitration-integration.js` | Raccord runtime, sans lifecycle parallèle |
| Budget CPU | `engine/runtime-budget.js` | Unique throttling adaptatif |
| Progression / inventaire | `engine/progression-registry.js` | Stock physique et progression |
| Objets spéciaux / drones / balise / TP | `engine/special-object-runtime.js` | Runtime métier réel |
| Sauvegarde UI/snapshot | `engine/save-ui-bridge.js` | Snapshot après flush |
| Recherche / effets / recettes | `engine/bible-runtime-v0-1-unified.js` + UI consommatrice | Métier côté runtime |
| Inventaire UI / Kit | `engine/inventory-ui-bridge.js` + `engine/inventory-ui-clean-v0-2.js` | Présentation/transport seulement |
| UI générale / Journal | `engine/ui-enhancements.js` | Présentation, jamais autorité gameplay |
| `map-registry.js` | **PROTÉGÉ** | Pas de logique mission/objet/population |

## Contrat d'autorité missionnelle

### Hiérarchie

`MissionManager` reste l'unique propriétaire du lifecycle et du choix missionnel. La hiérarchie fonctionnelle est :

1. directive joueur persistante / Top1 explicite ;
2. action missionnelle locale réellement exécutable ;
3. travail exécutable d'une autre mission de la shortlist prioritaire ;
4. travel missionnel structuré connu ;
5. travel inconnu contractuellement autorisé ;
6. fallback missionnel borné hors shortlist si un travel structuré existe ;
7. autonomie libre seulement si aucun travail missionnel exécutable ne subsiste.

Une mission active/primary peut rester non-runnable localement. Elle ne doit ni être artificiellement complétée ni garder une exclusivité stérile.

### Top1 / Top4

- choix joueur = Top1 persistante ;
- sans choix joueur, la shortlist prioritaire reste bornée à 3–4 missions ;
- la shortlist n'est pas une liste de fonctions mais une autorité missionnelle ;
- le moteur doit distinguer `active`, `priority`, `runnable`, `has structured transition`, `has global mission authority` ;
- une candidate refusée/échouée ne doit pas provoquer immédiatement la chute vers BAC libre : la candidate missionnelle suivante doit être évaluée.

### Défaut HEAD connu

Au HEAD `d334ed2`, `MissionManager` expose `hasMissionExecutionAuthority()` mais `WorldEngine.ensureActivity()` consulte encore `hasPrimaryMissionAuthority()`. Cette divergence peut autoriser l'anti-idle/autonomie libre lorsque la primaire est stérile alors qu'une autre mission dispose encore de travail exécutable.

Statut : **défaut ouvert, non contractualisé comme comportement voulu**.

Le futur correctif doit réutiliser ces propriétaires ; aucun nouveau bridge d'autorité.

## Continuité missionnelle géographique

Ordre : `LOCAL → KNOWN → UNKNOWN CONTRACTUEL → FREE`.

### Destination connue

Une destination peut être structurée par :
- nœud/paramètre missionnel ;
- fait de map mémorisé ;
- completion gate géographique ;
- `mapGeneration` déjà résolu ;
- contexte de proximité (`siteId`, `microSceneId`, `persistentMicroSceneId`, `mapId`) lorsqu'il définit une destination unique.

Plusieurs alternatives ambiguës ne définissent pas une destination implicite unique.

### Destination inconnue

Une mission ne peut ouvrir l'inconnu que si son contrat l'autorise. La génération est matérialisée au passage réel et la destination générée est mémorisée comme fait canonique.

Une découverte fortuite d'une autre map ne doit pas activer une mission dont le premier travail dépend de **sa propre** map générée.

### Arrivée causale

`MissionManager` doit rattacher l'arrivée à la mission qui a motivé le travel :
- `arrivalWorkMissionId` ;
- `arrivalWorkMapId` ;
- état pending/résolu ;
- destination générée rattachée après matérialisation.

À l'arrivée :
- cette mission ne peut être supplantée par une autre mission non causale tant que son travail attendu n'a pas été résolu ;
- l'absence momentanée de cible physique peut produire un état d'attente borné, pas un abandon immédiat ;
- save/reload doit restaurer l'intention.

## Opportunités locales et déviation de travel

Une opportunité locale ne peut différer un travel que si elle est réellement perdable au départ et contractuellement admissible.

Autorisé : contexte local spécifique, MSC, faune/événement réellement attaché à la map.

Non autorisé : collecte générique, Shelter, COL/ENV ou activité libre pouvant être reprise plus tard.

Après une déviation locale autorisée, le travel causal reprend. Pas de réarbitration générale permanente.

## ObjectM0 / CUO / interaction inter-mission

`engine/object-m0-bridge.js` reste propriétaire du matching générique.

Filtres : `objectId`, `cuoType`, `cuoTypes`, `kind`, `family`, `subject`, `category`, tags/exclusions, contexte MSC et identité d'instance selon le contrat.

### SAME-INSTANCE

Lorsqu'une ressource doit être étudiée puis acquise :

`études réellement dues → même instance → collect/extract`.

- `cuoTypes` est un OR optionnel et ne remplace pas `cuoType` ;
- observer/inspecter/analyser peuvent être des nuances missionnelles d'une même étude physique ;
- le même nœud ne crédite pas deux fois la même instance ;
- fan-out vers missions actives compatibles.

### Frontière inter-mission renforcée

Une mission secondaire ne doit pas modifier l'`acquisitionPhase` d'une action appartenant à une autre mission simplement parce qu'elle possède un besoin d'étude actif.

Le fan-out est passif :
- l'action réelle se déroule selon son propriétaire courant ;
- les événements canoniques créditent ensuite les missions compatibles ;
- seule une étude intrinsèquement due pour **la même transaction cible** peut précéder collect/extract.

Interdit : boucle `observe → tentative collect → observe` parce qu'une mission secondaire ne sait pas consommer l'événement générique qu'elle a elle-même injecté.

## Atomicité / ciblage / approche

`WorldEngine.targetInteraction()` et la chaîne de déplacement restent responsables de l'approche physique ; MissionManager ne doit pas simuler la réussite physique.

- la création d'une `currentAction` ne prouve pas l'accessibilité ;
- l'échec `setTarget()/rebuildPath()` doit être remonté et traité ;
- `pendingInteraction` ne doit pas rester stale après changement de mission/action ;
- une interaction en cours reste atomique jusqu'à fin/échec/annulation ;
- après plusieurs échecs de chemin, les retraits/replans bornés validés peuvent être utilisés ;
- après exhaustion, échec explicite plutôt que marche infinie.

## Portée / colliders / MSC

Quand la cible est correcte mais l'approche trop stricte :
- préférer l'ajustement de portée d'interaction validé ;
- ne pas modifier colliders/hitboxes MSC sans nécessité ;
- exclure le collider de la cible de la logique obstacle tout en conservant les obstacles étrangers ;
- préserver les rayons explicites existants.

## BAC / expérimentation-prérequis

Une expérimentation requise reste une intention persistante/candidate BAC, pas un lifecycle parallèle.

- poids missionnel/axe conservés ;
- Survival peut gagner en cas de besoin réel ;
- directive joueur prioritaire ;
- primaire réellement runnable prioritaire ;
- navigation existante pour site distant ;
- aucune expérience fictive sans ressources.

## Triggers différés

Un événement ponctuel antérieur à un prérequis peut être mémorisé puis repris lors de l'activation différée.

Interdits :
- backfill artificiel d'un compteur `count > 1` ;
- seconde file d'activation ;
- activation sur une autre map que la destination générée canonique quand la mission dépend de sa propre excursion.

## Micro-scènes / identité

Plusieurs `requiredMicroScenes` sont des scènes indépendantes sauf définition explicite d'une MSC composite unique.

Pour un retour missionnel :
- mémoriser map + identité persistante ;
- utiliser la même instance ;
- ne pas remplacer une identité précise par une famille générique ;
- vérifier la complétude des objets requis avant activation si le contrat le demande.

Les aliases ciblés peuvent réparer une identité manquante uniquement s'ils conservent rôle, `missionOnly`, composition et sémantique ; ils ne doivent pas devenir un registre parallèle.

## Maps / images / population

- progression tutorielle 1→2→4→6 ;
- protections de contenu tutoriel ;
- seed/topologie persistantes ;
- WebP/PNG/alias conservent l'identité de chaque map ;
- fallback image compatible avec le biome ;
- pas de fallback Crystal arbitraire ;
- `map-registry.js` reste protégé.

Les objets explicitement immobiles (dont débris de ruine concernés) doivent être exclus de toutes les voies d'animation position/rotation/flora-wind.

## Performance / cadence

`RuntimeBudget` reste l'unique throttling adaptatif.

Doctrine :
- pas de scan de tous les colliders/objets à chaque tick pour maintenir une interaction déjà résolue ;
- résoudre la shortlist spatiale au besoin puis suivre localement l'ensemble pertinent ;
- retry sur le même ensemble géométrique avec ordre décalé possible ;
- invalider/recalculer seulement sur cause réelle ;
- pas de cache global parallèle ;
- mesurer sur déplacements/interactions habituels et scènes denses.

## Autonomie OFF / SEMI / FULL

- OFF : aucune initiative autonome, mais le déplacement direct joueur reste fonctionnel ;
- une resynchronisation OFF→OFF ne doit pas annuler répétitivement un déplacement joueur ;
- SEMI : conserver sa sémantique historique lorsqu'un chantier la traverse ;
- FULL : autonomie complète sous autorité missionnelle/BAC/survie.

Le tutoriel conserve ses règles propres d'ouverture progressive de l'autonomie.

## Téléporteur

Contrat officiel : `TP_AUTONOMY_CONTRACT_2026-09-14.md`.

- hub unique ASTROLOGY ;
- balises persistantes réelles ;
- hub↔balise uniquement ;
- pas de balise↔balise directe ;
- aucune découverte/génération synthétique ;
- post TP-AFTER-04 uniquement pour autonomie ;
- opt-in explicite ;
- `WorldEngine` calcule/exécute l'itinéraire ;
- `SpecialObjectRuntime.teleportTo()` exécute le transfert.

## Progression / inventaire / Kit

`ProgressionRegistry` reste propriétaire du stock physique.

- `grantInventory()` = crédit physique sans faux événement de collecte ;
- le Kit expose/transporte mais ne fabrique/active/consomme pas lui-même ;
- une progression missionnelle dépendant d'une consommation/collecte réelle doit rester cohérente avec le stock après save/reload.

## Relations / civilisations

`npc-runtime.js` et les propriétaires relationnels restent responsables du comportement NPC, réputation, contact et échanges. CONTACT/DIP/FIN consomment ces capacités sans les dupliquer.

## Journal

Consolidation lazy à l'ouverture : pas de polling, pas de recomposition par simple mutation DOM. Les nouvelles branches enrichissent le Journal existant.

## Sauvegarde / hydratation

`save-ui-bridge.js` initie le snapshot après flush. `MissionManager` protège l'hydratation différée lorsque les définitions ne sont pas encore disponibles.

Doivent survivre : priorités/lifecycle, intention travel, causal arrival, topologie, MSC, inventaire, constructions, research, réseau spécial et directives joueur.

## R-HEALTH / non-régression

R-HEALTH reste un checkpoint historique sain, pas une description figée du HEAD actuel.

Avant correction : classer tout test rouge comme dette de test, harness incomplet, contrat supersédé ou panne runtime reproduite.

La non-régression doit vérifier :
- invariants gameplay ;
- propriétaire réel ;
- propagation consommateurs ;
- parent Git réel ;
- absence de perte d'un comportement validé même si transporté par une ancienne couche imparfaite.

## Discipline de modification

- HEAD courant seul ;
- Gameplay V2 avant audit technique ;
- invariant gameplay comme unité de travail ;
- audit producteur → propriétaire → runtime → événement → consommateur ;
- aucun wrapper supprimé avant inventaire de ses comportements ;
- aucun moteur parallèle ;
- BASE partielle exacte ;
- mêmes tests BASE/CANDIDAT ;
- diff exact ;
- `map-registry.js` protégé ;
- validation observable avant PASS gameplay.
