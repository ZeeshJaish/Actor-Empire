import React, { useState } from 'react';
import { Zap, DollarSign, Star, Film, TrendingUp, Users, ArrowLeft, BookOpen, Briefcase, PlayCircle, X, GraduationCap, Activity, Globe, Smartphone, BarChart3, ChevronRight, HelpCircle, Heart, Clapperboard, Landmark, Sparkles, Building2, Clock3 } from 'lucide-react';

interface GuideViewProps {
    onBack: () => void;
}

type GuideMode = 'MENU' | 'HANDBOOK' | 'PLAYBOOKS' | 'FAQ' | 'WIZARD';

type GuideSection = {
    id: string;
    title: string;
    icon: React.ReactNode;
    content: React.ReactNode;
};

const GuideNote: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300 mb-1">{title}</div>
        <div className="text-xs leading-relaxed text-amber-50/80">{children}</div>
    </div>
);

const GuideBullets: React.FC<{ items: string[] }> = ({ items }) => (
    <div className="space-y-2">
        {items.map(item => (
            <div key={item} className="flex gap-2 text-xs text-zinc-400 leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-600 shrink-0" />
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

const WIZARD_STEPS = [
    {
        title: "Welcome to Actor Empire",
        icon: <Star size={48} className="text-amber-400" />,
        content: "You are building a life, not just chasing one role. The best saves balance career, money, fame, relationships, studio power, and long-term planning.",
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
    },
    {
        title: "Connected Stories Need Care",
        icon: <Globe size={48} className="text-blue-400" />,
        content: "Franchises and universes are powerful because characters, cast, sequels, crossovers, and market memory carry forward. Keep identities clean and plan the next move before stacking too many links.",
        color: "bg-blue-900/20"
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
        id: 'DEVELOPMENT_LAB',
        title: 'Development Lab',
        icon: <BookOpen size={18} className="text-amber-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Vault:</strong> your saved scripts and concepts. It is where ideas wait until you are ready to develop, sell, or produce them.</p>
                <p><strong className="text-white">Concept:</strong> where you shape the basics, genre, tone, audience, and story identity. These choices influence the script profile, but the game keeps room for surprise.</p>
                <p><strong className="text-white">Market:</strong> where scripts can be bought or discovered. Pay attention to format, genre, quality, and whether the idea already carries a known subject, franchise, or biopic/documentary hook.</p>
                <GuideNote title="No exact formula">
                    The guide will tell you what matters, not the hidden math. A strong concept usually comes from fit, clarity, and timing rather than chasing one perfect stat.
                </GuideNote>
            </div>
        )
    },
    {
        id: 'SCRIPT_FORMATS',
        title: 'Scripts, Genres & Formats',
        icon: <Film size={18} className="text-pink-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Format is the production shape:</strong> movie or series decides how the project is packaged. Live action, animated feature, and anime film describe how that story is produced and presented.</p>
                <p><strong className="text-white">Genre is the audience promise:</strong> drama, action, biopic, sports, documentary, musical, animation, anime, and similar lanes tell players and the market what kind of experience the project offers.</p>
                <p><strong className="text-white">Primary and secondary genres:</strong> primary genre carries the main identity. Secondary genre adds flavor, but it should support the project instead of confusing it.</p>
                <GuideTagRow tags={['Format = package', 'Genre = promise', 'Tone = feel', 'Audience = reach']} />
            </div>
        )
    },
    {
        id: 'GREENLIGHT',
        title: 'Greenlight Flow',
        icon: <PlayCircle size={18} className="text-emerald-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Greenlight turns a script into a production plan:</strong> you attach director, cast, crew, gear, locations, tone, and final package.</p>
                <p><strong className="text-white">Budget is not just a number:</strong> talent fees, crew quality, production choices, known characters, and scale all push the estimate around.</p>
                <p><strong className="text-white">Negotiation matters:</strong> returning cast, known characters, and bigger names can be powerful, but they still need deals to make the package real.</p>
                <GuideBullets items={[
                    'Use the cast step to lock who plays each role.',
                    'Use connected characters when the story is part of a franchise or universe.',
                    'Use the review step to catch weak spots before committing.'
                ]} />
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
                <p><strong className="text-white">Loans:</strong> borrowed money creates monthly pressure. Pay attention to the balance, scheduled payment, and whether paying it down now protects your future weeks.</p>
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
                <p><strong className="text-white">Character identity matters:</strong> a character should keep its identity across sequels, events, recasts, and crossovers. If you are continuing a story, use existing characters instead of creating duplicates.</p>
                <p><strong className="text-white">Preparation still matters:</strong> high profile roles are easier to reach when your overall career, cast plan, and studio setup are already strong.</p>
            </div>
        )
    },
    {
        id: 'RELEASES_AWARDS',
        title: 'Releases, Streaming & Awards',
        icon: <TrendingUp size={18} className="text-green-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Release life has stages:</strong> a project may move through theatrical performance, streaming interest, library value, awards attention, and long-tail reputation.</p>
                <p><strong className="text-white">Streaming bids:</strong> offers care about project value, audience fit, momentum, and the platform's appetite. The highest-looking number is not always the only thing to consider.</p>
                <p><strong className="text-white">Awards:</strong> awards reward more than popularity. Quality, performance strength, category fit, timing, and industry buzz all help shape awards season.</p>
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

const PLAYBOOK_SECTIONS: GuideSection[] = [
    {
        id: 'EARLY_GAME',
        title: 'Early Game: Build Momentum',
        icon: <Zap size={18} className="text-yellow-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Early saves are about creating options. Do enough acting work to build proof, keep money healthy, and avoid burning every week on one stat.</p>
                <GuideBullets items={[
                    'Take roles that build experience instead of waiting forever for perfect prestige.',
                    'Use spare weeks for skills, relationships, and visibility.',
                    'Avoid lifestyle purchases that look cool but trap your cash flow too early.'
                ]} />
                <GuideNote title="Good instinct">
                    If a choice makes the next ten weeks easier, it is usually better than a flashy move that only looks good this week.
                </GuideNote>
            </div>
        )
    },
    {
        id: 'ACTOR_CAREER',
        title: 'Actor Career: From Work to Leverage',
        icon: <Film size={18} className="text-indigo-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Your career grows through a mix of talent, preparation, public heat, reputation, relationships, and the quality of past work.</p>
                <GuideBullets items={[
                    'Use CastLink for opportunities and Team for the business side of your career.',
                    'Build enough consistency that bigger projects feel earned, not random.',
                    'Think about fit: the right role at the right moment can beat a bigger role that your profile cannot support yet.'
                ]} />
            </div>
        )
    },
    {
        id: 'STUDIO_SLATE',
        title: 'Studio Slate: Develop Like an Owner',
        icon: <Clapperboard size={18} className="text-violet-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>A studio run becomes stronger when you think in slates, not single swings. Mix safer projects, ambitious bets, and long-term IP.</p>
                <GuideBullets items={[
                    'Keep a few scripts ready so you are not forced to greenlight weak ideas.',
                    'Match project scale to your cash, studio strength, and market moment.',
                    'Use past projects and filmography to understand what your studio is becoming known for.'
                ]} />
            </div>
        )
    },
    {
        id: 'UNIVERSE_WORKFLOW',
        title: 'Universe Workflow: Clean Continuity',
        icon: <Globe size={18} className="text-blue-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Universes and franchises work best when the player keeps character identity clean. Returning characters, sequels, crossovers, and events should feel connected instead of duplicated.</p>
                <GuideBullets items={[
                    'For sequels, continue the existing story identity instead of rebuilding the same character from scratch.',
                    'For crossovers, bring in known characters only when the project is meant to connect those worlds.',
                    'For reboots, treat the project as a new era while still respecting that the IP already has history.'
                ]} />
                <GuideNote title="Player-facing rule">
                    If the audience would recognize the character as the same role, link the character. If it is a fresh person or fresh mythology, create new.
                </GuideNote>
            </div>
        )
    },
    {
        id: 'MONEY_RISK',
        title: 'Money & Risk: Stay Liquid',
        icon: <DollarSign size={18} className="text-emerald-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Actor Empire lets you go big, but the game punishes ignoring recurring costs. Loans, production budgets, assets, and business expenses all compete with your next opportunity.</p>
                <GuideBullets items={[
                    'Keep enough cash for several weeks of commitments before taking huge swings.',
                    'Use loans for intentional moves, not as a habit to cover weak planning.',
                    'A smaller project you can finish cleanly often beats a massive one that breaks your balance.'
                ]} />
            </div>
        )
    },
    {
        id: 'SOCIAL_PERSONAL',
        title: 'Social & Personal: Support the Run',
        icon: <Heart size={18} className="text-rose-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Social systems are not only side content. They shape reach, relationships, public image, stress, and the feeling of your character's life.</p>
                <GuideBullets items={[
                    'Use social apps to stay visible, but do not let visibility replace real career progress.',
                    'Relationships improve through consistency, timing, and choosing actions that match the bond.',
                    'Self-improvement is slower than instant fame, but it makes the whole save more stable.'
                ]} />
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
        id: 'FAQ_SCRIPT_QUALITY',
        title: 'Why did my script quality change?',
        icon: <BookOpen size={18} className="text-amber-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Script quality is shaped by the choices you make during development, the creative identity of the project, genre fit, story direction, and how coherent the final package feels. It is not meant to be fully predictable, but better-aligned choices usually create better drafts.</p>
            </div>
        )
    },
    {
        id: 'FAQ_GENRES',
        title: 'What is the difference between format, genre, and tone?',
        icon: <Film size={18} className="text-pink-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p><strong className="text-white">Format</strong> is the package, like movie or series. <strong className="text-white">Genre</strong> is the promise, like sports, biopic, musical, documentary, anime, or drama. <strong className="text-white">Tone</strong> is how the story feels moment to moment.</p>
            </div>
        )
    },
    {
        id: 'FAQ_CONNECTED_CHARACTERS',
        title: 'When should I link a character?',
        icon: <Globe size={18} className="text-blue-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Link a character when the role is meant to be the same identity across projects: a sequel return, crossover, event film, recast, or continuing franchise part. Create new when the person is new to the world or the project is meant to stand alone.</p>
            </div>
        )
    },
    {
        id: 'FAQ_SEQUEL_CAST',
        title: 'Why do sequels care about old cast?',
        icon: <Users size={18} className="text-cyan-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Returning cast helps continuity and audience recognition, but they still need to be brought into the new production properly. A sequel is not just the old movie repeated; it is a new package built on existing history.</p>
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
        id: 'FAQ_LOANS',
        title: 'How should I think about loans?',
        icon: <Landmark size={18} className="text-amber-400" />,
        content: (
            <div className="space-y-3 text-xs text-zinc-400">
                <p>Loans are useful when they unlock a clear move, but the monthly payment keeps affecting your save until the balance is handled. Watch your unpaid balance and pay down debt when it protects future flexibility.</p>
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

    if (mode === 'PLAYBOOKS') {
        return (
            <SectionList
                title="Playbooks"
                subtitle="No-spoiler strategy guidance for building stronger saves without exposing the exact hidden formulas."
                icon={<Activity size={20} className="text-emerald-400" />}
                sections={PLAYBOOK_SECTIONS}
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

                <button onClick={() => openMode('WIZARD')} className="group min-h-[136px] bg-gradient-to-br from-indigo-600 to-purple-700 p-5 rounded-3xl text-left relative overflow-hidden shadow-xl hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-30 transition-opacity"><PlayCircle size={80} /></div>
                    <div className="relative z-10 flex gap-4 items-start">
                        <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm shrink-0">
                            <GraduationCap size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1 leading-tight">Quick Start Tour</h3>
                            <p className="text-indigo-100 text-xs font-medium leading-relaxed">A short guided intro to the game loop, core stats, businesses, and studio play.</p>
                        </div>
                    </div>
                </button>

                <button onClick={() => openMode('HANDBOOK')} className="group min-h-[124px] bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-left relative overflow-hidden hover:border-zinc-600 transition-colors">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><BookOpen size={80} /></div>
                    <div className="relative z-10 flex gap-4 items-start">
                        <div className="bg-zinc-800 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                            <BookOpen size={24} className="text-zinc-300" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1 leading-tight">Handbook</h3>
                            <p className="text-zinc-400 text-xs font-medium leading-relaxed">Where things are, what they do, why they matter, and how to think about them.</p>
                        </div>
                    </div>
                </button>

                <button onClick={() => openMode('PLAYBOOKS')} className="group min-h-[124px] bg-zinc-900 border border-emerald-900/60 p-5 rounded-3xl text-left relative overflow-hidden hover:border-emerald-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={80} /></div>
                    <div className="relative z-10 flex gap-4 items-start">
                        <div className="bg-emerald-950/80 w-12 h-12 rounded-2xl flex items-center justify-center border border-emerald-700/50 shrink-0">
                            <Activity size={24} className="text-emerald-300" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1 leading-tight">Playbooks</h3>
                            <p className="text-zinc-400 text-xs font-medium leading-relaxed">How to think through career, studio, money, and connected-story decisions without spoiling exact outcomes.</p>
                        </div>
                    </div>
                </button>

                <button onClick={() => openMode('FAQ')} className="group min-h-[124px] bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-left relative overflow-hidden hover:border-zinc-600 transition-colors">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><HelpCircle size={80} /></div>
                    <div className="relative z-10 flex gap-4 items-start">
                        <div className="bg-zinc-800 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                            <HelpCircle size={24} className="text-cyan-300" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1 leading-tight">FAQ</h3>
                            <p className="text-zinc-400 text-xs font-medium leading-relaxed">Quick answers to the questions players ask most often.</p>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};
