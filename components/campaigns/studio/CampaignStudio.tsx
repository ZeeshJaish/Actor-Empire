/**
 * THE CAMPAIGN STUDIO (#146; plan §20.9 G and §20.10, Zeesh: "डेडिकेटेड कैंपेन पेज … कैंपेन हम लोग दो तीन टाइप").
 * One room for every campaign, driven by the campaign engine (#145).
 *  - The hub: what is running (week x of y, a pot's money spent, always-on's week), what it has brought (joins, per
 *    join), and past campaigns graded by what a join cost; New campaign in the pinned bar.
 *  - The builder, a step at a time with the action pinned: What (the service, a title, a universe or a franchise) →
 *    Where (everywhere you are live, a region, or picked countries) → How (the formats, grouped, priced, a big moment
 *    with its energy and its landmark) → Budget (a one-time burst, a pot, or always-on) → Review, then Launch.
 *  - #155 (plan §20.13, Zeesh: "how me sab ke rates dikh rhe and fir budget me jao to alag cheeze … always on option
 *    hata ke and a pot option hata ke"): How prices each format for a week in the picked countries (its rate card,
 *    #154) and the pinned bar adds the picks up; a big moment is one night at a place, changeable under the grid;
 *    Budget is a week of what you picked × weeks (1–12) and how hard (Normal, Strong ×1.5, All-out ×2), with the
 *    total, the first week, the energy to commission (5 + each big moment's, at most 20) and a month's awareness;
 *    Review repeats them. A running campaign is extended from its page (+1 week, +4 weeks).
 *  - #149: a campaign opens its own page (CampaignPage.tsx): the hero scene, week by week, by country, the placements,
 *    its news; Stop and Top up while it runs, Run again (the builder filled in) and Open title after.
 * Launch is the only thing that saves (the HQ's persist); nothing loads on a tap. A launched campaign's picture for the
 * news is drawn after the launch is on screen.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import css from './CampaignStudio.module.css';
import type { Campaign, CampaignBudget, CampaignFormatId, Player } from '../../../types';
import { Poster } from '../../../content-market-exact/Poster';
import { Mark, brandColor, type Brand } from '../../streaming-transplant/StreamingBrandVisuals';
import { titleHue } from '../../streaming-transplant/audienceRoomModel';
import { CAMPAIGN_FORMATS, CAMPAIGN_FORMAT_ORDER, campaignFormatIn, campaignMomentOf, type CampaignFormat } from '../../../services/campaigns/campaignFormats';
import {
    extendStreamingCampaign,
    streamingCampaignExtensionPrice,
    quoteStreamingCampaign,
    startStreamingCampaign,
    stopStreamingCampaign,
    streamingCampaignRateCard,
    streamingCampaignBook,
    streamingCampaignMarkets,
    streamingCampaignRegions,
    streamingCampaignSubjects,
    topUpStreamingCampaign,
    type StreamingCampaignDraft,
    type StreamingCampaignProblem,
    type StreamingCampaignSubject,
} from '../../../services/campaigns/streamingCampaigns';
import { CAMPAIGN_MAX_WEEKS, CAMPAIGN_STRENGTHS, campaignMoneyLeft } from '../../../services/campaigns/campaignEngine';
import { getAbsoluteWeek } from '../../../services/legacyLogic';
import { getStreamingDayOneMarket } from '../../../services/streamingDayOneMarkets';
import { CountryFlagSvg } from '../../studio-finance/components/FlagField';
import { CAMPAIGN_SCENES, type CampaignSceneId } from '../scenes/sceneCatalogue';
import type { CreativeSubject } from '../scenes/defaultCreative';
import { creativeFramesOf, creativeIdsFor } from '../creatives/creativeFrames';
import { CreativeLive, CreativeStep, FrameThumb, sceneOfFormat, sceneOfFrame, useMadeForYou, type Creative, type KeptCreative } from '../creatives/CreativeStep';
import { FormatPicture } from '../scenes/FormatPicture';
import { newCreativeId } from '../creatives/creativeMedia';
import { keepCampaignPicture } from '../creatives/campaignPicture';
import { streamingCampaignStories } from '../../../services/campaigns/streamingCampaignNews';
import { CampaignPage } from './CampaignPage';
import { FormatGlyph } from './formatGlyphs';
import { STRENGTH_WORDS } from './campaignWords';
import creativeCss from '../creatives/Creatives.module.css';
import { runTaskAd } from '../../../services/forcedAds';
import { streamingPlusLocks } from '../../../services/streamingPlusPack';
import { openStreamingPlusSheet } from '../../../services/streamingPlusEvents';
import { StreamingPlusChip } from '../../streamingPlus/StreamingPlusParts';

export type Step = 'WHAT' | 'WHERE' | 'HOW' | 'CREATIVE' | 'BUDGET' | 'REVIEW';
const STEPS: Step[] = ['WHAT', 'WHERE', 'HOW', 'CREATIVE', 'BUDGET', 'REVIEW'];
const STEP_WORDS: Record<Step, string> = { WHAT: 'What', WHERE: 'Where', HOW: 'How', CREATIVE: 'Creative', BUDGET: 'Budget', REVIEW: 'Review' };
const GROUPS: Array<{ id: CampaignFormat['group']; label: string; line: string }> = [
    { id: 'ONLINE', label: 'Online', line: 'A week in your countries' },
    { id: 'OUT_OF_HOME', label: 'Out of home & TV', line: 'Boards, wraps, screens and spots' },
    { id: 'BIG_MOMENT', label: 'Big moments', line: 'One night, one place, a little energy' },
];
const PROBLEM_WORDS: Record<StreamingCampaignProblem, string> = {
    NOT_LIVE: 'Campaigns start once the service is live.',
    NO_SUBJECT: 'Pick what the campaign is about.',
    NO_COUNTRIES: 'Pick where it runs.',
    NO_FORMATS: 'Pick at least one format.',
    BUDGET_NOT_ALLOWED: 'A format you picked cannot run on this budget.',
    FORMAT_NOWHERE: 'A format you picked has no site in these countries.',
    TOO_SMALL: 'Nothing you picked runs in these countries.',
    TREASURY: 'The treasury cannot pay for it in full, and a campaign is paid when it starts.',
    ENERGY: 'Not enough energy to commission it.',
    STREAMING_PLUS: 'A format you picked is part of the Streaming+ Pack.',
};

/* #151: the launch campaign's push, in the launch builder's words */
const LAUNCH_PUSH_WORDS: Record<string, string> = {
    PLATFORM_INTRODUCTION: 'The service', CATALOGUE_SHOWCASE: 'The catalogue', FLAGSHIP_ORIGINAL: 'A flagship original', VALUE_PROPOSITION: 'The price',
};

