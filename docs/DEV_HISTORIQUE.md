# BLUEFOX ODYSSEY — DEV HISTORIQUE

## Session des 13–14 septembre 2026 — CARN/STORM, Téléportation, réconciliation inter-chantiers et continuité documentaire

### Base finale vérifiée
- CARN/STORM + CUO Lab : `d521af2f3d6e5f221975d64729ec7eff8cc11606` — `CARN/STORM + CUO-lab fix`.
- Téléportation complète : `e76af8f6bfba8dd599912c50e50ce641338c5985` — `TP complet`.
- Réconciliation finale : `bca4b01b8606b630b8ccbae7e5bd3356d3ac0c31` — `restaure CARN/STORM`.
- Checkpoint de santé toujours applicable : `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46` — `fix Save`.

### CARN/STORM
Les anciennes intentions TERR ont été abandonnées au profit de deux rencontres dangereuses opportunistes :
- `TERR-CARN-01→04` ;
- `TERR-STORM-01→04`.

Progression retenue :
1. approche/exposition trop directe avec conséquence forte ;
2. récidive moins exposée et souvenir négatif ;
3. observation prudente, notamment sous contrainte d'énergie ;
4. observation brève et maîtrisée, sans exposition prolongée.

Contrat technique :
- occurrences MSC 1→2→3→4 avec `uniqueOnly` ;
- objectifs d'observation réellement ciblés ;
- opportunité fortement pondérée à l'entrée lorsqu'elle est présente ;
- poids renforcé sur trajets missionnels longs ;
- reprise du trajet principal après traitement ;
- aucune nouvelle couche de scheduler.

Le correctif CUO Lab associé rend la fenêtre de test des mouvements PNJ fermable et ne l'affiche que lorsqu'un PNJ est sélectionné.

### Téléportation TP-10 / TP-11
TP-10 et TP-11 ont été intégrées au moteur avec les contraintes suivantes :
- hub unique `MSC-CUSTOM-ASTROLOGY` ;
- ASTROLOGY ancrée comme site TP réel ;
- arches d'ASTROLOGY traversables uniquement dans cette MSC ;
- au moins 4 balises persistantes déployées, non consommées ;
- destinations = maps connues possédant une balise réellement déployée ;
- hub↔balise uniquement, aucun beacon↔beacon ;
- téléportation initiée par le joueur uniquement ;
- calibration + transfert de matière inerte avant BlueFox ;
- trajet BlueFox hub→balise puis balise→hub ;
- aucun gain synthétique d'exploration ni génération de map ;
- arrivée sûre sur zone marchable ;
- transition canonique et restauration de l'état/caméra/contrôles.

Ressources confirmées :
- 100 minerais ;
- 50 composants ;
- 20 cores ;
- 100 fibres ;
- 50 biocapital végétal exclusivement Thermosève + plantes fluorescentes ;
- 10 accumulateurs ;
- sous-assemblages issus des blueprints déjà acquis.

Un défaut d'autorité missionnelle détecté lors de la validation a été corrigé : les étapes runtime spécialisées TP ne peuvent plus être complétées par un fallback RESEARCH générique du Planner.

### Régression inter-chantier et règle de livraison
Le commit TP a été construit initialement contre une base antérieure à CARN/STORM. Après commit sur le parent réel `d521af2f…`, `data/bible-catalog.js` avait réécrasé les huit définitions CARN/STORM.

Le SHA `e76af8f6…` a donc été refusé en non-régression inter-chantier malgré la validité intrinsèque du lot TP.

Le correctif `bca4b01b…` restaure les huit missions CARN/STORM sans retirer TP-10/11. Cette séquence établit un garde-fou durable :
- un ZIP validé contre sa base de fabrication n'est pas automatiquement committable si le parent Git a changé ;
- avant commit/finalisation, comparer le candidat au **parent réel courant** ;
- après commit, contrôler le SHA final et la coexistence des chantiers qui partagent des fichiers.

### Continuité post-TP documentée
Le chantier Téléportation ne se termine pas avec TP-11.

