import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
// User-reviewed Claude source, not a recapture of gameplay or localization fixtures.
const contract=JSON.parse(readFileSync('docs/reports/2026-10-22-operations-transplant/approved-ui-styles.json','utf8'));
for(const [path,expected] of Object.entries(contract.styles)){
 const actual=createHash('sha256').update(readFileSync(path)).digest('hex');
 assert.equal(actual,expected,`Approved Claude Operations style changed: ${path}`);
}
console.log(`PASS ${Object.keys(contract.styles).length} exact approved Operations stylesheets`);
