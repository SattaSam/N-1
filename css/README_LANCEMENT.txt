BLUEFOX ODYSSEY V0.16.20 — LANCEMENT WEBGL LOCAL

INSTALLATION DES MISES À JOUR SANS IMAGES
=========================================

À partir de la V0.16.9, les ZIP de mise à jour n'embarquent plus les fichiers
PNG, JPG, JPEG et WEBP du dossier Images.

Pour installer une mise à jour :
1. conserver le dossier Images déjà présent sur l'ordinateur ;
2. extraire le ZIP à la racine du jeu, à côté du dossier Images ;
3. accepter le remplacement des fichiers de code ;
4. ne pas supprimer le dossier Images ;
5. double-cliquer sur LANCER_BLUEFOX.bat.

Le jeu charge les scènes et les plateaux avec des chemins locaux relatifs :
./Images/NomDuFichier.png

Après l'ajout ou le retrait d'images, lancer GENERER_CATALOGUE_IMAGES.bat.
Le catalogue sera reconstruit depuis le contenu réel du dossier local.

Si des fichiers ont été ajoutés ou renommés :
1. vérifier que Images est exactement à côté de index.html ;
2. double-cliquer sur VERIFIER_ET_REPARER_IMAGES.bat ;
3. fermer l'onglet ouvert directement ;
4. lancer ensuite LANCER_BLUEFOX.bat.

Lancement :
1. Décompresser entièrement l'archive.
2. Conserver le dossier Images à côté de index.html.
3. Double-cliquer sur LANCER_BLUEFOX.bat.
4. Garder la petite fenêtre du lanceur ouverte pendant le jeu.
5. Utiliser Chrome, Edge ou Firefox avec WebGL activé.

IMPORTANT :
L'ouverture directe de index.html utilise le protocole file://. Les vignettes
CSS peuvent alors apparaître tandis que WebGL refuse les mêmes fichiers comme
textures 3D. Le lanceur utilise uniquement l'adresse locale 127.0.0.1 et ne
nécessite aucune connexion Internet.

Cette version contient localement le moteur et le modèle BlueFox. Les images
de biome restent dans le dossier Images de l'utilisateur. Aucune dépendance
n'est téléchargée au lancement.

Fonctions présentes :
- monde 3D à deux biomes ;
- modèle BlueFox animé ;
- autonomie, déplacements et contournement des obstacles ;
- caméra libre avec recentrage progressif ;
- collecte, inventaire, énergie et repos ;
- missions, recherche, journal et personnalité ;
- boussole d'influence et système Planète ;
- sauvegarde locale et simulation des absences.

Correctifs conservés de la V0.13.1 :
- orientation du modèle corrigée : BlueFox regarde désormais dans le sens de
  son déplacement ;
- jointure entre les deux zones recouverte par une transition texturée
  irrégulière mélangeant progressivement les deux sols ;
- pierres du chemin conservées au-dessus de la transition.

Refonte V0.14 :
- ancien sous-système 3D désactivé et remplacé, sans rustine cumulative ;
- moteur séparé en modules monde, maps, personnage, locomotion et caméra ;
- pivot physique indépendant du modèle visuel GLB ;
- normalisation automatique de la taille et contact permanent avec le sol ;
- accélération, freinage, rotation et animation fondés sur la vitesse réelle ;
- collisions circulaires stables, glissement et anticipation des obstacles ;
- caméra indépendante avec suivi amorti et recentrage après 3,5 secondes ;
- chargement réel d'une seule map à la fois ;
- passage Nord vers les Ruines et passage Sud vers la Plaine ;
- première découverte autorisée uniquement en partie active et connectée ;
- retour autonome possible uniquement vers une map déjà mémorisée ;
- ressource retirée seulement après l'animation de récolte puis réapparition ;
- sauvegarde de position séparée pour la nouvelle architecture ;
- interface et Journal conservés sans modification fonctionnelle.

