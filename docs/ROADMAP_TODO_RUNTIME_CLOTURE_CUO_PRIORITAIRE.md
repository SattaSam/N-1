# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **10 août 2026**

Cette page est la **seule TODO active**.

## JALON GELÉ — Bible + Runtime V0.1

Le chantier de preuve de concept **Bible + Runtime** est clôturé.

Quatre missions représentatives ont été intégrées, testées et validées en jeu avec leurs patrons correspondants :

- [x] `BIBLE-V01-CAMP` — collecte → consommation de ressources → effet persistant / établissement du camp.
- [x] `BIBLE-V01-DISCOVERY` — observation → analyse → synchronisation progression / UI.
- [x] `BIBLE-V01-ARCHAEOLOGY` — observation → inspection → analyse avec cible missionnelle cohérente.
- [x] `BIBLE-V01-RECONNAISSANCE` — exploration multi-map → apparition d’une relique → observation → retour au camp.

Ces quatre validations démontrent les briques nécessaires à l’industrialisation du catalogue de missions : déclenchement déclaratif, objectifs compilés depuis des patrons, progression multi-étapes, interaction avec le CUO, effets persistants, génération de contenu de map et retour vers un abri.

**Décision de référence :** le Runtime missionnel V0.1 est gelé comme base fonctionnelle. Les prochains travaux missionnels doivent partir des modules canoniques actuels et ne doivent pas recréer de branche parallèle V12/V15/V19/V20.

Les anciens correctifs V12/V15/V19/V20 sont considérés comme absorbés par la base cumulative actuelle. Une vérification de non-régression peut continuer au fil des développements, mais elle ne constitue plus un chantier autonome.

### Persistance / rechargement

La « matrice de rechargement » évoquée auparavant ne désigne **ni un patron de mission ni le format d’une fiche Bible**. Il s’agissait uniquement d’une grille de tests de persistance : mission active, progression partielle, mission terminée, changement de map, micro-scène persistante, fermeture puis rechargement.

Aucun document supplémentaire n’est requis pour cela. Les contrôles de persistance restent intégrés aux tests de non-régression du moteur et aux validations de MAP_Test.

## P0 — Harmonisation CUO ↔ Bible ↔ moteur

**Prochain chantier principal.**

Objectif : faire du CUO la source d’objets fiable consommable par les missions, les maps, les micro-scènes, l’inventaire et les interactions.

- [ ] Auditer exhaustivement les objets déclarés dans le CUO par rapport à `ObjectLibrary`.
- [ ] Identifier les doublons d’ID, de type, de famille ou de définition fonctionnelle.
- [ ] Comparer toutes les références d’objets de la Bible de missions avec le CUO.
- [ ] Repérer les objectifs de mission qui demandent un objet absent, ambigu ou insuffisamment défini dans le CUO.
- [ ] Distinguer les objets réellement manquants des simples différences de nommage ou d’identifiant.
- [ ] Créer les nouveaux objets nécessaires lorsque les objectifs missionnels ne peuvent pas être couverts par un objet existant.
- [ ] Vérifier pour chaque objet : famille, sous-catégorie, taille, interactions autorisées, collectabilité, analyse/inspection, ressource éventuelle, respawn et liens missionnels.
- [ ] Raccorder chaque objet validé aux constructeurs 3D et à `ObjectSpawner` sans créer de doublon avec les objets existants.
- [ ] Contrôler les micro-scènes qui référencent des objets CUO et corriger les références obsolètes.
- [ ] Contrôler visuellement et fonctionnellement chaque famille dans CUO Lab / MAP_Test.
- [ ] Intégrer les objets manquants par lots contrôlés avant toute nouvelle vague massive de missions.

### Livrable attendu du chantier CUO

- catalogue CUO sans doublons fonctionnels ;
- correspondance explicite **Bible mission → objectif → objet CUO → ObjectLibrary → constructeur 3D / ObjectSpawner** ;
- liste des objets manquants et statut de création ;
- validation visuelle et fonctionnelle des familles d’objets ;
- liste des missions dont tous les objets requis sont désormais exécutables.

## P1 — MAP_Test comme banc officiel du moteur

Le raccord technique au pipeline réel est désormais présent : MAP_Test utilise le générateur de production en mode preview et les mécanismes d’intégrité/prescription de map.

La qualification finale se fait en conditions réelles de jeu :

