# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **30 juillet 2026**

Cette page est la **seule TODO active**.

## P0 — Valider le point de sauvegarde catalogue

- [ ] Lancer le paquet cumulatif `V0.16.20_M0`.
- [ ] Vérifier l’absence d’erreur de chargement des six modules de mission.
- [ ] Observer l’exploration, deux collectes de cristaux, deux collectes de
  fibres et la recherche finale.
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
- Jeu complet envisagé : **environ 22 %**.
