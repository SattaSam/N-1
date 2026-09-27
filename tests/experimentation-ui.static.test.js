const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'engine/ui-enhancements.js'),'utf8');

test('Recherche expose les expérimentations sans remplacer plans/recettes',()=>{
  assert.match(src,/research\.experimentationList\?\.\(\)/);
  assert.match(src,/Lancer une expérimentation/);
  assert.match(src,/research\.runExperiment\?\.\(state\.id/);
  assert.match(src,/PLANS ET RECETTES DÉBLOQUÉS/);
  assert.match(src,/research\.canCraft\?\.\(entry\.id, 1\)/);
});

test('Recherche résout les clés techniques en noms humains via ObjectLibrary',()=>{
  assert.match(src,/const researchResourceLabel = \(inventoryKey\) =>/);
  assert.match(src,/ObjectLibrary\?\.list\?\.\(\)\.find/);
  assert.match(src,/item\.resource\?\.inventoryKey === key/);
  assert.match(src,/definition\?\.label \|\| definition\?\.name \|\| definition\?\.title/);
  assert.match(src,/researchRequirementLabel\(item\)/);
  assert.doesNotMatch(
    src,
    /\$\{item\.inventoryKey \|\| item\.inventoryKeys\?\.join\("\/"\)/
  );
});

test('les expérimentations utilisent deux tuiles par ligne et une colonne sur petit écran',()=>{
  assert.match(
    src,
    /\.bluefox-experiment-grid \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/
  );
  assert.match(src,/\.bluefox-experiment-card \{ grid-column:span 1;/);
  assert.match(src,/\.bluefox-experiment-card h3 \{ font-size:14px;/);
  assert.match(
    src,
    /@media \(max-width:650px\)[\s\S]*?\.bluefox-experiment-grid \{ grid-template-columns:minmax\(0,1fr\); \}/
  );
});
