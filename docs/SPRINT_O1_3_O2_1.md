# Sprint O1.3 – O2.1 : raccordement objets ↔ M0

## Fichiers

- `engine/object-library.js` : rend la stèle et le bassin réellement inspectables.
- `engine/object-event-registry.js` : registre d'événements du lot précédent, inclus pour installation complète.
- `engine/object-m0-bridge.js` : raccordement non destructif au moteur monde et à M0.

## Ordre de chargement dans index.html

```html
<script src="./engine/object-library.js"></script>
<script src="./engine/object-event-registry.js"></script>
<!-- modules mission-types, mission-tree, mission-memory, mission-planner,
     action-bridge et mission-manager -->
<script src="./engine/world-engine.js"></script>
<script src="./engine/object-m0-bridge.js"></script>
<script src="./game.js"></script>
```

`object-m0-bridge.js` doit être chargé après `world-engine.js` et `mission-manager.js`, mais avant l'initialisation du jeu dans `game.js`.

## Fonctions livrées

- collecte de cristal/fibre convertie en `RESOURCE_COLLECTED` ;
- inspection physique de la stèle ;
- observation physique du bassin lumineux ;
- une interaction alimente toutes les feuilles M0 compatibles ;
- protection contre le double comptage de l'action M0 active ;
- conservation du cooldown uniquement pour les ressources collectées ;
- stèles et bassins restent visibles après inspection ;
- API diagnostic : `BlueFox3D.getObjectM0BridgeState()`.

## Tests rapides

1. Ouvrir la console et vérifier :
   `BlueFox3D.getObjectM0BridgeState()`
   doit retourner `{ mission: true, action: true, world: true }`.
2. Cliquer une stèle : BlueFox doit s'approcher, inspecter et la laisser visible.
3. Cliquer un bassin : BlueFox doit l'observer sans le faire disparaître.
4. Collecter un cristal : il disparaît temporairement puis réapparaît après 18 secondes.
5. Vérifier : `BlueFox3D.ObjectEvents.history()`.
6. Vérifier la progression : `BlueFox3D.getMissionState()`.

## Limite connue

Les missions d'observation sans objet physique correspondant (`camp`, `contact`) continuent d'utiliser la routine historique de recherche. C'est volontaire pour préserver le comportement actuel.
