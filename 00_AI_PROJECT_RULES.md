FIRST FILE TO READ — Any AI or developer working on this repository MUST read this file before inspecting any other project file.

RÈGLE ABSOLUE — DOCUMENTS DE RÉFÉRENCE
Ne jamais deviner les documents de référence.
Ne jamais utiliser un DOCX ou une TODO historique comme référentiel par défaut.
Avant toute mise à jour documentaire, lire docs/README.txt.
Seuls les fichiers listés dans docs/README.txt comme “documents de référence officiels maintenus” peuvent être modifiés dans ce cadre.
Si la liste de docs/README.txt et ce fichier divergent, docs/README.txt fait foi.
Si l'utilisateur dit “mets à jour les documents de référence”, ne chercher aucun autre document : lire docs/README.txt, utiliser exactement sa liste, et rien d'autre.

RÈGLE ABSOLUE — BASE DE TRAVAIL
Toujours repartir du dépôt GitHub courant / commit explicitement indiqué.
Ne jamais repartir d’un ZIP local ancien ou d’un fichier issu d’une conversation précédente.

RÈGLE ABSOLUE — PREUVE AVANT CONCLUSION TECHNIQUE

Toute affirmation « absent », « régressé », « à ajouter », « à refaire » ou « propriétaire à modifier » doit être précédée d'une vérification explicite dans le HEAD.

Si une fonctionnalité ou un patch antérieur est signalé comme déjà intégré/validé, commencer par rechercher son implémentation dans le HEAD et suivre son chemin d'exécution réel.

Interdiction de proposer de réimplémenter une fonctionnalité avant d'avoir démontré que son implémentation actuelle est absente ou défectueuse.

Un fichier qui ne semble pas utiliser une fonctionnalité ne prouve pas que celle-ci est absente : vérifier son propriétaire et ses raccords.

En cas de contradiction entre le constat et l'historique validé : STOP diagnostic, résoudre la contradiction avant toute stratégie.

Chaque stratégie doit distinguer : CONFIRMÉ PAR LE HEAD / CONFIRMÉ PAR HISTORIQUE VALIDÉ / NON ENCORE PROUVÉ.

Aucun élément « NON ENCORE PROUVÉ » ne peut justifier une modification.

CHECKPOINT AVANT STRATÉGIE

Avant de proposer les fichiers à modifier, produire mentalement la chaîne complète :

donnée → propriétaire → instance runtime → événement canonique → consommateur.

Pour chaque rupture annoncée, identifier la ligne/le bloc du HEAD qui la démontre.

Si la rupture n'est pas localisée, poursuivre l'audit ; ne pas proposer de correctif.

RÈGLE ABSOLUE — DÉMARRAGE DE CHAQUE NOUVEAU CHANTIER

1. Le SHA du dernier commit fourni par l'utilisateur est la source de vérité et le point de départ obligatoire.
2. Avant toute modification, auditer ce commit et reconstituer la dernière base stable à partir de CE commit.
3. Avant toute décision technique, identifier le propriétaire dans le “Registre canonique des propriétaires” de docs/ARCHITECTURE\_TECHNIQUE.md. Si un propriétaire y est défini, il prime sur toute nouvelle architecture ou inférence.
4. Interdiction de remplacer un fichier du commit par une copie locale, un ancien ZIP ou un fichier d'une conversation précédente.
5. Un fichier local ne peut servir de copie technique que si son Git blob SHA est vérifié identique au blob du commit de départ ; sinon il est rejeté.
6. liste de fichiers verrouillée après le GO ;
7. comparaison des mêmes tests sur deux copies BASE/CANDIDAT ;
8. Avant livraison d'un cumulatif, comparer chaque fichier modifié à sa version du commit de départ et vérifier que les fonctions déjà validées présentes dans ce même fichier n'ont pas régressé.
9. abandon total d’une tentative rejetée au lieu d’un correctif empilé.
10. Si la version exacte d'un fichier du commit ne peut pas être obtenue ou vérifiée, ne pas reconstruire approximativement : demander le fichier ou refuser la livraison.
11. Un correctif cumulatif doit cumuler les travaux validés depuis le dernier commit de référence ; il ne doit jamais réinjecter une version antérieure d'un fichier partagé.
pas de fichiers versionnés dans les patchs committables ;
ZIP = uniquement fichiers modifiés ;
pas de README parasite ;
pas de .bat/.ps1/.patch sauf demande explicite ;
ne jamais réintroduire une tentative rejetée ;
vérifier la TODO active avant de déclarer un chantier terminé ;
lire MASTER.md, ARCHITECTURE\_TECHNIQUE.md, la TODO active et les autres références officielles avant toute passe structurante ;
BlueFox Odyssey - Référence projet
Méthode de travail
* Avant toute correction : diagnostic approfondi.
* Audit complet du fichier concerné.
* Audit de son interaction avec le reste du projet.
* Exécution de tests dans l'environnement disponible.
* Demande des fichiers manquants si nécessaire.
* Livraison uniquement après validation technique.
* Avant toute livraison audit et réfutation individuellement de tous les consommateurs directs et indirects des fichiers modifiés.
Engagement qualité
* Ne plus annoncer un correctif comme terminé avant validation.
* Signaler explicitement les hypothèses restantes.
* Privilégier un refus de livraison à une livraison non vérifiée.
* CUO Lab / MAP Test / jeu : même rendu MSC ;
map-registry.js protégé ;

DOCUMENT SOURCE
Cahier\_des\_Charges\_BlueFox\_Odyssey updated
BlueFox\_BIBLE\_MAIN\_MISSIONS\_NORMALISEES\_V2
BlueFox\_CUO\_v2\_Production\_complet
CUM  \& CUM V2
CUO\_Lab\_BANC\_VALIDATION\_3D
CONVENTIONS\_MAPS\_IMAGES

IMI — CONTRAT IA D'INTÉGRATION DES MISSIONS

BlueFox\_Contrat\_Gameplay\_Operationnel\_V2\_Historique\_2026-08-28\_MAJ

R-health 2026-09-12

