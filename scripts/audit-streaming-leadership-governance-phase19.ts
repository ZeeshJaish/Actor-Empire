import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type Player,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    STREAMING_BOARD_MOTIONS,
    STREAMING_CELEBRITY_INVESTOR_OFFERS,
    STREAMING_EXECUTIVE_DEVELOPMENT_PROGRAMS,
    STREAMING_EXECUTIVE_ROLE_ORDER,
    STREAMING_INDEPENDENT_DIRECTORS,
    STREAMING_INTERNAL_PROMOTION_CANDIDATES,
    acceptStreamingCelebrityInvestment,
    appointStreamingExternalExecutive,
    appointStreamingIndependentDirector,
    callStreamingBoardVote,
    completeDueStreamingExecutiveDevelopment,
    getExternalStreamingExecutiveCandidates,
    getStreamingGovernanceWeeklyCost,
    getStreamingLeadershipSuite,
    promoteStreamingInternalExecutive,
    startStreamingExecutiveDevelopment,
    updateStreamingDelegationMandate,
} from '../services/streamingLeadershipGovernance';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    const platform = createInitialOwnedStreamingPlatformState('phase19-player');
    const absoluteWeek = getAbsoluteWeek(46, 14);
    return {
        ...player,
        id: 'phase19-player',
        name: 'Aarav Shah',
        age: 46,
        currentWeek: 14,
        ownedStreamingPlatform: {
            ...platform,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#d6ad59',
                secondaryColor: '#090a10',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'ASCENT',
                brandPromiseId: 'EVENT_HOUSE',
                foundedAtAbsoluteWeek: absoluteWeek - 24,
            },
            foundingProfile: {
                incorporationModel: 'FIXED_V7',
                founderCashCharged: 85_000_000,
                setupCostsConsumed: 70_000_000,
                openingTreasuryCash: 15_000_000,
                outsideCapitalRaisedAtIncorporation: 0,
                debtPrincipalAtIncorporation: 0,
                founderOwnershipPercentAtIncorporation: 100,
                founderWasCeoAtIncorporation: true,
                incorporatedAtAbsoluteWeek: absoluteWeek - 24,
            },
            treasuryCash: 700_000_000,
            metrics: {
                ...platform.metrics,
                subscribers: 3_500_000,
            },
        },
    };
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 23, 'Phase 1 canonical foundation should move owned streaming saves to schema v23.');
const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 16 }, 'phase19-migration');
assert(migrated.schemaVersion === 23, 'Schema v16 streaming saves should migrate to the current schema.');
assert(migrated.leadership.developmentPrograms.length === 0, 'Legacy saves should receive an empty executive-development portfolio.');
assert(migrated.leadership.delegation.maximumRightsBid > 0, 'Legacy saves should receive a safe default delegation mandate.');
assert(migrated.governance.directors.length === 0 && migrated.governance.boardConfidence > 0, 'Legacy saves should receive safe governance defaults.');

assert(STREAMING_EXECUTIVE_ROLE_ORDER.length === 9, 'The organization chart should contain all nine specialist leadership roles.');
assert(getExternalStreamingExecutiveCandidates().length >= 9, 'Every specialist role should have an external candidate, with deeper founding-role markets.');
assert(
    STREAMING_EXECUTIVE_ROLE_ORDER.every(role => getExternalStreamingExecutiveCandidates().some(candidate => candidate.role === role)),
    'Every specialist leadership role should remain represented in the expanded external market.',
);
assert(STREAMING_INTERNAL_PROMOTION_CANDIDATES.length === 9, 'Every specialist role should have an internal promotion route.');
assert(STREAMING_EXECUTIVE_DEVELOPMENT_PROGRAMS.length === 4, 'Executive development should provide four materially different tracks.');
assert(STREAMING_INDEPENDENT_DIRECTORS.length === 3, 'The board market should provide independent director choices.');
assert(STREAMING_CELEBRITY_INVESTOR_OFFERS.length === 3, 'The investor salon should provide three distinct voluntary offers.');
assert(STREAMING_BOARD_MOTIONS.length === 4, 'The board chamber should expose major operating votes.');

let fixture = createFixture();
let suite = getStreamingLeadershipSuite(fixture);
assert(suite.available && suite.activeExecutives.length === 0, 'An incorporated platform should open founder-led with no forced hires.');
assert(!suite.boardBinding && suite.boardModeLabel.includes('advisory'), 'A 100% founder-owned platform must keep the board advisory.');

const external = appointStreamingExternalExecutive(fixture, 'marcus-vale');
assert(external.changed, 'The founder should be able to hire an external executive.');
fixture = external.player;
const externalAppointment = fixture.ownedStreamingPlatform.leadership.appointments.find(item => item.executiveId === 'marcus-vale')!;
assert(externalAppointment.skill === 86 && externalAppointment.loyalty === 60, 'External hiring should preserve visible strengths and relationship tradeoffs.');
assert(!appointStreamingExternalExecutive(fixture, 'marcus-vale').changed, 'An external appointment must be idempotent.');

