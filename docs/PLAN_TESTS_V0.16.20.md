# Plan de tests — V0.16.20

## Préparation

- Remplacer les anciens fichiers du jeu.
- Conserver le dossier local `Images`.
- Fermer tout ancien onglet BlueFox.
- Lancer uniquement `LANCER_BLUEFOX.bat`.
- Vérifier que le titre du navigateur indique V0.16.20.

## Images et Zone

- [ ] Zone 1 : décor `1…` et textures `01_x`.
- [ ] Zone 2 : décor `2…` et textures `02_x`.
- [ ] Le nom du HUD correspond toujours au décor affiché.
- [ ] Planète et Journal montrent le décor de la Zone actuelle.
- [ ] Aucun plateau interne n’est annoncé comme nouvelle Zone.

## Cyclorama

- [ ] Le bord inférieur reste proche du plateau.
- [ ] Aucun grand espace noir n’apparaît sur les côtés.
- [ ] Les bords sont plus étirés que le centre.
- [ ] L’image reste légèrement incurvée.
- [ ] Au recul maximal, l’image est presque entièrement visible.
- [ ] Le panorama défile doucement pendant une rotation.

## Caméra

- [ ] La molette permet un recul jusqu’à 34 unités.
- [ ] La caméra ne revient pas automatiquement à 8 unités.
- [ ] Le pivot se relève en vue éloignée.
- [ ] BlueFox reste visible vers le bas de l’écran.
- [ ] Le recentrage caméra reste fonctionnel.
- [ ] Le mode suivi libre reste fonctionnel.

## Déplacements et animations

- [ ] La course autonome est visiblement plus rapide.
- [ ] Les pieds restent cohérents avec la vitesse.
- [ ] Une direction suggérée et acceptée utilise `Run_fast`.
- [ ] Le sprint est nettement plus rapide que l’autonomie normale.
- [ ] La vitesse redevient normale après l’arrivée.
- [ ] Aucun saut visuel ou root motion parasite.

## Portails et exploration

- [ ] Portails placés près des bords extérieurs.
- [ ] Orientation parallèle au bord concerné.
- [ ] Retour vers la Zone précédente possible.
- [ ] Au moins une continuation inconnue disponible.
- [ ] Premier chargement d’une Zone inconnue sans rafraîchissement.
- [ ] Zone découverte visible dans Planète.
- [ ] Retour à la base actif depuis le HUD et Planète.

## Cycle et interface

- [ ] Cycle total de 20 heures.
- [ ] Nuit limitée à 5 heures.
- [ ] « En ce moment » décrit l’action instantanée.
- [ ] « Intention actuelle » reste stable.
- [ ] Bulles contextuelles masquables.

