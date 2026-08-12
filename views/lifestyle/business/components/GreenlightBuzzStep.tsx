import React from 'react';
import { Film, Sparkles, TrendingUp, Users } from 'lucide-react';
import { type NewsItem, type XPost } from '../../../../types';

interface GreenlightBuzzStepProps {
    buzzItems: Array<{
        type: 'HEADLINE' | 'TWEET' | string;
        data: NewsItem | XPost;
    }>;
    onComplete: () => void;
}

export const GreenlightBuzzStep: React.FC<GreenlightBuzzStepProps> = ({ buzzItems, onComplete }) => (
    <div className="max-w-2xl mx-auto px-4 pt-10 pb-nav-safe-lg animate-in slide-in-from-bottom-4 duration-500 space-y-6">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-4 animate-bounce">
                <Sparkles size={32} />
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Project Greenlit!</h2>
            <p className="text-zinc-400">Production has officially begun. The industry is already talking.</p>
        </div>

        <div className="space-y-4">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-amber-500" /> Early Buzz
            </h3>

            {buzzItems.map((item, index) => {
                if (item.type === 'HEADLINE') {
                    const news = item.data as NewsItem;
                    return (
                        <div key={index} className="bg-zinc-900 border-l-4 border-emerald-500 p-5 rounded-r-xl shadow-lg transform hover:scale-[1.02] transition-transform">
                            <div className="flex justify-between items-start mb-2">
                                <div className="text-[10px] text-emerald-500 font-bold uppercase">Variety • Breaking News</div>
                                <div className="text-[10px] text-zinc-600">Just now</div>
                            </div>
                            <div className="text-white font-bold text-lg leading-tight mb-2">{news.headline}</div>
                            <div className="text-zinc-400 text-xs">{news.subtext}</div>
                        </div>
                    );
                }

                if (item.type === 'TWEET') {
                    const tweet = item.data as XPost;
                    return (
                        <div key={index} className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg transform hover:scale-[1.02] transition-transform">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tweet.isVerified ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                    {tweet.isVerified ? <Film size={14} /> : <Users size={14} />}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-white flex items-center gap-1">
                                        {tweet.authorName}
                                        {tweet.isVerified && <span className="text-blue-400 text-[10px]">✓</span>}
                                    </div>
                                    <div className="text-[10px] text-zinc-500">{tweet.authorHandle} • Just now</div>
                                </div>
                            </div>
                            <div className="text-sm text-zinc-200 mb-3">{tweet.content}</div>
                            <div className="flex gap-6 text-xs text-zinc-500 font-mono">
                                <span className="flex items-center gap-1">💬 {tweet.replies}</span>
                                <span className="flex items-center gap-1">🔁 {tweet.retweets}</span>
                                <span className="flex items-center gap-1">❤️ {tweet.likes}</span>
                            </div>
                        </div>
                    );
                }

                return null;
            })}
        </div>

        <button type="button" onClick={onComplete} className="w-full mt-8 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl transition-all border border-zinc-700 hover:border-zinc-600 shadow-lg">
            Return to Studio
        </button>
    </div>
);