Séquence restant à industrialiser :
- `TP-AFTER-01 — Le monde paraît plus petit` ;
- `TP-AFTER-02 — Le chemin du retour` ;
- `TP-AFTER-03 — Cela peut servir à autre chose` ;
- `TP-AFTER-04 — Et maintenant ?`.

Fonction : appropriation réelle du téléporteur, puis baisse forte du poids/obsession Téléportation afin que le BAC réarbitre les autres axes.

Le téléporteur devient ensuite une infrastructure transversale, jamais une branche dominante ni un automatisme BAC.

### EXP-LONG / maturation
Un bloc d'expéditions lointaines doit laisser le monde continuer à vivre après TP :
- utilisation du réseau pour faciliter les expéditions et retours ;
- reprise des branches scientifique, environnementale, archéologique et relationnelle encore ouvertes ;
- pas de déclenchement de fin automatique par simple possession du TP.

### END-CHOICE / FIN
La fin prévue reste :
- retour au Camp / lieu de départ ;
- `END-CHOICE — Là où je suis arrivé` ;
- choix **Rester** ou **Trouver un moyen de rentrer**.

Branche Rester :
- choix mémorisé ;
- pas de générique imposé ;
- monde ouvert poursuivable.

Branche retour :
- `FIN-01 — Ce qu'ils m'ont appris` : passage par le Temple, finalisation de la connaissance, adieux Rocky/Translucides ;
- `FIN-02 — Le point de départ` : retour capsule, intégration du **Noyau de navigation résonante**, capsule enfin potentiellement opérationnelle, entrée de BlueFox, fondu noir, générique.

La capsule n'est pas rétroactivement considérée comme réparée avant cette phase. La réparation finale est l'aboutissement des connaissances acquises pendant l'aventure, pas une nouvelle grosse boucle de grind.

### Chantier missions OPPORTUNITÉS
Le lot OPPORTUNITÉS MSC est désormais un chantier officiel de la TODO.

Principes validés :
- pas de map générée par une mission OPP ;
- MSC d'abord produite par la génération/peuplement normal ;
- opportunité disponible à l'entrée/découverte si la MSC qualifiante est réellement présente ;
- forte pondération possible sans écraser directive joueur ou primaire runnable ;
- reprise du trajet principal après opportunité ;
- pas de scheduler parallèle ;
- MSC déjà missionnées/protégées non réutilisées ;
- retours de mini-séries sur la même map + même instance persistante ;
- Orchidée et `MSC-ABANDONED-DRONE-001` destinées à des mini-suites approfondies ;
- apparitions PNJ/faune réutilisent les propriétaires existants ;
- `lowMissionProgress` ne doit pas rendre les opportunités structurellement impossibles à faire apparaître.

CARN/STORM servent de première référence industrialisée de rencontre opportuniste dangereuse.

---

## Session du 13 septembre 2026 — ANN-01→07 / synchronisation exhaustive Bible

### Base et commit validé
- Parent technique : `9034f1bb86c78a8b42bbf4e83a0db212feb80260` — `SUR-07`.
- Commit validé : `ca619120c502ff6b122d69ad3ed15d0e8dc8a1d0` — `ANN 01-07`.
- Le commit est directement au-dessus du parent attendu et contient uniquement le lot ANN validé.

### Chaîne ANN industrialisée
Ordre canonique : `ANN-04 → ANN-06 → ANN-03 → ANN-02 → ANN-05 → ANN-01 → ANN-07`.

