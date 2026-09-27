# BlueFox Odyssey — Addendum gameplay opérationnel

Ce document complète les contrats gameplay historiques. Les sections ci-dessous consolident les règles toujours applicables au **14 septembre 2026**, avec checkpoint de santé `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46` et synchronisation missionnelle au HEAD `bca4b01b8606b630b8ccbae7e5bd3356d3ac0c31`.

## Architecture gameplay effective

- lifecycle / choix missionnel : `mission-manager.js`
- planification : `mission-planner.js`
- exécution : `action-bridge.js`
- CUO / même-instance / fan-out : `object-m0-bridge.js`
- contexte MSC : `context-msc-bridge.js`
- Bible : `bible-runtime-v0-1-unified.js`
- BAC : `behavior-arbitration-core.js` + `behavior-arbitration-integration.js`
- monde / transitions : `world-engine.js`
- chemins : `path-planner.js` + `character-controller.js`
- progression / inventaire : `progression-registry.js`
- objets spéciaux / drones / balise / téléporteur : `special-object-runtime.js`
- persistance MSC : `persistent-micro-scenes-v20.js`
- sauvegarde : `save-ui-bridge.js`
- Journal / présentation : `ui-enhancements.js`
- ration mécanique : `survival-rations-v0-3.js`
- IA ration : `survival-rations-ai-v0-3.js`

## Navigation joueur

Règle B :
- suggestion persistée immédiatement ;
- action atomique non interrompue ;
- directive reprise avant nouvelle décision ;
- persistance au reload.

## Addendum — runnabilité missionnelle R-STAB

Une mission peut être active et primary sans être localement runnable.

Règles :
- une feuille géographiquement distante ne produit pas de fausse action locale ;
- `requiredMapFact`, cible missionnelle mémorisée, completion gate et TRAVEL explicite peuvent déclencher une transition canonique ;
- si une transition n’est pas exécutable, elle ne doit pas conserver l’autorité exclusive ;
- une secondaire locale runnable peut être exécutée avant départ si le contrat l’autorise ;
- après disparition de cette opportunité, la transition primaire reprend ;
- une primaire active mais stérile ne doit pas immobiliser BlueFox ;
- les retries sont réveillés causalement, sans polling.

## Addendum — triggers différés

Lorsqu’un événement ponctuel arrive avant la complétion d’un prérequis lifecycle, le runtime peut en mémoriser le contexte et déléguer l’activation différée à MissionManager.

Interdit :
- créditer rétroactivement un compteur `count > 1` avec des événements antérieurs au prérequis ;
- créer une seconde file d’activation parallèle.

## Addendum — CUO / ObjectM0

Relations IMI :
- `REVEAL-ONLY`
- `SAME-DEFINITION`
- `SAME-INSTANCE`

`cuoTypes` est un filtre OR optionnel ajouté chirurgicalement pour les missions nécessitant un ensemble explicite de types. Il reste cumulatif avec les autres filtres et ne remplace pas `cuoType`.

Observer / inspecter / analyser restent des nuances d’une même étude physique quand le CUO le prévoit.

## Addendum — ENE / balise / drones

ENE-11→14 est industrialisé :
- accumulateur fabriqué à l’établi ;
- consommation réelle des ressources ;
- machine abandonnée alimentée par consommation d’un accumulateur ;
- Scout existant réutilisé ;
- mesures énergétiques multi-map et calibration Giant Tree.

Balise :
- runtime réel dans `special-object-runtime.js`;
- BAL-01→03 consomme les primitives existantes ;
- le Kit transporte, mais ne devient pas propriétaire de l’activation ;
- une balise persistante peut devenir destination TP sans être consommée.

Drones :
- DRN-01→05 formalise Scout/Harvest, réseau et dépannage ;
- la console joueur reste côté Recherche ;
- la récolte distante et le cargo utilisent le runtime existant ;
- `OBJECT_SEEN` produit l’historique global d’observation du Scout ;
- le Scout ne progresse pas silencieusement des observations missionnelles ordinaires non explicitement prévues.

