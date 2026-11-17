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

/** B32 (2026-11-17, player report on 1.0.28: "Keep getting Week 5 not applied").
 *  The cinema settles only the week right after its own last week. If its clock ever drifts from the career's clock,
 *  every week fails with "Cinema stale or out-of-order result" and the career is stuck for ever.
 *  At the start of a week the cinema's last week must be the career's current week. When it is not, the cinema is
 *  moved onto the career's clock the way legacy succession moves it:
 *  - every cinema week moves by the same gap;
 *  - a new clock epoch starts, so no historical receipt is reused or replaced;
 *  - money, receipts and lifetime totals are untouched.
 *  If only the last-week numbers had drifted, a moved title could look settled after the cinema's last week, and the
 *  next settlement would refuse it. Such a title is held at "last settled no later than the cinema's last week".
 *  A gap of 0, which every normal week has, returns the same object. */
export const alignCinemaClockToCareer = (state:CinemaSavedState,careerAbsoluteWeek:number):{state:CinemaSavedState;gap:number} => {
    const gap=careerAbsoluteWeek-state.lastProcessedAbsoluteWeek;
    if(!gap)return {state,gap:0};
    const moved=rebaseCinemaSavedState(state,gap);
    const titles=Object.fromEntries(Object.entries(moved.titles).map(([id,t])=>[id,t.lastSettledWeek>careerAbsoluteWeek||t.activationWeek>careerAbsoluteWeek+1
        ?{...t,lastSettledWeek:Math.min(t.lastSettledWeek,careerAbsoluteWeek),activationWeek:Math.min(t.activationWeek,careerAbsoluteWeek+1)}:t]));
    return {state:{...moved,titles},gap};
};