Acquis à préserver :
- ANN-04 : après T13, nouvelle map Ouest, observation réelle d'une tempête et d'une nappe de brume puis synthèse climatique ;
- ANN-06 : Camp logistique réel via `site.establish(kind:"camp")`, `MSC-CUSTOM-SMART-CAMP`, placement manuel joueur, coût 10 bois + 10 fibres, distance strictement >10 maps du Camp/Refuge/Base le plus proche ;
- `MSC-NOCTURNAL-DEN-001` reste un contexte faune distinct du Camp ;
- ANN-03 : épave réelle `MSC-CUSTOM-EPAVE-1DRONE`, étude d'éléments technologiques distincts puis récupération physique d'un composant ;
- ANN-02 : 25 Thermosèves puis expérimentation consommant réellement 6 Thermosèves + 2 minerais connus ;
- ANN-05 : trois types de minerais, quatre échantillons de chaque, consommation réelle des 12 ;
- ANN-01 : suppression de l'ancienne valeur `signal_strength = 44`, remplacée par 10 % → 25 % → 60 % d'exploration réelle avant l'approche de `MSC-TECH-RELAY-001`, puis trois observations et collecte d'un composant ;
- ANN-07 : historique réel `observations.historical` de `nocturnal_animal`, aucune réobservation artificielle, fallback optionnel jusqu'à trois nouvelles maps et entrée Journal Faune/Nature.

Les bulles BlueFox des sept missions ont été réécrites pour être spécifiques au vécu et aux étapes réellement franchies.

### Propriétaires / extensions
- aucune couche ou runtime ANN parallèle ;
- catalogue missionnel dans `data/bible-catalog.js` ;
- SMART-CAMP ajouté aux données MSC custom ;
- BibleRuntime reçoit uniquement l'extension générique nécessaire à la contrainte de distance au site le plus proche ;
- topologie existante `currentEngine.worldTopology.coordinateOf()` réutilisée ;
- consommations via les propriétaires d'inventaire existants ;
- historique faune via les compteurs canoniques existants.

### Validation du commit
Le SHA `ca619120…` a été vérifié après commit :
- parent exact `9034f1bb…` ;
- un seul commit ;
- cinq fichiers, exactement ceux du ZIP validé ;
- blobs Git 5/5 identiques aux fichiers livrés ;
- aucun fichier parasite ou modification hors périmètre détecté.

### Synchronisation Bible / catalogue
Confrontation exhaustive de la Bible documentaire au catalogue moteur du HEAD : **255 définitions moteur / 255 représentées / 255 cochées**.

Missions moteur qui étaient absentes de la Bible et sont désormais ajoutées :
- `GAME-civilization_1→5` ;
- `CONTACT-10→15` ;
- `FAU-01A`, `FAU-03A`, `FAU-05A`, `FAU-11A`.

Sous-missions présentes mais non cochées avant synchronisation : `ENE-15-A`, `ENE-15-B`, `ENE-15-C`.

Les projets documentaires sans définition moteur restent sans coche.

---

## Session du 12 septembre 2026 — R-HEALTH / assainissement de la lecture du HEAD

### Base auditée
- HEAD moteur : `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46`
- Commit : `fix Save`
- Le HEAD GitHub courant reste la seule base technique.
- Cette mise à jour documentaire ne modifie aucun fichier moteur.

### Objet de la passe

Après plusieurs campagnes de validation montrant plusieurs dizaines de tests rouges préexistants, l'objectif a été déplacé du simple comptage des échecs vers un audit de **santé fonctionnelle** :
- capacités préservées ;
- propriétaires encore cohérents ;
- propagation vers consommateurs ;
- nouvelles vérités moteur apparues pendant l'industrialisation ;
- distinction entre dette de tests et panne gameplay réelle.

### Verdict R-HEALTH

Résultat synthétique :
- 13 domaines **VERT** ;
- 3 domaines **VERT ÉVOLUÉ** ;
- 4 domaines **ORANGE** de validation incomplète ;
- 0 domaine **ROUGE systémique démontré**.

Conclusion : `560249…` est retenu comme **checkpoint moteur sain pour poursuivre l'industrialisation**.

Les domaines ORANGE ne sont pas déclarés cassés :
- parcours tutoriel T01→T13 complet ;
- génération/population maps et protections ;
- UI visuelle réelle ;
- audio/caméra/déplacement/physique.

### Nouvelle doctrine de validation

Le nombre brut de tests rouges n'est plus utilisé comme mesure directe de santé du moteur.

Avant toute correction liée à un test préexistant, distinguer :
1. test/API/fixture obsolète ;
2. harness incomplet ;
3. contrat historique remplacé par une évolution validée ;
4. panne runtime/gameplay actuelle réellement reproduite.

