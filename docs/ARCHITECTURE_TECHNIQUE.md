# BlueFox Odyssey — Architecture technique

Référence : **commit `d59376559e71032b478fb01a84fdb9bdd6611736` — V5 Stable — 15 août 2026**

## Sources de vérité
- Objet / métadonnées : `engine/object-library.js`
- Placement / instanciation : `engine/object-spawner.js`
- Biomes / population : `engine/biome-rules.js`
- Micro-scènes : `engine/micro-scenes.js` + `data/custom-micro-scenes.*`
- Monde / transitions / autonomie : `engine/world-engine.js`
- MissionManager : `engine/mission-manager.js`
- Mémoire mission : `engine/mission-memory.js`
- Patrons Bible : `data/bible-patterns.js`
- Catalogue Bible injecté : `data/bible-catalog.js`
- Contrat Bible : `engine/bible-contract-v0-1.js`
- Runtime Bible : `engine/bible-runtime-v0-1-unified.js`
- Exécution mission : `engine/action-bridge.js`
- Événements objets : `engine/object-event-registry.js`

## Contrat CUO → événements → missions
Le CUO ne sert pas uniquement au rendu 3D. Les définitions normalisées exposent :
- actions ;
- états ;
- familles ;
- tags ;
- connaissances ;
- recherche ;
- ressources ;
- progression ;
- rareté ;
- biomes ;
- spawn.

Ces métadonnées sont projetées dans `userData` puis réinjectées dans les événements consommés par le Runtime Bible.

## Contrat des micro-scènes CUSTOM
- CUO Lab enregistre les transformations locales.
- MAP_Test et le jeu doivent interpréter exactement les mêmes données.
- `ObjectSpawner` ne réécrit pas les pivots internes.
- Une MSC peut avoir trois rôles missionnels indépendants :
  - `triggerContext`
  - `objectiveSubject`
  - `scenarioSupport`
- Une MSC associée à une mission n'est donc pas automatiquement un objectif.

## Contrat missionnel actuel
Le moteur possède déjà :
- missions simultanément actives ;
- mission primaire / secondaires ;
- prérequis ;
- persistance ;
- séquences d'objectifs ;
- triggers interaction, mouvement, exploration et progression ;
- filtres `objectId`, `family`, `subject`, `mapId`, `zoneId`, `biome`, tags ;
- `uniqueOnly` sur les triggers ;
- `targetBinding = instance | definition` dans le contrat ;
- mission instanciable par map ;
- fan-out passif d'une action vers plusieurs missions actives.

### Écart V5 identifié : ciblage exact d'instance
Le Runtime mémorise `instanceId` et le contrat autorise `targetBinding=instance`, mais l'ActionBridge ne garantit pas encore que la cible choisie est précisément cette instance.

À corriger :
```text
bibleTarget.instanceId
→ MissionPlanner
→ ActionBridge
→ candidat interactable exact
```

Cette correction est un raccord, pas un nouveau moteur.

### Distinction sur objectifs actifs
Les triggers peuvent être uniques, mais `MissionNode` reste un compteur simple.

Extension requise :
- `distinctBy: instanceId`
- `distinctBy: mapId`
- `distinctBy: biomeId`
- `distinctBy: speciesId`

avec mémoire persistante des valeurs déjà comptées.

### Portée
Paramètre commun recommandé :
- `local`
- `map`
- `global`

Ne pas créer un patron différent uniquement pour une différence de portée.

### Exploration
Les variantes d'exploration doivent être pilotées par paramètres :
- seuil de surface ;
- nombre de zones ;
- nombre de maps distinctes ;
- nombre de biomes distincts ;
- direction ;
- retour.

### Spawn MSC missionnel
L'infrastructure `site.establish` prouve déjà la chaîne :
```text
mission effect
→ placement
→ ObjectSpawner.spawnMicroScene()
→ rattachement map
→ persistance
→ restauration
```

À généraliser en effet de type `microScene.spawn` au lieu de créer un moteur séparé.

### Durée / proximité / délai
Nécessaires pour les comportements de faune et certaines scènes :
- présence dans rayon pendant N secondes ;
- délai avant deuxième signal ;
- occurrence distincte si une scène doit être observée à nouveau.

### Excursion / retour
Un cycle valide est :
```text
départ
→ au moins un changement de map
→ retour à la cible connue
```
Deux sorties demandées = deux cycles distincts.

## Stratégie de patrons mutualisés
Cible : environ 8 familles génériques au total, en incluant les 3 déjà présentes.

Les différences doivent être des paramètres, notamment :
- unicité ;
- portée ;
- même instance ;
- séquence ;
- contexte MSC ;
- durée ;
- seuil ;
- direction ;
- effets.

Les patrons doivent être développés en parallèle des extensions moteur qu'ils utilisent.

## CUO / factions
Ajouter au niveau des créatures/PNJ :
- `speciesId`
- `factionId`

`cultureId` peut être porté par une MSC/instance.

Les événements doivent hériter de ces identités afin que les missions puissent filtrer et modifier une réputation simple.

## Ration
`survival.rationRecipe` est déjà référencé par le moteur. Ne pas créer une seconde recette avant audit de cette source.

## Non-régression
Tout correctif missionnel doit préserver :
- un événement révèle au plus une mission ;
- une action peut progresser plusieurs missions actives ;
- commandes joueur prioritaires ;
- MSC identiques entre CUO Lab / MAP_Test / jeu ;
- camps jamais spontanés ;
- navigation persistante ;
- aucune logique objet dans `map-registry.js`.
