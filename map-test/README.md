# Laboratoire de maps BlueFox

Lancer `LANCER_MAP_TEST.bat`. Le module utilise les catalogues et constructeurs du moteur du jeu sans portail, journal ni navigation inter-map.

## Flux de travail

1. Choisir de 1 à 6 plateaux et un profil de biome.
2. Cliquer sur **Générer une nouvelle map**.
3. Ajouter autant de micro-scènes que nécessaire depuis le catalogue réel.
4. Cliquer sur **Valider et générer la map**.
5. Activer **Déplacer les micro-scènes**, sélectionner une scène puis la glisser. Les axes X/Y/Z se règlent par pas de 15° et H ajuste la hauteur par pas de 0,25 unité.
6. Saisir un nom et cliquer sur **Sauvegarder dans le moteur**.

La sauvegarde attribue le prochain numéro disponible selon les maps et images existantes, puis écrit `data/custom-maps.json` et `data/custom-maps.js`. Le moteur principal charge automatiquement ce registre via `engine/custom-map-registry.js`.

BlueFox reste autonome hors du mode de placement. Un clic au sol lui donne une destination ; un clic sur un objet interactif lui demande d’exécuter l’action CUO par défaut. Les objets collectables alimentent l’inventaire de test et respectent leur délai de réapparition CUO.
