import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    createDefaultStreamingFoundingDraft,
    incorporateOwnedStreamingPlatform,
    saveStreamingFoundingDraft,
} from '../services/streamingFounding';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import { commitStreamingRaise } from '../services/streamingFinancing';
import {
    acceptStreamingCelebrityInvestment,
    promoteStreamingInternalExecutive,
} from '../services/streamingLeadershipGovernance';
import { getStreamingFinanceRoom } from '../services/streamingFinanceRoom';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const createCompany = (): Player => {
    const eligible: Player = {
        ...clone(INITIAL_PLAYER),
        id: 'finance-room-founder',
        name: 'Finance Founder',
        money: 500_000_000,
        ownedStreamingPlatform: {
            ...clone(INITIAL_PLAYER.ownedStreamingPlatform),
            lifecycle: 'ELIGIBLE',
            simulationSeed: 'owned-streaming:finance-room-founder',
            milestoneKeys: ['streaming-launch-clearance'],
        },
    };
    const drafted = saveStreamingFoundingDraft(eligible, {
        ...createDefaultStreamingFoundingDraft(100),
        currentStep: 2,
        name: 'Northstar+',
        dayOneMarketIds: ['US', 'CA'],
    });
    const incorporated = incorporateOwnedStreamingPlatform(drafted);
    assert(incorporated.changed, 'The Finance Room fixture should incorporate.');
    return incorporated.player;
};

let player = createCompany();
assert(player.money === 415_000_000, 'The exact $85M formation charge should leave personal cash once.');
assert(player.ownedStreamingPlatform.treasuryCash === 0, 'A new company must open with a $0 operating treasury.');
assert(player.ownedStreamingPlatform.foundingProfile?.setupCostsConsumed === 85_000_000, 'The full formation payment should be consumed.');
assert(player.ownedStreamingPlatform.foundingProfile?.incorporationModel === 'FIXED_V8_ZERO_TREASURY', 'New companies should use the explicit V8 model.');

const openingRoom = getStreamingFinanceRoom(player);
assert(openingRoom.treasuryStatus === 'EMPTY' && openingRoom.nextAction.kind === 'INJECT', 'The first Finance brief should direct the founder to fund the operating account.');
assert(openingRoom.periodLabel === 'PRE-LAUNCH' && openingRoom.periodRevenue === 0, 'Finance must not invent pre-launch operating revenue.');
assert(openingRoom.ledger.some(entry => entry.category === 'FORMATION' && !entry.affectsTreasury && entry.displayAmount === 85_000_000), 'The passbook should disclose formation cost without pretending it entered treasury.');

const personalBefore = player.money;
const funded = contributeStreamingFounderCapital(player, 25_000_000, 'finance-room-audit-injection');
assert(funded.changed, 'Founder injection should be available immediately after incorporation.');
player = funded.player;
assert(player.money === personalBefore - 25_000_000, 'Founder injection should debit personal cash atomically.');
assert(player.ownedStreamingPlatform.treasuryCash === 25_000_000, 'Founder injection should credit company treasury atomically.');
assert(player.ownedStreamingPlatform.founderOwnershipPercent === 100 && player.ownedStreamingPlatform.debtPrincipal === 0, 'Founder injection must create neither dilution nor debt.');

const duplicate = contributeStreamingFounderCapital(player, 25_000_000, 'finance-room-audit-injection');
assert(!duplicate.changed && duplicate.reason === 'ALREADY_COMMITTED', 'The capital bridge must be idempotent.');

const debtAttempt = commitStreamingRaise(player, {
    id: 'duplicate-company-loan',
    kind: 'DEBT',
    amount: 10_000_000,
    ratePct: 8,
    weeks: 52,
    weekly: 200_000,
});
assert(!debtAttempt.changed && debtAttempt.reason === 'BANK_SYSTEM_ONLY', 'Streaming must not create a second loan marketplace beside the existing Bank.');

