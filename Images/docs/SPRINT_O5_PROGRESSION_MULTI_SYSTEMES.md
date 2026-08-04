# Sprint O5 — Progression multi-systèmes

## Objectif

Faire d'un événement de jeu unique une source commune pour plusieurs systèmes, sans dupliquer l'action physique ni confondre leurs données.

## Flux ajouté

`ObjectEvents` diffuse une action normalisée. Cette action peut désormais alimenter simultanément :

1. le registre central O4 ;
2. les missions M0 via `object-m0-bridge.js` ;
3. les projets de recherche ;
4. les maîtrises d'action, de famille et de Map ;
5. les indicateurs d'expertise de Map ;
6. le journal des 50 dernières actions.

Chaque événement possède un identifiant. Le module O5 conserve les 1 000 derniers identifiants traités afin d'empêcher une double progression après une réémission accidentelle.

## Indicateurs de Map

Le module suit séparément :

- expertise totale ;
- collectes ;
- inspections ;
- analyses ;
- phénomènes observés ;
- objets uniques ;
- instances uniques ;
- familles de ressources identifiées ;
- POI analysés ;
- phénomènes uniques ;
- ruines ou technologies scannées ;
- espèces étudiées.

## Installation

Charger les scripts dans cet ordre :

```html
<script src="./engine/object-event-registry.js"></script>
<script src="./engine/progression-registry.js"></script>
<script src="./engine/progression-multisystem.js"></script>
<script src="./engine/object-m0-bridge.js"></script>
```

## Diagnostics console

```js
BlueFox3D.getMultiProgressionState()
BlueFox3D.getMapProgressionIndicators("crystal")
BlueFox3D.getProgressionState()
BlueFox3D.getMissionState()
```

## Événements d'interface

```js
window.addEventListener("bluefox:multi-progression", event => {
  console.log(event.detail);
});

window.addEventListener("bluefox:journal-entry", event => {
  console.log(event.detail);
});
```

## Compatibilité

Le module est additif. Il ne remplace ni `mission-memory.js`, ni `mission-manager.js`, ni le registre O4. Il peut être retiré sans empêcher M0 de fonctionner.
