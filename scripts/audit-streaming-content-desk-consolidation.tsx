import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StepCatalogue } from '../components/studio-finance/components/launch/StepCatalogue';
import { ContentDesk } from '../components/streaming-transplant/StreamingContentExperience';
import type { StreamingLocalizationDeskRegion, StreamingLocalizationDeskTrack, StreamingLocalizationDeskView } from '../services/streamingLocalizationDesk';

const catalogueMarkup = renderToStaticMarkup(<StepCatalogue {...({
    data: { catalogue: {
        titles: 50, hours: 100, hoursNeeded: 40, hoursEstimated: true,
        readyForLaunch: true, established: true, hasDraft: true,
        ownedLinked: 20, ownedAvailable: 24, externalLicences: 30, activeAgreements: 12,
        genreCoverage: [{ name: 'Drama', share: 40 }], gaps: [],
        anchors: [{ id: 'anchor', name: 'Anchor', format: 'Film', linked: true }],
        shelfStrategy: 'Curated Premiere',
    } },
    handlers: { onOpenContentDesk: () => undefined, onAssembleCatalogue: () => undefined },
} as any)} />);
assert.match(catalogueMarkup, /Open Content Desk/);
assert.doesNotMatch(catalogueMarkup, /Review opening catalogue|Build opening catalogue|Continue opening catalogue/,
    'Define Launch must have one catalogue destination, not a second review workflow.');

/* Entries #23/#24 (live): localization by region in this tab. India set up at
   Subtitles 2 / Dubbing 1 with its week's figures and Dubbing 2 part-filled;
   East Asia not set up. */
