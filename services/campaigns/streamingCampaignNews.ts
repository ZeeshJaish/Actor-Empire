/**
 * #149 (plan §20.10 point 6, Zeesh: "न्यूज़ भी बन सकता है, लाइक … फ्लिपकार्ट का … दिस कैरेक्टर स्पॉटेड"): the player's
 * campaigns in the news, read from the weeks they ran (the industry pass runs before this week's campaigns, so a night
 * is news the week after it, as the chart's weeks are).
 *  - a big moment (a landmark lit up, a tower-high poster, a drone show, a fan festival, a live stunt show): HIGH, so a
 *    top story, X and Instagram, with the campaign's picture;
 *  - a famous screen taken over (Times Square, Piccadilly …) when the campaign has no big moment: MEDIUM (X);
 *  - a campaign that ends having brought 100,000 joins or more: MEDIUM (X), its joins and what a join cost.
 * And the buzz around a big moment or a screen takeover: two fans' X posts in their own words ("The Burj Khalifa is
 * wearing NORTHSTAR+ blue tonight", "Spotted: …"), the first with the picture.
 * #151: the launch campaign's opening night, the same way, the week after the service opens.
 * #152: the rivals' campaigns too: a big night is a top story with two fans' posts, a famous screen a smaller one, in
 * the rival's own name and colours.
 * #161 (plan §20.14): every player campaign is talked about by what it ran (campaignReactions.ts): its first week's story
 * and posts from its loudest format (a feed's scroll-stopper, a short video's trend, creators' reviews, the ad in the TV
 * break, a wrapped train, posters, flyers, the screens at airports and malls), with a photo on Instagram for what is seen
 * in the street; a week mid-run (still talked about, or tiring people out when all-out or long); and its end (a good
 * result celebrated, a dear one criticised). Every story and post names its fact, so the campaign's page finds them.
 * #162 (Zeesh: "kuch kuch insta post ese bhi jaha humara marketing image dala gya hai with comment and stuff"): every post
 * on X has replies in its own mood, every Instagram post has comments, and a campaign with a picture is shared on
 * Instagram even when nothing of it is seen in the street (its ad, shared by a fan or a creator).
 * Pure: reads the campaign books and the launch plan; each fact is keyed so it is said once.
 */
import type { Campaign, IndustryEventFact, InstaPost, Player, XPost } from '../../types';
import { createIndustryEventFact } from '../industryWorld/industryEventLedger';
import { createIndustryMediaAvatar } from '../industryWorld/industryMediaIdentities';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { getStreamingDayOneMarket } from '../streamingDayOneMarkets';
import { getStreamingServerSite } from '../streamingServerSites';
import { resolveStreamingPlatformBrandById } from '../streamingPlatformBrandRegistry';
import { CAMPAIGN_FORMATS, campaignMomentOf, type CampaignMoment } from './campaignFormats';
import { normalizeCampaignBook } from './campaignBook';
import {
    COMMENT_BANK,
    FATIGUE_REACTIONS,
    QUOTE_BANK,
    REPLY_BANK,
    SHARE_REACTIONS,
    FATIGUE_STORY,
    FLOP_REACTIONS,
    FLOP_STORY,
    FORMAT_REACTIONS,
    MID_REACTIONS,
    REACTION_VOICES,
    RESULT_REACTIONS,
    fillReaction,
    leadingFormats,
    type ReactionLine,
} from './campaignReactions';

/* how far back a pass looks, so a save from before the news makes no stories of its history */
const LOOKBACK_WEEKS = 2;
export const CAMPAIGN_NEWS_RESULT_JOINS = 100_000;
/* #161: a campaign that spent this much and paid this much a member, or brought none, is criticised at its end */
export const CAMPAIGN_NEWS_FLOP_SPEND = 5_000_000;
export const CAMPAIGN_NEWS_FLOP_PER_MEMBER = 600;

