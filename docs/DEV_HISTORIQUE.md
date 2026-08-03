# BLUEFOX ODYSSEY — DEV HISTORIQUE

## Session du 2026-07-31

### Objectif
Remplacer le système d’interactions codé en dur dans `engine/world-engine.js` par une logique générique pilotée par les métadonnées des objets.

### Architecture visée
- profil d’interaction dérivé des métadonnées ;
- actions supportées : collecter, inspecter, observer, analyser, extraire ;
- message générique ;
- événement de mission correspondant à l’action ;
- retrait de l’objet uniquement s’il est collectable ;
- conservation des objets inspectables ou observables ;
- autonomie fondée sur l’éligibilité générique à l’interaction.

### Incident
Le patch livré n’est pas fonctionnel.
Des références à `Crystal` / `crystal` sont toujours présentes dans `world-engine.js`.
Le patch doit être considéré comme abandonné et ne doit pas être intégré comme base fiable.

### Décision
La prochaine reprise doit recommencer depuis la version GitHub courante et suivre le protocole complet :
diagnostic, audit du fichier, audit des dépendances, reproduction, tests, correction, puis non-régression.

### Clôture
Aucun correctif `world-engine.js` n’est validé pendant cette session.
Les documents de référence sont mis à jour pour refléter cet état.
# Session du 1er août 2026 — Sprints Missions 1 à 4

- Réactivation du moteur multi-missions avec mission principale unique.
- Progression passive des missions secondaires et suppression du clignotement UI.
- Cycle de vie persistant : disponible, active, pause, terminée et échouée.
- Priorisation automatique expliquée et changement différé après l’action en cours.
- Catalogue déclaratif raccordé au registre central, recalcul historique idempotent.
- Chaîne locale obligatoire et instanciée par Map : `camp → refuge → base`.
- Ingénierie I déverrouillée après cinq roches ou cristaux distincts.
- Menu Missions complet avec notes personnelles de BlueFox.
- Inventaire séparé entre sac et stockage partagé des camps.
- Glisser-déposer manuel et dépôt automatique au camp de base principal.
- `map-registry.js`, `CharacterController` et `PathPlanner` inchangés.
- Tests syntaxiques et logiques réussis ; validation navigateur encore requise.

# Session du 2 août 2026 — Générateur V1 et préparation CUO

- Formalisation des pondérations de biomes, tailles, richesses, ressources et
  micro-scènes dans `map-generation-rules.js`.
- Ajout de `map-generator.js` : seed par partie, génération incrémentielle et
  sauvegarde des définitions complètes.
- Crystal confirmée comme Map narrative fixe 1/1, hors tirage.
- Progression des premières découvertes fixée à 2, 4 et 6 plateaux.
- Compatibilité protégée avec l’ancienne UI React et les sauvegardes V1/V2.
- Budgets recalibrés de 60–75 à 132–150 objets selon la taille de Map.
- Maps 6/6 dotées de 1 à 3 micro-scènes principales.
- Suppression de l’exploration locale purement aléatoire ; exploration d’un
  plateau réservée à une mission ou une demande joueur.
- Protection des trajets vers les passages contre les collectes de reprise.
- Nom d’une terre inconnue masqué jusqu’à la découverte officielle.
- Sélection des textures corrigée : priorité aux textures associées, répétition
  permise, replis uniquement dans un biome identique ou compatible.
- Décision suivante : construire un banc 3D séparé pour valider visuellement le
  CUO avant son activation progressive dans les biomes.

# Session du 3 août 2026 — Catalogue Universel des Missions

## Objectif

Transformer le catalogue Word des missions en un référentiel lisible pour le
développement du moteur, sans écraser les missions déjà intégrées.

## Décisions

- Le référentiel est nommé **Catalogue Universel des Missions — CUM**.
- Le Word reste la source narrative d’origine.
- Le CUM devient la source documentaire de classification et de préparation à
  l’intégration.
- Une mission principale doit rester lisible sur une seule ligne.
- Les missions filles et petits objectifs doivent rester consultables et
  priorisables.
- Les vues **Monde** et **Locale** sont distinguées.
- Les déclencheurs techniques conservent en parallèle les pensées de BlueFox et
  ses commentaires de journal.
- Les missions dormantes, les obsessions différées et les convergences d’indices
  sont validées comme ressorts narratifs.
- La personnalité future sera représentée par des axes non exclusifs influencés
  par les émotions et les choix.

## Production documentaire

- analyse du catalogue Word de 22 pages ;
- identification de **35 missions principales** et de trois sous-missions par
  mission ;
- extraction initiale des missions, sous-missions, prérequis, déclencheurs et
  récompenses ;
- création de plusieurs prototypes CUM étendus ;
- décision finale de conserver un format opérationnel limité à six feuilles :
  Missions, Objectifs, Narration, Dépendances, Moteur et Tableau de bord ;
- production d’un lot de six classeurs séparés et d’un assembleur local.

## Limites constatées

- le dernier lot de six feuilles est une extraction structurée, pas encore le
  CUM de production final ;
- certains champs moteur restent génériques ou à auditer ;
- la narration complémentaire n’est pas encore complète ;
- les doublons avec M0 ne sont pas encore audités mission par mission ;
- les prototypes C0/C1/C2 ne sont pas autoritaires et ne sont pas intégrés au
  jeu ;
- aucun code du moteur n’a été modifié pendant cette session documentaire.

## Reprise validée

Poursuivre la consolidation du CUM à partir du Word, vérifier exhaustivement les
105 sous-missions et leurs prérequis, puis effectuer le mapping vers M0 avant
toute intégration au code.
