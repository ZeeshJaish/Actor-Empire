// @ts-nocheck - executable C6 uncertainty/copy fixture.
import assert from 'node:assert/strict';
import { renderIndustryMediaClaimCopy } from '../services/industryWorld';

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
        assert.ok(copy.knownEvidence.startsWith('Confirmed context:'));
        assert.doesNotMatch(copy.summary, /has signed|has acquired|will definitely|confirmed that/i);
        assert.doesNotMatch(`${copy.headline} ${copy.summary}`, /undefined|null|NaN/);
    }
}

console.log('Industry media C6 claim copy audit passed.');
