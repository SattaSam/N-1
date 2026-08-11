# BLUEFOX ODYSSEY — MASTER

## État de référence
Dernière mise à jour : 2026-08-09

### Version de travail
- Base PC connue : V16.20.
- Version mobile/APK précédente : V16.14, considérée obsolète.
- Développement mobile à reprendre depuis la V16.20 à jour.
- Objectif : builds testables régulièrement, Web puis Android.

### Architecture 3D concernée
Fichiers principaux :
- `engine/bluefox3d-core.js`
- `engine/map-registry.js`
- `engine/world-engine.js`
- `game.js` uniquement si des réglages restent compilés ou embarqués à la racine.

### Rendu des plateaux
Décisions validées :
- amélioration modérée, sans refonte complète du terrain ;
- réglages de texture et de matériau en priorité ;
- réduction visuelle des zones d’environ 10 % ;
- transitions simples entre zones voisines ;
- optimisation des UV ;
- éviter les shaders complexes ;
- tester `MeshBasicMaterial` uniquement si les réglages actuels restent insuffisants.

### Gestion des anciennes maps
Le moteur doit retirer proprement l’ancienne map avant de charger la suivante :
- détachement de la scène avec `removeFromParent()` ;
- libération des géométries, matériaux et textures ;
- aucune ancienne texture de plateau ne doit rester visible après changement de map.

### Images
- Décors panoramiques : fichiers `N...`
- Textures de zones : fichiers `0N_x`
- Association préférentielle par numéro.
- Une texture correspond à une zone.
- Une map peut comporter de 1 à 6 zones.

### Système de missions et progression
- Ajouter un registre central de progression comme source de vérité unique, sans remplacer brutalement le moteur existant.
- Les actions du jeu émettent des événements standardisés : collecte, inspection, découverte, exploration, rencontre, analyse, recherche, palier atteint.
- Une même action peut alimenter plusieurs missions, recherches, maîtrises, indicateurs de map et événements de journal.
- Distinguer strictement :
  1. compteurs historiques ;
  2. inventaire actuel ;
  3. ressources consommées ou déposées ;
  4. découvertes uniques ;
  5. paliers déjà atteints.
- Conserver des progressions à plusieurs portées : zone, map, planète, faction, mission, global.
- L’exploration d’une map se mesure en pourcentage de surface ou secteurs parcourus.
- L’expertise d’une map se mesure en objets collectés ou inspectés, ressources identifiées, POI analysés, phénomènes observés, ruines scannées et espèces étudiées.

### Interactions objets
Objectif d’architecture validé :
- remplacer les branches codées en dur sur des types comme `crystal` et `fiber` par une résolution pilotée par métadonnées ;
- supporter au minimum : collecter, inspecter, observer, analyser, extraire ;
- ne retirer du monde que les objets explicitement collectables ;
- conserver les objets inspectables ou observables ;
- émettre un événement de progression correspondant à l’action réelle.

### État du chantier interactions / missions
- La base de reprise reste le commit GitHub `5e381d3` (`V4.5 missionV12+ UI`).
- Le cumulatif propre V17, construit sur cette base, est validé en jeu.
- La collecte est pilotée par les métadonnées CUO et un événement canonique ;
  aucun compteur direct propre à la mission Camp ne doit être réintroduit.
- Les corrections V15 à V17 constituent désormais le point de référence local
  jusqu'à leur intégration au dépôt.

### Méthode de développement obligatoire
Avant tout correctif :
1. diagnostic approfondi du symptôme ;
2. audit complet du fichier concerné ;
3. audit de ses dépendances, appels et effets de bord ;
4. reproduction du bug et tests pertinents ;
5. vérification des interactions avec les fonctionnalités voisines ;
6. demande des fichiers manquants si nécessaire ;
7. correction seulement après l’audit ;
8. relance des tests ciblés et de non-régression ;
9. résumé de la cause racine, des fichiers modifiés et des validations.

### Direction actuelle
Priorité à la stabilité, au rendu lisible et aux petits livrables réellement testables.


## Jalon narratif / missions — 2026-08-08

### Principe officiel Bible → moteur

La **Bible documentaire reste une source narrative humaine**. Elle n'est pas réécrite
sous forme de données moteur ligne par ligne.

Chaîne officielle :

```text
BIBLE
  ↓
PATRON DE MISSION
  ↓
FICHE DE MISSION
  ↓
BibleRuntime
  ↓
MissionManager + ObjectEvents + BAC
  ↓
Moteur du jeu
```

Le **patron** contient la mécanique commune à une famille de missions.
La **fiche** ne contient que les paramètres propres à une mission.

Règle de production : traiter la Bible **patron par patron**, convertir toutes les
missions compatibles en lot, auditer la passe, valider, puis seulement passer au
patron suivant.

### Patrons V1 validés

1. **DÉCOUVRIR / COMPRENDRE**
   - déclencheur ;
   - observer / inspecter ;
   - éventuellement analyser ;
   - seuil ou condition de compréhension ;
   - narration ;
   - conséquence / récompense.

2. **ACCUMULER / ATTEINDRE UN SEUIL**
   - compter des événements réels du jeu ;
   - une action peut créditer plusieurs missions simultanément ;
   - seuil atteint ;
   - narration ;
   - conséquence / récompense.

