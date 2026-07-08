import { Page, type Player } from '../types';

export type NewPlayerTutorialStatus = 'AVAILABLE' | 'ACTIVE' | 'SKIPPED' | 'COMPLETED';

export interface NewPlayerTutorialState {
    status: NewPlayerTutorialStatus;
    stepId: string;
    completedStepIds: string[];
    startedAtWeek?: number;
    skippedAtWeek?: number;
    completedAtWeek?: number;
}

export interface NewPlayerTutorialStep {
    id: string;
    page: Page;
    targetId?: string;
    eyebrow: string;
    title: string;
    body: string;
    actionLabel: string;
    nextStepId?: string;
    goToPage?: Page;
    mobileAppMode?: string;
    completeOnPage?: Page;
    tone: 'gold' | 'blue' | 'emerald' | 'rose' | 'violet';
}

export const NEW_PLAYER_TUTORIAL_FLAG = 'newPlayerTutorial';
export const NEW_PLAYER_TUTORIAL_FIRST_STEP_ID = 'WELCOME';

export const buildAvailableNewPlayerTutorialState = (): NewPlayerTutorialState => ({
    status: 'AVAILABLE',
    stepId: NEW_PLAYER_TUTORIAL_FIRST_STEP_ID,
    completedStepIds: [],
});

export const buildActiveNewPlayerTutorialState = (week = 1): NewPlayerTutorialState => ({
    status: 'ACTIVE',
    stepId: NEW_PLAYER_TUTORIAL_FIRST_STEP_ID,
    completedStepIds: [],
    startedAtWeek: week,
});

