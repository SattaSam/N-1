(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const existing = Array.isArray(BF.BibleCatalog) ? [...BF.BibleCatalog] : Object.values(BF.BibleCatalog || {});
  const ids = new Set(existing.map((mission) => mission.id));

  const additions = [
    Object.freeze({
      id: "BIBLE-V01-RECONNAISSANCE",
      version: 1,
      pattern: "ACTIVE_EXPLORATION_RELIC_RETURN",
      title: "Partir en reconnaissance",
      description: "Explorer quatre nouvelles maps, observer la relique découverte sur la quatrième puis revenir au camp.",
      priority: 70,
      passivePriorityAxis: "exploration",
      triggerOnly: true,
      trigger: Object.freeze({
        type: "interaction.observe",
        objectId: "LANDMARK-CRASH-CAPSULE-001",
        count: 1
      }),
      slots: Object.freeze({
        exploreMaps: Object.freeze({
          title: "Explorer quatre nouvelles maps",
          target: 4,
          params: Object.freeze({
            uniqueMaps: true,
            newSinceMissionActivation: true,
            excludeActivationMap: true
          })
        }),
        observeRelic: Object.freeze({
          title: "Observer la relique",
          target: 1,
          params: Object.freeze({
            subject: "technology",
            objectId: "TEC-RELI-M-001",
            missionSpawnOnly: true
          })
        }),
        returnToShelter: Object.freeze({
          title: "Revenir au camp",
          target: 1,
          params: Object.freeze({
            shelterKinds: Object.freeze(["camp","refuge","base"]),
            radius: 8
          })
        })
      }),
      mapGeneration: Object.freeze({
        applyOnNewMapIndex: 4,
        size: 4,
        biome: "magnetic",
        requiredMicroScenes: Object.freeze([
          Object.freeze({
            id: "MSC-BIBLE-RELIC-001",
            persistent: true,
            spawnOnce: true
          })
        ])
      }),
      narrative: Object.freeze({
        revealed: Object.freeze(["La capsule ne me mènera plus loin. Je dois reconnaître les territoires voisins."]),
        progress: Object.freeze([
          Object.freeze({ slot: "exploreMaps", atCount: 2, text: "Je commence à comprendre comment ces territoires s'enchaînent." }),
          Object.freeze({ slot: "exploreMaps", atCount: 4, text: "Une anomalie ressort de ce territoire magnétique. Je devrais l'observer." }),
          Object.freeze({ slot: "observeRelic", atCount: 1, text: "Cette relique mérite d'être consignée. Je dois maintenant retrouver le camp." })
        ]),
        completed: Object.freeze(["Reconnaissance terminée. La relique reste enregistrée sur cette map."])
      }),
      completionGate: Object.freeze({
        type: "proximity.shelter",
        shelterKinds: Object.freeze(["camp","refuge","base"]),
        scope: "any-established",
        radius: 8
      }),
      effects: Object.freeze([]),
      unlocks: Object.freeze([]),
      next: Object.freeze([])
    }),
    Object.freeze({
      id: "BIBLE-V01-EXPLORE-3-MAPS",
      version: 1,
      pattern: "PASSIVE_MAP_EXPLORATION",
      title: "Explorer trois maps",
      description: "Enregistrer passivement la découverte de trois maps distinctes.",
      priority: 35,
      passivePriorityAxis: "exploration",
      passive: true,
      hiddenUnlessPrioritized: true,
      trigger: Object.freeze({
        type: "exploration.map_discovered",
        uniqueOnly: true,
        count: 1
      }),
      slots: Object.freeze({
        exploreMaps: Object.freeze({
          title: "Explorer trois maps",
          target: 3,
          params: Object.freeze({
            uniqueMaps: true,
            countTriggeringMapImmediately: true,
            passiveProgress: true
          })
        })
      }),
      narrative: Object.freeze({
        revealed: Object.freeze([]),
        progress: Object.freeze([]),
        completed: Object.freeze(["Trois territoires distincts sont maintenant enregistrés dans mes repères."])
      }),
      effects: Object.freeze([]),
      unlocks: Object.freeze([]),
      next: Object.freeze([])
    })
  ];

  additions.forEach((mission) => {
    if (!ids.has(mission.id)) existing.push(mission);
  });

  BF.BibleCatalog = Object.freeze(existing);
})(window);
