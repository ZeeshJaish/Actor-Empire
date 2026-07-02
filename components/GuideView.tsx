import React, { useState } from 'react';
import { Zap, DollarSign, Star, Film, TrendingUp, Users, ArrowLeft, BookOpen, Briefcase, PlayCircle, X, GraduationCap, Activity, Globe, Smartphone, BarChart3, ChevronRight, HelpCircle, Heart, Clapperboard, Landmark, Sparkles, Building2, Clock3 } from 'lucide-react';
import { Player } from '../types';
import { getPlayerLanguage, t } from '../services/i18n';

interface GuideViewProps {
    player: Player;
    onBack: () => void;
}

type GuideMode = 'MENU' | 'HANDBOOK' | 'PLAYBOOKS' | 'FAQ' | 'WIZARD';
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

export const GuideView: React.FC<GuideViewProps> = ({ player, onBack }) => {
    const [mode, setMode] = useState<GuideMode>('MENU');
    const [wizardStep, setWizardStep] = useState(0);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const language = getPlayerLanguage(player);
    const menuTitle = t(language, 'guide.menu.title');
    const guideText: Translate = (key, vars) => t(language, `guide.${key}`, vars);

    const openMode = (nextMode: GuideMode) => {
        setExpandedSection(null);
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
            <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900 p-4 pt-12">
                <button onClick={onBack} className="-ml-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2 text-lg font-bold">
                    {menuTitle}
                </div>
            </div>

            <div className="custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto p-6 pb-24">
                <div className="mb-1 text-center">
                    <h2 className="mb-2 text-2xl font-bold text-white">{guideText('menu.heading')}</h2>
                    <p className="text-sm leading-relaxed text-zinc-400">{guideText('menu.subtitle')}</p>
                </div>

                <button onClick={() => openMode('WIZARD')} className="group relative min-h-[136px] overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-5 text-left shadow-xl transition-transform hover:scale-[1.02]">
                    <div className="absolute right-0 top-0 p-6 opacity-20 transition-opacity group-hover:opacity-30"><PlayCircle size={80} /></div>
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                            <GraduationCap size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="mb-1 text-xl font-bold leading-tight text-white">{guideText('menu.quickStart.title')}</h3>
                            <p className="text-xs font-medium leading-relaxed text-indigo-100">{guideText('menu.quickStart.subtitle')}</p>
                        </div>
                    </div>
                </button>

                <button onClick={() => openMode('HANDBOOK')} className="group relative min-h-[124px] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-5 text-left transition-colors hover:border-zinc-600">
                    <div className="absolute right-0 top-0 p-6 opacity-5 transition-opacity group-hover:opacity-10"><BookOpen size={80} /></div>
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-800">
                            <BookOpen size={24} className="text-zinc-300" />
                        </div>
                        <div>
                            <h3 className="mb-1 text-xl font-bold leading-tight text-white">{guideText('menu.handbook.title')}</h3>
                            <p className="text-xs font-medium leading-relaxed text-zinc-400">{guideText('menu.handbook.subtitle')}</p>
                        </div>
                    </div>
                </button>

                <button onClick={() => openMode('PLAYBOOKS')} className="group relative min-h-[124px] overflow-hidden rounded-3xl border border-emerald-900/60 bg-zinc-900 p-5 text-left transition-colors hover:border-emerald-500/50">
                    <div className="absolute right-0 top-0 p-6 opacity-5 transition-opacity group-hover:opacity-10"><Activity size={80} /></div>
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-700/50 bg-emerald-950/80">
                            <Activity size={24} className="text-emerald-300" />
                        </div>
                        <div>
                            <h3 className="mb-1 text-xl font-bold leading-tight text-white">{guideText('menu.playbooks.title')}</h3>
                            <p className="text-xs font-medium leading-relaxed text-zinc-400">{guideText('menu.playbooks.subtitle')}</p>
                        </div>
                    </div>
                </button>

                <button onClick={() => openMode('FAQ')} className="group relative min-h-[124px] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-5 text-left transition-colors hover:border-zinc-600">
                    <div className="absolute right-0 top-0 p-6 opacity-5 transition-opacity group-hover:opacity-10"><HelpCircle size={80} /></div>
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-800">
                            <HelpCircle size={24} className="text-cyan-300" />
                        </div>
                        <div>
                            <h3 className="mb-1 text-xl font-bold leading-tight text-white">{guideText('menu.faq.title')}</h3>
                            <p className="text-xs font-medium leading-relaxed text-zinc-400">{guideText('menu.faq.subtitle')}</p>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};
