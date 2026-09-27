# BlueFox Odyssey — Recovery checkpoint — 28 août 2026

Base technique : `c75fa77b2afe59a0d3dc41fc00453c3dc47a1d64`

## Statut
Checkpoint de reprise après la récupération intégrée. T11 retour autonome et T13 autocraft restent ouverts.

## Règles structurantes
- MissionManager = lifecycle + sélection missionnelle.
- BAC = arbitrage comportemental, sans second choix missionnel.
- WorldEngine = monde/transitions/navigation/directive joueur persistante.
- ObjectM0 = CUO/même instance/fan-out.
- BibleRuntime = interprétation/effets/gates sans lifecycle propriétaire.
- SaveUI = snapshot après flush.
- UI = jamais propriétaire gameplay.
- aucun bridge parallèle.

## Navigation joueur
Règle B : mémorisation immédiate, fin de l’action atomique, puis priorité à la directive avant toute nouvelle décision ; persistance au reload.

## Écarts ouverts
### T11
Retour autonome historiquement validé mais non reproduit au checkpoint. Récupérer le dernier flux fonctionnel, ne pas inventer un nouveau système.

### T13
Autocraft ration non déclenché. Tracer génériquement `CRAFT → planner/BAC → propriétaire craft → inventaire → événement → progression`.


---

## Note de reprise post-checkpoint — 30 août 2026

Cette note ne réécrit pas le checkpoint historique du 28 août. Elle fixe seulement la base courante et les chantiers ouverts après les validations suivantes.

### Base technique courante
- HEAD : `a62c25ad75fc63dce4546dfe0bd8861d45842376`.

### Validations acquises depuis le checkpoint
- T13 : chaîne craft ration + déplacement autonome + deuxième nouvelle map + Bosquet bio validée en jeu.
- Passe 4 UI : cycles Recherche/Inventaire validés sans écran noir ni conflit React `removeChild`.

### Reprise suivante
Deux chantiers sont différés :
1. **CPU / cadence / autorité missionnelle**
   - hausse CPU perçue sur maps nouvelles et connues ;
   - temps anormal entre actions malgré cibles et missions compatibles ;
   - actions locales aléatoires possibles alors que des missions restent actives ;
   - garde-fou de coût de route toujours présent mais ne couvre pas tous les rescans ni les décisions suivantes.
2. **Survival / cohérence des indicateurs**
   - conserver le propriétaire `survival-ai-bridge.js` ;
   - harmoniser la perception `energy / rest / food` sans fusionner les besoins ni créer de système parallèle.

Aucune correction CPU ou Survival n’est considérée décidée à ce stade : le prochain chantier doit reprendre par profilage et localisation.

---

## Note de clôture — 1 septembre 2026

Un nouveau checkpoint de reprise existe : `RECOVERY_CHECKPOINT_2026-09-01.md`.

Le chantier trigger/cible missionnelle est clôturé en **FAIL moteur**.
Aucun correctif runtime de ce chantier ne doit être repris.
Seule la mise à jour IMI est retenue pour commit.
