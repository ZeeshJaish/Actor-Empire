import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const files = {
    career: [
        read('views/CareerPage.tsx'),
        read('components/ui-overhaul/CareerScreen.tsx'),
        read('services/careerUiAdapter.ts'),
    ].join('\n'),
    home: read('views/HomePage.tsx'),
    messages: read('views/mobile/MessagesApp.tsx'),
    mobile: read('views/mobile/MobilePage.tsx'),
    app: read('App.tsx'),
    outside: read('services/outsideProductions.ts'),
    ownedCareer: read('services/ownedProductionCareer.ts'),
    types: read('types.ts'),
    npc: read('services/npcLogic.ts'),
    role: read('services/roleLogic.ts'),
    world: read('services/worldLogic.ts'),
    greenlight: [
        read('views/lifestyle/business/GreenlightWizard.tsx'),
        read('views/lifestyle/business/greenlightProjectBuilder.ts'),
    ].join('\n'),
    acquisitionDesk: read('views/mobile/components/StudioAcquisitionDesk.tsx'),
    localeEn: read('services/localization/locales/en.ts'),
    premium: read('services/premiumLogic.ts'),
    pkg: read('package.json'),
};

const checks = [
    [files.career, 'data-owned-production-card="compact"', 'compact owned production card marker'],
    [files.career, 'OWNED WORK', 'compact owned work badge'],
    [files.career, 'production.polish}/{production.polishMax', 'inline polish lift summary'],
    [files.career, 'production.phaseWeek}/{production.phaseWeeks', 'owned production phase window summary'],
    [files.career, 'track.tasks.map', 'compact track action rendering'],
    [files.career, 'grid-template-columns:repeat(2,minmax(0,1fr))', 'fixed compact action grid'],
    [files.career, 'NEED ${task.energy}E', 'owned action shortfall state'],
    [files.career, 'className="cr-track"', 'minimal track stack'],
    [files.career, 'label: action.shortLabel', 'owned production readable short action label'],
    [files.ownedCareer, 'OWNED_PRODUCTION_FOCUS_ENERGY_PER_WEEK = 25', 'owned production focus-week calculation baseline'],
    [files.ownedCareer, 'getOwnedProductionFocusLoadWeeks', 'owned production workload helper'],
    [files.ownedCareer, 'phaseDurationWeeks', 'owned production phase duration mirrors project timeline'],
    [files.ownedCareer, 'focusLoadWeeks', 'owned production focus load exposed to UI'],
    [files.npc, 'isCastableActor', 'central castable actor guard'],
    [files.role, 'isCastableActor(npc)', 'role cast list filters music artists'],
    [files.world, 'isCastableActor', 'world project lead guard'],
    [files.greenlight, 'isCastableActor(selectedNPC)', 'greenlight selected actor guard'],
    [files.greenlight, 'filter(isCastableActor)', 'greenlight available actors guard'],
    [files.messages, "selectedMessage.type === 'OFFER_MUSIC_VIDEO_FEATURE'", 'music feature message card'],
    [files.messages, 'Music Feature Signing Focus', 'music feature energy label'],
    [files.messages, 'Need ${collaborationSigningEnergyCost}E', 'music feature disabled energy state'],
    [files.mobile, "msg.type === 'OFFER_MUSIC_VIDEO_FEATURE'", 'music feature accept path'],
    [files.mobile, "hasEnergyFor(collaborationSigningEnergyCost, 'sign this music video feature')", 'music feature energy check'],
    [files.mobile, 'spendPlayerEnergy(updatedPlayer, collaborationSigningEnergyCost, `Music feature signing: ${offer.artistName}`)', 'music feature spends signing energy'],
    [files.outside, 'lastCounterFeedback', 'outside counter feedback kept on offer'],
    [files.types, 'counterAttempts?: number', 'outside counter attempts persisted'],
    [files.types, 'maxCounterAttempts?: number', 'outside counter attempt cap persisted'],
    [files.outside, 'OUTSIDE_PRODUCER_COUNTER_LIMIT = 3', 'outside counter three-attempt rule'],
    [files.outside, 'counterAttempts: nextCounterAttempts', 'outside counter increments attempts in place'],
    [files.outside, 'updateOutsideProducerOfferInInbox', 'outside counter updates inbox in place'],
    [files.outside, 'counterDeclinedLog', 'outside counter decline still logs'],
    [files.messages, 'outsideCounterFeedback', 'outside counter inline feedback state'],
    [files.messages, 'counterAttemptsLeft', 'outside counter remaining attempts UI'],
    [files.messages, 'Counter ${counterAttemptNumber}/3', 'outside counter attempt badge'],
    [files.messages, 'dealClosedByCounter', 'outside counter closed state locks actions'],
    [files.messages, 'setSelectedMessage(updated)', 'outside counter selected message refresh'],
    [files.messages, "action === 'COUNTER'", 'outside counter remains in detail flow'],
    [files.app, 'updatedCounterOffer?.counterClosed', 'outside counter toast checks persisted closed state'],
    [files.app, "counterClosed ? 'app.producerInvestment.counterClosedSubtext' : 'app.producerInvestment.counterDeclinedSubtext'", 'outside counter toast has separate declined and closed copy'],
    [files.outside, 'counterClosed: nextCounterAttempts >= maxCounterAttempts', 'outside counter closes only after third declined attempt'],
    [files.outside, 'counterClosedReason', 'outside counter stores terminal reason'],
    [files.types, 'counterClosed?: boolean', 'outside counter closed flag persisted'],
    [files.types, 'counterClosedReason?: string', 'outside counter closed reason persisted'],
    [files.localeEn, 'They did not accept these terms. Adjust the offer or pass.', 'normal counter decline copy stays open'],
    [files.localeEn, 'They walked away after the third declined counter.', 'closed counter copy only for terminal state'],
    [files.outside, 'Sable Meridian Capital', 'fraud-risk firms use legitimate names'],
    [files.acquisitionDesk, 'Final signing used 25E', 'acquisition signed energy confirmation'],
    [files.acquisitionDesk, 'onImmersiveChange?.(true)', 'entire acquisition desk uses immersive viewport'],
    [files.acquisitionDesk, 'Operating model saved', 'acquisition operating model save feedback'],
    [files.acquisitionDesk, 'Choose next studio action', 'acquisition post-model next action cue'],
    [files.premium, 'weeklyEnergySpendLog', 'weekly energy spend ledger persisted in flags'],
    [files.premium, 'getWeeklyEnergySpendLog', 'weekly energy spend ledger selector'],
    [files.premium, 'recordWeeklyEnergySpend', 'central energy spend recorder'],
    [files.premium, "player.flags.weeklyEnergySpendLog = []", 'weekly energy spend ledger resets each week'],
    [files.premium, 'label = \'Energy use\'', 'energy spend helper keeps fallback label'],
    [files.home, 'showEnergySpendSheet', 'home energy spend sheet state'],
    [files.home, 'getWeeklyEnergySpendLog(player)', 'home reads weekly energy spend ledger'],
    [files.home, 'onClick={() => setShowEnergySpendSheet(true)}', 'home energy card opens spend sheet'],
    [files.home, 'Expense Log', 'energy spend sheet title'],
    [files.home, 'Spent', 'energy spend summary spent label'],
    [files.home, 'Reserved', 'energy spend summary reserved label'],
    [files.home, 'Available', 'energy spend summary available label'],
    [files.pkg, 'audit:energy-feature-fix-polish', 'package script for this audit'],
];

