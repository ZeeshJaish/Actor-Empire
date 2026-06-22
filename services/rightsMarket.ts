import {
    Genre,
    RightsArchetype,
    RightsMarketNotice,
    RightsInsideReport,
    RightsInvestigationStatus,
    RightsOpportunity,
    RightsRarity,
    RightsRecommendedFormat,
    RightsSignal,
} from '../types';

export const RIGHTS_MARKET_SIZE = 6;
export const RIGHTS_MARKET_SCOUTED_CAPACITY = 8;
export const RIGHTS_TRACK_LIMIT = 3;
export const RIGHTS_SCOUTING_COST = 250_000;
export const RIGHTS_MARKET_CYCLE_WEEKS = 4;
export const RIGHTS_ACTIVE_INVESTIGATION_LIMIT = 2;

export interface RightsMarketContext {
    currentWeek: number;
    studioId: string;
    studioBalance: number;
    studioPrestige: number;
}

interface RightsTemplate {
    archetype: RightsArchetype;
    propertyType: RightsOpportunity['propertyType'];
    genres: Genre[];
    titles: string[];
    sellers: string[];
    pitches: string[];
    reasons: string[];
    upsides: string[];
    concerns: string[];
    priceRange: [number, number];
    fanbase: RightsSignal;
    risk: RightsSignal;
    emblemKey: RightsOpportunity['emblemKey'];
    accent: string;
}

