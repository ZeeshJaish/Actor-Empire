
import React, { useState } from 'react';
import { Player } from '../../types';
import { BusinessHub } from './business/BusinessHub';
import { BusinessWizard } from './business/BusinessWizard';
import { BusinessDashboard } from './business/BusinessDashboard';
import { ProductionHouseGame } from './business/ProductionHouseGame';

interface LifestyleBusinessProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
}

export const LifestyleBusiness: React.FC<LifestyleBusinessProps> = ({ player, onBack, onUpdatePlayer }) => {
    const [mode, setMode] = useState<'HUB' | 'DASHBOARD' | 'WIZARD' | 'PRODUCTION_GAME'>('HUB');
    const [selectedBizId, setSelectedBizId] = useState<string | null>(null);

    const selectedBusiness = player.businesses.find(b => b.id === selectedBizId);

    const handleSelectBusiness = (id: string) => {
        const biz = player.businesses.find(b => b.id === id);
        if (biz?.type === 'PRODUCTION_HOUSE') {
            setMode('PRODUCTION_GAME');
        } else {
            setSelectedBizId(id);
            setMode('DASHBOARD');
        }
    };

    if (mode === 'HUB') {
        return (
            <div className="pb-24">
                <BusinessHub 
                    player={player} 
                    onBack={onBack} 
                    onSelectBusiness={handleSelectBusiness}
                    onStartWizard={() => setMode('WIZARD')}
                />
            </div>
        );
    }

    if (mode === 'WIZARD') {
        return (
            <BusinessWizard 
                player={player} 
                onCancel={() => setMode('HUB')} 
                onUpdatePlayer={onUpdatePlayer} 
                onComplete={() => setMode('HUB')}
            />
        );
    }

    if (mode === 'PRODUCTION_GAME') {
        return (
            <ProductionHouseGame 
                player={player} 
                onBack={() => setMode('HUB')} 
                onUpdatePlayer={onUpdatePlayer} 
            />
        );
    }

    if (mode === 'DASHBOARD' && selectedBusiness) {
        return (
            <BusinessDashboard 
                business={selectedBusiness} 
                player={player} 
                onBack={() => setMode('HUB')} 
                onUpdatePlayer={onUpdatePlayer} 
            />
        );
    }

    return null;
};
