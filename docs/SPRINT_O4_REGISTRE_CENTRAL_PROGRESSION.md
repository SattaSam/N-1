# Sprint O4 — Registre central de progression

## Objectif

Installer une source de vérité additive capable de recevoir un même événement physique et d'alimenter plusieurs systèmes sans confondre leurs données.

## Séparations garanties

1. `counters` : compteurs historiques, jamais diminués.
2. `inventory` : quantités actuellement transportées.
3. `deposited` : ressources transférées vers une base ou un projet.
4. `consumed` : ressources dépensées ou détruites.
5. `discoveries` : découvertes uniques par objet, instance, variante, Map, Zone et phénomène.
6. `milestones` : paliers uniques déjà atteints.
7. `expertise` : expertise cumulée par Map, planète et globalement.

## Portées disponibles

- global
- planète
- Map
- Zone
- faction
- mission

Les portées absentes dans un événement ne sont simplement pas alimentées.

## Fichiers

- `engine/object-event-registry.js` : événements enrichis avec inventaire, progression, recherche et portées.
- `engine/progression-registry.js` : stockage central et API publique.

## Ordre de chargement

```html
<script src="./engine/object-event-registry.js"></script>
<script src="./engine/progression-registry.js"></script>
```

Ces deux scripts doivent être chargés avant `object-m0-bridge.js`.

## API de diagnostic

```js
BlueFox3D.getProgressionState()
```

## API de ressources

```js
BlueFox3D.consumeInventory("crystal", 2)
BlueFox3D.depositInventory("fiber", 3)
```

Les quantités consommées et déposées sont retirées de l'inventaire courant, mais restent conservées dans leurs registres historiques respectifs.

## API de palier

```js
BlueFox3D.reachProgressionMilestone("map:crystal:expertise:10", {
  mapId: "crystal",
  threshold: 10
})
```

Un même palier ne peut être validé qu'une seule fois.

## Compatibilité

La mémoire M0 existante n'est pas supprimée. Le registre central fonctionne en parallèle afin de permettre une migration progressive du moteur de mission.