- [ ] Valider des générations de 1, 2, 3, 4 et 6 plateaux.
- [ ] Vérifier les biomes et leurs textures associées.
- [ ] Vérifier les micro-scènes normales et persistantes.
- [ ] Tester la sauvegarde puis la relecture des maps CUSTOM.
- [ ] Modifier une map CUSTOM, sauvegarder, fermer/recharger et contrôler la restitution.
- [ ] Vérifier qu’une preview MAP_Test ne pollue pas la liste des maps générées du joueur.
- [ ] Contrôler la cohérence entre preview MAP_Test et génération réelle du moteur.
- [ ] Utiliser MAP_Test comme banc visuel du chantier d’harmonisation CUO.

## P2 — Banc de validation CUO / CUO Lab

- [x] Créer un point d’entrée de test séparé du jeu principal.
- [x] Construire une Map de test dédiée au catalogue et au placement d’objets.
- [x] Charger le catalogue pour inspection et placement manuel.
- [x] Ajouter une caméra libre pour le travail de laboratoire.
- [x] Permettre la sélection et le repositionnement d’instances de test.
- [ ] Réparer et fiabiliser le déplacement des objets dans CUO Lab.
- [ ] Ajouter une prévisualisation claire de l’objet sélectionné depuis la liste.
- [ ] Ajouter annulation `Ctrl+Z` et suppression par clic droit.
- [ ] Ajouter sélection multiple, copie/collage et déplacement groupé.
- [ ] Garantir que la liste du Lab est alimentée par le même catalogue CUO / ObjectLibrary que le moteur.
- [ ] Afficher et contrôler hitbox, collisions, rayons d’interaction et points d’approche.
- [ ] Tester chaque objet avant activation dans les biomes du jeu.

Référence détaillée historique : `docs/CUO_BANC_VALIDATION_3D.md`.

## P3 — Non-régression du socle 3D

Ces contrôles accompagnent les chantiers actifs mais ne bloquent plus la clôture du Runtime missionnel.

- [ ] Vérifier l’absence d’erreur JavaScript au chargement après chaque lot CUO.
- [ ] Recharger la page et vérifier les persistances importantes.
- [ ] Vérifier que commandes joueur, caméra et menus restent fonctionnels pendant une action de mission.
- [ ] Contrôler objets, ressources, collisions et interactables.
- [ ] Tester régulièrement des transitions N/S/E/O et la cohérence carte Planète.
- [ ] Vérifier déplacement, zoom et « Centrer sur BlueFox ».
- [ ] Vérifier le cyclorama sur 16:9, tablette et smartphone.
- [ ] Mesurer les blocages près des portails, ressources et arches.

## P4 — Industrialisation des missions — après harmonisation CUO

- [x] Fondation technique des missions hiérarchiques persistantes — M0.
- [x] Raccorder le catalogue de missions au registre central.
- [x] Ajouter cycle de vie, priorité, reprise et progression persistante.
- [x] Valider quatre patrons représentatifs Bible + Runtime.
- [x] Restaurer la Bible documentaire complète à partir du CUM et récupérer les missions manquantes/orphelines.
- [ ] Ne lancer la nouvelle vague d’intégration qu’après audit CUO ↔ Bible.
- [ ] Sélectionner des lots de missions dont tous les objets requis existent et sont validés.
- [ ] Compiler les fiches Bible vers les patrons Runtime sans logique missionnelle codée en dur.
- [ ] Ajouter progressivement les missions composées et sous-missions dynamiques.
- [ ] Étendre ActionBridge uniquement lorsque de nouvelles familles d’actions réelles le nécessitent.

## P5 — Gameplay et narration

- [ ] Définir les conditions futures d’activation de la mission énergie douce.
- [ ] Relier les projets prioritaires aux besoins réels.
- [ ] Alimentation et repos avec effets mesurés.
- [ ] Recherche et connaissances persistantes.
- [ ] Créatures et protocole de contact.
- [ ] Conséquences graduelles des choix du joueur.
- [ ] Enrichir les connaissances seulement après découverte.
- [ ] Produire des synthèses liées aux observations réelles.
- [ ] Développer émotions, événements et souvenirs.
- [x] Implémenter la carte 2D déplaçable dans un faux globe.
- [ ] Valider et ajuster visuellement la carte Planète en conditions réelles.

## Hors priorité immédiate

- Nouvelle vague massive de missions avant harmonisation CUO.
- APK Android à reconstruire depuis une base PC validée, jamais depuis une ancienne APK.
- Refonte lourde du terrain ou shaders complexes.
- Modification de `map-registry.js` pour ajouter des objets.

## Jalon suivant

> **MAP_Test qualifié comme banc officiel du moteur ; CUO audité et harmonisé avec la Bible ; objets manquants identifiés puis créés par lots contrôlés ; chaque objectif de mission important raccordé à un objet moteur réellement disponible.**
