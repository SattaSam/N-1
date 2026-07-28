# BlueFox Odyssey — Document maître

Version logicielle de référence : **V0.16.20**  
Point documentaire : **28 juillet 2026 — refonte du catalogue d’objets**  
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

## Informations affichées

- **En ce moment** : activité instantanée.
- **Intention actuelle** : objectif stable ou projet prioritaire.
- **Bulles de BlueFox** : commentaire immédiat, masquable.
- **Journal** : date fictive, temps vécu, émotions, synthèses et 50 actions.
- **Planète** : Zone actuelle et quatre directions voisines.

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
- Ancienne base mobile/APK V16.14 : **obsolète**.
- Refonte catalogue : dépendances raccordées dans `index.html`, cohérence
  syntaxique vérifiée, **test de lancement réel encore requis**.
- Stabilité du socle 3D estimée avant ce test : **environ 72 %**.
- Objectif du prochain jalon : **75 %**.
- Avancement global estimatif : **environ 22 %**.

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
