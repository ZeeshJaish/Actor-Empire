import {
    GameLanguage,
    Genre,
    LegalCase,
    Message,
    OutsideProducerInvestmentOffer,
    OutsideProductionInvestment,
    OutsideProductionScoutReport,
    Player
} from '../types';
import { getPlayerLanguage, t } from './i18n';

// Fraud-Risk Producer Investment Offers: suspicious deals stay in the same outside-producer flow,
// but carry tempting terms, weak verification, and delayed legal fallout risk.
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const MAX_OUTSIDE_STAKE = 49;
export const OUTSIDE_PRODUCER_COUNTER_LIMIT = 3;

const PRODUCERS = [
    { producerName: 'Marlowe Pictures', studioName: 'Marlowe Pictures', producerType: 'Producer', ownerName: 'Elian Marlowe', lane: 'prestige', flexible: true, trackRecord: 82 },
    { producerName: 'Kismet Global Media', studioName: 'Kismet Global', producerType: 'Co-production Company', ownerName: 'Rhea Kapoor Lane', lane: 'international', flexible: true, trackRecord: 70 },
    { producerName: 'Maple Soundstage Group', studioName: 'Maple Soundstage', producerType: 'Regional Company', ownerName: 'Grant Bellamy', lane: 'contained', flexible: false, trackRecord: 64 },
    { producerName: 'Velvet Lion Ventures', studioName: 'Velvet Lion', producerType: 'Private Investor', ownerName: 'Sofia Vance', lane: 'risk', flexible: true, trackRecord: 44 },
    { producerName: 'Aurum Brands Media', studioName: 'Aurum Brands', producerType: 'Brand-backed Media', ownerName: 'Mina Cole', lane: 'commercial', flexible: false, trackRecord: 61 },
    { producerName: 'Olive Gate Capital', studioName: 'Olive Gate', producerType: 'Film Fund', ownerName: 'Owen Greer', lane: 'clean', flexible: true, trackRecord: 76 },
    { producerName: 'Black Label Gap Finance', studioName: 'Black Label', producerType: 'Gap Finance', ownerName: 'Victor Hale', lane: 'gap', flexible: true, trackRecord: 52 },
    { producerName: 'Clooney House Pictures', studioName: 'Clooney House', producerType: 'Actor-Producer', ownerName: 'Marcus Clooney', lane: 'prestige', flexible: false, trackRecord: 86 },
    { producerName: 'North Pier Features', studioName: 'North Pier', producerType: 'Indie Studio', ownerName: 'June Ackerman', lane: 'contained', flexible: true, trackRecord: 58 },
    { producerName: 'Blue Hour Film Fund', studioName: 'Blue Hour', producerType: 'Film Fund', ownerName: 'Tariq Sol', lane: 'clean', flexible: true, trackRecord: 73 },
    { producerName: 'Crownline Entertainment', studioName: 'Crownline', producerType: 'Commercial Studio', ownerName: 'Nadia Frost', lane: 'commercial', flexible: false, trackRecord: 79 },
    { producerName: 'Riverglass Pictures', studioName: 'Riverglass', producerType: 'Prestige Label', ownerName: 'Iris Calder', lane: 'prestige', flexible: true, trackRecord: 68 },
    { producerName: 'Vista 9 Global', studioName: 'Vista 9', producerType: 'International Sales', ownerName: 'Kenji Vale', lane: 'international', flexible: true, trackRecord: 66 },
    { producerName: 'Copperline Media', studioName: 'Copperline', producerType: 'Private Investor', ownerName: 'Briar Holt', lane: 'risk', flexible: true, trackRecord: 49 },
    { producerName: 'Silver Metro Works', studioName: 'Silver Metro', producerType: 'Regional Company', ownerName: 'Mason Pike', lane: 'gap', flexible: false, trackRecord: 57 },
    { producerName: 'Horizon Lantern', studioName: 'Horizon Lantern', producerType: 'Co-production Company', ownerName: 'Priya Senn', lane: 'international', flexible: true, trackRecord: 81 }
];

const FRAUD_RISK_PRODUCERS = [
    { producerName: 'Sable Meridian Capital', studioName: 'Sable Meridian', producerType: 'Private Finance', ownerName: 'Undisclosed sponsor group', lane: 'risk', flexible: true, trackRecord: 18 },
    { producerName: 'Crescent Vale Partners', studioName: 'Crescent Vale', producerType: 'Private Finance', ownerName: 'Dario Vale', lane: 'risk', flexible: true, trackRecord: 31 },
    { producerName: 'Harborlight Slate Finance', studioName: 'Harborlight Slate', producerType: 'Gap Finance', ownerName: 'Cayman Desk Holdings', lane: 'gap', flexible: true, trackRecord: 26 }
];

const GENRES: Genre[] = ['DRAMA', 'THRILLER', 'ACTION', 'COMEDY', 'HORROR', 'ROMANCE', 'SCI_FI', 'CRIME', 'MYSTERY'];
const DIRECTORS = ['Nora Vale', 'Arman Cross', 'Leena Sato', 'Miles Arden', 'Devika Rao', 'Cole Mercer', 'Iris Bell', 'Theo Vance'];
const CAST = ['Jules Carter', 'Maya Stone', 'Rian Fox', 'Ava Quinn', 'Omar Vale', 'Lena Hart', 'Kai Brooks', 'Nico Reed'];
const TITLE_LEFT = ['Neon', 'Silent', 'Velvet', 'Last', 'Glass', 'Wild', 'After', 'Silver', 'Crimson', 'Lost'];
const TITLE_RIGHT = ['Wound', 'Harbor', 'Witness', 'Signal', 'Promise', 'Season', 'Empire', 'Truth', 'Echo', 'Road'];

