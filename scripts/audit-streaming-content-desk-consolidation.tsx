import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StepCatalogue } from '../components/studio-finance/components/launch/StepCatalogue';
import { ContentDesk } from '../components/streaming-transplant/StreamingContentExperience';

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

const deskMarkup = renderToStaticMarkup(<ContentDesk
    brand={{ name: 'Signal+', markId: 'BOLT', customMark: null, hue: 250, sat: 80,
        identId: 'PULSE', customIdent: null, promiseId: 'BALANCED', publicManifesto: 'Stories travel.',
        layoutId: 'cinema', typeId: 'GROTESK', accentHue: 35, identMode: 'badge', identLen: 2,
        ratingId: 'MATURE', lockupId: 'SIDE', serverCity: null }}
    state={{ live: false, titles: [], slate: [] }}
    initialTab="LOCALIZATION"
    onBack={() => undefined}
    localization={{
        subtitleLevel: 2,
        dubbingLevel: 1,
        simultaneousLocalization: false,
        coveredTitleCount: 50,
        activeLanguageCount: 4,
        packages: [{ id: 'INDIA_CORE', name: 'India Core Languages', languages: ['Hindi', 'Tamil', 'Telugu', 'Bengali'], active: true, locked: false, activationCost: 9_000_000 }],
    } as any}
    onOpenLocalization={() => undefined}
/>);
assert.match(deskMarkup, /Subtitle quality/);
assert.match(deskMarkup, /Level 2/);
assert.match(deskMarkup, /India Core Languages/);
assert.match(deskMarkup, />50<\/strong><h3>catalogue titles covered/);
assert.match(deskMarkup, /OPEN RESEARCH CAMPUS/);
assert.doesNotMatch(deskMarkup, /title by title|Order subtitles|Order dub/,
    'The Content Desk must explain global capability instead of per-title chores.');

console.log('Content Desk consolidation presents one launch route and global localization controls.');
