import type { CinemaSavedState } from './boxOfficeTypes';

/** Historical receipt IDs, amounts and original receipt clocks never change across succession. */
export const rebaseCinemaSavedState = (state:CinemaSavedState,shift:number):CinemaSavedState => {
    if(!shift)return state;
    const week=(n:number)=>Math.max(0,n+shift);
    return {...state,clockEpoch:state.clockEpoch+1,activationWeek:week(state.activationWeek),lastProcessedAbsoluteWeek:week(state.lastProcessedAbsoluteWeek),
        ...(state.streamingSeen ? {streamingSeen:Object.fromEntries(Object.entries(state.streamingSeen).map(([id,v])=>[id,{...v,lastWeek:week(v.lastWeek)}]))} : {}),
        titles:Object.fromEntries(Object.entries(state.titles).map(([id,t])=>[id,{...t,activationWeek:week(t.activationWeek),lastSettledWeek:week(t.lastSettledWeek)}])),
        market:{...state.market,lastProcessedAbsoluteWeek:week(state.market.lastProcessedAbsoluteWeek),
            runs:state.market.runs.map(r=>({...r,...(r.lastBookedWeek===undefined?{}:{lastBookedWeek:week(r.lastBookedWeek)})})),
            titles:state.market.titles.map(t=>({...t,releaseWeek:week(t.releaseWeek),cells:t.cells.map(c=>({...c,
                lastChoiceWeek:c.lastChoiceWeek===undefined?undefined:week(c.lastChoiceWeek),lastDiscoveryWeek:week(c.lastDiscoveryWeek),
                lastAppliedLocalFootfallWeek:c.lastAppliedLocalFootfallWeek===undefined?undefined:week(c.lastAppliedLocalFootfallWeek),
                pendingLocalFootfall:c.pendingLocalFootfall?{...c.pendingLocalFootfall,absoluteWeek:week(c.pendingLocalFootfall.absoluteWeek)}:undefined,
                seenBands:c.seenBands.map(b=>({...b,lastViewedWeek:week(b.lastViewedWeek)}))}))})),
            affinities:state.market.affinities.map(a=>({...a,lastWeek:week(a.lastWeek)}))},
    };
};