const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `$${Math.round(value / 1e3)}K` : `$${Math.round(value)}`);
const count = (value: number) => (value >= 1e9 ? `${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${Math.round(value / 1e3)}K` : String(Math.round(value)));
const countryName = (id: string) => getStreamingDayOneMarket(id)?.country || id;
/* a big moment's place: its landmark or screen and the country, or the country */
const nightPlace = (formatId: CampaignFormatId, countryId: string) => {
    const site = CAMPAIGN_FORMATS[formatId].sites?.[countryId];
    return site ? `${site}, ${countryName(countryId)}` : countryName(countryId);
};
/* "at the Burj Khalifa, United Arab Emirates", "in the United States", "in Brazil" */
const nightAt = (formatId: CampaignFormatId, countryId: string) => {
    if (CAMPAIGN_FORMATS[formatId].sites?.[countryId]) return `at ${nightPlace(formatId, countryId)}`;
    const name = countryName(countryId);
    return `in ${/^(United|Netherlands|Philippines|Czech|Dominican|Bahamas|Maldives)/.test(name) ? 'the ' : ''}${name}`;
};

/** what a campaign's made-for-you creatives are drawn from: the title's poster (a universe's lead title), or the service */
const creativeSubjectOf = (subject: { kind: StreamingCampaignSubject['kind']; id: string; name: string; projectIds: string[] }, brand: Brand, genreOf: (id: string) => string | undefined): CreativeSubject => {
    const service = brand.name || 'EMPIRE+';
    if (subject.kind === 'SERVICE') return { title: service, service, hue: brand.hue, brandHue: brand.hue, kind: 'SERVICE', art: null };
    const lead = subject.kind === 'TITLE' ? subject.id : subject.projectIds[0];
    return {
        title: subject.name, service, hue: titleHue(lead || subject.id), brandHue: brand.hue, kind: subject.kind,
        art: lead ? { id: lead, genre: genreOf(lead) || 'DRAMA', hue: titleHue(lead) } : null,
    };
};

const SubjectArt: React.FC<{ subject: Pick<StreamingCampaignSubject, 'kind' | 'id' | 'name' | 'genre'>; brand: Brand }> = ({ subject, brand }) => (
    subject.kind === 'SERVICE'
        ? <span className={css.markArt}><Mark brand={brand} /></span>
        : <span className={css.posterArt}><Poster id={subject.id} title={subject.name} genre={subject.genre || 'DRAMA'} hue={titleHue(subject.id)} size="xs" bare /></span>
);

/* past campaigns graded by what a join cost against each other */
const gradesOf = (rows: Array<{ id: string; perJoin: number | null }>) => {
    const priced = rows.filter(row => row.perJoin !== null).sort((left, right) => left.perJoin! - right.perJoin!);
    return new Map(priced.map((row, index) => {
        const at = priced.length > 1 ? index / (priced.length - 1) : 0;
        return [row.id, at <= 0.25 ? 'S' : at <= 0.5 ? 'A' : at <= 0.75 ? 'B' : 'C'] as const;
    }));
};

interface Props {
    player: Player;
    brand: Brand;
    onUpdatePlayer: (player: Player) => void;
    onClose: () => void;
    /** open the builder on this subject (a title's "Promote") */
    initialSubject?: { kind: StreamingCampaignSubject['kind']; id: string } | null;
    /** a title's own page (#149: Open title on a campaign's page) */
    onOpenTitle?: (projectId: string) => void;
    /** open on this campaign's page (#150: a title page's "Campaigns · N") */
    initialCampaignId?: string | null;
}

/** a campaign to build again (#149 Run again): its subject, where, formats, budget and creatives */
export interface BuilderDraft {
    subject: { kind: StreamingCampaignSubject['kind']; id: string };
    where: StreamingCampaignDraft['where'];
    formats: CampaignFormatId[];
    budget: CampaignBudget;
    creativeIds?: Partial<Record<CampaignFormatId, string>>;
    places?: Partial<Record<CampaignFormatId, string>>;
}
export const draftOf = (campaign: Campaign): BuilderDraft => ({
    subject: { kind: campaign.subject.kind, id: campaign.subject.id },
    where: campaign.where.kind === 'COUNTRIES' ? { kind: 'COUNTRIES', countryIds: campaign.countryIds }
        : campaign.where.kind === 'REGION' ? { kind: 'REGION', regionId: campaign.where.regionId } : { kind: 'LIVE' },
    formats: campaign.formats,
    /* #155: the builder makes weeks only; a burst comes back with its weeks, a pot or always-on with four */
    budget: campaign.budget.kind === 'WEEKS' ? { ...campaign.budget, weeks: Math.min(CAMPAIGN_MAX_WEEKS, campaign.budget.weeks) }
        : { kind: 'WEEKS', weeks: campaign.budget.kind === 'BURST' ? campaign.budget.weeks : 4, strength: 1 },
    ...(campaign.creativeIds ? { creativeIds: campaign.creativeIds } : {}),
    ...(campaign.places ? { places: campaign.places } : {}),
});