const RIGHTS_TEMPLATES: RightsTemplate[] = [
    {
        archetype: 'DORMANT_HERO',
        propertyType: 'CHARACTER',
        genres: ['SUPERHERO', 'ACTION', 'SCI_FI'],
        titles: ['Nova Wardens', 'The Iron Meridian', 'Solar Vow', 'Sentinel Zero', 'Voltage Crown', 'Crimson Vector', 'The Last Paladin', 'Atlas Wake'],
        sellers: ['Northstar Character Trust', 'Helix Comics Estate', 'Beacon Rights Group'],
        pitches: [
            'A once-famous hero IP waiting for a modern screen identity.',
            'A dormant character brand with enough mythology to anchor a new era.',
            'A recognizable cape-and-cowl IP whose audience never fully disappeared.',
        ],
        reasons: ['The previous screen option expired.', 'Its publisher is seeking a new production partner.', 'The estate wants the character active again.'],
        upsides: ['Universe starter', 'Character-led merchandise', 'Multi-format reboot'],
        concerns: ['Fans are protective of the original canon.', 'Previous adaptations divided audiences.', 'The costume and tone need a convincing reinvention.'],
        priceRange: [35_000_000, 240_000_000],
        fanbase: 'HIGH',
        risk: 'HIGH',
        emblemKey: 'SHIELD',
        accent: '#6d5dfc',
    },
    {
        archetype: 'CULT_HORROR',
        propertyType: 'FRANCHISE',
        genres: ['HORROR', 'THRILLER', 'MYSTERY'],
        titles: ['Deadlight House', 'The Hollow Choir', 'Black Orchard', 'The Ninth Visitor', 'Cinder Lake', 'Midnight Parish', 'The Crooked Room', 'Static Below'],
        sellers: ['Gravesend Releasing', 'Lantern Gate Pictures', 'Night Archive Holdings'],
        pitches: [
            'A low-budget horror name with a fiercely loyal midnight audience.',
            'A forgotten scare franchise that still circulates through fan communities.',
            'A cult IP whose mythology is stronger than its old box office suggests.',
        ],
        reasons: ['The original producer is liquidating dormant rights.', 'A long-held sequel option recently lapsed.', 'The catalog owner wants a fast revival.'],
        upsides: ['Low-cost streaming revival', 'Loyal genre audience', 'Expandable horror mythology'],
        concerns: ['Mainstream awareness is limited.', 'The original continuity is inconsistent.', 'A weak reboot could exhaust the remaining goodwill.'],
        priceRange: [2_500_000, 28_000_000],
        fanbase: 'MEDIUM',
        risk: 'MEDIUM',
        emblemKey: 'SKULL',
        accent: '#e34b5f',
    },
    {
        archetype: 'FAILED_BLOCKBUSTER',
        propertyType: 'STORY_WORLD',
        genres: ['SCI_FI', 'FANTASY', 'ADVENTURE'],
        titles: ['Ashfall Protocol', 'Glass Kingdom', 'Titan Divide', 'Kingdoms of Ember', 'The Meridian War', 'Skyforge', 'Echo Armada', 'The Broken Constellation'],
        sellers: ['Vanguard Film Partners', 'Monument Slate Finance', 'Parallax Entertainment Group'],
        pitches: [
            'A costly screen world whose first launch failed to match its ambition.',
            'A spectacle IP with damaged momentum but unusually deep lore.',
            'A former blockbuster bet now available below its original development value.',
        ],
        reasons: ['Its financier is recovering losses from the original release.', 'The former studio abandoned its continuation plans.', 'A restructuring placed the underlying rights on the market.'],
        upsides: ['Major comeback narrative', 'Deep world-building', 'Global spectacle potential'],
        concerns: ['The brand carries visible failure baggage.', 'Revival requires a serious production commitment.', 'Audiences may associate the name with the original disappointment.'],
        priceRange: [18_000_000, 165_000_000],
        fanbase: 'MEDIUM',
        risk: 'EXTREME',
        emblemKey: 'FLAME',
        accent: '#f06a38',
    },
    {
        archetype: 'VIRAL_STORY',
        propertyType: 'STORY_WORLD',
        genres: ['ROMANCE', 'MYSTERY', 'DRAMA', 'THRILLER'],
        titles: ['The City Between Us', 'Everyone Heard the Signal', 'The Vanishing Hour', 'Paper Moons', 'No One Leaves Winter', 'A Map of Goodbyes', 'The Memory Index', 'When June Returned'],
        sellers: ['Bright Page Literary', 'Signal House Media', 'New Chapter Rights'],
        pitches: [
            'A fast-rising story IP attracting attention across the industry.',
            'A breakout narrative with an audience forming before any screen adaptation.',
            'A cultural conversation that could become a timely film or limited series.',
        ],
        reasons: ['The creator opened a short competitive option window.', 'Its representatives are testing immediate studio interest.', 'A sudden audience surge accelerated the sale timetable.'],
        upsides: ['Fast-moving cultural heat', 'Young audience awareness', 'Flexible film or series adaptation'],
        concerns: ['Attention may fade before production begins.', 'Several rivals are monitoring the IP.', 'The current hype may exceed the depth of the material.'],
        priceRange: [1_500_000, 42_000_000],
        fanbase: 'HIGH',
        risk: 'MEDIUM',
        emblemKey: 'BOOK',
        accent: '#25b7a6',
    },
    {
        archetype: 'STREAMING_CATALOG',
        propertyType: 'CATALOG',
        genres: ['COMEDY', 'CRIME', 'DRAMA', 'DOCUMENTARY'],
        titles: ['Laugh Track Library', 'Harbor Street Collection', 'The Backlot Archive', 'Blue Hour Television', 'Saturday Vault', 'Metro Crime Library', 'Open Road Catalog', 'The Evergreen Package'],
        sellers: ['Archive Seven Media', 'Continuum Distribution', 'Westline Catalog Sales'],
        pitches: [
            'A bundle of recognizable library titles built for long-tail viewing.',
            'A mixed catalog offering reliable audience hours instead of one giant hit.',
            'A legacy package with remake seeds hidden among dependable streaming titles.',
        ],
        reasons: ['The distributor is consolidating its library.', 'A platform exclusivity period recently ended.', 'The owner is selling non-core catalog assets.'],
        upsides: ['Reliable library value', 'Multiple remake candidates', 'Immediate streaming utility'],
        concerns: ['Few titles have theatrical upside.', 'Ownership history requires careful review.', 'The package contains uneven material.'],
        priceRange: [12_000_000, 95_000_000],
        fanbase: 'MEDIUM',
        risk: 'LOW',
        emblemKey: 'LIBRARY',
        accent: '#3c8ce7',
    },
    {
        archetype: 'PRESTIGE_PROPERTY',
        propertyType: 'FRANCHISE',
        genres: ['DRAMA', 'BIOPIC', 'MYSTERY'],
        titles: ['The Quiet Crown', 'Winter at Bell House', 'The Long Verdict', 'Mercy Street', 'A Republic of Dust', 'The Last Correspondent', 'Orchard of Kings', 'The Witness Room'],
        sellers: ['Laurel Estate Management', 'Crown & Quill Rights', 'Meridian Arts Foundation'],
        pitches: [
            'A respected IP with awards potential and enduring critical appeal.',
            'A prestige story whose value lies in reputation, performance, and longevity.',
            'A celebrated dramatic work looking for a careful screen custodian.',
        ],
        reasons: ['The estate is selecting a new screen partner.', 'A prior prestige option expired without production.', 'The rights holder wants a committed awards-focused studio.'],
        upsides: ['Awards prestige', 'Talent magnet', 'Long-term library reputation'],
        concerns: ['Commercial upside may be limited.', 'The estate expects a respectful adaptation.', 'Poor casting would damage the IP quickly.'],
        priceRange: [4_000_000, 55_000_000],
        fanbase: 'MEDIUM',
        risk: 'MEDIUM',
        emblemKey: 'AWARD',
        accent: '#d2a84a',
    },
];

