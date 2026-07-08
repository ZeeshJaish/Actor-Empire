import React, { useMemo } from 'react';
import { Player, PressInteraction, Stats } from '../types';
import {
  AwardNightConfig,
  AwardPressConferenceScene,
  AwardPressResult,
  PressQuestion
} from './AwardNightFlow';

interface PressConferenceEventProps {
  player: Player;
  projectName: string;
  questions: PressInteraction[];
  onComplete: (statsDelta: Partial<Stats>, buzzDelta: number, logMessage: string) => void;
  onClose: () => void;
}

export const mapPressInteractionsToAwardQuestions = (questions: PressInteraction[]): PressQuestion[] => questions.map((question, index) => ({
  outlet: index % 2 === 0 ? 'Entertainment Weekly' : 'Hollywood Now',
  name: index % 2 === 0 ? 'Sarah Jenkins · Entertainment Desk' : 'Marcus Vane · Press Room',
  mug: index % 2 === 0 ? 'EW' : 'HN',
  q: question.question,
  opts: question.options.map(option => ({
    t: option.text,
    s: option.style,
    fx: [
      option.consequences.fame ? `${option.consequences.fame > 0 ? '+' : ''}${option.consequences.fame} Fame` : '',
      option.consequences.reputation ? `${option.consequences.reputation > 0 ? '+' : ''}${option.consequences.reputation} Rep` : '',
      option.consequences.followers ? `${option.consequences.followers > 0 ? '+' : ''}${option.consequences.followers} Followers` : '',
      option.consequences.buzz ? `${option.consequences.buzz > 0 ? '+' : ''}${option.consequences.buzz} Buzz` : ''
    ].filter(Boolean).join(' ') || '+Buzz',
    consequences: option.consequences
  }))
}));

const getDominantStyleMessage = (projectName: string, result: AwardPressResult): string => {
  const styleCounts = result.styles.reduce((acc, style) => {
    acc[style] = (acc[style] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dominantStyle = Object.keys(styleCounts).reduce((a, b) => styleCounts[a] > styleCounts[b] ? a : b, 'SAFE');

  let message = `Completed press tour for ${projectName}. `;
  if (dominantStyle === 'RISKY') message += 'Your controversial comments are making headlines.';
  else if (dominantStyle === 'BOLD') message += 'You showed great confidence.';
  else if (dominantStyle === 'HUMBLE') message += 'Critics charmed by your humility.';
  else message += 'A standard, safe appearance.';
  return message;
};

export const PressConferenceEvent: React.FC<PressConferenceEventProps> = ({ player, projectName, questions, onComplete, onClose }) => {
  const config = useMemo<Partial<AwardNightConfig>>(() => ({
    playerName: player.name,
    avatarUrl: player.avatar,
    showName: `${projectName} Press Room`,
    showEdition: 'Press Conference · Live',
    venue: 'Studio Press Hall',
    city: 'Los Angeles',
    headlineGood: 'PRESS ROOM LOVES IT',
    headlineBad: 'PRESS ROOM TURNS COLD',
    playerMovie: projectName,
    playerCategory: 'Press Conference',
    playerWins: false,
    playerRivals: ['The Press', 'The Critics', 'The Fans'],
    pressQuestions: mapPressInteractionsToAwardQuestions(questions),
    wardrobe: {}
  }), [player.name, player.avatar, projectName, questions]);

  const handleComplete = (result: AwardPressResult) => {
    const finalStats: Partial<Stats> = {
      fame: result.statsDelta.fame,
      reputation: result.statsDelta.reputation,
      followers: result.statsDelta.followers
    };
    const finalBuzz = result.buzzDelta;
    const message = getDominantStyleMessage(projectName, result);
    onComplete(finalStats, finalBuzz, message);
  };

  return (
    <AwardPressConferenceScene
      config={config}
      onComplete={handleComplete}
      onClose={onClose}
      completeLabel="Wrap Conference & Save →"
    />
  );
};
