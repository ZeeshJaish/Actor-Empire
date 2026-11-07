/**
 * The player's own streaming service in the news (plan §10, Phase 5).
 *
 * The platform's event ledger records what the player did. At the next week's industry pass the
 * newsworthy entries become industry facts, stamped with that week, and StreamScope, Flashpoint and
 * the rest of the media voice them into News, X and Instagram. (The industry pass runs before the
 * player's own week, so a tech launched this week makes next week's news.)
 *   #66  tech launches: a new picture, HDR or futuristic step is big news (News, X and Instagram),
 *        any other step a smaller story (X), and a picture or HDR step reaching its third version too.
 *   #67  outages: what viewers notice going wrong (the service down, slow streams, an app crashing,
 *        a feature broken, a breach, a server incident in a region), and its fix.
 *   #68  price and plan changes, which critics react to: ads put on a paid plan, a price rise, a
 *        free tier, a cheaper plan, a cut, ads taken off.
 *   #117 the offer's moves, each typed for what it is (plan §18.7: "a free tier is not 'a price cut'"): the main
 *        offer switched, subscriptions off or on sale, a free tier opened or closed, the store opened or closed;
 *        and the brand: a new look or ident (the brand studio, #116), a new front page.
 * Pure: reads the player, returns facts.
 */
import type {
    IndustryEventFact,
    IndustryEventImportance,
    IndustryEventType,
    OwnedStreamingCrisis,
    OwnedStreamingInfrastructureIncident,
    OwnedStreamingLedgerEntry,
    Player,
    StreamingInfrastructureIncidentType,
    StreamingTechId,
} from '../types';
import { createIndustryEventFact } from './industryWorld/industryEventLedger';
import { getStreamingTechDefinition } from './streamingTechTreeCatalogue';
import { STREAMING_APP_SCREEN_NAMES } from './streamingCrisisSecurity';
import { getStreamingServerSite } from './streamingServerSites';
import { STREAMING_DAY_ONE_REGION_LABELS } from './streamingDayOneMarkets';
import type { StreamingPricingChangeKind } from './streamingPricingChange';
import { streamingBrandLookChangeText } from './streamingBrandStudio';
import { STREAMING_EXECUTIVE_ROLE_LABELS } from './streamingLeadershipGovernance';

/* how far back a pass looks, so a save from before the news makes no stories of its history */
const LOOKBACK_WEEKS = 2;

export interface PlatformStory { importance: IndustryEventImportance; headline: string; detail: string }
interface PlatformFact extends PlatformStory { key: string; type: IndustryEventType }

/**
 * A tech step as news (#66; rivals' steps too, #70): a new picture, HDR or futuristic step is big news,
 * any other step a smaller story, and a picture or HDR step reaching its third version a smaller one.
 * Second versions, starters and unknown steps: null.
 */
export const streamingTechLaunchStory = (techId: StreamingTechId, version: number, name: string): PlatformStory | null => {
    const definition = getStreamingTechDefinition(techId);
    if (!definition || definition.starter) return null;
    const flagship = definition.group === 'PICTURE' || definition.group === 'HDR';
    if (version === 1) {
        const verb = definition.group === 'PICTURE' || definition.group === 'APPS' ? 'launches' : 'rolls out';
        return {
            importance: flagship || definition.futuristic ? 'HIGH' : 'MEDIUM',
            headline: `${name} ${verb} ${definition.name}`,
            detail: definition.group === 'PICTURE'
                ? `${definition.detail}. Plans that include it stream in ${definition.name} from this week.`
                : `${definition.detail}.`,
        };
    }
    if (version === 3 && flagship) {
        return {
            importance: 'MEDIUM',
            headline: `${name}'s ${definition.name} reaches reference quality`,
            detail: `${definition.name} is at version 3, the best it gets.`,
        };
    }
    return null;
};

