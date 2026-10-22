import type {Player,LifeEvent,LifeEventOption,LifeEventImpactResult,LocalizedTextVars} from '../types';
import {getPlayerLanguage,t} from './i18n';

/** Same recovery choice used by the live modal after save serialization removes callbacks.
 * The caller owns the mutable player copy and retires the resolved queue item. */
export const resolveLifeEventFallback=(p:Player,event:LifeEvent,optionIdx:number,option?:LifeEventOption,localizedTitle?:string):LifeEventImpactResult=>{
 const language=getPlayerLanguage(p);const tr=(key:string,vars?:LocalizedTextVars)=>t(language,key,vars);
        const optionText = `${option?.label || ''} ${option?.description || ''}`.toLowerCase();
        const isGolden = !!option?.isGolden;
        const isRisky = event.type === 'SCANDAL' || event.type === 'CRIME' || event.type === 'LEGAL' || optionText.includes('double') || optionText.includes('clap') || optionText.includes('refuse') || optionText.includes('ignore') || optionText.includes('risk');
        const isPositive = isGolden || optionText.includes('apolog') || optionText.includes('help') || optionText.includes('honest') || optionText.includes('professional') || optionText.includes('settle') || optionText.includes('accept');
        const eventTitle = localizedTitle || (event.titleKey ? t(language,event.titleKey,event.textVars) : event.title) || tr('life.modal.fallback.momentTitle');

        // Specific fallbacks for common events to ensure game balance isn't broken
        if (eventTitle === "The Side Hustle") {
            if (optionIdx === 0) {
                p.money += 2000;
                p.energy.current = Math.max(0, p.energy.current - 10);
                return { updatedPlayer: p, log: tr('life.modal.fallback.sideHustleWorkLog') };
            } else if (optionIdx === 1) {
                p.stats.experience += 5;
                return { updatedPlayer: p, log: tr('life.modal.fallback.sideHustleAuditionLog') };
            }
        }

        if (isGolden) {
            p.stats.reputation = Math.min(100, (p.stats.reputation || 0) + 3);
            p.stats.fame = Math.min(100, (p.stats.fame || 0) + 1);
            return {
                updatedPlayer: p,
                log: tr('life.modal.fallback.goldenLog', { title: eventTitle })
            };
        }

        if (isRisky && !isPositive) {
            p.stats.reputation = Math.max(0, (p.stats.reputation || 0) - 2);
            p.stats.fame = Math.min(100, (p.stats.fame || 0) + 1);
            return {
                updatedPlayer: p,
                log: tr('life.modal.fallback.riskyLog', { title: eventTitle })
            };
        }

        if (isPositive) {
            p.stats.reputation = Math.min(100, (p.stats.reputation || 0) + 1);
            return {
                updatedPlayer: p,
                log: tr('life.modal.fallback.positiveLog', { title: eventTitle })
            };
        }

        return {
            updatedPlayer: p,
            log: tr('life.modal.fallback.neutralLog', { title: eventTitle })
        };
};
