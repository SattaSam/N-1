# BlueFox Odyssey — Recovery checkpoint — 1 septembre 2026

Base technique de référence avant clôture :
`e12558f40f38129e4d3b4a3e6d85f54b3a2cac6f`

Commit :
`pass CPU 2 (musique)`

## Statut général
- chantier trigger/cible missionnelle : **FAIL moteur**
- correctifs moteur/runtime de la session : **REJETÉS**
- seule sortie retenue pour commit : **IMI — CONTRAT IA D'INTÉGRATION DES MISSIONS**
- prochaine reprise : repartir du HEAD GitHub propre après le commit IMI
- aucun ZIP moteur de cette session ne doit servir de base

## Bug ouvert — SUR-03
Mission : `SUR-03 — Composer une ration stable`

Objectif :
`Analyser 2 plantes différentes`

Paramètres :
- action `analyze`
- target `2`
- subject `flora`
- distinctBy `objectId`

## Cause prouvée dans la sauvegarde
Ancien binding implicite :
- binding `definition`
- instanceId du premier buisson déclencheur
- objectId `doc-bio-bush-m-001`
- cuoType `bush`
- mapId `generated-a2996d72-0005`

## Preuve runtime utilisateur
Avec ce binding :
- SUR-03 est active ;
- MissionManager propose `SUR-03:studyPlants` ;
- action proposée : `analyze` ;
- `ActionBridge.execute()` retourne `false` ;
- `targetInteraction()` n'est pas appelé ;
- aucune cible n'est sélectionnée.

En neutralisant temporairement ce binding :
- ObjectM0 sélectionne immédiatement `DOC-NAT-TREE-L-002` / `crystalline_tree`.

La causalité « binding implicite → sélection impossible » est donc démontrée.

## Décision d'architecture conservée
L'intégration documentaire doit distinguer explicitement :
1. `REVEAL-ONLY`
2. `SAME-DEFINITION`
3. `SAME-INSTANCE`

Cette règle appartient à l'IMI.

## Non validé
- aucune migration automatique de sauvegarde produite pendant la session ;
- aucun ajout runtime autour de `bibleTarget`;
- aucun réarmement planner/BAC ;
- aucun timer de reprise supplémentaire ;
- aucune modification ObjectM0/ActionBridge.

## Reprise obligatoire
1. partir du HEAD propre ;
2. relire `00_AI_PROJECT_RULES.md`, `docs/README.txt` et les références officielles ;
3. auditer l'ordre réel d'hydratation Runtime/MissionManager/map ;
4. reproduire le vieux binding SUR-03 ;
5. tester les consommateurs jusqu'à l'interaction réelle ;
6. préserver les bindings explicites légitimes ;
7. comparer au HEAD et rejeter toute modification hors périmètre ;
8. faire valider en jeu avant commit.

## Règle de confiance
Une batterie de tests isolés peut réfuter une implémentation, mais elle ne suffit pas à déclarer un PASS gameplay.
La validation runtime en jeu reste prioritaire.
