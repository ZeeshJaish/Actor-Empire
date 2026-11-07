import type { IndustryProject, OwnedStreamingOriginalPitch, OwnedStreamingPassedPitch, PlatformId, Player } from '../types';
import { addActivityLog } from './activityLog';
import { createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { NPC_DATABASE } from './npcLogic';
import { PLATFORMS } from './streamingLogic';

/**
 * #294: rivals read the same pitches. A good one draws interest: the price climbs and the time to answer shortens. Let it run out and a rival takes it.
 * One you passed on can turn up on a rival's service, and if it hits, the activity log says so. No popups: nothing here needs an answer.
 */

const RIVALS: PlatformId[] = ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU'];
const CHECK_AFTER_WEEKS = 6;
const OPENS_AFTER_WEEKS = 30;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

const chaseOf = (pitch: OwnedStreamingOriginalPitch, now: number): OwnedStreamingOriginalPitch => {
    if (pitch.chasedByPlatformName || now < pitch.createdAtAbsoluteWeek + 1) return pitch;
    const rng = createDeterministicRng(`${pitch.seed}:chase`);
    const interest = 0.18 + clamp((Number(pitch.script.quality || 60) - 60) / 100, 0, 0.27);
    if (rng() >= interest) return pitch;
    const rival = RIVALS[Math.floor(rng() * RIVALS.length)];
    return {
        ...pitch,
        chasedByPlatformName: PLATFORMS[rival].name,
        priceClimbPercent: 8 + Math.floor(rng() * 13),
        answerByAbsoluteWeek: Math.max(now, pitch.answerByAbsoluteWeek - 1),
    };
};

const worldRowOf = (item: OwnedStreamingPassedPitch, rating: number, now: number, platform: string): IndustryProject => ({
    id: `passed_${item.id}`,
    title: item.title,
    genre: item.genre as IndustryProject['genre'],
    mediaType: item.projectType === 'MOVIE' ? 'MOVIE' : 'SERIES',
    studioId: item.studioId,
    budgetTier: 'MID',
    quality: Math.round(clamp(Number(item.quality || 60), 1, 100)),
    rating,
    boxOffice: 0,
    year: Math.floor(now / 52) + 1,
    weekReleased: (now % 52) + 1,
    leadActorId: `passed_lead_${item.id}`,
    leadActorName: item.leadName || 'Unknown',
    directorName: item.directorName || 'Unknown',
    reviews: `On ${platform}.`,
    streamingPlatformId: (Object.keys(PLATFORMS) as PlatformId[]).find(id => PLATFORMS[id].name === platform),
    platformRelationship: 'ORIGINAL_COMMISSIONER',
} as IndustryProject);

/** A licence near its end and a licence over: worth a line, not a popup */
export const runOriginalLicenceWeek = (player: Player): Player => {
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    return (player.ownedStreamingPlatform?.originalCommissions || []).reduce((current, commission) => {
        const left = commission.licenceEndsAtAbsoluteWeek ? commission.licenceEndsAtAbsoluteWeek - now : null;
        if (left === 12) return addActivityLog(current, `"${commission.title}" goes back to ${commission.producerStudioName} in 12 weeks. Its page can keep it.`, 'neutral');
        if (left === 0) return addActivityLog(current, `"${commission.title}" went back to ${commission.producerStudioName}. Its licence is over.`, 'negative');
        return current;
    }, player);
};

/** Weekly, before the week's pitches are dropped */
export const runOriginalPitchRivalsWeek = (player: Player): Player => {
    const state = player.ownedStreamingPlatform?.originalPitches;
    if (!state) return player;
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const lines: Array<{ text: string; tone: 'positive' | 'negative' | 'neutral' }> = [];

    const chased = state.pitches.map(pitch => {
        const next = chaseOf(pitch, now);
        if (next !== pitch) lines.push({ text: `${next.chasedByPlatformName} is after "${pitch.script.title}". ${pitch.studioName} has put the price up ${next.priceClimbPercent}%.`, tone: 'neutral' });
        return next;
    });
    /* its time ran out with a rival at the door */
    const taken = chased.filter(pitch => pitch.chasedByPlatformName && pitch.answerByAbsoluteWeek < now);
    const pitches = chased.filter(pitch => !taken.includes(pitch));
    const fromTaken: OwnedStreamingPassedPitch[] = taken.map(pitch => {
        lines.push({ text: `${pitch.chasedByPlatformName} picked up "${pitch.script.title}" from ${pitch.studioName}.`, tone: 'negative' });
        return { ...passedRecordOf(pitch, now), madeByPlatformName: pitch.chasedByPlatformName, lostToRival: true };
    });

    let projects = player.world.projects;
    const passed = [...state.passed, ...fromTaken].map(item => {
        let next = item;
        if (!next.madeByPlatformName && !next.rivalChecked && now >= next.passedAtAbsoluteWeek + CHECK_AFTER_WEEKS) {
            const rng = createDeterministicRng(`${next.id}:picked-up`);
            const takes = rng() < 0.4;
            next = { ...next, rivalChecked: true, ...(takes ? { madeByPlatformName: PLATFORMS[RIVALS[Math.floor(rng() * RIVALS.length)]].name } : {}) };
        }
        if (next.madeByPlatformName && next.rating === undefined && now >= next.passedAtAbsoluteWeek + OPENS_AFTER_WEEKS) {
            const rng = createDeterministicRng(`${next.id}:how-it-did`);
            const rating = Math.round(clamp(4.5 + Number(next.quality || 60) * 0.045 + (rng() - 0.5) * 2.2, 3, 9.4) * 10) / 10;
            next = { ...next, rating };
            const row = worldRowOf(next, rating, now, next.madeByPlatformName!);
            if (!projects.some(project => project.id === row.id)) projects = [...projects, row];
            const word = next.lostToRival ? 'the one you lost' : 'which you passed on';
            if (rating >= 7.6) lines.push({ text: `🔥 "${next.title}", ${word}, is a hit on ${next.madeByPlatformName}: ★ ${rating.toFixed(1)}.`, tone: 'negative' });
            else if (rating < 6) lines.push({ text: `"${next.title}", ${word}, flopped on ${next.madeByPlatformName}: ★ ${rating.toFixed(1)}. Good call.`, tone: 'positive' });
        }
        return next;
    });

    const changed = lines.length > 0 || taken.length > 0 || chased.some((pitch, index) => pitch !== state.pitches[index]) || passed.some((item, index) => item !== state.passed[index]);
    if (!changed) return player;
    const next: Player = {
        ...player,
        world: projects === player.world.projects ? player.world : { ...player.world, projects },
        ownedStreamingPlatform: {
            ...player.ownedStreamingPlatform,
            originalPitches: { ...state, pitches, passed },
        },
    };
    return lines.reduce((current, line) => addActivityLog(current, line.text, line.tone), next);
};

/** What is kept of a pitch once it is gone */
export const passedRecordOf = (pitch: OwnedStreamingOriginalPitch, now: number): OwnedStreamingPassedPitch => {
    const concept: any = pitch.concept;
    const lead = (concept.castList || []).find((member: any) => member.roleType === 'LEAD');
    return {
        id: pitch.id,
        title: pitch.script.title,
        studioId: pitch.studioId,
        studioName: pitch.studioName,
        genre: pitch.script.genres[0],
        passedAtAbsoluteWeek: now,
        projectType: pitch.script.projectType === 'MOVIE' ? 'MOVIE' : 'SERIES',
        quality: Number(pitch.script.quality || 60),
        leadName: lead?.actorName || lead?.name,
        directorName: NPC_DATABASE.find(person => person.id === concept.selectedCrew?.director)?.name,
    };
};
