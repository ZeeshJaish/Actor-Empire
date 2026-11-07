/**
 * #248 (plan #235): a plain career's week lost 150 ms to projecting one pricing object again for every offer of every cohort. The projection now holds for as
 * long as the object does. A pricing configuration is replaced, never edited in place: this audit holds that, because the cache depends on it.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createStreamingPricingForCoreModel, projectStreamingCommercialOffers } from '../services/streamingCommercialOffers';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { INITIAL_PLAYER } from '../types';

const pass = (label: string) => console.log(`PASS ${label}`);
const pricing = normalizeStreamingPricingConfiguration(structuredClone(INITIAL_PLAYER.ownedStreamingPlatform.serviceConfiguration.pricing));

const first = projectStreamingCommercialOffers(pricing);
assert.equal(projectStreamingCommercialOffers(pricing), first, 'the same object: the same projection');
pass('the same pricing object is projected once');

const changed = createStreamingPricingForCoreModel(pricing, 'ADVERTISING', { alone: true });
assert.notEqual(changed, pricing, 'a change is a new object');
const second = projectStreamingCommercialOffers(changed);
assert.notEqual(second, first, 'and a new projection');
assert.equal(second.coreModel, 'ADVERTISING');
assert.equal(first.coreModel === 'ADVERTISING', false, 'the old one still says what it said');
pass('a changed configuration is a new object, with its own projection');

const started = performance.now();
for (let index = 0; index < 200_000; index += 1) projectStreamingCommercialOffers(pricing);
const spent = performance.now() - started;
assert.ok(spent < 200, `200,000 asks took ${Math.round(spent)} ms`);
pass(`200,000 asks in ${Math.round(spent)} ms`);

/* nobody edits a pricing object, or a projection, in place */
const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(name) ? [path] : [];
});
const edits = ['services', 'components', 'views'].flatMap(walk).flatMap(path => {
    const text = readFileSync(path, 'utf8');
    return [
        /\b(?:pricing|commercialConfiguration)\.(?:plans|streams|ads|rentals|commercialOffers)\s*=[^=]/,
        /\b(?:pricing|commercialConfiguration)\.(?:plans|streams)\.(?:push|splice|sort|unshift|reverse|pop|shift)\(/,
        /\bprojected\.(?:subscriptions|storeOffer|freeAdOffer|adFreePasses)\s*=[^=]/,
        /\bprojected\.subscriptions\.(?:push|splice|sort|unshift|reverse|pop|shift)\(/,
    ].filter(pattern => pattern.test(text)).map(() => path);
});
assert.deepEqual(edits, [], 'no edit in place');
pass('no code edits a pricing object or a projection in place');
console.log('offer-projection audit passed');
