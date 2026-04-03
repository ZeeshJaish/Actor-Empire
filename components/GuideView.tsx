import React, { useState } from 'react';
import { Zap, DollarSign, Star, Film, TrendingUp, Users, ArrowLeft, BookOpen, Briefcase, PlayCircle, X, GraduationCap, Activity, Globe, Smartphone, BarChart3, ChevronRight, HelpCircle, Heart, Clapperboard, Landmark, Sparkles, Building2, Clock3 } from 'lucide-react';

interface GuideViewProps {
    onBack: () => void;
}

type GuideMode = 'MENU' | 'HANDBOOK' | 'FAQ' | 'WIZARD';

type GuideSection = {
    id: string;
    title: string;
    icon: React.ReactNode;
    content: React.ReactNode;
};

const WIZARD_STEPS = [
    {
        title: "Welcome to Actor Empire",
        icon: <Star size={48} className="text-amber-400" />,
        content: "You are building a life, not just chasing one role. Your strongest runs come from balancing career, money, fame, relationships, and long-term planning.",
        color: "bg-zinc-900"
    },
    {
        title: "Your Weekly Loop",
        icon: <Clock3 size={48} className="text-sky-400" />,
        content: "Each week is a resource puzzle. Spend energy on acting, social growth, business, or personal life, then age up to see the results. Momentum matters more than one perfect week.",
        color: "bg-sky-900/20"
    },
    {
        title: "Build the Career First",
        icon: <Film size={48} className="text-indigo-400" />,
        content: "CastLink, rehearsals, better agents, and strong performances open the entertainment ladder. Early on, steady work and smart role choices usually matter more than chasing only giant projects.",
        color: "bg-indigo-900/20"
    },
    {
        title: "Know What Each Stat Does",
        icon: <Sparkles size={48} className="text-fuchsia-400" />,
        content: "Fame raises your profile. Reputation improves trust and credibility. Followers improve reach and monetization. Money gives you options. None of them fully replaces the others.",
        color: "bg-fuchsia-900/20"
    },
    {
        title: "Businesses Need Management",
        icon: <BarChart3 size={48} className="text-emerald-400" />,
        content: "Businesses do not print money by themselves. Pricing, hype, staffing, stock, and expansion all matter. Product businesses reward active management, while service businesses are steadier.",
        color: "bg-emerald-900/20"
    },
    {
        title: "Production House is a Long Game",
        icon: <Clapperboard size={48} className="text-rose-400" />,
        content: "Your studio shines when you develop strong projects, manage releases, and turn wins into a library. Big payoffs can take time, so think in stages instead of expecting instant results.",
        color: "bg-rose-900/20"
    }
];

