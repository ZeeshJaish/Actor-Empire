import type { GameLanguage, SocialEventOption } from '../types';
import { t } from './i18n';

type SocialEventCategory = 'DATE' | 'CLUBBING' | 'HANGOUT';

type SocialOptionTemplate = {
    id: string;
    impact: SocialEventOption['impact'];
};

type SocialEventTemplate = {
    id: string;
    options: SocialOptionTemplate[];
};

type SocialEventRecord = {
    title: string;
    desc: string;
    options: SocialEventOption[];
};

const SOCIAL_EVENT_CATEGORIES: SocialEventCategory[] = ['DATE', 'CLUBBING', 'HANGOUT'];

const SOCIAL_EVENT_TEMPLATES: Record<SocialEventCategory, SocialEventTemplate[]> = {
    DATE: [
        {
            id: 'movieNight',
            options: [
                { id: 'romcom', impact: { happiness: 5, relationship: 2 } },
                { id: 'horror', impact: { relationship: 5, happiness: -2 } },
                { id: 'artFilm', impact: { relationship: -2, experience: 2 } },
            ],
        },
        {
            id: 'dinnerCheck',
            options: [
                { id: 'payBill', impact: { money: -150, relationship: 5 } },
                { id: 'splitIt', impact: { money: -75 } },
            ],
        },
        {
            id: 'paparazziOutside',
            options: [
                { id: 'poseTogether', impact: { fame: 3, relationship: 2 } },
                { id: 'keepMoving', impact: { relationship: 1, reputation: 1 } },
                { id: 'separateCars', impact: { relationship: -2, fame: 1 } },
            ],
        },
        {
            id: 'lateNightConfession',
            options: [
                { id: 'tellTruth', impact: { relationship: 8, happiness: 2 } },
                { id: 'keepFlirty', impact: { happiness: 4, relationship: 2 } },
                { id: 'changeSubject', impact: { relationship: -3 } },
            ],
        },
        {
            id: 'weekendInvite',
            options: [
                { id: 'sayYes', impact: { happiness: 8, relationship: 6, health: -2 } },
                { id: 'nextWeek', impact: { relationship: 2 } },
                { id: 'decline', impact: { relationship: -4 } },
            ],
        },
    ],
    CLUBBING: [
        {
            id: 'roundOfShots',
            options: [
                { id: 'yes', impact: { health: -5, happiness: 10, relationship: 5, money: -50 } },
                { id: 'water', impact: { health: 2, happiness: -2 } },
            ],
        },
        {
            id: 'vipSection',
            options: [
                { id: 'joinVip', impact: { fame: 2, money: -200 } },
                { id: 'stayFloor', impact: { relationship: 2 } },
            ],
        },
        {
            id: 'rivalEncounter',
            options: [
                { id: 'playNice', impact: { reputation: 2, happiness: -1 } },
                { id: 'tradeBarbs', impact: { fame: 2, reputation: -3 } },
                { id: 'walkAway', impact: { happiness: 1, relationship: 2 } },
            ],
        },
        {
            id: 'afterpartyOffer',
            options: [
                { id: 'network', impact: { fame: 3, reputation: 2, health: -3 } },
                { id: 'shortNight', impact: { health: 3, happiness: -1 } },
                { id: 'sendNumber', impact: { reputation: 1, relationship: 1 } },
            ],
        },
    ],
    HANGOUT: [
        {
            id: 'coffeeTalk',
            options: [
                { id: 'shareSecrets', impact: { relationship: 8 } },
                { id: 'keepLight', impact: { happiness: 3 } },
            ],
        },
        {
            id: 'creativeBrainstorm',
            options: [
                { id: 'dreamBig', impact: { relationship: 4, experience: 2 } },
                { id: 'bePractical', impact: { happiness: 2, reputation: 1 } },
                { id: 'teaseTaste', impact: { relationship: -2, happiness: 2 } },
            ],
        },
        {
            id: 'unexpectedFans',
            options: [
                { id: 'takePhotos', impact: { fame: 2, relationship: -1 } },
                { id: 'setBoundary', impact: { reputation: 1, relationship: 2 } },
                { id: 'joke', impact: { happiness: 4, fame: 1 } },
            ],
        },
        {
            id: 'planChange',
            options: [
                { id: 'improvise', impact: { happiness: 6, relationship: 3 } },
                { id: 'early', impact: { health: 2 } },
                { id: 'morePeople', impact: { fame: 1, relationship: -1 } },
            ],
        },
    ],
};

const FLAVOR_TEXT_IDS: Record<SocialEventCategory, string[]> = {
    DATE: ['popcorn', 'hands', 'dinnerTalk', 'sunset', 'jokes', 'dessert', 'carTalk', 'paparazziWalk', 'blurryPhoto', 'quietCorner'],
    CLUBBING: ['feetHurt', 'music', 'people', 'voice', 'selfies', 'sparklingWater', 'dj', 'balcony', 'familiarFaces', 'unbelievableStory'],
    HANGOUT: ['coffee', 'home', 'park', 'gossip', 'games', 'auditionStories', 'snacks', 'memes', 'therapy', 'cityLights'],
};

const isSocialEventCategory = (category: string): category is SocialEventCategory => {
    return SOCIAL_EVENT_CATEGORIES.includes(category as SocialEventCategory);
};

export const getSocialEvents = (language: GameLanguage, category: string): SocialEventRecord[] => {
    if (!isSocialEventCategory(category)) return [];

    return SOCIAL_EVENT_TEMPLATES[category].map((event) => ({
        title: t(language, `services.socialEvents.${category}.${event.id}.title`),
        desc: t(language, `services.socialEvents.${category}.${event.id}.desc`),
        options: event.options.map((option) => ({
            label: t(language, `services.socialEvents.${category}.${event.id}.option.${option.id}.label`),
            impact: option.impact,
            logMessage: t(language, `services.socialEvents.${category}.${event.id}.option.${option.id}.log`),
        })),
    }));
};

export const getFlavorTexts = (language: GameLanguage, category: string): string[] => {
    if (!isSocialEventCategory(category)) return [];
    return FLAVOR_TEXT_IDS[category].map((id) => t(language, `services.socialEvents.flavor.${category}.${id}`));
};

const getSocialEventsDb = (language: GameLanguage): Record<string, SocialEventRecord[]> => {
    return SOCIAL_EVENT_CATEGORIES.reduce<Record<string, SocialEventRecord[]>>((events, category) => {
        events[category] = getSocialEvents(language, category);
        return events;
    }, {});
};

const getFlavorTextsDb = (language: GameLanguage): Record<string, string[]> => {
    return SOCIAL_EVENT_CATEGORIES.reduce<Record<string, string[]>>((flavors, category) => {
        flavors[category] = getFlavorTexts(language, category);
        return flavors;
    }, {});
};

export const SOCIAL_EVENTS_DB: Record<string, SocialEventRecord[]> = getSocialEventsDb('en');
export const FLAVOR_TEXTS: Record<string, string[]> = getFlavorTextsDb('en');
