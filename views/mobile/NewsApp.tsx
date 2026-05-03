import React, { useState } from 'react';
import { Player, NewsCategory, NewsItem } from '../../types';
import { ArrowLeft, BarChart3, BriefcaseBusiness, ChevronRight, Clapperboard, Flame, Newspaper, Radio, Search, Sparkles, UserRound } from 'lucide-react';

interface NewsAppProps {
  player: Player;
  onBack: () => void;
}

type NewsViewTab = 'TOP' | 'YOU' | 'INDUSTRY' | 'PROJECTS';

const USE_LEGACY_NEWS_UI = true;

const tabConfig: { id: NewsViewTab; label: string; icon: React.ReactNode }[] = [
  { id: 'TOP', label: 'Top', icon: <Flame size={15} /> },
  { id: 'YOU', label: 'You', icon: <UserRound size={15} /> },
  { id: 'INDUSTRY', label: 'Industry', icon: <BriefcaseBusiness size={15} /> },
  { id: 'PROJECTS', label: 'Projects', icon: <Clapperboard size={15} /> },
];

const impactTone: Record<NewsItem['impactLevel'], { label: string; className: string; glow: string }> = {
  HIGH: { label: 'Breaking', className: 'text-rose-100 bg-rose-500/20 border-rose-400/40', glow: 'from-rose-500/35 via-red-500/10' },
  MEDIUM: { label: 'Trending', className: 'text-amber-100 bg-amber-500/15 border-amber-400/35', glow: 'from-amber-500/30 via-orange-500/10' },
  LOW: { label: 'Industry', className: 'text-zinc-300 bg-white/5 border-white/10', glow: 'from-white/10 via-white/5' },
};

const isProjectStory = (item: NewsItem) => {
  const text = `${item.headline} ${item.subtext || ''}`.toLowerCase();
  return item.category === 'UNIVERSE'
    || /project|studio|greenlight|production|box office|opening|weekend|sequel|franchise|universe|streaming|netflix|hulu|youtube|apple|disney|release|critics|audience|season/.test(text);
};

const getFilteredNews = (items: NewsItem[], tab: NewsViewTab) => {
  if (tab === 'TOP') return items.filter(n => n.category === 'TOP_STORY');
  if (tab === 'YOU') return items.filter(n => n.category === 'YOU');
  if (tab === 'INDUSTRY') return items.filter(n => n.category === 'INDUSTRY');
  return items.filter(isProjectStory);
};

const getSource = (item: NewsItem) => {
  const text = `${item.headline} ${item.subtext || ''}`.toLowerCase();
  if (/forbes|wealth|rank|rich/.test(text)) return 'Forbes Desk';
  if (/box office|opening|weekend|gross|audience/.test(text)) return 'Box Office Daily';
  if (/scandal|backlash|controversy|brands distance|caught/.test(text)) return 'PopWire';
  if (/legal|court|audit|case|verdict/.test(text)) return 'Court Watch';
  if (/award|oscar|emmy|bafta|globes|nomination|snub/.test(text)) return 'Awards Room';
  if (/streaming|netflix|hulu|youtube|apple|disney/.test(text)) return 'StreamWatch';
  if (/sequel|franchise|universe|phase|saga/.test(text)) return 'Franchise Wire';
  if (/casting|attached|role|cast/.test(text)) return 'Casting Desk';
  if (item.category === 'YOU') return 'Your Camp';
  return 'The Trade';
};

const getTags = (item: NewsItem, player: Player) => {
  const text = `${item.headline} ${item.subtext || ''}`.toLowerCase();
  const tags: string[] = [];

  if (item.category === 'YOU' || text.includes(player.name.toLowerCase())) tags.push('You');
  if (item.impactLevel === 'HIGH') tags.push('High impact');
  if (/scandal|legal|court|backlash|controversy|audit/.test(text)) tags.push('Risk');
  if (/box office|gross|opening|weekend|audience|critics/.test(text)) tags.push('Audience');
  if (/streaming|netflix|hulu|youtube|apple|disney/.test(text)) tags.push('Streaming');
  if (/award|oscar|emmy|bafta|globes|nomination|snub/.test(text)) tags.push('Awards');
  if (/studio|greenlight|production|venture|banner/.test(text)) tags.push('Studio');
  if (/sequel|franchise|universe|phase|saga/.test(text)) tags.push('Franchise');

  return tags.slice(0, 3);
};

