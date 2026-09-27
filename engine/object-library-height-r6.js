(function (global) {
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{};
const base=BF.ObjectLibrary;
if(!base?.data||base.__heightR6)return;

const mat=(THREE,color)=>new THREE.MeshStandardMaterial({color,roughness:.96,metalness:.02});
const shadow=root=>{root.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});return root;};

function ramp(THREE,palette,variant=0){
 const root=new THREE.Group(); root.name="RockRamp";
 const m=mat(THREE,variant%2?0x59615e:0x4f5755);
 const len=5.8,w=3.4,rise=1.45,th=.58,slope=Math.atan2(rise,len);
 const slab=new THREE.Mesh(new THREE.BoxGeometry(w,th,len),m);
 slab.rotation.x=-slope; slab.position.y=.18+rise*.5; root.add(slab);
 [-1,1].forEach(side=>{const e=new THREE.Mesh(new THREE.DodecahedronGeometry(.7,0),m);e.scale.set(.72,.55,2.55);e.position.set(side*1.52,.48+rise*.32,0);e.rotation.x=-slope*.82;root.add(e);});
 return {root:shadow(root),hitbox:null,colliders:[],kind:"rock_ramp"};
}
function platform(THREE,palette,variant=0){
 const root=new THREE.Group(); root.name="NaturalRockPlatform";
 const m=mat(THREE,variant%2?0x59615e:0x4f5755);
 const core=new THREE.Mesh(new THREE.CylinderGeometry(2.42,2.72,1.52,11,2),m);
 core.position.y=.76; core.rotation.y=variant*.19; root.add(core);
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2+variant*.13,c=new THREE.Mesh(new THREE.DodecahedronGeometry(.46+(i%3)*.11,0),m);c.position.set(Math.cos(a)*(2.3+(i%2)*.18),.34+(i%3)*.11,Math.sin(a)*(2.3+(i%2)*.18));c.scale.set(1.1,.8,.85);c.rotation.set(i*.12,a,i*.07);root.add(c);}
 return {root:shadow(root),hitbox:null,colliders:[],kind:"natural_rock_platform"};
}
const mk=(id,type,label,build)=>Object.freeze({
 id,type,label,category:"terrain_feature",subtype:type,size:"L",rarity:"common",status:"active",
 biomes:Object.freeze(["all"]),microScenes:Object.freeze(["Point haut"]),states:Object.freeze(["naturel"]),
 missionLinks:Object.freeze([]),placement:Object.freeze({edgeWeight:.5,centerWeight:.5,minSlope:0,maxSlope:24}),
 gameplay:Object.freeze({interactive:false,collectable:false,inspectable:false,destructible:false,obstacle:false,traversable:true,walkableSurface:true}),
 ai:Object.freeze({curiosity:.15,harvestPriority:0,danger:0}),interaction:null,knowledge:null,observation:null,resource:null,research:null,situation:null,decision:null,progression:null,
 spawn:Object.freeze({spawnCost:5,rarityWeight:1,minDistance:7,maxPerZone:2,preferredNeighbors:Object.freeze([]),avoidNeighbors:Object.freeze([]),tags:Object.freeze(["terrain","rock"])}),
 mapPlacement:Object.freeze({radius:type==="rock_ramp"?3.1:2.8,volume:"large"}),build
});
const extra=Object.freeze({
 rock_ramp:mk("NAT-RAMP-L-001","rock_ramp","Rampe rocheuse naturelle",ramp),
 natural_rock_platform:mk("NAT-PLAT-L-001","natural_rock_platform","Plateforme rocheuse naturelle",platform)
});
const data=Object.freeze({...base.data,...extra});
const byId=new Map(Object.values(data).map(d=>[d.id,d]));
const create=(THREE,type,palette,variant=0)=>{
 if(!extra[type])return base.create(THREE,type,palette,variant);
 const def=extra[type],instance=def.build(THREE,palette,variant);
 instance.catalogId=def.id;instance.definition=def;
 if(instance.root){Object.assign(instance.root.userData,{objectType:type,catalogId:def.id,category:def.category,subtype:def.subtype,size:def.size,rarity:def.rarity,functional:def});}
 return typeof base.applyCreateHooks==="function"?base.applyCreateHooks(instance,{THREE,type,palette,variant,definition:def}):instance;
};
BF.ObjectLibrary=Object.freeze({
 ...base,__heightR6:true,data,
 get:type=>data[type]||null,
 getById:id=>byId.get(id)||null,
 exists:type=>Object.prototype.hasOwnProperty.call(data,type),
 list(filters={}){return Object.values(data).filter(d=>(!filters.category||d.category===filters.category)&&(!filters.size||d.size===filters.size)&&(!filters.rarity||d.rarity===filters.rarity)&&(!filters.status||d.status===filters.status)&&(!filters.biome||d.biomes?.includes("all")||d.biomes?.includes(filters.biome)));},
 getSpawnProfile:type=>data[type]?.spawn||base.getSpawnProfile?.(type)||null,
 getMapPlacement:type=>data[type]?.mapPlacement||base.getMapPlacement?.(type)||null,
 create
});
console.info("[BlueFox R6] Objets hauteur CUO disponibles.");
})(window);