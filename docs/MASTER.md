# BLUEFOX ODYSSEY — MASTER

## État de référence

Dernière mise à jour : **16 septembre 2026**

### Version de travail
- HEAD moteur courant vérifié pour cette synchronisation : commit `3b01f2bf87ce0ffa5f2c385f21dce16866d6a518` — `CPU P3`.
- TP complet : `e76af8f6bfba8dd599912c50e50ce641338c5985`, puis continuité TP-AFTER et autonomie post-arc présentes au HEAD courant.
- CARN/STORM + correctif CUO Lab : `d521af2f3d6e5f221975d64729ec7eff8cc11606`, puis restauration de coexistence sur `bca4b01b…`.
- Checkpoint moteur R-HEALTH sain conservé : commit `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46` — `fix Save`.
- Le HEAD GitHub courant reste la seule base technique de reprise ; le checkpoint R-HEALTH sert de référence de santé, jamais de base de codage à la place du HEAD.
- Les recovery checkpoints existants restent historiques et ne priment pas sur le HEAD courant.
- `ROADMAP_TODO.md` reste la seule TODO active.
- La Bible documentaire est la source de contenu missionnel ; les coches moteur ne doivent refléter que les définitions réellement intégrées et validées.
- Le chantier de test TP est clos au 16 septembre 2026 ; TP-01→11 et TP-AFTER-01→04 sont des acquis à préserver.

## Gouvernance documentaire officielle

Les documents maintenus sont ceux désignés par `docs/README.txt`.

Règle de priorité :
1. décision utilisateur la plus récente ;
2. validation runtime / comportement observable ;
3. Contrat Gameplay Opérationnel V2 + addendum courant ;
4. MASTER / ARCHITECTURE / ROADMAP / DEV_HISTORIQUE ;
5. documents historiques.

Le code courant prouve le comportement actuel, pas à lui seul l'intention gameplay. Une attente historique peut devenir obsolète si une évolution plus récente a été validée comme nouvelle vérité moteur.

## Checkpoint R-HEALTH — 12 septembre 2026

Audit transversal réalisé sur `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46`.

Verdict : **base saine pour poursuivre l'industrialisation**.

Carte synthétique :
- **13 domaines VERT** ;
- **3 domaines VERT ÉVOLUÉ** ;
- **4 domaines ORANGE de validation incomplète** ;
- **0 domaine ROUGE systémique démontré**.

VERT ÉVOLUÉ signifie qu'un comportement actuel diverge d'une ancienne attente mais constitue désormais une vérité moteur cohérente et contractuelle. Ce statut ne doit pas être ramené artificiellement à une ancienne implémentation pour faire passer un test historique.

Domaines ORANGE à surveiller lors des chantiers concernés :
- parcours tutoriel T01→T13 complet de bout en bout ;
- génération/population maps et protections de contenu ;
- UI visuelle en conditions réelles ;
- audio / caméra / déplacement / physique en observation jeu.

### Nouvelle règle de lecture des tests

Le nombre brut de tests rouges n'est plus un indicateur suffisant de santé moteur.

Un test rouge préexistant doit être classé avant toute correction :
- dette de test / API ou fixture obsolète ;
- harness de test incomplet ;
- contrat historique remplacé par une vérité moteur plus récente ;
- panne runtime/gameplay réellement reproduite.

Une non-régression de ZIP doit prioritairement prouver :
1. préservation des capacités R-HEALTH du HEAD ;
2. absence de nouvelle panne gameplay démontrée ;
3. absence de nouveau nom d'échec pertinent ;
4. conformité au contrat actuel des propriétaires et consommateurs ;
5. coexistence avec le **parent Git réellement courant au moment de l'application**.

Le cas TP/CARN du 13 septembre 2026 constitue le garde-fou de référence : un ZIP techniquement correct contre son ancienne base peut devenir régressif si un autre chantier a été committé entre-temps. Le contrôle post-commit du SHA réel est donc obligatoire.

