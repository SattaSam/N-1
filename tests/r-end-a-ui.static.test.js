const fs=require('fs'),path=require('path'),assert=require('assert/strict');const root=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');const s=fs.readFileSync(path.join(root,'engine/mission-ui-bridge.js'),'utf8');
assert(s.includes('BF.getMissionChoiceState'));assert(s.includes('BF.submitMissionChoice'));assert(s.includes('mission-choice-button'));assert(s.includes('option.label'));assert(!s.includes('endChoice:decision'),'UI ne doit pas posséder le fait métier END');
console.log('PASS END-A UI: generic presentation only, runtime remains business owner');
