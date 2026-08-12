import fs from 'node:fs';

const positionSource = fs.readFileSync('views/mobile/components/ForbesCompanyPosition.tsx', 'utf8');
const profileSource = fs.readFileSync('views/mobile/components/ForbesStudioProfile.tsx', 'utf8');
const appSource = fs.readFileSync('views/mobile/ForbesApp.tsx', 'utf8');
const mobilePageSource = fs.readFileSync('views/mobile/MobilePage.tsx', 'utf8');
const loopSource = fs.readFileSync('services/gameLoop.ts', 'utf8');
const migrationSource = fs.readFileSync('services/saveMigration.ts', 'utf8');
const homeSource = fs.readFileSync('views/HomePage.tsx', 'utf8');
const studioOwnershipQaSource = fs.readFileSync('views/home/homeStudioOwnershipQaActions.ts', 'utf8');
const homeQaSource = `${homeSource}\n${studioOwnershipQaSource}`;

const checks = [
    ['Compact position-dossier entry point', positionSource.includes('Open Position Dossier') && positionSource.includes('Review Buyer Offer')],
    ['Value, return, and quarterly context', positionSource.includes('Position Value') && positionSource.includes('Total Return') && positionSource.includes('Last Quarter')],
    ['Private ownership strategy explanation', positionSource.includes('Value can rise without a regular payout')],
    ['Private ownership headline is player-facing', positionSource.includes('YOU OWN {formatOwnershipPercent(position.negotiatedPercent)}')],
    ['Custom private-sale amount controls', positionSource.includes('Choose how much to sell') && positionSource.includes('type="range"') && positionSource.includes('Start Buyer Search')],
    ['Private-market friction is disclosed', positionSource.includes('2–5 weeks') && positionSource.includes('8–22% below')],
    ['Buyer terms are readable and clear', positionSource.includes('Final cash is set after buyer review.') && positionSource.includes('Estimated buyer value')],
    ['Percentage control keeps the value and symbol together', positionSource.includes('value={salePercent.toFixed(1)}') && positionSource.includes('w-[5.75rem]') && positionSource.includes('webkit-inner-spin-button')],
    ['Offer details disclose discount and fees', positionSource.includes('Illiquidity Cut') && positionSource.includes('Advisory Fee')],
    ['Accessible modal status and labels', positionSource.includes('aria-modal=\"true\"') && positionSource.includes('aria-live=\"polite\"')],
    ['Position dossier stays inside the visual phone', positionSource.includes('absolute inset-0 z-[100] flex flex-col overflow-hidden') && !positionSource.includes('z-[9999]')],
    ['Position dossier is independently scrollable and safe-area padded', positionSource.includes('flex-1 overflow-y-auto overscroll-contain') && positionSource.includes('env(safe-area-inset-bottom)')],
    ['Forbes profile wires all exit actions', profileSource.includes('onRequestPrivateExit') && profileSource.includes('onAcceptPrivateExit') && profileSource.includes('onDeclinePrivateExit')],
    ['Forbes app persists private exit actions', appSource.includes('requestPrivateEquityExit') && appSource.includes('acceptPrivateEquityExit') && appSource.includes('declinePrivateEquityExit')],
    ['Private dossier keeps global navigation available', !mobilePageSource.includes('isPrivatePositionOpen')],
    ['Forbes profile remains inside the visual phone', !appSource.includes('onImmersiveChange?.(Boolean(selectedStudioProfile))')],
    ['Weekly loop processes distributions and offers', loopSource.includes('processPrivateEquityWeek') && loopSource.includes('Private distribution:')],
    ['Save migration normalizes old stakes', migrationSource.includes('normalizeCompanyEquityPositions') && migrationSource.includes('SAVE_MIGRATION_VERSION = 27')],
    ['Cheat menu seeds a mature private stake', homeQaSource.includes("triggerPrivateEquityQa('MATURE_STAKE')") && homeQaSource.includes('15% Private Stake')],
    ['Cheat menu can jump directly to a buyer offer', homeQaSource.includes("triggerPrivateEquityQa('BUYER_OFFER')") && homeQaSource.includes('Buyer Offer Ready')],
    ['Private equity QA preserves unrelated positions', homeQaSource.includes("position?.studioId !== targetStudio.id") && homeQaSource.includes('privateEquityQaStudioId')],
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length > 0) {
    console.error('Private equity UI audit failed:');
    failures.forEach(([name]) => console.error(`- ${name}`));
    process.exit(1);
}

console.log(`Private equity UI audit passed (${checks.length} checks).`);
