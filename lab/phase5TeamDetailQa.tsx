import React from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER, type Agent, type Manager, type TeamMember } from '../types';
import { TeamApp } from '../views/mobile/TeamApp';
import '../index.css';

const agent: Agent = { id: 'qa-agent', name: 'Alexandra Very Long International Agency Name', description: 'A detailed agent profile that should remain readable on a narrow phone.', annualFee: 25_000, commission: 0.12, specialty: 'FILM', tier: 'ELITE', studioAccess: 'HIGH' };
const hiredAgent: Agent = { ...agent, id: 'qa-hired-agent', name: 'Current Long-Named Agent' };
const manager: Manager = { id: 'qa-manager', name: 'Morgan International Talent Management', description: 'A long management profile for compact layout review.', annualFee: 32_000, commission: 0.08, tier: 'ELITE', sponsorshipPower: 9 };
const hiredManager: Manager = { ...manager, id: 'qa-hired-manager', name: 'Current Long-Named Manager' };
const member = (type: TeamMember['type'], name: string): TeamMember => ({ id: `qa-${type.toLowerCase()}`, type, name, tier: 'ELITE', weeklyCost: 2_500, description: 'An experienced specialist with a detailed service description that should wrap naturally.', perks: 'Stronger weekly performance and better long-term wellbeing' });
const trainer = member('TRAINER', 'Very Long Personal Trainer Name');
const stylist = member('STYLIST', 'Very Long Celebrity Stylist Name');
const therapist = member('THERAPIST', 'Very Long Wellness Therapist Name');
const publicist = member('PUBLICIST', 'Very Long Public Relations Specialist Name');
const wellness = member('WELLNESS', 'Very Long Wellness Coaching Specialist Name');
const language = new URLSearchParams(location.search).get('lang') || 'en';
const player = { ...INITIAL_PLAYER, name: 'Team Layout Tester', money: 1_000_000,
  settings: { ...INITIAL_PLAYER.settings, language },
  team: { ...INITIAL_PLAYER.team, agent: hiredAgent, manager: hiredManager,
    personalTrainer: trainer, stylist: null, therapist: null, publicist: null, wellness: null,
    availableAgents: [agent], availableManagers: [manager], availableTrainers: [{ ...member('TRAINER', 'Another Long-Named Trainer'), id: 'qa-trainer-alternate' }],
    availableStylists: [stylist], availableTherapists: [therapist], availablePublicists: [publicist], availableWellness: [wellness] },
} as any;
const fail = () => { throw new Error('Team transaction must not run in layout QA'); };

createRoot(document.getElementById('root')!).render(
  <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
    <TeamApp player={player} onBack={() => {}} onHireAgent={fail} onFireAgent={fail}
      onHireManager={fail} onFireManager={fail} onPerformSponsorship={fail}
      onUpdatePlayer={fail} onOpenMessages={fail} onOpenCastLink={fail} />
  </div>,
);
