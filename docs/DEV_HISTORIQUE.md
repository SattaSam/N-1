# BlueFox Odyssey — Historique de développement

## 29 juillet 2026 — Portails et carte Planète cumulative

### Fonctionnalités

- correction du placement cardinal des vignettes voisines ;
- correction de la lecture de la boussole ;
- étiquettes de portails adaptées à l’état exploré ;
- noms persistants et uniques en cas de graines identiques ;
- carte 2D déplaçable et zoomable dans un faux globe ;
- Zones colorées par biome et dimensionnées selon leurs plateaux ;
- punaises, focus, recentrage sur BlueFox et suggestions de destination ;
- itinéraires vers les Zones distantes par les portails déjà découverts.

### Incident de cumul

Les hotfixes successifs avaient été répartis entre plusieurs ZIP. Le sprint
carte Planète contenait un `world-engine.js` cumulatif mais pas le
`map-registry.js` du hotfix portails. Repartir d’une version GitHub plus ancienne
ou remplacer un dossier à partir d’un ZIP partiel pouvait donc réintroduire un
comportement déjà corrigé.

### Correction et règle permanente

Le paquet `BlueFox_Correctif_Cumulatif_Portails_Carte_Planete.zip` rassemble les
quatre fichiers réellement concernés. Les contrôles de syntaxe, dépendances,
positions cardinales, rotations des portails et présence des hotfixes antérieurs
ont réussi. Le test visuel en jeu reste obligatoire.

Désormais, tout sprint part du dernier état cumulatif. GitHub ne redevient la
base qu’après intégration explicite et point de sauvegarde.

## 28 juillet 2026 — Consolidation du terrain

### Analyse

Les responsabilités du terrain ont été confirmées :

- `map-registry.js` : chargement des textures, implantation des plateaux,
  limites de Map, sorties et destruction de la Map ;
- `world-engine.js` : scène, transitions, panorama et autonomie ;
- `bluefox3d-core.js` : utilitaires et nettoyage partagé.

### Décisions conservées

- amélioration du terrain sans refonte lourde ;
- textures nettes, transitions discrètes et UV maîtrisés ;
- retrait complet de l’ancienne Map ;
- petits livrables testables ;
- aucune modification de gameplay cachée dans un correctif visuel.

Un ancien ZIP terrain annoncé pendant cette phase n’était pas un livrable
validé. Cette consigne de prudence reste applicable.

## 28 juillet 2026 — Refonte du raccordement catalogue

### Objectif

Retirer de `map-registry.js` toute génération d’objets et rendre le catalogue
extensible sans modifier le registre des Maps.

### Architecture adoptée

- `object-library.js` devient le Catalogue Universel des Objets.
- `biome-rules.js` porte profils, budgets, ressources et décorations.
- `micro-scenes.js` porte amas procéduraux et landmarks.
- `object-spawner.js` génère, place et raccorde collisions, interactables et animations.
- `map-registry.js` fournit uniquement le contexte de Map.

Les densités, budgets, placements et collisions historiques ont été conservés
dans la refonte.

### Incident et cause

La première archive refondue cassait le lancement : `index.html` chargeait
`object-library.js` puis directement `map-registry.js`. Les modules
`biome-rules.js`, `micro-scenes.js` et `object-spawner.js` n’étaient jamais
chargés.

### Correction

L’ordre de chargement a été corrigé :

```text
object-library.js
→ biome-rules.js
→ micro-scenes.js
→ object-spawner.js
→ map-registry.js
```

La syntaxe des scripts, la validité des définitions, les profils de biome,
les modèles de micro-scènes et l’ordre du chargeur ont été vérifiés.

### Statut de clôture

- documentation consolidée ;
- `map-registry.js` déclaré fichier architectural protégé ;
- ancienne consigne « reprendre par map-registry.js » annulée ;
- lancement complet et plan de tests encore requis avant validation du point Git.
# 2026-07-30 — Sprint M0 Fondation IA

- Ajout du vocabulaire de missions, de l’arbre hiérarchique, de la mémoire
  persistante, du planificateur, du pont d’actions et du gestionnaire.
- Raccordement minimal dans `index.html` et `world-engine.js`.
- Validation sur achèvement réel des collectes, explorations et routines.
- Conservation intégrale de `character-controller.js` et `path-planner.js`.
- Exposition de `BlueFox3D.getMissionState()` pour le test et le diagnostic.
- Raccordement de `.mission-card` à M0 par un pont d’interface indépendant.
- Conversion des quatre missions historiques en définitions d’arbres M0.
- Ajout du camp comme prérequis du refuge.
- Remplacement de l’exploration instantanée par reconnaissance, trois relevés
  distincts et cartographie des ressources.
- Suppression de l’enregistrement obsolète de `/sw.js`, responsable du 404.
- Les missions énergie, flore et contact restent disponibles mais ne sont pas
  déclenchées automatiquement après le refuge.