## Architecture de référence

Le registre détaillé des propriétaires est dans `ARCHITECTURE_TECHNIQUE.md`.

Principes majeurs :
- `MissionManager` : lifecycle + sélection canonique de l'action missionnelle ;
- BAC : arbitrage comportemental, jamais propriétaire parallèle du choix missionnel ;
- `WorldEngine` : monde, transitions, navigation et directive joueur persistante ;
- `MissionPlanner` : traduction des objectifs vers des actions et contraintes géographiques ;
- `ObjectM0` : matching CUO, même-instance, fan-out et critères missionnels génériques ;
- `BibleRuntime` : interprétation Bible, effets, gates, bindings, sites et compteurs sans posséder le lifecycle ;
- `ProgressionRegistry` : progression centrale et inventaires canoniques ;
- `MicroScenes` : identité et composition des micro-scènes ; les MSC custom restent des données ;
- `PersistentMicroScenes` : identité persistante des scènes/sites qui doivent survivre aux retours/reloads ;
- `RuntimeBudget` : unique propriétaire du throttling adaptatif ;
- `SpecialObjectRuntime` : runtime métier des drones, balises, téléporteur et objets spéciaux ;
- UI : jamais propriétaire du gameplay ;
- `map-registry.js` : protégé.

## Contrat gameplay durable

### Relation joueur / BlueFox
Le joueur exprime une intention ; BlueFox conserve une marge de décision sauf ordre explicitement prioritaire.

Suggestion de changement de map — règle B :
- mémorisée immédiatement ;
- n'interrompt pas l'action atomique en cours ;
- reprise après cette action avant une nouvelle décision missionnelle/BAC ;
- persistée au reload.

### Missions / runnabilité
- plusieurs missions actives peuvent progresser en parallèle ;
- une action réelle peut faire progresser plusieurs missions compatibles ;
- une mission active/primary peut être non-runnable localement sans être artificiellement terminée ;
- une contrainte géographique missionnelle peut produire une transition canonique via TRAVEL explicite, `requiredMapFact`, cible missionnelle mémorisée ou completion gate ;
- une transition connue mais inexécutable ne doit pas conserver une exclusivité qui immobilise BlueFox ;
- une opportunité secondaire locale peut être traitée avant un départ missionnel lorsqu'elle est réellement runnable, puis la transition primaire reprend ;
- une primaire stérile ne bloque pas les secondaires runnables ;
- les réveils de retry restent causaux ; aucun polling parallèle n'est ajouté ;
- une réévaluation causale ne révèle au maximum qu'une nouvelle mission.

### BAC / prérequis expérimentaux
Une expérimentation nécessaire à l'activation ou à la progression d'une mission peut être portée comme intention persistante et candidate pondérée du BAC.

Règles actuelles :
- le poids missionnel et l'axe thématique sont conservés ;
- le BAC reste souverain face aux autres candidats, notamment Survival ;
- une directive joueur persistante bloque la candidate expérimentale ;
- une mission primaire réellement runnable conserve son autorité ;
- si la prochaine étape expérimentale est distante, la navigation existante rejoint le site requis ;
- sans ressources suffisantes, aucune expérience fictive ni déplacement inutile n'est déclenché.

### CUO / relation trigger-cible
- observer / inspecter / analyser restent des nuances missionnelles d'une même étude physique lorsque le CUO le prévoit ;
- une acquisition missionnelle conserve la même instance après les études dues ;
- l'IMI distingue `REVEAL-ONLY`, `SAME-DEFINITION` et `SAME-INSTANCE` ;
- `object-m0-bridge.js` conserve le filtre historique `cuoType` et accepte aussi `cuoTypes` comme filtre OR optionnel, cumulatif avec les autres critères ;
- aucune migration automatique de vieux bindings n'est autorisée sans preuve runtime complète.

