import type {
    OwnedStreamingCapitalAction,
    OwnedStreamingFoundingDraft,
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    Player,
    StreamingBrandPromiseId,
    StreamingLogoKey,
    StreamingSoundIdentKey,
    StreamingTypefaceId,
    StreamingWordmarkStyleId,
} from '../types';
import { createInitialOwnedStreamingPlatformState } from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { cleanStreamingBrandMarkDataUrl } from './streamingBrandImage';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
    queueOwnedStreamingCinematic,
    transitionOwnedStreamingLifecycle,
} from './ownedStreamingPlatform';
import {
    getStreamingIncorporationBreakdown,
    STREAMING_INCORPORATION_ECONOMY,
} from './streamingEconomy';

export {
    getStreamingIncorporationBreakdown,
    STREAMING_INCORPORATION_ECONOMY,
} from './streamingEconomy';

/**
 * Founding deliberately makes only three decisions: identity, promise, and
 * final review. Infrastructure, funding, and optional leadership are company
 * decisions made after incorporation.
 */
export const STREAMING_FOUNDING_STEP_COUNT = 3;

export const STREAMING_BRAND_PROMISES: Array<{
    id: StreamingBrandPromiseId;
    title: string;
    shortLabel: string;
    description: string;
    expectation: string;
}> = [
    {
        id: 'EVENT_HOUSE',
        title: 'Event House',
        shortLabel: 'Big nights',
        description: 'Premium premieres that turn releases into cultural moments.',
        expectation: 'Viewers expect fewer, louder launches.',
    },
    {
        id: 'BINGE_MACHINE',
        title: 'Binge Machine',
        shortLabel: 'Always another episode',
        description: 'Addictive returning series and complete-season drops.',
        expectation: 'Content gaps will damage trust quickly.',
    },
    {
        id: 'FANDOM_FOREVER',
        title: 'Fandom Forever',
        shortLabel: 'Worlds worth staying for',
        description: 'Franchises, communities and stories that keep expanding.',
        expectation: 'Fans will demand continuity and care.',
    },
    {
        id: 'WORLD_STAGE',
        title: 'World Stage',
        shortLabel: 'Local stories, global reach',
        description: 'Regional voices, localization and international breakouts.',
        expectation: 'Localization quality becomes part of the brand.',
    },
    {
        id: 'EVERYONES_SCREEN',
        title: 'Everyone’s Screen',
        shortLabel: 'Broad household value',
        description: 'A dependable mix for families, casual viewers and every mood.',
        expectation: 'Breadth matters more than one prestige niche.',
    },
    {
        id: 'TECHNOLOGY_FIRST',
        title: 'Technology First',
        shortLabel: 'Playback without friction',
        description: 'The sharpest, fastest and most dependable viewing experience.',
        expectation: 'Outages and device failures hurt more.',
    },
    {
        id: 'BALANCED',
        title: 'Balanced',
        shortLabel: 'A flexible opening position',
        description: 'Content, reach and product quality grow together.',
        expectation: 'No early specialty bonus, but less brand confusion.',
    },
];

export const STREAMING_LOGO_OPTIONS: Array<{ id: StreamingLogoKey; title: string }> = [
    { id: 'FRAME_PLAY', title: 'Frame' },
    { id: 'SIGNAL_RING', title: 'Signal' },
    { id: 'SPOTLIGHT', title: 'Spotlight' },
    { id: 'WORDMARK', title: 'Wordmark' },
];

export const STREAMING_SOUND_IDENTS: Array<{
    id: StreamingSoundIdentKey;
    title: string;
    description: string;
}> = [
    { id: 'PULSE', title: 'Pulse', description: 'A focused two-note heartbeat.' },
    { id: 'ASCENT', title: 'Ascent', description: 'A bright rising signature.' },
    { id: 'PREMIERE', title: 'Premiere', description: 'A cinematic opening hit.' },
    { id: 'SILENT', title: 'Silent Mark', description: 'A visual ident with no sound.' },
];

export const STREAMING_COLOR_PALETTES = [
    { id: 'INDIGO', title: 'Midnight Indigo', primaryColor: '#6D5DFB', secondaryColor: '#111225' },
    { id: 'VIOLET', title: 'Electric Violet', primaryColor: '#9A5BFF', secondaryColor: '#1B0E2A' },
    { id: 'CRIMSON', title: 'Premiere Red', primaryColor: '#F04452', secondaryColor: '#220D15' },
    { id: 'GOLD', title: 'Studio Gold', primaryColor: '#E9B949', secondaryColor: '#21180B' },
] as const;

