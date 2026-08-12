import React, { useMemo, useState } from 'react';
import {
    ArrowLeft,
    ArrowRightLeft,
    ChevronRight,
    CircleDollarSign,
    Clock3,
    Eye,
    Globe2,
    House,
    LineChart,
    Radio,
    RefreshCcw,
    Sparkles,
    TrendingDown,
    TrendingUp,
    UsersRound,
} from 'lucide-react';
import type { Player } from '../types';
import {
    getStreamingAudienceMarket,
    type StreamingAudienceCountryView,
    type StreamingAudienceMarketView,
    type StreamingAudiencePlatformView,
} from '../services/streamingAudienceMarket';
import {
    STREAMING_DAY_ONE_REGION_LABELS,
    STREAMING_DAY_ONE_REGION_ORDER,
    type StreamingDayOneRegionId,
} from '../services/streamingDayOneMarkets';
import '../styles/streaming-market-command.css';

type MarketCommandTab = 'WORLD' | 'COUNTRIES' | 'PEOPLE' | 'SWITCHING' | 'RIVALS';
type RegionFilter = 'ALL' | StreamingDayOneRegionId;

interface StreamingMarketCommandProps {
    player: Player;
    onBack: () => void;
    onOpenPlatformWars: () => void;
}

const compact = (value: number): string => new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1_000_000_000 ? 2 : 1,
}).format(Math.max(0, value));

const percent = (value: number): string => `${value.toFixed(value < 10 ? 1 : 0)}%`;

const LinePlot: React.FC<{
    values: number[];
    color?: string;
    height?: number;
    label: string;
}> = ({ values, color = '#7c5cff', height = 132, label }) => {
    const width = 360;
    const safe = values.length > 1 ? values : [0, values[0] || 0];
    const minimum = Math.min(...safe);
    const maximum = Math.max(...safe);
    const range = Math.max(1, maximum - minimum);
    const points = safe.map((value, index) => {
        const x = index / Math.max(1, safe.length - 1) * width;
        const y = height - 14 - ((value - minimum) / range) * (height - 32);
        return `${x},${y}`;
    }).join(' ');
    const area = `0,${height} ${points} ${width},${height}`;
    return (
        <svg className="smc-line-plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} preserveAspectRatio="none">
            <defs>
                <linearGradient id={`smc-area-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={color} stopOpacity=".34" />
                    <stop offset="1" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <line x1="0" y1={height * .28} x2={width} y2={height * .28} className="smc-chart-grid" />
            <line x1="0" y1={height * .58} x2={width} y2={height * .58} className="smc-chart-grid" />
            <line x1="0" y1={height * .88} x2={width} y2={height * .88} className="smc-chart-grid" />
            <polygon points={area} fill={`url(#smc-area-${color.replace('#', '')})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {safe.map((value, index) => index === safe.length - 1 ? (
                <circle key={index} cx={width} cy={height - 14 - ((value - minimum) / range) * (height - 32)} r="5" fill={color} stroke="#fff" strokeWidth="2" />
            ) : null)}
        </svg>
    );
};

const ShareBar: React.FC<{
    shares: StreamingAudienceMarketView['globalWatchShare'];
    condensed?: boolean;
}> = ({ shares, condensed = false }) => (
    <div className={condensed ? 'smc-share-block smc-share-block--condensed' : 'smc-share-block'}>
        <div className="smc-share-bar" role="img" aria-label={shares.map(item => `${item.name} ${percent(item.sharePercent)}`).join(', ')}>
            {shares.filter(item => item.sharePercent >= .25).map(item => (
                <span
                    key={item.id}
                    style={{ width: `${item.sharePercent}%`, background: item.color }}
                    title={`${item.name} ${percent(item.sharePercent)}`}
                />
            ))}
        </div>
        <div className="smc-share-legend">
            {shares.slice(0, condensed ? 4 : 7).map(item => (
                <div key={item.id} className="smc-share-key">
                    <i style={{ background: item.color }} />
                    <span>{item.name}</span>
                    <strong>{percent(item.sharePercent)}</strong>
                </div>
            ))}
        </div>
    </div>
);

