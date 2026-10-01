# BLUEFOX ODYSSEY — MASTER

## État de référence

Dernière mise à jour : **1 octobre 2026**

### Version de travail
- HEAD GitHub courant vérifié : `d334ed2cb193c80c44e98c401b5947bbd263348e` — `Mission routines`.
- Parent direct : `93a6b7f11ee267764bacc471e8851ca156756ed3` — `R1->R5 transition missionnelles Big fix - réconciliation-réparation`.
- Le HEAD courant reste la seule base technique de reprise.
- Le checkpoint R-HEALTH `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46` reste une référence historique de santé, jamais une base alternative au HEAD.
- Les recovery checkpoints restent historiques.
- `ROADMAP_TODO.md` reste la seule TODO active.
- `map-registry.js` reste protégé.

## Gouvernance documentaire officielle

Documents maintenus : ceux désignés par `docs/README.txt`.

Ordre d'autorité fonctionnelle :
1. décision gameplay explicite utilisateur la plus récente ;
2. validation directe en jeu / comportement observable ;
3. Contrat Gameplay Opérationnel V2 + addenda courants ;
4. MASTER / ARCHITECTURE / ROADMAP / DEV_HISTORIQUE ;
5. documents officiels historiques ;
6. anciennes traductions techniques ;
7. code courant comme preuve du comportement exécuté, jamais comme définition autonome de l'intention.

Une couche architecturalement imparfaite ne peut pas être supprimée avant identification et conservation de tous les comportements gameplay qu'elle transporte réellement.

## Doctrine moteur actuelle — 1 octobre 2026

### 1. Autorité missionnelle

Le moteur doit suivre la hiérarchie fonctionnelle suivante. Au HEAD courant, `MissionManager.hasMissionExecutionAuthority()` représente cette autorité globale plus large que la seule primaire :

`directive joueur persistante / Top1 explicite → travail missionnel exécutable de la shortlist prioritaire → transition missionnelle structurée → fallback missionnel borné → autonomie libre en dernier recours`.

Règles :
- le choix joueur fixe la mission Top1 ; il ne prescrit pas toutes les micro-actions ;
- sans choix joueur, BAC/MissionManager arbitrent une shortlist de 3 à 4 missions prioritaires ;
- une mission active ou primaire peut être localement non-runnable sans être terminée ni abandonnée ;
- une Top1 non-runnable ne donne pas automatiquement la main à l'autonomie libre ;
- Top2→Top4 doivent pouvoir fournir action locale, destination connue ou transition inconnue contractuelle ;
- lorsqu'aucune mission de la shortlist n'est exécutable mais qu'une autre mission active possède un travel structuré et causal, ce travel peut être retenu en fallback borné ;
- l'autonomie générale n'est autorisée qu'après épuisement des chemins missionnels réellement exécutables ;
- aucun scheduler, moteur d'autorité ou file de missions parallèle ne doit être créé.

### 2. Continuité spatiale missionnelle

Ordre gameplay canonique :

`LOCAL → KNOWN → UNKNOWN CONTRACTUEL → FREE AUTONOMY`.

- **LOCAL** : action missionnelle physiquement exécutable sur la map courante.
- **KNOWN** : cible/site/map connus, atteints par le graphe réel et les routes existantes.
- **UNKNOWN CONTRACTUEL** : seulement si la mission ou une directive autorise explicitement l'ouverture de l'inconnu ; génération au passage réel.
- **FREE AUTONOMY** : dernier recours, jamais substitut silencieux à une mission encore exécutable.

Une destination connue reste physique : aucune téléportation implicite. Le routage TP autonome n'est utilisable qu'après TP-AFTER-04 et uniquement par un consommateur opt-in conforme à `TP_AUTONOMY_CONTRACT_2026-09-14.md`.

### 3. Causalité du voyage

Une transition missionnelle transporte sa raison d'être.