const short = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(Math.round(n)));
const money = (n: number) => (n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);
/* #161: what a member cost, to the dollar under $10K */
const perMember = (n: number) => (n < 10_000 ? `$${Math.round(n).toLocaleString('en-US')}` : money(n));
const cityOf = (countryId: string) => getStreamingServerSite(getStreamingDayOneMarket(countryId)?.recommendedCityId || '')?.name
    || getStreamingDayOneMarket(countryId)?.country || countryId;

/** a service's colour in words, from its hex */
export const colourWord = (hex: string): string => {
    const value = /^#?([0-9a-f]{6})$/i.exec(hex.trim())?.[1];
    if (!value) return 'colours';
    const [r, g, b] = [0, 2, 4].map(at => parseInt(value.slice(at, at + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min < 0.08) return max > 0.7 ? 'white' : max < 0.25 ? 'black' : 'silver';
    const hue = max === r ? ((g - b) / (max - min) + 6) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4;
    const degrees = hue * 60;
    return degrees < 15 ? 'red' : degrees < 40 ? 'orange' : degrees < 65 ? 'gold' : degrees < 160 ? 'green' : degrees < 195 ? 'teal'
        : degrees < 255 ? 'blue' : degrees < 290 ? 'purple' : degrees < 335 ? 'pink' : 'red';
};

/** What made a campaign news: its first big moment, else a famous screen, with where it happened. */
const momentOf = (campaign: Campaign): CampaignMoment | null => campaignMomentOf(campaign.formats, campaign.countryIds, campaign.places);

const words = (campaign: Campaign, service: string) => (campaign.subject.kind === 'SERVICE' ? service : campaign.subject.name);

const momentLines = (campaign: Campaign, service: string, colour: string, moment: CampaignMoment) => {
    const name = words(campaign, service);
    const city = cityOf(moment.countryId);
    const own = campaign.subject.kind === 'SERVICE';
    switch (moment.formatId) {
        case 'LANDMARK_LIGHT_SHOW': return {
            headline: `The ${moment.site} lit up for ${name}`,
            detail: own ? `${service} lit the ${moment.site} in ${city} in its own ${colour} for one night.`
                : `${service} lit the ${moment.site} in ${city} with ${name} for one night.`,
            fans: [`The ${moment.site} is wearing ${service} ${colour} tonight`, own ? `Walked past the ${moment.site} and it was just ${service}. ${city} is unreal tonight` : `Walked past the ${moment.site} and it was just ${name} all the way up. ${city} is unreal tonight`],
        };
        case 'BUILDING_REVEAL': return {
            headline: `${name} drops a tower-high poster in ${city}`,
            detail: `${service} unveiled a poster for ${name} the height of a building in ${city}.`,
            fans: [`Spotted: a ${name} poster the size of a building in ${city}`, `Someone hung ${name} off a whole tower in ${city} and I can't stop looking`],
        };
        case 'DRONE_SHOW': return {
            headline: `A thousand drones drew ${service} over ${city}`,
            detail: `${service}'s drone show for ${name} lit the sky over ${city}.`,
            fans: [`A thousand drones just drew the ${service} logo over ${city}`, `Okay ${service}, the drone show over ${city} was something else`],
        };
        case 'FAN_FESTIVAL': return {
            headline: `${name} fans pack a festival in ${city}`,
            detail: `${service} threw a fan festival for ${name} in ${city}, the cast on stage.`,
            fans: [`The ${name} festival in ${city} is packed and the cast just walked out`, `Queued two hours for the ${name} fan festival. Worth every minute`],
        };
        case 'LIVE_SHOW': return {
            headline: `${service} stages a live stunt show for ${name}`,
            detail: `A live stunt show in ${city}, streamed on ${service}, opened its campaign for ${name}.`,
            fans: [`That ${name} stunt show in ${city} was insane, they actually did it live`, `Watching the ${service} stunt show from ${city} with my jaw on the floor`],
        };
        default: return {
            headline: `${name} takes over ${moment.site}`,
            detail: `${service}'s campaign for ${name} filled the screens at ${moment.site}.`,
            fans: [`Spotted: ${name} all over ${moment.site}`, `${moment.site} is all ${name} tonight`],
        };
    }
};

/** #151: the launch campaign's opening night, in the words of an opening */
const openingLines = (service: string, colour: string, moment: CampaignMoment, countries: number, flagship: string) => {
    const city = cityOf(moment.countryId);
    const where = `in ${countries} ${countries === 1 ? 'country' : 'countries'}`;
    switch (moment.formatId) {
        case 'LANDMARK_LIGHT_SHOW': return {
            headline: `The ${moment.site} lit up for ${service}'s opening night`,
            detail: `${service} opened ${where} and lit the ${moment.site} in ${city} in its own ${colour}${flagship ? `, with ${flagship} premiering the same night` : ''}.`,
            fans: [`The ${moment.site} is wearing ${service} ${colour} tonight`, `${service} just opened and the ${moment.site} is all ${service}. ${city} is unreal tonight`],
        };
        case 'BUILDING_REVEAL': return {
            headline: `${service} opens with a tower-high poster in ${city}`,
            detail: `${service} opened ${where} and unveiled ${flagship ? `a ${flagship} poster` : 'its poster'} the height of a building in ${city}.`,
            fans: [`Spotted: a ${service} poster the size of a building in ${city}`, `${service} hung its opening poster off a whole tower in ${city} and I can't stop looking`],
        };
        case 'DRONE_SHOW': return {
            headline: `A thousand drones drew ${service} over ${city} on its opening night`,
            detail: `${service} opened ${where} with a drone show over ${city}.`,
            fans: [`A thousand drones just drew the ${service} logo over ${city}`, `Okay ${service}, that opening night over ${city} was something else`],
        };
        case 'FAN_FESTIVAL': return {
            headline: `${service} opens with a fan festival in ${city}`,
            detail: `${service} opened ${where} with a festival in ${city}${flagship ? `, the cast of ${flagship} on stage` : ''}.`,
            fans: [`The ${service} opening festival in ${city} is packed`, `Queued two hours for the ${service} launch party in ${city}. Worth every minute`],
        };
        case 'LIVE_SHOW': return {
            headline: `${service} opens with a live stunt show`,
            detail: `A live stunt show in ${city}, streamed on ${service}, opened the service ${where}.`,
            fans: [`${service} opened with a live stunt show in ${city} and they actually did it live`, `Watching the ${service} opening stunt show from ${city} with my jaw on the floor`],
        };
        default: return {
            headline: `${service} takes over ${moment.site} for its opening`,
            detail: `${service} filled the screens at ${moment.site} as it opened ${where}.`,
            fans: [`Spotted: ${service} all over ${moment.site}`, `${moment.site} is all ${service} tonight. Guess it's open`],
        };
    }
};

export interface StreamingCampaignNews {
    facts: IndustryEventFact[];
    /** the fans' posts around this pass's big moments and screen takeovers; #161: and everyone's posts about every campaign */
    buzz: XPost[];
    /** #161: the photos people share of what they saw in the street */
    insta: InstaPost[];
}

/** The player's campaigns in the news since the last industry pass, as facts stamped with this week, and their buzz. */
export const collectStreamingCampaignNews = (player: Player, sinceWeek: number, absoluteWeek: number): StreamingCampaignNews => {
    const platform = player.ownedStreamingPlatform;
    const slug = platform?.identity?.slug;
    const service = platform?.identity?.name?.trim();
    if (!platform?.launchCommit || !slug || !service) return { facts: [], buzz: [], insta: [] };
    const colour = colourWord(platform.identity.primaryColor || '');
    const from = Math.max(sinceWeek, absoluteWeek - LOOKBACK_WEEKS);
    const within = (week: number | null | undefined) => typeof week === 'number' && week >= from && week < absoluteWeek;
    const facts: IndustryEventFact[] = [];
    const buzz: XPost[] = [];
    const insta: InstaPost[] = [];
    /* #161: what people say, in their own voices: a line each, two people never the same, the first with the picture */
    const say = (owner: string, stage: string, made: IndustryEventFact, lines: ReactionLine[], loud: number, words: Record<string, string>,
        pictureMediaId: string | undefined, projectId: string | undefined, own = false) => {
        const rng = createDeterministicRng(`campaign-react:${owner}:${stage}`);
        const used = new Set<string>();
        /* #162: a few replies in the post's own mood */
        const replies = (tone: ReactionLine['tone']) => {
            const bank = REPLY_BANK[tone];
            const start = Math.floor(rng() * bank.length);
            return [0, 1, 2].map(index => fillReaction(bank[(start + index * 2) % bank.length], words));
        };
        lines.forEach((line, index) => {
            const pool = REACTION_VOICES[line.voice].filter(voice => !used.has(voice.handle));
            const voice = pool[Math.floor(rng() * pool.length)] ?? REACTION_VOICES[line.voice][0];
            used.add(voice.handle);
            const reach = loud * (line.tone === 'DOWN' ? 0.8 : 1);
            buzz.push({
                id: `x_campaign_${stage}_${owner}_${index}`,
                authorId: `${line.voice.toLowerCase()}_${voice.handle.replace(/[^a-z0-9]/gi, '')}`,
                authorName: voice.name,
                authorHandle: voice.handle,
                authorAvatar: createIndustryMediaAvatar(voice.name, voice.colour),
                content: fillReaction(own && line.own ? line.own : line.text, words),
                timestamp: absoluteWeek,
                likes: Math.round((300 + rng() * 1200) * reach),
                retweets: Math.round((40 + rng() * 200) * reach),
                replies: Math.round((15 + rng() * 80) * reach),
                isPlayer: false,
                isLiked: false,
                isRetweeted: false,
                isVerified: Boolean(voice.verified),
                postType: line.voice === 'TRADE' ? 'HOT_TAKE' : line.voice === 'CREATOR' ? 'FILM_OPINION' : 'GENERAL',
                sentiment: line.voice === 'TRADE' ? 'INDUSTRY' : line.tone === 'DOWN' ? 'MESSY' : line.tone === 'MIXED' ? 'FUNNY' : 'SUPPORTIVE',
                industryEventId: made.id,
                publishedAbsoluteWeek: absoluteWeek,
                companyId: slug,
                ...(projectId ? { projectId } : {}),
                ...(index === 0 && pictureMediaId ? { contentMediaId: pictureMediaId } : {}),
                replyList: replies(line.tone),
                quoteList: [fillReaction(QUOTE_BANK[line.tone][Math.floor(rng() * QUOTE_BANK[line.tone].length)], words)],
            });
        });
    };
    /* #161: a photo of what was seen in the street, shared on Instagram */
    const snap = (owner: string, made: IndustryEventFact, line: ReactionLine, loud: number, words: Record<string, string>, pictureMediaId: string, projectId: string | undefined,
        own = false, seen: keyof typeof COMMENT_BANK = 'STREET') => {
        const rng = createDeterministicRng(`campaign-snap:${owner}`);
        const voices = REACTION_VOICES[line.voice];
        const voice = voices[Math.floor(rng() * voices.length)];
        /* #162: the comments under it */
        const bank = COMMENT_BANK[seen];
        const first = Math.floor(rng() * bank.length);
        insta.push({
            id: `instagram_campaign_${owner}`,
            authorId: `${line.voice.toLowerCase()}_${voice.handle.replace(/[^a-z0-9]/gi, '')}`,
            authorName: voice.name,
            authorHandle: voice.handle,
            authorAvatar: createIndustryMediaAvatar(voice.name, voice.colour),
            type: 'LIFESTYLE',
            caption: `${fillReaction(own && line.own ? line.own : line.text, words)}${seen === 'AD' ? '' : ' 📸'}`,
            week: player.currentWeek,
            year: player.age,
            likes: Math.round((800 + rng() * 2400) * loud),
            comments: Math.round((20 + rng() * 120) * loud),
            shares: Math.round((10 + rng() * 60) * loud),
            mood: 'SUPPORTIVE',
            contentMediaId: pictureMediaId,
            commentList: [0, 1, 2, 3, 4].map(index => fillReaction(bank[(first + index * 3) % bank.length], words)),
            isPlayer: false,
            industryEventId: made.id,
            companyId: slug,
            ...(projectId ? { projectId } : {}),
        });
    };
    /* a big night or a screen takeover: its story, and two fans' posts in their own words, the first with the picture */
    const night = (owner: string, made: IndustryEventFact, big: boolean, fans: string[], pictureMediaId: string | undefined, projectId: string | undefined) => {
        facts.push(made);
        const rng = createDeterministicRng(`campaign-buzz:${owner}`);
        /* #162: their replies, glad of it */
        const replyRng = createDeterministicRng(`campaign-buzz-replies:${owner}`);
        const replyStart = Math.floor(replyRng() * REPLY_BANK.UP.length);
        /* two different fans */
        const FANS = REACTION_VOICES.FAN;
        const start = Math.floor(rng() * FANS.length);
        const authors = [FANS[start], FANS[(start + 1 + Math.floor(rng() * (FANS.length - 1))) % FANS.length]];
        fans.forEach((content, index) => {
            const fan = authors[index];
            const reach = big ? 6 : 2;
            buzz.push({
                id: `x_campaign_buzz_${owner}_${index}`,
                authorId: `fan_${fan.handle.slice(1)}`,
                authorName: fan.name,
                authorHandle: fan.handle,
                authorAvatar: createIndustryMediaAvatar(fan.name, fan.colour),
                content,
                timestamp: absoluteWeek,
                likes: Math.round((400 + rng() * 1600) * reach),
                retweets: Math.round((60 + rng() * 260) * reach),
                replies: Math.round((20 + rng() * 90) * reach),
                isPlayer: false,
                isLiked: false,
                isRetweeted: false,
                isVerified: false,
                postType: 'GENERAL',
                sentiment: 'SUPPORTIVE',
                industryEventId: made.id,
                publishedAbsoluteWeek: absoluteWeek,
                companyId: slug,
                ...(projectId ? { projectId } : {}),
                ...(index === 0 && pictureMediaId ? { contentMediaId: pictureMediaId } : {}),
                replyList: [0, 1, 2].map(step => REPLY_BANK.UP[(replyStart + index + step * 2) % REPLY_BANK.UP.length].replace(/\{name\}/g, service)),
            });
        });
    };

    /* #151: the launch campaign's opening night, the week after the service opened, when it spent and had a moment */
    const plan = platform.launchMarketingPlan;
    const opening = plan && plan.status !== 'CANCELLED' && plan.spentAmount > 0 && within(platform.launchCommit.committedAtAbsoluteWeek)
        ? campaignMomentOf(plan.formatIds ?? [], plan.openingCountryIds, plan.places) : null;
    if (plan && opening) {
        const flagship = plan.objective === 'FLAGSHIP_ORIGINAL' ? (platform.launchCommit.openingOriginalTitle || '').trim() : '';
        const lines = openingLines(service, colour, opening, plan.openingCountryIds.length, flagship);
        const big = CAMPAIGN_FORMATS[opening.formatId].group === 'BIG_MOMENT';
        night(plan.id, createIndustryEventFact({
            idempotencyKey: `streaming-campaign:${slug}:${plan.id}:moment`,
            absoluteWeek, type: 'PLATFORM_CAMPAIGN_MOMENT', importance: big ? 'HIGH' : 'MEDIUM',
            companyId: slug, companyName: service, platformId: slug,
            ...(plan.pictureMediaId ? { imageMediaId: plan.pictureMediaId } : {}),
            headline: lines.headline, detail: lines.detail,
            evidence: [{ kind: 'PLATFORM' as const, id: slug }, { kind: 'COUNTRY' as const, id: opening.countryId }],
        }), big, lines.fans, plan.pictureMediaId, undefined);
    }

    if (platform.campaignBook) normalizeCampaignBook(platform.campaignBook).campaigns.forEach(campaign => {
        const projectId = campaign.subject.kind === 'TITLE' ? campaign.subject.id : undefined;
        const evidence = (countryId?: string) => [
            { kind: 'PLATFORM' as const, id: slug },
            ...(projectId ? [{ kind: 'PROJECT' as const, id: projectId }] : []),
            ...(countryId ? [{ kind: 'COUNTRY' as const, id: countryId }] : []),
        ];
        const fact = (key: string, importance: IndustryEventFact['importance'], headline: string, detail: string, countryId?: string) => createIndustryEventFact({
            idempotencyKey: `streaming-campaign:${slug}:${campaign.id}:${key}`,
            absoluteWeek, type: 'PLATFORM_CAMPAIGN_MOMENT', importance,
            companyId: slug, companyName: service, platformId: slug,
            ...(projectId ? { projectId } : {}),
            ...(campaign.pictureMediaId ? { imageMediaId: campaign.pictureMediaId } : {}),
            headline, detail, evidence: evidence(countryId),
        });

        /* #161: its words: its name, the service, its biggest country's city, how many countries */
        const spending = campaign.weeks.filter(week => week.spend > 0);
        const homesOf = (countryId: string) => player.world.worldAudienceParticipation?.countries?.[countryId]?.streamingReachableHouseholds || 0;
        const biggest = [...campaign.countryIds].sort((left, right) => homesOf(right) - homesOf(left) || left.localeCompare(right))[0];
        const countries = `${campaign.countryIds.length} ${campaign.countryIds.length === 1 ? 'country' : 'countries'}`;
        const said = { name: words(campaign, service), service, city: biggest ? cityOf(biggest) : 'town', countries };
        const lead = leadingFormats(campaign.formats);
        /* the service's own campaign: its name is the service's, so the words say it once */
        const own = campaign.subject.kind === 'SERVICE';

        /* its night: the first week it spent */
        const first = spending[0];
        const moment = first && within(first.absoluteWeek) ? momentOf(campaign) : null;
        if (moment) {
            const lines = momentLines(campaign, service, colour, moment);
            const big = CAMPAIGN_FORMATS[moment.formatId].group === 'BIG_MOMENT';
            const made = fact('moment', big ? 'HIGH' : 'MEDIUM', lines.headline, lines.detail, moment.countryId);
            night(campaign.id, made, big, lines.fans, campaign.pictureMediaId, projectId);
            /* #161: and the crowd, in the words of its loudest other format */
            const crowd = lead.find(id => id !== moment.formatId) ?? moment.formatId;
            say(campaign.id, 'crowd', made, [FORMAT_REACTIONS[crowd].posts[0]], FORMAT_REACTIONS[crowd].loud, said, undefined, projectId, own);
            if (campaign.pictureMediaId) snap(campaign.id, made, FORMAT_REACTIONS[moment.formatId].posts[0], FORMAT_REACTIONS[moment.formatId].loud, said, campaign.pictureMediaId, projectId, own,
                CAMPAIGN_FORMATS[moment.formatId].group === 'BIG_MOMENT' ? 'NIGHT' : 'STREET');
        } else if (first && within(first.absoluteWeek) && lead.length) {
            /* #161: its first week, told by its loudest format; a second format's voice joins */
            const leader = FORMAT_REACTIONS[lead[0]];
            const made = fact('launch', 'MEDIUM', fillReaction(own ? leader.ownHeadline ?? leader.headline : leader.headline, said),
                fillReaction(own ? leader.ownDetail ?? leader.detail : leader.detail, said), biggest);
            facts.push(made);
            const lines = [...leader.posts.slice(0, 2), ...(lead[1] ? [FORMAT_REACTIONS[lead[1]].posts[0]] : [])];
            /* #162: the first post carries its picture (a photo of the street, or the ad itself, screenshotted) */
            say(campaign.id, 'launch', made, lines, leader.loud, said, campaign.pictureMediaId, projectId, own);
            /* what is seen in the street is photographed; #162: else its ad is shared */
            const seen = lead.find(id => FORMAT_REACTIONS[id].photo);
            const shared = lead.find(id => SHARE_REACTIONS[id]);
            if (seen && campaign.pictureMediaId) snap(campaign.id, made, FORMAT_REACTIONS[seen].posts[0], FORMAT_REACTIONS[seen].loud, said, campaign.pictureMediaId, projectId, own);
            else if (shared && campaign.pictureMediaId) snap(campaign.id, made, SHARE_REACTIONS[shared]!, FORMAT_REACTIONS[shared].loud, said, campaign.pictureMediaId, projectId, own, 'AD');
        }

        /* #161: a week mid-run (its third): still talked about, or tiring people out when it runs all-out or long */
        const third = spending[2];
        const budget = campaign.budget;
        const long = budget.kind === 'ALWAYS_ON' || ((budget.kind === 'WEEKS' || budget.kind === 'BURST') && budget.weeks >= 4);
        if (third && within(third.absoluteWeek) && long) {
            const tiring = budget.kind === 'ALWAYS_ON' || (budget.kind === 'WEEKS' && (budget.strength >= 2 || budget.weeks >= 8));
            const loud = Math.max(1, ...campaign.formats.map(id => FORMAT_REACTIONS[id].loud));
            const weeksSaid = { ...said, week: String(spending.length), weeks: String(budget.kind === 'WEEKS' || budget.kind === 'BURST' ? budget.weeks : spending.length) };
            const rng = createDeterministicRng(`campaign-mid:${campaign.id}`);
            const pick = (lines: ReactionLine[], count: number) => {
                const start = Math.floor(rng() * lines.length);
                return Array.from({ length: Math.min(count, lines.length) }, (_, index) => lines[(start + index) % lines.length]);
            };
            if (tiring) {
                const made = fact('fatigue', 'MEDIUM', fillReaction(own ? FATIGUE_STORY.ownHeadline : FATIGUE_STORY.headline, weeksSaid), fillReaction(FATIGUE_STORY.detail, weeksSaid), biggest);
                facts.push(made);
                say(campaign.id, 'fatigue', made, pick(FATIGUE_REACTIONS, 2), loud, weeksSaid, undefined, projectId, own);
            } else {
                const made = fact('mid', 'LOW', `${said.name} keeps people talking`, `Three weeks into ${service}'s campaign for ${said.name}, people are still posting about it.`, biggest);
                facts.push(made);
                say(campaign.id, 'mid', made, pick(MID_REACTIONS, 1), loud, weeksSaid, undefined, projectId, own);
            }
        }

        /* its end: a big result celebrated; #161: a dear one criticised */
        if (campaign.status !== 'RUNNING' && campaign.status !== 'PAUSED' && within(campaign.endedAtAbsoluteWeek)) {
            const joins = campaign.weeks.reduce((sum, week) => sum + week.joins, 0);
            const ran = campaign.weeks.filter(week => week.spend > 0).length;
            const endSaid = {
                ...said, joins: short(joins), cost: joins > 0 ? perMember(campaign.spent / joins) : 'nothing', money: money(campaign.spent),
                weeks: String(ran), weeksWords: `${ran} ${ran === 1 ? 'week' : 'weeks'}`,
                joinsWords: joins > 0 ? `${short(joins)} new ${joins === 1 ? 'member' : 'members'}: about ${perMember(campaign.spent / joins)} each` : 'no new members to speak of',
            };
            if (joins >= CAMPAIGN_NEWS_RESULT_JOINS) {
                const made = fact('result', 'MEDIUM', campaign.subject.kind === 'SERVICE'
                    ? `${service}'s own campaign brought ${short(joins)} new members`
                    : `${campaign.subject.name} campaign brought ${short(joins)} new members to ${service}`,
                    `${money(campaign.spent)} over ${ran} ${ran === 1 ? 'week' : 'weeks'} in ${campaign.countryIds.length} ${campaign.countryIds.length === 1 ? 'country' : 'countries'}; about ${money(campaign.spent / joins)} a member.`);
                facts.push(made);
                say(campaign.id, 'result', made, RESULT_REACTIONS, 3, endSaid, undefined, projectId, own);
            } else if (campaign.spent >= CAMPAIGN_NEWS_FLOP_SPEND && (joins === 0 || campaign.spent / joins >= CAMPAIGN_NEWS_FLOP_PER_MEMBER)) {
                const made = fact('flop', 'MEDIUM', fillReaction(own ? FLOP_STORY.ownHeadline : FLOP_STORY.headline, endSaid), fillReaction(FLOP_STORY.detail, endSaid));
                facts.push(made);
                say(campaign.id, 'flop', made, FLOP_REACTIONS, 3, endSaid, undefined, projectId, own);
            }
        }
    });
    /* #152: the rivals' campaigns: their big nights and famous screens, in their own names and colours */
    Object.values(player.world.platforms || {}).sort((left, right) => left.id.localeCompare(right.id)).forEach(rival => {
        if (!rival.ai?.campaignBook) return;
        const rivalColour = colourWord(resolveStreamingPlatformBrandById(rival.id, rival.name).primaryColor);
        normalizeCampaignBook(rival.ai.campaignBook).campaigns.forEach(campaign => {
            const first = campaign.weeks.find(week => week.spend > 0);
            const moment = first && within(first.absoluteWeek) ? momentOf(campaign) : null;
            if (!moment) return;
            const lines = momentLines(campaign, rival.name, rivalColour, moment);
            const big = CAMPAIGN_FORMATS[moment.formatId].group === 'BIG_MOMENT';
            const projectId = campaign.subject.kind === 'TITLE' ? campaign.subject.id : undefined;
            const made = createIndustryEventFact({
                idempotencyKey: `rival-campaign:${rival.id}:${campaign.id}:moment`,
                absoluteWeek, type: 'PLATFORM_CAMPAIGN_MOMENT', importance: big ? 'HIGH' : 'MEDIUM',
                companyId: rival.id, companyName: rival.name, platformId: rival.id,
                ...(projectId ? { projectId } : {}),
                headline: lines.headline, detail: lines.detail,
                evidence: [{ kind: 'PLATFORM' as const, id: rival.id }, ...(projectId ? [{ kind: 'PROJECT' as const, id: projectId }] : []), { kind: 'COUNTRY' as const, id: moment.countryId }],
            });
            if (big) night(campaign.id, made, true, lines.fans, undefined, projectId);
            else facts.push(made);
        });
    });
    return { facts, buzz, insta };
};

/** One of a campaign's stories or posts, as its page lists them. */
export interface StreamingCampaignStory {
    id: string;
    kind: 'NEWS' | 'X' | 'INSTAGRAM';
    source: string;
    text: string;
    imageMediaId?: string;
}

/** A campaign's stories and posts: what its facts became in the News, on X (the fans' buzz names the same fact) and on
    Instagram. A fact's id comes from its key, so the campaign finds them without keeping a list. */
export const streamingCampaignStories = (player: Player, campaignId: string): StreamingCampaignStory[] => {
    const slug = player.ownedStreamingPlatform?.identity?.slug || '';
    /* #161: its first week, mid-run and end stories too */
    const factIds = new Set(['moment', 'launch', 'mid', 'fatigue', 'result', 'flop'].map(key => createDeterministicId('industry_event', `streaming-campaign:${slug}:${campaignId}:${key}`)));
    const mine = (id?: string) => Boolean(id && factIds.has(id));
    return [
        ...(player.news || []).filter(item => mine(item.industryEventId))
            .map(item => ({ id: item.id, kind: 'NEWS' as const, source: item.sourceName || 'News', text: item.headline, ...(item.imageMediaId ? { imageMediaId: item.imageMediaId } : {}) })),
        ...(player.x?.feed || []).filter(post => mine(post.industryEventId))
            .map(post => ({ id: post.id, kind: 'X' as const, source: `${post.authorName} ${post.authorHandle}`, text: post.content, ...(post.contentMediaId ? { imageMediaId: post.contentMediaId } : {}) })),
        ...(player.instagram?.feed || []).filter(post => mine(post.industryEventId))
            .map(post => ({ id: post.id, kind: 'INSTAGRAM' as const, source: post.authorHandle, text: post.caption, ...(post.contentMediaId ? { imageMediaId: post.contentMediaId } : {}) })),
    ];
};