const StrengthMeter: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div className="smc-strength-meter">
        <div><span>{label}</span><strong>{Math.round(value)}</strong></div>
        <div className="smc-strength-track"><i style={{ width: `${value}%`, background: color }} /></div>
    </div>
);

const GlobalView: React.FC<{ market: StreamingAudienceMarketView }> = ({ market }) => {
    const first = market.globalTrend[0];
    const latest = market.globalTrend.at(-1)!;
    const viewerGrowth = first ? (latest.activeViewers - first.activeViewers) / Math.max(1, first.activeViewers) * 100 : 0;
    return (
        <div className="smc-view smc-world-view">
            <section className="smc-panel smc-adoption-panel">
                <div className="smc-section-head">
                    <div><span>THE CONNECTED WORLD</span><h2>Streaming adoption</h2></div>
                    <div className="smc-trend-chip"><TrendingUp size={14} /> +{viewerGrowth.toFixed(1)}%</div>
                </div>
                <div className="smc-chart-number"><strong>{percent(market.streamingAdoptionPercent)}</strong><span>of the world watches streaming</span></div>
                <LinePlot values={market.globalTrend.map(item => item.activeViewers)} label="Global active streaming viewers over the last 52 game weeks" />
                <div className="smc-chart-axis"><span>52 weeks ago</span><span>{compact(latest.activeViewers)} viewers now</span></div>
            </section>

            <section className="smc-panel">
                <div className="smc-section-head">
                    <div><span>ATTENTION BOARD</span><h2>Who owns watch time?</h2></div>
                    <Eye size={20} />
                </div>
                <p className="smc-explainer">This is viewing time—not subscriber count. A free or local service can win attention without winning the household bill.</p>
                <ShareBar shares={market.globalWatchShare} />
            </section>

            <section className="smc-panel">
                <div className="smc-section-head">
                    <div><span>HOUSEHOLD OVERLAP</span><h2>One home, many subscriptions</h2></div>
                    <House size={20} />
                </div>
                <div className="smc-overlap-stage">
                    <div className="smc-overlap-orbit smc-overlap-orbit--one"><strong>{percent(market.subscriberOverlap.oneServicePercent)}</strong><span>one service</span></div>
                    <div className="smc-overlap-orbit smc-overlap-orbit--two"><strong>{percent(market.subscriberOverlap.twoServicesPercent)}</strong><span>two services</span></div>
                    <div className="smc-overlap-orbit smc-overlap-orbit--three"><strong>{percent(market.subscriberOverlap.threePlusPercent)}</strong><span>three or more</span></div>
                </div>
                <p className="smc-callout"><Sparkles size={16} /> You do not always need to replace Netflix. Winning a second subscription slot can be the first victory.</p>
            </section>
        </div>
    );
};

const CountryCard: React.FC<{ country: StreamingAudienceCountryView; playerName: string }> = ({ country, playerName }) => (
    <article className={`smc-country-card ${country.selectedForLaunch ? 'is-opening-market' : ''}`}>
        <div className="smc-country-hero" data-code={country.id}>
            <div>
                <span>{country.regionName.toUpperCase()} · {country.id}</span>
                <h3>{country.country}</h3>
                <p>{country.audienceReason}</p>
            </div>
            {country.selectedForLaunch && <em>OPENING MARKET</em>}
        </div>
        <div className="smc-country-numbers">
            <div><span>ACTIVE VIEWERS</span><strong>{compact(country.activeViewers)}</strong></div>
            <div><span>PAYING HOMES</span><strong>{compact(country.payingHouseholds)}</strong></div>
            <div><span>ADOPTION</span><strong>{percent(country.streamingAdoptionPercent)}</strong></div>
            <div><span>YEARLY GROWTH</span><strong>+{country.annualGrowthPercent}%</strong></div>
        </div>
        <LinePlot values={country.trend.map(point => point.value)} color={country.selectedForLaunch ? '#8b5cf6' : '#31d7ff'} height={70} label={`${country.country} active viewer trend`} />
        <div className="smc-country-race">
            <div><span>WATCH-TIME LEADER</span><strong>{country.topPlatformName} · {percent(country.topPlatformSharePercent)}</strong></div>
            <div><span>{country.selectedForLaunch ? playerName.toUpperCase() : 'YOUR SHARE'}</span><strong>{country.selectedForLaunch ? percent(country.playerSharePercent) : 'NOT LIVE'}</strong></div>
        </div>
        <ShareBar shares={country.watchShare} condensed />
        <details className="smc-country-details">
            <summary>Why this market moves <ChevronRight size={16} /></summary>
            <div>
                <p><strong>{country.subscriptionsPerHousehold}</strong> paid services per home · <strong>{percent(country.switchingPercent)}</strong> switch in a typical active week.</p>
                <p>Local pressure: {country.regionalServices.join(' · ')}.</p>
            </div>
        </details>
    </article>
);

