# BLUEFOX ODYSSEY — SYSTÈME MUSICAL ADAPTATIF

Statut : **raccordé au jeu, finalisation d'écoute en cours**

Référence documentaire : 15 août 2026

Base GitHub de référence : `d59376559e71032b478fb01a84fdb9bdd6611736` — V5 Stable

## 1. Intention
La musique doit installer durablement une ambiance et traduire le gameplay sans changer de thème à chaque interaction.

## 2. Sources de vérité
- `data/music-catalog.js`
- `engine/adaptive-music-engine-v1.js`
- `engine/adaptive-music-gameplay-bridge-v1.js`
- `engine/adaptive-music-ui-v1.js`
- BAC réel

## 3. État validé
- Double deck et fondus.
- Commande musique persistante.
- Réglages séparés musique / sons.
- Développements longs.
- Historique anti-répétition.
- Entrée de map ponctuelle puis retour au thème dominant.
- Activité réelle + BAC comme sources de décision.
- Main / Relic plus probables lorsque BlueFox est autonome sur collecte/exploration variée.
- thème Active plus présent lorsque le joueur semi-pilote BlueFox, mais sans devenir systématique.
- Persistance plus longue d'un thème après actions répétées.
- Réduction des changements trop fréquents.
- Priorité donnée à l'installation d'une ambiance plutôt qu'au zapping musical.

## 4. Règles de stabilité
- Une action isolée ne suffit pas à changer durablement de thème.
- Les actions répétées renforcent la persistance du thème installé.
- En autonomie focalisée collecte : Main/Relic dominent, Active reste ponctuel.
- En semi-pilotage : Active peut monter en probabilité.
- En alternance d'activités : Main/Relic restent légèrement prioritaires.
- Le BAC module les probabilités et développements, pas le volume principal.
- Aucun changement audio ne doit ralentir le chargement d'une map.

## 5. À finaliser
- Vérifier sur sessions longues l'absence de silence.
- Vérifier la variété des développements longs.
- Finaliser les micro-sons et leurs niveaux.
- Geler seulement après validation d'écoute prolongée.

## 6. Critères de gel
1. aucun silence inattendu ;
2. aucune pénalité sur changement de map ;
3. pas de boucle courte identifiable en autonomie ;
4. thèmes stables mais réactifs aux changements durables d'activité ;
5. volumes musique/sons persistants et cohérents ;
6. réglages artistiques validés à l'écoute.
