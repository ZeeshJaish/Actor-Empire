import { strict as assert } from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GreenlightParticipationSection } from '../views/lifestyle/business/components/GreenlightParticipationSection';
import { GreenlightNegotiationModal } from '../views/lifestyle/business/components/GreenlightNegotiationModal';

const participants = [
    { key: 'ACTOR:lead_1:actor_alpha', talentId: 'actor_alpha', role: 'Lead actor', name: 'Actor Alpha', upfrontFee: 1_000_000, points: 0 },
    { key: 'DIRECTOR:director:director_alpha', talentId: 'director_alpha', role: 'Director', name: 'Director Alpha', upfrontFee: 2_000_000, points: 2 },
    { key: 'WRITER:script_writer:writer_npc_mira_sen', talentId: 'writer_npc_mira_sen', role: 'Writer', name: 'Mira Sen', upfrontFee: 500_000, points: 1 },
];
const markup = renderToStaticMarkup(<GreenlightParticipationSection
    participants={participants}
    totalPoints={3}
    onPointsChange={() => undefined}
    formatMoney={amount => `$${amount.toLocaleString('en-US')}`}
/>);
assert.match(markup, /Talent Participation/, 'The existing review must identify the optional contract section.');
assert.match(markup, /Actor Alpha/, 'The first-film lead must appear.');
assert.match(markup, /Mira Sen/, 'The credited writer must appear.');
assert.match(markup, /3 of 10/, 'The aggregate point cap must be visible.');
assert.match(markup, /studio-collected/, 'The future-receipts basis must be explained.');
assert.match(markup, /aria-label="Increase backend points for Actor Alpha"/, 'The increment action must be accessible.');
assert.match(markup, /aria-label="Decrease backend points for Director Alpha"/, 'The decrement action must be accessible.');
const negotiationMarkup = renderToStaticMarkup(<GreenlightNegotiationModal
    negotiation={{ talentId: 'actor_alpha', roleType: 'LEAD_ACTOR', roleId: 'lead_1', originalSalary: 10_000_000,
        currentDemand: 12_000_000, backendDemandPoints: 1, attemptsLeft: 3, talentName: 'Actor Alpha', talentImage: '', talentTier: 'ESTABLISHED' }}
    counterOfferInput="11000000"
    onCounterOfferInputChange={() => undefined}
    counterBackendPoints={0}
    onCounterBackendPointsChange={() => undefined}
    onAcceptDemand={() => undefined}
    onSubmitCounterOffer={() => undefined}
    onWalkAway={() => undefined}
    onClose={() => undefined}
    formatMoney={amount => `$${amount.toLocaleString('en-US')}`}
/>);
assert.match(negotiationMarkup, /1% backend/, 'A returning star’s backend demand must be visible.');
assert.match(negotiationMarkup, /Backend points in your counter-offer/, 'The player must be able to negotiate cash and points together.');
const zeroLegacySalaryMarkup = renderToStaticMarkup(<GreenlightNegotiationModal
    negotiation={{ talentId: 'legacy_actor', roleType: 'LEAD_ACTOR', originalSalary: 0,
        currentDemand: 100_000, backendDemandPoints: 0, attemptsLeft: 2, talentName: 'Legacy Actor', talentImage: '', talentTier: 'INDIE' }}
    counterOfferInput="50000"
    onCounterOfferInputChange={() => undefined}
    counterBackendPoints={0}
    onCounterBackendPointsChange={() => undefined}
    onAcceptDemand={() => undefined}
    onSubmitCounterOffer={() => undefined}
    onWalkAway={() => undefined}
    onClose={() => undefined}
    formatMoney={amount => `$${amount.toLocaleString('en-US')}`}
/>);
assert(!/Infinity|NaN/.test(zeroLegacySalaryMarkup), 'A legacy zero salary must not render invalid demand percentages.');
console.log('Greenlight participation UI audit: PASS');
