import type { Business, LegalCase, LifeEvent, NewsItem, Player, Transaction } from '../types';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const roundMoney = (value: number, step = 100_000) => Math.max(step, Math.round(value / step) * step);

export const createStudioNameRightsCase = ({
    player,
    studio,
    protectedName,
    rebrandedName,
    rebrandCost,
}: {
    player: Player;
    studio: Business;
    protectedName: string;
    rebrandedName: string;
    rebrandCost: number;
}): LegalCase => {
    const valuation = Math.max(1, Number(studio.stats?.valuation || studio.balance || 1));
    const settlementDemand = roundMoney(clamp(
        (valuation * 0.035) + (rebrandCost * 0.75),
        12_000_000,
        350_000_000,
    ));
    const legalFeePerHearing = roundMoney(clamp(
        1_500_000 + (valuation * 0.0015),
        2_000_000,
        28_000_000,
    ));
    const restorationCost = roundMoney(clamp(
        (rebrandCost * 0.45) + 1_000_000,
        2_500_000,
        45_000_000,
    ));
    const nextHearingWeek = player.currentWeek >= 52 ? 1 : player.currentWeek + 1;
    const defense = clamp(
        30
        + ((player.stats?.reputation || 0) * 0.18)
        + ((studio.stats?.investorConfidence || 0) * 0.12),
        25,
        65,
    );

    return {
        id: `name_rights_${studio.id}_${player.age}_${player.currentWeek}_${Date.now()}`,
        title: `${protectedName} Naming Rights Claim`,
        description: `The former owners say the acquisition agreement protected the ${protectedName} name. They want damages or the original name restored.`,
        weeksRemaining: 8,
        severity: 'HIGH',
        evidence: 84,
        currentHearing: 1,
        totalHearings: 3,
        nextHearingWeek,
        evidenceStrength: 84,
        playerDefense: Math.round(defense),
        status: 'ACTIVE',
        history: [],
        caseType: 'STUDIO_NAME_RIGHTS',
        studioId: studio.id,
        claimantName: `${protectedName} Former Owners`,
        protectedStudioName: protectedName,
        rebrandedStudioName: rebrandedName,
        settlementDemand,
        legalFeePerHearing,
        restorationCost,
    };
};

const makeNews = (
    player: Player,
    legalCase: LegalCase,
    headline: string,
    subtext: string,
    impactLevel: NewsItem['impactLevel'],
): NewsItem => ({
    id: `news_name_rights_${legalCase.id}_${legalCase.currentHearing}_${Date.now()}`,
    headline,
    subtext,
    category: 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel,
});

const addStudioLegalCharge = (
    player: Player,
    legalCase: LegalCase,
    amount: number,
    label: string,
): Player => {
    const charge = Math.max(0, Math.round(amount));
    const studio = (player.businesses || []).find(candidate => candidate.id === legalCase.studioId);
    const businesses = (player.businesses || []).map(candidate => {
        if (candidate.id !== legalCase.studioId || !candidate.studioState) return candidate;
        return {
            ...candidate,
            balance: Number(candidate.balance || 0) - charge,
            studioState: {
                ...candidate.studioState,
                financeLedger: [{
                    id: `studio_legal_${legalCase.id}_${legalCase.currentHearing}_${Date.now()}`,
                    week: player.currentWeek,
                    year: player.age,
                    amount: -charge,
                    type: 'LEGAL' as const,
                    label,
                }, ...(candidate.studioState.financeLedger || [])].slice(0, 200),
            },
        };
    });
    const transaction: Transaction = {
        id: `tx_studio_legal_${legalCase.id}_${legalCase.currentHearing}_${Date.now()}`,
        week: player.currentWeek,
        year: player.age,
        amount: -charge,
        category: 'BUSINESS',
        description: `${studio?.name || 'Studio'}: ${label}`,
    };
    return {
        ...player,
        businesses,
        finance: {
            ...player.finance,
            history: [transaction, ...(player.finance?.history || [])].slice(0, 200),
        },
    };
};

