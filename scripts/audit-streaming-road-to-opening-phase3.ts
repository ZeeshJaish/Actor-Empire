import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    createDefaultStreamingFoundingDraft,
    incorporateOwnedStreamingPlatform,
    saveStreamingFoundingDraft,
} from '../services/streamingFounding';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    commitStreamingLaunchCost,
    getStreamingIdentPurchaseView,
    getStreamingLaunchProgramView,
    planStreamingLaunchCost,
    removeStreamingCustomIdentAudio,
    saveStreamingPricingPlan,
    saveStreamingServiceIdent,
    saveStreamingStorefrontPlan,
} from '../services/streamingLaunchProgram';
import { advanceStreamingMarketClearances, beginStreamingMarketClearance, saveStreamingMarketPlan } from '../services/streamingMarkets';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const clone = <T,>(value: T): T => structuredClone(value);

const createIncorporatedFounder = (): Player => {
    const base: Player = {
        ...clone(INITIAL_PLAYER),
        id: 'road-to-opening-phase3',
        name: 'Road Test Founder',
        money: 200_000_000,
        ownedStreamingPlatform: {
            ...clone(INITIAL_PLAYER.ownedStreamingPlatform),
            lifecycle: 'ELIGIBLE',
            simulationSeed: 'owned-streaming:road-to-opening-phase3',
            milestoneKeys: ['streaming-launch-clearance'],
        },
    };
    const draft = {
        ...createDefaultStreamingFoundingDraft(100),
        currentStep: 2,
        name: 'Signal House+',
    };
    const saved = saveStreamingFoundingDraft(base, draft);
    const result = incorporateOwnedStreamingPlatform(saved);
    assert(result.changed, 'The Phase 3 fixture must create a newly incorporated company.');
    return result.player;
};

const incorporated = createIncorporatedFounder();
const opening = getStreamingLaunchProgramView(incorporated);
assert(opening.status === 'PLANNING', 'An incorporated company must enter the canonical planning campaign.');
assert(opening.tracks.length === 2, 'The launch program must expose Define and Build as two connected tracks.');
assert(opening.tracks[0].milestones.length === 8, 'Define the Launch must retain funding as a campaign condition and contain the seven-screen wizard, including Pricing and the versioned blueprint.');
assert(opening.tracks[1].milestones.length === 6, 'Build the Platform must contain its six canonical milestones.');
assert(opening.finale.id === 'OPENING_NIGHT' && opening.totalCount === 15, 'Opening Night must remain the single finale after fourteen track milestones.');
assert(!opening.milestones.some(item => item.id === ('RIGHTS_LOCALIZATION' as any)), 'Rights and localization must not remain a hidden launch milestone.');
assert(opening.recommendedNextAction?.milestoneId === 'FUND_COMPANY', 'Funding must be the first recommended mission.');
assert(opening.budget.availableTreasury === 0 && opening.budget.shortfall === 0, 'Fresh incorporation must begin with an honest zero treasury and no invented plan.');
assert(opening.warnings.some(warning => warning.id === 'launch-warning:unfunded'), 'The campaign must explain that planning is open while commitments are locked.');
assert(!opening.milestones.find(item => item.id === 'PRICING')?.complete, 'A fresh company must not silently inherit a completed commercial offer.');

