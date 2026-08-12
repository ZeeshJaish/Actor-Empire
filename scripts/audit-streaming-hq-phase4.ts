import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    normalizeOwnedStreamingPlatformState,
} from '../services/ownedStreamingPlatform';
import {
    STREAMING_HQ_SECTIONS,
    STREAMING_HQ_TOUR_STEPS,
    advanceStreamingHqTour,
    beginStreamingHqTour,
    getStreamingHqSnapshot,
    replayStreamingHqTour,
    skipStreamingHqTour,
    visitStreamingHqSection,
} from '../services/streamingHq';
import {
    createDefaultStreamingFoundingDraft,
    incorporateOwnedStreamingPlatform,
    saveStreamingFoundingDraft,
} from '../services/streamingFounding';
import {
    hireStreamingExecutive,
    resolveStreamingCompanyCapabilities,
} from '../services/streamingCompany';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const createIncorporatedPlayer = (): Player => {
    const eligible: Player = {
        ...clone(INITIAL_PLAYER),
        id: 'phase4-hq-founder',
        name: 'HQ Founder',
        money: 600_000_000,
        ownedStreamingPlatform: {
            ...clone(INITIAL_PLAYER.ownedStreamingPlatform),
            lifecycle: 'ELIGIBLE',
            simulationSeed: 'owned-streaming:phase4-hq-founder',
            milestoneKeys: ['streaming-launch-clearance'],
        },
    };
    const drafted = saveStreamingFoundingDraft(eligible, {
        ...createDefaultStreamingFoundingDraft(100),
        currentStep: 2,
        name: 'Northstar+',
        dayOneMarketIds: ['US', 'CA'],
    });
    const result = incorporateOwnedStreamingPlatform(drafted);
    assert(result.changed, 'The Phase 4 audit fixture should incorporate successfully.');
    return result.player;
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 22, 'The current schema should retain the Phase 4 lightweight onboarding record.');
assert(STREAMING_HQ_SECTIONS.map(section => section.id).join(',') === 'HOME,CONTENT,TECH,MARKET,COMPANY', 'HQ should expose the five locked sections in order.');
assert(STREAMING_HQ_TOUR_STEPS.length === 5, 'The guided HQ orientation should have one contextual step per section.');

const incorporated = createIncorporatedPlayer();
const initialPlatform = incorporated.ownedStreamingPlatform;
const snapshot = getStreamingHqSnapshot(incorporated);
assert(snapshot.platformName === 'Northstar+', 'HQ identity should derive from the incorporated platform record.');
assert(snapshot.statusLabel === 'PRE-LAUNCH', 'A founding company should be labeled pre-launch, not live.');
assert(snapshot.treasuryCash === initialPlatform.treasuryCash, 'HQ treasury must derive from canonical company cash.');
assert(snapshot.incorporationCost === 85_000_000, 'HQ should disclose the fixed $85M incorporation charge.');
assert(snapshot.setupCostsConsumed === 70_000_000, 'HQ should disclose the fixed $70M consumed setup cost.');
assert(snapshot.openingTreasuryCash === 15_000_000, 'HQ should disclose the fixed $15M opening treasury.');
assert(snapshot.founderOwnershipPercent === initialPlatform.founderOwnershipPercent, 'HQ ownership must derive from the founding transaction.');
assert(snapshot.debtPrincipal === 0 && snapshot.capitalModelLabel === 'Founder-owned incorporation', 'HQ should show the debt-free fixed founding model.');
assert(snapshot.reachLevel === 0 && snapshot.reachLabel.includes('Level 0'), 'A new company should enter HQ at earned Reach Level 0.');
assert(snapshot.currentCeoLabel === 'HQ Founder', 'The founder should remain the live CEO until leadership changes dynamically.');
assert(snapshot.executiveCount === 0 && snapshot.leadershipWeeklyCost === 0, 'Incorporation should not pre-hire an executive team.');
assert(snapshot.capitalActionCount === 1, 'The fixed incorporation should be the company’s first capital action.');
assert(snapshot.subscriberLabel === 'First report after launch', 'Pre-launch subscribers should be unknown instead of displayed as zero.');
assert(snapshot.marketShareLabel === 'Available after launch', 'Pre-launch market share should not be invented.');
assert(snapshot.technologyReadiness === 0 && snapshot.infrastructureLabel === 'Level 0 foundation', 'Unbuilt technology should begin at the explicit Level 0 foundation.');
assert(snapshot.completedChecklistItems === 1, 'Only incorporation should be complete before operational phases.');
assert(snapshot.checklist.find(item => item.id === 'INFRASTRUCTURE')?.phase === 5, 'Infrastructure should remain assigned to Phase 5.');
assert(snapshot.checklist.find(item => item.id === 'CATALOG')?.phase === 6, 'Catalog should remain assigned to Phase 6.');
assert(snapshot.checklist.find(item => item.id === 'ORIGINAL')?.phase === 7, 'Originals should remain assigned to Phase 7.');

