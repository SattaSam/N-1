const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');process.env.BLUEFOX_ROOT=ROOT;
// Native placement, object metadata, footprints and plateau guard. Meshes only
// use the existing population fixture; their plateaus use the real owner layouts.
const source=fs.readFileSync(path.join(ROOT,'tests/population-persistence.runtime.test.js'),'utf8');
const oldZones='const zones=Array.from({length:count},(_,i)=>({center:{x:(i%2)*54,z:Math.floor(i/2)*54},halfSize:27}));';
const oldBounds='bounds:{minX:-27,maxX:count>1?81:27,minZ:-27,maxZ:count>2?Math.ceil(count/2)*54-27:27}';
assert(source.includes(oldZones)&&source.includes(oldBounds),'Native geometry fixture changed');
const prefix=source.slice(0,source.indexOf('\nfor(const [name'))
 .replace(oldZones,'const zones=BF.MapIntegrity.layouts[count].map(([x,z])=>({center:{x,z},halfSize:27}));')
 .replace(oldBounds,'bounds:{minX:Math.min(...zones.map(z=>z.center.x))-27,maxX:Math.max(...zones.map(z=>z.center.x))+27,minZ:Math.min(...zones.map(z=>z.center.z))-27,maxZ:Math.max(...zones.map(z=>z.center.z))+27}');