const equityAttempt = commitStreamingRaise(player, {
    id: 'ungated-equity',
    kind: 'EQUITY',
    amount: 50_000_000,
    pct: 8,
    investor: 'Audit Growth Fund',
    agenda: 'Growth discipline',
});
assert(!equityAttempt.changed && equityAttempt.reason === 'CFO_REQUIRED', 'Generic equity issuance should require an active CFO.');
const celebrityAttempt = acceptStreamingCelebrityInvestment(player, 'investor-sofia-laurent');
assert(!celebrityAttempt.changed && celebrityAttempt.reason === 'CFO_REQUIRED', 'Celebrity equity should use the same CFO gate.');

const cfoAppointment = promoteStreamingInternalExecutive(player, 'internal-cfo');
assert(cfoAppointment.changed, 'The game should provide a real internal CFO route.');
player = cfoAppointment.player;
const equity = acceptStreamingCelebrityInvestment(player, 'investor-sofia-laurent');
assert(equity.changed, 'CFO-approved voluntary equity should be playable.');
player = equity.player;
assert(player.ownedStreamingPlatform.treasuryCash === 265_000_000, 'Accepted investor capital should enter the same treasury.');
assert(player.ownedStreamingPlatform.founderOwnershipPercent === 86, 'Accepted terms should persist disclosed dilution.');

const room = getStreamingFinanceRoom(player);
assert(room.hasCfo && room.cfoName, 'Finance should expose the active CFO sign-off state.');
assert(room.founderCapitalContributed === 25_000_000 && room.outsideCapitalRaised === 240_000_000, 'The capital desk should reconcile founder and outside capital separately.');
assert(room.investorOffers.find(offer => offer.id === 'investor-sofia-laurent')?.accepted, 'The accepted offer should become permanent cap-table state.');
const closingBalance = room.ledger
    .filter(entry => entry.affectsTreasury)
    .reduce((total, entry) => total + entry.cashDelta, 0);
assert(closingBalance === room.treasuryCash, 'The Finance ledger must close exactly to current company treasury.');

const legacy = normalizeOwnedStreamingPlatformState({
    ...clone(INITIAL_PLAYER.ownedStreamingPlatform),
    lifecycle: 'FOUNDING',
    foundingProfile: {
        incorporationModel: 'FIXED_V7',
        founderCashCharged: 85_000_000,
        setupCostsConsumed: 70_000_000,
        openingTreasuryCash: 15_000_000,
        outsideCapitalRaisedAtIncorporation: 0,
        debtPrincipalAtIncorporation: 0,
        founderOwnershipPercentAtIncorporation: 100,
        founderWasCeoAtIncorporation: true,
        incorporatedAtAbsoluteWeek: 100,
    },
}, 'legacy-finance-room');
assert(legacy.foundingProfile?.openingTreasuryCash === 15_000_000, 'Existing FIXED_V7 saves must preserve their historical opening treasury.');

