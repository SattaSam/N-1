# Sprint O6 — Exploration et expertise de Map

## Livré

- Mesure de l'exploration par grille de secteurs (12 × 12 par défaut).
- Pourcentage de surface parcourue distinct du nombre de Zones visitées.
- Distance parcourue par Map.
- Paliers d'exploration : 10 %, 25 %, 50 %, 75 %, 100 %.
- Paliers d'expertise : 10, 25, 50, 100, 200 points.
- Synchronisation automatique avec les indicateurs d'expertise du Sprint O5.
- Enregistrement des paliers dans le registre central O4.
- Événements UI :
  - `bluefox:map-exploration-changed`
  - `bluefox:map-expertise-changed`
  - `bluefox:map-milestone`

## Chargement

Ajouter après `progression-multisystem.js` :

```html
<script src="./engine/map-exploration-tracker.js"></script>
```

## Raccordement minimal au moteur 3D

Dans la boucle de mise à jour de `world-engine.js`, après la mise à jour de la position de BlueFox :

```js
BlueFox3D.recordMapPosition?.({
  mapId: this.currentMapId,
  planetId: this.currentPlanetId || "planet-1",
  zoneId: this.currentZoneIndex,
  x: this.character.root.position.x,
  z: this.character.root.position.z,
  bounds: this.currentMap?.bounds || 27
});
```

Le module ignore automatiquement les positions répétées dans un secteur déjà visité. Il peut donc être appelé à chaque frame, mais un appel toutes les 250 à 500 ms est préférable.

## Diagnostic console

```js
BlueFox3D.getMapExplorationState("crystal")
BlueFox3D.getExplorationSummary()
```

## Test manuel sans déplacement

```js
BlueFox3D.recordMapPosition({ mapId: "crystal", zoneId: 0, x: -20, z: -20, bounds: 27 });
BlueFox3D.recordMapPosition({ mapId: "crystal", zoneId: 0, x: 0, z: 0, bounds: 27 });
BlueFox3D.recordMapPosition({ mapId: "crystal", zoneId: 1, x: 20, z: 20, bounds: 27 });
BlueFox3D.getMapExplorationState("crystal");
```

## Principe respecté

L'exploration mesure la surface ou les secteurs parcourus. L'expertise reste un indicateur différent, alimenté par les objets inspectés, ressources identifiées, POI, phénomènes, ruines et espèces étudiées.
