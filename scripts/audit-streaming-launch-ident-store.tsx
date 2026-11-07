/**
 * #112 Define the Launch: Ident and Store; the ident charged at launch and refunded when switched before it (plan §18.11;
 * §18.2 9: "A paid ident kit is charged the moment it is tapped, though its copy says 'payable at launch', and switching
 * refunds nothing"; Zeesh, 2026-11-01: "काफ़ी ख़राब बटन्स" … "थोड़ा गेम वाला भी फील"):
 *  - choosing a kit charges nothing; it owes its price at launch, which the Opening Programme commission pays (once);
 *  - a kit already paid for (a save from before #112) is refunded when another replaces it before launch; after the
 *    commission a new kit is paid as it is chosen and the one it replaces refunded;
 *  - the ident milestone counts a chosen kit before the commission;
 *  - the Ident step: kits as item cards (the one in use EQUIPPED, one paid for PAID), a receipt that says what is due and
 *    when, Play again as a key; the Store step: the layout in use ticked, its state lit.
 * (~2 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import {
    chargeStreamingIdentAtLaunch, getStreamingIdentDueAtLaunch, getStreamingIdentPurchaseView, getStreamingLaunchProgramView,
    saveStreamingServiceIdent,
} from '../services/streamingLaunchProgram';
import type { LaunchData, LaunchDraft } from '../components/studio-finance/finance/launch';
import type { StepProps } from '../components/studio-finance/components/launch/LaunchWizard';
import { StepIdent } from '../components/studio-finance/components/launch/StepIdent';
import { shellData, shellDraft } from './fixtures/streaming-launch-shell-data';

/* ── a founded company with $30M ── */
const founded = (): Player => {
    const base: Player = {
        ...structuredClone(INITIAL_PLAYER), id: 'ident-at-launch', name: 'Ident Audit', money: 200_000_000,
        ownedStreamingPlatform: {
            ...structuredClone(INITIAL_PLAYER.ownedStreamingPlatform), lifecycle: 'ELIGIBLE',
            simulationSeed: 'owned-streaming:ident-at-launch', milestoneKeys: ['streaming-launch-clearance'],
        },
    };
    const incorporated = incorporateOwnedStreamingPlatform(saveStreamingFoundingDraft(base, { ...createDefaultStreamingFoundingDraft(100), currentStep: 2, name: 'Ident House+' })).player;
    return { ...incorporated, ownedStreamingPlatform: { ...incorporated.ownedStreamingPlatform, treasuryCash: 30_000_000 } };
};
const cash = (player: Player) => player.ownedStreamingPlatform.treasuryCash;
const company = founded();

/* ── chosen free, owed at launch, paid once at the commission ── */
const full = saveStreamingServiceIdent(company, { soundIdentKey: 'PULSE', identPackageId: 'FULL' });
assert.ok(full.changed && cash(full.player) === 30_000_000, 'Choosing The whole kit charges nothing');
assert.equal(getStreamingIdentDueAtLaunch(full.player), 4_500_000, 'It owes $4.5M at launch');
assert.ok(getStreamingLaunchProgramView(full.player).milestones.find(item => item.id === 'SERVICE_IDENT')?.complete, 'and completes the ident before launch');
const cinematic = saveStreamingServiceIdent(full.player, { soundIdentKey: 'PREMIERE', identPackageId: 'CINEMATIC' });
assert.ok(cinematic.changed && cash(cinematic.player) === 30_000_000 && getStreamingIdentDueAtLaunch(cinematic.player) === 6_500_000, 'Switching before launch is free');
const paid = chargeStreamingIdentAtLaunch(cinematic.player);
assert.equal(paid.charged, 6_500_000);
assert.equal(cash(paid.player), 23_500_000, 'The commission pays the kit in use');
assert.equal(chargeStreamingIdentAtLaunch(paid.player).charged, 0, 'once');
assert.equal(getStreamingIdentDueAtLaunch(paid.player), 0);
console.log('PASS at launch: a kit is chosen free, owes its price at launch, and the commission pays it once');

/* ── refunded when switched before launch ── */
const refunded = saveStreamingServiceIdent(paid.player, { soundIdentKey: 'PULSE', identPackageId: 'STANDARD' });
assert.ok(refunded.changed && cash(refunded.player) === 30_000_000, 'A paid kit replaced before launch is refunded in full');
assert.ok(refunded.player.ownedStreamingPlatform.costCommitments.some(item => item.status === 'REFUNDED' && item.paidAmount === 6_500_000), 'its receipt marked refunded');
assert.ok(!getStreamingIdentPurchaseView(refunded.player).purchasedPackageIds.includes('CINEMATIC'));
assert.ok(refunded.player.ownedStreamingPlatform.eventLedger.some(entry => /refunded/.test(entry.summary)), 'and the ledger says so');
const commissioned: Player = { ...paid.player, ownedStreamingPlatform: { ...paid.player.ownedStreamingPlatform, openingProgrammeCommission: {
    id: 'commission', idempotencyKey: 'commission', committedAtAbsoluteWeek: 1, launchDefinitionSignature: 'd', infrastructureConfigurationSignature: 'i',
    rehearsalSignature: 'r', openingCountryIds: ['US'], marketingForecastSignature: 'm', infrastructureDueNow: 0, marketFilingDueNow: 0,
    marketingReservation: 0, totalCashRequired: 0, revision: 1,
} } };
const afterCommission = saveStreamingServiceIdent(commissioned, { soundIdentKey: 'PULSE', identPackageId: 'FULL' });
assert.ok(afterCommission.changed && cash(afterCommission.player) === 23_500_000 + 6_500_000 - 4_500_000,
    'After the commission a new kit is paid as it is chosen, and the one it replaces refunded');
