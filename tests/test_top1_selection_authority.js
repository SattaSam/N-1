const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.env.MANAGER_FILE||require('node:path').join(__dirname,'../engine/mission-manager.js'),'utf8');
const BF={Missions:{definitions:{A:{id:'A'},B:{id:'B'}},getDefinition:id=>BF.Missions.definitions[id]||null}};
const window={BlueFox3D:BF,addEventListener(){},removeEventListener(){},dispatchEvent(){},localStorage:{getItem(){return null}}};window.window=window;
vm.runInNewContext(source,{window,CustomEvent:class{},console,performance,Date,Math,JSON,Set,Map});
const m=Object.create(BF.Missions.MissionManager.prototype);const mk=()=>({root:{isComplete:false},title:'Mission'});
m.trees=new Map([['A',mk()],['B',mk()]]);m.tree=m.trees.get('A');m.primaryMissionId='A';m.activeMissionId='A';m.activeMissionIds=['A','B'];m.selectionReason='Priorité suggérée par le joueur.';
m.memory={state:{primaryMissionId:'A',activeMissionId:'A',activeMissionIds:['A','B'],missionLifecycle:{A:{status:'active',selectionReason:'Priorité suggérée par le joueur.'},B:{status:'active'}}},save(){},saveTree(){}};
m.planner={restoreOrCreate:mk};m.bridge={context(){return {}},isEngineBusy(){return false}};m.currentAction=null;m.publish=()=>{};m.hasPendingMissionReturn=()=>true;m.localCompletionGateFor=()=>false;m.missionIsBackgroundProgressOnly=()=>false;m.ensureLifecycle=(id)=>m.memory.state.missionLifecycle[id];
assert.equal(m.isPlayerSelectedPrimary(),true);
assert.equal(m.selectBestPrimary(performance.now()),false);
m.syncMissionSelection();
assert.equal(m.isPlayerSelectedPrimary(),true,'pending mission return must not revoke player-selected authority');
assert.equal(m.memory.state.missionLifecycle.A.selectionReason,'Priorité suggérée par le joueur.');
// A status message should not revoke a verified explicit player selection.
m.selectionReason='Intention de transition missionnelle persistante ; l’arbitrage local reste borné à la map courante.';
m.setPrimaryMission('A',false,'Priorité suggérée par le joueur.');
m.selectionReason='Rapport temporaire';m.syncMissionSelection()
assert.equal(m.isPlayerSelectedPrimary(),true,'explicit provenance must survive status messages');
// A different, automatic primary must not inherit the player's privilege.
m.setPrimaryMission('B',false,'Priorité automatique : test.');
assert.equal(m.isPlayerSelectedPrimary(),false);
m.setPrimaryMission('A',false,'Priorité automatique : test.');
assert.equal(m.isPlayerSelectedPrimary(),false,'previously player-selected mission must lose privilege on auto-selection');
// Persisted provenance is recognized after restoring the manager object.
m.setPrimaryMission('A',false,'Priorité suggérée par le joueur.');
const restored=Object.create(BF.Missions.MissionManager.prototype);
restored.primaryMissionId='A';restored.tree=m.tree;restored.memory={state:JSON.parse(JSON.stringify(m.memory.state))};
assert.equal(restored.isPlayerSelectedPrimary(),true,'explicit selection must survive save/load');
restored.memory.state.missionLifecycle.A.playerSelectedPrimary=undefined;
restored.memory.state.missionLifecycle.A.selectionReason='Intention de transition missionnelle persistante ; l’arbitrage local reste borné à la map courante.';
assert.equal(restored.isPlayerSelectedPrimary(),false,'ambiguous old save must not be promoted without proof');
console.log('PASS top1 selection authority, pending return and automatic priority');
