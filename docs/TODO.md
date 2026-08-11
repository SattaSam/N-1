# BLUEFOX ODYSSEY — TODO

Dernière mise à jour : 2026-08-09

## P0 — Clôturer le jalon Missions / BibleRuntime

- [x] Valider en jeu le cumulatif V17 construit sur le commit GitHub `5e381d3`.
- [x] Valider la collecte canonique de bois : buisson `+2`, bois tombé `+1`,
  progression immédiate et récoltes répétées après réapparition.
- [x] Valider `BIBLE-V01-CAMP` : seuil réel de `10`, consommation unique,
  établissement persistant et rendu du camp près de la capsule.
- [x] Valider `BIBLE-V01-ARCHAEOLOGY` : instance exacte, séquence
  Observer → Inspecter → Analyser et retour près d'un camp réel.
- [x] Valider après F5 l'hydratation des missions terminées et la restauration
  visuelle du camp.
- [x] Passer la suite automatisée du cumulatif V17 : `27/27` tests.

- [x] Revalider le correctif cumulatif Missions V1 sur une copie propre du dépôt.
- [ ] Vérifier sur une session longue :
  - mission principale dominante ;
  - missions secondaires actives ;
  - progression passive multi-missions ;
  - actions secondaires occasionnelles ;
  - priorité inchangée lorsqu'une secondaire agit ;
  - persistance complète après F5.
- [ ] Conserver le watchdog `currentAction` orpheline.
- [ ] Conserver la propagation `targetInteraction() -> false` jusqu'au MissionManager.
- [ ] Conserver le reset des cibles résiduelles après interaction refusée.
- [ ] Traiter séparément le bug arbre-cactus / hitbox ; ne pas le mélanger au moteur de missions.

## P0 — Résolution des missions de production

- [x] Ajouter au modèle Patron / Fiche les effets nécessaires au Camp :
  consommation transactionnelle d'inventaire et établissement d'un site monde.
- [ ] Valider séparément les sorties génériques encore non prouvées en jeu :
  ajout d'objet fabriqué à l'inventaire et déblocage de connaissance.
- [x] Faire de `BIBLE-V01-CAMP` le premier test :
  - conditions remplies ;
  - apparition automatique du camp dans la zone prévue ;
  - mission terminée sans action BUILD artificielle supplémentaire.
- [ ] Réutiliser ensuite cette mécanique pour :
  - drones ;
  - balises d'analyse ;
  - outils fabriqués ;
  - blueprints / recherches.

## P1 — Industrialiser l'intégration de la Bible

- [ ] Créer une quatrième mission uniquement depuis une fiche déclarative.
- [ ] Vérifier qu'elle traverse sans code spécifique la chaîne
  Fiche → Catalogue → BibleRuntime → MissionManager → événements → UI.
- [ ] Valider son cycle complet, sa sauvegarde/recharge et la non-régression des
  trois missions déjà terminées.

- [ ] Figer les 3 patrons V1 en tant que référence :
  1. Découvrir / Comprendre ;
  2. Accumuler / Atteindre un seuil ;
  3. Préparer → Produire / Débloquer.
- [ ] Figer le format minimal d'une fiche de mission.
- [ ] Traiter la Bible **patron par patron**.
- [ ] Pour chaque patron :
  1. détecter toutes les missions compatibles ;
  2. produire les fiches par lot ;
  3. compiler les données injectables ;
  4. auditer la passe ;
  5. valider ;
  6. seulement ensuite passer au patron suivant.
- [ ] Mesurer la couverture obtenue et isoler les cas hors patron.

## P1 — BAC / autonomie

- [ ] Conserver les axes V1 :
  - Survie ;
  - Exploration ;
  - Collecte / Logistique ;
  - Recherche / Connaissance ;
  - Construction / Technologie.
- [ ] Revalider le ratio `principale 100 / secondaires total 20`.
- [ ] Ne modifier ce ratio qu'après une session longue stable.
- [ ] Vérifier qu'une action réelle peut créditer toutes les missions compatibles.

## P1 — Menu Planète / topologie

- [ ] Terminer la validation du dernier design du menu Planète.
- [ ] Conserver la texture planétaire neutre.
- [ ] Conserver la topologie coordonnée et la reconnexion aux Maps existantes.
- [ ] Vérifier cohérence N/S/E/O entre moteur 3D, portails et carte Planète.
- [ ] Une fois validé, produire un correctif cumulatif propre et l'intégrer au dépôt.

## P1 — Documentation / dépôt

- [ ] Maintenir à jour :
  - `MASTER.md` ;
  - `ARCHITECTURE_TECHNIQUE.md` ;
  - `TODO.md` ;
  - `DEV_HISTORIQUE.md`.
- [ ] Après validation d'un jalon : produire un correctif cumulatif depuis la base GitHub, tester, puis pousser.
- [ ] Éviter les modules de diagnostic ou monkey-patches temporaires dans les jalons stables.

## P2 — Reste du moteur / finition

- [ ] Reprendre les patrons suivants nécessaires à la Bible :
  - voyage / exploration ;
  - rencontre / PNJ ;
  - chaînes narratives ;
  - autres exceptions identifiées par audit.
- [ ] Continuer la validation CUO et les hitbox problématiques.
- [ ] Équilibrage, non-régression, performance, mobile et finition.

---

## Archive — TODO au 2026-07-31

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
