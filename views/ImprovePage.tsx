import React from 'react';
import ImproveScreen from '../components/ui-overhaul/ImproveScreen';
import { buildImproveUiModel, type ImproveUiGenre } from '../services/improveUiAdapter';
import type { Commitment, ImprovementOption, Player } from '../types';

interface ImprovePageProps {
  player: Player;
  onTrain: (stat: string, cost: number, gain: number) => void;
  onEnroll: (commitment: Commitment) => void;
  onCancel: (id: string) => void;
  onPerformAction?: (category: string, activityName: string, option: ImprovementOption) => void;
}

const genreOption = (genre: ImproveUiGenre): ImprovementOption => ({
  id: `genre_train_${genre.genre}`,
  label: genre.name,
  energyCost: genre.energy,
  moneyCost: genre.cost,
  gains: {},
  risk: 0,
  description: genre.description,
});

export const ImprovePage: React.FC<ImprovePageProps> = ({ player, onEnroll, onCancel, onPerformAction }) => {
  const model = buildImproveUiModel(player);
  return <ImproveScreen
    {...model}
    onWellbeingAction={action => onPerformAction?.(
      action.request.category,
      action.request.activityName,
      action.request.option,
    )}
    onEnrollCourse={course => onEnroll(course.commitment)}
    onCancelCourse={onCancel}
    onTrainGenre={genre => onPerformAction?.('GENRE', genre.genre, genreOption(genre))}
  />;
};
