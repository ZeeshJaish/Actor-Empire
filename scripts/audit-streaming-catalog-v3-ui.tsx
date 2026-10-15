import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StreamingCatalogSetup from '../components/StreamingCatalogSetup';
import { createDefaultStreamingCatalogDraft, getStreamingLicenseOpportunities,
    getStreamingLicenseQuote } from '../services/streamingCatalog';
import { contentMarketFixture } from './helpers/contentMarketFixture';

const player = contentMarketFixture();
player.ownedStreamingPlatform.marketQuotePolicy = { version: 3, effectiveCycle: 0 };
const draft = createDefaultStreamingCatalogDraft(player);
player.ownedStreamingPlatform.catalogSetupDraft = { ...draft, currentStep: 3 };
const title = getStreamingLicenseOpportunities(player).find(item => item.id === draft.opportunityProjectId)!;
const expected = getStreamingLicenseQuote(title, draft.territory, draft.durationWeeks,
    draft.exclusivity, 3, 'FIRST_WINDOW', player.age);
const money = (amount: number) => `$${(amount / 1_000_000).toFixed(amount >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
const html = renderToStaticMarkup(<StreamingCatalogSetup player={player}
    onUpdatePlayer={() => {}} onClose={() => {}} />);
assert.ok(html.includes(`Owner range ${money(expected.minimumGuarantee)}–${money(expected.maximumGuarantee)}`),
    'Opening wizard must display the same V3 owner range that its backend validates');

const legacy = contentMarketFixture();
delete legacy.ownedStreamingPlatform.marketQuotePolicy;
legacy.ownedStreamingPlatform.catalogSetupDraft = { ...createDefaultStreamingCatalogDraft(legacy), currentStep: 3 };
legacy.ownedStreamingPlatform.marketQuotePolicy = { version: 3, effectiveCycle: 0 };
const old = legacy.ownedStreamingPlatform.catalogSetupDraft;
const oldTitle = getStreamingLicenseOpportunities(legacy).find(item => item.id === old.opportunityProjectId)!;
const oldQuote = getStreamingLicenseQuote(oldTitle, old.territory, old.durationWeeks, old.exclusivity);
const oldHtml = renderToStaticMarkup(<StreamingCatalogSetup player={legacy}
    onUpdatePlayer={() => {}} onClose={() => {}} />);
assert.ok(oldHtml.includes(`Owner range ${money(oldQuote.minimumGuarantee)}–${money(oldQuote.maximumGuarantee)}`),
    'Opening an in-progress legacy deal must continue showing its original price range');

console.log('Streaming catalogue V3 UI quote consistency: PASS');
