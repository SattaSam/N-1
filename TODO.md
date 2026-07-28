# \-BLUEFOX ODYSSEY — TODO

Dernière mise à jour : 2026-07-28

## Priorité immédiate — Terrain V1

Traiter un fichier à la fois, avec livraison ZIP individuelle.

### 1\. `map-registry.js`

* améliorer le filtrage des textures ;
* activer/configurer mipmaps et anisotropie de façon cohérente ;
* préserver le rendu sRGB ;
* réduire la taille des plateaux d’environ 10 % ;
* ajuster l’espacement pour éviter des vides visibles ;
* ajouter une transition simple et discrète entre zones ;
* revoir les UV si nécessaire ;
* ne pas modifier le gameplay, les objets, la caméra ou la génération des biomes.

### 2\. `world-engine.js`

* vérifier l’alignement et le chargement des zones ;
* garantir le retrait complet de l’ancienne map ;
* éviter toute texture ou groupe résiduel ;
* vérifier la cohérence avec les nouvelles dimensions de zones.

### 3\. `bluefox3d-core.js`

* ne modifier que si un réglage global Three.js est réellement utile ;
* conserver `disposeObject()` comme point central de nettoyage ;
* ajouter seulement des sécurités de libération si nécessaire.

## Après Terrain V1

* tests de changement de map répétés ;
* test de 1, 2, 4 et 6 zones ;
* test des textures manquantes ;
* test desktop et mobile ;
* validation visuelle avant intégration dans `game.js`.

## Méthode de livraison validée

* un seul gros fichier modifié à la fois ;
* chaque fichier livré dans son propre ZIP ;
* aucun faux livrable ni ZIP vide ;
* fichiers complets uniquement.

