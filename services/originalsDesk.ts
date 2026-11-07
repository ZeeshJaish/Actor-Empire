import type { NPCActor, OwnedStreamingOriginalCommission, OwnedStreamingOriginalPitch, Player, OwnedStreamingPassedPitch } from '../types';
import { getActiveAudienceReport, getScriptGapFit } from './originalsAudienceReport';
import { buildOriginalBill, getOriginalEpisodeScale, getPitchFee } from './originalsDeal';
import { getOriginalMaking, getOriginalPremiereAt } from './originalsTitleDetail';
import { getLiveOriginalPitches } from './originalsPitches';
import { getOriginalsStudios, type OriginalsStudioCard } from './originalsStudios';
import { getAbsoluteWeek } from './legacyLogic';
import { getProductionLocation } from './productionLocations';
import { NPC_DATABASE } from './npcLogic';
import { calculateDirectorProjectSalary } from './talentService';
import { getStreamingOriginalLiveStatus } from './streamingOriginals';
import { GREENLIGHT_GEAR_TIERS } from '../views/lifestyle/business/components/GreenlightEquipmentStep';
import { calculateGreenlightBudget } from '../views/lifestyle/business/greenlightCalculations';
import { getRotatingCrewCandidates } from './crewMarket';

/**
 * #281: what the Originals Desk shows: what is being made, what has been pitched, what is live.
 * Read once when the Desk opens, not on every render.
 */

export interface DeskPitch {
    pitch: OwnedStreamingOriginalPitch;
    studio: OriginalsStudioCard | null;
    /** About what the studio asks for the whole thing: the wizard's Go step has the exact bill */
    askAbout: number;
    perEpisodeAbout: number;
    weeksLeft: number;
    fitsGap: boolean;
    recommended: boolean;
    director: NPCActor | null;
    lead: NPCActor | null;
}

export interface DeskTitle {
    /** made, with its week still ahead */
    premiereAhead: boolean;
    commission: OwnedStreamingOriginalCommission;
    status: string;
    /** Who makes it: the ribbon */
    byLabel: string;
    color: string;
    outside: boolean;
    phaseLabel: string;
    weeksLeft: number | null;
    budget: number;
}

export interface OriginalsDeskView {
    /** #294: the ones a rival made */
    gotAway: OwnedStreamingPassedPitch[];
    pitches: DeskPitch[];
    making: DeskTitle[];
    live: DeskTitle[];
    hasReport: boolean;
    reportWeeksLeft: number;
}

const personOf = (player: Player, id: string | null | undefined): NPCActor | null => {
    if (!id) return null;
    return NPC_DATABASE.find(person => person.id === id) || ((player.flags?.extraNPCs || []) as NPCActor[]).find(person => person.id === id) || null;
};

/** The studio's whole ask, from Greenlight's own budget, all but the soundtrack, which adds a few percent */
export const estimatePitchAsk = (player: Player, pitch: OwnedStreamingOriginalPitch, studio: OriginalsStudioCard | null, episodes = pitch.script.episodes) => {
    const { concept, script } = pitch;
    const director = personOf(player, concept.selectedCrew.director);
    const crew = (role: 'CINEMATOGRAPHER' | 'COMPOSER' | 'LINE_PRODUCER' | 'VFX_SUPERVISOR', key: string) => (
        getRotatingCrewCandidates(role, player.age, player.currentWeek, [concept.selectedCrew[key] || ''].filter(Boolean)).find(candidate => candidate.id === concept.selectedCrew[key])?.marketSalary || 0
    );
    const breakdown = calculateGreenlightBudget({
        scriptCost: 0,
        crewCosts: {
            director: director ? calculateDirectorProjectSalary(director) : 0,
            cinematographer: crew('CINEMATOGRAPHER', 'cinematographer'),
            composer: crew('COMPOSER', 'composer'),
            lineProducer: crew('LINE_PRODUCER', 'lineProducer'),
            vfx: crew('VFX_SUPERVISOR', 'vfx'),
        },
        castRoles: concept.castList as any,
        contractedActorIds: new Set(),
        availableActorIds: new Set(),
        inHouseActorCost: 0,
        backgroundCastingCost: 0,
        locationCosts: concept.selectedLocations.map(id => Number(getProductionLocation(id)?.cost) || 0),
        equipmentChoices: concept.equipmentChoices || {},
        ownedEquipmentLevels: {},
        gearTiers: GREENLIGHT_GEAR_TIERS as any,
        tone: concept.tone,
    });
    const scale = getOriginalEpisodeScale(script.projectType, episodes);
    const fee = studio ? getPitchFee(studio, pitch).percent : 15;
    const bill = buildOriginalBill({
        scriptCost: Math.round(breakdown.scriptCost * scale),
        director: Math.round(breakdown.director * scale),
        cast: Math.round(breakdown.cast * scale),
        backgroundEnsemble: 0,
        crew: Math.round(breakdown.crew * scale),
        locationCost: Math.round(breakdown.locationCost * scale),
        equipmentCost: Math.round(breakdown.equipmentCost * scale),
        effectsCost: Math.round(breakdown.effectsCost * scale),
        baseCost: Math.round(breakdown.baseCost * scale),
        musicBudget: Math.round((breakdown.total * scale) * 0.03),
    }, script.projectType === 'SERIES' ? Number(episodes) || 8 : 1, fee);
    return { total: bill.total, perEpisode: bill.perEpisode, feePercent: fee };
};

