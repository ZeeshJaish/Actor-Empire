import fs from 'node:fs';
import { INITIAL_PLAYER, Message, Player, SponsorshipOffer } from '../types';
import { processGameWeek } from '../services/gameLoop';
import { generateEpisodeRatings } from '../services/episodeRatings';
import { LIFESTYLE_ACTIVITY_CATALOG, createDefaultLifestyleActivitySelections, resolveLifestyleActivity } from '../services/lifestyleActivities';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const makePlayer = (): Player => {
    const player = clone(INITIAL_PLAYER);
    player.name = 'Report Fix QA';
    player.age = 28;
    player.currentWeek = 12;
    player.money = 100_000;
    player.logs = [];
    player.inbox = [];
    player.pendingEvents = [];
    player.scheduledEvents = [];
    player.commitments = [];
    player.activeReleases = [];
    player.activeSponsorships = [];
    player.finance = { ...player.finance, history: [] };
    player.stats = { ...player.stats, reputation: 50, fame: 30, followers: 20_000 };
    return player;
};

const completedSponsorship: SponsorshipOffer = {
    id: 'qa_sponsor_done',
    brandName: 'PulseForm',
    category: 'FASHION',
    weeklyPay: 12_000,
    durationWeeks: 6,
    requirements: {
        type: 'POST',
        energyCost: 8,
        totalRequired: 2,
        progress: 2,
    },
    isExclusive: false,
    penalty: 30_000,
    description: 'Audit sponsorship',
};

const sponsorshipPlayer = makePlayer();
sponsorshipPlayer.activeSponsorships = [completedSponsorship];
const sponsorshipResult = await processGameWeek(sponsorshipPlayer);
const sponsorshipLogs = sponsorshipResult.player.logs || [];
assert(sponsorshipResult.player.activeSponsorships.length === 1, 'Completed deliverables should not erase a paid multi-week campaign.');
assert(sponsorshipResult.player.activeSponsorships[0]?.durationWeeks === 5, 'Completed sponsorship should keep counting down its paid campaign term.');
assert(
    sponsorshipResult.player.finance.history.some(transaction => transaction.amount === completedSponsorship.weeklyPay),
    'Completed sponsorship should still pay the promised weekly amount.'
);
assert(
    !sponsorshipLogs.some(log => /CONTRACT BREACHED/.test(log.message)),
    'Completed sponsorship should not breach after the player finished all deliverables.'
);
assert(sponsorshipResult.player.stats.reputation === sponsorshipPlayer.stats.reputation, 'Sponsorship reputation should be awarded once when the paid campaign ends.');

const finalWeekSponsorshipPlayer = makePlayer();
finalWeekSponsorshipPlayer.activeSponsorships = [{ ...completedSponsorship, durationWeeks: 1 }];
const finalWeekSponsorshipResult = await processGameWeek(finalWeekSponsorshipPlayer);
assert(finalWeekSponsorshipResult.player.activeSponsorships.length === 0, 'Completed sponsorship should close after its final paid week.');
assert(finalWeekSponsorshipResult.player.stats.reputation > finalWeekSponsorshipPlayer.stats.reputation, 'Completed campaign should reward reputation once at the end.');

const expiringOffer: Message = {
    id: 'qa_expiring_offer',
    sender: 'QA Agent',
    subject: 'Audition: Glass Harbor',
    text: 'Role offer waiting.',
    type: 'OFFER_AUDITION',
    data: { id: 'qa_audition', projectName: 'Glass Harbor' },
    isRead: false,
    weekSent: 12,
    expiresIn: 1,
};

const expiryPlayer = makePlayer();
expiryPlayer.inbox = [expiringOffer];
const expiryResult = await processGameWeek(expiryPlayer);
const expiredMessage = expiryResult.player.inbox.find(message => message.id === expiringOffer.id);
const expiryLogs = expiryResult.player.logs || [];
assert(expiredMessage?.isExpired, 'Expired offer should remain visible as an expired inbox card.');
assert(expiredMessage?.expiresIn === undefined, 'Expired offer should stop showing active weeks-left timing.');
assert(expiredMessage?.text.includes('Expired offer'), 'Expired offer should explain why it cannot be accepted.');
assert(expiryLogs.some(log => /Offer expired/.test(log.message)), 'Expired offer should still add the weekly expiry log.');

const longSeasonRatings = generateEpisodeRatings({
    id: 'qa_long_season',
    name: 'Long Season QA',
    type: 'SERIES',
    imdbRating: 8.4,
    productionPerformance: 82,
    projectDetails: {
        title: 'Long Season QA',
        type: 'SERIES',
        description: 'Audit long season',
        studioId: 'ARTISAN_PICTURES',
        subtype: 'STANDALONE',
        genre: 'DRAMA',
        budgetTier: 'HIGH',
        estimatedBudget: 70_000_000,
        visibleHype: 'HIGH',
        episodes: 22,
        hiddenStats: {
            scriptQuality: 84,
            directorQuality: 81,
            castingStrength: 78,
            distributionPower: 76,
            rawHype: 70,
            qualityScore: 83,
            prestigeBonus: 5,
            castDepthScore: 78,
        },
    },
} as any);
assert(longSeasonRatings[0]?.episodes.length === 22, 'Episode ratings should honor player-selected long seasons above 12 episodes.');

