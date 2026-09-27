const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const fauna=fs.readFileSync(path.join(__dirname,'..','engine','fauna-runtime.js'),'utf8');
const noSpin=fs.readFileSync(path.join(__dirname,'..','engine','fauna-no-spin-r6.js'),'utf8');
test('FAU-10 historique conserve activation mission + diffusion 1/5 + phases physiques',()=>{
  assert.match(fauna,/status === "active"/);
  assert.match(fauna,/status !== "completed" \|\| state\.toolUseSlot % 5 !== 0/);
  assert.match(fauna,/faunaToolUseOwnerSlot = state\.toolUseSlot/);
  assert.match(fauna,/tool\.phase === "approach"/);
  assert.match(fauna,/tool\.phase === "push"/);
  assert.match(fauna,/ball\.position\.copy\(tool\.ballStart\)\.addScaledVector/);
  assert.match(fauna,/animateNosePush/);
  assert.match(fauna,/generalizedRate: "1\/5"/);
});
test('compatibilite scene missionnelle ancienne + PersistentMicroScenes actuelle',()=>{
  assert.match(fauna,/biblePersistentScene \|\|\s*grazer\.userData\?\.persistentMicroSceneId/);
  assert.match(fauna,/biblePersistentScene \|\|\s*ball\.userData\?\.persistentMicroSceneId/);
});
test('fauna-no-spin reste fallback uniquement hors FaunaRuntime',()=>{
  assert.match(noSpin,/BF\.FaunaRuntime\?\.getState/);
  assert.match(noSpin,/if\(s\)return/);
});