const PHASE_WORDS: Record<string, string> = {
    PLANNING: 'PLANNING',
    PRE_PRODUCTION: 'PRE-PRODUCTION',
    PRODUCTION: 'PRODUCTION',
    POST_PRODUCTION: 'POST-PRODUCTION',
    AWAITING_RELEASE: 'READY',
    SCHEDULED: 'ON SLATE',
};

const MARK_FALLBACK = '#7c3aed';

const titleOf = (player: Player, commission: OwnedStreamingOriginalCommission, studios: Map<string, OriginalsStudioCard>): DeskTitle => {
    const status = getStreamingOriginalLiveStatus(player, commission);
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const premiereAt = getOriginalPremiereAt(player, commission);
    const premiereAhead = premiereAt !== null && premiereAt > now;
    const job = commission.canonicalProjectId ? player.commitments.find(item => item.id === commission.canonicalProjectId) : undefined;
    /* #294: a bid-room order is made in the world, not in the player's commitments */
    const production = !job && commission.canonicalProjectId ? Object.values(player.world?.industryProductions || {}).find(item => item.canonicalProjectId === commission.canonicalProjectId) : undefined;
    const calendar = job?.productionCalendar || production?.productionCalendar;
    const outside = studios.has(commission.producerStudioId) || Boolean(job?.projectDetails?.hiddenStats?.outsideOriginal);
    const name = (commission.producerStudioName || 'your studio').replace(/\s+(Pictures|Studios|Studio|Entertainment)$/i, '').toUpperCase();
    return {
        commission,
        status,
        byLabel: outside ? `BY ${name}` : 'BY YOUR STUDIO',
        color: studios.get(commission.producerStudioId)?.color || (outside ? MARK_FALLBACK : player.ownedStreamingPlatform?.identity?.primaryColor || MARK_FALLBACK),
        outside,
        premiereAhead,
        phaseLabel: premiereAhead ? 'ON SLATE' : production && !job ? (commission.releasePlan ? 'ON SLATE' : production.status === 'DELIVERED' ? 'READY' : PHASE_WORDS[production.status] || 'IN THE WORKS') : job?.projectPhase ? PHASE_WORDS[job.projectPhase] || job.projectPhase.replace(/_/g, ' ') : status === 'READY_FOR_GREENLIGHT' ? 'NOT STARTED' : status === 'DELIVERED' ? 'READY' : status.replace(/_/g, ' '),
        weeksLeft: premiereAhead ? premiereAt! - now : calendar ? Math.max(0, calendar.totalWeeks - calendar.elapsedWeeks) : null,
        budget: getOriginalMaking(player, commission),
    };
};

export const getOriginalsDeskView = (player: Player): OriginalsDeskView => {
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const studioList = getOriginalsStudios(player);
    const studios = new Map(studioList.map(studio => [studio.id, studio]));
    const recommendedId = player.ownedStreamingPlatform?.originalPitches?.recommendedPitchId;
    const pitches = getLiveOriginalPitches(player).map((pitch): DeskPitch => {
        const studio = studios.get(pitch.studioId) || null;
        const ask = estimatePitchAsk(player, pitch, studio);
        return {
            pitch,
            studio,
            askAbout: ask.total,
            perEpisodeAbout: ask.perEpisode,
            weeksLeft: Math.max(0, pitch.answerByAbsoluteWeek - now),
            fitsGap: Boolean(getScriptGapFit(player, pitch.script.genres)),
            recommended: recommendedId === pitch.id,
            director: personOf(player, pitch.concept.selectedCrew.director),
            lead: personOf(player, pitch.concept.castList[0]?.actorId),
        };
    }).sort((a, b) => Number(b.recommended) - Number(a.recommended) || Number(b.fitsGap) - Number(a.fitsGap) || a.weeksLeft - b.weeksLeft);
    const titles = (player.ownedStreamingPlatform?.originalCommissions || []).map(commission => titleOf(player, commission, studios));
    const report = getActiveAudienceReport(player);
    return {
        gotAway: (player.ownedStreamingPlatform?.originalPitches?.passed || []).filter(item => item.madeByPlatformName).slice(-3).reverse(),
        pitches,
        making: titles.filter(title => title.status !== 'RELEASED' || title.premiereAhead).reverse(),
        live: titles.filter(title => title.status === 'RELEASED' && !title.premiereAhead).reverse(),
        hasReport: Boolean(report),
        reportWeeksLeft: report ? Math.max(0, report.expiresAtAbsoluteWeek - now) : 0,
    };
};