const internal = promoteStreamingInternalExecutive(fixture, 'internal-coo');
assert(internal.changed, 'The founder should be able to promote qualified internal talent.');
fixture = internal.player;
const internalAppointment = fixture.ownedStreamingPlatform.leadership.appointments.find(item => item.executiveId === 'internal-coo')!;
assert(internalAppointment.origin === 'INTERNAL_PROMOTION', 'Internal talent should persist its promotion origin.');
assert(internalAppointment.loyalty > externalAppointment.loyalty, 'Internal promotion should carry the designed loyalty advantage.');
assert(internalAppointment.weeklyCompensation < externalAppointment.weeklyCompensation, 'Internal promotion should carry a lower compensation profile.');
const financeAppointment = promoteStreamingInternalExecutive(fixture, 'internal-cfo');
assert(financeAppointment.changed, 'Equity preparation should have a playable CFO appointment route.');
fixture = financeAppointment.player;

const treasuryBeforeDevelopment = fixture.ownedStreamingPlatform.treasuryCash;
const development = startStreamingExecutiveDevelopment(fixture, 'marcus-vale', 'ROLE_MASTERY');
assert(development.changed, 'An appointed executive should enter development.');
fixture = development.player;
const developmentRecord = fixture.ownedStreamingPlatform.leadership.developmentPrograms.at(-1)!;
assert(
    fixture.ownedStreamingPlatform.treasuryCash === treasuryBeforeDevelopment - developmentRecord.capitalCost,
    'Executive development should debit company treasury exactly once.',
);
assert(!startStreamingExecutiveDevelopment(fixture, 'marcus-vale', 'FOUNDER_ALIGNMENT').changed, 'One executive must not run overlapping development programs.');
const beforeDue = completeDueStreamingExecutiveDevelopment(
    fixture.ownedStreamingPlatform,
    developmentRecord.readyAtAbsoluteWeek - 1,
);
assert(beforeDue.completedPrograms.length === 0, 'Development must use canonical game weeks and not complete early.');
const completed = completeDueStreamingExecutiveDevelopment(
    fixture.ownedStreamingPlatform,
    developmentRecord.readyAtAbsoluteWeek,
);
assert(completed.completedPrograms.length === 1 && completed.ledgerEntries.length === 1, 'A due development program should complete once with one ledger fact.');
const developedExecutive = completed.platform.leadership.appointments.find(item => item.executiveId === 'marcus-vale')!;
assert(developedExecutive.skill === externalAppointment.skill + 8, 'Role mastery should increase the executive skill trait.');
const completedAgain = completeDueStreamingExecutiveDevelopment({
    ...completed.platform,
    eventLedger: [...completed.platform.eventLedger, ...completed.ledgerEntries],
}, developmentRecord.readyAtAbsoluteWeek + 1);
assert(completedAgain.completedPrograms.length === 0 && completedAgain.ledgerEntries.length === 0, 'Completed development must never apply twice.');
fixture = {
    ...fixture,
    ownedStreamingPlatform: {
        ...completed.platform,
        eventLedger: [...completed.platform.eventLedger, ...completed.ledgerEntries],
    },
};

const mandate = updateStreamingDelegationMandate(fixture, {
    maximumRightsBid: 90_000_000,
    minimumCapacityHeadroomPercent: 34,
    weeklyCampaignLimit: 24_000_000,
    renewalMinimumMarginPercent: 18,
    incidentPolicy: 'TRANSPARENT_FIRST',
});
assert(mandate.changed, 'A platform with leadership should be able to publish delegation guardrails.');
fixture = mandate.player;
assert(fixture.ownedStreamingPlatform.leadership.delegation.maximumRightsBid === 90_000_000, 'Rights authority should persist as a real mandate value.');

const director = appointStreamingIndependentDirector(fixture, 'director-meera-sen');
assert(director.changed, 'The founder should be able to appoint an independent director.');
fixture = director.player;
assert(!appointStreamingIndependentDirector(fixture, 'director-meera-sen').changed, 'A director appointment must not duplicate.');

const advisoryVote = callStreamingBoardVote(fixture, 'CAPACITY_GUARDRAIL');
assert(advisoryVote.changed, 'The founder should be able to call an advisory board motion.');
fixture = advisoryVote.player;
const advisoryMotion = fixture.ownedStreamingPlatform.governance.motions.at(-1)!;
assert(!advisoryMotion.binding && advisoryMotion.status === 'APPROVED', 'At 100% ownership, founder motions should remain advisory and cannot be vetoed.');
assert(fixture.ownedStreamingPlatform.leadership.delegation.minimumCapacityHeadroomPercent >= 30, 'An approved motion should change the canonical mandate.');