const getWhyItMatters = (item: NewsItem, player: Player) => {
  const text = `${item.headline} ${item.subtext || ''}`.toLowerCase();
  if (item.category === 'YOU' || text.includes(player.name.toLowerCase())) return 'This directly shapes your public image, offers, and future leverage.';
  if (/scandal|legal|court|backlash|controversy|audit/.test(text)) return 'Risk stories can raise heat, shake brand confidence, and change how teams approach you.';
  if (/streaming|netflix|hulu|youtube|apple|disney/.test(text)) return 'Streaming momentum can change bidding appetite and platform competition.';
  if (/box office|gross|opening|weekend|audience|critics/.test(text)) return 'Performance stories shift market confidence, sequels, and studio behavior.';
  if (/award|oscar|emmy|bafta|globes|nomination|snub/.test(text)) return 'Awards chatter can lift prestige, demand, and high-quality role access.';
  if (/sequel|franchise|universe|phase|saga/.test(text)) return 'Franchise movement can open returning roles, spin-offs, and bigger negotiations.';
  if (/studio|greenlight|production|venture|banner/.test(text)) return 'Studio movement changes competition, project supply, and deal pressure.';
  return 'A market signal worth watching. It may affect the next few weeks of industry behavior.';
};

const getImpactChips = (item: NewsItem) => {
  const text = `${item.headline} ${item.subtext || ''}`.toLowerCase();
  const chips: { label: string; value: string; className: string }[] = [];

  if (item.impactLevel === 'HIGH') chips.push({ label: 'Heat', value: 'High', className: 'text-rose-300' });
  if (/box office|gross|opening|weekend/.test(text)) chips.push({ label: 'Market', value: 'Moving', className: 'text-emerald-300' });
  if (/streaming|netflix|hulu|youtube|apple|disney/.test(text)) chips.push({ label: 'Bids', value: 'Watch', className: 'text-sky-300' });
  if (/award|oscar|emmy|bafta|globes|nomination/.test(text)) chips.push({ label: 'Prestige', value: '+', className: 'text-amber-300' });
  if (/scandal|legal|court|backlash|controversy/.test(text)) chips.push({ label: 'Risk', value: 'Active', className: 'text-red-300' });
  if (/sequel|franchise|universe|phase|saga/.test(text)) chips.push({ label: 'Future', value: 'Open', className: 'text-violet-300' });

  return chips.length > 0 ? chips.slice(0, 3) : [{ label: 'Signal', value: item.impactLevel === 'LOW' ? 'Low' : 'Live', className: 'text-zinc-300' }];
};

const getOutletAccent = (item: NewsItem) => {
  const text = `${item.headline} ${item.subtext || ''}`.toLowerCase();
  if (/scandal|legal|court|backlash|controversy/.test(text)) return 'from-rose-500 to-orange-500';
  if (/streaming|netflix|hulu|youtube|apple|disney/.test(text)) return 'from-sky-400 to-emerald-400';
  if (/award|oscar|emmy|bafta|globes|nomination/.test(text)) return 'from-amber-300 to-yellow-600';
  if (/sequel|franchise|universe|phase|saga/.test(text)) return 'from-violet-400 to-fuchsia-500';
  if (item.category === 'YOU') return 'from-emerald-400 to-teal-500';
  return 'from-red-500 to-orange-500';
};