const tiers = (track: 'SUBTITLES' | 'DUBBING', level: 0 | 1 | 2 | 3, progress: number): StreamingLocalizationDeskTrack => ({
    track,
    level,
    tiers: ([1, 2, 3] as const).map(tier => ({
        level: tier,
        name: tier === 1 ? 'Library' : tier === 2 ? 'New releases' : 'Day-one premieres',
        detail: tier === 1 ? 'titles on your service 9 weeks or more' : tier === 2 ? 'titles from their second week' : 'premieres from their first day',
        energy: track === 'SUBTITLES' ? tier * 10 : 10 + tier * 10,
        state: tier <= level ? 'DONE' as const : tier === level + 1 ? 'NEXT' as const : 'LATER' as const,
        progress: tier === level + 1 ? progress : 0,
        reach: { count: 3, examples: ['Night Shift'], note: tier === 3 ? 'next premiere: Night Shift, W14' : '3 titles' },
    })) as StreamingLocalizationDeskTrack['tiers'],
});
const region = (packageId: string, name: string, accent: string, languages: string[], open: boolean): StreamingLocalizationDeskRegion => ({
    packageId, name, accent, flags: packageId === 'INDIA_CORE' ? ['IN', 'BD'] : ['JP', 'KR'], languages, open,
    openCost: packageId === 'INDIA_CORE' ? 9_000_000 : 8_000_000, weeklyCost: 120_000, canAffordOpen: true,
    homeCountryIds: packageId === 'INDIA_CORE' ? ['IN', 'BD'] : ['JP', 'KR'],
    markets: open ? { count: 2, names: ['India', 'Bangladesh'], countryIds: ['IN', 'BD'] } : { count: 0, names: [], countryIds: [] },
    subscribers: open ? 1_200_000 : 0,
    helps: open ? { count: 1, names: ['Bangladesh'], subscribers: 200_000 } : { count: 0, names: [], subscribers: 0 },
    tracks: { SUBTITLES: tiers('SUBTITLES', open ? 2 : 0, 0), DUBBING: tiers('DUBBING', open ? 1 : 0, open ? 10 : 0) },
    week: open ? { localized: 480_000, added: 96_000 } : null,
    untapped: open ? 40_000 : 310_000,
    topTitles: open ? [{ id: 't1', title: 'Night Shift', viewers: 120_000 }] : [],
    trend: open ? [60_000, 80_000, 96_000] : [],
    since: open ? { label: 'Dubbing 1', weeks: 2, added: 38_000, localized: 50_000, pending: false } : null,
});
const localizationDesk: StreamingLocalizationDeskView = {
    live: true,
    energy: { available: 45, weekly: 45, bank: 0, step: 5 },
    treasury: 50_000_000,
    week: { absoluteWeek: 740, label: 'Year 15 · W13', localized: 480_000, added: 96_000, untapped: 350_000, playerViewers: 4_000_000 },
    trend: [
        { absoluteWeek: 738, label: 'Year 15 · W11', localized: 400_000, added: 60_000, markers: [] },
        { absoluteWeek: 739, label: 'Year 15 · W12', localized: 450_000, added: 80_000, markers: [{ name: 'India', accent: '#d95926', level: 'Dubbing 1' }] },
        { absoluteWeek: 740, label: 'Year 15 · W13', localized: 480_000, added: 96_000, markers: [] },
    ],
    regions: [
        region('INDIA_CORE', 'India', '#d95926', ['Hindi', 'Tamil', 'Telugu', 'Bengali'], true),
        region('EAST_ASIA_CORE', 'East Asia', '#d55181', ['Japanese', 'Korean'], false),
    ],
    insights: {
        topTitles: [{ id: 't1', title: 'Night Shift', viewers: 120_000, regions: [{ packageId: 'INDIA_CORE', name: 'India', accent: '#d95926', viewers: 120_000 }] }],
        audienceByLanguage: [{ language: 'English', viewers: 2_000_000, share: .5 }, { language: 'Hindi', viewers: 1_000_000, share: .25 }],
    },
};
const deskMarkup = renderToStaticMarkup(<ContentDesk
    brand={{ name: 'Signal+', markId: 'BOLT', customMark: null, hue: 250, sat: 80,
        identId: 'PULSE', customIdent: null, promiseId: 'BALANCED', publicManifesto: 'Stories travel.',
        layoutId: 'cinema', typeId: 'GROTESK', accentHue: 35, identMode: 'badge', identLen: 2,
        ratingId: 'MATURE', lockupId: 'SIDE', serverCity: null }}
    state={{ live: true, titles: [], slate: [] }}
    initialTab="LOCALIZATION"
    onBack={() => undefined}
    localizationDesk={localizationDesk}
    localizationActions={{}}
/>);
assert.match(deskMarkup, /Added by your languages/, 'The week\'s added viewers lead the tab, written on the map');
assert.match(deskMarkup, /<b>12(<!-- -->)?%<\/b>/, 'The share watched with subtitles or dubbing sits on the map');
assert.match(deskMarkup, /watched with subtitles or dubbing/, 'Viewing a level reaches is named for what it is');
assert.match(deskMarkup, /\+96K/);
assert.match(deskMarkup, /Language regions on the world map/, 'The language map leads the tab');
assert.match(deskMarkup, /Hindi · Tamil · Telugu · Bengali/);
assert.match(deskMarkup, /LEVEL (<!-- -->)?2/, 'Subtitles stand at level 2');
assert.match(deskMarkup, /Day-one premieres/);
assert.match(deskMarkup, /next premiere: Night Shift/, 'A level says which titles it brings');
assert.match(deskMarkup, /Set up · (<!-- -->)?\$8M/, 'A region not set up shows its price on its card');
assert.match(deskMarkup, /Travelling best/);
assert.match(deskMarkup, /Your audience by language/);
assert.match(deskMarkup, /role="tablist" aria-label="Language regions"/, 'The six regions are cards in one grid');
assert.match(deskMarkup, /They read along in their language/, 'Subtitles say what they are');
assert.match(deskMarkup, /They hear it in their language/, 'Dubbing says what it is');
assert.match(deskMarkup, /तुम कहाँ थे\?/, 'The subtitles strip shows a caption in the region\'s language');
assert.match(deskMarkup, /नमस्ते!/, 'The dubbing strip speaks the region\'s language');
assert.match(deskMarkup, /Paying off/, 'The report ranks what each region added');
assert.match(deskMarkup, /3 titles/, 'A step says how many titles it reaches');
assert.doesNotMatch(deskMarkup, /OPEN RESEARCH CAMPUS|In the lab/, 'No campus link and no lab');
assert.doesNotMatch(deskMarkup, /title by title|Order subtitles|Order dub/,
    'The Content Desk must explain global capability instead of per-title chores.');

console.log('Content Desk consolidation presents one launch route and region localization: the map, the regions, the ladders, the report.');