const HANDBOOK_SECTIONS: GuideSection[] = [
    {
        id: 'GETTING_STARTED',
        title: 'Getting Started',
        icon: <GraduationCap size={18} className="text-sky-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Your first goal:</strong> create reliable momentum. Small wins in auditions, social activity, and money management usually beat risky all-in plays at the start.</p>
                <p><strong className="text-white">Think week to week:</strong> every decision competes for your time and energy. If you spread yourself too thin, your progress slows everywhere.</p>
                <p><strong className="text-white">Use the phone apps often:</strong> most important systems live there. CastLink grows your career, Team manages contracts, social apps build reach, and Guide helps you understand the rest.</p>
            </div>
        )
    },
    {
        id: 'STATS',
        title: 'Stats Explained',
        icon: <Sparkles size={18} className="text-amber-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Fame:</strong> your public profile. It helps you get seen, land bigger opportunities, and stay culturally relevant.</p>
                <p><strong className="text-white">Reputation:</strong> how seriously the industry takes you. High reputation supports long-term career growth, trust, and better professional outcomes.</p>
                <p><strong className="text-white">Followers:</strong> your social reach. Great for influence, sponsorships, and online growth, but followers alone will not carry an acting career.</p>
                <p><strong className="text-white">Mood and energy:</strong> these shape how much you can do and how strong your weeks feel. A rich account means less if your character is exhausted or unhappy.</p>
            </div>
        )
    },
    {
        id: 'CAREER',
        title: 'Career Flow',
        icon: <Film size={18} className="text-indigo-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">CastLink:</strong> the main place to find work. Better talent, preparation, experience, and representation improve the quality of roles you can compete for.</p>
                <p><strong className="text-white">Preparation matters:</strong> rehearsals and smart role selection help your performances feel more consistent. Strong fits usually outperform random prestige chasing.</p>
                <p><strong className="text-white">Career growth:</strong> early game is about building a record, mid game is about momentum, and late game is about leverage, choice, and legacy.</p>
            </div>
        )
    },
    {
        id: 'WEEKLY_LOOP',
        title: 'Weekly Loop & Energy',
        icon: <Zap size={18} className="text-yellow-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Energy is your weekly fuel:</strong> acting, social moves, business work, and personal actions all draw from it.</p>
                <p><strong className="text-white">Do not waste empty weeks:</strong> if you are waiting on a project, use that time to build fame, relationships, skills, or business progress.</p>
                <p><strong className="text-white">Recovery has value:</strong> sometimes the best move is restoring your character so the next few weeks become stronger and more efficient.</p>
            </div>
        )
    },
    {
        id: 'SOCIAL_MEDIA',
        title: 'Fame, Followers & Social',
        icon: <Smartphone size={18} className="text-pink-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Social media keeps you visible:</strong> posting helps maintain attention and can support your broader entertainment career.</p>
                <p><strong className="text-white">Different platforms do different jobs:</strong> visual content is strong for image, short-form commentary can spike reach, and longer content can become a deeper monetization lane.</p>
                <p><strong className="text-white">Use social with purpose:</strong> not every post needs to chase virality. Sometimes the right move is staying active enough to support your career and brand.</p>
            </div>
        )
    },
    {
        id: 'RELATIONSHIPS',
        title: 'Relationships & Networking',
        icon: <Heart size={18} className="text-rose-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Professional relationships:</strong> directors, agents, managers, and contacts can change the quality of opportunities you see.</p>
                <p><strong className="text-white">Personal relationships:</strong> romance and family are not just flavor. Neglect can create drama, while healthy relationships support a stronger life path.</p>
                <p><strong className="text-white">Networking works best over time:</strong> repeated effort usually beats one expensive gesture.</p>
            </div>
        )
    },
    {
        id: 'BUSINESSES',
        title: 'Businesses',
        icon: <Building2 size={18} className="text-emerald-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Businesses are long-term income engines:</strong> some are stable service businesses, while others are active product businesses that reward hands-on management.</p>
                <p><strong className="text-white">What usually matters:</strong> pricing, quality, hype, staffing, stock, and expansion. If one of those is weak, profits can stall even when another looks strong.</p>
                <p><strong className="text-white">Marketing helps best when the basics are healthy:</strong> ads can bring demand, but they work better when your product, capacity, and setup are already in a good place.</p>
            </div>
        )
    },
    {
        id: 'PRODUCTION_HOUSE',
        title: 'Production House',
        icon: <Clapperboard size={18} className="text-violet-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Think in stages:</strong> development, production, release, and afterlife all matter. A great studio run comes from managing the whole chain well.</p>
                <p><strong className="text-white">Not every project should be rushed:</strong> stronger planning can produce better release outcomes than forcing everything out quickly.</p>
                <p><strong className="text-white">Your library matters:</strong> over time, the studio becomes more valuable when you build a catalog instead of relying on one hit.</p>
            </div>
        )
    },
    {
        id: 'FINANCE',
        title: 'Money, Assets & Lifestyle',
        icon: <Landmark size={18} className="text-amber-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Cash flow matters:</strong> large paydays feel great, but weekly expenses, upkeep, and commitments decide whether your account actually stays healthy.</p>
                <p><strong className="text-white">Assets and lifestyle choices:</strong> these can improve your overall life quality and image, but buying too much too early can slow career progress.</p>
                <p><strong className="text-white">Diversify when possible:</strong> one income stream can carry you for a while, but long runs are safer with multiple pillars.</p>
            </div>
        )
    },
    {
        id: 'UNIVERSES',
        title: 'Franchises & Universes',
        icon: <Globe size={18} className="text-blue-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Big universes are prestige opportunities:</strong> they can open huge visibility, but the road in is usually competitive.</p>
                <p><strong className="text-white">Some roles are stepping stones:</strong> a smaller part, cameo, or supporting appearance can lead to better franchise positioning later.</p>
                <p><strong className="text-white">Preparation still matters:</strong> high profile roles are easier to reach when your overall career is already strong.</p>
            </div>
        )
    },
    {
        id: 'LEGACY',
        title: 'Legacy & Long-Term Play',
        icon: <Users size={18} className="text-cyan-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Actor Empire rewards long saves:</strong> careers rise and fall, businesses mature, and family choices change the shape of your run.</p>
                <p><strong className="text-white">Legacy is about continuity:</strong> your choices now can shape what the next chapter inherits.</p>
                <p><strong className="text-white">The strongest dynasties are balanced:</strong> fame alone is flashy, but legacy usually comes from combining status, wealth, stability, and relationships.</p>
            </div>
        )
    }
];

