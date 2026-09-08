import React from 'react';
import type { IndustryMediaNarrativeTheme, Player } from '../../types';
import { describeIndustryMediaRelationship, getIndustryNarrativeContext } from '../../services/industryWorld';

const THEME_LABELS: Record<IndustryMediaNarrativeTheme, string> = {
    AMBITIOUS_RISK_TAKER: 'Ambitious risk-taker',
    RECKLESS_SPENDER: 'Reckless spender',
    AWARDS_POWERHOUSE: 'Awards powerhouse',
    FRANCHISE_ARCHITECT: 'Franchise architect',
    OVERHYPED_STAR: 'Overhyped star',
    RELIABLE_HITMAKER: 'Reliable hitmaker',
    COMEBACK: 'Comeback story',
    DECLINE: 'Decline narrative',
    GLOBAL_EXPANSION: 'Global expansion',
    FADING_DOMINANCE: 'Fading dominance',
    DIFFICULT_COLLABORATOR: 'Difficult collaborator',
    UNDERDOG: 'Underdog story',
};

const titleCase = (value: string): string => value.charAt(0) + value.slice(1).toLowerCase();

export const IndustryNarrativeContext: React.FC<{
    player: Player;
    subjectKey: string;
    personalityId?: string;
    compact?: boolean;
}> = ({ player, subjectKey, personalityId, compact = false }) => {
    const media = player.world.industryMedia;
    if (!media) return null;
    const context = getIndustryNarrativeContext(media, subjectKey);
    const narrative = context ? media.narratives.find(item => item.id === context.narrativeId) : undefined;
    const relationships = media.mediaRelationships
        .filter(item => item.subjectKey === subjectKey && (!personalityId || item.personalityId === personalityId))
        .sort((left, right) => right.tension - left.tension || right.familiarity - left.familiarity)
        .slice(0, compact ? 1 : 2);
    if (!context && !relationships.length) return null;
    return (
        <section className="border-y border-zinc-800 bg-black/45 px-4 py-4" data-c7-narrative={context?.narrativeId || 'relationship-only'}>
            <div className="flex items-center justify-between gap-3">
                <div className="text-[9px] font-black uppercase tracking-[0.24em] text-violet-400">Industry memory</div>
                {narrative && <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{titleCase(narrative.stage)}</div>}
            </div>
            {context && narrative && (
                <>
                    <div className="mt-2 flex items-baseline justify-between gap-3">
                        <div className="text-base font-black text-white">{THEME_LABELS[context.theme]}</div>
                        <div className="font-mono text-xs font-black text-violet-300">{context.strength}</div>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-zinc-400">{context.summary}</p>
                    {!compact && narrative.landmarks.length > 1 && (
                        <div className="mt-3 border-l border-zinc-800 pl-3">
                            {narrative.landmarks.slice(-3).map(landmark => (
                                <div key={landmark.id} className="py-1 text-[11px] leading-4 text-zinc-500">
                                    <span className="mr-2 font-mono text-zinc-700">W{landmark.absoluteWeek}</span>{landmark.summary}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
            {relationships.map(relationship => {
                const personality = media.personalities.find(item => item.id === relationship.personalityId);
                return (
                    <div key={relationship.id} className="mt-3 border-t border-zinc-800 pt-3">
                        <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="font-black text-zinc-200">{personality?.name || 'Media voice'}</span>
                            <span className={relationship.feudState === 'ACTIVE' ? 'font-black text-rose-400' : 'font-bold text-zinc-600'}>
                                {relationship.feudState === 'NONE' ? relationship.direction.toLowerCase() : relationship.feudState.toLowerCase()}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-4 text-zinc-500">{describeIndustryMediaRelationship(relationship)}</p>
                    </div>
                );
            })}
        </section>
    );
};
