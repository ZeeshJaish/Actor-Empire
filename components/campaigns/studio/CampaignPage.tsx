/**
 * A campaign's own page (#149; plan §20.9 G3, kept by §20.10: "status, week x of y and spend so far; the placements as
 * a gallery (the same scenes, each naming its city); results week by week and by country …; the grade; Stop, Run again
 * and Open title"). Opened from a campaign in the Studio's hub; it replaces #146's sheet.
 *  - the hero: the campaign's scene with its own creative (the billboard, the Burj Khalifa), or its widest creative;
 *  - four figures: spent (of its budget), joins, cost per join, how aware its countries are now;
 *  - week by week: two rows of bars on one week axis, money spent and joins credited; tap a week for its numbers;
 *  - where it ran: each country with the joins credited there and its awareness now;
 *  - the placements: every format with its creative and where it ran (a landmark by name, cities otherwise);
 *  - in the news: its story, its X posts and the fans' buzz, with its picture;
 *  - in the pinned bar: Top up (a pot) and Stop while it runs; Run again and Open title once it is over.
 */
import { gameWeekLabel, gameWeekText } from '../../../services/gameWeek';
import React, { useMemo, useState } from 'react';
import type { Key } from 'react';
import css from './CampaignPage.module.css';
import type { Campaign, CampaignFormatId } from '../../../types';
import { CAMPAIGN_FORMATS, campaignFormatIn } from '../../../services/campaigns/campaignFormats';
import { campaignMoneyLeft } from '../../../services/campaigns/campaignEngine';
import { getStreamingDayOneMarket } from '../../../services/streamingDayOneMarkets';
import { getStreamingServerSite } from '../../../services/streamingServerSites';
import { CountryFlagSvg } from '../../studio-finance/components/FlagField';
import { CampaignScene } from '../scenes/CampaignScene';
import { CAMPAIGN_SCENES, type CampaignSceneId } from '../scenes/sceneCatalogue';
import type { CreativeSubject } from '../scenes/defaultCreative';
import { creativeFramesOf, type CreativeFrame } from '../creatives/creativeFrames';
import { useKeptCreative } from '../creatives/creativeMedia';
import { CreativeThumb, sceneOfFormat, sceneOfFrame, useMadeForYou, type Creative } from '../creatives/CreativeStep';
import { FormatGlyph } from './formatGlyphs';
import { StoredMediaImage } from '../../StoredMediaImage';
import type { StreamingCampaignStory } from '../../../services/campaigns/streamingCampaignNews';

/** one of the campaign's stories or posts, as its page lists them */
export type CampaignPageNews = StreamingCampaignStory;

