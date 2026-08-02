# Documents de référence — BlueFox Odyssey

Référence logicielle : **V0.16.20 + correctifs cumulatifs + générateur V1**

Point documentaire : **2 août 2026 — générateur semi-aléatoire et préparation CUO**

## Documents faisant autorité

1. [MASTER_BLUEFOX_ODYSSEY.md](MASTER_BLUEFOX_ODYSSEY.md) — vision, vocabulaire et règles permanentes.
2. [ARCHITECTURE_TECHNIQUE.md](ARCHITECTURE_TECHNIQUE.md) — responsabilités des fichiers, dépendances et fichiers protégés.
3. [CONVENTIONS_MAPS_IMAGES.md](CONVENTIONS_MAPS_IMAGES.md) — nommage et association Maps, plateaux et images.
4. [ETAT_REPRISE.md](ETAT_REPRISE.md) — état exact du prochain démarrage de session.
5. [ROADMAP_TODO.md](ROADMAP_TODO.md) — seule liste de tâches active.
6. [PLAN_TESTS_V0.16.20.md](PLAN_TESTS_V0.16.20.md) — validation fonctionnelle avant promotion du point de sauvegarde.
7. [DEV_HISTORIQUE.md](DEV_HISTORIQUE.md) — décisions, incidents et livraisons.
8. [SPRINT_M0_FONDATION_IA.md](SPRINT_M0_FONDATION_IA.md) — architecture et test express du premier système de missions.
9. [CUO_BANC_VALIDATION_3D.md](CUO_BANC_VALIDATION_3D.md) — spécification du banc autonome de matérialisation, hitbox et validation des objets.

## Fichiers de compatibilité

- `MASTER.md` renvoie vers le document maître canonique.
- `TODO.md` renvoie vers la roadmap canonique.

Ils sont conservés pour les anciens repères et ne doivent plus recevoir de
contenu concurrent.

## Règle de divergence

En cas de contradiction, appliquer cet ordre :

1. document maître ;
2. architecture technique ;
3. conventions Maps/images ;
4. état de reprise ;
5. roadmap.

Une affirmation non vérifiée dans le jeu doit rester marquée **à tester**. Une
livraison syntaxiquement valide n’est pas considérée comme fonctionnellement
validée avant un lancement réel et l’exécution du plan de tests.

## Règle de base cumulative

Pendant une chaîne de hotfixes, le fichier source de chaque nouveau sprint est
le dernier fichier cumulatif validé ou livré, jamais à nouveau la version
GitHub initiale. GitHub ne redevient la base qu’après intégration et point de
sauvegarde explicite de l’ensemble des correctifs.
