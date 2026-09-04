import assert from 'node:assert/strict';
import type { PlatformIntelligenceOutcome, StreamingEcosystemOperator } from '../types';
import { createDeterministicId } from '../services/deterministicRandom';
import { normalizeStreamingPlatformEcosystem } from '../services/streamingPlatformEcosystem';
import { processIndustryIntelligenceShadowCompany } from '../services/industryIntelligence/industryIntelligenceCoordinator';
import { INDUSTRY_INTELLIGENCE_PROPOSAL_LIMIT } from '../services/industryIntelligence/industryIntelligenceState';
import { adaptStreamingEcosystemIntelligenceContext } from '../services/industryIntelligence/streamingEcosystemIntelligenceAdapter';
import { derivePlatformIntelligenceIntent } from '../services/platformAi/platformIntelligenceIntent';
import {
    appendPlatformIntelligenceOutcome,
    createInitialPlatformIntelligenceMigrationState,
    PLATFORM_INTELLIGENCE_OUTCOME_LIMIT,
    PLATFORM_INTELLIGENCE_PROCESSED_KEY_LIMIT,
} from '../services/platformAi/platformIntelligenceMigration';
import { evaluateStreamingOperatorCanonicalBidderEligibility } from '../services/platformAi/streamingOperatorBidderBridge';

const WEEKS = 20_800;

const simulate = () => {
    const base = normalizeStreamingPlatformEcosystem(undefined, 0);
    let operators: StreamingEcosystemOperator[] = ['CRAVE', 'CANAL_PLUS', 'JIOHOTSTAR', 'TVING'].map((id, index) => ({
        ...structuredClone(base.operators[id]),
        cataloguePower: 32 + index * 7,
        cashMillions: 2_000 + index * 500,
    }));
    let migrations = Object.fromEntries(operators.map(operator => [operator.id, createInitialPlatformIntelligenceMigrationState(0)]));
    const seenProposalIds = new Set<string>();
    for (let absoluteWeek = 1; absoluteWeek <= WEEKS; absoluteWeek += 1) {
        operators = operators.map(operator => {
            const context = adaptStreamingEcosystemIntelligenceContext(operator, absoluteWeek);
            const globalRecentFingerprints = operators.flatMap(item => (
                item.id === operator.id ? [] : item.intelligence?.content.selectedFingerprints || []
            )).slice(-96);
            const result = processIndustryIntelligenceShadowCompany({ context, state: operator.intelligence!, globalRecentFingerprints });
            const newProposals = result.state.proposals.filter(proposal => (
                proposal.absoluteWeek === absoluteWeek && !migrations[operator.id].processedProposalKeys.includes(proposal.idempotencyKey)
            ));
            for (const proposal of newProposals) {
                assert.equal(seenProposalIds.has(proposal.id), false, 'proposal identity must be globally stable and unique');
                seenProposalIds.add(proposal.id);
                const fingerprint = result.state.content.selectedFingerprints.find(item => item.id === proposal.contentFingerprintId);
                const intent = derivePlatformIntelligenceIntent({ proposal, fingerprint, spendingRestricted: context.condition.spendingRestricted });
                const outcome: PlatformIntelligenceOutcome = {
                    id: createDeterministicId('b4_long_outcome', proposal.idempotencyKey),
                    proposalId: proposal.id,
                    proposalKey: proposal.idempotencyKey,
                    intentRoute: intent.route,
                    status: intent.route === 'HOLD' ? 'HELD' : 'EXECUTED',
                    absoluteWeek,
                    reason: 'LONG_RUN_MODEL',
                    canonicalReferenceIds: [],
                };
                migrations[operator.id] = appendPlatformIntelligenceOutcome(migrations[operator.id], outcome);
            }
            assert.ok(result.state.proposals.length <= INDUSTRY_INTELLIGENCE_PROPOSAL_LIMIT);
            assert.ok(result.state.content.selectedFingerprints.length <= 24);
            assert.ok(result.state.content.universeBlueprints.length <= 6);
            assert.ok(migrations[operator.id].processedProposalKeys.length <= PLATFORM_INTELLIGENCE_PROCESSED_KEY_LIMIT);
            assert.ok(migrations[operator.id].outcomes.length <= PLATFORM_INTELLIGENCE_OUTCOME_LIMIT);
            return { ...operator, intelligence: result.state };
        });
    }
    const unsupportedEligible = operators.some(operator => evaluateStreamingOperatorCanonicalBidderEligibility(operator, {
        countryIds: [operator.homeCountryId], commitmentMillions: 1, externalSettlementIdentitySupported: false,
    }).eligible);
    assert.equal(unsupportedEligible, false, 'non-core identities cannot leak into canonical settlement without adapter support');
    const bytes = new TextEncoder().encode(JSON.stringify({ operators, migrations })).byteLength;
    return {
        operators,
        migrations,
        seenProposalIds: [...seenProposalIds].sort(),
        bytes,
    };
};

const first = simulate();
const replay = simulate();
assert.deepEqual(replay, first, '400-year B4 intelligence must replay deterministically');
assert.ok(first.seenProposalIds.length > 10_000, 'due-only lanes should continue making bounded decisions over 400 years');
assert.ok(first.bytes < 1_000_000, `retained B4 state is unexpectedly large: ${first.bytes}`);
console.log(JSON.stringify({ weeks: WEEKS, companies: first.operators.length, proposalCount: first.seenProposalIds.length, retainedBytes: first.bytes }));
console.log('Platform Intelligence B4 long-run audit passed.');