### Navigation et téléportation
Navigation ordinaire :
- trajet connu = déplacement physique ;
- destination inconnue = génération au passage réellement demandé ;
- absence de chemin = échec de navigation, pas marche infinie contre obstacle.

Téléportation :
- pendant TP-01→11 puis TP-AFTER-01→04, aucune autonomie TP anticipée n'est autorisée ;
- après `TP-AFTER-04.status === "completed"`, le réseau devient une infrastructure générale que l'autonomie peut exploiter **uniquement en opt-in** selon `TP_AUTONOMY_CONTRACT_2026-09-14.md` ;
- le BAC peut participer au choix de l'objectif/destination mais ne possède jamais le téléporteur et n'appelle pas directement `teleportTo()` ;
- `WorldEngine` reste propriétaire du calcul/exécution des itinéraires inter-map ;
- `SpecialObjectRuntime` reste propriétaire du réseau TP et de l'exécution réelle du transfert ;
- hub unique = `MSC-CUSTOM-ASTROLOGY` ;
- destinations = maps connues possédant une balise réellement déployée et persistante ;
- aucune liaison directe balise↔balise : le hub ASTROLOGY reste obligatoire ;
- BlueFox doit être près de la source ;
- refus pendant action/séquence non interruptible et refus du double transfert ;
- arrivée sur zone marchable sûre ; aucune création de map, découverte synthétique ou augmentation artificielle de l'exploration ;
- la transition reste canonique et publie `bluefox:map-transition-completed` ;
- TP-11 : calibration + matière inerte avant BlueFox, puis hub→balise→hub.

## Téléportation — acquis et continuité

### Acquis moteur
- POSTDIP / TP-01→09 déjà présents avant la passe finale ;
- TP-10 / TP-11 intégrées ;
- TP-AFTER-01→04 intégrées et clôturées comme arc d'appropriation ;
- ressources TP : 100 minerais, 50 composants, 20 cores, 100 fibres, 50 biocapital végétal exclusivement Thermosève/plantes fluorescentes, 10 accumulateurs, sous-assemblages issus des blueprints géographiques/fragmentation ;
- au moins 4 balises persistantes déployées requises et non consommées ;
- ASTROLOGY conserve ses arches visuelles mais leurs colliders sont neutralisés **uniquement dans cette MSC** ;
- l'autorité des étapes runtime TP est protégée contre un fallback RESEARCH générique du Planner ;
- après TP-AFTER-04, le routage autonome TP opt-in est autorisé conformément au contrat dédié ;
- chantier de test TP clos au 16/09/2026 : aucune validation TP dédiée ne reste ouverte hors non-régression future lorsqu'un chantier traverse ce périmètre.

### Continuité documentaire encore ouverte
- `EXP-LONG` : expéditions lointaines et maturation du parcours sans déclencher artificiellement la fin ;
- `END-CHOICE — Là où je suis arrivé` : choix Rester / Trouver un moyen de rentrer ;
- `FIN-01 — Ce qu'ils m'ont appris` : Temple + connaissances finales + adieux Rocky/Translucides ;
- `FIN-02 — Le point de départ` : Noyau de navigation résonante, capsule enfin potentiellement opérationnelle, départ/fondu/générique.

La capsule ne doit jamais être considérée comme déjà réparée avant FIN-02. Sa remise en fonctionnement est la synthèse finale des connaissances accumulées, pas une simple recette disponible depuis le début.

La branche **Rester** ne ferme pas le monde : elle mémorise le choix et laisse l'exploration ouverte.

## Missions OPPORTUNITÉS / MSC

Le chantier OPPORTUNITÉS devient un axe officiel d'industrialisation.

