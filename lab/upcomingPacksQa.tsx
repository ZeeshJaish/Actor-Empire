import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import UpcomingPacksBanner from '../components/packs/UpcomingPacksBanner';
import UpcomingPacksFlow from '../components/packs/UpcomingPacksFlow';
import UpcomingPacksScreen from '../components/packs/UpcomingPacksScreen';
import CinemaChainPackScreen from '../components/packs/CinemaChainPackScreen';
import SueEveryonePackScreen from '../components/packs/SueEveryonePackScreen';
import GildedNinePackScreen from '../components/packs/GildedNinePackScreen';
import FollyPackScreen from '../components/packs/FollyPackScreen';
import BlackoutJobPackScreen from '../components/packs/BlackoutJobPackScreen';
import { BASE_CSS } from '../components/ui-overhaul/theme';
import { Style } from '../components/ui-overhaul/ui';
import '../index.css';

/* One screen of the Upcoming Packs flow without a save: /upcoming-packs-qa.html?screen=sue&name=Al
   screen: flow (default), banner, list, cinema, sue, nine, folly, blackout */
const params = new URLSearchParams(location.search);
const screen = params.get('screen') || 'flow';
const playerName = params.get('name') || 'Rio Vanta';
/* The real hub narrows its gutter on small phones; the banner has to be measured at that width. */
const HUB_GUTTER = '@media(max-width:374px){.ae .ae-scroll{padding-left:12px;padding-right:12px}}';
const log = (what: string) => { (window as any).__packsQa = what; };

function FlowQa() {
  const [open, setOpen] = useState(false);
  if (open) return <UpcomingPacksFlow playerName={playerName} onBack={() => setOpen(false)} />;
  return <div className="ae"><Style css={BASE_CSS} /><div className="ae-bg" /><div className="ae-scroll"><UpcomingPacksBanner onOpen={() => setOpen(true)} /></div></div>;
}

function Qa() {
  if (screen === 'banner') return <div className="ae"><Style css={BASE_CSS} /><Style css={HUB_GUTTER} /><div className="ae-bg" /><div className="ae-scroll"><UpcomingPacksBanner onOpen={() => log('open list')} /></div></div>;
  if (screen === 'list') return <UpcomingPacksScreen onBack={() => log('back')} onOpenPack={pack => log(`open ${pack}`)} />;
  if (screen === 'cinema') return <CinemaChainPackScreen playerName={playerName} onBack={() => log('back')} />;
  if (screen === 'sue') return <SueEveryonePackScreen playerName={playerName} onBack={() => log('back')} />;
  if (screen === 'nine') return <GildedNinePackScreen onBack={() => log('back')} />;
  if (screen === 'folly') return <FollyPackScreen onBack={() => log('back')} />;
  if (screen === 'blackout') return <BlackoutJobPackScreen playerName={playerName} onBack={() => log('back')} />;
  return <FlowQa />;
}

createRoot(document.getElementById('root')!).render(<Qa />);
