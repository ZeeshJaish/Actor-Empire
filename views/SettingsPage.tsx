
import React, { useState } from 'react';
import { ArrowLeft, Twitter, Send, Star, Globe, LogOut, Coffee, Bug, Puzzle, Lock, CheckCircle2, Users, ChevronRight, Sparkles, SlidersHorizontal } from 'lucide-react';
import { Player } from '../types';
import { APP_DISPLAY_VERSION } from '../services/appVersion';
import { createGlobalActorPackNPCs, GLOBAL_ACTOR_PACKS } from '../services/npcLogic';
import { getGlobalCreatorCountForPack } from '../services/youtubeLogic';

interface SettingsPageProps {
  player: Player;
  onUpdatePlayer: (updater: (player: Player) => Player) => void;
  onBack: () => void;
  onMainMenu: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ player, onUpdatePlayer, onBack, onMainMenu }) => {
  const [mode, setMode] = useState<'SETTINGS' | 'MODS' | 'EXTERNAL_ACTORS'>('SETTINGS');
  const enabledPackIds = Array.isArray(player.flags?.enabledGlobalActorPacks)
    ? player.flags.enabledGlobalActorPacks as string[]
    : [];

  const enableActorPack = (packId: string) => {
    if (enabledPackIds.includes(packId)) return;

    onUpdatePlayer(prev => {
      const currentPackIds = Array.isArray(prev.flags?.enabledGlobalActorPacks)
        ? prev.flags.enabledGlobalActorPacks as string[]
        : [];
      if (currentPackIds.includes(packId)) return prev;

      const packNPCs = createGlobalActorPackNPCs(packId);
      const existingExtraNPCs = Array.isArray(prev.flags?.extraNPCs) ? prev.flags.extraNPCs : [];
      const existingIds = new Set([
        ...existingExtraNPCs.map((npc: any) => npc.id),
        ...existingExtraNPCs.map((npc: any) => npc.name)
      ]);
      const newNPCs = packNPCs.filter(npc => !existingIds.has(npc.id) && !existingIds.has(npc.name));

      return {
        ...prev,
        flags: {
          ...prev.flags,
          enabledGlobalActorPacks: [...currentPackIds, packId],
          extraNPCs: [...existingExtraNPCs, ...newNPCs],
          modHistory: [
            ...(Array.isArray(prev.flags?.modHistory) ? prev.flags.modHistory : []),
            {
              id: `mod_${packId}_${Date.now()}`,
              type: 'GLOBAL_ACTOR_PACK',
              packId,
              enabledAtAge: prev.age,
              enabledAtWeek: prev.currentWeek
            }
          ]
        },
        logs: [
          {
            week: prev.currentWeek,
            year: prev.age,
            message: `🧩 MOD ENABLED: ${GLOBAL_ACTOR_PACKS.find(pack => pack.id === packId)?.label || 'Global Talent Pack'} added to this save.`,
            type: 'positive'
          },
          ...prev.logs
        ].slice(0, 50)
      };
    });
  };

  if (mode === 'MODS') {
    return (
      <div className="space-y-5 pb-24 pt-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode('SETTINGS')} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
              <ArrowLeft size={20} className="text-white"/>
          </button>
          <div>
            <div className="text-[10px] text-amber-400 font-black uppercase tracking-[0.28em]">Optional Content</div>
            <h2 className="text-3xl font-bold text-white">Mods</h2>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setMode('EXTERNAL_ACTORS')}
            className="w-full rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-left hover:bg-amber-500/15 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center shrink-0">
                <Users size={22}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-white">External Talent</div>
                <div className="text-xs text-zinc-400 mt-1">Country-based actor, director, and creator packs for casting, Forbes, and social discovery.</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-amber-500/15 px-2 py-1 rounded text-amber-300 font-bold uppercase">{enabledPackIds.length} Active</span>
                <ChevronRight size={18} className="text-zinc-500"/>
              </div>
            </div>
          </button>

          <div className="w-full rounded-3xl border border-white/5 bg-zinc-900/40 p-5 opacity-70">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                <Sparkles size={22}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-zinc-300">Creator Packs</div>
                <div className="text-xs text-zinc-500 mt-1">Regional creator expansions can live here later.</div>
              </div>
              <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-500 font-bold uppercase">Later</span>
            </div>
          </div>

          <div className="w-full rounded-3xl border border-white/5 bg-zinc-900/40 p-5 opacity-70">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                <SlidersHorizontal size={22}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-zinc-300">Gameplay Rules</div>
                <div className="text-xs text-zinc-500 mt-1">Future optional save modifiers and challenge rules.</div>
              </div>
              <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-500 font-bold uppercase">Later</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'EXTERNAL_ACTORS') {
    return (
      <div className="space-y-5 pb-24 pt-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode('MODS')} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
              <ArrowLeft size={20} className="text-white"/>
          </button>
          <div>
            <div className="text-[10px] text-amber-400 font-black uppercase tracking-[0.28em]">Mods</div>
            <h2 className="text-3xl font-bold text-white">External Talent</h2>
          </div>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-2xl bg-amber-500 text-black"><Lock size={18}/></div>
            <div>
              <div className="font-black text-white">Save-Locked Packs</div>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                Once a pack is enabled, it stays active for this save. This prevents cast lists, projects, socials, and awards from losing people later.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Available Country Packs</h3>
          {GLOBAL_ACTOR_PACKS.map(pack => {
            const isEnabled = enabledPackIds.includes(pack.id);
            const creatorCount = getGlobalCreatorCountForPack(pack.id);
            return (
              <div key={pack.id} className={`rounded-3xl border p-4 transition-all ${isEnabled ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-zinc-900/50 border-white/5'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isEnabled ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-amber-400'}`}>
                    {isEnabled ? <CheckCircle2 size={20}/> : <Users size={20}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-black text-white truncate">{pack.country}</div>
                      <div className="text-[10px] text-zinc-400 font-black uppercase whitespace-nowrap">
                        {pack.actorCount} talent · {creatorCount} creators
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Adds regional actors/directors to casting/Forbes and creator personalities to YouTube/social collabs.
                    </p>
                    <button
                      onClick={() => enableActorPack(pack.id)}
                      disabled={isEnabled}
                      className={`mt-3 w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isEnabled ? 'bg-emerald-500/15 text-emerald-300 cursor-default' : 'bg-white text-black hover:bg-amber-300'}`}
                    >
                      {isEnabled ? 'Enabled For This Save' : 'Enable Pack'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 pt-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-white"/>
        </button>
        <h2 className="text-3xl font-bold text-white">Settings</h2>
      </div>

      {/* Support Section */}
      <div className="glass-card p-6 rounded-3xl space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Support</h3>
          
          <a 
            href="https://buymeacoffee.com/actorempire" 
            target="_blank" 
            rel="noreferrer"
            className="w-full flex items-center justify-between p-4 bg-[#FFDD00] rounded-2xl hover:opacity-90 transition-all border border-black/10"
          >
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-black rounded-lg text-[#FFDD00]"><Coffee size={20}/></div>
                  <div className="text-left">
                      <div className="font-bold text-black">Support Dev</div>
                      <div className="text-xs text-black/60">Buy me a coffee</div>
                  </div>
              </div>
          </a>

          <a 
            href="https://apps.apple.com/us/app/actor-empire/id6757667257" 
            target="_blank" 
            rel="noreferrer"
            className="w-full flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl hover:bg-zinc-800 transition-colors border border-white/5"
          >
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 rounded-lg text-black"><Star size={20}/></div>
                  <div className="text-left">
                      <div className="font-bold text-white">Rate Us on App Store</div>
                      <div className="text-xs text-zinc-500">Love the game? Let us know!</div>
                  </div>
              </div>
          </a>

          <a
            href="https://forms.gle/zHNXbpjccSRqsUTv7"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between p-4 bg-rose-500/10 rounded-2xl hover:bg-rose-500/15 transition-colors border border-rose-500/20"
          >
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500 rounded-lg text-white"><Bug size={20}/></div>
                  <div className="text-left">
                      <div className="font-bold text-white">Report a Bug</div>
                      <div className="text-xs text-zinc-400">Send us issue details and screen recordings</div>
                  </div>
              </div>
              <div className="text-[10px] bg-rose-500/15 px-2 py-1 rounded text-rose-300 font-bold uppercase">Google Form</div>
          </a>
      </div>

      {/* Mods Section */}
      <div className="glass-card p-6 rounded-3xl space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Mods</h3>
          <button
            onClick={() => setMode('MODS')}
            className="w-full flex items-center justify-between p-4 bg-amber-500/10 rounded-2xl hover:bg-amber-500/15 transition-colors border border-amber-500/20"
          >
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 rounded-lg text-black"><Puzzle size={20}/></div>
                  <div className="text-left">
                      <div className="font-bold text-white">Mod Packs</div>
                      <div className="text-xs text-zinc-400">Enable optional country actors and creators</div>
                  </div>
              </div>
              <div className="text-[10px] bg-amber-500/15 px-2 py-1 rounded text-amber-300 font-bold uppercase">
                {enabledPackIds.length} Active
              </div>
          </button>
      </div>

      {/* Community Section */}
      <div className="glass-card p-6 rounded-3xl space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Community</h3>
          
          <a href="https://x.com/ActorEmpire" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl hover:bg-zinc-800 transition-colors border border-white/5">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-black rounded-lg text-white"><Twitter size={20}/></div>
                  <div className="font-bold text-white">Follow us on X</div>
              </div>
              <div className="text-xs text-zinc-500">@ActorEmpire</div>
          </a>

          <a href="https://t.me/actorempire" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl hover:bg-zinc-800 transition-colors border border-white/5">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg text-white"><Send size={20}/></div>
                  <div className="font-bold text-white">Join Telegram</div>
              </div>
              <div className="text-xs text-zinc-500">Updates & Chat</div>
          </a>
      </div>

      {/* Game Actions */}
      <div className="glass-card p-6 rounded-3xl space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Game Actions</h3>
          
          <button 
            onClick={onMainMenu}
            className="w-full flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl hover:bg-rose-900/20 hover:border-rose-900/50 transition-all border border-white/5 group"
          >
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400 group-hover:text-rose-500 group-hover:bg-rose-500/10 transition-colors"><LogOut size={20}/></div>
                  <div className="text-left">
                      <div className="font-bold text-white">Main Menu</div>
                      <div className="text-xs text-zinc-500">Save and quit to title</div>
                  </div>
              </div>
          </button>
      </div>

      {/* General Section */}
      <div className="glass-card p-6 rounded-3xl space-y-4 opacity-75">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">General</h3>
          
          <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><Globe size={20}/></div>
                  <div className="text-left">
                      <div className="font-bold text-zinc-400">Language</div>
                      <div className="text-xs text-zinc-600">English (Default)</div>
                  </div>
              </div>
              <div className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-500 font-bold uppercase">Coming Soon</div>
          </div>
      </div>
      
      <div className="text-center text-xs text-zinc-600 font-mono mt-8">
          v{APP_DISPLAY_VERSION}
      </div>
    </div>
  );
};