const hashString = (value: string) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const seededRandom = (seed: number) => {
    let state = seed >>> 0;
    return () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};

const INVESTIGATION_COST_RANGE: Record<RightsRarity, [number, number]> = {
    COMMON: [100_000, 300_000],
    UNCOMMON: [300_000, 750_000],
    RARE: [750_000, 2_000_000],
    LEGENDARY: [2_000_000, 5_000_000],
};

const INVESTIGATION_DURATION_RANGE: Record<RightsRarity, [number, number]> = {
    COMMON: [1, 1],
    UNCOMMON: [1, 2],
    RARE: [2, 2],
    LEGENDARY: [2, 3],
};

const SIGNALS: RightsSignal[] = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'];

const REPORT_FORMATS: Record<RightsArchetype, RightsRecommendedFormat[]> = {
    DORMANT_HERO: ['FEATURE_FILM', 'FRANCHISE_REBOOT', 'ANIMATED_FILM'],
    CULT_HORROR: ['FEATURE_FILM', 'ONGOING_SERIES', 'FRANCHISE_REBOOT'],
    FAILED_BLOCKBUSTER: ['LIMITED_SERIES', 'FRANCHISE_REBOOT', 'ANIMATED_FILM'],
    VIRAL_STORY: ['FEATURE_FILM', 'LIMITED_SERIES', 'ONGOING_SERIES'],
    STREAMING_CATALOG: ['ONGOING_SERIES', 'LIMITED_SERIES', 'FRANCHISE_REBOOT'],
    PRESTIGE_PROPERTY: ['FEATURE_FILM', 'LIMITED_SERIES'],
};

const REPORT_ADVANTAGES: Record<RightsArchetype, string[]> = {
    DORMANT_HERO: [
        'Merchandise recognition remains stronger than the public numbers suggest.',
        'A younger audience has quietly rediscovered the original mythology.',
    ],
    CULT_HORROR: [
        'The core fan community still organizes sold-out revival screenings.',
        'The IP can return at a controlled budget without feeling small.',
    ],
    FAILED_BLOCKBUSTER: [
        'International awareness survived the original domestic disappointment.',
        'The unused world-building contains a cleaner entry point than the first film.',
    ],
    VIRAL_STORY: [
        'The creator has an unusually engaged audience willing to follow an adaptation.',
        'Early audience data shows appeal beyond the IP’s current demographic.',
    ],
    STREAMING_CATALOG: [
        'One overlooked title in the package is testing like a remake candidate.',
        'The library produces steadier repeat viewing than the seller is advertising.',
    ],
    PRESTIGE_PROPERTY: [
        'Respected talent is already asking representatives about the material.',
        'The estate values creative credibility and may favor the right pitch over price.',
    ],
};

