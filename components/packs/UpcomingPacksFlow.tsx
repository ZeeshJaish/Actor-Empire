import { useEffect, useState } from 'react';
import UpcomingPacksScreen, { type PackId } from './UpcomingPacksScreen';
import CinemaChainPackScreen from './CinemaChainPackScreen';
import SueEveryonePackScreen from './SueEveryonePackScreen';
import GildedNinePackScreen from './GildedNinePackScreen';
import FollyPackScreen from './FollyPackScreen';
import BlackoutJobPackScreen from './BlackoutJobPackScreen';
import { preparePackAudio, prefetchPackBytes, unlockPackAudio } from './packAudio';

interface UpcomingPacksFlowProps {
  playerName: string;
  onBack: () => void;
}

/* The Upcoming Packs list and the teaser page of each pack. Nothing here touches the save. */
export default function UpcomingPacksFlow({ playerName, onBack }: UpcomingPacksFlowProps) {
  const [pack, setPack] = useState<PackId | null>(null);
  const backToList = () => setPack(null);
  /* the sound's context is made while the list sits idle, and a browser opens it only from a tap: this one */
  useEffect(() => preparePackAudio(), []);
  /* the bytes only: decoding happens after the tap, off it */
  useEffect(() => prefetchPackBytes(() => new URL('../../assets/audio/packs/blackout/music.m4a', import.meta.url).href), []);
  const openPack = (id: PackId) => {
    unlockPackAudio();
    setPack(id);
  };
  if (pack === 'cinema') return <CinemaChainPackScreen playerName={playerName} onBack={backToList} />;
  if (pack === 'sue') return <SueEveryonePackScreen playerName={playerName} onBack={backToList} />;
  if (pack === 'nine') return <GildedNinePackScreen onBack={backToList} />;
  if (pack === 'folly') return <FollyPackScreen onBack={backToList} />;
  if (pack === 'blackout') return <BlackoutJobPackScreen playerName={playerName} onBack={backToList} />;
  return <UpcomingPacksScreen onBack={onBack} onOpenPack={openPack} />;
}