Bibliothèque d'objets V0.14.1 :
- amas de cristaux composés de plusieurs éclats ;
- plantes à fibres et bulbes lumineux ;
- roches extraterrestres irrégulières ;
- arbres extraterrestres avec collision limitée au tronc ;
- stèles anciennes avec runes lumineuses ;
- arches réellement traversables entre leurs deux piliers ;
- bassins lumineux non bloquants ;
- volumes physiques définis indépendamment des volumes visuels ;
- répartition différente selon le biome et points remarquables imposés.

Contrôle 3D V0.14.2 :
- clic sur le bouton caméra : recentrage derrière BlueFox ;
- double-clic : bascule entre ancrage automatique et suivi libre ;
- en suivi libre, la caméra conserve son point de vue tout en accompagnant
  les déplacements de BlueFox ;
- aiguille de boussole synchronisée avec l'orientation réelle du personnage ;
- marqueur visuel rétractable à chaque destination suggérée sur le plateau ;
- limitation stricte du déplacement par image pour supprimer les sauts ;
- récupération automatique d'une position invalide ou d'un blocage local.

Correctifs V0.14.3 :
- les animations Harvest du GLB restent actives pendant toute la collecte ;
- Harvest_Heavy est utilisé en priorité pour les cristaux ;
- Harvers_Samall/Harvest_Medium sont utilisés pour les fibres ;
- les passages se déclenchent quand BlueFox atteint réellement leur zone ;
- les accès et points d'arrivée sont dégagés des objets aléatoires ;
- délai de sécurité empêchant un retour immédiat vers la map précédente ;
- boussole transformée en cadran circulaire sans gros encadrement ;
- aiguille rouge liée au cap réel de BlueFox ;
- horloge persistante fondée sur des journées planétaires de 20 heures ;
- indication JOUR/NUIT, température et éclairage 3D synchronisés.

Améliorations V0.14.4 :
- menu Planète redimensionné automatiquement sur PC, tablette et smartphone ;
- globe recentré dans sa zone et panneau cartographique remonté ;
- boussole de la planète plus compacte avec images des biomes ;
- clic sur une vignette : état exploré, ressources et synthèse de BlueFox ;
- bouton séparé pour suggérer ensuite la direction sélectionnée ;
- directions écrites en français, y compris sur les passages 3D ;
- fenêtre Mission rétractable en un bandeau discret et dépliable d’un clic ;
- état rétracté ou déplié mémorisé entre deux lancements ;
- végétation, cristaux, bassins et runes animés avec des mouvements légers ;
- panorama déplacé subtilement avec la rotation de caméra.

Améliorations V0.14.5 :
- menu Planète remonté avec titre et marges fortement réduits ;
- globe, boussole cartographique, fiche et espace futur visibles sans gaspillage ;
- vignettes compactes directement intégrées aux quatre directions ;
- vignettes alimentées exclusivement par les images de scène 1nomdelimage ;
- trames 01, 01_1, 01_2… réservées au plateau jouable ;
- chaque vignette reste cliquable pendant les mises à jour du jeu ;
- activité autonome maintenue même lorsque le joueur consulte un menu ;
- garde-fou relançant une action avant 30 secondes d’inactivité ;
- Intention actuelle synchronisée avec déplacement, récolte, passage et mission ;
- marqueur lumineux 3D affiché sur la destination choisie.

Refonte des trajets V0.14.6 :
- nouveau planificateur de chemins indépendant du modèle visuel ;
- grille de navigation calculée depuis les volumes physiques des obstacles ;
- création de points de passage autour des roches, arbres et structures ;
- lissage automatique pour éviter les détours artificiels en zigzag ;
- destination finale conservée avec précision après le contournement ;
- nouveau calcul élargi lorsqu’un blocage local est détecté ;
- ligne lumineuse discrète représentant l’itinéraire réellement choisi ;
- itinéraire masqué à l’arrivée, pendant une récolte ou lors d’un passage de map.

Améliorations V0.14.7 :
- l’encadré « En ce moment » indique l’action exacte : déplacement, collecte
  ciblée, exploration, repos, alimentation ou recherche ;
