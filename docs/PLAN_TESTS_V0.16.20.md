# BlueFox Odyssey — Plan de tests V0.16.20

Mise à jour : **28 juillet 2026 — raccordement catalogue**

## Préparation

- [ ] Sauvegarder le projet avant remplacement.
- [ ] Conserver le dossier local `Images`.
- [ ] Fermer les anciens onglets BlueFox.
- [ ] Installer les fichiers en respectant leur arborescence.
- [ ] Lancer uniquement `LANCER_BLUEFOX.bat`.
- [ ] Vérifier que le titre indique V0.16.20.
- [ ] Ouvrir la console du navigateur et conserver la première erreur éventuelle.

## Démarrage et dépendances du catalogue

- [ ] Aucun message « ObjectSpawner nécessite… ».
- [ ] Aucun `ReferenceError` concernant `ObjectLibrary`, `BiomeRules` ou `MicroScenes`.
- [ ] La première Map devient visible.
- [ ] Des objets, ressources et décors sont présents.
- [ ] Les objets interactifs répondent normalement.
- [ ] Les obstacles bloquent BlueFox sans bloquer les corridors.
- [ ] Une ressource peut être approchée et récoltée.

## Densités et génération

- [ ] La densité visuelle reste comparable à la V0.16.20 précédente.
- [ ] Les amas de rochers sont présents et irréguliers.
- [ ] Les ressources apparaissent seules ou en petits amas.
- [ ] Les petits décors occupent bords, jonctions et zones centrales.
- [ ] Les landmarks spécifiques des premières Maps sont présents.
- [ ] Recharger une même Zone conserve une disposition déterministe.

## Images et Zones

- [ ] Zone 1 : décor `1…` et textures `01_x`.
- [ ] Zone 2 : décor `2…` et textures `02_x`.
- [ ] Le HUD correspond toujours au décor affiché.
- [ ] Planète et Journal utilisent le décor de la Zone actuelle.
- [ ] Aucun plateau interne n’est annoncé comme nouvelle Zone.
- [ ] Tester des Maps de 1, 2, 4 et 6 plateaux.

## Cyclorama et caméra

- [ ] Le bord inférieur reste proche du plateau.
- [ ] Aucun grand espace noir sur les côtés.
- [ ] Les bords sont plus étirés que le centre.
- [ ] L’image reste légèrement incurvée.
- [ ] Au recul maximal, elle est presque entièrement visible.
- [ ] Le panorama défile doucement pendant une rotation.
- [ ] La molette atteint 34 unités.
- [ ] Le pivot se relève en vue éloignée.
- [ ] Recentrage et suivi libre fonctionnent.

## Déplacements et animations

- [ ] La course autonome reste cohérente.
- [ ] Les pieds suivent la vitesse.
- [ ] Une direction acceptée utilise `Run_fast`.
- [ ] La vitesse redevient normale à l’arrivée.
- [ ] Aucun saut visuel ou root motion parasite.

## Portails, transitions et nettoyage

- [ ] Les portails restent près des bords et parallèles au bord concerné.
- [ ] Retour vers la Zone précédente possible.
- [ ] Au moins une continuation inconnue disponible.
- [ ] Une Zone inconnue charge sans rafraîchissement.
- [ ] Enchaîner au moins dix transitions.
- [ ] Aucun objet, collider ou plateau de l’ancienne Map ne subsiste.
- [ ] Retour à la base actif depuis HUD et Planète.

## Cycle et interface

- [ ] Cycle total de 20 heures et nuit limitée à 5 heures.
- [ ] « En ce moment » décrit l’action instantanée.
- [ ] « Intention actuelle » reste stable.
- [ ] Bulles contextuelles masquables.
- [ ] Menus utilisables sur ordinateur, tablette et smartphone.

## Verdict

- **VALIDÉ** : aucun blocage, aucune erreur de dépendance et tests catalogue/transition réussis.
- **À CORRIGER** : noter la première erreur, la Map et l’action exacte.

Ne pas créer le point Git de référence tant que la section catalogue et les
transitions ne sont pas validées.
