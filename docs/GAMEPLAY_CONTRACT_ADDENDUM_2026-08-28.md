# BlueFox Odyssey — Addendum gameplay opérationnel

Mise à jour consolidée : **1 octobre 2026**  
Base technique observée : **HEAD `d334ed2cb193c80c44e98c401b5947bbd263348e` — `Mission routines`**.

Ce document complète le Contrat Gameplay Opérationnel V2. Il décrit des intentions et invariants observables ; il n'est pas une couche moteur.

## Primauté

1. décision utilisateur explicite la plus récente ;
2. validation directe en jeu ;
3. Bible/document fonctionnel récent ;
4. références officielles ;
5. anciennes traductions techniques ;
6. code actuel.

Le code prouve ce qui se passe ; il ne redéfinit pas seul ce qui devrait se passer.

## Contrat gameplay d'autorité missionnelle

### Top1 joueur

Quand le joueur choisit une mission principale, ce choix devient la Top1 persistante. BlueFox garde la liberté des moyens, mais la mission choisie ne doit pas être silencieusement évincée par de l'autonomie libre.

Si la Top1 n'est momentanément pas runnable :
- elle reste active ;
- BlueFox examine les autres missions prioritaires ;
- une transition géographique requise peut être entreprise ;
- elle n'est ni complétée artificiellement ni abandonnée.

### Sans choix joueur

BAC/MissionManager arbitrent 3–4 missions prioritaires. Le moteur ne doit pas utiliser une collecte générale comme substitut à une mission prioritaire exécutable.

### Ordre canonique

`LOCAL → KNOWN → UNKNOWN CONTRACTUEL → FREE AUTONOMY`.

- LOCAL : action réellement disponible ici ;
- KNOWN : route physique vers cible/site/map connus ;
- UNKNOWN : uniquement si joueur/mission autorise l'ouverture de l'inconnu ;
- FREE : seulement si aucun travail missionnel exécutable ne subsiste.

### Échec d'une candidate

L'échec d'une action n'autorise pas immédiatement le retour à l'autonomie générale. BlueFox doit pouvoir tester la candidate missionnelle suivante dans l'ordre d'autorité prévu.

## Contrat de voyage missionnel

Un voyage n'est pas une simple transition technique : il transporte l'intention qui l'a déclenché.

### Destination connue

- trajet physique par connexions connues ;
- destination choisie par identité réelle ;
- aucune téléportation implicite ;
- une route déjà découverte reste une route connue, même s'il s'agit de « revenir en arrière ».

### Destination inconnue

- BlueFox ne part pas librement ouvrir l'inconnu sans intention autorisée ;
- la map est créée au franchissement réel ;
- la mission mémorise sa destination générée ;
- une autre découverte fortuite ne doit pas satisfaire ce contrat.

### À l'arrivée

La mission causale doit reprendre avant une activité générale. Une cible pas encore immédiatement matérialisée n'est pas une preuve d'abandon.

Save/reload doit conserver la raison du voyage et la destination.

## Déviation locale perdable

Une opportunité réellement locale et perdable peut retarder ponctuellement un départ : faune, MSC ou événement attaché à la map et qui disparaîtrait réellement si BlueFox part.

Une collecte générique de bois, roche, Shelter/COL/ENV ou une activité reproductible plus tard ne doit pas retarder indéfiniment le travel.

Après la déviation admise, BlueFox reprend le voyage principal.

## Interaction : étude et acquisition

Invariant historique confirmé :

`0..N études missionnelles réellement dues → même instance → acquisition`.

Le joueur doit voir une transaction cohérente, pas une succession de cibles substituées.

- observation de découverte une fois ;
- nouvelle étude possible si un nouvel objectif l'exige ;
- pas de double crédit même nœud × instance ;
- respawn ordinaire collectable directement si aucune nouvelle étude n'est due ;
- fan-out vers missions compatibles.

## Nouvelle règle — une mission secondaire ne bloque pas l'action d'une autre

Les compteurs et missions progressent en parallèle, mais **aucune mission ne doit bloquer une interaction missionnelle ou non missionnelle d'une autre mission en imposant sa propre observation**.

Une observation peut être effectuée lorsqu'elle est réellement due, mais elle ne doit jamais créer une attente infinie avant l'action suivante.

Le fan-out doit rester passif : l'action physique produit l'événement, puis les missions compatibles se créditent. Une mission secondaire ne transforme pas son besoin en précondition de l'action courante sauf si cette étude appartient intrinsèquement à la transaction SAME-INSTANCE de cette même cible.

## Atomicité / pending interaction

- une action atomique engagée peut terminer avant l'application d'une nouvelle directive ;
- `currentAction` et l'interaction physique doivent désigner le même travail ;
- un ancien `pendingInteraction` ne peut pas bloquer la mission suivante ;
- un échec d'approche doit être traité comme tel, pas comme absence de mission ;
- après retries physiques bornés, passer à une autre candidate ou déclarer l'échec explicitement ;
- aucun tremblement / boucle d'approche infinie.