- « Intention actuelle » décrit désormais le projet prioritaire à moyen terme
  et reste stable pendant les actions courtes de BlueFox ;
- les bulles au-dessus de BlueFox annoncent ses changements d’activité ;
- un bouton bulle placé à côté du contrôle caméra permet de masquer ou
  réafficher ces paroles, avec mémorisation du choix ;
- le repère BF est recentré géométriquement dans la boussole ;
- BlueFox se tourne vers la ressource avant de lancer l’animation Harvest ;
- de courtes routines autonomes de repos, recherche et alimentation complètent
  ses activités sans interrompre sa mission globale ;
- une ombre de contact discrète renforce l’ancrage du personnage sur le sol.

Correctifs V0.14.8 :
- suppression de la boucle de mise à jour qui pouvait figer le jeu à
  l’ouverture du menu Planète ;
- transformations du menu Planète rendues idempotentes après chaque remontage
  de l’interface ;
- boussole replacée à son emplacement fixe en jeu ;
- aiguille recréée automatiquement si l’interface la remplace ;
- chemins diagonaux interdits entre deux obstacles trop proches ;
- blocage détecté selon la progression réelle vers la cible et non selon le
  simple mouvement du modèle ;
- recalcul élargi du trajet si BlueFox glisse sans se rapprocher de sa cible.

Stabilisation V0.14.9 :
- points d’arrivée calculés depuis la direction réelle de chaque passage ;
- transitions compatibles avec les futures sorties Nord, Sud, Est et Ouest ;
- recherche d’un point d’entrée dégagé des volumes physiques ;
- BlueFox regarde vers l’intérieur de la nouvelle map après le chargement ;
- caméra replacée pendant le fondu pour éviter un rattrapage visuel brutal ;
- destination cliquée à l’intérieur d’un obstacle déplacée vers le point libre
  le plus proche ;
- destination finale corrigée mémorisée par le contrôleur pour empêcher les
  recalculs répétés vers une position inaccessible ;
- détection de progression corrigée : le nouveau trajet n’est plus écrasé par
  l’ancienne mesure de distance à la fin de l’image.

Refonte des animations V0.15.0 :
- analyse des pistes réellement embarquées dans le GLB BlueFox ;
- suppression, au chargement, des translations de l’os Root contenues dans
  les animations de course et de récolte ;
- déplacement du personnage confié exclusivement au pivot physique du moteur ;
- animations du squelette conservées sans pouvoir décaler tout le modèle ;
- états Idle, Walk et Run sélectionnés selon la vitesse réelle ;
- hystérésis entre les états pour supprimer les changements nerveux près des
  seuils de vitesse ;
- cadence de marche et de course synchronisée séparément avec la locomotion ;
- fondations des passages et trajets sûrs de la V0.14.9 conservées.
- globe du menu Planète verrouillé dans un rapport carré 1:1 ;
- texte de présentation maintenu hors du globe afin de ne plus déformer sa
  hauteur ni masquer sa représentation.

Bibliothèque de biomes V0.15.1 :
- aiguilles cristallines basses pour enrichir la Plaine des Cristaux ;
- frondes extraterrestres traversables intégrées aux deux biomes ;
- éventails de spores lumineux propres aux Ruines d’Émeraude ;
- fragments de structures anciennes avec traces énergétiques ;
- répartition déterministe différente pour chaque biome ;
- volumes décoratifs volontairement non bloquants pour préserver la fluidité
  des chemins et les zones d’arrivée ;
- animations légères de respiration végétale et de pulsation lumineuse ;
- passages, entrées et sorties toujours protégés de la génération aléatoire.

Génération spatiale V0.15.2 :
- rayon d’occupation propre à chaque famille d’objet 3D ;
- suppression des superpositions entre roches, ressources, végétation et
  décorations ;
- espace réservé autour des arches, stèles, arbres et bassins remarquables ;
- large zone sûre autour des points d’apparition et des passages ;
- corridors continus protégés entre l’entrée et chaque sortie de map ;
- densité conservée en périphérie sans obstruer les trajets principaux ;
- davantage de tentatives de placement avant d’abandonner proprement un objet
  lorsque la zone est déjà suffisamment dense.

