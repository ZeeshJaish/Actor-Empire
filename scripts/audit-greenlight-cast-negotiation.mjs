import fs from 'node:fs';

const GREENLIGHT_FILE = 'views/lifestyle/business/GreenlightWizard.tsx';
const source = fs.readFileSync(GREENLIGHT_FILE, 'utf8');

const checks = [
    {
        name: 'Greenlight imports useRef for script-load guarding',
        pass: source.includes("useEffect, useRef") || source.includes("useRef, useEffect")
    },
    {
        name: 'Negotiation and save share a concept draft builder',
        pass: source.includes('const buildCurrentConceptDraft = () =>') &&
            source.includes('const buildStudioWithCurrentDraft = (returningTalentOverride')
    },
    {
        name: 'Current cast list is saved inside the draft during negotiation',
        pass: /const buildCurrentConceptDraft[\s\S]*castList,[\s\S]*const buildStudioWithCurrentDraft/.test(source)
    },
    {
        name: 'Returning talent updates preserve the active studio draft',
        pass: /const updateReturningTalentState[\s\S]*buildStudioWithCurrentDraft\(updatedReturningTalent\)/.test(source)
    },
    {
        name: 'Player businesses are cloned before replacing the studio',
        pass: source.includes('const updatedBusinesses = Array.isArray(player.businesses) ? [...player.businesses] : [];')
    },
    {
        name: 'Script state reload is guarded so parent saves do not reset cast',
        pass: source.includes('loadedScriptStateRef') &&
            source.includes('if (loadedScriptStateRef.current === loadKey) return;') &&
            source.includes('loadedScriptStateRef.current = loadKey;')
    }
];

const failures = checks.filter(check => !check.pass);

if (failures.length > 0) {
    console.error('Greenlight cast negotiation audit failed:');
    failures.forEach(failure => console.error(`- ${failure.name}`));
    process.exit(1);
}

console.log(`Greenlight cast negotiation audit passed (${checks.length} checks).`);
