const fs=require('fs'),assert=require('assert'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'engine','npc-runtime.js'),'utf8');

assert(src.includes('relationalEncounterId: 1'),'CONTACT encounter identity preserved');
assert(src.includes('behaviorSignature: String(extra.behaviorSignature || normalizedReaction)'),'CONTACT reaction signature preserved');
assert(src.includes('chooseRelationalDistance(root, options = {})'),'CONTACT spatial decision API preserved');
assert(src.includes('options.behaviorSignature || reaction'),'CONTACT reactToApproach metadata preserved');
assert(src.includes('contactControlled'),'active contact ownership preserved');
assert(src.includes('cause === "relational-approach"')===false,'runtime must emit canonical cause, not hardcode consumer logic');
assert(src.includes('emitNpcReaction(state, "flee", "relational-approach"'),'rapid approach emits canonical relational flee');
assert(src.includes('state.relationalReactionControlled = true'),'passive CONTACT reaction remains distinguishable from explicit control');
assert(src.includes('(state.controlled && !state.relationalReactionControlled)'),'explicit control is protected while passive relation may be interrupted');

console.log('PASS npc-r45-contact-regression');
