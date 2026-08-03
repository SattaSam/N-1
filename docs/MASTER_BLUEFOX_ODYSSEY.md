# BlueFox Odyssey — Document maître

Version logicielle de référence : **V0.16.20 + correctifs cumulatifs + générateur V1**

Point documentaire : **3 août 2026 — CUM documentaire, catalogue de missions et préparation de la passe 2 dynamique**

Statut : **socle technique cumulatif à valider en jeu ; CUM documentaire en cours de consolidation, non encore raccordé au moteur**

## Vision

BlueFox Odyssey est un jeu WebGL d’exploration 3D dans lequel BlueFox, un
renard astronaute autonome, survit et apprend sur une planète inconnue. Le
joueur influence ses priorités, ses directions, sa personnalité et ses projets
sans le contrôler en permanence.

BlueFox continue d’observer, se déplacer, récolter, se nourrir, se reposer et
rechercher lorsqu’un menu est ouvert. La première exploration d’une Zone
inconnue reste une décision active du joueur. L’autonomie peut reconnaître un
plateau dans le cadre d’une mission, mais ne crée ni ne franchit spontanément
un passage vers une nouvelle Map.

## Vocabulaire officiel

- **Zone** : une Map complète du point de vue du joueur.
- **Map** : terme technique équivalent à une Zone.
- **Plateau** : carré technique 1/1 constituant une Map.
- Une Map contient de **1 à 6 plateaux**.
- Une Zone découverte est mémorisée et peut ensuite être revisitée.

Le mot « plateau » ne doit pas apparaître comme une nouvelle Zone dans le
Journal ou le menu Planète.

## Boucle de jeu

1. BlueFox observe son environnement et choisit une activité.
2. Il collecte les ressources utiles à son intention globale.
3. Le joueur peut suggérer une destination ou une direction.
4. Si BlueFox accepte une direction, il utilise temporairement `Run_fast`.
5. Un portail de bordure permet de découvrir ou revisiter une Zone.
6. La découverte enrichit Planète, le Journal et les connaissances.
7. BlueFox revient au refuge sur demande ou selon ses besoins.

## Moteur de missions — M0 à Sprint 4

Le moteur dispose désormais d’un premier arbre de mission hiérarchique
persistant. Une mission peut contenir des sous-objectifs, des prérequis, un
volume d’actions à accomplir et une progression sauvegardée.

Sur chaque Map, la progression d’installation respecte obligatoirement :

1. `camp` — repos, sécurité et alimentation ;
2. `shelter` — refuge durable ;
3. `base` — installation évoluée déverrouillant de nouveaux projets.

La première mission active `camp@Map` précède donc toujours le refuge, y
compris hors Map de départ. Le moteur prend en charge plusieurs missions
actives, mais une seule mission principale pilote BlueFox. Les missions
secondaires progressent passivement depuis le registre central.

L’analyse initiale d’une zone demande ensuite :

1. de reconnaître la zone ;
2. d’identifier trois éléments différents ;
3. de cartographier les ressources ;
4. de réunir les ressources nécessaires au refuge.

Atteindre une Zone ne valide jamais à lui seul son exploration. La mission
énergie douce existe dans le catalogue M0, mais elle ne doit pas être activée
automatiquement après le refuge.

Cette couche ne remplace pas l’autonomie existante. Elle propose une action
uniquement lorsque le moteur est libre et laisse l’autonomie historique
reprendre si aucune action de mission n’est réalisable.

Le menu Missions affiche les états, la progression, les prérequis et une note
de journal dans laquelle BlueFox explique l’origine et l’ambition du projet.
Le menu Inventaire sépare le sac personnel du stockage partagé entre tous les
camps. Les transferts sont disponibles uniquement dans une Map avec camp ; le
sac peut être vidé automatiquement au camp de base principal.

## Informations affichées

- **En ce moment** : activité instantanée.
- **Intention actuelle** : objectif stable ou projet prioritaire.
- **Bulles de BlueFox** : commentaire immédiat, masquable.
- **Journal** : date fictive, temps vécu, émotions, synthèses et 50 actions.
- **Planète** : carte 2D déplaçable dans un faux globe, Zones découvertes,
  connexions topographiques, focus et suggestions de déplacement.


