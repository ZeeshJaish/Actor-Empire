import {makeCinemaLongSave} from './fixtures/boxOfficeLongRun';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
/** Existing owner checkpoint, not proof that a $2,000 newcomer can purchase a studio. */
const p=makeCinemaLongSave('founder-small'),c=p.commitments[0],reserve=100_000;
c.projectPhase='AWAITING_RELEASE';c.phaseWeeksLeft=0;c.totalPhaseDuration=0;c.productionPerformance=80;
p.businesses[0].balance-=reserve;
c.projectDetails={...c.projectDetails!,releaseStrategy:undefined,releaseRegionIds:[],releaseChainSelections:{},marketingBudgetSpent:0,marketingChannelAllocations:{},reservedMarketingBudget:reserve,marketingBudgetRemaining:reserve};
const folder=process.env.CINEMA_APP_FIXTURE_DIR||'/private/tmp/actor-cinema-app-fixtures';mkdirSync(folder,{recursive:true});writeFileSync(join(folder,'owned-studio-awaiting.json'),JSON.stringify(p));
console.log('Authored existing owner: production $500K and campaign reserve $100K already funded; studio balance',p.businesses[0].balance);
