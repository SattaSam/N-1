const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');const mm=fs.readFileSync(path.join(root,'engine/mission-manager.js'),'utf8');const we=fs.readFileSync(path.join(root,'engine/world-engine.js'),'utf8');
assert(mm.includes('allowTeleportOptimization: true'),'MissionManager doit opt-in explicitement');
assert(we.includes('detail.allowTeleportOptimization === true'),'WorldEngine doit exiger opt-in');
assert(we.includes('intent.allowTeleportOptimization === true'),'opt-in doit survivre à la navigation persistante');
assert(we.includes('findKnownRoute(startMapId, targetMapId) {\n      return this.findPhysicalRoute'),'findKnownRoute historique ne doit pas devenir multimodal');
console.log('PASS mission autonomous routing opts in without changing historical routing contract');
