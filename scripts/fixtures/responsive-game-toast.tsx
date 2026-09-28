import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { GameToast } from '../../components/GameToast';

createRoot(document.getElementById('root')!).render(
  <GameToast
    title="Rewarded ad temporarily unavailable"
    subtext="Your first Wellness ad is saved. Please try only the second ad again within five minutes; your progress has not been lost."
  />,
);
