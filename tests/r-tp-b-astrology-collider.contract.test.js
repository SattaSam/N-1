const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'engine/object-spawner.js'),'utf8');
assert(src.includes('template.id === "MSC-CUSTOM-ASTROLOGY"'),'exception ASTROLOGY absente');
assert(src.includes('entry.type === "arch"'),'exception non bornée au type arch');
assert(src.includes('instance.colliders.length = 0'),'colliders ASTROLOGY non neutralisés');
const globalSpawn=src.slice(src.indexOf('spawn(type, options = {})'),src.indexOf('spawnMicroScene'));
assert(!globalSpawn.includes('colliders.length = 0'),'les arches globales ne doivent pas perdre leurs colliders');
console.log('PASS ASTROLOGY-only arch collider contract');
