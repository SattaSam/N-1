const fs=require('fs'),assert=require('assert'),path=require('path');const ROOT=path.join(__dirname,'..');
const ui=fs.readFileSync(path.join(ROOT,'engine/ui-enhancements.js'),'utf8');
const runtime=fs.readFileSync(path.join(ROOT,'engine/special-object-runtime.js'),'utf8');
assert(ui.includes('RÉSEAU HARVEST · 4 EMPLACEMENTS MAX'));
assert(ui.includes('renderDroneConsole(section)'));
assert(ui.includes('runtime.consoleState()'));
assert(ui.includes('runtime.setHarvestPriority?.(drone.id, select.value)'));
assert(ui.includes('runtime.deployDrone?.("harvest_drone", drone.id)'));
assert(ui.includes('runtime.recallDrone?.("harvest_drone", "research-console", drone.id)'));
assert(runtime.includes('const MAX_HARVEST_DRONES = 4'));
assert(runtime.includes('const HARVEST_CARGO_CAPACITY = 150'));
assert(!ui.includes('nouveau menu drone'));

assert(ui.includes('research?.isUnlocked?.("harvest-drone-blueprint-v1") !== true'),'Harvest console hidden before Blueprint');
assert(ui.includes('Confirmer la priorité'),'collect_all can be explicitly confirmed');
assert(ui.includes('host.dataset.drn04ViewNoted'),'console view event is emitted once per opened console, not every render');
assert(runtime.includes('blueFoxHarvestDroneId'),'each deployed Harvest has a stable visual identity');
assert(runtime.includes('ensureDeployedDroneVisual("harvest_drone", drone.id)'),'Harvest visuals are restored on their deployed map');
console.log('PASS R3 Research console static owner/consumer');