const lockedStorefront = saveStreamingStorefrontPlan(incorporated, { storefrontLayoutId: 'concierge' });
assert(!lockedStorefront.changed && lockedStorefront.reason === 'INVALID_STATE', 'Research-gated storefronts must not bypass Technology through a direct service call.');
const baselineStorefront = saveStreamingStorefrontPlan(incorporated, { storefrontLayoutId: 'cinema' });
assert(baselineStorefront.changed, 'A baseline editorial storefront must remain available to a zero-technology company.');
const lockedIdent = saveStreamingServiceIdent(incorporated, { soundIdentKey: 'CHOIR', identPackageId: 'ADAPTIVE' });
assert(!lockedIdent.changed && lockedIdent.reason === 'INVALID_STATE', 'Adaptive identities must remain research-gated even when called outside the UI.');
const lockedGenreIdent = saveStreamingServiceIdent(incorporated, { soundIdentKey: 'SPARK', identPackageId: 'GENRE' });
assert(!lockedGenreIdent.changed && lockedGenreIdent.reason === 'INVALID_STATE', 'Genre identities must remain Product Experience gated outside the UI.');
const freeIdent = saveStreamingServiceIdent(incorporated, { soundIdentKey: 'PULSE', identPackageId: 'STANDARD' });
assert(freeIdent.changed && freeIdent.player.ownedStreamingPlatform.treasuryCash === 0, 'Selecting an ident must remain free until the explicit commission action, and the included package must charge nothing.');
assert(getStreamingLaunchProgramView(freeIdent.player).milestones.find(item => item.id === 'SERVICE_IDENT')?.complete, 'An explicitly commissioned included ident must complete the canonical milestone.');
const repeatedFreeIdent = saveStreamingServiceIdent(freeIdent.player, { soundIdentKey: 'PULSE', identPackageId: 'STANDARD' });
assert(!repeatedFreeIdent.changed, 'Commissioning the exact same ident twice must be idempotent.');
const customAudio = {
    dataUrl: 'data:audio/wav;base64,UklGRg==', originalName: 'studio-tone.wav', durationSeconds: 2,
    sampleRate: 22_050, byteLength: 8, fingerprint: 'wav-audit-8',
};
const premiumIdentBase: Player = {
    ...incorporated,
    ownedStreamingPlatform: { ...incorporated.ownedStreamingPlatform, treasuryCash: 10_000_000 },
};
const premiumIdent = saveStreamingServiceIdent(premiumIdentBase, {
    soundIdentKey: 'PULSE', identPackageId: 'FULL', customIdentAudio: customAudio,
});
assert(premiumIdent.changed && premiumIdent.player.ownedStreamingPlatform.treasuryCash === 5_500_000, 'The paid ident package must debit its $4.5M exactly when commissioned.');
assert(premiumIdent.player.ownedStreamingPlatform.serviceConfiguration.customIdentAudio?.fingerprint === customAudio.fingerprint, 'Optimized custom audio must persist with the commissioned ident.');
const repeatedPremiumIdent = saveStreamingServiceIdent(premiumIdent.player, {
    soundIdentKey: 'PULSE', identPackageId: 'FULL', customIdentAudio: customAudio,
});
assert(!repeatedPremiumIdent.changed && repeatedPremiumIdent.player.ownedStreamingPlatform.treasuryCash === 5_500_000, 'Reopening a paid custom ident must never charge it again.');
const cinematicIdentBase: Player = {
    ...incorporated,
    ownedStreamingPlatform: { ...incorporated.ownedStreamingPlatform, treasuryCash: 7_000_000 },
};
const cinematicIdent = saveStreamingServiceIdent(cinematicIdentBase, { soundIdentKey: 'PREMIERE', identPackageId: 'CINEMATIC' });
assert(cinematicIdent.changed && cinematicIdent.player.ownedStreamingPlatform.treasuryCash === 500_000, 'Cinematic identities must charge their canonical $6.5M production cost.');
assert(getStreamingIdentPurchaseView(cinematicIdent.player).purchasedPackageIds.includes('CINEMATIC'), 'Cinematic package ownership must persist within the launch campaign.');
const removedCustomIdent = removeStreamingCustomIdentAudio(premiumIdent.player);
assert(removedCustomIdent.changed, 'Removing uploaded Ident audio must update the canonical save.');
assert(!removedCustomIdent.player.ownedStreamingPlatform.serviceConfiguration.customIdentAudio, 'Removing uploaded Ident audio must delete the stored audio payload.');
assert(removedCustomIdent.player.ownedStreamingPlatform.serviceConfiguration.soundIdentKey === null, 'Removing active custom audio must leave the Ident incomplete until recommissioned.');
assert(removedCustomIdent.player.ownedStreamingPlatform.treasuryCash === 5_500_000, 'Deleting custom audio must never refund the package purchase.');
assert(getStreamingIdentPurchaseView(removedCustomIdent.player).purchasedPackageIds.includes('FULL'), 'Deleting custom audio must preserve the paid package receipt for this campaign.');
const multiPackageBase: Player = {
    ...incorporated,
    ownedStreamingPlatform: {
        ...incorporated.ownedStreamingPlatform,
        treasuryCash: 30_000_000,
        technologyLevels: {
            ...incorporated.ownedStreamingPlatform.technologyLevels,
            PRODUCT_EXPERIENCE: 35,
        },
    },
};
const boughtFull = saveStreamingServiceIdent(multiPackageBase, { soundIdentKey: 'PULSE', identPackageId: 'FULL' });
const boughtAdaptive = saveStreamingServiceIdent(boughtFull.player, { soundIdentKey: 'ORBIT', identPackageId: 'ADAPTIVE' });
assert(boughtAdaptive.changed && boughtAdaptive.player.ownedStreamingPlatform.treasuryCash === 16_500_000, 'Buying Adaptive after Full must charge the full $9M with no trade-in or refund.');
assert(getStreamingIdentPurchaseView(boughtAdaptive.player).purchasedPackageIds.includes('FULL') && getStreamingIdentPurchaseView(boughtAdaptive.player).purchasedPackageIds.includes('ADAPTIVE'), 'Each Ident package bought in this opening campaign must remain owned independently.');
const returnToFull = saveStreamingServiceIdent(boughtAdaptive.player, { soundIdentKey: 'EMBER', identPackageId: 'FULL' });
assert(returnToFull.changed && returnToFull.player.ownedStreamingPlatform.treasuryCash === 16_500_000, 'Switching back to a package already bought in this wizard must be free.');
const stalePremiumIdent: Player = {
    ...incorporated,
    ownedStreamingPlatform: {
        ...incorporated.ownedStreamingPlatform,
        serviceConfiguration: {
            ...incorporated.ownedStreamingPlatform.serviceConfiguration,
            source: 'PLAYER_ACTION', soundIdentKey: 'CHOIR', identPackageId: 'FULL', identDurationSeconds: 8,
            committedCost: 4_500_000, committedAtAbsoluteWeek: 100, revision: 1,
        },
    },
};
assert(!getStreamingLaunchProgramView(stalePremiumIdent).milestones.find(item => item.id === 'SERVICE_IDENT')?.complete, 'A stale package field without a paid commitment must never impersonate a commission.');
const stalePremiumAttempt = saveStreamingServiceIdent(stalePremiumIdent, { soundIdentKey: 'CHOIR', identPackageId: 'FULL' });
assert(!stalePremiumAttempt.changed && stalePremiumAttempt.reason === 'INSUFFICIENT_TREASURY' && stalePremiumAttempt.shortfall === 4_500_000, 'A stale paid-looking config must still require the real $4.5M commission payment.');
const pricing = saveStreamingPricingPlan(incorporated, {
    streams: ['subs', 'ads', 'rentals', 'premium', 'daypass', 'sponsor', 'metered', 'patron'],
    plans: [{ id: 'BASIC', name: 'Opening', monthly: 9, featureIds: ['hd', 'uhd', 'spatial', 'downloads', 'live', 'noads', 'catalogue'], ads: true }],
    annualDiscount: 10, introOffer: 0,
    ads: { minutesPerHour: 4, cpm: 22 }, rentals: { rent: 6, buy: 20, windowWeeks: 6 }, premium: { price: 30 },
    daypass: { price: 8 }, sponsor: { perTitle: 4_000_000, titles: 1 }, metered: { perHour: 1 }, patron: { monthly: 10 },
});
assert(pricing.changed, 'Pricing must be saveable during free launch planning.');
assert(pricing.player.ownedStreamingPlatform.serviceConfiguration.pricing.streams.join(',') === 'subs', 'Unresearched revenue models must be rejected by canonical pricing logic.');
assert(pricing.player.ownedStreamingPlatform.serviceConfiguration.pricing.plans[0].featureIds.join(',') === 'noads,catalogue', 'Unresearched plan entitlements must be removed by canonical pricing logic.');
assert(pricing.player.ownedStreamingPlatform.subscriptionPrices.BASIC === 9, 'The custom launch plan must update the compatible live subscription price beneath it.');
assert(getStreamingLaunchProgramView(pricing.player).milestones.find(item => item.id === 'PRICING')?.complete, 'Saving a valid commercial offer must complete the canonical Pricing milestone.');

