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
- `engine/inventory-ui-bridge.js` : projection du registre central dans l'interface historique.
- `engine/mission-memory.js` : mémoire des missions sans copie locale de l'inventaire.

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

Le registre central est désormais l'unique source de vérité de l'inventaire.

- L'ancien champ `resources` de `bluefox_odyssey_save_v1` est importé une seule fois.
- Les gains hors ligne encore produits par l'interface historique sont convertis une seule fois en événements de collecte standardisés.
- Après cette réconciliation, `resources` devient une projection compatible du registre central et ne peut plus l'écraser.
- `MissionMemory` conserve l'arbre, les faits et l'historique des missions, mais plus aucun inventaire parallèle.
- Collecte, extraction, consommation et dépôt déclenchent tous une mise à jour de l'interface.
