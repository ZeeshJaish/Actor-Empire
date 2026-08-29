import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { STREAMING_ECOSYSTEM_OPERATOR_SEEDS } from '../services/streamingPlatformEcosystemSeeds';
import {
    STREAMING_ECOSYSTEM_SCHEMA_VERSION,
    normalizeStreamingPlatformEcosystem,
} from '../services/streamingPlatformEcosystem';
import { createDynamicStreamingOperator } from '../services/streamingPlatformEcosystemTurn';
import { generateStreamingOperatorBrand } from '../services/streamingPlatformBrandGenerator';
import {
    getRealStreamingPlatformBrand,
    getStreamingPlatformBrandCssVars,
    resolveStreamingPlatformBrandByName,
    resolveStreamingPlatformBrandById,
    resolveStreamingOperatorBrand,
} from '../services/streamingPlatformBrandRegistry';
import StreamingPlatformBrand from '../components/StreamingPlatformBrand';

const luminance = (hex: string): number => {
    const channels = [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrast = (left: string, right: string): number => {
    const light = Math.max(luminance(left), luminance(right));
    const dark = Math.min(luminance(left), luminance(right));
    return (light + 0.05) / (dark + 0.05);
};

for (const seed of STREAMING_ECOSYSTEM_OPERATOR_SEEDS) {
    const brand = getRealStreamingPlatformBrand(seed.id);
    assert.ok(brand, `${seed.id} must have a canonical real-platform identity.`);
    assert.equal(brand.platformId, seed.id);
    assert.equal(brand.displayName, seed.name);
    assert.match(brand.primaryColor, /^#[0-9A-F]{6}$/);
    assert.match(brand.secondaryColor, /^#[0-9A-F]{6}$/);
    assert.match(brand.surfaceColor, /^#[0-9A-F]{6}$/);
    assert.match(brand.onPrimaryColor, /^#[0-9A-F]{6}$/);
    assert.match(brand.onSurfaceColor, /^#[0-9A-F]{6}$/);
    assert.ok(brand.accentColors.length >= 1 && brand.accentColors.length <= 4);
    assert.ok(brand.accentColors.every(color => /^#[0-9A-F]{6}$/.test(color)));
    assert.ok(brand.markKey.length > 0);
    assert.ok(
        contrast(brand.primaryColor, brand.onPrimaryColor) >= 4.5,
        `${seed.id} primary text contrast must reach WCAG AA.`,
    );
    assert.ok(
        contrast(brand.surfaceColor, brand.onSurfaceColor) >= 4.5,
        `${seed.id} surface text contrast must reach WCAG AA.`,
    );
    const variables = getStreamingPlatformBrandCssVars(brand);
    assert.equal(variables['--platform-brand-primary'], brand.primaryColor);
    assert.equal(variables['--platform-brand-secondary'], brand.secondaryColor);
    assert.equal(variables['--platform-brand-on-primary'], brand.onPrimaryColor);
}

const netflix = getRealStreamingPlatformBrand('NETFLIX')!;
const prime = getRealStreamingPlatformBrand('PRIME_VIDEO')!;
const hulu = getRealStreamingPlatformBrand('HULU')!;
const youtube = getRealStreamingPlatformBrand('YOUTUBE')!;
assert.equal(netflix.primaryColor, '#E50914');
assert.equal(prime.primaryColor, '#00A8E1');
assert.equal(hulu.primaryColor, '#1CE783');
assert.equal(youtube.primaryColor, '#FF0000');
assert.notEqual(netflix.markKey, prime.markKey);
assert.notEqual(hulu.markKey, youtube.markKey);
assert.equal(resolveStreamingPlatformBrandByName('Amazon')?.platformId, 'PRIME_VIDEO');
assert.equal(resolveStreamingPlatformBrandByName('HBO')?.platformId, 'HBO_MAX');
assert.equal(resolveStreamingPlatformBrandByName('Netflix Studios'), null, 'Name aliases must be exact, never substring matches.');

assert.ok(
    getRealStreamingPlatformBrand('JIOHOTSTAR')!.accentColors.length >= 2,
    'JioHotstar must preserve its multi-colour identity.',
);
assert.ok(
    getRealStreamingPlatformBrand('ZEE5')!.accentColors.length >= 3,
    'ZEE5 must preserve its multi-colour identity.',
);

assert.equal(getRealStreamingPlatformBrand('UNKNOWN_PLATFORM'), null);
const fallbackA = resolveStreamingPlatformBrandById('UNKNOWN_PLATFORM', 'Lantern Play');
const fallbackB = resolveStreamingPlatformBrandById('UNKNOWN_PLATFORM', 'Lantern Play');
assert.deepEqual(fallbackA, fallbackB, 'Unknown-ID presentation fallback must be stable.');
assert.equal(fallbackA.displayName, 'Lantern Play');
assert.equal(fallbackA.markKind, 'MONOGRAM');

const state = normalizeStreamingPlatformEcosystem(undefined, 1_400);
const creationInput = {
    playerId: 'brand-audit-player',
    state,
    absoluteWeek: 1_404,
    homeCountryId: 'IN',
    origin: 'CONGLOMERATE_BACKED' as const,
};
const generatedA = createDynamicStreamingOperator(creationInput);
const generatedB = createDynamicStreamingOperator(creationInput);
assert.deepEqual(
    {
        id: generatedA.id,
        name: generatedA.name,
        cashMillions: generatedA.cashMillions,
        valuationBillions: generatedA.valuationBillions,
        subscriberMillions: generatedA.subscriberMillions,
        technology: generatedA.technology,
        cataloguePower: generatedA.cataloguePower,
        localization: generatedA.localization,
        brandPower: generatedA.brandPower,
        prestige: generatedA.prestige,
        efficiency: generatedA.efficiency,
        risk: generatedA.risk,
        activeCountryIds: generatedA.activeCountryIds,
        preferredGenres: generatedA.preferredGenres,
        marketMomentum: generatedA.marketMomentum,
    },
    {
        id: 'STREAMING_OPERATOR_1BY782Y',
        name: 'Lotus Plus',
        cashMillions: 1591.38,
        valuationBillions: 12.43,
        subscriberMillions: 8.7,
        technology: 78.4,
        cataloguePower: 89.46,
        localization: 84.88,
        brandPower: 86.07,
        prestige: 72.74,
        efficiency: 71.87,
        risk: 57.37,
        activeCountryIds: ['IN', 'PH', 'TH'],
        preferredGenres: ['DRAMA'],
        marketMomentum: { IN: 7.96, PH: 3.62, TH: 3.16 },
    },
    'Brand creation must not consume or rebalance the existing operator RNG.',
);
assert.deepEqual(
    (generatedA as typeof generatedA & { brand?: unknown }).brand,
    (generatedB as typeof generatedB & { brand?: unknown }).brand,
    'The same generated operator input must replay the same brand.',
);
assert.equal(
    (generatedA as typeof generatedA & { brand?: { source?: string } }).brand?.source,
    'GENERATED',
    'A newly launched fictional operator must persist a generated identity.',
);

const firstIdentity = (generatedA.brand.source === 'GENERATED' ? generatedA.brand.identity : null)!;
const collisionRepaired = generateStreamingOperatorBrand({
    operatorId: generatedA.id,
    name: generatedA.name,
    homeCountryId: generatedA.homeCountryId,
    origin: generatedA.origin,
    operatorIndex: 4,
    occupiedBrands: [{
        primaryColor: firstIdentity.primaryColor,
        markKey: firstIdentity.markId,
        typefaceId: firstIdentity.typefaceId,
    }],
});
assert.notDeepEqual(
    {
        primaryColor: collisionRepaired.primaryColor,
        markId: collisionRepaired.markId,
        typefaceId: collisionRepaired.typefaceId,
    },
    {
        primaryColor: firstIdentity.primaryColor,
        markId: firstIdentity.markId,
        typefaceId: firstIdentity.typefaceId,
    },
    'A generated identity must reroll when its colour, mark, and type collide with an active platform.',
);

const schemaOne = structuredClone(state) as typeof state & { schemaVersion: number };
schemaOne.schemaVersion = 1;
schemaOne.operators[generatedA.id] = structuredClone(generatedA);
for (const operator of Object.values(schemaOne.operators)) {
    delete (operator as typeof operator & { brand?: unknown }).brand;
}
const migrated = normalizeStreamingPlatformEcosystem(schemaOne, 1_400);
assert.equal(STREAMING_ECOSYSTEM_SCHEMA_VERSION, 2);
assert.equal(
    (migrated.operators.NETFLIX as typeof migrated.operators.NETFLIX & { brand?: { source?: string; registryKey?: string } }).brand?.source,
    'REAL_REGISTRY',
);
assert.equal(
    (migrated.operators.NETFLIX as typeof migrated.operators.NETFLIX & { brand?: { source?: string; registryKey?: string } }).brand?.registryKey,
    'NETFLIX',
);
assert.equal(
    (migrated.operators[generatedA.id] as typeof generatedA & { brand?: { source?: string } }).brand?.source,
    'GENERATED',
);
assert.deepEqual(
    normalizeStreamingPlatformEcosystem(migrated, 1_400),
    migrated,
    'Schema-2 brand normalization must be idempotent.',
);

const netflixMarkup = renderToStaticMarkup(
    <StreamingPlatformBrand brand={netflix} variant="LOCKUP" size="SM" />,
);
assert.match(netflixMarkup, /data-platform-brand="NETFLIX"/);
assert.match(netflixMarkup, /aria-label="Netflix"/);
assert.ok(netflixMarkup.includes('--platform-brand-primary:#E50914'));
assert.match(netflixMarkup, /data-platform-mark="NETFLIX_N"/);

const jioMarkup = renderToStaticMarkup(
    <StreamingPlatformBrand brand={getRealStreamingPlatformBrand('JIOHOTSTAR')!} variant="WORDMARK" size="XS" />,
);
assert.match(jioMarkup, /data-brand-accents="3"/);
assert.match(jioMarkup, />JioHotstar</);

const generatedBrand = resolveStreamingOperatorBrand(generatedA.id, generatedA.name, generatedA.brand);
const generatedMarkup = renderToStaticMarkup(
    <StreamingPlatformBrand brand={generatedBrand} variant="MARK" size="MD" />,
);
assert.match(generatedMarkup, /<svg/);
assert.match(generatedMarkup, new RegExp(`data-platform-mark="${generatedBrand.markKey}"`));

const decorativeMarkup = renderToStaticMarkup(
    <StreamingPlatformBrand brand={prime} variant="LOCKUP" size="SM" decorative />,
);
assert.match(decorativeMarkup, /aria-hidden="true"/);
assert.doesNotMatch(decorativeMarkup, /aria-label=/);

const missingAssetMarkup = renderToStaticMarkup(
    <StreamingPlatformBrand
        brand={{ ...prime, markKind: 'LOCAL_ASSET', markKey: 'MISSING_ASSET' }}
        variant="LOCKUP"
        size="SM"
    />,
);
assert.match(missingAssetMarkup, /data-brand-fallback="wordmark"/);
assert.match(missingAssetMarkup, />Prime Video</);

const readWorkspaceSource = (relativePath: string): string => fs.readFileSync(
    path.join(process.cwd(), relativePath),
    'utf8',
);
for (const relativePath of [
    'services/streamingAudienceMarket.ts',
    'views/lifestyle/business/ReleaseWizard.tsx',
    'views/lifestyle/business/components/ProjectDashboardModal.tsx',
    'views/lifestyle/business/components/StreamingBiddingRoom.tsx',
    'components/studio-finance/finance/rivals.ts',
]) {
    assert.ok(
        readWorkspaceSource(relativePath).includes('streamingPlatformBrandRegistry'),
        `${relativePath} must consume the canonical platform brand registry.`,
    );
}
for (const relativePath of [
    'services/streamingAudienceMarket.ts',
    'views/lifestyle/business/ReleaseWizard.tsx',
    'views/lifestyle/business/components/ProjectDashboardModal.tsx',
    'components/studio-finance/finance/rivals.ts',
]) {
    const source = readWorkspaceSource(relativePath);
    assert.doesNotMatch(
        source,
        /#(?:E50914|1CE783|00A8E1|113CCF|FF0000)\b/i,
        `${relativePath} must not redeclare a core platform colour literal.`,
    );
}
const financeRivalsSource = readWorkspaceSource('components/studio-finance/finance/rivals.ts');
assert.doesNotMatch(financeRivalsSource, /includes\s*\(/, 'Finance rival identity must never use trademark substring matching.');

console.log('Streaming platform branding audit passed.');