const REPORT_DANGERS: Record<RightsArchetype, string[]> = {
    DORMANT_HERO: [
        'A disputed supporting-character clause could narrow sequel options.',
        'The legacy fanbase will punish a generic reinvention.',
    ],
    CULT_HORROR: [
        'A former producer may challenge the use of one iconic character.',
        'The loudest fans strongly disagree about which continuity counts.',
    ],
    FAILED_BLOCKBUSTER: [
        'Completion guarantees from the failed production still complicate financing.',
        'The brand may require an expensive repositioning campaign before release.',
    ],
    VIRAL_STORY: [
        'The attention curve may cool before a normal production schedule finishes.',
        'A rival studio is preparing a competing project with a similar premise.',
    ],
    STREAMING_CATALOG: [
        'Music and archive clearances are fragmented across several territories.',
        'Several headline titles have weaker long-term completion rates than advertised.',
    ],
    PRESTIGE_PROPERTY: [
        'The estate retains approval over lead casting and major story changes.',
        'Awards expectations could turn an ordinary release into a visible disappointment.',
    ],
};

const getInvestigationStatus = (opportunity: RightsOpportunity): RightsInvestigationStatus =>
    opportunity.investigationStatus || 'NONE';

export const normalizeRightsOpportunity = (opportunity: RightsOpportunity): RightsOpportunity => ({
    ...opportunity,
    investigationStatus: getInvestigationStatus(opportunity),
});

export const getRightsInvestigationQuote = (opportunity: RightsOpportunity) => {
    const random = seededRandom(opportunity.intelligenceSeed ^ 0x51A7C0DE);
    const [minimumCost, maximumCost] = INVESTIGATION_COST_RANGE[opportunity.rarity];
    const [minimumWeeks, maximumWeeks] = INVESTIGATION_DURATION_RANGE[opportunity.rarity];
    const costStep = opportunity.rarity === 'LEGENDARY' ? 250_000 : 50_000;
    const rawCost = minimumCost + ((maximumCost - minimumCost) * random());
    const cost = Math.max(minimumCost, Math.min(maximumCost, Math.round(rawCost / costStep) * costStep));
    const durationWeeks = minimumWeeks + Math.floor(random() * ((maximumWeeks - minimumWeeks) + 1));
    return { cost, durationWeeks };
};

const createInsideReport = (opportunity: RightsOpportunity): RightsInsideReport => {
    const random = seededRandom(opportunity.intelligenceSeed ^ 0x1A51DE);
    const valueCenter = opportunity.askingPrice * (0.72 + (random() * 0.62));
    const spread = 0.1 + (random() * 0.16);
    const roundTo = valueCenter >= 100_000_000 ? 5_000_000 : valueCenter >= 10_000_000 ? 1_000_000 : 250_000;
    const estimatedValueLow = Math.max(
        250_000,
        Math.round((valueCenter * (1 - spread)) / roundTo) * roundTo,
    );
    const estimatedValueHigh = Math.max(
        estimatedValueLow + roundTo,
        Math.round((valueCenter * (1 + spread)) / roundTo) * roundTo,
    );
    const signal = (bias = 0) => SIGNALS[Math.max(0, Math.min(3, Math.floor((random() * 4) + bias)))];

    return {
        estimatedValueLow,
        estimatedValueHigh,
        audienceLoyalty: opportunity.fanbase,
        commercialPotential: signal(opportunity.rarity === 'LEGENDARY' ? 0.6 : opportunity.rarity === 'RARE' ? 0.3 : 0),
        ownershipRisk: opportunity.publicRisk === 'EXTREME' ? 'EXTREME' : signal(opportunity.publicRisk === 'HIGH' ? 0.3 : -0.25),
        rivalActivity: opportunity.rivalInterest,
        recommendedFormat: pick(REPORT_FORMATS[opportunity.archetype], random),
        hiddenAdvantage: pick(REPORT_ADVANTAGES[opportunity.archetype], random),
        hiddenDanger: pick(REPORT_DANGERS[opportunity.archetype], random),
    };
};

