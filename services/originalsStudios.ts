import type { Player } from '../types';
import { formatGenreLabel } from './genreCatalog';
import { getHistoricalCatalogueTitles } from './historicalCatalogue';
import { isOutsideOriginal } from './outsideOriginals';

/**
 * #277: who can make an Original for the player's platform, and what each one is like. Production houses only.
 * Everything on the card comes from the world: the studio's running company (`world.studios[id].ai`) and the titles it really made.
 */

/** Streaming houses never pitch a rival. Pixar, Marvel and Lucasfilm belong to Disney. HBO is Zeesh's call: it counts as a streaming house. */
const NEVER_MAKES_ORIGINALS = new Set(['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE', 'AMAZON_STUDIOS', 'PIXAR', 'MARVEL_STUDIOS', 'LUCASFILM', 'HBO']);

export type OriginalsSeasonStyle = 'BIG_OPENING' | 'SLOW_BURN' | 'EVEN' | 'BIG_FINALE';

export const ORIGINALS_SEASON_STYLE_NAMES: Record<OriginalsSeasonStyle, string> = {
    BIG_OPENING: 'Big Opening',
    SLOW_BURN: 'Slow Burn',
    EVEN: 'Even Season',
    BIG_FINALE: 'Big Finale',
};

export interface OriginalsStudioRecord {
    titles: number;
    hits: number;
    average: number;
    flops: number;
    /** 0 when nothing it made has a rating */
    rating: number;
    genres: string[];
    /** Too little to judge it by, and the card says so */
    thin: boolean;
    latest: string[];
}

export interface OriginalsStudioCard {
    id: string;
    name: string;
    mark: string;
    color: string;
    isVenture: boolean;
    typeLabel: string;
    line: string;
    record: OriginalsStudioRecord;
    /** Four dials, 0 to 100 */
    creative: number;
    onSet: number;
    budgetControl: number;
    starPull: number;
    style: OriginalsSeasonStyle;
    reputation: number;
    /** Its running momentum, 50 is flat */
    momentum: number;
    /** How hard it bargains */
    negotiation: number;
    hotStreak: boolean;
    /** How long its cash lasts, in weeks */
    runwayWeeks: number;
    /** Productions it can start now */
    openSlots: number;
    /** It can sell a title outright only if it is strong enough to wait for its money; see #278 */
    financiallyStrong: boolean;
}

const MARK_COLORS = ['#7c3aed', '#2563eb', '#0d9488', '#b45309', '#be123c', '#4338ca', '#0369a1', '#a21caf', '#15803d', '#c2410c'];

const hash = (value: string): number => {
    let result = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        result ^= value.charCodeAt(i);
        result = Math.imul(result, 16777619);
    }
    return result >>> 0;
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

const markOf = (name: string): string => {
    const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(word => word && !['the', 'of', 'and', 'pictures', 'studios', 'studio'].includes(word.toLowerCase()));
    const letters = words.length >= 2 ? words[0][0] + words[1][0] : (words[0] || name).slice(0, 3);
    return letters.toUpperCase();
};

const typeLabelOf = (strategy: string | undefined, launchClass: string | undefined, isVenture: boolean): string => {
    if (strategy === 'PRESTIGE') return launchClass === 'ESTABLISHED_LABEL' ? 'Prestige label' : 'Prestige house';
    if (strategy === 'FRANCHISE') return 'Franchise house';
    if (strategy === 'GENRE_SPECIALIST') return 'Genre house';
    if (strategy === 'CREATOR_LED') return 'Creator-led studio';
    if (strategy === 'COMMERCIAL') return isVenture ? 'Young commercial studio' : 'Commercial studio';
    if (launchClass === 'ESTABLISHED_MAJOR') return 'Major studio';
    if (launchClass === 'ESTABLISHED_LABEL') return 'Established label';
    return isVenture ? 'Young studio' : 'Studio';
};

const styleOf = (strategy: string | undefined, riskTolerance: number, isVenture: boolean): OriginalsSeasonStyle => {
    if (strategy === 'FRANCHISE' || strategy === 'COMMERCIAL') {
        if (isVenture && riskTolerance < 40) return 'EVEN';
        return 'BIG_OPENING';
    }
    if (strategy === 'PRESTIGE') return 'SLOW_BURN';
    if (strategy === 'GENRE_SPECIALIST' || strategy === 'CREATOR_LED') return riskTolerance >= 55 ? 'BIG_FINALE' : 'SLOW_BURN';
    return 'EVEN';
};