const roomSource = readFileSync(resolve(process.cwd(), 'components/streaming-transplant/StreamingFinanceRoom.tsx'), 'utf8');
const studioSource = readFileSync(resolve(process.cwd(), 'components/studio-finance/components/StudioFinance.tsx'), 'utf8');
const snapshotSource = readFileSync(resolve(process.cwd(), 'components/studio-finance/components/SnapshotView.tsx'), 'utf8');
const performanceSource = readFileSync(resolve(process.cwd(), 'components/studio-finance/components/PerformanceView.tsx'), 'utf8');
const flagSource = readFileSync(resolve(process.cwd(), 'components/studio-finance/components/FlagField.tsx'), 'utf8');
const ledgerSource = readFileSync(resolve(process.cwd(), 'components/studio-finance/components/LedgerView.tsx'), 'utf8');
const capitalSource = readFileSync(resolve(process.cwd(), 'components/studio-finance/components/CapitalView.tsx'), 'utf8');
const roomStyles = readFileSync(resolve(process.cwd(), 'components/studio-finance/styles/studio-finance.css'), 'utf8');
const boardroomSource = readFileSync(resolve(process.cwd(), 'components/studio-finance/components/Boardroom.tsx'), 'utf8');
const boardroomAdapterSource = readFileSync(resolve(process.cwd(), 'components/streaming-transplant/StreamingBoardroomExperience.tsx'), 'utf8');
const boardroomStyles = readFileSync(resolve(process.cwd(), 'components/studio-finance/styles/boardroom.css'), 'utf8');
const hqSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const appSource = readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');
const leadershipSource = readFileSync(resolve(process.cwd(), 'components/StreamingLeadershipSuite.tsx'), 'utf8');
assert(roomSource.includes("'SNAPSHOT'") && roomSource.includes("'PERFORMANCE'") && roomSource.includes("'LEDGER'") && roomSource.includes("'CAPITAL'"), 'Studio Finance should use four focused views instead of one giant scroll.');
assert(
    roomSource.includes('getStreamingStudioFinanceData')
    && roomSource.includes('<StudioFinance')
    && studioSource.includes('SnapshotView')
    && studioSource.includes('PerformanceView')
    && studioSource.includes('LedgerView')
    && studioSource.includes('CapitalView'),
    'The canonical finance adapter should drive all four ZIP-designed Studio Finance views.',
);
assert(
    !roomSource.includes('company-finance.webp')
    && snapshotSource.includes('CashFlowChart')
    && performanceSource.includes("key: 'titles'")
    && performanceSource.includes("key: 'sources'")
    && performanceSource.includes("key: 'markets'"),
    'Studio Finance should use game-native visuals and preserve the title, source and market performance desks.',
);
assert(ledgerSource.includes('groupLedger') && ledgerSource.includes('Load earlier') && ledgerSource.includes('sf-search'), 'The company passbook should keep searchable, grouped and progressively disclosed ledger history.');
assert(capitalSource.includes('onOpenBank') && capitalSource.includes('onOpenLeadership') && capitalSource.includes('onOpenPublicMarkets'), 'Capital doors should connect to existing game systems.');
assert(
    performanceSource.includes('FlagField')
    && performanceSource.includes('onOpenMarket')
    && flagSource.includes('flagAccent')
    && roomStyles.includes('.sf-terrs'),
    'The revised market-performance desk should keep its flag-led territory cards and real Market Room handoff.',
);
assert(
    boardroomSource.includes('bd-stamp')
    && boardroomSource.includes('bd-vital-delta')
    && boardroomAdapterSource.includes('absoluteWeek')
    && boardroomAdapterSource.includes('treasuryDelta')
    && boardroomStyles.includes('.bd-anim'),
    'The revised Boardroom should show the canonical books-open week, live deltas and staged room entry.',
);
assert(roomStyles.includes('max-width: 430px') && roomStyles.includes('prefers-reduced-motion') && roomStyles.includes('@media (max-width: 359px)'), 'Finance should preserve the supplied mobile canvas, compact handling and reduced motion.');
assert(!hqSource.includes('StreamingRaiseExperience') && hqSource.includes('StreamingFinanceRoom'), 'Headquarters should retire the duplicate Raise screen.');
assert(
    hqSource.includes("chip === 'FINANCE'")
    && hqSource.includes("onIssueEquity={() => openFinanceRoom('CAPITAL', 'EQUITY')}")
    && hqSource.includes("onRaise={() => openFinanceRoom('CAPITAL', 'INJECT')}")
    && roomSource.includes('initialCapitalRoute')
    && roomSource.includes('onOpenBuild'),
    'Command Deck, Boardroom and Build finance affordances should converge on the relevant Finance Room context.',
);
assert(
    roomSource.includes('streaming-hq-shell')
    && snapshotSource.includes('compactLabel="Inflow"')
    && snapshotSource.includes('compactLabel="Outflow"')
    && roomStyles.includes('@media (max-width: 389px)')
    && roomStyles.includes('env(safe-area-inset-top)'),
    'Studio Finance should mount as a safe-area-aware immersive screen with collision-free narrow-phone cash-flow labels.',
);
assert(appSource.includes("setLifestyleInitialView('STREAMING_FINANCE')") && appSource.includes("setInitialMobileAppMode('BANK')"), 'Main dashboard and Bank handoffs should be connected at app level.');
assert(leadershipSource.includes('Open Studio Finance') && !leadershipSource.includes('Accept capital and dilution'), 'Leadership should own CFO governance but not duplicate term-sheet execution.');

console.log('Streaming Finance Room audit passed.');