const NewsCard: React.FC<{
  item: NewsItem;
  player: Player;
  featured?: boolean;
  onOpen: (item: NewsItem) => void;
}> = ({ item, player, featured, onOpen }) => {
  const tone = impactTone[item.impactLevel];
  const tags = getTags(item, player);
  const chips = getImpactChips(item);

  return (
    <button
      onClick={() => onOpen(item)}
      className={`w-full text-left rounded-[2rem] border border-white/10 bg-zinc-950/80 overflow-hidden relative ${featured ? 'p-5 shadow-[0_0_40px_rgba(239,68,68,0.12)]' : 'p-4'} active:scale-[0.99] transition-transform`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${getOutletAccent(item)}`} />
      <div className={`absolute inset-0 bg-gradient-to-br ${tone.glow} to-transparent opacity-40 pointer-events-none`} />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
              <Radio size={12} className="text-red-400" />
              <span className="truncate">{getSource(item)}</span>
            </div>
            <div className={`mt-2 inline-flex border px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${tone.className}`}>
              {tone.label}
            </div>
          </div>
          <ChevronRight size={18} className="text-zinc-600 shrink-0 mt-1" />
        </div>

        <h3 className={`${featured ? 'text-3xl leading-[0.95]' : 'text-xl leading-tight'} font-black text-white tracking-tight`}>
          {item.headline}
        </h3>
        {item.subtext && (
          <p className={`${featured ? 'text-sm' : 'text-xs'} mt-3 text-zinc-400 font-sans leading-relaxed line-clamp-3`}>
            {item.subtext}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map(tag => (
            <span key={tag} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-300">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {chips.map(chip => (
            <div key={chip.label} className="rounded-2xl bg-black/50 border border-white/10 p-2 min-w-0">
              <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600 truncate">{chip.label}</div>
              <div className={`text-sm font-black mt-0.5 ${chip.className}`}>{chip.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-600">
          <span>Week {item.week}</span>
          <span>Age {item.year}</span>
        </div>
      </div>
    </button>
  );
};

const StoryDetail: React.FC<{
  item: NewsItem;
  player: Player;
  onClose: () => void;
}> = ({ item, player, onClose }) => {
  const chips = getImpactChips(item);
  const tags = getTags(item, player);

  return (
    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end">
      <div className="w-full max-h-[86%] overflow-y-auto custom-scrollbar rounded-t-[2.2rem] border-t border-white/15 bg-zinc-950 shadow-2xl">
        <div className={`h-1.5 bg-gradient-to-r ${getOutletAccent(item)}`} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-red-400">{getSource(item)}</div>
              <h2 className="mt-3 text-3xl font-black leading-[0.95] text-white tracking-tight">{item.headline}</h2>
            </div>
            <button onClick={onClose} className="shrink-0 px-4 py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest">
              Close
            </button>
          </div>

          {item.subtext && <p className="mt-5 text-base leading-relaxed font-sans text-zinc-300">{item.subtext}</p>}

          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
              <Search size={13} /> Why It Matters
            </div>
            <p className="mt-3 text-sm leading-relaxed font-sans text-zinc-300">{getWhyItMatters(item, player)}</p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {chips.map(chip => (
              <div key={chip.label} className="rounded-2xl bg-black border border-white/10 p-3">
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{chip.label}</div>
                <div className={`text-lg font-black mt-1 ${chip.className}`}>{chip.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map(tag => (
              <span key={tag} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-6 text-[10px] font-black uppercase tracking-widest text-zinc-600 flex items-center justify-between">
            <span>Week {item.week}</span>
            <span>Age {item.year}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const NewsAppLegacy: React.FC<NewsAppProps> = ({ player, onBack }) => {
  const [tab, setTab] = useState<NewsCategory>('TOP_STORY');
  const newsItems = player.news || [];
  const filteredNews = newsItems.filter(n => n.category === tab);

  return (
    <div className="absolute inset-0 bg-zinc-950 flex flex-col z-40 text-white font-serif animate-in slide-in-from-right duration-300">
        <div className="bg-red-700 p-4 pt-12 pb-3 shadow-lg flex items-center justify-between shrink-0 relative overflow-hidden">
            <button onClick={onBack} className="p-1 rounded-full bg-black/20 hover:bg-black/30 text-white relative z-10"><ArrowLeft size={18} /></button>
            <div className="flex flex-col items-center relative z-10"><h2 className="text-3xl font-black tracking-tighter uppercase leading-none">The Trade</h2><span className="text-[9px] tracking-[0.2em] font-sans opacity-80 uppercase">Hollywood's Daily</span></div>
            <div className="w-8"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-black/20"></div>
        </div>

        <div className="flex border-b border-zinc-800 bg-zinc-900 font-sans">
            <button onClick={() => setTab('TOP_STORY')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${tab === 'TOP_STORY' ? 'text-red-500 border-b-2 border-red-500 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}>Top Stories</button>
            <button onClick={() => setTab('INDUSTRY')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${tab === 'INDUSTRY' ? 'text-red-500 border-b-2 border-red-500 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}>Industry</button>
            <button onClick={() => setTab('YOU')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${tab === 'YOU' ? 'text-red-500 border-b-2 border-red-500 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}>You</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 p-0">
            {filteredNews.length === 0 ? <div className="p-8 text-center text-zinc-600 font-sans text-sm">No news available this week.</div> : (
                <div className="divide-y divide-zinc-900">
                    {filteredNews.map((item, idx) => (
                        <div key={item.id} className={`p-4 ${idx === 0 && tab === 'TOP_STORY' ? 'bg-zinc-900 pb-6' : ''}`}>
                            {idx === 0 && tab === 'TOP_STORY' && <div className="mb-2"><span className="bg-red-600 text-white text-[9px] font-sans font-bold px-2 py-0.5 rounded uppercase mb-2 inline-block">Breaking</span></div>}
                            <div className="flex justify-between items-start mb-1"><h3 className={`${idx === 0 && tab === 'TOP_STORY' ? 'text-2xl leading-tight' : 'text-lg leading-snug'} font-bold text-zinc-100`}>{item.headline}</h3></div>
                            {item.subtext && <p className={`text-zinc-400 font-sans ${idx === 0 && tab === 'TOP_STORY' ? 'text-sm mt-2' : 'text-xs mt-1'}`}>{item.subtext}</p>}
                            <div className="flex items-center gap-2 mt-3"><span className="text-[10px] text-zinc-600 font-sans uppercase">Wk {item.week} • Year {item.year}</span></div>
                        </div>
                    ))}
                </div>
            )}
            <div className="p-8 text-center border-t border-zinc-900 mt-4"><div className="text-zinc-700 font-serif italic text-lg opacity-30">The Trade</div><div className="text-[10px] text-zinc-800 font-sans mt-1 uppercase tracking-widest">End of Feed</div></div>
        </div>
        <div className="absolute bottom-1 left-0 right-0 flex justify-center pb-2 z-50 pointer-events-none"><div className="w-32 h-1 bg-white/20 rounded-full"></div></div>
    </div>
  );
};

export const NewsApp: React.FC<NewsAppProps> = ({ player, onBack }) => {
  const [tab, setTab] = useState<NewsViewTab>('TOP');
  const [selectedStory, setSelectedStory] = useState<NewsItem | null>(null);
  const newsItems = player.news || [];
  const filteredNews = getFilteredNews(newsItems, tab);
  const featured = filteredNews[0];
  const remaining = filteredNews.slice(1);
  const breakingCount = newsItems.filter(n => n.impactLevel === 'HIGH').length;

  if (USE_LEGACY_NEWS_UI) return <NewsAppLegacy player={player} onBack={onBack} />;

  return (
    <div className="absolute inset-0 bg-black flex flex-col z-40 text-white font-sans animate-in slide-in-from-right duration-300 overflow-hidden">
      <div className="shrink-0 relative overflow-hidden border-b border-white/10 bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.28),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.12),transparent_42%)]" />
        <div className="relative z-10 p-4 pt-12 pb-4 flex items-center justify-between">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="font-serif italic text-4xl font-black tracking-[0.16em] leading-none">TRADE</h2>
            <div className="mt-1 text-[9px] tracking-[0.35em] font-black uppercase text-zinc-500">Industry Intelligence</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-400/20 flex items-center justify-center text-red-300">
            <Newspaper size={19} />
          </div>
        </div>

        <div className="relative z-10 px-4 pb-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-black/50 border border-white/10 p-3">
            <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Stories</div>
            <div className="text-xl font-black mt-1">{newsItems.length}</div>
          </div>
          <div className="rounded-2xl bg-black/50 border border-white/10 p-3">
            <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Breaking</div>
            <div className="text-xl font-black mt-1 text-red-300">{breakingCount}</div>
          </div>
          <div className="rounded-2xl bg-black/50 border border-white/10 p-3">
            <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Week</div>
            <div className="text-xl font-black mt-1">{player.currentWeek}</div>
          </div>
        </div>

        <div className="relative z-10 px-4 pb-3 overflow-x-auto custom-scrollbar">
          <div className="flex gap-2 min-w-max">
            {tabConfig.map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`px-4 py-3 rounded-2xl border flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors ${tab === item.id ? 'bg-white text-black border-white' : 'bg-white/[0.04] text-zinc-500 border-white/10'}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 pb-10">
        {featured ? (
          <>
            <div>
              <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600">
                <BarChart3 size={13} />
                Lead Signal
              </div>
              <NewsCard item={featured} player={player} featured onOpen={setSelectedStory} />
            </div>

            {remaining.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600">
                  <Sparkles size={13} />
                  More Signals
                </div>
                {remaining.map(item => (
                  <NewsCard key={item.id} item={item} player={player} onOpen={setSelectedStory} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
              <Newspaper size={28} />
            </div>
            <h3 className="mt-5 text-2xl font-black text-white">Quiet News Cycle</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              No stories in this lane yet. Advance a week, release a project, or trigger industry movement.
            </p>
          </div>
        )}

        <div className="pt-4 text-center border-t border-white/10">
          <div className="font-serif italic text-2xl text-zinc-800">The Trade</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-800">End of Intelligence Feed</div>
        </div>
      </div>

      <div className="absolute bottom-1 left-0 right-0 flex justify-center pb-2 z-40 pointer-events-none">
        <div className="w-32 h-1 bg-white/20 rounded-full" />
      </div>

      {selectedStory && (
        <StoryDetail item={selectedStory} player={player} onClose={() => setSelectedStory(null)} />
      )}
    </div>
  );
};