const lineOf = (card: Pick<OriginalsStudioCard, 'creative' | 'onSet' | 'budgetControl' | 'starPull'>): string => {
    const careful = card.budgetControl >= 70;
    const wasteful = card.budgetControl < 50;
    const firstHalf = card.creative >= 78
        ? 'Strong on story'
        : card.creative < 55
            ? 'Weak on story'
            : card.starPull >= 80
                ? 'Gets the big names'
                : 'Solid';
    const secondHalf = careful
        ? 'rarely asks for more money.'
        : wasteful
            ? 'often comes back asking for more money.'
            : 'now and then asks for more money.';
    const speed = card.onSet >= 80 ? ' Quick on set.' : card.onSet < 55 ? ' Slow on set.' : '';
    return `${firstHalf}, ${secondHalf}${speed}`;
};

const buildRecord = (rows: Array<{ title: string; genre: string; rating: number; year: number; weekReleased: number }>): OriginalsStudioRecord => {
    const rated = rows.filter(row => Number(row.rating) > 0);
    const hits = rated.filter(row => row.rating >= 7.5).length;
    const flops = rated.filter(row => row.rating < 5.5).length;
    const counts = new Map<string, number>();
    rows.forEach(row => counts.set(row.genre, (counts.get(row.genre) || 0) + 1));
    return {
        titles: rows.length,
        hits,
        flops,
        average: rated.length - hits - flops,
        rating: rated.length ? Math.round((rated.reduce((sum, row) => sum + row.rating, 0) / rated.length) * 10) / 10 : 0,
        genres: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([genre]) => formatGenreLabel(genre)),
        thin: rows.length < 3,
        latest: [...rows].sort((a, b) => (b.year - a.year) || (b.weekReleased - a.weekReleased)).slice(0, 3).map(row => row.title),
    };
};

/** Every outside studio that can make an Original now. The record scans the catalogue once, so call this on a screen's open or at the weekly close, not on a tap. */
export const getOriginalsStudios = (player: Player): OriginalsStudioCard[] => {
    const studios = player.world?.studios || {};
    const titlesByStudio = new Map<string, Array<{ title: string; genre: string; rating: number; year: number; weekReleased: number }>>();
    getHistoricalCatalogueTitles(player).forEach(title => {
        const list = titlesByStudio.get(title.studioId);
        if (list) list.push(title);
        else titlesByStudio.set(title.studioId, [title]);
    });
    const ownedIds = new Set((player.businesses || []).map(business => business.id));
    const ventures = player.world?.npcVentures || {};
    const productions = Object.values(player.world?.industryProductions || {});
    /* #288: what they are making for the player's platform takes a slot like anything else */
    const madeForPlatform = new Map<string, number>();
    (player.commitments || []).forEach(job => {
        if (!isOutsideOriginal(job)) return;
        const studioId = String(job.projectDetails?.studioId || '');
        madeForPlatform.set(studioId, (madeForPlatform.get(studioId) || 0) + 1);
    });
    return Object.values(studios).flatMap((studio: any): OriginalsStudioCard[] => {
        const id = String(studio?.id || '');
        if (!id || NEVER_MAKES_ORIGINALS.has(id) || studio.archetype === 'PLATFORM' || ownedIds.has(id)) return [];
        const ai = studio.ai;
        if (!ai || ai.controller === 'PLAYER' || ai.status !== 'ACTIVE') return [];
        const venture = (ventures as any)[id];
        const isVenture = Boolean(venture) || ai.origin === 'NPC_VENTURE' || id.startsWith('npc_venture_');
        const activeWork = productions.filter((production: any) => production.producerStudioId === id && !['DELIVERED', 'CANCELLED'].includes(production.status)).length + (madeForPlatform.get(id) || 0);
        if (isVenture) {
            /* the same bar the rival platforms use */
            const cash = Number(venture?.cashReserve ?? studio.cashReserve ?? 0);
            const reputation = Number(venture?.reputation ?? studio.reputation ?? 0);
            const creativeQuality = Number(venture?.creativeQuality ?? ai.competence?.creative ?? 0);
            if ((venture && venture.status !== 'ACTIVE') || cash < 15 || reputation < 30 || creativeQuality < 35 || activeWork >= 3) return [];
        }
        const creative = Math.round(clamp(ai.competence?.creative));
        const onSet = Math.round(clamp(ai.competence?.production));
        const budgetControl = Math.round(clamp(ai.profile?.financialDiscipline));
        const starPull = Math.round(clamp(ai.competence?.talentRelations));
        const productionSlots = Number(ai.capacity?.productionSlots || 0);
        const committed = Number(ai.capacity?.committedProductionSlots || 0);
        const name = String(studio.name || venture?.name || id);
        const momentum = Number(studio.slateMomentum ?? 50);
        const runwayWeeks = Number(ai.finance?.runwayWeeks ?? 0);
        const record = buildRecord(titlesByStudio.get(id) || []);
        return [{
            id,
            name,
            mark: markOf(name),
            color: MARK_COLORS[hash(id) % MARK_COLORS.length],
            isVenture,
            typeLabel: typeLabelOf(ai.profile?.strategy, ai.profile?.launchClass, isVenture),
            line: lineOf({ creative, onSet, budgetControl, starPull }),
            record,
            creative,
            onSet,
            budgetControl,
            starPull,
            style: styleOf(ai.profile?.strategy, Number(ai.profile?.riskTolerance ?? 50), isVenture),
            reputation: Math.round(clamp(Number(studio.reputation ?? venture?.reputation ?? 50))),
            momentum,
            negotiation: Math.round(clamp(ai.competence?.negotiation)),
            hotStreak: momentum >= 65 || Number(studio.recentHits || 0) >= 2,
            runwayWeeks,
            openSlots: Math.max(0, productionSlots - Math.max(committed, activeWork)),
            financiallyStrong: runwayWeeks >= 104 && Number(ai.finance?.debtPrincipalMillions || 0) < Number(studio.cashReserve || 0),
        }];
    }).sort((a, b) => b.reputation - a.reputation || a.name.localeCompare(b.name));
};