const hashString = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const randomFrom = <T>(items: T[], seed: number): T => items[seed % items.length];

const getGenreLabel = (language: GameLanguage, genre: Genre): string => (
    t(language, `services.outsideProducer.genre.${genre}`)
);

const getOutcomeLabel = (language: GameLanguage, outcome?: OutsideProductionInvestment['finalOutcome'] | OutsideProductionInvestment['status']): string => (
    t(language, `services.outsideProducer.outcome.${outcome || 'FINISHED'}`)
);

const formatMoneyShort = (value: number): string => {
    const safe = Math.max(0, Math.round(value || 0));
    if (safe >= 1_000_000_000) return `$${(safe / 1_000_000_000).toFixed(1)}B`;
    if (safe >= 1_000_000) return `$${(safe / 1_000_000).toFixed(safe >= 10_000_000 ? 0 : 1)}M`;
    return `$${Math.round(safe / 1000)}K`;
};

const withOutsideInvestmentTransaction = (
    player: Player,
    amount: number,
    description: string
): Player => ({
    ...player,
    finance: {
        ...player.finance,
        history: [
            {
                id: `tx_outside_production_${Date.now()}_${Math.abs(Math.round(amount))}_${Math.random().toString(36).slice(2, 7)}`,
                week: player.currentWeek,
                year: player.age,
                amount,
                category: 'BUSINESS' as const,
                description
            },
            ...(player.finance?.history || [])
        ].slice(0, 220),
        yearly: player.finance?.yearly || [],
        loans: player.finance?.loans || [],
        credit: player.finance?.credit || { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 }
    }
});

const absoluteWeek = (year: number, week: number): number => Math.max(0, year * 52 + week);

const fromAbsoluteWeek = (absolute: number): { year: number; week: number } => ({
    year: Math.floor(absolute / 52),
    week: Math.max(1, absolute % 52 || 52)
});

const getNextWeekNumber = (week: number): number => week >= 52 ? 1 : week + 1;

const createOutsideProductionLegalCase = (
    player: Player,
    item: OutsideProductionInvestment,
    evidenceStrength: number
): LegalCase => {
    const language = getPlayerLanguage(player);
    return {
        id: `outside_fraud_case_${item.projectId}_${player.age}_${player.currentWeek}`,
        title: t(language, 'services.outsideProducer.legalCase.title', { title: item.projectTitle }),
        description: t(language, 'services.outsideProducer.legalCase.description', {
            producer: item.producerName,
            title: item.projectTitle,
        }),
        weeksRemaining: 0,
        severity: evidenceStrength >= 72 ? 'HIGH' : evidenceStrength >= 52 ? 'MEDIUM' : 'LOW',
        evidence: evidenceStrength,
        currentHearing: 1,
        totalHearings: evidenceStrength >= 70 ? 4 : 3,
        nextHearingWeek: getNextWeekNumber(player.currentWeek),
        evidenceStrength,
        playerDefense: clamp(55 + (player.stats?.reputation || 0) * 0.25 - evidenceStrength * 0.2, 18, 82),
        status: 'ACTIVE',
        history: []
    };
};

const getFraudRiskOutcome = (item: OutsideProductionInvestment): 'LEGIT' | 'MESSY_DELAY' | 'FRAUD_CASE' | 'BIG_UPSIDE' => {
    if (String(item.projectId).includes('cheat_outside_fraud_active')) return 'FRAUD_CASE';
    const roll = hashString(`${item.projectId}:${item.investedAmount}:${item.stakePercent}:fraud-risk`) % 100;
    if (roll < 10) return 'FRAUD_CASE';
    if (roll < 35) return 'MESSY_DELAY';
    if (roll >= 95) return 'BIG_UPSIDE';
    return 'LEGIT';
};

const getPlayerRecognitionScore = (player: Player): number => {
    const fame = Number(player.stats?.fame || 0);
    const reputation = Number(player.stats?.reputation || 0);
    const awards = (player.awards || []).filter(award => award.outcome === 'WON').length;
    const creditedProjects = (player.pastProjects || []).length + (player.activeReleases || []).length;
    const producerWins = (player.outsideProductions || []).filter(item => (item.profit || 0) > 0).length;
    const cashSignal = Math.min(18, Math.log10(Math.max(1, player.money || 0)) * 2.2);
    return clamp(fame * 0.45 + reputation * 0.28 + awards * 3 + creditedProjects * 1.2 + producerWins * 2.5 + cashSignal, 0, 100);
};

export const getOutsideProducerOfferCadenceWeeks = (player: Player): number => {
    const recognition = getPlayerRecognitionScore(player);
    const activeExposure = (player.outsideProductions || []).filter(item => !['FINISHED', 'CANCELLED'].includes(item.status)).length;
    const completedWins = (player.outsideProductions || []).filter(item => item.finalOutcome === 'HIT' || item.finalOutcome === 'PROFIT').length;
    const base = recognition >= 78 ? 8 : recognition >= 58 ? 12 : 15;
    const exposureDelay = Math.min(6, activeExposure * 2);
    const winPullForward = Math.min(2, completedWins);
    const jitter = hashString(`${player.name}:${player.age}:${player.currentWeek}:outside-cadence:${completedWins}:${activeExposure}`) % 3;
    return Math.round(clamp(base + exposureDelay + jitter - winPullForward, 8, 18));
};

