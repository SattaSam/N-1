# Conventions Maps, Zones et images

## Convention de nommage

### Décors panoramiques

Une image dont le nom commence directement par un nombre est un décor :

```text
1Jungle extraterrestre bioluminescente.png
2Jungle envahissant les ruines d’une civilisation.png
10Landes vitrifiées aux herbes rouges et mousses pâles.png
```

### Textures de plateau

Une image commençant par `0` est une texture carrée de plateau :

```text
01_1.png
01_2.png
02_1.png
010_1.png
```

Les séparateurs `_` et `-` sont acceptés.

## Association

Le décor `N…` utilise prioritairement les textures `0N_x`.

Exemples :

| Zone | Décor | Textures prioritaires |
| --- | --- | --- |
| 1 | `1…` | `01_1`, `01_2`, `01_3` |
| 2 | `2…` | `02_1`, `02_2` |
| 10 | `10…` | `010_1`, `010_2`, `010_3` |

Cette association est préférentielle, pas obligatoire. En l’absence de texture
correspondante, le générateur peut sélectionner une autre texture cataloguée
de manière déterministe. Un fichier `0N_x` ne doit jamais devenir un décor.

## Composition d’une Zone

- Une Zone est une Map complète.
- Elle contient de 1 à 6 plateaux 1/1.
- Chaque image de texture utilisée correspond à un plateau.
- Ajouter un plateau agrandit réellement la surface jouable.
- Les plateaux internes ne sont pas annoncés comme des Zones séparées.

## Topologie

- Les directions possibles sont Nord, Sud, Est et Ouest.
- Les portails sont presque au bord extérieur de la Map.
- Un portail Nord/Sud est parallèle au bord Est–Ouest.
- Un portail Est/Ouest est parallèle au bord Nord–Sud.
- Une nouvelle Zone possède une liaison retour vers la précédente.
- Elle conserve également une continuation vers une future Zone inconnue.
- Cette future Zone reste masquée tant qu’elle n’a pas été explorée.

## Reconstruction du catalogue

1. Placer `Images` à côté de `index.html`.
2. Exécuter `GENERER_CATALOGUE_IMAGES.bat`.
3. Si nécessaire, exécuter `VERIFIER_ET_REPARER_IMAGES.bat`.
4. Lancer le jeu par `LANCER_BLUEFOX.bat`.