const LOGO_KEYS = new Set<StreamingLogoKey>(STREAMING_LOGO_OPTIONS.map(option => option.id));
const BRAND_PROMISE_IDS = new Set<StreamingBrandPromiseId>(STREAMING_BRAND_PROMISES.map(option => option.id));
const WORDMARK_STYLE_IDS = new Set<StreamingWordmarkStyleId>(['WORDMARK', 'SIDE', 'STACK', 'ICON']);
const TYPEFACE_IDS = new Set<StreamingTypefaceId>(['GROTESK', 'GEOMETRIC', 'SERIF', 'CONDENSED', 'MONO', 'SLAB']);
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const DEFAULT_PUBLIC_MANIFESTO: Record<StreamingBrandPromiseId, string> = {
    EVENT_HOUSE: 'Every premiere will feel like a holiday.',
    BINGE_MACHINE: 'You will never run out of the next episode.',
    FANDOM_FOREVER: 'The worlds you love will never be cancelled.',
    WORLD_STAGE: 'Great stories do not need a passport.',
    EVERYONES_SCREEN: 'One subscription the whole house agrees on.',
    TECHNOLOGY_FIRST: 'It will always play, instantly, perfectly.',
    BALANCED: 'Built for every kind of night.',
};

const sanitizePlatformName = (value: string): string => (
    String(value || '')
        .replace(/\s+/g, ' ')
        .slice(0, 32)
);

const sanitizePublicManifesto = (value: string, promiseId: StreamingBrandPromiseId): string => (
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160)
    || DEFAULT_PUBLIC_MANIFESTO[promiseId]
);

const sanitizeColor = (value: string, fallback: string): string => (
    HEX_COLOR_PATTERN.test(String(value || '').trim())
        ? String(value).trim().toUpperCase()
        : fallback
);

const sanitizeVisualMarkId = (value: unknown): string => {
    const markId = String(value || '').trim().toUpperCase();
    return /^[A-Z0-9_]{1,40}$/.test(markId) ? markId : 'BOLT';
};

const sanitizeCustomMarkDataUrl = cleanStreamingBrandMarkDataUrl;

export const createDefaultStreamingFoundingDraft = (
    absoluteWeek = 0,
): OwnedStreamingFoundingDraft => ({
    currentStep: 0,
    name: 'EMPIRE+',
    logoKey: 'FRAME_PLAY',
    primaryColor: '#6D5DFB',
    secondaryColor: '#111225',
    visualMarkId: 'BOLT',
    customMarkDataUrl: null,
    wordmarkStyleId: 'SIDE',
    typefaceId: 'GROTESK',
    brandPromiseId: 'BALANCED',
    publicManifesto: DEFAULT_PUBLIC_MANIFESTO.BALANCED,
    updatedAtAbsoluteWeek: Math.max(0, Math.round(Number(absoluteWeek) || 0)),
});

export interface StreamingFoundingValidation {
    valid: boolean;
    issues: Array<{ step: number; message: string }>;
}

export const validateStreamingFoundingDraft = (
    draft: OwnedStreamingFoundingDraft,
    playerMoney: number,
): StreamingFoundingValidation => {
    const issues: StreamingFoundingValidation['issues'] = [];
    const cleanName = sanitizePlatformName(draft.name).trim();
    if (cleanName.length < 2 || cleanName.length > 32 || !/[a-z0-9]/i.test(cleanName)) {
        issues.push({ step: 0, message: 'Choose a platform name between 2 and 32 characters.' });
    }
    if (!LOGO_KEYS.has(draft.logoKey)) {
        issues.push({ step: 0, message: 'Choose a valid platform mark.' });
    }
    if (!WORDMARK_STYLE_IDS.has(draft.wordmarkStyleId || 'SIDE')) {
        issues.push({ step: 0, message: 'Choose a valid wordmark style.' });
    }
    if (!TYPEFACE_IDS.has(draft.typefaceId || 'GROTESK')) {
        issues.push({ step: 0, message: 'Choose a valid wordmark typeface.' });
    }
    if (!HEX_COLOR_PATTERN.test(draft.primaryColor) || !HEX_COLOR_PATTERN.test(draft.secondaryColor)) {
        issues.push({ step: 0, message: 'Choose a valid platform color palette.' });
    }
    if (!BRAND_PROMISE_IDS.has(draft.brandPromiseId)) {
        issues.push({ step: 1, message: 'Choose a starting brand promise.' });
    }
    if (Math.round(Number(draft.currentStep) || 0) < STREAMING_FOUNDING_STEP_COUNT - 1) {
        issues.push({ step: 2, message: 'Review the incorporation terms before founding the company.' });
    }
    if (!getStreamingIncorporationBreakdown(playerMoney).affordable) {
        issues.push({
            step: 2,
            message: `You need $${STREAMING_INCORPORATION_ECONOMY.cashRequired.toLocaleString()} in liquid cash to incorporate.`,
        });
    }
    return { valid: issues.length === 0, issues };
};