## Catalogue Universel des Missions — CUM

Le **Catalogue Universel des Missions (CUM)** devient le référentiel documentaire
des missions de BlueFox Odyssey. Il complète le moteur M0 déjà intégré sans
remplacer les missions historiques ni modifier leur source d’autorité.

Le document source `BlueFox_Odyssey_Catalogue_Missions.docx` contient **35
missions principales**, organisées en dix chapitres narratifs. Chaque mission
possède un déclencheur formulé par BlueFox, un type, une description, trois
sous-missions, des prérequis et une récompense ou un déblocage.

La structure de travail retenue pour le CUM lisible est volontairement limitée à
six vues :

1. **Missions** — une mission principale par ligne ;
2. **Objectifs** — une sous-mission ou un objectif par ligne ;
3. **Narration** — pensées, commentaires de journal, réactions et obsessions ;
4. **Dépendances** — prérequis, liens entre missions et conditions de réveil ;
5. **Moteur** — événements, variables, portée, doublons et adaptation requise ;
6. **Tableau de bord** — suivi de complétude et d’intégration.

Principes validés :

- les missions du CUM **alimentent ou complètent** les missions déjà intégrées ;
- une mission principale peut exposer des missions filles ou objectifs
  consultables et priorisables ;
- les portées **Locale** et **Monde** doivent être distinguées ;
- les missions dormantes sont persistantes mais invisibles avant leur réveil ;
- certaines découvertes peuvent créer une **obsession** différée et faire
  converger plusieurs indices ;
- le déclencheur technique ne remplace jamais la pensée de BlueFox ni son entrée
  de journal ;
- les axes de personnalité et les émotions pourront pondérer les suggestions,
  la narration et certaines branches sans imposer un profil exclusif.

État au 3 août 2026 :

- extraction structurée des 35 missions du Word : réalisée ;
- première base en six feuilles : réalisée ;
- prototypes étendus C0/C1/C2 : produits comme exploration documentaire, mais
  **non autoritaires** pour le moteur ;
- enrichissement exhaustif, audit des doublons et raccordement aux événements M0 :
  à poursuivre ;
- aucune donnée CUM nouvelle n’est encore chargée automatiquement par le jeu.


## Architecture du catalogue d’objets

`engine/object-library.js` est le **Catalogue Universel des Objets** et la
source unique des définitions d’objets. Il n’existe pas de
`object-catalog.js` séparé.

- `object-library.js` : géométrie, métadonnées, gameplay et placement propre à chaque objet.
- `biome-rules.js` : profils, budgets, ressources et décorations par biome.
- `micro-scenes.js` : amas procéduraux et compositions de landmarks.
- `object-spawner.js` : création, placement, collisions, interactables et animation des objets générés.
- `map-registry.js` : registre et construction des Maps ; aucune définition ni génération d’objet.

L’ajout ordinaire d’un objet ne doit pas nécessiter de modification de
`map-registry.js`.

Le CUO documentaire consolidé contient **36 objets** : **14 objets actuellement
matérialisables** et **22 objets documentaires à intégrer**. Les PNJ, la faune,
les habitations, les technologies et les structures spéciales exigent une
validation visuelle avant leur activation dans le jeu.

## Générateur semi-aléatoire V1

Crystal est une Map narrative fixe de départ, 1/1, associée au crash de la
capsule et à la future base principale. Elle est exclue des tirages ordinaires.

La progression initiale est : Crystal, puis Maps inconnues de 2, 4 et 6
plateaux. Les générations suivantes utilisent de 1 à 6 plateaux selon les
pondérations validées. Une seed unique par partie rend chaque définition
reproductible ; la définition complète est également sauvegardée afin de
résister aux futures évolutions des règles.