export const startRightsInvestigation = (input: {
    opportunities: RightsOpportunity[];
    opportunityId: string;
    currentWeek: number;
    studioBalance: number;
}): {
    opportunities: RightsOpportunity[];
    changed: boolean;
    cost: number;
    reason?: 'NOT_FOUND' | 'UNAVAILABLE' | 'ALREADY_STARTED' | 'INSUFFICIENT_FUNDS' | 'ACTIVE_LIMIT' | 'TRACK_LIMIT';
} => {
    const target = input.opportunities.find(item => item.id === input.opportunityId);
    if (!target) return { opportunities: input.opportunities, changed: false, cost: 0, reason: 'NOT_FOUND' };
    if (target.marketStatus !== 'AVAILABLE') {
        return { opportunities: input.opportunities, changed: false, cost: 0, reason: 'UNAVAILABLE' };
    }
    if (getInvestigationStatus(target) !== 'NONE') {
        return { opportunities: input.opportunities, changed: false, cost: 0, reason: 'ALREADY_STARTED' };
    }
    const activeCount = input.opportunities.filter(item => getInvestigationStatus(item) === 'INVESTIGATING').length;
    if (activeCount >= RIGHTS_ACTIVE_INVESTIGATION_LIMIT) {
        return { opportunities: input.opportunities, changed: false, cost: 0, reason: 'ACTIVE_LIMIT' };
    }
    const trackedCount = input.opportunities.filter(item => item.isTracked).length;
    if (!target.isTracked && trackedCount >= RIGHTS_TRACK_LIMIT) {
        return { opportunities: input.opportunities, changed: false, cost: 0, reason: 'TRACK_LIMIT' };
    }
    const quote = getRightsInvestigationQuote(target);
    if (input.studioBalance < quote.cost) {
        return { opportunities: input.opportunities, changed: false, cost: 0, reason: 'INSUFFICIENT_FUNDS' };
    }
    const completesWeek = input.currentWeek + quote.durationWeeks;
    return {
        opportunities: input.opportunities.map(item => item.id === target.id ? {
            ...item,
            isTracked: true,
            investigationStatus: 'INVESTIGATING',
            investigationStartedWeek: input.currentWeek,
            investigationCompletesWeek: completesWeek,
            investigationCost: quote.cost,
            expiresAtWeek: Math.max(item.expiresAtWeek, completesWeek + 1),
        } : item),
        changed: true,
        cost: quote.cost,
    };
};

export const advanceRightsInvestigations = (
    opportunities: RightsOpportunity[],
    currentWeek: number,
): { opportunities: RightsOpportunity[]; newlyReady: RightsOpportunity[] } => {
    const newlyReady: RightsOpportunity[] = [];
    const updated = opportunities.map(item => {
        if (
            getInvestigationStatus(item) !== 'INVESTIGATING'
            || !Number.isFinite(item.investigationCompletesWeek)
            || currentWeek < Number(item.investigationCompletesWeek)
        ) {
            return normalizeRightsOpportunity(item);
        }
        const ready: RightsOpportunity = {
            ...item,
            investigationStatus: 'REPORT_READY',
            insideReport: item.insideReport || createInsideReport(item),
        };
        newlyReady.push(ready);
        return ready;
    });
    return { opportunities: updated, newlyReady };
};

export const resolveRightsInvestigationDecision = (
    opportunities: RightsOpportunity[],
    opportunityId: string,
    decision: 'PURSUE' | 'WATCH' | 'WALK_AWAY',
    currentCycle: number,
): { opportunities: RightsOpportunity[]; changed: boolean; reason?: 'NOT_FOUND' | 'REPORT_NOT_READY' } => {
    const target = opportunities.find(item => item.id === opportunityId);
    if (!target) return { opportunities, changed: false, reason: 'NOT_FOUND' };
    if (!['REPORT_READY', 'PURSUIT_READY'].includes(getInvestigationStatus(target))) {
        return { opportunities, changed: false, reason: 'REPORT_NOT_READY' };
    }
    return {
        opportunities: opportunities.map(item => item.id !== opportunityId ? item : {
            ...item,
            investigationStatus: decision === 'PURSUE'
                ? 'PURSUIT_READY'
                : decision === 'WALK_AWAY'
                    ? 'DISMISSED'
                    : 'REPORT_READY',
            isTracked: decision !== 'WALK_AWAY',
            dismissedCycle: decision === 'WALK_AWAY' ? currentCycle : item.dismissedCycle,
        }),
        changed: true,
    };
};

const pick = <T,>(items: readonly T[], random: () => number): T =>
    items[Math.floor(random() * items.length)];

const rollRarity = (
    random: () => number,
    studioBalance: number,
    studioPrestige: number,
    allowLegendary: boolean,
): RightsRarity => {
    const roll = random();
    const legendaryEligible = allowLegendary && (studioBalance >= 500_000_000 || studioPrestige >= 70);
    if (legendaryEligible && roll >= 0.96) return 'LEGENDARY';
    if (roll >= 0.80) return 'RARE';
    if (roll >= 0.50) return 'UNCOMMON';
    return 'COMMON';
};