const CountriesView: React.FC<{ market: StreamingAudienceMarketView; playerName: string }> = ({ market, playerName }) => {
    const [region, setRegion] = useState<RegionFilter>('ALL');
    const countries = region === 'ALL' ? market.countries : market.countries.filter(country => country.regionId === region);
    return (
        <div className="smc-view smc-countries-view">
            <div className="smc-region-filter" role="tablist" aria-label="Country region filter">
                <button className={region === 'ALL' ? 'is-active' : ''} onClick={() => setRegion('ALL')}>World</button>
                {STREAMING_DAY_ONE_REGION_ORDER.map(regionId => (
                    <button key={regionId} className={region === regionId ? 'is-active' : ''} onClick={() => setRegion(regionId)}>
                        {STREAMING_DAY_ONE_REGION_LABELS[regionId]}
                    </button>
                ))}
            </div>
            <div className="smc-country-summary">
                <span>{countries.length} MARKETS IN VIEW</span>
                <strong>{compact(sumCountry(countries, item => item.activeViewers))} active viewers</strong>
                <p>Phase 1 opening markets are marked. Other countries remain living rival markets until you expand.</p>
            </div>
            <div className="smc-country-list">
                {countries.map(country => <CountryCard key={country.id} country={country} playerName={playerName} />)}
            </div>
        </div>
    );
};

const sumCountry = (countries: StreamingAudienceCountryView[], pick: (country: StreamingAudienceCountryView) => number) => (
    countries.reduce((total, country) => total + pick(country), 0)
);

const PeopleView: React.FC<{ market: StreamingAudienceMarketView }> = ({ market }) => (
    <div className="smc-view smc-people-view">
        <section className="smc-people-intro">
            <span>AUDIENCE PERSONAS</span>
            <h2>People do not subscribe for the same reason.</h2>
            <p>Each group reacts differently to price, originals, localization and release gaps. Later content and marketing systems read these needs.</p>
        </section>
        <div className="smc-persona-list">
            {market.personas.map((persona, index) => (
                <article key={persona.id} className="smc-persona-card" style={{ '--persona': persona.color } as React.CSSProperties}>
                    <div className="smc-persona-rank">0{index + 1}</div>
                    <div className="smc-persona-copy">
                        <span>{percent(persona.sharePercent)} OF VIEWERS · {compact(persona.activeViewers)}</span>
                        <h3>{persona.name}</h3>
                        <p>{persona.need}</p>
                    </div>
                    <div className="smc-persona-facts">
                        <div><span>WATCHES</span><strong>{persona.weeklyHours}h / week</strong></div>
                        <div><span>HOLDS</span><strong>{persona.subscriptionsPerHousehold} services</strong></div>
                        <div><span>SWITCH RISK</span><strong>{persona.switchSensitivity}</strong></div>
                    </div>
                    <div className="smc-persona-leave"><TrendingDown size={16} /><span><strong>Leaves when:</strong> {persona.leavesWhen}</span></div>
                    <footer>Best current fit <strong>{persona.bestFitPlatform}</strong></footer>
                </article>
            ))}
        </div>
    </div>
);

