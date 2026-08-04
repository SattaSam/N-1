# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **1er août 2026**

Cette page est la **seule TODO active**.

## P0 — Valider le point de sauvegarde catalogue

- [ ] Installer les ZIP des Sprints 1, 2, 3 et 4 dans l’ordre.
- [ ] Vérifier l’absence d’erreur JavaScript au chargement.
- [ ] Confirmer que le camp précède toujours le refuge, puis la base, sur chaque Map.
- [ ] Ouvrir Missions et contrôler les quatre statuts et les notes de BlueFox.
- [ ] Vérifier qu’Ingénierie I apparaît au cinquième type de roche/cristal.
- [ ] Tester pause, reprise et suggestion de priorité.
- [ ] Tester sac, stockage partagé, glisser-déposer et dépôt automatique à la base.
- [ ] Recharger la page et vérifier toutes les persistances.

- [ ] Lancer le paquet cumulatif `V0.16.20_M0`.
- [ ] Vérifier l’absence d’erreur de chargement des six modules de mission.
- [ ] Vérifier que la carte « Mission en cours » affiche l’arbre M0.
- [ ] Observer le camp, la reconnaissance, trois relevés distincts, la
  cartographie, puis les collectes du refuge.
- [ ] Contrôler `BlueFox3D.getMissionState()` dans la console.
- [ ] Rafraîchir et confirmer la persistance de la progression.
- [ ] Vérifier que les commandes joueur, la caméra et les menus restent
  fonctionnels pendant une action de mission.

- [ ] Installer `BlueFox_Correctif_Cumulatif_Portails_Carte_Planete.zip`.
- [ ] Installer `index.html` et les cinq modules catalogue corrigés.
- [ ] Lancer le jeu avec `LANCER_BLUEFOX.bat`.
- [ ] Vérifier l’absence d’erreur avant l’affichage de la première Map.
- [ ] Contrôler objets, ressources, collisions et interactables.
- [ ] Enchaîner au moins dix transitions de Zone.
- [ ] Tester des Maps de 1, 2, 4 et 6 plateaux.
- [ ] Vérifier qu’une ancienne Map disparaît totalement.
- [ ] Vérifier l’emplacement et l’orientation N/S/E/O des quatre portails.
- [ ] Vérifier la boussole et la correspondance direction prise/carte Planète.
- [ ] Vérifier déplacement, zoom et « Centrer sur BlueFox ».
- [ ] Vérifier focus par punaise et par vignette de biome découvert.
- [ ] Tester « Suggérer à BlueFox de s’y rendre » sur une Zone adjacente puis distante.
- [ ] Effectuer le point Git seulement après validation.

## P1 — Atteindre 75 % de stabilité du socle 3D

- [ ] Vérifier le cyclorama sur 16:9, tablette et smartphone.
- [ ] Mesurer les blocages près des portails, ressources et arches.
- [ ] Confirmer `Run`, `Run_fast`, `Harvest_Heavy` et `Harvest_Medium`.
- [ ] Vérifier le recul maximal, le recentrage et le suivi libre.
- [ ] Valider l’affichage portrait, notamment 4:5 en 1250 × 1562.

## P2 — Enrichir le catalogue sans toucher à MapRegistry

- [ ] Ajouter progressivement de nouvelles familles dans `object-library.js`.
- [ ] Étendre les profils dans `biome-rules.js`.
- [ ] Ajouter des compositions dans `micro-scenes.js`.
- [ ] Tester chaque ajout sur au moins deux biomes.
- [ ] Maintenir une graine stable par Zone.
- [ ] Garantir les corridors entre portails.

## P3 — Gameplay

- [ ] Construction réelle du premier refuge.
- [x] Fondation technique des missions hiérarchiques persistantes — M0.
- [x] Convertir les quatre missions historiques en définitions M0.
- [x] Raccorder la carte de mission au gestionnaire M0.
- [x] Réactiver plusieurs missions simultanées avec un pilote unique.
- [x] Ajouter le cycle de vie, la priorité et la reprise persistante.
- [x] Raccorder le catalogue de missions au registre central.
- [x] Imposer la chaîne locale `camp → refuge → base` sur chaque Map.
- [x] Ajouter le menu Missions et les introductions de BlueFox.
- [x] Séparer sac personnel et stockage partagé des camps.
- [x] Définir l’exploration comme reconnaissance + trois relevés +
  cartographie.
- [ ] Définir les conditions futures d’activation de la mission énergie douce.
- [ ] Relier les projets prioritaires aux besoins réels.
- [ ] Ajouter les missions composées et sous-missions dynamiques.
- [ ] Ajouter la construction, le transport et la fabrication dans
  `ActionBridge`.
- [ ] Alimentation et repos avec effets mesurés.
- [ ] Recherche et connaissances persistantes.
- [ ] Créatures et protocole de contact.
- [ ] Conséquences graduelles des choix du joueur.

## P4 — Narration et interface

- [ ] Enrichir les connaissances seulement après découverte.
- [ ] Produire des synthèses liées aux observations réelles.
- [ ] Développer émotions, événements et souvenirs.
- [x] Implémenter la carte 2D déplaçable dans un faux globe.
- [ ] Valider et ajuster visuellement la carte Planète en conditions réelles.
- [ ] Tester polices, panneaux et menus scrollables sur petits écrans.
- [ ] Ajouter le nom du décor chargé en mode diagnostic.

## Hors priorité immédiate

- APK Android à reconstruire depuis la V0.16.20 validée, jamais depuis V16.14.
- Refonte lourde du terrain ou shaders complexes.
- Modification de `map-registry.js` pour ajouter des objets.

## Estimations prudentes

- Socle 3D avant validation du raccordement : **environ 72 %**.
- Prochain jalon : **75 %**.
- Jeu complet envisagé : **environ 28 %** avant validation en jeu.