const plan = planStreamingLaunchCost(incorporated, {
    idempotencyKey: 'opening-market-study',
    category: 'MARKET',
    label: 'Opening market study',
    amount: 5_000_000,
});
assert(plan.changed && plan.reason === 'PLANNED', 'A player must be able to plan launch work at $0.');
assert(plan.player.ownedStreamingPlatform.treasuryCash === 0, 'Planning must never move company cash.');
assert(plan.player.money === incorporated.money, 'Planning must never move personal cash.');
const plannedView = getStreamingLaunchProgramView(plan.player);
assert(plannedView.recommendedNextAction?.milestoneId === 'FUND_COMPANY', 'A zero-cash plan must not falsely complete the funding mission.');
assert(plannedView.budget.plannedSpend === 5_000_000 && plannedView.budget.shortfall === 5_000_000, 'The budget rail must expose planned spend and its exact shortfall.');

const blockedCommit = commitStreamingLaunchCost(plan.player, plan.commitment!.id);
assert(!blockedCommit.changed && blockedCommit.reason === 'INSUFFICIENT_TREASURY', 'The engine must reject commitments at $0.');
assert(blockedCommit.shortfall === 5_000_000, 'A rejected commitment must report the exact missing cash.');

const funding = contributeStreamingFounderCapital(plan.player, 10_000_000, 'phase3-first-funding');
assert(funding.changed && funding.reason === 'CONTRIBUTED', 'The existing Studio Finance founder injection must fund the launch campaign.');
assert(funding.player.money === plan.player.money - 10_000_000, 'Founder funding must leave personal cash exactly once.');
assert(funding.player.ownedStreamingPlatform.treasuryCash === 10_000_000, 'Founder funding must arrive in company treasury exactly once.');
const fundedView = getStreamingLaunchProgramView(funding.player);
assert(fundedView.milestones.find(item => item.id === 'FUND_COMPANY')?.complete, 'Positive founder funding history must complete the funding milestone.');
assert(fundedView.recommendedNextAction?.milestoneId === 'OPENING_MARKETS', 'After funding, the campaign must guide the player to Opening Markets.');

