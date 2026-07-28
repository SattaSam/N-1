# BLUEFOX ODYSSEY — MASTER

## État de référence
Dernière mise à jour : 2026-07-28

### Version de travail
- Base PC connue : V16.20.
- Version mobile/APK précédente : V16.14, considérée obsolète.
- Développement mobile à reprendre depuis la V16.20 à jour.
- Objectif : builds testables régulièrement, Web puis Android.

### Architecture 3D concernée
Fichiers principaux :
- `engine/bluefox3d-core.js`
- `engine/map-registry.js`
- `engine/world-engine.js`
- `game.js` uniquement si des réglages restent compilés ou embarqués à la racine.

### Rendu des plateaux
Décisions validées :
- amélioration modérée, sans refonte complète du terrain ;
- réglages de texture et de matériau en priorité ;
- réduction visuelle des zones d’environ 10 % ;
- transitions simples entre zones voisines ;
- optimisation des UV ;
- éviter les shaders complexes ;
- tester `MeshBasicMaterial` uniquement si les réglages actuels restent insuffisants.

### Gestion des anciennes maps
Le moteur doit retirer proprement l’ancienne map avant de charger la suivante :
- détachement de la scène avec `removeFromParent()` ;
- libération des géométries, matériaux et textures ;
- aucune ancienne texture de plateau ne doit rester visible après changement de map.

### Images
- Décors panoramiques : fichiers `N...`
- Textures de zones : fichiers `0N_x`
- Association préférentielle par numéro.
- Une texture correspond à une zone.
- Une map peut comporter de 1 à 6 zones.

### Direction actuelle
Priorité à la stabilité, au rendu lisible et aux petits livrables testables.
