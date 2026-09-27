const fs=require('fs');
const vm=require('vm');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8');
const window={BlueFox3D:{BiblePatterns:{SEQUENCE_ACTIONS:{autonomyAxis:'research'},TRAVEL_CYCLE:{autonomyAxis:'exploration'},EXPLORE_SCOPE:{autonomyAxis:'exploration'},OBSERVE_TARGET:{autonomyAxis:'research'},COLLECT_THEN_REWARD:{autonomyAxis:'collection'}}}};
window.window=window;
vm.runInNewContext(source,{window,console},{filename:'bible-catalog.js'});
const catalog=window.BlueFox3D.BibleCatalog;
const byId=new Map(catalog.map(m=>[m.id,m]));
const ids=['PHEN-01','PHEN-02','PHEN-03','PHEN-04','PHEN-05','PHEN-06'];
ids.forEach(id=>assert(byId.has(id),`${id} absent`));
assert(catalog.length >= 279,'les 273 missions du HEAD ECO-SIS + PHEN-01→06 doivent rester présentes sans bloquer les lots ultérieurs');
const step=(mission,slot)=>mission.sequence.find(entry=>entry.slot===slot);

const p1=byId.get('PHEN-01');
assert.deepStrictEqual(Array.from(p1.prerequisites),['BAL-03','ENE-13']);
assert.equal(p1.trigger.missionId,'BAL-03');
assert.equal(step(p1,'bluefoxReading').params.actor,'bluefox');
assert.equal(step(p1,'scoutReading').params.actor,'scout');
assert.deepStrictEqual(Array.from(step(p1,'scoutReading').params.relation.sameBy),['instanceId']);
assert.equal(p1.mapGeneration.requiredObjects[0].type,'fog_bank');

for(const id of ids.slice(1)){
  const m=byId.get(id);
  assert(m.prerequisites.includes('PHEN-01'),`${id} doit dépendre de PHEN-01`);
  assert.equal(m.trigger.missionId,'PHEN-01',`${id} doit être révélé après PHEN-01`);
  assert.equal(m.concurrentAvailabilityGroup,'PHEN-01-OPPORTUNITIES',`${id} doit rester une opportunité parallèle`);
}

// Contrat de runnabilité : une mission PHEN qui demande au propriétaire de navigation
// de générer sa propre map doit commencer par une vraie feuille TRAVEL event-driven.
const generatedAutonomous=['PHEN-01','PHEN-02','PHEN-03','PHEN-05','PHEN-06'];
for(const id of generatedAutonomous){
  const m=byId.get(id);
  assert(m.mapGeneration,`${id} doit porter sa prescription de génération`);
  assert.equal(m.navigation?.autonomousUnknownTravel,true,`${id} doit demander la navigation autonome`);
  const travel=m.sequence.find(entry=>entry.action==='travel' && entry.params?.eventDriven===true);
  assert(travel,`${id} doit posséder un travel event-driven exécutable`);
  assert.equal(travel.params.newOnly,true,`${id} doit ouvrir une nouvelle map`);
  assert.deepStrictEqual(Array.from(travel.requires||[]),[],`${id} travel doit être une feuille disponible à l'activation`);
  const firstStudy=m.sequence.find(entry=>entry.action!=='travel');
  assert(firstStudy?.requires?.includes(travel.slot),`${id} ne doit pas étudier le contenu prescrit avant le voyage`);
}
assert.equal(byId.get('PHEN-04').mapGeneration,undefined,'PHEN-04 doit continuer à utiliser la map BAL-03 déjà connue');
assert(!byId.get('PHEN-04').sequence.some(entry=>entry.action==='travel'),'PHEN-04 ne doit pas recevoir un travel artificiel');

const p2=byId.get('PHEN-02');
assert.equal(p2.mapGeneration.biome,'volcanic');
assert.equal(step(p2,'scoutSurvey').params.actor,'scout');
assert.equal(step(p2,'scoutSurvey').target,3);
assert.equal(step(p2,'scoutSurvey').params.distinctBy,'instanceId');
assert.equal(step(p2,'bluefoxStudy').params.actor,'bluefox');

const p3=byId.get('PHEN-03');
assert.equal(p3.mapGeneration.biome,'frozen');
assert.equal(step(p3,'referenceCold').params.actor,'bluefox');
assert.deepStrictEqual(Array.from(step(p3,'compareCold').params.actorsAny),['bluefox','scout']);
assert.equal(step(p3,'compareCold').params.distinctBy,'objectId');

const p4=byId.get('PHEN-04');
assert.equal(step(p4,'fixedReference').params.actor,'bluefox');
assert.equal(step(p4,'gradient').params.actor,'scout');
assert.equal(step(p4,'gradient').params.requiredMapFact,'tutorialExcursion:BAL-03');
assert.equal(step(p4,'gradient').params.requiredMapField,'generatedTargetMapId');
assert.equal(step(p4,'gradient').target,3);

const p5=byId.get('PHEN-05');
assert.equal(p5.mapGeneration.biome,'magnetic');
assert.equal(p5.mapGeneration.requiredObjects[0].type,'mobile_islet');
assert.equal(p5.mapGeneration.requiredObjects[0].count,3);
assert.equal(step(p5,'scoutSet').params.actor,'scout');

const p6=byId.get('PHEN-06');
assert.equal(p6.mapGeneration.requiredMicroScenes[0].id,'MSC-LOCAL-STORM-001');
assert.equal(step(p6,'scoutStorm').params.cuoType,'electrostatic_storm');
assert.equal(step(p6,'scoutStorm').params.actor,'scout');

assert.deepStrictEqual(Array.from(byId.get('ENE-14').prerequisites),['ENE-13'],'PHEN ne doit pas bloquer ENE-14');
assert(!JSON.stringify(byId.get('ENE-14')).includes('PHEN-'), 'ENE-14 ne doit pas dépendre de PHEN');
assert(!ids.some(id=>JSON.stringify(byId.get(id)).includes('map-registry')),'aucune mission PHEN ne doit référencer map-registry');
console.log('PASS R-PHEN-2A catalog + autonomous travel runnability contract');