const committed = commitStreamingLaunchCost(funding.player, plan.commitment!.idempotencyKey);
assert(committed.changed && committed.reason === 'COMMITTED', 'Funded planned work must become a reserved commitment.');
assert(committed.player.ownedStreamingPlatform.treasuryCash === 10_000_000, 'Reserving work must not double-charge the destination system’s future settlement.');
const committedView = getStreamingLaunchProgramView(committed.player);
assert(committedView.budget.committedSpend === 5_000_000, 'The budget rail must show committed launch spending.');
assert(committedView.budget.availableToCommit === 5_000_000, 'The budget rail must exclude reserved money from available commitment capacity.');
const repeatedCommit = commitStreamingLaunchCost(committed.player, plan.commitment!.id);
assert(!repeatedCommit.changed && repeatedCommit.reason === 'ALREADY_EXISTS', 'Repeated commitment requests must be idempotent.');

const normalized = normalizeOwnedStreamingPlatformState(clone(committed.player.ownedStreamingPlatform), committed.player.id);
const resumed = getStreamingLaunchProgramView({ ...committed.player, ownedStreamingPlatform: normalized });
assert(
    resumed.recommendedNextAction?.milestoneId === committedView.recommendedNextAction?.milestoneId
        && resumed.completedCount === committedView.completedCount
        && resumed.budget.committedSpend === committedView.budget.committedSpend,
    'Leaving and returning must re-derive the exact campaign stage from persisted canonical state.',
);
const migratedLegacyRightsStep = normalizeOwnedStreamingPlatformState({
    ...clone(committed.player.ownedStreamingPlatform),
    launchProgram: {
        ...clone(committed.player.ownedStreamingPlatform.launchProgram),
        defineCurrentStep: 'RIGHTS_LOCALIZATION',
    },
} as any, committed.player.id);
assert(migratedLegacyRightsStep.launchProgram.defineCurrentStep === 'BLUEPRINT', 'A save parked on the removed rights mission must resume safely at Launch Blueprint.');