const cashBeforeInvestment = fixture.ownedStreamingPlatform.treasuryCash;
const ungatedAttempt = acceptStreamingCelebrityInvestment(createFixture(), 'investor-sofia-laurent');
assert(!ungatedAttempt.changed && ungatedAttempt.reason === 'CFO_REQUIRED', 'Outside equity must remain blocked until an active CFO signs off.');
const investment = acceptStreamingCelebrityInvestment(fixture, 'investor-sofia-laurent');
assert(investment.changed, 'Celebrity investment should be a playable voluntary equity decision.');
fixture = investment.player;
assert(fixture.ownedStreamingPlatform.treasuryCash === cashBeforeInvestment + 240_000_000, 'Accepted capital should enter company treasury.');
assert(fixture.ownedStreamingPlatform.founderOwnershipPercent === 86, 'Accepted equity should dilute founder ownership by the disclosed amount.');
assert(fixture.ownedStreamingPlatform.finance.equityHolders.some(holder => holder.holderName === 'Sofia Laurent'), 'Outside ownership should enter the equity register.');
assert(fixture.ownedStreamingPlatform.governance.directors.some(item => item.seatType === 'INVESTOR_NOMINEE'), 'A negotiated board seat should create a real investor nominee.');
assert(fixture.ownedStreamingPlatform.cinematicQueue.filter(item => item.type === 'CELEBRITY_INVESTOR_REVEAL').length === 1, 'Accepted celebrity capital should queue one major reveal.');
assert(!acceptStreamingCelebrityInvestment(fixture, 'investor-sofia-laurent').changed, 'The same equity offer must never issue twice.');
suite = getStreamingLeadershipSuite(fixture);
assert(suite.boardBinding && suite.outsideOwnershipPercent === 14, 'Voluntary dilution should be the only point where board governance becomes binding.');

let vetoFixture = createFixture();
vetoFixture = promoteStreamingInternalExecutive(vetoFixture, 'internal-cfo').player;
vetoFixture = acceptStreamingCelebrityInvestment(vetoFixture, 'investor-sofia-laurent').player;
const bindingVote = callStreamingBoardVote(vetoFixture, 'TRUST_CHARTER');
assert(bindingVote.changed, 'A diluted company should be able to call a binding board vote.');
vetoFixture = bindingVote.player;
const bindingMotion = vetoFixture.ownedStreamingPlatform.governance.motions.at(-1)!;
assert(bindingMotion.binding && bindingMotion.status === 'REJECTED', 'A non-aligned investor nominee should be able to create a genuine binding veto.');
assert(vetoFixture.ownedStreamingPlatform.leadership.delegation.incidentPolicy !== 'TRANSPARENT_FIRST', 'A rejected motion must not apply its operating consequence.');
assert(getStreamingGovernanceWeeklyCost(fixture.ownedStreamingPlatform, 20_000_000) >= 500_000, 'Director fees and negotiated participation should create real weekly cost.');

let controlFixture = createFixture();
controlFixture = promoteStreamingInternalExecutive(controlFixture, 'internal-cfo').player;
controlFixture = {
    ...controlFixture,
    ownedStreamingPlatform: {
        ...controlFixture.ownedStreamingPlatform,
        founderOwnershipPercent: 55,
    },
};
const controlFloor = acceptStreamingCelebrityInvestment(controlFixture, 'investor-aarav-kapoor');
assert(!controlFloor.changed && controlFloor.reason === 'CONTROL_LIMIT', 'Investor rounds must not silently push founder control below 51%.');

const component = readFileSync(resolve(process.cwd(), 'components/StreamingLeadershipSuite.tsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'styles/streaming-leadership-suite.css'), 'utf8');
const hq = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const weekly = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
assert(component.includes('Organization') && component.includes('Delegation') && component.includes('Investor Salon'), 'The Leadership Suite should expose all Phase 19 rooms.');
assert(component.includes('Internal promotions') && component.includes('External market'), 'Talent should visibly support both promotion and outside hiring.');
assert(component.includes('Open Studio Finance') && component.includes('CFO sign-off'), 'Leadership should prepare equity governance and hand the actual term sheet to Finance.');
assert(component.includes('Voluntary dilution activated genuine governance'), 'The UI should explain when veto power begins.');
assert(styles.includes('@media (max-width: 520px)') && styles.includes('prefers-reduced-motion'), 'Leadership UI should include explicit mobile and reduced-motion treatment.');
/* Reached from the BOARDROOM division's LEADERSHIP chip and the Boardroom's
   hire action, which replaced the retired Company Office. */
assert(
    hq.includes('showLeadershipSuite')
    && hq.includes("chip === 'LEADERSHIP'")
    && hq.includes('onHire={() => setShowLeadershipSuite(true)}'),
    'The Leadership Suite must be reachable from the Boardroom division and its hire action.',
);
assert(weekly.includes('completeDueStreamingExecutiveDevelopment') && weekly.includes('governanceCost'), 'The canonical weekly loop should complete development and reconcile governance costs.');
assert(!component.includes('IPO') && !component.includes('Acquire rival'), 'Phase 19 must not leak future IPO or M&A phases.');

console.log('✓ Streaming Executives, Promotions and Governance Phase 19 audit passed');
