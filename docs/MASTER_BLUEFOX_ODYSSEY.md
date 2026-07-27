# BlueFox Odyssey — Document maître

Version de référence : **V0.16.20**  
Date : **27 juillet 2026**

## Vision

BlueFox Odyssey est un jeu WebGL d’exploration 3D dans lequel BlueFox, un
renard astronaute autonome, survit et apprend sur une planète inconnue. Le
joueur intervient peu mais influence ses priorités, ses directions, sa
personnalité et ses projets.

BlueFox continue d’observer, se déplacer, récolter, se nourrir, se reposer et
rechercher même lorsqu’un menu est ouvert. Une première exploration inconnue
reste une décision active du joueur.

## Vocabulaire officiel

- **Zone** : une Map complète du point de vue du joueur.
- **Map** : terme technique équivalent à une Zone.
- **Plateau** : carré technique 1/1 constituant une Map.
- Une Map contient de **1 à 6 plateaux**.
- Une Zone découverte est mémorisée et peut ensuite être revisitée.

Le mot « plateau » ne doit pas apparaître comme une nouvelle Zone dans le
Journal ou le menu Planète.

## Boucle de jeu actuelle

1. BlueFox observe son environnement et choisit une activité.
2. Il collecte seulement les ressources utiles à son intention globale.
3. Le joueur peut suggérer une destination ou une direction.
4. Si BlueFox accepte une direction, il utilise temporairement `Run_fast`.
5. Un portail de bordure permet de découvrir ou revisiter une Zone.
6. La découverte enrichit la carte Planète, le Journal et les connaissances.
7. BlueFox revient au refuge sur demande ou selon ses besoins.

## Informations affichées

- **En ce moment** : activité instantanée.
- **Intention actuelle** : objectif stable ou projet prioritaire.
- **Bulles de BlueFox** : commentaire immédiat, masquable par le joueur.
- **Journal** : date fictive, temps vécu, émotions, synthèses et 50 actions.
- **Planète** : Zone actuelle et quatre directions voisines.

## État estimé

- Stabilité du socle 3D : **environ 72 %**, en attente de validation prolongée
  de la V0.16.20 sur les transitions, le cyclorama et les grandes Maps.
- Avancement du jeu complet envisagé : **environ 22 %**.

L’objectif reste d’atteindre **75 % de stabilité du socle 3D** avant
d’accélérer fortement le contenu, la narration et les systèmes avancés.

## Règles de livraison

- Les ZIP de correctifs excluent toujours le dossier `Images`.
- Le dossier local `Images` doit rester à la racine, à côté de `index.html`.
- Le jeu doit être lancé par `LANCER_BLUEFOX.bat`, jamais directement par
  `index.html`.
- En cas de problème d’asset, vérifier d’abord la présence du dossier Images et
  régénérer `Images/images-catalog.js`.

