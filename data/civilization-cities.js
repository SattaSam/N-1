(function (global) {
  "use strict";
  const maps = Array.isArray(global.BlueFoxCustomMaps) ? global.BlueFoxCustomMaps : [];
  const tinyCity = maps.find((map) => map?.id === "custom-map-31-tinycity");
  if (tinyCity) {
    tinyCity.civilizationId = "translucent";
    tinyCity.civilizationRole = "city";
    tinyCity.civilizationMerchant = Object.freeze({
      type: "npc_translucent",
      position: Object.freeze([-36, 0, -20]),
      rotation: Math.PI,
      role: "merchant"
    });
    tinyCity.customObjects = Object.freeze([
      Object.freeze({
        type: "npc_translucent",
        position: Object.freeze([-36, 0, -20]),
        rotation: Math.PI,
        instanceId: "civilization-merchant:translucent:custom-map-31-tinycity",
        userData: Object.freeze({
          npcRole: "merchant",
          civilizationId: "translucent",
          fixedCityMerchant: true
        })
      }),
      Object.freeze({
        type: "npc_translucent",
        position: Object.freeze([-24, 0, -8]),
        rotation: Math.PI * 0.35,
        instanceId: "civilization-resident-1:translucent:custom-map-31-tinycity",
        userData: Object.freeze({ npcRole: "resident", civilizationId: "translucent" })
      }),
      Object.freeze({
        type: "npc_translucent",
        position: Object.freeze([-17, 0, -27]),
        rotation: -Math.PI * 0.4,
        instanceId: "civilization-resident-2:translucent:custom-map-31-tinycity",
        userData: Object.freeze({ npcRole: "resident", civilizationId: "translucent" })
      })
    ]);
  }
  const rockyCity = Object.freeze({
  "id": "custom-map-32-rock-village",
  "number": 32,
  "index": "32-rock-village",
  "name": "ROCK_VILLAGE",
  "slug": "rock-village",
  "plateauCount": 2,
  "profile": "desert",
  "terrainUrls": [
    "./Images/012_1.png",
    "./Images/012_2.png"
  ],
  "terrainUrl": "./Images/012_1.png",
  "sceneUrl": "./Images/12Désert cristallin au sol craquelé .png",
  "seed": 95165,
  "palette": {
    "ground": 8414289,
    "accent": 16760181
  },
  "populationBudget": {
    "targetObjects": 11,
    "resources": 3,
    "allowCustomRange": true
  },
  "traits": [
    {
      "id": "custom",
      "label": "composition personnalisée"
    }
  ],
  "customMicroScenes": [
    {
      "id": "MSC-CUSTOM-CARRIEREDECRISTAUX",
      "position": [
        15.1884,
        0,
        45.0759
      ],
      "rotation": [
        0,
        0,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-FOYER-ANCIEN",
      "position": [
        4.482,
        0,
        38.2209
      ],
      "rotation": [
        0,
        1.308997,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-CAMP-BASE",
      "position": [
        11.2696,
        0,
        27.2258
      ],
      "rotation": [
        0,
        0,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-CAMP-BASE",
      "position": [
        10.22,
        0,
        13.1718
      ],
      "rotation": [
        0,
        3.141593,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-CAMP-BASE",
      "position": [
        5.9184,
        0,
        -6.2774
      ],
      "rotation": [
        0,
        0.523599,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-CAMP-BASE",
      "position": [
        2.5052,
        0,
        3.3979
      ],
      "rotation": [
        0,
        1.832596,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-CAMP-BASE",
      "position": [
        19,
        0,
        6.231
      ],
      "rotation": [
        0,
        3.665191,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-RUINE-MODULAIRE2",
      "position": [
        3.429,
        0,
        12.689
      ],
      "rotation": [
        0,
        0,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-RUINE-MODULAIRE2",
      "position": [
        -2.3937,
        0,
        -32.2964
      ],
      "rotation": [
        0,
        -1.308997,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-WALL-RUIN-COLLAPSED",
      "position": [
        7.5578,
        0,
        20.2432
      ],
      "rotation": [
        0,
        0,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-WALL-RUIN-COLLAPSED",
      "position": [
        -4.571,
        0,
        2.863
      ],
      "rotation": [
        0,
        0,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-CARRIEREDECRISTAUX",
      "position": [
        10.6319,
        0,
        -33.245
      ],
      "rotation": [
        0,
        0,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-CARRIEREDECRISTAUX",
      "position": [
        13.5009,
        0,
        -36.9066
      ],
      "rotation": [
        0,
        -1.570796,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-FOYER-ANCIEN",
      "position": [
        -9.9548,
        0,
        10.5627
      ],
      "rotation": [
        0,
        0,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-FOYER-ANCIEN",
      "position": [
        -0.4084,
        0,
        -1.1614
      ],
      "rotation": [
        0,
        1.047198,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-COMPOSANT-RUIN",
      "position": [
        13.2932,
        0,
        -12.1677
      ],
      "rotation": [
        0,
        0,
        0
      ]
    },
    {
      "id": "MSC-CUSTOM-FOYER-ANCIEN",
      "position": [
        13.1094,
        0,
        12.8994
      ],
      "rotation": [
        0,
        -1.308997,
        0
      ]
    }
  ],
  "civilizationId": "rocky",
  "civilizationRole": "city",
  "civilizationMerchant": {
    "type": "npc_rocky",
    "position": [
      10.5,
      0,
      3.3
    ],
    "rotation": 3.141593,
    "role": "merchant"
  },
  "customObjects": [
    {
      "type": "npc_rocky",
      "position": [
        10.5,
        0,
        3.3
      ],
      "rotation": 3.141593,
      "instanceId": "civilization-merchant:rocky:custom-map-32-rock-village",
      "userData": {
        "npcRole": "merchant",
        "civilizationId": "rocky",
        "fixedCityMerchant": true
      }
    },
    {
      "type": "npc_rocky",
      "position": [
        -6,
        0,
        12
      ],
      "rotation": 1.047198,
      "instanceId": "civilization-resident-1:rocky:custom-map-32-rock-village",
      "userData": {
        "npcRole": "resident",
        "civilizationId": "rocky"
      }
    },
    {
      "type": "npc_rocky",
      "position": [
        18,
        0,
        -10
      ],
      "rotation": -0.785398,
      "instanceId": "civilization-resident-2:rocky:custom-map-32-rock-village",
      "userData": {
        "npcRole": "resident",
        "civilizationId": "rocky"
      }
    }
  ],
  "description": "Village-capitale rocheux structuré autour de ruines, foyers et carrières de cristaux.",
  "synthesis": "Une implantation rocheuse organisée. Une place centrale semble servir aux échanges.",
  "resourceHints": "Cristaux, minerais et composants techniques autour des zones bâties."
});
  if (!maps.some((map) => map?.id === rockyCity.id)) maps.push(rockyCity);
  global.BlueFoxCustomMaps = maps;
  global.BlueFoxCivilizationCities = Object.freeze({
    translucent: Object.freeze({ mapId: "custom-map-31-tinycity", civilizationId: "translucent" }),
    rocky: Object.freeze({ mapId: "custom-map-32-rock-village", civilizationId: "rocky" })
  });
})(window);
