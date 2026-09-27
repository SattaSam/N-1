const assert=require('assert');
// Runtime minimal strictement reconstitué depuis la branche RESEARCH d'ActionBridge du HEAD 2bd40eaf.
// Il vérifie les deux contrats qui nous intéressent sans réinventer un propriétaire :
// requiresShelter -> canAccessCampInventory(), puis consumeInventoryPoolOnce par entrée.
function executeResearch(action, BF, engine){
  if(action.params?.requiresShelter===true && BF.canAccessCampInventory?.()!==true) return false;
  const consumes=Array.isArray(action.params?.inventoryConsume)?action.params.inventoryConsume:[];
  if(consumes.length){
    const plan=consumes.map(entry=>({inventoryKey:String(entry?.inventoryKey||''),quantity:Math.max(0,Number(entry?.quantity)||0)}));
    if(plan.some(entry=>!entry.inventoryKey||!entry.quantity||Number(BF.progression?.availableInventory?.([entry.inventoryKey]))<entry.quantity)) return false;
    for(const [index,entry] of plan.entries()){
      const transactionId=`${action.missionId||'mission'}:${action.nodeId||'research'}:inventory-consume:${index}`;
      const removed=BF.consumeInventoryPoolOnce?.(transactionId,[entry.inventoryKey],entry.quantity);
      if(removed!==entry.quantity) return false;
    }
  }
  engine.startRoutine('research');
  return true;
}
const stock={magnetic_ore:20,crystal:10,parts:5};
const tx={}; let access=false, routines=0;
const BF={
  canAccessCampInventory:()=>access,
  progression:{availableInventory:keys=>stock[keys[0]]||0},
  consumeInventoryPoolOnce:(id,keys,amount)=>{
    if(tx[id]!==undefined) return tx[id];
    const key=keys[0]; if((stock[key]||0)<amount) return 0;
    stock[key]-=amount; tx[id]=amount; return amount;
  }
};
const engine={startRoutine:()=>{routines+=1;}};
const action={missionId:'PROS-03',nodeId:'PROS-03:optimize',params:{requiresShelter:true,inventoryConsume:[{inventoryKey:'magnetic_ore',quantity:20},{inventoryKey:'crystal',quantity:10},{inventoryKey:'parts',quantity:5}]}};
assert.equal(executeResearch(action,BF,engine),false,'hors infrastructure la recherche doit être refusée');
assert.deepStrictEqual(stock,{magnetic_ore:20,crystal:10,parts:5},'aucune ressource ne doit être consommée hors infrastructure');
access=true;
assert.equal(executeResearch(action,BF,engine),true,'à l infrastructure l optimisation doit être exécutable');
assert.deepStrictEqual(stock,{magnetic_ore:0,crystal:0,parts:0},'20/10/5 doivent être réellement consommés');
assert.equal(routines,1);
assert.equal(executeResearch(action,BF,engine),false,'une réévaluation après consommation est refusée par le contrôle de stock');
assert.deepStrictEqual(stock,{magnetic_ore:0,crystal:0,parts:0},'la transaction ne doit jamais consommer deux fois');
console.log('PROS consumption runtime: PASS');