const forbidden = [
    [files.career, 'Polish Lift', 'bulky polish lift metric card label'],
    [files.career, 'Focus load', 'confusing owned production focus load copy'],
    [files.career, 'grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3', 'bulky owned production track grid'],
    [files.career, '<span className="truncate">{action.label}</span>', 'owned production truncated action labels'],
    [files.acquisitionDesk, 'Signing Focus 25E spent', 'illogical acquisition energy copy'],
    [files.acquisitionDesk, 'onImmersiveChange?.(signingRoomVisible)', 'signing-room-only immersive mode'],
    [files.acquisitionDesk, "Acquisition Desk · {tr('studioAcquisitionDesk.title')}", 'duplicate acquisition desk header label'],
    [files.outside, 'inbox: (player.inbox || []).filter(message => message.id !== offer.id)', 'counter decline deleting inbox message'],
    [files.outside, 'Spam Forge', 'obvious spam producer name'],
    [files.outside, 'Mirage Receipts', 'obvious spam producer name'],
    [files.outside, 'Offshore Slate', 'obvious spam producer name'],
    [files.messages, '              offer,\n              action,', 'nested stale outside investment offer payload'],
    [files.app, 'msg.data?.offer || msg.data', 'stale nested outside investment offer fallback'],
    [files.localeEn, "'app.producerInvestment.counterDeclinedSubtext': 'They walked away from the deal.'", 'premature walked-away counter decline toast'],
];

const missing = checks.filter(([source, needle]) => !source.includes(needle));
const presentForbidden = forbidden.filter(([source, needle]) => source.includes(needle));

if (missing.length > 0 || presentForbidden.length > 0) {
    console.error('Energy feature fix polish audit failed:');
    for (const [, needle, label] of missing) {
        console.error(`- Missing ${label}: ${needle}`);
    }
    for (const [, needle, label] of presentForbidden) {
        console.error(`- Still has ${label}: ${needle}`);
    }
    process.exit(1);
}

console.log('Energy feature fix polish audit passed.');
