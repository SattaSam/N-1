# BLUEFOX ODYSSEY — ÉTAT DE REPRISE

Date : 2026-07-31

## Reprendre ici
Le dernier patch d’interactions pour `engine/world-engine.js` est à écarter.

## Cause de reprise
Le patch n’a pas supprimé les dépendances codées en dur aux objets de type `Crystal` / `crystal`.
Il ne correspond donc pas à l’objectif validé de moteur d’interactions piloté par métadonnées.

## Première étape obligatoire
Avant toute nouvelle correction :
1. récupérer la version GitHub actuelle de `engine/world-engine.js` ;
2. auditer tout le fichier ;
3. rechercher toutes les références codées en dur aux types d’objets ;
4. auditer les fichiers de définitions d’objets ;
5. auditer le contrôleur d’animations ;
6. auditer le gestionnaire de missions et de progression ;
7. reproduire le comportement actuel ;
8. seulement ensuite proposer puis appliquer le correctif.

## Objectif du prochain livrable
- un `world-engine.js` complet ;
- interactions génériques basées sur métadonnées ;
- aucune logique spécifique obligatoire à `crystal` ou `fiber` dans le routage principal ;
- animation compatible ou fallback sûr ;
- événements de missions cohérents ;
- objets retirés uniquement lorsqu’ils sont collectables ;
- tests ciblés documentés.

## État de session
- patch `world-engine.js` : NON VALIDÉ ;
- documents de référence : mis à jour ;
- session close après livraison de ces documents.
