const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
function loadCatalog(p){const w={BlueFox3D:{}};w.window=w;vm.runInNewContext(fs.readFileSync(p,'utf8'),{window:w,console});return w.BlueFox3D.BibleCatalog;}
const base=loadCatalog(path.join(root,'BASE/data/bible-catalog.js'));
const cand=loadCatalog(path.join(root,'data/bible-catalog.js'));
assert.equal(base.length,300,'HEAD afb47e54 attendu à 300 missions');
assert.equal(cand.length,310,'Catalogue combiné attendu : 300 historiques + 8 CARN/STORM + TP-10/TP-11');
const ids=[...Array.from({length:4},(_,i)=>`TERR-CARN-${String(i+1).padStart(2,'0')}`),...Array.from({length:4},(_,i)=>`TERR-STORM-${String(i+1).padStart(2,'0')}`)];
const added=new Set([...ids,'TP-10','TP-11']);const stripped=cand.filter(m=>!added.has(m.id));assert.equal(stripped.length,base.length);
for(let i=0;i<base.length;i++){assert.equal(stripped[i].id,base[i].id,`ordre historique modifié à ${i}`);assert.deepStrictEqual(JSON.parse(JSON.stringify(stripped[i])),JSON.parse(JSON.stringify(base[i])),`mission HEAD modifiée: ${base[i].id}`);}
const by=new Map(cand.map(m=>[m.id,m]));
function checkArc(prefix,scene,cuo){
 const durations=[];
 for(let n=1;n<=4;n++){
  const id=`TERR-${prefix}-${String(n).padStart(2,'0')}`,m=by.get(id);assert(m,`${id} absente`);
  assert.equal(m.trigger.type,'exploration.map_discovered');assert.equal(m.trigger.count,n);assert.equal(m.trigger.uniqueOnly,true);
  assert.deepStrictEqual(Array.from(m.trigger.featuredMicroSceneIdsAny),[scene]);assert.equal(m.bindActivationMap,true);assert.equal(m.primaryOnActivation,true);assert.equal(m.autoPrimaryEligible,true);assert.equal(m.passivePriorityAxis,'survival');assert.equal(m.prerequisites,undefined);
  const approach=m.sequence.find(s=>s.slot==='approach');assert(approach);assert.equal(approach.action,'observe');assert.equal(approach.params.cuoType,cuo);assert.equal(approach.params.microSceneId,scene);assert.equal(approach.params.proximityOnly,true);assert(approach.params.proximityRadius>0);assert.equal(approach.params.requiredMapFact,`bibleActivation:${id}`);
  const retreat=m.sequence.find(s=>s.slot==='retreat');assert(retreat);assert.equal(retreat.action,'explore-zone');assert.equal(retreat.params.requiredMapFact,`bibleActivation:${id}`);
  const exposure=m.sequence.find(s=>s.slot==='exposure');
  if(n<4){
    assert(exposure);assert.equal(exposure.action,'research');assert.equal(exposure.target,1,'une rencontre = une seule routine temporisée');
    assert.equal(exposure.params.requiredMapFact,`bibleActivation:${id}`);assert.equal(exposure.params.requiredMapField,'mapId');
    assert(Number(exposure.params.duration)>0);durations.push(Number(exposure.params.duration));
  } else assert.equal(exposure,undefined,'4e rencontre: aucune exposition prolongée');
 }
 assert(durations[0]>durations[1]&&durations[1]>durations[2],'durée réelle doit diminuer 1 > 2 > 3');
 for(const n of [1,2]){const m=by.get(`TERR-${prefix}-0${n}`);assert(m.sequence.some(s=>s.slot==='recover'&&s.action==='rest'));assert(m.sequence.some(s=>s.slot==='restore'&&s.action==='eat'));}
 assert.equal(by.get(`TERR-${prefix}-02`).souvenir,true);assert.equal(by.get(`TERR-${prefix}-02`).memoryValence,'negative');assert.equal(by.get(`TERR-${prefix}-03`).souvenir,true);assert.equal(by.get(`TERR-${prefix}-03`).memoryValence,'negative');
}
checkArc('CARN','MSC-PREDATOR-FLORA-001','carnivorous_plant');
checkArc('STORM','MSC-LOCAL-STORM-001','electrostatic_storm');
assert(!JSON.stringify(cand.filter(m=>added.has(m.id))).includes('Sanctuaire_Orchidee_'),'Sanctuaire_Orchidee hors périmètre');
console.log('PASS TERR CARN/STORM + TP coexistence, 300 missions historiques préservées');
