# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **16 septembre 2026**

Cette page est la **seule TODO active**.

## Base courante

- [x] Checkpoint moteur R-HEALTH audité : `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46` — `fix Save`.
- [x] HEAD moteur vérifié pour la présente synchronisation : `3b01f2bf87ce0ffa5f2c385f21dce16866d6a518` — `CPU P3`.
- [x] TP complet intégré au commit `e76af8f6bfba8dd599912c50e50ce641338c5985`, réconcilié avec CARN/STORM sur `bca4b01b…`, puis prolongé par TP-AFTER et l'autonomie post-arc au HEAD courant.
- [x] CARN/STORM + correctif CUO Lab intégrés au commit `d521af2f3d6e5f221975d64729ec7eff8cc11606` ; coexistence catalogue restaurée sur `bca4b01b…`.
- [x] HEAD GitHub courant = seule base technique ; le checkpoint R-HEALTH reste une référence de santé, pas une base alternative.
- [x] MissionManager reste propriétaire du lifecycle et du choix missionnel.
- [x] BibleRuntime reste propriétaire des effets/gates/sites sans reprendre le lifecycle.
- [x] BAC reste arbitre comportemental.
- [x] WorldEngine reste propriétaire monde/navigation/directive joueur.
- [x] ProgressionRegistry reste propriétaire du stock physique.
- [x] RuntimeBudget reste l'unique throttling adaptatif.
- [x] `map-registry.js` reste protégé.
- [x] R-HEALTH : 13 VERT + 3 VERT ÉVOLUÉ + 4 ORANGE + 0 ROUGE systémique démontré.

## Acquis désormais clôturés / à préserver

