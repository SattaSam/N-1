# BlueFox Odyssey — État de reprise

Date : **30 juillet 2026**

Base : **V0.16.20 + correctifs cumulatifs + Sprint M0 Fondation IA**

## Point exact

Le Sprint M0 ajoute une première fondation de missions persistantes avec les
modules suivants :

- `engine/mission-types.js` ;
- `engine/mission-tree.js` ;
- `engine/mission-memory.js` ;
- `engine/mission-planner.js` ;
- `engine/mission-manager.js` ;
- `engine/action-bridge.js`.

Le raccordement est limité à `index.html` et `engine/world-engine.js`.
`engine/character-controller.js` et `engine/path-planner.js` sont restés
strictement inchangés.

La carte de mission est maintenant alimentée par M0 grâce à
`engine/mission-ui-bridge.js`. Les anciennes définitions refuge, énergie, flore
et contact ont été converties en arbres M0. Le refuge commence par le camp,
puis une analyse de Zone composée d’une reconnaissance, de trois relevés
différents et d’une cartographie des ressources.

L’énergie douce n’est pas lancée automatiquement après le refuge. Elle reste
une mission disponible pour une activation future.

La tentative d’enregistrement du Service Worker inexistant `/sw.js` a été
retirée de `game.js`.

Les tests de syntaxe, de progression de l’arbre, de prérequis, de sérialisation
et de reconstruction du ZIP sont réussis. Le comportement doit maintenant être
validé dans le navigateur.

Le paquet cumulatif de reprise est :

`BlueFox_Odyssey_V0.16.20_M0_CUMULATIF.zip`

### Test express M0

1. Lancer `LANCER_BLUEFOX.bat`.
2. Attendre que BlueFox commence seul à explorer ou collecter.
3. Vérifier qu’il explore un plateau, collecte des cristaux et des fibres, puis
   effectue une recherche.
4. Ouvrir la console avec `F12` et exécuter
   `BlueFox3D.getMissionState()`.
5. Rafraîchir la page et vérifier que les valeurs `progress` ne reviennent pas
   à zéro.
6. Continuer à utiliser la caméra et les menus pendant les actions pour
   détecter toute régression du moteur historique.

La génération des objets a été extraite de `engine/map-registry.js` et répartie
entre :

- `engine/object-library.js` ;
- `engine/biome-rules.js` ;
- `engine/micro-scenes.js` ;
- `engine/object-spawner.js`.

`index.html` a été corrigé pour charger ces modules avant
`engine/map-registry.js`.

La syntaxe, le catalogue et l’ordre des dépendances ont été vérifiés. Le jeu
complet doit encore être lancé et testé avant de qualifier ce point de stable.

Le paquet cumulatif de clôture est :

`BlueFox_Correctif_Cumulatif_Portails_Carte_Planete.zip`

Il réunit les versions cohérentes de :

- `engine/map-registry.js` ;
- `engine/world-engine.js` ;
- `engine/ui-enhancements.js` ;
- `engine/ui-enhancements.css`.

Il conserve les correctifs de positionnement et d’étiquettes des portails, la
boussole, les noms uniques, les vignettes cardinales et la nouvelle carte
Planète. La carte permet déplacement, zoom, recentrage sur BlueFox, focus sur
les Zones découvertes et suggestion d’un itinéraire par les passages connus.

### Incident de session

Un sprint avait été livré sans `map-registry.js`, resté dans un ZIP de hotfix
séparé. Cette fragmentation pouvait faire disparaître la correction des
portails lors d’un remplacement de fichiers. Le paquet cumulatif ci-dessus
devient l’unique base locale de reprise avant le prochain point Git.

## Reprendre ici

1. Décompresser le paquet cumulatif M0 dans un nouveau dossier.
2. Lancer uniquement `LANCER_BLUEFOX.bat`.
3. Vérifier que le jeu atteint la première Map sans erreur.
4. Exécuter le test express M0 ci-dessus.
5. Contrôler ensuite les sections catalogue, portails et carte Planète de
   `PLAN_TESTS_V0.16.20.md`.
6. Si tous les tests passent, effectuer le point Git et considérer ce jeu
   documentaire comme la référence stable.
7. Si un test échoue, conserver la première erreur de console et corriger le
   module responsable sans réintroduire la génération dans `map-registry.js`.

## Fichier protégé

`engine/map-registry.js` ne doit plus être le premier fichier modifié pour un
problème d’objet. Consulter la matrice de responsabilités dans
`ARCHITECTURE_TECHNIQUE.md`.

Ne jamais repartir de la copie GitHub actuelle pour le prochain hotfix tant que
le paquet cumulatif de cette session n’a pas été intégré et sauvegardé sur Git.