export const saveStreamingFoundingDraft = (
    player: Player,
    draft: OwnedStreamingFoundingDraft,
): Player => {
    const current = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (current.lifecycle !== 'ELIGIBLE') return player;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const fallback = current.foundingDraft || createDefaultStreamingFoundingDraft(absoluteWeek);
    const safePromiseId = BRAND_PROMISE_IDS.has(draft.brandPromiseId)
        ? draft.brandPromiseId
        : fallback.brandPromiseId;
    const safeDraft: OwnedStreamingFoundingDraft = {
        currentStep: Math.max(0, Math.min(
            STREAMING_FOUNDING_STEP_COUNT - 1,
            Math.round(Number(draft.currentStep) || 0),
        )),
        name: sanitizePlatformName(draft.name),
        logoKey: LOGO_KEYS.has(draft.logoKey) ? draft.logoKey : fallback.logoKey,
        primaryColor: sanitizeColor(draft.primaryColor, fallback.primaryColor),
        secondaryColor: sanitizeColor(draft.secondaryColor, fallback.secondaryColor),
        visualMarkId: sanitizeVisualMarkId(draft.visualMarkId),
        customMarkDataUrl: sanitizeCustomMarkDataUrl(draft.customMarkDataUrl),
        wordmarkStyleId: WORDMARK_STYLE_IDS.has(draft.wordmarkStyleId || 'SIDE')
            ? draft.wordmarkStyleId || 'SIDE'
            : fallback.wordmarkStyleId || 'SIDE',
        typefaceId: TYPEFACE_IDS.has(draft.typefaceId || 'GROTESK')
            ? draft.typefaceId || 'GROTESK'
            : fallback.typefaceId || 'GROTESK',
        brandPromiseId: safePromiseId,
        publicManifesto: sanitizePublicManifesto(draft.publicManifesto, safePromiseId),
        updatedAtAbsoluteWeek: absoluteWeek,
    };
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...current,
            foundingDraft: safeDraft,
        }, player.id),
    };
};

export interface IncorporateStreamingResult {
    player: Player;
    changed: boolean;
    reason:
        | 'INCORPORATED'
        | 'NOT_ELIGIBLE'
        | 'INVALID_DRAFT'
        | 'INSUFFICIENT_CASH'
        | 'ALREADY_INCORPORATED';
    issues: StreamingFoundingValidation['issues'];
    cinematicId?: string;
}

const slugifyPlatformName = (name: string): string => (
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 70)
    || 'empire-plus'
);

