const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');process.env.BLUEFOX_ROOT=ROOT;
const source=fs.readFileSync(path.join(ROOT,'tests/mission-eligibility-stock-fauna.runtime.test.js'),'utf8');
const {H}=new Function('require','__dirname',source.slice(0,source.indexOf('\nfor(const id'))+'\nreturn {H};')(require,path.join(ROOT,'tests'));
function objects(f){const objects=['pool','spore','fern','fiber'].map(type=>{const o=f.object(type);o.userData.microSceneId='MSC-LUMINOUS-OASIS-001';return o});f.engine.currentMap.interactables=objects;f.engine.currentMap.group={children:objects,userData:{microScenes:[]}};}
function action(f,t,slot,index){const n=t.find(`${t.id}:${slot}`),a={missionId:t.id,nodeId:n.id,type:n.type,params:n.params};
 assert(t.availableLeaves().includes(n),`${slot} must be eligible before execution`);
 assert.equal(f.manager.executeSelectedMissionAction({missionId:t.id,action:a,primary:true},10000+index*100000),true);
 for(let now=10000+index*100000;now<100000+index*100000;now+=1000)f.engine.updateInteraction(now);
 assert.equal(n.isComplete,true,`${slot} gets native event credit`);}
test('optional final acquisition is playable during the native mandatory chain, without blocking its conclusion',async()=>{
 const f=await H.live(),t=H.start(f,'OPP-OASIS-01');objects(f);f.memory.setFact('bibleActivation:OPP-OASIS-01',{mapId:'crystal'});
 action(f,t,'pool',0);action(f,t,'optionalSample',1);assert.equal(t.root.isComplete,false);
 action(f,t,'spore',2);action(f,t,'plant',3);assert.equal(t.root.isComplete,true);
 assert.equal(f.BF.getProgressionState().inventory.fiber,1);
});
test('skipping the optional acquisition does not block the native mandatory chain',async()=>{
 const f=await H.live(),t=H.start(f,'OPP-OASIS-01');objects(f);f.memory.setFact('bibleActivation:OPP-OASIS-01',{mapId:'crystal'});
 for(const [i,slot]of ['pool','spore','plant'].entries())action(f,t,slot,i);
 assert.equal(t.root.isComplete,true);assert.equal(t.find('OPP-OASIS-01:optionalSample').progress,0);
});
test('explicit optional dependencies remain sovereign throughout the whole catalogue',async()=>{
 const f=await H.live();let count=0;for(const m of H.catalog){const t=f.planner.createTree(m.id);for(const s of m.sequence||[]){
  if(!s.optional||s.requires==null)continue;count++;assert.deepEqual(Array.from(t.find(`${m.id}:${s.slot}`).requires),Array.from(s.requires,x=>`${m.id}:${x}`));
 }}assert(count>0);
});
test('an older active tree uses the repaired optional contract without rewriting saved requirements or proof',async()=>{
 const f=await H.live(),t=H.start(f,'OPP-OASIS-01'),n=t.find('OPP-OASIS-01:optionalSample');
 n.requires=['OPP-OASIS-01:plant'];n.historyValues.push('old-proof');f.memory.saveTree(t);
 const restored=f.planner.restoreOrCreate(t.id),option=restored.find(n.id);
 assert(restored.availableLeaves().includes(option));assert.deepEqual(Array.from(option.toJSON().requires),['OPP-OASIS-01:plant']);
 assert.deepEqual(Array.from(option.historyValues),['old-proof']);assert.equal(option.progress,0);
});
test('completed older mission stays complete and keeps its saved proofs',async()=>{
 const f=await H.live(),t=H.start(f,'OPP-OASIS-01');for(const n of t.availableLeaves())if(!n.optional)f.completeNode(n);
 for(const slot of ['pool','spore','plant'])f.completeNode(t.find(`${t.id}:${slot}`));t.refresh();
 const n=t.find(`${t.id}:optionalSample`);n.requires=[`${t.id}:plant`];f.memory.saveTree(t);
 const restored=f.planner.restoreOrCreate(t.id);assert.equal(restored.root.isComplete,true);assert.equal(restored.find(n.id).progress,0);
 assert.deepEqual(Array.from(restored.find(n.id).toJSON().requires),[`${t.id}:plant`]);
});