Le générateur conserve au maximum cinq familles de ressources par Map. Les
budgets planifiés vont de 60–75 objets pour une Map 1/1 à 132–150 objets pour
une Map 6/6, avec 1 à 3 micro-scènes principales sur une Map 6/6.

Les textures suivent la politique suivante lors des replis : 85 % de
réutilisation des textures associées au décor, 13 % de textures d’un autre
décor du même biome et 2 % d’exceptions explicitement compatibles. Aucun repli
global non filtré n’est autorisé. Une combinaison générée reste inchangée au
rechargement.

## Prochains chantiers validés

Deux chantiers sont désormais conduits en parallèle, sans les confondre :

### A. Passe 2 — comportements dynamiques et CUO

L’intégration contrôlée du CUO complet reste nécessaire :

1. audit du catalogue consolidé ;
2. validation des métadonnées et coûts de spawn ;
3. matérialisation dans un banc 3D distinct ;
4. validation visuelle, collision et interaction ;
5. raccordement progressif aux biomes et micro-scènes ;
6. activation dans le moteur principal après validation.


### B. Consolidation du CUM

1. vérifier l’extraction complète des 35 missions et des 105 sous-missions ;
2. conserver intégralement les déclencheurs, prérequis et récompenses du Word ;
3. classer chaque mission par projet, catégorie et portée ;
4. détecter les doublons fonctionnels avec M0 et les missions historiques ;
5. définir les événements et variables déjà disponibles dans le registre central ;
6. isoler les adaptations réellement nécessaires avant tout changement de code ;
7. préparer une cartographie humaine lisible des dépendances ;
8. ne raccorder le CUM au moteur qu’après validation documentaire.

Le banc de validation est spécifié dans
`docs/CUO_BANC_VALIDATION_3D.md`. Il ne doit charger ni IA, ni missions, ni
autonomie et ne doit pas modifier le comportement du jeu principal.

## État connu

- Base PC : **V0.16.20**.
- Moteur de missions Sprints 1 à 4 intégré : **contrôles statiques et cycles logiques réussis,
  validation en jeu requise**.
- `CharacterController` et `PathPlanner` sont inchangés par M0.
- Ancienne base mobile/APK V16.14 : **obsolète**.
- Refonte catalogue : dépendances raccordées dans `index.html`, cohérence
  syntaxique vérifiée, **test de lancement réel encore requis**.
- Correctif cumulatif portails/carte Planète : contrôles statiques réussis,
  **validation visuelle et fonctionnelle dans le jeu encore requise**.
- Générateur V1 : tables, seed, génération incrémentielle, persistance,
  cohérence des textures et budgets 1–6 intégrés ; **validation prolongée en
  jeu requise**.
- Travail technique validé : **poursuite de la passe 2 dynamique, banc 3D et intégration CUO**.
- Travail documentaire validé : **consolidation du CUM simplifié à partir des 35 missions du Word**.
- Le CUM n’est pas encore une source de données active du moteur ; M0 reste autoritaire.
- Stabilité du socle 3D estimée avant ce test : **environ 72 %**.
- Objectif du prochain jalon : **75 %**.
- Avancement global estimatif : **environ 28 %**.

Ces pourcentages restent indicatifs jusqu’à validation fonctionnelle.

## Règles permanentes

- Les fichiers complets sont livrés ; pas de patch spéculatif présenté comme résultat final.
- Un test syntaxique ne remplace jamais un test de lancement complet.
- Les ZIP de correctifs excluent normalement `Images`, sauf demande explicite.
- Le dossier `Images` reste à la racine, à côté de `index.html`.
- Le jeu se lance avec `LANCER_BLUEFOX.bat`, jamais directement avec `index.html`.
- Après modification des images, régénérer `Images/images-catalog.js`.
- `index.html` est l’autorité sur l’ordre de chargement des scripts.
- Les fichiers protégés ne sont modifiés qu’avec une justification localisée,
  une vérification des dépendances et un test de non-régression.
- Un hotfix reprend toujours le dernier état cumulatif. Ne jamais réimporter un
  fichier GitHub plus ancien au milieu d’une série de correctifs non intégrés.