- [x] FLO-01→07.
- [x] GEO-01→07.
- [x] COL + ENV.
- [x] LOC-01→17.
- [x] SUR-01/02/03/05/06/07 + SURPLUS.
- [x] GAME R1/R2.
- [x] GAME-civilization_1→5.
- [x] FAU-01→12 + extensions FAUNA validées.
- [x] Templates FAUNA répétables par espèce : FAU-01A / FAU-03A / FAU-05A / FAU-11A.
- [x] ENE-01→14 + ENE-15-A/B/C.
- [x] GAME-engineering_1→6 + GAME-fire.
- [x] Réserve abandonnée + `grantInventory()` sans faux historique COL.
- [x] WORKBENCH sur Crystal et placement joueur persistant.
- [x] BAL-01→03.
- [x] DRN-01→05.
- [x] `GAME-collection_samples`, `GAME-collection_variety`, `GAME-collection_reserves`, `GAME-exploration_cartographer`, `GAME-exploration_complete`, `GAME-travel_biomes`, `GAME-exploration_total`, `GAME-exploration_total_20`, `GAME-travel_short`, `GAME-travel_long`.
- [x] Fauna réputation répétable.
- [x] R-STAB : runnabilité missionnelle, transitions géographiques, libération des primaires stériles, retry causal.
- [x] Journal lazy/persistant : consolidation à l'ouverture uniquement, sans polling.
- [x] ARCH-01→40 présentes au HEAD.
- [x] CONTACT-01→15 présentes au HEAD.
- [x] DIP-01→03 présentes au HEAD.
- [x] `GAME-contact_first`, `GAME-contact_cautious`, `GAME-contact_ambassador`.
- [x] ANN-01→07 industrialisées ; chaîne canonique : `ANN-04 → ANN-06 → ANN-03 → ANN-02 → ANN-05 → ANN-01 → ANN-07`.
- [x] SMART-CAMP ANN-06 : Camp réel, placement joueur, stockage partagé, coût 10 bois + 10 fibres, distance >10 maps de l'infrastructure la plus proche.
- [x] ANN-01 : seuils d'exploration 10 % → 25 % → 60 % ; ancienne valeur 44 supprimée.
- [x] ANN-07 : historique réel de faune nocturne, sans réobservation artificielle.
- [x] Protection d'hydratation missionnelle au reload (`560249…`).
- [x] R-HEALTH transversal : aucune panne systémique démontrée.
- [x] POSTDIP / TP-01→09 présents avant la passe finale TP.
- [x] TP-10 / TP-11 intégrées : construction du téléporteur, calibration, transfert de matière inerte puis trajet réel hub→balise→hub.
- [x] Hub téléporteur = `MSC-CUSTOM-ASTROLOGY`, avec arches traversables uniquement dans cette MSC ; pas de modification globale des arches.
- [x] Pendant TP-01→11 puis TP-AFTER-01→04, l'usage du réseau reste dans le cadre d'apprentissage/appropriation prévu ; aucune autonomie TP anticipée avant la clôture canonique.
- [x] Après `TP-AFTER-04 completed`, l'autonomie peut utiliser le routage TP **opt-in** conformément à `TP_AUTONOMY_CONTRACT_2026-09-14.md` ; le BAC ne possède pas le téléporteur et `SpecialObjectRuntime.teleportTo()` reste l'unique primitive de transfert.
- [x] TP-11 exige au moins 4 balises persistantes déployées, non consommées.
- [x] Ressources TP préservées : 100 minerais, 50 composants, 20 cores, 100 fibres, 50 biocapital végétal Thermosève/plantes fluorescentes uniquement, 10 accumulateurs, plus sous-assemblages issus des blueprints déjà acquis.
- [x] Autorité TP corrigée : les étapes catalogue gérées par le runtime ne peuvent plus être complétées par une action RESEARCH générique du Planner.
- [x] TP-AFTER-01→04 intégrées et closes comme arc d'appropriation du téléporteur.
- [x] Chantier de test TP clos au 16/09/2026 ; les contrôles futurs TP relèvent de la non-régression ordinaire lorsqu'un chantier traverse ce périmètre.
- [x] TERR-CARN-01→04 et TERR-STORM-01→04 intégrées comme rencontres dangereuses opportunistes progressives.
- [x] CARN/STORM : progression exposition irréfléchie → récidive moins exposée → observation prudente sous contrainte d'énergie → maîtrise/observation brève sans exposition prolongée.
- [x] CARN/STORM : occurrence MSC déclenchée par progression 1→2→3→4 avec `uniqueOnly`, ciblage d'observation réel et poids renforcé sur trajets missionnels longs.
- [x] Régression inter-chantier TP/CARN détectée après commit puis corrigée : le catalogue HEAD contient désormais TP et CARN/STORM simultanément.
- [x] CUO Lab : fenêtre de test des mouvements PNJ fermable et visible uniquement lorsqu'un PNJ est sélectionné.

## P0-A — Maturation post-TP / fin de jeu

Le chantier TP et sa campagne de test sont clos. TP-AFTER n'est plus un arc à industrialiser ; il constitue un acquis moteur à préserver. La continuité principale ouverte commence désormais après cet arc.

### TP-AFTER — appropriation du téléporteur — CLOS

- [x] `TP-AFTER-01 — Le monde paraît plus petit` : utiliser réellement le téléporteur vers une balise ancienne/déjà connue.
- [x] `TP-AFTER-02 — Le chemin du retour` / formulation documentaire équivalente : revenir balise→hub sans refaire physiquement le trajet.
- [x] `TP-AFTER-03 — Cela peut servir à autre chose` : utiliser le téléporteur comme outil transversal pour reprendre une mission/branche déjà ouverte sur une map balisée.
- [x] `TP-AFTER-04 — Et maintenant ?` : clôture psychologique du projet ; satisfaction, baisse forte du poids/obsession Téléportation puis retour du BAC vers les autres axes encore ouverts.
- [x] Après TP-AFTER, le téléporteur devient une **infrastructure transversale**, pas une branche dominante ni un substitut automatique aux déplacements ordinaires.
- [x] L'autonomie TP n'est autorisée qu'après `TP-AFTER-04 completed`, en mode opt-in et sous les propriétaires définis par `TP_AUTONOMY_CONTRACT_2026-09-14.md`.

