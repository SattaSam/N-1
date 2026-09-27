const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const listeners={};const store={};
const w={BlueFox3D:{},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},addEventListener(t,f){(listeners[t]||=[]).push(f)},removeEventListener(){},setInterval(){return 0},clearInterval(){},setTimeout(fn){fn();return 0},clearTimeout(){},CustomEvent:class{constructor(type,o={}){this.type=type;this.detail=o.detail}},dispatchEvent(){},Date,Math,console};w.window=w;
vm.runInNewContext(fs.readFileSync(path.join(root,'engine/map-exploration-tracker.js'),'utf8'),w);
const t=w.BlueFox3D.mapExploration;w.BlueFox3D.currentEngine={currentMapId:'m',currentPlanetId:'p',currentZoneIndex:0,currentMap:{bounds:27},character:{root:{position:{x:5,z:5}}},explorationRelocationGuard:{mapId:'m',x:5,z:5,releaseDistance:.9}};
t.sampleCurrentEngine();let state=t.getMap('m');assert.equal(state.surfacePercent,0);assert.equal(Object.keys(state.visitedSectors).length,0);
w.BlueFox3D.currentEngine.character.root.position={x:6.2,z:5};t.sampleCurrentEngine();state=t.getMap('m');assert(state.surfacePercent>0,'exploration doit reprendre après mouvement réel');assert.equal(w.BlueFox3D.currentEngine.explorationRelocationGuard,null);console.log('PASS exploration synthetic arrival suppression + movement resume');