/* a tech the player unlocked, or a picture or HDR step at its best version */
const techStory = (entry: OwnedStreamingLedgerEntry, name: string): PlatformStory | null => {
    const kind = entry.metadata?.kind;
    const techId = typeof entry.metadata?.techId === 'string' ? entry.metadata.techId as StreamingTechId : null;
    if (!techId) return null;
    if (kind === 'TECH_UNLOCKED') return streamingTechLaunchStory(techId, 1, name);
    if (kind === 'TECH_VERSION_REACHED' && entry.metadata?.version === 3) return streamingTechLaunchStory(techId, 3, name);
    return null;
};

const money = (amount: number) => `$${(Math.round(amount * 100) / 100).toFixed(2)}`;

/* a price or plan change, as the next week's news reports it (#68) */
const pricingStory = (entry: OwnedStreamingLedgerEntry, name: string): (PlatformStory & { type: IndustryEventType }) | null => {
    const meta = entry.metadata;
    if (meta?.kind !== 'PRICING_CHANGED') return null;
    const plan = String(meta.plan || '');
    const from = Number(meta.from) || 0;
    const to = Number(meta.to) || 0;
    const percent = Number(meta.percent) || 0;
    switch (meta.change as StreamingPricingChangeKind) {
        case 'ADS_ADDED': return { type: 'PLATFORM_ADS_ADDED', importance: 'HIGH', headline: `${name} puts ads on ${plan}`,
            detail: `Subscribers on ${plan} will see ads from this week, at the same price.` };
        case 'RAISED': return { type: 'PLATFORM_PRICE_RAISED', importance: percent >= 15 ? 'HIGH' : 'MEDIUM',
            headline: `${name} raises ${plan} to ${money(to)} a month`,
            detail: `${plan} goes from ${money(from)} to ${money(to)} a month, ${percent}% more.` };
        /* the main offer is the front door (#117): plan carries the new one */
        case 'MAIN_SWITCHED': return plan === 'ADVERTISING'
            ? { type: 'PLATFORM_OFFER_CHANGED', importance: 'HIGH', headline: `${name} goes free with ads`,
                detail: 'Free with ads is now the way in: new viewers watch for free, with ads.' }
            : plan === 'STORE'
                ? { type: 'PLATFORM_OFFER_CHANGED', importance: 'MEDIUM', headline: `${name} leads with its store`,
                    detail: 'New viewers now meet the store first, to rent or buy titles one at a time.' }
                : { type: 'PLATFORM_OFFER_CHANGED', importance: 'MEDIUM', headline: `${name} puts its plans first`,
                    detail: 'New viewers now meet the subscription plans first.' };
        case 'SUBSCRIPTIONS_OFF': return { type: 'PLATFORM_OFFER_CHANGED', importance: 'HIGH', headline: `${name} drops subscriptions`,
            detail: 'Its subscription plans are off sale from this week.' };
        case 'SUBSCRIPTIONS_ON': return { type: 'PLATFORM_OFFER_CHANGED', importance: 'MEDIUM', headline: `${name} starts selling plans`,
            detail: `Subscription plans start at ${money(to)} a month.` };
        case 'FREE_TIER': return { type: 'PLATFORM_FREE_TIER', importance: 'HIGH', headline: `${name} opens a free tier with ads`,
            detail: 'Anyone can now watch for free, with ads.' };
        case 'FREE_TIER_CLOSED': return { type: 'PLATFORM_OFFER_CHANGED', importance: 'HIGH', headline: `${name} closes its free tier`,
            detail: 'Watching for free, with ads, ends this week.' };
        case 'STORE_OPENED': return { type: 'PLATFORM_OFFER_CHANGED', importance: 'HIGH', headline: `${name} opens a store`,
            detail: 'Viewers can now rent or buy titles one at a time.' };
        case 'STORE_CLOSED': return { type: 'PLATFORM_OFFER_CHANGED', importance: 'MEDIUM', headline: `${name} closes its store`,
            detail: 'Titles can no longer be rented or bought.' };
        case 'NEW_CHEAPER': return { type: 'PLATFORM_PRICE_CUT', importance: 'MEDIUM', headline: `${name} adds a cheaper plan`,
            detail: `${plan} costs ${money(to)} a month, the lowest price on the service.` };
        case 'CUT': return { type: 'PLATFORM_PRICE_CUT', importance: 'MEDIUM', headline: `${name} cuts ${plan} to ${money(to)} a month`,
            detail: `${plan} goes from ${money(from)} to ${money(to)} a month, ${percent}% less.` };
        /* the same price with no ads is not a cut (#117) */
        case 'ADS_REMOVED': return { type: 'PLATFORM_OFFER_CHANGED', importance: 'MEDIUM', headline: `${name} drops ads from ${plan}`,
            detail: `Subscribers on ${plan} will no longer see ads.` };
        default: return null;
    }
};

