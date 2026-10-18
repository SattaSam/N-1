const assert = require('assert'); const fs=require('fs'); const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','engine','mission-manager.js'),'utf8');
assert(src.includes('knownDestinationCandidates(travel, criteria = this.knownDestinationCriteria(travel), limit = 12)'));
assert(src.includes('.slice(0, Math.max(1, Number.isFinite(limit) ? limit : 12))'));
assert(src.includes('travel, criteria, Number.MAX_SAFE_INTEGER'));
assert(src.includes('if (criteria.sourceNodeId)'));
console.log('PASS destination persisted source checks');
