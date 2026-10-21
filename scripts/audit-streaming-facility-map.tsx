import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FacilityCapacityPanel} from '../components/studio-finance/components/build/FacilityCapacityPanel';
import type {BuildTotals} from '../components/studio-finance/finance/build';
function render(demand:number,capacity:number,burst=0) {
 return renderToStaticMarkup(<FacilityCapacityPanel expectedPeak={demand} totals={{capacity,burst,racks:0} as BuildTotals}/>);
}
const normal=render(4_400_000,75_500_000,23_000_000);
assert.doesNotMatch(normal,/Facility map|bw-fleet|bw-aisle/,'Removed map must not add another scroll or misleading machines');
assert.match(normal,/Spare regular capacity/);
assert.match(normal,/71\.1M/,'Regular headroom excludes burst reserve');
assert.match(normal,/\+23M/);
assert.match(normal,/is-good/);
assert.match(render(79,100),/is-good/);
assert.match(render(80,100),/is-warn/,'80% starts the approaching-limit warning');
assert.match(render(100,100),/At regular capacity/);
assert.match(render(110,100,20),/Burst needed/);
assert.match(render(120,100,20),/Burst needed/,'Exactly total capacity is not a shortfall');
assert.match(render(121,100,20),/Shortfall/);
assert.match(render(121,100,20),/is-bad/);
assert.match(render(0,0),/No capacity planned/);
assert.match(render(1,0,2),/Burst needed/);
assert.match(render(1,0),/is-bad/);
assert.match(render(1,1000),/&lt;1%/);
for(const args of [[0,0],[1,0],[100,0,200],[1,1e12],[200,100,20]] as const) {
 assert.doesNotMatch(render(args[0],args[1],args[2] ?? 0),/NaN|Infinity/,'Zero capacity must never produce invalid meter dimensions');
}
console.log('PASS capacity boundaries, exact demand/spare semantics, burst distinction and map removal');