Principes :
- une mission OPP ne génère pas une map pour se satisfaire ;
- la MSC qualifiante doit exister réellement via la génération/peuplement normaux ;
- l'opportunité peut alors devenir disponible à l'entrée/découverte locale ;
- poids fort possible, mais sans écraser directive joueur persistante ni primaire réellement runnable ;
- après traitement, reprise de la transition principale ;
- aucune couche de scheduler missionnel parallèle ;
- les MSC déjà affectées à des missions protégées ne sont pas réutilisées ;
- les retours d'une mini-série ciblent la même map et la même instance persistante ;
- Orchidée et `MSC-ABANDONED-DRONE-001` sont destinées à des mini-suites approfondies, avec mémoire/obsession/souvenir positif possibles ;
- apparitions PNJ/faune restent sous leurs propriétaires existants.

CARN/STORM constituent la première branche dangereuse opportuniste industrialisée :
- quatre occurrences par phénomène ;
- progression exposition → apprentissage → prudence → maîtrise ;
- déclenchements distincts `1→2→3→4` avec `uniqueOnly` ;
- ciblage d'observation réel ;
- poids renforcé sur trajets missionnels longs ;
- reprise du trajet après traitement.

## Sauvegarde / persistance

La sauvegarde doit préserver :
- missions, lifecycles et faits ;
- exploration et topologie ;
- MSC/sites persistants ;
- recettes/research unlocks ;
- ration et compteurs de craft ;
- directive joueur persistante ;
- constructions placées ;
- état du réseau drone/balise/téléporteur lorsqu'il est porté par ses propriétaires canoniques ;
- briques du Journal déjà consolidées.

Les états différés doivent être flushés avant snapshot.

Depuis le checkpoint `560249…`, MissionManager protège aussi l'hydratation différée d'une sauvegarde : si une mission sauvegardée est connue dans l'état mais que sa définition n'est pas encore chargée, la restauration attend la disponibilité de la définition au lieu d'écraser prématurément l'état sauvegardé.

Aucune propagation ou migration artificielle rejetée par le runtime ne doit être réintroduite.

## Industrialisation missionnelle acquise

Lots intégrés et à préserver :
- T01→T13 ;
- FLO-01→07 ;
- GEO-01→07 ;
- paliers COL et missions ENV ;
- LOC-01→17 ;
- SUR-01/02/03/05/06/07 + SURPLUS et missions de site associées ;
- GAME R1/R2 et missions GAME complémentaires ;
- GAME-civilization_1→5 ;
- FAU-01→12 + templates répétables par espèce `FAU-01A`, `FAU-03A`, `FAU-05A`, `FAU-11A` ;
- ENE-01→14 + sous-branche ENE-15-A/B/C ;
- GAME-engineering_1→6 et GAME-fire ;
- chaîne balise `BAL-01→03` ;
- chaîne drones `DRN-01→05` ;
- ARCH-01→40 ;
- CONTACT-01→15 ;
- DIP-01→03 ;
- chaîne GAME contact : `GAME-contact_first`, `GAME-contact_cautious`, `GAME-contact_ambassador` ;
- ANN-01→07 ;
- POSTDIP / TP-01→11 ;
- TP-AFTER-01→04 ;
- TERR-CARN-01→04 ;
- TERR-STORM-01→04.

Les projets documentaires sans définition moteur — notamment EXP-LONG, END/FIN et le lot OPP restant — restent volontairement sans statut moteur validé.

## Lot ANN — contrat acquis

Commit de référence historique : `ca619120c502ff6b122d69ad3ed15d0e8dc8a1d0` — `ANN 01-07`.

