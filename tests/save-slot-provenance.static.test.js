const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'..','engine','save-ui-bridge.js'),'utf8');

test('writeLocalCache does not overwrite active slot provenance', () => {
  const start = source.indexOf('const writeLocalCache');
  const end = source.indexOf('const markActiveSnapshot', start);
  const block = source.slice(start, end);
  assert.doesNotMatch(block, /setItem\(ACTIVE_SLOT_KEY/);
  assert.match(source, /const markActiveSnapshot/);
});

test('manual bootstrap no longer falls back to auto file', () => {
  const start = source.indexOf('const bootstrapFromFile');
  const end = source.indexOf('const flush', start);
  const block = source.slice(start, end);
  assert.match(block, /const fileSnapshot = await readFileSnapshot\(slot\)/);
  assert.doesNotMatch(block, /slot\s*!==\s*"auto"\s*\?\s*await readFileSnapshot\("auto"\)/);
});

test('recovery cannot write localStorage undefined key', () => {
  assert.match(source, /const cacheKey = SLOT_KEYS\[slot\]/);
  assert.match(source, /if \(!cacheKey\) return false/);
});