const updateLegalCase = (player: Player, caseId: string, updater: (legalCase: LegalCase) => LegalCase): Player => ({
    ...player,
    flags: {
        ...player.flags,
        activeCases: (player.flags?.activeCases || []).map((legalCase: LegalCase) => (
            legalCase.id === caseId ? updater(legalCase) : legalCase
        )),
    },
});

const restoreProtectedStudioName = (player: Player, legalCase: LegalCase): Player => {
    const protectedName = legalCase.protectedStudioName || 'Original Studio Name';
    const studioId = legalCase.studioId;
    const acquisitionCases = Array.isArray(player.flags?.studioAcquisitionCases)
        ? player.flags.studioAcquisitionCases
        : [];
    const matchingAcquisitionCase = acquisitionCases.find((acquisitionCase: any) => (
        acquisitionCase?.studioId === studioId
        || acquisitionCase?.closing?.acquiredBusinessId === studioId
    ));
    const originalStudioId = matchingAcquisitionCase?.studioId;
    return {
        ...player,
        businesses: (player.businesses || []).map(studio => {
            if (studio.id !== studioId || !studio.studioState) return studio;
            return {
                ...studio,
                name: protectedName,
                studioState: {
                    ...studio.studioState,
                    saleDeck: studio.studioState.saleDeck
                        ? { ...studio.studioState.saleDeck, studioName: protectedName }
                        : studio.studioState.saleDeck,
                    formerNames: Array.from(new Set([
                        ...(studio.studioState.formerNames || []),
                        studio.name,
                    ].filter(name => name !== protectedName))).slice(-8),
                    brokenAcquisitionCommitments: (studio.studioState.brokenAcquisitionCommitments || [])
                        .filter(commitment => commitment !== 'PRESERVE_STUDIO_NAME'),
                },
            };
        }),
        stocks: (player.stocks || []).map(stock => (
            stock.relatedStudioId === studioId || stock.relatedStudioId === originalStudioId
                ? { ...stock, name: protectedName }
                : stock
        )),
        stockTakeovers: (player.stockTakeovers || []).map(takeover => (
            takeover.acquiredBusinessId === studioId
            || takeover.relatedStudioId === studioId
            || takeover.relatedStudioId === originalStudioId
                ? { ...takeover, companyName: protectedName }
                : takeover
        )),
        flags: {
            ...player.flags,
            studioAcquisitionCases: acquisitionCases.length
                ? acquisitionCases.map((acquisitionCase: any) => {
                    const matches = acquisitionCase?.studioId === studioId
                        || acquisitionCase?.closing?.acquiredBusinessId === studioId;
                    return matches ? { ...acquisitionCase, studioName: protectedName } : acquisitionCase;
                })
                : player.flags?.studioAcquisitionCases,
            acquisitionDebtLedger: Array.isArray(player.flags?.acquisitionDebtLedger)
                ? player.flags.acquisitionDebtLedger.map((entry: any) => (
                    entry?.studioId === studioId ? { ...entry, studioName: protectedName } : entry
                ))
                : player.flags?.acquisitionDebtLedger,
        },
    };
};

const finishWithNews = (
    player: Player,
    legalCase: LegalCase,
    headline: string,
    subtext: string,
    impactLevel: NewsItem['impactLevel'],
    log: string,
) => ({
    ...player,
    news: [makeNews(player, legalCase, headline, subtext, impactLevel), ...(player.news || [])].slice(0, 80),
    logs: [{
        week: player.currentWeek,
        year: player.age,
        message: log,
        type: impactLevel === 'HIGH' ? 'negative' as const : 'neutral' as const,
    }, ...(player.logs || [])].slice(0, 80),
});

