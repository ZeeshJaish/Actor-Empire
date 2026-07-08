import fs from 'node:fs';

const source = fs.readFileSync(new URL('../views/mobile/components/StudioAcquisitionDesk.tsx', import.meta.url), 'utf8');
const logicSource = fs.readFileSync(new URL('../services/studioAcquisition.ts', import.meta.url), 'utf8');
const homePageSource = fs.readFileSync(new URL('../views/HomePage.tsx', import.meta.url), 'utf8');
const mobilePageSource = fs.readFileSync(new URL('../views/mobile/MobilePage.tsx', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const englishLocaleSource = fs.readFileSync(new URL('../services/localization/locales/en.ts', import.meta.url), 'utf8');
const combinedSource = `${source}\n${logicSource}\n${homePageSource}\n${mobilePageSource}\n${appSource}\n${englishLocaleSource}`;

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
    ['Hold To Sign', 'the hold-to-sign control'],
    ['Control transferring', 'the signing progress feedback'],
    ['reviewedClosingSteps', 'the closing document review state'],
    ['startSigningHold', 'the pointer hold signing handler'],
    ['onPointerDown={startSigningHold}', 'the hold-to-sign pointer down binding'],
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
    ['signingSubmitQueuedRef', 'the one-shot signing completion guard'],
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
    ['signedAcquisitionLocked', 'the signing completion should persist in the ceremony after save succeeds'],
    ['Filing Transfer', 'the signing flow should distinguish stamp animation from saved acquisition completion'],
    ['Final Board Directive', 'the immediate post-acquisition operating-model decision'],
    ['Confirm Operating Model', 'the operating-model confirmation action'],
    ['onSetOperatingModel', 'the acquisition operating-model callback'],
];

for (const [needle, description] of checks) {
    if (!combinedSource.includes(needle)) {
        throw new Error(`Studio acquisition UI is missing ${description}: ${needle}`);
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

if (/\bX,\s*\n} from 'lucide-react'/.test(source) || source.includes('<X size=')) {
    throw new Error('The Acquisition Desk still renders the redundant close control.');
}

if (source.includes('Z. Empire')) {
    throw new Error('The acquisition signature still uses the old hard-coded Z. Empire name.');
}

if (source.includes('bg-[linear-gradient(90deg,#10b981,#facc15)]')) {
    throw new Error('The signing hold fill still uses the rejected bright green/yellow gradient.');
}

if (source.includes("setSigningRoomOpen(false);\n            setFeedback('Documents signed.")) {
    throw new Error('Successful signing still closes the ceremony immediately, which can look like Hold To Sign reset.');
}

if (/const isFullBleedApp = appMode === 'FORBES';/.test(mobilePageSource)) {
    throw new Error('The entire Forbes app still bypasses the phone shell instead of only the signing ceremony.');
}

console.log('Studio acquisition UI audit passed.');
