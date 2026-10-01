# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **1 octobre 2026**

Cette page est la **seule TODO active**.

## Base courante

- [x] HEAD courant vérifié : `d334ed2cb193c80c44e98c401b5947bbd263348e` — `Mission routines`.
- [x] Parent : `93a6b7f11ee267764bacc471e8851ca156756ed3` — réconciliation transitions missionnelles R1→R5.
- [x] R-HEALTH `560249…` conservé comme checkpoint historique de santé.
- [x] HEAD GitHub courant = seule base technique.
- [x] MissionManager = lifecycle/sélection/autorité missionnelle.
- [x] WorldEngine = monde/navigation/transitions/autonomie exécutée/interaction physique.
- [x] BAC = arbitrage comportemental, pas second lifecycle.
- [x] ObjectM0 = matching/SAME-INSTANCE/fan-out.
- [x] RuntimeBudget = unique throttling adaptatif.
- [x] `map-registry.js` protégé.

## Acquis à préserver

- [x] T01→T13.
- [x] FLO-01→07 ; GEO-01→07 ; COL/ENV ; LOC-01→17.
- [x] SUR et missions de site déjà industrialisées.
- [x] GAME R1/R2 ; engineering/fire ; civilization.
- [x] FAU + variantes répétables.
- [x] ENE + ENE-15-A/B/C.
- [x] BAL-01→03 ; DRN-01→05.
- [x] ARCH-01→40 ; CONTACT-01→15 ; DIP-01→03.
- [x] ANN-01→07.
- [x] TP-01→11 + TP-AFTER-01→04 + autonomie TP post-arc opt-in conformément à `TP_AUTONOMY_CONTRACT_2026-09-14.md`.
- [x] TERR-CARN-01→04 et TERR-STORM-01→04.
- [x] SAME-INSTANCE + fan-out.
- [x] Journal lazy/persistant.
- [x] Hydratation différée missionnelle au reload.
- [x] Recherche/Inventaire sans écran noir/superposition.
- [x] Responsive mobile/tablette, safe areas, tactile, desktop préservé.
- [x] Profil mobile coarse-pointer/touch, sans bascule desktop par simple largeur.
- [x] Réconciliation images PNG/WebP sans fusion volontaire des identités de maps.
- [x] Débris de ruine ciblés rendus immobiles sur les voies d'animation auditées.

## P0 — Autorité missionnelle : Top1 → Top4 → travel → free

**Chantier prioritaire ouvert.**

- [ ] Réconcilier `WorldEngine.ensureActivity()` avec l'autorité missionnelle globale de `MissionManager` : une Top1 non-runnable ne doit pas permettre l'autonomie libre si Top2→Top4 ou un travel missionnel structuré reste exécutable.
- [ ] Préserver le choix joueur Top1 sans churn automatique.
- [ ] Sans choix joueur, préserver shortlist BAC/MissionManager de 3–4 missions prioritaires.
- [ ] Respecter l'ordre `LOCAL → KNOWN → UNKNOWN CONTRACTUEL → FREE`.
- [ ] Après échec/refus d'une candidate, essayer la candidate missionnelle suivante avant de tomber en autonomie libre.
- [ ] Ne jamais marquer une mission « stérile » ou l'abandonner uniquement parce que sa cible est momentanément non exécutable.
- [ ] Aucun nouveau moteur/scheduler/bridge d'autorité.

### Critères de validation

- [ ] Top1 runnable : exécution prioritaire.
- [ ] Top1 non-runnable + Top2 locale : Top2 exécutée.
- [ ] Top1/Top2 locales non-runnable + Top3 destination connue : travel connu.
- [ ] shortlist sans local/known mais mission autorisée unknown : travel inconnu contractuel.
- [ ] aucun travail missionnel exécutable : autonomie libre seulement à ce moment.
- [ ] save/reload conserve Top1, travel pending et causal arrival.
- [ ] aucune collecte/observation générale parasite pendant l'autorité missionnelle.

## P0 — Pollution inter-mission des interactions

**Défaut reproduit le 1 octobre.**

- [ ] Empêcher une mission secondaire d'injecter une observation comme précondition bloquante d'une collect/extract appartenant à une autre mission.
- [ ] Conserver le fan-out passif : l'événement réel crédite toutes les missions compatibles.
- [ ] Conserver l'étude intrinsèque SAME-INSTANCE réellement due avant acquisition.
- [ ] Aucun `observe → collect → observe` infini.
- [ ] `currentAction`, `pendingInteraction` et propriétaire de l'action restent cohérents.
- [ ] Une observation non créditable par le consommateur qui l'a demandée ne doit jamais bloquer l'action suivante.

### Reproduction de référence

- boucle d'observation répétée sur la même instance de buisson ;
- une mission CONTEXT_MSC/secondaire injectait une étude dans l'acquisition sans pouvoir la valider par le chemin d'événement générique ;
- le correctif doit rester générique et ne pas cibler une mission par ID.

## P0 — Validation exhaustive missionnelle