### EXP-LONG — expéditions lointaines / maturation

- [ ] Industrialiser le bloc EXP-LONG documenté : expéditions longues, exploitation du réseau de balises/téléportation et reprise des branches encore ouvertes sans précipiter artificiellement la fin.
- [ ] Laisser vivre les axes scientifique, environnemental, archéologique et relationnel tant que leurs objectifs restent pertinents.
- [ ] Utiliser le réseau TP comme facilitateur de retour/reprise, jamais comme validation implicite d'une mission distante.

### END-CHOICE — bifurcation de fin

- [ ] Déclencher la phase de fin uniquement lorsque la maturité globale du parcours est suffisante ; TP seul ne suffit pas.
- [ ] Retour au Camp / lieu de départ avec tonalité de bilan et de nostalgie.
- [ ] `END-CHOICE — Là où je suis arrivé` : proposer le choix **Rester** ou **Trouver un moyen de rentrer**.
- [ ] Branche **Rester** : mémoriser le choix de rester ; pas de générique imposé, pas d'arrêt du jeu, monde ouvert poursuivable.
- [ ] Branche **Trouver un moyen de rentrer** : ouvrir FIN-01 puis FIN-02.

### FIN-01 / FIN-02 — finalisation de la recherche et capsule

- [ ] `FIN-01 — Ce qu'ils m'ont appris` : finaliser la connaissance nécessaire au retour, avec passage par le Temple et adieux aux Rocky et aux Translucides.
- [ ] La réparation finale doit être l'aboutissement des connaissances accumulées : énergie, géologie, ingénierie, réseau, savoir ancien et connaissances acquises auprès des civilisations.
- [ ] Le composant final de synthèse reste le **Noyau de navigation résonante** ; il ne doit pas devenir une nouvelle grosse boucle de grind.
- [ ] Ne jamais réécrire rétroactivement la capsule comme déjà réparée : jusqu'à cette phase elle reste l'épave / point d'origine.
- [ ] `FIN-02 — Le point de départ` : retour à la capsule, intégration du Noyau, capsule enfin potentiellement opérationnelle, entrée de BlueFox, fondu noir, générique puis retour vers Nouvelle partie / cinématique initiale.

## P0-B — Missions OPPORTUNITÉS / MSC remarquables

Chantier documentaire validé à industrialiser en parallèle de la continuité principale, sans remplacer EXP-LONG/END-FIN.

### Principes de fonctionnement

- [ ] Une opportunité MSC **ne génère pas sa propre map** et ne force pas une MSC depuis la mission : la scène doit d'abord exister via les propriétaires normaux de génération/peuplement.
- [ ] Lorsqu'une MSC qualifiante est réellement présente sur la nouvelle map, l'opportunité peut devenir disponible immédiatement à l'entrée/découverte locale, avec poids fort mais sous l'autorité normale MissionManager/BAC/directive joueur.
- [ ] Réutiliser `featuredMicroSceneIds`, `CONTEXT_MSC`, ObjectM0, MissionMemory et les contrats de persistance existants avant toute extension moteur.
- [ ] Les mini-séries qui demandent un retour doivent mémoriser la **même map + la même instance persistante** ; aucun respawn de substitution ne valide le retour.
- [ ] Les MSC déjà engagées par une mission existante et déclarées protégées ne sont **pas réutilisées** pour une autre opportunité.
- [ ] La liste de protection/réutilisation définie dans la Bible OPP fait foi : toute MSC déjà affectée à une mission ou explicitement protégée reste exclue ; seules les MSC explicitement retenues comme candidates OPP peuvent être réutilisées.
- [ ] Orchidée et `MSC-ABANDONED-DRONE-001` doivent porter des mini-suites approfondies plutôt qu'un simple objectif jetable ; obsession/souvenir positif possibles selon progression.
- [ ] Les autres MSC retenues (dont Oasis / scènes cachées ou protectrices / grand sanctuaire selon la Bible OPP) restent des opportunités locales cohérentes, data-only autant que les contrats existants le permettent.
- [ ] Les apparitions fugaces de PNJ et interactions faune prévues par les missions OPP doivent rester portées par les propriétaires NPC/faune existants ; aucune logique relationnelle parallèle dans le catalogue.
- [ ] CARN/STORM restent la branche dangereuse opportuniste déjà industrialisée et servent de référence de comportement pour une opportunité qui attire BlueFox sans détourner durablement son trajet.