export const CampaignStudio: React.FC<Props> = ({ player, brand, onUpdatePlayer, onClose, initialSubject = null, onOpenTitle, initialCampaignId = null }) => {
    const accent = brandColor(brand);
    const [building, setBuilding] = useState(Boolean(initialSubject));
    const [launched, setLaunched] = useState<string | null>(null);
    const [openId, setOpenId] = useState<string | null>(initialCampaignId);
    const [liveScene, setLiveScene] = useState<{ sceneId: CampaignSceneId; creative: Creative | null; label: string } | null>(null);
    const [again, setAgain] = useState<BuilderDraft | null>(null);
    /* the scenes' half-size backdrops (#156: the How cards') load in the background when the Studio opens, never on a
       tap; a full backdrop loads when its scene opens */
    useEffect(() => { Object.values(CAMPAIGN_SCENES).forEach(scene => { const image = new Image(); image.decoding = 'async'; image.src = scene.thumb; }); }, []);
    const book = streamingCampaignBook(player.ownedStreamingPlatform);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const markets = useMemo(() => streamingCampaignMarkets(player), [player]);
    /* a campaign keeps its subject's id; its poster reads the title's genre from the catalogue */
    const genres = useMemo(() => new Map(streamingCampaignSubjects(player).map(item => [item.id, item.genre])), [player]);
    const art = (campaign: typeof book.campaigns[number]) => ({ ...campaign.subject, genre: genres.get(campaign.subject.id) });
    const live = book.campaigns.filter(campaign => campaign.status === 'RUNNING' || campaign.status === 'PAUSED');
    const past = book.campaigns.filter(campaign => campaign.status === 'FINISHED' || campaign.status === 'STOPPED').slice().reverse();
    const joinsOf = (campaign: typeof book.campaigns[number]) => campaign.weeks.reduce((sum, item) => sum + item.joins, 0);
    const grades = gradesOf(past.map(campaign => ({ id: campaign.id, perJoin: joinsOf(campaign) > 0 ? campaign.spent / joinsOf(campaign) : null })));
    const thisWeek = live.reduce((sum, campaign) => sum + (campaign.weeks.find(item => item.absoluteWeek === week)?.spend || 0), 0);
    const recent = book.campaigns.flatMap(campaign => campaign.weeks).filter(item => item.absoluteWeek > week - 4);
    const recentJoins = recent.reduce((sum, item) => sum + item.joins, 0);
    const recentSpend = recent.reduce((sum, item) => sum + item.spend, 0);
    /* #151: the launch campaign, once it has spent, ends the past campaigns as the service's first */
    const launchPlan = player.ownedStreamingPlatform?.launchMarketingPlan;
    const launchRow = launchPlan && (launchPlan.status === 'SPENDING' || launchPlan.status === 'SETTLED') ? launchPlan : null;
    const openingMembers = player.ownedStreamingPlatform?.launchCommit?.initialSubscribers || 0;

    if (building) {
        return (
            <CampaignBuilder player={player} brand={brand} accent={accent} initialSubject={again ? null : initialSubject} initialDraft={again}
                onCancel={() => { setAgain(null); if (initialSubject && !again) onClose(); else setBuilding(false); }}
                onLaunch={(next, id) => { onUpdatePlayer(next); setLaunched(id); setAgain(null); setBuilding(false); }} />
        );
    }

    const open = book.campaigns.find(campaign => campaign.id === openId) || null;
    if (open) {
        const lead = open.subject.kind === 'SERVICE' ? null : open.subject.kind === 'TITLE' ? open.subject.id : open.subject.projectIds[0] ?? null;
        const awareness = open.subject.kind === 'SERVICE' ? book.serviceAwareness : lead ? book.titleAwareness[lead] ?? {} : {};
        /* its stories and posts: what its facts (#149) became in the News, on X and on Instagram */
        const news = streamingCampaignStories(player, open.id);
        return (
            <>
                <CampaignPage campaign={open} week={week} accent={accent} grade={grades.get(open.id) ?? null} awareness={awareness} news={news}
                    creative={creativeSubjectOf(open.subject, brand, id => genres.get(id))}
                    onClose={() => setOpenId(null)}
                    onStop={() => { const result = stopStreamingCampaign(player, open.id); if (result.ok) onUpdatePlayer(result.player); }}
                    onTopUp={amount => { const result = topUpStreamingCampaign(player, open.id, amount); if (result.ok) onUpdatePlayer(result.player); }}
                    moneyLeft={campaignMoneyLeft(open, open.countryIds.map(id => markets.get(id)).filter((market): market is NonNullable<typeof market> => Boolean(market)))}
                    onExtend={weeks => { const result = extendStreamingCampaign(player, open.id, weeks); if (result.ok) onUpdatePlayer(result.player); }}
                    extendPrice={weeks => streamingCampaignExtensionPrice(player, open, weeks)}
                    treasury={player.ownedStreamingPlatform?.treasuryCash ?? 0}
                    onRunAgain={() => { setAgain(draftOf(open)); setOpenId(null); setLaunched(null); setBuilding(true); }}
                    onOpenTitle={lead && onOpenTitle ? () => onOpenTitle(lead) : undefined}
                    onLive={(sceneId, creative, label) => setLiveScene({ sceneId, creative, label })} />
                {liveScene && <CreativeLive sceneId={liveScene.sceneId} creative={liveScene.creative} label={liveScene.label} onClose={() => setLiveScene(null)} />}
            </>
        );
    }
    return (
        <div className={css.studio} role="dialog" aria-modal="true" aria-label="Campaign Studio" style={{ ['--cs-accent' as string]: accent }}>
            <header className={css.top}>
                <button type="button" className={css.back} onClick={onClose} aria-label="Back">←</button>
                <div className={css.title}><b>CAMPAIGN STUDIO</b><span>WHAT · WHERE · HOW · HOW MUCH</span></div>
                <span className={css.mark}><Mark brand={brand} /></span>
            </header>
            <div className={css.stats}>
                <div><span>RUNNING</span><b>{live.length}</b></div>
                <div><span>THIS WEEK</span><b>{money(thisWeek)}</b></div>
                <div><span>JOINS · 4 WK</span><b className={recentJoins > 0 ? css.good : ''}>{recentJoins > 0 ? `+${count(recentJoins)}` : '—'}</b></div>
                <div><span>PER JOIN</span><b>{recentJoins > 0 ? `$${Math.round(recentSpend / recentJoins)}` : '—'}</b></div>
            </div>
            <div className={css.scroll}>
                {launched && <p className={css.toast} role="status">Launched. It runs from next week; its results arrive as the weeks settle.</p>}
                <div className={css.sh}><h2>Running</h2><span>{live.length ? `${live.length} now` : 'none yet'}</span></div>
                {live.length === 0 ? (
                    <div className={css.empty}>
                        {/* the backdrop is set here, not in the stylesheet, so bundles that read the CSS need no image */}
                        <span className={css.emptyArt} aria-hidden="true" style={{ backgroundImage: `url('${CAMPAIGN_SCENES.BURJ_KHALIFA.backdrop}')` }} />
                        <b>No campaign is running</b>
                        <span>Sell the service, push a title, or light up a landmark. Every format runs in the countries you pick.</span>
                    </div>
                ) : live.map((campaign, index) => {
                    const spent = campaign.spent;
                    const joins = joinsOf(campaign);
                    const doneWeeks = campaign.weeks.filter(item => item.spend > 0).length;
                    const progress = campaign.budget.kind === 'BURST' || campaign.budget.kind === 'WEEKS' ? doneWeeks / campaign.budget.weeks
                        : campaign.budget.kind === 'POT' ? spent / Math.max(1, campaign.budget.total + campaign.toppedUp) : 1;
                    const where = campaign.where.kind === 'LIVE' ? `Everywhere live · ${campaign.countryIds.length}` : campaign.where.kind === 'REGION'
                        ? `${campaign.where.regionId?.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())} · ${campaign.countryIds.length}`
                        : campaign.countryIds.length === 1 ? countryName(campaign.countryIds[0]) : `${campaign.countryIds.length} countries`;
                    return (
                        <button type="button" key={campaign.id} className={cx(css.card, css.rise)} style={{ ['--i' as string]: index }} onClick={() => setOpenId(campaign.id)}>
                            <SubjectArt subject={art(campaign)} brand={brand} />
                            <span className={css.cardBody}>
                                <small>{campaign.subject.kind === 'SERVICE' ? 'THE SERVICE' : campaign.subject.kind} · {where.toUpperCase()}</small>
                                <b>{campaign.name}</b>
                                {/* #167: started by the team */}
                                {campaign.runBy && <span className={css.runBy}>Run by {campaign.runBy.name.split(' ')[0]}</span>}
                                <span className={css.formats}>{campaign.formats.map(id => <i key={id} title={CAMPAIGN_FORMATS[id].name}><FormatGlyph id={id} /></i>)}</span>
                                <span className={css.bar}><i style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }} /></span>
                                <em>{campaign.status === 'PAUSED' ? 'Waiting for money in the treasury'
                                    : doneWeeks === 0 ? 'Starts next week'
                                    : campaign.budget.kind === 'BURST' || campaign.budget.kind === 'WEEKS' ? `Week ${doneWeeks} of ${campaign.budget.weeks}`
                                        : campaign.budget.kind === 'POT' ? `${money(spent)} of ${money(campaign.budget.total + campaign.toppedUp)}`
                                            : `${money(campaign.budget.monthly / 4.33)} a week · always on`}</em>
                            </span>
                            <span className={css.cardNums}>
                                <b className={joins > 0 ? css.good : ''}>{joins > 0 ? `+${count(joins)}` : '—'}</b><small>JOINS</small>
                                <b>{joins > 0 ? `$${Math.round(spent / joins)}` : '—'}</b><small>PER JOIN</small>
                            </span>
                        </button>
                    );
                })}
                {(past.length > 0 || launchRow) && (
                    <>
                        <div className={css.sh}><h2>Past campaigns</h2><span>graded by cost per join</span></div>
                        <div className={css.past}>
                            {past.slice(0, 12).map(campaign => {
                                const joins = joinsOf(campaign);
                                const grade = grades.get(campaign.id);
                                return (
                                    <button type="button" key={campaign.id} className={css.pastRow} onClick={() => setOpenId(campaign.id)}>
                                        <SubjectArt subject={art(campaign)} brand={brand} />
                                        <span><b>{campaign.name}</b><small>{campaign.endReason === 'STOPPED' ? 'Stopped' : campaign.endReason === 'SPENT' ? 'Pot spent' : 'Done'} · {money(campaign.spent)} · {joins > 0 ? `+${count(joins)} joins` : 'no joins credited'}</small></span>
                                        {grade ? <i className={css[`grade${grade}`]}>{grade}</i> : <i className={css.gradeNone}>—</i>}
                                    </button>
                                );
                            })}
                            {launchRow && (
                                <div className={css.pastRow} aria-label="Launch campaign">
                                    <SubjectArt subject={{ kind: 'SERVICE', id: 'service', name: brand.name }} brand={brand} />
                                    <span><b>Launch campaign</b><small>{LAUNCH_PUSH_WORDS[launchRow.objective]} · {money(launchRow.spentAmount)} · {launchRow.openingCountryIds.length} opening {launchRow.openingCountryIds.length === 1 ? 'country' : 'countries'}{launchRow.status === 'SPENDING' ? ' · spending' : ''}{openingMembers ? ` · ${count(openingMembers)} members at opening` : ''}</small></span>
                                    <i className={css.gradeNone}>—</i>
                                </div>
                            )}
                        </div>
                    </>
                )}
                <p className={css.note}>Earlier pushes from the Growth War Room are in Audience → CAMPAIGNS.</p>
            </div>
            <div className={css.pin}>
                <button type="button" className={css.primary} onClick={() => { setLaunched(null); setBuilding(true); }}>
                    <span><b>New campaign</b><small>The service, a title, a universe</small></span><i aria-hidden="true">+</i>
                </button>
            </div>
        </div>
    );
};

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/* ── the builder ── */

