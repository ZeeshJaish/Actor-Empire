
import React, { useState } from 'react';
import { ArrowLeft, Twitter, Send, Star, Globe, MessageCircle, X, LogOut, Coffee } from 'lucide-react';
import { Page } from '../types';

interface SettingsPageProps {
  onBack: () => void;
  onMainMenu: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, onMainMenu }) => {
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
          v1.0.11
      </div>
    </div>
  );
};
