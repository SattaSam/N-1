# BLUEFOX ODYSSEY — DEV HISTORIQUE

## Session du 2026-07-31

### Objectif
Remplacer le système d’interactions codé en dur dans `engine/world-engine.js` par une logique générique pilotée par les métadonnées des objets.

### Architecture visée
- profil d’interaction dérivé des métadonnées ;
- actions supportées : collecter, inspecter, observer, analyser, extraire ;
- message générique ;
- événement de mission correspondant à l’action ;
- retrait de l’objet uniquement s’il est collectable ;
- conservation des objets inspectables ou observables ;
- autonomie fondée sur l’éligibilité générique à l’interaction.

### Incident
Le patch livré n’est pas fonctionnel.
Des références à `Crystal` / `crystal` sont toujours présentes dans `world-engine.js`.
Le patch doit être considéré comme abandonné et ne doit pas être intégré comme base fiable.

### Décision
La prochaine reprise doit recommencer depuis la version GitHub courante et suivre le protocole complet :
diagnostic, audit du fichier, audit des dépendances, reproduction, tests, correction, puis non-régression.

### Clôture
Aucun correctif `world-engine.js` n’est validé pendant cette session.
Les documents de référence sont mis à jour pour refléter cet état.
# Session du 1er août 2026 — Sprints Missions 1 à 4

- Réactivation du moteur multi-missions avec mission principale unique.
- Progression passive des missions secondaires et suppression du clignotement UI.
- Cycle de vie persistant : disponible, active, pause, terminée et échouée.
- Priorisation automatique expliquée et changement différé après l’action en cours.
- Catalogue déclaratif raccordé au registre central, recalcul historique idempotent.
- Chaîne locale obligatoire et instanciée par Map : `camp → refuge → base`.
- Ingénierie I déverrouillée après cinq roches ou cristaux distincts.
- Menu Missions complet avec notes personnelles de BlueFox.
- Inventaire séparé entre sac et stockage partagé des camps.
- Glisser-déposer manuel et dépôt automatique au camp de base principal.
- `map-registry.js`, `CharacterController` et `PathPlanner` inchangés.
- Tests syntaxiques et logiques réussis ; validation navigateur encore requise.

# Session du 2 août 2026 — Générateur V1 et préparation CUO

- Formalisation des pondérations de biomes, tailles, richesses, ressources et
  micro-scènes dans `map-generation-rules.js`.
- Ajout de `map-generator.js` : seed par partie, génération incrémentielle et
  sauvegarde des définitions complètes.
- Crystal confirmée comme Map narrative fixe 1/1, hors tirage.
- Progression des premières découvertes fixée à 2, 4 et 6 plateaux.
- Compatibilité protégée avec l’ancienne UI React et les sauvegardes V1/V2.
- Budgets recalibrés de 60–75 à 132–150 objets selon la taille de Map.
- Maps 6/6 dotées de 1 à 3 micro-scènes principales.
- Suppression de l’exploration locale purement aléatoire ; exploration d’un
  plateau réservée à une mission ou une demande joueur.
- Protection des trajets vers les passages contre les collectes de reprise.
- Nom d’une terre inconnue masqué jusqu’à la découverte officielle.
- Sélection des textures corrigée : priorité aux textures associées, répétition
  permise, replis uniquement dans un biome identique ou compatible.
- Décision suivante : construire un banc 3D séparé pour valider visuellement le
  CUO avant son activation progressive dans les biomes.


# Session du 7–8 août 2026 — BibleRuntime V0, missions multi-actives et topologie Planète

## BibleRuntime / architecture narrative

- Audit du moteur avant intégration afin d'éviter un compilateur/interpréteur
  parallèle trop complexe.
- Validation du principe :
  `Bible → Patron → Fiche → BibleRuntime → MissionManager/ObjectEvents/BAC`.