const marketFunding = contributeStreamingFounderCapital(incorporated, 100_000_000, 'phase3-market-funding');
assert(marketFunding.changed, 'The market fixture must fund company treasury.');
const marketPlan = saveStreamingMarketPlan(marketFunding.player, ['US', 'CA']);
assert(marketPlan.changed && marketPlan.player.ownedStreamingPlatform.treasuryCash === 100_000_000, 'Selecting countries must save a plan without moving cash.');
const marketStart = beginStreamingMarketClearance(marketPlan.player, ['US', 'CA']);
assert(marketStart.changed && marketStart.reason === 'STARTED', 'Confirming market entry must start clearance.');
assert(marketStart.amount === 66_000_000 && marketStart.player.ownedStreamingPlatform.treasuryCash === 34_000_000, 'Market entry must settle the exact $66M rights and compliance total once.');
assert(marketStart.player.ownedStreamingPlatform.marketOperations.every(operation => operation.status === 'CLEARANCE'), 'Every confirmed country must enter asynchronous review.');
const repeatedMarketStart = beginStreamingMarketClearance(marketStart.player, ['US', 'CA']);
assert(!repeatedMarketStart.changed && repeatedMarketStart.reason === 'ALREADY_STARTED', 'Market entry confirmation must be idempotent.');
const resavedMarketPlan = saveStreamingMarketPlan(marketStart.player, ['US', 'CA']);
assert(resavedMarketPlan.player.ownedStreamingPlatform.marketOperations.every(operation => operation.status === 'CLEARANCE'), 'Editing the footprint must never roll a committed clearance back into planning.');
const readyWeek = Math.max(...marketStart.player.ownedStreamingPlatform.marketOperations.map(operation => operation.approvalReadyAtAbsoluteWeek || 0));
const agedPlayer = { ...marketStart.player, age: Math.floor(readyWeek / 52) + 1, currentWeek: (readyWeek % 52) + 1 };
const advancedMarkets = advanceStreamingMarketClearances(agedPlayer);
assert(
    advancedMarkets.changed
        && advancedMarkets.player.ownedStreamingPlatform.marketOperations.every(operation => ['READY', 'CLEARANCE', 'AWAITING_FUNDING', 'SUSPENDED'].includes(operation.status))
        && advancedMarkets.player.ownedStreamingPlatform.marketOperations.every(operation => operation.clearance?.outcome !== 'PENDING'),
    'Pre-launch government reviews must reach a persistent decision from canonical game time, including conditional, delayed and recoverable outcomes.',
);
const expansionDuplicate = saveStreamingMarketPlan(advancedMarkets.player, ['US'], 'EXPANSION');
assert(!expansionDuplicate.changed && expansionDuplicate.reason === 'NO_MARKETS', 'Expansion must not sell entry to a country already owned by the opening footprint.');

const commandDeckSource = readFileSync('components/streaming-transplant/StreamingPlatformCommandDeck.tsx', 'utf8');
const hqSource = readFileSync('components/StreamingPlatformHQ.tsx', 'utf8');
const wizardSource = readFileSync('components/StreamingDefineLaunchWizard.tsx', 'utf8');
assert(
    commandDeckSource.includes('state.launchProgram')
        && commandDeckSource.includes('launchCommandRows')
        && commandDeckSource.includes("track.id === 'BUILD_PLATFORM'")
        && commandDeckSource.includes('onOpenLaunchTrack?.(track.id)'),
    'Pre-launch headquarters must expose both canonical campaign tracks as compact playable commands.',
);
assert(hqSource.includes("openFinanceRoom('CAPITAL', 'INJECT')"), 'The Fund Company deep-link must open the existing Studio Finance injection flow.');
assert(hqSource.includes('onOpenFinance={() => openFinanceRoom()}'), 'The headquarters treasury figure must open Studio Finance without forcing the capital-injection modal.');
assert(hqSource.includes('onOpenLaunchTrack=') && hqSource.includes('StreamingDefineLaunchWizard'), 'Both campaign tracks must open their dedicated playable wizard.');
assert(wizardSource.includes('BEGIN MARKET ENTRY') && wizardSource.includes('SAVE LAUNCH BLUEPRINT'), 'The Define wizard must connect free planning, paid entry and the version checkpoint.');
assert(!wizardSource.includes("id: 'RIGHTS_LOCALIZATION'") && !wizardSource.includes('MISSION 07 · TERRITORY RIGHTS'), 'Rights and localization must not return as a separate Define the Launch mission.');
assert(
    wizardSource.includes('RULES, RIVALS & NETWORK')
        && wizardSource.includes('WHO ALREADY OWNS ATTENTION')
        && wizardSource.includes('REGION IMPACT')
        && wizardSource.includes('YOUR OPENING FOOTPRINT'),
    'Opening Markets must retain the complete country dossier and regional intelligence from the original Day-One Market experience.',
);

console.log('Streaming Road to Opening Night Phase 3 audit passed.');