const SwitchingView: React.FC<{ market: StreamingAudienceMarketView; isLive: boolean }> = ({ market, isLive }) => (
    <div className="smc-view smc-switching-view">
        <section className="smc-switch-hero">
            <div className="smc-switch-pulse"><ArrowRightLeft size={30} /></div>
            <span>THE WEEKLY SWITCHING POOL</span>
            <strong>{compact(market.switching.globalSwitchPool)}</strong>
            <p>paying homes are open to changing at least one service this game week.</p>
        </section>
        <div className="smc-flow-grid">
            <div className="is-positive"><TrendingUp /><span>JOINED YOU</span><strong>{isLive ? `+${compact(market.switching.joinedThisWeek)}` : 'PRE-LAUNCH'}</strong></div>
            <div className="is-negative"><TrendingDown /><span>CANCELLED</span><strong>{isLive ? `−${compact(market.switching.cancelledThisWeek)}` : 'PRE-LAUNCH'}</strong></div>
            <div><RefreshCcw /><span>RETURNED</span><strong>{isLive ? compact(market.switching.reactivatedThisWeek) : 'PRE-LAUNCH'}</strong></div>
            <div><ArrowRightLeft /><span>SWITCHED</span><strong>{compact(market.switching.switchedPlatformThisWeek)}</strong></div>
        </div>
        <section className="smc-panel">
            <div className="smc-section-head"><div><span>WHY HOMES MOVE</span><h2>Cancellation pressure</h2></div><strong>{isLive ? percent(market.switching.playerChurnPercent) : '—'}</strong></div>
            <div className="smc-reason-list">
                {market.switching.reasons.map(reason => (
                    <div key={reason.id} className="smc-reason-row">
                        <div><span>{reason.label}</span><strong>{percent(reason.sharePercent)}</strong></div>
                        <div className="smc-reason-track"><i style={{ width: `${reason.sharePercent}%` }} /></div>
                        <p>{reason.detail}</p>
                    </div>
                ))}
            </div>
        </section>
    </div>
);

const RivalCard: React.FC<{ platform: StreamingAudiencePlatformView; isPlayer: boolean }> = ({ platform, isPlayer }) => (
    <article className={`smc-rival-card ${isPlayer ? 'is-player' : ''}`} style={{ '--rival': platform.color } as React.CSSProperties}>
        <header>
            <div className="smc-rival-mark">{platform.shortName.slice(0, 2)}</div>
            <div><span>{isPlayer ? 'YOUR POSITION' : 'GLOBAL RIVAL'}</span><h3>{platform.name}</h3></div>
            <em>{platform.momentum}</em>
        </header>
        <div className="smc-rival-score">
            <div><span>GLOBAL STRENGTH</span><strong>{platform.globalStrength}</strong><small>/100</small></div>
            <div><span>WATCH TIME</span><strong>{percent(platform.watchSharePercent)}</strong></div>
            <div><span>PAID REACH</span><strong>{percent(platform.householdReachPercent)}</strong></div>
        </div>
        <p className="smc-rival-line">{platform.strengthLine}</p>
        <div className="smc-strength-grid">
            <StrengthMeter label="Catalogue" value={platform.catalogStrength} color={platform.color} />
            <StrengthMeter label="Value" value={platform.valueStrength} color={platform.color} />
            <StrengthMeter label="Technology" value={platform.technologyStrength} color={platform.color} />
            <StrengthMeter label="Local fit" value={platform.localStrength} color={platform.color} />
        </div>
        <div className="smc-rival-reasons">
            <p><strong>Why viewers stay</strong>{platform.audienceReason}</p>
            <p><strong>Where they can lose</strong>{platform.weakSpot}</p>
        </div>
    </article>
);

const RivalsView: React.FC<{
    market: StreamingAudienceMarketView;
    onOpenPlatformWars: () => void;
    isLive: boolean;
}> = ({ market, onOpenPlatformWars, isLive }) => (
    <div className="smc-view smc-rivals-view">
        <section className="smc-rival-intro">
            <div><span>RIVAL INTELLIGENCE</span><h2>Strength is more than subscribers.</h2></div>
            <p>Catalogue, value, technology and local fit explain why a platform wins—and what kind of move can hurt it.</p>
            <button onClick={onOpenPlatformWars} disabled={!isLive}>
                {isLive ? 'OPEN PLATFORM WARS' : 'PLATFORM WARS UNLOCKS AFTER LAUNCH'} <ChevronRight size={17} />
            </button>
        </section>
        <div className="smc-rival-list">
            {market.platforms.map(platform => <RivalCard key={platform.id} platform={platform} isPlayer={platform.id === 'PLAYER'} />)}
        </div>
    </div>
);