const P=new Function('require','__dirname',prefix+'\nreturn {environment,V,Group};')(require,path.join(ROOT,'tests'));
P.Group.prototype.worldToLocal=function(v){if(this.parent)this.parent.worldToLocal(v);v.x-=this.position.x;v.y-=this.position.y;v.z-=this.position.z;return v.applyAxisAngle(new P.V(0,1,0),-this.rotation.y)};
const copy=x=>JSON.parse(JSON.stringify(x));
const definitions=[
  {
    "id": "generated-65149152-0001",
    "number": 1001,
    "name": "Le Pôle des Aimants Paisibles",
    "profile": "crystalline",
    "traits": [
      {
        "id": "magnetic",
        "label": "Magnétique"
      }
    ],
    "description": "Prairie / Savane généré à la découverte.",
    "palette": {
      "ground": 5984879,
      "accent": 13080063
    },
    "entry": {
      "x": 0,
      "z": 20
    },
    "exits": {
      "south": {
        "x": 0,
        "z": 26,
        "targetMap": "crystal",
        "targetEntry": "north",
        "generated": true
      }
    },
    "seed": 2114121344,
    "plateauCount": 2,
    "generator": {
      "discoveryIndex": 1,
      "biomeId": "magnetic",
      "richnessId": "standard",
      "resourceFamilies": [
        "magnetic_ore",
        "crystal",
        "debris",
        "magnetic_core"
      ],
      "microSceneIds": [
        "floating_rocks",
        "suspended_island",
        "magnetic_vein",
        "warped_wreck",
        "local_storm"
      ],
      "featuredMicroSceneIds": [],
      "bibleMissionId": "PHEN-05",
      "requiredObjects": [
        {
          "type": "mobile_islet",
          "count": 3,
          "contextRole": "phen05SuspendedSet"
        }
      ]
    }
  },
  {
    "id": "generated-a27a9a8b-0001",
    "number": 1001,
    "name": "La Galerie Lumineuse des Vibrations",
    "profile": "crystalline",
    "traits": [
      {
        "id": "crystalline",
        "label": "Cristallin"
      }
    ],
    "description": "Fongique généré à la découverte.",
    "palette": {
      "ground": 5794690,
      "accent": 7727359
    },
    "entry": {
      "x": 0,
      "z": 20
    },
    "exits": {
      "south": {
        "x": 0,
        "z": 26,
        "targetMap": "crystal",
        "targetEntry": "north",
        "generated": true
      }
    },
    "seed": 1923797643,
    "plateauCount": 2,
    "generator": {
      "discoveryIndex": 1,
      "biomeId": "crystalline",
      "richnessId": "diverse",
      "resourceFamilies": [
        "crystal",
        "needle",
        "magnetic_ore",
        "resonance_crystal"
      ],
      "microSceneIds": [
        "crystal_grove",
        "geode",
        "resonance_circle",
        "crystal_stele"
      ],
      "featuredMicroSceneIds": [],
      "bibleMissionId": "EXP-07",
      "requiredObjects": [
        {
          "type": "electrostatic_storm",
          "count": 1,
          "contextRole": "exp07Storm"
        },
        {
          "type": "stele",
          "count": 3,
          "contextRole": "exp07Steles"
        },
        {
          "type": "nocturnal_animal",
          "count": 1,
          "contextRole": "exp08NightFauna"
        },
        {
          "type": "lunar_vine",
          "count": 1,
          "contextRole": "exp08NightFlora"
        }
      ]
    }
  },
  {
    "id": "generated-41034104-0001",
    "number": 1001,
    "name": "La Canopée des Écorces",
    "profile": "forest",
    "traits": [
      {
        "id": "forest",
        "label": "Forêt"
      }
    ],
    "description": "Forêt généré à la découverte.",
    "palette": {
      "ground": 4678735,
      "accent": 7991474
    },
    "entry": {
      "x": 0,
      "z": 20
    },
    "exits": {
      "south": {
        "x": 0,
        "z": 26,
        "targetMap": "crystal",
        "targetEntry": "north",
        "generated": true
      }
    },
    "seed": 2397804680,
    "plateauCount": 2,
    "generator": {
      "discoveryIndex": 1,
      "biomeId": "forest",
      "richnessId": "diverse",
      "resourceFamilies": [
        "fiber",
        "adaptive_plant",
        "spore",
        "crystal",
        "rare_biomass"
      ],
      "microSceneIds": [
        "clearing",
        "giant_roots",
        "luminous_forest",
        "fungal_colony",
        "basin",
        "nocturnal_den",
        "predator_flora"
      ],
      "featuredMicroSceneIds": [],
      "bibleMissionId": "CART-02",
      "requiredObjects": [
        {
          "type": "fog_bank",
          "count": 2,
          "contextRole": "cart02FogField"
        }
      ]
    }
  }
];
function populate(def,control=false){const e=P.environment();e.load('engine/map-integrity-v20.js');
 if(control)e.BF.ObjectSpawner.relocateRequiredMapObjects=undefined;
 const pop=e.populate(copy(def),def.plateauCount);pop.rows=copy(pop.rows);pop.library=e.BF.ObjectLibrary;return pop;
}
for(const definition of definitions)for(let seed=1;seed<=20;seed++)test(`${definition.generator.bibleMissionId} seed ${seed}: required count, stable survivors, colliders and reload`,()=>{
 const def={...copy(definition),seed},before=populate(def,true),current=populate(def),again=populate(def);
 for(const o of def.generator.requiredObjects)assert(current.rows.filter(x=>x.type===o.type).length>=(o.count||1),`${o.type} count after physical guard`);
 const preserved=new Map(current.rows.map(x=>[x.id,x]));
 for(const r of before.rows.filter(x=>x.source==='map-population'))assert.deepEqual(preserved.get(r.id),r,`Moved existing ${r.id}`);
 assert.deepEqual(again.rows,current.rows,'Reload must keep all IDs and positions');
 for(const record of current.s.instances.filter(r=>r.root.userData.spawnSource==='map-population')){
  const p=record.root.getWorldPosition(new P.V()),radius=Math.max(.1,current.library.getMapPlacement(record.type)?.radius||.5);
  assert(current.options.zoneRegions.some(r=>p.x>=r.center.x-r.halfSize+radius+.2-1e-8&&p.x<=r.center.x+r.halfSize-radius-.2+1e-8&&p.z>=r.center.z-r.halfSize+radius+.2-1e-8&&p.z<=r.center.z+r.halfSize-radius-.2+1e-8),'Physical guard remains enforced');
  for(const collider of current.options.colliders.filter(c=>c.owner===record.root)){
   assert(Number.isFinite(collider.position.x)&&Number.isFinite(collider.position.z));
   assert(Math.hypot(collider.position.x-p.x,collider.position.z-p.z)<20,'Collider follows its moved owner');
  }
 }
});

for(let seed=1;seed<=20;seed++)test(`GAME-civilization_1 seed ${seed}: prescribed stele exists as a physical interaction instance`,()=>{
 const def=copy(definitions[0]);def.seed=seed;def.generator.bibleMissionId='GAME-civilization_1';
 def.generator.requiredObjects=[{type:'stele',count:1,contextRole:'civilizationSearch'}];
 const current=populate(def);
 assert(current.rows.some(row=>row.type==='stele'),'the generated rows must contain the prescribed stele');
 const instance=current.s.instances.find(record=>record.root.userData.functional?.type==='stele');
 assert(instance,'the prescribed stele must be instantiated, not only listed in metadata');
 assert.notEqual(instance.root.userData.active,false,'the spawned CUO must remain interactable');
 assert(instance.root.userData.instanceId,'the physical instance needs a stable identity for distinct observation credit');
});