Catalogue d’images V0.15.3 :
- détection des scènes nommées 4NomDuBiome, 5NomDuBiome, etc. ;
- conversion automatique du numéro de scène vers le préfixe 04, 05, etc. ;
- association préférentielle avec 04_1, 04_2, 04_3… ;
- aucun nombre de plateaux imposé : zéro, un ou plusieurs sont acceptés ;
- plateaux classés automatiquement selon leur suffixe numérique ;
- plateaux sans scène conservés comme éléments orphelins à associer plus tard ;
- catalogue cumulatif pouvant être réactualisé pendant que le dossier Images
  continue de recevoir de nouveaux fichiers ;
- noms de biomes rendus lisibles depuis les espaces, tirets et majuscules ;
- formats PNG, JPG, JPEG et WEBP reconnus.

Pipeline automatique V0.15.4 :
- dossier Images intégré à la structure du jeu ;
- script Windows GENERER_CATALOGUE_IMAGES.bat utilisable par double-clic ;
- manifeste JavaScript reconstruit depuis les fichiers réellement présents ;
- catalogue chargé avant l’initialisation du moteur 3D ;
- définition automatique des nouveaux biomes détectés ;
- scène utilisée comme terrain de repli lorsqu’aucun plateau n’existe encore ;
- zones générées selon le nombre de plateaux associés ;
- graine stable et palette initiale attribuées à chaque nouvelle map ;
- aucune liaison inventée : une map reste isolée jusqu’à la définition explicite
  de ses passages.

Menu Planète V0.15.5 :
- espace « Biomes catalogués » alimenté par le manifeste du dossier Images ;
- vignette utilisant exclusivement l’image de scène 4NomDuBiome ;
- numéro, nom et quantité de plateaux visibles sur chaque vignette ;
- sélection d’une vignette ouvrant une fiche détaillée ;
- distinction explicite entre images disponibles et passage configuré ;
- aucune suggestion de voyage vers une map encore isolée ;
- actualisation du menu si le catalogue est enrichi avant son ouverture ;
- état vide discret lorsque les futures scènes ne sont pas encore importées.

Correctifs V0.15.6 :
- récolte des cristaux composée de Harvest_Heavy puis Harvest_Medium ;
- cadence légèrement accélérée pour limiter l’attente devant le gisement ;
- fin de séquence libérant immédiatement l’état d’animation figé ;
- quatre directions du menu Planète réservées aux maps voisines ;
- directions sans voisin cartographié affichées en noir ;
- image d’une map voisine révélée uniquement après son exploration ;
- informations détaillées masquées tant que la map reste inconnue ;
- nouvel encadré « Zone actuelle » au sommet du volet droit ;
- description et point de vue de BlueFox alignés à gauche ;
- vignette de la scène actuelle affichée à droite sans déformation.

Correctifs V0.15.7 :
- distance d’approche calculée selon la collision réelle de chaque ressource ;
- BlueFox s’arrête hors du gisement et s’oriente vers lui avant la récolte ;
- fin de récolte nettoyant explicitement le verrou d’interaction ;
- réapparition des ressources protégée par un délai propre à chaque objet ;
- mémoire des maps explorées centralisée dans le moteur 3D ;
- sauvegarde immédiate d’une nouvelle découverte ;
- menu Planète actualisé automatiquement après un passage de map ;
- état exploré/inexploré indépendant de la structure visuelle du menu.

Correctifs V0.15.8 :
- douze positions de récolte candidates calculées autour de chaque ressource ;
- exclusion des positions chevauchant un obstacle ou une bordure de plateau ;
- choix prioritaire de l’approche dont le trajet est le plus court ;
- pathfinding calculé sans traiter la ressource ciblée comme un obstacle bloquant ;
- nouvelle tentative par un autre angle si BlueFox ne rejoint pas le gisement ;
- abandon propre après trois tentatives, sans téléportation ni boucle infinie ;
- conservation de l’orientation vers la ressource avant les animations Harvest.