/* a new look or ident from the brand studio (#116, #117): "NORTHSTAR+ unveils a new look". Fans split, and critics
   weigh in. */
const brandStory = (entry: OwnedStreamingLedgerEntry, name: string): (PlatformStory & { type: IndustryEventType }) | null => {
    const change = entry.metadata?.brandChange;
    if (change === 'LOOK') {
        const what = streamingBrandLookChangeText(String(entry.metadata?.changes || '').split(',').map(part => part.trim()).filter(Boolean));
        return { type: 'PLATFORM_REBRANDED', importance: 'HIGH', headline: `${name} unveils a new look`,
            detail: `${what[0].toUpperCase()}${what.slice(1)}; the name stays. Fans are split: some miss the old look.` };
    }
    if (change === 'IDENT') {
        return { type: 'PLATFORM_REBRANDED', importance: 'MEDIUM', headline: `${name} has a new ident`,
            detail: 'The app now opens on a new ident. Viewers will hear it each time they open the app.' };
    }
    return null;
};

/* a new front page (#117): "NORTHSTAR+ redesigns its app" */
const frontPageStory = (entry: OwnedStreamingLedgerEntry, name: string): (PlatformStory & { type: IndustryEventType }) | null => (
    entry.metadata?.kind === 'FRONT_PAGE_CHANGED'
        ? { type: 'PLATFORM_APP_REDESIGNED', importance: 'MEDIUM', headline: `${name} redesigns its app`,
            detail: `A new home screen, ${String(entry.metadata.layout || 'a new layout')}, greets viewers when they open the app.` }
        : null
);

/* "about 1.2 million subscribers", "about 84,000 subscribers" */
const about = (count: number): string => {
    const value = Math.max(0, Math.round(Number(count) || 0));
    const thousands = Math.round(value / 1_000);
    if (thousands >= 1_000) return `about ${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')} million subscribers`;
    if (thousands >= 1) return `about ${thousands},000 subscribers`;
    return value === 1 ? 'one subscriber' : `${value} subscribers`;
};
const weeksText = (weeks: number) => (weeks <= 1 ? 'a week' : `${weeks} weeks`);