Une correction moteur n'est justifiée que par une panne actuelle ou la violation d'un contrat encore valide.

La barrière de non-régression des futurs ZIP devient prioritairement :
- préservation des capacités R-HEALTH ;
- absence de nouvelle panne gameplay ;
- absence de nouveau nom d'échec pertinent ;
- conformité aux propriétaires et consommateurs actuels.

### Capacités confirmées pendant R-HEALTH

#### ObjectM0 / SAME-INSTANCE / fan-out
- ObjectM0 reste propriétaire du matching missionnel ;
- les études dues puis l'acquisition conservent la même instance ;
- le fan-out vers plusieurs missions compatibles est conservé ;
- les relations trigger-cible IMI restent à préserver.

#### BAC / expérimentation
Le modèle actuel est désormais :
`mission bloquée par prérequis expérimental → intention persistante → candidate BAC pondérée → arbitrage → exécution quand réellement disponible`.

Conséquences :
- directive joueur persistante prioritaire ;
- primaire réellement runnable prioritaire ;
- Survival peut gagner l'arbitrage ;
- navigation existante utilisée pour rejoindre un site expérimental distant ;
- aucune expérience fictive si ressources absentes.

Un ancien test exigeant une exécution expérimentale directe peut donc être rouge sans régression moteur.

#### R-STAB
Les décisions précédemment validées restent compatibles avec le HEAD :
- active/primary ≠ nécessairement runnable localement ;
- primaire stérile non exclusive ;
- transition connue inexécutable ne bloque pas BlueFox ;
- secondaire locale runnable peut précéder un départ ;
- retry causal sans polling.

#### Relations / civilisations
Le runtime relationnel comprend désormais :
- approche intrusive pouvant provoquer une fuite ;
- approche lente/stable permettant un comportement prudent ;
- dialogue actif protégé contre fuite concurrente ;
- réputation ;
- commerce consommant le stock physique ;
- déblocages de connaissances/blueprints réels.

Le raccord CONTACT-10→CONTACT-11 reste un défaut local connu à traiter dans le lot missionnel prévu, et non une panne systémique du système relationnel.

#### Journal
Le contrat lazy/persistant reste valide :
- aucune consolidation au scan initial ou à la simple mutation DOM ;
- une consolidation à l'ouverture ;
- pas de reconsolidation pendant la même ouverture ;
- nouvelle consolidation possible à la réouverture ;
- aucun polling.

#### Save / hydratation
Le commit `560249…` ajoute une protection de restauration missionnelle :
- une mission sauvegardée dont la définition n'est pas encore chargée n'est plus écrasée prématurément ;
- MissionManager conserve la responsabilité de l'hydratation ;
- la reprise attend la disponibilité de la définition ;
- aucun moteur parallèle de sauvegarde missionnelle n'est créé.

### État de l'industrialisation visible au HEAD

Les documents précédents étaient devenus en retard. Le HEAD audité contient déjà notamment :
- ARCH-01→40 ;
- CONTACT-01→15 ;
- DIP-01→03 ;
- `GAME_CONTACT_FIRST`, `GAME_CONTACT_CAUTIOUS`, `GAME_CONTACT_AMBASSADOR` ;
- ENE-15.

Les anciennes TODO « reprendre à ARCH-30 » et « intégrer ENE-15 » sont donc closes comme objectifs futurs.

### Continuité après interruption

- aucun chantier général de réparation moteur ouvert ;
- prochaine reprise : choisir le prochain lot réellement restant dans la Bible/roadmap ;
- confronter ce lot au HEAD courant et aux propriétaires existants ;
- compléter les domaines ORANGE uniquement lorsqu'un chantier traverse leur périmètre ;
- ne pas réparer le moteur pour satisfaire artificiellement des tests historiques devenus faux.

---

## Sessions du 8 au 11 septembre 2026 — ENE, balise/drones, stabilité, Journal et ARCH-01→29

