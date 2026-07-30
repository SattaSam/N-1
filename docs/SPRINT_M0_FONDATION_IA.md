# BlueFox Odyssey — Sprint M0 Fondation IA

## Objet

M0 introduit un socle de missions hiérarchiques persistant, raccordé au moteur
3D V0.16.20 sans remplacer son autonomie et sans modifier
`character-controller.js` ni `path-planner.js`.

## Modules

- `mission-types.js` : vocabulaire commun, états, types d’actions et première
  définition de mission.
- `mission-tree.js` : arbre objectif → sous-objectifs → actions, prérequis,
  progression et sérialisation complète.
- `mission-memory.js` : mémoire locale versionnée, inventaire, faits, historique
  borné et sauvegarde des arbres.
- `mission-planner.js` : sélection déterministe de la prochaine action réalisable
  selon l’état réel de la map.
- `action-bridge.js` : traduction des actions abstraites vers les capacités déjà
  présentes dans `WorldEngine`.
- `mission-manager.js` : orchestration, suivi de l’action active, validation,
  publication de l’état et reprise après rechargement.
- `mission-ui-bridge.js` et `mission-ui-bridge.css` : raccordement de la carte
  historique « Mission en cours » à l’état réel de M0.

## Raccordement moteur

`index.html` charge les six modules avant `world-engine.js`.

`WorldEngine` :

1. crée `MissionManager` après l’initialisation complète de la scène ;
2. lui laisse proposer une action uniquement lorsque le personnage est libre ;
3. conserve l’autonomie historique quand aucune action de mission n’est
   réalisable ;
4. confirme les collectes, explorations et routines seulement après leur
   achèvement réel ;
5. expose l’état avec `BlueFox3D.getMissionState()` et dans
   `BlueFox3D.getDiagnostics().mission`.

## Persistance

Clé locale : `bluefox_mission_memory_m0_v1`.

La sauvegarde contient :

- mission active et arbre complet ;
- progression de chaque nœud ;
- inventaire minimal (`crystal`, `fiber`) ;
- faits extensibles ;
- 150 derniers événements de mission.

## Missions historiques intégrées

Les anciennes missions ne sont plus de simples textes isolés dans l’interface.
Elles existent désormais comme définitions M0 :

- `shelter` — Établir un premier refuge ;
- `energy` — Concevoir une énergie douce ;
- `flora` — Étudier la flore photoréactive ;
- `contact` — Créer un premier lien.

Seul le refuge est proposé au démarrage normal. Les autres définitions restent
disponibles mais ne sont pas activées automatiquement. Leur sélection dépendra
ultérieurement de BlueFox, de la narration ou de conditions de recherche.

## Règle d’exploration composée

Atteindre une zone ne suffit pas à la déclarer explorée. La reconnaissance est
une sous-action. Une exploration réussie demande ensuite :

1. l’identification d’au moins trois ressources ou éléments différents ;
2. la mémorisation de ces relevés ;
3. la cartographie des ressources ;
4. la validation de l’objectif parent d’exploration.

Pour la zone initiale du refuge, les trois relevés M0 sont un cristal, des
fibres et une structure locale.

## Mission test M0

La mission `shelter` enchaîne :

1. établissement du camp près de l’épave ;
2. reconnaissance du plateau ;
3. identification d’un cristal, de fibres et d’une structure locale ;
4. cartographie des ressources, qui valide l’analyse de la zone ;
5. collecte de trois cristaux et de cinq fibres pour le refuge.

Les prérequis sont portés par l’arbre. Une ressource absente ou inaccessible ne
bloque pas la boucle générale : le planificateur attend puis réévalue, tandis que
l’autonomie existante reste disponible.

## Vérification navigateur

### Test express sans console

1. Lancer le jeu avec `LANCER_BLUEFOX.bat`.
2. Ne rien commander pendant environ 10 secondes.
3. Observer l’établissement du camp, puis une reconnaissance ou une collecte
   annoncée par
   `Mission : ...` dans le journal.
4. Vérifier que la carte affiche maintenant la mission M0 et sa progression.
5. Laisser BlueFox identifier trois éléments différents puis cartographier les
   ressources.
6. Vérifier que les collectes destinées au refuge commencent seulement après
   cette cartographie.
7. Rafraîchir le navigateur : les étapes déjà accomplies ne doivent pas
   recommencer à zéro.

Pendant ce test, déplacer la caméra, ouvrir le Journal et la carte Planète puis
les refermer. BlueFox doit rester actif et aucune régression d’affichage ou de
navigation ne doit apparaître.

### Contrôle par la console

Après lancement avec `LANCER_BLUEFOX.bat`, ouvrir la console :

```js
BlueFox3D.getMissionState()
BlueFox3D.getDiagnostics().mission
```

La progression doit survivre à un rafraîchissement. Pour recommencer uniquement
le test M0 :

```js
localStorage.removeItem("bluefox_mission_memory_m0_v1");
location.reload();
```
