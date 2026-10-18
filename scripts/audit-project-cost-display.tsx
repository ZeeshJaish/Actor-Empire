import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER } from '../types';
import { t } from '../services/i18n';
import { ProjectDashboardModal } from '../views/lifestyle/business/components/ProjectDashboardModal';
import { GreenlightHeader } from '../views/lifestyle/business/components/GreenlightHeader';
import { GreenlightMarketingBudgetSection } from '../views/lifestyle/business/components/GreenlightMarketingBudgetSection';
import { getProjectCostSummary } from '../services/projectCostPresentation';
import { migratePlayerSave } from '../services/saveMigration';

const player = structuredClone(INITIAL_PLAYER);
const tr = (key: string) => t('en', key);
const money = (value: number) => `$${(value / 1_000_000).toFixed(1)}M`;
const project = { id: 'cost-display', name: 'Cost Display', phase: 'PRE-PRODUCTION',
    projectDetails: { title: 'Cost Display', type: 'MOVIE', genre: 'DRAMA', estimatedBudget: 342_600_000,
        reservedMarketingBudget: 157_400_000, hiddenStats: { greenlightPackageBudget: 500_000_000 } } };
const dashboard = (value: any) => renderToStaticMarkup(<ProjectDashboardModal project={value} player={player}
    studio={{ studioState: { scripts: [] } } as any} onClose={() => {}} onUpdatePlayer={() => {}} />);
let failures = 0;
const check = (name: string, run: () => void) => {
    try { run(); console.log('PASS', name); }
    catch (error) { failures++; console.error('FAIL', name, String(error)); }
};
check('planning label identifies the total including reserved marketing', () => {
    const html = renderToStaticMarkup(<GreenlightHeader step="CONFIRM" selectedScriptId="script" onBack={() => {}}
        onStepChange={() => {}} currentEstimatedBuzz={40} currentEstimatedQuality={80}
        budgetBreakdown={{ baseCost: 5_000_000, scriptCost: 0, equipmentCost: 0 }} musicBudget={0}
        reservedMarketingBudget={157_400_000} packageBudget={500_000_000} availableFunding={1_000_000_000}
        formatMoney={money} translate={tr} />);
    assert.match(html, /Total Project Budget/);
    assert.match(html, /\$500\.0M/);
});
check('dashboard exposes an interactive total rather than silently dropping the campaign reserve', () => {
    const before = structuredClone(project);
    const html = dashboard(project);
    assert.match(html, /Total Project Budget/);
    assert.match(html, /\$500\.0M/);
    assert.match(html, /aria-expanded="false"/);
    assert.deepEqual(project, before);
});
check('old projects without marketing history identify an incomplete recorded total', () => {
    const html = dashboard({ ...project, projectDetails: { estimatedBudget: 300_000_000 } });
    assert.match(html, /Recorded Total/);
    assert.match(html, /Not recorded/);
});
check('custom marketing exposes a bounded numeric keypad control', () => {
    const html = renderToStaticMarkup(<GreenlightMarketingBudgetSection marketingBudgetPreset="CUSTOM"
        reservedMarketingBudget={157_400_000} productionBudget={342_600_000} maxMarketingBudget={800_000_000}
        onPresetChange={() => {}} onReservedBudgetChange={() => {}} formatMoney={money} translate={tr} />);
    assert.match(html, /inputmode="numeric"/i);
    assert.match(html, /type="number"/);
    assert.match(html, /max="800000000"/);
});
for (const [name, value, expected] of [
    ['reserved marketing stays in the planned total', project,
        { production: 342_600_000, marketing: 157_400_000, marketingKind: 'RESERVED', returned: 0, total: 500_000_000 }],
    ['returned reserve is excluded after campaign lock', { ...project, projectDetails: { ...project.projectDetails,
        releaseStrategy: 'THEATRICAL', marketingBudgetSpent: 100_000_000, returnedMarketingBudget: 57_400_000 } },
        { production: 342_600_000, marketing: 100_000_000, marketingKind: 'SPENT', returned: 57_400_000, total: 442_600_000 }],
    ['root-level archived campaign history is not lost to default nested zeros', { budget: 300_000_000, phase: 'RELEASED',
        totalCampaignSpend: 12_345_678, projectDetails: { estimatedBudget: 300_000_000, marketingBudgetSpent: 0 } },
        { production: 300_000_000, marketing: 12_345_678, marketingKind: 'SPENT', returned: 0, total: 312_345_678 }],
    ['legacy default zeros do not invent a free campaign', { budget: 300_000_000, phase: 'RELEASED',
        projectDetails: { reservedMarketingBudget: 0, marketingBudgetSpent: 0, returnedMarketingBudget: 0, totalCampaignSpend: 0 } },
        { production: 300_000_000, marketing: null, marketingKind: 'SPENT', returned: 0, total: 300_000_000 }],
    ['a legacy reserve without a settlement record does not prove zero spend', { budget: 300_000_000, phase: 'RELEASED',
        projectDetails: { reservedMarketingBudget: 50_000_000, marketingBudgetSpent: 0, totalCampaignSpend: 0 } },
        { production: 300_000_000, marketing: null, marketingKind: 'SPENT', returned: 0, total: 300_000_000 }],
    ['a known zero campaign remains zero', { ...project, projectDetails: { estimatedBudget: 300_000_000,
        reservedMarketingBudget: 0, hiddenStats: { greenlightPackageBudget: 300_000_000 } } },
        { production: 300_000_000, marketing: 0, marketingKind: 'RESERVED', returned: 0, total: 300_000_000 }],
    ['NaN and infinite presentation fields cannot leak into totals', { budget: 300_000_000,
        projectDetails: { estimatedBudget: NaN, reservedMarketingBudget: Infinity } },
        { production: 300_000_000, marketing: null, marketingKind: 'RESERVED', returned: 0, total: 300_000_000 }],
] as const) {
    check(name, () => {
        const before = structuredClone(value);
        assert.deepEqual(getProjectCostSummary(value), expected);
        assert.deepEqual(value, before, 'Presentation must not mutate saved project fields');
    });
}
check('legacy migration and repeated display leave cash and campaign history untouched', () => {
    const p = structuredClone(INITIAL_PLAYER);
    p.commitments = [{ id: 'legacy-cost', name: 'Legacy Cost', projectPhase: 'PRE_PRODUCTION',
        projectDetails: { estimatedBudget: 300_000_000, title: 'Legacy Cost' } } as any];
    const loaded = migratePlayerSave(p);
    const before = structuredClone(loaded);
    assert.equal(getProjectCostSummary(loaded.commitments[0]).marketing, null);
    getProjectCostSummary(loaded.commitments[0]);
    assert.deepEqual(loaded, before);
    const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(loaded)));
    assert.equal(reloaded.money, loaded.money);
    assert.equal(getProjectCostSummary(reloaded.commitments[0]).marketing, null);
});
assert.equal(failures, 0, `${failures} project cost display checks failed`);
console.log('Project cost display audit passed (12 checks).');
