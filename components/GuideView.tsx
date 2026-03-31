
import React, { useState } from 'react';
import { Zap, DollarSign, Star, Film, TrendingUp, Heart, Users, ArrowLeft, BookOpen, Crown, Briefcase, Camera, Repeat, ChevronRight, PlayCircle, X, GraduationCap, Activity, Shield, Globe, Map, Smartphone, BarChart3 } from 'lucide-react';

interface GuideViewProps {
    onBack: () => void;
}

type GuideMode = 'MENU' | 'HANDBOOK' | 'WIZARD';

const WIZARD_STEPS = [
    {
        title: "Welcome to Hollywood",
        icon: <Star size={48} className="text-amber-400" />,
        content: "Your goal is simple: become a Legend. But the path is hard. You must balance your Health, Wealth, and Fame while navigating the cutthroat movie industry.",
        color: "bg-zinc-900"
    },
    {
        title: "Energy is Everything",
        icon: <Zap size={48} className="text-yellow-400" />,
        content: "You have 100 Energy per week. Every audition, rehearsal, and social event costs energy. If you run out, you can't work. Don't burnout! Rest or visit the Spa to recover.",
        color: "bg-amber-900/20"
    },
    {
        title: "Getting Cast",
        icon: <Film size={48} className="text-indigo-400" />,
        content: "Use 'CastLink' to find auditions. Your success depends on your 'Talent', 'Genre Proficiency', and 'Preparation'. Rehearsing increases Preparation. Matching the right Outfit Style (Casual/Premium) to the role gives a hidden bonus!",
        color: "bg-indigo-900/20"
    },
    {
        title: "Sponsorships (Important!)",
        icon: <Briefcase size={48} className="text-emerald-400" />,
        content: "Once you sign a Sponsorship deal, you MUST go to the 'Team App' -> 'Active Contracts' and manually click 'Post Ad' or 'Shoot' to fulfill it. If you forget, you lose the contract and pay a fine.",
        color: "bg-emerald-900/20"
    },
    {
        title: "The Box Office",
        icon: <TrendingUp size={48} className="text-blue-400" />,
        content: "Movies stay in theaters for weeks. If a movie is a HIT (ROI > 2.5x), you might get a Sequel offer 4-8 weeks later. Check your Inbox! TV Shows get renewed based on ratings.",
        color: "bg-blue-900/20"
    },
    {
        title: "Lifestyle & Assets",
        icon: <Activity size={48} className="text-rose-400" />,
        content: "Buying expensive Houses and Cars isn't just for show. They improve your 'Reputation' and 'Mood'. A better mood leads to better performances on set.",
        color: "bg-rose-900/20"
    }
];

