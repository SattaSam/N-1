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
