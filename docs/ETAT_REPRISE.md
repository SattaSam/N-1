# BlueFox Odyssey — État de reprise

Date : **29 juillet 2026**  
Base : **V0.16.20 + refonte catalogue + correctifs cumulatifs**

## Point exact

La génération des objets a été extraite de `engine/map-registry.js` et répartie
entre :

- `engine/object-library.js` ;
- `engine/biome-rules.js` ;
- `engine/micro-scenes.js` ;
- `engine/object-spawner.js`.

`index.html` a été corrigé pour charger ces modules avant
`engine/map-registry.js`.

La syntaxe, le catalogue et l’ordre des dépendances ont été vérifiés. Le jeu
complet doit encore être lancé et testé avant de qualifier ce point de stable.

Le paquet cumulatif de clôture est :

`BlueFox_Correctif_Cumulatif_Portails_Carte_Planete.zip`

Il réunit les versions cohérentes de :

- `engine/map-registry.js` ;
- `engine/world-engine.js` ;
- `engine/ui-enhancements.js` ;
- `engine/ui-enhancements.css`.

Il conserve les correctifs de positionnement et d’étiquettes des portails, la
boussole, les noms uniques, les vignettes cardinales et la nouvelle carte
Planète. La carte permet déplacement, zoom, recentrage sur BlueFox, focus sur
les Zones découvertes et suggestion d’un itinéraire par les passages connus.

### Incident de session

Un sprint avait été livré sans `map-registry.js`, resté dans un ZIP de hotfix
séparé. Cette fragmentation pouvait faire disparaître la correction des
portails lors d’un remplacement de fichiers. Le paquet cumulatif ci-dessus
devient l’unique base locale de reprise avant le prochain point Git.

## Reprendre ici

1. Sauvegarder le projet actuel.
2. Copier les quatre fichiers du paquet cumulatif dans le dossier `engine`
   existant, sans supprimer ce dossier.
3. Lancer uniquement `LANCER_BLUEFOX.bat`.
4. Vérifier que le jeu atteint la première Map sans erreur.
5. Exécuter les sections catalogue, portails et carte Planète de
   `PLAN_TESTS_V0.16.20.md`.
6. Si les tests passent, effectuer le point Git et considérer ce jeu
   documentaire comme la référence stable.
7. Si un test échoue, conserver la première erreur de console et corriger le
   module responsable sans réintroduire la génération dans `map-registry.js`.

## Fichier protégé

`engine/map-registry.js` ne doit plus être le premier fichier modifié pour un
problème d’objet. Consulter la matrice de responsabilités dans
`ARCHITECTURE_TECHNIQUE.md`.

Ne jamais repartir de la copie GitHub actuelle pour le prochain hotfix tant que
le paquet cumulatif de cette session n’a pas été intégré et sauvegardé sur Git.
