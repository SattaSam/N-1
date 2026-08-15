# BLUEFOX ODYSSEY — MASTER

## État de référence
Dernière mise à jour : 2026-08-15

### Version de travail
- Base GitHub de référence : commit `d59376559e71032b478fb01a84fdb9bdd6611736` — **V5 Stable**.
- Ce commit remplace comme base de reprise les anciens jalons cumulés et doit être considéré comme point de départ obligatoire de tout nouveau correctif.
- Base PC historique : V16.20.
- Version mobile/APK précédente : V16.14, considérée obsolète.
- Développement mobile à reprendre depuis la base PC stable courante.
- Objectif : builds testables régulièrement, Web puis Android.

## Gouvernance documentaire officielle
Les seuls documents de référence officiels maintenus sont ceux listés dans `docs/README.txt` :
- `MASTER.md`
- `ARCHITECTURE_TECHNIQUE.md`
- `ROADMAP_TODO_RUNTIME_CLOTURE_CUO_PRIORITAIRE.md`
- `DEV_HISTORIQUE.md`
- `MUSIC_SYSTEM_V1.md`

Les autres DOCX/MD présents dans `docs/` sont des annexes, archives ou sources historiques et ne doivent pas être utilisés pour piloter le chantier courant.

## Architecture 3D concernée
Fichiers principaux :
- `engine/bluefox3d-core.js`
- `engine/map-registry.js`
- `engine/world-engine.js`
- `engine/object-library.js`
- `engine/object-spawner.js`
- `engine/micro-scenes.js`
- `game.js` uniquement si des réglages restent compilés ou embarqués à la racine.

## Contrat MSC validé
- CUO Lab, MAP_Test et moteur du jeu doivent restituer exactement les mêmes transformations locales enregistrées.
- `ObjectSpawner` choisit uniquement l'ancrage et la rotation globale d'une instance MSC.
- Les trois MSC coralliennes sous-marines bioluminescentes restent intégrées.
- Les rochers blanchis restent exclus de tout contexte non glace/banquise/neige/toundra.
- Les scènes déjà créées et les associations mission↔MSC déjà décidées doivent être réutilisées avant toute création nouvelle.

## Système de missions et progression
- Le Runtime missionnel V0.1 / MissionManager M2 reste la fondation fonctionnelle.
- Une action peut faire progresser plusieurs missions déjà actives.
- Un même événement ne peut révéler qu'une seule nouvelle mission.
- Mission principale et missions secondaires coexistent ; les secondaires progressent passivement.
- `MissionMemory` reste la mémoire persistante des lifecycles, faits, historiques, effets et sites.
- Le registre central de progression reste autoritaire pour les quantités d'inventaire.

## Principe officiel Bible → moteur
La Bible documentaire reste la source narrative humaine et souveraine.

Chaîne officielle :

```text
BIBLE DOCUMENTAIRE
  ↓
PATRON DE MISSION
  ↓
FICHE DE MISSION PARAMÉTRÉE
  ↓
BibleRuntime
  ↓
MissionManager + ObjectEvents + BAC
  ↓
Moteur du jeu
```

Le patron porte la mécanique commune. La fiche ne contient que les paramètres propres à une mission.

### Stratégie de patrons
L'objectif n'est pas de créer un patron par mission, mais un nombre réduit de familles génériques couvrant un maximum de cas avec des interrupteurs.

Interrupteurs de référence :
- `targetBinding = instance | definition`
- `distinctMode = indifferent | unique`
- `scope = local | map | global`
- `sameTarget = true | false`
- `count` / `threshold`
- `duration` / `proximity`
- `direction`
- `contextRole = triggerContext | objectiveSubject | scenarioSupport`
- effets / délai / prérequis

Les trois patrons de preuve actuels restent la base :
1. découvrir / comprendre ;
2. accumuler / atteindre un seuil ;
3. préparer → produire / débloquer.

Ils doivent être complétés par quelques familles supplémentaires seulement lorsque les besoins documentaires l'exigent.

## Audit Bible / CUO / moteur — 15 août 2026
Conclusion : le moteur générique est largement suffisant ; les principaux manques sont des raccords ciblés.

Déjà disponibles :
- triggers interaction/exploration/progression ;
- `instanceId`, `mapId`, `zoneId`, `factionId` dans les événements ;
- `targetBinding` au contrat ;
- mission instanciable par map ;
- `uniqueOnly` sur les triggers ;
- persistance des faits/historiques ;
- infrastructure de spawn MSC via `site.establish` ;
- fan-out multi-missions ;
- métadonnées CUO riches et réellement propagées au runtime.

Raccords à compléter :
- faire suivre réellement `targetBinding=instance` jusqu'à ActionBridge ;
- ajouter `distinctBy` sur les objectifs actifs ;
- agréger plusieurs maps/biomes/instances dans une mission globale ;
- généraliser le spawn MSC missionnel ;
- durée/proximité/délai ;
- cycle excursion→retour ;
- effets génériques de branche, réputation et faits.

## CUO / factions / réputation
- Chaque type de créature/PNJ pertinent doit porter un `speciesId` et un `factionId`.
- `cultureId` peut être porté par la MSC/instance si le contexte l'exige.
- Réputation simple attendue : agressif, neutre, friendly, friendly++.
- Ne pas recréer les PNJ : enrichir leur identité fonctionnelle.

## Ration
La brique `survival.rationRecipe` existe déjà dans le moteur et doit être retrouvée/auditée avant toute nouvelle création de recette ou de patron dédié.

## Tutoriel
Après les patrons/raccords génériques :
- implanter T01 à T12 comme lot de validation ;
- T01–T06 dirigés ;
- T07 introduit l'autonomie ciblée ;
- T08 valide le retour explicite au Site du crash ;
- récupérer T09–T12 depuis les sources canoniques avant implantation.

Le tutoriel est le banc de validation avant industrialisation des 182 missions.

## Direction actuelle
Priorité immédiate :
1. patrons missionnels mutualisés + raccords moteur associés ;
2. factions/réputation + ration ;
3. T01–T12 ;
4. industrialisation progressive des 182 missions ;
5. finitions gameplay, audio, performances et packaging.
