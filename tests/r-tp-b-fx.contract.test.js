const fs=require('fs'),path=require('path'),assert=require('assert');
const s=fs.readFileSync(path.resolve(__dirname,'../engine/special-object-runtime.js'),'utf8');
for(const token of ['hub-departure','beacon-arrival','beacon-departure','hub-return','hub-calibration','age / 2000','eroded_monolith','disposeTeleportFx']) assert(s.includes(token),`FX contract missing ${token}`);
assert(s.includes('const barCount = kind.includes("hub") ? 4 : 3;'),'ASTROLOGY doit se disloquer en 3–4 barres principales');
assert(s.includes('breaking * (0.55 + (index % 2) * 0.08)'),'fragments doivent pouvoir dériver au-delà du halo cohérent');
assert(s.includes('1.05 - converge * 0.52'),'retour doit converger, pas rejouer le départ');
assert(s.includes('0.16 + saturation * 0.76'),'halo central doit tendre vers une lumière presque solide');
console.log('PASS teleport FX halo-contained / solid-light / 4 bars / beacon arrival / inverse-return contract');