const founderCapabilities = resolveStreamingCompanyCapabilities(incorporated);
assert(
    founderCapabilities.capabilities.HIRE_EXECUTIVE
        && founderCapabilities.capabilities.CONFIGURE_BASIC_INFRASTRUCTURE
        && !founderCapabilities.capabilities.ADVANCED_OPERATIONS,
    'The founder should retain all base launch authority while specialist capabilities depend on live leadership.',
);
const hiredCoo = hireStreamingExecutive(incorporated, 'ava-chen', 'phase4-coo-hire');
assert(hiredCoo.changed && hiredCoo.reason === 'HIRED', 'Leadership should be hired dynamically after incorporation.');
const staffedSnapshot = getStreamingHqSnapshot(hiredCoo.player);
assert(
    staffedSnapshot.executiveCount === 1
        && staffedSnapshot.leadershipWeeklyCost > 0
        && staffedSnapshot.currentCeoLabel === 'HQ Founder',
    'HQ should derive its roster and weekly leadership cost without replacing the founder CEO.',
);
assert(
    resolveStreamingCompanyCapabilities(hiredCoo.player).capabilities.ADVANCED_OPERATIONS,
    'Hiring the COO should dynamically unlock advanced operations.',
);

const begun = beginStreamingHqTour(incorporated);
assert(begun.ownedStreamingPlatform.hqOnboarding.status === 'IN_PROGRESS', 'Starting orientation should persist an in-progress status.');
assert(begun.ownedStreamingPlatform.hqOnboarding.currentStep === 0, 'Orientation should begin in Home.');
assert(begun.ownedStreamingPlatform.hqOnboarding.visitedSections.includes('HOME'), 'Starting orientation should record Home as visited.');

const visitedTech = visitStreamingHqSection(begun, 'TECH');
assert(visitedTech.ownedStreamingPlatform.hqOnboarding.currentStep === 2, 'Direct navigation during orientation should move coaching to that live section.');
assert(visitedTech.ownedStreamingPlatform.hqOnboarding.visitedSections.includes('TECH'), 'Visited sections should resume across sessions.');

let completed = replayStreamingHqTour(visitedTech);
for (let index = 0; index < STREAMING_HQ_TOUR_STEPS.length; index += 1) {
    completed = advanceStreamingHqTour(completed);
}
assert(completed.ownedStreamingPlatform.hqOnboarding.status === 'COMPLETED', 'The final coaching step should complete orientation.');
assert(completed.ownedStreamingPlatform.hqOnboarding.visitedSections.length === 5, 'Completed orientation should record all five sections.');
assert(completed.ownedStreamingPlatform.lifecycle === 'FOUNDING', 'Orientation must not silently launch the company.');
assert(completed.ownedStreamingPlatform.treasuryCash === initialPlatform.treasuryCash, 'Orientation must not change company money.');

const skipped = skipStreamingHqTour(begun);
assert(skipped.ownedStreamingPlatform.hqOnboarding.status === 'SKIPPED', 'Players should be free to skip orientation.');
const replayed = replayStreamingHqTour(skipped);
assert(replayed.ownedStreamingPlatform.hqOnboarding.status === 'IN_PROGRESS', 'Skipped orientation should remain replayable.');
assert(replayed.ownedStreamingPlatform.hqOnboarding.currentStep === 0, 'Replay should restart cleanly from Home.');

