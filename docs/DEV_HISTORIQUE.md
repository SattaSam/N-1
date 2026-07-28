# BlueFox Odyssey — Historique de développement

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