const FAQ_SECTIONS: GuideSection[] = [
    {
        id: 'FAQ_ROLES',
        title: 'Why am I not getting bigger roles?',
        icon: <Film size={18} className="text-indigo-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Bigger roles usually come from the full picture, not one stat. Improve your talent, reputation, preparation, experience, and representation together. Some doors open faster once your career has more proof behind it.</p>
            </div>
        )
    },
    {
        id: 'FAQ_STATS',
        title: 'What is the difference between fame, followers, and reputation?',
        icon: <Star size={18} className="text-amber-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Fame</strong> is how known you are. <strong className="text-white">Followers</strong> are your social audience. <strong className="text-white">Reputation</strong> is how trusted and respected you are professionally. Strong runs usually build all three.</p>
            </div>
        )
    },
    {
        id: 'FAQ_BUSINESS_MONEY',
        title: 'Why is my business not making much money?',
        icon: <BarChart3 size={18} className="text-emerald-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Check the whole setup, not just one lever. Weak pricing, low hype, poor quality, low stock, limited staff, or too little expansion can all hold a business back. Marketing works best when the rest of the machine is ready to convert demand.</p>
            </div>
        )
    },
    {
        id: 'FAQ_MARKETING',
        title: 'Why does marketing not always explode sales?',
        icon: <TrendingUp size={18} className="text-pink-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Marketing is a booster, not a replacement for fundamentals. It helps create demand, but if your business is understocked, overpriced, under-staffed, or not positioned well, more promo alone will not solve everything.</p>
            </div>
        )
    },
    {
        id: 'FAQ_ENERGY',
        title: 'How do I manage energy better?',
        icon: <Zap size={18} className="text-yellow-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Plan your week around the one or two outcomes that matter most right now. Avoid spending energy everywhere at once. Rest, recovery, and selective focus usually outperform chaotic activity.</p>
            </div>
        )
    },
    {
        id: 'FAQ_SPONSOR',
        title: 'Why did I lose a sponsorship or take a fine?',
        icon: <Briefcase size={18} className="text-emerald-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Active contracts still need follow-through. Once you sign a sponsorship, check the Team app and complete the required action on time. A good deal still fails if you do not fulfill it.</p>
            </div>
        )
    },
    {
        id: 'FAQ_RELATIONSHIP',
        title: 'Why did my relationship get worse?',
        icon: <Heart size={18} className="text-rose-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Relationships need attention over time. Long stretches of neglect can cause strain, especially when your character is heavily focused on career or business. Consistency matters more than one big gesture.</p>
            </div>
        )
    },
    {
        id: 'FAQ_STUDIO',
        title: 'How does the production house really work?',
        icon: <Clapperboard size={18} className="text-violet-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Your studio performs best when the full pipeline is healthy: development, production, release timing, and catalog building. It is usually better to think like an owner managing a slate than like a player looking for one instant jackpot.</p>
            </div>
        )
    },
    {
        id: 'FAQ_STREAMING',
        title: 'Why did my movie leave theaters or move on?',
        icon: <PlayCircle size={18} className="text-blue-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Releases move through stages. A theatrical run does not last forever, and different outcomes can push a title toward the next release phase. Keep watching how your project performs instead of expecting one endless box office window.</p>
            </div>
        )
    },
    {
        id: 'FAQ_LEGACY',
        title: 'How do I keep a save strong for the long term?',
        icon: <Users size={18} className="text-cyan-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Build more than one pillar. Career success, stable money, healthy relationships, and good long-term choices usually produce stronger late-game saves than chasing only one number.</p>
            </div>
        )
    }
];

