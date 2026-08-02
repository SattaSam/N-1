# Sprint O2.2–O2.3 — objets pilotes CUO

## Ajouts

- Minerai magnétique : collecte, inspection, domaines géologie/magnétisme/matériaux.
- Plante adaptative : inspection prioritaire, récolte durable possible, botanique/adaptation/bioluminescence.
- Vestige technologique : inspection unique, expertise de Map élevée, futur déclencheur de projet.

## Génération

Les profils de Map restent limités à cinq familles exploitables. Les nouveaux objets sont introduits uniquement dans les biomes cohérents. Le vestige technologique reste un objet rare de découverte et n'entre pas dans les familles de ressources.

## Installation

Remplacer les quatre fichiers du dossier `engine`. Conserver l’ordre de chargement précédent : `object-library.js`, `biome-rules.js`, `object-spawner.js`, `object-event-registry.js`, modules M0, `world-engine.js`, puis `object-m0-bridge.js`.

## Tests rapides

1. `BlueFox3D.ObjectLibrary.validate()` doit retourner `valid: true`.
2. `BlueFox3D.ObjectLibrary.get("magnetic_ore")` doit retourner une définition.
3. `BlueFox3D.BiomeRules.getMapPopulation(BlueFox3D.maps.crystal).resourceFamilies.length` doit rester inférieur ou égal à 5.
4. Cliquer une plante adaptative : elle doit être inspectée par défaut.
5. Une mission d'observation `flora` doit progresser lors de cette inspection.
6. Un vestige technologique doit alimenter les observations `components`.
