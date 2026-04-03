
import React, { useState, useMemo } from 'react';
import { Player, YoutubeVideo, YoutubeVideoType } from '../../types';
import { generateYoutubeFeed } from '../../services/youtubeLogic';
import { spendPlayerEnergy } from '../../services/premiumLogic';
import { ArrowLeft, Play, TrendingUp, DollarSign, Users, Plus, Lock, Home, Layout, Search, Bell, MonitorPlay } from 'lucide-react';

interface YoutubeAppProps {
  player: Player;
  onBack: () => void;
  onUpdatePlayer: (p: Player) => void;
}

const VIDEO_TYPES: { type: YoutubeVideoType, label: string, cost: number, energy: number }[] = [
    { type: 'VLOG', label: 'Daily Vlog', cost: 0, energy: 15 },
    { type: 'SKIT', label: 'Comedy Skit', cost: 50, energy: 25 },
    { type: 'Q_AND_A', label: 'Q&A', cost: 0, energy: 10 },
    { type: 'TRAILER', label: 'Project Teaser', cost: 0, energy: 20 },
    { type: 'COVER', label: 'Song Cover', cost: 20, energy: 20 },
    { type: 'STORYTIME', label: 'Storytime', cost: 0, energy: 15 },
];

export const YoutubeApp: React.FC<YoutubeAppProps> = ({ player, onBack, onUpdatePlayer }) => {
    const [activeTab, setActiveTab] = useState<'HOME' | 'STUDIO'>('HOME');
    const [view, setView] = useState<'MAIN' | 'UPLOAD'>('MAIN');
    
    // Upload State
    const [title, setTitle] = useState('');
    const [selectedType, setSelectedType] = useState<YoutubeVideoType>('VLOG');

    const channel = player.youtube;

    // Generate feed once on mount
    const homeFeed = useMemo(() => generateYoutubeFeed(player), []);

    const formatNumber = (num: number) => {
        if (!isFinite(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return Math.floor(num).toLocaleString();
    };

    const handleUpload = () => {
        if (!title.trim()) return;
        
        const typeConfig = VIDEO_TYPES.find(t => t.type === selectedType);
        if (!typeConfig) return;

        if (player.energy.current < typeConfig.energy) {
            alert("Not enough energy!");
            return;
        }
        if (player.money < typeConfig.cost) {
            alert("Not enough money!");
            return;
        }

        // Calculate Quality based on skills
        const improv = player.stats.skills.improvisation || 0;
        const charisma = player.stats.skills.charisma || 0;
        const baseQuality = (improv + charisma) / 2;
        const variance = Math.random() * 20;
        const qualityScore = Math.min(100, baseQuality + variance);

        // Assign a random color for the thumbnail from a preset list
        const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500'];
        const thumbnailColor = colors[Math.floor(Math.random() * colors.length)];

        const newVideo: YoutubeVideo = {
            id: `vid_${Date.now()}`,
            title: title,
            type: selectedType,
            thumbnailColor: thumbnailColor, 
            views: 0,
            likes: 0,
            earnings: 0,
            weekUploaded: player.currentWeek,
            yearUploaded: player.age, // Added to prevent age calculation bugs across years
            isPlayer: true,
            authorName: player.name,
            qualityScore: qualityScore,
            weeklyHistory: [],
            comments: []
        };

        const updatedChannel = {
            ...channel,
            videos: [newVideo, ...channel.videos]
        };

        const nextPlayer = {
            ...player,
            money: player.money - typeConfig.cost,
            youtube: updatedChannel,
            logs: [...player.logs, { week: player.currentWeek, year: player.age, message: `Uploaded video: ${title}`, type: 'neutral' }]
        };
        spendPlayerEnergy(nextPlayer, typeConfig.energy);
        onUpdatePlayer(nextPlayer);

        setView('MAIN');
        setTitle('');
        setActiveTab('STUDIO'); // Switch to studio to see new video
    };

    const VideoCard: React.FC<{ video: YoutubeVideo }> = ({ video }) => (
        <div className="mb-6 group cursor-pointer">
            {/* Thumbnail */}
            <div className={`w-full aspect-video ${video.thumbnailColor} rounded-xl relative mb-3 flex flex-col items-center justify-center overflow-hidden shadow-sm`}>
                
                {/* Background Pattern/Overlay */}
                <div className="absolute inset-0 bg-black/10"></div>
                
                {/* Center Format Text */}
                <div className="relative z-10 text-center transform group-hover:scale-105 transition-transform duration-300">
                    <span className="block text-white/90 font-black text-3xl uppercase tracking-tighter drop-shadow-lg scale-y-110">
                        {video.type.replace(/_/g, ' ')}
                    </span>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded">12:34</div>
            </div>
            {/* Meta */}
            <div className="flex gap-3 px-1">
                <div className={`w-10 h-10 rounded-full ${video.isPlayer ? 'bg-indigo-500' : 'bg-zinc-700'} flex items-center justify-center font-bold text-white text-sm border-2 border-zinc-900`}>
                    {video.authorName[0]}
                </div>
                <div className="flex-1">
                    <div className="font-bold text-sm text-white leading-tight mb-1 line-clamp-2 group-hover:text-red-500 transition-colors">{video.title}</div>
                    <div className="text-xs text-zinc-400">
                        {video.authorName} • {formatNumber(video.views)} views • {player.currentWeek - video.weekUploaded === 0 ? 'Just now' : `${player.currentWeek - video.weekUploaded}w ago`}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="absolute inset-0 bg-zinc-950 flex flex-col z-40 text-white animate-in slide-in-from-right duration-300 font-sans">
            
            {/* Header */}
            {view === 'MAIN' && (
                <div className="p-4 pt-12 border-b border-zinc-900 bg-zinc-950 flex justify-between items-center z-10 sticky top-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-600 p-1.5 rounded-lg"><Play size={16} fill="white" className="text-white"/></div>
                        <span className="font-bold text-lg tracking-tight font-sans">YouTube</span>
                    </div>
                    <div className="flex gap-4 text-white">
                        <Search size={20}/>
                        <Bell size={20}/>
                        <button onClick={onBack} className="bg-zinc-800 p-1 rounded-full"><ArrowLeft size={16}/></button>
                    </div>
                </div>
            )}

            {/* UPLOAD VIEW (Overlay) */}
            {view === 'UPLOAD' && (
                <div className="absolute inset-0 flex flex-col bg-zinc-900 z-50 animate-in slide-in-from-bottom duration-300">
                    <div className="p-4 pt-12 border-b border-zinc-800 flex items-center gap-4 bg-zinc-900 shrink-0">
                        <button onClick={() => setView('MAIN')} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full"><ArrowLeft size={20}/></button>
                        <h2 className="font-bold text-lg">Upload Video</h2>
                    </div>
                    
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                        
                        {/* Preview Section */}
                        <div className="mb-8">
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-3">Preview</label>
                            <div className="w-full aspect-video bg-zinc-800 rounded-xl flex items-center justify-center relative overflow-hidden shadow-lg border border-zinc-700">
                                <div className="absolute inset-0 bg-gradient-to-tr from-red-600 to-orange-600 opacity-80"></div>
                                <div className="relative z-10 text-center">
                                    <span className="block text-white font-black text-4xl uppercase tracking-tighter drop-shadow-xl scale-y-110">
                                        {selectedType.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className="absolute bottom-3 right-3 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded">12:34</div>
                            </div>
                            <div className="mt-3 px-1">
                                <div className="font-bold text-white text-base leading-tight">{title || "Your Video Title Here..."}</div>
                                <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                    <div className="w-4 h-4 bg-indigo-500 rounded-full"></div> {player.name}
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Video Title</label>
                            <input 
                                type="text" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter a catchy title..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:border-red-600 focus:outline-none text-lg font-bold placeholder:font-normal placeholder:text-zinc-700"
                            />
                        </div>

                        <div className="mb-8">
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-3">Content Format</label>
                            <div className="grid grid-cols-2 gap-3">
                                {VIDEO_TYPES.map(vt => (
                                    <button 
                                        key={vt.type}
                                        onClick={() => setSelectedType(vt.type)}
                                        className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${selectedType === vt.type ? 'bg-white text-black border-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
                                    >
                                        <div className="relative z-10">
                                            <div className="font-black text-sm uppercase tracking-wide mb-1">{vt.label}</div>
                                            <div className={`text-[10px] font-mono ${selectedType === vt.type ? 'text-zinc-500' : 'opacity-50'}`}>-{vt.energy}E • ${vt.cost}</div>
                                        </div>
                                        {selectedType === vt.type && <div className="absolute right-3 top-3 text-emerald-500"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6 flex items-start gap-3">
                            <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400"><TrendingUp size={16}/></div>
                            <div>
                                <div className="text-xs font-bold text-white mb-1">Projected Growth</div>
                                <div className="text-[10px] text-zinc-500">Video performance scales with your <span className="text-indigo-400">Improv</span> & <span className="text-indigo-400">Charisma</span> skills. High quality videos gain more passive views over time.</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 pb-8 border-t border-zinc-800 bg-zinc-950 shrink-0">
                        <button 
                            onClick={handleUpload}
                            disabled={!title.trim()}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                        >
                            <MonitorPlay size={20} /> Publish Video
                        </button>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            {view === 'MAIN' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-20 bg-zinc-950">
                    
                    {/* --- HOME TAB --- */}
                    {activeTab === 'HOME' && (
                        <div>
                            {/* Categories */}
                            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                                <button className="bg-white text-black px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">All</button>
                                <button className="bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">Acting</button>
                                <button className="bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">Vlogs</button>
                                <button className="bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">Gaming</button>
                            </div>

                            {/* Feed */}
                            <div className="space-y-2">
                                {homeFeed.map(v => <VideoCard key={v.id} video={v} />)}
                            </div>
                        </div>
                    )}

                    {/* --- STUDIO TAB --- */}
                    {activeTab === 'STUDIO' && (
                        <div>
                            {/* Channel Header */}
                            <div className="flex items-center gap-4 mb-6 pt-2">
                                <div className="w-20 h-20 rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700 relative">
                                    <img src={player.avatar} className="w-full h-full object-cover"/>
                                    <div className="absolute inset-0 bg-black/10"></div>
                                </div>
                                <div>
                                    <div className="font-bold text-xl">{channel.handle}</div>
                                    <div className="text-zinc-400 text-sm mb-2">{formatNumber(channel.subscribers)} subscribers</div>
                                    <button className="bg-zinc-900 text-xs font-bold px-3 py-1 rounded-lg border border-zinc-800 text-zinc-300">Edit Channel</button>
                                </div>
                            </div>

                            {/* Dashboard Stats */}
                            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-6">
                                <h3 className="font-bold text-sm mb-3">Analytics (Lifetime)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-1">Views</div>
                                        <div className="text-lg font-mono font-bold">{formatNumber(channel.totalChannelViews || 0)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-1">Revenue</div>
                                        <div className="text-lg font-mono font-bold text-emerald-400">${formatNumber(channel.lifetimeEarnings)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Monetization Status */}
                            {!channel.isMonetized && (
                                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-10"><DollarSign size={40}/></div>
                                    <div className="flex items-center gap-2 text-white font-bold mb-3 relative z-10">
                                        <TrendingUp size={16} className="text-yellow-500"/> Partner Program
                                    </div>
                                    <div className="space-y-4 relative z-10">
                                        <div>
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-zinc-400">Subscribers</span>
                                                <span>{formatNumber(channel.subscribers)} / 1,000</span>
                                            </div>
                                            <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (channel.subscribers/1000)*100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-zinc-400">Total Views</span>
                                                <span>{formatNumber(channel.totalChannelViews || 0)} / 100,000</span>
                                            </div>
                                            <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, ((channel.totalChannelViews || 0)/100000)*100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Create Button */}
                            <button 
                                onClick={() => setView('UPLOAD')}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 mb-8 shadow-lg shadow-red-900/20"
                            >
                                <Plus size={20}/> Create Content
                            </button>

                            {/* Recent Videos */}
                            <h3 className="font-bold text-white text-sm mb-4">Your Content</h3>
                            <div className="space-y-3">
                                {channel.videos.length === 0 ? (
                                    <div className="text-center text-zinc-600 py-8 text-sm italic">You haven't uploaded any videos yet.</div>
                                ) : (
                                    channel.videos.map(video => (
                                        <div key={video.id} className="flex gap-3 bg-zinc-900/50 p-2 rounded-xl">
                                            <div className={`w-24 aspect-video rounded-lg ${video.thumbnailColor || 'bg-zinc-800'} flex items-center justify-center`}>
                                                <span className="text-[10px] font-black uppercase text-white/50">{video.type.replace(/_/g, ' ')}</span>
                                            </div>
                                            <div className="flex-1 min-w-0 py-1">
                                                <div className="font-bold text-sm truncate text-zinc-200">{video.title}</div>
                                                <div className="text-xs text-zinc-500 mt-1 flex items-center gap-3">
                                                    <span className="flex items-center gap-1"><Users size={10}/> {formatNumber(video.views)}</span>
                                                    <span className="flex items-center gap-1"><DollarSign size={10}/> ${formatNumber(video.earnings)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* --- BOTTOM NAVIGATION --- */}
            {view === 'MAIN' && (
                <div className="flex bg-zinc-950 border-t border-zinc-900 pb-safe">
                    <button 
                        onClick={() => setActiveTab('HOME')}
                        className={`flex-1 py-3 flex flex-col items-center gap-1 ${activeTab === 'HOME' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        {activeTab === 'HOME' ? <Home size={22} fill="white"/> : <Home size={22}/>}
                        <span className="text-[10px] font-bold">Home</span>
                    </button>
                    <button 
                        onClick={() => setView('UPLOAD')}
                        className="flex-1 py-3 flex flex-col items-center gap-1 text-zinc-400 hover:text-white"
                    >
                        <div className="w-8 h-8 rounded-full border-2 border-zinc-500 flex items-center justify-center">
                            <Plus size={18}/>
                        </div>
                    </button>
                    <button 
                        onClick={() => setActiveTab('STUDIO')}
                        className={`flex-1 py-3 flex flex-col items-center gap-1 ${activeTab === 'STUDIO' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        {activeTab === 'STUDIO' ? <Layout size={22} fill="white"/> : <Layout size={22}/>}
                        <span className="text-[10px] font-bold">Studio</span>
                    </button>
                </div>
            )}

        </div>
    );
};