### Spawn / arbitrage

- [ ] Préserver/corriger uniquement le mécanisme existant de sélection d'opportunité si nécessaire ; pas de scheduler parallèle.
- [ ] Le critère `lowMissionProgress` ne doit pas rendre les opportunités MSC structurellement impossibles à faire apparaître.
- [ ] Renforcer la probabilité/pondération des opportunités dangereuses sur les trajets missionnels longs (>3 maps) selon la décision validée.
- [ ] Après traitement d'une opportunité locale, reprendre la transition/mission principale qui avait motivé le trajet.
- [ ] Une opportunité ne doit jamais écraser une directive joueur persistante ni une primaire réellement runnable prioritaire.

### Validation OPP

- [ ] Tester génération réelle → MSC réellement instanciée → disponibilité/révélation → MissionManager → Planner → ObjectM0/CONTEXT_MSC → ActionBridge → progression.
- [ ] Tester persistance/reload des instances utilisées par une mini-série.
- [ ] Tester les protections de réutilisation des MSC déjà missionnées.
- [ ] Tester absence de double propriétaire de spawn/progression et absence de modification de `map-registry.js`.

## P0 — Barrière de validation / tests historiques

- [x] Abandonner le nombre brut de tests rouges comme indicateur unique de santé.
- [ ] Lors d'un échec préexistant pertinent, classer avant correction :
  - test/API/fixture obsolète ;
  - harness incomplet ;
  - contrat historique remplacé ;
  - panne runtime/gameplay actuelle reproduite.
- [ ] Ne jamais modifier le moteur uniquement pour satisfaire un attendu historique devenu faux.
- [ ] Pour chaque ZIP, vérifier d'abord la préservation de la carte R-HEALTH du HEAD et l'absence de nouvelle panne observable.
- [ ] Vérifier systématiquement la coexistence avec le **parent Git réel au moment du commit** afin d'éviter un nouvel écrasement inter-chantier par ZIP construit sur une base devenue obsolète.
- [ ] Si une panne actuelle est reproduite, ouvrir un chantier ciblé sur son propriétaire réel.

## P1 — Domaines ORANGE R-HEALTH

Ces éléments ne sont pas déclarés cassés ; leur validation complète reste insuffisante.

- [ ] Rejouer/observer un parcours tutoriel T01→T13 complet lorsque le prochain chantier traverse ce périmètre.
- [ ] Revalider génération/population des maps et protections tutoriel lorsque le chantier touche maps/biomes/population.
- [ ] Revalider visuellement l'UI réelle : Recherche, Inventaire, Journal, overlays et transitions de panneaux.
- [ ] Revalider en jeu audio / caméra / déplacement / physique lors d'une passe globale adaptée.

## P1 — Relations / civilisations

- [x] Réactions NPC à l'approche raccordées au runtime relationnel.
- [x] Dialogue/contact actif protégé contre fuite automatique concurrente.
- [x] Réputation et commerce consomment les propriétaires canoniques.
- [x] Récompenses relationnelles peuvent produire connaissances/blueprints réels.
- [x] CONTACT-10→15 définies pour la seconde civilisation avec sélection persistante et retour vers CONTACT-10 en cas d'échec significatif.
- [ ] Préserver Rocky/Translucides comme acteurs réels de FIN-01 ; ne pas remplacer leurs apports par une récompense générique de fin.
- [ ] Continuer à tester les raccords CONTACT/DIP lors des prochains lots sans déplacer le comportement NPC dans le moteur de mission.