## Navigation joueur / autonomie OFF

OFF signifie absence d'initiative autonome, pas immobilité forcée du personnage.

- clic objet : déplacement manuel autorisé ;
- clic sol/direction : déplacement manuel autorisé ;
- une resynchronisation OFF→OFF ne doit pas annuler la destination du joueur ;
- passer réellement FULL/SEMI→OFF peut annuler l'autonomie en cours selon le contrat.

## Portée d'interaction

Lorsqu'un objet/MSC est correctement ciblé mais difficile à atteindre :
- ajuster d'abord la portée d'interaction BlueFox si cela suffit ;
- ne pas grossir/modifier les colliders de la scène sans nécessité ;
- conserver les obstacles étrangers ;
- empêcher le collider de la cible elle-même de devenir un faux obstacle.

## MSC / identité

Une MSC n'est pas seulement une famille visuelle. Quand la mission demande une scène précise, le retour doit viser la même identité persistante.

- map + `siteId`/`microSceneId`/`persistentMicroSceneId` selon contrat ;
- même instance pour une mini-série de retour ;
- une famille géologique générique ne suffit pas si une MSC précise est demandée ;
- une mission qui exige MSC + objets ne s'active pas sur la seule présence partielle de la MSC.

## Maps / monde / images

- tutoriel : 1→2→4→6 plateaux ;
- Crystal = origine narrative fixe ;
- noms, topologie, seed et associations visuelles persistantes ;
- une conversion PNG/WebP ne doit jamais fusionner l'identité de deux maps ;
- fallback biome-compatible seulement ;
- Crystal ne devient pas l'image par défaut des autres maps.

## Objets immobiles

Un débris/élément de ruine marqué immobile ne doit pas bouger sous l'effet d'une animation générique de flore, vent, respiration ou jitter. Cette règle ne doit pas supprimer l'animation légitime des objets réellement vivants/mobiles.

## Survie / rythme

- micro-pause = courte récupération réelle ;
- repos long = récupération plus importante ;
- ration = booster d'excursion fort ;
- ration + micro-pause peut prolonger le niveau d'activité ;
- sans ration, repos longs plus fréquents acceptables ;
- pas de cycle artificiel une action→repos ;
- Survival peut gagner l'arbitrage quand l'état l'exige, sans effacer le projet missionnel.

## Performance comme non-régression gameplay

Un BlueFox qui recalcule inutilement le monde à chaque tick finit par paraître lent, bloqué ou erratique : la performance influence directement le gameplay.

Règles :
- pas de scan map-wide permanent pour maintenir une interaction déjà connue ;
- résoudre au besoin puis suivre la cible/shortlist locale ;
- recalculer sur événement/cause réelle ;
- conserver RuntimeBudget unique ;
- mesurer aussi les déplacements et interactions habituels, pas seulement un cas de test extrême.

## Sauvegarde / reprise

Après save/reload doivent rester cohérents :
- mission/lifecycle/priorité ;
- map et topologie ;
- travel pending / causal arrival ;
- MSC/sites persistants ;
- inventaire réel ;
- constructions ;
- Research/recettes ;
- drones/balises/TP ;
- directives joueur.

Une mission Shelter ou construction validée avec ressources consommées/collectées ne doit pas réapparaître avec un inventaire incohérent par perte de persistance.

## Téléportation post-arc

`TP_AUTONOMY_CONTRACT_2026-09-14.md` reste la règle spécialisée :
- pas d'autonomie TP avant TP-AFTER-04 completed ;
- après cette étape, usage autonome seulement opt-in ;
- hub ASTROLOGY obligatoire ;
- pas de balise↔balise directe ;
- aucune découverte synthétique ;
- le TP ne valide pas une mission distante par simple déplacement.

## Non-régression missionnelle à rejouer

Après tout changement structurant :
- Top1 runnable ;
- Top1 non-runnable + Top2/Top4 runnable ;
- local versus destination connue ;
- known multi-hop ;
- unknown contractuel ;
- arrivée causale ;
- SAME-INSTANCE ;
- fan-out ;
- secondaire qui ne bloque pas acquisition ;
- pendingInteraction non stale ;
- save/reload ;
- aucune autonomie libre parasite sous travail missionnel ;
- Survival légitime ;
- directive joueur persistante ;
- interaction physique réellement accessible.

## Matrice d'invariant obligatoire

Tout chantier doit être audité avec :

| Attendu gameplay | Situation initiale | Déclencheur | Initiative BlueFox | Intervention joueur | Résultat observable attendu | Effets secondaires autorisés | Interdits | Persistance / reprise | Validé historiquement ? | État HEAD | Propriétaire(s) runtime réellement impliqués | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Cette matrice précède la liste des fonctions JavaScript.