La fonctionnalité « missions universellement exécutables » reste **NON PROUVÉE** tant que chaque mission pertinente n'est pas classée.

Pour chaque mission/lot :
- [ ] activation/révélation ;
- [ ] cible et cardinalité ;
- [ ] identité map/MSC/instance ;
- [ ] local/known/unknown travel ;
- [ ] exécution physique ;
- [ ] événement canonique ;
- [ ] progression/fan-out ;
- [ ] completion gate ;
- [ ] suite/activation suivante ;
- [ ] reload/persistance ;
- [ ] autorité Top1/Top4.

Verdicts autorisés : `PASS E2E`, `PASS structurel`, `NON PROUVÉ`, `FAIL`.

## P0 — Causalité des transitions / destinations

- [x] R1→R5 a réconcilié plusieurs ruptures : map générée propre à la mission, causal arrival, protections CONTEXT_MSC, runtime-managed/cataloManaged.
- [x] `d334ed2` ajoute les `proximityContexts` et un fallback de travel structuré hors shortlist lorsque les fast paths sont stériles.
- [ ] Revalider en jeu que la mission ayant provoqué un voyage reprend bien à l'arrivée.
- [ ] Revalider destination connue multi-hop.
- [ ] Revalider identité persistante MSC et absence de fallback générique de famille.
- [ ] Revalider les missions ayant historiquement perdu `persistentMicroSceneId` ou activé sur MSC incomplète.
- [ ] Aucun safe-net générique d'abandon de mission tant que les règles normales peuvent être réparées.

## P0 — Barrière de validation / livraison

- [x] Ne plus utiliser le nombre brut de tests rouges comme indicateur de santé.
- [ ] Classer tout échec préexistant : test/fixture obsolète, harness incomplet, contrat supersédé, panne runtime reproduite.
- [ ] Ne modifier le moteur que pour une panne actuelle ou un contrat encore valide violé.
- [ ] Pour chaque ZIP : mêmes tests BASE/CANDIDAT, diff exact, consommateurs directs/indirects, parent Git réel.
- [ ] Ne jamais réutiliser une tentative rejetée ou un ancien ZIP comme base.
- [ ] PASS gameplay uniquement après preuve observable.

## P1 — Navigation / interaction physique

- [x] Ajustement historique validé : reach d'observation augmenté sans modifier les colliders MSC/cibles concernées.
- [x] Récupération après plusieurs échecs de replanification par retraits physiques bornés validée historiquement.
- [x] Autonomie OFF : déplacement direct joueur au sol préservé ; pas d'annulation OFF→OFF répétitive.
- [ ] Propager explicitement les échecs de `setTarget()/rebuildPath()` jusqu'au décideur missionnel.
- [ ] Éviter qu'une simple existence de cible soit assimilée à une action réellement runnable.
- [ ] Vérifier que les retries n'entretiennent pas un `pendingInteraction` stale.

## P1 — Save / reload / inventaire

- [x] Hydratation différée MissionManager.
- [x] Réconciliation historique mapchange/save intégrée.
- [ ] Revalider plusieurs missions actives + changement de map + reload.
- [ ] Revalider inventaire physique lorsque la mission indique déjà une collecte/construction validée.
- [ ] Revalider intention travel, causal arrival, MSC/sites, constructions et réseau spécial.
- [ ] Ne pas réintroduire de migration automatique de vieux bindings rejetée.

## P1 — Maps / MSC / identité visuelle

- [x] Corrections PNG/WebP/alias/fallback intégrées fin septembre.
- [x] Alias MSC ciblés utilisés uniquement lorsque nécessaire à la compatibilité de mission.
- [ ] Revalider qu'aucune map non-Crystal ne reçoit la texture/image Crystal par fallback incorrect.
- [ ] Préserver identités `1Crystal`, `1Jungle` et autres associations canoniques malgré conversion WebP.
- [ ] Revalider 1→2→4→6 et protections tutoriel.
- [ ] Revalider MSC + objets requis avant activation missionnelle.
- [ ] Protéger les MSC déjà missionnées contre réutilisation OPP non validée.

## P1 — Objets immobiles

- [x] Débris de ruine : voies connues de mouvement/rotation/vent neutralisées dans le correctif dédié.
- [ ] Revalider visuellement en jeu lors d'un chantier décor/animation.
- [ ] Aucun traitement spécifique ne doit casser les animations légitimes de flore/vent des autres objets.

## P1 — Missions OPPORTUNITÉS / MSC remarquables

- [ ] Une mission OPP ne génère pas sa propre map pour se satisfaire.
- [ ] MSC d'abord matérialisée par génération/peuplement normal.
- [ ] Activation locale seulement si contexte réellement présent/complet.
- [ ] Même map + même instance persistante pour mini-série de retour.
- [ ] Pas de scheduler OPP parallèle.
- [ ] Opportunité perdable peut différer ponctuellement un travel ; activité générique non perdable ne le peut pas.
- [ ] Après opportunité, reprise du travel principal.
- [ ] Directive joueur et primaire réellement runnable restent supérieures.

## P1 — Domaines ORANGE R-HEALTH

