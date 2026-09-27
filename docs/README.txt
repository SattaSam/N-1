Ces fichiers sont les documents de référence officiels maintenus :
- MASTER.md
- ARCHITECTURE_TECHNIQUE.md
- ROADMAP_TODO.md (seule TODO active)
- DEV_HISTORIQUE.md
- MUSIC_SYSTEM_V1.md
- RECOVERY_CHECKPOINT_2026-08-28.md
- RECOVERY_CHECKPOINT_2026-09-01.md
- GAMEPLAY_CONTRACT_ADDENDUM_2026-08-28.md
- TP_AUTONOMY_CONTRACT_2026-09-14.md

Base technique auditée au 12/09/2026 :
- checkpoint moteur R-HEALTH : 560249fb91ed2d5c719a4aafa5eabe88b6ee1e46
- commit : fix Save
- le HEAD GitHub courant reste la seule base technique de reprise ;
- les commits documentaires postérieurs à ce checkpoint ne modifient pas le moteur audité ;
- ROADMAP_TODO.md reste la seule TODO active ;
- aucun nouveau recovery checkpoint séparé n'est créé : le checkpoint R-HEALTH est enregistré dans les documents maintenus.

Synchronisation documentaire du 16/09/2026 :
- HEAD moteur de départ vérifié : 3b01f2bf87ce0ffa5f2c385f21dce16866d6a518 — CPU P3 ;
- le chantier de test TP est considéré clos ;
- TP-01→11 et TP-AFTER-01→04 sont des acquis à préserver, non des travaux TP encore ouverts ;
- l'autonomie TP reste interdite pendant l'arc d'apprentissage et d'appropriation, puis devient disponible uniquement après TP-AFTER-04 completed, selon TP_AUTONOMY_CONTRACT_2026-09-14.md ;
- les futures validations TP relèvent de la non-régression ordinaire lorsqu'un chantier traverse ce périmètre, pas d'un chantier TP dédié encore ouvert.

État R-HEALTH :
- 13 domaines VERT ;
- 3 domaines VERT ÉVOLUÉ ;
- 4 domaines ORANGE de validation incomplète ;
- 0 domaine ROUGE systémique démontré ;
- conclusion : base saine pour poursuivre l'industrialisation.

VERT ÉVOLUÉ :
- le comportement actuel peut diverger d'une ancienne attente ;
- s'il est cohérent avec les propriétaires et les validations plus récentes, il devient une vérité moteur acceptable ;
- un ancien test contradictoire ne doit pas forcer un retour à l'ancienne implémentation.

Règle de lecture des tests :
- le nombre brut de tests rouges n'est plus un indicateur suffisant de santé ;
- avant correction, classer un échec préexistant : test/API/fixture obsolète, harness incomplet, contrat historique remplacé, ou panne runtime actuelle reproduite ;
- ne corriger le moteur que pour une panne actuelle ou la violation d'un contrat encore valide ;
- la non-régression des futurs ZIP doit d'abord préserver les capacités R-HEALTH du HEAD et ne pas introduire de nouvelle panne gameplay.

État d'industrialisation déjà visible au checkpoint :
- ARCH-01→40 ;
- CONTACT-01→15 ;
- DIP-01→03 ;
- GAME_CONTACT_FIRST / GAME_CONTACT_CAUTIOUS / GAME_CONTACT_AMBASSADOR ;
- ENE-15 ;
- les anciennes TODO « reprendre à ARCH-30 » et « intégrer ENE-15 » sont donc obsolètes.

Points encore ouverts au moment de l'interruption :
- choisir le prochain lot depuis les missions réellement restantes dans la Bible documentaire puis le confronter au HEAD ;
- traiter le raccord CONTACT-10→CONTACT-11 dans le lot missionnel prévu ;
- compléter les quatre domaines ORANGE uniquement lorsqu'un chantier traverse leur périmètre : tutoriel complet, maps/population, UI visuelle, audio/caméra/déplacement/physique ;
- poursuivre le profilage CPU global séparément de R-HEALTH ;
- revalider les scénarios multi-map/reload complexes drones, balise, Save et TP uniquement lorsque ces périmètres seront de nouveau touchés.

Règle de priorité documentaire :
1. décision utilisateur la plus récente ;
2. validation runtime en jeu / comportement observable ;
3. Contrat Gameplay Opérationnel V2 + addenda courants, dont TP_AUTONOMY_CONTRACT_2026-09-14.md ;
4. MASTER / ARCHITECTURE / ROADMAP / DEV_HISTORIQUE ;
5. annexes et documents historiques.

Les DOCX et recovery checkpoints historiques restent des sources utiles de décision et de contexte.
Ils ne remplacent jamais le HEAD courant lorsqu'une décision ou une validation plus récente existe.

Règle spécifique trigger/cible missionnelle :
- conserver la distinction IMI REVEAL-ONLY / SAME-DEFINITION / SAME-INSTANCE ;
- ne pas réintroduire de migration automatique de sauvegarde rejetée ;
- ne déclarer PASS qu'après validation du cycle réel
  chargement → MissionManager → Planner → ObjectM0 → ActionBridge → interaction.

Discipline :
- HEAD courant seul référentiel technique ;
- propriétaires existants avant toute nouvelle couche ;
- BASE partielle exacte limitée au périmètre ;
- aucun correctif moteur dicté par un test historique sans reproduction de la panne actuelle ;
- map-registry.js reste protégé.