export const GuideView: React.FC<GuideViewProps> = ({ onBack }) => {
    const [mode, setMode] = useState<GuideMode>('MENU');
    const [wizardStep, setWizardStep] = useState(0);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
                <button onClick={() => setMode('MENU')} className="absolute top-12 right-6 text-zinc-500 hover:text-white z-10 bg-zinc-900 rounded-full p-2"><X size={20} /></button>
                
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

    const renderHandbook = () => {
        const sections = [
            {
                id: 'CAREER',
                title: 'Career & Projects',
                icon: <Film size={18} className="text-indigo-400"/>,
                content: (
                    <div className="space-y-3 text-xs text-zinc-400">
                        <p><strong className="text-white">Auditions:</strong> Found in CastLink. Success depends on Talent, Genre XP, and Preparation (Rehearsing). High-tier roles require better Agents.</p>
                        <p><strong className="text-white">Sequels:</strong> If a movie ROI {'>'} 2.5x, expect a sequel offer in 4-8 weeks. Sequels pay more and boost fame faster.</p>
                        <p><strong className="text-white">TV Series:</strong> Steady income but locks your schedule. Renewals happen immediately after a season ends if ratings are good.</p>
                    </div>
                )
            },
            {
                id: 'FRANCHISE',
                title: 'Cinematic Universes',
                icon: <Globe size={18} className="text-blue-400"/>,
                content: (
                    <div className="space-y-3 text-xs text-zinc-400">
                        <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                            <strong className="text-blue-400 block mb-1">MCU / DCU / Star Wars</strong>
                            Universes operate in Phases. Joining usually requires a <strong>Multi-Picture Contract</strong> (3-6 films).
                        </div>
                        <p><strong className="text-white">Gender Lock:</strong> Some iconic roles are specific (e.g. Iron Man is Male, Black Widow is Female). Star Wars roles are generally flexible.</p>
                        <p><strong className="text-white">Getting In:</strong> You need High Fame (70+) and High Rep (60+) for a direct invite. Or hire a 'Legend' tier Agent to hunt for these roles.</p>
                        <p><strong className="text-white">Cameos:</strong> You may be offered a small cameo role first. Taking it boosts your chances for a lead role later.</p>
                    </div>
                )
            },
            {
                id: 'SOCIAL_MEDIA',
                title: 'Social Media & Fame',
                icon: <Smartphone size={18} className="text-pink-400"/>,
                content: (
                    <div className="space-y-3 text-xs text-zinc-400">
                        <p><strong className="text-white">Fame Decay:</strong> Your fame drops every week if you aren't active. Posting on social media prevents this decay.</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong className="text-white">Instagram:</strong> Visuals. 'BTS' posts (only when filming) give the most engagement. 'Selfies' are quick.</li>
                            <li><strong className="text-white">X (Twitter):</strong> Text based. Viral potential is high but risky. Posting about 'Trending' topics helps reach.</li>
                            <li><strong className="text-white">YouTube:</strong> Long-form content. High energy cost but pays passive revenue if you hit monetization requirements (1k Subs / 4k Views).</li>
                        </ul>
                    </div>
                )
            },
            {
                id: 'BUSINESS',
                title: 'Business Empire',
                icon: <BarChart3 size={18} className="text-emerald-400"/>,
                content: (
                    <div className="space-y-3 text-xs text-zinc-400">
                        <p><strong className="text-white">Service Model (Restaurants/Gyms):</strong> Passive income. Limited by 'Capacity' and 'Staff'. Hire managers to automate efficiency.</p>
                        <p><strong className="text-white">Product Model (Fashion/Merch):</strong> Active income. You must 'Design' products and 'Restock' inventory when it sells out.</p>
                        <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                            <strong className="text-white block mb-1">Marketing & Hype</strong>
                            Every business needs Hype to drive traffic. Hype decays weekly. Use the 'Promo' tab to run ad campaigns and keep demand high.
                        </div>
                    </div>
                )
            },
            {
                id: 'MONEY',
                title: 'Finance & Assets',
                icon: <DollarSign size={18} className="text-amber-400"/>,
                content: (
                    <div className="space-y-3 text-xs text-zinc-400">
                        <p><strong className="text-white">Sponsorships:</strong> Weekly paychecks. Ensure you fulfill the 'Post' or 'Shoot' requirement in the Team App weekly.</p>
                        <p><strong className="text-white">Stocks:</strong> Market fluctuates weekly. Some stocks (like Apple, Coca-Cola) pay dividends every 12 weeks.</p>
                        <p><strong className="text-white">Lifestyle:</strong> Buying luxury homes and cars improves 'Mood' (better acting performance) and 'Reputation' (better casting odds).</p>
                    </div>
                )
            },
            {
                id: 'SOCIAL',
                title: 'Relationships',
                icon: <Users size={18} className="text-purple-400"/>,
                content: (
                    <div className="space-y-3 text-xs text-zinc-400">
                        <p><strong className="text-white">Networking:</strong> Befriending Directors increases the chance of "Direct Offers" where you skip the audition process.</p>
                        <p><strong className="text-white">Dating:</strong> Use the Tinder app (General) or Luxe app (High Net Worth) to find partners. High relationship levels unlock marriage and children.</p>
                        <p><strong className="text-white">Estrangement:</strong> Ignoring family/partners for too long ({'>'}8 weeks) leads to scandals and relationship decay.</p>
                    </div>
                )
            }
        ];

        return (
            <div className="absolute inset-0 z-40 flex flex-col h-full bg-zinc-950 text-white animate-in slide-in-from-right duration-300">
                <div className="p-4 pt-12 border-b border-zinc-800 bg-zinc-900 shrink-0 flex items-center gap-3">
                    <button onClick={() => setMode('MENU')} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="font-bold text-lg flex items-center gap-2">
                        <BookOpen size={20} className="text-amber-500"/> Handbook
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 pb-24">
                    {sections.map(section => (
                        <div key={section.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                            <button 
                                onClick={() => toggleSection(section.id)}
                                className="w-full p-4 flex items-center justify-between hover:bg-zinc-800 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-black rounded-lg">{section.icon}</div>
                                    <span className="font-bold text-sm">{section.title}</span>
                                </div>
                                <ChevronRight size={16} className={`text-zinc-500 transition-transform duration-300 ${expandedSection === section.id ? 'rotate-90' : ''}`}/>
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
    };

    // MAIN MENU
    if (mode === 'MENU') {
        return (
            <div className="absolute inset-0 z-40 flex flex-col h-full bg-zinc-950 text-white font-sans animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-4 pt-12 border-b border-zinc-800 bg-zinc-900 shrink-0 flex items-center gap-3">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="font-bold text-lg flex items-center gap-2">
                        Guide
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 pb-24 custom-scrollbar">
                    <div className="text-center mb-2">
                        <h2 className="text-2xl font-bold text-white mb-2">Player Guide</h2>
                        <p className="text-zinc-400 text-sm">Everything you need to know to succeed.</p>
                    </div>

                    <button onClick={() => setMode('WIZARD')} className="group bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl text-left relative overflow-hidden shadow-xl hover:scale-[1.02] transition-transform">
                        <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-30 transition-opacity"><PlayCircle size={80}/></div>
                        <div className="relative z-10">
                            <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                                <GraduationCap size={24} className="text-white"/>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Start Tutorial</h3>
                            <p className="text-indigo-200 text-xs font-medium">Interactive tour of game mechanics.</p>
                        </div>
                    </button>

                    <button onClick={() => setMode('HANDBOOK')} className="group bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-left relative overflow-hidden hover:border-zinc-600 transition-colors">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><BookOpen size={80}/></div>
                        <div className="relative z-10">
                            <div className="bg-zinc-800 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                                <BookOpen size={24} className="text-zinc-400"/>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Player Handbook</h3>
                            <p className="text-zinc-500 text-xs font-medium">FAQ: Universe Roles, Sequels, Money.</p>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'WIZARD') return renderWizard();
    if (mode === 'HANDBOOK') return renderHandbook();

    return null;
};