const RARITY_PRICE_MULTIPLIER: Record<RightsRarity, number> = {
    COMMON: 0.72,
    UNCOMMON: 1,
    RARE: 1.5,
    LEGENDARY: 2.4,
};

const RARITY_RIVAL: Record<RightsRarity, RightsSignal[]> = {
    COMMON: ['LOW', 'MEDIUM'],
    UNCOMMON: ['MEDIUM', 'HIGH'],
    RARE: ['HIGH', 'EXTREME'],
    LEGENDARY: ['EXTREME'],
};

const createOpportunity = (
    context: RightsMarketContext,
    cycle: number,
    slot: number,
    seedTag: string,
    allowLegendary: boolean,
    forceAffordable: boolean,
): RightsOpportunity => {
    const intelligenceSeed = hashString(`${context.studioId}:${cycle}:${seedTag}:${slot}`);
    const random = seededRandom(intelligenceSeed);
    const template = pick(RIGHTS_TEMPLATES, random);
    const titleOffset = hashString(`${seedTag}:${cycle}:${slot}:title`) % template.titles.length;
    const title = template.titles[titleOffset];
    const rarity = rollRarity(random, context.studioBalance, context.studioPrestige, allowLegendary);
    const [minimum, maximum] = template.priceRange;
    const rawPrice = (minimum + ((maximum - minimum) * random())) * RARITY_PRICE_MULTIPLIER[rarity];
    const affordableCap = context.studioBalance >= 5_000_000
        ? Math.max(1_000_000, context.studioBalance * 0.35)
        : rawPrice;
    const askingPrice = Math.max(
        250_000,
        Math.round((forceAffordable ? Math.min(rawPrice, affordableCap) : rawPrice) / 250_000) * 250_000,
    );
    const expiryWindow = 3 + Math.floor(random() * 8);

    return {
        id: `rights_${hashString(`${context.studioId}:${cycle}:${seedTag}:${slot}:${title}`).toString(36)}`,
        title,
        archetype: template.archetype,
        propertyType: template.propertyType,
        primaryGenre: pick(template.genres, random),
        shortPitch: pick(template.pitches, random),
        availabilityReason: pick(template.reasons, random),
        sellerName: pick(template.sellers, random),
        askingPrice,
        rarity,
        fanbase: template.fanbase,
        publicRisk: template.risk,
        visibleUpside: pick(template.upsides, random),
        publicConcern: pick(template.concerns, random),
        rivalInterest: pick(RARITY_RIVAL[rarity], random),
        listedAtWeek: context.currentWeek,
        expiresAtWeek: context.currentWeek + expiryWindow,
        marketStatus: 'AVAILABLE',
        isTracked: false,
        accent: template.accent,
        emblemKey: template.emblemKey,
        intelligenceSeed,
    };
};

const generateUniqueOpportunities = (
    count: number,
    context: RightsMarketContext,
    cycle: number,
    allowLegendary: boolean,
    excludedTitles: Set<string> = new Set(),
    seedTag = 'market',
): RightsOpportunity[] => {
    const generated: RightsOpportunity[] = [];
    const usedTitles = new Set(excludedTitles);
    let attempt = 0;

    while (generated.length < count && attempt < 120) {
        const opportunity = createOpportunity(
            context,
            cycle,
            attempt,
            seedTag,
            allowLegendary,
            generated.length < 2,
        );
        attempt += 1;
        if (usedTitles.has(opportunity.title)) continue;
        usedTitles.add(opportunity.title);
        generated.push(opportunity);
    }

    return generated;
};

export const createInitialRightsMarket = (context: RightsMarketContext): {
    opportunities: RightsOpportunity[];
    cycle: number;
} => {
    const cycle = Math.floor(context.currentWeek / RIGHTS_MARKET_CYCLE_WEEKS);
    return {
        opportunities: generateUniqueOpportunities(RIGHTS_MARKET_SIZE, context, cycle, true),
        cycle,
    };
};

const RARITY_SCORE: Record<RightsRarity, number> = {
    COMMON: 0,
    UNCOMMON: 20,
    RARE: 40,
    LEGENDARY: 65,
};

