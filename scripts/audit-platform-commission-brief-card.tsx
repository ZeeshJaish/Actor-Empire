import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PlatformCommissionBriefCard from '../components/PlatformCommissionBriefCard';

const offer = {
    title: 'After the Monsoon',
    platformId: 'NETFLIX' as const,
    platformName: 'Netflix',
    genre: 'DRAMA' as const,
    projectType: 'MOVIE' as const,
    productionBudget: 95_000_000,
    producerFee: 8_300_000,
    minimumImdbRating: 7.2,
    deliveryAllowanceWeeks: 40,
};

const formatMoney = (amount: number) => `$${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
const renderCard = (
    expired = false,
    platformId = offer.platformId as string,
    platformName = offer.platformName,
) => renderToStaticMarkup(
    <PlatformCommissionBriefCard
        offer={{ ...offer, platformId: platformId as typeof offer.platformId, platformName }}
        expired={expired}
        processing={false}
        onAccept={() => undefined}
        onPass={() => undefined}
        formatMoney={formatMoney}
    />,
);

const active = renderCard();
assert.match(active, /aria-label="Commission order from Netflix for After the Monsoon"/);
assert.match(active, /data-platform-brand="NETFLIX"/);
assert.equal((active.match(/<dl/g) || []).length, 1, 'The terms must read as one production ledger rather than separate metric cards.');
for (const expected of [
    'Commission order', 'Drama movie', 'Commissioned production',
    'Producer fee', '$8.3M', 'Production cap', '$95M',
    'Minimum rating', '7.2 IMDb', 'Delivery', '40+ weeks',
    '25% at greenlight', '75% on delivery',
    'The production cap funds the film. It is not studio income.',
]) {
    assert.ok(active.includes(expected), `The commission order must render ${expected}.`);
}
assert.match(active, />Accept commission<\/button>/);
assert.match(active, />Pass<\/button>/);

for (const [platformId, platformName, accent] of [
    ['PRIME_VIDEO', 'Prime Video', '#00A8E1'],
    ['HULU', 'Hulu', '#1CE783'],
    ['DISNEY_PLUS', 'Disney+', '#113CCF'],
    ['JIOHOTSTAR', 'JioHotstar', '#FF6B00'],
    ['YOUTUBE', 'YouTube', '#FF0000'],
]) {
    const markup = renderCard(false, platformId, platformName);
    assert.ok(
        markup.includes(`--commission-accent:${accent}`),
        `${platformName} commissions must use their own platform accent.`,
    );
    assert.ok(
        markup.includes(`data-platform-brand="${platformId}"`),
        `${platformName} commissions must render the shared platform identity.`,
    );
}

const componentSource = fs.readFileSync(
    path.join(process.cwd(), 'components/PlatformCommissionBriefCard.tsx'),
    'utf8',
);
assert.ok(componentSource.includes("'platformId'"), 'The brief contract must require the stable platform ID.');
assert.ok(componentSource.includes('StreamingPlatformBrand'), 'The brief must use the shared platform brand renderer.');
assert.ok(componentSource.includes('resolveStreamingPlatformBrandById'), 'The brief must resolve identity from the stable ID.');
assert.ok(!componentSource.includes('getPlatformAccent'), 'The name-matching accent helper must be removed.');

const messagesAppSource = fs.readFileSync(
    path.join(process.cwd(), 'views/mobile/MessagesApp.tsx'),
    'utf8',
);
assert.ok(messagesAppSource.includes('StreamingPlatformBrand'), 'Commission inbox rows must use the shared platform brand renderer.');
assert.ok(messagesAppSource.includes('resolveStreamingPlatformBrandById'), 'Commission inbox rows must resolve identity from the stable platform ID.');
assert.ok(
    messagesAppSource.includes("selectedMessage.type !== 'OFFER_PLATFORM_COMMISSION'"),
    'Commission detail must skip the duplicate generic sender and body cards so the full order opens in one view.',
);

const expired = renderCard(true);
assert.match(expired, /<button[^>]*disabled=""[^>]*>Expired<\/button>/);

console.log('Platform commission brief card audit passed.');
