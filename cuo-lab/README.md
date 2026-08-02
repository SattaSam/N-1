# BlueFox CUO Lab

Programme autonome de validation 3D du Catalogue Unifié des Objets (CUO).

## Lancement

Double-cliquer sur `LANCER_CUO_LAB.bat`. Le jeu principal n'est ni chargé ni modifié et ses sauvegardes ne sont pas utilisées.

## Liaison avec le CUO

L'inventaire lit directement `engine/object-library.js` au démarrage. Tout nouvel objet exécutable ajouté à `BlueFox3D.ObjectLibrary` avec une fonction `build()` apparaît automatiquement après un clic sur **Actualiser le CUO** (rechargement de la page). Il n'existe aucune copie manuelle du catalogue dans le Lab.

Les entrées uniquement documentaires du tableur CUO ne peuvent pas être matérialisées avant de disposer de leur définition exécutable et de leur constructeur 3D.

## Usage

- Plateau gauche : catalogue actif disposé automatiquement du XL au S.
- Plateau droit : zone libre ; glisser un objet depuis l'inventaire pour l'instancier.
- Clic sur un objet : sélection et affichage de sa hitbox/collision.
- Les deux plateaux sont jointifs : BlueFox peut passer librement de l'un à l'autre.
- Clic sur le sol ou ZQSD/WASD : déplacement du BlueFox simplifié.
- Clic droit + mouvement : rotation libre de la caméra.
- Maj ou Ctrl + clic droit : déplacement latéral de la caméra.
- Molette : zoom centré sur la position du pointeur.