3. **PRÉPARER → PRODUIRE / DÉBLOQUER**
   - prérequis / ressources / connaissances ;
   - conditions remplies ;
   - résolution automatique ;
   - narration ;
   - résultat.

### Fiche de mission V1

Une fiche doit rester légère et humaine :

- Mission ;
- Patron ;
- Axe BAC principal / secondaire éventuel ;
- Déclenchement ;
- Objectif ;
- Résolution ;
- Résultat ;
- Narration ;
- Suite.

Ne pas recopier dans chaque fiche les règles déjà définies par le patron.

### Axes BAC V1

Axes comportementaux retenus :

- Survie ;
- Exploration ;
- Collecte / Logistique ;
- Recherche / Connaissance ;
- Construction / Technologie.

La mission prioritaire influence fortement BlueFox.
Les missions secondaires restent actives, progressent passivement à partir des
événements réels et peuvent occasionnellement proposer une action autonome sans
devenir prioritaires.

### Résolution des objectifs BUILD / fabrication

Un objectif de fabrication ou de construction n'exige pas nécessairement une
action physique supplémentaire de BlueFox.

Quand les conditions sont satisfaites, la mission peut produire directement une
sortie standard :

- **MONDE** : apparition d'un objet ou d'une micro-scène
  (camp, drone, balise, etc.) ;
- **INVENTAIRE** : ajout d'un outil ou objet fabriqué dans le sac ;
- **CONNAISSANCE** : ajout d'un blueprint / recherche connue.

Ce principe devient la piste prioritaire pour `BIBLE-V0-CAMP` et les futures
missions de construction.

### État technique mission validé

- BibleRuntime V0 chargé avant le moteur monde ;
- trois patrons / trois missions techniques de test ;
- missions multiples actives ;
- mission principale distincte des secondaires ;
- progression passive multi-missions via les événements réels ;
- une mission secondaire peut progresser sans devenir prioritaire ;
- persistance F5 des missions, compteurs et priorité validée ;
- ancienne purge Mission V0 rendue non destructive au démarrage ;
- arbitrage autonome principale / secondaires raccordé au BAC ;
- poids de référence : principale `100`, budget global secondaires `20` ;
- une action secondaire conserve son `missionId` et se termine sur son propre arbre ;
- refus d'interaction propagé proprement au MissionManager ;
- reset de cible résiduelle après interaction refusée ;
- watchdog des `currentAction` orphelines.

Limite connue : blocage ponctuel autour d'un arbre-cactus lors d'une observation,
probablement lié à la hitbox / approche ; correction reportée.

## Carte Planète — état 2026-08-08

La topologie coordonnée du monde est désormais la référence : une carte possède
une position spatiale et une exploration vers une coordonnée déjà occupée doit
reconnecter la carte existante au lieu d'en générer une nouvelle.

Le menu Planète représente cette topologie de manière organique avec les zones
explorées, une texture planétaire neutre et des liaisons cohérentes.

Le **dernier design visuel du menu Planète est en cours de validation** :
ne pas le considérer définitivement figé tant que la validation dédiée n'est pas
clôturée.

## Jalon missions Camp / Archéologie — 2026-08-09

### V15 — collecte de bois et établissement du camp

- L'objet `tree_fallen` porte le libellé joueur **Bois**.
- Un buisson produit `2` bois et un bois tombé produit `1` bois.
- Chaque collecte réelle crédite immédiatement l'inventaire et toutes les missions
  compatibles par un unique événement canonique `RESOURCE_COLLECTED`.
- L'identité d'événement assure l'idempotence sans interdire de récolter une même
  instance après sa réapparition.
- `BIBLE-V01-CAMP` exige `10` bois réellement présents dans le registre central.
- Les `10` bois sont consommés une seule fois par une transaction persistante.
- La résolution établit un site logique `camp`, stage `1`, sur la Map courante et
  fait apparaître `MSC-CUSTOM-CAMP` près de la capsule.

### V16 — « Étudier une trace ancienne »

- Déclenchement par observation d'un objet portant les tags `technology` ou `ruin`.
- La cible est liée à l'instance exacte observée.
- Séquence obligatoire : **Observer → Inspecter → Analyser**.
- La mission ne peut se terminer qu'à proximité d'un camp réellement établi ;
  aucune présence de secours propre à Crystal n'est admise.
- Le verrou de retour est réévalué par la boucle monde à partir de l'état persistant
  du site.

### V17 — hydratation et restauration visuelle

- Les arbres des missions terminées sont restaurés dans `MissionManager` après F5.
- Le catalogue expose une progression terminée cohérente même pour une ancienne
  sauvegarde ne possédant pas encore d'arbre sauvegardé.
- Le rendu du site est restauré de façon déterministe à la fin de
  `WorldEngine.loadMap()` par `BibleRuntime.renderCurrentSite()`.
- L'état logique du camp reste autoritaire ; le rendu 3D est une projection de cet
  état, pas une seconde source de vérité.

Le cumulatif V17 a été validé et confirmé en jeu. Les contrôles automatisés
associés passent : **27 tests sur 27**.

### Prochaine reprise

Créer une quatrième mission uniquement depuis une fiche déclarative afin de
prouver l'extensibilité de la chaîne complète. Valider ensuite son cycle complet,
la sauvegarde/recharge et la non-régression des trois missions existantes.