const SectionList: React.FC<{
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    sections: GuideSection[];
    expandedSection: string | null;
    onToggle: (id: string) => void;
    onBack: () => void;
}> = ({ title, subtitle, icon, sections, expandedSection, onToggle, onBack }) => (
    <div className="absolute inset-0 z-40 flex flex-col h-full bg-zinc-950 text-white animate-in slide-in-from-right duration-300">
        <div className="p-4 pt-12 border-b border-zinc-800 bg-zinc-900 shrink-0 flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div className="font-bold text-lg flex items-center gap-2">
                {icon}
                {title}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 pb-24">
            <div className="px-1 pb-1">
                <p className="text-xs text-zinc-500 leading-relaxed">{subtitle}</p>
            </div>
            {sections.map(section => (
                <div key={section.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => onToggle(section.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-zinc-800 transition-colors text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-black rounded-lg">{section.icon}</div>
                            <span className="font-bold text-sm">{section.title}</span>
                        </div>
                        <ChevronRight size={16} className={`text-zinc-500 transition-transform duration-300 ${expandedSection === section.id ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedSection === section.id && (
                        <div className="p-4 pt-0 border-t border-zinc-800/50 bg-black/20 animate-in slide-in-from-top-2">
                            <div className="mt-4">{section.content}</div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
);

export const GuideView: React.FC<GuideViewProps> = ({ onBack }) => {
    const [mode, setMode] = useState<GuideMode>('MENU');
    const [wizardStep, setWizardStep] = useState(0);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
            <div className="absolute inset-0 z-50 flex flex-col h-full bg-black animate-in fade-in zoom-in-95 duration-300">
                <button onClick={() => setMode('MENU')} className="absolute top-12 right-6 text-zinc-500 hover:text-white z-10 bg-zinc-900 rounded-full p-2">
                    <X size={20} />
                </button>

                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8 overflow-y-auto custom-scrollbar">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center ${step.color} shadow-[0_0_50px_rgba(0,0,0,0.5)] shrink-0`}>
                        {step.icon}
                    </div>
                    <div>
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Step {wizardStep + 1} / {WIZARD_STEPS.length}</div>
                        <h2 className="text-3xl font-bold text-white mb-4">{step.title}</h2>
                        <p className="text-zinc-300 text-sm leading-relaxed max-w-xs mx-auto">{step.content}</p>
                    </div>
                </div>

                <div className="p-6 pb-20 bg-black border-t border-zinc-900 shrink-0">
                    <button onClick={nextStep} className="w-full py-4 bg-white text-black font-bold rounded-2xl shadow-lg hover:bg-zinc-200 transition-colors">
                        {wizardStep === WIZARD_STEPS.length - 1 ? 'Finish Tour' : 'Next'}
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
                title="Handbook"
                subtitle="A plain-language reference for how the game works, what each system is for, and when to care about it."
                icon={<BookOpen size={20} className="text-amber-500" />}
                sections={HANDBOOK_SECTIONS}
                expandedSection={expandedSection}
                onToggle={toggleSection}
                onBack={() => setMode('MENU')}
            />
        );
    }

    if (mode === 'FAQ') {
        return (
            <SectionList
                title="FAQ"
                subtitle="Quick answers to the most common player questions without spoiling the hidden formulas behind the systems."
                icon={<HelpCircle size={20} className="text-cyan-400" />}
                sections={FAQ_SECTIONS}
                expandedSection={expandedSection}
                onToggle={toggleSection}
                onBack={() => setMode('MENU')}
            />
        );
    }

    return (
        <div className="absolute inset-0 z-40 flex flex-col h-full bg-zinc-950 text-white font-sans animate-in slide-in-from-right duration-300">
            <div className="p-4 pt-12 border-b border-zinc-800 bg-zinc-900 shrink-0 flex items-center gap-3">
                <button onClick={onBack} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="font-bold text-lg flex items-center gap-2">
                    Guide
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 pb-24 custom-scrollbar">
                <div className="text-center mb-1">
                    <h2 className="text-2xl font-bold text-white mb-2">Player Guide</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed">Learn the game faster, understand what each system is doing, and find answers without hunting through random screens.</p>
                </div>

                <button onClick={() => openMode('WIZARD')} className="group bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl text-left relative overflow-hidden shadow-xl hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-30 transition-opacity"><PlayCircle size={80} /></div>
                    <div className="relative z-10">
                        <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                            <GraduationCap size={24} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Quick Start Tour</h3>
                        <p className="text-indigo-200 text-xs font-medium">A short guided intro to the game loop, core stats, businesses, and studio play.</p>
                    </div>
                </button>

                <button onClick={() => openMode('HANDBOOK')} className="group bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-left relative overflow-hidden hover:border-zinc-600 transition-colors">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><BookOpen size={80} /></div>
                    <div className="relative z-10">
                        <div className="bg-zinc-800 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                            <BookOpen size={24} className="text-zinc-300" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Handbook</h3>
                        <p className="text-zinc-400 text-xs font-medium">Where things are, what they do, why they matter, and how to think about them.</p>
                    </div>
                </button>

                <button onClick={() => openMode('FAQ')} className="group bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-left relative overflow-hidden hover:border-zinc-600 transition-colors">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><HelpCircle size={80} /></div>
                    <div className="relative z-10">
                        <div className="bg-zinc-800 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                            <HelpCircle size={24} className="text-cyan-300" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">FAQ</h3>
                        <p className="text-zinc-400 text-xs font-medium">Quick answers to the questions players ask most often.</p>
                    </div>
                </button>
            </div>
        </div>
    );
};
