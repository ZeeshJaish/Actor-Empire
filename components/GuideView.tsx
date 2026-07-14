import React, { useMemo, useState } from 'react';
import { Zap, DollarSign, Star, Film, TrendingUp, Users, ArrowLeft, BookOpen, Briefcase, PlayCircle, X, GraduationCap, Activity, Globe, Smartphone, BarChart3, ChevronRight, HelpCircle, Heart, Clapperboard, Landmark, Sparkles, Building2, Clock3, Search } from 'lucide-react';
import { Player } from '../types';
import { getPlayerLanguage, t } from '../services/i18n';

interface GuideViewProps {
    player: Player;
    onBack: () => void;
    onOpenApp?: (mode: GuideAppDestination) => void;
}

export type GuideAppDestination = 'CASTLINK' | 'IMDB' | 'BOXOFFICE' | 'INSTAGRAM' | 'X' | 'YOUTUBE' | 'NEWS' | 'TEAM' | 'MESSAGES' | 'FORBES' | 'STOCKS' | 'DATING_FOLDER' | 'SOCIAL_FOLDER' | 'TINDER' | 'LUXE' | 'BANK';
type GuideMode = 'MENU' | 'HANDBOOK' | 'PLAYBOOKS' | 'FAQ' | 'WIZARD' | 'PROBLEM';
type Translate = (key: string, vars?: Record<string, string | number>) => string;

type GuideSectionConfig = {
    id: string;
    titleKey: string;
    icon: React.ReactNode;
    bodyKeys: string[];
    bulletKeys?: string[];
    note?: {
        titleKey: string;
        bodyKey: string;
    };
    tagKeys?: string[];
};

type WizardStepConfig = {
    titleKey: string;
    bodyKey: string;
    icon: React.ReactNode;
    color: string;
};

type GuideAction = {
    labelKey: string;
    appMode: GuideAppDestination;
    helperKey: string;
};

type ProblemSolverConfig = {
    id: string;
    titleKey: string;
    subtitleKey: string;
    icon: React.ReactNode;
    keywords: string[];
    searchKey: string;
    whatKey: string;
    whyKey: string;
    nowKeys: string[];
    actions: GuideAction[];
    related: { mode: Extract<GuideMode, 'HANDBOOK' | 'PLAYBOOKS' | 'FAQ'>; sectionId: string; labelKey: string }[];
};

type StatusTipDefinition = {
    id: string;
    titleKey: string;
    bodyKey: string;
    icon: React.ReactNode;
    action?: GuideAction;
    shouldShow: (player: Player) => boolean;
};

const GuideNote: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
        <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">{title}</div>
        <div className="text-xs leading-relaxed text-amber-50/80">{children}</div>
    </div>
);

const GuideBullets: React.FC<{ items: string[] }> = ({ items }) => (
    <div className="space-y-2">
        {items.map(item => (
            <div key={item} className="flex gap-2 text-xs leading-relaxed text-zinc-400">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" />
                <span>{item}</span>
            </div>
        ))}
    </div>
);

const GuideTagRow: React.FC<{ tags: string[] }> = ({ tags }) => (
    <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
            <span key={tag} className="rounded-full border border-zinc-700 bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                {tag}
            </span>
        ))}
    </div>
);