const program = readFileSync(resolve(process.cwd(), 'services/streamingLaunchProgram.ts'), 'utf8');
assert.ok(/const identRefundsOnSwitch = [\s\S]*?if \(platform\.launchCommit\) return \[\];/.test(program), 'After launch nothing is refunded');
const source = readFileSync(resolve(process.cwd(), 'services/streamingOpeningProgramme.ts'), 'utf8');
assert.ok(source.includes('totalCashRequired: forecast.transactionCost + marketFilingDueNow + marketingReservation + identDueNow')
    && source.includes('candidate = chargeStreamingIdentAtLaunch(candidate).player;'), 'The commission quote counts the ident and the commission pays it');
console.log('PASS refunds: a paid kit replaced before launch comes back in full (receipt REFUNDED, a ledger line); after the commission a new kit is paid as chosen');

/* ── the Ident step ── */
const props = (data: Partial<LaunchData>, draft: Partial<LaunchDraft>): StepProps => {
    const base = shellData('fresh');
    const full = { ...base, ...data, identPackages: [
        { id: 'sting', name: 'Just the ident', cost: 0, included: true, frames: ['Ident'], description: 'A logo and a sound.' },
        { id: 'full', name: 'The whole kit', cost: 4_500_000, included: false, frames: ['Ident', 'End'], description: 'Six surfaces.' },
        { id: 'cinematic', name: 'Cinematic ident', cost: 6_500_000, included: false, frames: ['Ident', 'End'], description: 'Light and depth.' },
    ] } as LaunchData;
    return { data: full, draft: { ...shellDraft('fresh'), ...draft }, patch: () => undefined, chosen: [], treasury: full.treasury, free: 100_000_000, gap: 0, handlers: {} };
};
const due = renderToStaticMarkup(createElement(StepIdent, props({ ident: { soundId: 'pulse', packageId: 'full', commissioned: true, committedCost: 0, purchasedPackageIds: ['sting'] } as never }, { packageId: 'full' })));
assert.match(due, /aria-label="The whole kit" aria-pressed="true" class="id-kit is-on"><b>The whole kit<\/b><em>\$4\.5M<\/em>[\s\S]*?<i class="id-kit-tag">Equipped<\/i>/, 'The kit in use: lit, EQUIPPED, its price in the card');
assert.match(due, /<p class="id-commissioned" role="status"><b>The whole kit<\/b><span>\$4\.5M in the launch plan, payable at launch<\/span><\/p>/, 'The receipt: due at launch');
assert.match(due, /class="id-replay"><svg[\s\S]*?<\/svg>Play again<\/button>/, 'Play again is a key');
const paidUi = renderToStaticMarkup(createElement(StepIdent, props({ ident: { soundId: 'pulse', packageId: 'cinematic', commissioned: true, committedCost: 6_500_000, purchasedPackageIds: ['sting', 'cinematic', 'full'] } as never }, { packageId: 'cinematic' })));
assert.match(paidUi, /<span>Paid \$6\.5M · switching before launch refunds it<\/span>/, 'A kit paid for says a switch refunds it');
assert.match(paidUi, /aria-label="The whole kit" aria-pressed="false" class="id-kit is-purchased"><b>The whole kit<\/b><em>\$4\.5M<\/em>[\s\S]*?<i class="id-kit-tag is-paid">Paid<\/i>/, 'another kit paid for: PAID');
assert.doesNotMatch(due + paidUi, /· Bought/, 'No "· Bought"');
assert.match(renderToStaticMarkup(createElement(StepIdent, props({}, { packageId: 'sting' }))), /<span>Included at no cost<\/span>/);
console.log('PASS ident step: item cards (EQUIPPED, PAID), the receipt (payable at launch / paid, a switch refunds it / included), Play again a key');

/* ── the Store step's look ── */
const css = readFileSync(resolve(process.cwd(), 'components/studio-finance/styles/launch.css'), 'utf8');
assert.match(css, /\.sf \.st-layout-pick\.is-applied::after \{\s*content: '✓';/, 'The layout in use is ticked');
assert.match(css, /\.st-preview-state\.is-applied \{[^}]*box-shadow/, 'its state lit');
assert.match(css, /\.id-kit-tag \{/);
console.log('PASS store step: the layout in use ticked, its state lit');
console.log('done');
