import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
import { InteractiveRegionMap } from '../views/lifestyle/business/components/InteractiveRegionMap';

const fallbackMarkup = renderToStaticMarkup(
    <InteractiveRegionMap selectedRegionIds={['NORTH_AMERICA']} showPreview={false} />,
);
assert.match(fallbackMarkup, /role="img"/);
assert.match(fallbackMarkup, /North America release region/);

const componentPath = path.resolve(
    process.cwd(),
    'views/lifestyle/business/components/InteractiveRegionMap.tsx',
);
const boundarySource = fs.readFileSync(componentPath, 'utf8');
assert.doesNotMatch(
    boundarySource,
    /export\s*\{[\s\S]*?\}\s*from '\.\/InteractiveRegionMapV2'/,
    'The public boundary must not statically re-export runtime values from the detailed renderer.',
);
const run = async () => {
const result = await build({
    entryPoints: [componentPath],
    bundle: true,
    format: 'esm',
    splitting: true,
    platform: 'browser',
    outdir: '/tmp/actor-empire-map-v2-lazy-audit',
    metafile: true,
    write: false,
    loader: { '.css': 'css' },
});

const outputs = Object.entries(result.metafile.outputs);
const entry = outputs.find(([, output]) => output.entryPoint?.endsWith('InteractiveRegionMap.tsx'));
assert.ok(entry, 'Expected an InteractiveRegionMap entry output.');
assert.equal(
    Object.keys(entry[1].inputs).some(input => input.includes('countries-50m.json')),
    false,
    'The synchronous entry must not contain the detailed atlas.',
);
assert.equal(
    outputs.some(([outputPath, output]) => (
        outputPath !== entry[0]
        && Object.keys(output.inputs).some(input => input.includes('countries-50m.json'))
    )),
    true,
    'Expected the detailed atlas in a separate lazy chunk.',
);

console.log('Region map v2 lazy boundary audit passed.');
};

void run();