## P1 — Drones / balise / réseau

- [x] Balise déployable et missions BAL-01→03.
- [x] Blueprints Scout/Harvest et chaîne DRN-01→05.
- [x] Console réseau côté Recherche.
- [x] Récolte distante et dépôt cargo raccordés au runtime existant.
- [ ] Revalider en jeu les usages multi-map longue durée, reload et cas de plusieurs drones simultanés avant d'étendre davantage le réseau.
- [x] La coexistence réseau balises / destinations téléporteur fait partie des acquis TP clos ; ne la revalider spécifiquement que lorsqu'un futur chantier touche ce périmètre.
- [ ] Toute nouvelle capacité drone doit rester dans `special-object-runtime.js` ou ses propriétaires existants, jamais dans un runtime parallèle.

## P1 — Save / reload

- [x] Protection contre l'écrasement d'une mission sauvegardée dont la définition n'est pas encore chargée.
- [x] Hydratation conservée dans MissionManager.
- [ ] Revalider lors des prochains chantiers Save : changement de slot, reload avec plusieurs missions actives, sites/MSC persistants, constructions, directive joueur et réseau drone/balise.
- [ ] Revalider explicitement hub téléporteur, balises destinations et mini-séries OPP SAME-INSTANCE après reload uniquement lorsqu'un chantier Save/TP/OPP traverse ces comportements.
- [ ] Ne pas réintroduire de migration artificielle d'états rejetée par le runtime.

## P1 — Kit d'expédition

- [x] Le Kit n'est plus limité aux seules rations : accumulateur et balise peuvent être représentés comme objets transportables.
- [x] L'activation reste déléguée au propriétaire métier.
- [x] Aucun slot vide pour un item absent.
- [ ] Toute nouvelle famille d'objet activable doit être ajoutée par généralisation minimale, uniquement lorsqu'un consommateur réel l'exige.

## P1 — Journal

- [x] Calcul/consolidation à l'ouverture uniquement.
- [x] Aucun recalcul par simple événement/mutation UI.
- [x] Briques persistantes.
- [x] Branche inchangée = texte stable.
- [x] Enrichissement seulement après évolution significative.
- [x] Pas de polling ajouté.
- [x] ANN-07 raccorde son premier catalogue à la branche Faune/Nature sans créer de journal parallèle.
- [x] TP-AFTER est désormais clos ; ses effets documentaires doivent rester intégrés aux branches existantes sans second journal.
- [ ] OPP et END/FIN devront enrichir les branches existantes sans créer de second journal.
- [ ] Continuer à vérifier la stabilité du contenu au fur et à mesure de l'industrialisation des nouvelles branches.

## P2 — Performance globale

R-STAB et R-HEALTH ne remplacent pas un profilage global.

- [ ] Profiler le coût CPU sur map connue et map dense au HEAD courant.
- [ ] Mesurer fréquence BAC/MissionManager/ObjectEvents.
- [ ] Vérifier les rescans d'intérêt et caches d'approche.
- [ ] Vérifier les coûts lorsque plusieurs drones distants, balises TP et missions OPP actives coexistent.
- [ ] Conserver RuntimeBudget unique ; aucun second système de throttling.

## P2 — Survival / énergie-rest-food

- [ ] Revalider l'effet réel des rations, micro-pauses et repos longs lors d'une passe gameplay adaptée.
- [ ] Préserver la distinction rest / food / safety.
- [ ] Ne pas transformer l'énergie affichée en deuxième état autoritaire.
- [ ] Aucun changement de seuil sans preuve runtime.
- [ ] Préserver dans CARN/STORM la contrainte d'énergie/risque sans créer un état énergétique parallèle.

