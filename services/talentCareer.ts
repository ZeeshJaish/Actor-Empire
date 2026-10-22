import type { TalentCareerProfile, TalentCareerState, TalentParticipationPackage, WorldState } from '../types';

type TalentCredit = { talentId: string; talentName: string; role: 'ACTOR' | 'DIRECTOR' | 'WRITER' };
type TalentFee = TalentCredit & { amount: number };

const EVENT_LIMIT = 512;
const RECEIPT_LIMIT = 156;
const PROJECT_LIMIT = 32;
const AWARD_LIMIT = 24;
const safeMoney = (value: number): number => Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

const careerState = (world: WorldState): TalentCareerState => world.talentCareer?.schemaVersion === 1
    && world.talentCareer.profiles && typeof world.talentCareer.profiles === 'object'
    && Array.isArray(world.talentCareer.processedEventKeys)
    && Number.isInteger(world.talentCareer.lastProcessedAbsoluteWeek)
    ? world.talentCareer
    : { schemaVersion: 1, profiles: {}, processedEventKeys: [], lastProcessedAbsoluteWeek: -1 };

const canRecord = (state: TalentCareerState, eventKey: string, absoluteWeek: number): boolean => (
    Boolean(eventKey) && Number.isInteger(absoluteWeek) && absoluteWeek >= state.lastProcessedAbsoluteWeek
    && !state.processedEventKeys.includes(eventKey)
);

const withEvent = (state: TalentCareerState, eventKey: string, absoluteWeek: number, profiles: TalentCareerState['profiles']): TalentCareerState => ({
    schemaVersion: 1,
    profiles,
    processedEventKeys: [...state.processedEventKeys, eventKey].slice(-EVENT_LIMIT),
    lastProcessedAbsoluteWeek: Math.max(state.lastProcessedAbsoluteWeek, absoluteWeek),
});

const withProfile = (profiles: TalentCareerState['profiles'], credit: TalentCredit, update: (profile: TalentCareerProfile) => TalentCareerProfile): TalentCareerState['profiles'] => {
    if (!credit.talentId || !credit.talentName) return profiles;
    const existing = profiles[credit.talentId] || {
        talentId: credit.talentId, talentName: credit.talentName, income: 0, upfrontIncome: 0,
        backendIncome: 0, projectIds: [], awardIds: [],
    };
    return { ...profiles, [credit.talentId]: update(existing) };
};

export const getTalentCareerProfile = (world: WorldState, talentId: string): TalentCareerProfile | undefined => (
    world.talentCareer?.profiles?.[talentId]
);

export const creditTalentProject = (
    world: WorldState, projectId: string, participants: TalentCredit[], eventKey: string, absoluteWeek: number,
): WorldState => {
    const state = careerState(world);
    const key = `project:${projectId}:${eventKey}`;
    if (!projectId || !canRecord(state, key, absoluteWeek)) return world;
    let profiles = state.profiles;
    for (const participant of participants) {
        profiles = withProfile(profiles, participant, profile => ({
            ...profile, projectIds: profile.projectIds.includes(projectId)
                ? profile.projectIds : [...profile.projectIds, projectId].slice(-PROJECT_LIMIT),
        }));
    }
    if (profiles === state.profiles) return world;
    return { ...world, talentCareer: withEvent(state, key, absoluteWeek, profiles) };
};

export const creditTalentUpfront = (
    world: WorldState, projectId: string, participants: TalentFee[], eventKey: string, absoluteWeek: number,
): { world: WorldState; totalCredited: number } => {
    const state = careerState(world);
    const key = `upfront:${projectId}:${eventKey}`;
    if (!projectId || !canRecord(state, key, absoluteWeek)) return { world, totalCredited: 0 };
    let profiles = state.profiles;
    let totalCredited = 0;
    for (const participant of participants) {
        const amount = safeMoney(participant.amount);
        if (!participant.talentId || !participant.talentName || amount <= 0) continue;
        totalCredited += amount;
        profiles = withProfile(profiles, participant, profile => ({
            ...profile, income: profile.income + amount, upfrontIncome: profile.upfrontIncome + amount,
        }));
    }
    if (totalCredited === 0) return { world, totalCredited: 0 };
    return { world: { ...world, talentCareer: withEvent(state, key, absoluteWeek, profiles) }, totalCredited };
};