- une mission qui provoque un départ mémorise l'intention de travel ;
- la destination réelle connue ou générée est rattachée à cette intention ;
- à l'arrivée, le travail ayant motivé le trajet reste prioritaire tant qu'il n'est pas résolu ou réellement impossible ;
- une autre mission ne doit pas voler l'arrivée causale ;
- une cible momentanément non matérialisée à l'arrivée ne suffit pas à conclure que la mission est stérile ;
- save/reload doit conserver l'identité de destination et l'intention de reprise.

### 4. Missions locales et opportunités perdables

Une opportunité locale réellement perdable au départ peut différer ponctuellement un travel si le contrat le permet. Exemples : contexte faune ou MSC locale réellement liée à la map.

Interdits :
- utiliser une collecte générique Shelter/COL/ENV comme prétexte pour différer indéfiniment un départ ;
- relancer une réarbitration générale après chaque petite action locale ;
- oublier le travel principal après la déviation ;
- transformer une opportunité en autorité supérieure permanente.

Après la déviation autorisée, le travel causal reprend.

### 5. Interaction missionnelle / SAME-INSTANCE

`ObjectM0` reste propriétaire du matching générique, de SAME-INSTANCE et du fan-out.

Invariant : lorsqu'une acquisition exige réellement une ou plusieurs études missionnelles sur cette même ressource :

`0..N études dues → même instance → collect/extract`.

- aucune cible de substitution au milieu de la transaction ;
- aucun double crédit du même nœud sur la même instance ;
- plusieurs missions compatibles peuvent progresser par fan-out ;
- un respawn déjà connu peut être collecté directement lorsqu'aucune nouvelle étude missionnelle n'est due.

Règle renforcée au 1 octobre : une mission secondaire ne peut pas injecter son besoin d'étude comme **précondition bloquante** de l'action courante d'une autre mission. Son progrès doit rester passif via les événements canoniques, sauf si l'interaction intrinsèque de la cible exige elle-même l'étude avant acquisition.

### 6. Atomicité et échec d'interaction

Une interaction déjà engagée reste atomique jusqu'à succès, échec réel ou annulation légitime.

- `currentAction` et `pendingInteraction` doivent rester cohérents ;
- un échec d'approche ne doit pas être confondu avec une absence de cible ;
- le moteur doit tenter ses récupérations physiques bornées avant de déclarer la cible inaccessible ;
- après refus/échec d'une candidate, le moteur doit pouvoir essayer la candidate missionnelle suivante avant de rendre la main à l'autonomie libre ;
- aucune boucle infinie observe/retry/collecte n'est acceptable.

### 7. MSC, identité et destination

Une mission qui vise une MSC doit conserver l'identité suffisamment précise pour retrouver la bonne scène : map, `siteId`, `microSceneId` et/ou `persistentMicroSceneId` selon le contrat.

- une famille générique ne remplace pas une identité missionnelle prouvée ;
- plusieurs `requiredMicroScenes` ne forment pas implicitement une unité ;
- une unité visuelle/missionnelle composée doit être une MSC composite unique de données ;
- les retours d'une mini-série visent la même map et la même instance persistante ;
- une mission ne s'active pas sur une MSC incomplète lorsque son contrat exige aussi des objets/composants spécifiques.

### 8. Navigation physique

`WorldEngine`, `PathPlanner` et `CharacterController` restent les propriétaires du monde, des routes et du mouvement.

- route connue = déplacement physique ;
- inconnue = génération au passage réellement autorisé ;
- aucun enchaînement incontrôlé de portails ;
- après plusieurs échecs de replanification, récupération physique bornée autorisée puis échec explicite ;
- le reach d'interaction peut être ajusté sans modifier les colliders/identités MSC quand le problème est une portée d'interaction ;
- autonomie OFF bloque les décisions autonomes mais ne doit pas annuler les déplacements directs du joueur au sol.

### 9. Performance / cadence

La performance est un invariant gameplay : un correctif fonctionnel ne doit pas réintroduire de scans globaux par tick.

- `RuntimeBudget` reste le seul propriétaire du throttling adaptatif ;
- privilégier une résolution de cible au changement d'état / à l'entrée d'interaction / au retry plutôt qu'un scan map-wide chaque frame ;
- une cible déjà résolue est suivie localement tant qu'elle reste valide ;
- aucune nouvelle boucle CPU, cache global ou scheduler parallèle sans preuve ;
- les chemins MissionManager/BAC/WorldEngine doivent être réveillés causalement autant que possible.

