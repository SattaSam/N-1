# Sprint O5.1 — Routeur d’interactions manuelles

## But

Corriger les clics directs sur les objets sans imposer une inspection permanente à tous les objets inspectables.

## Règles

- Le clic résout d’abord l’entrée réelle du CUO.
- Aucun objet inconnu ne retombe implicitement sur `fiber`.
- Un objet uniquement inspectable est inspecté.
- Un objet uniquement collectable est collecté.
- Un objet demandant une inspection préalable est inspecté au premier clic, puis collecté au clic suivant.
- Une action demandée par une mission est contrôlée par les capacités de l’objet.

## État d’instance

Chaque objet interactif conserve : `inspected`, `analyzed`, `identified`, `collected`, `inspectionCount`, `collectionCount`.

## Objets pilotes

- Stèle : inspection, jamais collecte.
- Bassin : phénomène observé, jamais collecte.
- Cristal/fibre : collecte directe.
- Plante adaptative : inspection au premier clic, collecte au clic suivant.

## Diagnostic

Après avoir cliqué une cible, avant ou après l’action :

```js
BlueFox3D.resolveObjectInteraction(BlueFox3D.currentEngine.pendingInteraction)
```

Historique :

```js
BlueFox3D.ObjectEvents.history().slice(-5).map(e => ({type:e.type, objectId:e.objectId, detail:e.detail}))
```