export const hasOutsideProductionExposure = (player: Player, projectId: string, ignoreOfferId?: string): boolean => {
    const activeExposure = (player.outsideProductions || []).some(item =>
        item.projectId === projectId && !['FINISHED', 'CANCELLED'].includes(item.status)
    );
    const pendingOffer = (player.inbox || []).some(message =>
        message.id !== ignoreOfferId && message.type === 'OFFER_OUTSIDE_PRODUCER_INVESTMENT' && message.data?.projectId === projectId
    );
    return activeExposure || pendingOffer;
};

const buildScoutReport = (seed: number, recognition: number, lane: string): OutsideProductionScoutReport => {
    const scriptQuality = 42 + (seed % 45);
    const directorQuality = 38 + ((seed >> 3) % 48);
    const castQuality = 35 + ((seed >> 5) % 50);
    const budgetDiscipline = 36 + ((seed >> 7) % 46);
    const marketFit = 40 + ((seed >> 9) % 48);
    const buzz = clamp(25 + ((seed >> 11) % 42) + recognition * 0.18, 0, 100);
    const riskBase = 100 - (budgetDiscipline * 0.35 + scriptQuality * 0.2 + castQuality * 0.18 + directorQuality * 0.16 + marketFit * 0.11);
    const laneRisk = lane === 'risk' ? 12 : lane === 'prestige' ? 5 : lane === 'contained' ? -6 : 0;
    const risk = clamp(Math.round(riskBase + laneRisk), 5, 88);
    const quality = scriptQuality * 0.28 + directorQuality * 0.2 + castQuality * 0.2 + marketFit * 0.22 + buzz * 0.1;
    return {
        scriptQuality,
        directorQuality,
        castQuality,
        budgetDiscipline,
        marketFit,
        buzz: Math.round(buzz),
        risk,
        roiLowPct: Math.round(-55 + quality * 0.45 - risk * 0.5),
        roiHighPct: Math.round(25 + quality * 1.15 + buzz * 0.45 - risk * 0.15)
    };
};

export const calculateOutsideInvestmentAcceptanceChance = ({
    offer,
    cashAmount,
    stakePercent,
    player
}: {
    offer: OutsideProducerInvestmentOffer;
    cashAmount: number;
    stakePercent: number;
    player: Player;
}): number => {
    const maxCounterAttempts = Number(offer.maxCounterAttempts || OUTSIDE_PRODUCER_COUNTER_LIMIT);
    const currentCounterAttempts = Math.max(0, Number(offer.counterAttempts || (offer.counterUsed ? 1 : 0)));
    if (offer.finalTerms || offer.counterClosed || currentCounterAttempts >= maxCounterAttempts) return 0;
    if (cashAmount < offer.minCashAsk || cashAmount > offer.maxCashAsk || stakePercent <= 0 || stakePercent > MAX_OUTSIDE_STAKE) return 0;
    if (cashAmount > player.money) return 0;
    const cashRatio = cashAmount / Math.max(1, offer.cashAsk);
    const stakePremium = stakePercent - offer.offeredStakePercent * cashRatio;
    const recognition = getPlayerRecognitionScore(player);
    const fairStake = (cashAmount / Math.max(1, offer.budget)) * 100;
    const askPressure = Math.max(0, stakePercent - fairStake * 1.45);
    return Math.round(clamp(offer.acceptanceChance + recognition * 0.12 + (cashRatio - 1) * 18 - stakePremium * 3.2 - askPressure * 2.4, 3, 92));
};

