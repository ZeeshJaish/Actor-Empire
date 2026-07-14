import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const files = {
    career: read('views/CareerPage.tsx'),
    hook: read('hooks/useGameActions.ts'),
    greenlight: read('views/lifestyle/business/GreenlightWizard.tsx'),
    service: read('services/ownedProductionCareer.ts'),
    pkg: read('package.json'),
};

const checks = [
    ['Career derives owned production items', files.career, 'deriveOwnedProductionCareerItems(player)'],
    ['Career only shows My Productions when active', files.career, 'ownedProductionItems.length > 0'],
    ['Career labels owned production section', files.career, 'My Productions'],
    ['Career marks owned production cards as compact', files.career, 'data-owned-production-card="compact"'],
    ['Career labels each owned card as owned work', files.career, 'Owned Work'],
    ['Career shows available energy near owned production work', files.career, 'Available Energy'],
    ['Career keeps symmetric owned track styling', files.career, 'OWNED_TRACK_STYLES'],
    ['Career renders compact owned track stack', files.career, 'className="space-y-2"'],
    ['Career gives owned tracks icons', files.career, 'getOwnedTrackIcon'],
    ['Career shows inline polish lift cap', files.career, 'Polish +{item.qualityLift}/15'],
    ['Career shows full project calendar week', files.career, 'Project W{item.projectWeek}/{item.totalProjectWeeks}w'],
    ['Career shows owned production focus load against remaining window', files.career, 'Focus {item.focusLoadWeeks}w load/{item.focusWeeksRemaining}w left'],
    ['Career shows quality score', files.career, '{item.qualityScore}/100'],
    ['Career renders per-track actions', files.career, 'track.actions.map'],
    ['Career buttons route to owned production handler', files.career, 'onOwnedProductionFocus(item.commitment.id, action.id)'],
    ['Career buttons show readable short action labels', files.career, 'action.shortLabel'],
    ['Career buttons show energy shortfall', files.career, 'Need ${action.energyCost}E'],
    ['Career buttons show completed state', files.career, 'Complete'],
    ['Career buttons wrap as compact action chips', files.career, 'flex flex-wrap gap-1.5'],
    ['Career buttons use pointer cursor when enabled', files.career, 'cursor-pointer'],
    ['Career buttons expose focus rings', files.career, 'focus-visible:ring-2'],
    ['Career buttons expose accessible labels', files.career, 'aria-label={`Owned production ${track.label} ${action.label}`}'],
    ['Hook uses shared progress helper before spending energy', files.hook, 'getOwnedProductionActionProgress(commitment, actionId)'],
    ['Hook spends the owned production action energy cost', files.hook, 'spendPlayerEnergy(nextState, action.energyCost'],
    ['Greenlight seeds player production focus', files.greenlight, 'playerProductionFocus: initialPlayerProductionFocus'],
    ['Greenlight stores full production calendar', files.greenlight, 'productionCalendar'],
    ['Greenlight carries actor attachment', files.greenlight, 'isPlayerActor'],
    ['Greenlight carries director attachment', files.greenlight, 'isPlayerDirector'],
    ['Service caps owned production quality lift', files.service, 'OWNED_PRODUCTION_QUALITY_LIFT_CAP = 15'],
    ['Service derives project calendar progress', files.service, 'getProductionCalendarProgress(commitment)'],
    ['Service exports action progress helper', files.service, 'export const getOwnedProductionActionProgress'],
    ['Service includes owned acting prep action', files.service, 'ACTOR_PREP'],
    ['Service includes owned scene rehearsal action', files.service, 'ACTOR_SCENE'],
    ['Service includes owned big performance push action', files.service, 'ACTOR_BIG_PUSH'],
    ['Service includes owned director shot decision action', files.service, 'DIRECTOR_SHOT_DECISION'],
    ['Service includes owned major creative push action', files.service, 'DIRECTOR_MAJOR_PUSH'],
    ['Service includes owned risky director decision action', files.service, 'DIRECTOR_RISKY_DECISION'],
    ['Service includes owned director cut action', files.service, 'DIRECTOR_CUT'],
    ['Service includes script polish review action', files.service, 'PRODUCER_SCRIPT_REVIEW'],
    ['Service includes cast crew prep action', files.service, 'PRODUCER_CAST_CREW_PREP'],
    ['Service includes set quality action', files.service, 'PRODUCER_SET_QUALITY'],
    ['Service includes edit notes action', files.service, 'PRODUCER_EDIT_NOTES'],
    ['Service includes release positioning action', files.service, 'PRODUCER_RELEASE_POSITIONING'],
    ['Package exposes owned production career audit', files.pkg, 'audit:owned-production-career'],
    ['Package exposes owned production UI audit', files.pkg, 'audit:career-owned-production-ui'],
];

const missing = checks.filter(([, contents, needle]) => !contents.includes(needle));

if (missing.length > 0) {
    console.error('Career owned production UI audit failed:');
    for (const [label, , needle] of missing) {
        console.error(`- ${label}: missing "${needle}"`);
    }
    process.exit(1);
}

console.log('Career owned production UI audit passed.');
