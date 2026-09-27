const fs=require('fs'),assert=require('assert'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'engine','object-library-p2-1.js'),'utf8');

const block=src.match(/const membrane = new THREE\.MeshPhysicalMaterial\(\{([\s\S]*?)\n    \}\);/);
assert(block,'translucent membrane material must exist');
const text=block[1];
const num=(name)=>{
  const m=text.match(new RegExp(name+'\\s*:\\s*([0-9.]+)'));
  assert(m,`${name} must be explicit`);
  return Number(m[1]);
};
assert(num('opacity')>=0.60,'Translucent silhouette opacity must remain readable against scenery');
assert(num('transmission')<=0.25,'Transmission must not erase the body against bright/complex backgrounds');
assert(num('emissiveIntensity')>=0.55,'Membrane needs a stable luminous body cue');
assert(num('roughness')>=0.30,'Membrane must retain enough diffuse response for silhouette readability');
assert(/side:\s*THREE\.DoubleSide/.test(text),'silhouette must remain visible from both camera sides');
assert(/depthWrite:\s*false/.test(text),'keep historical transparent depth-write behavior; avoid unrelated render-order regression');

console.log('PASS npc-r45-translucent-visibility-contract');