export const creditTalentAward = (
    world: WorldState, projectId: string, talent: TalentCredit, awardId: string, absoluteWeek: number,
): WorldState => {
    const state = careerState(world);
    const key = `award:${projectId}:${awardId}`;
    if (!projectId || !canRecord(state, key, absoluteWeek)) return world;
    const profiles = withProfile(state.profiles, talent, profile => ({
        ...profile, awardIds: profile.awardIds.includes(awardId) ? profile.awardIds : [...profile.awardIds, awardId].slice(-AWARD_LIMIT),
    }));
    if (profiles === state.profiles) return world;
    return { ...world, talentCareer: withEvent(state, key, absoluteWeek, profiles) };
};

export const settleTalentReceipt = (
    world: WorldState, projectId: string, participation: TalentParticipationPackage | undefined,
    receiptKey: string, studioReceipts: number, absoluteWeek: number,
): { world: WorldState; participation: TalentParticipationPackage | undefined; totalPaid: number } => {
    if (!participation || participation.schemaVersion !== 1 || !projectId || !receiptKey
        || !Number.isFinite(studioReceipts) || studioReceipts <= 0
        || !Number.isInteger(absoluteWeek) || absoluteWeek < 0
        || !Array.isArray(participation.processedReceiptKeys)
        || !Array.isArray(participation.contracts)
        || participation.processedReceiptKeys.includes(receiptKey)
        || absoluteWeek < (participation.lastSettledAbsoluteWeek ?? -1)) {
        return { world, participation, totalPaid: 0 };
    }
    const state = careerState(world);
    const eventKey = `receipt:${projectId}:${receiptKey}`;
    if (!canRecord(state, eventKey, absoluteWeek)) return { world, participation, totalPaid: 0 };
    const contracts = participation.contracts || [];
    if (contracts.some(contract => !contract || !contract.contractId || !contract.talentId || !contract.talentName
        || !['ACTOR', 'DIRECTOR', 'WRITER'].includes(contract.role)
        || contract.receiptsBasis !== 'STUDIO_COLLECTED_TITLE_RECEIPTS'
        || !Number.isInteger(contract.backendPoints) || contract.backendPoints < 1 || contract.backendPoints > 3)
        || new Set(contracts.map(contract => contract.contractId)).size !== contracts.length
        || [...new Set(contracts.map(contract => contract.talentId))].some(talentId =>
            contracts.filter(contract => contract.talentId === talentId).reduce((sum, contract) => sum + contract.backendPoints, 0) > 3)
        || contracts.reduce((sum, contract) => sum + contract.backendPoints, 0) > 10) {
        return { world, participation, totalPaid: 0 };
    }
    let profiles = state.profiles;
    let totalPaid = 0;
    for (const contract of contracts) {
        const amount = safeMoney(studioReceipts * contract.backendPoints / 100);
        if (amount <= 0) continue;
        totalPaid += amount;
        profiles = withProfile(profiles, contract, profile => ({
            ...profile, income: profile.income + amount, backendIncome: profile.backendIncome + amount,
        }));
    }
    const nextParticipation: TalentParticipationPackage = {
        ...participation,
        processedReceiptKeys: [...participation.processedReceiptKeys, receiptKey].slice(-RECEIPT_LIMIT),
        lastSettledAbsoluteWeek: absoluteWeek,
    };
    return {
        world: { ...world, talentCareer: withEvent(state, eventKey, absoluteWeek, profiles) },
        participation: nextParticipation,
        totalPaid,
    };
};

/** A saved legacy actor royalty can belong to an inherited parent, independent of studio ownership. */
export const creditSignedActorBackend=(world:WorldState,talentId:string,talentName:string,sourceId:string,amount:number,absoluteWeek:number):WorldState=>{
    const state=careerState(world),key=`actor-backend:${sourceId}`;
    if(amount<=0 || !canRecord(state,key,absoluteWeek))return world;
    const profiles=withProfile(state.profiles,{talentId,talentName,role:'ACTOR'},profile=>({...profile,income:profile.income+amount,backendIncome:profile.backendIncome+amount}));
    return {...world,talentCareer:withEvent(state,key,absoluteWeek,profiles)};
};