export const createStudioNameRightsHearing = (player: Player, caseId: string): LifeEvent | null => {
    const activeCase = player.flags?.activeCases?.find((legalCase: LegalCase) => (
        legalCase.id === caseId
        && legalCase.caseType === 'STUDIO_NAME_RIGHTS'
        && legalCase.status === 'ACTIVE'
    ));
    if (!activeCase) return null;

    const protectedName = activeCase.protectedStudioName || 'the protected studio name';
    const newName = activeCase.rebrandedStudioName || 'the new name';
    const settlementDemand = activeCase.settlementDemand || 15_000_000;
    const legalFee = activeCase.legalFeePerHearing || 2_000_000;
    const restorationCost = activeCase.restorationCost || 3_000_000;

    return {
        id: `hearing_${activeCase.id}_${activeCase.currentHearing}`,
        type: 'LEGAL',
        category: 'STUDIO NAME RIGHTS',
        title: `Name Rights Hearing ${activeCase.currentHearing}/${activeCase.totalHearings}`,
        description: activeCase.currentHearing === 1
            ? `The former owners present the signed promise protecting “${protectedName}.” The judge asks whether you will settle, restore the name, or defend “${newName}” in court.`
            : `The ${protectedName} dispute returns to court. Legal bills are rising, and today’s testimony could decide whether ${newName} survives.`,
        options: [
            {
                id: 'SETTLE_KEEP_NAME',
                label: `Settle & Keep ${newName}`,
                description: `Pay ${settlementDemand.toLocaleString()} from studio capital. The case ends and the new name stays.`,
                previewEffects: [
                    { label: 'Studio Legal Cost', value: `-$${settlementDemand.toLocaleString()}`, tone: 'negative' },
                    { label: 'Case', value: 'Settled', tone: 'neutral' },
                    { label: 'Studio Name', value: 'New name stays', tone: 'positive' },
                ],
                impact: (currentPlayer) => {
                    let next = addStudioLegalCharge(currentPlayer, activeCase, settlementDemand, 'Name-rights settlement');
                    next = updateLegalCase(next, caseId, legalCase => ({
                        ...legalCase,
                        status: 'SETTLED',
                        history: [...legalCase.history, { hearing: legalCase.currentHearing, choice: 'SETTLE_KEEP_NAME' }],
                    }));
                    next = {
                        ...next,
                        stats: { ...next.stats, reputation: clamp((next.stats.reputation || 0) - 2) },
                    };
                    next = finishWithNews(
                        next,
                        activeCase,
                        `${newName} settles naming-rights lawsuit`,
                        `The studio paid ${settlementDemand.toLocaleString()} to the former owners and kept its new identity.`,
                        'MEDIUM',
                        `${newName} settled the naming-rights case for ${settlementDemand.toLocaleString()} and kept its new name.`,
                    );
                    return { updatedPlayer: next, log: `The case is settled. ${newName} remains the studio name.` };
                },
            },
            {
                id: 'RESTORE_NAME',
                label: `Restore ${protectedName}`,
                description: `Pay ${restorationCost.toLocaleString()} in legal and reversal costs. The lawsuit ends and the protected name returns.`,
                previewEffects: [
                    { label: 'Studio Legal Cost', value: `-$${restorationCost.toLocaleString()}`, tone: 'negative' },
                    { label: 'Case', value: 'Withdrawn', tone: 'positive' },
                    { label: 'Studio Name', value: protectedName, tone: 'neutral' },
                ],
                impact: (currentPlayer) => {
                    let next = addStudioLegalCharge(currentPlayer, activeCase, restorationCost, 'Name restoration and court costs');
                    next = restoreProtectedStudioName(next, activeCase);
                    next = updateLegalCase(next, caseId, legalCase => ({
                        ...legalCase,
                        status: 'SETTLED',
                        history: [...legalCase.history, { hearing: legalCase.currentHearing, choice: 'RESTORE_NAME' }],
                    }));
                    next = finishWithNews(
                        next,
                        activeCase,
                        `${protectedName} name restored after court dispute`,
                        `The owner reversed the rebrand. The former owners withdrew their claim after the protected name returned.`,
                        'MEDIUM',
                        `You restored ${protectedName}, paid ${restorationCost.toLocaleString()} in legal and reversal costs, and ended the lawsuit.`,
                    );
                    return { updatedPlayer: next, log: `${protectedName} is restored and the case is closed.` };
                },
            },
            {
                id: 'FIGHT_CASE',
                label: 'Fight the Claim',
                description: `Pay ${legalFee.toLocaleString()} for this hearing. A loss can trigger much larger damages.`,
                previewEffects: [
                    { label: 'Legal Counsel', value: `-$${legalFee.toLocaleString()}`, tone: 'negative' },
                    { label: 'Case Risk', value: `${activeCase.evidenceStrength}%`, tone: 'negative' },
                    { label: 'Hearings Left', value: `${Math.max(0, activeCase.totalHearings - activeCase.currentHearing)}`, tone: 'neutral' },
                ],
                impact: (currentPlayer) => {
                    let next = addStudioLegalCharge(currentPlayer, activeCase, legalFee, `Name-rights hearing ${activeCase.currentHearing}`);
                    const reputation = next.stats?.reputation || 0;
                    const defenseGain = Math.round(clamp(4 + (reputation * 0.08), 4, 12));
                    const isFinalHearing = activeCase.currentHearing >= activeCase.totalHearings;

                    if (!isFinalHearing) {
                        next = updateLegalCase(next, caseId, legalCase => ({
                            ...legalCase,
                            currentHearing: legalCase.currentHearing + 1,
                            nextHearingWeek: next.currentWeek >= 52 ? 1 : next.currentWeek + 1,
                            playerDefense: clamp(legalCase.playerDefense + defenseGain),
                            weeksRemaining: Math.max(0, legalCase.weeksRemaining - 1),
                            history: [...legalCase.history, { hearing: legalCase.currentHearing, choice: 'FIGHT_CASE' }],
                        }));
                        return {
                            updatedPlayer: next,
                            log: `Your lawyers challenged the claim. The case continues after ${legalFee.toLocaleString()} in legal fees.`,
                        };
                    }

                    const finalDefense = activeCase.playerDefense + defenseGain;
                    const won = finalDefense >= activeCase.evidenceStrength;
                    if (won) {
                        next = updateLegalCase(next, caseId, legalCase => ({
                            ...legalCase,
                            status: 'WON',
                            playerDefense: finalDefense,
                            history: [...legalCase.history, { hearing: legalCase.currentHearing, choice: 'FIGHT_CASE_WIN' }],
                        }));
                        next = finishWithNews(
                            next,
                            activeCase,
                            `${newName} wins naming-rights trial`,
                            `The court allowed the new identity to remain. The studio still absorbed ${legalFee.toLocaleString()} in final-hearing costs.`,
                            'MEDIUM',
                            `${newName} won the naming-rights trial and kept its name.`,
                        );
                        return { updatedPlayer: next, log: `You won the case. ${newName} keeps its name.` };
                    }

                    const damages = roundMoney(settlementDemand * 1.65);
                    next = addStudioLegalCharge(next, activeCase, damages, 'Court-ordered naming-rights damages');
                    next = updateLegalCase(next, caseId, legalCase => ({
                        ...legalCase,
                        status: 'LOST',
                        playerDefense: finalDefense,
                        history: [...legalCase.history, { hearing: legalCase.currentHearing, choice: 'FIGHT_CASE_LOSS' }],
                    }));
                    next = {
                        ...next,
                        stats: { ...next.stats, reputation: clamp((next.stats.reputation || 0) - 6) },
                        businesses: next.businesses.map(studio => (
                            studio.id === activeCase.studioId
                                ? {
                                    ...studio,
                                    stats: {
                                        ...studio.stats,
                                        brandHealth: clamp((studio.stats.brandHealth || 0) - 8),
                                        investorConfidence: clamp((studio.stats.investorConfidence || 0) - 10),
                                    },
                                }
                                : studio
                        )),
                    };
                    next = finishWithNews(
                        next,
                        activeCase,
                        `${newName} loses naming-rights trial`,
                        `The court ordered ${damages.toLocaleString()} in damages after finding the acquisition promise was broken.`,
                        'HIGH',
                        `${newName} lost the name-rights case and was ordered to pay ${damages.toLocaleString()} in damages.`,
                    );
                    return { updatedPlayer: next, log: `You lost the case and paid ${damages.toLocaleString()} in court-ordered damages.` };
                },
            },
        ],
    };
};