### Base finale de référence historique
- HEAD validé pour ARCH-R4 : `296c048c0846198bf6326924ea4d3a9483907f68`
- Parent : `017d646f6e861840b22a63a0a39e69aa231d5b7c` — `ARCH 13-18`
- Commit : `/!\ ARCH R4 19-29     /!\ INDEX.HTML`
- Cette section est historique ; le checkpoint actuel est désormais `560249…`.

### ENE-11→14
Commit structurant : `14304c3b00e423df6ba5165b8efc1b91e27eccbf` — `ENE 11-14`.

Acquis :
- ENE-11 : prototype d'accumulateur à l'établi, consommation réelle, recette série ;
- ENE-12 : machine abandonnée, approche puis consommation d'un accumulateur ;
- ENE-13 : Scout existant, accumulateur et balayage current-map ;
- ENE-14 : mesures multi-map, calibration Giant Tree, synthèse Recherche.

### Balise et drones
Commits structurants :
- `4a13bfd4873d27d2e88c9909f6df8531b8ad1c19` — `R2 drone/balise`
- `a9c8e6cbcc8e4ebce33b91fb2a103755c4c53008` — `R3 Drones`
- `49aaf067dcf719fd9f2cd1b9cc6d53e00c980f8e` — `drone repair`
- `f88c222b81220bf1bc19691e3f4df4e76f4daad0` — `Drone repair Fix`

Acquis durables :
- BAL-01→03 ;
- balise déployée portée par le runtime d'objets spéciaux ;
- Kit étendu aux objets transportables concernés sans en devenir propriétaire ;
- DRN-01→04 : Blueprints Scout/Harvest, Harvest distant, priorité, cargo et console Recherche ;
- observation Scout vers historique `OBJECT_SEEN`, sans fan-out missionnel ordinaire implicite.

### Missions GAME complémentaires
Commit `b0479c367e43c3d3e21c8cbfd259b4cd9ebcd82d` — `Game missions+5`.

Ajouts :
- `GAME-collection_samples`
- `GAME-collection_variety`
- `GAME-travel_biomes`
- `GAME-travel_short`
- `GAME-travel_long`

Le runtime a été ajusté pour les activations composites : un trigger ponctuel acquis avant un prérequis lifecycle peut être conservé, tandis que les compteurs multi-événements ne doivent pas être crédités prématurément.

### Stabilité missionnelle R-STAB
Commit `5d83253520e6d4bc07a988214a4d1d2b45eb7589` — `Stabilité - mission runable`.

Décisions validées :
- active/primary ≠ forcément runnable localement ;
- `requiredMapFact` hors-map ne doit pas produire de fausse action ;
- généralisation de `missionTransitionIntent` aux contraintes géographiques missionnelles ;
- secondaire locale perdable : départ différé possible ;
- secondaire terminée/non-runnable : reprise de la transition primaire ;
- transition connue sans route exécutable : pas d'exclusivité stérile ;
- completion gate géographique peut fournir une cible de transition ;
- retry idle réveillable causalement ;
- pas de polling ajouté.

### Journal lazy/persistant
Commit `3000d85dc2a0ea595ddecd1f087d97b621880efe` — `Journal persistant`.

Décisions :
- consolidation uniquement à l'ouverture du Journal ;
- aucune consolidation répétée par scan/mutation DOM ;
- briques persistantes ;
- branche inchangée stable ;
- enrichissement seulement lors d'évolutions significatives ;
- aucun polling.

### ARCH-R1 — ARCH-01→06
Commit `0c15b6c36ef1b657f278505d22d6b5e7a3dbcecf`.

Première passe archéologique ; contextes MSC, observations distinctes et SAME-INSTANCE lorsque requis.

### ARCH-R2 — ARCH-07→12
Commit `a79f8ad5129bcc285cd31e8f1c0f51a5ef7cba05`.

Sites, ruines, strates, carrière et habitat, majoritairement data-only.

### ARCH-R3 — ARCH-13→18
Commit `017d646f6e861840b22a63a0a39e69aa231d5b7c`.