/* a crisis as news, or null when viewers would not notice it (#67) */
const crisisStory = (crisis: OwnedStreamingCrisis, name: string): (PlatformStory & { what: string }) | null => {
    const hit = about(crisis.affectedSubscribers);
    if (crisis.type === 'PLATFORM_OUTAGE') return { importance: 'HIGH', what: 'The outage', headline: `${name} down for hours`,
        detail: `Titles would not start, or stopped part way, for ${hit}.` };
    if (crisis.type === 'ACCOUNT_BREACH') return { importance: 'HIGH', what: 'The breach', headline: `${name} resets passwords after a breach`,
        detail: `Some accounts were exposed, and ${hit} are asked to sign in again.` };
    if (crisis.type === 'SLOW_STREAMING') return { importance: 'MEDIUM', what: 'Slow streaming', headline: `${name} buffers at busy times`,
        detail: `Titles were slow to start for ${hit}.` };
    if (crisis.type === 'APP_CRASH') {
        const screen = (crisis.techId && STREAMING_APP_SCREEN_NAMES[crisis.techId]) || 'one';
        return { importance: 'MEDIUM', what: `The ${screen} app`, headline: `${name}'s ${screen} app keeps crashing`,
            detail: `Viewers on ${screen} screens say the app closes mid-title. Other screens work as usual.` };
    }
    if (crisis.type === 'FEATURE_BROKEN') {
        const feature = (crisis.techId && getStreamingTechDefinition(crisis.techId)?.name) || 'One';
        return { importance: 'MEDIUM', what: `The ${feature} feature`, headline: `${name}'s ${feature} feature breaks`,
            detail: `The ${feature} feature stopped working for ${hit}. Streaming works as usual.` };
    }
    return null;
};

const SERVER_HEADLINES: Record<StreamingInfrastructureIncidentType, (name: string, region: string) => string> = {
    POWER_FAILURE: (name, region) => `A power failure knocks ${name} offline in ${region}`,
    REGIONAL_OUTAGE: (name, region) => `${name} goes dark in ${region}`,
    COOLING_INCIDENT: (name, region) => `${name} slows in ${region} after a cooling fault`,
    FIBRE_CUT: (name, region) => `A fibre cut slows ${name} in ${region}`,
    TRAFFIC_SPIKE: (name, region) => `${name} strains under demand in ${region}`,
    CYBERATTACK: name => `${name} hit by a cyberattack`,
    DDOS_ATTACK: name => `${name} fights off an attack on its service`,
    RIVAL_SABOTAGE: (name, region) => `${name} hit by a network fault in ${region}`,
};

/* a server incident as news: viewers in its region feel every one (#67) */
const incidentStory = (incident: OwnedStreamingInfrastructureIncident, name: string): PlatformStory & { what: string } => {
    const regionId = getStreamingServerSite(incident.cityId)?.regionId;
    const region = (regionId && STREAMING_DAY_ONE_REGION_LABELS[regionId as keyof typeof STREAMING_DAY_ONE_REGION_LABELS]) || 'one region';
    return {
        importance: incident.severity === 'MAJOR' || incident.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        what: `Service in ${region}`,
        headline: SERVER_HEADLINES[incident.type](name, region),
        detail: `Titles were slow to start or would not start for ${about(incident.affectedSubscribers)} in ${region}.`,
    };
};

/* what went wrong this week, and what was fixed (#67) */
const outageFacts = (
    records: Array<{ key: string; detected: number; resolved: number | null; story: (PlatformStory & { what: string }) | null }>,
    name: string,
    inWindow: (week: number | null) => boolean,
): PlatformFact[] => records.flatMap(record => {
    if (!record.story) return [];
    const { what, ...story } = record.story;
    const facts: PlatformFact[] = [];
    if (inWindow(record.detected)) facts.push({ ...story, key: `outage:${record.key}`, type: 'PLATFORM_OUTAGE' });
    if (record.resolved !== null && inWindow(record.resolved)) {
        facts.push({
            key: `restored:${record.key}`, type: 'PLATFORM_RESTORED', importance: 'MEDIUM',
            headline: `${name} is back to normal`,
            detail: `${what} is fixed after ${weeksText(Math.max(1, record.resolved - record.detected))}.`,
        });
    }
    return facts;
});