export const incorporateOwnedStreamingPlatform = (
    player: Player,
): IncorporateStreamingResult => {
    const current = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (
        current.identity
        || current.foundingProfile
        || ['FOUNDING', 'ACTIVE', 'SUSPENDED'].includes(current.lifecycle)
    ) {
        return { player, changed: false, reason: 'ALREADY_INCORPORATED', issues: [] };
    }
    if (current.lifecycle !== 'ELIGIBLE' || !current.foundingDraft) {
        return { player, changed: false, reason: 'NOT_ELIGIBLE', issues: [] };
    }

    const draft = current.foundingDraft;
    const validation = validateStreamingFoundingDraft(draft, player.money);
    if (!validation.valid) {
        const insufficientCash = !getStreamingIncorporationBreakdown(player.money).affordable;
        return {
            player,
            changed: false,
            reason: insufficientCash ? 'INSUFFICIENT_CASH' : 'INVALID_DRAFT',
            issues: validation.issues,
        };
    }

    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const cleanName = sanitizePlatformName(draft.name).trim();
    const foundationKey = `streaming-incorporated:${absoluteWeek}`;
    const foundationFact: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', current.simulationSeed, foundationKey),
        idempotencyKey: foundationKey,
        absoluteWeek,
        type: 'FOUNDATION_CREATED',
        summary: `${cleanName} incorporated. You remain founder, sole owner, and CEO.`,
        source: 'FOUNDING',
        metadata: {
            name: cleanName,
            cashRequired: STREAMING_INCORPORATION_ECONOMY.cashRequired,
            setupCostsConsumed: STREAMING_INCORPORATION_ECONOMY.setupCostsConsumed,
            openingTreasuryCash: STREAMING_INCORPORATION_ECONOMY.openingTreasuryCash,
            founderOwnershipPercent: 100,
        },
    };
    const incorporationAction: OwnedStreamingCapitalAction = {
        id: createDeterministicId('streaming_capital', current.simulationSeed, foundationKey),
        idempotencyKey: foundationKey,
        type: 'INCORPORATION',
        absoluteWeek,
        amount: STREAMING_INCORPORATION_ECONOMY.cashRequired,
        treasuryDelta: STREAMING_INCORPORATION_ECONOMY.openingTreasuryCash,
        personalCashDelta: -STREAMING_INCORPORATION_ECONOMY.cashRequired,
        debtDelta: 0,
        ownershipBefore: 100,
        ownershipAfter: 100,
    };
    const emptyOperations = createInitialOwnedStreamingPlatformState(player.id);

    const preparedPlatform: OwnedStreamingPlatformState = {
        ...current,
        identity: {
            name: cleanName,
            slug: slugifyPlatformName(cleanName),
            primaryColor: draft.primaryColor,
            secondaryColor: draft.secondaryColor,
            logoKey: draft.logoKey,
            visualMarkId: sanitizeVisualMarkId(draft.visualMarkId),
            customMarkDataUrl: sanitizeCustomMarkDataUrl(draft.customMarkDataUrl),
            wordmarkStyleId: draft.wordmarkStyleId || 'SIDE',
            typefaceId: draft.typefaceId || 'GROTESK',
            brandPromiseId: draft.brandPromiseId,
            publicManifesto: sanitizePublicManifesto(draft.publicManifesto, draft.brandPromiseId),
            foundedAtAbsoluteWeek: absoluteWeek,
        },
        foundingDraft: null,
        launchProgram: emptyOperations.launchProgram,
        marketOperations: [],
        serviceConfiguration: emptyOperations.serviceConfiguration,
        capabilities: emptyOperations.capabilities,
        localizationOperations: emptyOperations.localizationOperations,
        costCommitments: [],
        infrastructureSetupDraft: null,
        infrastructureSetup: null,
        infrastructureStrategy: 'UNDECIDED',
        capacity: emptyOperations.capacity,
        technologyLevels: emptyOperations.technologyLevels,
        technologyProjects: [],
        researchPrograms: [],
        campusProjects: [],
        foundingProfile: {
            incorporationModel: 'FIXED_V8_ZERO_TREASURY',
            founderCashCharged: STREAMING_INCORPORATION_ECONOMY.cashRequired,
            setupCostsConsumed: STREAMING_INCORPORATION_ECONOMY.setupCostsConsumed,
            openingTreasuryCash: STREAMING_INCORPORATION_ECONOMY.openingTreasuryCash,
            outsideCapitalRaisedAtIncorporation: 0,
            debtPrincipalAtIncorporation: 0,
            founderOwnershipPercentAtIncorporation: 100,
            founderWasCeoAtIncorporation: true,
            incorporatedAtAbsoluteWeek: absoluteWeek,
        },
        leadership: {
            ...current.leadership,
            currentCeo: {
                holderType: 'FOUNDER',
                executiveId: null,
                sinceAbsoluteWeek: absoluteWeek,
            },
        },
        legacy: {
            ...current.legacy,
            founderOfficeRole: 'FOUNDER_CEO',
            currentEraNumber: 1,
            currentEraStartedAtAbsoluteWeek: absoluteWeek,
            currentMandate: 'BALANCED',
        },
        finance: {
            ...current.finance,
            capitalActions: [...current.finance.capitalActions, incorporationAction],
        },
        founderOwnershipPercent: 100,
        treasuryCash: current.treasuryCash + STREAMING_INCORPORATION_ECONOMY.openingTreasuryCash,
        debtPrincipal: 0,
        eventLedger: [...current.eventLedger, foundationFact],
        milestoneKeys: [...current.milestoneKeys, 'platform-incorporated'],
    };

    const transitioned = transitionOwnedStreamingLifecycle(
        preparedPlatform,
        'FOUNDING',
        absoluteWeek,
        'FOUNDING',
    );
    const cinematicKey = `founding-reveal:${absoluteWeek}`;
    const withCinematic = queueOwnedStreamingCinematic(transitioned, {
        idempotencyKey: cinematicKey,
        type: 'FOUNDING_KEYNOTE',
        priority: 'MAJOR',
        availableAtAbsoluteWeek: absoluteWeek,
        title: `${cleanName} Founding Reveal`,
        factIds: [foundationFact.id],
    });
    const cinematicId = withCinematic.cinematicQueue
        .find(event => event.idempotencyKey === cinematicKey)
        ?.id;

    return {
        changed: true,
        reason: 'INCORPORATED',
        issues: [],
        cinematicId,
        player: {
            ...player,
            money: player.money - STREAMING_INCORPORATION_ECONOMY.cashRequired,
            ownedStreamingPlatform: withCinematic,
        },
    };
};