Ajout moteur unique et chirurgical :
- filtre `cuoTypes` OR dans ObjectM0 ;
- `cuoType` historique préservé ;
- autres filtres cumulatifs préservés ;
- ARCH-16 : 18 observations post-activation sur `arch`, `stele`, `tech_relic`, avec au moins une occurrence de chaque catégorie.

### ARCH-R4 — ARCH-19→29
Commit `296c048c0846198bf6326924ea4d3a9483907f68`.

Arbitrages principaux :
- ARCH-19 : machine abandonnée = arme narrative, observation simple ;
- ARCH-20 : nouveau voyage autonome vers la MSC relique pour fermer la runnabilité géographique ;
- ARCH-24 : 15 acquisitions de composants/Core ;
- ARCH-25 : deux nouvelles maps, puis 50 % de la seconde ;
- ARCH-27 : deux objets distincts dans la même MSC foyer ;
- ARCH-29 : cinq unités d'habitation réellement garanties sur trois nouvelles maps.

ARCH-29 :
- les quatre premières unités sont quatre MSC composites distinctes ;
- chaque composite fusionne des briques de ruines existantes dans une **seule identité MSC** ;
- une composition = un objectif ;
- la cinquième unité est `MSC-CUSTOM-HABITAT-RUINE` seule, volontairement gardée pour la fin ;
- aucune généralisation moteur de regroupement de MSC.

---

## Historique durable antérieur

### 3 au 8 septembre 2026 — industrialisation massive / Civilisation / Engineering / Workbench
- FLO et réordonnancement de chaîne ;
- GEO-01→07 ;
- COL puis ENV ;
- LOC ;
- SUR et passes anti-régression ;
- GAME R1/R2 ;
- FAUNA ;
- ENE-01→10 ;
- GAME Civilisation / Engineering / Workbench.
- `ProgressionRegistry.grantInventory()` permet un crédit physique sans faux `RESOURCE_COLLECTED`.
- GAME-base reflète le stock physique courant pour les slots stock-backed.
- GAME-fire répétable : 8 bois.
- WORKBENCH sur Crystal : placement joueur, anchor/rotation persistés.

### 2 septembre 2026 — Shelter / Base renforcée
- Camp `MSC-CUSTOM-CAMP`.
- Refuge `MSC-CUSTOM-CAMP-BASE`.
- Base renforcée `MSC-CUSTOM-CAMP-BASE-REINFORCED`.
- Base : 500 fibres + 500 ressources minéral/cristal + 100 études rocheuses.
- spawn avant consommation ; effets idempotents.
- au succès Base, retrait du Refuge autonome précédent, Camp conservé.
- pas de migration automatique de sauvegarde.

### 30 août 2026 — UI / CPU / Survival
- Recherche fenêtrée.
- correction superposition Recherche/Inventaire et écran noir.
- Kit : position ouverte/fermée persistée.
- RuntimeBudget reste l'unique système de throttling.
- Survival conserve rest / food / safety séparés.

### 31 août → 1 septembre 2026 — IMI
Relations durables :
- `REVEAL-ONLY`
- `SAME-DEFINITION`
- `SAME-INSTANCE`

Cycle de preuve à préserver :
`chargement → MissionManager → Planner → ObjectM0 → ActionBridge → interaction → progression`.

### 28 août 2026 — propriétaires
- MissionManager possède le choix missionnel.
- BAC ne le remplace pas.
- BibleRuntime n'écrit pas le lifecycle.
- WorldEngine porte la directive joueur.
- PathPlanner ne force pas une cible directe sans chemin.
- sauvegarde après flush des mémoires différées.

### 23 août 2026 — interaction multi-étapes
- 0..N études dues avant acquisition ;
- acquisition sur la même instance ;
- fan-out conservé ;
- unicité nœud × instance.

### Discipline durable
- HEAD courant seul référentiel technique ;
- BASE partielle exacte ;
- pas de reconstruction du dépôt complet ;
- pas de bridge/propriétaire parallèle ;
- `map-registry.js` protégé ;
- comparaison HEAD/CANDIDAT avant livraison ;
- PASS gameplay uniquement après preuve correspondante.