- La Bible reste un document narratif humain.
- Le traitement se fait par lots, patron par patron.
- Trois patrons V1 retenus :
  - Découvrir / Comprendre ;
  - Accumuler / Atteindre un seuil ;
  - Préparer → Produire / Débloquer.
- Fiche V1 volontairement courte :
  mission, patron, axe BAC, déclenchement, objectif, résolution, résultat,
  narration, suite.
- Trois missions techniques V0 installées :
  - `BIBLE-V0-CAMP` ;
  - `BIBLE-V0-DISCOVERY` ;
  - `BIBLE-V0-ARCHAEOLOGY`.

## Tests missions

- `DISCOVERY` :
  - observation validée ;
  - analyse validée lorsqu'un vrai événement `OBJECT_ANALYZED` est produit.
- Confirmation de la distinction moteur entre :
  - `OBJECT_INSPECTED` ;
  - `OBJECT_ANALYZED` ;
  - `RESOURCE_COLLECTED`.
- Confirmation que les missions secondaires doivent progresser passivement
  indépendamment de la priorité.
- Fan-out ObjectEvents corrigé pour les missions multiples.
- Persistance F5 validée : une mission conserve son état terminé et ses compteurs
  après rechargement.
- Suppression du comportement historique de purge Mission V0 au chargement.

## BAC / missions secondaires

- Raccord des missions secondaires au cycle autonome.
- Mission principale : poids de référence `100`.
- Missions secondaires : budget global `20`.
- Les secondaires se partagent ce budget : leur quantité ne multiplie pas leur
  influence totale.
- Une action secondaire conserve son `missionId`.
- La complétion est appliquée à l'arbre de la mission réellement exécutée.
- Test concluant : BlueFox peut exécuter une action secondaire puis revenir à la
  mission prioritaire.

## Correctifs de robustesse

Plusieurs gels ont été reproduits et isolés.

1. Interaction refusée mais déclarée comme démarrée :
   - propagation du `false` jusqu'au MissionManager ;
   - prévention des `currentAction` fantômes.

2. Cible de déplacement résiduelle après refus :
   - reset du target sur la position de BlueFox ;
   - nettoyage de l'état d'approche.

3. `currentAction` orpheline :
   - ajout d'un watchdog ;
   - si le moteur réel est idle plusieurs secondes, annulation et replanning.

Limite restante observée :
- blocage au pied d'un arbre-cactus lors d'une observation ;
- probablement hitbox / approche ;
- reporté volontairement hors du chantier missions.

## Nouvelle orientation BUILD / production

Décision fonctionnelle :

Une mission de construction ne nécessite pas forcément une action BUILD physique.
Lorsque les conditions sont remplies, le résultat peut être appliqué
automatiquement.

Sorties V1 :

- `WORLD` : objet / micro-scène apparaît dans le monde ;
- `INVENTORY` : objet fabriqué apparaît dans le sac ;
- `KNOWLEDGE` : blueprint / recherche est débloqué.

Premier cas à valider : `BIBLE-V0-CAMP`.
Réutilisations prévues : drones, balises d'analyse, outils, blueprints.

## Topologie et menu Planète

- Mise en place d'une topologie spatiale coordonnée.
- Une coordonnée déjà occupée doit reconnecter une Map existante au lieu d'en
  générer une nouvelle.
- Projection organique de la topologie sur le menu Planète.
- Ajout d'une texture planétaire neutre.
- Le dernier design visuel du menu Planète est encore en validation dans le
  chantier dédié ; ne pas le marquer comme définitivement terminé avant clôture
  de cette validation.

## Clôture de session

Le jalon technique permet désormais d'envisager l'intégration de la Bible par lots
plutôt que mission par mission.

Prochaine priorité :
- système de résolution / sorties `WORLD`, `INVENTORY`, `KNOWLEDGE` ;
- validation de `BIBLE-V0-CAMP` ;
- puis première vraie passe de conversion de la Bible par patron.
