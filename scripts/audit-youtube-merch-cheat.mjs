import { readFileSync } from 'node:fs';

const home = readFileSync('views/HomePage.tsx', 'utf8');
const socialQa = readFileSync('views/home/homeSocialQaActions.ts', 'utf8');
const source = `${home}\n${socialQa}`;
const packageJson = readFileSync('package.json', 'utf8');

const required = [
    ['triggerYoutubeMerchQa', 'dedicated merch QA setup handler'],
    ["scenario: 'PROFIT' | 'LOSS' | 'COOLDOWN'", 'three merch test scenarios'],
    ['Merch Profit Setup', 'visible profitable merch setup'],
    ['Merch Loss Setup', 'visible losing merch setup'],
    ['Test Merch Cooldown', 'visible cooldown setup'],
    ['lastMerchOutcome: undefined', 'clean outcome state before each test'],
    ["filter(transaction => !transaction.id.includes('youtube_merch_'))", 'clean merch ledger before each test'],
    ['YOUTUBE_MERCH_COOLDOWN_WEEKS', 'shared cooldown constant'],
    ['Open Phone > Social > YouTube Studio', 'instruction to use the real gameplay flow'],
];

for (const [needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`YouTube merch cheat audit missing ${description}: ${needle}`);
    }
}

if (!packageJson.includes('audit:youtube-merch-cheat')) {
    throw new Error('YouTube merch cheat audit script is missing from package.json.');
}

console.log('YouTube merch cheat audit passed.');
