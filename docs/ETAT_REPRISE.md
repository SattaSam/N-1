# BLUEFOX ODYSSEY — ÉTAT DE REPRISE

Date : 2026-08-02

## Reprendre ici
Reprendre depuis les derniers fichiers cumulatifs locaux. Ne pas réimporter les
fichiers GitHub tant que ces correctifs n’y ont pas été intégrés.

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

## Première étape obligatoire
1. lancer avec `LANCER_BLUEFOX.bat` ;
2. vérifier la console au chargement ;
3. tester camp, refuge, base et persistance ;
4. tester le menu Missions et les deux inventaires ;
5. tester une ancienne sauvegarde ;
6. relever les anomalies visuelles sans corriger avant audit.

## Prochaine étape

Construire le banc 3D décrit dans `docs/CUO_BANC_VALIDATION_3D.md`, puis lancer
l’intégration contrôlée des 22 objets documentaires restants du CUO.

## État de session
- Sprints 1 à 4 : livrés, validation en jeu requise ;
- documents de référence : mis à jour ;
- générateur V1 et règles de cohérence : intégrés, validation prolongée requise ;
- prochain chantier validé : banc 3D puis CUO ;
- session documentaire du 2 août 2026 : close.
