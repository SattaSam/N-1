const fs=require('fs'),path=require('path'),assert=require('assert');
const s=fs.readFileSync(path.resolve(__dirname,'../engine/ui-enhancements.js'),'utf8');
assert(s.includes('teleportAction.type === "calibrate"'),'UI Planète doit exposer la calibration inerte distincte du voyage');
assert(s.includes('runtime?.calibrateTeleporter?.(teleportAction.targetMapId)'),'UI ne doit pas posséder la logique de calibration');
const m=s.match(/<polygon points="([^"]+)" fill="currentColor"/);assert(m,'étoile téléporteur SVG absente');
assert.equal(m[1].trim().split(/\s+/).length,14,'une étoile à 7 branches doit alterner 7 pointes et 7 creux');
console.log('PASS Planet UI teleporter action + inline seven-branch star');