const GuideActionButton: React.FC<{ action: GuideAction; guideText: Translate; onOpenApp?: (mode: GuideAppDestination) => void }> = ({ action, guideText, onOpenApp }) => (
    <button
        type="button"
        onClick={() => onOpenApp?.(action.appMode)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-950/30 px-3 py-2.5 text-left transition hover:border-emerald-300/50 hover:bg-emerald-900/40"
    >
        <div className="min-w-0">
            <div className="truncate text-sm font-black text-white">{guideText(action.labelKey)}</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200/70">{guideText(action.helperKey)}</div>
        </div>
        <ChevronRight size={17} className="shrink-0 text-emerald-300" />
    </button>
);

const GuideShortcutButton: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    tone: string;
    onClick: () => void;
}> = ({ icon, title, subtitle, tone, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex min-h-[92px] flex-col items-start gap-2 rounded-2xl border p-3 text-left transition hover:scale-[1.01] ${tone}`}
    >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/35">
            {icon}
        </div>
        <div className="min-w-0">
            <div className="line-clamp-2 text-sm font-black leading-tight text-white">{title}</div>
            <div className="mt-1 line-clamp-2 text-[10px] font-semibold leading-snug text-zinc-400">{subtitle}</div>
        </div>
    </button>
);

const renderGuideContent = (section: GuideSectionConfig, guideText: Translate) => (
    <div className="space-y-3 text-xs text-zinc-400">
        {section.bodyKeys.map(key => (
            <p key={key}>{guideText(key)}</p>
        ))}
        {section.bulletKeys && <GuideBullets items={section.bulletKeys.map(key => guideText(key))} />}
        {section.tagKeys && <GuideTagRow tags={section.tagKeys.map(key => guideText(key))} />}
        {section.note && (
            <GuideNote title={guideText(section.note.titleKey)}>
                {guideText(section.note.bodyKey)}
            </GuideNote>
        )}
    </div>
);

const WIZARD_STEPS: WizardStepConfig[] = [
    { titleKey: 'wizard.welcome.title', bodyKey: 'wizard.welcome.body', icon: <Star size={48} className="text-amber-400" />, color: 'bg-zinc-900' },
    { titleKey: 'wizard.weeklyLoop.title', bodyKey: 'wizard.weeklyLoop.body', icon: <Clock3 size={48} className="text-sky-400" />, color: 'bg-sky-900/20' },
    { titleKey: 'wizard.career.title', bodyKey: 'wizard.career.body', icon: <Film size={48} className="text-indigo-400" />, color: 'bg-indigo-900/20' },
    { titleKey: 'wizard.stats.title', bodyKey: 'wizard.stats.body', icon: <Sparkles size={48} className="text-fuchsia-400" />, color: 'bg-fuchsia-900/20' },
    { titleKey: 'wizard.business.title', bodyKey: 'wizard.business.body', icon: <BarChart3 size={48} className="text-emerald-400" />, color: 'bg-emerald-900/20' },
    { titleKey: 'wizard.studio.title', bodyKey: 'wizard.studio.body', icon: <Clapperboard size={48} className="text-rose-400" />, color: 'bg-rose-900/20' },
    { titleKey: 'wizard.stories.title', bodyKey: 'wizard.stories.body', icon: <Globe size={48} className="text-blue-400" />, color: 'bg-blue-900/20' },
];

const PROBLEM_SOLVERS: ProblemSolverConfig[] = [
    {
        id: 'roles',
        titleKey: 'problem.roles.title',
        subtitleKey: 'problem.roles.subtitle',
        icon: <Film size={18} className="text-indigo-300" />,
        keywords: ['role', 'castlink', 'audition', 'agent', 'career', 'acting', 'job'],
        searchKey: 'problem.roles.search',
        whatKey: 'problem.roles.what',
        whyKey: 'problem.roles.why',
        nowKeys: ['problem.roles.now1', 'problem.roles.now2', 'problem.roles.now3'],
        actions: [
            { labelKey: 'problem.action.castlink', appMode: 'CASTLINK', helperKey: 'problem.action.castlink.helper' },
            { labelKey: 'problem.action.team', appMode: 'TEAM', helperKey: 'problem.action.team.helper' }
        ],
        related: [
            { mode: 'FAQ', sectionId: 'FAQ_ROLES', labelKey: 'problem.related.faq.roles' },
            { mode: 'PLAYBOOKS', sectionId: 'ACTOR_CAREER', labelKey: 'problem.related.playbook.actorCareer' },
            { mode: 'HANDBOOK', sectionId: 'CAREER', labelKey: 'problem.related.handbook.career' }
        ]
    },
    {
        id: 'energy',
        titleKey: 'problem.energy.title',
        subtitleKey: 'problem.energy.subtitle',
        icon: <Zap size={18} className="text-yellow-300" />,
        keywords: ['energy', 'tired', 'week', 'rest', 'stamina', 'blocked'],
        searchKey: 'problem.energy.search',
        whatKey: 'problem.energy.what',
        whyKey: 'problem.energy.why',
        nowKeys: ['problem.energy.now1', 'problem.energy.now2', 'problem.energy.now3'],
        actions: [
            { labelKey: 'problem.action.castlink', appMode: 'CASTLINK', helperKey: 'problem.action.castlink.energyHelper' },
            { labelKey: 'problem.action.social', appMode: 'SOCIAL_FOLDER', helperKey: 'problem.action.social.helper' }
        ],
        related: [
            { mode: 'FAQ', sectionId: 'FAQ_ENERGY', labelKey: 'problem.related.faq.energy' },
            { mode: 'HANDBOOK', sectionId: 'WEEKLY_LOOP', labelKey: 'problem.related.handbook.weekly' },
            { mode: 'PLAYBOOKS', sectionId: 'EARLY_GAME', labelKey: 'problem.related.playbook.early' }
        ]
    },
    {
        id: 'health',
        titleKey: 'problem.health.title',
        subtitleKey: 'problem.health.subtitle',
        icon: <Activity size={18} className="text-rose-300" />,
        keywords: ['health', 'medical', 'clinic', 'wellness', 'care', 'flu', 'cold', 'pain', 'injury', 'sick', 'treatment'],
        searchKey: 'problem.health.search',
        whatKey: 'problem.health.what',
        whyKey: 'problem.health.why',
        nowKeys: ['problem.health.now1', 'problem.health.now2', 'problem.health.now3'],
        actions: [
            { labelKey: 'problem.action.team', appMode: 'TEAM', helperKey: 'problem.action.team.healthHelper' }
        ],
        related: [
            { mode: 'HANDBOOK', sectionId: 'HEALTH_CARE', labelKey: 'problem.related.handbook.healthCare' },
            { mode: 'FAQ', sectionId: 'FAQ_HEALTH', labelKey: 'problem.related.faq.health' },
            { mode: 'HANDBOOK', sectionId: 'WEEKLY_LOOP', labelKey: 'problem.related.handbook.weekly' }
        ]
    },
    {
        id: 'money',
        titleKey: 'problem.money.title',
        subtitleKey: 'problem.money.subtitle',
        icon: <DollarSign size={18} className="text-emerald-300" />,
        keywords: ['money', 'cash', 'loan', 'bank', 'business', 'stock', 'income', 'asset'],
        searchKey: 'problem.money.search',
        whatKey: 'problem.money.what',
        whyKey: 'problem.money.why',
        nowKeys: ['problem.money.now1', 'problem.money.now2', 'problem.money.now3'],
        actions: [
            { labelKey: 'problem.action.bank', appMode: 'BANK', helperKey: 'problem.action.bank.helper' },
            { labelKey: 'problem.action.stocks', appMode: 'STOCKS', helperKey: 'problem.action.stocks.helper' },
            { labelKey: 'problem.action.forbes', appMode: 'FORBES', helperKey: 'problem.action.forbes.helper' }
        ],
        related: [
            { mode: 'FAQ', sectionId: 'FAQ_BUSINESS_MONEY', labelKey: 'problem.related.faq.businessMoney' },
            { mode: 'FAQ', sectionId: 'FAQ_LOANS', labelKey: 'problem.related.faq.loans' },
            { mode: 'PLAYBOOKS', sectionId: 'MONEY_RISK', labelKey: 'problem.related.playbook.money' }
        ]
    },
    {
        id: 'awards',
        titleKey: 'problem.awards.title',
        subtitleKey: 'problem.awards.subtitle',
        icon: <TrendingUp size={18} className="text-amber-300" />,
        keywords: ['award', 'imdb', 'nomination', 'winner', 'release', 'streaming', 'box office', 'rating'],
        searchKey: 'problem.awards.search',
        whatKey: 'problem.awards.what',
        whyKey: 'problem.awards.why',
        nowKeys: ['problem.awards.now1', 'problem.awards.now2', 'problem.awards.now3'],
        actions: [
            { labelKey: 'problem.action.imdb', appMode: 'IMDB', helperKey: 'problem.action.imdb.helper' },
            { labelKey: 'problem.action.boxOffice', appMode: 'BOXOFFICE', helperKey: 'problem.action.boxOffice.helper' },
            { labelKey: 'problem.action.news', appMode: 'NEWS', helperKey: 'problem.action.news.helper' }
        ],
        related: [
            { mode: 'HANDBOOK', sectionId: 'RELEASES_AWARDS', labelKey: 'problem.related.handbook.releases' },
            { mode: 'FAQ', sectionId: 'FAQ_STREAMING', labelKey: 'problem.related.faq.streaming' },
            { mode: 'PLAYBOOKS', sectionId: 'ACTOR_CAREER', labelKey: 'problem.related.playbook.actorCareer' }
        ]
    },
    {
        id: 'relationships',
        titleKey: 'problem.relationships.title',
        subtitleKey: 'problem.relationships.subtitle',
        icon: <Heart size={18} className="text-rose-300" />,
        keywords: ['relationship', 'dating', 'luxe', 'tinder', 'love', 'intimacy', 'family', 'friend'],
        searchKey: 'problem.relationships.search',
        whatKey: 'problem.relationships.what',
        whyKey: 'problem.relationships.why',
        nowKeys: ['problem.relationships.now1', 'problem.relationships.now2', 'problem.relationships.now3'],
        actions: [
            { labelKey: 'problem.action.luxe', appMode: 'LUXE', helperKey: 'problem.action.luxe.helper' },
            { labelKey: 'problem.action.tinder', appMode: 'TINDER', helperKey: 'problem.action.tinder.helper' },
            { labelKey: 'problem.action.social', appMode: 'SOCIAL_FOLDER', helperKey: 'problem.action.social.relationshipHelper' }
        ],
        related: [
            { mode: 'FAQ', sectionId: 'FAQ_RELATIONSHIP', labelKey: 'problem.related.faq.relationships' },
            { mode: 'PLAYBOOKS', sectionId: 'SOCIAL_PERSONAL', labelKey: 'problem.related.playbook.social' },
            { mode: 'HANDBOOK', sectionId: 'RELATIONSHIPS', labelKey: 'problem.related.handbook.relationships' }
        ]
    },
    {
        id: 'studio',
        titleKey: 'problem.studio.title',
        subtitleKey: 'problem.studio.subtitle',
        icon: <Clapperboard size={18} className="text-violet-300" />,
        keywords: ['studio', 'production', 'sequel', 'prequel', 'reboot', 'spin-off', 'universe', 'greenlight', 'script'],
        searchKey: 'problem.studio.search',
        whatKey: 'problem.studio.what',
        whyKey: 'problem.studio.why',
        nowKeys: ['problem.studio.now1', 'problem.studio.now2', 'problem.studio.now3'],
        actions: [
            { labelKey: 'problem.action.imdb', appMode: 'IMDB', helperKey: 'problem.action.imdb.studioHelper' },
            { labelKey: 'problem.action.boxOffice', appMode: 'BOXOFFICE', helperKey: 'problem.action.boxOffice.studioHelper' },
            { labelKey: 'problem.action.team', appMode: 'TEAM', helperKey: 'problem.action.team.studioHelper' }
        ],
        related: [
            { mode: 'HANDBOOK', sectionId: 'PRODUCTION_HOUSE', labelKey: 'problem.related.handbook.productionHouse' },
            { mode: 'HANDBOOK', sectionId: 'GREENLIGHT', labelKey: 'problem.related.handbook.greenlight' },
            { mode: 'PLAYBOOKS', sectionId: 'UNIVERSE_WORKFLOW', labelKey: 'problem.related.playbook.universe' }
        ]
    }
];

const hasProductionHouseScripts = (player: Player) => (
    (player.businesses || []).some(business => business.type === 'PRODUCTION_HOUSE' && (business.studioState?.scripts || []).length > 0)
);

const hasActiveStudioProduction = (player: Player) => {
    const studioIds = new Set((player.businesses || []).filter(business => business.type === 'PRODUCTION_HOUSE').map(business => business.id));
    if (studioIds.size === 0) return false;
    return (player.commitments || []).some(commitment => (
        commitment.projectDetails?.studioId && studioIds.has(commitment.projectDetails.studioId)
    ));
};

const STATUS_TIP_DEFINITIONS: StatusTipDefinition[] = [
    {
        id: 'lowEnergy',
        titleKey: 'status.lowEnergy.title',
        bodyKey: 'status.lowEnergy.body',
        icon: <Zap size={16} className="text-yellow-300" />,
        action: { labelKey: 'problem.action.castlink', appMode: 'CASTLINK', helperKey: 'status.lowEnergy.action' },
        shouldShow: player => (player.energy?.current || 0) <= Math.max(15, (player.energy?.max || 100) * 0.25)
    },
    {
        id: 'nominations',
        titleKey: 'status.nominations.title',
        bodyKey: 'status.nominations.body',
        icon: <TrendingUp size={16} className="text-amber-300" />,
        action: { labelKey: 'problem.action.imdb', appMode: 'IMDB', helperKey: 'status.nominations.action' },
        shouldShow: player => (player.scheduledEvents || []).some(event => event.type === 'AWARD_CEREMONY' && (event.data?.nominations || []).length > 0)
    },
    {
        id: 'noRole',
        titleKey: 'status.noRole.title',
        bodyKey: 'status.noRole.body',
        icon: <Film size={16} className="text-indigo-300" />,
        action: { labelKey: 'problem.action.castlink', appMode: 'CASTLINK', helperKey: 'status.noRole.action' },
        shouldShow: player => !(player.commitments || []).some(commitment => commitment.type === 'ACTING_GIG')
    },
    {
        id: 'scriptsNoProduction',
        titleKey: 'status.scriptsNoProduction.title',
        bodyKey: 'status.scriptsNoProduction.body',
        icon: <Clapperboard size={16} className="text-violet-300" />,
        action: { labelKey: 'problem.action.boxOffice', appMode: 'BOXOFFICE', helperKey: 'status.scriptsNoProduction.action' },
        shouldShow: player => hasProductionHouseScripts(player) && !hasActiveStudioProduction(player)
    },
    {
        id: 'loanPressure',
        titleKey: 'status.loanPressure.title',
        bodyKey: 'status.loanPressure.body',
        icon: <Landmark size={16} className="text-emerald-300" />,
        action: { labelKey: 'problem.action.bank', appMode: 'BANK', helperKey: 'status.loanPressure.action' },
        shouldShow: player => (player.finance?.loans || []).some(loan => loan.status === 'ACTIVE' && (loan.weeklyPayment || 0) > 0)
    }
];

const HANDBOOK_SECTIONS: GuideSectionConfig[] = [
    {
        id: 'GETTING_STARTED',
        titleKey: 'handbook.gettingStarted.title',
        icon: <GraduationCap size={18} className="text-sky-400" />,
        bodyKeys: ['handbook.gettingStarted.p1', 'handbook.gettingStarted.p2', 'handbook.gettingStarted.p3'],
    },
    {
        id: 'STATS',
        titleKey: 'handbook.stats.title',
        icon: <Sparkles size={18} className="text-amber-400" />,
        bodyKeys: ['handbook.stats.p1', 'handbook.stats.p2', 'handbook.stats.p3', 'handbook.stats.p4'],
    },
    {
        id: 'CAREER',
        titleKey: 'handbook.career.title',
        icon: <Film size={18} className="text-indigo-400" />,
        bodyKeys: ['handbook.career.p1', 'handbook.career.p2', 'handbook.career.p3'],
    },
    {
        id: 'WEEKLY_LOOP',
        titleKey: 'handbook.weeklyLoop.title',
        icon: <Zap size={18} className="text-yellow-400" />,
        bodyKeys: ['handbook.weeklyLoop.p1', 'handbook.weeklyLoop.p2', 'handbook.weeklyLoop.p3'],
    },
    {
        id: 'HEALTH_CARE',
        titleKey: 'handbook.healthCare.title',
        icon: <Activity size={18} className="text-rose-400" />,
        bodyKeys: ['handbook.healthCare.p1', 'handbook.healthCare.p2', 'handbook.healthCare.p3'],
        bulletKeys: ['handbook.healthCare.b1', 'handbook.healthCare.b2', 'handbook.healthCare.b3'],
        note: { titleKey: 'handbook.healthCare.noteTitle', bodyKey: 'handbook.healthCare.noteBody' },
    },
    {
        id: 'SOCIAL_MEDIA',
        titleKey: 'handbook.social.title',
        icon: <Smartphone size={18} className="text-pink-400" />,
        bodyKeys: ['handbook.social.p1', 'handbook.social.p2', 'handbook.social.p3'],
    },
    {
        id: 'RELATIONSHIPS',
        titleKey: 'handbook.relationships.title',
        icon: <Heart size={18} className="text-rose-400" />,
        bodyKeys: ['handbook.relationships.p1', 'handbook.relationships.p2', 'handbook.relationships.p3'],
    },
    {
        id: 'BUSINESSES',
        titleKey: 'handbook.businesses.title',
        icon: <Building2 size={18} className="text-emerald-400" />,
        bodyKeys: ['handbook.businesses.p1', 'handbook.businesses.p2', 'handbook.businesses.p3'],
    },
    {
        id: 'PRODUCTION_HOUSE',
        titleKey: 'handbook.productionHouse.title',
        icon: <Clapperboard size={18} className="text-violet-400" />,
        bodyKeys: ['handbook.productionHouse.p1', 'handbook.productionHouse.p2', 'handbook.productionHouse.p3'],
    },
    {
        id: 'DEVELOPMENT_LAB',
        titleKey: 'handbook.developmentLab.title',
        icon: <BookOpen size={18} className="text-amber-400" />,
        bodyKeys: ['handbook.developmentLab.p1', 'handbook.developmentLab.p2', 'handbook.developmentLab.p3'],
        note: { titleKey: 'handbook.developmentLab.noteTitle', bodyKey: 'handbook.developmentLab.noteBody' },
    },
    {
        id: 'SCRIPT_FORMATS',
        titleKey: 'handbook.scriptFormats.title',
        icon: <Film size={18} className="text-pink-400" />,
        bodyKeys: ['handbook.scriptFormats.p1', 'handbook.scriptFormats.p2', 'handbook.scriptFormats.p3'],
        tagKeys: ['handbook.scriptFormats.tag1', 'handbook.scriptFormats.tag2', 'handbook.scriptFormats.tag3', 'handbook.scriptFormats.tag4'],
    },
    {
        id: 'GREENLIGHT',
        titleKey: 'handbook.greenlight.title',
        icon: <PlayCircle size={18} className="text-emerald-400" />,
        bodyKeys: ['handbook.greenlight.p1', 'handbook.greenlight.p2', 'handbook.greenlight.p3'],
        bulletKeys: ['handbook.greenlight.b1', 'handbook.greenlight.b2', 'handbook.greenlight.b3'],
    },
    {
        id: 'FINANCE',
        titleKey: 'handbook.finance.title',
        icon: <Landmark size={18} className="text-amber-400" />,
        bodyKeys: ['handbook.finance.p1', 'handbook.finance.p2', 'handbook.finance.p3', 'handbook.finance.p4'],
    },
    {
        id: 'UNIVERSES',
        titleKey: 'handbook.universes.title',
        icon: <Globe size={18} className="text-blue-400" />,
        bodyKeys: ['handbook.universes.p1', 'handbook.universes.p2', 'handbook.universes.p3', 'handbook.universes.p4'],
    },
    {
        id: 'RELEASES_AWARDS',
        titleKey: 'handbook.releases.title',
        icon: <TrendingUp size={18} className="text-green-400" />,
        bodyKeys: ['handbook.releases.p1', 'handbook.releases.p2', 'handbook.releases.p3'],
    },
    {
        id: 'LEGACY',
        titleKey: 'handbook.legacy.title',
        icon: <Users size={18} className="text-cyan-400" />,
        bodyKeys: ['handbook.legacy.p1', 'handbook.legacy.p2', 'handbook.legacy.p3'],
    },
];

const PLAYBOOK_SECTIONS: GuideSectionConfig[] = [
    {
        id: 'EARLY_GAME',
        titleKey: 'playbooks.earlyGame.title',
        icon: <Zap size={18} className="text-yellow-400" />,
        bodyKeys: ['playbooks.earlyGame.p1'],
        bulletKeys: ['playbooks.earlyGame.b1', 'playbooks.earlyGame.b2', 'playbooks.earlyGame.b3'],
        note: { titleKey: 'playbooks.earlyGame.noteTitle', bodyKey: 'playbooks.earlyGame.noteBody' },
    },
    {
        id: 'ACTOR_CAREER',
        titleKey: 'playbooks.actorCareer.title',
        icon: <Film size={18} className="text-indigo-400" />,
        bodyKeys: ['playbooks.actorCareer.p1'],
        bulletKeys: ['playbooks.actorCareer.b1', 'playbooks.actorCareer.b2', 'playbooks.actorCareer.b3'],
    },
    {
        id: 'STUDIO_SLATE',
        titleKey: 'playbooks.studioSlate.title',
        icon: <Clapperboard size={18} className="text-violet-400" />,
        bodyKeys: ['playbooks.studioSlate.p1'],
        bulletKeys: ['playbooks.studioSlate.b1', 'playbooks.studioSlate.b2', 'playbooks.studioSlate.b3'],
    },
    {
        id: 'UNIVERSE_WORKFLOW',
        titleKey: 'playbooks.universeWorkflow.title',
        icon: <Globe size={18} className="text-blue-400" />,
        bodyKeys: ['playbooks.universeWorkflow.p1'],
        bulletKeys: ['playbooks.universeWorkflow.b1', 'playbooks.universeWorkflow.b2', 'playbooks.universeWorkflow.b3'],
        note: { titleKey: 'playbooks.universeWorkflow.noteTitle', bodyKey: 'playbooks.universeWorkflow.noteBody' },
    },
    {
        id: 'MONEY_RISK',
        titleKey: 'playbooks.moneyRisk.title',
        icon: <DollarSign size={18} className="text-emerald-400" />,
        bodyKeys: ['playbooks.moneyRisk.p1'],
        bulletKeys: ['playbooks.moneyRisk.b1', 'playbooks.moneyRisk.b2', 'playbooks.moneyRisk.b3'],
    },
    {
        id: 'SOCIAL_PERSONAL',
        titleKey: 'playbooks.socialPersonal.title',
        icon: <Heart size={18} className="text-rose-400" />,
        bodyKeys: ['playbooks.socialPersonal.p1'],
        bulletKeys: ['playbooks.socialPersonal.b1', 'playbooks.socialPersonal.b2', 'playbooks.socialPersonal.b3'],
    },
];

const FAQ_SECTIONS: GuideSectionConfig[] = [
    { id: 'FAQ_ROLES', titleKey: 'faq.roles.title', icon: <Film size={18} className="text-indigo-400" />, bodyKeys: ['faq.roles.p1'] },
    { id: 'FAQ_STATS', titleKey: 'faq.stats.title', icon: <Star size={18} className="text-amber-400" />, bodyKeys: ['faq.stats.p1'] },
    { id: 'FAQ_BUSINESS_MONEY', titleKey: 'faq.businessMoney.title', icon: <BarChart3 size={18} className="text-emerald-400" />, bodyKeys: ['faq.businessMoney.p1'] },
    { id: 'FAQ_MARKETING', titleKey: 'faq.marketing.title', icon: <TrendingUp size={18} className="text-pink-400" />, bodyKeys: ['faq.marketing.p1'] },
    { id: 'FAQ_ENERGY', titleKey: 'faq.energy.title', icon: <Zap size={18} className="text-yellow-400" />, bodyKeys: ['faq.energy.p1'] },
    { id: 'FAQ_HEALTH', titleKey: 'faq.health.title', icon: <Activity size={18} className="text-rose-400" />, bodyKeys: ['faq.health.p1'] },
    { id: 'FAQ_SPONSOR', titleKey: 'faq.sponsor.title', icon: <Briefcase size={18} className="text-emerald-400" />, bodyKeys: ['faq.sponsor.p1'] },
    { id: 'FAQ_RELATIONSHIP', titleKey: 'faq.relationship.title', icon: <Heart size={18} className="text-rose-400" />, bodyKeys: ['faq.relationship.p1'] },
    { id: 'FAQ_STUDIO', titleKey: 'faq.studio.title', icon: <Clapperboard size={18} className="text-violet-400" />, bodyKeys: ['faq.studio.p1'] },
    { id: 'FAQ_SCRIPT_QUALITY', titleKey: 'faq.scriptQuality.title', icon: <BookOpen size={18} className="text-amber-400" />, bodyKeys: ['faq.scriptQuality.p1'] },
    { id: 'FAQ_GENRES', titleKey: 'faq.genres.title', icon: <Film size={18} className="text-pink-400" />, bodyKeys: ['faq.genres.p1'] },
    { id: 'FAQ_CONNECTED_CHARACTERS', titleKey: 'faq.connectedCharacters.title', icon: <Globe size={18} className="text-blue-400" />, bodyKeys: ['faq.connectedCharacters.p1'] },
    { id: 'FAQ_SEQUEL_CAST', titleKey: 'faq.sequelCast.title', icon: <Users size={18} className="text-cyan-400" />, bodyKeys: ['faq.sequelCast.p1'] },
    { id: 'FAQ_STREAMING', titleKey: 'faq.streaming.title', icon: <PlayCircle size={18} className="text-blue-400" />, bodyKeys: ['faq.streaming.p1'] },
    { id: 'FAQ_LOANS', titleKey: 'faq.loans.title', icon: <Landmark size={18} className="text-amber-400" />, bodyKeys: ['faq.loans.p1'] },
    { id: 'FAQ_LEGACY', titleKey: 'faq.legacy.title', icon: <Users size={18} className="text-cyan-400" />, bodyKeys: ['faq.legacy.p1'] },
];

const SectionList: React.FC<{
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    sections: GuideSectionConfig[];
    expandedSection: string | null;
    guideText: Translate;
    onToggle: (id: string) => void;
    onBack: () => void;
}> = ({ title, subtitle, icon, sections, expandedSection, guideText, onToggle, onBack }) => (
    <div className="absolute inset-0 z-40 flex h-full flex-col bg-zinc-950 text-white animate-in slide-in-from-right duration-300">
        <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900 p-4 pt-12">
            <button onClick={onBack} className="-ml-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
                <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2 text-lg font-bold">
                {icon}
                {title}
            </div>
        </div>

        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4 pb-24">
            <div className="px-1 pb-1">
                <p className="text-xs leading-relaxed text-zinc-500">{subtitle}</p>
            </div>
            {sections.map(section => (
                <div key={section.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                    <button
                        onClick={() => onToggle(section.id)}
                        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-800"
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-black p-2">{section.icon}</div>
                            <span className="text-sm font-bold">{guideText(section.titleKey)}</span>
                        </div>
                        <ChevronRight size={16} className={`text-zinc-500 transition-transform duration-300 ${expandedSection === section.id ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedSection === section.id && (
                        <div className="border-t border-zinc-800/50 bg-black/20 p-4 pt-0 animate-in slide-in-from-top-2">
                            <div className="mt-4">{renderGuideContent(section, guideText)}</div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
);

const ProblemSolverView: React.FC<{
    problem: ProblemSolverConfig;
    guideText: Translate;
    onBack: () => void;
    onOpenApp?: (mode: GuideAppDestination) => void;
    onOpenRelated: (mode: Extract<GuideMode, 'HANDBOOK' | 'PLAYBOOKS' | 'FAQ'>, sectionId: string) => void;
}> = ({ problem, guideText, onBack, onOpenApp, onOpenRelated }) => (
    <div className="absolute inset-0 z-50 flex h-full flex-col bg-zinc-950 text-white animate-in slide-in-from-right duration-300">
        <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900 p-4 pt-12">
            <button onClick={onBack} className="-ml-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
                <ArrowLeft size={20} />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-lg font-bold">
                {problem.icon}
                <span className="truncate">{guideText(problem.titleKey)}</span>
            </div>
        </div>

        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4 pb-24">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-5">
                <div className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                    {guideText('problem.ui.solver')}
                </div>
                <h2 className="text-2xl font-black leading-tight text-white">{guideText(problem.titleKey)}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{guideText(problem.subtitleKey)}</p>
            </div>

            <div className="space-y-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">{guideText('problem.ui.what')}</div>
                    <p className="text-sm leading-relaxed text-zinc-300">{guideText(problem.whatKey)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">{guideText('problem.ui.why')}</div>
                    <p className="text-sm leading-relaxed text-zinc-300">{guideText(problem.whyKey)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">{guideText('problem.ui.whatNow')}</div>
                    <GuideBullets items={problem.nowKeys.map(key => guideText(key))} />
                </div>
            </div>

            <div className="space-y-2">
                <div className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{guideText('problem.ui.openApp')}</div>
                {problem.actions.map(action => (
                    <GuideActionButton key={`${problem.id}-${action.appMode}-${action.labelKey}`} action={action} guideText={guideText} onOpenApp={onOpenApp} />
                ))}
            </div>

            <div className="space-y-2 rounded-2xl border border-zinc-800 bg-black/30 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{guideText('problem.ui.related')}</div>
                {problem.related.map(item => (
                    <button
                        key={`${problem.id}-${item.mode}-${item.sectionId}`}
                        type="button"
                        onClick={() => onOpenRelated(item.mode, item.sectionId)}
                        className="flex w-full items-center justify-between rounded-xl bg-zinc-900 px-3 py-3 text-left text-xs font-bold text-zinc-200 transition hover:bg-zinc-800"
                    >
                        {guideText(item.labelKey)}
                        <ChevronRight size={15} className="text-zinc-500" />
                    </button>
                ))}
            </div>
        </div>
    </div>
);

export const GuideView: React.FC<GuideViewProps> = ({ player, onBack, onOpenApp }) => {
    const [mode, setMode] = useState<GuideMode>('MENU');
    const [wizardStep, setWizardStep] = useState(0);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const language = getPlayerLanguage(player);
    const menuTitle = t(language, 'guide.menu.title');
    const guideText: Translate = (key, vars) => t(language, `guide.${key}`, vars);
    const allGuideSections = useMemo(() => [
        ...HANDBOOK_SECTIONS.map(section => ({ ...section, mode: 'HANDBOOK' as const, typeLabelKey: 'problem.search.type.handbook' })),
        ...PLAYBOOK_SECTIONS.map(section => ({ ...section, mode: 'PLAYBOOKS' as const, typeLabelKey: 'problem.search.type.playbook' })),
        ...FAQ_SECTIONS.map(section => ({ ...section, mode: 'FAQ' as const, typeLabelKey: 'problem.search.type.faq' })),
    ], []);
    const recommendedTips = useMemo(() => (
        STATUS_TIP_DEFINITIONS.filter(tip => tip.shouldShow(player)).slice(0, 3)
    ), [player]);
    const filteredGuideResults = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return [];
        const problemMatches = PROBLEM_SOLVERS
            .filter(problem => [
                guideText(problem.titleKey),
                guideText(problem.subtitleKey),
                guideText(problem.searchKey),
                guideText(problem.whatKey),
                guideText(problem.whyKey),
                ...problem.nowKeys.map(key => guideText(key)),
                ...problem.keywords
            ].join(' ').toLowerCase().includes(query))
            .map(problem => ({ type: 'problem' as const, problem }));
        const sectionMatches = allGuideSections
            .filter(section => [
                guideText(section.titleKey),
                ...section.bodyKeys.map(key => guideText(key)),
                ...(section.bulletKeys || []).map(key => guideText(key)),
                guideText(section.typeLabelKey)
            ].join(' ').toLowerCase().includes(query))
            .slice(0, 6)
            .map(section => ({ type: 'section' as const, section }));
        return [...problemMatches, ...sectionMatches].slice(0, 8);
    }, [allGuideSections, guideText, searchQuery]);

    const openMode = (nextMode: GuideMode) => {
        setExpandedSection(null);
        setMode(nextMode);
    };

    const openProblem = (id: string) => {
        setSelectedProblemId(id);
        setMode('PROBLEM');
    };

    const openRelatedSection = (nextMode: Extract<GuideMode, 'HANDBOOK' | 'PLAYBOOKS' | 'FAQ'>, sectionId: string) => {
        setExpandedSection(sectionId);
        setMode(nextMode);
    };

    const toggleSection = (id: string) => {
        setExpandedSection(expandedSection === id ? null : id);
    };

    const nextStep = () => {
        if (wizardStep < WIZARD_STEPS.length - 1) {
            setWizardStep(wizardStep + 1);
        } else {
            setMode('MENU');
            setWizardStep(0);
        }
    };

    const renderWizard = () => {
        const step = WIZARD_STEPS[wizardStep];
        return (
            <div className="absolute inset-0 z-50 flex h-full flex-col bg-black animate-in fade-in zoom-in-95 duration-300">
                <button onClick={() => setMode('MENU')} className="absolute right-6 top-12 z-10 rounded-full bg-zinc-900 p-2 text-zinc-500 hover:text-white">
                    <X size={20} />
                </button>

                <div className="custom-scrollbar flex flex-1 flex-col items-center justify-center space-y-8 overflow-y-auto p-8 text-center">
                    <div className={`flex h-32 w-32 shrink-0 items-center justify-center rounded-full ${step.color} shadow-[0_0_50px_rgba(0,0,0,0.5)]`}>
                        {step.icon}
                    </div>
                    <div>
                        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                            {guideText('wizard.step', { current: wizardStep + 1, total: WIZARD_STEPS.length })}
                        </div>
                        <h2 className="mb-4 text-3xl font-bold text-white">{guideText(step.titleKey)}</h2>
                        <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-300">{guideText(step.bodyKey)}</p>
                    </div>
                </div>

                <div className="shrink-0 border-t border-zinc-900 bg-black p-6 pb-20">
                    <button onClick={nextStep} className="w-full rounded-2xl bg-white py-4 font-bold text-black shadow-lg transition-colors hover:bg-zinc-200">
                        {wizardStep === WIZARD_STEPS.length - 1 ? guideText('wizard.finish') : guideText('wizard.next')}
                    </button>
                </div>
            </div>
        );
    };

    if (mode === 'WIZARD') {
        return renderWizard();
    }

    if (mode === 'PROBLEM') {
        const problem = PROBLEM_SOLVERS.find(item => item.id === selectedProblemId) || PROBLEM_SOLVERS[0];
        return (
            <ProblemSolverView
                problem={problem}
                guideText={guideText}
                onBack={() => setMode('MENU')}
                onOpenApp={onOpenApp}
                onOpenRelated={openRelatedSection}
            />
        );
    }

    if (mode === 'HANDBOOK') {
        return (
            <SectionList
                title={guideText('handbook.title')}
                subtitle={guideText('handbook.subtitle')}
                icon={<BookOpen size={20} className="text-amber-500" />}
                sections={HANDBOOK_SECTIONS}
                expandedSection={expandedSection}
                guideText={guideText}
                onToggle={toggleSection}
                onBack={() => setMode('MENU')}
            />
        );
    }

    if (mode === 'PLAYBOOKS') {
        return (
            <SectionList
                title={guideText('playbooks.title')}
                subtitle={guideText('playbooks.subtitle')}
                icon={<Activity size={20} className="text-emerald-400" />}
                sections={PLAYBOOK_SECTIONS}
                expandedSection={expandedSection}
                guideText={guideText}
                onToggle={toggleSection}
                onBack={() => setMode('MENU')}
            />
        );
    }

    if (mode === 'FAQ') {
        return (
            <SectionList
                title={guideText('faq.title')}
                subtitle={guideText('faq.subtitle')}
                icon={<HelpCircle size={20} className="text-cyan-400" />}
                sections={FAQ_SECTIONS}
                expandedSection={expandedSection}
                guideText={guideText}
                onToggle={toggleSection}
                onBack={() => setMode('MENU')}
            />
        );
    }

    return (
        <div className="absolute inset-0 z-40 flex h-full flex-col bg-zinc-950 font-sans text-white animate-in slide-in-from-right duration-300">
            <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900/95 px-4 pb-3 pt-10">
                <button onClick={onBack} className="-ml-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
                    <ArrowLeft size={20} />
                </button>
                <div className="min-w-0">
                    <div className="truncate text-lg font-black">{menuTitle}</div>
                    <div className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{guideText('problem.search.label')}</div>
                </div>
            </div>

            <div className="custom-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-8 pt-4">
                <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-4">
                    <h2 className="text-xl font-black leading-tight text-white">{guideText('menu.heading')}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">{guideText('menu.subtitle')}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <GuideShortcutButton
                        icon={<GraduationCap size={21} className="text-indigo-200" />}
                        title={guideText('menu.quickStart.title')}
                        subtitle={guideText('menu.quickStart.subtitle')}
                        tone="border-indigo-500/25 bg-indigo-950/30 hover:border-indigo-400/50"
                        onClick={() => openMode('WIZARD')}
                    />
                    <GuideShortcutButton
                        icon={<BookOpen size={21} className="text-amber-200" />}
                        title={guideText('menu.handbook.title')}
                        subtitle={guideText('menu.handbook.subtitle')}
                        tone="border-amber-500/20 bg-amber-950/20 hover:border-amber-400/45"
                        onClick={() => openMode('HANDBOOK')}
                    />
                    <GuideShortcutButton
                        icon={<Activity size={21} className="text-emerald-200" />}
                        title={guideText('menu.playbooks.title')}
                        subtitle={guideText('menu.playbooks.subtitle')}
                        tone="border-emerald-500/20 bg-emerald-950/20 hover:border-emerald-400/45"
                        onClick={() => openMode('PLAYBOOKS')}
                    />
                    <GuideShortcutButton
                        icon={<HelpCircle size={21} className="text-cyan-200" />}
                        title={guideText('menu.faq.title')}
                        subtitle={guideText('menu.faq.subtitle')}
                        tone="border-cyan-500/20 bg-cyan-950/20 hover:border-cyan-400/45"
                        onClick={() => openMode('FAQ')}
                    />
                </div>

                {recommendedTips.length > 0 && (
                    <div className="rounded-3xl border border-amber-400/20 bg-amber-950/10 p-3">
                        <div className="mb-3 flex items-start justify-between gap-3 px-1">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                                    {guideText('status.heading')}
                                </div>
                                <p className="mt-1 text-[11px] font-semibold leading-relaxed text-zinc-400">{guideText('status.subtitle')}</p>
                            </div>
                            <Sparkles size={17} className="mt-0.5 shrink-0 text-amber-300/70" />
                        </div>
                        <div className="space-y-2">
                            {recommendedTips.map(tip => (
                                <div key={tip.id} className="rounded-2xl border border-zinc-800 bg-black/35 p-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900">{tip.icon}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-black leading-tight text-white">{guideText(tip.titleKey)}</div>
                                            <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-400">{guideText(tip.bodyKey)}</p>
                                        </div>
                                    </div>
                                    {tip.action && (
                                        <div className="mt-3">
                                            <GuideActionButton action={tip.action} guideText={guideText} onOpenApp={onOpenApp} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-zinc-700 bg-black px-3 py-3">
                        <Search size={17} className="shrink-0 text-zinc-500" />
                        <input
                            value={searchQuery}
                            onChange={event => setSearchQuery(event.target.value)}
                            placeholder={guideText('problem.search.placeholder')}
                            className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-600"
                        />
                        {searchQuery && (
                            <button type="button" onClick={() => setSearchQuery('')} className="rounded-full p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    {searchQuery.trim() && (
                        <div className="mt-3 space-y-2">
                            {filteredGuideResults.length > 0 ? filteredGuideResults.map(result => (
                                result.type === 'problem' ? (
                                    <button
                                        key={`problem-${result.problem.id}`}
                                        type="button"
                                        onClick={() => openProblem(result.problem.id)}
                                        className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-black/40 p-3 text-left transition hover:border-zinc-600"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="rounded-xl bg-zinc-800 p-2">{result.problem.icon}</div>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-black text-white">{guideText(result.problem.titleKey)}</div>
                                                <div className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">{guideText('problem.search.type.problem')}</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="shrink-0 text-zinc-500" />
                                    </button>
                                ) : (
                                    <button
                                        key={`${result.section.mode}-${result.section.id}`}
                                        type="button"
                                        onClick={() => openRelatedSection(result.section.mode, result.section.id)}
                                        className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-black/40 p-3 text-left transition hover:border-zinc-600"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="rounded-xl bg-zinc-800 p-2">{result.section.icon}</div>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-black text-white">{guideText(result.section.titleKey)}</div>
                                                <div className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">{guideText(result.section.typeLabelKey)}</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="shrink-0 text-zinc-500" />
                                    </button>
                                )
                            )) : (
                                <div className="rounded-2xl border border-dashed border-zinc-800 p-4 text-center text-xs font-semibold text-zinc-500">
                                    {guideText('problem.search.noResults')}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{guideText('problem.home.heading')}</h3>
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">{guideText('problem.home.tapOne')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {PROBLEM_SOLVERS.map(problem => (
                            <button
                                key={problem.id}
                                type="button"
                                onClick={() => openProblem(problem.id)}
                                className="min-h-[92px] rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-left transition hover:border-zinc-600 hover:bg-zinc-800"
                            >
                                <div className="mb-2 inline-flex rounded-xl bg-black p-2">{problem.icon}</div>
                                <div className="text-sm font-black leading-tight text-white">{guideText(problem.titleKey)}</div>
                                <div className="mt-1 line-clamp-1 text-[10px] font-semibold leading-relaxed text-zinc-500">{guideText(problem.subtitleKey)}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