- [ ] Rejouer T01→T13 complet lorsqu'un chantier traverse le tutoriel.
- [ ] Revalider génération/population/protections maps.
- [ ] Revalider UI visuelle réelle Recherche/Inventaire/Journal/overlays.
- [ ] Revalider audio/caméra/déplacement/physique lors d'une passe globale.

## P1 — Relations / civilisations

- [x] NPC, dialogue, réputation, commerce et blueprints réels présents.
- [ ] Revalider CONTACT/DIP lorsque touchés.
- [ ] FIN-01 doit réutiliser Rocky/Translucides réels, pas un flag abstrait.

## P1 — Drones / balise / TP

- [x] BAL-01→03 et DRN-01→05.
- [x] TP-01→11 + TP-AFTER-01→04 clos.
- [x] Autonomie TP post-arc opt-in seulement.
- [ ] Revalider multi-map/reload uniquement lorsqu'un futur chantier traverse ce périmètre.

## P1 — Kit d'expédition

- [x] Rations, accumulateur, balise transportables selon stock réel.
- [x] Activation déléguée au runtime métier.
- [x] Aucun slot vide pour item absent.
- [ ] Étendre seulement lorsqu'un consommateur réel le nécessite.

## P1 — Journal

- [x] Lazy à l'ouverture, sans polling.
- [x] Briques persistantes et texte stable sans changement significatif.
- [ ] OPP/END/FIN enrichissent les branches existantes.

## P2 — Performance globale

- [x] Profil mobile/tablette et responsive déjà intégrés/validés lors du chantier dédié.
- [x] Mesure fin septembre : ~39 FPS moyens sur session profilée ; `world-engine.js` principal contributeur CPU.
- [ ] Profiler le HEAD courant sur déplacement ordinaire, interaction ordinaire, map dense et plusieurs missions actives.
- [ ] Mesurer MissionManager/BAC/ObjectEvents sans se limiter aux cas pathologiques.
- [ ] Éviter les scans map-wide par tick pour interaction déjà résolue.
- [ ] Conserver RuntimeBudget unique.
- [ ] Vérifier que les correctifs de mission n'augmentent pas la fréquence `updateAutonomy`/recalculs sans cause.

## P2 — Survival / énergie

- [ ] Revalider ration, micro-pause et repos long.
- [ ] Micro-pause produit une récupération réelle et reste courte.
- [ ] Ration permet une excursion plus longue ; sans ration, repos long reste normal.
- [ ] Pas de boucle une action→repos.
- [ ] Aucun second état d'énergie autoritaire.

## P2 — IMI / interactions

- [x] `REVEAL-ONLY / SAME-DEFINITION / SAME-INSTANCE` restent les relations canoniques.
- [x] `cuoTypes` OR optionnel préserve `cuoType`.
- [ ] Revalider le cycle complet `MissionManager → Planner → ObjectM0 → ActionBridge → interaction → événement → progression` sur chaque nouveau lot.
- [ ] Aucune migration automatique de bindings historiques sans preuve.

## P3 — Non-régression permanente

- [ ] T01→T13.
- [ ] Top1/Top4 + LOCAL/KNOWN/UNKNOWN/FREE.
- [ ] directive joueur règle B + reload.
- [ ] aucune collecte/repos parasite sous autorité missionnelle.
- [ ] SAME-INSTANCE et fan-out.
- [ ] absence de pollution d'étude secondaire sur acquisition courante.
- [ ] LOC map-scopé.
- [ ] Recherche/Inventaire sans écran noir/superposition.
- [ ] MSC/sites persistants.
- [ ] WORKBENCH, accumulateurs, balises, drones/cargo.
- [ ] TP acquis.
- [ ] CARN/STORM.
- [ ] ARCH/CONTACT/DIP/ENE-15/ANN selon chantier traversé.
- [ ] images map et identités biome.
- [ ] débris immobiles sans casser flore/vent légitimes.

## Continuité narrative

### EXP-LONG
- [ ] Industrialiser les expéditions longues sans forcer la fin.
- [ ] TP = facilitateur, jamais validation implicite.

### END-CHOICE / FIN
- [ ] Déclencher seulement à maturité globale suffisante.
- [ ] Rester = monde ouvert poursuivable.
- [ ] Retour = FIN-01 puis FIN-02.
- [ ] Capsule non réparée avant FIN-02.
- [ ] Noyau de navigation résonante = synthèse finale, pas grosse boucle de grind.

## Discipline de livraison

- [x] préflight obligatoire ;
- [x] HEAD courant seul ;
- [x] Gameplay V2 avant audit ;
- [x] invariant gameplay comme matrice principale ;
- [x] propriétaires existants avant toute extension ;
- [x] BASE partielle exacte ;
- [x] aucun fichier reconstruit depuis ancien ZIP ;
- [x] diff exact ;
- [x] tests producteurs/propriétaires/runtime/consommateurs ;
- [ ] toujours comparer au parent Git réel au moment de l'application ;
- [ ] ne déclarer PASS gameplay qu'après preuve observable.