Correctifs V0.15.9 :
- date planétaire fictive affichée dans le Journal ;
- calendrier structuré en sols, cycles et années ;
- temps écoulé depuis l’arrivée de BlueFox affiché en sols, heures et minutes ;
- ressenti de BlueFox calculé depuis les quatre traits réglés par le joueur ;
- deux tendances émotionnelles dominantes résumées dans le Journal ;
- badge émotionnel synchronisé avec cette synthèse ;
- informations temporelles actualisées pendant que le Journal reste ouvert ;
- présentation compacte pour conserver le Journal sur une seule page.

Correctifs V0.15.10 :
- reprise autonome accélérée après chaque récolte ;
- courte phase de récupération visuelle avant la prochaine décision ;
- patrouille locale créée si aucune ressource active n'est disponible ;
- transition de map protégée par une finalisation systématique ;
- découverte enregistrée seulement après chargement réussi de la destination ;
- délai maximal empêchant le voile de transition de rester bloqué ;
- retour propre à l'activité si un passage échoue ;
- caméra, position sûre et autonomie recalées après chaque passage réussi.

Correctifs V0.15.11 :
- comptage des recalculs de chemin réellement infructueux ;
- abandon propre après trois tentatives sans progression ;
- aucune téléportation utilisée pour sortir d'un blocage ;
- cible de ressource ou passage annulée proprement ;
- explication contextuelle du changement de décision ;
- reprise autonome accélérée après l'abandon d'un trajet ;
- construction de la nouvelle map avant destruction de l'ancienne ;
- conservation de la zone courante si la destination ne peut pas être créée.

Correctifs V0.15.12 :
- contrôle périodique de la position et de la cible de caméra ;
- détection des valeurs invalides après une longue session ;
- distance minimale et maximale sécurisée autour de BlueFox ;
- recentrage immédiat uniquement si la caméra devient incohérente ;
- mode ancré restauré après une récupération automatique ;
- positions caméra sûres mémorisées pendant le déplacement ;
- suivi libre conservé tant que ses coordonnées restent valides ;
- comptage interne des transitions terminées pour les futurs diagnostics.

Correctifs V0.15.13 :
- reprise contrôlée après retour sur un onglet masqué ;
- horloge d'animation recalée pour éviter un saut de simulation ;
- délai de passage sécurisé après le retour au premier plan ;
- caméra et cible de suivi revérifiées à la reprise ;
- autonomie relancée sans imposer de téléportation ;
- dimensions WebGL recalculées après changement d'affichage ;
- compteurs de transitions, collectes et récupérations internes ;
- diagnostic disponible avec BlueFox3D.getDiagnostics() dans la console.

Ajouts V0.16.0 :
- maps importées composées de un à six plateaux distincts ;
- dispositions adaptées automatiquement à 1, 2, 3, 4, 5 ou 6 zones ;
- six premiers plateaux associés retenus dans l'ordre des suffixes ;
- image de scène conservée comme panorama commun à toute la map ;
- images 04_1, 04_2… réservées aux surfaces jouables ;
- détection automatique de la zone actuellement parcourue ;
- nom de zone actualisé pendant les déplacements de BlueFox ;
- aucune sortie ni liaison entre maps générée automatiquement.

Ajouts V0.16.1 :
- chemins visibles reliant toutes les zones d'une même map ;
- liaison de chaque zone au plateau antérieur le plus proche ;
- largeur discrète intégrée aux couleurs du biome ;
- corridors internes réservés avant le placement des objets ;
- roches, ressources et végétation empêchées de fermer les chemins ;
- géométrie légère sans collision supplémentaire ;
- chemins limités à l'intérieur de la map ;
- passages entre maps toujours définis uniquement dans la topologie déclarée.

