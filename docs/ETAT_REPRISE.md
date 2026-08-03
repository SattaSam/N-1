# BLUEFOX ODYSSEY — ÉTAT DE REPRISE

Date : 2026-08-03

## Reprendre ici

Deux fils de travail sont ouverts :

1. **Code / passe 2 dynamique** : reprendre depuis le dépôt GitHub actualisé et
   les derniers fichiers cumulatifs validés de la passe 2 ; ne jamais réinjecter
   une version plus ancienne au milieu des correctifs.
2. **CUM documentaire** : reprendre depuis le Word source et le dernier classeur
   simplifié ; vérifier l’exhaustivité avant tout mapping vers le moteur.

## État technique livré
- Sprint 1 : moteur multi-missions, pilote unique et progression passive.
- Sprint 2 : cycle de vie, pause/reprise et priorité expliquée.
- Sprint 3 : catalogue raccordé au registre central et chaîne par Map
  `camp → refuge → base`.
- Sprint 4 : menu Missions, notes de BlueFox, double inventaire et stockage
  partagé des camps.
- Contrôles syntaxiques et tests logiques automatisés : réussis.
- Validation réelle dans le navigateur : à effectuer.
- Générateur semi-aléatoire V1 intégré : Crystal fixe, séquence 2/4/6, puis
  tailles 1–6 pondérées, seed et définitions sauvegardées.
- Budgets : 60–75 objets en 1/1 jusqu’à 132–150 en 6/6 ; 1 à 3 micro-scènes
  principales sur une Map 6/6.
- Textures : priorité aux textures du décor, répétition autorisée, exceptions
  limitées au même biome ou à une compatibilité déclarée.
- Autonomie : aucune première exploration spontanée d’une Map inconnue ; un
  trajet d’exploration demandé ne peut plus être remplacé par une collecte.


## État du CUM

- Nom officiel : **Catalogue Universel des Missions**.
- Source narrative : catalogue Word de 22 pages.
- Contenu source : **35 missions principales**, chacune avec trois sous-missions,
  leurs prérequis, un déclencheur et une récompense.
- Format de pilotage retenu : six feuilles — Missions, Objectifs, Narration,
  Dépendances, Moteur et Tableau de bord.
- Extraction initiale et assembleur : réalisés.
- Audit exhaustif, enrichissement narratif et mapping M0 : à terminer.
- Le CUM ne doit pas encore être présenté comme intégré au moteur.
- Les prototypes documentaires C0/C1/C2 restent exploratoires et non
  autoritaires.

## Première étape obligatoire
1. lancer avec `LANCER_BLUEFOX.bat` ;
2. vérifier la console au chargement ;
3. tester camp, refuge, base et persistance ;
4. tester le menu Missions et les deux inventaires ;
5. tester une ancienne sauvegarde ;
6. relever les anomalies visuelles sans corriger avant audit.

## Prochaine étape

### Technique

Poursuivre la passe 2 des comportements dynamiques depuis le dépôt actualisé,
puis valider le banc CUO et les objets encore en attente.

### Documentaire

Finaliser le CUM simplifié :

1. contrôler les 35 missions et 105 sous-missions ;
2. conserver tous les prérequis et récompenses sans résumé destructeur ;
3. classer les missions par projet, catégorie, portée et phase ;
4. auditer les doublons avec M0 ;
5. mapper uniquement les événements et variables réellement disponibles ;
6. lister les adaptations de code séparément.


## État de session

- Sprints Missions 1 à 4 : livrés, validation en jeu requise ;
- générateur V1 : intégré, validation prolongée requise ;
- CUO et comportements dynamiques : passe 2 en cours ;
- CUM : fondation documentaire réalisée, consolidation requise ;
- aucune intégration automatique du CUM dans le moteur à ce stade ;
- documents de référence : actualisés au 3 août 2026 ;
- session close.