## P2 — IMI / interactions

- [ ] Continuer à revalider le cycle `MissionManager → Planner → ObjectM0 → ActionBridge → interaction → progression` sur les nouveaux lots.
- [x] SAME-INSTANCE encore présent au checkpoint R-HEALTH.
- [x] Fan-out encore présent au checkpoint R-HEALTH.
- [ ] Préserver `REVEAL-ONLY / SAME-DEFINITION / SAME-INSTANCE`.
- [ ] Ne pas réintroduire de migration automatique de vieux bindings.
- [x] `cuoTypes` OR optionnel préserve `cuoType` historique.
- [ ] Les retours OPP vers une MSC remarquable doivent explicitement tester SAME-INSTANCE sur l'identité persistante mémorisée.

## P3 — Non-régression permanente

- [ ] T01→T13.
- [ ] Navigation joueur règle B + reload.
- [ ] Pas de collecte/repos parasite sous mission prioritaire.
- [x] SAME-INSTANCE et fan-out présents au R-HEALTH.
- [ ] LOC map-scopé.
- [x] Recherche / Inventaire : correction historique écran noir/superposition à préserver.
- [ ] MSC/sites persistants après reload.
- [ ] WORKBENCH.
- [ ] Accumulateurs / balises / drones / cargo.
- [x] TP-01→11 + TP-AFTER-01→04 + hub ASTROLOGY + réseau destinations + aller/retour + autonomie post-arc : chantier TP clos, acquis à préserver ; revalidation ciblée seulement si un futur chantier traverse ce périmètre.
- [ ] CARN/STORM 01→04 pour les deux phénomènes.
- [x] Journal lazy/persistant confirmé structurellement.
- [ ] ARCH-01→40.
- [ ] CONTACT/DIP.
- [ ] ENE-15-A/B/C.
- [ ] ANN-01→07, notamment placement manuel SMART-CAMP, consommation réelle des expérimentations et fallback faune nocturne.

## P4 — Maps / MSC

- [ ] Préserver protections maps tutoriel.
- [ ] Préserver rareté/faune/îlots.
- [ ] Continuer MAP Test / CUO Lab lorsque le chantier touche au décor.
- [ ] Conserver le principe : une composition qui doit compter comme une unité missionnelle utilise une MSC composite unique, pas un moteur de groupement parallèle.
- [x] `MSC-CUSTOM-SMART-CAMP` enregistrée comme donnée MSC ; le comportement de Camp reste porté par le site `kind:"camp"`.
- [ ] Protéger de la réutilisation opportuniste les MSC déjà affectées à des missions existantes.
- [ ] Pour toute MSC OPP à retour, garantir identité persistante et réinstanciation fidèle après reload.

## P5 — Audio

- [x] Moteur adaptatif unique.
- [x] Volumes musique / sons séparés.
- [x] Silence musique adaptative pendant intro.
- [x] Fondus de cues validés historiquement.
- [ ] Revalidation globale d'écoute avant gel définitif.

## Discipline de livraison

- [x] HEAD courant seule base technique.
- [x] Aucun bridge parallèle si un propriétaire existe.
- [x] BASE partielle exacte ; ne jamais reconstruire le dépôt complet pour un chantier ciblé.
- [x] Aucun fichier reconstruit depuis un extrait partiel.
- [x] Diff exact avant livraison.
- [x] Tests producteurs + propriétaires + runtime + consommateurs.
- [x] Les symptômes servent de réfutation, pas de design.
- [x] Les tests historiques rouges ne définissent pas à eux seuls l'état de santé.
- [ ] Toujours comparer le candidat au **HEAD/parent effectif au moment de l'application**, pas seulement au HEAD utilisé lors de la fabrication initiale du ZIP.
- [ ] Ne déclarer PASS gameplay qu'après preuve observable correspondante.
