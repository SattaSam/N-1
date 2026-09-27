# BlueFox Odyssey — Contrat Téléportation autonome post-arc

Date : 14 septembre 2026
Mise à jour de statut : 16 septembre 2026
Base de décision initiale : HEAD `a4acde1df0e93b84f55f5d28530b82c59be93e4a` + décision utilisateur postérieure au HEAD.
Base de synchronisation de clôture : HEAD `3b01f2bf87ce0ffa5f2c385f21dce16866d6a518` — `CPU P3`.

## Statut documentaire

Ce contrat est un addendum officiel maintenu. Il **remplace explicitement**, pour l'état courant du projet, les formulations antérieures imposant « téléportation initiée par le joueur uniquement » ou « aucune autonomie de téléportation » dans `ROADMAP_TODO.md`, `DEV_HISTORIQUE.md` et `GAMEPLAY_CONTRACT_ADDENDUM_2026-08-28.md`.

Ces formulations restent utiles pour comprendre la phase d'apprentissage historique TP-10/TP-11, mais ne constituent plus le contrat gameplay après finalisation de l'arc TP.

Le **chantier de test TP est clos au 16 septembre 2026**. TP-01→11 et TP-AFTER-01→04 sont désormais des acquis à préserver. Les validations futures sur ce périmètre relèvent de la non-régression ordinaire lorsqu'un chantier traverse la téléportation ; elles ne maintiennent pas un chantier TP dédié ouvert.

## Point d'ouverture canonique

L'utilisation autonome du réseau par BlueFox reste **indisponible pendant tout l'arc d'apprentissage et d'appropriation** : TP-01→TP-11 puis TP-AFTER-01→04.

Le point d'entrée canonique est :

`TP-AFTER-04.status === "completed"`

TP-AFTER-04 est la clôture psychologique du projet Téléportation. À partir de cette complétion seulement, le téléporteur devient une infrastructure générale de déplacement que l'autonomie peut exploiter.

## Propriétaires

- `MissionManager` / BAC choisissent l'objectif ou la destination selon leurs responsabilités existantes.
- `WorldEngine` reste propriétaire du calcul et de l'exécution des itinéraires inter-map.
- `SpecialObjectRuntime` reste propriétaire du réseau TP, de ses balises éligibles et de l'exécution réelle de `teleportTo()`.
- Le BAC ne possède pas le téléporteur et n'appelle pas directement `teleportTo()`.

## Routage autonome autorisé

Après `TP-AFTER-04 completed`, un déplacement autonome explicitement autorisé à utiliser l'optimisation TP peut comparer :

- un trajet physique par gates ;
- un trajet multimodal combinant gates et liaisons TP réelles.

Exemple valide :

`position → 9 gates → cible`

comparé à :

`position → 2 gates → balise A → TP ASTROLOGY → TP balise B → 1 gate → cible`

Le second trajet peut être retenu s'il est strictement plus court.

Règles :
- 1 gate = 1 étape ;
- 1 transfert TP = 1 étape ;
- à coût égal, conserver le trajet physique ;
- aucune liaison directe balise→balise : le hub ASTROLOGY reste obligatoire ;
- seules les maps connues avec balise persistante réelle sont éligibles ;
- aucune map n'est découverte ou créée par le TP ;
- l'approche physique de la source TP reste obligatoire ;
- `SpecialObjectRuntime.teleportTo()` reste l'unique primitive de transfert.

## Opt-in et non-régression

Le routage TP autonome est **opt-in**. `WorldEngine.findKnownRoute()` conserve sa sémantique historique purement physique.

Une navigation autonome ne peut utiliser le réseau TP que si son consommateur demande explicitement l'optimisation multimodale. Le premier consommateur autorisé par ce lot est la transition missionnelle autonome portée par `MissionManager`.

Les consommateurs historiques non audités — navigation joueur ordinaire, retours historiques, autres routages — ne changent pas implicitement de sémantique.

La clôture du chantier TP ne supprime pas ces garde-fous : elle signifie que ce contrat et les comportements correspondants constituent désormais la référence à préserver.

## EXP-LONG

EXP-LONG peut consommer cette capacité générale une fois l'arc TP finalisé. Il ne possède ni le réseau ni l'exécution TP et ne valide jamais implicitement un objectif missionnel distant par le seul déplacement.
