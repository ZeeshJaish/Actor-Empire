import React from 'react';
import CareerScreen from '../components/ui-overhaul/CareerScreen';
import { buildCareerUiModel } from '../services/careerUiAdapter';
import type { OwnedProductionActionId, Player } from '../types';

interface CareerPageProps {
  player: Player;
  onQuitJob: (id: string) => void;
  onRehearse: (id: string) => void;
  onOwnedProductionFocus: (id: string, action: OwnedProductionActionId) => void;
}

export const CareerPage: React.FC<CareerPageProps> = ({ player, onRehearse, onOwnedProductionFocus }) => (
  <CareerScreen
    {...buildCareerUiModel(player)}
    onProjectAction={onRehearse}
    onProductionTask={onOwnedProductionFocus}
  />
);