export const NEW_PLAYER_TUTORIAL_STEPS: NewPlayerTutorialStep[] = [
    {
        id: 'WELCOME',
        page: Page.HOME,
        eyebrow: 'Director Tour',
        title: 'Welcome to your first week',
        body: 'I will walk you through the real game screens. You can tap the highlighted controls yourself, use the action button, or skip anytime.',
        actionLabel: 'Show me Home',
        nextStepId: 'HOME_DASHBOARD',
        tone: 'gold',
    },
    {
        id: 'HOME_DASHBOARD',
        page: Page.HOME,
        targetId: 'home-profile',
        eyebrow: 'Home',
        title: 'This is your career dashboard',
        body: 'Your money, fame, energy, age, week, and live feed all start here. Most weeks begin and end on this screen.',
        actionLabel: 'Next',
        nextStepId: 'OPEN_CAREER',
        tone: 'gold',
    },
    {
        id: 'OPEN_CAREER',
        page: Page.HOME,
        targetId: 'nav-career',
        eyebrow: 'Next stop',
        title: 'Open Career',
        body: 'Career is where you chase auditions, roles, credits, and the actor path. Tap the highlighted Career button.',
        actionLabel: 'Open Career',
        nextStepId: 'CAREER_SCREEN',
        goToPage: Page.CAREER,
        completeOnPage: Page.CAREER,
        tone: 'blue',
    },
    {
        id: 'CAREER_SCREEN',
        page: Page.CAREER,
        eyebrow: 'Career',
        title: 'Find work and build credits',
        body: 'Use this screen to track acting work, active commitments, project phases, and your climb from unknown actor to bankable name.',
        actionLabel: 'Next',
        nextStepId: 'OPEN_IMPROVE',
        tone: 'blue',
    },
    {
        id: 'OPEN_IMPROVE',
        page: Page.CAREER,
        targetId: 'nav-improve',
        eyebrow: 'Next stop',
        title: 'Open Improve',
        body: 'Training makes future roles easier to win. Tap Improve to see where your energy can turn into better skills.',
        actionLabel: 'Open Improve',
        nextStepId: 'IMPROVE_SCREEN',
        goToPage: Page.IMPROVE,
        completeOnPage: Page.IMPROVE,
        tone: 'emerald',
    },
    {
        id: 'IMPROVE_SCREEN',
        page: Page.IMPROVE,
        eyebrow: 'Improve',
        title: 'Train before the industry judges you',
        body: 'Improve is for acting skills, body, looks, health, discipline, and preparation. Better stats open better opportunities.',
        actionLabel: 'Next',
        nextStepId: 'OPEN_SOCIAL',
        tone: 'emerald',
    },
    {
        id: 'OPEN_SOCIAL',
        page: Page.IMPROVE,
        targetId: 'nav-social',
        eyebrow: 'Next stop',
        title: 'Open Social',
        body: 'Your relationships and public life matter too. Tap Social to see people, family, dating, and legacy connections.',
        actionLabel: 'Open Social',
        nextStepId: 'SOCIAL_SCREEN',
        goToPage: Page.SOCIAL,
        completeOnPage: Page.SOCIAL,
        tone: 'rose',
    },
    {
        id: 'SOCIAL_SCREEN',
        page: Page.SOCIAL,
        eyebrow: 'Social',
        title: 'People shape your story',
        body: 'This is where relationships, family, partners, children, and social choices can change your career path over time.',
        actionLabel: 'Next',
        nextStepId: 'OPEN_LIFESTYLE',
        tone: 'rose',
    },
    {
        id: 'OPEN_LIFESTYLE',
        page: Page.SOCIAL,
        targetId: 'nav-lifestyle',
        eyebrow: 'Next stop',
        title: 'Open Lifestyle',
        body: 'Lifestyle is where money becomes assets, businesses, activities, and eventually studio power. Tap Lifestyle.',
        actionLabel: 'Open Lifestyle',
        nextStepId: 'LIFESTYLE_SCREEN',
        goToPage: Page.LIFESTYLE,
        completeOnPage: Page.LIFESTYLE,
        tone: 'violet',
    },
    {
        id: 'LIFESTYLE_SCREEN',
        page: Page.LIFESTYLE,
        eyebrow: 'Lifestyle',
        title: 'Spend, invest, and build an empire',
        body: 'Here you buy assets, run activities, start businesses, and later build production-house systems like scripts, rights, and releases.',
        actionLabel: 'Next',
        nextStepId: 'OPEN_MOBILE',
        tone: 'violet',
    },
    {
        id: 'OPEN_MOBILE',
        page: Page.LIFESTYLE,
        targetId: 'nav-mobile',
        eyebrow: 'Next stop',
        title: 'Open Mobile',
        body: 'Your phone holds messages, IMDb, social apps, stocks, Forbes, news, banking, and the guide. Tap Mobile.',
        actionLabel: 'Open Mobile',
        nextStepId: 'MOBILE_MESSAGES_APP',
        goToPage: Page.MOBILE,
        completeOnPage: Page.MOBILE,
        tone: 'blue',
    },
    {
        id: 'MOBILE_MESSAGES_APP',
        page: Page.MOBILE,
        targetId: 'mobile-messages-app',
        eyebrow: 'Mobile',
        title: 'Messages: offers and alerts',
        body: 'Messages are where studios, agents, friends, and game systems contact you. Important offers often include buttons that take you straight to the right screen.',
        actionLabel: 'Next',
        nextStepId: 'MOBILE_CASTLINK_APP',
        tone: 'blue',
    },
    {
        id: 'MOBILE_CASTLINK_APP',
        page: Page.MOBILE,
        targetId: 'mobile-castlink-app',
        eyebrow: 'Roles',
        title: 'CastLink is where you find roles',
        body: 'Use CastLink when you want auditions, acting gigs, or part-time jobs. Early game role hunting starts here, not on the Career profile page.',
        actionLabel: 'Next',
        nextStepId: 'MOBILE_SOCIAL_APP',
        tone: 'blue',
    },
    {
        id: 'MOBILE_SOCIAL_APP',
        page: Page.MOBILE,
        targetId: 'mobile-social-folder',
        eyebrow: 'Audience',
        title: 'Social apps build public reach',
        body: 'This folder holds X, Instagram, and YouTube. Use these to grow followers, post updates, build fan mood, and later earn brand or creator opportunities.',
        actionLabel: 'Next',
        nextStepId: 'MOBILE_NEWS_APP',
        tone: 'rose',
    },
    {
        id: 'MOBILE_NEWS_APP',
        page: Page.MOBILE,
        targetId: 'mobile-news-app',
        eyebrow: 'World',
        title: 'News shows what the industry sees',
        body: 'News tracks your public story, studio moves, universe events, scandals, box-office chatter, and the wider entertainment world around you.',
        actionLabel: 'Next',
        nextStepId: 'MOBILE_IMDB_APP',
        tone: 'rose',
    },
    {
        id: 'MOBILE_IMDB_APP',
        page: Page.MOBILE,
        targetId: 'mobile-imdb-app',
        eyebrow: 'Credits',
        title: 'IMDb tracks your screen career',
        body: 'IMDb is where you inspect credits, ratings, filmography, project reputation, and how your released work is shaping your actor profile.',
        actionLabel: 'Next',
        nextStepId: 'MOBILE_BOXOFFICE_APP',
        tone: 'gold',
    },
    {
        id: 'MOBILE_BOXOFFICE_APP',
        page: Page.MOBILE,
        targetId: 'mobile-boxoffice-app',
        eyebrow: 'Money',
        title: 'Box Office explains performance',
        body: 'Use Box Office to understand theatrical and streaming results, grosses, revenue movement, and whether releases are hits, sleepers, or failures.',
        actionLabel: 'Next',
        nextStepId: 'MOBILE_TEAM_APP',
        tone: 'emerald',
    },
    {
        id: 'MOBILE_TEAM_APP',
        page: Page.MOBILE,
        targetId: 'mobile-team-app',
        eyebrow: 'Support',
        title: 'Team helps you hire support',
        body: 'Team is where agents, managers, trainers, stylists, therapists, publicists, and sponsorship work can support your career growth.',
        actionLabel: 'Next',
        nextStepId: 'MOBILE_BANK_APP',
        tone: 'emerald',
    },
    {
        id: 'MOBILE_BANK_APP',
        page: Page.MOBILE,
        targetId: 'mobile-bank-app',
        eyebrow: 'Finance',
        title: 'Bank keeps money readable',
        body: 'Bank is for loans, credit, money history, and finance pressure. Check it when spending, debt, or big purchases start to matter.',
        actionLabel: 'Next',
        nextStepId: 'MOBILE_FORBES_APP',
        tone: 'emerald',
    },
    {
        id: 'MOBILE_FORBES_APP',
        page: Page.MOBILE,
        targetId: 'mobile-forbes-app',
        eyebrow: 'Empire',
        title: 'Forbes tracks power and ownership',
        body: 'Forbes helps you inspect wealth, companies, studio profiles, acquisitions, and your rise from actor career into entertainment empire control.',
        actionLabel: 'Next',
        nextStepId: 'MOBILE_STOCKS_APP',
        tone: 'violet',
    },
    {
        id: 'MOBILE_STOCKS_APP',
        page: Page.MOBILE,
        targetId: 'mobile-stocks-app',
        eyebrow: 'Market',
        title: 'Stocks are for investing and influence',
        body: 'Stocks lets you buy entertainment companies, track positions, earn dividends, and later push toward ownership or control paths.',
        actionLabel: 'Next',
        nextStepId: 'MOBILE_DATING_APP',
        tone: 'violet',
    },
    {
        id: 'MOBILE_DATING_APP',
        page: Page.MOBILE,
        targetId: 'mobile-dating-folder',
        eyebrow: 'Personal',
        title: 'Dating affects life outside work',
        body: 'Dating apps help relationships start. Romance, family, public drama, and legacy choices can all grow from here.',
        actionLabel: 'Next',
        nextStepId: 'MOBILE_GUIDE_APP',
        tone: 'rose',
    },
    {
        id: 'MOBILE_GUIDE_APP',
        page: Page.MOBILE,
        targetId: 'mobile-guide-app',
        eyebrow: 'Help',
        title: 'Guide explains systems anytime',
        body: 'Guide is the reference app. Use it when you forget what stats mean, how the weekly loop works, or how deeper systems connect.',
        actionLabel: 'Next',
        nextStepId: 'MOBILE_OPEN_MESSAGES',
        tone: 'blue',
    },
    {
        id: 'MOBILE_OPEN_MESSAGES',
        page: Page.MOBILE,
        targetId: 'mobile-messages-app',
        eyebrow: 'Try it',
        title: 'Open Messages now',
        body: 'Start by checking your Inbox. It is the safest first habit before advancing the week.',
        actionLabel: 'Open Messages',
        nextStepId: 'MESSAGES_SCREEN',
        mobileAppMode: 'MESSAGES',
        tone: 'blue',
    },
    {
        id: 'MESSAGES_SCREEN',
        page: Page.MOBILE,
        targetId: 'mobile-inbox',
        eyebrow: 'Inbox',
        title: 'Read offers before you advance',
        body: 'This is where studios, agents, friends, and game systems contact you. Blue dots mean unread messages. Some messages can take you straight to the right page.',
        actionLabel: 'Next',
        nextStepId: 'OPEN_HOME',
        tone: 'blue',
    },
    {
        id: 'OPEN_HOME',
        page: Page.MOBILE,
        targetId: 'nav-home',
        eyebrow: 'Return',
        title: 'Go back Home',
        body: 'The weekly loop finishes at Home. Tap Home when you are done checking apps and decisions.',
        actionLabel: 'Open Home',
        nextStepId: 'NEXT_WEEK',
        goToPage: Page.HOME,
        completeOnPage: Page.HOME,
        tone: 'gold',
    },
    {
        id: 'NEXT_WEEK',
        page: Page.HOME,
        targetId: 'home-next-week',
        eyebrow: 'Weekly loop',
        title: 'Advance when you are ready',
        body: 'This button moves the world forward. Jobs progress, messages arrive, money changes, and your actor story keeps moving.',
        actionLabel: 'Finish Tutorial',
        tone: 'gold',
    },
];