## Addendum — Téléportation

### Hub / destinations
- hub unique : `MSC-CUSTOM-ASTROLOGY` ;
- ASTROLOGY est ancrée comme site TP persistant ;
- les arches d'ASTROLOGY restent visibles mais traversables **uniquement dans cette MSC** ;
- destination éligible = map connue avec balise réellement déployée et persistante ;
- hub↔balise seulement ; aucun beacon↔beacon ;
- TP-11 exige au moins 4 balises persistantes déployées, non consommées.

### Ressources TP
TP-10/11 conservent la charge matérielle validée :
- 100 minerais avec part significative rare/magnétique/énergétique/cristalline ;
- 50 composants ;
- 20 cores ;
- 100 fibres ;
- 50 biocapital végétal **uniquement Thermosève + plantes fluorescentes**, pas de biomasse adaptative ;
- 10 accumulateurs ;
- sous-assemblages issus des blueprints déjà acquis.

### Sécurité d'utilisation
- téléportation initiée par le joueur uniquement ;
- BAC ne téléporte jamais BlueFox de manière autonome ;
- BlueFox doit être proche de la source ;
- refus pendant action/séquence non interruptible ;
- refus du double transfert ;
- aucune map créée/découverte par le TP ;
- aucun gain artificiel d'exploration ;
- arrivée sur zone réellement marchable et sûre, sinon refus/rollback.

### Cycle TP-11
- calibration ;
- transfert de matière inerte ;
- transfert BlueFox hub→balise ;
- retour balise→hub.

L'autorité de ces étapes appartient au runtime TP. Une action RESEARCH générique du Planner ne peut pas les compléter.

## Addendum — TP-AFTER / maturation

Après TP-11, le projet Téléportation doit être réellement approprié avant de perdre son poids psychologique.

Séquence documentaire :
- `TP-AFTER-01 — Le monde paraît plus petit` : voyage vers une ancienne balise connue ;
- `TP-AFTER-02 — Le chemin du retour` : retour balise→hub ;
- `TP-AFTER-03 — Cela peut servir à autre chose` : utilisation transversale pour reprendre une mission déjà ouverte sur une map balisée ;
- `TP-AFTER-04 — Et maintenant ?` : satisfaction puis baisse forte de l'obsession/poids Téléportation.

Après cette mini-série, le téléporteur devient une infrastructure générale. Le BAC doit pouvoir réarbitrer normalement les autres axes.

`EXP-LONG` prolonge cette logique par des expéditions lointaines ; il ne constitue pas une fin automatique.

## Addendum — Fin de jeu

La fin ne se déclenche pas par la seule possession du téléporteur.

### END-CHOICE
Retour au Camp / lieu de départ lorsque la maturité globale du parcours le permet :
- **Rester** : mémoriser le choix ; pas de générique imposé ; monde ouvert poursuivable.
- **Trouver un moyen de rentrer** : ouvre FIN-01/FIN-02.

### FIN-01 — Ce qu'ils m'ont appris
- finaliser la connaissance nécessaire au retour ;
- passage par le Temple ;
- adieux aux Rocky et aux Translucides ;
- réutiliser les acquis scientifiques, énergétiques, géologiques, d'ingénierie, archéologiques et relationnels.

### FIN-02 — Le point de départ
- retour à la capsule ;
- intégration du **Noyau de navigation résonante** ;
- capsule enfin potentiellement opérationnelle ;
- entrée de BlueFox ;
- fondu noir ;
- générique ;
- retour vers Nouvelle partie / cinématique initiale.

La capsule n'est **pas** considérée comme déjà réparée avant FIN-02. Le Noyau final est une synthèse narrative/technologique, pas une nouvelle grosse boucle de collecte.

## Addendum — Missions OPPORTUNITÉS / MSC

