import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { streamingCatalogueScaleFixture } from './helpers/streamingCatalogueScaleFixture';
import StreamingPlatformHQ from '../components/StreamingPlatformHQ';

// Regression: a live room must not read the 52-title catalogue in hidden HQ views.
const { player, session } = streamingCatalogueScaleFixture(52);
let countryReads = 0;
const marketOperations = player.ownedStreamingPlatform.marketOperations.map(row => {
    const observed = { ...row };
    Object.defineProperty(observed, 'countryProfile', { enumerable: true, get: () => { countryReads++; return row.countryProfile; } });
    return observed;
});
const observed = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, marketOperations } };
const noUpdate = () => {};
const markup = renderToStaticMarkup(<StreamingPlatformHQ player={observed} onUpdatePlayer={noUpdate}
    onTrustedMarketUpdate={noUpdate} onBack={noUpdate} initialContentMarketOfferId={session.id} />);
assert.ok(markup.includes('Live rights auction'), 'The actual live room should render.');
assert.ok(!markup.includes('FOUR OPERATIONS'), 'A full-screen room must not render the hidden dashboard.');
assert.ok(countryReads < 197 * 20, `A room render normalized country profiles ${countryReads} times.`);
console.log(JSON.stringify({ passed: 3, countries: 197, titles: 52, countryReads }));
