# Verrou de configuration — Sauvegarde

État validé : les boutons `Sauvegarder`, `Charger` et `Nouvelle partie` sont
affichés sur une même ligne dans le panneau Paramètres.

Le contrat est centralisé dans `engine/save-ui-bridge.js` sous la constante
gelée `SAVE_UI_CONFIG` et exposé en lecture seule par
`BlueFox3D.saveUiConfig`. Un observateur remonte automatiquement le bloc si le
panneau React est recréé, si un autre bridge retire les boutons ou si leur
structure est altérée.

Fonctionnement verrouillé :

- sauvegarde automatique avec copie de secours ;
- deux emplacements manuels ;
- chargement de l’autosauvegarde ou d’un emplacement manuel avec date ;
- confirmation obligatoire avant une nouvelle partie ;
- une nouvelle partie efface l’état actif et l’autosauvegarde, mais conserve
  les deux sauvegardes manuelles ;
- cache navigateur invalidé par `save-ui-locked-v3` dans `index.html`.

Contrôle console :

```js
BlueFox3D.getSaveUiDiagnostics()
```

Le résultat attendu dans un panneau Paramètres ouvert est
`controlsPresent: true`. Tout correctif futur touchant `index.html`,
`game.js`, le panneau Paramètres ou les bridges UI doit conserver ce contrat.
