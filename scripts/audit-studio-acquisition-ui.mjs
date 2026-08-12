import fs from 'node:fs';

const source = fs.readFileSync(new URL('../views/mobile/components/StudioAcquisitionDesk.tsx', import.meta.url), 'utf8');
const dealRoomSource = fs.readFileSync(new URL('../views/mobile/components/StudioAcquisitionDealRoom.tsx', import.meta.url), 'utf8');
const logicSource = fs.readFileSync(new URL('../services/studioAcquisition.ts', import.meta.url), 'utf8');
const homePageSource = fs.readFileSync(new URL('../views/HomePage.tsx', import.meta.url), 'utf8');
const studioOwnershipQaSource = fs.readFileSync(new URL('../views/home/homeStudioOwnershipQaActions.ts', import.meta.url), 'utf8');
const mobilePageSource = fs.readFileSync(new URL('../views/mobile/MobilePage.tsx', import.meta.url), 'utf8');
const forbesAppSource = fs.readFileSync(new URL('../views/mobile/ForbesApp.tsx', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const messagesSource = fs.readFileSync(new URL('../views/mobile/MessagesApp.tsx', import.meta.url), 'utf8');
const englishLocaleSource = fs.readFileSync(new URL('../services/localization/locales/en.ts', import.meta.url), 'utf8');
const combinedSource = `${source}\n${dealRoomSource}\n${logicSource}\n${homePageSource}\n${studioOwnershipQaSource}\n${mobilePageSource}\n${forbesAppSource}\n${messagesSource}\n${appSource}\n${englishLocaleSource}`;

const checks = [
    ['Acquisition Desk', 'the acquisition command header'],
    ['Make Offer Now', 'the direct-offer path'],
    ['Run Due Diligence', 'the optional diligence path'],
    ['Unknown Liabilities', 'the public-information risk warning'],
    ['Full Acquisition', 'the full acquisition structure'],
    ['Minority Stake', 'the minority stake structure'],
    ['Exact Offer', 'the custom amount control'],
    ['Quick Fill', 'compact preset guidance'],
    ['Conservative', 'the conservative quick fill'],
    ['Fair', 'the fair quick fill'],
    ['Aggressive', 'the aggressive quick fill'],
    ['Seller Posture', 'the live seller response guidance'],
    ['Deal Promises', 'the acquisition commitment section'],
    ['Preserve Studio Name', 'the studio-name preservation commitment'],
    ['Protect Employees', 'the employee protection commitment'],
    ['Guarantee Productions', 'the future-production commitment'],
    ['Promises Attached', 'the selected commitment summary'],
    ['Implied Company Value', 'the minority implied valuation'],
    ['Combined Ownership', 'the combined minority stake'],
    ['offerAmount', 'the custom amount submission'],
    ['analyzeCustomOffer', 'the custom offer analysis'],
    ['Personal Wealth', 'the personal funding option'],
    ['Studio Capital', 'the studio funding treatment'],
    ['Compliance Risk', 'the compliance preview'],
    ['Submit Opening Offer', 'the final offer action'],
    ['onRunDiligence', 'the diligence callback'],
    ['onSubmitOffer', 'the offer callback'],
    ['option.affordable', 'funding affordability state'],
    ['OFFER_SUBMITTED', 'the completed offer state'],
    ['TERMS AGREED', 'the accepted seller response state'],
    ['SELLER COUNTER', 'the counteroffer response state'],
    ['BIDDING WAR', 'the rival bidding response state'],
    ['Rival At The Table', 'the rival bidding hero copy'],
    ['Beat Rival', 'the rival beat action'],
    ['Custom Bid', 'the rival custom bid action'],
    ['Round', 'the limited bidding round label'],
    ['OFFER DECLINED', 'the rejected seller response state'],
    ['Accept Counter', 'the counter acceptance action'],
    ['Revise Offer', 'the revised offer action'],
    ['Walk Away', 'the negotiation exit action'],
    ['onAcceptCounter', 'the counter acceptance callback'],
    ['onReviseOffer', 'the revised offer callback'],
    ['onWalkAway', 'the walk-away callback'],
    ['onBeatRival', 'the rival bid callback'],
    ['Final Deal Review', 'the accepted-deal closing review'],
    ['Assets + Liabilities', 'the final balance-sheet review'],
    ['Document Signing', 'the cinematic signing section'],
    ['Sign & Acquire Studio', 'the final signing action'],
    ['DEAL SIGNED', 'the completed acquisition visual state'],
    ['onCompleteAcquisition', 'the final signing callback'],
    ['Closing Table', 'the interactive closing table'],
    ['Purchase Agreement', 'the purchase agreement review card'],
    ['Ownership Transfer', 'the ownership transfer review card'],
    ['Binding Clauses', 'the signed commitment clauses'],
    ['Tap To Sign Transfer', 'the tap-to-sign control'],
    ['Deal Status', 'the reusable acquisition blocker prompt'],
    ['showAcquisitionRequirement', 'the modal blocker feedback path'],
    ['Requirement Check', 'the visible pre-signing requirements summary'],
    ['signingRequirementChecks', 'the money/energy/terms requirement model'],
    ['hasSigningFunding', 'the accepted-deal funding availability check'],
    ['Short by', 'the exact funding-shortfall amount copy'],
    ['Funding shortfall', 'the explicit closing-funds blocker'],
    ['Current energy:', 'the explicit energy requirement detail'],
    ['Control transferring', 'the signing progress feedback'],
    ['reviewedClosingSteps', 'the closing document review state'],
    ['onClick={signAcquisition}', 'the direct tap signing binding'],
    ['Sign transfer on signature line', 'the interactive signature-line signing binding'],
    ['playerAlreadyOwnsStudio', 'the completed acquisition state guard'],
    ['Open Studio Profile', 'the post-signing action'],
    ['Develop From Catalog', 'the post-signing development prompt'],
    ['Signing Room', 'the immersive desk-room signing scene'],
    ['Executive Desk', 'the desk-room table surface'],
    ['Terms & Conditions', 'the paper contract terms'],
    ['Signature Line', 'the contract signature line'],
    ['APPROVED FOR TRANSFER', 'the contract approval stamp'],
    ['Seal Contract', 'the final paper sealing instruction'],
    ['signingRoomOpen', 'the signing-room scene state'],
    ['openSigningRoom', 'the signing-room entry action'],
    ['isSigningAcquisition', 'the duplicate signing guard'],
    ['setSigningRoomOpen(true)', 'the signing-room open transition'],
    ['acceptedContractMode', 'accepted terms should render directly as the contract scene'],
    ['signingRoomVisible', 'accepted terms should show the signing room without an intermediate card'],
    ['canSignContract', 'accepted contract mode should allow direct signing from the paper'],
    ['Deal Room Closing', 'the premium deal-room closing title'],
    ['Contract Stack', 'the paged contract stack'],
    ['contractPage', 'the responsive contract page state'],
    ['contractPages', 'the paged contract data model'],
    ['Next Clause', 'the page advance action'],
    ['Signature Tray', 'the sticky signature tray'],
    ['Review Packet', 'the compact contract review control'],
    ['TRANSFER APPROVED', 'the final dopamine transfer stamp'],
    ['Responsive Packet Scroll', 'the scroll-safe packet body'],
    ['overflow-y-auto', 'the contract body should scroll instead of clipping'],
    ['safe-area-inset-bottom', 'the signing room should use screen safe-area spacing instead of phone-nav spacing'],
    ['max-w-6xl', 'the signing-room closing table should use the wider full-screen space'],
    ['Bond Paper', 'the legal bond-paper contract surface'],
    ['Legal Folio', 'the formal legal-folio document label'],
    ['Responsive Packet Scroll', 'the document fiber texture layer'],
    ['Live Stamp', 'the legal seal affordance'],
    ['Live Stamp', 'the live stamp device feedback'],
    ['Ink Signature', 'the ink-signing signature affordance'],
    ['Notary Stamp', 'the notary stamp cue'],
    ['triggerStudioAcquisitionSigningCheat', 'the dev shortcut into accepted studio-acquisition signing'],
    ['Studio Acquisition Signing QA', 'the visible cheat-menu signing trigger'],
    ['onOpenStudioAcquisitionCheat', 'the app-level Forbes studio deep-link callback'],
    ['initialForbesStudioId', 'the mobile Forbes deep-link target'],
    ['Fixed Acquisition Viewport', 'the acquisition desk should break out of the phone frame'],
    ['Cinematic Acquisition Screen', 'the full-screen acquisition atmosphere'],
    ['Deal Room Viewport', 'the full-screen deal-room layout shell'],
    ['max-w-6xl', 'the wide acquisition layout should use available space'],
    ['Mahogany Closing Table', 'the immersive closing-table scene'],
    ['Brass Lamp', 'the desk-room lighting prop'],
    ['Signature Line', 'the pen interaction prop'],
    ['Stamp Strike', 'the live stamping prop'],
    ['Seal Contract', 'the final seal prop'],
    ['Transfer Vault', 'the board witness scene rail'],
    ['onNavVisibilityChange', 'the phone bottom nav should hide during the signing ceremony'],
    ['onFullBleedChange', 'the phone shell should collapse during the signing ceremony'],
    ['onImmersiveChange', 'the signing room should control the immersive viewport boundary'],
    ['isFullBleedMobileSurface', 'the app shell should support full-bleed acquisition mode'],
    ['isImmersiveForbesScene', 'only the Forbes signing scene should bypass the MobilePage phone frame'],
    ['onUpdatePlayer(resultAfterEnergy.player)', 'the final acquisition result must persist into player state'],
    ['Closing Ritual', 'the signing scene should use a fresh ritual-style structure'],
    ['Deal Theater', 'the signing room should feel like an immersive scene rather than a paper card'],
    ['Action Plate', 'the signing action should be a physical control surface'],
    ['Signature Pressure', 'the hold interaction should feel tactile'],
    ['Stamp Strike', 'the stamping moment should be explicit'],
    ['Transfer Vault', 'the final ownership reveal should have a destination prop'],
    ['Ownership Reveal', 'the completion state should be framed as a reveal'],
    ['Studio Takeover Ceremony', 'the signing screen should feel like a game ceremony'],
    ['Acquisition Command Board', 'the game-style stage command panel'],
    ['Solid Game Panel', 'the signing UI should avoid transparent glass panels'],
    ['Takeover Meter', 'the game-style progress meter'],
    ['Control Transfer', 'the acquisition should be framed as control transfer'],
    ['Confirm Clause', 'the clause review should feel like an interactive game step'],
    ['Studio Acquired', 'the final ownership reward state'],
    ['Solid Game Panel', 'the signing scene should keep the game-first direction'],
    ['signatoryName', 'the signing line should use the player name instead of a hard-coded signature'],
    ['Writing Signature…', 'the signature action should visibly write before completing the transfer'],
    ['Notary seal in progress…', 'the signing moment should visibly apply the final seal'],
    ['responseTransitionLock', 'the board-decision reveal should reject duplicate taps while it opens'],
    ['Opening Decision…', 'the board-decision action should give immediate progress feedback'],
    ['mediaHandles', 'the acquisition reaction screen should reuse accounts from the current save'],
    ['Owned by You', 'Forbes should visibly identify an unmerged player-owned studio'],
    ['signedAcquisitionLocked', 'the signing completion should persist in the ceremony after save succeeds'],
    ['Filing Transfer', 'the signing flow should distinguish stamp animation from saved acquisition completion'],
    ['Final Board Directive', 'the immediate post-acquisition operating-model decision'],
    ['Confirm Operating Model', 'the operating-model confirmation action'],
    ['onSetOperatingModel', 'the acquisition operating-model callback'],
    ['showOpeningOfferBlocker', 'the exact opening-offer blocker path'],
    ['Market Closed', 'the unavailable-company explanation'],
    ['Unknown liabilities are only a risk warning', 'the liability warning clarification'],
    ['Open Stocks', 'the public-market acquisition route'],
    ['Open the War Room', 'a deliberate post-diligence transition into negotiation'],
    ['stockCostBasis:', 'the public-market cash already invested ledger input'],
    ['existingStakeCredit:', 'the public-market stake credit ledger input'],
    ['Control block', 'the public-control reference valuation'],
    ['Existing stake credit', 'the public-control stake credit disclosure'],
    ['Cash already invested', 'the stock cost-basis disclosure'],
    ['Remaining reference', 'the tender amount reference disclosure'],
    ['responseSeenKey', 'the persisted board-response resume checkpoint'],
    ['forbes_acquisition_offer_attempt', 'the acquisition offer telemetry checkpoint'],
    ['forbes_acquisition_offer_result', 'the acquisition result telemetry checkpoint'],
    ['Company Review In Progress', 'the explicit acquisition hold status'],
    ['Optional Target Due Diligence', 'the non-blocking target research explanation'],
    ['Verify Target Figures', 'the optional diligence path from final review'],
    ['Review Hold', 'the disabled action copy during a regulator hold'],
    ['getBidDialStep', 'display-aligned acquisition bid increments'],
    ['Minimum qualifying bid', 'the exact rival-bid threshold shown to the player'],
    ['requiredBidAmount', 'the rival-bid requirement supplied by the deal logic'],
    ['Filed with the Board…', 'the opening-offer duplicate action lock'],
    ['Strategy energy', 'clear negotiation-energy disclosure before the board responds'],
    ['ACQUISITION_MAX_OFFER_ATTEMPTS', 'the three-offer negotiation cap'],
    ['Offer {round} of', 'the visible offer-attempt count after a rejection'],
    ['View Current Status', 'rejected inbox cards should not promise a live offer'],
    ['ACQUISITION_INBOX_NOTICE_WEEKS', 'a finite expiry for acquisition decision notices'],
    ['selectedStudioAcquisitionExpired', 'the expired acquisition-message guard'],
    ['Deal Notice Expired', 'the explicit expired acquisition-message state'],
    ['use Forbes to review the studio', 'the expired-message next-step guidance'],
    ['closed discussions for now', 'the final-rejection cooldown explanation'],
];

for (const [needle, description] of checks) {
    if (!combinedSource.includes(needle)) {
        throw new Error(`Studio acquisition UI is missing ${description}: ${needle}`);
    }
}

if (!/setPhase\('RESPONSE'\);\s*recordPresentation\(\{ responseSeenKey/.test(dealRoomSource)) {
    throw new Error('The board-decision CTA must enter the response on its first tap before recording its resume marker.');
}

for (const recoveryNeedle of [
    'We could not finish that action. Nothing was charged.',
    'Your money and shares are safe.',
    '>Review deal</button>',
    '>Return to Forbes</button>',
]) {
    if (!dealRoomSource.includes(recoveryNeedle)) {
        throw new Error(`Studio acquisition failures need a plain-language recovery path: ${recoveryNeedle}`);
    }
}

if (dealRoomSource.includes('This file updated while we were saving your action.')) {
    throw new Error('Studio acquisition failures still expose technical save-conflict wording to players.');
}

const sharedCompletionStart = forbesAppSource.indexOf('onCompleteAcquisition={() =>');
const sharedCompletionEnd = forbesAppSource.indexOf('onUpdatePresentation={(patch)', sharedCompletionStart);
const sharedCompletionBlock = sharedCompletionStart >= 0 && sharedCompletionEnd > sharedCompletionStart
    ? forbesAppSource.slice(sharedCompletionStart, sharedCompletionEnd)
    : '';
if (!sharedCompletionBlock.includes('spendEnergyFromResult(result, acquisitionSigningEnergyCost)')) {
    throw new Error('The shared acquisition completion path must persist the completed player through the energy settlement helper.');
}

if (!forbesAppSource.includes('latestPlayerRef.current = nextPlayer')
    || !forbesAppSource.includes('player: latestPlayerRef.current')) {
    throw new Error('The post-acquisition operating-model action must use the newly saved player immediately.');
}

for (const [needle, description] of [
    ['sa-break-action', 'a dedicated first-tap board-decision action zone'],
    ['sa-feed{flex:1', 'the cinematic response feed'],
    ['pointer-events:none}', 'non-interactive decorative breaking content'],
    ['type="button" className="sa-btn gold sa-break-continue"', 'a single semantic board-decision button'],
]) {
    if (!dealRoomSource.includes(needle)) {
        throw new Error(`Studio acquisition UI is missing ${description}: ${needle}`);
    }
}

for (const [needle, description] of [
    ['playerOwnedStudioById', 'the owned-studio market snapshot override'],
    ['marketStudios.map(studio => playerOwnedStudioById.get(studio.id) || studio)', 'the saved ownership record taking precedence over Forbes market data'],
    ['Your Studio', 'the owned-studio profile badge'],
]) {
    if (!combinedSource.includes(needle)) {
        throw new Error(`Studio acquisition UI is missing ${description}: ${needle}`);
    }
}

for (const forbiddenBinding of ['onPointerUp={(event)', 'onTouchEnd={(event)']) {
    if (source.includes(forbiddenBinding)) {
        throw new Error(`Studio acquisition signing must use one click path, not ${forbiddenBinding}.`);
    }
}

if (source.includes('(Object.keys(OFFER_COPY) as AcquisitionOfferType[])')) {
    throw new Error('Studio acquisition UI still renders the old vertical offer-card stack.');
}

if (!source.includes("if (hasDealStatus) {\n            onClose();\n            return;\n        }")) {
    throw new Error('Submitted offers must leave the Acquisition Desk instead of reopening completed stages.');
}

if (!combinedSource.includes('Back to studio profile')) {
    throw new Error('The state-aware back arrow is missing its studio-profile exit label.');
}

if (!messagesSource.includes('disabled={selectedStudioAcquisitionExpired || !onOpenStudioAcquisition}')) {
    throw new Error('Expired acquisition notices must not keep an actionable deal-room link.');
}

if (!messagesSource.includes('if (!selectedStudioAcquisitionMessage || selectedStudioAcquisitionExpired) return;')) {
    throw new Error('The acquisition inbox action needs a runtime expiry guard as well as a disabled button.');
}

if (/\bX,\s*\n} from 'lucide-react'/.test(source) || source.includes('<X size=')) {
    throw new Error('The Acquisition Desk still renders the redundant close control.');
}

if (source.includes('Z. Empire')) {
    throw new Error('The acquisition signature still uses the old hard-coded Z. Empire name.');
}

if (source.includes('lowGraphicsMode')) {
    throw new Error('The acquisition ceremony still has a reduced-graphics branch; the rich ceremony must be the default for every user.');
}

if (!source.includes('<StudioAcquisitionDealRoom')) {
    throw new Error('Studio acquisitions must enter the new Deal Room.');
}

if (dealRoomSource.includes("onRunDiligence(fundingSelection), 'WARROOM'")) {
    throw new Error('Due diligence must return to the dossier until the player deliberately opens the War Room.');
}

if (!dealRoomSource.includes("return 'DOSSIER';")) {
    throw new Error('Reopened diligence files must resume in the dossier instead of skipping the designed War Room entry.');
}

if (!logicSource.includes('presentation: undefined')) {
    throw new Error('New board responses must clear stale acquisition presentation checkpoints.');
}

if (source.includes("return <LegacyStudioAcquisitionDesk {...props} />")) {
    throw new Error('Public stock-control acquisitions still bypass the shared Deal Room.');
}

for (const publicNeedle of ['marketType:', 'currentOwnershipPercent:', 'sharesRequiredForControl', 'transactionOutcome:']) {
    if (!source.includes(publicNeedle)) {
        throw new Error(`Shared Deal Room is missing public-market context: ${publicNeedle}`);
    }
}

if (!/\.sa-stage\{[^}]*z-index:\s*(?:[6-9]\d|[1-9]\d{2,})/.test(dealRoomSource)) {
    throw new Error('The Studio Acquisition Deal Room must render above the Forbes company profile.');
}

for (const [needle, description] of [
    ['onSubmitOffer', 'the authoritative opening-offer callback'],
    ['onCompleteAcquisition', 'the authoritative final-signing callback'],
    ['onSetOperatingModel', 'the authoritative operating-model callback'],
    ['onImmersiveChange', 'the immersive viewport lifecycle callback'],
    ['onUpdatePresentation', 'persistent response and closing checkpoints'],
    ['onSigned={sign}', 'the shared signature-line and final-button signing path'],
    ['handleResult', 'exact deal failure feedback'],
]) {
    if (!dealRoomSource.includes(needle)) {
        throw new Error(`Studio Acquisition Deal Room is missing ${description}: ${needle}`);
    }
}

if (source.includes('bg-[linear-gradient(90deg,#10b981,#facc15)]')) {
    throw new Error('The signing hold fill still uses the rejected bright green/yellow gradient.');
}

if (/press and hold|Release early cancels/i.test(source)) {
    throw new Error('The signing ceremony still contains old hold-to-sign wording.');
}

if (source.includes("setSigningRoomOpen(false);\n            setFeedback('Documents signed.")) {
    throw new Error('Successful signing still closes the ceremony immediately, which can look like tap-to-sign reset.');
}

if (/const isFullBleedApp = appMode === 'FORBES';/.test(mobilePageSource)) {
    throw new Error('The entire Forbes app still bypasses the phone shell instead of only the signing ceremony.');
}

console.log('Studio acquisition UI audit passed.');
