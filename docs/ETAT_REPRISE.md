# BlueFox Odyssey — État de reprise

Date : **28 juillet 2026**  
Base : **V0.16.20 + refonte du catalogue d’objets**

## Point exact

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

## Reprendre ici

1. Installer le paquet corrigé à la racine du projet.
2. Lancer uniquement `LANCER_BLUEFOX.bat`.
3. Vérifier que le jeu atteint la première Map sans erreur.
4. Exécuter la section « Refonte catalogue » de `PLAN_TESTS_V0.16.20.md`.
5. Si les tests passent, effectuer le point Git et considérer ce jeu
   documentaire comme la référence stable.
6. Si un test échoue, conserver la première erreur de console et corriger le
   module responsable sans réintroduire la génération dans `map-registry.js`.

## Fichier protégé

`engine/map-registry.js` ne doit plus être le premier fichier modifié pour un
problème d’objet. Consulter la matrice de responsabilités dans
`ARCHITECTURE_TECHNIQUE.md`.