const TAB_ITEMS: Array<{ id: MarketCommandTab; label: string; Icon: typeof Globe2 }> = [
    { id: 'WORLD', label: 'World', Icon: Globe2 },
    { id: 'COUNTRIES', label: 'Countries', Icon: Radio },
    { id: 'PEOPLE', label: 'People', Icon: UsersRound },
    { id: 'SWITCHING', label: 'Switching', Icon: ArrowRightLeft },
    { id: 'RIVALS', label: 'Rivals', Icon: LineChart },
];

const StreamingMarketCommand: React.FC<StreamingMarketCommandProps> = ({ player, onBack, onOpenPlatformWars }) => {
    const [tab, setTab] = useState<MarketCommandTab>('WORLD');
    const market = useMemo(() => getStreamingAudienceMarket(player), [player]);
    const platform = player.ownedStreamingPlatform;
    const isLive = platform.lifecycle === 'ACTIVE' && Boolean(platform.launchCommit);
    const playerName = platform.identity?.name || 'Your platform';

    return (
        <div className="smc-shell" style={{ '--brand': platform.identity?.primaryColor || '#7c5cff' } as React.CSSProperties}>
            <header className="smc-header">
                <button className="smc-back" onClick={onBack} aria-label="Back to Streaming Hall"><ArrowLeft /></button>
                <div>
                    <span>GLOBAL AUDIENCE NETWORK</span>
                    <h1>Market Command</h1>
                    <p>See where people watch, subscribe and switch.</p>
                </div>
                <div className="smc-live-state"><i />{isLive ? 'LIVE' : 'FORECAST'}</div>
            </header>

            <section className="smc-global-hero">
                <div className="smc-globe-stage" aria-hidden="true">
                    <div className="smc-globe-ring smc-globe-ring--one" />
                    <div className="smc-globe-ring smc-globe-ring--two" />
                    <Globe2 />
                    <span className="smc-signal smc-signal--one" />
                    <span className="smc-signal smc-signal--two" />
                    <span className="smc-signal smc-signal--three" />
                </div>
                <div className="smc-hero-copy">
                    <span>THE LIVING MARKET · WK {market.generatedAtAbsoluteWeek}</span>
                    <strong>{compact(market.activeViewers)}</strong>
                    <h2>active streaming viewers</h2>
                    <p>{compact(market.globalPopulation)} people · {percent(market.streamingAdoptionPercent)} adoption</p>
                </div>
            </section>

            <section className="smc-kpi-rail" aria-label="Global streaming market headline statistics">
                <div><UsersRound /><span>ACTIVE VIEWERS</span><strong>{compact(market.activeViewers)}</strong></div>
                <div><House /><span>PAYING HOMES</span><strong>{compact(market.payingHouseholds)}</strong></div>
                <div><CircleDollarSign /><span>SUBS / HOME</span><strong>{market.subscriptionsPerHousehold}</strong></div>
                <div><Clock3 /><span>WATCH HOURS</span><strong>{compact(market.weeklyWatchHours)}</strong></div>
            </section>

            <nav className="smc-tabs" aria-label="Market Command views">
                {TAB_ITEMS.map(({ id, label, Icon }) => (
                    <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>
                        <Icon /><span>{label}</span>
                    </button>
                ))}
            </nav>

            <main className="smc-main">
                {tab === 'WORLD' && <GlobalView market={market} />}
                {tab === 'COUNTRIES' && <CountriesView market={market} playerName={playerName} />}
                {tab === 'PEOPLE' && <PeopleView market={market} />}
                {tab === 'SWITCHING' && <SwitchingView market={market} isLive={isLive} />}
                {tab === 'RIVALS' && <RivalsView market={market} onOpenPlatformWars={onOpenPlatformWars} isLive={isLive} />}
            </main>

            <footer className="smc-source-note">
                <Radio size={13} />
                <span>{market.gameWorldNotice}</span>
            </footer>
        </div>
    );
};

export default StreamingMarketCommand;