export const getOriginalsStudio = (player: Player, studioId: string): OriginalsStudioCard | null => (
    getOriginalsStudios(player).find(card => card.id === studioId) || null
);

/** What its people add to a title, against an average studio: creative and on-set skill, up to about ±3 quality */
export const getStudioQualityEdge = (card: Pick<OriginalsStudioCard, 'creative' | 'onSet'>): number => (
    Math.round(((card.creative - 70) * 0.06 + (card.onSet - 70) * 0.04) * 10) / 10
);

/**
 * #301: you are not on their set. How far from the estimate this studio's work can land, beyond the ±10 every film has:
 * a careful studio ±2, a shaky one up to ±8. Fixed for each title.
 */
export const getOutsideQualitySwing = (card: Pick<OriginalsStudioCard, 'onSet' | 'budgetControl'>): number => {
    const reliability = card.onSet * 0.7 + card.budgetControl * 0.3;
    return Math.round(Math.min(8, 2 + Math.max(0, 85 - reliability) * 0.14) * 10) / 10;
};

export const rollOutsideQuality = (card: Pick<OriginalsStudioCard, 'id' | 'onSet' | 'budgetControl'>, seed: string): number => {
    const roll = (hash(`${card.id}:${seed}:quality`) % 1000) / 1000;
    return Math.round((roll - 0.5) * 2 * getOutsideQualitySwing(card) * 10) / 10;
};

/** A good crew shoots quicker: weeks off a shoot, and a poor one adds some. The whole stays within the Production House's 24 to 35 weeks. */
export const getStudioShootWeeks = (card: Pick<OriginalsStudioCard, 'onSet'>, plannedWeeks: number): number => {
    const change = card.onSet >= 80 ? -2 : card.onSet >= 70 ? -1 : card.onSet < 50 ? 2 : card.onSet < 60 ? 1 : 0;
    return Math.max(8, Math.min(13, plannedWeeks + change));
};

/** How many times it will come back for money, 0 to 3. Poor budget control, a poor crew and a thin budget all raise it. */
export const getStudioIssueCount = (
    card: Pick<OriginalsStudioCard, 'id' | 'budgetControl' | 'onSet'>,
    seed: string,
    budgetFit: number,
): number => {
    const weight = (100 - card.budgetControl) * 0.022 + (100 - card.onSet) * 0.01 + Math.max(0, 1 - budgetFit) * 1.2;
    const roll = (hash(`${card.id}:${seed}:issues`) % 1000) / 1000;
    return Math.max(0, Math.min(3, Math.floor(weight * 0.75 + roll * 1.3)));
};