const SIGNAL_SCORE: Record<RightsSignal, number> = {
    LOW: 0,
    MEDIUM: 10,
    HIGH: 22,
    EXTREME: 35,
};

export const getFeaturedRightsOpportunity = (opportunities: RightsOpportunity[]) =>
    [...opportunities]
        .filter(item => item.marketStatus === 'AVAILABLE' && getInvestigationStatus(item) !== 'DISMISSED')
        .sort((left, right) => {
            const leftScore = RARITY_SCORE[left.rarity] + SIGNAL_SCORE[left.rivalInterest] - left.expiresAtWeek;
            const rightScore = RARITY_SCORE[right.rarity] + SIGNAL_SCORE[right.rivalInterest] - right.expiresAtWeek;
            return rightScore - leftScore || left.title.localeCompare(right.title);
        })[0];

export const toggleTrackedOpportunity = (
    opportunities: RightsOpportunity[],
    opportunityId: string,
): { opportunities: RightsOpportunity[]; changed: boolean; reason?: 'NOT_FOUND' | 'TRACK_LIMIT' | 'ACTIVE_INVESTIGATION' } => {
    const target = opportunities.find(item => item.id === opportunityId);
    if (!target) return { opportunities, changed: false, reason: 'NOT_FOUND' };
    if (target.isTracked && getInvestigationStatus(target) === 'INVESTIGATING') {
        return { opportunities, changed: false, reason: 'ACTIVE_INVESTIGATION' };
    }
    const trackedCount = opportunities.filter(item => item.isTracked).length;
    if (!target.isTracked && trackedCount >= RIGHTS_TRACK_LIMIT) {
        return { opportunities, changed: false, reason: 'TRACK_LIMIT' };
    }
    return {
        opportunities: opportunities.map(item => item.id === opportunityId ? { ...item, isTracked: !item.isTracked } : item),
        changed: true,
    };
};

const appendNotice = (notices: RightsMarketNotice[], notice: RightsMarketNotice) => {
    if (notices.some(item => item.id === notice.id)) return notices;
    return [...notices, notice].slice(-12);
};

export interface AdvanceRightsMarketInput extends RightsMarketContext {
    opportunities: RightsOpportunity[];
    notices: RightsMarketNotice[];
    previousCycle: number;
}

export const advanceRightsMarket = (input: AdvanceRightsMarketInput) => {
    const currentCycle = Math.floor(input.currentWeek / RIGHTS_MARKET_CYCLE_WEEKS);
    let notices = [...input.notices];
    const active: RightsOpportunity[] = [];

    input.opportunities.forEach(item => {
        const normalizedItem = normalizeRightsOpportunity(item);
        const investigationStatus = getInvestigationStatus(normalizedItem);
        if (investigationStatus === 'DISMISSED') return;
        if (investigationStatus === 'INVESTIGATING' || investigationStatus === 'REPORT_READY' || investigationStatus === 'PURSUIT_READY') {
            active.push({
                ...normalizedItem,
                marketStatus: 'AVAILABLE',
                expiresAtWeek: investigationStatus === 'INVESTIGATING'
                    ? Math.max(normalizedItem.expiresAtWeek, (normalizedItem.investigationCompletesWeek || input.currentWeek) + 1)
                    : normalizedItem.expiresAtWeek,
            });
            return;
        }
        const weeksLeft = normalizedItem.expiresAtWeek - input.currentWeek;
        if (weeksLeft <= 0) {
            if (normalizedItem.isTracked) {
                notices = appendNotice(notices, {
                    id: `rights_notice_expired_${normalizedItem.id}`,
                    opportunityTitle: normalizedItem.title,
                    kind: 'EXPIRED',
                    week: input.currentWeek,
                });
            }
            return;
        }
        if (normalizedItem.isTracked && weeksLeft === 1) {
            notices = appendNotice(notices, {
                id: `rights_notice_final_${normalizedItem.id}_${normalizedItem.expiresAtWeek}`,
                opportunityTitle: normalizedItem.title,
                kind: 'FINAL_WEEK',
                week: input.currentWeek,
            });
        }
        active.push({ ...normalizedItem, marketStatus: 'AVAILABLE' });
    });

    const missing = Math.max(0, RIGHTS_MARKET_SIZE - active.length);
    const replacements = missing > 0
        ? generateUniqueOpportunities(
            missing,
            input,
            currentCycle,
            true,
            new Set(active.map(item => item.title)),
            `refill_${input.previousCycle}_${currentCycle}`,
        )
        : [];

    return {
        opportunities: [...active, ...replacements],
        notices,
        cycle: currentCycle,
        lastAdvanceWeek: input.currentWeek,
    };
};

