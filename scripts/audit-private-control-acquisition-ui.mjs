import fs from 'node:fs';

const position = fs.readFileSync('views/mobile/components/ForbesCompanyPosition.tsx', 'utf8');
const profile = fs.readFileSync('views/mobile/components/ForbesStudioProfile.tsx', 'utf8');
const forbes = fs.readFileSync('views/mobile/ForbesApp.tsx', 'utf8');
const desk = fs.readFileSync('views/mobile/components/StudioAcquisitionDesk.tsx', 'utf8');
const dealRoom = fs.readFileSync('views/mobile/components/StudioAcquisitionDealRoom.tsx', 'utf8');

const checks = [
    ['Forbes position exposes the control route', position.includes('Build to Full Control')],
    ['Existing stake credit is explained before opening the deal', position.includes('already credited; negotiate for the remaining')],
    ['An active buyer search disables the control route', position.includes('disabled={privateExitActive}')],
    ['The sell and manage dossier remains available', position.includes('Open Position Dossier')],
    ['Control and dossier actions share one compact readable row', position.includes("grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]") && position.includes('whitespace-normal') && position.includes("privateControlAvailable ? 'border-l border-violet-300/15 pl-3' : ''")],
    ['The profile limits conversion to available private non-owned studios', profile.includes("profile.acquisitionState !== 'PUBLICLY_TRADED'") && profile.includes("profile.acquisitionState !== 'NOT_FOR_SALE'") && profile.includes('!profile.isPlayerOwned')],
    ['The profile removes the duplicate acquisition card for an existing private stake', profile.includes('{!privateControlAvailable ? (')],
    ['Forbes starts the conversion through the domain service', forbes.includes('beginPrivateControlAcquisition({')],
    ['Successful conversion persists before the deal room opens', forbes.includes('latestPlayerRef.current = result.player') && forbes.includes('setAcquisitionDeskOpen(true)')],
    ['Deal-room config carries the conversion marker', dealRoom.includes('isPrivateControlUpgrade?: boolean')],
    ['Deal-room offer uses a remaining-block reference', dealRoom.includes('offerReferenceValue?: number')],
    ['The dossier explains that old shares are not charged again', dealRoom.includes('this negotiation charges only for the remaining shares')],
    ['Minority controls are hidden in a conversion route', dealRoom.includes('!privateControlUpgrade && draft.structure ===')],
    ['The wrapper derives remaining percent from conversion state', desk.includes('privateControlConversion?.remainingPercent ?? tenderPercent')],
    ['The wrapper passes the dedicated offer reference', desk.includes('offerReferenceValue: privateControlConversion ? controlBlockValue : undefined')],
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
    for (const [name] of failed) console.error(`FAIL: ${name}`);
    process.exit(1);
}

for (const [name] of checks) console.log(`PASS: ${name}`);
console.log(`Private control acquisition UI audit passed (${checks.length} checks).`);