Principes :
- une opportunité ne génère pas sa propre map ;
- la MSC doit être réellement produite par le cycle normal de génération/peuplement ;
- si elle existe sur la map, l'opportunité peut être disponible à l'entrée/découverte locale ;
- poids fort possible, sans priorité supérieure à une directive joueur persistante ou à une primaire réellement runnable ;
- après traitement, reprise du trajet/objectif principal ;
- aucune file/scheduler OPP parallèle ;
- réutiliser `featuredMicroSceneIds`, `CONTEXT_MSC`, ObjectM0, MissionMemory et PersistentMicroScenes ;
- une mini-série de retour doit viser la même map + la même instance persistante ;
- une MSC déjà protégée/affectée à une mission existante n'est pas recyclée ;
- Orchidée et `MSC-ABANDONED-DRONE-001` peuvent porter des mini-suites approfondies avec obsession/souvenir ;
- PNJ/faune restent sous leurs propriétaires existants.

Le critère `lowMissionProgress` ne doit pas rendre les opportunités structurellement impossibles à faire apparaître.

Sur trajet missionnel long (>3 maps), les opportunités dangereuses CARN/STORM peuvent recevoir un poids renforcé.

## Addendum — CARN/STORM

Les anciennes intentions TERR ont été remplacées par des rencontres dangereuses opportunistes.

Pour chaque phénomène :
1. première rencontre : attraction/approche trop directe, dégâts/exposition importante puis restauration ;
2. récidive : BlueFox se réexpose mais moins, avec mémoire négative ;
3. troisième : observation prudente, notamment sous contrainte d'énergie ;
4. quatrième : observation brève/maîtrisée, sans exposition prolongée.

Contrat :
- occurrences distinctes 1→2→3→4 ;
- `uniqueOnly` ;
- actions d'observation ciblées ;
- la rencontre ne doit pas absorber durablement le trajet principal ;
- les durées d'exposition se réduisent au fil de l'apprentissage ;
- aucun second état d'énergie n'est créé.

## Addendum — Journal

La consolidation du Journal est lazy :
- déclenchement uniquement à l’ouverture ;
- aucune consolidation du seul fait d’un scan/mutation DOM ;
- une ouverture ne consolide qu’une fois ;
- les briques persistent ;
- une branche sans évolution majeure reste stable ;
- aucun polling.

TP-AFTER, OPP et END/FIN doivent enrichir les branches existantes.

## Addendum — MSC composites / ARCH-29

Une liste de plusieurs `requiredMicroScenes` ne constitue pas automatiquement une scène composée.

Quand plusieurs fragments doivent visuellement représenter **une seule unité missionnelle**, la solution validée est :
- créer une MSC composite de données ;
- fusionner les CUO/transformations des fragments existants dans cette scène ;
- donner au composite une seule identité MSC ;
- faire progresser la mission sur la découverte/proximité de cette identité unique.

Aucun moteur de regroupement, bridge ou registre missionnel parallèle n’est autorisé pour ce besoin.

## Survie

Le propriétaire reste `survival-ai-bridge.js`.

Le calcul agrégé historique reste basé sur rest / food / safety ; l’énergie affichée ne doit pas devenir un deuxième état autoritaire.

Toute modification de seuil de repos/ration nécessite une preuve runtime.

## Performance

`RuntimeBudget` reste l’unique throttling adaptatif.

R-STAB ferme la partie retry/runnabilité missionnelle, mais le profilage global CPU reste un chantier distinct.
Aucun nouveau cache global, budget CPU ou polling ne doit être ajouté sans preuve.

## Discipline

- HEAD courant seule base technique ;
- preuve avant correction ;
- propriétaires existants avant toute abstraction nouvelle ;
- BASE partielle exacte ;
- mêmes tests BASE/CANDIDAT ;
- contrôler le parent Git réel avant application d'un ZIP ;
- pas de migration automatique rejetée ;
- pas de PASS gameplay sans preuve observable.
