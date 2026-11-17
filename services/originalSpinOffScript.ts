import type { Business, OwnedStreamingOriginalCommission, Player, Script } from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { getOriginalFutureView, ORIGINAL_EVIDENCE_WEEKS, SPIN_OFF_NAMES } from './originalsRenewal';
import { getSeriesBaseTitle } from './seriesIdentity';

/* 2026-11-16 (player report, EJ: "Tried creating a spin off and I cannot change them"; Zeesh: the cast as the
   production house Greenlight does it). A spin-off of an Original the player's own studio made was ordered in one tap,
   with a cast nobody saw. Now its script goes into that studio's scripts, ready, and it is commissioned like any of the
   player's own scripts, through the Cast step: choose the lead, name every role. An Original made by an outside studio
   keeps the one-tap order (that studio casts it). */

const parentTag = (commissionId: string) => `spinoff-of:${commissionId}`;

const commissionOf = (player: Player, commissionId: string): OwnedStreamingOriginalCommission | undefined => (
    player.ownedStreamingPlatform?.originalCommissions?.find(item => item.id === commissionId)
);

/** the player's own production house that made this Original, if it was one of theirs */
export const getOriginalOwnMaker = (player: Player, commissionId: string): Business | null => {
    const commission = commissionOf(player, commissionId);
    if (!commission || commission.way === 'OUTSIDE' || commission.way === 'PITCH') return null;
    return (player.businesses || []).find(business => business.type === 'PRODUCTION_HOUSE' && business.isActive
        && Boolean(business.studioState) && business.id === commission.producerStudioId) || null;
};

export interface OriginalSpinOffScriptView {
    scriptId: string;
    title: string;
    studioName: string;
    /** in the studio's scripts and not commissioned yet */
    ready: boolean;
}

/** the spin-off script this Original already has in one of the player's studios */
export const getOriginalSpinOffScript = (player: Player, commissionId: string): OriginalSpinOffScriptView | null => {
    for (const studio of player.businesses || []) {
        if (studio.type !== 'PRODUCTION_HOUSE' || !studio.studioState) continue;
        const script = (studio.studioState.scripts || []).find(item => (item.tags || []).includes(parentTag(commissionId)));
        if (script) return { scriptId: script.id, title: script.title, studioName: studio.name, ready: script.status === 'READY' && !script.lockedStreamingFunding };
    }
    return null;
};

/** Puts the spin-off's script in the studio that made the Original, ready to commission (no money moves here: the
    commission is priced in the wizard, like any script of the player's own). */
export const prepareOriginalSpinOffScript = (player: Player, commissionId: string): { player: Player; changed: boolean; message: string; scriptId?: string } => {
    const commission = commissionOf(player, commissionId);
    const view = getOriginalFutureView(player, commissionId);
    const studio = getOriginalOwnMaker(player, commissionId);
    if (!commission || !view || !studio) return { player, changed: false, message: 'That cannot be spun off.' };
    const existing = getOriginalSpinOffScript(player, commissionId);
    if (existing) return { player, changed: false, message: `${existing.title} is already in ${studio.name}'s scripts.`, scriptId: existing.scriptId };
    if (!view.canSpinOff) return { player, changed: false, message: 'That cannot be spun off.' };
    if (view.waitWeeks) return { player, changed: false, message: `The first numbers come in ${view.waitWeeks} more week${view.waitWeeks === 1 ? '' : 's'}.` };

    /* the same name the one-tap order would have given it */
    const rng = createDeterministicRng(`original-spinoff:${commission.id}`);
    const title = `${getSeriesBaseTitle(commission.title)}: ${SPIN_OFF_NAMES[Math.floor(rng() * SPIN_OFF_NAMES.length)]}`;
    const scripts = studio.studioState!.scripts || [];
    const source = scripts.find(item => item.id === commission.scriptId);
    const franchiseId = String(source?.franchiseId || commission.canonicalProjectId || commission.id);
    const script: Script = {
        ...(source || {}),
        id: createDeterministicId('script_spinoff', commission.id, 'original'),
        title,
        status: 'READY',
        projectType: commission.projectType,
        genres: source?.genres?.length ? source.genres : [commission.genre],
        episodes: commission.episodes,
        installmentNumber: 1,
        franchiseId,
        sourceMaterial: 'SPINOFF',
        connectedProjectIntent: 'CROSSOVER',
        tags: ['SPINOFF', 'FRANCHISE', parentTag(commission.id)],
        logline: `A spin-off of ${commission.title}.`,
        returningTalent: [],
        options: source?.options || [],
        quality: Number(source?.quality || 60),
        createdAtWeek: player.currentWeek,
        weeksInDevelopment: 0,
        totalDevelopmentWeeks: 0,
        developmentCost: 0,
        developmentPayment: undefined,
    } as Script;
    delete (script as any).producedAtWeek;
    delete (script as any).lockedStreamingFunding;

    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = player.ownedStreamingPlatform;
    return {
        changed: true,
        scriptId: script.id,
        message: `${title} is ready in ${studio.name}'s scripts. Choose its cast and commission it.`,
        player: {
            ...player,
            businesses: (player.businesses || []).map(item => (item.id !== studio.id ? item : {
                ...item,
                studioState: { ...item.studioState!, scripts: [...scripts, script] },
            })),
            ownedStreamingPlatform: {
                ...platform,
                originalCommissions: platform.originalCommissions.map(item => (item.id !== commission.id ? item : {
                    ...item,
                    lifecycleDecision: item.lifecycleDecision || { id: createDeterministicId('streaming_original_decision', commission.id, 'spinoff'), type: 'FRANCHISE', decidedAtAbsoluteWeek: absoluteWeek, evidenceWeeks: ORIGINAL_EVIDENCE_WEEKS, evidenceSummary: 'A spin-off was started.', exclusiveWindowWeeks: null },
                })),
            },
        },
    };
};
