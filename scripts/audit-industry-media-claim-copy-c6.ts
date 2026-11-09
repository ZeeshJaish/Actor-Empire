// @ts-nocheck - executable C6 uncertainty/copy fixture.
import assert from 'node:assert/strict';
import { CLAIM_EVIDENCE_LEADS, renderIndustryMediaClaimCopy } from '../services/industryWorld';

const categories = [
    'CASTING', 'PROJECT_STATUS', 'PLATFORM_DESTINATION', 'RELEASE_WINDOW',
    'FRANCHISE_DIRECTION', 'AWARDS', 'COMPANY_MOVE', 'PROJECT_OUTCOME',
];

for (const category of categories) {
    for (const kind of ['RUMOUR', 'LEAK', 'PREDICTION']) {
        const copy = renderIndustryMediaClaimCopy({
            kind,
            category,
            subjectName: 'Night Signal',
            sourceName: 'The Screen Ledger',
            targetName: category === 'PLATFORM_DESTINATION' ? 'Netflix' : 'the next major step',
            evidenceSummary: 'The project has a confirmed public development record.',
        });
        assert.ok(copy.headline.length > 8);
        assert.match(copy.summary, /reportedly|believed|may|could|prediction|unconfirmed|understood/i);
        assert.ok(CLAIM_EVIDENCE_LEADS.some(lead => copy.knownEvidence.startsWith(lead)));
        assert.doesNotMatch(copy.summary, /has signed|has acquired|will definitely|confirmed that/i);
        assert.doesNotMatch(`${copy.headline} ${copy.summary}`, /undefined|null|NaN/);
    }
}

/* 2026-11-09: the same kind of claim must not read the same every time (Zeesh: "ek hi title baar baar repeat"),
   while every version stays hedged and the same claim always reads the same */
for (const category of categories) {
    for (const kind of ['RUMOUR', 'LEAK', 'PREDICTION']) {
        const headlines = new Set();
        const summaries = new Set();
        for (let index = 0; index < 40; index += 1) {
            const input = {
                kind, category, subjectName: `Film ${index}`, sourceName: 'Mina Park', seed: `claim-${index}`,
                targetName: category === 'PROJECT_OUTCOME' ? 'hit' : 'the next major step',
                evidenceSummary: 'The project has a confirmed public development record.',
            };
            const copy = renderIndustryMediaClaimCopy(input);
            assert.deepEqual(renderIndustryMediaClaimCopy(input), copy, 'the same claim reads the same');
            assert.match(copy.summary, /reportedly|believed|may|could|prediction|unconfirmed|understood/i, `${kind} ${category}: ${copy.summary}`);
            assert.doesNotMatch(copy.summary, /has signed|has acquired|will definitely|confirmed that/i);
            assert.doesNotMatch(`${copy.headline} ${copy.summary} ${copy.interpretation}`, /undefined|null|NaN|\{|\}/);
            headlines.add(copy.headline.replace(/Film \d+/g, 'X'));
            summaries.add(copy.summary.replace(/Film \d+/g, 'X'));
        }
        assert.ok(headlines.size >= 8, `${kind} ${category}: only ${headlines.size} headline shapes`);
        assert.ok(summaries.size >= 12, `${kind} ${category}: only ${summaries.size} summary shapes`);
    }
}

console.log('Industry media C6 claim copy audit passed.');
