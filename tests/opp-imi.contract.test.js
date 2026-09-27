const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');
const w={BlueFox3D:{}};w.window=w;
vm.runInNewContext(fs.readFileSync(path.join(root,'data','bible-catalog.js'),'utf8'),{window:w,console});
const cat=w.BlueFox3D.BibleCatalog, opp=cat.filter(m=>m.id?.startsWith('OPP-')), by=new Map(opp.map(m=>[m.id,m]));
const ids=['OPP-CIV-01','OPP-FAU-01','OPP-MET-01','OPP-MET-02','OPP-BIO-01','OPP-GEO-01','OPP-CIV-02','OPP-MET-03','OPP-BIO-02','OPP-ORCH-NAT-01','OPP-ORCH-NAT-02','OPP-ORCH-BAS-01','OPP-ORCH-BAS-02','OPP-ORCH-RIV-01','OPP-ORCH-RIV-02','OPP-ORCH-RIV-03','OPP-ADR-01','OPP-ADR-02','OPP-ADR-03','OPP-OASIS-01','OPP-HIDDEN-01','OPP-NEST-01','OPP-SAN-BIG-01'];
assert.equal(opp.length,23); assert.deepEqual([...by.keys()],ids); assert.equal(new Set(cat.map(m=>m.id)).size,cat.length,'duplicate mission id');
const first=['OPP-CIV-01','OPP-FAU-01','OPP-MET-01','OPP-MET-02','OPP-BIO-01','OPP-GEO-01','OPP-CIV-02','OPP-MET-03','OPP-BIO-02','OPP-ORCH-NAT-01','OPP-ORCH-BAS-01','OPP-ORCH-RIV-01','OPP-ADR-01','OPP-OASIS-01','OPP-HIDDEN-01','OPP-NEST-01','OPP-SAN-BIG-01'];
for(const id of first){const m=by.get(id);assert.equal(m.trigger.type,'exploration.map_discovered',id);assert.equal(m.trigger.uniqueOnly,true,id);assert.equal(m.trigger.featuredMicroSceneIdsAny.length,1,id);assert.equal(m.bindActivationMap,true,id);assert.equal(m.mapGeneration,undefined,`${id}: OPP must wait for a real generated MSC, not force one`);}
const follows=[['OPP-ORCH-NAT-02','OPP-ORCH-NAT-01'],['OPP-ORCH-BAS-02','OPP-ORCH-BAS-01'],['OPP-ORCH-RIV-02','OPP-ORCH-RIV-01'],['OPP-ORCH-RIV-03','OPP-ORCH-RIV-02'],['OPP-ADR-02','OPP-ADR-01'],['OPP-ADR-03','OPP-ADR-02']];
for(const [id,prev] of follows){const m=by.get(id);assert.equal(m.trigger.type,'progression.mission_completed',id);assert.equal(m.trigger.missionId,prev,id);assert.deepEqual(Array.from(m.prerequisites),[prev],id);assert.equal(m.mapGeneration,undefined,`${id}: follow-up must never respawn its MSC`);}
const civ1=by.get('OPP-CIV-01'),civ2=by.get('OPP-CIV-02');
assert.deepEqual(Array.from(civ1.prerequisites),['T13']);
assert.equal(civ1.narrative.revealed.length,0);assert.equal(civ1.narrative.progress[0].slot,'presence');assert.equal(civ2.narrative.revealed.length,0);assert.equal(civ2.narrative.progress[0].slot,'camp');
assert.equal(civ1.npcEncounters[0].cuoType,'npc_translucent');assert.equal(civ1.npcEncounters[0].microSceneId,'MSC-CUSTOM-SHADOW-TRANSLUCENT');assert.equal(civ1.npcEncounters[0].despawnOnDistanceBelow,10);
assert.deepEqual(Array.from(civ2.trigger.featuredMicroSceneIdsAny),['MSC-CUSTOM-SHADOW-ROCKY-001']);assert.equal(civ2.npcEncounters[0].cuoType,'npc_rocky');assert.equal(civ2.npcEncounters[0].microSceneId,'MSC-CUSTOM-SHADOW-ROCKY-001');assert.equal(civ2.npcEncounters[0].despawnOnDistanceBelow,10);assert.equal(civ2.sequence.find(s=>s.slot==='fire').params.cuoType,'base_fire');
for(const m of [civ1,civ2]) for(const step of m.sequence) assert(!['contact','talk'].includes(String(step.action)),`${m.id}: direct NPC interaction forbidden`);
const fau=by.get('OPP-FAU-01');assert.equal(fau.sequence[0].sameTarget,true);assert.equal(fau.sequence[1].sameTarget,true);assert(fau.sequence.every(s=>s.params.tagsAll.includes('period_night')));
assert.equal(by.get('OPP-ADR-03').sequence.find(s=>s.slot==='optionalDebris').optional,true);assert.equal(by.get('OPP-OASIS-01').sequence.find(s=>s.slot==='optionalSample').optional,true);
for(const id of ['OPP-ORCH-NAT-01','OPP-ORCH-NAT-02','OPP-ORCH-BAS-01','OPP-ORCH-BAS-02','OPP-ORCH-RIV-01','OPP-ORCH-RIV-02','OPP-ADR-01','OPP-ADR-02']) assert.equal(by.get(id).obsessionEligible,true,`${id}: obsession eligibility`);
for(const id of ['OPP-ORCH-RIV-03','OPP-ADR-03']){assert.equal(by.get(id).obsessionEligible,false,id);assert.equal(by.get(id).souvenir,true,id);assert.equal(by.get(id).memoryValence,'positive',id);}
assert.equal(by.get('OPP-ORCH-RIV-03').sequence.some(s=>String(s.action).includes('collect')),false,'RIV-03 must not encode do-not-collect as an action');
for(const m of opp){for(const step of m.sequence||[]){if(['research'].includes(step.action)) assert(Number(step.params?.duration)>0,`${m.id}/${step.slot}: research duration required`);}}
console.log('PASS OPP catalog: 23 missions + real-MSC triggers + series lifecycle + CIV no-contact + FAU same-instance + optional samples + psychology');
