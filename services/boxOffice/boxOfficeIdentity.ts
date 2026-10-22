import type { CinemaWeekResult } from './boxOfficeTypes';
/** Stable JSON semantics for exact transient source/result comparisons, including reload. */
export const serializeCinemaFacts = (value: unknown): string => {
    if (value === undefined || value === null)
        return 'null';
    if (Array.isArray(value))
        return `[${value.map(serializeCinemaFacts).join(',')}]`;
    if (typeof value === 'object')
        return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${serializeCinemaFacts(v)}`).join(',')}}`;
    return JSON.stringify(value);
};
const issued = new WeakMap<CinemaWeekResult, string>();
/** Only a freshly simulated result may first apply cash. Recovery reruns from the durable prior save. */
export const issueCinemaResult = (result: CinemaWeekResult): CinemaWeekResult => {
    if (result.mode === 'LIVE')
        issued.set(result, serializeCinemaFacts(result));
    return result;
};
export const assertIssuedCinemaResult = (result: CinemaWeekResult): void => {
    const original = issued.get(result);
    if (!original || original !== serializeCinemaFacts(result))
        throw new Error('Cinema result was not issued by the allocator or changed after simulation');
};