Mesure de référence fin septembre : environ 39 FPS moyens sur la session profilée, avec `world-engine.js` principal contributeur CPU. Ces chiffres sont une photographie, pas un seuil contractuel.

### 10. Survie / énergie

- ration = récupération réelle et outil d'excursion ;
- micro-pause courte = récupération réelle, commentaire possible « je souffle » ;
- repos long = besoin plus important, pas substitut automatique à chaque action ;
- sans ration, les repos longs restent possibles ; avec ration + micro-pause, BlueFox peut prolonger son excursion ;
- aucune boucle artificielle `une action → repos` ;
- Survival peut interrompre légitimement une mission en cas de besoin réel, mais ne doit pas devenir un prétexte à abandon missionnel.

### 11. Maps / assets / monde

- progression tutorielle structurelle : 1→2→4→6 plateaux ;
- Crystal reste l'exception narrative initiale ;
- seed/topologie/noms persistants ;
- identité visuelle d'une map doit rester cohérente après reload ;
- WebP/PNG/alias/fallback ne doivent jamais fusionner des identités de maps différentes ;
- le fallback doit être compatible avec le biome et ne pas substituer arbitrairement Crystal ;
- objets décoratifs immobiles, notamment les débris de ruine concernés, ne doivent recevoir aucun mouvement de vent/flore/idle.

### 12. Save / reload / inventaire

La sauvegarde doit préserver :
- missions, lifecycles, priorités et faits ;
- intention de travel et arrivée causale ;
- exploration/topologie/seed/noms ;
- MSC/sites persistants ;
- inventaires physiques et ressources réellement consommées/créditées ;
- constructions ;
- recettes/research ;
- ration/craft ;
- réseau drone/balise/TP ;
- directive joueur persistante.

Une mission validée qui dépend de ressources physiques ne doit pas coexister avec une perte silencieuse correspondante de l'inventaire après save/reload.

## Architecture de référence

- `MissionManager` : lifecycle, sélection missionnelle, shortlist/priorités, runnabilité et intentions de travel ;
- `MissionPlanner` : traduction des objectifs en actions/contraintes ;
- `BAC core + integration` : arbitrage comportemental, jamais second lifecycle ;
- `WorldEngine` : monde, transitions, autonomie exécutée, directive joueur, interaction physique ;
- `ObjectM0` : matching CUO, études dues, SAME-INSTANCE, fan-out ;
- `ActionBridge` : exécution d'action missionnelle réelle ;
- `BibleRuntime` : triggers, bindings, effets, gates, compteurs, sites ;
- `MissionMemory` : faits/lifecycles/sites/intention persistée ;
- `ProgressionRegistry` : stock physique/progression ;
- `MicroScenes` / `PersistentMicroScenes` : définition et identité persistante MSC ;
- `MapGenerator` / prescriptions Bible : génération et contraintes de map ;
- `WorldTopology` : graphe réel des maps ;
- `RuntimeBudget` : throttling adaptatif unique ;
- `SpecialObjectRuntime` : drones/balises/téléporteur ;
- UI : présentation et commandes, jamais propriétaire gameplay.

## Acquis historiques à préserver

- T01→T13 ;
- FLO-01→07 ; GEO-01→07 ; COL/ENV ; LOC-01→17 ;
- SUR et missions de site déjà intégrées ;
- GAME R1/R2, engineering/fire, civilization ;
- FAU et variantes répétables ;
- ENE + ENE-15-A/B/C ;
- BAL-01→03 ; DRN-01→05 ;
- ARCH-01→40 ; CONTACT-01→15 ; DIP-01→03 ;
- ANN-01→07 ;
- POSTDIP / TP-01→11 ; TP-AFTER-01→04 ;
- TERR-CARN-01→04 et TERR-STORM-01→04 ;
- Journal lazy/persistant ;
- SAME-INSTANCE et fan-out ;
- hydratation missionnelle différée au reload ;
- Recherche/Inventaire sans écran noir/superposition ;
- responsive mobile/tablette, safe areas, tactile et compatibilité desktop validés lors du chantier mobile ;
- profil mobile basé sur capacité tactile/coarse pointer, sans transformer un desktop redimensionné en profil mobile.