const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `$${Math.round(value / 1e3)}K` : `$${Math.round(value)}`);
const count = (value: number) => (value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${Math.round(value / 1e3)}K` : String(Math.round(value)));
const countryName = (id: string) => getStreamingDayOneMarket(id)?.country || id;
/** a country's city, the one its market is opened from */
export const campaignCityOf = (countryId: string) => getStreamingServerSite(getStreamingDayOneMarket(countryId)?.recommendedCityId || '')?.name || countryName(countryId);

/** where a format ran: a landmark or famous screen by name and city, cities otherwise */
export const campaignPlacesOf = (formatId: CampaignFormatId, countryIds: string[], places?: Partial<Record<CampaignFormatId, string>>): string[] => {
    const format = CAMPAIGN_FORMATS[formatId];
    /* #154: a big moment happened at its one place */
    const placed = places?.[formatId];
    const here = placed && countryIds.includes(placed) ? [placed] : countryIds.filter(countryId => campaignFormatIn(format, countryId));
    return format.sites ? here.map(countryId => `${format.sites![countryId]}, ${campaignCityOf(countryId)}`) : here.map(campaignCityOf);
};
const placesLine = (places: string[]) => (places.length <= 2 ? places.join(' · ') : `${places[0]} · ${places[1]} and ${places.length - 2} more`);

/** the creative a frame shows: the kept upload, else the made-for-you one */
const useFrameCreative = (campaign: Campaign, frame: CreativeFrame | null, made: Record<string, HTMLCanvasElement | undefined>) => {
    const kept = useKeptCreative(frame ? campaign.creativeIds?.[frame.formats[0]] : null);
    return { creative: (kept ?? (frame ? made[frame.key] : undefined) ?? null) as Creative | null, yours: Boolean(kept) };
};

const Placement: React.FC<{
    campaign: Campaign; formatId: CampaignFormatId; frame: CreativeFrame | null; made: Record<string, HTMLCanvasElement | undefined>;
    onLive: (sceneId: CampaignSceneId, creative: Creative | null, label: string) => void; index: number; key?: Key;
}> = ({ campaign, formatId, frame, made, onLive, index }) => {
    const { creative, yours } = useFrameCreative(campaign, frame, made);
    const format = CAMPAIGN_FORMATS[formatId];
    /* #156: every format with a scene shows it, where it happened */
    const scene = frame ? sceneOfFormat(formatId, campaign.countryIds, campaign.places) : null;
    const showsScene = scene !== null;
    const places = campaignPlacesOf(formatId, campaign.countryIds, campaign.places);
    return (
        <button type="button" className={css.place} style={{ ['--i' as string]: index }} disabled={!showsScene}
            onClick={() => showsScene && onLive(scene!, creative, `${yours ? 'Your image' : 'Made for you'} · ${format.name} · ${places[0] ?? ''}`)}>
            <span className={css.placeArt}>
                {frame ? <CreativeThumb creative={creative} ratio={frame.ratio} /> : <span className={css.placeGlyph}><FormatGlyph id={formatId} /></span>}
                {showsScene && <i aria-hidden="true">▶</i>}
            </span>
            <b><FormatGlyph id={formatId} />{format.name}</b>
            <small>{places.length ? placesLine(places) : 'Not in these countries'}</small>
        </button>
    );
};

export const CampaignPage: React.FC<{
    campaign: Campaign;
    week: number;
    accent: string;
    grade: 'S' | 'A' | 'B' | 'C' | null;
    /** what its subject's awareness is now, by country (the service's, or its lead title's) */
    awareness: Record<string, number>;
    creative: CreativeSubject;
    news: CampaignPageNews[];
    onClose: () => void;
    onStop: () => void;
    onTopUp: (amount: number) => void;
    onRunAgain: () => void;
    onOpenTitle?: () => void;
    onLive: (sceneId: CampaignSceneId, creative: Creative | null, label: string) => void;
    /** #155: what is left to spend (a weeks campaign: its weeks still to run, at its rate card) */
    moneyLeft?: number;
    /** #155: add weeks to a running weeks campaign */
    onExtend?: (weeks: number) => void;
    /** #160: what more weeks cost now (a campaign paid in full pays for them when they are added), and the treasury */
    extendPrice?: (weeks: number) => number;
    treasury?: number;
}> = ({ campaign, accent, grade, awareness, creative: subject, news, onClose, onStop, onTopUp, onRunAgain, onOpenTitle, onLive, moneyLeft, onExtend, extendPrice, treasury }) => {
    const frames = useMemo(() => creativeFramesOf(campaign.formats), [campaign.formats.join(',')]);
    const made = useMadeForYou(subject, frames);
    /* #156: a big moment's scene where it happened leads; its places from #154 */
    const heroFrame = frames.find(frame => frame.formats.some(id => CAMPAIGN_FORMATS[id].group === 'BIG_MOMENT') && sceneOfFrame(frame, campaign.countryIds, campaign.places))
        ?? frames.find(frame => sceneOfFrame(frame, campaign.countryIds, campaign.places)) ?? frames[0] ?? null;
    const hero = useFrameCreative(campaign, heroFrame, made);
    const heroScene = heroFrame ? sceneOfFrame(heroFrame, campaign.countryIds, campaign.places) : null;
    const running = campaign.status === 'RUNNING' || campaign.status === 'PAUSED';
    const prepaid = typeof campaign.paid === 'number';
    const ran = campaign.weeks.filter(item => item.spend > 0 || item.paused);
    const [picked, setPicked] = useState<number | null>(null);
    const shown = ran.slice(-12);
    const at = picked !== null && shown[picked] ? shown[picked] : shown[shown.length - 1];
    const joins = campaign.weeks.reduce((sum, item) => sum + item.joins, 0);
    const viewers = campaign.weeks.reduce((sum, item) => sum + item.viewers, 0);
    const aware = ran.length ? ran[ran.length - 1].awareness : 0;
    const left = moneyLeft ?? campaignMoneyLeft(campaign);
    const budgetTotal = campaign.budget.kind === 'BURST' ? campaign.budget.total : campaign.budget.kind === 'POT' ? campaign.budget.total + campaign.toppedUp
        : campaign.budget.kind === 'WEEKS' ? campaign.spent + (running ? left : 0) : null;
    const doneWeeks = campaign.weeks.filter(item => item.spend > 0).length;
    const status = campaign.status === 'PAUSED' ? 'WAITING FOR MONEY'
        : campaign.status === 'RUNNING' ? (doneWeeks === 0 ? 'STARTS NEXT WEEK' : campaign.budget.kind === 'BURST' || campaign.budget.kind === 'WEEKS' ? `RUNNING · WEEK ${doneWeeks} OF ${campaign.budget.weeks}` : campaign.budget.kind === 'POT' ? 'RUNNING · A POT' : 'RUNNING · ALWAYS ON')
            : campaign.endReason === 'STOPPED' ? 'STOPPED' : campaign.endReason === 'SPENT' ? 'POT SPENT' : 'DONE';
    const spendMax = Math.max(1, ...shown.map(item => item.spend));
    const joinsMax = Math.max(1, ...shown.map(item => item.joins));
    const countries = campaign.countryIds
        .map(countryId => ({ countryId, joins: campaign.byCountry?.[countryId]?.joins ?? 0, aware: awareness[countryId] ?? 0 }))
        .sort((left, right) => right.joins - left.joins || right.aware - left.aware);
    const heroPlaces = heroScene ? campaignPlacesOf(heroFrame!.formats.find(id => sceneOfFormat(id, campaign.countryIds, campaign.places) === heroScene) ?? heroFrame!.formats[0], campaign.countryIds, campaign.places) : [];

    return (
        <div className={css.page} role="dialog" aria-modal="true" aria-label={campaign.name} style={{ ['--cs-accent' as string]: accent }}>
            <header className={css.top}>
                <button type="button" className={css.back} onClick={onClose} aria-label="Back to the Studio">←</button>
                <div className={css.title}><b>{campaign.name}</b><span>{status}</span></div>
                {grade && <i className={`${css.grade} ${css[`grade${grade}`]}`} title="Graded by cost per join">{grade}</i>}
            </header>
            <div className={css.scroll}>
                <section className={css.hero}>
                    {heroScene ? <CampaignScene scene={CAMPAIGN_SCENES[heroScene]} creative={hero.creative} play={1} />
                        : heroFrame ? <CreativeThumb creative={hero.creative} ratio={heroFrame.ratio} className={css.heroThumb} /> : null}
                    <div className={css.heroHud}>
                        <span className={running && ran.length ? css.liveTag : css.endTag}><i aria-hidden="true" />{running ? (ran.length ? 'LIVE' : 'NEXT WEEK') : 'ENDED'}</span>
                        <span>{heroScene ? `${CAMPAIGN_SCENES[heroScene].name} · ${heroPlaces[0] ?? CAMPAIGN_SCENES[heroScene].place}` : `${campaign.countryIds.length} ${campaign.countryIds.length === 1 ? 'country' : 'countries'}`}</span>
                    </div>
                    {heroScene && (
                        <button type="button" className={css.heroOpen} onClick={() => onLive(heroScene, hero.creative, `${hero.yours ? 'Your image' : 'Made for you'} · ${heroFrame!.name} ${heroFrame!.key}`)}>▶ Full screen</button>
                    )}
                </section>

                <div className={css.stats}>
                    {/* #160: paid in full when it started: what it paid, and what it has run or gave back */}
                    {prepaid ? (
                        <div><span>PAID</span><b>{money(campaign.paid!)}</b><small>{running ? `${money(campaign.spent)} run so far` : campaign.refunded ? `${money(campaign.refunded)} came back` : 'all of it run'}</small></div>
                    ) : (
                        <div><span>SPENT</span><b>{money(campaign.spent)}</b><small>{budgetTotal ? `of ${money(budgetTotal)}` : `${money(campaign.budget.kind === 'ALWAYS_ON' ? campaign.budget.monthly : 0)} a month`}</small></div>
                    )}
                    <div><span>JOINS</span><b className={joins > 0 ? css.good : ''}>{joins > 0 ? `+${count(joins)}` : '—'}</b><small>{viewers > 0 ? `${count(viewers)} viewers` : 'credited weekly'}</small></div>
                    <div><span>PER JOIN</span><b>{joins > 0 ? `$${Math.round(campaign.spent / joins)}` : '—'}</b><small>{grade ? `grade ${grade}` : running ? 'so far' : 'no joins'}</small></div>
                    <div><span>AWARE</span><b>{Math.round(aware * 100)}%</b><small>its countries</small></div>
                </div>

                <div className={css.sh}><h2>Week by week</h2><span>{ran.length ? `${ran.length} ${ran.length === 1 ? 'week' : 'weeks'}` : 'none yet'}</span></div>
                {shown.length === 0 ? (
                    <p className={css.note}>{running ? `It runs from ${gameWeekText(campaign.startedAtAbsoluteWeek)}. Each week settles here: what it spent, who it reached, the joins it brought.`
                        : 'It was stopped before its first week ran, so it spent nothing.'}</p>
                ) : (
                    <div className={css.chart}>
                        <div className={css.chartRow} aria-label="Money spent each week">
                            <span className={css.chartLabel}>SPENT</span>
                            <div className={css.bars}>
                                {shown.map((item, index) => (
                                    <button key={item.absoluteWeek} type="button" className={`${css.bar} ${item === at ? css.barOn : ''}`} onClick={() => setPicked(index)}
                                        aria-label={`${gameWeekLabel(item.absoluteWeek)}: ${item.paused ? 'waited' : money(item.spend)}`}>
                                        <i style={{ height: `${Math.max(item.paused ? 0 : 6, Math.round((item.spend / spendMax) * 100))}%` }} className={item.paused ? css.barPaused : ''} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={css.chartRow} aria-label="Joins credited each week">
                            <span className={css.chartLabel}>JOINS</span>
                            <div className={css.bars}>
                                {shown.map((item, index) => (
                                    <button key={item.absoluteWeek} type="button" className={`${css.bar} ${css.barJoins} ${item === at ? css.barOn : ''}`} onClick={() => setPicked(index)}
                                        aria-label={`${gameWeekLabel(item.absoluteWeek)}: ${count(item.joins)} joins`}>
                                        <i style={{ height: `${item.joins > 0 ? Math.max(6, Math.round((item.joins / joinsMax) * 100)) : 0}%` }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        {at && (
                            <p className={css.chartNote}>
                                <b>{gameWeekLabel(at.absoluteWeek)}</b>{at.paused ? ' · waited: the treasury could not pay'
                                    : ` · ${money(at.spend)} · ${count(at.reach)} reached · ${Math.round(at.awareness * 100)}% aware · ${at.joins > 0 ? `+${count(at.joins)} joins` : 'no joins credited'}`}
                            </p>
                        )}
                    </div>
                )}

                {news.length > 0 && (
                    <>
                        <div className={css.sh}><h2>In the news</h2><span>{news.length} {news.length === 1 ? 'story' : 'stories and posts'}</span></div>
                        <div className={css.news}>
                            {news.slice(0, 5).map((item, index) => (
                                <div key={item.id} className={css.newsRow} style={{ ['--i' as string]: index }}>
                                    <i className={css[`news${item.kind}`]}>{item.kind === 'INSTAGRAM' ? 'IG' : item.kind}</i>
                                    <span><small>{item.source}</small><b>{item.text}</b></span>
                                    {item.imageMediaId && <StoredMediaImage mediaId={item.imageMediaId} className={css.newsPic} />}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <div className={css.sh}><h2>Where it ran</h2><span>joins · aware now</span></div>
                <div className={css.countries}>
                    {countries.slice(0, 8).map((row, index) => (
                        <div key={row.countryId} className={css.country} style={{ ['--i' as string]: index }}>
                            <i className={css.flag}><CountryFlagSvg code={row.countryId} fit="stretch" /></i>
                            <b>{countryName(row.countryId)}</b>
                            <span className={css.aware}><i style={{ width: `${Math.round(row.aware * 100)}%` }} /><em>{Math.round(row.aware * 100)}%</em></span>
                            <strong className={row.joins > 0 ? css.good : ''}>{row.joins > 0 ? `+${count(row.joins)}` : '—'}</strong>
                        </div>
                    ))}
                    {countries.length > 8 && <p className={css.note}>And {countries.length - 8} more {countries.length - 8 === 1 ? 'country' : 'countries'}.</p>}
                </div>

                <div className={css.sh}><h2>Placements</h2><span>{campaign.formats.length} {campaign.formats.length === 1 ? 'format' : 'formats'}</span></div>
                <div className={css.places}>
                    {campaign.formats.map((formatId, index) => (
                        <Placement key={formatId} campaign={campaign} formatId={formatId} frame={frames.find(frame => frame.formats.includes(formatId)) ?? null}
                            made={made} onLive={onLive} index={index} />
                    ))}
                </div>
            </div>
            <div className={css.pin}>
                {running ? (
                    <>
                        {campaign.budget.kind === 'POT' && (
                            <button type="button" className={css.secondary} onClick={() => onTopUp(Math.max(1_000_000, Math.round(campaign.budget.kind === 'POT' ? campaign.budget.total / 2 : 0)))}>
                                Top up {money(Math.max(1_000_000, campaign.budget.kind === 'POT' ? campaign.budget.total / 2 : 0))}
                            </button>
                        )}
                        {campaign.budget.kind === 'WEEKS' && onExtend && campaign.budget.weeks < 52 && [1, 4].map(added => {
                            /* #160: a campaign paid in full pays for its new weeks now */
                            const price = prepaid && extendPrice ? extendPrice(added) : 0;
                            const short = prepaid && treasury !== undefined && price > treasury;
                            return (
                                <button key={added} type="button" className={css.secondary} disabled={short} onClick={() => onExtend(added)}
                                    title={short ? `The treasury has ${money(treasury!)}; ${added} more ${added === 1 ? 'week costs' : 'weeks cost'} ${money(price)}` : undefined}>
                                    +{added} {added === 1 ? 'week' : 'weeks'}{prepaid && extendPrice ? <small>{short ? 'not enough' : money(price)}</small> : null}
                                </button>
                            );
                        })}
                        <button type="button" className={css.danger} onClick={onStop}>Stop<small>{prepaid ? `${money(left)} back` : `${money(left)} ${campaign.budget.kind === 'ALWAYS_ON' ? 'a month' : 'left'}`}</small></button>
                    </>
                ) : (
                    <>
                        {onOpenTitle && <button type="button" className={css.secondary} onClick={onOpenTitle}>Open title</button>}
                        <button type="button" className={css.primary} onClick={onRunAgain}>Run again</button>
                    </>
                )}
            </div>
        </div>
    );
};
