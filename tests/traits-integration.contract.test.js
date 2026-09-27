const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const settings = fs.readFileSync(path.join(ROOT,'engine/settings-ui-bridge.js'),'utf8');
const core = fs.readFileSync(path.join(ROOT,'engine/behavior-arbitration-core.js'),'utf8');
const integration = fs.readFileSync(path.join(ROOT,'engine/behavior-arbitration-integration.js'),'utf8');

test('Opportuniste est un alias de gameplay sans migration de la clé de sauvegarde historique', () => {
  assert.match(settings, /"respectueux\|destructeur": 88/);
  assert.match(settings, /profile\.opportuniste = 100 - left/);
  assert.match(settings, /Opportuniste : Saisit plus volontiers une occasion locale/);
});

test('Les pensées sont bornées aux arbitrages et disposent d’un cooldown', () => {
  assert.match(integration, /TRAIT_THOUGHT_COOLDOWN_MS = 18000/);
  assert.match(integration, /Tiens… je ferais bien un détour/);
  assert.match(integration, /Je ne vais pas passer à côté de cette opportunité/);
  assert.match(integration, /speakTraitThought\(this, selected\.traitReason\)/);
  assert.doesNotMatch(integration, /onSpeak\([^\n]*objectKind/);
});

test('Opportuniste agit sur une opportunité locale bornée et Respectueux ne remplace aucune action missionnelle', () => {
  assert.match(integration, /LOCAL_OPPORTUNITY_RADIUS = 14/);
  assert.match(integration, /localOpportunityCollectables/);
  assert.match(integration, /routeCost\(this, object\) > LOCAL_OPPORTUNITY_RADIUS/);
  assert.match(integration, /"opportuniste:opportunite"/);
  assert.match(integration, /"respectueux:mesure"/);
  assert.doesNotMatch(integration, /targetBinding\s*[:=]\s*["']instance["']/);
  assert.doesNotMatch(integration, /sameInstance\s*[:=]\s*true/);
});

test('La primaire runnable garde une autorité absolue sur toute fenêtre de personnalité', () => {
  assert.match(integration, /primaryMissionOwnsAction && traitLocalWindow/);
  assert.match(integration, /clearTraitLocalActionWindow\(this, "primary-mission-authority"\)/);
  assert.match(integration, /primaryMissionOwnsAction &&\n\s*rationCandidate\?\.allowDuringPrimaryMission !== true/);
  assert.doesNotMatch(integration, /primaryMissionOwnsAction &&\n\s*!traitLocalWindow/);
});

test('La fenêtre Opportuniste ne collecte que les cibles qui ont justifié l’opportunité', () => {
  assert.match(integration, /traitLocalWindow\?\.kind === "opportunity"[\s\S]{0,160}localOpportunityCollectables/);
  assert.match(integration, /selected = localOpportunityCollectables\.length \? preferredCollectionOption : null/);
});

test('La résistance et l’opportunisme utilisent une fenêtre locale unique, courte et strictement bornée', () => {
  assert.match(integration, /TRAIT_LOCAL_ACTION_MAX = 5/);
  assert.match(integration, /TRAIT_LOCAL_ACTION_WINDOW_MS = 35000/);
  assert.match(integration, /boundedLocalActionBudget/);
  assert.match(integration, /player-reissued-directive/);
  assert.match(integration, /survival-priority/);
  assert.match(integration, /higher-authority-action/);
  assert.match(integration, /\["collection-object", "research-object", "relations-object"\]/);
  assert.doesNotMatch(integration, /traitLocalActionWindow[\s\S]{0,500}known-gate/);
});

test('La relation ne contient plus de refus absolu du joueur', () => {
  assert.doesNotMatch(core, /Non\. Cette fois, je préfère suivre mon propre jugement/);
  assert.match(core, /D’accord… mais je préfère finir ce que j’ai commencé avant de changer de cap/);
});

test('Aucun nouveau propriétaire parallèle ni scheduler de personnalité', () => {
  assert.doesNotMatch(core + integration, /setInterval\([^)]*trait/i);
  assert.doesNotMatch(core + integration, /PersonalityManager|TraitManager|personalityEngine/);
});

test('La fenêtre locale et son cooldown utilisent la même horloge monotone que WorldEngine', () => {
  assert.match(integration, /const traitRuntimeNow = \(\) =>/);
  assert.match(integration, /global\.performance\?\.now\?\.\(\)/);
  assert.match(integration, /const activeTraitLocalActionWindow = \(engine, now = traitRuntimeNow\(\)\)/);
  assert.match(integration, /__traitLocalOpportunityCooldownUntil = now \+ TRAIT_LOCAL_OPPORTUNITY_COOLDOWN_MS/);
  assert.match(integration, /let traitLocalWindow = activeTraitLocalActionWindow\(this, now\);[\s\S]{0,160}postActionRecoveryUntil/);
  assert.doesNotMatch(integration, /expiresAt:\s*Date\.now\(\)/);
});