export const generateOutsideProducerInvestmentOffers = (player: Player, count = 1): OutsideProducerInvestmentOffer[] => {
    const language = getPlayerLanguage(player);
    const recognition = getPlayerRecognitionScore(player);
    if (recognition < 38 || player.money < 1_500_000) return [];
    const absolute = absoluteWeek(player.age, player.currentWeek);
    const offers: OutsideProducerInvestmentOffer[] = [];
    const desired = clamp(count, 1, 2);

    for (let index = 0; index < desired; index += 1) {
        const seed = hashString(`${player.name}:${absolute}:${index}:${player.money}:${player.stats?.fame || 0}`);
        const isFraudRiskOffer = recognition >= 45 && (seed % 100) < 14;
        const producer = isFraudRiskOffer ? randomFrom(FRAUD_RISK_PRODUCERS, seed + index) : randomFrom(PRODUCERS, seed + index);
        const genre = randomFrom(GENRES, seed >> 2);
        const projectTitle = `${randomFrom(TITLE_LEFT, seed >> 4)} ${randomFrom(TITLE_RIGHT, seed >> 6)}`;
        const projectId = `outside_${absolute}_${index}_${projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
        if (hasOutsideProductionExposure(player, projectId)) continue;

        const budget = Math.round((8_000_000 + (seed % 82_000_000)) / 100_000) * 100_000;
        const askRatio = isFraudRiskOffer ? 0.045 + ((seed >> 8) % 7) / 100 : 0.08 + ((seed >> 8) % 19) / 100;
        const cashAsk = Math.min(player.money, Math.round((budget * askRatio) / 100_000) * 100_000);
        if (cashAsk < 1_000_000) continue;
        const cleanStake = (cashAsk / budget) * 100;
        const offeredStakePercent = Math.round(clamp(cleanStake * (isFraudRiskOffer ? 2.45 + ((seed >> 13) % 70) / 100 : 1.08 + ((seed >> 13) % 24) / 100), 3, isFraudRiskOffer ? 49 : 42) * 10) / 10;
        const finalTerms = !producer.flexible || (seed % 5 === 0);
        const baseScoutReport = buildScoutReport(seed, recognition, producer.lane);
        const scoutReport = isFraudRiskOffer
            ? {
                ...baseScoutReport,
                risk: clamp(baseScoutReport.risk - 8, 18, 70),
                roiLowPct: Math.min(baseScoutReport.roiLowPct, -45),
                roiHighPct: Math.max(baseScoutReport.roiHighPct, 165)
            }
            : baseScoutReport;
        const acceptanceChance = Math.round(clamp(56 + recognition * 0.25 + scoutReport.marketFit * 0.08 - scoutReport.risk * 0.22, 18, 88));
        offers.push({
            id: `outside_offer_${projectId}`,
            projectId,
            projectTitle,
            producerName: producer.producerName,
            studioName: producer.studioName,
            producerType: producer.producerType,
            ownerName: producer.ownerName,
            trackRecord: producer.trackRecord,
            genre,
            logline: isFraudRiskOffer
                ? t(language, 'services.outsideProducer.offer.logline.fraud', { genre: getGenreLabel(language, genre) })
                : t(language, 'services.outsideProducer.offer.logline.clean', { genre: getGenreLabel(language, genre) }),
            budget,
            cashAsk,
            offeredStakePercent,
            maxStakePercent: MAX_OUTSIDE_STAKE,
            minCashAsk: Math.round(cashAsk * 0.55 / 100_000) * 100_000,
            maxCashAsk: Math.round(Math.min(player.money, cashAsk * 1.8, budget * 0.38) / 100_000) * 100_000,
            flexible: !finalTerms,
            finalTerms,
            counterAttempts: 0,
            maxCounterAttempts: OUTSIDE_PRODUCER_COUNTER_LIMIT,
            acceptanceChance,
            scoutReport,
            directorName: randomFrom(DIRECTORS, seed >> 10),
            castNames: [randomFrom(CAST, seed >> 12), randomFrom(CAST, seed >> 14), randomFrom(CAST, seed >> 16)].filter((name, idx, arr) => arr.indexOf(name) === idx),
            expectedReleaseWeeks: 8 + ((seed >> 17) % 18),
            expectedRunWeeks: 4 + ((seed >> 20) % 7),
            releasePath: scoutReport.marketFit > 72 ? 'THEATRICAL' : scoutReport.scriptQuality > 76 && scoutReport.buzz < 55 ? 'FESTIVAL' : 'STREAMING',
            fraudRisk: isFraudRiskOffer ? 'HIGH' : 'NONE',
            riskSignals: isFraudRiskOffer ? ['GENEROUS_TERMS', 'UNVERIFIED_FINANCING', 'SHELL_COMPANY', 'RUSHED_CLOSE'] : [],
            financingStatus: isFraudRiskOffer ? 'UNVERIFIED_FINANCING' : 'VERIFIED',
            legalExposure: isFraudRiskOffer ? 68 + (seed % 24) : 0,
            createdWeek: player.currentWeek,
            createdYear: player.age,
            expiresInWeeks: 3
        });
    }

    return offers;
};

export const acceptOutsideProducerInvestmentOffer = (
    player: Player,
    offer: OutsideProducerInvestmentOffer,
    override?: { cashAmount?: number; stakePercent?: number }
): { player: Player; accepted: boolean; reason?: string; investment?: OutsideProductionInvestment } => {
    const language = getPlayerLanguage(player);
    const investedAmount = Math.max(0, Math.round(override?.cashAmount ?? offer.cashAsk));
    const stakePercent = Math.round(clamp(override?.stakePercent ?? offer.offeredStakePercent, 0, MAX_OUTSIDE_STAKE) * 10) / 10;
    if (offer.counterClosed) return { player, accepted: false, reason: offer.counterClosedReason || 'Producer walked away after three declined counters.' };
    if (hasOutsideProductionExposure(player, offer.projectId, offer.id)) return { player, accepted: false, reason: t(language, 'services.outsideProducer.reason.alreadyExposed') };
    if (investedAmount <= 0 || stakePercent <= 0 || stakePercent > MAX_OUTSIDE_STAKE) return { player, accepted: false, reason: t(language, 'services.outsideProducer.reason.invalidStake') };
    if (investedAmount > player.money) return { player, accepted: false, reason: t(language, 'services.outsideProducer.reason.notEnoughCash') };

    const releaseAt = fromAbsoluteWeek(absoluteWeek(player.age, player.currentWeek) + offer.expectedReleaseWeeks);
    const fraudRisk = offer.fraudRisk || 'NONE';
    const fraudFalloutAbsoluteWeek = fraudRisk !== 'NONE'
        ? absoluteWeek(player.age, player.currentWeek) + 3 + (hashString(`${offer.projectId}:fallout`) % 8)
        : undefined;
    const investment: OutsideProductionInvestment = {
        id: `outside_investment_${offer.projectId}`,
        offerId: offer.id,
        projectId: offer.projectId,
        projectTitle: offer.projectTitle,
        producerName: offer.producerName,
        studioName: offer.studioName,
        producerType: offer.producerType,
        ownerName: offer.ownerName,
        trackRecord: offer.trackRecord,
        genre: offer.genre,
        logline: offer.logline,
        budget: offer.budget,
        investedAmount,
        stakePercent,
        status: 'FUNDED',
        scoutReport: offer.scoutReport,
        directorName: offer.directorName,
        castNames: offer.castNames,
        releasePath: offer.releasePath,
        acceptedWeek: player.currentWeek,
        acceptedYear: player.age,
        releaseWeek: releaseAt.week,
        releaseYear: releaseAt.year,
        fraudRisk,
        riskSignals: offer.riskSignals || [],
        financingStatus: offer.financingStatus || 'VERIFIED',
        legalExposure: offer.legalExposure || 0,
        fraudFalloutAbsoluteWeek,
        eventLog: [
            t(language, 'services.outsideProducer.event.accepted', {
                amount: formatMoneyShort(investedAmount),
                stake: stakePercent,
                title: offer.projectTitle,
            }),
            ...(fraudRisk !== 'NONE' ? [t(language, 'services.outsideProducer.event.weakVerification')] : [])
        ]
    };

    return {
        accepted: true,
        investment,
        player: withOutsideInvestmentTransaction({
            ...player,
            money: player.money - investedAmount,
            outsideProductions: [investment, ...(player.outsideProductions || [])].slice(0, 60),
            inbox: (player.inbox || []).filter(message => message.id !== offer.id && message.data?.projectId !== offer.projectId),
            logs: [
                ...(player.logs || []),
                {
                    week: player.currentWeek,
                    year: player.age,
                    message: t(language, 'services.outsideProducer.accept.log', {
                        title: offer.projectTitle,
                        amount: formatMoneyShort(investedAmount),
                        stake: stakePercent,
                    }),
                    type: 'neutral' as const
                }
            ].slice(-80)
        }, -investedAmount, t(language, 'services.outsideProducer.finance.investment', {
            title: offer.projectTitle,
            stake: stakePercent,
        }))
    };
};

export const counterOutsideProducerInvestmentOffer = (
    player: Player,
    offer: OutsideProducerInvestmentOffer,
    cashAmount: number,
    stakePercent: number
): { player: Player; accepted: boolean; declined: boolean; chance: number; reason?: string; investment?: OutsideProductionInvestment } => {
    const language = getPlayerLanguage(player);
    const chance = calculateOutsideInvestmentAcceptanceChance({ offer, cashAmount, stakePercent, player });
    const maxCounterAttempts = Number(offer.maxCounterAttempts || OUTSIDE_PRODUCER_COUNTER_LIMIT);
    const currentCounterAttempts = Math.max(0, Number(offer.counterAttempts || (offer.counterUsed ? 1 : 0)));
    const nextCounterAttempts = Math.min(maxCounterAttempts, currentCounterAttempts + 1);
    const counterClosedReason = 'Producer walked away after three declined counters.';
    const counterFeedback = {
        accepted: false,
        declined: true,
        chance,
        cashAmount,
        stakePercent,
        week: player.currentWeek,
        year: player.age,
        attempt: nextCounterAttempts,
        reason: t(language, 'services.outsideProducer.reason.counterDeclined')
    };
    const updateOutsideProducerOfferInInbox = (
        sourcePlayer: Player,
        nextOffer: OutsideProducerInvestmentOffer
    ): Player => ({
        ...sourcePlayer,
        inbox: (sourcePlayer.inbox || []).map(message => {
            const isTargetOffer = message.id === offer.id
                || message.data?.id === offer.id
                || message.data?.projectId === offer.projectId;
            if (!isTargetOffer) return message;
            return {
                ...message,
                data: nextOffer,
                isRead: false,
            };
        })
    });

    if (offer.finalTerms || offer.counterClosed || currentCounterAttempts >= maxCounterAttempts || chance <= 0) {
        const counterClosed = offer.counterClosed || currentCounterAttempts >= maxCounterAttempts;
        return {
            player: updateOutsideProducerOfferInInbox(player, {
                ...offer,
                counterAttempts: currentCounterAttempts,
                maxCounterAttempts,
                counterUsed: currentCounterAttempts >= maxCounterAttempts,
                counterClosed,
                counterClosedReason: counterClosed ? (offer.counterClosedReason || counterClosedReason) : undefined,
                lastCounterFeedback: counterFeedback,
            }),
            accepted: false,
            declined: true,
            chance,
            reason: t(language, 'services.outsideProducer.reason.counterDeclined')
        };
    }
    const roll = hashString(`${offer.id}:${cashAmount}:${stakePercent}:${player.age}:${player.currentWeek}`) % 100;
    if (roll >= chance) {
        const counterClosed = nextCounterAttempts >= maxCounterAttempts;
        const counterDeclinedLog = {
            week: player.currentWeek,
            year: player.age,
            message: t(language, 'services.outsideProducer.counter.declinedLog', {
                producer: offer.producerName,
                stake: stakePercent,
                title: offer.projectTitle,
            }),
            type: 'neutral' as const
        };
        return {
            player: updateOutsideProducerOfferInInbox({
                ...player,
                logs: [
                    ...(player.logs || []),
                    counterDeclinedLog
                ].slice(-80)
            }, {
                ...offer,
                counterAttempts: nextCounterAttempts,
                maxCounterAttempts,
                counterUsed: nextCounterAttempts >= maxCounterAttempts,
                counterClosed: nextCounterAttempts >= maxCounterAttempts,
                counterClosedReason: counterClosed ? counterClosedReason : undefined,
                lastCounterFeedback: counterFeedback,
            }),
            accepted: false,
            declined: true,
            chance,
            reason: t(language, 'services.outsideProducer.reason.counterDeclined')
        };
    }
    const result = acceptOutsideProducerInvestmentOffer(player, {
        ...offer,
        counterUsed: true,
        counterAttempts: nextCounterAttempts,
        maxCounterAttempts,
    }, { cashAmount, stakePercent });
    return { ...result, declined: false, chance };
};

export const buildOutsideProducerInvestmentMessage = (offer: OutsideProducerInvestmentOffer, language: GameLanguage = 'en'): Message => ({
    id: offer.id,
    sender: t(language, 'services.outsideProducer.offer.sender', { producer: offer.producerName }),
    subject: t(language, 'services.outsideProducer.offer.subject', { title: offer.projectTitle }),
    text: t(language, 'services.outsideProducer.offer.text', {
        producer: offer.producerName,
        amount: formatMoneyShort(offer.cashAsk),
        stake: offer.offeredStakePercent,
        title: offer.projectTitle,
        ownerLine: offer.ownerName ? t(language, 'services.outsideProducer.offer.ownerLine', { owner: offer.ownerName }) : '',
        fraudLine: offer.fraudRisk && offer.fraudRisk !== 'NONE' ? t(language, 'services.outsideProducer.offer.fraudLine') : '',
        termsLine: offer.finalTerms
            ? t(language, 'services.outsideProducer.offer.finalTermsLine')
            : t(language, 'services.outsideProducer.offer.counterLine'),
    }),
    type: 'OFFER_OUTSIDE_PRODUCER_INVESTMENT',
    data: offer,
    isRead: false,
    weekSent: offer.createdWeek,
    expiresIn: offer.expiresInWeeks
});

const getOutsideOutcomeEconomics = (item: OutsideProductionInvestment) => {
    const payout = Math.max(0, item.playerPayout || 0);
    const profit = payout - item.investedAmount;
    const roi = item.investedAmount > 0 ? Math.round((profit / item.investedAmount) * 100) : 0;
    return { payout, profit, roi };
};

const getOutsideOutcomeReputationImpact = (item: OutsideProductionInvestment): number => {
    switch (item.finalOutcome) {
        case 'HIT': return 3;
        case 'PROFIT': return 1.4;
        case 'BREAK_EVEN': return 0.3;
        case 'LOSS': return -1.2;
        case 'CANCELLED': return -2;
        default: return 0;
    }
};

const buildOutsideOutcomeSummary = (item: OutsideProductionInvestment, language: GameLanguage): string => {
    const { payout, profit, roi } = getOutsideOutcomeEconomics(item);
    return t(language, 'services.outsideProducer.result.summary', {
        title: item.projectTitle,
        outcome: getOutcomeLabel(language, item.finalOutcome || item.status),
        invested: formatMoneyShort(item.investedAmount),
        payout: formatMoneyShort(payout),
        direction: t(language, profit >= 0 ? 'services.outsideProducer.result.profit' : 'services.outsideProducer.result.loss'),
        profit: formatMoneyShort(Math.abs(profit)),
        roi,
    });
};

export const buildOutsideProductionResultMessage = (item: OutsideProductionInvestment, player: Player): Message => {
    const language = getPlayerLanguage(player);
    const { payout, profit, roi } = getOutsideOutcomeEconomics(item);
    return {
        id: `outside_result_${item.projectId}_${player.age}_${player.currentWeek}`,
        sender: t(language, 'services.outsideProducer.result.sender', { studio: item.studioName }),
        subject: t(language, 'services.outsideProducer.result.subject', { title: item.projectTitle }),
        text: t(language, 'services.outsideProducer.result.text', {
            outcome: getOutcomeLabel(language, item.finalOutcome || 'FINISHED'),
            producer: item.producerName,
            receipts: formatMoneyShort(item.producerReceipts || 0),
            stake: item.stakePercent,
            payout: formatMoneyShort(payout),
            direction: t(language, profit >= 0 ? 'services.outsideProducer.result.aProfit' : 'services.outsideProducer.result.aLoss'),
            profit: formatMoneyShort(Math.abs(profit)),
            roi,
        }),
        type: 'SYSTEM',
        data: {
            kind: 'OUTSIDE_PRODUCER_RESULT',
            outsideProductionId: item.id,
            projectId: item.projectId,
            projectTitle: item.projectTitle,
            finalOutcome: item.finalOutcome,
            investedAmount: item.investedAmount,
            stakePercent: item.stakePercent,
            producerReceipts: item.producerReceipts || 0,
            payout,
            profit,
            roi,
            releaseWeek: item.releaseWeek,
            releaseYear: item.releaseYear,
            acceptedWeek: item.acceptedWeek,
            acceptedYear: item.acceptedYear,
            finishWeek: item.finishWeek,
            finishYear: item.finishYear,
            releasePath: item.releasePath,
            producerName: item.producerName
        },
        isRead: false,
        weekSent: player.currentWeek,
        expiresIn: 8
    };
};

const resolveOutsideProduction = (player: Player, item: OutsideProductionInvestment): OutsideProductionInvestment => {
    const language = getPlayerLanguage(player);
    const seed = hashString(`${item.projectId}:${item.acceptedYear}:${item.investedAmount}`);
    const quality = item.scoutReport.scriptQuality * 0.26
        + item.scoutReport.directorQuality * 0.18
        + item.scoutReport.castQuality * 0.22
        + item.scoutReport.marketFit * 0.2
        + item.scoutReport.buzz * 0.14
        - item.scoutReport.risk * 0.28;
    const cancellationRoll = seed % 100;
    if (cancellationRoll < Math.max(2, item.scoutReport.risk - 66)) {
        return {
            ...item,
            status: 'CANCELLED',
            finalOutcome: 'CANCELLED',
            grossRevenue: 0,
            producerReceipts: Math.round(item.investedAmount * 0.18),
            playerPayout: Math.round(item.investedAmount * 0.18),
            profit: Math.round(item.investedAmount * -0.82),
            reputationImpact: -2,
            resultSummary: t(language, 'services.outsideProducer.result.cancelledSummary', { title: item.projectTitle }),
            eventLog: [...(item.eventLog || []), t(language, 'services.outsideProducer.result.cancelledSummary', { title: item.projectTitle })]
        };
    }
    const multiplier = Math.max(0.12, (quality + 48 + (seed % 45)) / 100);
    const pathMultiplier = item.releasePath === 'THEATRICAL' ? 2.15 : item.releasePath === 'FESTIVAL' ? 1.15 : 1.35;
    const grossRevenue = Math.round(item.budget * multiplier * pathMultiplier);
    const producerReceiptRate = item.releasePath === 'THEATRICAL' ? 0.46 : item.releasePath === 'FESTIVAL' ? 0.38 : 0.72;
    const producerReceipts = Math.round(grossRevenue * producerReceiptRate);
    const playerPayout = Math.round(producerReceipts * (item.stakePercent / 100));
    const profit = playerPayout - item.investedAmount;
    const finalOutcome: OutsideProductionInvestment['finalOutcome'] = profit >= item.investedAmount * 0.75
        ? 'HIT'
        : profit > item.investedAmount * 0.08
            ? 'PROFIT'
            : profit > -item.investedAmount * 0.12
                ? 'BREAK_EVEN'
                : 'LOSS';
    return {
        ...item,
        status: 'FINISHED',
        finalOutcome,
        grossRevenue,
        producerReceipts,
        playerPayout,
        profit,
        reputationImpact: getOutsideOutcomeReputationImpact({ ...item, finalOutcome, playerPayout, profit }),
        resultSummary: buildOutsideOutcomeSummary({ ...item, finalOutcome, producerReceipts, playerPayout, profit }, language),
        eventLog: [...(item.eventLog || []), t(language, 'services.outsideProducer.result.eventPaid', {
            title: item.projectTitle,
            releasePath: t(language, `services.outsideProducer.releasePath.${item.releasePath}`),
            payout: formatMoneyShort(playerPayout),
        })]
    };
};

const buildOutsideFraudFalloutMessage = (
    item: OutsideProductionInvestment,
    player: Player,
    outcome: 'MESSY_DELAY' | 'FRAUD_CASE' | 'BIG_UPSIDE' | 'LEGIT',
    legalFees = 0
): Message => {
    const language = getPlayerLanguage(player);
    const outcomeKey = outcome.toLowerCase();
    const subject = t(language, `services.outsideProducer.fraud.subject.${outcomeKey}`, { title: item.projectTitle });
    const text = t(language, `services.outsideProducer.fraud.text.${outcomeKey}`, {
        title: item.projectTitle,
        legalFees: formatMoneyShort(legalFees),
    });
    return {
        id: `outside_fraud_${item.projectId}_${player.age}_${player.currentWeek}`,
        sender: t(language, 'services.outsideProducer.fraud.sender', { studio: item.studioName }),
        subject,
        text,
        type: 'SYSTEM',
        data: { outsideProductionId: item.id, projectId: item.projectId, fraudOutcome: outcome, legalFees },
        isRead: false,
        weekSent: player.currentWeek,
        expiresIn: 8
    };
};

export const processOutsideProductionsWeek = (player: Player): { player: Player; logs: string[]; payouts: number } => {
    const language = getPlayerLanguage(player);
    const currentAbsolute = absoluteWeek(player.age, player.currentWeek);
    let payouts = 0;
    let legalFees = 0;
    let reputationImpact = 0;
    const logs: Array<{ message: string; type: 'positive' | 'neutral' | 'negative' }> = [];
    const resultMessages: Message[] = [];
    const legalCases: LegalCase[] = [];
    const nextItems = (player.outsideProductions || []).map(item => {
        if (!['FUNDED', 'RELEASED', 'STREAMING'].includes(item.status)) return item;
        const releaseAbsolute = absoluteWeek(item.releaseYear, item.releaseWeek);
        if (
            item.fraudRisk && item.fraudRisk !== 'NONE' &&
            item.fraudFalloutAbsoluteWeek &&
            !item.fraudFalloutResolved &&
            currentAbsolute >= item.fraudFalloutAbsoluteWeek
        ) {
            const fraudOutcome = getFraudRiskOutcome(item);
            if (fraudOutcome === 'FRAUD_CASE') {
                const evidenceStrength = clamp(item.legalExposure || 66, 45, 92);
                const fee = Math.round(Math.max(250_000, item.investedAmount * 0.16) / 50_000) * 50_000;
                legalFees += fee;
                reputationImpact -= 4.5;
                legalCases.push(createOutsideProductionLegalCase(player, item, evidenceStrength));
                resultMessages.push(buildOutsideFraudFalloutMessage(item, player, 'FRAUD_CASE', fee));
                logs.push({
                    message: t(language, 'services.outsideProducer.weekly.fraudCase', { title: item.projectTitle, fee: formatMoneyShort(fee) }),
                    type: 'negative',
                });
                const finish = fromAbsoluteWeek(currentAbsolute);
                return {
                    ...item,
                    status: 'CANCELLED' as const,
                    finalOutcome: 'FRAUD_CASE' as const,
                    grossRevenue: 0,
                    producerReceipts: 0,
                    playerPayout: 0,
                    profit: -item.investedAmount - fee,
                    reputationImpact: -4.5,
                    legalFees: fee,
                    fraudFalloutResolved: true,
                    finishWeek: finish.week,
                    finishYear: finish.year,
                    resultSummary: t(language, 'services.outsideProducer.fraud.summary.fraudCase', { title: item.projectTitle }),
                    eventLog: [...(item.eventLog || []), t(language, 'services.outsideProducer.fraud.event.fraudCase', { fee: formatMoneyShort(fee) })]
                };
            }
            if (fraudOutcome === 'MESSY_DELAY') {
                const delayedRelease = fromAbsoluteWeek(currentAbsolute + 7);
                reputationImpact -= 0.8;
                resultMessages.push(buildOutsideFraudFalloutMessage(item, player, 'MESSY_DELAY'));
                logs.push({
                    message: t(language, 'services.outsideProducer.weekly.messyDelay', { title: item.projectTitle }),
                    type: 'neutral',
                });
                return {
                    ...item,
                    status: 'FUNDED' as const,
                    releaseWeek: delayedRelease.week,
                    releaseYear: delayedRelease.year,
                    fraudFalloutResolved: true,
                    scoutReport: { ...item.scoutReport, risk: clamp(item.scoutReport.risk + 8, 0, 100), buzz: clamp(item.scoutReport.buzz - 6, 0, 100) },
                    eventLog: [...(item.eventLog || []), t(language, 'services.outsideProducer.fraud.event.messyDelay')]
                };
            }
            if (fraudOutcome === 'BIG_UPSIDE') {
                resultMessages.push(buildOutsideFraudFalloutMessage(item, player, 'BIG_UPSIDE'));
                logs.push({
                    message: t(language, 'services.outsideProducer.weekly.bigUpside', { title: item.projectTitle }),
                    type: 'positive',
                });
                return {
                    ...item,
                    fraudFalloutResolved: true,
                    scoutReport: { ...item.scoutReport, buzz: clamp(item.scoutReport.buzz + 14, 0, 100), marketFit: clamp(item.scoutReport.marketFit + 7, 0, 100) },
                    eventLog: [...(item.eventLog || []), t(language, 'services.outsideProducer.fraud.event.bigUpside')]
                };
            }
            resultMessages.push(buildOutsideFraudFalloutMessage(item, player, 'LEGIT'));
            logs.push({
                message: t(language, 'services.outsideProducer.weekly.legit', { title: item.projectTitle }),
                type: 'positive',
            });
            return {
                ...item,
                fraudFalloutResolved: true,
                eventLog: [...(item.eventLog || []), t(language, 'services.outsideProducer.fraud.event.legit')]
            };
        }
        const finishAbsolute = releaseAbsolute + Math.max(1, Math.round((item.budget / 15_000_000) % 5) + 3);
        if (currentAbsolute < finishAbsolute) {
            if (currentAbsolute >= releaseAbsolute && item.status === 'FUNDED') {
                const nextStatus: OutsideProductionInvestment['status'] = item.releasePath === 'STREAMING' ? 'STREAMING' : 'RELEASED';
                return { ...item, status: nextStatus };
            }
            return item;
        }
        const resolved = resolveOutsideProduction(player, item);
        payouts += Math.max(0, resolved.playerPayout || 0);
        reputationImpact += resolved.reputationImpact || 0;
        resultMessages.push(buildOutsideProductionResultMessage(resolved, player));
        logs.push({
            message: t(language, 'services.outsideProducer.weekly.resolved', {
                title: resolved.projectTitle,
                outcome: getOutcomeLabel(language, resolved.finalOutcome),
                payout: formatMoneyShort(resolved.playerPayout || 0),
            }),
            type: 'positive',
        });
        const finish = fromAbsoluteWeek(currentAbsolute);
        return { ...resolved, finishWeek: finish.week, finishYear: finish.year };
    });

    if (!payouts && !legalFees && !logs.length) return { player, logs: logs.map(entry => entry.message), payouts };
    let nextPlayer: Player = {
            ...player,
            money: player.money + payouts - legalFees,
            outsideProductions: nextItems,
            stats: {
                ...player.stats,
                reputation: Math.round(clamp((player.stats?.reputation || 0) + reputationImpact, 0, 100) * 10) / 10,
                fame: Math.round(clamp((player.stats?.fame || 0) + Math.max(0, reputationImpact) * 0.25, 0, 100) * 10) / 10
            },
            inbox: [...resultMessages, ...(player.inbox || [])].slice(0, 120),
            flags: {
                ...(player.flags || {}),
                activeCases: [...legalCases, ...((player.flags as any)?.activeCases || [])].slice(0, 20)
            },
            logs: [
                ...(player.logs || []),
                ...logs.map(entry => ({
                    week: player.currentWeek,
                    year: player.age,
                    message: t(language, 'services.outsideProducer.weekly.logPrefix', { message: entry.message }),
                    type: entry.type
                }))
            ].slice(-80)
        };
    if (payouts) {
        nextPlayer = withOutsideInvestmentTransaction(nextPlayer, payouts, t(language, 'services.outsideProducer.finance.payout'));
    }
    if (legalFees) {
        nextPlayer = withOutsideInvestmentTransaction(nextPlayer, -legalFees, t(language, 'services.outsideProducer.finance.legalFees'));
    }
    return {
        payouts,
        logs: logs.map(entry => entry.message),
        player: nextPlayer
    };
};
