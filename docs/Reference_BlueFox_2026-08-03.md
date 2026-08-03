# BlueFox Odyssey — Mise à jour des documents de référence (03/08/2026)

## CUM (Catalogue Universel des Missions)

Le CUM devient le référentiel fonctionnel unique du moteur de missions.
Le document Word reste la référence narrative. Le CUM devient la référence de développement.

## Architecture retenue

### 1. Missions
Une mission principale = une ligne.

### 2. Objectifs
Toutes les sous-missions, priorisables.

### 3. Narration
Pensées, journal, commentaires, obsessions, réactions.

### 4. Dépendances
Relations Mission→Mission, Projet, Ressource, Recherche, PNJ, Événement.

### 5. Intégration moteur
MissionManager, MissionMemory, ActionBridge, Journal, Variables, Registre de progression, doublons.

### 6. Tableau de bord
Suivi des missions, objectifs, compatibilité, missions dormantes, branches narratives, obsessions et progression.

## Décisions validées

- Deux portées : LOCAL et MONDE.
- Les missions dormantes restent invisibles jusqu'à leur déclenchement.
- Les obsessions possèdent un déclencheur, une intensité, un délai et une narration.
- Les actions importantes peuvent générer une pensée, une entrée de journal ou un commentaire.
- Les missions historiques sont conservées et alimentées par le nouveau système.

## Livrables réalisés

- CUM simplifié
- Extraction du Word
- Référencement des missions
- Version moteur
- Version 6 feuilles
- Assembleur Python
- Assembleur Windows

## Prochaine étape

Construire le CUM de production :
- extraction exhaustive,
- enrichissement moteur,
- détection des doublons,
- préparation de la compilation vers le moteur.