/** The player's platform's news since the last industry pass, as facts stamped with this week */
export const collectOwnedStreamingPlatformFacts = (
    player: Player,
    sinceWeek: number,
    absoluteWeek: number,
): IndustryEventFact[] => {
    const platform = player.ownedStreamingPlatform;
    const slug = platform?.identity?.slug;
    const name = platform?.identity?.name?.trim();
    if (!platform?.launchCommit || !slug || !name) return [];
    const from = Math.max(sinceWeek, absoluteWeek - LOOKBACK_WEEKS);
    const inWindow = (week: number | null) => week !== null && Number.isFinite(week) && week >= from && week < absoluteWeek;
    /* what the player did: tech launches (#66), price and plan changes (#68), the offer's moves and the brand (#117);
       of several front pages in one window, the last is the story */
    const done = (platform.eventLedger || []).filter(entry => entry.source === 'PLAYER_ACTION' && inWindow(entry.absoluteWeek));
    const lastFrontPage = done.filter(entry => entry.metadata?.kind === 'FRONT_PAGE_CHANGED').at(-1);
    const actions: PlatformFact[] = done
        .flatMap(entry => {
            const story = techStory(entry, name);
            if (story) return [{ ...story, key: entry.idempotencyKey, type: 'PLATFORM_TECH_LAUNCHED' as const }];
            const other = pricingStory(entry, name) || brandStory(entry, name) || (entry === lastFrontPage ? frontPageStory(entry, name) : null);
            return other ? [{ ...other, key: entry.idempotencyKey }] : [];
        });
    const outages = outageFacts([
        ...(platform.crisisSecurity?.crises || []).map(crisis => ({
            key: crisis.idempotencyKey || crisis.id, detected: crisis.detectedAtAbsoluteWeek, resolved: crisis.resolvedAtAbsoluteWeek, story: crisisStory(crisis, name),
        })),
        ...(platform.crisisSecurity?.infrastructureOperations?.incidents || []).map(incident => ({
            key: incident.idempotencyKey || incident.id, detected: incident.detectedAtAbsoluteWeek, resolved: incident.resolvedAtAbsoluteWeek, story: incidentStory(incident, name),
        })),
    ], name, inWindow);
    /* #200: a chief leaves, or joins */
    const people = (platform.leadership?.appointments || []).flatMap<PlatformFact>(item => {
        const title = item.exit?.wasCeo ? 'Chief Executive' : STREAMING_EXECUTIVE_ROLE_LABELS[item.role] || 'executive';
        const big = item.exit?.wasCeo || item.role === 'CEO' || item.role === 'CFO' || item.role === 'CHIEF_CONTENT_OFFICER' || item.role === 'CTO';
        if (item.status !== 'ACTIVE' && item.exit && inWindow(item.endedAtAbsoluteWeek)) {
            const { reason, to } = item.exit;
            const headline = reason === 'RIVAL_OFFER' && to ? `${name}'s ${title} leaves for ${to}`
                : reason === 'LET_GO' ? `${name} lets its ${title} go`
                    : reason === 'RETIRING' ? `${name}'s ${title} retires`
                        : `${name}'s ${title} steps down`;
            const detail = reason === 'RIVAL_OFFER' ? `${item.nameAtAppointment} goes after a better offer.`
                : reason === 'UNDERPAID' ? `${item.nameAtAppointment} leaves over pay.`
                    : reason === 'HARD_QUARTER' ? `${item.nameAtAppointment} goes after a hard quarter.`
                        : reason === 'RETIRING' ? `${item.nameAtAppointment} retires after a long career.`
                            : reason === 'LET_GO' ? `${item.nameAtAppointment} is out, and the chair is empty.`
                                : `${item.nameAtAppointment} is leaving the company.`;
            return [{ key: `exec-left:${item.id}`, type: 'PLATFORM_EXECUTIVE_LEFT' as const, importance: big && item.exit.sudden ? 'HIGH' as const : 'MEDIUM' as const, headline, detail }];
        }
        if (item.status === 'ACTIVE' && item.origin === 'PLAYER_HIRED' && inWindow(item.appointedAtAbsoluteWeek)) {
            return [{ key: `exec-hired:${item.id}`, type: 'PLATFORM_EXECUTIVE_HIRED' as const, importance: 'MEDIUM' as const,
                headline: `${name} names ${item.nameAtAppointment} its ${title}`, detail: `${item.nameAtAppointment} joins the team as ${title}.` }];
        }
        return [];
    });
    /* #201: the board */
    const directors = (platform.governance?.directors || []).flatMap<PlatformFact>(item => {
        if (item.status !== 'ACTIVE' && item.exit && inWindow(item.endedAtAbsoluteWeek)) {
            return [item.exit.reason === 'REMOVED'
                ? { key: `director-left:${item.id}`, type: 'PLATFORM_EXECUTIVE_LEFT', importance: 'HIGH', headline: `${name} removes ${item.name} from its board`, detail: `${item.name} was dropped as an independent director before the term was up. Investors will ask why.` }
                : item.exit.reason === 'PROTEST'
                ? { key: `director-left:${item.id}`, type: 'PLATFORM_EXECUTIVE_LEFT', importance: 'HIGH', headline: `A director quits ${name}'s board in protest`, detail: `${item.name} has resigned, saying the board has lost confidence in where the company is going.` }
                : { key: `director-left:${item.id}`, type: 'PLATFORM_EXECUTIVE_LEFT', importance: 'MEDIUM', headline: `${item.name} leaves ${name}'s board`, detail: `${item.name} steps down at the end of a full term.` }];
        }
        if (item.status === 'ACTIVE' && item.seatType === 'INDEPENDENT' && inWindow(item.appointedAtAbsoluteWeek)) {
            return [{ key: `director-joined:${item.id}`, type: 'PLATFORM_EXECUTIVE_HIRED', importance: 'MEDIUM', headline: `${name} adds ${item.name} to its board`, detail: `${item.name} joins as an independent director.` }];
        }
        return [];
    });
    /* #205: who controls it, and who runs it */
    const control = (platform.eventLedger || []).flatMap<PlatformFact>(entry => {
        /* the handoff is stamped the week the heir begins */
        if (!inWindow(entry.absoluteWeek) && !(entry.type === 'GENERATION_HANDOFF' && entry.absoluteWeek >= from && entry.absoluteWeek <= absoluteWeek)) return [];
        if (entry.type === 'SUCCESSOR_APPOINTED') return [{ key: entry.idempotencyKey, type: 'PLATFORM_EXECUTIVE_HIRED', importance: 'HIGH', headline: `${name} has a new chief executive`, detail: entry.summary }];
        /* #207: the news names the service and who runs it now */
        if (entry.type === 'GENERATION_HANDOFF') return [{ key: entry.idempotencyKey, type: 'PLATFORM_EXECUTIVE_LEFT', importance: 'HIGH', headline: entry.metadata?.died ? `${name}'s founder has died` : `${name}'s founder hands over to the next generation`, detail: entry.summary }];
        if (entry.type !== 'FOUNDER_ROLE_CHANGED') return [];
        if (entry.metadata?.kind === 'LOST_CONTROL') return [{ key: entry.idempotencyKey, type: 'PLATFORM_EXECUTIVE_LEFT', importance: 'HIGH', headline: `${name}'s founder gives up control`, detail: entry.summary }];
        if (entry.metadata?.kind === 'BOARD_MOVED') return [{ key: entry.idempotencyKey, type: 'PLATFORM_EXECUTIVE_LEFT', importance: 'HIGH', headline: `The board moves ${name}'s founder aside`, detail: entry.summary }];
        return [];
    });
    return [...actions, ...outages, ...people, ...directors, ...control].map(fact => createIndustryEventFact({
        idempotencyKey: `owned-platform:${slug}:${fact.key}`,
        absoluteWeek,
        type: fact.type,
        importance: fact.importance,
        companyId: slug,
        companyName: name,
        platformId: slug,
        headline: fact.headline,
        detail: fact.detail,
        evidence: [{ kind: 'PLATFORM', id: slug }],
    }));
};
