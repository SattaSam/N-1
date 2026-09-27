const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'..');
const window={BlueFox3D:{Missions:{ActionType:{RESEARCH:'research',REST:'rest',EAT:'eat',OBSERVE:'observe',ANALYZE:'analyze',EXPLORE_ZONE:'explore-zone'}}}};window.window=window;
const ctx=vm.createContext({window,console});vm.runInContext(fs.readFileSync(path.join(root,'engine/bible-contract-v0-1.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(root,'data/bible-catalog.js'),'utf8'),ctx);
const BF=window.BlueFox3D,patterns={SEQUENCE_ACTIONS:{dynamicSequence:true,minSteps:2}};const ids=[...Array.from({length:4},(_,i)=>`TERR-CARN-0${i+1}`),...Array.from({length:4},(_,i)=>`TERR-STORM-0${i+1}`)];
for(const id of ids){const m=BF.BibleCatalog.find(x=>x.id===id),r=BF.BibleContractV01.validateMission(m,patterns,{compatibility:'strict'});assert.equal(r.ok,true,`${id} contrat FAIL: ${r.errors.join(' | ')}`)}
const bad=JSON.parse(JSON.stringify(BF.BibleCatalog.find(x=>x.id==='TERR-CARN-01')));bad.trigger.featuredMicroSceneIdsAny='MSC-PREDATOR-FLORA-001';const r=BF.BibleContractV01.validateMission(bad,patterns,{compatibility:'strict'});assert.equal(r.ok,false);assert(r.errors.some(x=>x.includes('featuredMicroSceneIdsAny')));
console.log('PASS TERR CARN/STORM Bible contract featuredMicroSceneIdsAny');
