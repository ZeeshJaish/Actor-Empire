import { hashDeterministicSeed } from '../deterministicRandom';

export const cinemaCount = (n: number, label: string): number => {
    if (!Number.isSafeInteger(n) || n<0) throw new RangeError(`Invalid cinema ${label}`);
    return n;
};
export const cinemaSum = (values: readonly number[]): number => cinemaCount(values.reduce((a,b)=>a+b,0),'sum');
export const cinemaKey = (seed: number, week: number, key: string): number => hashDeterministicSeed(`${seed}:${week}:${key}`);

/** Exact proportional floor and largest remainders. Tie order is keyed, never owner/iteration order. */
export const apportionCinemaIntegers = (total: number, weights: readonly {id:string;weight:number}[], seed: number, week: number): Map<string,number> => {
    cinemaCount(total,'apportion total');
    const denominator=weights.reduce((n,r)=>n+BigInt(cinemaCount(r.weight,'weight')),0n);
    const result=new Map(weights.map(r=>[r.id,0]));
    if (!denominator) return result;
    const rows=weights.map(r=>{const numerator=BigInt(total)*BigInt(r.weight);return {...r,base:Number(numerator/denominator),remainder:numerator%denominator}});
    for(const r of rows) result.set(r.id,r.base);
    const left=total-rows.reduce((n,r)=>n+r.base,0);
    rows.sort((a,b)=>a.remainder===b.remainder ? cinemaKey(seed,week,a.id)-cinemaKey(seed,week,b.id) || a.id.localeCompare(b.id) : a.remainder>b.remainder ? -1 : 1);
    for(const r of rows.slice(0,left)) result.set(r.id,result.get(r.id)!+1);
    return result;
};

/** Joint integer requests constrained by several conserved resources (cents, minutes or seats). */
export const allocateCinemaResources = (rows: readonly {id:string;wanted:number;units:readonly number[]}[], limits: readonly number[], seed:number,week:number): Map<string,number> => {
    limits.forEach(n=>cinemaCount(n,'resource limit'));
    if(new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('Duplicate cinema resource request');
    rows.forEach(r=>{cinemaCount(r.wanted,'demand');if(r.units.length!==limits.length)throw new Error('Cinema resource dimension mismatch');r.units.forEach(u=>cinemaCount(u,'unit'))});
    const result=new Map(rows.map(r=>[r.id,0]));
    const remaining=limits.map(n=>BigInt(n));
    // A blocked expensive/long request must release its share to still-feasible willing demand.
    // Each round scales whole groups, then consumes integer remainders; never loop per admission.
    for(;;) {
        const feasible=rows.filter(r=>result.get(r.id)!<r.wanted && r.units.every((u,i)=>BigInt(cinemaCount(u,'unit'))<=remaining[i]));
        if(!feasible.length) break;
        let numerator=1n,denominator=1n;
        for(let i=0;i<limits.length;i++) {
            const total=feasible.reduce((n,r)=>n+BigInt(cinemaCount(r.wanted-result.get(r.id)!,'remaining demand'))*BigInt(r.units[i]),0n);
            if(total && remaining[i]*denominator<numerator*total){numerator=remaining[i];denominator=total}
        }
        const quotas=feasible.map(r=>{const value=BigInt(r.wanted-result.get(r.id)!)*numerator;return {...r,grant:Number(value/denominator),remainder:value%denominator}});
        let progress=0;
        for(const r of quotas) {result.set(r.id,result.get(r.id)!+r.grant);progress+=r.grant;r.units.forEach((u,i)=>remaining[i]-=BigInt(u)*BigInt(r.grant))}
        quotas.sort((a,b)=>a.remainder===b.remainder?cinemaKey(seed,week,a.id)-cinemaKey(seed,week,b.id)||a.id.localeCompare(b.id):a.remainder>b.remainder?-1:1);
        for(const r of quotas) if(result.get(r.id)!<r.wanted && r.units.every((u,i)=>BigInt(u)<=remaining[i])) {
            result.set(r.id,result.get(r.id)!+1);progress++;r.units.forEach((u,i)=>remaining[i]-=BigInt(u));
        }
        if(!progress)break;
    }
    return result;
};

/** Exact 12/52 proration; 52 weekly envelopes sum to 12 monthly envelopes, including cent remainders. */
export const cinemaWeeklyWallet = (monthlyCents:number,absoluteWeek:number):number => {
    cinemaCount(monthlyCents,'monthly wallet');cinemaCount(absoluteWeek,'week');
    const total=BigInt(monthlyCents)*12n,week=BigInt(absoluteWeek%52);
    return cinemaCount(Number(total*(week+1n)/52n-total*week/52n),'weekly wallet');
};
