# BlueFox Odyssey — Banc 3D de validation CUO

Statut : **spécification validée — développement suivant**  
Date : **2 août 2026**

## Objectif

Créer un moteur de contrôle volontairement minimal pour matérialiser chaque
objet du Catalogue Universel des Objets, mesurer ses hitbox et valider sa taille,
ses collisions, ses interactions et son espace de circulation avant son
activation dans le jeu principal.

Le banc est un outil de développement séparé. Il ne modifie ni les sauvegardes,
ni la planète, ni les missions, ni les règles d’autonomie du jeu.

## Périmètre technique

- un point d’entrée HTML distinct de `index.html` ;
- une scène Three.js légère sans panorama, météo, particules ou texture de sol ;
- une Map neutre composée de deux plateaux carrés contigus ;
- éclairage simple et fond uni pour lire les volumes ;
- aucune IA, mission, journal, progression ou simulation hors ligne ;
- BlueFox simplifié, uniquement déplaçable par le joueur ;
- caméra totalement libre : orbite, rotation, panoramique et zoom ;
- catalogue alimenté par `engine/object-library.js`, sans copie parallèle des
  définitions.

## Organisation des deux plateaux

### Plateau A — showroom automatique

- instancier tous les objets actuellement exécutables ;
- les aligner par taille décroissante : XL, L, M, S ;
- trier ensuite par catégorie puis par nom ;
- afficher une étiquette avec nom, ID CUO, catégorie et taille ;
- calculer pour chaque objet un anneau de circulation tenant compte de sa
  collision et du rayon de BlueFox ;
- conserver assez d’espace pour que BlueFox puisse effectuer un tour complet
  sans toucher l’objet voisin.

### Plateau B — bac à sable

- rester vide au démarrage ;
- accepter les objets déposés depuis la fenêtre du catalogue ;
- permettre plusieurs instances d’un même objet ;
- sélectionner, déplacer, faire pivoter et supprimer une instance ;
- empêcher uniquement le dépôt hors des deux plateaux ;
- ne pas corriger silencieusement une collision : l’afficher pour permettre son
  diagnostic.

## Fenêtre de catalogue

La fenêtre est minimale, superposée à la scène et doit pouvoir être :

- réduite à une barre ;
- agrandie ;
- redimensionnée ;
- déplacée sans déplacer la caméra ;
- scrollée indépendamment de la scène.

Elle contient :

- une recherche par nom ou ID ;
- un filtre type/catégorie ;
- un filtre taille S, M, L ou XL ;
- une commande de réinitialisation des filtres ;
- le nombre de résultats ;
- une fiche par objet avec nom, ID, catégorie, taille et état d’intégration ;
- une zone de détail pour l’objet ou l’instance sélectionnée.

## Glisser-déposer

1. le joueur saisit une fiche dans le catalogue ;
2. un aperçu transparent suit le pointeur dans la scène ;
3. un raycast projette l’objet sur le plateau visé ;
4. le relâchement instancie l’objet par `ObjectLibrary` ;
5. les hitbox et collisions sont recalculées depuis ses métadonnées CUO ;
6. l’instance devient sélectionnable et repositionnable.

Le glisser-déposer ne doit jamais modifier la définition source du catalogue.

## Visualisation des hitbox

Pour l’instance sélectionnée, afficher séparément :

- volume visuel ;
- collider physique ;
- hitbox cliquable ;
- rayon d’interaction ;
- points ou anneau d’approche ;
- emprise minimale réservée autour de l’objet.

Chaque couche possède une couleur et peut être masquée. Une fiche indique les
dimensions numériques, le coût de spawn, l’interaction par défaut, le délai de
respawn et les biomes autorisés.

## Contrôles de BlueFox

- clic au sol : déplacement simple ;
- aucun choix autonome ;
- aucun déclenchement de collecte automatique ;
- collisions identiques aux métadonnées du moteur principal ;
- possibilité de demander un trajet circulaire autour de l’objet sélectionné
  pour vérifier l’espace de contournement.

## Critères de validation d’un objet

- échelle cohérente avec BlueFox et sa classe S/M/L/XL ;
- origine et contact avec le sol corrects ;
- hitbox accessible et non disproportionnée ;
- collider sans blocage invisible excessif ;
- rayon d’interaction atteignable ;
- tour complet possible lorsque l’objet est prévu comme contournable ;
- animation et interaction conformes aux métadonnées ;
- coût de spawn cohérent avec le volume et la complexité ;
- catégorie, biomes et micro-scènes correctement renseignés.

Un objet non validé reste documentaire ou désactivé dans `ObjectLibrary`.

## Ordre d’intégration CUO

1. importer les 36 lignes consolidées dans l’inventaire du banc ;
2. vérifier les 14 objets déjà matérialisés ;
3. matérialiser progressivement les 22 objets documentaires ;
4. valider les modèles obligatoires pour PNJ, faune, habitations,
   technologies et structures spéciales ;
5. corriger le CUO consolidé ;
6. raccorder uniquement les objets validés à `BiomeRules` et `MicroScenes` ;
7. tester leur peuplement dans les Maps de 1, 2, 4 et 6 plateaux ;
8. activer les objets dans le jeu principal par lots réversibles.

## Fichiers du jeu à préserver

Le banc ne doit pas nécessiter de modification de `engine/map-registry.js`,
`engine/world-engine.js`, `engine/character-controller.js` ou
`engine/path-planner.js`. Les raccordements au jeu principal interviendront
seulement après validation du catalogue.
