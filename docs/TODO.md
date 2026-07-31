# BLUEFOX ODYSSEY — TODO

Dernière mise à jour : 2026-07-31

## Priorité immédiate — Interactions objets / `world-engine.js`
- repartir de la version GitHub actuelle ;
- auditer entièrement `engine/world-engine.js` ;
- localiser toutes les occurrences de `Crystal`, `crystal`, `Fiber`, `fiber` et autres branches d’interaction codées en dur ;
- auditer les définitions d’objets et métadonnées associées ;
- auditer le contrôleur d’animations pour vérifier les actions disponibles ;
- auditer le gestionnaire de missions et les événements de progression ;
- reproduire le comportement actuel avant correction ;
- remplacer le routage codé en dur par une résolution pilotée par métadonnées ;
- conserver les objets inspectables et ne retirer que les objets collectables ;
- tester collecter, inspecter, observer, analyser et extraire ;
- relancer les tests de non-régression sur autonomie, inventaire, missions et journal.

## Terrain
- conserver les acquis de la base stable actuelle ;
- vérifier le retrait complet de l’ancienne map ;
- tester les configurations 1, 2, 4 et 6 zones ;
- vérifier les textures manquantes et les changements répétés de map.

## Missions
- poursuivre l’intégration du registre central de progression ;
- raccorder les missions historiques comme définitions réelles du nouveau moteur ;
- conserver les missions de développement existantes tant que leur migration n’est pas validée ;
- distinguer compteurs historiques, inventaire courant, ressources consommées, découvertes uniques et paliers.

## Méthode de livraison
- un seul gros fichier modifié à la fois ;
- fichier complet uniquement ;
- ZIP contenant uniquement les fichiers réellement modifiés ;
- aucun patch annoncé comme fonctionnel sans test ;
- documenter les tests effectués et les limites restantes.