const stepIds = new Set(NEW_PLAYER_TUTORIAL_STEPS.map(step => step.id));

export const getNewPlayerTutorialStep = (stepId?: string) => (
    NEW_PLAYER_TUTORIAL_STEPS.find(step => step.id === stepId) || NEW_PLAYER_TUTORIAL_STEPS[0]
);

export const normalizeNewPlayerTutorialState = (value: unknown): NewPlayerTutorialState | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const raw = value as Partial<NewPlayerTutorialState>;
    const status: NewPlayerTutorialStatus = ['AVAILABLE', 'ACTIVE', 'SKIPPED', 'COMPLETED'].includes(String(raw.status))
        ? raw.status as NewPlayerTutorialStatus
        : 'AVAILABLE';
    const stepId = stepIds.has(String(raw.stepId)) ? String(raw.stepId) : NEW_PLAYER_TUTORIAL_FIRST_STEP_ID;
    const completedStepIds = Array.isArray(raw.completedStepIds)
        ? raw.completedStepIds.map(String).filter(id => stepIds.has(id))
        : [];

    return {
        status,
        stepId,
        completedStepIds,
        startedAtWeek: Number.isFinite(Number(raw.startedAtWeek)) ? Math.max(1, Math.round(Number(raw.startedAtWeek))) : undefined,
        skippedAtWeek: Number.isFinite(Number(raw.skippedAtWeek)) ? Math.max(1, Math.round(Number(raw.skippedAtWeek))) : undefined,
        completedAtWeek: Number.isFinite(Number(raw.completedAtWeek)) ? Math.max(1, Math.round(Number(raw.completedAtWeek))) : undefined,
    };
};

export const getNewPlayerTutorialState = (player: Player): NewPlayerTutorialState | undefined => (
    normalizeNewPlayerTutorialState(player.flags?.[NEW_PLAYER_TUTORIAL_FLAG])
);

export const shouldShowNewPlayerTutorial = (player: Player): boolean => {
    const state = getNewPlayerTutorialState(player);
    return state?.status === 'AVAILABLE' || state?.status === 'ACTIVE';
};

export const writeNewPlayerTutorialState = (player: Player, state: NewPlayerTutorialState): Player => ({
    ...player,
    flags: {
        ...(player.flags || {}),
        [NEW_PLAYER_TUTORIAL_FLAG]: state,
    },
});