const tripActivity = LIFESTYLE_ACTIVITY_CATALOG.find(activity => activity.id === 'vacation_escape');
assert(tripActivity, 'Vacation activity should exist for trip relationship audit.');
const tripPlayer = makePlayer();
tripPlayer.money = 2_000_000;
tripPlayer.relationships = [
    ...tripPlayer.relationships,
    {
        id: 'qa_trip_friend',
        name: 'Maya Stone',
        relation: 'Friend',
        closeness: 42,
        image: 'friend.png',
        lastInteractionWeek: 1,
        lastInteractionAbsolute: 1,
    },
];
const tripSelections = {
    ...createDefaultLifestyleActivitySelections(tripActivity!),
    inviteId: 'friends',
    scaleId: 'luxury',
    tripDurationDays: 7,
};
const tripResult = resolveLifestyleActivity(tripPlayer, tripActivity!, tripSelections);
const friendAfterTrip = tripResult.player.relationships.find(relationship => relationship.id === 'qa_trip_friend');
assert(tripResult.success, 'Friends trip should resolve successfully for audit player.');
assert((friendAfterTrip?.closeness || 0) > 42, 'Friends trip invite should increase actual relationship closeness.');
assert(
    tripResult.memory?.effectSummary.some(effect => /Friend bond/.test(effect)),
    'Friends trip result should surface a relationship bond effect.'
);

const read = (path: string) => fs.readFileSync(path, 'utf8');
const teamApp = read('views/mobile/TeamApp.tsx');
const mobilePage = read('views/mobile/MobilePage.tsx');
const socialPage = read('views/SocialPage.tsx');
const improvePage = read('views/ImprovePage.tsx');
const app = read('App.tsx');
const imdbApp = read('views/mobile/ImdbApp.tsx');
const projectDashboard = read('views/lifestyle/business/components/ProjectDashboardModal.tsx');
const gameLoop = read('services/gameLoop.ts');
const teamLogic = read('services/teamLogic.ts');

[
    'onOpenMessages',
    'onOpenCastLink',
    'team-active-contracts',
    'auditionOfferCount',
    'sponsorshipOfferCount',
].forEach(token => assert(teamApp.includes(token), `Team app should include direct offer routing token: ${token}`));
assert(mobilePage.includes("onOpenMessages={() => setAppMode('MESSAGES')}"), 'Mobile page should wire Team app to Messages.');
assert(mobilePage.includes("onOpenCastLink={() => setAppMode('CASTLINK')}"), 'Mobile page should wire Team app to CastLink.');
assert(socialPage.includes('pb-[calc(env(safe-area-inset-bottom)+6.5rem)]'), 'Legacy confirmation modal should leave bottom-nav safe space.');
assert(improvePage.includes('formatWorkshopGain'), 'Workshop cards should display exact gain amounts.');
assert(app.includes('normalizeSponsorshipOffer') && app.includes('IG_BRAND_OFFER'), 'Instagram brand deals should normalize sponsorship data.');
assert(app.includes('PREMIUM_ENTITLEMENTS_STORAGE_KEY'), 'Permanent purchases should have a device-level entitlement mirror.');
assert(app.includes('uniquePermanentPremiumIds(result.restoredProductIds)'), 'Restore should filter to permanent premium products.');
assert(app.includes('syncPermanentPremiumEntitlementsToSavedSlots'), 'Permanent purchases should sync across local save slots.');
assert(app.includes('applyPremiumEntitlementsToPlayer(migratedNewPlayer'), 'New careers should inherit permanent premium entitlements.');
assert(
    /const agentOffer = generateAgentOffers[\s\S]{0,1600}type:\s*'OFFER_ROLE'[\s\S]{0,500}expiresIn:\s*4/.test(gameLoop),
    'Agent role offers should stay available for 4 weeks.'
);
assert(teamLogic.includes("agent.tier === 'LEGEND' ? 0.45") && teamLogic.includes("agent.tier === 'ELITE' ? 0.52"), 'Elite and Legend agents should slightly improve budget-tier quality.');
assert(teamLogic.includes('const leadCutoff') && teamLogic.includes("agent.tier === 'LEGEND'"), 'Elite and Legend agents should slightly improve role quality.');
assert(imdbApp.includes('max-h-[420px] overflow-auto'), 'IMDb long episode heatmap should scroll vertically.');
assert(projectDashboard.includes('max-h-[460px] overflow-auto'), 'Production dashboard long episode heatmap should scroll vertically.');

console.log('Player report fixes audit passed.');