export interface CommissionRightsScoutingInput extends RightsMarketContext {
    opportunities: RightsOpportunity[];
    currentCycle: number;
    lastScoutingCycle: number;
}

export const commissionRightsScouting = (input: CommissionRightsScoutingInput): {
    opportunities: RightsOpportunity[];
    changed: boolean;
    addedIds: string[];
    cost: number;
    reason?: 'INSUFFICIENT_FUNDS' | 'ALREADY_SCOUTED' | 'MARKET_FULL';
} => {
    if (input.studioBalance < RIGHTS_SCOUTING_COST) {
        return { opportunities: input.opportunities, changed: false, addedIds: [], cost: 0, reason: 'INSUFFICIENT_FUNDS' };
    }
    if (input.lastScoutingCycle === input.currentCycle) {
        return { opportunities: input.opportunities, changed: false, addedIds: [], cost: 0, reason: 'ALREADY_SCOUTED' };
    }
    const availableSlots = Math.max(0, RIGHTS_MARKET_SCOUTED_CAPACITY - input.opportunities.length);
    if (availableSlots === 0) {
        return { opportunities: input.opportunities, changed: false, addedIds: [], cost: 0, reason: 'MARKET_FULL' };
    }

    const additions = generateUniqueOpportunities(
        Math.min(2, availableSlots),
        input,
        input.currentCycle,
        false,
        new Set(input.opportunities.map(item => item.title)),
        `scouting_${input.currentCycle}`,
    ).map(item => item.rarity === 'LEGENDARY' ? { ...item, rarity: 'RARE' as const } : item);

    return {
        opportunities: [...input.opportunities, ...additions],
        changed: additions.length > 0,
        addedIds: additions.map(item => item.id),
        cost: additions.length > 0 ? RIGHTS_SCOUTING_COST : 0,
    };
};

const isValidSignal = (value: unknown): value is RightsSignal =>
    value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'EXTREME';

export const isValidRightsOpportunity = (value: unknown): value is RightsOpportunity => {
    if (!value || typeof value !== 'object') return false;
    const item = value as Partial<RightsOpportunity>;
    return typeof item.id === 'string'
        && typeof item.title === 'string'
        && typeof item.askingPrice === 'number'
        && typeof item.listedAtWeek === 'number'
        && typeof item.expiresAtWeek === 'number'
        && typeof item.archetype === 'string'
        && typeof item.propertyType === 'string'
        && typeof item.primaryGenre === 'string'
        && isValidSignal(item.fanbase)
        && isValidSignal(item.publicRisk)
        && isValidSignal(item.rivalInterest);
};

export const normalizeRightsMarketState = (
    state: {
        opportunities?: RightsOpportunity[];
        notices?: RightsMarketNotice[];
        cycle?: number;
        lastAdvanceWeek?: number;
        lastScoutingCycle?: number;
    } | undefined,
    context: RightsMarketContext,
) => {
    const initial = createInitialRightsMarket(context);
    const validStored = Array.isArray(state?.opportunities)
        ? state.opportunities.filter(isValidRightsOpportunity)
        : [];
    const opportunities = (validStored.length > 0 ? validStored : initial.opportunities)
        .map(normalizeRightsOpportunity);
    const advanced = advanceRightsMarket({
        opportunities,
        notices: Array.isArray(state?.notices) ? state.notices : [],
        currentWeek: context.currentWeek,
        studioId: context.studioId,
        studioBalance: context.studioBalance,
        studioPrestige: context.studioPrestige,
        previousCycle: Number.isFinite(state?.cycle) ? Number(state?.cycle) : initial.cycle,
    });

    return {
        ...advanced,
        lastScoutingCycle: Number.isFinite(state?.lastScoutingCycle)
            ? Number(state?.lastScoutingCycle)
            : -1,
    };
};
