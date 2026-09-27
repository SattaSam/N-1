# BlueFox Odyssey — Conventions Maps, images et objets

## Vocabulaire

- Une **Zone** est une Map complète visible par le joueur.
- Une **Map** contient de 1 à 6 **plateaux** carrés.
- Un plateau n’est jamais présenté comme une Zone distincte.

## Nommage des images

### Décors panoramiques

Un nom commençant directement par un nombre désigne un décor :

```text
1Jungle extraterrestre bioluminescente.png
2Jungle envahissant les ruines d’une civilisation.png
10Landes vitrifiées aux herbes rouges et mousses pâles.png
```

### Textures de plateau

Un nom commençant par `0` désigne une texture carrée :

```text
01_1.png
01_2.png
02_1.png
010_1.png
```

Les séparateurs `_` et `-` sont acceptés.

## Association

Le décor `N…` utilise prioritairement les textures `0N_x`.

| Zone | Décor | Textures prioritaires |
| --- | --- | --- |
| 1 | `1…` | `01_1`, `01_2`, `01_3` |
| 2 | `2…` | `02_1`, `02_2` |
| 10 | `10…` | `010_1`, `010_2`, `010_3` |

Cette association est préférentielle. Sans texture correspondante, le
générateur peut sélectionner une texture cataloguée de façon déterministe. Un
fichier `0N_x` ne doit jamais devenir un décor.

## Composition et topologie

- Chaque texture utilisée correspond à un plateau.
- Ajouter un plateau agrandit réellement la surface jouable.
- Les directions sont Nord, Sud, Est et Ouest.
- Les portails restent près du bord extérieur.
- Un portail Nord/Sud est parallèle au bord Est–Ouest.
- Un portail Est/Ouest est parallèle au bord Nord–Sud.
- Une nouvelle Zone conserve un retour vers la précédente.
- Une continuation inconnue reste masquée jusqu’à sa découverte.
- Un corridor praticable doit relier les points d’entrée et de sortie.

## Catalogue d’objets

- `object-library.js` est la source unique de définition des objets.
- `biome-rules.js` décide dans quels biomes et avec quels budgets ils apparaissent.
- `micro-scenes.js` compose les amas et landmarks.
- `object-spawner.js` applique placement, collisions et interactions.
- `map-registry.js` ne contient aucune génération ni définition d’objet.

Pour ajouter un objet :

1. créer sa définition complète dans `object-library.js` ;
2. l’ajouter à `biome-rules.js` seulement s’il doit être généré automatiquement ;
3. l’ajouter à `micro-scenes.js` seulement s’il participe à une composition ;
4. ne modifier `object-spawner.js` que pour une nouvelle mécanique générale ;
5. ne pas modifier `map-registry.js`.

Les densités, budgets, rayons, corridors et collisions sont des paramètres de
gameplay : toute modification doit être intentionnelle et testée.

## Reconstruction du catalogue d’images

1. Placer `Images` à côté de `index.html`.
2. Exécuter `GENERER_CATALOGUE_IMAGES.bat`.
3. Si nécessaire, exécuter `VERIFIER_ET_REPARER_IMAGES.bat`.
4. Lancer le jeu avec `LANCER_BLUEFOX.bat`.