Ajouts V0.16.2 :
- mémoire persistante de chaque zone réellement visitée ;
- distinction entre map découverte et map entièrement explorée ;
- sauvegarde locale indépendante des zones et des maps ;
- événement d'interface émis lors d'une nouvelle découverte ;
- nom exact de la zone actuelle dans le menu Planète ;
- progression zones visitées / zones disponibles ;
- compteur d'exploration ajouté aux futurs biomes catalogués ;
- diagnostic 3D enrichi avec le nombre total de zones découvertes.

Ajouts V0.16.3 :
- sélection autonome d'une zone encore inconnue dans la map actuelle ;
- priorité donnée à la zone inexplorée accessible la plus proche ;
- cheminement réalisé par le pathfinding et les corridors internes ;
- activité « Exploration de… » affichée dans « En ce moment » ;
- bulle contextuelle expliquant le déplacement de BlueFox ;
- découverte enregistrée seulement lorsque BlueFox atteint réellement la zone ;
- reprise des autres activités après reconnaissance du plateau ;
- aucune exploration autonome d'une map encore inconnue.

Ajouts V0.16.4 :
- profil de biome déduit automatiquement depuis le nom de la scène ;
- profils volcanique, glaciaire, forestier, ruines, aquatique et désertique ;
- profils cristallin et extraterrestre générique en repli ;
- densité de roches adaptée au milieu ;
- proportion cristaux / fibres propre à chaque profil ;
- familles végétales et minérales variées selon le thème ;
- quantité de ressources ajustée au nombre de zones ;
- futures maps libérées du décor systématique des Ruines d'Émeraude.

Ajouts V0.16.5 :
- atmosphère visuelle propre à chaque profil de biome ;
- teinte du ciel et du brouillard adaptée au milieu ;
- couleur des lumières principale, ambiante et d'appoint harmonisée ;
- densité du brouillard ajustée pour préserver la lisibilité ;
- synchronisation conservée avec le cycle jour/nuit de 20 heures ;
- profil extraterrestre générique utilisé sans erreur en cas de thème inconnu ;
- changement d'atmosphère appliqué automatiquement au chargement d'une map.

Ajouts V0.16.6 :
- particules atmosphériques propres à chaque profil de biome ;
- cendres volcaniques et lueurs aquatiques ascendantes ;
- neige glaciaire, spores forestières et poussière désertique ;
- mouvements différenciés sans collision ni influence sur le pathfinding ;
- densité limitée à 24–48 particules pour préserver les performances mobiles ;
- visibilité renforcée la nuit et atténuée le jour ;
- particules remplacées proprement lors d'un changement de map ;
- diagnostic enrichi avec le profil actif et le nombre de particules.

Ajouts V0.16.7 :
- mesure légère de la fluidité réelle après une période de stabilisation ;
- trois niveaux automatiques : élevé, équilibré et allégé ;
- résolution interne réduite progressivement en cas de ralentissement ;
- quantité de particules ajustée sans reconstruire la scène ;
- ombres conservées en qualité élevée et équilibrée ;
- ombres désactivées uniquement si le mode allégé devient nécessaire ;
- restauration prudente de la qualité après plusieurs mesures fluides ;
- transitions et onglets masqués exclus des mesures de performance ;
- qualité active et fréquence mesurée ajoutées au diagnostic 3D.

Ajouts V0.16.8 :
- points remarquables modulaires propres aux huit profils de biome ;
- formations de lave, monolithes glacés et arbres anciens ;
- vestiges de ruines, bassins aquatiques et balises désertiques ;
- sanctuaires cristallins et compositions extraterrestres génériques ;
- un point remarquable pour trois zones, avec un maximum de deux par map ;
- orientation et position déterministes selon la graine de la map ;
- placement hors des entrées, sorties et corridors praticables ;
- aucune arche répétitive ajoutée aux futurs biomes ;
- volumes de collision hérités de chaque objet composant.

