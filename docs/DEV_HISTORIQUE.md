# BLUEFOX ODYSSEY — DEV HISTORIQUE

## Session du 15 août 2026 — Audit Bible / CUO / moteur et stratégie de patrons

### Base
- V5 Stable : `d59376559e71032b478fb01a84fdb9bdd6611736`.

### Audit documentaire
- Bible principale : 182 missions normalisées.
- Principe confirmé : la narration reste souveraine ; la technique traduit sans réécrire.
- Les formulations « comparer », « comprendre », « reconnaître », « déduire » ne nécessitent pas systématiquement un moteur spécialisé.
- Les MSC associées doivent distinguer trois rôles : triggerContext, objectiveSubject, scenarioSupport.

### Audit moteur
Présent :
- triggers d'interactions et d'exploration ;
- mémoire persistante ;
- plusieurs missions actives ;
- fan-out passif ;
- un événement révèle au maximum une mission ;
- targetBinding contractuel ;
- instanceId/mapId/zoneId dans les événements ;
- mission instanciable par map ;
- infrastructure de spawn MSC via site.establish.

Écarts ciblés :
- targetBinding=instance non propagé jusqu'au choix exact d'ActionBridge ;
- objectifs actifs sans distinctBy générique ;
- agrégation multi-map/biome à ajouter ;
- spawn MSC missionnel à généraliser ;
- durée/proximité/délai ;
- excursion/retour ;
- effets réputation/branche/faits.

### Audit CUO
- ObjectLibrary porte déjà actions, états, familles, tags, recherche, ressources et progression.
- tech_relic, stele, arch et plusieurs objets archéologiques utilisent déjà une sémantique d'instance.
- composants techniques présents : pulse_core, memory_capsule, relay_block, logic_prism, survey_beacon.
- drones fonctionnels et PNJ existants.
- besoin : ajouter speciesId/factionId aux types de créatures/PNJ pertinents.

### MSC historiques
Les solutions anciennes ne doivent pas être recréées.
Parmi les scènes présentes dans l'arborescence V5 :
- MSC-CUSTOM-ASTROLOGY
- MSC-CUSTOM-CARRIERE
- MSC-CUSTOM-CARRIEREDECRISTAUX
- MSC-CUSTOM-EPAVE-1DRONE
- MSC-CUSTOM-EPAVE-MAJEUR
- MSC-CUSTOM-ETABLI
- MSC-CUSTOM-FOYER-ANCIEN
- MSC-CUSTOM-FUNA-PARENTAL
- MSC-CUSTOM-HABITAT-RUINE
- MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP
- MSC-CUSTOM-MACHINE-ABANDONNEE
- MSC-CUSTOM-NID-PROTECTEUR
- MSC-CUSTOM-RUINE-MODULAIRE1/2/4
- MSC-CUSTOM-SANCTUAIRE-RING
- MSC-CUSTOM-WALL-RUIN-COLLAPSED
- MSC-CUSTOM-WALL-RUIN-STRAIGHT
- MSC-CUSTOM-WORKED-STONE-BLOCK
- MSC-CUSTOM-BASE-DRONE-FONCTIONEL
- MSC-CUSTOM-HAUTEUR

### Décision architecture missions
- Limiter le nombre de patrons.
- Mutualiser les variantes avec des interrupteurs.
- Développer chaque patron en parallèle du raccord moteur associé.
- Cible de travail : environ 8 familles de patrons au total.
- Après validation : intégrer T01–T12.
- Ensuite seulement industrialiser les 182 missions.

### Ration
`survival.rationRecipe` est déjà référencé dans le moteur ; audit requis avant création de contenu parallèle.

### Discipline documentaire
Les documents officiels sont ceux de `docs/README.txt`.
Les DOCX et TODO historiques ne doivent pas être utilisés comme sources de pilotage.
