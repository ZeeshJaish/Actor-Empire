
import React, { useState } from 'react';
import { Player, NewsCategory } from '../../types';
import { ArrowLeft, Newspaper } from 'lucide-react';

interface NewsAppProps {
  player: Player;
  onBack: () => void;
}

export const NewsApp: React.FC<NewsAppProps> = ({ player, onBack }) => {
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
