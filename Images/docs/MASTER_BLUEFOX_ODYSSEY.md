# BlueFox Odyssey — Document maître

Version logicielle de référence : **V0.16.20 + Sprints Missions 1 à 4**

Point documentaire : **1er août 2026 — moteur multi-missions et interfaces**

Statut : **candidat à valider dans le jeu avant le prochain point Git**

## Vision

BlueFox Odyssey est un jeu WebGL d’exploration 3D dans lequel BlueFox, un
renard astronaute autonome, survit et apprend sur une planète inconnue. Le
joueur influence ses priorités, ses directions, sa personnalité et ses projets
sans le contrôler en permanence.

BlueFox continue d’observer, se déplacer, récolter, se nourrir, se reposer et
rechercher lorsqu’un menu est ouvert. La première exploration d’une Zone
inconnue reste une décision active du joueur.

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