Ajouts V0.16.9 :
- 111 fichiers du dossier GitHub Images intégrés au build hors ligne ;
- scènes numérotées 1 à 27 associées automatiquement à leurs plateaux ;
- préfixes réels 010, 011… 027 désormais reconnus ;
- séparateurs souligné et tiret acceptés pour les plateaux ;
- doublons de zone filtrés avec priorité à la forme soulignée ;
- variante 26Bis conservée sans créer une seconde map concurrente ;
- scènes 1 et 2 reliées aux maps existantes sans perdre leurs passages ;
- noms des scènes utilisés pour déduire profil et palette de biome ;
- générateur de catalogue Node ajouté pour les environnements compatibles ;
- aucune liaison inventée pour les maps nouvellement détectées.

Ajouts V0.16.10 :
- règle permanente : les ZIP de mise à jour excluent les images de biome ;
- scènes et plateaux toujours chargés depuis le dossier local ./Images ;
- détection d'échec pour chaque texture de plateau ;
- détection d'échec pour chaque scène panoramique ;
- message rappelant de vérifier Images et de régénérer le catalogue ;
- un même fichier manquant n'est signalé qu'une fois par session ;
- journal enrichi avec le nom de l'asset local manquant ;
- liste des images manquantes disponible dans le diagnostic 3D.

Ajouts V0.16.11 :
- analyse locale des noms de scènes pour déduire des traits spécialisés ;
- bioluminescence, flore fongique, ambre et milieux humides reconnus ;
- verre, magnétisme, oasis, lave et glace reconnus ;
- climats tropicaux, vestiges urbains et reliefs flottants reconnus ;
- densités de roches et familles décoratives ajustées par ces indices ;
- ressources probables calculées depuis le profil et les traits ;
- description et point de vue de BlueFox générés pour chaque map ;
- indices, ressources et synthèse affichés dans le menu Planète ;
- génération toujours déterministe et aucune liaison ajoutée automatiquement ;
- ZIP de mise à jour toujours livré sans images de biome.

Ajouts V0.16.12 :
- chemins locaux bruts générés pour préserver accents et espaces sous Windows ;
- essai automatique du chemin brut et du chemin encodé dans le navigateur ;
- nouvelle tentative transparente avant de déclarer une image manquante ;
- plateaux et panoramas utilisent la même stratégie de résolution ;
- outil VERIFIER_ET_REPARER_IMAGES.bat ajouté à la racine ;
- reconstruction du catalogue depuis le dossier Images réellement installé ;
- lancement automatique du jeu après réparation réussie ;
- ZIP toujours livré sans les fichiers images de biome.

Ajouts V0.16.13 :
- panorama sphérique remplacé par un cylindre d'horizon adapté aux scènes ;
- image de décor rendue sans déformation verticale excessive ;
- polices principales du menu Planète agrandies ;
- catalogue des biomes masqué tant que BlueFox ne les a pas découverts ;
- espace libéré pour la zone actuelle et les informations connues ;
- hublot du Journal synchronisé avec l'image de scène de la map actuelle ;
- très léger mouvement de perspective derrière la vitre ;
- animation désactivée si le système demande une réduction des mouvements ;
- base prête pour enrichir progressivement les connaissances des biomes ;
- aucune progression cartographique numérotée ou prédéfinie ;
- le joueur peut envoyer BlueFox dans une direction encore inconnue ;
- une nouvelle map compatible est alors choisie par génération déterministe ;
- la liaison aller-retour est créée uniquement au moment de cette décision ;
- cette nouvelle topologie est sauvegardée localement ;
- BlueFox ne choisit jamais seul une première exploration inconnue ;
- première découverte autorisée en partie active, même sans connexion Internet ;
- ZIP de mise à jour toujours livré sans images de biome.

Ajouts V0.16.14 :
- cause du défaut de textures identifiée : restrictions WebGL en file:// ;
- lanceur Windows LANCER_BLUEFOX.bat ajouté ;
- mini-serveur HTTP strictement local intégré en PowerShell ;
- aucune installation de Node, Python ou serveur permanent nécessaire ;
- ouverture automatique sur 127.0.0.1 avec recherche d'un port libre ;
- types PNG, JPG, WEBP, GLB, JavaScript et CSS servis correctement ;
- cache désactivé pendant les tests pour afficher immédiatement les correctifs ;
- avertissement visible si index.html est encore ouvert directement ;
- fonctionnement entièrement hors ligne conservé ;
- ZIP toujours livré sans les images du dossier Images.

