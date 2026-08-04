# Sprint O3 — Profils de ressources pondérés

## Objectif

Remplacer les listes historiques dupliquées (`crystal`, `crystal`, `fiber`) par des familles uniques dotées d'un poids relatif, tout en conservant une vue `resourcePattern` temporaire pour la compatibilité avec le code existant.

## Changements

- huit profils de Map convertis vers des poids explicites ;
- trois à quatre familles exploitables par profil actuel ;
- limite technique stricte de cinq familles ;
- une famille riche par profil avec multiplicateur compris entre 1,20 et 1,75 ;
- choix pondéré indépendant pour chaque objet et membre de cluster ;
- validation des doublons, familles inconnues, ressources non collectables, poids invalides et richesse hors limites ;
- spores conservées exclusivement dans les décorations.

## Compatibilité

`getMapPopulation()` expose encore `resourcePattern`, mais le nouveau générateur utilise prioritairement `resourceWeights`. Aucun changement n'est requis dans les définitions de Map existantes.

## Tests rapides

Dans la console du navigateur :

```js
BlueFox3D.BiomeRules.validateMapProfiles()
```

Résultat attendu :

```js
{ valid: true, errors: [] }
```

Pour inspecter une Map :

```js
BlueFox3D.BiomeRules.getMapPopulation(BlueFox3D.maps.crystal)
```

Vérifier `resourceFamilies`, `resourceWeights` et `richness`.

## Fichiers modifiés

- `engine/biome-rules.js`
- `engine/object-spawner.js`