## État des chantiers ouverts au HEAD `d334ed2`

### P0 — Autorité missionnelle et fuite vers autonomie

**Ouvert / défaut HEAD démontré.** `MissionManager` dispose d'une autorité missionnelle plus large que la seule primaire, tandis que `WorldEngine.ensureActivity()` consulte encore l'autorité primaire. Il faut réparer sur les propriétaires existants, sans couche parallèle, et prouver en jeu :
- Top1 non-runnable → Top2/Top4 ou travel structuré ;
- aucune collecte/observation libre tant qu'un travail missionnel exécutable existe ;
- pas de churn de Top1 ;
- pas d'abandon d'objectif après échec d'une candidate.

### P0 — Pollution inter-mission des interactions

**Ouvert / défaut reproduit.** Une mission secondaire ne doit pas bloquer collect/extract d'une autre mission en injectant une observation qui ne peut pas être créditée. Réparer la frontière entre directive d'étude active, acquisition courante et fan-out passif.

### P0/P1 — Validation mission par mission

La fonctionnalité universelle n'est pas considérée prouvée par quelques tests génériques. Les missions touchées doivent être classées : `PASS E2E`, `PASS structurel`, `NON PROUVÉ`, `FAIL`, sur activation → cible → travel → action → événement → progression → completion → suite → reload → autorité.

### P1 — Transitions/identités restantes

Continuer les validations des missions à destination connue/MSC/contextes, notamment les familles qui ont historiquement perdu `persistentMicroSceneId`, activé sur MSC incomplète ou repris une mauvaise famille générique.

### P1 — Save / monde / assets

Revalider lorsqu'un chantier traverse ces domaines :
- inventaire versus progression missionnelle ;
- mapchange/reload ;
- identité MSC ;
- identité des images de map ;
- topologie et retour connu.

### P2 — Performance globale

Le profilage CPU global reste séparé des corrections fonctionnelles. Toute optimisation doit être mesurée sur déplacements et interactions ordinaires, pas uniquement sur un cas pathologique.

## Téléportation — acquis et continuité

Le contrat officiel post-arc reste `TP_AUTONOMY_CONTRACT_2026-09-14.md`.

- TP-01→11 et TP-AFTER-01→04 sont acquis ;
- après TP-AFTER-04 seulement, routage autonome TP opt-in ;
- `WorldEngine.findKnownRoute()` conserve sa sémantique physique historique ;
- `SpecialObjectRuntime.teleportTo()` reste l'unique primitive TP ;
- hub ASTROLOGY obligatoire ;
- aucune balise↔balise directe ;
- aucune génération/découverte synthétique.

## Continuité narrative

- EXP-LONG : maturation/expéditions longues, sans déclencher artificiellement la fin ;
- END-CHOICE : choix Rester / Trouver un moyen de rentrer ;
- FIN-01 : Temple, connaissances finales, Rocky/Translucides ;
- FIN-02 : Noyau de navigation résonante, capsule enfin potentiellement opérationnelle, départ/fondu/générique.

La capsule reste une épave avant FIN-02. La branche Rester laisse le monde ouvert.

## Discipline d'industrialisation

- HEAD exact avant chaque chantier ;
- préflight obligatoire ;
- BASE partielle exacte + CANDIDAT ;
- invariant gameplay comme unité de travail ;
- producteur → propriétaire → runtime → événement → consommateurs ;
- aucun correctif mission-ID spécifique si un patron générique existe ;
- aucune suppression de wrapper/couche sans inventaire des comportements transportés ;
- aucun polling/scheduler/cache global ajouté sans preuve ;
- mêmes tests BASE/CANDIDAT ;
- diff exact contre le HEAD de départ ;
- comparaison au parent Git réel au moment de l'application ;
- ZIP uniquement fichiers modifiés ;
- aucun PASS gameplay sans preuve observable.