export const CampaignBuilder: React.FC<{
    player: Player;
    brand: Brand;
    accent: string;
    initialSubject: Props['initialSubject'];
    initialDraft?: BuilderDraft | null;
    /** the step it opens on (Run again: Review; a title's Promote: Where); the audits open any step */
    initialStep?: Step;
    onCancel: () => void;
    onLaunch: (player: Player, campaignId: string) => void;
}> = ({ player, brand, accent, initialSubject, initialDraft = null, initialStep, onCancel, onLaunch }) => {
    const subjects = useMemo(() => streamingCampaignSubjects(player), [player]);
    const markets = useMemo(() => streamingCampaignMarkets(player), [player]);
    const regions = useMemo(() => streamingCampaignRegions(player).sort((left, right) => right.countryIds.length - left.countryIds.length), [player]);
    /* Run again opens on Review with everything filled in; a title's Promote on Where */
    const known = Boolean(initialSubject) && subjects.some(item => item.kind === initialSubject!.kind && item.id === initialSubject!.id);
    const [step, setStep] = useState<Step>(initialStep ?? (initialDraft ? 'REVIEW' : known ? 'WHERE' : 'WHAT'));
    const first = initialDraft?.subject ?? initialSubject;
    const [subjectKey, setSubjectKey] = useState<string | null>(initialDraft ? `${initialDraft.subject.kind}:${initialDraft.subject.id}` : known && first ? `${first.kind}:${first.id}` : null);
    const [subjectTab, setSubjectTab] = useState<'SERVICE' | 'TITLES' | 'WORLDS'>('TITLES');
    const [where, setWhere] = useState<StreamingCampaignDraft['where']>(initialDraft?.where ?? { kind: 'LIVE' });
    const [formats, setFormats] = useState<CampaignFormatId[]>(initialDraft?.formats ?? []);
    /* #155: weeks and how hard; a big moment's place */
    const startBudget = initialDraft?.budget;
    const [weeks, setWeeks] = useState(startBudget?.kind === 'WEEKS' || startBudget?.kind === 'BURST' ? Math.min(CAMPAIGN_MAX_WEEKS, startBudget.weeks) : 4);
    const [strength, setStrength] = useState<number>(startBudget?.kind === 'WEEKS' ? startBudget.strength : 1);
    const [places, setPlaces] = useState<Partial<Record<CampaignFormatId, string>>>(initialDraft?.places ?? {});
    const [placing, setPlacing] = useState<CampaignFormatId | null>(null);
    const [placingAll, setPlacingAll] = useState(false);
    /* #148: the creatives you uploaded, by frame (the rest are made for you) */
    const [kept, setKept] = useState<Record<string, KeptCreative | undefined>>(() => Object.fromEntries(creativeFramesOf(initialDraft?.formats ?? [])
        .filter(frame => initialDraft?.creativeIds?.[frame.formats[0]])
        .map(frame => [frame.key, { mediaId: initialDraft!.creativeIds![frame.formats[0]]!, canvas: null }])));
    const subject = subjects.find(item => `${item.kind}:${item.id}` === subjectKey) || null;
    const frames = useMemo(() => creativeFramesOf(formats), [formats]);
    const creativeSubject = useMemo(() => (subject ? creativeSubjectOf(subject, brand, id => subjects.find(item => item.kind === 'TITLE' && item.id === id)?.genre) : null),
        [subject, brand, subjects]);
    /* #156: every format's frame, from How on: How's cards show each format with its creative */
    const allFrames = useMemo(() => creativeFramesOf(CAMPAIGN_FORMAT_ORDER), []);
    const made = useMadeForYou(creativeSubject, allFrames, step !== 'WHAT' && step !== 'WHERE');
    const creativeOf = (formatId: CampaignFormatId) => {
        /* search ads carry no image of their own: their result shows the square one */
        const frame = allFrames.find(item => item.formats.includes(formatId)) ?? allFrames.find(item => item.key === '1:1');
        return frame ? (kept[frame.key]?.canvas ?? made[frame.key] ?? null) : null;
    };
    const yours = frames.filter(frame => kept[frame.key]).length;
    /* only big moments: one night, no weeks */
    const flowing = formats.filter(id => CAMPAIGN_FORMATS[id].group !== 'BIG_MOMENT');
    const nights = formats.filter(id => CAMPAIGN_FORMATS[id].group === 'BIG_MOMENT');
    const budget: CampaignBudget = { kind: 'WEEKS', weeks: flowing.length ? weeks : 1, strength };
    const draft: StreamingCampaignDraft | null = subject ? { subject: { kind: subject.kind, id: subject.id }, where, formats, budget, places } : null;
    const quote = useMemo(() => (draft ? quoteStreamingCampaign(player, draft) : null), [player, subjectKey, where, formats, weeks, strength, places]);
    const countryIds = quote?.countryIds ?? [];
    /* every format's price in these countries: a week at Normal, or a big moment's night at its place */
    const countryKey = countryIds.join(',');
    const rates = useMemo(() => streamingCampaignRateCard(player, countryIds, places), [player, countryKey, places]);
    const weekPrice = flowing.reduce((sum, id) => sum + rates[id].weekly, 0);
    const nightPrice = nights.reduce((sum, id) => sum + (rates[id].show?.price ?? 0), 0);
    const at = STEPS.indexOf(step);
    /* the most-watched this week first: what is working is what people push */
    const watched = useMemo(() => new Map((player.world.worldStreamingViewing?.platforms?.PLAYER?.titlePerformance || [])
        .map(row => [String(row.projectId), row.viewingAccounts] as const)), [player]);
    const titles = subjects.filter(item => item.kind === 'TITLE').sort((left, right) => (watched.get(right.id) || 0) - (watched.get(left.id) || 0));
    const worlds = subjects.filter(item => item.kind === 'UNIVERSE' || item.kind === 'FRANCHISE');
    const service = subjects.find(item => item.kind === 'SERVICE')!;
    const ready: Record<Step, boolean> = {
        WHAT: Boolean(subject),
        WHERE: countryIds.length > 0,
        HOW: formats.length > 0 && !quote?.problems.includes('FORMAT_NOWHERE'),
        CREATIVE: true,
        BUDGET: Boolean(quote) && !quote!.problems.some(problem => ['TOO_SMALL', 'BUDGET_NOT_ALLOWED'].includes(problem)),
        REVIEW: Boolean(quote) && quote!.problems.length === 0,
    };
    const next = () => setStep(STEPS[Math.min(STEPS.length - 1, at + 1)]);
    const back = () => (at === 0 ? onCancel() : setStep(STEPS[at - 1]));
    const launchingRef = useRef(false);
    const launch = () => {
        if (!draft || launchingRef.current) return;
        /* its picture for the news: #156: its big moment's scene where it happens, else its scene where it runs, else its
           widest creative (16:9 first); a drone show draws the name, with any creative in hand */
        const placed = quote?.places ?? {};
        const moment = campaignMomentOf(formats, countryIds, placed);
        const momentScene = moment ? sceneOfFormat(moment.formatId, countryIds, placed) : null;
        const momentFrame = moment ? frames.find(frame => frame.formats.includes(moment.formatId)) ?? null : null;
        const pictureFrame = (momentScene ? momentFrame : null) ?? frames.find(frame => sceneOfFrame(frame, countryIds, placed)) ?? frames.find(frame => frame.key === '16:9') ?? frames[0] ?? null;
        const pictureScene = momentScene ?? (pictureFrame ? sceneOfFrame(pictureFrame, countryIds, placed) : null);
        const pictureSource = pictureFrame ? (kept[pictureFrame.key]?.canvas ?? (kept[pictureFrame.key] ? { mediaId: kept[pictureFrame.key]!.mediaId } : made[pictureFrame.key]) ?? null)
            : momentScene === 'DRONE_SKY' ? Object.values(made).find(Boolean) ?? null : null;
        const pictureMediaId = pictureSource ? newCreativeId() : undefined;
        const result = startStreamingCampaign(player, {
            ...draft, name: subject?.name,
            creativeIds: creativeIdsFor(frames, Object.fromEntries(frames.map(frame => [frame.key, kept[frame.key]?.mediaId]))),
            ...(pictureMediaId ? { pictureMediaId } : {}),
        });
        if (result.ok && result.campaignId) {
            const campaignId = result.campaignId;
            launchingRef.current = true;
            /* the campaign is made; the break (if loaded and allowed) comes before its launch moment */
            void runTaskAd('CAMPAIGN').finally(() => {
                launchingRef.current = false;
                onLaunch(result.player, campaignId);
                /* drawn once the launch is on screen, never on the tap */
                if (pictureMediaId && pictureSource) window.setTimeout(() => { keepCampaignPicture(pictureMediaId, pictureScene, pictureSource, subject?.name ?? brand.name, brand.hue).catch(() => undefined); }, 160);
            });
        }
    };
    const toggleFormat = (id: CampaignFormatId) => setFormats(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
    /* the totals Budget and Review share */
    const totals = quote ? (
        <section className={css.totals}>
            <div><span>IN ALL</span><b>{money(quote.total)}</b><small>{flowing.length ? `${budget.weeks} ${budget.weeks === 1 ? 'week' : 'weeks'}` : 'one night'}, paid now</small></div>
            {/* #160: paid in full when it starts: what the treasury keeps, or how far short it is */}
            <div><span>{quote.total > quote.treasury ? 'SHORT' : 'LEFT AFTER'}</span><b className={quote.total > quote.treasury ? css.bad : ''}>{money(Math.abs(quote.treasury - quote.total))}</b><small>of {money(quote.treasury)} in the treasury</small></div>
            <div><span>ENERGY</span><b>{quote.energy ? `⚡${quote.energy}` : '—'}</b><small>to commission</small></div>
            {quote.total > quote.treasury && <p className={css.short}>The treasury has {money(quote.treasury)}; this campaign needs {money(quote.total)}. It is paid in full when it starts, so it cannot be commissioned: fewer weeks, fewer picks, or less hard.</p>}
            <p>Paid in full when it starts; it runs all its weeks. A month at this pace: <b>{Math.round(quote.awarenessAfterMonth * 100)}%</b> aware {subject?.kind === 'SERVICE' ? 'of the service' : `of ${subject?.name}`} across {countryIds.length} {countryIds.length === 1 ? 'country' : 'countries'}, worth <b>+{quote.marketingPoints}</b> marketing points where it runs. About {count(quote.reach)} people reached in the first week.</p>
        </section>
    ) : null;

    return (
        <div className={css.studio} role="dialog" aria-modal="true" aria-label="New campaign" style={{ ['--cs-accent' as string]: accent }}>
            <header className={css.top}>
                <button type="button" className={css.back} onClick={back} aria-label="Back">←</button>
                <div className={css.title}><b>NEW CAMPAIGN</b><span>{subject ? subject.name.toUpperCase() : `STEP 1 OF ${STEPS.length}`}</span></div>
                <span className={css.mark}><Mark brand={brand} /></span>
            </header>
            <ol className={css.steps}>
                {STEPS.map((item, index) => (
                    <li key={item} className={cx(index === at && css.stepOn, index < at && css.stepDone)}>
                        <button type="button" disabled={index > at && !STEPS.slice(0, index).every(prior => ready[prior])} onClick={() => setStep(item)}>
                            <i>{index < at ? '✓' : index + 1}</i>{STEP_WORDS[item]}
                        </button>
                    </li>
                ))}
            </ol>
            <div className={css.scroll} key={step}>
                {step === 'WHAT' && (
                    <>
                        <div className={css.segment} role="tablist">
                            {(['SERVICE', 'TITLES', ...(worlds.length ? ['WORLDS'] : [])] as const).map(tab => (
                                <button key={tab} type="button" role="tab" aria-selected={subjectTab === tab} className={subjectTab === tab ? css.on : ''} onClick={() => setSubjectTab(tab)}>
                                    {tab === 'SERVICE' ? 'The service' : tab === 'TITLES' ? `Titles · ${titles.length}` : `Universes · ${worlds.length}`}
                                </button>
                            ))}
                        </div>
                        {subjectTab === 'SERVICE' && (
                            <button type="button" className={cx(css.serviceCard, subjectKey === `SERVICE:${service.id}` && css.picked)} onClick={() => setSubjectKey(`SERVICE:${service.id}`)}>
                                <span className={css.serviceMark}><Mark brand={brand} /></span>
                                <b>{service.name}</b>
                                <span>Sell the service itself: what it streams, its price, why to join. Every country you pick hears about it.</span>
                            </button>
                        )}
                        {subjectTab === 'TITLES' && (
                            <div className={css.posters}>
                                {titles.map(item => (
                                    <button key={item.id} type="button" className={cx(css.posterPick, subjectKey === `TITLE:${item.id}` && css.picked)} onClick={() => setSubjectKey(`TITLE:${item.id}`)}>
                                        <span><Poster id={item.id} title={item.name} genre={item.genre || 'DRAMA'} hue={titleHue(item.id)} size="sm" bare /></span>
                                        <b>{item.name}</b>
                                    </button>
                                ))}
                            </div>
                        )}
                        {subjectTab === 'WORLDS' && worlds.map(item => (
                            <button key={`${item.kind}:${item.id}`} type="button" className={cx(css.worldCard, subjectKey === `${item.kind}:${item.id}` && css.picked)} onClick={() => setSubjectKey(`${item.kind}:${item.id}`)}>
                                <b>{item.name}</b><span>{item.kind === 'UNIVERSE' ? 'Universe' : 'Franchise'} · {item.projectIds.length} titles on your service</span>
                            </button>
                        ))}
                    </>
                )}
                {step === 'WHERE' && (
                    <>
                        <button type="button" className={cx(css.whereCard, where.kind === 'LIVE' && css.picked)} onClick={() => setWhere({ kind: 'LIVE' })}>
                            <b>Everywhere you are live</b><span>{markets.size} countries, each by its homes</span>
                        </button>
                        <div className={css.sh}><h2>A region</h2><span>its live countries</span></div>
                        <div className={css.regions}>
                            {regions.map(region => (
                                <button key={region.id} type="button" className={cx(css.regionChip, where.kind === 'REGION' && where.regionId === region.id && css.picked)} onClick={() => setWhere({ kind: 'REGION', regionId: region.id })}>
                                    <span className={css.flags}>{region.countryIds.slice(0, 4).map(id => <i key={id}><CountryFlagSvg code={id} fit="stretch" /></i>)}</span>
                                    <b>{region.name}</b><small>{region.countryIds.length}</small>
                                </button>
                            ))}
                        </div>
                        <div className={css.sh}><h2>Pick countries</h2><span>{where.kind === 'COUNTRIES' ? `${countryIds.length} picked` : 'any of them'}</span></div>
                        <div className={css.countries}>
                            {[...markets.values()].sort((left, right) => right.homes - left.homes).map(market => {
                                const on = where.kind === 'COUNTRIES' && (where.countryIds || []).includes(market.countryId);
                                return (
                                    <button key={market.countryId} type="button" className={cx(css.countryRow, on && css.picked)} aria-pressed={on}
                                        onClick={() => setWhere(current => {
                                            const picked = current.kind === 'COUNTRIES' ? current.countryIds || [] : [];
                                            return { kind: 'COUNTRIES', countryIds: on ? picked.filter(id => id !== market.countryId) : [...picked, market.countryId] };
                                        })}>
                                        <i className={css.flag}><CountryFlagSvg code={market.countryId} fit="stretch" /></i>
                                        <b>{countryName(market.countryId)}</b>
                                        <span>{count(market.homes)} homes · ads ×{market.costIndex.toFixed(2)}</span>
                                        <em aria-hidden="true">{on ? '✓' : '+'}</em>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
                {step === 'HOW' && GROUPS.map(group => (
                    <section key={group.id} className={css.group}>
                        <div className={css.sh}><h2>{group.label}</h2><span>{group.line}</span></div>
                        <div className={css.formatGrid}>
                            {CAMPAIGN_FORMAT_ORDER.filter(id => CAMPAIGN_FORMATS[id].group === group.id).map(id => {
                                const format = CAMPAIGN_FORMATS[id];
                                const where = countryIds.filter(countryId => campaignFormatIn(format, countryId));
                                const on = formats.includes(id);
                                const nowhere = where.length === 0;
                                const site = format.sites ? where.map(countryId => format.sites![countryId]).slice(0, 2).join(' · ') : null;
                                const rate = rates[id];
                                /* #155: a week in these countries, or one night at its place */
                                /* #156: where its picture is set: a big moment's place, a famous screen's first site */
                                const pictured = rate.show?.countryId ?? (format.sites ? where[0] ?? null : null);
                                /* Streaming+: a pack format keeps its picture; picking it opens the pack's sheet */
                                const plus = !on && streamingPlusLocks(player, { kind: 'CAMPAIGN', id });
                                return (
                                    <button key={id} type="button" className={cx(css.format, css.pictured, on && css.picked, nowhere && css.off)} disabled={nowhere && !on} aria-pressed={on}
                                        onClick={() => (plus
                                            ? openStreamingPlusSheet({ source: 'campaign-format', focus: 'campaigns', line: `${format.name} is one of the Streaming+ Pack's 7 big campaign moments.` })
                                            : toggleFormat(id))}>
                                        <span className={css.formatPicture}>
                                            <FormatPicture formatId={id} countryId={pictured} creative={creativeOf(id)} subjectName={subject?.name ?? brand.name} brandName={brand.name} hue={brand.hue} />
                                            <span className={css.formatBadge}><FormatGlyph id={id} /></span>
                                            {plus && <span className={css.formatPlus}><StreamingPlusChip /></span>}
                                            {on && <i className={css.formatCheck} aria-hidden="true">✓</i>}
                                        </span>
                                        <b>{format.name}</b>
                                        <small>{nowhere ? (format.sites ? `Only at ${Object.values(format.sites).slice(0, 2).join(', ')}` : 'Not in these countries')
                                            : rate.show ? nightPlace(id, rate.show.countryId) : site || format.line}</small>
                                        <em>{rate.show ? `One night · ${money(rate.show.price)}` : nowhere ? '—' : `${money(rate.weekly)} a week`}{format.energy ? <i>⚡{format.energy}</i> : null}</em>
                                    </button>
                                );
                            })}
                        </div>
                        {/* #155: where each big night happens, changeable */}
                        {group.id === 'BIG_MOMENT' && nights.length > 0 && (
                            <div className={css.nights}>
                                <div className={css.sh}><h2>Where the nights happen</h2><span>one place each</span></div>
                                {nights.map(id => {
                                    const show = rates[id].show;
                                    const options = countryIds.map(countryId => markets.get(countryId)!).filter(market => market && campaignFormatIn(CAMPAIGN_FORMATS[id], market.countryId))
                                        .sort((left, right) => right.homes * right.costIndex - left.homes * left.costIndex);
                                    const open = placing === id;
                                    return (
                                        <div key={id} className={css.night}>
                                            <button type="button" className={css.nightRow} aria-expanded={open} disabled={options.length < 2} onClick={() => { setPlacingAll(false); setPlacing(current => (current === id ? null : id)); }}>
                                                <i aria-hidden="true"><FormatGlyph id={id} /></i>
                                                <span><b>{CAMPAIGN_FORMATS[id].name}</b><small>{show ? nightPlace(id, show.countryId) : 'Nowhere in these countries'}</small></span>
                                                <em>{options.length < 2 ? (show ? money(show.price) : '') : open ? 'Close' : 'Change'}</em>
                                            </button>
                                            {open && (
                                                <div className={css.nightList}>
                                                    {/* the six biggest ad markets first; the rest on a tap */}
                                                    {(placingAll ? options : options.slice(0, 6)).map(market => (
                                                        <button key={market.countryId} type="button" className={cx(css.nightOption, show?.countryId === market.countryId && css.picked)}
                                                            onClick={() => { setPlaces(current => ({ ...current, [id]: market.countryId })); setPlacing(null); }}>
                                                            <i className={css.flag}><CountryFlagSvg code={market.countryId} fit="stretch" /></i>
                                                            <b>{nightPlace(id, market.countryId)}</b>
                                                            <em>{money(Math.round(CAMPAIGN_FORMATS[id].minWeekly * market.costIndex))}</em>
                                                        </button>
                                                    ))}
                                                    {!placingAll && options.length > 6 && (
                                                        <button type="button" className={css.nightMore} onClick={() => setPlacingAll(true)}>All {options.length} countries</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                ))}
                {step === 'CREATIVE' && subject && (
                    <CreativeStep frames={frames} formats={formats} made={made} kept={kept} accent={accent} countryIds={countryIds} places={quote?.places}
                        subjectName={subject.kind === 'SERVICE' ? "your service's own colours" : `${subject.name}${/s$/i.test(subject.name) ? "'" : "'s"} poster`}
                        onKeep={(key, creative) => setKept(current => ({ ...current, [key]: creative ?? undefined }))} />
                )}
                {step === 'BUDGET' && quote && (
                    <>
                        <section className={css.weekCard}>
                            <span>{flowing.length ? 'A WEEK OF WHAT YOU PICKED' : 'ONE NIGHT'}</span>
                            <b>{money(flowing.length ? quote.weekly : quote.moments)}</b>
                            {flowing.length > 0 && (
                                <div className={css.weekParts}>
                                    {flowing.map(id => <span key={id}><FormatGlyph id={id} />{CAMPAIGN_FORMATS[id].name}<em>{money(rates[id].weekly * strength)}</em></span>)}
                                </div>
                            )}
                            {nights.length > 0 && (
                                <p className={css.nightLine}>{flowing.length ? '+ once, in the first week: ' : ''}{nights.map(id => `${CAMPAIGN_FORMATS[id].name} ${rates[id].show ? nightAt(id, rates[id].show!.countryId) : ''}`).join(' · ')} · {money(quote.moments)}</p>
                            )}
                        </section>
                        {flowing.length > 0 && (
                            <>
                                <div className={css.stepper}>
                                    <span>HOW LONG</span>
                                    <button type="button" onClick={() => setWeeks(value => Math.max(1, value - 1))} disabled={weeks <= 1} aria-label="One week less">−</button>
                                    <b>{weeks}<small>{weeks === 1 ? 'week' : 'weeks'}</small></b>
                                    <button type="button" onClick={() => setWeeks(value => Math.min(CAMPAIGN_MAX_WEEKS, value + 1))} disabled={weeks >= CAMPAIGN_MAX_WEEKS} aria-label="One week more">+</button>
                                </div>
                                <div className={css.weekStrip} aria-hidden="true">
                                    {Array.from({ length: CAMPAIGN_MAX_WEEKS }, (_, index) => <i key={index} className={cx(index < weeks && css.lit, index === 0 && nights.length > 0 && css.star)} />)}
                                </div>
                                <div className={css.segment} role="tablist" aria-label="How hard">
                                    {CAMPAIGN_STRENGTHS.map(option => (
                                        <button key={option} type="button" role="tab" aria-selected={strength === option} className={strength === option ? css.on : ''} onClick={() => setStrength(option)}>
                                            {STRENGTH_WORDS[option].name}
                                        </button>
                                    ))}
                                </div>
                                <p className={css.note}>{STRENGTH_WORDS[strength].line}</p>
                            </>
                        )}
                        {totals}
                    </>
                )}
                {step === 'REVIEW' && subject && quote && (
                    <section className={css.review}>
                        <div className={css.reviewHead}>
                            <SubjectArt subject={subject} brand={brand} />
                            <div><small>{subject.kind === 'SERVICE' ? 'THE SERVICE' : subject.kind}</small><b>{subject.name}</b>
                                <span>{where.kind === 'LIVE' ? `Everywhere live · ${countryIds.length}` : where.kind === 'REGION' ? `${regions.find(region => region.id === where.regionId)?.name} · ${countryIds.length}` : countryIds.map(countryName).join(', ')}</span></div>
                        </div>
                        <div className={css.reviewFormats}>{formats.map(id => <span key={id}><FormatGlyph id={id} />{CAMPAIGN_FORMATS[id].name}</span>)}</div>
                        {frames.length > 0 && (
                            <div className={creativeCss.strip}>
                                {frames.map(frame => (
                                    <figure key={frame.key}>
                                        <FrameThumb kept={kept[frame.key]} made={made[frame.key]} ratio={frame.ratio} />
                                        <figcaption><b>{frame.key}</b> {kept[frame.key] ? 'yours' : 'made for you'}</figcaption>
                                    </figure>
                                ))}
                            </div>
                        )}
                        {nights.length > 0 && <p className={css.sites}>{nights.map(id => `${CAMPAIGN_FORMATS[id].name}: ${rates[id].show ? nightPlace(id, rates[id].show!.countryId) : '—'}`).join(' · ')}</p>}
                        <p className={css.reviewLine}>{flowing.length ? `${money(quote.weekly)} a week for ${budget.weeks} ${budget.weeks === 1 ? 'week' : 'weeks'} · ${STRENGTH_WORDS[strength].name}` : 'One night'}</p>
                    </section>
                )}
                {step === 'REVIEW' && totals}
                {/* #160: the treasury's shortfall is said in the totals, with its numbers */}
                {quote && step !== 'WHAT' && step !== 'CREATIVE' && quote.problems.some(problem => problem !== 'TREASURY' && (step === 'REVIEW' || problem !== 'ENERGY')) && (
                    <ul className={css.problems}>{quote.problems.filter(problem => problem !== 'TREASURY' && (step === 'REVIEW' || problem !== 'ENERGY')).map(problem => <li key={problem}>{PROBLEM_WORDS[problem]}</li>)}</ul>
                )}
            </div>
            <div className={css.pin}>
                {step === 'REVIEW' ? (
                    <button type="button" className={css.primary} disabled={!ready.REVIEW} onClick={launch}>
                        <span><b>Launch campaign</b><small>{quote ? (quote.total > quote.treasury ? `Not enough money: ${money(quote.treasury)} of ${money(quote.total)}`
                            : `${money(quote.total)} paid now${quote.energy ? ` · ⚡${quote.energy}` : ''}`) : ''}</small></span><i aria-hidden="true">→</i>
                    </button>
                ) : (
                    <button type="button" className={css.primary} disabled={!ready[step]} onClick={next}>
                        <span><b>Next: {STEP_WORDS[STEPS[at + 1]]}</b><small>{step === 'WHAT' ? (subject ? subject.name : 'Pick one') : step === 'WHERE' ? `${countryIds.length} ${countryIds.length === 1 ? 'country' : 'countries'}` : step === 'HOW' ? (formats.length ? `${formats.length} picked · ${flowing.length ? `${money(weekPrice)} a week` : 'one night'}${nightPrice ? ` · ${flowing.length ? '+' : ''}${money(nightPrice)}${flowing.length ? ' once' : ''}` : ''}` : 'Pick what runs') : step === 'CREATIVE' ? (frames.length ? `${yours} yours · ${frames.length - yours} made for you` : 'No images needed') : quote ? `${money(quote.total)} in all` : ''}</small></span><i aria-hidden="true">→</i>
                    </button>
                )}
            </div>
        </div>
    );
};