const lockedAttempt = beginStreamingHqTour(clone(INITIAL_PLAYER));
assert(lockedAttempt.ownedStreamingPlatform.hqOnboarding.status === 'NOT_STARTED', 'A locked career cannot start HQ onboarding.');

const migratedPhase3 = normalizeOwnedStreamingPlatformState({
    ...clone(initialPlatform),
    schemaVersion: 2,
    hqOnboarding: undefined,
});
assert(migratedPhase3.schemaVersion === OWNED_STREAMING_PLATFORM_SCHEMA_VERSION, 'Phase 3 saves should normalize into the current streaming schema.');
assert(migratedPhase3.hqOnboarding.status === 'NOT_STARTED', 'Older saves should receive a safe unstarted orientation.');

const componentSource = readFileSync('components/StreamingPlatformHQ.tsx', 'utf8');
const serviceSource = readFileSync('services/streamingHq.ts', 'utf8');
const styleSource = readFileSync('styles/streaming-hq.css', 'utf8');
const commandDeckSource = readFileSync('components/streaming-transplant/StreamingPlatformCommandDeck.tsx', 'utf8');
const contentDeskSource = readFileSync('components/streaming-transplant/StreamingContentExperience.tsx', 'utf8');
const networkDeskSource = readFileSync('components/streaming-transplant/StreamingNetworkExperience.tsx', 'utf8');
const audienceDeskSource = readFileSync('components/streaming-transplant/StreamingAudienceExperience.tsx', 'utf8');
const boardroomSource = readFileSync('components/streaming-transplant/StreamingBoardroomExperience.tsx', 'utf8');
const entrySource = readFileSync('components/StreamingLockedScreen.tsx', 'utf8');
const hqSource = `${componentSource}\n${serviceSource}`;

[
    'LEVEL 0 • FOUNDER HQ',
    'The company exists. The signal does not.',
    'Content Room',
    'Technology Campus',
    'Market Room',
    'Company Office',
    'First report after launch',
    'No fake victory graph.',
    'Content Room',
    'Replay HQ orientation',
    'Replay founding reveal',
    'Explore on my own',
    'role="dialog"',
].forEach(fragment => assert(hqSource.includes(fragment), `Phase 4 UI should include ${fragment}.`));
assert(entrySource.includes('<StreamingPlatformHQ'), 'Incorporated founding careers should enter Platform HQ.');
assert(componentSource.includes('className="streaming-zip-viewport"'), 'The ZIP experience must own the full HQ viewport.');
assert(!componentSource.includes('className="hq-topbar"'), 'The retired game header must not overlay the ZIP command deck.');
assert(!componentSource.includes('className="hq-bottom-nav"'), 'The retired bottom navigation must not duplicate ZIP navigation.');
assert(commandDeckSource.includes('PLATFORM CONTROL CONSOLE'), 'The transplanted command deck should remain the canonical Home presentation.');
assert(contentDeskSource.includes('CONTENT DESK'), 'The transplanted Content Desk should remain mounted as a real division.');
assert(networkDeskSource.includes('NETWORK'), 'The transplanted Network room should remain mounted as a real division.');
assert(audienceDeskSource.includes('AUDIENCE'), 'The transplanted Audience room should remain mounted as a real division.');
assert(boardroomSource.includes('BOARDROOM'), 'The transplanted Boardroom should remain mounted as a real division.');
assert(!componentSource.includes('streaming-zip-extensions'), 'Approximation CSS must not override ZIP-authored rooms.');
assert(styleSource.includes('env(safe-area-inset-bottom)'), 'HQ navigation and overlays should respect mobile safe areas.');
assert(styleSource.includes('@media (prefers-reduced-motion: reduce)'), 'HQ should respect reduced-motion preferences.');
assert(!componentSource.includes('0 subscribers'), 'The HQ must not turn unavailable subscriber analytics into a fake zero.');
assert(!componentSource.includes('Buy server'), 'Phase 4 must not introduce a non-functional Phase 5 purchase action.');

console.log('EMPIRE+ Phase 4 Platform HQ audit passed.');