Ajouts V0.16.15 :
- panorama central non étiré, courbure limitée aux côtés ;
- une image de plateau correspond à une zone de 54 x 54 ;
- la surface d'une map grandit réellement avec son nombre de zones ;
- bandes colorées entre les zones supprimées ;
- éclairage neutralisé pour préserver les couleurs des textures ;
- retour à la base fonctionnel depuis le HUD et Planète ;
- mémoire des découvertes protégée contre l'ancienne interface ;
- chargement des premières explorations procédurales sécurisé ;
- cycle de 20 h réparti en 15 h de jour et 5 h de nuit.

Ajouts V0.16.16 :
- distinction stricte entre décors N... et textures de plateau 0N_x ;
- association N ↔ 0N prioritaire, avec repli déterministe autorisé ;
- une Zone joueur correspond désormais à une Map complète ;
- les 1 à 6 subdivisions internes sont nommées plateaux techniques ;
- panorama élargi sans noir avec grossissement progressif des bordures ;
- protection contre l'emploi d'une texture 0N_x comme panorama ;
- portails recalés presque au bord réel de la Map, quelle que soit sa taille ;
- chaque Zone possède un retour et une continuation d'exploration non révélée.

Ajouts V0.16.17 :
- panorama résolu directement depuis le numéro réel de la Map active ;
- changement de Map enregistré avant le chargement de son décor ;
- impossibilité renforcée d'utiliser une image 0N_x comme décor ;
- nom et numéro de Zone du HUD synchronisés avec le moteur ;
- portails Nord/Sud parallèles aux bords Est-Ouest ;
- portails Est/Ouest tournés de 90 degrés et parallèles aux bords Nord-Sud.
- panorama plus réactif lors des rotations rapides de caméra ;
- image de décor élargie, légèrement incurvée et davantage étirée aux bords ;
- couverture périphérique renforcée pour supprimer les zones noires restantes.

Ajouts V0.16.18 :
- suppression automatique des anciens service workers et caches du jeu ;
- paramètres de version ajoutés à tous les scripts et feuilles de style ;
- port local aléatoire à chaque lancement pour isoler les anciennes versions ;
- attribution des décors désormais testée sans possibilité de réutiliser
  silencieusement un ancien moteur depuis le cache du navigateur.

Ajouts V0.16.19 :
- état unique de Zone diffusé par le moteur 3D à toute l'interface ;
- synchronisation immédiate du nom, du numéro, du décor et des menus ;
- cyclorama vertical conservant presque toute la hauteur du décor source ;
- bas du décor incurvé vers le plateau pour renforcer la profondeur ;
- courbures horizontale et verticale combinées ;
- recul maximal de caméra augmenté de 18 à 26 unités.
- vitesse maximale de BlueFox augmentée avec une accélération mesurée ;
- animation Run accélérée pour rester cohérente avec le déplacement.
- une direction acceptée sur demande du joueur active temporairement Run_fast ;
- vitesse de déplacement majorée pendant ce trajet volontaire.
- suivi du décor légèrement adouci pendant les rotations de caméra.

Ajouts V0.16.20 :
- bord inférieur du décor recalé au niveau du plateau ;
- décor presque entièrement visible au recul maximal ;
- largeur accrue et étirement progressif renforcé à droite et à gauche ;
- courbure périphérique plus ample, centre préservé ;
- panorama recentré doucement derrière la position suivie ;
- recul caméra porté à 34 unités et conservé en mode ancré ;
- pivot relevé progressivement en vue stratégique pour voir le haut du décor ;
- course autonome nettement accélérée ;
- Run_fast plus visible avec vitesse majorée de 30 % sur instruction acceptée.

Si le navigateur bloque WebGL, l'interface reste accessible sur le décor
illustré mais le personnage 3D ne peut pas être affiché.