Acquis à préserver :
- ANN-04 s'ouvre après T13 sur une nouvelle map Ouest et réutilise les phénomènes météo existants ;
- ANN-06 établit un **Camp** réel via le mécanisme générique de site/placement joueur, avec `MSC-CUSTOM-SMART-CAMP`, coût 10 bois + 10 fibres et distance strictement >10 maps du Camp/Refuge/Base le plus proche ;
- `MSC-NOCTURNAL-DEN-001` reste un contexte faune distinct du Camp ;
- ANN-03 utilise l'épave réelle et ses composants physiques ;
- ANN-02 collecte 25 Thermosèves puis consomme réellement 6 plantes + 2 minerais connus ;
- ANN-05 analyse 3 types minéraux, collecte 4 de chacun et consomme réellement les 12 échantillons ;
- ANN-01 utilise 10 % → 25 % → 60 % d'exploration réelle avant observation du relais ;
- ANN-07 consomme l'historique réel `OBJECT_SEEN` / `observations.historical` pour la faune nocturne ;
- aucune couche ANN parallèle n'a été créée.

## Relations / civilisations

Le moteur relationnel comprend :
- réactions NPC à l'approche ;
- fuite canonique lors d'une fermeture intrusive ;
- comportement prudent après approche stable ;
- protection d'un dialogue/contact déjà engagé ;
- réputation ;
- commerce consommant le stock physique ;
- déblocage de connaissances et blueprints par les propriétaires existants.

CONTACT/DIP restent les couches missionnelles consommatrices, pas les propriétaires du comportement NPC.

FIN-01 devra réutiliser réellement les acquis des Rocky et des Translucides ; leur rôle final ne doit pas être remplacé par un simple flag abstrait.

## Énergie / balise / drones

### ENE
La chaîne énergétique présente au catalogue va de ENE-01 à ENE-14, puis se prolonge par `ENE-15-A`, `ENE-15-B`, `ENE-15-C`.

### Balise et drones
- la balise déployée appartient au runtime d'objets spéciaux existant ;
- le Kit d'expédition sait transporter les objets concernés sans devenir leur propriétaire métier ;
- `BAL-01→03` formalise analyse, fabrication/déploiement et usage de la balise ;
- `DRN-01→05` couvre Scout/Harvest, récolte distante, réseau et dépannage terrain ;
- les observations du Scout utilisent le chemin canonique `OBJECT_SEEN`.

Les balises servent désormais aussi de destinations TP lorsqu'elles sont réellement déployées et persistantes ; cette extension ne transfère pas leur propriété à l'UI ou au catalogue missionnel.

## Journal évolutif

Le Journal est lazy et persistant :
- consolidation à l'ouverture uniquement ;
- aucune consolidation due aux seules mutations DOM ;
- briques persistantes ;
- branche inchangée stable ;
- enrichissement uniquement après évolution significative ;
- aucun polling.

TP-AFTER est clos et ses enrichissements doivent rester dans les branches existantes. OPP et END/FIN devront également enrichir les branches existantes plutôt que créer un second Journal.

## Continuité

- `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46` reste le **checkpoint moteur R-HEALTH sain** ;
- `3b01f2bf87ce0ffa5f2c385f21dce16866d6a518` est le **HEAD moteur vérifié de cette synchronisation documentaire** ;
- TP et TP-AFTER sont clos ; prochaine continuité principale ouverte : EXP-LONG → END-CHOICE/FIN ;
- chantier parallèle officiel : missions OPPORTUNITÉS / MSC remarquables ;
- aucun chantier général de réparation moteur n'est ouvert ;
- les quatre domaines ORANGE restent des zones de validation à compléter lorsqu'un chantier les traverse.

## Discipline d'industrialisation

- données/contrats plutôt que branches par ID ;
- propriétaires existants plutôt que bridges ;
- réutiliser les MSC/CUO existants avant création nouvelle ;
- une nouvelle MSC composite reste une donnée si le moteur sait déjà l'instancier comme une scène unique ;
- protéger les MSC déjà missionnées contre une réutilisation opportuniste non validée ;
- tests de réfutation et consommateurs réels avant PASS ;
- BASE partielle exacte limitée au périmètre : ne jamais reconstruire le dépôt complet ;
- contrôler le parent Git courant avant application d'un ZIP ;
- un test historique rouge n'autorise une correction moteur qu'après reproduction d'une panne actuelle ou violation d'un contrat encore valide.
